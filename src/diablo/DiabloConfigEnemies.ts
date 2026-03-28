import {
  EnemyType,
  DamageType,
  DiabloMapId,
  DiabloDifficulty,
  BossAbility,
  BossPhaseConfig,
  EnemyBehavior,
} from './DiabloTypes';

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
  // -- City Ruins enemies --
  [EnemyType.RUINS_WATCHMAN]: {
    name: 'Ruins Watchman', hp: 90, damage: 14, armor: 8, speed: 3.0,
    attackRange: 2, aggroRange: 10, xpReward: 28, isBoss: false, scale: 1.0, level: 2,
  },
  [EnemyType.FALLEN_SENTINEL]: {
    name: 'Fallen Sentinel', hp: 150, damage: 18, armor: 14, speed: 2.2,
    attackRange: 2, aggroRange: 9, xpReward: 40, isBoss: false, scale: 1.2, level: 3,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.RUBBLE_LURKER]: {
    name: 'Rubble Lurker', hp: 70, damage: 16, armor: 4, speed: 4.0,
    attackRange: 1.5, aggroRange: 8, xpReward: 22, isBoss: false, scale: 0.8, level: 2,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.ALLEY_STALKER]: {
    name: 'Alley Stalker', hp: 60, damage: 20, armor: 3, speed: 5.0,
    attackRange: 1.5, aggroRange: 11, xpReward: 30, isBoss: false, scale: 0.9, level: 3,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.RUINED_CAPTAIN]: {
    name: 'Ruined Captain', hp: 300, damage: 28, armor: 18, speed: 2.8,
    attackRange: 2.5, aggroRange: 14, xpReward: 100, isBoss: true, scale: 1.4, level: 5,
  },
  [EnemyType.COLLAPSED_GOLEM]: {
    name: 'Collapsed Golem', hp: 180, damage: 22, armor: 20, speed: 1.8,
    attackRange: 2, aggroRange: 8, xpReward: 45, isBoss: false, scale: 1.5, level: 4,
  },
  [EnemyType.GUTTER_RAT_SWARM]: {
    name: 'Gutter Rat Swarm', hp: 50, damage: 10, armor: 1, speed: 4.5,
    attackRange: 1.5, aggroRange: 7, xpReward: 18, isBoss: false, scale: 0.6, level: 1,
  },
  [EnemyType.TOWER_SHADE]: {
    name: 'Tower Shade', hp: 75, damage: 15, armor: 2, speed: 3.5,
    attackRange: 8, aggroRange: 14, xpReward: 32, isBoss: false, scale: 1.0, level: 3,
    behavior: EnemyBehavior.RANGED,
  },
  // -- City enemies --
  [EnemyType.CORRUPT_GUARD]: {
    name: 'Corrupt Guard', hp: 100, damage: 15, armor: 10, speed: 3.2,
    attackRange: 2, aggroRange: 11, xpReward: 30, isBoss: false, scale: 1.0, level: 2,
  },
  [EnemyType.GATE_ENFORCER]: {
    name: 'Gate Enforcer', hp: 180, damage: 20, armor: 18, speed: 2.0,
    attackRange: 2, aggroRange: 9, xpReward: 45, isBoss: false, scale: 1.3, level: 4,
    behavior: EnemyBehavior.SHIELDED,
  },
  [EnemyType.ROOFTOP_ARCHER]: {
    name: 'Rooftop Archer', hp: 65, damage: 18, armor: 4, speed: 3.0,
    attackRange: 12, aggroRange: 16, xpReward: 32, isBoss: false, scale: 0.9, level: 3,
    behavior: EnemyBehavior.RANGED,
  },
  [EnemyType.ALLEY_THUG]: {
    name: 'Alley Thug', hp: 80, damage: 22, armor: 5, speed: 4.2,
    attackRange: 1.5, aggroRange: 10, xpReward: 28, isBoss: false, scale: 1.0, level: 2,
    behavior: EnemyBehavior.FLANKER,
  },
  [EnemyType.CITY_WARDEN]: {
    name: 'City Warden', hp: 350, damage: 30, armor: 20, speed: 2.5,
    attackRange: 2.5, aggroRange: 14, xpReward: 110, isBoss: true, scale: 1.5, level: 5,
  },
  [EnemyType.MARKET_BRUTE]: {
    name: 'Market Brute', hp: 160, damage: 25, armor: 12, speed: 2.6,
    attackRange: 2, aggroRange: 8, xpReward: 38, isBoss: false, scale: 1.3, level: 3,
  },
  [EnemyType.SEWER_CREEPER]: {
    name: 'Sewer Creeper', hp: 70, damage: 14, armor: 3, speed: 4.0,
    attackRange: 1.5, aggroRange: 9, xpReward: 24, isBoss: false, scale: 0.7, level: 2,
  },
  [EnemyType.BELL_TOWER_SENTINEL]: {
    name: 'Bell Tower Sentinel', hp: 110, damage: 16, armor: 8, speed: 2.8,
    attackRange: 10, aggroRange: 15, xpReward: 35, isBoss: false, scale: 1.1, level: 3,
    behavior: EnemyBehavior.RANGED,
  },
  // -- Night bosses (city maps) --
  [EnemyType.NIGHT_RUINS_REVENANT_KING]: {
    name: 'The Revenant King', hp: 2000, damage: 65, armor: 35, speed: 3.5,
    attackRange: 3, aggroRange: 25, xpReward: 500, isBoss: true, scale: 2.2, level: 10,
  },
  [EnemyType.NIGHT_CITY_SHADOW_MAGISTRATE]: {
    name: 'Shadow Magistrate', hp: 2200, damage: 70, armor: 30, speed: 3.8,
    attackRange: 3, aggroRange: 25, xpReward: 550, isBoss: true, scale: 2.0, level: 10,
  },
  // Day bosses (weaker than night bosses)
  [EnemyType.DAY_FOREST_STAG_GUARDIAN]: { name: 'Stag Guardian', hp: 2400, damage: 55, armor: 35, speed: 5.0, attackRange: 3, aggroRange: 25, xpReward: 1000, isBoss: true, scale: 2.2, level: 12 },
  [EnemyType.DAY_ELVEN_CORRUPTED_SENTINEL]: { name: 'Corrupted Sentinel', hp: 2600, damage: 60, armor: 40, speed: 4.5, attackRange: 3, aggroRange: 25, xpReward: 1100, isBoss: true, scale: 2.2, level: 13 },
  [EnemyType.DAY_NECRO_BONE_GOLEM]: { name: 'Bone Golem', hp: 3000, damage: 65, armor: 50, speed: 3.5, attackRange: 3.5, aggroRange: 25, xpReward: 1200, isBoss: true, scale: 2.5, level: 14 },
  [EnemyType.DAY_VOLCANIC_EMBER_BRUTE]: { name: 'Ember Brute', hp: 3200, damage: 70, armor: 45, speed: 4.0, attackRange: 3, aggroRange: 25, xpReward: 1300, isBoss: true, scale: 2.4, level: 15 },
  [EnemyType.DAY_RIFT_VOID_STALKER]: { name: 'Void Stalker', hp: 3500, damage: 75, armor: 40, speed: 5.5, attackRange: 3, aggroRange: 28, xpReward: 1400, isBoss: true, scale: 2.3, level: 16 },
  [EnemyType.DAY_DRAGON_DRAKE_MATRIARCH]: { name: 'Drake Matriarch', hp: 4000, damage: 80, armor: 55, speed: 4.5, attackRange: 3.5, aggroRange: 28, xpReward: 1500, isBoss: true, scale: 2.6, level: 17 },
  [EnemyType.DAY_DESERT_SAND_GOLEM]: { name: 'Sand Golem', hp: 2200, damage: 50, armor: 45, speed: 3.5, attackRange: 3, aggroRange: 22, xpReward: 900, isBoss: true, scale: 2.4, level: 10 },
  [EnemyType.DAY_GRASSLAND_BULL_CHIEFTAIN]: { name: 'Bull Chieftain', hp: 2400, damage: 55, armor: 30, speed: 5.5, attackRange: 3, aggroRange: 22, xpReward: 950, isBoss: true, scale: 2.2, level: 11 },
  [EnemyType.DAY_MARSH_BOG_TROLL]: { name: 'Bog Troll', hp: 2800, damage: 60, armor: 40, speed: 3.8, attackRange: 3.5, aggroRange: 22, xpReward: 1050, isBoss: true, scale: 2.5, level: 12 },
  [EnemyType.DAY_CAVERNS_CRYSTAL_SPIDER]: { name: 'Crystal Spider', hp: 2600, damage: 58, armor: 35, speed: 5.0, attackRange: 3, aggroRange: 24, xpReward: 1000, isBoss: true, scale: 2.3, level: 12 },
  [EnemyType.DAY_TUNDRA_FROST_BEAR]: { name: 'Frost Bear', hp: 3000, damage: 65, armor: 50, speed: 4.0, attackRange: 3.5, aggroRange: 22, xpReward: 1100, isBoss: true, scale: 2.5, level: 13 },
  [EnemyType.DAY_CATHEDRAL_FALLEN_TEMPLAR]: { name: 'Fallen Templar', hp: 2800, damage: 62, armor: 55, speed: 4.2, attackRange: 3, aggroRange: 24, xpReward: 1050, isBoss: true, scale: 2.2, level: 13 },
  [EnemyType.DAY_THORNWOOD_VINE_COLOSSUS]: { name: 'Vine Colossus', hp: 3200, damage: 58, armor: 60, speed: 3.0, attackRange: 4, aggroRange: 22, xpReward: 1150, isBoss: true, scale: 2.6, level: 14 },
  [EnemyType.DAY_FOUNDRY_BRONZE_SENTINEL]: { name: 'Bronze Sentinel', hp: 3400, damage: 65, armor: 65, speed: 3.5, attackRange: 3, aggroRange: 24, xpReward: 1200, isBoss: true, scale: 2.4, level: 14 },
  [EnemyType.DAY_CITADEL_BLOODHOUND_ALPHA]: { name: 'Bloodhound Alpha', hp: 2600, damage: 70, armor: 35, speed: 6.0, attackRange: 2.5, aggroRange: 28, xpReward: 1100, isBoss: true, scale: 2.0, level: 13 },
  [EnemyType.DAY_STORMSPIRE_WIND_ELEMENTAL]: { name: 'Wind Elemental', hp: 2800, damage: 60, armor: 30, speed: 5.5, attackRange: 3.5, aggroRange: 26, xpReward: 1100, isBoss: true, scale: 2.3, level: 13 },
  [EnemyType.DAY_SHADOW_SHADE_STALKER]: { name: 'Shade Stalker', hp: 3000, damage: 68, armor: 35, speed: 5.0, attackRange: 3, aggroRange: 26, xpReward: 1200, isBoss: true, scale: 2.2, level: 14 },
  [EnemyType.DAY_ABYSS_LESSER_HORROR]: { name: 'Lesser Horror', hp: 3500, damage: 72, armor: 40, speed: 4.5, attackRange: 3.5, aggroRange: 28, xpReward: 1400, isBoss: true, scale: 2.5, level: 16 },
  [EnemyType.DAY_RUINS_FALLEN_CAPTAIN]: { name: 'Fallen Captain', hp: 1800, damage: 45, armor: 25, speed: 4.5, attackRange: 3, aggroRange: 22, xpReward: 400, isBoss: true, scale: 1.8, level: 8 },
  [EnemyType.DAY_CITY_CORRUPT_WARDEN]: { name: 'Corrupt Warden', hp: 2000, damage: 50, armor: 30, speed: 4.0, attackRange: 3, aggroRange: 22, xpReward: 450, isBoss: true, scale: 1.9, level: 9 },
};

