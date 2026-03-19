// ---------------------------------------------------------------------------
// Terraria – Combat system (melee, ranged, projectiles)
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";
import type { TerrariaState } from "../state/TerrariaState";
import { isSolid, addMessage } from "../state/TerrariaState";
import { getHeldItem } from "../state/TerrariaInventory";
import { ItemCategory } from "../state/TerrariaInventory";
import { ToolType } from "../config/TerrariaBlockDefs";
import type { Projectile } from "../state/TerrariaEntity";
import { MOB_DEFS } from "../config/TerrariaMobDefs";
import { damageMob } from "./TerrariaMobSystem";
import type { InputState } from "./TerrariaInputSystem";
import type { TerrariaCamera } from "../view/TerrariaCamera";

// ---------------------------------------------------------------------------
// Combat update
// ---------------------------------------------------------------------------

export function updateCombat(state: TerrariaState, input: InputState, camera: TerrariaCamera, dt: number): void {
  const p = state.player;

  // Melee attack
  if (input.attack && p.attackTimer <= 0 && !state.inventoryOpen && !state.paused) {
    const held = getHeldItem(p.inventory);
    if (held && held.category === ItemCategory.WEAPON) {
      const isSword = held.toolType === ToolType.SWORD;
      const damage = held.damage ?? 5;
      const reach = isSword ? 2.5 : 1.5;

      p.attackTimer = TB.ATTACK_COOLDOWN;

      // Check mobs in melee range
      for (const mob of state.mobs) {
        const dx = mob.x - p.x;
        const dy = mob.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > reach) continue;

        // Direction check: only hit mobs in facing direction (wide arc)
        const facingOK = p.facingRight ? dx > -0.5 : dx < 0.5;
        if (!facingOK) continue;

        damageMob(state, mob, damage);
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
          damage: damage,
          color: 0xCCCCCC,
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
          damage: damage,
          color: 0xAA44FF,
          lifetime: 4,
          fromPlayer: true,
          width: 0.3,
          height: 0.3,
          gravity: false,
        };
        state.projectiles.push(proj);
      }
    }
  }

  // Update projectiles
  _updateProjectiles(state, dt);

  // Contact damage from mobs
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
        if (p.hp <= 0) {
          p.hp = 0;
          state.gameOver = true;
          addMessage(state, "You have fallen!", 0xFF4444);
        }
      }
    }
  }

  // Mana regen
  if (p.mana < p.maxMana) {
    p.mana = Math.min(p.maxMana, p.mana + dt * 2);
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
