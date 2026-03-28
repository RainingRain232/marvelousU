import {
  DiabloItem,
  DiabloSetBonus,
  DiabloMapId,
  ItemRarity,
  ItemSlot,
  ItemType,
  EnemyType,
  DamageType,
  CraftingRecipe,
  CraftType,
  CraftingStationType,
  MaterialType,
  CraftingMaterial,
  AdvancedCraftingRecipe,
  LegendaryEffectDef,
  RunewordDef,
  RuneType,
  StatusEffect,
} from './DiabloTypes';

// ---------------------------------------------------------------------------
//  4. ITEM DATABASE
// ---------------------------------------------------------------------------

let itemId = 0;
function nextId(): string {
  return `item_${++itemId}`;
}

export const ITEM_DATABASE: DiabloItem[] = [
  // =========================================================================
  //  COMMON ITEMS (20)
  // =========================================================================
  {
    id: nextId(), name: 'Basic Sword', icon: '⚔️',
    rarity: ItemRarity.COMMON, type: ItemType.SWORD, slot: ItemSlot.WEAPON,
    level: 1, value: 10, stats: { bonusDamage: 8 },
    description: 'A simple iron sword. Gets the job done.',
  },
  {
    id: nextId(), name: 'Iron Axe', icon: '🪓',
    rarity: ItemRarity.COMMON, type: ItemType.AXE, slot: ItemSlot.WEAPON,
    level: 1, value: 12, stats: { bonusDamage: 10, critDamage: 5 },
    description: 'A heavy iron axe with a keen edge.',
  },
  {
    id: nextId(), name: 'Wooden Bow', icon: '🏹',
    rarity: ItemRarity.COMMON, type: ItemType.BOW, slot: ItemSlot.WEAPON,
    level: 1, value: 10, stats: { bonusDamage: 7 },
    description: 'A bow carved from yew wood.',
  },
  {
    id: nextId(), name: 'Oak Staff', icon: '🔮',
    rarity: ItemRarity.COMMON, type: ItemType.STAFF, slot: ItemSlot.WEAPON,
    level: 1, value: 10, stats: { bonusDamage: 5, intelligence: 2 },
    description: 'A gnarled oak staff humming with faint energy.',
  },
  {
    id: nextId(), name: 'Leather Helmet', icon: '👑',
    rarity: ItemRarity.COMMON, type: ItemType.HELMET, slot: ItemSlot.HELMET,
    level: 1, value: 8, stats: { armor: 4 },
    description: 'A leather cap offering basic protection.',
  },
  {
    id: nextId(), name: 'Chain Mail', icon: '🛡️',
    rarity: ItemRarity.COMMON, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY,
    level: 1, value: 15, stats: { armor: 10 },
    description: 'Interlocking iron rings woven into a vest.',
  },
  {
    id: nextId(), name: 'Cloth Gloves', icon: '🧤',
    rarity: ItemRarity.COMMON, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS,
    level: 1, value: 5, stats: { armor: 2 },
    description: 'Simple cloth gloves. Better than nothing.',
  },
  {
    id: nextId(), name: 'Worn Boots', icon: '👢',
    rarity: ItemRarity.COMMON, type: ItemType.BOOTS, slot: ItemSlot.FEET,
    level: 1, value: 6, stats: { armor: 3, moveSpeed: 0.2 },
    description: 'Well-traveled boots with thin soles.',
  },
  {
    id: nextId(), name: 'Wooden Shield', icon: '🛡️',
    rarity: ItemRarity.COMMON, type: ItemType.SHIELD, slot: ItemSlot.WEAPON,
    level: 1, value: 10, stats: { armor: 8 },
    description: 'A round wooden shield banded with iron.',
  },
  {
    id: nextId(), name: 'Copper Ring', icon: '💍',
    rarity: ItemRarity.COMMON, type: ItemType.RING, slot: ItemSlot.ACCESSORY_1,
    level: 1, value: 5, stats: { vitality: 2 },
    description: 'A simple copper band.',
  },
  {
    id: nextId(), name: 'Hemp Amulet', icon: '📿',
    rarity: ItemRarity.COMMON, type: ItemType.AMULET, slot: ItemSlot.ACCESSORY_2,
    level: 1, value: 5, stats: { vitality: 3 },
    description: 'A polished stone on a hemp cord.',
  },
  {
    id: nextId(), name: 'Short Sword', icon: '🗡️',
    rarity: ItemRarity.COMMON, type: ItemType.SWORD, slot: ItemSlot.WEAPON,
    level: 2, value: 12, stats: { bonusDamage: 10, critChance: 1 },
    description: 'A compact blade favored by scouts.',
  },
  {
    id: nextId(), name: 'Iron Mace', icon: '⚔️',
    rarity: ItemRarity.COMMON, type: ItemType.MACE, slot: ItemSlot.WEAPON,
    level: 3, value: 14, stats: { bonusDamage: 12, critDamage: 5 },
    description: 'A heavy iron mace that crunches bones.',
  },
  {
    id: nextId(), name: 'Padded Leggings', icon: '🛡️',
    rarity: ItemRarity.COMMON, type: ItemType.LEG_ARMOR, slot: ItemSlot.LEGS,
    level: 1, value: 8, stats: { armor: 5 },
    description: 'Quilted leggings offering modest defense.',
  },
  {
    id: nextId(), name: 'Hunting Bow', icon: '🏹',
    rarity: ItemRarity.COMMON, type: ItemType.BOW, slot: ItemSlot.WEAPON,
    level: 3, value: 14, stats: { bonusDamage: 11, dexterity: 1, critChance: 1 },
    description: 'A recurve bow used for hunting game.',
  },
  {
    id: nextId(), name: 'Linen Robe', icon: '🛡️',
    rarity: ItemRarity.COMMON, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY,
    level: 1, value: 8, stats: { armor: 3, intelligence: 2 },
    description: 'A light robe woven from flax.',
  },
  {
    id: nextId(), name: 'Iron Helm', icon: '👑',
    rarity: ItemRarity.COMMON, type: ItemType.HELMET, slot: ItemSlot.HELMET,
    level: 3, value: 12, stats: { armor: 7 },
    description: 'A sturdy iron helm with a nose guard.',
  },
  {
    id: nextId(), name: 'Apprentice Wand', icon: '🔮',
    rarity: ItemRarity.COMMON, type: ItemType.WAND, slot: ItemSlot.WEAPON,
    level: 2, value: 10, stats: { bonusDamage: 6, intelligence: 3 },
    description: 'A novice spellcaster\'s first wand.',
  },
  {
    id: nextId(), name: 'Leather Belt', icon: '🛡️',
    rarity: ItemRarity.COMMON, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY,
    level: 1, value: 5, stats: { armor: 2 },
    description: 'A wide leather belt with a brass buckle.',
  },
  {
    id: nextId(), name: 'Traveler\'s Cloak', icon: '🛡️',
    rarity: ItemRarity.COMMON, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY,
    level: 2, value: 10, stats: { armor: 5 },
    description: 'A durable cloak for long journeys.',
  },

  // =========================================================================
  //  UNCOMMON ITEMS (18)
  // =========================================================================
  {
    id: nextId(), name: 'Reinforced Longsword', icon: '⚔️',
    rarity: ItemRarity.UNCOMMON, type: ItemType.SWORD, slot: ItemSlot.WEAPON,
    level: 5, value: 50, stats: { bonusDamage: 18, strength: 3, critChance: 2 },
    description: 'A longsword with a reinforced crossguard.',
  },
  {
    id: nextId(), name: 'Hardened Battleaxe', icon: '🪓',
    rarity: ItemRarity.UNCOMMON, type: ItemType.AXE, slot: ItemSlot.WEAPON,
    level: 5, value: 55, stats: { bonusDamage: 22, strength: 2, critDamage: 8 },
    description: 'An axe tempered in dragonfire coals.',
  },
  {
    id: nextId(), name: 'Composite Bow', icon: '🏹',
    rarity: ItemRarity.UNCOMMON, type: ItemType.BOW, slot: ItemSlot.WEAPON,
    level: 5, value: 48, stats: { bonusDamage: 16, dexterity: 4, critChance: 3 },
    description: 'A bow of layered wood and horn, powerful and precise.',
  },
  {
    id: nextId(), name: 'Willow Staff', icon: '🔮',
    rarity: ItemRarity.UNCOMMON, type: ItemType.STAFF, slot: ItemSlot.WEAPON,
    level: 5, value: 45, stats: { bonusDamage: 12, intelligence: 6, critChance: 2 },
    description: 'A staff of living willow that channels nature\'s power.',
  },
  {
    id: nextId(), name: 'Steel Helm', icon: '👑',
    rarity: ItemRarity.UNCOMMON, type: ItemType.HELMET, slot: ItemSlot.HELMET,
    level: 5, value: 40, stats: { armor: 12, vitality: 3 },
    description: 'A polished steel helmet with cheek guards.',
  },
  {
    id: nextId(), name: 'Brigandine Vest', icon: '🛡️',
    rarity: ItemRarity.UNCOMMON, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY,
    level: 5, value: 55, stats: { armor: 18, vitality: 4 },
    description: 'Steel plates riveted between layers of cloth.',
  },
  {
    id: nextId(), name: 'Studded Gauntlets', icon: '🧤',
    rarity: ItemRarity.UNCOMMON, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS,
    level: 5, value: 35, stats: { armor: 6, strength: 3 },
    description: 'Iron-studded leather gauntlets.',
  },
  {
    id: nextId(), name: 'Ironshod Boots', icon: '👢',
    rarity: ItemRarity.UNCOMMON, type: ItemType.BOOTS, slot: ItemSlot.FEET,
    level: 5, value: 38, stats: { armor: 8, moveSpeed: 0.5 },
    description: 'Boots reinforced with iron plates at toe and heel.',
  },
  {
    id: nextId(), name: 'Kite Shield', icon: '🛡️',
    rarity: ItemRarity.UNCOMMON, type: ItemType.SHIELD, slot: ItemSlot.WEAPON,
    level: 5, value: 50, stats: { armor: 16, vitality: 3 },
    description: 'A tall kite shield bearing a faded crest.',
  },
  {
    id: nextId(), name: 'Silver Ring', icon: '💍',
    rarity: ItemRarity.UNCOMMON, type: ItemType.RING, slot: ItemSlot.ACCESSORY_1,
    level: 5, value: 30, stats: { vitality: 4, intelligence: 2 },
    description: 'A silver ring engraved with protective runes.',
  },
  {
    id: nextId(), name: 'Jade Amulet', icon: '📿',
    rarity: ItemRarity.UNCOMMON, type: ItemType.AMULET, slot: ItemSlot.ACCESSORY_2,
    level: 5, value: 32, stats: { vitality: 5, manaRegen: 1 },
    description: 'A carved jade pendant radiating calm.',
  },
  {
    id: nextId(), name: 'Reinforced Leggings', icon: '🛡️',
    rarity: ItemRarity.UNCOMMON, type: ItemType.LEG_ARMOR, slot: ItemSlot.LEGS,
    level: 5, value: 42, stats: { armor: 10, vitality: 3 },
    description: 'Leggings with riveted steel plates at the knees.',
  },
  {
    id: nextId(), name: 'Scout\'s Quiver', icon: '🏹',
    rarity: ItemRarity.UNCOMMON, type: ItemType.BOW, slot: ItemSlot.WEAPON,
    level: 5, value: 35, stats: { dexterity: 4, critChance: 2 },
    description: 'A leather quiver that keeps arrows within easy reach.',
  },
  {
    id: nextId(), name: 'Channeling Orb', icon: '🔮',
    rarity: ItemRarity.UNCOMMON, type: ItemType.WAND, slot: ItemSlot.WEAPON,
    level: 5, value: 38, stats: { intelligence: 5, manaRegen: 1, critChance: 2 },
    description: 'A glass orb swirling with arcane mist.',
  },
  {
    id: nextId(), name: 'Hardened Belt', icon: '🛡️',
    rarity: ItemRarity.UNCOMMON, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY,
    level: 5, value: 30, stats: { armor: 5, strength: 2 },
    description: 'A thick belt of boiled leather.',
  },
  {
    id: nextId(), name: 'Ranger\'s Hood', icon: '👑',
    rarity: ItemRarity.UNCOMMON, type: ItemType.HELMET, slot: ItemSlot.HELMET,
    level: 6, value: 38, stats: { armor: 7, dexterity: 5 },
    description: 'A hooded cowl worn by woodland rangers.',
  },
  {
    id: nextId(), name: 'Acolyte\'s Robe', icon: '🛡️',
    rarity: ItemRarity.UNCOMMON, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY,
    level: 6, value: 42, stats: { armor: 8, intelligence: 5, manaRegen: 1 },
    description: 'Deep blue robes favored by temple acolytes.',
  },
  {
    id: nextId(), name: 'Serrated Dagger', icon: '🗡️',
    rarity: ItemRarity.UNCOMMON, type: ItemType.DAGGER, slot: ItemSlot.WEAPON,
    level: 4, value: 40, stats: { bonusDamage: 14, critChance: 3, dexterity: 2 },
    description: 'A wicked blade with a saw-tooth edge.',
  },

  // =========================================================================
  //  RARE ITEMS (14)
  // =========================================================================
  {
    id: nextId(), name: 'Stormcaller Bow', icon: '🏹',
    rarity: ItemRarity.RARE, type: ItemType.BOW, slot: ItemSlot.WEAPON,
    level: 12, value: 150, stats: { bonusDamage: 32, dexterity: 8, critChance: 5, lightningResist: 10 },
    description: 'Arrows loosed from this bow crackle with static.',
  },
  {
    id: nextId(), name: 'Frostweave Robes', icon: '🛡️',
    rarity: ItemRarity.RARE, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY,
    level: 12, value: 160, stats: { armor: 22, intelligence: 10, iceResist: 15, manaRegen: 2 },
    description: 'Woven from threads chilled in an eternal winter spring.',
  },
  {
    id: nextId(), name: 'Blazeguard Plate', icon: '🛡️',
    rarity: ItemRarity.RARE, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY,
    level: 14, value: 180, stats: { armor: 35, strength: 8, fireResist: 15, vitality: 6 },
    description: 'Plate armor forged in the heart of a volcano.',
  },
  {
    id: nextId(), name: 'Nightstalker Gloves', icon: '🧤',
    rarity: ItemRarity.RARE, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS,
    level: 10, value: 120, stats: { armor: 10, dexterity: 7, critChance: 5, attackSpeed: 5 },
    description: 'Gloves that move as silently as shadow.',
  },
  {
    id: nextId(), name: 'Ironbark Greaves', icon: '👢',
    rarity: ItemRarity.RARE, type: ItemType.BOOTS, slot: ItemSlot.FEET,
    level: 12, value: 140, stats: { armor: 16, vitality: 6, moveSpeed: 1.0, poisonResist: 10 },
    description: 'Boots crafted from enchanted ironbark wood.',
  },
  {
    id: nextId(), name: 'Warlord\'s Helm', icon: '👑',
    rarity: ItemRarity.RARE, type: ItemType.HELMET, slot: ItemSlot.HELMET,
    level: 15, value: 170, stats: { armor: 20, strength: 8, vitality: 8, critDamage: 10 },
    description: 'A horned helm worn by a legendary warlord.',
  },
  {
    id: nextId(), name: 'Serpentfang', icon: '🗡️',
    rarity: ItemRarity.RARE, type: ItemType.SWORD, slot: ItemSlot.WEAPON,
    level: 12, value: 155, stats: { bonusDamage: 28, dexterity: 6, critChance: 6, poisonResist: 8 },
    description: 'A curved blade coated with serpent venom.',
  },
  {
    id: nextId(), name: 'Runic Tower Shield', icon: '🛡️',
    rarity: ItemRarity.RARE, type: ItemType.SHIELD, slot: ItemSlot.WEAPON,
    level: 14, value: 165, stats: { armor: 28, vitality: 8, fireResist: 8, iceResist: 8 },
    description: 'Ancient runes flare to life when danger approaches.',
  },
  {
    id: nextId(), name: 'Moonstone Ring', icon: '💍',
    rarity: ItemRarity.RARE, type: ItemType.RING, slot: ItemSlot.ACCESSORY_1,
    level: 10, value: 120, stats: { intelligence: 8, manaRegen: 3, critChance: 3 },
    description: 'A ring set with a stone that glows under moonlight.',
  },
  {
    id: nextId(), name: 'Talisman of Vigor', icon: '📿',
    rarity: ItemRarity.RARE, type: ItemType.AMULET, slot: ItemSlot.ACCESSORY_2,
    level: 12, value: 135, stats: { vitality: 12, bonusHealth: 5, strength: 4 },
    description: 'An amulet pulsing with restorative energy.',
  },
  {
    id: nextId(), name: 'Windrunner Leggings', icon: '🛡️',
    rarity: ItemRarity.RARE, type: ItemType.LEG_ARMOR, slot: ItemSlot.LEGS,
    level: 11, value: 140, stats: { armor: 15, dexterity: 7, moveSpeed: 0.8, critChance: 3 },
    description: 'Enchanted leggings that quicken the wearer\'s stride.',
  },
  {
    id: nextId(), name: 'Emberstrike Axe', icon: '🪓',
    rarity: ItemRarity.RARE, type: ItemType.AXE, slot: ItemSlot.WEAPON,
    level: 13, value: 160, stats: { bonusDamage: 35, strength: 7, critDamage: 15, fireResist: 5 },
    description: 'Each swing leaves a trail of smoldering embers.',
  },
  {
    id: nextId(), name: 'Arcane Focus', icon: '🔮',
    rarity: ItemRarity.RARE, type: ItemType.WAND, slot: ItemSlot.WEAPON,
    level: 12, value: 145, stats: { intelligence: 12, manaRegen: 3, bonusDamage: 8 },
    description: 'A crystalline focus amplifying spell potency.',
  },
  {
    id: nextId(), name: 'Viperstrike Quiver', icon: '🏹',
    rarity: ItemRarity.RARE, type: ItemType.BOW, slot: ItemSlot.WEAPON,
    level: 12, value: 140, stats: { dexterity: 8, critChance: 6, attackSpeed: 8 },
    description: 'Arrows drawn from this quiver strike with serpentine speed.',
  },

  // =========================================================================
  //  EPIC ITEMS (12)
  // =========================================================================
  {
    id: nextId(), name: 'Dreadnought Plate', icon: '🛡️',
    rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY,
    level: 20, value: 500, stats: { armor: 55, strength: 14, vitality: 14, fireResist: 12, iceResist: 12 },
    description: 'Forged from meteoric iron, this plate has never been breached.',
  },
  {
    id: nextId(), name: 'Whisperwind Longbow', icon: '🏹',
    rarity: ItemRarity.EPIC, type: ItemType.BOW, slot: ItemSlot.WEAPON,
    level: 20, value: 520, stats: { bonusDamage: 48, dexterity: 14, critChance: 8, attackSpeed: 10, critDamage: 20 },
    description: 'So light and swift, arrows seem to arrive before they are loosed.',
  },
  {
    id: nextId(), name: 'Staff of the Archmage', icon: '🔮',
    rarity: ItemRarity.EPIC, type: ItemType.STAFF, slot: ItemSlot.WEAPON,
    level: 22, value: 550, stats: { bonusDamage: 35, intelligence: 18, manaRegen: 5, critChance: 5 },
    description: 'A staff passed down through nine generations of archmages.',
  },
  {
    id: nextId(), name: 'Crown of the Fallen King', icon: '👑',
    rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET,
    level: 22, value: 540, stats: { armor: 30, strength: 12, vitality: 12, critDamage: 18, bonusHealth: 5 },
    description: 'Taken from the skull of a king who bargained with demons.',
  },
  {
    id: nextId(), name: 'Voidwalker Boots', icon: '👢',
    rarity: ItemRarity.EPIC, type: ItemType.BOOTS, slot: ItemSlot.FEET,
    level: 20, value: 480, stats: { armor: 22, dexterity: 10, moveSpeed: 1.5, critChance: 5, lightningResist: 15 },
    description: 'Step between the spaces of reality.',
  },
  {
    id: nextId(), name: 'Gauntlets of Ruin', icon: '🧤',
    rarity: ItemRarity.EPIC, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS,
    level: 20, value: 490, stats: { armor: 18, strength: 12, critDamage: 25, attackSpeed: 8, bonusDamage: 8 },
    description: 'Everything they touch crumbles to dust.',
  },
  {
    id: nextId(), name: 'Obsidian Aegis', icon: '🛡️',
    rarity: ItemRarity.EPIC, type: ItemType.SHIELD, slot: ItemSlot.WEAPON,
    level: 22, value: 560, stats: { armor: 45, vitality: 15, fireResist: 15, iceResist: 15, lightningResist: 15 },
    description: 'A shield carved from a single block of volcanic glass.',
  },
  {
    id: nextId(), name: 'Bloodstone Amulet', icon: '📿',
    rarity: ItemRarity.EPIC, type: ItemType.AMULET, slot: ItemSlot.ACCESSORY_2,
    level: 18, value: 400, stats: { vitality: 15, lifeSteal: 3, critChance: 5, critDamage: 15, strength: 6 },
    description: 'The crimson gem hungers for the blood of your enemies.',
  },
  {
    id: nextId(), name: 'Band of Infinity', icon: '💍',
    rarity: ItemRarity.EPIC, type: ItemType.RING, slot: ItemSlot.ACCESSORY_1,
    level: 20, value: 420, stats: { intelligence: 14, manaRegen: 5, bonusDamage: 10, critChance: 4 },
    description: 'A ring that has no beginning and no end, like magic itself.',
  },
  {
    id: nextId(), name: 'Doombringer', icon: '⚔️',
    rarity: ItemRarity.EPIC, type: ItemType.SWORD, slot: ItemSlot.WEAPON,
    level: 22, value: 580, stats: { bonusDamage: 52, strength: 14, critChance: 7, critDamage: 22, lifeSteal: 2 },
    description: 'A cursed blade that feeds on the despair of its victims.',
  },
  {
    id: nextId(), name: 'Titan\'s Girdle', icon: '🛡️',
    rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY,
    level: 20, value: 450, stats: { armor: 15, strength: 12, vitality: 12, bonusHealth: 4 },
    description: 'A belt so heavy only the mightiest can wear it.',
  },
  {
    id: nextId(), name: 'Phantomweave Leggings', icon: '🛡️',
    rarity: ItemRarity.EPIC, type: ItemType.LEG_ARMOR, slot: ItemSlot.LEGS,
    level: 20, value: 470, stats: { armor: 25, dexterity: 12, moveSpeed: 1.0, critChance: 6, poisonResist: 12 },
    description: 'Leggings that shimmer and fade, confusing attackers.',
  },

  // =========================================================================
  //  LEGENDARY ITEMS (10)
  // =========================================================================
  {
    id: nextId(), name: 'Excalibur', icon: '⚔️',
    rarity: ItemRarity.LEGENDARY, type: ItemType.SWORD, slot: ItemSlot.WEAPON,
    level: 30, value: 2000, stats: { bonusDamage: 75, strength: 20, critChance: 10, critDamage: 30, vitality: 10 },
    description: 'The legendary blade of kings, blazing with holy light.',
    legendaryAbility: 'Holy strikes deal 50% bonus damage to undead.',
  },
  {
    id: nextId(), name: 'Shadowfang', icon: '🗡️',
    rarity: ItemRarity.LEGENDARY, type: ItemType.SWORD, slot: ItemSlot.WEAPON,
    level: 30, value: 1900, stats: { bonusDamage: 65, dexterity: 18, critChance: 15, critDamage: 35, attackSpeed: 12 },
    description: 'A blade wreathed in living shadow that hungers for souls.',
    legendaryAbility: 'Critical hits spawn a shadow clone for 5 seconds.',
  },
  {
    id: nextId(), name: 'Aegis of the Eternal', icon: '🛡️',
    rarity: ItemRarity.LEGENDARY, type: ItemType.SHIELD, slot: ItemSlot.WEAPON,
    level: 30, value: 2100, stats: { armor: 65, vitality: 25, fireResist: 20, iceResist: 20, lightningResist: 20 },
    description: 'A shield that has protected its bearer through a thousand wars.',
    legendaryAbility: 'Blocking an attack has a 20% chance to fully heal you.',
  },
  {
    id: nextId(), name: 'Stormbreaker', icon: '🪓',
    rarity: ItemRarity.LEGENDARY, type: ItemType.AXE, slot: ItemSlot.WEAPON,
    level: 32, value: 2200, stats: { bonusDamage: 82, strength: 22, critDamage: 40, lightningResist: 20, attackSpeed: 8 },
    description: 'An axe forged in the heart of a thunderstorm.',
    legendaryAbility: 'Every 5th hit unleashes a chain lightning bolt hitting 3 nearby enemies.',
  },
  {
    id: nextId(), name: 'Yggdrasil\'s Reach', icon: '🏹',
    rarity: ItemRarity.LEGENDARY, type: ItemType.BOW, slot: ItemSlot.WEAPON,
    level: 30, value: 2000, stats: { bonusDamage: 68, dexterity: 22, critChance: 12, poisonResist: 15 },
    description: 'Carved from the World Tree, each arrow carries nature\'s wrath.',
    legendaryAbility: 'Arrows root enemies in place for 2 seconds on hit.',
  },
  {
    id: nextId(), name: 'Soulfire Staff', icon: '🔮',
    rarity: ItemRarity.LEGENDARY, type: ItemType.STAFF, slot: ItemSlot.WEAPON,
    level: 30, value: 2000, stats: { bonusDamage: 55, intelligence: 28, manaRegen: 8, critChance: 8 },
    description: 'The flames of this staff burn with the essence of trapped souls.',
    legendaryAbility: 'Fire spells have a 25% chance to cast twice.',
  },
  {
    id: nextId(), name: 'Dragonscale Armor', icon: '🛡️',
    rarity: ItemRarity.LEGENDARY, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY,
    level: 32, value: 2300, stats: { armor: 75, vitality: 20, strength: 15, fireResist: 30, critDamage: 15 },
    description: 'Scales shed by an ancient wyrm, hammered into impenetrable armor.',
    legendaryAbility: 'Taking fire damage heals you for 10% of the damage dealt.',
  },
  {
    id: nextId(), name: 'Crown of the Lich King', icon: '👑',
    rarity: ItemRarity.LEGENDARY, type: ItemType.HELMET, slot: ItemSlot.HELMET,
    level: 32, value: 2200, stats: { armor: 40, intelligence: 22, vitality: 15, manaRegen: 6, bonusDamage: 12 },
    description: 'The crown of an undead sovereign, thrumming with necrotic power.',
    legendaryAbility: 'Killing an enemy has a 15% chance to raise a skeleton ally for 10 seconds.',
  },
  {
    id: nextId(), name: 'Windwalker Treads', icon: '👢',
    rarity: ItemRarity.LEGENDARY, type: ItemType.BOOTS, slot: ItemSlot.FEET,
    level: 28, value: 1800, stats: { armor: 30, dexterity: 16, moveSpeed: 2.5, critChance: 8, attackSpeed: 10 },
    description: 'Boots that leave no footprints and make no sound.',
    legendaryAbility: 'Gain 3 seconds of invisibility after killing an enemy.',
  },
  {
    id: nextId(), name: 'Heart of the Mountain', icon: '📿',
    rarity: ItemRarity.LEGENDARY, type: ItemType.AMULET, slot: ItemSlot.ACCESSORY_2,
    level: 30, value: 2000, stats: { vitality: 25, armor: 20, bonusHealth: 10, strength: 12, fireResist: 20 },
    description: 'A shard of crystallized earth from the deepest dwarven mines.',
    legendaryAbility: 'When below 30% HP, gain 50% damage reduction for 5 seconds (60s cooldown).',
  },

  // =========================================================================
  //  MYTHIC ITEMS (6)
  // =========================================================================
  {
    id: nextId(), name: 'Ragnarok', icon: '⚔️',
    rarity: ItemRarity.MYTHIC, type: ItemType.SWORD, slot: ItemSlot.WEAPON,
    level: 40, value: 8000, stats: { bonusDamage: 110, strength: 30, critChance: 15, critDamage: 50, attackSpeed: 12 },
    description: 'The blade that will end the world. Or save it.',
    legendaryAbility: 'Each kill increases damage by 5% for 10 seconds, stacking up to 10 times.',
  },
  {
    id: nextId(), name: 'Celestial Longbow', icon: '🏹',
    rarity: ItemRarity.MYTHIC, type: ItemType.BOW, slot: ItemSlot.WEAPON,
    level: 40, value: 7500, stats: { bonusDamage: 95, dexterity: 30, critChance: 18, critDamage: 45 },
    description: 'Strung with a beam of starlight, its arrows pierce the veil between worlds.',
    legendaryAbility: 'Arrows pass through all enemies and walls, hitting everything in their path.',
  },
  {
    id: nextId(), name: 'Staff of Eternity', icon: '🔮',
    rarity: ItemRarity.MYTHIC, type: ItemType.STAFF, slot: ItemSlot.WEAPON,
    level: 40, value: 8000, stats: { bonusDamage: 80, intelligence: 35, manaRegen: 12, critChance: 12 },
    description: 'Time itself bends around the wielder of this impossible staff.',
    legendaryAbility: 'All skill cooldowns are reduced by 30%.',
  },
  {
    id: nextId(), name: 'Armor of the Void', icon: '🛡️',
    rarity: ItemRarity.MYTHIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY,
    level: 42, value: 8500, stats: { armor: 100, vitality: 30, strength: 20, fireResist: 25, iceResist: 25 },
    description: 'Forged in the space between dimensions, it absorbs all that touches it.',
    legendaryAbility: '10% of all damage taken is reflected back to the attacker.',
  },
  {
    id: nextId(), name: 'Ring of the Cosmos', icon: '💍',
    rarity: ItemRarity.MYTHIC, type: ItemType.RING, slot: ItemSlot.ACCESSORY_1,
    level: 38, value: 7000, stats: { intelligence: 20, dexterity: 20, strength: 20, critChance: 10, bonusDamage: 15 },
    description: 'A ring forged from the dust of a dying star.',
    legendaryAbility: 'All elemental resistances increased by 20%. Skills deal an additional element of damage.',
  },
  {
    id: nextId(), name: 'Demonhide Gauntlets', icon: '🧤',
    rarity: ItemRarity.MYTHIC, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS,
    level: 40, value: 7500, stats: { armor: 35, strength: 20, critDamage: 40, attackSpeed: 15, lifeSteal: 5 },
    description: 'Gauntlets flayed from a greater demon, still warm to the touch.',
    legendaryAbility: 'Melee attacks have a 10% chance to deal triple damage.',
  },

  // =========================================================================
  //  DIVINE ITEMS (4)
  // =========================================================================
  {
    id: nextId(), name: 'Blade of the First Dawn', icon: '⚔️',
    rarity: ItemRarity.DIVINE, type: ItemType.SWORD, slot: ItemSlot.WEAPON,
    level: 48, value: 25000, stats: { bonusDamage: 150, strength: 40, critChance: 20, critDamage: 60, vitality: 25 },
    description: 'The first weapon ever forged, touched by the hands of creation itself.',
    legendaryAbility: 'Attacks deal bonus holy damage equal to 25% of your max HP. Undead enemies are instantly destroyed below 20% HP.',
  },
  {
    id: nextId(), name: 'Veil of the Seraph', icon: '🛡️',
    rarity: ItemRarity.DIVINE, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY,
    level: 48, value: 25000, stats: { armor: 140, vitality: 40, strength: 25, intelligence: 25, bonusHealth: 15 },
    description: 'Armor woven from the wings of a fallen angel.',
    legendaryAbility: 'Upon death, resurrect with 50% HP once every 3 minutes. All healing received is doubled.',
  },
  {
    id: nextId(), name: 'Eye of Omniscience', icon: '📿',
    rarity: ItemRarity.DIVINE, type: ItemType.AMULET, slot: ItemSlot.ACCESSORY_2,
    level: 45, value: 22000, stats: { intelligence: 35, manaRegen: 15, bonusDamage: 30, critChance: 15, critDamage: 30 },
    description: 'An amulet containing an eye that sees all timelines simultaneously.',
    legendaryAbility: 'All skills deal 40% increased damage. Mana costs reduced by 50%.',
  },
  {
    id: nextId(), name: 'Boots of the Worldwalker', icon: '👢',
    rarity: ItemRarity.DIVINE, type: ItemType.BOOTS, slot: ItemSlot.FEET,
    level: 46, value: 23000, stats: { armor: 50, dexterity: 30, moveSpeed: 4.0, critChance: 12, attackSpeed: 20 },
    description: 'These boots have walked across every realm in existence.',
    legendaryAbility: 'Movement speed doubled. Dodging an attack grants 100% critical chance for 2 seconds.',
  },
  // ══════════════════════════════════════════════════════════════════════════
  //  MAP-SPECIFIC SET ITEMS & UNIQUES
  // ══════════════════════════════════════════════════════════════════════════

  // ── FOREST (level 5-8) ── Woodsman's Set ──
  { id: nextId(), name: "Woodsman's Coif", icon: '🪖', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 6, value: 120, stats: { armor: 8, dexterity: 4, critChance: 2 }, description: 'Woven from bark and sinew, it smells of pine and blood.', setName: "Woodsman's Regalia" },
  { id: nextId(), name: "Woodsman's Hauberk", icon: '🦺', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 7, value: 180, stats: { armor: 14, vitality: 5, poisonResist: 4 }, description: 'Hardened leather stitched with wolf tendons.', setName: "Woodsman's Regalia" },
  { id: nextId(), name: "Woodsman's Broadaxe", icon: '🪓', rarity: ItemRarity.EPIC, type: ItemType.AXE, slot: ItemSlot.WEAPON, level: 7, value: 200, stats: { bonusDamage: 10, strength: 5, critDamage: 6 }, description: 'Notched from a hundred hunts, it bites deeper than any wolf.', setName: "Woodsman's Regalia" },
  { id: nextId(), name: 'Thornmother', icon: '🌿', rarity: ItemRarity.LEGENDARY, type: ItemType.STAFF, slot: ItemSlot.WEAPON, level: 8, value: 350, stats: { bonusDamage: 14, intelligence: 6, poisonResist: 5 }, description: 'A gnarled branch still alive with sap.', legendaryAbility: 'Attacks have a 15% chance to summon entangling roots that immobilize the target for 2 seconds.' },

  // ── ELVEN_VILLAGE (level 8-12) ── Corrupted Sentinel Set ──
  { id: nextId(), name: 'Corrupted Sentinel Blade', icon: '🗡️', rarity: ItemRarity.EPIC, type: ItemType.SWORD, slot: ItemSlot.WEAPON, level: 10, value: 320, stats: { bonusDamage: 16, dexterity: 7, critChance: 4 }, description: 'Elven steel tainted by shadow.', setName: 'Corrupted Sentinel' },
  { id: nextId(), name: 'Corrupted Sentinel Grips', icon: '🧤', rarity: ItemRarity.EPIC, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS, level: 10, value: 260, stats: { armor: 10, dexterity: 6, attackSpeed: 4 }, description: 'Fingerless gloves etched with once-holy runes now pulsing with void light.', setName: 'Corrupted Sentinel' },
  { id: nextId(), name: 'Corrupted Sentinel Circlet', icon: '👁️', rarity: ItemRarity.EPIC, type: ItemType.RING, slot: ItemSlot.ACCESSORY_1, level: 11, value: 280, stats: { intelligence: 8, critChance: 3, manaRegen: 3 }, description: 'A ring of blackened mithril.', setName: 'Corrupted Sentinel' },
  { id: nextId(), name: 'Aelindra, Last Light of the Grove', icon: '✨', rarity: ItemRarity.LEGENDARY, type: ItemType.SWORD, slot: ItemSlot.WEAPON, level: 12, value: 520, stats: { bonusDamage: 20, dexterity: 9, critDamage: 10 }, description: 'The personal blade of Sentinel-Captain Aelindra.', legendaryAbility: 'Critical hits release a burst of purifying light, dealing 25% bonus holy damage and reducing enemy damage by 10% for 4 seconds.' },

  // ── NECROPOLIS_DUNGEON (level 12-16) ── Gravecaller's Set ──
  { id: nextId(), name: "Gravecaller's Visage", icon: '💀', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 13, value: 380, stats: { armor: 16, intelligence: 9, bonusMana: 20 }, description: 'A skull-faced helm that lets the wearer see through the eyes of the dead.', setName: "Gravecaller's Vestments" },
  { id: nextId(), name: "Gravecaller's Shroud", icon: '🦇', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 14, value: 440, stats: { armor: 22, vitality: 10, iceResist: 8 }, description: 'Stitched from funerary wrappings of thirteen condemned priests.', setName: "Gravecaller's Vestments" },
  { id: nextId(), name: "Gravecaller's Scepter", icon: '🦴', rarity: ItemRarity.EPIC, type: ItemType.MACE, slot: ItemSlot.WEAPON, level: 14, value: 460, stats: { bonusDamage: 22, intelligence: 10, manaRegen: 5 }, description: 'A femur wound with grave-iron.', setName: "Gravecaller's Vestments" },
  { id: nextId(), name: 'Soulthorn, the Reaping Wand', icon: '🪄', rarity: ItemRarity.LEGENDARY, type: ItemType.WAND, slot: ItemSlot.WEAPON, level: 16, value: 720, stats: { bonusDamage: 26, intelligence: 12, lifeSteal: 5 }, description: 'Carved from the spine of a lich-prince.', legendaryAbility: 'Killing an enemy raises a skeletal minion that fights for 10 seconds, inheriting 30% of your damage.' },

  // ── VOLCANIC_WASTES (level 16-20) ── Molten Core Set ──
  { id: nextId(), name: 'Molten Core Greathammer', icon: '🔨', rarity: ItemRarity.EPIC, type: ItemType.MACE, slot: ItemSlot.WEAPON, level: 18, value: 580, stats: { bonusDamage: 28, strength: 14, fireResist: 10 }, description: 'Forged in a caldera and never cooled.', setName: 'Molten Core' },
  { id: nextId(), name: 'Molten Core Gauntlets', icon: '🧯', rarity: ItemRarity.EPIC, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS, level: 17, value: 480, stats: { armor: 18, strength: 12, fireResist: 12 }, description: 'Obsidian-plated fists that glow cherry-red.', setName: 'Molten Core' },
  { id: nextId(), name: 'Molten Core Pendant', icon: '🔥', rarity: ItemRarity.EPIC, type: ItemType.AMULET, slot: ItemSlot.ACCESSORY_2, level: 18, value: 520, stats: { bonusDamage: 12, fireResist: 15, critDamage: 10 }, description: 'A shard of living magma suspended in a cage of cooled basalt.', setName: 'Molten Core' },
  { id: nextId(), name: 'Pyreclasm', icon: '🌋', rarity: ItemRarity.LEGENDARY, type: ItemType.AXE, slot: ItemSlot.WEAPON, level: 20, value: 920, stats: { bonusDamage: 34, strength: 16, critChance: 6 }, description: 'Split from the tooth of a volcano titan.', legendaryAbility: 'Every 5th attack erupts in a magma wave dealing 40% weapon damage as fire damage to all enemies in a cone.' },

  // ── ABYSSAL_RIFT (level 20-24) ── Riftwalker's Set ──
  { id: nextId(), name: "Riftwalker's Cowl", icon: '🌀', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 21, value: 640, stats: { armor: 24, intelligence: 14, lightningResist: 10 }, description: 'Looking through the visor reveals a sky that should not exist.', setName: "Riftwalker's Raiment" },
  { id: nextId(), name: "Riftwalker's Voidmantle", icon: '🌌', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 22, value: 720, stats: { armor: 30, vitality: 16, bonusHealth: 40 }, description: 'Woven from the fabric between dimensions.', setName: "Riftwalker's Raiment" },
  { id: nextId(), name: "Riftwalker's Voidstaff", icon: '🔮', rarity: ItemRarity.EPIC, type: ItemType.STAFF, slot: ItemSlot.WEAPON, level: 22, value: 740, stats: { bonusDamage: 32, intelligence: 16, manaRegen: 8 }, description: 'A staff of condensed nothingness.', setName: "Riftwalker's Raiment" },
  { id: nextId(), name: 'Nullblade, Edge of the Unreal', icon: '🕳️', rarity: ItemRarity.LEGENDARY, type: ItemType.DAGGER, slot: ItemSlot.WEAPON, level: 24, value: 1100, stats: { bonusDamage: 38, dexterity: 18, critChance: 8 }, description: 'A blade that cuts not flesh but reality.', legendaryAbility: 'Attacks phase through armor, ignoring 30% of enemy defense. Kills have a 10% chance to open a micro-rift that pulls nearby enemies together.' },

  // ── DRAGONS_SANCTUM (level 22-26) ── Dragonslayer's Set ──
  { id: nextId(), name: "Dragonslayer's Fang", icon: '⚔️', rarity: ItemRarity.EPIC, type: ItemType.SWORD, slot: ItemSlot.WEAPON, level: 24, value: 820, stats: { bonusDamage: 36, strength: 18, critDamage: 14 }, description: 'Forged from a dragon tooth and quenched in wyrm-blood.', setName: "Dragonslayer's Triumph" },
  { id: nextId(), name: "Dragonslayer's Scalemail", icon: '🐉', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 24, value: 800, stats: { armor: 36, fireResist: 16, vitality: 18 }, description: 'Each scale was pried from a different fallen wyrm.', setName: "Dragonslayer's Triumph" },
  { id: nextId(), name: "Dragonslayer's Greaves", icon: '🦿', rarity: ItemRarity.EPIC, type: ItemType.LEG_ARMOR, slot: ItemSlot.LEGS, level: 23, value: 700, stats: { armor: 28, strength: 14, moveSpeed: 5 }, description: 'Plated with overlapping wyrm-scales.', setName: "Dragonslayer's Triumph" },
  { id: nextId(), name: 'Gharrax, the Dragon Fang Lance', icon: '🏹', rarity: ItemRarity.LEGENDARY, type: ItemType.BOW, slot: ItemSlot.WEAPON, level: 26, value: 1300, stats: { bonusDamage: 42, dexterity: 20, critChance: 9 }, description: 'A greatbow strung with dragon sinew.', legendaryAbility: 'Charged attacks fire a dragon-breath arrow that pierces all enemies in a line, applying a burning DOT dealing 20% weapon damage over 4 seconds. Stacks up to 3 times.' },

  // ── SUNSCORCH_DESERT (level 8-12) ── Desert Nomad's Set ──
  { id: nextId(), name: "Desert Nomad's Turban", icon: '👳', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 9, value: 240, stats: { armor: 10, fireResist: 6, intelligence: 5 }, description: 'Sand-silk wrappings that keep the mind cool when the dunes boil.', setName: "Desert Nomad's Garb" },
  { id: nextId(), name: "Desert Nomad's Sandwalkers", icon: '🥾', rarity: ItemRarity.EPIC, type: ItemType.BOOTS, slot: ItemSlot.FEET, level: 9, value: 220, stats: { armor: 8, moveSpeed: 6, dexterity: 5 }, description: 'Impossibly light boots that leave no footprints.', setName: "Desert Nomad's Garb" },
  { id: nextId(), name: "Desert Nomad's Sun Sigil", icon: '☀️', rarity: ItemRarity.EPIC, type: ItemType.AMULET, slot: ItemSlot.ACCESSORY_2, level: 10, value: 260, stats: { fireResist: 8, bonusHealth: 15, manaRegen: 3 }, description: 'A golden disc that absorbs the killing heat and converts it to vitality.', setName: "Desert Nomad's Garb" },
  { id: nextId(), name: 'Miragecleaver', icon: '🏜️', rarity: ItemRarity.LEGENDARY, type: ItemType.SWORD, slot: ItemSlot.WEAPON, level: 12, value: 540, stats: { bonusDamage: 18, dexterity: 8, attackSpeed: 6 }, description: 'A curved blade that shimmers like a heat haze.', legendaryAbility: 'Attacks have a 20% chance to create a mirage clone that attacks the same target for 50% damage for 3 seconds.' },

  // ── EMERALD_GRASSLANDS (level 5-8) ── Verdant Guardian's Set ──
  { id: nextId(), name: "Verdant Guardian's Breastplate", icon: '🌱', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 6, value: 160, stats: { armor: 12, vitality: 5, bonusHealth: 10 }, description: 'Living vines weave through the links, mending damage as fast as it forms.', setName: "Verdant Guardian's Embrace" },
  { id: nextId(), name: "Verdant Guardian's Legguards", icon: '🍃', rarity: ItemRarity.EPIC, type: ItemType.LEG_ARMOR, slot: ItemSlot.LEGS, level: 6, value: 140, stats: { armor: 10, vitality: 4, moveSpeed: 3 }, description: 'Woven grass that hardens like steel at the moment of impact.', setName: "Verdant Guardian's Embrace" },
  { id: nextId(), name: "Verdant Guardian's Seedring", icon: '🌼', rarity: ItemRarity.EPIC, type: ItemType.RING, slot: ItemSlot.ACCESSORY_1, level: 7, value: 150, stats: { vitality: 4, bonusHealth: 12, poisonResist: 4 }, description: 'A ring grown from a single enchanted seed.', setName: "Verdant Guardian's Embrace" },
  { id: nextId(), name: 'Bloomthorn, the Living Blade', icon: '🌾', rarity: ItemRarity.LEGENDARY, type: ItemType.SWORD, slot: ItemSlot.WEAPON, level: 8, value: 360, stats: { bonusDamage: 12, strength: 5, lifeSteal: 4 }, description: 'A sword that grows from its hilt like a thorn.', legendaryAbility: 'Each hit restores 2% max HP. At full health, excess healing converts to a thorny shield absorbing up to 15% max HP in damage.' },

  // ── WHISPERING_MARSH (level 14-18) ── Marsh Dweller's Set ──
  { id: nextId(), name: "Marsh Dweller's Hood", icon: '🐸', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 15, value: 420, stats: { armor: 18, poisonResist: 12, intelligence: 8 }, description: 'Stitched from bog-leather and steeped in toxins.', setName: "Marsh Dweller's Kit" },
  { id: nextId(), name: "Marsh Dweller's Claws", icon: '🧪', rarity: ItemRarity.EPIC, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS, level: 15, value: 400, stats: { armor: 14, dexterity: 10, poisonResist: 8 }, description: 'Barbed gloves coated in distilled marsh venom.', setName: "Marsh Dweller's Kit" },
  { id: nextId(), name: "Marsh Dweller's Fang", icon: '🐍', rarity: ItemRarity.EPIC, type: ItemType.DAGGER, slot: ItemSlot.WEAPON, level: 16, value: 460, stats: { bonusDamage: 24, dexterity: 11, critChance: 5 }, description: 'A serrated dagger that drips with a green ichor.', setName: "Marsh Dweller's Kit" },
  { id: nextId(), name: 'Blightspitter', icon: '☠️', rarity: ItemRarity.LEGENDARY, type: ItemType.STAFF, slot: ItemSlot.WEAPON, level: 18, value: 780, stats: { bonusDamage: 28, intelligence: 14, poisonResist: 10 }, description: 'A staff carved from petrified swamp-wood.', legendaryAbility: 'Attacks apply stacking poison dealing 5% weapon damage per second for 6 seconds, stacking up to 5 times. At 5 stacks, the target is slowed by 30%.' },

  // ── CRYSTAL_CAVERNS (level 16-20) ── Crystalline Set ──
  { id: nextId(), name: 'Crystalline Crown', icon: '💎', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 17, value: 500, stats: { armor: 20, intelligence: 12, bonusMana: 25 }, description: 'A crown of fused amethyst and quartz.', setName: 'Crystalline Regalia' },
  { id: nextId(), name: 'Crystalline Cuirass', icon: '🪩', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 18, value: 560, stats: { armor: 26, lightningResist: 10, iceResist: 10 }, description: 'Plates of living crystal that refract incoming spells.', setName: 'Crystalline Regalia' },
  { id: nextId(), name: 'Crystalline Wand', icon: '💠', rarity: ItemRarity.EPIC, type: ItemType.WAND, slot: ItemSlot.WEAPON, level: 18, value: 540, stats: { bonusDamage: 26, intelligence: 14, critChance: 6 }, description: 'A perfect crystal shard that focuses arcane energy.', setName: 'Crystalline Regalia' },
  { id: nextId(), name: 'Prismatica, the Shattered Spectrum', icon: '🌈', rarity: ItemRarity.LEGENDARY, type: ItemType.STAFF, slot: ItemSlot.WEAPON, level: 20, value: 940, stats: { bonusDamage: 32, intelligence: 16, critDamage: 12 }, description: 'A staff of pure prismatic crystal.', legendaryAbility: 'Spells have a 25% chance to refract, hitting 2 additional nearby enemies for 40% damage. Each refraction is a random element.' },

  // ── FROZEN_TUNDRA (level 18-22) ── Frostbound Set ──
  { id: nextId(), name: 'Frostbound Helm', icon: '🧊', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 20, value: 820, stats: { vitality: 18, armor: 30, iceResist: 25, bonusHealth: 60 }, description: 'Rime clings to its surface, never melting.', setName: 'Frostbound' },
  { id: nextId(), name: 'Frostbound Gauntlets', icon: '🥶', rarity: ItemRarity.EPIC, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS, level: 20, value: 780, stats: { strength: 14, dexterity: 10, iceResist: 20, critChance: 4 }, description: 'Fingers of living ice that grip with the strength of a glacier.', setName: 'Frostbound' },
  { id: nextId(), name: 'Frostbound Greaves', icon: '❄️', rarity: ItemRarity.EPIC, type: ItemType.BOOTS, slot: ItemSlot.FEET, level: 18, value: 750, stats: { armor: 25, moveSpeed: 8, iceResist: 22, vitality: 12 }, description: 'Leave trails of frozen ground wherever the wearer treads.', setName: 'Frostbound' },
  { id: nextId(), name: 'Rimecleaver', icon: '🪓', rarity: ItemRarity.LEGENDARY, type: ItemType.AXE, slot: ItemSlot.WEAPON, level: 22, value: 1400, stats: { bonusDamage: 48, strength: 22, critDamage: 18, iceResist: 15 }, description: 'Hewn from the spine of a frost giant king.', legendaryAbility: 'Attacks have a 20% chance to flash-freeze the target for 2 seconds. Frozen enemies take 40% increased damage from the killing blow.' },

  // ── HAUNTED_CATHEDRAL (level 20-24) ── Exorcist Set ──
  { id: nextId(), name: "Exorcist's Vestments", icon: '⛪', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 22, value: 900, stats: { intelligence: 18, armor: 28, bonusMana: 50, poisonResist: 15 }, description: 'Woven by blind monks who could see only the dead.', setName: "Exorcist's Regalia" },
  { id: nextId(), name: "Exorcist's Phylactery", icon: '📿', rarity: ItemRarity.EPIC, type: ItemType.AMULET, slot: ItemSlot.ACCESSORY_1, level: 22, value: 860, stats: { intelligence: 16, manaRegen: 8, bonusHealth: 40, lightningResist: 15 }, description: 'Contains a sliver of consecrated bone.', setName: "Exorcist's Regalia" },
  { id: nextId(), name: "Exorcist's Censer", icon: '🏮', rarity: ItemRarity.EPIC, type: ItemType.LANTERN, slot: ItemSlot.LANTERN, level: 20, value: 840, stats: { intelligence: 14, fireResist: 20, manaRegen: 6, bonusDamage: 15 }, description: 'Swinging smoke that forces specters to take physical form.', setName: "Exorcist's Regalia" },
  { id: nextId(), name: "Saint Vesper's Blessed Codex", icon: '📖', rarity: ItemRarity.LEGENDARY, type: ItemType.SHIELD, slot: ItemSlot.WEAPON, level: 24, value: 1500, stats: { intelligence: 25, armor: 35, bonusHealth: 80, manaRegen: 10 }, description: 'The final writings of Saint Vesper.', legendaryAbility: 'When hit, 25% chance to release a holy nova dealing 150% weapon damage to undead. Grants immunity to fear and curse effects.' },

  // ── THORNWOOD_THICKET (level 18-22) ── Briarwoven Set ──
  { id: nextId(), name: 'Briarwoven Crown', icon: '🌿', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 18, value: 760, stats: { dexterity: 16, vitality: 14, poisonResist: 22, bonusHealth: 45 }, description: 'A living crown of twisted thorns.', setName: 'Briarwoven' },
  { id: nextId(), name: 'Briarwoven Cuirass', icon: '🌾', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 20, value: 830, stats: { armor: 32, vitality: 18, poisonResist: 18, bonusHealth: 55 }, description: 'Bark and briar intertwine into armor that heals its own cracks.', setName: 'Briarwoven' },
  { id: nextId(), name: 'Briarwoven Legguards', icon: '🍃', rarity: ItemRarity.EPIC, type: ItemType.LEG_ARMOR, slot: ItemSlot.LEGS, level: 20, value: 790, stats: { dexterity: 14, armor: 26, moveSpeed: 6, poisonResist: 20 }, description: 'Vines coil around the legs, guiding each step.', setName: 'Briarwoven' },
  { id: nextId(), name: 'Lashvine', icon: '🗡️', rarity: ItemRarity.LEGENDARY, type: ItemType.SWORD, slot: ItemSlot.WEAPON, level: 22, value: 1350, stats: { bonusDamage: 44, dexterity: 20, attackSpeed: 12, poisonResist: 10 }, description: 'A living blade of razor thorns that writhes hungrily toward warm flesh.', legendaryAbility: 'Each consecutive hit wraps them in constricting vines, stacking up to 5 times. At 5 stacks, target is rooted for 3 seconds and takes 200% poison damage.' },

  // ── CLOCKWORK_FOUNDRY (level 22-26) ── Gearmaster Set ──
  { id: nextId(), name: "Gearmaster's Visor", icon: '🔩', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 24, value: 950, stats: { intelligence: 18, dexterity: 14, critChance: 6, armor: 24 }, description: 'A brass-and-crystal headpiece with rotating lenses.', setName: "Gearmaster's Apparatus" },
  { id: nextId(), name: "Gearmaster's Power Gauntlets", icon: '⚙️', rarity: ItemRarity.EPIC, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS, level: 24, value: 920, stats: { strength: 16, dexterity: 12, attackSpeed: 10, critDamage: 12 }, description: 'Pneumatic actuators multiply grip force a hundredfold.', setName: "Gearmaster's Apparatus" },
  { id: nextId(), name: "Gearmaster's Calibrated Ring", icon: '💍', rarity: ItemRarity.EPIC, type: ItemType.RING, slot: ItemSlot.ACCESSORY_2, level: 22, value: 880, stats: { dexterity: 15, critChance: 5, critDamage: 10, attackSpeed: 8 }, description: 'A ring of interlocking micro-gears.', setName: "Gearmaster's Apparatus" },
  { id: nextId(), name: 'The Mainspring', icon: '🔧', rarity: ItemRarity.LEGENDARY, type: ItemType.MACE, slot: ItemSlot.WEAPON, level: 26, value: 1600, stats: { bonusDamage: 52, strength: 24, attackSpeed: 15, critChance: 8 }, description: 'The central drive shaft of the master automaton.', legendaryAbility: 'Every 4th attack releases kinetic energy, dealing 300% weapon damage in a cone and winding up attack speed by 5% for 8 seconds, stacking up to 4 times.' },

  // ── CRIMSON_CITADEL (level 24-28) ── Bloodlord Set ──
  { id: nextId(), name: "Bloodlord's Diadem", icon: '👑', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 26, value: 1050, stats: { strength: 20, vitality: 18, lifeSteal: 6, bonusHealth: 70 }, description: 'A crown of solidified blood that pulses with something ancient.', setName: "Bloodlord's Dominion" },
  { id: nextId(), name: "Bloodlord's Cuirass", icon: '🩸', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 26, value: 1080, stats: { armor: 38, vitality: 22, lifeSteal: 5, bonusHealth: 80 }, description: 'Crimson plate forged in blood baths.', setName: "Bloodlord's Dominion" },
  { id: nextId(), name: "Bloodlord's Signet", icon: '💎', rarity: ItemRarity.EPIC, type: ItemType.RING, slot: ItemSlot.ACCESSORY_1, level: 24, value: 990, stats: { strength: 16, lifeSteal: 8, critChance: 5, bonusDamage: 18 }, description: 'A gem that throbs like a second heart.', setName: "Bloodlord's Dominion" },
  { id: nextId(), name: 'Sanguine Thirst', icon: '🗡️', rarity: ItemRarity.LEGENDARY, type: ItemType.DAGGER, slot: ItemSlot.WEAPON, level: 28, value: 1750, stats: { bonusDamage: 55, dexterity: 22, attackSpeed: 14, lifeSteal: 10, critChance: 7 }, description: 'A blade that has never been cleaned.', legendaryAbility: 'Killing an enemy stores their remaining health as Blood Charge (max 500). Your next attack consumes all Blood Charge as bonus damage, healing you for 50%.' },

  // ── STORMSPIRE_PEAK (level 26-30) ── Stormcaller Set ──
  { id: nextId(), name: "Stormcaller's Pauldrons", icon: '⚡', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 28, value: 1150, stats: { intelligence: 22, armor: 32, lightningResist: 28, bonusMana: 60 }, description: 'Shoulder plates that arc with captive lightning.', setName: "Stormcaller's Fury" },
  { id: nextId(), name: "Stormcaller's Greaves", icon: '🌩️', rarity: ItemRarity.EPIC, type: ItemType.BOOTS, slot: ItemSlot.FEET, level: 28, value: 1100, stats: { dexterity: 18, moveSpeed: 12, lightningResist: 25, armor: 26 }, description: 'Boots that leave scorch marks with each step.', setName: "Stormcaller's Fury" },
  { id: nextId(), name: "Stormcaller's Focus", icon: '🔮', rarity: ItemRarity.EPIC, type: ItemType.WAND, slot: ItemSlot.WEAPON, level: 26, value: 1120, stats: { intelligence: 20, bonusDamage: 35, manaRegen: 8, lightningResist: 20 }, description: 'A wand carved from a tree struck by lightning seventy-seven times.', setName: "Stormcaller's Fury" },
  { id: nextId(), name: 'Thunderfall', icon: '🔱', rarity: ItemRarity.LEGENDARY, type: ItemType.STAFF, slot: ItemSlot.WEAPON, level: 30, value: 1900, stats: { bonusDamage: 62, intelligence: 28, critDamage: 22, lightningResist: 20, manaRegen: 10 }, description: 'Capped with an orb of perpetual lightning.', legendaryAbility: 'Critical hits call down a bolt of lightning dealing 250% weapon damage, chaining to up to 3 nearby enemies at 60% reduced damage per chain.' },

  // ── SHADOW_REALM (level 28-32) ── Shadowbound Set ──
  { id: nextId(), name: 'Shadowbound Cowl', icon: '🖤', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 30, value: 1250, stats: { dexterity: 24, critChance: 7, armor: 28, bonusDamage: 20 }, description: 'A hood woven from captured shadows.', setName: 'Shadowbound' },
  { id: nextId(), name: 'Shadowbound Mantle', icon: '🌑', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 30, value: 1280, stats: { dexterity: 20, armor: 34, critDamage: 15, vitality: 18 }, description: 'A cloak of living darkness.', setName: 'Shadowbound' },
  { id: nextId(), name: 'Shadowbound Anklets', icon: '🕳️', rarity: ItemRarity.EPIC, type: ItemType.BOOTS, slot: ItemSlot.FEET, level: 28, value: 1200, stats: { dexterity: 22, moveSpeed: 14, critChance: 5, attackSpeed: 8 }, description: 'Boots that absorb all sound.', setName: 'Shadowbound' },
  { id: nextId(), name: "Nether's Edge", icon: '🌀', rarity: ItemRarity.LEGENDARY, type: ItemType.DAGGER, slot: ItemSlot.WEAPON, level: 32, value: 2100, stats: { bonusDamage: 68, dexterity: 26, critChance: 10, critDamage: 25, attackSpeed: 10 }, description: 'A blade that exists half in this world and half in the void.', legendaryAbility: 'On critical hit, phase into the Shadow Realm for 1.5 seconds, becoming untargetable. Exiting delivers a guaranteed critical strike at 200% damage.' },

  // ── PRIMORDIAL_ABYSS (level 30-34) ── Abyssal Titan Set ──
  { id: nextId(), name: "Abyssal Titan's Warhelm", icon: '🌋', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 32, value: 1400, stats: { strength: 26, vitality: 24, armor: 36, bonusHealth: 100 }, description: 'Forged in the first fires before the world had a name.', setName: "Abyssal Titan's Raiment" },
  { id: nextId(), name: "Abyssal Titan's Chestguard", icon: '🪨', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 32, value: 1450, stats: { strength: 22, armor: 44, vitality: 26, fireResist: 20, iceResist: 20 }, description: 'Plates of primordial stone fused with veins of liquid chaos.', setName: "Abyssal Titan's Raiment" },
  { id: nextId(), name: "Abyssal Titan's Grasp", icon: '🫱', rarity: ItemRarity.EPIC, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS, level: 30, value: 1380, stats: { strength: 24, bonusDamage: 28, critDamage: 16, armor: 30 }, description: 'Gauntlets that remember the shape of creation.', setName: "Abyssal Titan's Raiment" },
  { id: nextId(), name: 'Entropy', icon: '💀', rarity: ItemRarity.LEGENDARY, type: ItemType.MACE, slot: ItemSlot.WEAPON, level: 34, value: 2400, stats: { bonusDamage: 78, strength: 30, critDamage: 28, vitality: 20, bonusHealth: 80 }, description: 'A weapon older than language.', legendaryAbility: 'Each hit reduces armor and resistances by 3% per stack (max 10). At 10 stacks, triggers Primordial Collapse dealing 500% weapon damage.' },

  // ── MOONLIT_GROVE (level 20-24) ── Moonweaver Set ──
  { id: nextId(), name: "Moonweaver's Circlet", icon: '🌙', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 22, value: 870, stats: { intelligence: 18, manaRegen: 7, bonusMana: 55, critChance: 4 }, description: 'A silver circlet that catches moonbeams.', setName: "Moonweaver's Attire" },
  { id: nextId(), name: "Moonweaver's Shroud", icon: '🌕', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 22, value: 890, stats: { intelligence: 16, armor: 26, vitality: 14, bonusHealth: 50, manaRegen: 5 }, description: 'A robe of moonlit silk.', setName: "Moonweaver's Attire" },
  { id: nextId(), name: "Moonweaver's Pendant", icon: '🔵', rarity: ItemRarity.EPIC, type: ItemType.AMULET, slot: ItemSlot.ACCESSORY_1, level: 20, value: 850, stats: { intelligence: 15, manaRegen: 8, bonusMana: 45, iceResist: 15 }, description: 'A teardrop of solidified moonlight.', setName: "Moonweaver's Attire" },
  { id: nextId(), name: 'Lunarbane', icon: '🐺', rarity: ItemRarity.LEGENDARY, type: ItemType.SWORD, slot: ItemSlot.WEAPON, level: 24, value: 1480, stats: { bonusDamage: 46, strength: 18, dexterity: 16, critChance: 6, critDamage: 14 }, description: 'A silver blade that glows brighter as night deepens.', legendaryAbility: 'Attacks alternate between Sun stance (+15% attack speed) and Moon stance (+20% crit damage) every 5 seconds. When both active within 10 seconds, triggers Eclipse dealing 250% weapon damage.' },

  // ── CORAL_DEPTHS (level 22-26) ── Tidecaller Set ──
  { id: nextId(), name: "Tidecaller's Shell Helm", icon: '🐚', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 24, value: 940, stats: { vitality: 20, armor: 30, iceResist: 20, bonusHealth: 65 }, description: 'A helm shaped from the skull plate of a leviathan.', setName: "Tidecaller's Regalia" },
  { id: nextId(), name: "Tidecaller's Coral Gauntlets", icon: '🦀', rarity: ItemRarity.EPIC, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS, level: 24, value: 910, stats: { strength: 16, dexterity: 14, armor: 24, attackSpeed: 8, iceResist: 18 }, description: 'Living coral bonded to the hands.', setName: "Tidecaller's Regalia" },
  { id: nextId(), name: "Tidecaller's Abyssal Lantern", icon: '🪼', rarity: ItemRarity.EPIC, type: ItemType.LANTERN, slot: ItemSlot.LANTERN, level: 22, value: 880, stats: { intelligence: 16, bonusDamage: 18, manaRegen: 6, iceResist: 22 }, description: 'An anglerfish lure repurposed as a lantern.', setName: "Tidecaller's Regalia" },
  { id: nextId(), name: 'Riptide', icon: '🔱', rarity: ItemRarity.LEGENDARY, type: ItemType.STAFF, slot: ItemSlot.WEAPON, level: 26, value: 1650, stats: { bonusDamage: 54, intelligence: 24, strength: 16, critChance: 6, iceResist: 18 }, description: 'A trident of deep-sea bone and black coral.', legendaryAbility: 'Every 8 seconds, summon a Tidal Surge that pulls all enemies in range and applies Waterlogged for 4 seconds (-20% move speed, +30% lightning damage taken).' },

  // ── ANCIENT_LIBRARY (level 24-28) ── Lorekeeper Set ──
  { id: nextId(), name: "Lorekeeper's Astral Staff", icon: '🪄', rarity: ItemRarity.EPIC, type: ItemType.STAFF, slot: ItemSlot.WEAPON, level: 26, value: 1850, stats: { intelligence: 28, bonusDamage: 22, manaRegen: 14 }, description: 'A crystalline staff inscribed with every language ever spoken.', setName: "Lorekeeper's Regalia" },
  { id: nextId(), name: "Lorekeeper's Circlet of Tongues", icon: '👑', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 25, value: 1600, stats: { intelligence: 24, bonusMana: 60, manaRegen: 10 }, description: 'A silver circlet that whispers forgotten theorems.', setName: "Lorekeeper's Regalia" },
  { id: nextId(), name: "Lorekeeper's Tome-Stitched Robe", icon: '🥋', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 27, value: 1750, stats: { intelligence: 20, armor: 30, bonusMana: 45, poisonResist: 12 }, description: 'Woven from pages torn from a hundred grimoires.', setName: "Lorekeeper's Regalia" },
  { id: nextId(), name: 'Codex of Unwritten Futures', icon: '📖', rarity: ItemRarity.LEGENDARY, type: ItemType.STAFF, slot: ItemSlot.WEAPON, level: 28, value: 3200, stats: { intelligence: 35, bonusDamage: 30, manaRegen: 18, critChance: 8 }, description: 'A living tome whose blank pages fill with prophecy mid-combat.', legendaryAbility: 'Every 4th spell triggers a random bonus: arcane burst (200% INT damage), full mana restore, or 4-second invulnerability shield.' },

  // ── JADE_TEMPLE (level 26-30) ── Jade Emperor Set ──
  { id: nextId(), name: "Jade Emperor's Palm Wraps", icon: '🧤', rarity: ItemRarity.EPIC, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS, level: 28, value: 1900, stats: { strength: 22, dexterity: 20, attackSpeed: 12, critChance: 6 }, description: 'Silk wraps hardened with jade dust.', setName: "Jade Emperor's Discipline" },
  { id: nextId(), name: "Jade Emperor's Flowing Tassets", icon: '🩳', rarity: ItemRarity.EPIC, type: ItemType.LEG_ARMOR, slot: ItemSlot.LEGS, level: 27, value: 1750, stats: { dexterity: 24, armor: 28, moveSpeed: 10, fireResist: 10 }, description: 'Segmented jade-plated leg armor that moves like water.', setName: "Jade Emperor's Discipline" },
  { id: nextId(), name: "Jade Emperor's Thousand-Step Sandals", icon: '👡', rarity: ItemRarity.EPIC, type: ItemType.BOOTS, slot: ItemSlot.FEET, level: 26, value: 1650, stats: { dexterity: 18, moveSpeed: 15, attackSpeed: 8, lightningResist: 10 }, description: 'Enchanted sandals that leave jade footprints in the air.', setName: "Jade Emperor's Discipline" },
  { id: nextId(), name: 'Qilin Fang, the Jade Crescent', icon: '🗡️', rarity: ItemRarity.LEGENDARY, type: ItemType.SWORD, slot: ItemSlot.WEAPON, level: 30, value: 3500, stats: { dexterity: 32, bonusDamage: 34, critChance: 10, critDamage: 25, attackSpeed: 8 }, description: 'A curved blade carved from a single flawless jade boulder.', legendaryAbility: 'Each consecutive hit adds Inner Harmony (max 5). At 5 stacks, unleashes Jade Tempest — 7 phantom slashes at 50% weapon damage each, healing the wielder for total damage dealt.' },

  // ── ASHEN_BATTLEFIELD (level 26-30) ── War-Torn Set ──
  { id: nextId(), name: 'War-Torn Bulwark of the Fallen', icon: '🛡️', rarity: ItemRarity.EPIC, type: ItemType.SHIELD, slot: ItemSlot.WEAPON, level: 28, value: 1950, stats: { armor: 45, vitality: 22, bonusHealth: 80, fireResist: 14 }, description: 'A tower shield from the broken blades of a thousand dead soldiers.', setName: 'War-Torn Resolve' },
  { id: nextId(), name: 'War-Torn Hollow-Eyed Helm', icon: '⛑️', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 27, value: 1700, stats: { armor: 32, vitality: 20, bonusHealth: 55, poisonResist: 12 }, description: 'A scorched helm with empty eye slits.', setName: 'War-Torn Resolve' },
  { id: nextId(), name: 'War-Torn Siege Gauntlets', icon: '🧱', rarity: ItemRarity.EPIC, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS, level: 26, value: 1600, stats: { strength: 24, armor: 28, bonusDamage: 14, critDamage: 12 }, description: 'Soot-blackened gauntlets with knuckle plates from siege engine bolts.', setName: 'War-Torn Resolve' },
  { id: nextId(), name: 'Vow of the Last Marshal', icon: '⚔️', rarity: ItemRarity.LEGENDARY, type: ItemType.MACE, slot: ItemSlot.WEAPON, level: 30, value: 3400, stats: { strength: 34, bonusDamage: 38, vitality: 20, armor: 18, bonusHealth: 60 }, description: 'The warhammer of a general who refused to retreat even after death.', legendaryAbility: 'Below 30% health, grants +40% damage, +50 armor, and crowd control immunity for 6 seconds. Each kill extends duration by 2 seconds. 60 second cooldown.' },

  // ── FUNGAL_DEPTHS (level 24-28) ── Sporecaller Set ──
  { id: nextId(), name: "Sporecaller's Hyphal Pendant", icon: '🍄', rarity: ItemRarity.EPIC, type: ItemType.AMULET, slot: ItemSlot.ACCESSORY_1, level: 25, value: 1550, stats: { intelligence: 20, poisonResist: 25, manaRegen: 12, vitality: 14 }, description: 'A living pendant of intertwined mycelium.', setName: "Sporecaller's Bloom" },
  { id: nextId(), name: "Sporecaller's Fruiting Hauberk", icon: '🦠', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 26, value: 1700, stats: { armor: 34, vitality: 22, poisonResist: 18, bonusHealth: 50 }, description: 'Living armor grown from cultivated shelf fungi.', setName: "Sporecaller's Bloom" },
  { id: nextId(), name: "Sporecaller's Root-Threaded Boots", icon: '🥾', rarity: ItemRarity.EPIC, type: ItemType.BOOTS, slot: ItemSlot.FEET, level: 24, value: 1450, stats: { dexterity: 16, moveSpeed: 12, poisonResist: 15, bonusHealth: 35 }, description: 'Boots woven from the roots of sentient mushrooms.', setName: "Sporecaller's Bloom" },
  { id: nextId(), name: 'The Cordyceps Paradox', icon: '🌿', rarity: ItemRarity.LEGENDARY, type: ItemType.WAND, slot: ItemSlot.WEAPON, level: 28, value: 3100, stats: { intelligence: 30, bonusDamage: 26, poisonResist: 20, lifeSteal: 10, manaRegen: 12 }, description: 'A wand of petrified cordyceps.', legendaryAbility: 'Attacks infect enemies with parasitic mycelium. After 3 seconds, infected enemies erupt in a spore explosion dealing 150% weapon damage to nearby foes and spawning a Fungal Puppet.' },

  // ── OBSIDIAN_FORTRESS (level 28-32) ── Obsidian Warden Set ──
  { id: nextId(), name: "Obsidian Warden's Volcanic Cuirass", icon: '🌋', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 30, value: 2200, stats: { armor: 48, strength: 24, fireResist: 22, bonusHealth: 70 }, description: 'A breastplate of polished obsidian veined with molten magma.', setName: "Obsidian Warden's Vigil" },
  { id: nextId(), name: "Obsidian Warden's Caldera Greaves", icon: '🦿', rarity: ItemRarity.EPIC, type: ItemType.LEG_ARMOR, slot: ItemSlot.LEGS, level: 29, value: 2050, stats: { armor: 38, strength: 20, fireResist: 18, vitality: 18 }, description: 'Leg plates of layered volcanic glass.', setName: "Obsidian Warden's Vigil" },
  { id: nextId(), name: "Obsidian Warden's Magma-Heart Ring", icon: '💍', rarity: ItemRarity.EPIC, type: ItemType.RING, slot: ItemSlot.ACCESSORY_2, level: 28, value: 1850, stats: { strength: 18, fireResist: 25, bonusDamage: 16, critDamage: 14 }, description: 'A bead of eternally molten rock trapped within obsidian.', setName: "Obsidian Warden's Vigil" },
  { id: nextId(), name: 'Shard of the Collapsed Caldera', icon: '🖤', rarity: ItemRarity.LEGENDARY, type: ItemType.SWORD, slot: ItemSlot.WEAPON, level: 32, value: 3800, stats: { strength: 36, bonusDamage: 40, critChance: 9, fireResist: 15, critDamage: 22 }, description: 'A jagged greatsword of raw obsidian, its edge one molecule wide.', legendaryAbility: 'Critical hits deal 100% additional fire damage over 4 seconds and reduce armor by 30%. If the target dies while burning, they explode dealing 80% weapon damage to nearby enemies.' },

  // ── CELESTIAL_RUINS (level 32-36) ── Seraphim Set ──
  { id: nextId(), name: "Seraphim's Aureate Diadem", icon: '😇', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 34, value: 2600, stats: { intelligence: 32, vitality: 22, bonusMana: 80, lightningResist: 18 }, description: 'A crown of solidified dawn-light.', setName: "Seraphim's Grace" },
  { id: nextId(), name: "Seraphim's Guiding Censer", icon: '🏮', rarity: ItemRarity.EPIC, type: ItemType.LANTERN, slot: ItemSlot.LANTERN, level: 33, value: 2400, stats: { intelligence: 26, manaRegen: 16, bonusHealth: 55, lightningResist: 15 }, description: 'A golden censer that burns with sacred flame.', setName: "Seraphim's Grace" },
  { id: nextId(), name: "Seraphim's Choir Pendant", icon: '🔔', rarity: ItemRarity.EPIC, type: ItemType.AMULET, slot: ItemSlot.ACCESSORY_1, level: 34, value: 2500, stats: { intelligence: 28, bonusMana: 60, manaRegen: 14, iceResist: 16 }, description: 'A pendant containing a trapped fragment of angelic song.', setName: "Seraphim's Grace" },
  { id: nextId(), name: 'Pinnion of the Fallen Throne', icon: '🪽', rarity: ItemRarity.LEGENDARY, type: ItemType.STAFF, slot: ItemSlot.WEAPON, level: 36, value: 4500, stats: { intelligence: 42, bonusDamage: 44, manaRegen: 20, critChance: 10, lightningResist: 18 }, description: 'A staff fashioned from a single feather of the fallen archangel.', legendaryAbility: '25% chance on spell cast to invoke Divine Chorus — 3 holy beams dealing 120% spell damage each, healing the caster 15% of damage dealt. All 3 on same target: Judged (silenced 3s, +40% damage taken).' },

  // ── INFERNAL_THRONE (level 34-38) ── Infernal Monarch Set ──
  { id: nextId(), name: "Infernal Monarch's Ember Talons", icon: '🔥', rarity: ItemRarity.EPIC, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS, level: 36, value: 2800, stats: { strength: 30, bonusDamage: 24, fireResist: 22, critChance: 8 }, description: 'Gauntlets of blackened demon-bone tipped with hellfire claws.', setName: "Infernal Monarch's Dominion" },
  { id: nextId(), name: "Infernal Monarch's Pact Signet", icon: '💀', rarity: ItemRarity.EPIC, type: ItemType.RING, slot: ItemSlot.ACCESSORY_2, level: 35, value: 2650, stats: { strength: 24, critDamage: 20, lifeSteal: 10, fireResist: 18 }, description: 'A ring forged in the signing of infernal contracts.', setName: "Infernal Monarch's Dominion" },
  { id: nextId(), name: "Infernal Monarch's Ruinous Axe", icon: '🪓', rarity: ItemRarity.EPIC, type: ItemType.AXE, slot: ItemSlot.WEAPON, level: 37, value: 2900, stats: { strength: 32, bonusDamage: 34, critChance: 7, fireResist: 15 }, description: 'A double-headed axe of fused brimstone.', setName: "Infernal Monarch's Dominion" },
  { id: nextId(), name: "Asmodeus' Unquenched Brand", icon: '😈', rarity: ItemRarity.LEGENDARY, type: ItemType.MACE, slot: ItemSlot.WEAPON, level: 38, value: 5000, stats: { strength: 46, bonusDamage: 50, critChance: 11, fireResist: 20, lifeSteal: 8 }, description: 'The personal weapon of a demon lord.', legendaryAbility: 'Every kill grants Hellfire Sovereignty for 10 seconds (+15% damage, stacks 5x). At max stacks, attacks create hellfire eruptions dealing 200% weapon damage.' },

  // ── ASTRAL_VOID (level 36-40) ── Voidborn Set ──
  { id: nextId(), name: 'Voidborn Parallax Visor', icon: '🌌', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 38, value: 3100, stats: { intelligence: 36, dexterity: 20, critChance: 10, bonusMana: 70 }, description: 'A helm of compressed starfield.', setName: 'Voidborn Convergence' },
  { id: nextId(), name: 'Voidborn Nebula Vestment', icon: '🌀', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 37, value: 2950, stats: { armor: 42, intelligence: 30, bonusHealth: 80, iceResist: 18, lightningResist: 18 }, description: 'Robes woven from the dust between stars.', setName: 'Voidborn Convergence' },
  { id: nextId(), name: 'Voidborn Quantum Treads', icon: '🥿', rarity: ItemRarity.EPIC, type: ItemType.BOOTS, slot: ItemSlot.FEET, level: 36, value: 2800, stats: { dexterity: 28, moveSpeed: 18, intelligence: 22, bonusMana: 50 }, description: 'Boots that exist in quantum uncertainty.', setName: 'Voidborn Convergence' },
  { id: nextId(), name: "Entropy's Final Digit", icon: '🕳️', rarity: ItemRarity.LEGENDARY, type: ItemType.WAND, slot: ItemSlot.WEAPON, level: 40, value: 5500, stats: { intelligence: 50, bonusDamage: 52, critChance: 12, critDamage: 30, manaRegen: 22 }, description: 'A sliver of the universe\u0027s last moment.', legendaryAbility: 'After 5 spell casts, enter Phase Shift for 4 seconds: untargetable, +60% spell damage, all spells hit twice.' },

  // ── SHATTERED_COLOSSEUM (level 30-34) ── Champion Set ──
  { id: nextId(), name: "Champion's Roar-Etched Plastron", icon: '🏛️', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 32, value: 2350, stats: { armor: 44, strength: 26, vitality: 22, bonusHealth: 75 }, description: 'A scarred breastplate engraved with the cheers of ten thousand spectators.', setName: "Champion's Glory" },
  { id: nextId(), name: "Champion's Sand-Stained Cuisses", icon: '🩻', rarity: ItemRarity.EPIC, type: ItemType.LEG_ARMOR, slot: ItemSlot.LEGS, level: 31, value: 2200, stats: { armor: 36, strength: 22, dexterity: 18, moveSpeed: 8 }, description: 'Leg armor stained with the sand of the colosseum floor.', setName: "Champion's Glory" },
  { id: nextId(), name: "Champion's Crowd-Favor Buckler", icon: '🔰', rarity: ItemRarity.EPIC, type: ItemType.SHIELD, slot: ItemSlot.WEAPON, level: 30, value: 2100, stats: { armor: 40, vitality: 20, bonusHealth: 60, critChance: 5 }, description: 'A shield adorned with a thumbs-up motif.', setName: "Champion's Glory" },
  { id: nextId(), name: "Rex Arenae, the Crowd's Verdict", icon: '🏆', rarity: ItemRarity.LEGENDARY, type: ItemType.SWORD, slot: ItemSlot.WEAPON, level: 34, value: 4200, stats: { strength: 40, bonusDamage: 42, critChance: 10, critDamage: 24, attackSpeed: 8 }, description: 'A gladius that grows sharper with each spectator watching.', legendaryAbility: 'Builds Crowd Favor with consecutive hits (max 10 stacks, +3% damage, +2% attack speed each). At 10 stacks: guaranteed crits and kills fully restore health for 8 seconds.' },

  // ── PETRIFIED_GARDEN (level 28-32) ── Gorgon Set ──
  { id: nextId(), name: "Gorgon's Serpent-Crown", icon: '🐍', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 30, value: 2100, stats: { intelligence: 26, dexterity: 20, critChance: 8, poisonResist: 20 }, description: 'A crown of petrified serpents.', setName: "Gorgon's Visage" },
  { id: nextId(), name: "Gorgon's Calcifying Band", icon: '🪨', rarity: ItemRarity.EPIC, type: ItemType.RING, slot: ItemSlot.ACCESSORY_2, level: 29, value: 1950, stats: { intelligence: 22, armor: 20, critDamage: 16, poisonResist: 15 }, description: 'A ring of living stone.', setName: "Gorgon's Visage" },
  { id: nextId(), name: "Gorgon's Fang of Still Life", icon: '🗡️', rarity: ItemRarity.EPIC, type: ItemType.DAGGER, slot: ItemSlot.WEAPON, level: 28, value: 1850, stats: { dexterity: 24, bonusDamage: 20, critChance: 10, attackSpeed: 10 }, description: 'A dagger carved from a medusa\u0027s fang.', setName: "Gorgon's Visage" },
  { id: nextId(), name: 'Reflection of the Last Beholder', icon: '🪞', rarity: ItemRarity.LEGENDARY, type: ItemType.SHIELD, slot: ItemSlot.WEAPON, level: 32, value: 3900, stats: { armor: 50, intelligence: 30, vitality: 24, poisonResist: 22, critChance: 6 }, description: 'A mirror-polished shield containing the trapped gaze of a gorgon queen.', legendaryAbility: 'Blocking has 20% chance to petrify the attacker for 3 seconds. Shattering a petrified enemy with a crit deals 180% weapon damage to surrounding enemies.' },

  // ── SUNKEN_CITADEL (level 30-34) ── Drowned King Set ──
  { id: nextId(), name: "Drowned King's Coral Crown", icon: '👑', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 31, value: 2800, stats: { vitality: 28, armor: 38, iceResist: 22, bonusHealth: 180 }, description: 'Barnacles and black pearls encrust this crown.', setName: "Drowned King's Regalia" },
  { id: nextId(), name: "Drowned King's Tidal Mantle", icon: '🫧', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 33, value: 3200, stats: { armor: 52, vitality: 24, iceResist: 18, lifeSteal: 4 }, description: 'Seawater perpetually weeps from the links of this royal chainmail.', setName: "Drowned King's Regalia" },
  { id: nextId(), name: "Drowned King's Abyssal Gauntlets", icon: '🦀', rarity: ItemRarity.EPIC, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS, level: 32, value: 2900, stats: { strength: 22, armor: 34, critDamage: 18, bonusDamage: 20 }, description: 'Gauntlets that tighten like crushing deep-sea pressure.', setName: "Drowned King's Regalia" },
  { id: nextId(), name: 'Tidecaller, Trident of the Drowned Throne', icon: '🔱', rarity: ItemRarity.LEGENDARY, type: ItemType.SWORD, slot: ItemSlot.WEAPON, level: 34, value: 5200, stats: { strength: 30, bonusDamage: 42, critChance: 10, iceResist: 25, attackSpeed: 8 }, description: 'The prongs of this trident sing with the voice of riptides.', legendaryAbility: 'Every 4th attack unleashes a Tidal Surge dealing 200% weapon damage in a cone, slowing enemies by 40% for 3 seconds.' },

  // ── WYRMSCAR_CANYON (level 32-36) ── Wyrm Rider Set ──
  { id: nextId(), name: "Wyrm Rider's Dragonscale Hauberk", icon: '🐉', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 34, value: 3400, stats: { armor: 58, fireResist: 28, vitality: 26, bonusHealth: 160 }, description: 'Stitched from the shed scales of canyon wyrms.', setName: "Wyrm Rider's Scalehide" },
  { id: nextId(), name: "Wyrm Rider's Tail-Guard Greaves", icon: '🦎', rarity: ItemRarity.EPIC, type: ItemType.LEG_ARMOR, slot: ItemSlot.LEGS, level: 33, value: 3100, stats: { armor: 44, dexterity: 20, fireResist: 22, critChance: 7 }, description: 'Flexible overlapping scales.', setName: "Wyrm Rider's Scalehide" },
  { id: nextId(), name: "Wyrm Rider's Clawgrip Boots", icon: '🪶', rarity: ItemRarity.EPIC, type: ItemType.BOOTS, slot: ItemSlot.FEET, level: 32, value: 2900, stats: { dexterity: 24, moveSpeed: 12, armor: 30, fireResist: 18 }, description: 'Taloned soles dig into dragon hide and canyon stone alike.', setName: "Wyrm Rider's Scalehide" },
  { id: nextId(), name: "Wyrmfang, the Canyon's Hunger", icon: '⚔️', rarity: ItemRarity.LEGENDARY, type: ItemType.AXE, slot: ItemSlot.WEAPON, level: 36, value: 5600, stats: { strength: 34, bonusDamage: 48, critDamage: 30, fireResist: 20, attackSpeed: 6 }, description: 'Carved from the jawbone of Vaelstrix, the eldest canyon wyrm.', legendaryAbility: 'Critical hits apply Wyrmfire Venom dealing 150% bonus fire damage over 4 seconds. Enemies killed while burning explode for 100% weapon damage to nearby foes.' },

  // ── PLAGUEROT_SEWERS (level 30-34) ── Plague Doctor Set ──
  { id: nextId(), name: "Plague Doctor's Beaked Mask", icon: '🎭', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 31, value: 2750, stats: { intelligence: 26, poisonResist: 30, manaRegen: 10, bonusMana: 80 }, description: 'The beak is stuffed with rare herbs.', setName: "Plague Doctor's Quarantine" },
  { id: nextId(), name: "Plague Doctor's Suppurating Gloves", icon: '🧤', rarity: ItemRarity.EPIC, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS, level: 30, value: 2600, stats: { intelligence: 22, poisonResist: 24, bonusDamage: 18, critChance: 6 }, description: 'Waxed leather soaked in antiseptic tinctures.', setName: "Plague Doctor's Quarantine" },
  { id: nextId(), name: "Plague Doctor's Miasma Censer", icon: '⛓️', rarity: ItemRarity.EPIC, type: ItemType.AMULET, slot: ItemSlot.ACCESSORY_1, level: 32, value: 2850, stats: { intelligence: 20, poisonResist: 26, vitality: 18, manaRegen: 8 }, description: 'A brass censer perpetually emitting acrid smoke.', setName: "Plague Doctor's Quarantine" },
  { id: nextId(), name: 'Blightfinger, the Pandemic Wand', icon: '🦠', rarity: ItemRarity.LEGENDARY, type: ItemType.WAND, slot: ItemSlot.WEAPON, level: 34, value: 5100, stats: { intelligence: 36, bonusDamage: 40, poisonResist: 30, critChance: 8, manaRegen: 12 }, description: 'A gnarled finger bone from the first plague bearer.', legendaryAbility: 'Attacks apply Contagion (max 5 stacks). At 5 stacks, target erupts in Plague Nova spreading 3 stacks to nearby enemies, healing you for 15% of damage dealt.' },

  // ── ETHEREAL_SANCTUM (level 34-38) ── Ethereal Walker Set ──
  { id: nextId(), name: "Ethereal Walker's Hollow Visage", icon: '👻', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 35, value: 3300, stats: { intelligence: 30, armor: 28, lightningResist: 24, manaRegen: 12 }, description: 'A mask with no face behind it.', setName: "Ethereal Walker's Veil" },
  { id: nextId(), name: "Ethereal Walker's Phaseweave Robe", icon: '🌫️', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 36, value: 3500, stats: { intelligence: 26, armor: 36, bonusMana: 120, lightningResist: 20, critChance: 6 }, description: 'The robe flickers between solid and transparent.', setName: "Ethereal Walker's Veil" },
  { id: nextId(), name: "Ethereal Walker's Wraith Band", icon: '💍', rarity: ItemRarity.EPIC, type: ItemType.RING, slot: ItemSlot.ACCESSORY_2, level: 37, value: 3200, stats: { intelligence: 24, critDamage: 20, manaRegen: 10, lightningResist: 18, bonusDamage: 16 }, description: 'A ring visible only from certain angles.', setName: "Ethereal Walker's Veil" },
  { id: nextId(), name: 'Voidtongue, Blade Between Worlds', icon: '🗡️', rarity: ItemRarity.LEGENDARY, type: ItemType.DAGGER, slot: ItemSlot.WEAPON, level: 38, value: 5900, stats: { dexterity: 34, intelligence: 20, bonusDamage: 46, critChance: 14, attackSpeed: 12 }, description: 'This dagger exists simultaneously in material and ethereal planes.', legendaryAbility: 'Attacks ignore 50% of target defense. Every 3rd hit triggers Phase Shift — untargetable for 1 second, teleport behind target.' },

  // ── IRON_WASTES (level 34-38) ── Iron Colossus Set ──
  { id: nextId(), name: 'Iron Colossus Furnace Plate', icon: '⚙️', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 36, value: 3600, stats: { armor: 68, strength: 28, vitality: 30, fireResist: 20, bonusHealth: 200 }, description: 'A chestplate forged from a golem\u0027s furnace core.', setName: 'Iron Colossus Plating' },
  { id: nextId(), name: 'Iron Colossus Piston Gauntlets', icon: '🤖', rarity: ItemRarity.EPIC, type: ItemType.GAUNTLETS, slot: ItemSlot.GAUNTLETS, level: 35, value: 3300, stats: { strength: 32, armor: 42, bonusDamage: 24, critDamage: 16, attackSpeed: 6 }, description: 'Steam-driven pistons augment every punch.', setName: 'Iron Colossus Plating' },
  { id: nextId(), name: 'Iron Colossus Treader Greaves', icon: '🦿', rarity: ItemRarity.EPIC, type: ItemType.LEG_ARMOR, slot: ItemSlot.LEGS, level: 34, value: 3200, stats: { armor: 50, strength: 24, vitality: 22, lightningResist: 18, moveSpeed: 6 }, description: 'Massive leg plates with interlocking gears.', setName: 'Iron Colossus Plating' },
  { id: nextId(), name: 'Titanfall, the Siege Breaker', icon: '🔨', rarity: ItemRarity.LEGENDARY, type: ItemType.MACE, slot: ItemSlot.WEAPON, level: 38, value: 6100, stats: { strength: 40, bonusDamage: 52, critDamage: 35, armor: 30, vitality: 20 }, description: 'A warhammer built for a war golem.', legendaryAbility: 'Attacks build Pressure (max 100). At full Pressure, Steamcore Detonation deals 350% weapon damage in a large area, stunning 2 seconds. +20% damage reduction above 50 Pressure.' },

  // ── BLIGHTED_THRONE (level 36-40) ── Blighted Crown Set ──
  { id: nextId(), name: 'Blighted Crown of the False King', icon: '🖤', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 38, value: 3700, stats: { strength: 28, intelligence: 22, armor: 40, bonusDamage: 20, poisonResist: 24 }, description: 'A crown twisted by corruption.', setName: 'Blighted Crown Regalia' },
  { id: nextId(), name: 'Blighted Bulwark of Ruined Oaths', icon: '🛡️', rarity: ItemRarity.EPIC, type: ItemType.SHIELD, slot: ItemSlot.WEAPON, level: 37, value: 3500, stats: { armor: 62, vitality: 30, bonusHealth: 220, poisonResist: 20, lifeSteal: 5 }, description: 'A shield defaced by creeping corruption.', setName: 'Blighted Crown Regalia' },
  { id: nextId(), name: 'Blighted Signet of the Usurper', icon: '💀', rarity: ItemRarity.EPIC, type: ItemType.RING, slot: ItemSlot.ACCESSORY_1, level: 39, value: 3600, stats: { strength: 24, critChance: 10, critDamage: 22, poisonResist: 18, lifeSteal: 4 }, description: 'Slipped from the finger of the corrupted king himself.', setName: 'Blighted Crown Regalia' },
  { id: nextId(), name: 'Ruingrasp, Scepter of the Fallen Throne', icon: '🏴', rarity: ItemRarity.LEGENDARY, type: ItemType.STAFF, slot: ItemSlot.WEAPON, level: 40, value: 6500, stats: { intelligence: 38, strength: 22, bonusDamage: 50, critChance: 10, lifeSteal: 8, poisonResist: 22 }, description: 'A scepter that oozes tar-like corruption.', legendaryAbility: 'Killing an enemy raises a Blighted Thrall for 8 seconds (60% of original stats). While Thralls are active, gain +15% damage and +10% life steal. Max 2 Thralls.' },

  // ── CHRONO_LABYRINTH (level 38-42) ── Chronomancer Set ──
  { id: nextId(), name: "Chronomancer's Paradox Hood", icon: '⏳', rarity: ItemRarity.EPIC, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 39, value: 3800, stats: { intelligence: 34, manaRegen: 14, critChance: 8, bonusMana: 140, lightningResist: 22 }, description: 'The hood ages and de-ages in a perpetual loop.', setName: "Chronomancer's Paradox" },
  { id: nextId(), name: "Chronomancer's Timeskip Treads", icon: '⏰', rarity: ItemRarity.EPIC, type: ItemType.BOOTS, slot: ItemSlot.FEET, level: 40, value: 3700, stats: { dexterity: 26, moveSpeed: 16, attackSpeed: 10, intelligence: 20, lightningResist: 18 }, description: 'Each step lands a fraction of a second before it was taken.', setName: "Chronomancer's Paradox" },
  { id: nextId(), name: "Chronomancer's M\u00f6bius Amulet", icon: '♾️', rarity: ItemRarity.EPIC, type: ItemType.AMULET, slot: ItemSlot.ACCESSORY_1, level: 41, value: 3900, stats: { intelligence: 30, critDamage: 24, manaRegen: 12, bonusDamage: 22, lightningResist: 20 }, description: 'A looping strip of enchanted platinum with no beginning or end.', setName: "Chronomancer's Paradox" },
  { id: nextId(), name: "Epoch's End, the Moment Eater", icon: '⚡', rarity: ItemRarity.LEGENDARY, type: ItemType.STAFF, slot: ItemSlot.WEAPON, level: 42, value: 7000, stats: { intelligence: 42, bonusDamage: 54, critChance: 12, attackSpeed: 14, manaRegen: 16 }, description: 'A staff carved from crystallized time itself.', legendaryAbility: 'Every 10 seconds, Temporal Rewind: undo all damage taken in the last 3 seconds and reset all cooldowns. Every 5th attack grants 50% attack speed for 2 seconds.' },

  // ── ELDRITCH_NEXUS (level 40-44) ── Elder Sign Set ──
  { id: nextId(), name: 'Elder Sign Warded Vestments', icon: '🔮', rarity: ItemRarity.EPIC, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 42, value: 4200, stats: { armor: 56, intelligence: 32, vitality: 28, bonusHealth: 240, poisonResist: 22, iceResist: 22 }, description: 'Every thread is inscribed with microscopic elder signs.', setName: 'Elder Sign Ward' },
  { id: nextId(), name: 'Elder Sign Sealed Legguards', icon: '🦑', rarity: ItemRarity.EPIC, type: ItemType.LEG_ARMOR, slot: ItemSlot.LEGS, level: 41, value: 3900, stats: { armor: 48, vitality: 30, intelligence: 26, poisonResist: 20, lightningResist: 20, bonusMana: 100 }, description: 'Tentacle-shaped clasps bind these legguards shut.', setName: 'Elder Sign Ward' },
  { id: nextId(), name: 'Elder Sign Sanity Lantern', icon: '🏮', rarity: ItemRarity.EPIC, type: ItemType.LANTERN, slot: ItemSlot.LANTERN, level: 43, value: 4100, stats: { intelligence: 28, manaRegen: 14, bonusDamage: 18, fireResist: 18, iceResist: 18, lightningResist: 18, poisonResist: 18 }, description: 'A lantern burning with the light of pure reason.', setName: 'Elder Sign Ward' },
  { id: nextId(), name: "Yith'garath, the Unnameable Edge", icon: '🌀', rarity: ItemRarity.LEGENDARY, type: ItemType.DAGGER, slot: ItemSlot.WEAPON, level: 44, value: 7800, stats: { dexterity: 38, intelligence: 28, bonusDamage: 58, critChance: 14, critDamage: 32, lifeSteal: 6 }, description: 'A blade whose shape cannot be fully perceived by mortal minds.', legendaryAbility: '20% chance to open a Rift Wound, summoning a tentacle that grapples for 3 seconds at 75% weapon damage/sec. On kill, gain +25% all damage and +20% crit chance for 6 seconds.' },

  // ── CITY_RUINS (level 3-6) ── Ruined Garrison Set ──
  { id: nextId(), name: "Ruined Garrison Helm", icon: '⛑️', rarity: ItemRarity.UNCOMMON, type: ItemType.HELMET, slot: ItemSlot.HELMET, level: 3, value: 60, stats: { armor: 8, vitality: 4, strength: 3 }, description: 'A dented helm still bearing the crest of the fallen city guard.', setName: 'Ruined Garrison' },
  { id: nextId(), name: "Ruined Garrison Chestplate", icon: '🛡️', rarity: ItemRarity.UNCOMMON, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 4, value: 75, stats: { armor: 12, vitality: 5, strength: 4 }, description: 'Battered plate armor scarred by the siege that destroyed the city.', setName: 'Ruined Garrison' },
  { id: nextId(), name: "Ruined Garrison Signet", icon: '💍', rarity: ItemRarity.UNCOMMON, type: ItemType.RING, slot: ItemSlot.ACCESSORY_1, level: 3, value: 55, stats: { strength: 3, critChance: 2, bonusDamage: 4 }, description: 'The captain\'s ring, tarnished but still warm with fading authority.', setName: 'Ruined Garrison' },
  { id: nextId(), name: "Oathbreaker, the Captain's Last Blade", icon: '⚔️', rarity: ItemRarity.RARE, type: ItemType.SWORD, slot: ItemSlot.WEAPON, level: 5, value: 120, stats: { bonusDamage: 16, strength: 6, critChance: 3 }, description: 'The captain\'s sword. Its edge is chipped but still deadly.', legendaryAbility: 'On kill, gain +10% damage and +5% armor for 5 seconds.' },

  // ── CITY (level 3-6) ── Thornwall Watch Set ──
  { id: nextId(), name: "Thornwall Watch Hauberk", icon: '🛡️', rarity: ItemRarity.UNCOMMON, type: ItemType.CHEST_ARMOR, slot: ItemSlot.BODY, level: 4, value: 80, stats: { armor: 14, vitality: 5, dexterity: 3 }, description: 'Standard issue armor of the Thornwall city watch, polished to a dark sheen.', setName: "Thornwall Watch" },
  { id: nextId(), name: "Thornwall Watch Greaves", icon: '🦿', rarity: ItemRarity.UNCOMMON, type: ItemType.LEG_ARMOR, slot: ItemSlot.LEGS, level: 3, value: 65, stats: { armor: 10, dexterity: 4, moveSpeed: 3 }, description: 'Heavy greaves built for long patrols through cobblestone streets.', setName: "Thornwall Watch" },
  { id: nextId(), name: "Thornwall Watch Badge", icon: '📛', rarity: ItemRarity.UNCOMMON, type: ItemType.AMULET, slot: ItemSlot.ACCESSORY_2, level: 4, value: 70, stats: { strength: 4, dexterity: 3, bonusHealth: 15 }, description: 'An iron badge of authority. Enemies hesitate when they see it.', setName: "Thornwall Watch" },
  { id: nextId(), name: "Magistrate's Verdict", icon: '⚖️', rarity: ItemRarity.RARE, type: ItemType.MACE, slot: ItemSlot.WEAPON, level: 5, value: 130, stats: { bonusDamage: 18, strength: 5, critDamage: 8 }, description: 'The magistrate\'s ceremonial mace, heavier than it looks.', legendaryAbility: 'Attacks have a 15% chance to stun enemies for 1.5 seconds.' },

  // ── Lanterns ──────────────────────────────────────────────────────
  {
    id: nextId(), name: 'Rusty Lantern', icon: '🏮',
    rarity: ItemRarity.COMMON, type: ItemType.LANTERN, slot: ItemSlot.LANTERN,
    level: 1, value: 15, stats: {},
    description: 'A battered tin lantern. Barely holds a flame, but better than nothing.',
  },
  {
    id: nextId(), name: 'Traveler\'s Lantern', icon: '🏮',
    rarity: ItemRarity.UNCOMMON, type: ItemType.LANTERN, slot: ItemSlot.LANTERN,
    level: 5, value: 80, stats: {},
    description: 'A sturdy brass lantern favored by merchants on the old roads.',
  },
  {
    id: nextId(), name: 'Miner\'s Headlamp', icon: '🏮',
    rarity: ItemRarity.RARE, type: ItemType.LANTERN, slot: ItemSlot.LANTERN,
    level: 12, value: 250, stats: {},
    description: 'Focused beam cuts deep into the dark. Dwarven engineering at its finest.',
  },
  {
    id: nextId(), name: 'Enchanted Brazier', icon: '🏮',
    rarity: ItemRarity.EPIC, type: ItemType.LANTERN, slot: ItemSlot.LANTERN,
    level: 20, value: 800, stats: {},
    description: 'Burns with arcane fire that never dies. Illuminates even magical darkness.',
  },
  {
    id: nextId(), name: 'Sunstone Beacon', icon: '🏮',
    rarity: ItemRarity.LEGENDARY, type: ItemType.LANTERN, slot: ItemSlot.LANTERN,
    level: 30, value: 3000, stats: {},
    description: 'A shard of captured sunlight. Banishes all shadow in a wide radius.',
    legendaryAbility: 'Nearby enemies are blinded, reducing their accuracy by 15%.',
  },
  {
    id: nextId(), name: 'The Undying Flame', icon: '🏮',
    rarity: ItemRarity.MYTHIC, type: ItemType.LANTERN, slot: ItemSlot.LANTERN,
    level: 40, value: 10000, stats: {},
    description: 'Forged from the last ember of a dying star. Its warmth can be felt across realms.',
    legendaryAbility: 'Regenerate 2% max HP per second while the lantern is lit.',
  },
  // =========================================================================
  //  RUNE ITEMS (5) — socketable runes for the runeword system
  // =========================================================================
  {
    id: nextId(), name: 'Rune of Fire', icon: '🔥',
    rarity: ItemRarity.UNCOMMON, type: ItemType.RUNE, slot: ItemSlot.ACCESSORY_1,
    level: 1, value: 50, stats: {},
    description: 'A smoldering rune etched with primal fire. Socket into equipment to build runewords.',
    maxSockets: 0,
  },
  {
    id: nextId(), name: 'Rune of Frost', icon: '❄️',
    rarity: ItemRarity.UNCOMMON, type: ItemType.RUNE, slot: ItemSlot.ACCESSORY_1,
    level: 1, value: 50, stats: {},
    description: 'A glacial rune radiating bitter cold. Socket into equipment to build runewords.',
    maxSockets: 0,
  },
  {
    id: nextId(), name: 'Rune of Thunder', icon: '⚡',
    rarity: ItemRarity.RARE, type: ItemType.RUNE, slot: ItemSlot.ACCESSORY_1,
    level: 1, value: 100, stats: {},
    description: 'A crackling rune charged with lightning. Socket into equipment to build runewords.',
    maxSockets: 0,
  },
  {
    id: nextId(), name: 'Rune of Venom', icon: '🐍',
    rarity: ItemRarity.RARE, type: ItemType.RUNE, slot: ItemSlot.ACCESSORY_1,
    level: 1, value: 100, stats: {},
    description: 'A toxic rune dripping with venom. Socket into equipment to build runewords.',
    maxSockets: 0,
  },
  {
    id: nextId(), name: 'Rune of Light', icon: '✨',
    rarity: ItemRarity.EPIC, type: ItemType.RUNE, slot: ItemSlot.ACCESSORY_1,
    level: 1, value: 200, stats: {},
    description: 'A radiant rune shining with divine light. Socket into equipment to build runewords.',
    maxSockets: 0,
  },
];

