// ============================================================================
// ArthurianRPGGame.ts – Main orchestrator for the 3D Arthurian RPG mode
// ============================================================================
import type { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { ArthurianPhase, ArthurianClass } from "../types";
import { RPG_CONFIG } from "./ArthurianRPGConfig";
import { createDefaultState, saveGame, loadGame, addXP, addItem, calculateDerivedStats, getWeatherModifiers, resolveNPCActivity } from "./ArthurianRPGState";
import type { ArthurianRPGState, Vec3, EnemyInstance, DungeonState, DungeonRoom, DungeonCorridor, DungeonChest, DungeonDoor, DungeonSpawnPoint, DungeonEntrance, WeatherModifiers } from "./ArthurianRPGState";
import { EnemyBehavior, ItemQualityTier, TerrainType } from "./ArthurianRPGConfig";
import { ArthurianRPGMovementSystem, HeightmapTerrainProvider } from "./ArthurianRPGMovement";
import type { MovementInput } from "./ArthurianRPGMovement";

import { ArthurianRPGDialogueSystem, QuestObjectiveType } from "./ArthurianRPGDialogue";
import { CompanionCombatAIManager } from "./ArthurianRPGCompanionAI";
import { registerAllContent, QUEST_NPCS, ALL_QUESTS } from "./ArthurianRPGQuests";
import type { QuestNPCDef } from "./ArthurianRPGQuests";
import { createCraftingUIState, handleCraftingKey, renderCraftingScreen, updateCraftingUI } from "./ArthurianRPGCrafting";
import type { CraftingUIState } from "./ArthurianRPGCrafting";

import { rpgAudio } from "./ArthurianRPGAudio";
// -- Region data --
interface RegionDef { id: string; name: string; enemyTypes: string[]; minLevel: number; maxLevel: number; spawnCap: number; color: string }
const REGIONS: Record<string, RegionDef> = {
  camelot:     { id: "camelot",     name: "Camelot",             enemyTypes: ["bandit","wolf"],                 minLevel: 1,  maxLevel: 5,  spawnCap: 6,  color: "#4a7c4f" },
  darkwood:    { id: "darkwood",    name: "Dark Wood",           enemyTypes: ["wolf","spider","outlaw"],        minLevel: 3,  maxLevel: 10, spawnCap: 10, color: "#2d4a2d" },
  saxon_camp:  { id: "saxon_camp",  name: "Saxon Encampment",    enemyTypes: ["saxon_warrior","saxon_archer"],  minLevel: 5,  maxLevel: 15, spawnCap: 12, color: "#7a5c3a" },
  avalon:      { id: "avalon",      name: "Isle of Avalon",      enemyTypes: ["fae_knight","wisp"],             minLevel: 10, maxLevel: 25, spawnCap: 8,  color: "#5a7ab0" },
  mordred_fortress: { id: "mordred_fortress", name: "Mordred's Fortress", enemyTypes: ["dark_knight","sorcerer","undead"], minLevel: 20, maxLevel: 40, spawnCap: 14, color: "#3a2a3a" },
  grail_temple:{ id: "grail_temple",name: "Grail Temple",        enemyTypes: ["guardian","elemental"],          minLevel: 30, maxLevel: 50, spawnCap: 8,  color: "#c9a84c" },
};

// -- Input --
interface InputState { forward: boolean; back: boolean; left: boolean; right: boolean; jump: boolean; sprint: boolean; attack: boolean; block: boolean; interact: boolean; mouseDX: number; mouseDY: number }
function mkInput(): InputState { return { forward:false, back:false, left:false, right:false, jump:false, sprint:false, attack:false, block:false, interact:false, mouseDX:0, mouseDY:0 }; }

// -- Class defs --
const CLASS_LIST: ArthurianClass[] = [ArthurianClass.KNIGHT, ArthurianClass.RANGER, ArthurianClass.MAGE, ArthurianClass.ROGUE, ArthurianClass.PALADIN, ArthurianClass.DRUID];
const CLASS_DESC: Record<ArthurianClass, string> = {
  [ArthurianClass.KNIGHT]:  "Stalwart warrior. High strength and constitution.",
  [ArthurianClass.RANGER]:  "Keen-eyed wanderer. High dexterity and perception.",
  [ArthurianClass.MAGE]:    "Arcane scholar. High intelligence and wisdom.",
  [ArthurianClass.ROGUE]:   "Shadow-stepping trickster. High dexterity and charisma.",
  [ArthurianClass.PALADIN]: "Holy warrior. Balanced strength and wisdom.",
  [ArthurianClass.DRUID]:   "Keeper of the old ways. High wisdom and nature affinity.",
};

// -- Dialogue / Shop --
interface DlgState { npcName: string; lines: string[]; lineIdx: number; choices: { text: string; action: string }[]; choiceIdx: number }
interface ShopState { items: { id: string; name: string; price: number; weight: number }[]; selIdx: number }

// ============================================================================
export class ArthurianRPGGame {
  private _phase = ArthurianPhase.MAIN_MENU;
  private _state: ArthurianRPGState | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _input = mkInput();
  private _tickerCb: ((t: Ticker) => void) | null = null;
  private _simAcc = 0;
  private readonly DT = 1 / 60;
  // Menu
  private _menuSel = 0;
  private _hasSave = false;
  // Char create
  private _classIdx = 0;
  private _playerName = "Sir Galahad";
  private _nameEdit = false;
  // Camera
  private _yaw = 0; private _pitch = 0.3;
  // Movement system wired via HeightmapTerrainProvider (queries renderer's terrain heightmap)
  private _terrainProvider: HeightmapTerrainProvider | null = null;
  private _movementSystem: ArthurianRPGMovementSystem | null = null;
  // Gameplay (legacy fallbacks kept for non-3D paths)
  private _velY = 0; private _grounded = true;
  private _spawnT = 0;
  private _interactId: string | null = null;
  private _dlg: DlgState | null = null;
  private _shop: ShopState | null = null;
  private _notifs: { text: string; t: number }[] = [];
  private _invCur = 0; private _charTab = 0; private _helpSel = 0;
  // Crafting
  private _craftUI: CraftingUIState = createCraftingUIState();
  // Quest & Dialogue system
  private _dialogueSystem: ArthurianRPGDialogueSystem | null = null;
  private _questNPCs: QuestNPCDef[] = [];
  // Companion combat AI
  private _companionAI = new CompanionCombatAIManager();
  // Dungeon
  private _dungeonInteractId: string | null = null; // "chest_X", "door_X", "exit", "entrance_X"
  private _dungeonYaw = 0; private _dungeonPitch = 0;
  private _prePausePhase: ArthurianPhase = ArthurianPhase.PLAYING; // tracks PLAYING vs DUNGEON for menu returns
  // Weather
  private _weatherTimer = 0;
  private _weatherModifiers: WeatherModifiers = getWeatherModifiers("clear");
  // Visual effects
  private _floatingDmg: { text: string; x: number; y: number; t: number; color: string; crit: boolean }[] = [];
  private _weaponBob = 0;
  private _hitFlashTimer = 0;
  private _screenShakeTimer = 0;
  private _screenShakeIntensity = 0;
  private _rainDrops: { x: number; y: number; speed: number; len: number }[] = [];
  private _snowFlakes: { x: number; y: number; speed: number; drift: number; size: number }[] = [];
  // Handlers
  private _kd: ((e: KeyboardEvent) => void) | null = null;
  private _ku: ((e: KeyboardEvent) => void) | null = null;
  private _md: ((e: MouseEvent) => void) | null = null;
  private _mu: ((e: MouseEvent) => void) | null = null;
  private _mm: ((e: MouseEvent) => void) | null = null;

  // ---- Boot / Destroy ----
  async boot(): Promise<void> {
    viewManager.clearWorld();
    this._canvas = document.createElement("canvas");
    this._canvas.width = window.innerWidth; this._canvas.height = window.innerHeight;
    this._canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:100;cursor:crosshair;background:#111";
    document.body.appendChild(this._canvas);
    this._ctx = this._canvas.getContext("2d")!;
    window.addEventListener("resize", this._onResize);
    this._setupInput();
    this._initTerrainAndMovement();
    this._hasSave = loadGame() !== null;
    this._tickerCb = (ticker: Ticker) => {
      this._simAcc += Math.min(ticker.deltaMS / 1000, 0.1);
      while (this._simAcc >= this.DT) { this._simAcc -= this.DT; this._sim(this.DT); }
      this._render();
    };
    rpgAudio.init();
    viewManager.app.ticker.add(this._tickerCb);
  }

  destroy(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    if (this._kd) window.removeEventListener("keydown", this._kd);
    if (this._ku) window.removeEventListener("keyup", this._ku);
    if (this._md) window.removeEventListener("mousedown", this._md);
    if (this._mu) window.removeEventListener("mouseup", this._mu);
    if (this._mm) window.removeEventListener("mousemove", this._mm);
    window.removeEventListener("resize", this._onResize);
    if (this._canvas) { this._canvas.remove(); this._canvas = null; this._ctx = null; }
    rpgAudio.destroy(); this._state = null; this._dlg = null; this._shop = null;
    this._terrainProvider = null; this._movementSystem = null;
  }
  private _onResize = () => { if (this._canvas) { this._canvas.width = window.innerWidth; this._canvas.height = window.innerHeight; } };

  // ---- Input ----
  private _setupInput(): void {
    this._kd = (e) => this._keyDown(e);
    this._ku = (e) => this._keyUp(e);
    this._md = (e) => { rpgAudio.resume(); if (e.button === 0) this._input.attack = true; if (e.button === 2) this._input.block = true; if (this._phase === ArthurianPhase.PLAYING && this._canvas) this._canvas.requestPointerLock(); };
    this._mu = (e) => { if (e.button === 0) this._input.attack = false; if (e.button === 2) this._input.block = false; };
    this._mm = (e) => { this._input.mouseDX += e.movementX; this._input.mouseDY += e.movementY; };
    window.addEventListener("keydown", this._kd); window.addEventListener("keyup", this._ku);
    window.addEventListener("mousedown", this._md); window.addEventListener("mouseup", this._mu);
    window.addEventListener("mousemove", this._mm);
  }
  private _keyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    const i = this._input;
    switch (e.code) {
      case "KeyW": i.forward = true; break; case "KeyS": i.back = true; break;
      case "KeyA": i.left = true; break; case "KeyD": i.right = true; break;
      case "Space": i.jump = true; e.preventDefault(); break;
      case "ShiftLeft": case "ShiftRight": i.sprint = true; break;
      case "KeyE": i.interact = true; break;
    }
    this._phaseKey(e);
  }
  private _keyUp(e: KeyboardEvent): void {
    const i = this._input;
    switch (e.code) {
      case "KeyW": i.forward = false; break; case "KeyS": i.back = false; break;
      case "KeyA": i.left = false; break; case "KeyD": i.right = false; break;
      case "Space": i.jump = false; break;
      case "ShiftLeft": case "ShiftRight": i.sprint = false; break;
      case "KeyE": i.interact = false; break;
    }
  }
  private _phaseKey(e: KeyboardEvent): void {
    const P = ArthurianPhase;
    if (this._phase === P.MAIN_MENU) {
      if (e.code === "ArrowUp" || e.code === "KeyW") this._menuSel = 0;
      if (e.code === "ArrowDown" || e.code === "KeyS") this._menuSel = this._hasSave ? 1 : 0;
      if (e.code === "Enter" || e.code === "Space") { if (this._menuSel === 0) this._phase = P.CHARACTER_CREATE; else if (this._hasSave) this._loadSave(); }
      if (e.code === "Escape") this._exit();
    } else if (this._phase === P.CHARACTER_CREATE) {
      if (this._nameEdit) {
        if (e.code === "Enter") this._nameEdit = false;
        else if (e.code === "Backspace") this._playerName = this._playerName.slice(0, -1);
        else if (e.key.length === 1 && this._playerName.length < 24) this._playerName += e.key;
        return;
      }
      if (e.code === "ArrowLeft" || e.code === "KeyA") this._classIdx = (this._classIdx - 1 + CLASS_LIST.length) % CLASS_LIST.length;
      if (e.code === "ArrowRight" || e.code === "KeyD") this._classIdx = (this._classIdx + 1) % CLASS_LIST.length;
      if (e.code === "KeyN") this._nameEdit = true;
      if (e.code === "Enter") this._newGame();
      if (e.code === "Escape") this._phase = P.MAIN_MENU;
    } else if (this._phase === P.PLAYING) {
      if (e.code === "Tab") { rpgAudio.playMenuToggle(true); this._prePausePhase = P.PLAYING; this._phase = P.INVENTORY; this._invCur = 0; e.preventDefault(); }
      if (e.code === "KeyC") { rpgAudio.playMenuToggle(true); this._prePausePhase = P.PLAYING; this._phase = P.CHARACTER_SHEET; }
      if (e.code === "KeyM") { rpgAudio.playMenuToggle(true); this._phase = P.MAP; }
      if (e.code === "Escape") { this._prePausePhase = P.PLAYING; this._phase = P.HELP; this._helpSel = 0; document.exitPointerLock(); }
      if (e.code === "F5") { e.preventDefault(); this._quickSave(); }
      if (e.code === "F9") { e.preventDefault(); this._loadSave(); }
      if (e.code === "KeyF") this._toggleCam();
      if (e.code === "KeyK") { this._craftUI = createCraftingUIState(); this._phase = P.CRAFTING; document.exitPointerLock(); }
    } else if (this._phase === P.HELP) {
      if (e.code === "Escape") this._phase = this._prePausePhase;
      if (e.code === "ArrowUp" || e.code === "KeyW") this._helpSel = Math.max(0, this._helpSel - 1);
      if (e.code === "ArrowDown" || e.code === "KeyS") this._helpSel = Math.min(2, this._helpSel + 1);
      if (e.code === "Enter" || e.code === "Space") {
        if (this._helpSel === 0) this._phase = this._prePausePhase;
        else if (this._helpSel === 1) { this._quickSave(); this._phase = this._prePausePhase; }
        else if (this._helpSel === 2) this._exit();
      }
    } else if (this._phase === P.INVENTORY) {
      if (!this._state) return;
      const n = this._state.player.inventory.items.length;
      if (e.code === "ArrowUp") this._invCur = Math.max(0, this._invCur - 1);
      if (e.code === "ArrowDown") this._invCur = Math.min(n - 1, this._invCur);
      if (e.code === "Tab" || e.code === "Escape") { rpgAudio.playMenuToggle(false); this._phase = this._prePausePhase; }
    } else if (this._phase === P.CHARACTER_SHEET) {
      if (e.code === "ArrowLeft") this._charTab = Math.max(0, this._charTab - 1);
      if (e.code === "ArrowRight") this._charTab = Math.min(2, this._charTab + 1);
      if (e.code === "KeyC" || e.code === "Escape") { rpgAudio.playMenuToggle(false); this._phase = this._prePausePhase; }
    } else if (this._phase === P.MAP) {
      if (e.code === "KeyM" || e.code === "Escape") { rpgAudio.playMenuToggle(false); this._phase = P.PLAYING; }
    } else if (this._phase === P.DIALOGUE && this._dlg) {
      if (e.code === "Enter" || e.code === "Space") {
        if (this._dlg.lineIdx < this._dlg.lines.length - 1) this._dlg.lineIdx++;
        else if (this._dlg.choices.length > 0) {
          const chosenAction = this._dlg.choices[this._dlg.choiceIdx].action;
          if (chosenAction === "exit") {
            if (this._dialogueSystem?.walker.isActive) this._dialogueSystem.endDialogue();
            this._dlg = null; this._phase = P.PLAYING;
          } else if (chosenAction.startsWith("dlg_choice_") && this._dialogueSystem?.walker.isActive) {
            const choiceIdx = parseInt(chosenAction.replace("dlg_choice_", ""), 10);
            const playerSkills: Record<string, number> = this._state?.player.combatant.attributes ? { ...this._state.player.combatant.attributes } as Record<string, number> : { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, perception: 10 };
            const result = this._dialogueSystem.selectChoice(choiceIdx, playerSkills);
            if (result.skillCheckPassed === false) this._notify("Skill check failed!");
            if (result.node) {
              const nextChoices = this._dialogueSystem.walker.getAvailableChoices(this._dialogueSystem);
              const dlgChoices = nextChoices.map((c: any, i: number) => ({ text: c.text, action: "dlg_choice_" + i }));
              if (dlgChoices.length === 0) dlgChoices.push({ text: "Farewell", action: "exit" });
              this._dlg = { npcName: result.node.speaker, lines: [result.node.text], lineIdx: 0, choices: dlgChoices, choiceIdx: 0 };
            } else {
              this._dlg = null; this._phase = P.PLAYING;
            }
          } else {
            this._dlg.lines = ["Perhaps another time..."]; this._dlg.lineIdx = 0; this._dlg.choices = [];
          }
        }
        else { this._dlg = null; this._phase = P.PLAYING; }
      }
      if (e.code === "ArrowUp" && this._dlg?.choices.length) this._dlg.choiceIdx = Math.max(0, this._dlg.choiceIdx - 1);
      if (e.code === "ArrowDown" && this._dlg?.choices.length) this._dlg.choiceIdx = Math.min(this._dlg.choices.length - 1, this._dlg.choiceIdx + 1);
    } else if (this._phase === P.SHOP && this._shop && this._state) {
      if (e.code === "ArrowUp") this._shop.selIdx = Math.max(0, this._shop.selIdx - 1);
      if (e.code === "ArrowDown") this._shop.selIdx = Math.min(this._shop.items.length - 1, this._shop.selIdx + 1);
      if (e.code === "Enter") { const it = this._shop.items[this._shop.selIdx]; if (it && this._state.player.gold >= it.price) { this._state.player.gold -= it.price; addItem(this._state.player, it.id, 1, it.name, it.weight, ItemQualityTier.Common); rpgAudio.playGoldReceived(); this._notify(`Purchased ${it.name}`); } else { this._notify("Not enough gold!"); } }
      if (e.code === "Escape") { rpgAudio.playMenuToggle(false); this._shop = null; this._phase = P.PLAYING; }
    } else if (this._phase === P.DUNGEON) {
      if (e.code === "Tab") { this._prePausePhase = P.DUNGEON; this._phase = P.INVENTORY; this._invCur = 0; e.preventDefault(); }
      if (e.code === "KeyC") { this._prePausePhase = P.DUNGEON; this._phase = P.CHARACTER_SHEET; }
      if (e.code === "Escape") { this._prePausePhase = P.DUNGEON; this._phase = P.HELP; this._helpSel = 0; document.exitPointerLock(); }
      if (e.code === "F5") { e.preventDefault(); this._quickSave(); }
    } else if (this._phase === P.DEAD) {
      if (e.code === "Enter" || e.code === "Space") this._respawn();
    } else if (this._phase === P.CRAFTING) {
      if (!this._state) return;
      const craftResult = handleCraftingKey(e, this._craftUI, this._state.player);
      if (craftResult.close) this._phase = P.PLAYING;
      if (craftResult.notification) this._notify(craftResult.notification);
    }
  }

  // ---- Sim ----
  private _sim(dt: number): void {
    if (!this._state || (this._phase !== ArthurianPhase.PLAYING && this._phase !== ArthurianPhase.DUNGEON)) { this._input.interact = false; this._input.mouseDX = 0; this._input.mouseDY = 0; return; }
    this._state.deltaTime = dt;
    // Day/night
    this._state.worldTime += dt / RPG_CONFIG.realSecondsPerGameHour;
    if (this._state.worldTime >= 24) { this._state.worldTime -= 24; this._state.world.dayCount++; }
    this._state.world.timeOfDay = this._state.worldTime;

    // Weather updates
    this._updateWeather(dt);
    // NPC daily schedules
    this._updateNPCSchedules(dt);

    if (this._phase === ArthurianPhase.DUNGEON) {
      this._dungeonSim(dt);
    } else {
      // Movement
      this._move(dt);
      // Combat
      this._combat(dt);
      // Enemy AI
      this._ai(dt);
      // Regen
      this._regen(dt);
      // Spawning
      this._spawn(dt);
      // Companion combat AI
      this._updateCompanionCombatAI(dt);
      // Interaction
      this._interact();
      // Lightning strikes (storm weather)
      this._processLightningStrikes(dt);
    }
    // Notifications
    for (let i = this._notifs.length - 1; i >= 0; i--) { this._notifs[i].t -= dt; if (this._notifs[i].t <= 0) this._notifs.splice(i, 1); }
    // Visual effects timers
    for (let i = this._floatingDmg.length - 1; i >= 0; i--) { this._floatingDmg[i].t -= dt; this._floatingDmg[i].y -= 40 * dt; if (this._floatingDmg[i].t <= 0) this._floatingDmg.splice(i, 1); }
    if (this._hitFlashTimer > 0) this._hitFlashTimer -= dt;
    if (this._screenShakeTimer > 0) this._screenShakeTimer -= dt;
    this._weaponBob += dt * (this._input.sprint ? 12 : this._input.forward || this._input.back || this._input.left || this._input.right ? 7 : 1.5);
    // -- Audio: ambient + footsteps --
    const _pp = this._state.player.combatant.position;
    rpgAudio.updateAmbient(dt, this._state.world.weather, this._state.worldTime, _pp);
    const _isMoving = this._input.forward || this._input.back || this._input.left || this._input.right;
    const _spd = this._input.sprint ? 9 : 5;
    const _terrH = Math.sin(_pp.x*0.008)*Math.cos(_pp.z*0.008)*18;
    const _tt = _terrH <= 2 ? TerrainType.Water : _terrH < 4 ? TerrainType.Sand : _terrH < 6 ? TerrainType.Grass : _terrH < 9 ? TerrainType.Dirt : TerrainType.Stone;
    rpgAudio.updateFootsteps(dt, _isMoving, _spd, _tt);
    this._input.interact = false; this._input.mouseDX = 0; this._input.mouseDY = 0;
  }

  private _move(dt: number): void {
    if (!this._state) return;
    const p = this._state.player, c = p.combatant, pos = c.position;
    const d = calculateDerivedStats(p);
    this._yaw -= this._input.mouseDX * 0.002;
    this._pitch = Math.max(-1.2, Math.min(1.2, this._pitch - this._input.mouseDY * 0.002));
    // --- Path A: Full physics via ArthurianRPGMovementSystem + real heightmap ---
    if (this._movementSystem) {
      const ms = this._movementSystem;
      ms.setYaw(this._yaw);
      ms.setPosition(pos.x, pos.y, pos.z);
      const moveInput: MovementInput = {
        forward: (this._input.forward ? -1 : 0) + (this._input.back ? 1 : 0),
        right:   (this._input.right  ? 1 : 0) + (this._input.left ? -1 : 0),
        jump: this._input.jump, sprint: this._input.sprint,
        crouch: false, dodgeRoll: false, mount: false,
      };
      const result = ms.update(moveInput, c.stamina, dt);
      c.stamina = Math.max(0, c.stamina - result.staminaCost);
      const np = ms.getPosition();
      pos.x = np.x; pos.y = np.y; pos.z = np.z;
      this._grounded = ms.getIsOnGround();
    // --- Path B: Legacy flat-ground fallback (2-D canvas renderer) ---
    } else {
      let spd = d.moveSpeed * this._weatherModifiers.movementSpeedMult;
      const staminaDrain = 15 * this._weatherModifiers.staminaDrainMult;
      if (this._input.sprint && c.stamina > 5) { spd *= 1.6; c.stamina -= staminaDrain * dt; if (c.stamina < 0) c.stamina = 0; }
      const sin = Math.sin(this._yaw), cos = Math.cos(this._yaw);
      let dx = 0, dz = 0;
      if (this._input.forward) { dx -= sin; dz -= cos; } if (this._input.back) { dx += sin; dz += cos; }
      if (this._input.left) { dx -= cos; dz += sin; } if (this._input.right) { dx += cos; dz -= sin; }
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0.001) { pos.x += (dx / len) * spd * dt; pos.z += (dz / len) * spd * dt; }
      if (this._input.jump && this._grounded && c.stamina > 10) { this._velY = 8; this._grounded = false; c.stamina -= 10; }
      if (!this._grounded) { this._velY -= 20 * dt; pos.y += this._velY * dt; }
      const groundY = this._terrH(pos.x, pos.z);
      if (pos.y <= groundY) { pos.y = groundY; this._grounded = true; this._velY = 0; }
    }
    c.isBlocking = this._input.block; p.combat.blockActive = this._input.block;
    // Region check
    let nr = p.currentRegion;
    if (pos.x < -100) nr = "darkwood"; else if (pos.x > 200 && pos.z > 200) nr = "grail_temple";
    else if (pos.x > 100) nr = "saxon_camp"; else if (pos.z < -100) nr = "avalon";
    else if (pos.z > 100) nr = "mordred_fortress"; else nr = "camelot";
    if (nr !== p.currentRegion) {
      p.currentRegion = nr; this._state.world.currentRegion = nr; this._state.world.enemies = [];
      rpgAudio.playRegionEnter(); this._notify(`Entering ${REGIONS[nr]?.name ?? nr}`);
      if (!p.discoveredLocations.includes(nr)) { p.discoveredLocations.push(nr); p.unlockedFastTravel.push(nr); addXP(p, 25); this._notify("New location discovered!"); }
      // Spawn quest NPCs and check region objectives
      this._spawnQuestNPCs(nr);
      this._checkRegionQuestObjectives(nr);
    }
  }

  private _combat(dt: number): void {
    if (!this._state) return;
    const cb = this._state.player.combat;
    for (const k of Object.keys(cb.cooldowns)) { cb.cooldowns[k] -= dt; if (cb.cooldowns[k] <= 0) delete cb.cooldowns[k]; }
    if (cb.comboTimer > 0) { cb.comboTimer -= dt; if (cb.comboTimer <= 0) cb.comboCount = 0; }
    if (cb.staggerBuildup > 0) { cb.staggerBuildup -= 5 * dt; if (cb.staggerBuildup < 0) cb.staggerBuildup = 0; }
    if (this._input.attack && !cb.cooldowns["attack"]) this._attack();
  }

  private _attack(): void {
    if (!this._state) return;
    const p = this._state.player, d = calculateDerivedStats(p), cb = p.combat;
    if (p.combatant.stamina < 10) return;
    rpgAudio.playSwordSwing(); p.combatant.stamina -= 10; cb.cooldowns["attack"] = 0.5; cb.comboCount++; cb.comboTimer = 2.0;
    let best: EnemyInstance | null = null, bestD = 3.0;
    for (const e of this._state.world.enemies) { if (e.hp <= 0) continue; const dist = this._d3(p.combatant.position, e.pos); if (dist < bestD) { best = e; bestD = dist; } }
    if (best) {
      const crit = Math.random() < d.critChance;
      let dmg = Math.max(1, Math.floor(d.physicalDamage * (1 + cb.comboCount * 0.1) * (crit ? d.critMultiplier : 1)));
      best.hp -= dmg; cb.inCombat = true; cb.targetId = best.id;
      rpgAudio.playHitImpact(crit); this._notify(crit ? `CRITICAL! ${dmg} damage` : `${dmg} damage`);
      // Floating damage number
      this._spawnDmgNumber(`${dmg}`, best, crit ? "#ff4444" : "#ffffff", crit);
      if (best.hp <= 0) { best.state = EnemyBehavior.Dead; this._killEnemy(best); }
    }
  }

  private _killEnemy(e: EnemyInstance): void {
    if (!this._state) return;
    const _lvBefore = this._state.player.combatant.level; const xp = 20 + e.level * 10; addXP(this._state.player, xp); if (this._state.player.combatant.level > _lvBefore) rpgAudio.playLevelUp(); this._notify(`Enemy slain! +${xp} XP`);
    if (Math.random() < 0.4) { const g = Math.floor(5 + Math.random() * e.level * 3); this._state.player.gold += g; rpgAudio.playGoldReceived(); this._notify(`+${g} gold`); }
    if (Math.random() < 0.2) { addItem(this._state.player, "health_potion", 1, "Health Potion", 0.5, ItemQualityTier.Common); rpgAudio.playItemPickup(); this._notify("Found: Health Potion"); }
    for (const q of this._state.player.activeQuests) for (const o of q.objectives) if (o.type === "kill" && o.targetId === e.defId && !o.completed) { o.currentCount++; if (o.currentCount >= o.requiredCount) o.completed = true; rpgAudio.playQuestComplete(); }
  }

  private _ai(dt: number): void {
    if (!this._state) return;
    const pp = this._state.player.combatant.position;
    for (const e of this._state.world.enemies) {
      if (e.hp <= 0) continue;
      const dist = this._d3(pp, e.pos);
      const ar = e.aiState.attackRange ?? 2.5;
      const detectionRange = 15 * this._weatherModifiers.detectionRangeMult;
      if (e.state === EnemyBehavior.Idle || e.state === EnemyBehavior.Patrol) {
        if (dist < detectionRange) { e.state = EnemyBehavior.Chase; e.target = "player"; }
        if (e.state === EnemyBehavior.Patrol && e.patrolPath.length > 0) {
          const t = e.patrolPath[e.patrolIndex], dx = t.x - e.pos.x, dz = t.z - e.pos.z, pd = Math.sqrt(dx*dx+dz*dz);
          if (pd < 1) e.patrolIndex = (e.patrolIndex + 1) % e.patrolPath.length;
          else { e.pos.x += (dx/pd)*2*dt; e.pos.z += (dz/pd)*2*dt; }
        }
      } else if (e.state === EnemyBehavior.Alert) {
        e.alertLevel += dt * 0.5;
        if (dist < (10 * this._weatherModifiers.detectionRangeMult) || e.alertLevel >= 1) { e.state = EnemyBehavior.Chase; e.target = "player"; }
        if (dist > (20 * this._weatherModifiers.detectionRangeMult)) e.state = EnemyBehavior.Idle;
      } else if (e.state === EnemyBehavior.Chase) {
        if (dist > 25) { e.state = EnemyBehavior.Idle; e.target = null; }
        else if (dist < ar) e.state = EnemyBehavior.Attack;
        else { const dx = pp.x - e.pos.x, dz = pp.z - e.pos.z, cd = Math.sqrt(dx*dx+dz*dz); if (cd > 0.1) { e.pos.x += (dx/cd)*3.5*dt; e.pos.z += (dz/cd)*3.5*dt; } }
      } else if (e.state === EnemyBehavior.Attack) {
        if (dist > ar * 1.5) e.state = EnemyBehavior.Chase;
        else { // attack player
          const key = `eatk_${e.id}`;
          if (!this._state.player.combat.cooldowns[key]) {
            this._state.player.combat.cooldowns[key] = e.aiState.attackDelay ?? 1.2;
            let dmg = Math.floor(5 + e.level * 2 + Math.random() * 5);
            if (this._state.player.combat.blockActive) { dmg = Math.floor(dmg * (1 - calculateDerivedStats(this._state.player).blockEfficiency)); rpgAudio.playBlock(); this._notify(`Blocked! ${dmg} dmg`); }
            this._state.player.combatant.hp -= dmg;
            this._hitFlashTimer = 0.3; this._screenShakeTimer = 0.15; this._screenShakeIntensity = dmg > 20 ? 8 : 4;
            if (this._state.player.combatant.hp <= 0) { this._state.player.combatant.hp = 0; this._phase = ArthurianPhase.DEAD; rpgAudio.playDeath(); this._notify("You have fallen..."); }
          }
        }
        if (e.hp / e.maxHp < (e.aiState.fleeThreshold ?? 0.1)) e.state = EnemyBehavior.Flee;
      } else if (e.state === EnemyBehavior.Flee) {
        const fx = e.pos.x - pp.x, fz = e.pos.z - pp.z, fd = Math.sqrt(fx*fx+fz*fz);
        if (fd > 0.1) { e.pos.x += (fx/fd)*4*dt; e.pos.z += (fz/fd)*4*dt; }
        if (dist > 30) e.state = EnemyBehavior.Idle;
      }
    }
  }

  private _regen(dt: number): void {
    if (!this._state) return;
    const c = this._state.player.combatant, cb = this._state.player.combat;
    c.stamina = Math.min(c.maxStamina, c.stamina + RPG_CONFIG.staminaRegenRate * (cb.inCombat ? 0.5 : 1) * dt);
    c.mp = Math.min(c.maxMp, c.mp + RPG_CONFIG.manaRegenRate * dt);
    for (let i = c.activeEffects.length - 1; i >= 0; i--) { const ef = c.activeEffects[i]; ef.elapsed += dt; if (ef.elapsed >= ef.duration) { c.activeEffects.splice(i, 1); continue; } if (ef.damagePerTick) c.hp -= ef.damagePerTick * dt / ef.tickInterval; if (ef.healPerTick) c.hp = Math.min(c.maxHp, c.hp + ef.healPerTick * dt / ef.tickInterval); }
    if (cb.inCombat && !this._state.world.enemies.some(e => e.hp > 0 && this._d3(c.position, e.pos) < 20)) cb.inCombat = false;
  }

  private _spawn(dt: number): void {
    if (!this._state) return;
    this._spawnT += dt; if (this._spawnT < 5) return; this._spawnT = 0;
    const r = REGIONS[this._state.world.currentRegion]; if (!r) return;
    if (this._state.world.enemies.filter(e => e.hp > 0).length >= r.spawnCap) return;
    const pp = this._state.player.combatant.position, a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 15;
    const sp: Vec3 = { x: pp.x + Math.cos(a) * d, y: 0, z: pp.z + Math.sin(a) * d };
    const et = r.enemyTypes[Math.floor(Math.random() * r.enemyTypes.length)];
    const lv = r.minLevel + Math.floor(Math.random() * (r.maxLevel - r.minLevel));
    const id = `e_${Date.now()}_${Math.floor(Math.random() * 9999)}`, hp = 30 + lv * 10;
    this._state.world.enemies.push({
      id, defId: et, pos: sp, rotation: Math.random() * 6.28, hp, maxHp: hp, state: EnemyBehavior.Patrol,
      aiState: { attackRange: 2.5, heavyAttackChance: 0.2, blockChance: 0.15, fleeThreshold: 0.15, attackDelay: 1 + Math.random() * 0.5 },
      target: null, alertLevel: 0,
      patrolPath: [{ x: sp.x + 5, y: 0, z: sp.z }, { x: sp.x, y: 0, z: sp.z + 5 }, { x: sp.x - 5, y: 0, z: sp.z }],
      patrolIndex: 0, lootTable: "generic", level: lv, respawnTime: 60,
      combatant: { id, name: et.replace(/_/g, " "), hp, maxHp: hp, mp: 0, maxMp: 0, stamina: 50, maxStamina: 50, position: { ...sp }, isBlocking: false, attributes: { strength: 10+lv, dexterity: 8+lv, constitution: 10+lv, intelligence: 6, wisdom: 6, charisma: 5, perception: 8 }, skills: {}, perks: [], equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null, feet: null, ring1: null, ring2: null, amulet: null, cloak: null }, level: lv, xp: 0, xpToNext: 999, activeEffects: [] },
    });
  }

  private _interact(): void {
    if (!this._state) return;
    const pp = this._state.player.combatant.position;
    this._interactId = null; let best = 4.0;
    for (const n of this._state.world.npcs) { const d = this._d3(pp, n.pos); if (d < best) { best = d; this._interactId = n.id; } }
    for (const o of this._state.world.interactables) { const d = this._d3(pp, o.pos); if (d < best) { best = d; this._interactId = o.id; } }
    // Dungeon entrances
    for (const de of this._state.world.dungeonEntrances) {
      if (de.regionId !== this._state.player.currentRegion) continue;
      const d = this._d3(pp, de.worldPos);
      if (d < best) { best = d; this._interactId = `dungeon_entrance_${de.regionId}`; }
    }
    if (this._input.interact && this._interactId) {
      // Dungeon entrance interaction
      if (this._interactId.startsWith("dungeon_entrance_")) {
        const regionId = this._interactId.replace("dungeon_entrance_", "");
        const entrance = this._state.world.dungeonEntrances.find(e => e.regionId === regionId);
        if (entrance) { this._enterDungeon(entrance); return; }
      }
      const npc = this._state.world.npcs.find(n => n.id === this._interactId);
      if (npc) {
        // Check if NPC is sleeping - cannot interact
        if (npc.currentActivity === "sleeping") {
          this._notify(`${npc.name} is sleeping.`);
        } else if (npc.role === "merchant" && !npc.isShopOpen) {
          // Merchant is not at their shop during off-hours
          this._dlg = { npcName: npc.name, lines: [`My shop is closed right now. Come back during working hours (8-12, 14-18).`], lineIdx: 0, choices: [{ text: "Farewell", action: "exit" }], choiceIdx: 0 };
          this._phase = ArthurianPhase.DIALOGUE;
        } else {
          // Check if this NPC has a quest dialogue tree
          const questNpc = this._questNPCs.find(qn => qn.id === npc.id);
          if (questNpc && this._dialogueSystem) {
            const node = this._dialogueSystem.beginDialogue(questNpc.dialogueTreeId);
            if (node) {
              const availChoices = this._dialogueSystem.walker.getAvailableChoices(this._dialogueSystem);
              const dlgChoices = availChoices.map((c, i) => ({ text: c.text, action: `dlg_choice_${i}` }));
              if (dlgChoices.length === 0) dlgChoices.push({ text: "Farewell", action: "exit" });
              this._dlg = { npcName: node.speaker, lines: [node.text], lineIdx: 0, choices: dlgChoices, choiceIdx: 0 };
              this._phase = ArthurianPhase.DIALOGUE;
            } else {
              // Fallback generic dialogue
              this._dlg = { npcName: npc.name, lines: [`Greetings, traveler. I am ${npc.name}.`, "May the Grail guide your path."], lineIdx: 0, choices: [{ text: "Farewell", action: "exit" }], choiceIdx: 0 };
              this._phase = ArthurianPhase.DIALOGUE;
            }
          } else {
            const choices: { text: string; action: string }[] = [{ text: "Tell me about the Holy Grail", action: "info" }, { text: "Any work for me?", action: "quest" }, { text: "Farewell", action: "exit" }];
            if (npc.role === "merchant" && npc.isShopOpen) {
              choices.splice(0, 0, { text: "Show me your wares", action: "shop" });
            }
            this._dlg = { npcName: npc.name, lines: [`Greetings, traveler. I am ${npc.name}.`, "These are troubled times in Camelot.", "May the Grail guide your path."], lineIdx: 0, choices, choiceIdx: 0 };
            this._phase = ArthurianPhase.DIALOGUE;
          }
        }
      }
    }
  }

  // ---- Weather system ----
  private _updateWeather(dt: number): void {
    if (!this._state) return;
    this._weatherTimer += dt;
    // Update weather modifiers every tick from current weather state
    this._weatherModifiers = getWeatherModifiers(this._state.world.weather);
    // Transition weather every ~5 real minutes (300s) for variety
    if (this._weatherTimer >= 300) {
      this._weatherTimer = 0;
      const hour = this._state.worldTime;
      const region = this._state.world.currentRegion;
      const roll = Math.random();
      // Weather probabilities vary by time and region
      const isNight = hour < 6 || hour >= 22;
      const isMountain = region === "grail_temple" || region === "mordred_fortress";
      const isForest = region === "darkwood";
      if (isMountain) {
        // Mountains: more snow and storms
        if (roll < 0.3) this._state.world.weather = "snow";
        else if (roll < 0.5) this._state.world.weather = "storm";
        else if (roll < 0.7) this._state.world.weather = "fog";
        else if (roll < 0.85) this._state.world.weather = "overcast";
        else this._state.world.weather = "clear";
      } else if (isForest) {
        // Forests: more fog and rain
        if (roll < 0.25) this._state.world.weather = "fog";
        else if (roll < 0.45) this._state.world.weather = "rain";
        else if (roll < 0.55) this._state.world.weather = "storm";
        else if (roll < 0.75) this._state.world.weather = "overcast";
        else this._state.world.weather = "clear";
      } else {
        // Default regions
        if (roll < 0.1) this._state.world.weather = "storm";
        else if (roll < 0.25) this._state.world.weather = "rain";
        else if (roll < 0.35) this._state.world.weather = isNight ? "fog" : "overcast";
        else if (roll < 0.45) this._state.world.weather = "overcast";
        else this._state.world.weather = "clear";
      }
      this._notify(`Weather: ${this._state.world.weather}`);
    }
  }

  // ---- NPC daily schedules ----
  private _updateNPCSchedules(_dt: number): void {
    if (!this._state) return;
    const hour = this._state.worldTime;
    const isNight = hour >= 22 || hour < 6;
    for (const npc of this._state.world.npcs) {
      const resolved = resolveNPCActivity(npc, hour);
      npc.currentActivity = resolved.activity;
      npc.isShopOpen = resolved.isShopOpen;

      // Move NPC toward their scheduled location
      const target = resolved.targetPos;
      const dx = target.x - npc.pos.x;
      const dz = target.z - npc.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.5) {
        const speed = npc.role === "guard" ? 3.0 : 2.0;
        const step = speed * _dt;
        if (dist <= step) {
          npc.pos.x = target.x;
          npc.pos.z = target.z;
        } else {
          npc.pos.x += (dx / dist) * step;
          npc.pos.z += (dz / dist) * step;
        }
      }

      // Guards: increase patrol count at night (spawn extra guards are handled by _spawn already,
      // but we make existing guards more alert at night)
      if (npc.role === "guard" && isNight && npc.currentActivity === "patrolling") {
        // Guards move faster at night to cover more ground
        // (already handled by patrol speed above being 3.0)
      }
    }
  }

  // ---- Lightning strikes (storm weather) ----
  private _processLightningStrikes(dt: number): void {
    if (!this._state) return;
    if (this._weatherModifiers.lightningStrikeChance <= 0) return;
    // Check for lightning strike this tick
    if (Math.random() < this._weatherModifiers.lightningStrikeChance * dt * 60) {
      const pp = this._state.player.combatant.position;
      // Strike near player (within 30 units)
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 25;
      const strikeX = pp.x + Math.cos(angle) * dist;
      const strikeZ = pp.z + Math.sin(angle) * dist;
      // Damage player if very close (within 3 units)
      const playerDist = Math.sqrt((strikeX - pp.x) ** 2 + (strikeZ - pp.z) ** 2);
      if (playerDist < 3) {
        const dmg = Math.floor(15 + Math.random() * 25);
        this._state.player.combatant.hp -= dmg;
        this._notify(`Lightning strike! ${dmg} damage!`);
        if (this._state.player.combatant.hp <= 0) {
          this._state.player.combatant.hp = 0;
          this._phase = ArthurianPhase.DEAD;
          this._notify("Struck down by lightning...");
        }
      } else if (playerDist < 10) {
        this._notify("Lightning strikes nearby!");
      }
      // Damage enemies near the strike
      for (const e of this._state.world.enemies) {
        if (e.hp <= 0) continue;
        const eDist = Math.sqrt((strikeX - e.pos.x) ** 2 + (strikeZ - e.pos.z) ** 2);
        if (eDist < 3) {
          const dmg = Math.floor(20 + Math.random() * 30);
          e.hp -= dmg;
          if (e.hp <= 0) { e.state = EnemyBehavior.Dead; this._killEnemy(e); }
        }
      }
    }
  }

  // ---- Quest NPC spawning ----
  private _spawnQuestNPCs(region: string): void {
    if (!this._state) return;
    const regionNPCs = this._questNPCs.filter(n => n.region === region);
    for (const npcDef of regionNPCs) {
      if (this._state.world.npcs.some(n => n.id === npcDef.id)) continue;
      const npcPos = { ...npcDef.position };
      this._state.world.npcs.push({
        id: npcDef.id, defId: npcDef.id, name: npcDef.name,
        pos: npcPos, rotation: 0,
        dialogueState: npcDef.dialogueTreeId, shopInventory: [],
        questIds: npcDef.questIds, schedule: [],
        faction: npcDef.faction, disposition: 50, isEssential: true,
        role: "villager", homePos: { ...npcPos }, workPos: { ...npcPos },
        tavernPos: { x: npcPos.x + 10, y: 0, z: npcPos.z + 10 },
        currentActivity: "idle", isShopOpen: false,
      });
    }
  }

  // ---- Companion combat AI update ----
  private _updateCompanionCombatAI(dt: number): void {
    if (!this._state) return;
    const player = this._state.player;
    const aliveEnemies = this._state.enemies.filter(e => e.hp > 0);
    const results = this._companionAI.updateAll(
      player.companions, player.combatant, aliveEnemies, player.combat.targetId, dt,
    );
    for (const result of results) {
      if (result.action.type === "callout") {
        this._notify(result.action.message);
      }
    }
    // Check for enemies downed by companions
    for (const e of this._state.world.enemies) {
      if (e.hp <= 0 && e.state !== EnemyBehavior.Dead) {
        e.state = EnemyBehavior.Dead;
        this._killEnemy(e);
      }
    }
  }

  // ---- Quest objective region-enter tracking ----
  private _checkRegionQuestObjectives(region: string): void {
    if (!this._state || !this._dialogueSystem) return;
    for (const q of this._state.player.activeQuests) {
      for (const obj of q.objectives) {
        if (obj.type === "explore" && obj.targetId === region && !obj.completed) {
          obj.currentCount = 1; obj.completed = true;
          this._notify(`Objective complete: ${obj.description}`);
        }
      }
    }
    for (const questDef of ALL_QUESTS) {
      for (const obj of questDef.objectives) {
        if (obj.type === QuestObjectiveType.GoTo && obj.targetId === region) {
          this._dialogueSystem.quests.updateObjective(questDef.id, obj.id, 1);
        }
      }
    }
  }

  // ---- Actions ----
  private _newGame(): void {
    this._state = createDefaultState(CLASS_LIST[this._classIdx], this._playerName || "Sir Galahad");
    this._dialogueSystem = new ArthurianRPGDialogueSystem();
    registerAllContent(this._dialogueSystem);
    this._questNPCs = [...QUEST_NPCS];
    this._spawnQuestNPCs("camelot");
    this._companionAI.clear();
    for (const comp of this._state.player.companions) {
      this._companionAI.addCompanion(comp.npcId, comp.combatRole);
    }
    this._phase = ArthurianPhase.PLAYING;
    this._notify("Your quest for the Holy Grail begins...");
    this._notify("A vision of the Grail fills your mind. Seek Aldric the Sage.");
  }
  private _quickSave(): void { if (this._state && saveGame(this._state)) { this._hasSave = true; this._notify("Game saved"); } else this._notify("Save failed!"); }
  private _loadSave(): void { const s = loadGame(); if (s) { this._state = s; this._phase = ArthurianPhase.PLAYING; this._notify("Game loaded"); } else this._notify("No save found"); }
  private _toggleCam(): void { if (this._state) { this._state.player.cameraMode = this._state.player.cameraMode === "first_person" ? "third_person" : "first_person"; this._notify(`Camera: ${this._state.player.cameraMode.replace("_", " ")}`); } }
  private _respawn(): void { if (!this._state) return; const p = this._state.player; p.combatant.hp = Math.floor(p.combatant.maxHp * 0.5); p.combatant.mp = Math.floor(p.combatant.maxMp * 0.5); p.combatant.stamina = p.combatant.maxStamina; p.combatant.position = { x: 0, y: 0, z: 0 }; p.currentRegion = "camelot"; p.combat.inCombat = false; this._state.world.enemies = []; this._phase = ArthurianPhase.PLAYING; this._notify("Respawned at Camelot"); }
  private _exit(): void { document.exitPointerLock(); this.destroy(); window.dispatchEvent(new Event("arthurianExit")); }
  private _notify(t: string): void { this._notifs.push({ text: t, t: 3 }); if (this._notifs.length > 6) this._notifs.shift(); }
  private _d3(a: Vec3, b: Vec3): number { const dx = a.x-b.x, dy = a.y-b.y, dz = a.z-b.z; return Math.sqrt(dx*dx+dy*dy+dz*dz); }

  // =========================================================================
  // RENDER
  // =========================================================================
  private _render(): void {
    const ctx = this._ctx, c = this._canvas; if (!ctx || !c) return;
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    const P = ArthurianPhase;
    if (this._phase === P.MAIN_MENU) this._rMenu(ctx, W, H);
    else if (this._phase === P.CHARACTER_CREATE) this._rCreate(ctx, W, H);
    else if (this._phase === P.PLAYING) this._rPlay(ctx, W, H);
    else if (this._phase === P.INVENTORY) this._rInv(ctx, W, H);
    else if (this._phase === P.CHARACTER_SHEET) this._rChar(ctx, W, H);
    else if (this._phase === P.MAP) this._rMap(ctx, W, H);
    else if (this._phase === P.DIALOGUE) this._rDlg(ctx, W, H);
    else if (this._phase === P.SHOP) this._rShop(ctx, W, H);
    else if (this._phase === P.HELP) this._rHelp(ctx, W, H);
    else if (this._phase === P.DUNGEON) this._rDungeon(ctx, W, H);
    else if (this._phase === P.DEAD) this._rDead(ctx, W, H);
    else if (this._phase === P.CRAFTING) { if (this._state) { updateCraftingUI(this._craftUI, this.DT); renderCraftingScreen(ctx, W, H, this._craftUI, this._state.player); } }
  }

  private _rMenu(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = "#0a0a14"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c9a84c"; ctx.font = "bold 64px serif"; ctx.textAlign = "center";
    ctx.fillText("The Quest for the Holy Grail", W/2, H*0.25);
    ctx.fillStyle = "#8a7a5a"; ctx.font = "24px serif"; ctx.fillText("An Arthurian RPG", W/2, H*0.32);
    const items = ["New Game"]; if (this._hasSave) items.push("Continue");
    for (let i = 0; i < items.length; i++) {
      const sel = i === this._menuSel;
      ctx.fillStyle = sel ? "#c9a84c" : "#666"; ctx.font = sel ? "bold 32px serif" : "28px serif";
      ctx.fillText(items[i], W/2, H*0.45 + i*50);
      if (sel) ctx.fillText("\u25B6", W/2 - 100, H*0.45 + i*50);
    }
    ctx.fillStyle = "#555"; ctx.font = "16px serif"; ctx.fillText("Arrows to navigate, Enter to select, Esc to exit", W/2, H*0.85);
  }

  private _rCreate(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = "#0a0a14"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c9a84c"; ctx.font = "bold 42px serif"; ctx.textAlign = "center";
    ctx.fillText("Create Your Character", W/2, H*0.12);
    const cls = CLASS_LIST[this._classIdx];
    ctx.fillStyle = "#ddd"; ctx.font = "bold 28px serif"; ctx.fillText(`< ${cls.toUpperCase()} >`, W/2, H*0.25);
    ctx.fillStyle = "#999"; ctx.font = "18px serif"; ctx.fillText(CLASS_DESC[cls] ?? "", W/2, H*0.32);
    ctx.fillStyle = "#aaa"; ctx.font = "22px serif";
    ctx.fillText(`Name: ${this._playerName}${this._nameEdit ? "_" : ""}`, W/2, H*0.45);
    ctx.fillStyle = "#666"; ctx.font = "14px serif"; ctx.fillText("Press N to edit name", W/2, H*0.50);
    ctx.fillStyle = "#555"; ctx.font = "16px serif"; ctx.fillText("A/D select class | Enter begin | Esc back", W/2, H*0.85);
  }

  // ---- Seeded random for deterministic decoration placement ----
  private _srand(s: number): number { let h = (s * 374761393 + 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; }
  // ---- Terrain height: delegates to HeightmapTerrainProvider if available ----
  private _terrH(x: number, z: number): number {
    if (this._terrainProvider) return this._terrainProvider.getHeight(x, z);
    // Fallback (matches renderer's heightAt for the first four octaves)
    return Math.sin(x*0.008)*Math.cos(z*0.008)*18 + Math.sin(x*0.025+1.3)*Math.cos(z*0.02-0.7)*6 + Math.sin(x*0.06)*Math.sin(z*0.06)*2 + Math.sin(x*0.15+0.5)*Math.cos(z*0.12-0.3)*0.8;
  }

  /**
   * Initialise the movement system backed by the renderer's terrain heightmap.
   * Uses the same layered sine-wave height function as ArthurianRPGRenderer's
   * buildTerrain() so physics matches the visual mesh exactly.
   */
  private _initTerrainAndMovement(): void {
    // Height function identical to ArthurianRPGRenderer.buildTerrain -> heightAt
    const heightAt = (x: number, z: number): number => {
      const s1 = Math.sin(x * 0.008) * Math.cos(z * 0.008) * 18;
      const s2 = Math.sin(x * 0.025 + 1.3) * Math.cos(z * 0.02 - 0.7) * 6;
      const s3 = Math.sin(x * 0.06) * Math.sin(z * 0.06) * 2;
      const s4 = Math.sin(x * 0.15 + 0.5) * Math.cos(z * 0.12 - 0.3) * 0.8;
      const s5 = Math.sin(x * 0.3 + 2.1) * Math.cos(z * 0.28 - 1.1) * 0.3;
      const s6 = Math.sin(x * 0.5 + 0.8) * Math.sin(z * 0.45 + 0.4) * 0.12;
      return s1 + s2 + s3 + s4 + s5 + s6;
    };
    // Constants matching ArthurianRPGRenderer
    const TERRAIN_SIZE = 512;
    const WATER_LEVEL = 1.5;

    this._terrainProvider = new HeightmapTerrainProvider(heightAt, TERRAIN_SIZE, WATER_LEVEL);
    this._movementSystem = new ArthurianRPGMovementSystem(this._terrainProvider);
  }

  private _drawWeapon(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (!this._state) return;
    const cls = CLASS_LIST[this._classIdx];
    const isMoving = this._input.forward || this._input.back || this._input.left || this._input.right;
    const bobX = Math.sin(this._weaponBob) * (isMoving ? 8 : 2);
    const bobY = Math.abs(Math.cos(this._weaponBob)) * (isMoving ? 12 : 3);
    const attackAnim = this._state.player.combat.cooldowns["attack"] ? Math.max(0, this._state.player.combat.cooldowns["attack"]) / 0.5 : 0;
    const swingOff = attackAnim > 0 ? Math.sin(attackAnim * Math.PI) * 40 : 0;
    const baseX = W * 0.65 + bobX;
    const baseY = H * 0.6 + bobY - swingOff;

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.rotate(attackAnim > 0 ? -attackAnim * 0.8 : 0);

    if (cls === ArthurianClass.KNIGHT || cls === ArthurianClass.PALADIN) {
      // Sword
      // Hand/gauntlet
      ctx.fillStyle = cls === ArthurianClass.PALADIN ? "#b89940" : "#777";
      ctx.beginPath(); ctx.ellipse(0, 30, 18, 22, 0.15, 0, Math.PI*2); ctx.fill();
      // Grip
      ctx.fillStyle = "#442200";
      ctx.fillRect(-4, -40, 8, 70);
      // Cross guard
      ctx.fillStyle = cls === ArthurianClass.PALADIN ? "#c9a84c" : "#888";
      ctx.fillRect(-18, -42, 36, 6);
      // Blade
      const bladeGrad = ctx.createLinearGradient(0, -42, 0, -160);
      bladeGrad.addColorStop(0, "#aab");
      bladeGrad.addColorStop(0.5, "#dde");
      bladeGrad.addColorStop(1, "#ccd");
      ctx.fillStyle = bladeGrad;
      ctx.beginPath();
      ctx.moveTo(-8, -42);
      ctx.lineTo(8, -42);
      ctx.lineTo(3, -155);
      ctx.lineTo(0, -165);
      ctx.lineTo(-3, -155);
      ctx.closePath(); ctx.fill();
      // Blade highlight
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(-1, -150, 3, 108);
    } else if (cls === ArthurianClass.MAGE || cls === ArthurianClass.DRUID) {
      // Staff
      ctx.fillStyle = cls === ArthurianClass.DRUID ? "#3a5522" : "#4a3a6a";
      ctx.beginPath(); ctx.ellipse(0, 35, 16, 20, 0.1, 0, Math.PI*2); ctx.fill();
      // Staff shaft
      ctx.fillStyle = "#553322";
      ctx.fillRect(-4, -130, 8, 165);
      // Staff head orb
      const orbColor = cls === ArthurianClass.MAGE ? "rgba(100,120,255,0.8)" : "rgba(80,200,100,0.8)";
      ctx.shadowColor = cls === ArthurianClass.MAGE ? "rgba(100,120,255,0.6)" : "rgba(80,200,100,0.6)";
      ctx.shadowBlur = 15;
      ctx.fillStyle = orbColor;
      ctx.beginPath(); ctx.arc(0, -138, 10, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      // Glow particles around orb
      const pt = Date.now() * 0.003;
      for (let i = 0; i < 4; i++) {
        const px = Math.cos(pt + i * 1.57) * 14;
        const py = -138 + Math.sin(pt + i * 1.57) * 14;
        ctx.fillStyle = cls === ArthurianClass.MAGE ? "rgba(150,160,255,0.4)" : "rgba(120,255,150,0.4)";
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2); ctx.fill();
      }
    } else if (cls === ArthurianClass.RANGER) {
      // Bow (held vertically, not modifying the 3D renderer's bow orientation)
      ctx.fillStyle = "#556633";
      ctx.beginPath(); ctx.ellipse(0, 30, 15, 18, 0.1, 0, Math.PI*2); ctx.fill();
      // Bow limb
      ctx.strokeStyle = "#664422";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -100);
      ctx.quadraticCurveTo(-25, -50, -20, 0);
      ctx.quadraticCurveTo(-25, 50, 0, 80);
      ctx.stroke();
      // String
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -100); ctx.lineTo(0, 80); ctx.stroke();
      // Arrow
      ctx.fillStyle = "#886644";
      ctx.fillRect(-2, -110, 4, 120);
      // Arrowhead
      ctx.fillStyle = "#aaa";
      ctx.beginPath();
      ctx.moveTo(0, -118); ctx.lineTo(-4, -108); ctx.lineTo(4, -108);
      ctx.closePath(); ctx.fill();
    } else if (cls === ArthurianClass.ROGUE) {
      // Dagger
      ctx.fillStyle = "#222";
      ctx.beginPath(); ctx.ellipse(0, 25, 14, 18, 0.15, 0, Math.PI*2); ctx.fill();
      // Handle
      ctx.fillStyle = "#333";
      ctx.fillRect(-3, -15, 6, 40);
      // Guard
      ctx.fillStyle = "#666";
      ctx.fillRect(-10, -17, 20, 4);
      // Blade
      ctx.fillStyle = "#bbc";
      ctx.beginPath();
      ctx.moveTo(-5, -17); ctx.lineTo(5, -17);
      ctx.lineTo(2, -75); ctx.lineTo(0, -80); ctx.lineTo(-2, -75);
      ctx.closePath(); ctx.fill();
      // Second dagger (off-hand, slightly behind)
      ctx.globalAlpha = 0.6;
      ctx.translate(-W * 0.25, 15);
      ctx.fillStyle = "#222";
      ctx.beginPath(); ctx.ellipse(0, 25, 13, 17, -0.15, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#333"; ctx.fillRect(-3, -15, 6, 40);
      ctx.fillStyle = "#666"; ctx.fillRect(-10, -17, 20, 4);
      ctx.fillStyle = "#bbc";
      ctx.beginPath();
      ctx.moveTo(-5, -17); ctx.lineTo(5, -17);
      ctx.lineTo(2, -70); ctx.lineTo(0, -75); ctx.lineTo(-2, -70);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private _spawnDmgNumber(text: string, enemy: EnemyInstance, color: string, crit: boolean): void {
    if (!this._state || !this._canvas) return;
    const W = this._canvas.width, H = this._canvas.height;
    const pp = this._state.player.combatant.position;
    const dx = enemy.pos.x - pp.x, dz = enemy.pos.z - pp.z, dist = Math.sqrt(dx*dx+dz*dz);
    const ang = Math.atan2(dx, dz) - this._yaw;
    const horizon = H * 0.52;
    const sx = W/2 + Math.sin(ang) * (W*0.3) / (dist*0.1+1);
    const sy = horizon + 30 / (dist*0.15+1) - 30;
    this._floatingDmg.push({ text, x: sx + (Math.random()-0.5)*20, y: sy, t: 1.2, color, crit });
  }

  private _rPlay(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (!this._state) return;
    const p = this._state.player, c = p.combatant, w = this._state.world;
    const t = this._state.worldTime;
    const pp = c.position;
    const horizon = H * 0.52;

    // ============ SCREEN SHAKE ============
    ctx.save();
    if (this._screenShakeTimer > 0) {
      const si = this._screenShakeIntensity * (this._screenShakeTimer / 0.15);
      ctx.translate((Math.random()-0.5)*si*2, (Math.random()-0.5)*si*2);
    }

    // ============ SKY with gradient layers ============
    const isDay = t >= 6 && t < 20;
    const isDawn = t >= 5 && t < 8;
    const isDusk = t >= 17 && t < 21;
    let skyR = 8, skyG = 10, skyB = 25;
    if (t >= 6 && t < 8) { const f = (t-6)/2; skyR = 8+f*82; skyG = 10+f*120; skyB = 25+f*145; }
    else if (t >= 8 && t < 17) { skyR = 90; skyG = 130; skyB = 170; }
    else if (t >= 17 && t < 20) { const f = 1-(t-17)/3; skyR = Math.floor(90*f+25*(1-f)); skyG = Math.floor(130*f+12*(1-f)); skyB = Math.floor(170*f+35*(1-f)); }

    // Multi-stop sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, `rgb(${Math.max(0,skyR-20)|0},${Math.max(0,skyG-15)|0},${Math.max(0,skyB+10)|0})`);
    skyGrad.addColorStop(0.4, `rgb(${skyR|0},${skyG|0},${skyB|0})`);
    skyGrad.addColorStop(0.8, `rgb(${Math.min(255,skyR+30)|0},${Math.min(255,skyG+20)|0},${Math.min(255,skyB-10)|0})`);
    if (isDawn || isDusk) {
      const warmth = isDawn ? Math.max(0, 1-(t-5)/3) : Math.min(1, (t-17)/2);
      skyGrad.addColorStop(0.92, `rgba(${200+warmth*55|0},${100+warmth*50|0},${30+warmth*20|0},${warmth*0.8})`);
    }
    skyGrad.addColorStop(1, `rgb(${Math.min(255,skyR+40)|0},${Math.min(255,skyG+30)|0},${Math.min(255,skyB)|0})`);
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, horizon + 10);

    // ============ STARS (nighttime) ============
    const nightAlpha = t < 5 ? 1.0 : t < 7 ? (7-t)/2 : t > 20 ? Math.min(1,(t-20)/2) : t > 18 ? (t-18)/2 * 0.3 : 0;
    if (nightAlpha > 0.05) {
      ctx.fillStyle = `rgba(255,255,255,${nightAlpha})`;
      for (let i = 0; i < 120; i++) {
        const sx = this._srand(i*31+7) * W;
        const sy = this._srand(i*47+13) * horizon * 0.8;
        const twinkle = 0.5 + 0.5 * Math.sin(t*3 + i*1.7);
        const starSize = (this._srand(i*19+3) > 0.9 ? 2.5 : 1.2) * twinkle;
        ctx.globalAlpha = nightAlpha * (0.4 + twinkle * 0.6);
        ctx.beginPath(); ctx.arc(sx, sy, starSize, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ============ MOON (nighttime) ============
    if (nightAlpha > 0.1) {
      const moonX = W * 0.8 + Math.sin(t*0.1) * 50;
      const moonY = horizon * 0.15;
      ctx.fillStyle = `rgba(230,230,245,${nightAlpha * 0.9})`;
      ctx.shadowColor = "rgba(200,210,255,0.6)"; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(moonX, moonY, 18, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(200,200,220,${nightAlpha * 0.5})`;
      ctx.beginPath(); ctx.arc(moonX-5, moonY-3, 4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(moonX+6, moonY+4, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(moonX+2, moonY-6, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // ============ SUN (daytime) ============
    if (isDay) {
      const sunProgress = (t - 6) / 14; // 0 at 6am, 1 at 8pm
      const sunX = W * 0.15 + sunProgress * W * 0.7;
      const sunY = horizon * 0.12 + Math.sin(sunProgress * Math.PI) * (-horizon * 0.08);
      const sunAlpha = Math.min(1, Math.min((t-6)/1.5, (20-t)/1.5));
      // Sun glow
      const glowGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 60);
      glowGrad.addColorStop(0, `rgba(255,240,200,${sunAlpha * 0.4})`);
      glowGrad.addColorStop(0.5, `rgba(255,200,100,${sunAlpha * 0.1})`);
      glowGrad.addColorStop(1, "rgba(255,200,100,0)");
      ctx.fillStyle = glowGrad; ctx.fillRect(sunX-60, sunY-60, 120, 120);
      // Sun disc
      ctx.fillStyle = `rgba(255,250,220,${sunAlpha})`;
      ctx.shadowColor = "rgba(255,230,150,0.8)"; ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.arc(sunX, sunY, 12, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // ============ CLOUDS ============
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const cx = ((this._srand(i*71) * W * 1.5 + t * 3 + i * 80) % (W + 200)) - 100;
      const cy = horizon * (0.1 + this._srand(i*37) * 0.35);
      const cw = 60 + this._srand(i*53) * 100;
      const ch = 15 + this._srand(i*29) * 15;
      const cloudAlpha = isDay ? 0.7 : 0.15;
      ctx.fillStyle = isDay ? `rgba(240,240,250,${cloudAlpha})` : `rgba(40,45,60,${cloudAlpha})`;
      // Fluffy cloud shape with multiple ellipses
      for (let j = 0; j < 4; j++) {
        const ox = cw * (j / 4 - 0.15);
        const oy = (this._srand(i*13+j*7) - 0.5) * ch * 0.4;
        const rr = ch * (0.7 + this._srand(i*91+j*3) * 0.5);
        ctx.beginPath(); ctx.ellipse(cx + ox, cy + oy, rr * 1.5, rr, 0, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();

    // ============ DISTANT MOUNTAINS ============
    ctx.save();
    const mtCol = isDay ? `rgba(60,80,100,0.4)` : `rgba(15,20,30,0.6)`;
    ctx.fillStyle = mtCol;
    ctx.beginPath(); ctx.moveTo(0, horizon);
    for (let x = 0; x <= W; x += 3) {
      const h = Math.sin(x*0.003+1.5)*30 + Math.sin(x*0.008)*15 + Math.sin(x*0.015+0.7)*8;
      ctx.lineTo(x, horizon - 20 - Math.max(0, h));
    }
    ctx.lineTo(W, horizon); ctx.closePath(); ctx.fill();
    // Second mountain range (closer, darker)
    ctx.fillStyle = isDay ? `rgba(45,65,55,0.5)` : `rgba(10,15,20,0.7)`;
    ctx.beginPath(); ctx.moveTo(0, horizon);
    for (let x = 0; x <= W; x += 3) {
      const h = Math.sin(x*0.005+3.1)*20 + Math.sin(x*0.012+1.8)*10 + Math.sin(x*0.02)*5;
      ctx.lineTo(x, horizon - 8 - Math.max(0, h));
    }
    ctx.lineTo(W, horizon); ctx.closePath(); ctx.fill();
    ctx.restore();

    // ============ ATMOSPHERIC HAZE between mountains and ground ============
    const hazeGrad = ctx.createLinearGradient(0, horizon - 30, 0, horizon + 15);
    const hazeAlpha = isDay ? 0.15 : 0.08;
    hazeGrad.addColorStop(0, "rgba(0,0,0,0)");
    hazeGrad.addColorStop(0.4, `rgba(${isDay ? "160,180,200" : "40,50,70"},${hazeAlpha})`);
    hazeGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hazeGrad; ctx.fillRect(0, horizon - 30, W, 45);

    // ============ GROUND with perspective lines and region color ============
    const regionColor = REGIONS[w.currentRegion]?.color ?? "#3a5a3a";
    // Parse region color for gradient
    const rc = parseInt(regionColor.replace('#',''), 16);
    const rR = (rc >> 16) & 0xff, rG = (rc >> 8) & 0xff, rB = rc & 0xff;
    const groundGrad = ctx.createLinearGradient(0, horizon, 0, H);
    groundGrad.addColorStop(0, `rgb(${Math.min(255,rR+30)|0},${Math.min(255,rG+20)|0},${Math.min(255,rB+15)|0})`);
    groundGrad.addColorStop(0.3, regionColor);
    groundGrad.addColorStop(1, `rgb(${Math.max(0,rR-25)|0},${Math.max(0,rG-20)|0},${Math.max(0,rB-15)|0})`);
    ctx.fillStyle = groundGrad; ctx.fillRect(0, horizon - 2, W, H - horizon + 2);

    // Perspective grid lines (vanishing point at center-horizon)
    ctx.strokeStyle = isDay ? "rgba(255,255,255,0.04)" : "rgba(100,120,140,0.04)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 15; i++) {
      const yy = horizon + (i / 15) * (i / 15) * (H - horizon);
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
    }
    // Radial perspective lines from vanishing point
    ctx.strokeStyle = isDay ? "rgba(255,255,255,0.02)" : "rgba(100,120,140,0.02)";
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath(); ctx.moveTo(W/2, horizon); ctx.lineTo(W/2 + i * W * 0.2, H); ctx.stroke();
    }

    // ============ TERRAIN DETAILS: grass tufts, rocks ============
    ctx.save();
    for (let i = 0; i < 60; i++) {
      const gx = this._srand(i * 43 + 100) * W;
      const depth = this._srand(i * 67 + 200);
      const gy = horizon + depth * depth * (H - horizon) * 0.8 + 10;
      const gs = 3 + (1 - depth) * 5;
      if (this._srand(i * 11 + 300) > 0.3) {
        // Grass tuft
        ctx.strokeStyle = isDay ? `rgba(40,${100+Math.floor(this._srand(i*7)*50)},20,${0.3+depth*0.3})` : `rgba(15,30,10,${0.2+depth*0.2})`;
        ctx.lineWidth = 1;
        for (let b = 0; b < 3; b++) {
          const bx = gx + (b - 1) * gs * 0.4;
          ctx.beginPath(); ctx.moveTo(bx, gy);
          ctx.quadraticCurveTo(bx + (this._srand(i*3+b)-0.5)*gs, gy - gs*1.5, bx + (this._srand(i*5+b)-0.5)*gs*0.5, gy - gs*2);
          ctx.stroke();
        }
      } else {
        // Small rock
        ctx.fillStyle = isDay ? `rgba(120,115,100,${0.3+depth*0.3})` : `rgba(50,48,42,${0.2+depth*0.3})`;
        ctx.beginPath(); ctx.ellipse(gx, gy, gs * 0.8, gs * 0.4, 0, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();

    // ============ WATER PATCHES / PONDS ============
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const wx = this._srand(i * 113 + 1000) * W;
      const wDepth = 0.15 + this._srand(i * 79 + 1100) * 0.4;
      const wy = horizon + wDepth * wDepth * (H - horizon) * 0.7 + 15;
      const ww = (20 + this._srand(i * 67 + 1200) * 40) * (1 - wDepth * 0.5);
      const wh = ww * 0.25;
      // Water reflection
      const waterGrad = ctx.createRadialGradient(wx, wy, 0, wx, wy, ww);
      waterGrad.addColorStop(0, isDay ? `rgba(60,130,180,${0.35 - wDepth*0.1})` : `rgba(20,40,70,${0.3 - wDepth*0.1})`);
      waterGrad.addColorStop(0.7, isDay ? `rgba(40,100,150,${0.25 - wDepth*0.05})` : `rgba(15,30,55,${0.2})`);
      waterGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = waterGrad;
      ctx.beginPath(); ctx.ellipse(wx, wy, ww, wh, 0, 0, Math.PI*2); ctx.fill();
      // Shimmer highlights
      if (isDay) {
        const shimmer = Math.sin(Date.now() * 0.002 + i * 3) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255,255,255,${shimmer * 0.12})`;
        ctx.beginPath(); ctx.ellipse(wx - ww*0.2, wy - wh*0.2, ww*0.3, wh*0.2, 0, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();

    // ============ TREES in the distance ============
    for (let i = 0; i < 25; i++) {
      const treeAngle = (this._srand(i * 97) - 0.5) * 2.5;
      const treeDist = 15 + this._srand(i * 83) * 30;
      // Skip if behind camera
      const dotFwd = Math.cos(treeAngle);
      if (dotFwd < -0.3) continue;
      const sx = W/2 + Math.sin(treeAngle) * (W*0.35);
      const depthFactor = 1 / (treeDist * 0.12 + 1);
      const sy = horizon - 5 * depthFactor;
      const treeH = (30 + this._srand(i * 61) * 20) * depthFactor;
      const trunkW = Math.max(1, 4 * depthFactor);
      // Trunk
      ctx.fillStyle = isDay ? "#553311" : "#221108";
      ctx.fillRect(sx - trunkW/2, sy, trunkW, treeH * 0.5);
      // Canopy
      const canopyColor = isDay ? `rgba(30,${80+Math.floor(this._srand(i*41)*40)},15,0.7)` : `rgba(10,25,5,0.6)`;
      ctx.fillStyle = canopyColor;
      if (this._srand(i * 73) > 0.5) {
        // Round tree
        ctx.beginPath(); ctx.arc(sx, sy - treeH * 0.15, treeH * 0.35, 0, Math.PI*2); ctx.fill();
      } else {
        // Conifer
        ctx.beginPath(); ctx.moveTo(sx, sy - treeH * 0.5);
        ctx.lineTo(sx - treeH * 0.25, sy + treeH * 0.1);
        ctx.lineTo(sx + treeH * 0.25, sy + treeH * 0.1);
        ctx.closePath(); ctx.fill();
      }
    }

    // ============ ENEMIES (humanoid silhouettes) ============
    for (const e of w.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.pos.x - pp.x, dz = e.pos.z - pp.z, dist = Math.sqrt(dx*dx+dz*dz);
      if (dist > 40 || dist < 0.5) continue;
      const ang = Math.atan2(dx, dz) - this._yaw;
      const sx = W/2 + Math.sin(ang) * (W*0.3) / (dist*0.1+1);
      const sy = horizon + 30 / (dist*0.15+1);
      const sz = Math.max(8, 45 / (dist*0.2+1));
      const isBeast = /wolf|spider|boar|bear|dragon|troll|giant/i.test(e.defId);
      const isUndead = /skeleton|wraith|undead|spectral/i.test(e.defId);
      // Idle animation bob
      const bob = Math.sin(Date.now() * 0.003 + e.pos.x) * sz * 0.03;
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath(); ctx.ellipse(sx, sy + sz * 0.9, sz * 0.6, sz * 0.15, 0, 0, Math.PI*2); ctx.fill();
      // Color based on state and type
      const eCol = e.state === EnemyBehavior.Attack ? [200,50,40] : e.state === EnemyBehavior.Chase ? [180,130,40] : isUndead ? [100,140,120] : isBeast ? [120,90,60] : [140,110,100];
      if (isBeast) {
        // Quadruped beast silhouette
        const bodyGrad = ctx.createLinearGradient(sx, sy - sz*0.3, sx, sy + sz*0.5);
        bodyGrad.addColorStop(0, `rgb(${Math.min(255,eCol[0]+30)},${Math.min(255,eCol[1]+30)},${Math.min(255,eCol[2]+20)})`);
        bodyGrad.addColorStop(1, `rgb(${eCol[0]>>1},${eCol[1]>>1},${eCol[2]>>1})`);
        ctx.fillStyle = bodyGrad;
        // Body oval
        ctx.beginPath(); ctx.ellipse(sx, sy - sz*0.1 + bob, sz*0.7, sz*0.35, 0, 0, Math.PI*2); ctx.fill();
        // Head
        ctx.beginPath(); ctx.ellipse(sx - sz*0.55, sy - sz*0.25 + bob, sz*0.25, sz*0.2, -0.3, 0, Math.PI*2); ctx.fill();
        // Legs
        ctx.fillStyle = `rgb(${eCol[0]-20},${eCol[1]-20},${eCol[2]-15})`;
        const legAnim = Math.sin(Date.now() * 0.008 + e.pos.x) * sz * 0.08;
        ctx.fillRect(sx - sz*0.35, sy + sz*0.15, sz*0.08, sz*0.35 + legAnim);
        ctx.fillRect(sx - sz*0.15, sy + sz*0.15, sz*0.08, sz*0.35 - legAnim);
        ctx.fillRect(sx + sz*0.15, sy + sz*0.15, sz*0.08, sz*0.35 + legAnim);
        ctx.fillRect(sx + sz*0.35, sy + sz*0.15, sz*0.08, sz*0.35 - legAnim);
        // Eyes
        ctx.fillStyle = e.state === EnemyBehavior.Attack ? "#ff2200" : "#ffcc00";
        ctx.beginPath(); ctx.arc(sx - sz*0.65, sy - sz*0.3 + bob, sz*0.06, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx - sz*0.52, sy - sz*0.3 + bob, sz*0.06, 0, Math.PI*2); ctx.fill();
      } else {
        // Humanoid silhouette
        const bodyGrad = ctx.createLinearGradient(sx, sy - sz, sx, sy + sz*0.5);
        bodyGrad.addColorStop(0, `rgb(${Math.min(255,eCol[0]+40)},${Math.min(255,eCol[1]+40)},${Math.min(255,eCol[2]+30)})`);
        bodyGrad.addColorStop(1, `rgb(${eCol[0]>>1},${eCol[1]>>1},${eCol[2]>>1})`);
        ctx.fillStyle = bodyGrad;
        // Head
        ctx.beginPath(); ctx.arc(sx, sy - sz*0.65 + bob, sz*0.2, 0, Math.PI*2); ctx.fill();
        // Neck
        ctx.fillRect(sx - sz*0.06, sy - sz*0.48 + bob, sz*0.12, sz*0.1);
        // Torso (trapezoid)
        ctx.beginPath();
        ctx.moveTo(sx - sz*0.25, sy - sz*0.4 + bob);
        ctx.lineTo(sx + sz*0.25, sy - sz*0.4 + bob);
        ctx.lineTo(sx + sz*0.2, sy + sz*0.15 + bob);
        ctx.lineTo(sx - sz*0.2, sy + sz*0.15 + bob);
        ctx.closePath(); ctx.fill();
        // Arms
        const armSwing = e.state === EnemyBehavior.Attack ? Math.sin(Date.now() * 0.015) * sz * 0.15 : 0;
        ctx.fillRect(sx - sz*0.35, sy - sz*0.38 + bob, sz*0.1, sz*0.4);
        ctx.fillRect(sx + sz*0.25, sy - sz*0.38 + bob + armSwing, sz*0.1, sz*0.4);
        // Legs
        const legStep = (e.state === EnemyBehavior.Chase || e.state === EnemyBehavior.Flee) ? Math.sin(Date.now() * 0.01 + e.pos.x) * sz * 0.1 : 0;
        ctx.fillRect(sx - sz*0.15, sy + sz*0.12 + bob, sz*0.12, sz*0.45 + legStep);
        ctx.fillRect(sx + sz*0.05, sy + sz*0.12 + bob, sz*0.12, sz*0.45 - legStep);
        // Eyes
        ctx.fillStyle = isUndead ? "#44ffaa" : e.state === EnemyBehavior.Attack ? "#ff2200" : "#ffdd88";
        ctx.beginPath(); ctx.arc(sx - sz*0.08, sy - sz*0.68 + bob, sz*0.045, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + sz*0.08, sy - sz*0.68 + bob, sz*0.045, 0, Math.PI*2); ctx.fill();
        // Weapon silhouette (right hand)
        if (e.state === EnemyBehavior.Attack || e.state === EnemyBehavior.Chase) {
          ctx.strokeStyle = `rgba(${eCol[0]+60},${eCol[1]+40},${eCol[2]+20},0.7)`;
          ctx.lineWidth = Math.max(1, sz * 0.04);
          ctx.beginPath();
          ctx.moveTo(sx + sz*0.3, sy - sz*0.15 + bob + armSwing);
          ctx.lineTo(sx + sz*0.5, sy - sz*0.45 + bob + armSwing);
          ctx.stroke();
        }
      }
      // Undead glow effect
      if (isUndead) {
        ctx.shadowColor = "rgba(80,255,160,0.4)"; ctx.shadowBlur = 10;
        ctx.fillStyle = "rgba(80,255,160,0.05)";
        ctx.beginPath(); ctx.arc(sx, sy - sz*0.2 + bob, sz*0.8, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      // Health bar with border
      const barW = sz * 2, barH = 4, barY2 = sy - sz - 16;
      ctx.fillStyle = "#0008"; ctx.fillRect(sx - barW/2 - 1, barY2 - 1, barW + 2, barH + 2);
      ctx.fillStyle = "#400"; ctx.fillRect(sx - barW/2, barY2, barW, barH);
      const hpRatio = e.hp / e.maxHp;
      ctx.fillStyle = hpRatio > 0.5 ? "#2c2" : hpRatio > 0.25 ? "#cc2" : "#f33";
      ctx.fillRect(sx - barW/2, barY2, barW * hpRatio, barH);
      // Name label with shadow
      ctx.fillStyle = "#0006"; ctx.font = `${Math.max(9, 11 * (sz/15))|0}px monospace`; ctx.textAlign = "center";
      ctx.fillText(`${e.defId.replace(/_/g," ")} Lv${e.level}`, sx+1, barY2 - 3);
      ctx.fillStyle = "#ddd";
      ctx.fillText(`${e.defId.replace(/_/g," ")} Lv${e.level}`, sx, barY2 - 4);
    }

    // ============ NPCs IN WORLD ============
    for (const n of w.npcs) {
      const ndx = n.pos.x - pp.x, ndz = n.pos.z - pp.z, ndist = Math.sqrt(ndx*ndx+ndz*ndz);
      if (ndist > 35 || ndist < 0.5) continue;
      const nang = Math.atan2(ndx, ndz) - this._yaw;
      const nsx = W/2 + Math.sin(nang) * (W*0.3) / (ndist*0.1+1);
      const nsy = horizon + 30 / (ndist*0.15+1);
      const nsz = Math.max(6, 35 / (ndist*0.2+1));
      const nbob = Math.sin(Date.now() * 0.002 + n.pos.x * 3) * nsz * 0.02;
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath(); ctx.ellipse(nsx, nsy + nsz * 0.85, nsz * 0.4, nsz * 0.12, 0, 0, Math.PI*2); ctx.fill();
      // Determine NPC color by role
      const npcColors: Record<string, [number,number,number]> = {
        merchant: [140,120,80], guard: [100,100,120], innkeeper: [130,100,70],
        villager: [110,100,90], noble: [120,90,140], priest: [180,170,150],
      };
      const nc = npcColors[n.role] ?? [110,100,90];
      const nGrad = ctx.createLinearGradient(nsx, nsy - nsz, nsx, nsy + nsz*0.3);
      nGrad.addColorStop(0, `rgb(${nc[0]+30},${nc[1]+30},${nc[2]+20})`);
      nGrad.addColorStop(1, `rgb(${nc[0]-20},${nc[1]-20},${nc[2]-15})`);
      ctx.fillStyle = nGrad;
      // Head
      ctx.beginPath(); ctx.arc(nsx, nsy - nsz*0.6 + nbob, nsz*0.17, 0, Math.PI*2); ctx.fill();
      // Torso
      ctx.beginPath();
      ctx.moveTo(nsx - nsz*0.2, nsy - nsz*0.35 + nbob);
      ctx.lineTo(nsx + nsz*0.2, nsy - nsz*0.35 + nbob);
      ctx.lineTo(nsx + nsz*0.17, nsy + nsz*0.1 + nbob);
      ctx.lineTo(nsx - nsz*0.17, nsy + nsz*0.1 + nbob);
      ctx.closePath(); ctx.fill();
      // Legs
      ctx.fillRect(nsx - nsz*0.12, nsy + nsz*0.08 + nbob, nsz*0.1, nsz*0.4);
      ctx.fillRect(nsx + nsz*0.02, nsy + nsz*0.08 + nbob, nsz*0.1, nsz*0.4);
      // Friendly marker (green diamond above head)
      ctx.fillStyle = "#33dd55";
      ctx.save(); ctx.translate(nsx, nsy - nsz*0.85 + nbob); ctx.rotate(Math.PI/4);
      ctx.fillRect(-3, -3, 6, 6); ctx.restore();
      // Name
      if (ndist < 12) {
        ctx.fillStyle = "#33dd55"; ctx.font = `${Math.max(8, 10*(nsz/12))|0}px serif`; ctx.textAlign = "center";
        ctx.fillText(n.name, nsx, nsy - nsz*0.95 + nbob);
      }
    }

    // ============ ATMOSPHERIC PARTICLES ============
    ctx.save();
    const particleTime = Date.now() * 0.001;
    if (nightAlpha > 0.1) {
      // Fireflies at night
      for (let i = 0; i < 15; i++) {
        const fx = (this._srand(i*37+500) * W * 0.6) + W * 0.2 + Math.sin(particleTime * 0.5 + i) * 20;
        const fy = horizon + 20 + this._srand(i*41+600) * (H - horizon - 40) + Math.sin(particleTime * 0.7 + i*2) * 10;
        const brightness = 0.3 + 0.7 * Math.abs(Math.sin(particleTime * 2 + i * 1.5));
        ctx.fillStyle = `rgba(180,255,60,${brightness * nightAlpha})`;
        ctx.shadowColor = "rgba(180,255,60,0.8)"; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
    if (isDay && Math.sin(pp.x * 0.05) > 0.3) {
      // Dust motes in sunlight
      for (let i = 0; i < 10; i++) {
        const dx = (this._srand(i*53+700) * W * 0.4) + W * 0.3 + Math.sin(particleTime * 0.3 + i) * 15;
        const dy = horizon * 0.3 + this._srand(i*59+800) * horizon * 0.5 + Math.sin(particleTime * 0.4 + i*1.3) * 8;
        ctx.fillStyle = `rgba(255,240,200,${0.15 + 0.1 * Math.sin(particleTime + i)})`;
        ctx.beginPath(); ctx.arc(dx, dy, 1.5, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();

    // ============ CROSSHAIR (improved) ============
    const cx = W/2, cy = H/2;
    ctx.strokeStyle = this._interactId ? "rgba(201,168,76,0.9)" : "rgba(255,255,255,0.6)";
    ctx.lineWidth = this._interactId ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(cx-12, cy); ctx.lineTo(cx-4, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+4, cy); ctx.lineTo(cx+12, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy-12); ctx.lineTo(cx, cy-4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy+4); ctx.lineTo(cx, cy+12); ctx.stroke();
    if (this._interactId) {
      ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2); ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI*2); ctx.fill();
    }

    // ============ WEATHER EFFECTS ============
    const weather = w.weather;
    if (weather === "rain" || weather === "storm") {
      // Initialize rain drops if needed
      while (this._rainDrops.length < (weather === "storm" ? 250 : 120)) {
        this._rainDrops.push({ x: Math.random() * W, y: Math.random() * H, speed: 600 + Math.random() * 400, len: 8 + Math.random() * 12 });
      }
      this._rainDrops.length = weather === "storm" ? 250 : 120;
      ctx.save();
      const rainAlpha = weather === "storm" ? 0.4 : 0.25;
      ctx.strokeStyle = `rgba(180,200,230,${rainAlpha})`;
      ctx.lineWidth = 1;
      for (const drop of this._rainDrops) {
        drop.y += drop.speed * this.DT;
        drop.x -= 30 * this.DT; // wind drift
        if (drop.y > H) { drop.y = -drop.len; drop.x = Math.random() * W; }
        if (drop.x < 0) drop.x = W;
        ctx.beginPath(); ctx.moveTo(drop.x, drop.y); ctx.lineTo(drop.x - 2, drop.y + drop.len); ctx.stroke();
      }
      // Puddle splashes at bottom
      ctx.fillStyle = `rgba(180,210,240,${rainAlpha * 0.3})`;
      for (let i = 0; i < 15; i++) {
        const splashX = (this._srand(i * 31 + Date.now() * 0.001 | 0) * W);
        const splashY = horizon + (H - horizon) * 0.3 + this._srand(i * 47) * (H - horizon) * 0.5;
        const splashR = 2 + this._srand(i * 23) * 4;
        ctx.beginPath(); ctx.ellipse(splashX, splashY, splashR, splashR * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // Dark overlay for storms
      if (weather === "storm") {
        ctx.fillStyle = "rgba(20,20,40,0.15)"; ctx.fillRect(0, 0, W, H);
        // Lightning flash
        if (Math.random() < 0.002) {
          ctx.fillStyle = "rgba(220,230,255,0.3)"; ctx.fillRect(0, 0, W, H);
        }
      }
    } else if (weather === "snow") {
      while (this._snowFlakes.length < 150) {
        this._snowFlakes.push({ x: Math.random() * W, y: Math.random() * H, speed: 30 + Math.random() * 50, drift: (Math.random() - 0.5) * 40, size: 1.5 + Math.random() * 3 });
      }
      this._snowFlakes.length = 150;
      ctx.save();
      ctx.fillStyle = "rgba(240,245,255,0.7)";
      for (const flake of this._snowFlakes) {
        flake.y += flake.speed * this.DT;
        flake.x += flake.drift * this.DT + Math.sin(Date.now() * 0.001 + flake.x * 0.01) * 0.5;
        if (flake.y > H) { flake.y = -5; flake.x = Math.random() * W; }
        if (flake.x < 0) flake.x = W; if (flake.x > W) flake.x = 0;
        ctx.globalAlpha = 0.4 + 0.6 * (flake.y / H);
        ctx.beginPath(); ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Light snow ground accumulation
      ctx.fillStyle = "rgba(230,235,240,0.08)";
      ctx.fillRect(0, horizon, W, H - horizon);
      ctx.restore();
    } else if (weather === "fog") {
      // Dense fog layers
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const fogY = horizon - 20 + i * (H - horizon + 20) * 0.22;
        const fogGrad = ctx.createLinearGradient(0, fogY - 30, 0, fogY + 50);
        fogGrad.addColorStop(0, "rgba(180,190,200,0)");
        fogGrad.addColorStop(0.5, `rgba(180,190,200,${0.12 + i * 0.04})`);
        fogGrad.addColorStop(1, "rgba(180,190,200,0)");
        ctx.fillStyle = fogGrad; ctx.fillRect(0, fogY - 30, W, 80);
      }
      // Overall fog tint
      ctx.fillStyle = "rgba(180,190,200,0.2)"; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    } else if (weather === "overcast") {
      ctx.fillStyle = "rgba(60,65,80,0.08)"; ctx.fillRect(0, 0, W, H);
    }

    // ============ LIGHT SHAFTS (daytime clear/overcast) ============
    if (isDay && (weather === "clear" || weather === "overcast")) {
      const sunProgress = (t - 6) / 14;
      const shaftAlpha = Math.min(0.06, Math.sin(sunProgress * Math.PI) * 0.08);
      if (shaftAlpha > 0.01) {
        const shaftX = W * 0.15 + sunProgress * W * 0.7;
        ctx.save();
        ctx.globalAlpha = shaftAlpha;
        const shaftGrad = ctx.createLinearGradient(shaftX, 0, shaftX + W * 0.1, H);
        shaftGrad.addColorStop(0, "rgba(255,240,180,0.8)");
        shaftGrad.addColorStop(0.5, "rgba(255,220,150,0.3)");
        shaftGrad.addColorStop(1, "rgba(255,200,100,0)");
        ctx.fillStyle = shaftGrad;
        ctx.beginPath();
        ctx.moveTo(shaftX - 15, 0);
        ctx.lineTo(shaftX + 25, 0);
        ctx.lineTo(shaftX + W * 0.15, H);
        ctx.lineTo(shaftX - W * 0.05, H);
        ctx.closePath(); ctx.fill();
        // Second shaft
        ctx.beginPath();
        ctx.moveTo(shaftX + 60, 0);
        ctx.lineTo(shaftX + 90, 0);
        ctx.lineTo(shaftX + W * 0.2, H);
        ctx.lineTo(shaftX + W * 0.08, H);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }

    // ============ AMBIENT WILDLIFE (birds, butterflies) ============
    if (isDay && weather !== "storm" && weather !== "rain") {
      ctx.save();
      const birdTime = Date.now() * 0.001;
      // Birds circling in the sky
      for (let i = 0; i < 5; i++) {
        const bx = W * 0.2 + this._srand(i * 97 + 400) * W * 0.6 + Math.sin(birdTime * 0.3 + i * 2) * 40;
        const by = horizon * 0.15 + this._srand(i * 71 + 500) * horizon * 0.3 + Math.sin(birdTime * 0.5 + i * 3) * 15;
        const wingSpan = 4 + this._srand(i * 53) * 3;
        const wingFlap = Math.sin(birdTime * 6 + i * 4) * wingSpan * 0.5;
        ctx.strokeStyle = `rgba(30,30,30,${0.3 + this._srand(i*11)*0.2})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx - wingSpan, by + wingFlap);
        ctx.quadraticCurveTo(bx - wingSpan * 0.3, by - wingFlap * 0.5, bx, by);
        ctx.quadraticCurveTo(bx + wingSpan * 0.3, by - wingFlap * 0.5, bx + wingSpan, by + wingFlap);
        ctx.stroke();
      }
      // Butterflies near ground (spring/warm regions)
      if (w.currentRegion === "camelot" || w.currentRegion === "avalon") {
        for (let i = 0; i < 3; i++) {
          const bfx = W * 0.3 + this._srand(i * 83 + 900) * W * 0.4 + Math.sin(birdTime * 1.5 + i * 5) * 25;
          const bfy = horizon + 30 + this._srand(i * 61 + 950) * 80 + Math.sin(birdTime * 2 + i * 3) * 12;
          const wingF = Math.abs(Math.sin(birdTime * 8 + i * 6));
          const bfColors = ["rgba(255,180,60,0.5)", "rgba(120,180,255,0.5)", "rgba(255,100,150,0.5)"];
          ctx.fillStyle = bfColors[i % 3];
          ctx.beginPath(); ctx.ellipse(bfx - 3, bfy, 3 * wingF, 2, -0.3, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(bfx + 3, bfy, 3 * wingF, 2, 0.3, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = "rgba(60,40,20,0.5)";
          ctx.fillRect(bfx - 0.5, bfy - 2, 1, 4);
        }
      }
      ctx.restore();
    }

    // ============ VIGNETTE OVERLAY ============
    const vigGrad = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.7);
    vigGrad.addColorStop(0, "rgba(0,0,0,0)");
    vigGrad.addColorStop(1, `rgba(0,0,0,${isDay ? 0.25 : 0.45})`);
    ctx.fillStyle = vigGrad; ctx.fillRect(0, 0, W, H);

    // ============ FLOATING DAMAGE NUMBERS ============
    for (const fd of this._floatingDmg) {
      const alpha = Math.min(1, fd.t / 0.3);
      const fontSize = fd.crit ? 22 : 16;
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = "center";
      // Outline
      ctx.fillStyle = `rgba(0,0,0,${alpha * 0.6})`;
      ctx.fillText(fd.text, fd.x + 1, fd.y + 1);
      // Main text
      ctx.fillStyle = fd.color.startsWith("rgba") ? fd.color : fd.color;
      ctx.globalAlpha = alpha;
      if (fd.crit) { ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 8; }
      ctx.fillText(fd.text, fd.x, fd.y);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // ============ FIRST-PERSON WEAPON VIEW ============
    this._drawWeapon(ctx, W, H);

    // ============ HIT FLASH (red overlay when damaged) ============
    if (this._hitFlashTimer > 0) {
      const flashAlpha = this._hitFlashTimer / 0.3 * 0.3;
      const flashGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.5);
      flashGrad.addColorStop(0, "rgba(180,0,0,0)");
      flashGrad.addColorStop(0.5, `rgba(180,0,0,${flashAlpha * 0.3})`);
      flashGrad.addColorStop(1, `rgba(180,0,0,${flashAlpha})`);
      ctx.fillStyle = flashGrad; ctx.fillRect(0, 0, W, H);
    }

    // Close screen shake ctx.save()
    ctx.restore();

    // ============ HUD: BARS (Skyrim-style, bottom center) ============
    const barCenterX = W / 2;
    const barY0 = H - 70;
    // HP bar
    this._fancyBar(ctx, barCenterX - 150, barY0, 300, 16, c.hp, c.maxHp, "#b22222", "#3a0808", `HP: ${Math.ceil(c.hp)} / ${c.maxHp}`);
    // Mana bar
    this._fancyBar(ctx, barCenterX - 125, barY0 + 22, 250, 12, c.mp, c.maxMp, "#2266aa", "#081830", `MP: ${Math.ceil(c.mp)}`);
    // Stamina bar
    this._fancyBar(ctx, barCenterX - 125, barY0 + 38, 250, 12, c.stamina, c.maxStamina, "#3a7d44", "#0a2010", `STA: ${Math.ceil(c.stamina)}`);

    // Level / XP / Gold (below bars)
    ctx.fillStyle = "#c9a84c"; ctx.font = "bold 13px 'Palatino Linotype', serif"; ctx.textAlign = "center";
    ctx.fillText(`Level ${c.level}`, barCenterX, barY0 + 58);
    // XP progress mini-bar
    const xpW = 140, xpH = 4, xpX = barCenterX - xpW/2, xpY = barY0 + 62;
    ctx.fillStyle = "#1a1408"; ctx.fillRect(xpX, xpY, xpW, xpH);
    const xpRatio = c.xpToNext > 0 ? c.xp / c.xpToNext : 0;
    ctx.fillStyle = "#c9a84c"; ctx.fillRect(xpX, xpY, xpW * Math.min(1, xpRatio), xpH);
    ctx.fillStyle = "#aaa"; ctx.font = "10px monospace"; ctx.textAlign = "center";
    ctx.fillText(`${c.xp} / ${c.xpToNext} XP`, barCenterX, xpY + 12);
    // Gold
    ctx.fillStyle = "#c9a84c"; ctx.font = "13px serif"; ctx.textAlign = "left";
    ctx.fillText(`Gold: ${p.gold}`, 20, H - 20);

    // ============ REGION / TIME (top left, styled) ============
    const hr = Math.floor(this._state.worldTime), mn = Math.floor((this._state.worldTime%1)*60);
    const regionName = REGIONS[w.currentRegion]?.name ?? w.currentRegion;
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(8, 6, 240, 32);
    ctx.strokeStyle = "rgba(201,168,76,0.3)"; ctx.lineWidth = 1; ctx.strokeRect(8, 6, 240, 32);
    ctx.fillStyle = "#c9a84c"; ctx.font = "bold 14px 'Palatino Linotype', serif"; ctx.textAlign = "left";
    ctx.fillText(regionName, 16, 26);
    ctx.fillStyle = "#bbb"; ctx.font = "12px monospace"; ctx.textAlign = "right";
    ctx.fillText(`Day ${w.dayCount}  ${String(hr).padStart(2,"0")}:${String(mn).padStart(2,"0")}`, 240, 26);
    // Weather indicator below region/time
    if (w.weather !== "clear") {
      const weatherLabels: Record<string, string> = { rain: "Rain", storm: "Storm", snow: "Snow", fog: "Fog", overcast: "Overcast" };
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(8, 40, 240, 20);
      ctx.strokeStyle = "rgba(201,168,76,0.2)"; ctx.lineWidth = 1; ctx.strokeRect(8, 40, 240, 20);
      ctx.fillStyle = "#8a9ab0"; ctx.font = "11px 'Palatino Linotype', serif"; ctx.textAlign = "left";
      ctx.fillText(`Weather: ${weatherLabels[w.weather] ?? w.weather}`, 16, 55);
    }

    // ============ COMPASS (top center, improved) ============
    const compY = 28, compR = 22;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath(); ctx.arc(W/2, compY, compR + 4, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "rgba(201,168,76,0.5)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(W/2, compY, compR, 0, Math.PI*2); ctx.stroke();
    // Tick marks
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * Math.PI / 180) - this._yaw - Math.PI/2;
      const inner = deg % 90 === 0 ? compR - 7 : compR - 4;
      ctx.strokeStyle = deg % 90 === 0 ? "rgba(201,168,76,0.8)" : "rgba(201,168,76,0.3)";
      ctx.lineWidth = deg % 90 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(W/2 + Math.cos(rad)*inner, compY + Math.sin(rad)*inner);
      ctx.lineTo(W/2 + Math.cos(rad)*(compR-1), compY + Math.sin(rad)*(compR-1));
      ctx.stroke();
    }
    for (const [l, a] of [["N",0],["E",Math.PI/2],["S",Math.PI],["W",-Math.PI/2]] as [string,number][]) {
      const ra = a - this._yaw;
      const lx = W/2 + Math.sin(ra)*(compR-12), ly = compY+4 - Math.cos(ra)*(compR-12);
      ctx.fillStyle = l === "N" ? "#c9a84c" : "#888"; ctx.font = l === "N" ? "bold 11px serif" : "9px monospace"; ctx.textAlign = "center";
      ctx.fillText(l, lx, ly);
    }

    // ============ MINIMAP (top right) ============
    this._rMinimap(ctx, W, H, pp);

    // ============ DUNGEON ENTRANCE MARKERS ============
    for (const de of w.dungeonEntrances) {
      if (de.regionId !== w.currentRegion) continue;
      const ddx = de.worldPos.x - pp.x, ddz = de.worldPos.z - pp.z, ddist = Math.sqrt(ddx*ddx+ddz*ddz);
      if (ddist > 40 || ddist < 0.5) continue;
      const dang = Math.atan2(ddx, ddz) - this._yaw;
      const dsx = W/2 + Math.sin(dang) * (W*0.3) / (ddist*0.1+1);
      const dsy = horizon + 30 / (ddist*0.15+1);
      const dsz = Math.max(8, 35 / (ddist*0.2+1));
      // Stone archway
      ctx.fillStyle = "#555"; ctx.fillRect(dsx - dsz*0.5, dsy - dsz*0.8, dsz*0.15, dsz*0.8);
      ctx.fillRect(dsx + dsz*0.35, dsy - dsz*0.8, dsz*0.15, dsz*0.8);
      ctx.fillStyle = "#666"; ctx.beginPath(); ctx.arc(dsx, dsy - dsz*0.65, dsz*0.42, Math.PI, 0); ctx.fill();
      // Dark entrance
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(dsx, dsy - dsz*0.4, dsz*0.28, Math.PI, 0); ctx.fill();
      ctx.fillRect(dsx - dsz*0.28, dsy - dsz*0.4, dsz*0.56, dsz*0.4);
      // Label
      ctx.fillStyle = "#c9a84c"; ctx.font = `${Math.max(8, 10 * (dsz/15))|0}px serif`; ctx.textAlign = "center";
      ctx.fillText(de.dungeonName, dsx, dsy - dsz*0.9 - 4);
    }

    // ============ INTERACTION PROMPT ============
    if (this._interactId) {
      const isDungeonEntrance = this._interactId.startsWith("dungeon_entrance_");
      const promptLabel = isDungeonEntrance ? "[E] Enter Dungeon" : "[E] Interact";
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      const promptW = isDungeonEntrance ? 180 : 140, promptH = 28;
      ctx.fillRect(W/2 - promptW/2, H*0.65 - promptH/2, promptW, promptH);
      ctx.strokeStyle = "rgba(201,168,76,0.6)"; ctx.lineWidth = 1;
      ctx.strokeRect(W/2 - promptW/2, H*0.65 - promptH/2, promptW, promptH);
      ctx.fillStyle = "#c9a84c"; ctx.font = "bold 16px 'Palatino Linotype', serif"; ctx.textAlign = "center";
      ctx.fillText(promptLabel, W/2, H*0.65 + 5);
    }

    // ============ COMBO ============
    if (p.combat.inCombat && p.combat.comboCount > 1) {
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(W/2-50, H*0.13, 100, 28);
      ctx.fillStyle = "#ffdd44"; ctx.font = "bold 20px monospace"; ctx.textAlign = "center";
      ctx.shadowColor = "rgba(255,220,0,0.6)"; ctx.shadowBlur = 8;
      ctx.fillText(`Combo x${p.combat.comboCount}`, W/2, H*0.15 + 14);
      ctx.shadowBlur = 0;
    }

    // ============ NOTIFICATIONS ============
    ctx.textAlign = "center";
    for (let i = 0; i < this._notifs.length; i++) {
      const alpha = Math.min(1, this._notifs[i].t);
      ctx.fillStyle = `rgba(0,0,0,${alpha*0.3})`;
      const nw = ctx.measureText(this._notifs[i].text).width + 20;
      ctx.fillRect(W/2 - nw/2, H*0.38 + i*24 - 12, nw, 20);
      ctx.fillStyle = `rgba(201,168,76,${alpha})`; ctx.font = "15px 'Palatino Linotype', serif";
      ctx.fillText(this._notifs[i].text, W/2, H*0.38 + i*24 + 2);
    }

    // ============ CONTROLS HINT (subtle) ============
    ctx.fillStyle = "rgba(180,170,150,0.25)"; ctx.font = "10px monospace"; ctx.textAlign = "left";
    ctx.fillText("Esc: Menu  |  WASD: Move  |  LMB: Attack  |  RMB: Block  |  Tab: Inventory  |  M: Map  |  K: Crafting", 12, H - 4);
  }

  // ---- Fancy bar with gradient and border ----
  private _fancyBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, v: number, mx: number, fg: string, bg: string, lbl: string): void {
    // Background with rounded corners
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    const r = h / 2;
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.arcTo(x+w, y+h, x+w-r, y+h, r); ctx.lineTo(x+r, y+h);
    ctx.arcTo(x, y+h, x, y+r, r); ctx.arcTo(x, y, x+r, y, r); ctx.closePath(); ctx.fill();
    // Inner bg
    ctx.fillStyle = bg;
    ctx.fillRect(x+2, y+2, w-4, h-4);
    // Fill with gradient
    const ratio = Math.max(0, Math.min(1, v/mx));
    if (ratio > 0) {
      const fillGrad = ctx.createLinearGradient(x, y, x, y+h);
      fillGrad.addColorStop(0, fg);
      // Parse fg hex to lighten
      const fgN = parseInt(fg.replace('#',''), 16);
      const fr = Math.min(255, ((fgN >> 16) & 0xff) + 40);
      const fgg = Math.min(255, ((fgN >> 8) & 0xff) + 30);
      const fb = Math.min(255, (fgN & 0xff) + 20);
      fillGrad.addColorStop(0.5, `rgb(${fr},${fgg},${fb})`);
      fillGrad.addColorStop(1, fg);
      ctx.fillStyle = fillGrad;
      ctx.fillRect(x+2, y+2, (w-4)*ratio, h-4);
    }
    // Shine highlight
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x+2, y+2, (w-4)*ratio, (h-4)/2);
    // Border
    ctx.strokeStyle = "rgba(201,168,76,0.4)"; ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    // Label
    ctx.fillStyle = "#eee"; ctx.font = `${Math.min(h-3,11)}px monospace`; ctx.textAlign = "center";
    ctx.fillText(lbl, x + w/2, y + h - 3);
  }

  // ---- Minimap rendering (top right corner) ----
  private _rMinimap(ctx: CanvasRenderingContext2D, W: number, _H: number, pp: { x: number; y: number; z: number }): void {
    const mmSize = 150, mmR = mmSize / 2;
    const mmX = W - mmSize - 15, mmY = 15;
    const mmCX = mmX + mmR, mmCY = mmY + mmR;
    const mmScale = 2.5; // pixels per world unit

    ctx.save();
    // Clip to circle
    ctx.beginPath(); ctx.arc(mmCX, mmCY, mmR, 0, Math.PI*2); ctx.clip();

    // Background
    ctx.fillStyle = "rgba(20,30,15,0.85)";
    ctx.fillRect(mmX, mmY, mmSize, mmSize);

    // Terrain rendering
    const step = 6;
    for (let py = 0; py < mmSize; py += step) {
      for (let px = 0; px < mmSize; px += step) {
        const lx = (px - mmR) / mmScale;
        const lz = (py - mmR) / mmScale;
        const cosY = Math.cos(-this._yaw), sinY = Math.sin(-this._yaw);
        const wx = pp.x + lx * cosY - lz * sinY;
        const wz = pp.z + lx * sinY + lz * cosY;
        const h = this._terrH(wx, wz);
        let r: number, g: number, b: number;
        if (h < 2) { r = 35; g = 70; b = 140; }
        else if (h < 4) { r = 170; g = 155; b = 110; }
        else if (h < 6) { r = 50; g = 105; b = 35; }
        else if (h < 14) { const tt = (h-6)/8; r = 50+tt*70|0; g = 105-tt*45|0; b = 35+tt*45|0; }
        else { const tt = Math.min((h-14)/6,1); r = 120+tt*90|0; g = 115+tt*90|0; b = 110+tt*100|0; }
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(mmX + px, mmY + py, step, step);
      }
    }

    // Edge darkening
    const edgeGrad = ctx.createRadialGradient(mmCX, mmCY, mmR*0.6, mmCX, mmCY, mmR);
    edgeGrad.addColorStop(0, "rgba(0,0,0,0)");
    edgeGrad.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = edgeGrad; ctx.fillRect(mmX, mmY, mmSize, mmSize);

    // Enemies (red dots)
    if (this._state) {
      ctx.fillStyle = "#ff3333";
      ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 3;
      for (const e of this._state.world.enemies) {
        if (e.hp <= 0) continue;
        const dx = (e.pos.x - pp.x) * mmScale;
        const dz = (e.pos.z - pp.z) * mmScale;
        const cosY = Math.cos(-this._yaw), sinY = Math.sin(-this._yaw);
        const ex = dx * cosY - (-dz) * sinY;
        const ey = dx * sinY + (-dz) * cosY;
        if (ex*ex + ey*ey > mmR*mmR) continue;
        ctx.beginPath(); ctx.arc(mmCX + ex, mmCY + ey, 2.5, 0, Math.PI*2); ctx.fill();
      }
      // NPCs (green dots)
      ctx.fillStyle = "#33dd55"; ctx.shadowColor = "#00ff00";
      for (const n of this._state.world.npcs) {
        const dx = (n.pos.x - pp.x) * mmScale;
        const dz = (n.pos.z - pp.z) * mmScale;
        const cosY = Math.cos(-this._yaw), sinY = Math.sin(-this._yaw);
        const nx = dx * cosY - (-dz) * sinY;
        const ny = dx * sinY + (-dz) * cosY;
        if (nx*nx + ny*ny > mmR*mmR) continue;
        ctx.beginPath(); ctx.arc(mmCX + nx, mmCY + ny, 3, 0, Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur = 0;
      // Interactables (yellow squares)
      ctx.fillStyle = "#c9a84c";
      for (const o of this._state.world.interactables) {
        const dx = (o.pos.x - pp.x) * mmScale;
        const dz = (o.pos.z - pp.z) * mmScale;
        const cosY = Math.cos(-this._yaw), sinY = Math.sin(-this._yaw);
        const ox = dx * cosY - (-dz) * sinY;
        const oy = dx * sinY + (-dz) * cosY;
        if (ox*ox + oy*oy > mmR*mmR) continue;
        ctx.save(); ctx.translate(mmCX + ox, mmCY + oy); ctx.rotate(Math.PI/4);
        ctx.fillRect(-2.5, -2.5, 5, 5); ctx.restore();
      }
    }

    ctx.restore(); // unclip

    // Compass ring
    ctx.strokeStyle = "rgba(201,168,76,0.6)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mmCX, mmCY, mmR, 0, Math.PI*2); ctx.stroke();
    // Tick marks
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * Math.PI / 180) - this._yaw - Math.PI/2;
      const inner = deg % 90 === 0 ? mmR - 6 : mmR - 3;
      ctx.strokeStyle = deg % 90 === 0 ? "rgba(201,168,76,0.7)" : "rgba(201,168,76,0.3)";
      ctx.lineWidth = deg % 90 === 0 ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(mmCX + Math.cos(rad)*inner, mmCY + Math.sin(rad)*inner);
      ctx.lineTo(mmCX + Math.cos(rad)*(mmR-1), mmCY + Math.sin(rad)*(mmR-1));
      ctx.stroke();
    }

    // Cardinal labels
    for (const [l, a] of [["N",0],["E",Math.PI/2],["S",Math.PI],["W",-Math.PI/2]] as [string,number][]) {
      const ra = a - this._yaw;
      const lx = mmCX + Math.sin(ra) * (mmR + 9);
      const ly = mmCY - Math.cos(ra) * (mmR + 9) + 4;
      ctx.fillStyle = l === "N" ? "#c9a84c" : "rgba(200,190,170,0.6)";
      ctx.font = l === "N" ? "bold 11px serif" : "9px monospace"; ctx.textAlign = "center";
      ctx.fillText(l, lx, ly);
    }

    // Player arrow (center, always pointing up)
    ctx.fillStyle = "#ffffff"; ctx.shadowColor = "#ffffff"; ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(mmCX, mmCY - 6);
    ctx.lineTo(mmCX - 4, mmCY + 4);
    ctx.lineTo(mmCX, mmCY + 1);
    ctx.lineTo(mmCX + 4, mmCY + 4);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ---- Help / Controls Menu ----
  private _rHelp(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // Dimmed background
    ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(0, 0, W, H);

    // Menu panel
    const panelW = 520, panelH = 520;
    const panelX = (W - panelW) / 2, panelY = (H - panelH) / 2;
    ctx.fillStyle = "rgba(20,16,10,0.95)";
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = "#c9a84c"; ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    // Inner border
    ctx.strokeStyle = "rgba(201,168,76,0.3)"; ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12);

    // Title
    ctx.fillStyle = "#c9a84c"; ctx.font = "bold 28px 'Georgia', serif"; ctx.textAlign = "center";
    ctx.fillText("GAME MENU", W/2, panelY + 40);
    // Divider
    ctx.strokeStyle = "rgba(201,168,76,0.4)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(panelX + 30, panelY + 55); ctx.lineTo(panelX + panelW - 30, panelY + 55); ctx.stroke();

    // Menu buttons
    const buttons = ["Resume Game", "Save & Resume", "Exit to Desktop"];
    for (let i = 0; i < buttons.length; i++) {
      const sel = i === this._helpSel;
      const bx = panelX + 60, by = panelY + 70 + i * 40, bw = panelW - 120, bh = 32;
      ctx.fillStyle = sel ? "rgba(201,168,76,0.2)" : "rgba(0,0,0,0.2)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = sel ? "#c9a84c" : "rgba(201,168,76,0.15)"; ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = sel ? "#c9a84c" : "#888"; ctx.font = sel ? "bold 16px 'Georgia', serif" : "16px 'Georgia', serif";
      ctx.textAlign = "center"; ctx.fillText(buttons[i], W/2, by + 22);
      if (sel) { ctx.fillText("\u25B6", bx + 16, by + 22); }
    }

    // Controls section
    const ctrlY = panelY + 210;
    ctx.fillStyle = "#c9a84c"; ctx.font = "bold 18px 'Georgia', serif"; ctx.textAlign = "center";
    ctx.fillText("CONTROLS", W/2, ctrlY);
    ctx.strokeStyle = "rgba(201,168,76,0.3)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(panelX + 60, ctrlY + 8); ctx.lineTo(panelX + panelW - 60, ctrlY + 8); ctx.stroke();

    const controls = [
      ["W A S D", "Move forward / left / back / right"],
      ["Mouse", "Look around"],
      ["Left Click", "Attack"],
      ["Right Click", "Block"],
      ["Space", "Jump"],
      ["Shift", "Sprint (uses stamina)"],
      ["E", "Interact with NPCs / objects"],
      ["Tab", "Open / close Inventory"],
      ["C", "Open / close Character Sheet"],
      ["M", "Open / close Map"],
      ["K", "Open / close Crafting"],
      ["F", "Toggle first / third person camera"],
      ["F5", "Quick Save"],
      ["F9", "Quick Load"],
      ["Escape", "Open this menu"],
    ];

    ctx.font = "12px monospace"; ctx.textAlign = "left";
    for (let i = 0; i < controls.length; i++) {
      const y = ctrlY + 28 + i * 19;
      // Key label
      ctx.fillStyle = "#c9a84c";
      ctx.fillText(controls[i][0].padEnd(14), panelX + 40, y);
      // Description
      ctx.fillStyle = "#bbb";
      ctx.fillText(controls[i][1], panelX + 180, y);
    }

    // How to Play section
    const howY = ctrlY + 28 + controls.length * 19 + 12;
    ctx.fillStyle = "#c9a84c"; ctx.font = "bold 14px 'Georgia', serif"; ctx.textAlign = "center";
    ctx.fillText("HOW TO PLAY", W/2, howY);

    ctx.fillStyle = "#999"; ctx.font = "11px 'Palatino Linotype', serif"; ctx.textAlign = "center";
    const tips = [
      "Explore the world, complete quests, and find the Holy Grail.",
      "Defeat enemies to gain XP and level up. Loot gold and items.",
      "Talk to NPCs for quests and to trade at shops.",
      "Different regions have different enemy types and difficulty.",
    ];
    for (let i = 0; i < tips.length; i++) {
      ctx.fillText(tips[i], W/2, howY + 16 + i * 15);
    }

    // Footer
    ctx.fillStyle = "#555"; ctx.font = "11px monospace"; ctx.textAlign = "center";
    ctx.fillText("Arrows to navigate  |  Enter to select  |  Esc to resume", W/2, panelY + panelH - 14);
  }

  private _rInv(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (!this._state) return;
    ctx.fillStyle = "#111c"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c9a84c"; ctx.font = "bold 32px serif"; ctx.textAlign = "center"; ctx.fillText("Inventory", W/2, 50);
    const items = this._state.player.inventory.items;
    ctx.font = "16px monospace"; ctx.textAlign = "left";
    for (let i = 0; i < items.length; i++) { const it = items[i], sel = i === this._invCur; ctx.fillStyle = sel ? "#c9a84c" : "#aaa"; ctx.fillText(`${sel?"> ":"  "}${it.name} x${it.quantity}  [${it.quality}]  ${it.weight}lb`, 40, 90+i*22); }
    if (!items.length) { ctx.fillStyle = "#666"; ctx.fillText("  (empty)", 40, 90); }
    ctx.fillStyle = "#888"; ctx.font = "14px monospace"; ctx.textAlign = "left"; ctx.fillText(`Gold: ${this._state.player.gold}`, 40, H-40);
    ctx.textAlign = "center"; ctx.fillText("Tab or Esc to close", W/2, H-20);
  }

  private _rChar(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (!this._state) return;
    ctx.fillStyle = "#111c"; ctx.fillRect(0, 0, W, H);
    const p = this._state.player, c = p.combatant;
    ctx.fillStyle = "#c9a84c"; ctx.font = "bold 32px serif"; ctx.textAlign = "center"; ctx.fillText(`${c.name} - Level ${c.level}`, W/2, 50);
    const tabs = ["Attributes", "Skills", "Quests"];
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i === this._charTab ? "#c9a84c" : "#666"; ctx.font = "18px serif"; ctx.fillText(tabs[i], W*0.25+i*W*0.25, 85); }
    ctx.font = "14px monospace"; ctx.textAlign = "left"; const y0 = 120;
    if (this._charTab === 0) {
      const a = c.attributes, ks: (keyof typeof a)[] = ["strength","dexterity","constitution","intelligence","wisdom","charisma","perception"];
      for (let i = 0; i < ks.length; i++) { ctx.fillStyle = "#ccc"; ctx.fillText(`${ks[i].padEnd(14)} ${a[ks[i]]}`, 60, y0+i*22); }
      if (p.attributePointsAvailable > 0) { ctx.fillStyle = "#4c4"; ctx.fillText(`Points available: ${p.attributePointsAvailable}`, 60, y0+ks.length*22+20); }
    } else if (this._charTab === 1) {
      const e = Object.entries(p.skillEntries);
      for (let i = 0; i < e.length; i++) { ctx.fillStyle = "#ccc"; ctx.fillText(`${e[i][0].padEnd(16)} Lv ${e[i][1].level}  XP: ${e[i][1].xp}`, 60, y0+i*20); }
    } else {
      if (!p.activeQuests.length) { ctx.fillStyle = "#666"; ctx.fillText("No active quests", 60, y0); }
      for (let i = 0; i < p.activeQuests.length; i++) { ctx.fillStyle = "#ccc"; ctx.fillText(`${p.activeQuests[i].questId} - Stage ${p.activeQuests[i].stage}`, 60, y0+i*20); }
    }
    ctx.fillStyle = "#888"; ctx.font = "14px monospace"; ctx.textAlign = "center"; ctx.fillText("C or Esc to close | Left/Right tabs", W/2, H-20);
  }

  private _rMap(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (!this._state) return;
    ctx.fillStyle = "#111c"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c9a84c"; ctx.font = "bold 32px serif"; ctx.textAlign = "center"; ctx.fillText("Map of Britannia", W/2, 50);
    const pos: Record<string, [number, number]> = { camelot: [0.5,0.5], darkwood: [0.25,0.45], saxon_camp: [0.75,0.45], avalon: [0.4,0.25], mordred_fortress: [0.6,0.75], grail_temple: [0.8,0.25] };
    for (const [id, rg] of Object.entries(REGIONS)) {
      const [px, py] = pos[id] ?? [0.5, 0.5], sx = W*px, sy = 80+(H-120)*py;
      const disc = this._state.player.discoveredLocations.includes(id), cur = this._state.world.currentRegion === id;
      ctx.fillStyle = disc ? rg.color : "#333"; ctx.beginPath(); ctx.arc(sx, sy, cur ? 18 : 12, 0, Math.PI*2); ctx.fill();
      if (cur) { ctx.strokeStyle = "#c9a84c"; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.fillStyle = disc ? "#ddd" : "#555"; ctx.font = "12px serif"; ctx.textAlign = "center"; ctx.fillText(disc ? rg.name : "???", sx, sy+25);
    }
    ctx.fillStyle = "#888"; ctx.font = "14px monospace"; ctx.textAlign = "center"; ctx.fillText("M or Esc to close", W/2, H-20);
  }

  private _rDlg(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (!this._dlg) return;
    ctx.fillStyle = "#0008"; ctx.fillRect(0, 0, W, H);
    const bx = W*0.1, by = H*0.6, bw = W*0.8, bh = H*0.35;
    ctx.fillStyle = "#1a1a2aee"; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = "#c9a84c"; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = "#c9a84c"; ctx.font = "bold 20px serif"; ctx.textAlign = "left"; ctx.fillText(this._dlg.npcName, bx+20, by+30);
    ctx.fillStyle = "#ddd"; ctx.font = "16px serif"; ctx.fillText(this._dlg.lines[this._dlg.lineIdx] ?? "", bx+20, by+60);
    if (this._dlg.lineIdx >= this._dlg.lines.length - 1 && this._dlg.choices.length) {
      for (let i = 0; i < this._dlg.choices.length; i++) { const sel = i === this._dlg.choiceIdx; ctx.fillStyle = sel ? "#c9a84c" : "#888"; ctx.font = "14px serif"; ctx.fillText(`${sel?"> ":"  "}${this._dlg.choices[i].text}`, bx+40, by+100+i*24); }
    }
    ctx.fillStyle = "#666"; ctx.font = "12px monospace"; ctx.textAlign = "center"; ctx.fillText("Enter/Space continue | Up/Down choose", W/2, by+bh-10);
  }

  private _rShop(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (!this._shop || !this._state) return;
    ctx.fillStyle = "#111c"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c9a84c"; ctx.font = "bold 32px serif"; ctx.textAlign = "center"; ctx.fillText("Shop", W/2, 50);
    ctx.font = "16px monospace"; ctx.textAlign = "left";
    for (let i = 0; i < this._shop.items.length; i++) { const it = this._shop.items[i], sel = i === this._shop.selIdx; ctx.fillStyle = sel ? "#c9a84c" : "#aaa"; ctx.fillText(`${sel?"> ":"  "}${it.name}  ${it.price}g`, 60, 90+i*24); }
    ctx.fillStyle = "#ddd"; ctx.font = "14px monospace"; ctx.fillText(`Your gold: ${this._state.player.gold}`, 60, H-50);
    ctx.textAlign = "center"; ctx.fillStyle = "#888"; ctx.fillText("Enter buy | Esc close", W/2, H-20);
  }

  private _rDead(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = "#200008ee"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c33"; ctx.font = "bold 64px serif"; ctx.textAlign = "center"; ctx.fillText("YOU HAVE FALLEN", W/2, H*0.35);
    ctx.fillStyle = "#aaa"; ctx.font = "22px serif"; ctx.fillText("The quest continues...", W/2, H*0.45);
    ctx.fillStyle = "#888"; ctx.font = "18px serif"; ctx.fillText("Press Enter to respawn at Camelot", W/2, H*0.6);
  }

  // =========================================================================
  // DUNGEON SYSTEM - Procedural BSP generation, simulation, and rendering
  // =========================================================================

  private _dungeonRng(seed: number, i: number): number {
    let h = ((seed + i) * 374761393 + 668265263) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    h = (h ^ (h >> 16)) >>> 0;
    return h / 4294967296;
  }

  private _generateDungeon(entrance: DungeonEntrance): DungeonState {
    const seed = entrance.dungeonSeed;
    const TILE_SIZE = 3;
    const MAP_W = 48, MAP_H = 48;
    const tileMap: number[][] = [];
    for (let y = 0; y < MAP_H; y++) { tileMap.push(new Array(MAP_W).fill(0)); }

    interface BSPNode { x: number; y: number; w: number; h: number; left?: BSPNode; right?: BSPNode; room?: { x: number; y: number; w: number; h: number } }
    const MIN_ROOM = 5, MAX_ROOM = 10, MIN_PARTITION = 12;
    let rngIdx = 0;
    const rng = () => this._dungeonRng(seed, rngIdx++);

    const splitNode = (node: BSPNode, depth: number): void => {
      if (depth > 4 || (node.w < MIN_PARTITION * 2 && node.h < MIN_PARTITION * 2)) return;
      const splitH = node.w > node.h ? false : node.h > node.w ? true : rng() > 0.5;
      if (splitH && node.h >= MIN_PARTITION * 2) {
        const sp = Math.floor(MIN_PARTITION + rng() * (node.h - MIN_PARTITION * 2));
        node.left = { x: node.x, y: node.y, w: node.w, h: sp };
        node.right = { x: node.x, y: node.y + sp, w: node.w, h: node.h - sp };
      } else if (!splitH && node.w >= MIN_PARTITION * 2) {
        const sp = Math.floor(MIN_PARTITION + rng() * (node.w - MIN_PARTITION * 2));
        node.left = { x: node.x, y: node.y, w: sp, h: node.h };
        node.right = { x: node.x + sp, y: node.y, w: node.w - sp, h: node.h };
      } else return;
      splitNode(node.left, depth + 1);
      splitNode(node.right, depth + 1);
    };

    const root: BSPNode = { x: 1, y: 1, w: MAP_W - 2, h: MAP_H - 2 };
    splitNode(root, 0);

    const rooms: DungeonRoom[] = [];
    let rmId = 0;
    const createRooms = (node: BSPNode): void => {
      if (node.left || node.right) { if (node.left) createRooms(node.left); if (node.right) createRooms(node.right); return; }
      const rw = MIN_ROOM + Math.floor(rng() * Math.min(MAX_ROOM - MIN_ROOM, node.w - 4));
      const rh = MIN_ROOM + Math.floor(rng() * Math.min(MAX_ROOM - MIN_ROOM, node.h - 4));
      const rx = node.x + 1 + Math.floor(rng() * Math.max(0, node.w - rw - 2));
      const ry = node.y + 1 + Math.floor(rng() * Math.max(0, node.h - rh - 2));
      node.room = { x: rx, y: ry, w: rw, h: rh };
      rooms.push({ id: rmId++, x: rx, y: ry, w: rw, h: rh, centerX: rx + Math.floor(rw / 2), centerY: ry + Math.floor(rh / 2), isBossRoom: false, isEntrance: false, cleared: false });
      for (let ty = ry; ty < ry + rh; ty++) for (let tx = rx; tx < rx + rw; tx++) { if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) tileMap[ty][tx] = 1; }
    };
    createRooms(root);
    if (rooms.length > 0) rooms[0].isEntrance = true;
    if (rooms.length > 1) rooms[rooms.length - 1].isBossRoom = true;
    else if (rooms.length === 1) rooms[0].isBossRoom = true;

    const corridors: DungeonCorridor[] = [];
    const connectRooms = (node: BSPNode): void => {
      if (!node.left || !node.right) return;
      connectRooms(node.left); connectRooms(node.right);
      const findRoom = (n: BSPNode): { x: number; y: number; w: number; h: number } | null => { if (n.room) return n.room; if (n.left) { const r = findRoom(n.left); if (r) return r; } if (n.right) { const r = findRoom(n.right); if (r) return r; } return null; };
      const r1 = findRoom(node.left), r2 = findRoom(node.right);
      if (!r1 || !r2) return;
      const c1x = r1.x + Math.floor(r1.w / 2), c1y = r1.y + Math.floor(r1.h / 2);
      const c2x = r2.x + Math.floor(r2.w / 2), c2y = r2.y + Math.floor(r2.h / 2);
      const tiles: { x: number; y: number }[] = [];
      const fromIdx = rooms.findIndex(r => r.x === r1.x && r.y === r1.y && r.w === r1.w);
      const toIdx = rooms.findIndex(r => r.x === r2.x && r.y === r2.y && r.w === r2.w);
      let cx = c1x, cy = c1y;
      while (cx !== c2x) { if (cy >= 0 && cy < MAP_H && cx >= 0 && cx < MAP_W) { tileMap[cy][cx] = tileMap[cy][cx] || 1; tiles.push({ x: cx, y: cy }); } cx += cx < c2x ? 1 : -1; }
      while (cy !== c2y) { if (cy >= 0 && cy < MAP_H && cx >= 0 && cx < MAP_W) { tileMap[cy][cx] = tileMap[cy][cx] || 1; tiles.push({ x: cx, y: cy }); } cy += cy < c2y ? 1 : -1; }
      corridors.push({ fromRoom: fromIdx >= 0 ? fromIdx : 0, toRoom: toIdx >= 0 ? toIdx : 0, tiles });
    };
    connectRooms(root);

    const doors: DungeonDoor[] = [];
    for (const corr of corridors) { if (corr.tiles.length > 2) { const dt = corr.tiles[1]; if (dt && tileMap[dt.y]?.[dt.x] === 1) { doors.push({ id: `door_${doors.length}`, tileX: dt.x, tileY: dt.y, isLocked: false, isOpen: true, connectsRooms: [corr.fromRoom, corr.toRoom] }); tileMap[dt.y][dt.x] = 2; } } }

    const LOOT_TABLES: { defId: string; name: string; weight: number; quality: ItemQualityTier }[][] = [
      [{ defId: "health_potion", name: "Health Potion", weight: 0.5, quality: ItemQualityTier.Common }, { defId: "iron_dagger", name: "Iron Dagger", weight: 2, quality: ItemQualityTier.Common }, { defId: "leather_scraps", name: "Leather Scraps", weight: 1, quality: ItemQualityTier.Common }],
      [{ defId: "health_potion", name: "Health Potion", weight: 0.5, quality: ItemQualityTier.Common }, { defId: "steel_sword", name: "Steel Sword", weight: 4, quality: ItemQualityTier.Uncommon }, { defId: "chainmail_piece", name: "Chainmail Piece", weight: 5, quality: ItemQualityTier.Uncommon }, { defId: "mana_potion", name: "Mana Potion", weight: 0.5, quality: ItemQualityTier.Uncommon }],
      [{ defId: "greater_health_potion", name: "Greater Health Potion", weight: 0.5, quality: ItemQualityTier.Rare }, { defId: "enchanted_blade", name: "Enchanted Blade", weight: 4, quality: ItemQualityTier.Rare }, { defId: "plate_gauntlets", name: "Plate Gauntlets", weight: 3, quality: ItemQualityTier.Rare }, { defId: "arcane_tome", name: "Arcane Tome", weight: 1.5, quality: ItemQualityTier.Epic }],
    ];
    const lootTier = entrance.difficulty <= 3 ? 0 : entrance.difficulty <= 7 ? 1 : 2;

    const chests: DungeonChest[] = [];
    for (const room of rooms) {
      if (room.isEntrance) continue;
      const numChests = room.isBossRoom ? 2 : (rng() > 0.5 ? 1 : 0);
      for (let ci = 0; ci < numChests; ci++) {
        const chX = room.x + 1 + Math.floor(rng() * Math.max(1, room.w - 2));
        const chY = room.y + 1 + Math.floor(rng() * Math.max(1, room.h - 2));
        if (tileMap[chY]?.[chX] !== 1 && tileMap[chY]?.[chX] !== 5) continue;
        const loot: DungeonChest["loot"] = [];
        const numItems = 1 + Math.floor(rng() * 3);
        const table = LOOT_TABLES[lootTier];
        for (let li = 0; li < numItems; li++) { const item = table[Math.floor(rng() * table.length)]; loot.push({ defId: item.defId, name: item.name, quantity: 1, quality: item.quality, weight: item.weight }); }
        const gold = Math.floor(10 + rng() * entrance.difficulty * 15);
        loot.push({ defId: "gold_coins", name: `${gold} Gold`, quantity: gold, quality: ItemQualityTier.Common, weight: 0 });
        chests.push({ id: `chest_${chests.length}`, tileX: chX, tileY: chY, opened: false, loot });
        tileMap[chY][chX] = 3;
      }
    }

    const spawnPoints: DungeonSpawnPoint[] = [];
    const region = REGIONS[entrance.regionId];
    for (const room of rooms) {
      if (room.isEntrance) continue;
      const numEnemies = room.isBossRoom ? 1 : Math.min(3, 1 + Math.floor(rng() * (entrance.difficulty / 3)));
      for (let ei = 0; ei < numEnemies; ei++) {
        const ex = room.x + 1 + Math.floor(rng() * Math.max(1, room.w - 2));
        const ey = room.y + 1 + Math.floor(rng() * Math.max(1, room.h - 2));
        if (tileMap[ey]?.[ex] === 0) continue;
        const enemyType = room.isBossRoom ? `dungeon_boss_${entrance.regionId}` : (region ? region.enemyTypes[Math.floor(rng() * region.enemyTypes.length)] : "bandit");
        const level = room.isBossRoom ? (region ? region.maxLevel + Math.floor(entrance.difficulty * 2) : entrance.difficulty * 5) : (region ? region.minLevel + Math.floor(rng() * (region.maxLevel - region.minLevel)) : entrance.difficulty * 3);
        spawnPoints.push({ id: `spawn_${spawnPoints.length}`, tileX: ex, tileY: ey, roomId: room.id, enemyType, level, spawned: false });
      }
    }

    const entranceRoom = rooms.find(r => r.isEntrance) ?? rooms[0];
    tileMap[entranceRoom.centerY][entranceRoom.centerX] = 4;
    const bossRoom = rooms.find(r => r.isBossRoom);
    if (bossRoom) { for (let ty = bossRoom.y; ty < bossRoom.y + bossRoom.h; ty++) for (let tx = bossRoom.x; tx < bossRoom.x + bossRoom.w; tx++) { if (tileMap[ty]?.[tx] === 1) tileMap[ty][tx] = 5; } }

    return {
      active: true, seed, regionId: entrance.regionId, dungeonName: entrance.dungeonName, difficulty: entrance.difficulty,
      tileMap, rooms, corridors, chests, doors, spawnPoints, enemies: [],
      playerTileX: entranceRoom.centerX, playerTileY: entranceRoom.centerY, tileSize: TILE_SIZE,
      entranceRoomId: entranceRoom.id, bossRoomId: bossRoom?.id ?? 0, bossDefeated: false,
      returnPos: { ...this._state!.player.combatant.position }, returnRegion: this._state!.player.currentRegion,
    };
  }

  private _enterDungeon(entrance: DungeonEntrance): void {
    if (!this._state) return;
    const dungeon = this._generateDungeon(entrance);
    this._state.world.dungeon = dungeon;
    this._state.player.combatant.position = { x: dungeon.playerTileX * dungeon.tileSize, y: 0, z: dungeon.playerTileY * dungeon.tileSize };
    this._dungeonYaw = 0; this._dungeonPitch = 0;
    this._phase = ArthurianPhase.DUNGEON;
    this._notify(`Entering ${entrance.dungeonName}...`);
    this._dungeonSpawnEnemies(dungeon);
  }

  private _exitDungeon(): void {
    if (!this._state || !this._state.world.dungeon) return;
    const dg = this._state.world.dungeon;
    this._state.player.combatant.position = { ...dg.returnPos };
    this._state.player.currentRegion = dg.returnRegion;
    this._state.world.currentRegion = dg.returnRegion;
    this._state.world.dungeon = null;
    this._state.world.enemies = [];
    this._phase = ArthurianPhase.PLAYING;
    this._notify("Returned to the surface.");
  }

  private _dungeonSpawnEnemies(dg: DungeonState): void {
    for (const sp of dg.spawnPoints) {
      if (sp.spawned) continue;
      sp.spawned = true;
      const wx = sp.tileX * dg.tileSize, wz = sp.tileY * dg.tileSize;
      const hp = sp.enemyType.startsWith("dungeon_boss") ? 200 + sp.level * 25 : 30 + sp.level * 10;
      const id = `de_${sp.id}_${Date.now()}`;
      dg.enemies.push({
        id, defId: sp.enemyType, pos: { x: wx, y: 0, z: wz }, rotation: Math.random() * 6.28,
        hp, maxHp: hp, state: EnemyBehavior.Idle,
        aiState: { attackRange: 2.5, heavyAttackChance: sp.enemyType.startsWith("dungeon_boss") ? 0.4 : 0.2, blockChance: 0.15, fleeThreshold: sp.enemyType.startsWith("dungeon_boss") ? 0 : 0.15, attackDelay: sp.enemyType.startsWith("dungeon_boss") ? 1.5 : 1 + Math.random() * 0.5 },
        target: null, alertLevel: 0, patrolPath: [{ x: wx + 3, y: 0, z: wz }, { x: wx, y: 0, z: wz + 3 }], patrolIndex: 0, lootTable: "dungeon", level: sp.level, respawnTime: 9999,
        combatant: { id, name: sp.enemyType.replace(/_/g, " "), hp, maxHp: hp, mp: 0, maxMp: 0, stamina: 50, maxStamina: 50, position: { x: wx, y: 0, z: wz }, isBlocking: false, attributes: { strength: 10 + sp.level, dexterity: 8 + sp.level, constitution: 10 + sp.level, intelligence: 6, wisdom: 6, charisma: 5, perception: 8 }, skills: {}, perks: [], equipment: { mainHand: null, offHand: null, head: null, chest: null, legs: null, feet: null, ring1: null, ring2: null, amulet: null, cloak: null }, level: sp.level, xp: 0, xpToNext: 999, activeEffects: [] },
      });
    }
  }

  private _dungeonSim(dt: number): void {
    if (!this._state || !this._state.world.dungeon) return;
    const dg = this._state.world.dungeon;
    const p = this._state.player, c = p.combatant, pos = c.position;
    const ts = dg.tileSize;
    this._dungeonYaw -= this._input.mouseDX * 0.002;
    this._dungeonPitch = Math.max(-1.2, Math.min(1.2, this._dungeonPitch - this._input.mouseDY * 0.002));
    const d = calculateDerivedStats(p);
    let spd = d.moveSpeed;
    if (this._input.sprint && c.stamina > 5) { spd *= 1.4; c.stamina -= 12 * dt; if (c.stamina < 0) c.stamina = 0; }
    const sin = Math.sin(this._dungeonYaw), cos = Math.cos(this._dungeonYaw);
    let mvdx = 0, mvdz = 0;
    if (this._input.forward) { mvdx -= sin; mvdz -= cos; } if (this._input.back) { mvdx += sin; mvdz += cos; }
    if (this._input.left) { mvdx -= cos; mvdz += sin; } if (this._input.right) { mvdx += cos; mvdz -= sin; }
    const len = Math.sqrt(mvdx * mvdx + mvdz * mvdz);
    if (len > 0.001) {
      const nx = pos.x + (mvdx / len) * spd * dt, nz = pos.z + (mvdz / len) * spd * dt;
      const margin = 0.3;
      const canWalk = (wx: number, wz: number) => { const tx = Math.floor(wx / ts), ty = Math.floor(wz / ts); if (tx < 0 || ty < 0 || ty >= dg.tileMap.length || tx >= dg.tileMap[0].length) return false; return dg.tileMap[ty][tx] !== 0; };
      if (canWalk(nx - margin, nz - margin) && canWalk(nx + margin, nz - margin) && canWalk(nx - margin, nz + margin) && canWalk(nx + margin, nz + margin)) { pos.x = nx; pos.z = nz; }
      else { if (canWalk(nx - margin, pos.z - margin) && canWalk(nx + margin, pos.z - margin) && canWalk(nx - margin, pos.z + margin) && canWalk(nx + margin, pos.z + margin)) { pos.x = nx; } else if (canWalk(pos.x - margin, nz - margin) && canWalk(pos.x + margin, nz - margin) && canWalk(pos.x - margin, nz + margin) && canWalk(pos.x + margin, nz + margin)) { pos.z = nz; } }
    }
    pos.y = 0; c.isBlocking = this._input.block; p.combat.blockActive = this._input.block;
    dg.playerTileX = Math.floor(pos.x / ts); dg.playerTileY = Math.floor(pos.z / ts);

    const cb = p.combat;
    for (const k of Object.keys(cb.cooldowns)) { cb.cooldowns[k] -= dt; if (cb.cooldowns[k] <= 0) delete cb.cooldowns[k]; }
    if (cb.comboTimer > 0) { cb.comboTimer -= dt; if (cb.comboTimer <= 0) cb.comboCount = 0; }
    if (cb.staggerBuildup > 0) { cb.staggerBuildup -= 5 * dt; if (cb.staggerBuildup < 0) cb.staggerBuildup = 0; }
    if (this._input.attack && !cb.cooldowns["attack"]) this._dungeonAttack(dg);

    for (const e of dg.enemies) {
      if (e.hp <= 0) continue;
      const dist = this._d3(pos, e.pos); const ar = e.aiState.attackRange ?? 2.5;
      if (e.state === EnemyBehavior.Idle || e.state === EnemyBehavior.Patrol) {
        if (dist < 12) { e.state = EnemyBehavior.Chase; e.target = "player"; }
        else if (e.state === EnemyBehavior.Patrol && e.patrolPath.length > 0) { const t = e.patrolPath[e.patrolIndex], edx = t.x - e.pos.x, edz = t.z - e.pos.z, pd = Math.sqrt(edx*edx+edz*edz); if (pd < 1) e.patrolIndex = (e.patrolIndex + 1) % e.patrolPath.length; else { e.pos.x += (edx/pd)*2*dt; e.pos.z += (edz/pd)*2*dt; } }
      } else if (e.state === EnemyBehavior.Chase) {
        if (dist > 20) { e.state = EnemyBehavior.Idle; e.target = null; } else if (dist < ar) e.state = EnemyBehavior.Attack;
        else { const edx = pos.x - e.pos.x, edz = pos.z - e.pos.z, cd = Math.sqrt(edx*edx+edz*edz); if (cd > 0.1) { e.pos.x += (edx/cd)*3.5*dt; e.pos.z += (edz/cd)*3.5*dt; } }
      } else if (e.state === EnemyBehavior.Attack) {
        if (dist > ar * 1.5) e.state = EnemyBehavior.Chase;
        else { const key = `eatk_${e.id}`; if (!cb.cooldowns[key]) { cb.cooldowns[key] = e.aiState.attackDelay ?? 1.2; let dmg = Math.floor(5 + e.level * 2 + Math.random() * 5); if (e.defId.startsWith("dungeon_boss")) dmg = Math.floor(dmg * 1.5); if (cb.blockActive) { dmg = Math.floor(dmg * (1 - d.blockEfficiency)); this._notify(`Blocked! ${dmg} dmg`); } c.hp -= dmg; if (c.hp <= 0) { c.hp = 0; this._phase = ArthurianPhase.DEAD; this._state.world.dungeon = null; this._notify("You have fallen in the dungeon..."); } } }
        if (e.hp / e.maxHp < (e.aiState.fleeThreshold ?? 0.1)) e.state = EnemyBehavior.Flee;
      } else if (e.state === EnemyBehavior.Flee) { const fx = e.pos.x - pos.x, fz = e.pos.z - pos.z, fd = Math.sqrt(fx*fx+fz*fz); if (fd > 0.1) { e.pos.x += (fx/fd)*4*dt; e.pos.z += (fz/fd)*4*dt; } if (dist > 25) e.state = EnemyBehavior.Idle; }
    }

    c.stamina = Math.min(c.maxStamina, c.stamina + RPG_CONFIG.staminaRegenRate * (cb.inCombat ? 0.5 : 1) * dt);
    c.mp = Math.min(c.maxMp, c.mp + RPG_CONFIG.manaRegenRate * dt);
    if (cb.inCombat && !dg.enemies.some(e => e.hp > 0 && this._d3(c.position, e.pos) < 15)) cb.inCombat = false;

    this._dungeonInteractId = null; let bestDist = 4.0;
    for (const ch of dg.chests) { if (ch.opened) continue; const cd = this._d3(pos, { x: ch.tileX * ts + ts / 2, y: 0, z: ch.tileY * ts + ts / 2 }); if (cd < bestDist) { bestDist = cd; this._dungeonInteractId = ch.id; } }
    const eRoom = dg.rooms.find(r => r.isEntrance);
    if (eRoom) { const ed = this._d3(pos, { x: eRoom.centerX * ts, y: 0, z: eRoom.centerY * ts }); if (ed < bestDist) { bestDist = ed; this._dungeonInteractId = "dungeon_exit"; } }

    if (this._input.interact && this._dungeonInteractId) {
      if (this._dungeonInteractId === "dungeon_exit") { this._exitDungeon(); }
      else if (this._dungeonInteractId.startsWith("chest_")) {
        const chest = dg.chests.find(ch => ch.id === this._dungeonInteractId);
        if (chest && !chest.opened) { chest.opened = true; for (const item of chest.loot) { if (item.defId === "gold_coins") { this._state.player.gold += item.quantity; this._notify(`+${item.quantity} gold`); } else { addItem(this._state.player, item.defId, item.quantity, item.name, item.weight, item.quality); this._notify(`Found: ${item.name}`); } } }
      }
    }

    if (!dg.bossDefeated && dg.enemies.some(e => e.defId.startsWith("dungeon_boss")) && !dg.enemies.some(e => e.defId.startsWith("dungeon_boss") && e.hp > 0)) {
      dg.bossDefeated = true; this._notify("BOSS DEFEATED! The dungeon is cleared!");
      const xpReward = 100 + dg.difficulty * 50; addXP(this._state.player, xpReward); this._notify(`+${xpReward} XP`);
    }
  }

  private _dungeonAttack(dg: DungeonState): void {
    if (!this._state) return;
    const p = this._state.player, d = calculateDerivedStats(p), cb = p.combat;
    if (p.combatant.stamina < 10) return;
    p.combatant.stamina -= 10; cb.cooldowns["attack"] = 0.5; cb.comboCount++; cb.comboTimer = 2.0;
    let best: EnemyInstance | null = null, bestD = 3.0;
    for (const e of dg.enemies) { if (e.hp <= 0) continue; const dist = this._d3(p.combatant.position, e.pos); if (dist < bestD) { best = e; bestD = dist; } }
    if (best) {
      const crit = Math.random() < d.critChance;
      const dmg = Math.max(1, Math.floor(d.physicalDamage * (1 + cb.comboCount * 0.1) * (crit ? d.critMultiplier : 1)));
      best.hp -= dmg; cb.inCombat = true; cb.targetId = best.id;
      this._notify(crit ? `CRITICAL! ${dmg} damage` : `${dmg} damage`);
      if (best.hp <= 0) { best.state = EnemyBehavior.Dead; this._killEnemy(best); }
    }
  }

  private _rDungeon(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (!this._state || !this._state.world.dungeon) return;
    const dg = this._state.world.dungeon;
    const p = this._state.player, c = p.combatant, pos = c.position;
    const ts = dg.tileSize;

    ctx.fillStyle = "#1a1510"; ctx.fillRect(0, 0, W, H / 2);
    const floorGrad = ctx.createLinearGradient(0, H / 2, 0, H);
    floorGrad.addColorStop(0, "#2a2218"); floorGrad.addColorStop(1, "#1a1510");
    ctx.fillStyle = floorGrad; ctx.fillRect(0, H / 2, W, H / 2);

    const fov = Math.PI / 3, numRays = Math.min(W, 400), rayStep = fov / numRays, maxDist = 20, wallHF = H * 0.8;
    let wR: number, wG: number, wB: number;
    if (dg.regionId === "mordred_fortress") { wR = 50; wG = 30; wB = 50; }
    else if (dg.regionId === "grail_temple") { wR = 80; wG = 70; wB = 40; }
    else if (dg.regionId === "avalon") { wR = 40; wG = 60; wB = 80; }
    else if (dg.regionId === "saxon_camp") { wR = 70; wG = 55; wB = 35; }
    else if (dg.regionId === "darkwood") { wR = 35; wG = 45; wB = 30; }
    else { wR = 60; wG = 55; wB = 50; }

    for (let i = 0; i < numRays; i++) {
      const rayAngle = this._dungeonYaw - fov / 2 + i * rayStep;
      const rdx = -Math.sin(rayAngle), rdz = -Math.cos(rayAngle);
      const stp = 0.05;
      let dist = 0, hitTile = -1, hitSide = 0, rx = pos.x, rz = pos.z;
      for (let s = 0; s < maxDist; s += stp) {
        rx += rdx * stp; rz += rdz * stp;
        const tx = Math.floor(rx / ts), tz = Math.floor(rz / ts);
        if (tx < 0 || tz < 0 || tz >= dg.tileMap.length || tx >= dg.tileMap[0].length) { dist = s; hitTile = 0; break; }
        if (dg.tileMap[tz][tx] === 0) { dist = s; hitTile = 0; const prevTx = Math.floor((rx - rdx * stp) / ts); hitSide = prevTx !== tx ? 0 : 1; break; }
        dist = s;
      }
      if (hitTile !== 0) continue;
      const corrDist = dist * Math.cos(i * rayStep - fov / 2);
      const wallH = Math.min(H, wallHF / (corrDist + 0.1));
      const wallTop = (H - wallH) / 2;
      const colW = Math.ceil(W / numRays) + 1, colX = Math.floor(i * W / numRays);
      const shade = Math.max(0, 1 - corrDist / maxDist);
      const sideShade = hitSide === 0 ? 0.7 : 1.0;
      ctx.fillStyle = `rgb(${Math.floor(wR * shade * sideShade)},${Math.floor(wG * shade * sideShade)},${Math.floor(wB * shade * sideShade)})`;
      ctx.fillRect(colX, wallTop, colW, wallH);
      if (shade > 0.3) { ctx.strokeStyle = `rgba(0,0,0,${0.1 * shade})`; ctx.lineWidth = 1; const brickH = wallH / 8; for (let row = 0; row < 8; row++) { const by = wallTop + row * brickH; ctx.beginPath(); ctx.moveTo(colX, by); ctx.lineTo(colX + colW, by); ctx.stroke(); } }
    }

    type DSprite = { type: string; x: number; z: number; dist: number; data: unknown };
    const sprites: DSprite[] = [];
    for (const e of dg.enemies) { if (e.hp <= 0) continue; const dist = this._d3(pos, e.pos); if (dist < 18) sprites.push({ type: "enemy", x: e.pos.x, z: e.pos.z, dist, data: e }); }
    for (const ch of dg.chests) { if (ch.opened) continue; const cx = ch.tileX * ts + ts / 2, cz = ch.tileY * ts + ts / 2; const dist = this._d3(pos, { x: cx, y: 0, z: cz }); if (dist < 15) sprites.push({ type: "chest", x: cx, z: cz, dist, data: ch }); }
    const eRoom = dg.rooms.find(r => r.isEntrance);
    if (eRoom) { const ex = eRoom.centerX * ts, ez = eRoom.centerY * ts; const dist = this._d3(pos, { x: ex, y: 0, z: ez }); if (dist < 15) sprites.push({ type: "exit", x: ex, z: ez, dist, data: null }); }
    sprites.sort((a, b) => b.dist - a.dist);

    for (const sp of sprites) {
      const sdx = sp.x - pos.x, sdz = sp.z - pos.z;
      let ang = Math.atan2(sdx, -sdz) - this._dungeonYaw;
      while (ang > Math.PI) ang -= Math.PI * 2; while (ang < -Math.PI) ang += Math.PI * 2;
      if (Math.abs(ang) > Math.PI / 2.5) continue;
      const screenX = W / 2 + (ang / (Math.PI / 3)) * W;
      const scale = Math.max(0.05, 1 / (sp.dist * 0.25 + 0.5));
      const sprH = 60 * scale, sprW = 40 * scale, screenY = H / 2 + sprH * 0.1;

      if (sp.type === "enemy") {
        const e = sp.data as EnemyInstance; const isBoss = e.defId.startsWith("dungeon_boss");
        ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(screenX, screenY + sprH * 0.4, sprW * 0.7, sprH * 0.1, 0, 0, Math.PI * 2); ctx.fill();
        const eCol = e.state === EnemyBehavior.Attack ? (isBoss ? [200,40,200] : [255,60,60]) : e.state === EnemyBehavior.Chase ? [255,170,0] : (isBoss ? [160,60,180] : [170,100,100]);
        const eGrad = ctx.createRadialGradient(screenX, screenY - sprH * 0.2, 0, screenX, screenY, sprH * 0.5);
        eGrad.addColorStop(0, `rgb(${Math.min(255,eCol[0]+40)},${Math.min(255,eCol[1]+40)},${Math.min(255,eCol[2]+40)})`);
        eGrad.addColorStop(1, `rgb(${eCol[0]>>1},${eCol[1]>>1},${eCol[2]>>1})`);
        ctx.fillStyle = eGrad; ctx.beginPath(); ctx.arc(screenX, screenY - sprH * 0.1, sprH * 0.4, 0, Math.PI * 2); ctx.fill();
        if (isBoss) { ctx.fillStyle = "#c9a84c"; const crY = screenY - sprH * 0.5; ctx.beginPath(); ctx.moveTo(screenX - sprW * 0.3, crY); ctx.lineTo(screenX - sprW * 0.2, crY - sprH * 0.15); ctx.lineTo(screenX, crY - sprH * 0.05); ctx.lineTo(screenX + sprW * 0.2, crY - sprH * 0.15); ctx.lineTo(screenX + sprW * 0.3, crY); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = e.state === EnemyBehavior.Attack ? "#ff0" : "#ffa"; const eyeOff = sprH * 0.12;
        ctx.beginPath(); ctx.arc(screenX - eyeOff, screenY - sprH * 0.2, sprH * 0.04, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(screenX + eyeOff, screenY - sprH * 0.2, sprH * 0.04, 0, Math.PI * 2); ctx.fill();
        const barW = sprW * 2, barH = 3 * scale + 2, barY = screenY - sprH * 0.55;
        ctx.fillStyle = "#0008"; ctx.fillRect(screenX - barW / 2 - 1, barY - 1, barW + 2, barH + 2);
        ctx.fillStyle = "#400"; ctx.fillRect(screenX - barW / 2, barY, barW, barH);
        const hpR = e.hp / e.maxHp; ctx.fillStyle = hpR > 0.5 ? "#2c2" : hpR > 0.25 ? "#cc2" : "#f33";
        ctx.fillRect(screenX - barW / 2, barY, barW * hpR, barH);
        ctx.fillStyle = isBoss ? "#c9a84c" : "#ddd"; ctx.font = `${Math.max(8, 10 * scale + 2) | 0}px monospace`; ctx.textAlign = "center";
        ctx.fillText(`${isBoss ? "BOSS: " : ""}${e.defId.replace(/_/g, " ")} Lv${e.level}`, screenX, barY - 3);
      } else if (sp.type === "chest") {
        ctx.fillStyle = "#8B6914"; const cw = sprW * 0.8, ch = sprH * 0.4;
        ctx.fillRect(screenX - cw / 2, screenY - ch / 2, cw, ch);
        ctx.strokeStyle = "#c9a84c"; ctx.lineWidth = Math.max(1, 2 * scale); ctx.strokeRect(screenX - cw / 2, screenY - ch / 2, cw, ch);
        ctx.fillStyle = "#c9a84c"; ctx.fillRect(screenX - cw * 0.1, screenY - ch * 0.15, cw * 0.2, ch * 0.3);
      } else if (sp.type === "exit") {
        ctx.fillStyle = "rgba(100,200,255,0.6)"; const ew = sprW * 0.5;
        for (let si = 0; si < 3; si++) ctx.fillRect(screenX - ew / 2, screenY - si * sprH * 0.12 - sprH * 0.1, ew, sprH * 0.08);
        ctx.fillStyle = "#adf"; ctx.font = `${Math.max(8, 10 * scale) | 0}px serif`; ctx.textAlign = "center"; ctx.fillText("EXIT", screenX, screenY - sprH * 0.4);
      }
    }

    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.6);
    vigGrad.addColorStop(0, "rgba(0,0,0,0)"); vigGrad.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = vigGrad; ctx.fillRect(0, 0, W, H);

    const barCX = W / 2, barY0 = H - 70;
    this._fancyBar(ctx, barCX - 150, barY0, 300, 16, c.hp, c.maxHp, "#b22222", "#3a0808", `HP: ${Math.ceil(c.hp)} / ${c.maxHp}`);
    this._fancyBar(ctx, barCX - 125, barY0 + 22, 250, 12, c.mp, c.maxMp, "#2266aa", "#081830", `MP: ${Math.ceil(c.mp)}`);
    this._fancyBar(ctx, barCX - 125, barY0 + 38, 250, 12, c.stamina, c.maxStamina, "#3a7d44", "#0a2010", `STA: ${Math.ceil(c.stamina)}`);
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(8, 6, 280, 32);
    ctx.strokeStyle = "rgba(201,168,76,0.3)"; ctx.lineWidth = 1; ctx.strokeRect(8, 6, 280, 32);
    ctx.fillStyle = "#c9a84c"; ctx.font = "bold 14px 'Palatino Linotype', serif"; ctx.textAlign = "left"; ctx.fillText(dg.dungeonName, 16, 26);
    ctx.fillStyle = "#bbb"; ctx.font = "12px monospace"; ctx.textAlign = "right"; ctx.fillText(`Difficulty: ${dg.difficulty}`, 280, 26);
    if (dg.bossDefeated) { ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(8, 42, 160, 22); ctx.fillStyle = "#4c4"; ctx.font = "bold 12px serif"; ctx.textAlign = "left"; ctx.fillText("BOSS DEFEATED", 16, 58); }

    const mmSize = 150, mmR = mmSize / 2, mmX = W - mmSize - 15, mmY = 15, mmCX = mmX + mmR, mmCY = mmY + mmR;
    ctx.save(); ctx.beginPath(); ctx.arc(mmCX, mmCY, mmR, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = "rgba(10,8,5,0.9)"; ctx.fillRect(mmX, mmY, mmSize, mmSize);
    const mmScale = 2.5;
    for (let ty = 0; ty < dg.tileMap.length; ty++) for (let tx = 0; tx < dg.tileMap[0].length; tx++) {
      const tile = dg.tileMap[ty][tx]; if (tile === 0) continue;
      const ddx = (tx - dg.playerTileX) * mmScale, ddy = (ty - dg.playerTileY) * mmScale;
      if (ddx * ddx + ddy * ddy > mmR * mmR) continue;
      ctx.fillStyle = tile === 5 ? "rgba(120,40,40,0.7)" : tile === 4 ? "rgba(100,200,255,0.7)" : tile === 3 ? "rgba(200,170,60,0.8)" : tile === 2 ? "rgba(140,100,60,0.6)" : "rgba(80,70,50,0.6)";
      ctx.fillRect(mmCX + ddx - mmScale / 2, mmCY + ddy - mmScale / 2, mmScale, mmScale);
    }
    ctx.fillStyle = "#ff3333";
    for (const e of dg.enemies) { if (e.hp <= 0) continue; const etx = Math.floor(e.pos.x / ts), ety = Math.floor(e.pos.z / ts); const ddx = (etx - dg.playerTileX) * mmScale, ddy = (ety - dg.playerTileY) * mmScale; if (ddx * ddx + ddy * ddy > mmR * mmR) continue; ctx.beginPath(); ctx.arc(mmCX + ddx, mmCY + ddy, 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(mmCX, mmCY - 4); ctx.lineTo(mmCX - 3, mmCY + 3); ctx.lineTo(mmCX + 3, mmCY + 3); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(201,168,76,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mmCX, mmCY, mmR, 0, Math.PI * 2); ctx.stroke();

    const chx = W / 2, chy = H / 2;
    ctx.strokeStyle = this._dungeonInteractId ? "rgba(201,168,76,0.9)" : "rgba(255,255,255,0.6)"; ctx.lineWidth = this._dungeonInteractId ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(chx - 12, chy); ctx.lineTo(chx - 4, chy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(chx + 4, chy); ctx.lineTo(chx + 12, chy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(chx, chy - 12); ctx.lineTo(chx, chy - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(chx, chy + 4); ctx.lineTo(chx, chy + 12); ctx.stroke();
    if (this._dungeonInteractId) { ctx.beginPath(); ctx.arc(chx, chy, 14, 0, Math.PI * 2); ctx.stroke(); }

    if (this._dungeonInteractId) {
      const label = this._dungeonInteractId === "dungeon_exit" ? "[E] Exit Dungeon" : this._dungeonInteractId.startsWith("chest_") ? "[E] Open Chest" : "[E] Interact";
      ctx.fillStyle = "rgba(0,0,0,0.5)"; const promptW = 160, promptH = 28;
      ctx.fillRect(W / 2 - promptW / 2, H * 0.65 - promptH / 2, promptW, promptH);
      ctx.strokeStyle = "rgba(201,168,76,0.6)"; ctx.lineWidth = 1; ctx.strokeRect(W / 2 - promptW / 2, H * 0.65 - promptH / 2, promptW, promptH);
      ctx.fillStyle = "#c9a84c"; ctx.font = "bold 16px 'Palatino Linotype', serif"; ctx.textAlign = "center"; ctx.fillText(label, W / 2, H * 0.65 + 5);
    }

    if (p.combat.inCombat && p.combat.comboCount > 1) {
      ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(W / 2 - 50, H * 0.13, 100, 28);
      ctx.fillStyle = "#ffdd44"; ctx.font = "bold 20px monospace"; ctx.textAlign = "center";
      ctx.shadowColor = "rgba(255,220,0,0.6)"; ctx.shadowBlur = 8;
      ctx.fillText(`Combo x${p.combat.comboCount}`, W / 2, H * 0.15 + 14); ctx.shadowBlur = 0;
    }

    ctx.textAlign = "center";
    for (let i = 0; i < this._notifs.length; i++) {
      const alpha = Math.min(1, this._notifs[i].t);
      ctx.fillStyle = `rgba(0,0,0,${alpha * 0.3})`; const nw = ctx.measureText(this._notifs[i].text).width + 20;
      ctx.fillRect(W / 2 - nw / 2, H * 0.38 + i * 24 - 12, nw, 20);
      ctx.fillStyle = `rgba(201,168,76,${alpha})`; ctx.font = "15px 'Palatino Linotype', serif";
      ctx.fillText(this._notifs[i].text, W / 2, H * 0.38 + i * 24 + 2);
    }

    ctx.fillStyle = "rgba(180,170,150,0.25)"; ctx.font = "10px monospace"; ctx.textAlign = "left";
    ctx.fillText("WASD: Move | LMB: Attack | RMB: Block | E: Interact/Exit | Tab: Inventory | Esc: Menu", 12, H - 4);
  }
}
