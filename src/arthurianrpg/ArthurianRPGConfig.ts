// ============================================================================
// ArthurianRPGConfig.ts – Shared enums, configuration constants, and game data
// ============================================================================

import type {
  Attributes,
  EnemyAIProfile,
  BossPhase,
} from "./ArthurianRPGState";

// ---------------------------------------------------------------------------
// Elemental types
// ---------------------------------------------------------------------------

export enum ElementalType {
  Physical = "Physical",
  Fire = "Fire",
  Ice = "Ice",
  Lightning = "Lightning",
  Holy = "Holy",
  Dark = "Dark",
  Nature = "Nature",
  Arcane = "Arcane",
}

// ---------------------------------------------------------------------------
// Magic schools
// ---------------------------------------------------------------------------

export enum MagicSchool {
  Destruction = "Destruction",
  Restoration = "Restoration",
  Conjuration = "Conjuration",
  Nature = "Nature",
}

// ---------------------------------------------------------------------------
// Combat action types
// ---------------------------------------------------------------------------

export enum CombatActionType {
  LightAttack = "LightAttack",
  HeavyAttack = "HeavyAttack",
  Block = "Block",
  Dodge = "Dodge",
  SpellCast = "SpellCast",
  Move = "Move",
  Special = "Special",
}

// ---------------------------------------------------------------------------
// Enemy behavior states
// ---------------------------------------------------------------------------

export enum EnemyBehavior {
  Idle = "Idle",
  Patrol = "Patrol",
  Alert = "Alert",
  Chase = "Chase",
  Attack = "Attack",
  Flee = "Flee",
  Dead = "Dead",
}

// ---------------------------------------------------------------------------
// Item quality tiers
// ---------------------------------------------------------------------------

export enum ItemQualityTier {
  Common = "Common",
  Uncommon = "Uncommon",
  Rare = "Rare",
  Epic = "Epic",
  Legendary = "Legendary",
}

// ---------------------------------------------------------------------------
// Terrain types
// ---------------------------------------------------------------------------

export enum TerrainType {
  Grass = "Grass",
  Stone = "Stone",
  Dirt = "Dirt",
  Sand = "Sand",
  Water = "Water",
  Snow = "Snow",
  Swamp = "Swamp",
}

// ---------------------------------------------------------------------------
// Game config constants
// ---------------------------------------------------------------------------

export const RPG_CONFIG = {
  /** Base XP required for level 2; each level multiplies by this factor. */
  xpPerLevelBase: 100,
  xpLevelMultiplier: 1.15,

  /** Stamina regeneration per second when idle. */
  staminaRegenRate: 12,

  /** Mana regeneration per second. */
  manaRegenRate: 3,

  /** Maximum player level. */
  maxLevel: 80,

  /** Attribute points gained per level. */
  attributePointsPerLevel: 3,

  /** Perk points gained per level. */
  perkPointsPerLevel: 1,

  /** Fast travel unlocked at discovery. */
  fastTravelEnabled: true,

  /** World time: real seconds per in-game hour. */
  realSecondsPerGameHour: 120,
} as const;

// ---------------------------------------------------------------------------
// Skill tree category
// ---------------------------------------------------------------------------

export enum SkillCategory {
  Combat = "Combat",
  Magic = "Magic",
  Stealth = "Stealth",
}

// ---------------------------------------------------------------------------
// Item category
// ---------------------------------------------------------------------------

export enum ItemCategory {
  Weapon = "Weapon",
  Armor = "Armor",
  Consumable = "Consumable",
  QuestItem = "QuestItem",
  Material = "Material",
}

// ---------------------------------------------------------------------------
// NPC role
// ---------------------------------------------------------------------------

export enum NPCRole {
  QuestGiver = "QuestGiver",
  Merchant = "Merchant",
  Companion = "Companion",
  Trainer = "Trainer",
  Ruler = "Ruler",
}

// ============================================================================
// 1. CHARACTER CLASS DEFINITIONS
// ============================================================================

export interface CharacterClassDef {
  id: string;
  name: string;
  description: string;
  startingAttributes: Attributes;
  startingSkills: Record<string, number>;
  startingEquipmentIds: string[];
  baseHp: number;
  baseMp: number;
  baseStamina: number;
}

export const CHARACTER_CLASS_DEFS: CharacterClassDef[] = [
  {
    id: "knight",
    name: "Knight",
    description:
      "A heavily armored warrior sworn to the code of chivalry. Masters of sword and shield, knights are the backbone of Camelot's defense.",
    startingAttributes: {
      strength: 14,
      dexterity: 8,
      constitution: 14,
      intelligence: 6,
      wisdom: 8,
      charisma: 10,
      perception: 8,
    },
    startingSkills: {
      oneHanded: 20,
      block: 20,
      heavyArmor: 15,
      twoHanded: 10,
      smithing: 10,
    },
    startingEquipmentIds: [
      "iron_longsword",
      "iron_shield",
      "camelot_plate_chest",
      "camelot_plate_legs",
      "iron_helm",
      "iron_boots",
    ],
    baseHp: 130,
    baseMp: 30,
    baseStamina: 120,
  },
  {
    id: "ranger",
    name: "Ranger",
    description:
      "A keen-eyed wanderer of the wilds. Rangers excel at ranged combat, tracking, and surviving in the untamed forests of Britain.",
    startingAttributes: {
      strength: 10,
      dexterity: 14,
      constitution: 10,
      intelligence: 8,
      wisdom: 10,
      charisma: 8,
      perception: 14,
    },
    startingSkills: {
      archery: 20,
      lightArmor: 15,
      sneak: 15,
      herbalism: 10,
      alchemy: 10,
    },
    startingEquipmentIds: [
      "hunting_bow",
      "ranger_leather_chest",
      "ranger_leather_legs",
      "leather_hood",
      "leather_boots",
    ],
    baseHp: 100,
    baseMp: 40,
    baseStamina: 130,
  },
  {
    id: "mage",
    name: "Mage",
    description:
      "A scholar of the arcane arts trained in the mystical traditions of the druids and the ancient Roman magi. Wields devastating elemental magic.",
    startingAttributes: {
      strength: 6,
      dexterity: 8,
      constitution: 8,
      intelligence: 16,
      wisdom: 14,
      charisma: 8,
      perception: 10,
    },
    startingSkills: {
      destruction: 20,
      restoration: 15,
      conjuration: 10,
      enchanting: 15,
      alchemy: 10,
    },
    startingEquipmentIds: [
      "apprentice_staff",
      "druid_robes_chest",
      "druid_robes_legs",
      "cloth_hood",
      "cloth_shoes",
    ],
    baseHp: 80,
    baseMp: 120,
    baseStamina: 80,
  },
  {
    id: "rogue",
    name: "Rogue",
    description:
      "A cunning trickster who strikes from the shadows. Rogues rely on speed, stealth, and precision to defeat foes before they can react.",
    startingAttributes: {
      strength: 8,
      dexterity: 16,
      constitution: 8,
      intelligence: 10,
      wisdom: 6,
      charisma: 12,
      perception: 12,
    },
    startingSkills: {
      sneak: 20,
      lockpicking: 15,
      pickpocket: 15,
      lightArmor: 15,
      oneHanded: 10,
    },
    startingEquipmentIds: [
      "steel_dagger",
      "leather_cuirass",
      "leather_trousers",
      "dark_cowl",
      "soft_boots",
    ],
    baseHp: 90,
    baseMp: 50,
    baseStamina: 140,
  },
  {
    id: "paladin",
    name: "Paladin",
    description:
      "A holy warrior blessed by the divine light. Paladins combine martial prowess with healing miracles, serving as both sword and shield for the righteous.",
    startingAttributes: {
      strength: 12,
      dexterity: 8,
      constitution: 12,
      intelligence: 10,
      wisdom: 14,
      charisma: 12,
      perception: 8,
    },
    startingSkills: {
      oneHanded: 15,
      heavyArmor: 15,
      restoration: 20,
      block: 15,
      speech: 10,
    },
    startingEquipmentIds: [
      "blessed_mace",
      "iron_shield",
      "camelot_plate_chest",
      "camelot_plate_legs",
      "iron_helm",
      "iron_boots",
    ],
    baseHp: 120,
    baseMp: 70,
    baseStamina: 100,
  },
  {
    id: "druid",
    name: "Druid",
    description:
      "A keeper of the old ways, attuned to the spirits of nature and the ley lines of Albion. Druids command flora, fauna, and the primal forces of the earth.",
    startingAttributes: {
      strength: 8,
      dexterity: 10,
      constitution: 10,
      intelligence: 12,
      wisdom: 16,
      charisma: 10,
      perception: 12,
    },
    startingSkills: {
      conjuration: 20,
      restoration: 15,
      herbalism: 20,
      alchemy: 15,
      illusion: 10,
      nature: 15,
    },
    startingEquipmentIds: [
      "oaken_staff",
      "druid_robes_chest",
      "druid_robes_legs",
      "wreath_crown",
      "woven_sandals",
    ],
    baseHp: 95,
    baseMp: 100,
    baseStamina: 90,
  },
];

// ============================================================================
// 2. SKILL DEFINITIONS
// ============================================================================

export interface SkillDef {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  governingAttribute: keyof Attributes;
  maxLevel: number;
}

export const SKILL_DEFS: SkillDef[] = [
  // --- Combat ---
  { id: "oneHanded", name: "One-Handed", category: SkillCategory.Combat, description: "Proficiency with swords, maces, and axes wielded in one hand.", governingAttribute: "strength", maxLevel: 100 },
  { id: "twoHanded", name: "Two-Handed", category: SkillCategory.Combat, description: "Mastery of greatswords, warhammers, and battleaxes.", governingAttribute: "strength", maxLevel: 100 },
  { id: "archery", name: "Archery", category: SkillCategory.Combat, description: "Skill with longbows, shortbows, and crossbows.", governingAttribute: "dexterity", maxLevel: 100 },
  { id: "block", name: "Block", category: SkillCategory.Combat, description: "The art of deflecting blows with a shield or weapon.", governingAttribute: "constitution", maxLevel: 100 },
  { id: "heavyArmor", name: "Heavy Armor", category: SkillCategory.Combat, description: "Ability to move and fight effectively in plate and chain mail.", governingAttribute: "constitution", maxLevel: 100 },
  { id: "lightArmor", name: "Light Armor", category: SkillCategory.Combat, description: "Expertise in leather and padded armor for agile combat.", governingAttribute: "dexterity", maxLevel: 100 },

  // --- Magic ---
  { id: "destruction", name: "Destruction", category: SkillCategory.Magic, description: "Offensive spells harnessing fire, ice, and lightning.", governingAttribute: "intelligence", maxLevel: 100 },
  { id: "restoration", name: "Restoration", category: SkillCategory.Magic, description: "Healing magic and protective wards against the undead.", governingAttribute: "wisdom", maxLevel: 100 },
  { id: "conjuration", name: "Conjuration", category: SkillCategory.Magic, description: "Summoning creatures and binding spirits to your will.", governingAttribute: "intelligence", maxLevel: 100 },
  { id: "enchanting", name: "Enchanting", category: SkillCategory.Magic, description: "Imbuing weapons and armor with magical properties.", governingAttribute: "intelligence", maxLevel: 100 },
  { id: "alchemy", name: "Alchemy", category: SkillCategory.Magic, description: "Brewing potions, poisons, and transmuting materials.", governingAttribute: "wisdom", maxLevel: 100 },
  { id: "illusion", name: "Illusion", category: SkillCategory.Magic, description: "Spells of deception, calm, fear, and invisibility.", governingAttribute: "wisdom", maxLevel: 100 },
  { id: "nature", name: "Nature Magic", category: SkillCategory.Magic, description: "Primal druidic magic commanding plants, beasts, and the earth itself.", governingAttribute: "wisdom", maxLevel: 100 },

  // --- Stealth ---
  { id: "sneak", name: "Sneak", category: SkillCategory.Stealth, description: "Moving unseen and unheard past enemies and traps.", governingAttribute: "dexterity", maxLevel: 100 },
  { id: "lockpicking", name: "Lockpicking", category: SkillCategory.Stealth, description: "Opening locked doors, chests, and mechanisms.", governingAttribute: "dexterity", maxLevel: 100 },
  { id: "pickpocket", name: "Pickpocket", category: SkillCategory.Stealth, description: "Stealing items directly from an NPC's inventory.", governingAttribute: "dexterity", maxLevel: 100 },
  { id: "speech", name: "Speech", category: SkillCategory.Stealth, description: "Persuasion, intimidation, and bartering with NPCs.", governingAttribute: "charisma", maxLevel: 100 },
  { id: "smithing", name: "Smithing", category: SkillCategory.Stealth, description: "Forging and improving weapons and armor at a forge.", governingAttribute: "strength", maxLevel: 100 },
  { id: "herbalism", name: "Herbalism", category: SkillCategory.Stealth, description: "Gathering and identifying plants, fungi, and reagents.", governingAttribute: "perception", maxLevel: 100 },
];

