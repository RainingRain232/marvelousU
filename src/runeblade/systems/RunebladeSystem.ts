// ---------------------------------------------------------------------------
// Runeblade — Core game systems
// Fast-paced melee combat with elemental rune enchantments
// ---------------------------------------------------------------------------

import type { RBState, RBEnemy, RBSlash, RuneType, EnemyKind, BossKind } from "../types";
import { RB } from "../config/RunebladeBalance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function randRange(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

// ---------------------------------------------------------------------------
// Player movement + aim tracking + dodge
// ---------------------------------------------------------------------------

export function updatePlayer(state: RBState, dt: number, keys: Set<string>): void {
  // Dodge movement
  if (state.dodging) {
    state.dodgeTimer -= dt;
    state.playerX += Math.cos(state.dodgeAngle) * RB.DODGE_SPEED * dt;
    state.playerY += Math.sin(state.dodgeAngle) * RB.DODGE_SPEED * dt;
    if (state.dodgeTimer <= 0) {
      state.dodging = false;
      state.dashStrikeUsed = false;
      state.invulnTimer = RB.INVULN_DURATION;
    }
  } else {
    // Normal WASD movement
    let mx = 0, my = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 0) {
      mx /= len; my /= len;
      state.moveAngle = Math.atan2(my, mx);
      state.aimAngle = state.moveAngle;
    }
    state.playerX += mx * RB.PLAYER_SPEED * dt;
    state.playerY += my * RB.PLAYER_SPEED * dt;
  }

  // Constrain to arena (rectangular)
  const margin = state.playerRadius + 5;
  state.playerX = clamp(state.playerX, margin, state.arenaW - margin);
  state.playerY = clamp(state.playerY, margin, state.arenaH - margin);

  // Timers
  if (state.attackTimer > 0) state.attackTimer -= dt;
  if (state.dodgeCooldown > 0) state.dodgeCooldown -= dt;
  if (state.invulnTimer > 0) state.invulnTimer -= dt;

  // Footstep dust particles when moving
  const isMoving = !state.dodging && (keys.has("KeyW") || keys.has("KeyS") || keys.has("KeyA") || keys.has("KeyD") ||
    keys.has("ArrowUp") || keys.has("ArrowDown") || keys.has("ArrowLeft") || keys.has("ArrowRight"));
  if (isMoving || state.dodging) {
    state.footstepTimer -= dt;
    if (state.footstepTimer <= 0) {
      state.footstepTimer = 0.1;
      // Spawn small dust puff at feet
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 8 + Math.random() * 15;
        state.ambientParticles.push({
          x: state.playerX + (Math.random() - 0.5) * 6,
          y: state.playerY + state.playerRadius,
          vx: Math.cos(a) * spd, vy: -Math.abs(Math.sin(a)) * spd * 0.5 - 5,
          life: 0.3, maxLife: 0.3,
          color: 0x665544, size: 1.5 + Math.random(),
        });
      }
    }
  }
}

