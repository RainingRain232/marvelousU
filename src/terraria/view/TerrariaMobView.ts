// ---------------------------------------------------------------------------
// Terraria – Mob/NPC sprite rendering
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import { TB } from "../config/TerrariaBalance";
import { MOB_DEFS } from "../config/TerrariaMobDefs";
import type { TerrariaState } from "../state/TerrariaState";
import type { TerrariaCamera } from "./TerrariaCamera";

const TS = TB.TILE_SIZE;

export class TerrariaMobView {
  readonly container = new Container();
  private _gfx = new Graphics();

  constructor() {
    this.container.addChild(this._gfx);
  }

  draw(state: TerrariaState, camera: TerrariaCamera, _dt: number): void {
    this._gfx.clear();

    // Draw mobs
    for (const mob of state.mobs) {
      const def = MOB_DEFS[mob.type];
      if (!def) continue;

      const { sx, sy } = camera.worldToScreen(mob.x, mob.y + mob.height / 2);
      const pw = mob.width * TS;
      const ph = mob.height * TS;

      // Hurt flash
      const color = mob.hurtTimer > 0 ? 0xFFFFFF : def.color;

      // Body
      this._gfx.rect(sx - pw / 2, sy - ph, pw, ph);
      this._gfx.fill(color);

      // Eyes
      const eyeOffset = mob.facingRight ? pw * 0.15 : -pw * 0.25;
      this._gfx.rect(sx + eyeOffset, sy - ph * 0.75, 2, 2);
      this._gfx.fill(0xFF0000);

      // HP bar (only if damaged)
      if (mob.hp < mob.maxHp) {
        const barW = pw + 4;
        const barH = 3;
        const barX = sx - barW / 2;
        const barY = sy - ph - 6;
        this._gfx.rect(barX, barY, barW, barH);
        this._gfx.fill(0x333333);
        this._gfx.rect(barX, barY, barW * (mob.hp / mob.maxHp), barH);
        this._gfx.fill(mob.isBoss ? 0xFF4444 : 0x44FF44);
      }

      // Boss name tag
      if (mob.isBoss) {
        // Small indicator above
        this._gfx.rect(sx - 2, sy - ph - 12, 4, 4);
        this._gfx.fill(0xFFD700);
      }
    }

    // Draw NPCs
    for (const npc of state.npcs) {
      const { sx, sy } = camera.worldToScreen(npc.x, npc.y + 0.75);
      const pw = 0.8 * TS;
      const ph = 1.5 * TS;

      // Body
      this._gfx.rect(sx - pw / 2, sy - ph, pw, ph * 0.6);
      this._gfx.fill(0x2266AA);

      // Head
      this._gfx.rect(sx - pw * 0.3, sy - ph, pw * 0.6, pw * 0.6);
      this._gfx.fill(0xFFCC99);

      // Legs
      this._gfx.rect(sx - pw * 0.3, sy - ph * 0.4, pw * 0.25, ph * 0.4);
      this._gfx.fill(0x8B6914);
      this._gfx.rect(sx + pw * 0.05, sy - ph * 0.4, pw * 0.25, ph * 0.4);
      this._gfx.fill(0x8B6914);

      // Name tag (small dot)
      this._gfx.rect(sx - 2, sy - ph - 6, 4, 4);
      this._gfx.fill(0x44FF44);
    }

    // Draw projectiles
    for (const proj of state.projectiles) {
      const { sx, sy } = camera.worldToScreen(proj.x, proj.y);
      this._gfx.rect(sx - 2, sy - 2, 4, 4);
      this._gfx.fill(proj.color);
    }

    // Draw dropped items
    for (const di of state.droppedItems) {
      const { sx, sy } = camera.worldToScreen(di.x, di.y);
      const bob = Math.sin(state.totalTime * 3 + di.id) * 2;
      this._gfx.rect(sx - 4, sy - 4 + bob, 8, 8);
      this._gfx.fill(di.item.color);
      this._gfx.rect(sx - 4, sy - 4 + bob, 8, 8);
      this._gfx.stroke({ color: 0xFFFFFF, width: 0.5, alpha: 0.5 });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