// ============================================================================
// 3. PERK DEFINITIONS  (3 per skill = 54 total)
// ============================================================================

export interface PerkDef {
  id: string;
  name: string;
  skillId: string;
  requiredSkillLevel: number;
  description: string;
  damageMultiplier?: number;
  defenseMultiplier?: number;
  costReduction?: number;
  specialEffect?: string;
}

export const PERK_DEFS: PerkDef[] = [
  // ---- One-Handed ----
  { id: "oh_1", name: "Swordsman's Grip", skillId: "oneHanded", requiredSkillLevel: 25, description: "One-handed attacks deal 20% more damage.", damageMultiplier: 1.2 },
  { id: "oh_2", name: "Riposte", skillId: "oneHanded", requiredSkillLevel: 50, description: "Successful blocks with a one-handed weapon grant a free counter-attack.", specialEffect: "riposte_counter" },
  { id: "oh_3", name: "Blade Dancer", skillId: "oneHanded", requiredSkillLevel: 75, description: "One-handed power attacks cost 30% less stamina and have a 15% critical chance.", costReduction: 0.3, damageMultiplier: 1.15 },

  // ---- Two-Handed ----
  { id: "th_1", name: "Devastating Blow", skillId: "twoHanded", requiredSkillLevel: 25, description: "Two-handed power attacks deal 25% more damage.", damageMultiplier: 1.25 },
  { id: "th_2", name: "Skull Crusher", skillId: "twoHanded", requiredSkillLevel: 50, description: "Standing power attacks with two-handed weapons have a chance to decapitate.", specialEffect: "decapitate" },
  { id: "th_3", name: "Warmaster", skillId: "twoHanded", requiredSkillLevel: 75, description: "Two-handed attacks ignore 50% of enemy armor.", specialEffect: "armor_pierce_50" },

  // ---- Archery ----
  { id: "ar_1", name: "Eagle Eye", skillId: "archery", requiredSkillLevel: 25, description: "Bows deal 20% more damage and zoom further.", damageMultiplier: 1.2 },
  { id: "ar_2", name: "Rapid Shot", skillId: "archery", requiredSkillLevel: 50, description: "Draw speed increased by 30%.", specialEffect: "draw_speed_30" },
  { id: "ar_3", name: "Penetrating Arrow", skillId: "archery", requiredSkillLevel: 75, description: "Arrows pass through the first target and can hit a second.", specialEffect: "arrow_passthrough" },

  // ---- Block ----
  { id: "bl_1", name: "Shield Wall", skillId: "block", requiredSkillLevel: 25, description: "Blocking absorbs 25% more damage.", defenseMultiplier: 1.25 },
  { id: "bl_2", name: "Shield Bash", skillId: "block", requiredSkillLevel: 50, description: "Bashing with a shield has a chance to stagger enemies.", specialEffect: "bash_stagger" },
  { id: "bl_3", name: "Unbreakable", skillId: "block", requiredSkillLevel: 75, description: "Blocking no longer drains stamina for the first 3 hits.", specialEffect: "free_block_3" },

  // ---- Heavy Armor ----
  { id: "ha_1", name: "Ironclad", skillId: "heavyArmor", requiredSkillLevel: 25, description: "Heavy armor provides 20% more defense.", defenseMultiplier: 1.2 },
  { id: "ha_2", name: "Unyielding", skillId: "heavyArmor", requiredSkillLevel: 50, description: "Heavy armor no longer slows movement speed.", specialEffect: "no_armor_slow" },
  { id: "ha_3", name: "Juggernaut", skillId: "heavyArmor", requiredSkillLevel: 75, description: "Incoming stagger is reduced by 50% while in full heavy armor.", specialEffect: "stagger_resist_50" },

  // ---- Light Armor ----
  { id: "la_1", name: "Nimble", skillId: "lightArmor", requiredSkillLevel: 25, description: "Light armor provides a 10% dodge chance.", specialEffect: "dodge_10" },
  { id: "la_2", name: "Wind Walker", skillId: "lightArmor", requiredSkillLevel: 50, description: "Stamina regenerates 25% faster in light armor.", specialEffect: "stamina_regen_25" },
  { id: "la_3", name: "Evasion Master", skillId: "lightArmor", requiredSkillLevel: 75, description: "All physical damage reduced by 10% when wearing full light armor.", defenseMultiplier: 1.1 },

  // ---- Destruction ----
  { id: "de_1", name: "Elemental Surge", skillId: "destruction", requiredSkillLevel: 25, description: "Destruction spells deal 15% more damage.", damageMultiplier: 1.15 },
  { id: "de_2", name: "Impact", skillId: "destruction", requiredSkillLevel: 50, description: "Dual-cast destruction spells stagger most enemies.", specialEffect: "dualcast_stagger" },
  { id: "de_3", name: "Arcane Inferno", skillId: "destruction", requiredSkillLevel: 75, description: "Fire spells have a 25% chance to cause an explosion on death.", specialEffect: "fire_explosion" },

  // ---- Restoration ----
  { id: "re_1", name: "Healer's Touch", skillId: "restoration", requiredSkillLevel: 25, description: "Healing spells restore 25% more health.", specialEffect: "heal_25_more" },
  { id: "re_2", name: "Ward Absorb", skillId: "restoration", requiredSkillLevel: 50, description: "Wards recharge your mana when hit by spells.", specialEffect: "ward_mana_absorb" },
  { id: "re_3", name: "Divine Blessing", skillId: "restoration", requiredSkillLevel: 75, description: "Once per combat, automatically heal to 30% HP when mortally wounded.", specialEffect: "auto_heal_30" },

  // ---- Conjuration ----
  { id: "co_1", name: "Fae Pact", skillId: "conjuration", requiredSkillLevel: 25, description: "Summoned creatures last 50% longer.", specialEffect: "summon_duration_50" },
  { id: "co_2", name: "Twin Souls", skillId: "conjuration", requiredSkillLevel: 50, description: "You can maintain two summoned creatures at once.", specialEffect: "twin_summons" },
  { id: "co_3", name: "Elemental Thrall", skillId: "conjuration", requiredSkillLevel: 75, description: "Summon a permanent elemental that does not expire.", specialEffect: "permanent_summon" },

  // ---- Enchanting ----
  { id: "en_1", name: "Soul Siphon", skillId: "enchanting", requiredSkillLevel: 25, description: "Enchantments are 20% stronger.", specialEffect: "enchant_20_stronger" },
  { id: "en_2", name: "Dual Enchant", skillId: "enchanting", requiredSkillLevel: 50, description: "Place two enchantments on a single item.", specialEffect: "dual_enchant" },
  { id: "en_3", name: "Arcane Blacksmith", skillId: "enchanting", requiredSkillLevel: 75, description: "Enchanted items can be improved at a forge.", specialEffect: "improve_enchanted" },

  // ---- Alchemy ----
  { id: "al_1", name: "Alchemist's Insight", skillId: "alchemy", requiredSkillLevel: 25, description: "Potions are 25% more effective.", specialEffect: "potion_25_effective" },
  { id: "al_2", name: "Concentrated Poison", skillId: "alchemy", requiredSkillLevel: 50, description: "Poisons applied to weapons last for two additional hits.", specialEffect: "poison_extra_2" },
  { id: "al_3", name: "Purity", skillId: "alchemy", requiredSkillLevel: 75, description: "Negative effects are removed from all potions; positive effects are removed from all poisons.", specialEffect: "purity" },

  // ---- Illusion ----
  { id: "il_1", name: "Hypnotic Gaze", skillId: "illusion", requiredSkillLevel: 25, description: "Illusion spells work on enemies up to 10 levels higher.", specialEffect: "illusion_level_10" },
  { id: "il_2", name: "Quiet Casting", skillId: "illusion", requiredSkillLevel: 50, description: "All spells cast from any school are silent.", specialEffect: "silent_casting" },
  { id: "il_3", name: "Master of Minds", skillId: "illusion", requiredSkillLevel: 75, description: "Illusion spells can affect undead, constructs, and daedra.", specialEffect: "illusion_all_types" },

  // ---- Sneak ----
  { id: "sn_1", name: "Shadow Step", skillId: "sneak", requiredSkillLevel: 25, description: "Sneaking is 25% more effective.", specialEffect: "sneak_25" },
  { id: "sn_2", name: "Backstab", skillId: "sneak", requiredSkillLevel: 50, description: "Sneak attacks with daggers deal 6x damage.", damageMultiplier: 6.0 },
  { id: "sn_3", name: "Shadow Warrior", skillId: "sneak", requiredSkillLevel: 75, description: "Entering sneak mid-combat causes enemies to lose track of you for 3 seconds.", specialEffect: "combat_stealth" },

  // ---- Lockpicking ----
  { id: "lp_1", name: "Nimble Fingers", skillId: "lockpicking", requiredSkillLevel: 25, description: "Lockpicks are twice as durable.", specialEffect: "lockpick_durability_2x" },
  { id: "lp_2", name: "Treasure Hunter", skillId: "lockpicking", requiredSkillLevel: 50, description: "Locked chests contain better loot.", specialEffect: "better_chest_loot" },
  { id: "lp_3", name: "Skeleton Key Mastery", skillId: "lockpicking", requiredSkillLevel: 75, description: "Lockpicks never break.", specialEffect: "unbreakable_picks" },

  // ---- Pickpocket ----
  { id: "pp_1", name: "Light Fingers", skillId: "pickpocket", requiredSkillLevel: 25, description: "Pickpocketing chance increased by 25%.", specialEffect: "pickpocket_25" },
  { id: "pp_2", name: "Cutpurse", skillId: "pickpocket", requiredSkillLevel: 50, description: "Can steal equipped weapons.", specialEffect: "steal_equipped_weapon" },
  { id: "pp_3", name: "Poisoner", skillId: "pickpocket", requiredSkillLevel: 75, description: "Reverse-pickpocket poisons into enemy inventories.", specialEffect: "plant_poison" },

  // ---- Speech ----
  { id: "sp_1", name: "Haggler", skillId: "speech", requiredSkillLevel: 25, description: "Buying and selling prices improved by 15%.", specialEffect: "barter_15" },
  { id: "sp_2", name: "Allure", skillId: "speech", requiredSkillLevel: 50, description: "NPCs of the opposite disposition are more easily persuaded.", specialEffect: "persuade_bonus" },
  { id: "sp_3", name: "Master Orator", skillId: "speech", requiredSkillLevel: 75, description: "Can calm or enrage any NPC once per conversation.", specialEffect: "calm_enrage" },

  // ---- Smithing ----
  { id: "sm_1", name: "Apprentice Smith", skillId: "smithing", requiredSkillLevel: 25, description: "Can craft steel-tier equipment.", specialEffect: "craft_steel" },
  { id: "sm_2", name: "Expert Smith", skillId: "smithing", requiredSkillLevel: 50, description: "Can craft mithril-tier equipment and temper items to fine quality.", specialEffect: "craft_mithril" },
  { id: "sm_3", name: "Legendary Smith", skillId: "smithing", requiredSkillLevel: 75, description: "Can craft legendary-tier equipment. Tempering is twice as effective.", specialEffect: "craft_legendary" },

  // ---- Herbalism ----
  { id: "hb_1", name: "Keen Eye", skillId: "herbalism", requiredSkillLevel: 25, description: "Plants glow when you are nearby, making them easier to find.", specialEffect: "plant_glow" },
  { id: "hb_2", name: "Green Thumb", skillId: "herbalism", requiredSkillLevel: 50, description: "Harvesting plants yields double ingredients.", specialEffect: "double_harvest" },
  { id: "hb_3", name: "Nature's Bounty", skillId: "herbalism", requiredSkillLevel: 75, description: "Discover a rare fourth ingredient on all plants.", specialEffect: "rare_ingredient" },
];

