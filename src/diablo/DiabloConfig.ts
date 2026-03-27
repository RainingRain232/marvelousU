import {
  DiabloItem,
  ItemRarity,
  ItemType,
  EnemyType,
  DiabloMapId,
  VendorType,
  DiabloPotion,
  PotionType,
  DiabloQuest,
  QuestType,
  TimeOfDay,
  DiabloPetDef,
  PetSpecies,
  PetType,
  Achievement,
  CosmeticItem,
} from './DiabloTypes';

import { ITEM_DATABASE } from './DiabloConfigItems';

// Re-export split modules so existing imports keep working
export * from "./DiabloConfigSkills";
export * from "./DiabloConfigEnemies";
export * from "./DiabloConfigItems";
export * from "./DiabloConfigMaps";

// ---------------------------------------------------------------------------
//  7. RARITY NAMES
// ---------------------------------------------------------------------------

export const RARITY_NAMES: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: 'Common',
  [ItemRarity.UNCOMMON]: 'Uncommon',
  [ItemRarity.RARE]: 'Rare',
  [ItemRarity.EPIC]: 'Epic',
  [ItemRarity.LEGENDARY]: 'Legendary',
  [ItemRarity.MYTHIC]: 'Mythic',
  [ItemRarity.DIVINE]: 'Divine',
};

// ---------------------------------------------------------------------------
//  9. XP TABLE (levels 1-50)
// ---------------------------------------------------------------------------

export const XP_TABLE: number[] = [
  0,      // Level 1 (starting level, no XP needed)
  100,    // Level 2
  250,    // Level 3
  450,    // Level 4
  700,    // Level 5
  1050,   // Level 6
  1500,   // Level 7
  2100,   // Level 8
  2850,   // Level 9
  3800,   // Level 10
  5000,   // Level 11
  6500,   // Level 12
  8300,   // Level 13
  10500,  // Level 14
  13200,  // Level 15
  16500,  // Level 16
  20500,  // Level 17
  25200,  // Level 18
  30800,  // Level 19
  37500,  // Level 20
  45500,  // Level 21
  55000,  // Level 22
  66000,  // Level 23
  79000,  // Level 24
  94000,  // Level 25
  112000, // Level 26
  133000, // Level 27
  158000, // Level 28
  187000, // Level 29
  220000, // Level 30
  260000, // Level 31
  305000, // Level 32
  358000, // Level 33
  420000, // Level 34
  490000, // Level 35
  570000, // Level 36
  660000, // Level 37
  765000, // Level 38
  880000, // Level 39
  1010000, // Level 40
  1160000, // Level 41
  1330000, // Level 42
  1520000, // Level 43
  1740000, // Level 44
  1990000, // Level 45
  2270000, // Level 46
  2590000, // Level 47
  2960000, // Level 48
  3380000, // Level 49
  3860000, // Level 50
];

// ---------------------------------------------------------------------------
//  VENDOR DEFINITIONS
// ---------------------------------------------------------------------------

export const VENDOR_DEFS: { type: VendorType; name: string; icon: string; x: number; z: number; description: string }[] = [
  { type: VendorType.BLACKSMITH, name: "Godric the Blacksmith", icon: "⚒️", x: -15, z: -10, description: "Weapons and heavy armor" },
  { type: VendorType.ARCANIST, name: "Morgana the Arcanist", icon: "🔮", x: 15, z: -10, description: "Staves, wands, and enchanted robes" },
  { type: VendorType.ALCHEMIST, name: "Brother Aldric", icon: "⚗️", x: -15, z: 12, description: "Potions, rings, and amulets" },
  { type: VendorType.JEWELER, name: "Elara Gemwright", icon: "💎", x: 15, z: 12, description: "Accessories and rare gems" },
  { type: VendorType.GENERAL_MERCHANT, name: "Old Tom", icon: "🏪", x: 0, z: -20, description: "A bit of everything" },
];

export function generateVendorInventory(type: VendorType, playerLevel: number): DiabloItem[] {
  const items: DiabloItem[] = [];
  const db = ITEM_DATABASE;

  // Filter items by vendor type and add appropriate ones
  const typeFilters: Record<VendorType, ItemType[]> = {
    [VendorType.BLACKSMITH]: [ItemType.SWORD, ItemType.AXE, ItemType.MACE, ItemType.DAGGER, ItemType.SHIELD, ItemType.CHEST_ARMOR, ItemType.LEG_ARMOR, ItemType.HELMET, ItemType.GAUNTLETS, ItemType.BOOTS],
    [VendorType.ARCANIST]: [ItemType.STAFF, ItemType.WAND, ItemType.CHEST_ARMOR],
    [VendorType.ALCHEMIST]: [ItemType.RING, ItemType.AMULET, ItemType.NECKLACE],
    [VendorType.JEWELER]: [ItemType.RING, ItemType.AMULET, ItemType.NECKLACE],
    [VendorType.GENERAL_MERCHANT]: [ItemType.SWORD, ItemType.BOW, ItemType.STAFF, ItemType.CHEST_ARMOR, ItemType.BOOTS, ItemType.HELMET, ItemType.LANTERN],
  };

  const allowedTypes = typeFilters[type];
  const maxRarity = playerLevel < 5 ? ItemRarity.UNCOMMON
    : playerLevel < 10 ? ItemRarity.RARE
    : playerLevel < 20 ? ItemRarity.EPIC
    : playerLevel < 30 ? ItemRarity.LEGENDARY
    : ItemRarity.MYTHIC;

  const rarityOrder = [ItemRarity.COMMON, ItemRarity.UNCOMMON, ItemRarity.RARE, ItemRarity.EPIC, ItemRarity.LEGENDARY, ItemRarity.MYTHIC, ItemRarity.DIVINE];
  const maxIdx = rarityOrder.indexOf(maxRarity);

  const eligible = db.filter(item =>
    allowedTypes.includes(item.type) &&
    rarityOrder.indexOf(item.rarity) <= maxIdx &&
    item.level <= playerLevel + 5
  );

  // Pick 8-12 random items
  const count = 8 + Math.floor(Math.random() * 5);
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    items.push({ ...shuffled[i], id: `vendor_${type}_${i}` });
  }

  return items;
}

