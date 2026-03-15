// ---------------------------------------------------------------------------
// Grail Ball Manager — Configuration & Data Definitions
// All teams, player generation, financial parameters, season structure,
// facility upgrades, training effects, and game rules.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum PlayerClass {
  GATEKEEPER = "Gatekeeper",
  KNIGHT = "Knight",
  ROGUE = "Rogue",
  MAGE = "Mage",
}

export enum PlayerTrait {
  BRAVE = "Brave",
  CUNNING = "Cunning",
  LOYAL = "Loyal",
  VOLATILE = "Volatile",
  LAZY = "Lazy",
  LEADER = "Leader",
  PRODIGY = "Prodigy",
  VETERAN = "Veteran",
  FRAGILE = "Fragile",
  IRONWILL = "Iron Will",
  GREEDY = "Greedy",
  HUMBLE = "Humble",
}

export enum Formation {
  F_2_2_2 = "2-2-2",
  F_1_3_2 = "1-3-2",
  F_2_1_3 = "2-1-3",
  F_3_2_1 = "3-2-1",
  F_1_2_3 = "1-2-3",
  F_2_3_1 = "2-3-1",
}

export enum TeamInstruction {
  ATTACKING = "Attacking",
  BALANCED = "Balanced",
  DEFENSIVE = "Defensive",
  COUNTER_ATTACK = "Counter-Attack",
  POSSESSION = "Possession",
}

export enum FacilityType {
  TRAINING_GROUND = "Training Ground",
  STADIUM = "Stadium",
  MEDICAL_BAY = "Medical Bay",
  YOUTH_ACADEMY = "Youth Academy",
  SCOUTING_NETWORK = "Scouting Network",
  ALCHEMY_LAB = "Alchemy Lab",
}

export enum Weather {
  CLEAR = "Clear Skies",
  RAIN = "Torrential Rain",
  FOG = "Mystic Fog",
  STORM = "Thunderstorm",
  SNOW = "Enchanted Snowfall",
  WIND = "Howling Gale",
}

export enum Injury {
  NONE = "None",
  MINOR_BRUISE = "Minor Bruise",
  TWISTED_ANKLE = "Twisted Ankle",
  BROKEN_ARM = "Broken Arm",
  CONCUSSION = "Concussion",
  TORN_LIGAMENT = "Torn Ligament",
  MAGICAL_BURN = "Magical Burn",
  ENCHANTMENT_FATIGUE = "Enchantment Fatigue",
}

