// ---------------------------------------------------------------------------
// Quest for the Grail — Configuration & Definitions
// All balance data, knight definitions, enemy definitions, item/relic
// definitions, floor generation parameters, and genre modifiers.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Genre / Quest Type — the player picks one at the start
// ---------------------------------------------------------------------------

export enum QuestGenre {
  CLASSIC = "classic",          // Standard Arthurian quest for the Holy Grail
  DARK = "dark",                // Dark fantasy — Morgan le Fay's corruption spreads
  CRUSADE = "crusade",          // Holy war — reclaim relics from pagan warlords
  FAE_WILD = "fae_wild",        // Venture into the Otherworld / Faerie realm
  SIEGE = "siege",              // Castle-by-castle conquest toward Camlann
  LEGENDS = "legends",          // Face trials inspired by each knight's legend
}

export interface QuestGenreDef {
  id: QuestGenre;
  label: string;
  desc: string;
  color: number;
  floorCount: number;
  enemyBias: string[];          // enemy types more likely to appear
  bossPool: string[];           // which bosses can appear
  relicBonus: number;           // extra relic drop chance multiplier
}

export const QUEST_GENRE_DEFS: QuestGenreDef[] = [
  {
    id: QuestGenre.CLASSIC,
    label: "Quest for the Grail",
    desc: "Seek the Holy Grail through enchanted forests and cursed castles.",
    color: 0xffd700,
    floorCount: 8,
    enemyBias: ["bandit", "undead", "beast"],
    bossPool: ["mordred", "green_knight", "questing_beast"],
    relicBonus: 1.0,
  },
  {
    id: QuestGenre.DARK,
    label: "The Dark Enchantment",
    desc: "Morgan le Fay's curse corrupts the land. Purge the darkness.",
    color: 0x8b00ff,
    floorCount: 10,
    enemyBias: ["undead", "fae", "demon"],
    bossPool: ["morgan_le_fay", "mordred", "black_knight"],
    relicBonus: 1.2,
  },
  {
    id: QuestGenre.CRUSADE,
    label: "The Holy Crusade",
    desc: "Lead a righteous war to reclaim sacred relics from pagan lords.",
    color: 0xcc0000,
    floorCount: 7,
    enemyBias: ["bandit", "knight", "siege"],
    bossPool: ["king_rience", "mordred", "saxon_warlord"],
    relicBonus: 0.8,
  },
  {
    id: QuestGenre.FAE_WILD,
    label: "The Otherworld",
    desc: "Cross the veil into the Faerie realm of illusion and wonder.",
    color: 0x00ff88,
    floorCount: 9,
    enemyBias: ["fae", "beast", "elemental"],
    bossPool: ["oberon", "morgan_le_fay", "green_knight"],
    relicBonus: 1.5,
  },
  {
    id: QuestGenre.SIEGE,
    label: "The Siege of Camlann",
    desc: "Storm castles and fortresses on the road to the final battle.",
    color: 0x888888,
    floorCount: 6,
    enemyBias: ["knight", "siege", "bandit"],
    bossPool: ["mordred", "king_rience", "saxon_warlord"],
    relicBonus: 0.7,
  },
  {
    id: QuestGenre.LEGENDS,
    label: "Trials of Legend",
    desc: "Each floor is a trial from a different knight's legend.",
    color: 0x44aaff,
    floorCount: 12,
    enemyBias: ["beast", "fae", "undead", "knight"],
    bossPool: ["green_knight", "questing_beast", "mordred", "morgan_le_fay", "black_knight"],
    relicBonus: 1.3,
  },
];

// ---------------------------------------------------------------------------
// Knight Definitions
// ---------------------------------------------------------------------------

export interface KnightDef {
  id: string;
  name: string;
  title: string;
  color: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;        // tiles per turn
  critChance: number;   // 0..1
  ability: KnightAbility;
  lore: string;
}

export interface KnightAbility {
  name: string;
  desc: string;
  cooldown: number;     // turns
  damage: number;
  range: number;        // tiles
  aoe: number;          // 0 = single target
  healAmount: number;
  effect?: string;      // status effect id
}

