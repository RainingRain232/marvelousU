// ---------------------------------------------------------------------------
// 3Dragon mode — combat system (projectiles, collisions, skills)
// ---------------------------------------------------------------------------

import type { ThreeDragonState, TDProjectile, TDEnemy, TDExplosion, TDPowerUp, Vec3 } from "../state/ThreeDragonState";
import { TDSkillId, TDEnemyPattern } from "../state/ThreeDragonState";
import { TDBalance, TD_SKILL_CONFIGS } from "../config/ThreeDragonConfig";

// Callbacks for FX
let _onExplosion: ((x: number, y: number, z: number, radius: number, color: number) => void) | null = null;
let _onHit: ((x: number, y: number, z: number, damage: number, isCrit: boolean) => void) | null = null;
let _onPlayerHit: (() => void) | null = null;
let _onLightningStrike: ((x: number, y: number, z: number) => void) | null = null;
let _onEnemyDeath: ((x: number, y: number, z: number, size: number, color: number, glowColor: number, isBoss: boolean) => void) | null = null;
let _onBossKill: ((x: number, y: number, z: number, size: number, color: number, glowColor: number) => void) | null = null;
let _onPowerUpCollect: ((x: number, y: number, z: number, type: "health" | "mana") => void) | null = null;

export const ThreeDragonCombatSystem = {
  setExplosionCallback(cb: typeof _onExplosion): void { _onExplosion = cb; },
  setHitCallback(cb: typeof _onHit): void { _onHit = cb; },
  setPlayerHitCallback(cb: typeof _onPlayerHit): void { _onPlayerHit = cb; },
  setLightningCallback(cb: typeof _onLightningStrike): void { _onLightningStrike = cb; },
  setEnemyDeathCallback(cb: typeof _onEnemyDeath): void { _onEnemyDeath = cb; },
  setBossKillCallback(cb: typeof _onBossKill): void { _onBossKill = cb; },
  setPowerUpCollectCallback(cb: typeof _onPowerUpCollect): void { _onPowerUpCollect = cb; },

  update(state: ThreeDragonState, dt: number): void {
    _updateSkillCooldowns(state, dt);
    _handleSkillActivation(state, dt);
    _updatePlayerProjectiles(state, dt);
    _updateEnemyBehavior(state, dt);
    _updateEnemyProjectiles(state, dt);
    _updateExplosions(state, dt);
    _checkPlayerCollisions(state);
    _updateMana(state, dt);
    _updateCombo(state, dt);
    _updateInvincibility(state, dt);
    _updateShield(state, dt);
    _updatePowerUps(state, dt);
    _cleanupDead(state);
  },
};