export function tryDodge(state: RBState): boolean {
  if (state.dodging || state.dodgeCooldown > 0) return false;
  state.dodging = true;
  state.dodgeTimer = RB.DODGE_DURATION;
  state.dodgeCooldown = state.dodgeCooldownMax;
  state.dodgeAngle = state.aimAngle;
  state.invulnTimer = RB.DODGE_DURATION; // invuln while dodging

  // Perfect dodge check: if any enemy is in attack state within its attack range
  for (const e of state.enemies) {
    if (!e.alive || e.state !== "attack") continue;
    const d = dist(state.playerX, state.playerY, e.x, e.y);
    const attackRange = getEnemyAttackRange(e.kind);
    if (d < attackRange + 30) {
      // Perfect dodge!
      state.score += RB.PERFECT_DODGE_SCORE;
      state.slowTimer = RB.PERFECT_DODGE_SLOW_DURATION;
      spawnFloatText(state, state.playerX, state.playerY - 20, "PERFECT!", 0x44ffff, 1.0);
      spawnParticles(state, state.playerX, state.playerY, 0x44ffff, 6);
      break; // only trigger once per dodge
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Attack — spawn slash with rune effect
// ---------------------------------------------------------------------------

export function tryAttack(state: RBState): boolean {
  if (state.attackTimer > 0) return false;

  // Dash attack: if dodging and haven't used dash strike this dodge
  if (state.dodging && !state.dashStrikeUsed) {
    state.dashStrikeUsed = true;
    state.attackTimer = state.attackCooldown;
    const rune = state.currentRune;
    const da = state.dodgeAngle;
    const dashRange = RB.SLASH_RADIUS * 2; // 2x range
    const dashX = state.playerX + Math.cos(da) * (state.playerRadius + dashRange * 0.5);
    const dashY = state.playerY + Math.sin(da) * (state.playerRadius + dashRange * 0.5);

    const masteryBonus = 1 + (state.runeMastery[rune] || 0) * 0.1;
    const dashDmg = RB.SLASH_DAMAGE * masteryBonus * 1.5; // 1.5x damage

    const slash: RBSlash = {
      x: dashX, y: dashY, angle: da,
      radius: dashRange, life: RB.SLASH_DURATION * 1.2, maxLife: RB.SLASH_DURATION * 1.2,
      rune, damage: dashDmg, hitIds: [],
    };
    state.slashes.push(slash);

    spawnFloatText(state, state.playerX, state.playerY - 20, "DASH STRIKE!", 0xffaa00, 1.0);
    spawnParticles(state, dashX, dashY, getRuneColor(rune), 8);
    state.screenShake = Math.max(state.screenShake, RB.SHAKE_INTENSITY * 0.8);
    return true;
  }

  state.attackTimer = state.attackCooldown;

  const rune = state.currentRune;
  let sx = state.playerX, sy = state.playerY;
  const sa = state.aimAngle;

  // Shadow rune: teleport forward before slashing
  // VOID BOLT synergy: 80px teleport range instead of 40
  const shadowDist = (rune === "shadow" && state.synergyVoidBoltActive) ? 80 : RB.SHADOW_TELEPORT_DIST;
  if (rune === "shadow") {
    if (state.synergyVoidBoltActive) state.synergyVoidBoltActive = false;
    sx += Math.cos(sa) * shadowDist;
    sy += Math.sin(sa) * shadowDist;
    // Constrain teleport to arena
    const margin = state.playerRadius + 5;
    sx = clamp(sx, margin, state.arenaW - margin);
    sy = clamp(sy, margin, state.arenaH - margin);
    state.playerX = sx; state.playerY = sy;
    // Spawn shadow particles at old position
    spawnParticles(state, state.playerX, state.playerY, RB.COLOR_SHADOW, 6);
  }

  // Offset slash position to be in front of player
  const slashX = sx + Math.cos(sa) * (state.playerRadius + RB.SLASH_RADIUS * 0.5);
  const slashY = sy + Math.sin(sa) * (state.playerRadius + RB.SLASH_RADIUS * 0.5);

  // Apply rune mastery bonus to slash damage
  const masteryBonus = 1 + (state.runeMastery[rune] || 0) * 0.1;
  const slashDmg = RB.SLASH_DAMAGE * masteryBonus;

  const slash: RBSlash = {
    x: slashX, y: slashY, angle: sa,
    radius: RB.SLASH_RADIUS, life: RB.SLASH_DURATION, maxLife: RB.SLASH_DURATION,
    rune, damage: slashDmg, hitIds: [],
  };
  state.slashes.push(slash);

  // Fire rune: leave burning trail at slash position
  // DARK FLAME synergy: trail lasts 2x longer
  if (rune === "fire") {
    const trailDur = state.synergyDarkFlameActive ? RB.FIRE_TRAIL_DURATION * 2 : RB.FIRE_TRAIL_DURATION;
    if (state.synergyDarkFlameActive) state.synergyDarkFlameActive = false;
    state.fireTrails.push({
      x: slashX, y: slashY,
      life: trailDur, maxLife: trailDur,
      radius: RB.FIRE_TRAIL_RADIUS,
    });
  }

  // Spawn slash particles
  const runeColor = getRuneColor(rune);
  spawnParticles(state, slashX, slashY, runeColor, 4);

  return true;
}

// ---------------------------------------------------------------------------
// Update slashes — check enemy hits, apply rune effects
// ---------------------------------------------------------------------------

export function updateSlashes(state: RBState, dt: number): void {
  for (let i = state.slashes.length - 1; i >= 0; i--) {
    const s = state.slashes[i];
    s.life -= dt;
    if (s.life <= 0) {
      // Spawn slash ghost for lingering visual
      state.slashGhosts.push({
        x: s.x, y: s.y, angle: s.angle, radius: s.radius,
        life: 0.3, maxLife: 0.3, rune: s.rune,
      });
      state.slashes.splice(i, 1); continue;
    }

    // Check enemy collisions — slash can hit multiple enemies, but each enemy only once
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (s.hitIds.indexOf(e.eid) >= 0) continue; // already hit this enemy
      const d = dist(s.x, s.y, e.x, e.y);
      if (d < s.radius + e.radius) {
        s.hitIds.push(e.eid);

        // Parry check: if enemy is in attack state within parry window of slash creation
        const slashAge = s.maxLife - s.life;
        if (e.state === "attack" && slashAge <= RB.PARRY_WINDOW) {
          // PARRY! Stun enemy and deal double damage
          e.state = "stunned";
          e.stateTimer = RB.PARRY_STUN_DURATION;
          e.parryStunned = true;
          spawnFloatText(state, e.x, e.y - 20, "PARRY!", 0xffd700, 1.2);
          spawnParticles(state, e.x, e.y, 0xffd700, 8);
          state.screenShake = Math.max(state.screenShake, RB.SHAKE_INTENSITY * 1.5);
          damageEnemy(state, e, s.damage * RB.PARRY_DAMAGE_MULT, s.rune);
        } else {
          // Normal damage — apply void step multiplier if active
          let dmg = s.damage;
          if (state.ultimateActive === "VOID STEP") dmg *= RB.ULT_VOID_STEP_MULT;
          // Parry-stunned enemies take double damage
          if (e.parryStunned) dmg *= RB.PARRY_DAMAGE_MULT;
          // SHATTER synergy: frozen enemies take 3x damage
          if (e.state === "frozen" && state.synergyBonus === "SHATTER") {
            dmg *= 3;
          }
          // Execution mechanic: enemy below 25% HP and frozen/stunned
          if (e.hp > 0 && e.hp <= e.maxHp * 0.25 && (e.state === "frozen" || e.state === "stunned")) {
            dmg = e.hp + 1; // guaranteed kill
            spawnFloatText(state, e.x, e.y - 25, "EXECUTE!", 0xff2244, 1.2);
            state.executeTimer = 0.4;
            state.slowTimer = Math.max(state.slowTimer, 0.3);
            state.screenShake = Math.max(state.screenShake, RB.SHAKE_INTENSITY * 2);
            // 2x score bonus applied in killEnemy via executeTimer check
          }
          damageEnemy(state, e, dmg, s.rune);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Damage enemy with rune effects + combo tracking
// ---------------------------------------------------------------------------

export function damageEnemy(state: RBState, enemy: RBEnemy, dmg: number, rune: RuneType): void {
  // Wraith phase chance
  if (enemy.kind === "wraith" && enemy.state !== "frozen" && Math.random() < RB.WRAITH_PHASE_CHANCE) {
    spawnFloatText(state, enemy.x, enemy.y - 10, "PHASE", RB.COLOR_WRAITH, 0.8);
    return;
  }

  // Knight armor absorption
  if (enemy.kind === "knight" && enemy.hp > enemy.maxHp - RB.KNIGHT_ARMOR) {
    // Armor absorbs but still takes 0.5 damage
    dmg = 0.5;
    spawnFloatText(state, enemy.x, enemy.y - 10, "ARMOR", RB.COLOR_KNIGHT, 0.6);
  }

  enemy.hp -= dmg;
  enemy.flashTimer = 0.1;

  // Rune-specific on-hit effects
  if (rune === "ice") {
    // Track ice hits via runeCharges; freeze on 3rd hit
    state.runeCharges.ice++;
    if (enemy.state !== "frozen") {
      enemy.speed *= RB.ICE_SLOW_FACTOR;
      if (state.runeCharges.ice >= RB.ICE_FREEZE_HITS) {
        enemy.state = "frozen";
        enemy.frozenTimer = RB.ICE_FREEZE_DURATION;
        enemy.speed = 0;
        state.runeCharges.ice = 0;
        spawnFloatText(state, enemy.x, enemy.y - 15, "FROZEN!", RB.COLOR_ICE, 1.0);
      }
    }
  }

  if (rune === "fire") {
    const rpBonus = 1 + (state.runepowerBonus || 0);
    enemy.burnTimer = RB.FIRE_BURN_DURATION;
    enemy.burnDamage = RB.FIRE_BURN_DAMAGE * rpBonus;
  }

  if (rune === "lightning") {
    // Chain to nearby enemies
    let chainCount = 0;
    for (const other of state.enemies) {
      if (other === enemy || !other.alive || chainCount >= RB.LIGHTNING_CHAIN_COUNT) continue;
      const d = dist(enemy.x, enemy.y, other.x, other.y);
      if (d < RB.LIGHTNING_CHAIN_RANGE) {
        const rpBonus2 = 1 + (state.runepowerBonus || 0);
        other.hp -= RB.LIGHTNING_CHAIN_DAMAGE * rpBonus2;
        other.flashTimer = 0.1;
        chainCount++;
        state.lightningChains.push({
          x1: enemy.x, y1: enemy.y, x2: other.x, y2: other.y,
          life: RB.LIGHTNING_CHAIN_DURATION, maxLife: RB.LIGHTNING_CHAIN_DURATION,
        });
        spawnParticles(state, other.x, other.y, RB.COLOR_LIGHTNING, 3);
        if (other.hp <= 0) killEnemy(state, other);
      }
    }
  }

  // Rune mastery tracking
  state.runeKills[rune] = (state.runeKills[rune] || 0) + 1;
  if (state.runeKills[rune] % 20 === 0) {
    state.runeMastery[rune] = (state.runeMastery[rune] || 0) + 1;
    const runeNames: Record<string, string> = { fire: "FIRE", ice: "ICE", lightning: "LIGHTNING", shadow: "SHADOW" };
    const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    const level = state.runeMastery[rune];
    const numeral = romanNumerals[Math.min(level - 1, romanNumerals.length - 1)];
    spawnFloatText(state, state.playerX, state.playerY - 30, `${runeNames[rune]} MASTERY ${numeral}!`, getRuneColor(rune), 1.5);
  }

  // Check death
  if (enemy.hp <= 0) { killEnemy(state, enemy); }
  else { spawnParticles(state, enemy.x, enemy.y, getEnemyColor(enemy.kind), 3); }

  // Combo
  state.comboCount++;
  state.comboTimer = RB.COMBO_WINDOW;
}

function killEnemy(state: RBState, enemy: RBEnemy): void {
  enemy.alive = false;
  state.enemiesKilled++;
  state.totalKills++;

  // Ultimate charge
  state.runeUltCharge = Math.min(100, state.runeUltCharge + RB.RUNE_ULT_CHARGE_PER_KILL + (state.ultChargeBonus || 0));

  // Score based on type
  let killScore = 0;
  switch (enemy.kind) {
    case "skeleton": killScore = RB.SCORE_KILL_SKELETON; break;
    case "archer": killScore = RB.SCORE_KILL_ARCHER; break;
    case "knight": killScore = RB.SCORE_KILL_KNIGHT; break;
    case "wraith": killScore = RB.SCORE_KILL_WRAITH; break;
    case "necromancer": killScore = RB.SCORE_KILL_NECROMANCER; break;
  }

  // Elite enemies worth 2x score
  if (enemy.elite) {
    killScore *= 2;
  }

  // Combo multiplier
  const comboMult = 1 + Math.min(state.comboCount, 10) * 0.1;
  killScore = Math.floor(killScore * comboMult);

  // Execution bonus: 2x score
  if (state.executeTimer > 0) {
    killScore *= 2;
  }

  // Blood moon bonus: 1.5x score
  if (state.bloodMoonActive) {
    killScore = Math.floor(killScore * 1.5);
  }

  // ---- Rune synergy combo check ----
  const currentRune = state.currentRune;
  if (state.lastKillRune && state.lastKillRune !== currentRune && state.comboCount >= 2) {
    const pair = state.lastKillRune + "->" + currentRune;
    let synergyName = "";
    let synergyPoints = 0;
    switch (pair) {
      case "fire->ice":
        synergyName = "STEAM BURST";
        synergyPoints = 20;
        // AoE 50px stun for 1.5s
        for (const e of state.enemies) {
          if (!e.alive) continue;
          const d = dist(enemy.x, enemy.y, e.x, e.y);
          if (d < 50) {
            e.state = "stunned";
            e.stateTimer = 1.5;
          }
        }
        spawnShockwave(state, enemy.x, enemy.y, 0xaaddff, 50, 0.5);
        break;
      case "ice->lightning":
        synergyName = "SHATTER";
        synergyPoints = 15;
        // Frozen enemies take 3x damage on next hit (set flag)
        state.synergyBonus = "SHATTER";
        break;
      case "lightning->shadow":
        synergyName = "VOID BOLT";
        synergyPoints = 10;
        // Next shadow attack has 80px range
        state.synergyVoidBoltActive = true;
        break;
      case "shadow->fire":
        synergyName = "DARK FLAME";
        synergyPoints = 10;
        // Next fire trail lasts 2x longer
        state.synergyDarkFlameActive = true;
        break;
    }
    if (synergyName) {
      killScore += synergyPoints;
      state.synergyBonus = synergyName;
      state.synergyTimer = 1.5;
      spawnFloatText(state, enemy.x, enemy.y - 25, synergyName, 0xffaa00, 1.5);
      spawnParticles(state, enemy.x, enemy.y, 0xffaa00, 10);
    }
  }
  state.lastKillRune = currentRune;

  state.score += killScore;

  // Pickups
  if (Math.random() < 0.20) {
    state.pickups.push({ x: enemy.x, y: enemy.y, kind: "health", life: 8.0, radius: 6 });
  } else if (Math.random() < 0.15) {
    state.pickups.push({ x: enemy.x, y: enemy.y, kind: "score_orb", life: 6.0, radius: 5 });
  } else if (Math.random() < 0.10) {
    state.pickups.push({ x: enemy.x, y: enemy.y, kind: "rune_charge", life: 6.0, radius: 5 });
  }

  // Kill streak
  state.killStreakCount++;
  state.killStreakTimer = 1.5;
  if (state.killStreakCount === 2) {
    spawnFloatText(state, state.playerX, state.playerY - 30, "DOUBLE KILL!", 0xffaa00, 1.5);
    state.score += 10;
  } else if (state.killStreakCount === 3) {
    spawnFloatText(state, state.playerX, state.playerY - 30, "TRIPLE KILL!", 0xff6600, 1.8);
    state.score += 25;
  } else if (state.killStreakCount === 4) {
    spawnFloatText(state, state.playerX, state.playerY - 30, "MEGA KILL!", 0xff2200, 2.0);
    state.score += 50;
  } else if (state.killStreakCount >= 5) {
    spawnFloatText(state, state.playerX, state.playerY - 30, "UNSTOPPABLE!", 0xff0044, 2.5);
    state.score += 100;
    state.screenFlashColor = 0xff0044;
    state.screenFlashTimer = 0.3;
  }

  // Effects
  spawnFloatText(state, enemy.x, enemy.y - 10, `+${killScore}`, RB.COLOR_COMBO, 1.0);
  spawnParticles(state, enemy.x, enemy.y, getEnemyColor(enemy.kind), 8);
  state.screenShake = Math.max(state.screenShake, RB.SHAKE_INTENSITY);
  state.hitstopFrames = RB.HITSTOP_FRAMES;

  // Death shockwave
  spawnShockwave(state, enemy.x, enemy.y, getEnemyColor(enemy.kind), 40, 0.4);

  // Blood stain on kill
  state.bloodStains.push({
    x: enemy.x, y: enemy.y,
    size: enemy.radius * 1.5 + Math.random() * 4,
    alpha: 0.35 + Math.random() * 0.15,
  });
  if (state.bloodStains.length > 30) state.bloodStains.shift();
}

// ---------------------------------------------------------------------------
// Enemy AI
// ---------------------------------------------------------------------------

export function updateEnemies(state: RBState, dt: number): boolean {
  let playerHit = false;
  const px = state.playerX, py = state.playerY;

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (!e.alive) { state.enemies.splice(i, 1); continue; }

    // Flash timer
    if (e.flashTimer > 0) e.flashTimer -= dt;

    // Frozen state
    if (e.state === "frozen") {
      e.frozenTimer -= dt;
      if (e.frozenTimer <= 0) {
        e.state = "approach";
        // Restore speed based on kind
        e.speed = getEnemyBaseSpeed(e.kind);
      }
      continue;
    }

    // Burn damage over time
    if (e.burnTimer > 0) {
      e.burnTimer -= dt;
      // Apply burn damage per tick
      if (Math.floor((e.burnTimer + dt) / RB.FIRE_BURN_TICK) > Math.floor(e.burnTimer / RB.FIRE_BURN_TICK)) {
        e.hp -= e.burnDamage;
        spawnParticles(state, e.x, e.y, RB.COLOR_FIRE, 2);
        if (e.hp <= 0) { killEnemy(state, e); continue; }
      }
    }

    // Stunned
    if (e.state === "stunned") {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) { e.state = "approach"; e.parryStunned = false; }
      continue;
    }

    const a = angle(e.x, e.y, px, py);
    const d = dist(e.x, e.y, px, py);

    switch (e.kind) {
      case "skeleton": {
        // Walk toward player, attack when close
        if (d > RB.SKELETON_ATTACK_RANGE) {
          e.x += Math.cos(a) * e.speed * dt;
          e.y += Math.sin(a) * e.speed * dt;
        } else {
          if (e.state !== "attack") { e.state = "attack"; e.stateTimer = 0.5; }
          e.stateTimer -= dt;
          if (e.stateTimer <= 0) {
            if (d < RB.SKELETON_ATTACK_RANGE + 5) {
              playerHit = hitPlayer(state, RB.SKELETON_DAMAGE);
            }
            e.state = "approach"; e.stateTimer = 1.0;
          }
        }
        break;
      }

      case "archer": {
        // Archer dodge-shot: when player gets within 50px and stateTimer > 1, dodge backward and fire
        if (d < 50 && e.stateTimer > 1) {
          // Dodge backward
          const awayAngle = angle(px, py, e.x, e.y);
          e.x += Math.cos(awayAngle) * 60;
          e.y += Math.sin(awayAngle) * 60;
          // Constrain
          const em = e.radius + 2;
          e.x = clamp(e.x, em, state.arenaW - em);
          e.y = clamp(e.y, em, state.arenaH - em);
          // Fire arrow while dodging
          const arrowAngle2 = angle(e.x, e.y, px, py);
          state.projectiles.push({
            x: e.x, y: e.y,
            vx: Math.cos(arrowAngle2) * RB.ARCHER_ARROW_SPEED,
            vy: Math.sin(arrowAngle2) * RB.ARCHER_ARROW_SPEED,
            damage: RB.ARCHER_DAMAGE, radius: 3, life: 4.0,
            color: RB.COLOR_ARCHER, fromEnemy: true,
          });
          e.stateTimer = RB.ARCHER_FIRE_INTERVAL;
          spawnParticles(state, e.x, e.y, RB.COLOR_ARCHER, 4);
        } else {
          // Keep distance, fire arrows
          if (d < RB.ARCHER_KEEP_DIST - 20) {
            // Retreat
            e.x -= Math.cos(a) * e.speed * dt;
            e.y -= Math.sin(a) * e.speed * dt;
          } else if (d > RB.ARCHER_KEEP_DIST + 20) {
            // Approach
            e.x += Math.cos(a) * e.speed * dt;
            e.y += Math.sin(a) * e.speed * dt;
          }
          e.stateTimer -= dt;
          if (e.stateTimer <= 0) {
            e.stateTimer = RB.ARCHER_FIRE_INTERVAL;
            // Fire arrow
            const arrowAngle = angle(e.x, e.y, px, py);
            state.projectiles.push({
              x: e.x, y: e.y,
              vx: Math.cos(arrowAngle) * RB.ARCHER_ARROW_SPEED,
              vy: Math.sin(arrowAngle) * RB.ARCHER_ARROW_SPEED,
              damage: RB.ARCHER_DAMAGE, radius: 3, life: 4.0,
              color: RB.COLOR_ARCHER, fromEnemy: true,
            });
          }
        }
        break;
      }

      case "knight": {
        // Slow approach, heavy damage
        if (d > RB.KNIGHT_ATTACK_RANGE) {
          e.x += Math.cos(a) * e.speed * dt;
          e.y += Math.sin(a) * e.speed * dt;
        } else {
          if (e.state !== "attack") { e.state = "attack"; e.stateTimer = 0.8; }
          e.stateTimer -= dt;
          if (e.stateTimer <= 0) {
            if (d < RB.KNIGHT_ATTACK_RANGE + 5) {
              playerHit = hitPlayer(state, RB.KNIGHT_DAMAGE);
            }
            e.state = "approach"; e.stateTimer = 1.5;
          }
        }
        break;
      }

      case "wraith": {
        // Fast approach, attack
        if (d > RB.WRAITH_ATTACK_RANGE) {
          e.x += Math.cos(a) * e.speed * dt;
          e.y += Math.sin(a) * e.speed * dt;
        } else {
          if (e.state !== "attack") { e.state = "attack"; e.stateTimer = 0.4; }
          e.stateTimer -= dt;
          if (e.stateTimer <= 0) {
            if (d < RB.WRAITH_ATTACK_RANGE + 5) {
              playerHit = hitPlayer(state, RB.WRAITH_DAMAGE);
            }
            e.state = "approach"; e.stateTimer = 0.8;
          }
        }
        break;
      }

      case "necromancer": {
        // Keep distance from player, periodically summon skeletons
        if (d < RB.NECROMANCER_KEEP_DIST - 20) {
          // Retreat
          e.x -= Math.cos(a) * e.speed * dt;
          e.y -= Math.sin(a) * e.speed * dt;
        } else if (d > RB.NECROMANCER_KEEP_DIST + 40) {
          // Approach (slowly)
          e.x += Math.cos(a) * e.speed * dt;
          e.y += Math.sin(a) * e.speed * dt;
        }
        // Summon timer
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.stateTimer = RB.NECROMANCER_SUMMON_INTERVAL;
          // Count active summons for this necromancer
          const activeSummons = state.enemies.filter(s => s.alive && s.ownerEid === e.eid).length;
          if (activeSummons < 2) {
            // Summon a skeleton near the necromancer
            const sumX = e.x + (Math.random() - 0.5) * 80;
            const sumY = e.y + (Math.random() - 0.5) * 80;
            const seid = "e" + state.nextEnemyId++;
            const summon: RBEnemy = {
              eid: seid, x: clamp(sumX, 20, state.arenaW - 20), y: clamp(sumY, 20, state.arenaH - 20),
              kind: "skeleton", alive: true,
              hp: RB.SKELETON_HP, maxHp: RB.SKELETON_HP,
              radius: RB.SKELETON_RADIUS,
              speed: RB.SKELETON_SPEED,
              flashTimer: 0,
              state: "approach", stateTimer: 1.0,
              frozenTimer: 0, burnTimer: 0, burnDamage: 0,
              parryStunned: false,
              ownerEid: e.eid,
              spawnTimer: 0.6,
              elite: false,
            };
            state.enemies.push(summon);
            e.summonCount = (e.summonCount || 0) + 1;
            spawnFloatText(state, e.x, e.y - 15, "SUMMON!", RB.COLOR_NECROMANCER, 1.0);
            spawnParticles(state, sumX, sumY, RB.COLOR_NECROMANCER, 6);
          }
        }
        break;
      }
    }

    // Constrain enemy to arena
    const margin = e.radius + 2;
    e.x = clamp(e.x, margin, state.arenaW - margin);
    e.y = clamp(e.y, margin, state.arenaH - margin);
  }

  return playerHit;
}

function hitPlayer(state: RBState, damage: number): boolean {
  if (state.invulnTimer > 0 || state.dodging) return false;
  state.playerHP -= damage;
  state.invulnTimer = RB.INVULN_DURATION;
  state.screenShake = RB.SHAKE_INTENSITY * 2;
  state.screenFlashColor = RB.COLOR_DANGER;
  state.screenFlashTimer = RB.FLASH_DURATION;
  spawnParticles(state, state.playerX, state.playerY, RB.COLOR_DANGER, 8);
  state.comboCount = 0; state.comboTimer = 0; // reset combo on hit
  return state.playerHP <= 0;
}

// ---------------------------------------------------------------------------
// Projectiles (enemy arrows)
// ---------------------------------------------------------------------------

export function updateProjectiles(state: RBState, dt: number): boolean {
  let playerHit = false;

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    // Out of bounds or expired
    if (p.life <= 0 || p.x < -10 || p.x > state.arenaW + 10 ||
        p.y < -10 || p.y > state.arenaH + 10) {
      state.projectiles.splice(i, 1);
      continue;
    }

    // Player collision
    if (p.fromEnemy) {
      const d = dist(p.x, p.y, state.playerX, state.playerY);
      if (d < p.radius + state.playerRadius) {
        state.projectiles.splice(i, 1);
        if (hitPlayer(state, p.damage)) playerHit = true;
      }
    }
  }

  return playerHit;
}

// ---------------------------------------------------------------------------
// Fire trails — damage enemies who walk through
// ---------------------------------------------------------------------------

export function updateFireTrails(state: RBState, dt: number): void {
  for (let i = state.fireTrails.length - 1; i >= 0; i--) {
    const t = state.fireTrails[i];
    t.life -= dt;
    if (t.life <= 0) { state.fireTrails.splice(i, 1); continue; }

    // Damage enemies in trail
    for (const e of state.enemies) {
      if (!e.alive || e.burnTimer > 0) continue;
      const d = dist(t.x, t.y, e.x, e.y);
      if (d < t.radius + e.radius) {
        e.burnTimer = RB.FIRE_BURN_DURATION;
        e.burnDamage = RB.FIRE_BURN_DAMAGE;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------

export function updatePickups(state: RBState, dt: number): void {
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const p = state.pickups[i];
    p.life -= dt;
    if (p.life <= 0) { state.pickups.splice(i, 1); continue; }

    // Check player pickup
    const d = dist(p.x, p.y, state.playerX, state.playerY);
    if (d < p.radius + state.playerRadius + 5) {
      switch (p.kind) {
        case "health":
          state.playerHP = Math.min(state.maxHP, state.playerHP + 1);
          spawnFloatText(state, p.x, p.y, "+1 HP", 0x44ff44, 1.2);
          spawnParticles(state, p.x, p.y, 0x44ff44, 6);
          break;
        case "score_orb":
          state.score += 25;
          spawnFloatText(state, p.x, p.y, "+25", 0xffd700, 1.0);
          spawnParticles(state, p.x, p.y, 0xffd700, 4);
          break;
        case "rune_charge":
          state.runeUltCharge = Math.min(100, state.runeUltCharge + 15);
          spawnFloatText(state, p.x, p.y, "+ULT", 0xaa44ff, 1.0);
          spawnParticles(state, p.x, p.y, 0xaa44ff, 4);
          break;
      }
      state.pickups.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Wave progression + enemy spawning
// ---------------------------------------------------------------------------

export function updateWave(state: RBState, dt: number): void {
  state.waveTimer -= dt;
  if (state.waveTimer <= 0) {
    state.wave++;
    state.waveTimer = RB.WAVE_INTERVAL;
    state.waveSpeedBoost = 0;
    state.waveEventActive = "";
    state.bloodMoonActive = false;

    // Blood Moon event every 8 waves
    if (state.wave > 0 && state.wave % 8 === 0) {
      state.bloodMoonActive = true;
      state.waveEventActive = "BLOOD MOON";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 60, "BLOOD MOON", 0xff2244, 2.5);
      // All enemies get +50% speed and +50% HP
      for (const e of state.enemies) {
        if (e.alive) {
          e.speed *= 1.5;
          e.hp = Math.ceil(e.hp * 1.5);
          e.maxHp = Math.ceil(e.maxHp * 1.5);
        }
      }
      state.screenFlashColor = 0xff2244;
      state.screenFlashTimer = RB.FLASH_DURATION * 4;
      state.screenShake = Math.max(state.screenShake, RB.SHAKE_INTENSITY * 2);
    }

    // Boss waves: 10, 20, 30
    if (state.wave === 10) {
      spawnBoss(state, "dark_knight");
    } else if (state.wave === 20) {
      spawnBoss(state, "lich_king");
    } else if (state.wave === 30) {
      spawnBoss(state, "dragon_wyrm");
    }
    // Wave events every 5 waves (non-boss)
    else if (state.wave === 5) {
      state.waveEventActive = "SKELETON HORDE";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 40, "SKELETON HORDE", 0xff4422, 2.0);
      for (let i = 0; i < 8; i++) spawnSpecificEnemy(state, "skeleton");
    } else if (state.wave === 15) {
      state.waveEventActive = "DARK CONVERGENCE";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 40, "DARK CONVERGENCE", 0xaa44ff, 2.0);
      for (let i = 0; i < 3; i++) spawnSpecificEnemy(state, "wraith");
      for (let i = 0; i < 3; i++) spawnSpecificEnemy(state, "archer");
      state.waveSpeedBoost = 0.3;
      for (const e of state.enemies) {
        if (e.alive && e.state !== "frozen") {
          e.speed *= 1.3;
        }
      }
    } else if (state.wave === 7) {
      state.waveEventActive = "ARCHER RAIN";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 40, "ARCHER RAIN", 0xffaa44, 2.0);
      for (let i = 0; i < 6; i++) spawnSpecificEnemy(state, "archer");
    } else if (state.wave === 12) {
      state.waveEventActive = "KNIGHT FORTRESS";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 40, "KNIGHT FORTRESS", 0x8888ff, 2.0);
      for (let i = 0; i < 4; i++) spawnSpecificEnemy(state, "knight");
    } else if (state.wave === 18) {
      state.waveEventActive = "PHANTOM SURGE";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 40, "PHANTOM SURGE", 0xaa44ff, 2.0);
      for (let i = 0; i < 5; i++) {
        const w = spawnSpecificEnemy(state, "wraith");
        w.speed *= 1.3;
      }
    } else if (state.wave === 22) {
      state.waveEventActive = "NECROMANCER COUNCIL";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 40, "NECROMANCER COUNCIL", 0x44ff88, 2.0);
      for (let i = 0; i < 3; i++) spawnSpecificEnemy(state, "necromancer");
    } else if (state.wave === 25) {
      state.waveEventActive = "RUNE TRIAL";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 40, "RUNE TRIAL", 0xff2244, 2.0);
      const megaKnight = spawnSpecificEnemy(state, "knight", RB.MEGA_KNIGHT_HP);
      megaKnight.radius = 16;
    } else if (state.wave === 28) {
      state.waveEventActive = "ELITE GAUNTLET";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 40, "ELITE GAUNTLET", 0xffd700, 2.0);
      const eliteKinds: EnemyKind[] = ["skeleton", "archer", "knight", "wraith", "necromancer"];
      for (let i = 0; i < 5; i++) {
        const kind = eliteKinds[Math.floor(Math.random() * eliteKinds.length)];
        const e = spawnSpecificEnemy(state, kind);
        e.elite = true;
        e.hp *= 2;
        e.maxHp = e.hp;
        e.radius = Math.ceil(e.radius * 1.15);
      }
    }
    // Repeating bosses after wave 30
    else if (state.wave > 30 && state.wave % 10 === 0) {
      const bossKinds: BossKind[] = ["dark_knight", "lich_king", "dragon_wyrm"];
      const bossIdx = Math.floor((state.wave - 30) / 10 - 1) % 3;
      spawnBoss(state, bossKinds[bossIdx]);
      // Scale boss HP with wave
      if (state.boss) {
        const scale = 1 + (state.wave - 30) * 0.1;
        state.boss.hp = Math.ceil(state.boss.hp * scale);
        state.boss.maxHp = state.boss.hp;
      }
    }

    // Arena hazards: every 3 waves, spawn 2-4 random hazards
    if (state.wave > 0 && state.wave % 3 === 0 && !state.bossWave) {
      spawnArenaHazards(state);
    }

    state.screenShake = Math.max(state.screenShake, RB.SHAKE_INTENSITY);
  }

  // Spawn enemies (not during boss fights, unless boss summons them)
  if (!state.bossWave) {
    state.enemySpawnTimer -= dt;
    if (state.enemySpawnTimer <= 0 && state.enemies.length < RB.ENEMY_MAX) {
      state.enemySpawnTimer = Math.max(0.8, RB.ENEMY_SPAWN_INTERVAL - state.wave * 0.1);
      spawnEnemy(state);
    }
  }

  // Score per second
  state.score += RB.SCORE_PER_SECOND * dt;
  state.time += dt;
}

