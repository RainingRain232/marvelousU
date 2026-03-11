// ---------------------------------------------------------------------------
// Warband mode – weapon definitions
// ---------------------------------------------------------------------------

export type WeaponCategory =
  | "one_handed"
  | "two_handed"
  | "polearm"
  | "bow"
  | "crossbow"
  | "thrown"
  | "shield";

export interface WeaponDef {
  id: string;
  name: string;
  category: WeaponCategory;
  damage: number;
  speed: number; // attack speed multiplier (1 = normal)
  reach: number; // melee range in world units
  weight: number; // affects movement penalty
  cost: number;

  // Ranged-specific
  projectileSpeed?: number;
  ammo?: number;
  accuracy?: number; // 0-1, affects spread
  drawTime?: number; // ticks to draw bow / reload crossbow

  // Shield-specific
  blockArc?: number; // radians of protection arc
  shieldHp?: number;

  // Visual
  length: number; // visual length
  color: number; // primary color
  accentColor?: number;
  shieldShape?: "round" | "rect"; // shield face shape (default round)
}

// ---- Melee: One-Handed Swords ----

const SHORT_SWORD: WeaponDef = {
  id: "short_sword",
  name: "Short Sword",
  category: "one_handed",
  damage: 25,
  speed: 1.3,
  reach: 1.0,
  weight: 1.5,
  cost: 60,
  length: 0.7,
  color: 0xc0c0c0,
  accentColor: 0x8b4513,
};

const ARMING_SWORD: WeaponDef = {
  id: "arming_sword",
  name: "Arming Sword",
  category: "one_handed",
  damage: 30,
  speed: 1.1,
  reach: 1.1,
  weight: 2.0,
  cost: 120,
  length: 0.85,
  color: 0xd4d4d4,
  accentColor: 0x8b4513,
};

const FALCHION: WeaponDef = {
  id: "falchion",
  name: "Falchion",
  category: "one_handed",
  damage: 34,
  speed: 1.0,
  reach: 1.0,
  weight: 2.2,
  cost: 150,
  length: 0.8,
  color: 0xb0b0b0,
  accentColor: 0x654321,
};

const MACE: WeaponDef = {
  id: "mace",
  name: "Mace",
  category: "one_handed",
  damage: 32,
  speed: 0.9,
  reach: 0.9,
  weight: 3.0,
  cost: 100,
  length: 0.65,
  color: 0x888888,
  accentColor: 0x555555,
};

const WAR_AXE: WeaponDef = {
  id: "war_axe",
  name: "War Axe",
  category: "one_handed",
  damage: 36,
  speed: 0.85,
  reach: 0.95,
  weight: 2.8,
  cost: 130,
  length: 0.75,
  color: 0x999999,
  accentColor: 0x654321,
};

const MORNING_STAR: WeaponDef = {
  id: "morning_star",
  name: "Morning Star",
  category: "one_handed",
  damage: 38,
  speed: 0.8,
  reach: 1.0,
  weight: 3.5,
  cost: 180,
  length: 0.8,
  color: 0x777777,
  accentColor: 0x444444,
};

const SABRE: WeaponDef = {
  id: "sabre",
  name: "Sabre",
  category: "one_handed",
  damage: 28,
  speed: 1.35,
  reach: 1.05,
  weight: 1.8,
  cost: 140,
  length: 0.85,
  color: 0xd0d0d0,
  accentColor: 0x8b4513,
};

const FLANGED_MACE: WeaponDef = {
  id: "flanged_mace",
  name: "Flanged Mace",
  category: "one_handed",
  damage: 36,
  speed: 0.85,
  reach: 0.85,
  weight: 3.2,
  cost: 160,
  length: 0.65,
  color: 0x777777,
  accentColor: 0x555555,
};