export const KNIGHT_DEFS: KnightDef[] = [
  {
    id: "arthur",
    name: "Arthur",
    title: "The Once and Future King",
    color: 0xffd700,
    hp: 120, maxHp: 120,
    attack: 18, defense: 14, speed: 3, critChance: 0.1,
    ability: {
      name: "Sovereign Strike",
      desc: "A mighty blow imbued with Excalibur's light, hitting all adjacent foes.",
      cooldown: 4, damage: 35, range: 1, aoe: 1, healAmount: 0, effect: "stun",
    },
    lore: "High King of Britain, wielder of Excalibur. Balanced in all things.",
  },
  {
    id: "lancelot",
    name: "Lancelot",
    title: "The Knight of the Lake",
    color: 0x4488ff,
    hp: 100, maxHp: 100,
    attack: 24, defense: 10, speed: 4, critChance: 0.2,
    ability: {
      name: "Lake's Fury",
      desc: "A devastating flurry of strikes on a single target.",
      cooldown: 3, damage: 50, range: 1, aoe: 0, healAmount: 0,
    },
    lore: "The greatest swordsman of the Round Table, tormented by forbidden love.",
  },
  {
    id: "gawain",
    name: "Gawain",
    title: "The Sun Knight",
    color: 0xff8800,
    hp: 140, maxHp: 140,
    attack: 16, defense: 18, speed: 2, critChance: 0.08,
    ability: {
      name: "Solar Might",
      desc: "Strength surges like the noonday sun, boosting attack and defense.",
      cooldown: 5, damage: 0, range: 0, aoe: 0, healAmount: 20, effect: "buff_atk",
    },
    lore: "Nephew of Arthur. His strength waxes with the sun and wanes at dusk.",
  },
  {
    id: "percival",
    name: "Percival",
    title: "The Grail Knight",
    color: 0xeeeeee,
    hp: 90, maxHp: 90,
    attack: 14, defense: 12, speed: 3, critChance: 0.12,
    ability: {
      name: "Grail's Blessing",
      desc: "A radiant prayer that heals and purifies, removing debuffs.",
      cooldown: 4, damage: 0, range: 0, aoe: 2, healAmount: 40, effect: "purify",
    },
    lore: "Pure of heart, destined to find the Holy Grail. A healer and visionary.",
  },
  {
    id: "galahad",
    name: "Galahad",
    title: "The Perfect Knight",
    color: 0xffffff,
    hp: 80, maxHp: 80,
    attack: 20, defense: 20, speed: 3, critChance: 0.15,
    ability: {
      name: "Divine Shield",
      desc: "An impenetrable holy barrier that blocks all damage for 2 turns.",
      cooldown: 6, damage: 0, range: 0, aoe: 0, healAmount: 0, effect: "invulnerable",
    },
    lore: "Son of Lancelot, the only knight worthy to sit in the Siege Perilous.",
  },
  {
    id: "tristan",
    name: "Tristan",
    title: "The Lovelorn Blade",
    color: 0xff4466,
    hp: 85, maxHp: 85,
    attack: 22, defense: 8, speed: 5, critChance: 0.25,
    ability: {
      name: "Heartseeker",
      desc: "A precise thrust that always crits and poisons the target.",
      cooldown: 3, damage: 40, range: 2, aoe: 0, healAmount: 0, effect: "poison",
    },
    lore: "A swift, passionate knight. His love for Isolde drives him to recklessness.",
  },
  {
    id: "kay",
    name: "Kay",
    title: "The Seneschal",
    color: 0xaa8844,
    hp: 130, maxHp: 130,
    attack: 15, defense: 16, speed: 2, critChance: 0.05,
    ability: {
      name: "Burning Hands",
      desc: "Fire erupts from his palms, scorching enemies in a cone.",
      cooldown: 4, damage: 30, range: 3, aoe: 2, healAmount: 0, effect: "burn",
    },
    lore: "Arthur's foster-brother. Brash but loyal, said to radiate heat from his hands.",
  },
  {
    id: "bedivere",
    name: "Bedivere",
    title: "The One-Handed",
    color: 0x88bbcc,
    hp: 110, maxHp: 110,
    attack: 17, defense: 15, speed: 3, critChance: 0.1,
    ability: {
      name: "Last Stand",
      desc: "When near death, unleashes a devastating counterattack.",
      cooldown: 5, damage: 60, range: 1, aoe: 0, healAmount: 0,
    },
    lore: "The last knight at Arthur's side. Faithful until the very end.",
  },
];

