// ---------------------------------------------------------------------------
// Round Table – Roguelike Deckbuilder – Types & Interfaces
// ---------------------------------------------------------------------------

// ── Enums ──────────────────────────────────────────────────────────────────

export enum RTPhase {
  KNIGHT_SELECT = "knight_select",
  MAP = "map",
  COMBAT = "combat",
  REWARD = "reward",
  EVENT = "event",
  REST = "rest",
  SHOP = "shop",
  TREASURE = "treasure",
  BOSS_REWARD = "boss_reward",
  GAME_OVER = "game_over",
  VICTORY = "victory",
}

export enum CardType {
  STRIKE = "strike",
  GUARD = "guard",
  SPELL = "spell",
  VIRTUE = "virtue",
  SIN = "sin",
  COMPANION = "companion",
  CURSE = "curse",
  STATUS = "status",
}

export enum CardRarity {
  STARTER = "starter",
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
  CURSE = "curse",
}

export enum TargetType {
  SINGLE_ENEMY = "single_enemy",
  ALL_ENEMIES = "all_enemies",
  RANDOM_ENEMY = "random_enemy",
  SELF = "self",
  NONE = "none",
}

export enum RelicRarity {
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
  BOSS = "boss",
  SHOP = "shop",
  EVENT = "event",
}

export enum EnemyIntentType {
  ATTACK = "attack",
  DEFEND = "defend",
  BUFF = "buff",
  DEBUFF = "debuff",
  SUMMON = "summon",
  UNKNOWN = "unknown",
}

export enum StatusEffectId {
  STRENGTH = "strength",
  DEXTERITY = "dexterity",
  VULNERABLE = "vulnerable",
  WEAK = "weak",
  POISON = "poison",
  REGEN = "regen",
  THORNS = "thorns",
  RITUAL = "ritual",
  BLOCK_NEXT = "block_next",
  DRAW_NEXT = "draw_next",
  ENERGY_NEXT = "energy_next",
  FLAME_BARRIER = "flame_barrier",
  HOLY_SHIELD = "holy_shield",
  ENTANGLED = "entangled",
  FRAIL = "frail",
}

export enum MapNodeType {
  ENEMY = "enemy",
  ELITE = "elite",
  REST = "rest",
  SHOP = "shop",
  EVENT = "event",
  TREASURE = "treasure",
  BOSS = "boss",
}

export enum KnightId {
  LANCELOT = "lancelot",
  GAWAIN = "gawain",
  PERCIVAL = "percival",
  MORGAUSE = "morgause",
  TRISTAN = "tristan",
}

// ── Card Definition ────────────────────────────────────────────────────────

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  rarity: CardRarity;
  cost: number;
  description: string;
  /** Base damage (before strength). 0 = no damage. */
  damage: number;
  /** Number of times damage is applied. */
  hits: number;
  /** Base block gained (before dex). */
  block: number;
  /** Status effects applied to target. */
  applyEffects: { id: StatusEffectId; amount: number }[];
  /** Status effects applied to self. */
  selfEffects: { id: StatusEffectId; amount: number }[];
  /** Extra cards drawn when played. */
  draw: number;
  /** Extra energy gained when played. */
  energy: number;
  /** Purity change: positive = towards pure, negative = towards fallen. */
  purityChange: number;
  /** If true, card is removed from deck after playing (exhaust). */
  exhaust: boolean;
  /** If true, card is removed from hand at end of turn (ethereal). */
  ethereal: boolean;
  /** If true, card cannot be removed from deck. */
  unremovable: boolean;
  /** If true, card targets all enemies. */
  targetAll: boolean;
  /** Special effect key for custom logic. */
  special: string;
  /** Upgraded version id (null = not upgradeable). */
  upgradeId: string | null;
  /** Knight restriction (null = available to all). */
  knightOnly: KnightId | null;
  target: TargetType;
}

/** Runtime card instance (in deck/hand/draw/discard). */
export interface CardInstance {
  uid: number;
  defId: string;
  upgraded: boolean;
}

// ── Knight Definition ──────────────────────────────────────────────────────

