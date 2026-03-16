// Balance and world configuration for Medieval GTA mode

export const GTAConfig = {
  // Movement
  WALK_SPEED: 120,
  RUN_SPEED: 200,
  HORSE_SPEED: 350,
  ROLL_SPEED: 300,
  ROLL_DURATION: 0.3,

  // Combat
  FIST_DAMAGE: 5,
  SWORD_DAMAGE: 20,
  BOW_DAMAGE: 15,
  GUARD_DAMAGE: 15,
  KNIGHT_DAMAGE: 25,
  CRIMINAL_DAMAGE: 10,
  ATTACK_COOLDOWN_FIST: 0.4,
  ATTACK_COOLDOWN_SWORD: 0.6,
  ATTACK_COOLDOWN_BOW: 1.0,
  ATTACK_RANGE_MELEE: 40,
  ATTACK_RANGE_BOW: 200,
  BLOCK_REDUCTION: 0.7,

  // Player
  PLAYER_MAX_HP: 100,
  STAMINA_DRAIN: 25,
  STAMINA_REGEN: 15,
  INVINCIBLE_DURATION: 0.5,

  // NPCs
  GUARD_HP: 80,
  KNIGHT_HP: 120,
  CIVILIAN_HP: 30,
  CRIMINAL_HP: 50,
  ARCHER_HP: 60,
  GUARD_ALERT_RADIUS: 200,
  GUARD_AGGRO_RADIUS: 150,
  GUARD_CHASE_SPEED: 140,
  KNIGHT_CHASE_SPEED: 160,
  NPC_WANDER_SPEED: 40,
  NPC_WANDER_RADIUS: 150,

  // Wanted
  WANTED_DECAY_TIME: 30,
  WANTED_PUNCH_CIVILIAN: 1,
  WANTED_ATTACK_GUARD: 2,
  WANTED_KILL_GUARD: 3,
  WANTED_ATTACK_KNIGHT: 4,
  WANTED_MAX: 5,

  // Horse
  HORSE_HP: 80,
  HORSE_STEAL_RANGE: 50,
  HORSE_DISMOUNT_RANGE: 30,

  // World
  WORLD_WIDTH: 4000,
  WORLD_HEIGHT: 3000,
  CITY_X: 800,
  CITY_Y: 500,
  CITY_W: 2400,
  CITY_H: 2000,
  WALL_THICKNESS: 40,
  TILE_SIZE: 32,

  // Camera
  CAMERA_LERP: 0.08,
  CAMERA_ZOOM: 2.2,

  // Day/Night
  DAY_CYCLE_SPEED: 0.003,

  // Interaction
  INTERACT_RANGE: 50,
  DIALOG_COOLDOWN: 0.5,

  // Item pickup
  PICKUP_RANGE: 30,
  HEALTH_POTION_HEAL: 30,

  // Notification
  NOTIFICATION_DURATION: 3.0,

  // Guard chase break-off distance
  GUARD_CHASE_RADIUS: 600,

  // Wanted alert scaling
  WANTED_ALERT_RADIUS_PER_STAR: 80,

  // NPC flee speed
  NPC_FLEE_SPEED: 140,

  // NPC attack range (melee)
  NPC_ATTACK_RANGE: 50,

  // City layout key positions
  PLAYER_SPAWN: { x: 2000, y: 1500 },
  CASTLE_BOUNDS: { x: 850, y: 550, w: 450, h: 500 },
  MARKET_CENTER: { x: 1800, y: 1450 },
  TAVERN_POS: { x: 2400, y: 1350 },
  STABLE_POS: { x: 2825, y: 2000 },
  CHURCH_POS: { x: 2225, y: 725 },
  BARRACKS_POS: { x: 1650, y: 725 },
  BLACKSMITH_POS: { x: 1025, y: 1350 },
  PRISON_POS: { x: 1050, y: 1750 },
  GATE_N: { x: 2000, y: 500 },
  GATE_S: { x: 2000, y: 2500 },
  GATE_E: { x: 3200, y: 1500 },
  GATE_W: { x: 800, y: 1500 },

  // ── XP & Leveling ───────────────────────────────────────────────────────
  XP_PER_KILL: 25,
  XP_PER_QUEST: 100,
  XP_PER_LEVEL_BASE: 100,
  XP_LEVEL_SCALE: 1.4,        // XP required = base * scale^level
  MAX_LEVEL: 30,
  SKILL_POINTS_PER_LEVEL: 1,
};

// ─── Faction Definitions ──────────────────────────────────────────────────────

export type GTAFactionId =
  | 'crown'
  | 'thieves_guild'
  | 'merchants'
  | 'church'
  | 'peasants'
  | 'nobles';

export interface GTAFactionDef {
  id: GTAFactionId;
  name: string;
  description: string;
  /** NPC types that belong to this faction */
  memberTypes: string[];
  /** Reputation thresholds for tier labels */
  tiers: { min: number; label: string }[];
}

