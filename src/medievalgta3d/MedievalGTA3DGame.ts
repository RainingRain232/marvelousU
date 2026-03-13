// ---------------------------------------------------------------------------
// Medieval GTA 3D — main game orchestrator
// Uses Three.js for 3D rendering with HTML HUD overlay.
// ---------------------------------------------------------------------------

import { createGTA3DState, genId3D } from "./state/GTA3DState";
import type {
  GTA3DState, NPC3D, NPCType3D, Horse3D, Building3D, Vec3,
  HorseColor3D,
} from "./state/GTA3DState";
import { GTA3D } from "./config/GTA3DConfig";
import { updatePlayer3D } from "./systems/GTA3DPlayerSystem";
import { updateCombat3D, addNotification3D } from "./systems/GTA3DCombatSystem";
import { updateNPCs3D } from "./systems/GTA3DNPCSystem";
import { updateHorses3D } from "./systems/GTA3DHorseSystem";
import { GTA3DRenderer } from "./view/GTA3DRenderer";
import { GTA3DHUD } from "./view/GTA3DHUD";

const DT = GTA3D.SIM_TICK_MS / 1000;

// ---------------------------------------------------------------------------
// Populate helpers
// ---------------------------------------------------------------------------

function makeNPC(
  state: GTA3DState,
  type: NPCType3D,
  name: string,
  pos: Vec3,
  behavior: NPC3D["behavior"] = "stand",
  patrol: Vec3[] = [],
  opts?: Partial<NPC3D>,
): NPC3D {
  const defaults: Record<string, { hp: number; damage: number; speed: number; alertRadius: number; aggroRadius: number; attackCooldown: number }> = {
    guard:         { hp: 80, damage: 15, speed: 5.5, alertRadius: 15, aggroRadius: 10, attackCooldown: 0.8 },
    knight:        { hp: 150, damage: 25, speed: 6.0, alertRadius: 18, aggroRadius: 12, attackCooldown: 0.9 },
    archer:        { hp: 60, damage: 15, speed: 4.0, alertRadius: 25, aggroRadius: 20, attackCooldown: 2.5 },
    soldier:       { hp: 70, damage: 18, speed: 5.0, alertRadius: 15, aggroRadius: 10, attackCooldown: 0.7 },
    civilian_m:    { hp: 30, damage: 5,  speed: 2.0, alertRadius: 8,  aggroRadius: 5,  attackCooldown: 1.0 },
    civilian_f:    { hp: 30, damage: 5,  speed: 2.0, alertRadius: 8,  aggroRadius: 5,  attackCooldown: 1.0 },
    merchant:      { hp: 40, damage: 5,  speed: 1.5, alertRadius: 8,  aggroRadius: 5,  attackCooldown: 1.0 },
    blacksmith:    { hp: 50, damage: 10, speed: 1.5, alertRadius: 8,  aggroRadius: 5,  attackCooldown: 1.0 },
    priest:        { hp: 30, damage: 3,  speed: 1.5, alertRadius: 8,  aggroRadius: 5,  attackCooldown: 1.0 },
    bard:          { hp: 30, damage: 3,  speed: 2.5, alertRadius: 8,  aggroRadius: 5,  attackCooldown: 1.0 },
    tavern_keeper: { hp: 40, damage: 5,  speed: 1.0, alertRadius: 8,  aggroRadius: 5,  attackCooldown: 1.0 },
    stable_master: { hp: 40, damage: 5,  speed: 1.5, alertRadius: 8,  aggroRadius: 5,  attackCooldown: 1.0 },
    criminal:      { hp: 50, damage: 12, speed: 4.5, alertRadius: 12, aggroRadius: 8,  attackCooldown: 0.7 },
    bandit:        { hp: 60, damage: 15, speed: 5.0, alertRadius: 15, aggroRadius: 10, attackCooldown: 0.8 },
    assassin:      { hp: 70, damage: 20, speed: 6.0, alertRadius: 20, aggroRadius: 15, attackCooldown: 0.6 },
  };
  const d = defaults[type] ?? defaults.civilian_m;
  const id = genId3D(state);
  const npc: NPC3D = {
    id,
    type,
    name,
    pos: { ...pos },
    vel: { x: 0, y: 0, z: 0 },
    rotation: 0,
    hp: d.hp,
    maxHp: d.hp,
    behavior,
    patrolPath: patrol,
    patrolIndex: 0,
    patrolDir: 1,
    wanderTarget: null,
    wanderTimer: Math.random() * 3,
    chaseTimer: 0,
    attackTimer: 0,
    attackCooldown: d.attackCooldown,
    alertRadius: d.alertRadius,
    aggroRadius: d.aggroRadius,
    damage: d.damage,
    speed: d.speed,
    dead: false,
    deathTimer: 0,
    homePos: { ...pos },
    colorVariant: Math.floor(Math.random() * 4),
    ...opts,
  };
  return npc;
}

