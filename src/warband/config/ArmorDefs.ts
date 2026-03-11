// ---------------------------------------------------------------------------
// Warband mode – armor definitions
// ---------------------------------------------------------------------------

export enum ArmorSlot {
  HEAD = "head",
  TORSO = "torso",
  GAUNTLETS = "gauntlets",
  LEGS = "legs",
  BOOTS = "boots",
}

export interface ArmorDef {
  id: string;
  name: string;
  slot: ArmorSlot;
  defense: number; // flat damage reduction
  weight: number; // affects movement speed
  cost: number;
  color: number;
  accentColor?: number;
  oversized?: boolean; // for large units only, not available in shop
}

// ---- Head Armor ----

const CLOTH_HOOD: ArmorDef = {
  id: "cloth_hood",
  name: "Cloth Hood",
  slot: ArmorSlot.HEAD,
  defense: 3,
  weight: 0.5,
  cost: 20,
  color: 0x886644,
};

const LEATHER_CAP: ArmorDef = {
  id: "leather_cap",
  name: "Leather Cap",
  slot: ArmorSlot.HEAD,
  defense: 6,
  weight: 1.0,
  cost: 50,
  color: 0x8b4513,
};

const MAIL_COIF: ArmorDef = {
  id: "mail_coif",
  name: "Mail Coif",
  slot: ArmorSlot.HEAD,
  defense: 10,
  weight: 2.0,
  cost: 120,
  color: 0xaaaaaa,
};

const NASAL_HELM: ArmorDef = {
  id: "nasal_helm",
  name: "Nasal Helm",
  slot: ArmorSlot.HEAD,
  defense: 14,
  weight: 3.0,
  cost: 200,
  color: 0x888888,
  accentColor: 0xbbbbbb,
};

const BASCINET: ArmorDef = {
  id: "bascinet",
  name: "Bascinet",
  slot: ArmorSlot.HEAD,
  defense: 18,
  weight: 3.5,
  cost: 300,
  color: 0x999999,
  accentColor: 0xcccccc,
};

const GREAT_HELM: ArmorDef = {
  id: "great_helm",
  name: "Great Helm",
  slot: ArmorSlot.HEAD,
  defense: 24,
  weight: 5.0,
  cost: 500,
  color: 0xbbbbbb,
  accentColor: 0xdddddd,
};

const KETTLE_HAT: ArmorDef = {
  id: "kettle_hat",
  name: "Kettle Hat",
  slot: ArmorSlot.HEAD,
  defense: 12,
  weight: 2.5,
  cost: 150,
  color: 0x999999,
  accentColor: 0xaaaaaa,
};

const SALLET: ArmorDef = {
  id: "sallet",
  name: "Sallet",
  slot: ArmorSlot.HEAD,
  defense: 20,
  weight: 4.0,
  cost: 380,
  color: 0xaaaaaa,
  accentColor: 0xcccccc,
};

// ---- Torso Armor ----

const PADDED_VEST: ArmorDef = {
  id: "padded_vest",
  name: "Padded Vest",
  slot: ArmorSlot.TORSO,
  defense: 5,
  weight: 2.0,
  cost: 30,
  color: 0x886644,
};

const LEATHER_JERKIN: ArmorDef = {
  id: "leather_jerkin",
  name: "Leather Jerkin",
  slot: ArmorSlot.TORSO,
  defense: 10,
  weight: 3.0,
  cost: 80,
  color: 0x8b4513,
};

const MAIL_SHIRT: ArmorDef = {
  id: "mail_shirt",
  name: "Mail Shirt",
  slot: ArmorSlot.TORSO,
  defense: 18,
  weight: 6.0,
  cost: 200,
  color: 0xaaaaaa,
};

const CHAIN_HAUBERK: ArmorDef = {
  id: "chain_hauberk",
  name: "Chain Hauberk",
  slot: ArmorSlot.TORSO,
  defense: 24,
  weight: 8.0,
  cost: 350,
  color: 0x999999,
};