// ---------------------------------------------------------------------------
//  LANTERN LIGHT CONFIGS  (keyed by item name)
// ---------------------------------------------------------------------------

export const LANTERN_CONFIGS: Record<string, { intensity: number; distance: number; color: number }> = {
  'Rusty Lantern':        { intensity: 1.0, distance: 7,  color: 0xcc8833 },
  'Traveler\'s Lantern':  { intensity: 1.5, distance: 10, color: 0xffaa55 },
  'Miner\'s Headlamp':    { intensity: 2.0, distance: 13, color: 0xeeddaa },
  'Enchanted Brazier':    { intensity: 2.5, distance: 16, color: 0x88aaff },
  'Sunstone Beacon':      { intensity: 3.0, distance: 20, color: 0xfff5cc },
  'The Undying Flame':    { intensity: 3.5, distance: 24, color: 0xffcc44 },
};

// ---------------------------------------------------------------------------
//  5. SET BONUSES
// ---------------------------------------------------------------------------

export const SET_BONUSES: DiabloSetBonus[] = [
  {
    setName: 'Dragon Knight',
    pieces: 4,
    bonusDescription: 'The fury of dragonkind flows through you.',
    bonusStats: {
      strength: 20,
      critDamage: 25,
      fireResist: 30,
    },
  },
  {
    setName: 'Archmage\'s Regalia',
    pieces: 4,
    bonusDescription: 'The accumulated wisdom of the arcane order empowers your spells.',
    bonusStats: {
      intelligence: 25,
      manaRegen: 5,
      bonusDamage: 15,
    },
  },
  {
    setName: 'Shadow Stalker',
    pieces: 3,
    bonusDescription: 'You become one with the shadows, striking before the enemy can react.',
    bonusStats: {
      dexterity: 20,
      critChance: 10,
      attackSpeed: 15,
    },
  },
  {
    setName: 'Undying Guardian',
    pieces: 4,
    bonusDescription: 'You are an immovable fortress. Death holds no dominion over you.',
    bonusStats: {
      vitality: 30,
      armor: 50,
      lifeSteal: 5,
    },
  },
  // ── Map-Specific Set Bonuses ──
  { setName: "Woodsman's Regalia", pieces: 3, bonusDescription: 'The forest lends its cunning. Bonus crit and damage against beasts.', bonusStats: { critChance: 5, critDamage: 10, dexterity: 4 } },
  { setName: 'Corrupted Sentinel', pieces: 3, bonusDescription: 'Shadow and steel become one. Attacks steal mana and grant burst speed.', bonusStats: { attackSpeed: 8, manaRegen: 5, dexterity: 6 } },
  { setName: "Gravecaller's Vestments", pieces: 3, bonusDescription: 'Death answers your call. Bonus spell damage and life stolen from the fallen.', bonusStats: { bonusDamage: 10, lifeSteal: 5, intelligence: 8 } },
  { setName: 'Molten Core', pieces: 3, bonusDescription: 'The magma flows through your veins. Fire immunity and attacks burn enemies.', bonusStats: { fireResist: 25, bonusDamage: 14, strength: 10 } },
  { setName: "Riftwalker's Raiment", pieces: 3, bonusDescription: 'You exist between planes. Phase through attacks and bonus void damage.', bonusStats: { bonusDamage: 16, bonusHealth: 50, manaRegen: 10 } },
  { setName: "Dragonslayer's Triumph", pieces: 3, bonusDescription: 'You carry the might of fallen wyrms. Massive bonus to all resistances.', bonusStats: { fireResist: 15, iceResist: 15, lightningResist: 15, strength: 14 } },
  { setName: "Desert Nomad's Garb", pieces: 3, bonusDescription: 'The desert cannot claim you. Bonus movement speed and heat resistance.', bonusStats: { moveSpeed: 8, fireResist: 10, attackSpeed: 5 } },
  { setName: "Verdant Guardian's Embrace", pieces: 3, bonusDescription: 'Nature wraps you in its embrace. Regenerate health and gain vitality.', bonusStats: { bonusHealth: 25, vitality: 8, poisonResist: 8 } },
  { setName: "Marsh Dweller's Kit", pieces: 3, bonusDescription: 'Venom empowers rather than kills. Poison strengthens your strikes.', bonusStats: { poisonResist: 20, critChance: 6, bonusDamage: 12 } },
  { setName: 'Crystalline Regalia', pieces: 3, bonusDescription: 'Your body resonates with crystal harmonics. Spells refract and amplify.', bonusStats: { intelligence: 12, critChance: 7, bonusMana: 30 } },
  { setName: 'Frostbound', pieces: 3, bonusDescription: 'Freezing aura slows nearby enemies by 25% and deals cold damage over time.', bonusStats: { iceResist: 30, armor: 20, bonusHealth: 50 } },
  { setName: "Exorcist's Regalia", pieces: 3, bonusDescription: 'Holy light deals continuous damage to undead. Healing increased by 25%.', bonusStats: { intelligence: 20, manaRegen: 10, bonusHealth: 60 } },
  { setName: 'Briarwoven', pieces: 3, bonusDescription: 'Thorns deal 35% of damage received back to attackers. Standing still heals.', bonusStats: { vitality: 20, armor: 25, poisonResist: 25 } },
  { setName: "Gearmaster's Apparatus", pieces: 3, bonusDescription: 'Every 5th attack triggers Overclock, doubling attack speed for 3 seconds.', bonusStats: { attackSpeed: 12, critChance: 8, dexterity: 15 } },
  { setName: "Bloodlord's Dominion", pieces: 3, bonusDescription: 'Life stolen fills a Blood Well. When full, unleashes Crimson Eruption.', bonusStats: { lifeSteal: 8, bonusHealth: 80, strength: 15 } },
  { setName: "Stormcaller's Fury", pieces: 3, bonusDescription: 'Lightning arcs between you and enemies, intensifying with more targets.', bonusStats: { lightningResist: 30, bonusDamage: 25, moveSpeed: 8 } },
  { setName: 'Shadowbound', pieces: 3, bonusDescription: '15% chance to phase through attacks. Attacks from behind deal 50% bonus.', bonusStats: { critChance: 10, critDamage: 20, dexterity: 18 } },
  { setName: "Abyssal Titan's Raiment", pieces: 3, bonusDescription: '+15% max HP. Below 50%, shockwave grants Titan Resolve (+25% DR, +20% DMG).', bonusStats: { strength: 25, vitality: 25, armor: 30, bonusHealth: 100 } },
  { setName: "Moonweaver's Attire", pieces: 3, bonusDescription: 'Spells cycle between waxing (+30% damage) and waning (+30% healing).', bonusStats: { intelligence: 20, manaRegen: 12, bonusMana: 60 } },
  { setName: "Tidecaller's Regalia", pieces: 3, bonusDescription: 'Attackers are marked with Depth Pressure — at 3 marks, crushed and stunned.', bonusStats: { iceResist: 25, armor: 20, vitality: 18, bonusDamage: 15 } },
  { setName: "Lorekeeper's Regalia", pieces: 3, bonusDescription: 'Spells cost 25% less mana. Every 3rd spell releases an arcane nova.', bonusStats: { intelligence: 20, manaRegen: 12, bonusDamage: 15 } },
  { setName: "Jade Emperor's Discipline", pieces: 3, bonusDescription: 'Melee attacks 20% faster. Dodging empowers the next strike with jade energy.', bonusStats: { dexterity: 18, attackSpeed: 10, critChance: 8 } },
  { setName: 'War-Torn Resolve', pieces: 3, bonusDescription: 'Below 50% health, gain a stacking shield absorbing incoming hits.', bonusStats: { armor: 30, vitality: 16, bonusHealth: 60 } },
  { setName: "Sporecaller's Bloom", pieces: 3, bonusDescription: 'Regen health while still. Poison damage now heals you instead.', bonusStats: { vitality: 14, poisonResist: 20, bonusHealth: 45 } },
  { setName: "Obsidian Warden's Vigil", pieces: 3, bonusDescription: '15% chance for magma eruption on melee. Fire damage increased by 25%.', bonusStats: { strength: 18, fireResist: 20, bonusDamage: 18 } },
  { setName: "Seraphim's Grace", pieces: 3, bonusDescription: 'Healing aura and +20% spell damage. Undead/demons take holy damage nearby.', bonusStats: { intelligence: 22, manaRegen: 14, bonusHealth: 50 } },
  { setName: "Infernal Monarch's Dominion", pieces: 3, bonusDescription: 'Attacks deal bonus fire equal to 10% STR. Kills leave burning ground.', bonusStats: { strength: 24, critDamage: 18, bonusDamage: 20 } },
  { setName: 'Voidborn Convergence', pieces: 3, bonusDescription: '15% incoming damage nullified. Spells have 10% chance to cast twice.', bonusStats: { intelligence: 26, critChance: 8, bonusMana: 60 } },
  { setName: "Champion's Glory", pieces: 3, bonusDescription: 'Consecutive hits build momentum, +4% damage per hit up to 40%.', bonusStats: { strength: 20, armor: 22, critChance: 6 } },
  { setName: "Gorgon's Visage", pieces: 3, bonusDescription: 'Crit strikes 20% chance to slow enemies 50% with creeping stone.', bonusStats: { intelligence: 18, critChance: 8, armor: 20 } },
  { setName: "Drowned King's Regalia", pieces: 3, bonusDescription: '25% chance to drench enemies: -30% attack speed, +40% ice damage taken.', bonusStats: { bonusDamage: 25, iceResist: 30, bonusHealth: 200 } },
  { setName: "Wyrm Rider's Scalehide", pieces: 3, bonusDescription: '+50% fire resist. Deal 20% of fire resistance as bonus fire damage.', bonusStats: { fireResist: 35, critChance: 8, bonusDamage: 20 } },
  { setName: "Plague Doctor's Quarantine", pieces: 3, bonusDescription: 'Nearby enemies take 3% max HP as poison/sec. Healing increased 30%.', bonusStats: { poisonResist: 35, intelligence: 20, manaRegen: 10 } },
  { setName: "Ethereal Walker's Veil", pieces: 3, bonusDescription: '15% chance to avoid all damage. Spells deal +25% vs targets above 50% HP.', bonusStats: { intelligence: 25, manaRegen: 12, critDamage: 20 } },
  { setName: 'Iron Colossus Plating', pieces: 3, bonusDescription: '+20% DR when still. Movement builds Kinetic Charge for 200% bonus damage.', bonusStats: { armor: 50, strength: 25, bonusHealth: 250 } },
  { setName: 'Blighted Crown Regalia', pieces: 3, bonusDescription: 'Enemies have healing reduced 60%. Kills grant Corruption stacks (+5% DMG).', bonusStats: { bonusDamage: 28, lifeSteal: 6, critChance: 8 } },
  { setName: "Chronomancer's Paradox", pieces: 3, bonusDescription: 'Cooldowns recover 30% faster. Every 15s, Temporal Echo repeats last 3 attacks.', bonusStats: { attackSpeed: 14, intelligence: 28, manaRegen: 14 } },
  { setName: 'Elder Sign Ward', pieces: 3, bonusDescription: 'Debuff immunity 2s every 12s. All resistances increased by 20%.', bonusStats: { bonusHealth: 300, armor: 40, manaRegen: 12 } },
  { setName: 'Ruined Garrison', pieces: 3, bonusDescription: 'Stand your ground. +15% armor when stationary. Attacks taunt nearby enemies.', bonusStats: { armor: 12, strength: 6, vitality: 5 } },
  { setName: 'Thornwall Watch', pieces: 3, bonusDescription: 'City patrol instincts. +10% movement speed. Flanking attacks deal 20% bonus.', bonusStats: { dexterity: 8, moveSpeed: 5, critChance: 4 } },

];