export const FACTION_DEFINITIONS: Record<GTAFactionId, GTAFactionDef> = {
  crown: {
    id: 'crown',
    name: 'The Crown',
    description: 'The royal guard, army, and servants of the King.',
    memberTypes: ['guard', 'knight', 'archer_guard', 'army_soldier'],
    tiers: [
      { min: -100, label: 'Enemy of the Crown' },
      { min: -50,  label: 'Outlaw' },
      { min: -20,  label: 'Suspect' },
      { min: 0,    label: 'Citizen' },
      { min: 20,   label: 'Ally of the Crown' },
      { min: 50,   label: 'Champion' },
      { min: 80,   label: 'Knight of the Realm' },
    ],
  },
  thieves_guild: {
    id: 'thieves_guild',
    name: 'Thieves Guild',
    description: 'The criminal underworld operating in the shadows of Camelot.',
    memberTypes: ['criminal', 'bandit'],
    tiers: [
      { min: -100, label: 'Snitch' },
      { min: -50,  label: 'Unwelcome' },
      { min: -20,  label: 'Outsider' },
      { min: 0,    label: 'Known Face' },
      { min: 20,   label: 'Associate' },
      { min: 50,   label: 'Made Man' },
      { min: 80,   label: 'Guildmaster' },
    ],
  },
  merchants: {
    id: 'merchants',
    name: 'Merchants Guild',
    description: 'Traders, shopkeepers, and craftsmen of the city.',
    memberTypes: ['merchant', 'blacksmith_npc'],
    tiers: [
      { min: -100, label: 'Blacklisted' },
      { min: -50,  label: 'Thief' },
      { min: -20,  label: 'Untrustworthy' },
      { min: 0,    label: 'Customer' },
      { min: 20,   label: 'Preferred Buyer' },
      { min: 50,   label: 'Trade Partner' },
      { min: 80,   label: 'Patron of Commerce' },
    ],
  },
  church: {
    id: 'church',
    name: 'The Church',
    description: 'The clergy and holy men who tend to the spiritual needs of the city.',
    memberTypes: ['priest'],
    tiers: [
      { min: -100, label: 'Heretic' },
      { min: -50,  label: 'Sinner' },
      { min: -20,  label: 'Wayward Soul' },
      { min: 0,    label: 'Parishioner' },
      { min: 20,   label: 'Faithful' },
      { min: 50,   label: 'Devout' },
      { min: 80,   label: 'Blessed' },
    ],
  },
  peasants: {
    id: 'peasants',
    name: 'The Common Folk',
    description: 'Farmers, workers, and the everyday people of Camelot.',
    memberTypes: ['civilian_m', 'civilian_f', 'stable_master'],
    tiers: [
      { min: -100, label: 'Tyrant' },
      { min: -50,  label: 'Bully' },
      { min: -20,  label: 'Troublemaker' },
      { min: 0,    label: 'Stranger' },
      { min: 20,   label: 'Friend' },
      { min: 50,   label: 'Hero of the People' },
      { min: 80,   label: 'Folk Legend' },
    ],
  },
  nobles: {
    id: 'nobles',
    name: 'The Nobility',
    description: 'Lords, ladies, and the aristocracy of the realm.',
    memberTypes: ['tavern_keeper', 'bard'],
    tiers: [
      { min: -100, label: 'Peasant Scum' },
      { min: -50,  label: 'Unwelcome' },
      { min: -20,  label: 'Commoner' },
      { min: 0,    label: 'Acquaintance' },
      { min: 20,   label: 'Guest' },
      { min: 50,   label: 'Trusted Retainer' },
      { min: 80,   label: 'Confidant' },
    ],
  },
};

/** Actions that affect faction reputation */
export interface GTAReputationEffect {
  faction: GTAFactionId;
  amount: number;
}

export const REPUTATION_EFFECTS: Record<string, GTAReputationEffect[]> = {
  kill_guard:      [{ faction: 'crown', amount: -15 }, { faction: 'peasants', amount: -5 }, { faction: 'thieves_guild', amount: 5 }],
  kill_knight:     [{ faction: 'crown', amount: -25 }, { faction: 'nobles', amount: -10 }, { faction: 'thieves_guild', amount: 8 }],
  kill_civilian:   [{ faction: 'peasants', amount: -20 }, { faction: 'crown', amount: -5 }, { faction: 'church', amount: -5 }],
  kill_criminal:   [{ faction: 'crown', amount: 5 }, { faction: 'peasants', amount: 3 }, { faction: 'thieves_guild', amount: -10 }],
  steal_merchant:  [{ faction: 'merchants', amount: -15 }, { faction: 'thieves_guild', amount: 5 }, { faction: 'crown', amount: -3 }],
  help_guard:      [{ faction: 'crown', amount: 10 }, { faction: 'peasants', amount: 3 }, { faction: 'thieves_guild', amount: -5 }],
  complete_quest:  [{ faction: 'crown', amount: 5 }, { faction: 'peasants', amount: 3 }],
  donate_church:   [{ faction: 'church', amount: 10 }, { faction: 'peasants', amount: 3 }],
  bribe_guard:     [{ faction: 'crown', amount: -5 }, { faction: 'thieves_guild', amount: 3 }],
  trade_merchant:  [{ faction: 'merchants', amount: 3 }],
  assault_priest:  [{ faction: 'church', amount: -20 }, { faction: 'peasants', amount: -10 }, { faction: 'crown', amount: -5 }],
  help_peasant:    [{ faction: 'peasants', amount: 8 }, { faction: 'church', amount: 3 }],
  join_crime_ring: [{ faction: 'thieves_guild', amount: 15 }, { faction: 'crown', amount: -10 }, { faction: 'merchants', amount: -5 }],
};

/** Maps faction rep to a price multiplier (lower rep = higher prices) */
export function getMerchantPriceMultiplier(merchantRep: number): number {
  if (merchantRep >= 80)  return 0.75;
  if (merchantRep >= 50)  return 0.85;
  if (merchantRep >= 20)  return 0.92;
  if (merchantRep >= 0)   return 1.0;
  if (merchantRep >= -20) return 1.1;
  if (merchantRep >= -50) return 1.3;
  return 1.5; // blacklisted
}

/** Get the tier label for a faction at a given reputation value */
export function getFactionTierLabel(factionId: GTAFactionId, rep: number): string {
  const def = FACTION_DEFINITIONS[factionId];
  let label = def.tiers[0].label;
  for (const tier of def.tiers) {
    if (rep >= tier.min) label = tier.label;
  }
  return label;
}

// ─── Equipment Definitions ────────────────────────────────────────────────────

export type GTAEquipSlot = 'weapon' | 'armor' | 'helmet' | 'shield' | 'boots' | 'ring';
export type GTAEquipTier = 'leather' | 'chain' | 'plate' | 'enchanted';

export interface GTAEquipmentDef {
  id: string;
  name: string;
  slot: GTAEquipSlot;
  tier: GTAEquipTier;
  /** Flat damage bonus (weapons) */
  damage: number;
  /** Flat defense bonus (armor/shield/helmet) */
  defense: number;
  /** Speed multiplier (1.0 = no change, 0.9 = 10% slower) */
  speedMult: number;
  /** Stamina regen bonus */
  staminaRegen: number;
  /** Gold cost to buy */
  cost: number;
  description: string;
}

