// Grail Derby – Medieval Horse Racing Types

export enum DerbyPhase {
  MENU = "menu",
  RACING = "racing",
  CRASHED = "crashed",
  PAUSED = "paused",
}

export enum ObstacleType {
  FENCE = "fence",
  ROCK = "rock",
  MUD = "mud",        // slows down
  BARREL = "barrel",
  KNIGHT = "knight",   // enemy knight, can be jousted
  CART = "cart",       // wide obstacle
}

export enum PickupType {
  COIN = "coin",
  SPEED_BOOST = "speed_boost",
  SHIELD = "shield",
  LANCE = "lance",     // enables jousting attack
  MAGNET = "magnet",
}

export interface Obstacle {
  x: number;
  lane: number;       // 0, 1, 2
  type: ObstacleType;
  width: number;
  active: boolean;
}

export interface Pickup {
  x: number;
  lane: number;
  type: PickupType;
  collected: boolean;
}

export interface AIRider {
  x: number;
  lane: number;
  targetLane: number;
  speed: number;
  color: number;
  name: string;
  alive: boolean;
}

export interface DerbyPlayer {
  lane: number;        // 0, 1, 2 (top, mid, bottom)
  laneY: number;       // smooth Y position for animation
  speed: number;       // current speed
  baseSpeed: number;
  stamina: number;
  maxStamina: number;
  sprinting: boolean;
  score: number;
  coins: number;
  distance: number;    // total distance traveled
  hp: number;
  maxHp: number;
  shieldTimer: number;
  boostTimer: number;
  lanceTimer: number;
  magnetTimer: number;
  invincibleTimer: number;
  coinStreak: number;      // consecutive coins without gap
  coinStreakTimer: number;  // resets streak if > 2s without coin
  bestStreak: number;
  lastMilestone: number;   // last distance milestone reached
}

export interface ArcheryTarget {
  x: number;         // world X position
  y: number;         // screen Y position (lower half)
  active: boolean;
  hitBy: string | null; // "player" or rider name, null if not hit
  timer: number;     // time remaining before it disappears
  radius: number;    // target circle radius
}

export interface DerbyState {
  phase: DerbyPhase;
  player: DerbyPlayer;
  obstacles: Obstacle[];
  pickups: Pickup[];
  aiRiders: AIRider[];
  archeryTarget: ArcheryTarget | null;
  archerySpawnTimer: number;
  scrollX: number;
  time: number;
  difficulty: number;
  highScore: number;
  bestDistance: number;
  // Applied meta bonuses (cached from meta on game start)
  regenBonus: number;
  boostBonus: number;
  magnetBonus: number;
  luckBonus: number;
}

export interface DerbyMeta {
  highScore: number;
  bestDistance: number;
  totalCoins: number;
  totalRaces: number;
  // Permanent upgrades
  extraHp: number;           // 0-2 extra starting HP
  staminaRegenBonus: number; // 0-2 levels (+5 regen/sec per level)
  boostDurationBonus: number;// 0-2 levels (+0.5s per level)
  magnetRangeBonus: number;  // 0-2 levels (+30 range per level)
  luckBonus: number;         // 0-2 levels (more coin/powerup spawns)
}