// ---------------------------------------------------------------------------
// Enemy Definitions
// ---------------------------------------------------------------------------

export enum EnemyCategory {
  BANDIT = "bandit",
  UNDEAD = "undead",
  BEAST = "beast",
  FAE = "fae",
  KNIGHT = "knight",
  DEMON = "demon",
  ELEMENTAL = "elemental",
  SIEGE = "siege",
  BOSS = "boss",
}

export type AIType = "melee" | "ranged" | "tank" | "mage" | "summoner";

export interface EnemyDef {
  id: string;
  name: string;
  category: EnemyCategory;
  aiType: AIType;
  color: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  xpReward: number;
  goldReward: number;
  abilities?: string[];
  isBoss?: boolean;
  bossPhases?: number;
  lore?: string;
}

export const ENEMY_DEFS: Record<string, EnemyDef> = {
  // --- Bandits ---
  bandit_thug: {
    id: "bandit_thug", name: "Bandit Thug", category: EnemyCategory.BANDIT, aiType: "melee",
    color: 0x886644, hp: 30, attack: 8, defense: 4, speed: 2, xpReward: 10, goldReward: 5,
  },
  bandit_archer: {
    id: "bandit_archer", name: "Bandit Archer", category: EnemyCategory.BANDIT, aiType: "ranged",
    color: 0x667744, hp: 22, attack: 12, defense: 2, speed: 3, xpReward: 12, goldReward: 7,
    abilities: ["ranged_shot"],
  },
  bandit_chief: {
    id: "bandit_chief", name: "Bandit Chief", category: EnemyCategory.BANDIT, aiType: "summoner",
    color: 0xaa7744, hp: 60, attack: 14, defense: 8, speed: 2, xpReward: 25, goldReward: 15,
    abilities: ["rally"],
  },
  // --- Undead ---
  skeleton: {
    id: "skeleton", name: "Skeleton Warrior", category: EnemyCategory.UNDEAD, aiType: "melee",
    color: 0xccccaa, hp: 25, attack: 10, defense: 6, speed: 1, xpReward: 12, goldReward: 4,
  },
  wraith: {
    id: "wraith", name: "Wraith", category: EnemyCategory.UNDEAD, aiType: "ranged",
    color: 0x6644aa, hp: 35, attack: 16, defense: 2, speed: 3, xpReward: 18, goldReward: 8,
    abilities: ["life_drain"],
  },
  revenant_knight: {
    id: "revenant_knight", name: "Revenant Knight", category: EnemyCategory.UNDEAD, aiType: "tank",
    color: 0x445566, hp: 70, attack: 18, defense: 12, speed: 2, xpReward: 30, goldReward: 12,
    abilities: ["shield_bash"],
  },
  // --- Beasts ---
  dire_wolf: {
    id: "dire_wolf", name: "Dire Wolf", category: EnemyCategory.BEAST, aiType: "melee",
    color: 0x666666, hp: 40, attack: 14, defense: 4, speed: 4, xpReward: 15, goldReward: 6,
    abilities: ["lunge"],
  },
  wyvern: {
    id: "wyvern", name: "Wyvern", category: EnemyCategory.BEAST, aiType: "ranged",
    color: 0x448844, hp: 55, attack: 16, defense: 8, speed: 3, xpReward: 22, goldReward: 10,
    abilities: ["fire_breath"],
  },
  giant_spider: {
    id: "giant_spider", name: "Giant Spider", category: EnemyCategory.BEAST, aiType: "melee",
    color: 0x332222, hp: 30, attack: 12, defense: 3, speed: 4, xpReward: 14, goldReward: 5,
    abilities: ["web"],
  },
  // --- Fae ---
  pixie: {
    id: "pixie", name: "Mischievous Pixie", category: EnemyCategory.FAE, aiType: "mage",
    color: 0x88ffaa, hp: 15, attack: 6, defense: 1, speed: 5, xpReward: 8, goldReward: 8,
    abilities: ["confuse"],
  },
  fae_knight: {
    id: "fae_knight", name: "Fae Knight", category: EnemyCategory.FAE, aiType: "mage",
    color: 0x44ddaa, hp: 50, attack: 18, defense: 10, speed: 3, xpReward: 25, goldReward: 12,
    abilities: ["glamour"],
  },
  troll: {
    id: "troll", name: "Bridge Troll", category: EnemyCategory.BEAST, aiType: "tank",
    color: 0x556633, hp: 80, attack: 20, defense: 14, speed: 1, xpReward: 28, goldReward: 15,
    abilities: ["regenerate"],
  },
  // --- Knights ---
  rogue_knight: {
    id: "rogue_knight", name: "Rogue Knight", category: EnemyCategory.KNIGHT, aiType: "tank",
    color: 0x884444, hp: 60, attack: 16, defense: 14, speed: 2, xpReward: 22, goldReward: 10,
    abilities: ["shield_bash"],
  },
  saxon_warrior: {
    id: "saxon_warrior", name: "Saxon Warrior", category: EnemyCategory.KNIGHT, aiType: "melee",
    color: 0x998866, hp: 50, attack: 14, defense: 10, speed: 2, xpReward: 18, goldReward: 8,
  },
  // --- Elementals ---
  fire_elemental: {
    id: "fire_elemental", name: "Fire Elemental", category: EnemyCategory.ELEMENTAL, aiType: "mage",
    color: 0xff4400, hp: 45, attack: 20, defense: 4, speed: 2, xpReward: 20, goldReward: 10,
    abilities: ["fire_aura"],
  },
  ice_wraith: {
    id: "ice_wraith", name: "Ice Wraith", category: EnemyCategory.ELEMENTAL, aiType: "mage",
    color: 0x88ccff, hp: 40, attack: 16, defense: 6, speed: 3, xpReward: 18, goldReward: 9,
    abilities: ["freeze"],
  },

  // --- Weak Minions (summoned) ---
  skeleton_minion: {
    id: "skeleton_minion", name: "Skeleton Minion", category: EnemyCategory.UNDEAD, aiType: "melee",
    color: 0xbbbb99, hp: 15, attack: 6, defense: 2, speed: 2, xpReward: 5, goldReward: 2,
  },
  fae_pixie_minion: {
    id: "fae_pixie_minion", name: "Fae Pixie", category: EnemyCategory.FAE, aiType: "melee",
    color: 0x66cc88, hp: 10, attack: 4, defense: 1, speed: 4, xpReward: 3, goldReward: 1,
  },
  bandit_minion: {
    id: "bandit_minion", name: "Bandit Lackey", category: EnemyCategory.BANDIT, aiType: "melee",
    color: 0x775533, hp: 18, attack: 6, defense: 3, speed: 2, xpReward: 4, goldReward: 2,
  },
  beast_copy: {
    id: "beast_copy", name: "Lesser Beast", category: EnemyCategory.BEAST, aiType: "melee",
    color: 0x999900, hp: 80, attack: 14, defense: 8, speed: 3, xpReward: 40, goldReward: 20,
  },

  // --- BOSSES ---
  mordred: {
    id: "mordred", name: "Mordred, the Treacherous", category: EnemyCategory.BOSS, aiType: "melee",
    color: 0x440000, hp: 300, attack: 28, defense: 18, speed: 3, xpReward: 200, goldReward: 100,
    abilities: ["dark_strike", "summon_undead", "backstab"],
    isBoss: true, bossPhases: 3,
    lore: "Arthur's bastard son, consumed by hatred and ambition.",
  },
  morgan_le_fay: {
    id: "morgan_le_fay", name: "Morgan le Fay", category: EnemyCategory.BOSS, aiType: "mage",
    color: 0x8800aa, hp: 250, attack: 32, defense: 12, speed: 2, xpReward: 200, goldReward: 100,
    abilities: ["dark_magic", "illusion", "heal_self"],
    isBoss: true, bossPhases: 3,
    lore: "Arthur's half-sister, a sorceress of terrifying power.",
  },
  green_knight: {
    id: "green_knight", name: "The Green Knight", category: EnemyCategory.BOSS, aiType: "tank",
    color: 0x00aa00, hp: 350, attack: 22, defense: 22, speed: 2, xpReward: 180, goldReward: 80,
    abilities: ["regenerate", "challenge", "decapitate"],
    isBoss: true, bossPhases: 2,
    lore: "An unkillable champion of the old magic, testing the virtue of knights.",
  },
  questing_beast: {
    id: "questing_beast", name: "The Questing Beast", category: EnemyCategory.BOSS, aiType: "melee",
    color: 0xaaaa00, hp: 280, attack: 24, defense: 16, speed: 4, xpReward: 170, goldReward: 90,
    abilities: ["serpent_strike", "howl", "trample"],
    isBoss: true, bossPhases: 2,
    lore: "A chimeric horror: serpent head, leopard body, lion haunches, deer feet.",
  },
  black_knight: {
    id: "black_knight", name: "The Black Knight", category: EnemyCategory.BOSS, aiType: "tank",
    color: 0x222222, hp: 400, attack: 30, defense: 24, speed: 1, xpReward: 220, goldReward: 120,
    abilities: ["unyielding", "dark_cleave", "fear_aura"],
    isBoss: true, bossPhases: 3,
    lore: "'Tis but a scratch.' An unstoppable armored menace.",
  },
  king_rience: {
    id: "king_rience", name: "King Rience", category: EnemyCategory.BOSS, aiType: "summoner",
    color: 0xcc6600, hp: 320, attack: 26, defense: 20, speed: 2, xpReward: 190, goldReward: 95,
    abilities: ["war_cry", "shield_wall", "execute"],
    isBoss: true, bossPhases: 2,
    lore: "A rival king who collects the beards of conquered monarchs.",
  },
  saxon_warlord: {
    id: "saxon_warlord", name: "Saxon Warlord", category: EnemyCategory.BOSS, aiType: "summoner",
    color: 0x886644, hp: 340, attack: 24, defense: 22, speed: 2, xpReward: 200, goldReward: 100,
    abilities: ["berserker_rage", "shield_wall", "rally"],
    isBoss: true, bossPhases: 2,
    lore: "Leader of the Saxon invasion, sworn to destroy Camelot.",
  },
  oberon: {
    id: "oberon", name: "Oberon, King of Faerie", category: EnemyCategory.BOSS, aiType: "mage",
    color: 0x00ffaa, hp: 260, attack: 30, defense: 14, speed: 4, xpReward: 210, goldReward: 110,
    abilities: ["fae_storm", "glamour", "summon_fae", "time_warp"],
    isBoss: true, bossPhases: 3,
    lore: "Ruler of the Otherworld, capricious and impossibly powerful.",
  },
};

