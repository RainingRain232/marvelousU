export enum ArmorSlot {
  HELMET = "helmet",
  CHESTPLATE = "chestplate",
  LEGGINGS = "leggings",
  BOOTS = "boots",
}

export enum ArmorMaterial {
  LEATHER = "leather",
  IRON = "iron",
  GOLD = "gold",
  CRYSTAL = "crystal",
  DRAGON = "dragon",
}

export enum EnchantmentType {
  PROTECTION = "protection",
  FIRE_RESISTANCE = "fire_resist",
  SWIFTNESS = "swiftness",
  STRENGTH = "strength",
  HOLY_LIGHT = "holy_light",
  MERLINS_WISDOM = "merlins_wisdom",
  AQUA_AFFINITY = "aqua_affinity",
  FEATHER_FALL = "feather_fall",
}

export interface ArmorDef {
  slot: ArmorSlot;
  material: ArmorMaterial;
  name: string;
  defense: number;
  durability: number;
  color: number;
}

export interface EnchantmentDef {
  type: EnchantmentType;
  name: string;
  maxLevel: number;
  description: string;
  color: number;
}

// ---------- Material base stats ----------

interface MaterialStats {
  defenseBase: Record<ArmorSlot, number>;
  durabilityBase: Record<ArmorSlot, number>;
  color: number;
  label: string;
}

const MATERIAL_STATS: Record<ArmorMaterial, MaterialStats> = {
  [ArmorMaterial.LEATHER]: {
    defenseBase: {
      [ArmorSlot.HELMET]: 1,
      [ArmorSlot.CHESTPLATE]: 3,
      [ArmorSlot.LEGGINGS]: 2,
      [ArmorSlot.BOOTS]: 1,
    },
    durabilityBase: {
      [ArmorSlot.HELMET]: 55,
      [ArmorSlot.CHESTPLATE]: 80,
      [ArmorSlot.LEGGINGS]: 75,
      [ArmorSlot.BOOTS]: 65,
    },
    color: 0x8b4513,
    label: "Leather",
  },
  [ArmorMaterial.IRON]: {
    defenseBase: {
      [ArmorSlot.HELMET]: 2,
      [ArmorSlot.CHESTPLATE]: 6,
      [ArmorSlot.LEGGINGS]: 5,
      [ArmorSlot.BOOTS]: 2,
    },
    durabilityBase: {
      [ArmorSlot.HELMET]: 165,
      [ArmorSlot.CHESTPLATE]: 240,
      [ArmorSlot.LEGGINGS]: 225,
      [ArmorSlot.BOOTS]: 195,
    },
    color: 0xc0c0c0,
    label: "Iron",
  },
  [ArmorMaterial.GOLD]: {
    defenseBase: {
      [ArmorSlot.HELMET]: 2,
      [ArmorSlot.CHESTPLATE]: 5,
      [ArmorSlot.LEGGINGS]: 3,
      [ArmorSlot.BOOTS]: 1,
    },
    durabilityBase: {
      [ArmorSlot.HELMET]: 77,
      [ArmorSlot.CHESTPLATE]: 112,
      [ArmorSlot.LEGGINGS]: 105,
      [ArmorSlot.BOOTS]: 91,
    },
    color: 0xffd700,
    label: "Gold",
  },
  [ArmorMaterial.CRYSTAL]: {
    defenseBase: {
      [ArmorSlot.HELMET]: 3,
      [ArmorSlot.CHESTPLATE]: 8,
      [ArmorSlot.LEGGINGS]: 6,
      [ArmorSlot.BOOTS]: 3,
    },
    durabilityBase: {
      [ArmorSlot.HELMET]: 363,
      [ArmorSlot.CHESTPLATE]: 528,
      [ArmorSlot.LEGGINGS]: 495,
      [ArmorSlot.BOOTS]: 429,
    },
    color: 0x88ccff,
    label: "Crystal",
  },
  [ArmorMaterial.DRAGON]: {
    defenseBase: {
      [ArmorSlot.HELMET]: 4,
      [ArmorSlot.CHESTPLATE]: 10,
      [ArmorSlot.LEGGINGS]: 8,
      [ArmorSlot.BOOTS]: 4,
    },
    durabilityBase: {
      [ArmorSlot.HELMET]: 440,
      [ArmorSlot.CHESTPLATE]: 640,
      [ArmorSlot.LEGGINGS]: 600,
      [ArmorSlot.BOOTS]: 520,
    },
    color: 0x660066,
    label: "Dragon Scale",
  },
};