// Generate a small, cheap inventory for the portal NPC (very minor items)
export function generatePortalNpcInventory(playerLevel: number): DiabloItem[] {
  const items: DiabloItem[] = [];
  const db = ITEM_DATABASE;

  // Only common and uncommon items, low level
  const allowedTypes = [ItemType.SWORD, ItemType.DAGGER, ItemType.BOW, ItemType.BOOTS, ItemType.HELMET, ItemType.CHEST_ARMOR, ItemType.RING];
  const eligible = db.filter(item =>
    allowedTypes.includes(item.type) &&
    item.rarity === ItemRarity.COMMON &&
    item.level <= Math.max(1, playerLevel - 2)
  );

  // Pick 3-5 cheap items
  const count = 3 + Math.floor(Math.random() * 3);
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const item = { ...shuffled[i], id: `portal_npc_${i}` };
    // Halve the price — he's a humble peddler
    item.value = Math.max(1, Math.floor(item.value * 0.5));
    items.push(item);
  }

  return items;
}

// ---------------------------------------------------------------------------
//  POTION DEFINITIONS
// ---------------------------------------------------------------------------

export const POTION_DATABASE: DiabloPotion[] = [
  { id: 'pot_hp_s', name: 'Small HP Potion', icon: '\u{1F9EA}', type: PotionType.HEALTH, value: 100, cooldown: 5, cost: 25 },
  { id: 'pot_hp_m', name: 'Medium HP Potion', icon: '\u{1F9EA}', type: PotionType.HEALTH, value: 250, cooldown: 5, cost: 75 },
  { id: 'pot_hp_l', name: 'Large HP Potion', icon: '\u{1F9EA}', type: PotionType.HEALTH, value: 500, cooldown: 5, cost: 200 },
  { id: 'pot_mp_s', name: 'Small Mana Potion', icon: '\u{1FAE7}', type: PotionType.MANA, value: 80, cooldown: 5, cost: 20 },
  { id: 'pot_mp_m', name: 'Medium Mana Potion', icon: '\u{1FAE7}', type: PotionType.MANA, value: 200, cooldown: 5, cost: 60 },
  { id: 'pot_mp_l', name: 'Large Mana Potion', icon: '\u{1FAE7}', type: PotionType.MANA, value: 400, cooldown: 5, cost: 150 },
  { id: 'pot_rejuv', name: 'Rejuvenation Potion', icon: '\u{1F49C}', type: PotionType.REJUVENATION, value: 200, cooldown: 5, cost: 120 },
  { id: 'pot_str', name: 'Elixir of Strength', icon: '\u{1F4AA}', type: PotionType.STRENGTH, value: 20, duration: 30, cooldown: 5, cost: 150 },
  { id: 'pot_spd', name: 'Elixir of Speed', icon: '\u{1F4A8}', type: PotionType.SPEED, value: 30, duration: 20, cooldown: 5, cost: 130 },
];

// Potions that enemies can drop (health & mana only, minor/medium/high tiers)
export const POTION_DROP_POOL: DiabloPotion[] = [
  { id: 'drop_hp_minor', name: 'Minor HP Potion', icon: '\u{1F9EA}', type: PotionType.HEALTH, value: 50, cooldown: 5, cost: 0 },
  { id: 'drop_hp_medium', name: 'Medium HP Potion', icon: '\u{1F9EA}', type: PotionType.HEALTH, value: 100, cooldown: 5, cost: 0 },
  { id: 'drop_hp_high', name: 'High HP Potion', icon: '\u{1F9EA}', type: PotionType.HEALTH, value: 200, cooldown: 5, cost: 0 },
  { id: 'drop_mp_minor', name: 'Minor Mana Potion', icon: '\u{1FAE7}', type: PotionType.MANA, value: 50, cooldown: 5, cost: 0 },
  { id: 'drop_mp_medium', name: 'Medium Mana Potion', icon: '\u{1FAE7}', type: PotionType.MANA, value: 100, cooldown: 5, cost: 0 },
  { id: 'drop_mp_high', name: 'High Mana Potion', icon: '\u{1FAE7}', type: PotionType.MANA, value: 200, cooldown: 5, cost: 0 },
];

// ---------------------------------------------------------------------------
//  QUEST DATABASE
// ---------------------------------------------------------------------------

