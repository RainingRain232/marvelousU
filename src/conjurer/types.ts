// ---------------------------------------------------------------------------
// Conjurer — Type definitions
// Bullet-hell spell arena survival
// ---------------------------------------------------------------------------

export enum ConjurerPhase {
  START = "start",
  PLAYING = "playing",
  PAUSED = "paused",
  WAVE_CLEAR = "wave_clear",
  DEAD = "dead",
  VICTORY = "victory",
}

export enum SpellElement {
  FIRE = "fire",         // expanding ring AOE
  ICE = "ice",           // cone spray of shards
  LIGHTNING = "lightning",// chain between nearby enemies
  VOID = "void",         // gravity pull + damage pulse
}

export enum EnemyType {
  THRALL = "thrall",       // slow melee rusher
  ARCHER = "archer",       // stops to shoot projectiles
  KNIGHT = "knight",       // shielded, takes more hits
  WRAITH = "wraith",       // fast, phases through briefly
  GOLEM = "golem",         // slow, huge HP, boss-lite
  SORCERER = "sorcerer",   // teleports, shoots homing orbs
}

export enum EnemyState {
  ALIVE = "alive",
  DYING = "dying",
  DEAD = "dead",
}

export interface Vec2 { x: number; y: number; }

export interface Enemy {
  x: number; y: number;
  vx: number; vy: number;
  type: EnemyType;
  state: EnemyState;
  hp: number; maxHp: number;
  speed: number;
  radius: number;
  color: number;
  deathTimer: number;
  attackTimer: number;
  // Wraith phase
  phaseTimer: number;
  phased: boolean;
  // Sorcerer teleport
  teleportTimer: number;
  // Flash on hit
  flashTimer: number;
  // Frozen/slowed
  slowFactor: number;
  slowTimer: number;
}

export interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  damage: number;
  color: number;
  life: number;
  element: SpellElement | null; // null = enemy projectile
  piercing: boolean;
  chain: number;               // lightning chains remaining
  homing: boolean;             // sorcerer orbs track the player
}

export interface SpellEffect {
  x: number; y: number;
  element: SpellElement;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  damage: number;
  // Void pull
  pullStrength: number;
}

export interface ManaCrystal {
  x: number; y: number;
  value: number;
  life: number;
  magnetized: boolean;
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

export interface ConjurerState {
  phase: ConjurerPhase;
  arenaW: number;
  arenaH: number;

  // Player
  px: number; py: number;
  pSpeed: number;
  aimAngle: number;          // radians
  hp: number; maxHp: number;
  mana: number; maxMana: number;
  invincibleTimer: number;

  // Dodge roll
  dodgeCooldown: number;
  dodgeTimer: number;           // >0 = currently rolling
  dodgeDirX: number;
  dodgeDirY: number;

  // Ultimate
  ultimateCharge: number;       // 0-100
  ultimateActive: number;       // >0 = ultimate is firing

  // Spells
  activeElement: SpellElement;
  spellCooldowns: Record<SpellElement, number>;
  spellLevels: Record<SpellElement, number>; // 1-5, increases with mana spent

  // Combat
  enemies: Enemy[];
  projectiles: Projectile[];
  spellEffects: SpellEffect[];
  manaCrystals: ManaCrystal[];

  // Waves
  wave: number;
  waveTimer: number;          // countdown to next wave
  waveEnemiesRemaining: number;
  waveSpawnTimer: number;
  waveSpawnCount: number;
  isBossWave: boolean;
  bossAlive: boolean;
  waveClearTimer: number;     // brief pause between waves

  // Score
  score: number;
  highScore: number;
  combo: number;
  comboTimer: number;
  bestCombo: number;
  totalKills: number;
  totalManaCollected: number;

  // Timing
  time: number;

  // VFX
  particles: Particle[];
  floatingTexts: FloatingText[];
  screenShake: number;
  screenFlashColor: number;
  screenFlashTimer: number;
  lightningArcs: { x1: number; y1: number; x2: number; y2: number; life: number }[];
  spawnWarnings: { x: number; y: number; timer: number }[];

  // Arena pulse (visual heartbeat when low HP)
  arenaPulse: number;

  // Arena hazard zone (rotating danger beam)
  hazardAngle: number;
  hazardActive: boolean;

  // Passive aura timer (ticks element-specific aura effect)
  auraTimer: number;

  // Cooldown ready tracking (for audio ping)
  prevCooldowns: Record<SpellElement, number>;
}

export interface ConjurerUpgrades {
  maxHp: number;        // 0-3, each +1 HP
  manaRegen: number;    // 0-3, each +1 mana/sec
  auraRange: number;    // 0-2, each +15 aura radius
  magnetRange: number;  // 0-2, each +20 magnet radius
  dodgeSpeed: number;   // 0-2, each -0.1s cooldown
}

export interface ConjurerMeta {
  highScore: number;
  bestWave: number;
  bestCombo: number;
  totalKills: number;
  gamesPlayed: number;
  arcaneShards: number;
  upgrades: ConjurerUpgrades;
}
