import {
  DiabloSkillDef,
  DiabloItem,
  DiabloMapConfig,
  DiabloSetBonus,
  DiabloClass,
  SkillId,
  ItemRarity,
  ItemSlot,
  ItemType,
  EnemyType,
  DamageType,
  DiabloMapId,
  StatusEffect,
  VendorType,
  DiabloDifficulty,
  BossAbility,
  BossPhaseConfig,
  EnemyBehavior,
  TalentNode,
  TalentEffectType,
  DiabloPotion,
  PotionType,
  DiabloQuest,
  QuestType,
  MapCompletionReward,
  CraftingRecipe,
  CraftType,
  TimeOfDay,
} from './DiabloTypes';

// ---------------------------------------------------------------------------
//  1. SKILL DEFINITIONS
// ---------------------------------------------------------------------------

export const SKILL_DEFS: Record<SkillId, DiabloSkillDef> = {
  // ---- Warrior skills ----
  [SkillId.CLEAVE]: {
    id: SkillId.CLEAVE,
    name: 'Cleave',
    description: 'Slash in a wide arc, striking all enemies before you.',
    cooldown: 3,
    manaCost: 15,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 1.5,
    range: 3,
    aoeRadius: 2.5,
    icon: '⚔️',
    class: DiabloClass.WARRIOR,
  },
  [SkillId.SHIELD_BASH]: {
    id: SkillId.SHIELD_BASH,
    name: 'Shield Bash',
    description: 'Bash an enemy with your shield, stunning them.',
    cooldown: 5,
    manaCost: 20,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 1.2,
    range: 2,
    statusEffect: StatusEffect.STUNNED,
    duration: 2,
    icon: '🛡️',
    class: DiabloClass.WARRIOR,
  },
  [SkillId.WHIRLWIND]: {
    id: SkillId.WHIRLWIND,
    name: 'Whirlwind',
    description: 'Spin furiously, hitting all nearby enemies.',
    cooldown: 8,
    manaCost: 35,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 2.0,
    range: 1,
    aoeRadius: 4,
    icon: '🌀',
    class: DiabloClass.WARRIOR,
  },
  [SkillId.BATTLE_CRY]: {
    id: SkillId.BATTLE_CRY,
    name: 'Battle Cry',
    description: 'Let out a fearsome war cry, boosting your damage by 30% for 10 seconds.',
    cooldown: 20,
    manaCost: 25,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 0,
    range: 0,
    duration: 10,
    icon: '📯',
    class: DiabloClass.WARRIOR,
  },
  [SkillId.GROUND_SLAM]: {
    id: SkillId.GROUND_SLAM,
    name: 'Ground Slam',
    description: 'Slam the ground, sending a shockwave that damages and knocks back enemies.',
    cooldown: 10,
    manaCost: 40,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 2.5,
    range: 6,
    aoeRadius: 3,
    icon: '💥',
    class: DiabloClass.WARRIOR,
  },
  [SkillId.BLADE_FURY]: {
    id: SkillId.BLADE_FURY,
    name: 'Blade Fury',
    description: 'Unleash a flurry of rapid slashes, shredding everything in reach.',
    cooldown: 12,
    manaCost: 45,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 3.0,
    range: 2,
    aoeRadius: 2,
    icon: '🗡️',
    class: DiabloClass.WARRIOR,
  },

  // ---- Mage skills ----
  [SkillId.FIREBALL]: {
    id: SkillId.FIREBALL,
    name: 'Fireball',
    description: 'Hurl a ball of fire that explodes on impact.',
    cooldown: 2,
    manaCost: 20,
    damageType: DamageType.FIRE,
    damageMultiplier: 2.0,
    range: 15,
    aoeRadius: 3,
    statusEffect: StatusEffect.BURNING,
    icon: '🔥',
    class: DiabloClass.MAGE,
  },
  [SkillId.ICE_NOVA]: {
    id: SkillId.ICE_NOVA,
    name: 'Ice Nova',
    description: 'Release a freezing ring of ice around the caster.',
    cooldown: 6,
    manaCost: 30,
    damageType: DamageType.ICE,
    damageMultiplier: 1.8,
    range: 1,
    aoeRadius: 5,
    statusEffect: StatusEffect.FROZEN,
    icon: '❄️',
    class: DiabloClass.MAGE,
  },
  [SkillId.LIGHTNING_BOLT]: {
    id: SkillId.LIGHTNING_BOLT,
    name: 'Lightning Bolt',
    description: 'Fire a fast bolt of lightning at a single target.',
    cooldown: 1.5,
    manaCost: 15,
    damageType: DamageType.LIGHTNING,
    damageMultiplier: 1.5,
    range: 20,
    statusEffect: StatusEffect.SHOCKED,
    icon: '⚡',
    class: DiabloClass.MAGE,
  },
  [SkillId.METEOR]: {
    id: SkillId.METEOR,
    name: 'Meteor',
    description: 'Call down a massive meteor from the sky after a short delay.',
    cooldown: 15,
    manaCost: 60,
    damageType: DamageType.FIRE,
    damageMultiplier: 4.0,
    range: 12,
    aoeRadius: 6,
    statusEffect: StatusEffect.BURNING,
    icon: '☄️',
    class: DiabloClass.MAGE,
  },
  [SkillId.ARCANE_SHIELD]: {
    id: SkillId.ARCANE_SHIELD,
    name: 'Arcane Shield',
    description: 'Conjure a magical barrier that absorbs 200 damage for 8 seconds.',
    cooldown: 12,
    manaCost: 35,
    damageType: DamageType.ARCANE,
    damageMultiplier: 0,
    range: 0,
    duration: 8,
    icon: '🔮',
    class: DiabloClass.MAGE,
  },
  [SkillId.CHAIN_LIGHTNING]: {
    id: SkillId.CHAIN_LIGHTNING,
    name: 'Chain Lightning',
    description: 'Cast a bolt of lightning that bounces between up to 5 targets.',
    cooldown: 8,
    manaCost: 40,
    damageType: DamageType.LIGHTNING,
    damageMultiplier: 2.5,
    range: 15,
    statusEffect: StatusEffect.SHOCKED,
    icon: '⛈️',
    class: DiabloClass.MAGE,
  },

  // ---- Ranger skills ----
  [SkillId.MULTI_SHOT]: {
    id: SkillId.MULTI_SHOT,
    name: 'Multi Shot',
    description: 'Fire 5 arrows in a fan pattern.',
    cooldown: 3,
    manaCost: 20,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 1.2,
    range: 18,
    icon: '🏹',
    class: DiabloClass.RANGER,
  },
  [SkillId.RAIN_OF_ARROWS]: {
    id: SkillId.RAIN_OF_ARROWS,
    name: 'Rain of Arrows',
    description: 'Call down a barrage of arrows over a large area.',
    cooldown: 10,
    manaCost: 40,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 2.0,
    range: 15,
    aoeRadius: 6,
    icon: '🌧️',
    class: DiabloClass.RANGER,
  },
  [SkillId.POISON_ARROW]: {
    id: SkillId.POISON_ARROW,
    name: 'Poison Arrow',
    description: 'Shoot an arrow coated in deadly venom, dealing damage over time.',
    cooldown: 4,
    manaCost: 15,
    damageType: DamageType.POISON,
    damageMultiplier: 1.0,
    range: 20,
    statusEffect: StatusEffect.POISONED,
    icon: '☠️',
    class: DiabloClass.RANGER,
  },
  [SkillId.EVASIVE_ROLL]: {
    id: SkillId.EVASIVE_ROLL,
    name: 'Evasive Roll',
    description: 'Perform a dodge roll, gaining brief invulnerability.',
    cooldown: 5,
    manaCost: 10,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 0,
    range: 0,
    duration: 0.8,
    icon: '💨',
    class: DiabloClass.RANGER,
  },
  [SkillId.EXPLOSIVE_TRAP]: {
    id: SkillId.EXPLOSIVE_TRAP,
    name: 'Explosive Trap',
    description: 'Place a hidden trap that detonates when an enemy approaches.',
    cooldown: 8,
    manaCost: 25,
    damageType: DamageType.FIRE,
    damageMultiplier: 2.5,
    range: 2,
    aoeRadius: 4,
    icon: '💣',
    class: DiabloClass.RANGER,
  },
  [SkillId.PIERCING_SHOT]: {
    id: SkillId.PIERCING_SHOT,
    name: 'Piercing Shot',
    description: 'Fire a powerful arrow that penetrates all enemies in a straight line.',
    cooldown: 6,
    manaCost: 30,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 2.0,
    range: 25,
    icon: '🎯',
    class: DiabloClass.RANGER,
  },

  // ---- Warrior unlockable skills ----
  [SkillId.LEAP]: {
    id: SkillId.LEAP,
    name: 'Heroic Leap',
    description: 'Leap through the air and crash down on enemies, dealing AOE damage on landing.',
    cooldown: 8,
    manaCost: 25,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 2.0,
    range: 12,
    aoeRadius: 4,
    statusEffect: StatusEffect.STUNNED,
    duration: 1,
    icon: '🦅',
    class: DiabloClass.WARRIOR,
  },
  [SkillId.IRON_SKIN]: {
    id: SkillId.IRON_SKIN,
    name: 'Iron Skin',
    description: 'Harden your body like steel, gaining massive armor for 8 seconds.',
    cooldown: 15,
    manaCost: 20,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 0,
    range: 0,
    duration: 8,
    icon: '🛡️',
    class: DiabloClass.WARRIOR,
  },
  [SkillId.TAUNT]: {
    id: SkillId.TAUNT,
    name: 'Taunt',
    description: 'Force all nearby enemies to focus their attacks on you for 5 seconds.',
    cooldown: 12,
    manaCost: 15,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 0,
    range: 0,
    aoeRadius: 8,
    duration: 5,
    icon: '😤',
    class: DiabloClass.WARRIOR,
  },
  [SkillId.CRUSHING_BLOW]: {
    id: SkillId.CRUSHING_BLOW,
    name: 'Crushing Blow',
    description: 'A devastating overhead strike that deals massive damage to a single target.',
    cooldown: 6,
    manaCost: 30,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 3.5,
    range: 2.5,
    icon: '🔨',
    class: DiabloClass.WARRIOR,
  },
  [SkillId.INTIMIDATING_ROAR]: {
    id: SkillId.INTIMIDATING_ROAR,
    name: 'Intimidating Roar',
    description: 'Unleash a terrifying roar that weakens and slows all nearby enemies.',
    cooldown: 18,
    manaCost: 30,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 0.5,
    range: 0,
    aoeRadius: 7,
    statusEffect: StatusEffect.WEAKENED,
    duration: 6,
    icon: '🦁',
    class: DiabloClass.WARRIOR,
  },
  [SkillId.EARTHQUAKE]: {
    id: SkillId.EARTHQUAKE,
    name: 'Earthquake',
    description: 'Split the earth beneath your feet, dealing massive damage in a huge radius.',
    cooldown: 20,
    manaCost: 55,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 3.5,
    range: 0,
    aoeRadius: 10,
    statusEffect: StatusEffect.STUNNED,
    duration: 2,
    icon: '🌍',
    class: DiabloClass.WARRIOR,
  },

  // ---- Mage unlockable skills ----
  [SkillId.SUMMON_ELEMENTAL]: {
    id: SkillId.SUMMON_ELEMENTAL,
    name: 'Summon Elemental',
    description: 'Summon a fire elemental that fights by your side for 15 seconds.',
    cooldown: 25,
    manaCost: 50,
    damageType: DamageType.FIRE,
    damageMultiplier: 1.5,
    range: 3,
    duration: 15,
    icon: '🔥',
    class: DiabloClass.MAGE,
  },
  [SkillId.BLINK]: {
    id: SkillId.BLINK,
    name: 'Blink',
    description: 'Instantly teleport to the target location, leaving a trail of arcane energy.',
    cooldown: 6,
    manaCost: 20,
    damageType: DamageType.ARCANE,
    damageMultiplier: 0.8,
    range: 15,
    aoeRadius: 2,
    icon: '✨',
    class: DiabloClass.MAGE,
  },
  [SkillId.FROST_BARRIER]: {
    id: SkillId.FROST_BARRIER,
    name: 'Frost Barrier',
    description: 'Erect a ring of ice that damages and freezes enemies who enter it.',
    cooldown: 14,
    manaCost: 35,
    damageType: DamageType.ICE,
    damageMultiplier: 1.2,
    range: 0,
    aoeRadius: 5,
    statusEffect: StatusEffect.FROZEN,
    duration: 6,
    icon: '🧊',
    class: DiabloClass.MAGE,
  },
  [SkillId.ARCANE_MISSILES]: {
    id: SkillId.ARCANE_MISSILES,
    name: 'Arcane Missiles',
    description: 'Launch a volley of 5 homing arcane projectiles at nearby enemies.',
    cooldown: 4,
    manaCost: 25,
    damageType: DamageType.ARCANE,
    damageMultiplier: 1.0,
    range: 18,
    icon: '💜',
    class: DiabloClass.MAGE,
  },
  [SkillId.MANA_SIPHON]: {
    id: SkillId.MANA_SIPHON,
    name: 'Mana Siphon',
    description: 'Drain life force from enemies, converting it into mana and health.',
    cooldown: 10,
    manaCost: 10,
    damageType: DamageType.ARCANE,
    damageMultiplier: 1.5,
    range: 0,
    aoeRadius: 6,
    icon: '🌀',
    class: DiabloClass.MAGE,
  },
  [SkillId.TIME_WARP]: {
    id: SkillId.TIME_WARP,
    name: 'Time Warp',
    description: 'Slow all enemies in a large area to a crawl for 6 seconds.',
    cooldown: 22,
    manaCost: 45,
    damageType: DamageType.ARCANE,
    damageMultiplier: 0.5,
    range: 0,
    aoeRadius: 10,
    statusEffect: StatusEffect.SLOWED,
    duration: 6,
    icon: '⏳',
    class: DiabloClass.MAGE,
  },

  // ---- Ranger unlockable skills ----
  [SkillId.GRAPPLING_HOOK]: {
    id: SkillId.GRAPPLING_HOOK,
    name: 'Grappling Hook',
    description: 'Launch a hook and pull yourself to the target location at high speed.',
    cooldown: 7,
    manaCost: 15,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 1.0,
    range: 15,
    icon: '🪝',
    class: DiabloClass.RANGER,
  },
  [SkillId.CAMOUFLAGE]: {
    id: SkillId.CAMOUFLAGE,
    name: 'Camouflage',
    description: 'Blend into the surroundings, becoming invisible for 5 seconds. Next attack deals double.',
    cooldown: 16,
    manaCost: 20,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 0,
    range: 0,
    duration: 5,
    icon: '🌿',
    class: DiabloClass.RANGER,
  },
  [SkillId.NET_TRAP]: {
    id: SkillId.NET_TRAP,
    name: 'Net Trap',
    description: 'Throw a net that roots all enemies in the area for 3 seconds.',
    cooldown: 10,
    manaCost: 20,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 0.5,
    range: 12,
    aoeRadius: 5,
    statusEffect: StatusEffect.STUNNED,
    duration: 3,
    icon: '🕸️',
    class: DiabloClass.RANGER,
  },
  [SkillId.FIRE_VOLLEY]: {
    id: SkillId.FIRE_VOLLEY,
    name: 'Fire Volley',
    description: 'Ignite your arrows and fire a rapid burst of 7 flaming projectiles.',
    cooldown: 8,
    manaCost: 35,
    damageType: DamageType.FIRE,
    damageMultiplier: 1.3,
    range: 18,
    statusEffect: StatusEffect.BURNING,
    icon: '🔥',
    class: DiabloClass.RANGER,
  },
  [SkillId.WIND_WALK]: {
    id: SkillId.WIND_WALK,
    name: 'Wind Walk',
    description: 'Become one with the wind, gaining 80% movement speed and dodge chance for 5 seconds.',
    cooldown: 14,
    manaCost: 25,
    damageType: DamageType.PHYSICAL,
    damageMultiplier: 0,
    range: 0,
    duration: 5,
    icon: '💨',
    class: DiabloClass.RANGER,
  },
  [SkillId.SHADOW_STRIKE]: {
    id: SkillId.SHADOW_STRIKE,
    name: 'Shadow Strike',
    description: 'Vanish and reappear behind the nearest enemy, delivering a devastating backstab.',
    cooldown: 10,
    manaCost: 30,
    damageType: DamageType.SHADOW,
    damageMultiplier: 3.0,
    range: 12,
    icon: '🗡️',
    class: DiabloClass.RANGER,
  },
};

// ---------------------------------------------------------------------------
//  1b. UNLOCKABLE SKILLS PER CLASS (unlock order, 1 every 3 levels)
// ---------------------------------------------------------------------------

export const UNLOCKABLE_SKILLS: Record<DiabloClass, { skillId: SkillId; level: number }[]> = {
  [DiabloClass.WARRIOR]: [
    { skillId: SkillId.LEAP, level: 3 },
    { skillId: SkillId.IRON_SKIN, level: 6 },
    { skillId: SkillId.TAUNT, level: 9 },
    { skillId: SkillId.CRUSHING_BLOW, level: 12 },
    { skillId: SkillId.INTIMIDATING_ROAR, level: 15 },
    { skillId: SkillId.EARTHQUAKE, level: 18 },
  ],
  [DiabloClass.MAGE]: [
    { skillId: SkillId.SUMMON_ELEMENTAL, level: 3 },
    { skillId: SkillId.BLINK, level: 6 },
    { skillId: SkillId.FROST_BARRIER, level: 9 },
    { skillId: SkillId.ARCANE_MISSILES, level: 12 },
    { skillId: SkillId.MANA_SIPHON, level: 15 },
    { skillId: SkillId.TIME_WARP, level: 18 },
  ],
  [DiabloClass.RANGER]: [
    { skillId: SkillId.GRAPPLING_HOOK, level: 3 },
    { skillId: SkillId.CAMOUFLAGE, level: 6 },
    { skillId: SkillId.NET_TRAP, level: 9 },
    { skillId: SkillId.FIRE_VOLLEY, level: 12 },
    { skillId: SkillId.WIND_WALK, level: 15 },
    { skillId: SkillId.SHADOW_STRIKE, level: 18 },
  ],
};

// ---------------------------------------------------------------------------
//  2. MAP CONFIGURATIONS
// ---------------------------------------------------------------------------