// ---------------------------------------------------------------------------
//  MAP-SPECIFIC ITEMS (map → item names that can drop from rares/bosses)
// ---------------------------------------------------------------------------

export const MAP_SPECIFIC_ITEMS: Record<string, string[]> = {
  'FOREST': ["Woodsman's Coif", "Woodsman's Hauberk", "Woodsman's Broadaxe", 'Thornmother'],
  'ELVEN_VILLAGE': ['Corrupted Sentinel Blade', 'Corrupted Sentinel Grips', 'Corrupted Sentinel Circlet', 'Aelindra, Last Light of the Grove'],
  'NECROPOLIS_DUNGEON': ["Gravecaller's Visage", "Gravecaller's Shroud", "Gravecaller's Scepter", 'Soulthorn, the Reaping Wand'],
  'VOLCANIC_WASTES': ['Molten Core Greathammer', 'Molten Core Gauntlets', 'Molten Core Pendant', 'Pyreclasm'],
  'ABYSSAL_RIFT': ["Riftwalker's Cowl", "Riftwalker's Voidmantle", "Riftwalker's Voidstaff", 'Nullblade, Edge of the Unreal'],
  'DRAGONS_SANCTUM': ["Dragonslayer's Fang", "Dragonslayer's Scalemail", "Dragonslayer's Greaves", 'Gharrax, the Dragon Fang Lance'],
  'SUNSCORCH_DESERT': ["Desert Nomad's Turban", "Desert Nomad's Sandwalkers", "Desert Nomad's Sun Sigil", 'Miragecleaver'],
  'EMERALD_GRASSLANDS': ["Verdant Guardian's Breastplate", "Verdant Guardian's Legguards", "Verdant Guardian's Seedring", 'Bloomthorn, the Living Blade'],
  'WHISPERING_MARSH': ["Marsh Dweller's Hood", "Marsh Dweller's Claws", "Marsh Dweller's Fang", 'Blightspitter'],
  'CRYSTAL_CAVERNS': ['Crystalline Crown', 'Crystalline Cuirass', 'Crystalline Wand', 'Prismatica, the Shattered Spectrum'],
  'FROZEN_TUNDRA': ['Frostbound Helm', 'Frostbound Gauntlets', 'Frostbound Greaves', 'Rimecleaver'],
  'HAUNTED_CATHEDRAL': ["Exorcist's Vestments", "Exorcist's Phylactery", "Exorcist's Censer", "Saint Vesper's Blessed Codex"],
  'THORNWOOD_THICKET': ['Briarwoven Crown', 'Briarwoven Cuirass', 'Briarwoven Legguards', 'Lashvine'],
  'CLOCKWORK_FOUNDRY': ["Gearmaster's Visor", "Gearmaster's Power Gauntlets", "Gearmaster's Calibrated Ring", 'The Mainspring'],
  'CRIMSON_CITADEL': ["Bloodlord's Diadem", "Bloodlord's Cuirass", "Bloodlord's Signet", 'Sanguine Thirst'],
  'STORMSPIRE_PEAK': ["Stormcaller's Pauldrons", "Stormcaller's Greaves", "Stormcaller's Focus", 'Thunderfall'],
  'SHADOW_REALM': ['Shadowbound Cowl', 'Shadowbound Mantle', 'Shadowbound Anklets', "Nether's Edge"],
  'PRIMORDIAL_ABYSS': ["Abyssal Titan's Warhelm", "Abyssal Titan's Chestguard", "Abyssal Titan's Grasp", 'Entropy'],
  'MOONLIT_GROVE': ["Moonweaver's Circlet", "Moonweaver's Shroud", "Moonweaver's Pendant", 'Lunarbane'],
  'CORAL_DEPTHS': ["Tidecaller's Shell Helm", "Tidecaller's Coral Gauntlets", "Tidecaller's Abyssal Lantern", 'Riptide'],
  'ANCIENT_LIBRARY': ["Lorekeeper's Astral Staff", "Lorekeeper's Circlet of Tongues", "Lorekeeper's Tome-Stitched Robe", 'Codex of Unwritten Futures'],
  'JADE_TEMPLE': ["Jade Emperor's Palm Wraps", "Jade Emperor's Flowing Tassets", "Jade Emperor's Thousand-Step Sandals", 'Qilin Fang, the Jade Crescent'],
  'ASHEN_BATTLEFIELD': ['War-Torn Bulwark of the Fallen', 'War-Torn Hollow-Eyed Helm', 'War-Torn Siege Gauntlets', 'Vow of the Last Marshal'],
  'FUNGAL_DEPTHS': ["Sporecaller's Hyphal Pendant", "Sporecaller's Fruiting Hauberk", "Sporecaller's Root-Threaded Boots", 'The Cordyceps Paradox'],
  'OBSIDIAN_FORTRESS': ["Obsidian Warden's Volcanic Cuirass", "Obsidian Warden's Caldera Greaves", "Obsidian Warden's Magma-Heart Ring", 'Shard of the Collapsed Caldera'],
  'CELESTIAL_RUINS': ["Seraphim's Aureate Diadem", "Seraphim's Guiding Censer", "Seraphim's Choir Pendant", 'Pinnion of the Fallen Throne'],
  'INFERNAL_THRONE': ["Infernal Monarch's Ember Talons", "Infernal Monarch's Pact Signet", "Infernal Monarch's Ruinous Axe", "Asmodeus' Unquenched Brand"],
  'ASTRAL_VOID': ['Voidborn Parallax Visor', 'Voidborn Nebula Vestment', 'Voidborn Quantum Treads', "Entropy's Final Digit"],
  'SHATTERED_COLOSSEUM': ["Champion's Roar-Etched Plastron", "Champion's Sand-Stained Cuisses", "Champion's Crowd-Favor Buckler", "Rex Arenae, the Crowd's Verdict"],
  'PETRIFIED_GARDEN': ["Gorgon's Serpent-Crown", "Gorgon's Calcifying Band", "Gorgon's Fang of Still Life", 'Reflection of the Last Beholder'],
  'SUNKEN_CITADEL': ["Drowned King's Coral Crown", "Drowned King's Tidal Mantle", "Drowned King's Abyssal Gauntlets", 'Tidecaller, Trident of the Drowned Throne'],
  'WYRMSCAR_CANYON': ["Wyrm Rider's Dragonscale Hauberk", "Wyrm Rider's Tail-Guard Greaves", "Wyrm Rider's Clawgrip Boots", "Wyrmfang, the Canyon's Hunger"],
  'PLAGUEROT_SEWERS': ["Plague Doctor's Beaked Mask", "Plague Doctor's Suppurating Gloves", "Plague Doctor's Miasma Censer", 'Blightfinger, the Pandemic Wand'],
  'ETHEREAL_SANCTUM': ["Ethereal Walker's Hollow Visage", "Ethereal Walker's Phaseweave Robe", "Ethereal Walker's Wraith Band", 'Voidtongue, Blade Between Worlds'],
  'IRON_WASTES': ['Iron Colossus Furnace Plate', 'Iron Colossus Piston Gauntlets', 'Iron Colossus Treader Greaves', 'Titanfall, the Siege Breaker'],
  'BLIGHTED_THRONE': ['Blighted Crown of the False King', 'Blighted Bulwark of Ruined Oaths', 'Blighted Signet of the Usurper', 'Ruingrasp, Scepter of the Fallen Throne'],
  'CHRONO_LABYRINTH': ["Chronomancer's Paradox Hood", "Chronomancer's Timeskip Treads", "Chronomancer's M\u00f6bius Amulet", "Epoch's End, the Moment Eater"],
  'ELDRITCH_NEXUS': ['Elder Sign Warded Vestments', 'Elder Sign Sealed Legguards', 'Elder Sign Sanity Lantern', "Yith'garath, the Unnameable Edge"],
  'CITY_RUINS': ['Ruined Garrison Helm', 'Ruined Garrison Chestplate', 'Ruined Garrison Signet', "Oathbreaker, the Captain's Last Blade"],
  'CITY': ['Thornwall Watch Hauberk', 'Thornwall Watch Greaves', 'Thornwall Watch Badge', "Magistrate's Verdict"],
};


