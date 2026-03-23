// Camelot Ascent – Physics / Simulation System
// Pure logic – no rendering imports.

import type { AscentState, Platform } from "../types";
import { PlatformType, EnemyType, PickupType, AscentPhase } from "../types";
import { ASCENT_BALANCE as B } from "../config/AscentBalance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ---------------------------------------------------------------------------
// Main update
// ---------------------------------------------------------------------------

export function updatePhysics(state: AscentState, dt: number): void {
  if (state.phase !== AscentPhase.PLAYING) return;

  state.time += dt;
  const { player } = state;

  // --- Timers ---------------------------------------------------------
  if (player.invincibleTimer > 0) player.invincibleTimer -= dt;
  if (player.speedBoostTimer > 0) player.speedBoostTimer -= dt;
  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.dashTimer > 0) player.dashTimer -= dt;
  if (player.speedBoostTimer <= 0 && player.shieldActive) {
    // shield handled separately via shieldActive flag
  }

  // --- Gravity --------------------------------------------------------
  player.vy += B.GRAVITY * dt;
  if (player.vy > B.MAX_FALL_SPEED) player.vy = B.MAX_FALL_SPEED;

  // --- Movement -------------------------------------------------------
  const speedMult = player.speedBoostTimer > 0 ? B.SPEED_BOOST_MULT : 1;
  player.x += player.vx * speedMult * dt;
  player.y += player.vy * dt;

  // --- Horizontal wrapping --------------------------------------------
  if (player.x + player.width < 0) {
    player.x = B.WORLD_WIDTH;
  } else if (player.x > B.WORLD_WIDTH) {
    player.x = -player.width;
  }

  // --- Update facing direction ----------------------------------------
  if (player.vx > 0) player.facing = 1;
  else if (player.vx < 0) player.facing = -1;

  // --- Wall-slide detection -------------------------------------------
  player.wallSliding = false;
  if (!player.grounded && player.vy > 0) {
    const touchingLeftWall = player.x <= 0;
    const touchingRightWall = player.x + player.width >= B.WORLD_WIDTH;
    if (touchingLeftWall || touchingRightWall) {
      player.wallSliding = true;
      // Reduce fall speed for wall-slide
      player.vy = Math.min(player.vy, B.MAX_FALL_SPEED * 0.3);
    }
  }

  // --- Moving platforms -----------------------------------------------
  updateMovingPlatforms(state);

  // --- Platform collision (only when falling) -------------------------
  player.grounded = false;
  if (player.vy > 0) {
    for (const plat of state.platforms) {
      if (!plat.active) continue;
      if (collidesWithPlatformTop(player.x, player.y, player.width, player.height, player.vy * dt, plat)) {
        handlePlatformLand(state, plat);
        break; // land on first platform hit
      }
    }
  }

  // --- Track highest point & floor ------------------------------------
  if (player.y < player.highestY) {
    player.highestY = player.y;
  }
  const newFloor = Math.floor(-player.highestY / (B.PLATFORM_SPACING_Y * 10));
  if (newFloor > player.floor) {
    player.score += (newFloor - player.floor) * B.SCORE_PER_FLOOR;
    player.floor = newFloor;
    state.floor = newFloor;
  }

  // --- Camera (only moves up, i.e. cameraY decreases) ----------------
  const targetCameraY = player.highestY - 200; // keep player ~200px from top
  if (targetCameraY < state.cameraY) {
    // Smooth lerp
    state.cameraY += (targetCameraY - state.cameraY) * Math.min(1, 5 * dt);
  }

  // --- Enemies --------------------------------------------------------
  updateEnemies(state, dt);

  // --- Projectiles ----------------------------------------------------
  updateProjectiles(state, dt);

  // --- Player-enemy collision -----------------------------------------
  checkEnemyCollisions(state);

  // --- Boss behavior --------------------------------------------------
  if (state.bossActive && state.bossHp > 0) {
    // Boss attacks: spawn projectiles periodically
    // Use state.time for timing
    if (Math.floor(state.time * 2) % 4 === 0 && state.projectiles.length < 8) {
      // Boss fires from top of screen at random x
      const bossX = 100 + Math.random() * (B.WORLD_WIDTH - 200);
      const bossY = state.cameraY + 50; // top of visible area
      state.projectiles.push({
        x: bossX,
        y: bossY,
        vx: (state.player.x - bossX) * 0.5, // aim at player
        vy: 150,
        fromPlayer: false,
        damage: 1,
        lifetime: 4,
      });
    }
  }

  // --- Boss damage: player reaches boss height area ------------------
  if (state.bossActive && state.bossHp > 0) {
    const bossY = state.cameraY + 50;
    if (player.y < bossY + 30 && player.vy < 0 && player.y > bossY - 30) {
      // Player reached boss — deal 1 damage per contact, bounce back
      state.bossHp -= 1;
      player.vy = B.JUMP_VELOCITY * 0.7; // bounce down
      player.invincibleTimer = 0.5;
      if (state.bossHp <= 0) {
        state.bossActive = false;
        state.player.score += B.SCORE_PER_BOSS_KILL;
      }
    }
  }

  // --- Player-pickup collision ----------------------------------------
  checkPickupCollisions(state);

  // --- Death check (fell below camera) --------------------------------
  if (player.y > state.cameraY + 800) {
    player.hp = 0;
  }
  if (player.hp <= 0) {
    state.phase = AscentPhase.DEAD;
    state.deathCount += 1;
  }
}