export const QUEST_DATABASE: Omit<DiabloQuest, 'progress' | 'isComplete' | 'isActive'>[] = [
  // Beginner quests
  {
    id: 'q_wolf_hunter', name: 'Wolf Hunter', description: 'Thin the wolf packs in Darkwood Forest.',
    type: QuestType.KILL_SPECIFIC, target: { enemyType: EnemyType.WOLF }, required: 10,
    rewards: { gold: 100, xp: 200 },
  },
  {
    id: 'q_desert_sweep', name: 'Desert Sweep', description: 'Clear out the creatures of Sunscorch Desert.',
    type: QuestType.KILL_COUNT, target: { mapId: DiabloMapId.SUNSCORCH_DESERT }, required: 15, mapId: DiabloMapId.SUNSCORCH_DESERT,
    rewards: { gold: 150, xp: 300 },
  },
  {
    id: 'q_grassland_patrol', name: 'Grassland Patrol', description: 'Eliminate raiders and beasts roaming the Emerald Grasslands.',
    type: QuestType.KILL_COUNT, target: { mapId: DiabloMapId.EMERALD_GRASSLANDS }, required: 15, mapId: DiabloMapId.EMERALD_GRASSLANDS,
    rewards: { gold: 150, xp: 300 },
  },
  {
    id: 'q_ruins_patrol', name: 'Ruins Patrol', description: 'Clear the corrupted guards from the City Ruins.',
    type: QuestType.KILL_COUNT, target: { mapId: DiabloMapId.CITY_RUINS }, required: 15, mapId: DiabloMapId.CITY_RUINS,
    rewards: { gold: 150, xp: 300 },
  },
  {
    id: 'q_city_liberation', name: 'Liberate Thornwall', description: 'Break the corrupt garrison\'s hold on the City of Thornwall.',
    type: QuestType.KILL_COUNT, target: { mapId: DiabloMapId.CITY }, required: 15, mapId: DiabloMapId.CITY,
    rewards: { gold: 175, xp: 350 },
  },
  {
    id: 'q_spider_slayer', name: 'Spider Slayer', description: 'Kill venomous spiders lurking in the forest.',
    type: QuestType.KILL_SPECIFIC, target: { enemyType: EnemyType.FOREST_SPIDER }, required: 8,
    rewards: { gold: 80, xp: 150 },
  },
  {
    id: 'q_bandit_bounty', name: 'Bandit Bounty', description: 'Bring justice to the forest bandits.',
    type: QuestType.KILL_SPECIFIC, target: { enemyType: EnemyType.BANDIT }, required: 12,
    rewards: { gold: 120, xp: 250 },
  },
  {
    id: 'q_treasure_seeker', name: 'Treasure Seeker', description: 'Open treasure chests found throughout the lands.',
    type: QuestType.TREASURE_HUNT, target: {}, required: 5,
    rewards: { gold: 200, xp: 300, itemRarity: ItemRarity.UNCOMMON },
  },
  {
    id: 'q_gold_hoarder', name: 'Gold Hoarder', description: 'Accumulate gold from your adventures.',
    type: QuestType.COLLECT_GOLD, target: {}, required: 500,
    rewards: { gold: 250, xp: 400 },
  },
  // Intermediate quests
  {
    id: 'q_forest_clear', name: 'Forest Purge', description: 'Clear the Darkwood Forest of all threats.',
    type: QuestType.CLEAR_MAP, target: { mapId: DiabloMapId.FOREST }, required: 1, mapId: DiabloMapId.FOREST,
    rewards: { gold: 300, xp: 600, itemRarity: ItemRarity.RARE },
  },
  {
    id: 'q_elven_liberation', name: 'Elven Liberation', description: 'Free Aelindor from the corruption that plagues it.',
    type: QuestType.CLEAR_MAP, target: { mapId: DiabloMapId.ELVEN_VILLAGE }, required: 1, mapId: DiabloMapId.ELVEN_VILLAGE,
    rewards: { gold: 400, xp: 800, itemRarity: ItemRarity.RARE },
  },
  {
    id: 'q_necropolis_purge', name: 'Necropolis Purge', description: 'Descend into the Necropolis and destroy the undead menace.',
    type: QuestType.CLEAR_MAP, target: { mapId: DiabloMapId.NECROPOLIS_DUNGEON }, required: 1, mapId: DiabloMapId.NECROPOLIS_DUNGEON,
    rewards: { gold: 500, xp: 1000, itemRarity: ItemRarity.RARE },
  },
  {
    id: 'q_night_stalker', name: 'Night Stalker', description: 'Slay any night boss that haunts the darkness.',
    type: QuestType.NIGHT_BOSS, target: { timeOfDay: TimeOfDay.NIGHT }, required: 1,
    rewards: { gold: 800, xp: 1500, itemRarity: ItemRarity.EPIC },
  },
  {
    id: 'q_skeleton_crusher', name: 'Skeleton Crusher', description: 'Destroy skeleton warriors in the Necropolis.',
    type: QuestType.KILL_SPECIFIC, target: { enemyType: EnemyType.SKELETON_WARRIOR }, required: 20,
    rewards: { gold: 250, xp: 500 },
  },
  {
    id: 'q_chest_master', name: 'Chest Master', description: 'Open treasure chests across all lands.',
    type: QuestType.TREASURE_HUNT, target: {}, required: 15,
    rewards: { gold: 500, xp: 800, itemRarity: ItemRarity.RARE },
  },
  {
    id: 'q_volcanic_expedition', name: 'Volcanic Expedition', description: 'Survive the Volcanic Wastes and clear the map.',
    type: QuestType.CLEAR_MAP, target: { mapId: DiabloMapId.VOLCANIC_WASTES }, required: 1, mapId: DiabloMapId.VOLCANIC_WASTES,
    rewards: { gold: 800, xp: 2000, itemRarity: ItemRarity.EPIC },
  },
  {
    id: 'q_fire_imp_hunt', name: 'Imp Extermination', description: 'Hunt fire imps in the Volcanic Wastes.',
    type: QuestType.KILL_SPECIFIC, target: { enemyType: EnemyType.FIRE_IMP }, required: 15,
    rewards: { gold: 350, xp: 700 },
  },
  // Advanced quests
  {
    id: 'q_abyssal_conqueror', name: 'Abyssal Conqueror', description: 'Seal the Abyssal Rift by clearing its horrors.',
    type: QuestType.CLEAR_MAP, target: { mapId: DiabloMapId.ABYSSAL_RIFT }, required: 1, mapId: DiabloMapId.ABYSSAL_RIFT,
    rewards: { gold: 1200, xp: 3000, itemRarity: ItemRarity.EPIC },
  },
  {
    id: 'q_dragon_slayer', name: 'Dragon Slayer', description: 'Kill bosses in the Dragon\'s Sanctum.',
    type: QuestType.BOSS_KILL, target: { mapId: DiabloMapId.DRAGONS_SANCTUM }, required: 5, mapId: DiabloMapId.DRAGONS_SANCTUM,
    rewards: { gold: 2000, xp: 3000, itemRarity: ItemRarity.EPIC },
  },
  {
    id: 'q_sanctum_clear', name: 'Sanctum Purified', description: 'Clear the Dragon\'s Sanctum of all dragonkin.',
    type: QuestType.CLEAR_MAP, target: { mapId: DiabloMapId.DRAGONS_SANCTUM }, required: 1, mapId: DiabloMapId.DRAGONS_SANCTUM,
    rewards: { gold: 2000, xp: 5000, itemRarity: ItemRarity.LEGENDARY },
  },
  {
    id: 'q_night_terror', name: 'Night Terror', description: 'Defeat 3 different night bosses.',
    type: QuestType.NIGHT_BOSS, target: { timeOfDay: TimeOfDay.NIGHT }, required: 3,
    rewards: { gold: 2000, xp: 4000, itemRarity: ItemRarity.LEGENDARY },
  },
  {
    id: 'q_fortune_seeker', name: 'Fortune Seeker', description: 'Amass a great fortune.',
    type: QuestType.COLLECT_GOLD, target: {}, required: 5000,
    rewards: { gold: 2500, xp: 3000, itemRarity: ItemRarity.EPIC },
  },
  {
    id: 'q_completionist', name: 'Completionist', description: 'Clear every combat map at least once.',
    type: QuestType.CLEAR_MAP, target: {}, required: 18,
    rewards: { gold: 5000, xp: 10000, itemRarity: ItemRarity.LEGENDARY },
  },
  {
    id: 'q_void_hunter', name: 'Void Hunter', description: 'Kill void stalkers in the Abyssal Rift.',
    type: QuestType.KILL_SPECIFIC, target: { enemyType: EnemyType.VOID_STALKER }, required: 20,
    rewards: { gold: 600, xp: 1200, itemRarity: ItemRarity.RARE },
  },
  {
    id: 'q_dragonkin_purge', name: 'Dragonkin Purge', description: 'Slay dragonkin warriors in the Sanctum.',
    type: QuestType.KILL_SPECIFIC, target: { enemyType: EnemyType.DRAGONKIN_WARRIOR }, required: 15,
    rewards: { gold: 800, xp: 1500, itemRarity: ItemRarity.EPIC },
  },
];