// ---------------------------------------------------------------------------
//  6. LOOT TABLES
// ---------------------------------------------------------------------------

export const LOOT_TABLES: Record<EnemyType, { rarity: ItemRarity; chance: number }[]> = {
  [EnemyType.WOLF]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.FOREST_SPIDER]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.12 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.BANDIT]: [
    { rarity: ItemRarity.COMMON, chance: 0.55 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.04 },
    { rarity: ItemRarity.EPIC, chance: 0.005 },
  ],
  [EnemyType.BEAR]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.TREANT]: [
    { rarity: ItemRarity.COMMON, chance: 0.6 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.03 },
    { rarity: ItemRarity.MYTHIC, chance: 0.005 },
  ],
  [EnemyType.CORRUPTED_ELF]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.DARK_RANGER]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.28 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.SHADOW_BEAST]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.45 },
    { rarity: ItemRarity.RARE, chance: 0.25 },
    { rarity: ItemRarity.EPIC, chance: 0.12 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.04 },
    { rarity: ItemRarity.MYTHIC, chance: 0.008 },
  ],
  [EnemyType.SKELETON_WARRIOR]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.03 },
  ],
  [EnemyType.ZOMBIE]: [
    { rarity: ItemRarity.COMMON, chance: 0.55 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.18 },
    { rarity: ItemRarity.RARE, chance: 0.03 },
    { rarity: ItemRarity.EPIC, chance: 0.005 },
  ],
  [EnemyType.NECROMANCER]: [
    { rarity: ItemRarity.COMMON, chance: 0.4 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.02 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.BONE_GOLEM]: [
    { rarity: ItemRarity.COMMON, chance: 0.55 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.45 },
    { rarity: ItemRarity.RARE, chance: 0.3 },
    { rarity: ItemRarity.EPIC, chance: 0.15 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.05 },
    { rarity: ItemRarity.MYTHIC, chance: 0.01 },
    { rarity: ItemRarity.DIVINE, chance: 0.002 },
  ],
  [EnemyType.WRAITH]: [
    { rarity: ItemRarity.COMMON, chance: 0.4 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  // -- Volcanic Wastes --
  [EnemyType.FIRE_IMP]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.02 },
  ],
  [EnemyType.LAVA_ELEMENTAL]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.04 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.01 },
  ],
  [EnemyType.INFERNAL_KNIGHT]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.18 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.015 },
  ],
  [EnemyType.MAGMA_SERPENT]: [
    { rarity: ItemRarity.COMMON, chance: 0.4 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
  ],
  [EnemyType.MOLTEN_COLOSSUS]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.5 },
    { rarity: ItemRarity.RARE, chance: 0.35 },
    { rarity: ItemRarity.EPIC, chance: 0.2 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.08 },
    { rarity: ItemRarity.MYTHIC, chance: 0.02 },
    { rarity: ItemRarity.DIVINE, chance: 0.005 },
  ],
  // -- Abyssal Rift --
  [EnemyType.VOID_STALKER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.01 },
  ],
  [EnemyType.SHADOW_WEAVER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  [EnemyType.ABYSSAL_HORROR]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.22 },
    { rarity: ItemRarity.EPIC, chance: 0.1 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.03 },
  ],
  [EnemyType.RIFT_WALKER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.38 },
    { rarity: ItemRarity.RARE, chance: 0.18 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.015 },
  ],
  [EnemyType.ENTROPY_LORD]: [
    { rarity: ItemRarity.RARE, chance: 0.5 },
    { rarity: ItemRarity.EPIC, chance: 0.3 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.12 },
    { rarity: ItemRarity.MYTHIC, chance: 0.04 },
    { rarity: ItemRarity.DIVINE, chance: 0.01 },
  ],
  // -- Dragon's Sanctum --
  [EnemyType.DRAGONKIN_WARRIOR]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  [EnemyType.WYRM_PRIEST]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.22 },
    { rarity: ItemRarity.EPIC, chance: 0.1 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.03 },
    { rarity: ItemRarity.MYTHIC, chance: 0.005 },
  ],
  [EnemyType.DRAKE_GUARDIAN]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.25 },
    { rarity: ItemRarity.EPIC, chance: 0.12 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.04 },
    { rarity: ItemRarity.MYTHIC, chance: 0.008 },
  ],
  [EnemyType.DRAGON_WHELP]: [
    { rarity: ItemRarity.COMMON, chance: 0.35 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.01 },
  ],
  [EnemyType.ELDER_DRAGON]: [
    { rarity: ItemRarity.RARE, chance: 0.6 },
    { rarity: ItemRarity.EPIC, chance: 0.4 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.2 },
    { rarity: ItemRarity.MYTHIC, chance: 0.08 },
    { rarity: ItemRarity.DIVINE, chance: 0.02 },
  ],
  // -- Special --
  [EnemyType.TREASURE_MIMIC]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.6 },
    { rarity: ItemRarity.RARE, chance: 0.3 },
    { rarity: ItemRarity.EPIC, chance: 0.15 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.05 },
    { rarity: ItemRarity.MYTHIC, chance: 0.01 },
  ],
  // Night bosses drop guaranteed epic+ loot
  [EnemyType.NIGHT_FOREST_WENDIGO]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.4 },
    { rarity: ItemRarity.MYTHIC, chance: 0.08 },
  ],
  [EnemyType.NIGHT_ELVEN_BANSHEE_QUEEN]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.45 },
    { rarity: ItemRarity.MYTHIC, chance: 0.1 },
  ],
  [EnemyType.NIGHT_NECRO_DEATH_KNIGHT]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.5 },
    { rarity: ItemRarity.MYTHIC, chance: 0.12 },
  ],
  [EnemyType.NIGHT_VOLCANIC_INFERNO_TITAN]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.6 },
    { rarity: ItemRarity.MYTHIC, chance: 0.15 },
  ],
  [EnemyType.NIGHT_RIFT_VOID_EMPEROR]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.7 },
    { rarity: ItemRarity.MYTHIC, chance: 0.2 },
  ],
  [EnemyType.NIGHT_DRAGON_SHADOW_WYRM]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.8 },
    { rarity: ItemRarity.MYTHIC, chance: 0.3 },
  ],

  // -- Desert enemies --
  [EnemyType.SAND_SCORPION]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.1 },
  ],
  [EnemyType.DESERT_BANDIT]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.SAND_WURM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.04 },
  ],
  [EnemyType.DUST_WRAITH]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.03 },
  ],
  [EnemyType.SAND_GOLEM]: [
    { rarity: ItemRarity.COMMON, chance: 0.55 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],

  // -- Grassland enemies --
  [EnemyType.WILD_BOAR]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.1 },
  ],
  [EnemyType.PLAINS_RAIDER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.GIANT_HAWK]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.12 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.BISON_BEAST]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.008 },
  ],
  [EnemyType.CENTAUR_WARCHIEF]: [
    { rarity: ItemRarity.COMMON, chance: 0.55 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],

  // -- Desert & Grassland night bosses --
  [EnemyType.NIGHT_DESERT_SANDSTORM_DJINN]: [
    { rarity: ItemRarity.RARE, chance: 1.0 },
    { rarity: ItemRarity.EPIC, chance: 0.5 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.15 },
  ],
  [EnemyType.NIGHT_GRASSLAND_STAMPEDE_KING]: [
    { rarity: ItemRarity.RARE, chance: 1.0 },
    { rarity: ItemRarity.EPIC, chance: 0.5 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.15 },
  ],

  // -- Marsh & Caverns (Easy) --
  [EnemyType.BOG_LURKER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.12 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.MARSH_HAG]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.04 },
  ],
  [EnemyType.TOXIC_TOAD]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.1 },
  ],
  [EnemyType.SWAMP_VINE]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.03 },
  ],
  [EnemyType.CRYSTAL_SPIDER]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.03 },
  ],
  [EnemyType.GEM_GOLEM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
  ],
  [EnemyType.CAVE_BAT_SWARM]: [
    { rarity: ItemRarity.COMMON, chance: 0.4 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.1 },
  ],
  [EnemyType.QUARTZ_ELEMENTAL]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.18 },
    { rarity: ItemRarity.RARE, chance: 0.04 },
  ],

  // -- Easy bosses --
  [EnemyType.HYDRA_MATRIARCH]: [
    { rarity: ItemRarity.COMMON, chance: 0.6 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  [EnemyType.PRISMATIC_WYRM]: [
    { rarity: ItemRarity.COMMON, chance: 0.6 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.22 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.03 },
  ],

  // -- Tundra, Cathedral & Thornwood (Medium) --
  [EnemyType.FROST_WOLF]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.ICE_WRAITH]: [
    { rarity: ItemRarity.COMMON, chance: 0.4 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.28 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.YETI]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
  ],
  [EnemyType.FROZEN_REVENANT]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.PHANTOM_KNIGHT]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.28 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.GARGOYLE]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
  ],
  [EnemyType.CURSED_PRIEST]: [
    { rarity: ItemRarity.COMMON, chance: 0.4 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.02 },
  ],
  [EnemyType.SHADOW_ACOLYTE]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.THORN_CRAWLER]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.BLIGHT_SPRITE]: [
    { rarity: ItemRarity.COMMON, chance: 0.4 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
  ],
  [EnemyType.FUNGAL_BRUTE]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.02 },
  ],
  [EnemyType.ROTWOOD_LICH]: [
    { rarity: ItemRarity.COMMON, chance: 0.4 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.02 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],

  // -- Medium bosses --
  [EnemyType.GLACIAL_TITAN]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.5 },
    { rarity: ItemRarity.RARE, chance: 0.3 },
    { rarity: ItemRarity.EPIC, chance: 0.15 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.05 },
    { rarity: ItemRarity.MYTHIC, chance: 0.01 },
  ],
  [EnemyType.CATHEDRAL_DEMON]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.5 },
    { rarity: ItemRarity.RARE, chance: 0.35 },
    { rarity: ItemRarity.EPIC, chance: 0.18 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.06 },
    { rarity: ItemRarity.MYTHIC, chance: 0.012 },
  ],
  [EnemyType.THORNMOTHER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.5 },
    { rarity: ItemRarity.RARE, chance: 0.3 },
    { rarity: ItemRarity.EPIC, chance: 0.15 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.05 },
    { rarity: ItemRarity.MYTHIC, chance: 0.01 },
  ],

  // -- Clockwork, Crimson & Stormspire (Hard) --
  [EnemyType.CLOCKWORK_SOLDIER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.01 },
  ],
  [EnemyType.STEAM_GOLEM]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  [EnemyType.GEAR_SPIDER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.04 },
  ],
  [EnemyType.FORGE_MASTER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  [EnemyType.BLOOD_KNIGHT]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.18 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.015 },
  ],
  [EnemyType.CRIMSON_MAGE]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  [EnemyType.GARGOYLE_SENTINEL]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.18 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.015 },
  ],
  [EnemyType.BLOOD_FIEND]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.38 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.01 },
  ],
  [EnemyType.STORM_HARPY]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.38 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.01 },
  ],
  [EnemyType.THUNDER_ELEMENTAL]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.18 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.015 },
  ],
  [EnemyType.LIGHTNING_DRAKE]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.38 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  [EnemyType.WIND_SHAMAN]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.18 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.015 },
  ],

  // -- Hard bosses --
  [EnemyType.IRON_COLOSSUS]: [
    { rarity: ItemRarity.RARE, chance: 0.5 },
    { rarity: ItemRarity.EPIC, chance: 0.3 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.12 },
    { rarity: ItemRarity.MYTHIC, chance: 0.04 },
    { rarity: ItemRarity.DIVINE, chance: 0.01 },
  ],
  [EnemyType.VAMPIRE_LORD]: [
    { rarity: ItemRarity.RARE, chance: 0.5 },
    { rarity: ItemRarity.EPIC, chance: 0.35 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.15 },
    { rarity: ItemRarity.MYTHIC, chance: 0.05 },
    { rarity: ItemRarity.DIVINE, chance: 0.012 },
  ],
  [EnemyType.TEMPEST_TITAN]: [
    { rarity: ItemRarity.RARE, chance: 0.5 },
    { rarity: ItemRarity.EPIC, chance: 0.35 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.15 },
    { rarity: ItemRarity.MYTHIC, chance: 0.05 },
    { rarity: ItemRarity.DIVINE, chance: 0.012 },
  ],

  // -- Shadow Realm & Primordial Abyss (Extreme) --
  [EnemyType.NIGHTMARE_STALKER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.22 },
    { rarity: ItemRarity.EPIC, chance: 0.1 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.03 },
  ],
  [EnemyType.DREAD_PHANTOM]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.25 },
    { rarity: ItemRarity.EPIC, chance: 0.12 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.04 },
  ],
  [EnemyType.SOUL_DEVOURER]: [
    { rarity: ItemRarity.RARE, chance: 0.35 },
    { rarity: ItemRarity.EPIC, chance: 0.15 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.05 },
    { rarity: ItemRarity.MYTHIC, chance: 0.01 },
  ],
  [EnemyType.SHADOW_COLOSSUS]: [
    { rarity: ItemRarity.RARE, chance: 0.4 },
    { rarity: ItemRarity.EPIC, chance: 0.2 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.08 },
    { rarity: ItemRarity.MYTHIC, chance: 0.02 },
  ],
  [EnemyType.ABYSSAL_LEVIATHAN]: [
    { rarity: ItemRarity.RARE, chance: 0.35 },
    { rarity: ItemRarity.EPIC, chance: 0.18 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.06 },
    { rarity: ItemRarity.MYTHIC, chance: 0.015 },
  ],
  [EnemyType.VOID_REAPER]: [
    { rarity: ItemRarity.RARE, chance: 0.35 },
    { rarity: ItemRarity.EPIC, chance: 0.2 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.08 },
    { rarity: ItemRarity.MYTHIC, chance: 0.02 },
  ],
  [EnemyType.CHAOS_SPAWN]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.22 },
    { rarity: ItemRarity.EPIC, chance: 0.1 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.03 },
  ],
  [EnemyType.ELDER_VOID_FIEND]: [
    { rarity: ItemRarity.RARE, chance: 0.4 },
    { rarity: ItemRarity.EPIC, chance: 0.22 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.08 },
    { rarity: ItemRarity.MYTHIC, chance: 0.025 },
  ],

  // -- Extreme bosses --
  [EnemyType.NIGHTMARE_KING]: [
    { rarity: ItemRarity.RARE, chance: 0.6 },
    { rarity: ItemRarity.EPIC, chance: 0.4 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.2 },
    { rarity: ItemRarity.MYTHIC, chance: 0.08 },
    { rarity: ItemRarity.DIVINE, chance: 0.02 },
  ],
  [EnemyType.PRIMORDIAL_ONE]: [
    { rarity: ItemRarity.EPIC, chance: 0.6 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.35 },
    { rarity: ItemRarity.MYTHIC, chance: 0.15 },
    { rarity: ItemRarity.DIVINE, chance: 0.05 },
  ],

  // -- Night bosses for new maps --
  [EnemyType.NIGHT_MARSH_SWAMP_MOTHER]: [
    { rarity: ItemRarity.RARE, chance: 1.0 },
    { rarity: ItemRarity.EPIC, chance: 0.5 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.12 },
  ],
  [EnemyType.NIGHT_CAVERNS_CRYSTAL_KING]: [
    { rarity: ItemRarity.RARE, chance: 1.0 },
    { rarity: ItemRarity.EPIC, chance: 0.5 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.15 },
  ],
  [EnemyType.NIGHT_TUNDRA_FROST_EMPRESS]: [
    { rarity: ItemRarity.RARE, chance: 1.0 },
    { rarity: ItemRarity.EPIC, chance: 0.6 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.2 },
    { rarity: ItemRarity.MYTHIC, chance: 0.05 },
  ],
  [EnemyType.NIGHT_CATHEDRAL_ARCH_LICH]: [
    { rarity: ItemRarity.RARE, chance: 1.0 },
    { rarity: ItemRarity.EPIC, chance: 0.6 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.2 },
    { rarity: ItemRarity.MYTHIC, chance: 0.05 },
  ],
  [EnemyType.NIGHT_THORNWOOD_BLIGHT_LORD]: [
    { rarity: ItemRarity.RARE, chance: 1.0 },
    { rarity: ItemRarity.EPIC, chance: 0.6 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.2 },
    { rarity: ItemRarity.MYTHIC, chance: 0.05 },
  ],
  [EnemyType.NIGHT_FOUNDRY_IRON_TYRANT]: [
    { rarity: ItemRarity.RARE, chance: 1.0 },
    { rarity: ItemRarity.EPIC, chance: 0.7 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.25 },
    { rarity: ItemRarity.MYTHIC, chance: 0.08 },
  ],
  [EnemyType.NIGHT_CITADEL_BLOOD_EMPEROR]: [
    { rarity: ItemRarity.RARE, chance: 1.0 },
    { rarity: ItemRarity.EPIC, chance: 0.7 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.3 },
    { rarity: ItemRarity.MYTHIC, chance: 0.1 },
  ],
  [EnemyType.NIGHT_STORMSPIRE_THUNDER_GOD]: [
    { rarity: ItemRarity.RARE, chance: 1.0 },
    { rarity: ItemRarity.EPIC, chance: 0.7 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.3 },
    { rarity: ItemRarity.MYTHIC, chance: 0.1 },
  ],
  [EnemyType.NIGHT_SHADOW_DREAM_EATER]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.5 },
    { rarity: ItemRarity.MYTHIC, chance: 0.15 },
    { rarity: ItemRarity.DIVINE, chance: 0.03 },
  ],
  [EnemyType.NIGHT_ABYSS_WORLD_ENDER]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.6 },
    { rarity: ItemRarity.MYTHIC, chance: 0.2 },
    { rarity: ItemRarity.DIVINE, chance: 0.05 },
  ],

  // -- Moonlit Grove enemies --
  [EnemyType.MOONLIT_SPRITE]: [
    { rarity: ItemRarity.COMMON, chance: 0.4 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.08 },
  ],
  [EnemyType.FAE_DANCER]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.1 },
  ],
  [EnemyType.SHADOW_STAG]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
  ],
  [EnemyType.LUNAR_MOTH]: [
    { rarity: ItemRarity.COMMON, chance: 0.35 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.05 },
  ],
  [EnemyType.MOONBEAST_ALPHA]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.6 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
  ],
  // -- Coral Depths enemies --
  [EnemyType.REEF_CRAWLER]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.12 },
  ],
  [EnemyType.SIREN_WITCH]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.18 },
    { rarity: ItemRarity.RARE, chance: 0.03 },
  ],
  [EnemyType.ABYSSAL_ANGLER]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.12 },
  ],
  [EnemyType.BARNACLE_GOLEM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.03 },
  ],
  [EnemyType.LEVIATHAN_HATCHLING]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.7 },
    { rarity: ItemRarity.RARE, chance: 0.3 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
  ],
  // -- Ancient Library enemies --
  [EnemyType.ANIMATED_TOME]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
  ],
  [EnemyType.INK_WRAITH]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.18 },
    { rarity: ItemRarity.RARE, chance: 0.04 },
  ],
  [EnemyType.SCROLL_GOLEM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
  ],
  [EnemyType.ARCANE_CURATOR]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
  ],
  [EnemyType.FORBIDDEN_GRIMOIRE]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.6 },
    { rarity: ItemRarity.RARE, chance: 0.3 },
    { rarity: ItemRarity.EPIC, chance: 0.1 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  // -- Jade Temple enemies --
  [EnemyType.TEMPLE_GUARDIAN]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
  ],
  [EnemyType.VINE_SERPENT]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
  ],
  [EnemyType.JADE_CONSTRUCT]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
  ],
  [EnemyType.JUNGLE_SHAMAN]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.02 },
  ],
  [EnemyType.ANCIENT_IDOL]: [
    { rarity: ItemRarity.RARE, chance: 0.5 },
    { rarity: ItemRarity.EPIC, chance: 0.2 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.05 },
  ],
  // -- Ashen Battlefield enemies --
  [EnemyType.FALLEN_SOLDIER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
  ],
  [EnemyType.WAR_SPECTER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
  ],
  [EnemyType.SIEGE_WRAITH]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
  ],
  [EnemyType.ASHEN_COMMANDER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.18 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
  ],
  [EnemyType.DREAD_GENERAL]: [
    { rarity: ItemRarity.RARE, chance: 0.5 },
    { rarity: ItemRarity.EPIC, chance: 0.25 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.08 },
    { rarity: ItemRarity.MYTHIC, chance: 0.015 },
  ],
  // -- Fungal Depths enemies --
  [EnemyType.SPORE_CRAWLER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
  ],
  [EnemyType.MYCELIUM_HORROR]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.18 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
  ],
  [EnemyType.TOXIC_SHROOM]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.04 },
  ],
  [EnemyType.FUNGAL_SHAMBLER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.015 },
  ],
  [EnemyType.SPOREQUEEN]: [
    { rarity: ItemRarity.RARE, chance: 0.5 },
    { rarity: ItemRarity.EPIC, chance: 0.3 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.1 },
    { rarity: ItemRarity.MYTHIC, chance: 0.03 },
  ],
  // -- Obsidian Fortress enemies --
  [EnemyType.OBSIDIAN_SENTINEL]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.01 },
  ],
  [EnemyType.HELLFIRE_ARCHER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.18 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.015 },
  ],
  [EnemyType.DARK_INQUISITOR]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  [EnemyType.DOOM_HOUND]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.38 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.04 },
  ],
  [EnemyType.OBSIDIAN_WARLORD]: [
    { rarity: ItemRarity.RARE, chance: 0.5 },
    { rarity: ItemRarity.EPIC, chance: 0.3 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.12 },
    { rarity: ItemRarity.MYTHIC, chance: 0.04 },
    { rarity: ItemRarity.DIVINE, chance: 0.01 },
  ],
  // -- Celestial Ruins enemies --
  [EnemyType.STAR_WISP]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.18 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.015 },
  ],
  [EnemyType.ASTRAL_GUARDIAN]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.22 },
    { rarity: ItemRarity.EPIC, chance: 0.1 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.03 },
  ],
  [EnemyType.COMET_DRAKE]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  [EnemyType.VOID_MONK]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.38 },
    { rarity: ItemRarity.RARE, chance: 0.18 },
    { rarity: ItemRarity.EPIC, chance: 0.07 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  [EnemyType.CELESTIAL_ARCHON]: [
    { rarity: ItemRarity.RARE, chance: 0.6 },
    { rarity: ItemRarity.EPIC, chance: 0.4 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.18 },
    { rarity: ItemRarity.MYTHIC, chance: 0.06 },
    { rarity: ItemRarity.DIVINE, chance: 0.015 },
  ],
  // -- Infernal Throne enemies --
  [EnemyType.PIT_FIEND]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  [EnemyType.HELLBORN_MAGE]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.22 },
    { rarity: ItemRarity.EPIC, chance: 0.1 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.03 },
  ],
  [EnemyType.INFERNAL_BRUTE]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.25 },
    { rarity: ItemRarity.EPIC, chance: 0.12 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.04 },
  ],
  [EnemyType.SOUL_COLLECTOR]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.38 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.025 },
  ],
  [EnemyType.DEMON_OVERLORD]: [
    { rarity: ItemRarity.RARE, chance: 0.6 },
    { rarity: ItemRarity.EPIC, chance: 0.4 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.2 },
    { rarity: ItemRarity.MYTHIC, chance: 0.08 },
    { rarity: ItemRarity.DIVINE, chance: 0.02 },
  ],
  // -- Astral Void enemies --
  [EnemyType.REALITY_SHREDDER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.22 },
    { rarity: ItemRarity.EPIC, chance: 0.1 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.03 },
  ],
  [EnemyType.TEMPORAL_WRAITH]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.25 },
    { rarity: ItemRarity.EPIC, chance: 0.12 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.04 },
  ],
  [EnemyType.DIMENSION_WEAVER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.25 },
    { rarity: ItemRarity.EPIC, chance: 0.12 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.04 },
    { rarity: ItemRarity.MYTHIC, chance: 0.01 },
  ],
  [EnemyType.VOID_TITAN]: [
    { rarity: ItemRarity.RARE, chance: 0.45 },
    { rarity: ItemRarity.EPIC, chance: 0.25 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.08 },
    { rarity: ItemRarity.MYTHIC, chance: 0.02 },
  ],
  [EnemyType.ASTRAL_ANNIHILATOR]: [
    { rarity: ItemRarity.RARE, chance: 0.7 },
    { rarity: ItemRarity.EPIC, chance: 0.5 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.25 },
    { rarity: ItemRarity.MYTHIC, chance: 0.1 },
    { rarity: ItemRarity.DIVINE, chance: 0.03 },
  ],
  // -- Night bosses wave 2 --
  [EnemyType.NIGHT_GROVE_MOONFALL_DRYAD]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.35 },
    { rarity: ItemRarity.MYTHIC, chance: 0.06 },
  ],
  [EnemyType.NIGHT_CORAL_TIDE_KRAKEN]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.4 },
    { rarity: ItemRarity.MYTHIC, chance: 0.08 },
  ],
  [EnemyType.NIGHT_LIBRARY_LOREKEEPER]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.45 },
    { rarity: ItemRarity.MYTHIC, chance: 0.1 },
  ],
  [EnemyType.NIGHT_TEMPLE_JADE_EMPEROR]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.5 },
    { rarity: ItemRarity.MYTHIC, chance: 0.12 },
  ],
  [EnemyType.NIGHT_BATTLEFIELD_DEATH_MARSHAL]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.55 },
    { rarity: ItemRarity.MYTHIC, chance: 0.14 },
  ],
  [EnemyType.NIGHT_FUNGAL_MYCORRHIZA_QUEEN]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.6 },
    { rarity: ItemRarity.MYTHIC, chance: 0.16 },
  ],
  [EnemyType.NIGHT_OBSIDIAN_DARK_SOVEREIGN]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.65 },
    { rarity: ItemRarity.MYTHIC, chance: 0.18 },
  ],
  [EnemyType.NIGHT_CELESTIAL_FALLEN_SERAPH]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.75 },
    { rarity: ItemRarity.MYTHIC, chance: 0.25 },
    { rarity: ItemRarity.DIVINE, chance: 0.05 },
  ],
  [EnemyType.NIGHT_INFERNAL_ARCH_DEMON]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.8 },
    { rarity: ItemRarity.MYTHIC, chance: 0.3 },
    { rarity: ItemRarity.DIVINE, chance: 0.08 },
  ],
  [EnemyType.NIGHT_ASTRAL_REALITY_BREAKER]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.9 },
    { rarity: ItemRarity.MYTHIC, chance: 0.4 },
    { rarity: ItemRarity.DIVINE, chance: 0.12 },
  ],

  // -- Shattered Colosseum enemies --
  [EnemyType.SPECTRAL_GLADIATOR]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.1 },
  ],
  [EnemyType.ARENA_BEAST]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.12 },
  ],
  [EnemyType.GHOSTLY_RETIARIUS]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.08 },
  ],
  [EnemyType.CURSED_CHAMPION]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.COLOSSEUM_WARDEN]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.6 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
  ],
  // -- Petrified Garden enemies --
  [EnemyType.STONE_NYMPH]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.12 },
  ],
  [EnemyType.BASILISK_HATCHLING]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
  ],
  [EnemyType.GRANITE_GOLEM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.18 },
    { rarity: ItemRarity.RARE, chance: 0.04 },
  ],
  [EnemyType.PETRIFIED_TREANT]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.03 },
  ],
  [EnemyType.GORGON_MATRIARCH]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.65 },
    { rarity: ItemRarity.RARE, chance: 0.3 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
  ],
  // -- Sunken Citadel enemies --
  [EnemyType.DROWNED_KNIGHT]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.18 },
    { rarity: ItemRarity.RARE, chance: 0.04 },
  ],
  [EnemyType.DEPTH_LURKER]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
  ],
  [EnemyType.TIDAL_PHANTOM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.18 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
  ],
  [EnemyType.CORAL_ABOMINATION]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
  ],
  [EnemyType.ABYSSAL_WARDEN]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.6 },
    { rarity: ItemRarity.RARE, chance: 0.3 },
    { rarity: ItemRarity.EPIC, chance: 0.1 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  // -- Wyrmscar Canyon enemies --
  [EnemyType.CANYON_RAPTOR]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
  ],
  [EnemyType.SCORCH_WYVERN]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
  ],
  [EnemyType.DRAKE_BROODLING]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.12 },
  ],
  [EnemyType.WYRMFIRE_SHAMAN]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
  ],
  [EnemyType.CANYON_WYRMLORD]: [
    { rarity: ItemRarity.RARE, chance: 0.5 },
    { rarity: ItemRarity.EPIC, chance: 0.22 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.06 },
    { rarity: ItemRarity.MYTHIC, chance: 0.012 },
  ],
  // -- Plaguerot Sewers enemies --
  [EnemyType.SEWER_RAT_SWARM]: [
    { rarity: ItemRarity.COMMON, chance: 0.35 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.05 },
  ],
  [EnemyType.PLAGUE_BEARER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
  ],
  [EnemyType.BILE_ELEMENTAL]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.35 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.04 },
  ],
  [EnemyType.AFFLICTED_BRUTE]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.18 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
  ],
  [EnemyType.PESTILENCE_LORD]: [
    { rarity: ItemRarity.RARE, chance: 0.5 },
    { rarity: ItemRarity.EPIC, chance: 0.25 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.08 },
    { rarity: ItemRarity.MYTHIC, chance: 0.015 },
  ],
  // -- Ethereal Sanctum enemies --
  [EnemyType.PHASE_WALKER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
  ],
  [EnemyType.ETHEREAL_SENTINEL]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.18 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.01 },
  ],
  [EnemyType.SPIRIT_WEAVER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.38 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
  ],
  [EnemyType.PLANAR_GUARDIAN]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  [EnemyType.SANCTUM_OVERSEER]: [
    { rarity: ItemRarity.RARE, chance: 0.5 },
    { rarity: ItemRarity.EPIC, chance: 0.3 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.12 },
    { rarity: ItemRarity.MYTHIC, chance: 0.04 },
    { rarity: ItemRarity.DIVINE, chance: 0.01 },
  ],
  // -- Iron Wastes enemies --
  [EnemyType.SCRAP_AUTOMATON]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.04 },
  ],
  [EnemyType.RUST_REVENANT]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.38 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.04 },
  ],
  [EnemyType.SIEGE_CRAWLER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  [EnemyType.WAR_ENGINE_CORE]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.18 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.015 },
  ],
  [EnemyType.IRON_JUGGERNAUT]: [
    { rarity: ItemRarity.RARE, chance: 0.55 },
    { rarity: ItemRarity.EPIC, chance: 0.35 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.15 },
    { rarity: ItemRarity.MYTHIC, chance: 0.05 },
    { rarity: ItemRarity.DIVINE, chance: 0.012 },
  ],
  // -- Blighted Throne enemies --
  [EnemyType.CORRUPTED_ROYAL_GUARD]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  [EnemyType.BLIGHT_COURTIER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.38 },
    { rarity: ItemRarity.RARE, chance: 0.22 },
    { rarity: ItemRarity.EPIC, chance: 0.1 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.025 },
  ],
  [EnemyType.THRONE_REVENANT]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.22 },
    { rarity: ItemRarity.EPIC, chance: 0.1 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.03 },
  ],
  [EnemyType.DARK_HERALD]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.025 },
  ],
  [EnemyType.BLIGHTED_KING]: [
    { rarity: ItemRarity.RARE, chance: 0.6 },
    { rarity: ItemRarity.EPIC, chance: 0.4 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.18 },
    { rarity: ItemRarity.MYTHIC, chance: 0.06 },
    { rarity: ItemRarity.DIVINE, chance: 0.015 },
  ],
  // -- Chrono Labyrinth enemies --
  [EnemyType.TEMPORAL_ECHO]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.02 },
  ],
  [EnemyType.CLOCKWORK_MINOTAUR]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.25 },
    { rarity: ItemRarity.EPIC, chance: 0.12 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.035 },
  ],
  [EnemyType.PARADOX_MAGE]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.38 },
    { rarity: ItemRarity.RARE, chance: 0.22 },
    { rarity: ItemRarity.EPIC, chance: 0.1 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.03 },
  ],
  [EnemyType.TIME_DEVOURER]: [
    { rarity: ItemRarity.RARE, chance: 0.4 },
    { rarity: ItemRarity.EPIC, chance: 0.2 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.06 },
    { rarity: ItemRarity.MYTHIC, chance: 0.015 },
  ],
  [EnemyType.CHRONO_TITAN]: [
    { rarity: ItemRarity.RARE, chance: 0.65 },
    { rarity: ItemRarity.EPIC, chance: 0.45 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.2 },
    { rarity: ItemRarity.MYTHIC, chance: 0.08 },
    { rarity: ItemRarity.DIVINE, chance: 0.02 },
  ],
  // -- Eldritch Nexus enemies --
  [EnemyType.ELDRITCH_TENDRIL]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.22 },
    { rarity: ItemRarity.EPIC, chance: 0.1 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.03 },
  ],
  [EnemyType.MIND_FLAYER]: [
    { rarity: ItemRarity.UNCOMMON, chance: 0.38 },
    { rarity: ItemRarity.RARE, chance: 0.25 },
    { rarity: ItemRarity.EPIC, chance: 0.12 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.04 },
    { rarity: ItemRarity.MYTHIC, chance: 0.01 },
  ],
  [EnemyType.NEXUS_ABERRATION]: [
    { rarity: ItemRarity.RARE, chance: 0.4 },
    { rarity: ItemRarity.EPIC, chance: 0.22 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.08 },
    { rarity: ItemRarity.MYTHIC, chance: 0.02 },
  ],
  [EnemyType.DIMENSIONAL_HORROR]: [
    { rarity: ItemRarity.RARE, chance: 0.48 },
    { rarity: ItemRarity.EPIC, chance: 0.28 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.1 },
    { rarity: ItemRarity.MYTHIC, chance: 0.03 },
  ],
  [EnemyType.ELDRITCH_OVERMIND]: [
    { rarity: ItemRarity.RARE, chance: 0.75 },
    { rarity: ItemRarity.EPIC, chance: 0.55 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.3 },
    { rarity: ItemRarity.MYTHIC, chance: 0.12 },
    { rarity: ItemRarity.DIVINE, chance: 0.04 },
  ],
  // -- Night bosses wave 3 --
  [EnemyType.NIGHT_COLOSSEUM_ETERNAL_CHAMPION]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.35 },
    { rarity: ItemRarity.MYTHIC, chance: 0.06 },
  ],
  [EnemyType.NIGHT_GARDEN_MEDUSA_QUEEN]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.42 },
    { rarity: ItemRarity.MYTHIC, chance: 0.09 },
  ],
  [EnemyType.NIGHT_CITADEL_DROWNED_ADMIRAL]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.48 },
    { rarity: ItemRarity.MYTHIC, chance: 0.11 },
  ],
  [EnemyType.NIGHT_CANYON_ELDER_WYRM]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.55 },
    { rarity: ItemRarity.MYTHIC, chance: 0.14 },
  ],
  [EnemyType.NIGHT_SEWERS_PLAGUE_FATHER]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.58 },
    { rarity: ItemRarity.MYTHIC, chance: 0.15 },
  ],
  [EnemyType.NIGHT_SANCTUM_PLANAR_TYRANT]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.65 },
    { rarity: ItemRarity.MYTHIC, chance: 0.2 },
  ],
  [EnemyType.NIGHT_WASTES_WAR_COLOSSUS]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.7 },
    { rarity: ItemRarity.MYTHIC, chance: 0.22 },
    { rarity: ItemRarity.DIVINE, chance: 0.04 },
  ],
  [EnemyType.NIGHT_THRONE_UNDYING_EMPEROR]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.78 },
    { rarity: ItemRarity.MYTHIC, chance: 0.28 },
    { rarity: ItemRarity.DIVINE, chance: 0.06 },
  ],
  [EnemyType.NIGHT_LABYRINTH_TIME_WEAVER]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.85 },
    { rarity: ItemRarity.MYTHIC, chance: 0.35 },
    { rarity: ItemRarity.DIVINE, chance: 0.1 },
  ],
  [EnemyType.NIGHT_NEXUS_ELDER_BRAIN]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.95 },
    { rarity: ItemRarity.MYTHIC, chance: 0.45 },
    { rarity: ItemRarity.DIVINE, chance: 0.15 },
  ],

  // -- Forest (new) --
  [EnemyType.MOSSY_LURKER]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.12 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.DIRE_STAG]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.WOODLAND_WISP]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.12 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],

  // -- Elven Village (new) --
  [EnemyType.CORRUPTED_SENTINEL]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.GLOOM_ARCHER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.FEY_ABOMINATION]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],

  // -- Necropolis (new) --
  [EnemyType.CRYPT_SHADE]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.BONE_ARCHER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.LICH_ACOLYTE]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],

  // -- Volcanic Wastes (new) --
  [EnemyType.EMBER_FIEND]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],
  [EnemyType.VOLCANIC_SCORPION]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.ASH_WRAITH]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],

  // -- Abyssal Rift (new) --
  [EnemyType.VOID_TENDRIL]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.28 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.025 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.RIFT_SCREAMER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.028 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.DIMENSIONAL_STALKER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],

  // -- Dragon's Sanctum (new) --
  [EnemyType.SCALED_SORCERER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.04 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.01 },
    { rarity: ItemRarity.MYTHIC, chance: 0.002 },
  ],
  [EnemyType.DRAGONSPAWN_BERSERKER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.13 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.012 },
    { rarity: ItemRarity.MYTHIC, chance: 0.002 },
  ],
  [EnemyType.FLAME_HERALD]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.04 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.01 },
    { rarity: ItemRarity.MYTHIC, chance: 0.002 },
  ],

  // -- Desert (new) --
  [EnemyType.DUNE_REAVER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.SANDSTORM_ELEMENTAL]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],
  [EnemyType.OASIS_SERPENT]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],

  // -- Grassland (new) --
  [EnemyType.STEPPE_STALKER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.THUNDER_RAM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.PRAIRIE_WITCH]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],

  // -- Marsh (new) --
  [EnemyType.FEN_CRAWLER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.MIRE_SPECTER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.LEECH_SWARM]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.12 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],

  // -- Crystal Caverns (new) --
  [EnemyType.SHARD_SENTINEL]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.GEODE_BEETLE]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.CRYSTAL_SHADE]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],

  // -- Frozen Tundra (new) --
  [EnemyType.PERMAFROST_SPIDER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.BLIZZARD_PHANTOM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],
  [EnemyType.FROST_TROLL]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],

  // -- Haunted Cathedral (new) --
  [EnemyType.BELL_WRAITH]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],
  [EnemyType.DESECRATED_MONK]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],
  [EnemyType.STAINED_GLASS_GOLEM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],

  // -- Thornwood (new) --
  [EnemyType.BRIAR_WOLF]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.SPORE_MOTH]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.NETTLE_ELEMENTAL]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],

  // -- Clockwork (new) --
  [EnemyType.BRASS_BEETLE]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.PISTON_GOLEM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.ARC_DRONE]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],

  // -- Crimson Citadel (new) --
  [EnemyType.BLOODTHORN_BAT]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],
  [EnemyType.SCARLET_ASSASSIN]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.CRIMSON_SHADE]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],

  // -- Stormspire (new) --
  [EnemyType.GALE_FALCON]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.STATIC_GOLEM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.28 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.025 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.STORM_CALLER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.02 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],

  // -- Shadow Realm (new) --
  [EnemyType.FEAR_CRAWLER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.UMBRAL_ASSASSIN]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.04 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.01 },
    { rarity: ItemRarity.MYTHIC, chance: 0.002 },
  ],
  [EnemyType.VOID_ECHO]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.028 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],

  // -- Primordial Abyss (new) --
  [EnemyType.ENTROPY_WORM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.012 },
    { rarity: ItemRarity.MYTHIC, chance: 0.003 },
  ],
  [EnemyType.GENESIS_SHADE]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.015 },
    { rarity: ItemRarity.MYTHIC, chance: 0.003 },
  ],
  [EnemyType.NULL_SENTINEL]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.015 },
    { rarity: ItemRarity.MYTHIC, chance: 0.003 },
  ],

  // -- Moonlit Grove (new) --
  [EnemyType.THORN_FAIRY]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.12 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.NOCTURNAL_PREDATOR]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.LUNAR_WISP]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.12 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],

  // -- Coral Depths (new) --
  [EnemyType.TIDE_LURKER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.PEARL_GOLEM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.DEEP_SEA_PHANTOM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],

  // -- Ancient Library (new) --
  [EnemyType.QUILL_FIEND]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.PAPER_GOLEM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.RUNE_SPIRIT]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],

  // -- Jade Temple (new) --
  [EnemyType.JADE_VIPER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.TEMPLE_MONK]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],
  [EnemyType.STONE_IDOL_FRAGMENT]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],

  // -- Ashen Battlefield (new) --
  [EnemyType.EMBER_KNIGHT]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.WAR_DRUMMER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.CARRION_SWARM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],

  // -- Fungal Depths (new) --
  [EnemyType.CORDYCEPS_HOST]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.LUMINOUS_JELLY]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.ROT_BORER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],

  // -- Obsidian Fortress (new) --
  [EnemyType.MAGMA_IMP]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.OBSIDIAN_HOUND]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.02 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.SHADOW_INQUISITOR]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.02 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],

  // -- Celestial Ruins (new) --
  [EnemyType.NOVA_SPRITE]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.28 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.025 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.CONSTELLATION_GOLEM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.028 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.GRAVITY_WELL]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.28 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.025 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],

  // -- Infernal Throne (new) --
  [EnemyType.CHAIN_DEVIL]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.04 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.01 },
    { rarity: ItemRarity.MYTHIC, chance: 0.002 },
  ],
  [EnemyType.BRIMSTONE_CRAWLER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.WRATH_SPECTER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.04 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.01 },
    { rarity: ItemRarity.MYTHIC, chance: 0.002 },
  ],

  // -- Astral Void (new) --
  [EnemyType.PARADOX_SHADE]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.015 },
    { rarity: ItemRarity.MYTHIC, chance: 0.003 },
  ],
  [EnemyType.ANTIMATTER_WISP]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.012 },
    { rarity: ItemRarity.MYTHIC, chance: 0.003 },
  ],
  [EnemyType.FRACTURE_BEAST]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.06 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.015 },
    { rarity: ItemRarity.MYTHIC, chance: 0.003 },
  ],

  // -- Shattered Colosseum (new) --
  [EnemyType.LION_SPIRIT]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.PIT_FIGHTER_GHOST]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.MIRMILLO_SPECTER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],

  // -- Petrified Garden (new) --
  [EnemyType.MOSS_BASILISK]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],
  [EnemyType.CALCIFIED_NYMPH]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.01 },
  ],
  [EnemyType.STONE_SERPENT]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],

  // -- Sunken Citadel (new) --
  [EnemyType.BARNACLE_KNIGHT]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.PRESSURE_PHANTOM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.KELP_HORROR]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],

  // -- Wyrmscar Canyon (new) --
  [EnemyType.CLIFF_RAPTOR]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.NEST_GUARDIAN]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.02 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.MAGMA_DRAKE]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.02 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],

  // -- Plaguerot Sewers (new) --
  [EnemyType.BLOAT_RAT]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.06 },
    { rarity: ItemRarity.EPIC, chance: 0.012 },
  ],
  [EnemyType.PESTILENT_SLIME]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],
  [EnemyType.SEWER_HARPY]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.015 },
  ],

  // -- Ethereal Sanctum (new) --
  [EnemyType.ETHER_WISP]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.02 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.SPECTRAL_MONK]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.28 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.025 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.PHASE_SPIDER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.02 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],

  // -- Iron Wastes (new) --
  [EnemyType.JUNK_GOLEM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.028 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.SCRAP_HAWK]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.28 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.025 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.RUST_MITE_SWARM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.25 },
    { rarity: ItemRarity.RARE, chance: 0.08 },
    { rarity: ItemRarity.EPIC, chance: 0.02 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],

  // -- Blighted Throne (new) --
  [EnemyType.PLAGUE_KNIGHT]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.BLIGHTED_NOBLE]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.ROT_JESTER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.1 },
    { rarity: ItemRarity.EPIC, chance: 0.028 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],

  // -- Chrono Labyrinth (new) --
  [EnemyType.PHASE_BEETLE]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.03 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.005 },
  ],
  [EnemyType.TIMELOST_SOLDIER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.04 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.01 },
    { rarity: ItemRarity.MYTHIC, chance: 0.002 },
  ],
  [EnemyType.ENTROPY_WEAVER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.12 },
    { rarity: ItemRarity.EPIC, chance: 0.04 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.01 },
    { rarity: ItemRarity.MYTHIC, chance: 0.002 },
  ],

  // -- Eldritch Nexus (new) --
  [EnemyType.TENTACLE_HORROR]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.15 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.012 },
    { rarity: ItemRarity.MYTHIC, chance: 0.003 },
  ],
  [EnemyType.GIBBERING_MOUTHER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.13 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.012 },
    { rarity: ItemRarity.MYTHIC, chance: 0.002 },
  ],
  [EnemyType.PSYCHIC_LEECH]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.3 },
    { rarity: ItemRarity.RARE, chance: 0.13 },
    { rarity: ItemRarity.EPIC, chance: 0.05 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.012 },
    { rarity: ItemRarity.MYTHIC, chance: 0.002 },
  ],
  // -- City Ruins enemies --
  [EnemyType.RUINS_WATCHMAN]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.FALLEN_SENTINEL]: [
    { rarity: ItemRarity.COMMON, chance: 0.55 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.04 },
    { rarity: ItemRarity.EPIC, chance: 0.005 },
  ],
  [EnemyType.RUBBLE_LURKER]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.12 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.ALLEY_STALKER]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.18 },
    { rarity: ItemRarity.RARE, chance: 0.03 },
  ],
  [EnemyType.RUINED_CAPTAIN]: [
    { rarity: ItemRarity.COMMON, chance: 0.6 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.03 },
    { rarity: ItemRarity.MYTHIC, chance: 0.005 },
  ],
  [EnemyType.COLLAPSED_GOLEM]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.04 },
    { rarity: ItemRarity.EPIC, chance: 0.005 },
  ],
  [EnemyType.GUTTER_RAT_SWARM]: [
    { rarity: ItemRarity.COMMON, chance: 0.4 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.1 },
  ],
  [EnemyType.TOWER_SHADE]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.03 },
  ],
  // -- City enemies --
  [EnemyType.CORRUPT_GUARD]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.18 },
    { rarity: ItemRarity.RARE, chance: 0.03 },
  ],
  [EnemyType.GATE_ENFORCER]: [
    { rarity: ItemRarity.COMMON, chance: 0.55 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.22 },
    { rarity: ItemRarity.RARE, chance: 0.05 },
    { rarity: ItemRarity.EPIC, chance: 0.008 },
  ],
  [EnemyType.ROOFTOP_ARCHER]: [
    { rarity: ItemRarity.COMMON, chance: 0.45 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.15 },
    { rarity: ItemRarity.RARE, chance: 0.03 },
  ],
  [EnemyType.ALLEY_THUG]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.16 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.CITY_WARDEN]: [
    { rarity: ItemRarity.COMMON, chance: 0.6 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.4 },
    { rarity: ItemRarity.RARE, chance: 0.2 },
    { rarity: ItemRarity.EPIC, chance: 0.08 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.03 },
    { rarity: ItemRarity.MYTHIC, chance: 0.005 },
  ],
  [EnemyType.MARKET_BRUTE]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.2 },
    { rarity: ItemRarity.RARE, chance: 0.04 },
  ],
  [EnemyType.SEWER_CREEPER]: [
    { rarity: ItemRarity.COMMON, chance: 0.4 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.12 },
    { rarity: ItemRarity.RARE, chance: 0.02 },
  ],
  [EnemyType.BELL_TOWER_SENTINEL]: [
    { rarity: ItemRarity.COMMON, chance: 0.5 },
    { rarity: ItemRarity.UNCOMMON, chance: 0.18 },
    { rarity: ItemRarity.RARE, chance: 0.03 },
  ],
  // -- Night bosses (city maps) --
  [EnemyType.NIGHT_RUINS_REVENANT_KING]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.5 },
    { rarity: ItemRarity.MYTHIC, chance: 0.1 },
  ],
  [EnemyType.NIGHT_CITY_SHADOW_MAGISTRATE]: [
    { rarity: ItemRarity.EPIC, chance: 1.0 },
    { rarity: ItemRarity.LEGENDARY, chance: 0.5 },
    { rarity: ItemRarity.MYTHIC, chance: 0.1 },
  ],
  // Day bosses (lower loot quality than night bosses)
  [EnemyType.DAY_FOREST_STAG_GUARDIAN]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.3 }, { rarity: ItemRarity.LEGENDARY, chance: 0.05 } ],
  [EnemyType.DAY_ELVEN_CORRUPTED_SENTINEL]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.3 }, { rarity: ItemRarity.LEGENDARY, chance: 0.05 } ],
  [EnemyType.DAY_NECRO_BONE_GOLEM]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.35 }, { rarity: ItemRarity.LEGENDARY, chance: 0.06 } ],
  [EnemyType.DAY_VOLCANIC_EMBER_BRUTE]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.35 }, { rarity: ItemRarity.LEGENDARY, chance: 0.06 } ],
  [EnemyType.DAY_RIFT_VOID_STALKER]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.4 }, { rarity: ItemRarity.LEGENDARY, chance: 0.08 } ],
  [EnemyType.DAY_DRAGON_DRAKE_MATRIARCH]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.4 }, { rarity: ItemRarity.LEGENDARY, chance: 0.1 } ],
  [EnemyType.DAY_DESERT_SAND_GOLEM]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.25 }, { rarity: ItemRarity.LEGENDARY, chance: 0.04 } ],
  [EnemyType.DAY_GRASSLAND_BULL_CHIEFTAIN]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.25 }, { rarity: ItemRarity.LEGENDARY, chance: 0.04 } ],
  [EnemyType.DAY_MARSH_BOG_TROLL]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.3 }, { rarity: ItemRarity.LEGENDARY, chance: 0.05 } ],
  [EnemyType.DAY_CAVERNS_CRYSTAL_SPIDER]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.3 }, { rarity: ItemRarity.LEGENDARY, chance: 0.05 } ],
  [EnemyType.DAY_TUNDRA_FROST_BEAR]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.3 }, { rarity: ItemRarity.LEGENDARY, chance: 0.06 } ],
  [EnemyType.DAY_CATHEDRAL_FALLEN_TEMPLAR]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.3 }, { rarity: ItemRarity.LEGENDARY, chance: 0.05 } ],
  [EnemyType.DAY_THORNWOOD_VINE_COLOSSUS]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.35 }, { rarity: ItemRarity.LEGENDARY, chance: 0.06 } ],
  [EnemyType.DAY_FOUNDRY_BRONZE_SENTINEL]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.35 }, { rarity: ItemRarity.LEGENDARY, chance: 0.06 } ],
  [EnemyType.DAY_CITADEL_BLOODHOUND_ALPHA]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.3 }, { rarity: ItemRarity.LEGENDARY, chance: 0.05 } ],
  [EnemyType.DAY_STORMSPIRE_WIND_ELEMENTAL]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.3 }, { rarity: ItemRarity.LEGENDARY, chance: 0.05 } ],
  [EnemyType.DAY_SHADOW_SHADE_STALKER]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.35 }, { rarity: ItemRarity.LEGENDARY, chance: 0.06 } ],
  [EnemyType.DAY_ABYSS_LESSER_HORROR]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.4 }, { rarity: ItemRarity.LEGENDARY, chance: 0.08 } ],
  [EnemyType.DAY_RUINS_FALLEN_CAPTAIN]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.2 }, { rarity: ItemRarity.LEGENDARY, chance: 0.03 } ],
  [EnemyType.DAY_CITY_CORRUPT_WARDEN]: [ { rarity: ItemRarity.RARE, chance: 1.0 }, { rarity: ItemRarity.EPIC, chance: 0.2 }, { rarity: ItemRarity.LEGENDARY, chance: 0.03 } ],
};