const BRIGANDINE: ArmorDef = {
  id: "brigandine",
  name: "Brigandine",
  slot: ArmorSlot.TORSO,
  defense: 30,
  weight: 10.0,
  cost: 500,
  color: 0x882222,
  accentColor: 0xbbbbbb,
};

const PLATE_CUIRASS: ArmorDef = {
  id: "plate_cuirass",
  name: "Plate Cuirass",
  slot: ArmorSlot.TORSO,
  defense: 38,
  weight: 14.0,
  cost: 800,
  color: 0xbbbbbb,
  accentColor: 0xdddddd,
};

const GAMBESON: ArmorDef = {
  id: "gambeson",
  name: "Gambeson",
  slot: ArmorSlot.TORSO,
  defense: 14,
  weight: 4.0,
  cost: 120,
  color: 0x998866,
};

const COAT_OF_PLATES: ArmorDef = {
  id: "coat_of_plates",
  name: "Coat of Plates",
  slot: ArmorSlot.TORSO,
  defense: 28,
  weight: 9.0,
  cost: 450,
  color: 0x772222,
  accentColor: 0xaaaaaa,
};

const SURCOAT_OVER_MAIL: ArmorDef = {
  id: "surcoat_over_mail",
  name: "Surcoat over Mail",
  slot: ArmorSlot.TORSO,
  defense: 22,
  weight: 7.0,
  cost: 300,
  color: 0x2244aa,
  accentColor: 0xdaa520,
};

// ---- Gauntlets ----

const CLOTH_WRAPS: ArmorDef = {
  id: "cloth_wraps",
  name: "Cloth Wraps",
  slot: ArmorSlot.GAUNTLETS,
  defense: 2,
  weight: 0.3,
  cost: 15,
  color: 0x886644,
};

const LEATHER_GLOVES: ArmorDef = {
  id: "leather_gloves",
  name: "Leather Gloves",
  slot: ArmorSlot.GAUNTLETS,
  defense: 4,
  weight: 0.5,
  cost: 40,
  color: 0x8b4513,
};

const MAIL_GAUNTLETS: ArmorDef = {
  id: "mail_gauntlets",
  name: "Mail Gauntlets",
  slot: ArmorSlot.GAUNTLETS,
  defense: 8,
  weight: 1.5,
  cost: 100,
  color: 0xaaaaaa,
};

const PLATE_GAUNTLETS: ArmorDef = {
  id: "plate_gauntlets",
  name: "Plate Gauntlets",
  slot: ArmorSlot.GAUNTLETS,
  defense: 14,
  weight: 2.5,
  cost: 250,
  color: 0xbbbbbb,
  accentColor: 0xdddddd,
};

const SPLINTED_GAUNTLETS: ArmorDef = {
  id: "splinted_gauntlets",
  name: "Splinted Gauntlets",
  slot: ArmorSlot.GAUNTLETS,
  defense: 6,
  weight: 1.0,
  cost: 70,
  color: 0x8b4513,
  accentColor: 0x999999,
};

// ---- Legs ----

const CLOTH_TROUSERS: ArmorDef = {
  id: "cloth_trousers",
  name: "Cloth Trousers",
  slot: ArmorSlot.LEGS,
  defense: 3,
  weight: 1.0,
  cost: 20,
  color: 0x886644,
};

const LEATHER_LEGGINGS: ArmorDef = {
  id: "leather_leggings",
  name: "Leather Leggings",
  slot: ArmorSlot.LEGS,
  defense: 7,
  weight: 2.0,
  cost: 60,
  color: 0x8b4513,
};

const MAIL_CHAUSSES: ArmorDef = {
  id: "mail_chausses",
  name: "Mail Chausses",
  slot: ArmorSlot.LEGS,
  defense: 12,
  weight: 4.0,
  cost: 150,
  color: 0xaaaaaa,
};

const PLATE_GREAVES: ArmorDef = {
  id: "plate_greaves",
  name: "Plate Greaves",
  slot: ArmorSlot.LEGS,
  defense: 20,
  weight: 6.0,
  cost: 400,
  color: 0xbbbbbb,
  accentColor: 0xdddddd,
};

