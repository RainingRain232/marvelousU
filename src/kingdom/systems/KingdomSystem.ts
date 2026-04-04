// ---------------------------------------------------------------------------
// Kingdom – Core Game Systems (v4)
// All mechanics: coyote, jump buffer, stomp combos, sword slash, crouch/slide,
// moving platforms, spring, bat/boar, run jump boost, multi-coin blocks,
// screen shake, coin magnetism, landing dust, wall jump, enemy awareness,
// hidden blocks, one-way platforms, boss death, checkpoints, bonus rooms
// ---------------------------------------------------------------------------

import {
  TileType, EnemyType, ItemType, PowerState, KingdomPhase, KingdomChar,
} from "../types";
import type {
  KingdomState, Player, Enemy, GameItem, Projectile, Particle, FloatingCoin, MovingPlatform,
} from "../types";
import {
  GRAVITY, MAX_FALL_SPEED, JUMP_VELOCITY, JUMP_HOLD_GRAVITY,
  MAX_WALK_SPEED, MAX_RUN_SPEED, ACCELERATION, DECELERATION,
  AIR_ACCELERATION, AIR_DECELERATION, SKID_DECELERATION, CHAR_STATS,
  GOBLIN_SPEED, DARK_KNIGHT_SPEED, SHELL_SPEED,
  SKELETON_ATTACK_INTERVAL, DRAGON_HP, DRAGON_FIRE_INTERVAL, DRAGON_SPEED,
  POTION_SPEED, STAR_SPEED, STAR_BOUNCE_VY, STAR_DURATION,
  FIREBALL_SPEED, FIREBALL_BOUNCE_VY, FIREBALL_GRAVITY, MAX_FIREBALLS,
  SCORE_COIN, SCORE_STOMP_COMBO, SCORE_FIRE_KILL,
  SCORE_BLOCK, SCORE_POTION, SCORE_STAR, SCORE_TIME,
  SCORE_FLAG_BASE, SCORE_FLAG_TOP, COINS_FOR_LIFE,
  DAMAGE_INVINCIBLE_TIME, GROW_TIME, GROUND_ROW,
  SWORD_SLASH_RANGE, SWORD_SLASH_DURATION, SWORD_SLASH_COOLDOWN, SWORD_SLASH_DAMAGE,
  COYOTE_TIME, JUMP_BUFFER_TIME, WALL_SLIDE_SPEED, WALL_JUMP_VX, WALL_JUMP_VY,
  SHAKE_BRICK_BREAK, SHAKE_BRICK_INTENSITY,
  SHAKE_STOMP, SHAKE_STOMP_INTENSITY,
  SHAKE_BOSS_HIT, SHAKE_BOSS_INTENSITY,
  SHAKE_DEATH, SHAKE_DEATH_INTENSITY,
  STOMP_COMBO_WINDOW,
  CROUCH_HEIGHT_SMALL, CROUCH_HEIGHT_BIG, SLIDE_SPEED, SLIDE_DURATION,
  SPRING_BOUNCE_VY, RUN_JUMP_BOOST,
  BAT_SPEED, BAT_SWOOP_SPEED, BAT_SWOOP_RANGE,
  BOAR_SPEED, BOAR_CHARGE_SPEED, BOAR_CHARGE_RANGE, BOAR_CHARGE_DURATION,
  WRAITH_SPEED, WRAITH_FIRE_INTERVAL, WRAITH_FIRE_SPEED, WRAITH_HP,
  HELLHOUND_SPEED, HELLHOUND_LUNGE_SPEED, HELLHOUND_LUNGE_RANGE,
  HELLHOUND_LUNGE_DURATION, HELLHOUND_LUNGE_COOLDOWN,
  MULTI_COIN_MAX_HITS,
  COIN_MAGNET_RANGE, COIN_MAGNET_SPEED,
  LANDING_DUST_MIN_VY, LANDING_SQUASH_DURATION,
  WALL_JUMP_ENABLED,
  BOSS_DEATH_DURATION,
  ENEMY_ALERT_RANGE, GOBLIN_ALERT_JUMP_CHANCE,
  HIDDEN_BLOCK_STAR_CHANCE,
} from "../config/KingdomConfig";

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface InputKeys {
  left: boolean; right: boolean;
  jump: boolean; jumpPressed: boolean;
  run: boolean; runPressed: boolean;
  fire: boolean; firePressed: boolean;
  special: boolean; specialPressed: boolean;
  down: boolean; downPressed: boolean;
}

// ---------------------------------------------------------------------------
// Tile helpers
// ---------------------------------------------------------------------------

export function isSolid(t: TileType): boolean {
  switch (t) {
    case TileType.GROUND: case TileType.GROUND_TOP:
    case TileType.BRICK: case TileType.QUESTION: case TileType.USED_QUESTION:
    case TileType.PIPE_TL: case TileType.PIPE_TR: case TileType.PIPE_BL: case TileType.PIPE_BR:
    case TileType.PIPE_ENTER_L: case TileType.PIPE_ENTER_R:
    case TileType.PIPE_WARP_L: case TileType.PIPE_WARP_R:
    case TileType.CASTLE_WALL: case TileType.CASTLE_FLOOR:
    case TileType.BRIDGE: case TileType.COIN_BLOCK: case TileType.SPRING:
      return true;
    default: return false;
  }
}
function isSolidOrOneWay(t: TileType): boolean { return isSolid(t) || t === TileType.ONE_WAY; }
function isDeadly(t: TileType): boolean { return t === TileType.LAVA; }
function getTile(s: KingdomState, r: number, c: number): TileType {
  if (r < 0 || r >= s.levelHeight || c < 0 || c >= s.levelWidth) return TileType.EMPTY;
  return s.tiles[r][c];
}
function setTile(s: KingdomState, r: number, c: number, t: TileType): void {
  if (r >= 0 && r < s.levelHeight && c >= 0 && c < s.levelWidth) s.tiles[r][c] = t;
}

// ---------------------------------------------------------------------------
// Screen shake
// ---------------------------------------------------------------------------

export function triggerShake(s: KingdomState, dur: number, intensity: number): void {
  s.screenShakeTimer = Math.max(s.screenShakeTimer, dur);
  s.screenShakeIntensity = Math.max(s.screenShakeIntensity, intensity);
}
export function updateScreenShake(s: KingdomState, dt: number): void {
  if (s.screenShakeTimer > 0) { s.screenShakeTimer -= dt; if (s.screenShakeTimer <= 0) { s.screenShakeTimer = 0; s.screenShakeIntensity = 0; } }
}

// ---------------------------------------------------------------------------
// Moving platforms
// ---------------------------------------------------------------------------

export function updateMovingPlatforms(s: KingdomState, dt: number): void {
  for (const mp of s.movingPlatforms) {
    const prevX = mp.x, prevY = mp.y;
    const dist = Math.sqrt((mp.endX - mp.startX) ** 2 + (mp.endY - mp.startY) ** 2);
    mp.progress += mp.speed * mp.direction * dt / Math.max(1, dist);
    if (mp.progress >= 1) { mp.progress = 1; mp.direction = -1; }
    if (mp.progress <= 0) { mp.progress = 0; mp.direction = 1; }
    mp.x = mp.startX + (mp.endX - mp.startX) * mp.progress;
    mp.y = mp.startY + (mp.endY - mp.startY) * mp.progress;
    const p = s.player;
    if (p.onPlatformIdx >= 0 && s.movingPlatforms[p.onPlatformIdx] === mp) {
      p.x += mp.x - prevX; p.y += mp.y - prevY;
    }
  }
}

function checkMovingPlatformLanding(s: KingdomState): void {
  const p = s.player;
  if (p.vy < 0) { p.onPlatformIdx = -1; return; }
  const pBot = p.y + p.height, pL = p.x, pR = p.x + p.width;
  for (let i = 0; i < s.movingPlatforms.length; i++) {
    const mp = s.movingPlatforms[i];
    if (pBot >= mp.y && pBot <= mp.y + 0.3 && pR > mp.x && pL < mp.x + mp.width) {
      p.y = mp.y - p.height; p.vy = 0; p.grounded = true; p.onPlatformIdx = i; p.hasDoubleJumped = false; return;
    }
  }
  if (p.onPlatformIdx >= 0) {
    const mp = s.movingPlatforms[p.onPlatformIdx];
    if (pR < mp.x || pL > mp.x + mp.width || Math.abs(pBot - mp.y) > 0.4) p.onPlatformIdx = -1;
  }
}

// ---------------------------------------------------------------------------
// Player update
// ---------------------------------------------------------------------------