function _dist3(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function _dist3sq(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

// ---------------------------------------------------------------------------
// Skill cooldowns & activation
// ---------------------------------------------------------------------------

function _updateSkillCooldowns(state: ThreeDragonState, dt: number): void {
  for (const skill of state.skills) {
    if (skill.cooldown > 0) skill.cooldown -= dt;
    if (skill.activeTimer > 0) skill.activeTimer -= dt;
    if (skill.activeTimer <= 0) skill.active = false;
  }
}

function _handleSkillActivation(state: ThreeDragonState, dt: number): void {
  const inp = state.input;
  const p = state.player;

  // Arcane Bolt (auto-fire on mouse hold)
  const bolt = state.skills.find(s => s.id === TDSkillId.ARCANE_BOLT)!;
  if (inp.fire && bolt.cooldown <= 0) {
    bolt.cooldown = bolt.maxCooldown;
    _fireArcaneBolt(state);
  }

  // Celestial Lance (key 1)
  if (inp.skill1) {
    inp.skill1 = false;
    const skill = state.skills.find(s => s.id === TDSkillId.CELESTIAL_LANCE)!;
    const cfg = TD_SKILL_CONFIGS[TDSkillId.CELESTIAL_LANCE];
    if (skill.cooldown <= 0 && p.mana >= cfg.manaCost) {
      skill.cooldown = skill.maxCooldown;
      p.mana -= cfg.manaCost;
      _fireCelestialLance(state);
    }
  }

  // Thunderstorm (key 2)
  if (inp.skill2) {
    inp.skill2 = false;
    const skill = state.skills.find(s => s.id === TDSkillId.THUNDERSTORM)!;
    const cfg = TD_SKILL_CONFIGS[TDSkillId.THUNDERSTORM];
    if (skill.cooldown <= 0 && p.mana >= cfg.manaCost) {
      skill.cooldown = skill.maxCooldown;
      skill.active = true;
      skill.activeTimer = cfg.duration;
      p.mana -= cfg.manaCost;
    }
  }

  // Thunderstorm channeling
  const thunderSkill = state.skills.find(s => s.id === TDSkillId.THUNDERSTORM)!;
  if (thunderSkill.active && thunderSkill.activeTimer > 0) {
    const interval = 0.25;
    const tPrev = thunderSkill.activeTimer + dt;
    const strikes = Math.floor(tPrev / interval) - Math.floor(thunderSkill.activeTimer / interval);
    for (let i = 0; i < strikes; i++) {
      _thunderStrike(state);
    }
  }

  // Frost Nova (key 3)
  if (inp.skill3) {
    inp.skill3 = false;
    const skill = state.skills.find(s => s.id === TDSkillId.FROST_NOVA)!;
    const cfg = TD_SKILL_CONFIGS[TDSkillId.FROST_NOVA];
    if (skill.cooldown <= 0 && p.mana >= cfg.manaCost) {
      skill.cooldown = skill.maxCooldown;
      p.mana -= cfg.manaCost;
      _frostNova(state);
    }
  }

  // Meteor Shower (key 4)
  if (inp.skill4) {
    inp.skill4 = false;
    const skill = state.skills.find(s => s.id === TDSkillId.METEOR_SHOWER)!;
    const cfg = TD_SKILL_CONFIGS[TDSkillId.METEOR_SHOWER];
    if (skill.cooldown <= 0 && p.mana >= cfg.manaCost) {
      skill.cooldown = skill.maxCooldown;
      skill.active = true;
      skill.activeTimer = cfg.duration;
      p.mana -= cfg.manaCost;
    }
  }

  // Meteor channeling
  const meteorSkill = state.skills.find(s => s.id === TDSkillId.METEOR_SHOWER)!;
  if (meteorSkill.active && meteorSkill.activeTimer > 0) {
    const interval = 0.3;
    const tPrev = meteorSkill.activeTimer + dt;
    const strikes = Math.floor(tPrev / interval) - Math.floor(meteorSkill.activeTimer / interval);
    for (let i = 0; i < strikes; i++) {
      _meteorStrike(state);
    }
  }

  // Divine Shield (key 5)
  if (inp.skill5) {
    inp.skill5 = false;
    const skill = state.skills.find(s => s.id === TDSkillId.DIVINE_SHIELD)!;
    const cfg = TD_SKILL_CONFIGS[TDSkillId.DIVINE_SHIELD];
    if (skill.cooldown <= 0 && p.mana >= cfg.manaCost) {
      skill.cooldown = skill.maxCooldown;
      skill.active = true;
      skill.activeTimer = cfg.duration;
      p.mana -= cfg.manaCost;
      p.shieldActive = true;
      p.shieldTimer = cfg.duration;
    }
  }
}

// ---------------------------------------------------------------------------
// Skill implementations
// ---------------------------------------------------------------------------

function _fireArcaneBolt(state: ThreeDragonState): void {
  const p = state.player;
  const cfg = TD_SKILL_CONFIGS[TDSkillId.ARCANE_BOLT];

  // Fire forward (negative Z) with slight spread
  const spread = (Math.random() - 0.5) * 0.8;
  const spreadY = (Math.random() - 0.5) * 0.4;

  const proj: TDProjectile = {
    id: state.nextId++,
    position: { x: p.position.x, y: p.position.y, z: p.position.z - 2 },
    velocity: { x: spread * 10, y: spreadY * 5, z: -60 },
    damage: cfg.damage,
    radius: 0.8,
    lifetime: 3,
    isPlayerOwned: true,
    skillId: TDSkillId.ARCANE_BOLT,
    color: cfg.color,
    trailColor: 0x4488cc,
    pierce: 0,
    hitEnemies: new Set(),
    homing: false,
    homingTarget: null,
    size: 0.3,
    glowIntensity: 0.8,
  };
  state.projectiles.push(proj);
}

function _fireCelestialLance(state: ThreeDragonState): void {
  const p = state.player;
  const cfg = TD_SKILL_CONFIGS[TDSkillId.CELESTIAL_LANCE];

  // Piercing lance that goes through enemies
  const proj: TDProjectile = {
    id: state.nextId++,
    position: { x: p.position.x, y: p.position.y, z: p.position.z - 2 },
    velocity: { x: 0, y: 0, z: -80 },
    damage: cfg.damage,
    radius: 2,
    lifetime: 4,
    isPlayerOwned: true,
    skillId: TDSkillId.CELESTIAL_LANCE,
    color: cfg.color,
    trailColor: 0xffffdd,
    pierce: 5,
    hitEnemies: new Set(),
    homing: false,
    homingTarget: null,
    size: 1.0,
    glowIntensity: 2.0,
  };
  state.projectiles.push(proj);

  _onExplosion?.(p.position.x, p.position.y, p.position.z - 3, 3, cfg.color);
}

function _thunderStrike(state: ThreeDragonState): void {
  const cfg = TD_SKILL_CONFIGS[TDSkillId.THUNDERSTORM];
  const p = state.player;

  // Strike ahead of player with randomness
  const cx = p.position.x + (Math.random() - 0.5) * 20;
  const cy = p.position.y + (Math.random() - 0.5) * 8;
  const cz = p.position.z - 20 - Math.random() * 30;

  const radius = 5;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (_dist3(e.position, { x: cx, y: cy, z: cz }) < radius + e.size * 2) {
      _damageEnemy(state, e, cfg.damage);
    }
  }

  _onLightningStrike?.(cx, cy, cz);
  _onExplosion?.(cx, cy, cz, radius, cfg.color);
}

function _frostNova(state: ThreeDragonState): void {
  const p = state.player;
  const cfg = TD_SKILL_CONFIGS[TDSkillId.FROST_NOVA];
  const radius = 18;

  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (_dist3(e.position, p.position) < radius) {
      _damageEnemy(state, e, cfg.damage);
      e.slowFactor = 0.3;
      e.slowTimer = 3;
    }
  }

  _onExplosion?.(p.position.x, p.position.y, p.position.z, radius, cfg.color);
}

