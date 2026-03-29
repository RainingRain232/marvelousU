// ---------------------------------------------------------------------------
// Siege mode — tower defense configuration
// ---------------------------------------------------------------------------

export type TowerType = "arrow" | "cannon" | "frost" | "fire" | "holy" | "poison" | "lightning" | "ballista";
export type EnemyType = "soldier" | "knight" | "cavalry" | "battering_ram" | "siege_tower" | "mage" | "assassin" | "giant";

export interface TowerDef {
  id: TowerType;
  name: string;
  desc: string;
  cost: number;
  damage: number;
  range: number; // tiles
  fireRate: number; // shots/sec
  color: number;
  projectileColor: number;
  projectileSpeed: number;
  splashRadius: number; // 0 = single target
  slowAmount: number; // 0-1, fraction of speed reduction
  slowDuration: number; // seconds
}

export interface EnemyDef {
  id: EnemyType;
  name: string;
  hp: number;
  speed: number; // tiles/sec
  armor: number; // damage reduction
  reward: number; // gold on kill
  color: number;
  size: number; // radius multiplier
  flying: boolean;
  boss: boolean;
}

export interface WaveDef {
  enemies: { type: EnemyType; count: number; interval: number }[];
  bonusGold: number;
}

export const TOWERS: Record<TowerType, TowerDef> = {
  arrow: { id: "arrow", name: "Arrow Tower", desc: "Fast, cheap. Single target.", cost: 50, damage: 8, range: 3.5, fireRate: 1.5, color: 0x886644, projectileColor: 0xccaa66, projectileSpeed: 8, splashRadius: 0, slowAmount: 0, slowDuration: 0 },
  cannon: { id: "cannon", name: "Cannon Tower", desc: "Slow, area damage.", cost: 100, damage: 25, range: 3, fireRate: 0.5, color: 0x555555, projectileColor: 0x444444, projectileSpeed: 5, splashRadius: 1.2, slowAmount: 0, slowDuration: 0 },
  frost: { id: "frost", name: "Frost Tower", desc: "Slows enemies.", cost: 75, damage: 5, range: 3, fireRate: 1, color: 0x4488cc, projectileColor: 0x88ccff, projectileSpeed: 6, splashRadius: 0.8, slowAmount: 0.5, slowDuration: 2 },
  fire: { id: "fire", name: "Fire Tower", desc: "Burns over time.", cost: 90, damage: 15, range: 2.5, fireRate: 0.8, color: 0xcc4422, projectileColor: 0xff6633, projectileSpeed: 7, splashRadius: 0.6, slowAmount: 0, slowDuration: 0 },
  holy: { id: "holy", name: "Holy Tower", desc: "Bonus vs undead.", cost: 120, damage: 20, range: 4, fireRate: 0.6, color: 0xffdd44, projectileColor: 0xffffff, projectileSpeed: 10, splashRadius: 0, slowAmount: 0, slowDuration: 0 },
  poison: { id: "poison", name: "Poison Tower", desc: "Damage over time.", cost: 80, damage: 3, range: 2.5, fireRate: 1.2, color: 0x44aa44, projectileColor: 0x66cc44, projectileSpeed: 6, splashRadius: 0.8, slowAmount: 0.2, slowDuration: 3 },
  lightning: { id: "lightning", name: "Lightning Tower", desc: "Chain damage jumps between enemies.", cost: 110, damage: 12, range: 3.5, fireRate: 1.0, color: 0x44aaff, projectileColor: 0x88ddff, projectileSpeed: 12, splashRadius: 0, slowAmount: 0, slowDuration: 0 },
  ballista: { id: "ballista", name: "Ballista Tower", desc: "Extreme single-target, piercing.", cost: 150, damage: 45, range: 5, fireRate: 0.3, color: 0x996633, projectileColor: 0x664422, projectileSpeed: 14, splashRadius: 0, slowAmount: 0, slowDuration: 0 },
};