// Enemy pools per floor difficulty tier
export const ENEMY_POOLS: Record<string, string[]> = {
  easy:   ["bandit_thug", "bandit_archer", "skeleton", "pixie", "giant_spider"],
  medium: ["bandit_chief", "dire_wolf", "wraith", "fae_knight", "saxon_warrior", "ice_wraith"],
  hard:   ["revenant_knight", "wyvern", "troll", "rogue_knight", "fire_elemental"],
};

// ---------------------------------------------------------------------------
// Relic / Item Definitions
// ---------------------------------------------------------------------------

export enum ItemType {
  WEAPON = "weapon",
  ARMOR = "armor",
  RELIC = "relic",
  CONSUMABLE = "consumable",
}

export enum ItemRarity {
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
  LEGENDARY = "legendary",
}

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  color: number;
  attackBonus: number;
  defenseBonus: number;
  hpBonus: number;
  speedBonus: number;
  specialEffect?: string;
  desc: string;
}

export const ITEM_DEFS: Record<string, ItemDef> = {
  // --- Weapons ---
  rusty_sword: {
    id: "rusty_sword", name: "Rusty Sword", type: ItemType.WEAPON, rarity: ItemRarity.COMMON,
    color: 0x888888, attackBonus: 3, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
    desc: "A battered blade. Better than nothing.",
  },
  fine_longsword: {
    id: "fine_longsword", name: "Fine Longsword", type: ItemType.WEAPON, rarity: ItemRarity.UNCOMMON,
    color: 0xaaaacc, attackBonus: 6, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
    desc: "A well-forged blade of tempered steel.",
  },
  enchanted_blade: {
    id: "enchanted_blade", name: "Enchanted Blade", type: ItemType.WEAPON, rarity: ItemRarity.RARE,
    color: 0x44aaff, attackBonus: 10, defenseBonus: 0, hpBonus: 0, speedBonus: 1,
    specialEffect: "magic_damage", desc: "Glows with faint arcane light.",
  },
  excalibur: {
    id: "excalibur", name: "Excalibur", type: ItemType.WEAPON, rarity: ItemRarity.LEGENDARY,
    color: 0xffd700, attackBonus: 20, defenseBonus: 5, hpBonus: 20, speedBonus: 1,
    specialEffect: "holy_smite", desc: "The sword of kings. Its light banishes all darkness.",
  },
  // --- Armor ---
  leather_armor: {
    id: "leather_armor", name: "Leather Armor", type: ItemType.ARMOR, rarity: ItemRarity.COMMON,
    color: 0x886644, attackBonus: 0, defenseBonus: 3, hpBonus: 10, speedBonus: 0,
    desc: "Simple but sturdy protection.",
  },
  chainmail: {
    id: "chainmail", name: "Chainmail", type: ItemType.ARMOR, rarity: ItemRarity.UNCOMMON,
    color: 0xaaaaaa, attackBonus: 0, defenseBonus: 6, hpBonus: 15, speedBonus: 0,
    desc: "Interlocking rings of steel.",
  },
  plate_of_valor: {
    id: "plate_of_valor", name: "Plate of Valor", type: ItemType.ARMOR, rarity: ItemRarity.RARE,
    color: 0x6688aa, attackBonus: 0, defenseBonus: 12, hpBonus: 25, speedBonus: -1,
    desc: "Heavy plate that inspires courage.",
  },
  avalon_mail: {
    id: "avalon_mail", name: "Avalon Mail", type: ItemType.ARMOR, rarity: ItemRarity.LEGENDARY,
    color: 0x88ffcc, attackBonus: 5, defenseBonus: 18, hpBonus: 40, speedBonus: 0,
    specialEffect: "regen", desc: "Forged in the mists of Avalon. Heals the wearer.",
  },
  // --- Relics ---
  grail_shard: {
    id: "grail_shard", name: "Grail Shard", type: ItemType.RELIC, rarity: ItemRarity.RARE,
    color: 0xffd700, attackBonus: 0, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
    specialEffect: "grail_heal", desc: "A fragment of the Holy Grail. Heals between floors.",
  },
  holy_grail: {
    id: "holy_grail", name: "The Holy Grail", type: ItemType.RELIC, rarity: ItemRarity.LEGENDARY,
    color: 0xffffaa, attackBonus: 5, defenseBonus: 5, hpBonus: 50, speedBonus: 0,
    specialEffect: "grail_full", desc: "The Sangreal itself. Grants divine protection and healing.",
  },
  merlin_staff: {
    id: "merlin_staff", name: "Merlin's Staff", type: ItemType.RELIC, rarity: ItemRarity.LEGENDARY,
    color: 0x8844ff, attackBonus: 15, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
    specialEffect: "arcane_blast", desc: "The staff of the greatest wizard. Crackles with power.",
  },
  round_table_seal: {
    id: "round_table_seal", name: "Round Table Seal", type: ItemType.RELIC, rarity: ItemRarity.RARE,
    color: 0xccaa44, attackBonus: 5, defenseBonus: 5, hpBonus: 20, speedBonus: 0,
    specialEffect: "xp_boost", desc: "The seal of the Round Table. Grants wisdom.",
  },
  lady_lake_pendant: {
    id: "lady_lake_pendant", name: "Lady of the Lake's Pendant", type: ItemType.RELIC, rarity: ItemRarity.RARE,
    color: 0x44aaff, attackBonus: 0, defenseBonus: 8, hpBonus: 0, speedBonus: 1,
    specialEffect: "water_shield", desc: "A pendant from Nimue. Water shields the bearer.",
  },
  scabbard_excalibur: {
    id: "scabbard_excalibur", name: "Scabbard of Excalibur", type: ItemType.RELIC, rarity: ItemRarity.LEGENDARY,
    color: 0xffcc00, attackBonus: 0, defenseBonus: 10, hpBonus: 30, speedBonus: 0,
    specialEffect: "no_bleed", desc: "More precious than the sword. The bearer cannot bleed.",
  },
  // --- Consumables ---
  health_potion: {
    id: "health_potion", name: "Health Potion", type: ItemType.CONSUMABLE, rarity: ItemRarity.COMMON,
    color: 0xff4444, attackBonus: 0, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
    specialEffect: "heal_30", desc: "Restores 30 HP.",
  },
  strength_elixir: {
    id: "strength_elixir", name: "Strength Elixir", type: ItemType.CONSUMABLE, rarity: ItemRarity.UNCOMMON,
    color: 0xff8844, attackBonus: 0, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
    specialEffect: "buff_atk_temp", desc: "Temporarily boosts attack by 10 for 5 turns.",
  },
  scroll_lightning: {
    id: "scroll_lightning", name: "Scroll of Lightning", type: ItemType.CONSUMABLE, rarity: ItemRarity.RARE,
    color: 0xffff44, attackBonus: 0, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
    specialEffect: "lightning_all", desc: "Strikes all enemies on screen with lightning.",
  },
};