// ---------------------------------------------------------------------------
// Platform collision
// ---------------------------------------------------------------------------

function collidesWithPlatformTop(
  px: number, py: number, pw: number, ph: number,
  fallDist: number,
  plat: Platform,
): boolean {
  const playerBottom = py + ph;
  const playerPrevBottom = playerBottom - fallDist;

  // Player's feet must cross the platform top this frame
  if (playerPrevBottom > plat.y) return false;
  if (playerBottom < plat.y) return false;

  // Horizontal overlap
  return px + pw > plat.x && px < plat.x + plat.width;
}

function handlePlatformLand(state: AscentState, plat: Platform): void {
  const { player } = state;

  switch (plat.type) {
    case PlatformType.SPIKE:
      applyDamage(state, 1);
      // Small bounce away
      player.vy = B.JUMP_VELOCITY * 0.4;
      return;

    case PlatformType.SPRING:
      player.y = plat.y - player.height;
      player.vy = B.SPRING_BOOST;
      player.grounded = false;
      player.jumpsLeft = player.maxJumps;
      return;

    case PlatformType.CRUMBLING:
      if (plat.crumbleTimer <= 0) {
        plat.crumbleTimer = B.CRUMBLE_DELAY;
      }
      break;

    default:
      break;
  }

  // Normal landing
  player.y = plat.y - player.height;
  player.vy = 0;
  player.grounded = true;
  player.jumpsLeft = player.maxJumps;
}

// ---------------------------------------------------------------------------
// Moving platforms
// ---------------------------------------------------------------------------