export const ENEMIES: Record<EnemyType, EnemyDef> = {
  soldier:       { id: "soldier",       name: "Soldier",       hp: 40,  speed: 1.2, armor: 0,  reward: 5,  color: 0x886644, size: 1.6,  flying: false, boss: false },
  knight:        { id: "knight",        name: "Knight",        hp: 100, speed: 0.8, armor: 3,  reward: 10, color: 0x888899, size: 1.9, flying: false, boss: false },
  cavalry:       { id: "cavalry",       name: "Cavalry",       hp: 60,  speed: 2.0, armor: 1,  reward: 8,  color: 0xaa8855, size: 2.0, flying: false, boss: false },
  battering_ram: { id: "battering_ram", name: "Battering Ram",  hp: 200, speed: 0.5, armor: 5,  reward: 20, color: 0x664422, size: 2.8, flying: false, boss: false },
  siege_tower:   { id: "siege_tower",   name: "Siege Tower",   hp: 300, speed: 0.3, armor: 8,  reward: 30, color: 0x554433, size: 3.0, flying: false, boss: false },
  mage:          { id: "mage",          name: "Mage",          hp: 30,  speed: 1.0, armor: 0,  reward: 12, color: 0x6644aa, size: 1.6, flying: false, boss: false },
  assassin:      { id: "assassin",      name: "Assassin",      hp: 25,  speed: 2.5, armor: 0,  reward: 15, color: 0x333344, size: 1.3, flying: false, boss: false },
  giant:         { id: "giant",         name: "Giant",         hp: 500, speed: 0.4, armor: 10, reward: 50, color: 0x886666, size: 3.5, flying: false, boss: true },
};

export const WAVES: WaveDef[] = [
  { enemies: [{ type: "soldier", count: 8, interval: 1.0 }], bonusGold: 20 },
  { enemies: [{ type: "soldier", count: 10, interval: 0.9 }, { type: "knight", count: 2, interval: 2 }], bonusGold: 25 },
  { enemies: [{ type: "cavalry", count: 6, interval: 0.8 }, { type: "soldier", count: 8, interval: 1 }], bonusGold: 30 },
  { enemies: [{ type: "knight", count: 6, interval: 1.2 }, { type: "mage", count: 3, interval: 2 }], bonusGold: 35 },
  { enemies: [{ type: "battering_ram", count: 2, interval: 3 }, { type: "soldier", count: 12, interval: 0.7 }], bonusGold: 40 },
  { enemies: [{ type: "cavalry", count: 8, interval: 0.6 }, { type: "knight", count: 4, interval: 1.5 }], bonusGold: 45 },
  { enemies: [{ type: "assassin", count: 8, interval: 0.5 }, { type: "mage", count: 5, interval: 1.5 }], bonusGold: 50 },
  { enemies: [{ type: "siege_tower", count: 2, interval: 4 }, { type: "knight", count: 8, interval: 1 }], bonusGold: 60 },
  { enemies: [{ type: "battering_ram", count: 3, interval: 2.5 }, { type: "cavalry", count: 10, interval: 0.5 }, { type: "mage", count: 4, interval: 2 }], bonusGold: 70 },
  { enemies: [{ type: "giant", count: 1, interval: 0 }, { type: "knight", count: 10, interval: 0.8 }, { type: "assassin", count: 6, interval: 0.6 }], bonusGold: 100 },
  // Wave 11: Mixed cavalry + assassin swarm
  { enemies: [{ type: "cavalry", count: 14, interval: 0.4 }, { type: "assassin", count: 12, interval: 0.3 }], bonusGold: 110 },
  // Wave 12: Multiple siege towers with mage support
  { enemies: [{ type: "siege_tower", count: 4, interval: 3 }, { type: "mage", count: 10, interval: 1.0 }], bonusGold: 130 },
  // Wave 13: Mass knights with battering rams
  { enemies: [{ type: "knight", count: 20, interval: 0.6 }, { type: "battering_ram", count: 5, interval: 2.0 }], bonusGold: 150 },
  // Wave 14: Everything mixed, fast spawns
  { enemies: [{ type: "soldier", count: 15, interval: 0.3 }, { type: "knight", count: 10, interval: 0.4 }, { type: "cavalry", count: 8, interval: 0.3 }, { type: "mage", count: 6, interval: 0.5 }, { type: "assassin", count: 8, interval: 0.3 }], bonusGold: 180 },
  // Wave 15: Double giant boss + elite escorts
  { enemies: [{ type: "giant", count: 2, interval: 5 }, { type: "knight", count: 15, interval: 0.5 }, { type: "siege_tower", count: 3, interval: 3 }, { type: "mage", count: 8, interval: 0.8 }], bonusGold: 250 },
];

export const SiegeConfig = {
  GRID_COLS: 20,
  GRID_ROWS: 12,
  TILE_SIZE: 36,
  STARTING_GOLD: 200,
  STARTING_LIVES: 20,
  WAVE_DELAY: 8, // seconds between waves
  SELL_REFUND: 0.6,
} as const;

/** Mutable tile size — recomputed each game boot to fill the screen. */
export let TILE_SZ: number = SiegeConfig.TILE_SIZE;
export function setTileSize(sw: number, sh: number): void {
  const panelW = 380;
  const topBar = 70;
  const maxW = Math.floor((sw - panelW - 30) / SiegeConfig.GRID_COLS);
  const maxH = Math.floor((sh - topBar - 20) / SiegeConfig.GRID_ROWS);
  TILE_SZ = Math.max(48, Math.min(maxW, maxH));
}