// ---------------------------------------------------------------------------
//  CRAFTING RECIPES
// ---------------------------------------------------------------------------

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'craft_upgrade_common', name: 'Forge Uncommon',
    description: 'Combine 3 Common items into 1 Uncommon item.',
    type: CraftType.UPGRADE_RARITY, cost: 50,
    inputRarity: ItemRarity.COMMON, inputCount: 3,
    outputRarity: ItemRarity.UNCOMMON, successChance: 1.0, materialCost: 5,
  },
  {
    id: 'craft_upgrade_uncommon', name: 'Forge Rare',
    description: 'Combine 3 Uncommon items into 1 Rare item.',
    type: CraftType.UPGRADE_RARITY, cost: 200,
    inputRarity: ItemRarity.UNCOMMON, inputCount: 3,
    outputRarity: ItemRarity.RARE, successChance: 0.8, materialCost: 15,
  },
  {
    id: 'craft_upgrade_rare', name: 'Forge Epic',
    description: 'Combine 3 Rare items into 1 Epic item.',
    type: CraftType.UPGRADE_RARITY, cost: 800,
    inputRarity: ItemRarity.RARE, inputCount: 3,
    outputRarity: ItemRarity.EPIC, successChance: 0.6, materialCost: 30,
  },
  {
    id: 'craft_upgrade_epic', name: 'Forge Legendary',
    description: 'Combine 3 Epic items into 1 Legendary item.',
    type: CraftType.UPGRADE_RARITY, cost: 3000,
    inputRarity: ItemRarity.EPIC, inputCount: 3,
    outputRarity: ItemRarity.LEGENDARY, successChance: 0.4, materialCost: 60,
  },
  {
    id: 'craft_reroll_uncommon', name: 'Reroll Uncommon',
    description: 'Randomize the stats on an Uncommon item.',
    type: CraftType.REROLL_STATS, cost: 50,
    inputRarity: ItemRarity.UNCOMMON, inputCount: 1, successChance: 1.0, materialCost: 3,
  },
  {
    id: 'craft_reroll_rare', name: 'Reroll Rare',
    description: 'Randomize the stats on a Rare item.',
    type: CraftType.REROLL_STATS, cost: 200,
    inputRarity: ItemRarity.RARE, inputCount: 1, successChance: 1.0, materialCost: 10,
  },
  {
    id: 'craft_reroll_epic', name: 'Reroll Epic',
    description: 'Randomize the stats on an Epic item.',
    type: CraftType.REROLL_STATS, cost: 600,
    inputRarity: ItemRarity.EPIC, inputCount: 1, successChance: 1.0, materialCost: 25,
  },
  {
    id: 'craft_reroll_legendary', name: 'Reroll Legendary',
    description: 'Randomize the stats on a Legendary item.',
    type: CraftType.REROLL_STATS, cost: 2000,
    inputRarity: ItemRarity.LEGENDARY, inputCount: 1, successChance: 1.0, materialCost: 50,
  },
];