export const EQUIPMENT_DEFS: GTAEquipmentDef[] = [
  // ── Weapons ──
  { id: 'rusty_sword',     name: 'Rusty Sword',      slot: 'weapon', tier: 'leather',    damage: 5,  defense: 0, speedMult: 1.0,  staminaRegen: 0, cost: 30,   description: 'A dull, rusted blade. Better than fists.' },
  { id: 'iron_sword',      name: 'Iron Sword',       slot: 'weapon', tier: 'chain',      damage: 12, defense: 0, speedMult: 1.0,  staminaRegen: 0, cost: 80,   description: 'A reliable iron sword.' },
  { id: 'steel_longsword', name: 'Steel Longsword',  slot: 'weapon', tier: 'plate',      damage: 20, defense: 0, speedMult: 0.97, staminaRegen: 0, cost: 200,  description: 'A finely crafted longsword of tempered steel.' },
  { id: 'enchanted_blade', name: 'Enchanted Blade',  slot: 'weapon', tier: 'enchanted',  damage: 30, defense: 2, speedMult: 1.05, staminaRegen: 2, cost: 500,  description: 'A blade humming with arcane energy.' },
  { id: 'war_axe',         name: 'War Axe',          slot: 'weapon', tier: 'plate',      damage: 25, defense: 0, speedMult: 0.92, staminaRegen: 0, cost: 250,  description: 'A heavy axe that cleaves through armor.' },
  { id: 'dagger',          name: 'Dagger',           slot: 'weapon', tier: 'leather',    damage: 8,  defense: 0, speedMult: 1.1,  staminaRegen: 0, cost: 40,   description: 'A quick blade, favored by thieves.' },

  // ── Armor ──
  { id: 'leather_armor',   name: 'Leather Armor',    slot: 'armor', tier: 'leather',    damage: 0, defense: 5,  speedMult: 0.98, staminaRegen: 0,  cost: 50,   description: 'Light leather protection.' },
  { id: 'chain_mail',      name: 'Chain Mail',       slot: 'armor', tier: 'chain',      damage: 0, defense: 12, speedMult: 0.93, staminaRegen: 0,  cost: 150,  description: 'Interlocking metal rings offer solid defense.' },
  { id: 'plate_armor',     name: 'Plate Armor',      slot: 'armor', tier: 'plate',      damage: 0, defense: 22, speedMult: 0.85, staminaRegen: -3, cost: 400,  description: 'Heavy plate that stops most blows.' },
  { id: 'enchanted_armor', name: 'Enchanted Plate',  slot: 'armor', tier: 'enchanted',  damage: 0, defense: 28, speedMult: 0.95, staminaRegen: 2,  cost: 800,  description: 'Magically lightened plate armor.' },

  // ── Helmets ──
  { id: 'leather_cap',     name: 'Leather Cap',      slot: 'helmet', tier: 'leather',    damage: 0, defense: 2,  speedMult: 1.0,  staminaRegen: 0, cost: 25,   description: 'A simple leather cap.' },
  { id: 'chain_coif',      name: 'Chain Coif',       slot: 'helmet', tier: 'chain',      damage: 0, defense: 5,  speedMult: 0.98, staminaRegen: 0, cost: 80,   description: 'Chain mesh head protection.' },
  { id: 'great_helm',      name: 'Great Helm',       slot: 'helmet', tier: 'plate',      damage: 0, defense: 10, speedMult: 0.95, staminaRegen: 0, cost: 200,  description: 'Full face plate helmet.' },
  { id: 'crown_of_valor',  name: 'Crown of Valor',   slot: 'helmet', tier: 'enchanted',  damage: 3, defense: 8,  speedMult: 1.0,  staminaRegen: 3, cost: 600,  description: 'A glowing crown that inspires courage.' },

  // ── Shields ──
  { id: 'wooden_shield',   name: 'Wooden Shield',    slot: 'shield', tier: 'leather',    damage: 0, defense: 4,  speedMult: 0.97, staminaRegen: 0, cost: 35,   description: 'A simple wooden shield.' },
  { id: 'iron_shield',     name: 'Iron Shield',      slot: 'shield', tier: 'chain',      damage: 0, defense: 8,  speedMult: 0.94, staminaRegen: 0, cost: 120,  description: 'A sturdy iron buckler.' },
  { id: 'tower_shield',    name: 'Tower Shield',     slot: 'shield', tier: 'plate',      damage: 0, defense: 15, speedMult: 0.88, staminaRegen: 0, cost: 300,  description: 'A massive shield covering the entire body.' },
  { id: 'aegis',           name: 'Aegis',            slot: 'shield', tier: 'enchanted',  damage: 0, defense: 18, speedMult: 0.96, staminaRegen: 2, cost: 700,  description: 'A mythical shield that deflects curses.' },

  // ── Boots ──
  { id: 'leather_boots',   name: 'Leather Boots',    slot: 'boots', tier: 'leather',    damage: 0, defense: 1,  speedMult: 1.03, staminaRegen: 1, cost: 30,   description: 'Comfortable leather boots.' },
  { id: 'chain_greaves',   name: 'Chain Greaves',    slot: 'boots', tier: 'chain',      damage: 0, defense: 4,  speedMult: 0.98, staminaRegen: 0, cost: 100,  description: 'Chain-armored leg protection.' },
  { id: 'plate_sabatons',  name: 'Plate Sabatons',   slot: 'boots', tier: 'plate',      damage: 0, defense: 7,  speedMult: 0.92, staminaRegen: 0, cost: 250,  description: 'Heavy plate boots.' },
  { id: 'windwalkers',     name: 'Windwalker Boots', slot: 'boots', tier: 'enchanted',  damage: 0, defense: 5,  speedMult: 1.12, staminaRegen: 5, cost: 650,  description: 'Enchanted boots that make you swift as the wind.' },

  // ── Rings ──
  { id: 'iron_ring',       name: 'Iron Ring',        slot: 'ring', tier: 'leather',    damage: 1, defense: 1, speedMult: 1.0,  staminaRegen: 0, cost: 40,   description: 'A plain iron ring.' },
  { id: 'silver_ring',     name: 'Silver Ring',      slot: 'ring', tier: 'chain',      damage: 2, defense: 2, speedMult: 1.0,  staminaRegen: 1, cost: 120,  description: 'A polished silver ring.' },
  { id: 'gold_signet',     name: 'Gold Signet Ring', slot: 'ring', tier: 'plate',      damage: 3, defense: 3, speedMult: 1.0,  staminaRegen: 2, cost: 300,  description: 'A noble\'s signet ring.' },
  { id: 'ring_of_power',   name: 'Ring of Power',    slot: 'ring', tier: 'enchanted',  damage: 8, defense: 5, speedMult: 1.05, staminaRegen: 4, cost: 900,  description: 'A ring pulsing with dark energy.' },
];

export function getEquipmentById(id: string): GTAEquipmentDef | undefined {
  return EQUIPMENT_DEFS.find(e => e.id === id);
}

// ─── Skill Tree Definitions ───────────────────────────────────────────────────

export type GTASkillBranch = 'combat' | 'stealth' | 'speech' | 'survival';