const HAND_AXE: WeaponDef = {
  id: "hand_axe",
  name: "Hand Axe",
  category: "one_handed",
  damage: 28,
  speed: 1.15,
  reach: 0.8,
  weight: 2.0,
  cost: 50,
  length: 0.55,
  color: 0x888888,
  accentColor: 0x654321,
};

// ---- Melee: Two-Handed ----

const LONGSWORD: WeaponDef = {
  id: "longsword",
  name: "Longsword",
  category: "two_handed",
  damage: 42,
  speed: 0.9,
  reach: 1.4,
  weight: 3.5,
  cost: 250,
  length: 1.2,
  color: 0xd4d4d4,
  accentColor: 0x8b4513,
};

const GREATSWORD: WeaponDef = {
  id: "greatsword",
  name: "Greatsword",
  category: "two_handed",
  damage: 52,
  speed: 0.7,
  reach: 1.6,
  weight: 5.0,
  cost: 400,
  length: 1.5,
  color: 0xc8c8c8,
  accentColor: 0x8b4513,
};

const BATTLE_AXE: WeaponDef = {
  id: "battle_axe",
  name: "Battle Axe",
  category: "two_handed",
  damage: 55,
  speed: 0.65,
  reach: 1.3,
  weight: 5.5,
  cost: 350,
  length: 1.2,
  color: 0x999999,
  accentColor: 0x654321,
};

const WARHAMMER: WeaponDef = {
  id: "warhammer",
  name: "Warhammer",
  category: "two_handed",
  damage: 50,
  speed: 0.6,
  reach: 1.2,
  weight: 6.0,
  cost: 380,
  length: 1.1,
  color: 0x777777,
  accentColor: 0x555555,
};

const BARDICHE: WeaponDef = {
  id: "bardiche",
  name: "Bardiche",
  category: "two_handed",
  damage: 48,
  speed: 0.75,
  reach: 1.5,
  weight: 4.5,
  cost: 320,
  length: 1.4,
  color: 0xaaaaaa,
  accentColor: 0x654321,
};

const ZWEIHANDER: WeaponDef = {
  id: "zweihander",
  name: "Zweihander",
  category: "two_handed",
  damage: 58,
  speed: 0.6,
  reach: 1.7,
  weight: 6.0,
  cost: 500,
  length: 1.6,
  color: 0xc0c0c0,
  accentColor: 0x8b4513,
};

const MAUL: WeaponDef = {
  id: "maul",
  name: "Maul",
  category: "two_handed",
  damage: 60,
  speed: 0.5,
  reach: 1.2,
  weight: 7.0,
  cost: 420,
  length: 1.15,
  color: 0x666666,
  accentColor: 0x444444,
};

// ---- Polearms ----

const SPEAR: WeaponDef = {
  id: "spear",
  name: "Spear",
  category: "polearm",
  damage: 28,
  speed: 1.0,
  reach: 2.2,
  weight: 3.0,
  cost: 80,
  length: 2.0,
  color: 0xaaaaaa,
  accentColor: 0x8b6914,
};

const PIKE: WeaponDef = {
  id: "pike",
  name: "Pike",
  category: "polearm",
  damage: 35,
  speed: 0.7,
  reach: 2.8,
  weight: 4.5,
  cost: 200,
  length: 2.6,
  color: 0xbbbbbb,
  accentColor: 0x8b6914,
};

const HALBERD: WeaponDef = {
  id: "halberd",
  name: "Halberd",
  category: "polearm",
  damage: 45,
  speed: 0.65,
  reach: 2.4,
  weight: 5.0,
  cost: 350,
  length: 2.2,
  color: 0x999999,
  accentColor: 0x654321,
};

const LANCE: WeaponDef = {
  id: "lance",
  name: "Lance",
  category: "polearm",
  damage: 60,
  speed: 0.5,
  reach: 3.0,
  weight: 6.0,
  cost: 450,
  length: 2.8,
  color: 0xcccccc,
  accentColor: 0x8b6914,
};

