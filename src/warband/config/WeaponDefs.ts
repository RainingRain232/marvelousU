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
  | "shield"
  | "staff";

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

  // Oversized (for large units only, not available in shop)
  oversized?: boolean;
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

// ---- Staves (mages & clergy) ----

const FIRE_STAFF: WeaponDef = {
  id: "fire_staff", name: "Fire Staff", category: "staff",
  damage: 15, speed: 0.8, reach: 1.5, weight: 2.0, cost: 80,
  projectileSpeed: 40, ammo: 20, accuracy: 0.9, drawTime: 25,
  length: 1.6, color: 0x8b4513, accentColor: 0xff3300,
};
const STORM_STAFF: WeaponDef = {
  id: "storm_staff", name: "Storm Staff", category: "staff",
  damage: 15, speed: 0.8, reach: 1.5, weight: 2.0, cost: 80,
  projectileSpeed: 40, ammo: 20, accuracy: 0.9, drawTime: 25,
  length: 1.6, color: 0x8b4513, accentColor: 0x66ccff,
};
const COLD_STAFF: WeaponDef = {
  id: "cold_staff", name: "Cold Staff", category: "staff",
  damage: 15, speed: 0.8, reach: 1.5, weight: 2.0, cost: 80,
  projectileSpeed: 40, ammo: 20, accuracy: 0.9, drawTime: 25,
  length: 1.6, color: 0x8b4513, accentColor: 0x88ddff,
};
const DISTORTION_STAFF: WeaponDef = {
  id: "distortion_staff", name: "Distortion Staff", category: "staff",
  damage: 15, speed: 0.8, reach: 1.5, weight: 2.0, cost: 80,
  projectileSpeed: 40, ammo: 20, accuracy: 0.9, drawTime: 25,
  length: 1.6, color: 0x8b4513, accentColor: 0xaa44ff,
};
const HEALING_STAFF: WeaponDef = {
  id: "healing_staff", name: "Healing Staff", category: "staff",
  damage: 10, speed: 0.7, reach: 1.5, weight: 1.5, cost: 60,
  projectileSpeed: 38, ammo: 18, accuracy: 0.88, drawTime: 28,
  length: 1.6, color: 0x8b4513, accentColor: 0xffffff,
};
const FIRE_ADEPT_STAFF: WeaponDef = {
  id: "fire_adept_staff", name: "Fire Adept Staff", category: "staff",
  damage: 22, speed: 0.75, reach: 1.6, weight: 2.5, cost: 180,
  projectileSpeed: 44, ammo: 22, accuracy: 0.92, drawTime: 22,
  length: 1.7, color: 0x654321, accentColor: 0xff3300,
};
const COLD_ADEPT_STAFF: WeaponDef = {
  id: "cold_adept_staff", name: "Cold Adept Staff", category: "staff",
  damage: 22, speed: 0.75, reach: 1.6, weight: 2.5, cost: 180,
  projectileSpeed: 44, ammo: 22, accuracy: 0.92, drawTime: 22,
  length: 1.7, color: 0x654321, accentColor: 0x88ddff,
};
const LIGHTNING_ADEPT_STAFF: WeaponDef = {
  id: "lightning_adept_staff", name: "Lightning Adept Staff", category: "staff",
  damage: 22, speed: 0.75, reach: 1.6, weight: 2.5, cost: 180,
  projectileSpeed: 44, ammo: 22, accuracy: 0.92, drawTime: 22,
  length: 1.7, color: 0x654321, accentColor: 0x66ccff,
};
const DISTORTION_ADEPT_STAFF: WeaponDef = {
  id: "distortion_adept_staff", name: "Distortion Adept Staff", category: "staff",
  damage: 22, speed: 0.75, reach: 1.6, weight: 2.5, cost: 180,
  projectileSpeed: 44, ammo: 22, accuracy: 0.92, drawTime: 22,
  length: 1.7, color: 0x654321, accentColor: 0xaa44ff,
};
const FIRE_MASTER_STAFF: WeaponDef = {
  id: "fire_master_staff", name: "Fire Master Staff", category: "staff",
  damage: 30, speed: 0.7, reach: 1.7, weight: 3.0, cost: 350,
  projectileSpeed: 48, ammo: 25, accuracy: 0.94, drawTime: 20,
  length: 1.8, color: 0x4a3520, accentColor: 0xff3300,
};
const COLD_MASTER_STAFF: WeaponDef = {
  id: "cold_master_staff", name: "Cold Master Staff", category: "staff",
  damage: 30, speed: 0.7, reach: 1.7, weight: 3.0, cost: 350,
  projectileSpeed: 48, ammo: 25, accuracy: 0.94, drawTime: 20,
  length: 1.8, color: 0x4a3520, accentColor: 0x88ddff,
};
const LIGHTNING_MASTER_STAFF: WeaponDef = {
  id: "lightning_master_staff", name: "Lightning Master Staff", category: "staff",
  damage: 30, speed: 0.7, reach: 1.7, weight: 3.0, cost: 350,
  projectileSpeed: 48, ammo: 25, accuracy: 0.94, drawTime: 20,
  length: 1.8, color: 0x4a3520, accentColor: 0x66ccff,
};
const DISTORTION_MASTER_STAFF: WeaponDef = {
  id: "distortion_master_staff", name: "Distortion Master Staff", category: "staff",
  damage: 30, speed: 0.7, reach: 1.7, weight: 3.0, cost: 350,
  projectileSpeed: 48, ammo: 25, accuracy: 0.94, drawTime: 20,
  length: 1.8, color: 0x4a3520, accentColor: 0xaa44ff,
};
const CLERIC_STAFF: WeaponDef = {
  id: "cleric_staff", name: "Cleric Staff", category: "staff",
  damage: 18, speed: 0.75, reach: 1.5, weight: 2.0, cost: 120,
  projectileSpeed: 42, ammo: 20, accuracy: 0.9, drawTime: 24,
  length: 1.6, color: 0xccccbb, accentColor: 0xffffff,
};
const SAINT_STAFF: WeaponDef = {
  id: "saint_staff", name: "Saint Staff", category: "staff",
  damage: 25, speed: 0.7, reach: 1.6, weight: 2.5, cost: 300,
  projectileSpeed: 46, ammo: 24, accuracy: 0.93, drawTime: 20,
  length: 1.7, color: 0xeeeedd, accentColor: 0xffffff,
};
const SUMMONER_STAFF: WeaponDef = {
  id: "summoner_staff", name: "Summoner Staff", category: "staff",
  damage: 12, speed: 0.8, reach: 1.5, weight: 2.0, cost: 70,
  projectileSpeed: 38, ammo: 18, accuracy: 0.88, drawTime: 28,
  length: 1.6, color: 0x442266, accentColor: 0x8866aa,
};
const WARLOCK_STAFF: WeaponDef = {
  id: "warlock_staff", name: "Warlock Staff", category: "staff",
  damage: 20, speed: 0.75, reach: 1.6, weight: 2.5, cost: 150,
  projectileSpeed: 42, ammo: 20, accuracy: 0.9, drawTime: 24,
  length: 1.7, color: 0x332244, accentColor: 0xaa44ff,
};
const DARK_SAVANT_STAFF: WeaponDef = {
  id: "dark_savant_staff", name: "Dark Savant Staff", category: "staff",
  damage: 35, speed: 0.65, reach: 1.7, weight: 3.5, cost: 450,
  projectileSpeed: 50, ammo: 28, accuracy: 0.95, drawTime: 18,
  length: 1.8, color: 0x110000, accentColor: 0xff4422,
};
const BATTLEMAGE_STAFF: WeaponDef = {
  id: "battlemage_staff", name: "Battlemage Staff", category: "staff",
  damage: 45, speed: 0.6, reach: 1.8, weight: 4.0, cost: 600,
  projectileSpeed: 52, ammo: 30, accuracy: 0.95, drawTime: 16,
  length: 1.9, color: 0x441111, accentColor: 0xff6600,
};
const CONSTRUCTIONIST_STAFF: WeaponDef = {
  id: "constructionist_staff", name: "Constructionist Staff", category: "staff",
  damage: 18, speed: 0.8, reach: 1.5, weight: 2.5, cost: 100,
  projectileSpeed: 40, ammo: 20, accuracy: 0.9, drawTime: 25,
  length: 1.6, color: 0x886644, accentColor: 0xffaa00,
};

