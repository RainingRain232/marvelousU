// ---------------------------------------------------------------------------
// Conjurer — Game systems (v2)
// Bug fixes, knockback, spell synergies, power-ups, homing orbs, balance
// ---------------------------------------------------------------------------

import type { ConjurerState, Enemy, Projectile } from "../types";
import { ConjurerPhase, SpellElement, EnemyType, EnemyState } from "../types";
import { CONJURER_BALANCE as B } from "../config/ConjurerBalance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function angleToward(fx: number, fy: number, tx: number, ty: number): number {
  return Math.atan2(ty - fy, tx - fx);
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

// ---------------------------------------------------------------------------
// Player movement
// ---------------------------------------------------------------------------

export function movePlayer(s: ConjurerState, dx: number, dy: number, dt: number): void {
  if (s.phase !== ConjurerPhase.PLAYING) return;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.01) return;
  const nx = dx / len, ny = dy / len;
  s.px = clamp(s.px + nx * s.pSpeed * dt, B.PLAYER_RADIUS, s.arenaW - B.PLAYER_RADIUS);
  s.py = clamp(s.py + ny * s.pSpeed * dt, B.PLAYER_RADIUS, s.arenaH - B.PLAYER_RADIUS);
}

export function setAim(s: ConjurerState, dx: number, dy: number): void {
  if (dx !== 0 || dy !== 0) s.aimAngle = Math.atan2(dy, dx);
}

// ---------------------------------------------------------------------------
// Spell casting (v2 — fixed scaling, synergies)
// ---------------------------------------------------------------------------

/** Returns reason cast failed, or null if it would succeed */
export function canCast(s: ConjurerState): "no_mana" | "cooldown" | null {
  if (s.phase !== ConjurerPhase.PLAYING) return "cooldown";
  const el = s.activeElement;
  if (s.spellCooldowns[el] > 0) return "cooldown";
  if (s.mana < B.SPELL_COSTS[el]) return "no_mana";
  return null;
}

export function castSpell(s: ConjurerState): boolean {
  if (s.phase !== ConjurerPhase.PLAYING) return false;
  const el = s.activeElement;
  const cost = B.SPELL_COSTS[el];
  if (s.mana < cost || s.spellCooldowns[el] > 0) return false;

  s.mana -= cost;
  s.spellCooldowns[el] = B.SPELL_COOLDOWNS[el];
  const lvl = s.spellLevels[el];
  const a = s.aimAngle;

  switch (el) {
    case SpellElement.FIRE: {
      s.spellEffects.push({
        x: s.px, y: s.py, element: SpellElement.FIRE,
        radius: 0, maxRadius: B.FIRE_RADIUS + lvl * 20,
        life: B.FIRE_DURATION, maxLife: B.FIRE_DURATION,
        damage: B.FIRE_DAMAGE + lvl,
        pullStrength: 0,
      });
      spawnParticles(s, s.px, s.py, 16, B.COLOR_FIRE);
      s.screenShake = Math.max(s.screenShake, 0.12);
      break;
    }
    case SpellElement.ICE: {
      const count = B.ICE_SHARD_COUNT + lvl * 2;
      const dmg = B.ICE_DAMAGE + Math.floor(lvl * 0.5);
      for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) / 2) * (B.ICE_SPREAD * 2 / count);
        const sa = a + spread;
        s.projectiles.push({
          x: s.px, y: s.py,
          vx: Math.cos(sa) * B.ICE_SHARD_SPEED, vy: Math.sin(sa) * B.ICE_SHARD_SPEED,
          radius: 4 + lvl * 0.5, damage: dmg,
          color: B.COLOR_ICE, life: B.ICE_SHARD_LIFE + lvl * 0.1,
          element: SpellElement.ICE, piercing: lvl >= 4, chain: 0,
          homing: false,
        });
      }
      spawnParticles(s, s.px + Math.cos(a) * 15, s.py + Math.sin(a) * 15, 10, B.COLOR_ICE);
      s.screenShake = Math.max(s.screenShake, 0.06);
      break;
    }
    case SpellElement.LIGHTNING: {
      s.projectiles.push({
        x: s.px, y: s.py,
        vx: Math.cos(a) * B.LIGHTNING_BOLT_SPEED, vy: Math.sin(a) * B.LIGHTNING_BOLT_SPEED,
        radius: 6 + lvl, damage: B.LIGHTNING_DAMAGE + lvl,
        color: B.COLOR_LIGHTNING, life: B.LIGHTNING_BOLT_LIFE,
        element: SpellElement.LIGHTNING, piercing: true, chain: B.LIGHTNING_CHAINS + lvl,
        homing: false,
      });
      spawnParticles(s, s.px, s.py, 8, B.COLOR_LIGHTNING);
      s.screenShake = Math.max(s.screenShake, 0.08);
      s.screenFlashColor = B.COLOR_LIGHTNING;
      s.screenFlashTimer = 0.04; // brief white flash for lightning
      break;
    }
    case SpellElement.VOID: {
      s.spellEffects.push({
        x: s.px + Math.cos(a) * 70, y: s.py + Math.sin(a) * 70,
        element: SpellElement.VOID,
        radius: 0, maxRadius: B.VOID_RADIUS + lvl * 15,
        life: B.VOID_DURATION + lvl * 0.2, maxLife: B.VOID_DURATION + lvl * 0.2,
        damage: B.VOID_DAMAGE + lvl * 2,
        pullStrength: B.VOID_PULL_STRENGTH + lvl * 20,
      });
      spawnParticles(s, s.px + Math.cos(a) * 70, s.py + Math.sin(a) * 70, 14, B.COLOR_VOID);
      s.screenShake = Math.max(s.screenShake, 0.14);
      break;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Dodge roll
// ---------------------------------------------------------------------------

export function tryDodge(s: ConjurerState, dx: number, dy: number): boolean {
  if (s.phase !== ConjurerPhase.PLAYING || s.dodgeCooldown > 0 || s.dodgeTimer > 0) return false;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.01) {
    // Default: dodge in aim direction
    s.dodgeDirX = Math.cos(s.aimAngle);
    s.dodgeDirY = Math.sin(s.aimAngle);
  } else {
    s.dodgeDirX = dx / len; s.dodgeDirY = dy / len;
  }
  s.dodgeTimer = B.DODGE_DURATION;
  s.dodgeCooldown = B.DODGE_COOLDOWN;
  s.invincibleTimer = Math.max(s.invincibleTimer, B.DODGE_DURATION + 0.05);
  spawnParticles(s, s.px, s.py, 12, B.COLOR_PLAYER);
  s.screenShake = Math.max(s.screenShake, 0.05);
  return true;
}