function _meteorStrike(state: ThreeDragonState): void {
  const cfg = TD_SKILL_CONFIGS[TDSkillId.METEOR_SHOWER];
  const p = state.player;

  const x = p.position.x + (Math.random() - 0.5) * 30;
  const y = (Math.random()) * 12 + 2;
  const z = p.position.z - 15 - Math.random() * 40;

  const explosion: TDExplosion = {
    id: state.nextId++,
    position: { x, y, z },
    radius: 0,
    maxRadius: 5 + Math.random() * 3,
    timer: 0,
    maxTimer: 0.5,
    color: cfg.color,
    damage: cfg.damage,
    hitEnemies: new Set(),
  };
  state.explosions.push(explosion);

  _onExplosion?.(x, y, z, explosion.maxRadius, cfg.color);
}

// ---------------------------------------------------------------------------
// Projectile updates
// ---------------------------------------------------------------------------

function _updatePlayerProjectiles(state: ThreeDragonState, dt: number): void {
  const maxDist = TDBalance.PROJECTILE_CLEANUP_DIST;

  for (const proj of state.projectiles) {
    if (!proj.isPlayerOwned) continue;

    // Homing
    if (proj.homing && proj.homingTarget !== null) {
      const target = state.enemies.find(e => e.id === proj.homingTarget && e.alive);
      if (target) {
        const dx = target.position.x - proj.position.x;
        const dy = target.position.y - proj.position.y;
        const dz = target.position.z - proj.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > 1) {
          const turnSpeed = 4;
          const speed = Math.sqrt(proj.velocity.x ** 2 + proj.velocity.y ** 2 + proj.velocity.z ** 2);
          proj.velocity.x += (dx / dist) * turnSpeed * dt * speed;
          proj.velocity.y += (dy / dist) * turnSpeed * dt * speed;
          proj.velocity.z += (dz / dist) * turnSpeed * dt * speed;
          // Renormalize
          const newSpeed = Math.sqrt(proj.velocity.x ** 2 + proj.velocity.y ** 2 + proj.velocity.z ** 2);
          const ratio = speed / newSpeed;
          proj.velocity.x *= ratio;
          proj.velocity.y *= ratio;
          proj.velocity.z *= ratio;
        }
      }
    }

    proj.position.x += proj.velocity.x * dt;
    proj.position.y += proj.velocity.y * dt;
    proj.position.z += proj.velocity.z * dt;
    proj.lifetime -= dt;

    // Collision with enemies
    for (const enemy of state.enemies) {
      if (!enemy.alive || proj.hitEnemies.has(enemy.id)) continue;
      const hitDist = proj.radius + enemy.size * 1.5;
      if (_dist3sq(proj.position, enemy.position) < hitDist * hitDist) {
        proj.hitEnemies.add(enemy.id);
        _damageEnemy(state, enemy, proj.damage);
        if (proj.pierce <= 0) {
          proj.lifetime = -1;
          break;
        }
        proj.pierce--;
      }
    }
  }

  // Remove expired / distant
  const pz = state.player.position.z;
  state.projectiles = state.projectiles.filter(p => {
    if (!p.isPlayerOwned) return true;
    if (p.lifetime <= 0) return false;
    if (Math.abs(p.position.z - pz) > maxDist) return false;
    if (Math.abs(p.position.x) > 50) return false;
    if (p.position.y < -5 || p.position.y > 30) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Enemy behavior
// ---------------------------------------------------------------------------

function _updateEnemyBehavior(state: ThreeDragonState, dt: number): void {
  const pPos = state.player.position;

  for (const e of state.enemies) {
    if (!e.alive) {
      e.deathTimer -= dt;
      continue;
    }

    if (e.slowTimer > 0) {
      e.slowTimer -= dt;
      if (e.slowTimer <= 0) e.slowFactor = 1;
    }

    e.hitTimer = Math.max(0, e.hitTimer - dt);
    e.patternTimer += dt;
    e.rotationY += e.rotationSpeed * dt;

    const sf = e.slowFactor;

    switch (e.pattern) {
      case TDEnemyPattern.STRAIGHT:
        e.position.x += e.velocity.x * sf * dt;
        e.position.y += e.velocity.y * sf * dt;
        e.position.z += e.velocity.z * sf * dt;
        break;

      case TDEnemyPattern.SINE_WAVE:
        e.position.x += e.velocity.x * sf * dt + Math.sin(e.patternTimer * 2) * 6 * dt;
        e.position.y += Math.cos(e.patternTimer * 1.5) * 3 * dt;
        e.position.z += e.velocity.z * sf * dt;
        break;

      case TDEnemyPattern.SPIRAL:
        e.position.x += Math.sin(e.patternTimer * 3) * 8 * sf * dt;
        e.position.y += Math.cos(e.patternTimer * 3) * 5 * sf * dt;
        e.position.z += e.velocity.z * sf * dt;
        break;

      case TDEnemyPattern.SWARM: {
        // Move toward player in swarm
        e.position.x += e.velocity.x * sf * dt + Math.sin(e.patternTimer * 5 + e.id) * 4 * dt;
        e.position.y += Math.sin(e.patternTimer * 3 + e.id * 0.7) * 3 * dt;
        e.position.z += e.velocity.z * sf * dt;
        break;
      }

      case TDEnemyPattern.DIVE: {
        const dx = pPos.x - e.position.x;
        const dy = pPos.y - e.position.y;
        const dz = pPos.z - e.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > 2) {
          const speed = 20 * sf;
          e.position.x += (dx / dist) * speed * dt;
          e.position.y += (dy / dist) * speed * dt;
          e.position.z += (dz / dist) * speed * dt;
        }
        break;
      }

      case TDEnemyPattern.HOVER:
        // Move to position ahead of player and hover
        if (e.position.z > pPos.z - 25) {
          e.position.z += e.velocity.z * sf * dt;
        } else {
          e.position.y += Math.sin(e.patternTimer * 1.5) * 2 * dt;
          e.position.x += Math.sin(e.patternTimer * 0.7) * 3 * dt;
          // Keep pace with player
          e.position.z = pPos.z - 25 + Math.sin(e.patternTimer * 0.5) * 5;
        }
        break;

      case TDEnemyPattern.GROUND:
        e.position.x += e.velocity.x * sf * dt;
        e.position.z += e.velocity.z * sf * dt;
        e.position.y = 0;
        break;

      case TDEnemyPattern.BOSS_PATTERN:
        _updateBoss(state, e, dt);
        break;
    }

    // Enemy firing
    if (e.fireRate > 0 && !e.isBoss) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = e.fireRate + Math.random() * 0.5;
        _enemyFire(state, e);
      }
    }

    // Remove if too far behind player
    if (e.position.z > pPos.z + 20 && e.pattern !== TDEnemyPattern.BOSS_PATTERN) {
      e.alive = false;
    }
  }
}