// ---- Oversized weapons (large units only, not in shop) ----

const ANCIENT_SWORD: WeaponDef = {
  id: "ancient_sword",
  name: "Ancient Sword",
  category: "one_handed",
  damage: 40,
  speed: 0.8,
  reach: 1.4,
  weight: 4.0,
  cost: 0,
  length: 1.1,
  color: 0x555555,
  accentColor: 0x333333,
  oversized: true,
};

const ANCIENT_TOWER_SHIELD: WeaponDef = {
  id: "ancient_tower_shield",
  name: "Ancient Tower Shield",
  category: "shield",
  damage: 18,
  speed: 0.55,
  reach: 0.6,
  weight: 10.0,
  cost: 0,
  blockArc: Math.PI * 1.0,
  shieldHp: 500,
  length: 1.1,
  color: 0x3a3a3a,
  accentColor: 0x666666,
  oversized: true,
};

const ANCIENT_PIKE: WeaponDef = {
  id: "ancient_pike",
  name: "Ancient Pike",
  category: "polearm",
  damage: 38,
  speed: 0.65,
  reach: 3.2,
  weight: 6.0,
  cost: 0,
  length: 3.0,
  color: 0x555555,
  accentColor: 0x333333,
  oversized: true,
};

const ANCIENT_BATTLE_AXE: WeaponDef = {
  id: "ancient_battle_axe",
  name: "Ancient Battle Axe",
  category: "two_handed",
  damage: 60,
  speed: 0.6,
  reach: 1.6,
  weight: 7.0,
  cost: 0,
  length: 1.4,
  color: 0x444444,
  accentColor: 0x333333,
  oversized: true,
};