// ============================================================================
// 4. ITEM DEFINITIONS
// ============================================================================

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  quality: ItemQualityTier;
  description: string;
  weight: number;
  value: number;
  // Weapon fields
  baseDamage?: number;
  attackSpeed?: number;
  element?: ElementalType;
  // Armor fields
  armorValue?: number;
  slot?: "mainHand" | "offHand" | "head" | "chest" | "legs" | "feet";
  // Consumable fields
  healAmount?: number;
  manaAmount?: number;
  staminaAmount?: number;
  effectDuration?: number;
  buffId?: string;
  // Quest
  questId?: string;
}

export const ITEM_DEFS: ItemDef[] = [
  // ===================== LEGENDARY WEAPONS =====================
  { id: "excalibur", name: "Excalibur", category: ItemCategory.Weapon, quality: ItemQualityTier.Legendary, description: "The Sword of Kings, drawn from the stone by Arthur himself. Glows with holy light and cannot be broken.", weight: 4.5, value: 50000, baseDamage: 85, attackSpeed: 1.1, element: ElementalType.Holy, slot: "mainHand" },
  { id: "clarent", name: "Clarent", category: ItemCategory.Weapon, quality: ItemQualityTier.Legendary, description: "The Sword of Peace, stolen by Mordred. Once a ceremonial blade, now twisted by treachery.", weight: 4.0, value: 40000, baseDamage: 78, attackSpeed: 1.2, element: ElementalType.Dark, slot: "mainHand" },
  { id: "carnwennan", name: "Carnwennan", category: ItemCategory.Weapon, quality: ItemQualityTier.Legendary, description: "Arthur's dagger, said to shroud its wielder in shadow.", weight: 1.5, value: 35000, baseDamage: 55, attackSpeed: 1.8, element: ElementalType.Dark, slot: "mainHand" },
  { id: "rhongomyniad", name: "Rhongomyniad", category: ItemCategory.Weapon, quality: ItemQualityTier.Legendary, description: "The Spear of Arthur, a lance of devastating reach and divine power.", weight: 6.0, value: 45000, baseDamage: 90, attackSpeed: 0.8, element: ElementalType.Holy, slot: "mainHand" },
  { id: "caliburn", name: "Caliburn", category: ItemCategory.Weapon, quality: ItemQualityTier.Legendary, description: "The original Sword in the Stone. Though lesser than Excalibur, it still hums with ancient magic.", weight: 4.0, value: 38000, baseDamage: 72, attackSpeed: 1.15, element: ElementalType.Lightning, slot: "mainHand" },

  // ===================== EPIC WEAPONS =====================
  { id: "lancelots_arondight", name: "Arondight", category: ItemCategory.Weapon, quality: ItemQualityTier.Epic, description: "Lancelot's holy blade, blessed by the Lady of the Lake.", weight: 4.0, value: 15000, baseDamage: 62, attackSpeed: 1.2, element: ElementalType.Holy, slot: "mainHand" },
  { id: "gawains_galatine", name: "Galatine", category: ItemCategory.Weapon, quality: ItemQualityTier.Epic, description: "Sir Gawain's sword whose power waxes with the sun.", weight: 4.5, value: 14000, baseDamage: 60, attackSpeed: 1.1, element: ElementalType.Fire, slot: "mainHand" },
  { id: "merlins_staff", name: "Merlin's Staff", category: ItemCategory.Weapon, quality: ItemQualityTier.Epic, description: "The archmage's staff, crackling with barely contained lightning.", weight: 3.5, value: 18000, baseDamage: 45, attackSpeed: 1.0, element: ElementalType.Lightning, slot: "mainHand" },
  { id: "green_knight_axe", name: "Green Chapel Axe", category: ItemCategory.Weapon, quality: ItemQualityTier.Epic, description: "The enchanted axe carried by the unkillable Green Knight.", weight: 7.0, value: 12000, baseDamage: 70, attackSpeed: 0.7, element: ElementalType.Physical, slot: "mainHand" },

  // ===================== STANDARD WEAPONS =====================
  { id: "iron_longsword", name: "Iron Longsword", category: ItemCategory.Weapon, quality: ItemQualityTier.Common, description: "A sturdy iron blade, standard issue for Camelot's soldiers.", weight: 3.5, value: 120, baseDamage: 18, attackSpeed: 1.0, element: ElementalType.Physical, slot: "mainHand" },
  { id: "steel_dagger", name: "Steel Dagger", category: ItemCategory.Weapon, quality: ItemQualityTier.Common, description: "A sharp dagger favored by those who fight up close.", weight: 1.0, value: 80, baseDamage: 12, attackSpeed: 1.6, element: ElementalType.Physical, slot: "mainHand" },
  { id: "hunting_bow", name: "Hunting Bow", category: ItemCategory.Weapon, quality: ItemQualityTier.Common, description: "A reliable yew longbow used by hunters and scouts.", weight: 2.0, value: 100, baseDamage: 16, attackSpeed: 0.9, element: ElementalType.Physical, slot: "mainHand" },
  { id: "apprentice_staff", name: "Apprentice's Staff", category: ItemCategory.Weapon, quality: ItemQualityTier.Common, description: "A simple oak staff with a crystal focus.", weight: 3.0, value: 90, baseDamage: 10, attackSpeed: 1.0, element: ElementalType.Lightning, slot: "mainHand" },
  { id: "oaken_staff", name: "Oaken Staff", category: ItemCategory.Weapon, quality: ItemQualityTier.Common, description: "A druidic staff carved from a sacred oak.", weight: 3.0, value: 95, baseDamage: 11, attackSpeed: 1.0, element: ElementalType.Physical, slot: "mainHand" },
  { id: "blessed_mace", name: "Blessed Mace", category: ItemCategory.Weapon, quality: ItemQualityTier.Uncommon, description: "A flanged mace blessed at the altar of a holy chapel.", weight: 4.0, value: 250, baseDamage: 22, attackSpeed: 0.9, element: ElementalType.Holy, slot: "mainHand" },
  { id: "steel_greatsword", name: "Steel Greatsword", category: ItemCategory.Weapon, quality: ItemQualityTier.Uncommon, description: "A hefty two-handed blade forged from tempered steel.", weight: 6.0, value: 300, baseDamage: 30, attackSpeed: 0.75, element: ElementalType.Physical, slot: "mainHand" },
  { id: "war_bow", name: "War Bow", category: ItemCategory.Weapon, quality: ItemQualityTier.Uncommon, description: "A powerful longbow designed for punching through armor.", weight: 2.5, value: 280, baseDamage: 24, attackSpeed: 0.8, element: ElementalType.Physical, slot: "mainHand" },
  { id: "fire_sword", name: "Flamebrand", category: ItemCategory.Weapon, quality: ItemQualityTier.Rare, description: "A blade wreathed in perpetual flame.", weight: 3.5, value: 2500, baseDamage: 38, attackSpeed: 1.05, element: ElementalType.Fire, slot: "mainHand" },
  { id: "frost_axe", name: "Frostbite Axe", category: ItemCategory.Weapon, quality: ItemQualityTier.Rare, description: "An axe that freezes the blood of those it strikes.", weight: 5.0, value: 2800, baseDamage: 42, attackSpeed: 0.85, element: ElementalType.Ice, slot: "mainHand" },

  // ===================== SHIELDS =====================
  { id: "iron_shield", name: "Iron Kite Shield", category: ItemCategory.Armor, quality: ItemQualityTier.Common, description: "A reliable shield bearing Camelot's crest.", weight: 5.0, value: 150, armorValue: 18, slot: "offHand" },
  { id: "round_table_shield", name: "Round Table Shield", category: ItemCategory.Armor, quality: ItemQualityTier.Epic, description: "A shield crafted from a fragment of the Round Table itself.", weight: 5.5, value: 8000, armorValue: 40, slot: "offHand" },

  // ===================== CAMELOT PLATE SET =====================
  { id: "iron_helm", name: "Iron Helm", category: ItemCategory.Armor, quality: ItemQualityTier.Common, description: "A standard-issue helm of Camelot's garrison.", weight: 3.0, value: 100, armorValue: 12, slot: "head" },
  { id: "camelot_plate_chest", name: "Camelot Plate Cuirass", category: ItemCategory.Armor, quality: ItemQualityTier.Uncommon, description: "Polished plate armor etched with the Pendragon crest.", weight: 12.0, value: 600, armorValue: 32, slot: "chest" },
  { id: "camelot_plate_legs", name: "Camelot Plate Greaves", category: ItemCategory.Armor, quality: ItemQualityTier.Uncommon, description: "Heavy leg protection for mounted and foot combat.", weight: 8.0, value: 400, armorValue: 24, slot: "legs" },
  { id: "iron_boots", name: "Iron Sabatons", category: ItemCategory.Armor, quality: ItemQualityTier.Common, description: "Heavy metal boots with reinforced soles.", weight: 4.0, value: 120, armorValue: 10, slot: "feet" },

  // ===================== RANGER LEATHER SET =====================
  { id: "leather_hood", name: "Ranger's Hood", category: ItemCategory.Armor, quality: ItemQualityTier.Common, description: "A moss-green hood favored by forest scouts.", weight: 1.0, value: 60, armorValue: 6, slot: "head" },
  { id: "ranger_leather_chest", name: "Ranger's Jerkin", category: ItemCategory.Armor, quality: ItemQualityTier.Common, description: "Supple leather armor dyed forest green.", weight: 5.0, value: 200, armorValue: 18, slot: "chest" },
  { id: "ranger_leather_legs", name: "Ranger's Leggings", category: ItemCategory.Armor, quality: ItemQualityTier.Common, description: "Fitted leather leggings for quiet movement.", weight: 3.0, value: 140, armorValue: 12, slot: "legs" },
  { id: "leather_boots", name: "Leather Boots", category: ItemCategory.Armor, quality: ItemQualityTier.Common, description: "Well-worn boots for traversing rough terrain.", weight: 2.0, value: 70, armorValue: 5, slot: "feet" },

  // ===================== DRUID ROBES SET =====================
  { id: "cloth_hood", name: "Druid's Circlet", category: ItemCategory.Armor, quality: ItemQualityTier.Common, description: "A woven circlet adorned with mistletoe.", weight: 0.5, value: 55, armorValue: 3, slot: "head" },
  { id: "druid_robes_chest", name: "Druid's Robes", category: ItemCategory.Armor, quality: ItemQualityTier.Common, description: "Flowing robes woven with protective runes.", weight: 3.0, value: 180, armorValue: 8, slot: "chest" },
  { id: "druid_robes_legs", name: "Druid's Skirt", category: ItemCategory.Armor, quality: ItemQualityTier.Common, description: "A layered cloth skirt with embroidered wards.", weight: 2.0, value: 110, armorValue: 5, slot: "legs" },
  { id: "cloth_shoes", name: "Woven Sandals", category: ItemCategory.Armor, quality: ItemQualityTier.Common, description: "Simple sandals worn by druids and monks.", weight: 0.5, value: 30, armorValue: 2, slot: "feet" },

  // ===================== ROGUE SET =====================
  { id: "dark_cowl", name: "Dark Cowl", category: ItemCategory.Armor, quality: ItemQualityTier.Common, description: "A cowl dyed midnight black for shadowy work.", weight: 0.8, value: 65, armorValue: 5, slot: "head" },
  { id: "leather_cuirass", name: "Shadow Cuirass", category: ItemCategory.Armor, quality: ItemQualityTier.Common, description: "Tight-fitting dark leather for silent movement.", weight: 4.5, value: 190, armorValue: 15, slot: "chest" },
  { id: "leather_trousers", name: "Shadow Trousers", category: ItemCategory.Armor, quality: ItemQualityTier.Common, description: "Dark leather trousers with padded knees.", weight: 2.5, value: 130, armorValue: 10, slot: "legs" },
  { id: "soft_boots", name: "Soft Leather Boots", category: ItemCategory.Armor, quality: ItemQualityTier.Common, description: "Thin-soled boots for treading silently.", weight: 1.5, value: 65, armorValue: 4, slot: "feet" },

  // ===================== DRUID SPECIAL =====================
  { id: "wreath_crown", name: "Wreath Crown", category: ItemCategory.Armor, quality: ItemQualityTier.Uncommon, description: "A crown of holly and oak leaves that hums with nature's power.", weight: 0.5, value: 250, armorValue: 5, slot: "head" },
  { id: "woven_sandals", name: "Earthbound Sandals", category: ItemCategory.Armor, quality: ItemQualityTier.Uncommon, description: "Sandals woven from enchanted vines; they never wear out.", weight: 0.5, value: 220, armorValue: 4, slot: "feet" },

  // ===================== CONSUMABLES =====================
  { id: "health_potion_minor", name: "Minor Health Potion", category: ItemCategory.Consumable, quality: ItemQualityTier.Common, description: "A vial of red liquid that restores a small amount of health.", weight: 0.3, value: 25, healAmount: 30 },
  { id: "health_potion_major", name: "Major Health Potion", category: ItemCategory.Consumable, quality: ItemQualityTier.Uncommon, description: "A potent red elixir that restores a large amount of health.", weight: 0.3, value: 80, healAmount: 80 },
  { id: "health_potion_supreme", name: "Supreme Health Potion", category: ItemCategory.Consumable, quality: ItemQualityTier.Rare, description: "A glowing crimson potion that fully restores health.", weight: 0.3, value: 250, healAmount: 200 },
  { id: "mana_potion_minor", name: "Minor Mana Potion", category: ItemCategory.Consumable, quality: ItemQualityTier.Common, description: "A vial of blue liquid that restores a small amount of mana.", weight: 0.3, value: 30, manaAmount: 25 },
  { id: "mana_potion_major", name: "Major Mana Potion", category: ItemCategory.Consumable, quality: ItemQualityTier.Uncommon, description: "A deep blue elixir that restores a large amount of mana.", weight: 0.3, value: 90, manaAmount: 70 },
  { id: "stamina_potion", name: "Stamina Draught", category: ItemCategory.Consumable, quality: ItemQualityTier.Common, description: "A green tonic that rapidly restores stamina.", weight: 0.3, value: 20, staminaAmount: 50 },
  { id: "bread_loaf", name: "Loaf of Bread", category: ItemCategory.Consumable, quality: ItemQualityTier.Common, description: "Fresh bread from a Camelot bakery.", weight: 0.5, value: 5, healAmount: 8 },
  { id: "venison_stew", name: "Venison Stew", category: ItemCategory.Consumable, quality: ItemQualityTier.Common, description: "Hearty stew that warms the body and restores vigor.", weight: 0.8, value: 15, healAmount: 20, staminaAmount: 20 },
  { id: "mead_flask", name: "Flask of Mead", category: ItemCategory.Consumable, quality: ItemQualityTier.Common, description: "Sweet honeyed mead. Grants liquid courage.", weight: 0.5, value: 10, staminaAmount: 15, buffId: "courage" },
  { id: "elixir_of_strength", name: "Elixir of Strength", category: ItemCategory.Consumable, quality: ItemQualityTier.Rare, description: "Temporarily increases strength by 10 for 120 seconds.", weight: 0.3, value: 300, effectDuration: 120, buffId: "strength_boost" },

  // ===================== QUEST ITEMS =====================
  { id: "holy_grail", name: "The Holy Grail", category: ItemCategory.QuestItem, quality: ItemQualityTier.Legendary, description: "The sacred cup of Christ, said to grant eternal life and heal all wounds. The ultimate object of the quest.", weight: 1.0, value: 0, questId: "main_quest" },
  { id: "round_table_shard", name: "Round Table Shard", category: ItemCategory.QuestItem, quality: ItemQualityTier.Epic, description: "A fragment of the Round Table, imbued with the collective honor of the knights who sat there.", weight: 2.0, value: 0, questId: "round_table" },
  { id: "morganas_mirror", name: "Morgan's Mirror", category: ItemCategory.QuestItem, quality: ItemQualityTier.Epic, description: "An enchanted mirror that reveals hidden truths and dispels illusions.", weight: 1.5, value: 0, questId: "morgan_quest" },
  { id: "grail_map_fragment", name: "Grail Map Fragment", category: ItemCategory.QuestItem, quality: ItemQualityTier.Rare, description: "A piece of an ancient map showing the path to the Grail Castle.", weight: 0.2, value: 0, questId: "main_quest" },
  { id: "scabbard_of_excalibur", name: "Scabbard of Excalibur", category: ItemCategory.QuestItem, quality: ItemQualityTier.Legendary, description: "The enchanted scabbard that prevents its bearer from bleeding. Said to be even more valuable than Excalibur itself.", weight: 1.0, value: 0, questId: "scabbard_quest" },

  // ===================== MATERIALS =====================
  { id: "iron_ingot", name: "Iron Ingot", category: ItemCategory.Material, quality: ItemQualityTier.Common, description: "A bar of smelted iron, ready for the forge.", weight: 1.0, value: 15 },
  { id: "steel_ingot", name: "Steel Ingot", category: ItemCategory.Material, quality: ItemQualityTier.Uncommon, description: "An alloy of iron and carbon, stronger than pure iron.", weight: 1.0, value: 40 },
  { id: "mithril_ingot", name: "Mithril Ingot", category: ItemCategory.Material, quality: ItemQualityTier.Rare, description: "A bar of the legendary elven metal, light as silk and hard as dragon scales.", weight: 0.5, value: 500 },
  { id: "dragon_scale", name: "Dragon Scale", category: ItemCategory.Material, quality: ItemQualityTier.Epic, description: "A luminous scale shed by one of the ancient dragons of Albion.", weight: 0.8, value: 800 },
  { id: "moonstone", name: "Moonstone", category: ItemCategory.Material, quality: ItemQualityTier.Rare, description: "A shimmering gem charged with lunar magic.", weight: 0.2, value: 200 },
  { id: "mandrake_root", name: "Mandrake Root", category: ItemCategory.Material, quality: ItemQualityTier.Uncommon, description: "A rare root with potent alchemical properties. Handle with care.", weight: 0.3, value: 75 },
  { id: "wolfsbane", name: "Wolfsbane", category: ItemCategory.Material, quality: ItemQualityTier.Uncommon, description: "A toxic flower used in poisons and werewolf repellents.", weight: 0.1, value: 50 },
  { id: "soul_gem", name: "Soul Gem", category: ItemCategory.Material, quality: ItemQualityTier.Rare, description: "A crystalline vessel capable of trapping the essence of defeated foes.", weight: 0.3, value: 300 },
];