export interface KnightDef {
  id: KnightId;
  name: string;
  title: string;
  description: string;
  maxHp: number;
  startingDeckIds: string[];
  passiveName: string;
  passiveDesc: string;
  /** Color for UI theming. */
  color: number;
}

// ── Enemy Definition ───────────────────────────────────────────────────────

export interface EnemyMoveDef {
  id: string;
  intent: EnemyIntentType;
  damage: number;
  hits: number;
  block: number;
  effects: { id: StatusEffectId; amount: number }[];
  selfEffects: { id: StatusEffectId; amount: number }[];
  /** Weight for random selection (higher = more likely). */
  weight: number;
  /** Minimum turn this move becomes available. */
  minTurn: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  maxHp: [number, number]; // [min, max] — randomized per encounter
  isElite: boolean;
  isBoss: boolean;
  moves: EnemyMoveDef[];
  /** Gold reward range. */
  goldReward: [number, number];
  /** Act restriction (0 = any act). */
  act: number;
}

/** Runtime enemy instance in combat. */
export interface EnemyInstance {
  uid: number;
  defId: string;
  hp: number;
  maxHp: number;
  block: number;
  effects: Map<StatusEffectId, number>;
  currentMoveId: string;
  lastMoveId: string;
  moveCooldowns: Map<string, number>;
  turnCount: number;
}

// ── Relic Definition ───────────────────────────────────────────────────────

export interface RelicDef {
  id: string;
  name: string;
  description: string;
  rarity: RelicRarity;
  /** Hook key for when to trigger. */
  hook: RelicHook;
  /** Knight restriction (null = any). */
  knightOnly: KnightId | null;
}

export type RelicHook =
  | "on_combat_start"
  | "on_turn_start"
  | "on_turn_end"
  | "on_card_play"
  | "on_attack"
  | "on_block"
  | "on_take_damage"
  | "on_enemy_die"
  | "on_combat_end"
  | "on_rest"
  | "on_shop_enter"
  | "on_chest_open"
  | "on_pickup"
  | "passive";

// ── Map Definition ─────────────────────────────────────────────────────────

export interface MapNode {
  id: number;
  type: MapNodeType;
  row: number; // 0 = bottom (start), increases upward
  col: number;
  x: number; // pixel x for rendering
  y: number; // pixel y for rendering
  connections: number[]; // ids of nodes in the next row this connects to
  visited: boolean;
  /** Enemy encounter ids for this node (filled at generation). */
  encounterIds: string[];
  /** Event id for event nodes. */
  eventId: string;
}

export interface ActMap {
  act: number;
  nodes: MapNode[];
  bossId: string;
  currentNodeId: number; // -1 = not started
}

// ── Narrative Event ────────────────────────────────────────────────────────

export interface EventChoice {
  text: string;
  /** Effects: heal, damage, gold, card, relic, purity, removeCard. */
  effects: EventEffect[];
  /** Condition to show this choice. */
  condition?: (state: RTRunState) => boolean;
}

export interface EventEffect {
  type: "heal" | "damage" | "gold" | "add_card" | "remove_card" | "add_relic" | "purity" | "max_hp" | "upgrade_card" | "transform_card";
  value: number | string;
}

export interface EventDef {
  id: string;
  title: string;
  description: string;
  image: string; // key for procedural illustration
  choices: EventChoice[];
  act: number; // 0 = any act
}

// ── Status Effects ─────────────────────────────────────────────────────────

export interface StatusEffectDef {
  id: StatusEffectId;
  name: string;
  description: string;
  /** Does it tick down each turn? */
  decaysPerTurn: boolean;
  /** Is it a debuff? */
  isDebuff: boolean;
  /** Stacks additively? */
  stacks: boolean;
}

// ── Shop ───────────────────────────────────────────────────────────────────

export interface ShopItem {
  type: "card" | "relic" | "remove_card" | "potion";
  id: string;
  cost: number;
  sold: boolean;
}

// ── Potion ─────────────────────────────────────────────────────────────────

export interface PotionDef {
  id: string;
  name: string;
  description: string;
  rarity: "common" | "uncommon" | "rare";
}