export const SALVAGE_MATERIAL_YIELDS: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]: 1,
  [ItemRarity.UNCOMMON]: 3,
  [ItemRarity.RARE]: 10,
  [ItemRarity.EPIC]: 25,
  [ItemRarity.LEGENDARY]: 50,
  [ItemRarity.MYTHIC]: 100,
  [ItemRarity.DIVINE]: 200,
};

// ---------------------------------------------------------------------------
//  CRAFTING MATERIALS CONFIG
// ---------------------------------------------------------------------------
export const CRAFTING_MATERIALS: Record<MaterialType, CraftingMaterial> = {
  [MaterialType.IRON_ORE]: { type: MaterialType.IRON_ORE, name: 'Iron Ore', icon: '\u26AB', description: 'Common metal ore used in basic crafting.', rarity: ItemRarity.COMMON },
  [MaterialType.STEEL_INGOT]: { type: MaterialType.STEEL_INGOT, name: 'Steel Ingot', icon: '\u26AA', description: 'Refined steel for quality weapons and armor.', rarity: ItemRarity.UNCOMMON },
  [MaterialType.MITHRIL_SHARD]: { type: MaterialType.MITHRIL_SHARD, name: 'Mithril Shard', icon: '\uD83D\uDD37', description: 'A shard of the legendary mithril metal.', rarity: ItemRarity.RARE },
  [MaterialType.DRAGON_SCALE]: { type: MaterialType.DRAGON_SCALE, name: 'Dragon Scale', icon: '\uD83D\uDC09', description: 'A heat-resistant scale from a powerful dragon.', rarity: ItemRarity.EPIC },
  [MaterialType.ARCANE_DUST]: { type: MaterialType.ARCANE_DUST, name: 'Arcane Dust', icon: '\u2728', description: 'Magical residue from disenchanted items.', rarity: ItemRarity.UNCOMMON },
  [MaterialType.VOID_ESSENCE]: { type: MaterialType.VOID_ESSENCE, name: 'Void Essence', icon: '\uD83C\uDF11', description: 'Dark energy harvested from abyssal creatures.', rarity: ItemRarity.EPIC },
  [MaterialType.CRYSTAL_FRAGMENT]: { type: MaterialType.CRYSTAL_FRAGMENT, name: 'Crystal Fragment', icon: '\uD83D\uDC8E', description: 'A resonating crystal shard from deep caverns.', rarity: ItemRarity.RARE },
  [MaterialType.ENCHANTED_LEATHER]: { type: MaterialType.ENCHANTED_LEATHER, name: 'Enchanted Leather', icon: '\uD83E\uDE76', description: 'Magically treated leather for light armor.', rarity: ItemRarity.UNCOMMON },
  [MaterialType.PHOENIX_FEATHER]: { type: MaterialType.PHOENIX_FEATHER, name: 'Phoenix Feather', icon: '\uD83E\uDEB6', description: 'A feather imbued with regenerative fire.', rarity: ItemRarity.LEGENDARY },
  [MaterialType.SOUL_GEM]: { type: MaterialType.SOUL_GEM, name: 'Soul Gem', icon: '\uD83D\uDC9C', description: 'Contains trapped spiritual energy for powerful enchantments.', rarity: ItemRarity.LEGENDARY },
};