export enum TrainingType {
  FITNESS = "Fitness",
  ATTACKING = "Attack Drills",
  DEFENDING = "Defensive Drills",
  SPEED = "Speed Training",
  SPELLWORK = "Spellwork",
  TEAMWORK = "Teamwork Exercises",
  REST = "Rest & Recovery",
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface PlayerStats {
  attack: number;     // 1-100 Scoring/offensive ability
  defense: number;    // 1-100 Blocking/tackling
  speed: number;      // 1-100 Movement and possession retention
  magic: number;      // 1-100 Spell effectiveness (primarily for Mages)
  stamina: number;    // 1-100 Endurance through the match
  morale: number;     // 1-100 Mental fortitude
}

export interface PlayerDef {
  id: string;
  firstName: string;
  lastName: string;
  class: PlayerClass;
  age: number;
  stats: PlayerStats;
  potential: number;  // 1-100 growth ceiling
  trait: PlayerTrait;
  wage: number;       // weekly wage in gold
  value: number;      // transfer market value
  contractYears: number;
  injury: Injury;
  injuryWeeks: number;
  form: number;       // -3 to +3
  goals: number;
  assists: number;
  matchesPlayed: number;
  rating: number;     // average match rating
  isYouth: boolean;
}

export interface TeamDef {
  id: string;
  name: string;
  shortName: string;
  color1: number;     // primary kit color
  color2: number;     // secondary kit color
  crestColor: number; // crest accent color
  motto: string;
  style: TeamInstruction;
  formation: Formation;
  reputation: number; // 1-100
  budget: number;     // starting gold
  wageBudget: number; // weekly wage cap
  stadiumCapacity: number;
  facilities: Record<FacilityType, number>; // level 0-5
  personality: string; // AI personality descriptor
}

export interface FacilityUpgrade {
  type: FacilityType;
  level: number;
  cost: number;
  weeksToComplete: number;
  description: string;
  effect: string;
}

export interface TrainingEffect {
  type: TrainingType;
  statBoosts: Partial<PlayerStats>;
  moraleEffect: number;
  staminaCost: number;
  injuryRisk: number; // 0..1
}

export interface SeasonConfig {
  totalWeeks: number;
  matchDaysPerWeek: number[];  // which weeks have league matches
  cupRounds: { week: number; name: string }[];
  transferWindowStart: number;
  transferWindowEnd: number;
  winterBreakStart: number;
  winterBreakEnd: number;
}

// ---------------------------------------------------------------------------
// Constants & Balance
// ---------------------------------------------------------------------------

export const GBM = {
  // Financial
  TICKET_PRICE_BASE: 5,
  SPONSORSHIP_BASE: 500,
  YOUTH_WAGE_MULT: 0.3,
  SELL_ON_FEE: 0.1,
  MIN_CONTRACT_YEARS: 1,
  MAX_CONTRACT_YEARS: 5,
  WAGE_NEGOTIATION_VARIANCE: 0.2,
  TRANSFER_NEGOTIATION_VARIANCE: 0.25,

  // Training
  TRAINING_STAT_GAIN_BASE: 0.3,
  AGE_GROWTH_PEAK: 24,
  AGE_DECLINE_START: 30,
  YOUTH_GROWTH_MULT: 1.5,
  POTENTIAL_DECAY_RATE: 0.02,

  // Match
  MATCH_HALF_MINUTES: 5,
  MATCH_EVENTS_PER_MINUTE: 3,
  STAMINA_DRAIN_PER_MINUTE: 4,
  INJURY_CHANCE_BASE: 0.01,
  MORALE_WIN_BOOST: 5,
  MORALE_LOSS_DROP: 4,
  MORALE_DRAW_CHANGE: 1,
  HOME_ADVANTAGE: 1.08,

  // Youth Academy
  YOUTH_SPAWN_CHANCE: 0.15, // per week
  YOUTH_MIN_AGE: 16,
  YOUTH_MAX_AGE: 19,

  // Simulation
  SIM_TICK_MS: 16,
  COMMENTARY_DELAY_MS: 1200,
  MATCH_SPEED_NORMAL: 1,
  MATCH_SPEED_FAST: 3,
  MATCH_SPEED_INSTANT: 100,

  // Season
  TEAMS_COUNT: 8,
  SQUAD_MIN: 15,
  SQUAD_MAX: 25,
  STARTING_11: 7,
  SUBS: 3,
};

// ---------------------------------------------------------------------------
// Arthurian Name Generator
// ---------------------------------------------------------------------------

const FIRST_NAMES_MALE = [
  "Arthur", "Lancelot", "Gawain", "Percival", "Galahad", "Tristan",
  "Bedivere", "Kay", "Gareth", "Agravain", "Mordred", "Bors",
  "Lamorak", "Ector", "Pellinore", "Erec", "Yvain", "Palamedes",
  "Dagonet", "Tor", "Caradoc", "Geraint", "Lionel", "Colgrevance",
  "Safir", "Brunor", "Gaheris", "Dinadan", "Meliant", "Hector",
  "Owain", "Cador", "Urien", "Lot", "Mark", "Meliodas",
  "Balin", "Balan", "Pelleas", "Accolon", "Lucan", "Claudas",
  "Leodegrance", "Uriens", "Bagdemagus", "Turquine", "Ironside",
  "Dodinas", "Sagramore", "Breunor", "Elyan", "Calogrenant",
  "Dragonet", "Melias", "Pertolope", "Priamus", "Segwarides",
  "Brandiles", "Epinogris", "Marhaus", "Meleagant", "Ozanna",
  "Peredur", "Fergus", "Culhwch", "Brochvael", "Cynric",
  "Aldric", "Edric", "Osric", "Cedric", "Godric", "Wulfric",
  "Alaric", "Baldric", "Roderic", "Theodric", "Sigmund", "Harald",
];

const LAST_NAMES = [
  "du Lac", "le Fort", "of Orkney", "the Brave", "Pendragon",
  "de Ganis", "Ironside", "Blackwood", "Ashford", "Cromwell",
  "Stonehelm", "Ravencrest", "Thornwall", "Brightshield", "Darkwater",
  "Flameguard", "Frostborn", "Goldheart", "Silvermane", "Oakenshield",
  "Lionheart", "Hawksworth", "Dragonsbane", "Greymantle", "Whitecliff",
  "Stormrider", "Sunforge", "Moonvale", "Windhollow", "Starfall",
  "Ironforge", "Steelhand", "Copperfield", "Bronzehelm", "Rustvale",
  "Mossbridge", "Willowdale", "Elderwood", "Fernhurst", "Heatherstone",
  "ap Rhys", "ap Gruffydd", "mac Cunobel", "of Caerleon", "of Tintagel",
  "de Camelot", "de Avalon", "de Cornwall", "de Wessex", "de Lothian",
  "the Unbroken", "the Swift", "the Cunning", "the Bold", "the Wise",
];

let _nameIdCounter = 0;

export function generatePlayerName(): { firstName: string; lastName: string } {
  const firstName = FIRST_NAMES_MALE[Math.floor(Math.random() * FIRST_NAMES_MALE.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return { firstName, lastName };
}

export function generatePlayerId(): string {
  return `p_${++_nameIdCounter}_${Math.random().toString(36).substring(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Player Generation
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function randRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Stat ranges by class and quality tier (1=low, 3=high) */
const CLASS_STAT_RANGES: Record<PlayerClass, { base: PlayerStats; variance: number }> = {
  [PlayerClass.GATEKEEPER]: {
    base: { attack: 25, defense: 70, speed: 40, magic: 30, stamina: 65, morale: 60 },
    variance: 15,
  },
  [PlayerClass.KNIGHT]: {
    base: { attack: 45, defense: 65, speed: 45, magic: 25, stamina: 60, morale: 60 },
    variance: 15,
  },
  [PlayerClass.ROGUE]: {
    base: { attack: 55, defense: 40, speed: 70, magic: 35, stamina: 55, morale: 55 },
    variance: 15,
  },
  [PlayerClass.MAGE]: {
    base: { attack: 65, defense: 30, speed: 50, magic: 70, stamina: 45, morale: 55 },
    variance: 15,
  },
};

export function generatePlayer(
  cls: PlayerClass,
  qualityTier: number, // 0.5 = poor, 1 = average, 1.5 = good, 2 = elite
  ageOverride?: number,
  isYouth = false,
): PlayerDef {
  const { firstName, lastName } = generatePlayerName();
  const base = CLASS_STAT_RANGES[cls];
  const age = ageOverride ?? (isYouth ? randRange(16, 19) : randRange(20, 34));

  const ageMult = age < 22 ? 0.85 : age < 28 ? 1.0 : age < 32 ? 0.95 : 0.85;
  const v = base.variance;

  const stats: PlayerStats = {
    attack:  clamp(Math.round((base.base.attack  + randRange(-v, v)) * qualityTier * ageMult), 1, 99),
    defense: clamp(Math.round((base.base.defense + randRange(-v, v)) * qualityTier * ageMult), 1, 99),
    speed:   clamp(Math.round((base.base.speed   + randRange(-v, v)) * qualityTier * ageMult), 1, 99),
    magic:   clamp(Math.round((base.base.magic   + randRange(-v, v)) * qualityTier * ageMult), 1, 99),
    stamina: clamp(Math.round((base.base.stamina + randRange(-v, v)) * qualityTier * ageMult), 1, 99),
    morale:  clamp(randRange(45, 75), 1, 99),
  };

  const potential = isYouth
    ? clamp(Math.round(70 + Math.random() * 30), 1, 99)
    : clamp(Math.round(Math.max(...Object.values(stats)) + randRange(-5, 15)), 1, 99);

  const traits = Object.values(PlayerTrait);
  const trait = traits[Math.floor(Math.random() * traits.length)];

  const overallRating = Math.round(
    (stats.attack + stats.defense + stats.speed + stats.magic + stats.stamina) / 5
  );
  const value = Math.round(overallRating * overallRating * qualityTier * (isYouth ? 0.5 : 1) * 10);
  const wage = Math.round(value * 0.01 + randRange(5, 20));

  return {
    id: generatePlayerId(),
    firstName,
    lastName,
    class: cls,
    age,
    stats,
    potential,
    trait,
    wage,
    value,
    contractYears: isYouth ? randRange(2, 4) : randRange(1, 4),
    injury: Injury.NONE,
    injuryWeeks: 0,
    form: 0,
    goals: 0,
    assists: 0,
    matchesPlayed: 0,
    rating: 6.0,
    isYouth,
  };
}

/** Generate a full squad for a team */
export function generateSquad(reputation: number, size = 18): PlayerDef[] {
  const quality = reputation / 65; // rough scaling
  const squad: PlayerDef[] = [];

  // Required composition: 2 GK, 4 Knight, 5 Rogue, 5 Mage, rest random
  const composition: PlayerClass[] = [
    PlayerClass.GATEKEEPER, PlayerClass.GATEKEEPER,
    PlayerClass.KNIGHT, PlayerClass.KNIGHT, PlayerClass.KNIGHT, PlayerClass.KNIGHT,
    PlayerClass.ROGUE, PlayerClass.ROGUE, PlayerClass.ROGUE, PlayerClass.ROGUE, PlayerClass.ROGUE,
    PlayerClass.MAGE, PlayerClass.MAGE, PlayerClass.MAGE, PlayerClass.MAGE, PlayerClass.MAGE,
  ];

  // Fill remaining spots randomly
  const allClasses = [PlayerClass.KNIGHT, PlayerClass.ROGUE, PlayerClass.MAGE];
  while (composition.length < size) {
    composition.push(allClasses[Math.floor(Math.random() * allClasses.length)]);
  }

  for (const cls of composition) {
    const tierVariance = randFloat(-0.15, 0.15);
    const isYouth = Math.random() < 0.15;
    squad.push(generatePlayer(cls, quality + tierVariance, undefined, isYouth));
  }

  return squad;
}

// ---------------------------------------------------------------------------
// Team Definitions
// ---------------------------------------------------------------------------

function defaultFacilities(levels: Partial<Record<FacilityType, number>> = {}): Record<FacilityType, number> {
  return {
    [FacilityType.TRAINING_GROUND]: levels[FacilityType.TRAINING_GROUND] ?? 1,
    [FacilityType.STADIUM]: levels[FacilityType.STADIUM] ?? 1,
    [FacilityType.MEDICAL_BAY]: levels[FacilityType.MEDICAL_BAY] ?? 1,
    [FacilityType.YOUTH_ACADEMY]: levels[FacilityType.YOUTH_ACADEMY] ?? 0,
    [FacilityType.SCOUTING_NETWORK]: levels[FacilityType.SCOUTING_NETWORK] ?? 0,
    [FacilityType.ALCHEMY_LAB]: levels[FacilityType.ALCHEMY_LAB] ?? 0,
  };
}

export const TEAM_DEFS: TeamDef[] = [
  {
    id: "camelot_lions",
    name: "Camelot Lions",
    shortName: "CAM",
    color1: 0xdaa520,
    color2: 0x8b0000,
    crestColor: 0xffd700,
    motto: "By Honour and Crown",
    style: TeamInstruction.BALANCED,
    formation: Formation.F_2_2_2,
    reputation: 85,
    budget: 15000,
    wageBudget: 600,
    stadiumCapacity: 8000,
    facilities: defaultFacilities({ [FacilityType.TRAINING_GROUND]: 3, [FacilityType.STADIUM]: 3, [FacilityType.YOUTH_ACADEMY]: 2 }),
    personality: "prestigious",
  },
  {
    id: "avalon_mystics",
    name: "Avalon Mystics",
    shortName: "AVA",
    color1: 0x6a0dad,
    color2: 0xc0c0c0,
    crestColor: 0x9370db,
    motto: "Through Mist and Magic",
    style: TeamInstruction.POSSESSION,
    formation: Formation.F_1_2_3,
    reputation: 80,
    budget: 12000,
    wageBudget: 550,
    stadiumCapacity: 6000,
    facilities: defaultFacilities({ [FacilityType.TRAINING_GROUND]: 2, [FacilityType.ALCHEMY_LAB]: 3 }),
    personality: "magical",
  },
  {
    id: "saxon_wolves",
    name: "Saxon Wolves",
    shortName: "SAX",
    color1: 0x333333,
    color2: 0xcc0000,
    crestColor: 0x888888,
    motto: "Fear the Pack",
    style: TeamInstruction.ATTACKING,
    formation: Formation.F_1_3_2,
    reputation: 75,
    budget: 10000,
    wageBudget: 500,
    stadiumCapacity: 7000,
    facilities: defaultFacilities({ [FacilityType.TRAINING_GROUND]: 2, [FacilityType.STADIUM]: 2 }),
    personality: "aggressive",
  },
  {
    id: "orkney_ravens",
    name: "Orkney Ravens",
    shortName: "ORK",
    color1: 0x1a1a2e,
    color2: 0x4a4a6e,
    crestColor: 0x2e2e5e,
    motto: "Vigilance in Darkness",
    style: TeamInstruction.DEFENSIVE,
    formation: Formation.F_3_2_1,
    reputation: 70,
    budget: 8000,
    wageBudget: 450,
    stadiumCapacity: 5500,
    facilities: defaultFacilities({ [FacilityType.MEDICAL_BAY]: 3, [FacilityType.SCOUTING_NETWORK]: 2 }),
    personality: "defensive",
  },
  {
    id: "cornwall_griffins",
    name: "Cornwall Griffins",
    shortName: "COR",
    color1: 0x228b22,
    color2: 0xffd700,
    crestColor: 0x32cd32,
    motto: "Rise on Young Wings",
    style: TeamInstruction.BALANCED,
    formation: Formation.F_2_2_2,
    reputation: 65,
    budget: 7000,
    wageBudget: 400,
    stadiumCapacity: 5000,
    facilities: defaultFacilities({ [FacilityType.YOUTH_ACADEMY]: 3, [FacilityType.TRAINING_GROUND]: 2 }),
    personality: "youth-focused",
  },
  {
    id: "northumbria_bears",
    name: "Northumbria Bears",
    shortName: "NOR",
    color1: 0x8b4513,
    color2: 0xf5deb3,
    crestColor: 0xcd853f,
    motto: "Strength Unyielding",
    style: TeamInstruction.DEFENSIVE,
    formation: Formation.F_3_2_1,
    reputation: 68,
    budget: 7500,
    wageBudget: 420,
    stadiumCapacity: 6500,
    facilities: defaultFacilities({ [FacilityType.TRAINING_GROUND]: 2, [FacilityType.MEDICAL_BAY]: 2 }),
    personality: "physical",
  },
  {
    id: "wessex_eagles",
    name: "Wessex Eagles",
    shortName: "WES",
    color1: 0x4169e1,
    color2: 0xffffff,
    crestColor: 0x6495ed,
    motto: "Swift as the Wind",
    style: TeamInstruction.COUNTER_ATTACK,
    formation: Formation.F_2_1_3,
    reputation: 72,
    budget: 9000,
    wageBudget: 470,
    stadiumCapacity: 5500,
    facilities: defaultFacilities({ [FacilityType.TRAINING_GROUND]: 2, [FacilityType.SCOUTING_NETWORK]: 2 }),
    personality: "counter-attack",
  },
  {
    id: "lothian_stags",
    name: "Lothian Stags",
    shortName: "LOT",
    color1: 0x006400,
    color2: 0x8b6914,
    crestColor: 0x2e8b57,
    motto: "Grace and Patience",
    style: TeamInstruction.POSSESSION,
    formation: Formation.F_2_3_1,
    reputation: 74,
    budget: 9500,
    wageBudget: 480,
    stadiumCapacity: 5800,
    facilities: defaultFacilities({ [FacilityType.TRAINING_GROUND]: 3, [FacilityType.ALCHEMY_LAB]: 1 }),
    personality: "tactical",
  },
];

// ---------------------------------------------------------------------------
// Facility Upgrades
// ---------------------------------------------------------------------------

export const FACILITY_UPGRADES: FacilityUpgrade[] = [
  // Training Ground
  { type: FacilityType.TRAINING_GROUND, level: 1, cost: 500,   weeksToComplete: 2, description: "Basic Training Pitch",        effect: "+5% training effectiveness" },
  { type: FacilityType.TRAINING_GROUND, level: 2, cost: 1500,  weeksToComplete: 3, description: "Enchanted Training Grounds",   effect: "+15% training effectiveness" },
  { type: FacilityType.TRAINING_GROUND, level: 3, cost: 3500,  weeksToComplete: 4, description: "Royal Tournament Grounds",     effect: "+25% training, reduced injuries" },
  { type: FacilityType.TRAINING_GROUND, level: 4, cost: 7000,  weeksToComplete: 6, description: "Legendary Arena Complex",      effect: "+40% training, morale boost" },
  { type: FacilityType.TRAINING_GROUND, level: 5, cost: 12000, weeksToComplete: 8, description: "Camelot-Grade Facilities",     effect: "+60% training, all stats benefit" },

  // Stadium
  { type: FacilityType.STADIUM, level: 1, cost: 800,   weeksToComplete: 3, description: "Wooden Stands (2000 seats)",       effect: "+2000 capacity" },
  { type: FacilityType.STADIUM, level: 2, cost: 2500,  weeksToComplete: 4, description: "Stone Grandstands (5000 seats)",    effect: "+3000 capacity" },
  { type: FacilityType.STADIUM, level: 3, cost: 5000,  weeksToComplete: 5, description: "Great Tournament Arena (8000)",     effect: "+3000 capacity, +ticket revenue" },
  { type: FacilityType.STADIUM, level: 4, cost: 10000, weeksToComplete: 7, description: "Royal Colosseum (12000)",           effect: "+4000 capacity, sponsorship bonus" },
  { type: FacilityType.STADIUM, level: 5, cost: 20000, weeksToComplete: 10, description: "Legendary Camelot Stadium (16000)", effect: "+4000 capacity, prestige bonus" },

  // Medical Bay
  { type: FacilityType.MEDICAL_BAY, level: 1, cost: 400,  weeksToComplete: 2, description: "Herb Garden",              effect: "-10% injury duration" },
  { type: FacilityType.MEDICAL_BAY, level: 2, cost: 1200, weeksToComplete: 3, description: "Healer's Ward",            effect: "-25% injury duration" },
  { type: FacilityType.MEDICAL_BAY, level: 3, cost: 3000, weeksToComplete: 4, description: "Enchanted Infirmary",      effect: "-40% injury duration, prevention" },
  { type: FacilityType.MEDICAL_BAY, level: 4, cost: 6000, weeksToComplete: 5, description: "Alchemist's Hospital",     effect: "-55% injury duration" },
  { type: FacilityType.MEDICAL_BAY, level: 5, cost: 10000, weeksToComplete: 7, description: "Grail-Blessed Sanctuary", effect: "-70% injury, magic recovery" },

  // Youth Academy
  { type: FacilityType.YOUTH_ACADEMY, level: 1, cost: 600,  weeksToComplete: 3, description: "Squire's School",          effect: "Basic youth generation" },
  { type: FacilityType.YOUTH_ACADEMY, level: 2, cost: 2000, weeksToComplete: 4, description: "Knight's Preparatory",     effect: "Better youth quality" },
  { type: FacilityType.YOUTH_ACADEMY, level: 3, cost: 4500, weeksToComplete: 5, description: "Royal Academy",            effect: "Excellent youth + traits" },
  { type: FacilityType.YOUTH_ACADEMY, level: 4, cost: 8000, weeksToComplete: 7, description: "Merlin's Protégé Program", effect: "Elite youth, magic talents" },
  { type: FacilityType.YOUTH_ACADEMY, level: 5, cost: 15000, weeksToComplete: 9, description: "Legendary Round Table School", effect: "World-class youth pipeline" },

  // Scouting Network
  { type: FacilityType.SCOUTING_NETWORK, level: 1, cost: 300,  weeksToComplete: 2, description: "Local Scouts",           effect: "See nearby transfer targets" },
  { type: FacilityType.SCOUTING_NETWORK, level: 2, cost: 1000, weeksToComplete: 3, description: "Regional Network",       effect: "More transfer market visibility" },
  { type: FacilityType.SCOUTING_NETWORK, level: 3, cost: 2500, weeksToComplete: 4, description: "Kingdom-Wide Scouts",    effect: "Full market access, stat reveal" },
  { type: FacilityType.SCOUTING_NETWORK, level: 4, cost: 5000, weeksToComplete: 5, description: "Raven Messengers",       effect: "Early intel, negotiate better" },
  { type: FacilityType.SCOUTING_NETWORK, level: 5, cost: 9000, weeksToComplete: 7, description: "Crystal Ball Network",   effect: "Perfect information on all players" },

  // Alchemy Lab
  { type: FacilityType.ALCHEMY_LAB, level: 1, cost: 500,  weeksToComplete: 2, description: "Potion Brewing Station",    effect: "Basic stamina potions" },
  { type: FacilityType.ALCHEMY_LAB, level: 2, cost: 1500, weeksToComplete: 3, description: "Enchantment Workshop",      effect: "Stat-boost elixirs" },
  { type: FacilityType.ALCHEMY_LAB, level: 3, cost: 3500, weeksToComplete: 4, description: "Arcane Laboratory",         effect: "Match-day buffs available" },
  { type: FacilityType.ALCHEMY_LAB, level: 4, cost: 7000, weeksToComplete: 6, description: "Grand Alchemist's Tower",   effect: "Powerful match enchantments" },
  { type: FacilityType.ALCHEMY_LAB, level: 5, cost: 12000, weeksToComplete: 8, description: "Philosopher's Sanctum",    effect: "Legendary potions & enhancements" },
];

// ---------------------------------------------------------------------------
// Training Effects
// ---------------------------------------------------------------------------

export const TRAINING_EFFECTS: Record<TrainingType, TrainingEffect> = {
  [TrainingType.FITNESS]: {
    type: TrainingType.FITNESS,
    statBoosts: { stamina: 1.0, speed: 0.3 },
    moraleEffect: -1,
    staminaCost: 0,
    injuryRisk: 0.03,
  },
  [TrainingType.ATTACKING]: {
    type: TrainingType.ATTACKING,
    statBoosts: { attack: 1.0, magic: 0.2 },
    moraleEffect: 0,
    staminaCost: 0,
    injuryRisk: 0.04,
  },
  [TrainingType.DEFENDING]: {
    type: TrainingType.DEFENDING,
    statBoosts: { defense: 1.0, stamina: 0.2 },
    moraleEffect: 0,
    staminaCost: 0,
    injuryRisk: 0.03,
  },
  [TrainingType.SPEED]: {
    type: TrainingType.SPEED,
    statBoosts: { speed: 1.0, attack: 0.2 },
    moraleEffect: -1,
    staminaCost: 0,
    injuryRisk: 0.05,
  },
  [TrainingType.SPELLWORK]: {
    type: TrainingType.SPELLWORK,
    statBoosts: { magic: 1.2, attack: 0.3 },
    moraleEffect: 1,
    staminaCost: 0,
    injuryRisk: 0.02,
  },
  [TrainingType.TEAMWORK]: {
    type: TrainingType.TEAMWORK,
    statBoosts: { morale: 2.0 },
    moraleEffect: 3,
    staminaCost: 0,
    injuryRisk: 0.01,
  },
  [TrainingType.REST]: {
    type: TrainingType.REST,
    statBoosts: {},
    moraleEffect: 2,
    staminaCost: -20,
    injuryRisk: 0,
  },
};

// ---------------------------------------------------------------------------
// Season Structure
// ---------------------------------------------------------------------------

/** Generate a full season schedule — 14 league match weeks (each team plays 14 = 2*7 round-robin) + cup */
export function generateSeasonConfig(): SeasonConfig {
  // League: weeks 1-28 (every other week roughly), Cup: 4 rounds
  const matchWeeks: number[] = [];
  for (let i = 1; i <= 28; i += 2) matchWeeks.push(i);
  // Second half
  for (let i = 2; i <= 28; i += 2) matchWeeks.push(i);

  return {
    totalWeeks: 30,
    matchDaysPerWeek: matchWeeks,
    cupRounds: [
      { week: 5, name: "Camelot Cup — Quarter-Final" },
      { week: 12, name: "Camelot Cup — Semi-Final" },
      { week: 20, name: "Camelot Cup — Semi-Final 2nd Leg" },
      { week: 28, name: "Camelot Cup — Grand Final" },
    ],
    transferWindowStart: 1,
    transferWindowEnd: 8,
    winterBreakStart: 14,
    winterBreakEnd: 16,
  };
}

// ---------------------------------------------------------------------------
// League Fixture Generator (Round-Robin)
// ---------------------------------------------------------------------------

export interface Fixture {
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  played: boolean;
  homeGoals: number;
  awayGoals: number;
  events: string[];
}

/** Generate round-robin fixtures for n teams (n must be even) */
export function generateFixtures(teamIds: string[]): Fixture[] {
  const n = teamIds.length;
  const fixtures: Fixture[] = [];
  const teams = [...teamIds];

  // Standard round-robin: n-1 rounds, then reverse for return legs
  const rounds = n - 1;
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < n / 2; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      // First leg
      fixtures.push({
        week: round + 1,
        homeTeamId: home,
        awayTeamId: away,
        played: false,
        homeGoals: 0,
        awayGoals: 0,
        events: [],
      });
      // Return leg
      fixtures.push({
        week: round + 1 + rounds,
        homeTeamId: away,
        awayTeamId: home,
        played: false,
        homeGoals: 0,
        awayGoals: 0,
        events: [],
      });
    }
    // Rotate teams (keep first team fixed)
    teams.splice(1, 0, teams.pop()!);
  }

  return fixtures;
}

// ---------------------------------------------------------------------------
// Cup bracket
// ---------------------------------------------------------------------------

export interface CupMatch {
  round: number;       // 0 = QF, 1 = SF, 2 = Final
  roundName: string;
  team1Id: string;
  team2Id: string;
  team1Goals: number;
  team2Goals: number;
  played: boolean;
  winnerId: string;
}

export function generateCupBracket(teamIds: string[]): CupMatch[] {
  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
  const matches: CupMatch[] = [];

  // Quarter-Finals (4 matches, 8 teams)
  for (let i = 0; i < 4; i++) {
    matches.push({
      round: 0,
      roundName: "Quarter-Final",
      team1Id: shuffled[i * 2],
      team2Id: shuffled[i * 2 + 1],
      team1Goals: 0,
      team2Goals: 0,
      played: false,
      winnerId: "",
    });
  }

  // Semi-Finals (2 matches, filled after QF)
  for (let i = 0; i < 2; i++) {
    matches.push({
      round: 1,
      roundName: "Semi-Final",
      team1Id: "",
      team2Id: "",
      team1Goals: 0,
      team2Goals: 0,
      played: false,
      winnerId: "",
    });
  }

  // Final
  matches.push({
    round: 2,
    roundName: "Grand Final",
    team1Id: "",
    team2Id: "",
    team1Goals: 0,
    team2Goals: 0,
    played: false,
    winnerId: "",
  });

  return matches;
}

// ---------------------------------------------------------------------------
// Weather Generator
// ---------------------------------------------------------------------------

const WEATHER_WEIGHTS: [Weather, number][] = [
  [Weather.CLEAR, 40],
  [Weather.RAIN, 20],
  [Weather.FOG, 10],
  [Weather.STORM, 8],
  [Weather.SNOW, 7],
  [Weather.WIND, 15],
];

export function randomWeather(): Weather {
  const total = WEATHER_WEIGHTS.reduce((s, w) => s + w[1], 0);
  let r = Math.random() * total;
  for (const [w, weight] of WEATHER_WEIGHTS) {
    r -= weight;
    if (r <= 0) return w;
  }
  return Weather.CLEAR;
}

// ---------------------------------------------------------------------------
// Weather Effects on Match
// ---------------------------------------------------------------------------

export interface WeatherModifiers {
  speedMult: number;
  magicMult: number;
  injuryMult: number;
  possessionVariance: number;
  description: string;
}

export function getWeatherModifiers(w: Weather): WeatherModifiers {
  switch (w) {
    case Weather.CLEAR:  return { speedMult: 1.0, magicMult: 1.0, injuryMult: 1.0, possessionVariance: 0, description: "Perfect conditions for Grail Ball." };
    case Weather.RAIN:   return { speedMult: 0.9, magicMult: 0.85, injuryMult: 1.3, possessionVariance: 0.1, description: "Rain lashes the field — footing treacherous, spells fizzle." };
    case Weather.FOG:    return { speedMult: 0.95, magicMult: 1.1, injuryMult: 1.0, possessionVariance: 0.15, description: "Thick mist rolls across the pitch — advantage to the cunning." };
    case Weather.STORM:  return { speedMult: 0.85, magicMult: 0.7, injuryMult: 1.5, possessionVariance: 0.2, description: "Thunder and lightning! Magic unstable, danger everywhere." };
    case Weather.SNOW:   return { speedMult: 0.8, magicMult: 1.0, injuryMult: 1.2, possessionVariance: 0.1, description: "Enchanted snow blankets the field — slow but magical." };
    case Weather.WIND:   return { speedMult: 1.05, magicMult: 0.9, injuryMult: 1.1, possessionVariance: 0.15, description: "Howling gale disrupts passes and spell trajectories." };
  }
}

// ---------------------------------------------------------------------------
// Rules Text
// ---------------------------------------------------------------------------

export const RULES_TEXT = `
╔══════════════════════════════════════════════════════════════╗
║                    GRAIL BALL — THE RULES                   ║
╚══════════════════════════════════════════════════════════════╝

THE SPORT:
  Grail Ball is the noble sport of Camelot, played between two
  teams of 7 on an enchanted tournament field. The objective is
  to hurl the Grail Orb — a mystical sphere of golden light —
  through the opponent's Gate to score.

PLAYER CLASSES:
  • GATEKEEPER — Guards the mystical Gate. High defense and
    reflexes. The last line of defense.
  • KNIGHT — Defensive players. Tackle opponents, form shield
    walls, and protect the Gatekeeper.
  • ROGUE — Midfield specialists. Fast, agile, skilled at
    stealing the Orb and threading passes.
  • MAGE — Attackers who channel arcane energies. Cast assist
    spells, enchant the Orb for powerful shots.

MATCH STRUCTURE:
  • 2 halves of 5 minutes each
  • 3 substitutions allowed per half
  • Goals scored through the Gate earn 1 point
  • Enchanted goals (Mage-assisted) earn 1 point + morale bonus

MANAGEMENT:
  As manager, you control all aspects of your club:
  • SQUAD — Recruit, train, and develop your players
  • TACTICS — Set formations, roles, and team instructions
  • TRANSFERS — Buy and sell players in the transfer market
  • FACILITIES — Upgrade your training grounds, stadium, and more
  • YOUTH — Develop the next generation of Grail Ball stars

KEYBOARD SHORTCUTS:
  1-9   Navigate screens (shown in header)
  Tab   Cycle sub-menus
  Enter Confirm selections
  Esc   Back / Cancel
  Space Advance match / Continue
  +/-   Adjust match speed

SEASON:
  Play through a full season of league and cup matches.
  Win the league, lift the Camelot Cup, and build a dynasty!

May the Grail light your path to glory!
`;

// ---------------------------------------------------------------------------
// News / Commentary flavor text pools
// ---------------------------------------------------------------------------

export const NEWS_HEADLINES = [
  "The Round Table convenes for the new season!",
  "Transfer window opens — gold flows freely!",
  "Youth prospects impress at the academy tournament.",
  "Stadium renovations progressing on schedule.",
  "Merlin spotted in the stands — magical boost expected!",
  "Injury crisis hits multiple clubs ahead of matchday.",
  "The Camelot Cup draw sends shockwaves through the realm!",
  "Training ground incident — player sustains minor bruise.",
  "Scouting report reveals hidden gem in Cornwall.",
  "Fan morale soaring after recent victory streak!",
  "Dark omens — will the curse of Mordred strike again?",
  "Local tavern reports record attendance on match nights.",
  "The enchanted pitch has been freshly re-warded.",
  "A new spell technique discovered in Avalon's archives!",
  "Northumbria's bears break the physical fitness record.",
  "Transfer deadline day — last-minute deals expected!",
];

export const MATCH_COMMENTARY_TEMPLATES = {
  kickoff: [
    "The Grail Orb glows brightly as the match begins!",
    "The enchanted horn sounds — we are underway!",
    "Both teams take the field under {weather} — let the contest begin!",
    "The crowd roars as the Orb is placed at center field!",
  ],
  goal: [
    "{scorer} sends the Orb blazing through the Gate! GOAL!",
    "A magnificent strike from {scorer}! The net shimmers with golden light!",
    "{scorer} beats the Gatekeeper with a thunderous shot!",
    "GOAL! {scorer} finds the corner — the crowd erupts!",
    "{scorer} volleys it home! What a strike!",
    "The Orb sails past the keeper — {scorer} celebrates!",
    "{scorer} with an enchanted shot that curves into the Gate!",
  ],
  save: [
    "{keeper} makes a stunning save! The Gate remains sealed!",
    "What a stop by {keeper}! Reflexes of a cat!",
    "{keeper} dives low to deny the shot!",
    "{keeper} conjures a magical barrier — brilliant save!",
    "The Gatekeeper {keeper} stands firm! Denied!",
  ],
  tackle: [
    "{player} slides in with a crunching tackle!",
    "{player} dispossesses the attacker with a warrior's strength!",
    "A thundering challenge from {player}!",
    "{player} reads the play and intercepts cleanly.",
  ],
  foul: [
    "{player} goes in too hard — the marshal blows for a foul!",
    "A reckless challenge by {player} — free kick awarded.",
    "{player} clips the opponent — the crowd jeers!",
  ],
  injury: [
    "Oh no! {player} goes down clutching their {bodypart}!",
    "{player} is being attended to by the healers...",
    "It looks bad for {player} — they're being carried off on a stretcher.",
  ],
  substitution: [
    "{playerOut} makes way for {playerIn}. Fresh legs needed!",
    "Tactical change: {playerIn} replaces {playerOut}.",
    "The manager sends on {playerIn} — {playerOut} trudges off.",
  ],
  halftime: [
    "The horn sounds for half-time. {home} {homeGoals} - {awayGoals} {away}.",
    "We reach the interval. The teams head to their pavilions.",
  ],
  fulltime: [
    "FULL TIME! {home} {homeGoals} - {awayGoals} {away}!",
    "The final horn sounds! What a contest!",
    "That's it! The match is over!",
  ],
  possession: [
    "{team} dominating possession in the midfield.",
    "{team} knocking it around with confidence.",
    "Good ball movement from {team} — patient and controlled.",
  ],
  chance: [
    "{player} finds space and shoots — just wide!",
    "A golden opportunity for {player}... but it drifts over!",
    "{player} unleashes a spell-charged shot — off the post!",
    "Close! {player} forces a diving save!",
    "{player} cuts inside and fires — blocked!",
  ],
  spell: [
    "{player} channels arcane energy — the Orb glows with power!",
    "A shimmering enchantment from {player} boosts the attack!",
    "{player} casts a shield spell — the defense holds firm!",
    "Mystical energy surges through {player}'s strike!",
  ],
  redCard: [
    "{player} receives the Black Mark — sent off! Disgraceful!",
    "The marshal brandishes the Black Mark! {player} must leave the field!",
  ],
  penalty: [
    "PENALTY! The marshal points to the Grail Circle!",
    "A foul in the enchanted zone — it's a penalty!",
  ],
};

export const BODY_PARTS = ["ankle", "knee", "shoulder", "wrist", "ribs", "back"];