// ---------------------------------------------------------------------------
// Ultimate ability
// ---------------------------------------------------------------------------

export function tryUltimate(s: ConjurerState): boolean {
  if (s.phase !== ConjurerPhase.PLAYING || s.ultimateCharge < B.ULTIMATE_COST || s.ultimateActive > 0) return false;
  s.ultimateCharge = 0;
  s.ultimateActive = B.ULTIMATE_DURATION;
  s.invincibleTimer = Math.max(s.invincibleTimer, B.ULTIMATE_DURATION);
  s.screenShake = 0.4;
  s.screenFlashColor = B.COLOR_GOLD;
  s.screenFlashTimer = B.FLASH_DURATION * 3;
  spawnParticles(s, s.px, s.py, 30, B.COLOR_GOLD);
  spawnFloatingText(s, s.px, s.py - 40, "ARCANE BURST!", B.COLOR_GOLD);
  return true;
}

export function cycleElement(s: ConjurerState, dir: number): void {
  const els = [SpellElement.FIRE, SpellElement.ICE, SpellElement.LIGHTNING, SpellElement.VOID];
  const idx = els.indexOf(s.activeElement);
  s.activeElement = els[(idx + dir + els.length) % els.length];
}

// ---------------------------------------------------------------------------
// Wave management (v2 — softer scaling, wave announce)
// ---------------------------------------------------------------------------

export function updateWaves(s: ConjurerState, dt: number): void {
  if (s.phase !== ConjurerPhase.PLAYING) return;

  if (s.waveClearTimer > 0) {
    s.waveClearTimer -= dt;
    if (s.waveClearTimer <= 0) startNextWave(s);
    return;
  }

  if (s.wave === 0) {
    s.waveTimer -= dt;
    if (s.waveTimer <= 0) startNextWave(s);
    return;
  }

  if (s.waveSpawnCount > 0) {
    s.waveSpawnTimer -= dt;
    if (s.waveSpawnTimer <= 0) {
      spawnWaveEnemy(s);
      s.waveSpawnCount--;
      s.waveSpawnTimer = B.WAVE_SPAWN_INTERVAL;
    }
  }

  if (s.waveSpawnCount <= 0 && s.enemies.length === 0) {
    if (s.wave >= B.MAX_WAVE) {
      s.phase = ConjurerPhase.VICTORY;
      return;
    }
    s.phase = ConjurerPhase.WAVE_CLEAR;
    s.waveClearTimer = B.WAVE_CLEAR_PAUSE;
    // Heal 1 HP on wave clear
    s.hp = Math.min(s.maxHp, s.hp + 1);
    s.score += s.wave * 50;
    spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2 - 30, `Wave ${s.wave} Clear!`, B.COLOR_SUCCESS);
    if (s.combo > 5) spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2, `${s.combo}x COMBO!`, B.COLOR_COMBO);
    s.screenFlashColor = B.COLOR_SUCCESS;
    s.screenFlashTimer = B.FLASH_DURATION * 2;
  }
}

