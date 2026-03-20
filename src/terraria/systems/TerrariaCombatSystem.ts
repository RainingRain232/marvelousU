// ---------------------------------------------------------------------------
// Terraria – Combat system (melee, ranged, projectiles)
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";
import type { TerrariaState } from "../state/TerrariaState";
import { isSolid, addMessage } from "../state/TerrariaState";
import { getHeldItem } from "../state/TerrariaInventory";
import { ItemCategory } from "../state/TerrariaInventory";
import { ToolType } from "../config/TerrariaBlockDefs";
import type { Projectile, StatusEffect } from "../state/TerrariaEntity";
import { MOB_DEFS } from "../config/TerrariaMobDefs";
import { damageMob } from "./TerrariaMobSystem";
import type { InputState } from "./TerrariaInputSystem";
import type { TerrariaCamera } from "../view/TerrariaCamera";

// ---------------------------------------------------------------------------
// Status effect helpers
// ---------------------------------------------------------------------------

export function applyStatusEffect(effects: StatusEffect[], effect: StatusEffect): void {
  // Refresh duration if same type already exists, or add new
  const existing = effects.find(e => e.type === effect.type);
  if (existing) {
    existing.duration = Math.max(existing.duration, effect.duration);
    existing.strength = Math.max(existing.strength, effect.strength);
  } else {
    effects.push({ ...effect });
  }
}

function _updateStatusEffects(effects: StatusEffect[], dt: number): { damage: number; speedMult: number; frozen: boolean } {
  let damage = 0;
  let speedMult = 1;
  let frozen = false;

  for (const e of effects) {
    e.duration -= dt;
    e.tickTimer -= dt;

    if (e.tickTimer <= 0) {
      e.tickTimer = 0.5; // tick every 0.5s
      if (e.type === "poison") damage += e.strength;
      if (e.type === "fire") damage += e.strength;
    }

    if (e.type === "freeze") { speedMult *= 0.2; frozen = true; }
    if (e.type === "speed") speedMult *= 1 + e.strength;
    if (e.type === "weakness") speedMult *= 0.7;
  }

  // Remove expired
  for (let i = effects.length - 1; i >= 0; i--) {
    if (effects[i].duration <= 0) effects.splice(i, 1);
  }

  return { damage, speedMult, frozen };
}

// ---------------------------------------------------------------------------
// Combat update
// ---------------------------------------------------------------------------