const SLOT_LABELS: Record<ArmorSlot, string> = {
  [ArmorSlot.HELMET]: "Helmet",
  [ArmorSlot.CHESTPLATE]: "Chestplate",
  [ArmorSlot.LEGGINGS]: "Leggings",
  [ArmorSlot.BOOTS]: "Boots",
};

// ---------- Generate all armor definitions ----------

function buildArmorDefs(): Record<string, ArmorDef> {
  const defs: Record<string, ArmorDef> = {};

  for (const material of Object.values(ArmorMaterial)) {
    const stats = MATERIAL_STATS[material];
    for (const slot of Object.values(ArmorSlot)) {
      const key = `${material}_${slot}`;
      defs[key] = {
        slot,
        material,
        name: `${stats.label} ${SLOT_LABELS[slot]}`,
        defense: stats.defenseBase[slot],
        durability: stats.durabilityBase[slot],
        color: stats.color,
      };
    }
  }

  return defs;
}

export const ARMOR_DEFS: Record<string, ArmorDef> = buildArmorDefs();

// ---------- Enchantment definitions ----------

export const ENCHANTMENT_DEFS: Record<EnchantmentType, EnchantmentDef> = {
  [EnchantmentType.PROTECTION]: {
    type: EnchantmentType.PROTECTION,
    name: "Protection",
    maxLevel: 4,
    description: "Reduces incoming damage from all sources",
    color: 0xaaaaff,
  },
  [EnchantmentType.FIRE_RESISTANCE]: {
    type: EnchantmentType.FIRE_RESISTANCE,
    name: "Fire Resistance",
    maxLevel: 3,
    description: "Reduces damage from fire and lava",
    color: 0xff4400,
  },
  [EnchantmentType.SWIFTNESS]: {
    type: EnchantmentType.SWIFTNESS,
    name: "Swiftness",
    maxLevel: 3,
    description: "Increases movement speed while worn",
    color: 0x66ffcc,
  },
  [EnchantmentType.STRENGTH]: {
    type: EnchantmentType.STRENGTH,
    name: "Strength",
    maxLevel: 5,
    description: "Increases melee attack damage",
    color: 0xff2200,
  },
  [EnchantmentType.HOLY_LIGHT]: {
    type: EnchantmentType.HOLY_LIGHT,
    name: "Holy Light",
    maxLevel: 2,
    description: "Emits radiance that damages nearby undead mobs",
    color: 0xffffaa,
  },
  [EnchantmentType.MERLINS_WISDOM]: {
    type: EnchantmentType.MERLINS_WISDOM,
    name: "Merlin's Wisdom",
    maxLevel: 3,
    description: "Increases experience gained from all sources",
    color: 0xcc66ff,
  },
  [EnchantmentType.AQUA_AFFINITY]: {
    type: EnchantmentType.AQUA_AFFINITY,
    name: "Aqua Affinity",
    maxLevel: 1,
    description: "Removes mining speed penalty underwater",
    color: 0x0088ff,
  },
  [EnchantmentType.FEATHER_FALL]: {
    type: EnchantmentType.FEATHER_FALL,
    name: "Feather Fall",
    maxLevel: 4,
    description: "Reduces fall damage taken on landing",
    color: 0xeeeeff,
  },
};

// ---------- Helper functions ----------

/**
 * Calculates total defense value from all currently equipped armor pieces.
 */
export function getTotalDefense(
  equipped: Record<ArmorSlot, ArmorDef | null>,
): number {
  let total = 0;
  for (const slot of Object.values(ArmorSlot)) {
    const piece = equipped[slot];
    if (piece) {
      total += piece.defense;
    }
  }
  return total;
}

/**
 * Returns the level of a specific enchantment within a list of applied
 * enchantments. Each occurrence of the enchantment type in the array counts
 * as one level (stacking). Returns 0 when the enchantment is not present.
 */
export function getEnchantmentBonus(
  enchantments: EnchantmentType[],
  type: EnchantmentType,
): number {
  let level = 0;
  for (const e of enchantments) {
    if (e === type) {
      level++;
    }
  }
  const def = ENCHANTMENT_DEFS[type];
  return Math.min(level, def.maxLevel);
}