function startNextWave(s: ConjurerState): void {
  s.wave++;
  s.phase = ConjurerPhase.PLAYING;
  // Softer scaling: sqrt-based growth
  const count = B.ENEMIES_BASE + Math.floor(Math.sqrt(s.wave) * B.ENEMIES_PER_WAVE);
  s.isBossWave = s.wave % B.BOSS_WAVE_INTERVAL === 0;
  s.waveSpawnCount = s.isBossWave ? count + 1 : count;
  s.waveSpawnTimer = 0.5; // brief delay before first spawn
  s.bossAlive = false;
  // Wave announcement
  spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2 - 50, `— WAVE ${s.wave} —`, B.COLOR_PLAYER);
}

function spawnWaveEnemy(s: ConjurerState): void {
  const side = Math.floor(Math.random() * 4);
  let x: number, y: number;
  switch (side) {
    case 0: x = Math.random() * s.arenaW; y = -20; break;
    case 1: x = s.arenaW + 20; y = Math.random() * s.arenaH; break;
    case 2: x = Math.random() * s.arenaW; y = s.arenaH + 20; break;
    default: x = -20; y = Math.random() * s.arenaH; break;
  }
  // Spawn warning at edge
  const wx = clamp(x, 0, s.arenaW), wy = clamp(y, 0, s.arenaH);
  s.spawnWarnings.push({ x: wx, y: wy, timer: B.SPAWN_WARNING_TIME });

  let type: EnemyType;
  if (s.isBossWave && !s.bossAlive && s.waveSpawnCount <= 1) {
    type = EnemyType.GOLEM;
    s.bossAlive = true;
  } else {
    const roll = Math.random();
    // Balanced spawn rates
    if (s.wave >= 15 && roll < 0.08) type = EnemyType.SORCERER;
    else if (s.wave >= 8 && roll < 0.15) type = EnemyType.WRAITH;
    else if (s.wave >= 5 && roll < 0.25) type = EnemyType.KNIGHT;
    else if (s.wave >= 3 && roll < 0.35) type = EnemyType.ARCHER;
    else type = EnemyType.THRALL;
  }

  const def = B.ENEMY_DEFS[type];
  const hpScale = 1 + s.wave * 0.08; // softer HP scaling
  const isBoss = type === EnemyType.GOLEM && s.isBossWave && s.bossAlive;

  s.enemies.push({
    x, y, vx: 0, vy: 0,
    type, state: EnemyState.ALIVE,
    hp: Math.ceil(def.hp * hpScale * (isBoss ? B.BOSS_HP_MULT : 1)),
    maxHp: Math.ceil(def.hp * hpScale * (isBoss ? B.BOSS_HP_MULT : 1)),
    speed: def.speed * (isBoss ? 0.6 : 1),
    radius: def.radius * (isBoss ? B.BOSS_SIZE_MULT : 1),
    color: def.color,
    deathTimer: 0, attackTimer: Math.random() * 1.5, // stagger attacks
    phaseTimer: B.WRAITH_PHASE_INTERVAL, phased: false,
    teleportTimer: B.SORCERER_TELEPORT_INTERVAL,
    flashTimer: 0, slowFactor: 1, slowTimer: 0,
  });
}

// ---------------------------------------------------------------------------
// Enemy AI (v2 — homing orbs, wraith fix)
// ---------------------------------------------------------------------------