// ============================================================================
// 5. ENEMY DEFINITIONS
// ============================================================================

export interface EnemyDef {
  id: string;
  name: string;
  level: number;
  hp: number;
  mp: number;
  stamina: number;
  attributes: Attributes;
  baseDamage: number;
  armorValue: number;
  element?: ElementalType;
  xpReward: number;
  goldDrop: [number, number]; // min, max
  lootTable: { itemId: string; chance: number }[];
  aiProfile: EnemyAIProfile;
  tier: "common" | "medium" | "boss";
  bossPhases?: BossPhase[];
}

export const ENEMY_DEFS: EnemyDef[] = [
  // ===================== COMMON ENEMIES =====================
  {
    id: "bandit", name: "Bandit", level: 3, hp: 60, mp: 0, stamina: 80,
    attributes: { strength: 10, dexterity: 10, constitution: 8, intelligence: 5, wisdom: 5, charisma: 4, perception: 8 },
    baseDamage: 12, armorValue: 8, xpReward: 30, goldDrop: [5, 20],
    lootTable: [{ itemId: "iron_longsword", chance: 0.1 }, { itemId: "health_potion_minor", chance: 0.25 }, { itemId: "bread_loaf", chance: 0.4 }],
    aiProfile: { attackRange: 2.0, heavyAttackChance: 0.15, blockChance: 0.1, fleeThreshold: 0.15, decisionInterval: 1.0 },
    tier: "common",
  },
  {
    id: "bandit_archer", name: "Bandit Archer", level: 4, hp: 45, mp: 0, stamina: 90,
    attributes: { strength: 7, dexterity: 13, constitution: 7, intelligence: 5, wisdom: 5, charisma: 4, perception: 12 },
    baseDamage: 14, armorValue: 5, xpReward: 35, goldDrop: [5, 25],
    lootTable: [{ itemId: "hunting_bow", chance: 0.1 }, { itemId: "health_potion_minor", chance: 0.2 }],
    aiProfile: { attackRange: 20.0, heavyAttackChance: 0.05, fleeThreshold: 0.2, decisionInterval: 1.5 },
    tier: "common",
  },
  {
    id: "wolf", name: "Wolf", level: 2, hp: 40, mp: 0, stamina: 100,
    attributes: { strength: 8, dexterity: 14, constitution: 8, intelligence: 3, wisdom: 6, charisma: 2, perception: 14 },
    baseDamage: 10, armorValue: 2, xpReward: 20, goldDrop: [0, 0],
    lootTable: [{ itemId: "wolfsbane", chance: 0.05 }],
    aiProfile: { attackRange: 1.5, heavyAttackChance: 0.2, fleeThreshold: 0.25, decisionInterval: 0.8 },
    tier: "common",
  },
  {
    id: "bear", name: "Cave Bear", level: 6, hp: 120, mp: 0, stamina: 100,
    attributes: { strength: 16, dexterity: 6, constitution: 14, intelligence: 3, wisdom: 5, charisma: 2, perception: 10 },
    baseDamage: 22, armorValue: 10, xpReward: 60, goldDrop: [0, 0],
    lootTable: [],
    aiProfile: { attackRange: 2.0, heavyAttackChance: 0.35, fleeThreshold: 0.1, decisionInterval: 1.2 },
    tier: "common",
  },
  {
    id: "saxon_warrior", name: "Saxon Warrior", level: 5, hp: 80, mp: 0, stamina: 90,
    attributes: { strength: 12, dexterity: 10, constitution: 11, intelligence: 6, wisdom: 6, charisma: 6, perception: 8 },
    baseDamage: 16, armorValue: 14, xpReward: 45, goldDrop: [10, 35],
    lootTable: [{ itemId: "iron_longsword", chance: 0.15 }, { itemId: "iron_shield", chance: 0.08 }, { itemId: "health_potion_minor", chance: 0.2 }],
    aiProfile: { attackRange: 2.0, heavyAttackChance: 0.2, blockChance: 0.25, fleeThreshold: 0.1, decisionInterval: 1.0 },
    tier: "common",
  },
  {
    id: "saxon_archer", name: "Saxon Archer", level: 5, hp: 55, mp: 0, stamina: 95,
    attributes: { strength: 8, dexterity: 14, constitution: 8, intelligence: 6, wisdom: 6, charisma: 5, perception: 13 },
    baseDamage: 18, armorValue: 6, xpReward: 40, goldDrop: [8, 30],
    lootTable: [{ itemId: "hunting_bow", chance: 0.12 }, { itemId: "health_potion_minor", chance: 0.15 }],
    aiProfile: { attackRange: 22.0, heavyAttackChance: 0.1, fleeThreshold: 0.2, decisionInterval: 1.5 },
    tier: "common",
  },
  {
    id: "skeleton", name: "Restless Skeleton", level: 4, hp: 50, mp: 0, stamina: 70,
    attributes: { strength: 9, dexterity: 8, constitution: 10, intelligence: 2, wisdom: 2, charisma: 1, perception: 6 },
    baseDamage: 13, armorValue: 5, xpReward: 35, goldDrop: [0, 10],
    lootTable: [{ itemId: "iron_ingot", chance: 0.15 }],
    aiProfile: { attackRange: 2.0, heavyAttackChance: 0.1, fleeThreshold: 0.0, decisionInterval: 1.2 },
    tier: "common",
  },
  {
    id: "wild_boar", name: "Wild Boar", level: 3, hp: 55, mp: 0, stamina: 80,
    attributes: { strength: 11, dexterity: 8, constitution: 12, intelligence: 2, wisdom: 4, charisma: 1, perception: 10 },
    baseDamage: 14, armorValue: 4, xpReward: 25, goldDrop: [0, 0],
    lootTable: [],
    aiProfile: { attackRange: 1.5, heavyAttackChance: 0.3, fleeThreshold: 0.3, decisionInterval: 1.0 },
    tier: "common",
  },

  // ===================== MEDIUM ENEMIES =====================
  {
    id: "black_knight", name: "Black Knight", level: 12, hp: 180, mp: 20, stamina: 120,
    attributes: { strength: 16, dexterity: 12, constitution: 16, intelligence: 8, wisdom: 8, charisma: 6, perception: 10 },
    baseDamage: 32, armorValue: 30, element: ElementalType.Dark, xpReward: 150, goldDrop: [50, 120],
    lootTable: [{ itemId: "steel_greatsword", chance: 0.2 }, { itemId: "health_potion_major", chance: 0.3 }, { itemId: "steel_ingot", chance: 0.25 }],
    aiProfile: { attackRange: 2.5, heavyAttackChance: 0.35, blockChance: 0.3, fleeThreshold: 0.0, decisionInterval: 1.0, attackDelay: 0.6 },
    tier: "medium",
  },
  {
    id: "giant_spider", name: "Giant Spider", level: 8, hp: 90, mp: 0, stamina: 110,
    attributes: { strength: 10, dexterity: 16, constitution: 8, intelligence: 3, wisdom: 6, charisma: 1, perception: 14 },
    baseDamage: 20, armorValue: 8, xpReward: 75, goldDrop: [0, 5],
    lootTable: [{ itemId: "mandrake_root", chance: 0.15 }],
    aiProfile: { attackRange: 2.5, heavyAttackChance: 0.2, fleeThreshold: 0.15, decisionInterval: 0.7 },
    tier: "medium",
  },
  {
    id: "troll", name: "Forest Troll", level: 10, hp: 220, mp: 0, stamina: 80,
    attributes: { strength: 20, dexterity: 5, constitution: 18, intelligence: 4, wisdom: 4, charisma: 2, perception: 6 },
    baseDamage: 35, armorValue: 15, xpReward: 120, goldDrop: [20, 60],
    lootTable: [{ itemId: "iron_ingot", chance: 0.3 }, { itemId: "health_potion_major", chance: 0.2 }],
    aiProfile: { attackRange: 3.0, heavyAttackChance: 0.4, fleeThreshold: 0.0, decisionInterval: 1.5, attackDelay: 1.0 },
    tier: "medium",
  },
  {
    id: "enchanted_armor", name: "Enchanted Armor", level: 14, hp: 160, mp: 40, stamina: 200,
    attributes: { strength: 14, dexterity: 8, constitution: 20, intelligence: 6, wisdom: 6, charisma: 1, perception: 8 },
    baseDamage: 28, armorValue: 40, element: ElementalType.Lightning, xpReward: 180, goldDrop: [30, 80],
    lootTable: [{ itemId: "steel_ingot", chance: 0.3 }, { itemId: "soul_gem", chance: 0.1 }, { itemId: "mithril_ingot", chance: 0.05 }],
    aiProfile: { attackRange: 2.0, heavyAttackChance: 0.25, blockChance: 0.4, fleeThreshold: 0.0, decisionInterval: 1.2 },
    tier: "medium",
  },
  {
    id: "wraith", name: "Barrow Wraith", level: 11, hp: 100, mp: 80, stamina: 60,
    attributes: { strength: 8, dexterity: 12, constitution: 10, intelligence: 14, wisdom: 12, charisma: 3, perception: 16 },
    baseDamage: 25, armorValue: 5, element: ElementalType.Dark, xpReward: 130, goldDrop: [15, 50],
    lootTable: [{ itemId: "soul_gem", chance: 0.15 }, { itemId: "moonstone", chance: 0.1 }],
    aiProfile: { attackRange: 3.0, heavyAttackChance: 0.15, fleeThreshold: 0.0, decisionInterval: 0.8 },
    tier: "medium",
  },
  {
    id: "saxon_champion", name: "Saxon Champion", level: 15, hp: 200, mp: 10, stamina: 130,
    attributes: { strength: 18, dexterity: 12, constitution: 16, intelligence: 8, wisdom: 8, charisma: 10, perception: 10 },
    baseDamage: 36, armorValue: 28, xpReward: 200, goldDrop: [60, 150],
    lootTable: [{ itemId: "steel_greatsword", chance: 0.15 }, { itemId: "health_potion_major", chance: 0.3 }, { itemId: "mithril_ingot", chance: 0.08 }],
    aiProfile: { attackRange: 2.5, heavyAttackChance: 0.3, blockChance: 0.3, fleeThreshold: 0.05, decisionInterval: 0.9, attackDelay: 0.5 },
    tier: "medium",
  },
  {
    id: "fae_knight", name: "Fae Knight", level: 16, hp: 140, mp: 100, stamina: 110,
    attributes: { strength: 12, dexterity: 16, constitution: 12, intelligence: 14, wisdom: 14, charisma: 16, perception: 14 },
    baseDamage: 30, armorValue: 20, element: ElementalType.Ice, xpReward: 220, goldDrop: [40, 100],
    lootTable: [{ itemId: "moonstone", chance: 0.2 }, { itemId: "mana_potion_major", chance: 0.25 }],
    aiProfile: { attackRange: 2.5, heavyAttackChance: 0.2, blockChance: 0.25, fleeThreshold: 0.1, decisionInterval: 0.7, attackDelay: 0.4 },
    tier: "medium",
  },
  {
    id: "dragon_whelp", name: "Dragon Whelp", level: 18, hp: 250, mp: 60, stamina: 100,
    attributes: { strength: 18, dexterity: 14, constitution: 16, intelligence: 10, wisdom: 8, charisma: 4, perception: 14 },
    baseDamage: 40, armorValue: 25, element: ElementalType.Fire, xpReward: 300, goldDrop: [80, 200],
    lootTable: [{ itemId: "dragon_scale", chance: 0.3 }, { itemId: "health_potion_major", chance: 0.4 }],
    aiProfile: { attackRange: 4.0, heavyAttackChance: 0.3, fleeThreshold: 0.0, decisionInterval: 1.0, attackDelay: 0.8 },
    tier: "medium",
  },

  // ===================== BOSSES =====================
  {
    id: "mordred", name: "Mordred, the Traitor Prince", level: 30, hp: 800, mp: 120, stamina: 200,
    attributes: { strength: 20, dexterity: 18, constitution: 20, intelligence: 16, wisdom: 12, charisma: 14, perception: 16 },
    baseDamage: 55, armorValue: 35, element: ElementalType.Dark, xpReward: 2000, goldDrop: [500, 1000],
    lootTable: [{ itemId: "clarent", chance: 0.5 }, { itemId: "health_potion_supreme", chance: 1.0 }],
    aiProfile: { attackRange: 2.5, heavyAttackChance: 0.3, blockChance: 0.35, fleeThreshold: 0.0, decisionInterval: 0.6, attackDelay: 0.3 },
    tier: "boss",
    bossPhases: [
      {
        name: "Treacherous Blade", hpThreshold: 1.0, canSummon: false,
        specialAttacks: [{ id: "shadow_slash", damage: 45, element: ElementalType.Dark, cooldown: 8, areaRadius: 0 }],
      },
      {
        name: "Desperate Fury", hpThreshold: 0.5, canSummon: true, summonType: "saxon_warrior", summonCount: 2, summonCooldown: 30,
        specialAttacks: [
          { id: "shadow_slash", damage: 55, element: ElementalType.Dark, cooldown: 6, areaRadius: 0 },
          { id: "dark_nova", damage: 40, element: ElementalType.Dark, cooldown: 15, areaRadius: 5 },
        ],
      },
      {
        name: "Final Betrayal", hpThreshold: 0.2, canSummon: false,
        specialAttacks: [
          { id: "clarent_fury", damage: 70, element: ElementalType.Dark, cooldown: 4, areaRadius: 0 },
          { id: "dark_nova", damage: 55, element: ElementalType.Dark, cooldown: 10, areaRadius: 6 },
        ],
      },
    ],
  },
  {
    id: "morgan_le_fay", name: "Morgan le Fay", level: 28, hp: 600, mp: 400, stamina: 100,
    attributes: { strength: 10, dexterity: 14, constitution: 14, intelligence: 24, wisdom: 22, charisma: 18, perception: 16 },
    baseDamage: 35, armorValue: 15, element: ElementalType.Dark, xpReward: 1800, goldDrop: [400, 800],
    lootTable: [{ itemId: "morganas_mirror", chance: 1.0 }, { itemId: "moonstone", chance: 0.5 }, { itemId: "soul_gem", chance: 0.4 }],
    aiProfile: { attackRange: 15.0, heavyAttackChance: 0.1, fleeThreshold: 0.0, decisionInterval: 0.5, attackDelay: 0.2 },
    tier: "boss",
    bossPhases: [
      {
        name: "Enchantress", hpThreshold: 1.0, canSummon: true, summonType: "wraith", summonCount: 1, summonCooldown: 25,
        specialAttacks: [
          { id: "dark_bolt", damage: 40, element: ElementalType.Dark, cooldown: 5, areaRadius: 0 },
          { id: "ice_storm", damage: 30, element: ElementalType.Ice, cooldown: 12, areaRadius: 6 },
        ],
      },
      {
        name: "Witch Queen", hpThreshold: 0.4, canSummon: true, summonType: "enchanted_armor", summonCount: 1, summonCooldown: 35,
        specialAttacks: [
          { id: "dark_bolt", damage: 55, element: ElementalType.Dark, cooldown: 3, areaRadius: 0 },
          { id: "ice_storm", damage: 45, element: ElementalType.Ice, cooldown: 8, areaRadius: 8 },
          { id: "life_drain", damage: 30, element: ElementalType.Dark, cooldown: 10, areaRadius: 0 },
        ],
      },
    ],
  },
  {
    id: "green_knight", name: "The Green Knight", level: 25, hp: 1000, mp: 60, stamina: 250,
    attributes: { strength: 22, dexterity: 14, constitution: 24, intelligence: 12, wisdom: 16, charisma: 14, perception: 12 },
    baseDamage: 48, armorValue: 30, xpReward: 1500, goldDrop: [300, 600],
    lootTable: [{ itemId: "green_knight_axe", chance: 0.4 }, { itemId: "health_potion_supreme", chance: 0.8 }],
    aiProfile: { attackRange: 3.0, heavyAttackChance: 0.4, blockChance: 0.2, fleeThreshold: 0.0, decisionInterval: 1.0, attackDelay: 0.7 },
    tier: "boss",
    bossPhases: [
      {
        name: "The Challenge", hpThreshold: 1.0, canSummon: false,
        specialAttacks: [{ id: "great_cleave", damage: 60, element: ElementalType.Physical, cooldown: 10, areaRadius: 3 }],
      },
      {
        name: "Headless Fury", hpThreshold: 0.5, canSummon: false,
        specialAttacks: [
          { id: "great_cleave", damage: 75, element: ElementalType.Physical, cooldown: 7, areaRadius: 4 },
          { id: "nature_burst", damage: 35, element: ElementalType.Physical, cooldown: 12, areaRadius: 6 },
        ],
      },
      {
        name: "Immortal Wrath", hpThreshold: 0.15, canSummon: false,
        specialAttacks: [
          { id: "great_cleave", damage: 90, element: ElementalType.Physical, cooldown: 5, areaRadius: 5 },
          { id: "nature_burst", damage: 50, element: ElementalType.Physical, cooldown: 8, areaRadius: 8 },
        ],
      },
    ],
  },
  {
    id: "saxon_king", name: "Cerdic, Saxon King", level: 32, hp: 700, mp: 50, stamina: 220,
    attributes: { strength: 20, dexterity: 16, constitution: 18, intelligence: 14, wisdom: 12, charisma: 18, perception: 14 },
    baseDamage: 52, armorValue: 38, xpReward: 2200, goldDrop: [600, 1200],
    lootTable: [{ itemId: "mithril_ingot", chance: 0.6 }, { itemId: "health_potion_supreme", chance: 1.0 }, { itemId: "dragon_scale", chance: 0.3 }],
    aiProfile: { attackRange: 2.5, heavyAttackChance: 0.35, blockChance: 0.35, fleeThreshold: 0.0, decisionInterval: 0.7, attackDelay: 0.4 },
    tier: "boss",
    bossPhases: [
      {
        name: "Warlord", hpThreshold: 1.0, canSummon: true, summonType: "saxon_warrior", summonCount: 2, summonCooldown: 20,
        specialAttacks: [{ id: "war_cry", damage: 0, element: ElementalType.Physical, cooldown: 30, areaRadius: 10 }],
      },
      {
        name: "Saxon Fury", hpThreshold: 0.5, canSummon: true, summonType: "saxon_champion", summonCount: 1, summonCooldown: 40,
        specialAttacks: [
          { id: "war_cry", damage: 0, element: ElementalType.Physical, cooldown: 25, areaRadius: 10 },
          { id: "berserker_charge", damage: 65, element: ElementalType.Physical, cooldown: 10, areaRadius: 0 },
        ],
      },
      {
        name: "Last Stand", hpThreshold: 0.2, canSummon: false,
        specialAttacks: [
          { id: "berserker_charge", damage: 80, element: ElementalType.Physical, cooldown: 6, areaRadius: 0 },
          { id: "execution_strike", damage: 100, element: ElementalType.Physical, cooldown: 15, areaRadius: 0 },
        ],
      },
    ],
  },
  {
    id: "questing_beast", name: "The Questing Beast", level: 22, hp: 500, mp: 80, stamina: 180,
    attributes: { strength: 18, dexterity: 18, constitution: 16, intelligence: 8, wisdom: 10, charisma: 2, perception: 18 },
    baseDamage: 38, armorValue: 20, xpReward: 1200, goldDrop: [100, 300],
    lootTable: [{ itemId: "dragon_scale", chance: 0.4 }, { itemId: "mandrake_root", chance: 0.5 }],
    aiProfile: { attackRange: 3.5, heavyAttackChance: 0.25, fleeThreshold: 0.1, decisionInterval: 0.6, attackDelay: 0.3 },
    tier: "boss",
    bossPhases: [
      {
        name: "The Hunt", hpThreshold: 1.0, canSummon: false,
        specialAttacks: [{ id: "serpent_strike", damage: 45, element: ElementalType.Physical, cooldown: 6, areaRadius: 0 }],
      },
      {
        name: "Cornered Beast", hpThreshold: 0.35, canSummon: false,
        specialAttacks: [
          { id: "serpent_strike", damage: 60, element: ElementalType.Physical, cooldown: 4, areaRadius: 0 },
          { id: "venomous_roar", damage: 30, element: ElementalType.Dark, cooldown: 12, areaRadius: 7 },
        ],
      },
    ],
  },
];