function _updateBoss(state: ThreeDragonState, boss: TDEnemy, dt: number): void {
  const sf = boss.slowFactor;
  const pPos = state.player.position;

  // Move to position ahead of player
  const targetZ = pPos.z - 30;
  if (boss.position.z < targetZ - 5) {
    boss.position.z += 8 * dt;
  } else if (boss.position.z > targetZ + 5) {
    boss.position.z -= 4 * dt;
  }

  // Keep pace with player scroll
  boss.position.z = Math.min(boss.position.z, pPos.z - 15);

  // Phase movement
  const phase = Math.floor(boss.patternTimer / 5) % 3;
  switch (phase) {
    case 0:
      boss.position.x += Math.sin(boss.patternTimer * 1.2) * 8 * sf * dt;
      boss.position.y += Math.cos(boss.patternTimer * 0.8) * 4 * sf * dt;
      break;
    case 1: {
      const dy = pPos.y - boss.position.y;
      const dx = pPos.x - boss.position.x;
      boss.position.y += Math.sign(dy) * Math.min(Math.abs(dy), 8 * sf * dt);
      boss.position.x += Math.sign(dx) * Math.min(Math.abs(dx), 6 * sf * dt);
      break;
    }
    case 2:
      boss.position.x += Math.sin(boss.patternTimer * 2) * 10 * sf * dt;
      boss.position.y += Math.cos(boss.patternTimer * 1.5) * 6 * sf * dt;
      break;
  }

  // Clamp
  boss.position.x = Math.max(-20, Math.min(20, boss.position.x));
  boss.position.y = Math.max(4, Math.min(20, boss.position.y));

  // Boss firing
  boss.attackTimer -= dt;
  if (boss.attackTimer <= 0) {
    boss.attackTimer = boss.fireRate;
    boss.bossPhase = (boss.bossPhase + 1) % 4;

    switch (boss.bossPhase) {
      case 0: // Spread shot
        for (let i = -3; i <= 3; i++) {
          const angle = i * 0.25;
          _spawnEnemyProjectile3D(state, boss,
            { x: Math.sin(angle) * 15, y: 0, z: 25 }, boss.glowColor);
        }
        break;
      case 1: // Aimed at player
        {
          const dx = pPos.x - boss.position.x;
          const dy = pPos.y - boss.position.y;
          const dz = pPos.z - boss.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist > 0) {
            const speed = 25;
            for (let i = 0; i < 3; i++) {
              _spawnEnemyProjectile3D(state, boss, {
                x: (dx / dist) * (speed + i * 5),
                y: (dy / dist) * (speed + i * 5),
                z: (dz / dist) * (speed + i * 5),
              }, boss.glowColor);
            }
          }
        }
        break;
      case 2: // Ring
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          _spawnEnemyProjectile3D(state, boss,
            { x: Math.cos(a) * 12, y: Math.sin(a) * 12, z: 8 }, boss.glowColor);
        }
        break;
      case 3: // Rapid aimed
        {
          const dx = pPos.x - boss.position.x;
          const dy = pPos.y - boss.position.y;
          const dz = pPos.z - boss.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist > 0) {
            _spawnEnemyProjectile3D(state, boss, {
              x: (dx / dist) * 30,
              y: (dy / dist) * 30,
              z: (dz / dist) * 30,
            }, boss.glowColor);
          }
        }
        break;
    }
  }
}