const PADDED_LEGGINGS: ArmorDef = {
  id: "padded_leggings",
  name: "Padded Leggings",
  slot: ArmorSlot.LEGS,
  defense: 5,
  weight: 1.5,
  cost: 40,
  color: 0x998866,
};

const SPLINTED_GREAVES: ArmorDef = {
  id: "splinted_greaves",
  name: "Splinted Greaves",
  slot: ArmorSlot.LEGS,
  defense: 15,
  weight: 5.0,
  cost: 250,
  color: 0x8b4513,
  accentColor: 0x999999,
};

// ---- Boots ----

const SANDALS: ArmorDef = {
  id: "sandals",
  name: "Sandals",
  slot: ArmorSlot.BOOTS,
  defense: 1,
  weight: 0.3,
  cost: 10,
  color: 0x8b6914,
};

const LEATHER_BOOTS: ArmorDef = {
  id: "leather_boots",
  name: "Leather Boots",
  slot: ArmorSlot.BOOTS,
  defense: 4,
  weight: 1.0,
  cost: 40,
  color: 0x654321,
};

const MAIL_BOOTS: ArmorDef = {
  id: "mail_boots",
  name: "Mail Boots",
  slot: ArmorSlot.BOOTS,
  defense: 8,
  weight: 2.0,
  cost: 100,
  color: 0xaaaaaa,
};

const PLATE_SABATONS: ArmorDef = {
  id: "plate_sabatons",
  name: "Plate Sabatons",
  slot: ArmorSlot.BOOTS,
  defense: 14,
  weight: 3.5,
  cost: 280,
  color: 0xbbbbbb,
  accentColor: 0xdddddd,
};

const RIDING_BOOTS: ArmorDef = {
  id: "riding_boots",
  name: "Riding Boots",
  slot: ArmorSlot.BOOTS,
  defense: 3,
  weight: 0.8,
  cost: 30,
  color: 0x4a3520,
};

const ARMORED_BOOTS: ArmorDef = {
  id: "armored_boots",
  name: "Armored Boots",
  slot: ArmorSlot.BOOTS,
  defense: 6,
  weight: 1.5,
  cost: 70,
  color: 0x888888,
  accentColor: 0x654321,
};

// ---- Robes (mages & clergy, covers most of the body) ----

const NOVICE_ROBES: ArmorDef = {
  id: "novice_robes", name: "Novice Robes", slot: ArmorSlot.TORSO,
  defense: 2, weight: 1.0, cost: 20, color: 0x998877,
};
const MAGE_ROBES: ArmorDef = {
  id: "mage_robes", name: "Mage Robes", slot: ArmorSlot.TORSO,
  defense: 4, weight: 1.5, cost: 60, color: 0x334488,
};
const ADEPT_ROBES: ArmorDef = {
  id: "adept_robes", name: "Adept Robes", slot: ArmorSlot.TORSO,
  defense: 8, weight: 2.0, cost: 150, color: 0x223366,
};
const MASTER_ROBES: ArmorDef = {
  id: "master_robes", name: "Master Robes", slot: ArmorSlot.TORSO,
  defense: 12, weight: 2.5, cost: 300, color: 0x112244, accentColor: 0xdaa520,
};
const PRIEST_ROBES: ArmorDef = {
  id: "priest_robes", name: "Priest Robes", slot: ArmorSlot.TORSO,
  defense: 3, weight: 1.0, cost: 30, color: 0xccccbb,
};
const CLERIC_ROBES: ArmorDef = {
  id: "cleric_robes", name: "Cleric Robes", slot: ArmorSlot.TORSO,
  defense: 8, weight: 2.0, cost: 140, color: 0xeeeedd, accentColor: 0xdaa520,
};
const SAINT_ROBES: ArmorDef = {
  id: "saint_robes", name: "Saint Robes", slot: ArmorSlot.TORSO,
  defense: 14, weight: 2.0, cost: 400, color: 0xffffee, accentColor: 0xdaa520,
};
const WARLOCK_ROBES: ArmorDef = {
  id: "warlock_robes", name: "Warlock Robes", slot: ArmorSlot.TORSO,
  defense: 6, weight: 1.5, cost: 100, color: 0x332244,
};
const SUMMONER_ROBES: ArmorDef = {
  id: "summoner_robes", name: "Summoner Robes", slot: ArmorSlot.TORSO,
  defense: 5, weight: 1.5, cost: 80, color: 0x442266, accentColor: 0x8866aa,
};
const BATTLEMAGE_ROBES: ArmorDef = {
  id: "battlemage_robes", name: "Battlemage Robes", slot: ArmorSlot.TORSO,
  defense: 20, weight: 4.0, cost: 600, color: 0x441111, accentColor: 0xdaa520,
};
const DARK_SAVANT_ROBES: ArmorDef = {
  id: "dark_savant_robes", name: "Dark Savant Robes", slot: ArmorSlot.TORSO,
  defense: 16, weight: 3.0, cost: 450, color: 0x110000, accentColor: 0xff4422,
};
const ROBE_LEGGINGS: ArmorDef = {
  id: "robe_leggings", name: "Robe Leggings", slot: ArmorSlot.LEGS,
  defense: 2, weight: 0.5, cost: 15, color: 0x998877,
};
const ROBE_BOOTS: ArmorDef = {
  id: "robe_boots", name: "Robe Boots", slot: ArmorSlot.BOOTS,
  defense: 1, weight: 0.3, cost: 10, color: 0x665544,
};

