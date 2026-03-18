// ---------------------------------------------------------------------------
// Terraria – Platformer physics (gravity, AABB tile collision)
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";
import { BLOCK_DEFS, BlockType } from "../config/TerrariaBlockDefs";
import type { TerrariaState } from "../state/TerrariaState";
import { getWorldBlock } from "../state/TerrariaState";

// ---------------------------------------------------------------------------
// AABB helper
// ---------------------------------------------------------------------------

interface AABB {
  x: number; y: number; // center
  hw: number; hh: number; // half-width, half-height
}

function overlaps(a: AABB, bx: number, by: number): boolean {
  // Block is a 1x1 AABB centered at (bx+0.5, by+0.5)
  return a.x + a.hw > bx && a.x - a.hw < bx + 1 &&
         a.y + a.hh > by && a.y - a.hh < by + 1;
}

function blockIsSolid(state: TerrariaState, bx: number, by: number): boolean {
  if (by < 0) return true;
  if (by >= TB.WORLD_HEIGHT) return false;
  if (bx < 0 || bx >= TB.WORLD_WIDTH) return true;
  const bt = getWorldBlock(state, bx, by);
  const def = BLOCK_DEFS[bt];
  return def ? def.solid : false;
}

// ---------------------------------------------------------------------------
// Entity physics update
// ---------------------------------------------------------------------------

export interface PhysicsBody {
  x: number; y: number;
  vx: number; vy: number;
  width: number;
  height: number;
  onGround: boolean;
}

export function updatePhysicsBody(body: PhysicsBody, state: TerrariaState, dt: number, applyGravity = true): void {
  const hw = body.width / 2;
  const hh = body.height / 2;

  // Check if body is in water
  const inWater = _isInWater(body, state);

  // Apply gravity (reduced in water for buoyancy)
  if (applyGravity) {
    const grav = inWater ? TB.GRAVITY * 0.25 : TB.GRAVITY;
    body.vy -= grav * dt;
    const maxFall = inWater ? TB.MAX_FALL_SPEED * 0.3 : TB.MAX_FALL_SPEED;
    if (body.vy < -maxFall) body.vy = -maxFall;
    // Water drag
    if (inWater) {
      body.vx *= 0.95;
      body.vy *= 0.95;
    }
  }

  // Move X
  body.x += body.vx * dt;
  _resolveX(body, state, hw, hh);

  // Move Y
  body.y += body.vy * dt;
  body.onGround = false;
  _resolveY(body, state, hw, hh);
}

function _isInWater(body: PhysicsBody, state: TerrariaState): boolean {
  const bx = Math.floor(body.x);
  const by = Math.floor(body.y);
  if (bx < 0 || bx >= state.worldWidth || by < 0 || by >= TB.WORLD_HEIGHT) return false;
  return getWorldBlock(state, bx, by) === BlockType.WATER;
}

function _resolveX(body: PhysicsBody, state: TerrariaState, hw: number, hh: number): void {
  const box: AABB = { x: body.x, y: body.y, hw, hh };
  const minBX = Math.floor(box.x - hw) - 1;
  const maxBX = Math.floor(box.x + hw) + 1;
  const minBY = Math.floor(box.y - hh);
  const maxBY = Math.floor(box.y + hh);

  for (let bx = minBX; bx <= maxBX; bx++) {
    for (let by = minBY; by <= maxBY; by++) {
      if (!blockIsSolid(state, bx, by)) continue;
      if (!overlaps(box, bx, by)) continue;

      if (body.vx > 0) {
        body.x = bx - hw - 0.001;
      } else if (body.vx < 0) {
        body.x = bx + 1 + hw + 0.001;
      }
      body.vx = 0;
      box.x = body.x;
    }
  }
}

function _resolveY(body: PhysicsBody, state: TerrariaState, hw: number, hh: number): void {
  const box: AABB = { x: body.x, y: body.y, hw, hh };
  const minBX = Math.floor(box.x - hw);
  const maxBX = Math.floor(box.x + hw);
  const minBY = Math.floor(box.y - hh) - 1;
  const maxBY = Math.floor(box.y + hh) + 1;

  for (let by = minBY; by <= maxBY; by++) {
    for (let bx = minBX; bx <= maxBX; bx++) {
      if (!blockIsSolid(state, bx, by)) continue;
      if (!overlaps(box, bx, by)) continue;

      if (body.vy < 0) {
        // Falling: land on top of block
        body.y = by + 1 + hh + 0.001;
        body.onGround = true;
      } else if (body.vy > 0) {
        // Rising: hit ceiling
        body.y = by - hh - 0.001;
      }
      body.vy = 0;
      box.y = body.y;
    }
  }
}

// ---------------------------------------------------------------------------
// Player physics update (convenience wrapper)
// ---------------------------------------------------------------------------

export function updatePlayerPhysics(state: TerrariaState, dt: number): void {
  const p = state.player;
  const body: PhysicsBody = {
    x: p.x, y: p.y, vx: p.vx, vy: p.vy,
    width: TB.PLAYER_WIDTH, height: TB.PLAYER_HEIGHT,
    onGround: p.onGround,
  };
  updatePhysicsBody(body, state, dt);
  p.x = body.x; p.y = body.y;
  p.vx = body.vx; p.vy = body.vy;
  p.onGround = body.onGround;
}

export function updateMobPhysics(state: TerrariaState, dt: number): void {
  for (const mob of state.mobs) {
    const body: PhysicsBody = {
      x: mob.x, y: mob.y, vx: mob.vx, vy: mob.vy,
      width: mob.width, height: mob.height,
      onGround: mob.onGround,
    };
    updatePhysicsBody(body, state, dt);
    mob.x = body.x; mob.y = body.y;
    mob.vx = body.vx; mob.vy = body.vy;
    mob.onGround = body.onGround;
  }
}

export function updateDroppedItemPhysics(state: TerrariaState, dt: number): void {
  for (const item of state.droppedItems) {
    item.vy -= TB.GRAVITY * dt;
    if (item.vy < -TB.MAX_FALL_SPEED) item.vy = -TB.MAX_FALL_SPEED;
    item.y += item.vy * dt;

    // Simple ground check
    const groundY = Math.floor(item.y - 0.5);
    if (groundY >= 0 && blockIsSolid(state, Math.floor(item.x), groundY)) {
      item.y = groundY + 1.5;
      item.vy = 0;
    }

    item.lifetime -= dt;
    if (item.pickupDelay > 0) item.pickupDelay -= dt;
  }
  // Remove expired items
  state.droppedItems = state.droppedItems.filter(i => i.lifetime > 0);
}
