// ---------------------------------------------------------------------------
// Terraria – Mob spawning, AI, and management
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";
import { MOB_DEFS, getSpawnableMobs } from "../config/TerrariaMobDefs";
import type { MobDef } from "../config/TerrariaMobDefs";
import type { TerrariaState } from "../state/TerrariaState";
import { isSolid, addMessage } from "../state/TerrariaState";
import type { MobInstance } from "../state/TerrariaEntity";

let _spawnTimer = 0;

export function updateMobs(state: TerrariaState, dt: number): void {
  _spawnTimer += dt;
  if (_spawnTimer >= TB.MOB_SPAWN_INTERVAL) {
    _spawnTimer -= TB.MOB_SPAWN_INTERVAL;
    _trySpawnMob(state);
  }

  const p = state.player;
  for (const mob of state.mobs) {
    // AI update
    mob.aiTimer -= dt;
    if (mob.hurtTimer > 0) mob.hurtTimer -= dt;
    if (mob.attackTimer > 0) mob.attackTimer -= dt;

    const dx = p.x - mob.x;
    const dy = p.y - mob.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const def = MOB_DEFS[mob.type];
    if (!def) continue;

    if (def.hostile) {
      _updateHostileAI(mob, def, state, dist, dx, dy, dt);
    } else {
      _updatePassiveAI(mob, def, state, dist, dx, dt);
    }

    // Facing direction
    if (Math.abs(mob.vx) > 0.1) mob.facingRight = mob.vx > 0;

    // Despawn check
    if (dist > TB.MOB_DESPAWN_RADIUS && !mob.isBoss) {
      mob.despawnTimer -= dt;
    } else {
      mob.despawnTimer = 30;
    }
  }

  // Remove dead and despawned mobs
  state.mobs = state.mobs.filter(m => m.hp > 0 && m.despawnTimer > 0);
}

function _updateHostileAI(mob: MobInstance, def: MobDef, state: TerrariaState, dist: number, dx: number, _dy: number, _dt: number): void {
  switch (mob.aiState) {
    case "idle":
      mob.vx = 0;
      if (dist < def.detectRange) {
        mob.aiState = "chase";
        mob.aiTimer = 5;
      } else if (mob.aiTimer <= 0) {
        mob.aiState = "patrol";
        mob.aiTimer = 2 + Math.random() * 3;
        mob.vx = (Math.random() > 0.5 ? 1 : -1) * def.speed * 0.5;
      }
      break;

    case "patrol":
      if (dist < def.detectRange) {
        mob.aiState = "chase";
        mob.aiTimer = 5;
      }
      // Turn around at walls
      const ahead = Math.floor(mob.x + Math.sign(mob.vx) * (mob.width / 2 + 0.5));
      const feetY = Math.floor(mob.y - mob.height / 2);
      if (isSolid(state, ahead, feetY + 1) || !isSolid(state, ahead, feetY - 1)) {
        mob.vx = -mob.vx;
      }
      if (mob.aiTimer <= 0) {
        mob.aiState = "idle";
        mob.aiTimer = 1 + Math.random() * 2;
      }
      break;

    case "chase":
      mob.vx = Math.sign(dx) * def.speed;
      // Jump over obstacles
      if (mob.onGround) {
        const aheadX = Math.floor(mob.x + Math.sign(dx) * 1);
        const bodyY = Math.floor(mob.y);
        if (isSolid(state, aheadX, bodyY)) {
          mob.vy = TB.JUMP_VELOCITY * 0.8;
        }
      }
      if (dist < def.attackRange) {
        mob.aiState = "attack";
        mob.aiTimer = 0.3;
      } else if (dist > def.detectRange * 1.5) {
        mob.aiState = "idle";
        mob.aiTimer = 2;
      }
      break;

    case "attack":
      mob.vx = 0;
      if (mob.attackTimer <= 0 && dist < def.attackRange * 1.5) {
        // Deal damage to player
        _damagePlayer(state, def.damage, mob);
        mob.attackTimer = 0.8;
      }
      if (mob.aiTimer <= 0) {
        mob.aiState = "chase";
        mob.aiTimer = 3;
      }
      break;

    case "flee":
      mob.vx = -Math.sign(dx) * def.speed;
      if (mob.aiTimer <= 0) {
        mob.aiState = "idle";
        mob.aiTimer = 2;
      }
      break;
  }
}