function _enemyFire(state: ThreeDragonState, enemy: TDEnemy): void {
  const pPos = state.player.position;
  const dx = pPos.x - enemy.position.x;
  const dy = pPos.y - enemy.position.y;
  const dz = pPos.z - enemy.position.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist > 0) {
    const speed = 18;
    _spawnEnemyProjectile3D(state, enemy, {
      x: (dx / dist) * speed,
      y: (dy / dist) * speed,
      z: (dz / dist) * speed,
    }, enemy.glowColor);
  }
}

function _spawnEnemyProjectile3D(state: ThreeDragonState, source: TDEnemy, vel: Vec3, color: number): void {
  const dmgScale = 1 + state.wave * TDBalance.ENEMY_DMG_SCALE;
  const baseDmg = source.isBoss ? 15 : 8;

  const proj: TDProjectile = {
    id: state.nextId++,
    position: { x: source.position.x, y: source.position.y, z: source.position.z },
    velocity: vel,
    damage: Math.floor(baseDmg * dmgScale),
    radius: source.isBoss ? 1 : 0.6,
    lifetime: 6,
    isPlayerOwned: false,
    skillId: null,
    color,
    trailColor: color,
    pierce: 0,
    hitEnemies: new Set(),
    homing: false,
    homingTarget: null,
    size: source.isBoss ? 0.5 : 0.3,
    glowIntensity: 0.6,
  };
  state.projectiles.push(proj);
}