// ---- Oversized armor (large units only, not in shop) ----

const ANCIENT_HELM: ArmorDef = {
  id: "ancient_helm", name: "Ancient Helm", slot: ArmorSlot.HEAD,
  defense: 28, weight: 6.0, cost: 0, color: 0x555555, accentColor: 0x666666, oversized: true,
};
const ANCIENT_PLATE: ArmorDef = {
  id: "ancient_plate", name: "Ancient Plate", slot: ArmorSlot.TORSO,
  defense: 45, weight: 18.0, cost: 0, color: 0x555555, accentColor: 0x666666, oversized: true,
};
const ANCIENT_GAUNTLETS: ArmorDef = {
  id: "ancient_gauntlets", name: "Ancient Gauntlets", slot: ArmorSlot.GAUNTLETS,
  defense: 16, weight: 3.0, cost: 0, color: 0x555555, accentColor: 0x666666, oversized: true,
};
const ANCIENT_GREAVES: ArmorDef = {
  id: "ancient_greaves", name: "Ancient Greaves", slot: ArmorSlot.LEGS,
  defense: 24, weight: 8.0, cost: 0, color: 0x555555, accentColor: 0x666666, oversized: true,
};
const ANCIENT_SABATONS: ArmorDef = {
  id: "ancient_sabatons", name: "Ancient Sabatons", slot: ArmorSlot.BOOTS,
  defense: 16, weight: 4.0, cost: 0, color: 0x555555, accentColor: 0x666666, oversized: true,
};

const ELDER_HELM: ArmorDef = {
  id: "elder_helm", name: "Elder Helm", slot: ArmorSlot.HEAD,
  defense: 36, weight: 8.0, cost: 0, color: 0x1a1a1a, accentColor: 0x333333, oversized: true,
};
const ELDER_PLATE: ArmorDef = {
  id: "elder_plate", name: "Elder Plate", slot: ArmorSlot.TORSO,
  defense: 55, weight: 22.0, cost: 0, color: 0x1a1a1a, accentColor: 0x333333, oversized: true,
};
const ELDER_GAUNTLETS: ArmorDef = {
  id: "elder_gauntlets", name: "Elder Gauntlets", slot: ArmorSlot.GAUNTLETS,
  defense: 20, weight: 4.0, cost: 0, color: 0x1a1a1a, accentColor: 0x333333, oversized: true,
};
const ELDER_GREAVES: ArmorDef = {
  id: "elder_greaves", name: "Elder Greaves", slot: ArmorSlot.LEGS,
  defense: 30, weight: 10.0, cost: 0, color: 0x1a1a1a, accentColor: 0x333333, oversized: true,
};
const ELDER_SABATONS: ArmorDef = {
  id: "elder_sabatons", name: "Elder Sabatons", slot: ArmorSlot.BOOTS,
  defense: 20, weight: 5.0, cost: 0, color: 0x1a1a1a, accentColor: 0x333333, oversized: true,
};

