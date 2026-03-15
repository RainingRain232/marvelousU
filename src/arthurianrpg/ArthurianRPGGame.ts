// ============================================================================
// ArthurianRPGGame.ts – Main orchestrator for the 3D Arthurian RPG mode
// ============================================================================
import type { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { ArthurianPhase, ArthurianClass } from "../types";
import { RPG_CONFIG } from "./ArthurianRPGConfig";
import { createDefaultState, saveGame, loadGame, addXP, addItem, calculateDerivedStats } from "./ArthurianRPGState";
import type { ArthurianRPGState, Vec3, EnemyInstance } from "./ArthurianRPGState";
import { EnemyBehavior, ItemQualityTier } from "./ArthurianRPGConfig";

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
  // Gameplay
  private _velY = 0; private _grounded = true;
  private _spawnT = 0;
  private _interactId: string | null = null;
  private _dlg: DlgState | null = null;
  private _shop: ShopState | null = null;
  private _notifs: { text: string; t: number }[] = [];
  private _invCur = 0; private _charTab = 0; private _helpSel = 0;
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
    this._hasSave = loadGame() !== null;
    this._tickerCb = (ticker: Ticker) => {
      this._simAcc += Math.min(ticker.deltaMS / 1000, 0.1);
      while (this._simAcc >= this.DT) { this._simAcc -= this.DT; this._sim(this.DT); }
      this._render();
    };
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
    this._state = null; this._dlg = null; this._shop = null;
  }
  private _onResize = () => { if (this._canvas) { this._canvas.width = window.innerWidth; this._canvas.height = window.innerHeight; } };

  // ---- Input ----
  private _setupInput(): void {
    this._kd = (e) => this._keyDown(e);
    this._ku = (e) => this._keyUp(e);
    this._md = (e) => { if (e.button === 0) this._input.attack = true; if (e.button === 2) this._input.block = true; if (this._phase === ArthurianPhase.PLAYING && this._canvas) this._canvas.requestPointerLock(); };
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
      if (e.code === "Tab") { this._phase = P.INVENTORY; this._invCur = 0; e.preventDefault(); }
      if (e.code === "KeyC") this._phase = P.CHARACTER_SHEET;
      if (e.code === "KeyM") this._phase = P.MAP;
      if (e.code === "Escape") { this._phase = P.HELP; this._helpSel = 0; document.exitPointerLock(); }
      if (e.code === "F5") { e.preventDefault(); this._quickSave(); }
      if (e.code === "F9") { e.preventDefault(); this._loadSave(); }
      if (e.code === "KeyF") this._toggleCam();
    } else if (this._phase === P.HELP) {
      if (e.code === "Escape") this._phase = P.PLAYING;
      if (e.code === "ArrowUp" || e.code === "KeyW") this._helpSel = Math.max(0, this._helpSel - 1);
      if (e.code === "ArrowDown" || e.code === "KeyS") this._helpSel = Math.min(2, this._helpSel + 1);
      if (e.code === "Enter" || e.code === "Space") {
        if (this._helpSel === 0) this._phase = P.PLAYING;
        else if (this._helpSel === 1) { this._quickSave(); this._phase = P.PLAYING; }
        else if (this._helpSel === 2) this._exit();
      }
    } else if (this._phase === P.INVENTORY) {
      if (!this._state) return;
      const n = this._state.player.inventory.items.length;
      if (e.code === "ArrowUp") this._invCur = Math.max(0, this._invCur - 1);
      if (e.code === "ArrowDown") this._invCur = Math.min(n - 1, this._invCur);
      if (e.code === "Tab" || e.code === "Escape") this._phase = P.PLAYING;
    } else if (this._phase === P.CHARACTER_SHEET) {
      if (e.code === "ArrowLeft") this._charTab = Math.max(0, this._charTab - 1);
      if (e.code === "ArrowRight") this._charTab = Math.min(2, this._charTab + 1);
      if (e.code === "KeyC" || e.code === "Escape") this._phase = P.PLAYING;
    } else if (this._phase === P.MAP) {
      if (e.code === "KeyM" || e.code === "Escape") this._phase = P.PLAYING;
    } else if (this._phase === P.DIALOGUE && this._dlg) {
      if (e.code === "Enter" || e.code === "Space") {
        if (this._dlg.lineIdx < this._dlg.lines.length - 1) this._dlg.lineIdx++;
        else if (this._dlg.choices.length > 0) { if (this._dlg.choices[this._dlg.choiceIdx].action === "exit") { this._dlg = null; this._phase = P.PLAYING; } else { this._dlg.lines = ["Perhaps another time..."]; this._dlg.lineIdx = 0; this._dlg.choices = []; } }
        else { this._dlg = null; this._phase = P.PLAYING; }
      }
      if (e.code === "ArrowUp" && this._dlg?.choices.length) this._dlg.choiceIdx = Math.max(0, this._dlg.choiceIdx - 1);
      if (e.code === "ArrowDown" && this._dlg?.choices.length) this._dlg.choiceIdx = Math.min(this._dlg.choices.length - 1, this._dlg.choiceIdx + 1);
    } else if (this._phase === P.SHOP && this._shop && this._state) {
      if (e.code === "ArrowUp") this._shop.selIdx = Math.max(0, this._shop.selIdx - 1);
      if (e.code === "ArrowDown") this._shop.selIdx = Math.min(this._shop.items.length - 1, this._shop.selIdx + 1);
      if (e.code === "Enter") { const it = this._shop.items[this._shop.selIdx]; if (it && this._state.player.gold >= it.price) { this._state.player.gold -= it.price; addItem(this._state.player, it.id, 1, it.name, it.weight, ItemQualityTier.Common); this._notify(`Purchased ${it.name}`); } else { this._notify("Not enough gold!"); } }
      if (e.code === "Escape") { this._shop = null; this._phase = P.PLAYING; }
    } else if (this._phase === P.DEAD) {
      if (e.code === "Enter" || e.code === "Space") this._respawn();
    }
  }

  // ---- Sim ----
  private _sim(dt: number): void {
    if (!this._state || this._phase !== ArthurianPhase.PLAYING) { this._input.interact = false; this._input.mouseDX = 0; this._input.mouseDY = 0; return; }
    this._state.deltaTime = dt;
    // Day/night
    this._state.worldTime += dt / RPG_CONFIG.realSecondsPerGameHour;
    if (this._state.worldTime >= 24) { this._state.worldTime -= 24; this._state.world.dayCount++; }
    this._state.world.timeOfDay = this._state.worldTime;
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
    // Interaction
    this._interact();
    // Notifications
    for (let i = this._notifs.length - 1; i >= 0; i--) { this._notifs[i].t -= dt; if (this._notifs[i].t <= 0) this._notifs.splice(i, 1); }
    this._input.interact = false; this._input.mouseDX = 0; this._input.mouseDY = 0;
  }

  private _move(dt: number): void {
    if (!this._state) return;
    const p = this._state.player, c = p.combatant, pos = c.position;
    const d = calculateDerivedStats(p);
    let spd = d.moveSpeed;
    if (this._input.sprint && c.stamina > 5) { spd *= 1.6; c.stamina -= 15 * dt; if (c.stamina < 0) c.stamina = 0; }
    this._yaw -= this._input.mouseDX * 0.002;
    this._pitch = Math.max(-1.2, Math.min(1.2, this._pitch - this._input.mouseDY * 0.002));
    const sin = Math.sin(this._yaw), cos = Math.cos(this._yaw);
    let dx = 0, dz = 0;
    if (this._input.forward) { dx -= sin; dz -= cos; } if (this._input.back) { dx += sin; dz += cos; }
    if (this._input.left) { dx -= cos; dz += sin; } if (this._input.right) { dx += cos; dz -= sin; }
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0.001) { pos.x += (dx / len) * spd * dt; pos.z += (dz / len) * spd * dt; }
    if (this._input.jump && this._grounded && c.stamina > 10) { this._velY = 8; this._grounded = false; c.stamina -= 10; }
    if (!this._grounded) { this._velY -= 20 * dt; pos.y += this._velY * dt; if (pos.y <= 0) { pos.y = 0; this._grounded = true; this._velY = 0; } }
    c.isBlocking = this._input.block; p.combat.blockActive = this._input.block;
    // Region check
    let nr = p.currentRegion;
    if (pos.x < -100) nr = "darkwood"; else if (pos.x > 200 && pos.z > 200) nr = "grail_temple";
    else if (pos.x > 100) nr = "saxon_camp"; else if (pos.z < -100) nr = "avalon";
    else if (pos.z > 100) nr = "mordred_fortress"; else nr = "camelot";
    if (nr !== p.currentRegion) {
      p.currentRegion = nr; this._state.world.currentRegion = nr; this._state.world.enemies = [];
      this._notify(`Entering ${REGIONS[nr]?.name ?? nr}`);
      if (!p.discoveredLocations.includes(nr)) { p.discoveredLocations.push(nr); p.unlockedFastTravel.push(nr); addXP(p, 25); this._notify("New location discovered!"); }
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
    p.combatant.stamina -= 10; cb.cooldowns["attack"] = 0.5; cb.comboCount++; cb.comboTimer = 2.0;
    let best: EnemyInstance | null = null, bestD = 3.0;
    for (const e of this._state.world.enemies) { if (e.hp <= 0) continue; const dist = this._d3(p.combatant.position, e.pos); if (dist < bestD) { best = e; bestD = dist; } }
    if (best) {
      const crit = Math.random() < d.critChance;
      let dmg = Math.max(1, Math.floor(d.physicalDamage * (1 + cb.comboCount * 0.1) * (crit ? d.critMultiplier : 1)));
      best.hp -= dmg; cb.inCombat = true; cb.targetId = best.id;
      this._notify(crit ? `CRITICAL! ${dmg} damage` : `${dmg} damage`);
      if (best.hp <= 0) { best.state = EnemyBehavior.Dead; this._killEnemy(best); }
    }
  }

  private _killEnemy(e: EnemyInstance): void {
    if (!this._state) return;
    const xp = 20 + e.level * 10; addXP(this._state.player, xp); this._notify(`Enemy slain! +${xp} XP`);
    if (Math.random() < 0.4) { const g = Math.floor(5 + Math.random() * e.level * 3); this._state.player.gold += g; this._notify(`+${g} gold`); }
    if (Math.random() < 0.2) { addItem(this._state.player, "health_potion", 1, "Health Potion", 0.5, ItemQualityTier.Common); this._notify("Found: Health Potion"); }
    for (const q of this._state.player.activeQuests) for (const o of q.objectives) if (o.type === "kill" && o.targetId === e.defId && !o.completed) { o.currentCount++; if (o.currentCount >= o.requiredCount) o.completed = true; }
  }

  private _ai(dt: number): void {
    if (!this._state) return;
    const pp = this._state.player.combatant.position;
    for (const e of this._state.world.enemies) {
      if (e.hp <= 0) continue;
      const dist = this._d3(pp, e.pos);
      const ar = e.aiState.attackRange ?? 2.5;
      if (e.state === EnemyBehavior.Idle || e.state === EnemyBehavior.Patrol) {
        if (dist < 15) { e.state = EnemyBehavior.Chase; e.target = "player"; }
        if (e.state === EnemyBehavior.Patrol && e.patrolPath.length > 0) {
          const t = e.patrolPath[e.patrolIndex], dx = t.x - e.pos.x, dz = t.z - e.pos.z, pd = Math.sqrt(dx*dx+dz*dz);
          if (pd < 1) e.patrolIndex = (e.patrolIndex + 1) % e.patrolPath.length;
          else { e.pos.x += (dx/pd)*2*dt; e.pos.z += (dz/pd)*2*dt; }
        }
      } else if (e.state === EnemyBehavior.Alert) {
        e.alertLevel += dt * 0.5;
        if (dist < 10 || e.alertLevel >= 1) { e.state = EnemyBehavior.Chase; e.target = "player"; }
        if (dist > 20) e.state = EnemyBehavior.Idle;
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
            if (this._state.player.combat.blockActive) { dmg = Math.floor(dmg * (1 - calculateDerivedStats(this._state.player).blockEfficiency)); this._notify(`Blocked! ${dmg} dmg`); }
            this._state.player.combatant.hp -= dmg;
            if (this._state.player.combatant.hp <= 0) { this._state.player.combatant.hp = 0; this._phase = ArthurianPhase.DEAD; this._notify("You have fallen..."); }
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
    if (this._input.interact && this._interactId) {
      const npc = this._state.world.npcs.find(n => n.id === this._interactId);
      if (npc) {
        this._dlg = { npcName: npc.name, lines: [`Greetings, traveler. I am ${npc.name}.`, "These are troubled times in Camelot.", "May the Grail guide your path."], lineIdx: 0, choices: [{ text: "Tell me about the Holy Grail", action: "info" }, { text: "Any work for me?", action: "quest" }, { text: "Farewell", action: "exit" }], choiceIdx: 0 };
        this._phase = ArthurianPhase.DIALOGUE;
      }
    }
  }

  // ---- Actions ----
  private _newGame(): void { this._state = createDefaultState(CLASS_LIST[this._classIdx], this._playerName || "Sir Galahad"); this._phase = ArthurianPhase.PLAYING; this._notify("Your quest for the Holy Grail begins..."); }
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
    else if (this._phase === P.DEAD) this._rDead(ctx, W, H);
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
  // ---- Terrain height function (matches renderer) ----
  private _terrH(x: number, z: number): number {
    return Math.sin(x*0.008)*Math.cos(z*0.008)*18 + Math.sin(x*0.025+1.3)*Math.cos(z*0.02-0.7)*6 + Math.sin(x*0.06)*Math.sin(z*0.06)*2 + Math.sin(x*0.15+0.5)*Math.cos(z*0.12-0.3)*0.8;
  }

  private _rPlay(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (!this._state) return;
    const p = this._state.player, c = p.combatant, w = this._state.world;
    const t = this._state.worldTime;
    const pp = c.position;
    const horizon = H * 0.52;

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

    // ============ ENEMIES ============
    for (const e of w.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.pos.x - pp.x, dz = e.pos.z - pp.z, dist = Math.sqrt(dx*dx+dz*dz);
      if (dist > 40 || dist < 0.5) continue;
      const ang = Math.atan2(dx, dz) - this._yaw;
      const sx = W/2 + Math.sin(ang) * (W*0.3) / (dist*0.1+1);
      const sy = horizon + 30 / (dist*0.15+1);
      const sz = Math.max(8, 45 / (dist*0.2+1));
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath(); ctx.ellipse(sx, sy + sz * 0.8, sz * 0.7, sz * 0.2, 0, 0, Math.PI*2); ctx.fill();
      // Body with gradient
      const enemyGrad = ctx.createRadialGradient(sx - sz*0.2, sy - sz*0.2, 0, sx, sy, sz);
      const eCol = e.state === EnemyBehavior.Attack ? [255,60,60] : e.state === EnemyBehavior.Chase ? [255,170,0] : [170,100,100];
      enemyGrad.addColorStop(0, `rgb(${Math.min(255,eCol[0]+40)},${Math.min(255,eCol[1]+40)},${Math.min(255,eCol[2]+40)})`);
      enemyGrad.addColorStop(1, `rgb(${eCol[0]>>1},${eCol[1]>>1},${eCol[2]>>1})`);
      ctx.fillStyle = enemyGrad;
      ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI*2); ctx.fill();
      // Eyes
      ctx.fillStyle = e.state === EnemyBehavior.Attack ? "#ff0" : "#ffa";
      const eyeOff = sz * 0.25;
      ctx.beginPath(); ctx.arc(sx - eyeOff, sy - eyeOff * 0.5, sz * 0.08, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + eyeOff, sy - eyeOff * 0.5, sz * 0.08, 0, Math.PI*2); ctx.fill();
      // Health bar with border
      const barW = sz * 2, barH = 4, barY = sy - sz - 10;
      ctx.fillStyle = "#0008"; ctx.fillRect(sx - barW/2 - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = "#400"; ctx.fillRect(sx - barW/2, barY, barW, barH);
      const hpRatio = e.hp / e.maxHp;
      ctx.fillStyle = hpRatio > 0.5 ? "#2c2" : hpRatio > 0.25 ? "#cc2" : "#f33";
      ctx.fillRect(sx - barW/2, barY, barW * hpRatio, barH);
      // Name label with shadow
      ctx.fillStyle = "#0006"; ctx.font = `${Math.max(9, 11 * (sz/15))|0}px monospace`; ctx.textAlign = "center";
      ctx.fillText(`${e.defId.replace(/_/g," ")} Lv${e.level}`, sx+1, barY - 3);
      ctx.fillStyle = "#ddd";
      ctx.fillText(`${e.defId.replace(/_/g," ")} Lv${e.level}`, sx, barY - 4);
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

    // ============ VIGNETTE OVERLAY ============
    const vigGrad = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.7);
    vigGrad.addColorStop(0, "rgba(0,0,0,0)");
    vigGrad.addColorStop(1, `rgba(0,0,0,${isDay ? 0.25 : 0.45})`);
    ctx.fillStyle = vigGrad; ctx.fillRect(0, 0, W, H);

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

    // ============ INTERACTION PROMPT ============
    if (this._interactId) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      const promptW = 140, promptH = 28;
      ctx.fillRect(W/2 - promptW/2, H*0.65 - promptH/2, promptW, promptH);
      ctx.strokeStyle = "rgba(201,168,76,0.6)"; ctx.lineWidth = 1;
      ctx.strokeRect(W/2 - promptW/2, H*0.65 - promptH/2, promptW, promptH);
      ctx.fillStyle = "#c9a84c"; ctx.font = "bold 16px 'Palatino Linotype', serif"; ctx.textAlign = "center";
      ctx.fillText("[E] Interact", W/2, H*0.65 + 5);
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
    ctx.fillText("Esc: Menu  |  WASD: Move  |  LMB: Attack  |  RMB: Block  |  Tab: Inventory  |  M: Map", 12, H - 4);
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
}