// ============================================================================
// 6. NPC DEFINITIONS
// ============================================================================

export interface NPCDef {
  id: string;
  name: string;
  title: string;
  role: NPCRole;
  regionId: string;
  description: string;
  dialogue: { greeting: string; farewell: string };
  merchantInventoryIds?: string[];
  questIds?: string[];
  trainableSkills?: string[];
  companionStats?: { level: number; hp: number; mp: number; baseDamage: number; armorValue: number };
}

export const NPC_DEFS: NPCDef[] = [
  {
    id: "arthur", name: "Arthur Pendragon", title: "High King of Britain", role: NPCRole.Ruler,
    regionId: "camelot", description: "The Once and Future King. Arthur rules from Camelot with justice and valor, guided by the wisdom of Merlin and the loyalty of the Round Table.",
    dialogue: { greeting: "Welcome, brave knight. Camelot has need of your courage.", farewell: "Go with the blessing of the crown. May your quest bring honor to us all." },
    questIds: ["main_quest", "round_table"],
  },
  {
    id: "merlin", name: "Merlin", title: "Archmage of Britain", role: NPCRole.Trainer,
    regionId: "camelot", description: "The greatest wizard who ever lived. Merlin's power is matched only by his enigmatic nature. He sees past, present, and future as one.",
    dialogue: { greeting: "Ah, I foresaw your arrival. Come, there is much to discuss.", farewell: "Remember: wisdom is a sharper blade than any sword." },
    trainableSkills: ["destruction", "restoration", "conjuration", "enchanting", "illusion"],
    questIds: ["main_quest"],
  },
  {
    id: "guinevere", name: "Guinevere", title: "Queen of Camelot", role: NPCRole.QuestGiver,
    regionId: "camelot", description: "Arthur's queen, beloved by the people. Guinevere is a diplomat and patron of the arts, though her heart is troubled by secrets.",
    dialogue: { greeting: "It gladdens my heart to see a loyal knight in these halls.", farewell: "Take care on the road, and return to us safely." },
    questIds: ["scabbard_quest"],
  },
  {
    id: "lancelot", name: "Sir Lancelot du Lac", title: "Knight of the Round Table", role: NPCRole.Companion,
    regionId: "camelot", description: "The greatest warrior among the Knights of the Round Table. Lancelot's skill with a sword is unmatched, though his heart is divided.",
    dialogue: { greeting: "A fellow knight! Shall we ride together?", farewell: "Until our paths cross again. Fight well." },
    companionStats: { level: 25, hp: 300, mp: 40, baseDamage: 50, armorValue: 35 },
    questIds: ["main_quest"],
  },
  {
    id: "gawain", name: "Sir Gawain", title: "Knight of the Sun", role: NPCRole.Companion,
    regionId: "camelot", description: "Arthur's nephew. Gawain's strength triples when the sun is at its peak. He is fierce, honorable, and fiercely loyal to the king.",
    dialogue: { greeting: "Well met! The sun shines upon our meeting.", farewell: "May the sun warm your path, friend." },
    companionStats: { level: 22, hp: 280, mp: 30, baseDamage: 45, armorValue: 30 },
  },
  {
    id: "percival", name: "Sir Percival", title: "The Pure Knight", role: NPCRole.Companion,
    regionId: "camelot", description: "A knight of humble origins who rose to join the Round Table through sheer purity of heart. One of the three Grail knights.",
    dialogue: { greeting: "I sense a kindred spirit. Shall we seek the Grail together?", farewell: "Walk in grace, and the Grail shall reveal itself." },
    companionStats: { level: 20, hp: 250, mp: 60, baseDamage: 38, armorValue: 25 },
    questIds: ["main_quest"],
  },
  {
    id: "galahad", name: "Sir Galahad", title: "The Perfect Knight", role: NPCRole.Companion,
    regionId: "corbenic", description: "Son of Lancelot, and the purest knight to ever live. Galahad is destined to achieve the Holy Grail.",
    dialogue: { greeting: "The Grail calls to those who are worthy. Are you ready?", farewell: "The light guides us both. We shall meet again at the end." },
    companionStats: { level: 28, hp: 260, mp: 100, baseDamage: 42, armorValue: 28 },
    questIds: ["main_quest"],
  },
  {
    id: "lady_of_the_lake", name: "The Lady of the Lake", title: "Guardian of Avalon", role: NPCRole.QuestGiver,
    regionId: "avalon", description: "A mysterious fae spirit who dwells in the waters of Avalon. She bestowed Excalibur upon Arthur and guides the worthy.",
    dialogue: { greeting: "The waters whisper your name, mortal. You seek something.", farewell: "Return when the waters call to you again." },
    questIds: ["main_quest", "scabbard_quest"],
  },
  {
    id: "blacksmith_camelot", name: "Aldric", title: "Royal Blacksmith", role: NPCRole.Merchant,
    regionId: "camelot", description: "Camelot's master smith. Aldric has forged weapons for the Round Table's finest and can improve nearly any piece of equipment.",
    dialogue: { greeting: "Need something forged or mended? You've come to the right place.", farewell: "Come back when you've dulled that blade, eh?" },
    merchantInventoryIds: ["iron_longsword", "steel_greatsword", "iron_shield", "iron_helm", "camelot_plate_chest", "camelot_plate_legs", "iron_boots", "iron_ingot", "steel_ingot"],
    trainableSkills: ["smithing"],
  },
  {
    id: "alchemist_glastonbury", name: "Sister Elara", title: "Herbalist of Glastonbury", role: NPCRole.Merchant,
    regionId: "glastonbury", description: "A learned nun who tends the herb gardens of Glastonbury Abbey. She brews potions and salves for pilgrims and adventurers alike.",
    dialogue: { greeting: "Blessings upon you. What ailment may I remedy today?", farewell: "Go in peace, and may these tonics serve you well." },
    merchantInventoryIds: ["health_potion_minor", "health_potion_major", "mana_potion_minor", "mana_potion_major", "stamina_potion", "mandrake_root", "wolfsbane", "elixir_of_strength"],
    trainableSkills: ["alchemy", "herbalism"],
  },
  {
    id: "enchanter_avalon", name: "Nimue", title: "Enchantress of Avalon", role: NPCRole.Merchant,
    regionId: "avalon", description: "A fae enchantress who learned her craft from Merlin himself. She offers rare magical goods to those who earn her favor.",
    dialogue: { greeting: "Few mortals find their way here. You must have need of my arts.", farewell: "The enchantments will serve you well. Do not squander them." },
    merchantInventoryIds: ["mana_potion_major", "moonstone", "soul_gem", "fire_sword", "frost_axe"],
    trainableSkills: ["enchanting"],
  },
  {
    id: "merchant_tintagel", name: "Brynn", title: "Tintagel Trader", role: NPCRole.Merchant,
    regionId: "tintagel", description: "A weathered sea merchant who trades goods from across the known world at Tintagel's clifftop market.",
    dialogue: { greeting: "Fresh stock from the continent! Come, have a look.", farewell: "Safe travels! And tell your friends where you got those fine goods." },
    merchantInventoryIds: ["ranger_leather_chest", "ranger_leather_legs", "leather_boots", "hunting_bow", "war_bow", "bread_loaf", "venison_stew", "mead_flask"],
  },
  {
    id: "bedivere", name: "Sir Bedivere", title: "Marshal of Camelot", role: NPCRole.Trainer,
    regionId: "camelot", description: "One of the oldest Knights of the Round Table. Bedivere is a seasoned warrior who trains new recruits in the arts of war.",
    dialogue: { greeting: "Ready to train? Steel is shaped by fire, and so are knights.", farewell: "Practice what I've taught you, and you'll survive what's out there." },
    trainableSkills: ["oneHanded", "twoHanded", "archery", "block", "heavyArmor", "lightArmor"],
  },
  {
    id: "morgan_npc", name: "Morgan le Fay", title: "The Enchantress", role: NPCRole.QuestGiver,
    regionId: "broceliande", description: "Arthur's half-sister, a powerful sorceress whose motives shift between aid and betrayal. She offers dark bargains to the bold.",
    dialogue: { greeting: "So, the king sends another pawn. Or have you come of your own will?", farewell: "We shall see if you survive what comes next. I do hope so." },
    questIds: ["morgan_quest"],
  },
  {
    id: "fisher_king", name: "The Fisher King", title: "Keeper of the Grail", role: NPCRole.QuestGiver,
    regionId: "corbenic", description: "The wounded guardian of the Grail Castle, cursed to suffer until a worthy knight asks the right question.",
    dialogue: { greeting: "You have come... at last. Ask, and you may heal this land.", farewell: "The wound persists. Perhaps next time, you will ask." },
    questIds: ["main_quest"],
  },
];