export function updatePlayer(s: KingdomState, input: InputKeys, dt: number): void {
  const p = s.player;
  const stats = CHAR_STATS[s.character];

  if (p.growTimer > 0) { p.growTimer -= dt; return; }
  if (p.shrinkTimer > 0) { p.shrinkTimer -= dt; return; }

  // Timers
  if (p.invincibleTimer > 0) p.invincibleTimer -= dt;
  if (p.starTimer > 0) { p.starTimer -= dt; if (p.starTimer < 0) p.starTimer = 0; }
  if (p.dashCooldown > 0) p.dashCooldown -= dt;
  if (p.swordCooldown > 0) p.swordCooldown -= dt;
  if (p.swordTimer > 0) p.swordTimer -= dt;
  if (p.stompComboTimer > 0) { p.stompComboTimer -= dt; if (p.stompComboTimer <= 0) p.stompCombo = 0; }
  if (p.coyoteTimer > 0) p.coyoteTimer -= dt;
  if (p.jumpBufferTimer > 0) p.jumpBufferTimer -= dt;
  if (p.landingTimer > 0) p.landingTimer -= dt;

  // Track airborne vy for landing impact
  if (!p.grounded) p.lastAirVy = p.vy;

  // Dash
  if (p.dashTimer > 0) {
    p.dashTimer -= dt; p.vx = p.facing * 16 * stats.speedMul; p.vy = 0;
    moveAndCollideX(s, p, dt); updateAnimation(p, dt, true); return;
  }
  // Slide
  if (p.slideTimer > 0) {
    p.slideTimer -= dt; p.vx = p.facing * SLIDE_SPEED * (p.slideTimer / SLIDE_DURATION);
    p.crouching = true; moveAndCollideX(s, p, dt);
    p.vy += GRAVITY * stats.gravityMul * dt; if (p.vy > MAX_FALL_SPEED) p.vy = MAX_FALL_SPEED;
    moveAndCollideY(s, p, dt);
    if (p.slideTimer <= 0) { p.crouching = false; updateCrouchHeight(p); }
    updateAnimation(p, dt, true); return;
  }

  // Crouch
  if (input.down && p.grounded && !p.crouching) {
    if (Math.abs(p.vx) > 4) { p.slideTimer = SLIDE_DURATION; p.crouching = true; updateCrouchHeight(p); return; }
    else { p.crouching = true; updateCrouchHeight(p); }
  } else if (!input.down && p.crouching && p.slideTimer <= 0) {
    const standH = p.power === PowerState.SMALL ? 0.9 : 1.8;
    const headRow = Math.floor(p.y + p.height - standH);
    let canStand = true;
    for (let c = Math.floor(p.x + 0.05); c <= Math.floor(p.x + p.width - 0.06); c++) {
      if (isSolid(getTile(s, headRow, c))) { canStand = false; break; }
    }
    if (canStand) { p.crouching = false; updateCrouchHeight(p); }
  }

  // Pipe entrance (press Z on enterable pipe)
  if (input.runPressed && p.grounded) {
    const pc = Math.floor(p.x + p.width / 2);
    const pr = Math.floor(p.y + p.height);
    for (const pe of s.pipeEntrances) {
      if (Math.abs(pc - pe.col) <= 1 && Math.abs(pr - 1 - pe.row) <= 1) {
        if (pe.type === 'warp' && pe.warpWorld !== undefined && pe.warpLevel !== undefined) {
          s.warpPending = { world: pe.warpWorld, level: pe.warpLevel };
          s.scorePopups.push({ x: p.x + p.width / 2, y: p.y - 1, value: 0, timer: 2.0, text: `WARP! → W${pe.warpWorld}-${pe.warpLevel}`, color: 0x44EEFF, big: true });
          return;
        }
        enterBonusRoom(s, pe.bonusRoomIdx);
        return;
      }
    }
  }

  // Horizontal movement
  p.running = input.run;
  const maxSpeed = (input.run ? MAX_RUN_SPEED : MAX_WALK_SPEED) * stats.speedMul;
  const accel = (p.grounded ? ACCELERATION : AIR_ACCELERATION) * stats.speedMul;
  const decel = p.grounded ? DECELERATION : AIR_DECELERATION;

  p.skidding = false;
  if (p.crouching && p.grounded && p.slideTimer > 0) {
    // Sliding: decelerate naturally
    if (Math.abs(p.vx) < decel * dt) p.vx = 0; else p.vx -= Math.sign(p.vx) * decel * dt;
  } else if (p.crouching && p.grounded) {
    // Crouch-walking: slow movement allowed so player doesn't get stuck
    const crouchSpeed = maxSpeed * 0.35;
    if (input.left) { p.facing = -1; p.vx = Math.max(-crouchSpeed, p.vx - accel * 0.5 * dt); }
    else if (input.right) { p.facing = 1; p.vx = Math.min(crouchSpeed, p.vx + accel * 0.5 * dt); }
    else if (Math.abs(p.vx) < decel * dt) p.vx = 0; else p.vx -= Math.sign(p.vx) * decel * dt;
  } else if (input.left) {
    p.facing = -1;
    if (p.vx > 2 && p.grounded) { p.vx -= SKID_DECELERATION * dt; p.skidding = true; }
    else p.vx -= accel * dt;
    if (p.vx < -maxSpeed) p.vx = -maxSpeed;
  } else if (input.right) {
    p.facing = 1;
    if (p.vx < -2 && p.grounded) { p.vx += SKID_DECELERATION * dt; p.skidding = true; }
    else p.vx += accel * dt;
    if (p.vx > maxSpeed) p.vx = maxSpeed;
  } else {
    if (Math.abs(p.vx) < decel * dt) p.vx = 0; else p.vx -= Math.sign(p.vx) * decel * dt;
  }

  // Vertical: jump buffer + coyote
  if (input.jumpPressed) p.jumpBufferTimer = JUMP_BUFFER_TIME;
  const canJump = p.grounded || p.coyoteTimer > 0;
  const speedRatio = Math.min(1, Math.abs(p.vx) / MAX_RUN_SPEED);
  const jumpV = JUMP_VELOCITY * stats.jumpMul * (1 + speedRatio * RUN_JUMP_BOOST);

  let jumpedThisFrame = false;
  if (p.jumpBufferTimer > 0 && canJump && !p.crouching) {
    p.vy = jumpV; p.grounded = false; p.jumping = true;
    p.hasDoubleJumped = false; p.coyoteTimer = 0; p.jumpBufferTimer = 0; p.onPlatformIdx = -1;
    jumpedThisFrame = true;
  }

  // Wall jump
  if (WALL_JUMP_ENABLED && input.jumpPressed && p.wallSlideDir !== 0 && !p.grounded) {
    p.vx = -p.wallSlideDir * WALL_JUMP_VX;
    p.vy = WALL_JUMP_VY * stats.jumpMul;
    p.facing = -p.wallSlideDir;
    p.wallSlideDir = 0; p.coyoteTimer = 0; p.jumpBufferTimer = 0;
    jumpedThisFrame = true;
    for (let i = 0; i < 4; i++) {
      s.particles.push({ x: p.x + (p.facing < 0 ? p.width : 0), y: p.y + p.height * 0.5,
        vx: p.facing * (2 + Math.random() * 2), vy: -1 - Math.random() * 2,
        life: 0.25, maxLife: 0.25, color: 0xCCCCCC, size: 0.1 });
    }
  }

  // Double jump (Guinevere)
  if (!jumpedThisFrame && input.jumpPressed && !p.grounded && !p.hasDoubleJumped && p.coyoteTimer <= 0 && p.wallSlideDir === 0 && s.character === KingdomChar.GUINEVERE) {
    p.vy = jumpV * 0.82; p.hasDoubleJumped = true;
    for (let i = 0; i < 4; i++) {
      s.particles.push({ x: p.x + p.width / 2, y: p.y + p.height,
        vx: (Math.random() - 0.5) * 4, vy: 1 + Math.random() * 2,
        life: 0.3, maxLife: 0.3, color: 0xFFFFFF, size: 0.15 });
    }
  }

  // Gravity + hover
  const grav = (input.jump && p.vy < 0) ? JUMP_HOLD_GRAVITY * stats.gravityMul : GRAVITY * stats.gravityMul;
  if (s.character === KingdomChar.MERLIN && input.jump && !p.grounded && p.vy >= 0 && p.hoverTimer < 1.5) {
    p.hoverTimer += dt; p.vy = Math.min(p.vy, 2);
    if (Math.random() < 0.3) s.particles.push({ x: p.x + Math.random() * p.width, y: p.y + p.height, vx: (Math.random() - 0.5) * 2, vy: 1, life: 0.4, maxLife: 0.4, color: 0x8888FF, size: 0.1 });
  } else {
    if (p.grounded) p.hoverTimer = 0;
    p.vy += grav * dt;
  }

  // Wall slide
  p.wallSlideDir = 0;
  if (!p.grounded && p.vy > 0) {
    const checkCol = p.facing > 0 ? Math.floor(p.x + p.width + 0.1) : Math.floor(p.x - 0.1);
    const midRow = Math.floor(p.y + p.height * 0.5);
    if (isSolid(getTile(s, midRow, checkCol)) && ((input.left && p.facing < 0) || (input.right && p.facing > 0))) {
      p.wallSlideDir = p.facing; p.vy = Math.min(p.vy, WALL_SLIDE_SPEED);
      p.hasDoubleJumped = false; p.coyoteTimer = COYOTE_TIME;
    }
  }

  if (p.vy > MAX_FALL_SPEED) p.vy = MAX_FALL_SPEED;

  // Lancelot dash
  if (input.specialPressed && s.character === KingdomChar.LANCELOT && p.dashCooldown <= 0 && p.grounded) {
    p.dashTimer = 0.3; p.dashCooldown = 1.5; p.invincibleTimer = Math.max(p.invincibleTimer, 0.3); triggerShake(s, 0.05, 1);
  }
  // Arthur sword
  if (input.firePressed && s.character === KingdomChar.ARTHUR && p.swordCooldown <= 0) {
    p.swordTimer = SWORD_SLASH_DURATION; p.swordCooldown = SWORD_SLASH_COOLDOWN; swordSlashAttack(s);
  }

  // Move & collide
  const wasGrounded = p.grounded;
  moveAndCollideX(s, p, dt);
  moveAndCollideY(s, p, dt);
  if (!p.grounded) checkMovingPlatformLanding(s);

  // Landing impact
  if (!wasGrounded && p.grounded && p.lastAirVy > LANDING_DUST_MIN_VY) {
    p.landingTimer = LANDING_SQUASH_DURATION;
    const intensity = Math.min(1, (p.lastAirVy - LANDING_DUST_MIN_VY) / 10);
    for (let i = 0; i < Math.floor(3 + intensity * 5); i++) {
      s.particles.push({ x: p.x + Math.random() * p.width, y: p.y + p.height,
        vx: (Math.random() - 0.5) * 4 * intensity, vy: -Math.random() * 2,
        life: 0.3, maxLife: 0.3, color: 0xBBAA88, size: 0.08 + Math.random() * 0.06 });
    }
    if (intensity > 0.5) triggerShake(s, 0.03, intensity);
  }

  // Coyote time
  if (wasGrounded && !p.grounded && p.vy >= 0) p.coyoteTimer = COYOTE_TIME;

  updateCrouchHeight(p);

  // Fireball
  if (input.firePressed && p.power === PowerState.FIRE && s.character !== KingdomChar.ARTHUR) shootFireball(s);
  if (input.specialPressed && p.power === PowerState.FIRE && s.character === KingdomChar.ARTHUR) shootFireball(s);

  // Death
  if (p.y > s.levelHeight + 1) killPlayer(s);
  const feetRow = Math.floor(p.y + p.height);
  const bodyCol = Math.floor(p.x + p.width / 2);
  if (feetRow >= 0 && feetRow < s.levelHeight && bodyCol >= 0 && bodyCol < s.levelWidth) {
    if (isDeadly(s.tiles[feetRow]?.[bodyCol])) killPlayer(s);
  }

  // Spring
  if (p.grounded) {
    const springRow = Math.floor(p.y + p.height);
    for (let c = Math.floor(p.x); c <= Math.floor(p.x + p.width); c++) {
      if (getTile(s, springRow, c) === TileType.SPRING) {
        p.vy = SPRING_BOUNCE_VY * stats.jumpMul; p.grounded = false; p.onPlatformIdx = -1;
        triggerShake(s, 0.04, 1);
        for (let i = 0; i < 3; i++) s.particles.push({ x: p.x + p.width / 2, y: p.y + p.height, vx: (Math.random() - 0.5) * 3, vy: 2, life: 0.2, maxLife: 0.2, color: 0xFFDD00, size: 0.12 });
        break;
      }
    }
  }

  // Checkpoint activation
  if (p.grounded && !s.hasCheckpoint) {
    const midCol = Math.floor(p.x + p.width / 2);
    if (midCol >= Math.floor(s.levelWidth * 0.45) && midCol <= Math.floor(s.levelWidth * 0.55)) {
      s.hasCheckpoint = true; s.checkpointX = p.x; s.checkpointY = p.y;
      s.scorePopups.push({ x: p.x, y: p.y - 1, value: 0, timer: 1.5, text: "CHECKPOINT", color: 0x44FF44, big: true });
    }
  }

  updateAnimation(p, dt, input.left || input.right);
}

