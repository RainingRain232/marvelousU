// ---------------------------------------------------------------------------
// Echo — Type definitions
// Time-loop arena: record actions, replay as ghosts
// ---------------------------------------------------------------------------

export enum EchoPhase {
  START = "start",
  RECORDING = "recording",     // actively playing + recording a loop
  LOOP_COMPLETE = "loop_complete", // brief pause between loops
  DEAD = "dead",
  VICTORY = "victory",
  PAUSED = "paused",
}

export interface Vec2 { x: number; y: number; }

/** One frame of recorded input */
export interface RecordFrame {
  x: number; y: number;        // position
  aimAngle: number;
  shooting: boolean;
}

/** A completed time loop that replays as a ghost */
export interface GhostLoop {
  frames: RecordFrame[];
  color: number;
}

export interface EchoEnemy {
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  radius: number;
  speed: number;
  color: number;
  alive: boolean;
  deathTimer: number;
  flashTimer: number;
  attackTimer: number;
  tier: number;                // scales with loop count
  isElite: boolean;
  isRusher: boolean;
  isBoss: boolean;
}

export interface Bullet {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  damage: number;
  color: number;
  life: number;
  fromPlayer: boolean;         // true = player/ghost, false = enemy
  fromGhost: boolean;          // true = fired by a ghost (not the player)
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: number; size: number;
}

export interface FloatingText {
  x: number; y: number;
  text: string; color: number;
  life: number; maxLife: number;
}

export interface EchoState {
  phase: EchoPhase;
  arenaW: number; arenaH: number;

  // Player
  px: number; py: number;
  aimAngle: number;
  hp: number; maxHp: number;
  invincibleTimer: number;
  shootCooldown: number;

  // Time loop system
  loopNumber: number;          // current loop (1-5)
  loopTimer: number;           // seconds into current loop
  loopDuration: number;        // seconds per loop
  currentRecording: RecordFrame[];
  ghosts: GhostLoop[];         // completed ghost loops
  recordingFrame: number;      // frame counter for recording

  // Ghost replay
  ghostFrame: number;          // current playback frame for ghosts

  // Combat
  enemies: EchoEnemy[];
  bullets: Bullet[];
  enemySpawnTimer: number;

  // Loop upgrades (persistent within a run)
  upgradeFireRate: number;     // levels of fire rate upgrade
  upgradeBulletSize: number;
  upgradeSpeed: number;
  upgradeMaxHp: number;

  // Score
  score: number; highScore: number;
  totalKills: number;
  ghostKills: number;          // kills by ghost bullets specifically
  combo: number; comboTimer: number; bestCombo: number;

  // Loop transition effect
  loopTransitionTimer: number;
  timePressure: number;
  intensity: number;

  // Time stop ability (unlocked at 3 ghosts)
  timeStopCooldown: number;
  timeStopActive: number;      // >0 = enemies frozen

  // Boss tracking
  bossSpawned: boolean;
  bossAlive: boolean;

  // Timing
  time: number;

  // VFX
  particles: Particle[];
  floatingTexts: FloatingText[];
  screenShake: number;
  screenFlashColor: number;
  screenFlashTimer: number;
}

export interface EchoMeta {
  highScore: number;
  bestLoop: number;
  totalKills: number;
  gamesPlayed: number;
}