export const MAP_CONFIGS: Record<DiabloMapId, DiabloMapConfig> = {
  [DiabloMapId.FOREST]: {
    id: DiabloMapId.FOREST,
    name: 'Darkwood Forest',
    description: 'A dark and foreboding forest filled with dangerous creatures.',
    width: 120,
    depth: 120,
    enemyTypes: [
      EnemyType.WOLF,
      EnemyType.BANDIT,
      EnemyType.BEAR,
      EnemyType.FOREST_SPIDER,
      EnemyType.TREANT,
      EnemyType.MOSSY_LURKER,
      EnemyType.DIRE_STAG,
      EnemyType.WOODLAND_WISP,
    ],
    maxEnemies: 25,
    spawnInterval: 5,
    treasureCount: 3,
    ambientColor: '#224422',
    groundColor: '#335533',
    fogDensity: 0.015,
    fogColor: '#88aa88',
    backgroundMusic: 'forest_ambient',
  },
  [DiabloMapId.ELVEN_VILLAGE]: {
    id: DiabloMapId.ELVEN_VILLAGE,
    name: 'Aelindor - Elven Village',
    description: 'A corrupted elven village overrun by dark forces.',
    width: 100,
    depth: 100,
    enemyTypes: [
      EnemyType.CORRUPTED_ELF,
      EnemyType.DARK_RANGER,
      EnemyType.SHADOW_BEAST,
      EnemyType.CORRUPTED_SENTINEL,
      EnemyType.GLOOM_ARCHER,
      EnemyType.FEY_ABOMINATION,
    ],
    maxEnemies: 20,
    spawnInterval: 6,
    treasureCount: 4,
    ambientColor: '#225544',
    groundColor: '#336655',
    fogDensity: 0.025,
    fogColor: '#77bbaa',
    backgroundMusic: 'elven_ruins',
  },
  [DiabloMapId.NECROPOLIS_DUNGEON]: {
    id: DiabloMapId.NECROPOLIS_DUNGEON,
    name: 'Necropolis Depths',
    description: 'The deep dungeon of the Necropolis, crawling with undead horrors.',
    width: 80,
    depth: 80,
    enemyTypes: [
      EnemyType.SKELETON_WARRIOR,
      EnemyType.ZOMBIE,
      EnemyType.NECROMANCER,
      EnemyType.BONE_GOLEM,
      EnemyType.WRAITH,
      EnemyType.CRYPT_SHADE,
      EnemyType.BONE_ARCHER,
      EnemyType.LICH_ACOLYTE,
    ],
    maxEnemies: 30,
    spawnInterval: 4,
    treasureCount: 5,
    ambientColor: '#221133',
    groundColor: '#333344',
    fogDensity: 0.04,
    fogColor: '#443355',
    backgroundMusic: 'dungeon_depths',
  },
  [DiabloMapId.VOLCANIC_WASTES]: {
    id: DiabloMapId.VOLCANIC_WASTES,
    name: 'Volcanic Wastes',
    description: 'A scorched hellscape of molten rivers and ash storms. Demons forged in flame patrol the burning ruins.',
    width: 110,
    depth: 110,
    enemyTypes: [
      EnemyType.FIRE_IMP,
      EnemyType.LAVA_ELEMENTAL,
      EnemyType.INFERNAL_KNIGHT,
      EnemyType.MAGMA_SERPENT,
      EnemyType.MOLTEN_COLOSSUS,
      EnemyType.EMBER_FIEND,
      EnemyType.VOLCANIC_SCORPION,
      EnemyType.ASH_WRAITH,
    ],
    maxEnemies: 30,
    spawnInterval: 4,
    treasureCount: 4,
    ambientColor: '#442211',
    groundColor: '#332211',
    fogDensity: 0.02,
    fogColor: '#663322',
    backgroundMusic: 'volcanic_wastes',
  },
  [DiabloMapId.ABYSSAL_RIFT]: {
    id: DiabloMapId.ABYSSAL_RIFT,
    name: 'Abyssal Rift',
    description: 'A tear in reality where the void bleeds through. Eldritch horrors drift between shattered islands of stone.',
    width: 90,
    depth: 90,
    enemyTypes: [
      EnemyType.VOID_STALKER,
      EnemyType.SHADOW_WEAVER,
      EnemyType.ABYSSAL_HORROR,
      EnemyType.RIFT_WALKER,
      EnemyType.ENTROPY_LORD,
      EnemyType.VOID_TENDRIL,
      EnemyType.RIFT_SCREAMER,
      EnemyType.DIMENSIONAL_STALKER,
    ],
    maxEnemies: 35,
    spawnInterval: 3.5,
    treasureCount: 5,
    ambientColor: '#110022',
    groundColor: '#1a0a2e',
    fogDensity: 0.035,
    fogColor: '#220044',
    backgroundMusic: 'abyssal_rift',
  },
  [DiabloMapId.DRAGONS_SANCTUM]: {
    id: DiabloMapId.DRAGONS_SANCTUM,
    name: "Dragon's Sanctum",
    description: 'The ancient lair of the Elder Dragons. Gold-encrusted caverns echo with primordial fury.',
    width: 130,
    depth: 130,
    enemyTypes: [
      EnemyType.DRAGONKIN_WARRIOR,
      EnemyType.WYRM_PRIEST,
      EnemyType.DRAKE_GUARDIAN,
      EnemyType.DRAGON_WHELP,
      EnemyType.ELDER_DRAGON,
      EnemyType.SCALED_SORCERER,
      EnemyType.DRAGONSPAWN_BERSERKER,
      EnemyType.FLAME_HERALD,
    ],
    maxEnemies: 28,
    spawnInterval: 4.5,
    treasureCount: 6,
    ambientColor: '#332200',
    groundColor: '#443311',
    fogDensity: 0.015,
    fogColor: '#554422',
    backgroundMusic: 'dragons_sanctum',
  },
  [DiabloMapId.SUNSCORCH_DESERT]: {
    id: DiabloMapId.SUNSCORCH_DESERT,
    name: 'Sunscorch Desert',
    description: 'A vast expanse of sun-blasted dunes and ancient ruins half-buried in sand.',
    width: 140,
    depth: 140,
    enemyTypes: [
      EnemyType.SAND_SCORPION,
      EnemyType.DESERT_BANDIT,
      EnemyType.SAND_WURM,
      EnemyType.DUST_WRAITH,
      EnemyType.SAND_GOLEM,
      EnemyType.DUNE_REAVER,
      EnemyType.SANDSTORM_ELEMENTAL,
      EnemyType.OASIS_SERPENT,
    ],
    maxEnemies: 22,
    spawnInterval: 5,
    treasureCount: 4,
    ambientColor: '#665533',
    groundColor: '#ccaa66',
    fogDensity: 0.008,
    fogColor: '#ddcc99',
    backgroundMusic: 'desert_winds',
  },
  [DiabloMapId.EMERALD_GRASSLANDS]: {
    id: DiabloMapId.EMERALD_GRASSLANDS,
    name: 'Emerald Grasslands',
    description: 'Rolling green hills dotted with wildflowers. Raiders and wild beasts roam the open plains.',
    width: 150,
    depth: 150,
    enemyTypes: [
      EnemyType.WILD_BOAR,
      EnemyType.PLAINS_RAIDER,
      EnemyType.GIANT_HAWK,
      EnemyType.BISON_BEAST,
      EnemyType.CENTAUR_WARCHIEF,
      EnemyType.STEPPE_STALKER,
      EnemyType.THUNDER_RAM,
      EnemyType.PRAIRIE_WITCH,
    ],
    maxEnemies: 20,
    spawnInterval: 6,
    treasureCount: 3,
    ambientColor: '#336622',
    groundColor: '#55aa33',
    fogDensity: 0.006,
    fogColor: '#aaccaa',
    backgroundMusic: 'grassland_breeze',
  },
  [DiabloMapId.WHISPERING_MARSH]: {
    id: DiabloMapId.WHISPERING_MARSH,
    name: 'Whispering Marsh',
    description: 'A fog-choked swampland where poisonous gases rise from stagnant pools. Ancient horrors lurk beneath the murk.',
    width: 130, depth: 130,
    enemyTypes: [EnemyType.BOG_LURKER, EnemyType.MARSH_HAG, EnemyType.TOXIC_TOAD, EnemyType.SWAMP_VINE, EnemyType.HYDRA_MATRIARCH, EnemyType.FEN_CRAWLER, EnemyType.MIRE_SPECTER, EnemyType.LEECH_SWARM],
    maxEnemies: 22, spawnInterval: 5, treasureCount: 3,
    ambientColor: '#2a3a22', groundColor: '#3b4a2b', fogDensity: 0.025, fogColor: '#556644',
    backgroundMusic: 'marsh_ambient',
  },
  [DiabloMapId.CRYSTAL_CAVERNS]: {
    id: DiabloMapId.CRYSTAL_CAVERNS,
    name: 'Crystal Caverns',
    description: 'Vast underground chambers lined with luminous crystals. The refracted light reveals dangers hidden in every shadow.',
    width: 100, depth: 100,
    enemyTypes: [EnemyType.CRYSTAL_SPIDER, EnemyType.GEM_GOLEM, EnemyType.CAVE_BAT_SWARM, EnemyType.QUARTZ_ELEMENTAL, EnemyType.PRISMATIC_WYRM, EnemyType.SHARD_SENTINEL, EnemyType.GEODE_BEETLE, EnemyType.CRYSTAL_SHADE],
    maxEnemies: 24, spawnInterval: 5, treasureCount: 5,
    ambientColor: '#223355', groundColor: '#334466', fogDensity: 0.02, fogColor: '#445577',
    backgroundMusic: 'cavern_echoes',
  },
  [DiabloMapId.FROZEN_TUNDRA]: {
    id: DiabloMapId.FROZEN_TUNDRA,
    name: 'Frozen Tundra',
    description: 'An endless expanse of ice and snow battered by howling blizzards. Frostbitten beasts prowl the whiteout.',
    width: 140, depth: 140,
    enemyTypes: [EnemyType.FROST_WOLF, EnemyType.ICE_WRAITH, EnemyType.YETI, EnemyType.FROZEN_REVENANT, EnemyType.GLACIAL_TITAN, EnemyType.PERMAFROST_SPIDER, EnemyType.BLIZZARD_PHANTOM, EnemyType.FROST_TROLL],
    maxEnemies: 26, spawnInterval: 4.5, treasureCount: 4,
    ambientColor: '#334455', groundColor: '#aabbcc', fogDensity: 0.018, fogColor: '#bbccdd',
    backgroundMusic: 'tundra_wind',
  },
  [DiabloMapId.HAUNTED_CATHEDRAL]: {
    id: DiabloMapId.HAUNTED_CATHEDRAL,
    name: 'Haunted Cathedral',
    description: 'A once-holy cathedral now desecrated by dark rituals. Spectral choirs echo through shattered stained glass.',
    width: 90, depth: 90,
    enemyTypes: [EnemyType.PHANTOM_KNIGHT, EnemyType.GARGOYLE, EnemyType.CURSED_PRIEST, EnemyType.SHADOW_ACOLYTE, EnemyType.CATHEDRAL_DEMON, EnemyType.BELL_WRAITH, EnemyType.DESECRATED_MONK, EnemyType.STAINED_GLASS_GOLEM],
    maxEnemies: 28, spawnInterval: 4, treasureCount: 4,
    ambientColor: '#2a2233', groundColor: '#3a3344', fogDensity: 0.03, fogColor: '#443355',
    backgroundMusic: 'cathedral_requiem',
  },
  [DiabloMapId.THORNWOOD_THICKET]: {
    id: DiabloMapId.THORNWOOD_THICKET,
    name: 'Thornwood Thicket',
    description: 'A twisted maze of thorny brambles and blighted trees. The corruption here runs deeper than root and soil.',
    width: 110, depth: 110,
    enemyTypes: [EnemyType.THORN_CRAWLER, EnemyType.BLIGHT_SPRITE, EnemyType.FUNGAL_BRUTE, EnemyType.ROTWOOD_LICH, EnemyType.THORNMOTHER, EnemyType.BRIAR_WOLF, EnemyType.SPORE_MOTH, EnemyType.NETTLE_ELEMENTAL],
    maxEnemies: 28, spawnInterval: 4.5, treasureCount: 4,
    ambientColor: '#2a3322', groundColor: '#3a2a22', fogDensity: 0.022, fogColor: '#554433',
    backgroundMusic: 'thornwood_whispers',
  },
  [DiabloMapId.CLOCKWORK_FOUNDRY]: {
    id: DiabloMapId.CLOCKWORK_FOUNDRY,
    name: 'Clockwork Foundry',
    description: 'An ancient dwarven forge overrun by malfunctioning automatons. Steam hisses from cracked pipes as gears grind endlessly.',
    width: 100, depth: 100,
    enemyTypes: [EnemyType.CLOCKWORK_SOLDIER, EnemyType.STEAM_GOLEM, EnemyType.GEAR_SPIDER, EnemyType.FORGE_MASTER, EnemyType.IRON_COLOSSUS, EnemyType.BRASS_BEETLE, EnemyType.PISTON_GOLEM, EnemyType.ARC_DRONE],
    maxEnemies: 32, spawnInterval: 3.5, treasureCount: 5,
    ambientColor: '#3a3322', groundColor: '#4a4433', fogDensity: 0.015, fogColor: '#665544',
    backgroundMusic: 'foundry_machinery',
  },
  [DiabloMapId.CRIMSON_CITADEL]: {
    id: DiabloMapId.CRIMSON_CITADEL,
    name: 'Crimson Citadel',
    description: 'A blood-soaked fortress where vampiric lords feast on the living. The walls weep crimson and the air tastes of iron.',
    width: 110, depth: 110,
    enemyTypes: [EnemyType.BLOOD_KNIGHT, EnemyType.CRIMSON_MAGE, EnemyType.GARGOYLE_SENTINEL, EnemyType.BLOOD_FIEND, EnemyType.VAMPIRE_LORD, EnemyType.BLOODTHORN_BAT, EnemyType.SCARLET_ASSASSIN, EnemyType.CRIMSON_SHADE],
    maxEnemies: 30, spawnInterval: 4, treasureCount: 5,
    ambientColor: '#3a1122', groundColor: '#4a2233', fogDensity: 0.02, fogColor: '#552233',
    backgroundMusic: 'citadel_dirge',
  },
  [DiabloMapId.STORMSPIRE_PEAK]: {
    id: DiabloMapId.STORMSPIRE_PEAK,
    name: 'Stormspire Peak',
    description: 'The highest summit in the realm, perpetually wracked by lightning storms. Wind elementals guard the peak with fury.',
    width: 120, depth: 120,
    enemyTypes: [EnemyType.STORM_HARPY, EnemyType.THUNDER_ELEMENTAL, EnemyType.LIGHTNING_DRAKE, EnemyType.WIND_SHAMAN, EnemyType.TEMPEST_TITAN, EnemyType.GALE_FALCON, EnemyType.STATIC_GOLEM, EnemyType.STORM_CALLER],
    maxEnemies: 30, spawnInterval: 4, treasureCount: 5,
    ambientColor: '#334455', groundColor: '#556677', fogDensity: 0.012, fogColor: '#778899',
    backgroundMusic: 'stormspire_thunder',
  },
  [DiabloMapId.SHADOW_REALM]: {
    id: DiabloMapId.SHADOW_REALM,
    name: 'Shadow Realm',
    description: 'A nightmare dimension where reality fractures and terror takes form. Your deepest fears hunt you here.',
    width: 100, depth: 100,
    enemyTypes: [EnemyType.NIGHTMARE_STALKER, EnemyType.DREAD_PHANTOM, EnemyType.SOUL_DEVOURER, EnemyType.SHADOW_COLOSSUS, EnemyType.NIGHTMARE_KING, EnemyType.FEAR_CRAWLER, EnemyType.UMBRAL_ASSASSIN, EnemyType.VOID_ECHO],
    maxEnemies: 35, spawnInterval: 3, treasureCount: 6,
    ambientColor: '#110011', groundColor: '#1a0a1a', fogDensity: 0.035, fogColor: '#220022',
    backgroundMusic: 'shadow_realm_dread',
  },
  [DiabloMapId.PRIMORDIAL_ABYSS]: {
    id: DiabloMapId.PRIMORDIAL_ABYSS,
    name: 'Primordial Abyss',
    description: 'The deepest pit of existence where ancient entities slumber. Time and space have no meaning in this void.',
    width: 90, depth: 90,
    enemyTypes: [EnemyType.ABYSSAL_LEVIATHAN, EnemyType.VOID_REAPER, EnemyType.CHAOS_SPAWN, EnemyType.ELDER_VOID_FIEND, EnemyType.PRIMORDIAL_ONE, EnemyType.ENTROPY_WORM, EnemyType.GENESIS_SHADE, EnemyType.NULL_SENTINEL],
    maxEnemies: 38, spawnInterval: 3, treasureCount: 7,
    ambientColor: '#0a0011', groundColor: '#110a1a', fogDensity: 0.04, fogColor: '#1a0022',
    backgroundMusic: 'primordial_void',
  },
  [DiabloMapId.MOONLIT_GROVE]: {
    id: DiabloMapId.MOONLIT_GROVE,
    name: 'Moonlit Grove',
    description: 'A mystical clearing bathed in eternal moonlight where fey creatures dance among silver-leafed trees. Wisps of luminous pollen drift through the enchanted air.',
    width: 130, depth: 130,
    enemyTypes: [EnemyType.MOONLIT_SPRITE, EnemyType.FAE_DANCER, EnemyType.SHADOW_STAG, EnemyType.LUNAR_MOTH, EnemyType.MOONBEAST_ALPHA, EnemyType.THORN_FAIRY, EnemyType.NOCTURNAL_PREDATOR, EnemyType.LUNAR_WISP],
    maxEnemies: 20, spawnInterval: 6, treasureCount: 3,
    ambientColor: '#1a2244', groundColor: '#2a3355', fogDensity: 0.012, fogColor: '#334477',
    backgroundMusic: 'moonlit_grove',
  },
  [DiabloMapId.CORAL_DEPTHS]: {
    id: DiabloMapId.CORAL_DEPTHS,
    name: 'Coral Depths',
    description: 'Sunken ruins encrusted with bioluminescent coral. Predatory sea creatures patrol the flooded chambers where ancient treasures lie forgotten.',
    width: 110, depth: 110,
    enemyTypes: [EnemyType.REEF_CRAWLER, EnemyType.SIREN_WITCH, EnemyType.ABYSSAL_ANGLER, EnemyType.BARNACLE_GOLEM, EnemyType.LEVIATHAN_HATCHLING, EnemyType.TIDE_LURKER, EnemyType.PEARL_GOLEM, EnemyType.DEEP_SEA_PHANTOM],
    maxEnemies: 24, spawnInterval: 5, treasureCount: 4,
    ambientColor: '#112233', groundColor: '#1a3344', fogDensity: 0.022, fogColor: '#224455',
    backgroundMusic: 'coral_depths',
  },
  [DiabloMapId.ANCIENT_LIBRARY]: {
    id: DiabloMapId.ANCIENT_LIBRARY,
    name: 'Ancient Library',
    description: 'An impossibly vast library where forbidden knowledge has animated its guardians. Towering shelves creak with sentient tomes and ink-born horrors.',
    width: 100, depth: 100,
    enemyTypes: [EnemyType.ANIMATED_TOME, EnemyType.INK_WRAITH, EnemyType.SCROLL_GOLEM, EnemyType.ARCANE_CURATOR, EnemyType.FORBIDDEN_GRIMOIRE, EnemyType.QUILL_FIEND, EnemyType.PAPER_GOLEM, EnemyType.RUNE_SPIRIT],
    maxEnemies: 24, spawnInterval: 5, treasureCount: 5,
    ambientColor: '#2a2233', groundColor: '#3a3344', fogDensity: 0.018, fogColor: '#443355',
    backgroundMusic: 'ancient_library',
  },
  [DiabloMapId.JADE_TEMPLE]: {
    id: DiabloMapId.JADE_TEMPLE,
    name: 'Jade Temple',
    description: 'A crumbling temple swallowed by jungle vines where jade constructs still guard forgotten rituals. Tribal shamans have awakened the old gods within.',
    width: 120, depth: 120,
    enemyTypes: [EnemyType.TEMPLE_GUARDIAN, EnemyType.VINE_SERPENT, EnemyType.JADE_CONSTRUCT, EnemyType.JUNGLE_SHAMAN, EnemyType.ANCIENT_IDOL, EnemyType.JADE_VIPER, EnemyType.TEMPLE_MONK, EnemyType.STONE_IDOL_FRAGMENT],
    maxEnemies: 26, spawnInterval: 4.5, treasureCount: 4,
    ambientColor: '#224422', groundColor: '#336633', fogDensity: 0.02, fogColor: '#447744',
    backgroundMusic: 'jade_temple',
  },
  [DiabloMapId.ASHEN_BATTLEFIELD]: {
    id: DiabloMapId.ASHEN_BATTLEFIELD,
    name: 'Ashen Battlefield',
    description: 'The scarred remnants of a cataclysmic war. Ghostly soldiers still fight an endless battle among shattered siege engines and fields of rusted swords.',
    width: 140, depth: 140,
    enemyTypes: [EnemyType.FALLEN_SOLDIER, EnemyType.WAR_SPECTER, EnemyType.SIEGE_WRAITH, EnemyType.ASHEN_COMMANDER, EnemyType.DREAD_GENERAL, EnemyType.EMBER_KNIGHT, EnemyType.WAR_DRUMMER, EnemyType.CARRION_SWARM],
    maxEnemies: 28, spawnInterval: 4, treasureCount: 4,
    ambientColor: '#2a2222', groundColor: '#3a3333', fogDensity: 0.02, fogColor: '#554444',
    backgroundMusic: 'ashen_battlefield',
  },
  [DiabloMapId.FUNGAL_DEPTHS]: {
    id: DiabloMapId.FUNGAL_DEPTHS,
    name: 'Fungal Depths',
    description: 'Cavernous tunnels choked with towering bioluminescent mushrooms. The air is thick with toxic spores and the ground pulses with mycelial networks.',
    width: 90, depth: 90,
    enemyTypes: [EnemyType.SPORE_CRAWLER, EnemyType.MYCELIUM_HORROR, EnemyType.TOXIC_SHROOM, EnemyType.FUNGAL_SHAMBLER, EnemyType.SPOREQUEEN, EnemyType.CORDYCEPS_HOST, EnemyType.LUMINOUS_JELLY, EnemyType.ROT_BORER],
    maxEnemies: 30, spawnInterval: 3.5, treasureCount: 5,
    ambientColor: '#1a2a1a', groundColor: '#2a3a2a', fogDensity: 0.028, fogColor: '#334433',
    backgroundMusic: 'fungal_depths',
  },
  [DiabloMapId.OBSIDIAN_FORTRESS]: {
    id: DiabloMapId.OBSIDIAN_FORTRESS,
    name: 'Obsidian Fortress',
    description: 'A fortress carved from volcanic glass, its walls reflecting hellfire. Demonic legions drill in its courtyards while dark inquisitors judge the damned.',
    width: 100, depth: 100,
    enemyTypes: [EnemyType.OBSIDIAN_SENTINEL, EnemyType.HELLFIRE_ARCHER, EnemyType.DARK_INQUISITOR, EnemyType.DOOM_HOUND, EnemyType.OBSIDIAN_WARLORD, EnemyType.MAGMA_IMP, EnemyType.OBSIDIAN_HOUND, EnemyType.SHADOW_INQUISITOR],
    maxEnemies: 32, spawnInterval: 3.5, treasureCount: 5,
    ambientColor: '#220a0a', groundColor: '#331515', fogDensity: 0.025, fogColor: '#442222',
    backgroundMusic: 'obsidian_fortress',
  },
  [DiabloMapId.CELESTIAL_RUINS]: {
    id: DiabloMapId.CELESTIAL_RUINS,
    name: 'Celestial Ruins',
    description: 'Shattered temples floating among the stars. Fallen cosmic guardians patrol bridges of pure light between crumbling astral platforms.',
    width: 110, depth: 110,
    enemyTypes: [EnemyType.STAR_WISP, EnemyType.ASTRAL_GUARDIAN, EnemyType.COMET_DRAKE, EnemyType.VOID_MONK, EnemyType.CELESTIAL_ARCHON, EnemyType.NOVA_SPRITE, EnemyType.CONSTELLATION_GOLEM, EnemyType.GRAVITY_WELL],
    maxEnemies: 34, spawnInterval: 3.5, treasureCount: 6,
    ambientColor: '#111133', groundColor: '#1a1a44', fogDensity: 0.015, fogColor: '#222255',
    backgroundMusic: 'celestial_ruins',
  },
  [DiabloMapId.INFERNAL_THRONE]: {
    id: DiabloMapId.INFERNAL_THRONE,
    name: 'Infernal Throne',
    description: 'The seat of demonic power in the deepest layer of the abyss. Rivers of molten souls flow beneath a throne of compressed agony and despair.',
    width: 95, depth: 95,
    enemyTypes: [EnemyType.PIT_FIEND, EnemyType.HELLBORN_MAGE, EnemyType.INFERNAL_BRUTE, EnemyType.SOUL_COLLECTOR, EnemyType.DEMON_OVERLORD, EnemyType.CHAIN_DEVIL, EnemyType.BRIMSTONE_CRAWLER, EnemyType.WRATH_SPECTER],
    maxEnemies: 36, spawnInterval: 3, treasureCount: 6,
    ambientColor: '#1a0505', groundColor: '#2a0a0a', fogDensity: 0.032, fogColor: '#331111',
    backgroundMusic: 'infernal_throne',
  },
  [DiabloMapId.ASTRAL_VOID]: {
    id: DiabloMapId.ASTRAL_VOID,
    name: 'Astral Void',
    description: 'The space between dimensions where reality itself unravels. Entities that predate creation drift through an endless expanse of fractured timelines.',
    width: 85, depth: 85,
    enemyTypes: [EnemyType.REALITY_SHREDDER, EnemyType.TEMPORAL_WRAITH, EnemyType.DIMENSION_WEAVER, EnemyType.VOID_TITAN, EnemyType.ASTRAL_ANNIHILATOR, EnemyType.PARADOX_SHADE, EnemyType.ANTIMATTER_WISP, EnemyType.FRACTURE_BEAST],
    maxEnemies: 40, spawnInterval: 2.5, treasureCount: 7,
    ambientColor: '#050511', groundColor: '#0a0a1a', fogDensity: 0.042, fogColor: '#111122',
    backgroundMusic: 'astral_void',
  },
  [DiabloMapId.SHATTERED_COLOSSEUM]: {
    id: DiabloMapId.SHATTERED_COLOSSEUM,
    name: 'Shattered Colosseum',
    description: 'A titanic arena crumbling into the earth where spectral gladiators still fight for an audience of ghosts. The roar of phantom crowds echoes off bloodstained pillars.',
    width: 140, depth: 140,
    enemyTypes: [EnemyType.SPECTRAL_GLADIATOR, EnemyType.ARENA_BEAST, EnemyType.GHOSTLY_RETIARIUS, EnemyType.CURSED_CHAMPION, EnemyType.COLOSSEUM_WARDEN, EnemyType.LION_SPIRIT, EnemyType.PIT_FIGHTER_GHOST, EnemyType.MIRMILLO_SPECTER],
    maxEnemies: 20, spawnInterval: 6, treasureCount: 3,
    ambientColor: '#2a2822', groundColor: '#3a3832', fogDensity: 0.01, fogColor: '#554e44',
    backgroundMusic: 'shattered_colosseum',
  },
  [DiabloMapId.PETRIFIED_GARDEN]: {
    id: DiabloMapId.PETRIFIED_GARDEN,
    name: 'Petrified Garden',
    description: 'A once-magnificent botanical garden cursed by a gorgon queen. Stone statues of former visitors line the paths between calcified rose bushes and fossilized fountains.',
    width: 120, depth: 120,
    enemyTypes: [EnemyType.STONE_NYMPH, EnemyType.BASILISK_HATCHLING, EnemyType.GRANITE_GOLEM, EnemyType.PETRIFIED_TREANT, EnemyType.GORGON_MATRIARCH, EnemyType.MOSS_BASILISK, EnemyType.CALCIFIED_NYMPH, EnemyType.STONE_SERPENT],
    maxEnemies: 22, spawnInterval: 5.5, treasureCount: 4,
    ambientColor: '#2a2a2a', groundColor: '#3a3a38', fogDensity: 0.016, fogColor: '#555550',
    backgroundMusic: 'petrified_garden',
  },
  [DiabloMapId.SUNKEN_CITADEL]: {
    id: DiabloMapId.SUNKEN_CITADEL,
    name: 'Sunken Citadel',
    description: 'A grand fortress dragged beneath the waves by an ancient curse. Drowned knights patrol flooded corridors as bioluminescent algae casts eerie green light on barnacled battlements.',
    width: 100, depth: 100,
    enemyTypes: [EnemyType.DROWNED_KNIGHT, EnemyType.DEPTH_LURKER, EnemyType.TIDAL_PHANTOM, EnemyType.CORAL_ABOMINATION, EnemyType.ABYSSAL_WARDEN, EnemyType.BARNACLE_KNIGHT, EnemyType.PRESSURE_PHANTOM, EnemyType.KELP_HORROR],
    maxEnemies: 24, spawnInterval: 5, treasureCount: 5,
    ambientColor: '#0a2233', groundColor: '#153344', fogDensity: 0.024, fogColor: '#1a3344',
    backgroundMusic: 'sunken_citadel',
  },
  [DiabloMapId.WYRMSCAR_CANYON]: {
    id: DiabloMapId.WYRMSCAR_CANYON,
    name: 'Wyrmscar Canyon',
    description: 'A deep canyon scorched black by generations of dragonfire. Nesting wyverns circle overhead while drake broodlings swarm the charred ravines below.',
    width: 130, depth: 130,
    enemyTypes: [EnemyType.CANYON_RAPTOR, EnemyType.SCORCH_WYVERN, EnemyType.DRAKE_BROODLING, EnemyType.WYRMFIRE_SHAMAN, EnemyType.CANYON_WYRMLORD, EnemyType.CLIFF_RAPTOR, EnemyType.NEST_GUARDIAN, EnemyType.MAGMA_DRAKE],
    maxEnemies: 26, spawnInterval: 4.5, treasureCount: 4,
    ambientColor: '#332211', groundColor: '#443322', fogDensity: 0.014, fogColor: '#554433',
    backgroundMusic: 'wyrmscar_canyon',
  },
  [DiabloMapId.PLAGUEROT_SEWERS]: {
    id: DiabloMapId.PLAGUEROT_SEWERS,
    name: 'Plaguerot Sewers',
    description: 'The festering underbelly of a city consumed by plague. Toxic rivers of bile flow through crumbling tunnels where the infected have devolved into something no longer human.',
    width: 90, depth: 90,
    enemyTypes: [EnemyType.SEWER_RAT_SWARM, EnemyType.PLAGUE_BEARER, EnemyType.BILE_ELEMENTAL, EnemyType.AFFLICTED_BRUTE, EnemyType.PESTILENCE_LORD, EnemyType.BLOAT_RAT, EnemyType.PESTILENT_SLIME, EnemyType.SEWER_HARPY],
    maxEnemies: 28, spawnInterval: 4, treasureCount: 3,
    ambientColor: '#1a2a11', groundColor: '#2a3a22', fogDensity: 0.03, fogColor: '#334422',
    backgroundMusic: 'plaguerot_sewers',
  },
  [DiabloMapId.ETHEREAL_SANCTUM]: {
    id: DiabloMapId.ETHEREAL_SANCTUM,
    name: 'Ethereal Sanctum',
    description: 'A temple that phases in and out of existence, straddling multiple planes simultaneously. Its guardians shift between corporeal and spectral forms without warning.',
    width: 110, depth: 110,
    enemyTypes: [EnemyType.PHASE_WALKER, EnemyType.ETHEREAL_SENTINEL, EnemyType.SPIRIT_WEAVER, EnemyType.PLANAR_GUARDIAN, EnemyType.SANCTUM_OVERSEER, EnemyType.ETHER_WISP, EnemyType.SPECTRAL_MONK, EnemyType.PHASE_SPIDER],
    maxEnemies: 30, spawnInterval: 3.5, treasureCount: 5,
    ambientColor: '#1a1a33', groundColor: '#2a2a44', fogDensity: 0.02, fogColor: '#333355',
    backgroundMusic: 'ethereal_sanctum',
  },
  [DiabloMapId.IRON_WASTES]: {
    id: DiabloMapId.IRON_WASTES,
    name: 'Iron Wastes',
    description: 'A blasted wasteland littered with the rusting hulks of colossal war machines. Self-repairing automatons scavenge parts from fallen titans to build ever-deadlier forms.',
    width: 140, depth: 140,
    enemyTypes: [EnemyType.SCRAP_AUTOMATON, EnemyType.RUST_REVENANT, EnemyType.SIEGE_CRAWLER, EnemyType.WAR_ENGINE_CORE, EnemyType.IRON_JUGGERNAUT, EnemyType.JUNK_GOLEM, EnemyType.SCRAP_HAWK, EnemyType.RUST_MITE_SWARM],
    maxEnemies: 32, spawnInterval: 3.5, treasureCount: 5,
    ambientColor: '#2a2222', groundColor: '#3a3333', fogDensity: 0.018, fogColor: '#554444',
    backgroundMusic: 'iron_wastes',
  },
  [DiabloMapId.BLIGHTED_THRONE]: {
    id: DiabloMapId.BLIGHTED_THRONE,
    name: 'Blighted Throne',
    description: 'The corrupted throne room of a king who bargained with dark powers. His court has become a nightmarish parody of nobility, with courtiers fused to their seats and heralds who scream prophecies of doom.',
    width: 100, depth: 100,
    enemyTypes: [EnemyType.CORRUPTED_ROYAL_GUARD, EnemyType.BLIGHT_COURTIER, EnemyType.THRONE_REVENANT, EnemyType.DARK_HERALD, EnemyType.BLIGHTED_KING, EnemyType.PLAGUE_KNIGHT, EnemyType.BLIGHTED_NOBLE, EnemyType.ROT_JESTER],
    maxEnemies: 34, spawnInterval: 3, treasureCount: 6,
    ambientColor: '#1a0a1a', groundColor: '#2a1a2a', fogDensity: 0.028, fogColor: '#332233',
    backgroundMusic: 'blighted_throne',
  },
  [DiabloMapId.CHRONO_LABYRINTH]: {
    id: DiabloMapId.CHRONO_LABYRINTH,
    name: 'Chrono Labyrinth',
    description: 'A maze where corridors loop through fractured timelines. Past and future versions of the same enemies coexist, and the walls rearrange with each tick of an impossible clock.',
    width: 95, depth: 95,
    enemyTypes: [EnemyType.TEMPORAL_ECHO, EnemyType.CLOCKWORK_MINOTAUR, EnemyType.PARADOX_MAGE, EnemyType.TIME_DEVOURER, EnemyType.CHRONO_TITAN, EnemyType.PHASE_BEETLE, EnemyType.TIMELOST_SOLDIER, EnemyType.ENTROPY_WEAVER],
    maxEnemies: 36, spawnInterval: 3, treasureCount: 6,
    ambientColor: '#112244', groundColor: '#1a2a44', fogDensity: 0.022, fogColor: '#223355',
    backgroundMusic: 'chrono_labyrinth',
  },
  [DiabloMapId.ELDRITCH_NEXUS]: {
    id: DiabloMapId.ELDRITCH_NEXUS,
    name: 'Eldritch Nexus',
    description: 'The convergence point of all dark dimensions. Tentacles of pure madness writhe from impossible geometries while alien intelligences probe the boundaries of sanity itself.',
    width: 80, depth: 80,
    enemyTypes: [EnemyType.ELDRITCH_TENDRIL, EnemyType.MIND_FLAYER, EnemyType.NEXUS_ABERRATION, EnemyType.DIMENSIONAL_HORROR, EnemyType.ELDRITCH_OVERMIND, EnemyType.TENTACLE_HORROR, EnemyType.GIBBERING_MOUTHER, EnemyType.PSYCHIC_LEECH],
    maxEnemies: 42, spawnInterval: 2.5, treasureCount: 7,
    ambientColor: '#0a050a', groundColor: '#110a11', fogDensity: 0.045, fogColor: '#150f15',
    backgroundMusic: 'eldritch_nexus',
  },
  [DiabloMapId.CAMELOT]: {
    id: DiabloMapId.CAMELOT,
    name: 'Camelot',
    description: 'The great citadel of Camelot. A safe haven with merchants and artisans.',
    width: 100,
    depth: 100,
    enemyTypes: [],
    maxEnemies: 0,
    spawnInterval: 999,
    treasureCount: 0,
    ambientColor: '#445566',
    groundColor: '#887766',
    fogDensity: 0.008,
    fogColor: '#99aabb',
    backgroundMusic: 'camelot_hub',
  },
};

// ---------------------------------------------------------------------------
//  3. ENEMY DEFINITIONS
// ---------------------------------------------------------------------------

export const ENEMY_DEFS: Record<
  EnemyType,
  {
    name: string;
    hp: number;
    damage: number;
    armor: number;
    speed: number;
    attackRange: number;
    aggroRange: number;
    xpReward: number;
    isBoss: boolean;
    scale: number;
    level: number;
    behavior?: EnemyBehavior;
  }