// ---------------------------------------------------------------------------
//  LEGACY LEGENDARY SPECIAL EFFECTS (superseded by LEGENDARY_EFFECTS at end of file)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
//  ELEMENTAL REACTIONS
// ---------------------------------------------------------------------------
export const ELEMENTAL_REACTIONS: { elements: [string, string]; result: string; damage: number; radius: number; duration: number; description: string }[] = [
  { elements: ['BURNING', 'FROZEN'], result: 'STEAM_CLOUD', damage: 30, radius: 4, duration: 3, description: 'Steam cloud: blinds enemies, reducing accuracy' },
  { elements: ['SHOCKED', 'FROZEN'], result: 'CHAIN_BURST', damage: 60, radius: 5, duration: 0, description: 'Chain burst: shatters frozen targets for AOE damage' },
  { elements: ['POISONED', 'BURNING'], result: 'TOXIC_EXPLOSION', damage: 80, radius: 6, duration: 0, description: 'Toxic explosion: massive AOE poison+fire damage' },
  { elements: ['FROZEN', 'PHYSICAL'], result: 'SHATTER', damage: 100, radius: 3, duration: 0, description: 'Shatter: bonus damage to frozen targets' },
  { elements: ['SHOCKED', 'BURNING'], result: 'OVERLOAD', damage: 70, radius: 5, duration: 0, description: 'Overload: lightning+fire explosion' },
  { elements: ['FROZEN', 'POISONED'], result: 'FROSTBITE', damage: 40, radius: 3, duration: 5, description: 'Frostbite: lingering cold poison DOT' },
];

// ---------------------------------------------------------------------------
//  PARAGON LEVEL XP TABLE
// ---------------------------------------------------------------------------
export const PARAGON_XP_TABLE: number[] = [];
for (let i = 0; i < 500; i++) {
  PARAGON_XP_TABLE.push(Math.floor(1000 * Math.pow(1.08, i)));
}

// ---------------------------------------------------------------------------
//  PET DEFINITIONS
// ---------------------------------------------------------------------------
export const PET_XP_TABLE: number[] = [];
for (let i = 0; i < 50; i++) {
  PET_XP_TABLE.push(Math.floor(80 * Math.pow(1.12, i)));
}