export function updateCombat(state: TerrariaState, input: InputState, camera: TerrariaCamera, dt: number): void {
  const p = state.player;

  // Update player status effects
  const playerFx = _updateStatusEffects(p.statusEffects, dt);
  p.speedMult = playerFx.speedMult;
  if (playerFx.damage > 0 && p.hp > 1) {
    p.hp -= playerFx.damage;
    if (p.hp <= 0) {
      p.hp = 0;
      state.gameOver = true;
      addMessage(state, "You succumbed to affliction!", 0xFF4444);
    }
  }
  // Regen effect
  const regenFx = p.statusEffects.find(e => e.type === "regen");
  if (regenFx && p.hp < p.maxHp) {
    p.hp = Math.min(p.maxHp, p.hp + regenFx.strength * dt);
  }

  // Update mob status effects
  for (const mob of state.mobs) {
    if (!mob.statusEffects) mob.statusEffects = [];
    const mobFx = _updateStatusEffects(mob.statusEffects, dt);
    if (mobFx.damage > 0) {
      mob.hp -= mobFx.damage;
      if (mob.hp <= 0) {
        state.player.mobsKilled++;
        addMessage(state, `${MOB_DEFS[mob.type]?.name ?? "mob"} perished from affliction!`, 0xAA44FF);
      }
    }
  }

  // Melee attack
  if (input.attack && p.attackTimer <= 0 && !state.inventoryOpen && !state.paused && !playerFx.frozen) {
    const held = getHeldItem(p.inventory);
    if (held && held.category === ItemCategory.WEAPON) {
      const isSword = held.toolType === ToolType.SWORD;
      let damage = held.damage ?? 5;
      const reach = isSword ? 2.5 : 1.5;

      // Critical hit chance
      const isCrit = Math.random() < p.critChance;
      if (isCrit) damage = Math.floor(damage * 1.8);

      p.attackTimer = TB.ATTACK_COOLDOWN;

      // Check mobs in melee range
      for (const mob of state.mobs) {
        const dx = mob.x - p.x;
        const dy = mob.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > reach) continue;

        const facingOK = p.facingRight ? dx > -0.5 : dx < 0.5;
        if (!facingOK) continue;

        damageMob(state, mob, damage, isCrit);

        // Sword fire enchant (crystal+ tier weapons apply fire)
        if (isSword && damage >= 18) {
          if (!mob.statusEffects) mob.statusEffects = [];
          applyStatusEffect(mob.statusEffects, { type: "fire", duration: 3, tickTimer: 0, strength: 2 });
        }
      }

      // Ranged: bows shoot projectiles
      if (held.toolType === ToolType.BOW) {
        const { wx: targetWX, wy: targetWY } = camera.screenToWorld(input.mouseX, input.mouseY);
        const ddx = targetWX - p.x;
        const ddy = targetWY - p.y;
        const len = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        const speed = 20;
        const proj: Projectile = {
          id: state.nextEntityId++,
          x: p.x, y: p.y + 0.3,
          vx: (ddx / len) * speed,
          vy: (ddy / len) * speed,
          damage: isCrit ? Math.floor(damage * 1.8) : damage,
          color: isCrit ? 0xFFFF44 : 0xCCCCCC,
          lifetime: 3,
          fromPlayer: true,
          width: 0.2,
          height: 0.2,
          gravity: true,
        };
        state.projectiles.push(proj);
      }

      // Staffs shoot magic projectiles
      if (held.toolType === ToolType.STAFF && p.mana >= 5) {
        p.mana -= 5;
        const { wx: targetWX, wy: targetWY } = camera.screenToWorld(input.mouseX, input.mouseY);
        const ddx = targetWX - p.x;
        const ddy = targetWY - p.y;
        const len = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        const speed = 15;
        const proj: Projectile = {
          id: state.nextEntityId++,
          x: p.x, y: p.y + 0.3,
          vx: (ddx / len) * speed,
          vy: (ddy / len) * speed,
          damage: isCrit ? Math.floor(damage * 1.8) : damage,
          color: isCrit ? 0xFFDD88 : 0xAA44FF,
          lifetime: 4,
          fromPlayer: true,
          width: 0.3,
          height: 0.3,
          gravity: false,
        };
        state.projectiles.push(proj);
      }

      if (isCrit) {
        addMessage(state, "Critical hit!", 0xFFDD00);
      }
    }
  }

  // Update projectiles
  _updateProjectiles(state, dt);

  // Mob special abilities
  _updateMobSpecials(state, dt);

  // Contact damage from mobs (with status effect application)
  for (const mob of state.mobs) {
    if (mob.hurtTimer > 0) continue;
    const dx = Math.abs(mob.x - p.x);
    const dy = Math.abs(mob.y - p.y);
    if (dx < (mob.width + TB.PLAYER_WIDTH) / 2 && dy < (mob.height + TB.PLAYER_HEIGHT) / 2) {
      const def = MOB_DEFS[mob.type];
      if (def?.hostile && p.invulnTimer <= 0) {
        const dmg = Math.max(1, (def.damage ?? 5) - p.defense);
        p.hp -= dmg;
        p.invulnTimer = TB.INVULN_TIME;
        const kbDir = Math.sign(p.x - mob.x) || 1;
        p.vx += kbDir * TB.KNOCKBACK_STRENGTH;
        p.vy += TB.KNOCKBACK_UP;

        // Mob-specific status effects on hit
        if (mob.type === "cave_spider") {
          applyStatusEffect(p.statusEffects, { type: "poison", duration: 4, tickTimer: 0, strength: 1 });
          addMessage(state, "Poisoned!", 0x44CC44);
        } else if (mob.type === "wraith") {
          applyStatusEffect(p.statusEffects, { type: "weakness", duration: 5, tickTimer: 0, strength: 0 });
          addMessage(state, "Weakened!", 0x8844AA);
        } else if (mob.type === "dragon") {
          applyStatusEffect(p.statusEffects, { type: "fire", duration: 3, tickTimer: 0, strength: 3 });
          addMessage(state, "Burning!", 0xFF6622);
        }

        if (p.hp <= 0) {
          p.hp = 0;
          state.gameOver = true;
          addMessage(state, "You have fallen!", 0xFF4444);
        }
      }
    }
  }

  // Mana regen (faster with regen effect)
  const manaRegenRate = regenFx ? 4 : 2;
  if (p.mana < p.maxMana) {
    p.mana = Math.min(p.maxMana, p.mana + dt * manaRegenRate);
  }

  // World events
  _updateWorldEvents(state, dt);
}

// ---------------------------------------------------------------------------
// Mob special abilities
// ---------------------------------------------------------------------------

