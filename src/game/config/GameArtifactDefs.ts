// ---------------------------------------------------------------------------
// Quest for the Grail — Artifact & Companion Definitions
// ---------------------------------------------------------------------------

// ItemType, ItemRarity, ItemDef not directly used in this file

// ---------------------------------------------------------------------------
// Legendary Artifacts
// ---------------------------------------------------------------------------

export interface ArtifactDef {
  id: string;
  name: string;
  color: number;
  desc: string;
  lore: string;
  setId?: string;         // belongs to an artifact set
  attackBonus: number;
  defenseBonus: number;
  hpBonus: number;
  speedBonus: number;
  specialEffect: string;
  upgradePath?: string;   // id of next upgrade tier
  questHint?: string;     // hidden quest hint text
}

export const ARTIFACT_DEFS: Record<string, ArtifactDef> = {
  // --- Grail Set ---
  grail_chalice: {
    id: "grail_chalice", name: "Chalice of the Grail", color: 0xffd700,
    desc: "A golden chalice that hums with divine energy.",
    lore: "Said to be a fragment of the Holy Grail itself, this chalice restores vitality between floors.",
    setId: "grail_set", attackBonus: 0, defenseBonus: 3, hpBonus: 30, speedBonus: 0,
    specialEffect: "grail_chalice_heal", upgradePath: "grail_chalice_awakened",
    questHint: "Defeat 3 bosses without using potions to awaken the chalice.",
  },
  grail_chalice_awakened: {
    id: "grail_chalice_awakened", name: "Awakened Chalice", color: 0xffffaa,
    desc: "The chalice overflows with divine light.",
    lore: "Proven worthy, the chalice reveals its true power.",
    setId: "grail_set", attackBonus: 5, defenseBonus: 5, hpBonus: 50, speedBonus: 0,
    specialEffect: "grail_chalice_full",
  },
  grail_cloth: {
    id: "grail_cloth", name: "Grail Cloth", color: 0xffd700,
    desc: "The cloth that covered the Grail. Shimmers with protection.",
    lore: "Woven from threads of starlight, it shields its bearer from harm.",
    setId: "grail_set", attackBonus: 0, defenseBonus: 8, hpBonus: 20, speedBonus: 0,
    specialEffect: "damage_reduction_10",
  },
  grail_light: {
    id: "grail_light", name: "Light of the Grail", color: 0xffffcc,
    desc: "A radiant sphere that illuminates even the darkest dungeon.",
    lore: "The inner light of the Grail, said to banish all shadows.",
    setId: "grail_set", attackBonus: 3, defenseBonus: 3, hpBonus: 15, speedBonus: 1,
    specialEffect: "reveal_secrets",
  },

  // --- Excalibur Set ---
  excalibur_shard: {
    id: "excalibur_shard", name: "Excalibur Shard", color: 0xffd700,
    desc: "A broken piece of the legendary blade.",
    lore: "Even as a fragment, it cuts through darkness with ease.",
    setId: "excalibur_set", attackBonus: 8, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
    specialEffect: "holy_smite_lite", upgradePath: "excalibur_shard_reforged",
    questHint: "Bring it to a shrine on the final floor to reforge.",
  },
  excalibur_shard_reforged: {
    id: "excalibur_shard_reforged", name: "Reforged Excalibur Shard", color: 0xffd700,
    desc: "Reforged with holy fire, its edge shines anew.",
    lore: "The shard remembers what it once was.",
    setId: "excalibur_set", attackBonus: 15, defenseBonus: 2, hpBonus: 10, speedBonus: 0,
    specialEffect: "holy_smite",
  },
  excalibur_scabbard_piece: {
    id: "excalibur_scabbard_piece", name: "Scabbard Fragment", color: 0xffcc00,
    desc: "A piece of the Scabbard of Excalibur.",
    lore: "The scabbard was said to be more precious than the sword.",
    setId: "excalibur_set", attackBonus: 0, defenseBonus: 6, hpBonus: 20, speedBonus: 0,
    specialEffect: "bleed_immune",
  },
  excalibur_pommel: {
    id: "excalibur_pommel", name: "Pommel of Excalibur", color: 0xffdd44,
    desc: "The golden pommel of the sword of kings.",
    lore: "Gripping it fills you with royal authority.",
    setId: "excalibur_set", attackBonus: 5, defenseBonus: 5, hpBonus: 10, speedBonus: 0,
    specialEffect: "crit_up_10",
  },

  // --- Merlin Set ---
  merlin_orb: {
    id: "merlin_orb", name: "Merlin's Orb", color: 0x8844ff,
    desc: "A crystal sphere swirling with visions.",
    lore: "Merlin used this to see the threads of fate.",
    setId: "merlin_set", attackBonus: 10, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
    specialEffect: "ability_cd_reduce",
  },
  merlin_hat: {
    id: "merlin_hat", name: "Merlin's Hat", color: 0x6644aa,
    desc: "A tall pointed hat that crackles with static.",
    lore: "Worn by the great wizard during the founding of Camelot.",
    setId: "merlin_set", attackBonus: 5, defenseBonus: 2, hpBonus: 10, speedBonus: 0,
    specialEffect: "magic_damage_up",
  },
  merlin_tome: {
    id: "merlin_tome", name: "Merlin's Tome", color: 0x7755bb,
    desc: "A book of ancient spells, its pages still turning.",
    lore: "Contains the spells that shaped Britain's destiny.",
    setId: "merlin_set", attackBonus: 7, defenseBonus: 0, hpBonus: 15, speedBonus: 0,
    specialEffect: "xp_boost_20",
  },

  // --- Standalone Artifacts ---
  camelot_banner: {
    id: "camelot_banner", name: "Banner of Camelot", color: 0xcc0000,
    desc: "The rallying standard of Camelot.",
    lore: "When raised, it inspires all who fight beside it.",
    attackBonus: 3, defenseBonus: 3, hpBonus: 10, speedBonus: 0,
    specialEffect: "companion_buff",
  },
  nimue_mirror: {
    id: "nimue_mirror", name: "Nimue's Mirror", color: 0x44aaff,
    desc: "A silver mirror that reflects more than light.",
    lore: "The Lady of the Lake's mirror reveals hidden truths.",
    attackBonus: 0, defenseBonus: 4, hpBonus: 0, speedBonus: 0,
    specialEffect: "trap_reveal",
  },
  mordred_crown: {
    id: "mordred_crown", name: "Mordred's Crown", color: 0x440000,
    desc: "A twisted iron crown that pulses with dark power.",
    lore: "Forged from hatred, it grants power at a terrible cost.",
    attackBonus: 15, defenseBonus: -3, hpBonus: -20, speedBonus: 2,
    specialEffect: "dark_power",
  },
  green_girdle: {
    id: "green_girdle", name: "Green Girdle", color: 0x00aa44,
    desc: "The enchanted sash from the Green Knight's test.",
    lore: "Said to make the wearer unkillable — but it is a test of honor.",
    attackBonus: 0, defenseBonus: 8, hpBonus: 30, speedBonus: 0,
    specialEffect: "survive_lethal",
  },
};

