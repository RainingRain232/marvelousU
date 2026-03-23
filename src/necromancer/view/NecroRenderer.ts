// ---------------------------------------------------------------------------
// Necromancer mode — dark graveyard renderer
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { NecroState, Grave, Undead, Crusader } from "../state/NecroState";
import { findChimera } from "../state/NecroState";
import { CORPSES, NecroConfig, CRUSADERS } from "../config/NecroConfig";

const FONT = "Georgia, serif";
const NECRO_GREEN = 0x44ff88;
const DARK_PURPLE = 0x6622aa;
const BONE_WHITE = 0xccccbb;

export class NecroRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _ui = new Container();
  private _bgDrawn = false;

  init(sw: number, sh: number): void {
    this.container.removeChildren();
    this._drawBackground(sw, sh);
    this._gfx = new Graphics();
    this._ui = new Container();
    this.container.addChild(this._gfx);
    this.container.addChild(this._ui);
    this._bgDrawn = true;
  }

  private _drawBackground(sw: number, sh: number): void {
    const bg = new Graphics();

    // Night sky — deep indigo to dark purple gradient
    for (let y = 0; y < sh * 0.16; y += 1) {
      const t = y / (sh * 0.16);
      const r = Math.floor(6 + t * 6);
      const g = Math.floor(3 + t * 8);
      const b = Math.floor(16 + t * 12);
      bg.rect(0, y, sw, 1).fill({ color: (r << 16) | (g << 8) | b });
    }

    // Nebula wisps — faint purple/blue clouds in the sky
    for (let ni = 0; ni < 8; ni++) {
      const nx = (ni * 7919 + 50) % sw;
      const ny = 15 + (ni * 3413) % (sh * 0.12);
      const nw = 60 + (ni % 4) * 35;
      const nh = 10 + (ni % 3) * 5;
      const ncol = ni % 2 === 0 ? 0x221144 : 0x112244;
      bg.ellipse(nx, ny, nw, nh).fill({ color: ncol, alpha: 0.04 });
      // Inner brighter core
      bg.ellipse(nx + 5, ny - 2, nw * 0.4, nh * 0.5).fill({ color: ncol, alpha: 0.03 });
    }

    // Cloud wisps across the sky
    for (let ci = 0; ci < 5; ci++) {
      const cx = (ci * 6271 + 80) % sw;
      const cy = 10 + (ci * 2131) % (sh * 0.1);
      const cw = 80 + (ci % 3) * 40;
      bg.ellipse(cx, cy, cw, 4 + (ci % 2) * 2).fill({ color: 0x222233, alpha: 0.05 });
      bg.ellipse(cx + 15, cy + 1, cw * 0.6, 3).fill({ color: 0x222233, alpha: 0.03 });
    }

    // Moon — crescent with craters and halo
    const mx = sw * 0.78, my = 42;
    // Outer halo rings
    for (let hr = 50; hr > 20; hr -= 3) {
      bg.circle(mx, my, hr).fill({ color: 0xddeeff, alpha: 0.004 });
    }
    // Moon body
    bg.circle(mx, my, 20).fill({ color: 0xeeeedd, alpha: 0.92 });
    // Craters
    bg.circle(mx - 5, my - 4, 3).fill({ color: 0xddddcc, alpha: 0.3 });
    bg.circle(mx + 3, my + 5, 2).fill({ color: 0xddddcc, alpha: 0.25 });
    bg.circle(mx - 2, my + 3, 1.5).fill({ color: 0xccccbb, alpha: 0.2 });
    bg.circle(mx + 6, my - 2, 2.5).fill({ color: 0xddddcc, alpha: 0.2 });
    // Crescent shadow
    bg.circle(mx + 5, my - 2, 17).fill({ color: 0x060410 });
    // Bright edge highlight
    bg.circle(mx - 1, my, 20).stroke({ color: 0xffffff, width: 0.5, alpha: 0.08 });

    // Stars — varied sizes with twinkling brightness, some colored
    for (let i = 0; i < 100; i++) {
      const sx = (i * 8737 + 23) % sw;
      const sy = (i * 4219 + 11) % (sh * 0.15);
      const sr = 0.3 + (i % 4) * 0.25;
      const bright = 0.15 + (i % 7) * 0.07;
      const starCol = i % 15 === 0 ? 0xaaccff : i % 23 === 0 ? 0xffccaa : 0xffffff;
      bg.circle(sx, sy, sr).fill({ color: starCol, alpha: bright });
      // Cross sparkle for brighter stars
      if (sr > 0.7) {
        bg.moveTo(sx - 2, sy).lineTo(sx + 2, sy).stroke({ color: starCol, width: 0.3, alpha: bright * 0.4 });
        bg.moveTo(sx, sy - 2).lineTo(sx, sy + 2).stroke({ color: starCol, width: 0.3, alpha: bright * 0.4 });
      }
    }

    // Treeline — individual pine tree silhouettes
    const treeBaseY = sh * 0.155;
    for (let ti = 0; ti < 35; ti++) {
      const tx = (ti * 23.5) + (ti * 3571 % 8) - 4;
      const treeH = 18 + (ti * 2713 % 20);
      const treeW = 5 + (ti * 1931 % 4);
      // Pine tree shape — triangle
      bg.moveTo(tx, treeBaseY).lineTo(tx - treeW, treeBaseY).lineTo(tx, treeBaseY - treeH).lineTo(tx + treeW, treeBaseY).fill({ color: 0x060e06, alpha: 0.65 });
      // Second layer (slightly offset for depth)
      if (ti % 2 === 0) {
        bg.moveTo(tx + 2, treeBaseY + 2).lineTo(tx - treeW + 1, treeBaseY + 2).lineTo(tx + 2, treeBaseY - treeH + 5).lineTo(tx + treeW + 1, treeBaseY + 2).fill({ color: 0x040a04, alpha: 0.4 });
      }
      // Trunk hint
      bg.rect(tx - 0.5, treeBaseY - 3, 1, 3).fill({ color: 0x1a0e06, alpha: 0.3 });
    }

    // Ground — dark earth with subtle gradient
    for (let gy = Math.floor(sh * 0.15); gy < sh; gy += 2) {
      const gt = (gy - sh * 0.15) / (sh * 0.85);
      const gr = Math.floor(12 + gt * 4);
      const gg = Math.floor(12 + gt * 3);
      const gb = Math.floor(6 + gt * 2);
      bg.rect(0, gy, sw, 2).fill({ color: (gr << 16) | (gg << 8) | gb });
    }

    // Ground texture — dirt patches with varied tones
    for (let i = 0; i < 60; i++) {
      const gx = (i * 6271 + 13) % sw;
      const gy = sh * 0.16 + (i * 3413 + 7) % (sh * 0.81);
      const gsize = 5 + (i % 6) * 3;
      const gcol = i % 3 === 0 ? 0x100e06 : i % 3 === 1 ? 0x0e0c04 : 0x141008;
      bg.circle(gx, gy, gsize).fill({ color: gcol, alpha: 0.25 });
    }

    // Root/crack lines in the earth
    for (let i = 0; i < 15; i++) {
      const rx = (i * 5431 + 30) % sw;
      const ry = sh * 0.25 + (i * 2713) % (sh * 0.6);
      const rlen = 15 + (i % 4) * 10;
      const ra = (i * 1.3) % Math.PI;
      bg.moveTo(rx, ry).bezierCurveTo(rx + Math.cos(ra) * rlen * 0.3, ry + 3, rx + Math.cos(ra) * rlen * 0.7, ry - 2, rx + Math.cos(ra) * rlen, ry + 1).stroke({ color: 0x0a0806, width: 0.5, alpha: 0.2 });
    }

    // Layered fog wisps at ground level
    for (let layer = 0; layer < 3; layer++) {
      const fogAlpha = 0.04 - layer * 0.008;
      for (let i = 0; i < 6; i++) {
        const fx = (i * 5431 + layer * 200) % sw;
        const fy = sh * 0.6 + layer * 30 + (i * 2713 + layer * 100) % (sh * 0.25);
        const fw = 50 + (i % 4) * 30 + layer * 20;
        bg.ellipse(fx, fy, fw, 5 + layer * 2).fill({ color: layer === 0 ? 0x334455 : 0x2a3a44, alpha: fogAlpha });
      }
    }

    // Dead grass patches — more varied
    for (let i = 0; i < 40; i++) {
      const gx = (i * 7919) % sw;
      const gy = sh * 0.2 + (i * 4813) % (sh * 0.7);
      const gh = 6 + (i % 4) * 2;
      const lean = (i % 2 === 0 ? 1 : -1) * (1 + i % 3);
      bg.moveTo(gx, gy).bezierCurveTo(gx + lean, gy - gh * 0.4, gx + lean * 0.5, gy - gh * 0.7, gx + lean * 1.5, gy - gh).stroke({ color: 0x2a3a1a, width: 0.5, alpha: 0.12 });
    }

    // Scattered bones — femurs, ribs, skull fragments
    for (let i = 0; i < 15; i++) {
      const bx = 40 + (i * 3571) % (sw - 80);
      const by = sh * 0.25 + (i * 2131) % (sh * 0.6);
      const btype = i % 3;
      if (btype === 0) {
        // Femur bone
        const angle = (i * 1.7) % Math.PI;
        const len = 6 + (i % 3) * 2;
        bg.moveTo(bx, by).lineTo(bx + Math.cos(angle) * len, by + Math.sin(angle) * len * 0.5).stroke({ color: BONE_WHITE, width: 1, alpha: 0.07 });
        // Knobs
        bg.circle(bx, by, 1).fill({ color: BONE_WHITE, alpha: 0.06 });
        bg.circle(bx + Math.cos(angle) * len, by + Math.sin(angle) * len * 0.5, 1).fill({ color: BONE_WHITE, alpha: 0.06 });
      } else if (btype === 1) {
        // Rib curve
        bg.moveTo(bx, by).bezierCurveTo(bx + 4, by - 3, bx + 6, by - 2, bx + 8, by + 1).stroke({ color: BONE_WHITE, width: 0.5, alpha: 0.06 });
      } else {
        // Small skull fragment
        bg.circle(bx, by, 2).fill({ color: BONE_WHITE, alpha: 0.05 });
        bg.circle(bx - 0.5, by - 0.5, 0.5).fill({ color: 0x0a0a06, alpha: 0.05 });
      }
    }

    // Vignette — stronger, with bottom darkening
    for (let v = 0; v < 8; v++) {
      const inset = v * 35;
      bg.rect(0, 0, inset, sh).fill({ color: 0x000000, alpha: 0.035 });
      bg.rect(sw - inset, 0, inset, sh).fill({ color: 0x000000, alpha: 0.035 });
    }
    // Top darkening
    for (let v = 0; v < 4; v++) {
      bg.rect(0, 0, sw, v * 15).fill({ color: 0x000000, alpha: 0.02 });
    }
    // Bottom atmospheric haze
    for (let v = 0; v < 5; v++) {
      bg.rect(0, sh - v * 20, sw, v * 20).fill({ color: 0x060608, alpha: 0.02 });
    }

    this.container.addChild(bg);
  }

  draw(state: NecroState, sw: number, sh: number): void {
    this._gfx.clear();
    while (this._ui.children.length > 0) this._ui.removeChildAt(0);
    const g = this._gfx;
    const ox = (sw - NecroConfig.FIELD_WIDTH) / 2, oy = 50;

    // Field border — faint green glow
    g.roundRect(ox - 2, oy - 2, NecroConfig.FIELD_WIDTH + 4, NecroConfig.FIELD_HEIGHT + 4, 6)
      .stroke({ color: NECRO_GREEN, width: 1, alpha: 0.15 });

    if (state.phase === "dig") this._drawDigPhase(g, state, ox, oy);
    else if (state.phase === "ritual") this._drawRitualPhase(g, state, ox, oy, sw, sh);
    else if (state.phase === "battle") this._drawBattlePhase(g, state, ox, oy);

    // Particles (all phases)
    for (const p of state.particles) {
      const lr = p.life / p.maxLife;
      g.circle(ox + p.x, oy + p.y, p.size * lr).fill({ color: p.color, alpha: lr * 0.8 });
    }

    // Announcements
    for (const ann of state.announcements) {
      const a = Math.min(1, ann.timer / 1.5);
      const t = new Text({ text: ann.text, style: new TextStyle({ fontFamily: FONT, fontSize: 18, fill: ann.color, fontWeight: "bold" }) });
      t.alpha = a; t.anchor.set(0.5, 0.5);
      t.position.set(ox + NecroConfig.FIELD_WIDTH / 2, oy + NecroConfig.FIELD_HEIGHT / 2 - 30);
      this._ui.addChild(t);
    }

    // Screen flash
    if (state.screenFlash) {
      const fa = state.screenFlash.alpha * (state.screenFlash.timer / 0.3);
      g.rect(0, 0, sw, sh).fill({ color: state.screenFlash.color, alpha: fa });
    }

    // HUD
    this._drawHUD(g, state, sw, sh, ox, oy);
  }

  // ── Dig phase ──────────────────────────────────────────────────────────

  private _drawDigPhase(g: Graphics, state: NecroState, ox: number, oy: number): void {
    // Iron graveyard fence around the perimeter
    const fenceY1 = oy + 60, fenceY2 = oy + NecroConfig.FIELD_HEIGHT - 30;
    const fenceX1 = ox + 30, fenceX2 = ox + NecroConfig.FIELD_WIDTH - 30;
    // Horizontal rails
    g.moveTo(fenceX1, fenceY1).lineTo(fenceX2, fenceY1).stroke({ color: 0x333330, width: 1.5, alpha: 0.4 });
    g.moveTo(fenceX1, fenceY1 + 6).lineTo(fenceX2, fenceY1 + 6).stroke({ color: 0x2a2a28, width: 1, alpha: 0.3 });
    // Vertical posts with pointed tops
    for (let fx = fenceX1; fx <= fenceX2; fx += 28) {
      g.moveTo(fx, fenceY1 + 8).lineTo(fx, fenceY1 - 6).stroke({ color: 0x3a3a38, width: 1.5, alpha: 0.5 });
      // Pointed tip
      g.moveTo(fx - 2, fenceY1 - 6).lineTo(fx, fenceY1 - 10).lineTo(fx + 2, fenceY1 - 6).fill({ color: 0x3a3a38, alpha: 0.5 });
    }

    // Lanterns on fence posts (every 4th post)
    for (let fx = fenceX1; fx <= fenceX2; fx += 112) {
      const ly = fenceY1 - 12;
      const flicker = 0.3 + Math.sin(state.elapsed * 4 + fx) * 0.15;
      g.circle(fx, ly, 6).fill({ color: 0xffaa44, alpha: flicker * 0.08 }); // glow
      g.circle(fx, ly, 3).fill({ color: 0xffaa44, alpha: flicker * 0.2 });
      g.roundRect(fx - 2, ly - 2, 4, 4, 1).stroke({ color: 0x554422, width: 0.5, alpha: 0.4 });
    }

    // Crows perched on random fence posts
    for (let ci = 0; ci < 3; ci++) {
      const crowX = fenceX1 + 50 + ci * 180 + Math.sin(ci * 2.7) * 30;
      const crowY = fenceY1 - 12;
      const bob = Math.sin(state.elapsed * 1.5 + ci * 1.3) * 1;
      // Body
      g.ellipse(crowX, crowY + bob, 4, 3).fill({ color: 0x111111, alpha: 0.7 });
      // Head
      g.circle(crowX + 3, crowY - 2 + bob, 2).fill({ color: 0x111111, alpha: 0.7 });
      // Beak
      g.moveTo(crowX + 5, crowY - 2 + bob).lineTo(crowX + 7, crowY - 1.5 + bob).stroke({ color: 0x444400, width: 0.8, alpha: 0.5 });
      // Wing
      g.moveTo(crowX - 2, crowY - 1 + bob).bezierCurveTo(crowX - 5, crowY - 4 + bob, crowX - 3, crowY - 5 + bob, crowX - 1, crowY - 3 + bob).stroke({ color: 0x111111, width: 0.8, alpha: 0.5 });
    }

    // Draw graves with varied tombstone styles
    for (const grave of state.graves) {
      const gx = ox + grave.x, gy = oy + grave.y;
      const style = grave.id % 4; // Vary tombstone shape

      if (grave.dug) {
        // Open grave — dark rectangular hole with depth
        g.roundRect(gx - 16, gy - 10, 32, 20, 3).fill({ color: 0x050503, alpha: 0.95 });
        // Depth lines
        g.moveTo(gx - 14, gy - 8).lineTo(gx - 12, gy - 4).stroke({ color: 0x1a1408, width: 0.5, alpha: 0.3 });
        g.moveTo(gx + 14, gy - 8).lineTo(gx + 12, gy - 4).stroke({ color: 0x1a1408, width: 0.5, alpha: 0.3 });
        g.roundRect(gx - 16, gy - 10, 32, 20, 3).stroke({ color: 0x332211, width: 1, alpha: 0.5 });
        // Dirt piles with scattered clumps
        g.ellipse(gx - 20, gy + 6, 8, 4).fill({ color: 0x2a1a0e, alpha: 0.5 });
        g.ellipse(gx + 20, gy + 5, 7, 3).fill({ color: 0x2a1a0e, alpha: 0.4 });
        g.ellipse(gx - 22, gy + 3, 3, 2).fill({ color: 0x332211, alpha: 0.3 });
        g.ellipse(gx + 23, gy + 3, 2.5, 1.5).fill({ color: 0x332211, alpha: 0.25 });
        // Ghostly wisp rising
        const wisp = Math.sin(state.elapsed * 2 + grave.id) * 4;
        g.moveTo(gx, gy - 5).bezierCurveTo(gx + wisp, gy - 15, gx - wisp, gy - 25, gx + wisp * 0.5, gy - 35).stroke({ color: NECRO_GREEN, width: 0.8, alpha: 0.08 });
        // Corpse type label
        if (grave.corpseType) {
          const label = new Text({ text: CORPSES[grave.corpseType].name, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: 0x556644 }) });
          label.anchor.set(0.5, 0); label.position.set(gx, gy + 14);
          this._ui.addChild(label);
        }
      } else {
        // Undug grave — earth mound
        g.ellipse(gx, gy + 4, 18, 9).fill({ color: 0x161208, alpha: 0.7 });
        g.ellipse(gx, gy + 2, 16, 8).fill({ color: 0x1e180e, alpha: 0.6 });
        // Subtle cracks in dirt
        g.moveTo(gx - 6, gy + 1).bezierCurveTo(gx - 2, gy - 1, gx + 2, gy + 2, gx + 7, gy).stroke({ color: 0x0a0806, width: 0.5, alpha: 0.3 });

        // Varied tombstone styles
        if (style === 0) {
          // Classic rounded tombstone
          g.moveTo(gx - 7, gy - 4).lineTo(gx - 7, gy - 18).bezierCurveTo(gx - 7, gy - 26, gx + 7, gy - 26, gx + 7, gy - 18).lineTo(gx + 7, gy - 4).fill({ color: 0x444438, alpha: 0.85 });
          g.moveTo(gx - 7, gy - 4).lineTo(gx - 7, gy - 18).bezierCurveTo(gx - 7, gy - 26, gx + 7, gy - 26, gx + 7, gy - 18).lineTo(gx + 7, gy - 4).stroke({ color: 0x555548, width: 0.5, alpha: 0.4 });
          // R.I.P. text
          g.rect(gx - 4, gy - 16, 8, 1).fill({ color: 0x555548, alpha: 0.3 });
          g.rect(gx - 3, gy - 12, 6, 1).fill({ color: 0x555548, alpha: 0.2 });
        } else if (style === 1) {
          // Celtic cross
          g.rect(gx - 2, gy - 24, 4, 22).fill({ color: 0x444438, alpha: 0.85 });
          g.rect(gx - 6, gy - 18, 12, 3).fill({ color: 0x444438, alpha: 0.85 });
          g.circle(gx, gy - 18, 5).stroke({ color: 0x555548, width: 1, alpha: 0.4 });
          g.rect(gx - 2, gy - 24, 4, 22).stroke({ color: 0x555548, width: 0.5, alpha: 0.3 });
        } else if (style === 2) {
          // Obelisk
          g.moveTo(gx - 5, gy - 4).lineTo(gx - 3, gy - 26).lineTo(gx + 3, gy - 26).lineTo(gx + 5, gy - 4).fill({ color: 0x444438, alpha: 0.85 });
          g.moveTo(gx - 3, gy - 26).lineTo(gx, gy - 30).lineTo(gx + 3, gy - 26).fill({ color: 0x555548, alpha: 0.7 });
          g.moveTo(gx - 5, gy - 4).lineTo(gx - 3, gy - 26).lineTo(gx, gy - 30).lineTo(gx + 3, gy - 26).lineTo(gx + 5, gy - 4).stroke({ color: 0x555548, width: 0.5, alpha: 0.3 });
        } else {
          // Simple slab
          g.roundRect(gx - 8, gy - 20, 16, 18, 1).fill({ color: 0x3a3a30, alpha: 0.85 });
          g.roundRect(gx - 8, gy - 20, 16, 18, 1).stroke({ color: 0x4a4a40, width: 0.5, alpha: 0.4 });
          // Skull carving
          g.circle(gx, gy - 13, 3).stroke({ color: 0x555548, width: 0.5, alpha: 0.25 });
          g.circle(gx - 1, gy - 14, 1).fill({ color: 0x2a2a20, alpha: 0.3 });
          g.circle(gx + 1, gy - 14, 1).fill({ color: 0x2a2a20, alpha: 0.3 });
        }

        // Moss/lichen on tombstones
        g.circle(gx - 4, gy - 8, 2).fill({ color: 0x2a4a1a, alpha: 0.2 });
        g.circle(gx + 3, gy - 14, 1.5).fill({ color: 0x2a4a1a, alpha: 0.15 });

        // Dig progress bar
        if (grave.digging) {
          g.roundRect(gx - 16, gy + 14, 32, 4, 2).fill({ color: 0x111108, alpha: 0.8 });
          g.roundRect(gx - 16, gy + 14, 32 * grave.digProgress, 4, 2).fill({ color: NECRO_GREEN, alpha: 0.7 });
          // Animated dirt flying up
          for (let di = 0; di < 2; di++) {
            const dx = gx + (Math.random() - 0.5) * 16;
            const dy = gy + (Math.random() - 0.5) * 8;
            g.circle(dx, dy, 1 + Math.random()).fill({ color: 0x554433, alpha: 0.2 + Math.sin(state.elapsed * 10 + di) * 0.15 });
          }
          // Shovel motion hint
          const sAngle = Math.sin(state.elapsed * 6) * 0.3;
          g.moveTo(gx + 20, gy + 5).lineTo(gx + 20 + Math.cos(sAngle) * 8, gy - 5 + Math.sin(sAngle) * 3).stroke({ color: 0x6a5a3a, width: 1.5, alpha: 0.4 });
        }

        // Mystery rarity glow
        if (grave.corpseType) {
          const rarity = CORPSES[grave.corpseType].weight;
          if (rarity <= 2) {
            const pulse = 0.08 + Math.sin(state.elapsed * 2 + grave.id) * 0.04;
            const glowCol = rarity === 1 ? 0x9966cc : 0xccaa44;
            g.circle(gx, gy - 10, 22).fill({ color: glowCol, alpha: pulse });
            // Sparkle dots
            for (let si = 0; si < 3; si++) {
              const sa = state.elapsed * 1.5 + si * 2.1 + grave.id;
              const sx = gx + Math.cos(sa) * 15, sy = gy - 10 + Math.sin(sa) * 10;
              g.circle(sx, sy, 0.8).fill({ color: glowCol, alpha: pulse * 2 });
            }
          }
        }
      }
    }

    // Necromancer figure at bottom-left
    this._drawNecromancer(g, ox + 40, oy + NecroConfig.FIELD_HEIGHT - 50, state);
  }

  // ── Ritual phase ───────────────────────────────────────────────────────

  private _drawRitualPhase(g: Graphics, state: NecroState, ox: number, oy: number, sw: number, sh: number): void {
    const cx = NecroConfig.FIELD_WIDTH / 2, cy = NecroConfig.FIELD_HEIGHT / 2;

    // Ritual circle
    const circleR = 60;

    // Ground glow beneath circle
    g.ellipse(ox + cx, oy + cy + 5, circleR + 15, 8).fill({ color: NECRO_GREEN, alpha: 0.02 });

    // Outer rings — double ring with rune inscriptions
    g.circle(ox + cx, oy + cy, circleR + 8).stroke({ color: DARK_PURPLE, width: 0.5, alpha: 0.1 });
    g.circle(ox + cx, oy + cy, circleR + 5).stroke({ color: DARK_PURPLE, width: 1, alpha: 0.15 });
    g.circle(ox + cx, oy + cy, circleR).stroke({ color: NECRO_GREEN, width: 2, alpha: 0.3 });
    g.circle(ox + cx, oy + cy, circleR - 3).stroke({ color: NECRO_GREEN, width: 0.5, alpha: 0.1 });

    // Rune marks around circle — larger, pulsing, with connecting arcs
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + state.elapsed * 0.3;
      const rx = ox + cx + Math.cos(angle) * circleR;
      const ry = oy + cy + Math.sin(angle) * circleR;
      const p = 0.2 + Math.sin(state.elapsed * 2 + i) * 0.15;
      // Rune dot
      g.circle(rx, ry, 4).fill({ color: NECRO_GREEN, alpha: p * 0.6 });
      g.circle(rx, ry, 2).fill({ color: NECRO_GREEN, alpha: p });
      // Rune "letter" — small cross/diamond shapes
      if (i % 2 === 0) {
        g.moveTo(rx - 2, ry).lineTo(rx, ry - 3).lineTo(rx + 2, ry).lineTo(rx, ry + 3).stroke({ color: NECRO_GREEN, width: 0.5, alpha: p * 0.5 });
      } else {
        g.rect(rx - 1, ry - 2, 2, 4).fill({ color: NECRO_GREEN, alpha: p * 0.3 });
        g.rect(rx - 2, ry - 1, 4, 2).fill({ color: NECRO_GREEN, alpha: p * 0.3 });
      }
    }

    // Pentagram inside — with inner circle
    g.circle(ox + cx, oy + cy, circleR - 10).stroke({ color: DARK_PURPLE, width: 0.5, alpha: 0.1 });
    for (let i = 0; i < 5; i++) {
      const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2;
      g.moveTo(ox + cx + Math.cos(a1) * (circleR - 10), oy + cy + Math.sin(a1) * (circleR - 10))
        .lineTo(ox + cx + Math.cos(a2) * (circleR - 10), oy + cy + Math.sin(a2) * (circleR - 10))
        .stroke({ color: DARK_PURPLE, width: 1, alpha: 0.2 });
      // Vertices glow
      const vx = ox + cx + Math.cos(a1) * (circleR - 10);
      const vy = oy + cy + Math.sin(a1) * (circleR - 10);
      g.circle(vx, vy, 2).fill({ color: DARK_PURPLE, alpha: 0.15 });
    }

    // Candles — 6 around the circle
    for (let ci = 0; ci < 6; ci++) {
      const ca = (ci / 6) * Math.PI * 2 - Math.PI / 2;
      const candleX = ox + cx + Math.cos(ca) * (circleR + 18);
      const candleY = oy + cy + Math.sin(ca) * (circleR + 18);
      // Wax drip
      g.rect(candleX - 1.5, candleY - 2, 3, 8).fill({ color: 0x443322, alpha: 0.5 });
      g.circle(candleX - 2, candleY + 4, 1).fill({ color: 0x443322, alpha: 0.3 });
      // Flame
      const flicker = 0.5 + Math.sin(state.elapsed * 5 + ci * 1.3) * 0.2;
      g.ellipse(candleX, candleY - 5, 2, 4).fill({ color: 0xffaa44, alpha: flicker * 0.6 });
      g.circle(candleX, candleY - 5, 1).fill({ color: 0xffee88, alpha: flicker * 0.8 });
      // Light pool
      g.circle(candleX, candleY, 10).fill({ color: 0xffaa44, alpha: flicker * 0.02 });
    }

    // Smoke wisps rising from center
    for (let si = 0; si < 4; si++) {
      const smokeX = ox + cx + Math.sin(state.elapsed * 0.8 + si * 1.5) * 15;
      const smokeY = oy + cy - 20 - si * 15 - (state.elapsed * 8 + si * 20) % 60;
      const smokeAlpha = Math.max(0, 0.06 - si * 0.012);
      g.ellipse(smokeX, smokeY, 8 + si * 3, 3 + si).fill({ color: 0x334444, alpha: smokeAlpha });
    }

    // Energy arc between slots when both filled
    if (state.ritualSlotA && state.ritualSlotB) {
      const slotAx2 = ox + cx - 35, slotBx2 = ox + cx + 35, slotY2 = oy + cy;
      const arcMidY = slotY2 - 15 + Math.sin(state.elapsed * 3) * 5;
      g.moveTo(slotAx2, slotY2).bezierCurveTo(slotAx2 + 20, arcMidY, slotBx2 - 20, arcMidY, slotBx2, slotY2).stroke({ color: 0xff44ff, width: 1.5, alpha: 0.3 + Math.sin(state.elapsed * 4) * 0.15 });
      // Sparks along the arc
      for (let sp = 0; sp < 3; sp++) {
        const spT = (state.elapsed * 2 + sp * 0.33) % 1;
        const spX = slotAx2 + (slotBx2 - slotAx2) * spT;
        const spY = slotY2 + Math.sin(spT * Math.PI) * (arcMidY - slotY2);
        g.circle(spX, spY, 1.5).fill({ color: 0xff88ff, alpha: 0.4 });
      }
    }

    // Slot A (left)
    const slotAx = ox + cx - 35, slotAy = oy + cy;
    g.roundRect(slotAx - 15, slotAy - 15, 30, 30, 4).fill({ color: 0x0a0a06, alpha: 0.8 });
    g.roundRect(slotAx - 15, slotAy - 15, 30, 30, 4).stroke({ color: state.ritualSlotA ? NECRO_GREEN : 0x333322, width: 1.5, alpha: 0.5 });
    if (state.ritualSlotA) {
      const def = CORPSES[state.ritualSlotA.type];
      g.circle(slotAx, slotAy, 8).fill({ color: def.color });
      const label = new Text({ text: def.name, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: def.color }) });
      label.anchor.set(0.5, 0); label.position.set(slotAx, slotAy + 18);
      this._ui.addChild(label);
    } else {
      const label = new Text({ text: "Slot A", style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: 0x444433 }) });
      label.anchor.set(0.5, 0.5); label.position.set(slotAx, slotAy);
      this._ui.addChild(label);
    }

    // Slot B (right)
    const slotBx = ox + cx + 35, slotBy = oy + cy;
    g.roundRect(slotBx - 15, slotBy - 15, 30, 30, 4).fill({ color: 0x0a0a06, alpha: 0.8 });
    g.roundRect(slotBx - 15, slotBy - 15, 30, 30, 4).stroke({ color: state.ritualSlotB ? 0xff88ff : 0x333322, width: 1.5, alpha: 0.5 });
    if (state.ritualSlotB) {
      const def = CORPSES[state.ritualSlotB.type];
      g.circle(slotBx, slotBy, 8).fill({ color: def.color });
      const label = new Text({ text: def.name, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: def.color }) });
      label.anchor.set(0.5, 0); label.position.set(slotBx, slotBy + 18);
      this._ui.addChild(label);
    } else {
      const label = new Text({ text: "Slot B\n(optional)", style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: 0x444433, align: "center" }) });
      label.anchor.set(0.5, 0.5); label.position.set(slotBx, slotBy);
      this._ui.addChild(label);
    }

    // Chimera preview
    if (state.ritualSlotA && state.ritualSlotB) {
      const chimera = findChimera(state.ritualSlotA.type, state.ritualSlotB.type);
      if (chimera) {
        const label = new Text({ text: `= ${chimera.name} (${chimera.ability})`, style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0xff88ff, fontWeight: "bold" }) });
        label.anchor.set(0.5, 0); label.position.set(ox + cx, oy + cy + 45);
        this._ui.addChild(label);
      }
    }

    // Raise progress bar
    if (state.isRaising) {
      g.rect(ox + cx - 50, oy + cy + 65, 100, 6).fill({ color: 0x111108 });
      g.rect(ox + cx - 50, oy + cy + 65, 100 * state.raisingProgress, 6).fill({ color: NECRO_GREEN, alpha: 0.8 });

      // Swirling energy
      for (let i = 0; i < 6; i++) {
        const angle = state.elapsed * 3 + (i / 6) * Math.PI * 2;
        const dist = 30 + Math.sin(state.elapsed * 5 + i) * 10;
        const ex = ox + cx + Math.cos(angle) * dist;
        const ey = oy + cy + Math.sin(angle) * dist;
        g.circle(ex, ey, 2).fill({ color: NECRO_GREEN, alpha: 0.4 + Math.sin(state.elapsed * 4 + i) * 0.2 });
      }
    }

    // Corpse inventory on the left
    let iy = oy + 15;
    const invLabel = new Text({ text: "CORPSES", style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x889988, letterSpacing: 2 }) });
    invLabel.position.set(ox + 10, iy); this._ui.addChild(invLabel);
    iy += 14;
    for (const corpse of state.corpses) {
      if (state.ritualSlotA?.id === corpse.id || state.ritualSlotB?.id === corpse.id) continue;
      const def = CORPSES[corpse.type];
      // Card-like background
      g.roundRect(ox + 8, iy, 120, 32, 4).fill({ color: 0x0a0a06, alpha: 0.7 });
      g.roundRect(ox + 8, iy, 120, 32, 4).stroke({ color: def.color, width: 0.8, alpha: 0.4 });
      // Quality border glow
      const q = (corpse as any).quality ?? "normal";
      const qualBorder = q === "ancient" ? 0xffd700 : q === "blessed" ? 0x44aaff : q === "cursed" ? 0xff4444 : def.color;
      if (q !== "normal") {
        g.roundRect(ox + 7, iy - 1, 122, 34, 5).stroke({ color: qualBorder, width: 1, alpha: 0.3 });
      }
      // Color dot
      g.circle(ox + 20, iy + 10, 5).fill({ color: def.color, alpha: 0.8 });
      if (def.ranged) {
        g.moveTo(ox + 20, iy + 6).lineTo(ox + 23, iy + 10).lineTo(ox + 20, iy + 14).lineTo(ox + 17, iy + 10).stroke({ color: 0x9944ff, width: 0.5, alpha: 0.6 });
      }
      // Quality badge
      if (q !== "normal") {
        const qLabel = q === "ancient" ? "A" : q === "blessed" ? "B" : "C";
        const qBadge = new Text({ text: qLabel, style: new TextStyle({ fontFamily: FONT, fontSize: 6, fill: qualBorder, fontWeight: "bold" }) });
        qBadge.position.set(ox + 118, iy + 2); this._ui.addChild(qBadge);
      }
      // Name and cost
      const qualSuffix = q === "ancient" ? " \u2605" : q === "blessed" ? " \u2606" : q === "cursed" ? " \u2620" : "";
      const ct = new Text({ text: `${def.name}${qualSuffix}`, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: q !== "normal" ? qualBorder : 0xcccccc, fontWeight: "bold" }) });
      ct.position.set(ox + 30, iy + 2); this._ui.addChild(ct);
      // Stats line
      const stats = `HP:${def.hp} DMG:${def.damage} SPD:${def.speed} ${def.ranged ? "RANGED" : ""} — ${def.manaCost}m`;
      const st = new Text({ text: stats, style: new TextStyle({ fontFamily: FONT, fontSize: 6, fill: 0x889977 }) });
      st.position.set(ox + 30, iy + 14); this._ui.addChild(st);
      // Description
      const dt = new Text({ text: def.description, style: new TextStyle({ fontFamily: FONT, fontSize: 5.5, fill: 0x667755, fontStyle: "italic" }) });
      dt.position.set(ox + 30, iy + 23); this._ui.addChild(dt);
      iy += 36;
    }

    // Army preview on the right
    iy = oy + 20;
    const armyLabel = new Text({ text: `Army: ${state.undead.length}/${NecroConfig.MAX_ARMY}`, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x889988 }) });
    armyLabel.anchor.set(1, 0); armyLabel.position.set(ox + NecroConfig.FIELD_WIDTH - 10, iy); this._ui.addChild(armyLabel);
    iy += 16;
    for (const u of state.undead) {
      g.roundRect(ox + NecroConfig.FIELD_WIDTH - 120, iy, 110, 16, 3).fill({ color: 0x0a0a06, alpha: 0.5 });
      g.circle(ox + NecroConfig.FIELD_WIDTH - 108, iy + 8, 3).fill({ color: u.color });
      const ut = new Text({ text: `${u.name} HP:${u.hp}`, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: 0x99aa99 }) });
      ut.position.set(ox + NecroConfig.FIELD_WIDTH - 100, iy + 3); this._ui.addChild(ut);
      iy += 19;
    }

    this._drawNecromancer(g, ox + cx, oy + cy - circleR - 30, state);
  }

  // ── Battle phase ───────────────────────────────────────────────────────

  private _drawBattlePhase(g: Graphics, state: NecroState, ox: number, oy: number): void {
    const midX = NecroConfig.FIELD_WIDTH / 2;
    const fw = NecroConfig.FIELD_WIDTH, fh = NecroConfig.FIELD_HEIGHT;

    // Battlefield terrain — broken ground, rubble
    // Undead side: dark, corrupted earth with green cracks
    g.roundRect(ox, oy, midX, fh, 0).fill({ color: 0x0c0c06, alpha: 0.3 });
    // Green corruption veins
    for (let vi = 0; vi < 5; vi++) {
      const vx = ox + 40 + (vi * 3571 % (midX - 80));
      const vy = oy + 30 + (vi * 2713 % (fh - 60));
      g.moveTo(vx, vy).bezierCurveTo(vx + 15, vy + 10, vx + 25, vy - 5, vx + 40, vy + 5).stroke({ color: NECRO_GREEN, width: 0.5, alpha: 0.06 });
    }

    // Crusader side: lighter, holy ground
    g.roundRect(ox + midX, oy, midX, fh, 0).fill({ color: 0x0e0e0c, alpha: 0.2 });
    // Holy light rays from right
    for (let ri = 0; ri < 3; ri++) {
      const ry = oy + 60 + ri * 140;
      g.moveTo(ox + fw, ry).lineTo(ox + midX + 40, ry + 30).lineTo(ox + fw, ry + 15).fill({ color: 0xffd700, alpha: 0.015 });
    }

    // Divider — battle line with clash markers
    g.moveTo(ox + midX, oy).lineTo(ox + midX, oy + fh).stroke({ color: 0x442222, width: 0.8, alpha: 0.2 });
    // Crossed swords icon at center
    const cix = ox + midX, ciy = oy + fh / 2;
    g.moveTo(cix - 8, ciy - 8).lineTo(cix + 8, ciy + 8).stroke({ color: 0x555544, width: 1, alpha: 0.15 });
    g.moveTo(cix + 8, ciy - 8).lineTo(cix - 8, ciy + 8).stroke({ color: 0x555544, width: 1, alpha: 0.15 });

    // Torch sconces on sides
    for (let ti = 0; ti < 4; ti++) {
      const ty = oy + 40 + ti * (fh / 4);
      // Left sconce
      g.rect(ox - 4, ty - 3, 4, 6).fill({ color: 0x3a2a1a, alpha: 0.5 });
      const lFlicker = 0.4 + Math.sin(state.elapsed * 5 + ti * 1.7) * 0.2;
      g.circle(ox - 2, ty - 5, 3).fill({ color: 0xff8822, alpha: lFlicker * 0.3 });
      g.circle(ox - 2, ty - 5, 6).fill({ color: 0xff6600, alpha: lFlicker * 0.03 });
      // Right sconce
      g.rect(ox + fw, ty - 3, 4, 6).fill({ color: 0x3a2a1a, alpha: 0.5 });
      const rFlicker = 0.4 + Math.sin(state.elapsed * 5 + ti * 2.3 + 1) * 0.2;
      g.circle(ox + fw + 2, ty - 5, 3).fill({ color: 0xff8822, alpha: rFlicker * 0.3 });
      g.circle(ox + fw + 2, ty - 5, 6).fill({ color: 0xff6600, alpha: rFlicker * 0.03 });
    }

    // Skull piles (undead side decoration)
    for (let si = 0; si < 3; si++) {
      const spx = ox + 20 + si * 80, spy = oy + fh - 30 - si * 15;
      for (let sk = 0; sk < 3; sk++) {
        const skx = spx + (sk - 1) * 6, sky = spy - sk * 4;
        g.circle(skx, sky, 3.5).fill({ color: BONE_WHITE, alpha: 0.08 });
        g.circle(skx - 1, sky - 1, 0.8).fill({ color: 0x0a0a06, alpha: 0.1 });
        g.circle(skx + 1, sky - 1, 0.8).fill({ color: 0x0a0a06, alpha: 0.1 });
      }
    }

    // Scattered rubble/debris
    for (let ri = 0; ri < 12; ri++) {
      const rx = ox + 60 + (ri * 4217 % (fw - 120));
      const ry = oy + 40 + (ri * 3119 % (fh - 80));
      g.circle(rx, ry, 1 + (ri % 3)).fill({ color: 0x222218, alpha: 0.2 });
    }

    // Persistent battle marks (blood, debris)
    for (const mark of state.battleMarks) {
      const mx = ox + mark.x, my = oy + mark.y;
      if (mark.type === "blood") {
        g.circle(mx, my, mark.size).fill({ color: 0x881122, alpha: mark.alpha });
        // Splatter dots
        g.circle(mx + mark.size * 0.7, my - mark.size * 0.3, mark.size * 0.3).fill({ color: 0x881122, alpha: mark.alpha * 0.6 });
        g.circle(mx - mark.size * 0.5, my + mark.size * 0.5, mark.size * 0.25).fill({ color: 0x881122, alpha: mark.alpha * 0.5 });
      } else {
        // Debris — broken weapon shard
        const angle = (mark.x * 1.7) % Math.PI;
        g.moveTo(mx, my).lineTo(mx + Math.cos(angle) * mark.size, my + Math.sin(angle) * mark.size * 0.5).stroke({ color: 0x888877, width: 1, alpha: mark.alpha });
      }
    }

    // Animated fog layer — drifting wisps
    for (let fi = 0; fi < 6; fi++) {
      const fogX = ((state.elapsed * 15 + fi * 130) % (fw + 100)) - 50 + ox;
      const fogY = oy + 60 + (fi * 2713 % (fh - 120));
      const fogW = 50 + (fi % 3) * 30;
      g.ellipse(fogX, fogY, fogW, 6 + (fi % 2) * 3).fill({ color: 0x334455, alpha: 0.035 + Math.sin(state.elapsed + fi) * 0.01 });
    }

    // Side labels
    const leftLabel = new Text({ text: "UNDEAD", style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: NECRO_GREEN, letterSpacing: 2 } as any) });
    leftLabel.alpha = 0.25; leftLabel.anchor.set(0.5, 0); leftLabel.position.set(ox + midX / 2, oy + 4);
    this._ui.addChild(leftLabel);
    const rightLabel = new Text({ text: "CRUSADERS", style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0xffd700, letterSpacing: 2 } as any) });
    rightLabel.alpha = 0.25; rightLabel.anchor.set(0.5, 0); rightLabel.position.set(ox + midX + midX / 2, oy + 4);
    this._ui.addChild(rightLabel);

    // Draw bone walls
    for (const wall of state.boneWalls) {
      const wx = ox + wall.x, wy = oy + wall.y;
      const hpRatio = wall.hp / wall.maxHp;
      const wallAlpha = 0.3 + hpRatio * 0.5;

      // Ground shadow
      g.ellipse(wx, wy + 8, 16, 3).fill({ color: 0x000000, alpha: 0.2 });

      // Base layer — stacked femur bones
      for (let bi = -2; bi <= 2; bi++) {
        const boneX = wx + bi * 5;
        const boneLen = 8 + Math.abs(bi) * -1;
        // Horizontal femur
        g.moveTo(boneX - boneLen / 2, wy + 3).lineTo(boneX + boneLen / 2, wy + 3).stroke({ color: BONE_WHITE, width: 2, alpha: wallAlpha * 0.7 });
        // Knobs
        g.circle(boneX - boneLen / 2, wy + 3, 1.5).fill({ color: BONE_WHITE, alpha: wallAlpha * 0.6 });
        g.circle(boneX + boneLen / 2, wy + 3, 1.5).fill({ color: BONE_WHITE, alpha: wallAlpha * 0.6 });
      }

      // Middle layer — rib bones arching
      for (let ri = -1; ri <= 1; ri++) {
        const ribX = wx + ri * 7;
        g.moveTo(ribX - 4, wy).bezierCurveTo(ribX - 2, wy - 4, ribX + 2, wy - 4, ribX + 4, wy).stroke({ color: BONE_WHITE, width: 1.5, alpha: wallAlpha * 0.6 });
      }

      // Top — three skulls
      for (let si = -1; si <= 1; si++) {
        const skX = wx + si * 8, skY = wy - 6;
        // Skull
        g.circle(skX, skY, 3.5).fill({ color: BONE_WHITE, alpha: wallAlpha * 0.8 });
        // Eye sockets
        g.circle(skX - 1.2, skY - 0.5, 1).fill({ color: 0x0a0a06, alpha: wallAlpha * 0.7 });
        g.circle(skX + 1.2, skY - 0.5, 1).fill({ color: 0x0a0a06, alpha: wallAlpha * 0.7 });
        // Nose
        g.moveTo(skX - 0.3, skY + 1).lineTo(skX, skY + 2).lineTo(skX + 0.3, skY + 1).stroke({ color: 0x0a0a06, width: 0.3, alpha: wallAlpha * 0.5 });
        // Jaw hint
        g.moveTo(skX - 2, skY + 2.5).bezierCurveTo(skX, skY + 3.5, skX, skY + 3.5, skX + 2, skY + 2.5).stroke({ color: BONE_WHITE, width: 0.5, alpha: wallAlpha * 0.3 });
      }

      // Green necromantic glow seeping through
      g.ellipse(wx, wy, 14, 8).fill({ color: NECRO_GREEN, alpha: 0.03 * hpRatio });

      // HP bar
      if (hpRatio < 1) {
        g.roundRect(wx - 14, wy + 10, 28, 2.5, 1).fill({ color: 0x110000 });
        g.roundRect(wx - 14, wy + 10, 28 * hpRatio, 2.5, 1).fill({ color: BONE_WHITE, alpha: 0.7 });
      }

      // Crumbling effect at low HP
      if (hpRatio < 0.4) {
        for (let ci = 0; ci < 3; ci++) {
          const cx = wx + (Math.random() - 0.5) * 16;
          const cy = wy + (Math.random() - 0.5) * 8;
          g.circle(cx, cy, 0.8).fill({ color: BONE_WHITE, alpha: 0.15 + Math.random() * 0.1 });
        }
      }
    }

    // Draw undead
    for (const u of state.undead) {
      if (!u.alive) continue;
      this._drawUndeadUnit(g, ox + u.x, oy + u.y, u, state);
    }

    // Draw crusaders
    for (const c of state.crusaders) {
      if (!c.alive) continue;
      this._drawCrusaderUnit(g, ox + c.x, oy + c.y, c, state);
    }

    // Projectiles — spiral trail with sparks
    for (const p of state.projectiles) {
      const angle = Math.atan2(p.vy, p.vx);
      const px = ox + p.x, py = oy + p.y;
      const t = state.elapsed;

      // Spiral trail segments
      for (let ti = 1; ti <= 4; ti++) {
        const trailDist = ti * 3;
        const spiralAngle = t * 15 + ti * 1.2;
        const spiralR = 1.5 + ti * 0.3;
        const tx = px - Math.cos(angle) * trailDist + Math.cos(spiralAngle) * spiralR;
        const ty = py - Math.sin(angle) * trailDist + Math.sin(spiralAngle) * spiralR;
        g.circle(tx, ty, 1.2 - ti * 0.2).fill({ color: p.color, alpha: 0.4 - ti * 0.08 });
      }

      // Main trail line — glowing
      g.moveTo(px - Math.cos(angle) * 10, py - Math.sin(angle) * 10).lineTo(px, py).stroke({ color: p.color, width: 2, alpha: 0.5 });
      g.moveTo(px - Math.cos(angle) * 6, py - Math.sin(angle) * 6).lineTo(px, py).stroke({ color: 0xffffff, width: 0.8, alpha: 0.2 });

      // Head — bright core with glow layers
      g.circle(px, py, 5).fill({ color: p.color, alpha: 0.1 });
      g.circle(px, py, 3).fill({ color: p.color, alpha: 0.4 });
      g.circle(px, py, 1.5).fill({ color: 0xffffff, alpha: 0.5 });
    }

    // Floating damage numbers
    for (const dn of state.damageNumbers) {
      const alpha = dn.timer / dn.maxTimer;
      const t = new Text({ text: dn.text, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: dn.color, fontWeight: "bold" }) });
      t.alpha = alpha; t.anchor.set(0.5, 0.5);
      t.position.set(ox + dn.x, oy + dn.y);
      this._ui.addChild(t);
    }

    // Necromancer in corner
    this._drawNecromancer(g, ox + 30, oy + NecroConfig.FIELD_HEIGHT / 2, state);

    // Spell indicators at bottom
    let spellX = ox + fw / 2 - 80;
    const spellY = oy + fh - 16;

    // Nova
    if ((state.powerLevels["dark_nova"] ?? 0) > 0) {
      const novaReady = state.novaCooldown <= 0;
      g.roundRect(spellX - 2, spellY - 4, 70, 14, 3).fill({ color: novaReady ? 0x220044 : 0x0a0a08, alpha: 0.6 });
      g.roundRect(spellX - 2, spellY - 4, 70, 14, 3).stroke({ color: novaReady ? 0xaa44ff : 0x332244, width: 0.8, alpha: 0.4 });
      const nt = new Text({
        text: novaReady ? "LMB: Nova" : `Nova ${Math.ceil(state.novaCooldown)}s`,
        style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: novaReady ? 0xaa44ff : 0x554466 }),
      });
      nt.position.set(spellX + 4, spellY - 2); this._ui.addChild(nt);
      spellX += 78;
    }

    // Bone Wall
    const wallReady = state.boneWallCooldown <= 0 && state.mana >= 10;
    g.roundRect(spellX - 2, spellY - 4, 80, 14, 3).fill({ color: wallReady ? 0x1a1a14 : 0x0a0a08, alpha: 0.6 });
    g.roundRect(spellX - 2, spellY - 4, 80, 14, 3).stroke({ color: wallReady ? BONE_WHITE : 0x333322, width: 0.8, alpha: 0.4 });
    const wt = new Text({
      text: wallReady ? "RMB: Bone Wall" : state.boneWallCooldown > 0 ? `Wall ${Math.ceil(state.boneWallCooldown)}s` : "Wall (10m)",
      style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: wallReady ? BONE_WHITE : 0x555544 }),
    });
    wt.position.set(spellX + 4, spellY - 2); this._ui.addChild(wt);

    // Kill counter
    const kt = new Text({
      text: `Kills: ${state.waveKills}`,
      style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0xcc6644 }),
    });
    kt.anchor.set(1, 0); kt.position.set(ox + fw - 5, oy + fh - 28);
    this._ui.addChild(kt);

    // Battle timer
    const bt = new Text({
      text: `${Math.floor(state.battleTimer)}s`,
      style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x667766 }),
    });
    bt.anchor.set(1, 0); bt.position.set(ox + fw - 5, oy + fh - 14);
    this._ui.addChild(bt);

    // Remaining enemies
    const remText = `Enemies: ${state.crusaders.length + state.crusaderSpawnQueue.length}`;
    const rt = new Text({ text: remText, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0xddaa66 }) });
    rt.anchor.set(1, 0); rt.position.set(ox + fw - 5, oy + 16);
    this._ui.addChild(rt);
  }

  // ── Unit drawing ───────────────────────────────────────────────────────

  private _drawUndeadUnit(g: Graphics, x: number, y: number, u: Undead, state: NecroState): void {
    const s = u.size;
    const t = state.elapsed;

    // Shadow
    g.ellipse(x + 1, y + s + 2, s * 0.8, 2.5).fill({ color: 0x000000, alpha: 0.25 });

    // Ghostly glow — larger for chimeras
    const glowR = u.chimera ? s + 6 : s + 4;
    const pulse = 0.12 + Math.sin(t * 2 + u.id) * 0.06;
    g.circle(x, y, glowR).fill({ color: u.chimera ? 0xaa44ff : NECRO_GREEN, alpha: pulse * 0.15 });

    // Legs — skeletal bone struts
    const walkPhase = Math.sin(t * 5 + u.id * 1.3) * 2;
    g.moveTo(x - 3, y + s * 0.5).lineTo(x - 4 - walkPhase, y + s + 3).stroke({ color: BONE_WHITE, width: 1, alpha: 0.5 });
    g.moveTo(x + 3, y + s * 0.5).lineTo(x + 4 + walkPhase, y + s + 3).stroke({ color: BONE_WHITE, width: 1, alpha: 0.5 });
    // Feet
    g.circle(x - 4 - walkPhase, y + s + 3, 1).fill({ color: BONE_WHITE, alpha: 0.3 });
    g.circle(x + 4 + walkPhase, y + s + 3, 1).fill({ color: BONE_WHITE, alpha: 0.3 });

    // Torso — ribcage shape
    g.ellipse(x, y, s * 0.7, s * 0.9).fill({ color: u.color, alpha: 0.85 });
    // Rib lines
    for (let ri = -2; ri <= 2; ri++) {
      const ry = y + ri * (s * 0.2);
      g.moveTo(x - s * 0.5, ry).bezierCurveTo(x - s * 0.2, ry - 1, x + s * 0.2, ry - 1, x + s * 0.5, ry).stroke({ color: BONE_WHITE, width: 0.5, alpha: 0.15 });
    }

    // Arms — bone struts with weapons
    const armSwing = Math.sin(t * 4 + u.id * 0.7) * 3;
    // Left arm
    g.moveTo(x - s * 0.6, y - s * 0.2).lineTo(x - s - 3, y + armSwing).stroke({ color: BONE_WHITE, width: 1, alpha: 0.5 });
    // Right arm with weapon
    g.moveTo(x + s * 0.6, y - s * 0.2).lineTo(x + s + 3, y - armSwing).stroke({ color: BONE_WHITE, width: 1, alpha: 0.5 });
    // Weapon (claw/blade)
    g.moveTo(x + s + 3, y - armSwing).lineTo(x + s + 7, y - armSwing - 3).stroke({ color: u.chimera ? 0xaa66cc : 0x667766, width: 1.5, alpha: 0.6 });

    // Skull head
    const headY = y - s * 0.8;
    g.circle(x, headY, s * 0.45).fill({ color: BONE_WHITE, alpha: 0.7 });
    // Jaw
    g.moveTo(x - s * 0.3, headY + s * 0.3).bezierCurveTo(x - s * 0.1, headY + s * 0.45, x + s * 0.1, headY + s * 0.45, x + s * 0.3, headY + s * 0.3).stroke({ color: BONE_WHITE, width: 0.8, alpha: 0.4 });

    if (u.chimera) {
      // Chimera horns
      g.moveTo(x - s * 0.3, headY - s * 0.2).lineTo(x - s * 0.5, headY - s * 0.7).stroke({ color: u.color, width: 1.5, alpha: 0.7 });
      g.moveTo(x + s * 0.3, headY - s * 0.2).lineTo(x + s * 0.5, headY - s * 0.7).stroke({ color: u.color, width: 1.5, alpha: 0.7 });
      // Glowing purple eyes
      g.circle(x - 2, headY - 1, 1.5).fill({ color: 0xff44ff, alpha: 0.9 });
      g.circle(x + 2, headY - 1, 1.5).fill({ color: 0xff44ff, alpha: 0.9 });
      // Eye glow trails
      g.circle(x - 2, headY - 1, 3).fill({ color: 0xff44ff, alpha: 0.1 });
      g.circle(x + 2, headY - 1, 3).fill({ color: 0xff44ff, alpha: 0.1 });
      // Ability icon with ring
      if (u.ability) {
        const abilCol = u.ability === "cleave" ? 0xff4444 : u.ability === "drain" ? 0x44ff44 :
          u.ability === "explode" ? 0xff6622 : u.ability === "shield" ? 0x4488ff : 0xffaa00;
        const ap = 0.4 + Math.sin(t * 3) * 0.2;
        g.circle(x, headY - s * 0.7 - 4, 3).fill({ color: abilCol, alpha: ap });
        g.circle(x, headY - s * 0.7 - 4, 5).stroke({ color: abilCol, width: 0.5, alpha: ap * 0.5 });
      }
      // Soul wisps trailing behind chimera
      for (let wi = 0; wi < 2; wi++) {
        const wa = t * 2 + wi * 3.14;
        const wx = x + Math.cos(wa) * (s + 2);
        const wy = y + Math.sin(wa) * s * 0.5;
        g.circle(wx, wy, 1.5).fill({ color: 0xaa44ff, alpha: 0.15 + Math.sin(t * 3 + wi) * 0.08 });
      }
    } else {
      // Normal green eyes
      g.circle(x - 2, headY - 1, 1.2).fill({ color: NECRO_GREEN, alpha: 0.8 });
      g.circle(x + 2, headY - 1, 1.2).fill({ color: NECRO_GREEN, alpha: 0.8 });
      // Eye sockets (dark)
      g.circle(x - 2, headY - 1, 2).fill({ color: 0x0a0a06, alpha: 0.3 });
      g.circle(x + 2, headY - 1, 2).fill({ color: 0x0a0a06, alpha: 0.3 });
      // Nose hole
      g.moveTo(x - 0.5, headY + 1).lineTo(x, headY + 2.5).lineTo(x + 0.5, headY + 1).stroke({ color: 0x0a0a06, width: 0.5, alpha: 0.25 });
    }

    // Ranged indicator — floating orbs for mage-type undead
    if (u.ranged) {
      for (let oi = 0; oi < 2; oi++) {
        const oa = t * 3 + oi * 3.14;
        const orbX = x + Math.cos(oa) * (s + 5);
        const orbY = y - s * 0.5 + Math.sin(oa) * 3;
        g.circle(orbX, orbY, 2).fill({ color: 0x9944ff, alpha: 0.5 + Math.sin(t * 4 + oi) * 0.2 });
        g.circle(orbX, orbY, 4).fill({ color: 0x9944ff, alpha: 0.08 });
      }
    }

    // Shield ability — visible shield aura
    if (u.ability === "shield") {
      g.circle(x, y, s + 3).stroke({ color: 0x4488ff, width: 1, alpha: 0.15 + Math.sin(t * 2 + u.id) * 0.08 });
    }

    // Name tag
    const nameT = new Text({ text: u.name, style: new TextStyle({ fontFamily: FONT, fontSize: 6, fill: u.chimera ? 0xcc88ff : NECRO_GREEN }) });
    nameT.alpha = 0.6; nameT.anchor.set(0.5, 0); nameT.position.set(x, y + s + 5);
    this._ui.addChild(nameT);

    // HP bar
    const barW = s * 2.5;
    g.roundRect(x - barW / 2, headY - s * 0.6 - 4, barW, 3, 1).fill({ color: 0x111108, alpha: 0.7 });
    g.roundRect(x - barW / 2, headY - s * 0.6 - 4, barW * (u.hp / u.maxHp), 3, 1).fill({ color: u.hp / u.maxHp > 0.5 ? NECRO_GREEN : u.hp / u.maxHp > 0.25 ? 0xffaa44 : 0xff4444 });
  }

  private _drawCrusaderUnit(g: Graphics, x: number, y: number, c: Crusader, state: NecroState): void {
    const s = c.size;
    const t = state.elapsed;

    // Shadow
    g.ellipse(x + 1, y + s + 2, s * 0.8, 2.5).fill({ color: 0x000000, alpha: 0.2 });

    // Holy glow for special units
    if (c.ability) {
      const hpulse = 0.08 + Math.sin(t * 2 + c.id * 0.7) * 0.05;
      g.circle(x, y, s + 6).fill({ color: 0xffd700, alpha: hpulse });
    }

    // Legs — armored
    const walkPhase = Math.sin(t * 4.5 + c.id * 1.1) * 2;
    g.moveTo(x - 3, y + s * 0.5).lineTo(x - 3 - walkPhase, y + s + 2).stroke({ color: 0x888888, width: 1.5, alpha: 0.5 });
    g.moveTo(x + 3, y + s * 0.5).lineTo(x + 3 + walkPhase, y + s + 2).stroke({ color: 0x888888, width: 1.5, alpha: 0.5 });
    // Boots
    g.roundRect(x - 5 - walkPhase, y + s + 1, 4, 2, 0.5).fill({ color: 0x666655, alpha: 0.5 });
    g.roundRect(x + 1 + walkPhase, y + s + 1, 4, 2, 0.5).fill({ color: 0x666655, alpha: 0.5 });

    // Body — armored torso with tabard
    g.ellipse(x, y, s * 0.7, s * 0.95).fill({ color: 0x888888, alpha: 0.8 }); // Chainmail base
    // Tabard / surcoat
    g.moveTo(x - s * 0.4, y - s * 0.3).lineTo(x - s * 0.5, y + s * 0.5).lineTo(x + s * 0.5, y + s * 0.5).lineTo(x + s * 0.4, y - s * 0.3).fill({ color: c.color, alpha: 0.6 });
    // Armor highlight
    g.ellipse(x - 1, y - s * 0.2, s * 0.3, s * 0.4).fill({ color: 0xffffff, alpha: 0.05 });

    // Arms
    const armSwing = Math.sin(t * 4 + c.id * 0.8) * 2;
    // Shield arm (left)
    g.moveTo(x - s * 0.6, y - s * 0.1).lineTo(x - s - 3, y + armSwing).stroke({ color: 0x888888, width: 1.5, alpha: 0.5 });
    // Shield — kite/heater shape
    const shX = x - s - 4, shY = y + armSwing;
    g.moveTo(shX, shY - 4).lineTo(shX + 4, shY - 3).lineTo(shX + 4, shY + 2).lineTo(shX, shY + 5).lineTo(shX - 4, shY + 2).lineTo(shX - 4, shY - 3).fill({ color: 0x999988, alpha: 0.6 });
    g.moveTo(shX, shY - 4).lineTo(shX + 4, shY - 3).lineTo(shX + 4, shY + 2).lineTo(shX, shY + 5).lineTo(shX - 4, shY + 2).lineTo(shX - 4, shY - 3).stroke({ color: 0xaaaaaa, width: 0.5, alpha: 0.4 });
    // Shield emblem (cross)
    g.rect(shX - 0.5, shY - 2, 1, 5).fill({ color: 0xcc2222, alpha: 0.4 });
    g.rect(shX - 2, shY - 0.5, 4, 1).fill({ color: 0xcc2222, alpha: 0.4 });

    // Weapon arm (right)
    g.moveTo(x + s * 0.6, y - s * 0.1).lineTo(x + s + 2, y - armSwing).stroke({ color: 0x888888, width: 1.5, alpha: 0.5 });
    // Sword
    g.moveTo(x + s + 2, y - armSwing).lineTo(x + s + 8, y - armSwing - 5).stroke({ color: 0xddddcc, width: 1.5, alpha: 0.7 });
    // Crossguard
    g.moveTo(x + s + 1, y - armSwing - 0.5).lineTo(x + s + 3, y - armSwing + 1).stroke({ color: 0xaa9944, width: 1, alpha: 0.5 });

    // Helmet
    const headY = y - s * 0.75;
    g.circle(x, headY, s * 0.45).fill({ color: 0x999999, alpha: 0.8 });
    // Visor slit
    g.rect(x - s * 0.25, headY - 0.5, s * 0.5, 1.5).fill({ color: 0x222222, alpha: 0.5 });
    // Helmet crest
    g.moveTo(x, headY - s * 0.4).lineTo(x, headY - s * 0.65).stroke({ color: 0x888888, width: 1.5, alpha: 0.4 });

    // Type-specific details
    if (c.type === "paladin") {
      // Golden helmet, larger, golden cross glow
      g.circle(x, headY, s * 0.5).stroke({ color: 0xffd700, width: 1, alpha: 0.4 });
      g.rect(x - 1, y - 3, 2, 6).fill({ color: 0xffd700, alpha: 0.5 });
      g.rect(x - 3, y - 1, 6, 2).fill({ color: 0xffd700, alpha: 0.5 });
      // Golden plume
      g.moveTo(x, headY - s * 0.45).bezierCurveTo(x + 4, headY - s - 2, x + 6, headY - s, x + 3, headY - s * 0.5).stroke({ color: 0xffd700, width: 1.5, alpha: 0.5 });
    } else if (c.type === "priest") {
      // No helmet — hooded head, staff instead of sword
      g.circle(x, headY, s * 0.45).fill({ color: 0xeeeeee, alpha: 0.6 });
      // Hood
      g.moveTo(x - s * 0.4, headY + s * 0.2).bezierCurveTo(x - s * 0.5, headY - s * 0.3, x + s * 0.5, headY - s * 0.3, x + s * 0.4, headY + s * 0.2).fill({ color: 0xffffff, alpha: 0.15 });
      // Staff with holy orb
      g.moveTo(x + s + 2, y + s).lineTo(x + s + 2, headY - s * 0.5).stroke({ color: 0xddddaa, width: 1.5 });
      g.circle(x + s + 2, headY - s * 0.6, 2.5).fill({ color: 0xffffaa, alpha: 0.5 + Math.sin(t * 3 + c.id) * 0.2 });
      g.circle(x + s + 2, headY - s * 0.6, 5).fill({ color: 0xffffaa, alpha: 0.06 });
      // Heal aura indicator
      if (c.ability === "heal_aura") {
        g.circle(x, y, s * 3).stroke({ color: 0xffffaa, width: 0.5, alpha: 0.06 + Math.sin(t * 2) * 0.03 });
      }
    } else if (c.type === "banner") {
      // Banner pole with flag
      g.moveTo(x, headY - s * 0.4).lineTo(x, headY - s * 1.5).stroke({ color: 0x886644, width: 1.5 });
      // Flag — waving
      const wave = Math.sin(t * 3 + c.id) * 2;
      g.moveTo(x, headY - s * 1.5).lineTo(x + 10, headY - s * 1.4 + wave).lineTo(x + 10, headY - s * 0.9 + wave).lineTo(x, headY - s * 1.0).fill({ color: 0xdd2222, alpha: 0.7 });
      // Cross on flag
      g.rect(x + 3, headY - s * 1.35 + wave * 0.5, 1, 4).fill({ color: 0xffd700, alpha: 0.5 });
      g.rect(x + 2, headY - s * 1.2 + wave * 0.5, 3, 1).fill({ color: 0xffd700, alpha: 0.5 });
    } else if (c.type === "inquisitor") {
      // Dark red hood, burning torch, purge aura
      g.circle(x, headY, s * 0.5).fill({ color: 0x661111, alpha: 0.7 });
      // Burning eyes
      g.circle(x - 2, headY - 1, 1.5).fill({ color: 0xff6600, alpha: 0.9 });
      g.circle(x + 2, headY - 1, 1.5).fill({ color: 0xff6600, alpha: 0.9 });
      // Torch
      g.moveTo(x - s - 4, y).lineTo(x - s - 4, headY - s).stroke({ color: 0x886644, width: 2 });
      const flicker = 0.6 + Math.sin(t * 6 + c.id) * 0.2;
      g.circle(x - s - 4, headY - s - 3, 3).fill({ color: 0xff6622, alpha: flicker });
      g.circle(x - s - 4, headY - s - 3, 5).fill({ color: 0xff4400, alpha: flicker * 0.15 });
      // Purge aura ring
      g.circle(x, y, s * 3).stroke({ color: 0xff6600, width: 0.8, alpha: 0.06 + Math.sin(t * 2) * 0.03 });
    } else if (c.type === "templar") {
      // Red cross on tabard (already colored)
      g.rect(x - 1, y - 3, 2, 7).fill({ color: 0xcc2222, alpha: 0.35 });
      g.rect(x - 3, y - 1, 6, 2).fill({ color: 0xcc2222, alpha: 0.35 });
    }

    // Name tag
    const nameT = new Text({ text: c.name, style: new TextStyle({ fontFamily: FONT, fontSize: 6, fill: 0xddddaa }) });
    nameT.alpha = 0.5; nameT.anchor.set(0.5, 0); nameT.position.set(x, y + s + 5);
    this._ui.addChild(nameT);

    // HP bar
    const barW = s * 2.5;
    g.roundRect(x - barW / 2, headY - s * 0.6 - 4, barW, 3, 1).fill({ color: 0x111108, alpha: 0.7 });
    g.roundRect(x - barW / 2, headY - s * 0.6 - 4, barW * (c.hp / c.maxHp), 3, 1).fill({ color: c.hp / c.maxHp > 0.5 ? 0xffdd44 : c.hp / c.maxHp > 0.25 ? 0xff8844 : 0xff4444 });
  }

  // ── Necromancer avatar ─────────────────────────────────────────────────

  private _drawNecromancer(g: Graphics, x: number, y: number, state: NecroState): void {
    const t = state.elapsed;
    const sway = Math.sin(t * 1.5) * 2;
    const hover = Math.sin(t * 1.2) * 1.5; // Slight float

    // Layered dark aura
    const pulse = 0.06 + Math.sin(t * 2) * 0.03;
    g.circle(x, y + hover, 28).fill({ color: DARK_PURPLE, alpha: pulse * 0.5 });
    g.circle(x, y + hover, 22).fill({ color: DARK_PURPLE, alpha: pulse });
    g.circle(x, y + hover, 16).fill({ color: 0x0a0418, alpha: pulse * 1.5 });

    // Soul fragments orbiting
    for (let si = 0; si < 4; si++) {
      const sa = t * 1.5 + (si / 4) * Math.PI * 2;
      const sr = 20 + Math.sin(t * 0.7 + si) * 3;
      const sx = x + Math.cos(sa) * sr;
      const sy = y + hover + Math.sin(sa) * sr * 0.4;
      g.circle(sx, sy, 1.2).fill({ color: NECRO_GREEN, alpha: 0.2 + Math.sin(t * 3 + si) * 0.1 });
      // Trail
      const trailX = x + Math.cos(sa - 0.3) * sr;
      const trailY = y + hover + Math.sin(sa - 0.3) * sr * 0.4;
      g.moveTo(trailX, trailY).lineTo(sx, sy).stroke({ color: NECRO_GREEN, width: 0.5, alpha: 0.08 });
    }

    // Robe body — flowing shape with wavy hem
    const robeTop = y - 6 + hover;
    const robeBot = y + 16 + hover;
    g.moveTo(x - 10 + sway * 0.5, robeBot)
      .bezierCurveTo(x - 11, robeBot - 5, x - 7, robeTop + 5, x, robeTop)
      .bezierCurveTo(x + 7, robeTop + 5, x + 11, robeBot - 5, x + 10 - sway * 0.5, robeBot)
      .fill({ color: 0x140820 });
    // Robe edges / folds
    g.moveTo(x - 10 + sway * 0.5, robeBot)
      .bezierCurveTo(x - 11, robeBot - 5, x - 7, robeTop + 5, x, robeTop)
      .bezierCurveTo(x + 7, robeTop + 5, x + 11, robeBot - 5, x + 10 - sway * 0.5, robeBot)
      .stroke({ color: 0x2a1a3a, width: 0.5, alpha: 0.5 });
    // Inner fold lines
    g.moveTo(x - 3, robeTop + 8).bezierCurveTo(x - 4, robeTop + 14, x - 5, robeBot - 4, x - 6 + sway * 0.3, robeBot).stroke({ color: 0x1a0e28, width: 0.5, alpha: 0.3 });
    g.moveTo(x + 2, robeTop + 10).bezierCurveTo(x + 3, robeTop + 16, x + 4, robeBot - 3, x + 5 - sway * 0.3, robeBot).stroke({ color: 0x1a0e28, width: 0.5, alpha: 0.25 });
    // Wavy hem
    for (let hi = -3; hi <= 3; hi++) {
      const hx = x + hi * 3 + sway * (hi / 3) * 0.5;
      const wave = Math.sin(t * 3 + hi * 0.8) * 1.5;
      g.moveTo(hx - 1, robeBot).bezierCurveTo(hx, robeBot + 2 + wave, hx + 1, robeBot + 2 + wave, hx + 2, robeBot).stroke({ color: 0x140820, width: 1, alpha: 0.4 });
    }

    // Shoulder pauldrons
    g.ellipse(x - 7, robeTop + 3 + hover, 4, 2.5).fill({ color: 0x1a1030, alpha: 0.7 });
    g.ellipse(x + 7, robeTop + 3 + hover, 4, 2.5).fill({ color: 0x1a1030, alpha: 0.7 });
    g.ellipse(x - 7, robeTop + 3 + hover, 4, 2.5).stroke({ color: 0x2a1a3a, width: 0.5, alpha: 0.3 });
    g.ellipse(x + 7, robeTop + 3 + hover, 4, 2.5).stroke({ color: 0x2a1a3a, width: 0.5, alpha: 0.3 });

    // Hood — deeper, with shadow
    const hoodY = y - 9 + hover;
    g.moveTo(x - 8, robeTop + 2).bezierCurveTo(x - 9, hoodY - 2, x + 9, hoodY - 2, x + 8, robeTop + 2).fill({ color: 0x140820 });
    g.moveTo(x - 8, robeTop + 2).bezierCurveTo(x - 9, hoodY - 2, x + 9, hoodY - 2, x + 8, robeTop + 2).stroke({ color: 0x2a1a3a, width: 0.5, alpha: 0.4 });
    // Hood inner shadow
    g.ellipse(x, hoodY + 2, 5, 4).fill({ color: 0x060208, alpha: 0.6 });

    // Eyes — glowing green with glow halo
    g.circle(x - 2.5, hoodY + 1, 2.5).fill({ color: NECRO_GREEN, alpha: 0.12 });
    g.circle(x + 2.5, hoodY + 1, 2.5).fill({ color: NECRO_GREEN, alpha: 0.12 });
    g.circle(x - 2.5, hoodY + 1, 1.5).fill({ color: NECRO_GREEN, alpha: 0.9 });
    g.circle(x + 2.5, hoodY + 1, 1.5).fill({ color: NECRO_GREEN, alpha: 0.9 });
    // Eye gleam
    g.circle(x - 2, hoodY + 0.5, 0.5).fill({ color: 0xffffff, alpha: 0.4 });
    g.circle(x + 3, hoodY + 0.5, 0.5).fill({ color: 0xffffff, alpha: 0.4 });

    // Skeletal hands — reaching out from sleeves
    const lhx = x - 9 + sway * 0.3, lhy = y + 4 + hover;
    const rhx = x + 9 - sway * 0.3, rhy = y + 2 + hover;
    // Left hand (holding gesture)
    g.moveTo(lhx, lhy).lineTo(lhx - 3, lhy - 2).stroke({ color: BONE_WHITE, width: 0.8, alpha: 0.4 });
    g.moveTo(lhx, lhy).lineTo(lhx - 2, lhy - 4).stroke({ color: BONE_WHITE, width: 0.8, alpha: 0.4 });
    g.moveTo(lhx, lhy).lineTo(lhx - 1, lhy - 4).stroke({ color: BONE_WHITE, width: 0.8, alpha: 0.35 });
    g.circle(lhx, lhy, 1.5).fill({ color: BONE_WHITE, alpha: 0.3 });
    // Right hand (gripping staff)
    g.circle(rhx + 1, rhy, 1.5).fill({ color: BONE_WHITE, alpha: 0.3 });
    g.moveTo(rhx, rhy).lineTo(rhx + 3, rhy - 1).stroke({ color: BONE_WHITE, width: 0.8, alpha: 0.35 });

    // Staff — gnarled with knots
    const staffBaseX = x + 12, staffBaseY = y + 16 + hover;
    const staffTopX = x + 13, staffTopY = y - 20 + hover;
    g.moveTo(staffBaseX + sway * 0.5, staffBaseY).bezierCurveTo(staffBaseX + 1, y + hover, staffTopX - 1, staffTopY + 15, staffTopX, staffTopY).stroke({ color: 0x3a2a1a, width: 2.5 });
    // Knots
    g.circle(staffTopX - 0.5, staffTopY + 10, 2).fill({ color: 0x2a1a10, alpha: 0.4 });
    g.circle(staffTopX, staffTopY + 22, 1.5).fill({ color: 0x2a1a10, alpha: 0.3 });
    // Staff top — skull grip
    g.circle(staffTopX, staffTopY, 3.5).fill({ color: BONE_WHITE, alpha: 0.5 });
    g.circle(staffTopX - 1, staffTopY - 1, 0.8).fill({ color: 0x060208, alpha: 0.4 });
    g.circle(staffTopX + 1, staffTopY - 1, 0.8).fill({ color: 0x060208, alpha: 0.4 });

    // Staff orb — hovering above skull
    const orbY = staffTopY - 6;
    const orbPulse = 0.5 + Math.sin(t * 3) * 0.3;
    g.circle(staffTopX, orbY, 5).fill({ color: NECRO_GREEN, alpha: orbPulse * 0.8 });
    g.circle(staffTopX, orbY, 8).fill({ color: NECRO_GREEN, alpha: orbPulse * 0.12 });
    g.circle(staffTopX, orbY, 12).fill({ color: NECRO_GREEN, alpha: orbPulse * 0.04 });
    // Orb inner sparkle
    g.circle(staffTopX - 1, orbY - 1, 1.5).fill({ color: 0xffffff, alpha: orbPulse * 0.3 });

    // Rune particles orbiting orb
    for (let i = 0; i < 5; i++) {
      const angle = t * 2.5 + (i / 5) * Math.PI * 2;
      const dist = 8 + Math.sin(t * 1.5 + i) * 2;
      const rx = staffTopX + Math.cos(angle) * dist;
      const ry = orbY + Math.sin(angle) * dist * 0.5;
      g.circle(rx, ry, 0.8).fill({ color: NECRO_GREEN, alpha: 0.25 + Math.sin(t * 4 + i) * 0.1 });
    }

    // Energy line from hand to orb (during ritual)
    if (state.phase === "ritual" && state.isRaising) {
      g.moveTo(lhx - 2, lhy - 3).bezierCurveTo(lhx - 5, lhy - 15, staffTopX - 5, orbY + 10, staffTopX, orbY).stroke({ color: NECRO_GREEN, width: 1, alpha: 0.3 + Math.sin(t * 6) * 0.15 });
    }
  }

  // ── HUD ────────────────────────────────────────────────────────────────

  private _drawHUD(g: Graphics, state: NecroState, sw: number, sh: number, ox: number, oy: number): void {
    // Top bar — darker with subtle gradient
    for (let by = 0; by < 46; by++) {
      const ba = 0.85 - by * 0.003;
      g.rect(0, by, sw, 1).fill({ color: 0x06040a, alpha: ba });
    }
    // Decorative bottom edge
    g.moveTo(0, 44).lineTo(sw, 44).stroke({ color: NECRO_GREEN, width: 1, alpha: 0.2 });
    g.moveTo(0, 45).lineTo(sw, 45).stroke({ color: NECRO_GREEN, width: 0.5, alpha: 0.06 });
    // Corner ornaments
    g.moveTo(0, 44).lineTo(8, 44).lineTo(8, 40).stroke({ color: NECRO_GREEN, width: 0.5, alpha: 0.15 });
    g.moveTo(sw, 44).lineTo(sw - 8, 44).lineTo(sw - 8, 40).stroke({ color: NECRO_GREEN, width: 0.5, alpha: 0.15 });

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); this._ui.addChild(t);
    };

    // Title with skull icon drawn
    g.circle(22, 14, 5).fill({ color: NECRO_GREEN, alpha: 0.15 });
    g.circle(20, 13, 1).fill({ color: NECRO_GREEN, alpha: 0.3 });
    g.circle(24, 13, 1).fill({ color: NECRO_GREEN, alpha: 0.3 });
    addText("NECROMANCER", 34, 5, { fontSize: 14, fill: NECRO_GREEN, fontWeight: "bold", letterSpacing: 3 });

    const waveStr = state.endless ? `Wave ${state.wave + 1} \u221E` : `Wave ${state.wave + 1}/${state.totalWaves}`;
    addText(waveStr, 195, 7, { fontSize: 11, fill: state.endless ? 0xaa44ff : 0x889988 });
    addText(`Gold: ${state.gold}`, 295, 7, { fontSize: 12, fill: 0xffd700 });
    addText(`Score: ${state.score}`, 395, 7, { fontSize: 12, fill: 0x44ccaa });
    addText(`Army: ${state.undead.length}`, 505, 7, { fontSize: 11, fill: NECRO_GREEN });

    // Mana bar — ornate frame
    const manaW = 130, manaH = 9, manaX = 195, manaY = 26;
    // Frame
    g.roundRect(manaX - 1, manaY - 1, manaW + 2, manaH + 2, 4).stroke({ color: 0x334466, width: 0.8, alpha: 0.4 });
    // Background
    g.roundRect(manaX, manaY, manaW, manaH, 3).fill({ color: 0x0a0a1a });
    // Fill — gradient effect via layered bars
    const manaFill = manaW * (state.mana / state.maxMana);
    g.roundRect(manaX, manaY, manaFill, manaH, 3).fill({ color: 0x3355aa, alpha: 0.7 });
    g.roundRect(manaX, manaY, manaFill, manaH * 0.5, 3).fill({ color: 0x4477dd, alpha: 0.3 });
    // Shimmer line
    if (state.mana > state.maxMana * 0.8) {
      g.roundRect(manaX + 2, manaY + 1, manaFill - 4, 2, 1).fill({ color: 0x88aaff, alpha: 0.15 + Math.sin(state.elapsed * 4) * 0.08 });
    }
    // Orb decorations at ends
    g.circle(manaX, manaY + manaH / 2, 2).fill({ color: 0x334466, alpha: 0.4 });
    g.circle(manaX + manaW, manaY + manaH / 2, 2).fill({ color: 0x334466, alpha: 0.4 });
    addText(`${Math.floor(state.mana)}/${state.maxMana}`, manaX + manaW + 8, manaY - 2, { fontSize: 9, fill: 0x6688cc });

    // HP — drawn heart icons instead of text
    const hpX = 435, hpY = 27;
    addText("HP:", hpX, hpY, { fontSize: 9, fill: 0x886666 });
    for (let hi = 0; hi < state.maxPlayerHp; hi++) {
      const heartX = hpX + 22 + hi * 8;
      const filled = hi < state.playerHp;
      const col = filled ? (state.playerHp <= 3 ? 0xff3333 : 0xff6666) : 0x332222;
      const a = filled ? 0.8 : 0.3;
      // Heart shape — two bumps and a point
      g.moveTo(heartX, hpY + 5).bezierCurveTo(heartX - 3, hpY + 1, heartX - 3, hpY - 2, heartX, hpY).bezierCurveTo(heartX + 3, hpY - 2, heartX + 3, hpY + 1, heartX, hpY + 5).fill({ color: col, alpha: a });
      // Highlight
      if (filled) g.circle(heartX - 1, hpY, 0.8).fill({ color: 0xffffff, alpha: 0.2 });
    }

    // Phase indicator — with icon
    const phaseIcons: Record<string, string> = { dig: "\u26CF", ritual: "\u2721", battle: "\u2694", start: "\u23F3" };
    const phaseNames: Record<string, string> = { dig: "DIG", ritual: "RITUAL", battle: "BATTLE", start: "..." };
    const phaseIcon = phaseIcons[state.phase] ?? "";
    const phaseName = phaseNames[state.phase] ?? state.phase.toUpperCase();
    // Phase badge
    g.roundRect(sw / 2 - 30, 28, 60, 12, 3).fill({ color: 0x0a0812, alpha: 0.6 });
    g.roundRect(sw / 2 - 30, 28, 60, 12, 3).stroke({ color: 0x445544, width: 0.5, alpha: 0.3 });
    addText(`${phaseIcon} ${phaseName}`, sw / 2, 29, { fontSize: 8, fill: 0x778877, letterSpacing: 1 }, true);

    // Bottom bar — subtle with inner glow
    g.rect(0, sh - 20, sw, 20).fill({ color: 0x06040a, alpha: 0.6 });
    g.moveTo(0, sh - 20).lineTo(sw, sh - 20).stroke({ color: 0x445544, width: 0.5, alpha: 0.1 });
    const controls: Record<string, string> = {
      dig: "Click: dig grave | D: dig all (15m) | SPACE: ritual | Esc: quit",
      ritual: "Click: place corpse | ENTER: raise | SPACE: battle | Esc: quit",
      battle: "LMB: Dark Nova | RMB/W: Bone Wall | Esc: quit",
      upgrade: "Click: buy upgrades | SPACE: next wave",
    };
    addText(controls[state.phase] ?? "Esc: quit", sw / 2, sh - 16, { fontSize: 7, fill: 0x445544 }, true);
  }

  destroy(): void {
    this.container.removeChildren();
    this._gfx.destroy();
  }
}
