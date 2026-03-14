// ---------------------------------------------------------------------------
// 3Dragon mode — wave spawning system
// ---------------------------------------------------------------------------

import type { ThreeDragonState, TDEnemy } from "../state/ThreeDragonState";
import { TDEnemyType, TDEnemyPattern } from "../state/ThreeDragonState";
import { TDBalance, TD_ENEMY_TEMPLATES, TD_WAVE_ENEMY_POOL, TD_BOSS_ORDER } from "../config/ThreeDragonConfig";

let _spawnAccumulator = 0;

export const ThreeDragonWaveSystem = {
  reset(): void {
    _spawnAccumulator = 0;
  },

  update(state: ThreeDragonState, dt: number): void {
    if (state.gameOver || state.victory) return;

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

    state.waveTimer += dt;

    const spawnRate = Math.max(
      TDBalance.ENEMY_SPAWN_RATE_MIN,
      TDBalance.ENEMY_SPAWN_RATE_BASE - state.wave * 0.04,
    );

    _spawnAccumulator += dt;
    while (_spawnAccumulator >= spawnRate && state.waveEnemiesSpawned < state.waveEnemiesTotal) {
      _spawnAccumulator -= spawnRate;
      _spawnEnemy(state);
      state.waveEnemiesSpawned++;
    }

    const allDead = state.enemies.every(e => !e.alive);
    if (state.waveEnemiesSpawned >= state.waveEnemiesTotal && allDead) {
      _endWave(state);
    }

    if (state.waveTimer >= state.waveDuration + 10) {
      for (const e of state.enemies) {
        if (!e.isBoss) e.alive = false;  // Don't kill bosses
      }
      // Only end wave if no boss is alive
      if (!state.enemies.some(e => e.isBoss && e.alive)) {
        _endWave(state);
      }
    }
  },
};

function _startWave(state: ThreeDragonState): void {
  const isBossWave = state.wave % state.bossWaveInterval === 0;
  state.bossActive = isBossWave;
  state.waveTimer = 0;
  state.waveEnemiesSpawned = 0;
  _spawnAccumulator = 0;

  state.waveDuration = TDBalance.WAVE_DURATION_BASE + state.wave * TDBalance.WAVE_DURATION_GROWTH;
  state.waveEnemiesTotal = TDBalance.ENEMY_COUNT_BASE + state.wave * TDBalance.ENEMY_COUNT_GROWTH;

  const isSwarmWave = !isBossWave && state.wave % 3 === 0;
  if (isSwarmWave) {
    state.waveEnemiesTotal = Math.floor(state.waveEnemiesTotal * 2);
  }
  state.swarmWave = isSwarmWave;

  state.enemies = state.enemies.filter(e => e.alive);

  if (isBossWave) {
    const bossIdx = Math.floor((state.wave / state.bossWaveInterval) - 1) % TD_BOSS_ORDER.length;
    _spawnBoss(state, TD_BOSS_ORDER[bossIdx]);
    state.waveEnemiesTotal = Math.floor(state.waveEnemiesTotal * 0.5);
  }
}

function _endWave(state: ThreeDragonState): void {
  state.betweenWaves = true;
  state.betweenWaveTimer = TDBalance.BETWEEN_WAVE_PAUSE;
  state.bossActive = false;
  state.swarmWave = false;

  state.player.hp = Math.min(state.player.maxHp, state.player.hp + 20);
  state.player.mana = Math.min(state.player.maxMana, state.player.mana + 35);
}

function _getEnemyPool(wave: number): TDEnemyType[] {
  const tier = Math.min(Math.floor((wave - 1) / 4), TD_WAVE_ENEMY_POOL.length - 1);
  return TD_WAVE_ENEMY_POOL[tier];
}

function _spawnEnemy(state: ThreeDragonState): void {
  const pool = _getEnemyPool(state.wave);
  const type = pool[Math.floor(Math.random() * pool.length)];
  const template = TD_ENEMY_TEMPLATES[type];
  if (!template) return;

  const hpScale = 1 + state.wave * TDBalance.ENEMY_HP_SCALE;

  let x: number, y: number, z: number;
  let vx = 0, vy = 0, vz = 0;

  if (template.isGround) {
    x = (Math.random() - 0.5) * 40;
    y = 0;
    z = state.worldZ - 80 - Math.random() * 30;
    vz = template.speed;
  } else {
    // Sky enemies from ahead
    if (Math.random() < 0.3) {
      // From sides
      x = (Math.random() < 0.5 ? -35 : 35);
      y = 5 + Math.random() * 15;
      z = state.worldZ - 40 - Math.random() * 20;
      vx = x > 0 ? -template.speed : template.speed;
      vz = template.speed * 0.3;
    } else {
      // From ahead
      x = (Math.random() - 0.5) * 40;
      y = 4 + Math.random() * 16;
      z = state.worldZ - 70 - Math.random() * 30;
      vz = template.speed;
    }
  }

  const enemy: TDEnemy = {
    id: state.nextId++,
    type: template.type,
    position: { x, y, z },
    velocity: { x: vx, y: vy, z: vz },
    hp: Math.floor(template.hp * hpScale),
    maxHp: Math.floor(template.hp * hpScale),
    alive: true,
    isBoss: false,
    isElite: false,
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
    patternParam: 0,
    fireRate: template.fireRate,
    color: template.color,
    glowColor: template.glowColor,
    rotationY: 0,
    rotationSpeed: (Math.random() - 0.5) * 2,
  };

  // Swarm wave: halve HP
  if (state.swarmWave) {
    enemy.hp = Math.floor(enemy.hp * 0.5);
    enemy.maxHp = enemy.hp;
  }

  // Elite chance
  if (Math.random() < 0.12) {
    enemy.isElite = true;
    enemy.hp = Math.floor(enemy.hp * 2);
    enemy.maxHp = enemy.hp;
    enemy.size *= 1.5;
    enemy.scoreValue = Math.floor(enemy.scoreValue * 1.8);
    enemy.glowColor = 0xffd700;
  }

  state.enemies.push(enemy);
}

function _spawnBoss(state: ThreeDragonState, type: TDEnemyType): void {
  const template = TD_ENEMY_TEMPLATES[type];
  if (!template) return;

  const hpScale = 1 + state.wave * TDBalance.ENEMY_HP_SCALE * 0.5;

  const boss: TDEnemy = {
    id: state.nextId++,
    type: template.type,
    position: { x: 0, y: 12, z: state.worldZ - 80 },
    velocity: { x: 0, y: 0, z: 4 },
    hp: Math.floor(template.hp * hpScale),
    maxHp: Math.floor(template.hp * hpScale),
    alive: true,
    isBoss: true,
    isElite: false,
    bossPhase: 0,
    attackTimer: 2,
    hitTimer: 0,
    deathTimer: 0,
    slowFactor: 1,
    slowTimer: 0,
    size: template.size,
    scoreValue: template.scoreValue,
    pattern: TDEnemyPattern.BOSS_PATTERN,
    patternTimer: 0,
    patternParam: 0,
    fireRate: template.fireRate,
    color: template.color,
    glowColor: template.glowColor,
    rotationY: 0,
    rotationSpeed: 0.5,
  };

  state.enemies.push(boss);
}