function spawnEnemy(state: RBState): RBEnemy {
  // Determine kind based on wave
  // Necromancer has ~12% chance from wave 4+
  if (state.wave >= 4 && Math.random() < 0.12) {
    return spawnSpecificEnemy(state, "necromancer");
  }
  const kinds: EnemyKind[] = ["skeleton"];
  if (state.wave >= 1) kinds.push("archer");
  if (state.wave >= 2) kinds.push("knight");
  if (state.wave >= 3) kinds.push("wraith");

  const kind = kinds[Math.floor(Math.random() * kinds.length)];

  // Spawn at arena edge
  const edge = Math.floor(Math.random() * 4);
  let x: number, y: number;
  switch (edge) {
    case 0: x = randRange(20, state.arenaW - 20); y = -10; break;       // top
    case 1: x = state.arenaW + 10; y = randRange(20, state.arenaH - 20); break; // right
    case 2: x = randRange(20, state.arenaW - 20); y = state.arenaH + 10; break; // bottom
    default: x = -10; y = randRange(20, state.arenaH - 20); break;       // left
  }

  const eid = "e" + state.nextEnemyId++;
  const enemy: RBEnemy = {
    eid, x, y, kind, alive: true,
    hp: getEnemyHP(kind), maxHp: getEnemyHP(kind),
    radius: getEnemyRadius(kind),
    speed: getEnemyBaseSpeed(kind),
    flashTimer: 0,
    state: "approach", stateTimer: kind === "archer" ? RB.ARCHER_FIRE_INTERVAL : kind === "necromancer" ? RB.NECROMANCER_SUMMON_INTERVAL : 1.0,
    frozenTimer: 0, burnTimer: 0, burnDamage: 0,
    parryStunned: false,
    summonCount: kind === "necromancer" ? 0 : undefined,
    spawnTimer: 0.6,
    elite: false,
  };

  // Scale HP with wave
  const hpScale = 1 + state.wave * 0.15;
  enemy.hp = Math.ceil(enemy.hp * hpScale);
  enemy.maxHp = enemy.hp;

  // Elite variant: after wave 8, 15% chance
  if (state.wave >= 8 && Math.random() < 0.15) {
    enemy.elite = true;
    enemy.hp *= 2;
    enemy.maxHp = enemy.hp;
    enemy.radius = Math.ceil(enemy.radius * 1.15);
  }

  // Apply wave speed boost (Dark Convergence)
  if (state.waveSpeedBoost > 0) {
    enemy.speed *= (1 + state.waveSpeedBoost);
  }

  // Blood moon buff: +50% speed and HP
  if (state.bloodMoonActive) {
    enemy.speed *= 1.5;
    enemy.hp = Math.ceil(enemy.hp * 1.5);
    enemy.maxHp = enemy.hp;
  }

  state.enemies.push(enemy);
  return enemy;
}

