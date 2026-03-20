// ---------------------------------------------------------------------------
// Terraria – Mob/NPC/Projectile/Item rendering (detailed polygon art)
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
  private _t = 0;

  constructor() { this.container.addChild(this._gfx); }

  draw(state: TerrariaState, camera: TerrariaCamera, _dt: number): void {
    const g = this._gfx;
    g.clear();
    this._t += _dt;
    const t = this._t;

    // ---- MOBS ----
    for (const mob of state.mobs) {
      const def = MOB_DEFS[mob.type];
      if (!def) continue;
      const { sx, sy } = camera.worldToScreen(mob.x, mob.y + mob.height / 2);
      const pw = mob.width * TS;
      const ph = mob.height * TS;
      const d = mob.facingRight ? 1 : -1;
      const hurt = mob.hurtTimer > 0;
      const c = hurt ? 0xFFFFFF : def.color;
      const walk = Math.abs(mob.vx) > 0.3;
      const wp = t * 6 + mob.id * 1.7;
      const ls = walk ? Math.sin(wp) * 3 : 0;

      if (mob.type === "slime") this._slime(g, sx, sy, pw, ph, c, wp);
      else if (mob.type === "cave_spider") this._spider(g, sx, sy, pw, ph, c, wp, d);
      else if (mob.type === "dragon") this._dragon(g, sx, sy, pw, ph, c, wp, d, t);
      else if (mob.type === "wraith") this._wraith(g, sx, sy, pw, ph, c, wp);
      else if (mob.type === "deer") this._deer(g, sx, sy, pw, ph, c, ls, d, wp);
      else if (mob.type === "wolf") this._wolf(g, sx, sy, pw, ph, c, ls, d, wp);
      else if (mob.type === "skeleton") this._skeleton(g, sx, sy, pw, ph, c, ls, d, mob.aiState === "attack", wp);
      else if (mob.type === "mordred") this._mordred(g, sx, sy, pw, ph, c, ls, d, mob.aiState === "attack", wp);
      else if (mob.type === "saxon_warrior") this._saxonWarrior(g, sx, sy, pw, ph, c, ls, d, mob.aiState === "attack", wp);
      else if (mob.type === "dark_knight") this._darkKnight(g, sx, sy, pw, ph, c, ls, d, mob.aiState === "attack", wp);
      else if (mob.type === "construct") this._construct(g, sx, sy, pw, ph, c, ls, d, mob.aiState === "attack", wp, t);
      else this._humanoid(g, sx, sy, pw, ph, c, ls, d, mob.aiState === "attack", def);

      // HP bar
      if (mob.hp < mob.maxHp) {
        const bw = Math.max(pw + 8, 18);
        const bx = sx - bw / 2; const by = sy - ph - 9;
        g.rect(bx - 0.5, by - 0.5, bw + 1, 4); g.fill({ color: 0x000000, alpha: 0.5 });
        g.rect(bx, by, bw, 3); g.fill(0x222222);
        const pct = mob.hp / mob.maxHp;
        const hpColor = mob.isBoss ? 0xFF2222 : pct > 0.6 ? 0x44CC44 : pct > 0.3 ? 0xCCAA22 : 0xCC2222;
        g.rect(bx, by, bw * pct, 3); g.fill(hpColor);
      }
      // Status effect indicators
      if (mob.statusEffects && mob.statusEffects.length > 0) {
        let fxIdx = 0;
        for (const fx of mob.statusEffects) {
          const fxX = sx - 6 + fxIdx * 6;
          const fxY = sy - ph - 4;
          if (fx.type === "poison") {
            // Green bubbles
            g.circle(fxX, fxY + Math.sin(t * 4 + fxIdx) * 1, 2);
            g.fill({ color: 0x44DD44, alpha: 0.6 });
            g.circle(fxX + 1, fxY - 1, 0.8);
            g.fill({ color: 0x88FF88, alpha: 0.4 });
          } else if (fx.type === "fire") {
            // Flame lick
            const f1 = Math.sin(t * 8 + fxIdx) * 1;
            g.moveTo(fxX - 1.5, fxY + 2);
            g.quadraticCurveTo(fxX + f1, fxY - 2, fxX + 1.5, fxY + 2);
            g.closePath();
            g.fill({ color: 0xFF6622, alpha: 0.7 });
            g.circle(fxX + f1 * 0.5, fxY - 0.5, 0.8);
            g.fill({ color: 0xFFDD44, alpha: 0.5 });
          } else if (fx.type === "freeze") {
            // Ice crystal
            g.moveTo(fxX, fxY - 2.5); g.lineTo(fxX + 2, fxY);
            g.lineTo(fxX, fxY + 2.5); g.lineTo(fxX - 2, fxY);
            g.closePath();
            g.fill({ color: 0x88CCFF, alpha: 0.6 });
            g.circle(fxX, fxY, 0.8);
            g.fill({ color: 0xFFFFFF, alpha: 0.4 });
          }
          fxIdx++;
        }
      }
      // Boss crown
      if (mob.isBoss) {
        const cy = sy - ph - 14;
        g.moveTo(sx - 5, cy + 5); g.lineTo(sx - 4, cy);
        g.lineTo(sx - 1, cy + 3); g.lineTo(sx + 2, cy);
        g.lineTo(sx + 5, cy + 5); g.closePath(); g.fill(0xFFD700);
        // Gem
        g.circle(sx + 0.5, cy + 2, 1); g.fill(0xFF2222);
      }
    }

    // ---- NPCs ----
    for (const npc of state.npcs) {
      const { sx, sy } = camera.worldToScreen(npc.x, npc.y + 0.75);
      const pw = 0.8 * TS; const ph = 1.5 * TS;
      const d = npc.facingRight ? 1 : -1;
      this._npc(g, sx, sy, pw, ph, d, npc.type, t);
    }

    // ---- PROJECTILES WITH TRAILS ----
    for (const proj of state.projectiles) {
      const { sx, sy } = camera.worldToScreen(proj.x, proj.y);
      const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
      const a = Math.atan2(-proj.vy, proj.vx);

      if (proj.gravity) {
        // Arrow with motion trail
        const len = 6;
        const tx = sx + Math.cos(a) * len; const ty = sy - Math.sin(a) * len;
        const bx = sx - Math.cos(a) * len; const by = sy + Math.sin(a) * len;

        // Motion trail (fading line behind arrow)
        const trailLen = Math.min(speed * 0.4, 20);
        const trailX = sx - Math.cos(a) * trailLen;
        const trailY = sy + Math.sin(a) * trailLen;
        g.moveTo(bx, by); g.lineTo(trailX, trailY);
        g.stroke({ color: 0x8B6914, width: 0.5, alpha: 0.3 });

        // Shaft
        g.moveTo(bx, by); g.lineTo(tx, ty);
        g.stroke({ color: 0x8B6914, width: 1.5 });
        // Arrowhead
        const px2 = Math.sin(a) * 2.5; const py2 = Math.cos(a) * 2.5;
        g.moveTo(tx + px2, ty + py2);
        g.lineTo(tx + Math.cos(a) * 4, ty - Math.sin(a) * 4);
        g.lineTo(tx - px2, ty - py2); g.closePath(); g.fill(0xCCCCCC);
        // Metallic highlight on head
        g.moveTo(tx, ty);
        g.lineTo(tx + Math.cos(a) * 3, ty - Math.sin(a) * 3);
        g.stroke({ color: 0xFFFFFF, width: 0.5, alpha: 0.4 });
        // Fletching
        g.moveTo(bx + px2 * 0.7, by + py2 * 0.7);
        g.lineTo(bx - Math.cos(a) * 3, by + Math.sin(a) * 3);
        g.lineTo(bx - px2 * 0.7, by - py2 * 0.7);
        g.closePath(); g.fill({ color: 0xCC2222, alpha: 0.7 });
      } else {
        // Magic orb with star sparkles and diamond trail
        // Trail (diamond shapes fading behind projectile)
        for (let i = 1; i <= 5; i++) {
          const td = i * 3.5;
          const tx2 = sx - Math.cos(a) * td;
          const ty2 = sy + Math.sin(a) * td;
          const ta = 0.22 - i * 0.04;
          const ts2 = 2.5 - i * 0.4;
          // Diamond shape
          g.moveTo(tx2, ty2 - ts2); g.lineTo(tx2 + ts2 * 0.7, ty2);
          g.lineTo(tx2, ty2 + ts2); g.lineTo(tx2 - ts2 * 0.7, ty2); g.closePath();
          g.fill({ color: proj.color, alpha: ta });
        }
        // Outer glow ring
        g.circle(sx, sy, 8); g.fill({ color: proj.color, alpha: 0.08 });
        // Mid glow
        g.circle(sx, sy, 5); g.fill({ color: proj.color, alpha: 0.3 });
        // Faceted inner orb (octagon)
        for (let i = 0; i < 8; i++) {
          const oa = (i / 8) * Math.PI * 2;
          const ox2 = sx + Math.cos(oa) * 2.5;
          const oy = sy + Math.sin(oa) * 2.5;
          g.moveTo(sx, sy); g.lineTo(ox2, oy);
          g.lineTo(sx + Math.cos(oa + Math.PI / 8) * 2.5, sy + Math.sin(oa + Math.PI / 8) * 2.5);
          g.closePath();
          g.fill({ color: i % 2 === 0 ? proj.color : 0xFFFFFF, alpha: i % 2 === 0 ? 0.5 : 0.3 });
        }
        // Bright core
        g.circle(sx, sy, 1.5); g.fill({ color: 0xFFFFFF, alpha: 0.95 });
        // 6-pointed star sparkles (rotating)
        for (let i = 0; i < 6; i++) {
          const sa = t * 5 + i * Math.PI / 3;
          const sr = 6 + Math.sin(t * 3 + i * 1.5) * 2;
          const spx = sx + Math.cos(sa) * sr;
          const spy = sy + Math.sin(sa) * sr;
          const ss = 1.2 + Math.sin(t * 8 + i) * 0.4;
          // 4-point star
          g.moveTo(spx, spy - ss); g.lineTo(spx + ss * 0.3, spy);
          g.lineTo(spx, spy + ss); g.lineTo(spx - ss * 0.3, spy); g.closePath();
          g.fill({ color: proj.color, alpha: 0.6 });
          g.moveTo(spx - ss, spy); g.lineTo(spx, spy + ss * 0.3);
          g.lineTo(spx + ss, spy); g.lineTo(spx, spy - ss * 0.3); g.closePath();
          g.fill({ color: 0xFFFFFF, alpha: 0.25 });
        }
        // Pulse flash
        if (Math.sin(t * 12) > 0.6) {
          g.circle(sx, sy, 3); g.fill({ color: 0xFFFFFF, alpha: 0.4 });
        }
      }
    }

    // ---- DROPPED ITEMS ----
    for (const di of state.droppedItems) {
      const { sx, sy } = camera.worldToScreen(di.x, di.y);
      const bob = Math.sin(t * 3 + di.id) * 2;
      const pulse = 0.25 + Math.sin(t * 4 + di.id) * 0.15;
      const rot = Math.sin(t * 1.5 + di.id * 2) * 0.15;
      const ic = di.item.color;
      // Ground shadow
      g.ellipse(sx, sy + 4, 4, 1.2);
      g.fill({ color: 0x000000, alpha: 0.12 });
      // Pickup glow ring (pulsing)
      g.circle(sx, sy + bob, 8);
      g.fill({ color: ic, alpha: pulse * 0.6 });
      g.circle(sx, sy + bob, 5.5);
      g.fill({ color: ic, alpha: pulse * 0.3 });

      // Item shape varies by category
      const cat = di.item.category;
      if (cat === 0 /* BLOCK */) {
        // Mini block (3D cube)
        const bs = 4;
        const bx = sx - bs / 2;
        const by = sy - bs / 2 + bob;
        // Top face
        g.moveTo(bx, by); g.lineTo(bx + bs, by);
        g.lineTo(bx + bs + 1.5, by - 1.5); g.lineTo(bx + 1.5, by - 1.5);
        g.closePath(); g.fill({ color: _lighten(ic, 0.2), alpha: 0.9 });
        // Front face
        g.rect(bx, by, bs, bs); g.fill(ic);
        // Right face
        g.moveTo(bx + bs, by); g.lineTo(bx + bs + 1.5, by - 1.5);
        g.lineTo(bx + bs + 1.5, by + bs - 1.5); g.lineTo(bx + bs, by + bs);
        g.closePath(); g.fill({ color: _darken2(ic, 0.2), alpha: 0.9 });
        // Highlight
        g.rect(bx, by, bs, 1); g.fill({ color: 0xFFFFFF, alpha: 0.12 });
      } else if (cat === 1 /* TOOL */ || cat === 2 /* WEAPON */) {
        // Tool/weapon shape (handle + head)
        const len = 6;
        const angle = -Math.PI * 0.25 + rot;
        const tipX = sx + Math.cos(angle) * len;
        const tipY = sy + bob - Math.sin(angle) * len;
        // Handle
        g.moveTo(sx, sy + bob); g.lineTo(tipX, tipY);
        g.stroke({ color: 0x8B6914, width: 1.5 });
        // Head
        const perpX = Math.sin(angle) * 3;
        const perpY = Math.cos(angle) * 3;
        g.moveTo(tipX - perpX, tipY - perpY);
        g.lineTo(tipX + Math.cos(angle) * 2, tipY - Math.sin(angle) * 2);
        g.lineTo(tipX + perpX, tipY + perpY);
        g.closePath(); g.fill(ic);
        // Specular on head
        g.circle(tipX, tipY, 1); g.fill({ color: 0xFFFFFF, alpha: 0.25 });
      } else {
        // Default diamond shape (materials, misc)
        g.moveTo(sx, sy - 5 + bob); g.lineTo(sx + 4, sy + bob);
        g.lineTo(sx, sy + 5 + bob); g.lineTo(sx - 4, sy + bob);
        g.closePath(); g.fill(ic);
        // Facet highlight
        g.moveTo(sx, sy - 5 + bob); g.lineTo(sx + 4, sy + bob); g.lineTo(sx, sy + bob);
        g.closePath(); g.fill({ color: 0xFFFFFF, alpha: 0.12 });
        // Specular
        g.circle(sx - 1, sy - 1.5 + bob, 1.2); g.fill({ color: 0xFFFFFF, alpha: 0.3 });
      }
    }
  }

  // ===========================================================================
  // SLIME — bouncy blob with internal organs
  // ===========================================================================
  private _slime(g: Graphics, sx: number, sy: number, pw: number, ph: number, c: number, wp: number): void {
    const sq = 1 + Math.sin(wp * 2) * 0.18;
    const jiggle = Math.sin(wp * 3.7) * 0.08;
    const w = pw * (sq + jiggle) * 0.55; const h = ph * 0.55 / (sq + jiggle * 0.5);
    // Ground shadow (deforms with body)
    g.ellipse(sx, sy, w * 0.85, 2.5); g.fill({ color: 0x000000, alpha: 0.15 });
    // Slime trail (behind body)
    g.ellipse(sx - Math.sign(Math.sin(wp)) * 3, sy + 0.5, w * 0.6, 1.2);
    g.fill({ color: c, alpha: 0.08 });
    // Body (main shape with slight deformation)
    g.moveTo(sx - w, sy);
    g.quadraticCurveTo(sx - w * 1.05, sy - h * 0.8, sx - w * 0.5, sy - h * 1.6 + jiggle * 3);
    g.quadraticCurveTo(sx, sy - h * 1.8 + jiggle * 5, sx + w * 0.5, sy - h * 1.6 + jiggle * 3);
    g.quadraticCurveTo(sx + w * 1.05, sy - h * 0.8, sx + w, sy);
    g.closePath(); g.fill(c);
    // Body edge highlight (rim light)
    g.moveTo(sx - w * 0.8, sy - h * 0.3);
    g.quadraticCurveTo(sx - w * 0.9, sy - h * 1.2, sx - w * 0.3, sy - h * 1.6);
    g.stroke({ color: 0xFFFFFF, width: 1, alpha: 0.12 });
    // Internal membrane layers
    g.ellipse(sx - w * 0.1, sy - h * 0.9, w * 0.7, h * 0.6);
    g.fill({ color: 0xFFFFFF, alpha: 0.06 });
    g.ellipse(sx + w * 0.05, sy - h * 0.7, w * 0.5, h * 0.4);
    g.fill({ color: 0xFFFFFF, alpha: 0.04 });
    // Inner highlight (top-left specular)
    g.ellipse(sx - w * 0.25, sy - h * 1.35, w * 0.35, h * 0.25);
    g.fill({ color: 0xFFFFFF, alpha: 0.22 });
    g.ellipse(sx - w * 0.2, sy - h * 1.4, w * 0.15, h * 0.1);
    g.fill({ color: 0xFFFFFF, alpha: 0.15 });
    // Nucleus (darker core organ, floating)
    const nucX = sx + w * 0.1 + Math.sin(wp * 1.5) * w * 0.1;
    const nucY = sy - h * 0.7 + Math.cos(wp * 1.2) * h * 0.1;
    g.ellipse(nucX, nucY, w * 0.22, h * 0.22);
    g.fill({ color: 0x000000, alpha: 0.12 });
    g.ellipse(nucX - 1, nucY - 1, w * 0.08, h * 0.08);
    g.fill({ color: 0x000000, alpha: 0.06 });
    // Small organelles (floating particles inside body)
    for (let i = 0; i < 4; i++) {
      const ox = sx + Math.sin(wp * 0.8 + i * 1.5) * w * 0.3;
      const oy = sy - h * (0.4 + i * 0.25) + Math.cos(wp * 0.6 + i * 2) * h * 0.1;
      g.circle(ox, oy, 1 + (i % 2) * 0.5);
      g.fill({ color: 0x000000, alpha: 0.05 });
    }
    // Eyes (with iris and pupil detail)
    const blinkSq = Math.sin(wp * 0.15) > 0.95 ? 0.2 : 1; // occasional blink
    for (const [ex, ew] of [[-0.25, 2.2], [0.15, 2]] as [number, number][]) {
      const eyeX = sx + w * ex;
      const eyeY = sy - h * 1.05;
      g.ellipse(eyeX, eyeY, ew, 2.5 * blinkSq); g.fill(0xFFFFFF);
      if (blinkSq > 0.5) {
        g.circle(eyeX + 0.5, eyeY, 1.1 * blinkSq); g.fill(0x222244);
        g.circle(eyeX + 0.7, eyeY, 0.5 * blinkSq); g.fill(0x111111);
        g.circle(eyeX + 0.2, eyeY - 0.5 * blinkSq, 0.3); g.fill({ color: 0xFFFFFF, alpha: 0.4 });
      }
    }
    // Mouth (varies with state)
    g.moveTo(sx - w * 0.15, sy - h * 0.78);
    g.quadraticCurveTo(sx, sy - h * 0.63, sx + w * 0.15, sy - h * 0.78);
    g.stroke({ color: 0x000000, width: 0.8, alpha: 0.25 });
    // Drool drop
    if (Math.sin(wp * 0.4) > 0.5) {
      const droolY = sy - h * 0.6 + Math.sin(wp * 2) * 1;
      g.circle(sx + w * 0.05, droolY, 0.8);
      g.fill({ color: c, alpha: 0.3 });
    }
  }

  // ===========================================================================
  // SPIDER — segmented body, jointed legs, fangs
  // ===========================================================================
  private _spider(g: Graphics, sx: number, sy: number, pw: number, ph: number, c: number, wp: number, d: number): void {
    const bw = pw * 0.4; const bh = ph * 0.35;
    const hw = pw * 0.22; const hh = ph * 0.22;
    const headX = sx + d * pw * 0.32;
    // Shadow
    g.ellipse(sx, sy, pw * 0.4, 1.5); g.fill({ color: 0x000000, alpha: 0.12 });
    // Spinnerets (at rear of abdomen)
    const spX = sx - d * pw * 0.35;
    g.moveTo(spX, sy - bh * 0.3);
    g.lineTo(spX - d * 2, sy - bh * 0.1);
    g.stroke({ color: c, width: 1 });
    g.moveTo(spX, sy - bh * 0.4);
    g.lineTo(spX - d * 3, sy - bh * 0.3);
    g.stroke({ color: c, width: 0.8 });
    // Silk thread trailing
    g.moveTo(spX - d * 3, sy - bh * 0.3);
    g.bezierCurveTo(spX - d * 6, sy - bh * 0.1, spX - d * 8, sy, spX - d * 10, sy + 2);
    g.stroke({ color: 0xDDDDDD, width: 0.4, alpha: 0.15 });
    // Abdomen (larger, textured)
    g.ellipse(sx - d * pw * 0.1, sy - bh, bw, bh); g.fill(c);
    // Abdomen markings (hourglass/skull pattern)
    g.ellipse(sx - d * pw * 0.1, sy - bh * 1.15, bw * 0.2, bh * 0.15);
    g.fill({ color: 0xFF2222, alpha: 0.3 });
    g.ellipse(sx - d * pw * 0.1, sy - bh * 0.85, bw * 0.15, bh * 0.1);
    g.fill({ color: 0xFF2222, alpha: 0.2 });
    // Abdomen texture (fine hairs)
    for (let i = 0; i < 6; i++) {
      const hx2 = sx - d * pw * 0.1 + Math.cos(i * 1.05) * bw * 0.7;
      const hy2 = sy - bh + Math.sin(i * 1.05) * bh * 0.7;
      g.moveTo(hx2, hy2);
      g.lineTo(hx2 + Math.cos(i * 1.05) * 1.5, hy2 + Math.sin(i * 1.05) * 1.5);
      g.stroke({ color: c, width: 0.4, alpha: 0.3 });
    }
    // Abdomen highlight
    g.ellipse(sx - d * pw * 0.15, sy - bh * 1.25, bw * 0.25, bh * 0.15);
    g.fill({ color: 0xFFFFFF, alpha: 0.08 });
    // Cephalothorax (head segment)
    g.ellipse(headX, sy - hh * 0.8, hw, hh); g.fill(c);
    g.ellipse(headX - d * 1, sy - hh * 1.0, hw * 0.4, hh * 0.3);
    g.fill({ color: 0xFFFFFF, alpha: 0.06 });
    // 4 leg pairs with knee joints + hair spines
    for (let i = 0; i < 4; i++) {
      const baseX = sx + (i - 1.5) * pw * 0.18;
      const lp = wp * 3 + i * 0.9;
      const footDy = Math.sin(lp) * 2;
      for (const side of [-1, 1]) {
        const kneeX = baseX + side * pw * 0.2;
        const kneeY = sy - ph * 0.25 - Math.abs(Math.sin(lp + side)) * 2;
        const footX = kneeX + side * pw * 0.15;
        const footY = sy + footDy;
        // Upper segment (coxa)
        g.moveTo(baseX, sy - bh * 0.5);
        g.lineTo(kneeX, kneeY);
        g.stroke({ color: c, width: 1.5 });
        // Lower segment (tarsus)
        g.moveTo(kneeX, kneeY);
        g.lineTo(footX, footY);
        g.stroke({ color: c, width: 1.2 });
        // Knee joint
        g.circle(kneeX, kneeY, 1); g.fill(c);
        // Hair spines on legs
        const midX = (baseX + kneeX) / 2;
        const midY = (sy - bh * 0.5 + kneeY) / 2;
        g.moveTo(midX, midY);
        g.lineTo(midX + side * 1.5, midY - 1.5);
        g.stroke({ color: c, width: 0.5, alpha: 0.4 });
        // Foot claw
        g.moveTo(footX, footY);
        g.lineTo(footX + side * 1, footY + 1);
        g.stroke({ color: 0x333333, width: 0.6 });
      }
    }
    // Chelicerae (fangs - polygon shapes, not just lines)
    for (const fx of [-1, 1]) {
      const fangX = headX + d * hw * (0.2 + fx * 0.15);
      g.moveTo(fangX, sy - hh * 0.4);
      g.lineTo(fangX + d * 0.5, sy - hh * 0.2);
      g.lineTo(fangX + d * hw * 0.2, sy + 1.5);
      g.lineTo(fangX - d * 0.5, sy - hh * 0.2);
      g.closePath();
      g.fill(0xDDDDCC);
      // Venom droplet at tip
      g.circle(fangX + d * hw * 0.15, sy + 1, 0.6);
      g.fill({ color: 0x44DD44, alpha: 0.3 });
    }
    // Eyes (6 — two rows of 3)
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 3; i++) {
        const ex = headX + d * (hw * 0.05 + i * 1.8);
        const ey = sy - hh * (0.95 + row * 0.25) - i * 0.3;
        const eSize = 1.3 - row * 0.3 - i * 0.1;
        g.circle(ex, ey, eSize); g.fill(0xFF0000);
        g.circle(ex - 0.2, ey - 0.2, eSize * 0.3);
        g.fill({ color: 0xFFFFFF, alpha: 0.3 });
      }
    }
    // Pedipalps (small feelers near mouth)
    g.moveTo(headX + d * hw * 0.4, sy - hh * 0.5);
    g.lineTo(headX + d * hw * 0.6, sy - hh * 0.6);
    g.stroke({ color: c, width: 0.8 });
    g.moveTo(headX + d * hw * 0.35, sy - hh * 0.4);
    g.lineTo(headX + d * hw * 0.55, sy - hh * 0.55);
    g.stroke({ color: c, width: 0.8 });
  }

  // ===========================================================================
  // DRAGON — massive winged beast with scales, horns, fire
  // ===========================================================================
  private _dragon(g: Graphics, sx: number, sy: number, pw: number, ph: number, c: number, wp: number, d: number, t: number): void {
    const wingFlap = Math.sin(wp * 2.5) * 12;
    const tailWave = Math.sin(wp * 1.5) * 5;
    const breathCycle = Math.sin(t * 2);

    // Tail (segmented curve)
    const tailBaseX = sx - d * pw * 0.4;
    const tailBaseY = sy - ph * 0.15;
    g.moveTo(tailBaseX, tailBaseY);
    g.bezierCurveTo(
      tailBaseX - d * pw * 0.3, tailBaseY + tailWave,
      tailBaseX - d * pw * 0.6, tailBaseY - 3 + tailWave * 0.5,
      tailBaseX - d * pw * 0.9, tailBaseY + tailWave * 0.3,
    );
    g.stroke({ color: c, width: 4 });
    // Tail spade
    const tsx = tailBaseX - d * pw * 0.9; const tsy = tailBaseY + tailWave * 0.3;
    g.moveTo(tsx, tsy - 3); g.lineTo(tsx - d * 5, tsy);
    g.lineTo(tsx, tsy + 3); g.closePath(); g.fill(0xAA1100);

    // Wings (bat-like membrane with finger bones)
    for (const side of [-1, 1]) {
      const wingX = sx + side * pw * 0.05;
      const wingY = sy - ph * 0.55;
      const tipX = wingX + side * pw * 0.7;
      const tipY = wingY - ph * 0.3 - wingFlap * side;
      const midX = wingX + side * pw * 0.45;
      const midY = wingY - ph * 0.15 - wingFlap * side * 0.6;
      // Membrane
      g.moveTo(wingX, wingY);
      g.lineTo(tipX, tipY);
      g.lineTo(midX, midY + ph * 0.3);
      g.lineTo(wingX, wingY + ph * 0.15);
      g.closePath();
      g.fill({ color: 0xBB1100, alpha: 0.7 });
      // Finger bones
      g.moveTo(wingX, wingY); g.lineTo(tipX, tipY);
      g.stroke({ color: 0x881100, width: 1.5 });
      g.moveTo(wingX, wingY); g.lineTo(midX, midY);
      g.stroke({ color: 0x881100, width: 1.5 });
    }

    // Body (large oval)
    g.ellipse(sx, sy - ph * 0.3, pw * 0.5, ph * 0.38); g.fill(c);
    // Belly scales (lighter stripe)
    g.ellipse(sx, sy - ph * 0.2, pw * 0.25, ph * 0.28);
    g.fill({ color: 0xFF6644, alpha: 0.3 });
    // Scale lines
    for (let i = 0; i < 4; i++) {
      const scaleY = sy - ph * 0.45 + i * ph * 0.08;
      g.moveTo(sx - pw * 0.3, scaleY);
      g.quadraticCurveTo(sx, scaleY + 2, sx + pw * 0.3, scaleY);
      g.stroke({ color: 0x000000, width: 0.5, alpha: 0.15 });
    }

    // Neck + Head
    const headX = sx + d * pw * 0.55; const headY = sy - ph * 0.55;
    // Neck
    g.moveTo(sx + d * pw * 0.2, sy - ph * 0.5);
    g.quadraticCurveTo(headX - d * pw * 0.1, headY + ph * 0.15, headX, headY);
    g.stroke({ color: c, width: 5 });
    // Head (elongated)
    g.ellipse(headX, headY, pw * 0.22, ph * 0.15); g.fill(c);
    // Snout
    g.ellipse(headX + d * pw * 0.2, headY + ph * 0.02, pw * 0.12, ph * 0.08);
    g.fill(c);
    // Horns
    g.moveTo(headX - d * pw * 0.05, headY - ph * 0.12);
    g.lineTo(headX - d * pw * 0.15, headY - ph * 0.25);
    g.stroke({ color: 0x444444, width: 2 });
    g.moveTo(headX + d * pw * 0.05, headY - ph * 0.12);
    g.lineTo(headX, headY - ph * 0.22);
    g.stroke({ color: 0x444444, width: 1.5 });
    // Eye (slit pupil)
    g.ellipse(headX + d * pw * 0.1, headY - ph * 0.03, 2.5, 2); g.fill(0xFFDD00);
    g.ellipse(headX + d * pw * 0.1, headY - ph * 0.03, 0.8, 1.8); g.fill(0x111100);
    // Nostril
    g.circle(headX + d * pw * 0.25, headY + ph * 0.02, 1); g.fill(0x111111);

    // Fire breath
    if (breathCycle > 0.3) {
      const fireAlpha = (breathCycle - 0.3) * 1.2;
      const fx = headX + d * pw * 0.35;
      const fy = headY + ph * 0.02;
      g.ellipse(fx + d * 4, fy, 5, 3); g.fill({ color: 0xFF6600, alpha: fireAlpha * 0.5 });
      g.ellipse(fx + d * 8, fy, 8, 5); g.fill({ color: 0xFF4400, alpha: fireAlpha * 0.3 });
      g.ellipse(fx + d * 2, fy, 3, 2); g.fill({ color: 0xFFFF00, alpha: fireAlpha * 0.6 });
    }

    // Legs (stubby but clawed)
    for (const lx of [-1, 1]) {
      const legX = sx + lx * pw * 0.25;
      g.moveTo(legX, sy + ph * 0.05);
      g.lineTo(legX + lx * 2, sy + ph * 0.12);
      g.lineTo(legX + lx * 4, sy + ph * 0.08);
      g.stroke({ color: c, width: 3 });
      // Claws
      g.moveTo(legX + lx * 4, sy + ph * 0.08);
      g.lineTo(legX + lx * 6, sy + ph * 0.1);
      g.stroke({ color: 0x444444, width: 1 });
    }
  }

  // ===========================================================================
  // WRAITH — ethereal, flowing robes, skull face
  // ===========================================================================
  private _wraith(g: Graphics, sx: number, sy: number, pw: number, ph: number, c: number, wp: number): void {
    const float = Math.sin(wp * 1.8) * 4;
    const fy = sy + float;

    // Trailing wisps
    for (let i = 0; i < 5; i++) {
      const wx = sx + (i - 2) * pw * 0.12;
      const wy = fy + ph * 0.1;
      const wLen = ph * 0.25 + Math.sin(wp * 2 + i) * 4;
      g.moveTo(wx, wy);
      g.bezierCurveTo(wx + Math.sin(wp * 3 + i) * 3, wy + wLen * 0.4,
        wx - Math.sin(wp * 2.5 + i) * 2, wy + wLen * 0.7,
        wx + Math.sin(wp * 2 + i * 2) * 4, wy + wLen);
      g.stroke({ color: c, width: 1.5, alpha: 0.2 + i * 0.05 });
    }

    // Robe body (tapered polygon)
    g.moveTo(sx - pw * 0.3, fy - ph * 0.6);
    g.lineTo(sx + pw * 0.3, fy - ph * 0.6);
    g.bezierCurveTo(sx + pw * 0.35, fy - ph * 0.2, sx + pw * 0.25, fy + ph * 0.05,
      sx + pw * 0.15, fy + ph * 0.1);
    g.lineTo(sx - pw * 0.15, fy + ph * 0.1);
    g.bezierCurveTo(sx - pw * 0.25, fy + ph * 0.05, sx - pw * 0.35, fy - ph * 0.2,
      sx - pw * 0.3, fy - ph * 0.6);
    g.closePath();
    g.fill({ color: c, alpha: 0.55 });

    // Hood
    g.moveTo(sx - pw * 0.3, fy - ph * 0.6);
    g.quadraticCurveTo(sx, fy - ph * 0.85, sx + pw * 0.3, fy - ph * 0.6);
    g.lineTo(sx + pw * 0.25, fy - ph * 0.45);
    g.quadraticCurveTo(sx, fy - ph * 0.55, sx - pw * 0.25, fy - ph * 0.45);
    g.closePath();
    g.fill({ color: c, alpha: 0.7 });

    // Face (dark void with glowing eyes)
    g.ellipse(sx, fy - ph * 0.6, pw * 0.15, ph * 0.1);
    g.fill({ color: 0x000000, alpha: 0.6 });
    // Eyes
    const eyeGlow = 0.6 + Math.sin(wp * 3) * 0.3;
    g.circle(sx - 3, fy - ph * 0.62, 1.5); g.fill({ color: 0xFFFFFF, alpha: eyeGlow });
    g.circle(sx + 3, fy - ph * 0.62, 1.5); g.fill({ color: 0xFFFFFF, alpha: eyeGlow });
    // Aura
    g.ellipse(sx, fy - ph * 0.35, pw * 0.4, ph * 0.5);
    g.fill({ color: c, alpha: 0.08 });
  }

  // ===========================================================================
  // WOLF — lean body, muzzle, pointed ears, bushy tail
  // ===========================================================================
  private _wolf(g: Graphics, sx: number, sy: number, pw: number, ph: number, c: number, ls: number, d: number, wp: number): void {
    const tailWag = Math.sin(wp * 4) * 3;
    const breathe = Math.sin(wp * 1.5) * 0.5;
    // Shadow
    g.ellipse(sx, sy, pw * 0.4, 1.5); g.fill({ color: 0x000000, alpha: 0.12 });
    // Tail (fluffy, multi-stroke)
    const tx = sx - d * pw * 0.45;
    g.moveTo(tx, sy - ph * 0.35);
    g.bezierCurveTo(tx - d * pw * 0.15, sy - ph * 0.55 + tailWag, tx - d * pw * 0.25, sy - ph * 0.6 + tailWag, tx - d * pw * 0.35, sy - ph * 0.45 + tailWag);
    g.stroke({ color: c, width: 4 });
    // Tail fluff (lighter tip)
    g.moveTo(tx - d * pw * 0.3, sy - ph * 0.5 + tailWag);
    g.lineTo(tx - d * pw * 0.38, sy - ph * 0.42 + tailWag);
    g.stroke({ color: 0xFFFFFF, width: 2, alpha: 0.15 });
    // Back legs (behind body)
    for (const lx of [-0.15, 0.05]) {
      const legX = sx + lx * pw - d * pw * 0.05;
      const swing = lx < 0 ? -ls * 0.6 : ls * 0.6;
      g.moveTo(legX, sy - ph * 0.1);
      g.lineTo(legX + swing * 0.3, sy - ph * 0.05);
      g.lineTo(legX + swing * 0.4, sy);
      g.stroke({ color: _darken2(c, 0.15), width: 2.5 });
      // Paw
      g.ellipse(legX + swing * 0.4, sy, 2, 1); g.fill(_darken2(c, 0.1));
    }
    // Body (muscular, slightly larger with breathing)
    g.ellipse(sx, sy - ph * 0.35 + breathe, pw * 0.47, ph * (0.28 + breathe * 0.02)); g.fill(c);
    // Back ridge (fur line)
    g.moveTo(sx - pw * 0.3, sy - ph * 0.6);
    g.bezierCurveTo(sx - pw * 0.1, sy - ph * 0.65, sx + pw * 0.1, sy - ph * 0.63, sx + d * pw * 0.3, sy - ph * 0.55);
    g.stroke({ color: _darken2(c, 0.2), width: 1, alpha: 0.3 });
    // Belly (lighter)
    g.ellipse(sx, sy - ph * 0.22, pw * 0.3, ph * 0.1);
    g.fill({ color: 0xDDCCBB, alpha: 0.15 });
    // Chest ruff (lighter, fluffy)
    g.ellipse(sx + d * pw * 0.2, sy - ph * 0.35, pw * 0.18, ph * 0.18);
    g.fill({ color: 0xFFFFFF, alpha: 0.12 });
    // Fur texture strokes on body
    for (let i = 0; i < 5; i++) {
      const fx = sx - pw * 0.2 + i * pw * 0.1;
      const fy = sy - ph * 0.45 + (i % 2) * ph * 0.05;
      g.moveTo(fx, fy); g.lineTo(fx + d * 1.5, fy + 1.5);
      g.stroke({ color: _darken2(c, 0.15), width: 0.5, alpha: 0.2 });
    }
    // Front legs
    for (const lx of [-0.2, 0.2]) {
      const legX = sx + lx * pw + d * pw * 0.05;
      const swing = lx < 0 ? ls : -ls;
      // Upper leg
      g.moveTo(legX, sy - ph * 0.12);
      g.lineTo(legX + swing * 0.3, sy - ph * 0.05);
      g.stroke({ color: c, width: 3 });
      // Lower leg
      g.moveTo(legX + swing * 0.3, sy - ph * 0.05);
      g.lineTo(legX + swing * 0.4, sy);
      g.stroke({ color: c, width: 2.5 });
      // Paw pad
      g.ellipse(legX + swing * 0.4, sy, 2.2, 1.2); g.fill(c);
      // Toe pads
      g.circle(legX + swing * 0.4 - 1, sy + 0.3, 0.5); g.fill({ color: 0x222222, alpha: 0.15 });
      g.circle(legX + swing * 0.4 + 1, sy + 0.3, 0.5); g.fill({ color: 0x222222, alpha: 0.15 });
    }
    // Neck (thick, muscular)
    g.moveTo(sx + d * pw * 0.25, sy - ph * 0.5);
    g.quadraticCurveTo(sx + d * pw * 0.35, sy - ph * 0.52, sx + d * pw * 0.4, sy - ph * 0.55);
    g.stroke({ color: c, width: 4 });
    // Head
    const hx = sx + d * pw * 0.4; const hy = sy - ph * 0.55;
    g.ellipse(hx, hy, pw * 0.2, ph * 0.17); g.fill(c);
    // Brow ridge
    g.moveTo(hx - pw * 0.12, hy - ph * 0.08);
    g.quadraticCurveTo(hx, hy - ph * 0.1, hx + pw * 0.12, hy - ph * 0.08);
    g.stroke({ color: _darken2(c, 0.2), width: 1, alpha: 0.2 });
    // Muzzle (tapered)
    g.moveTo(hx + d * pw * 0.1, hy + ph * 0.08);
    g.lineTo(hx + d * pw * 0.28, hy + ph * 0.02);
    g.lineTo(hx + d * pw * 0.1, hy - ph * 0.03);
    g.closePath(); g.fill(c);
    // Muzzle lighter underside
    g.ellipse(hx + d * pw * 0.2, hy + ph * 0.05, pw * 0.06, ph * 0.03);
    g.fill({ color: 0xDDCCBB, alpha: 0.2 });
    // Nose (detailed)
    g.ellipse(hx + d * pw * 0.27, hy + ph * 0.01, 1.5, 1.2); g.fill(0x222222);
    g.circle(hx + d * pw * 0.27 - 0.3, hy + ph * 0.005, 0.4); g.fill({ color: 0x444444, alpha: 0.5 });
    // Mouth line
    g.moveTo(hx + d * pw * 0.27, hy + ph * 0.025);
    g.lineTo(hx + d * pw * 0.18, hy + ph * 0.06);
    g.stroke({ color: 0x000000, width: 0.5, alpha: 0.2 });
    // Ears (triangles with inner detail)
    for (const [eox, eiox] of [[- 0.05, 0.02], [0.05, 0.15]] as [number, number][]) {
      g.moveTo(hx + pw * eox, hy - ph * 0.15);
      g.lineTo(hx + pw * (eox - 0.03), hy - ph * 0.32);
      g.lineTo(hx + pw * eiox, hy - ph * 0.15);
      g.closePath(); g.fill(c);
      // Ear inner (pink)
      g.moveTo(hx + pw * (eox + 0.01), hy - ph * 0.17);
      g.lineTo(hx + pw * (eox - 0.01), hy - ph * 0.27);
      g.lineTo(hx + pw * (eiox - 0.02), hy - ph * 0.17);
      g.closePath(); g.fill({ color: 0xCC9999, alpha: 0.15 });
    }
    // Eye (detailed amber with slit pupil)
    g.ellipse(hx + d * pw * 0.08, hy - ph * 0.03, 2, 1.8); g.fill(0xFFCC00);
    g.ellipse(hx + d * pw * 0.08, hy - ph * 0.03, 0.6, 1.5); g.fill(0x111100);
    g.circle(hx + d * pw * 0.07, hy - ph * 0.05, 0.4); g.fill({ color: 0xFFFFFF, alpha: 0.3 });
    // Whisker dots on muzzle
    g.circle(hx + d * pw * 0.22, hy + ph * 0.01, 0.3); g.fill({ color: 0x000000, alpha: 0.15 });
    g.circle(hx + d * pw * 0.22, hy + ph * 0.03, 0.3); g.fill({ color: 0x000000, alpha: 0.15 });
  }

  // ===========================================================================
  // DEER — graceful with detailed antlers
  // ===========================================================================
  private _deer(g: Graphics, sx: number, sy: number, pw: number, ph: number, c: number, ls: number, d: number, _wp: number): void {
    // Body
    g.ellipse(sx, sy - ph * 0.38, pw * 0.45, ph * 0.28); g.fill(c);
    // White belly
    g.ellipse(sx, sy - ph * 0.28, pw * 0.3, ph * 0.12);
    g.fill({ color: 0xFFFFFF, alpha: 0.15 });
    // Neck
    g.moveTo(sx + d * pw * 0.25, sy - ph * 0.5);
    g.lineTo(sx + d * pw * 0.4, sy - ph * 0.7);
    g.stroke({ color: c, width: 4 });
    // Head
    const hx = sx + d * pw * 0.42; const hy = sy - ph * 0.72;
    g.ellipse(hx, hy, pw * 0.15, ph * 0.12); g.fill(c);
    // Ears
    g.moveTo(hx - 2, hy - ph * 0.1);
    g.lineTo(hx - 3, hy - ph * 0.2);
    g.lineTo(hx, hy - ph * 0.1); g.closePath(); g.fill(c);
    g.moveTo(hx + 2, hy - ph * 0.1);
    g.lineTo(hx + 3, hy - ph * 0.2);
    g.lineTo(hx + 4, hy - ph * 0.1); g.closePath(); g.fill(c);
    // Antlers (branching)
    const ay = hy - ph * 0.15;
    for (const side of [-1, 1]) {
      g.moveTo(hx + side * 2, ay);
      g.lineTo(hx + side * 5, ay - 8);
      g.lineTo(hx + side * 3, ay - 6); // branch
      g.stroke({ color: 0x8B6914, width: 1.2 });
      g.moveTo(hx + side * 5, ay - 8);
      g.lineTo(hx + side * 7, ay - 12);
      g.stroke({ color: 0x8B6914, width: 1 });
      g.moveTo(hx + side * 5, ay - 8);
      g.lineTo(hx + side * 8, ay - 7);
      g.stroke({ color: 0x8B6914, width: 0.8 });
    }
    // Eye
    g.circle(hx + d * pw * 0.1, hy - ph * 0.02, 1.5); g.fill(0x221100);
    // White tail tuft
    g.ellipse(sx - d * pw * 0.4, sy - ph * 0.4, 3, 4);
    g.fill({ color: 0xFFFFFF, alpha: 0.6 });
    // Legs (4, alternating)
    const legs: [number, number][] = [[-0.25, ls], [-0.1, -ls], [0.1, ls], [0.25, -ls]];
    for (const [lx, sw] of legs) {
      const legX = sx + lx * pw;
      g.moveTo(legX, sy - ph * 0.12);
      g.lineTo(legX + sw * 0.4, sy - ph * 0.06);
      g.lineTo(legX + sw * 0.3, sy);
      g.stroke({ color: c, width: 1.8 });
      // Hoof
      g.circle(legX + sw * 0.3, sy, 1); g.fill(0x333333);
    }
  }

  // ===========================================================================
  // SKELETON — bones, ribcage, skull, glowing eyes, sword
  // ===========================================================================
  private _skeleton(g: Graphics, sx: number, sy: number, pw: number, ph: number, _c: number, ls: number, d: number, atk: boolean, wp: number): void {
    const hw = pw / 2;
    const boneColor = 0xDDDDAA;
    const boneShade = 0xBBBB88;
    // Legs (bones)
    for (const [lx, sw] of [[-0.25, ls], [0.15, -ls]] as [number, number][]) {
      const legX = sx + lx * pw;
      g.moveTo(legX, sy - ph * 0.3); g.lineTo(legX + sw * 0.3, sy - ph * 0.15);
      g.stroke({ color: boneColor, width: 2 });
      g.moveTo(legX + sw * 0.3, sy - ph * 0.15); g.lineTo(legX + sw * 0.2, sy);
      g.stroke({ color: boneColor, width: 2 });
      g.circle(legX, sy - ph * 0.3, 1.5); g.fill(boneShade);
      g.circle(legX + sw * 0.3, sy - ph * 0.15, 1.5); g.fill(boneShade);
    }
    // Spine
    g.moveTo(sx, sy - ph * 0.3); g.lineTo(sx, sy - ph * 0.7);
    g.stroke({ color: boneColor, width: 2 });
    // Ribcage
    for (let i = 0; i < 3; i++) {
      const ry = sy - ph * 0.45 - i * ph * 0.07;
      g.moveTo(sx - hw * 0.5, ry + 1);
      g.quadraticCurveTo(sx, ry - 1, sx + hw * 0.5, ry + 1);
      g.stroke({ color: boneShade, width: 1 });
    }
    // Skull
    const skullY = sy - ph * 0.78;
    g.ellipse(sx, skullY, hw * 0.55, ph * 0.12); g.fill(boneColor);
    // Jaw
    g.moveTo(sx - hw * 0.3, skullY + ph * 0.08);
    g.lineTo(sx - hw * 0.2, skullY + ph * 0.13);
    g.lineTo(sx + hw * 0.2, skullY + ph * 0.13);
    g.lineTo(sx + hw * 0.3, skullY + ph * 0.08);
    g.stroke({ color: boneShade, width: 1 });
    // Eye sockets
    g.ellipse(sx - hw * 0.2, skullY - ph * 0.01, 2, 2.5);
    g.fill(0x000000);
    g.circle(sx - hw * 0.2, skullY - ph * 0.01, 1); g.fill(0xFF6600);
    g.ellipse(sx + hw * 0.2, skullY - ph * 0.01, 2, 2.5);
    g.fill(0x000000);
    g.circle(sx + hw * 0.2, skullY - ph * 0.01, 1); g.fill(0xFF6600);
    // Nose hole
    g.moveTo(sx, skullY + ph * 0.03); g.lineTo(sx - 1, skullY + ph * 0.05);
    g.lineTo(sx + 1, skullY + ph * 0.05); g.closePath(); g.fill(0x222200);
    // Arms (with sword)
    const armY = sy - ph * 0.55;
    if (atk) {
      const swing = Math.sin(wp * 4) * 0.4;
      const tipX = sx + d * pw * 0.9; const tipY = armY - ph * 0.2 + swing * 10;
      g.moveTo(sx + d * hw * 0.4, armY); g.lineTo(tipX, tipY);
      g.stroke({ color: boneColor, width: 2 });
      // Sword
      g.moveTo(tipX, tipY); g.lineTo(tipX + d * 8, tipY - 4);
      g.stroke({ color: 0xAAAAAA, width: 2 });
    } else {
      g.moveTo(sx + d * hw * 0.4, armY);
      g.lineTo(sx + d * hw * 0.6, armY + ph * 0.15);
      g.stroke({ color: boneColor, width: 2 });
      g.moveTo(sx - d * hw * 0.2, armY);
      g.lineTo(sx - d * hw * 0.4, armY + ph * 0.12);
      g.stroke({ color: boneColor, width: 2 });
    }
  }

  // ===========================================================================
  // MORDRED — dark armored knight with glowing red eyes, dark sword
  // ===========================================================================
  private _mordred(g: Graphics, sx: number, sy: number, pw: number, ph: number, _c: number, ls: number, d: number, atk: boolean, wp: number): void {
    const hw = pw / 2;
    const armor = 0x222233; const armorHi = 0x3A3A55; const visor = 0x111122;
    // Cape (dark, tattered)
    g.moveTo(sx - d * hw * 0.3, sy - ph * 0.6);
    g.bezierCurveTo(sx - d * hw * 0.5, sy - ph * 0.2,
      sx - d * hw * 0.4 + Math.sin(wp * 2) * 3, sy + ph * 0.1,
      sx - d * hw * 0.2 + Math.sin(wp * 1.5) * 4, sy + ph * 0.15);
    g.lineTo(sx + d * hw * 0.1, sy + ph * 0.15);
    g.bezierCurveTo(sx + d * hw * 0.2, sy - ph * 0.1,
      sx - d * hw * 0.1, sy - ph * 0.4,
      sx + d * hw * 0.1, sy - ph * 0.6);
    g.closePath(); g.fill({ color: 0x110011, alpha: 0.8 });

    // Legs
    for (const [lx, sw] of [[-0.25, ls], [0.1, -ls]] as [number, number][]) {
      g.rect(sx + lx * pw + sw, sy - ph * 0.3, pw * 0.22, ph * 0.3);
      g.fill(armor);
      g.rect(sx + lx * pw + sw, sy - ph * 0.3, pw * 0.22, 2); g.fill(armorHi);
    }
    // Body
    g.moveTo(sx - hw * 0.55, sy - ph * 0.65);
    g.lineTo(sx + hw * 0.55, sy - ph * 0.65);
    g.lineTo(sx + hw * 0.45, sy - ph * 0.3);
    g.lineTo(sx - hw * 0.45, sy - ph * 0.3);
    g.closePath(); g.fill(armor);
    // Chest plate V
    g.moveTo(sx, sy - ph * 0.63); g.lineTo(sx - hw * 0.2, sy - ph * 0.45);
    g.lineTo(sx, sy - ph * 0.35); g.lineTo(sx + hw * 0.2, sy - ph * 0.45);
    g.closePath(); g.fill(armorHi);

    // Pauldrons
    g.ellipse(sx - hw * 0.5, sy - ph * 0.64, hw * 0.2, ph * 0.06); g.fill(armorHi);
    g.ellipse(sx + hw * 0.5, sy - ph * 0.64, hw * 0.2, ph * 0.06); g.fill(armorHi);

    // Helmet
    const helmY = sy - ph * 0.82;
    g.ellipse(sx, helmY, hw * 0.45, ph * 0.12); g.fill(armor);
    // Visor slit
    g.rect(sx - hw * 0.3, helmY - 1, hw * 0.6, 3); g.fill(visor);
    // Glowing red eyes behind visor
    g.circle(sx - hw * 0.12, helmY, 1.2); g.fill(0xFF0000);
    g.circle(sx + hw * 0.12, helmY, 1.2); g.fill(0xFF0000);
    // Helmet crest
    g.moveTo(sx, helmY - ph * 0.1);
    g.lineTo(sx - 1, helmY - ph * 0.18);
    g.lineTo(sx + 1, helmY - ph * 0.18);
    g.closePath(); g.fill(0x440000);

    // Arms + Dark sword
    if (atk) {
      const swing = Math.sin(wp * 4) * 0.5;
      const aLen = pw * 0.8;
      const tipX = sx + d * aLen; const tipY = sy - ph * 0.7 + swing * 8;
      g.moveTo(sx + d * hw * 0.4, sy - ph * 0.55);
      g.lineTo(tipX, tipY);
      g.stroke({ color: armor, width: 3 });
      // Dark sword blade
      const ba = Math.atan2(-(tipY - (sy - ph * 0.55)), (tipX - (sx + d * hw * 0.4)));
      const sLen = 12;
      g.moveTo(tipX, tipY);
      g.lineTo(tipX + Math.cos(ba) * sLen, tipY - Math.sin(ba) * sLen);
      g.stroke({ color: 0x554466, width: 2.5 });
      // Glow
      g.circle(tipX + Math.cos(ba) * sLen, tipY - Math.sin(ba) * sLen, 2);
      g.fill({ color: 0xFF0000, alpha: 0.4 });
    }
  }

  // ===========================================================================
  // GENERIC HUMANOID — saxon warrior, dark knight, construct
  // ===========================================================================
  // ===========================================================================
  // SAXON WARRIOR — bearded viking with round shield and axe
  // ===========================================================================
  private _saxonWarrior(g: Graphics, sx: number, sy: number, pw: number, ph: number, c: number, ls: number, d: number, atk: boolean, wp: number): void {
    const hw = pw / 2;
    // Shadow
    g.ellipse(sx, sy, hw * 0.6, 1.5); g.fill({ color: 0x000000, alpha: 0.12 });
    // Legs (fur-wrapped)
    for (const [lx, sw] of [[-0.25, ls], [0.1, -ls]] as [number, number][]) {
      const legX = sx + lx * pw;
      g.moveTo(legX, sy - ph * 0.3); g.lineTo(legX + pw * 0.22, sy - ph * 0.3);
      g.lineTo(legX + pw * 0.2 + sw, sy); g.lineTo(legX + pw * 0.02 + sw, sy);
      g.closePath(); g.fill(0x5A4018);
      // Fur wrapping
      g.rect(legX + sw * 0.3 - 1, sy - ph * 0.18, pw * 0.24, 3);
      g.fill({ color: 0x8B7533, alpha: 0.4 });
      // Boot
      g.rect(legX + sw - 1.5, sy - 3, pw * 0.26, 3);
      g.fill(0x4A3010);
    }
    // Chainmail tunic
    g.moveTo(sx - hw * 0.55, sy - ph * 0.65);
    g.lineTo(sx + hw * 0.55, sy - ph * 0.65);
    g.lineTo(sx + hw * 0.45, sy - ph * 0.28);
    g.lineTo(sx - hw * 0.45, sy - ph * 0.28);
    g.closePath(); g.fill(c);
    // Chainmail texture
    for (let my = 0; my < 4; my++) {
      const row = sy - ph * 0.6 + my * 3;
      for (let mx = -2; mx <= 2; mx++) {
        g.circle(sx + mx * 2.5 + (my % 2) * 1.2, row, 0.7);
        g.stroke({ color: 0x000000, width: 0.3, alpha: 0.08 });
      }
    }
    // Belt with buckle
    g.rect(sx - hw * 0.45, sy - ph * 0.3, hw * 0.9, 3);
    g.fill(0x6A4A14);
    g.rect(sx - 1.5, sy - ph * 0.3, 3, 3); g.fill(0xCCAA44);
    // Round shield (back arm)
    const shieldX = sx - d * hw * 0.55;
    g.circle(shieldX, sy - ph * 0.42, 6);
    g.fill(0x8B6914);
    g.circle(shieldX, sy - ph * 0.42, 4.5);
    g.fill(c);
    g.circle(shieldX, sy - ph * 0.42, 1.5);
    g.fill(0xCCAA44);
    // Cross on shield
    g.rect(shieldX - 0.5, sy - ph * 0.42 - 3, 1, 6);
    g.fill({ color: 0xCCAA44, alpha: 0.5 });
    g.rect(shieldX - 3, sy - ph * 0.42 - 0.5, 6, 1);
    g.fill({ color: 0xCCAA44, alpha: 0.5 });
    // Head
    const headY = sy - ph * 0.82;
    g.ellipse(sx, headY, hw * 0.38, ph * 0.1); g.fill(0xDDBB99);
    // Leather cap with horn
    g.moveTo(sx - hw * 0.4, headY + 1);
    g.lineTo(sx - hw * 0.4, headY - ph * 0.06);
    g.quadraticCurveTo(sx, headY - ph * 0.1, sx + hw * 0.4, headY - ph * 0.06);
    g.lineTo(sx + hw * 0.4, headY + 1);
    g.closePath(); g.fill(0x6A4A1A);
    // Horns on helmet
    g.moveTo(sx - hw * 0.35, headY - ph * 0.04);
    g.quadraticCurveTo(sx - hw * 0.5, headY - ph * 0.18, sx - hw * 0.6, headY - ph * 0.12);
    g.stroke({ color: 0xDDCCAA, width: 1.5 });
    g.moveTo(sx + hw * 0.35, headY - ph * 0.04);
    g.quadraticCurveTo(sx + hw * 0.5, headY - ph * 0.18, sx + hw * 0.6, headY - ph * 0.12);
    g.stroke({ color: 0xDDCCAA, width: 1.5 });
    // Eyes
    g.circle(sx + d * hw * 0.12, headY + ph * 0.01, 1.2); g.fill(0xFFFFFF);
    g.circle(sx + d * hw * 0.15, headY + ph * 0.01, 0.5); g.fill(0x332211);
    // Bushy beard
    g.moveTo(sx - hw * 0.25, headY + ph * 0.07);
    g.bezierCurveTo(sx - hw * 0.3, headY + ph * 0.18, sx, headY + ph * 0.2, sx + hw * 0.25, headY + ph * 0.07);
    g.closePath(); g.fill(0x8B6533);
    // Front arm + axe
    const armX = sx + d * hw * 0.4;
    if (atk) {
      const swingAngle = Math.sin(wp * 4) * 0.5;
      const tipX = armX + d * 8; const tipY = sy - ph * 0.65 + swingAngle * 5;
      g.moveTo(armX, sy - ph * 0.55); g.lineTo(tipX, tipY);
      g.stroke({ color: 0xDDBB99, width: 2.5 });
      // Axe head
      g.moveTo(tipX, tipY - 3); g.lineTo(tipX + d * 5, tipY);
      g.lineTo(tipX, tipY + 3); g.closePath(); g.fill(0xAAAAAA);
      g.moveTo(tipX, tipY - 3); g.lineTo(tipX + d * 5, tipY);
      g.stroke({ color: 0xDDDDDD, width: 0.4, alpha: 0.3 });
    } else {
      g.moveTo(armX, sy - ph * 0.55); g.lineTo(armX, sy - ph * 0.3);
      g.stroke({ color: 0xDDBB99, width: 2.5 });
    }
  }

  // ===========================================================================
  // DARK KNIGHT — full plate armor, great sword, menacing visor
  // ===========================================================================
  private _darkKnight(g: Graphics, sx: number, sy: number, pw: number, ph: number, _c: number, ls: number, d: number, atk: boolean, wp: number): void {
    const hw = pw / 2;
    g.ellipse(sx, sy, hw * 0.6, 1.5); g.fill({ color: 0x000000, alpha: 0.15 });
    // Armored legs
    for (const [lx, sw] of [[-0.22, ls], [0.08, -ls]] as [number, number][]) {
      const legX = sx + lx * pw;
      // Greave (shin armor)
      g.moveTo(legX, sy - ph * 0.3); g.lineTo(legX + pw * 0.22, sy - ph * 0.3);
      g.lineTo(legX + pw * 0.2 + sw, sy); g.lineTo(legX + pw * 0.02 + sw, sy);
      g.closePath(); g.fill(0x333344);
      // Knee guard
      g.ellipse(legX + pw * 0.11, sy - ph * 0.28, 2.5, 2);
      g.fill(0x444466);
      // Sabaton (foot armor)
      g.moveTo(legX + sw - 2, sy - 2); g.lineTo(legX + sw + pw * 0.28, sy - 2);
      g.lineTo(legX + sw + pw * 0.3, sy); g.lineTo(legX + sw - 2, sy);
      g.closePath(); g.fill(0x222233);
    }
    // Body plate armor (multiple pieces)
    // Cuirass (chest)
    g.moveTo(sx - hw * 0.55, sy - ph * 0.65);
    g.lineTo(sx + hw * 0.55, sy - ph * 0.65);
    g.lineTo(sx + hw * 0.48, sy - ph * 0.3);
    g.lineTo(sx - hw * 0.48, sy - ph * 0.3);
    g.closePath(); g.fill(0x333344);
    // Chest plate highlight
    g.moveTo(sx - hw * 0.3, sy - ph * 0.63);
    g.lineTo(sx + hw * 0.3, sy - ph * 0.63);
    g.lineTo(sx + hw * 0.2, sy - ph * 0.45);
    g.lineTo(sx - hw * 0.2, sy - ph * 0.45);
    g.closePath(); g.fill({ color: 0x555577, alpha: 0.5 });
    // Dark emblem on chest (skull)
    g.circle(sx, sy - ph * 0.5, 2.5); g.fill({ color: 0x111122, alpha: 0.4 });
    g.circle(sx - 1, sy - ph * 0.51, 0.6); g.fill({ color: 0xAA2222, alpha: 0.5 });
    g.circle(sx + 1, sy - ph * 0.51, 0.6); g.fill({ color: 0xAA2222, alpha: 0.5 });
    // Pauldrons (shoulder armor)
    g.ellipse(sx - hw * 0.55, sy - ph * 0.6, 4, 3); g.fill(0x444466);
    g.ellipse(sx + hw * 0.55, sy - ph * 0.6, 4, 3); g.fill(0x444466);
    // Spikes on pauldrons
    g.moveTo(sx - hw * 0.55, sy - ph * 0.63); g.lineTo(sx - hw * 0.6, sy - ph * 0.72);
    g.stroke({ color: 0x555577, width: 1.5 });
    g.moveTo(sx + hw * 0.55, sy - ph * 0.63); g.lineTo(sx + hw * 0.6, sy - ph * 0.72);
    g.stroke({ color: 0x555577, width: 1.5 });
    // Fauld (waist armor)
    g.rect(sx - hw * 0.5, sy - ph * 0.32, hw * 1, 3);
    g.fill(0x444466);
    // Great helm
    const headY = sy - ph * 0.82;
    g.moveTo(sx - hw * 0.42, headY + ph * 0.05);
    g.lineTo(sx - hw * 0.45, headY - ph * 0.06);
    g.quadraticCurveTo(sx, headY - ph * 0.12, sx + hw * 0.45, headY - ph * 0.06);
    g.lineTo(sx + hw * 0.42, headY + ph * 0.05);
    g.closePath(); g.fill(0x333344);
    // Visor slit (menacing red glow)
    g.rect(sx - hw * 0.28, headY - ph * 0.01, hw * 0.56, 2.5);
    g.fill(0x111111);
    g.rect(sx - hw * 0.25, headY, hw * 0.5, 1.5);
    g.fill({ color: 0xFF2222, alpha: 0.4 });
    // Helmet crest
    g.moveTo(sx, headY - ph * 0.1);
    g.lineTo(sx, headY - ph * 0.2);
    g.stroke({ color: 0x555577, width: 2 });
    // Plume
    g.moveTo(sx, headY - ph * 0.2);
    g.bezierCurveTo(sx - d * 4, headY - ph * 0.22, sx - d * 6, headY - ph * 0.15, sx - d * 7, headY - ph * 0.1);
    g.stroke({ color: 0x881111, width: 2 });
    // Great sword
    if (atk) {
      const swA = Math.sin(wp * 3) * 0.6;
      const swordTipX = sx + d * pw * 0.8;
      const swordTipY = sy - ph * 0.7 + swA * 8;
      g.moveTo(sx + d * hw * 0.4, sy - ph * 0.55);
      g.lineTo(swordTipX, swordTipY);
      g.stroke({ color: 0x777799, width: 3 });
      // Blade width
      const perpX = Math.sin(swA) * 1.5;
      const perpY = Math.cos(swA) * 1.5;
      g.moveTo(swordTipX + perpX, swordTipY + perpY);
      g.lineTo(swordTipX + d * 3, swordTipY - 1);
      g.lineTo(swordTipX - perpX, swordTipY - perpY);
      g.closePath(); g.fill(0x888899);
      // Edge gleam
      g.moveTo(sx + d * hw * 0.4, sy - ph * 0.55);
      g.lineTo(swordTipX, swordTipY);
      g.stroke({ color: 0xCCCCDD, width: 0.5, alpha: 0.3 });
    } else {
      // Sword at rest on shoulder
      g.moveTo(sx + d * hw * 0.35, sy - ph * 0.4);
      g.lineTo(sx + d * hw * 0.1, sy - ph * 0.85);
      g.stroke({ color: 0x777799, width: 2.5 });
    }
  }

  // ===========================================================================
  // CONSTRUCT — magical golem with rune-inscribed stone body
  // ===========================================================================
  private _construct(g: Graphics, sx: number, sy: number, pw: number, ph: number, c: number, ls: number, d: number, atk: boolean, wp: number, t: number): void {
    const hw = pw / 2;
    const pulse = Math.sin(t * 2) * 0.15 + 0.85;
    g.ellipse(sx, sy, hw * 0.7, 2); g.fill({ color: 0x000000, alpha: 0.18 });
    // Legs (thick stone pillars)
    for (const [lx, sw] of [[-0.2, ls * 0.5], [0.1, -ls * 0.5]] as [number, number][]) {
      const legX = sx + lx * pw;
      g.moveTo(legX - 1, sy - ph * 0.35);
      g.lineTo(legX + pw * 0.25 + 1, sy - ph * 0.35);
      g.lineTo(legX + pw * 0.27 + sw, sy);
      g.lineTo(legX - 2 + sw, sy);
      g.closePath(); g.fill(0x553388);
      // Rune on leg
      g.circle(legX + pw * 0.12, sy - ph * 0.2, 1.5);
      g.stroke({ color: 0xAA66FF, width: 0.6, alpha: pulse * 0.4 });
    }
    // Massive body (wide, angular)
    g.moveTo(sx - hw * 0.65, sy - ph * 0.7);
    g.lineTo(sx + hw * 0.65, sy - ph * 0.7);
    g.lineTo(sx + hw * 0.7, sy - ph * 0.35);
    g.lineTo(sx - hw * 0.7, sy - ph * 0.35);
    g.closePath(); g.fill(c);
    // Stone texture cracks
    g.moveTo(sx - hw * 0.3, sy - ph * 0.68); g.lineTo(sx - hw * 0.1, sy - ph * 0.5);
    g.lineTo(sx + hw * 0.15, sy - ph * 0.55);
    g.stroke({ color: 0x000000, width: 0.6, alpha: 0.15 });
    // Glowing rune circle on chest
    g.circle(sx, sy - ph * 0.5, 4);
    g.stroke({ color: 0xAA66FF, width: 1, alpha: pulse * 0.5 });
    g.circle(sx, sy - ph * 0.5, 2);
    g.fill({ color: 0xCC88FF, alpha: pulse * 0.3 });
    // Rune lines (cross pattern)
    g.moveTo(sx, sy - ph * 0.56); g.lineTo(sx, sy - ph * 0.44);
    g.stroke({ color: 0xAA66FF, width: 0.7, alpha: pulse * 0.4 });
    g.moveTo(sx - 3, sy - ph * 0.5); g.lineTo(sx + 3, sy - ph * 0.5);
    g.stroke({ color: 0xAA66FF, width: 0.7, alpha: pulse * 0.4 });
    // Shoulder pauldrons (stone blocks)
    g.rect(sx - hw * 0.75, sy - ph * 0.72, 5, 5); g.fill(0x664499);
    g.rect(sx + hw * 0.55, sy - ph * 0.72, 5, 5); g.fill(0x664499);
    // Arms (thick, segmented)
    const armSwing = atk ? Math.sin(wp * 4) * 6 : 0;
    for (const side of [-1, 1] as const) {
      const ax = sx + side * hw * 0.7;
      const ay = sy - ph * 0.6;
      // Upper arm
      g.rect(ax - 2.5, ay, 5, ph * 0.15); g.fill(0x553388);
      // Forearm
      const faY = ay + ph * 0.15;
      g.rect(ax - 3, faY + (side === d ? armSwing : 0), 6, ph * 0.12); g.fill(c);
      // Fist (large, glowing)
      const fistY = faY + ph * 0.12 + (side === d ? armSwing : 0);
      g.circle(ax, fistY + 2, 4); g.fill(0x553388);
      g.circle(ax, fistY + 2, 2);
      g.fill({ color: 0xAA66FF, alpha: pulse * 0.25 });
    }
    // Head (angular, crystalline)
    const headY = sy - ph * 0.85;
    g.moveTo(sx - hw * 0.35, headY + ph * 0.08);
    g.lineTo(sx - hw * 0.25, headY - ph * 0.05);
    g.lineTo(sx + hw * 0.25, headY - ph * 0.05);
    g.lineTo(sx + hw * 0.35, headY + ph * 0.08);
    g.closePath(); g.fill(c);
    // Glowing eyes
    g.circle(sx - hw * 0.12, headY + ph * 0.01, 2);
    g.fill({ color: 0xAA44FF, alpha: pulse });
    g.circle(sx + hw * 0.12, headY + ph * 0.01, 2);
    g.fill({ color: 0xAA44FF, alpha: pulse });
    // Inner eye glow
    g.circle(sx - hw * 0.12, headY + ph * 0.01, 3.5);
    g.fill({ color: 0xAA44FF, alpha: pulse * 0.15 });
    g.circle(sx + hw * 0.12, headY + ph * 0.01, 3.5);
    g.fill({ color: 0xAA44FF, alpha: pulse * 0.15 });
    // Crystal crown
    g.moveTo(sx - 3, headY - ph * 0.05);
    g.lineTo(sx - 2, headY - ph * 0.14);
    g.lineTo(sx, headY - ph * 0.08);
    g.lineTo(sx + 2, headY - ph * 0.14);
    g.lineTo(sx + 3, headY - ph * 0.05);
    g.stroke({ color: 0xBB88FF, width: 1, alpha: pulse * 0.6 });
  }

  private _humanoid(g: Graphics, sx: number, sy: number, pw: number, ph: number, c: number, ls: number, d: number, atk: boolean, def: { name: string }): void {
    const hw = pw / 2;
    const isDark = def.name.includes("Dark Knight");
    const isConstruct = def.name.includes("Construct");
    const skinColor = isConstruct ? 0x6644AA : 0xDDBB99;

    // Legs
    for (const [lx, sw] of [[-0.25, ls], [0.1, -ls]] as [number, number][]) {
      const legX = sx + lx * pw;
      g.moveTo(legX, sy - ph * 0.3); g.lineTo(legX + pw * 0.22, sy - ph * 0.3);
      g.lineTo(legX + pw * 0.2 + sw, sy); g.lineTo(legX + pw * 0.02 + sw, sy);
      g.closePath(); g.fill(isDark ? 0x333344 : 0x5A4018);
      // Boot
      g.rect(legX + sw - 1, sy - 3, pw * 0.24, 3);
      g.fill(isDark ? 0x222233 : 0x3A2010);
    }
    // Body (tapered torso)
    g.moveTo(sx - hw * 0.55, sy - ph * 0.65);
    g.lineTo(sx + hw * 0.55, sy - ph * 0.65);
    g.lineTo(sx + hw * 0.4, sy - ph * 0.3);
    g.lineTo(sx - hw * 0.4, sy - ph * 0.3);
    g.closePath(); g.fill(c);
    // Belt
    g.rect(sx - hw * 0.4, sy - ph * 0.32, hw * 0.8, 2.5);
    g.fill(isDark ? 0x444466 : 0x8B6914);
    // Head
    const headY = sy - ph * 0.82;
    g.ellipse(sx, headY, hw * 0.4, ph * 0.1); g.fill(skinColor);
    // Helmet / hood
    if (isDark || isConstruct) {
      g.ellipse(sx, headY - ph * 0.02, hw * 0.45, ph * 0.11);
      g.fill(isDark ? 0x333344 : 0x553388);
      // Eye slit
      g.rect(sx - hw * 0.25, headY - 1, hw * 0.5, 2);
      g.fill(0x111111);
      g.circle(sx + d * hw * 0.08, headY, 1);
      g.fill(isConstruct ? 0xAA44FF : 0xFF4444);
    } else {
      // Saxon: leather cap + beard
      g.rect(sx - hw * 0.4, headY - ph * 0.08, hw * 0.8, ph * 0.05);
      g.fill(0x8B6914);
      g.circle(sx + d * hw * 0.15, headY - ph * 0.01, 1.5); g.fill(0x332211);
      // Beard
      g.moveTo(sx - hw * 0.15, headY + ph * 0.06);
      g.quadraticCurveTo(sx, headY + ph * 0.12, sx + hw * 0.15, headY + ph * 0.06);
      g.stroke({ color: 0x8B6914, width: 1.5 });
    }
    // Arms + weapon
    if (atk) {
      const tipX = sx + d * pw * 0.7;
      g.moveTo(sx + d * hw * 0.4, sy - ph * 0.55);
      g.lineTo(tipX, sy - ph * 0.65);
      g.stroke({ color: skinColor, width: 2.5 });
      // Weapon
      g.moveTo(tipX, sy - ph * 0.65);
      g.lineTo(tipX + d * 7, sy - ph * 0.75);
      g.stroke({ color: isDark ? 0x555577 : 0xAAAAAA, width: 2 });
    } else {
      // Shield on back arm
      if (isDark) {
        g.ellipse(sx - d * hw * 0.5, sy - ph * 0.45, 4, 6);
        g.fill(0x333344);
        g.ellipse(sx - d * hw * 0.5, sy - ph * 0.45, 2, 3);
        g.fill(0x444466);
      }
    }
  }

  // ===========================================================================
  // NPC — detailed per type (Merlin, Lady, Blacksmith, Knight)
  // ===========================================================================
  private _npc(g: Graphics, sx: number, sy: number, pw: number, ph: number, d: number, type: string, t: number): void {
    const hw = pw / 2;

    if (type === "merlin") {
      // Long flowing robe
      g.moveTo(sx - hw * 0.5, sy - ph * 0.55);
      g.lineTo(sx + hw * 0.5, sy - ph * 0.55);
      g.lineTo(sx + hw * 0.55, sy);
      g.lineTo(sx - hw * 0.55, sy);
      g.closePath(); g.fill(0x4422AA);
      // Robe pattern (stars)
      for (let i = 0; i < 3; i++) {
        const stx = sx + (i - 1) * pw * 0.15;
        const sty = sy - ph * 0.35 + i * ph * 0.08;
        g.circle(stx, sty, 1); g.fill({ color: 0xFFDD44, alpha: 0.5 });
      }
      // Sash
      g.moveTo(sx - hw * 0.15, sy - ph * 0.55);
      g.lineTo(sx + hw * 0.1, sy); g.stroke({ color: 0xFFD700, width: 1 });
      // Head
      g.ellipse(sx, sy - ph * 0.7, hw * 0.35, ph * 0.1); g.fill(0xFFCC99);
      // Long beard
      g.moveTo(sx - 3, sy - ph * 0.6);
      g.bezierCurveTo(sx - 4, sy - ph * 0.4, sx, sy - ph * 0.35, sx + 2, sy - ph * 0.42);
      g.stroke({ color: 0xCCCCCC, width: 2 });
      // Wizard hat
      g.moveTo(sx - hw * 0.4, sy - ph * 0.75);
      g.lineTo(sx, sy - ph - 6);
      g.lineTo(sx + hw * 0.4, sy - ph * 0.75);
      g.closePath(); g.fill(0x3311AA);
      // Hat brim
      g.rect(sx - hw * 0.5, sy - ph * 0.76, pw * 0.5, 2);
      g.fill(0x3311AA);
      // Hat star
      g.circle(sx, sy - ph * 0.88, 1.5);
      g.fill({ color: 0xFFDD44, alpha: 0.7 + Math.sin(t * 3) * 0.3 });
      // Eyes
      g.circle(sx + d * 3, sy - ph * 0.68, 1); g.fill(0x2244AA);
      // Staff
      g.moveTo(sx + d * hw * 0.5, sy - ph * 0.5);
      g.lineTo(sx + d * hw * 0.5, sy - ph * 0.95);
      g.stroke({ color: 0x6B4226, width: 1.5 });
      g.circle(sx + d * hw * 0.5, sy - ph * 0.95, 2.5);
      g.fill({ color: 0xAA44FF, alpha: 0.6 + Math.sin(t * 4) * 0.3 });
    } else if (type === "lady_lake") {
      // Flowing blue dress
      g.moveTo(sx - hw * 0.4, sy - ph * 0.55);
      g.lineTo(sx + hw * 0.4, sy - ph * 0.55);
      g.bezierCurveTo(sx + hw * 0.6, sy - ph * 0.2, sx + hw * 0.7, sy,
        sx + hw * 0.5, sy);
      g.lineTo(sx - hw * 0.5, sy);
      g.bezierCurveTo(sx - hw * 0.7, sy, sx - hw * 0.6, sy - ph * 0.2,
        sx - hw * 0.4, sy - ph * 0.55);
      g.closePath(); g.fill(0x4488CC);
      // Shimmer
      g.ellipse(sx, sy - ph * 0.3, pw * 0.2, ph * 0.1);
      g.fill({ color: 0xAADDFF, alpha: 0.15 + Math.sin(t * 2) * 0.1 });
      // Head
      g.ellipse(sx, sy - ph * 0.7, hw * 0.3, ph * 0.1); g.fill(0xFFCC99);
      // Long hair
      g.moveTo(sx - hw * 0.3, sy - ph * 0.7);
      g.bezierCurveTo(sx - hw * 0.35, sy - ph * 0.45, sx - hw * 0.3, sy - ph * 0.3,
        sx - hw * 0.2, sy - ph * 0.2);
      g.stroke({ color: 0x332211, width: 2 });
      g.moveTo(sx + hw * 0.3, sy - ph * 0.7);
      g.bezierCurveTo(sx + hw * 0.35, sy - ph * 0.45, sx + hw * 0.3, sy - ph * 0.3,
        sx + hw * 0.2, sy - ph * 0.2);
      g.stroke({ color: 0x332211, width: 2 });
      // Crown/tiara
      g.moveTo(sx - 4, sy - ph * 0.78);
      g.lineTo(sx - 2, sy - ph * 0.84);
      g.lineTo(sx, sy - ph * 0.8);
      g.lineTo(sx + 2, sy - ph * 0.84);
      g.lineTo(sx + 4, sy - ph * 0.78);
      g.stroke({ color: 0xFFD700, width: 1 });
      g.circle(sx + d * 2, sy - ph * 0.68, 1); g.fill(0x4488CC);
    } else if (type === "blacksmith") {
      // Leather apron
      g.rect(sx - hw * 0.45, sy - ph * 0.55, pw * 0.45, ph * 0.45); g.fill(0x8B6914);
      g.rect(sx - hw * 0.4, sy - ph * 0.55, pw * 0.4, ph * 0.3); g.fill(0xAA6633);
      // Muscular arms
      g.rect(sx + d * hw * 0.35, sy - ph * 0.5, 4, ph * 0.2); g.fill(0xDDBB99);
      // Head (bald, beard)
      g.ellipse(sx, sy - ph * 0.7, hw * 0.35, ph * 0.1); g.fill(0xDDBB99);
      g.moveTo(sx - 3, sy - ph * 0.6);
      g.quadraticCurveTo(sx, sy - ph * 0.55, sx + 3, sy - ph * 0.6);
      g.stroke({ color: 0x553311, width: 2 });
      g.circle(sx + d * 2, sy - ph * 0.69, 1); g.fill(0x332211);
      // Hammer
      g.moveTo(sx + d * hw * 0.5, sy - ph * 0.35);
      g.lineTo(sx + d * hw * 0.5, sy - ph * 0.55);
      g.stroke({ color: 0x6B4226, width: 1.5 });
      g.rect(sx + d * hw * 0.5 - 3, sy - ph * 0.58, 6, 4); g.fill(0x888888);
      // Legs
      g.rect(sx - hw * 0.25, sy - ph * 0.1, pw * 0.2, ph * 0.1); g.fill(0x5A4018);
      g.rect(sx + hw * 0.05, sy - ph * 0.1, pw * 0.2, ph * 0.1); g.fill(0x5A4018);
    } else if (type === "herbalist") {
      // Forest herbalist — green robes, herb pouch, flower crown
      // Flowing green robe
      g.moveTo(sx - hw * 0.45, sy - ph * 0.55);
      g.lineTo(sx + hw * 0.45, sy - ph * 0.55);
      g.bezierCurveTo(sx + hw * 0.55, sy - ph * 0.2, sx + hw * 0.5, sy, sx + hw * 0.45, sy);
      g.lineTo(sx - hw * 0.45, sy);
      g.bezierCurveTo(sx - hw * 0.5, sy, sx - hw * 0.55, sy - ph * 0.2, sx - hw * 0.45, sy - ph * 0.55);
      g.closePath(); g.fill(0x337733);
      // Lighter inner robe
      g.moveTo(sx - hw * 0.15, sy - ph * 0.55);
      g.lineTo(sx + hw * 0.15, sy - ph * 0.55);
      g.lineTo(sx + hw * 0.1, sy);
      g.lineTo(sx - hw * 0.1, sy);
      g.closePath(); g.fill(0x448844);
      // Leaf pattern on robe
      for (let i = 0; i < 4; i++) {
        const lx2 = sx + (i - 1.5) * 3;
        const ly2 = sy - ph * 0.35 + (i % 2) * 3;
        g.ellipse(lx2, ly2, 1.5, 1); g.fill({ color: 0x55AA44, alpha: 0.3 });
      }
      // Herb pouch at waist
      g.ellipse(sx + d * hw * 0.35, sy - ph * 0.22, 3, 2.5);
      g.fill(0x8B6914);
      g.ellipse(sx + d * hw * 0.35, sy - ph * 0.22, 2, 1.5);
      g.fill(0xAA8844);
      // Herbs peeking out of pouch
      g.moveTo(sx + d * hw * 0.3, sy - ph * 0.25);
      g.lineTo(sx + d * hw * 0.25, sy - ph * 0.32);
      g.stroke({ color: 0x44AA33, width: 0.8 });
      g.moveTo(sx + d * hw * 0.38, sy - ph * 0.25);
      g.lineTo(sx + d * hw * 0.42, sy - ph * 0.31);
      g.stroke({ color: 0x55BB44, width: 0.8 });
      // Head
      g.ellipse(sx, sy - ph * 0.7, hw * 0.32, ph * 0.1); g.fill(0xFFCC99);
      // Hair (braided, brown)
      g.moveTo(sx - hw * 0.3, sy - ph * 0.72);
      g.bezierCurveTo(sx - hw * 0.35, sy - ph * 0.55, sx - hw * 0.25, sy - ph * 0.4, sx - hw * 0.15, sy - ph * 0.35);
      g.stroke({ color: 0x664422, width: 1.5 });
      g.moveTo(sx + hw * 0.3, sy - ph * 0.72);
      g.bezierCurveTo(sx + hw * 0.35, sy - ph * 0.55, sx + hw * 0.25, sy - ph * 0.4, sx + hw * 0.15, sy - ph * 0.35);
      g.stroke({ color: 0x664422, width: 1.5 });
      // Flower crown
      const crownY = sy - ph * 0.8;
      for (let i = 0; i < 5; i++) {
        const fx = sx - 4 + i * 2;
        const flowerColor = [0xFF6666, 0xFFDD44, 0xFF88CC, 0x66BBFF, 0xFFAA44][i];
        g.circle(fx, crownY + Math.sin(i) * 0.5, 1.2);
        g.fill({ color: flowerColor, alpha: 0.7 });
      }
      // Green vine connecting flowers
      g.moveTo(sx - 4, crownY); g.quadraticCurveTo(sx, crownY - 1, sx + 4, crownY);
      g.stroke({ color: 0x338833, width: 0.6 });
      // Eyes
      g.circle(sx + d * 2, sy - ph * 0.69, 1); g.fill(0x337733);
      // Gentle smile
      g.moveTo(sx - 1, sy - ph * 0.64);
      g.quadraticCurveTo(sx + d, sy - ph * 0.62, sx + d * 2, sy - ph * 0.64);
      g.stroke({ color: 0xBB8866, width: 0.6 });
      // Mortar & pestle in hand
      g.ellipse(sx - d * hw * 0.4, sy - ph * 0.42, 2.5, 2);
      g.fill(0x888888);
      g.moveTo(sx - d * hw * 0.4 + 1, sy - ph * 0.42);
      g.lineTo(sx - d * hw * 0.4 + 2.5, sy - ph * 0.52);
      g.stroke({ color: 0x666666, width: 1.2 });
    } else {
      // Knight recruit — shiny armor
      g.rect(sx - hw * 0.4, sy - ph * 0.3, pw * 0.4, ph * 0.3); g.fill(0x888888);
      g.rect(sx - hw * 0.45, sy - ph * 0.62, pw * 0.45, ph * 0.32); g.fill(0xBBBBBB);
      // Tabard with cross
      g.rect(sx - 2, sy - ph * 0.58, 4, ph * 0.2); g.fill(0xCC2222);
      g.rect(sx - hw * 0.2, sy - ph * 0.48, hw * 0.4, 3); g.fill(0xCC2222);
      // Helmet
      g.ellipse(sx, sy - ph * 0.78, hw * 0.4, ph * 0.1); g.fill(0xBBBBBB);
      g.rect(sx - hw * 0.3, sy - ph * 0.78, hw * 0.6, 2); g.fill(0x888888);
      g.circle(sx + d * 2, sy - ph * 0.77, 1); g.fill(0x336699);
      // Sword at side
      g.moveTo(sx + d * hw * 0.5, sy - ph * 0.5);
      g.lineTo(sx + d * hw * 0.5, sy - ph * 0.2);
      g.stroke({ color: 0xCCCCCC, width: 1.5 });
    }

    // NPC marker
    g.circle(sx, sy - ph - 5, 2.5); g.fill(0x44FF44);
    g.circle(sx, sy - ph - 5, 1); g.fill(0xFFFFFF);
  }

  destroy(): void { this.container.destroy({ children: true }); }
}

function _lighten(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xFF) + Math.floor(255 * amount));
  const g = Math.min(255, ((color >> 8) & 0xFF) + Math.floor(255 * amount));
  const b = Math.min(255, (color & 0xFF) + Math.floor(255 * amount));
  return (r << 16) | (g << 8) | b;
}

function _darken2(color: number, amount: number): number {
  const r = Math.max(0, Math.floor(((color >> 16) & 0xFF) * (1 - amount)));
  const g = Math.max(0, Math.floor(((color >> 8) & 0xFF) * (1 - amount)));
  const b = Math.max(0, Math.floor((color & 0xFF) * (1 - amount)));
  return (r << 16) | (g << 8) | b;
}