> = {
  // -- Forest enemies --
  [EnemyType.WOLF]: {
    name: 'Dire Wolf',
    hp: 80,
    damage: 12,
    armor: 3,
    speed: 4.5,
    attackRange: 1.5,
    aggroRange: 12,
    xpReward: 25,
    isBoss: false,
    scale: 0.9,
    level: 2,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.BANDIT]: {
    name: 'Forest Bandit',
    hp: 120,
    damage: 18,
    armor: 8,
    speed: 3.0,
    attackRange: 2,
    aggroRange: 10,
    xpReward: 35,
    isBoss: false,
    scale: 1.0,
    level: 3,
  },
  [EnemyType.BEAR]: {
    name: 'Grizzled Bear',
    hp: 250,
    damage: 30,
    armor: 15,
    speed: 2.8,
    attackRange: 2,
    aggroRange: 8,
    xpReward: 60,
    isBoss: false,
    scale: 1.3,
    level: 5,
  },
  [EnemyType.FOREST_SPIDER]: {
    name: 'Venomous Spider',
    hp: 60,
    damage: 10,
    armor: 2,
    speed: 5.0,
    attackRange: 1.5,
    aggroRange: 9,
    xpReward: 20,
    isBoss: false,
    scale: 0.7,
    level: 1,
  },
  [EnemyType.TREANT]: {
    name: 'Ancient Treant',
    hp: 1500,
    damage: 55,
    armor: 40,
    speed: 1.5,
    attackRange: 3,
    aggroRange: 15,
    xpReward: 300,
    isBoss: true,
    scale: 2.2,
    level: 10,
    behavior: EnemyBehavior.SHIELDED,
  },

  // -- Elven Village enemies --
  [EnemyType.CORRUPTED_ELF]: {
    name: 'Corrupted Elf',
    hp: 150,
    damage: 22,
    armor: 10,
    speed: 3.8,
    attackRange: 2,
    aggroRange: 14,
    xpReward: 45,
    isBoss: false,
    scale: 1.0,
    level: 6,
  },
  [EnemyType.DARK_RANGER]: {
    name: 'Dark Ranger',
    hp: 130,
    damage: 28,
    armor: 7,
    speed: 3.5,
    attackRange: 15,
    aggroRange: 18,
    xpReward: 55,
    isBoss: false,
    scale: 1.0,
    level: 7,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.SHADOW_BEAST]: {
    name: 'Shadow Beast',
    hp: 1800,
    damage: 65,
    armor: 35,
    speed: 3.0,
    attackRange: 3,
    aggroRange: 16,
    xpReward: 400,
    isBoss: true,
    scale: 2.0,
    level: 14,
  },

  // -- Necropolis enemies --
  [EnemyType.SKELETON_WARRIOR]: {
    name: 'Skeleton Warrior',
    hp: 90,
    damage: 14,
    armor: 5,
    speed: 2.8,
    attackRange: 2,
    aggroRange: 10,
    xpReward: 20,
    isBoss: false,
    scale: 1.0,
    level: 3,
  },
  [EnemyType.ZOMBIE]: {
    name: 'Shambling Zombie',
    hp: 180,
    damage: 20,
    armor: 12,
    speed: 1.5,
    attackRange: 1.5,
    aggroRange: 7,
    xpReward: 30,
    isBoss: false,
    scale: 1.1,
    level: 4,
  },
  [EnemyType.NECROMANCER]: {
    name: 'Necromancer',
    hp: 100,
    damage: 35,
    armor: 4,
    speed: 2.5,
    attackRange: 12,
    aggroRange: 16,
    xpReward: 70,
    isBoss: false,
    scale: 1.0,
    level: 8,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.BONE_GOLEM]: {
    name: 'Bone Golem',
    hp: 2000,
    damage: 70,
    armor: 50,
    speed: 1.8,
    attackRange: 2.5,
    aggroRange: 12,
    xpReward: 500,
    isBoss: true,
    scale: 2.5,
    level: 16,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.WRAITH]: {
    name: 'Wraith',
    hp: 110,
    damage: 25,
    armor: 0,
    speed: 4.0,
    attackRange: 2,
    aggroRange: 14,
    xpReward: 50,
    isBoss: false,
    scale: 1.1,
    level: 6,
  },

  // -- Volcanic Wastes enemies --
  [EnemyType.FIRE_IMP]: {
    name: 'Fire Imp',
    hp: 140,
    damage: 24,
    armor: 6,
    speed: 5.2,
    attackRange: 2,
    aggroRange: 12,
    xpReward: 55,
    isBoss: false,
    scale: 0.8,
    level: 10,
  },
  [EnemyType.LAVA_ELEMENTAL]: {
    name: 'Lava Elemental',
    hp: 350,
    damage: 40,
    armor: 25,
    speed: 2.2,
    attackRange: 2.5,
    aggroRange: 10,
    xpReward: 90,
    isBoss: false,
    scale: 1.4,
    level: 12,
  },
  [EnemyType.INFERNAL_KNIGHT]: {
    name: 'Infernal Knight',
    hp: 280,
    damage: 45,
    armor: 30,
    speed: 3.0,
    attackRange: 2.5,
    aggroRange: 14,
    xpReward: 100,
    isBoss: false,
    scale: 1.2,
    level: 14,
  },
  [EnemyType.MAGMA_SERPENT]: {
    name: 'Magma Serpent',
    hp: 200,
    damage: 35,
    armor: 10,
    speed: 4.5,
    attackRange: 3,
    aggroRange: 16,
    xpReward: 75,
    isBoss: false,
    scale: 1.3,
    level: 11,
  },
  [EnemyType.MOLTEN_COLOSSUS]: {
    name: 'Molten Colossus',
    hp: 3000,
    damage: 90,
    armor: 60,
    speed: 1.5,
    attackRange: 3.5,
    aggroRange: 18,
    xpReward: 700,
    isBoss: true,
    scale: 2.8,
    level: 20,
  },

  // -- Abyssal Rift enemies --
  [EnemyType.VOID_STALKER]: {
    name: 'Void Stalker',
    hp: 180,
    damage: 38,
    armor: 8,
    speed: 5.5,
    attackRange: 2,
    aggroRange: 18,
    xpReward: 80,
    isBoss: false,
    scale: 1.0,
    level: 16,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.SHADOW_WEAVER]: {
    name: 'Shadow Weaver',
    hp: 160,
    damage: 50,
    armor: 5,
    speed: 3.5,
    attackRange: 14,
    aggroRange: 20,
    xpReward: 110,
    isBoss: false,
    scale: 1.1,
    level: 18,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.ABYSSAL_HORROR]: {
    name: 'Abyssal Horror',
    hp: 450,
    damage: 55,
    armor: 20,
    speed: 3.0,
    attackRange: 3,
    aggroRange: 14,
    xpReward: 130,
    isBoss: false,
    scale: 1.6,
    level: 20,
  },
  [EnemyType.RIFT_WALKER]: {
    name: 'Rift Walker',
    hp: 220,
    damage: 42,
    armor: 15,
    speed: 6.0,
    attackRange: 2,
    aggroRange: 22,
    xpReward: 95,
    isBoss: false,
    scale: 1.0,
    level: 17,
  },
  [EnemyType.ENTROPY_LORD]: {
    name: 'Entropy Lord',
    hp: 4000,
    damage: 110,
    armor: 45,
    speed: 2.5,
    attackRange: 4,
    aggroRange: 20,
    xpReward: 1000,
    isBoss: true,
    scale: 2.5,
    level: 25,
  },

  // -- Dragon's Sanctum enemies --
  [EnemyType.DRAGONKIN_WARRIOR]: {
    name: 'Dragonkin Warrior',
    hp: 320,
    damage: 52,
    armor: 35,
    speed: 3.2,
    attackRange: 2.5,
    aggroRange: 14,
    xpReward: 120,
    isBoss: false,
    scale: 1.3,
    level: 22,
  },
  [EnemyType.WYRM_PRIEST]: {
    name: 'Wyrm Priest',
    hp: 240,
    damage: 65,
    armor: 15,
    speed: 2.8,
    attackRange: 12,
    aggroRange: 18,
    xpReward: 150,
    isBoss: false,
    scale: 1.1,
    level: 24,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.DRAKE_GUARDIAN]: {
    name: 'Drake Guardian',
    hp: 500,
    damage: 60,
    armor: 45,
    speed: 2.5,
    attackRange: 3,
    aggroRange: 16,
    xpReward: 160,
    isBoss: false,
    scale: 1.5,
    level: 23,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.DRAGON_WHELP]: {
    name: 'Dragon Whelp',
    hp: 200,
    damage: 45,
    armor: 20,
    speed: 5.0,
    attackRange: 4,
    aggroRange: 20,
    xpReward: 100,
    isBoss: false,
    scale: 1.2,
    level: 21,
  },
  [EnemyType.ELDER_DRAGON]: {
    name: 'Elder Dragon',
    hp: 6000,
    damage: 140,
    armor: 70,
    speed: 2.0,
    attackRange: 5,
    aggroRange: 25,
    xpReward: 1500,
    isBoss: true,
    scale: 3.2,
    level: 30,
  },

  // -- Special --
  [EnemyType.TREASURE_MIMIC]: {
    name: 'Treasure Mimic',
    hp: 300,
    damage: 40,
    armor: 20,
    speed: 3.5,
    attackRange: 2,
    aggroRange: 5,
    xpReward: 100,
    isBoss: false,
    scale: 1.0,
    level: 8,
  },
  // Night bosses (one per map, only spawn at night)
  [EnemyType.NIGHT_FOREST_WENDIGO]: {
    name: 'Wendigo of the Pale Moon',
    hp: 4000, damage: 95, armor: 55, speed: 5.5,
    attackRange: 3.5, aggroRange: 30, xpReward: 2000,
    isBoss: true, scale: 3.0, level: 18,
  },
  [EnemyType.NIGHT_ELVEN_BANSHEE_QUEEN]: {
    name: 'Banshee Queen Seraphiel',
    hp: 5000, damage: 110, armor: 40, speed: 5.0,
    attackRange: 4.0, aggroRange: 35, xpReward: 2500,
    isBoss: true, scale: 2.8, level: 22,
  },
  [EnemyType.NIGHT_NECRO_DEATH_KNIGHT]: {
    name: 'Death Knight Malachar',
    hp: 6000, damage: 120, armor: 75, speed: 4.0,
    attackRange: 3.5, aggroRange: 30, xpReward: 3000,
    isBoss: true, scale: 3.2, level: 25,
  },
  [EnemyType.NIGHT_VOLCANIC_INFERNO_TITAN]: {
    name: 'Inferno Titan Surtr',
    hp: 8000, damage: 140, armor: 80, speed: 3.5,
    attackRange: 5.0, aggroRange: 35, xpReward: 4000,
    isBoss: true, scale: 3.5, level: 28,
  },
  [EnemyType.NIGHT_RIFT_VOID_EMPEROR]: {
    name: 'Void Emperor Azathol',
    hp: 10000, damage: 160, armor: 60, speed: 5.0,
    attackRange: 5.0, aggroRange: 40, xpReward: 5000,
    isBoss: true, scale: 3.0, level: 32,
  },
  [EnemyType.NIGHT_DRAGON_SHADOW_WYRM]: {
    name: 'Shadow Wyrm Netharious',
    hp: 15000, damage: 200, armor: 90, speed: 4.5,
    attackRange: 6.0, aggroRange: 45, xpReward: 8000,
    isBoss: true, scale: 4.0, level: 38,
  },

  // -- Desert enemies (easy) --
  [EnemyType.SAND_SCORPION]: {
    name: 'Sand Scorpion',
    hp: 60, damage: 10, armor: 5, speed: 4.0,
    attackRange: 1.5, aggroRange: 10, xpReward: 18,
    isBoss: false, scale: 0.7, level: 1,
  },
  [EnemyType.DESERT_BANDIT]: {
    name: 'Desert Bandit',
    hp: 90, damage: 14, armor: 6, speed: 3.2,
    attackRange: 2.0, aggroRange: 11, xpReward: 25,
    isBoss: false, scale: 1.0, level: 2,
  },
  [EnemyType.SAND_WURM]: {
    name: 'Sand Wurm',
    hp: 150, damage: 20, armor: 10, speed: 2.5,
    attackRange: 2.5, aggroRange: 8, xpReward: 35,
    isBoss: false, scale: 1.3, level: 3,
  },
  [EnemyType.DUST_WRAITH]: {
    name: 'Dust Wraith',
    hp: 70, damage: 16, armor: 2, speed: 5.0,
    attackRange: 2.0, aggroRange: 14, xpReward: 28,
    isBoss: false, scale: 1.1, level: 2,
  },
  [EnemyType.SAND_GOLEM]: {
    name: 'Sand Golem',
    hp: 220, damage: 25, armor: 18, speed: 2.0,
    attackRange: 2.5, aggroRange: 9, xpReward: 45,
    isBoss: false, scale: 1.6, level: 4,
  },

  // -- Grassland enemies (easy) --
  [EnemyType.WILD_BOAR]: {
    name: 'Wild Boar',
    hp: 70, damage: 12, armor: 4, speed: 4.5,
    attackRange: 1.5, aggroRange: 10, xpReward: 20,
    isBoss: false, scale: 0.8, level: 1,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.PLAINS_RAIDER]: {
    name: 'Plains Raider',
    hp: 100, damage: 15, armor: 7, speed: 3.5,
    attackRange: 2.0, aggroRange: 12, xpReward: 28,
    isBoss: false, scale: 1.0, level: 2,
  },
  [EnemyType.GIANT_HAWK]: {
    name: 'Giant Hawk',
    hp: 55, damage: 18, armor: 2, speed: 6.0,
    attackRange: 2.0, aggroRange: 16, xpReward: 22,
    isBoss: false, scale: 0.9, level: 2,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.BISON_BEAST]: {
    name: 'Bison Beast',
    hp: 200, damage: 22, armor: 14, speed: 2.8,
    attackRange: 2.5, aggroRange: 9, xpReward: 40,
    isBoss: false, scale: 1.5, level: 3,
  },
  [EnemyType.CENTAUR_WARCHIEF]: {
    name: 'Centaur Warchief',
    hp: 180, damage: 20, armor: 12, speed: 4.0,
    attackRange: 3.0, aggroRange: 14, xpReward: 50,
    isBoss: false, scale: 1.4, level: 4,
  },

  // -- Night bosses (desert & grassland) --
  [EnemyType.NIGHT_DESERT_SANDSTORM_DJINN]: {
    name: 'Sandstorm Djinn Kharazim',
    hp: 3000, damage: 55, armor: 25, speed: 5.5,
    attackRange: 4.0, aggroRange: 35, xpReward: 1500,
    isBoss: true, scale: 2.5, level: 12,
  },
  [EnemyType.NIGHT_GRASSLAND_STAMPEDE_KING]: {
    name: 'Stampede King Thorrax',
    hp: 3500, damage: 50, armor: 30, speed: 5.0,
    attackRange: 3.5, aggroRange: 35, xpReward: 1500,
    isBoss: true, scale: 2.8, level: 12,
  },

  // -- Whispering Marsh enemies (easy) --
  [EnemyType.BOG_LURKER]: {
    name: 'Bog Lurker', hp: 75, damage: 11, armor: 4, speed: 3.5,
    attackRange: 2.0, aggroRange: 10, xpReward: 22,
    isBoss: false, scale: 0.9, level: 2,
  },
  [EnemyType.MARSH_HAG]: {
    name: 'Marsh Hag', hp: 90, damage: 16, armor: 3, speed: 2.8,
    attackRange: 10, aggroRange: 14, xpReward: 30,
    isBoss: false, scale: 1.0, level: 3,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.TOXIC_TOAD]: {
    name: 'Toxic Toad', hp: 55, damage: 8, armor: 2, speed: 4.8,
    attackRange: 1.5, aggroRange: 8, xpReward: 15,
    isBoss: false, scale: 0.6, level: 1,
  },
  [EnemyType.SWAMP_VINE]: {
    name: 'Strangling Vine', hp: 130, damage: 14, armor: 8, speed: 1.0,
    attackRange: 3.0, aggroRange: 6, xpReward: 28,
    isBoss: false, scale: 1.2, level: 3,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.HYDRA_MATRIARCH]: {
    name: 'Hydra Matriarch', hp: 800, damage: 35, armor: 20, speed: 2.0,
    attackRange: 3.5, aggroRange: 14, xpReward: 200,
    isBoss: true, scale: 2.0, level: 8,
  },

  // -- Crystal Caverns enemies (easy) --
  [EnemyType.CRYSTAL_SPIDER]: {
    name: 'Crystal Spider', hp: 65, damage: 12, armor: 6, speed: 5.0,
    attackRange: 1.5, aggroRange: 10, xpReward: 20,
    isBoss: false, scale: 0.7, level: 2,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.GEM_GOLEM]: {
    name: 'Gem Golem', hp: 200, damage: 20, armor: 18, speed: 1.8,
    attackRange: 2.5, aggroRange: 8, xpReward: 40,
    isBoss: false, scale: 1.4, level: 4,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.CAVE_BAT_SWARM]: {
    name: 'Cave Bat Swarm', hp: 40, damage: 8, armor: 1, speed: 6.0,
    attackRange: 1.5, aggroRange: 12, xpReward: 12,
    isBoss: false, scale: 0.5, level: 1,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.QUARTZ_ELEMENTAL]: {
    name: 'Quartz Elemental', hp: 160, damage: 22, armor: 12, speed: 2.5,
    attackRange: 2.0, aggroRange: 10, xpReward: 35,
    isBoss: false, scale: 1.2, level: 3,
  },
  [EnemyType.PRISMATIC_WYRM]: {
    name: 'Prismatic Wyrm', hp: 1000, damage: 40, armor: 25, speed: 3.0,
    attackRange: 4.0, aggroRange: 16, xpReward: 250,
    isBoss: true, scale: 2.2, level: 9,
  },

  // -- Frozen Tundra enemies (medium) --
  [EnemyType.FROST_WOLF]: {
    name: 'Frost Wolf', hp: 120, damage: 20, armor: 8, speed: 5.0,
    attackRange: 1.5, aggroRange: 14, xpReward: 40,
    isBoss: false, scale: 1.0, level: 7,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.ICE_WRAITH]: {
    name: 'Ice Wraith', hp: 100, damage: 28, armor: 3, speed: 4.5,
    attackRange: 10, aggroRange: 16, xpReward: 50,
    isBoss: false, scale: 1.1, level: 8,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.YETI]: {
    name: 'Yeti', hp: 350, damage: 38, armor: 20, speed: 2.5,
    attackRange: 2.5, aggroRange: 10, xpReward: 80,
    isBoss: false, scale: 1.5, level: 10,
  },
  [EnemyType.FROZEN_REVENANT]: {
    name: 'Frozen Revenant', hp: 180, damage: 30, armor: 15, speed: 3.0,
    attackRange: 2.0, aggroRange: 12, xpReward: 60,
    isBoss: false, scale: 1.1, level: 9,
  },
  [EnemyType.GLACIAL_TITAN]: {
    name: 'Glacial Titan', hp: 2200, damage: 72, armor: 50, speed: 1.5,
    attackRange: 3.5, aggroRange: 16, xpReward: 450,
    isBoss: true, scale: 2.5, level: 15,
    behavior: EnemyBehavior.SHIELDED,
  },

  // -- Haunted Cathedral enemies (medium) --
  [EnemyType.PHANTOM_KNIGHT]: {
    name: 'Phantom Knight', hp: 160, damage: 26, armor: 14, speed: 3.5,
    attackRange: 2.5, aggroRange: 14, xpReward: 55,
    isBoss: false, scale: 1.1, level: 9,
  },
  [EnemyType.GARGOYLE]: {
    name: 'Gargoyle', hp: 220, damage: 32, armor: 25, speed: 2.0,
    attackRange: 2.0, aggroRange: 8, xpReward: 65,
    isBoss: false, scale: 1.3, level: 10,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.CURSED_PRIEST]: {
    name: 'Cursed Priest', hp: 110, damage: 35, armor: 5, speed: 2.5,
    attackRange: 12, aggroRange: 18, xpReward: 70,
    isBoss: false, scale: 1.0, level: 11,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.SHADOW_ACOLYTE]: {
    name: 'Shadow Acolyte', hp: 130, damage: 22, armor: 8, speed: 4.0,
    attackRange: 2.0, aggroRange: 12, xpReward: 45,
    isBoss: false, scale: 0.9, level: 8,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.CATHEDRAL_DEMON]: {
    name: 'Cathedral Demon', hp: 2500, damage: 80, armor: 45, speed: 2.8,
    attackRange: 3.5, aggroRange: 18, xpReward: 550,
    isBoss: true, scale: 2.5, level: 16,
  },

  // -- Thornwood Thicket enemies (medium) --
  [EnemyType.THORN_CRAWLER]: {
    name: 'Thorn Crawler', hp: 140, damage: 18, armor: 12, speed: 4.2,
    attackRange: 1.5, aggroRange: 10, xpReward: 42,
    isBoss: false, scale: 0.8, level: 7,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.BLIGHT_SPRITE]: {
    name: 'Blight Sprite', hp: 70, damage: 24, armor: 2, speed: 5.5,
    attackRange: 8, aggroRange: 14, xpReward: 38,
    isBoss: false, scale: 0.6, level: 6,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.FUNGAL_BRUTE]: {
    name: 'Fungal Brute', hp: 280, damage: 32, armor: 18, speed: 2.2,
    attackRange: 2.5, aggroRange: 8, xpReward: 70,
    isBoss: false, scale: 1.4, level: 9,
  },
  [EnemyType.ROTWOOD_LICH]: {
    name: 'Rotwood Lich', hp: 150, damage: 40, armor: 8, speed: 2.5,
    attackRange: 14, aggroRange: 18, xpReward: 85,
    isBoss: false, scale: 1.1, level: 11,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.THORNMOTHER]: {
    name: 'Thornmother', hp: 2000, damage: 65, armor: 40, speed: 1.8,
    attackRange: 4.0, aggroRange: 16, xpReward: 500,
    isBoss: true, scale: 2.3, level: 14,
    behavior: EnemyBehavior.SHIELDED,
  },

  // -- Clockwork Foundry enemies (hard) --
  [EnemyType.CLOCKWORK_SOLDIER]: {
    name: 'Clockwork Soldier', hp: 250, damage: 40, armor: 30, speed: 3.0,
    attackRange: 2.0, aggroRange: 12, xpReward: 90,
    isBoss: false, scale: 1.1, level: 16,
  },
  [EnemyType.STEAM_GOLEM]: {
    name: 'Steam Golem', hp: 400, damage: 50, armor: 40, speed: 2.0,
    attackRange: 2.5, aggroRange: 10, xpReward: 120,
    isBoss: false, scale: 1.5, level: 18,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.GEAR_SPIDER]: {
    name: 'Gear Spider', hp: 150, damage: 35, armor: 15, speed: 5.5,
    attackRange: 1.5, aggroRange: 14, xpReward: 75,
    isBoss: false, scale: 0.8, level: 15,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.FORGE_MASTER]: {
    name: 'Forge Master', hp: 300, damage: 55, armor: 25, speed: 2.8,
    attackRange: 3.0, aggroRange: 16, xpReward: 130,
    isBoss: false, scale: 1.3, level: 20,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.IRON_COLOSSUS]: {
    name: 'Iron Colossus', hp: 5000, damage: 120, armor: 70, speed: 1.5,
    attackRange: 4.0, aggroRange: 20, xpReward: 1200,
    isBoss: true, scale: 3.0, level: 26,
  },

  // -- Crimson Citadel enemies (hard) --
  [EnemyType.BLOOD_KNIGHT]: {
    name: 'Blood Knight', hp: 300, damage: 48, armor: 32, speed: 3.2,
    attackRange: 2.5, aggroRange: 14, xpReward: 100,
    isBoss: false, scale: 1.2, level: 18,
  },
  [EnemyType.CRIMSON_MAGE]: {
    name: 'Crimson Mage', hp: 180, damage: 55, armor: 10, speed: 3.0,
    attackRange: 14, aggroRange: 20, xpReward: 120,
    isBoss: false, scale: 1.0, level: 20,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.GARGOYLE_SENTINEL]: {
    name: 'Gargoyle Sentinel', hp: 420, damage: 45, armor: 45, speed: 2.5,
    attackRange: 2.5, aggroRange: 12, xpReward: 110,
    isBoss: false, scale: 1.4, level: 19,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.BLOOD_FIEND]: {
    name: 'Blood Fiend', hp: 200, damage: 42, armor: 12, speed: 5.0,
    attackRange: 2.0, aggroRange: 18, xpReward: 95,
    isBoss: false, scale: 1.0, level: 17,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.VAMPIRE_LORD]: {
    name: 'Vampire Lord', hp: 5500, damage: 130, armor: 55, speed: 3.5,
    attackRange: 4.0, aggroRange: 22, xpReward: 1300,
    isBoss: true, scale: 2.8, level: 28,
  },

  // -- Stormspire Peak enemies (hard) --
  [EnemyType.STORM_HARPY]: {
    name: 'Storm Harpy', hp: 170, damage: 38, armor: 8, speed: 6.0,
    attackRange: 2.0, aggroRange: 18, xpReward: 85,
    isBoss: false, scale: 1.0, level: 17,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.THUNDER_ELEMENTAL]: {
    name: 'Thunder Elemental', hp: 350, damage: 52, armor: 20, speed: 3.5,
    attackRange: 3.0, aggroRange: 14, xpReward: 110,
    isBoss: false, scale: 1.3, level: 20,
  },
  [EnemyType.LIGHTNING_DRAKE]: {
    name: 'Lightning Drake', hp: 280, damage: 60, armor: 18, speed: 5.0,
    attackRange: 4.0, aggroRange: 20, xpReward: 130,
    isBoss: false, scale: 1.4, level: 22,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.WIND_SHAMAN]: {
    name: 'Wind Shaman', hp: 200, damage: 45, armor: 10, speed: 3.5,
    attackRange: 14, aggroRange: 20, xpReward: 100,
    isBoss: false, scale: 1.0, level: 19,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.TEMPEST_TITAN]: {
    name: 'Tempest Titan', hp: 5500, damage: 125, armor: 60, speed: 2.5,
    attackRange: 5.0, aggroRange: 25, xpReward: 1400,
    isBoss: true, scale: 3.2, level: 28,
  },

  // -- Shadow Realm enemies (extreme) --
  [EnemyType.NIGHTMARE_STALKER]: {
    name: 'Nightmare Stalker', hp: 400, damage: 60, armor: 20, speed: 6.0,
    attackRange: 2.0, aggroRange: 22, xpReward: 150,
    isBoss: false, scale: 1.1, level: 26,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.DREAD_PHANTOM]: {
    name: 'Dread Phantom', hp: 300, damage: 70, armor: 5, speed: 5.0,
    attackRange: 12, aggroRange: 24, xpReward: 170,
    isBoss: false, scale: 1.2, level: 28,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.SOUL_DEVOURER]: {
    name: 'Soul Devourer', hp: 550, damage: 75, armor: 30, speed: 3.5,
    attackRange: 3.0, aggroRange: 16, xpReward: 200,
    isBoss: false, scale: 1.5, level: 30,
  },
  [EnemyType.SHADOW_COLOSSUS]: {
    name: 'Shadow Colossus', hp: 700, damage: 85, armor: 50, speed: 2.0,
    attackRange: 4.0, aggroRange: 18, xpReward: 250,
    isBoss: false, scale: 2.0, level: 32,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.NIGHTMARE_KING]: {
    name: 'Nightmare King', hp: 8000, damage: 160, armor: 75, speed: 3.5,
    attackRange: 5.0, aggroRange: 30, xpReward: 2500,
    isBoss: true, scale: 3.5, level: 35,
  },

  // -- Primordial Abyss enemies (extreme) --
  [EnemyType.ABYSSAL_LEVIATHAN]: {
    name: 'Abyssal Leviathan', hp: 600, damage: 80, armor: 35, speed: 4.0,
    attackRange: 4.0, aggroRange: 20, xpReward: 220,
    isBoss: false, scale: 1.8, level: 30,
  },
  [EnemyType.VOID_REAPER]: {
    name: 'Void Reaper', hp: 450, damage: 90, armor: 15, speed: 5.5,
    attackRange: 3.0, aggroRange: 22, xpReward: 200,
    isBoss: false, scale: 1.3, level: 32,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.CHAOS_SPAWN]: {
    name: 'Chaos Spawn', hp: 350, damage: 75, armor: 10, speed: 6.0,
    attackRange: 2.0, aggroRange: 18, xpReward: 180,
    isBoss: false, scale: 1.1, level: 28,
  },
  [EnemyType.ELDER_VOID_FIEND]: {
    name: 'Elder Void Fiend', hp: 800, damage: 100, armor: 45, speed: 3.0,
    attackRange: 14, aggroRange: 25, xpReward: 300,
    isBoss: false, scale: 2.0, level: 34,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.PRIMORDIAL_ONE]: {
    name: 'The Primordial One', hp: 12000, damage: 180, armor: 85, speed: 3.0,
    attackRange: 6.0, aggroRange: 40, xpReward: 5000,
    isBoss: true, scale: 4.0, level: 40,
  },

  // -- Night bosses for new maps --
  [EnemyType.NIGHT_MARSH_SWAMP_MOTHER]: {
    name: 'Swamp Mother Muriel',
    hp: 3200, damage: 58, armor: 28, speed: 4.0,
    attackRange: 4.0, aggroRange: 35, xpReward: 1600,
    isBoss: true, scale: 2.8, level: 14,
  },
  [EnemyType.NIGHT_CAVERNS_CRYSTAL_KING]: {
    name: 'Crystal King Adamantus',
    hp: 3500, damage: 62, armor: 35, speed: 3.5,
    attackRange: 4.0, aggroRange: 35, xpReward: 1800,
    isBoss: true, scale: 2.8, level: 16,
  },
  [EnemyType.NIGHT_TUNDRA_FROST_EMPRESS]: {
    name: 'Frost Empress Isolde',
    hp: 5500, damage: 100, armor: 50, speed: 4.5,
    attackRange: 4.5, aggroRange: 35, xpReward: 2500,
    isBoss: true, scale: 3.0, level: 22,
  },
  [EnemyType.NIGHT_CATHEDRAL_ARCH_LICH]: {
    name: 'Arch-Lich Valdris',
    hp: 6000, damage: 115, armor: 40, speed: 4.0,
    attackRange: 5.0, aggroRange: 35, xpReward: 3000,
    isBoss: true, scale: 3.0, level: 24,
  },
  [EnemyType.NIGHT_THORNWOOD_BLIGHT_LORD]: {
    name: 'Blight Lord Morrigan',
    hp: 5500, damage: 105, armor: 45, speed: 4.5,
    attackRange: 4.5, aggroRange: 35, xpReward: 2800,
    isBoss: true, scale: 3.0, level: 22,
  },
  [EnemyType.NIGHT_FOUNDRY_IRON_TYRANT]: {
    name: 'Iron Tyrant Kronos',
    hp: 9000, damage: 150, armor: 80, speed: 3.5,
    attackRange: 5.0, aggroRange: 35, xpReward: 4500,
    isBoss: true, scale: 3.5, level: 30,
  },
  [EnemyType.NIGHT_CITADEL_BLOOD_EMPEROR]: {
    name: 'Blood Emperor Sanguinus',
    hp: 10000, damage: 165, armor: 65, speed: 5.0,
    attackRange: 5.0, aggroRange: 40, xpReward: 5000,
    isBoss: true, scale: 3.2, level: 34,
  },
  [EnemyType.NIGHT_STORMSPIRE_THUNDER_GOD]: {
    name: 'Thunder God Thoraxis',
    hp: 11000, damage: 170, armor: 70, speed: 5.5,
    attackRange: 6.0, aggroRange: 40, xpReward: 5500,
    isBoss: true, scale: 3.5, level: 35,
  },
  [EnemyType.NIGHT_SHADOW_DREAM_EATER]: {
    name: 'Dream Eater Morpheus',
    hp: 13000, damage: 185, armor: 75, speed: 5.0,
    attackRange: 6.0, aggroRange: 45, xpReward: 7000,
    isBoss: true, scale: 3.5, level: 38,
  },
  [EnemyType.NIGHT_ABYSS_WORLD_ENDER]: {
    name: 'World Ender Abraxas',
    hp: 18000, damage: 220, armor: 95, speed: 4.5,
    attackRange: 7.0, aggroRange: 50, xpReward: 10000,
    isBoss: true, scale: 4.5, level: 42,
  },

  // -- Moonlit Grove enemies (easy) --
  [EnemyType.MOONLIT_SPRITE]: {
    name: 'Moonlit Sprite', hp: 50, damage: 8, armor: 2, speed: 5.5,
    attackRange: 1.5, aggroRange: 10, xpReward: 15,
    isBoss: false, scale: 0.5, level: 1,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.FAE_DANCER]: {
    name: 'Fae Dancer', hp: 70, damage: 14, armor: 3, speed: 4.5,
    attackRange: 8, aggroRange: 14, xpReward: 22,
    isBoss: false, scale: 0.8, level: 2,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.SHADOW_STAG]: {
    name: 'Shadow Stag', hp: 120, damage: 18, armor: 8, speed: 5.0,
    attackRange: 2.0, aggroRange: 12, xpReward: 30,
    isBoss: false, scale: 1.2, level: 3,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.LUNAR_MOTH]: {
    name: 'Lunar Moth', hp: 40, damage: 12, armor: 1, speed: 6.0,
    attackRange: 6, aggroRange: 16, xpReward: 18,
    isBoss: false, scale: 0.6, level: 1,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.MOONBEAST_ALPHA]: {
    name: 'Moonbeast Alpha', hp: 800, damage: 30, armor: 18, speed: 3.5,
    attackRange: 3.0, aggroRange: 16, xpReward: 180,
    isBoss: true, scale: 2.0, level: 8,
  },

  // -- Coral Depths enemies (easy-medium) --
  [EnemyType.REEF_CRAWLER]: {
    name: 'Reef Crawler', hp: 85, damage: 13, armor: 8, speed: 3.5,
    attackRange: 1.5, aggroRange: 9, xpReward: 24,
    isBoss: false, scale: 0.8, level: 3,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.SIREN_WITCH]: {
    name: 'Siren Witch', hp: 95, damage: 20, armor: 4, speed: 3.0,
    attackRange: 12, aggroRange: 16, xpReward: 35,
    isBoss: false, scale: 1.0, level: 5,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.ABYSSAL_ANGLER]: {
    name: 'Abyssal Angler', hp: 110, damage: 16, armor: 6, speed: 2.8,
    attackRange: 2.0, aggroRange: 8, xpReward: 28,
    isBoss: false, scale: 1.1, level: 4,
  },
  [EnemyType.BARNACLE_GOLEM]: {
    name: 'Barnacle Golem', hp: 200, damage: 22, armor: 20, speed: 1.8,
    attackRange: 2.5, aggroRange: 8, xpReward: 45,
    isBoss: false, scale: 1.5, level: 5,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.LEVIATHAN_HATCHLING]: {
    name: 'Leviathan Hatchling', hp: 1200, damage: 42, armor: 22, speed: 2.5,
    attackRange: 3.5, aggroRange: 16, xpReward: 280,
    isBoss: true, scale: 2.2, level: 10,
  },

  // -- Ancient Library enemies (medium) --
  [EnemyType.ANIMATED_TOME]: {
    name: 'Animated Tome', hp: 65, damage: 18, armor: 4, speed: 4.5,
    attackRange: 6, aggroRange: 12, xpReward: 28,
    isBoss: false, scale: 0.6, level: 4,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.INK_WRAITH]: {
    name: 'Ink Wraith', hp: 90, damage: 22, armor: 2, speed: 5.0,
    attackRange: 2.0, aggroRange: 14, xpReward: 35,
    isBoss: false, scale: 1.0, level: 5,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.SCROLL_GOLEM]: {
    name: 'Scroll Golem', hp: 180, damage: 25, armor: 16, speed: 2.0,
    attackRange: 2.5, aggroRange: 8, xpReward: 48,
    isBoss: false, scale: 1.4, level: 6,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.ARCANE_CURATOR]: {
    name: 'Arcane Curator', hp: 120, damage: 30, armor: 6, speed: 2.8,
    attackRange: 14, aggroRange: 18, xpReward: 60,
    isBoss: false, scale: 1.0, level: 7,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.FORBIDDEN_GRIMOIRE]: {
    name: 'Forbidden Grimoire', hp: 1400, damage: 55, armor: 28, speed: 2.5,
    attackRange: 4.0, aggroRange: 18, xpReward: 350,
    isBoss: true, scale: 2.2, level: 12,
  },

  // -- Jade Temple enemies (medium) --
  [EnemyType.TEMPLE_GUARDIAN]: {
    name: 'Temple Guardian', hp: 170, damage: 24, armor: 18, speed: 2.8,
    attackRange: 2.5, aggroRange: 12, xpReward: 50,
    isBoss: false, scale: 1.2, level: 8,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.VINE_SERPENT]: {
    name: 'Vine Serpent', hp: 100, damage: 20, armor: 5, speed: 5.5,
    attackRange: 2.0, aggroRange: 14, xpReward: 38,
    isBoss: false, scale: 0.9, level: 6,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.JADE_CONSTRUCT]: {
    name: 'Jade Construct', hp: 250, damage: 30, armor: 22, speed: 2.0,
    attackRange: 2.5, aggroRange: 10, xpReward: 65,
    isBoss: false, scale: 1.5, level: 9,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.JUNGLE_SHAMAN]: {
    name: 'Jungle Shaman', hp: 110, damage: 28, armor: 5, speed: 3.0,
    attackRange: 12, aggroRange: 16, xpReward: 55,
    isBoss: false, scale: 1.0, level: 8,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.ANCIENT_IDOL]: {
    name: 'Ancient Idol', hp: 1800, damage: 60, armor: 35, speed: 2.0,
    attackRange: 4.0, aggroRange: 16, xpReward: 400,
    isBoss: true, scale: 2.4, level: 14,
  },

  // -- Ashen Battlefield enemies (medium-hard) --
  [EnemyType.FALLEN_SOLDIER]: {
    name: 'Fallen Soldier', hp: 150, damage: 22, armor: 14, speed: 3.2,
    attackRange: 2.0, aggroRange: 12, xpReward: 45,
    isBoss: false, scale: 1.0, level: 8,
  },
  [EnemyType.WAR_SPECTER]: {
    name: 'War Specter', hp: 110, damage: 28, armor: 3, speed: 5.0,
    attackRange: 2.0, aggroRange: 16, xpReward: 52,
    isBoss: false, scale: 1.1, level: 9,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.SIEGE_WRAITH]: {
    name: 'Siege Wraith', hp: 200, damage: 35, armor: 10, speed: 2.5,
    attackRange: 14, aggroRange: 20, xpReward: 70,
    isBoss: false, scale: 1.3, level: 10,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.ASHEN_COMMANDER]: {
    name: 'Ashen Commander', hp: 280, damage: 40, armor: 25, speed: 3.0,
    attackRange: 3.0, aggroRange: 14, xpReward: 90,
    isBoss: false, scale: 1.3, level: 12,
  },
  [EnemyType.DREAD_GENERAL]: {
    name: 'Dread General', hp: 2200, damage: 70, armor: 42, speed: 2.5,
    attackRange: 3.5, aggroRange: 18, xpReward: 500,
    isBoss: true, scale: 2.5, level: 16,
  },

  // -- Fungal Depths enemies (hard) --
  [EnemyType.SPORE_CRAWLER]: {
    name: 'Spore Crawler', hp: 180, damage: 30, armor: 12, speed: 4.5,
    attackRange: 1.5, aggroRange: 12, xpReward: 65,
    isBoss: false, scale: 0.9, level: 14,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.MYCELIUM_HORROR]: {
    name: 'Mycelium Horror', hp: 350, damage: 45, armor: 25, speed: 2.0,
    attackRange: 3.0, aggroRange: 10, xpReward: 100,
    isBoss: false, scale: 1.5, level: 16,
  },
  [EnemyType.TOXIC_SHROOM]: {
    name: 'Toxic Shroom', hp: 130, damage: 38, armor: 8, speed: 3.5,
    attackRange: 10, aggroRange: 14, xpReward: 78,
    isBoss: false, scale: 0.8, level: 13,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.FUNGAL_SHAMBLER]: {
    name: 'Fungal Shambler', hp: 420, damage: 50, armor: 35, speed: 1.5,
    attackRange: 2.5, aggroRange: 8, xpReward: 120,
    isBoss: false, scale: 1.6, level: 18,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.SPOREQUEEN]: {
    name: 'Sporequeen', hp: 4500, damage: 105, armor: 55, speed: 2.0,
    attackRange: 4.0, aggroRange: 20, xpReward: 1100,
    isBoss: true, scale: 2.8, level: 24,
  },

  // -- Obsidian Fortress enemies (hard) --
  [EnemyType.OBSIDIAN_SENTINEL]: {
    name: 'Obsidian Sentinel', hp: 300, damage: 42, armor: 35, speed: 2.5,
    attackRange: 2.5, aggroRange: 12, xpReward: 95,
    isBoss: false, scale: 1.3, level: 18,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.HELLFIRE_ARCHER]: {
    name: 'Hellfire Archer', hp: 180, damage: 50, armor: 10, speed: 3.5,
    attackRange: 14, aggroRange: 20, xpReward: 105,
    isBoss: false, scale: 1.0, level: 19,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.DARK_INQUISITOR]: {
    name: 'Dark Inquisitor', hp: 220, damage: 55, armor: 15, speed: 3.0,
    attackRange: 12, aggroRange: 18, xpReward: 115,
    isBoss: false, scale: 1.1, level: 20,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.DOOM_HOUND]: {
    name: 'Doom Hound', hp: 200, damage: 45, armor: 12, speed: 6.0,
    attackRange: 2.0, aggroRange: 18, xpReward: 90,
    isBoss: false, scale: 1.0, level: 17,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.OBSIDIAN_WARLORD]: {
    name: 'Obsidian Warlord', hp: 5500, damage: 130, armor: 65, speed: 2.5,
    attackRange: 4.0, aggroRange: 22, xpReward: 1300,
    isBoss: true, scale: 3.0, level: 28,
  },

  // -- Celestial Ruins enemies (extreme) --
  [EnemyType.STAR_WISP]: {
    name: 'Star Wisp', hp: 250, damage: 48, armor: 8, speed: 6.5,
    attackRange: 2.0, aggroRange: 20, xpReward: 120,
    isBoss: false, scale: 0.8, level: 24,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.ASTRAL_GUARDIAN]: {
    name: 'Astral Guardian', hp: 500, damage: 62, armor: 40, speed: 2.8,
    attackRange: 3.0, aggroRange: 14, xpReward: 180,
    isBoss: false, scale: 1.5, level: 26,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.COMET_DRAKE]: {
    name: 'Comet Drake', hp: 350, damage: 70, armor: 18, speed: 5.5,
    attackRange: 4.0, aggroRange: 22, xpReward: 160,
    isBoss: false, scale: 1.4, level: 27,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.VOID_MONK]: {
    name: 'Void Monk', hp: 300, damage: 58, armor: 12, speed: 4.0,
    attackRange: 10, aggroRange: 18, xpReward: 140,
    isBoss: false, scale: 1.1, level: 25,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.CELESTIAL_ARCHON]: {
    name: 'Celestial Archon', hp: 7500, damage: 150, armor: 70, speed: 3.0,
    attackRange: 5.0, aggroRange: 28, xpReward: 2200,
    isBoss: true, scale: 3.2, level: 34,
  },

  // -- Infernal Throne enemies (extreme) --
  [EnemyType.PIT_FIEND]: {
    name: 'Pit Fiend', hp: 450, damage: 68, armor: 25, speed: 4.0,
    attackRange: 3.0, aggroRange: 18, xpReward: 170,
    isBoss: false, scale: 1.3, level: 28,
  },
  [EnemyType.HELLBORN_MAGE]: {
    name: 'Hellborn Mage', hp: 320, damage: 80, armor: 10, speed: 3.0,
    attackRange: 14, aggroRange: 22, xpReward: 190,
    isBoss: false, scale: 1.1, level: 30,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.INFERNAL_BRUTE]: {
    name: 'Infernal Brute', hp: 650, damage: 75, armor: 40, speed: 2.5,
    attackRange: 3.0, aggroRange: 14, xpReward: 210,
    isBoss: false, scale: 1.8, level: 32,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.SOUL_COLLECTOR]: {
    name: 'Soul Collector', hp: 380, damage: 72, armor: 15, speed: 3.5,
    attackRange: 12, aggroRange: 20, xpReward: 185,
    isBoss: false, scale: 1.2, level: 29,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.DEMON_OVERLORD]: {
    name: 'Demon Overlord', hp: 10000, damage: 170, armor: 80, speed: 3.0,
    attackRange: 5.0, aggroRange: 35, xpReward: 3500,
    isBoss: true, scale: 3.5, level: 38,
  },

  // -- Astral Void enemies (ultimate) --
  [EnemyType.REALITY_SHREDDER]: {
    name: 'Reality Shredder', hp: 500, damage: 85, armor: 20, speed: 6.5,
    attackRange: 2.0, aggroRange: 22, xpReward: 230,
    isBoss: false, scale: 1.2, level: 34,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.TEMPORAL_WRAITH]: {
    name: 'Temporal Wraith', hp: 400, damage: 95, armor: 8, speed: 5.5,
    attackRange: 3.0, aggroRange: 24, xpReward: 250,
    isBoss: false, scale: 1.3, level: 36,
  },
  [EnemyType.DIMENSION_WEAVER]: {
    name: 'Dimension Weaver', hp: 600, damage: 88, armor: 15, speed: 3.5,
    attackRange: 14, aggroRange: 26, xpReward: 280,
    isBoss: false, scale: 1.5, level: 38,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.VOID_TITAN]: {
    name: 'Void Titan', hp: 900, damage: 100, armor: 55, speed: 2.0,
    attackRange: 4.0, aggroRange: 20, xpReward: 350,
    isBoss: false, scale: 2.2, level: 40,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.ASTRAL_ANNIHILATOR]: {
    name: 'Astral Annihilator', hp: 15000, damage: 200, armor: 90, speed: 3.0,
    attackRange: 6.0, aggroRange: 45, xpReward: 6000,
    isBoss: true, scale: 4.0, level: 45,
  },

  // -- Night bosses wave 2 --
  [EnemyType.NIGHT_GROVE_MOONFALL_DRYAD]: {
    name: 'Moonfall Dryad Selune',
    hp: 2800, damage: 50, armor: 22, speed: 5.0,
    attackRange: 4.0, aggroRange: 35, xpReward: 1400,
    isBoss: true, scale: 2.5, level: 12,
  },
  [EnemyType.NIGHT_CORAL_TIDE_KRAKEN]: {
    name: 'Tide Kraken Thalassor',
    hp: 3800, damage: 65, armor: 30, speed: 4.0,
    attackRange: 5.0, aggroRange: 35, xpReward: 1800,
    isBoss: true, scale: 3.0, level: 16,
  },
  [EnemyType.NIGHT_LIBRARY_LOREKEEPER]: {
    name: 'Lorekeeper Omniscian',
    hp: 4200, damage: 75, armor: 35, speed: 3.5,
    attackRange: 5.0, aggroRange: 35, xpReward: 2000,
    isBoss: true, scale: 2.8, level: 18,
  },
  [EnemyType.NIGHT_TEMPLE_JADE_EMPEROR]: {
    name: 'Jade Emperor Xuan',
    hp: 5000, damage: 90, armor: 40, speed: 4.0,
    attackRange: 4.5, aggroRange: 35, xpReward: 2500,
    isBoss: true, scale: 3.0, level: 22,
  },
  [EnemyType.NIGHT_BATTLEFIELD_DEATH_MARSHAL]: {
    name: 'Death Marshal Gravius',
    hp: 5500, damage: 100, armor: 50, speed: 4.5,
    attackRange: 5.0, aggroRange: 35, xpReward: 2800,
    isBoss: true, scale: 3.0, level: 24,
  },
  [EnemyType.NIGHT_FUNGAL_MYCORRHIZA_QUEEN]: {
    name: 'Mycorrhiza Queen Sporella',
    hp: 8000, damage: 130, armor: 60, speed: 3.5,
    attackRange: 5.0, aggroRange: 35, xpReward: 4000,
    isBoss: true, scale: 3.5, level: 30,
  },
  [EnemyType.NIGHT_OBSIDIAN_DARK_SOVEREIGN]: {
    name: 'Dark Sovereign Malachor',
    hp: 9500, damage: 155, armor: 70, speed: 4.5,
    attackRange: 5.0, aggroRange: 40, xpReward: 5000,
    isBoss: true, scale: 3.5, level: 34,
  },
  [EnemyType.NIGHT_CELESTIAL_FALLEN_SERAPH]: {
    name: 'Fallen Seraph Azariel',
    hp: 12000, damage: 175, armor: 75, speed: 5.5,
    attackRange: 6.0, aggroRange: 40, xpReward: 6500,
    isBoss: true, scale: 3.8, level: 38,
  },
  [EnemyType.NIGHT_INFERNAL_ARCH_DEMON]: {
    name: 'Arch-Demon Bael',
    hp: 14000, damage: 195, armor: 85, speed: 5.0,
    attackRange: 6.0, aggroRange: 45, xpReward: 8000,
    isBoss: true, scale: 4.0, level: 40,
  },
  [EnemyType.NIGHT_ASTRAL_REALITY_BREAKER]: {
    name: 'Reality Breaker Nullion',
    hp: 20000, damage: 240, armor: 100, speed: 5.0,
    attackRange: 7.0, aggroRange: 50, xpReward: 12000,
    isBoss: true, scale: 5.0, level: 48,
  },

  // -- Shattered Colosseum enemies (easy) --
  [EnemyType.SPECTRAL_GLADIATOR]: {
    name: 'Spectral Gladiator', hp: 75, damage: 14, armor: 6, speed: 4.0,
    attackRange: 2.0, aggroRange: 12, xpReward: 22,
    isBoss: false, scale: 1.0, level: 2,
  },
  [EnemyType.ARENA_BEAST]: {
    name: 'Arena Beast', hp: 110, damage: 16, armor: 5, speed: 5.0,
    attackRange: 1.5, aggroRange: 10, xpReward: 28,
    isBoss: false, scale: 1.1, level: 2,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.GHOSTLY_RETIARIUS]: {
    name: 'Ghostly Retiarius', hp: 60, damage: 18, armor: 2, speed: 4.5,
    attackRange: 8, aggroRange: 14, xpReward: 25,
    isBoss: false, scale: 0.9, level: 3,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.CURSED_CHAMPION]: {
    name: 'Cursed Champion', hp: 160, damage: 20, armor: 12, speed: 3.0,
    attackRange: 2.5, aggroRange: 10, xpReward: 38,
    isBoss: false, scale: 1.2, level: 4,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.COLOSSEUM_WARDEN]: {
    name: 'Colosseum Warden', hp: 900, damage: 35, armor: 20, speed: 2.5,
    attackRange: 3.5, aggroRange: 16, xpReward: 200,
    isBoss: true, scale: 2.2, level: 8,
  },

  // -- Petrified Garden enemies (easy-medium) --
  [EnemyType.STONE_NYMPH]: {
    name: 'Stone Nymph', hp: 80, damage: 15, armor: 10, speed: 3.8,
    attackRange: 6, aggroRange: 12, xpReward: 26,
    isBoss: false, scale: 0.9, level: 3,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.BASILISK_HATCHLING]: {
    name: 'Basilisk Hatchling', hp: 95, damage: 18, armor: 8, speed: 4.5,
    attackRange: 2.0, aggroRange: 10, xpReward: 30,
    isBoss: false, scale: 0.8, level: 4,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.GRANITE_GOLEM]: {
    name: 'Granite Golem', hp: 240, damage: 24, armor: 22, speed: 1.5,
    attackRange: 2.5, aggroRange: 8, xpReward: 48,
    isBoss: false, scale: 1.5, level: 5,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.PETRIFIED_TREANT]: {
    name: 'Petrified Treant', hp: 180, damage: 20, armor: 18, speed: 1.8,
    attackRange: 3.0, aggroRange: 10, xpReward: 40,
    isBoss: false, scale: 1.4, level: 5,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.GORGON_MATRIARCH]: {
    name: 'Gorgon Matriarch', hp: 1300, damage: 48, armor: 25, speed: 2.8,
    attackRange: 10, aggroRange: 18, xpReward: 300,
    isBoss: true, scale: 2.2, level: 11,
  },

  // -- Sunken Citadel enemies (medium) --
  [EnemyType.DROWNED_KNIGHT]: {
    name: 'Drowned Knight', hp: 160, damage: 24, armor: 16, speed: 2.5,
    attackRange: 2.5, aggroRange: 12, xpReward: 48,
    isBoss: false, scale: 1.1, level: 7,
  },
  [EnemyType.DEPTH_LURKER]: {
    name: 'Depth Lurker', hp: 100, damage: 20, armor: 4, speed: 5.5,
    attackRange: 2.0, aggroRange: 16, xpReward: 38,
    isBoss: false, scale: 0.9, level: 5,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.TIDAL_PHANTOM]: {
    name: 'Tidal Phantom', hp: 90, damage: 26, armor: 2, speed: 4.0,
    attackRange: 10, aggroRange: 18, xpReward: 42,
    isBoss: false, scale: 1.0, level: 6,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.CORAL_ABOMINATION]: {
    name: 'Coral Abomination', hp: 260, damage: 30, armor: 24, speed: 1.5,
    attackRange: 3.0, aggroRange: 8, xpReward: 58,
    isBoss: false, scale: 1.6, level: 8,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.ABYSSAL_WARDEN]: {
    name: 'Abyssal Warden', hp: 1600, damage: 58, armor: 32, speed: 2.2,
    attackRange: 4.0, aggroRange: 18, xpReward: 380,
    isBoss: true, scale: 2.4, level: 13,
  },

  // -- Wyrmscar Canyon enemies (medium) --
  [EnemyType.CANYON_RAPTOR]: {
    name: 'Canyon Raptor', hp: 120, damage: 22, armor: 6, speed: 6.0,
    attackRange: 1.5, aggroRange: 14, xpReward: 40,
    isBoss: false, scale: 0.9, level: 7,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.SCORCH_WYVERN]: {
    name: 'Scorch Wyvern', hp: 180, damage: 32, armor: 12, speed: 4.5,
    attackRange: 8, aggroRange: 20, xpReward: 60,
    isBoss: false, scale: 1.3, level: 9,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.DRAKE_BROODLING]: {
    name: 'Drake Broodling', hp: 90, damage: 18, armor: 5, speed: 5.5,
    attackRange: 2.0, aggroRange: 12, xpReward: 32,
    isBoss: false, scale: 0.7, level: 6,
  },
  [EnemyType.WYRMFIRE_SHAMAN]: {
    name: 'Wyrmfire Shaman', hp: 130, damage: 35, armor: 8, speed: 2.8,
    attackRange: 14, aggroRange: 18, xpReward: 65,
    isBoss: false, scale: 1.0, level: 10,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.CANYON_WYRMLORD]: {
    name: 'Canyon Wyrmlord', hp: 2000, damage: 68, armor: 38, speed: 2.5,
    attackRange: 5.0, aggroRange: 20, xpReward: 450,
    isBoss: true, scale: 2.8, level: 15,
  },

  // -- Plaguerot Sewers enemies (medium-hard) --
  [EnemyType.SEWER_RAT_SWARM]: {
    name: 'Sewer Rat Swarm', hp: 45, damage: 10, armor: 1, speed: 6.5,
    attackRange: 1.5, aggroRange: 8, xpReward: 15,
    isBoss: false, scale: 0.5, level: 6,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.PLAGUE_BEARER]: {
    name: 'Plague Bearer', hp: 170, damage: 28, armor: 10, speed: 2.5,
    attackRange: 2.0, aggroRange: 10, xpReward: 50,
    isBoss: false, scale: 1.1, level: 9,
  },
  [EnemyType.BILE_ELEMENTAL]: {
    name: 'Bile Elemental', hp: 220, damage: 35, armor: 8, speed: 2.0,
    attackRange: 8, aggroRange: 14, xpReward: 65,
    isBoss: false, scale: 1.3, level: 10,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.AFFLICTED_BRUTE]: {
    name: 'Afflicted Brute', hp: 300, damage: 40, armor: 20, speed: 2.2,
    attackRange: 2.5, aggroRange: 10, xpReward: 80,
    isBoss: false, scale: 1.5, level: 12,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.PESTILENCE_LORD]: {
    name: 'Pestilence Lord', hp: 2400, damage: 75, armor: 40, speed: 2.0,
    attackRange: 4.0, aggroRange: 18, xpReward: 550,
    isBoss: true, scale: 2.6, level: 17,
  },

  // -- Ethereal Sanctum enemies (hard) --
  [EnemyType.PHASE_WALKER]: {
    name: 'Phase Walker', hp: 200, damage: 38, armor: 10, speed: 5.5,
    attackRange: 2.0, aggroRange: 16, xpReward: 80,
    isBoss: false, scale: 1.0, level: 16,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.ETHEREAL_SENTINEL]: {
    name: 'Ethereal Sentinel', hp: 380, damage: 45, armor: 35, speed: 2.5,
    attackRange: 2.5, aggroRange: 12, xpReward: 110,
    isBoss: false, scale: 1.4, level: 18,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.SPIRIT_WEAVER]: {
    name: 'Spirit Weaver', hp: 160, damage: 50, armor: 8, speed: 3.0,
    attackRange: 14, aggroRange: 20, xpReward: 100,
    isBoss: false, scale: 1.0, level: 17,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.PLANAR_GUARDIAN]: {
    name: 'Planar Guardian', hp: 320, damage: 52, armor: 28, speed: 3.0,
    attackRange: 3.0, aggroRange: 14, xpReward: 125,
    isBoss: false, scale: 1.3, level: 20,
  },
  [EnemyType.SANCTUM_OVERSEER]: {
    name: 'Sanctum Overseer', hp: 5000, damage: 118, armor: 58, speed: 2.8,
    attackRange: 4.0, aggroRange: 22, xpReward: 1200,
    isBoss: true, scale: 3.0, level: 26,
  },

  // -- Iron Wastes enemies (hard) --
  [EnemyType.SCRAP_AUTOMATON]: {
    name: 'Scrap Automaton', hp: 260, damage: 42, armor: 30, speed: 3.0,
    attackRange: 2.0, aggroRange: 12, xpReward: 90,
    isBoss: false, scale: 1.1, level: 17,
  },
  [EnemyType.RUST_REVENANT]: {
    name: 'Rust Revenant', hp: 190, damage: 38, armor: 15, speed: 4.5,
    attackRange: 2.0, aggroRange: 16, xpReward: 85,
    isBoss: false, scale: 1.0, level: 16,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.SIEGE_CRAWLER]: {
    name: 'Siege Crawler', hp: 450, damage: 55, armor: 40, speed: 1.5,
    attackRange: 12, aggroRange: 18, xpReward: 135,
    isBoss: false, scale: 1.8, level: 20,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.WAR_ENGINE_CORE]: {
    name: 'War Engine Core', hp: 350, damage: 48, armor: 25, speed: 2.5,
    attackRange: 3.0, aggroRange: 14, xpReward: 115,
    isBoss: false, scale: 1.3, level: 19,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.IRON_JUGGERNAUT]: {
    name: 'Iron Juggernaut', hp: 6000, damage: 135, armor: 75, speed: 1.8,
    attackRange: 4.0, aggroRange: 20, xpReward: 1400,
    isBoss: true, scale: 3.5, level: 28,
  },

  // -- Blighted Throne enemies (extreme) --
  [EnemyType.CORRUPTED_ROYAL_GUARD]: {
    name: 'Corrupted Royal Guard', hp: 380, damage: 55, armor: 35, speed: 3.0,
    attackRange: 2.5, aggroRange: 14, xpReward: 140,
    isBoss: false, scale: 1.2, level: 24,
  },
  [EnemyType.BLIGHT_COURTIER]: {
    name: 'Blight Courtier', hp: 280, damage: 62, armor: 12, speed: 3.5,
    attackRange: 12, aggroRange: 20, xpReward: 155,
    isBoss: false, scale: 1.0, level: 26,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.THRONE_REVENANT]: {
    name: 'Throne Revenant', hp: 450, damage: 68, armor: 25, speed: 4.5,
    attackRange: 2.0, aggroRange: 18, xpReward: 170,
    isBoss: false, scale: 1.3, level: 28,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.DARK_HERALD]: {
    name: 'Dark Herald', hp: 320, damage: 72, armor: 18, speed: 3.0,
    attackRange: 14, aggroRange: 22, xpReward: 185,
    isBoss: false, scale: 1.1, level: 27,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.BLIGHTED_KING]: {
    name: 'The Blighted King', hp: 8000, damage: 155, armor: 72, speed: 3.0,
    attackRange: 5.0, aggroRange: 28, xpReward: 2500,
    isBoss: true, scale: 3.2, level: 34,
  },

  // -- Chrono Labyrinth enemies (extreme) --
  [EnemyType.TEMPORAL_ECHO]: {
    name: 'Temporal Echo', hp: 300, damage: 58, armor: 10, speed: 6.0,
    attackRange: 2.0, aggroRange: 20, xpReward: 150,
    isBoss: false, scale: 1.0, level: 26,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.CLOCKWORK_MINOTAUR]: {
    name: 'Clockwork Minotaur', hp: 550, damage: 72, armor: 40, speed: 3.5,
    attackRange: 3.0, aggroRange: 14, xpReward: 195,
    isBoss: false, scale: 1.6, level: 30,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.PARADOX_MAGE]: {
    name: 'Paradox Mage', hp: 280, damage: 78, armor: 8, speed: 3.0,
    attackRange: 14, aggroRange: 22, xpReward: 175,
    isBoss: false, scale: 1.0, level: 28,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.TIME_DEVOURER]: {
    name: 'Time Devourer', hp: 420, damage: 82, armor: 22, speed: 5.0,
    attackRange: 3.0, aggroRange: 18, xpReward: 210,
    isBoss: false, scale: 1.4, level: 32,
  },
  [EnemyType.CHRONO_TITAN]: {
    name: 'Chrono Titan', hp: 9000, damage: 165, armor: 78, speed: 3.0,
    attackRange: 5.0, aggroRange: 30, xpReward: 3000,
    isBoss: true, scale: 3.5, level: 36,
  },

  // -- Eldritch Nexus enemies (ultimate) --
  [EnemyType.ELDRITCH_TENDRIL]: {
    name: 'Eldritch Tendril', hp: 350, damage: 70, armor: 12, speed: 5.0,
    attackRange: 3.0, aggroRange: 18, xpReward: 180,
    isBoss: false, scale: 1.2, level: 32,
  },
  [EnemyType.MIND_FLAYER]: {
    name: 'Mind Flayer', hp: 420, damage: 92, armor: 15, speed: 3.5,
    attackRange: 14, aggroRange: 24, xpReward: 260,
    isBoss: false, scale: 1.3, level: 36,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.NEXUS_ABERRATION]: {
    name: 'Nexus Aberration', hp: 580, damage: 88, armor: 28, speed: 4.0,
    attackRange: 3.0, aggroRange: 20, xpReward: 290,
    isBoss: false, scale: 1.6, level: 38,
  },
  [EnemyType.DIMENSIONAL_HORROR]: {
    name: 'Dimensional Horror', hp: 800, damage: 95, armor: 50, speed: 2.5,
    attackRange: 4.0, aggroRange: 22, xpReward: 380,
    isBoss: false, scale: 2.0, level: 42,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.ELDRITCH_OVERMIND]: {
    name: 'Eldritch Overmind', hp: 18000, damage: 230, armor: 95, speed: 2.5,
    attackRange: 7.0, aggroRange: 50, xpReward: 8000,
    isBoss: true, scale: 4.5, level: 50,
  },

  // -- Night bosses wave 3 --
  [EnemyType.NIGHT_COLOSSEUM_ETERNAL_CHAMPION]: {
    name: 'Eternal Champion Maximus',
    hp: 3000, damage: 52, armor: 28, speed: 5.0,
    attackRange: 3.5, aggroRange: 35, xpReward: 1500,
    isBoss: true, scale: 2.5, level: 14,
  },
  [EnemyType.NIGHT_GARDEN_MEDUSA_QUEEN]: {
    name: 'Medusa Queen Lithia',
    hp: 4000, damage: 68, armor: 32, speed: 4.0,
    attackRange: 5.0, aggroRange: 35, xpReward: 2000,
    isBoss: true, scale: 2.8, level: 18,
  },
  [EnemyType.NIGHT_CITADEL_DROWNED_ADMIRAL]: {
    name: 'Drowned Admiral Nereus',
    hp: 4500, damage: 78, armor: 38, speed: 3.5,
    attackRange: 5.0, aggroRange: 35, xpReward: 2200,
    isBoss: true, scale: 3.0, level: 20,
  },
  [EnemyType.NIGHT_CANYON_ELDER_WYRM]: {
    name: 'Elder Wyrm Scorchion',
    hp: 5500, damage: 95, armor: 45, speed: 4.5,
    attackRange: 6.0, aggroRange: 40, xpReward: 2800,
    isBoss: true, scale: 3.5, level: 24,
  },
  [EnemyType.NIGHT_SEWERS_PLAGUE_FATHER]: {
    name: 'Plague Father Nurglax',
    hp: 6500, damage: 108, armor: 55, speed: 3.5,
    attackRange: 5.0, aggroRange: 35, xpReward: 3200,
    isBoss: true, scale: 3.2, level: 26,
  },
  [EnemyType.NIGHT_SANCTUM_PLANAR_TYRANT]: {
    name: "Planar Tyrant Kael'thus",
    hp: 9000, damage: 145, armor: 65, speed: 4.5,
    attackRange: 5.0, aggroRange: 40, xpReward: 4500,
    isBoss: true, scale: 3.5, level: 32,
  },
  [EnemyType.NIGHT_WASTES_WAR_COLOSSUS]: {
    name: 'War Colossus Decimator',
    hp: 11000, damage: 162, armor: 80, speed: 3.0,
    attackRange: 6.0, aggroRange: 40, xpReward: 5500,
    isBoss: true, scale: 4.0, level: 35,
  },
  [EnemyType.NIGHT_THRONE_UNDYING_EMPEROR]: {
    name: 'Undying Emperor Malachar',
    hp: 13000, damage: 180, armor: 78, speed: 4.5,
    attackRange: 6.0, aggroRange: 45, xpReward: 7000,
    isBoss: true, scale: 3.8, level: 38,
  },
  [EnemyType.NIGHT_LABYRINTH_TIME_WEAVER]: {
    name: 'Time Weaver Chronaxis',
    hp: 15000, damage: 200, armor: 85, speed: 5.5,
    attackRange: 6.0, aggroRange: 45, xpReward: 9000,
    isBoss: true, scale: 4.0, level: 42,
  },
  [EnemyType.NIGHT_NEXUS_ELDER_BRAIN]: {
    name: "Elder Brain Xul'tharax",
    hp: 22000, damage: 250, armor: 105, speed: 3.5,
    attackRange: 8.0, aggroRange: 55, xpReward: 15000,
    isBoss: true, scale: 5.0, level: 55,
  },
  // -- Forest extra enemies --
  [EnemyType.MOSSY_LURKER]: {
    name: 'Mossy Lurker', hp: 90, damage: 14, armor: 5, speed: 3.5,
    attackRange: 2, aggroRange: 8, xpReward: 30, isBoss: false, scale: 0.8, level: 2,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.DIRE_STAG]: {
    name: 'Dire Stag', hp: 180, damage: 25, armor: 12, speed: 5.2,
    attackRange: 2.5, aggroRange: 14, xpReward: 50, isBoss: false, scale: 1.2, level: 4,
  },
  [EnemyType.WOODLAND_WISP]: {
    name: 'Woodland Wisp', hp: 50, damage: 18, armor: 1, speed: 4.0,
    attackRange: 12, aggroRange: 16, xpReward: 28, isBoss: false, scale: 0.5, level: 2,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Elven Village extra enemies --
  [EnemyType.CORRUPTED_SENTINEL]: {
    name: 'Corrupted Sentinel', hp: 200, damage: 24, armor: 18, speed: 2.5,
    attackRange: 2.5, aggroRange: 12, xpReward: 55, isBoss: false, scale: 1.3, level: 7,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.GLOOM_ARCHER]: {
    name: 'Gloom Archer', hp: 110, damage: 30, armor: 6, speed: 3.2,
    attackRange: 16, aggroRange: 20, xpReward: 48, isBoss: false, scale: 1.0, level: 6,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.FEY_ABOMINATION]: {
    name: 'Fey Abomination', hp: 280, damage: 35, armor: 14, speed: 3.8,
    attackRange: 2, aggroRange: 15, xpReward: 65, isBoss: false, scale: 1.4, level: 8,
  },
  // -- Necropolis extra enemies --
  [EnemyType.CRYPT_SHADE]: {
    name: 'Crypt Shade', hp: 100, damage: 22, armor: 4, speed: 4.5,
    attackRange: 2, aggroRange: 14, xpReward: 40, isBoss: false, scale: 0.9, level: 5,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.BONE_ARCHER]: {
    name: 'Bone Archer', hp: 85, damage: 26, armor: 6, speed: 2.8,
    attackRange: 14, aggroRange: 18, xpReward: 38, isBoss: false, scale: 0.9, level: 5,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.LICH_ACOLYTE]: {
    name: 'Lich Acolyte', hp: 130, damage: 20, armor: 8, speed: 2.5,
    attackRange: 10, aggroRange: 16, xpReward: 45, isBoss: false, scale: 1.0, level: 6,
    behavior: EnemyBehavior.HEALER,
  },
  // -- Volcanic Wastes extra enemies --
  [EnemyType.EMBER_FIEND]: {
    name: 'Ember Fiend', hp: 160, damage: 32, armor: 10, speed: 4.2,
    attackRange: 2, aggroRange: 12, xpReward: 55, isBoss: false, scale: 0.9, level: 8,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.VOLCANIC_SCORPION]: {
    name: 'Volcanic Scorpion', hp: 220, damage: 28, armor: 22, speed: 3.0,
    attackRange: 2, aggroRange: 10, xpReward: 60, isBoss: false, scale: 1.1, level: 9,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.ASH_WRAITH]: {
    name: 'Ash Wraith', hp: 120, damage: 35, armor: 5, speed: 4.8,
    attackRange: 8, aggroRange: 16, xpReward: 50, isBoss: false, scale: 1.0, level: 8,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Abyssal Rift extra enemies --
  [EnemyType.VOID_TENDRIL]: {
    name: 'Void Tendril', hp: 180, damage: 38, armor: 8, speed: 3.5,
    attackRange: 4, aggroRange: 14, xpReward: 70, isBoss: false, scale: 1.1, level: 12,
  },
  [EnemyType.RIFT_SCREAMER]: {
    name: 'Rift Screamer', hp: 140, damage: 42, armor: 6, speed: 5.0,
    attackRange: 10, aggroRange: 20, xpReward: 75, isBoss: false, scale: 0.8, level: 13,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.DIMENSIONAL_STALKER]: {
    name: 'Dimensional Stalker', hp: 200, damage: 45, armor: 12, speed: 5.5,
    attackRange: 2, aggroRange: 18, xpReward: 80, isBoss: false, scale: 1.0, level: 14,
    behavior: EnemyBehavior.FLANKER,
  },
  // -- Dragon's Sanctum extra enemies --
  [EnemyType.SCALED_SORCERER]: {
    name: 'Scaled Sorcerer', hp: 250, damage: 50, armor: 15, speed: 3.0,
    attackRange: 12, aggroRange: 18, xpReward: 90, isBoss: false, scale: 1.1, level: 15,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.DRAGONSPAWN_BERSERKER]: {
    name: 'Dragonspawn Berserker', hp: 350, damage: 55, armor: 20, speed: 4.5,
    attackRange: 2.5, aggroRange: 14, xpReward: 95, isBoss: false, scale: 1.4, level: 16,
  },
  [EnemyType.FLAME_HERALD]: {
    name: 'Flame Herald', hp: 200, damage: 48, armor: 10, speed: 3.5,
    attackRange: 10, aggroRange: 16, xpReward: 85, isBoss: false, scale: 1.0, level: 15,
    behavior: EnemyBehavior.HEALER,
  },
  // -- Desert extra enemies --
  [EnemyType.DUNE_REAVER]: {
    name: 'Dune Reaver', hp: 170, damage: 26, armor: 14, speed: 4.0,
    attackRange: 2, aggroRange: 12, xpReward: 48, isBoss: false, scale: 1.1, level: 7,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.SANDSTORM_ELEMENTAL]: {
    name: 'Sandstorm Elemental', hp: 210, damage: 30, armor: 18, speed: 3.2,
    attackRange: 6, aggroRange: 14, xpReward: 55, isBoss: false, scale: 1.3, level: 8,
  },
  [EnemyType.OASIS_SERPENT]: {
    name: 'Oasis Serpent', hp: 140, damage: 22, armor: 8, speed: 5.0,
    attackRange: 2, aggroRange: 10, xpReward: 42, isBoss: false, scale: 0.8, level: 6,
    behavior: EnemyBehavior.FLANKER,
  },
  // -- Grassland extra enemies --
  [EnemyType.STEPPE_STALKER]: {
    name: 'Steppe Stalker', hp: 130, damage: 20, armor: 6, speed: 5.5,
    attackRange: 2, aggroRange: 16, xpReward: 35, isBoss: false, scale: 0.9, level: 4,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.THUNDER_RAM]: {
    name: 'Thunder Ram', hp: 280, damage: 35, armor: 20, speed: 4.8,
    attackRange: 2.5, aggroRange: 12, xpReward: 55, isBoss: false, scale: 1.3, level: 6,
  },
  [EnemyType.PRAIRIE_WITCH]: {
    name: 'Prairie Witch', hp: 100, damage: 28, armor: 4, speed: 3.0,
    attackRange: 14, aggroRange: 18, xpReward: 45, isBoss: false, scale: 1.0, level: 5,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Whispering Marsh extra enemies --
  [EnemyType.FEN_CRAWLER]: {
    name: 'Fen Crawler', hp: 150, damage: 20, armor: 10, speed: 3.0,
    attackRange: 2, aggroRange: 10, xpReward: 40, isBoss: false, scale: 0.9, level: 5,
  },
  [EnemyType.MIRE_SPECTER]: {
    name: 'Mire Specter', hp: 95, damage: 24, armor: 3, speed: 4.5,
    attackRange: 10, aggroRange: 16, xpReward: 38, isBoss: false, scale: 0.8, level: 5,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.LEECH_SWARM]: {
    name: 'Leech Swarm', hp: 70, damage: 15, armor: 1, speed: 5.0,
    attackRange: 1.5, aggroRange: 8, xpReward: 25, isBoss: false, scale: 0.6, level: 3,
    behavior: EnemyBehavior.FLANKER,
  },
  // -- Crystal Caverns extra enemies --
  [EnemyType.SHARD_SENTINEL]: {
    name: 'Shard Sentinel', hp: 240, damage: 28, armor: 22, speed: 2.5,
    attackRange: 2, aggroRange: 12, xpReward: 55, isBoss: false, scale: 1.3, level: 7,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.GEODE_BEETLE]: {
    name: 'Geode Beetle', hp: 120, damage: 18, armor: 16, speed: 3.8,
    attackRange: 1.5, aggroRange: 10, xpReward: 35, isBoss: false, scale: 0.7, level: 5,
  },
  [EnemyType.CRYSTAL_SHADE]: {
    name: 'Crystal Shade', hp: 100, damage: 30, armor: 5, speed: 4.5,
    attackRange: 8, aggroRange: 14, xpReward: 42, isBoss: false, scale: 0.9, level: 6,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Frozen Tundra extra enemies --
  [EnemyType.PERMAFROST_SPIDER]: {
    name: 'Permafrost Spider', hp: 110, damage: 22, armor: 8, speed: 4.8,
    attackRange: 2, aggroRange: 12, xpReward: 40, isBoss: false, scale: 0.8, level: 6,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.BLIZZARD_PHANTOM]: {
    name: 'Blizzard Phantom', hp: 130, damage: 32, armor: 4, speed: 4.2,
    attackRange: 10, aggroRange: 18, xpReward: 50, isBoss: false, scale: 1.0, level: 8,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.FROST_TROLL]: {
    name: 'Frost Troll', hp: 350, damage: 38, armor: 25, speed: 2.5,
    attackRange: 2.5, aggroRange: 10, xpReward: 65, isBoss: false, scale: 1.5, level: 9,
  },
  // -- Haunted Cathedral extra enemies --
  [EnemyType.BELL_WRAITH]: {
    name: 'Bell Wraith', hp: 140, damage: 30, armor: 6, speed: 3.5,
    attackRange: 8, aggroRange: 16, xpReward: 48, isBoss: false, scale: 1.0, level: 8,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.DESECRATED_MONK]: {
    name: 'Desecrated Monk', hp: 180, damage: 26, armor: 14, speed: 3.0,
    attackRange: 6, aggroRange: 14, xpReward: 52, isBoss: false, scale: 1.0, level: 8,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.STAINED_GLASS_GOLEM]: {
    name: 'Stained Glass Golem', hp: 300, damage: 35, armor: 28, speed: 2.0,
    attackRange: 2.5, aggroRange: 10, xpReward: 60, isBoss: false, scale: 1.5, level: 9,
    behavior: EnemyBehavior.SHIELDED,
  },
  // -- Thornwood Thicket extra enemies --
  [EnemyType.BRIAR_WOLF]: {
    name: 'Briar Wolf', hp: 120, damage: 22, armor: 10, speed: 5.0,
    attackRange: 2, aggroRange: 14, xpReward: 38, isBoss: false, scale: 0.9, level: 6,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.SPORE_MOTH]: {
    name: 'Spore Moth', hp: 75, damage: 18, armor: 2, speed: 4.5,
    attackRange: 8, aggroRange: 14, xpReward: 30, isBoss: false, scale: 0.6, level: 5,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.NETTLE_ELEMENTAL]: {
    name: 'Nettle Elemental', hp: 200, damage: 28, armor: 16, speed: 2.8,
    attackRange: 3, aggroRange: 12, xpReward: 50, isBoss: false, scale: 1.2, level: 7,
  },
  // -- Clockwork Foundry extra enemies --
  [EnemyType.BRASS_BEETLE]: {
    name: 'Brass Beetle', hp: 160, damage: 24, armor: 20, speed: 3.5,
    attackRange: 2, aggroRange: 10, xpReward: 45, isBoss: false, scale: 0.7, level: 7,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.PISTON_GOLEM]: {
    name: 'Piston Golem', hp: 320, damage: 40, armor: 30, speed: 2.0,
    attackRange: 3, aggroRange: 10, xpReward: 65, isBoss: false, scale: 1.6, level: 9,
  },
  [EnemyType.ARC_DRONE]: {
    name: 'Arc Drone', hp: 80, damage: 30, armor: 4, speed: 5.5,
    attackRange: 12, aggroRange: 18, xpReward: 40, isBoss: false, scale: 0.5, level: 7,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Crimson Citadel extra enemies --
  [EnemyType.BLOODTHORN_BAT]: {
    name: 'Bloodthorn Bat', hp: 100, damage: 28, armor: 5, speed: 5.5,
    attackRange: 2, aggroRange: 16, xpReward: 42, isBoss: false, scale: 0.6, level: 8,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.SCARLET_ASSASSIN]: {
    name: 'Scarlet Assassin', hp: 150, damage: 42, armor: 10, speed: 5.0,
    attackRange: 2, aggroRange: 18, xpReward: 60, isBoss: false, scale: 1.0, level: 10,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.CRIMSON_SHADE]: {
    name: 'Crimson Shade', hp: 130, damage: 34, armor: 8, speed: 4.0,
    attackRange: 10, aggroRange: 16, xpReward: 52, isBoss: false, scale: 0.9, level: 9,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Stormspire Peak extra enemies --
  [EnemyType.GALE_FALCON]: {
    name: 'Gale Falcon', hp: 110, damage: 32, armor: 4, speed: 6.0,
    attackRange: 2, aggroRange: 20, xpReward: 48, isBoss: false, scale: 0.7, level: 10,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.STATIC_GOLEM]: {
    name: 'Static Golem', hp: 380, damage: 42, armor: 32, speed: 1.8,
    attackRange: 3, aggroRange: 10, xpReward: 70, isBoss: false, scale: 1.6, level: 12,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.STORM_CALLER]: {
    name: 'Storm Caller', hp: 160, damage: 48, armor: 8, speed: 3.0,
    attackRange: 14, aggroRange: 20, xpReward: 65, isBoss: false, scale: 1.0, level: 11,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Shadow Realm extra enemies --
  [EnemyType.FEAR_CRAWLER]: {
    name: 'Fear Crawler', hp: 200, damage: 45, armor: 12, speed: 4.5,
    attackRange: 2, aggroRange: 16, xpReward: 75, isBoss: false, scale: 1.0, level: 14,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.UMBRAL_ASSASSIN]: {
    name: 'Umbral Assassin', hp: 170, damage: 55, armor: 8, speed: 5.5,
    attackRange: 2, aggroRange: 18, xpReward: 80, isBoss: false, scale: 0.9, level: 15,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.VOID_ECHO]: {
    name: 'Void Echo', hp: 150, damage: 40, armor: 6, speed: 4.0,
    attackRange: 12, aggroRange: 20, xpReward: 70, isBoss: false, scale: 0.8, level: 13,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Primordial Abyss extra enemies --
  [EnemyType.ENTROPY_WORM]: {
    name: 'Entropy Worm', hp: 280, damage: 52, armor: 15, speed: 3.5,
    attackRange: 3, aggroRange: 14, xpReward: 90, isBoss: false, scale: 1.3, level: 17,
  },
  [EnemyType.GENESIS_SHADE]: {
    name: 'Genesis Shade', hp: 220, damage: 58, armor: 10, speed: 4.8,
    attackRange: 8, aggroRange: 18, xpReward: 95, isBoss: false, scale: 1.0, level: 18,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.NULL_SENTINEL]: {
    name: 'Null Sentinel', hp: 400, damage: 48, armor: 35, speed: 2.5,
    attackRange: 3, aggroRange: 12, xpReward: 100, isBoss: false, scale: 1.5, level: 18,
    behavior: EnemyBehavior.SHIELDED,
  },
  // -- Moonlit Grove extra enemies --
  [EnemyType.THORN_FAIRY]: {
    name: 'Thorn Fairy', hp: 65, damage: 16, armor: 2, speed: 5.0,
    attackRange: 8, aggroRange: 14, xpReward: 25, isBoss: false, scale: 0.4, level: 2,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.NOCTURNAL_PREDATOR]: {
    name: 'Nocturnal Predator', hp: 150, damage: 24, armor: 8, speed: 5.5,
    attackRange: 2, aggroRange: 16, xpReward: 42, isBoss: false, scale: 1.1, level: 4,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.LUNAR_WISP]: {
    name: 'Lunar Wisp', hp: 55, damage: 20, armor: 1, speed: 4.2,
    attackRange: 10, aggroRange: 16, xpReward: 28, isBoss: false, scale: 0.4, level: 3,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Coral Depths extra enemies --
  [EnemyType.TIDE_LURKER]: {
    name: 'Tide Lurker', hp: 160, damage: 22, armor: 12, speed: 3.5,
    attackRange: 2, aggroRange: 10, xpReward: 40, isBoss: false, scale: 1.0, level: 5,
  },
  [EnemyType.PEARL_GOLEM]: {
    name: 'Pearl Golem', hp: 280, damage: 30, armor: 24, speed: 2.2,
    attackRange: 2.5, aggroRange: 10, xpReward: 55, isBoss: false, scale: 1.4, level: 6,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.DEEP_SEA_PHANTOM]: {
    name: 'Deep Sea Phantom', hp: 100, damage: 28, armor: 4, speed: 4.5,
    attackRange: 10, aggroRange: 16, xpReward: 42, isBoss: false, scale: 0.9, level: 5,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Ancient Library extra enemies --
  [EnemyType.QUILL_FIEND]: {
    name: 'Quill Fiend', hp: 85, damage: 24, armor: 3, speed: 4.8,
    attackRange: 10, aggroRange: 14, xpReward: 35, isBoss: false, scale: 0.6, level: 6,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.PAPER_GOLEM]: {
    name: 'Paper Golem', hp: 200, damage: 22, armor: 16, speed: 3.0,
    attackRange: 2, aggroRange: 10, xpReward: 45, isBoss: false, scale: 1.2, level: 7,
  },
  [EnemyType.RUNE_SPIRIT]: {
    name: 'Rune Spirit', hp: 110, damage: 30, armor: 5, speed: 4.0,
    attackRange: 12, aggroRange: 18, xpReward: 48, isBoss: false, scale: 0.7, level: 7,
    behavior: EnemyBehavior.HEALER,
  },
  // -- Jade Temple extra enemies --
  [EnemyType.JADE_VIPER]: {
    name: 'Jade Viper', hp: 130, damage: 28, armor: 8, speed: 5.2,
    attackRange: 2, aggroRange: 12, xpReward: 45, isBoss: false, scale: 0.8, level: 7,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.TEMPLE_MONK]: {
    name: 'Temple Monk', hp: 180, damage: 24, armor: 14, speed: 3.5,
    attackRange: 2.5, aggroRange: 12, xpReward: 50, isBoss: false, scale: 1.0, level: 8,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.STONE_IDOL_FRAGMENT]: {
    name: 'Stone Idol Fragment', hp: 250, damage: 32, armor: 22, speed: 2.0,
    attackRange: 3, aggroRange: 10, xpReward: 58, isBoss: false, scale: 1.3, level: 8,
  },
  // -- Ashen Battlefield extra enemies --
  [EnemyType.EMBER_KNIGHT]: {
    name: 'Ember Knight', hp: 220, damage: 35, armor: 20, speed: 3.2,
    attackRange: 2.5, aggroRange: 14, xpReward: 60, isBoss: false, scale: 1.2, level: 10,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.WAR_DRUMMER]: {
    name: 'War Drummer', hp: 160, damage: 22, armor: 12, speed: 2.8,
    attackRange: 8, aggroRange: 16, xpReward: 52, isBoss: false, scale: 1.0, level: 9,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.CARRION_SWARM]: {
    name: 'Carrion Swarm', hp: 90, damage: 18, armor: 2, speed: 5.5,
    attackRange: 2, aggroRange: 14, xpReward: 35, isBoss: false, scale: 0.7, level: 8,
    behavior: EnemyBehavior.FLANKER,
  },
  // -- Fungal Depths extra enemies --
  [EnemyType.CORDYCEPS_HOST]: {
    name: 'Cordyceps Host', hp: 190, damage: 26, armor: 10, speed: 2.5,
    attackRange: 2, aggroRange: 8, xpReward: 48, isBoss: false, scale: 1.1, level: 9,
  },
  [EnemyType.LUMINOUS_JELLY]: {
    name: 'Luminous Jelly', hp: 80, damage: 20, armor: 3, speed: 3.0,
    attackRange: 6, aggroRange: 12, xpReward: 32, isBoss: false, scale: 0.6, level: 7,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.ROT_BORER]: {
    name: 'Rot Borer', hp: 140, damage: 30, armor: 14, speed: 4.0,
    attackRange: 2, aggroRange: 10, xpReward: 42, isBoss: false, scale: 0.8, level: 8,
    behavior: EnemyBehavior.FLANKER,
  },
  // -- Obsidian Fortress extra enemies --
  [EnemyType.MAGMA_IMP]: {
    name: 'Magma Imp', hp: 120, damage: 34, armor: 6, speed: 5.0,
    attackRange: 8, aggroRange: 14, xpReward: 50, isBoss: false, scale: 0.6, level: 10,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.OBSIDIAN_HOUND]: {
    name: 'Obsidian Hound', hp: 200, damage: 38, armor: 18, speed: 4.5,
    attackRange: 2, aggroRange: 16, xpReward: 58, isBoss: false, scale: 1.0, level: 11,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.SHADOW_INQUISITOR]: {
    name: 'Shadow Inquisitor', hp: 170, damage: 40, armor: 12, speed: 3.0,
    attackRange: 12, aggroRange: 18, xpReward: 62, isBoss: false, scale: 1.1, level: 11,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Celestial Ruins extra enemies --
  [EnemyType.NOVA_SPRITE]: {
    name: 'Nova Sprite', hp: 90, damage: 36, armor: 3, speed: 5.5,
    attackRange: 10, aggroRange: 18, xpReward: 52, isBoss: false, scale: 0.4, level: 12,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.CONSTELLATION_GOLEM]: {
    name: 'Constellation Golem', hp: 380, damage: 44, armor: 30, speed: 2.0,
    attackRange: 3, aggroRange: 10, xpReward: 72, isBoss: false, scale: 1.6, level: 13,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.GRAVITY_WELL]: {
    name: 'Gravity Well', hp: 150, damage: 42, armor: 8, speed: 1.5,
    attackRange: 8, aggroRange: 20, xpReward: 60, isBoss: false, scale: 1.0, level: 12,
  },
  // -- Infernal Throne extra enemies --
  [EnemyType.CHAIN_DEVIL]: {
    name: 'Chain Devil', hp: 240, damage: 48, armor: 16, speed: 4.0,
    attackRange: 4, aggroRange: 16, xpReward: 78, isBoss: false, scale: 1.2, level: 15,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.BRIMSTONE_CRAWLER]: {
    name: 'Brimstone Crawler', hp: 180, damage: 42, armor: 20, speed: 3.0,
    attackRange: 2, aggroRange: 10, xpReward: 68, isBoss: false, scale: 1.0, level: 14,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.WRATH_SPECTER]: {
    name: 'Wrath Specter', hp: 160, damage: 52, armor: 6, speed: 4.8,
    attackRange: 10, aggroRange: 20, xpReward: 75, isBoss: false, scale: 0.9, level: 15,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Astral Void extra enemies --
  [EnemyType.PARADOX_SHADE]: {
    name: 'Paradox Shade', hp: 200, damage: 55, armor: 10, speed: 5.0,
    attackRange: 2, aggroRange: 18, xpReward: 90, isBoss: false, scale: 1.0, level: 18,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.ANTIMATTER_WISP]: {
    name: 'Antimatter Wisp', hp: 120, damage: 60, armor: 2, speed: 5.5,
    attackRange: 10, aggroRange: 22, xpReward: 85, isBoss: false, scale: 0.5, level: 17,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.FRACTURE_BEAST]: {
    name: 'Fracture Beast', hp: 350, damage: 50, armor: 25, speed: 3.5,
    attackRange: 3, aggroRange: 14, xpReward: 95, isBoss: false, scale: 1.4, level: 18,
  },
  // -- Shattered Colosseum extra enemies --
  [EnemyType.LION_SPIRIT]: {
    name: 'Lion Spirit', hp: 170, damage: 28, armor: 10, speed: 5.2,
    attackRange: 2, aggroRange: 14, xpReward: 45, isBoss: false, scale: 1.1, level: 6,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.PIT_FIGHTER_GHOST]: {
    name: 'Pit Fighter Ghost', hp: 220, damage: 32, armor: 16, speed: 3.8,
    attackRange: 2.5, aggroRange: 12, xpReward: 55, isBoss: false, scale: 1.2, level: 7,
  },
  [EnemyType.MIRMILLO_SPECTER]: {
    name: 'Mirmillo Specter', hp: 260, damage: 26, armor: 22, speed: 3.0,
    attackRange: 2, aggroRange: 10, xpReward: 58, isBoss: false, scale: 1.2, level: 7,
    behavior: EnemyBehavior.SHIELDED,
  },
  // -- Petrified Garden extra enemies --
  [EnemyType.MOSS_BASILISK]: {
    name: 'Moss Basilisk', hp: 200, damage: 30, armor: 18, speed: 3.0,
    attackRange: 6, aggroRange: 14, xpReward: 55, isBoss: false, scale: 1.1, level: 8,
  },
  [EnemyType.CALCIFIED_NYMPH]: {
    name: 'Calcified Nymph', hp: 130, damage: 26, armor: 10, speed: 4.0,
    attackRange: 10, aggroRange: 16, xpReward: 45, isBoss: false, scale: 0.9, level: 7,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.STONE_SERPENT]: {
    name: 'Stone Serpent', hp: 180, damage: 34, armor: 20, speed: 4.5,
    attackRange: 2, aggroRange: 12, xpReward: 52, isBoss: false, scale: 1.0, level: 8,
    behavior: EnemyBehavior.FLANKER,
  },
  // -- Sunken Citadel extra enemies --
  [EnemyType.BARNACLE_KNIGHT]: {
    name: 'Barnacle Knight', hp: 250, damage: 34, armor: 24, speed: 2.5,
    attackRange: 2.5, aggroRange: 10, xpReward: 60, isBoss: false, scale: 1.3, level: 9,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.PRESSURE_PHANTOM]: {
    name: 'Pressure Phantom', hp: 140, damage: 38, armor: 6, speed: 4.5,
    attackRange: 8, aggroRange: 16, xpReward: 52, isBoss: false, scale: 0.9, level: 9,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.KELP_HORROR]: {
    name: 'Kelp Horror', hp: 190, damage: 30, armor: 12, speed: 3.0,
    attackRange: 4, aggroRange: 12, xpReward: 48, isBoss: false, scale: 1.2, level: 8,
  },
  // -- Wyrmscar Canyon extra enemies --
  [EnemyType.CLIFF_RAPTOR]: {
    name: 'Cliff Raptor', hp: 140, damage: 32, armor: 8, speed: 5.5,
    attackRange: 2, aggroRange: 16, xpReward: 50, isBoss: false, scale: 0.9, level: 10,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.NEST_GUARDIAN]: {
    name: 'Nest Guardian', hp: 300, damage: 38, armor: 22, speed: 2.8,
    attackRange: 2.5, aggroRange: 12, xpReward: 65, isBoss: false, scale: 1.4, level: 11,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.MAGMA_DRAKE]: {
    name: 'Magma Drake', hp: 220, damage: 44, armor: 14, speed: 4.0,
    attackRange: 8, aggroRange: 18, xpReward: 70, isBoss: false, scale: 1.2, level: 11,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Plaguerot Sewers extra enemies --
  [EnemyType.BLOAT_RAT]: {
    name: 'Bloat Rat', hp: 100, damage: 20, armor: 6, speed: 4.5,
    attackRange: 2, aggroRange: 10, xpReward: 35, isBoss: false, scale: 0.7, level: 8,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.PESTILENT_SLIME]: {
    name: 'Pestilent Slime', hp: 160, damage: 24, armor: 14, speed: 2.0,
    attackRange: 3, aggroRange: 8, xpReward: 42, isBoss: false, scale: 1.0, level: 9,
  },
  [EnemyType.SEWER_HARPY]: {
    name: 'Sewer Harpy', hp: 120, damage: 30, armor: 5, speed: 5.0,
    attackRange: 8, aggroRange: 16, xpReward: 45, isBoss: false, scale: 0.8, level: 9,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Ethereal Sanctum extra enemies --
  [EnemyType.ETHER_WISP]: {
    name: 'Ether Wisp', hp: 80, damage: 34, armor: 2, speed: 5.5,
    attackRange: 10, aggroRange: 18, xpReward: 48, isBoss: false, scale: 0.4, level: 11,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.SPECTRAL_MONK]: {
    name: 'Spectral Monk', hp: 200, damage: 30, armor: 16, speed: 3.5,
    attackRange: 2.5, aggroRange: 12, xpReward: 55, isBoss: false, scale: 1.0, level: 12,
    behavior: EnemyBehavior.HEALER,
  },
  [EnemyType.PHASE_SPIDER]: {
    name: 'Phase Spider', hp: 130, damage: 36, armor: 6, speed: 5.5,
    attackRange: 2, aggroRange: 14, xpReward: 50, isBoss: false, scale: 0.8, level: 11,
    behavior: EnemyBehavior.FLANKER,
  },
  // -- Iron Wastes extra enemies --
  [EnemyType.JUNK_GOLEM]: {
    name: 'Junk Golem', hp: 320, damage: 36, armor: 28, speed: 2.0,
    attackRange: 3, aggroRange: 10, xpReward: 62, isBoss: false, scale: 1.5, level: 13,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.SCRAP_HAWK]: {
    name: 'Scrap Hawk', hp: 110, damage: 32, armor: 5, speed: 6.0,
    attackRange: 2, aggroRange: 18, xpReward: 45, isBoss: false, scale: 0.7, level: 12,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.RUST_MITE_SWARM]: {
    name: 'Rust Mite Swarm', hp: 70, damage: 18, armor: 2, speed: 4.5,
    attackRange: 1.5, aggroRange: 8, xpReward: 30, isBoss: false, scale: 0.5, level: 11,
  },
  // -- Blighted Throne extra enemies --
  [EnemyType.PLAGUE_KNIGHT]: {
    name: 'Plague Knight', hp: 260, damage: 42, armor: 22, speed: 3.2,
    attackRange: 2.5, aggroRange: 14, xpReward: 72, isBoss: false, scale: 1.2, level: 14,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.BLIGHTED_NOBLE]: {
    name: 'Blighted Noble', hp: 180, damage: 38, armor: 12, speed: 3.5,
    attackRange: 8, aggroRange: 16, xpReward: 65, isBoss: false, scale: 1.0, level: 14,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.ROT_JESTER]: {
    name: 'Rot Jester', hp: 140, damage: 44, armor: 6, speed: 5.0,
    attackRange: 6, aggroRange: 18, xpReward: 68, isBoss: false, scale: 0.9, level: 13,
    behavior: EnemyBehavior.FLANKER,
  },
  // -- Chrono Labyrinth extra enemies --
  [EnemyType.PHASE_BEETLE]: {
    name: 'Phase Beetle', hp: 160, damage: 36, armor: 14, speed: 4.5,
    attackRange: 2, aggroRange: 12, xpReward: 58, isBoss: false, scale: 0.8, level: 14,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.TIMELOST_SOLDIER]: {
    name: 'Timelost Soldier', hp: 230, damage: 40, armor: 20, speed: 3.5,
    attackRange: 2.5, aggroRange: 14, xpReward: 65, isBoss: false, scale: 1.1, level: 15,
  },
  [EnemyType.ENTROPY_WEAVER]: {
    name: 'Entropy Weaver', hp: 150, damage: 46, armor: 8, speed: 3.0,
    attackRange: 12, aggroRange: 18, xpReward: 70, isBoss: false, scale: 1.0, level: 15,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Eldritch Nexus extra enemies --
  [EnemyType.TENTACLE_HORROR]: {
    name: 'Tentacle Horror', hp: 300, damage: 50, armor: 18, speed: 3.0,
    attackRange: 4, aggroRange: 14, xpReward: 85, isBoss: false, scale: 1.4, level: 17,
  },
  [EnemyType.GIBBERING_MOUTHER]: {
    name: 'Gibbering Mouther', hp: 200, damage: 44, armor: 10, speed: 2.5,
    attackRange: 6, aggroRange: 12, xpReward: 75, isBoss: false, scale: 1.2, level: 16,
  },
  [EnemyType.PSYCHIC_LEECH]: {
    name: 'Psychic Leech', hp: 120, damage: 52, armor: 4, speed: 4.8,
    attackRange: 10, aggroRange: 18, xpReward: 80, isBoss: false, scale: 0.7, level: 16,
    behavior: EnemyBehavior.RANGED,
  },
};

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
//  SKILL BRANCH / SPECIALIZATION SYSTEM
// ---------------------------------------------------------------------------

export interface SkillBranchOption {
  name: string;
  icon: string;
  description: string;
  damageMult?: number;
  cooldownMult?: number;
  manaCostMult?: number;
  aoeRadiusMult?: number;
  extraProjectiles?: number;
  statusOverride?: string;
  bonusEffect?: string;
}

export interface SkillBranchDef {
  skillId: string;
  tier: 1 | 2;
  talentReq: number;
  optionA: SkillBranchOption;
  optionB: SkillBranchOption;
}

export const SKILL_BRANCHES: SkillBranchDef[] = [
  // ── WARRIOR ──────────────────────────────────────────────────
  // Cleave
  { skillId: 'CLEAVE', tier: 1, talentReq: 5,
    optionA: { name: 'Rending Cleave', icon: '🩸', description: 'Tears flesh open, leaving enemies bleeding', damageMult: 1.3, statusOverride: 'BLEEDING' },
    optionB: { name: 'Sweeping Arc', icon: '🌊', description: 'Widens the arc to engulf everything', aoeRadiusMult: 2.0, damageMult: 0.9 },
  },
  { skillId: 'CLEAVE', tier: 2, talentReq: 15,
    optionA: { name: "Executioner's Edge", icon: '⚰️', description: 'Devastating against wounded foes', damageMult: 1.8, bonusEffect: 'EXECUTE_LOW_HP' },
    optionB: { name: 'Whirlcleave', icon: '🌪️', description: 'A full 360° arc of destruction', aoeRadiusMult: 1.5, damageMult: 1.3 },
  },
  // Shield Bash
  { skillId: 'SHIELD_BASH', tier: 1, talentReq: 5,
    optionA: { name: 'Concussive Blow', icon: '💫', description: 'The impact rattles skulls in a wide radius', aoeRadiusMult: 1.8, bonusEffect: 'STUN_AOE' },
    optionB: { name: 'Shield Charge', icon: '🏃', description: 'Rush forward shield-first, bowling over everything', damageMult: 1.5, bonusEffect: 'DASH_FORWARD' },
  },
  { skillId: 'SHIELD_BASH', tier: 2, talentReq: 15,
    optionA: { name: 'Iron Fortress', icon: '🏰', description: 'Each bash hardens your defense', bonusEffect: 'GRANT_ARMOR', manaCostMult: 1.3 },
    optionB: { name: 'Shattering Impact', icon: '💥', description: 'Cracks through even the thickest armor', damageMult: 1.4, bonusEffect: 'ARMOR_SHRED' },
  },
  // Whirlwind
  { skillId: 'WHIRLWIND', tier: 1, talentReq: 6,
    optionA: { name: 'Vortex Pull', icon: '🌀', description: 'Enemies are sucked into the blade storm', aoeRadiusMult: 1.5, bonusEffect: 'PULL_ENEMIES' },
    optionB: { name: 'Bloodletter Spin', icon: '🩸', description: 'Each rotation steals life from the wounded', damageMult: 1.2, bonusEffect: 'LIFE_STEAL_AOE' },
  },
  { skillId: 'WHIRLWIND', tier: 2, talentReq: 16,
    optionA: { name: 'Eternal Cyclone', icon: '♾️', description: 'The spin persists, shredding all who approach', aoeRadiusMult: 1.3, cooldownMult: 0.5 },
    optionB: { name: 'Razor Tempest', icon: '🗡️', description: 'Each revolution hits harder than the last', damageMult: 1.8, manaCostMult: 1.4 },
  },
  // Battle Cry
  { skillId: 'BATTLE_CRY', tier: 1, talentReq: 7,
    optionA: { name: 'War Drums', icon: '🥁', description: 'The thunderous cry quickens your blade arm', bonusEffect: 'BUFF_ATTACK_SPEED' },
    optionB: { name: 'Demoralizing Shout', icon: '😱', description: 'Enemies cower, their strikes weakened', bonusEffect: 'DEBUFF_ENEMIES' },
  },
  { skillId: 'BATTLE_CRY', tier: 2, talentReq: 17,
    optionA: { name: 'Rallying Cry', icon: '💚', description: 'Your war cry mends wounds with sheer willpower', bonusEffect: 'HEAL_ON_CRY' },
    optionB: { name: 'Berserker Rage', icon: '🔥', description: 'Trade safety for overwhelming power', bonusEffect: 'BERSERKER_MODE' },
  },
  // Ground Slam
  { skillId: 'GROUND_SLAM', tier: 1, talentReq: 8,
    optionA: { name: 'Fissure', icon: '🌋', description: 'The earth cracks open, leaving scorching ground', bonusEffect: 'LAVA_GROUND', damageMult: 1.2 },
    optionB: { name: 'Seismic Lance', icon: '🔱', description: 'A focused shockwave that pierces through all', aoeRadiusMult: 0.5, damageMult: 2.0, bonusEffect: 'PIERCING_WAVE' },
  },
  { skillId: 'GROUND_SLAM', tier: 2, talentReq: 18,
    optionA: { name: 'Tectonic Upheaval', icon: '🏔️', description: 'The ground itself rises to crush your foes', damageMult: 1.6, aoeRadiusMult: 1.5, cooldownMult: 1.3 },
    optionB: { name: 'Petrifying Slam', icon: '🪨', description: 'Turns enemies to stone on impact', statusOverride: 'FROZEN', damageMult: 1.3 },
  },
  // Blade Fury
  { skillId: 'BLADE_FURY', tier: 1, talentReq: 9,
    optionA: { name: 'Thousand Cuts', icon: '✂️', description: 'A blur of slashes — more hits, relentless pressure', damageMult: 0.6, cooldownMult: 0.4, manaCostMult: 0.5 },
    optionB: { name: 'Mortal Strike', icon: '💀', description: 'Fewer swings, but each one is absolutely devastating', damageMult: 2.5, cooldownMult: 1.5, bonusEffect: 'GUARANTEED_CRIT' },
  },
  { skillId: 'BLADE_FURY', tier: 2, talentReq: 19,
    optionA: { name: 'Blood Frenzy', icon: '🩸', description: 'Each cut feeds your vitality', bonusEffect: 'LIFE_STEAL_AOE', damageMult: 1.2 },
    optionB: { name: 'Tempest Blades', icon: '⚔️', description: 'Slashes become projectiles that fly outward', bonusEffect: 'BLADE_PROJECTILES', damageMult: 1.0, extraProjectiles: 4 },
  },

  // ── MAGE ─────────────────────────────────────────────────────
  // Fireball
  { skillId: 'FIREBALL', tier: 1, talentReq: 5,
    optionA: { name: 'Inferno Orb', icon: '☀️', description: 'A massive sphere of fire that engulfs everything', aoeRadiusMult: 2.0, damageMult: 1.3, cooldownMult: 1.4 },
    optionB: { name: 'Pyroclasm', icon: '🔥', description: 'Splits into three smaller fireballs mid-flight', damageMult: 0.7, extraProjectiles: 2 },
  },
  { skillId: 'FIREBALL', tier: 2, talentReq: 15,
    optionA: { name: 'Phoenix Fire', icon: '🦅', description: 'The flames heal you as they burn others', bonusEffect: 'HEAL_ON_BURN', damageMult: 1.2 },
    optionB: { name: 'Hellfire', icon: '🌋', description: 'Leaves a pool of eternal flame on the ground', bonusEffect: 'BURNING_GROUND', damageMult: 1.1 },
  },
  // Lightning Bolt
  { skillId: 'LIGHTNING_BOLT', tier: 1, talentReq: 5,
    optionA: { name: 'Ball Lightning', icon: '⚡', description: 'A slow, crackling sphere that electrocutes a wide area', aoeRadiusMult: 3.0, damageMult: 0.8, bonusEffect: 'SLOW_PROJECTILE' },
    optionB: { name: 'Thunderstrike', icon: '🌩️', description: 'Instant devastation on a single target', damageMult: 2.2, cooldownMult: 1.5 },
  },
  { skillId: 'LIGHTNING_BOLT', tier: 2, talentReq: 15,
    optionA: { name: 'Overcharge', icon: '🔋', description: 'Each bolt empowers your next spell', bonusEffect: 'OVERCHARGE_NEXT', damageMult: 1.1 },
    optionB: { name: 'Static Field', icon: '⚡', description: 'Deals damage based on enemy max HP', bonusEffect: 'PERCENT_HP_DAMAGE', damageMult: 0.5 },
  },
  // Ice Nova
  { skillId: 'ICE_NOVA', tier: 1, talentReq: 6,
    optionA: { name: 'Glacial Expanse', icon: '❄️', description: 'The frost reaches far, coating the entire battlefield', aoeRadiusMult: 2.5, damageMult: 0.8, cooldownMult: 1.3 },
    optionB: { name: 'Flash Freeze', icon: '🧊', description: 'An instant, inescapable deep freeze in a small area', aoeRadiusMult: 0.6, damageMult: 1.8, bonusEffect: 'DEEP_FREEZE' },
  },
  { skillId: 'ICE_NOVA', tier: 2, talentReq: 16,
    optionA: { name: 'Permafrost', icon: '🥶', description: 'Frozen enemies shatter for massive bonus damage', bonusEffect: 'SHATTER_DAMAGE', damageMult: 1.4 },
    optionB: { name: 'Crystalline Barrier', icon: '💎', description: 'The nova leaves a ring of ice that blocks enemies', bonusEffect: 'ICE_WALL', aoeRadiusMult: 1.2 },
  },
  // Arcane Shield
  { skillId: 'ARCANE_SHIELD', tier: 1, talentReq: 7,
    optionA: { name: 'Mana Fortress', icon: '🏛️', description: 'Absorbs far more damage but drains mana over time', bonusEffect: 'MANA_DRAIN_SHIELD', damageMult: 0 },
    optionB: { name: 'Mirror Shield', icon: '🪞', description: 'Reflects a portion of all damage back to attackers', bonusEffect: 'REFLECT_DAMAGE' },
  },
  { skillId: 'ARCANE_SHIELD', tier: 2, talentReq: 17,
    optionA: { name: 'Temporal Rewind', icon: '⏪', description: 'When the shield breaks, rewind your HP to before', bonusEffect: 'HP_REWIND' },
    optionB: { name: 'Arcane Detonation', icon: '💥', description: 'The shield explodes violently when it expires', bonusEffect: 'EXPLODE_ON_EXPIRE', damageMult: 3.0 },
  },
  // Meteor
  { skillId: 'METEOR', tier: 1, talentReq: 8,
    optionA: { name: 'Meteor Shower', icon: '🌠', description: 'Three smaller meteors rain down across a wider area', aoeRadiusMult: 0.6, damageMult: 0.6, bonusEffect: 'TRIPLE_METEOR' },
    optionB: { name: 'Extinction Event', icon: '☄️', description: 'One colossal impact. Slower. Utterly devastating.', damageMult: 3.0, aoeRadiusMult: 1.5, cooldownMult: 2.0, manaCostMult: 2.0 },
  },
  { skillId: 'METEOR', tier: 2, talentReq: 18,
    optionA: { name: 'Molten Core', icon: '🌋', description: 'Leaves a persistent lava pool that burns for 8 seconds', bonusEffect: 'LAVA_GROUND', damageMult: 1.2 },
    optionB: { name: 'Cosmic Impact', icon: '🌌', description: 'The meteor freezes and burns simultaneously', statusOverride: 'FROZEN', damageMult: 1.5 },
  },
  // Chain Lightning
  { skillId: 'CHAIN_LIGHTNING', tier: 1, talentReq: 9,
    optionA: { name: 'Storm Surge', icon: '🌊', description: 'Bounces to twice as many targets', damageMult: 0.7, bonusEffect: 'EXTRA_BOUNCES' },
    optionB: { name: 'Focused Conduit', icon: '🔌', description: 'Fewer bounces but devastating power per hit', damageMult: 2.0, bonusEffect: 'FEWER_BOUNCES' },
  },
  { skillId: 'CHAIN_LIGHTNING', tier: 2, talentReq: 19,
    optionA: { name: 'Thunderstorm Aura', icon: '⛈️', description: 'Passively zaps nearby enemies while on cooldown', bonusEffect: 'PASSIVE_LIGHTNING_AURA' },
    optionB: { name: 'Lightning Rod', icon: '🎯', description: 'Marks the target — all future lightning hits them', bonusEffect: 'LIGHTNING_MARK', damageMult: 1.5 },
  },

  // ── RANGER ───────────────────────────────────────────────────
  // Multi Shot
  { skillId: 'MULTI_SHOT', tier: 1, talentReq: 5,
    optionA: { name: 'Barrage', icon: '🎯', description: 'Fires 8 arrows in a tight pattern for focused damage', extraProjectiles: 3, damageMult: 0.9 },
    optionB: { name: 'Scatter Shot', icon: '💨', description: 'A wide fan of arrows that knocks enemies back', aoeRadiusMult: 1.5, bonusEffect: 'KNOCKBACK', damageMult: 0.8 },
  },
  { skillId: 'MULTI_SHOT', tier: 2, talentReq: 15,
    optionA: { name: 'Elemental Volley', icon: '🌈', description: 'Each arrow carries a random element', bonusEffect: 'RANDOM_ELEMENT', damageMult: 1.2 },
    optionB: { name: 'Seeking Arrows', icon: '🏹', description: 'Arrows curve toward the nearest enemy', bonusEffect: 'HOMING', damageMult: 1.1 },
  },
  // Poison Arrow
  { skillId: 'POISON_ARROW', tier: 1, talentReq: 5,
    optionA: { name: 'Plague Arrow', icon: '🦠', description: 'Poison spreads to nearby enemies on hit', bonusEffect: 'SPREADING_POISON', damageMult: 0.9 },
    optionB: { name: 'Viper Strike', icon: '🐍', description: 'Concentrated venom deals massive initial poison damage', damageMult: 2.5, cooldownMult: 1.5 },
  },
  { skillId: 'POISON_ARROW', tier: 2, talentReq: 15,
    optionA: { name: 'Necrotic Arrow', icon: '☠️', description: 'Poisoned enemies cannot heal', bonusEffect: 'ANTI_HEAL', damageMult: 1.2 },
    optionB: { name: 'Toxic Cloud', icon: '☁️', description: 'Impact creates a lingering poison zone', bonusEffect: 'POISON_GROUND', aoeRadiusMult: 3.0 },
  },
  // Evasive Roll
  { skillId: 'EVASIVE_ROLL', tier: 1, talentReq: 6,
    optionA: { name: 'Shadow Step', icon: '👤', description: 'Teleport through the shadows instead of rolling', bonusEffect: 'TELEPORT', damageMult: 0 },
    optionB: { name: 'Combat Roll', icon: '⚔️', description: 'The roll damages enemies you pass through', damageMult: 1.5, bonusEffect: 'DAMAGE_ON_ROLL' },
  },
  { skillId: 'EVASIVE_ROLL', tier: 2, talentReq: 16,
    optionA: { name: 'Smoke Bomb', icon: '💨', description: 'Leave behind a blinding cloud of smoke', bonusEffect: 'SMOKE_CLOUD' },
    optionB: { name: 'Afterimage', icon: '👻', description: 'Leave a decoy behind that draws enemy attention', bonusEffect: 'SPAWN_DECOY' },
  },
  // Explosive Trap
  { skillId: 'EXPLOSIVE_TRAP', tier: 1, talentReq: 7,
    optionA: { name: 'Cluster Mines', icon: '💣', description: 'Places 3 smaller traps in a triangle formation', bonusEffect: 'TRIPLE_TRAP', damageMult: 0.6 },
    optionB: { name: 'Mega Charge', icon: '🧨', description: 'One enormous explosion with devastating power', damageMult: 2.5, aoeRadiusMult: 1.8, cooldownMult: 1.5 },
  },
  { skillId: 'EXPLOSIVE_TRAP', tier: 2, talentReq: 17,
    optionA: { name: 'Frost Trap', icon: '❄️', description: 'The trap freezes instead of burning', statusOverride: 'FROZEN', damageMult: 1.1 },
    optionB: { name: 'Chain Reaction', icon: '🔗', description: 'Explosions trigger nearby traps to also detonate', bonusEffect: 'CHAIN_DETONATION', damageMult: 1.3 },
  },
  // Rain of Arrows
  { skillId: 'RAIN_OF_ARROWS', tier: 1, talentReq: 8,
    optionA: { name: 'Hailstorm', icon: '🧊', description: 'Icy arrows that slow and freeze the battlefield', statusOverride: 'FROZEN', damageMult: 1.1 },
    optionB: { name: 'Fire Rain', icon: '🔥', description: 'Flaming arrows leave the ground ablaze', statusOverride: 'BURNING', bonusEffect: 'BURNING_GROUND', damageMult: 1.2 },
  },
  { skillId: 'RAIN_OF_ARROWS', tier: 2, talentReq: 18,
    optionA: { name: 'Carpet Bombing', icon: '💣', description: 'Covers a massive area', aoeRadiusMult: 2.0, damageMult: 0.7 },
    optionB: { name: 'Focused Volley', icon: '🎯', description: 'Precise, devastating barrage on a small area', aoeRadiusMult: 0.5, damageMult: 2.5 },
  },
  // Piercing Shot
  { skillId: 'PIERCING_SHOT', tier: 1, talentReq: 9,
    optionA: { name: 'Railgun', icon: '🔫', description: 'Punches through with absurd force', damageMult: 3.0, cooldownMult: 2.0, manaCostMult: 2.0 },
    optionB: { name: 'Ricochet', icon: '🔄', description: 'The arrow bounces between enemies', bonusEffect: 'RICOCHET', damageMult: 0.8, extraProjectiles: 3 },
  },
  { skillId: 'PIERCING_SHOT', tier: 2, talentReq: 19,
    optionA: { name: 'Armor Breaker', icon: '🛡️', description: 'Strips 50% armor from everything it hits', bonusEffect: 'ARMOR_SHRED', damageMult: 1.3 },
    optionB: { name: 'Heart Seeker', icon: '❤️', description: 'Guaranteed critical hit on the first target', bonusEffect: 'GUARANTEED_CRIT', damageMult: 1.5 },
  },

  // ── WARRIOR UNLOCKABLE ────────────────────────────────────
  // Heroic Leap
  { skillId: 'LEAP', tier: 1, talentReq: 5,
    optionA: { name: 'Meteor Drop', icon: '☄️', description: 'Land with explosive force in a wider radius', aoeRadiusMult: 1.8, damageMult: 1.3 },
    optionB: { name: 'Pounce', icon: '🐆', description: 'Faster leap that resets on kill', cooldownMult: 0.5, damageMult: 0.8, bonusEffect: 'RESET_ON_KILL' },
  },
  { skillId: 'LEAP', tier: 2, talentReq: 15,
    optionA: { name: 'Earthshatter', icon: '🌋', description: 'Leave behind a lava pool on landing', bonusEffect: 'LAVA_GROUND', damageMult: 1.5 },
    optionB: { name: 'Thunderclap', icon: '⚡', description: 'Landing sends out a shockwave that stuns', aoeRadiusMult: 1.5, bonusEffect: 'STUN_AOE', damageMult: 1.2 },
  },
  // Iron Skin
  { skillId: 'IRON_SKIN', tier: 1, talentReq: 7,
    optionA: { name: 'Thorns', icon: '🌹', description: 'Reflects damage back to attackers while active', bonusEffect: 'REFLECT_DAMAGE' },
    optionB: { name: 'Fortified', icon: '🏰', description: 'Double the armor bonus but shorter duration', damageMult: 0, bonusEffect: 'DOUBLE_ARMOR' },
  },
  { skillId: 'IRON_SKIN', tier: 2, talentReq: 17,
    optionA: { name: 'Unstoppable', icon: '🚂', description: 'Immune to stuns and slows while active', bonusEffect: 'CC_IMMUNE' },
    optionB: { name: 'Living Fortress', icon: '🛡️', description: 'Nearby allies also gain armor bonus', aoeRadiusMult: 5.0, bonusEffect: 'AURA_ARMOR' },
  },
  // Taunt
  { skillId: 'TAUNT', tier: 1, talentReq: 8,
    optionA: { name: 'Mocking Blow', icon: '👊', description: 'Taunt also deals damage to nearby enemies', damageMult: 1.5, aoeRadiusMult: 1.0 },
    optionB: { name: 'Challenging Shout', icon: '📢', description: 'Wider range, taunts even distant enemies', aoeRadiusMult: 2.0 },
  },
  { skillId: 'TAUNT', tier: 2, talentReq: 18,
    optionA: { name: 'Retribution', icon: '⚔️', description: 'Gain damage boost for each enemy taunted', bonusEffect: 'DAMAGE_PER_TAUNT', damageMult: 1.0 },
    optionB: { name: 'Iron Will', icon: '💎', description: 'Gain damage reduction for each enemy taunted', bonusEffect: 'DEFENSE_PER_TAUNT' },
  },
  // Crushing Blow
  { skillId: 'CRUSHING_BLOW', tier: 1, talentReq: 6,
    optionA: { name: 'Skull Cracker', icon: '💀', description: 'Stuns the target on impact', statusOverride: 'STUNNED', damageMult: 1.2 },
    optionB: { name: 'Sunder', icon: '⚡', description: 'Shreds target armor permanently', bonusEffect: 'ARMOR_SHRED', damageMult: 1.0 },
  },
  { skillId: 'CRUSHING_BLOW', tier: 2, talentReq: 16,
    optionA: { name: 'Colossus Smash', icon: '🔨', description: 'Absolutely devastating single hit', damageMult: 2.5, cooldownMult: 1.5 },
    optionB: { name: 'Tremor Strike', icon: '🌊', description: 'Impact sends shockwaves, adding AOE', aoeRadiusMult: 4.0, damageMult: 1.3 },
  },
  // Intimidating Roar
  { skillId: 'INTIMIDATING_ROAR', tier: 1, talentReq: 9,
    optionA: { name: 'Deafening Roar', icon: '🔊', description: 'Enemies are also stunned briefly', bonusEffect: 'STUN_AOE', damageMult: 0.8 },
    optionB: { name: 'Terrify', icon: '😱', description: 'Enemies flee in fear instead of fighting', bonusEffect: 'FEAR', aoeRadiusMult: 1.3 },
  },
  { skillId: 'INTIMIDATING_ROAR', tier: 2, talentReq: 19,
    optionA: { name: 'Warcry of Vigor', icon: '💚', description: 'Also heals you for 20% of max HP', bonusEffect: 'HEAL_ON_CRY', damageMult: 0.5 },
    optionB: { name: 'Savage Howl', icon: '🐺', description: 'Massively increased damage and slow', damageMult: 2.0, statusOverride: 'SLOWED' },
  },
  // Earthquake
  { skillId: 'EARTHQUAKE', tier: 1, talentReq: 8,
    optionA: { name: 'Aftershocks', icon: '🌊', description: 'Multiple smaller quakes follow the initial burst', bonusEffect: 'AFTERSHOCKS', damageMult: 0.8 },
    optionB: { name: 'Volcanic Eruption', icon: '🌋', description: 'Fire damage and burning ground', statusOverride: 'BURNING', bonusEffect: 'BURNING_GROUND', damageMult: 1.2 },
  },
  { skillId: 'EARTHQUAKE', tier: 2, talentReq: 18,
    optionA: { name: 'World Ender', icon: '🌍', description: 'Even larger radius of total destruction', aoeRadiusMult: 1.8, damageMult: 1.5, cooldownMult: 1.5 },
    optionB: { name: 'Fissure Walk', icon: '🔥', description: 'Creates a line of fissures toward cursor', bonusEffect: 'PIERCING_WAVE', damageMult: 1.3 },
  },

  // ── MAGE UNLOCKABLE ───────────────────────────────────────
  // Summon Elemental
  { skillId: 'SUMMON_ELEMENTAL', tier: 1, talentReq: 5,
    optionA: { name: 'Frost Golem', icon: '🧊', description: 'Summon an ice golem that freezes enemies', statusOverride: 'FROZEN', damageMult: 1.0 },
    optionB: { name: 'Storm Spirit', icon: '⚡', description: 'Summon a lightning spirit that chains attacks', damageMult: 1.3, bonusEffect: 'EXTRA_BOUNCES' },
  },
  { skillId: 'SUMMON_ELEMENTAL', tier: 2, talentReq: 15,
    optionA: { name: 'Phoenix', icon: '🦅', description: 'Summon a phoenix that heals you over time', bonusEffect: 'HEAL_ON_BURN', damageMult: 0.8 },
    optionB: { name: 'Infernal', icon: '😈', description: 'A powerful demon that deals massive damage', damageMult: 2.5, cooldownMult: 1.5, manaCostMult: 1.5 },
  },
  // Blink
  { skillId: 'BLINK', tier: 1, talentReq: 6,
    optionA: { name: 'Phase Shift', icon: '👻', description: 'Become intangible briefly after blinking', bonusEffect: 'CC_IMMUNE', damageMult: 0 },
    optionB: { name: 'Warp Strike', icon: '💥', description: 'Deal arcane damage at both departure and arrival', damageMult: 2.0, aoeRadiusMult: 1.5 },
  },
  { skillId: 'BLINK', tier: 2, talentReq: 16,
    optionA: { name: 'Riftwalk', icon: '🌀', description: 'Two charges of Blink stored', cooldownMult: 0.4, manaCostMult: 0.7 },
    optionB: { name: 'Dimensional Tear', icon: '🌌', description: 'Leave a damaging rift at departure point', bonusEffect: 'BURNING_GROUND', damageMult: 1.5 },
  },
  // Frost Barrier
  { skillId: 'FROST_BARRIER', tier: 1, talentReq: 7,
    optionA: { name: 'Blizzard Wall', icon: '❄️', description: 'Barrier is larger and deals more damage', aoeRadiusMult: 1.5, damageMult: 1.5 },
    optionB: { name: 'Ice Prison', icon: '🔒', description: 'Smaller but deep-freezes enemies inside', aoeRadiusMult: 0.6, bonusEffect: 'DEEP_FREEZE', damageMult: 2.0 },
  },
  { skillId: 'FROST_BARRIER', tier: 2, talentReq: 17,
    optionA: { name: 'Permafrost Ring', icon: '💎', description: 'Barrier persists much longer', cooldownMult: 0.7, damageMult: 1.2 },
    optionB: { name: 'Shatter Barrier', icon: '💥', description: 'Barrier explodes when it expires dealing massive damage', bonusEffect: 'EXPLODE_ON_EXPIRE', damageMult: 3.0 },
  },
  // Arcane Missiles
  { skillId: 'ARCANE_MISSILES', tier: 1, talentReq: 8,
    optionA: { name: 'Barrage', icon: '💜', description: 'Fire 8 missiles instead of 5', extraProjectiles: 3, damageMult: 0.9 },
    optionB: { name: 'Charged Bolts', icon: '⚡', description: 'Fewer but much more powerful missiles', extraProjectiles: -2, damageMult: 2.5 },
  },
  { skillId: 'ARCANE_MISSILES', tier: 2, talentReq: 18,
    optionA: { name: 'Seeking Missiles', icon: '🎯', description: 'Missiles home in on enemies', bonusEffect: 'HOMING', damageMult: 1.2 },
    optionB: { name: 'Arcane Overload', icon: '💥', description: 'Each missile explodes on impact', aoeRadiusMult: 2.0, damageMult: 0.8 },
  },
  // Mana Siphon
  { skillId: 'MANA_SIPHON', tier: 1, talentReq: 9,
    optionA: { name: 'Soul Drain', icon: '👻', description: 'Drains more aggressively, recovering HP too', damageMult: 1.8, bonusEffect: 'LIFE_STEAL_AOE' },
    optionB: { name: 'Essence Tap', icon: '🔮', description: 'Lower damage but massive mana recovery', damageMult: 0.5, manaCostMult: -1.0 },
  },
  { skillId: 'MANA_SIPHON', tier: 2, talentReq: 19,
    optionA: { name: 'Void Consumption', icon: '🕳️', description: 'Pull enemies toward you while draining', bonusEffect: 'PULL_ENEMIES', damageMult: 1.3 },
    optionB: { name: 'Arcane Eruption', icon: '💥', description: 'Excess mana detonates in an explosion', bonusEffect: 'EXPLODE_ON_EXPIRE', damageMult: 2.0, aoeRadiusMult: 1.5 },
  },
  // Time Warp
  { skillId: 'TIME_WARP', tier: 1, talentReq: 8,
    optionA: { name: 'Temporal Prison', icon: '⏸️', description: 'Completely freeze enemies instead of slowing', statusOverride: 'FROZEN', damageMult: 0.8 },
    optionB: { name: 'Haste Field', icon: '⏩', description: 'Also speeds up the caster dramatically', bonusEffect: 'BUFF_ATTACK_SPEED', damageMult: 0.5 },
  },
  { skillId: 'TIME_WARP', tier: 2, talentReq: 18,
    optionA: { name: 'Chrono Trap', icon: '⏳', description: 'Enemies take accumulated damage when time resumes', bonusEffect: 'DELAYED_DAMAGE', damageMult: 3.0 },
    optionB: { name: 'Age of Decay', icon: '💀', description: 'Enemies wither, losing max HP permanently', bonusEffect: 'PERCENT_HP_DAMAGE', damageMult: 1.0 },
  },

  // ── RANGER UNLOCKABLE ─────────────────────────────────────
  // Grappling Hook
  { skillId: 'GRAPPLING_HOOK', tier: 1, talentReq: 5,
    optionA: { name: 'Chain Pull', icon: '⛓️', description: 'Pull the enemy toward you instead', bonusEffect: 'PULL_ENEMIES', damageMult: 1.5 },
    optionB: { name: 'Slingshot', icon: '🎯', description: 'Launch yourself further and faster', damageMult: 0.5, bonusEffect: 'DASH_FORWARD' },
  },
  { skillId: 'GRAPPLING_HOOK', tier: 2, talentReq: 15,
    optionA: { name: 'Razor Wire', icon: '🗡️', description: 'The hook deals damage along its path', damageMult: 2.5, bonusEffect: 'PIERCING_WAVE' },
    optionB: { name: 'Double Hook', icon: '🪝', description: 'Two charges, rapid repositioning', cooldownMult: 0.4, damageMult: 1.0 },
  },
  // Camouflage
  { skillId: 'CAMOUFLAGE', tier: 1, talentReq: 7,
    optionA: { name: 'Predator', icon: '🐆', description: 'Next attack deals triple damage instead of double', damageMult: 3.0 },
    optionB: { name: 'Vanish', icon: '💨', description: 'Also drop all enemy aggro when activating', bonusEffect: 'SMOKE_CLOUD' },
  },
  { skillId: 'CAMOUFLAGE', tier: 2, talentReq: 17,
    optionA: { name: 'Shadow Walker', icon: '🌑', description: 'Movement speed boosted while invisible', bonusEffect: 'BUFF_ATTACK_SPEED', damageMult: 0 },
    optionB: { name: 'Ambush Master', icon: '⚔️', description: 'All skills deal bonus damage for 3s after breaking stealth', bonusEffect: 'OVERCHARGE_NEXT', damageMult: 0 },
  },
  // Net Trap
  { skillId: 'NET_TRAP', tier: 1, talentReq: 8,
    optionA: { name: 'Barbed Net', icon: '🩸', description: 'Enemies take bleed damage while rooted', statusOverride: 'BLEEDING', damageMult: 1.5 },
    optionB: { name: 'Wide Net', icon: '🕸️', description: 'Much larger area of effect', aoeRadiusMult: 2.0, damageMult: 0.7 },
  },
  { skillId: 'NET_TRAP', tier: 2, talentReq: 18,
    optionA: { name: 'Electrified Net', icon: '⚡', description: 'Net shocks enemies repeatedly', statusOverride: 'SHOCKED', damageMult: 1.8 },
    optionB: { name: 'Snare Field', icon: '🕸️', description: 'Net persists as a zone for 8 seconds', bonusEffect: 'BURNING_GROUND', cooldownMult: 1.3, damageMult: 1.0 },
  },
  // Fire Volley
  { skillId: 'FIRE_VOLLEY', tier: 1, talentReq: 6,
    optionA: { name: 'Inferno Burst', icon: '🔥', description: 'Fewer arrows but each creates an explosion', extraProjectiles: -2, aoeRadiusMult: 3.0, damageMult: 1.5 },
    optionB: { name: 'Blazing Rain', icon: '🌧️', description: 'Even more arrows in a wider spread', extraProjectiles: 4, damageMult: 0.8 },
  },
  { skillId: 'FIRE_VOLLEY', tier: 2, talentReq: 16,
    optionA: { name: 'Dragon Breath', icon: '🐉', description: 'A continuous cone of flame', bonusEffect: 'BURNING_GROUND', damageMult: 1.3 },
    optionB: { name: 'Phoenix Arrows', icon: '🦅', description: 'Arrows that heal you on hit', bonusEffect: 'HEAL_ON_BURN', damageMult: 1.1 },
  },
  // Wind Walk
  { skillId: 'WIND_WALK', tier: 1, talentReq: 9,
    optionA: { name: 'Zephyr', icon: '🌪️', description: 'Damages enemies you pass through', damageMult: 1.5, bonusEffect: 'DAMAGE_ON_ROLL' },
    optionB: { name: 'Gale Force', icon: '💨', description: 'Even faster movement and longer duration', bonusEffect: 'BUFF_ATTACK_SPEED', cooldownMult: 0.7 },
  },
  { skillId: 'WIND_WALK', tier: 2, talentReq: 19,
    optionA: { name: 'Storm Runner', icon: '⛈️', description: 'Leave lightning trails that shock enemies', statusOverride: 'SHOCKED', bonusEffect: 'BURNING_GROUND', damageMult: 1.0 },
    optionB: { name: 'Phantom Rush', icon: '👻', description: 'Become completely invulnerable while active', bonusEffect: 'CC_IMMUNE' },
  },
  // Shadow Strike
  { skillId: 'SHADOW_STRIKE', tier: 1, talentReq: 7,
    optionA: { name: 'Assassinate', icon: '🗡️', description: 'Execute enemies below 30% HP instantly', bonusEffect: 'EXECUTE_LOW_HP', damageMult: 2.0 },
    optionB: { name: 'Shadow Dance', icon: '💃', description: 'Strike multiple enemies in rapid succession', extraProjectiles: 2, damageMult: 0.8 },
  },
  { skillId: 'SHADOW_STRIKE', tier: 2, talentReq: 17,
    optionA: { name: 'Death Mark', icon: '💀', description: 'Marked enemies take 50% more damage from all sources', bonusEffect: 'LIGHTNING_MARK', damageMult: 1.5 },
    optionB: { name: 'Blade Flurry', icon: '⚔️', description: 'Unleash a flurry of shadow blades at arrival', aoeRadiusMult: 4.0, damageMult: 1.8, bonusEffect: 'BLADE_PROJECTILES' },
  },
];

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
];

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
};

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
//  8. CLASS SKILL MAP
// ---------------------------------------------------------------------------

export const CLASS_SKILL_MAP: Record<DiabloClass, SkillId[]> = {
  [DiabloClass.WARRIOR]: [
    SkillId.CLEAVE,
    SkillId.SHIELD_BASH,
    SkillId.WHIRLWIND,
    SkillId.BATTLE_CRY,
    SkillId.GROUND_SLAM,
    SkillId.BLADE_FURY,
  ],
  [DiabloClass.MAGE]: [
    SkillId.FIREBALL,
    SkillId.ICE_NOVA,
    SkillId.LIGHTNING_BOLT,
    SkillId.METEOR,
    SkillId.ARCANE_SHIELD,
    SkillId.CHAIN_LIGHTNING,
  ],
  [DiabloClass.RANGER]: [
    SkillId.MULTI_SHOT,
    SkillId.RAIN_OF_ARROWS,
    SkillId.POISON_ARROW,
    SkillId.EVASIVE_ROLL,
    SkillId.EXPLOSIVE_TRAP,
    SkillId.PIERCING_SHOT,
  ],
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
//  10. ENEMY SPAWN WEIGHTS
// ---------------------------------------------------------------------------

export const ENEMY_SPAWN_WEIGHTS: Record<DiabloMapId, { type: EnemyType; weight: number }[]> = {
  [DiabloMapId.FOREST]: [
    { type: EnemyType.WOLF, weight: 30 },
    { type: EnemyType.BANDIT, weight: 20 },
    { type: EnemyType.FOREST_SPIDER, weight: 15 },
    { type: EnemyType.BEAR, weight: 12 },
    { type: EnemyType.TREANT, weight: 5 },
    { type: EnemyType.MOSSY_LURKER, weight: 12 },
    { type: EnemyType.DIRE_STAG, weight: 10 },
    { type: EnemyType.WOODLAND_WISP, weight: 10 },
  ],
  [DiabloMapId.ELVEN_VILLAGE]: [
    { type: EnemyType.CORRUPTED_ELF, weight: 30 },
    { type: EnemyType.DARK_RANGER, weight: 25 },
    { type: EnemyType.SHADOW_BEAST, weight: 18 },
    { type: EnemyType.CORRUPTED_SENTINEL, weight: 12 },
    { type: EnemyType.GLOOM_ARCHER, weight: 10 },
    { type: EnemyType.FEY_ABOMINATION, weight: 10 },
  ],
  [DiabloMapId.NECROPOLIS_DUNGEON]: [
    { type: EnemyType.SKELETON_WARRIOR, weight: 25 },
    { type: EnemyType.ZOMBIE, weight: 20 },
    { type: EnemyType.WRAITH, weight: 15 },
    { type: EnemyType.NECROMANCER, weight: 12 },
    { type: EnemyType.BONE_GOLEM, weight: 10 },
    { type: EnemyType.CRYPT_SHADE, weight: 12 },
    { type: EnemyType.BONE_ARCHER, weight: 10 },
    { type: EnemyType.LICH_ACOLYTE, weight: 10 },
  ],
  [DiabloMapId.VOLCANIC_WASTES]: [
    { type: EnemyType.FIRE_IMP, weight: 25 },
    { type: EnemyType.LAVA_ELEMENTAL, weight: 16 },
    { type: EnemyType.INFERNAL_KNIGHT, weight: 16 },
    { type: EnemyType.MAGMA_SERPENT, weight: 15 },
    { type: EnemyType.MOLTEN_COLOSSUS, weight: 8 },
    { type: EnemyType.EMBER_FIEND, weight: 12 },
    { type: EnemyType.VOLCANIC_SCORPION, weight: 10 },
    { type: EnemyType.ASH_WRAITH, weight: 10 },
  ],
  [DiabloMapId.ABYSSAL_RIFT]: [
    { type: EnemyType.VOID_STALKER, weight: 20 },
    { type: EnemyType.SHADOW_WEAVER, weight: 16 },
    { type: EnemyType.ABYSSAL_HORROR, weight: 16 },
    { type: EnemyType.RIFT_WALKER, weight: 20 },
    { type: EnemyType.ENTROPY_LORD, weight: 8 },
    { type: EnemyType.VOID_TENDRIL, weight: 12 },
    { type: EnemyType.RIFT_SCREAMER, weight: 10 },
    { type: EnemyType.DIMENSIONAL_STALKER, weight: 10 },
  ],
  [DiabloMapId.DRAGONS_SANCTUM]: [
    { type: EnemyType.DRAGONKIN_WARRIOR, weight: 20 },
    { type: EnemyType.WYRM_PRIEST, weight: 15 },
    { type: EnemyType.DRAKE_GUARDIAN, weight: 15 },
    { type: EnemyType.DRAGON_WHELP, weight: 20 },
    { type: EnemyType.ELDER_DRAGON, weight: 10 },
    { type: EnemyType.SCALED_SORCERER, weight: 12 },
    { type: EnemyType.DRAGONSPAWN_BERSERKER, weight: 10 },
    { type: EnemyType.FLAME_HERALD, weight: 10 },
  ],
  [DiabloMapId.SUNSCORCH_DESERT]: [
    { type: EnemyType.SAND_SCORPION, weight: 25 },
    { type: EnemyType.DESERT_BANDIT, weight: 20 },
    { type: EnemyType.DUST_WRAITH, weight: 15 },
    { type: EnemyType.SAND_WURM, weight: 12 },
    { type: EnemyType.SAND_GOLEM, weight: 8 },
    { type: EnemyType.DUNE_REAVER, weight: 12 },
    { type: EnemyType.SANDSTORM_ELEMENTAL, weight: 10 },
    { type: EnemyType.OASIS_SERPENT, weight: 10 },
  ],
  [DiabloMapId.EMERALD_GRASSLANDS]: [
    { type: EnemyType.WILD_BOAR, weight: 25 },
    { type: EnemyType.PLAINS_RAIDER, weight: 20 },
    { type: EnemyType.GIANT_HAWK, weight: 15 },
    { type: EnemyType.BISON_BEAST, weight: 12 },
    { type: EnemyType.CENTAUR_WARCHIEF, weight: 8 },
    { type: EnemyType.STEPPE_STALKER, weight: 12 },
    { type: EnemyType.THUNDER_RAM, weight: 10 },
    { type: EnemyType.PRAIRIE_WITCH, weight: 10 },
  ],
  [DiabloMapId.WHISPERING_MARSH]: [
    { type: EnemyType.BOG_LURKER, weight: 25 },
    { type: EnemyType.TOXIC_TOAD, weight: 20 },
    { type: EnemyType.MARSH_HAG, weight: 16 },
    { type: EnemyType.SWAMP_VINE, weight: 12 },
    { type: EnemyType.HYDRA_MATRIARCH, weight: 8 },
    { type: EnemyType.FEN_CRAWLER, weight: 12 },
    { type: EnemyType.MIRE_SPECTER, weight: 10 },
    { type: EnemyType.LEECH_SWARM, weight: 10 },
  ],
  [DiabloMapId.CRYSTAL_CAVERNS]: [
    { type: EnemyType.CRYSTAL_SPIDER, weight: 22 },
    { type: EnemyType.CAVE_BAT_SWARM, weight: 20 },
    { type: EnemyType.QUARTZ_ELEMENTAL, weight: 18 },
    { type: EnemyType.GEM_GOLEM, weight: 12 },
    { type: EnemyType.PRISMATIC_WYRM, weight: 8 },
    { type: EnemyType.SHARD_SENTINEL, weight: 12 },
    { type: EnemyType.GEODE_BEETLE, weight: 10 },
    { type: EnemyType.CRYSTAL_SHADE, weight: 10 },
  ],
  [DiabloMapId.FROZEN_TUNDRA]: [
    { type: EnemyType.FROST_WOLF, weight: 22 },
    { type: EnemyType.ICE_WRAITH, weight: 18 },
    { type: EnemyType.FROZEN_REVENANT, weight: 16 },
    { type: EnemyType.YETI, weight: 14 },
    { type: EnemyType.GLACIAL_TITAN, weight: 10 },
    { type: EnemyType.PERMAFROST_SPIDER, weight: 12 },
    { type: EnemyType.BLIZZARD_PHANTOM, weight: 10 },
    { type: EnemyType.FROST_TROLL, weight: 10 },
  ],
  [DiabloMapId.HAUNTED_CATHEDRAL]: [
    { type: EnemyType.PHANTOM_KNIGHT, weight: 20 },
    { type: EnemyType.SHADOW_ACOLYTE, weight: 20 },
    { type: EnemyType.GARGOYLE, weight: 16 },
    { type: EnemyType.CURSED_PRIEST, weight: 14 },
    { type: EnemyType.CATHEDRAL_DEMON, weight: 10 },
    { type: EnemyType.BELL_WRAITH, weight: 12 },
    { type: EnemyType.DESECRATED_MONK, weight: 10 },
    { type: EnemyType.STAINED_GLASS_GOLEM, weight: 10 },
  ],
  [DiabloMapId.THORNWOOD_THICKET]: [
    { type: EnemyType.THORN_CRAWLER, weight: 22 },
    { type: EnemyType.BLIGHT_SPRITE, weight: 18 },
    { type: EnemyType.FUNGAL_BRUTE, weight: 18 },
    { type: EnemyType.ROTWOOD_LICH, weight: 12 },
    { type: EnemyType.THORNMOTHER, weight: 10 },
    { type: EnemyType.BRIAR_WOLF, weight: 12 },
    { type: EnemyType.SPORE_MOTH, weight: 10 },
    { type: EnemyType.NETTLE_ELEMENTAL, weight: 10 },
  ],
  [DiabloMapId.CLOCKWORK_FOUNDRY]: [
    { type: EnemyType.CLOCKWORK_SOLDIER, weight: 20 },
    { type: EnemyType.GEAR_SPIDER, weight: 20 },
    { type: EnemyType.STEAM_GOLEM, weight: 16 },
    { type: EnemyType.FORGE_MASTER, weight: 14 },
    { type: EnemyType.IRON_COLOSSUS, weight: 10 },
    { type: EnemyType.BRASS_BEETLE, weight: 12 },
    { type: EnemyType.PISTON_GOLEM, weight: 10 },
    { type: EnemyType.ARC_DRONE, weight: 10 },
  ],
  [DiabloMapId.CRIMSON_CITADEL]: [
    { type: EnemyType.BLOOD_KNIGHT, weight: 20 },
    { type: EnemyType.BLOOD_FIEND, weight: 18 },
    { type: EnemyType.CRIMSON_MAGE, weight: 16 },
    { type: EnemyType.GARGOYLE_SENTINEL, weight: 16 },
    { type: EnemyType.VAMPIRE_LORD, weight: 10 },
    { type: EnemyType.BLOODTHORN_BAT, weight: 12 },
    { type: EnemyType.SCARLET_ASSASSIN, weight: 10 },
    { type: EnemyType.CRIMSON_SHADE, weight: 10 },
  ],
  [DiabloMapId.STORMSPIRE_PEAK]: [
    { type: EnemyType.STORM_HARPY, weight: 20 },
    { type: EnemyType.THUNDER_ELEMENTAL, weight: 18 },
    { type: EnemyType.LIGHTNING_DRAKE, weight: 16 },
    { type: EnemyType.WIND_SHAMAN, weight: 16 },
    { type: EnemyType.TEMPEST_TITAN, weight: 10 },
    { type: EnemyType.GALE_FALCON, weight: 12 },
    { type: EnemyType.STATIC_GOLEM, weight: 10 },
    { type: EnemyType.STORM_CALLER, weight: 10 },
  ],
  [DiabloMapId.SHADOW_REALM]: [
    { type: EnemyType.NIGHTMARE_STALKER, weight: 20 },
    { type: EnemyType.DREAD_PHANTOM, weight: 18 },
    { type: EnemyType.SOUL_DEVOURER, weight: 18 },
    { type: EnemyType.SHADOW_COLOSSUS, weight: 14 },
    { type: EnemyType.NIGHTMARE_KING, weight: 10 },
    { type: EnemyType.FEAR_CRAWLER, weight: 12 },
    { type: EnemyType.UMBRAL_ASSASSIN, weight: 10 },
    { type: EnemyType.VOID_ECHO, weight: 10 },
  ],
  [DiabloMapId.PRIMORDIAL_ABYSS]: [
    { type: EnemyType.CHAOS_SPAWN, weight: 20 },
    { type: EnemyType.ABYSSAL_LEVIATHAN, weight: 18 },
    { type: EnemyType.VOID_REAPER, weight: 18 },
    { type: EnemyType.ELDER_VOID_FIEND, weight: 14 },
    { type: EnemyType.PRIMORDIAL_ONE, weight: 10 },
    { type: EnemyType.ENTROPY_WORM, weight: 12 },
    { type: EnemyType.GENESIS_SHADE, weight: 10 },
    { type: EnemyType.NULL_SENTINEL, weight: 10 },
  ],
  [DiabloMapId.MOONLIT_GROVE]: [
    { type: EnemyType.MOONLIT_SPRITE, weight: 25 },
    { type: EnemyType.LUNAR_MOTH, weight: 20 },
    { type: EnemyType.FAE_DANCER, weight: 18 },
    { type: EnemyType.SHADOW_STAG, weight: 12 },
    { type: EnemyType.MOONBEAST_ALPHA, weight: 6 },
    { type: EnemyType.THORN_FAIRY, weight: 12 },
    { type: EnemyType.NOCTURNAL_PREDATOR, weight: 10 },
    { type: EnemyType.LUNAR_WISP, weight: 10 },
  ],
  [DiabloMapId.CORAL_DEPTHS]: [
    { type: EnemyType.REEF_CRAWLER, weight: 22 },
    { type: EnemyType.ABYSSAL_ANGLER, weight: 20 },
    { type: EnemyType.SIREN_WITCH, weight: 18 },
    { type: EnemyType.BARNACLE_GOLEM, weight: 12 },
    { type: EnemyType.LEVIATHAN_HATCHLING, weight: 8 },
    { type: EnemyType.TIDE_LURKER, weight: 12 },
    { type: EnemyType.PEARL_GOLEM, weight: 10 },
    { type: EnemyType.DEEP_SEA_PHANTOM, weight: 10 },
  ],
  [DiabloMapId.ANCIENT_LIBRARY]: [
    { type: EnemyType.ANIMATED_TOME, weight: 22 },
    { type: EnemyType.INK_WRAITH, weight: 20 },
    { type: EnemyType.SCROLL_GOLEM, weight: 16 },
    { type: EnemyType.ARCANE_CURATOR, weight: 14 },
    { type: EnemyType.FORBIDDEN_GRIMOIRE, weight: 8 },
    { type: EnemyType.QUILL_FIEND, weight: 12 },
    { type: EnemyType.PAPER_GOLEM, weight: 10 },
    { type: EnemyType.RUNE_SPIRIT, weight: 10 },
  ],
  [DiabloMapId.JADE_TEMPLE]: [
    { type: EnemyType.VINE_SERPENT, weight: 20 },
    { type: EnemyType.TEMPLE_GUARDIAN, weight: 20 },
    { type: EnemyType.JUNGLE_SHAMAN, weight: 18 },
    { type: EnemyType.JADE_CONSTRUCT, weight: 12 },
    { type: EnemyType.ANCIENT_IDOL, weight: 10 },
    { type: EnemyType.JADE_VIPER, weight: 12 },
    { type: EnemyType.TEMPLE_MONK, weight: 10 },
    { type: EnemyType.STONE_IDOL_FRAGMENT, weight: 10 },
  ],
  [DiabloMapId.ASHEN_BATTLEFIELD]: [
    { type: EnemyType.FALLEN_SOLDIER, weight: 22 },
    { type: EnemyType.WAR_SPECTER, weight: 20 },
    { type: EnemyType.SIEGE_WRAITH, weight: 16 },
    { type: EnemyType.ASHEN_COMMANDER, weight: 12 },
    { type: EnemyType.DREAD_GENERAL, weight: 10 },
    { type: EnemyType.EMBER_KNIGHT, weight: 12 },
    { type: EnemyType.WAR_DRUMMER, weight: 10 },
    { type: EnemyType.CARRION_SWARM, weight: 10 },
  ],
  [DiabloMapId.FUNGAL_DEPTHS]: [
    { type: EnemyType.SPORE_CRAWLER, weight: 20 },
    { type: EnemyType.TOXIC_SHROOM, weight: 20 },
    { type: EnemyType.MYCELIUM_HORROR, weight: 16 },
    { type: EnemyType.FUNGAL_SHAMBLER, weight: 14 },
    { type: EnemyType.SPOREQUEEN, weight: 10 },
    { type: EnemyType.CORDYCEPS_HOST, weight: 12 },
    { type: EnemyType.LUMINOUS_JELLY, weight: 10 },
    { type: EnemyType.ROT_BORER, weight: 10 },
  ],
  [DiabloMapId.OBSIDIAN_FORTRESS]: [
    { type: EnemyType.DOOM_HOUND, weight: 20 },
    { type: EnemyType.OBSIDIAN_SENTINEL, weight: 18 },
    { type: EnemyType.HELLFIRE_ARCHER, weight: 16 },
    { type: EnemyType.DARK_INQUISITOR, weight: 16 },
    { type: EnemyType.OBSIDIAN_WARLORD, weight: 10 },
    { type: EnemyType.MAGMA_IMP, weight: 12 },
    { type: EnemyType.OBSIDIAN_HOUND, weight: 10 },
    { type: EnemyType.SHADOW_INQUISITOR, weight: 10 },
  ],
  [DiabloMapId.CELESTIAL_RUINS]: [
    { type: EnemyType.STAR_WISP, weight: 20 },
    { type: EnemyType.ASTRAL_GUARDIAN, weight: 18 },
    { type: EnemyType.COMET_DRAKE, weight: 16 },
    { type: EnemyType.VOID_MONK, weight: 16 },
    { type: EnemyType.CELESTIAL_ARCHON, weight: 10 },
    { type: EnemyType.NOVA_SPRITE, weight: 12 },
    { type: EnemyType.CONSTELLATION_GOLEM, weight: 10 },
    { type: EnemyType.GRAVITY_WELL, weight: 10 },
  ],
  [DiabloMapId.INFERNAL_THRONE]: [
    { type: EnemyType.PIT_FIEND, weight: 20 },
    { type: EnemyType.SOUL_COLLECTOR, weight: 18 },
    { type: EnemyType.HELLBORN_MAGE, weight: 16 },
    { type: EnemyType.INFERNAL_BRUTE, weight: 16 },
    { type: EnemyType.DEMON_OVERLORD, weight: 10 },
    { type: EnemyType.CHAIN_DEVIL, weight: 12 },
    { type: EnemyType.BRIMSTONE_CRAWLER, weight: 10 },
    { type: EnemyType.WRATH_SPECTER, weight: 10 },
  ],
  [DiabloMapId.ASTRAL_VOID]: [
    { type: EnemyType.REALITY_SHREDDER, weight: 20 },
    { type: EnemyType.TEMPORAL_WRAITH, weight: 18 },
    { type: EnemyType.DIMENSION_WEAVER, weight: 18 },
    { type: EnemyType.VOID_TITAN, weight: 14 },
    { type: EnemyType.ASTRAL_ANNIHILATOR, weight: 10 },
    { type: EnemyType.PARADOX_SHADE, weight: 12 },
    { type: EnemyType.ANTIMATTER_WISP, weight: 10 },
    { type: EnemyType.FRACTURE_BEAST, weight: 10 },
  ],
  [DiabloMapId.SHATTERED_COLOSSEUM]: [
    { type: EnemyType.SPECTRAL_GLADIATOR, weight: 25 },
    { type: EnemyType.ARENA_BEAST, weight: 20 },
    { type: EnemyType.GHOSTLY_RETIARIUS, weight: 18 },
    { type: EnemyType.CURSED_CHAMPION, weight: 12 },
    { type: EnemyType.COLOSSEUM_WARDEN, weight: 6 },
    { type: EnemyType.LION_SPIRIT, weight: 12 },
    { type: EnemyType.PIT_FIGHTER_GHOST, weight: 10 },
    { type: EnemyType.MIRMILLO_SPECTER, weight: 10 },
  ],
  [DiabloMapId.PETRIFIED_GARDEN]: [
    { type: EnemyType.STONE_NYMPH, weight: 22 },
    { type: EnemyType.BASILISK_HATCHLING, weight: 20 },
    { type: EnemyType.PETRIFIED_TREANT, weight: 16 },
    { type: EnemyType.GRANITE_GOLEM, weight: 14 },
    { type: EnemyType.GORGON_MATRIARCH, weight: 8 },
    { type: EnemyType.MOSS_BASILISK, weight: 12 },
    { type: EnemyType.CALCIFIED_NYMPH, weight: 10 },
    { type: EnemyType.STONE_SERPENT, weight: 10 },
  ],
  [DiabloMapId.SUNKEN_CITADEL]: [
    { type: EnemyType.DROWNED_KNIGHT, weight: 20 },
    { type: EnemyType.DEPTH_LURKER, weight: 20 },
    { type: EnemyType.TIDAL_PHANTOM, weight: 18 },
    { type: EnemyType.CORAL_ABOMINATION, weight: 14 },
    { type: EnemyType.ABYSSAL_WARDEN, weight: 8 },
    { type: EnemyType.BARNACLE_KNIGHT, weight: 12 },
    { type: EnemyType.PRESSURE_PHANTOM, weight: 10 },
    { type: EnemyType.KELP_HORROR, weight: 10 },
  ],
  [DiabloMapId.WYRMSCAR_CANYON]: [
    { type: EnemyType.DRAKE_BROODLING, weight: 22 },
    { type: EnemyType.CANYON_RAPTOR, weight: 20 },
    { type: EnemyType.SCORCH_WYVERN, weight: 16 },
    { type: EnemyType.WYRMFIRE_SHAMAN, weight: 12 },
    { type: EnemyType.CANYON_WYRMLORD, weight: 10 },
    { type: EnemyType.CLIFF_RAPTOR, weight: 12 },
    { type: EnemyType.NEST_GUARDIAN, weight: 10 },
    { type: EnemyType.MAGMA_DRAKE, weight: 10 },
  ],
  [DiabloMapId.PLAGUEROT_SEWERS]: [
    { type: EnemyType.SEWER_RAT_SWARM, weight: 25 },
    { type: EnemyType.PLAGUE_BEARER, weight: 20 },
    { type: EnemyType.BILE_ELEMENTAL, weight: 16 },
    { type: EnemyType.AFFLICTED_BRUTE, weight: 12 },
    { type: EnemyType.PESTILENCE_LORD, weight: 8 },
    { type: EnemyType.BLOAT_RAT, weight: 12 },
    { type: EnemyType.PESTILENT_SLIME, weight: 10 },
    { type: EnemyType.SEWER_HARPY, weight: 10 },
  ],
  [DiabloMapId.ETHEREAL_SANCTUM]: [
    { type: EnemyType.PHASE_WALKER, weight: 20 },
    { type: EnemyType.ETHEREAL_SENTINEL, weight: 18 },
    { type: EnemyType.SPIRIT_WEAVER, weight: 18 },
    { type: EnemyType.PLANAR_GUARDIAN, weight: 14 },
    { type: EnemyType.SANCTUM_OVERSEER, weight: 10 },
    { type: EnemyType.ETHER_WISP, weight: 12 },
    { type: EnemyType.SPECTRAL_MONK, weight: 10 },
    { type: EnemyType.PHASE_SPIDER, weight: 10 },
  ],
  [DiabloMapId.IRON_WASTES]: [
    { type: EnemyType.SCRAP_AUTOMATON, weight: 20 },
    { type: EnemyType.RUST_REVENANT, weight: 20 },
    { type: EnemyType.SIEGE_CRAWLER, weight: 16 },
    { type: EnemyType.WAR_ENGINE_CORE, weight: 14 },
    { type: EnemyType.IRON_JUGGERNAUT, weight: 10 },
    { type: EnemyType.JUNK_GOLEM, weight: 12 },
    { type: EnemyType.SCRAP_HAWK, weight: 10 },
    { type: EnemyType.RUST_MITE_SWARM, weight: 10 },
  ],
  [DiabloMapId.BLIGHTED_THRONE]: [
    { type: EnemyType.CORRUPTED_ROYAL_GUARD, weight: 20 },
    { type: EnemyType.BLIGHT_COURTIER, weight: 18 },
    { type: EnemyType.THRONE_REVENANT, weight: 18 },
    { type: EnemyType.DARK_HERALD, weight: 14 },
    { type: EnemyType.BLIGHTED_KING, weight: 10 },
    { type: EnemyType.PLAGUE_KNIGHT, weight: 12 },
    { type: EnemyType.BLIGHTED_NOBLE, weight: 10 },
    { type: EnemyType.ROT_JESTER, weight: 10 },
  ],
  [DiabloMapId.CHRONO_LABYRINTH]: [
    { type: EnemyType.TEMPORAL_ECHO, weight: 20 },
    { type: EnemyType.CLOCKWORK_MINOTAUR, weight: 18 },
    { type: EnemyType.PARADOX_MAGE, weight: 18 },
    { type: EnemyType.TIME_DEVOURER, weight: 14 },
    { type: EnemyType.CHRONO_TITAN, weight: 10 },
    { type: EnemyType.PHASE_BEETLE, weight: 12 },
    { type: EnemyType.TIMELOST_SOLDIER, weight: 10 },
    { type: EnemyType.ENTROPY_WEAVER, weight: 10 },
  ],
  [DiabloMapId.ELDRITCH_NEXUS]: [
    { type: EnemyType.ELDRITCH_TENDRIL, weight: 20 },
    { type: EnemyType.MIND_FLAYER, weight: 18 },
    { type: EnemyType.NEXUS_ABERRATION, weight: 18 },
    { type: EnemyType.DIMENSIONAL_HORROR, weight: 14 },
    { type: EnemyType.ELDRITCH_OVERMIND, weight: 10 },
    { type: EnemyType.TENTACLE_HORROR, weight: 12 },
    { type: EnemyType.GIBBERING_MOUTHER, weight: 10 },
    { type: EnemyType.PSYCHIC_LEECH, weight: 10 },
  ],
  [DiabloMapId.CAMELOT]: [],
};

// ---------------------------------------------------------------------------
//  DIFFICULTY MULTIPLIERS
// ---------------------------------------------------------------------------

export const DIFFICULTY_CONFIGS: Record<DiabloDifficulty, {
  label: string;
  subtitle: string;
  hpMult: number;
  damageMult: number;
  armorMult: number;
  speedMult: number;
  xpMult: number;
  goldMult: number;
  maxEnemiesMult: number;
  icon: string;
  color: string;
}> = {
  [DiabloDifficulty.DAGGER]: {
    label: 'Dagger',
    subtitle: 'Normal',
    hpMult: 1.0,
    damageMult: 1.0,
    armorMult: 1.0,
    speedMult: 1.0,
    xpMult: 1.0,
    goldMult: 1.0,
    maxEnemiesMult: 1.0,
    icon: '🗡️',
    color: '#aaaaaa',
  },
  [DiabloDifficulty.CLEAVER]: {
    label: 'Cleaver',
    subtitle: 'Medium',
    hpMult: 1.5,
    damageMult: 1.3,
    armorMult: 1.2,
    speedMult: 1.05,
    xpMult: 1.4,
    goldMult: 1.3,
    maxEnemiesMult: 1.1,
    icon: '🪓',
    color: '#44cc44',
  },
  [DiabloDifficulty.LONGSWORD]: {
    label: 'Longsword',
    subtitle: 'Hard',
    hpMult: 2.0,
    damageMult: 1.7,
    armorMult: 1.5,
    speedMult: 1.1,
    xpMult: 1.8,
    goldMult: 1.6,
    maxEnemiesMult: 1.2,
    icon: '⚔️',
    color: '#4488ff',
  },
  [DiabloDifficulty.BASTARD_SWORD]: {
    label: 'Bastard Sword',
    subtitle: 'Very Hard',
    hpMult: 3.0,
    damageMult: 2.2,
    armorMult: 2.0,
    speedMult: 1.15,
    xpMult: 2.5,
    goldMult: 2.0,
    maxEnemiesMult: 1.3,
    icon: '🔱',
    color: '#aa44ff',
  },
  [DiabloDifficulty.CLAYMORE]: {
    label: 'Claymore',
    subtitle: 'Ultra Hard',
    hpMult: 5.0,
    damageMult: 3.0,
    armorMult: 2.5,
    speedMult: 1.2,
    xpMult: 4.0,
    goldMult: 3.0,
    maxEnemiesMult: 1.5,
    icon: '☠️',
    color: '#ff8800',
  },
  [DiabloDifficulty.FLAMBERGE]: {
    label: 'Flamberge',
    subtitle: 'Impossible',
    hpMult: 10.0,
    damageMult: 5.0,
    armorMult: 4.0,
    speedMult: 1.3,
    xpMult: 8.0,
    goldMult: 5.0,
    maxEnemiesMult: 2.0,
    icon: '🔥',
    color: '#ff2222',
  },
};

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

// ---------------------------------------------------------------------------
//  BOSS PHASE CONFIGURATIONS
// ---------------------------------------------------------------------------

export const BOSS_PHASE_CONFIGS: Record<DiabloMapId, BossPhaseConfig[]> = {
  [DiabloMapId.FOREST]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.3, speedMultiplier: 1.2, abilities: [BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.6, speedMultiplier: 1.4, abilities: [BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.ELVEN_VILLAGE]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.CHARGE] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.3, speedMultiplier: 1.2, abilities: [BossAbility.CHARGE, BossAbility.SHIELD] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.5, speedMultiplier: 1.5, abilities: [BossAbility.CHARGE, BossAbility.SHIELD, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.NECROPOLIS_DUNGEON]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.4, speedMultiplier: 1.1, abilities: [BossAbility.SUMMON_ADDS, BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.8, speedMultiplier: 1.3, abilities: [BossAbility.SUMMON_ADDS, BossAbility.GROUND_SLAM, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.VOLCANIC_WASTES]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.METEOR_RAIN] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.4, speedMultiplier: 1.2, abilities: [BossAbility.METEOR_RAIN, BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.8, speedMultiplier: 1.4, abilities: [BossAbility.METEOR_RAIN, BossAbility.GROUND_SLAM, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.ABYSSAL_RIFT]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.CHARGE, BossAbility.SHIELD] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.5, speedMultiplier: 1.3, abilities: [BossAbility.CHARGE, BossAbility.SHIELD, BossAbility.METEOR_RAIN] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.0, speedMultiplier: 1.5, abilities: [BossAbility.CHARGE, BossAbility.METEOR_RAIN, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.DRAGONS_SANCTUM]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.GROUND_SLAM, BossAbility.CHARGE] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.5, speedMultiplier: 1.3, abilities: [BossAbility.GROUND_SLAM, BossAbility.CHARGE, BossAbility.METEOR_RAIN] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.0, speedMultiplier: 1.5, abilities: [BossAbility.GROUND_SLAM, BossAbility.METEOR_RAIN, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.SUNSCORCH_DESERT]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.2, speedMultiplier: 1.2, abilities: [BossAbility.GROUND_SLAM, BossAbility.CHARGE] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.5, speedMultiplier: 1.4, abilities: [BossAbility.GROUND_SLAM, BossAbility.CHARGE, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.EMERALD_GRASSLANDS]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.CHARGE] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.2, speedMultiplier: 1.2, abilities: [BossAbility.CHARGE, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.5, speedMultiplier: 1.4, abilities: [BossAbility.CHARGE, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.WHISPERING_MARSH]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.2, speedMultiplier: 1.2, abilities: [BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.5, speedMultiplier: 1.4, abilities: [BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.CRYSTAL_CAVERNS]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.CHARGE] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.2, speedMultiplier: 1.2, abilities: [BossAbility.CHARGE, BossAbility.SHIELD] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.5, speedMultiplier: 1.4, abilities: [BossAbility.CHARGE, BossAbility.SHIELD, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.FROZEN_TUNDRA]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.3, speedMultiplier: 1.2, abilities: [BossAbility.GROUND_SLAM, BossAbility.CHARGE] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.6, speedMultiplier: 1.4, abilities: [BossAbility.GROUND_SLAM, BossAbility.CHARGE, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.HAUNTED_CATHEDRAL]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.4, speedMultiplier: 1.2, abilities: [BossAbility.SUMMON_ADDS, BossAbility.METEOR_RAIN] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.8, speedMultiplier: 1.4, abilities: [BossAbility.SUMMON_ADDS, BossAbility.METEOR_RAIN, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.THORNWOOD_THICKET]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.3, speedMultiplier: 1.2, abilities: [BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.6, speedMultiplier: 1.4, abilities: [BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.CLOCKWORK_FOUNDRY]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.CHARGE, BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.5, speedMultiplier: 1.3, abilities: [BossAbility.CHARGE, BossAbility.GROUND_SLAM, BossAbility.SHIELD] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.0, speedMultiplier: 1.5, abilities: [BossAbility.CHARGE, BossAbility.GROUND_SLAM, BossAbility.SHIELD, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.CRIMSON_CITADEL]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.CHARGE, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.5, speedMultiplier: 1.3, abilities: [BossAbility.CHARGE, BossAbility.SUMMON_ADDS, BossAbility.METEOR_RAIN] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.0, speedMultiplier: 1.5, abilities: [BossAbility.CHARGE, BossAbility.METEOR_RAIN, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.STORMSPIRE_PEAK]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.5, speedMultiplier: 1.3, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.0, speedMultiplier: 1.5, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.GROUND_SLAM, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.SHADOW_REALM]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.CHARGE, BossAbility.SHIELD] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.6, speedMultiplier: 1.4, abilities: [BossAbility.CHARGE, BossAbility.SHIELD, BossAbility.METEOR_RAIN, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.2, speedMultiplier: 1.6, abilities: [BossAbility.CHARGE, BossAbility.METEOR_RAIN, BossAbility.SUMMON_ADDS, BossAbility.GROUND_SLAM, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.PRIMORDIAL_ABYSS]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.8, speedMultiplier: 1.5, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS, BossAbility.SHIELD] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.5, speedMultiplier: 1.8, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS, BossAbility.SHIELD, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.MOONLIT_GROVE]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.CHARGE] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.2, speedMultiplier: 1.2, abilities: [BossAbility.CHARGE, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.5, speedMultiplier: 1.4, abilities: [BossAbility.CHARGE, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.CORAL_DEPTHS]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.3, speedMultiplier: 1.2, abilities: [BossAbility.GROUND_SLAM, BossAbility.SHIELD] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.6, speedMultiplier: 1.4, abilities: [BossAbility.GROUND_SLAM, BossAbility.SHIELD, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.ANCIENT_LIBRARY]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.METEOR_RAIN] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.3, speedMultiplier: 1.2, abilities: [BossAbility.METEOR_RAIN, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.6, speedMultiplier: 1.4, abilities: [BossAbility.METEOR_RAIN, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.JADE_TEMPLE]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.GROUND_SLAM, BossAbility.CHARGE] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.3, speedMultiplier: 1.2, abilities: [BossAbility.GROUND_SLAM, BossAbility.CHARGE, BossAbility.SHIELD] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.6, speedMultiplier: 1.4, abilities: [BossAbility.GROUND_SLAM, BossAbility.CHARGE, BossAbility.SHIELD, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.ASHEN_BATTLEFIELD]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.CHARGE, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.4, speedMultiplier: 1.2, abilities: [BossAbility.CHARGE, BossAbility.SUMMON_ADDS, BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.8, speedMultiplier: 1.4, abilities: [BossAbility.CHARGE, BossAbility.SUMMON_ADDS, BossAbility.GROUND_SLAM, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.FUNGAL_DEPTHS]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.GROUND_SLAM, BossAbility.SHIELD] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.5, speedMultiplier: 1.3, abilities: [BossAbility.GROUND_SLAM, BossAbility.SHIELD, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.0, speedMultiplier: 1.5, abilities: [BossAbility.GROUND_SLAM, BossAbility.SHIELD, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.OBSIDIAN_FORTRESS]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.CHARGE, BossAbility.METEOR_RAIN] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.5, speedMultiplier: 1.3, abilities: [BossAbility.CHARGE, BossAbility.METEOR_RAIN, BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.0, speedMultiplier: 1.5, abilities: [BossAbility.CHARGE, BossAbility.METEOR_RAIN, BossAbility.GROUND_SLAM, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.CELESTIAL_RUINS]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.METEOR_RAIN, BossAbility.SHIELD] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.6, speedMultiplier: 1.4, abilities: [BossAbility.METEOR_RAIN, BossAbility.SHIELD, BossAbility.CHARGE, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.2, speedMultiplier: 1.6, abilities: [BossAbility.METEOR_RAIN, BossAbility.SHIELD, BossAbility.CHARGE, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.INFERNAL_THRONE]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.8, speedMultiplier: 1.5, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.4, speedMultiplier: 1.7, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS, BossAbility.SHIELD, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.ASTRAL_VOID]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.SHIELD] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 2.0, speedMultiplier: 1.6, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.SHIELD, BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.8, speedMultiplier: 2.0, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.SHIELD, BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.SHATTERED_COLOSSEUM]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.CHARGE] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.2, speedMultiplier: 1.2, abilities: [BossAbility.CHARGE, BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.5, speedMultiplier: 1.4, abilities: [BossAbility.CHARGE, BossAbility.GROUND_SLAM, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.PETRIFIED_GARDEN]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.SHIELD] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.3, speedMultiplier: 1.2, abilities: [BossAbility.SHIELD, BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.6, speedMultiplier: 1.4, abilities: [BossAbility.SHIELD, BossAbility.GROUND_SLAM, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.SUNKEN_CITADEL]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.3, speedMultiplier: 1.2, abilities: [BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS, BossAbility.SHIELD] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.6, speedMultiplier: 1.4, abilities: [BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS, BossAbility.SHIELD, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.WYRMSCAR_CANYON]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.4, speedMultiplier: 1.3, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.8, speedMultiplier: 1.5, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.PLAGUEROT_SEWERS]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.SUMMON_ADDS, BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.4, speedMultiplier: 1.2, abilities: [BossAbility.SUMMON_ADDS, BossAbility.GROUND_SLAM, BossAbility.CHARGE] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.8, speedMultiplier: 1.4, abilities: [BossAbility.SUMMON_ADDS, BossAbility.GROUND_SLAM, BossAbility.CHARGE, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.ETHEREAL_SANCTUM]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.SHIELD, BossAbility.CHARGE] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.5, speedMultiplier: 1.3, abilities: [BossAbility.SHIELD, BossAbility.CHARGE, BossAbility.METEOR_RAIN] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.0, speedMultiplier: 1.5, abilities: [BossAbility.SHIELD, BossAbility.CHARGE, BossAbility.METEOR_RAIN, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.IRON_WASTES]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.GROUND_SLAM, BossAbility.SHIELD] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.5, speedMultiplier: 1.3, abilities: [BossAbility.GROUND_SLAM, BossAbility.SHIELD, BossAbility.CHARGE, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.0, speedMultiplier: 1.5, abilities: [BossAbility.GROUND_SLAM, BossAbility.SHIELD, BossAbility.CHARGE, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.BLIGHTED_THRONE]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.METEOR_RAIN, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.6, speedMultiplier: 1.4, abilities: [BossAbility.METEOR_RAIN, BossAbility.SUMMON_ADDS, BossAbility.CHARGE, BossAbility.SHIELD] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.2, speedMultiplier: 1.7, abilities: [BossAbility.METEOR_RAIN, BossAbility.SUMMON_ADDS, BossAbility.CHARGE, BossAbility.SHIELD, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.CHRONO_LABYRINTH]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.CHARGE, BossAbility.METEOR_RAIN, BossAbility.SHIELD] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.8, speedMultiplier: 1.5, abilities: [BossAbility.CHARGE, BossAbility.METEOR_RAIN, BossAbility.SHIELD, BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 2.5, speedMultiplier: 1.8, abilities: [BossAbility.CHARGE, BossAbility.METEOR_RAIN, BossAbility.SHIELD, BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.ELDRITCH_NEXUS]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.SHIELD, BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 2.2, speedMultiplier: 1.8, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.SHIELD, BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 3.0, speedMultiplier: 2.2, abilities: [BossAbility.METEOR_RAIN, BossAbility.CHARGE, BossAbility.SHIELD, BossAbility.GROUND_SLAM, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.CAMELOT]: [],
};

// ---------------------------------------------------------------------------
//  TALENT TREES
// ---------------------------------------------------------------------------

export const TALENT_TREES: Record<DiabloClass, TalentNode[]> = {
  [DiabloClass.WARRIOR]: [
    // Branch 0 — Berserker
    { id: 'w_b0t0', name: 'Savage Blows', description: '+4% damage per rank', icon: '\u{1F4AA}', maxRank: 5, currentRank: 0, branch: 0, tier: 0, effects: [{ type: TalentEffectType.BONUS_DAMAGE_PERCENT, value: 4 }] },
    { id: 'w_b0t1', name: 'Keen Edge', description: '+2% crit chance per rank', icon: '\u{1F52A}', maxRank: 5, currentRank: 0, requires: 'w_b0t0', branch: 0, tier: 1, effects: [{ type: TalentEffectType.BONUS_CRIT_CHANCE, value: 2 }] },
    { id: 'w_b0t2', name: 'Brutal Strikes', description: '+6% crit damage per rank', icon: '\u26A1', maxRank: 5, currentRank: 0, requires: 'w_b0t1', branch: 0, tier: 2, effects: [{ type: TalentEffectType.BONUS_CRIT_DAMAGE, value: 6 }] },
    { id: 'w_b0t3', name: 'Frenzy', description: '+3% attack speed per rank', icon: '\u{1F300}', maxRank: 5, currentRank: 0, requires: 'w_b0t2', branch: 0, tier: 3, effects: [{ type: TalentEffectType.BONUS_ATTACK_SPEED, value: 3 }] },
    // Branch 1 — Guardian
    { id: 'w_b1t0', name: 'Toughness', description: '+4% HP per rank', icon: '\u2764\uFE0F', maxRank: 5, currentRank: 0, branch: 1, tier: 0, effects: [{ type: TalentEffectType.BONUS_HP_PERCENT, value: 4 }] },
    { id: 'w_b1t1', name: 'Iron Skin', description: '+8 armor per rank', icon: '\u{1F6E1}\uFE0F', maxRank: 5, currentRank: 0, requires: 'w_b1t0', branch: 1, tier: 1, effects: [{ type: TalentEffectType.BONUS_ARMOR, value: 8 }] },
    { id: 'w_b1t2', name: 'Blood Drinker', description: '+1% life steal per rank', icon: '\u{1FA78}', maxRank: 5, currentRank: 0, requires: 'w_b1t1', branch: 1, tier: 2, effects: [{ type: TalentEffectType.LIFE_STEAL_PERCENT, value: 1 }] },
    { id: 'w_b1t3', name: 'Fortitude', description: '+5 all resistances per rank', icon: '\u{1F3F0}', maxRank: 5, currentRank: 0, requires: 'w_b1t2', branch: 1, tier: 3, effects: [{ type: TalentEffectType.RESISTANCE_ALL, value: 5 }] },
    // Branch 2 — Warlord
    { id: 'w_b2t0', name: 'Swift March', description: '+0.3 move speed per rank', icon: '\u{1F4A8}', maxRank: 5, currentRank: 0, branch: 2, tier: 0, effects: [{ type: TalentEffectType.BONUS_MOVE_SPEED, value: 0.3 }] },
    { id: 'w_b2t1', name: 'Wide Sweep', description: '+0.5 AoE radius per rank', icon: '\u{1F30A}', maxRank: 5, currentRank: 0, requires: 'w_b2t0', branch: 2, tier: 1, effects: [{ type: TalentEffectType.BONUS_AOE_RADIUS, value: 0.5 }] },
    { id: 'w_b2t2', name: 'Battle Mastery', description: '+4% cooldown reduction per rank', icon: '\u23F1\uFE0F', maxRank: 5, currentRank: 0, requires: 'w_b2t1', branch: 2, tier: 2, effects: [{ type: TalentEffectType.SKILL_COOLDOWN_REDUCTION, value: 4 }] },
    { id: 'w_b2t3', name: 'Conqueror', description: '+3% damage and +3% HP per rank', icon: '\u{1F451}', maxRank: 5, currentRank: 0, requires: 'w_b2t2', branch: 2, tier: 3, effects: [{ type: TalentEffectType.BONUS_DAMAGE_PERCENT, value: 3 }, { type: TalentEffectType.BONUS_HP_PERCENT, value: 3 }] },
  ],
  [DiabloClass.MAGE]: [
    // Branch 0 — Pyromancer
    { id: 'm_b0t0', name: 'Ignition', description: '+5% damage per rank', icon: '\u{1F525}', maxRank: 5, currentRank: 0, branch: 0, tier: 0, effects: [{ type: TalentEffectType.BONUS_DAMAGE_PERCENT, value: 5 }] },
    { id: 'm_b0t1', name: 'Searing Heat', description: '+7% crit damage per rank', icon: '\u2600\uFE0F', maxRank: 5, currentRank: 0, requires: 'm_b0t0', branch: 0, tier: 1, effects: [{ type: TalentEffectType.BONUS_CRIT_DAMAGE, value: 7 }] },
    { id: 'm_b0t2', name: 'Conflagration', description: '+0.6 AoE radius per rank', icon: '\u{1F4A5}', maxRank: 5, currentRank: 0, requires: 'm_b0t1', branch: 0, tier: 2, effects: [{ type: TalentEffectType.BONUS_AOE_RADIUS, value: 0.6 }] },
    { id: 'm_b0t3', name: 'Inferno Mastery', description: '+4% damage and +2% crit per rank', icon: '\u{1F30B}', maxRank: 5, currentRank: 0, requires: 'm_b0t2', branch: 0, tier: 3, effects: [{ type: TalentEffectType.BONUS_DAMAGE_PERCENT, value: 4 }, { type: TalentEffectType.BONUS_CRIT_CHANCE, value: 2 }] },
    // Branch 1 — Frost Warden
    { id: 'm_b1t0', name: 'Frost Barrier', description: '+4% HP per rank', icon: '\u2744\uFE0F', maxRank: 5, currentRank: 0, branch: 1, tier: 0, effects: [{ type: TalentEffectType.BONUS_HP_PERCENT, value: 4 }] },
    { id: 'm_b1t1', name: 'Mana Well', description: '+5% mana per rank', icon: '\u{1F4A7}', maxRank: 5, currentRank: 0, requires: 'm_b1t0', branch: 1, tier: 1, effects: [{ type: TalentEffectType.BONUS_MANA_PERCENT, value: 5 }] },
    { id: 'm_b1t2', name: 'Arcane Ward', description: '+6 armor per rank', icon: '\u{1F6E1}\uFE0F', maxRank: 5, currentRank: 0, requires: 'm_b1t1', branch: 1, tier: 2, effects: [{ type: TalentEffectType.BONUS_ARMOR, value: 6 }] },
    { id: 'm_b1t3', name: 'Flow of Power', description: '+2 mana regen per rank', icon: '\u{1F300}', maxRank: 5, currentRank: 0, requires: 'm_b1t2', branch: 1, tier: 3, effects: [{ type: TalentEffectType.MANA_REGEN, value: 2 }] },
    // Branch 2 — Storm Caller
    { id: 'm_b2t0', name: 'Quick Cast', description: '+3% attack speed per rank', icon: '\u26A1', maxRank: 5, currentRank: 0, branch: 2, tier: 0, effects: [{ type: TalentEffectType.BONUS_ATTACK_SPEED, value: 3 }] },
    { id: 'm_b2t1', name: 'Tempest', description: '+4% cooldown reduction per rank', icon: '\u26C8\uFE0F', maxRank: 5, currentRank: 0, requires: 'm_b2t0', branch: 2, tier: 1, effects: [{ type: TalentEffectType.SKILL_COOLDOWN_REDUCTION, value: 4 }] },
    { id: 'm_b2t2', name: 'Charged Strikes', description: '+2% crit chance per rank', icon: '\u{1F52E}', maxRank: 5, currentRank: 0, requires: 'm_b2t1', branch: 2, tier: 2, effects: [{ type: TalentEffectType.BONUS_CRIT_CHANCE, value: 2 }] },
    { id: 'm_b2t3', name: 'Eye of the Storm', description: '+5 all resistances per rank', icon: '\u{1F329}\uFE0F', maxRank: 5, currentRank: 0, requires: 'm_b2t2', branch: 2, tier: 3, effects: [{ type: TalentEffectType.RESISTANCE_ALL, value: 5 }] },
  ],
  [DiabloClass.RANGER]: [
    // Branch 0 — Sharpshooter
    { id: 'r_b0t0', name: 'Steady Aim', description: '+4% damage per rank', icon: '\u{1F3AF}', maxRank: 5, currentRank: 0, branch: 0, tier: 0, effects: [{ type: TalentEffectType.BONUS_DAMAGE_PERCENT, value: 4 }] },
    { id: 'r_b0t1', name: 'Precision', description: '+2% crit chance per rank', icon: '\u{1F441}\uFE0F', maxRank: 5, currentRank: 0, requires: 'r_b0t0', branch: 0, tier: 1, effects: [{ type: TalentEffectType.BONUS_CRIT_CHANCE, value: 2 }] },
    { id: 'r_b0t2', name: 'Lethal Shot', description: '+7% crit damage per rank', icon: '\u{1F480}', maxRank: 5, currentRank: 0, requires: 'r_b0t1', branch: 0, tier: 2, effects: [{ type: TalentEffectType.BONUS_CRIT_DAMAGE, value: 7 }] },
    { id: 'r_b0t3', name: 'Deadeye', description: '+3% damage and +2% crit per rank', icon: '\u{1F3F9}', maxRank: 5, currentRank: 0, requires: 'r_b0t2', branch: 0, tier: 3, effects: [{ type: TalentEffectType.BONUS_DAMAGE_PERCENT, value: 3 }, { type: TalentEffectType.BONUS_CRIT_CHANCE, value: 2 }] },
    // Branch 1 — Survivalist
    { id: 'r_b1t0', name: 'Thick Hide', description: '+4% HP per rank', icon: '\u2764\uFE0F', maxRank: 5, currentRank: 0, branch: 1, tier: 0, effects: [{ type: TalentEffectType.BONUS_HP_PERCENT, value: 4 }] },
    { id: 'r_b1t1', name: 'Hardened', description: '+6 armor per rank', icon: '\u{1F6E1}\uFE0F', maxRank: 5, currentRank: 0, requires: 'r_b1t0', branch: 1, tier: 1, effects: [{ type: TalentEffectType.BONUS_ARMOR, value: 6 }] },
    { id: 'r_b1t2', name: 'Leech', description: '+1% life steal per rank', icon: '\u{1FA78}', maxRank: 5, currentRank: 0, requires: 'r_b1t1', branch: 1, tier: 2, effects: [{ type: TalentEffectType.LIFE_STEAL_PERCENT, value: 1 }] },
    { id: 'r_b1t3', name: 'Fleet Footed', description: '+0.4 move speed per rank', icon: '\u{1F4A8}', maxRank: 5, currentRank: 0, requires: 'r_b1t2', branch: 1, tier: 3, effects: [{ type: TalentEffectType.BONUS_MOVE_SPEED, value: 0.4 }] },
    // Branch 2 — Trapper
    { id: 'r_b2t0', name: 'Blast Radius', description: '+0.5 AoE radius per rank', icon: '\u{1F4A3}', maxRank: 5, currentRank: 0, branch: 2, tier: 0, effects: [{ type: TalentEffectType.BONUS_AOE_RADIUS, value: 0.5 }] },
    { id: 'r_b2t1', name: 'Rapid Reload', description: '+4% cooldown reduction per rank', icon: '\u23F1\uFE0F', maxRank: 5, currentRank: 0, requires: 'r_b2t0', branch: 2, tier: 1, effects: [{ type: TalentEffectType.SKILL_COOLDOWN_REDUCTION, value: 4 }] },
    { id: 'r_b2t2', name: 'Efficiency', description: '+4% mana per rank', icon: '\u{1F4A7}', maxRank: 5, currentRank: 0, requires: 'r_b2t1', branch: 2, tier: 2, effects: [{ type: TalentEffectType.BONUS_MANA_PERCENT, value: 4 }] },
    { id: 'r_b2t3', name: 'Master Trapper', description: '+5 all resistances per rank', icon: '\u{1F578}\uFE0F', maxRank: 5, currentRank: 0, requires: 'r_b2t2', branch: 2, tier: 3, effects: [{ type: TalentEffectType.RESISTANCE_ALL, value: 5 }] },
  ],
};

export const TALENT_BRANCH_NAMES: Record<DiabloClass, [string, string, string]> = {
  [DiabloClass.WARRIOR]: ['Berserker', 'Guardian', 'Warlord'],
  [DiabloClass.MAGE]: ['Pyromancer', 'Frost Warden', 'Storm Caller'],
  [DiabloClass.RANGER]: ['Sharpshooter', 'Survivalist', 'Trapper'],
};

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

// ---------------------------------------------------------------------------
//  ENEMY DAMAGE TYPES
// ---------------------------------------------------------------------------

export const ENEMY_DAMAGE_TYPES: Partial<Record<EnemyType, DamageType>> = {
  [EnemyType.FIRE_IMP]: DamageType.FIRE,
  [EnemyType.LAVA_ELEMENTAL]: DamageType.FIRE,
  [EnemyType.INFERNAL_KNIGHT]: DamageType.FIRE,
  [EnemyType.MAGMA_SERPENT]: DamageType.FIRE,
  [EnemyType.MOLTEN_COLOSSUS]: DamageType.FIRE,
  [EnemyType.VOID_STALKER]: DamageType.ARCANE,
  [EnemyType.SHADOW_WEAVER]: DamageType.ARCANE,
  [EnemyType.ABYSSAL_HORROR]: DamageType.ARCANE,
  [EnemyType.RIFT_WALKER]: DamageType.ARCANE,
  [EnemyType.ENTROPY_LORD]: DamageType.ARCANE,
  [EnemyType.WRAITH]: DamageType.ARCANE,
  [EnemyType.NECROMANCER]: DamageType.SHADOW,
  [EnemyType.FOREST_SPIDER]: DamageType.POISON,
  [EnemyType.SAND_SCORPION]: DamageType.POISON,
  [EnemyType.DUST_WRAITH]: DamageType.ARCANE,
  [EnemyType.DRAGONKIN_WARRIOR]: DamageType.FIRE,
  [EnemyType.WYRM_PRIEST]: DamageType.FIRE,
  [EnemyType.DRAKE_GUARDIAN]: DamageType.FIRE,
  [EnemyType.DRAGON_WHELP]: DamageType.FIRE,
  [EnemyType.ELDER_DRAGON]: DamageType.FIRE,
  [EnemyType.SHADOW_BEAST]: DamageType.SHADOW,
  [EnemyType.DARK_RANGER]: DamageType.SHADOW,
  [EnemyType.NIGHT_FOREST_WENDIGO]: DamageType.ICE,
  [EnemyType.NIGHT_ELVEN_BANSHEE_QUEEN]: DamageType.ARCANE,
  [EnemyType.NIGHT_NECRO_DEATH_KNIGHT]: DamageType.SHADOW,
  [EnemyType.NIGHT_VOLCANIC_INFERNO_TITAN]: DamageType.FIRE,
  [EnemyType.NIGHT_RIFT_VOID_EMPEROR]: DamageType.ARCANE,
  [EnemyType.NIGHT_DRAGON_SHADOW_WYRM]: DamageType.FIRE,
  [EnemyType.NIGHT_DESERT_SANDSTORM_DJINN]: DamageType.LIGHTNING,
  [EnemyType.NIGHT_GRASSLAND_STAMPEDE_KING]: DamageType.PHYSICAL,
  // Marsh enemies
  [EnemyType.MARSH_HAG]: DamageType.POISON,
  [EnemyType.TOXIC_TOAD]: DamageType.POISON,
  [EnemyType.HYDRA_MATRIARCH]: DamageType.POISON,
  // Crystal Caverns enemies
  [EnemyType.CRYSTAL_SPIDER]: DamageType.ARCANE,
  [EnemyType.QUARTZ_ELEMENTAL]: DamageType.ARCANE,
  [EnemyType.PRISMATIC_WYRM]: DamageType.ARCANE,
  // Frozen Tundra enemies
  [EnemyType.FROST_WOLF]: DamageType.ICE,
  [EnemyType.ICE_WRAITH]: DamageType.ICE,
  [EnemyType.YETI]: DamageType.ICE,
  [EnemyType.FROZEN_REVENANT]: DamageType.ICE,
  [EnemyType.GLACIAL_TITAN]: DamageType.ICE,
  // Haunted Cathedral enemies
  [EnemyType.PHANTOM_KNIGHT]: DamageType.SHADOW,
  [EnemyType.CURSED_PRIEST]: DamageType.SHADOW,
  [EnemyType.SHADOW_ACOLYTE]: DamageType.SHADOW,
  [EnemyType.CATHEDRAL_DEMON]: DamageType.FIRE,
  // Thornwood enemies
  [EnemyType.BLIGHT_SPRITE]: DamageType.POISON,
  [EnemyType.ROTWOOD_LICH]: DamageType.SHADOW,
  [EnemyType.THORNMOTHER]: DamageType.POISON,
  // Clockwork enemies
  [EnemyType.FORGE_MASTER]: DamageType.FIRE,
  [EnemyType.IRON_COLOSSUS]: DamageType.FIRE,
  // Crimson Citadel enemies
  [EnemyType.BLOOD_KNIGHT]: DamageType.SHADOW,
  [EnemyType.CRIMSON_MAGE]: DamageType.FIRE,
  [EnemyType.BLOOD_FIEND]: DamageType.SHADOW,
  [EnemyType.VAMPIRE_LORD]: DamageType.SHADOW,
  // Stormspire enemies
  [EnemyType.STORM_HARPY]: DamageType.LIGHTNING,
  [EnemyType.THUNDER_ELEMENTAL]: DamageType.LIGHTNING,
  [EnemyType.LIGHTNING_DRAKE]: DamageType.LIGHTNING,
  [EnemyType.WIND_SHAMAN]: DamageType.LIGHTNING,
  [EnemyType.TEMPEST_TITAN]: DamageType.LIGHTNING,
  // Shadow Realm enemies
  [EnemyType.NIGHTMARE_STALKER]: DamageType.SHADOW,
  [EnemyType.DREAD_PHANTOM]: DamageType.ARCANE,
  [EnemyType.SOUL_DEVOURER]: DamageType.SHADOW,
  [EnemyType.SHADOW_COLOSSUS]: DamageType.SHADOW,
  [EnemyType.NIGHTMARE_KING]: DamageType.SHADOW,
  // Primordial Abyss enemies
  [EnemyType.ABYSSAL_LEVIATHAN]: DamageType.ARCANE,
  [EnemyType.VOID_REAPER]: DamageType.ARCANE,
  [EnemyType.CHAOS_SPAWN]: DamageType.FIRE,
  [EnemyType.ELDER_VOID_FIEND]: DamageType.ARCANE,
  [EnemyType.PRIMORDIAL_ONE]: DamageType.ARCANE,
  // Night bosses for new maps
  [EnemyType.NIGHT_MARSH_SWAMP_MOTHER]: DamageType.POISON,
  [EnemyType.NIGHT_CAVERNS_CRYSTAL_KING]: DamageType.ARCANE,
  [EnemyType.NIGHT_TUNDRA_FROST_EMPRESS]: DamageType.ICE,
  [EnemyType.NIGHT_CATHEDRAL_ARCH_LICH]: DamageType.SHADOW,
  [EnemyType.NIGHT_THORNWOOD_BLIGHT_LORD]: DamageType.POISON,
  [EnemyType.NIGHT_FOUNDRY_IRON_TYRANT]: DamageType.FIRE,
  [EnemyType.NIGHT_CITADEL_BLOOD_EMPEROR]: DamageType.SHADOW,
  [EnemyType.NIGHT_STORMSPIRE_THUNDER_GOD]: DamageType.LIGHTNING,
  [EnemyType.NIGHT_SHADOW_DREAM_EATER]: DamageType.SHADOW,
  [EnemyType.NIGHT_ABYSS_WORLD_ENDER]: DamageType.ARCANE,
  // Moonlit Grove enemies
  [EnemyType.MOONLIT_SPRITE]: DamageType.ARCANE,
  [EnemyType.FAE_DANCER]: DamageType.ARCANE,
  [EnemyType.SHADOW_STAG]: DamageType.SHADOW,
  [EnemyType.LUNAR_MOTH]: DamageType.ARCANE,
  [EnemyType.MOONBEAST_ALPHA]: DamageType.SHADOW,
  // Coral Depths enemies
  [EnemyType.SIREN_WITCH]: DamageType.ARCANE,
  [EnemyType.LEVIATHAN_HATCHLING]: DamageType.ICE,
  // Ancient Library enemies
  [EnemyType.ANIMATED_TOME]: DamageType.ARCANE,
  [EnemyType.INK_WRAITH]: DamageType.SHADOW,
  [EnemyType.ARCANE_CURATOR]: DamageType.ARCANE,
  [EnemyType.FORBIDDEN_GRIMOIRE]: DamageType.ARCANE,
  // Jade Temple enemies
  [EnemyType.JUNGLE_SHAMAN]: DamageType.POISON,
  [EnemyType.VINE_SERPENT]: DamageType.POISON,
  [EnemyType.ANCIENT_IDOL]: DamageType.HOLY,
  // Ashen Battlefield enemies
  [EnemyType.WAR_SPECTER]: DamageType.SHADOW,
  [EnemyType.SIEGE_WRAITH]: DamageType.FIRE,
  [EnemyType.DREAD_GENERAL]: DamageType.SHADOW,
  // Fungal Depths enemies
  [EnemyType.SPORE_CRAWLER]: DamageType.POISON,
  [EnemyType.MYCELIUM_HORROR]: DamageType.POISON,
  [EnemyType.TOXIC_SHROOM]: DamageType.POISON,
  [EnemyType.SPOREQUEEN]: DamageType.POISON,
  // Obsidian Fortress enemies
  [EnemyType.OBSIDIAN_SENTINEL]: DamageType.FIRE,
  [EnemyType.HELLFIRE_ARCHER]: DamageType.FIRE,
  [EnemyType.DARK_INQUISITOR]: DamageType.SHADOW,
  [EnemyType.DOOM_HOUND]: DamageType.FIRE,
  [EnemyType.OBSIDIAN_WARLORD]: DamageType.FIRE,
  // Celestial Ruins enemies
  [EnemyType.STAR_WISP]: DamageType.HOLY,
  [EnemyType.ASTRAL_GUARDIAN]: DamageType.HOLY,
  [EnemyType.COMET_DRAKE]: DamageType.FIRE,
  [EnemyType.VOID_MONK]: DamageType.ARCANE,
  [EnemyType.CELESTIAL_ARCHON]: DamageType.HOLY,
  // Infernal Throne enemies
  [EnemyType.PIT_FIEND]: DamageType.FIRE,
  [EnemyType.HELLBORN_MAGE]: DamageType.FIRE,
  [EnemyType.INFERNAL_BRUTE]: DamageType.FIRE,
  [EnemyType.SOUL_COLLECTOR]: DamageType.SHADOW,
  [EnemyType.DEMON_OVERLORD]: DamageType.FIRE,
  // Astral Void enemies
  [EnemyType.REALITY_SHREDDER]: DamageType.ARCANE,
  [EnemyType.TEMPORAL_WRAITH]: DamageType.ARCANE,
  [EnemyType.DIMENSION_WEAVER]: DamageType.ARCANE,
  [EnemyType.VOID_TITAN]: DamageType.ARCANE,
  [EnemyType.ASTRAL_ANNIHILATOR]: DamageType.ARCANE,
  // Night bosses wave 2
  [EnemyType.NIGHT_GROVE_MOONFALL_DRYAD]: DamageType.ARCANE,
  [EnemyType.NIGHT_CORAL_TIDE_KRAKEN]: DamageType.ICE,
  [EnemyType.NIGHT_LIBRARY_LOREKEEPER]: DamageType.ARCANE,
  [EnemyType.NIGHT_TEMPLE_JADE_EMPEROR]: DamageType.HOLY,
  [EnemyType.NIGHT_BATTLEFIELD_DEATH_MARSHAL]: DamageType.SHADOW,
  [EnemyType.NIGHT_FUNGAL_MYCORRHIZA_QUEEN]: DamageType.POISON,
  [EnemyType.NIGHT_OBSIDIAN_DARK_SOVEREIGN]: DamageType.FIRE,
  [EnemyType.NIGHT_CELESTIAL_FALLEN_SERAPH]: DamageType.HOLY,
  [EnemyType.NIGHT_INFERNAL_ARCH_DEMON]: DamageType.FIRE,
  [EnemyType.NIGHT_ASTRAL_REALITY_BREAKER]: DamageType.ARCANE,
  // Shattered Colosseum enemies
  [EnemyType.SPECTRAL_GLADIATOR]: DamageType.SHADOW,
  [EnemyType.ARENA_BEAST]: DamageType.PHYSICAL,
  [EnemyType.GHOSTLY_RETIARIUS]: DamageType.SHADOW,
  [EnemyType.COLOSSEUM_WARDEN]: DamageType.SHADOW,
  // Petrified Garden enemies
  [EnemyType.STONE_NYMPH]: DamageType.ARCANE,
  [EnemyType.BASILISK_HATCHLING]: DamageType.POISON,
  [EnemyType.GORGON_MATRIARCH]: DamageType.ARCANE,
  // Sunken Citadel enemies
  [EnemyType.TIDAL_PHANTOM]: DamageType.ICE,
  [EnemyType.CORAL_ABOMINATION]: DamageType.ICE,
  [EnemyType.ABYSSAL_WARDEN]: DamageType.ICE,
  // Wyrmscar Canyon enemies
  [EnemyType.SCORCH_WYVERN]: DamageType.FIRE,
  [EnemyType.DRAKE_BROODLING]: DamageType.FIRE,
  [EnemyType.WYRMFIRE_SHAMAN]: DamageType.FIRE,
  [EnemyType.CANYON_WYRMLORD]: DamageType.FIRE,
  // Plaguerot Sewers enemies
  [EnemyType.PLAGUE_BEARER]: DamageType.POISON,
  [EnemyType.BILE_ELEMENTAL]: DamageType.POISON,
  [EnemyType.AFFLICTED_BRUTE]: DamageType.POISON,
  [EnemyType.PESTILENCE_LORD]: DamageType.POISON,
  // Ethereal Sanctum enemies
  [EnemyType.PHASE_WALKER]: DamageType.ARCANE,
  [EnemyType.ETHEREAL_SENTINEL]: DamageType.HOLY,
  [EnemyType.SPIRIT_WEAVER]: DamageType.ARCANE,
  [EnemyType.PLANAR_GUARDIAN]: DamageType.HOLY,
  [EnemyType.SANCTUM_OVERSEER]: DamageType.HOLY,
  // Iron Wastes enemies
  [EnemyType.SIEGE_CRAWLER]: DamageType.FIRE,
  [EnemyType.WAR_ENGINE_CORE]: DamageType.FIRE,
  [EnemyType.IRON_JUGGERNAUT]: DamageType.FIRE,
  // Blighted Throne enemies
  [EnemyType.CORRUPTED_ROYAL_GUARD]: DamageType.SHADOW,
  [EnemyType.BLIGHT_COURTIER]: DamageType.SHADOW,
  [EnemyType.THRONE_REVENANT]: DamageType.SHADOW,
  [EnemyType.DARK_HERALD]: DamageType.SHADOW,
  [EnemyType.BLIGHTED_KING]: DamageType.SHADOW,
  // Chrono Labyrinth enemies
  [EnemyType.TEMPORAL_ECHO]: DamageType.ARCANE,
  [EnemyType.CLOCKWORK_MINOTAUR]: DamageType.PHYSICAL,
  [EnemyType.PARADOX_MAGE]: DamageType.ARCANE,
  [EnemyType.TIME_DEVOURER]: DamageType.ARCANE,
  [EnemyType.CHRONO_TITAN]: DamageType.ARCANE,
  // Eldritch Nexus enemies
  [EnemyType.ELDRITCH_TENDRIL]: DamageType.SHADOW,
  [EnemyType.MIND_FLAYER]: DamageType.ARCANE,
  [EnemyType.NEXUS_ABERRATION]: DamageType.SHADOW,
  [EnemyType.DIMENSIONAL_HORROR]: DamageType.ARCANE,
  [EnemyType.ELDRITCH_OVERMIND]: DamageType.ARCANE,
  // Night bosses wave 3
  [EnemyType.NIGHT_COLOSSEUM_ETERNAL_CHAMPION]: DamageType.SHADOW,
  [EnemyType.NIGHT_GARDEN_MEDUSA_QUEEN]: DamageType.ARCANE,
  [EnemyType.NIGHT_CITADEL_DROWNED_ADMIRAL]: DamageType.ICE,
  [EnemyType.NIGHT_CANYON_ELDER_WYRM]: DamageType.FIRE,
  [EnemyType.NIGHT_SEWERS_PLAGUE_FATHER]: DamageType.POISON,
  [EnemyType.NIGHT_SANCTUM_PLANAR_TYRANT]: DamageType.HOLY,
  [EnemyType.NIGHT_WASTES_WAR_COLOSSUS]: DamageType.FIRE,
  [EnemyType.NIGHT_THRONE_UNDYING_EMPEROR]: DamageType.SHADOW,
  [EnemyType.NIGHT_LABYRINTH_TIME_WEAVER]: DamageType.ARCANE,
  [EnemyType.NIGHT_NEXUS_ELDER_BRAIN]: DamageType.ARCANE,
  // Forest extra
  [EnemyType.WOODLAND_WISP]: DamageType.ARCANE,
  // Elven Village extra
  [EnemyType.GLOOM_ARCHER]: DamageType.SHADOW,
  [EnemyType.FEY_ABOMINATION]: DamageType.SHADOW,
  // Necropolis extra
  [EnemyType.CRYPT_SHADE]: DamageType.SHADOW,
  [EnemyType.LICH_ACOLYTE]: DamageType.SHADOW,
  // Volcanic Wastes extra
  [EnemyType.EMBER_FIEND]: DamageType.FIRE,
  [EnemyType.VOLCANIC_SCORPION]: DamageType.FIRE,
  [EnemyType.ASH_WRAITH]: DamageType.FIRE,
  // Abyssal Rift extra
  [EnemyType.VOID_TENDRIL]: DamageType.ARCANE,
  [EnemyType.RIFT_SCREAMER]: DamageType.ARCANE,
  [EnemyType.DIMENSIONAL_STALKER]: DamageType.ARCANE,
  // Dragon's Sanctum extra
  [EnemyType.SCALED_SORCERER]: DamageType.FIRE,
  [EnemyType.DRAGONSPAWN_BERSERKER]: DamageType.FIRE,
  [EnemyType.FLAME_HERALD]: DamageType.FIRE,
  // Desert extra
  [EnemyType.SANDSTORM_ELEMENTAL]: DamageType.LIGHTNING,
  // Grassland extra
  [EnemyType.PRAIRIE_WITCH]: DamageType.ARCANE,
  // Marsh extra
  [EnemyType.MIRE_SPECTER]: DamageType.POISON,
  [EnemyType.LEECH_SWARM]: DamageType.POISON,
  // Crystal Caverns extra
  [EnemyType.SHARD_SENTINEL]: DamageType.ARCANE,
  [EnemyType.CRYSTAL_SHADE]: DamageType.ARCANE,
  // Frozen Tundra extra
  [EnemyType.PERMAFROST_SPIDER]: DamageType.ICE,
  [EnemyType.BLIZZARD_PHANTOM]: DamageType.ICE,
  [EnemyType.FROST_TROLL]: DamageType.ICE,
  // Haunted Cathedral extra
  [EnemyType.BELL_WRAITH]: DamageType.SHADOW,
  [EnemyType.DESECRATED_MONK]: DamageType.SHADOW,
  [EnemyType.STAINED_GLASS_GOLEM]: DamageType.HOLY,
  // Thornwood extra
  [EnemyType.SPORE_MOTH]: DamageType.POISON,
  [EnemyType.NETTLE_ELEMENTAL]: DamageType.POISON,
  // Clockwork extra
  [EnemyType.ARC_DRONE]: DamageType.LIGHTNING,
  // Crimson Citadel extra
  [EnemyType.BLOODTHORN_BAT]: DamageType.SHADOW,
  [EnemyType.SCARLET_ASSASSIN]: DamageType.SHADOW,
  [EnemyType.CRIMSON_SHADE]: DamageType.SHADOW,
  // Stormspire extra
  [EnemyType.GALE_FALCON]: DamageType.LIGHTNING,
  [EnemyType.STATIC_GOLEM]: DamageType.LIGHTNING,
  [EnemyType.STORM_CALLER]: DamageType.LIGHTNING,
  // Shadow Realm extra
  [EnemyType.FEAR_CRAWLER]: DamageType.SHADOW,
  [EnemyType.UMBRAL_ASSASSIN]: DamageType.SHADOW,
  [EnemyType.VOID_ECHO]: DamageType.SHADOW,
  // Primordial Abyss extra
  [EnemyType.ENTROPY_WORM]: DamageType.ARCANE,
  [EnemyType.GENESIS_SHADE]: DamageType.ARCANE,
  [EnemyType.NULL_SENTINEL]: DamageType.ARCANE,
  // Moonlit Grove extra
  [EnemyType.THORN_FAIRY]: DamageType.ARCANE,
  [EnemyType.LUNAR_WISP]: DamageType.ARCANE,
  // Coral Depths extra
  [EnemyType.DEEP_SEA_PHANTOM]: DamageType.ICE,
  // Ancient Library extra
  [EnemyType.QUILL_FIEND]: DamageType.ARCANE,
  [EnemyType.RUNE_SPIRIT]: DamageType.ARCANE,
  // Jade Temple extra
  [EnemyType.JADE_VIPER]: DamageType.POISON,
  // Ashen Battlefield extra
  [EnemyType.EMBER_KNIGHT]: DamageType.FIRE,
  // Fungal Depths extra
  [EnemyType.CORDYCEPS_HOST]: DamageType.POISON,
  [EnemyType.LUMINOUS_JELLY]: DamageType.POISON,
  [EnemyType.ROT_BORER]: DamageType.POISON,
  // Obsidian Fortress extra
  [EnemyType.MAGMA_IMP]: DamageType.FIRE,
  [EnemyType.SHADOW_INQUISITOR]: DamageType.SHADOW,
  // Celestial Ruins extra
  [EnemyType.NOVA_SPRITE]: DamageType.HOLY,
  [EnemyType.CONSTELLATION_GOLEM]: DamageType.ARCANE,
  [EnemyType.GRAVITY_WELL]: DamageType.ARCANE,
  // Infernal Throne extra
  [EnemyType.CHAIN_DEVIL]: DamageType.FIRE,
  [EnemyType.BRIMSTONE_CRAWLER]: DamageType.FIRE,
  [EnemyType.WRATH_SPECTER]: DamageType.FIRE,
  // Astral Void extra
  [EnemyType.PARADOX_SHADE]: DamageType.ARCANE,
  [EnemyType.ANTIMATTER_WISP]: DamageType.ARCANE,
  [EnemyType.FRACTURE_BEAST]: DamageType.ARCANE,
  // Shattered Colosseum extra
  [EnemyType.LION_SPIRIT]: DamageType.HOLY,
  // Petrified Garden extra
  [EnemyType.CALCIFIED_NYMPH]: DamageType.ARCANE,
  // Sunken Citadel extra
  [EnemyType.PRESSURE_PHANTOM]: DamageType.ICE,
  // Wyrmscar Canyon extra
  [EnemyType.MAGMA_DRAKE]: DamageType.FIRE,
  // Plaguerot Sewers extra
  [EnemyType.PESTILENT_SLIME]: DamageType.POISON,
  [EnemyType.SEWER_HARPY]: DamageType.POISON,
  // Ethereal Sanctum extra
  [EnemyType.ETHER_WISP]: DamageType.ARCANE,
  [EnemyType.SPECTRAL_MONK]: DamageType.HOLY,
  [EnemyType.PHASE_SPIDER]: DamageType.ARCANE,
  // Iron Wastes extra
  [EnemyType.SCRAP_HAWK]: DamageType.LIGHTNING,
  // Blighted Throne extra
  [EnemyType.PLAGUE_KNIGHT]: DamageType.POISON,
  [EnemyType.BLIGHTED_NOBLE]: DamageType.SHADOW,
  [EnemyType.ROT_JESTER]: DamageType.POISON,
  // Chrono Labyrinth extra
  [EnemyType.PHASE_BEETLE]: DamageType.ARCANE,
  [EnemyType.ENTROPY_WEAVER]: DamageType.ARCANE,
  // Eldritch Nexus extra
  [EnemyType.TENTACLE_HORROR]: DamageType.SHADOW,
  [EnemyType.GIBBERING_MOUTHER]: DamageType.SHADOW,
  [EnemyType.PSYCHIC_LEECH]: DamageType.ARCANE,
};

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
//  MAP COMPLETION REWARDS
// ---------------------------------------------------------------------------

export const MAP_COMPLETION_REWARDS: Partial<Record<DiabloMapId, MapCompletionReward>> = {
  [DiabloMapId.FOREST]: { gold: 200, xp: 500, guaranteedDropRarity: ItemRarity.UNCOMMON, bonusMessage: 'The forest is safe once more.' },
  [DiabloMapId.ELVEN_VILLAGE]: { gold: 300, xp: 800, guaranteedDropRarity: ItemRarity.RARE, bonusMessage: 'Aelindor begins to heal.' },
  [DiabloMapId.NECROPOLIS_DUNGEON]: { gold: 500, xp: 1200, guaranteedDropRarity: ItemRarity.RARE, bonusMessage: 'The dead rest at last.' },
  [DiabloMapId.VOLCANIC_WASTES]: { gold: 800, xp: 2000, guaranteedDropRarity: ItemRarity.EPIC, bonusMessage: 'The flames die down.' },
  [DiabloMapId.ABYSSAL_RIFT]: { gold: 1200, xp: 3000, guaranteedDropRarity: ItemRarity.EPIC, bonusMessage: 'The rift seals shut.' },
  [DiabloMapId.DRAGONS_SANCTUM]: { gold: 2000, xp: 5000, guaranteedDropRarity: ItemRarity.LEGENDARY, bonusMessage: 'The dragons fall silent.' },
  [DiabloMapId.SUNSCORCH_DESERT]: { gold: 150, xp: 400, guaranteedDropRarity: ItemRarity.UNCOMMON, bonusMessage: 'The sands grow still.' },
  [DiabloMapId.EMERALD_GRASSLANDS]: { gold: 150, xp: 350, guaranteedDropRarity: ItemRarity.UNCOMMON, bonusMessage: 'Peace returns to the plains.' },
  [DiabloMapId.WHISPERING_MARSH]: { gold: 175, xp: 420, guaranteedDropRarity: ItemRarity.UNCOMMON, bonusMessage: 'The swamp falls silent at last.' },
  [DiabloMapId.CRYSTAL_CAVERNS]: { gold: 200, xp: 500, guaranteedDropRarity: ItemRarity.UNCOMMON, bonusMessage: 'The caverns glow with peaceful light.' },
  [DiabloMapId.FROZEN_TUNDRA]: { gold: 400, xp: 1000, guaranteedDropRarity: ItemRarity.RARE, bonusMessage: 'The blizzard subsides at last.' },
  [DiabloMapId.HAUNTED_CATHEDRAL]: { gold: 500, xp: 1200, guaranteedDropRarity: ItemRarity.RARE, bonusMessage: 'The cathedral finds peace once more.' },
  [DiabloMapId.THORNWOOD_THICKET]: { gold: 450, xp: 1100, guaranteedDropRarity: ItemRarity.RARE, bonusMessage: 'The blight recedes from the wood.' },
  [DiabloMapId.CLOCKWORK_FOUNDRY]: { gold: 1000, xp: 2500, guaranteedDropRarity: ItemRarity.EPIC, bonusMessage: 'The machinery grinds to a halt.' },
  [DiabloMapId.CRIMSON_CITADEL]: { gold: 1200, xp: 3000, guaranteedDropRarity: ItemRarity.EPIC, bonusMessage: 'The crimson walls crumble to dust.' },
  [DiabloMapId.STORMSPIRE_PEAK]: { gold: 1500, xp: 3500, guaranteedDropRarity: ItemRarity.EPIC, bonusMessage: 'The storms clear and sunlight breaks through.' },
  [DiabloMapId.SHADOW_REALM]: { gold: 2500, xp: 6000, guaranteedDropRarity: ItemRarity.LEGENDARY, bonusMessage: 'The nightmares dissolve into nothing.' },
  [DiabloMapId.PRIMORDIAL_ABYSS]: { gold: 4000, xp: 10000, guaranteedDropRarity: ItemRarity.LEGENDARY, bonusMessage: 'The abyss is sealed. Reality holds firm.' },
  [DiabloMapId.MOONLIT_GROVE]: { gold: 125, xp: 300, guaranteedDropRarity: ItemRarity.UNCOMMON, bonusMessage: 'The moonlight returns to its gentle glow.' },
  [DiabloMapId.CORAL_DEPTHS]: { gold: 175, xp: 450, guaranteedDropRarity: ItemRarity.UNCOMMON, bonusMessage: 'The coral reefs pulse with renewed life.' },
  [DiabloMapId.ANCIENT_LIBRARY]: { gold: 250, xp: 600, guaranteedDropRarity: ItemRarity.UNCOMMON, bonusMessage: 'The forbidden tomes seal themselves once more.' },
  [DiabloMapId.JADE_TEMPLE]: { gold: 350, xp: 900, guaranteedDropRarity: ItemRarity.RARE, bonusMessage: 'The jade idols fall silent and crumble to dust.' },
  [DiabloMapId.ASHEN_BATTLEFIELD]: { gold: 450, xp: 1100, guaranteedDropRarity: ItemRarity.RARE, bonusMessage: 'The fallen soldiers finally find their rest.' },
  [DiabloMapId.FUNGAL_DEPTHS]: { gold: 900, xp: 2200, guaranteedDropRarity: ItemRarity.EPIC, bonusMessage: 'The toxic spores dissipate into nothing.' },
  [DiabloMapId.OBSIDIAN_FORTRESS]: { gold: 1100, xp: 2800, guaranteedDropRarity: ItemRarity.EPIC, bonusMessage: 'The obsidian walls fracture and collapse.' },
  [DiabloMapId.CELESTIAL_RUINS]: { gold: 2000, xp: 5000, guaranteedDropRarity: ItemRarity.LEGENDARY, bonusMessage: 'The stars realign and the ruins ascend to peace.' },
  [DiabloMapId.INFERNAL_THRONE]: { gold: 3000, xp: 7500, guaranteedDropRarity: ItemRarity.LEGENDARY, bonusMessage: 'The throne shatters and hellfire extinguishes.' },
  [DiabloMapId.ASTRAL_VOID]: { gold: 5000, xp: 12000, guaranteedDropRarity: ItemRarity.LEGENDARY, bonusMessage: 'Reality mends itself. The void between worlds seals shut.' },
  [DiabloMapId.SHATTERED_COLOSSEUM]: { gold: 130, xp: 320, guaranteedDropRarity: ItemRarity.UNCOMMON, bonusMessage: 'The phantom crowds fall silent at last.' },
  [DiabloMapId.PETRIFIED_GARDEN]: { gold: 200, xp: 500, guaranteedDropRarity: ItemRarity.UNCOMMON, bonusMessage: 'Color returns to the stone. Life stirs again.' },
  [DiabloMapId.SUNKEN_CITADEL]: { gold: 275, xp: 650, guaranteedDropRarity: ItemRarity.RARE, bonusMessage: 'The waters recede and the citadel sees daylight once more.' },
  [DiabloMapId.WYRMSCAR_CANYON]: { gold: 400, xp: 1000, guaranteedDropRarity: ItemRarity.RARE, bonusMessage: 'The dragonfire fades and the canyon begins to heal.' },
  [DiabloMapId.PLAGUEROT_SEWERS]: { gold: 500, xp: 1200, guaranteedDropRarity: ItemRarity.RARE, bonusMessage: 'The plague dissipates. Clean water flows once more.' },
  [DiabloMapId.ETHEREAL_SANCTUM]: { gold: 1000, xp: 2500, guaranteedDropRarity: ItemRarity.EPIC, bonusMessage: 'The sanctum anchors itself to a single plane.' },
  [DiabloMapId.IRON_WASTES]: { gold: 1200, xp: 3000, guaranteedDropRarity: ItemRarity.EPIC, bonusMessage: 'The war machines power down. Silence reclaims the wastes.' },
  [DiabloMapId.BLIGHTED_THRONE]: { gold: 2200, xp: 5500, guaranteedDropRarity: ItemRarity.LEGENDARY, bonusMessage: 'The crown shatters and the blight withers to nothing.' },
  [DiabloMapId.CHRONO_LABYRINTH]: { gold: 3500, xp: 8000, guaranteedDropRarity: ItemRarity.LEGENDARY, bonusMessage: 'Time straightens. The labyrinth unravels into open space.' },
  [DiabloMapId.ELDRITCH_NEXUS]: { gold: 6000, xp: 15000, guaranteedDropRarity: ItemRarity.LEGENDARY, bonusMessage: 'The nexus collapses. Every dark dimension severs its link.' },
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