const GIANT_HELM: ArmorDef = {
  id: "giant_helm", name: "Giant Helm", slot: ArmorSlot.HEAD,
  defense: 40, weight: 10.0, cost: 0, color: 0x777777, accentColor: 0x999999, oversized: true,
};
const GIANT_PLATE: ArmorDef = {
  id: "giant_plate", name: "Giant Plate", slot: ArmorSlot.TORSO,
  defense: 60, weight: 28.0, cost: 0, color: 0x777777, accentColor: 0x999999, oversized: true,
};
const GIANT_GAUNTLETS: ArmorDef = {
  id: "giant_gauntlets", name: "Giant Gauntlets", slot: ArmorSlot.GAUNTLETS,
  defense: 24, weight: 5.0, cost: 0, color: 0x777777, accentColor: 0x999999, oversized: true,
};
const GIANT_GREAVES: ArmorDef = {
  id: "giant_greaves", name: "Giant Greaves", slot: ArmorSlot.LEGS,
  defense: 34, weight: 12.0, cost: 0, color: 0x777777, accentColor: 0x999999, oversized: true,
};
const GIANT_SABATONS: ArmorDef = {
  id: "giant_sabatons", name: "Giant Sabatons", slot: ArmorSlot.BOOTS,
  defense: 24, weight: 6.0, cost: 0, color: 0x777777, accentColor: 0x999999, oversized: true,
};

const ROYAL_GUARD_HELM: ArmorDef = {
  id: "royal_guard_helm", name: "Royal Guard Helm", slot: ArmorSlot.HEAD,
  defense: 26, weight: 5.5, cost: 0, color: 0xdaa520, accentColor: 0xeedd55, oversized: true,
};
const ROYAL_GUARD_PLATE: ArmorDef = {
  id: "royal_guard_plate", name: "Royal Guard Plate", slot: ArmorSlot.TORSO,
  defense: 42, weight: 16.0, cost: 0, color: 0xdaa520, accentColor: 0xeedd55, oversized: true,
};
const ROYAL_GUARD_GAUNTLETS: ArmorDef = {
  id: "royal_guard_gauntlets", name: "Royal Guard Gauntlets", slot: ArmorSlot.GAUNTLETS,
  defense: 16, weight: 3.0, cost: 0, color: 0xdaa520, accentColor: 0xeedd55, oversized: true,
};
const ROYAL_GUARD_GREAVES: ArmorDef = {
  id: "royal_guard_greaves", name: "Royal Guard Greaves", slot: ArmorSlot.LEGS,
  defense: 22, weight: 7.0, cost: 0, color: 0xdaa520, accentColor: 0xeedd55, oversized: true,
};
const ROYAL_GUARD_SABATONS: ArmorDef = {
  id: "royal_guard_sabatons", name: "Royal Guard Sabatons", slot: ArmorSlot.BOOTS,
  defense: 16, weight: 4.0, cost: 0, color: 0xdaa520, accentColor: 0xeedd55, oversized: true,
};

// ---- All armor map ----