function updateCrouchHeight(p: Player): void {
  p.height = p.crouching
    ? (p.power === PowerState.SMALL ? CROUCH_HEIGHT_SMALL : CROUCH_HEIGHT_BIG)
    : (p.power === PowerState.SMALL ? 0.9 : 1.8);
}

function moveAndCollideX(s: KingdomState, p: Player, dt: number): void {
  p.x += p.vx * dt;
  if (p.x < 0) { p.x = 0; p.vx = 0; }
  if (s.phase !== KingdomPhase.BONUS_ROOM && p.x < s.cameraX) { p.x = s.cameraX; p.vx = Math.max(0, p.vx); }
  const top = Math.floor(p.y), bot = Math.floor(p.y + p.height - 0.01);
  const left = Math.floor(p.x), right = Math.floor(p.x + p.width - 0.01);
  for (let r = top; r <= bot; r++) {
    for (let c = left; c <= right; c++) {
      if (!isSolid(getTile(s, r, c))) continue;
      if (p.vx > 0) { p.x = c - p.width; p.vx = 0; }
      else if (p.vx < 0) { p.x = c + 1; p.vx = 0; }
    }
  }
}

function moveAndCollideY(s: KingdomState, p: Player, dt: number): void {
  p.y += p.vy * dt;
  const left = Math.floor(p.x + 0.05), right = Math.floor(p.x + p.width - 0.06);
  if (p.vy < 0) {
    const top = Math.floor(p.y);
    for (let c = left; c <= right; c++) {
      const t = getTile(s, top, c);
      if (isSolid(t)) { p.y = top + 1; p.vy = 0; hitBlock(s, top, c); }
      // Hidden block — only activated from below
      if (t === TileType.HIDDEN) { p.y = top + 1; p.vy = 0; activateHiddenBlock(s, top, c); }
    }
  } else {
    const bot = Math.floor(p.y + p.height);
    let landed = false;
    for (let c = left; c <= right; c++) {
      const t = getTile(s, bot, c);
      // One-way platform: only solid from above when falling
      if (isSolid(t) || (t === TileType.ONE_WAY && p.vy >= 0)) {
        p.y = bot - p.height; p.vy = 0; landed = true;
      }
    }
    p.grounded = landed;
    if (landed) p.hasDoubleJumped = false;
  }
}

function activateHiddenBlock(s: KingdomState, row: number, col: number): void {
  setTile(s, row, col, TileType.USED_QUESTION);
  addBlockAnim(s, col, row);
  // Hidden blocks give star or 1-up
  const hash = (col * 13 + row * 7 + s.world * 31) % 100;
  const itemType = hash < HIDDEN_BLOCK_STAR_CHANCE * 100 ? ItemType.GRAIL_STAR : ItemType.LIFE_UP;
  s.items.push({
    type: itemType, x: col, y: row - 1,
    vx: itemType === ItemType.GRAIL_STAR ? STAR_SPEED : POTION_SPEED,
    vy: itemType === ItemType.GRAIL_STAR ? STAR_BOUNCE_VY : 0,
    width: 0.8, height: 0.8, active: true, emerging: true, emergeY: row - 1,
  });
  s.scorePopups.push({ x: col, y: row - 1, value: 0, timer: 1, text: "SECRET!", color: 0xFFD700, big: true });
  triggerShake(s, 0.08, 2);
}

function updateAnimation(p: Player, dt: number, moving: boolean): void {
  p.animTimer += dt;
  const speed = Math.abs(p.vx);
  const interval = speed > 7 ? 0.06 : speed > 4 ? 0.08 : 0.12;
  if (p.animTimer > interval) {
    p.animTimer = 0;
    if (p.crouching) p.animFrame = 8;
    else if (p.skidding) p.animFrame = 6;
    else if (p.wallSlideDir !== 0) p.animFrame = 9;
    else if (moving && p.grounded) p.animFrame = (p.animFrame + 1) % 4;
    else if (!p.grounded) p.animFrame = p.vy < 0 ? 5 : 7;
    else p.animFrame = 0;
  }
}

// ---------------------------------------------------------------------------
// Bonus rooms
// ---------------------------------------------------------------------------