// Loot tables by floor difficulty
export const LOOT_TABLES: Record<string, { itemId: string; weight: number }[]> = {
  easy: [
    { itemId: "rusty_sword", weight: 10 },
    { itemId: "leather_armor", weight: 10 },
    { itemId: "health_potion", weight: 15 },
    { itemId: "fine_longsword", weight: 4 },
    { itemId: "chainmail", weight: 4 },
  ],
  medium: [
    { itemId: "fine_longsword", weight: 8 },
    { itemId: "chainmail", weight: 8 },
    { itemId: "health_potion", weight: 10 },
    { itemId: "strength_elixir", weight: 5 },
    { itemId: "enchanted_blade", weight: 3 },
    { itemId: "plate_of_valor", weight: 3 },
    { itemId: "grail_shard", weight: 2 },
    { itemId: "round_table_seal", weight: 2 },
  ],
  hard: [
    { itemId: "enchanted_blade", weight: 6 },
    { itemId: "plate_of_valor", weight: 6 },
    { itemId: "scroll_lightning", weight: 4 },
    { itemId: "strength_elixir", weight: 5 },
    { itemId: "grail_shard", weight: 3 },
    { itemId: "lady_lake_pendant", weight: 2 },
    { itemId: "merlin_staff", weight: 1 },
    { itemId: "excalibur", weight: 1 },
    { itemId: "avalon_mail", weight: 1 },
    { itemId: "scabbard_excalibur", weight: 1 },
    { itemId: "holy_grail", weight: 1 },
  ],
};

