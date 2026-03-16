// ---------------------------------------------------------------------------
// Panzer Dragoon mode — wave spawning system
// ---------------------------------------------------------------------------

import type { DragoonState, DragoonEnemy, DragoonDestructible } from "../state/DragoonState";
import { DragoonEnemyType, EnemyPattern, DestructibleType } from "../state/DragoonState";
import {
  DragoonBalance, ENEMY_TEMPLATES, WAVE_ENEMY_POOL, BOSS_ORDER,
  FORK_POINTS, DESTRUCTIBLE_TEMPLATES, DESTRUCTIBLE_POOL,
  DESTRUCTIBLES_PER_WAVE_BASE, DESTRUCTIBLES_PER_WAVE_GROWTH,
} from "../config/DragoonConfig";

let _spawnAccumulator = 0;
let _forkCallback: ((state: DragoonState) => void) | null = null;

export const DragoonWaveSystem = {
  reset(): void {
    _spawnAccumulator = 0;
    _forkCallback = null;
  },

  setForkCallback(cb: ((state: DragoonState) => void) | null): void {
    _forkCallback = cb;
  },

  update(state: DragoonState, dt: number): void {
    if (state.gameOver || state.victory) return;

    // If a fork choice is active, wait for player selection
    if (state.branchState.forkActive) return;

    // Between waves countdown
    if (state.betweenWaves) {
      state.betweenWaveTimer -= dt;
      if (state.betweenWaveTimer <= 0) {
        state.betweenWaves = false;
        state.wave++;
        if (state.wave > state.totalWaves) {
          state.victory = true;
          return;
        }
        _startWave(state);
      }
      return;
    }

    // During wave: spawn enemies
    state.waveTimer += dt;

    const spawnRate = Math.max(
      DragoonBalance.ENEMY_SPAWN_RATE_MIN,
      DragoonBalance.ENEMY_SPAWN_RATE_BASE - state.wave * 0.04,
    );

    _spawnAccumulator += dt;
    while (_spawnAccumulator >= spawnRate && state.waveEnemiesSpawned < state.waveEnemiesTotal) {
      _spawnAccumulator -= spawnRate;
      _spawnEnemy(state);
      state.waveEnemiesSpawned++;
    }

    // Check wave end: all enemies spawned and all dead (exclude allied)
    const allDead = state.enemies.every(e => !e.alive || e.isAllied);
    if (state.waveEnemiesSpawned >= state.waveEnemiesTotal && allDead) {
      _endWave(state);
    }

    // Also end wave if timer expired (safety)
    if (state.waveTimer >= state.waveDuration + 10) {
      for (const e of state.enemies) {
        if (!e.isAllied) e.alive = false;
      }
      _endWave(state);
    }
  },

  /** Called externally when the player selects a fork path (index 0 or 1). */
  selectForkPath(state: DragoonState, index: number): void {
    const fork = state.branchState.currentFork;
    if (!fork || !state.branchState.forkActive) return;

    const choice = fork.choices[index];
    if (!choice) return;

    state.branchState.forkActive = false;
    state.branchState.chosenPath = choice.pathId;
    state.branchState.pathHistory.push(choice.pathId);
    state.branchState.pathDifficultyMod = choice.difficultyMod;
    state.branchState.pathScoreMult = choice.bonusScoreMult;
    state.branchState.pathEnemyPool = choice.enemyPool;
    state.branchState.pathBoss = choice.bossType;
    state.branchState.currentFork = null;

    // Resume the between-waves timer
    state.paused = false;
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _startWave(state: DragoonState): void {
  const isBossWave = state.wave % state.bossWaveInterval === 0;
  state.bossActive = isBossWave;
  state.waveTimer = 0;
  state.waveEnemiesSpawned = 0;
  _spawnAccumulator = 0;

  state.waveDuration = DragoonBalance.WAVE_DURATION_BASE + state.wave * DragoonBalance.WAVE_DURATION_GROWTH;
  state.waveEnemiesTotal = DragoonBalance.ENEMY_COUNT_BASE + state.wave * DragoonBalance.ENEMY_COUNT_GROWTH;

  // Remove dead enemies from previous wave (keep allied)
  state.enemies = state.enemies.filter(e => e.alive);

  // Score attack: track perfect wave
  if (state.scoreAttack.enabled) {
    state.scoreAttack.currentWaveDamageTaken = false;
  }

  if (isBossWave) {
    // Use path-override boss if available, otherwise default order
    let bossType: DragoonEnemyType;
    if (state.branchState.pathBoss) {
      bossType = state.branchState.pathBoss;
      state.branchState.pathBoss = null; // consume override
    } else {
      const bossIdx = Math.floor((state.wave / state.bossWaveInterval) - 1) % BOSS_ORDER.length;
      bossType = BOSS_ORDER[bossIdx];
    }
    _spawnBoss(state, bossType);
    state.bossEntranceTimer = 3.0;
    state.bossEntranceName = _getBossDisplayName(bossType);
    state.waveEnemiesTotal = Math.floor(state.waveEnemiesTotal * 0.5);
  }

  // Spawn destructible environment objects
  _spawnDestructibles(state);
}

function _endWave(state: DragoonState): void {
  state.betweenWaves = true;
  state.betweenWaveTimer = DragoonBalance.BETWEEN_WAVE_PAUSE;
  state.bossActive = false;

  // Heal player a bit between waves
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + 15);
  state.player.mana = Math.min(state.player.maxMana, state.player.mana + 30);

  // Score attack: check for perfect wave bonus
  if (state.scoreAttack.enabled && !state.scoreAttack.currentWaveDamageTaken) {
    state.scoreAttack.perfectWaves++;
  }

  // Check for fork points — trigger branching path choice
  _checkForkPoint(state);

  // Clear path-specific enemy pool override after the wave ends
  // (fork selection will set a new one if applicable)
}

function _checkForkPoint(state: DragoonState): void {
  for (const fork of FORK_POINTS) {
    if (state.wave === fork.afterWave) {
      // Don't show forks already chosen in this run
      const alreadyChosen = fork.choices.some(c =>
        state.branchState.pathHistory.includes(c.pathId),
      );
      if (alreadyChosen) continue;

      state.branchState.forkActive = true;
      state.branchState.currentFork = fork;
      state.paused = true;
      _forkCallback?.(state);
      return;
    }
  }
}

function _getEnemyPool(state: DragoonState): DragoonEnemyType[] {
  // If branch path has an override pool, use it
  if (state.branchState.pathEnemyPool && state.branchState.pathEnemyPool.length > 0) {
    return state.branchState.pathEnemyPool;
  }
  const tier = Math.min(Math.floor((state.wave - 1) / 4), WAVE_ENEMY_POOL.length - 1);
  return WAVE_ENEMY_POOL[tier];
}

function _spawnEnemy(state: DragoonState): void {
  const pool = _getEnemyPool(state);
  const type = pool[Math.floor(Math.random() * pool.length)];
  const template = ENEMY_TEMPLATES[type];
  if (!template) return;

  const pathDiffMod = state.branchState.pathDifficultyMod;
  const hpScale = (1 + state.wave * DragoonBalance.ENEMY_HP_SCALE) * pathDiffMod;
  const sw = state.screenW;
  const sh = state.screenH;

  const camRight = state.cameraX + sw;
  let x: number, y: number;
  let vx = 0, vy = 0;

  if (template.isGround) {
    x = camRight + 40;
    y = sh - 60 - Math.random() * 30;
    vx = -template.speed;
  } else {
    if (Math.random() < 0.2) {
      x = state.cameraX + 100 + Math.random() * (sw - 200);
      y = -40;
      vx = -template.speed * 0.3;
      vy = template.speed * 0.7;
    } else {
      x = camRight + 40;
      y = 60 + Math.random() * (sh * 0.65);
      vx = -template.speed;
      vy = (Math.random() - 0.5) * template.speed * 0.3;
    }
  }

  const enemy: DragoonEnemy = {
    id: state.nextId++,
    type: template.type,
    position: { x, y },
    velocity: { x: vx, y: vy },
    hp: Math.floor(template.hp * hpScale),
    maxHp: Math.floor(template.hp * hpScale),
    alive: true,
    isBoss: false,
    bossPhase: 0,
    attackTimer: template.fireRate + Math.random() * template.fireRate,
    hitTimer: 0,
    deathTimer: 0,
    slowFactor: 1,
    slowTimer: 0,
    size: template.size,
    scoreValue: template.scoreValue,
    pattern: template.pattern,
    patternTimer: Math.random() * Math.PI * 2,
    patternParam: template.pattern === EnemyPattern.TELEPORT ? (2.5 + Math.random() * 1.5) : (template.pattern === EnemyPattern.V_FORMATION ? (Math.floor(Math.random() * 5) - 2) : 0),
    fireRate: template.fireRate,
    color: template.color,
    glowColor: template.glowColor,
    dotDamage: 0,
    dotTimer: 0,
    damageAmp: 1,
    damageAmpTimer: 0,
    isAllied: false,
    alliedTimer: 0,
  };

  state.enemies.push(enemy);
}

function _spawnBoss(state: DragoonState, type: DragoonEnemyType): void {
  const template = ENEMY_TEMPLATES[type];
  if (!template) return;

  const pathDiffMod = state.branchState.pathDifficultyMod;
  const hpScale = (1 + state.wave * DragoonBalance.ENEMY_HP_SCALE * 0.5) * pathDiffMod;
  const sw = state.screenW;
  const sh = state.screenH;

  const boss: DragoonEnemy = {
    id: state.nextId++,
    type: template.type,
    position: { x: state.cameraX + sw + 100, y: sh * 0.35 },
    velocity: { x: -40, y: 0 },
    hp: Math.floor(template.hp * hpScale),
    maxHp: Math.floor(template.hp * hpScale),
    alive: true,
    isBoss: true,
    bossPhase: 0,
    attackTimer: 2,
    hitTimer: 0,
    deathTimer: 0,
    slowFactor: 1,
    slowTimer: 0,
    size: template.size,
    scoreValue: template.scoreValue,
    pattern: EnemyPattern.BOSS_PATTERN,
    patternTimer: 0,
    patternParam: 0,
    fireRate: template.fireRate,
    color: template.color,
    glowColor: template.glowColor,
    dotDamage: 0,
    dotTimer: 0,
    damageAmp: 1,
    damageAmpTimer: 0,
    isAllied: false,
    alliedTimer: 0,
  };

  state.enemies.push(boss);
}

function _getBossDisplayName(type: DragoonEnemyType): string {
  const names: Record<string, string> = {
    boss_drake: "Ignis the Fire Drake",
    boss_chimera: "The Chimera of Dread",
    boss_lich_king: "Mordrath the Lich King",
    boss_storm_titan: "Thalassor, Storm Titan",
    boss_void_serpent: "Nyx, the Void Serpent",
    boss_dragon_pendragon: "Y Ddraig Goch",
    boss_questing_beast: "Glatisant, the Questing Beast",
    boss_black_knight: "The Black Knight of Annwn",
    boss_morgana_wyrm: "Morgana's Wyrm",
    boss_grail_guardian: "Seraphiel, Guardian of the Grail",
  };
  return names[type] || "Boss";
}

// ---------------------------------------------------------------------------
// Destructible environment spawning
// ---------------------------------------------------------------------------

function _spawnDestructibles(state: DragoonState): void {
  // Remove destroyed/offscreen destructibles from previous wave
  state.destructibles = state.destructibles.filter(d =>
    !d.destroyed || d.collapseTimer > 0,
  );

  const tier = Math.min(Math.floor((state.wave - 1) / 4), DESTRUCTIBLE_POOL.length - 1);
  const pool = DESTRUCTIBLE_POOL[tier];
  if (!pool || pool.length === 0) return;

  const count = Math.floor(DESTRUCTIBLES_PER_WAVE_BASE + state.wave * DESTRUCTIBLES_PER_WAVE_GROWTH);
  const sw = state.screenW;
  const sh = state.screenH;
  const camRight = state.cameraX + sw;

  for (let i = 0; i < count; i++) {
    const type = pool[Math.floor(Math.random() * pool.length)];
    const tmpl = DESTRUCTIBLE_TEMPLATES[type];
    if (!tmpl) continue;

    const x = camRight + DragoonBalance.DESTRUCTIBLE_SPAWN_MARGIN + Math.random() * sw * 0.6;
    // Ground-level objects
    const y = sh - 50 - Math.random() * 40;

    const destructible: DragoonDestructible = {
      id: state.nextId++,
      type: tmpl.type,
      position: { x, y },
      hp: tmpl.hp,
      maxHp: tmpl.hp,
      width: tmpl.width,
      height: tmpl.height,
      color: tmpl.color,
      destroyed: false,
      collapseTimer: 0,
      collapseDuration: tmpl.collapseDuration,
      areaDamage: tmpl.areaDamage,
      areaDamageRadius: tmpl.areaDamageRadius,
      hitTimer: 0,
      scoreValue: tmpl.scoreValue,
      debrisCount: tmpl.debrisCount,
    };

    state.destructibles.push(destructible);
  }
}