// ---------------------------------------------------------------------------
// Artifact Set Bonuses
// ---------------------------------------------------------------------------

export interface ArtifactSetBonus {
  setId: string;
  name: string;
  color: number;
  pieces: string[];         // artifact ids in this set
  bonuses: {
    count: number;          // pieces required
    desc: string;
    attackBonus: number;
    defenseBonus: number;
    hpBonus: number;
    speedBonus: number;
    specialEffect?: string;
  }[];
}

export const ARTIFACT_SET_BONUSES: ArtifactSetBonus[] = [
  {
    setId: "grail_set", name: "Grail Seekers", color: 0xffd700,
    pieces: ["grail_chalice", "grail_chalice_awakened", "grail_cloth", "grail_light"],
    bonuses: [
      { count: 2, desc: "+20 HP, Heal 10 HP between floors", attackBonus: 0, defenseBonus: 0, hpBonus: 20, speedBonus: 0, specialEffect: "set_grail_2" },
      { count: 3, desc: "+5 ATK, +5 DEF, Full heal between floors", attackBonus: 5, defenseBonus: 5, hpBonus: 0, speedBonus: 0, specialEffect: "set_grail_3" },
    ],
  },
  {
    setId: "excalibur_set", name: "Fragments of Excalibur", color: 0xffd700,
    pieces: ["excalibur_shard", "excalibur_shard_reforged", "excalibur_scabbard_piece", "excalibur_pommel"],
    bonuses: [
      { count: 2, desc: "+8 ATK, Holy smite on crits", attackBonus: 8, defenseBonus: 0, hpBonus: 0, speedBonus: 0, specialEffect: "set_excalibur_2" },
      { count: 3, desc: "+15 ATK, +10 DEF, Cannot be stunned", attackBonus: 15, defenseBonus: 10, hpBonus: 0, speedBonus: 0, specialEffect: "set_excalibur_3" },
    ],
  },
  {
    setId: "merlin_set", name: "Merlin's Legacy", color: 0x8844ff,
    pieces: ["merlin_orb", "merlin_hat", "merlin_tome"],
    bonuses: [
      { count: 2, desc: "+10 ATK, -30% ability cooldown", attackBonus: 10, defenseBonus: 0, hpBonus: 0, speedBonus: 0, specialEffect: "set_merlin_2" },
      { count: 3, desc: "+20 ATK, Abilities deal 50% more damage", attackBonus: 20, defenseBonus: 0, hpBonus: 0, speedBonus: 0, specialEffect: "set_merlin_3" },
    ],
  },
];