export interface GTASkillDef {
  id: string;
  name: string;
  branch: GTASkillBranch;
  maxRank: number;
  description: string;
  /** Effect per rank */
  effectPerRank: { stat: string; value: number }[];
  /** Minimum total points in this branch required to unlock */
  branchPointsRequired: number;
}

export const SKILL_DEFS: GTASkillDef[] = [
  // ── Combat branch ──
  { id: 'melee_damage',    name: 'Melee Mastery',     branch: 'combat', maxRank: 5, description: '+10% melee damage per rank',      effectPerRank: [{ stat: 'meleeDamageMult', value: 0.10 }],   branchPointsRequired: 0 },
  { id: 'combo_strikes',   name: 'Combo Strikes',     branch: 'combat', maxRank: 3, description: '+5% attack speed per rank',        effectPerRank: [{ stat: 'attackSpeedMult', value: 0.05 }],   branchPointsRequired: 2 },
  { id: 'heavy_blows',     name: 'Heavy Blows',       branch: 'combat', maxRank: 3, description: '+15% sprint attack damage',        effectPerRank: [{ stat: 'sprintDamageMult', value: 0.15 }],  branchPointsRequired: 5 },
  { id: 'battle_hardened', name: 'Battle Hardened',    branch: 'combat', maxRank: 3, description: '+5% block damage reduction',       effectPerRank: [{ stat: 'blockReduction', value: 0.05 }],    branchPointsRequired: 8 },

  // ── Stealth branch ──
  { id: 'pickpocket',      name: 'Pickpocket',        branch: 'stealth', maxRank: 5, description: '+15% pickpocket success per rank', effectPerRank: [{ stat: 'pickpocketChance', value: 0.15 }],  branchPointsRequired: 0 },
  { id: 'sneak',           name: 'Sneak',             branch: 'stealth', maxRank: 3, description: '-10% NPC detection range',         effectPerRank: [{ stat: 'detectionMult', value: -0.10 }],    branchPointsRequired: 2 },
  { id: 'shadow_step',     name: 'Shadow Step',       branch: 'stealth', maxRank: 3, description: '+8% movement speed while sneaking', effectPerRank: [{ stat: 'sneakSpeedMult', value: 0.08 }],   branchPointsRequired: 5 },
  { id: 'assassinate',     name: 'Assassinate',       branch: 'stealth', maxRank: 2, description: '+50% backstab damage per rank',    effectPerRank: [{ stat: 'backstabMult', value: 0.50 }],      branchPointsRequired: 8 },

  // ── Speech branch ──
  { id: 'haggle',          name: 'Haggle',            branch: 'speech', maxRank: 5, description: '-5% shop prices per rank',          effectPerRank: [{ stat: 'priceReduction', value: 0.05 }],    branchPointsRequired: 0 },
  { id: 'persuasion',      name: 'Persuasion',        branch: 'speech', maxRank: 3, description: '+10% bribe success per rank',       effectPerRank: [{ stat: 'bribeChance', value: 0.10 }],       branchPointsRequired: 2 },
  { id: 'intimidate',      name: 'Intimidate',        branch: 'speech', maxRank: 3, description: 'Chance to make NPCs flee on approach', effectPerRank: [{ stat: 'intimidateChance', value: 0.12 }], branchPointsRequired: 5 },
  { id: 'silver_tongue',   name: 'Silver Tongue',     branch: 'speech', maxRank: 2, description: '+5 faction rep gain per rank',      effectPerRank: [{ stat: 'repGainBonus', value: 5 }],         branchPointsRequired: 8 },

  // ── Survival branch ──
  { id: 'toughness',       name: 'Toughness',         branch: 'survival', maxRank: 5, description: '+10 max HP per rank',             effectPerRank: [{ stat: 'maxHpBonus', value: 10 }],          branchPointsRequired: 0 },
  { id: 'endurance',       name: 'Endurance',         branch: 'survival', maxRank: 3, description: '+3 stamina regen per rank',       effectPerRank: [{ stat: 'staminaRegenBonus', value: 3 }],    branchPointsRequired: 2 },
  { id: 'second_wind',     name: 'Second Wind',       branch: 'survival', maxRank: 2, description: 'Chance to survive lethal blow at 1 HP', effectPerRank: [{ stat: 'secondWindChance', value: 0.15 }], branchPointsRequired: 5 },
  { id: 'iron_gut',        name: 'Iron Gut',          branch: 'survival', maxRank: 3, description: '+20% potion healing per rank',    effectPerRank: [{ stat: 'potionHealMult', value: 0.20 }],    branchPointsRequired: 8 },
];

// ─── Bounty Hunter Tier Definitions ───────────────────────────────────────────

export interface GTABountyHunterDef {
  tier: number;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  attackCooldown: number;
  /** Minimum wanted level for this tier to spawn */
  minWantedLevel: number;
  /** Gold reward for defeating this hunter */
  bountyReduction: number;
  /** Bribe cost to make them leave */
  bribeCost: number;
  tactics: 'direct' | 'ambush' | 'ranged';
  dialogLines: string[];
}

export const BOUNTY_HUNTER_TIERS: GTABountyHunterDef[] = [
  {
    tier: 1, name: 'Sellsword Tracker', hp: 70, damage: 12, speed: 120,
    attackCooldown: 1.2, minWantedLevel: 2, bountyReduction: 1, bribeCost: 40,
    tactics: 'direct',
    dialogLines: ['Your bounty is mine!', 'Come quietly and I might let you live.'],
  },
  {
    tier: 2, name: 'Veteran Bounty Hunter', hp: 130, damage: 20, speed: 150,
    attackCooldown: 1.0, minWantedLevel: 3, bountyReduction: 1, bribeCost: 100,
    tactics: 'direct',
    dialogLines: ['I have tracked worse than you.', 'The Crown pays well for your head.'],
  },
  {
    tier: 3, name: 'Shadow Stalker', hp: 100, damage: 18, speed: 170,
    attackCooldown: 0.8, minWantedLevel: 3, bountyReduction: 1, bribeCost: 150,
    tactics: 'ambush',
    dialogLines: ['You did not see me coming, did you?', 'Nowhere to hide.'],
  },
  {
    tier: 4, name: 'Knight Errant', hp: 200, damage: 28, speed: 160,
    attackCooldown: 0.9, minWantedLevel: 4, bountyReduction: 2, bribeCost: 250,
    tactics: 'direct',
    dialogLines: ['By the order of the Crown, you are condemned!', 'Justice is relentless.'],
  },
  {
    tier: 5, name: 'The Executioner', hp: 300, damage: 35, speed: 140,
    attackCooldown: 0.7, minWantedLevel: 5, bountyReduction: 2, bribeCost: 500,
    tactics: 'direct',
    dialogLines: ['Your sentence is death.', 'I never fail a contract.', 'Say your prayers.'],
  },
  {
    tier: 3, name: 'Crossbow Hunter', hp: 80, damage: 22, speed: 110,
    attackCooldown: 2.0, minWantedLevel: 3, bountyReduction: 1, bribeCost: 120,
    tactics: 'ranged',
    dialogLines: ['Hold still, this will be quick.', 'My bolts never miss.'],
  },
];