function _updatePassiveAI(mob: MobInstance, def: MobDef, _state: TerrariaState, dist: number, dx: number, _dt: number): void {
  if (dist < 3) {
    // Flee from player
    mob.aiState = "flee";
    mob.aiTimer = 3;
    mob.vx = -Math.sign(dx) * def.speed;
  } else if (mob.aiState === "flee") {
    if (mob.aiTimer <= 0) {
      mob.aiState = "idle";
      mob.aiTimer = 3;
      mob.vx = 0;
    }
  } else if (mob.aiState === "idle") {
    mob.vx = 0;
    if (mob.aiTimer <= 0) {
      mob.aiState = "patrol";
      mob.aiTimer = 2 + Math.random() * 4;
      mob.vx = (Math.random() > 0.5 ? 1 : -1) * def.speed * 0.3;
    }
  } else if (mob.aiState === "patrol") {
    if (mob.aiTimer <= 0) {
      mob.aiState = "idle";
      mob.aiTimer = 2 + Math.random() * 3;
    }
  }
}

function _damagePlayer(state: TerrariaState, amount: number, mob: MobInstance): void {
  const p = state.player;
  if (p.invulnTimer > 0) return;
  const dmg = Math.max(1, amount - p.defense);
  p.hp -= dmg;
  p.invulnTimer = TB.INVULN_TIME;

  // Knockback
  const kbDir = Math.sign(p.x - mob.x) || 1;
  p.vx += kbDir * TB.KNOCKBACK_STRENGTH;
  p.vy += TB.KNOCKBACK_UP;

  if (p.hp <= 0) {
    p.hp = 0;
    state.gameOver = true;
    addMessage(state, "You have fallen!", 0xFF4444);
  }
}

export function damageMob(state: TerrariaState, mob: MobInstance, amount: number): void {
  const def = MOB_DEFS[mob.type];
  const dmg = Math.max(1, amount - (def?.defense ?? 0));
  mob.hp -= dmg;
  mob.hurtTimer = 0.3;

  // Knockback from player
  const kbDir = Math.sign(mob.x - state.player.x) || 1;
  mob.vx += kbDir * TB.KNOCKBACK_STRENGTH * 0.6;
  mob.vy += TB.KNOCKBACK_UP * 0.5;

  if (mob.hp <= 0) {
    state.player.mobsKilled++;
    addMessage(state, `Defeated ${def?.name ?? "mob"}!`, 0xFFD700);
  }
}

// ---------------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------------

function _trySpawnMob(state: TerrariaState): void {
  if (state.mobs.length >= TB.MAX_MOBS) return;

  const p = state.player;
  const isNight = state.timeOfDay > 0.75 || state.timeOfDay < 0.25;
  const spawnable = getSpawnableMobs(Math.floor(p.y), isNight);
  if (spawnable.length === 0) return;

  // Weighted random selection
  const totalWeight = spawnable.reduce((sum, d) => sum + d.spawnWeight, 0);
  let roll = Math.random() * totalWeight;
  let chosen: MobDef | null = null;
  for (const def of spawnable) {
    roll -= def.spawnWeight;
    if (roll <= 0) { chosen = def; break; }
  }
  if (!chosen) return;

  // Pick spawn location
  const angle = Math.random() * Math.PI * 2;
  const dist = TB.MOB_SPAWN_RADIUS_MIN + Math.random() * (TB.MOB_SPAWN_RADIUS_MAX - TB.MOB_SPAWN_RADIUS_MIN);
  const sx = p.x + Math.cos(angle) * dist;
  const sy = p.y + Math.sin(angle) * dist * 0.5;

  // Bounds check
  if (sx < 1 || sx >= TB.WORLD_WIDTH - 1 || sy < 1 || sy >= TB.WORLD_HEIGHT - 1) return;

  // Check there's room (not inside solid)
  if (isSolid(state, Math.floor(sx), Math.floor(sy))) return;

  const mob: MobInstance = {
    id: state.nextEntityId++,
    type: chosen.type,
    x: sx, y: sy,
    vx: 0, vy: 0,
    hp: chosen.hp, maxHp: chosen.hp,
    facingRight: Math.random() > 0.5,
    onGround: false,
    aiState: "idle",
    aiTimer: 1 + Math.random() * 2,
    attackTimer: 0,
    hurtTimer: 0,
    despawnTimer: 30,
    width: chosen.width,
    height: chosen.height,
    isBoss: chosen.isBoss,
  };
  state.mobs.push(mob);
}
