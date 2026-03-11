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
