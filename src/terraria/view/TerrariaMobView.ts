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
      // Glow
      g.circle(sx, sy + bob, 7); g.fill({ color: di.item.color, alpha: pulse });
      // Item body
      g.moveTo(sx, sy - 5 + bob); g.lineTo(sx + 4, sy + bob);
      g.lineTo(sx, sy + 5 + bob); g.lineTo(sx - 4, sy + bob);
      g.closePath(); g.fill(di.item.color);
      // Specular
      g.circle(sx - 1, sy - 1 + bob, 1.5); g.fill({ color: 0xFFFFFF, alpha: 0.3 });
    }
  }

  // ===========================================================================
  // SLIME — bouncy blob with internal organs
  // ===========================================================================
  private _slime(g: Graphics, sx: number, sy: number, pw: number, ph: number, c: number, wp: number): void {
    const sq = 1 + Math.sin(wp * 2) * 0.18;
    const w = pw * sq * 0.55; const h = ph * 0.55 / sq;
    // Shadow
    g.ellipse(sx, sy, w * 0.8, 2); g.fill({ color: 0x000000, alpha: 0.15 });
    // Body
    g.ellipse(sx, sy - h, w, h); g.fill(c);
    // Inner highlight
    g.ellipse(sx - w * 0.2, sy - h * 1.3, w * 0.35, h * 0.3);
    g.fill({ color: 0xFFFFFF, alpha: 0.2 });
    // Nucleus (darker core)
    g.ellipse(sx + w * 0.1, sy - h * 0.7, w * 0.25, h * 0.25);
    g.fill({ color: 0x000000, alpha: 0.12 });
    // Eyes
    g.ellipse(sx - w * 0.25, sy - h * 1.05, 2, 2.5); g.fill(0xFFFFFF);
    g.circle(sx - w * 0.25 + 0.5, sy - h * 1.05, 1); g.fill(0x111111);
    g.ellipse(sx + w * 0.15, sy - h * 1.05, 2, 2.5); g.fill(0xFFFFFF);
    g.circle(sx + w * 0.15 + 0.5, sy - h * 1.05, 1); g.fill(0x111111);
    // Mouth
    g.moveTo(sx - w * 0.15, sy - h * 0.8);
    g.quadraticCurveTo(sx, sy - h * 0.65, sx + w * 0.15, sy - h * 0.8);
    g.stroke({ color: 0x000000, width: 0.8, alpha: 0.3 });
  }

  // ===========================================================================
  // SPIDER — segmented body, jointed legs, fangs
  // ===========================================================================
  private _spider(g: Graphics, sx: number, sy: number, pw: number, ph: number, c: number, wp: number, d: number): void {
    const bw = pw * 0.4; const bh = ph * 0.35;
    const hw = pw * 0.22; const hh = ph * 0.22;
    const headX = sx + d * pw * 0.32;
    // Abdomen
    g.ellipse(sx - d * pw * 0.1, sy - bh, bw, bh); g.fill(c);
    // Abdomen pattern
    g.ellipse(sx - d * pw * 0.1, sy - bh * 1.1, bw * 0.3, bh * 0.2);
    g.fill({ color: 0xFF0000, alpha: 0.2 });
    // Cephalothorax
    g.ellipse(headX, sy - hh * 0.8, hw, hh); g.fill(c);
    // 4 leg pairs with knee joints
    for (let i = 0; i < 4; i++) {
      const baseX = sx + (i - 1.5) * pw * 0.18;
      const lp = wp * 3 + i * 0.9;
      const footDy = Math.sin(lp) * 2;
      for (const side of [-1, 1]) {
        const kneeX = baseX + side * pw * 0.2;
        const kneeY = sy - ph * 0.25 - Math.abs(Math.sin(lp + side)) * 2;
        const footX = kneeX + side * pw * 0.15;
        const footY = sy + footDy;
        // Upper segment
        g.moveTo(baseX, sy - bh * 0.5);
        g.lineTo(kneeX, kneeY);
        g.stroke({ color: c, width: 1.2 });
        // Lower segment
        g.moveTo(kneeX, kneeY);
        g.lineTo(footX, footY);
        g.stroke({ color: c, width: 1 });
      }
    }
    // Fangs
    g.moveTo(headX + d * hw * 0.3, sy - hh * 0.3);
    g.lineTo(headX + d * hw * 0.6, sy + 1);
    g.stroke({ color: 0xDDDDCC, width: 1 });
    g.moveTo(headX + d * hw * 0.1, sy - hh * 0.3);
    g.lineTo(headX + d * hw * 0.3, sy + 1);
    g.stroke({ color: 0xDDDDCC, width: 1 });
    // Eyes (multiple)
    for (let i = 0; i < 3; i++) {
      const ex = headX + d * (hw * 0.2 + i * 2);
      const ey = sy - hh * 1.0 - i * 0.5;
      g.circle(ex, ey, 1.2 - i * 0.2); g.fill(0xFF0000);
    }
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
    // Tail
    const tx = sx - d * pw * 0.45;
    g.moveTo(tx, sy - ph * 0.35);
    g.quadraticCurveTo(tx - d * pw * 0.2, sy - ph * 0.6 + tailWag, tx - d * pw * 0.35, sy - ph * 0.45 + tailWag);
    g.stroke({ color: c, width: 3 });
    // Body
    g.ellipse(sx, sy - ph * 0.35, pw * 0.45, ph * 0.28); g.fill(c);
    // Chest (lighter)
    g.ellipse(sx + d * pw * 0.15, sy - ph * 0.3, pw * 0.15, ph * 0.15);
    g.fill({ color: 0xFFFFFF, alpha: 0.12 });
    // Head
    const hx = sx + d * pw * 0.4; const hy = sy - ph * 0.55;
    g.ellipse(hx, hy, pw * 0.2, ph * 0.17); g.fill(c);
    // Muzzle
    g.ellipse(hx + d * pw * 0.18, hy + ph * 0.04, pw * 0.1, ph * 0.08); g.fill(c);
    g.circle(hx + d * pw * 0.25, hy + ph * 0.02, 1.2); g.fill(0x222222); // nose
    // Ears (triangles)
    g.moveTo(hx - pw * 0.05, hy - ph * 0.15);
    g.lineTo(hx - pw * 0.1, hy - ph * 0.3);
    g.lineTo(hx + pw * 0.02, hy - ph * 0.15); g.closePath(); g.fill(c);
    g.moveTo(hx + pw * 0.05, hy - ph * 0.15);
    g.lineTo(hx + pw * 0.1, hy - ph * 0.3);
    g.lineTo(hx + pw * 0.15, hy - ph * 0.15); g.closePath(); g.fill(c);
    // Eye
    g.circle(hx + d * pw * 0.08, hy - ph * 0.03, 1.5); g.fill(0xFFCC00);
    g.circle(hx + d * pw * 0.08, hy - ph * 0.03, 0.7); g.fill(0x111100);
    // Legs
    for (const lx of [-0.2, 0.2]) {
      const legX = sx + lx * pw;
      const swing = lx < 0 ? ls : -ls;
      g.moveTo(legX, sy - ph * 0.1);
      g.lineTo(legX + swing * 0.5, sy);
      g.stroke({ color: c, width: 2.5 });
    }
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