// ---------------------------------------------------------------------------
// Floor Generation Parameters
// ---------------------------------------------------------------------------

export interface FloorParams {
  width: number;
  height: number;
  roomCountMin: number;
  roomCountMax: number;
  roomSizeMin: number;
  roomSizeMax: number;
  enemyCountMin: number;
  enemyCountMax: number;
  trapChance: number;       // 0..1 per corridor tile
  treasureChance: number;   // 0..1 per room
  hasBoss: boolean;
}

export function getFloorParams(floorNum: number, totalFloors: number): FloorParams {
  const t = floorNum / Math.max(totalFloors - 1, 1);   // 0..1 progress
  const isFinalFloor = floorNum === totalFloors - 1;
  return {
    width: Math.floor(40 + t * 20),
    height: Math.floor(30 + t * 15),
    roomCountMin: Math.floor(5 + t * 4),
    roomCountMax: Math.floor(8 + t * 6),
    roomSizeMin: 4,
    roomSizeMax: Math.floor(8 + t * 3),
    enemyCountMin: Math.floor(6 + t * 8),
    enemyCountMax: Math.floor(10 + t * 14),
    trapChance: 0.02 + t * 0.04,
    treasureChance: 0.3 + t * 0.1,
    hasBoss: isFinalFloor || (floorNum > 0 && floorNum % 3 === 0),
  };
}