function _updateMobSpecials(state: TerrariaState, dt: number): void {
  const p = state.player;

  for (const mob of state.mobs) {
    if (!mob.specialTimer) mob.specialTimer = 2 + Math.random() * 3;
    mob.specialTimer -= dt;
    if (mob.specialTimer > 0) continue;

    const dx = p.x - mob.x;
    const dy = p.y - mob.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (mob.type === "skeleton" && dist < 12) {
      // Skeleton throws bone projectile
      mob.specialTimer = 3 + Math.random() * 2;
      const len = dist || 1;
      const proj: Projectile = {
        id: state.nextEntityId++,
        x: mob.x, y: mob.y + mob.height * 0.3,
        vx: (dx / len) * 8,
        vy: (dy / len) * 8 + 3,
        damage: 4,
        color: 0xDDDDAA,
        lifetime: 3,
        fromPlayer: false,
        width: 0.2, height: 0.2,
        gravity: true,
      };
      state.projectiles.push(proj);
    } else if (mob.type === "dark_knight" && dist < 10) {
      // Dark knight lunges forward
      mob.specialTimer = 4 + Math.random() * 2;
      mob.vx = Math.sign(dx) * 15;
      mob.vy = 5;
    } else if (mob.type === "wraith" && dist < 15) {
      // Wraith teleports near player
      mob.specialTimer = 5 + Math.random() * 3;
      const teleX = p.x + (Math.random() - 0.5) * 6;
      const teleY = p.y + (Math.random() - 0.5) * 3;
      if (!isSolid(state, Math.floor(teleX), Math.floor(teleY))) {
        mob.x = teleX;
        mob.y = teleY;
        addMessage(state, "The wraith phases through reality!", 0x8844AA);
      }
    } else if (mob.type === "construct" && dist < 12) {
      // Construct ground slam (AoE damage if player is close)
      mob.specialTimer = 6 + Math.random() * 3;
      if (dist < 4 && p.invulnTimer <= 0) {
        const dmg = Math.max(1, 10 - p.defense);
        p.hp -= dmg;
        p.invulnTimer = TB.INVULN_TIME;
        p.vy += 8; // Launch player up
        applyStatusEffect(p.statusEffects, { type: "freeze", duration: 1.5, tickTimer: 0, strength: 0 });
        addMessage(state, "Ground slam! Frozen!", 0x88BBFF);
      }
    } else if (mob.type === "dragon" && dist < 20) {
      // Dragon fire breath (spray of projectiles)
      mob.specialTimer = 3 + Math.random() * 2;
      if (!mob.phase) mob.phase = 1;
      // Phase 2 at 50% HP: faster, more projectiles
      const numProj = mob.hp < mob.maxHp * 0.5 ? 5 : 3;
      const baseAngle = Math.atan2(dy, dx);
      for (let i = 0; i < numProj; i++) {
        const spread = (i - (numProj - 1) / 2) * 0.15;
        const angle = baseAngle + spread;
        const proj: Projectile = {
          id: state.nextEntityId++,
          x: mob.x, y: mob.y + mob.height * 0.3,
          vx: Math.cos(angle) * 12,
          vy: Math.sin(angle) * 12,
          damage: 8,
          color: 0xFF4422,
          lifetime: 2.5,
          fromPlayer: false,
          width: 0.3, height: 0.3,
          gravity: false,
        };
        state.projectiles.push(proj);
      }
      // Phase 2: dragon also charges
      if (mob.hp < mob.maxHp * 0.5 && mob.phase === 1) {
        mob.phase = 2;
        addMessage(state, "The Dragon enters a frenzy!", 0xFF2222);
      }
    } else if (mob.type === "mordred" && dist < 15) {
      // Mordred dark magic: homing projectiles + summon skeletons
      mob.specialTimer = 4 + Math.random() * 2;
      if (!mob.phase) mob.phase = 1;
      // Dark bolt
      const len2 = dist || 1;
      const proj: Projectile = {
        id: state.nextEntityId++,
        x: mob.x, y: mob.y + mob.height * 0.3,
        vx: (dx / len2) * 10,
        vy: (dy / len2) * 10,
        damage: 12,
        color: 0x6622AA,
        lifetime: 3,
        fromPlayer: false,
        width: 0.3, height: 0.3,
        gravity: false,
      };
      state.projectiles.push(proj);
      // Phase 2: summon skeletons
      if (mob.hp < mob.maxHp * 0.6 && mob.phase === 1) {
        mob.phase = 2;
        addMessage(state, "Mordred summons the undead!", 0x6622AA);
        // Spawn 2-3 skeletons
        for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
          const sx = mob.x + (Math.random() - 0.5) * 8;
          const sy = mob.y;
          if (!isSolid(state, Math.floor(sx), Math.floor(sy))) {
            state.mobs.push({
              id: state.nextEntityId++, type: "skeleton",
              x: sx, y: sy, vx: 0, vy: 0,
              hp: 22, maxHp: 22, facingRight: Math.random() > 0.5,
              onGround: false, aiState: "chase", aiTimer: 1,
              attackTimer: 0, hurtTimer: 0, despawnTimer: 30,
              width: 0.8, height: 1.5, isBoss: false,
            });
          }
        }
      }
    } else {
      mob.specialTimer = 2 + Math.random() * 3; // reset if out of range
    }
  }

  // Enemy projectile → player collision
  for (const proj of state.projectiles) {
    if (proj.fromPlayer) continue;
    const dx = Math.abs(proj.x - p.x);
    const dy = Math.abs(proj.y - p.y);
    if (dx < (proj.width + TB.PLAYER_WIDTH) / 2 && dy < (proj.height + TB.PLAYER_HEIGHT) / 2) {
      if (p.invulnTimer <= 0) {
        const dmg = Math.max(1, proj.damage - p.defense);
        p.hp -= dmg;
        p.invulnTimer = TB.INVULN_TIME * 0.5;
        const kbDir = Math.sign(proj.vx) || 1;
        p.vx += kbDir * 4;
        p.vy += 2;
        proj.lifetime = 0;
        // Fire projectiles apply burn
        if (proj.color === 0xFF4422) {
          applyStatusEffect(p.statusEffects, { type: "fire", duration: 2, tickTimer: 0, strength: 2 });
        }
        if (p.hp <= 0) {
          p.hp = 0;
          state.gameOver = true;
          addMessage(state, "You have fallen!", 0xFF4444);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// World events
// ---------------------------------------------------------------------------

function _updateWorldEvents(state: TerrariaState, dt: number): void {
  // Blood moon: triggers on some nights (day 3+)
  if (state.activeEvent === "none" && state.dayNumber >= 3) {
    // Check for dusk transition
    const t = state.timeOfDay;
    if (t > 0.74 && t < 0.76 && Math.random() < 0.15) {
      state.activeEvent = "blood_moon";
      state.eventTimer = TB.DAY_LENGTH * 0.5; // half a day
      state.eventData = { spawnCount: 0 };
      addMessage(state, "A Blood Moon is rising!", 0xFF2222);
    }
  }

  if (state.activeEvent === "blood_moon") {
    state.eventTimer -= dt;
    // Faster, more aggressive spawns during blood moon
    if (state.mobs.length < TB.MAX_MOBS + 10 && Math.random() < dt * 0.8) {
      const p = state.player;
      const angle = Math.random() * Math.PI * 2;
      const dist = TB.MOB_SPAWN_RADIUS_MIN + Math.random() * 10;
      const sx = p.x + Math.cos(angle) * dist;
      const sy = p.y + Math.sin(angle) * dist * 0.3;
      if (sx > 1 && sx < state.worldWidth - 1 && sy > 1 && sy < TB.WORLD_HEIGHT - 1 && !isSolid(state, Math.floor(sx), Math.floor(sy))) {
        const types = ["skeleton", "dark_knight", "saxon_warrior"];
        const type = types[Math.floor(Math.random() * types.length)];
        const def = MOB_DEFS[type];
        if (def) {
          state.mobs.push({
            id: state.nextEntityId++, type,
            x: sx, y: sy, vx: 0, vy: 0,
            hp: Math.floor(def.hp * 1.3), maxHp: Math.floor(def.hp * 1.3),
            facingRight: Math.random() > 0.5, onGround: false,
            aiState: "chase", aiTimer: 0,
            attackTimer: 0, hurtTimer: 0, despawnTimer: 60,
            width: def.width, height: def.height, isBoss: false,
          });
          state.eventData.spawnCount = (state.eventData.spawnCount ?? 0) + 1;
        }
      }
    }
    if (state.eventTimer <= 0) {
      state.activeEvent = "none";
      addMessage(state, "The Blood Moon fades...", 0xFF8888);
    }
  }
}

function _updateProjectiles(state: TerrariaState, dt: number): void {
  for (const proj of state.projectiles) {
    if (proj.gravity) {
      proj.vy -= TB.GRAVITY * 0.5 * dt;
    }
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.lifetime -= dt;

    // Check collision with blocks (check 2x2 area around projectile)
    const bx = Math.floor(proj.x);
    const by = Math.floor(proj.y);
    if (isSolid(state, bx, by) || isSolid(state, bx + (proj.vx > 0 ? 1 : -1), by) ||
        isSolid(state, bx, by + (proj.vy > 0 ? 1 : -1))) {
      proj.lifetime = 0;
      continue;
    }

    // Check collision with mobs (player projectiles)
    if (proj.fromPlayer) {
      for (const mob of state.mobs) {
        const dx = Math.abs(proj.x - mob.x);
        const dy = Math.abs(proj.y - mob.y);
        if (dx < (proj.width + mob.width) / 2 && dy < (proj.height + mob.height) / 2) {
          damageMob(state, mob, proj.damage);
          proj.lifetime = 0;
          break;
        }
      }
    }
  }

  state.projectiles = state.projectiles.filter(p => p.lifetime > 0);
}