function enterBonusRoom(s: KingdomState, _idx: number): void {
  if (s.bonusRoom) return;
  // Save main level state
  s.bonusRoomSavedTiles = s.tiles;
  s.bonusRoomSavedCamera = s.cameraX;
  s.bonusRoomSavedCoins = s.floatingCoins;

  // Generate bonus room
  const w = 20, h = 10;
  const tiles: TileType[][] = Array.from({ length: h }, () => new Array(w).fill(TileType.EMPTY));
  // Floor and ceiling
  for (let c = 0; c < w; c++) { tiles[0][c] = TileType.BRICK; tiles[h - 1][c] = TileType.GROUND_TOP; tiles[h - 2] = tiles[h - 2] || []; }
  // Walls
  for (let r = 0; r < h; r++) { tiles[r][0] = TileType.BRICK; tiles[r][w - 1] = TileType.BRICK; }
  // Fill with coins
  const coins: FloatingCoin[] = [];
  for (let r = 2; r < h - 3; r++) {
    for (let c = 2; c < w - 2; c += 2) {
      coins.push({ x: c + 0.5, y: r + 0.5, collected: false, bobOffset: c * 0.3 + r * 0.5 });
    }
  }
  // Exit pipe on right — one tile away from wall so pipe is fully clear
  tiles[h - 3][w - 3] = TileType.PIPE_ENTER_L;
  tiles[h - 3][w - 2] = TileType.PIPE_ENTER_R;
  tiles[h - 2][w - 3] = TileType.PIPE_BL;
  tiles[h - 2][w - 2] = TileType.PIPE_BR;

  s.bonusRoom = {
    tiles, floatingCoins: coins, width: w, height: h,
    startX: 2, startY: h - 3,
    exitX: w - 3, exitY: h - 3,
    returnX: s.player.x + 3, returnY: s.player.y,
  };

  // Switch level data
  s.tiles = tiles; s.levelWidth = w; s.levelHeight = h;
  s.floatingCoins = coins;
  s.enemies = []; s.items = []; s.projectiles = [];
  s.player.x = 2; s.player.y = h - 3; s.player.vx = 0; s.player.vy = 0;
  s.cameraX = 0;
  s.phase = KingdomPhase.BONUS_ROOM;
}

export function exitBonusRoom(s: KingdomState): void {
  if (!s.bonusRoom || !s.bonusRoomSavedTiles) return;
  const ret = s.bonusRoom;
  s.tiles = s.bonusRoomSavedTiles;
  s.levelWidth = s.tiles[0].length;
  s.levelHeight = s.tiles.length;
  s.floatingCoins = s.bonusRoomSavedCoins;
  s.cameraX = s.bonusRoomSavedCamera;
  s.player.x = ret.returnX; s.player.y = ret.returnY;
  s.player.vx = 0; s.player.vy = 0;
  s.bonusRoom = null; s.bonusRoomSavedTiles = null; s.bonusRoomSavedCoins = [];
  s.phase = KingdomPhase.PLAYING;
}

export function checkBonusRoomExit(s: KingdomState): boolean {
  if (!s.bonusRoom) return false;
  const p = s.player;
  const pfeet = p.y + p.height;
  if (p.x >= s.bonusRoom.exitX - 0.5 && p.x <= s.bonusRoom.exitX + 1.5 &&
      Math.abs(pfeet - s.bonusRoom.exitY) < 1.5) {
    exitBonusRoom(s);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Sword slash
// ---------------------------------------------------------------------------

function swordSlashAttack(s: KingdomState): void {
  const p = s.player;
  const slashX = p.x + (p.facing > 0 ? p.width : -SWORD_SLASH_RANGE);
  const slashY = p.y, slashW = SWORD_SLASH_RANGE, slashH = p.height;
  for (let i = 0; i < 5; i++) {
    const ang = (p.facing > 0 ? -0.5 : 2.5) + Math.random() * 1.2;
    s.particles.push({ x: slashX + slashW / 2, y: slashY + slashH / 2, vx: Math.cos(ang) * (6 + Math.random() * 4), vy: Math.sin(ang) * (4 + Math.random() * 3), life: 0.2, maxLife: 0.2, color: 0xCCCCDD, size: 0.12 });
  }
  for (const e of s.enemies) {
    if (!e.alive) continue;
    if (e.x < slashX + slashW && e.x + e.width > slashX && e.y < slashY + slashH && e.y + e.height > slashY) {
      if (e.type === EnemyType.DRAGON) { e.hp -= SWORD_SLASH_DAMAGE; if (e.hp <= 0) triggerBossDeath(s, e); else e.stompBounce = 0.3; triggerShake(s, SHAKE_BOSS_HIT, SHAKE_BOSS_INTENSITY); }
      else { killEnemy(s, e, false); triggerShake(s, SHAKE_STOMP, SHAKE_STOMP_INTENSITY); }
    }
  }
  for (let r = Math.floor(slashY); r <= Math.floor(slashY + slashH); r++) {
    for (let c = Math.floor(slashX); c <= Math.floor(slashX + slashW); c++) {
      if (getTile(s, r, c) === TileType.BRICK && s.player.power !== PowerState.SMALL) { setTile(s, r, c, TileType.EMPTY); spawnBrickParticles(s, c, r); triggerShake(s, SHAKE_BRICK_BREAK, SHAKE_BRICK_INTENSITY); }
    }
  }
}

// ---------------------------------------------------------------------------
// Boss death sequence
// ---------------------------------------------------------------------------

function triggerBossDeath(s: KingdomState, e: Enemy): void {
  e.alive = false; e.deathTimer = BOSS_DEATH_DURATION;
  s.bossDeathActive = true; s.bossDeathTimer = BOSS_DEATH_DURATION;
  triggerShake(s, 0.5, 6);
  addScore(s, 5000, e.x, e.y);
  s.scorePopups.push({ x: e.x + 1, y: e.y - 1, value: 5000, timer: 2, text: "BOSS DEFEATED!", color: 0xFF4400, big: true });
}

export function updateBossDeath(s: KingdomState, dt: number): void {
  if (!s.bossDeathActive) return;
  s.bossDeathTimer -= dt;

  // Explosion particles throughout
  if (Math.random() < 0.4) {
    const ex = s.cameraX + Math.random() * (s.sw / s.tileSize);
    const ey = 2 + Math.random() * 10;
    const colors = [0xFF4400, 0xFF6600, 0xFFAA00, 0xFFFF44, 0xFF0000];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      s.particles.push({ x: ex, y: ey, vx: Math.cos(a) * (3 + Math.random() * 4), vy: Math.sin(a) * (3 + Math.random() * 4) - 2, life: 0.6, maxLife: 0.6, color: colors[Math.floor(Math.random() * colors.length)], size: 0.15 + Math.random() * 0.1 });
    }
  }

  // Bridge collapse (destroy bridge tiles progressively)
  if (s.bossDeathTimer < BOSS_DEATH_DURATION * 0.6) {
    const progress = 1 - (s.bossDeathTimer / (BOSS_DEATH_DURATION * 0.6));
    const bridgeRow = GROUND_ROW - 1;
    for (let c = 0; c < s.levelWidth; c++) {
      if (getTile(s, bridgeRow, c) === TileType.BRIDGE) {
        if (Math.random() < progress * 0.1) {
          setTile(s, bridgeRow, c, TileType.EMPTY);
          spawnBrickParticles(s, c, bridgeRow);
        }
      }
    }
  }

  if (s.bossDeathTimer <= 0) {
    s.bossDeathActive = false;
    // Brief pause then auto-clear
    s.phase = KingdomPhase.LEVEL_CLEAR;
    s.levelClearTimer = 3;
    s.score += Math.floor(s.time) * SCORE_TIME;
  }
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

function hitBlock(s: KingdomState, row: number, col: number): void {
  const tile = getTile(s, row, col);
  if (tile === TileType.QUESTION) {
    setTile(s, row, col, TileType.USED_QUESTION); spawnBlockItem(s, col, row); addBlockAnim(s, col, row); addScore(s, SCORE_BLOCK, col, row);
  } else if (tile === TileType.BRICK) {
    if (s.player.power !== PowerState.SMALL) { setTile(s, row, col, TileType.EMPTY); spawnBrickParticles(s, col, row); triggerShake(s, SHAKE_BRICK_BREAK, SHAKE_BRICK_INTENSITY); }
    else addBlockAnim(s, col, row);
  } else if (tile === TileType.COIN_BLOCK) {
    const key = `${col},${row}`;
    const hits = (s.coinBlockHits.get(key) || 0) + 1;
    s.coinBlockHits.set(key, hits);
    if (hits >= MULTI_COIN_MAX_HITS) setTile(s, row, col, TileType.USED_QUESTION);
    collectCoin(s, col, row);
    s.coinAnims.push({ x: col + 0.5, y: row - 1, vy: -12, timer: 0.4 });
    addBlockAnim(s, col, row);
  }
}

function spawnBlockItem(s: KingdomState, col: number, row: number): void {
  const key = `${col},${row}`;
  if (s.questionBlockItems.has(key)) {
    const itemType = s.questionBlockItems.get(key)!;
    s.items.push({ type: itemType, x: col, y: row - 1, vx: itemType === ItemType.GRAIL_STAR ? STAR_SPEED : POTION_SPEED, vy: itemType === ItemType.GRAIL_STAR ? STAR_BOUNCE_VY : 0, width: 0.8, height: 0.8, active: true, emerging: true, emergeY: row - 1 });
    return;
  }
  const hash = (col * 7 + row * 13 + s.world * 37 + s.level * 71) % 100;
  if (hash < 55) { collectCoin(s, col, row); s.coinAnims.push({ x: col + 0.5, y: row - 1, vy: -12, timer: 0.4 }); return; }
  const itemType = hash < 80 ? (s.player.power === PowerState.SMALL ? ItemType.POTION : ItemType.DRAGON_BREATH) : hash < 92 ? ItemType.GRAIL_STAR : ItemType.LIFE_UP;
  s.items.push({ type: itemType, x: col, y: row - 1, vx: itemType === ItemType.GRAIL_STAR ? STAR_SPEED : POTION_SPEED, vy: itemType === ItemType.GRAIL_STAR ? STAR_BOUNCE_VY : 0, width: 0.8, height: 0.8, active: true, emerging: true, emergeY: row - 1 });
}

function spawnBrickParticles(s: KingdomState, col: number, row: number): void {
  for (let i = 0; i < 8; i++) s.particles.push({ x: col + 0.5, y: row + 0.5, vx: (Math.random() - 0.5) * 10, vy: -5 - Math.random() * 8, life: 0.7, maxLife: 0.7, color: 0xC06820, size: 0.18 + Math.random() * 0.1 });
}

function addBlockAnim(s: KingdomState, col: number, row: number): void {
  s.blockAnims.push({ col, row, timer: 0.15, offsetY: 0 });
}

// ---------------------------------------------------------------------------
// Coins with magnetism
// ---------------------------------------------------------------------------

function collectCoin(s: KingdomState, x: number, y: number): void {
  s.coins++; s.totalCoinsCollected++;
  addScore(s, SCORE_COIN, x, y);
  if (s.coins >= COINS_FOR_LIFE) { s.coins -= COINS_FOR_LIFE; s.lives++; s.scorePopups.push({ x, y: y - 1, value: 0, timer: 1.2, text: "1-UP!", color: 0x44FF44, big: true }); }
}

export function addScore(s: KingdomState, pts: number, x: number, y: number): void {
  s.score += pts;
  if (s.score > s.highScore) s.highScore = s.score;
  if (pts > 0) s.scorePopups.push({ x, y: y - 0.5, value: pts, timer: 0.8 });
}

export function updateFloatingCoins(s: KingdomState, dt: number): void {
  const p = s.player;
  const pcx = p.x + p.width / 2, pcy = p.y + p.height / 2;
  for (const c of s.floatingCoins) {
    if (c.collected) continue;
    const dx = pcx - c.x, dy = pcy - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Magnetism: pull coins toward player when close
    if (dist < COIN_MAGNET_RANGE && dist > 0.3) {
      const pull = COIN_MAGNET_SPEED * dt * (1 - dist / COIN_MAGNET_RANGE);
      c.x += (dx / dist) * pull;
      c.y += (dy / dist) * pull;
    }
    // Collect
    if (dist < 0.5) {
      c.collected = true;
      collectCoin(s, c.x, c.y);
      for (let i = 0; i < 4; i++) s.particles.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 4, vy: -3 - Math.random() * 3, life: 0.3, maxLife: 0.3, color: 0xFFD700, size: 0.12 });
    }
  }
}