// Artifact drop table (from bosses, secret rooms, quests)
export const ARTIFACT_DROP_TABLE: { artifactId: string; weight: number }[] = [
  { artifactId: "grail_chalice", weight: 3 },
  { artifactId: "grail_cloth", weight: 3 },
  { artifactId: "grail_light", weight: 3 },
  { artifactId: "excalibur_shard", weight: 3 },
  { artifactId: "excalibur_scabbard_piece", weight: 3 },
  { artifactId: "excalibur_pommel", weight: 3 },
  { artifactId: "merlin_orb", weight: 2 },
  { artifactId: "merlin_hat", weight: 2 },
  { artifactId: "merlin_tome", weight: 2 },
  { artifactId: "camelot_banner", weight: 3 },
  { artifactId: "nimue_mirror", weight: 3 },
  { artifactId: "mordred_crown", weight: 1 },
  { artifactId: "green_girdle", weight: 2 },
];

// ---------------------------------------------------------------------------
// Companion Definitions
// ---------------------------------------------------------------------------

export type CompanionClass = "healer" | "tank" | "mage" | "rogue";
export type CompanionBehavior = "aggressive" | "defensive" | "support";

export interface CompanionDef {
  id: string;
  name: string;
  title: string;
  companionClass: CompanionClass;
  color: number;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  abilities: CompanionAbilityDef[];
  lore: string;
  recruitFloorMin: number;  // earliest floor they can appear
}

export interface CompanionAbilityDef {
  name: string;
  desc: string;
  cooldown: number;       // seconds
  damage: number;
  healAmount: number;
  range: number;          // tiles
  effect?: string;
}

export const COMPANION_DEFS: CompanionDef[] = [
  {
    id: "comp_elaine", name: "Elaine", title: "the Healer",
    companionClass: "healer", color: 0xffaacc,
    baseHp: 60, baseAttack: 6, baseDefense: 8,
    abilities: [
      { name: "Holy Light", desc: "Heals the player for 20 HP.", cooldown: 8, damage: 0, healAmount: 20, range: 5 },
      { name: "Purify", desc: "Removes all debuffs from the player.", cooldown: 15, damage: 0, healAmount: 0, range: 5, effect: "purify" },
    ],
    lore: "A priestess of Avalon, sworn to aid worthy knights.",
    recruitFloorMin: 1,
  },
  {
    id: "comp_bors", name: "Bors", title: "the Shield",
    companionClass: "tank", color: 0x6688aa,
    baseHp: 120, baseAttack: 10, baseDefense: 16,
    abilities: [
      { name: "Taunt", desc: "Forces nearby enemies to target Bors.", cooldown: 12, damage: 0, healAmount: 0, range: 3, effect: "taunt" },
      { name: "Shield Wall", desc: "Reduces all damage by 50% for 5s.", cooldown: 20, damage: 0, healAmount: 0, range: 0, effect: "shield_wall" },
    ],
    lore: "A stalwart knight, cousin of Lancelot. Fights to protect others.",
    recruitFloorMin: 2,
  },
  {
    id: "comp_morgan_apprentice", name: "Vivian", title: "the Apprentice",
    companionClass: "mage", color: 0x8844ff,
    baseHp: 50, baseAttack: 18, baseDefense: 4,
    abilities: [
      { name: "Arcane Bolt", desc: "Fires a bolt of magic at the nearest enemy.", cooldown: 4, damage: 20, healAmount: 0, range: 6 },
      { name: "Frost Nova", desc: "Stuns all nearby enemies for 2s.", cooldown: 18, damage: 10, healAmount: 0, range: 3, effect: "freeze" },
    ],
    lore: "A rogue student of Morgan le Fay who defected to Arthur's cause.",
    recruitFloorMin: 3,
  },
  {
    id: "comp_gareth", name: "Gareth", title: "the Shadow",
    companionClass: "rogue", color: 0x886644,
    baseHp: 70, baseAttack: 16, baseDefense: 6,
    abilities: [
      { name: "Backstab", desc: "Teleports behind an enemy for a critical strike.", cooldown: 6, damage: 30, healAmount: 0, range: 4 },
      { name: "Smoke Bomb", desc: "Briefly makes both player and companion invisible.", cooldown: 22, damage: 0, healAmount: 0, range: 0, effect: "stealth" },
    ],
    lore: "Youngest brother of Gawain, eager to prove himself through cunning.",
    recruitFloorMin: 2,
  },
];