function getEnemyHP(kind: EnemyKind): number {
  switch (kind) {
    case "skeleton": return RB.SKELETON_HP;
    case "archer": return RB.ARCHER_HP;
    case "knight": return RB.KNIGHT_HP;
    case "wraith": return RB.WRAITH_HP;
    case "necromancer": return RB.NECROMANCER_HP;
  }
}

function getEnemyRadius(kind: EnemyKind): number {
  switch (kind) {
    case "skeleton": return RB.SKELETON_RADIUS;
    case "archer": return RB.ARCHER_RADIUS;
    case "knight": return RB.KNIGHT_RADIUS;
    case "wraith": return RB.WRAITH_RADIUS;
    case "necromancer": return RB.NECROMANCER_RADIUS;
  }
}

function getEnemyBaseSpeed(kind: EnemyKind): number {
  switch (kind) {
    case "skeleton": return RB.SKELETON_SPEED;
    case "archer": return RB.ARCHER_SPEED;
    case "knight": return RB.KNIGHT_SPEED;
    case "wraith": return RB.WRAITH_SPEED;
    case "necromancer": return RB.NECROMANCER_SPEED;
  }
}

function getEnemyAttackRange(kind: EnemyKind): number {
  switch (kind) {
    case "skeleton": return RB.SKELETON_ATTACK_RANGE;
    case "archer": return RB.ARCHER_KEEP_DIST;
    case "knight": return RB.KNIGHT_ATTACK_RANGE;
    case "wraith": return RB.WRAITH_ATTACK_RANGE;
    case "necromancer": return RB.NECROMANCER_KEEP_DIST;
  }
}

