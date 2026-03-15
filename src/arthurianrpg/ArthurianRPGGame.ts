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
  private _invCur = 0; private _charTab = 0;
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
      if (e.code === "Escape") this._exit();
      if (e.code === "F5") { e.preventDefault(); this._quickSave(); }
      if (e.code === "F9") { e.preventDefault(); this._loadSave(); }
      if (e.code === "KeyF") this._toggleCam();
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

  private _rPlay(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (!this._state) return;
    const p = this._state.player, c = p.combatant, w = this._state.world;
    // Sky
    const t = this._state.worldTime;
    let r = 10, g = 15, b = 30;
    if (t >= 6 && t < 8) { const f = (t-6)/2; r = 10+f*70; g = 15+f*100; b = 30+f*120; }
    else if (t >= 8 && t < 18) { r = 80; g = 115; b = 150; }
    else if (t >= 18 && t < 20) { const f = 1-(t-18)/2; r = 80*f+30; g = 115*f+15; b = 150*f+40; }
    const grad = ctx.createLinearGradient(0, 0, 0, H*0.6);
    grad.addColorStop(0, `rgb(${r|0},${g|0},${b|0})`); grad.addColorStop(1, `rgb(${r*0.6|0},${g*0.7|0},${b*0.5|0})`);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H*0.6);
    // Ground
    ctx.fillStyle = REGIONS[w.currentRegion]?.color ?? "#3a5a3a"; ctx.fillRect(0, H*0.55, W, H*0.45);
    ctx.strokeStyle = "#fff1"; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) { const y = H*0.55 + i*(H*0.038); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // Enemies
    const pp = c.position;
    for (const e of w.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.pos.x - pp.x, dz = e.pos.z - pp.z, dist = Math.sqrt(dx*dx+dz*dz);
      if (dist > 40 || dist < 0.5) continue;
      const ang = Math.atan2(dx, dz) - this._yaw;
      const sx = W/2 + Math.sin(ang) * (W*0.3) / (dist*0.1+1);
      const sy = H*0.55 - 30 / (dist*0.15+1);
      const sz = Math.max(6, 40 / (dist*0.2+1));
      ctx.fillStyle = e.state === EnemyBehavior.Attack ? "#f44" : e.state === EnemyBehavior.Chase ? "#fa0" : "#a66";
      ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#400"; ctx.fillRect(sx-sz, sy-sz-8, sz*2, 3);
      ctx.fillStyle = "#f44"; ctx.fillRect(sx-sz, sy-sz-8, sz*2*(e.hp/e.maxHp), 3);
      ctx.fillStyle = "#ccc"; ctx.font = "10px monospace"; ctx.textAlign = "center";
      ctx.fillText(`${e.defId.replace(/_/g," ")} Lv${e.level}`, sx, sy-sz-12);
    }
    // Crosshair
    ctx.strokeStyle = "#fff8"; ctx.lineWidth = 1; const cx = W/2, cy = H/2;
    ctx.beginPath(); ctx.moveTo(cx-10, cy); ctx.lineTo(cx+10, cy); ctx.moveTo(cx, cy-10); ctx.lineTo(cx, cy+10); ctx.stroke();
    // HUD bars
    this._bar(ctx, 20, H-80, 200, 20, c.hp, c.maxHp, "#c33", "#400", `HP: ${Math.ceil(c.hp)}/${c.maxHp}`);
    this._bar(ctx, 20, H-55, 200, 16, c.stamina, c.maxStamina, "#2a2", "#040", `STA: ${Math.ceil(c.stamina)}`);
    this._bar(ctx, 20, H-35, 200, 16, c.mp, c.maxMp, "#33c", "#004", `MP: ${Math.ceil(c.mp)}`);
    ctx.fillStyle = "#ddd"; ctx.font = "14px monospace"; ctx.textAlign = "left";
    ctx.fillText(`Lv ${c.level}  XP: ${c.xp}/${c.xpToNext}  Gold: ${p.gold}`, 20, H-90);
    // Region/time
    const hr = Math.floor(this._state.worldTime), mn = Math.floor((this._state.worldTime%1)*60);
    ctx.fillStyle = "#aaa"; ctx.font = "14px monospace"; ctx.textAlign = "right";
    ctx.fillText(`${REGIONS[w.currentRegion]?.name ?? w.currentRegion}  Day ${w.dayCount}  ${String(hr).padStart(2,"0")}:${String(mn).padStart(2,"0")}`, W-20, 25);
    // Compass
    const cr = 25; ctx.strokeStyle = "#c9a84c88"; ctx.beginPath(); ctx.arc(W/2, 40, cr, 0, Math.PI*2); ctx.stroke();
    for (const [l, a] of [["N",0],["E",Math.PI/2],["S",Math.PI],["W",-Math.PI/2]] as [string,number][]) {
      const ra = a - this._yaw; ctx.fillStyle = l === "N" ? "#c9a84c" : "#888"; ctx.font = "10px monospace"; ctx.textAlign = "center";
      ctx.fillText(l, W/2 + Math.sin(ra)*(cr-5), 44 - Math.cos(ra)*(cr-5));
    }
    // Interact
    if (this._interactId) { ctx.fillStyle = "#c9a84c"; ctx.font = "18px serif"; ctx.textAlign = "center"; ctx.fillText("[E] Interact", W/2, H*0.7); }
    // Combo
    if (p.combat.inCombat && p.combat.comboCount > 1) { ctx.fillStyle = "#ff4"; ctx.font = "bold 20px monospace"; ctx.textAlign = "center"; ctx.fillText(`Combo x${p.combat.comboCount}`, W/2, H*0.15); }
    // Notifications
    ctx.textAlign = "center";
    for (let i = 0; i < this._notifs.length; i++) { ctx.fillStyle = `rgba(201,168,76,${Math.min(1,this._notifs[i].t)})`; ctx.font = "16px serif"; ctx.fillText(this._notifs[i].text, W/2, H*0.4+i*22); }
    // Controls hint
    ctx.fillStyle = "#5558"; ctx.font = "11px monospace"; ctx.textAlign = "left";
    ctx.fillText("WASD Move | Mouse Look | LMB Attack | RMB Block | E Interact | Tab Inv | C Char | M Map | F Cam | F5 Save | F9 Load", 10, 16);
  }

  private _bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, v: number, mx: number, fg: string, bg: string, lbl: string): void {
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fg; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, v/mx)), h);
    ctx.strokeStyle = "#0008"; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#fff"; ctx.font = `${Math.min(h-2,12)}px monospace`; ctx.textAlign = "left"; ctx.fillText(lbl, x+4, y+h-3);
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