// ---------------------------------------------------------------------------
// Trap Type Definitions (for enhanced traps system)
// ---------------------------------------------------------------------------

export type TrapVariant = "spike" | "poison_gas" | "falling_rocks" | "teleport" | "alarm";

export interface TrapDef {
  variant: TrapVariant;
  name: string;
  color: number;
  damage: number;
  effect?: string;
  detectionDC: number;   // perception threshold to detect (0-100)
  disarmDC: number;      // skill check to disarm (0-100)
}

export const TRAP_DEFS: Record<TrapVariant, TrapDef> = {
  spike: {
    variant: "spike", name: "Spike Trap", color: 0x888888,
    damage: 15, detectionDC: 20, disarmDC: 30,
  },
  poison_gas: {
    variant: "poison_gas", name: "Poison Gas Trap", color: 0x44aa44,
    damage: 8, effect: "poison", detectionDC: 35, disarmDC: 45,
  },
  falling_rocks: {
    variant: "falling_rocks", name: "Falling Rocks", color: 0x666666,
    damage: 25, effect: "stun", detectionDC: 25, disarmDC: 50,
  },
  teleport: {
    variant: "teleport", name: "Teleport Trap", color: 0x8844ff,
    damage: 0, effect: "teleport", detectionDC: 40, disarmDC: 60,
  },
  alarm: {
    variant: "alarm", name: "Alarm Trap", color: 0xff4444,
    damage: 0, effect: "alarm", detectionDC: 30, disarmDC: 35,
  },
};

// ---------------------------------------------------------------------------
// Puzzle Room Definitions
// ---------------------------------------------------------------------------

export type PuzzleType = "pressure_plates" | "sequence" | "riddle";

export interface PuzzleDef {
  type: PuzzleType;
  name: string;
  desc: string;
  difficulty: number;     // 1-5
  rewardTier: string;     // "easy" | "medium" | "hard" for loot table
  timeLimit?: number;     // seconds, if timed
}

export const PUZZLE_DEFS: PuzzleDef[] = [
  { type: "pressure_plates", name: "The Stone Path", desc: "Step on the plates in the correct order.", difficulty: 1, rewardTier: "easy" },
  { type: "pressure_plates", name: "Knight's March", desc: "Walk the path of a chess knight.", difficulty: 3, rewardTier: "medium", timeLimit: 30 },
  { type: "sequence", name: "Runic Sequence", desc: "Activate the runes in the correct order.", difficulty: 2, rewardTier: "medium" },
  { type: "sequence", name: "The Dragon's Code", desc: "Decode the ancient dragon cipher.", difficulty: 4, rewardTier: "hard", timeLimit: 45 },
  { type: "riddle", name: "The Sphinx's Question", desc: "Answer the riddle to proceed.", difficulty: 2, rewardTier: "medium" },
  { type: "riddle", name: "Merlin's Trial", desc: "Only wisdom unlocks this door.", difficulty: 5, rewardTier: "hard" },
];

// ---------------------------------------------------------------------------
// Boss Arena Hazard Definitions
// ---------------------------------------------------------------------------