const ELDER_SWORD: WeaponDef = {
  id: "elder_sword",
  name: "Elder Sword",
  category: "one_handed",
  damage: 55,
  speed: 0.7,
  reach: 1.6,
  weight: 5.0,
  cost: 0,
  length: 1.3,
  color: 0x222222,
  accentColor: 0x111111,
  oversized: true,
};

const ELDER_TOWER_SHIELD: WeaponDef = {
  id: "elder_tower_shield",
  name: "Elder Tower Shield",
  category: "shield",
  damage: 22,
  speed: 0.5,
  reach: 0.7,
  weight: 14.0,
  cost: 0,
  blockArc: Math.PI * 1.1,
  shieldHp: 700,
  length: 1.3,
  color: 0x1a1a1a,
  accentColor: 0x444444,
  oversized: true,
};

const ELDER_LANCE: WeaponDef = {
  id: "elder_lance",
  name: "Elder Lance",
  category: "polearm",
  damage: 52,
  speed: 0.55,
  reach: 4.0,
  weight: 8.0,
  cost: 0,
  length: 3.6,
  color: 0x222222,
  accentColor: 0x111111,
  oversized: true,
};

const ELDER_GREAT_AXE: WeaponDef = {
  id: "elder_great_axe",
  name: "Elder Great Axe",
  category: "two_handed",
  damage: 80,
  speed: 0.5,
  reach: 2.0,
  weight: 10.0,
  cost: 0,
  length: 1.8,
  color: 0x1a1a1a,
  accentColor: 0x111111,
  oversized: true,
};

const GIANT_WAR_CLUB: WeaponDef = {
  id: "giant_war_club",
  name: "Giant War Club",
  category: "two_handed",
  damage: 100,
  speed: 0.4,
  reach: 2.4,
  weight: 14.0,
  cost: 0,
  length: 2.2,
  color: 0x554433,
  accentColor: 0x888888,
  oversized: true,
};

