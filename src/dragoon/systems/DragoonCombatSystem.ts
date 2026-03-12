// ---------------------------------------------------------------------------
// Panzer Dragoon mode — combat system (projectiles, collisions, skills)
// ---------------------------------------------------------------------------

import type { DragoonState, DragoonProjectile, DragoonEnemy, DragoonExplosion, DragoonPickup } from "../state/DragoonState";
import { DragoonSkillId, EnemyPattern, DragoonPickupType } from "../state/DragoonState";
import { DragoonBalance, SKILL_CONFIGS } from "../config/DragoonConfig";

// Callbacks for FX
let _onExplosion: ((x: number, y: number, radius: number, color: number) => void) | null = null;
let _onHit: ((x: number, y: number, damage: number, isCrit: boolean) => void) | null = null;
let _onPlayerHit: (() => void) | null = null;
let _onLightningStrike: ((x: number, y: number) => void) | null = null;

export const DragoonCombatSystem = {
  setExplosionCallback(cb: typeof _onExplosion): void { _onExplosion = cb; },
  setHitCallback(cb: typeof _onHit): void { _onHit = cb; },
  setPlayerHitCallback(cb: typeof _onPlayerHit): void { _onPlayerHit = cb; },
  setLightningCallback(cb: typeof _onLightningStrike): void { _onLightningStrike = cb; },

  update(state: DragoonState, dt: number): void {
    _updateSkillCooldowns(state, dt);
    _handleSkillActivation(state, dt);
    _updateShield(state, dt);
    _updatePlayerProjectiles(state, dt);
    _updateEnemyBehavior(state, dt);
    _updateEnemyProjectiles(state, dt);
    _updateExplosions(state, dt);
    _checkPlayerCollisions(state);
    _updatePickups(state, dt);
    _updateScoreMult(state, dt);
    _updateMana(state, dt);
    _updateCombo(state, dt);
    _updateInvincibility(state, dt);
    _updateBossEntrance(state, dt);
    _cleanupDead(state);
  },
};

// ---------------------------------------------------------------------------
// Skill cooldowns & activation
// ---------------------------------------------------------------------------

function _updateSkillCooldowns(state: DragoonState, dt: number): void {
  for (const skill of state.skills) {
    if (skill.cooldown > 0) skill.cooldown -= dt;
    if (skill.activeTimer > 0) skill.activeTimer -= dt;
    if (skill.activeTimer <= 0) skill.active = false;
  }
}