function spawnSpecificEnemy(state: RBState, kind: EnemyKind, hpOverride?: number): RBEnemy {
  // Spawn at random arena edge
  const edge = Math.floor(Math.random() * 4);
  let x: number, y: number;
  switch (edge) {
    case 0: x = randRange(20, state.arenaW - 20); y = -10; break;
    case 1: x = state.arenaW + 10; y = randRange(20, state.arenaH - 20); break;
    case 2: x = randRange(20, state.arenaW - 20); y = state.arenaH + 10; break;
    default: x = -10; y = randRange(20, state.arenaH - 20); break;
  }

  const eid = "e" + state.nextEnemyId++;
  const hp = hpOverride ?? getEnemyHP(kind);
  const enemy: RBEnemy = {
    eid, x, y, kind, alive: true,
    hp, maxHp: hp,
    radius: getEnemyRadius(kind),
    speed: getEnemyBaseSpeed(kind),
    flashTimer: 0,
    state: "approach", stateTimer: kind === "archer" ? RB.ARCHER_FIRE_INTERVAL : kind === "necromancer" ? RB.NECROMANCER_SUMMON_INTERVAL : 1.0,
    frozenTimer: 0, burnTimer: 0, burnDamage: 0,
    parryStunned: false,
    summonCount: kind === "necromancer" ? 0 : undefined,
    spawnTimer: 0.6,
    elite: false,
  };

  if (state.waveSpeedBoost > 0) {
    enemy.speed *= (1 + state.waveSpeedBoost);
  }

  // Blood moon buff
  if (state.bloodMoonActive) {
    enemy.speed *= 1.5;
    enemy.hp = Math.ceil(enemy.hp * 1.5);
    enemy.maxHp = enemy.hp;
  }

  state.enemies.push(enemy);
  return enemy;
}

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