const ROYAL_TOWER_SHIELD: WeaponDef = {
  id: "royal_tower_shield",
  name: "Royal Tower Shield",
  category: "shield",
  damage: 16,
  speed: 0.55,
  reach: 0.55,
  weight: 9.0,
  cost: 0,
  blockArc: Math.PI * 1.0,
  shieldHp: 500,
  length: 0.95,
  color: 0xdaa520,
  accentColor: 0xeedd55,
  oversized: true,
};

const ROYAL_SWORD: WeaponDef = {
  id: "royal_sword",
  name: "Royal Sword",
  category: "one_handed",
  damage: 45,
  speed: 0.9,
  reach: 1.2,
  weight: 2.5,
  cost: 0,
  length: 0.95,
  color: 0xe8e8e8,
  accentColor: 0xdaa520,
  oversized: true,
};

// ---- Oversized ranged weapons (large units only, not in shop) ----

const ANCIENT_BOW: WeaponDef = {
  id: "ancient_bow",
  name: "Ancient Bow",
  category: "bow",
  damage: 40,
  speed: 0.7,
  reach: 0.5,
  weight: 3.0,
  cost: 0,
  projectileSpeed: 48,
  ammo: 20,
  accuracy: 0.88,
  drawTime: 40,
  length: 1.8,
  color: 0x555555,
  accentColor: 0x333333,
  oversized: true,
};

const ANCIENT_CROSSBOW: WeaponDef = {
  id: "ancient_crossbow",
  name: "Ancient Crossbow",
  category: "crossbow",
  damage: 60,
  speed: 0.3,
  reach: 0.5,
  weight: 6.0,
  cost: 0,
  projectileSpeed: 58,
  ammo: 15,
  accuracy: 0.95,
  drawTime: 70,
  length: 1.0,
  color: 0x555555,
  accentColor: 0x333333,
  oversized: true,
};

const ELDER_BOW: WeaponDef = {
  id: "elder_bow",
  name: "Elder Bow",
  category: "bow",
  damage: 55,
  speed: 0.6,
  reach: 0.5,
  weight: 4.0,
  cost: 0,
  projectileSpeed: 55,
  ammo: 18,
  accuracy: 0.92,
  drawTime: 45,
  length: 2.2,
  color: 0x1a1a1a,
  accentColor: 0x111111,
  oversized: true,
};

const ELDER_CROSSBOW: WeaponDef = {
  id: "elder_crossbow",
  name: "Elder Crossbow",
  category: "crossbow",
  damage: 75,
  speed: 0.25,
  reach: 0.5,
  weight: 8.0,
  cost: 0,
  projectileSpeed: 65,
  ammo: 12,
  accuracy: 0.97,
  drawTime: 90,
  length: 1.2,
  color: 0x1a1a1a,
  accentColor: 0x111111,
  oversized: true,
};

const ELDER_JAVELINS: WeaponDef = {
  id: "elder_javelins",
  name: "Elder Javelins",
  category: "thrown",
  damage: 65,
  speed: 0.7,
  reach: 1.5,
  weight: 4.0,
  cost: 0,
  projectileSpeed: 35,
  ammo: 4,
  accuracy: 0.8,
  drawTime: 18,
  length: 2.2,
  color: 0x1a1a1a,
  accentColor: 0x111111,
  oversized: true,
};

const GIANT_BOW: WeaponDef = {
  id: "giant_bow",
  name: "Giant Bow",
  category: "bow",
  damage: 70,
  speed: 0.5,
  reach: 0.5,
  weight: 6.0,
  cost: 0,
  projectileSpeed: 60,
  ammo: 15,
  accuracy: 0.85,
  drawTime: 50,
  length: 2.8,
  color: 0x554433,
  accentColor: 0x888888,
  oversized: true,
};

const GIANT_LANCE: WeaponDef = {
  id: "giant_lance",
  name: "Giant Lance",
  category: "polearm",
  damage: 90,
  speed: 0.4,
  reach: 4.5,
  weight: 12.0,
  cost: 0,
  length: 4.0,
  color: 0x554433,
  accentColor: 0x888888,
  oversized: true,
};