function _handleSkillActivation(state: DragoonState, dt: number): void {
  const inp = state.input;
  const p = state.player;

  // Arcane Bolt (auto-fire on mouse hold)
  const bolt = state.skills.find(s => s.id === DragoonSkillId.ARCANE_BOLT)!;
  if (inp.fire && bolt.cooldown <= 0) {
    bolt.cooldown = bolt.maxCooldown;
    _fireArcaneBolt(state);
  }

  // Starfall (key 1)
  if (inp.skill1) {
    inp.skill1 = false;
    const skill = state.skills.find(s => s.id === DragoonSkillId.STARFALL)!;
    if (skill.cooldown <= 0 && p.mana >= SKILL_CONFIGS[DragoonSkillId.STARFALL].manaCost) {
      skill.cooldown = skill.maxCooldown;
      skill.active = true;
      skill.activeTimer = SKILL_CONFIGS[DragoonSkillId.STARFALL].duration;
      p.mana -= SKILL_CONFIGS[DragoonSkillId.STARFALL].manaCost;
      _fireStarfall(state);
    }
  }

  // Thunderstorm (key 2)
  if (inp.skill2) {
    inp.skill2 = false;
    const skill = state.skills.find(s => s.id === DragoonSkillId.THUNDERSTORM)!;
    if (skill.cooldown <= 0 && p.mana >= SKILL_CONFIGS[DragoonSkillId.THUNDERSTORM].manaCost) {
      skill.cooldown = skill.maxCooldown;
      skill.active = true;
      skill.activeTimer = SKILL_CONFIGS[DragoonSkillId.THUNDERSTORM].duration;
      p.mana -= SKILL_CONFIGS[DragoonSkillId.THUNDERSTORM].manaCost;
    }
  }

  // Thunderstorm channeling — strike periodically while active
  const thunderSkill = state.skills.find(s => s.id === DragoonSkillId.THUNDERSTORM)!;
  if (thunderSkill.active && thunderSkill.activeTimer > 0) {
    // Strike every 0.25s
    const strikeInterval = 0.25;
    const tPrev = thunderSkill.activeTimer + dt;
    const strikes = Math.floor(tPrev / strikeInterval) - Math.floor(thunderSkill.activeTimer / strikeInterval);
    for (let i = 0; i < strikes; i++) {
      _thunderStrike(state);
    }
  }

  // Frost Nova (key 3)
  if (inp.skill3) {
    inp.skill3 = false;
    const skill = state.skills.find(s => s.id === DragoonSkillId.FROST_NOVA)!;
    if (skill.cooldown <= 0 && p.mana >= SKILL_CONFIGS[DragoonSkillId.FROST_NOVA].manaCost) {
      skill.cooldown = skill.maxCooldown;
      p.mana -= SKILL_CONFIGS[DragoonSkillId.FROST_NOVA].manaCost;
      _frostNova(state);
    }
  }

  // Meteor Shower (key 4)
  if (inp.skill4) {
    inp.skill4 = false;
    const skill = state.skills.find(s => s.id === DragoonSkillId.METEOR_SHOWER)!;
    if (skill.cooldown <= 0 && p.mana >= SKILL_CONFIGS[DragoonSkillId.METEOR_SHOWER].manaCost) {
      skill.cooldown = skill.maxCooldown;
      skill.active = true;
      skill.activeTimer = SKILL_CONFIGS[DragoonSkillId.METEOR_SHOWER].duration;
      p.mana -= SKILL_CONFIGS[DragoonSkillId.METEOR_SHOWER].manaCost;
    }
  }

  // Meteor shower channeling
  const meteorSkill = state.skills.find(s => s.id === DragoonSkillId.METEOR_SHOWER)!;
  if (meteorSkill.active && meteorSkill.activeTimer > 0) {
    const strikeInterval = 0.3;
    const tPrev = meteorSkill.activeTimer + dt;
    const strikes = Math.floor(tPrev / strikeInterval) - Math.floor(meteorSkill.activeTimer / strikeInterval);
    for (let i = 0; i < strikes; i++) {
      _meteorStrike(state);
    }
  }

  // Divine Shield (key 5)
  if (inp.skill5) {
    inp.skill5 = false;
    const skill = state.skills.find(s => s.id === DragoonSkillId.DIVINE_SHIELD)!;
    if (skill.cooldown <= 0 && p.mana >= SKILL_CONFIGS[DragoonSkillId.DIVINE_SHIELD].manaCost) {
      skill.cooldown = skill.maxCooldown;
      skill.active = true;
      skill.activeTimer = SKILL_CONFIGS[DragoonSkillId.DIVINE_SHIELD].duration;
      p.mana -= SKILL_CONFIGS[DragoonSkillId.DIVINE_SHIELD].manaCost;
      p.shieldActive = true;
      p.shieldTimer = SKILL_CONFIGS[DragoonSkillId.DIVINE_SHIELD].duration;
    }
  }

  // Starfall channeling — fire homing projectiles
  const starSkill = state.skills.find(s => s.id === DragoonSkillId.STARFALL)!;
  if (starSkill.active && starSkill.activeTimer > 0) {
    const strikeInterval = 0.15;
    const tPrev = starSkill.activeTimer + dt;
    const strikes = Math.floor(tPrev / strikeInterval) - Math.floor(starSkill.activeTimer / strikeInterval);
    for (let i = 0; i < strikes; i++) {
      _fireHomingStar(state);
    }
  }
}

// ---------------------------------------------------------------------------
// Skill implementations
// ---------------------------------------------------------------------------

function _fireArcaneBolt(state: DragoonState): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.ARCANE_BOLT];
  const angle = Math.atan2(state.input.mouseY - p.position.y, state.input.mouseX - p.position.x);
  const speed = 700;

  const proj: DragoonProjectile = {
    id: state.nextId++,
    position: { x: p.position.x + 20, y: p.position.y - 5 },
    velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    damage: cfg.damage,
    radius: 8,
    lifetime: 2,
    isPlayerOwned: true,
    skillId: DragoonSkillId.ARCANE_BOLT,
    color: cfg.color,
    trailColor: 0x4488cc,
    pierce: 0,
    hitEnemies: new Set(),
    homing: false,
    homingTarget: null,
    size: 4,
    glowIntensity: 0.8,
  };
  state.projectiles.push(proj);
}