// ---------------------------------------------------------------------------
// Fireball
// ---------------------------------------------------------------------------

function shootFireball(s: KingdomState): void {
  if (s.projectiles.filter(p => p.active && p.fromPlayer).length >= MAX_FIREBALLS) return;
  const p = s.player;
  s.projectiles.push({ x: p.x + (p.facing > 0 ? p.width : -0.3), y: p.y + p.height * 0.4, vx: FIREBALL_SPEED * p.facing, vy: 0, width: 0.3, height: 0.3, active: true, fromPlayer: true, bounceCount: 0 });
}

// ---------------------------------------------------------------------------
// Enemies with awareness
// ---------------------------------------------------------------------------

export function updateEnemies(s: KingdomState, dt: number): void {
  const viewLeft = s.cameraX - 2, viewRight = s.cameraX + s.sw / s.tileSize + 2;
  const px = s.player.x, py = s.player.y;

  for (const e of s.enemies) {
    if (!e.alive) { if (e.deathTimer > 0) e.deathTimer -= dt; continue; }
    if (e.x < viewLeft - 5 || e.x > viewRight + 5) continue;
    if (e.stompBounce > 0) { e.stompBounce -= dt; continue; }

    // Enemy awareness: face player when close
    const edx = px - e.x;
    const dist = Math.abs(edx);
    if (dist < ENEMY_ALERT_RANGE && e.type !== EnemyType.DRAGON) {
      e.alertTimer = 0.5;
      // Goblins occasionally hop when alerted
      if (e.type === EnemyType.GOBLIN && Math.random() < GOBLIN_ALERT_JUMP_CHANCE && e.vy === 0) {
        e.vy = -6;
      }
    }
    if (e.alertTimer > 0) e.alertTimer -= dt;

    switch (e.type) {
      case EnemyType.DRAGON: updateDragon(s, e, dt); continue;
      case EnemyType.BAT: updateBat(s, e, dt); continue;
      case EnemyType.BOAR: updateBoar(s, e, dt); continue;
      case EnemyType.WRAITH: updateWraith(s, e, dt); continue;
      case EnemyType.HELLHOUND: updateHellhound(s, e, dt); continue;
      default: break;
    }

    if (e.isShell && !e.shellMoving) continue;

    // Standard physics
    e.vy += GRAVITY * dt; if (e.vy > MAX_FALL_SPEED) e.vy = MAX_FALL_SPEED;
    e.x += e.vx * dt;
    const eL = Math.floor(e.x), eR = Math.floor(e.x + e.width - 0.01);
    const eT = Math.floor(e.y), eB = Math.floor(e.y + e.height - 0.01);
    for (let r = eT; r <= eB; r++) {
      if (e.vx > 0 && isSolid(getTile(s, r, eR))) { e.x = eR - e.width; e.vx = -e.vx; e.facing = -1; }
      else if (e.vx < 0 && isSolid(getTile(s, r, eL))) { e.x = eL + 1; e.vx = -e.vx; e.facing = 1; }
    }
    e.y += e.vy * dt;
    const nB = Math.floor(e.y + e.height);
    let eLanded = false;
    for (let c = Math.floor(e.x + 0.1); c <= Math.floor(e.x + e.width - 0.11); c++) {
      if (isSolid(getTile(s, nB, c))) { e.y = nB - e.height; e.vy = 0; eLanded = true; }
    }
    if (eLanded && !e.isShell) {
      const ahead = Math.floor(e.x + (e.vx > 0 ? e.width + 0.1 : -0.1));
      if (!isSolid(getTile(s, Math.floor(e.y + e.height + 0.1), ahead))) { e.vx = -e.vx; e.facing = e.vx > 0 ? 1 : -1; }
    }
    if (e.y > s.levelHeight + 2) e.alive = false;
    if (e.isShell && e.shellMoving) {
      for (const o of s.enemies) { if (o === e || !o.alive) continue; if (boxOverlap(e, o)) { killEnemy(s, o, true); s.totalEnemiesKilled++; } }
    }
    if (e.type === EnemyType.SKELETON) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = SKELETON_ATTACK_INTERVAL;
        const dx2 = px - e.x, dy2 = py - e.y, d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (d2 < 12) s.projectiles.push({ x: e.x + e.width / 2, y: e.y, vx: (dx2 / d2) * 6, vy: Math.min(-3, (dy2 / d2) * 6 - 2), width: 0.25, height: 0.25, active: true, fromPlayer: false, bounceCount: 0 });
      }
    }
    e.animTimer += dt;
    if (e.animTimer > 0.15) { e.animTimer = 0; e.animFrame = (e.animFrame + 1) % 2; }
  }
}

function updateBat(s: KingdomState, e: Enemy, dt: number): void {
  const dx = s.player.x - e.x, dy = s.player.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (!e.swooping && dist < BAT_SWOOP_RANGE && s.player.y > e.y) e.swooping = true;
  if (e.swooping) {
    const d = Math.max(1, dist); e.vx = (dx / d) * BAT_SWOOP_SPEED; e.vy = (dy / d) * BAT_SWOOP_SPEED;
    e.facing = e.vx > 0 ? 1 : -1;
    if (e.y > s.player.y + 2 || e.y > e.homeY + 3) e.swooping = false;
  } else {
    e.vx = e.facing * BAT_SPEED; e.vy = Math.sin(Date.now() / 300 + e.x) * 3;
    if (e.y < e.homeY - 2) e.vy += 2; if (e.y > e.homeY + 2) e.vy -= 2;
  }
  e.x += e.vx * dt; e.y += e.vy * dt;
  if (e.x < 1) { e.facing = 1; e.vx = BAT_SPEED; }
  if (e.y > s.levelHeight + 2) e.alive = false;
  e.animTimer += dt; if (e.animTimer > 0.1) { e.animTimer = 0; e.animFrame = (e.animFrame + 1) % 2; }
}

