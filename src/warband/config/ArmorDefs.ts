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

// ---- All armor map ----

export const ARMOR_DEFS: Record<string, ArmorDef> = {
  // Head
  cloth_hood: CLOTH_HOOD,
  leather_cap: LEATHER_CAP,
  mail_coif: MAIL_COIF,
  nasal_helm: NASAL_HELM,
  bascinet: BASCINET,
  great_helm: GREAT_HELM,

  // Torso
  padded_vest: PADDED_VEST,
  leather_jerkin: LEATHER_JERKIN,
  mail_shirt: MAIL_SHIRT,
  chain_hauberk: CHAIN_HAUBERK,
  brigandine: BRIGANDINE,
  plate_cuirass: PLATE_CUIRASS,

  // Gauntlets
  cloth_wraps: CLOTH_WRAPS,
  leather_gloves: LEATHER_GLOVES,
  mail_gauntlets: MAIL_GAUNTLETS,
  plate_gauntlets: PLATE_GAUNTLETS,

  // Legs
  cloth_trousers: CLOTH_TROUSERS,
  leather_leggings: LEATHER_LEGGINGS,
  mail_chausses: MAIL_CHAUSSES,
  plate_greaves: PLATE_GREAVES,

  // Boots
  sandals: SANDALS,
  leather_boots: LEATHER_BOOTS,
  mail_boots: MAIL_BOOTS,
  plate_sabatons: PLATE_SABATONS,
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
