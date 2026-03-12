// ---------------------------------------------------------------------------
// Panzer Dragoon mode — wave spawning system
// ---------------------------------------------------------------------------

import type { DragoonState, DragoonEnemy } from "../state/DragoonState";
import { DragoonEnemyType, EnemyPattern } from "../state/DragoonState";
import { DragoonBalance, ENEMY_TEMPLATES, WAVE_ENEMY_POOL, BOSS_ORDER } from "../config/DragoonConfig";

let _spawnAccumulator = 0;

export const DragoonWaveSystem = {
  reset(): void {
    _spawnAccumulator = 0;
  },

  update(state: DragoonState, dt: number): void {
    if (state.gameOver || state.victory) return;

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

    // Check wave end: all enemies spawned and all dead
    const allDead = state.enemies.every(e => !e.alive);
    if (state.waveEnemiesSpawned >= state.waveEnemiesTotal && allDead) {
      _endWave(state);
    }

    // Also end wave if timer expired (safety)
    if (state.waveTimer >= state.waveDuration + 10) {
      // Kill remaining enemies
      for (const e of state.enemies) e.alive = false;
      _endWave(state);
    }
  },
};

function _startWave(state: DragoonState): void {
  const isBossWave = state.wave % state.bossWaveInterval === 0;
  state.bossActive = isBossWave;
  state.waveTimer = 0;
  state.waveEnemiesSpawned = 0;
  _spawnAccumulator = 0;

  state.waveDuration = DragoonBalance.WAVE_DURATION_BASE + state.wave * DragoonBalance.WAVE_DURATION_GROWTH;
  state.waveEnemiesTotal = DragoonBalance.ENEMY_COUNT_BASE + state.wave * DragoonBalance.ENEMY_COUNT_GROWTH;

  // Remove dead enemies from previous wave
  state.enemies = state.enemies.filter(e => e.alive);

  if (isBossWave) {
    // Spawn boss
    const bossIdx = Math.floor((state.wave / state.bossWaveInterval) - 1) % BOSS_ORDER.length;
    const bossType = BOSS_ORDER[bossIdx];
    _spawnBoss(state, bossType);
    // Set boss entrance announcement
    state.bossEntranceTimer = 3.0;
    state.bossEntranceName = _getBossDisplayName(bossType);
    // Reduce normal enemy count during boss wave
    state.waveEnemiesTotal = Math.floor(state.waveEnemiesTotal * 0.5);
  }
}

function _endWave(state: DragoonState): void {
  state.betweenWaves = true;
  state.betweenWaveTimer = DragoonBalance.BETWEEN_WAVE_PAUSE;
  state.bossActive = false;

  // Heal player a bit between waves
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + 15);
  state.player.mana = Math.min(state.player.maxMana, state.player.mana + 30);
}

function _getEnemyPool(wave: number): DragoonEnemyType[] {
  const tier = Math.min(Math.floor((wave - 1) / 4), WAVE_ENEMY_POOL.length - 1);
  return WAVE_ENEMY_POOL[tier];
}

function _spawnEnemy(state: DragoonState): void {
  const pool = _getEnemyPool(state.wave);
  const type = pool[Math.floor(Math.random() * pool.length)];
  const template = ENEMY_TEMPLATES[type];
  if (!template) return;

  const hpScale = 1 + state.wave * DragoonBalance.ENEMY_HP_SCALE;
  const sw = state.screenW;
  const sh = state.screenH;

  // Position: spawn from right side or top for sky, right side for ground
  let x: number, y: number;
  let vx = 0, vy = 0;

  if (template.isGround) {
    x = sw + 40;
    y = sh - 60 - Math.random() * 30; // ground level
    vx = -template.speed;
  } else {
    // Sky enemies: mostly from right, sometimes from top
    if (Math.random() < 0.2) {
      // From top
      x = 100 + Math.random() * (sw - 200);
      y = -40;
      vx = -template.speed * 0.3;
      vy = template.speed * 0.7;
    } else {
      // From right
      x = sw + 40;
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
  };

  state.enemies.push(enemy);
}

function _spawnBoss(state: DragoonState, type: DragoonEnemyType): void {
  const template = ENEMY_TEMPLATES[type];
  if (!template) return;

  const hpScale = 1 + state.wave * DragoonBalance.ENEMY_HP_SCALE * 0.5;
  const sw = state.screenW;
  const sh = state.screenH;

  const boss: DragoonEnemy = {
    id: state.nextId++,
    type: template.type,
    position: { x: sw + 100, y: sh * 0.35 },
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
  };
  return names[type] || "Boss";
}
