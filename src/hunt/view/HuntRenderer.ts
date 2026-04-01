// ---------------------------------------------------------------------------
// Hunt mode — forest scene + entity renderer
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { HuntState } from "../state/HuntState";
import { PREY, HuntConfig } from "../config/HuntConfig";

const FONT = "Georgia, serif";
const COL = 0x88aa44;

export class HuntRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _ui = new Container();

  init(sw: number, sh: number): void {
    this.container.removeChildren();
    const bg = new Graphics();
    // Forest floor base — richer green with subtle gradient
    bg.rect(0, 0, sw, sh).fill({ color: 0x1a2a1a });
    for (let gy = 0; gy < sh; gy += 2) {
      const t = gy / sh;
      const col = t < 0.25 ? 0x1e2e1e : t < 0.5 ? 0x1c2c1a : t < 0.75 ? 0x1a2818 : 0x172616;
      bg.moveTo(0, gy).lineTo(sw, gy).stroke({ color: col, width: 1, alpha: 0.08 });
    }

    // Large terrain variation patches (clearings, darker thickets)
    for (let pi = 0; pi < 50; pi++) {
      const px2 = (pi * 8291 % sw), py2 = (pi * 5347 % sh);
      const pr = 20 + (pi * 2713 % 40);
      const patchType = pi % 5;
      if (patchType === 0) {
        // Darker thicket area
        bg.ellipse(px2, py2, pr, pr * 0.7).fill({ color: 0x142014, alpha: 0.2 });
      } else if (patchType === 1) {
        // Mossy patch (greener)
        bg.ellipse(px2, py2, pr * 0.8, pr * 0.5).fill({ color: 0x1e3a16, alpha: 0.18 });
      } else {
        // Earthy patch
        bg.ellipse(px2, py2, pr * 0.7, pr * 0.6).fill({ color: 0x1a2818, alpha: 0.12 });
      }
    }

    // Dirt paths winding through the forest
    for (let path = 0; path < 3; path++) {
      let pathX = (path * 4721 % sw), pathY = (path * 3191 % sh);
      bg.moveTo(pathX, pathY);
      for (let seg = 0; seg < 8; seg++) {
        pathX += (((path * 7 + seg * 13) * 3571 % 200) - 100);
        pathY += (((path * 11 + seg * 17) * 2917 % 160) - 80);
        pathX = Math.max(50, Math.min(sw - 50, pathX));
        pathY = Math.max(50, Math.min(sh - 50, pathY));
        bg.lineTo(pathX, pathY);
      }
      bg.stroke({ color: 0x2a2218, width: 8, alpha: 0.12 });
      // Path edge (lighter dirt)
      bg.stroke({ color: 0x332a1a, width: 12, alpha: 0.06 });
    }

    // Background trees (varied sizes and types)
    for (let ti = 0; ti < 80; ti++) {
      const tx = (ti * 7919 % sw), ty = (ti * 4813 % sh);
      const tr = 14 + (ti * 3571 % 22);
      const treeType = ti % 4;

      // Tree shadow
      bg.ellipse(tx + 4, ty + tr + 3, tr * 0.9, tr * 0.2).fill({ color: 0x000000, alpha: 0.08 });

      if (treeType < 2) {
        // Deciduous tree — fuller canopy
        bg.rect(tx - 3, ty + tr * 0.2, 6, tr * 0.7).fill({ color: 0x2a1a0a, alpha: 0.3 });
        bg.rect(tx - 1, ty + tr * 0.3, 2, tr * 0.3).fill({ color: 0x3a2a1a, alpha: 0.15 }); // bark highlight
        // Multi-sphere canopy
        bg.circle(tx, ty - tr * 0.05, tr).fill({ color: 0x1a3a1a, alpha: 0.3 });
        bg.circle(tx - tr * 0.35, ty + tr * 0.1, tr * 0.7).fill({ color: 0x1e3e1e, alpha: 0.25 });
        bg.circle(tx + tr * 0.3, ty - tr * 0.05, tr * 0.65).fill({ color: 0x1c3c1a, alpha: 0.22 });
        bg.circle(tx - tr * 0.1, ty - tr * 0.3, tr * 0.55).fill({ color: 0x224422, alpha: 0.18 });
        // Leaf clusters (lighter spots)
        bg.circle(tx - tr * 0.2, ty - tr * 0.35, tr * 0.25).fill({ color: 0x2a5a2a, alpha: 0.12 });
        bg.circle(tx + tr * 0.15, ty - tr * 0.2, tr * 0.2).fill({ color: 0x285828, alpha: 0.1 });
      } else if (treeType === 2) {
        // Pine/conifer
        bg.rect(tx - 2, ty + tr * 0.3, 4, tr * 0.5).fill({ color: 0x2a1a08, alpha: 0.28 });
        for (let tier = 0; tier < 4; tier++) {
          const tierY = ty - tr * (0.1 + tier * 0.2);
          const tierW = tr * (0.8 - tier * 0.15);
          bg.moveTo(tx - tierW, tierY + tr * 0.15).lineTo(tx, tierY).lineTo(tx + tierW, tierY + tr * 0.15).fill({ color: 0x0a2a0a - tier * 0x000400, alpha: 0.25 });
        }
      } else {
        // Dead/bare tree
        bg.rect(tx - 2, ty - tr * 0.3, 4, tr * 1.0).fill({ color: 0x3a2a1a, alpha: 0.2 });
        // Branches
        bg.moveTo(tx, ty - tr * 0.1).lineTo(tx - tr * 0.5, ty - tr * 0.4).stroke({ color: 0x3a2a1a, width: 2, alpha: 0.15 });
        bg.moveTo(tx, ty + tr * 0.1).lineTo(tx + tr * 0.4, ty - tr * 0.2).stroke({ color: 0x3a2a1a, width: 1.5, alpha: 0.12 });
      }
    }

    // Grass tufts (many, varied)
    for (let gi = 0; gi < 200; gi++) {
      const gx = (gi * 6271 % sw), gy2 = (gi * 3413 % sh);
      const gh = 5 + (gi % 6) * 3;
      const gc = gi % 3 === 0 ? 0x2a4a2a : gi % 3 === 1 ? 0x224422 : 0x2a5a28;
      bg.moveTo(gx, gy2).bezierCurveTo(gx + 2, gy2 - gh * 0.5, gx - 2, gy2 - gh * 0.8, gx + 3, gy2 - gh).stroke({ color: gc, width: 1.2, alpha: 0.15 });
      bg.moveTo(gx + 4, gy2).bezierCurveTo(gx + 5, gy2 - gh * 0.4, gx + 3, gy2 - gh * 0.7, gx + 6, gy2 - gh * 0.9).stroke({ color: gc, width: 0.8, alpha: 0.12 });
      bg.moveTo(gx - 2, gy2).bezierCurveTo(gx - 3, gy2 - gh * 0.6, gx - 1, gy2 - gh * 0.85, gx - 4, gy2 - gh * 0.7).stroke({ color: gc, width: 0.8, alpha: 0.1 });
    }

    // Fallen leaves scattered
    for (let li = 0; li < 80; li++) {
      const lx = (li * 4567 % sw), ly = (li * 7823 % sh);
      const lc = [0x664422, 0x886633, 0x553311, 0x445522, 0x775533, 0x556622][li % 6];
      const ls = 2 + (li % 4);
      bg.ellipse(lx, ly, ls, ls * 0.6).fill({ color: lc, alpha: 0.1 });
      // Leaf vein
      bg.moveTo(lx - ls * 0.5, ly).lineTo(lx + ls * 0.5, ly).stroke({ color: lc, width: 0.3, alpha: 0.06 });
    }

    // Rocks / boulders
    for (let ri = 0; ri < 20; ri++) {
      const rx = (ri * 9371 % sw), ry = (ri * 6833 % sh);
      const rr = 5 + (ri * 4217 % 12);
      bg.ellipse(rx + 2, ry + 2, rr * 1.1, rr * 0.5).fill({ color: 0x000000, alpha: 0.05 }); // shadow
      bg.ellipse(rx, ry, rr, rr * 0.6).fill({ color: 0x3a3a30, alpha: 0.15 });
      bg.ellipse(rx - rr * 0.2, ry - rr * 0.15, rr * 0.6, rr * 0.3).fill({ color: 0x4a4a40, alpha: 0.08 }); // highlight
    }

    // Mushroom clusters
    for (let mi = 0; mi < 20; mi++) {
      const mx = (mi * 9137 % sw), my = (mi * 6143 % sh);
      const ms = 3 + (mi % 3) * 2;
      // Stem
      bg.rect(mx - 1, my, 2, ms).fill({ color: 0xddccaa, alpha: 0.15 });
      // Cap
      bg.ellipse(mx, my - 1, ms * 1.2, ms * 0.6).fill({ color: mi % 3 === 0 ? 0xcc4422 : mi % 3 === 1 ? 0x886644 : 0xaa8833, alpha: 0.13 });
      // Spots on red mushrooms
      if (mi % 3 === 0) {
        bg.circle(mx - ms * 0.3, my - 2, 1).fill({ color: 0xffffff, alpha: 0.08 });
        bg.circle(mx + ms * 0.2, my - 1.5, 0.8).fill({ color: 0xffffff, alpha: 0.06 });
      }
    }

    // Wildflowers
    for (let fi = 0; fi < 40; fi++) {
      const fx = (fi * 7331 % sw), fy = (fi * 5419 % sh);
      const fc = [0xdddd44, 0xff6688, 0x88aaff, 0xffaacc, 0xaaddff, 0xff8844][fi % 6];
      // Stem
      bg.moveTo(fx, fy).lineTo(fx + 1, fy - 6).stroke({ color: 0x2a4a2a, width: 0.5, alpha: 0.12 });
      // Petals
      bg.circle(fx + 1, fy - 7, 2.5).fill({ color: fc, alpha: 0.12 });
      bg.circle(fx + 1, fy - 7, 1).fill({ color: 0xffffaa, alpha: 0.08 }); // center
    }

    // Fallen logs
    for (let lo = 0; lo < 6; lo++) {
      const lox = (lo * 8123 % sw), loy = (lo * 5781 % sh);
      const loLen = 30 + (lo * 3917 % 40);
      const loAngle = (lo * 2741 % 628) / 100;
      bg.moveTo(lox, loy).lineTo(lox + Math.cos(loAngle) * loLen, loy + Math.sin(loAngle) * loLen).stroke({ color: 0x3a2a1a, width: 5, alpha: 0.12 });
      bg.moveTo(lox, loy).lineTo(lox + Math.cos(loAngle) * loLen, loy + Math.sin(loAngle) * loLen).stroke({ color: 0x4a3a2a, width: 3, alpha: 0.08 }); // bark highlight
      // Moss on log
      const midX = lox + Math.cos(loAngle) * loLen * 0.5, midY = loy + Math.sin(loAngle) * loLen * 0.5;
      bg.ellipse(midX, midY - 2, 6, 3).fill({ color: 0x2a4a2a, alpha: 0.08 });
    }

    // Sunlight dappling (bright spots filtering through canopy)
    for (let si = 0; si < 30; si++) {
      const sx2 = (si * 6547 % sw), sy = (si * 4391 % sh);
      const sr = 8 + (si * 3127 % 15);
      bg.circle(sx2, sy, sr).fill({ color: 0x4a6a3a, alpha: 0.04 });
      bg.circle(sx2, sy, sr * 0.5).fill({ color: 0x5a7a4a, alpha: 0.03 });
    }

    // Vignette
    for (let v = 0; v < 8; v++) {
      const i2 = v * 60;
      bg.rect(0, 0, i2, sh).fill({ color: 0x000000, alpha: 0.02 });
      bg.rect(sw - i2, 0, i2, sh).fill({ color: 0x000000, alpha: 0.02 });
      bg.rect(0, 0, sw, i2).fill({ color: 0x000000, alpha: 0.012 });
      bg.rect(0, sh - i2, sw, i2).fill({ color: 0x000000, alpha: 0.015 });
    }
    this.container.addChild(bg);
    this._gfx = new Graphics();
    this._ui = new Container();
    this.container.addChild(this._gfx);
    this.container.addChild(this._ui);
  }

  draw(state: HuntState, sw: number, sh: number): void {
    this._gfx.clear();
    while (this._ui.children.length > 0) this._ui.removeChildAt(0);
    const g = this._gfx;
    const ox = (sw - HuntConfig.FIELD_WIDTH) / 2, oy = (sh - HuntConfig.FIELD_HEIGHT) / 2;

    // Field border
    g.roundRect(ox - 2, oy - 2, HuntConfig.FIELD_WIDTH + 4, HuntConfig.FIELD_HEIGHT + 4, 4).stroke({ color: COL, width: 1, alpha: 0.2 });

    // Draw water zones (detailed ponds)
    for (const water of state.waterZones) {
      // Shore edge
      g.roundRect(ox + water.x - 3, oy + water.y - 3, water.w + 6, water.h + 6, 10).fill({ color: 0x3a3a28, alpha: 0.15 });
      // Water surface
      g.roundRect(ox + water.x, oy + water.y, water.w, water.h, 8).fill({ color: 0x1a3366, alpha: 0.35 });
      g.roundRect(ox + water.x, oy + water.y, water.w, water.h, 8).stroke({ color: 0x4466cc, width: 1.5, alpha: 0.2 });
      // Reflection shimmer
      g.roundRect(ox + water.x + water.w * 0.15, oy + water.y + water.h * 0.2, water.w * 0.3, water.h * 0.15, 4).fill({ color: 0x6688cc, alpha: 0.1 });
      // Ripple lines (more)
      for (let ri = 0; ri < 5; ri++) {
        const ry = water.y + 4 + ri * (water.h / 5);
        const rippleOff = Math.sin(Date.now() / 600 + ri) * 3;
        g.moveTo(ox + water.x + 6, oy + ry + rippleOff).bezierCurveTo(ox + water.x + water.w * 0.3, oy + ry - 2 + rippleOff, ox + water.x + water.w * 0.7, oy + ry + 2 + rippleOff, ox + water.x + water.w - 6, oy + ry + rippleOff).stroke({ color: 0x5577cc, width: 0.6, alpha: 0.12 });
      }
      // Lily pads
      for (let lp = 0; lp < 3; lp++) {
        const lpx = ox + water.x + 10 + (lp * 4217 % Math.max(1, water.w - 20));
        const lpy = oy + water.y + 8 + (lp * 3119 % Math.max(1, water.h - 16));
        g.circle(lpx, lpy, 4).fill({ color: 0x226622, alpha: 0.2 });
        g.circle(lpx, lpy, 2.5).fill({ color: 0x2a7a2a, alpha: 0.15 });
      }
      // Reeds at edges
      for (let re = 0; re < 4; re++) {
        const rex = ox + water.x + re * (water.w / 3);
        const rey = oy + water.y;
        g.moveTo(rex, rey).lineTo(rex + 1, rey - 10).stroke({ color: 0x3a5a2a, width: 1, alpha: 0.2 });
        g.moveTo(rex + 3, rey).lineTo(rex + 2, rey - 8).stroke({ color: 0x3a5a2a, width: 0.8, alpha: 0.15 });
      }
    }

    // Draw brush zones (dense undergrowth)
    for (const brush of state.brushZones) {
      // Outer soft edge
      g.roundRect(ox + brush.x - 2, oy + brush.y - 2, brush.w + 4, brush.h + 4, 8).fill({ color: 0x2a4a1a, alpha: 0.12 });
      // Main brush fill
      g.roundRect(ox + brush.x, oy + brush.y, brush.w, brush.h, 6).fill({ color: 0x2a4a1a, alpha: 0.35 });
      // Darker patches within
      g.ellipse(ox + brush.x + brush.w * 0.3, oy + brush.y + brush.h * 0.4, brush.w * 0.25, brush.h * 0.2).fill({ color: 0x1a3a12, alpha: 0.15 });
      // Grass blades (many more, varied)
      for (let bi = 0; bi < 16; bi++) {
        const bx = ox + brush.x + 4 + (bi * 3917 % Math.max(1, brush.w - 8));
        const by = oy + brush.y + brush.h - 2;
        const bh = 8 + (bi % 4) * 4;
        const sway = Math.sin(Date.now() / 500 + bi * 0.7) * 2;
        g.moveTo(bx, by).bezierCurveTo(bx + sway, by - bh * 0.5, bx - 1 + sway, by - bh * 0.8, bx + 2 + sway, by - bh).stroke({ color: 0x3a5a2a, width: 1.2, alpha: 0.3 });
        g.moveTo(bx + 3, by).bezierCurveTo(bx + 4 + sway * 0.7, by - bh * 0.4, bx + 2 + sway * 0.7, by - bh * 0.6, bx + 5 + sway * 0.7, by - bh * 0.8).stroke({ color: 0x3a5a2a, width: 0.8, alpha: 0.2 });
      }
      // Small flowers in brush
      for (let fi = 0; fi < 3; fi++) {
        const fx2 = ox + brush.x + 6 + (fi * 5413 % Math.max(1, brush.w - 12));
        const fy2 = oy + brush.y + 4 + (fi * 3217 % Math.max(1, brush.h - 8));
        const fc2 = [0xdddd66, 0xff88aa, 0xaaccff][fi % 3];
        g.circle(fx2, fy2, 2).fill({ color: fc2, alpha: 0.2 });
      }
    }

    // Draw ammo pickups (scaled up)
    for (const pickup of state.ammoPickups) {
      if (pickup.collected) continue;
      const apx = ox + pickup.x, apy = oy + pickup.y;
      const pulse = 0.4 + Math.sin(Date.now() / 400) * 0.2;
      g.circle(apx, apy, 16).fill({ color: 0xccaa66, alpha: pulse * 0.2 });
      g.circle(apx, apy, 11).fill({ color: 0xccaa66, alpha: pulse * 0.4 });
      g.circle(apx, apy, 7).fill({ color: 0xeedd88, alpha: pulse * 0.6 });
      // Arrow icon (larger)
      g.moveTo(apx - 6, apy + 4).lineTo(apx + 6, apy - 4).stroke({ color: 0xeedd88, width: 2, alpha: 0.7 });
      g.moveTo(apx + 4, apy - 4).lineTo(apx + 7, apy - 5).lineTo(apx + 6, apy - 2).stroke({ color: 0xeedd88, width: 1.5, alpha: 0.6 });
      // Fletching
      g.moveTo(apx - 6, apy + 4).lineTo(apx - 8, apy + 2).stroke({ color: 0xff6644, width: 1, alpha: 0.5 });
      g.moveTo(apx - 6, apy + 4).lineTo(apx - 8, apy + 6).stroke({ color: 0xff6644, width: 1, alpha: 0.5 });
    }

    // Draw trees (obstacles) — detailed with roots, bark, layered canopy
    for (const tree of state.trees) {
      const tx = ox + tree.x, ty = oy + tree.y;
      const tr = tree.r;
      // Shadow
      g.ellipse(tx + 3, ty + tr * 0.6, tr * 1.1, tr * 0.25).fill({ color: 0x000000, alpha: 0.08 });
      // Roots
      for (let ri = 0; ri < 3; ri++) {
        const rx = tx + (ri - 1) * 3;
        g.moveTo(rx, ty + tr * 0.5).quadraticCurveTo(rx + (ri - 1) * 4, ty + tr * 0.7, rx + (ri - 1) * 6, ty + tr * 0.55).stroke({ color: 0x3a2a1a, width: 2, alpha: 0.4 });
      }
      // Trunk with bark texture
      g.rect(tx - 3, ty - tr * 0.1, 6, tr * 0.7).fill({ color: 0x3a2a1a, alpha: 0.65 });
      g.rect(tx - 1, ty, 2, tr * 0.4).fill({ color: 0x4a3a2a, alpha: 0.25 }); // bark highlight
      g.moveTo(tx - 2, ty + tr * 0.1).lineTo(tx - 2, ty + tr * 0.4).stroke({ color: 0x2a1a0a, width: 0.5, alpha: 0.2 }); // bark line
      // Canopy (multi-layer with highlights)
      g.circle(tx, ty - tr * 0.1, tr * 1.05).fill({ color: 0x163a16, alpha: 0.45 });
      g.circle(tx - tr * 0.3, ty - tr * 0.2, tr * 0.75).fill({ color: 0x1a4a1a, alpha: 0.5 });
      g.circle(tx + tr * 0.25, ty - tr * 0.15, tr * 0.7).fill({ color: 0x1a4a1a, alpha: 0.45 });
      g.circle(tx, ty - tr * 0.35, tr * 0.6).fill({ color: 0x1e4e1e, alpha: 0.4 });
      // Highlight patches
      g.circle(tx - tr * 0.15, ty - tr * 0.4, tr * 0.3).fill({ color: 0x225522, alpha: 0.2 });
      g.circle(tx + tr * 0.2, ty - tr * 0.3, tr * 0.25).fill({ color: 0x226622, alpha: 0.15 });
      // Edge definition
      g.circle(tx, ty - tr * 0.1, tr * 1.05).stroke({ color: 0x2a5a2a, width: 0.8, alpha: 0.15 });
    }

    // Draw prey (sorted by Y for depth)
    const sortedPrey = [...state.prey.filter(p => p.alive)].sort((a, b) => a.y - b.y);
    const now = Date.now();
    for (const prey of sortedPrey) {
      const def = PREY[prey.type];
      const px = ox + prey.x, py = oy + prey.y;
      const r = def.size;
      const cos = Math.cos(prey.angle), sin = Math.sin(prey.angle);
      // Walking animation phase based on speed + time
      const walkSpeed = prey.speed > 0.1 ? 1 : 0;
      const walkPhase = now / (prey.startled ? 80 : 150);

      // Helper: draw articulated leg with upper/lower segments, knee joint, and foot
      const drawLeg = (hipX: number, hipY: number, legLen: number, thickness: number, color: number, footColor: number, footR: number, phase: number, hasClaw = false) => {
        const swing = walkSpeed * Math.sin(phase) * 0.35;
        const upperLen = legLen * 0.5;
        const lowerLen = legLen * 0.55;
        // Upper leg (angled slightly back/forward with walk)
        const upperAngle = Math.PI / 2 + swing * 0.6;
        const kneeX = hipX + Math.cos(upperAngle) * upperLen * 0.3;
        const kneeY = hipY + Math.sin(upperAngle) * upperLen;
        g.moveTo(hipX, hipY).lineTo(kneeX, kneeY).stroke({ color, width: thickness });
        // Knee joint
        g.circle(kneeX, kneeY, thickness * 0.45).fill({ color: color - 0x080800 });
        // Lower leg (angled forward from knee)
        const lowerAngle = Math.PI / 2 - swing * 0.4;
        const footX = kneeX + Math.cos(lowerAngle) * lowerLen * 0.2;
        const footY = kneeY + Math.sin(lowerAngle) * lowerLen;
        g.moveTo(kneeX, kneeY).lineTo(footX, footY).stroke({ color: color - 0x060600, width: thickness * 0.85 });
        // Foot/hoof/paw
        g.ellipse(footX, footY, footR * 1.2, footR * 0.7).fill({ color: footColor });
        // Claws if applicable
        if (hasClaw) {
          for (let ci = -1; ci <= 1; ci++) {
            g.moveTo(footX + ci * footR * 0.5, footY).lineTo(footX + ci * footR * 0.7, footY + footR * 0.8).stroke({ color: 0x444433, width: r * 0.02 });
          }
        }
      };

      // Shadow
      g.ellipse(px + 1, py + r * 0.8, r * 0.9, 2.5).fill({ color: 0x000000, alpha: 0.15 });

      if (prey.type === "rabbit") {
        // Articulated legs — front pair and powerful rear pair
        const legPositions: [number, number, number][] = [
          [0.35, 0.25, 0], [0.35, -0.25, 1.5], // front
          [-0.3, 0.2, 3.0], [-0.3, -0.2, 4.5], // rear (larger)
        ];
        for (let li = 0; li < legPositions.length; li++) {
          const [lf, ls, phOff] = legPositions[li];
          const hipX = px + cos * r * lf + sin * r * ls;
          const hipY = py + sin * r * lf - cos * r * ls;
          const isRear = li >= 2;
          drawLeg(hipX, hipY, isRear ? r * 0.55 : r * 0.35, isRear ? r * 0.1 : r * 0.08, def.color - 0x111100, 0x332211, r * 0.06, walkPhase + phOff);
        }
        // Body
        g.ellipse(px, py, r * 0.9, r * 0.7).fill({ color: def.color });
        // Belly highlight
        g.ellipse(px - cos * r * 0.1, py - sin * r * 0.1, r * 0.5, r * 0.35).fill({ color: def.color + 0x222211, alpha: 0.3 });
        // Head
        g.circle(px + cos * r * 0.65, py + sin * r * 0.65, r * 0.5).fill({ color: def.color });
        // Cheeks
        g.ellipse(px + cos * r * 0.65 + sin * r * 0.2, py + sin * r * 0.65 - cos * r * 0.2, r * 0.2, r * 0.15).fill({ color: def.color + 0x111100, alpha: 0.3 });
        // Ears (long, with inner pink)
        for (const es of [-1, 1]) {
          const ex = px + cos * r * 0.6 + sin * es * r * 0.15;
          const ey = py + sin * r * 0.6 - cos * es * r * 0.15;
          g.ellipse(ex, ey - r * 0.5, r * 0.12, r * 0.4).fill({ color: def.color });
          g.ellipse(ex, ey - r * 0.5, r * 0.07, r * 0.3).fill({ color: 0xddaaaa, alpha: 0.3 });
        }
        // Nose
        g.circle(px + cos * r * 0.9, py + sin * r * 0.9, r * 0.08).fill({ color: 0xddaaaa });
        // Whiskers
        for (const ws of [-1, 1]) {
          g.moveTo(px + cos * r * 0.85 + sin * ws * r * 0.1, py + sin * r * 0.85 - cos * ws * r * 0.1)
            .lineTo(px + cos * r * 1.2 + sin * ws * r * 0.3, py + sin * r * 1.2 - cos * ws * r * 0.3)
            .stroke({ color: 0xccccbb, width: 0.5, alpha: 0.3 });
        }
        // Tail (fluffy white puff)
        g.circle(px - cos * r * 0.85, py - sin * r * 0.85, r * 0.2).fill({ color: 0xeeddcc, alpha: 0.7 });
        g.circle(px - cos * r * 0.8, py - sin * r * 0.8, r * 0.12).fill({ color: 0xffffff, alpha: 0.4 });
      } else if (prey.type === "deer" || prey.type === "stag") {
        // Articulated legs — 4 slender with proper joints
        const deerLegs: [number, number, number][] = [
          [0.4, 0.3, 0], [0.4, -0.3, 2], [-0.5, 0.25, 3.5], [-0.5, -0.25, 5],
        ];
        for (const [lf, ls, phOff] of deerLegs) {
          const hipX = px + cos * r * lf + sin * r * ls;
          const hipY = py + sin * r * lf - cos * r * ls;
          drawLeg(hipX, hipY, r * 0.65, r * 0.08, def.color - 0x111100, 0x332211, r * 0.05, walkPhase + phOff);
        }
        // Body (elongated, graceful)
        g.ellipse(px, py, r * 1.3, r * 0.7).fill({ color: def.color });
        // Back shading
        g.ellipse(px - cos * r * 0.2, py - sin * r * 0.2 - r * 0.15, r * 0.9, r * 0.3).fill({ color: def.color - 0x111100, alpha: 0.2 });
        // Spotted pattern on sides
        for (let si = 0; si < 6; si++) {
          const sx = px + ((si * 3571) % 7 - 3) * r * 0.15;
          const sy = py + ((si * 2713) % 5 - 2) * r * 0.1;
          g.circle(sx, sy, r * 0.06).fill({ color: 0xddccbb, alpha: 0.12 });
        }
        // White belly
        g.ellipse(px, py + r * 0.15, r * 0.8, r * 0.3).fill({ color: 0xddccbb, alpha: 0.25 });
        // White rump patch
        g.ellipse(px - cos * r * 0.9, py - sin * r * 0.9, r * 0.35, r * 0.3).fill({ color: 0xddccbb, alpha: 0.2 });
        // Neck
        g.moveTo(px + cos * r * 0.8 - sin * r * 0.15, py + sin * r * 0.8 + cos * r * 0.15)
          .quadraticCurveTo(px + cos * r * 1.1, py + sin * r * 1.1 - r * 0.3, px + cos * r * 1.3, py + sin * r * 1.3 - r * 0.35)
          .lineTo(px + cos * r * 1.3, py + sin * r * 1.3 - r * 0.35)
          .quadraticCurveTo(px + cos * r * 1.1, py + sin * r * 1.1 - r * 0.15, px + cos * r * 0.8 + sin * r * 0.15, py + sin * r * 0.8 - cos * r * 0.15)
          .fill({ color: def.color });
        // Head
        g.ellipse(px + cos * r * 1.4, py + sin * r * 1.4 - r * 0.35, r * 0.35, r * 0.28).fill({ color: def.color });
        // Ears
        for (const es of [-1, 1]) {
          g.ellipse(px + cos * r * 1.35 + sin * es * r * 0.2, py + sin * r * 1.35 - cos * es * r * 0.2 - r * 0.5, r * 0.08, r * 0.18).fill({ color: def.color });
          g.ellipse(px + cos * r * 1.35 + sin * es * r * 0.2, py + sin * r * 1.35 - cos * es * r * 0.2 - r * 0.5, r * 0.04, r * 0.12).fill({ color: 0xddaaaa, alpha: 0.2 });
        }
        // Nose
        g.circle(px + cos * r * 1.6, py + sin * r * 1.6 - r * 0.3, r * 0.07).fill({ color: 0x222211 });
        // Mouth line
        g.moveTo(px + cos * r * 1.5, py + sin * r * 1.5 - r * 0.25).lineTo(px + cos * r * 1.55, py + sin * r * 1.55 - r * 0.22).stroke({ color: 0x222211, width: 0.5, alpha: 0.3 });
        // Antlers (stag only)
        if (prey.type === "stag") {
          const ax = px + cos * r * 1.5, ay = py + sin * r * 1.5 - r * 0.55;
          for (const es of [-1, 1]) {
            g.moveTo(ax + sin * es * r * 0.05, ay).lineTo(ax + sin * es * r * 0.3, ay - r * 0.6).stroke({ color: 0xaa8844, width: r * 0.06 });
            g.moveTo(ax + sin * es * r * 0.15, ay - r * 0.25).lineTo(ax + sin * es * r * 0.4, ay - r * 0.35).stroke({ color: 0xaa8844, width: r * 0.04 });
            g.moveTo(ax + sin * es * r * 0.25, ay - r * 0.45).lineTo(ax + sin * es * r * 0.5, ay - r * 0.4).stroke({ color: 0xaa8844, width: r * 0.03 });
            g.moveTo(ax + sin * es * r * 0.28, ay - r * 0.55).lineTo(ax + sin * es * r * 0.35, ay - r * 0.7).stroke({ color: 0xaa8844, width: r * 0.025 });
          }
          g.circle(px, py, r * 1.5).fill({ color: 0xffd700, alpha: 0.04 + Math.sin(now / 300) * 0.02 });
        }
        // Tail
        const deerTailSway = Math.sin(now / 300) * 0.15;
        g.moveTo(px - cos * r * 1.0, py - sin * r * 1.0).lineTo(px - cos * r * 1.15 + Math.sin(deerTailSway) * r * 0.1, py - sin * r * 1.15 - r * 0.05).stroke({ color: def.color, width: r * 0.06 });
        g.ellipse(px - cos * r * 1.15, py - sin * r * 1.15 - r * 0.05, r * 0.1, r * 0.06).fill({ color: 0xddccbb, alpha: 0.4 });
      } else if (prey.type === "boar") {
        // Articulated legs — stocky
        const boarLegs: [number, number, number][] = [
          [0.4, 0.35, 0], [0.4, -0.35, 2], [-0.4, 0.3, 3.5], [-0.4, -0.3, 5],
        ];
        for (const [lf, ls, phOff] of boarLegs) {
          const hipX = px + cos * r * lf + sin * r * ls;
          const hipY = py + sin * r * lf - cos * r * ls;
          drawLeg(hipX, hipY, r * 0.5, r * 0.12, def.color - 0x111100, 0x332211, r * 0.07, walkPhase + phOff);
        }
        // Body (bulky)
        g.ellipse(px, py, r * 1.2, r * 0.85).fill({ color: def.color });
        // Darker back
        g.ellipse(px, py - r * 0.2, r * 1.0, r * 0.4).fill({ color: def.color - 0x111100, alpha: 0.3 });
        // Head
        g.ellipse(px + cos * r * 0.8, py + sin * r * 0.8, r * 0.5, r * 0.45).fill({ color: def.color });
        // Snout
        g.ellipse(px + cos * r * 1.15, py + sin * r * 1.15, r * 0.22, r * 0.18).fill({ color: def.color + 0x111100 });
        g.circle(px + cos * r * 1.25 + sin * r * 0.05, py + sin * r * 1.25 - cos * r * 0.05, r * 0.04).fill({ color: 0x222211 });
        g.circle(px + cos * r * 1.25 - sin * r * 0.05, py + sin * r * 1.25 + cos * r * 0.05, r * 0.04).fill({ color: 0x222211 });
        // Tusks
        for (const ts of [-1, 1]) {
          g.moveTo(px + cos * r * 1.0 + sin * ts * r * 0.2, py + sin * r * 1.0 - cos * ts * r * 0.2)
            .lineTo(px + cos * r * 1.35 + sin * ts * r * 0.25, py + sin * r * 1.35 - cos * ts * r * 0.25 - r * 0.05)
            .stroke({ color: 0xddddcc, width: r * 0.06 });
        }
        // Ears
        for (const es of [-1, 1]) {
          g.ellipse(px + cos * r * 0.6 + sin * es * r * 0.3, py + sin * r * 0.6 - cos * es * r * 0.3 - r * 0.25, r * 0.12, r * 0.15).fill({ color: def.color });
        }
        // Bristle ridge (spiky hair along back)
        for (let bi = 0; bi < 7; bi++) {
          const bx2 = px + cos * r * (-0.4 + bi * 0.15), by2 = py + sin * r * (-0.4 + bi * 0.15) - r * 0.55;
          g.moveTo(bx2, by2).lineTo(bx2 + Math.sin(now / 200 + bi) * 0.5, by2 - r * 0.15).stroke({ color: 0x443322, width: r * 0.04, alpha: 0.5 });
        }
        // Tail (curly)
        const tAngle = prey.angle + Math.PI;
        g.moveTo(px - cos * r * 0.9, py - sin * r * 0.9)
          .quadraticCurveTo(px + Math.cos(tAngle) * r * 1.3, py + Math.sin(tAngle) * r * 1.3 - r * 0.3, px + Math.cos(tAngle) * r * 1.1, py + Math.sin(tAngle) * r * 1.1)
          .stroke({ color: def.color, width: r * 0.05 });
      } else if (prey.type === "pheasant") {
        // Tail feathers (long, colorful, trailing)
        const tailColors = [0x886644, 0x996655, 0x775533, 0xaa7755, 0x887744];
        for (let fi = 0; fi < 5; fi++) {
          const fa = prey.angle + Math.PI + (fi - 2) * 0.15;
          const fLen = r * (2.0 + fi * 0.2);
          g.moveTo(px - cos * r * 0.3, py - sin * r * 0.3)
            .quadraticCurveTo(px + Math.cos(fa) * fLen * 0.5, py + Math.sin(fa) * fLen * 0.5 + (fi - 2) * r * 0.1, px + Math.cos(fa) * fLen, py + Math.sin(fa) * fLen)
            .stroke({ color: tailColors[fi], width: r * 0.08, alpha: 0.6 });
          // Feather barbs
          if (fi === 2) {
            for (let bi = 1; bi < 4; bi++) {
              const bt = bi / 4;
              const bx2 = px - cos * r * 0.3 + Math.cos(fa) * fLen * bt;
              const by2 = py - sin * r * 0.3 + Math.sin(fa) * fLen * bt;
              g.moveTo(bx2, by2).lineTo(bx2 + Math.cos(fa + 0.5) * r * 0.15, by2 + Math.sin(fa + 0.5) * r * 0.15).stroke({ color: 0x887744, width: 0.5, alpha: 0.3 });
            }
          }
        }
        // Articulated bird legs — thin, jointed
        for (const ls of [-0.15, 0.15]) {
          const lhx = px + sin * r * ls, lhy = py - cos * r * ls;
          const lSwing = walkSpeed * Math.sin(walkPhase + (ls > 0 ? 0 : Math.PI)) * 0.3;
          const kneeX2 = lhx + Math.cos(Math.PI * 0.4 + lSwing) * r * 0.15;
          const kneeY2 = lhy + Math.sin(Math.PI * 0.4 + lSwing) * r * 0.2;
          const footX2 = kneeX2;
          const footY2 = kneeY2 + r * 0.2;
          g.moveTo(lhx, lhy).lineTo(kneeX2, kneeY2).stroke({ color: 0xddaa44, width: r * 0.05 });
          g.moveTo(kneeX2, kneeY2).lineTo(footX2, footY2).stroke({ color: 0xddaa44, width: r * 0.04 });
          // Bird toes (3)
          for (const toe of [-0.4, 0, 0.4]) {
            g.moveTo(footX2, footY2).lineTo(footX2 + Math.cos(toe) * r * 0.1, footY2 + r * 0.05).stroke({ color: 0xddaa44, width: r * 0.02 });
          }
        }
        // Body
        g.ellipse(px, py, r * 0.8, r * 0.55).fill({ color: def.color });
        // Wing detail
        g.ellipse(px - cos * r * 0.15 + sin * r * 0.15, py - sin * r * 0.15 - cos * r * 0.15, r * 0.5, r * 0.35).fill({ color: def.color - 0x111100, alpha: 0.4 });
        // Wing feather lines
        for (let wf = 0; wf < 3; wf++) {
          const wfx = px - cos * r * (0.1 - wf * 0.1) + sin * r * 0.2;
          const wfy = py - sin * r * (0.1 - wf * 0.1) - cos * r * 0.2;
          g.moveTo(wfx, wfy).lineTo(wfx - sin * r * 0.3, wfy + cos * r * 0.3).stroke({ color: def.color - 0x222200, width: 0.5, alpha: 0.3 });
        }
        // Head (red/green iridescent)
        g.circle(px + cos * r * 0.55, py + sin * r * 0.55, r * 0.35).fill({ color: 0x224422 });
        // Red face wattle
        g.circle(px + cos * r * 0.65 + sin * r * 0.1, py + sin * r * 0.65 - cos * r * 0.1, r * 0.12).fill({ color: 0xcc2222, alpha: 0.6 });
        // Beak
        g.moveTo(px + cos * r * 0.75, py + sin * r * 0.75)
          .lineTo(px + cos * r * 1.1, py + sin * r * 1.1)
          .stroke({ color: 0xddaa44, width: r * 0.07 });
        // White neck ring
        g.ellipse(px + cos * r * 0.4, py + sin * r * 0.4, r * 0.25, r * 0.08).fill({ color: 0xffffff, alpha: 0.25 });
      } else if (prey.type === "fox") {
        // Bushy tail (drawn first, behind body)
        const tailAngle = prey.angle + Math.PI + Math.sin(now / 200) * 0.3;
        g.ellipse(px + Math.cos(tailAngle) * r * 1.2, py + Math.sin(tailAngle) * r * 1.2, r * 0.5, r * 0.25).fill({ color: def.color, alpha: 0.85 });
        g.ellipse(px + Math.cos(tailAngle) * r * 1.4, py + Math.sin(tailAngle) * r * 1.4, r * 0.3, r * 0.15).fill({ color: def.color, alpha: 0.7 });
        g.circle(px + Math.cos(tailAngle) * r * 1.55, py + Math.sin(tailAngle) * r * 1.55, r * 0.1).fill({ color: 0xffffff, alpha: 0.5 });
        // Articulated legs
        const foxLegs: [number, number, number][] = [
          [0.3, 0.25, 0], [0.3, -0.25, 2], [-0.35, 0.2, 3.5], [-0.35, -0.2, 5],
        ];
        for (const [lf, ls, phOff] of foxLegs) {
          const hipX = px + cos * r * lf + sin * r * ls;
          const hipY = py + sin * r * lf - cos * r * ls;
          drawLeg(hipX, hipY, r * 0.45, r * 0.06, 0x222211, 0x222211, r * 0.04, walkPhase + phOff);
        }
        // Body
        g.ellipse(px, py, r * 1.1, r * 0.55).fill({ color: def.color });
        // Dark back stripe
        g.ellipse(px, py - r * 0.15, r * 0.8, r * 0.2).fill({ color: def.color - 0x222200, alpha: 0.25 });
        // White chest/belly
        g.ellipse(px + cos * r * 0.3, py + sin * r * 0.3 + r * 0.1, r * 0.4, r * 0.2).fill({ color: 0xeeddcc, alpha: 0.3 });
        // Pointed head
        g.moveTo(px + cos * r * 0.7 - sin * r * 0.25, py + sin * r * 0.7 + cos * r * 0.25)
          .lineTo(px + cos * r * 1.35, py + sin * r * 1.35)
          .lineTo(px + cos * r * 0.7 + sin * r * 0.25, py + sin * r * 0.7 - cos * r * 0.25)
          .fill({ color: def.color });
        // Black nose
        g.circle(px + cos * r * 1.3, py + sin * r * 1.3, r * 0.06).fill({ color: 0x111111 });
        // Pointed ears (triangular with dark tips)
        for (const es of [-1, 1]) {
          const ex = px + cos * r * 0.8 + sin * es * r * 0.2;
          const ey = py + sin * r * 0.8 - cos * es * r * 0.2;
          g.moveTo(ex - sin * es * r * 0.1, ey + cos * es * r * 0.1).lineTo(ex, ey - r * 0.25).lineTo(ex + sin * es * r * 0.1, ey - cos * es * r * 0.1).fill({ color: def.color });
          g.moveTo(ex, ey - r * 0.2).lineTo(ex, ey - r * 0.25).stroke({ color: 0x222211, width: r * 0.04 });
        }
        // Whiskers
        for (const ws of [-1, 1]) {
          g.moveTo(px + cos * r * 1.15 + sin * ws * r * 0.1, py + sin * r * 1.15 - cos * ws * r * 0.1)
            .lineTo(px + cos * r * 1.4 + sin * ws * r * 0.35, py + sin * r * 1.4 - cos * ws * r * 0.35)
            .stroke({ color: 0xccccbb, width: 0.5, alpha: 0.25 });
        }
      } else if (prey.type === "wolf") {
        // Articulated legs — muscular
        const wolfLegs: [number, number, number][] = [
          [0.4, 0.25, 0], [0.4, -0.25, 2], [-0.4, 0.2, 3.5], [-0.4, -0.2, 5],
        ];
        for (const [lf, ls, phOff] of wolfLegs) {
          const hipX = px + cos * r * lf + sin * r * ls;
          const hipY = py + sin * r * lf - cos * r * ls;
          drawLeg(hipX, hipY, r * 0.55, r * 0.09, def.color - 0x111111, 0x333333, r * 0.05, walkPhase + phOff);
        }
        // Body (lean, muscular)
        g.ellipse(px, py, r * 1.3, r * 0.6).fill({ color: def.color });
        // Darker back
        g.ellipse(px, py - r * 0.15, r * 1.0, r * 0.25).fill({ color: def.color - 0x111111, alpha: 0.3 });
        // Lighter belly
        g.ellipse(px, py + r * 0.15, r * 0.8, r * 0.2).fill({ color: def.color + 0x111111, alpha: 0.2 });
        // Rib/muscle lines
        for (let rl = 0; rl < 3; rl++) {
          const rx = px + cos * r * (-0.2 + rl * 0.2);
          const ry = py + sin * r * (-0.2 + rl * 0.2);
          g.moveTo(rx, ry - r * 0.3).quadraticCurveTo(rx + sin * r * 0.15, ry, rx, ry + r * 0.2).stroke({ color: def.color - 0x111111, width: 0.5, alpha: 0.15 });
        }
        // Head
        g.ellipse(px + cos * r * 0.85, py + sin * r * 0.85, r * 0.4, r * 0.32).fill({ color: def.color });
        // Snout
        g.ellipse(px + cos * r * 1.05, py + sin * r * 1.05, r * 0.2, r * 0.15).fill({ color: def.color + 0x111111 });
        g.circle(px + cos * r * 1.15, py + sin * r * 1.15, r * 0.06).fill({ color: 0x111111 });
        // Pointed ears
        for (const es of [-1, 1]) {
          const ex = px + cos * r * 0.7 + sin * es * r * 0.25;
          const ey = py + sin * r * 0.7 - cos * es * r * 0.25;
          g.moveTo(ex - sin * es * r * 0.08, ey + cos * es * r * 0.08).lineTo(ex, ey - r * 0.25).lineTo(ex + sin * es * r * 0.08, ey - cos * es * r * 0.08).fill({ color: def.color });
        }
        // Tail (bushy, lowered)
        const wTail = prey.angle + Math.PI + 0.2;
        g.moveTo(px - cos * r * 1.0, py - sin * r * 1.0)
          .quadraticCurveTo(px + Math.cos(wTail) * r * 1.4, py + Math.sin(wTail) * r * 1.4, px + Math.cos(wTail) * r * 1.2, py + Math.sin(wTail) * r * 1.2 + r * 0.2)
          .stroke({ color: def.color, width: r * 0.12 });
        // Eyes
        const eyeColor = prey.aggressive ? 0xff2222 : 0xffcc44;
        for (const es of [-1, 1]) {
          g.circle(px + cos * r * 0.95 + sin * es * r * 0.1, py + sin * r * 0.95 - cos * es * r * 0.1, r * 0.06).fill({ color: eyeColor });
          if (prey.aggressive) {
            g.circle(px + cos * r * 0.95 + sin * es * r * 0.1, py + sin * r * 0.95 - cos * es * r * 0.1, r * 0.09).fill({ color: 0xff0000, alpha: 0.15 });
          }
        }
        // Fangs when aggressive
        if (prey.aggressive) {
          for (const fs of [-1, 1]) {
            g.moveTo(px + cos * r * 1.05 + sin * fs * r * 0.08, py + sin * r * 1.05 - cos * fs * r * 0.08)
              .lineTo(px + cos * r * 1.15 + sin * fs * r * 0.1, py + sin * r * 1.15 - cos * fs * r * 0.1 + r * 0.08)
              .stroke({ color: 0xeeeeee, width: r * 0.03 });
          }
          // Snarl line
          g.moveTo(px + cos * r * 0.98 - sin * r * 0.12, py + sin * r * 0.98 + cos * r * 0.12)
            .lineTo(px + cos * r * 1.1, py + sin * r * 1.1)
            .lineTo(px + cos * r * 0.98 + sin * r * 0.12, py + sin * r * 0.98 - cos * r * 0.12)
            .stroke({ color: 0x111111, width: 0.5, alpha: 0.4 });
        }
      } else if (prey.type === "bear") {
        // Articulated legs — thick and powerful
        const bearLegs: [number, number, number][] = [
          [0.35, 0.35, 0], [0.35, -0.35, 2], [-0.35, 0.3, 3.5], [-0.35, -0.3, 5],
        ];
        for (const [lf, ls, phOff] of bearLegs) {
          const hipX = px + cos * r * lf + sin * r * ls;
          const hipY = py + sin * r * lf - cos * r * ls;
          drawLeg(hipX, hipY, r * 0.55, r * 0.15, def.color - 0x111100, 0x332211, r * 0.09, walkPhase + phOff, true);
        }
        // Body (massive, round)
        g.ellipse(px, py, r * 1.1, r * 0.85).fill({ color: def.color });
        // Hump (shoulder muscle)
        g.ellipse(px - cos * r * 0.2, py - sin * r * 0.2 - r * 0.2, r * 0.6, r * 0.35).fill({ color: def.color - 0x0a0a00, alpha: 0.4 });
        // Lighter belly
        g.ellipse(px + cos * r * 0.1, py + sin * r * 0.1 + r * 0.15, r * 0.7, r * 0.3).fill({ color: def.color + 0x111100, alpha: 0.2 });
        // Fur texture lines
        for (let fl = 0; fl < 5; fl++) {
          const fx2 = px + ((fl * 3571 - 7) % 7) * r * 0.12;
          const fy2 = py + ((fl * 2713 - 5) % 5) * r * 0.1 - r * 0.1;
          g.moveTo(fx2, fy2).lineTo(fx2 + r * 0.08, fy2 + r * 0.12).stroke({ color: def.color - 0x0a0a00, width: 0.5, alpha: 0.15 });
        }
        // Head
        g.circle(px + cos * r * 0.7, py + sin * r * 0.7, r * 0.5).fill({ color: def.color });
        // Round ears
        for (const es of [-1, 1]) {
          g.circle(px + cos * r * 0.6 + sin * es * r * 0.35, py + sin * r * 0.6 - cos * es * r * 0.35 - r * 0.15, r * 0.15).fill({ color: def.color });
          g.circle(px + cos * r * 0.6 + sin * es * r * 0.35, py + sin * r * 0.6 - cos * es * r * 0.35 - r * 0.15, r * 0.08).fill({ color: def.color + 0x111100, alpha: 0.3 });
        }
        // Snout
        g.ellipse(px + cos * r * 0.95, py + sin * r * 0.95, r * 0.22, r * 0.18).fill({ color: 0x664433 });
        // Nose
        g.circle(px + cos * r * 1.1, py + sin * r * 1.1, r * 0.08).fill({ color: 0x222211 });
        // Eyes (small, dark)
        for (const es of [-1, 1]) {
          g.circle(px + cos * r * 0.75 + sin * es * r * 0.15, py + sin * r * 0.75 - cos * es * r * 0.15, r * 0.05).fill({ color: 0x111111 });
          g.circle(px + cos * r * 0.75 + sin * es * r * 0.15 + r * 0.01, py + sin * r * 0.75 - cos * es * r * 0.15 - r * 0.01, r * 0.02).fill({ color: 0x444444, alpha: 0.4 });
        }
        // Aggressive glow
        if (prey.aggressive) {
          g.circle(px, py, r * 1.3).fill({ color: 0xff2200, alpha: 0.05 });
        }
      } else {
        // Generic — also gets articulated legs
        const genLegs: [number, number, number][] = [[0.3, 0.2, 0], [0.3, -0.2, 2], [-0.3, 0.2, 3.5], [-0.3, -0.2, 5]];
        for (const [lf, ls, phOff] of genLegs) {
          const hipX = px + cos * r * lf + sin * r * ls;
          const hipY = py + sin * r * lf - cos * r * ls;
          drawLeg(hipX, hipY, r * 0.4, r * 0.08, def.color - 0x111100, 0x332211, r * 0.05, walkPhase + phOff);
        }
        g.ellipse(px, py, r * 1.2, r * 0.8).fill({ color: def.color });
        g.circle(px + cos * r, py + sin * r, r * 0.5).fill({ color: def.color });
      }
      // Eye (universal, scaled)
      const hx = px + cos * r * 0.8, hy = py + sin * r * 0.8;
      g.circle(hx + cos * 3 + sin * 2, hy + sin * 3 - cos * 2, r * 0.12).fill({ color: 0x111111 });
      g.circle(hx + cos * 3.5 + sin * 2.5, hy + sin * 3.5 - cos * 2.5, r * 0.05).fill({ color: 0xffffff, alpha: 0.4 });
      // Startled indicator (scaled)
      if (prey.startled) {
        g.moveTo(px, py - r - 8).lineTo(px, py - r - 20).stroke({ color: 0xff4444, width: 3 });
        g.circle(px, py - r - 24, 3).fill({ color: 0xff4444 });
      }
      // HP for multi-hp prey (scaled)
      if (def.hp > 1 && prey.hp < def.hp) {
        g.rect(px - r, py - r - 10, r * 2, 5).fill({ color: 0x220000, alpha: 0.6 });
        g.rect(px - r, py - r - 10, r * 2 * (prey.hp / def.hp), 5).fill({ color: 0x44cc44 });
      }
    }

    // Draw arrows (scaled up)
    for (const arrow of state.arrows) {
      const apx2 = ox + arrow.x, apy2 = oy + arrow.y;
      const angle = Math.atan2(arrow.vy, arrow.vx);
      const ac = Math.cos(angle), as2 = Math.sin(angle);
      // Arrow shaft
      g.moveTo(apx2 - ac * 18, apy2 - as2 * 18).lineTo(apx2, apy2).stroke({ color: 0xccaa66, width: 2.5 });
      // Arrowhead
      g.moveTo(apx2, apy2).lineTo(apx2 + ac * 8, apy2 + as2 * 8).stroke({ color: 0xaaaaaa, width: 3 });
      // Fletching (3 feathers)
      for (const fOff of [-0.4, 0, 0.4]) {
        g.moveTo(apx2 - ac * 16, apy2 - as2 * 16).lineTo(apx2 - ac * 16 + Math.cos(angle + fOff) * 6, apy2 - as2 * 16 + Math.sin(angle + fOff) * 6).stroke({ color: 0xff6644, width: 1.2 });
      }
    }

    // Draw player (archer) — detailed
    const ppx = ox + state.playerX, ppy = oy + state.playerY;
    const isMoving = Math.abs(state.playerVX) > 0.1 || Math.abs(state.playerVY) > 0.1;
    const playerWalk = isMoving ? now / 150 : 0;
    // Shadow
    g.ellipse(ppx + 2, ppy + 20, 14, 5).fill({ color: 0x000000, alpha: 0.15 });
    // Legs — articulated with knees
    for (const [lx, phOff] of [[-4, 0], [2, Math.PI]] as [number, number][]) {
      const hipX = ppx + lx, hipY = ppy + 4;
      const swing = isMoving ? Math.sin(playerWalk + phOff) * 0.3 : 0;
      const kneeX = hipX + Math.cos(Math.PI / 2 + swing * 0.5) * 2;
      const kneeY = hipY + 7;
      const footX = kneeX + Math.cos(Math.PI / 2 - swing * 0.3) * 1;
      const footY = kneeY + 7;
      // Upper leg
      g.moveTo(hipX, hipY).lineTo(kneeX, kneeY).stroke({ color: 0x553311, width: 4.5 });
      // Knee joint
      g.circle(kneeX, kneeY, 2.2).fill({ color: 0x4a2a0a });
      // Lower leg
      g.moveTo(kneeX, kneeY).lineTo(footX, footY).stroke({ color: 0x553311, width: 4 });
      // Boot
      g.roundRect(footX - 3, footY - 1, 6, 4, 1).fill({ color: 0x332211 });
      // Boot sole
      g.rect(footX - 3.5, footY + 2, 7, 1.5).fill({ color: 0x221100 });
      // Boot lacing
      g.moveTo(footX - 1, footY).lineTo(footX + 1, footY - 1).stroke({ color: 0x443322, width: 0.5, alpha: 0.5 });
    }
    // Body (tunic — more shaped)
    g.moveTo(ppx - 9, ppy + 5).quadraticCurveTo(ppx - 11, ppy - 4, ppx - 8, ppy - 14).lineTo(ppx + 8, ppy - 14).quadraticCurveTo(ppx + 11, ppy - 4, ppx + 9, ppy + 5).fill({ color: 0x446622 });
    // Leather vest/jerkin
    g.moveTo(ppx - 7, ppy + 3).quadraticCurveTo(ppx - 9, ppy - 3, ppx - 6, ppy - 12).lineTo(ppx + 6, ppy - 12).quadraticCurveTo(ppx + 9, ppy - 3, ppx + 7, ppy + 3).fill({ color: 0x554422, alpha: 0.6 });
    // Vest stitching
    g.moveTo(ppx, ppy - 12).lineTo(ppx, ppy + 3).stroke({ color: 0x443311, width: 0.5, alpha: 0.4 });
    // Collar
    g.moveTo(ppx - 5, ppy - 13).quadraticCurveTo(ppx, ppy - 11, ppx + 5, ppy - 13).stroke({ color: 0x446622, width: 2 });
    // Belt
    g.rect(ppx - 9, ppy + 3, 18, 3).fill({ color: 0x443311 });
    g.roundRect(ppx - 2, ppy + 3, 4, 3, 0.5).fill({ color: 0xaa8844 }); // buckle
    // Belt pouch
    g.roundRect(ppx - 8, ppy + 2, 4, 5, 1).fill({ color: 0x554422, alpha: 0.5 });
    // Quiver on back
    g.roundRect(ppx + 5, ppy - 14, 5, 18, 1).fill({ color: 0x664422, alpha: 0.65 });
    g.roundRect(ppx + 5, ppy - 14, 5, 18, 1).stroke({ color: 0x553311, width: 0.5, alpha: 0.3 });
    // Arrows in quiver (count matches ammo)
    const quiverArrows = Math.min(state.arrowsLeft, 5);
    for (let qi = 0; qi < quiverArrows; qi++) {
      g.moveTo(ppx + 6 + qi, ppy - 14).lineTo(ppx + 6 + qi, ppy - 20 - qi).stroke({ color: 0xccaa66, width: 1, alpha: 0.5 });
      // Fletching
      g.moveTo(ppx + 6 + qi, ppy - 19 - qi).lineTo(ppx + 5 + qi, ppy - 21 - qi).stroke({ color: 0xff6644, width: 0.5, alpha: 0.4 });
    }
    // Head — more detailed
    g.circle(ppx, ppy - 18, 8).fill({ color: 0xddbbaa });
    // Jaw/chin
    g.ellipse(ppx, ppy - 14, 5, 3).fill({ color: 0xddbbaa });
    // Hood
    g.circle(ppx, ppy - 19, 9.5).fill({ color: 0x446622, alpha: 0.7 });
    g.ellipse(ppx, ppy - 23, 10, 4).fill({ color: 0x446622 });
    // Hood rim shadow
    g.moveTo(ppx - 8, ppy - 16).quadraticCurveTo(ppx, ppy - 14, ppx + 8, ppy - 16).stroke({ color: 0x335511, width: 1.5, alpha: 0.4 });
    // Face details
    g.circle(ppx - 2.5, ppy - 18, 1.2).fill({ color: 0x222211 }); // eye
    g.circle(ppx + 2.5, ppy - 18, 1.2).fill({ color: 0x222211 }); // eye
    g.circle(ppx - 2.2, ppy - 18.3, 0.4).fill({ color: 0xffffff, alpha: 0.4 }); // eye shine
    g.circle(ppx + 2.8, ppy - 18.3, 0.4).fill({ color: 0xffffff, alpha: 0.4 });
    // Nose
    g.moveTo(ppx, ppy - 17).lineTo(ppx - 0.5, ppy - 15.5).lineTo(ppx + 0.5, ppy - 15.5).fill({ color: 0xccaa99, alpha: 0.4 });
    // Mouth
    g.moveTo(ppx - 1.5, ppy - 14.5).quadraticCurveTo(ppx, ppy - 14, ppx + 1.5, ppy - 14.5).stroke({ color: 0xaa8877, width: 0.5, alpha: 0.3 });
    // Arms — with upper/lower arm segments
    const aimCos = Math.cos(state.aimAngle), aimSin = Math.sin(state.aimAngle);
    // Back arm (draw arm — pulling string)
    const backElbowX = ppx - 4 + aimCos * 4, backElbowY = ppy - 8 + aimSin * 4;
    g.moveTo(ppx - 5, ppy - 8).lineTo(backElbowX, backElbowY).stroke({ color: 0xddbbaa, width: 3.5 });
    g.circle(backElbowX, backElbowY, 1.5).fill({ color: 0xccaa99 }); // elbow
    g.moveTo(backElbowX, backElbowY).lineTo(ppx + aimCos * 12, ppy + aimSin * 12 - 6).stroke({ color: 0xddbbaa, width: 3 });
    // Front arm (bow arm)
    const frontElbowX = ppx + 3 + aimCos * 8, frontElbowY = ppy - 8 + aimSin * 8;
    g.moveTo(ppx + 4, ppy - 8).lineTo(frontElbowX, frontElbowY).stroke({ color: 0xddbbaa, width: 3.5 });
    g.circle(frontElbowX, frontElbowY, 1.5).fill({ color: 0xccaa99 });
    g.moveTo(frontElbowX, frontElbowY).lineTo(ppx + aimCos * 18, ppy + aimSin * 18 - 6).stroke({ color: 0xddbbaa, width: 3 });
    // Bracer on bow arm
    g.moveTo(ppx + aimCos * 14, ppy + aimSin * 14 - 6).lineTo(ppx + aimCos * 17, ppy + aimSin * 17 - 6).stroke({ color: 0x664422, width: 4 });
    // Bow (larger)
    const bowDist = 18;
    const bx = ppx + aimCos * bowDist;
    const by = ppy + aimSin * bowDist - 4;
    const bowR = 14;
    g.moveTo(bx + Math.cos(state.aimAngle + 1) * bowR, by + Math.sin(state.aimAngle + 1) * bowR).bezierCurveTo(bx + aimCos * 8, by + aimSin * 8, bx + aimCos * 8, by + aimSin * 8, bx + Math.cos(state.aimAngle - 1) * bowR, by + Math.sin(state.aimAngle - 1) * bowR).stroke({ color: 0x6a4a2a, width: 3.5 });
    // Bow limb tips
    g.circle(bx + Math.cos(state.aimAngle + 1) * bowR, by + Math.sin(state.aimAngle + 1) * bowR, 1.5).fill({ color: 0x886644 });
    g.circle(bx + Math.cos(state.aimAngle - 1) * bowR, by + Math.sin(state.aimAngle - 1) * bowR, 1.5).fill({ color: 0x886644 });
    // Bowstring
    if (state.drawProgress > 0) {
      const stringBack = bowDist - state.drawProgress * 14;
      const sx2 = ppx + aimCos * stringBack;
      const sy2 = ppy + aimSin * stringBack - 4;
      g.moveTo(bx + Math.cos(state.aimAngle + 1) * bowR, by + Math.sin(state.aimAngle + 1) * bowR).lineTo(sx2, sy2).lineTo(bx + Math.cos(state.aimAngle - 1) * bowR, by + Math.sin(state.aimAngle - 1) * bowR).stroke({ color: 0xccccaa, width: 1.5 });
      // Arrow on string
      g.moveTo(sx2, sy2).lineTo(sx2 + aimCos * 18, sy2 + aimSin * 18).stroke({ color: 0xccaa66, width: 2 });
      g.moveTo(sx2 + aimCos * 18, sy2 + aimSin * 18).lineTo(sx2 + aimCos * 22, sy2 + aimSin * 22).stroke({ color: 0xaaaaaa, width: 2.5 });
      // Power meter (larger arc)
      const powerCol = state.drawProgress > 0.8 ? 0x44ff44 : state.drawProgress > 0.5 ? 0xffaa44 : 0xff6644;
      const arcR = 22, arcCx = ppx, arcCy = ppy + 28;
      for (let ai = 0; ai < 8; ai++) {
        const a = Math.PI * 0.3 + ai * Math.PI * 0.4 / 8;
        g.circle(arcCx + Math.cos(a) * arcR, arcCy + Math.sin(a) * arcR, 2).fill({ color: 0x333333, alpha: 0.3 });
      }
      const filledSegs = Math.floor(state.drawProgress * 8);
      for (let ai = 0; ai < filledSegs; ai++) {
        const a = Math.PI * 0.3 + ai * Math.PI * 0.4 / 8;
        g.circle(arcCx + Math.cos(a) * arcR, arcCy + Math.sin(a) * arcR, 3).fill({ color: powerCol, alpha: 0.6 });
      }
      g.circle(arcCx, arcCy, arcR + 4).stroke({ color: powerCol, width: 0.8, alpha: 0.15 });
    } else {
      // Idle bowstring
      g.moveTo(bx + Math.cos(state.aimAngle + 1) * bowR, by + Math.sin(state.aimAngle + 1) * bowR).lineTo(bx + Math.cos(state.aimAngle - 1) * bowR, by + Math.sin(state.aimAngle - 1) * bowR).stroke({ color: 0xccccaa, width: 1 });
    }
    // Aim line (longer)
    g.moveTo(ppx, ppy).lineTo(ppx + aimCos * 80, ppy + aimSin * 80).stroke({ color: 0xffffff, width: 0.8, alpha: 0.12 });

    // Particles
    for (const p of state.particles) {
      const lr = p.life / p.maxLife;
      g.circle(ox + p.x, oy + p.y, p.size * lr).fill({ color: p.color, alpha: lr * 0.7 });
    }

    // Announcements (larger)
    for (const ann of state.announcements) {
      const a = Math.min(1, ann.timer / 1.5);
      const t = new Text({ text: ann.text, style: new TextStyle({ fontFamily: FONT, fontSize: 36, fill: ann.color, fontWeight: "bold" }) });
      t.alpha = a; t.anchor.set(0.5, 0.5);
      t.position.set(ox + HuntConfig.FIELD_WIDTH / 2, oy + HuntConfig.FIELD_HEIGHT / 2);
      this._ui.addChild(t);
    }

    // HUD (scaled up)
    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); this._ui.addChild(t);
    };

    g.rect(0, 0, sw, 70).fill({ color: 0x0a0806, alpha: 0.85 });
    g.moveTo(0, 70).lineTo(sw, 70).stroke({ color: COL, width: 2, alpha: 0.3 });
    addText("\u{1F3F9} HUNT", 16, 8, { fontSize: 24, fill: COL, fontWeight: "bold", letterSpacing: 4 });
    addText(`Gold: ${state.gold}`, 200, 10, { fontSize: 20, fill: 0xffd700 });
    addText(`Score: ${state.score}`, 360, 10, { fontSize: 20, fill: 0x44ccaa });
    addText(`Kills: ${state.kills}`, 530, 10, { fontSize: 20, fill: 0xcc6644 });
    addText(`Bow: ${state.bow.name}`, 680, 10, { fontSize: 18, fill: 0xccaa88 });
    addText(`Ammo: ${state.arrowsLeft}/${state.maxArrows}`, 880, 10, { fontSize: 18, fill: state.arrowsLeft <= 3 ? 0xff4444 : 0xccaa66 });
    const rem = Math.max(0, state.timeLimit - state.elapsedTime);
    addText(`${Math.floor(rem / 60)}:${Math.floor(rem % 60).toString().padStart(2, "0")}`, sw / 2, 38, { fontSize: 22, fill: rem < 15 ? 0xff4444 : 0xccddcc, fontWeight: "bold" }, true);
    addText(`Round ${state.round + 1}/3`, 1050, 10, { fontSize: 18, fill: 0x889988 });

    // HP
    addText(`HP: ${"♥".repeat(state.playerHp)}${"♡".repeat(state.maxPlayerHp - state.playerHp)}`, 200, 40, { fontSize: 18, fill: state.playerHp <= 2 ? 0xff4444 : 0xff8888 });

    // Streak
    if (state.streak >= 2) {
      addText(`Streak: ${state.streak}x`, 530, 40, { fontSize: 18, fill: state.streak >= 5 ? 0xffd700 : 0xffaa44, fontWeight: "bold" });
    }

    // Wind indicator
    const windStr = state.wind > 0.3 ? "Wind: >>>" : state.wind < -0.3 ? "Wind: <<<" : "Wind: calm";
    addText(windStr, 700, 40, { fontSize: 16, fill: Math.abs(state.wind) > 0.5 ? 0x88ccff : 0x667766 });

    // Stealth indicator
    const stealthPct = Math.floor((state.playerStealth ?? 0) * 100);
    const stealthColor = stealthPct > 70 ? 0x44aa44 : stealthPct > 30 ? 0xaaaa44 : 0xaa4444;
    const stealthLabel = stealthPct > 70 ? "Hidden" : stealthPct > 30 ? "Visible" : "Exposed";
    addText(`${stealthLabel} (${stealthPct}%)`, 380, 40, { fontSize: 16, fill: stealthColor });
    // Stealth bar
    g.rect(500, 44, 80, 8).fill({ color: 0x111111 });
    g.rect(500, 44, 80 * (state.playerStealth ?? 0), 8).fill({ color: stealthColor, alpha: 0.6 });

    // Controls
    addText("WASD: move | Click: aim | Hold: draw | Release: shoot", sw / 2, sh - 24, { fontSize: 14, fill: 0x556655 }, true);
  }

  destroy(): void { this.container.removeChildren(); this._gfx.destroy(); }
}