// ---------------------------------------------------------------------------
// Balance Constants
// ---------------------------------------------------------------------------

export const GameBalance = {
  SIM_TICK_MS: 16,
  TILE_SIZE: 32,
  PLAYER_MOVE_SPEED: 160,         // px/s
  ATTACK_COOLDOWN_MS: 400,
  ABILITY_ANIMATION_MS: 300,
  LEVEL_UP_XP_BASE: 50,
  LEVEL_UP_XP_SCALE: 1.4,
  MAX_INVENTORY_SIZE: 12,
  GOLD_HEAL_COST: 20,
  CAMERA_LERP: 0.12,
  ENEMY_AGGRO_RANGE: 6,            // tiles
  ENEMY_MOVE_SPEED: 80,            // px/s
  TRAP_DAMAGE: 15,
  RARITY_COLORS: {
    [ItemRarity.COMMON]: 0xaaaaaa,
    [ItemRarity.UNCOMMON]: 0x44ff44,
    [ItemRarity.RARE]: 0x4488ff,
    [ItemRarity.LEGENDARY]: 0xffd700,
  } as Record<ItemRarity, number>,
  XP_PER_LEVEL: (level: number) => Math.floor(50 * Math.pow(1.4, level - 1)),
};

// ---------------------------------------------------------------------------
// Floor Tile Types
// ---------------------------------------------------------------------------