/** Spawn locations for bounty hunter ambushes */
export const BOUNTY_HUNTER_SPAWN_LOCATIONS = {
  inns:      [{ x: 2400, y: 1350 }],
  roads:     [{ x: 2000, y: 1000 }, { x: 1500, y: 2000 }, { x: 2800, y: 1500 }],
  cityGates: [
    { x: 2000, y: 500 },
    { x: 2000, y: 2500 },
    { x: 3200, y: 1500 },
    { x: 800, y: 1500 },
  ],
};

// ─── Procedural Interior Templates ────────────────────────────────────────────

export type GTAInteriorRoomType =
  | 'tavern' | 'shop' | 'castle_hall' | 'dungeon' | 'chapel'
  | 'bedroom' | 'kitchen' | 'treasury' | 'library' | 'armory';

export interface GTAFurnitureDef {
  type: string;
  relX: number;   // 0-1 relative X position within room
  relY: number;   // 0-1 relative Y position within room
  width: number;
  height: number;
  color: number;
  interactive?: boolean;
  interactionLabel?: string;
}

export interface GTAInteriorNPCSpawn {
  type: string;
  relX: number;
  relY: number;
  name: string;
  behavior: string;
}

export interface GTARoomTemplate {
  type: GTAInteriorRoomType;
  name: string;
  floorColor: number;
  wallColor: number;
  furniture: GTAFurnitureDef[];
  npcSpawns: GTAInteriorNPCSpawn[];
  /** Ambient objects drawn as decoration */
  decorations: { type: string; relX: number; relY: number; color: number; size: number }[];
}