export const PET_DEFS: Record<PetSpecies, DiabloPetDef> = {
  [PetSpecies.WOLF_PUP]: {
    species: PetSpecies.WOLF_PUP,
    name: 'Wolf Pup',
    petType: PetType.COMBAT,
    icon: '\uD83D\uDC3A',
    description: 'A fierce young wolf that fights by your side. Fast and aggressive.',
    baseHp: 80, baseDamage: 12, baseArmor: 5, moveSpeed: 6.5,
    attackRange: 2, attackSpeed: 1.2, aggroRange: 12,
    hpPerLevel: 15, damagePerLevel: 3, armorPerLevel: 1,
    abilities: [
      { id: 'wolf_bite', name: 'Savage Bite', description: 'A vicious bite that deals 200% damage.', cooldown: 8, damageMultiplier: 2.0, icon: '\uD83E\uDDB7', unlocksAtLevel: 1 },
      { id: 'wolf_howl', name: 'Battle Howl', description: 'Howls to boost owner damage by 15% for 10s.', cooldown: 25, buffType: 'damage', buffDuration: 10, icon: '\uD83C\uDF19', unlocksAtLevel: 5 },
      { id: 'wolf_pack', name: 'Pack Frenzy', description: 'Attack speed doubled for 8s.', cooldown: 30, buffType: 'attackSpeed', buffDuration: 8, icon: '\u26A1', unlocksAtLevel: 10 },
    ],
  },
  [PetSpecies.FIRE_SPRITE]: {
    species: PetSpecies.FIRE_SPRITE,
    name: 'Fire Sprite',
    petType: PetType.COMBAT,
    icon: '\uD83D\uDD25',
    description: 'A tiny fire elemental that hurls flames at enemies.',
    baseHp: 50, baseDamage: 18, baseArmor: 2, moveSpeed: 5.5,
    attackRange: 10, attackSpeed: 0.8, aggroRange: 14,
    hpPerLevel: 10, damagePerLevel: 4, armorPerLevel: 0.5,
    abilities: [
      { id: 'fire_burst', name: 'Fire Burst', description: 'Explodes in a ring of fire dealing AOE damage.', cooldown: 12, damageMultiplier: 2.5, icon: '\uD83D\uDCA5', unlocksAtLevel: 1 },
      { id: 'fire_shield', name: 'Ember Shield', description: 'Grants owner fire resistance for 15s.', cooldown: 30, buffType: 'fireResist', buffDuration: 15, icon: '\uD83D\uDEE1\uFE0F', unlocksAtLevel: 5 },
      { id: 'fire_rain', name: 'Meteor Shower', description: 'Calls down small meteors for 5s.', cooldown: 40, damageMultiplier: 3.0, icon: '\u2604\uFE0F', unlocksAtLevel: 12 },
    ],
  },
  [PetSpecies.SHADOW_HOUND]: {
    species: PetSpecies.SHADOW_HOUND,
    name: 'Shadow Hound',
    petType: PetType.COMBAT,
    icon: '\uD83D\uDC3E',
    description: 'A spectral hound from the Shadow Realm. Inflicts fear and bleeding.',
    baseHp: 100, baseDamage: 15, baseArmor: 8, moveSpeed: 7.0,
    attackRange: 2.5, attackSpeed: 1.0, aggroRange: 15,
    hpPerLevel: 18, damagePerLevel: 3.5, armorPerLevel: 1.5,
    abilities: [
      { id: 'shadow_bite', name: 'Shadow Rend', description: 'Tears at the target, causing bleeding for 5s.', cooldown: 10, damageMultiplier: 1.8, icon: '\uD83C\uDF11', unlocksAtLevel: 1 },
      { id: 'shadow_phase', name: 'Phase Shift', description: 'Becomes invulnerable for 3s.', cooldown: 20, buffType: 'invuln', buffDuration: 3, icon: '\uD83D\uDC7B', unlocksAtLevel: 7 },
      { id: 'shadow_howl', name: 'Terrifying Howl', description: 'Fears nearby enemies for 4s.', cooldown: 25, buffType: 'fear', buffDuration: 4, icon: '\uD83D\uDE31', unlocksAtLevel: 12 },
    ],
  },
  [PetSpecies.STORM_FALCON]: {
    species: PetSpecies.STORM_FALCON,
    name: 'Storm Falcon',
    petType: PetType.COMBAT,
    icon: '\uD83E\uDD85',
    description: 'An electrified raptor that strikes with lightning speed from above.',
    baseHp: 60, baseDamage: 20, baseArmor: 3, moveSpeed: 8.0,
    attackRange: 8, attackSpeed: 1.5, aggroRange: 18,
    hpPerLevel: 8, damagePerLevel: 5, armorPerLevel: 0.5,
    abilities: [
      { id: 'falcon_dive', name: 'Thunder Dive', description: 'Dives at an enemy with a lightning strike.', cooldown: 8, damageMultiplier: 2.5, icon: '\u26A1', unlocksAtLevel: 1 },
      { id: 'falcon_gust', name: 'Wing Gust', description: 'Knocks back nearby enemies.', cooldown: 15, damageMultiplier: 1.0, icon: '\uD83D\uDCA8', unlocksAtLevel: 6 },
      { id: 'falcon_storm', name: 'Chain Storm', description: 'Lightning chains between up to 4 enemies.', cooldown: 25, damageMultiplier: 2.0, icon: '\u26C8\uFE0F', unlocksAtLevel: 10 },
    ],
  },
  [PetSpecies.BONE_MINION]: {
    species: PetSpecies.BONE_MINION,
    name: 'Bone Minion',
    petType: PetType.COMBAT,
    icon: '\uD83D\uDC80',
    description: 'A skeletal servant that absorbs hits and retaliates.',
    baseHp: 150, baseDamage: 8, baseArmor: 15, moveSpeed: 4.0,
    attackRange: 2, attackSpeed: 0.7, aggroRange: 10,
    hpPerLevel: 25, damagePerLevel: 2, armorPerLevel: 3,
    abilities: [
      { id: 'bone_shield', name: 'Bone Barrier', description: 'Absorbs 50% of damage for owner for 6s.', cooldown: 20, buffType: 'absorb', buffDuration: 6, icon: '\uD83E\uDDB4', unlocksAtLevel: 1 },
      { id: 'bone_explode', name: 'Bone Explosion', description: 'Sacrifices HP to deal massive AOE.', cooldown: 30, damageMultiplier: 4.0, icon: '\uD83D\uDCA3', unlocksAtLevel: 8 },
      { id: 'bone_regen', name: 'Unholy Regen', description: 'Regenerates 30% max HP over 10s.', cooldown: 25, healAmount: 0.3, icon: '\uD83D\uDC9A', unlocksAtLevel: 5 },
    ],
  },
  [PetSpecies.TREASURE_IMP]: {
    species: PetSpecies.TREASURE_IMP,
    name: 'Treasure Imp',
    petType: PetType.LOOT,
    icon: '\uD83D\uDC7F',
    description: 'A greedy little imp that collects gold and loot automatically.',
    baseHp: 40, baseDamage: 3, baseArmor: 2, moveSpeed: 7.0,
    attackRange: 1, attackSpeed: 0.5, aggroRange: 0, lootPickupRange: 12,
    hpPerLevel: 6, damagePerLevel: 1, armorPerLevel: 0.5,
    abilities: [
      { id: 'imp_scavenge', name: 'Scavenge', description: 'Increases loot pickup range by 50% for 20s.', cooldown: 30, buffType: 'lootRange', buffDuration: 20, icon: '\uD83D\uDD0D', unlocksAtLevel: 1 },
      { id: 'imp_goldbonus', name: 'Midas Touch', description: 'Gold drops increased by 25% for 30s.', cooldown: 45, buffType: 'goldBonus', buffDuration: 30, icon: '\uD83D\uDCB0', unlocksAtLevel: 5 },
      { id: 'imp_magnet', name: 'Loot Magnet', description: 'Pulls all loot on screen to the player.', cooldown: 60, buffType: 'lootMagnet', buffDuration: 3, icon: '\uD83E\uDDF2', unlocksAtLevel: 10 },
    ],
  },
  [PetSpecies.GOLD_SCARAB]: {
    species: PetSpecies.GOLD_SCARAB,
    name: 'Gold Scarab',
    petType: PetType.LOOT,
    icon: '\uD83E\uDEB2',
    description: 'A magical scarab that senses hidden treasures and increases gold drops.',
    baseHp: 30, baseDamage: 1, baseArmor: 10, moveSpeed: 5.0,
    attackRange: 0, attackSpeed: 0, aggroRange: 0, lootPickupRange: 10,
    hpPerLevel: 5, damagePerLevel: 0.5, armorPerLevel: 2,
    abilities: [
      { id: 'scarab_sense', name: 'Treasure Sense', description: 'Reveals nearby treasure chests on minimap.', cooldown: 20, buffType: 'treasureSense', buffDuration: 30, icon: '\uD83D\uDDFA\uFE0F', unlocksAtLevel: 1 },
      { id: 'scarab_fortune', name: 'Fortune Aura', description: 'Increases item rarity by one tier for 15s.', cooldown: 60, buffType: 'rarityBoost', buffDuration: 15, icon: '\u2728', unlocksAtLevel: 8 },
      { id: 'scarab_dig', name: 'Excavate', description: 'Digs up bonus crafting materials.', cooldown: 45, buffType: 'materials', buffDuration: 1, icon: '\u26CF\uFE0F', unlocksAtLevel: 4 },
    ],
  },
  [PetSpecies.MAGPIE_FAMILIAR]: {
    species: PetSpecies.MAGPIE_FAMILIAR,
    name: 'Magpie Familiar',
    petType: PetType.LOOT,
    icon: '\uD83D\uDC26',
    description: 'A clever bird that steals items from enemies and collects crafting materials.',
    baseHp: 35, baseDamage: 5, baseArmor: 1, moveSpeed: 8.0,
    attackRange: 1, attackSpeed: 0.8, aggroRange: 0, lootPickupRange: 15,
    hpPerLevel: 5, damagePerLevel: 1, armorPerLevel: 0.3,
    abilities: [
      { id: 'magpie_steal', name: 'Pilfer', description: 'Chance to steal an extra item from slain enemies.', cooldown: 15, buffType: 'extraLoot', buffDuration: 10, icon: '\uD83E\uDD0F', unlocksAtLevel: 1 },
      { id: 'magpie_carry', name: 'Extra Pouch', description: 'Temporarily grants 5 extra inventory slots.', cooldown: 60, buffType: 'extraSlots', buffDuration: 30, icon: '\uD83C\uDF92', unlocksAtLevel: 6 },
      { id: 'magpie_appraise', name: 'Appraise', description: 'Identifies the best item in inventory for your build.', cooldown: 30, buffType: 'identify', buffDuration: 5, icon: '\uD83D\uDCA1', unlocksAtLevel: 3 },
    ],
  },
  [PetSpecies.HEALING_WISP]: {
    species: PetSpecies.HEALING_WISP,
    name: 'Healing Wisp',
    petType: PetType.UTILITY,
    icon: '\u2728',
    description: 'A gentle spirit that heals you over time and cleanses debuffs.',
    baseHp: 45, baseDamage: 0, baseArmor: 3, moveSpeed: 5.5,
    attackRange: 0, attackSpeed: 0, aggroRange: 0,
    hpPerLevel: 8, damagePerLevel: 0, armorPerLevel: 0.5,
    abilities: [
      { id: 'wisp_heal', name: 'Healing Pulse', description: 'Heals owner for 15% max HP.', cooldown: 12, healAmount: 0.15, icon: '\uD83D\uDC9A', unlocksAtLevel: 1 },
      { id: 'wisp_cleanse', name: 'Purify', description: 'Removes all debuffs from owner.', cooldown: 20, buffType: 'cleanse', buffDuration: 1, icon: '\u2604\uFE0F', unlocksAtLevel: 4 },
      { id: 'wisp_regen', name: 'Regeneration Aura', description: 'Grants 3% HP regen per second for 15s.', cooldown: 35, healAmount: 0.03, buffDuration: 15, icon: '\uD83C\uDF3F', unlocksAtLevel: 8 },
    ],
  },
  [PetSpecies.SHIELD_GOLEM]: {
    species: PetSpecies.SHIELD_GOLEM,
    name: 'Shield Golem',
    petType: PetType.UTILITY,
    icon: '\uD83E\uDDF1',
    description: 'A small golem that intercepts attacks and provides armor buffs.',
    baseHp: 200, baseDamage: 5, baseArmor: 20, moveSpeed: 3.5,
    attackRange: 2, attackSpeed: 0.5, aggroRange: 8,
    hpPerLevel: 30, damagePerLevel: 1, armorPerLevel: 4,
    abilities: [
      { id: 'golem_taunt', name: 'Stone Taunt', description: 'Taunts nearby enemies to attack the golem for 5s.', cooldown: 15, buffType: 'taunt', buffDuration: 5, icon: '\uD83D\uDCAA', unlocksAtLevel: 1 },
      { id: 'golem_wall', name: 'Stone Wall', description: 'Grants owner 50% damage reduction for 6s.', cooldown: 25, buffType: 'damageReduction', buffDuration: 6, icon: '\uD83E\uDDF1', unlocksAtLevel: 6 },
      { id: 'golem_fortify', name: 'Fortify', description: 'Permanently increases owner armor by 5.', cooldown: 60, buffType: 'permanentArmor', buffDuration: 0, icon: '\uD83D\uDEE1\uFE0F', unlocksAtLevel: 10 },
    ],
  },
  [PetSpecies.MANA_SPRITE]: {
    species: PetSpecies.MANA_SPRITE,
    name: 'Mana Sprite',
    petType: PetType.UTILITY,
    icon: '\uD83D\uDD2E',
    description: 'A magical sprite that restores mana and reduces cooldowns.',
    baseHp: 40, baseDamage: 8, baseArmor: 2, moveSpeed: 5.5,
    attackRange: 8, attackSpeed: 0.6, aggroRange: 0,
    hpPerLevel: 6, damagePerLevel: 2, armorPerLevel: 0.5,
    abilities: [
      { id: 'mana_restore', name: 'Mana Infusion', description: 'Restores 20% max mana to owner.', cooldown: 15, healAmount: 0.2, icon: '\uD83D\uDCA7', unlocksAtLevel: 1 },
      { id: 'mana_cdr', name: 'Arcane Haste', description: 'Reduces all skill cooldowns by 3s.', cooldown: 30, buffType: 'cooldownReduce', buffDuration: 1, icon: '\u23F0', unlocksAtLevel: 5 },
      { id: 'mana_amplify', name: 'Spell Amplify', description: 'Next skill deals 50% more damage.', cooldown: 25, buffType: 'spellAmp', buffDuration: 10, icon: '\uD83C\uDF1F', unlocksAtLevel: 9 },
    ],
  },
  [PetSpecies.LANTERN_FAIRY]: {
    species: PetSpecies.LANTERN_FAIRY,
    name: 'Lantern Fairy',
    petType: PetType.UTILITY,
    icon: '\uD83E\uDDDA',
    description: 'A tiny fairy with a glowing lantern. Reveals the map and boosts XP gain.',
    baseHp: 25, baseDamage: 3, baseArmor: 1, moveSpeed: 6.0,
    attackRange: 0, attackSpeed: 0, aggroRange: 0,
    hpPerLevel: 4, damagePerLevel: 0.5, armorPerLevel: 0.2,
    abilities: [
      { id: 'fairy_light', name: 'Fairy Light', description: 'Doubles lantern radius and reveals hidden areas.', cooldown: 20, buffType: 'reveal', buffDuration: 20, icon: '\uD83D\uDCA1', unlocksAtLevel: 1 },
      { id: 'fairy_xp', name: 'Wisdom Glow', description: 'Increases XP gain by 20% for 30s.', cooldown: 45, buffType: 'xpBonus', buffDuration: 30, icon: '\uD83D\uDCDA', unlocksAtLevel: 4 },
      { id: 'fairy_teleport', name: 'Pixie Dust', description: 'Teleport to the nearest vendor.', cooldown: 120, buffType: 'teleport', buffDuration: 1, icon: '\u2728', unlocksAtLevel: 12 },
    ],
  },
};