function _fireStarfall(state: DragoonState): void {
  // Initial burst of 5 homing stars
  for (let i = 0; i < 5; i++) {
    _fireHomingStar(state);
  }
}

function _fireHomingStar(state: DragoonState): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.STARFALL];
  const angle = -0.3 + Math.random() * 0.6;
  const speed = 350;

  // Find nearest enemy to target
  let targetId: number | null = null;
  let minDist = Infinity;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const dx = e.position.x - p.position.x;
    const dy = e.position.y - p.position.y;
    const d = dx * dx + dy * dy;
    if (d < minDist) { minDist = d; targetId = e.id; }
  }

  const proj: DragoonProjectile = {
    id: state.nextId++,
    position: { x: p.position.x + 15, y: p.position.y - 10 },
    velocity: { x: speed * Math.cos(angle), y: speed * Math.sin(angle) - 100 },
    damage: cfg.damage,
    radius: 10,
    lifetime: 4,
    isPlayerOwned: true,
    skillId: DragoonSkillId.STARFALL,
    color: cfg.color,
    trailColor: 0xffaa00,
    pierce: 1,
    hitEnemies: new Set(),
    homing: true,
    homingTarget: targetId,
    size: 6,
    glowIntensity: 1.2,
  };
  state.projectiles.push(proj);
}

function _thunderStrike(state: DragoonState): void {
  const cfg = SKILL_CONFIGS[DragoonSkillId.THUNDERSTORM];
  const cx = state.input.mouseX + (Math.random() - 0.5) * 120;
  const cy = state.input.mouseY + (Math.random() - 0.5) * 120;

  // Damage enemies in radius
  const radius = 50;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const dx = e.position.x - cx;
    const dy = e.position.y - cy;
    if (dx * dx + dy * dy < (radius + e.size * 15) * (radius + e.size * 15)) {
      _damageEnemy(state, e, cfg.damage);
    }
  }

  _onLightningStrike?.(cx, cy);
  _onExplosion?.(cx, cy, radius, cfg.color);
}

function _frostNova(state: DragoonState): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.FROST_NOVA];
  const radius = 180;

  for (const e of state.enemies) {
    if (!e.alive) continue;
    const dx = e.position.x - p.position.x;
    const dy = e.position.y - p.position.y;
    if (dx * dx + dy * dy < radius * radius) {
      _damageEnemy(state, e, cfg.damage);
      e.slowFactor = 0.3;
      e.slowTimer = 3;
    }
  }

  _onExplosion?.(p.position.x, p.position.y, radius, cfg.color);
}

function _meteorStrike(state: DragoonState): void {
  const cfg = SKILL_CONFIGS[DragoonSkillId.METEOR_SHOWER];
  // Random position biased toward right side of screen (where enemies are)
  const x = state.screenW * 0.3 + Math.random() * state.screenW * 0.65;
  const y = Math.random() * state.screenH * 0.8;

  const explosion: DragoonExplosion = {
    id: state.nextId++,
    position: { x, y },
    radius: 0,
    maxRadius: 60 + Math.random() * 30,
    timer: 0,
    maxTimer: 0.4,
    color: cfg.color,
    damage: cfg.damage,
    hitEnemies: new Set(),
  };
  state.explosions.push(explosion);

  _onExplosion?.(x, y, explosion.maxRadius, cfg.color);
}

// ---------------------------------------------------------------------------
// Projectile updates
// ---------------------------------------------------------------------------