function updateBoar(s: KingdomState, e: Enemy, dt: number): void {
  const dx = s.player.x - e.x;
  e.vy += GRAVITY * dt; if (e.vy > MAX_FALL_SPEED) e.vy = MAX_FALL_SPEED;
  if (!e.charging && Math.abs(dx) < BOAR_CHARGE_RANGE && Math.abs(s.player.y - e.y) < 2) {
    e.facing = dx > 0 ? 1 : -1; e.charging = true; e.chargeSpeed = BOAR_CHARGE_SPEED; e.attackTimer = BOAR_CHARGE_DURATION;
  }
  if (e.charging) {
    e.vx = e.facing * e.chargeSpeed; e.attackTimer -= dt;
    if (e.attackTimer <= 0) { e.charging = false; e.vx = e.facing * BOAR_SPEED; }
    if (Math.random() < 0.4) s.particles.push({ x: e.x + (e.facing > 0 ? 0 : e.width), y: e.y + e.height, vx: -e.facing * (1 + Math.random() * 2), vy: -Math.random() * 2, life: 0.3, maxLife: 0.3, color: 0x998866, size: 0.1 });
  } else { e.vx = e.facing * BOAR_SPEED; }
  e.x += e.vx * dt;
  const eL2 = Math.floor(e.x), eR2 = Math.floor(e.x + e.width - 0.01);
  for (let r = Math.floor(e.y); r <= Math.floor(e.y + e.height - 0.01); r++) {
    if (e.vx > 0 && isSolid(getTile(s, r, eR2))) { e.x = eR2 - e.width; e.vx = -e.vx; e.facing = -1; e.charging = false; }
    else if (e.vx < 0 && isSolid(getTile(s, r, eL2))) { e.x = eL2 + 1; e.vx = -e.vx; e.facing = 1; e.charging = false; }
  }
  e.y += e.vy * dt;
  const nB2 = Math.floor(e.y + e.height); let landed2 = false;
  for (let c = Math.floor(e.x + 0.1); c <= Math.floor(e.x + e.width - 0.11); c++) { if (isSolid(getTile(s, nB2, c))) { e.y = nB2 - e.height; e.vy = 0; landed2 = true; } }
  if (landed2 && !e.charging) { const ah = Math.floor(e.x + (e.vx > 0 ? e.width + 0.1 : -0.1)); if (!isSolid(getTile(s, Math.floor(e.y + e.height + 0.1), ah))) { e.vx = -e.vx; e.facing = e.vx > 0 ? 1 : -1; } }
  if (e.y > s.levelHeight + 2) e.alive = false;
  e.animTimer += dt; if (e.animTimer > (e.charging ? 0.07 : 0.15)) { e.animTimer = 0; e.animFrame = (e.animFrame + 1) % 2; }
}

function updateDragon(s: KingdomState, e: Enemy, dt: number): void {
  const phaseLow = e.hp <= 2;
  e.x += e.vx * dt;
  const hx = e.x; if (e.x < hx - 4) { e.vx = Math.abs(e.vx); e.facing = 1; } if (e.x > hx + 4) { e.vx = -Math.abs(e.vx); e.facing = -1; }
  e.vx = Math.sign(e.vx || -1) * (phaseLow ? DRAGON_SPEED * 2 : DRAGON_SPEED);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = phaseLow ? DRAGON_FIRE_INTERVAL * 0.6 : DRAGON_FIRE_INTERVAL;
    const dir = s.player.x > e.x ? 1 : -1;
    const count = phaseLow ? 3 : 1;
    for (let i = 0; i < count; i++) s.projectiles.push({ x: e.x + (dir > 0 ? e.width : 0), y: e.y + 0.3 + i * 0.4, vx: (8 + i * 2) * dir, vy: -1 + i * 1.5, width: 0.4, height: 0.3, active: true, fromPlayer: false, bounceCount: 0 });
    for (let i = 0; i < 6; i++) s.particles.push({ x: e.x + e.width / 2, y: e.y, vx: dir * (4 + Math.random() * 4), vy: -2 + Math.random() * 4, life: 0.4, maxLife: 0.4, color: [0xFF4400, 0xFF6600, 0xFFAA00][i % 3], size: 0.2 + Math.random() * 0.15 });
  }
  e.animTimer += dt; if (e.animTimer > 0.2) { e.animTimer = 0; e.animFrame = (e.animFrame + 1) % 2; }
}

function updateWraith(s: KingdomState, e: Enemy, dt: number): void {
  const dx = s.player.x - e.x, dy = s.player.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Slow homing drift — accelerate toward player then dampen
  if (dist > 1.5) {
    e.vx += (dx / dist) * WRAITH_SPEED * 4 * dt;
    e.vy += (dy / dist) * WRAITH_SPEED * 4 * dt;
  }
  e.vx *= 0.94; e.vy *= 0.94;
  const spd = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
  if (spd > WRAITH_SPEED * 2.2) { e.vx = (e.vx / spd) * WRAITH_SPEED * 2.2; e.vy = (e.vy / spd) * WRAITH_SPEED * 2.2; }

  // Ethereal undulation
  e.vy += Math.sin(Date.now() / 380 + e.x * 0.7) * 0.6;

  e.x += e.vx * dt; e.y += e.vy * dt;
  e.facing = dx > 0 ? 1 : -1;
  if (e.y < 1) { e.y = 1; e.vy = Math.abs(e.vy); }
  if (e.y > s.levelHeight - 1.5) { e.y = s.levelHeight - 1.5; e.vy = -Math.abs(e.vy); }

  // Spectral bolt — fired toward player when close enough
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && dist < 14) {
    e.attackTimer = WRAITH_FIRE_INTERVAL + (e.hp < 2 ? -0.8 : 0); // faster when wounded
    const d = Math.max(1, dist);
    // Phase 2 (hp=1): fires three bolts in a spread
    const shots = e.hp < 2 ? 3 : 1;
    for (let i = 0; i < shots; i++) {
      const spread = (i - Math.floor(shots / 2)) * 0.4;
      s.projectiles.push({ x: e.x + e.width / 2, y: e.y + e.height * 0.4, vx: (dx / d) * WRAITH_FIRE_SPEED + spread, vy: (dy / d) * WRAITH_FIRE_SPEED + spread, width: 0.3, height: 0.3, active: true, fromPlayer: false, bounceCount: 0 });
    }
    for (let i = 0; i < 5; i++) s.particles.push({ x: e.x + e.width / 2, y: e.y + e.height * 0.4, vx: (dx / d) * 2 + (Math.random() - 0.5) * 4, vy: (dy / d) * 2 + (Math.random() - 0.5) * 4, life: 0.5, maxLife: 0.5, color: 0xAA33FF, size: 0.12 });
  }

  // Purple soul-wisp trail
  if (Math.random() < 0.35) s.particles.push({ x: e.x + e.width * 0.5 + (Math.random() - 0.5) * 0.6, y: e.y + e.height * 0.7, vx: (Math.random() - 0.5) * 0.8, vy: -0.6 - Math.random() * 0.8, life: 0.8, maxLife: 0.8, color: e.hp < 2 ? 0x66FFFF : 0x6600CC, size: 0.1 + Math.random() * 0.05 });

  e.animTimer += dt; if (e.animTimer > 0.12) { e.animTimer = 0; e.animFrame = (e.animFrame + 1) % 2; }
}

function updateHellhound(s: KingdomState, e: Enemy, dt: number): void {
  const dx = s.player.x - e.x, dy = s.player.y - e.y;
  e.vy += GRAVITY * dt; if (e.vy > MAX_FALL_SPEED) e.vy = MAX_FALL_SPEED;

  if (e.charging) {
    // Mid-lunge — ride out the trajectory
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) { e.charging = false; e.attackTimer = HELLHOUND_LUNGE_COOLDOWN; }
    if (Math.random() < 0.55) s.particles.push({ x: e.x + e.width * 0.5, y: e.y + e.height * 0.3, vx: -e.vx * 0.12 + (Math.random() - 0.5) * 2, vy: -Math.random() * 2.5, life: 0.35, maxLife: 0.35, color: [0xFF5500, 0xFF8800, 0xFFCC00][Math.floor(Math.random() * 3)], size: 0.1 + Math.random() * 0.07 });
  } else {
    e.attackTimer -= dt;
    // Trigger lunge when player is within range and not too far above
    if (e.attackTimer <= 0 && Math.abs(dx) < HELLHOUND_LUNGE_RANGE && dy < 3.5) {
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      e.facing = dx > 0 ? 1 : -1;
      e.charging = true;
      e.attackTimer = HELLHOUND_LUNGE_DURATION;
      e.vx = (dx / dist) * HELLHOUND_LUNGE_SPEED;
      e.vy = Math.min(-9, (dy / dist) * HELLHOUND_LUNGE_SPEED - 5); // always has upward kick
    } else {
      e.vx = e.facing * HELLHOUND_SPEED;
    }
  }

  e.x += e.vx * dt;
  const eL = Math.floor(e.x), eR = Math.floor(e.x + e.width - 0.01);
  for (let r = Math.floor(e.y); r <= Math.floor(e.y + e.height - 0.01); r++) {
    if (e.vx > 0 && isSolid(getTile(s, r, eR))) { e.x = eR - e.width; e.vx = -e.vx; e.facing = -1; e.charging = false; }
    else if (e.vx < 0 && isSolid(getTile(s, r, eL))) { e.x = eL + 1; e.vx = -e.vx; e.facing = 1; e.charging = false; }
  }
  e.y += e.vy * dt;
  const nB = Math.floor(e.y + e.height); let landed = false;
  for (let c = Math.floor(e.x + 0.1); c <= Math.floor(e.x + e.width - 0.11); c++) {
    if (isSolid(getTile(s, nB, c))) { e.y = nB - e.height; e.vy = 0; landed = true; }
  }
  if (landed && !e.charging) { const ah = Math.floor(e.x + (e.vx > 0 ? e.width + 0.1 : -0.1)); if (!isSolid(getTile(s, Math.floor(e.y + e.height + 0.1), ah))) { e.vx = -e.vx; e.facing = e.vx > 0 ? 1 : -1; } }
  if (e.y > s.levelHeight + 2) e.alive = false;
  e.animTimer += dt; if (e.animTimer > (e.charging ? 0.06 : 0.11)) { e.animTimer = 0; e.animFrame = (e.animFrame + 1) % 2; }
}