export function updateTimers(state: RBState, dt: number): void {
  if (state.screenShake > 0) state.screenShake = Math.max(0, state.screenShake - dt * 20);
  if (state.screenFlashTimer > 0) state.screenFlashTimer -= dt;
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) { state.comboCount = 0; state.lastKillRune = null; }
  }
  if (state.hitstopFrames > 0) state.hitstopFrames--;
  if (state.runeSwitchTimer > 0) state.runeSwitchTimer -= dt;
  if (state.slowTimer > 0) state.slowTimer -= dt;

  // Synergy timer
  if (state.synergyTimer > 0) {
    state.synergyTimer -= dt;
    if (state.synergyTimer <= 0) {
      state.synergyBonus = "";
    }
  }

  // Kill streak timer
  if (state.killStreakTimer > 0) {
    state.killStreakTimer -= dt;
    if (state.killStreakTimer <= 0) {
      state.killStreakCount = 0;
    }
  }

  // Execute timer
  if (state.executeTimer > 0) state.executeTimer -= dt;

  // Ultimate timer
  if (state.ultimateTimer > 0) {
    state.ultimateTimer -= dt;
    if (state.ultimateTimer <= 0) {
      state.ultimateActive = "";
      state.ultimateTimer = 0;
    }
  }

  // Slash ghosts
  for (let i = state.slashGhosts.length - 1; i >= 0; i--) {
    state.slashGhosts[i].life -= dt;
    if (state.slashGhosts[i].life <= 0) state.slashGhosts.splice(i, 1);
  }

  // Ambient particles
  for (let i = state.ambientParticles.length - 1; i >= 0; i--) {
    const p = state.ambientParticles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.92; p.vy *= 0.92;
    p.life -= dt;
    if (p.life <= 0) state.ambientParticles.splice(i, 1);
  }

  // Spawn timer on enemies
  for (const e of state.enemies) {
    if (e.spawnTimer > 0) e.spawnTimer -= dt;
  }

  // Rune ambient effects — spawn particles based on current rune
  spawnRuneAmbient(state, dt);
}

function spawnRuneAmbient(state: RBState, _dt: number): void {
  // Only spawn periodically (reuse time fractional check)
  if (Math.random() > 0.15) return; // ~15% chance per frame = frequent enough
  const px = state.playerX, py = state.playerY;
  const rune = state.currentRune;

  switch (rune) {
    case "fire": {
      // Small cinder particles drifting upward
      state.ambientParticles.push({
        x: px + (Math.random() - 0.5) * 20,
        y: py + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 8,
        vy: -(10 + Math.random() * 20),
        life: 0.6, maxLife: 0.6,
        color: 0xff6622, size: 1 + Math.random(),
      });
      break;
    }
    case "ice": {
      // Frost crystals forming on ground near player
      state.ambientParticles.push({
        x: px + (Math.random() - 0.5) * 30,
        y: py + state.playerRadius + Math.random() * 5,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        life: 0.8, maxLife: 0.8,
        color: 0x88ddff, size: 1.2 + Math.random() * 0.8,
      });
      break;
    }
    case "lightning": {
      // Small electric arcs between nearby points
      const arcAngle = Math.random() * Math.PI * 2;
      const arcDist = 8 + Math.random() * 12;
      state.ambientParticles.push({
        x: px + Math.cos(arcAngle) * arcDist,
        y: py + Math.sin(arcAngle) * arcDist,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        life: 0.15, maxLife: 0.15,
        color: 0xffee44, size: 1 + Math.random() * 0.5,
      });
      break;
    }
    case "shadow": {
      // Dark wisps trailing behind player
      state.ambientParticles.push({
        x: px + (Math.random() - 0.5) * 12,
        y: py + (Math.random() - 0.5) * 12,
        vx: -Math.cos(state.aimAngle) * (5 + Math.random() * 10),
        vy: -Math.sin(state.aimAngle) * (5 + Math.random() * 10),
        life: 0.5, maxLife: 0.5,
        color: 0x8844cc, size: 1.5 + Math.random(),
      });
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Shockwaves
// ---------------------------------------------------------------------------

export function updateShockwaves(state: RBState, dt: number): void {
  for (let i = state.shockwaves.length - 1; i >= 0; i--) {
    const sw = state.shockwaves[i];
    sw.life -= dt;
    const progress = 1 - sw.life / sw.maxLife;
    sw.radius = sw.maxRadius * progress;
    if (sw.life <= 0) state.shockwaves.splice(i, 1);
  }
}

function spawnShockwave(state: RBState, x: number, y: number, color: number, maxRadius: number, duration: number): void {
  state.shockwaves.push({ x, y, radius: 0, maxRadius, life: duration, maxLife: duration, color });
}

// ---------------------------------------------------------------------------
// Rune Ultimate abilities
// ---------------------------------------------------------------------------

export function tryUltimate(state: RBState): boolean {
  if (state.runeUltCharge < 100 || state.ultimateActive !== "") return false;
  state.runeUltCharge = 0;
  const rune = state.currentRune;

  switch (rune) {
    case "fire": {
      // INFERNO — all enemies on screen catch fire
      state.ultimateActive = "INFERNO";
      state.ultimateTimer = 0.5; // visual duration
      for (const e of state.enemies) {
        if (!e.alive) continue;
        e.burnTimer = RB.ULT_INFERNO_BURN;
        e.burnDamage = RB.FIRE_BURN_DAMAGE;
      }
      state.screenFlashColor = 0xff6622;
      state.screenFlashTimer = RB.FLASH_DURATION * 3;
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 30, "INFERNO", 0xff6622, 1.5);
      state.screenShake = RB.SHAKE_INTENSITY * 2;
      break;
    }
    case "ice": {
      // ABSOLUTE ZERO — all enemies freeze
      state.ultimateActive = "ABSOLUTE ZERO";
      state.ultimateTimer = 0.5;
      for (const e of state.enemies) {
        if (!e.alive) continue;
        e.state = "frozen";
        e.frozenTimer = RB.ULT_ABSOLUTE_ZERO_FREEZE;
        e.speed = 0;
      }
      state.screenFlashColor = 0x44ffff;
      state.screenFlashTimer = RB.FLASH_DURATION * 3;
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 30, "ABSOLUTE ZERO", 0x44ffff, 1.5);
      state.screenShake = RB.SHAKE_INTENSITY * 2;
      break;
    }
    case "lightning": {
      // STORM — strike 5 random enemies for 3 damage each
      state.ultimateActive = "STORM";
      state.ultimateTimer = 0.5;
      const alive = state.enemies.filter(e => e.alive);
      const strikes = Math.min(RB.ULT_STORM_STRIKES, alive.length);
      const shuffled = alive.sort(() => Math.random() - 0.5);
      for (let i = 0; i < strikes; i++) {
        const target = shuffled[i];
        target.hp -= RB.ULT_STORM_DAMAGE;
        target.flashTimer = 0.3;
        spawnParticles(state, target.x, target.y, RB.COLOR_LIGHTNING, 8);
        // Lightning chain visual from sky
        state.lightningChains.push({
          x1: target.x + randRange(-20, 20), y1: 0,
          x2: target.x, y2: target.y,
          life: 0.3, maxLife: 0.3,
        });
        if (target.hp <= 0) killEnemy(state, target);
      }
      state.screenFlashColor = 0xffff44;
      state.screenFlashTimer = RB.FLASH_DURATION * 3;
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 30, "STORM", 0xffff44, 1.5);
      state.screenShake = RB.SHAKE_INTENSITY * 3;
      break;
    }
    case "shadow": {
      // VOID STEP — invulnerable for 3s, 3x damage
      state.ultimateActive = "VOID STEP";
      state.ultimateTimer = RB.ULT_VOID_STEP_DURATION;
      state.invulnTimer = RB.ULT_VOID_STEP_DURATION;
      state.screenFlashColor = 0xaa44ff;
      state.screenFlashTimer = RB.FLASH_DURATION * 3;
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 30, "VOID STEP", 0xaa44ff, 1.5);
      spawnParticles(state, state.playerX, state.playerY, RB.COLOR_SHADOW, 15);
      state.screenShake = RB.SHAKE_INTENSITY * 2;
      break;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Lightning chains
// ---------------------------------------------------------------------------

export function updateLightningChains(state: RBState, dt: number): void {
  for (let i = state.lightningChains.length - 1; i >= 0; i--) {
    state.lightningChains[i].life -= dt;
    if (state.lightningChains[i].life <= 0) state.lightningChains.splice(i, 1);
  }
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

export function updateParticles(state: RBState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.95; p.vy *= 0.95;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

export function updateFloatTexts(state: RBState, dt: number): void {
  for (let i = state.floatTexts.length - 1; i >= 0; i--) {
    const ft = state.floatTexts[i];
    ft.y -= 30 * dt;
    ft.life -= dt;
    if (ft.life <= 0) state.floatTexts.splice(i, 1);
  }
}

// ---------------------------------------------------------------------------
// Spawn helpers
// ---------------------------------------------------------------------------

export function spawnParticles(
  state: RBState, x: number, y: number, color: number, count: number,
): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 40 + Math.random() * 80;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: RB.PARTICLE_LIFETIME, maxLife: RB.PARTICLE_LIFETIME,
      color, size: 2 + Math.random() * 2,
    });
  }
}

export function spawnFloatText(
  state: RBState, x: number, y: number, text: string, color: number, duration: number,
): void {
  state.floatTexts.push({
    x, y, text, color, life: duration, maxLife: duration, scale: 1,
  });
}