export interface ArenaHazardDef {
  id: string;
  name: string;
  desc: string;
  damagePerSecond: number;
  duration: number;       // seconds
  radius: number;         // tiles
  color: number;
}

export const ARENA_HAZARD_DEFS: Record<string, ArenaHazardDef> = {
  lava_pool: { id: "lava_pool", name: "Lava Pool", desc: "Molten rock erupts from the floor.", damagePerSecond: 10, duration: 8, radius: 2, color: 0xff4400 },
  collapsing_floor: { id: "collapsing_floor", name: "Collapsing Floor", desc: "The ground crumbles beneath you.", damagePerSecond: 20, duration: 3, radius: 3, color: 0x666666 },
  ice_storm: { id: "ice_storm", name: "Ice Storm", desc: "Freezing winds slow and damage.", damagePerSecond: 6, duration: 10, radius: 4, color: 0x88ccff },
  dark_vortex: { id: "dark_vortex", name: "Dark Vortex", desc: "A swirling void that pulls you in.", damagePerSecond: 8, duration: 6, radius: 3, color: 0x442266 },
  holy_fire: { id: "holy_fire", name: "Holy Fire", desc: "Sacred flames that purge all within.", damagePerSecond: 12, duration: 5, radius: 2, color: 0xffd700 },
};

// Which hazards each boss uses
export const BOSS_ARENA_HAZARDS: Record<string, string[]> = {
  mordred: ["dark_vortex", "collapsing_floor"],
  morgan_le_fay: ["dark_vortex", "ice_storm"],
  green_knight: ["lava_pool"],
  questing_beast: ["lava_pool", "collapsing_floor"],
  black_knight: ["collapsing_floor"],
  oberon: ["ice_storm", "dark_vortex"],
  king_rience: ["holy_fire", "collapsing_floor"],
  saxon_warlord: ["lava_pool", "holy_fire"],
};

// ---------------------------------------------------------------------------
// Mini-Boss Definitions (non-boss floor encounters)
// ---------------------------------------------------------------------------

export const MINI_BOSS_DEFS: Record<string, { name: string; baseId: string; hpMult: number; atkMult: number; defMult: number; xpMult: number; goldMult: number; abilities: string[] }> = {
  undead_champion: {
    name: "Undead Champion", baseId: "revenant_knight",
    hpMult: 2.0, atkMult: 1.5, defMult: 1.5, xpMult: 3, goldMult: 3,
    abilities: ["shield_bash", "rally"],
  },
  alpha_wolf: {
    name: "Alpha Dire Wolf", baseId: "dire_wolf",
    hpMult: 2.5, atkMult: 1.8, defMult: 1.3, xpMult: 3, goldMult: 2.5,
    abilities: ["lunge", "howl"],
  },
  fae_lord: {
    name: "Fae Lord", baseId: "fae_knight",
    hpMult: 2.0, atkMult: 1.6, defMult: 1.4, xpMult: 3, goldMult: 3,
    abilities: ["glamour", "confuse"],
  },
  fire_lord: {
    name: "Fire Lord", baseId: "fire_elemental",
    hpMult: 2.2, atkMult: 1.7, defMult: 1.5, xpMult: 3, goldMult: 3,
    abilities: ["fire_aura", "fire_breath"],
  },
};

// ---------------------------------------------------------------------------
// Infinite Scaling Mode Constants
// ---------------------------------------------------------------------------

export const INFINITE_MODE = {
  BASE_ENEMY_HP_SCALE: 1.15,        // multiplier per floor
  BASE_ENEMY_ATK_SCALE: 1.12,
  BASE_ENEMY_DEF_SCALE: 1.10,
  REST_FLOOR_INTERVAL: 5,            // rest floor every N floors
  NEW_ENEMY_TIER_INTERVAL: 10,       // new enemy types every N floors
  SCORE_BASE_PER_FLOOR: 100,
  SCORE_KILL_MULT: 10,
  SPEED_BONUS_THRESHOLD_S: 60,       // bonus for clearing floor in under this time
  SPEED_BONUS_MULT: 1.5,
  STYLE_BONUS_STREAK: 5,             // kill streak threshold for style bonus
  STYLE_BONUS_MULT: 1.25,
  LEADERBOARD_KEY: "grailquest_infinite_leaderboard",
};
