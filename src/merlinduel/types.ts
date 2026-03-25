// ---------------------------------------------------------------------------
// Merlin's Duel — Type definitions
// ---------------------------------------------------------------------------

export enum DuelPhase {
  START = "start",
  COUNTDOWN = "countdown",
  FIGHTING = "fighting",
  ROUND_END = "round_end",
  SHOP = "shop",
  VICTORY = "victory",
  DEFEAT = "defeat",
  PAUSED = "paused",
}

export enum Element {
  FIRE = "fire",
  ICE = "ice",
  LIGHTNING = "lightning",
  ARCANE = "arcane",
}

export enum SpellId {
  FIREBALL = "fireball",
  FLAME_WAVE = "flame_wave",
  INFERNO = "inferno",
  ICE_SHARD = "ice_shard",
  FROST_NOVA = "frost_nova",
  BLIZZARD = "blizzard",
  LIGHTNING_BOLT = "lightning_bolt",
  CHAIN_LIGHTNING = "chain_lightning",
  THUNDERSTORM = "thunderstorm",
  ARCANE_MISSILE = "arcane_missile",
  MANA_BURST = "mana_burst",
  VOID_BEAM = "void_beam",
}

export interface Spell {
  id: SpellId;
  element: Element;
  name: string;
  damage: number;
  manaCost: number;
  speed: number;
  size: number;
  cooldown: number;
  unlocked: boolean;
}

export interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  spell: SpellId;
  fromPlayer: boolean;
  age: number;
  element: Element;
  size: number;
  damage: number;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: number; size: number;
  text?: string;
}

export interface Wizard {
  x: number; y: number;
  hp: number; maxHp: number;
  mana: number; maxMana: number;
  manaRegen: number;
  name: string; title: string; color: number;
  spells: SpellId[];
  castInterval: number;
  dodgeChance: number;
  reactionTime: number;
  defeated: boolean;
}

export interface ShopItem {
  name: string;
  description: string;
  cost: number;
  apply: string;
}

export interface DuelState {
  phase: DuelPhase;
  playerHp: number; playerMaxHp: number;
  playerMana: number; playerMaxMana: number;
  playerManaRegen: number;
  playerY: number;
  playerSpells: Spell[];
  playerCooldowns: Record<string, number>;
  selectedElement: Element;
  shieldActive: boolean;
  shieldManaCost: number;
  enemy: Wizard | null;
  enemyY: number;
  enemyCastTimer: number;
  enemyDodgeTimer: number;
  projectiles: Projectile[];
  particles: Particle[];
  round: number;
  opponents: Wizard[];
  gold: number;
  score: number;
  messages: string[];
  countdownTimer: number;
  screenShake: number;
  screenFlash: number;
  time: number;
  moveUp: boolean;
  moveDown: boolean;
  spellPower: number;
  shieldEfficiency: number;
  burnTimers: Record<string, number>;
  slowTimers: Record<string, number>;
  stunTimer: number;
}

export interface DuelMeta {
  shards: number;
  upgrades: DuelUpgrades;
  highestRound: number;
  totalWins: number;
}

export interface DuelUpgrades {
  maxHp: number;
  manaRegen: number;
  spellPower: number;
  shieldEfficiency: number;
  startingGold: number;
}