export enum TileType {
  WALL = 0,
  FLOOR = 1,
  CORRIDOR = 2,
  DOOR = 3,
  STAIRS_DOWN = 4,
  TRAP = 5,
  TREASURE = 6,
  ENTRANCE = 7,
  SHOP = 8,
  VINE = 9,
  ICE = 10,
  LAVA = 11,
  ILLUSION = 12,
  SHRINE = 13,
}

// ---------------------------------------------------------------------------
// Room Type Variants
// ---------------------------------------------------------------------------

export enum RoomType {
  NORMAL = "normal",
  SHRINE = "shrine",
  CHAMPION_ARENA = "champion_arena",
  TREASURE_VAULT = "treasure_vault",
  SECRET = "secret",
}

// ---------------------------------------------------------------------------
// Shop Definitions
// ---------------------------------------------------------------------------

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  desc: string;
  type: "heal" | "stat_atk" | "stat_def" | "gear";
  itemId?: string;     // for gear items, references ITEM_DEFS
  statBonus?: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: "shop_heal", name: "Full Heal", cost: 20, desc: "Fully restore HP", type: "heal" },
  { id: "shop_atk_potion", name: "Strength Potion", cost: 50, desc: "+2 ATK (permanent)", type: "stat_atk", statBonus: 2 },
  { id: "shop_def_potion", name: "Iron Tonic", cost: 40, desc: "+1 DEF (permanent)", type: "stat_def", statBonus: 1 },
  { id: "shop_fine_sword", name: "Fine Longsword", cost: 60, desc: "A well-forged blade", type: "gear", itemId: "fine_longsword" },
  { id: "shop_chainmail", name: "Chainmail", cost: 55, desc: "Interlocking rings of steel", type: "gear", itemId: "chainmail" },
  { id: "shop_health_pot", name: "Health Potion", cost: 15, desc: "Restores 30 HP", type: "gear", itemId: "health_potion" },
  { id: "shop_enchanted", name: "Enchanted Blade", cost: 120, desc: "Glows with faint arcane light", type: "gear", itemId: "enchanted_blade" },
  { id: "shop_plate", name: "Plate of Valor", cost: 140, desc: "Heavy plate that inspires courage", type: "gear", itemId: "plate_of_valor" },
  { id: "shop_elixir", name: "Strength Elixir", cost: 30, desc: "Temp ATK boost", type: "gear", itemId: "strength_elixir" },
];

// Floor theme colors per progress tier
export const FLOOR_THEMES: { wallColor: number; floorColor: number; name: string }[] = [
  { wallColor: 0x444444, floorColor: 0x222222, name: "Castle Dungeons" },
  { wallColor: 0x335533, floorColor: 0x1a331a, name: "Enchanted Forest Caves" },
  { wallColor: 0x553333, floorColor: 0x331a1a, name: "Crimson Crypts" },
  { wallColor: 0x334455, floorColor: 0x1a2233, name: "Frozen Depths" },
  { wallColor: 0x554433, floorColor: 0x33221a, name: "Volcanic Tunnels" },
  { wallColor: 0x225544, floorColor: 0x113322, name: "Faerie Hollows" },
  { wallColor: 0x222244, floorColor: 0x111133, name: "Abyssal Halls" },
  { wallColor: 0x666644, floorColor: 0x444422, name: "The Final Keep" },
];
