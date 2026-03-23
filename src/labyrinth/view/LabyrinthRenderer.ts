// ---------------------------------------------------------------------------
// Labyrinth mode — fog-of-war maze renderer with atmosphere
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { LabyrinthState } from "../state/LabyrinthState";
import { cellToPixel } from "../state/LabyrinthState";
import { LabyrinthConfig, ITEMS, TRAPS, FLOORS, DIFFICULTIES, FLOOR_THEMES } from "../config/LabyrinthConfig";

const FONT = "Georgia, serif";
const RELIC_COLOR = 0xffd700;
const EXIT_COLOR = 0x44ff88;
const MINO_COLOR = 0xcc2222;
const SHADOW_COLOR = 0x6633aa;
const PLAYER_COLOR = 0x88ccff;
const EXPLORED_ALPHA = 0.16;

// Warm→cool color ramp for torchlight (amber near, blue-purple far)
function _lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const gc = Math.round(ag + (bg - ag) * t);
  const bc = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gc << 8) | bc;
}
// Theme defaults (overridden per floor)
let WARM_LIGHT = 0x2a1e10;
let COOL_DARK = 0x080614;
let WALL_WARM = 0x665544;
let WALL_COOL = 0x332244;
let WALL_SHIFT = 0x775588;
let FOG_COLOR = 0x030206;
let SCONCE_COL = 0xffaa44;
let DUST_COL = 0xddaa77;