function populateWorld(state: GTA3DState): void {
  // ---- Buildings ----
  const b = (type: string, x: number, z: number, w: number, h: number, d: number, name: string, interact = false, blocks = true, rot = 0): Building3D => ({
    id: genId3D(state),
    type,
    pos: { x, y: 0, z },
    size: { x: w, y: h, z: d },
    rotation: rot,
    name,
    interactable: interact,
    blocksMovement: blocks,
  });

  const blds: Building3D[] = [];

  // Castle (NW quadrant)
  blds.push(b("castle", -30, -30, 20, 12, 18, "Camelot Castle", true));

  // Barracks (N)
  blds.push(b("barracks", 5, -30, 16, 6, 12, "Royal Barracks", true));

  // Church (NE)
  blds.push(b("church", 30, -25, 12, 15, 14, "Church of the Holy Light", true));

  // Tavern (E)
  blds.push(b("tavern", 32, 5, 14, 7, 10, "The Prancing Pony", true));

  // Blacksmith (W)
  blds.push(b("blacksmith_shop", -30, 5, 12, 5, 10, "Edgar's Forge", true));

  // Market stalls (center)
  blds.push(b("market_stall", -6, -2, 4, 3, 3, "Spice Stall", false, false));
  blds.push(b("market_stall", 0, -2, 4, 3, 3, "Cloth Stall", false, false));
  blds.push(b("market_stall", 6, -2, 4, 3, 3, "Bread Stall", false, false));
  blds.push(b("market_stall", -3, 4, 4, 3, 3, "Fish Stall", false, false));
  blds.push(b("market_stall", 3, 4, 4, 3, 3, "Jeweler's Stall", false, false));

  // Fountain (market center)
  blds.push(b("fountain", 0, 1, 3, 2, 3, "Market Fountain", false, false));

  // Stable (SE)
  blds.push(b("stable", 35, 30, 16, 5, 12, "Royal Stables", true));

  // Prison (SW)
  blds.push(b("prison", -30, 25, 14, 6, 10, "Camelot Prison", true));

  // Houses scattered
  blds.push(b("house_large", -10, -18, 8, 6, 7, "Noble House"));
  blds.push(b("house_large", 20, -15, 8, 6, 7, "Manor House"));
  blds.push(b("house_medium", -8, 18, 6, 5, 5, "Townhouse"));
  blds.push(b("house_medium", 5, 20, 6, 5, 5, "Townhouse"));
  blds.push(b("house_medium", 18, 18, 6, 5, 5, "Townhouse"));
  blds.push(b("house_medium", -18, -10, 6, 5, 5, "Townhouse"));
  blds.push(b("house_small", 15, -5, 4, 4, 4, "Cottage"));
  blds.push(b("house_small", -15, 12, 4, 4, 4, "Cottage"));
  blds.push(b("house_small", 25, 12, 4, 4, 4, "Cottage"));
  blds.push(b("house_small", 10, 30, 4, 4, 4, "Cottage"));
  blds.push(b("house_small", -20, 35, 4, 4, 4, "Cottage"));
  blds.push(b("house_large", 22, 28, 8, 6, 7, "Large Cottage"));

  // Outside: farms
  blds.push(b("farm_field", -20, 75, 20, 0.5, 15, "Wheat Field", false, false));
  blds.push(b("farm_field", 10, 80, 20, 0.5, 15, "Barley Field", false, false));
  blds.push(b("farmhouse", -10, 70, 6, 4, 5, "Farmhouse"));
  blds.push(b("farmhouse", 25, 75, 6, 4, 5, "Farmhouse"));

  // Mill
  blds.push(b("mill", 0, 85, 5, 10, 5, "Windmill", false, true));

  // Tree clusters (outside walls)
  blds.push(b("tree_cluster", -50, -70, 15, 8, 12, "Forest Clearing", false, false));
  blds.push(b("tree_cluster", -20, -80, 18, 8, 14, "Pine Grove", false, false));
  blds.push(b("tree_cluster", 30, -75, 20, 8, 15, "Oak Wood", false, false));
  blds.push(b("tree_cluster", 60, -60, 15, 8, 12, "Birch Stand", false, false));
  blds.push(b("tree_cluster", -70, 20, 15, 8, 12, "Dark Thicket", false, false));
  blds.push(b("tree_cluster", 70, -20, 12, 8, 10, "Elder Forest", false, false));
  blds.push(b("tree_cluster", -60, 60, 14, 8, 12, "Western Woods", false, false));
  blds.push(b("tree_cluster", 65, 50, 16, 8, 14, "Eastern Grove", false, false));

  // Decorations
  blds.push(b("hay_bale", 38, 35, 2, 1.5, 2, "Hay Bale", false, false));
  blds.push(b("hay_bale", 40, 33, 2, 1.5, 2, "Hay Bale", false, false));
  blds.push(b("cart", -5, 10, 3, 2, 2, "Cart", false, false));
  blds.push(b("cart", 28, -10, 3, 2, 2, "Cart", false, false));

  state.buildings = blds;

  // ---- NPCs ----
  const addNPC = (type: NPCType3D, name: string, x: number, z: number, beh: NPC3D["behavior"] = "stand", patrol: Vec3[] = []) => {
    state.npcs.set(genId3D(state), makeNPC(state, type, name, { x, y: 0, z }, beh, patrol));
  };

  // Castle guards
  addNPC("guard", "Castle Guard", -25, -25, "patrol", [
    { x: -25, y: 0, z: -25 }, { x: -25, y: 0, z: -35 }, { x: -35, y: 0, z: -35 }, { x: -35, y: 0, z: -25 },
  ]);
  addNPC("guard", "Castle Guard", -35, -30, "patrol", [
    { x: -35, y: 0, z: -30 }, { x: -35, y: 0, z: -22 }, { x: -25, y: 0, z: -22 },
  ]);
  addNPC("knight", "Knight of the Round Table", -30, -28, "patrol", [
    { x: -30, y: 0, z: -28 }, { x: -20, y: 0, z: -28 }, { x: -20, y: 0, z: -15 }, { x: -30, y: 0, z: -15 },
  ]);

  // Barracks guards
  addNPC("guard", "Barracks Guard", 0, -28, "patrol", [
    { x: 0, y: 0, z: -28 }, { x: 12, y: 0, z: -28 }, { x: 12, y: 0, z: -22 }, { x: 0, y: 0, z: -22 },
  ]);
  addNPC("soldier", "Army Soldier", 8, -25, "patrol", [
    { x: 8, y: 0, z: -25 }, { x: 15, y: 0, z: -25 },
  ]);

  // Gate guards (N, S, E, W)
  addNPC("guard", "North Gate Guard", -2, -58, "stand");
  addNPC("guard", "North Gate Guard", 2, -58, "stand");
  addNPC("guard", "South Gate Guard", -2, 58, "stand");
  addNPC("guard", "South Gate Guard", 2, 58, "stand");
  addNPC("guard", "East Gate Guard", 58, -2, "stand");
  addNPC("guard", "East Gate Guard", 58, 2, "stand");
  addNPC("guard", "West Gate Guard", -58, -2, "stand");
  addNPC("guard", "West Gate Guard", -58, 2, "stand");

  // Market patrol
  addNPC("guard", "Market Guard", -5, 0, "patrol", [
    { x: -5, y: 0, z: 0 }, { x: 8, y: 0, z: 0 }, { x: 8, y: 0, z: 6 }, { x: -5, y: 0, z: 6 },
  ]);

  // Knights
  addNPC("knight", "Knight of the Round Table", 15, 10, "patrol", [
    { x: 15, y: 0, z: 10 }, { x: 30, y: 0, z: 10 }, { x: 30, y: 0, z: -10 }, { x: 15, y: 0, z: -10 },
  ]);

  // Archers on walls
  addNPC("archer", "Wall Archer", 0, -55, "stand");
  addNPC("archer", "Wall Archer", 40, -40, "stand");
  addNPC("archer", "Wall Archer", -40, 40, "stand");
  addNPC("archer", "Wall Archer", 55, 0, "stand");

  // Civilians
  const civPos: [number, number][] = [
    [-5, 8], [3, 12], [10, 5], [-12, -5],
    [8, -8], [-8, 15], [20, 8], [-15, -15],
    [12, 20], [-10, 25], [25, -8], [18, 15],
    [-5, -12], [15, 25], [-18, 8], [8, 30],
    [22, -3], [-22, 18], [0, 22], [10, -15],
  ];
  civPos.forEach((p, i) => {
    const type: NPCType3D = i % 2 === 0 ? "civilian_m" : "civilian_f";
    const name = type === "civilian_m" ? "Townsman" : "Townswoman";
    addNPC(type, name, p[0], p[1], "wander");
  });

  // Merchants
  addNPC("merchant", "Spice Merchant", -6, -4, "stand");
  addNPC("merchant", "Cloth Merchant", 0, -4, "stand");
  addNPC("merchant", "Fish Monger", -3, 6, "stand");
  addNPC("merchant", "Jeweler", 3, 6, "stand");

  // Tavern keeper + bard
  addNPC("tavern_keeper", "Tavern Keeper", 30, 3, "stand");
  addNPC("bard", "Wandering Bard", 28, 8, "wander");

  // Blacksmith
  addNPC("blacksmith", "Edgar the Blacksmith", -28, 3, "stand");

  // Stable master
  addNPC("stable_master", "Stable Master", 33, 28, "stand");

  // Priest
  addNPC("priest", "Father Matthias", 28, -22, "wander");

  // Criminals
  addNPC("criminal", "Cutpurse", -18, 28, "wander");
  addNPC("criminal", "Thief", -25, 35, "wander");
  addNPC("criminal", "Pickpocket", -12, 32, "wander");

  // Bandits (outside walls)
  addNPC("bandit", "Road Bandit", -70, -10, "wander");
  addNPC("bandit", "Highwayman", -50, 70, "wander");
  addNPC("bandit", "Outlaw", 70, -40, "wander");
  addNPC("bandit", "Brigand", 65, 55, "wander");
  addNPC("bandit", "Raider", -60, -55, "wander");

  // Assassin (rare, outside)
  addNPC("assassin", "Shadow Blade", 75, 0, "wander");

  // ---- Horses ----
  const addHorse = (x: number, z: number, color: HorseColor3D, hState: Horse3D["state"]) => {
    const id = genId3D(state);
    state.horses.set(id, {
      id,
      pos: { x, y: 0, z },
      vel: { x: 0, y: 0, z: 0 },
      rotation: 0,
      hp: GTA3D.HORSE_HP,
      maxHp: GTA3D.HORSE_HP,
      state: hState,
      color,
      basePos: { x, y: 0, z },
      speed: GTA3D.HORSE_SPEED,
    });
  };

  // At stable
  addHorse(32, 28, "brown", "tied");
  addHorse(34, 30, "black", "tied");
  addHorse(36, 28, "white", "tied");
  addHorse(38, 30, "chestnut", "tied");

  // Near tavern
  addHorse(28, 10, "grey", "tied");
  addHorse(30, 12, "brown", "tied");

  // Outside south
  addHorse(-5, 68, "black", "free");
  addHorse(5, 72, "grey", "free");

  // Outside north
  addHorse(-30, -70, "chestnut", "free");

  // ---- Items ----
  const addItem = (type: string, x: number, z: number, amount: number) => {
    state.items.push({
      id: genId3D(state),
      type,
      pos: { x, y: 0, z },
      amount,
      collected: false,
    });
  };

  // Gold piles
  addItem("gold_pile", 2, 8, 15);
  addItem("gold_pile", 25, -10, 10);
  addItem("gold_pile", -15, 30, 20);
  addItem("gold_pile", 50, -40, 25);

  // Health potions
  addItem("health_potion", 28, 0, 1);
  addItem("health_potion", -25, 8, 1);
  addItem("health_potion", 5, -25, 1);

  // Weapons
  addItem("axe", 10, -28, 1);
  addItem("mace", -28, 8, 1);
  addItem("spear", 5, -32, 1);
  addItem("bow", 30, -20, 1);
  addItem("crossbow", -32, -28, 1);

  // Treasure chests
  addItem("treasure_chest", -35, -35, 50);
  addItem("treasure_chest", -28, 28, 30);
  addItem("treasure_chest", 40, -45, 40);
  addItem("treasure_chest", 0, 90, 35);
}