export function updateEnemies(s: ConjurerState, dt: number): void {
  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i];

    if (e.state === EnemyState.DYING) {
      e.deathTimer -= dt;
      if (e.deathTimer <= 0) s.enemies.splice(i, 1);
      continue;
    }

    if (e.flashTimer > 0) e.flashTimer -= dt;
    if (e.slowTimer > 0) { e.slowTimer -= dt; if (e.slowTimer <= 0) e.slowFactor = 1; }

    const a = angleToward(e.x, e.y, s.px, s.py);
    const d = dist(e.x, e.y, s.px, s.py);
    const speed = e.speed * e.slowFactor;

    switch (e.type) {
      case EnemyType.ARCHER:
        if (d > B.ARCHER_STOP_RANGE) {
          e.x += Math.cos(a) * speed * dt;
          e.y += Math.sin(a) * speed * dt;
        } else {
          // Strafe slightly when stationary
          const strafe = Math.sin(s.time * 2 + i) * speed * 0.3;
          e.x += Math.cos(a + Math.PI / 2) * strafe * dt;
          e.y += Math.sin(a + Math.PI / 2) * strafe * dt;
        }
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = B.ARCHER_ATTACK_INTERVAL;
          s.projectiles.push({
            x: e.x, y: e.y,
            vx: Math.cos(a) * B.ARCHER_PROJECTILE_SPEED, vy: Math.sin(a) * B.ARCHER_PROJECTILE_SPEED,
            radius: 4, damage: 1, color: B.COLOR_ENEMY_PROJ, life: 2.5,
            element: null, piercing: false, chain: 0, homing: false,
          });
        }
        break;

      case EnemyType.WRAITH:
        e.phaseTimer -= dt;
        if (e.phaseTimer <= 0 && !e.phased) {
          e.phased = true;
          e.phaseTimer = B.WRAITH_PHASE_DURATION;
        } else if (e.phased && e.phaseTimer <= 0) {
          e.phased = false;
          e.phaseTimer = B.WRAITH_PHASE_INTERVAL;
        }
        e.x += Math.cos(a) * speed * (e.phased ? 1.8 : 1) * dt;
        e.y += Math.sin(a) * speed * (e.phased ? 1.8 : 1) * dt;
        break;

      case EnemyType.SORCERER:
        e.teleportTimer -= dt;
        if (e.teleportTimer <= 0) {
          // Teleport away from player (not on top of them)
          for (let attempt = 0; attempt < 5; attempt++) {
            const tx = Math.random() * s.arenaW, ty = Math.random() * s.arenaH;
            if (dist(tx, ty, s.px, s.py) > 100) {
              spawnParticles(s, e.x, e.y, 6, 0xcc44aa);
              e.x = tx; e.y = ty;
              spawnParticles(s, e.x, e.y, 6, 0xcc44aa);
              break;
            }
          }
          e.teleportTimer = B.SORCERER_TELEPORT_INTERVAL;
        }
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = B.SORCERER_ATTACK_INTERVAL;
          // Homing orb — marked as homing (buffed speed)
          const oa = angleToward(e.x, e.y, s.px, s.py);
          s.projectiles.push({
            x: e.x, y: e.y,
            vx: Math.cos(oa) * B.SORCERER_ORB_SPEED_V2, vy: Math.sin(oa) * B.SORCERER_ORB_SPEED_V2,
            radius: 6, damage: 1, color: 0xff44cc, life: 5,
            element: null, piercing: false, chain: 0, homing: true,
          });
        }
        break;

      default:
        e.x += Math.cos(a) * speed * dt;
        e.y += Math.sin(a) * speed * dt;
        break;
    }

    // Keep enemies in arena bounds (with padding)
    e.x = clamp(e.x, -30, s.arenaW + 30);
    e.y = clamp(e.y, -30, s.arenaH + 30);

    // Collision with player — wraith can't damage while phased
    if (!e.phased && d < e.radius + B.PLAYER_RADIUS && s.invincibleTimer <= 0) {
      damagePlayer(s, 1);
      // Knockback enemy away from player on contact
      const knockA = angleToward(s.px, s.py, e.x, e.y);
      e.x += Math.cos(knockA) * 30;
      e.y += Math.sin(knockA) * 30;
    }
  }
}

// ---------------------------------------------------------------------------
// Projectile updates (v2 — homing orbs)
// ---------------------------------------------------------------------------