export const ARMOR_DEFS: Record<string, ArmorDef> = {
  // Head
  cloth_hood: CLOTH_HOOD,
  leather_cap: LEATHER_CAP,
  mail_coif: MAIL_COIF,
  kettle_hat: KETTLE_HAT,
  nasal_helm: NASAL_HELM,
  bascinet: BASCINET,
  sallet: SALLET,
  great_helm: GREAT_HELM,

  // Torso
  padded_vest: PADDED_VEST,
  leather_jerkin: LEATHER_JERKIN,
  gambeson: GAMBESON,
  mail_shirt: MAIL_SHIRT,
  surcoat_over_mail: SURCOAT_OVER_MAIL,
  chain_hauberk: CHAIN_HAUBERK,
  coat_of_plates: COAT_OF_PLATES,
  brigandine: BRIGANDINE,
  plate_cuirass: PLATE_CUIRASS,

  // Gauntlets
  cloth_wraps: CLOTH_WRAPS,
  leather_gloves: LEATHER_GLOVES,
  splinted_gauntlets: SPLINTED_GAUNTLETS,
  mail_gauntlets: MAIL_GAUNTLETS,
  plate_gauntlets: PLATE_GAUNTLETS,

  // Legs
  cloth_trousers: CLOTH_TROUSERS,
  padded_leggings: PADDED_LEGGINGS,
  leather_leggings: LEATHER_LEGGINGS,
  mail_chausses: MAIL_CHAUSSES,
  splinted_greaves: SPLINTED_GREAVES,
  plate_greaves: PLATE_GREAVES,

  // Boots
  sandals: SANDALS,
  riding_boots: RIDING_BOOTS,
  leather_boots: LEATHER_BOOTS,
  armored_boots: ARMORED_BOOTS,
  mail_boots: MAIL_BOOTS,
  plate_sabatons: PLATE_SABATONS,

  // Robes
  novice_robes: NOVICE_ROBES,
  mage_robes: MAGE_ROBES,
  adept_robes: ADEPT_ROBES,
  master_robes: MASTER_ROBES,
  priest_robes: PRIEST_ROBES,
  cleric_robes: CLERIC_ROBES,
  saint_robes: SAINT_ROBES,
  warlock_robes: WARLOCK_ROBES,
  summoner_robes: SUMMONER_ROBES,
  battlemage_robes: BATTLEMAGE_ROBES,
  dark_savant_robes: DARK_SAVANT_ROBES,
  robe_leggings: ROBE_LEGGINGS,
  robe_boots: ROBE_BOOTS,

  // Oversized (large units only)
  ancient_helm: ANCIENT_HELM,
  ancient_plate: ANCIENT_PLATE,
  ancient_gauntlets: ANCIENT_GAUNTLETS,
  ancient_greaves: ANCIENT_GREAVES,
  ancient_sabatons: ANCIENT_SABATONS,
  elder_helm: ELDER_HELM,
  elder_plate: ELDER_PLATE,
  elder_gauntlets: ELDER_GAUNTLETS,
  elder_greaves: ELDER_GREAVES,
  elder_sabatons: ELDER_SABATONS,
  giant_helm: GIANT_HELM,
  giant_plate: GIANT_PLATE,
  giant_gauntlets: GIANT_GAUNTLETS,
  giant_greaves: GIANT_GREAVES,
  giant_sabatons: GIANT_SABATONS,
  royal_guard_helm: ROYAL_GUARD_HELM,
  royal_guard_plate: ROYAL_GUARD_PLATE,
  royal_guard_gauntlets: ROYAL_GUARD_GAUNTLETS,
  royal_guard_greaves: ROYAL_GUARD_GREAVES,
  royal_guard_sabatons: ROYAL_GUARD_SABATONS,
};

export const ARMOR_IDS = Object.keys(ARMOR_DEFS);

/** Get all armor for a specific slot */
export function getArmorBySlot(slot: ArmorSlot): ArmorDef[] {
  return Object.values(ARMOR_DEFS).filter((a) => a.slot === slot);
}

/** Total weight of equipped armor */
export function totalArmorWeight(
  equipped: Partial<Record<ArmorSlot, ArmorDef | null>>,
): number {
  let w = 0;
  for (const piece of Object.values(equipped)) {
    if (piece) w += piece.weight;
  }
  return w;
}

/** Total defense for a specific slot */
export function slotDefense(
  equipped: Partial<Record<ArmorSlot, ArmorDef | null>>,
  slot: ArmorSlot,
): number {
  return equipped[slot]?.defense ?? 0;
}
