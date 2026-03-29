// ---------------------------------------------------------------------------
// Kingdom – Types & Interfaces (v4)
// ---------------------------------------------------------------------------

export enum KingdomPhase {
  TITLE = "title",
  CHAR_SELECT = "char_select",
  LEVEL_INTRO = "level_intro",
  PLAYING = "playing",
  PAUSED = "paused",
  PAUSE_CONTROLS = "pause_controls",
  PAUSE_INTRO = "pause_intro",
  PAUSE_CONCEPTS = "pause_concepts",
  BONUS_ROOM = "bonus_room",
  DYING = "dying",
  LEVEL_CLEAR = "level_clear",
  GAME_OVER = "game_over",
  VICTORY = "victory",
}

export enum KingdomChar {
  ARTHUR = "arthur",
  MERLIN = "merlin",
  GUINEVERE = "guinevere",
  LANCELOT = "lancelot",
}

export const CHAR_NAMES: Record<KingdomChar, string> = {
  [KingdomChar.ARTHUR]: "Arthur",
  [KingdomChar.MERLIN]: "Merlin",
  [KingdomChar.GUINEVERE]: "Guinevere",
  [KingdomChar.LANCELOT]: "Lancelot",
};

export const CHAR_LIST: KingdomChar[] = [
  KingdomChar.ARTHUR, KingdomChar.MERLIN, KingdomChar.GUINEVERE, KingdomChar.LANCELOT,
];

export enum PowerState { SMALL = 0, BIG = 1, FIRE = 2 }

export enum TileType {
  EMPTY = 0, GROUND = 1, GROUND_TOP = 2, BRICK = 3,
  QUESTION = 4, USED_QUESTION = 5,
  PIPE_TL = 6, PIPE_TR = 7, PIPE_BL = 8, PIPE_BR = 9,
  CASTLE_WALL = 10, CASTLE_FLOOR = 11,
  FLAG_POLE = 12, FLAG_TOP = 13, LAVA = 14, BRIDGE = 15,
  COIN_BLOCK = 16, SPRING = 17, HIDDEN = 18,
  PIPE_ENTER_L = 19, PIPE_ENTER_R = 20,
  ONE_WAY = 21,
}

export enum EnemyType {
  GOBLIN = "goblin", DARK_KNIGHT = "dark_knight", SKELETON = "skeleton",
  DRAGON = "dragon", BAT = "bat", BOAR = "boar",
}

export enum ItemType {
  COIN = "coin", POTION = "potion", DRAGON_BREATH = "dragon_breath",
  GRAIL_STAR = "grail_star", LIFE_UP = "life_up",
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface Player {
  x: number; y: number;
  vx: number; vy: number;
  width: number; height: number;
  power: PowerState;
  facing: number;
  grounded: boolean;
  jumping: boolean;
  running: boolean;
  invincibleTimer: number;
  starTimer: number;
  deathTimer: number;
  growTimer: number;
  shrinkTimer: number;
  hasDoubleJumped: boolean;
  hoverTimer: number;
  dashTimer: number;
  dashCooldown: number;
  swordTimer: number;
  swordCooldown: number;
  stompCombo: number;
  stompComboTimer: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  wallSlideDir: number;
  crouching: boolean;
  slideTimer: number;
  onPlatformIdx: number;
  // Landing impact
  landingTimer: number;
  lastAirVy: number;
  // Animation
  animFrame: number;
  animTimer: number;
  skidding: boolean;
}

export interface Enemy {
  type: EnemyType;
  x: number; y: number;
  vx: number; vy: number;
  width: number; height: number;
  alive: boolean;
  isShell: boolean;
  shellMoving: boolean;
  hp: number;
  attackTimer: number;
  animFrame: number;
  animTimer: number;
  facing: number;
  stompBounce: number;
  deathTimer: number;
  homeY: number;
  swooping: boolean;
  charging: boolean;
  chargeSpeed: number;
  // Awareness
  alertTimer: number;
}

export interface GameItem {
  type: ItemType;
  x: number; y: number;
  vx: number; vy: number;
  width: number; height: number;
  active: boolean;
  emerging: boolean;
  emergeY: number;
}

export interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  width: number; height: number;
  active: boolean;
  fromPlayer: boolean;
  bounceCount: number;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: number; size: number;
}

export interface BlockAnim { col: number; row: number; timer: number; offsetY: number; }
export interface CoinAnim { x: number; y: number; vy: number; timer: number; }

export interface ScorePopup {
  x: number; y: number;
  value: number; timer: number;
  text?: string; // optional text override like "COMBO x4!"
  color?: number;
  big?: boolean;
}

export interface MovingPlatform {
  x: number; y: number; width: number;
  startX: number; startY: number; endX: number; endY: number;
  speed: number; progress: number; direction: number;
}

export interface BonusRoom {
  tiles: TileType[][];
  floatingCoins: FloatingCoin[];
  width: number; height: number;
  startX: number; startY: number;
  exitX: number; exitY: number;
  returnX: number; returnY: number; // where to return in main level
}

// ---------------------------------------------------------------------------
// Level data
// ---------------------------------------------------------------------------

export interface EnemySpawn { type: EnemyType; col: number; row: number; }
export interface MovingPlatformSpawn {
  x: number; y: number; width: number;
  endX: number; endY: number; speed: number;
}
export interface PipeEntrance { col: number; row: number; bonusRoomIdx: number; }

export interface LevelData {
  tiles: TileType[][]; enemies: EnemySpawn[];
  width: number; height: number;
  startX: number; startY: number;
}

// ---------------------------------------------------------------------------
// Full game state
// ---------------------------------------------------------------------------

export interface FloatingCoin {
  x: number; y: number;
  collected: boolean; bobOffset: number;
}

export interface KingdomState {
  phase: KingdomPhase;
  character: KingdomChar;
  charSelectIndex: number;

  player: Player;

  world: number; level: number;
  tiles: TileType[][];
  levelWidth: number; levelHeight: number;

  enemies: Enemy[];
  items: GameItem[];
  projectiles: Projectile[];
  particles: Particle[];
  blockAnims: BlockAnim[];
  coinAnims: CoinAnim[];
  scorePopups: ScorePopup[];
  floatingCoins: FloatingCoin[];
  movingPlatforms: MovingPlatform[];

  score: number; coins: number; lives: number; time: number;

  cameraX: number; cameraTargetX: number;
  screenShakeTimer: number; screenShakeIntensity: number;

  levelIntroTimer: number; levelClearTimer: number;
  flagSliding: boolean; flagSlideY: number; walkingToEnd: boolean;

  coinBlockHits: Map<string, number>;
  pauseMenuIndex: number;

  // Checkpoint
  checkpointX: number; checkpointY: number; hasCheckpoint: boolean;

  // Bonus room
  bonusRoom: BonusRoom | null;
  bonusRoomSavedTiles: TileType[][] | null;
  bonusRoomSavedCamera: number;
  bonusRoomSavedCoins: FloatingCoin[];
  pipeEntrances: PipeEntrance[];

  // Dragon boss death
  bossDeathTimer: number;
  bossDeathActive: boolean;

  sw: number; sh: number; tileSize: number;

  highScore: number;
  questionBlockItems: Map<string, ItemType>;
  totalEnemiesKilled: number;
  totalCoinsCollected: number;
}