// Material drops from enemy kills (by map)
export const MATERIAL_DROP_TABLE: { mapId: DiabloMapId; drops: { type: MaterialType; chance: number; countMin: number; countMax: number }[] }[] = [
  { mapId: DiabloMapId.FOREST, drops: [{ type: MaterialType.IRON_ORE, chance: 0.3, countMin: 1, countMax: 3 }, { type: MaterialType.ENCHANTED_LEATHER, chance: 0.1, countMin: 1, countMax: 1 }] },
  { mapId: DiabloMapId.ELVEN_VILLAGE, drops: [{ type: MaterialType.ARCANE_DUST, chance: 0.2, countMin: 1, countMax: 2 }, { type: MaterialType.CRYSTAL_FRAGMENT, chance: 0.08, countMin: 1, countMax: 1 }] },
  { mapId: DiabloMapId.NECROPOLIS_DUNGEON, drops: [{ type: MaterialType.SOUL_GEM, chance: 0.03, countMin: 1, countMax: 1 }, { type: MaterialType.IRON_ORE, chance: 0.25, countMin: 1, countMax: 2 }] },
  { mapId: DiabloMapId.VOLCANIC_WASTES, drops: [{ type: MaterialType.DRAGON_SCALE, chance: 0.05, countMin: 1, countMax: 1 }, { type: MaterialType.STEEL_INGOT, chance: 0.15, countMin: 1, countMax: 2 }] },
  { mapId: DiabloMapId.ABYSSAL_RIFT, drops: [{ type: MaterialType.VOID_ESSENCE, chance: 0.08, countMin: 1, countMax: 2 }, { type: MaterialType.SOUL_GEM, chance: 0.04, countMin: 1, countMax: 1 }] },
  { mapId: DiabloMapId.DRAGONS_SANCTUM, drops: [{ type: MaterialType.DRAGON_SCALE, chance: 0.12, countMin: 1, countMax: 2 }, { type: MaterialType.PHOENIX_FEATHER, chance: 0.03, countMin: 1, countMax: 1 }] },
  { mapId: DiabloMapId.CRYSTAL_CAVERNS, drops: [{ type: MaterialType.CRYSTAL_FRAGMENT, chance: 0.2, countMin: 1, countMax: 3 }, { type: MaterialType.MITHRIL_SHARD, chance: 0.08, countMin: 1, countMax: 1 }] },
  { mapId: DiabloMapId.FROZEN_TUNDRA, drops: [{ type: MaterialType.MITHRIL_SHARD, chance: 0.1, countMin: 1, countMax: 2 }, { type: MaterialType.STEEL_INGOT, chance: 0.2, countMin: 1, countMax: 2 }] },
  { mapId: DiabloMapId.CLOCKWORK_FOUNDRY, drops: [{ type: MaterialType.STEEL_INGOT, chance: 0.25, countMin: 2, countMax: 4 }, { type: MaterialType.MITHRIL_SHARD, chance: 0.12, countMin: 1, countMax: 2 }] },
  { mapId: DiabloMapId.CELESTIAL_RUINS, drops: [{ type: MaterialType.PHOENIX_FEATHER, chance: 0.05, countMin: 1, countMax: 1 }, { type: MaterialType.ARCANE_DUST, chance: 0.2, countMin: 2, countMax: 4 }] },
];