const ANGEL_SWORD: WeaponDef = {
  id: "angel_sword",
  name: "Angel Sword",
  category: "two_handed",
  damage: 85,
  speed: 0.8,
  reach: 2.2,
  weight: 5.0,
  cost: 0,
  length: 2.0,
  color: 0xffffee,
  accentColor: 0xdaa520,
  oversized: true,
};

const GIANT_STAFF: WeaponDef = {
  id: "giant_staff",
  name: "Giant Staff",
  category: "staff",
  damage: 80,
  speed: 0.5,
  reach: 3.5,
  weight: 10.0,
  cost: 0,
  projectileSpeed: 55, ammo: 30, accuracy: 0.92, drawTime: 22,
  length: 3.2,
  color: 0x443355,
  accentColor: 0x8866aa,
  oversized: true,
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

  // Staves
  fire_staff: FIRE_STAFF,
  storm_staff: STORM_STAFF,
  cold_staff: COLD_STAFF,
  distortion_staff: DISTORTION_STAFF,
  healing_staff: HEALING_STAFF,
  fire_adept_staff: FIRE_ADEPT_STAFF,
  cold_adept_staff: COLD_ADEPT_STAFF,
  lightning_adept_staff: LIGHTNING_ADEPT_STAFF,
  distortion_adept_staff: DISTORTION_ADEPT_STAFF,
  fire_master_staff: FIRE_MASTER_STAFF,
  cold_master_staff: COLD_MASTER_STAFF,
  lightning_master_staff: LIGHTNING_MASTER_STAFF,
  distortion_master_staff: DISTORTION_MASTER_STAFF,
  cleric_staff: CLERIC_STAFF,
  saint_staff: SAINT_STAFF,
  summoner_staff: SUMMONER_STAFF,
  warlock_staff: WARLOCK_STAFF,
  dark_savant_staff: DARK_SAVANT_STAFF,
  battlemage_staff: BATTLEMAGE_STAFF,
  constructionist_staff: CONSTRUCTIONIST_STAFF,

  // Oversized (large units only)
  ancient_sword: ANCIENT_SWORD,
  ancient_tower_shield: ANCIENT_TOWER_SHIELD,
  ancient_pike: ANCIENT_PIKE,
  ancient_battle_axe: ANCIENT_BATTLE_AXE,
  elder_sword: ELDER_SWORD,
  elder_tower_shield: ELDER_TOWER_SHIELD,
  elder_lance: ELDER_LANCE,
  elder_great_axe: ELDER_GREAT_AXE,
  giant_war_club: GIANT_WAR_CLUB,
  royal_tower_shield: ROYAL_TOWER_SHIELD,
  royal_sword: ROYAL_SWORD,
  ancient_bow: ANCIENT_BOW,
  ancient_crossbow: ANCIENT_CROSSBOW,
  elder_bow: ELDER_BOW,
  elder_crossbow: ELDER_CROSSBOW,
  elder_javelins: ELDER_JAVELINS,
  giant_bow: GIANT_BOW,
  giant_lance: GIANT_LANCE,
  angel_sword: ANGEL_SWORD,
  giant_staff: GIANT_STAFF,
};

export const WEAPON_IDS = Object.keys(WEAPON_DEFS);

/** Get all weapons by category */
export function getWeaponsByCategory(cat: WeaponCategory): WeaponDef[] {
  return Object.values(WEAPON_DEFS).filter((w) => w.category === cat);
}

/** Check if weapon is ranged */
export function isRangedWeapon(w: WeaponDef): boolean {
  return w.category === "bow" || w.category === "crossbow" || w.category === "thrown" || w.category === "staff";
}

/** Check if weapon is a magic staff */
export function isStaffWeapon(w: WeaponDef): boolean {
  return w.category === "staff";
}

/** Check if weapon is melee */
export function isMeleeWeapon(w: WeaponDef): boolean {
  return (
    w.category === "one_handed" ||
    w.category === "two_handed" ||
    w.category === "polearm"
  );
}