function _updatePlayerProjectiles(state: DragoonState, dt: number): void {
  const margin = DragoonBalance.PROJECTILE_CLEANUP_MARGIN;

  for (const proj of state.projectiles) {
    if (!proj.isPlayerOwned) continue;

    // Homing behavior
    if (proj.homing && proj.homingTarget !== null) {
      const target = state.enemies.find(e => e.id === proj.homingTarget && e.alive);
      if (target) {
        const dx = target.position.x - proj.position.x;
        const dy = target.position.y - proj.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          const turnSpeed = 6;
          const curAngle = Math.atan2(proj.velocity.y, proj.velocity.x);
          const targetAngle = Math.atan2(dy, dx);
          let diff = targetAngle - curAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const newAngle = curAngle + Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed * dt);
          const speed = Math.sqrt(proj.velocity.x * proj.velocity.x + proj.velocity.y * proj.velocity.y);
          proj.velocity.x = Math.cos(newAngle) * speed;
          proj.velocity.y = Math.sin(newAngle) * speed;
        }
      } else {
        // Retarget
        let bestDist = Infinity;
        let bestId: number | null = null;
        for (const e of state.enemies) {
          if (!e.alive) continue;
          const dx = e.position.x - proj.position.x;
          const dy = e.position.y - proj.position.y;
          const d = dx * dx + dy * dy;
          if (d < bestDist) { bestDist = d; bestId = e.id; }
        }
        proj.homingTarget = bestId;
      }
    }

    proj.position.x += proj.velocity.x * dt;
    proj.position.y += proj.velocity.y * dt;
    proj.lifetime -= dt;

    // Check collision with enemies
    for (const enemy of state.enemies) {
      if (!enemy.alive || proj.hitEnemies.has(enemy.id)) continue;
      const dx = proj.position.x - enemy.position.x;
      const dy = proj.position.y - enemy.position.y;
      const hitDist = proj.radius + enemy.size * 15;
      if (dx * dx + dy * dy < hitDist * hitDist) {
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

  // Remove expired / off-screen
  state.projectiles = state.projectiles.filter(p => {
    if (!p.isPlayerOwned) return true;
    if (p.lifetime <= 0) return false;
    if (p.position.x < -margin || p.position.x > state.screenW + margin) return false;
    if (p.position.y < -margin || p.position.y > state.screenH + margin) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Enemy behavior
// ---------------------------------------------------------------------------

function _updateEnemyBehavior(state: DragoonState, dt: number): void {
  for (const e of state.enemies) {
    if (!e.alive) {
      e.deathTimer -= dt;
      continue;
    }

    // Slow
    if (e.slowTimer > 0) {
      e.slowTimer -= dt;
      if (e.slowTimer <= 0) e.slowFactor = 1;
    }

    e.hitTimer = Math.max(0, e.hitTimer - dt);
    e.patternTimer += dt;

    const sf = e.slowFactor;

    switch (e.pattern) {
      case EnemyPattern.STRAIGHT:
        e.position.x += e.velocity.x * sf * dt;
        e.position.y += e.velocity.y * sf * dt;
        break;

      case EnemyPattern.SINE_WAVE:
        e.position.x += e.velocity.x * sf * dt;
        e.position.y += Math.sin(e.patternTimer * 2.5) * 80 * dt;
        break;

      case EnemyPattern.CIRCLE: {
        const cx = e.position.x + e.velocity.x * sf * dt * 0.3;
        e.position.x = cx;
        e.position.y += Math.sin(e.patternTimer * 3) * 100 * dt;
        break;
      }

      case EnemyPattern.DIVE: {
        // Dive toward player
        const dx = state.player.position.x - e.position.x;
        const dy = state.player.position.y - e.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) {
          const speed = 250 * sf;
          e.position.x += (dx / dist) * speed * dt;
          e.position.y += (dy / dist) * speed * dt;
        }
        // If past player, keep going
        if (e.position.x < -50) e.alive = false;
        break;
      }

      case EnemyPattern.HOVER:
        // Move to a position and hover
        if (e.position.x > state.screenW * 0.65) {
          e.position.x += e.velocity.x * sf * dt;
        } else {
          // Gentle float
          e.position.y += Math.sin(e.patternTimer * 1.5) * 30 * dt;
          e.position.x += Math.sin(e.patternTimer * 0.7) * 15 * dt;
        }
        break;

      case EnemyPattern.GROUND:
        e.position.x += e.velocity.x * sf * dt;
        break;

      case EnemyPattern.ZIGZAG: {
        // Move left, alternate Y direction every 0.8s
        e.position.x += e.velocity.x * sf * dt;
        const zigPhase = Math.floor(e.patternTimer / 0.8);
        const zigDir = zigPhase % 2 === 0 ? 1 : -1;
        e.position.y += zigDir * e.velocity.x * -0.6 * sf * dt;
        break;
      }

      case EnemyPattern.V_FORMATION: {
        // Move left, maintain V-shape offset using patternParam as formation index
        e.position.x += e.velocity.x * sf * dt;
        const formIdx = e.patternParam;
        const vOffsetY = Math.abs(formIdx) * 25;
        const targetY = (state.screenH * 0.4) + vOffsetY * Math.sign(formIdx);
        const yDiff = targetY - e.position.y;
        e.position.y += Math.sign(yDiff) * Math.min(Math.abs(yDiff), 120 * sf * dt);
        break;
      }

      case EnemyPattern.TELEPORT: {
        // Slow drift
        e.position.x += e.velocity.x * sf * dt * 0.3;
        e.position.y += Math.sin(e.patternTimer * 1.5) * 20 * dt;
        // Teleport when countdown reaches 0
        e.patternParam -= dt;
        if (e.patternParam <= 0) {
          e.patternParam = 2.5 + Math.random() * 1.5; // Reset to 2.5-4s
          // Teleport to random position on right half of screen
          e.position.x = state.screenW * 0.4 + Math.random() * state.screenW * 0.5;
          e.position.y = 60 + Math.random() * (state.screenH * 0.7);
        }
        break;
      }

      case EnemyPattern.BOSS_PATTERN:
        _updateBoss(state, e, dt);
        break;
    }

    // Fire at player
    if (e.fireRate > 0 && !e.isBoss) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = e.fireRate + Math.random() * 0.5;
        _enemyFire(state, e);
      }
    }

    // Remove if off-screen left
    if (e.position.x < -100 && e.pattern !== EnemyPattern.BOSS_PATTERN) {
      e.alive = false;
    }
  }
}

function _updateBoss(state: DragoonState, boss: DragoonEnemy, dt: number): void {
  const sf = boss.slowFactor;
  const sw = state.screenW;
  const sh = state.screenH;

  // Move to screen right area and do patterns
  if (boss.position.x > sw * 0.7) {
    boss.position.x -= 80 * dt;
  }

  // Phase-based movement
  const phase = Math.floor(boss.patternTimer / 5) % 3;
  switch (phase) {
    case 0: // Slow sine wave
      boss.position.y += Math.sin(boss.patternTimer * 1.2) * 60 * sf * dt;
      break;
    case 1: // Chase player Y
      const dy = state.player.position.y - boss.position.y;
      boss.position.y += Math.sign(dy) * Math.min(Math.abs(dy), 120 * sf * dt);
      break;
    case 2: // Figure-8
      boss.position.x += Math.sin(boss.patternTimer * 2) * 40 * sf * dt;
      boss.position.y += Math.cos(boss.patternTimer * 1.5) * 60 * sf * dt;
      break;
  }

  // Clamp boss position
  boss.position.x = Math.max(sw * 0.5, Math.min(sw - 50, boss.position.x));
  boss.position.y = Math.max(60, Math.min(sh - 60, boss.position.y));

  // Boss firing patterns
  boss.attackTimer -= dt;
  if (boss.attackTimer <= 0) {
    boss.attackTimer = boss.fireRate;
    boss.bossPhase = (boss.bossPhase + 1) % 4;

    switch (boss.bossPhase) {
      case 0: // Spread shot
        for (let i = -3; i <= 3; i++) {
          const angle = Math.PI + i * 0.2;
          _spawnEnemyProjectile(state, boss, angle, 250, boss.glowColor);
        }
        break;
      case 1: // Aimed shot at player
        {
          const dx = state.player.position.x - boss.position.x;
          const dy = state.player.position.y - boss.position.y;
          const angle = Math.atan2(dy, dx);
          for (let i = 0; i < 3; i++) {
            _spawnEnemyProjectile(state, boss, angle + (i - 1) * 0.1, 300 + i * 50, boss.glowColor);
          }
        }
        break;
      case 2: // Ring shot
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          _spawnEnemyProjectile(state, boss, angle, 180, boss.glowColor);
        }
        break;
      case 3: // Rapid aimed
        {
          const dx = state.player.position.x - boss.position.x;
          const dy = state.player.position.y - boss.position.y;
          const angle = Math.atan2(dy, dx);
          _spawnEnemyProjectile(state, boss, angle, 350, boss.glowColor);
        }
        break;
    }
  }
}

