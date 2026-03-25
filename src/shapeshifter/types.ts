// ---------------------------------------------------------------------------
// Shapeshifter — Type definitions
// Transform between Wolf, Eagle, and Bear forms mid-combat
// ---------------------------------------------------------------------------

export enum SSPhase { START = "start", PLAYING = "playing", PAUSED = "paused", DEAD = "dead" }
export type SSForm = "wolf" | "eagle" | "bear";
export type SSEnemyKind = "goblin" | "orc_archer" | "troll" | "shadow_wolf" | "dark_druid";

export type SSBossKind = "alpha_beast" | "ancient_treant" | "chimera";

export interface SSBoss {
  x: number; y: number;
  hp: number; maxHp: number;
  kind: SSBossKind;
  radius: number; speed: number;
  phase: number; phaseTimer: number;
  attackTimer: number;
  alive: boolean; flashTimer: number;
}

export interface SSEnemy {
  eid: string;
  x: number; y: number; hp: number; maxHp: number;
  kind: SSEnemyKind; alive: boolean; radius: number;
  speed: number; baseSpeed: number; flashTimer: number;
  state: "approach" | "attack" | "stunned" | "flee";
  stateTimer: number; stunTimer: number;
  spawnTimer: number; elite: boolean;
  fireTimer: number; // orc_archer fire cooldown
  summonTimer: number; // dark_druid summon cooldown
}

export interface SSProjectile {
  x: number; y: number; vx: number; vy: number;
  damage: number; radius: number; life: number;
  color: number; fromEnemy: boolean;
  kind: "feather" | "thorn" | "arrow";
}

export interface SSSlash {
  x: number; y: number; angle: number; radius: number;
  life: number; maxLife: number; damage: number;
  form: SSForm; hitIds: string[];
}

export interface SSAlly {
  x: number; y: number; hp: number; maxHp: number;
  kind: SSForm; // wolf/eagle/bear ally
  speed: number; radius: number; life: number;
  attackTimer: number; targetEid: string;
}

export interface SSParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: number; size: number;
}

export interface SSFloatText {
  x: number; y: number; text: string; color: number;
  life: number; maxLife: number; scale: number;
}

export interface SSShockwave {
  x: number; y: number; radius: number; maxRadius: number;
  life: number; maxLife: number; color: number;
}

export interface SSPickup {
  x: number; y: number;
  kind: "health" | "form_charge" | "score_orb";
  life: number; radius: number;
}

export interface SSHazard {
  x: number; y: number;
  kind: "bramble" | "swamp" | "spirit_well";
  radius: number;
  life: number; maxLife: number;
  active: boolean; activeTimer: number;
}

export interface SSState {
  phase: SSPhase; time: number;
  arenaW: number; arenaH: number;
  // Player
  playerX: number; playerY: number; playerRadius: number;
  playerHP: number; maxHP: number;
  aimAngle: number; moveAngle: number;
  invulnTimer: number;
  // Form system
  currentForm: SSForm;
  formSwitchTimer: number; // brief cooldown on switch
  formSwitchCooldown: number;
  // Wolf form
  wolfLungeTimer: number; wolfLunging: boolean; wolfLungeAngle: number;
  wolfSprintTimer: number; wolfSprinting: boolean;
  // Eagle form
  eagleBoltCooldown: number;
  eagleDiving: boolean; eagleDiveX: number; eagleDiveY: number; eagleDiveTimer: number;
  eagleDiveCooldown: number;
  // Bear form
  bearSwipeCooldown: number;
  bearRoarCooldown: number;
  bearSlamCooldown: number; // ultimate
  // Combat
  enemies: SSEnemy[];
  projectiles: SSProjectile[];
  slashes: SSSlash[];
  allies: SSAlly[];
  particles: SSParticle[];
  floatTexts: SSFloatText[];
  shockwaves: SSShockwave[];
  pickups: SSPickup[];
  // Wave
  wave: number; waveTimer: number; enemySpawnTimer: number;
  enemiesKilled: number; totalKills: number;
  waveEventActive: string; waveAnnounceTimer: number;
  // Scoring
  score: number; comboCount: number; comboTimer: number;
  killStreakCount: number; killStreakTimer: number;
  bestCombo: number;
  // Screen effects
  screenShake: number; screenFlashTimer: number; screenFlashColor: number;
  hitstopFrames: number;
  // Meta
  nextEnemyId: number; nextAllyId: number;
  bloodStains: Array<{ x: number; y: number; size: number; alpha: number }>;
  footstepTimer: number;
  // Arena hazards
  arenaHazards: SSHazard[];
  // Boss
  boss: SSBoss | null;
  bossWave: boolean;
  bossAnnounceTimer: number;
  // Form mastery — kills per form
  formKills: Record<SSForm, number>;
  formMastery: Record<SSForm, number>;
  // Cooldown timers (used with (state as any) — now properly typed)
  wolfLungeCooldownTimer: number;
  wolfSprintCooldownTimer: number;
  wolfUltCooldownTimer: number;
  eagleUltCooldownTimer: number;
  whirlwindTimer: number;
  whirlwindDamageTimer: number;
  bloodMoonActive: boolean;
  // Form switch synergy
  formSwitchCombo: number;
  formSwitchComboTimer: number;
  // Upgrade power levels
  wolfPowerLevel: number;
  eaglePowerLevel: number;
  bearPowerLevel: number;
  allyDurationBonus: number;
}

export interface SSMeta {
  highScore: number; bestWave: number; gamesPlayed: number;
  shards: number;
  upgrades: {
    maxHP: number;        // +1 HP per level (max 3)
    wolfPower: number;    // +20% wolf damage per level (max 3)
    eaglePower: number;   // +20% eagle damage per level (max 3)
    bearPower: number;    // +20% bear damage per level (max 3)
    allyDuration: number; // +3s ally duration per level (max 2)
  };
}