const GLAIVE: WeaponDef = {
  id: "glaive",
  name: "Glaive",
  category: "polearm",
  damage: 40,
  speed: 0.8,
  reach: 2.0,
  weight: 3.5,
  cost: 280,
  length: 1.8,
  color: 0xaaaaaa,
  accentColor: 0x8b6914,
};

const BILLHOOK: WeaponDef = {
  id: "billhook",
  name: "Billhook",
  category: "polearm",
  damage: 38,
  speed: 0.75,
  reach: 2.1,
  weight: 4.0,
  cost: 220,
  length: 1.9,
  color: 0x999999,
  accentColor: 0x654321,
};

const VOULGE: WeaponDef = {
  id: "voulge",
  name: "Voulge",
  category: "polearm",
  damage: 43,
  speed: 0.7,
  reach: 2.3,
  weight: 4.5,
  cost: 300,
  length: 2.1,
  color: 0x888888,
  accentColor: 0x8b6914,
};

// ---- Ranged: Bows ----

const SHORT_BOW: WeaponDef = {
  id: "short_bow",
  name: "Short Bow",
  category: "bow",
  damage: 22,
  speed: 1.2,
  reach: 0.5,
  weight: 1.0,
  cost: 70,
  projectileSpeed: 35,
  ammo: 30,
  accuracy: 0.85,
  drawTime: 20,
  length: 0.9,
  color: 0x8b6914,
};

const LONG_BOW: WeaponDef = {
  id: "long_bow",
  name: "Long Bow",
  category: "bow",
  damage: 35,
  speed: 0.8,
  reach: 0.5,
  weight: 1.5,
  cost: 200,
  projectileSpeed: 45,
  ammo: 25,
  accuracy: 0.9,
  drawTime: 35,
  length: 1.4,
  color: 0x654321,
};

const WAR_BOW: WeaponDef = {
  id: "war_bow",
  name: "War Bow",
  category: "bow",
  damage: 42,
  speed: 0.6,
  reach: 0.5,
  weight: 2.0,
  cost: 350,
  projectileSpeed: 50,
  ammo: 20,
  accuracy: 0.92,
  drawTime: 45,
  length: 1.5,
  color: 0x4a3520,
};

const COMPOSITE_BOW: WeaponDef = {
  id: "composite_bow",
  name: "Composite Bow",
  category: "bow",
  damage: 30,
  speed: 1.0,
  reach: 0.5,
  weight: 1.2,
  cost: 160,
  projectileSpeed: 42,
  ammo: 25,
  accuracy: 0.88,
  drawTime: 25,
  length: 1.0,
  color: 0x7a5c2e,
};

// ---- Ranged: Crossbows ----

const LIGHT_CROSSBOW: WeaponDef = {
  id: "light_crossbow",
  name: "Light Crossbow",
  category: "crossbow",
  damage: 38,
  speed: 0.5,
  reach: 0.5,
  weight: 3.0,
  cost: 180,
  projectileSpeed: 55,
  ammo: 20,
  accuracy: 0.95,
  drawTime: 50,
  length: 0.7,
  color: 0x654321,
  accentColor: 0x888888,
};

const HEAVY_CROSSBOW: WeaponDef = {
  id: "heavy_crossbow",
  name: "Heavy Crossbow",
  category: "crossbow",
  damage: 55,
  speed: 0.3,
  reach: 0.5,
  weight: 5.0,
  cost: 400,
  projectileSpeed: 60,
  ammo: 15,
  accuracy: 0.97,
  drawTime: 80,
  length: 0.8,
  color: 0x4a3520,
  accentColor: 0x777777,
};

const ARBALEST: WeaponDef = {
  id: "arbalest",
  name: "Arbalest",
  category: "crossbow",
  damage: 65,
  speed: 0.2,
  reach: 0.5,
  weight: 6.0,
  cost: 550,
  projectileSpeed: 65,
  ammo: 12,
  accuracy: 0.98,
  drawTime: 100,
  length: 0.85,
  color: 0x3a2510,
  accentColor: 0x666666,
};