function _enemyFire(state: DragoonState, enemy: DragoonEnemy): void {
  const dx = state.player.position.x - enemy.position.x;
  const dy = state.player.position.y - enemy.position.y;
  const angle = Math.atan2(dy, dx);
  _spawnEnemyProjectile(state, enemy, angle, 200, enemy.glowColor);
}

function _spawnEnemyProjectile(state: DragoonState, source: DragoonEnemy, angle: number, speed: number, color: number): void {
  const dmgScale = 1 + state.wave * DragoonBalance.ENEMY_DMG_SCALE;
  const baseDmg = source.isBoss ? 15 : 8;

  const proj: DragoonProjectile = {
    id: state.nextId++,
    position: { x: source.position.x, y: source.position.y },
    velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    damage: Math.floor(baseDmg * dmgScale),
    radius: source.isBoss ? 8 : 5,
    lifetime: 5,
    isPlayerOwned: false,
    skillId: null,
    color,
    trailColor: color,
    pierce: 0,
    hitEnemies: new Set(),
    homing: false,
    homingTarget: null,
    size: source.isBoss ? 6 : 4,
    glowIntensity: 0.6,
  };
  state.projectiles.push(proj);
}

// ---------------------------------------------------------------------------
// Enemy projectiles
// ---------------------------------------------------------------------------