export function spawnDeathEffect(state: RBState): void {
  spawnParticles(state, state.playerX, state.playerY, RB.COLOR_DANGER, 20);
  state.screenShake = RB.SHAKE_INTENSITY * 3;
  state.screenFlashColor = RB.COLOR_DANGER;
  state.screenFlashTimer = RB.FLASH_DURATION * 3;
}

// ---------------------------------------------------------------------------
// Rune switching
// ---------------------------------------------------------------------------

export function switchToRune(state: RBState, rune: RuneType): void {
  if (state.currentRune === rune) return;
  state.prevRune = state.currentRune;
  state.currentRune = rune;
  state.runeSwitchTimer = 0.4;
  spawnParticles(state, state.playerX, state.playerY, getRuneColor(rune), 10);
}

export function cycleRune(state: RBState, direction: 1 | -1): void {
  const runes: RuneType[] = ["fire", "ice", "lightning", "shadow"];
  const idx = runes.indexOf(state.currentRune);
  const next = (idx + direction + runes.length) % runes.length;
  state.prevRune = state.currentRune;
  state.currentRune = runes[next];
  state.runeSwitchTimer = 0.4;
  // Spawn burst of particles in new rune color
  spawnParticles(state, state.playerX, state.playerY, getRuneColor(runes[next]), 10);
}

// ---------------------------------------------------------------------------
// Boss system
// ---------------------------------------------------------------------------

function spawnBoss(state: RBState, kind: BossKind): void {
  const bossStats: Record<BossKind, { hp: number; radius: number; speed: number; shieldRegen: number }> = {
    dark_knight: { hp: 50, radius: 20, speed: 100, shieldRegen: 2 },
    lich_king: { hp: 80, radius: 18, speed: 60, shieldRegen: 3 },
    dragon_wyrm: { hp: 120, radius: 24, speed: 80, shieldRegen: 4 },
  };
  const s = bossStats[kind];
  state.boss = {
    x: state.arenaW / 2, y: 40,
    hp: s.hp, maxHp: s.hp,
    kind, radius: s.radius, speed: s.speed,
    phase: 0, phaseTimer: 5.0, attackTimer: 0,
    alive: true, flashTimer: 0,
    shieldHP: 10,
  };
  state.bossWave = true;
  state.bossAnnounceTimer = 2.0;
  state.waveEventActive = "BOSS INCOMING!";
  spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 60, "BOSS INCOMING!", 0xff2244, 2.5);
  state.screenFlashColor = 0xff2244;
  state.screenFlashTimer = RB.FLASH_DURATION * 4;
  state.screenShake = Math.max(state.screenShake, RB.SHAKE_INTENSITY * 3);
}

export function updateBoss(state: RBState, dt: number): boolean {
  const boss = state.boss;
  if (!boss || !boss.alive) return false;

  let playerHit = false;
  const px = state.playerX, py = state.playerY;
  const a = angle(boss.x, boss.y, px, py);
  const d = dist(boss.x, boss.y, px, py);

  // Flash timer
  if (boss.flashTimer > 0) boss.flashTimer -= dt;

  // Boss announce timer
  if (state.bossAnnounceTimer > 0) {
    state.bossAnnounceTimer -= dt;
    return false; // boss doesn't act during announcement
  }

  // Shield regeneration
  const maxShield = boss.kind === "dark_knight" ? 10 : boss.kind === "lich_king" ? 15 : 20;
  const shieldRegen = boss.kind === "dark_knight" ? 2 : boss.kind === "lich_king" ? 3 : 4;
  boss.shieldHP = Math.min(maxShield, boss.shieldHP + shieldRegen * dt);

  // Phase cycling
  boss.phaseTimer -= dt;
  if (boss.phaseTimer <= 0) {
    boss.phase = (boss.phase + 1) % 3;
    boss.phaseTimer = 5.0;
    boss.attackTimer = 0;
  }

  // Constrain boss to arena
  const bm = boss.radius + 5;
  boss.x = clamp(boss.x, bm, state.arenaW - bm);
  boss.y = clamp(boss.y, bm, state.arenaH - bm);

  // Boss AI by kind
  switch (boss.kind) {
    case "dark_knight": {
      if (boss.phase === 0) {
        // Phase 1: Charge at player super-fast
        boss.x += Math.cos(a) * boss.speed * 2.5 * dt;
        boss.y += Math.sin(a) * boss.speed * 2.5 * dt;
        if (d < boss.radius + state.playerRadius + 5) {
          playerHit = hitPlayer(state, 2);
        }
      } else if (boss.phase === 1) {
        // Phase 2: Slam ground creating shockwave ring
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 2.0;
          spawnShockwave(state, boss.x, boss.y, 0xff4444, 100, 0.8);
          // Damage player if within shockwave range
          if (d < 100) {
            playerHit = hitPlayer(state, 2);
          }
          state.screenShake = Math.max(state.screenShake, RB.SHAKE_INTENSITY * 2);
          spawnParticles(state, boss.x, boss.y, 0xff4444, 12);
        }
        // Slow approach
        boss.x += Math.cos(a) * boss.speed * 0.3 * dt;
        boss.y += Math.sin(a) * boss.speed * 0.3 * dt;
      } else {
        // Phase 3: Summon 3 skeletons, retreat to heal 5% HP
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 5.0;
          for (let i = 0; i < 3; i++) spawnSpecificEnemy(state, "skeleton");
          boss.hp = Math.min(boss.maxHp, boss.hp + boss.maxHp * 0.05);
          spawnFloatText(state, boss.x, boss.y - 30, "HEAL!", 0x44ff44, 1.0);
          spawnParticles(state, boss.x, boss.y, 0x44ff44, 8);
        }
        // Retreat from player
        boss.x -= Math.cos(a) * boss.speed * 0.5 * dt;
        boss.y -= Math.sin(a) * boss.speed * 0.5 * dt;
      }
      break;
    }
    case "lich_king": {
      if (boss.phase === 0) {
        // Phase 1: Fire 5 arrows in fan pattern
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 2.5;
          for (let i = 0; i < 5; i++) {
            const fanAngle = a - 0.4 + (i * 0.8 / 4);
            state.projectiles.push({
              x: boss.x, y: boss.y,
              vx: Math.cos(fanAngle) * 180,
              vy: Math.sin(fanAngle) * 180,
              damage: 1, radius: 4, life: 4.0,
              color: 0x44ff66, fromEnemy: true,
            });
          }
          spawnParticles(state, boss.x, boss.y, 0x44ff66, 6);
        }
        // Slow approach
        if (d > 150) {
          boss.x += Math.cos(a) * boss.speed * 0.5 * dt;
          boss.y += Math.sin(a) * boss.speed * 0.5 * dt;
        }
      } else if (boss.phase === 1) {
        // Phase 2: Summon 2 wraiths
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 5.0;
          for (let i = 0; i < 2; i++) spawnSpecificEnemy(state, "wraith");
          spawnFloatText(state, boss.x, boss.y - 20, "SUMMON!", 0xaa44ff, 1.0);
        }
        // Keep distance
        if (d < 100) {
          boss.x -= Math.cos(a) * boss.speed * 0.8 * dt;
          boss.y -= Math.sin(a) * boss.speed * 0.8 * dt;
        }
      } else {
        // Phase 3: Dark zone that drains player HP
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 1.0; // tick every second
          // Create dark zone at boss position — damages player if within 80px
          if (d < 80) {
            playerHit = hitPlayer(state, 1);
            spawnFloatText(state, px, py - 15, "DARK ZONE!", 0x6622aa, 0.8);
          }
          spawnParticles(state, boss.x, boss.y, 0x6622aa, 6);
        }
        // Slow approach
        boss.x += Math.cos(a) * boss.speed * 0.3 * dt;
        boss.y += Math.sin(a) * boss.speed * 0.3 * dt;
      }
      break;
    }
    case "dragon_wyrm": {
      if (boss.phase === 0) {
        // Phase 1: Breathe fire cone (spawn fire trails in a wide arc)
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 2.0;
          for (let i = 0; i < 7; i++) {
            const fireAngle = a - 0.5 + (i * 1.0 / 6);
            const fireDist = 40 + i * 15;
            state.fireTrails.push({
              x: boss.x + Math.cos(fireAngle) * fireDist,
              y: boss.y + Math.sin(fireAngle) * fireDist,
              life: 3.0, maxLife: 3.0,
              radius: RB.FIRE_TRAIL_RADIUS * 1.5,
            });
          }
          spawnParticles(state, boss.x, boss.y, 0xff4422, 10);
        }
        // Approach player
        if (d > 100) {
          boss.x += Math.cos(a) * boss.speed * 0.6 * dt;
          boss.y += Math.sin(a) * boss.speed * 0.6 * dt;
        }
      } else if (boss.phase === 1) {
        // Phase 2: Dash across arena leaving lightning chains
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 3.0;
          const dashAngle = a;
          const oldX = boss.x, oldY = boss.y;
          boss.x += Math.cos(dashAngle) * 200;
          boss.y += Math.sin(dashAngle) * 200;
          boss.x = clamp(boss.x, bm, state.arenaW - bm);
          boss.y = clamp(boss.y, bm, state.arenaH - bm);
          // Lightning chain from old to new pos
          state.lightningChains.push({
            x1: oldX, y1: oldY, x2: boss.x, y2: boss.y,
            life: 0.5, maxLife: 0.5,
          });
          spawnParticles(state, boss.x, boss.y, RB.COLOR_LIGHTNING, 10);
          // Damage player if crossing near
          if (d < 60) {
            playerHit = hitPlayer(state, 2);
          }
          state.screenShake = Math.max(state.screenShake, RB.SHAKE_INTENSITY * 2);
        }
      } else {
        // Phase 3: Shadow phase — goes invisible, teleports and strikes
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 2.5;
          // Teleport near player
          const teleAngle = Math.random() * Math.PI * 2;
          boss.x = px + Math.cos(teleAngle) * 50;
          boss.y = py + Math.sin(teleAngle) * 50;
          boss.x = clamp(boss.x, bm, state.arenaW - bm);
          boss.y = clamp(boss.y, bm, state.arenaH - bm);
          spawnParticles(state, boss.x, boss.y, RB.COLOR_SHADOW, 10);
          // Strike: damage if close
          const strikeD = dist(boss.x, boss.y, px, py);
          if (strikeD < boss.radius + state.playerRadius + 20) {
            playerHit = hitPlayer(state, 2);
          }
          state.screenShake = Math.max(state.screenShake, RB.SHAKE_INTENSITY * 1.5);
        }
      }
      break;
    }
  }

  // Constrain again after movement
  boss.x = clamp(boss.x, bm, state.arenaW - bm);
  boss.y = clamp(boss.y, bm, state.arenaH - bm);

  return playerHit;
}