// ---------------------------------------------------------------------------
//  ADVANCED CRAFTING RECIPES
// ---------------------------------------------------------------------------
export const ADVANCED_CRAFTING_RECIPES: AdvancedCraftingRecipe[] = [
  // Blacksmith Forge recipes
  {
    id: 'adv_craft_iron_sword', name: 'Forged Iron Sword', description: 'Craft a sturdy iron sword.',
    station: CraftingStationType.BLACKSMITH_FORGE,
    materials: [{ type: MaterialType.IRON_ORE, count: 5 }, { type: MaterialType.STEEL_INGOT, count: 2 }],
    goldCost: 100, salvageCost: 0, outputRarity: ItemRarity.UNCOMMON, outputSlot: ItemSlot.WEAPON,
    successChance: 1.0, levelRequired: 1, isDiscovered: true, icon: '\u2694\uFE0F',
  },
  {
    id: 'adv_craft_iron_helmet', name: 'Forged Iron Helm', description: 'Craft a protective iron helmet.',
    station: CraftingStationType.BLACKSMITH_FORGE,
    materials: [{ type: MaterialType.IRON_ORE, count: 4 }, { type: MaterialType.STEEL_INGOT, count: 1 }],
    goldCost: 80, salvageCost: 0, outputRarity: ItemRarity.UNCOMMON, outputSlot: ItemSlot.HELMET,
    successChance: 1.0, levelRequired: 1, isDiscovered: true, icon: '\u26D1\uFE0F',
  },
  {
    id: 'adv_craft_leather_boots', name: 'Enchanted Leather Boots', description: 'Craft swift enchanted boots.',
    station: CraftingStationType.BLACKSMITH_FORGE,
    materials: [{ type: MaterialType.ENCHANTED_LEATHER, count: 3 }, { type: MaterialType.ARCANE_DUST, count: 2 }],
    goldCost: 120, salvageCost: 0, outputRarity: ItemRarity.RARE, outputSlot: ItemSlot.FEET,
    successChance: 0.9, levelRequired: 3, isDiscovered: true, icon: '\uD83E\uDE74',
  },
  {
    id: 'adv_craft_steel_blade', name: 'Tempered Steel Blade', description: 'A finely tempered blade of quality steel.',
    station: CraftingStationType.BLACKSMITH_FORGE,
    materials: [{ type: MaterialType.STEEL_INGOT, count: 5 }, { type: MaterialType.MITHRIL_SHARD, count: 1 }],
    goldCost: 300, salvageCost: 5, outputRarity: ItemRarity.RARE, outputSlot: ItemSlot.WEAPON,
    successChance: 0.85, levelRequired: 5, isDiscovered: false, icon: '\uD83D\uDDE1\uFE0F',
  },
  {
    id: 'adv_craft_mithril_armor', name: 'Mithril Chainmail', description: 'Light yet incredibly strong mithril armor.',
    station: CraftingStationType.BLACKSMITH_FORGE,
    materials: [{ type: MaterialType.MITHRIL_SHARD, count: 5 }, { type: MaterialType.STEEL_INGOT, count: 3 }, { type: MaterialType.DRAGON_SCALE, count: 1 }],
    goldCost: 1500, salvageCost: 20, outputRarity: ItemRarity.EPIC, outputSlot: ItemSlot.BODY,
    successChance: 0.65, levelRequired: 10, isDiscovered: false, icon: '\uD83D\uDEE1\uFE0F',
  },
  {
    id: 'adv_craft_dragon_gauntlets', name: 'Dragonscale Gauntlets', description: 'Gauntlets forged from dragon scales.',
    station: CraftingStationType.BLACKSMITH_FORGE,
    materials: [{ type: MaterialType.DRAGON_SCALE, count: 4 }, { type: MaterialType.STEEL_INGOT, count: 3 }],
    goldCost: 2000, salvageCost: 30, outputRarity: ItemRarity.EPIC, outputSlot: ItemSlot.GAUNTLETS,
    successChance: 0.6, levelRequired: 12, isDiscovered: false, icon: '\uD83E\uDDE4',
  },
  {
    id: 'adv_craft_phoenix_blade', name: 'Phoenix Flamebrand', description: 'A legendary sword imbued with phoenix fire.',
    station: CraftingStationType.BLACKSMITH_FORGE,
    materials: [{ type: MaterialType.PHOENIX_FEATHER, count: 2 }, { type: MaterialType.DRAGON_SCALE, count: 3 }, { type: MaterialType.MITHRIL_SHARD, count: 5 }],
    goldCost: 5000, salvageCost: 50, outputRarity: ItemRarity.LEGENDARY, outputSlot: ItemSlot.WEAPON,
    successChance: 0.4, levelRequired: 18, isDiscovered: false, icon: '\uD83D\uDD25',
  },

  // Jeweler Bench recipes
  {
    id: 'adv_craft_crystal_ring', name: 'Crystal Focus Ring', description: 'A ring set with a resonating crystal.',
    station: CraftingStationType.JEWELER_BENCH,
    materials: [{ type: MaterialType.CRYSTAL_FRAGMENT, count: 3 }, { type: MaterialType.ARCANE_DUST, count: 2 }],
    goldCost: 200, salvageCost: 5, outputRarity: ItemRarity.RARE, outputSlot: ItemSlot.ACCESSORY_1,
    successChance: 0.9, levelRequired: 3, isDiscovered: false, icon: '\uD83D\uDC8D',
  },
  {
    id: 'adv_craft_void_amulet', name: 'Void Heart Amulet', description: 'An amulet pulsing with abyssal energy.',
    station: CraftingStationType.JEWELER_BENCH,
    materials: [{ type: MaterialType.VOID_ESSENCE, count: 3 }, { type: MaterialType.SOUL_GEM, count: 1 }, { type: MaterialType.CRYSTAL_FRAGMENT, count: 2 }],
    goldCost: 3000, salvageCost: 35, outputRarity: ItemRarity.LEGENDARY, outputSlot: ItemSlot.ACCESSORY_1,
    successChance: 0.35, levelRequired: 15, isDiscovered: false, icon: '\uD83D\uDC9C',
  },

  // Alchemist Table recipes
  {
    id: 'adv_craft_health_potion', name: 'Brew Health Elixir', description: 'Brew a potent healing elixir from magical herbs.',
    station: CraftingStationType.ALCHEMIST_TABLE,
    materials: [{ type: MaterialType.IRON_ORE, count: 1 }, { type: MaterialType.ENCHANTED_LEATHER, count: 1 }],
    goldCost: 30, salvageCost: 0, outputRarity: ItemRarity.COMMON,
    successChance: 1.0, levelRequired: 1, isDiscovered: true, icon: '\u2764\uFE0F',
  },
  {
    id: 'adv_craft_mana_potion', name: 'Brew Mana Elixir', description: 'Brew a potent mana restoration elixir.',
    station: CraftingStationType.ALCHEMIST_TABLE,
    materials: [{ type: MaterialType.ARCANE_DUST, count: 2 }],
    goldCost: 40, salvageCost: 0, outputRarity: ItemRarity.COMMON,
    successChance: 1.0, levelRequired: 1, isDiscovered: true, icon: '\uD83D\uDCA7',
  },
  {
    id: 'adv_craft_phoenix_elixir', name: 'Phoenix Elixir', description: 'An elixir that revives you on death with 50% HP.',
    station: CraftingStationType.ALCHEMIST_TABLE,
    materials: [{ type: MaterialType.PHOENIX_FEATHER, count: 1 }, { type: MaterialType.SOUL_GEM, count: 1 }],
    goldCost: 2000, salvageCost: 25, outputRarity: ItemRarity.LEGENDARY,
    successChance: 0.5, levelRequired: 15, isDiscovered: false, icon: '\uD83E\uDD89',
  },

  // Enchanter Altar recipes
  {
    id: 'adv_craft_enchant_weapon', name: 'Enchant Weapon', description: 'Add a random elemental enchantment to a weapon.',
    station: CraftingStationType.ENCHANTER_ALTAR,
    materials: [{ type: MaterialType.ARCANE_DUST, count: 5 }, { type: MaterialType.CRYSTAL_FRAGMENT, count: 2 }],
    goldCost: 500, salvageCost: 10, outputRarity: ItemRarity.RARE,
    successChance: 0.8, levelRequired: 5, isDiscovered: false, icon: '\u2728',
  },
  {
    id: 'adv_craft_soulforge', name: 'Soulforge Infusion', description: 'Upgrade any item to the next rarity tier using soul energy.',
    station: CraftingStationType.ENCHANTER_ALTAR,
    materials: [{ type: MaterialType.SOUL_GEM, count: 3 }, { type: MaterialType.VOID_ESSENCE, count: 2 }, { type: MaterialType.PHOENIX_FEATHER, count: 1 }],
    goldCost: 8000, salvageCost: 80, outputRarity: ItemRarity.MYTHIC,
    successChance: 0.25, levelRequired: 20, isDiscovered: false, icon: '\uD83D\uDCA0',
  },
];

// ---------------------------------------------------------------------------
//  LEGENDARY EFFECT DEFINITIONS
// ---------------------------------------------------------------------------

export const LEGENDARY_EFFECTS: Record<string, LegendaryEffectDef> = {
  'fireball_split': {
    id: 'fireball_split', name: 'Infernal Cascade',
    description: 'Fireball splits into 3 on impact.',
    triggerType: 'on_skill', procChance: 1.0,
    effect: { aoeRadius: 2, damageType: DamageType.FIRE },
  },
  'whirlwind_pull': {
    id: 'whirlwind_pull', name: 'Gravitational Vortex',
    description: 'Whirlwind pulls enemies inward.',
    triggerType: 'on_skill', procChance: 1.0,
    effect: { aoeRadius: 6 },
  },
  'frozen_nova_on_kill': {
    id: 'frozen_nova_on_kill', name: 'Frozen Death',
    description: 'Killing a frozen enemy triggers Ice Nova.',
    triggerType: 'on_kill', procChance: 1.0,
    effect: { aoeRadius: 5, damageType: DamageType.ICE, statusEffect: StatusEffect.FROZEN, damageMultiplier: 1.5 },
  },
  'chain_lightning_proc': {
    id: 'chain_lightning_proc', name: 'Storm Conduit',
    description: '20% chance on hit to trigger chain lightning.',
    triggerType: 'on_hit', procChance: 0.20,
    effect: { damageMultiplier: 0.8, damageType: DamageType.LIGHTNING, statusEffect: StatusEffect.SHOCKED },
  },
  'life_steal_on_crit': {
    id: 'life_steal_on_crit', name: 'Vampiric Fury',
    description: 'Critical hits heal for 15% of damage dealt.',
    triggerType: 'on_crit', procChance: 1.0,
    effect: { healPercent: 15 },
  },
  'mana_on_kill': {
    id: 'mana_on_kill', name: 'Soul Harvest',
    description: 'Killing enemies restores 8% max mana.',
    triggerType: 'on_kill', procChance: 1.0,
    effect: { manaRestorePercent: 8 },
  },
  'fire_trail': {
    id: 'fire_trail', name: 'Infernal Footsteps',
    description: 'Leave a trail of fire that burns enemies.',
    triggerType: 'passive', procChance: 1.0,
    effect: { damageType: DamageType.FIRE, statusEffect: StatusEffect.BURNING, damageMultiplier: 0.5 },
  },
  'shield_on_hit': {
    id: 'shield_on_hit', name: 'Aegis Reaction',
    description: '10% chance when hit to gain a 200 HP shield for 5s.',
    triggerType: 'on_take_damage', procChance: 0.10,
    effect: { shieldAmount: 200 },
  },
  'speed_on_kill': {
    id: 'speed_on_kill', name: 'Bloodrush',
    description: 'Killing enemies grants 30% speed boost for 3s.',
    triggerType: 'on_kill', procChance: 1.0,
    effect: { speedBoost: 0.3, speedBoostDuration: 3 },
  },
  'explode_on_kill': {
    id: 'explode_on_kill', name: 'Corpse Bomb',
    description: 'Enemies explode on death dealing 50% of their max HP as AoE.',
    triggerType: 'on_kill', procChance: 0.35,
    effect: { aoeRadius: 4, damageMultiplier: 0.5 },
  },
  'bonus_damage_low_hp': {
    id: 'bonus_damage_low_hp', name: 'Berserker\'s Wrath',
    description: 'Deal 40% more damage when below 30% HP.',
    triggerType: 'passive', procChance: 1.0,
    effect: { bonusDamagePercent: 40 },
  },
  'double_strike': {
    id: 'double_strike', name: 'Echo Strike',
    description: '25% chance to strike twice.',
    triggerType: 'on_hit', procChance: 0.25,
    effect: { damageMultiplier: 0.7 },
  },
  'poison_cloud_on_hit': {
    id: 'poison_cloud_on_hit', name: 'Plague Bearer',
    description: '15% chance on hit to create a poison cloud.',
    triggerType: 'on_hit', procChance: 0.15,
    effect: { aoeRadius: 3, damageType: DamageType.POISON, statusEffect: StatusEffect.POISONED, damageMultiplier: 0.6 },
  },
  'holy_retribution': {
    id: 'holy_retribution', name: 'Divine Retribution',
    description: 'When hit, 20% chance to deal holy damage to all nearby enemies.',
    triggerType: 'on_take_damage', procChance: 0.20,
    effect: { aoeRadius: 5, damageType: DamageType.HOLY, damageMultiplier: 1.0 },
  },
  'cooldown_on_kill': {
    id: 'cooldown_on_kill', name: 'Rapid Recharge',
    description: 'Kills reduce all cooldowns by 1 second.',
    triggerType: 'on_kill', procChance: 1.0,
    effect: { cooldownReduction: 1 },
  },
};

// ---------------------------------------------------------------------------
//  RUNEWORD DEFINITIONS
// ---------------------------------------------------------------------------

export const RUNEWORD_DEFS: RunewordDef[] = [
  {
    id: 'spirit',
    name: 'Spirit',
    description: 'A weapon blessed with divine energy.',
    requiredRunes: [RuneType.RUNE_A, RuneType.RUNE_C, RuneType.RUNE_B, RuneType.RUNE_D],
    requiredSlots: [ItemSlot.WEAPON],
    bonusStats: { strength: 15, vitality: 15, critChance: 0.05, manaRegen: 5 },
    specialEffect: '+25% faster cast rate, +2 mana per kill',
    legendaryEffectId: 'mana_on_kill',
  },
  {
    id: 'enigma',
    name: 'Enigma',
    description: 'Grants the wearer teleportation.',
    requiredRunes: [RuneType.RUNE_E, RuneType.RUNE_A, RuneType.RUNE_B],
    requiredSlots: [ItemSlot.BODY],
    bonusStats: { strength: 20, armor: 50, moveSpeed: 0.15 },
    specialEffect: '+15% movement speed, +50 defense, teleport on dodge',
    legendaryEffectId: 'speed_on_kill',
  },
  {
    id: 'insight',
    name: 'Insight',
    description: 'Deep meditation enhances mana recovery.',
    requiredRunes: [RuneType.RUNE_B, RuneType.RUNE_A, RuneType.RUNE_D, RuneType.RUNE_C],
    requiredSlots: [ItemSlot.WEAPON],
    bonusStats: { intelligence: 20, manaRegen: 10, bonusMana: 50 },
    specialEffect: 'Massive mana regeneration, +50 max mana',
    legendaryEffectId: 'mana_on_kill',
  },
  {
    id: 'fury',
    name: 'Fury',
    description: 'Unbridled rage made manifest.',
    requiredRunes: [RuneType.RUNE_E, RuneType.RUNE_D, RuneType.RUNE_A],
    requiredSlots: [ItemSlot.WEAPON],
    bonusStats: { strength: 30, attackSpeed: 0.2, critDamage: 0.5, bonusDamage: 20 },
    specialEffect: '+20% attack speed, +50% crit damage',
    legendaryEffectId: 'double_strike',
  },
  {
    id: 'fortitude',
    name: 'Fortitude',
    description: 'An impenetrable bulwark.',
    requiredRunes: [RuneType.RUNE_C, RuneType.RUNE_B, RuneType.RUNE_E],
    requiredSlots: [ItemSlot.BODY],
    bonusStats: { vitality: 30, armor: 80, bonusHealth: 100 },
    specialEffect: '+100 max HP, +80 armor, damage reduction',
    legendaryEffectId: 'shield_on_hit',
  },
  {
    id: 'infinity',
    name: 'Infinity',
    description: 'Conviction aura pierces all resistances.',
    requiredRunes: [RuneType.RUNE_D, RuneType.RUNE_E, RuneType.RUNE_A, RuneType.RUNE_B],
    requiredSlots: [ItemSlot.WEAPON],
    bonusStats: { intelligence: 25, bonusDamage: 30, critChance: 0.08 },
    specialEffect: 'Enemies take 20% more damage, chain lightning on hit',
    legendaryEffectId: 'chain_lightning_proc',
  },
  {
    id: 'bramble',
    name: 'Bramble',
    description: 'Thorns of vengeance.',
    requiredRunes: [RuneType.RUNE_B, RuneType.RUNE_D, RuneType.RUNE_C],
    requiredSlots: [ItemSlot.BODY],
    bonusStats: { armor: 40, vitality: 15, poisonResist: 30 },
    specialEffect: 'Enemies that hit you take poison damage',
    legendaryEffectId: 'poison_cloud_on_hit',
  },
  {
    id: 'grief',
    name: 'Grief',
    description: 'Pure, distilled damage.',
    requiredRunes: [RuneType.RUNE_E, RuneType.RUNE_A, RuneType.RUNE_D],
    requiredSlots: [ItemSlot.WEAPON],
    bonusStats: { strength: 20, dexterity: 20, bonusDamage: 40, attackSpeed: 0.15 },
    specialEffect: '+40 flat damage, ignore target armor',
    legendaryEffectId: 'explode_on_kill',
  },
];