function _updateEnemyProjectiles(state: DragoonState, dt: number): void {
  const margin = DragoonBalance.PROJECTILE_CLEANUP_MARGIN;

  state.projectiles = state.projectiles.filter(p => {
    if (p.isPlayerOwned) return true;
    p.position.x += p.velocity.x * dt;
    p.position.y += p.velocity.y * dt;
    p.lifetime -= dt;
    if (p.lifetime <= 0) return false;
    if (p.position.x < -margin || p.position.x > state.screenW + margin) return false;
    if (p.position.y < -margin || p.position.y > state.screenH + margin) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Player collision
// ---------------------------------------------------------------------------

function _checkPlayerCollisions(state: DragoonState): void {
  if (state.player.invincTimer > 0) return;
  const p = state.player;
  const hitR = DragoonBalance.PLAYER_HIT_RADIUS;

  // Enemy projectiles
  for (const proj of state.projectiles) {
    if (proj.isPlayerOwned) continue;
    const dx = proj.position.x - p.position.x;
    const dy = proj.position.y - p.position.y;
    if (dx * dx + dy * dy < (hitR + proj.radius) * (hitR + proj.radius)) {
      proj.lifetime = -1;
      if (p.shieldActive) continue; // Shield blocks damage
      p.hp -= proj.damage;
      p.invincTimer = DragoonBalance.PLAYER_INVINCIBILITY;
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
    const dx = e.position.x - p.position.x;
    const dy = e.position.y - p.position.y;
    const contactDist = hitR + e.size * 12;
    if (dx * dx + dy * dy < contactDist * contactDist) {
      if (p.shieldActive) continue; // Shield blocks contact damage
      const contactDmg = e.isBoss ? 20 : 10;
      p.hp -= contactDmg;
      p.invincTimer = DragoonBalance.PLAYER_INVINCIBILITY;
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

function _updateExplosions(state: DragoonState, dt: number): void {
  for (const ex of state.explosions) {
    ex.timer += dt;
    ex.radius = (ex.timer / ex.maxTimer) * ex.maxRadius;

    // Damage enemies caught in explosion
    for (const e of state.enemies) {
      if (!e.alive || ex.hitEnemies.has(e.id)) continue;
      const dx = e.position.x - ex.position.x;
      const dy = e.position.y - ex.position.y;
      if (dx * dx + dy * dy < (ex.radius + e.size * 12) * (ex.radius + e.size * 12)) {
        ex.hitEnemies.add(e.id);
        _damageEnemy(state, e, ex.damage);
      }
    }
  }

  state.explosions = state.explosions.filter(ex => ex.timer < ex.maxTimer);
}

// ---------------------------------------------------------------------------
// Shield
// ---------------------------------------------------------------------------

function _updateShield(state: DragoonState, dt: number): void {
  const p = state.player;
  if (p.shieldActive) {
    p.shieldTimer -= dt;
    if (p.shieldTimer <= 0) {
      p.shieldActive = false;
      p.shieldTimer = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Boss entrance
// ---------------------------------------------------------------------------

function _updateBossEntrance(state: DragoonState, dt: number): void {
  if (state.bossEntranceTimer > 0) {
    state.bossEntranceTimer -= dt;
    if (state.bossEntranceTimer <= 0) {
      state.bossEntranceTimer = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------

function _spawnPickup(state: DragoonState, x: number, y: number): void {
  if (Math.random() >= DragoonBalance.PICKUP_DROP_CHANCE) return;

  const rand = Math.random();
  let type: DragoonPickupType;
  if (rand < 0.4) {
    type = DragoonPickupType.HEALTH_ORB;
  } else if (rand < 0.75) {
    type = DragoonPickupType.MANA_ORB;
  } else {
    type = DragoonPickupType.SCORE_MULTIPLIER;
  }

  const pickup: DragoonPickup = {
    id: state.nextId++,
    position: { x, y },
    velocity: { x: -20 + (Math.random() - 0.5) * 30, y: (Math.random() - 0.5) * 40 },
    type,
    lifetime: DragoonBalance.PICKUP_LIFETIME,
    bobTimer: Math.random() * Math.PI * 2,
    collected: false,
  };
  state.pickups.push(pickup);
}

function _updatePickups(state: DragoonState, dt: number): void {
  const p = state.player;
  const collectR = DragoonBalance.PICKUP_COLLECT_RADIUS;

  for (const pickup of state.pickups) {
    if (pickup.collected) continue;

    // Move
    pickup.position.x += pickup.velocity.x * dt;
    pickup.position.y += pickup.velocity.y * dt;
    pickup.velocity.x *= 0.98;
    pickup.velocity.y *= 0.98;
    pickup.bobTimer += dt;
    pickup.lifetime -= dt;

    if (pickup.lifetime <= 0) {
      pickup.collected = true;
      continue;
    }

    // Check player distance for collection
    const dx = pickup.position.x - p.position.x;
    const dy = pickup.position.y - p.position.y;
    if (dx * dx + dy * dy < collectR * collectR) {
      pickup.collected = true;
      switch (pickup.type) {
        case DragoonPickupType.HEALTH_ORB:
          p.hp = Math.min(p.maxHp, p.hp + DragoonBalance.PICKUP_HEALTH_AMOUNT);
          break;
        case DragoonPickupType.MANA_ORB:
          p.mana = Math.min(p.maxMana, p.mana + DragoonBalance.PICKUP_MANA_AMOUNT);
          break;
        case DragoonPickupType.SCORE_MULTIPLIER:
          p.scoreMultiplier = DragoonBalance.PICKUP_SCORE_MULT;
          p.scoreMultTimer = DragoonBalance.PICKUP_SCORE_MULT_DURATION;
          break;
      }
    }
  }

  state.pickups = state.pickups.filter(pk => !pk.collected);
}

function _updateScoreMult(state: DragoonState, dt: number): void {
  const p = state.player;
  if (p.scoreMultTimer > 0) {
    p.scoreMultTimer -= dt;
    if (p.scoreMultTimer <= 0) {
      p.scoreMultTimer = 0;
      p.scoreMultiplier = 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _damageEnemy(state: DragoonState, enemy: DragoonEnemy, damage: number): void {
  const isCrit = Math.random() < 0.15;
  const finalDmg = isCrit ? Math.floor(damage * 1.8) : damage;
  enemy.hp -= finalDmg;
  enemy.hitTimer = 0.1;

  _onHit?.(enemy.position.x, enemy.position.y, finalDmg, isCrit);

  // Combo
  state.player.comboCount++;
  state.player.comboTimer = DragoonBalance.COMBO_TIMEOUT;

  if (enemy.hp <= 0) {
    enemy.alive = false;
    enemy.deathTimer = 0.5;
    const comboMult = 1 + state.player.comboCount * DragoonBalance.COMBO_SCORE_MULT;
    state.player.score += Math.floor(enemy.scoreValue * comboMult * state.player.scoreMultiplier);
    _onExplosion?.(enemy.position.x, enemy.position.y, enemy.size * 25, enemy.glowColor);
    _spawnPickup(state, enemy.position.x, enemy.position.y);
  }
}

function _updateMana(state: DragoonState, dt: number): void {
  state.player.mana = Math.min(state.player.maxMana, state.player.mana + state.player.manaRegen * dt);
}

function _updateCombo(state: DragoonState, dt: number): void {
  if (state.player.comboTimer > 0) {
    state.player.comboTimer -= dt;
    if (state.player.comboTimer <= 0) {
      state.player.comboCount = 0;
    }
  }
}

function _updateInvincibility(state: DragoonState, dt: number): void {
  if (state.player.invincTimer > 0) state.player.invincTimer -= dt;
}

function _cleanupDead(state: DragoonState): void {
  state.enemies = state.enemies.filter(e => e.alive || e.deathTimer > 0);
}