// ---- Thrown ----

const THROWING_KNIVES: WeaponDef = {
  id: "throwing_knives",
  name: "Throwing Knives",
  category: "thrown",
  damage: 18,
  speed: 1.5,
  reach: 0.3,
  weight: 0.5,
  cost: 40,
  projectileSpeed: 25,
  ammo: 8,
  accuracy: 0.8,
  drawTime: 8,
  length: 0.25,
  color: 0xc0c0c0,
};

const JAVELINS: WeaponDef = {
  id: "javelins",
  name: "Javelins",
  category: "thrown",
  damage: 35,
  speed: 0.9,
  reach: 1.2,
  weight: 2.0,
  cost: 100,
  projectileSpeed: 28,
  ammo: 4,
  accuracy: 0.75,
  drawTime: 15,
  length: 1.5,
  color: 0xaaaaaa,
  accentColor: 0x8b6914,
};

const THROWING_AXES: WeaponDef = {
  id: "throwing_axes",
  name: "Throwing Axes",
  category: "thrown",
  damage: 40,
  speed: 0.8,
  reach: 0.4,
  weight: 1.5,
  cost: 120,
  projectileSpeed: 22,
  ammo: 5,
  accuracy: 0.7,
  drawTime: 12,
  length: 0.4,
  color: 0x888888,
  accentColor: 0x654321,
};

// ---- Shields ----

const BUCKLER: WeaponDef = {
  id: "buckler",
  name: "Buckler",
  category: "shield",
  damage: 5,
  speed: 1.0,
  reach: 0.3,
  weight: 1.5,
  cost: 50,
  blockArc: Math.PI * 0.4,
  shieldHp: 80,
  length: 0.3,
  color: 0x8b6914,
};

const ROUND_SHIELD: WeaponDef = {
  id: "round_shield",
  name: "Round Shield",
  category: "shield",
  damage: 8,
  speed: 0.9,
  reach: 0.4,
  weight: 3.0,
  cost: 100,
  blockArc: Math.PI * 0.6,
  shieldHp: 150,
  length: 0.5,
  color: 0x8b4513,
  accentColor: 0xdaa520,
};

const HEATER_SHIELD: WeaponDef = {
  id: "heater_shield",
  name: "Heater Shield",
  category: "shield",
  damage: 10,
  speed: 0.85,
  reach: 0.45,
  weight: 4.0,
  cost: 180,
  blockArc: Math.PI * 0.7,
  shieldHp: 200,
  length: 0.6,
  color: 0x2244aa,
  accentColor: 0xdaa520,
};

const KITE_SHIELD: WeaponDef = {
  id: "kite_shield",
  name: "Kite Shield",
  category: "shield",
  damage: 12,
  speed: 0.8,
  reach: 0.5,
  weight: 5.0,
  cost: 250,
  blockArc: Math.PI * 0.8,
  shieldHp: 280,
  length: 0.75,
  color: 0xaa2222,
  accentColor: 0xdaa520,
};

const TOWER_SHIELD: WeaponDef = {
  id: "tower_shield",
  name: "Tower Shield",
  category: "shield",
  damage: 15,
  speed: 0.6,
  reach: 0.5,
  weight: 8.0,
  cost: 350,
  blockArc: Math.PI * 1.0,
  shieldHp: 400,
  length: 0.9,
  color: 0x555555,
  accentColor: 0xbbbbbb,
};

const TARGE: WeaponDef = {
  id: "targe",
  name: "Targe",
  category: "shield",
  damage: 6,
  speed: 1.0,
  reach: 0.35,
  weight: 2.0,
  cost: 70,
  blockArc: Math.PI * 0.5,
  shieldHp: 100,
  length: 0.35,
  color: 0x654321,
  accentColor: 0xdaa520,
};