function killEnemy(s: KingdomState, e: Enemy, byFireball: boolean): void {
  if (e.type === EnemyType.DRAGON) { triggerBossDeath(s, e); return; }
  e.alive = false; e.deathTimer = 0.5; s.totalEnemiesKilled++;
  addScore(s, byFireball ? SCORE_FIRE_KILL : 100, e.x, e.y);
  const deathColor = e.type === EnemyType.GOBLIN ? 0x228B22 : e.type === EnemyType.BAT ? 0x553366 : e.type === EnemyType.BOAR ? 0x886644 : e.type === EnemyType.WRAITH ? 0x8822FF : e.type === EnemyType.HELLHOUND ? 0xFF3300 : 0x444444;
  for (let i = 0; i < 6; i++) s.particles.push({ x: e.x + e.width / 2, y: e.y + e.height / 2, vx: (Math.random() - 0.5) * 8, vy: -4 - Math.random() * 6, life: 0.6, maxLife: 0.6, color: deathColor, size: 0.15 + Math.random() * 0.1 });
}

// ---------------------------------------------------------------------------
// Player vs Enemy
// ---------------------------------------------------------------------------

export function checkPlayerEnemyCollision(s: KingdomState): void {
  const p = s.player;
  if (p.deathTimer > 0) return;
  for (const e of s.enemies) {
    if (!e.alive || e.stompBounce > 0) continue;
    if (!boxOverlap(p, e)) continue;
    if (p.starTimer > 0) { killEnemy(s, e, false); triggerShake(s, SHAKE_STOMP, SHAKE_STOMP_INTENSITY); continue; }
    if (p.dashTimer > 0 || p.slideTimer > 0) {
      if (e.type === EnemyType.DRAGON) { e.hp--; if (e.hp <= 0) triggerBossDeath(s, e); e.stompBounce = 0.3; triggerShake(s, SHAKE_BOSS_HIT, SHAKE_BOSS_INTENSITY); }
      else { killEnemy(s, e, false); triggerShake(s, SHAKE_STOMP, SHAKE_STOMP_INTENSITY); }
      continue;
    }
    if (p.vy > 0 && p.y + p.height - 0.2 < e.y + e.height * 0.5) {
      if (e.type === EnemyType.DARK_KNIGHT && !e.isShell) { e.isShell = true; e.shellMoving = false; e.vx = 0; e.height = 0.6; e.stompBounce = 0.2; }
      else if (e.isShell && !e.shellMoving) { e.shellMoving = true; e.vx = (p.x + p.width / 2 < e.x + e.width / 2) ? SHELL_SPEED : -SHELL_SPEED; e.stompBounce = 0.15; }
      else if (e.type === EnemyType.DRAGON) { e.hp--; if (e.hp <= 0) triggerBossDeath(s, e); else e.stompBounce = 0.4; triggerShake(s, SHAKE_BOSS_HIT, SHAKE_BOSS_INTENSITY); }
      else if (e.type === EnemyType.WRAITH) {
        e.hp--;
        if (e.hp <= 0) killEnemy(s, e, false);
        else { e.stompBounce = 0.55; for (let i = 0; i < 8; i++) s.particles.push({ x: e.x + e.width / 2, y: e.y + e.height / 2, vx: (Math.random() - 0.5) * 10, vy: -3 - Math.random() * 5, life: 0.7, maxLife: 0.7, color: 0x66FFFF, size: 0.1 + Math.random() * 0.08 }); }
        triggerShake(s, SHAKE_STOMP, SHAKE_STOMP_INTENSITY);
      }
      else killEnemy(s, e, false);
      p.stompCombo++; p.stompComboTimer = STOMP_COMBO_WINDOW;
      const ci = Math.min(p.stompCombo - 1, SCORE_STOMP_COMBO.length - 1);
      const pts = SCORE_STOMP_COMBO[ci];
      addScore(s, pts, e.x, e.y - 0.5);
      if (p.stompCombo > 1) s.scorePopups.push({ x: e.x, y: e.y - 1.5, value: pts, timer: 1.2, text: `COMBO x${p.stompCombo}!`, color: p.stompCombo >= 4 ? 0xFF4400 : p.stompCombo >= 2 ? 0xFFAA00 : 0xFFFFFF, big: p.stompCombo >= 3 });
      p.vy = JUMP_VELOCITY * 0.6;
      triggerShake(s, SHAKE_STOMP, SHAKE_STOMP_INTENSITY);
    } else { damagePlayer(s); }
  }
}

function damagePlayer(s: KingdomState): void {
  const p = s.player;
  if (p.invincibleTimer > 0 || p.starTimer > 0 || p.dashTimer > 0) return;
  if (p.power === PowerState.FIRE || p.power === PowerState.BIG) {
    p.power = PowerState.SMALL; p.height = 0.9; p.crouching = false;
    p.invincibleTimer = DAMAGE_INVINCIBLE_TIME; p.shrinkTimer = GROW_TIME;
    triggerShake(s, 0.1, 3);
  } else killPlayer(s);
}

