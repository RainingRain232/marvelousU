// ---------------------------------------------------------------------------
// Prince of Camelot — Game-specific Types
// ---------------------------------------------------------------------------

export enum CamelotPhase {
  START = "start",
  PLAYING = "playing",
  PAUSED = "paused",
  DIALOGUE = "dialogue",
  SHOP = "shop",
  DEAD = "dead",
  WIN = "win",
  SCORE_TALLY = "score_tally",
}

export enum TileType {
  EMPTY = 0, STONE = 1, BRICK = 2, SPIKE_UP = 3, SPIKE_DOWN = 4,
  LADDER = 5, PLATFORM = 6, DOOR = 7, TORCH = 8, CHAIN = 9,
  CRUMBLE = 10, WATER = 11, CHECKPOINT = 12, GATE = 13, LEVER = 14,
  BANNER = 15, PILLAR_TOP = 16, PILLAR = 17, EXIT = 18, WINDOW = 19,
  WOOD_FLOOR = 20, MOSS_STONE = 21, BONES = 22, BLOODSTAIN = 23,
  CAGE = 24, SKULL = 25,
  WATER_SURFACE = 26, LAVA = 27, ARROW_TRAP = 28, SECRET_WALL = 29,
}

export type EnemyType = "guard" | "archer" | "knight" | "shielder" | "mage" | "boss";
export type PickupType = "health" | "sword" | "coin" | "doublejump" | "shield";
export type BgType = "dungeon" | "hall" | "tower" | "throne";
export type TrapType = "blade" | "fire" | "arrow";

export interface Vec2 { x: number; y: number; }

export interface Player {
  x: number; y: number; vx: number; vy: number;
  w: number; h: number; facing: number;
  grounded: boolean; onLadder: boolean;
  hp: number; maxHp: number; stamina: number;
  attacking: number; attackCooldown: number;
  comboStep: number; comboTimer: number;
  rolling: number; rollDir: number;
  dashing: number; dashDir: number;
  parrying: number; parrySuccess: boolean;
  invuln: number; dead: boolean;
  coyoteTime: number; jumpBuffer: number;
  wallSliding: boolean;
  swordLevel: number; hasDoubleJump: boolean;
  hasShield: boolean; shieldHP: number;
  jumpsLeft: number;
  anim: string; animFrame: number; animTimer: number;
  checkpoint: Vec2; crumbleTouched: Set<string>;
  trail: Array<{ x: number; y: number; life: number }>;
  attackBuffer: number; rollBuffer: number;
  dashBuffer: number; parryBuffer: number;
  squashX: number; squashY: number; landingLag: number;
  footstepTimer: number;
  plunging: boolean;
  killStreak: number; killStreakTimer: number;
  wallJumpCooldown: number;
  executionZoom: number;
  comboFinisherTimer: number;
  airDashing: number; airDashDir: number; airDashUsed: boolean;
  chargeTimer: number; charging: boolean;
}

export interface Enemy {
  type: EnemyType;
  x: number; y: number; vx: number; vy: number;
  w: number; h: number; facing: number;
  grounded: boolean; hp: number; maxHp: number;
  speed: number; damage: number; attackRange: number;
  color: string;
  invuln: number; anim: string; animFrame: number; animTimer: number;
  patrol: number; patrolOrigin: number; patrolDir: number;
  alertTimer: number; attackTimer: number;
  stunTimer: number; dead: boolean; deathTimer: number;
  windupTimer: number; idleTimer: number;
  // Boss-specific
  phase?: number; phaseTimer?: number; specialTimer?: number;
  slamTimer?: number; teleportTimer?: number; summonTimer?: number;
  // Shielder-specific
  blocking?: boolean;
  // Mage-specific
  castTimer?: number;
  blinkTimer?: number;
  shieldActive?: boolean;
  mageShieldHP?: number;
}

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; life: number; maxLife: number; size: number;
}

export interface Projectile {
  x: number; y: number; vx: number; vy: number;
  damage: number; fromPlayer: boolean; life: number;
  w: number; h: number; isSlam?: boolean;
}

export interface Pickup {
  type: PickupType; x: number; y: number;
  vy?: number; vx?: number; life?: number;
}

export interface MovingPlatform {
  x: number; y: number; w: number; h: number;
  dx: number; dy: number; range: number; speed: number;
  originX?: number; originY?: number; t?: number;
  vx?: number; vy2?: number;
}

export interface Crate {
  x: number; y: number; w: number; h: number;
  hp: number; maxHp: number; shakeTimer: number;
}

export interface Trap {
  type: TrapType; x: number; y: number;
  len?: number; angle?: number;
  timer?: number; active?: boolean;
}

export interface FloatingText {
  x: number; y: number; text: string; color: string;
  life: number; maxLife: number; vy: number;
}

export interface DialogueLine {
  speaker: string; text: string;
}

export interface ShopItem {
  name: string; cost: number; action: () => void;
}

export interface EnemyDef {
  type: EnemyType; x: number; y: number; patrol?: number;
}

export interface PickupDef {
  type: PickupType; x: number; y: number;
}

export interface MovingPlatformDef {
  x: number; y: number; w: number; h: number;
  dx: number; dy: number; range: number; speed: number;
}

export interface CrateDef { x: number; y: number; }

export interface TrapDef {
  type: TrapType; x: number; y: number; len?: number;
}

export interface LevelData {
  width: number; height: number;
  tiles: number[][];
  spawn: Vec2;
  enemies: EnemyDef[];
  pickups: PickupDef[];
  movingPlatforms: MovingPlatformDef[];
  crates: CrateDef[];
  traps: TrapDef[];
  bg: BgType;
}

export interface PersistentState {
  swordLevel: number; hasDoubleJump: boolean;
  hasShield: boolean; shieldHP: number;
  maxHpBonus: number; staminaBonus: number;
}

export interface CamelotState {
  phase: CamelotPhase;
  gameRunning: boolean;
  gameTime: number;
  camera: Vec2;
  currentLevel: number;
  player: Player;
  enemies: Enemy[];
  particles: Particle[];
  projectiles: Projectile[];
  pickups: Pickup[];
  movingPlatforms: MovingPlatform[];
  crates: Crate[];
  traps: Trap[];
  levelData: LevelData;
  allLevels: LevelData[];
  totalKills: number; totalCoins: number; totalTime: number;
  shake: number; hitFreeze: number;
  fadeAlpha: number; fadeDir: number; fadeCallback: (() => void) | null;
  dialogueQueue: DialogueLine[];
  dialogueActive: boolean;
  floatingTexts: FloatingText[];
  playerXP: number; playerLevel: number;
  persistentState: PersistentState;
  introCamera: { tx: number; ty: number; timer: number; phase: string } | null;
  timeScale: number;
  vignetteTimer: number; vignetteColor: string;
  cameraZoom: number;
  checkpointActive: { x: number; y: number; levelIdx: number } | null;
  lives: number;
  shopActive: boolean; shopItems: ShopItem[];
  shopSelection: number;
  crtEnabled: boolean;
  // Score tally
  tallyTimer: number;
  tallyData: { kills: number; coins: number; time: number; levelName: string } | null;
  // Persistent save
  bestTime: number;
  bestKills: number;
  // Weather
  weatherParticles: Array<{ x: number; y: number; vx: number; vy: number; life: number; size: number }>;
  // Blood moon event
  bloodMoonTimer: number;
  bloodMoonActive: boolean;
  // Input state
  keys: Record<string, boolean>;
  justPressed: Record<string, boolean>;
  gpButtons: Record<number, boolean>;
  gpJustPressed: Record<number, boolean>;
  gpAxes: number[];
}
