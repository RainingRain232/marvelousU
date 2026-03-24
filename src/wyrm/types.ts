// ---------------------------------------------------------------------------
// Wyrm — Type definitions (v7)
// ---------------------------------------------------------------------------

export enum WyrmPhase {
  START = "start",
  PLAYING = "playing",
  PAUSED = "paused",
  DEAD = "dead",
  BLESSING = "blessing", // choosing a blessing at evolution
}

export enum Direction { UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3 }

export enum PickupKind {
  SHEEP = "sheep",
  KNIGHT = "knight",
  TREASURE = "treasure",
  POTION = "potion",
  FIRE_SCROLL = "fire_scroll",
  SHIELD = "shield",
  PORTAL = "portal",
  GOLDEN_SHEEP = "golden_sheep",
  MAGNET = "magnet",
}

export interface Cell { x: number; y: number; }
export interface Pickup { x: number; y: number; kind: PickupKind; age: number; }

export interface RoamingKnight {
  x: number; y: number; dir: Direction;
  moveTimer: number; alive: boolean; chasing: boolean;
}

export interface BossKnight {
  x: number; y: number; dir: Direction;
  moveTimer: number; hp: number; maxHp: number;
  alive: boolean; flashTimer: number;
  chargeTimer: number; charging: boolean; chargeDir: Direction;
}

/** Archer knight — sits at wall edges and fires projectiles */
export interface ArcherKnight {
  x: number; y: number; dir: Direction;
  fireTimer: number; alive: boolean;
  warnTimer: number; // > 0 means warning telegraph before shot
}

/** Projectile fired by archer knight */
export interface Projectile {
  x: number; y: number; dir: Direction;
  moveTimer: number; alive: boolean;
}

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: number; size: number;
}

export interface FloatingText {
  x: number; y: number; text: string; color: number;
  life: number; maxLife: number; scale: number;
}

export interface DeathSegment {
  x: number; y: number; vx: number; vy: number;
  rotation: number; rotSpeed: number; color: number; radius: number; life: number;
}

export interface TrailCell {
  x: number; y: number; life: number; maxLife: number; color: number;
}

/** Poison swamp tile — shrinks wyrm on contact */
export interface PoisonTile {
  x: number; y: number;
  life: number; // seconds remaining before despawn
}

export interface WyrmColors { head: number; body: number; bodyAlt: number; name: string; }

/** Persistent upgrades bought with dragon coins */
export interface WyrmUpgrades {
  extraStartLength: number;   // 0-3, each adds +1 start length
  longerFire: number;         // 0-2, each adds +2s fire duration
  fasterLunge: number;        // 0-2, each reduces lunge cooldown by 1s
  thickerShield: number;      // 0-1, shield absorbs 2 hits instead of 1
  poisonResist: number;       // 0-2, each reduces poison shrink by 1
  comboKeeper: number;        // 0-2, each adds +0.5s combo window
}

export type SynergyKind = "blaze" | "juggernaut" | "inferno_pull" | "fortress" | null;

/** Blessing — permanent in-run perk chosen at evolution */
export interface Blessing {
  id: string;
  name: string;
  desc: string;
  color: number;
}

export interface WyrmState {
  phase: WyrmPhase;
  cols: number; rows: number;
  body: Cell[];
  direction: Direction; nextDirection: Direction; dirQueue: Direction[];
  moveTimer: number; moveInterval: number; moveFraction: number;
  pickups: Pickup[];
  pickupTimer: number;
  knights: RoamingKnight[];
  knightSpawnTimer: number;
  boss: BossKnight | null;
  poisonTiles: PoisonTile[];
  // Archers & projectiles
  archerKnights: ArcherKnight[];
  projectiles: Projectile[];
  archerSpawnTimer: number;
  // Score
  score: number; highScore: number; length: number;
  comboCount: number; comboTimer: number; comboMultiplier: number; bestCombo: number;
  fireBreathTimer: number; speedBoostTimer: number;
  shieldHits: number; // how many hits shield can still absorb (0=none)
  // Lunge ability
  lungeCooldown: number;
  lungeFlash: number; // visual flash timer when lunging
  // Grace period (invulnerability after shield break)
  gracePeriod: number;
  // Magnet powerup
  magnetBoostTimer: number;
  baseMagnetRadius: number;
  // Max combo reward
  comboInvulnTimer: number;
  // Hitstop (freeze frames)
  hitstopTimer: number;
  // Synergies
  activeSynergy: SynergyKind;
  synergyAnnouncedThisFrame: boolean;
  // Breakable walls
  breakableWalls: Set<string>;
  // Wave events
  lastWaveEvent: string;
  // Stats
  sheepEaten: number; knightsEaten: number; treasureCollected: number; bossesKilled: number;
  archersKilled: number; projectilesDeflected: number;
  time: number;
  particles: Particle[]; floatingTexts: FloatingText[];
  deathSegments: DeathSegment[]; trail: TrailCell[];
  screenShake: number; screenFlashColor: number; screenFlashTimer: number;
  walls: Cell[];
  grassTufts: { x: number; y: number; size: number; shade: number }[];
  wave: number; waveTimer: number;
  slowMoTimer: number;
  lastMilestone: number;
  lastColorTier: number;
  // Upgrade-derived values (set at game start from meta)
  fireUpgrade: number;   // extra fire duration tiers
  shieldUpgrade: number; // extra shield hit tiers
  poisonResistUpgrade: number; // poison shrink reduction
  comboKeeperUpgrade: number; // extra combo window tiers
  magnetRadius: number;
  // Blessings (chosen at evolution tiers)
  blessings: string[];
  blessingChoices: Blessing[]; // 3 options presented during BLESSING phase
  // Wrath meter
  wrathMeter: number;   // 0-100
  wrathTimer: number;   // > 0 = wrath mode active
  wrathAnnouncedThisFrame: boolean;
  // Tail whip
  tailWhipCooldown: number;
  tailWhipFlash: number;
  // Event flags (set by systems, cleared by orchestrator after audio)
  portalUsedThisFrame: boolean;
}

export interface WyrmMeta {
  highScore: number; bestLength: number; bestCombo: number;
  gamesPlayed: number; totalSheepEaten: number; totalKnightsEaten: number;
  totalTimePlayed: number; totalBossesKilled: number;
  dragonCoins: number; // persistent currency
  upgrades: WyrmUpgrades;
}