export interface PotionInstance {
  defId: string;
}

// ── Run State (the full state of one run) ──────────────────────────────────

export interface RTRunState {
  phase: RTPhase;
  knightId: KnightId;
  hp: number;
  maxHp: number;
  gold: number;
  /** Purity: 0-100. Start at 50. */
  purity: number;
  /** Current act (1-3). */
  act: number;
  /** Floor within current act (0-based). */
  floor: number;
  /** Full deck (draw + discard + hand + exhaust). */
  deck: CardInstance[];
  /** Relics collected this run. */
  relics: string[];
  /** Potions (max 3 slots). */
  potions: (PotionInstance | null)[];
  /** Map for each act. */
  maps: ActMap[];
  /** Ascension level (0-20). */
  ascension: number;
  /** Next card uid counter. */
  nextUid: number;
  /** Seed for deterministic RNG. */
  seed: number;
  /** RNG state (simple LCG). */
  rngState: number;
  /** Total score. */
  score: number;
  /** Cards played this run. */
  cardsPlayed: number;
  /** Enemies killed this run. */
  enemiesKilled: number;
  /** Damage dealt this run. */
  damageDealt: number;
  /** Current combat state (null if not in combat). */
  combat: RTCombatState | null;
  /** Current event (null if not in event). */
  currentEventId: string | null;
  /** Current shop items (null if not in shop). */
  shop: ShopItem[] | null;
  /** Cards offered as reward (null if not in reward phase). */
  rewardCards: string[] | null;
  /** Reward gold amount. */
  rewardGold: number;
  /** Reward relics. */
  rewardRelics: string[];
  /** Reward potions. */
  rewardPotions: string[];
  /** Flags for one-time effects. */
  flags: Set<string>;
}

// ── Combat State ───────────────────────────────────────────────────────────

export interface RTCombatState {
  enemies: EnemyInstance[];
  hand: CardInstance[];
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  energy: number;
  maxEnergy: number;
  turn: number;
  playerBlock: number;
  playerEffects: Map<StatusEffectId, number>;
  /** Index of selected enemy target (-1 = none). */
  selectedTarget: number;
  /** Is the player's turn? */
  isPlayerTurn: boolean;
  /** Combat log messages. */
  log: string[];
  /** Combo counter for this turn. */
  comboThisTurn: number;
  /** Cards played this turn. */
  cardsPlayedThisTurn: number;
  /** Did player play a strike this turn? */
  playedStrikeThisTurn: boolean;
  /** Did player play a guard this turn? */
  playedGuardThisTurn: boolean;
  /** Animation queue for view layer. */
  animQueue: RTAnimEvent[];
}

// ── Animation Events ───────────────────────────────────────────────────────

export type RTAnimEvent =
  | { type: "card_play"; cardUid: number; targetUid: number }
  | { type: "damage"; targetUid: number; amount: number; isPlayer: boolean }
  | { type: "block"; targetUid: number; amount: number; isPlayer: boolean }
  | { type: "heal"; amount: number; isPlayer: boolean }
  | { type: "effect_apply"; effectId: StatusEffectId; targetUid: number; isPlayer: boolean }
  | { type: "enemy_attack"; enemyUid: number; damage: number }
  | { type: "enemy_die"; enemyUid: number }
  | { type: "draw_card"; cardUid: number }
  | { type: "exhaust_card"; cardUid: number }
  | { type: "shuffle" }
  | { type: "enemy_intent"; enemyUid: number; moveId: string };

// ── Meta Progression ───────────────────────────────────────────────────────

export interface RTMetaState {
  /** Total gold earned across all runs. */
  totalGold: number;
  /** Highest ascension beaten per knight. */
  ascensionPerKnight: Record<string, number>;
  /** Unlocked card pool additions. */
  unlockedCards: string[];
  /** Unlocked knights. */
  unlockedKnights: KnightId[];
  /** Run count. */
  totalRuns: number;
  /** Wins. */
  totalWins: number;
  /** Best score. */
  bestScore: number;
  /** Permanent upgrades purchased. */
  upgrades: Record<string, number>;
}
