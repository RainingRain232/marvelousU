// ---------------------------------------------------------------------------
// Terraria – Mob spawning, AI, and management
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";
import { MOB_DEFS, getSpawnableMobs } from "../config/TerrariaMobDefs";
import type { MobDef } from "../config/TerrariaMobDefs";
import type { TerrariaState } from "../state/TerrariaState";
import { isSolid, addMessage } from "../state/TerrariaState";
import type { MobInstance, DroppedItem } from "../state/TerrariaEntity";
import { BlockType } from "../config/TerrariaBlockDefs";
import { createBlockItem } from "../state/TerrariaInventory";

let _spawnTimer = 0;

export function updateMobs(state: TerrariaState, dt: number): void {
  // Don't spawn or update AI when game over
  if (state.gameOver) return;

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

    // Despawn: distance-based timer + absolute lifetime cap (120s)
    mob.despawnTimer -= dt * (dist > TB.MOB_DESPAWN_RADIUS && !mob.isBoss ? 3 : 0);
    if (!mob.isBoss) mob.despawnTimer -= dt * 0.02; // slow drain even when close
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
  // Difficulty scaling
  const diffMult = state.difficulty === "easy" ? 0.6 : state.difficulty === "hard" ? 1.5 : 1.0;
  const dmg = Math.max(1, Math.floor(amount * diffMult) - p.defense);
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
    _dropLoot(state, mob);
  }
}

function _dropLoot(state: TerrariaState, mob: MobInstance): void {
  const def = MOB_DEFS[mob.type];
  if (!def) return;

  const drops: DroppedItem[] = [];
  const id = () => state.nextEntityId++;

  // Every mob drops cobblestone or resources based on type
  const lootTable: Record<string, Array<{ item: () => ReturnType<typeof createBlockItem>; chance: number }>> = {
    slime: [
      { item: () => createBlockItem(BlockType.MUD, "Mud", 0x5C4033, 1 + Math.floor(Math.random() * 3)), chance: 0.7 },
    ],
    saxon_warrior: [
      { item: () => createBlockItem(BlockType.IRON_ORE, "Iron Ore", 0xB87333, 1 + Math.floor(Math.random() * 2)), chance: 0.5 },
      { item: () => createBlockItem(BlockType.COBBLESTONE, "Cobblestone", 0x6B6B6B, 2 + Math.floor(Math.random() * 3)), chance: 0.8 },
    ],
    wolf: [
      { item: () => createBlockItem(BlockType.OAK_LOG, "Leather", 0x8B6914, 1 + Math.floor(Math.random() * 2)), chance: 0.6 },
    ],
    cave_spider: [
      { item: () => createBlockItem(BlockType.COBBLESTONE, "Cobblestone", 0x6B6B6B, 1 + Math.floor(Math.random() * 2)), chance: 0.5 },
    ],
    skeleton: [
      { item: () => createBlockItem(BlockType.IRON_ORE, "Iron Ore", 0xB87333, 1 + Math.floor(Math.random() * 3)), chance: 0.6 },
      { item: () => createBlockItem(BlockType.COBBLESTONE, "Bone", 0xDDDDAA, 2), chance: 0.4 },
    ],
    dark_knight: [
      { item: () => createBlockItem(BlockType.IRON_ORE, "Iron Ore", 0xB87333, 3 + Math.floor(Math.random() * 3)), chance: 0.7 },
      { item: () => createBlockItem(BlockType.GOLD_ORE, "Gold Ore", 0xFFD700, 1), chance: 0.3 },
    ],
    wraith: [
      { item: () => createBlockItem(BlockType.CRYSTAL_ORE, "Crystal", 0xAA44FF, 1 + Math.floor(Math.random() * 2)), chance: 0.5 },
      { item: () => createBlockItem(BlockType.ENCHANTED_TORCH, "Enchanted Torch", 0xAA55FF, 2), chance: 0.3 },
    ],
    construct: [
      { item: () => createBlockItem(BlockType.CRYSTAL_ORE, "Crystal", 0xAA44FF, 2 + Math.floor(Math.random() * 3)), chance: 0.6 },
      { item: () => createBlockItem(BlockType.ENCHANTED_STONE, "Enchanted Stone", 0x9966FF, 1), chance: 0.2 },
    ],
    dragon: [
      { item: () => createBlockItem(BlockType.DRAGON_BONE_ORE, "Dragon Bone", 0xCC2222, 8 + Math.floor(Math.random() * 5)), chance: 1.0 },
      { item: () => createBlockItem(BlockType.GOLD_ORE, "Gold Ore", 0xFFD700, 5 + Math.floor(Math.random() * 5)), chance: 1.0 },
      { item: () => createBlockItem(BlockType.CRYSTAL_ORE, "Crystal", 0xAA44FF, 3 + Math.floor(Math.random() * 4)), chance: 0.8 },
    ],
    mordred: [
      { item: () => createBlockItem(BlockType.DRAGON_BONE_ORE, "Dragon Bone", 0xCC2222, 5), chance: 1.0 },
      { item: () => createBlockItem(BlockType.CRYSTAL_ORE, "Crystal", 0xAA44FF, 5), chance: 1.0 },
    ],
    deer: [
      { item: () => createBlockItem(BlockType.OAK_LOG, "Leather", 0x8B6914, 1), chance: 0.8 },
    ],
  };

  const mobLoot = lootTable[mob.type] ?? [];
  for (const entry of mobLoot) {
    if (Math.random() < entry.chance) {
      const item = entry.item();
      drops.push({
        id: id(), x: mob.x + (Math.random() - 0.5) * 1.5, y: mob.y + 0.5,
        vy: 3 + Math.random() * 3, item, lifetime: 60, pickupDelay: 0.5,
      });
    }
  }

  state.droppedItems.push(...drops);
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