// ---------------------------------------------------------------------------
// Enemy projectiles
// ---------------------------------------------------------------------------

function _updateEnemyProjectiles(state: ThreeDragonState, dt: number): void {
  const pz = state.player.position.z;

  state.projectiles = state.projectiles.filter(p => {
    if (p.isPlayerOwned) return true;
    p.position.x += p.velocity.x * dt;
    p.position.y += p.velocity.y * dt;
    p.position.z += p.velocity.z * dt;
    p.lifetime -= dt;
    if (p.lifetime <= 0) return false;
    if (Math.abs(p.position.z - pz) > TDBalance.PROJECTILE_CLEANUP_DIST) return false;
    if (Math.abs(p.position.x) > 50) return false;
    if (p.position.y < -5 || p.position.y > 30) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Player collision
// ---------------------------------------------------------------------------

function _checkPlayerCollisions(state: ThreeDragonState): void {
  if (state.player.invincTimer > 0) return;
  const p = state.player;
  const hitR = TDBalance.PLAYER_HIT_RADIUS;

  // Shield blocks damage
  if (p.shieldActive) return;

  // Enemy projectiles
  for (const proj of state.projectiles) {
    if (proj.isPlayerOwned) continue;
    if (_dist3sq(proj.position, p.position) < (hitR + proj.radius) * (hitR + proj.radius)) {
      p.hp -= proj.damage;
      proj.lifetime = -1;
      p.invincTimer = TDBalance.PLAYER_INVINCIBILITY;
      p.comboCount = 0;
      _onPlayerHit?.();
      if (p.hp <= 0) {
        p.hp = 0;
        state.gameOver = true;
      }
      break;
    }
  }

  // Contact with enemies
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const contactDist = hitR + e.size * 1.5;
    if (_dist3sq(e.position, p.position) < contactDist * contactDist) {
      const dmg = e.isBoss ? 20 : 10;
      p.hp -= dmg;
      p.invincTimer = TDBalance.PLAYER_INVINCIBILITY;
      p.comboCount = 0;
      _onPlayerHit?.();
      if (p.hp <= 0) {
        p.hp = 0;
        state.gameOver = true;
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Explosions
// ---------------------------------------------------------------------------

function _updateExplosions(state: ThreeDragonState, dt: number): void {
  for (const ex of state.explosions) {
    ex.timer += dt;
    ex.radius = (ex.timer / ex.maxTimer) * ex.maxRadius;

    for (const e of state.enemies) {
      if (!e.alive || ex.hitEnemies.has(e.id)) continue;
      if (_dist3sq(e.position, ex.position) < (ex.radius + e.size * 1.5) * (ex.radius + e.size * 1.5)) {
        ex.hitEnemies.add(e.id);
        _damageEnemy(state, e, ex.damage);
      }
    }
  }

  state.explosions = state.explosions.filter(ex => ex.timer < ex.maxTimer);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _damageEnemy(state: ThreeDragonState, enemy: TDEnemy, damage: number): void {
  const isCrit = Math.random() < 0.15;
  const finalDmg = isCrit ? Math.floor(damage * 1.8) : damage;
  enemy.hp -= finalDmg;
  enemy.hitTimer = 0.1;

  _onHit?.(enemy.position.x, enemy.position.y, enemy.position.z, finalDmg, isCrit);

  state.player.comboCount++;
  state.player.comboTimer = TDBalance.COMBO_TIMEOUT;

  if (enemy.hp <= 0) {
    enemy.alive = false;
    enemy.deathTimer = 0.5;
    const comboMult = 1 + state.player.comboCount * TDBalance.COMBO_SCORE_MULT;
    state.player.score += Math.floor(enemy.scoreValue * comboMult);
    _onExplosion?.(enemy.position.x, enemy.position.y, enemy.position.z, enemy.size * 3, enemy.glowColor);

    // Enemy death callback
    _onEnemyDeath?.(enemy.position.x, enemy.position.y, enemy.position.z, enemy.size, enemy.color, enemy.glowColor, enemy.isBoss);

    // Boss kill: callback + slow-mo
    if (enemy.isBoss) {
      _onBossKill?.(enemy.position.x, enemy.position.y, enemy.position.z, enemy.size, enemy.color, enemy.glowColor);
      state.slowMoTimer = 1.5;
      state.slowMoFactor = 0.2;
    }

    // Roll for power-up drop
    if (Math.random() < TDBalance.POWERUP_DROP_CHANCE) {
      const isHealth = Math.random() < TDBalance.POWERUP_HEALTH_RATIO;
      const powerUp: TDPowerUp = {
        id: state.nextId++,
        position: { x: enemy.position.x, y: enemy.position.y, z: enemy.position.z },
        velocity: {
          x: (Math.random() - 0.5) * 8,
          y: 5 + Math.random() * 5,
          z: (Math.random() - 0.5) * 8,
        },
        type: isHealth ? "health" : "mana",
        value: isHealth ? TDBalance.POWERUP_HEALTH_VALUE : TDBalance.POWERUP_MANA_VALUE,
        lifetime: TDBalance.POWERUP_LIFETIME,
        collected: false,
        magnetTimer: 0.5,
      };
      state.powerUps.push(powerUp);
    }
  }
}

function _updateMana(state: ThreeDragonState, dt: number): void {
  state.player.mana = Math.min(state.player.maxMana, state.player.mana + state.player.manaRegen * dt);
}

function _updateCombo(state: ThreeDragonState, dt: number): void {
  if (state.player.comboTimer > 0) {
    state.player.comboTimer -= dt;
    if (state.player.comboTimer <= 0) state.player.comboCount = 0;
  }
}

function _updateInvincibility(state: ThreeDragonState, dt: number): void {
  if (state.player.invincTimer > 0) state.player.invincTimer -= dt;
}

function _updateShield(state: ThreeDragonState, dt: number): void {
  if (state.player.shieldTimer > 0) {
    state.player.shieldTimer -= dt;
    if (state.player.shieldTimer <= 0) {
      state.player.shieldActive = false;
    }
  }
}

function _updatePowerUps(state: ThreeDragonState, dt: number): void {
  const p = state.player;

  for (const pu of state.powerUps) {
    if (pu.collected) continue;

    // Apply gravity
    pu.velocity.y -= 15 * dt;

    // Move
    pu.position.x += pu.velocity.x * dt;
    pu.position.y += pu.velocity.y * dt;
    pu.position.z += pu.velocity.z * dt;

    // Floor bounce
    if (pu.position.y < 1) {
      pu.position.y = 1;
      pu.velocity.y = Math.abs(pu.velocity.y) * 0.3;
      pu.velocity.x *= 0.5;
      pu.velocity.z *= 0.5;
    }

    // Decrement lifetime
    pu.lifetime -= dt;

    // Magnet timer
    if (pu.magnetTimer > 0) {
      pu.magnetTimer -= dt;
      continue;
    }

    // Magnet: accelerate toward player if within radius
    const dx = p.position.x - pu.position.x;
    const dy = p.position.y - pu.position.y;
    const dz = p.position.z - pu.position.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const magnetR = TDBalance.POWERUP_MAGNET_RADIUS;

    if (distSq < magnetR * magnetR) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.1) {
        const speed = TDBalance.POWERUP_MAGNET_SPEED;
        pu.velocity.x = (dx / dist) * speed;
        pu.velocity.y = (dy / dist) * speed;
        pu.velocity.z = (dz / dist) * speed;
      }
    }

    // Collect if within radius
    const collectR = TDBalance.POWERUP_COLLECT_RADIUS;
    if (distSq < collectR * collectR) {
      pu.collected = true;
      if (pu.type === "health") {
        p.hp = Math.min(p.maxHp, p.hp + pu.value);
      } else {
        p.mana = Math.min(p.maxMana, p.mana + pu.value);
      }
      _onPowerUpCollect?.(pu.position.x, pu.position.y, pu.position.z, pu.type);
    }
  }

  // Filter out collected or expired
  state.powerUps = state.powerUps.filter(pu => !pu.collected && pu.lifetime > 0);
}

function _cleanupDead(state: ThreeDragonState): void {
  state.enemies = state.enemies.filter(e => e.alive || e.deathTimer > 0);
}
