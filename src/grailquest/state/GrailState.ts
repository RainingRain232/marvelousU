// ---------------------------------------------------------------------------
// Grail Quest — State factory & persistence
// ---------------------------------------------------------------------------

import { GrailPhase, TileType, WeaponId, ArmorId, RelicId } from "../types";
import type { GrailState, GrailMeta, GrailUpgrades, DungeonFloor, Weapon, Armor, Relic, ItemStack } from "../types";
import { ItemKind } from "../types";
import { GRAIL_BALANCE as B } from "../config/GrailBalance";

const META_KEY = "grail_meta";

const DEFAULT_UPGRADES: GrailUpgrades = {
  sturdierStart: 0,
  sharperBlade: 0,
  trapSense: 0,
  luckyFind: 0,
  deepPockets: 0,
  squireBlessing: 0,
};

// ---------------------------------------------------------------------------
// Meta persistence
// ---------------------------------------------------------------------------

export function loadGrailMeta(): GrailMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as GrailMeta;
      // Ensure upgrades object exists
      if (!m.upgrades) m.upgrades = { ...DEFAULT_UPGRADES };
      // Migrate any missing fields
      if (m.shards === undefined) m.shards = 0;
      if (m.totalRuns === undefined) m.totalRuns = 0;
      if (m.totalKills === undefined) m.totalKills = 0;
      if (m.totalFloors === undefined) m.totalFloors = 0;
      if (m.grailsFound === undefined) m.grailsFound = 0;
      if (m.upgrades.sturdierStart === undefined) m.upgrades.sturdierStart = 0;
      if (m.upgrades.sharperBlade === undefined) m.upgrades.sharperBlade = 0;
      if (m.upgrades.trapSense === undefined) m.upgrades.trapSense = 0;
      if (m.upgrades.luckyFind === undefined) m.upgrades.luckyFind = 0;
      if (m.upgrades.deepPockets === undefined) m.upgrades.deepPockets = 0;
      if (m.upgrades.squireBlessing === undefined) m.upgrades.squireBlessing = 0;
      return m;
    }
  } catch { /* ignore corrupt data */ }
  return {
    highScore: 0,
    totalRuns: 0,
    totalKills: 0,
    totalFloors: 0,
    grailsFound: 0,
    shards: 0,
    upgrades: { ...DEFAULT_UPGRADES },
  };
}

export function saveGrailMeta(meta: GrailMeta): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// State factory
// ---------------------------------------------------------------------------

function makeEmptyDungeon(): DungeonFloor {
  const cols = B.COLS;
  const rows = B.ROWS;
  const tiles: TileType[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < cols; x++) row.push(TileType.WALL);
    tiles.push(row);
  }
  return {
    tiles, rooms: [], cols, rows,
    stairsX: 0, stairsY: 0,
    spawnX: 1, spawnY: 1,
  };
}

function makeVisibilityGrid(cols: number, rows: number, value: boolean): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < cols; x++) row.push(value);
    grid.push(row);
  }
  return grid;
}

function defaultWeapon(): Weapon {
  return { id: WeaponId.RUSTY_SWORD, name: "Rusty Sword", damage: 1, range: 1, effect: "" };
}

function defaultArmor(): Armor {
  return { id: ArmorId.LEATHER, name: "Leather Armor", defense: 1, perceptionMod: 0 };
}

function noRelic(): Relic {
  return { id: RelicId.NONE, name: "None", desc: "" };
}

export function createGrailState(meta: GrailMeta): GrailState {
  const up = meta.upgrades;

  // Apply meta upgrades to base stats
  const maxHp = B.PLAYER_BASE_HP + up.sturdierStart * B.UPGRADE_HP_PER_LEVEL;
  const attack = B.PLAYER_BASE_ATTACK + up.sharperBlade * B.UPGRADE_ATTACK_PER_LEVEL;
  const perception = B.PLAYER_BASE_PERCEPTION + up.trapSense * B.UPGRADE_PERCEPTION_PER_LEVEL;
  const inventorySlots = B.BASE_INVENTORY_SLOTS + up.deepPockets * B.UPGRADE_SLOTS_PER_LEVEL;

  const dungeon = makeEmptyDungeon();
  const inventory: (ItemStack | null)[] = [];
  for (let i = 0; i < inventorySlots; i++) inventory.push(null);

  // Squire blessing: start with a healing potion
  if (up.squireBlessing > 0) {
    inventory[0] = { kind: ItemKind.HEALING_POTION, count: 1 };
  }

  return {
    phase: GrailPhase.START,
    floor: 1,
    dungeon,
    visible: makeVisibilityGrid(B.COLS, B.ROWS, false),
    explored: makeVisibilityGrid(B.COLS, B.ROWS, false),

    // Player
    playerX: dungeon.spawnX,
    playerY: dungeon.spawnY,
    playerHp: maxHp,
    playerMaxHp: maxHp,
    playerAttack: attack,
    playerDefense: B.PLAYER_BASE_DEFENSE,
    playerPerception: perception,
    playerXp: 0,
    playerLevel: 1,
    playerXpToNext: B.XP_PER_LEVEL,
    weapon: defaultWeapon(),
    armor: defaultArmor(),
    relic: noRelic(),
    inventory,
    keys: 0,
    gold: 0,
    shieldCharges: 0,
    speedTurns: 0,
    phoenixUsed: false,

    // Entities
    entities: [],
    projectiles: [],
    entityIdCounter: 0,

    // Visual state
    particles: [],
    floatTexts: [],
    screenShake: 0,
    screenFlash: 0,
    turnAnimating: false,
    animTimer: 0,
    lastMoveDir: { dx: 0, dy: 0 },

    // Level up
    levelUpChoices: [],

    // Stats
    enemiesKilled: 0,
    floorsCleared: 0,
    itemsUsed: 0,
    damageDealt: 0,
    damageTaken: 0,
    chestsOpened: 0,
    trapsTriggered: 0,

    // Turn counter
    turnCount: 0,

    // Torch mechanic
    torchTurns: B.TORCH_DURATION,

    // Auto-explore
    autoExploring: false,

    // Messages
    messages: [],
  };
}