function updateMovingPlatforms(state: AscentState): void {
  for (const plat of state.platforms) {
    if (!plat.active) continue;

    if (plat.type === PlatformType.MOVING) {
      plat.x += Math.sin(state.time * plat.moveSpeed + plat.movePhase) * plat.moveRange * 0.02;
    }

    // Crumble countdown
    if (plat.type === PlatformType.CRUMBLING && plat.crumbleTimer > 0) {
      plat.crumbleTimer -= 1 / 60; // approximate; caller should pass dt but we use time-based
      if (plat.crumbleTimer <= 0) {
        plat.active = false;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------

function updateEnemies(state: AscentState, dt: number): void {
  const zoneIdx = Math.min(Math.floor(state.floor / B.ZONE_FLOORS), B.ZONES.length - 1);
  const zone = B.ZONES[zoneIdx];
  const floorScale = (1 + state.floor * B.FLOOR_SPEED_SCALE) * zone.enemySpeedMult;

  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;

    switch (enemy.type) {
      case EnemyType.PATROL: {
        enemy.x += enemy.vx * floorScale * dt;
        if (enemy.x <= enemy.patrolMin) {
          enemy.x = enemy.patrolMin;
          enemy.vx = Math.abs(enemy.vx);
        } else if (enemy.x + enemy.width >= enemy.patrolMax) {
          enemy.x = enemy.patrolMax - enemy.width;
          enemy.vx = -Math.abs(enemy.vx);
        }
        break;
      }
      case EnemyType.BAT: {
        enemy.phase += dt * 2;
        enemy.x += enemy.vx * floorScale * dt;
        enemy.y += Math.sin(enemy.phase) * B.BAT_AMPLITUDE * dt;
        if (enemy.x <= enemy.patrolMin) {
          enemy.x = enemy.patrolMin;
          enemy.vx = Math.abs(enemy.vx);
        } else if (enemy.x + enemy.width >= enemy.patrolMax) {
          enemy.x = enemy.patrolMax - enemy.width;
          enemy.vx = -Math.abs(enemy.vx);
        }
        break;
      }
      case EnemyType.ARCHER: {
        // Stands still, shoots at intervals
        enemy.shootTimer -= dt;
        if (enemy.shootTimer <= 0) {
          enemy.shootTimer = B.ARCHER_SHOOT_INTERVAL * (1 / zone.enemySpeedMult);
          // Shoot arrow toward player
          const dx = state.player.x - enemy.x;
          const dir = dx >= 0 ? 1 : -1;
          state.projectiles.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height / 2,
            vx: B.ARROW_SPEED * dir,
            vy: 0,
            fromPlayer: false,
            damage: 1,
            lifetime: 4,
          });
        }
        break;
      }
      case EnemyType.BOMBER: {
        enemy.shootTimer -= dt;
        if (enemy.shootTimer <= 0) {
          enemy.shootTimer = B.BOMBER_DROP_INTERVAL * (1 / zone.enemySpeedMult);
          state.projectiles.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height,
            vx: 0,
            vy: B.BOMB_FALL_SPEED,
            fromPlayer: false,
            damage: 1,
            lifetime: 5,
          });
        }
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------

function updateProjectiles(state: AscentState, dt: number): void {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.lifetime -= dt;

    if (p.lifetime <= 0) {
      state.projectiles.splice(i, 1);
      continue;
    }

    // Hit player?
    if (
      !p.fromPlayer &&
      rectsOverlap(
        p.x - 4, p.y - 4, 8, 8,
        state.player.x, state.player.y, state.player.width, state.player.height,
      )
    ) {
      applyDamage(state, p.damage);
      state.projectiles.splice(i, 1);
      continue;
    }

    // Player projectile hits enemy?
    if (p.fromPlayer) {
      let hitEnemy = false;
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        if (rectsOverlap(
          p.x - 4, p.y - 4, 8, 8,
          enemy.x, enemy.y, enemy.width, enemy.height,
        )) {
          enemy.hp -= p.damage;
          if (enemy.hp <= 0) {
            enemy.alive = false;
            state.player.score += B.SCORE_PER_ENEMY_KILL;
          }
          hitEnemy = true;
          break;
        }
      }
      if (hitEnemy) {
        state.projectiles.splice(i, 1);
        continue;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Enemy collisions & stomp
// ---------------------------------------------------------------------------

function checkEnemyCollisions(state: AscentState): void {
  const { player } = state;

  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    if (
      !rectsOverlap(
        player.x, player.y, player.width, player.height,
        enemy.x, enemy.y, enemy.width, enemy.height,
      )
    ) {
      continue;
    }

    // Stomp check: player falling and player bottom near enemy top
    const playerBottom = player.y + player.height;
    const stompZone = enemy.y + enemy.height * 0.35;
    if (player.vy > 0 && playerBottom <= stompZone) {
      // Stomp kill
      enemy.alive = false;
      enemy.hp = 0;
      player.vy = B.JUMP_VELOCITY * 0.7; // bounce up
      player.score += B.SCORE_PER_ENEMY_KILL;
    } else {
      // Player takes damage
      applyDamage(state, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------

function checkPickupCollisions(state: AscentState): void {
  const { player } = state;

  for (const pickup of state.pickups) {
    if (pickup.collected) continue;
    if (
      !rectsOverlap(
        player.x, player.y, player.width, player.height,
        pickup.x - 10, pickup.y - 10, 20, 20,
      )
    ) {
      continue;
    }

    // Don't collect hearts at full HP (save for later)
    if (pickup.type === PickupType.HEART && player.hp >= player.maxHp) {
      continue;
    }

    pickup.collected = true;

    switch (pickup.type) {
      case PickupType.COIN:
        player.coins += 1;
        player.score += B.SCORE_PER_COIN;
        break;
      case PickupType.HEART:
        player.hp = Math.min(player.hp + B.HEART_HEAL, player.maxHp);
        break;
      case PickupType.DOUBLE_JUMP:
        player.jumpsLeft = Math.min(player.jumpsLeft + 1, player.maxJumps);
        break;
      case PickupType.SHIELD:
        player.shieldActive = true;
        player.invincibleTimer = B.SHIELD_DURATION;
        break;
      case PickupType.SPEED:
        player.speedBoostTimer = B.SPEED_BOOST_DURATION;
        break;
      case PickupType.MAGNET:
        // Magnet effect: collect all nearby coins
        for (const other of state.pickups) {
          if (!other.collected && other.type === PickupType.COIN) {
            const dx = other.x - player.x;
            const dy = other.y - player.y;
            if (dx * dx + dy * dy < 200 * 200) {
              other.collected = true;
              player.coins += 1;
              player.score += B.SCORE_PER_COIN;
            }
          }
        }
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Damage
// ---------------------------------------------------------------------------

function applyDamage(state: AscentState, amount: number): void {
  const { player } = state;
  if (player.invincibleTimer > 0) return;

  if (player.shieldActive) {
    player.shieldActive = false;
    player.invincibleTimer = B.INVINCIBLE_DURATION * 0.5;
    return;
  }

  player.hp -= amount;
  player.invincibleTimer = B.INVINCIBLE_DURATION;
}