export const ALL_TOWER_TYPES: TowerType[] = ["arrow", "cannon", "frost", "fire", "holy", "poison", "lightning", "ballista"];

// Damage multiplier matrix: TOWER_EFFECTIVENESS[towerType][enemyType]
// Values > 1 = strong against, < 1 = weak against, 1 = neutral
export const TOWER_EFFECTIVENESS: Partial<Record<TowerType, Partial<Record<EnemyType, number>>>> = {
  arrow:  { assassin: 1.5, cavalry: 1.3, siege_tower: 0.5 },
  cannon: { battering_ram: 1.8, siege_tower: 1.5, knight: 1.3, assassin: 0.6 },
  frost:  { cavalry: 1.5, assassin: 1.4, battering_ram: 0.7 },
  fire:   { soldier: 1.3, mage: 1.5, knight: 0.7 },
  holy:   { mage: 2.0, giant: 1.5, soldier: 0.8 },
  poison: { knight: 1.4, giant: 1.3, mage: 0.7 },
  lightning: { cavalry: 1.4, soldier: 1.3, giant: 0.6, siege_tower: 0.7 },
  ballista: { giant: 1.8, siege_tower: 1.6, battering_ram: 1.5, assassin: 0.5, soldier: 0.7 },
};

// Tower special abilities unlocked at levels 3 and 5
export const TOWER_ABILITIES: Record<TowerType, { lv3: string; lv5: string; lv3Desc: string; lv5Desc: string }> = {
  arrow:  { lv3: "multishot",  lv5: "piercing",     lv3Desc: "Hits 2 targets",     lv5Desc: "Ignores armor" },
  cannon: { lv3: "shrapnel",   lv5: "earthquake",   lv3Desc: "+50% splash radius",  lv5Desc: "Stuns hit enemies 1s" },
  frost:  { lv3: "blizzard",   lv5: "permafrost",   lv3Desc: "+100% slow duration", lv5Desc: "80% slow (was 50%)" },
  fire:   { lv3: "inferno",    lv5: "wildfire",     lv3Desc: "Burns for 3s after",  lv5Desc: "Fire spreads to nearby" },
  holy:   { lv3: "smite",      lv5: "divine_wrath", lv3Desc: "+100% vs bosses",     lv5Desc: "Heals 1 life on kill" },
  poison:    { lv3: "virulence",  lv5: "plague",       lv3Desc: "Poison stacks",       lv5Desc: "Spreads to nearby" },
  lightning: { lv3: "arc",       lv5: "storm",        lv3Desc: "Chains to 3 targets", lv5Desc: "Chains to 4, +30% dmg" },
  ballista:  { lv3: "heavy_bolt", lv5: "siege_bolt",  lv3Desc: "Pierces 3 enemies",  lv5Desc: "Pierces all, +50% dmg" },
};

// Wave modifiers (random per wave)
export type WaveModifier = "none" | "fast" | "armored" | "horde" | "rich" | "boss_rush" | "regen" | "shielded";
export const WAVE_MODIFIER_DEFS: Record<WaveModifier, { name: string; desc: string; color: number }> = {
  none:      { name: "",             desc: "",                          color: 0x888888 },
  fast:      { name: "Swift Wave",   desc: "Enemies +50% speed",       color: 0x44ccff },
  armored:   { name: "Iron Wave",    desc: "Enemies +5 armor",         color: 0x888899 },
  horde:     { name: "Horde Wave",   desc: "+50% enemy count",         color: 0xff8844 },
  rich:      { name: "Golden Wave",  desc: "Double gold rewards",      color: 0xffd700 },
  boss_rush: { name: "Boss Rush",    desc: "Extra boss spawns",        color: 0xff4444 },
  regen:     { name: "Regen Wave",   desc: "Enemies regen 1% HP/sec",  color: 0x44ff88 },
  shielded:  { name: "Shielded Wave", desc: "Enemies absorb first 20 dmg", color: 0x8888ff },
};

export type Difficulty = "easy" | "normal" | "hard";
export const DIFFICULTY_MULT: Record<Difficulty, { hp: number; speed: number; reward: number; label: string; color: number }> = {
  easy:   { hp: 0.7, speed: 0.85, reward: 1.3, label: "Apprentice", color: 0x44aa44 },
  normal: { hp: 1.0, speed: 1.0,  reward: 1.0, label: "Knight",     color: 0xccaa44 },
  hard:   { hp: 1.5, speed: 1.15, reward: 0.8, label: "Warlord",    color: 0xff4444 },
};
