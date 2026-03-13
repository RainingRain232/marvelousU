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
    level: 1, value: 12, stats: { bonusDamage: 10 },
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
    level: 2, value: 12, stats: { bonusDamage: 10 },
    description: 'A compact blade favored by scouts.',
  },
  {
    id: nextId(), name: 'Iron Mace', icon: '⚔️',
    rarity: ItemRarity.COMMON, type: ItemType.MACE, slot: ItemSlot.WEAPON,
    level: 3, value: 14, stats: { bonusDamage: 12 },
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
    level: 3, value: 14, stats: { bonusDamage: 11, dexterity: 1 },
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
    level: 5, value: 50, stats: { bonusDamage: 18, strength: 3 },
    description: 'A longsword with a reinforced crossguard.',
  },
  {
    id: nextId(), name: 'Hardened Battleaxe', icon: '🪓',
    rarity: ItemRarity.UNCOMMON, type: ItemType.AXE, slot: ItemSlot.WEAPON,
    level: 5, value: 55, stats: { bonusDamage: 22, strength: 2 },
    description: 'An axe tempered in dragonfire coals.',
  },
  {
    id: nextId(), name: 'Composite Bow', icon: '🏹',
    rarity: ItemRarity.UNCOMMON, type: ItemType.BOW, slot: ItemSlot.WEAPON,
    level: 5, value: 48, stats: { bonusDamage: 16, dexterity: 4 },
    description: 'A bow of layered wood and horn, powerful and precise.',
  },
  {
    id: nextId(), name: 'Willow Staff', icon: '🔮',
    rarity: ItemRarity.UNCOMMON, type: ItemType.STAFF, slot: ItemSlot.WEAPON,
    level: 5, value: 45, stats: { bonusDamage: 12, intelligence: 6 },
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
    level: 5, value: 38, stats: { intelligence: 5, manaRegen: 1 },
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
    { type: EnemyType.WOLF, weight: 35 },
    { type: EnemyType.BANDIT, weight: 25 },
    { type: EnemyType.FOREST_SPIDER, weight: 20 },
    { type: EnemyType.BEAR, weight: 15 },
    { type: EnemyType.TREANT, weight: 5 },
  ],
  [DiabloMapId.ELVEN_VILLAGE]: [
    { type: EnemyType.CORRUPTED_ELF, weight: 40 },
    { type: EnemyType.DARK_RANGER, weight: 35 },
    { type: EnemyType.SHADOW_BEAST, weight: 25 },
  ],
  [DiabloMapId.NECROPOLIS_DUNGEON]: [
    { type: EnemyType.SKELETON_WARRIOR, weight: 30 },
    { type: EnemyType.ZOMBIE, weight: 25 },
    { type: EnemyType.WRAITH, weight: 18 },
    { type: EnemyType.NECROMANCER, weight: 15 },
    { type: EnemyType.BONE_GOLEM, weight: 12 },
  ],
  [DiabloMapId.VOLCANIC_WASTES]: [
    { type: EnemyType.FIRE_IMP, weight: 30 },
    { type: EnemyType.LAVA_ELEMENTAL, weight: 20 },
    { type: EnemyType.INFERNAL_KNIGHT, weight: 20 },
    { type: EnemyType.MAGMA_SERPENT, weight: 20 },
    { type: EnemyType.MOLTEN_COLOSSUS, weight: 10 },
  ],
  [DiabloMapId.ABYSSAL_RIFT]: [
    { type: EnemyType.VOID_STALKER, weight: 25 },
    { type: EnemyType.SHADOW_WEAVER, weight: 20 },
    { type: EnemyType.ABYSSAL_HORROR, weight: 20 },
    { type: EnemyType.RIFT_WALKER, weight: 25 },
    { type: EnemyType.ENTROPY_LORD, weight: 10 },
  ],
  [DiabloMapId.DRAGONS_SANCTUM]: [
    { type: EnemyType.DRAGONKIN_WARRIOR, weight: 25 },
    { type: EnemyType.WYRM_PRIEST, weight: 18 },
    { type: EnemyType.DRAKE_GUARDIAN, weight: 18 },
    { type: EnemyType.DRAGON_WHELP, weight: 25 },
    { type: EnemyType.ELDER_DRAGON, weight: 14 },
  ],
  [DiabloMapId.SUNSCORCH_DESERT]: [
    { type: EnemyType.SAND_SCORPION, weight: 30 },
    { type: EnemyType.DESERT_BANDIT, weight: 25 },
    { type: EnemyType.DUST_WRAITH, weight: 20 },
    { type: EnemyType.SAND_WURM, weight: 15 },
    { type: EnemyType.SAND_GOLEM, weight: 10 },
  ],
  [DiabloMapId.EMERALD_GRASSLANDS]: [
    { type: EnemyType.WILD_BOAR, weight: 30 },
    { type: EnemyType.PLAINS_RAIDER, weight: 25 },
    { type: EnemyType.GIANT_HAWK, weight: 20 },
    { type: EnemyType.BISON_BEAST, weight: 15 },
    { type: EnemyType.CENTAUR_WARCHIEF, weight: 10 },
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
    type: QuestType.CLEAR_MAP, target: {}, required: 8,
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