export function updateProjectiles(s: ConjurerState, dt: number): void {
  for (let i = s.projectiles.length - 1; i >= 0; i--) {
    const p = s.projectiles[i];

    // Homing: gently steer toward player
    if (p.homing && p.element === null) {
      const ha = angleToward(p.x, p.y, s.px, s.py);
      const turnRate = 1.5; // radians/sec
      const currentA = Math.atan2(p.vy, p.vx);
      let diff = ha - currentA;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const turn = clamp(diff, -turnRate * dt, turnRate * dt);
      const newA = currentA + turn;
      const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      p.vx = Math.cos(newA) * sp;
      p.vy = Math.sin(newA) * sp;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    if (p.life <= 0 || p.x < -60 || p.x > s.arenaW + 60 || p.y < -60 || p.y > s.arenaH + 60) {
      s.projectiles.splice(i, 1);
      continue;
    }

    if (p.element !== null) {
      // Player projectile → hit enemies
      for (let j = s.enemies.length - 1; j >= 0; j--) {
        const e = s.enemies[j];
        if (e.state !== EnemyState.ALIVE || e.phased) continue;
        if (dist(p.x, p.y, e.x, e.y) < p.radius + e.radius) {
          // Spell synergy: slowed enemies take +50% from fire/lightning
          let dmg = p.damage;
          const isSynergy = e.slowTimer > 0 && (p.element === SpellElement.FIRE || p.element === SpellElement.LIGHTNING);
          if (isSynergy) {
            dmg = Math.ceil(dmg * 1.5);
            // Synergy burst visual
            spawnParticles(s, e.x, e.y, 6, 0xffaaff);
            spawnFloatingText(s, e.x, e.y - 15, "SHATTER!", 0xffaaff);
            s.screenShake = Math.max(s.screenShake, 0.06);
          }
          damageEnemy(s, e, dmg, p.element);
          // Knockback on hit (scaled by enemy size — smaller enemies fly further)
          const kb = angleToward(p.x, p.y, e.x, e.y);
          const sizeScale = Math.max(0.3, 1 - (e.radius - 8) * 0.04);
          const kbStrength = (p.element === SpellElement.FIRE ? 35 : p.element === SpellElement.VOID ? 8 : 20) * sizeScale;
          e.x += Math.cos(kb) * kbStrength;
          e.y += Math.sin(kb) * kbStrength;

          if (!p.piercing) { s.projectiles.splice(i, 1); break; }
          if (p.element === SpellElement.LIGHTNING && p.chain > 0) {
            chainLightning(s, e, p);
          }
        }
      }
    } else {
      // Enemy projectile → hit player
      if (dist(p.x, p.y, s.px, s.py) < p.radius + B.PLAYER_RADIUS && s.invincibleTimer <= 0) {
        damagePlayer(s, p.damage);
        s.projectiles.splice(i, 1);
      }
    }
  }
}

function chainLightning(s: ConjurerState, hitEnemy: Enemy, bolt: Projectile): void {
  if (bolt.chain <= 0) return;
  let nearest: Enemy | null = null;
  let nearDist: number = B.LIGHTNING_CHAIN_RANGE;
  for (const e of s.enemies) {
    if (e === hitEnemy || e.state !== EnemyState.ALIVE || e.phased) continue;
    const d = dist(hitEnemy.x, hitEnemy.y, e.x, e.y);
    if (d < nearDist) { nearDist = d; nearest = e; }
  }
  if (nearest) {
    const a = angleToward(hitEnemy.x, hitEnemy.y, nearest.x, nearest.y);
    s.projectiles.push({
      x: hitEnemy.x, y: hitEnemy.y,
      vx: Math.cos(a) * B.LIGHTNING_BOLT_SPEED * 0.8,
      vy: Math.sin(a) * B.LIGHTNING_BOLT_SPEED * 0.8,
      radius: 5, damage: bolt.damage, color: B.COLOR_LIGHTNING, life: 0.3,
      element: SpellElement.LIGHTNING, piercing: true, chain: bolt.chain - 1, homing: false,
    });
    spawnParticles(s, hitEnemy.x, hitEnemy.y, 4, B.COLOR_LIGHTNING);
    // Visual lightning arc
    s.lightningArcs.push({ x1: hitEnemy.x, y1: hitEnemy.y, x2: nearest.x, y2: nearest.y, life: 0.2 });
  }
}

// ---------------------------------------------------------------------------
// Spell effects (AoE) — v2: synergy bonus, knockback
// ---------------------------------------------------------------------------

export function updateSpellEffects(s: ConjurerState, dt: number): void {
  for (let i = s.spellEffects.length - 1; i >= 0; i--) {
    const fx = s.spellEffects[i];
    fx.life -= dt;
    if (fx.life <= 0) { s.spellEffects.splice(i, 1); continue; }

    const progress = 1 - fx.life / fx.maxLife;
    fx.radius = fx.maxRadius * (fx.element === SpellElement.VOID ? Math.min(1, progress * 2) : progress);

    for (const e of s.enemies) {
      if (e.state !== EnemyState.ALIVE || e.phased) continue;
      const d = dist(fx.x, fx.y, e.x, e.y);
      if (d < fx.radius + e.radius) {
        if (e.flashTimer <= 0) {
          let dmg = fx.damage;
          // Synergy: frozen enemies take +50% fire damage
          if (e.slowTimer > 0 && fx.element === SpellElement.FIRE) {
            dmg = Math.ceil(dmg * 1.5);
            spawnParticles(s, e.x, e.y, 4, 0xffaaff);
          }
          damageEnemy(s, e, dmg, fx.element);
          // Fire knockback (push outward from center — big shove)
          if (fx.element === SpellElement.FIRE) {
            const kb = angleToward(fx.x, fx.y, e.x, e.y);
            const fireKb = 40 * Math.max(0.3, 1 - (e.radius - 8) * 0.04);
            e.x += Math.cos(kb) * fireKb;
            e.y += Math.sin(kb) * fireKb;
          }
        }
      }
      // Void pull
      if (fx.element === SpellElement.VOID && d < fx.radius * 1.5 && d > 10) {
        const pullA = angleToward(e.x, e.y, fx.x, fx.y);
        e.x += Math.cos(pullA) * fx.pullStrength * dt;
        e.y += Math.sin(pullA) * fx.pullStrength * dt;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Damage (v2 — knockback, combo milestones)
// ---------------------------------------------------------------------------

function damageEnemy(s: ConjurerState, e: Enemy, damage: number, element: SpellElement | null): void {
  e.hp -= damage;
  e.flashTimer = 0.1;
  spawnParticles(s, e.x, e.y, 4, e.color);

  if (element === SpellElement.ICE) {
    e.slowFactor = B.ICE_SLOW_FACTOR;
    e.slowTimer = B.ICE_SLOW_DURATION;
  }

  if (e.hp <= 0) killEnemy(s, e);
}

function killEnemy(s: ConjurerState, e: Enemy): void {
  e.state = EnemyState.DYING;
  e.deathTimer = 0.3;
  s.totalKills++;

  const def = B.ENEMY_DEFS[e.type];
  const comboMult = 1 + Math.min(s.combo, B.COMBO_MULT_CAP) * 0.15; // stronger combo bonus
  const pts = Math.floor(def.score * comboMult);
  s.score += pts;
  s.combo++;
  s.comboTimer = B.COMBO_WINDOW;
  if (s.combo > s.bestCombo) s.bestCombo = s.combo;

  spawnFloatingText(s, e.x, e.y - 10, `+${pts}`, s.combo > 3 ? B.COLOR_COMBO : B.COLOR_TEXT);
  spawnParticles(s, e.x, e.y, 12, e.color);
  s.screenShake = Math.max(s.screenShake, 0.08);
  // Ultimate charge
  s.ultimateCharge = Math.min(B.ULTIMATE_COST, s.ultimateCharge + B.ULTIMATE_CHARGE_PER_KILL);

  // Combo milestones
  if (s.combo === 10 || s.combo === 25 || s.combo === 50) {
    spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2 - 40, `${s.combo}x COMBO!`, B.COLOR_COMBO);
    s.screenFlashColor = B.COLOR_COMBO;
    s.screenFlashTimer = B.FLASH_DURATION * 2;
    spawnParticles(s, s.px, s.py, 20, B.COLOR_COMBO);
    // Bonus mana on combo milestones
    s.mana = Math.min(s.maxMana, s.mana + 20);
  }

  // Drop mana crystal
  if (Math.random() < B.CRYSTAL_DROP_CHANCE) {
    s.manaCrystals.push({
      x: clamp(e.x, 10, s.arenaW - 10),
      y: clamp(e.y, 10, s.arenaH - 10),
      value: B.CRYSTAL_VALUE + Math.floor(s.wave * 0.5),
      life: B.CRYSTAL_LIFE, magnetized: false,
    });
  }

  // Rare HP drop (5% chance, knight/golem/sorcerer only)
  if ((e.type === EnemyType.KNIGHT || e.type === EnemyType.GOLEM || e.type === EnemyType.SORCERER) && Math.random() < 0.05 && s.hp < s.maxHp) {
    s.hp = Math.min(s.maxHp, s.hp + 1);
    spawnFloatingText(s, e.x, e.y - 20, "+1 HP", B.COLOR_HP);
    spawnParticles(s, e.x, e.y, 8, B.COLOR_HP);
  }

  // Boss kill
  if (e.type === EnemyType.GOLEM && s.isBossWave) {
    s.bossAlive = false;
    s.score += 300;
    s.screenShake = 0.5;
    s.screenFlashColor = B.COLOR_GOLD;
    s.screenFlashTimer = B.FLASH_DURATION * 4;
    spawnParticles(s, e.x, e.y, 40, B.COLOR_GOLD);
    spawnFloatingText(s, e.x, e.y - 25, "BOSS SLAIN!", B.COLOR_GOLD);
    // Drop many crystals in a ring
    for (let c = 0; c < 8; c++) {
      const ca = (c / 8) * Math.PI * 2;
      s.manaCrystals.push({
        x: clamp(e.x + Math.cos(ca) * 30, 10, s.arenaW - 10),
        y: clamp(e.y + Math.sin(ca) * 30, 10, s.arenaH - 10),
        value: B.CRYSTAL_VALUE * 3, life: B.CRYSTAL_LIFE, magnetized: false,
      });
    }
    // Full HP restore on boss kill
    s.hp = s.maxHp;
  }
}

function damagePlayer(s: ConjurerState, damage: number): void {
  if (s.invincibleTimer > 0) return;
  s.hp -= damage;
  s.invincibleTimer = B.PLAYER_INVINCIBLE;
  s.screenShake = B.SHAKE_DURATION;
  s.screenFlashColor = B.COLOR_DANGER;
  s.screenFlashTimer = B.FLASH_DURATION;
  spawnParticles(s, s.px, s.py, 15, B.COLOR_DANGER);
  if (s.hp <= 0) {
    s.phase = ConjurerPhase.DEAD;
    spawnParticles(s, s.px, s.py, 40, B.COLOR_PLAYER);
    s.screenShake = 0.5;
  }
}

// ---------------------------------------------------------------------------
// Mana crystals
// ---------------------------------------------------------------------------

export function updateManaCrystals(s: ConjurerState, dt: number): void {
  for (let i = s.manaCrystals.length - 1; i >= 0; i--) {
    const c = s.manaCrystals[i];
    c.life -= dt;
    if (c.life <= 0) { s.manaCrystals.splice(i, 1); continue; }

    const d = dist(c.x, c.y, s.px, s.py);
    if (d < B.PLAYER_MAGNET_RADIUS_V2) c.magnetized = true;
    if (c.magnetized) {
      const a = angleToward(c.x, c.y, s.px, s.py);
      c.x += Math.cos(a) * B.CRYSTAL_SPEED * dt;
      c.y += Math.sin(a) * B.CRYSTAL_SPEED * dt;
    }

    if (d < B.PLAYER_RADIUS + 10) {
      s.mana = Math.min(s.maxMana, s.mana + c.value);
      s.totalManaCollected += c.value;
      s.manaCrystals.splice(i, 1);
      updateSpellLevels(s);
    }
  }
}

function updateSpellLevels(s: ConjurerState): void {
  const thresholds = [0, 80, 200, 400, 700]; // easier thresholds
  for (const el of [SpellElement.FIRE, SpellElement.ICE, SpellElement.LIGHTNING, SpellElement.VOID]) {
    for (let lvl = 1; lvl < thresholds.length; lvl++) {
      if (s.totalManaCollected >= thresholds[lvl] && s.spellLevels[el] <= lvl) {
        s.spellLevels[el] = lvl + 1;
        spawnFloatingText(s, s.px, s.py - 40, `${el.toUpperCase()} Lv${lvl + 1}!`, B.COLOR_GOLD);
        s.screenFlashColor = B.COLOR_GOLD;
        s.screenFlashTimer = B.FLASH_DURATION;
        spawnParticles(s, s.px, s.py, 10, B.COLOR_GOLD);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Timers, particles, combo
// ---------------------------------------------------------------------------

export function updateTimers(s: ConjurerState, dt: number): void {
  s.time += dt;
  if (s.screenShake > 0) s.screenShake -= dt;
  if (s.screenFlashTimer > 0) s.screenFlashTimer -= dt;
  if (s.invincibleTimer > 0) s.invincibleTimer -= dt;
  if (s.dodgeCooldown > 0) s.dodgeCooldown -= dt;
  for (const el of [SpellElement.FIRE, SpellElement.ICE, SpellElement.LIGHTNING, SpellElement.VOID]) {
    if (s.spellCooldowns[el] > 0) s.spellCooldowns[el] -= dt;
  }

  // Dodge roll movement
  if (s.dodgeTimer > 0) {
    s.dodgeTimer -= dt;
    s.px = clamp(s.px + s.dodgeDirX * B.DODGE_SPEED * dt, B.PLAYER_RADIUS, s.arenaW - B.PLAYER_RADIUS);
    s.py = clamp(s.py + s.dodgeDirY * B.DODGE_SPEED * dt, B.PLAYER_RADIUS, s.arenaH - B.PLAYER_RADIUS);
    // Trail particles during dodge
    if (Math.random() < 0.5) spawnParticles(s, s.px, s.py, 1, B.COLOR_PLAYER);
  }

  // Ultimate AOE damage
  if (s.ultimateActive > 0) {
    s.ultimateActive -= dt;
    // Damage all enemies in radius
    for (const e of s.enemies) {
      if (e.state !== EnemyState.ALIVE) continue;
      const d = Math.sqrt((e.x - s.px) ** 2 + (e.y - s.py) ** 2);
      if (d < B.ULTIMATE_RADIUS && e.flashTimer <= 0) {
        e.hp -= B.ULTIMATE_DAMAGE;
        e.flashTimer = 0.15;
        spawnParticles(s, e.x, e.y, 3, B.COLOR_GOLD);
        if (e.hp <= 0) killEnemy(s, e);
      }
    }
    // Visual particles radiating outward
    if (Math.random() < 0.4) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * B.ULTIMATE_RADIUS;
      spawnParticles(s, s.px + Math.cos(a) * r, s.py + Math.sin(a) * r, 1, B.COLOR_GOLD);
    }
  }

  if (s.phase === ConjurerPhase.PLAYING) {
    s.mana = Math.min(s.maxMana, s.mana + B.PLAYER_MANA_REGEN * dt);
    s.score += B.SCORE_PER_SECOND * dt;
  }
  if (s.comboTimer > 0) {
    s.comboTimer -= dt;
    if (s.comboTimer <= 0) s.combo = 0;
  }
  s.arenaPulse = s.hp <= 2 ? s.arenaPulse + dt * 3 : 0;

  // Lightning arcs decay
  for (let i = s.lightningArcs.length - 1; i >= 0; i--) {
    s.lightningArcs[i].life -= dt;
    if (s.lightningArcs[i].life <= 0) s.lightningArcs.splice(i, 1);
  }

  // Spawn warnings decay
  for (let i = s.spawnWarnings.length - 1; i >= 0; i--) {
    s.spawnWarnings[i].timer -= dt;
    if (s.spawnWarnings[i].timer <= 0) s.spawnWarnings.splice(i, 1);
  }

  // Arena hazard rotation
  if (s.wave >= B.HAZARD_START_WAVE) {
    s.hazardActive = true;
    s.hazardAngle += B.HAZARD_ROTATION_SPEED * dt;
    // Damage player if in hazard beam
    if (s.invincibleTimer <= 0 && s.phase === ConjurerPhase.PLAYING) {
      const cx = s.arenaW / 2, cy = s.arenaH / 2;
      const pa = Math.atan2(s.py - cy, s.px - cx);
      let diff = pa - s.hazardAngle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const beamAngle = B.HAZARD_WIDTH / Math.max(50, Math.sqrt((s.px - cx) ** 2 + (s.py - cy) ** 2));
      if (Math.abs(diff) < beamAngle) {
        damagePlayer(s, B.HAZARD_DAMAGE);
      }
    }
  }
}

// damagePlayer needs to be visible to updateTimers - it's defined before this function

// ---------------------------------------------------------------------------
// Passive element aura
// ---------------------------------------------------------------------------

export function updatePassiveAura(s: ConjurerState, dt: number): void {
  if (s.phase !== ConjurerPhase.PLAYING) return;
  s.auraTimer -= dt;
  if (s.auraTimer > 0) return;
  s.auraTimer = B.AURA_TICK_INTERVAL;

  const el = s.activeElement;
  for (const e of s.enemies) {
    if (e.state !== EnemyState.ALIVE || e.phased) continue;
    const d = Math.sqrt((e.x - s.px) ** 2 + (e.y - s.py) ** 2);
    // Aura range scales with upgrade (checked from meta at start, but we use balance + 15 per level as proxy)
    if (d > B.AURA_RADIUS) continue;

    switch (el) {
      case SpellElement.FIRE:
        // Burn: small damage to nearby enemies
        e.hp -= B.AURA_FIRE_DAMAGE;
        e.flashTimer = 0.05;
        spawnParticles(s, e.x, e.y, 2, B.COLOR_FIRE);
        if (e.hp <= 0) killEnemy(s, e);
        break;
      case SpellElement.ICE:
        // Freeze aura: slow nearby enemies
        e.slowFactor = B.AURA_ICE_SLOW;
        e.slowTimer = B.AURA_TICK_INTERVAL + 0.1;
        break;
      case SpellElement.LIGHTNING:
        // Static shock: chance to zap nearby
        if (Math.random() < B.AURA_LIGHTNING_CHAIN_CHANCE) {
          e.hp -= 1;
          e.flashTimer = 0.05;
          s.lightningArcs.push({ x1: s.px, y1: s.py, x2: e.x, y2: e.y, life: 0.15 });
          spawnParticles(s, e.x, e.y, 2, B.COLOR_LIGHTNING);
          if (e.hp <= 0) killEnemy(s, e);
        }
        break;
      case SpellElement.VOID:
        // Gravity: pull enemies closer
        const pa = angleToward(e.x, e.y, s.px, s.py);
        e.x += Math.cos(pa) * B.AURA_VOID_PULL * B.AURA_TICK_INTERVAL;
        e.y += Math.sin(pa) * B.AURA_VOID_PULL * B.AURA_TICK_INTERVAL;
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Cooldown-ready tracking
// ---------------------------------------------------------------------------

export function trackCooldowns(s: ConjurerState): boolean {
  // Returns true if active element just came off cooldown
  const el = s.activeElement;
  const wasOnCd = s.prevCooldowns[el] > 0;
  const isReady = s.spellCooldowns[el] <= 0 && s.mana >= B.SPELL_COSTS[el];
  // Update prev
  for (const e of [SpellElement.FIRE, SpellElement.ICE, SpellElement.LIGHTNING, SpellElement.VOID]) {
    s.prevCooldowns[e] = s.spellCooldowns[e];
  }
  return wasOnCd && isReady;
}

export function updateParticles(s: ConjurerState, dt: number): void {
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.97; p.vy *= 0.97;
    p.life -= dt;
    if (p.life <= 0) s.particles.splice(i, 1);
  }
}

export function updateFloatingTexts(s: ConjurerState, dt: number): void {
  for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
    const ft = s.floatingTexts[i];
    ft.y -= dt * 40;
    ft.life -= dt;
    if (ft.life <= 0) s.floatingTexts.splice(i, 1);
  }
}

export function spawnParticles(s: ConjurerState, x: number, y: number, count: number, color: number): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 120;
    s.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: B.PARTICLE_LIFETIME + Math.random() * 0.4,
      maxLife: B.PARTICLE_LIFETIME + 0.4,
      color, size: 1.5 + Math.random() * 3,
    });
  }
}

export function spawnFloatingText(s: ConjurerState, x: number, y: number, text: string, color: number): void {
  s.floatingTexts.push({ x, y, text, color, life: 1.5, maxLife: 1.5 });
}