export const ROOM_TEMPLATES: GTARoomTemplate[] = [
  {
    type: 'tavern',
    name: 'Tavern Common Room',
    floorColor: 0x6b4226,
    wallColor: 0x777777,
    furniture: [
      { type: 'bar_counter', relX: 0.75, relY: 0.3, width: 80, height: 160, color: 0x5a3a1a },
      { type: 'table',       relX: 0.2,  relY: 0.3, width: 40, height: 40,  color: 0x8b6432 },
      { type: 'table',       relX: 0.35, relY: 0.6, width: 40, height: 40,  color: 0x8b6432 },
      { type: 'table',       relX: 0.2,  relY: 0.8, width: 40, height: 40,  color: 0x8b6432 },
      { type: 'fireplace',   relX: 0.5,  relY: 0.05, width: 80, height: 50, color: 0x333333 },
      { type: 'barrel',      relX: 0.05, relY: 0.05, width: 24, height: 24, color: 0x704828 },
      { type: 'barrel',      relX: 0.05, relY: 0.9,  width: 24, height: 24, color: 0x704828 },
    ],
    npcSpawns: [
      { type: 'tavern_keeper', relX: 0.78, relY: 0.2, name: 'Barkeep', behavior: 'stand' },
      { type: 'bard',          relX: 0.4,  relY: 0.4, name: 'Minstrel', behavior: 'wander' },
    ],
    decorations: [
      { type: 'lantern', relX: 0.25, relY: 0.05, color: 0xffcc44, size: 6 },
      { type: 'lantern', relX: 0.6,  relY: 0.05, color: 0xffcc44, size: 6 },
      { type: 'lantern', relX: 0.85, relY: 0.05, color: 0xffcc44, size: 6 },
    ],
  },
  {
    type: 'shop',
    name: 'General Store',
    floorColor: 0x8b7355,
    wallColor: 0x6b4226,
    furniture: [
      { type: 'counter',   relX: 0.5,  relY: 0.2, width: 120, height: 30, color: 0x5a3a1a, interactive: true, interactionLabel: 'Browse Wares' },
      { type: 'shelf',     relX: 0.1,  relY: 0.1, width: 30,  height: 150, color: 0x5a3a1a },
      { type: 'shelf',     relX: 0.9,  relY: 0.1, width: 30,  height: 150, color: 0x5a3a1a },
      { type: 'crate',     relX: 0.15, relY: 0.85, width: 30, height: 30, color: 0x704828 },
      { type: 'crate',     relX: 0.25, relY: 0.85, width: 30, height: 30, color: 0x704828 },
      { type: 'rug',       relX: 0.5,  relY: 0.6, width: 100, height: 60, color: 0x8b1a1a },
    ],
    npcSpawns: [
      { type: 'merchant', relX: 0.5, relY: 0.15, name: 'Shopkeeper', behavior: 'stand' },
    ],
    decorations: [
      { type: 'candle', relX: 0.5, relY: 0.18, color: 0xffcc44, size: 4 },
    ],
  },
  {
    type: 'castle_hall',
    name: 'Great Hall',
    floorColor: 0xccccbb,
    wallColor: 0x888877,
    furniture: [
      { type: 'throne',      relX: 0.5,  relY: 0.08, width: 50, height: 60, color: 0xccaa44 },
      { type: 'long_table',  relX: 0.5,  relY: 0.5,  width: 200, height: 40, color: 0x5a3a1a },
      { type: 'pillar',      relX: 0.15, relY: 0.25, width: 30, height: 30, color: 0x999988 },
      { type: 'pillar',      relX: 0.85, relY: 0.25, width: 30, height: 30, color: 0x999988 },
      { type: 'pillar',      relX: 0.15, relY: 0.7,  width: 30, height: 30, color: 0x999988 },
      { type: 'pillar',      relX: 0.85, relY: 0.7,  width: 30, height: 30, color: 0x999988 },
      { type: 'banner',      relX: 0.05, relY: 0.1,  width: 30, height: 70, color: 0x8b1a1a },
      { type: 'banner',      relX: 0.95, relY: 0.1,  width: 30, height: 70, color: 0x8b1a1a },
    ],
    npcSpawns: [
      { type: 'knight', relX: 0.3, relY: 0.15, name: 'Royal Guard', behavior: 'stand' },
      { type: 'knight', relX: 0.7, relY: 0.15, name: 'Royal Guard', behavior: 'stand' },
    ],
    decorations: [
      { type: 'carpet', relX: 0.5, relY: 0.5, color: 0x8b1a1a, size: 30 },
      { type: 'torch',  relX: 0.05, relY: 0.4, color: 0xff8844, size: 5 },
      { type: 'torch',  relX: 0.95, relY: 0.4, color: 0xff8844, size: 5 },
    ],
  },
  {
    type: 'dungeon',
    name: 'Dungeon Cell Block',
    floorColor: 0x333333,
    wallColor: 0x444444,
    furniture: [
      { type: 'cage',    relX: 0.15, relY: 0.2,  width: 60, height: 60, color: 0x555555 },
      { type: 'cage',    relX: 0.15, relY: 0.6,  width: 60, height: 60, color: 0x555555 },
      { type: 'cage',    relX: 0.75, relY: 0.2,  width: 60, height: 60, color: 0x555555 },
      { type: 'cage',    relX: 0.75, relY: 0.6,  width: 60, height: 60, color: 0x555555 },
      { type: 'table',   relX: 0.5,  relY: 0.5,  width: 50, height: 30, color: 0x5a3a1a },
      { type: 'chain',   relX: 0.1,  relY: 0.05, width: 4,  height: 30, color: 0x666666 },
      { type: 'chain',   relX: 0.9,  relY: 0.05, width: 4,  height: 30, color: 0x666666 },
    ],
    npcSpawns: [
      { type: 'guard', relX: 0.5, relY: 0.85, name: 'Dungeon Guard', behavior: 'stand' },
    ],
    decorations: [
      { type: 'torch',    relX: 0.3, relY: 0.05, color: 0xff6600, size: 5 },
      { type: 'torch',    relX: 0.7, relY: 0.05, color: 0xff6600, size: 5 },
      { type: 'rat',      relX: 0.4, relY: 0.8,  color: 0x555544, size: 3 },
    ],
  },
  {
    type: 'chapel',
    name: 'Chapel',
    floorColor: 0x999988,
    wallColor: 0x888877,
    furniture: [
      { type: 'altar',  relX: 0.5,  relY: 0.08, width: 80, height: 40, color: 0xccccbb, interactive: true, interactionLabel: 'Pray' },
      { type: 'pew',    relX: 0.25, relY: 0.35, width: 80, height: 20, color: 0x5a3a1a },
      { type: 'pew',    relX: 0.75, relY: 0.35, width: 80, height: 20, color: 0x5a3a1a },
      { type: 'pew',    relX: 0.25, relY: 0.55, width: 80, height: 20, color: 0x5a3a1a },
      { type: 'pew',    relX: 0.75, relY: 0.55, width: 80, height: 20, color: 0x5a3a1a },
      { type: 'pew',    relX: 0.25, relY: 0.75, width: 80, height: 20, color: 0x5a3a1a },
      { type: 'pew',    relX: 0.75, relY: 0.75, width: 80, height: 20, color: 0x5a3a1a },
    ],
    npcSpawns: [
      { type: 'priest', relX: 0.5, relY: 0.12, name: 'Chaplain', behavior: 'stand' },
    ],
    decorations: [
      { type: 'stained_glass', relX: 0.2,  relY: 0.02, color: 0xcc3333, size: 20 },
      { type: 'stained_glass', relX: 0.5,  relY: 0.02, color: 0x3366cc, size: 20 },
      { type: 'stained_glass', relX: 0.8,  relY: 0.02, color: 0xccaa44, size: 20 },
      { type: 'candle',        relX: 0.05, relY: 0.3,  color: 0xffcc44, size: 4 },
      { type: 'candle',        relX: 0.95, relY: 0.3,  color: 0xffcc44, size: 4 },
    ],
  },
  {
    type: 'bedroom',
    name: 'Bedchamber',
    floorColor: 0x6b4226,
    wallColor: 0x777766,
    furniture: [
      { type: 'bed',       relX: 0.2,  relY: 0.15, width: 70, height: 40, color: 0x666655 },
      { type: 'wardrobe',  relX: 0.85, relY: 0.1,  width: 40, height: 60, color: 0x5a3a1a },
      { type: 'desk',      relX: 0.7,  relY: 0.7,  width: 50, height: 30, color: 0x704828 },
      { type: 'chest',     relX: 0.2,  relY: 0.85, width: 40, height: 25, color: 0x5a3a1a, interactive: true, interactionLabel: 'Open Chest' },
      { type: 'rug',       relX: 0.5,  relY: 0.5,  width: 80, height: 50, color: 0x8b4513 },
    ],
    npcSpawns: [],
    decorations: [
      { type: 'candle', relX: 0.7, relY: 0.68, color: 0xffcc44, size: 4 },
      { type: 'window', relX: 0.5, relY: 0.02, color: 0x88aacc, size: 20 },
    ],
  },
  {
    type: 'kitchen',
    name: 'Kitchen',
    floorColor: 0x777766,
    wallColor: 0x666655,
    furniture: [
      { type: 'hearth',     relX: 0.5,  relY: 0.05, width: 100, height: 50, color: 0x333333 },
      { type: 'table',      relX: 0.5,  relY: 0.5,  width: 80,  height: 40, color: 0x5a3a1a },
      { type: 'barrel',     relX: 0.1,  relY: 0.8,  width: 24,  height: 24, color: 0x704828 },
      { type: 'barrel',     relX: 0.2,  relY: 0.8,  width: 24,  height: 24, color: 0x704828 },
      { type: 'shelf',      relX: 0.9,  relY: 0.2,  width: 25,  height: 120, color: 0x5a3a1a },
      { type: 'cauldron',   relX: 0.5,  relY: 0.12, width: 30,  height: 25, color: 0x444444 },
    ],
    npcSpawns: [],
    decorations: [
      { type: 'fire', relX: 0.5, relY: 0.08, color: 0xff4400, size: 15 },
      { type: 'steam', relX: 0.5, relY: 0.1, color: 0xcccccc, size: 10 },
    ],
  },
  {
    type: 'treasury',
    name: 'Treasury Vault',
    floorColor: 0x555544,
    wallColor: 0x666655,
    furniture: [
      { type: 'chest',   relX: 0.2,  relY: 0.2,  width: 40, height: 25, color: 0xccaa44, interactive: true, interactionLabel: 'Loot' },
      { type: 'chest',   relX: 0.5,  relY: 0.2,  width: 40, height: 25, color: 0xccaa44, interactive: true, interactionLabel: 'Loot' },
      { type: 'chest',   relX: 0.8,  relY: 0.2,  width: 40, height: 25, color: 0xccaa44, interactive: true, interactionLabel: 'Loot' },
      { type: 'shelf',   relX: 0.1,  relY: 0.4,  width: 25, height: 120, color: 0x5a3a1a },
      { type: 'shelf',   relX: 0.9,  relY: 0.4,  width: 25, height: 120, color: 0x5a3a1a },
      { type: 'gold_pile', relX: 0.5, relY: 0.6, width: 50, height: 30, color: 0xffdd00 },
    ],
    npcSpawns: [
      { type: 'guard', relX: 0.5, relY: 0.85, name: 'Vault Guard', behavior: 'stand' },
    ],
    decorations: [
      { type: 'torch', relX: 0.05, relY: 0.3, color: 0xff8844, size: 5 },
      { type: 'torch', relX: 0.95, relY: 0.3, color: 0xff8844, size: 5 },
    ],
  },
  {
    type: 'library',
    name: 'Library',
    floorColor: 0x6b4226,
    wallColor: 0x777766,
    furniture: [
      { type: 'bookshelf', relX: 0.05, relY: 0.1,  width: 30, height: 200, color: 0x5a3a1a },
      { type: 'bookshelf', relX: 0.95, relY: 0.1,  width: 30, height: 200, color: 0x5a3a1a },
      { type: 'bookshelf', relX: 0.5,  relY: 0.05, width: 200, height: 25, color: 0x5a3a1a },
      { type: 'desk',      relX: 0.5,  relY: 0.5,  width: 60, height: 35, color: 0x704828 },
      { type: 'chair',     relX: 0.5,  relY: 0.6,  width: 20, height: 20, color: 0x5a3a1a },
      { type: 'globe',     relX: 0.8,  relY: 0.8,  width: 20, height: 20, color: 0x4466aa },
    ],
    npcSpawns: [
      { type: 'priest', relX: 0.4, relY: 0.45, name: 'Scribe', behavior: 'stand' },
    ],
    decorations: [
      { type: 'candle', relX: 0.5, relY: 0.48, color: 0xffcc44, size: 4 },
      { type: 'candle', relX: 0.05, relY: 0.5, color: 0xffcc44, size: 4 },
    ],
  },
  {
    type: 'armory',
    name: 'Armory',
    floorColor: 0x555555,
    wallColor: 0x666666,
    furniture: [
      { type: 'weapon_rack', relX: 0.1,  relY: 0.1,  width: 30, height: 180, color: 0x5a3a1a },
      { type: 'weapon_rack', relX: 0.9,  relY: 0.1,  width: 30, height: 180, color: 0x5a3a1a },
      { type: 'armor_stand', relX: 0.3,  relY: 0.2,  width: 28, height: 50,  color: 0x888888 },
      { type: 'armor_stand', relX: 0.7,  relY: 0.2,  width: 28, height: 50,  color: 0x888888 },
      { type: 'table',       relX: 0.5,  relY: 0.6,  width: 80, height: 40,  color: 0x5a3a1a },
      { type: 'chest',       relX: 0.5,  relY: 0.85, width: 50, height: 30,  color: 0x704828, interactive: true, interactionLabel: 'Equipment' },
    ],
    npcSpawns: [
      { type: 'blacksmith_npc', relX: 0.5, relY: 0.5, name: 'Armorer', behavior: 'stand' },
    ],
    decorations: [
      { type: 'torch', relX: 0.05, relY: 0.5, color: 0xff8844, size: 5 },
      { type: 'torch', relX: 0.95, relY: 0.5, color: 0xff8844, size: 5 },
    ],
  },
];