// ============================================================================
// 7. REGION DEFINITIONS
// ============================================================================

export interface RegionPOI {
  id: string;
  name: string;
  description: string;
  type: "town" | "dungeon" | "landmark" | "shrine" | "camp";
}

export interface RegionDef {
  id: string;
  name: string;
  description: string;
  terrain: TerrainType;
  levelRange: [number, number];
  enemyIds: string[];
  npcIds: string[];
  pointsOfInterest: RegionPOI[];
  connectedRegionIds: string[];
  ambientMusic?: string;
}

export const REGION_DEFS: RegionDef[] = [
  {
    id: "camelot", name: "Camelot", description: "The shining citadel of King Arthur, seat of the Round Table and heart of the realm. Its white towers can be seen for leagues.",
    terrain: TerrainType.Stone, levelRange: [1, 5],
    enemyIds: ["bandit"],
    npcIds: ["arthur", "merlin", "guinevere", "lancelot", "gawain", "percival", "blacksmith_camelot", "bedivere"],
    pointsOfInterest: [
      { id: "round_table_hall", name: "Round Table Hall", description: "The great hall where the knights convene. The Round Table seats 150.", type: "landmark" },
      { id: "camelot_forge", name: "Royal Forge", description: "Aldric's forge, where Camelot's finest weapons are crafted.", type: "town" },
      { id: "castle_chapel", name: "Castle Chapel", description: "A holy chapel where paladins receive their blessings.", type: "shrine" },
      { id: "training_grounds", name: "Training Grounds", description: "An open yard where knights spar and recruits are trained.", type: "town" },
    ],
    connectedRegionIds: ["glastonbury", "cornwall", "broceliande", "saxon_frontier"],
  },
  {
    id: "avalon", name: "Avalon", description: "The mystical isle shrouded in mist, home to the Lady of the Lake and the fae folk. Mortal time flows strangely here.",
    terrain: TerrainType.Water, levelRange: [15, 25],
    enemyIds: ["fae_knight", "enchanted_armor", "wraith"],
    npcIds: ["lady_of_the_lake", "enchanter_avalon"],
    pointsOfInterest: [
      { id: "lake_of_the_lady", name: "Lake of the Lady", description: "The enchanted lake from which Excalibur was bestowed.", type: "landmark" },
      { id: "fae_court", name: "Court of the Fae", description: "A glimmering hall of crystal and starlight where the fae hold court.", type: "town" },
      { id: "healing_springs", name: "Healing Springs", description: "Sacred waters that restore health and cure ailments.", type: "shrine" },
    ],
    connectedRegionIds: ["glastonbury", "broceliande"],
    ambientMusic: "avalon_mist",
  },
  {
    id: "broceliande", name: "Broceliande Forest", description: "An ancient enchanted forest where magic runs wild. Every tree whispers secrets, and paths shift when you look away.",
    terrain: TerrainType.Grass, levelRange: [8, 18],
    enemyIds: ["wolf", "giant_spider", "fae_knight", "bear"],
    npcIds: ["morgan_npc"],
    pointsOfInterest: [
      { id: "merlins_oak", name: "Merlin's Oak", description: "The ancient tree where Merlin was said to have been imprisoned by Nimue.", type: "landmark" },
      { id: "fairy_ring", name: "Fairy Ring", description: "A circle of mushrooms that serves as a portal between realms.", type: "shrine" },
      { id: "spider_caves", name: "Spider Caves", description: "Dark tunnels infested with giant spiders and their webs.", type: "dungeon" },
    ],
    connectedRegionIds: ["camelot", "avalon", "perilous_forest"],
    ambientMusic: "enchanted_forest",
  },
  {
    id: "tintagel", name: "Tintagel", description: "A windswept fortress perched on the Cornish cliffs, birthplace of Arthur. The castle ruins hold many secrets beneath the crashing waves.",
    terrain: TerrainType.Stone, levelRange: [5, 12],
    enemyIds: ["bandit", "bandit_archer", "skeleton", "saxon_warrior"],
    npcIds: ["merchant_tintagel"],
    pointsOfInterest: [
      { id: "tintagel_castle", name: "Tintagel Castle", description: "The crumbling fortress where Uther and Igraine conceived Arthur.", type: "landmark" },
      { id: "merlins_cave", name: "Merlin's Cave", description: "A sea cave beneath the castle, said to be where Merlin found the infant Arthur.", type: "dungeon" },
      { id: "cliff_market", name: "Cliff Market", description: "A bustling market where traders sell goods from across the sea.", type: "town" },
    ],
    connectedRegionIds: ["cornwall", "camelot"],
  },
  {
    id: "saxon_frontier", name: "Saxon Frontier", description: "The contested borderlands where Briton meets Saxon territory. Constant skirmishes rage across muddy fields and burned villages.",
    terrain: TerrainType.Dirt, levelRange: [10, 20],
    enemyIds: ["saxon_warrior", "saxon_archer", "saxon_champion"],
    npcIds: [],
    pointsOfInterest: [
      { id: "badon_hill", name: "Badon Hill", description: "The legendary battlefield where Arthur won his greatest victory against the Saxons.", type: "landmark" },
      { id: "saxon_war_camp", name: "Saxon War Camp", description: "A fortified encampment bristling with enemy warriors.", type: "camp" },
      { id: "burned_village", name: "Burned Village", description: "A Briton village razed by Saxon raiders. Survivors may need help.", type: "town" },
    ],
    connectedRegionIds: ["camelot", "wasteland"],
    ambientMusic: "war_drums",
  },
  {
    id: "glastonbury", name: "Glastonbury", description: "A land of rolling hills and sacred springs. The great abbey here is a center of learning, healing, and pilgrimage.",
    terrain: TerrainType.Grass, levelRange: [3, 8],
    enemyIds: ["bandit", "wolf", "wild_boar"],
    npcIds: ["alchemist_glastonbury"],
    pointsOfInterest: [
      { id: "glastonbury_abbey", name: "Glastonbury Abbey", description: "A grand abbey where monks preserve ancient knowledge.", type: "shrine" },
      { id: "glastonbury_tor", name: "Glastonbury Tor", description: "A towering hill capped by a ruined tower. Some say it is a gateway to the Otherworld.", type: "landmark" },
      { id: "chalice_well", name: "Chalice Well", description: "A sacred spring said to be connected to the Holy Grail.", type: "shrine" },
    ],
    connectedRegionIds: ["camelot", "avalon", "cornwall"],
  },
  {
    id: "wasteland", name: "The Wasteland", description: "A blighted land, cursed since the Fisher King was wounded. Nothing grows, and despair hangs in the air like fog.",
    terrain: TerrainType.Sand, levelRange: [20, 30],
    enemyIds: ["wraith", "skeleton", "troll", "dragon_whelp"],
    npcIds: [],
    pointsOfInterest: [
      { id: "blighted_ruins", name: "Blighted Ruins", description: "The remains of a once-prosperous town, now home to the undead.", type: "dungeon" },
      { id: "dead_lake", name: "Dead Lake", description: "A lifeless lake of still, grey water. Something stirs in its depths.", type: "landmark" },
      { id: "bone_cairn", name: "Bone Cairn", description: "A tower of bones erected by some dark ritual.", type: "dungeon" },
    ],
    connectedRegionIds: ["saxon_frontier", "corbenic", "perilous_forest"],
    ambientMusic: "desolation",
  },
  {
    id: "perilous_forest", name: "Perilous Forest", description: "A dark and treacherous woodland where the bravest knights go to prove their worth. Many enter; few return.",
    terrain: TerrainType.Swamp, levelRange: [15, 25],
    enemyIds: ["black_knight", "giant_spider", "troll", "bear", "wraith"],
    npcIds: [],
    pointsOfInterest: [
      { id: "green_chapel", name: "The Green Chapel", description: "A moss-covered chapel where the Green Knight awaits challengers.", type: "shrine" },
      { id: "troll_bridge", name: "Troll Bridge", description: "A stone bridge guarded by a territorial forest troll.", type: "landmark" },
      { id: "lost_knight_camp", name: "Lost Knight's Camp", description: "An abandoned campsite with the remains of a knight's equipment.", type: "camp" },
    ],
    connectedRegionIds: ["broceliande", "wasteland", "corbenic"],
    ambientMusic: "dark_woods",
  },
  {
    id: "corbenic", name: "Corbenic", description: "The mysterious Grail Castle, hidden beyond the Wasteland. Only the pure of heart can find its gates, and within lies the Holy Grail.",
    terrain: TerrainType.Stone, levelRange: [25, 35],
    enemyIds: ["enchanted_armor", "wraith", "fae_knight"],
    npcIds: ["galahad", "fisher_king"],
    pointsOfInterest: [
      { id: "grail_castle", name: "The Grail Castle", description: "A shimmering castle that appears and vanishes. The Holy Grail rests within its innermost chamber.", type: "landmark" },
      { id: "grail_chapel", name: "Grail Chapel", description: "A sacred chapel where the Grail procession occurs each night.", type: "shrine" },
      { id: "fisher_kings_hall", name: "Fisher King's Hall", description: "The great hall where the wounded king awaits healing.", type: "town" },
    ],
    connectedRegionIds: ["wasteland", "perilous_forest"],
    ambientMusic: "sacred_halls",
  },
  {
    id: "cornwall", name: "Cornwall", description: "A rugged coastal land of fishing villages, tin mines, and standing stones. The people here hold fast to the old ways.",
    terrain: TerrainType.Grass, levelRange: [4, 10],
    enemyIds: ["bandit", "bandit_archer", "wolf", "wild_boar", "skeleton"],
    npcIds: [],
    pointsOfInterest: [
      { id: "stone_circle", name: "Stone Circle", description: "An ancient ring of standing stones where druids once gathered.", type: "shrine" },
      { id: "tin_mine", name: "Cornish Tin Mine", description: "A deep mine that yields valuable ore but is rumored to be haunted.", type: "dungeon" },
      { id: "fishing_village", name: "Fishing Village", description: "A quiet hamlet where fishermen mend nets and share tales.", type: "town" },
    ],
    connectedRegionIds: ["tintagel", "camelot", "glastonbury"],
  },
];