// Check slash hits on boss
export function checkBossSlashHits(state: RBState): void {
  const boss = state.boss;
  if (!boss || !boss.alive) return;

  for (const s of state.slashes) {
    if (s.hitIds.indexOf("boss") >= 0) continue;
    const d = dist(s.x, s.y, boss.x, boss.y);
    if (d < s.radius + boss.radius) {
      s.hitIds.push("boss");
      let dmg = s.damage;
      if (state.ultimateActive === "VOID STEP") dmg *= RB.ULT_VOID_STEP_MULT;

      // Shield absorbs damage first
      if (boss.shieldHP > 0) {
        const absorbed = Math.min(boss.shieldHP, dmg);
        boss.shieldHP -= absorbed;
        dmg -= absorbed;
        if (absorbed > 0) {
          spawnParticles(state, boss.x, boss.y, 0x4488ff, 3);
        }
      }

      if (dmg > 0) {
        boss.hp -= dmg;
        boss.flashTimer = 0.1;
        spawnParticles(state, boss.x, boss.y, 0xff4444, 4);
        state.screenShake = Math.max(state.screenShake, RB.SHAKE_INTENSITY * 0.5);
      }

      if (boss.hp <= 0) {
        killBoss(state);
      }
    }
  }
}

function killBoss(state: RBState): void {
  const boss = state.boss;
  if (!boss) return;
  boss.alive = false;

  // Massive score bonus
  let bonus = 0;
  switch (boss.kind) {
    case "dark_knight": bonus = 100; break;
    case "lich_king": bonus = 200; break;
    case "dragon_wyrm": bonus = 300; break;
  }
  state.score += bonus;
  spawnFloatText(state, boss.x, boss.y - 30, `BOSS SLAIN! +${bonus}`, 0xffd700, 2.0);

  // Tons of particles
  for (let i = 0; i < 40; i++) {
    const pa = Math.random() * Math.PI * 2;
    const spd = 60 + Math.random() * 120;
    const colors = [0xff4422, 0xffd700, 0xff8844, 0xffee44, 0xff2244];
    state.particles.push({
      x: boss.x, y: boss.y,
      vx: Math.cos(pa) * spd, vy: Math.sin(pa) * spd,
      life: 1.0 + Math.random() * 0.5, maxLife: 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 3,
    });
  }

  // Shockwaves
  spawnShockwave(state, boss.x, boss.y, 0xffd700, 120, 1.0);
  spawnShockwave(state, boss.x, boss.y, 0xff4422, 80, 0.6);

  state.screenShake = RB.SHAKE_INTENSITY * 4;
  state.screenFlashColor = 0xffd700;
  state.screenFlashTimer = RB.FLASH_DURATION * 5;

  state.boss = null;
  state.bossWave = false;
  state.waveEventActive = "";
}

// ---------------------------------------------------------------------------
// Arena hazards
// ---------------------------------------------------------------------------

function spawnArenaHazards(state: RBState): void {
  // Clear old hazards
  state.arenaHazards = [];
  const count = 2 + Math.floor(Math.random() * 3); // 2-4
  const hazardKinds: Array<"spike_pit" | "flame_vent" | "ice_patch"> = ["spike_pit", "flame_vent", "ice_patch"];
  for (let i = 0; i < count; i++) {
    const kind = hazardKinds[Math.floor(Math.random() * hazardKinds.length)];
    const margin = 60;
    state.arenaHazards.push({
      x: randRange(margin, state.arenaW - margin),
      y: randRange(margin, state.arenaH - margin),
      kind,
      radius: 25,
      activeTimer: kind === "flame_vent" ? 0 : 0,
      active: kind !== "flame_vent", // flame vent cycles
    });
  }
}

export function updateHazards(state: RBState, dt: number): boolean {
  let playerHit = false;
  if (state.hazardDamageCooldown > 0) state.hazardDamageCooldown -= dt;

  for (const h of state.arenaHazards) {
    // Flame vent cycling: 2s on, 3s off
    if (h.kind === "flame_vent") {
      h.activeTimer += dt;
      const cycle = h.activeTimer % 5.0; // 5s cycle
      h.active = cycle < 2.0; // on for 2s, off for 3s
    }

    const px = state.playerX, py = state.playerY;
    const pd = dist(h.x, h.y, px, py);

    switch (h.kind) {
      case "spike_pit": {
        // Damage player/enemies walking over it (1 dmg, 1s cooldown)
        if (pd < h.radius + state.playerRadius && state.hazardDamageCooldown <= 0) {
          playerHit = hitPlayer(state, 1);
          state.hazardDamageCooldown = 1.0;
        }
        // Damage enemies
        for (const e of state.enemies) {
          if (!e.alive) continue;
          const ed = dist(h.x, h.y, e.x, e.y);
          if (ed < h.radius + e.radius) {
            e.hp -= 0.5 * dt; // slow damage to enemies
            if (e.hp <= 0) killEnemy(state, e);
          }
        }
        break;
      }
      case "flame_vent": {
        if (!h.active) break;
        // Set anything nearby on fire
        if (pd < h.radius + state.playerRadius && state.hazardDamageCooldown <= 0) {
          playerHit = hitPlayer(state, 1);
          state.hazardDamageCooldown = 1.0;
        }
        for (const e of state.enemies) {
          if (!e.alive || e.burnTimer > 0) continue;
          const ed = dist(h.x, h.y, e.x, e.y);
          if (ed < h.radius + e.radius) {
            e.burnTimer = RB.FIRE_BURN_DURATION;
            e.burnDamage = RB.FIRE_BURN_DAMAGE;
          }
        }
        break;
      }
      case "ice_patch": {
        // Slow anything walking on it by 50%
        // Applied as temporary speed reduction via position check
        // For enemies: reduce movement this frame
        for (const e of state.enemies) {
          if (!e.alive) continue;
          const ed = dist(h.x, h.y, e.x, e.y);
          if (ed < h.radius + e.radius && e.state !== "frozen") {
            // Apply ice slow as a frame-by-frame factor (handled by reducing speed temporarily)
            // We just reduce speed for this tick — enemies will be re-checked next frame
            e.speed = getEnemyBaseSpeed(e.kind) * 0.5;
          }
        }
        break;
      }
    }
  }

  return playerHit;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

export function getRuneColor(rune: RuneType): number {
  switch (rune) {
    case "fire": return RB.COLOR_FIRE;
    case "ice": return RB.COLOR_ICE;
    case "lightning": return RB.COLOR_LIGHTNING;
    case "shadow": return RB.COLOR_SHADOW;
  }
}

export function getEnemyColor(kind: EnemyKind): number {
  switch (kind) {
    case "skeleton": return RB.COLOR_SKELETON;
    case "archer": return RB.COLOR_ARCHER;
    case "knight": return RB.COLOR_KNIGHT;
    case "wraith": return RB.COLOR_WRAITH;
    case "necromancer": return RB.COLOR_NECROMANCER;
  }
}