// ---------------------------------------------------------------------------

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
  [DiabloMapId.CITY_RUINS]: [
    { type: EnemyType.RUINS_WATCHMAN, weight: 25 },
    { type: EnemyType.RUBBLE_LURKER, weight: 20 },
    { type: EnemyType.ALLEY_STALKER, weight: 18 },
    { type: EnemyType.FALLEN_SENTINEL, weight: 12 },
    { type: EnemyType.RUINED_CAPTAIN, weight: 5 },
    { type: EnemyType.COLLAPSED_GOLEM, weight: 10 },
    { type: EnemyType.GUTTER_RAT_SWARM, weight: 15 },
    { type: EnemyType.TOWER_SHADE, weight: 10 },
  ],
  [DiabloMapId.CITY]: [
    { type: EnemyType.CORRUPT_GUARD, weight: 25 },
    { type: EnemyType.ALLEY_THUG, weight: 20 },
    { type: EnemyType.ROOFTOP_ARCHER, weight: 15 },
    { type: EnemyType.GATE_ENFORCER, weight: 12 },
    { type: EnemyType.CITY_WARDEN, weight: 5 },
    { type: EnemyType.MARKET_BRUTE, weight: 12 },
    { type: EnemyType.SEWER_CREEPER, weight: 14 },
    { type: EnemyType.BELL_TOWER_SENTINEL, weight: 10 },
  ],
  [DiabloMapId.RIVERSIDE_VILLAGE]: [],
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
  [DiabloMapId.CITY_RUINS]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.CHARGE] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.2, speedMultiplier: 1.2, abilities: [BossAbility.CHARGE, BossAbility.SUMMON_ADDS] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.5, speedMultiplier: 1.4, abilities: [BossAbility.CHARGE, BossAbility.SUMMON_ADDS, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.CITY]: [
    { hpThreshold: 1.0, name: 'Phase 1', damageMultiplier: 1.0, speedMultiplier: 1.0, abilities: [BossAbility.GROUND_SLAM] },
    { hpThreshold: 0.66, name: 'Phase 2', damageMultiplier: 1.2, speedMultiplier: 1.2, abilities: [BossAbility.GROUND_SLAM, BossAbility.CHARGE] },
    { hpThreshold: 0.33, name: 'Phase 3', damageMultiplier: 1.5, speedMultiplier: 1.4, abilities: [BossAbility.GROUND_SLAM, BossAbility.CHARGE, BossAbility.ENRAGE] },
  ],
  [DiabloMapId.RIVERSIDE_VILLAGE]: [],
  [DiabloMapId.CAMELOT]: [],
};

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
  // City Ruins enemies
  [EnemyType.TOWER_SHADE]: DamageType.SHADOW,
  [EnemyType.NIGHT_RUINS_REVENANT_KING]: DamageType.SHADOW,
  // City enemies
  [EnemyType.SEWER_CREEPER]: DamageType.POISON,
  [EnemyType.NIGHT_CITY_SHADOW_MAGISTRATE]: DamageType.SHADOW,
  // Day bosses
  [EnemyType.DAY_FOREST_STAG_GUARDIAN]: DamageType.PHYSICAL,
  [EnemyType.DAY_ELVEN_CORRUPTED_SENTINEL]: DamageType.ARCANE,
  [EnemyType.DAY_NECRO_BONE_GOLEM]: DamageType.SHADOW,
  [EnemyType.DAY_VOLCANIC_EMBER_BRUTE]: DamageType.FIRE,
  [EnemyType.DAY_RIFT_VOID_STALKER]: DamageType.ARCANE,
  [EnemyType.DAY_DRAGON_DRAKE_MATRIARCH]: DamageType.FIRE,
  [EnemyType.DAY_DESERT_SAND_GOLEM]: DamageType.PHYSICAL,
  [EnemyType.DAY_GRASSLAND_BULL_CHIEFTAIN]: DamageType.PHYSICAL,
  [EnemyType.DAY_MARSH_BOG_TROLL]: DamageType.POISON,
  [EnemyType.DAY_CAVERNS_CRYSTAL_SPIDER]: DamageType.ICE,
  [EnemyType.DAY_TUNDRA_FROST_BEAR]: DamageType.ICE,
  [EnemyType.DAY_CATHEDRAL_FALLEN_TEMPLAR]: DamageType.PHYSICAL,
  [EnemyType.DAY_THORNWOOD_VINE_COLOSSUS]: DamageType.POISON,
  [EnemyType.DAY_FOUNDRY_BRONZE_SENTINEL]: DamageType.FIRE,
  [EnemyType.DAY_CITADEL_BLOODHOUND_ALPHA]: DamageType.PHYSICAL,
  [EnemyType.DAY_STORMSPIRE_WIND_ELEMENTAL]: DamageType.LIGHTNING,
  [EnemyType.DAY_SHADOW_SHADE_STALKER]: DamageType.SHADOW,
  [EnemyType.DAY_ABYSS_LESSER_HORROR]: DamageType.ARCANE,
  [EnemyType.DAY_RUINS_FALLEN_CAPTAIN]: DamageType.PHYSICAL,
  [EnemyType.DAY_CITY_CORRUPT_WARDEN]: DamageType.PHYSICAL,
};