// ============================================================================
// 8. MAIN QUEST STAGES
// ============================================================================

export interface QuestStage {
  id: string;
  stage: number;
  name: string;
  description: string;
  regionId: string;
  objectives: string[];
  rewardXp: number;
  rewardItemIds?: string[];
  requiredLevel?: number;
}

export const MAIN_QUEST_STAGES: QuestStage[] = [
  {
    id: "mq_01", stage: 1, name: "The Summoning", regionId: "camelot",
    description: "King Arthur summons you to the Round Table. Strange omens have appeared across the land, and the knights must ride forth.",
    objectives: ["Speak with King Arthur in the Round Table Hall", "Receive the royal commission"],
    rewardXp: 100,
  },
  {
    id: "mq_02", stage: 2, name: "Merlin's Counsel", regionId: "camelot",
    description: "Merlin reveals that the Holy Grail has stirred, sending visions to the worthy. He tasks you with gathering information.",
    objectives: ["Speak with Merlin in the castle tower", "Learn about the Grail's history", "Receive Merlin's enchanted compass"],
    rewardXp: 150,
  },
  {
    id: "mq_03", stage: 3, name: "The Road to Glastonbury", regionId: "glastonbury",
    description: "Merlin directs you to Glastonbury, where the monks guard ancient texts about the Grail. Bandits plague the road.",
    objectives: ["Travel to Glastonbury Abbey", "Defeat the bandits blocking the road", "Speak with the abbot"],
    rewardXp: 250, requiredLevel: 3,
  },
  {
    id: "mq_04", stage: 4, name: "The Chalice Well", regionId: "glastonbury",
    description: "The abbot reveals that the Chalice Well holds a vision for those who drink from it. Retrieve water from the sacred spring.",
    objectives: ["Collect water from the Chalice Well", "Drink the holy water", "Receive the Grail vision"],
    rewardXp: 300, rewardItemIds: ["grail_map_fragment"],
  },
  {
    id: "mq_05", stage: 5, name: "Tintagel's Secret", regionId: "tintagel",
    description: "The vision points to Tintagel, where a hidden chamber beneath the castle holds another map fragment.",
    objectives: ["Travel to Tintagel", "Explore Merlin's Cave", "Find the hidden chamber", "Retrieve the second map fragment"],
    rewardXp: 400, requiredLevel: 6,
  },
  {
    id: "mq_06", stage: 6, name: "The Enchanted Forest", regionId: "broceliande",
    description: "The assembled map fragments point toward Broceliande Forest. Morgan le Fay guards the next clue, and her price is steep.",
    objectives: ["Enter Broceliande Forest", "Find Morgan le Fay", "Complete Morgan's trial", "Obtain the forest key"],
    rewardXp: 500, requiredLevel: 10,
  },
  {
    id: "mq_07", stage: 7, name: "The Lady's Test", regionId: "avalon",
    description: "The forest key opens a path to Avalon. The Lady of the Lake will test your worthiness before revealing the next step.",
    objectives: ["Cross to the Isle of Avalon", "Speak with the Lady of the Lake", "Pass the three trials of worthiness"],
    rewardXp: 600, requiredLevel: 15,
  },
  {
    id: "mq_08", stage: 8, name: "The Sword Renewed", regionId: "avalon",
    description: "Having proven your worth, the Lady offers to reforge a legendary weapon for you or grant a powerful blessing.",
    objectives: ["Choose your reward: weapon or blessing", "Receive the Lady's gift", "Learn the location of the Grail path"],
    rewardXp: 700, rewardItemIds: ["caliburn"],
  },
  {
    id: "mq_09", stage: 9, name: "The Saxon Blockade", regionId: "saxon_frontier",
    description: "The path to the Grail passes through Saxon-held territory. You must break through their lines or find another way.",
    objectives: ["Reach the Saxon Frontier", "Defeat the Saxon war camp or find a way around", "Secure passage to the Wasteland"],
    rewardXp: 800, requiredLevel: 18,
  },
  {
    id: "mq_10", stage: 10, name: "The Green Knight's Challenge", regionId: "perilous_forest",
    description: "In the Perilous Forest, the Green Knight bars the path. He offers a deadly game: exchange blows, and the survivor passes.",
    objectives: ["Find the Green Chapel", "Accept the Green Knight's challenge", "Survive the exchange of blows", "Earn the Green Knight's respect"],
    rewardXp: 1000, requiredLevel: 22, rewardItemIds: ["green_knight_axe"],
  },
  {
    id: "mq_11", stage: 11, name: "Crossing the Wasteland", regionId: "wasteland",
    description: "The Wasteland stretches before you, a blighted land drained of life. Undead and worse roam the barren expanse.",
    objectives: ["Traverse the Wasteland", "Survive three nights in the blighted land", "Find the path to Corbenic"],
    rewardXp: 1200, requiredLevel: 25,
  },
  {
    id: "mq_12", stage: 12, name: "The Grail Castle Appears", regionId: "corbenic",
    description: "Through faith and perseverance, the Grail Castle manifests before you. Sir Galahad awaits at its gates.",
    objectives: ["Witness the appearance of Corbenic", "Meet Sir Galahad", "Enter the Grail Castle"],
    rewardXp: 1000, requiredLevel: 28,
  },
  {
    id: "mq_13", stage: 13, name: "The Fisher King's Question", regionId: "corbenic",
    description: "Within the castle, the Fisher King suffers from an eternal wound. Asking the right question could heal him and the land.",
    objectives: ["Attend the Grail procession", "Witness the sacred relics", "Ask the Fisher King the healing question"],
    rewardXp: 1500,
  },
  {
    id: "mq_14", stage: 14, name: "Mordred's Betrayal", regionId: "camelot",
    description: "As the Grail is nearly within reach, word comes that Mordred has seized Camelot. You must return to stop him.",
    objectives: ["Return to Camelot", "Rally the remaining knights", "Storm the castle gates", "Confront Mordred in the throne room"],
    rewardXp: 2000, requiredLevel: 30, rewardItemIds: ["clarent"],
  },
  {
    id: "mq_15", stage: 15, name: "The Holy Grail", regionId: "corbenic",
    description: "With Mordred defeated and the land healed, the Grail reveals itself to the worthy. The quest reaches its conclusion.",
    objectives: ["Return to Corbenic", "Enter the Grail Chapel", "Behold the Holy Grail", "Choose the Grail's fate"],
    rewardXp: 5000, rewardItemIds: ["holy_grail", "excalibur"],
  },
];