// ---------------------------------------------------------------------------
// MedievalGTA3DGame orchestrator
// ---------------------------------------------------------------------------

export class MedievalGTA3DGame {
  private _state!: GTA3DState;
  private _renderer = new GTA3DRenderer();
  private _hud = new GTA3DHUD();
  private _rafId: number | null = null;
  private _lastTime = 0;
  private _simAccumulator = 0;

  // Input handlers
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _onKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private _onMouseMove: ((e: MouseEvent) => void) | null = null;
  private _onMouseDown: ((e: MouseEvent) => void) | null = null;
  private _onMouseUp: ((e: MouseEvent) => void) | null = null;
  private _onContextMenu: ((e: Event) => void) | null = null;
  private _onResize: (() => void) | null = null;

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    // Hide the pixi canvas if present
    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "none";

    // State
    this._state = createGTA3DState(sw, sh);
    populateWorld(this._state);

    // 3D renderer
    this._renderer.init(sw, sh);
    document.body.appendChild(this._renderer.canvas);

    // HUD
    this._hud.build(sw, sh, () => this.destroy());

    // Input
    this._registerInput();

    // Resize
    this._onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this._state.screenW = w;
      this._state.screenH = h;
      this._renderer.resize(w, h);
    };
    window.addEventListener("resize", this._onResize);

    // Start loop
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  // ---------------------------------------------------------------------------
  // Game Loop
  // ---------------------------------------------------------------------------

  private _gameLoop(timestamp: number): void {
    if (!this._state) return;

    const rawDt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    this._state.screenW = window.innerWidth;
    this._state.screenH = window.innerHeight;

    // Fixed timestep simulation
    if (!this._state.paused && !this._state.gameOver) {
      this._simAccumulator += rawDt;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        this._simTick(DT);
      }
    }

    // Render (always)
    this._renderer.update(this._state, rawDt);
    this._hud.update(this._state, rawDt);

    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _simTick(dt: number): void {
    const state = this._state;

    updatePlayer3D(state, dt);
    updateHorses3D(state, dt);
    updateNPCs3D(state, dt);
    updateCombat3D(state, dt);

    // Day/night
    state.dayTime = (state.dayTime + state.daySpeed * dt) % 1.0;
    state.gameTime += dt;
    state.tick++;

    // Item pickup
    this._updateItemPickup(state);
  }

  private _updateItemPickup(state: GTA3DState): void {
    const p = state.player;
    const range = GTA3D.PICKUP_RANGE;

    for (let i = state.items.length - 1; i >= 0; i--) {
      const item = state.items[i];
      if (item.collected) continue;

      const dx = item.pos.x - p.pos.x;
      const dz = item.pos.z - p.pos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > range) continue;

      item.collected = true;

      switch (item.type) {
        case "gold_pile":
          p.gold += item.amount;
          addNotification3D(state, `+${item.amount} gold`, 0xffdd44);
          break;
        case "health_potion":
          p.hp = Math.min(p.maxHp, p.hp + GTA3D.HEALTH_POTION_HEAL);
          addNotification3D(state, `+${GTA3D.HEALTH_POTION_HEAL} HP`, 0x44ff44);
          break;
        case "treasure_chest":
          p.gold += item.amount;
          addNotification3D(state, `Treasure! +${item.amount} gold!`, 0xffdd44);
          break;
        case "sword":
        case "axe":
        case "mace":
        case "spear":
        case "bow":
        case "crossbow": {
          const wt = item.type as typeof p.weapon;
          if (!p.weapons.includes(wt)) {
            p.weapons.push(wt);
          }
          p.weapon = wt;
          p.weaponIndex = p.weapons.indexOf(wt);
          addNotification3D(state, `Picked up ${item.type}!`, 0xccccff);
          break;
        }
      }

      state.items.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private _registerInput(): void {
    const state = this._state;

    this._onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      state.keys.add(key);

      if (state.gameOver && key === "r") {
        this._restart();
        return;
      }

      if (key === "escape" || key === "p") {
        state.paused = !state.paused;
      }

      // Weapon switching 1-7
      const weaponKeys: Record<string, number> = {
        "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5, "7": 6,
      };
      const wi = weaponKeys[key];
      if (wi !== undefined && !state.paused && !state.gameOver) {
        if (wi < state.player.weapons.length) {
          state.player.weaponIndex = wi;
          state.player.weapon = state.player.weapons[wi];
          addNotification3D(state, `Switched to ${state.player.weapon}`, 0xcccccc);
        } else {
          addNotification3D(state, `Weapon slot ${wi + 1} empty`, 0xff4444);
        }
      }
    };

    this._onKeyUp = (e: KeyboardEvent) => {
      state.keys.delete(e.key.toLowerCase());
    };

    this._onMouseMove = (e: MouseEvent) => {
      state.mouseX = e.clientX;
      state.mouseY = e.clientY;
    };

    this._onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) state.mouseDown = true;
      if (e.button === 2) state.rightMouseDown = true;
    };

    this._onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) state.mouseDown = false;
      if (e.button === 2) state.rightMouseDown = false;
    };

    this._onContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    window.addEventListener("contextmenu", this._onContextMenu);
  }

  private _unregisterInput(): void {
    if (this._onKeyDown) window.removeEventListener("keydown", this._onKeyDown);
    if (this._onKeyUp) window.removeEventListener("keyup", this._onKeyUp);
    if (this._onMouseMove) window.removeEventListener("mousemove", this._onMouseMove);
    if (this._onMouseDown) window.removeEventListener("mousedown", this._onMouseDown);
    if (this._onMouseUp) window.removeEventListener("mouseup", this._onMouseUp);
    if (this._onContextMenu) window.removeEventListener("contextmenu", this._onContextMenu);
    if (this._onResize) window.removeEventListener("resize", this._onResize);
  }

  // ---------------------------------------------------------------------------
  // Restart
  // ---------------------------------------------------------------------------

  private _restart(): void {
    const sw = this._state.screenW;
    const sh = this._state.screenH;
    this._state = createGTA3DState(sw, sh);
    populateWorld(this._state);
    this._simAccumulator = 0;
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    this._unregisterInput();
    this._renderer.cleanup();
    this._hud.cleanup();

    // Re-show pixi canvas
    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "";

    // Dispatch exit event
    window.dispatchEvent(new Event("medievalGTA3DExit"));
  }
}
