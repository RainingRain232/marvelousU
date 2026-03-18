// ---------------------------------------------------------------------------
// Terraria – Mob/NPC sprite rendering (improved with animations)
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
  private _animTime = 0;

  constructor() {
    this.container.addChild(this._gfx);
  }

  draw(state: TerrariaState, camera: TerrariaCamera, dt: number): void {
    this._gfx.clear();
    this._animTime += dt;

    for (const mob of state.mobs) {
      const def = MOB_DEFS[mob.type];
      if (!def) continue;

      const { sx, sy } = camera.worldToScreen(mob.x, mob.y + mob.height / 2);
      const pw = mob.width * TS;
      const ph = mob.height * TS;
      const dir = mob.facingRight ? 1 : -1;

      // Hurt flash
      const isHurt = mob.hurtTimer > 0;
      const baseColor = isHurt ? 0xFFFFFF : def.color;

      // Walking animation
      const isWalking = Math.abs(mob.vx) > 0.3;
      const walkPhase = this._animTime * 6 + mob.id * 1.7;
      const legSwing = isWalking ? Math.sin(walkPhase) * 2.5 : 0;

      // Draw based on mob type category
      if (mob.type === "slime") {
        this._drawSlime(sx, sy, pw, ph, baseColor, walkPhase);
      } else if (mob.type === "cave_spider") {
        this._drawSpider(sx, sy, pw, ph, baseColor, walkPhase, dir);
      } else if (mob.type === "dragon") {
        this._drawDragon(sx, sy, pw, ph, baseColor, walkPhase, dir);
      } else if (mob.type === "wraith") {
        this._drawWraith(sx, sy, pw, ph, baseColor, walkPhase);
      } else if (mob.type === "deer") {
        this._drawDeer(sx, sy, pw, ph, baseColor, legSwing, dir);
      } else {
        // Humanoid (saxon, skeleton, dark_knight, mordred, construct)
        this._drawHumanoid(sx, sy, pw, ph, baseColor, legSwing, dir, mob.aiState === "attack", def);
      }

      // HP bar (only if damaged)
      if (mob.hp < mob.maxHp) {
        const barW = Math.max(pw + 6, 16);
        const barH = 3;
        const barX = sx - barW / 2;
        const barY = sy - ph - 8;
        this._gfx.rect(barX, barY, barW, barH);
        this._gfx.fill({ color: 0x111111, alpha: 0.8 });
        this._gfx.rect(barX, barY, barW * (mob.hp / mob.maxHp), barH);
        this._gfx.fill(mob.isBoss ? 0xFF2222 : mob.hp / mob.maxHp > 0.5 ? 0x44CC44 : 0xCCAA22);
      }

      // Boss crown
      if (mob.isBoss) {
        this._gfx.moveTo(sx - 4, sy - ph - 12);
        this._gfx.lineTo(sx - 3, sy - ph - 16);
        this._gfx.lineTo(sx, sy - ph - 13);
        this._gfx.lineTo(sx + 3, sy - ph - 16);
        this._gfx.lineTo(sx + 4, sy - ph - 12);
        this._gfx.closePath();
        this._gfx.fill(0xFFD700);
      }
    }

    // NPCs
    for (const npc of state.npcs) {
      const { sx, sy } = camera.worldToScreen(npc.x, npc.y + 0.75);
      const pw = 0.8 * TS;
      const ph = 1.5 * TS;
      const dir = npc.facingRight ? 1 : -1;

      // Body (colored robe)
      const robeColor = npc.type === "merlin" ? 0x6644CC :
                        npc.type === "lady_lake" ? 0x4488CC :
                        npc.type === "blacksmith" ? 0xAA6633 : 0xBBBBBB;
      this._gfx.rect(sx - pw / 2, sy - ph * 0.6, pw, ph * 0.35);
      this._gfx.fill(robeColor);

      // Head
      this._gfx.rect(sx - pw * 0.3, sy - ph, pw * 0.6, pw * 0.6);
      this._gfx.fill(0xFFCC99);

      // Hair/hat
      if (npc.type === "merlin") {
        // Wizard hat
        this._gfx.moveTo(sx - pw * 0.3, sy - ph);
        this._gfx.lineTo(sx, sy - ph - 8);
        this._gfx.lineTo(sx + pw * 0.3, sy - ph);
        this._gfx.closePath();
        this._gfx.fill(0x4422AA);
      }

      // Eyes
      this._gfx.rect(sx + dir * 2, sy - ph + pw * 0.3, 2, 2);
      this._gfx.fill(0x224488);

      // Legs
      this._gfx.rect(sx - pw * 0.25, sy - ph * 0.25, pw * 0.2, ph * 0.25);
      this._gfx.fill(0x6B5020);
      this._gfx.rect(sx + pw * 0.05, sy - ph * 0.25, pw * 0.2, ph * 0.25);
      this._gfx.fill(0x6B5020);

      // Name tag
      // (drawn as colored dot for perf, actual name in HUD on interact)
      this._gfx.circle(sx, sy - ph - 5, 2.5);
      this._gfx.fill(0x44FF44);
    }

    // Projectiles
    for (const proj of state.projectiles) {
      const { sx, sy } = camera.worldToScreen(proj.x, proj.y);
      if (proj.gravity) {
        // Arrow shape
        const angle = Math.atan2(-proj.vy, proj.vx);
        const len = 5;
        this._gfx.moveTo(sx + Math.cos(angle) * len, sy - Math.sin(angle) * len);
        this._gfx.lineTo(sx - Math.cos(angle) * len, sy + Math.sin(angle) * len);
        this._gfx.stroke({ color: proj.color, width: 2 });
      } else {
        // Magic orb
        this._gfx.circle(sx, sy, 3);
        this._gfx.fill({ color: proj.color, alpha: 0.9 });
        this._gfx.circle(sx, sy, 5);
        this._gfx.fill({ color: proj.color, alpha: 0.3 });
      }
    }

    // Dropped items
    for (const di of state.droppedItems) {
      const { sx, sy } = camera.worldToScreen(di.x, di.y);
      const bob = Math.sin(this._animTime * 3 + di.id) * 2;
      const glow = 0.3 + Math.sin(this._animTime * 4 + di.id) * 0.15;
      // Glow
      this._gfx.circle(sx, sy + bob, 6);
      this._gfx.fill({ color: di.item.color, alpha: glow });
      // Item
      this._gfx.rect(sx - 4, sy - 4 + bob, 8, 8);
      this._gfx.fill(di.item.color);
      this._gfx.rect(sx - 4, sy - 4 + bob, 8, 8);
      this._gfx.stroke({ color: 0xFFFFFF, width: 0.5, alpha: 0.4 });
    }
  }

  // --- Specialized mob renderers ---

  private _drawSlime(sx: number, sy: number, pw: number, ph: number, color: number, phase: number): void {
    const squish = 1 + Math.sin(phase * 2) * 0.15;
    const w = pw * squish;
    const h = ph / squish;
    // Blob body
    this._gfx.ellipse(sx, sy - h / 2, w / 2, h / 2);
    this._gfx.fill(color);
    // Eyes
    this._gfx.rect(sx - 3, sy - h * 0.5, 2, 2);
    this._gfx.fill(0xFFFFFF);
    this._gfx.rect(sx + 1, sy - h * 0.5, 2, 2);
    this._gfx.fill(0xFFFFFF);
    // Highlight
    this._gfx.ellipse(sx - w * 0.15, sy - h * 0.55, w * 0.15, h * 0.1);
    this._gfx.fill({ color: 0xFFFFFF, alpha: 0.25 });
  }

  private _drawSpider(sx: number, sy: number, pw: number, ph: number, color: number, phase: number, dir: number): void {
    // Body
    this._gfx.ellipse(sx, sy - ph * 0.3, pw * 0.45, ph * 0.35);
    this._gfx.fill(color);
    // Head
    this._gfx.ellipse(sx + dir * pw * 0.3, sy - ph * 0.3, pw * 0.2, ph * 0.2);
    this._gfx.fill(color);
    // Legs (4 pairs)
    for (let i = 0; i < 4; i++) {
      const lx = sx + (i - 1.5) * pw * 0.2;
      const legPhase = phase * 3 + i * 0.8;
      const ly = sy + Math.sin(legPhase) * 2;
      this._gfx.moveTo(lx, sy - ph * 0.2);
      this._gfx.lineTo(lx - 3, ly);
      this._gfx.stroke({ color, width: 1.5 });
      this._gfx.moveTo(lx, sy - ph * 0.2);
      this._gfx.lineTo(lx + 3, ly);
      this._gfx.stroke({ color, width: 1.5 });
    }
    // Red eyes
    this._gfx.rect(sx + dir * pw * 0.25, sy - ph * 0.35, 2, 2);
    this._gfx.fill(0xFF0000);
  }

  private _drawDragon(sx: number, sy: number, pw: number, ph: number, color: number, phase: number, dir: number): void {
    // Body
    this._gfx.ellipse(sx, sy - ph * 0.3, pw * 0.5, ph * 0.4);
    this._gfx.fill(color);
    // Head
    this._gfx.ellipse(sx + dir * pw * 0.5, sy - ph * 0.5, pw * 0.25, ph * 0.2);
    this._gfx.fill(color);
    // Wings
    const wingFlap = Math.sin(phase * 3) * 8;
    this._gfx.moveTo(sx, sy - ph * 0.5);
    this._gfx.lineTo(sx - pw * 0.6, sy - ph * 0.8 - wingFlap);
    this._gfx.lineTo(sx - pw * 0.3, sy - ph * 0.3);
    this._gfx.closePath();
    this._gfx.fill({ color: 0xCC1100, alpha: 0.8 });
    this._gfx.moveTo(sx, sy - ph * 0.5);
    this._gfx.lineTo(sx + pw * 0.6, sy - ph * 0.8 + wingFlap);
    this._gfx.lineTo(sx + pw * 0.3, sy - ph * 0.3);
    this._gfx.closePath();
    this._gfx.fill({ color: 0xCC1100, alpha: 0.8 });
    // Tail
    this._gfx.moveTo(sx - dir * pw * 0.4, sy - ph * 0.2);
    this._gfx.lineTo(sx - dir * pw * 0.8, sy - ph * 0.1 + Math.sin(phase * 2) * 3);
    this._gfx.stroke({ color, width: 3 });
    // Eye
    this._gfx.rect(sx + dir * pw * 0.55, sy - ph * 0.55, 3, 2);
    this._gfx.fill(0xFFFF00);
    // Fire breath hint
    if (Math.sin(phase) > 0.5) {
      this._gfx.circle(sx + dir * pw * 0.7, sy - ph * 0.45, 3);
      this._gfx.fill({ color: 0xFF6600, alpha: 0.6 });
    }
  }

  private _drawWraith(sx: number, sy: number, pw: number, ph: number, color: number, phase: number): void {
    const float = Math.sin(phase * 2) * 3;
    // Ghostly body
    this._gfx.ellipse(sx, sy - ph * 0.4 + float, pw * 0.4, ph * 0.5);
    this._gfx.fill({ color, alpha: 0.6 });
    // Wispy tail
    for (let i = 0; i < 3; i++) {
      const tx = sx + (i - 1) * pw * 0.15;
      const ty = sy + float;
      this._gfx.moveTo(tx, ty - ph * 0.1);
      this._gfx.lineTo(tx + Math.sin(phase * 3 + i) * 3, ty + ph * 0.15);
      this._gfx.stroke({ color, width: 2, alpha: 0.4 });
    }
    // Glowing eyes
    this._gfx.rect(sx - 3, sy - ph * 0.55 + float, 2, 2);
    this._gfx.fill(0xFFFFFF);
    this._gfx.rect(sx + 1, sy - ph * 0.55 + float, 2, 2);
    this._gfx.fill(0xFFFFFF);
  }

  private _drawDeer(sx: number, sy: number, pw: number, ph: number, color: number, legSwing: number, dir: number): void {
    // Body
    this._gfx.ellipse(sx, sy - ph * 0.4, pw * 0.45, ph * 0.3);
    this._gfx.fill(color);
    // Head
    this._gfx.ellipse(sx + dir * pw * 0.4, sy - ph * 0.6, pw * 0.18, ph * 0.18);
    this._gfx.fill(color);
    // Antlers
    this._gfx.moveTo(sx + dir * pw * 0.4, sy - ph * 0.75);
    this._gfx.lineTo(sx + dir * pw * 0.3, sy - ph * 0.95);
    this._gfx.lineTo(sx + dir * pw * 0.2, sy - ph * 0.85);
    this._gfx.stroke({ color: 0x8B6914, width: 1.5 });
    this._gfx.moveTo(sx + dir * pw * 0.4, sy - ph * 0.75);
    this._gfx.lineTo(sx + dir * pw * 0.5, sy - ph * 0.95);
    this._gfx.lineTo(sx + dir * pw * 0.55, sy - ph * 0.85);
    this._gfx.stroke({ color: 0x8B6914, width: 1.5 });
    // Legs
    const ls = legSwing;
    this._gfx.moveTo(sx - pw * 0.2, sy - ph * 0.15);
    this._gfx.lineTo(sx - pw * 0.2 + ls, sy);
    this._gfx.stroke({ color, width: 2 });
    this._gfx.moveTo(sx + pw * 0.2, sy - ph * 0.15);
    this._gfx.lineTo(sx + pw * 0.2 - ls, sy);
    this._gfx.stroke({ color, width: 2 });
    // Eye
    this._gfx.rect(sx + dir * pw * 0.45, sy - ph * 0.62, 1.5, 1.5);
    this._gfx.fill(0x000000);
  }

  private _drawHumanoid(sx: number, sy: number, pw: number, ph: number, color: number, legSwing: number, dir: number, attacking: boolean, def: { name: string }): void {
    const hw = pw / 2;
    // Legs
    this._gfx.rect(sx - hw * 0.5 + legSwing, sy - ph * 0.3, pw * 0.25, ph * 0.3);
    this._gfx.fill(0x5A4018);
    this._gfx.rect(sx + hw * 0.1 - legSwing, sy - ph * 0.3, pw * 0.25, ph * 0.3);
    this._gfx.fill(0x5A4018);
    // Body
    this._gfx.rect(sx - hw, sy - ph * 0.65, pw, ph * 0.35);
    this._gfx.fill(color);
    // Head
    this._gfx.rect(sx - hw * 0.6, sy - ph, pw * 0.6, pw * 0.7);
    this._gfx.fill(0xDDBC99);
    // Eyes (red for hostile)
    this._gfx.rect(sx + dir * hw * 0.15, sy - ph + pw * 0.3, 2, 2);
    this._gfx.fill(def.name.includes("Skeleton") ? 0xFF6600 : 0xFF0000);
    // Weapon arm (if attacking)
    if (attacking) {
      const armEnd = sx + dir * pw * 0.8;
      this._gfx.moveTo(sx + dir * hw * 0.4, sy - ph * 0.5);
      this._gfx.lineTo(armEnd, sy - ph * 0.7);
      this._gfx.stroke({ color: 0xAAAAAA, width: 2 });
    }
    // Helmet/armor accent for dark_knight
    if (def.name.includes("Dark Knight") || def.name.includes("Construct")) {
      this._gfx.rect(sx - hw * 0.7, sy - ph - 2, pw * 0.7, 4);
      this._gfx.fill(0x444466);
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