// Seeded per-cell pseudo-random for floor variation
function _cellHash(c: number, r: number): number {
  let h = c * 374761393 + r * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

export class LabyrinthRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _ui = new Container();

  init(sw: number, sh: number): void {
    this.container.removeChildren();
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x020204 });
    this.container.addChild(bg);
    this._gfx = new Graphics();
    this._ui = new Container();
    this.container.addChild(this._gfx);
    this.container.addChild(this._ui);
  }

  draw(state: LabyrinthState, sw: number, _sh: number): void {
    this._gfx.clear();
    while (this._ui.children.length > 0) this._ui.removeChildAt(0);

    const g = this._gfx;
    const cs = LabyrinthConfig.CELL_SIZE;
    const mazeW = state.cols * cs;
    const mazeH = state.rows * cs;
    let ox = Math.floor((sw - mazeW) / 2);
    let oy = 50;
    if (state.screenShake > 0) {
      ox += (Math.random() - 0.5) * state.screenShake * 8;
      oy += (Math.random() - 0.5) * state.screenShake * 8;
    }

    // Apply floor theme
    const theme = FLOOR_THEMES[Math.min(state.floor, FLOOR_THEMES.length - 1)];
    WARM_LIGHT = theme.warmLight; COOL_DARK = theme.coolDark;
    WALL_WARM = theme.wallWarm; WALL_COOL = theme.wallCool; WALL_SHIFT = theme.wallShift;
    FOG_COLOR = theme.fogColor; SCONCE_COL = theme.sconceColor; DUST_COL = theme.ambientDust;

    const torchPct = state.torchFuel / LabyrinthConfig.TORCH_MAX;
    const diff = DIFFICULTIES.find(d => d.id === state.difficulty) ?? DIFFICULTIES[1];
    // Non-linear vision: drops sharply below 20% torch
    const adjTorchPct = (torchPct > 0 && torchPct < 0.2) ? torchPct * torchPct / 0.2 : torchPct;
    let effectiveVision = adjTorchPct <= 0 ? LabyrinthConfig.DEAD_TORCH_VISION
      : LabyrinthConfig.MIN_VISION + (LabyrinthConfig.BASE_VISION + diff.visionBonus - LabyrinthConfig.MIN_VISION) * adjTorchPct;
    if (state.inDarkness) effectiveVision *= LabyrinthConfig.DARKNESS_ZONE_VISION_MULT;
    // Dynamic torch breathing — vision subtly pulses
    const breathAmp = torchPct < 0.25 ? 0.08 : 0.03;
    const breathFreq = torchPct < 0.25 ? 300 : 800;
    effectiveVision *= 1 + Math.sin(Date.now() / breathFreq) * breathAmp;
    const visionR = effectiveVision * cs;
    const fullReveal = state.revealTimer > 0;
    const now = Date.now();

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); this._ui.addChild(t);
    };

    // ======== MAZE CELLS + WALLS ========
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const cell = state.maze[r][c];
        const cx = ox + c * cs + cs / 2, cy = oy + r * cs + cs / 2;
        const dist = Math.sqrt((cx - (ox + state.px)) ** 2 + (cy - (oy + state.py)) ** 2);
        const inVision = fullReveal || dist <= visionR + cs;
        const litAlpha = fullReveal ? 0.7 : Math.max(0, 1 - dist / visionR);
        if (!inVision && !cell.explored) continue;
        const alpha = inVision && litAlpha > 0 ? litAlpha : (cell.explored ? EXPLORED_ALPHA : 0);
        if (alpha <= 0) continue;

        const wx = ox + c * cs, wy = oy + r * cs;
        const warmT = 1 - Math.min(1, dist / visionR); // 1=near player, 0=far

        // ---- Floor tile with torchlight color gradient ----
        const floorCol = _lerpColor(COOL_DARK, WARM_LIGHT, warmT * torchPct);
        const cellRand = _cellHash(c, r);
        // Stone brick variation: slightly different shade per cell
        const brickShift = Math.floor(cellRand * 0x0a) - 0x05;
        const floorR = Math.max(0, Math.min(255, ((floorCol >> 16) & 0xff) + brickShift));
        const floorG = Math.max(0, Math.min(255, ((floorCol >> 8) & 0xff) + brickShift));
        const floorB = Math.max(0, Math.min(255, (floorCol & 0xff) + brickShift));
        const variedFloor = (floorR << 16) | (floorG << 8) | floorB;

        g.rect(wx + 1, wy + 1, cs - 2, cs - 2).fill({ color: variedFloor, alpha: alpha * 0.7 });

        // Stone brick mortar lines (subtle grid within each cell)
        if (alpha > 0.25) {
          const mortarAlpha = alpha * 0.08;
          // Horizontal mortar — offset on alternate rows for brick pattern
          const brickOffset = (r % 2) * (cs / 2);
          g.moveTo(wx + 1, wy + cs * 0.5).lineTo(wx + cs - 1, wy + cs * 0.5).stroke({ color: theme.floorAccent, width: 0.4, alpha: mortarAlpha });
          g.moveTo(wx + brickOffset + cs * 0.25, wy + 1).lineTo(wx + brickOffset + cs * 0.25, wy + cs * 0.5).stroke({ color: theme.floorAccent, width: 0.4, alpha: mortarAlpha * 0.7 });
          g.moveTo(wx + brickOffset + cs * 0.75, wy + cs * 0.5).lineTo(wx + brickOffset + cs * 0.75, wy + cs - 1).stroke({ color: theme.floorAccent, width: 0.4, alpha: mortarAlpha * 0.7 });
        }

        // ---- Walls with thickness and warm/cool coloring ----
        const wallCol = state.shiftWarning ? WALL_SHIFT : _lerpColor(WALL_COOL, WALL_WARM, warmT * torchPct);
        const wa = alpha * 0.95;
        const wThick = 3;
        // Draw walls as filled rectangles for thickness
        if (cell.top) {
          g.rect(wx, wy - 1, cs, wThick).fill({ color: wallCol, alpha: wa });
          // Highlight on top edge
          g.moveTo(wx, wy - 1).lineTo(wx + cs, wy - 1).stroke({ color: 0xffffff, width: 0.3, alpha: wa * 0.08 });
        }
        if (cell.bottom) {
          g.rect(wx, wy + cs - wThick + 1, cs, wThick).fill({ color: wallCol, alpha: wa });
          g.moveTo(wx, wy + cs + 1).lineTo(wx + cs, wy + cs + 1).stroke({ color: 0x000000, width: 0.3, alpha: wa * 0.12 });
        }
        if (cell.left) {
          g.rect(wx - 1, wy, wThick, cs).fill({ color: wallCol, alpha: wa });
          g.moveTo(wx - 1, wy).lineTo(wx - 1, wy + cs).stroke({ color: 0xffffff, width: 0.3, alpha: wa * 0.06 });
        }
        if (cell.right) {
          g.rect(wx + cs - wThick + 1, wy, wThick, cs).fill({ color: wallCol, alpha: wa });
          g.moveTo(wx + cs + 1, wy).lineTo(wx + cs + 1, wy + cs).stroke({ color: 0x000000, width: 0.3, alpha: wa * 0.1 });
        }
        // Stone pillar at wall intersections
        if (alpha > 0.15) {
          const pillarR = 2.2;
          const pillarCol = _lerpColor(theme.fogColor, WALL_WARM, warmT * torchPct * 0.6 + 0.2);
          if (cell.top || cell.left) g.circle(wx, wy, pillarR).fill({ color: pillarCol, alpha: wa * 0.7 });
          if (cell.top || cell.right) g.circle(wx + cs, wy, pillarR).fill({ color: pillarCol, alpha: wa * 0.7 });
          if (cell.bottom || cell.left) g.circle(wx, wy + cs, pillarR).fill({ color: pillarCol, alpha: wa * 0.7 });
          if (cell.bottom || cell.right) g.circle(wx + cs, wy + cs, pillarR).fill({ color: pillarCol, alpha: wa * 0.7 });
        }

        // ---- Wall shadow casting (merged, skip cells too close/far) ----
        if (!fullReveal && dist > cs && dist < visionR) {
          const shadowAlpha = Math.max(0, 1 - dist / visionR) * 0.12;
          const sdx = (wx + cs / 2) - (ox + state.px);
          const sdy = (wy + cs / 2) - (oy + state.py);
          const shadowLen = 4;
          if (cell.top && sdy < 0) g.rect(wx, wy + cs - shadowLen, cs, shadowLen).fill({ color: 0x000000, alpha: shadowAlpha });
          if (cell.bottom && sdy > 0) g.rect(wx, wy, cs, shadowLen).fill({ color: 0x000000, alpha: shadowAlpha });
          if (cell.left && sdx < 0) g.rect(wx + cs - shadowLen, wy, shadowLen, cs).fill({ color: 0x000000, alpha: shadowAlpha });
          if (cell.right && sdx > 0) g.rect(wx, wy, shadowLen, cs).fill({ color: 0x000000, alpha: shadowAlpha });
        }

        // ---- Edge-of-vision flicker (merged) ----
        if (!fullReveal && torchPct > 0 && dist > visionR - cs * 0.3 && dist < visionR + cs * 0.3) {
          const edgeFlicker = Math.sin(now / 100 + c * 3.7 + r * 5.3) * 0.5 + 0.5;
          if (edgeFlicker < 0.3) {
            g.rect(wx, wy, cs, cs).fill({ color: FOG_COLOR, alpha: 0.25 });
          }
        }
      }
    }

    // ---- Decorative maze border ----
    g.rect(ox - 3, oy - 3, mazeW + 6, mazeH + 6).stroke({ color: _lerpColor(WALL_COOL, WALL_WARM, 0.3), width: 3, alpha: 0.35 });
    g.rect(ox - 5, oy - 5, mazeW + 10, mazeH + 10).stroke({ color: _lerpColor(WALL_COOL, WALL_WARM, 0.15), width: 1, alpha: 0.2 });
    // Corner pillar accents
    for (const [cx2, cy2] of [[ox - 4, oy - 4], [ox + mazeW + 4, oy - 4], [ox - 4, oy + mazeH + 4], [ox + mazeW + 4, oy + mazeH + 4]]) {
      g.circle(cx2, cy2, 3).fill({ color: WALL_WARM, alpha: 0.25 });
    }

    // ---- Wall torch sconces ----
    for (const sc of state.sconces) {
      const scx = ox + sc.x, scy = oy + sc.y;
      const dist = Math.sqrt((scx - (ox + state.px)) ** 2 + (scy - (oy + state.py)) ** 2);
      if (!fullReveal && dist > visionR + cs * 2) continue;
      const alpha = fullReveal ? 0.5 : Math.max(0, 1 - dist / (visionR + cs));
      if (alpha <= 0) continue;
      const flick = 0.7 + Math.sin(now / 90 + sc.flicker) * 0.15 + Math.sin(now / 57 + sc.flicker * 2) * 0.1;
      const lightR = LabyrinthConfig.SCONCE_LIGHT_R * cs;
      // Light pool on floor
      g.circle(scx, scy, lightR).fill({ color: SCONCE_COL, alpha: alpha * flick * 0.02 });
      g.circle(scx, scy, lightR * 0.5).fill({ color: SCONCE_COL, alpha: alpha * flick * 0.03 });
      // Sconce bracket
      g.rect(scx - 1, scy - 1, 2, 3).fill({ color: _lerpColor(WALL_COOL, WALL_WARM, 0.5), alpha: alpha * 0.5 });
      // Flame
      const fOff = Math.sin(now / 70 + sc.flicker) * 1;
      g.circle(scx, scy - 3 + fOff, 2 * flick).fill({ color: SCONCE_COL, alpha: alpha * flick * 0.6 });
      g.circle(scx, scy - 4 + fOff, 1.2).fill({ color: _lerpColor(SCONCE_COL, 0xffffff, 0.4), alpha: alpha * flick * 0.5 });
    }

    // ---- Floor decorations (richer) ----
    for (const d of state.decor) {
      const dx = ox + d.col * cs + cs / 2, dy = oy + d.row * cs + cs / 2;
      const dist = Math.sqrt((dx - (ox + state.px)) ** 2 + (dy - (oy + state.py)) ** 2);
      if (!fullReveal && dist > visionR) continue;
      const alpha = (fullReveal ? 0.5 : Math.max(0, 1 - dist / visionR)) * 0.35;
      if (alpha <= 0.02) continue;
      switch (d.type) {
        case "bones":
          // Femur bone shape
          g.moveTo(dx - 3 * d.size, dy).lineTo(dx + 3 * d.size, dy).stroke({ color: 0xccbbaa, width: 1.2, alpha });
          g.circle(dx - 3 * d.size, dy, 1.5 * d.size).fill({ color: 0xccbbaa, alpha: alpha * 0.8 });
          g.circle(dx + 3 * d.size, dy, 1.5 * d.size).fill({ color: 0xccbbaa, alpha: alpha * 0.8 });
          // Second bone crossed
          g.moveTo(dx - 2 * d.size, dy - 2 * d.size).lineTo(dx + 2 * d.size, dy + 2 * d.size).stroke({ color: 0xbbaa99, width: 0.8, alpha: alpha * 0.5 });
          break;
        case "crack":
          g.moveTo(dx - 5, dy - 3).lineTo(dx - 1, dy + 2).lineTo(dx + 4, dy - 2).stroke({ color: 0x221122, width: 1, alpha: alpha * 1.5 });
          g.moveTo(dx - 1, dy + 2).lineTo(dx - 3, dy + 5).stroke({ color: 0x221122, width: 0.6, alpha: alpha });
          g.moveTo(dx - 1, dy + 2).lineTo(dx + 2, dy + 4).stroke({ color: 0x221122, width: 0.5, alpha: alpha * 0.7 });
          break;
        case "moss":
          g.circle(dx, dy, 3.5 * d.size).fill({ color: 0x1a3a1a, alpha: alpha * 0.9 });
          g.circle(dx + 2, dy - 1, 2.5 * d.size).fill({ color: 0x224a22, alpha: alpha * 0.7 });
          g.circle(dx - 1, dy + 2, 1.8 * d.size).fill({ color: 0x2a5a2a, alpha: alpha * 0.5 });
          break;
        case "bloodstain":
          g.circle(dx, dy, 3 * d.size).fill({ color: 0x330808, alpha: alpha * 0.7 });
          g.circle(dx + 2.5, dy + 1.5, 1.8 * d.size).fill({ color: 0x2a0606, alpha: alpha * 0.5 });
          // Splatter drops
          g.circle(dx - 3, dy + 3, 0.8 * d.size).fill({ color: 0x330808, alpha: alpha * 0.4 });
          g.circle(dx + 4, dy - 2, 0.6 * d.size).fill({ color: 0x2a0606, alpha: alpha * 0.3 });
          break;
        case "rubble":
          for (let ri = 0; ri < 4; ri++) {
            const rx = dx + (ri - 1.5) * 2.5 * d.size;
            const ry = dy + ((ri * 7 + 3) % 5 - 2) * d.size;
            const rSize = (1 + (ri % 3) * 0.5) * d.size;
            g.roundRect(rx - rSize / 2, ry - rSize / 2, rSize, rSize, 0.5).fill({ color: 0x3a3a3a + ri * 0x080808, alpha });
          }
          break;
        case "cobweb":
          // Multi-spoke web with spiral
          for (let si = 0; si < 6; si++) {
            const sa = (si / 6) * Math.PI * 2 + d.rotation;
            g.moveTo(dx, dy).lineTo(dx + Math.cos(sa) * 5 * d.size, dy + Math.sin(sa) * 5 * d.size).stroke({ color: 0x888888, width: 0.3, alpha: alpha * 0.7 });
          }
          // Spiral rings
          for (let ri = 1; ri <= 2; ri++) {
            const rr = ri * 2.5 * d.size;
            g.circle(dx, dy, rr).stroke({ color: 0x777777, width: 0.2, alpha: alpha * 0.4 });
          }
          break;
      }
    }

    if (state.shiftFlash > 0) g.rect(ox, oy, mazeW, mazeH).fill({ color: 0x6644aa, alpha: state.shiftFlash * 0.2 });

    // ---- Floor-specific ambient FX ----
    if (state.floor === 1) {
      // Floor 2: dripping water droplets falling from ceiling
      for (let di = 0; di < 5; di++) {
        const dripPhase = (now / 2000 + di * 0.4) % 1;
        const dripX = ox + ((di * 7919 + 31) % mazeW);
        const dripY = oy + dripPhase * mazeH;
        const dripDist = Math.sqrt((dripX - (ox + state.px)) ** 2 + (dripY - (oy + state.py)) ** 2);
        if (dripDist < visionR) {
          const da = (1 - dripDist / visionR) * (1 - dripPhase) * 0.3;
          g.circle(dripX, dripY, 1).fill({ color: 0x4488cc, alpha: da });
          // Splash at bottom
          if (dripPhase > 0.9) {
            const splash = (dripPhase - 0.9) * 10;
            g.circle(dripX - 2, dripY + 1, splash * 2).stroke({ color: 0x4488cc, width: 0.3, alpha: da * (1 - splash) });
            g.circle(dripX + 2, dripY + 1, splash * 1.5).stroke({ color: 0x4488cc, width: 0.3, alpha: da * (1 - splash) * 0.5 });
          }
        }
      }
    } else if (state.floor >= 2) {
      // Floor 3: rising embers/ash from ground cracks
      for (let ei = 0; ei < 8; ei++) {
        const emberPhase = (now / 3000 + ei * 0.25) % 1;
        const ex = ox + ((ei * 4813 + 17) % mazeW);
        const ey = oy + mazeH - emberPhase * mazeH * 0.6;
        const eDist = Math.sqrt((ex - (ox + state.px)) ** 2 + (ey - (oy + state.py)) ** 2);
        if (eDist < visionR) {
          const ea = (1 - eDist / visionR) * (1 - emberPhase) * 0.15;
          const eWave = Math.sin(now / 200 + ei * 3) * 3;
          g.circle(ex + eWave, ey, 1 + emberPhase).fill({ color: ei % 2 === 0 ? 0xff6622 : 0xffaa44, alpha: ea });
        }
      }
    }

    // ---- Ambient dust (with warm tint) ----
    for (const d of state.ambientDust) {
      const dpx = ox + d.x, dpy = oy + d.y;
      const dist = Math.sqrt((dpx - (ox + state.px)) ** 2 + (dpy - (oy + state.py)) ** 2);
      if (dist > visionR) continue;
      const fade = d.life / d.maxLife;
      const warmness = 1 - dist / visionR;
      const dustCol = warmness > 0.5 ? DUST_COL : 0x999999;
      g.circle(dpx, dpy, d.size).fill({ color: dustCol, alpha: fade * 0.1 * warmness });
    }

    // ---- Footprints ----
    for (const fp of state.footprints) {
      const fpx = ox + fp.x, fpy = oy + fp.y;
      const dist = Math.sqrt((fpx - (ox + state.px)) ** 2 + (fpy - (oy + state.py)) ** 2);
      if (!fullReveal && dist > visionR) continue;
      const fade = fp.life / fp.maxLife;
      g.ellipse(fpx - 1, fpy, 1.5, 1).fill({ color: 0x443322, alpha: fade * 0.22 });
      g.ellipse(fpx + 1.5, fpy + 1.5, 1.5, 1).fill({ color: 0x443322, alpha: fade * 0.18 });
    }

    // ---- Hazards ----
    for (const hz of state.hazards) {
      const hp = cellToPixel(hz.col, hz.row);
      const hpx = ox + hp.x, hpy = oy + hp.y;
      const dist = Math.sqrt((hpx - (ox + state.px)) ** 2 + (hpy - (oy + state.py)) ** 2);
      if (!fullReveal && dist > visionR && !state.maze[hz.row]?.[hz.col]?.explored) continue;
      const alpha = (fullReveal || dist <= visionR) ? (fullReveal ? 0.5 : Math.max(0.1, 1 - dist / visionR)) : EXPLORED_ALPHA;
      const hcs = cs - 4;
      if (hz.type === "water") {
        g.roundRect(hpx - hcs / 2, hpy - hcs / 2, hcs, hcs, 5).fill({ color: 0x112244, alpha: alpha * 0.35 });
        // Multi-layer ripples
        for (let ri = 0; ri < 3; ri++) {
          const ripple = (now / 1200 + hz.col * 0.7 + ri * 0.6) % 2;
          const rippleR = 2 + ripple * 5;
          g.circle(hpx + (ri - 1) * 3, hpy, rippleR).stroke({ color: 0x3366aa, width: 0.4, alpha: alpha * 0.2 * (1 - ripple / 2) });
        }
        // Subtle highlight
        g.ellipse(hpx - 2, hpy - 2, 3, 1.5).fill({ color: 0x4488cc, alpha: alpha * 0.08 });
        // Torchlight reflection on water surface (warm shimmer when player is near)
        const waterWarmT = 1 - Math.min(1, dist / visionR);
        if (waterWarmT > 0.2) {
          const reflPulse = 0.3 + Math.sin(now / 400 + hz.col * 1.3) * 0.2;
          g.ellipse(hpx + Math.sin(now / 600) * 2, hpy - 1, hcs * 0.3, hcs * 0.12).fill({ color: SCONCE_COL, alpha: alpha * waterWarmT * reflPulse * 0.12 });
        }
      } else {
        // Darkness zone — tendrils radiating from center
        g.roundRect(hpx - hcs / 2, hpy - hcs / 2, hcs, hcs, 4).fill({ color: 0x000000, alpha: alpha * 0.5 });
        for (let ti = 0; ti < 5; ti++) {
          const ta = now / 2000 + ti * 1.26;
          const tx = Math.cos(ta) * 7, ty = Math.sin(ta) * 7;
          g.moveTo(hpx, hpy).bezierCurveTo(hpx + tx * 0.3, hpy + ty * 0.6, hpx + tx * 0.7, hpy + ty * 0.3, hpx + tx, hpy + ty).stroke({ color: 0x110022, width: 1.5, alpha: alpha * 0.3 });
        }
        // Central void
        g.circle(hpx, hpy, 3).fill({ color: 0x050010, alpha: alpha * 0.6 });
      }
    }

    // ---- Traps (active + triggered remains) ----
    for (const trap of state.traps) {
      // Render triggered trap remains
      if (trap.triggered && trap.visible) {
        const tp = cellToPixel(trap.col, trap.row);
        const tpx = ox + tp.x, tpy = oy + tp.y;
        const dist = Math.sqrt((tpx - (ox + state.px)) ** 2 + (tpy - (oy + state.py)) ** 2);
        if (fullReveal || dist <= visionR) {
          const ra = (fullReveal ? 0.3 : Math.max(0, 1 - dist / visionR)) * 0.2;
          switch (trap.type) {
            case "spike": // Broken plate with bent spikes
              g.circle(tpx, tpy, 5).fill({ color: 0x111111, alpha: ra });
              g.moveTo(tpx - 3, tpy).lineTo(tpx - 2, tpy - 3).stroke({ color: 0x555544, width: 0.8, alpha: ra });
              g.moveTo(tpx + 2, tpy + 1).lineTo(tpx + 4, tpy - 2).stroke({ color: 0x555544, width: 0.8, alpha: ra });
              break;
            case "alarm": // Spent rune — faded circle
              g.circle(tpx, tpy, 4).stroke({ color: 0x332222, width: 0.5, alpha: ra * 0.5 });
              break;
            case "web": // Torn strands
              g.moveTo(tpx - 4, tpy - 3).lineTo(tpx - 1, tpy + 1).stroke({ color: 0x555555, width: 0.3, alpha: ra });
              g.moveTo(tpx + 3, tpy - 2).lineTo(tpx + 1, tpy + 2).stroke({ color: 0x555555, width: 0.3, alpha: ra });
              break;
            case "crumble": // Rubble pile
              for (let ri = 0; ri < 4; ri++) {
                g.rect(tpx + (ri - 2) * 3, tpy + (ri % 2) * 3 - 2, 2.5, 2.5).fill({ color: 0x444433, alpha: ra });
              }
              break;
          }
        }
        continue;
      }
      if (!trap.visible) continue;
      const tp = cellToPixel(trap.col, trap.row);
      const tpx = ox + tp.x, tpy = oy + tp.y;
      const dist = Math.sqrt((tpx - (ox + state.px)) ** 2 + (tpy - (oy + state.py)) ** 2);
      if (!fullReveal && dist > visionR) continue;
      const alpha = fullReveal ? 0.6 : Math.max(0.1, 1 - dist / visionR);
      const def = TRAPS[trap.type];
      switch (trap.type) {
        case "spike":
          // Metal plate with spike tips
          g.circle(tpx, tpy, 6).fill({ color: 0x222222, alpha: alpha * 0.2 });
          for (let si = 0; si < 6; si++) {
            const sa = (si / 6) * Math.PI * 2 + 0.3;
            const sx = tpx + Math.cos(sa) * 4, sy = tpy + Math.sin(sa) * 4;
            g.moveTo(sx, sy).lineTo(sx + Math.cos(sa) * 2.5, sy + Math.sin(sa) * 2.5).stroke({ color: def.color, width: 1.5, alpha: alpha * 0.6 });
            g.circle(sx + Math.cos(sa) * 2.5, sy + Math.sin(sa) * 2.5, 0.5).fill({ color: 0xcccccc, alpha: alpha * 0.3 });
          }
          break;
        case "alarm":
          // Glowing rune circle
          g.circle(tpx, tpy, 5).stroke({ color: def.color, width: 0.8, alpha: alpha * 0.4 });
          const alarmPulse = 0.3 + Math.sin(now / 400) * 0.2;
          g.circle(tpx, tpy, 2.5).fill({ color: def.color, alpha: alpha * alarmPulse });
          g.circle(tpx, tpy, 7).stroke({ color: def.color, width: 0.3, alpha: alpha * alarmPulse * 0.3 });
          // Rune marks
          for (let ri = 0; ri < 4; ri++) {
            const ra = (ri / 4) * Math.PI * 2 + now / 3000;
            g.moveTo(tpx + Math.cos(ra) * 4, tpy + Math.sin(ra) * 4).lineTo(tpx + Math.cos(ra) * 6, tpy + Math.sin(ra) * 6).stroke({ color: def.color, width: 0.5, alpha: alpha * 0.25 });
          }
          break;
        case "web":
          // Fuller spider web with concentric rings
          for (let si = 0; si < 8; si++) {
            const sa = (si / 8) * Math.PI * 2;
            g.moveTo(tpx, tpy).lineTo(tpx + Math.cos(sa) * 7, tpy + Math.sin(sa) * 7).stroke({ color: def.color, width: 0.4, alpha: alpha * 0.35 });
          }
          g.circle(tpx, tpy, 3).stroke({ color: def.color, width: 0.25, alpha: alpha * 0.2 });
          g.circle(tpx, tpy, 5.5).stroke({ color: def.color, width: 0.25, alpha: alpha * 0.15 });
          break;
        case "crumble":
          g.rect(tpx - 7, tpy - 7, 14, 14).stroke({ color: def.color, width: 0.6, alpha: alpha * 0.3 });
          // Crack pattern
          g.moveTo(tpx - 4, tpy - 7).lineTo(tpx, tpy - 1).lineTo(tpx + 3, tpy - 5).stroke({ color: def.color, width: 0.6, alpha: alpha * 0.4 });
          g.moveTo(tpx, tpy - 1).lineTo(tpx - 2, tpy + 5).stroke({ color: def.color, width: 0.5, alpha: alpha * 0.35 });
          g.moveTo(tpx, tpy - 1).lineTo(tpx + 4, tpy + 4).stroke({ color: def.color, width: 0.4, alpha: alpha * 0.3 });
          if (trap.crumbleTimer > 0) {
            const shake = Math.sin(now / 40) * 2;
            g.rect(tpx - 7 + shake, tpy - 7, 14, 14).fill({ color: 0x886644, alpha: 0.2 });
          }
          break;
      }
    }

    // ---- Secret wall crack hints ----
    for (const sec of state.secrets) {
      if (sec.revealed) continue;
      const scx = ox + sec.col * cs, scy = oy + sec.row * cs;
      const dist = Math.sqrt((scx + cs / 2 - (ox + state.px)) ** 2 + (scy + cs / 2 - (oy + state.py)) ** 2);
      if (!fullReveal && dist > visionR) continue;
      const alpha = (fullReveal ? 0.3 : Math.max(0, 1 - dist / visionR)) * 0.2;
      if (alpha < 0.02) continue;
      // Draw a very subtle crack on the secret wall face
      let cx1: number, cy1: number, cx2: number, cy2: number;
      if (sec.dir === 0) { cx1 = scx + cs * 0.35; cy1 = scy; cx2 = scx + cs * 0.65; cy2 = scy + 1; }
      else if (sec.dir === 2) { cx1 = scx + cs * 0.3; cy1 = scy + cs; cx2 = scx + cs * 0.7; cy2 = scy + cs - 1; }
      else if (sec.dir === 3) { cx1 = scx; cy1 = scy + cs * 0.35; cx2 = scx + 1; cy2 = scy + cs * 0.65; }
      else { cx1 = scx + cs; cy1 = scy + cs * 0.3; cx2 = scx + cs - 1; cy2 = scy + cs * 0.7; }
      g.moveTo(cx1!, cy1!).lineTo((cx1! + cx2!) / 2 + 1, (cy1! + cy2!) / 2 + 1).lineTo(cx2!, cy2!).stroke({ color: 0x887766, width: 0.6, alpha });
    }

    // ---- Collected relic ghosts ----
    for (const relic of state.relics) {
      if (!relic.collected) continue;
      const rp = cellToPixel(relic.col, relic.row);
      const rpx = ox + rp.x, rpy = oy + rp.y;
      const dist = Math.sqrt((rpx - (ox + state.px)) ** 2 + (rpy - (oy + state.py)) ** 2);
      if (!fullReveal && dist > visionR) continue;
      const alpha = (fullReveal ? 0.15 : Math.max(0, 1 - dist / visionR)) * 0.1;
      // Faint diamond ghost outline
      g.moveTo(rpx, rpy - 5).lineTo(rpx + 4, rpy).lineTo(rpx, rpy + 5).lineTo(rpx - 4, rpy).closePath().stroke({ color: RELIC_COLOR, width: 0.5, alpha });
    }

    // ---- Caltrops ----
    for (const ct of state.caltrops) {
      const cpx = ox + ct.x, cpy = oy + ct.y;
      const dist = Math.sqrt((cpx - (ox + state.px)) ** 2 + (cpy - (oy + state.py)) ** 2);
      if (!fullReveal && dist > visionR) continue;
      g.star(cpx, cpy, 4, 4.5, 2, 0).fill({ color: 0xcc8844, alpha: 0.7 });
      g.star(cpx, cpy, 4, 4.5, 2, 0).stroke({ color: 0xaa6622, width: 0.5, alpha: 0.3 });
    }

    // ---- Decoys ----
    for (const decoy of state.decoys) {
      const dpx = ox + decoy.x, dpy = oy + decoy.y;
      const dist = Math.sqrt((dpx - (ox + state.px)) ** 2 + (dpy - (oy + state.py)) ** 2);
      if (!fullReveal && dist > visionR) continue;
      const pulse = 0.4 + Math.sin(now / 200) * 0.3;
      g.circle(dpx, dpy, 7).fill({ color: 0xcc66cc, alpha: pulse * 0.12 });
      g.circle(dpx, dpy, 3).fill({ color: 0xdd88dd, alpha: pulse * 0.6 });
      // Multiple expanding sound wave rings
      for (let wi = 0; wi < 2; wi++) {
        const ringPhase = (now / 600 + wi * 0.5) % 1;
        g.circle(dpx, dpy, 5 + ringPhase * 16).stroke({ color: 0xcc66cc, width: 0.6, alpha: (1 - ringPhase) * 0.25 });
      }
    }

    // ---- Items (type-specific shapes) ----
    for (const item of state.items) {
      if (item.collected) continue;
      const ip = cellToPixel(item.col, item.row);
      const ipx = ox + ip.x, ipy = oy + ip.y;
      const dist = Math.sqrt((ipx - (ox + state.px)) ** 2 + (ipy - (oy + state.py)) ** 2);
      if (!fullReveal && dist > visionR) continue;
      const ia = fullReveal ? 0.7 : Math.max(0.2, 1 - dist / visionR);
      const idef = ITEMS[item.type];
      const ipulse = 0.6 + Math.sin(now / 500 + item.col * 2.1) * 0.2;
      // Glow halo
      g.circle(ipx, ipy, 9).fill({ color: idef.color, alpha: ia * ipulse * 0.06 });
      g.circle(ipx, ipy, 6.5).stroke({ color: idef.color, width: 0.5, alpha: ia * 0.25 });
      // Type-specific silhouette
      switch (item.type) {
        case "torch": // Flame shape
          g.moveTo(ipx, ipy - 5).bezierCurveTo(ipx + 3, ipy - 2, ipx + 2, ipy + 2, ipx, ipy + 4).bezierCurveTo(ipx - 2, ipy + 2, ipx - 3, ipy - 2, ipx, ipy - 5).fill({ color: idef.color, alpha: ia * ipulse });
          break;
        case "speed": // Lightning bolt
          g.moveTo(ipx - 1, ipy - 5).lineTo(ipx + 2, ipy - 1).lineTo(ipx, ipy).lineTo(ipx + 3, ipy + 5).stroke({ color: idef.color, width: 1.5, alpha: ia * ipulse });
          break;
        case "caltrops": // Star/spike shape
          g.star(ipx, ipy, 4, 4, 2, 0).fill({ color: idef.color, alpha: ia * ipulse * 0.8 });
          break;
        case "reveal": // Scroll (rolled parchment)
          g.roundRect(ipx - 3, ipy - 4, 6, 8, 1).fill({ color: idef.color, alpha: ia * ipulse * 0.7 });
          g.circle(ipx, ipy - 4, 1.5).fill({ color: idef.color, alpha: ia * ipulse * 0.9 });
          g.circle(ipx, ipy + 4, 1.5).fill({ color: idef.color, alpha: ia * ipulse * 0.9 });
          break;
        case "invis": // Ghost/cloak shape
          g.moveTo(ipx, ipy - 5).bezierCurveTo(ipx + 4, ipy - 3, ipx + 3, ipy + 2, ipx + 3, ipy + 5).lineTo(ipx + 1, ipy + 3).lineTo(ipx, ipy + 5).lineTo(ipx - 1, ipy + 3).lineTo(ipx - 3, ipy + 5).bezierCurveTo(ipx - 3, ipy + 2, ipx - 4, ipy - 3, ipx, ipy - 5).fill({ color: idef.color, alpha: ia * ipulse * 0.6 });
          break;
        case "shield": // Shield shape
          g.moveTo(ipx, ipy - 5).lineTo(ipx + 4, ipy - 2).lineTo(ipx + 3, ipy + 3).lineTo(ipx, ipy + 5).lineTo(ipx - 3, ipy + 3).lineTo(ipx - 4, ipy - 2).closePath().fill({ color: idef.color, alpha: ia * ipulse * 0.7 });
          g.moveTo(ipx, ipy - 3).lineTo(ipx, ipy + 2).stroke({ color: 0xffffff, width: 0.5, alpha: ia * 0.2 });
          break;
        case "compass": // Diamond with arrow
          g.moveTo(ipx, ipy - 5).lineTo(ipx + 3, ipy).lineTo(ipx, ipy + 5).lineTo(ipx - 3, ipy).closePath().fill({ color: idef.color, alpha: ia * ipulse * 0.7 });
          g.moveTo(ipx, ipy - 3).lineTo(ipx + 1, ipy - 1).lineTo(ipx - 1, ipy - 1).closePath().fill({ color: 0xff4444, alpha: ia * 0.5 });
          break;
        case "decoy": // Gem shape
          g.moveTo(ipx - 3, ipy - 2).lineTo(ipx, ipy - 5).lineTo(ipx + 3, ipy - 2).lineTo(ipx + 2, ipy + 4).lineTo(ipx - 2, ipy + 4).closePath().fill({ color: idef.color, alpha: ia * ipulse * 0.7 });
          break;
        default:
          g.circle(ipx, ipy, 4).fill({ color: idef.color, alpha: ia * ipulse * 0.9 });
      }
      // Sparkle highlight
      const sparkleA = now / 700 + item.row;
      g.circle(ipx + Math.cos(sparkleA) * 3.5, ipy + Math.sin(sparkleA) * 3.5, 0.8).fill({ color: 0xffffff, alpha: ia * ipulse * 0.4 });
    }

    // ---- Relics (with glow column + sparkle ring) ----
    for (const relic of state.relics) {
      if (relic.collected) continue;
      const rp = cellToPixel(relic.col, relic.row);
      const rpx = ox + rp.x, rpy = oy + rp.y;
      const dist = Math.sqrt((rpx - (ox + state.px)) ** 2 + (rpy - (oy + state.py)) ** 2);
      if (!fullReveal && dist > visionR) continue;
      const alpha = fullReveal ? 0.8 : Math.max(0.3, 1 - dist / visionR);
      const glow = 0.6 + Math.sin(relic.glow) * 0.3;
      // Vertical light column
      g.rect(rpx - 2, rpy - cs * 0.5, 4, cs).fill({ color: RELIC_COLOR, alpha: alpha * glow * 0.04 });
      g.rect(rpx - 0.5, rpy - cs * 0.4, 1, cs * 0.8).fill({ color: RELIC_COLOR, alpha: alpha * glow * 0.08 });
      // Multi-layer glow
      g.circle(rpx, rpy, 16).fill({ color: RELIC_COLOR, alpha: alpha * glow * 0.04 });
      g.circle(rpx, rpy, 10).fill({ color: RELIC_COLOR, alpha: alpha * glow * 0.1 });
      // Diamond body with inner facets
      g.moveTo(rpx, rpy - 7).lineTo(rpx + 5.5, rpy).lineTo(rpx, rpy + 7).lineTo(rpx - 5.5, rpy).closePath().fill({ color: RELIC_COLOR, alpha: alpha * glow });
      g.moveTo(rpx, rpy - 7).lineTo(rpx + 5.5, rpy).lineTo(rpx, rpy + 7).lineTo(rpx - 5.5, rpy).closePath().stroke({ color: 0xffee88, width: 1.5, alpha: alpha * 0.7 });
      // Inner facet lines
      g.moveTo(rpx - 3, rpy - 2).lineTo(rpx, rpy + 3).lineTo(rpx + 3, rpy - 2).stroke({ color: 0xffeeaa, width: 0.5, alpha: alpha * glow * 0.3 });
      // Sparkle highlight
      g.circle(rpx - 1.5, rpy - 2.5, 1.2).fill({ color: 0xffffff, alpha: alpha * glow * 0.6 });
      // Rotating sparkle ring
      for (let si = 0; si < 4; si++) {
        const sa = now / 1200 + si * Math.PI / 2;
        const sx = rpx + Math.cos(sa) * 9, sy = rpy + Math.sin(sa) * 9;
        g.circle(sx, sy, 0.8).fill({ color: 0xffffff, alpha: alpha * glow * 0.3 });
      }
    }

    // ---- Exit ----
    {
      const ep = cellToPixel(state.exitCol, state.exitRow);
      const epx = ox + ep.x, epy = oy + ep.y;
      const dist = Math.sqrt((epx - (ox + state.px)) ** 2 + (epy - (oy + state.py)) ** 2);
      if (fullReveal || dist <= visionR || state.maze[state.exitRow]?.[state.exitCol]?.explored) {
        const alpha = (fullReveal || dist <= visionR) ? (fullReveal ? 0.8 : Math.max(0.2, 1 - dist / visionR)) : EXPLORED_ALPHA;
        if (state.exitOpen) {
          const pulse = 0.6 + Math.sin(now / 250) * 0.3;
          // Vertical beam
          g.rect(epx - 1.5, epy - cs, 3, cs * 2).fill({ color: EXIT_COLOR, alpha: alpha * pulse * 0.05 });
          g.circle(epx, epy, 16).fill({ color: EXIT_COLOR, alpha: alpha * pulse * 0.06 });
          g.circle(epx, epy, 10).fill({ color: EXIT_COLOR, alpha: alpha * pulse * 0.15 });
          g.circle(epx, epy, 6).fill({ color: EXIT_COLOR, alpha: alpha * pulse * 0.8 });
          g.circle(epx, epy, 10).stroke({ color: EXIT_COLOR, width: 1.5, alpha: alpha * 0.6 });
          for (let si = 0; si < 6; si++) {
            const sa = now / 600 + si * Math.PI / 3;
            g.circle(epx + Math.cos(sa) * 9, epy + Math.sin(sa) * 9, 1.2).fill({ color: EXIT_COLOR, alpha: alpha * 0.35 });
          }
        } else {
          g.circle(epx, epy, 7).fill({ color: 0x222222, alpha: alpha * 0.5 });
          g.circle(epx, epy, 7).stroke({ color: 0x444444, width: 1, alpha: alpha * 0.3 });
          // Lock
          g.rect(epx - 3, epy, 6, 5).fill({ color: 0x555555, alpha: alpha * 0.5 });
          g.moveTo(epx - 2, epy).bezierCurveTo(epx - 2, epy - 5, epx + 2, epy - 5, epx + 2, epy).stroke({ color: 0x666666, width: 1.2, alpha: alpha * 0.5 });
          g.circle(epx, epy + 2, 1).fill({ color: 0x333333, alpha: alpha * 0.4 });
        }
      }
    }

    // ---- Shadow minotaur ----
    if (state.shadow) {
      const s = state.shadow;
      const spx = ox + s.x, spy = oy + s.y;
      const dist = Math.sqrt((spx - (ox + state.px)) ** 2 + (spy - (oy + state.py)) ** 2);
      if (fullReveal || dist <= visionR) {
        const baseA = fullReveal ? 0.6 : Math.max(0, 1 - dist / visionR);
        const alpha = baseA * (0.45 + Math.sin(now / 300) * 0.15);
        // Floor shadow
        g.ellipse(spx, spy + LabyrinthConfig.SHADOW_SIZE + 1, LabyrinthConfig.SHADOW_SIZE * 0.7, LabyrinthConfig.SHADOW_SIZE * 0.25).fill({ color: 0x000000, alpha: alpha * 0.12 });
        // Ghostly aura
        g.circle(spx, spy, LabyrinthConfig.SHADOW_SIZE + 4).fill({ color: SHADOW_COLOR, alpha: alpha * 0.05 });
        // Body
        g.circle(spx, spy, LabyrinthConfig.SHADOW_SIZE).fill({ color: SHADOW_COLOR, alpha: alpha * 0.75 });
        // Ghostly trail (longer)
        for (let gi = 1; gi <= 3; gi++) {
          g.circle(spx - Math.cos(s.angle) * gi * 5, spy - Math.sin(s.angle) * gi * 5, LabyrinthConfig.SHADOW_SIZE - gi * 0.8).fill({ color: SHADOW_COLOR, alpha: alpha * 0.08 * (4 - gi) });
        }
        // Glowing eyes
        g.circle(spx - 2, spy - 1, 1.5).fill({ color: 0xdd99ff, alpha: alpha * 1.2 });
        g.circle(spx + 2, spy - 1, 1.5).fill({ color: 0xdd99ff, alpha: alpha * 1.2 });
        g.circle(spx - 2, spy - 1, 2.5).fill({ color: 0xcc88ff, alpha: alpha * 0.15 });
        g.circle(spx + 2, spy - 1, 2.5).fill({ color: 0xcc88ff, alpha: alpha * 0.15 });
        // Horns
        g.moveTo(spx - 3, spy - 3).bezierCurveTo(spx - 4, spy - 6, spx - 6, spy - 8, spx - 5, spy - 6).stroke({ color: 0x8866aa, width: 1.5, alpha: alpha * 0.6 });
        g.moveTo(spx + 3, spy - 3).bezierCurveTo(spx + 4, spy - 6, spx + 6, spy - 8, spx + 5, spy - 6).stroke({ color: 0x8866aa, width: 1.5, alpha: alpha * 0.6 });
        if (s.stunTimer > 0) {
          for (let si = 0; si < 2; si++) {
            const sa = now / 400 + si * 3;
            g.star(spx + Math.cos(sa) * 9, spy - 8 + Math.sin(sa) * 3, 4, 2.5, 1.2, 0).fill({ color: 0xcc88ff, alpha: alpha * 0.5 });
          }
        }
      }
    }

    // ---- Main minotaur ----
    {
      const mpx = ox + state.mx, mpy = oy + state.my;
      const dist = Math.sqrt((mpx - (ox + state.px)) ** 2 + (mpy - (oy + state.py)) ** 2);
      if (fullReveal || dist <= visionR) {
        const alpha = fullReveal ? 0.8 : Math.max(0, 1 - dist / visionR);
        const stunned = state.minoStunTimer > 0;
        const charging = state.minoCharging;
        const enraged = state.minoState === "enrage" && !stunned;
        const sleeping = state.minoState === "sleep" && !stunned;
        const bodyCol = stunned ? 0x888844 : enraged ? 0xff3333 : charging ? 0xee2222 : MINO_COLOR;
        const ma = state.minoAngle;
        // Breathing animation (body size pulses)
        const breathe = 1 + Math.sin(now / (sleeping ? 1200 : 600)) * (sleeping ? 0.06 : 0.03);
        const ms = LabyrinthConfig.MINO_SIZE * breathe;

        // Floor shadow
        g.ellipse(mpx + 1, mpy + ms + 1, ms * 0.9, ms * 0.3).fill({ color: 0x000000, alpha: alpha * 0.2 });

        // Charge trail
        if (charging) {
          for (let ci = 1; ci <= 4; ci++) {
            g.circle(mpx - Math.cos(ma) * ci * 5.5, mpy - Math.sin(ma) * ci * 5.5, ms - ci * 1.2).fill({ color: 0xff4444, alpha: alpha * 0.08 * (5 - ci) });
          }
        }
        // Enrage flame aura
        if (enraged) {
          for (let fi = 0; fi < 6; fi++) {
            const fa = now / 120 + fi * 1.05;
            const fr = ms + 3 + Math.sin(now / 80 + fi) * 1.5;
            const fx = mpx + Math.cos(fa) * fr, fy = mpy + Math.sin(fa) * fr;
            g.circle(fx, fy, 2.2).fill({ color: 0xff4400, alpha: alpha * 0.35 });
            g.circle(fx, fy, 1).fill({ color: 0xffaa00, alpha: alpha * 0.25 });
          }
          g.circle(mpx, mpy, ms + 3).stroke({ color: 0xff4400, width: 1.2, alpha: alpha * 0.25 + Math.sin(now / 100) * 0.1 });
        }

        // Body (muscular shape — slightly elongated in facing direction)
        const bx = Math.cos(ma) * 1.5, by = Math.sin(ma) * 1.5;
        g.ellipse(mpx + bx, mpy + by, ms * 1.1, ms * 0.9).fill({ color: bodyCol, alpha: alpha * 0.9 });
        // Darker belly/chest
        g.ellipse(mpx - bx * 0.5, mpy + 2, ms * 0.55, ms * 0.4).fill({ color: 0x551111, alpha: alpha * 0.35 });
        // Muscular shoulder highlights
        g.ellipse(mpx - 2 + bx, mpy - 3, ms * 0.3, ms * 0.25).fill({ color: 0xdd4444, alpha: alpha * 0.1 });
        g.ellipse(mpx + 2 + bx, mpy - 3, ms * 0.3, ms * 0.25).fill({ color: 0xdd4444, alpha: alpha * 0.1 });

        // Horns (curved, thicker at base)
        g.moveTo(mpx - 5, mpy - 4).bezierCurveTo(mpx - 8, mpy - 11, mpx - 11, mpy - 13, mpx - 10, mpy - 9).stroke({ color: 0xccaa66, width: 3, alpha: alpha * 0.85 });
        g.moveTo(mpx - 5, mpy - 4).bezierCurveTo(mpx - 8, mpy - 11, mpx - 11, mpy - 13, mpx - 10, mpy - 9).stroke({ color: 0xeedd88, width: 1, alpha: alpha * 0.15 });
        g.moveTo(mpx + 5, mpy - 4).bezierCurveTo(mpx + 8, mpy - 11, mpx + 11, mpy - 13, mpx + 10, mpy - 9).stroke({ color: 0xccaa66, width: 3, alpha: alpha * 0.85 });
        g.moveTo(mpx + 5, mpy - 4).bezierCurveTo(mpx + 8, mpy - 11, mpx + 11, mpy - 13, mpx + 10, mpy - 9).stroke({ color: 0xeedd88, width: 1, alpha: alpha * 0.15 });

        // Eyes (with glow)
        const eyeCol = stunned ? 0x666600 : enraged ? 0xff0000 : state.minoAlerted ? 0xff2222 : 0xff8844;
        const eyeSize = charging || enraged ? 2.8 : sleeping ? 1 : 2;
        g.circle(mpx - 3, mpy - 2, eyeSize).fill({ color: eyeCol, alpha: alpha });
        g.circle(mpx + 3, mpy - 2, eyeSize).fill({ color: eyeCol, alpha: alpha });
        if ((state.minoAlerted || enraged) && !stunned) {
          g.circle(mpx - 3, mpy - 2, eyeSize + 1.5).fill({ color: eyeCol, alpha: alpha * 0.12 });
          g.circle(mpx + 3, mpy - 2, eyeSize + 1.5).fill({ color: eyeCol, alpha: alpha * 0.12 });
        }
        // Snout with nostrils
        g.ellipse(mpx, mpy + 3, 4, 2.8).fill({ color: 0x882222, alpha: alpha * 0.55 });
        g.circle(mpx - 1.5, mpy + 3, 0.9).fill({ color: 0x441111, alpha: alpha * 0.5 });
        g.circle(mpx + 1.5, mpy + 3, 0.9).fill({ color: 0x441111, alpha: alpha * 0.5 });
        // Snout highlight
        g.ellipse(mpx, mpy + 2, 2, 1).fill({ color: 0xcc4444, alpha: alpha * 0.08 });

        // State indicators
        if (stunned) {
          for (let si = 0; si < 3; si++) {
            const sa = now / 400 + si * 2.1;
            g.star(mpx + Math.cos(sa) * 13, mpy - 13 + Math.sin(sa) * 4, 4, 3, 1.5, 0).fill({ color: 0xffff44, alpha: alpha * 0.6 });
          }
        }
        if (sleeping) {
          const zt = now / 800;
          for (let zi = 0; zi < 3; zi++) {
            const zphase = (zt + zi * 0.5) % 2;
            const za = Math.max(0, 1 - zphase);
            addText("z", mpx + 9 + zi * 4, mpy - 10 - zphase * 8, { fontSize: 10 + zi * 3, fill: 0x8888aa, fontStyle: "italic", alpha: za * alpha } as any);
          }
        }
      }
    }

    // ---- Player character (detailed) ----
    {
      const ppx = ox + state.px, ppy = oy + state.py;
      const glowR = visionR * 0.4;
      const lowTorch = torchPct < 0.25 && torchPct > 0;
      const flickerMod = lowTorch ? (Math.sin(now / 60) * 0.4 + Math.sin(now / 37) * 0.3 + 0.3) : 1;

      // Torchlight glow rings (theme-tinted)
      g.circle(ppx, ppy, glowR).fill({ color: SCONCE_COL, alpha: 0.025 * torchPct * flickerMod });
      g.circle(ppx, ppy, glowR * 0.6).fill({ color: _lerpColor(SCONCE_COL, 0xffffff, 0.2), alpha: 0.04 * torchPct * flickerMod });
      g.circle(ppx, ppy, glowR * 0.3).fill({ color: _lerpColor(SCONCE_COL, 0xffffff, 0.4), alpha: 0.05 * torchPct * flickerMod });

      // Torch flame (right hand)
      if (torchPct > 0.02) {
        const flicker = Math.sin(now / 80) * 2 + Math.sin(now / 130) * 1.5;
        const fAlpha = lowTorch ? flickerMod * 0.8 : 1;
        // Torch handle
        g.moveTo(ppx + 3, ppy - 2).lineTo(ppx + 5, ppy - 7).stroke({ color: 0x6a4a2a, width: 1.5, alpha: fAlpha * 0.7 });
        // Flame layers (theme-tinted)
        g.circle(ppx + 5, ppy - 8 + flicker, 3 * (lowTorch ? flickerMod : 1)).fill({ color: _lerpColor(SCONCE_COL, 0xff2200, 0.3), alpha: 0.45 * torchPct * fAlpha });
        g.circle(ppx + 5, ppy - 9 + flicker, 2).fill({ color: SCONCE_COL, alpha: 0.6 * torchPct * fAlpha });
        g.circle(ppx + 5, ppy - 10 + flicker, 1.2).fill({ color: _lerpColor(SCONCE_COL, 0xffffff, 0.5), alpha: 0.5 * torchPct * fAlpha });
      }

      // Torch smoke wisps (thin gray particles drifting up)
      if (torchPct > 0.02) {
        for (let si = 0; si < 3; si++) {
          const smokeT = (now / 800 + si * 0.33) % 1;
          const smokeX = ppx + 5 + Math.sin(now / 200 + si * 2) * 2;
          const smokeY = ppy - 10 - smokeT * 12;
          const smokeA = (1 - smokeT) * 0.06 * torchPct;
          g.circle(smokeX, smokeY, 1.5 + smokeT * 2).fill({ color: 0x888888, alpha: smokeA });
        }
      }

      const playerAlpha = state.invulnTimer > 0 ? 0.3 + Math.sin(now / 50) * 0.3 : state.invisTimer > 0 ? 0.25 + Math.sin(now / 200) * 0.1 : 1;
      // Shadow
      g.ellipse(ppx, ppy + 6, 6, 2.5).fill({ color: 0x000000, alpha: playerAlpha * 0.2 });

      // Cape (flutters behind movement)
      const moving = state.moveUp || state.moveDown || state.moveLeft || state.moveRight;
      if (moving) {
        const capeDir = state.moveRight ? -1 : state.moveLeft ? 1 : 0;
        const capeDirY = state.moveDown ? -1 : state.moveUp ? 1 : 0;
        const capeWave = Math.sin(now / 150) * 1.5;
        g.moveTo(ppx - 2, ppy - 1).bezierCurveTo(ppx + capeDir * 4 + capeWave, ppy + capeDirY * 3 + 4, ppx + capeDir * 6 + capeWave, ppy + capeDirY * 5 + 6, ppx + capeDir * 3, ppy + capeDirY * 4 + 8).stroke({ color: 0x3344aa, width: 3, alpha: playerAlpha * 0.4 });
        g.moveTo(ppx + 2, ppy - 1).bezierCurveTo(ppx + capeDir * 3 + capeWave, ppy + capeDirY * 3 + 5, ppx + capeDir * 5 + capeWave, ppy + capeDirY * 5 + 7, ppx + capeDir * 2, ppy + capeDirY * 4 + 9).stroke({ color: 0x2233aa, width: 2, alpha: playerAlpha * 0.25 });
      }

      // Body armor
      g.circle(ppx, ppy, LabyrinthConfig.PLAYER_RADIUS + 0.5).fill({ color: 0x4466aa, alpha: playerAlpha * 0.3 });
      g.circle(ppx, ppy, LabyrinthConfig.PLAYER_RADIUS).fill({ color: PLAYER_COLOR, alpha: playerAlpha * 0.9 });
      // Helmet visor line
      g.moveTo(ppx - 3, ppy - 1).lineTo(ppx + 3, ppy - 1).stroke({ color: 0x335577, width: 1, alpha: playerAlpha * 0.4 });
      // Helmet crest
      g.moveTo(ppx, ppy - 5).lineTo(ppx, ppy - 3).stroke({ color: 0xaaddff, width: 1.5, alpha: playerAlpha * 0.3 });
      // Shield shape on body
      g.moveTo(ppx, ppy - 4).lineTo(ppx + 3.5, ppy - 0.5).lineTo(ppx + 2.5, ppy + 3.5).lineTo(ppx, ppy + 5.5).lineTo(ppx - 2.5, ppy + 3.5).lineTo(ppx - 3.5, ppy - 0.5).closePath().stroke({ color: 0xaaddff, width: 1, alpha: playerAlpha * 0.4 });
      // Shield emblem (small cross)
      g.moveTo(ppx, ppy).lineTo(ppx, ppy + 2.5).stroke({ color: 0xaaddff, width: 0.5, alpha: playerAlpha * 0.2 });
      g.moveTo(ppx - 1.5, ppy + 1).lineTo(ppx + 1.5, ppy + 1).stroke({ color: 0xaaddff, width: 0.5, alpha: playerAlpha * 0.2 });

      // Aegis shield shimmer
      if (state.shieldActive) {
        const shimmer = 0.3 + Math.sin(now / 400) * 0.15;
        g.circle(ppx, ppy, LabyrinthConfig.PLAYER_RADIUS + 4).stroke({ color: 0x44aaff, width: 1.5, alpha: shimmer });
        g.circle(ppx, ppy, LabyrinthConfig.PLAYER_RADIUS + 6).stroke({ color: 0x44aaff, width: 0.5, alpha: shimmer * 0.25 });
      }
      // Web overlay
      if (state.webTimer > 0) {
        g.circle(ppx, ppy, 8).stroke({ color: 0xcccccc, width: 0.6, alpha: 0.4 });
        g.moveTo(ppx - 6, ppy - 6).lineTo(ppx + 6, ppy + 6).stroke({ color: 0xcccccc, width: 0.3, alpha: 0.3 });
        g.moveTo(ppx + 6, ppy - 6).lineTo(ppx - 6, ppy + 6).stroke({ color: 0xcccccc, width: 0.3, alpha: 0.3 });
      }
      // Sprint trail
      if (state.sprinting && moving) {
        for (let si = 1; si <= 4; si++) {
          const trail = si * 3;
          const tdx = state.moveRight ? -1 : state.moveLeft ? 1 : 0;
          const tdy = state.moveDown ? -1 : state.moveUp ? 1 : 0;
          g.circle(ppx + tdx * trail, ppy + tdy * trail, LabyrinthConfig.PLAYER_RADIUS - si * 0.8).fill({ color: 0xffaa44, alpha: 0.1 / si });
        }
      } else if (state.speedTimer > 0 && moving) {
        for (let si = 1; si <= 3; si++) {
          const trail = si * 4;
          const tdx = state.moveRight ? -1 : state.moveLeft ? 1 : 0;
          const tdy = state.moveDown ? -1 : state.moveUp ? 1 : 0;
          g.circle(ppx + tdx * trail, ppy + tdy * trail, LabyrinthConfig.PLAYER_RADIUS - si).fill({ color: 0x44ccff, alpha: 0.15 / si });
        }
      }
    }

    // ---- Torch light rays (behind particles, ground layer) ----
    if (!fullReveal && torchPct > 0.1) {
      const ppx = ox + state.px, ppy = oy + state.py;
      const rayCount = 8;
      for (let ri = 0; ri < rayCount; ri++) {
        const rayA = (ri / rayCount) * Math.PI * 2 + Math.sin(now / 2000) * 0.3;
        const rayLen = visionR * (0.6 + Math.sin(now / 600 + ri * 1.7) * 0.15);
        const rayEndX = ppx + Math.cos(rayA) * rayLen;
        const rayEndY = ppy + Math.sin(rayA) * rayLen;
        g.moveTo(ppx, ppy).lineTo(rayEndX, rayEndY).stroke({ color: SCONCE_COL, width: 2 + Math.sin(now / 400 + ri) * 1, alpha: 0.015 * torchPct });
      }
    }

    // ---- Particles (with subtle glow on bright ones) ----
    for (const p of state.particles) {
      const lr = p.life / p.maxLife;
      const px2 = ox + p.x, py2 = oy + p.y;
      if (p.size > 2) g.circle(px2, py2, p.size * lr * 1.8).fill({ color: p.color, alpha: lr * 0.08 });
      g.circle(px2, py2, p.size * lr).fill({ color: p.color, alpha: lr * 0.7 });
    }

    // ---- Score popups (floating text rising upward) ----
    for (const sp of state.scorePopups) {
      const spLife = sp.life / sp.maxLife;
      const spx = ox + sp.x, spy = oy + sp.y - (1 - spLife) * 30;
      const t = new Text({ text: sp.text, style: new TextStyle({ fontFamily: FONT, fontSize: 16 + spLife * 6, fill: sp.color, fontWeight: "bold" }) });
      t.alpha = spLife; t.anchor.set(0.5, 0.5);
      t.position.set(spx, spy);
      this._ui.addChild(t);
    }

    // ---- Fog vignette (softer multi-layer) ----
    if (!fullReveal) {
      const ppx = ox + state.px, ppy = oy + state.py;
      for (let fi = 0; fi < 8; fi++) {
        const fogR = visionR + fi * 10;
        const fogAlpha = 0.08 + fi * 0.06;
        const topH = Math.max(0, ppy - fogR - oy);
        if (topH > 0) g.rect(ox, oy, mazeW, topH).fill({ color: FOG_COLOR, alpha: fogAlpha });
        const botY = ppy + fogR;
        if (botY < oy + mazeH) g.rect(ox, botY, mazeW, oy + mazeH - botY).fill({ color: FOG_COLOR, alpha: fogAlpha });
        const leftW = Math.max(0, ppx - fogR - ox);
        if (leftW > 0) g.rect(ox, oy, leftW, mazeH).fill({ color: FOG_COLOR, alpha: fogAlpha });
        const rightX = ppx + fogR;
        if (rightX < ox + mazeW) g.rect(rightX, oy, ox + mazeW - rightX, mazeH).fill({ color: FOG_COLOR, alpha: fogAlpha });
      }
    }

    // ---- Low-torch desaturation overlay ----
    if (torchPct < 0.15 && torchPct > 0) {
      const desatAmt = (0.15 - torchPct) / 0.15;
      g.rect(ox, oy, mazeW, mazeH).fill({ color: 0x0a0a10, alpha: desatAmt * 0.3 });
    } else if (torchPct <= 0) {
      // Total darkness overlay
      const darkPulse = 0.5 + Math.sin(now / 500) * 0.1;
      g.rect(ox, oy, mazeW, mazeH).fill({ color: 0x020208, alpha: darkPulse });
    }

    // ---- Heartbeat + roar vignette (theme-tinted) ----
    const hbColor = state.floor === 1 ? 0x003300 : state.floor >= 2 ? 0x440800 : 0x440000;
    const roarColor = state.floor === 1 ? 0x004400 : state.floor >= 2 ? 0x660800 : 0x660000;
    if (state.heartbeat > 0) {
      const hbPulse = Math.sin(now / (180 - state.heartbeat * 80)) * 0.5 + 0.5;
      g.rect(ox, oy, mazeW, mazeH).fill({ color: hbColor, alpha: state.heartbeat * hbPulse * 0.18 });
    }
    if (state.minoRoarFlash > 0) g.rect(ox, oy, mazeW, mazeH).fill({ color: roarColor, alpha: state.minoRoarFlash * 0.1 });

    // ---- Compass arrow ----
    if (state.compassTimer > 0) {
      let nearestDist = Infinity, nearestAngle = 0;
      for (const relic of state.relics) {
        if (relic.collected) continue;
        const rp = cellToPixel(relic.col, relic.row);
        const dx = rp.x - state.px, dy = rp.y - state.py;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearestDist) { nearestDist = d; nearestAngle = Math.atan2(dy, dx); }
      }
      if (nearestDist < Infinity) {
        const cpx = ox + state.px + Math.cos(nearestAngle) * 22;
        const cpy = oy + state.py + Math.sin(nearestAngle) * 22;
        const pulse = 0.6 + Math.sin(now / 300) * 0.3;
        g.moveTo(cpx + Math.cos(nearestAngle) * 7, cpy + Math.sin(nearestAngle) * 7)
          .lineTo(cpx + Math.cos(nearestAngle + 2.5) * 4.5, cpy + Math.sin(nearestAngle + 2.5) * 4.5)
          .lineTo(cpx + Math.cos(nearestAngle - 2.5) * 4.5, cpy + Math.sin(nearestAngle - 2.5) * 4.5)
          .closePath().fill({ color: RELIC_COLOR, alpha: pulse * 0.7 });
      }
    }

    // ---- Danger direction ----
    if (state.heartbeat > 0.2) {
      const ppx = ox + state.px, ppy = oy + state.py;
      const ix = ppx + Math.cos(state.dangerDir) * 25;
      const iy = ppy + Math.sin(state.dangerDir) * 25;
      const da = (state.heartbeat - 0.2) * 0.6;
      const pulse = Math.sin(now / (200 - state.heartbeat * 100)) * 0.3 + 0.5;
      g.circle(ix, iy, 3.5).fill({ color: 0xff3333, alpha: da * pulse });
      g.circle(ix, iy, 5).stroke({ color: 0xff3333, width: 0.5, alpha: da * pulse * 0.3 });
    }

    // ---- Relic proximity hum ----
    if (state.relicHumStrength > 0 && state.compassTimer <= 0) {
      const ppx = ox + state.px, ppy = oy + state.py;
      const humPulse = Math.sin(now / (300 - state.relicHumStrength * 150)) * 0.3 + 0.5;
      const humR = 15 + (1 - state.relicHumStrength) * 10;
      g.circle(ppx, ppy, humR).stroke({ color: RELIC_COLOR, width: 1, alpha: state.relicHumStrength * humPulse * 0.3 });
      const hx = ppx + Math.cos(state.relicHumDir) * humR;
      const hy = ppy + Math.sin(state.relicHumDir) * humR;
      g.circle(hx, hy, 2.5).fill({ color: RELIC_COLOR, alpha: state.relicHumStrength * humPulse * 0.5 });
    }

    // ---- Inscription display (with background panel) ----
    if (state.activeInscription && state.inscriptionTimer > 0) {
      const insAlpha = Math.min(1, state.inscriptionTimer / 1.5);
      const insY = oy + mazeH + 18;
      // Background panel
      const insW = Math.min(320, sw - 40);
      g.roundRect(sw / 2 - insW / 2, insY - 2, insW, 22, 4).fill({ color: 0x0a0810, alpha: insAlpha * 0.7 });
      g.roundRect(sw / 2 - insW / 2, insY - 2, insW, 22, 4).stroke({ color: 0x443322, width: 0.5, alpha: insAlpha * 0.3 });
      const t = new Text({ text: `"${state.activeInscription}"`, style: new TextStyle({ fontFamily: FONT, fontSize: 16, fill: 0xaa9977, fontStyle: "italic", align: "center", wordWrap: true, wordWrapWidth: insW - 16 }) });
      t.alpha = insAlpha; t.anchor.set(0.5, 0);
      t.position.set(sw / 2, insY + 2);
      this._ui.addChild(t);
    }

    // ======== HUD ========
    const hudH = 48;
    g.rect(0, 0, sw, hudH).fill({ color: 0x0a0610, alpha: 0.92 });
    g.moveTo(0, hudH).lineTo(sw, hudH).stroke({ color: 0x443366, width: 1, alpha: 0.4 });

    const fc = FLOORS[Math.min(state.floor, FLOORS.length - 1)];
    const hudDiff = DIFFICULTIES.find(d => d.id === state.difficulty) ?? DIFFICULTIES[1];
    addText(`\u{1F3DB}\uFE0F LABYRINTH`, 12, 4, { fontSize: 21, fill: 0x9977cc, fontWeight: "bold", letterSpacing: 2 });
    addText(`Floor ${state.floor + 1}/${state.totalFloors}: ${fc.name}`, 12, 22, { fontSize: 11, fill: 0x667766 });
    addText(hudDiff.name, 12, 32, { fontSize: 10, fill: hudDiff.color });

    const stateColors: Record<string, number> = { sleep: 0x4466aa, patrol: 0x888866, hunt: 0xff8844, enrage: 0xff2222 };
    const stateLabels: Record<string, string> = { sleep: "Zzz", patrol: "Prowling", hunt: "HUNTING", enrage: "ENRAGED" };
    addText(`Mino: ${stateLabels[state.minoState] ?? "?"}`, 12, 40, { fontSize: 10, fill: stateColors[state.minoState] ?? 0x888888 });

    const relicStr = "\u25C6".repeat(state.relicsCollected) + "\u25C7".repeat(fc.relicCount - state.relicsCollected);
    addText(`Relics ${relicStr}`, 170, 4, { fontSize: 19, fill: RELIC_COLOR });

    // Torch bar
    addText("Torch", 170, 22, { fontSize: 13, fill: 0x997744 });
    const barX = 206, barY = 24, barW = 55, barH = 7;
    g.rect(barX, barY, barW, barH).fill({ color: 0x222222 });
    const torchW = barW * torchPct;
    const torchCol = torchPct > 0.5 ? 0xffaa44 : torchPct > 0.2 ? 0xcc6622 : torchPct > 0 ? 0xff2222 : 0x440000;
    g.rect(barX, barY, torchW, barH).fill({ color: torchCol });
    g.rect(barX, barY, barW, barH).stroke({ color: 0x444444, width: 1 });
    if (torchPct <= 0) addText("OUT", barX + barW / 2, barY - 1, { fontSize: 11, fill: 0xff2222, fontWeight: "bold" }, true);
    else if (torchPct <= 0.2) {
      const flashA = Math.sin(now / 300) * 0.3 + 0.3;
      g.rect(barX, barY, barW, barH).fill({ color: 0xff0000, alpha: flashA * 0.15 });
    }

    // Noise indicator
    addText("Noise", 275, 22, { fontSize: 13, fill: 0x777766 });
    const noiseBarX = 305, noiseBarW = 30;
    g.rect(noiseBarX, barY, noiseBarW, barH).fill({ color: 0x222222 });
    const noiseFill = noiseBarW * state.noiseLevel;
    const noiseCol = state.noiseLevel > 0.7 ? 0xff4444 : state.noiseLevel > 0.3 ? 0xffaa44 : 0x44aa44;
    g.rect(noiseBarX, barY, noiseFill, barH).fill({ color: noiseCol });
    g.rect(noiseBarX, barY, noiseBarW, barH).stroke({ color: 0x444444, width: 1 });

    addText(`Score: ${state.score}`, 350, 4, { fontSize: 18, fill: 0x44ccaa });
    const mins = Math.floor(state.floorElapsed / 60);
    const secs = Math.floor(state.floorElapsed % 60);
    addText(`${mins}:${secs.toString().padStart(2, "0")}`, sw / 2, 4, { fontSize: 22, fill: 0xaaaaaa, fontWeight: "bold" }, true);
    const shiftRem = Math.ceil(state.shiftTimer);
    addText(`Shift: ${shiftRem}s`, sw / 2, 22, { fontSize: 14, fill: state.shiftWarning ? 0xff4444 : 0x667766 }, true);
    if (state.sprinting) addText("SPRINT", sw / 2 + 44, 22, { fontSize: 13, fill: 0xffaa44, fontWeight: "bold" });
    // No-hit streak
    if (state.noHitStreak >= 10) {
      const streakSecs = Math.floor(state.noHitStreak);
      addText(`No-hit: ${streakSecs}s`, sw / 2 + 44, 32, { fontSize: 11, fill: streakSecs >= 60 ? 0xffd700 : 0x44cc88 });
    }

    // Inventory
    const invStartX = sw - 160;
    addText("[1][2][3]", invStartX + 10, 2, { fontSize: 13, fill: 0x667766 });
    for (let si = 0; si < LabyrinthConfig.MAX_INVENTORY; si++) {
      const slotX = invStartX + si * 48;
      const slotY = 14;
      const hasItem = si < state.inventory.length;
      g.roundRect(slotX, slotY, 42, 22, 3).fill({ color: hasItem ? 0x1a1428 : 0x0a0810, alpha: 0.8 });
      g.roundRect(slotX, slotY, 42, 22, 3).stroke({ color: hasItem ? 0x6644aa : 0x333333, width: 1, alpha: hasItem ? 0.6 : 0.3 });
      addText(`${si + 1}`, slotX + 2, slotY + 2, { fontSize: 11, fill: 0x555555 });
      if (hasItem) {
        const item = state.inventory[si];
        const idef = ITEMS[item.type];
        addText(idef.icon, slotX + 14, slotY + 2, { fontSize: 18, fill: idef.color });
        addText(idef.name.split(" ")[0], slotX + 2, slotY + 13, { fontSize: 10, fill: idef.color });
      }
    }

    // Active effects
    let effectX = 430;
    const effectY = 4;
    if (state.speedTimer > 0) { addText(`\u26A1${Math.ceil(state.speedTimer)}s`, effectX, effectY, { fontSize: 14, fill: 0x44ccff }); effectX += 40; }
    if (state.invisTimer > 0) { addText(`\u{1F47B}${Math.ceil(state.invisTimer)}s`, effectX, effectY, { fontSize: 14, fill: 0x8844cc }); effectX += 40; }
    if (state.revealTimer > 0) { addText(`\u{1F4DC}${Math.ceil(state.revealTimer)}s`, effectX, effectY, { fontSize: 14, fill: 0xddddff }); effectX += 40; }
    if (state.compassTimer > 0) { addText(`\u{1FA7C}${Math.ceil(state.compassTimer)}s`, effectX, effectY, { fontSize: 14, fill: 0xffdd44 }); effectX += 40; }
    if (state.shieldActive) { addText("\u{1F6E1}\uFE0F", effectX, effectY, { fontSize: 14, fill: 0x44aaff }); effectX += 25; }
    if (state.webTimer > 0) { addText(`WEB ${Math.ceil(state.webTimer)}s`, effectX, effectY, { fontSize: 14, fill: 0xff6644 }); effectX += 55; }
    if (state.inWater) { addText("WATER", effectX, effectY, { fontSize: 14, fill: 0x4488cc, fontWeight: "bold" }); effectX += 45; }
    if (state.inDarkness) { addText("DARK", effectX, effectY, { fontSize: 14, fill: 0x555566, fontWeight: "bold" }); effectX += 40; }
    if (state.exitOpen) addText("EXIT OPEN!", 430, 22, { fontSize: 16, fill: EXIT_COLOR, fontWeight: "bold" });

    // ---- Announcements (with subtle bg panel) ----
    let annY = 0;
    for (const ann of state.announcements) {
      const a = Math.min(1, ann.timer / 1.5);
      const aY = oy + mazeH / 2 + annY;
      // Background panel
      g.roundRect(sw / 2 - 120, aY - 12, 240, 24, 6).fill({ color: 0x0a0810, alpha: a * 0.4 });
      const t = new Text({ text: ann.text, style: new TextStyle({ fontFamily: FONT, fontSize: 24, fill: ann.color, fontWeight: "bold" }) });
      t.alpha = a; t.anchor.set(0.5, 0.5);
      t.position.set(sw / 2, aY);
      this._ui.addChild(t);
      annY += 26;
    }

    // ======== MINIMAP ========
    if (state.minimapVisible) {
      const mmCell = LabyrinthConfig.MINIMAP_CELL;
      const mmW = state.cols * mmCell;
      const mmH = state.rows * mmCell;
      const mmX = sw - mmW - 8;
      const mmY = hudH + 6;
      g.rect(mmX - 2, mmY - 2, mmW + 4, mmH + 4).fill({ color: 0x050308, alpha: LabyrinthConfig.MINIMAP_ALPHA });
      g.rect(mmX - 2, mmY - 2, mmW + 4, mmH + 4).stroke({ color: 0x443366, width: 1, alpha: 0.4 });

      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          if (!state.maze[r][c].explored) continue;
          const mcx = mmX + c * mmCell, mcy = mmY + r * mmCell;
          g.rect(mcx, mcy, mmCell, mmCell).fill({ color: 0x1a1428, alpha: 0.5 });
          const cell = state.maze[r][c];
          if (cell.top) g.moveTo(mcx, mcy).lineTo(mcx + mmCell, mcy).stroke({ color: 0x554466, width: 0.5, alpha: 0.5 });
          if (cell.left) g.moveTo(mcx, mcy).lineTo(mcx, mcy + mmCell).stroke({ color: 0x554466, width: 0.5, alpha: 0.5 });
        }
      }

      // Hazards on minimap
      for (const hz of state.hazards) {
        if (!state.maze[hz.row]?.[hz.col]?.explored) continue;
        const hCol = hz.type === "water" ? 0x2244aa : 0x220033;
        g.rect(mmX + hz.col * mmCell, mmY + hz.row * mmCell, mmCell, mmCell).fill({ color: hCol, alpha: 0.5 });
      }

      for (const relic of state.relics) {
        if (relic.collected || !state.maze[relic.row]?.[relic.col]?.explored) continue;
        g.rect(mmX + relic.col * mmCell + 1, mmY + relic.row * mmCell + 1, mmCell - 2, mmCell - 2).fill({ color: RELIC_COLOR, alpha: 0.7 });
      }

      if (state.maze[state.exitRow]?.[state.exitCol]?.explored) {
        g.rect(mmX + state.exitCol * mmCell, mmY + state.exitRow * mmCell, mmCell, mmCell).fill({ color: state.exitOpen ? EXIT_COLOR : 0x555555, alpha: 0.8 });
      }

      {
        const mpx2 = ox + state.mx, mpy2 = oy + state.my;
        const mDist = Math.sqrt((mpx2 - (ox + state.px)) ** 2 + (mpy2 - (oy + state.py)) ** 2);
        if (fullReveal || mDist <= visionR) g.rect(mmX + state.mCol * mmCell, mmY + state.mRow * mmCell, mmCell, mmCell).fill({ color: MINO_COLOR, alpha: 0.9 });
      }
      if (state.shadow) {
        const spx2 = ox + state.shadow.x, spy2 = oy + state.shadow.y;
        const sDist = Math.sqrt((spx2 - (ox + state.px)) ** 2 + (spy2 - (oy + state.py)) ** 2);
        if (fullReveal || sDist <= visionR) g.rect(mmX + state.shadow.col * mmCell, mmY + state.shadow.row * mmCell, mmCell, mmCell).fill({ color: SHADOW_COLOR, alpha: 0.7 });
      }

      // Vision cone on minimap
      const visionCells = Math.ceil(effectiveVision);
      for (let vr = -visionCells; vr <= visionCells; vr++) {
        for (let vc = -visionCells; vc <= visionCells; vc++) {
          const vrc = state.pCol + vc, vrr = state.pRow + vr;
          if (vrc < 0 || vrc >= state.cols || vrr < 0 || vrr >= state.rows) continue;
          if (vc * vc + vr * vr > visionCells * visionCells) continue;
          g.rect(mmX + vrc * mmCell, mmY + vrr * mmCell, mmCell, mmCell).fill({ color: SCONCE_COL, alpha: 0.06 });
        }
      }

      const pulse = 0.7 + Math.sin(now / 400) * 0.3;
      g.rect(mmX + state.pCol * mmCell, mmY + state.pRow * mmCell, mmCell, mmCell).fill({ color: PLAYER_COLOR, alpha: pulse });
      addText("Tab: toggle", mmX, mmY + mmH + 2, { fontSize: 10, fill: 0x556655 });
    }

    const controlsY = oy + mazeH + 6;
    addText("WASD: move | Shift: sprint | 1/2/3: use | Q: drop | Tab: map | Esc: quit", sw / 2, controlsY, { fontSize: 11, fill: 0x445544 }, true);
  }

  destroy(): void {
    this.container.removeChildren();
    this._gfx.destroy();
  }
}