// ============================================================================
// 9. CRAFTING RECIPES
// ============================================================================

export interface CraftingRecipe {
  id: string;
  name: string;
  type: "smithing" | "alchemy" | "enchanting";
  requiredSkillLevel: number;
  ingredients: { itemId: string; quantity: number }[];
  resultItemId: string;
  resultQuantity: number;
  xpGained: number;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // ---- Smithing ----
  {
    id: "craft_iron_longsword", name: "Forge Iron Longsword", type: "smithing", requiredSkillLevel: 10,
    ingredients: [{ itemId: "iron_ingot", quantity: 3 }],
    resultItemId: "iron_longsword", resultQuantity: 1, xpGained: 30,
  },
  {
    id: "craft_iron_shield", name: "Forge Iron Shield", type: "smithing", requiredSkillLevel: 15,
    ingredients: [{ itemId: "iron_ingot", quantity: 4 }],
    resultItemId: "iron_shield", resultQuantity: 1, xpGained: 40,
  },
  {
    id: "craft_steel_greatsword", name: "Forge Steel Greatsword", type: "smithing", requiredSkillLevel: 30,
    ingredients: [{ itemId: "steel_ingot", quantity: 5 }],
    resultItemId: "steel_greatsword", resultQuantity: 1, xpGained: 80,
  },
  {
    id: "craft_camelot_plate_chest", name: "Forge Camelot Plate Cuirass", type: "smithing", requiredSkillLevel: 35,
    ingredients: [{ itemId: "steel_ingot", quantity: 6 }, { itemId: "iron_ingot", quantity: 2 }],
    resultItemId: "camelot_plate_chest", resultQuantity: 1, xpGained: 100,
  },

  // ---- Alchemy ----
  {
    id: "brew_health_minor", name: "Brew Minor Health Potion", type: "alchemy", requiredSkillLevel: 5,
    ingredients: [{ itemId: "mandrake_root", quantity: 1 }],
    resultItemId: "health_potion_minor", resultQuantity: 2, xpGained: 15,
  },
  {
    id: "brew_health_major", name: "Brew Major Health Potion", type: "alchemy", requiredSkillLevel: 25,
    ingredients: [{ itemId: "mandrake_root", quantity: 2 }, { itemId: "moonstone", quantity: 1 }],
    resultItemId: "health_potion_major", resultQuantity: 2, xpGained: 50,
  },
  {
    id: "brew_mana_minor", name: "Brew Minor Mana Potion", type: "alchemy", requiredSkillLevel: 10,
    ingredients: [{ itemId: "wolfsbane", quantity: 1 }, { itemId: "mandrake_root", quantity: 1 }],
    resultItemId: "mana_potion_minor", resultQuantity: 2, xpGained: 20,
  },
  {
    id: "brew_elixir_strength", name: "Brew Elixir of Strength", type: "alchemy", requiredSkillLevel: 40,
    ingredients: [{ itemId: "mandrake_root", quantity: 3 }, { itemId: "wolfsbane", quantity: 2 }],
    resultItemId: "elixir_of_strength", resultQuantity: 1, xpGained: 80,
  },

  // ---- Enchanting ----
  {
    id: "enchant_fire_sword", name: "Enchant Flamebrand", type: "enchanting", requiredSkillLevel: 35,
    ingredients: [{ itemId: "iron_longsword", quantity: 1 }, { itemId: "soul_gem", quantity: 1 }, { itemId: "moonstone", quantity: 1 }],
    resultItemId: "fire_sword", resultQuantity: 1, xpGained: 90,
  },
  {
    id: "enchant_frost_axe", name: "Enchant Frostbite Axe", type: "enchanting", requiredSkillLevel: 40,
    ingredients: [{ itemId: "steel_greatsword", quantity: 1 }, { itemId: "soul_gem", quantity: 2 }, { itemId: "moonstone", quantity: 1 }],
    resultItemId: "frost_axe", resultQuantity: 1, xpGained: 100,
  },
  {
    id: "enchant_round_table_shield", name: "Enchant Round Table Shield", type: "enchanting", requiredSkillLevel: 60,
    ingredients: [{ itemId: "iron_shield", quantity: 1 }, { itemId: "round_table_shard", quantity: 1 }, { itemId: "soul_gem", quantity: 3 }],
    resultItemId: "round_table_shield", resultQuantity: 1, xpGained: 200,
  },
];