export function killPlayer(s: KingdomState): void {
  if (s.player.deathTimer > 0) return;
  s.player.deathTimer = 2.5; s.player.vy = JUMP_VELOCITY * 0.8; s.player.vx = 0;
  s.phase = KingdomPhase.DYING;
  triggerShake(s, SHAKE_DEATH, SHAKE_DEATH_INTENSITY);
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export function updateItems(s: KingdomState, dt: number): void {
  for (const item of s.items) {
    if (!item.active) continue;
    if (item.emerging) { item.y -= 3 * dt; if (item.y <= item.emergeY - 1) { item.y = item.emergeY - 1; item.emerging = false; } continue; }
    if (item.type !== ItemType.COIN) item.vy += GRAVITY * dt;
    if (item.type === ItemType.GRAIL_STAR) item.vy += GRAVITY * dt;
    item.x += item.vx * dt; item.y += item.vy * dt;
    if (item.vx !== 0) { const hc = Math.floor(item.x + (item.vx > 0 ? item.width : 0)); if (isSolid(getTile(s, Math.floor(item.y + item.height * 0.5), hc))) item.vx = -item.vx; }
    const br = Math.floor(item.y + item.height), mc = Math.floor(item.x + item.width / 2);
    if (isSolid(getTile(s, br, mc))) { item.y = br - item.height; item.vy = item.type === ItemType.GRAIL_STAR ? STAR_BOUNCE_VY : 0; }
    if (item.y > s.levelHeight + 2) item.active = false;
    if (boxOverlap(s.player, item)) pickupItem(s, item);
  }
}

function pickupItem(s: KingdomState, item: GameItem): void {
  item.active = false; const p = s.player;
  const sparkle = (c: number) => { for (let i = 0; i < 8; i++) s.particles.push({ x: item.x + 0.4, y: item.y + 0.4, vx: (Math.random() - 0.5) * 6, vy: -3 - Math.random() * 4, life: 0.5, maxLife: 0.5, color: c, size: 0.12 }); };
  switch (item.type) {
    case ItemType.COIN: collectCoin(s, item.x, item.y); break;
    case ItemType.POTION: if (p.power === PowerState.SMALL) { p.power = PowerState.BIG; p.height = 1.8; p.y -= 0.9; p.growTimer = GROW_TIME; } addScore(s, SCORE_POTION, item.x, item.y); sparkle(0x00FF00); break;
    case ItemType.DRAGON_BREATH: p.power = PowerState.FIRE; if (p.height < 1.5) { p.height = 1.8; p.y -= 0.9; p.growTimer = GROW_TIME; } addScore(s, SCORE_POTION, item.x, item.y); sparkle(0xFF6600); break;
    case ItemType.GRAIL_STAR: p.starTimer = STAR_DURATION; addScore(s, SCORE_STAR, item.x, item.y); break;
    case ItemType.LIFE_UP: s.lives++; addScore(s, 0, item.x, item.y); sparkle(0x00CC00); s.scorePopups.push({ x: item.x, y: item.y - 1, value: 0, timer: 1.2, text: "1-UP!", color: 0x44FF44, big: true }); break;
  }
}

// ---------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------

export function updateProjectiles(s: KingdomState, dt: number): void {
  for (const proj of s.projectiles) {
    if (!proj.active) continue;
    if (proj.fromPlayer) proj.vy += FIREBALL_GRAVITY * dt;
    proj.x += proj.vx * dt; proj.y += proj.vy * dt;
    if (proj.x < s.cameraX - 2 || proj.x > s.cameraX + s.sw / s.tileSize + 2 || proj.y > s.levelHeight + 2) { proj.active = false; continue; }
    const hc = Math.floor(proj.x + proj.width / 2), hr = Math.floor(proj.y + proj.height / 2);
    if (isSolid(getTile(s, hr, hc))) {
      if (proj.fromPlayer) { const fr = Math.floor(proj.y + proj.height); if (isSolid(getTile(s, fr, hc)) && proj.vy > 0) { proj.y = fr - proj.height; proj.vy = FIREBALL_BOUNCE_VY; proj.bounceCount++; if (proj.bounceCount > 3) proj.active = false; } else { proj.active = false; s.particles.push({ x: proj.x, y: proj.y, vx: 0, vy: -2, life: 0.2, maxLife: 0.2, color: 0xFF4400, size: 0.3 }); } }
      else proj.active = false;
    }
    if (proj.fromPlayer) { for (const e of s.enemies) { if (!e.alive) continue; if (boxOverlapProj(proj, e)) { proj.active = false; if (e.type === EnemyType.DRAGON) { e.hp--; if (e.hp <= 0) triggerBossDeath(s, e); else e.stompBounce = 0.3; triggerShake(s, SHAKE_BOSS_HIT, SHAKE_BOSS_INTENSITY); } else { killEnemy(s, e, true); triggerShake(s, SHAKE_STOMP, SHAKE_STOMP_INTENSITY); } break; } } }
    if (!proj.fromPlayer && boxOverlapProj(proj, s.player)) { proj.active = false; damagePlayer(s); }
  }
}

// ---------------------------------------------------------------------------
// Visual updates
// ---------------------------------------------------------------------------

export function updateParticles(s: KingdomState, dt: number): void {
  for (const p of s.particles) { p.vy += 20 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  s.particles = s.particles.filter(p => p.life > 0);
}
export function updateBlockAnims(s: KingdomState, dt: number): void {
  for (const b of s.blockAnims) { b.timer -= dt; const t = 1 - (b.timer / 0.15); b.offsetY = t < 0.5 ? -0.3 * (t * 2) : -0.3 * (1 - (t - 0.5) * 2); }
  s.blockAnims = s.blockAnims.filter(b => b.timer > 0);
}
export function updateCoinAnims(s: KingdomState, dt: number): void {
  for (const c of s.coinAnims) { c.y += c.vy * dt; c.vy += 30 * dt; c.timer -= dt; }
  s.coinAnims = s.coinAnims.filter(c => c.timer > 0);
}
export function updateScorePopups(s: KingdomState, dt: number): void {
  for (const p of s.scorePopups) { p.y -= (p.big ? 3 : 2) * dt; p.timer -= dt; }
  s.scorePopups = s.scorePopups.filter(p => p.timer > 0);
}

// ---------------------------------------------------------------------------
// Camera & timer
// ---------------------------------------------------------------------------

export function updateCamera(s: KingdomState, dt: number): void {
  const viewTilesX = s.sw / s.tileSize;
  const lookAhead = s.player.vx * 0.15;
  const targetX = s.player.x - viewTilesX * 0.35 + lookAhead;
  s.cameraTargetX = Math.max(0, Math.min(targetX, s.levelWidth - viewTilesX));
  s.cameraX += (s.cameraTargetX - s.cameraX) * Math.min(1, 8 * dt);
}

export function updateTimer(s: KingdomState, dt: number): void {
  if (s.phase !== KingdomPhase.PLAYING && s.phase !== KingdomPhase.BONUS_ROOM) return;
  s.time -= dt; if (s.time <= 0) { s.time = 0; killPlayer(s); }
}

// ---------------------------------------------------------------------------
// Level clear with timer fireworks
// ---------------------------------------------------------------------------

export function checkLevelClear(s: KingdomState): boolean {
  if (s.flagSliding || s.walkingToEnd || s.bossDeathActive) return false;
  const p = s.player;
  const col = Math.floor(p.x + p.width / 2), row = Math.floor(p.y + p.height * 0.5);
  if (getTile(s, row, col) === TileType.FLAG_POLE || getTile(s, row, col) === TileType.FLAG_TOP) {
    s.flagSliding = true; s.flagSlideY = p.y; p.vx = 0; p.vy = 0; p.x = col - p.width / 2;
    const heightRatio = 1 - (p.y / GROUND_ROW);
    addScore(s, Math.floor(SCORE_FLAG_BASE + (SCORE_FLAG_TOP - SCORE_FLAG_BASE) * Math.max(0, heightRatio)), col, p.y);
    return true;
  }
  return false;
}

export function updateFlagSlide(s: KingdomState, dt: number): void {
  const p = s.player;
  if (s.flagSliding) {
    p.y += 6 * dt;
    if (p.y >= GROUND_ROW - p.height) { p.y = GROUND_ROW - p.height; s.flagSliding = false; s.walkingToEnd = true; p.facing = 1; p.vx = 3; }
  }
  if (s.walkingToEnd) {
    p.x += 3 * dt;
    p.animTimer += dt; if (p.animTimer > 0.1) { p.animTimer = 0; p.animFrame = (p.animFrame + 1) % 4; }
    // Timer fireworks: if time ends in 1, 3, or 6 → extra fireworks
    const timeDigit = Math.floor(s.time) % 10;
    const fireworkChance = (timeDigit === 1 || timeDigit === 3 || timeDigit === 6) ? 0.15 : 0.06;
    if (Math.random() < fireworkChance) {
      const fx = s.cameraX + Math.random() * (s.sw / s.tileSize);
      const fy = 2 + Math.random() * 5;
      const colors = [0xFF4444, 0x44FF44, 0x4444FF, 0xFFFF44, 0xFF44FF, 0x44FFFF, 0xFFAA00];
      const c = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        s.particles.push({ x: fx, y: fy, vx: Math.cos(a) * (3 + Math.random() * 3), vy: Math.sin(a) * (3 + Math.random() * 3) - 2, life: 0.8, maxLife: 0.8, color: c, size: 0.1 + Math.random() * 0.08 });
      }
    }
    if (p.x > s.cameraX + s.sw / s.tileSize + 2) {
      s.walkingToEnd = false; s.phase = KingdomPhase.LEVEL_CLEAR; s.levelClearTimer = 3;
      s.score += Math.floor(s.time) * SCORE_TIME;
    }
  }
}

// ---------------------------------------------------------------------------
// Spawn helpers
// ---------------------------------------------------------------------------

export function createEnemyFromSpawn(spawn: { type: EnemyType; col: number; row: number }): Enemy {
  const t = spawn.type;
  return {
    type: t, x: spawn.col, y: spawn.row,
    vx: t === EnemyType.DRAGON ? -DRAGON_SPEED : t === EnemyType.BAT ? -BAT_SPEED : t === EnemyType.BOAR ? -BOAR_SPEED : t === EnemyType.SKELETON ? 0 : t === EnemyType.DARK_KNIGHT ? -DARK_KNIGHT_SPEED : t === EnemyType.WRAITH ? 0 : t === EnemyType.HELLHOUND ? -HELLHOUND_SPEED : -GOBLIN_SPEED,
    vy: 0,
    width: t === EnemyType.DRAGON ? 2 : t === EnemyType.BOAR ? 1.1 : t === EnemyType.HELLHOUND ? 1.2 : 0.9,
    height: t === EnemyType.DRAGON ? 2 : t === EnemyType.BOAR ? 0.8 : t === EnemyType.DARK_KNIGHT ? 0.9 : t === EnemyType.HELLHOUND ? 0.85 : t === EnemyType.WRAITH ? 1.1 : 0.8,
    alive: true, isShell: false, shellMoving: false,
    hp: t === EnemyType.DRAGON ? DRAGON_HP : t === EnemyType.WRAITH ? WRAITH_HP : 1,
    attackTimer: t === EnemyType.SKELETON ? SKELETON_ATTACK_INTERVAL : t === EnemyType.DRAGON ? DRAGON_FIRE_INTERVAL : t === EnemyType.WRAITH ? WRAITH_FIRE_INTERVAL : t === EnemyType.HELLHOUND ? HELLHOUND_LUNGE_COOLDOWN * 0.5 : 0,
    animFrame: 0, animTimer: 0, facing: -1, stompBounce: 0, deathTimer: 0,
    homeY: spawn.row, swooping: false, charging: false, chargeSpeed: BOAR_CHARGE_SPEED,
    alertTimer: 0,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function boxOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
function boxOverlapProj(proj: Projectile, b: { x: number; y: number; width: number; height: number }): boolean {
  return proj.x < b.x + b.width && proj.x + proj.width > b.x && proj.y < b.y + b.height && proj.y + proj.height > b.y;
}
export function cleanupEntities(s: KingdomState): void {
  s.enemies = s.enemies.filter(e => e.alive || e.deathTimer > 0);
  s.items = s.items.filter(i => i.active);
  s.projectiles = s.projectiles.filter(p => p.active);
}