// Pets drop from specific maps / enemy types
export const PET_DROP_TABLE: { species: PetSpecies; mapId: DiabloMapId; chance: number; bossOnly: boolean }[] = [
  { species: PetSpecies.WOLF_PUP, mapId: DiabloMapId.FOREST, chance: 0.05, bossOnly: false },
  { species: PetSpecies.FIRE_SPRITE, mapId: DiabloMapId.VOLCANIC_WASTES, chance: 0.04, bossOnly: false },
  { species: PetSpecies.SHADOW_HOUND, mapId: DiabloMapId.SHADOW_REALM, chance: 0.03, bossOnly: true },
  { species: PetSpecies.STORM_FALCON, mapId: DiabloMapId.STORMSPIRE_PEAK, chance: 0.04, bossOnly: false },
  { species: PetSpecies.BONE_MINION, mapId: DiabloMapId.NECROPOLIS_DUNGEON, chance: 0.05, bossOnly: false },
  { species: PetSpecies.TREASURE_IMP, mapId: DiabloMapId.CRYSTAL_CAVERNS, chance: 0.03, bossOnly: true },
  { species: PetSpecies.GOLD_SCARAB, mapId: DiabloMapId.SUNSCORCH_DESERT, chance: 0.04, bossOnly: false },
  { species: PetSpecies.MAGPIE_FAMILIAR, mapId: DiabloMapId.EMERALD_GRASSLANDS, chance: 0.05, bossOnly: false },
  { species: PetSpecies.HEALING_WISP, mapId: DiabloMapId.MOONLIT_GROVE, chance: 0.04, bossOnly: false },
  { species: PetSpecies.SHIELD_GOLEM, mapId: DiabloMapId.CLOCKWORK_FOUNDRY, chance: 0.03, bossOnly: true },
  { species: PetSpecies.MANA_SPRITE, mapId: DiabloMapId.ANCIENT_LIBRARY, chance: 0.04, bossOnly: false },
  { species: PetSpecies.LANTERN_FAIRY, mapId: DiabloMapId.CELESTIAL_RUINS, chance: 0.03, bossOnly: true },
];


