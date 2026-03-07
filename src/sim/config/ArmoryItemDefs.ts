// Armory item definitions — equippable items that boost hero unit stats.
// Up to 2 items can be selected before a game starts.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ArmoryItemId = string;

export interface ArmoryItemDef {
  id: ArmoryItemId;
  name: string;
  description: string;
  /** Bonus added to hero atk stat. */
  atkBonus: number;
  /** Bonus added to hero hp/maxHp stat. */
  hpBonus: number;
  /** Bonus added to hero speed stat. */
  speedBonus: number;
  /** Bonus added to hero range stat. */
  rangeBonus: number;
  /** Hex color for the item icon background. */
  iconColor: number;
  /** Short symbol/letter shown on the item card. */
  iconSymbol: string;
}

// ---------------------------------------------------------------------------
// Definitions — 20 items
// ---------------------------------------------------------------------------

export const ARMORY_ITEMS: ArmoryItemDef[] = [
  // --- Tier 1: starting items (scenarios 1-2) ---
  {
    id: "longsword",
    name: "Longsword",
    description: "A well-forged blade that adds significant melee striking power.",
    atkBonus: 10,
    hpBonus: 0,
    speedBonus: 0,
    rangeBonus: 0,
    iconColor: 0x556688,
    iconSymbol: "S",
  },
  {
    id: "spear",
    name: "Spear",
    description: "A long-reaching spear that improves both attack and striking distance.",
    atkBonus: 5,
    hpBonus: 0,
    speedBonus: 0,
    rangeBonus: 1,
    iconColor: 0x887744,
    iconSymbol: "P",
  },
  // --- Tier 2: early unlocks ---
  {
    id: "leather_armor",
    name: "Leather Armor",
    description: "Light protective gear that significantly increases survivability.",
    atkBonus: 0,
    hpBonus: 100,
    speedBonus: 0,
    rangeBonus: 0,
    iconColor: 0x8B6914,
    iconSymbol: "A",
  },
  {
    id: "leather_sandals",
    name: "Leather Sandals",
    description: "Swift footwear granting extra health and movement speed.",
    atkBonus: 0,
    hpBonus: 50,
    speedBonus: 1,
    rangeBonus: 0,
    iconColor: 0x996633,
    iconSymbol: "B",
  },
  // --- Tier 3: mid-game unlocks ---
  {
    id: "steel_shield",
    name: "Steel Shield",
    description: "A sturdy shield that greatly increases durability in combat.",
    atkBonus: 0,
    hpBonus: 150,
    speedBonus: 0,
    rangeBonus: 0,
    iconColor: 0x7788aa,
    iconSymbol: "D",
  },
  {
    id: "war_axe",
    name: "War Axe",
    description: "A heavy battle axe that deals devastating damage.",
    atkBonus: 15,
    hpBonus: 0,
    speedBonus: 0,
    rangeBonus: 0,
    iconColor: 0x994444,
    iconSymbol: "X",
  },
  {
    id: "chainmail",
    name: "Chainmail",
    description: "Linked metal rings providing solid protection with moderate weight.",
    atkBonus: 0,
    hpBonus: 120,
    speedBonus: 0,
    rangeBonus: 0,
    iconColor: 0x888888,
    iconSymbol: "C",
  },
  {
    id: "iron_boots",
    name: "Iron Boots",
    description: "Heavy boots that offer both protection and steady footing.",
    atkBonus: 0,
    hpBonus: 80,
    speedBonus: 0.5,
    rangeBonus: 0,
    iconColor: 0x666677,
    iconSymbol: "I",
  },
  // --- Tier 4: late-game unlocks ---
  {
    id: "flaming_sword",
    name: "Flaming Sword",
    description: "An enchanted blade wreathed in fire, boosting attack and health.",
    atkBonus: 12,
    hpBonus: 40,
    speedBonus: 0,
    rangeBonus: 0,
    iconColor: 0xcc4422,
    iconSymbol: "F",
  },
  {
    id: "elven_bow",
    name: "Elven Bow",
    description: "A finely crafted bow granting exceptional range and accuracy.",
    atkBonus: 5,
    hpBonus: 0,
    speedBonus: 0,
    rangeBonus: 2,
    iconColor: 0x44aa44,
    iconSymbol: "E",
  },
  {
    id: "plate_armor",
    name: "Plate Armor",
    description: "Full plate providing maximum protection at the cost of agility.",
    atkBonus: 0,
    hpBonus: 200,
    speedBonus: -0.3,
    rangeBonus: 0,
    iconColor: 0xaaaacc,
    iconSymbol: "T",
  },
  {
    id: "winged_boots",
    name: "Winged Boots",
    description: "Magical footwear that greatly increases movement speed.",
    atkBonus: 0,
    hpBonus: 0,
    speedBonus: 1.5,
    rangeBonus: 0,
    iconColor: 0x88aadd,
    iconSymbol: "W",
  },
  {
    id: "mace_of_might",
    name: "Mace of Might",
    description: "A brutal mace that crushes through armor with raw force.",
    atkBonus: 18,
    hpBonus: 0,
    speedBonus: -0.2,
    rangeBonus: 0,
    iconColor: 0x776655,
    iconSymbol: "M",
  },
  {
    id: "halberd",
    name: "Halberd",
    description: "A versatile polearm combining reach with deadly cutting power.",
    atkBonus: 8,
    hpBonus: 0,
    speedBonus: 0,
    rangeBonus: 1,
    iconColor: 0x667766,
    iconSymbol: "H",
  },
  {
    id: "enchanted_cloak",
    name: "Enchanted Cloak",
    description: "A shimmering cloak that enhances both vitality and agility.",
    atkBonus: 0,
    hpBonus: 60,
    speedBonus: 0.8,
    rangeBonus: 0,
    iconColor: 0x6644aa,
    iconSymbol: "K",
  },
  {
    id: "giants_belt",
    name: "Giant's Belt",
    description: "A massive belt imbued with giant strength, boosting health enormously.",
    atkBonus: 3,
    hpBonus: 180,
    speedBonus: 0,
    rangeBonus: 0,
    iconColor: 0xaa8844,
    iconSymbol: "G",
  },
  // --- Tier 5: endgame unlocks ---
  {
    id: "dragonscale_mail",
    name: "Dragonscale Mail",
    description: "Armor forged from dragon scales — nearly indestructible.",
    atkBonus: 5,
    hpBonus: 250,
    speedBonus: 0,
    rangeBonus: 0,
    iconColor: 0xcc6622,
    iconSymbol: "R",
  },
  {
    id: "storm_lance",
    name: "Storm Lance",
    description: "A lance crackling with lightning, striking hard and far.",
    atkBonus: 14,
    hpBonus: 0,
    speedBonus: 0.3,
    rangeBonus: 1,
    iconColor: 0x4488cc,
    iconSymbol: "L",
  },
  {
    id: "crown_of_valor",
    name: "Crown of Valor",
    description: "A legendary crown that bolsters all aspects of the hero.",
    atkBonus: 8,
    hpBonus: 80,
    speedBonus: 0.5,
    rangeBonus: 0,
    iconColor: 0xddaa22,
    iconSymbol: "V",
  },
  {
    id: "shadow_dagger",
    name: "Shadow Dagger",
    description: "A swift dark blade that trades durability for raw speed and damage.",
    atkBonus: 20,
    hpBonus: -30,
    speedBonus: 1,
    rangeBonus: 0,
    iconColor: 0x332244,
    iconSymbol: "Z",
  },
  // --- Special: world mode quest rewards ---
  {
    id: "excalibur",
    name: "Excalibur",
    description: "The legendary sword of King Arthur, drawn from the stone. Grants immense power.",
    atkBonus: 25,
    hpBonus: 100,
    speedBonus: 0.5,
    rangeBonus: 1,
    iconColor: 0xffdd44,
    iconSymbol: "E",
  },
  // --- Arthurian relics (quest rewards) ---
  {
    id: "holy_grail",
    name: "The Holy Grail",
    description: "The sacred chalice of Christ. Its divine light heals all wounds and restores the weary.",
    atkBonus: 5,
    hpBonus: 200,
    speedBonus: 0,
    rangeBonus: 0,
    iconColor: 0xffeeaa,
    iconSymbol: "G",
  },
  {
    id: "lancelots_shield",
    name: "Lancelot's Shield",
    description: "The enchanted shield borne by the Knight of the Lake. Nearly impenetrable.",
    atkBonus: 0,
    hpBonus: 250,
    speedBonus: 0,
    rangeBonus: 0,
    iconColor: 0x4488cc,
    iconSymbol: "L",
  },
  {
    id: "gawains_girdle",
    name: "Gawain's Girdle",
    description: "The green sash given by the Lady. Its wearer survives blows that would fell any other.",
    atkBonus: 5,
    hpBonus: 150,
    speedBonus: 0.3,
    rangeBonus: 0,
    iconColor: 0x44aa44,
    iconSymbol: "W",
  },
  {
    id: "merlins_staff",
    name: "Merlin's Staff",
    description: "The staff of the Archmage of Avalon, crackling with ancient power.",
    atkBonus: 20,
    hpBonus: 50,
    speedBonus: 0,
    rangeBonus: 2,
    iconColor: 0x8844ff,
    iconSymbol: "M",
  },
  {
    id: "mordreds_crown",
    name: "Mordred's Crown",
    description: "The black iron crown of the Usurper. It drives its wearer to strike with terrible speed.",
    atkBonus: 22,
    hpBonus: -50,
    speedBonus: 1.0,
    rangeBonus: 0,
    iconColor: 0x442244,
    iconSymbol: "K",
  },
  {
    id: "nimues_veil",
    name: "Nimue's Veil",
    description: "A shimmering veil woven from lake-mist. Grants preternatural awareness.",
    atkBonus: 8,
    hpBonus: 80,
    speedBonus: 0.5,
    rangeBonus: 1,
    iconColor: 0x88ccee,
    iconSymbol: "N",
  },
  {
    id: "pellinores_horn",
    name: "Pellinore's Horn",
    description: "The hunting horn of the Questing King. Its call summons beasts from the wild.",
    atkBonus: 15,
    hpBonus: 100,
    speedBonus: 0,
    rangeBonus: 0,
    iconColor: 0xaa8844,
    iconSymbol: "P",
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const _itemMap = new Map<ArmoryItemId, ArmoryItemDef>();
for (const item of ARMORY_ITEMS) _itemMap.set(item.id, item);

export function getArmoryItem(id: ArmoryItemId): ArmoryItemDef | undefined {
  return _itemMap.get(id);
}

/** Maximum number of items that can be equipped at once. */
export const MAX_EQUIPPED_ITEMS = 2;