/** Get a random room template for a building type, with seeded variation */
export function getRoomTemplateForBuilding(buildingType: string, seed: number): GTARoomTemplate {
  // Map building types to interior room types
  const typeMap: Record<string, GTAInteriorRoomType[]> = {
    tavern:          ['tavern'],
    church:          ['chapel'],
    blacksmith_shop: ['armory'],
    castle:          ['castle_hall', 'treasury', 'library'],
    barracks:        ['armory', 'bedroom'],
    stable:          ['shop'],
    prison:          ['dungeon'],
    house_large:     ['bedroom', 'kitchen', 'library'],
    house_medium:    ['bedroom', 'kitchen'],
    house_small:     ['bedroom'],
    market_stall:    ['shop'],
    temple:          ['chapel'],
  };

  const options = typeMap[buildingType] ?? ['bedroom'];
  const idx = Math.abs(seed) % options.length;
  const roomType = options[idx];
  const template = ROOM_TEMPLATES.find(t => t.type === roomType);
  return template ?? ROOM_TEMPLATES[0];
}

// ─── Crime Ring Definitions ───────────────────────────────────────────────────

export type GTACrimeRingRole = 'leader' | 'enforcer' | 'fence' | 'lookout' | 'member';

export interface GTACrimeRingDef {
  id: string;
  name: string;
  description: string;
  /** Required thieves guild rep to join */
  requiredRep: number;
  /** Income per cycle (game-time day) */
  income: number;
  /** Risk of getting caught (0-1) per cycle */
  riskPerCycle: number;
  /** Wanted level increase if caught */
  wantedOnCaught: number;
  operations: string[];
}

export const CRIME_RING_DEFS: GTACrimeRingDef[] = [
  {
    id: 'pickpocket_ring',
    name: 'Cutpurse Circle',
    description: 'A small band of pickpockets working the market crowds.',
    requiredRep: -10,
    income: 15,
    riskPerCycle: 0.15,
    wantedOnCaught: 1,
    operations: ['pickpocket_market', 'distraction_theft'],
  },
  {
    id: 'smuggling_ring',
    name: 'Shadow Caravan',
    description: 'Smugglers moving contraband through the city gates under cover of darkness.',
    requiredRep: 10,
    income: 40,
    riskPerCycle: 0.10,
    wantedOnCaught: 2,
    operations: ['smuggle_goods', 'bribe_guards', 'secret_stash'],
  },
  {
    id: 'heist_crew',
    name: 'The Vault Breakers',
    description: 'An elite crew planning audacious heists on noble estates and the royal treasury.',
    requiredRep: 40,
    income: 100,
    riskPerCycle: 0.20,
    wantedOnCaught: 4,
    operations: ['plan_heist', 'scout_target', 'execute_heist', 'fence_goods'],
  },
  {
    id: 'protection_racket',
    name: 'Iron Fist',
    description: 'A protection racket extorting merchants and shopkeepers.',
    requiredRep: 20,
    income: 30,
    riskPerCycle: 0.12,
    wantedOnCaught: 2,
    operations: ['collect_protection', 'intimidate_merchant', 'enforce_territory'],
  },
];

