// ---------------------------------------------------------------------------
// Voidwalker — Core game systems
// Portal-based shadow combat: place void portals, teleport, control space
// ---------------------------------------------------------------------------

import type { VWState, VWEnemy, VWEnemyKind, VWBoss } from "../types";
import { VW } from "../config/VoidwalkerBalance";

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
// Player movement + cooldown timers
// ---------------------------------------------------------------------------

export function updatePlayer(
  state: VWState,
  dt: number,
  keys: Set<string>
): void {
  // --- Movement ---
  if (state.dashing) {
    const dashSpeed = VW.DASH_SPEED;
    state.playerX += Math.cos(state.dashAngle) * dashSpeed * dt;
    state.playerY += Math.sin(state.dashAngle) * dashSpeed * dt;
    state.dashTimer -= dt;

    // Dash shadow trail damages nearby enemies
    for (const e of state.enemies) {
      if (!e.alive || e.spawnTimer > 0) continue;
      if (dist(state.playerX, state.playerY, e.x, e.y) < VW.DASH_SHADOW_RADIUS + e.radius) {
        damageEnemy(state, e, VW.DASH_SHADOW_DAMAGE);
      }
    }

    if (state.dashTimer <= 0) {
      state.dashing = false;
    }
  } else {
    let dx = 0, dy = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp"))    dy -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown"))  dy += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft"))  dx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len; dy /= len;
      state.playerX += dx * VW.PLAYER_SPEED * dt;
      state.playerY += dy * VW.PLAYER_SPEED * dt;
      state.moveAngle = Math.atan2(dy, dx);

      // Footstep particles (dark purple)
      state.footstepTimer -= dt;
      if (state.footstepTimer <= 0) {
        state.footstepTimer = 0.12;
        spawnParticles(state, state.playerX, state.playerY, 2, {
          color: 0x442288,
          speedMin: 10,
          speedMax: 30,
          lifeMin: 0.15,
          lifeMax: 0.3,
          sizeMin: 1.5,
          sizeMax: 3,
          spread: Math.PI * 2,
        });
      }
    }
  }

  // Constrain to arena
  const pr = state.playerRadius;
  state.playerX = clamp(state.playerX, pr, state.arenaW - pr);
  state.playerY = clamp(state.playerY, pr, state.arenaH - pr);

  // --- Cooldown ticks ---
  if (state.boltCooldown > 0)            state.boltCooldown            = Math.max(0, state.boltCooldown - dt);
  if (state.dashCooldown > 0)            state.dashCooldown            = Math.max(0, state.dashCooldown - dt);
  if (state.pulseCooldown > 0)           state.pulseCooldown           = Math.max(0, state.pulseCooldown - dt);
  if (state.stormCooldown > 0)           state.stormCooldown           = Math.max(0, state.stormCooldown - dt);
  if (state.portalTeleportCooldown > 0)  state.portalTeleportCooldown  = Math.max(0, state.portalTeleportCooldown - dt);
  if (state.invulnTimer > 0)             state.invulnTimer             = Math.max(0, state.invulnTimer - dt);

  // --- Portal teleportation ---
  if (state.portals.length >= 2 && state.portalTeleportCooldown <= 0) {
    for (let i = 0; i < state.portals.length; i++) {
      const p = state.portals[i];
      if (dist(state.playerX, state.playerY, p.x, p.y) < p.radius + pr) {
        // Teleport to the other portal
        const other = state.portals[i === 0 ? 1 : 0];
        state.playerX = other.x;
        state.playerY = other.y;
        state.portalTeleportCooldown = VW.PORTAL_TELEPORT_COOLDOWN;
        state.invulnTimer = 0.3;
        spawnParticles(state, other.x, other.y, 18, {
          color: VW.COLOR_PORTAL,
          speedMin: 40,
          speedMax: 120,
          lifeMin: 0.2,
          lifeMax: 0.5,
          sizeMin: 2,
          sizeMax: 5,
          spread: Math.PI * 2,
        });
        // Teleport arrival stun — stun nearby enemies at arrival
        for (const e2 of state.enemies) {
          if (!e2.alive || e2.spawnTimer > 0) continue;
          if (dist(other.x, other.y, e2.x, e2.y) < VW.PORTAL_RADIUS * 1.5 + e2.radius) {
            e2.stunTimer = 0.8;
            e2.state = "stunned";
          }
        }
        spawnFloatText(state, other.x, other.y - 18, "TELEPORT!", VW.COLOR_PORTAL, 1.0);
        break;
      }
    }
  }

  // --- Storm tick ---
  if (state.stormActive) {
    state.stormTimer -= dt;
    if (state.stormTimer <= 0) {
      state.stormActive = false;
    } else {
      // Every STORM_BOLT_INTERVAL fire homing shadow bolts from each portal toward nearest enemy
      for (const p of state.portals) {
        p.stormBoltTimer = p.stormBoltTimer - dt;
        if (p.stormBoltTimer <= 0) {
          p.stormBoltTimer = VW.STORM_BOLT_INTERVAL;

          // Find nearest enemy
          let nearestEnemy: VWEnemy | null = null;
          let nearestDist = Infinity;
          for (const e of state.enemies) {
            if (!e.alive || e.spawnTimer > 0) continue;
            const d = dist(p.x, p.y, e.x, e.y);
            if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
          }

          if (nearestEnemy) {
            const a = angle(p.x, p.y, nearestEnemy.x, nearestEnemy.y);
            state.projectiles.push({
              x: p.x, y: p.y,
              vx: Math.cos(a) * VW.STORM_BOLT_SPEED,
              vy: Math.sin(a) * VW.STORM_BOLT_SPEED,
              damage: VW.STORM_BOLT_DAMAGE,
              radius: 4,
              life: 2.5,
              color: VW.COLOR_VOID_BRIGHT,
              fromEnemy: false,
              homing: true,
              homingStrength: 4.0,
            });
          }
        }
      }
    }
  }

  // --- Portal passive damage ---
  for (const p of state.portals) {
    for (const e of state.enemies) {
      if (!e.alive || e.spawnTimer > 0) continue;
      if (e.kind === "void_golem") continue; // immune to portal passive damage
      if (dist(p.x, p.y, e.x, e.y) < p.radius + e.radius) {
        damageEnemy(state, e, VW.PORTAL_PASSIVE_DAMAGE * dt);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Shadow Bolt
// ---------------------------------------------------------------------------

export function tryShoot(state: VWState): void {
  if (state.boltCooldown > 0) return;

  const a = state.aimAngle;
  const baseDamage = VW.BOLT_DAMAGE * (1 + 0.25 * state.boltPowerLevel);

  // Check for portal bonus
  let portalBonus = 0;
  for (const p of state.portals) {
    if (dist(state.playerX, state.playerY, p.x, p.y) < p.radius + 60) {
      portalBonus = VW.BOLT_PORTAL_BONUS;
      break;
    }
  }

  state.projectiles.push({
    x: state.playerX,
    y: state.playerY,
    vx: Math.cos(a) * VW.BOLT_SPEED,
    vy: Math.sin(a) * VW.BOLT_SPEED,
    damage: baseDamage + portalBonus,
    radius: VW.BOLT_RADIUS,
    life: VW.BOLT_LIFE,
    color: VW.COLOR_BOLT,
    fromEnemy: false,
    homing: false,
    homingStrength: 0,
  });

  // Muzzle particles
  spawnParticles(state, state.playerX, state.playerY, 4, {
    color: VW.COLOR_VOID_BRIGHT,
    speedMin: 30,
    speedMax: 80,
    lifeMin: 0.08,
    lifeMax: 0.18,
    sizeMin: 1.5,
    sizeMax: 3,
    spread: 0.5,
    baseAngle: a + Math.PI,
  });

  state.boltCooldown = VW.BOLT_COOLDOWN;

  // Combo fire rate bonus — up to 30% faster
  if (state.comboCount > 0) {
    state.boltCooldown *= Math.max(0.7, 1 - state.comboCount * 0.04);
  }
}

// ---------------------------------------------------------------------------
// Ability Synergy
// ---------------------------------------------------------------------------

function checkSynergy(state: VWState, newAbility: string): void {
  if (state.synergyTimer <= 0 || !state.lastAbilityUsed) {
    state.lastAbilityUsed = newAbility;
    state.synergyTimer = 2.5;
    return;
  }

  const combo = state.lastAbilityUsed + "+" + newAbility;
  let synergy = "";

  switch (combo) {
    case "dash+pulse":
      synergy = "VOID RUPTURE";
      // Double pulse radius for this pulse
      for (const e of state.enemies) {
        if (!e.alive) continue;
        if (dist(state.playerX, state.playerY, e.x, e.y) < VW.PULSE_RADIUS * 1.5 + e.radius) {
          damageEnemy(state, e, VW.PULSE_DAMAGE * 0.5);
        }
      }
      state.score += 25;
      break;
    case "pulse+storm":
    case "storm+pulse":
      synergy = "SHADOW NOVA";
      // All portals explode with extra damage
      for (const portal of state.portals) {
        for (const e of state.enemies) {
          if (!e.alive) continue;
          if (dist(portal.x, portal.y, e.x, e.y) < VW.PULSE_RADIUS + e.radius) {
            damageEnemy(state, e, 3);
          }
        }
        spawnShockwave(state, portal.x, portal.y, VW.PULSE_RADIUS * 1.3, VW.COLOR_GOLD);
      }
      state.score += 40;
      break;
    case "portal+dash":
    case "dash+portal":
      synergy = "PHASE SHIFT";
      // Stun all enemies near any portal for 1.5s
      for (const portal of state.portals) {
        for (const e of state.enemies) {
          if (!e.alive) continue;
          if (dist(portal.x, portal.y, e.x, e.y) < portal.radius * 2 + e.radius) {
            e.stunTimer = 1.5;
            e.state = "stunned";
          }
        }
      }
      state.score += 20;
      break;
    default:
      state.lastAbilityUsed = newAbility;
      state.synergyTimer = 2.5;
      return;
  }

  if (synergy) {
    state.synergyBonus = synergy;
    state.synergyTimer = 3.0;
    spawnFloatText(state, state.playerX, state.playerY - 40, synergy, VW.COLOR_GOLD, 1.5);
    spawnParticles(state, state.playerX, state.playerY, 12, {
      color: VW.COLOR_GOLD, speedMin: 40, speedMax: 100,
      lifeMin: 0.2, lifeMax: 0.5, sizeMin: 2, sizeMax: 5, spread: Math.PI * 2,
    });
    state.screenFlashColor = VW.COLOR_GOLD;
    state.screenFlashTimer = VW.FLASH_DURATION;
  }

  state.lastAbilityUsed = newAbility;
  state.synergyTimer = 2.5;
}

// ---------------------------------------------------------------------------
// Place Portal
// ---------------------------------------------------------------------------

export function tryPlacePortal(state: VWState): void {
  checkSynergy(state, "portal");
  const portalLife = VW.PORTAL_DURATION + state.portalPowerLevel * 5;

  // Remove oldest if at max
  if (state.portals.length >= VW.PORTAL_MAX) {
    state.portals.shift();
  }

  const newPortal = {
    x: state.playerX,
    y: state.playerY,
    life: portalLife,
    maxLife: portalLife,
    radius: VW.PORTAL_RADIUS,
    id: state.nextPortalId++,
    stormBoltTimer: 0,
  };

  state.portals.push(newPortal);

  // Spawn particles and shockwave
  spawnParticles(state, newPortal.x, newPortal.y, 24, {
    color: VW.COLOR_PORTAL,
    speedMin: 40,
    speedMax: 150,
    lifeMin: 0.25,
    lifeMax: 0.6,
    sizeMin: 2,
    sizeMax: 6,
    spread: Math.PI * 2,
  });

  spawnShockwave(state, newPortal.x, newPortal.y, VW.PORTAL_RADIUS * 2.5, VW.COLOR_PORTAL);
  spawnFloatText(state, newPortal.x, newPortal.y - 20, "PORTAL", VW.COLOR_PORTAL, 1.0);
}

// ---------------------------------------------------------------------------
// Void Dash
// ---------------------------------------------------------------------------

export function tryDash(state: VWState): void {
  if (state.dashCooldown > 0) return;
  checkSynergy(state, "dash");

  const a = (Math.abs(state.moveAngle) > 0.01) ? state.moveAngle : state.aimAngle;

  state.dashing = true;
  state.dashTimer = VW.DASH_DURATION;
  state.dashAngle = a;
  state.invulnTimer = VW.DASH_DURATION + 0.05;
  state.dashCooldown = state.dashCooldownMax;

  // Shadow trail particles
  spawnParticles(state, state.playerX, state.playerY, 10, {
    color: VW.COLOR_SHADOW,
    speedMin: 20,
    speedMax: 60,
    lifeMin: 0.1,
    lifeMax: 0.25,
    sizeMin: 2,
    sizeMax: 5,
    spread: Math.PI * 2,
  });

  // Portal synergy: dashing near a portal creates void burst
  for (const portal of state.portals) {
    if (dist(state.playerX, state.playerY, portal.x, portal.y) < portal.radius + 10) {
      // Void burst at portal
      for (const e of state.enemies) {
        if (!e.alive || e.spawnTimer > 0) continue;
        if (dist(portal.x, portal.y, e.x, e.y) < VW.PULSE_RADIUS * 0.6 + e.radius) {
          damageEnemy(state, e, VW.DASH_SHADOW_DAMAGE);
        }
      }
      spawnShockwave(state, portal.x, portal.y, VW.PULSE_RADIUS * 0.8, VW.COLOR_PORTAL);
      spawnFloatText(state, portal.x, portal.y - 15, "VOID BURST!", VW.COLOR_PORTAL, 1.1);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Void Pulse
// ---------------------------------------------------------------------------

export function tryPulse(state: VWState): void {
  if (state.pulseCooldown > 0) return;
  checkSynergy(state, "pulse");

  // AoE around player
  const blastPoints: Array<{ x: number; y: number }> = [
    { x: state.playerX, y: state.playerY },
    ...state.portals.map(p => ({ x: p.x, y: p.y })),
  ];

  for (const pt of blastPoints) {
    for (const e of state.enemies) {
      if (!e.alive || e.spawnTimer > 0) continue;
      if (dist(pt.x, pt.y, e.x, e.y) < VW.PULSE_RADIUS + e.radius) {
        damageEnemy(state, e, VW.PULSE_DAMAGE);
      }
    }

    // Damage boss
    if (state.boss && state.boss.alive) {
      if (dist(pt.x, pt.y, state.boss.x, state.boss.y) < VW.PULSE_RADIUS + state.boss.radius) {
        state.boss.hp -= VW.PULSE_DAMAGE;
        state.boss.flashTimer = 0.15;
        if (state.boss.hp <= 0) {
          state.boss.alive = false;
          spawnDeathEffect(state, state.boss.x, state.boss.y, state.boss.radius, 0xffd700);
          state.score += 500;
          state.bossWave = false;
        }
      }
    }

    spawnParticles(state, pt.x, pt.y, 20, {
      color: VW.COLOR_VOID_BRIGHT,
      speedMin: 50,
      speedMax: 180,
      lifeMin: 0.2,
      lifeMax: 0.5,
      sizeMin: 2,
      sizeMax: 6,
      spread: Math.PI * 2,
    });
    spawnShockwave(state, pt.x, pt.y, VW.PULSE_RADIUS, VW.COLOR_VOID_BRIGHT);
    spawnFloatText(state, pt.x, pt.y - 24, "VOID PULSE", VW.COLOR_VOID_BRIGHT, 1.1);
  }

  state.screenShake = VW.SHAKE_INTENSITY * 1.5;
  state.pulseCooldown = state.pulseCooldownMax;
}

// ---------------------------------------------------------------------------
// Shadow Storm (ultimate)
// ---------------------------------------------------------------------------

export function tryStorm(state: VWState): void {
  if (state.stormCooldown > 0) return;
  checkSynergy(state, "storm");

  state.stormActive = true;
  state.stormTimer = VW.STORM_DURATION;
  state.stormCooldown = state.stormCooldownMax;

  // Reset per-portal storm timers
  for (const p of state.portals) {
    p.stormBoltTimer = 0;
  }

  spawnParticles(state, state.playerX, state.playerY, 30, {
    color: VW.COLOR_VOID_BRIGHT,
    speedMin: 60,
    speedMax: 200,
    lifeMin: 0.3,
    lifeMax: 0.8,
    sizeMin: 2,
    sizeMax: 7,
    spread: Math.PI * 2,
  });

  state.screenFlashTimer = VW.FLASH_DURATION;
  state.screenFlashColor = VW.COLOR_VOID;
  spawnFloatText(state, state.playerX, state.playerY - 32, "SHADOW STORM", VW.COLOR_VOID_BRIGHT, 1.4);
}

// ---------------------------------------------------------------------------
// Projectile update
// ---------------------------------------------------------------------------

export function updateProjectiles(state: VWState, dt: number): boolean {
  let playerDied = false;

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    proj.life -= dt;
    if (proj.life <= 0) { state.projectiles.splice(i, 1); continue; }

    // Homing: adjust velocity toward nearest enemy
    if (proj.homing && !proj.fromEnemy) {
      let nearestEnemy: VWEnemy | null = null;
      let nearestDist = Infinity;
      for (const e of state.enemies) {
        if (!e.alive || e.spawnTimer > 0) continue;
        const d = dist(proj.x, proj.y, e.x, e.y);
        if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
      }
      if (nearestEnemy) {
        const targetAngle = angle(proj.x, proj.y, nearestEnemy.x, nearestEnemy.y);
        const currentAngle = Math.atan2(proj.vy, proj.vx);
        let diff = targetAngle - currentAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const newAngle = currentAngle + diff * proj.homingStrength * dt;
        const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
        proj.vx = Math.cos(newAngle) * speed;
        proj.vy = Math.sin(newAngle) * speed;
      }
    }

    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;

    // Out of arena
    if (proj.x < 0 || proj.x > state.arenaW || proj.y < 0 || proj.y > state.arenaH) {
      state.projectiles.splice(i, 1);
      continue;
    }

    if (proj.fromEnemy) {
      // Check hit player
      if (state.invulnTimer <= 0 && dist(proj.x, proj.y, state.playerX, state.playerY) < proj.radius + state.playerRadius) {
        state.projectiles.splice(i, 1);
        if (hitPlayer(state, proj.damage)) { playerDied = true; }
        continue;
      }
    } else {
      // Check hit enemies
      let hit = false;
      for (const e of state.enemies) {
        if (!e.alive || e.spawnTimer > 0) continue;
        if (dist(proj.x, proj.y, e.x, e.y) < proj.radius + e.radius) {
          // Portal bonus: extra damage if enemy is near a portal
          let bonus = 0;
          for (const p of state.portals) {
            if (dist(p.x, p.y, e.x, e.y) < p.radius + e.radius + 20) {
              bonus = VW.BOLT_PORTAL_BONUS;
              break;
            }
          }
          damageEnemy(state, e, proj.damage + bonus);
          spawnParticles(state, proj.x, proj.y, 5, {
            color: proj.color,
            speedMin: 20,
            speedMax: 60,
            lifeMin: 0.08,
            lifeMax: 0.2,
            sizeMin: 1,
            sizeMax: 3,
            spread: Math.PI * 2,
          });
          hit = true;
          break;
        }
      }

      // Check hit boss
      if (!hit && state.boss && state.boss.alive) {
        if (dist(proj.x, proj.y, state.boss.x, state.boss.y) < proj.radius + state.boss.radius) {
          state.boss.hp -= proj.damage;
          state.boss.flashTimer = 0.12;
          spawnParticles(state, proj.x, proj.y, 6, {
            color: 0xffd700,
            speedMin: 20,
            speedMax: 70,
            lifeMin: 0.1,
            lifeMax: 0.25,
            sizeMin: 1.5,
            sizeMax: 4,
            spread: Math.PI * 2,
          });
          hit = true;
          if (state.boss.hp <= 0) {
            state.boss.alive = false;
            spawnDeathEffect(state, state.boss.x, state.boss.y, state.boss.radius, 0xffd700);
            state.score += 500;
            state.bossWave = false;
          }
        }
      }

      if (hit) { state.projectiles.splice(i, 1); continue; }
    }
  }

  return playerDied;
}

// ---------------------------------------------------------------------------
// Enemy AI update
// ---------------------------------------------------------------------------

export function updateEnemies(state: VWState, dt: number): boolean {
  let playerDied = false;

  for (const e of state.enemies) {
    if (!e.alive) continue;

    if (e.spawnTimer > 0) {
      e.spawnTimer -= dt;
      continue;
    }

    if (e.flashTimer > 0) e.flashTimer = Math.max(0, e.flashTimer - dt);
    if (e.stunTimer > 0) {
      e.stunTimer -= dt;
      e.state = "stunned";
      continue;
    }

    e.speed = e.baseSpeed; // Reset speed (shadow_pool modifies it)

    const dx = state.playerX - e.x;
    const dy = state.playerY - e.y;
    const dToPlayer = Math.sqrt(dx * dx + dy * dy);

    switch (e.kind) {
      case "cultist": {
        // Melee rush — always approach
        e.state = "approach";
        if (dToPlayer > 0) {
          e.x += (dx / dToPlayer) * e.speed * dt;
          e.y += (dy / dToPlayer) * e.speed * dt;
        }

        // Attack on contact
        if (dToPlayer < e.radius + state.playerRadius + VW.CULTIST_ATTACK_RANGE) {
          e.stateTimer -= dt;
          if (e.stateTimer <= 0) {
            e.stateTimer = 0.8;
            e.state = "attack";
            if (state.invulnTimer <= 0) {
              if (hitPlayer(state, VW.CULTIST_DAMAGE)) playerDied = true;
            }
          }
        } else {
          e.stateTimer = 0;
        }
        break;
      }

      case "dark_archer": {
        // Keep distance, fire projectiles
        if (dToPlayer < VW.DARK_ARCHER_KEEP_DIST) {
          // Back away
          e.state = "approach";
          if (dToPlayer > 0) {
            e.x -= (dx / dToPlayer) * e.speed * dt;
            e.y -= (dy / dToPlayer) * e.speed * dt;
          }
        } else if (dToPlayer > VW.DARK_ARCHER_KEEP_DIST + 40) {
          // Advance
          e.state = "approach";
          if (dToPlayer > 0) {
            e.x += (dx / dToPlayer) * e.speed * 0.5 * dt;
            e.y += (dy / dToPlayer) * e.speed * 0.5 * dt;
          }
        }

        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          e.fireTimer = VW.DARK_ARCHER_FIRE_INTERVAL;
          e.state = "attack";
          const a = angle(e.x, e.y, state.playerX, state.playerY);
          state.projectiles.push({
            x: e.x, y: e.y,
            vx: Math.cos(a) * 160,
            vy: Math.sin(a) * 160,
            damage: 1, radius: 4, life: 3.0,
            color: 0xcc3344,
            fromEnemy: true,
            homing: false, homingStrength: 0,
          });
        }
        break;
      }

      case "void_golem": {
        // Slow tank, melee, immune to portal passive (handled in updatePlayer)
        e.state = "approach";
        if (dToPlayer > 0) {
          e.x += (dx / dToPlayer) * e.speed * dt;
          e.y += (dy / dToPlayer) * e.speed * dt;
        }

        if (dToPlayer < e.radius + state.playerRadius + VW.VOID_GOLEM_ATTACK_RANGE) {
          e.stateTimer -= dt;
          if (e.stateTimer <= 0) {
            e.stateTimer = 1.4;
            e.state = "attack";
            if (state.invulnTimer <= 0) {
              if (hitPlayer(state, VW.VOID_GOLEM_DAMAGE)) playerDied = true;
              state.screenShake = VW.SHAKE_INTENSITY * 2;
            }
          }
        }
        break;
      }

      case "phase_stalker": {
        // Fast, erratic movement, teleports periodically
        e.state = "approach";
        // Slight erratic offset
        const offset = Math.sin(state.time * 8 + e.x) * 0.4;
        const erraticAngle = dToPlayer > 0 ? Math.atan2(dy, dx) + offset : 0;
        e.x += Math.cos(erraticAngle) * e.speed * dt;
        e.y += Math.sin(erraticAngle) * e.speed * dt;

        // Teleport periodically
        e.teleportTimer -= dt;
        if (e.teleportTimer <= 0) {
          e.teleportTimer = VW.PHASE_STALKER_TELEPORT_INTERVAL;
          // Teleport near player
          const tAngle = Math.random() * Math.PI * 2;
          const tDist = 60 + Math.random() * 60;
          e.x = clamp(state.playerX + Math.cos(tAngle) * tDist, e.radius, state.arenaW - e.radius);
          e.y = clamp(state.playerY + Math.sin(tAngle) * tDist, e.radius, state.arenaH - e.radius);
          spawnParticles(state, e.x, e.y, 8, {
            color: VW.COLOR_VOID,
            speedMin: 20, speedMax: 60, lifeMin: 0.1, lifeMax: 0.25, sizeMin: 1, sizeMax: 3,
            spread: Math.PI * 2,
          });
        }

        // Contact damage
        if (dToPlayer < e.radius + state.playerRadius + 4) {
          e.stateTimer -= dt;
          if (e.stateTimer <= 0) {
            e.stateTimer = 0.6;
            e.state = "attack";
            if (state.invulnTimer <= 0) {
              if (hitPlayer(state, VW.PHASE_STALKER_DAMAGE)) playerDied = true;
            }
          }
        }
        break;
      }

      case "warlock": {
        // Keep distance, summon cultists
        if (dToPlayer < VW.WARLOCK_KEEP_DIST) {
          if (dToPlayer > 0) {
            e.x -= (dx / dToPlayer) * e.speed * dt;
            e.y -= (dy / dToPlayer) * e.speed * dt;
          }
        }

        e.summonTimer -= dt;
        if (e.summonTimer <= 0 && state.enemies.filter(e2 => e2.alive).length < VW.ENEMY_MAX - 2) {
          e.summonTimer = VW.WARLOCK_SUMMON_INTERVAL;
          e.state = "attack";

          // Summon 2 cultists nearby
          for (let s = 0; s < 2; s++) {
            const sAngle = Math.random() * Math.PI * 2;
            const sDist = 25 + Math.random() * 25;
            spawnEnemy(state, "cultist",
              clamp(e.x + Math.cos(sAngle) * sDist, 10, state.arenaW - 10),
              clamp(e.y + Math.sin(sAngle) * sDist, 10, state.arenaH - 10),
            );
          }

          spawnFloatText(state, e.x, e.y - 18, "SUMMON!", 0xaa44ff, 0.85);
        } else {
          e.state = "approach";
        }
        break;
      }
    }

    // Clamp enemies to arena
    e.x = clamp(e.x, e.radius, state.arenaW - e.radius);
    e.y = clamp(e.y, e.radius, state.arenaH - e.radius);
  }

  return playerDied;
}

// ---------------------------------------------------------------------------
// Portal update
// ---------------------------------------------------------------------------

export function updatePortals(state: VWState, dt: number): void {
  for (let i = state.portals.length - 1; i >= 0; i--) {
    const p = state.portals[i];
    p.life -= dt;
    if (p.life <= 0) {
      state.portals.splice(i, 1);
      continue;
    }

    // Ambient particles around active portals
    if (Math.random() < dt * 10) {
      const a = Math.random() * Math.PI * 2;
      const r = p.radius * (0.7 + Math.random() * 0.4);
      spawnParticles(state, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1, {
        color: Math.random() < 0.5 ? VW.COLOR_PORTAL : VW.COLOR_VOID_BRIGHT,
        speedMin: 5, speedMax: 25, lifeMin: 0.2, lifeMax: 0.5, sizeMin: 1, sizeMax: 3,
        spread: Math.PI * 2,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Boss AI update
// ---------------------------------------------------------------------------

export function updateBoss(state: VWState, dt: number): boolean {
  const boss = state.boss;
  if (!boss || !boss.alive) return false;

  if (boss.flashTimer > 0) boss.flashTimer = Math.max(0, boss.flashTimer - dt);

  const dx = state.playerX - boss.x;
  const dy = state.playerY - boss.y;
  const dToPlayer = Math.sqrt(dx * dx + dy * dy);

  boss.phaseTimer -= dt;
  boss.attackTimer -= dt;

  switch (boss.kind) {
    case "void_lord": {
      // Phase 1 (HP > 60%): charges, basic attacks
      // Phase 2 (HP > 30%): faster charges, summons cultists
      // Phase 3 (HP <= 30%): shadow slam + summons
      const hpFrac = boss.hp / boss.maxHp;
      const bossPhase = hpFrac > 0.6 ? 1 : hpFrac > 0.3 ? 2 : 3;
      boss.phase = bossPhase;

      const speed = boss.speed * (bossPhase === 3 ? 1.5 : bossPhase === 2 ? 1.2 : 1.0);

      if (dToPlayer > 0) {
        boss.x += (dx / dToPlayer) * speed * dt;
        boss.y += (dy / dToPlayer) * speed * dt;
      }

      // Contact damage
      if (dToPlayer < boss.radius + state.playerRadius + 8 && state.invulnTimer <= 0) {
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 0.8;
          if (hitPlayer(state, 2)) return true;
          state.screenShake = VW.SHAKE_INTENSITY * 2;
        }
      }

      // Shadow slam AoE
      if (boss.phaseTimer <= 0) {
        const interval = bossPhase === 3 ? 3.5 : bossPhase === 2 ? 5.0 : 7.0;
        boss.phaseTimer = interval;

        // Slam effect
        spawnShockwave(state, boss.x, boss.y, 90, VW.COLOR_VOID_BRIGHT);
        spawnParticles(state, boss.x, boss.y, 20, {
          color: VW.COLOR_VOID_BRIGHT,
          speedMin: 50, speedMax: 180, lifeMin: 0.2, lifeMax: 0.5, sizeMin: 2, sizeMax: 6,
          spread: Math.PI * 2,
        });

        const slamRadius = 90;
        if (dToPlayer < slamRadius && state.invulnTimer <= 0) {
          if (hitPlayer(state, 1)) return true;
        }

        // Phase 2+: summon cultists
        if (bossPhase >= 2 && state.enemies.filter(e => e.alive).length < VW.ENEMY_MAX - 2) {
          for (let s = 0; s < (bossPhase === 3 ? 4 : 2); s++) {
            const sA = Math.random() * Math.PI * 2;
            spawnEnemy(state, "cultist",
              clamp(boss.x + Math.cos(sA) * 60, 12, state.arenaW - 12),
              clamp(boss.y + Math.sin(sA) * 60, 12, state.arenaH - 12),
            );
          }
          spawnFloatText(state, boss.x, boss.y - 40, "RISE!", 0x8822aa, 1.0);
        }
      }
      break;
    }

    case "portal_beast": {
      // Fires projectiles from portals, creates void zones
      const hpFrac = boss.hp / boss.maxHp;
      boss.phase = hpFrac > 0.5 ? 1 : 2;

      // Slow wander
      boss.phaseTimer -= 0; // already decremented above
      if (dToPlayer > 80 && dToPlayer > 0) {
        boss.x += (dx / dToPlayer) * boss.speed * dt;
        boss.y += (dy / dToPlayer) * boss.speed * dt;
      }

      if (boss.attackTimer <= 0) {
        const attackInterval = boss.phase === 2 ? 1.0 : 1.8;
        boss.attackTimer = attackInterval;

        // Fire from boss position
        const numShots = boss.phase === 2 ? 5 : 3;
        for (let s = 0; s < numShots; s++) {
          const a = (Math.PI * 2 / numShots) * s;
          state.projectiles.push({
            x: boss.x, y: boss.y,
            vx: Math.cos(a) * 130, vy: Math.sin(a) * 130,
            damage: 1, radius: 5, life: 2.5,
            color: 0xcc2255,
            fromEnemy: true,
            homing: boss.phase === 2, homingStrength: 1.5,
          });
        }

        // Also fire from each player portal
        for (const p of state.portals) {
          const pAngle = angle(p.x, p.y, state.playerX, state.playerY);
          state.projectiles.push({
            x: p.x, y: p.y,
            vx: Math.cos(pAngle) * 160, vy: Math.sin(pAngle) * 160,
            damage: 1, radius: 4, life: 2.0,
            color: 0xee3366,
            fromEnemy: true,
            homing: false, homingStrength: 0,
          });
        }

        spawnParticles(state, boss.x, boss.y, 10, {
          color: 0xee2255,
          speedMin: 30, speedMax: 100, lifeMin: 0.15, lifeMax: 0.35, sizeMin: 1.5, sizeMax: 4,
          spread: Math.PI * 2,
        });
      }

      // Contact damage
      if (dToPlayer < boss.radius + state.playerRadius + 8 && state.invulnTimer <= 0) {
        if (boss.phaseTimer <= 0) {
          boss.phaseTimer = 1.0;
          if (hitPlayer(state, 1)) return true;
        }
      }
      break;
    }

    case "shadow_king": {
      // Teleport strikes, shadow rain, summon phase stalkers
      const hpFrac = boss.hp / boss.maxHp;
      boss.phase = hpFrac > 0.6 ? 1 : hpFrac > 0.3 ? 2 : 3;

      if (boss.attackTimer <= 0) {
        const interval = boss.phase === 3 ? 1.2 : boss.phase === 2 ? 1.8 : 2.5;
        boss.attackTimer = interval;

        // Teleport strike: teleport near player and attack
        const strikeAngle = Math.random() * Math.PI * 2;
        const strikeDist = 30 + Math.random() * 30;
        boss.x = clamp(state.playerX + Math.cos(strikeAngle) * strikeDist, boss.radius, state.arenaW - boss.radius);
        boss.y = clamp(state.playerY + Math.sin(strikeAngle) * strikeDist, boss.radius, state.arenaH - boss.radius);

        spawnParticles(state, boss.x, boss.y, 16, {
          color: VW.COLOR_SHADOW,
          speedMin: 40, speedMax: 140, lifeMin: 0.15, lifeMax: 0.4, sizeMin: 2, sizeMax: 5,
          spread: Math.PI * 2,
        });

        if (dist(boss.x, boss.y, state.playerX, state.playerY) < boss.radius + state.playerRadius + 12 && state.invulnTimer <= 0) {
          if (hitPlayer(state, 1)) return true;
        }
      }

      // Shadow rain
      if (boss.phaseTimer <= 0) {
        const rainInterval = boss.phase === 3 ? 3.0 : boss.phase === 2 ? 5.0 : 8.0;
        boss.phaseTimer = rainInterval;

        // Scatter projectiles from above
        const rainCount = boss.phase === 3 ? 12 : boss.phase === 2 ? 8 : 5;
        for (let r = 0; r < rainCount; r++) {
          const rainX = randRange(20, state.arenaW - 20);
          const rainY = randRange(20, state.arenaH - 20);
          state.projectiles.push({
            x: rainX, y: rainY - 60,
            vx: randRange(-20, 20), vy: randRange(80, 140),
            damage: 1, radius: 5, life: 1.5,
            color: 0x9922cc,
            fromEnemy: true,
            homing: false, homingStrength: 0,
          });
        }
        spawnFloatText(state, boss.x, boss.y - 50, "SHADOW RAIN", 0x9922cc, 1.1);

        // Phase 2+: summon phase stalkers
        if (boss.phase >= 2 && state.enemies.filter(e => e.alive).length < VW.ENEMY_MAX - 2) {
          const summonCount = boss.phase === 3 ? 3 : 2;
          for (let s = 0; s < summonCount; s++) {
            const sA = Math.random() * Math.PI * 2;
            spawnEnemy(state, "phase_stalker",
              clamp(boss.x + Math.cos(sA) * 70, 10, state.arenaW - 10),
              clamp(boss.y + Math.sin(sA) * 70, 10, state.arenaH - 10),
            );
          }
        }
      }
      break;
    }
  }

  // Clamp boss to arena
  boss.x = clamp(boss.x, boss.radius, state.arenaW - boss.radius);
  boss.y = clamp(boss.y, boss.radius, state.arenaH - boss.radius);

  return false;
}

// ---------------------------------------------------------------------------
// Check boss hits from player projectiles (called externally if needed)
// ---------------------------------------------------------------------------

export function checkBossHits(state: VWState): void {
  if (!state.boss || !state.boss.alive) return;

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    if (proj.fromEnemy) continue;

    if (dist(proj.x, proj.y, state.boss.x, state.boss.y) < proj.radius + state.boss.radius) {
      state.boss.hp -= proj.damage;
      state.boss.flashTimer = 0.12;
      spawnParticles(state, proj.x, proj.y, 6, {
        color: 0xffd700,
        speedMin: 25, speedMax: 80, lifeMin: 0.1, lifeMax: 0.28, sizeMin: 1.5, sizeMax: 4,
        spread: Math.PI * 2,
      });
      state.projectiles.splice(i, 1);

      if (state.boss.hp <= 0) {
        state.boss.alive = false;
        spawnDeathEffect(state, state.boss.x, state.boss.y, state.boss.radius, 0xffd700);
        state.score += 500;
        state.bossWave = false;
        // Drop health + void charge
        state.pickups.push({ x: state.boss.x - 15, y: state.boss.y, kind: "health", life: 15, radius: 8 });
        state.pickups.push({ x: state.boss.x + 15, y: state.boss.y, kind: "void_charge", life: 15, radius: 8 });
        spawnFloatText(state, state.boss.x, state.boss.y - 25, "BOSS DEFEATED!", VW.COLOR_GOLD, 2.0);
        state.screenFlashColor = VW.COLOR_GOLD;
        state.screenFlashTimer = VW.FLASH_DURATION * 3;
        state.screenShake = VW.SHAKE_INTENSITY * 3;
        state.hitstopFrames = 6;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Wave progression
// ---------------------------------------------------------------------------

export function updateWave(state: VWState, dt: number): void {
  if (state.bossWave) return; // Don't spawn regulars during boss fight

  state.waveTimer -= dt;
  state.enemySpawnTimer -= dt;
  if (state.waveAnnounceTimer > 0) state.waveAnnounceTimer -= dt;
  if (state.bossAnnounceTimer > 0) state.bossAnnounceTimer -= dt;

  const wave = state.wave;
  const living = state.enemies.filter(e => e.alive).length;

  // Determine available enemy kinds for this wave
  const availableKinds: VWEnemyKind[] = ["cultist"];
  if (wave >= 2) availableKinds.push("dark_archer");
  if (wave >= 4) availableKinds.push("void_golem");
  if (wave >= 6) availableKinds.push("phase_stalker");
  if (wave >= 8) availableKinds.push("warlock");

  // Wave events
  if (state.waveAnnounceTimer <= 0 && state.waveEventActive !== "") {
    state.waveEventActive = "";
  }

  // HP scaling factor: +15% per wave
  const _hpScale = 1 + (wave - 1) * 0.15;

  // Elite chance after wave 8
  const eliteChance = wave > 8 ? 0.15 : 0;

  // Spawn enemies
  if (state.enemySpawnTimer <= 0 && living < VW.ENEMY_MAX) {
    state.enemySpawnTimer = VW.ENEMY_SPAWN_INTERVAL;

    let kind = availableKinds[Math.floor(Math.random() * availableKinds.length)];

    // Wave event overrides
    const effectiveWave = ((wave - 1) % 30) + 1;
    if (effectiveWave === 3 && state.waveEventActive === "CULTIST RUSH") kind = "cultist";
    if (effectiveWave === 5 && state.waveEventActive === "SHADOW PACK") kind = "phase_stalker";
    if (effectiveWave === 8 && state.waveEventActive === "GOLEM SIEGE") kind = "void_golem";
    if (effectiveWave === 12 && state.waveEventActive === "ARCHER RAIN") kind = "dark_archer";
    if (effectiveWave === 15 && state.waveEventActive === "DARK CONVERGENCE") {
      kind = availableKinds[Math.floor(Math.random() * availableKinds.length)];
    }

    const spawnX = Math.random() < 0.5 ? randRange(0, 30) : randRange(state.arenaW - 30, state.arenaW);
    const spawnY = Math.random() < 0.5 ? randRange(0, 30) : randRange(state.arenaH - 30, state.arenaH);
    const enemy = spawnEnemy(state, kind, spawnX, spawnY);

    // Apply HP scaling and elite
    enemy.maxHp = Math.ceil(enemy.maxHp * _hpScale);
    enemy.hp = enemy.maxHp;
    if (Math.random() < eliteChance) {
      enemy.elite = true;
      enemy.maxHp = Math.ceil(enemy.maxHp * 1.8);
      enemy.hp = enemy.maxHp;
      enemy.speed *= 1.2;
      enemy.baseSpeed = enemy.speed;
    }
    // Speed scaling after wave 10
    if (state.wave > 10) {
      enemy.speed *= 1 + (state.wave - 10) * 0.02;
      enemy.baseSpeed = enemy.speed;
    }
  }

  // Wave timer expiry — advance wave
  if (state.waveTimer <= 0 && living <= 2) {
    advanceWave(state);
    return;
  }

  // Force advance if wave timer long past (give up waiting)
  if (state.waveTimer <= -5 && living < 3) {
    advanceWave(state);
    return;
  }
}

function advanceWave(state: VWState): void {
  state.wave++;
  state.waveTimer = VW.WAVE_INTERVAL;
  state.enemySpawnTimer = 0;
  state.enemiesKilled = 0;

  const effectiveWave = ((state.wave - 1) % 30) + 1;

  // Boss waves
  if (effectiveWave === 10 || effectiveWave === 20 || effectiveWave === 30) {
    state.bossWave = true;
    state.bossAnnounceTimer = 2.5;
    // Clear existing enemies
    for (const e of state.enemies) e.alive = false;

    const bossKind: "void_lord" | "portal_beast" | "shadow_king" =
      effectiveWave === 10 ? "void_lord" :
      effectiveWave === 20 ? "portal_beast" : "shadow_king";

    const bossHpBase = effectiveWave === 10 ? 40 : effectiveWave === 20 ? 70 : 100;
    const hpScale = 1 + Math.floor((state.wave - 1) / 30) * 0.5;

    state.boss = {
      x: state.arenaW / 2,
      y: state.arenaH / 2,
      hp: Math.ceil(bossHpBase * hpScale),
      maxHp: Math.ceil(bossHpBase * hpScale),
      kind: bossKind,
      radius: bossKind === "void_lord" ? 28 : bossKind === "portal_beast" ? 24 : 20,
      speed: bossKind === "void_lord" ? 70 : bossKind === "portal_beast" ? 40 : 90,
      phase: 1, phaseTimer: 5.0,
      attackTimer: 1.0,
      alive: true, flashTimer: 0,
    } as VWBoss;

    spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 60, `BOSS: ${bossKind.toUpperCase().replace("_", " ")}`, 0xff2244, 1.5);
    state.screenFlashTimer = VW.FLASH_DURATION * 2;
    state.screenFlashColor = VW.COLOR_DANGER;
    return;
  }

  // Wave events
  const eventMap: Record<number, string> = {
    3: "CULTIST RUSH", 5: "SHADOW PACK", 7: "VOID PATROL",
    8: "GOLEM SIEGE", 12: "ARCHER RAIN", 14: "PHANTOM SURGE",
    15: "DARK CONVERGENCE", 17: "ELITE GUARD", 22: "VOID NEXUS",
    25: "VOID STORM", 28: "SHADOW LEGION",
  };
  if (eventMap[effectiveWave]) {
    state.waveEventActive = eventMap[effectiveWave];
    state.waveAnnounceTimer = 3.0;
    spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 40, state.waveEventActive, VW.COLOR_VOID_BRIGHT, 1.3);

    // VOID STORM event: activate storm
    if (effectiveWave === 25 && !state.stormActive) {
      state.stormActive = true;
      state.stormTimer = VW.STORM_DURATION * 2;
      for (const p of state.portals) { p.stormBoltTimer = 0; }
    }
  }

  // Arena hazards every 4 waves
  if (state.wave > 0 && state.wave % 4 === 0 && !state.bossWave) {
    const hazardKinds: Array<"void_rift" | "shadow_pool" | "energy_well"> = ["void_rift", "shadow_pool", "energy_well"];
    const count = 1 + Math.floor(state.wave / 10);
    for (let hi = 0; hi < Math.min(3, count); hi++) {
      state.arenaHazards.push({
        x: randRange(60, state.arenaW - 60),
        y: randRange(60, state.arenaH - 60),
        kind: hazardKinds[Math.floor(Math.random() * hazardKinds.length)],
        radius: 35 + Math.random() * 15,
        life: VW.WAVE_INTERVAL, maxLife: VW.WAVE_INTERVAL,
        active: true,
        activeTimer: 2.0 + Math.random() * 2,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Kill / damage enemy
// ---------------------------------------------------------------------------

export function killEnemy(state: VWState, e: VWEnemy): void {
  e.alive = false;
  state.enemiesKilled++;
  state.totalKills++;

  // Score + combo
  const baseScore = getEnemyBaseScore(e.kind);
  const eliteBonus = e.elite ? 2 : 1;
  state.comboCount++;
  state.comboTimer = 2.5;
  if (state.comboCount > state.bestCombo) state.bestCombo = state.comboCount;
  const comboMult = 1 + Math.floor(state.comboCount / 5) * 0.5;
  const finalScore = Math.round(baseScore * eliteBonus * comboMult);
  state.score += finalScore;

  if (state.comboCount >= 5) {
    spawnFloatText(state, e.x, e.y - 20, `x${state.comboCount} COMBO!`, 0xffdd44, 1.0);
  }

  // Portal proximity bonus — enemies killed near a portal give extra score
  let nearPortal = false;
  for (const portal of state.portals) {
    if (dist(e.x, e.y, portal.x, portal.y) < portal.radius * 1.5) {
      nearPortal = true;
      break;
    }
  }
  if (nearPortal) {
    const portalBonus = Math.ceil(finalScore * 0.5);
    state.score += portalBonus;
    spawnFloatText(state, e.x, e.y - 25, `PORTAL +${portalBonus}`, VW.COLOR_PORTAL, 0.9);
  }

  // Kill streak
  state.killStreakCount++;
  state.killStreakTimer = 2.0;
  if (state.killStreakCount === 2) {
    spawnFloatText(state, state.playerX, state.playerY - 30, "DOUBLE KILL!", 0xffaa00, 1.2);
    state.score += 10;
  } else if (state.killStreakCount === 3) {
    spawnFloatText(state, state.playerX, state.playerY - 30, "TRIPLE KILL!", 0xff6600, 1.4);
    state.score += 25;
  } else if (state.killStreakCount === 4) {
    spawnFloatText(state, state.playerX, state.playerY - 30, "MEGA KILL!", 0xff2200, 1.6);
    state.score += 50;
  } else if (state.killStreakCount >= 5) {
    spawnFloatText(state, state.playerX, state.playerY - 30, "UNSTOPPABLE!", VW.COLOR_GOLD, 2.0);
    state.score += 100;
    state.screenFlashColor = VW.COLOR_GOLD;
    state.screenFlashTimer = VW.FLASH_DURATION;
  }

  // Combo milestones
  if (state.comboCount === 10) {
    spawnFloatText(state, state.playerX, state.playerY - 40, "10x COMBO!", 0xffaa00, 1.5);
    state.score += 50;
  } else if (state.comboCount === 20) {
    spawnFloatText(state, state.playerX, state.playerY - 40, "20x COMBO!", 0xff6600, 1.8);
    state.score += 150;
    state.screenFlashColor = 0xff6600;
    state.screenFlashTimer = VW.FLASH_DURATION;
  } else if (state.comboCount === 50) {
    spawnFloatText(state, state.playerX, state.playerY - 40, "50x COMBO!!", VW.COLOR_GOLD, 2.5);
    state.score += 500;
    state.screenFlashColor = VW.COLOR_GOLD;
    state.screenFlashTimer = VW.FLASH_DURATION * 2;
    state.screenShake = VW.SHAKE_INTENSITY * 2;
  }

  // Death effect
  spawnDeathEffect(state, e.x, e.y, e.radius, getEnemyColor(e.kind));

  // Hitstop for impact feel
  state.hitstopFrames = 2;
  if (e.elite) {
    state.hitstopFrames = 4;
    state.screenShake = Math.max(state.screenShake, VW.SHAKE_INTENSITY * 1.5);
  }

  // Blood stain
  state.bloodStains.push({ x: e.x, y: e.y, size: e.radius * 1.3 + Math.random() * 3, alpha: 0.5 + Math.random() * 0.3 });

  // Occasional drop
  const dropRoll = Math.random();
  if (dropRoll < 0.18) {
    state.pickups.push({ x: e.x, y: e.y, kind: "health", life: 10, radius: 7 });
  } else if (dropRoll < 0.30) {
    state.pickups.push({ x: e.x, y: e.y, kind: "void_charge", life: 10, radius: 7 });
  } else if (dropRoll < 0.42) {
    state.pickups.push({ x: e.x, y: e.y, kind: "score_orb", life: 8, radius: 6 });
  }
}

export function damageEnemy(state: VWState, e: VWEnemy, dmg: number): void {
  if (!e.alive) return;
  e.hp -= dmg;
  e.flashTimer = 0.1;
  spawnFloatText(state, e.x, e.y - e.radius - 5, String(Math.ceil(dmg)), 0xffffff, 0.7);
  if (e.hp <= 0) killEnemy(state, e);
}

// ---------------------------------------------------------------------------
// Hit player
// ---------------------------------------------------------------------------

export function hitPlayer(state: VWState, dmg: number): boolean {
  if (state.invulnTimer > 0) return false;
  state.playerHP -= dmg;
  state.invulnTimer = VW.INVULN_DURATION;
  state.screenShake = VW.SHAKE_INTENSITY;

  // Reset combo on taking damage
  state.comboCount = 0;
  state.comboTimer = 0;
  state.screenFlashTimer = VW.FLASH_DURATION;
  state.screenFlashColor = VW.COLOR_DANGER;

  spawnParticles(state, state.playerX, state.playerY, 12, {
    color: 0xff2244,
    speedMin: 30, speedMax: 100, lifeMin: 0.15, lifeMax: 0.4, sizeMin: 1.5, sizeMax: 4,
    spread: Math.PI * 2,
  });

  if (state.playerHP <= 0) {
    state.playerHP = 0;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

export function updateTimers(state: VWState, dt: number): void {
  state.time += dt;
  state.score += VW.SCORE_PER_SECOND * dt;

  if (state.screenShake > 0) state.screenShake = Math.max(0, state.screenShake - dt * 14);
  if (state.screenFlashTimer > 0) state.screenFlashTimer = Math.max(0, state.screenFlashTimer - dt);
  if (state.hitstopFrames > 0) state.hitstopFrames--;

  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.comboCount = 0;
  }

  if (state.killStreakTimer > 0) {
    state.killStreakTimer -= dt;
    if (state.killStreakTimer <= 0) state.killStreakCount = 0;
  }

  if (state.synergyTimer > 0) {
    state.synergyTimer -= dt;
    if (state.synergyTimer <= 0) {
      state.synergyBonus = "";
      state.lastAbilityUsed = "";
    }
  }
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

export function updateParticles(state: VWState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) { state.particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.93;
    p.vy *= 0.93;
  }
}

// ---------------------------------------------------------------------------
// Float texts
// ---------------------------------------------------------------------------

export function updateFloatTexts(state: VWState, dt: number): void {
  for (let i = state.floatTexts.length - 1; i >= 0; i--) {
    const ft = state.floatTexts[i];
    ft.life -= dt;
    if (ft.life <= 0) { state.floatTexts.splice(i, 1); continue; }
    ft.y -= 28 * dt;
  }
}

// ---------------------------------------------------------------------------
// Shockwaves
// ---------------------------------------------------------------------------

export function updateShockwaves(state: VWState, dt: number): void {
  for (let i = state.shockwaves.length - 1; i >= 0; i--) {
    const sw = state.shockwaves[i];
    sw.life -= dt;
    if (sw.life <= 0) { state.shockwaves.splice(i, 1); continue; }
    const progress = 1 - sw.life / sw.maxLife;
    sw.radius = sw.maxRadius * progress;
  }
}

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------

export function updatePickups(state: VWState, dt: number): void {
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pk = state.pickups[i];
    pk.life -= dt;
    if (pk.life <= 0) { state.pickups.splice(i, 1); continue; }

    // Magnetic attraction
    const attractDist = 70;
    const pDist = dist(pk.x, pk.y, state.playerX, state.playerY);
    if (pDist < attractDist && pDist > 0) {
      const attractSpeed = 100 * (1 - pDist / attractDist);
      const attractAngle = angle(pk.x, pk.y, state.playerX, state.playerY);
      pk.x += Math.cos(attractAngle) * attractSpeed * dt;
      pk.y += Math.sin(attractAngle) * attractSpeed * dt;
    }

    if (dist(pk.x, pk.y, state.playerX, state.playerY) < pk.radius + state.playerRadius) {
      switch (pk.kind) {
        case "health":
          state.playerHP = Math.min(state.maxHP, state.playerHP + 1);
          spawnFloatText(state, pk.x, pk.y - 12, "+1 HP", 0x44cc44, 1.0);
          spawnParticles(state, pk.x, pk.y, 6, {
            color: 0x44cc44, speedMin: 25, speedMax: 60,
            lifeMin: 0.15, lifeMax: 0.3, sizeMin: 1.5, sizeMax: 3, spread: Math.PI * 2,
          });
          break;
        case "void_charge":
          // Reduce all ability cooldowns by 3 seconds
          state.dashCooldown = Math.max(0, state.dashCooldown - 3);
          state.pulseCooldown = Math.max(0, state.pulseCooldown - 3);
          state.stormCooldown = Math.max(0, state.stormCooldown - 5);
          spawnFloatText(state, pk.x, pk.y - 12, "VOID CHARGE!", VW.COLOR_VOID_BRIGHT, 1.0);
          spawnParticles(state, pk.x, pk.y, 8, {
            color: VW.COLOR_VOID_BRIGHT, speedMin: 30, speedMax: 80,
            lifeMin: 0.15, lifeMax: 0.35, sizeMin: 2, sizeMax: 4, spread: Math.PI * 2,
          });
          break;
        case "score_orb":
          state.score += 25;
          spawnFloatText(state, pk.x, pk.y - 12, "+25", VW.COLOR_GOLD, 0.9);
          break;
      }
      state.pickups.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Spawn helpers
// ---------------------------------------------------------------------------

function spawnEnemy(state: VWState, kind: VWEnemyKind, x: number, y: number): VWEnemy {
  const id = `e${state.nextEnemyId++}`;

  const defaults: Record<VWEnemyKind, { hp: number; speed: number; radius: number }> = {
    cultist:       { hp: VW.CULTIST_HP,       speed: VW.CULTIST_SPEED,       radius: VW.CULTIST_RADIUS },
    dark_archer:   { hp: VW.DARK_ARCHER_HP,   speed: VW.DARK_ARCHER_SPEED,   radius: VW.DARK_ARCHER_RADIUS },
    void_golem:    { hp: VW.VOID_GOLEM_HP,    speed: VW.VOID_GOLEM_SPEED,    radius: VW.VOID_GOLEM_RADIUS },
    phase_stalker: { hp: VW.PHASE_STALKER_HP, speed: VW.PHASE_STALKER_SPEED, radius: VW.PHASE_STALKER_RADIUS },
    warlock:       { hp: VW.WARLOCK_HP,       speed: VW.WARLOCK_SPEED,       radius: VW.WARLOCK_RADIUS },
  };

  const d = defaults[kind];
  const enemy: VWEnemy = {
    eid: id,
    x, y,
    hp: d.hp, maxHp: d.hp,
    kind, alive: true,
    radius: d.radius,
    speed: d.speed, baseSpeed: d.speed,
    flashTimer: 0,
    state: "approach",
    stateTimer: 0,
    stunTimer: 0,
    spawnTimer: 0.25,
    elite: false,
    fireTimer: kind === "dark_archer" ? VW.DARK_ARCHER_FIRE_INTERVAL * 0.5 : 0,
    summonTimer: kind === "warlock" ? VW.WARLOCK_SUMMON_INTERVAL : 0,
    teleportTimer: kind === "phase_stalker" ? VW.PHASE_STALKER_TELEPORT_INTERVAL : 0,
  };

  state.enemies.push(enemy);
  return enemy;
}

export function spawnParticles(
  state: VWState,
  x: number, y: number,
  count: number,
  opts: {
    color: number;
    speedMin: number; speedMax: number;
    lifeMin: number; lifeMax: number;
    sizeMin: number; sizeMax: number;
    spread: number;
    baseAngle?: number;
  }
): void {
  const base = opts.baseAngle ?? 0;
  for (let i = 0; i < count; i++) {
    const a = base + randRange(-opts.spread / 2, opts.spread / 2);
    const speed = randRange(opts.speedMin, opts.speedMax);
    const life = randRange(opts.lifeMin, opts.lifeMax);
    state.particles.push({
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life, maxLife: life,
      color: opts.color,
      size: randRange(opts.sizeMin, opts.sizeMax),
    });
  }
}

export function spawnFloatText(
  state: VWState,
  x: number, y: number,
  text: string,
  color: number,
  scale: number
): void {
  state.floatTexts.push({ x, y, text, color, life: 1.2, maxLife: 1.2, scale });
}

export function spawnShockwave(
  state: VWState,
  x: number, y: number,
  maxRadius: number,
  color: number
): void {
  state.shockwaves.push({ x, y, radius: 0, maxRadius, life: 0.4, maxLife: 0.4, color });
}

// ---------------------------------------------------------------------------
// Arena Hazards
// ---------------------------------------------------------------------------

export function updateHazards(state: VWState, dt: number): boolean {
  let playerHit = false;

  for (let i = state.arenaHazards.length - 1; i >= 0; i--) {
    const h = state.arenaHazards[i];
    h.life -= dt;
    if (h.life <= 0) { state.arenaHazards.splice(i, 1); continue; }

    h.activeTimer -= dt;
    if (h.activeTimer <= 0) {
      h.active = !h.active;
      h.activeTimer = h.kind === "void_rift" ? 2.0 : h.kind === "shadow_pool" ? 3.0 : 2.5;
    }

    if (!h.active) continue;

    switch (h.kind) {
      case "void_rift": {
        const pd = dist(h.x, h.y, state.playerX, state.playerY);
        if (pd < h.radius + state.playerRadius && state.invulnTimer <= 0 && !state.dashing) {
          if (hitPlayer(state, 1)) playerHit = true;
        }
        for (const e of state.enemies) {
          if (!e.alive || e.spawnTimer > 0 || e.kind === "void_golem") continue;
          if (dist(h.x, h.y, e.x, e.y) < h.radius + e.radius) {
            damageEnemy(state, e, 0.4 * dt);
          }
        }
        break;
      }
      case "shadow_pool": {
        for (const e of state.enemies) {
          if (!e.alive) continue;
          if (dist(h.x, h.y, e.x, e.y) < h.radius + e.radius) {
            e.speed = e.baseSpeed * 0.4;
          }
        }
        break;
      }
      case "energy_well": {
        const pd = dist(h.x, h.y, state.playerX, state.playerY);
        if (pd < h.radius) {
          state.playerHP = Math.min(state.maxHP, state.playerHP + 0.4 * dt);
        }
        for (const e of state.enemies) {
          if (!e.alive) continue;
          if (dist(h.x, h.y, e.x, e.y) < h.radius + e.radius) {
            damageEnemy(state, e, 0.4 * dt);
          }
        }
        break;
      }
    }
  }

  return playerHit;
}

export function spawnDeathEffect(
  state: VWState,
  x: number, y: number,
  radius: number,
  color: number
): void {
  spawnParticles(state, x, y, Math.ceil(radius * 1.5), {
    color,
    speedMin: 40, speedMax: 160,
    lifeMin: 0.2, lifeMax: 0.6,
    sizeMin: 2, sizeMax: 6,
    spread: Math.PI * 2,
  });
  spawnShockwave(state, x, y, radius * 2.5, color);

  // Blood stain
  state.bloodStains.push({ x, y, size: radius * 1.8, alpha: 0.45 });
  if (state.bloodStains.length > 40) state.bloodStains.shift();
}

export function getEnemyColor(kind: VWEnemyKind): number {
  switch (kind) {
    case "cultist":       return 0x7733bb;
    case "dark_archer":  return 0x4433aa;
    case "void_golem":   return 0x334488;
    case "phase_stalker":return 0x992299;
    case "warlock":      return 0x551188;
  }
}

function getEnemyBaseScore(kind: VWEnemyKind): number {
  switch (kind) {
    case "cultist":       return VW.CULTIST_SCORE;
    case "dark_archer":  return VW.DARK_ARCHER_SCORE;
    case "void_golem":   return VW.VOID_GOLEM_SCORE;
    case "phase_stalker":return VW.PHASE_STALKER_SCORE;
    case "warlock":      return VW.WARLOCK_SCORE;
  }
}