const PAVISE: WeaponDef = {
  id: "pavise",
  name: "Pavise",
  category: "shield",
  damage: 12,
  speed: 0.55,
  reach: 0.5,
  weight: 9.0,
  cost: 400,
  blockArc: Math.PI * 1.0,
  shieldHp: 450,
  length: 0.95,
  color: 0x443322,
  accentColor: 0xbbbbbb,
  shieldShape: "rect",
};

const SCUTUM: WeaponDef = {
  id: "scutum",
  name: "Scutum",
  category: "shield",
  damage: 14,
  speed: 0.65,
  reach: 0.5,
  weight: 7.0,
  cost: 300,
  blockArc: Math.PI * 0.9,
  shieldHp: 350,
  length: 0.85,
  color: 0xaa2222,
  accentColor: 0xdaa520,
  shieldShape: "rect",
};

const NORMAN_SHIELD: WeaponDef = {
  id: "norman_shield",
  name: "Norman Shield",
  category: "shield",
  damage: 10,
  speed: 0.75,
  reach: 0.45,
  weight: 5.5,
  cost: 220,
  blockArc: Math.PI * 0.75,
  shieldHp: 250,
  length: 0.7,
  color: 0x2266aa,
  accentColor: 0xcccccc,
  shieldShape: "rect",
};

// ---- All weapons map ----

export const WEAPON_DEFS: Record<string, WeaponDef> = {
  // One-handed
  short_sword: SHORT_SWORD,
  arming_sword: ARMING_SWORD,
  falchion: FALCHION,
  sabre: SABRE,
  mace: MACE,
  flanged_mace: FLANGED_MACE,
  war_axe: WAR_AXE,
  hand_axe: HAND_AXE,
  morning_star: MORNING_STAR,

  // Two-handed
  longsword: LONGSWORD,
  greatsword: GREATSWORD,
  zweihander: ZWEIHANDER,
  battle_axe: BATTLE_AXE,
  warhammer: WARHAMMER,
  maul: MAUL,
  bardiche: BARDICHE,

  // Polearms
  spear: SPEAR,
  pike: PIKE,
  halberd: HALBERD,
  lance: LANCE,
  glaive: GLAIVE,
  billhook: BILLHOOK,
  voulge: VOULGE,

  // Bows
  short_bow: SHORT_BOW,
  long_bow: LONG_BOW,
  composite_bow: COMPOSITE_BOW,
  war_bow: WAR_BOW,

  // Crossbows
  light_crossbow: LIGHT_CROSSBOW,
  heavy_crossbow: HEAVY_CROSSBOW,
  arbalest: ARBALEST,

  // Thrown
  throwing_knives: THROWING_KNIVES,
  javelins: JAVELINS,
  throwing_axes: THROWING_AXES,

  // Shields
  buckler: BUCKLER,
  targe: TARGE,
  round_shield: ROUND_SHIELD,
  heater_shield: HEATER_SHIELD,
  norman_shield: NORMAN_SHIELD,
  kite_shield: KITE_SHIELD,
  scutum: SCUTUM,
  tower_shield: TOWER_SHIELD,
  pavise: PAVISE,
};

export const WEAPON_IDS = Object.keys(WEAPON_DEFS);

/** Get all weapons by category */
export function getWeaponsByCategory(cat: WeaponCategory): WeaponDef[] {
  return Object.values(WEAPON_DEFS).filter((w) => w.category === cat);
}

/** Check if weapon is ranged */
export function isRangedWeapon(w: WeaponDef): boolean {
  return w.category === "bow" || w.category === "crossbow" || w.category === "thrown";
}

/** Check if weapon is melee */
export function isMeleeWeapon(w: WeaponDef): boolean {
  return (
    w.category === "one_handed" ||
    w.category === "two_handed" ||
    w.category === "polearm"
  );
}