// ─── Property Definitions ─────────────────────────────────────────────────────

export interface GTAPropertyDef {
  id: string;
  name: string;
  type: 'house' | 'shop' | 'market_stall';
  cost: number;
  /** Daily income generated */
  income: number;
  /** Position in world */
  pos: { x: number; y: number };
  description: string;
}

export const PROPERTY_DEFS: GTAPropertyDef[] = [
  { id: 'prop_house_south',     name: 'South Quarter House',    type: 'house',        cost: 200,  income: 0,  pos: { x: 1550, y: 2100 }, description: 'A modest house near the south gate. A safe place to rest.' },
  { id: 'prop_house_market',    name: 'Market District Home',   type: 'house',        cost: 400,  income: 0,  pos: { x: 1900, y: 1600 }, description: 'A comfortable home near the bustling market.' },
  { id: 'prop_house_noble',     name: 'Noble Quarter Estate',   type: 'house',        cost: 1000, income: 5,  pos: { x: 2600, y: 800 },  description: 'A fine estate in the noble quarter, generating modest rent.' },
  { id: 'prop_shop_herbs',      name: 'Herbalist Shop',         type: 'shop',         cost: 350,  income: 12, pos: { x: 2050, y: 1300 }, description: 'A small herb shop. Generates steady income from remedies.' },
  { id: 'prop_shop_weapons',    name: 'Arms Dealer',            type: 'shop',         cost: 600,  income: 20, pos: { x: 1200, y: 1400 }, description: 'A weapons shop. Profitable but attracts attention.' },
  { id: 'prop_stall_fruit',     name: 'Fruit Stall',            type: 'market_stall', cost: 100,  income: 6,  pos: { x: 1750, y: 1250 }, description: 'A simple market stall selling fresh fruit.' },
  { id: 'prop_stall_cloth',     name: 'Cloth Stall',            type: 'market_stall', cost: 120,  income: 8,  pos: { x: 1900, y: 1250 }, description: 'A market stall dealing in fine fabrics.' },
  { id: 'prop_tavern',          name: 'The Rusty Flagon',       type: 'shop',         cost: 800,  income: 25, pos: { x: 2500, y: 1400 }, description: 'A tavern generating good income from ale and lodging.' },
];

// ─── Dynamic World Event Definitions ──────────────────────────────────────────

export type GTAWorldEventType =
  | 'tournament'
  | 'festival'
  | 'plague'
  | 'siege'
  | 'royal_visit'
  | 'merchant_caravan';

export interface GTAWorldEventDef {
  type: GTAWorldEventType;
  name: string;
  description: string;
  /** Duration in game-time seconds */
  duration: number;
  /** Minimum time between occurrences */
  cooldown: number;
  /** Effects on the game world */
  effects: {
    priceMultiplier?: number;       // Affects shop prices
    guardMultiplier?: number;       // Extra guards spawned (1.0 = normal)
    npcSpawnMultiplier?: number;    // More/fewer NPCs
    crimeRiskMultiplier?: number;   // Affects crime detection chance
    reputationBonusFaction?: string;
    reputationBonusAmount?: number;
  };
  /** Notification text when event starts */
  startText: string;
  /** Notification text when event ends */
  endText: string;
}

export const WORLD_EVENT_DEFS: GTAWorldEventDef[] = [
  {
    type: 'tournament',
    name: 'Grand Tournament',
    description: 'Knights gather for a tournament at the castle grounds.',
    duration: 120,
    cooldown: 300,
    effects: {
      guardMultiplier: 1.5,
      npcSpawnMultiplier: 1.3,
      priceMultiplier: 1.1,
    },
    startText: 'A Grand Tournament has begun at the castle!',
    endText: 'The tournament has ended.',
  },
  {
    type: 'festival',
    name: 'Harvest Festival',
    description: 'The city celebrates the harvest with feasting and merriment.',
    duration: 150,
    cooldown: 350,
    effects: {
      priceMultiplier: 0.85,
      npcSpawnMultiplier: 1.5,
      crimeRiskMultiplier: 1.3,
    },
    startText: 'The Harvest Festival has begun! Prices are lower!',
    endText: 'The festival has ended. Life returns to normal.',
  },
  {
    type: 'plague',
    name: 'The Sweating Sickness',
    description: 'A mysterious illness sweeps through the city.',
    duration: 100,
    cooldown: 500,
    effects: {
      npcSpawnMultiplier: 0.5,
      priceMultiplier: 1.4,
      guardMultiplier: 0.7,
    },
    startText: 'A plague has struck Camelot! People flee indoors.',
    endText: 'The plague has passed. The city recovers.',
  },
  {
    type: 'siege',
    name: 'Bandit Siege',
    description: 'Bandits mass outside the walls, threatening the city.',
    duration: 90,
    cooldown: 400,
    effects: {
      guardMultiplier: 2.0,
      crimeRiskMultiplier: 0.6,
      priceMultiplier: 1.3,
    },
    startText: 'Bandits are besieging the city! Guards are on high alert!',
    endText: 'The siege has been broken. The city is safe.',
  },
  {
    type: 'royal_visit',
    name: 'Royal Procession',
    description: 'The King rides through the streets with his retinue.',
    duration: 60,
    cooldown: 350,
    effects: {
      guardMultiplier: 3.0,
      crimeRiskMultiplier: 2.0,
      npcSpawnMultiplier: 1.4,
    },
    startText: 'The King is visiting! Guards are everywhere!',
    endText: 'The royal procession has departed.',
  },
  {
    type: 'merchant_caravan',
    name: 'Merchant Caravan',
    description: 'A wealthy caravan arrives from distant lands with exotic goods.',
    duration: 80,
    cooldown: 200,
    effects: {
      priceMultiplier: 0.8,
      npcSpawnMultiplier: 1.2,
    },
    startText: 'A merchant caravan has arrived! Rare goods at low prices!',
    endText: 'The merchant caravan has departed.',
  },
];