// ---------------------------------------------------------------------------
//  GREATER RIFT CONFIGURATION
// ---------------------------------------------------------------------------

export const GREATER_RIFT_CONFIG = {
  baseTimeLimit: 300, // 5 minutes base
  timeBonusPerLevel: -5, // less time at higher levels (min 120s)
  minTimeLimit: 120,
  hpScalePerLevel: 0.15, // +15% HP per GR level
  damageScalePerLevel: 0.10, // +10% damage per GR level
  xpScalePerLevel: 0.12, // +12% XP per GR level
  lootScalePerLevel: 0.08, // +8% loot bonus per GR level
  baseKillsRequired: 80,
  killsPerLevel: 5,
  maxLevel: 150,
  keystoneDropChance: 0.15, // 15% chance from map bosses
};

// ---------------------------------------------------------------------------
//  ACHIEVEMENT DEFINITIONS
// ---------------------------------------------------------------------------

export const ACHIEVEMENT_DEFS: Omit<Achievement, 'progress' | 'unlocked'>[] = [
  // Combat
  { id: 'first_blood', name: 'First Blood', description: 'Kill your first enemy.', icon: '🗡️', category: 'combat', requirement: 1, reward: { gold: 50 } },
  { id: 'centurion', name: 'Centurion', description: 'Kill 100 enemies.', icon: '⚔️', category: 'combat', requirement: 100, reward: { gold: 500 } },
  { id: 'slayer', name: 'Slayer', description: 'Kill 1,000 enemies.', icon: '💀', category: 'combat', requirement: 1000, reward: { gold: 2000, cosmeticId: 'trail_blood' } },
  { id: 'massacre', name: 'Massacre', description: 'Kill 10,000 enemies.', icon: '☠️', category: 'combat', requirement: 10000, reward: { gold: 10000, cosmeticId: 'aura_death' } },
  { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat 10 bosses.', icon: '👑', category: 'combat', requirement: 10, reward: { gold: 1000 } },
  { id: 'boss_hunter', name: 'Boss Hunter', description: 'Defeat 50 bosses.', icon: '🏆', category: 'combat', requirement: 50, reward: { gold: 5000, cosmeticId: 'trail_gold' } },
  { id: 'crit_master', name: 'Critical Master', description: 'Land 500 critical hits.', icon: '💥', category: 'combat', requirement: 500, reward: { gold: 1000 } },
  { id: 'untouchable', name: 'Untouchable', description: 'Dodge 100 times.', icon: '💨', category: 'combat', requirement: 100, reward: { gold: 500 } },
  // Exploration
  { id: 'explorer', name: 'Explorer', description: 'Clear 5 maps.', icon: '🗺️', category: 'exploration', requirement: 5, reward: { gold: 500 } },
  { id: 'world_walker', name: 'World Walker', description: 'Clear 20 maps.', icon: '🌍', category: 'exploration', requirement: 20, reward: { gold: 3000, cosmeticId: 'trail_stars' } },
  { id: 'completionist', name: 'Completionist', description: 'Clear all 39 maps.', icon: '✨', category: 'exploration', requirement: 39, reward: { gold: 10000, cosmeticId: 'aura_celestial' } },
  { id: 'night_stalker', name: 'Night Stalker', description: 'Defeat 10 night bosses.', icon: '🌙', category: 'exploration', requirement: 10, reward: { gold: 2000 } },
  // Collection
  { id: 'collector', name: 'Collector', description: 'Find 50 items.', icon: '🎒', category: 'collection', requirement: 50, reward: { gold: 300 } },
  { id: 'legendary_hunter', name: 'Legendary Hunter', description: 'Find 10 legendary items.', icon: '🌟', category: 'collection', requirement: 10, reward: { gold: 2000 } },
  { id: 'pet_collector', name: 'Pet Collector', description: 'Collect 5 pets.', icon: '🐾', category: 'collection', requirement: 5, reward: { gold: 1000, cosmeticId: 'trail_paws' } },
  { id: 'gold_hoarder', name: 'Gold Hoarder', description: 'Accumulate 50,000 gold.', icon: '💰', category: 'collection', requirement: 50000, reward: { cosmeticId: 'aura_gold' } },
  { id: 'set_collector', name: 'Set Collector', description: 'Complete 5 item sets.', icon: '🏅', category: 'collection', requirement: 5, reward: { gold: 5000 } },
  // Challenge
  { id: 'rift_runner', name: 'Rift Runner', description: 'Complete Greater Rift 10.', icon: '🌀', category: 'challenge', requirement: 10, reward: { gold: 2000 } },
  { id: 'rift_master', name: 'Rift Master', description: 'Complete Greater Rift 50.', icon: '🔥', category: 'challenge', requirement: 50, reward: { gold: 5000, cosmeticId: 'trail_fire' } },
  { id: 'rift_legend', name: 'Rift Legend', description: 'Complete Greater Rift 100.', icon: '⭐', category: 'challenge', requirement: 100, reward: { gold: 20000, cosmeticId: 'aura_rift' } },
  { id: 'level_cap', name: 'Max Level', description: 'Reach level 20.', icon: '📈', category: 'challenge', requirement: 20, reward: { gold: 1000 } },
  { id: 'paragon_10', name: 'Paragon Warrior', description: 'Reach Paragon level 10.', icon: '💎', category: 'challenge', requirement: 10, reward: { gold: 3000 } },
  { id: 'paragon_50', name: 'Paragon Elite', description: 'Reach Paragon level 50.', icon: '👑', category: 'challenge', requirement: 50, reward: { gold: 10000, cosmeticId: 'aura_paragon' } },
  { id: 'deathless', name: 'Deathless', description: 'Clear a map without dying.', icon: '🛡️', category: 'challenge', requirement: 1, reward: { gold: 1000 } },
  // Quest
  { id: 'quest_complete_5', name: 'Errand Runner', description: 'Complete 5 quests.', icon: '📋', category: 'quest', requirement: 5, reward: { gold: 500 } },
  { id: 'quest_complete_20', name: 'Champion', description: 'Complete 20 quests.', icon: '🏆', category: 'quest', requirement: 20, reward: { gold: 2000 } },
  { id: 'excalibur', name: 'The Blade Reborn', description: 'Reforge Excalibur.', icon: '⚔️', category: 'quest', requirement: 1, reward: { gold: 10000, cosmeticId: 'aura_excalibur' } },
  { id: 'mordred', name: 'Oathbreaker\'s End', description: 'Defeat Mordred.', icon: '👑', category: 'quest', requirement: 1, reward: { gold: 20000, cosmeticId: 'trail_royal' } },
];

// ---------------------------------------------------------------------------
//  COSMETIC DEFINITIONS
// ---------------------------------------------------------------------------

export const COSMETIC_DEFS: CosmeticItem[] = [
  { id: 'trail_blood', name: 'Blood Trail', type: 'trail', description: 'Leave a trail of crimson.', icon: '🩸' },
  { id: 'trail_fire', name: 'Fire Trail', type: 'trail', description: 'Footsteps burn with flame.', icon: '🔥' },
  { id: 'trail_gold', name: 'Golden Trail', type: 'trail', description: 'A shimmering golden path.', icon: '✨' },
  { id: 'trail_stars', name: 'Starlight Trail', type: 'trail', description: 'Stardust in your wake.', icon: '⭐' },
  { id: 'trail_paws', name: 'Paw Prints', type: 'trail', description: 'Tiny paw prints follow you.', icon: '🐾' },
  { id: 'trail_royal', name: 'Royal Carpet', type: 'trail', description: 'Walk on crimson and gold.', icon: '👑' },
  { id: 'aura_death', name: 'Death Shroud', type: 'aura', description: 'Dark wisps surround you.', icon: '💀' },
  { id: 'aura_celestial', name: 'Celestial Glow', type: 'aura', description: 'Heavenly light radiates.', icon: '✨' },
  { id: 'aura_gold', name: 'Midas Touch', type: 'aura', description: 'Everything you touch glitters.', icon: '💰' },
  { id: 'aura_rift', name: 'Rift Walker', type: 'aura', description: 'Void energy crackles around you.', icon: '🌀' },
  { id: 'aura_paragon', name: 'Paragon Radiance', type: 'aura', description: 'Pure power made visible.', icon: '💎' },
  { id: 'aura_excalibur', name: 'Excalibur\'s Light', type: 'aura', description: 'The blade\'s divine light.', icon: '⚔️' },
];
