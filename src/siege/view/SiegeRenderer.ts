// ---------------------------------------------------------------------------
// Siege mode — map and entity renderer
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { SiegeState } from "../state/SiegeState";
import { SiegePhase } from "../state/SiegeState";
import { SiegeConfig, TOWERS, ENEMIES, WAVES, ALL_TOWER_TYPES, type TowerType, TILE_SZ, setTileSize } from "../config/SiegeConfig";
const FONT = "Georgia, serif";
const COL = 0xcc8844;

export class SiegeRenderer {
  readonly container = new Container();
  private _mapGfx = new Graphics();
  private _entityGfx = new Graphics();
  private _uiGfx = new Graphics();
  private _towerSelectCallback: ((type: TowerType) => void) | null = null;
  private _rallyCallback: (() => void) | null = null;

  setTowerSelectCallback(cb: (type: TowerType) => void): void { this._towerSelectCallback = cb; }
  setRallyCallback(cb: () => void): void { this._rallyCallback = cb; }

  init(sw: number, sh: number): void {
    setTileSize(sw, sh);
    this.container.removeChildren();
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x1a2a1a });
    this.container.addChild(bg);
    this._mapGfx = new Graphics();
    this._entityGfx = new Graphics();
    this._uiGfx = new Graphics();
    this.container.addChild(this._mapGfx);
    this.container.addChild(this._entityGfx);
    this.container.addChild(this._uiGfx);
  }

  draw(state: SiegeState, sw: number, sh: number): void {
    this._mapGfx.clear();
    this._entityGfx.clear();
    this._uiGfx.clear();
    while (this._uiGfx.children.length > 0) this._uiGfx.removeChildAt(0);

    const T = TILE_SZ;
    const HT = T / 2;
    const gridW = SiegeConfig.GRID_COLS * T;
    const gridH = SiegeConfig.GRID_ROWS * T;
    const ox = 10, oy = 60;
    const mg = this._mapGfx;
    const eg = this._entityGfx;

    // Draw grid
    const th = (x: number, y: number) => { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
    for (let row = 0; row < SiegeConfig.GRID_ROWS; row++) {
      for (let col = 0; col < SiegeConfig.GRID_COLS; col++) {
        const cell = state.grid[row][col];
        const px = ox + col * T, py = oy + row * T;
        const h = th(col, row);

        if (cell.type === "path" || cell.type === "spawn") {
          mg.rect(px, py, T, T).fill({ color: h < 0.5 ? 0x3a3020 : 0x362c1e });
          // Cobblestone pattern — irregular stone shapes
          const stoneSize = T / 3.5;
          for (let sr = 0; sr < 3; sr++) {
            for (let sc = 0; sc < 3; sc++) {
              const sh2 = th(col * 3 + sc, row * 3 + sr);
              const sx = px + sc * stoneSize + sh2 * 2;
              const sy = py + sr * stoneSize + th(sc + col, sr + row) * 2;
              const sw2 = stoneSize - 1.5 + sh2 * 1.5;
              const sh3 = stoneSize - 1.5 + th(sc, sr + col) * 1.5;
              const stoneColor = sh2 < 0.3 ? 0x4a4030 : sh2 < 0.6 ? 0x3e3628 : 0x44382a;
              mg.roundRect(sx, sy, sw2, sh3, 1.5).fill({ color: stoneColor, alpha: 0.35 });
              mg.roundRect(sx, sy, sw2, sh3, 1.5).stroke({ color: 0x2a2018, width: 0.5, alpha: 0.2 });
            }
          }
          // Worn cart tracks
          mg.moveTo(px + 4, py + HT - 2).lineTo(px + T - 4, py + HT - 2).stroke({ color: 0x2a2018, width: 1, alpha: 0.15 });
          mg.moveTo(px + 4, py + HT + 2).lineTo(px + T - 4, py + HT + 2).stroke({ color: 0x2a2018, width: 1, alpha: 0.15 });
          // Scattered pebbles
          if (h > 0.7) mg.circle(px + h * 20 + 5, py + HT + 4, 1).fill({ color: 0x4a4030, alpha: 0.2 });
          // Spawn portal effect
          if (cell.type === "spawn") {
            const t2 = Date.now() / 1000;
            const pulse = 0.3 + Math.sin(t2 * 2) * 0.15;
            // Dark portal circle
            mg.circle(px + HT, py + HT, HT * 0.8).fill({ color: 0x220022, alpha: 0.5 });
            mg.circle(px + HT, py + HT, HT * 0.8).stroke({ color: 0x8833aa, width: 2, alpha: pulse });
            // Inner glow rings
            mg.circle(px + HT, py + HT, HT * 0.55).stroke({ color: 0xaa44cc, width: 1.2, alpha: pulse * 0.7 });
            mg.circle(px + HT, py + HT, HT * 0.3).stroke({ color: 0xcc66ee, width: 0.8, alpha: pulse * 0.5 });
            // Gate pillars
            mg.rect(px + 2, py + 2, 4, T - 4).fill({ color: 0x4a3a5a, alpha: 0.6 });
            mg.rect(px + T - 6, py + 2, 4, T - 4).fill({ color: 0x4a3a5a, alpha: 0.6 });
            // Pillar caps
            mg.rect(px + 1, py + 1, 6, 3).fill({ color: 0x5a4a6a, alpha: 0.5 });
            mg.rect(px + T - 7, py + 1, 6, 3).fill({ color: 0x5a4a6a, alpha: 0.5 });
            // Swirling particles
            for (let pi = 0; pi < 4; pi++) {
              const pa = t2 * 1.5 + pi * Math.PI / 2;
              const pr = HT * 0.5 + Math.sin(t2 + pi) * 3;
              mg.circle(px + HT + Math.cos(pa) * pr, py + HT + Math.sin(pa) * pr, 1.5).fill({ color: 0xaa66dd, alpha: pulse * 0.6 });
            }
          }
          // Tile bevel
          mg.moveTo(px, py).lineTo(px + T, py).stroke({ color: 0x4a4030, width: 0.3, alpha: 0.1 });
        } else if (cell.type === "castle") {
          const lifeRatio = state.lives / 20;
          const wallColor = lifeRatio > 0.5 ? 0x4a4a5a : lifeRatio > 0.25 ? 0x3a3a4a : 0x2a2a3a;
          mg.rect(px, py, T, T).fill({ color: wallColor });
          // Castle stone block pattern
          for (let br = 0; br < 4; br++) {
            for (let bc = 0; bc < 3; bc++) {
              const bx = px + bc * (T / 3) + (br % 2) * (T / 6);
              const by = py + br * (T / 4);
              mg.roundRect(bx + 0.5, by + 0.5, T / 3 - 1, T / 4 - 1, 0.5).stroke({ color: 0x3a3a4a, width: 0.4, alpha: 0.3 });
            }
          }
          // Battlements (crenellations) — three merlons
          for (let ci = 0; ci < 3; ci++) {
            const cx = px + 2 + ci * (T / 3);
            mg.rect(cx, py - 2, T / 4, 6).fill({ color: 0x5a5a6a, alpha: 0.6 });
            mg.rect(cx, py - 2, T / 4, 6).stroke({ color: 0x3a3a4a, width: 0.3, alpha: 0.3 });
          }
          // Corner turrets — small circles with pointed caps
          for (const tx2 of [px + 3, px + T - 3]) {
            mg.circle(tx2, py + 3, 3).fill({ color: 0x5a5a6a, alpha: 0.7 });
            mg.circle(tx2, py + 3, 3).stroke({ color: 0x3a3a4a, width: 0.5, alpha: 0.4 });
            // Turret cap (pointed)
            mg.moveTo(tx2 - 2, py + 1).lineTo(tx2, py - 2).lineTo(tx2 + 2, py + 1).closePath().fill({ color: 0x6a6a7a, alpha: 0.5 });
          }
          // Flag pole with pennant (animated wave)
          const flagWave = Math.sin(Date.now() / 400 + col) * 2;
          mg.moveTo(px + HT, py + 3).lineTo(px + HT, py + T - 3).stroke({ color: 0x888888, width: 1.5 });
          mg.moveTo(px + HT, py + 3).lineTo(px + HT + 10 + flagWave, py + 7).lineTo(px + HT + 8 + flagWave * 0.5, py + 11).lineTo(px + HT, py + 11).closePath().fill({ color: 0xff3333, alpha: 0.7 });
          // Flag cross emblem
          mg.moveTo(px + HT + 2, py + 7).lineTo(px + HT + 7 + flagWave * 0.3, py + 7).stroke({ color: 0xffffff, width: 0.8, alpha: 0.4 });
          mg.moveTo(px + HT + 4.5, py + 5).lineTo(px + HT + 4.5, py + 9).stroke({ color: 0xffffff, width: 0.8, alpha: 0.4 });
          // Gate arch
          mg.moveTo(px + HT - 5, py + T).lineTo(px + HT - 5, py + T - 8).bezierCurveTo(px + HT - 5, py + T - 12, px + HT + 5, py + T - 12, px + HT + 5, py + T - 8).lineTo(px + HT + 5, py + T).stroke({ color: 0x3a3a4a, width: 1, alpha: 0.4 });
          // Gate portcullis lines
          for (let gi = -4; gi <= 4; gi += 2) {
            mg.moveTo(px + HT + gi, py + T - 10).lineTo(px + HT + gi, py + T).stroke({ color: 0x555555, width: 0.5, alpha: 0.3 });
          }
          // Damage effects — cracks and fires based on life ratio
          if (lifeRatio < 0.75) {
            // Cracks
            mg.moveTo(px + 5, py + 8).lineTo(px + 9, py + 14).lineTo(px + 7, py + 20).stroke({ color: 0x1a1a2a, width: 0.8, alpha: 0.4 });
          }
          if (lifeRatio < 0.5) {
            // More cracks + rubble
            mg.moveTo(px + T - 6, py + 5).lineTo(px + T - 10, py + 12).lineTo(px + T - 7, py + 18).stroke({ color: 0x1a1a2a, width: 1, alpha: 0.5 });
            mg.circle(px + T - 5, py + T - 4, 2).fill({ color: 0x3a3a4a, alpha: 0.4 });
            mg.circle(px + 6, py + T - 3, 1.5).fill({ color: 0x3a3a4a, alpha: 0.3 });
          }
          if (lifeRatio < 0.25) {
            // Fire flickering on damaged castle
            const fl = Date.now() / 150;
            const fireA = 0.3 + Math.sin(fl) * 0.15;
            mg.circle(px + 8, py + 6, 3).fill({ color: 0xff4400, alpha: fireA * 0.4 });
            mg.circle(px + 8, py + 4, 2).fill({ color: 0xffaa00, alpha: fireA * 0.3 });
            mg.circle(px + T - 8, py + 10, 2.5).fill({ color: 0xff4400, alpha: fireA * 0.35 });
            // Smoke wisps
            const smokeY = py + 2 - (Date.now() / 300 % 15);
            mg.circle(px + 8, smokeY, 2.5).fill({ color: 0x555555, alpha: 0.15 });
            mg.circle(px + T - 8, smokeY + 3, 2).fill({ color: 0x555555, alpha: 0.12 });
          }
        } else if (cell.type === "blocked") {
          mg.rect(px, py, T, T).fill({ color: 0x1a2a1a });
          // Jagged rock polygon
          mg.moveTo(px + 8, py + T - 4).lineTo(px + 5, py + HT + 2).lineTo(px + 10, py + 6).lineTo(px + HT, py + 4).lineTo(px + T - 8, py + 7).lineTo(px + T - 5, py + HT).lineTo(px + T - 8, py + T - 5).closePath().fill({ color: 0x2a3a2a, alpha: 0.5 });
          // Rock highlight
          mg.moveTo(px + 10, py + 6).lineTo(px + HT, py + 4).lineTo(px + T - 8, py + 7).stroke({ color: 0x3a4a3a, width: 0.5, alpha: 0.25 });
          // Rock shadow
          mg.moveTo(px + 8, py + T - 4).lineTo(px + 5, py + HT + 2).stroke({ color: 0x1a2a1a, width: 0.5, alpha: 0.2 });
          // Moss dot
          mg.circle(px + HT + 3, py + HT - 2, 2).fill({ color: 0x3a5a3a, alpha: 0.2 });
        } else {
          // Buildable — grass with variation
          const grassBase = h < 0.25 ? 0x1a2e1a : h < 0.5 ? 0x223322 : h < 0.75 ? 0x1e2e1e : 0x203020;
          mg.rect(px, py, T, T).fill({ color: grassBase });
          // Random darker/lighter patches for texture variation
          const patchH = th(col * 7, row * 13);
          if (patchH > 0.6) {
            const patchX = px + patchH * (T - 8);
            const patchY = py + th(col + 5, row + 3) * (T - 8);
            const patchR = 3 + patchH * 4;
            mg.circle(patchX, patchY, patchR).fill({ color: patchH > 0.8 ? 0x2a3e2a : 0x182818, alpha: 0.15 });
          }
          // Flower/clover dots on some tiles
          if (h > 0.9) {
            const fx = px + th(col * 11, row * 7) * T * 0.7 + 4;
            const fy = py + th(col * 5, row * 11) * T * 0.7 + 4;
            mg.circle(fx, fy, 1.2).fill({ color: 0x44aa44, alpha: 0.25 });
            mg.circle(fx + 2, fy - 1, 1).fill({ color: 0x44aa44, alpha: 0.2 });
          }
          if (h > 0.7 && h < 0.75) {
            const fx = px + th(col * 9, row * 3) * T * 0.6 + 5;
            const fy = py + th(col * 3, row * 9) * T * 0.6 + 5;
            mg.circle(fx, fy, 1).fill({ color: 0xcccc44, alpha: 0.15 });
          }
          // Grass blades — more of them
          if (h > 0.35) {
            const bladeCount = h > 0.7 ? 5 : 3;
            for (let gi = 0; gi < bladeCount; gi++) {
              const gx = px + 3 + th(col + gi, row + gi * 3) * (T - 6);
              const gy = py + T - 2;
              const gh = 3 + th(col * 3 + gi, row) * 5;
              const lean = th(gi, col) * 4 - 2;
              mg.moveTo(gx, gy).bezierCurveTo(gx + lean * 0.3, gy - gh * 0.4, gx + lean * 0.7, gy - gh * 0.8, gx + lean, gy - gh).stroke({ color: 0x2a4a2a, width: 0.6, alpha: 0.3 });
            }
          }
          // Subtle dirt patch
          if (h > 0.85) mg.circle(px + HT, py + HT, 3).fill({ color: 0x2a2a1a, alpha: 0.08 });
        }
        mg.rect(px, py, T, T).stroke({ color: 0x1a2a1a, width: 0.3, alpha: 0.2 });
      }
    }

    // Draw towers — detailed castle tower structures
    for (const tower of state.towers) {
      const def = TOWERS[tower.type];
      const px = ox + tower.x * T + HT, py = oy + tower.y * T + HT;
      const br = T * 0.4;
      // Shadow
      mg.ellipse(px + 2, py + br + 3, br * 0.8, 4).fill({ color: 0x000000, alpha: 0.2 });

      // Foundation (wider, darker)
      mg.circle(px, py, br + 2).fill({ color: 0x333333, alpha: 0.4 });

      // Base wall — circular tower with stone detail
      mg.circle(px, py, br).fill({ color: def.color, alpha: 0.85 });
      // Stone coursing bands
      for (let b = 0; b < 3; b++) {
        const bandR = br - b * (br * 0.12);
        mg.circle(px, py, bandR).stroke({ color: 0x000000, width: 0.5, alpha: 0.1 });
      }
      // Top highlight arc
      mg.arc(px, py, br - 1, Math.PI * 1.15, Math.PI * 1.85).stroke({ color: 0xffffff, width: 1, alpha: 0.15 });

      // Merlons (crenellations) around top
      for (let m = 0; m < 6; m++) {
        const ma = (m / 6) * Math.PI * 2;
        const mx = px + Math.cos(ma) * (br - 1);
        const my = py + Math.sin(ma) * (br - 1);
        mg.roundRect(mx - 2, my - 2, 4, 4, 1).fill({ color: def.color, alpha: 0.9 });
        mg.roundRect(mx - 2, my - 2, 4, 4, 1).stroke({ color: 0x000000, width: 0.3, alpha: 0.2 });
      }

      // Inner turret platform
      const tr = T * 0.2;
      mg.circle(px, py, tr + 1).fill({ color: 0x333333, alpha: 0.3 });
      mg.circle(px, py, tr).fill({ color: def.color });
      mg.circle(px, py, tr).stroke({ color: 0xffffff, width: 0.5, alpha: 0.15 });
      // Turret rotation toward nearest enemy
      const nearestEnemy = state.enemies.filter(e => e.alive).reduce<{dist: number; angle: number} | null>((best, e) => {
        const dx = (e.x + ox) - px, dy = (e.y + oy) - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (!best || dist < best.dist) return { dist, angle: Math.atan2(dy, dx) };
        return best;
      }, null);
      const turretAngle = nearestEnemy ? nearestEnemy.angle : Date.now() / 3000;
      // Turret barrel pointing at nearest enemy
      mg.moveTo(px, py).lineTo(px + Math.cos(turretAngle) * tr * 1.8, py + Math.sin(turretAngle) * tr * 1.8).stroke({ color: 0x222222, width: 2.5, alpha: 0.5 });
      mg.circle(px + Math.cos(turretAngle) * tr * 1.8, py + Math.sin(turretAngle) * tr * 1.8, 1.5).fill({ color: 0x111111, alpha: 0.4 });
      // Center dot (weapon port)
      mg.circle(px, py, 2).fill({ color: 0x000000, alpha: 0.3 });
      // Subtle pulsing glow matching tower color
      const pulseT = Date.now() / 800;
      const glowAlpha = 0.06 + Math.sin(pulseT + tower.x * 1.3 + tower.y * 2.1) * 0.03;
      mg.circle(px, py, br + 4).fill({ color: def.color, alpha: glowAlpha });
      // Fire tower — smoke/steam wisps
      if (tower.type === "fire") {
        const smokeT = Date.now() / 500;
        for (let si = 0; si < 3; si++) {
          const phase = (smokeT + si * 1.2) % 3;
          const smokeY2 = py - br - phase * 8;
          const smokeX2 = px + Math.sin(smokeT * 0.7 + si * 2) * 4;
          const smokeA = Math.max(0, (1 - phase / 3) * 0.2);
          const smokeR = 1.5 + phase * 1.2;
          mg.circle(smokeX2, smokeY2, smokeR).fill({ color: 0x888888, alpha: smokeA });
        }
        // Ember particles
        const emberT = Date.now() / 300;
        for (let ei = 0; ei < 2; ei++) {
          const ep = (emberT + ei * 1.5) % 2;
          const eY = py - br * 0.5 - ep * 6;
          const eX = px + Math.sin(emberT + ei * 3) * 3;
          mg.circle(eX, eY, 0.8).fill({ color: 0xff6622, alpha: Math.max(0, (1 - ep / 2) * 0.5) });
        }
      }
      // Frost tower — floating ice crystals
      if (tower.type === "frost") {
        const iceT = Date.now() / 1200;
        for (let ci = 0; ci < 5; ci++) {
          const ca = iceT + ci * Math.PI * 2 / 5;
          const cr = br * 0.7 + Math.sin(iceT * 1.5 + ci) * 3;
          const cx = px + Math.cos(ca) * cr;
          const cy = py + Math.sin(ca) * cr;
          const cSize = 1.5 + Math.sin(iceT * 2 + ci * 1.3) * 0.5;
          // Tiny snowflake: 3-armed star
          for (let arm = 0; arm < 3; arm++) {
            const aa = arm * Math.PI / 3;
            mg.moveTo(cx - Math.cos(aa) * cSize, cy - Math.sin(aa) * cSize).lineTo(cx + Math.cos(aa) * cSize, cy + Math.sin(aa) * cSize).stroke({ color: 0xaaddff, width: 0.6, alpha: 0.4 });
          }
        }
      }
      // Holy tower — light rays
      if (tower.type === "holy") {
        const holyT = Date.now() / 600;
        for (let ri = 0; ri < 6; ri++) {
          const ra = holyT * 0.5 + ri * Math.PI / 3;
          const rayLen = br * 1.1 + Math.sin(holyT + ri * 1.1) * 4;
          const rayAlpha = 0.08 + Math.sin(holyT * 1.5 + ri) * 0.04;
          mg.moveTo(px, py).lineTo(px + Math.cos(ra) * rayLen, py + Math.sin(ra) * rayLen).stroke({ color: 0xffee88, width: 1.5, alpha: rayAlpha });
        }
        // Soft halo
        mg.circle(px, py, br * 0.9).fill({ color: 0xffdd44, alpha: 0.04 + Math.sin(holyT) * 0.02 });
      }
      // Poison tower — dripping effect
      if (tower.type === "poison") {
        const poisT = Date.now() / 400;
        for (let di = 0; di < 3; di++) {
          const dPhase = (poisT + di * 1.3) % 2.5;
          const dX = px + (di - 1) * 5 + Math.sin(di * 2.3) * 2;
          const dY = py + br * 0.5 + dPhase * 5;
          const dAlpha = Math.max(0, (1 - dPhase / 2.5) * 0.4);
          // Drip drop
          mg.circle(dX, dY, 1.2 + dPhase * 0.3).fill({ color: 0x44cc44, alpha: dAlpha });
        }
        // Bubbling at base
        const bubT = Date.now() / 250;
        for (let bi = 0; bi < 2; bi++) {
          const bp = (bubT + bi * 1.8) % 2;
          const bY = py + br - bp * 4;
          const bX = px + Math.sin(bubT + bi * 4) * 4;
          mg.circle(bX, bY, 1 + bp * 0.5).stroke({ color: 0x44cc44, width: 0.5, alpha: Math.max(0, (1 - bp) * 0.3) });
        }
      }
      // Lightning tower — electric arc spokes radiating from center
      if (tower.type === "lightning") {
        const arcTime = Date.now() / 200;
        for (let ai = 0; ai < 4; ai++) {
          const aa = ai * Math.PI / 2 + arcTime;
          const midR = br * 0.55;
          const jx = (Math.sin(arcTime * 3 + ai) * 2);
          const jy = (Math.cos(arcTime * 2.5 + ai * 1.7) * 2);
          mg.moveTo(px, py)
            .lineTo(px + Math.cos(aa) * midR + jx, py + Math.sin(aa) * midR + jy)
            .lineTo(px + Math.cos(aa) * br * 0.85, py + Math.sin(aa) * br * 0.85)
            .stroke({ color: 0x88ddff, width: 1.2, alpha: 0.6 });
        }
        // Electric glow
        mg.circle(px, py, tr + 1).fill({ color: 0x44aaff, alpha: 0.12 + Math.sin(arcTime) * 0.06 });
      }
      // Ballista tower — large crossbow shape
      if (tower.type === "ballista") {
        // Crossbow arms — thick angled beams
        mg.moveTo(px - br * 0.85, py - br * 0.5).lineTo(px - br * 0.2, py).lineTo(px - br * 0.85, py + br * 0.5).stroke({ color: 0x664422, width: 3 });
        mg.moveTo(px + br * 0.85, py - br * 0.5).lineTo(px + br * 0.2, py).lineTo(px + br * 0.85, py + br * 0.5).stroke({ color: 0x664422, width: 3 });
        // Bowstring
        mg.moveTo(px - br * 0.85, py - br * 0.5).lineTo(px, py + br * 0.15).lineTo(px + br * 0.85, py - br * 0.5).stroke({ color: 0xaaaaaa, width: 0.8, alpha: 0.5 });
        // Bolt (loaded)
        mg.moveTo(px, py - br * 0.7).lineTo(px, py + br * 0.15).stroke({ color: 0x444444, width: 2 });
        mg.moveTo(px - 3, py - br * 0.7).lineTo(px, py - br * 0.85).lineTo(px + 3, py - br * 0.7).closePath().fill({ color: 0x888888, alpha: 0.7 });
      }
      // Level indicator (stars/rings around tower)
      if (tower.level > 1) {
        for (let li = 0; li < tower.level - 1; li++) {
          const la = li * Math.PI * 2 / (tower.level - 1);
          mg.circle(px + Math.cos(la) * (br + 3), py + Math.sin(la) * (br + 3), 1.5).fill({ color: 0xffd700, alpha: 0.5 });
        }
        // Level text
        const lvText = new Text({ text: `${tower.level}`, style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0xffd700, fontWeight: "bold" }) });
        lvText.anchor.set(0.5, 0.5); lvText.position.set(px, py);
        this._uiGfx.addChild(lvText);
      }
      // Range indicator
      if (state.phase === SiegePhase.BUILDING) {
        mg.circle(px, py, def.range * T).stroke({ color: def.color, width: 0.5, alpha: 0.08 });
      }
    }

    // Draw enemies — shaped by type
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const def = ENEMIES[enemy.type];
      const r = 5 * def.size;
      const ex = enemy.x + ox, ey = enemy.y + oy;
      // Invisible assassins — render semi-transparent with shimmer
      const isInvisible = enemy.invisible && def.id === "assassin";
      if (isInvisible) {
        eg.alpha = 0.2;
        const shimmer = 0.05 * Math.sin(Date.now() / 150 + enemy.x * 0.1);
        eg.circle(ex, ey, r + 3).fill({ color: 0xffffff, alpha: 0.04 + shimmer });
      }
      // Walking animation — bob up and down
      const walkBob = Math.sin(Date.now() / 150 + enemy.x * 0.3) * 1.5;
      const exB = ex, eyB = ey + walkBob;
      // Shadow (adjusts with bob)
      eg.ellipse(ex + 1, ey + r + 1, r * 0.7, 2.5 - walkBob * 0.2).fill({ color: 0x000000, alpha: isInvisible ? 0.04 : 0.18 });
      // Damage flash — brief white overlay when recently hit (use hp fraction change heuristic)
      const dmgFlash = (enemy.hp < enemy.maxHp && Math.sin(Date.now() / 50 + enemy.hp * 17) > 0.95) ? 0.3 : 0;
      // Body — polygon shape based on type
      if (def.id === "soldier" || def.id === "mage" || def.id === "assassin") {
        // Humanoid — torso + head with walking bob
        eg.ellipse(exB, eyB + 1, r * 0.7, r).fill({ color: def.color });
        eg.circle(exB, eyB - r * 0.7, r * 0.5).fill({ color: def.color });
        // Walking leg animation
        const legSwing = Math.sin(Date.now() / 120 + enemy.x * 0.4) * 2;
        eg.moveTo(exB - 2, eyB + r * 0.7).lineTo(exB - 2 - legSwing, eyB + r + 2).stroke({ color: def.color, width: 1.5, alpha: 0.5 });
        eg.moveTo(exB + 2, eyB + r * 0.7).lineTo(exB + 2 + legSwing, eyB + r + 2).stroke({ color: def.color, width: 1.5, alpha: 0.5 });
        // Shield (soldier) — detailed polygon with boss rivet and highlight
        if (def.id === "soldier") {
          eg.moveTo(exB + r * 0.4, eyB - r * 0.4).lineTo(exB + r * 0.8, eyB - r * 0.3).lineTo(exB + r * 0.8, eyB + r * 0.3).lineTo(exB + r * 0.4, eyB + r * 0.5).closePath().fill({ color: 0x666644, alpha: 0.7 });
          // Shield border
          eg.moveTo(exB + r * 0.4, eyB - r * 0.4).lineTo(exB + r * 0.8, eyB - r * 0.3).lineTo(exB + r * 0.8, eyB + r * 0.3).lineTo(exB + r * 0.4, eyB + r * 0.5).closePath().stroke({ color: 0x888866, width: 0.6, alpha: 0.4 });
          // Shield emblem (cross)
          eg.moveTo(exB + r * 0.5, eyB - r * 0.1).lineTo(exB + r * 0.7, eyB - r * 0.1).stroke({ color: 0x888866, width: 0.6, alpha: 0.35 });
          eg.moveTo(exB + r * 0.6, eyB - r * 0.2).lineTo(exB + r * 0.6, eyB + r * 0.1).stroke({ color: 0x888866, width: 0.6, alpha: 0.35 });
          eg.circle(exB + r * 0.6, eyB, 1).fill({ color: 0x999977, alpha: 0.5 }); // boss rivet
          // Sword on other side
          eg.moveTo(exB - r * 0.4, eyB - r * 0.6).lineTo(exB - r * 0.3, eyB + r * 0.2).stroke({ color: 0xaaaaaa, width: 1, alpha: 0.4 });
        }
        if (def.id === "mage") {
          // Staff with glowing orb
          eg.moveTo(exB - r, eyB - r).lineTo(exB - r + 1, eyB + r * 0.5).stroke({ color: 0x886644, width: 1.5 });
          const staffGlow = 0.4 + Math.sin(Date.now() / 200) * 0.2;
          eg.circle(exB - r, eyB - r - 1, 3).fill({ color: 0xaa88ff, alpha: staffGlow * 0.3 }); // outer glow
          eg.circle(exB - r, eyB - r - 1, 2).fill({ color: 0xaa88ff, alpha: staffGlow });
          eg.circle(exB - r, eyB - r - 1, 1).fill({ color: 0xddbbff, alpha: staffGlow * 0.8 }); // bright center
          // Magical aura around mage
          eg.circle(exB, eyB, r + 2).stroke({ color: 0x8866cc, width: 0.5, alpha: 0.1 + Math.sin(Date.now() / 300) * 0.05 });
        }
        if (def.id === "assassin") { eg.moveTo(exB + r * 0.3, eyB - r * 0.3).lineTo(exB + r, eyB - r).stroke({ color: 0xaaaaaa, width: 0.8 }); }
      } else if (def.id === "knight") {
        // Armored — pentagon body with walking bob
        eg.moveTo(exB, eyB - r).lineTo(exB + r * 0.8, eyB - r * 0.3).lineTo(exB + r * 0.6, eyB + r).lineTo(exB - r * 0.6, eyB + r).lineTo(exB - r * 0.8, eyB - r * 0.3).closePath().fill({ color: def.color });
        // Armor shine — moving highlight
        const shineX = Math.sin(Date.now() / 500 + enemy.x * 0.2) * r * 0.3;
        eg.circle(exB + shineX, eyB - r * 0.2, r * 0.4).fill({ color: 0xffffff, alpha: 0.08 });
        eg.moveTo(exB + shineX - 2, eyB - r * 0.4).lineTo(exB + shineX + 2, eyB - r * 0.1).stroke({ color: 0xffffff, width: 0.8, alpha: 0.12 });
        eg.circle(exB, eyB - r * 0.6, r * 0.4).fill({ color: 0x9999aa }); // helmet
        // Helmet plume
        eg.moveTo(exB, eyB - r * 0.9).bezierCurveTo(exB + 3, eyB - r * 1.2, exB + 6, eyB - r * 1.1, exB + 5, eyB - r * 0.8).stroke({ color: 0xcc3333, width: 1.2, alpha: 0.5 });
        eg.moveTo(exB - r * 0.3, eyB - r * 0.6).lineTo(exB + r * 0.3, eyB - r * 0.6).stroke({ color: 0x222222, width: 0.8 }); // visor
        // Sword
        eg.moveTo(exB + r * 0.8, eyB - r * 0.3).lineTo(exB + r * 1.1, eyB - r * 0.8).stroke({ color: 0xcccccc, width: 1, alpha: 0.5 });
      } else if (def.id === "cavalry") {
        // Horse body with legs animation
        const legAnim = Math.sin(Date.now() / 100 + enemy.x * 0.5) * 2;
        eg.ellipse(exB, eyB, r * 1.2, r * 0.6).fill({ color: def.color });
        // Horse legs (animated gallop)
        eg.moveTo(exB - r * 0.6, eyB + r * 0.4).lineTo(exB - r * 0.6 - legAnim, eyB + r * 0.9).stroke({ color: def.color, width: 1.5, alpha: 0.6 });
        eg.moveTo(exB - r * 0.2, eyB + r * 0.4).lineTo(exB - r * 0.2 + legAnim, eyB + r * 0.9).stroke({ color: def.color, width: 1.5, alpha: 0.6 });
        eg.moveTo(exB + r * 0.3, eyB + r * 0.4).lineTo(exB + r * 0.3 - legAnim, eyB + r * 0.9).stroke({ color: def.color, width: 1.5, alpha: 0.6 });
        eg.moveTo(exB + r * 0.7, eyB + r * 0.4).lineTo(exB + r * 0.7 + legAnim, eyB + r * 0.9).stroke({ color: def.color, width: 1.5, alpha: 0.6 });
        // Horse neck and head
        eg.moveTo(exB + r * 0.7, eyB - r * 0.1).bezierCurveTo(exB + r * 0.9, eyB - r * 0.5, exB + r * 1.0, eyB - r * 0.6, exB + r * 0.8, eyB - r * 0.3).fill({ color: def.color });
        eg.circle(exB + r * 0.9, eyB - r * 0.4, r * 0.3).fill({ color: def.color }); // head
        // Ear
        eg.moveTo(exB + r * 0.85, eyB - r * 0.6).lineTo(exB + r * 0.95, eyB - r * 0.75).stroke({ color: def.color, width: 1 });
        // Tail
        eg.moveTo(exB - r * 1.1, eyB - r * 0.1).bezierCurveTo(exB - r * 1.4, eyB + r * 0.1, exB - r * 1.3, eyB + r * 0.4, exB - r * 1.1, eyB + r * 0.3).stroke({ color: def.color, width: 1, alpha: 0.5 });
        // Rider on top
        eg.ellipse(exB - r * 0.1, eyB - r * 0.7, r * 0.25, r * 0.35).fill({ color: 0x888888 });
        eg.circle(exB - r * 0.1, eyB - r * 1.0, r * 0.2).fill({ color: 0x999999 }); // rider head
      } else if (def.id === "battering_ram" || def.id === "siege_tower") {
        // Rectangular siege equipment
        eg.rect(exB - r, eyB - r * 0.5, r * 2, r).fill({ color: def.color });
        eg.rect(exB - r, eyB - r * 0.5, r * 2, r).stroke({ color: 0x4a3a2a, width: 1 });
        // Wheels — detailed with spokes and hub
        for (const wx of [exB - r * 0.6, exB + r * 0.6]) {
          const wy = eyB + r * 0.5, wr = r * 0.22;
          eg.circle(wx, wy, wr).fill({ color: 0x3a2a1a });
          eg.circle(wx, wy, wr).stroke({ color: 0x4a3a2a, width: 0.8 });
          // Spokes
          for (let si = 0; si < 4; si++) {
            const sa = si * Math.PI / 2;
            eg.moveTo(wx, wy).lineTo(wx + Math.cos(sa) * wr * 0.9, wy + Math.sin(sa) * wr * 0.9).stroke({ color: 0x2a1a0a, width: 0.5, alpha: 0.4 });
          }
          // Hub
          eg.circle(wx, wy, wr * 0.3).fill({ color: 0x4a3a2a });
        }
        if (def.id === "battering_ram") eg.moveTo(exB + r, eyB).lineTo(exB + r * 1.5, eyB).stroke({ color: 0x4a3a2a, width: 2 }); // ram
      } else if (def.id === "giant") {
        // Massive polygon body
        eg.moveTo(exB - r * 0.6, eyB + r).lineTo(exB - r * 0.8, eyB - r * 0.3).lineTo(exB - r * 0.4, eyB - r).lineTo(exB + r * 0.4, eyB - r).lineTo(exB + r * 0.8, eyB - r * 0.3).lineTo(exB + r * 0.6, eyB + r).closePath().fill({ color: def.color });
        eg.circle(exB, eyB - r * 0.6, r * 0.35).fill({ color: 0x997777 }); // head
        // Arm clubs
        eg.moveTo(exB - r * 0.8, eyB).lineTo(exB - r * 1.2, eyB + r * 0.3).stroke({ color: def.color, width: 2 });
        eg.moveTo(exB + r * 0.8, eyB).lineTo(exB + r * 1.2, eyB + r * 0.3).stroke({ color: def.color, width: 2 });
      } else {
        eg.circle(exB, eyB, r).fill({ color: def.color });
      }
      // Damage flash overlay
      if (dmgFlash > 0) {
        eg.circle(exB, eyB, r * 1.1).fill({ color: 0xffffff, alpha: dmgFlash });
      }
      // Boss crown
      if (def.boss) {
        eg.circle(ex, ey, r + 2).stroke({ color: 0xffd700, width: 1.5, alpha: 0.5 });
        eg.moveTo(ex - 4, ey - r - 2).lineTo(ex - 3, ey - r - 5).lineTo(ex, ey - r - 3).lineTo(ex + 3, ey - r - 5).lineTo(ex + 4, ey - r - 2).closePath().fill({ color: 0xffd700, alpha: 0.5 });
      }
      // HP bar
      if (enemy.hp < enemy.maxHp) {
        const bw = r * 2.5, bh = 2.5;
        const bx = ex - bw / 2, by = ey - r - 6;
        eg.rect(bx - 0.5, by - 0.5, bw + 1, bh + 1).fill({ color: 0x000000, alpha: 0.4 });
        eg.rect(bx, by, bw, bh).fill({ color: 0x220000 });
        const hpR = enemy.hp / enemy.maxHp;
        eg.rect(bx, by, bw * hpR, bh).fill({ color: hpR > 0.5 ? 0x44cc44 : hpR > 0.25 ? 0xccaa22 : 0xff4444 });
      }
      // Slow indicator
      if (enemy.slowTimer > 0) {
        eg.circle(ex, ey, r + 2).stroke({ color: 0x88ccff, width: 1, alpha: 0.3 });
        for (let fi = 0; fi < 3; fi++) {
          const fa = fi * Math.PI * 2 / 3 + Date.now() / 1000;
          eg.circle(ex + Math.cos(fa) * (r + 3), ey + Math.sin(fa) * (r + 3), 1).fill({ color: 0xaaddff, alpha: 0.3 });
        }
      }
      // Burn indicator (orange flicker)
      if (enemy.burnTimer > 0) {
        const flicker = 0.3 + Math.sin(Date.now() / 100) * 0.15;
        eg.circle(ex, ey, r + 1).fill({ color: 0xff6622, alpha: flicker * 0.15 });
        eg.circle(ex + (Math.random() - 0.5) * 4, ey - r - 2, 2).fill({ color: 0xff4400, alpha: flicker * 0.4 });
      }
      // Poison indicator (green drip)
      if (enemy.poisonTimer > 0) {
        eg.circle(ex, ey, r + 1).stroke({ color: 0x44cc44, width: 0.8, alpha: 0.25 });
        eg.circle(ex + 2, ey + r, 1.5).fill({ color: 0x44cc44, alpha: 0.3 });
      }
      // Mage healing — green healing circle when heal is active (cooldown just reset)
      if (def.id === "mage" && enemy.healCooldown > 2.5) {
        const healPulse = Math.sin(Date.now() / 200) * 0.15 + 0.25;
        eg.circle(ex, ey, r + 8).stroke({ color: 0x44ff88, width: 1.5, alpha: healPulse });
        eg.circle(ex, ey, r + 5).fill({ color: 0x44ff88, alpha: healPulse * 0.15 });
        // Small cross symbol
        eg.moveTo(ex - 3, ey).lineTo(ex + 3, ey).stroke({ color: 0x44ff88, width: 1, alpha: healPulse });
        eg.moveTo(ex, ey - 3).lineTo(ex, ey + 3).stroke({ color: 0x44ff88, width: 1, alpha: healPulse });
      }
      // Cavalry speed burst — speed lines and afterimage
      if (def.id === "cavalry" && enemy.cavalryBursted) {
        const burstAlpha = 0.25 + Math.sin(Date.now() / 120) * 0.1;
        // Afterimage trails behind the enemy
        for (let si = 1; si <= 3; si++) {
          eg.ellipse(ex - si * 5, ey, r * 1.2 * (1 - si * 0.15), r * 0.6 * (1 - si * 0.15)).fill({ color: def.color, alpha: burstAlpha * (1 - si * 0.3) });
        }
        // Speed lines
        for (let li = 0; li < 4; li++) {
          const ly = ey - r * 0.4 + li * r * 0.25;
          eg.moveTo(ex - r * 1.8 - li * 2, ly).lineTo(ex - r * 0.8, ly).stroke({ color: 0xffffff, width: 0.6, alpha: burstAlpha * 0.5 });
        }
      }
      // Shielded enemies — translucent blue shield bubble
      if (enemy.shieldHp > 0) {
        const shieldPulse = 0.2 + Math.sin(Date.now() / 400) * 0.05;
        eg.circle(ex, ey, r + 4).fill({ color: 0x4488ff, alpha: shieldPulse * 0.3 });
        eg.circle(ex, ey, r + 4).stroke({ color: 0x88bbff, width: 1.5, alpha: shieldPulse + 0.15 });
        // Shield highlight arc
        eg.arc(ex, ey, r + 3, -Math.PI * 0.7, -Math.PI * 0.3).stroke({ color: 0xccddff, width: 0.8, alpha: 0.3 });
      }
      // Regen wave enemies — green + symbols floating up
      if (state.waveModifier === "regen") {
        const regenPhase = (Date.now() / 800 + enemy.x * 0.02) % 1;
        const floatY = ey - r - 4 - regenPhase * 12;
        const regenAlpha = (1 - regenPhase) * 0.5;
        eg.moveTo(ex - 2, floatY).lineTo(ex + 2, floatY).stroke({ color: 0x44ff88, width: 1.2, alpha: regenAlpha });
        eg.moveTo(ex, floatY - 2).lineTo(ex, floatY + 2).stroke({ color: 0x44ff88, width: 1.2, alpha: regenAlpha });
        // Second offset + symbol
        const rp2 = (regenPhase + 0.5) % 1;
        const fy2 = ey - r - 4 - rp2 * 12;
        const ra2 = (1 - rp2) * 0.35;
        eg.moveTo(ex + 4, fy2).lineTo(ex + 8, fy2).stroke({ color: 0x44ff88, width: 1, alpha: ra2 });
        eg.moveTo(ex + 6, fy2 - 2).lineTo(ex + 6, fy2 + 2).stroke({ color: 0x44ff88, width: 1, alpha: ra2 });
      }
      // Reset alpha if invisible
      if (isInvisible) { eg.alpha = 1; }
    }

    // Draw projectiles — directional shapes with trails
    for (const proj of state.projectiles) {
      const ppx = proj.x + ox, ppy = proj.y + oy;
      const target = state.enemies.find(e => e.id === proj.targetId);
      // Determine tower type from towerId
      const srcTower = state.towers.find(t => t.id === proj.towerId);
      const tType = srcTower ? srcTower.type : "arrow";
      // Direction vector for trail
      const tdx = target ? (target.x + ox - ppx) : 1;
      const tdy = target ? (target.y + oy - ppy) : 0;
      const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
      const ndx = tdx / tlen, ndy = tdy / tlen;

      // Fading trail of dots behind projectile
      for (let ti = 1; ti <= 5; ti++) {
        const trailX = ppx - ndx * ti * 3;
        const trailY = ppy - ndy * ti * 3;
        const trailA = 0.3 * (1 - ti / 6);
        eg.circle(trailX, trailY, 1.5 - ti * 0.2).fill({ color: proj.color, alpha: trailA });
      }

      if (tType === "cannon") {
        // Cannonball — dark sphere with highlight
        eg.circle(ppx, ppy, 4).fill({ color: 0x333333 });
        eg.circle(ppx - 1, ppy - 1, 1.5).fill({ color: 0x666666, alpha: 0.5 }); // specular
        eg.circle(ppx, ppy, 5).fill({ color: 0x444444, alpha: 0.1 }); // glow
        // Smoke trail
        for (let si = 1; si <= 3; si++) {
          const sx = ppx - ndx * si * 5;
          const sy = ppy - ndy * si * 5 - si * 1.5;
          eg.circle(sx, sy, 1.5 + si * 0.5).fill({ color: 0x888888, alpha: 0.15 * (1 - si / 4) });
        }
      } else if (tType === "frost") {
        // Snowflake shape
        eg.circle(ppx, ppy, 4).fill({ color: 0x88ccff, alpha: 0.15 }); // glow
        const sfAngle = Date.now() / 200;
        for (let arm = 0; arm < 6; arm++) {
          const a = sfAngle + arm * Math.PI / 3;
          eg.moveTo(ppx, ppy).lineTo(ppx + Math.cos(a) * 4, ppy + Math.sin(a) * 4).stroke({ color: 0xaaddff, width: 1, alpha: 0.7 });
          // Branch tips
          const tipX = ppx + Math.cos(a) * 3;
          const tipY = ppy + Math.sin(a) * 3;
          eg.moveTo(tipX, tipY).lineTo(tipX + Math.cos(a + 0.6) * 1.5, tipY + Math.sin(a + 0.6) * 1.5).stroke({ color: 0xcceeff, width: 0.5, alpha: 0.5 });
          eg.moveTo(tipX, tipY).lineTo(tipX + Math.cos(a - 0.6) * 1.5, tipY + Math.sin(a - 0.6) * 1.5).stroke({ color: 0xcceeff, width: 0.5, alpha: 0.5 });
        }
        eg.circle(ppx, ppy, 1.2).fill({ color: 0xeeffff, alpha: 0.6 }); // center
      } else if (tType === "fire") {
        // Flame trail
        eg.circle(ppx, ppy, 5).fill({ color: 0xff4400, alpha: 0.1 }); // outer glow
        eg.circle(ppx, ppy, 3).fill({ color: 0xff6633, alpha: 0.6 }); // core
        eg.circle(ppx, ppy, 1.5).fill({ color: 0xffcc00, alpha: 0.7 }); // hot center
        // Flame licks behind
        const flameT = Date.now() / 100;
        for (let fi = 1; fi <= 4; fi++) {
          const fx = ppx - ndx * fi * 3 + Math.sin(flameT + fi * 1.5) * 2;
          const fy = ppy - ndy * fi * 3 + Math.cos(flameT + fi * 1.2) * 2 - fi * 0.8;
          const fAlpha = 0.4 * (1 - fi / 5);
          eg.circle(fx, fy, 2 - fi * 0.3).fill({ color: fi < 2 ? 0xff6622 : 0xff4400, alpha: fAlpha });
        }
      } else if (tType === "holy") {
        // Light beam projectile
        eg.circle(ppx, ppy, 6).fill({ color: 0xffee88, alpha: 0.08 }); // halo
        eg.circle(ppx, ppy, 3).fill({ color: 0xffffff, alpha: 0.5 }); // core
        eg.circle(ppx, ppy, 1.5).fill({ color: 0xffffff, alpha: 0.8 }); // bright center
        // Light rays from projectile
        const holyPT = Date.now() / 300;
        for (let ri = 0; ri < 4; ri++) {
          const ra = holyPT + ri * Math.PI / 2;
          eg.moveTo(ppx, ppy).lineTo(ppx + Math.cos(ra) * 5, ppy + Math.sin(ra) * 5).stroke({ color: 0xffee88, width: 0.8, alpha: 0.3 });
        }
      } else if (tType === "poison") {
        // Bubbling poison projectile
        eg.circle(ppx, ppy, 3.5).fill({ color: 0x44cc44, alpha: 0.5 }); // core
        eg.circle(ppx, ppy, 2).fill({ color: 0x66ee66, alpha: 0.6 }); // bright
        // Bubbles
        const bubbleT = Date.now() / 200;
        for (let bi = 0; bi < 3; bi++) {
          const bp = (bubbleT + bi * 1.3) % 2;
          const bx = ppx + Math.sin(bubbleT + bi * 2.5) * 3;
          const by = ppy - bp * 3;
          eg.circle(bx, by, 1 + bp * 0.3).stroke({ color: 0x66ee66, width: 0.5, alpha: 0.3 * (1 - bp / 2) });
        }
      } else {
        // Default (arrow, ballista, lightning) — diamond shape
        eg.circle(ppx, ppy, 4).fill({ color: proj.color, alpha: 0.12 }); // glow
        eg.moveTo(ppx, ppy - 3).lineTo(ppx + 2, ppy).lineTo(ppx, ppy + 3).lineTo(ppx - 2, ppy).closePath().fill({ color: proj.color, alpha: 0.9 });
        eg.circle(ppx, ppy, 1).fill({ color: 0xffffff, alpha: 0.4 }); // bright center
      }
    }

    // Lightning chain arcs — draw arc lines between chain projectiles from lightning towers
    for (const tower of state.towers) {
      if (tower.type !== "lightning") continue;
      const towerProjs = state.projectiles.filter(p => p.towerId === tower.id);
      if (towerProjs.length < 2) continue;
      const tpx = ox + tower.x * T + HT, tpy = oy + tower.y * T + HT;
      // Draw arcs from tower to first target, then between chain targets
      for (let pi = 0; pi < towerProjs.length; pi++) {
        const proj = towerProjs[pi];
        const sx = pi === 0 ? tpx : towerProjs[pi - 1].x + ox;
        const sy = pi === 0 ? tpy : towerProjs[pi - 1].y + oy;
        const target = state.enemies.find(e => e.id === proj.targetId);
        if (!target) continue;
        const tx = target.x + ox, ty2 = target.y + oy;
        // Jagged arc line with random offsets
        const segments = 4;
        let cx2 = sx, cy2 = sy;
        const arcTime = Date.now() / 80;
        for (let si = 1; si <= segments; si++) {
          const frac = si / segments;
          const nx = sx + (tx - sx) * frac + (Math.sin(arcTime + si * 2.3) * 4);
          const ny = sy + (ty2 - sy) * frac + (Math.cos(arcTime + si * 1.7) * 4);
          eg.moveTo(cx2, cy2).lineTo(si < segments ? nx : tx, si < segments ? ny : ty2).stroke({ color: 0x88ddff, width: 1.5, alpha: 0.5 });
          cx2 = nx; cy2 = ny;
        }
        // Glow at connection point
        eg.circle(tx, ty2, 4).fill({ color: 0x88ddff, alpha: 0.15 });
      }
    }

    // Ballista pierce lines — draw a line through all enemies hit by piercing shots
    for (const tower of state.towers) {
      if (tower.type !== "ballista") continue;
      const towerProjs = state.projectiles.filter(p => p.towerId === tower.id);
      if (towerProjs.length < 2) continue;
      const tpx = ox + tower.x * T + HT, tpy = oy + tower.y * T + HT;
      // Collect all target positions
      const targets: { x: number; y: number }[] = [];
      for (const proj of towerProjs) {
        const target = state.enemies.find(e => e.id === proj.targetId);
        if (target) targets.push({ x: target.x + ox, y: target.y + oy });
      }
      if (targets.length < 1) continue;
      // Draw piercing bolt trail line from tower through all targets
      eg.moveTo(tpx, tpy);
      for (const tgt of targets) {
        eg.lineTo(tgt.x, tgt.y);
      }
      // Extend the line past the last target
      if (targets.length >= 1) {
        const last = targets[targets.length - 1];
        const dx = last.x - tpx, dy = last.y - tpy;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          eg.lineTo(last.x + (dx / len) * 15, last.y + (dy / len) * 15);
        }
      }
      eg.stroke({ color: 0x664422, width: 2, alpha: 0.4 });
      // Impact marks on each pierced target
      for (const tgt of targets) {
        eg.circle(tgt.x, tgt.y, 3).fill({ color: 0xff8844, alpha: 0.25 });
      }
    }

    // Particles — enhanced with varied shapes
    for (const p of state.particles) {
      const lr = p.life / p.maxLife;
      const ppx2 = p.x + ox, ppy2 = p.y + oy;
      const sz = p.size * lr;
      // Main particle
      eg.circle(ppx2, ppy2, sz).fill({ color: p.color, alpha: lr * 0.7 });
      // Glow around larger particles
      if (p.size > 2) {
        eg.circle(ppx2, ppy2, sz * 1.8).fill({ color: p.color, alpha: lr * 0.1 });
      }
      // Spark trail for fast particles
      if (Math.abs(p.vx) + Math.abs(p.vy) > 100) {
        const tLen = Math.min(1, (Math.abs(p.vx) + Math.abs(p.vy)) / 300);
        eg.moveTo(ppx2, ppy2).lineTo(ppx2 - p.vx * 0.02 * tLen, ppy2 - p.vy * 0.02 * tLen).stroke({ color: p.color, width: sz * 0.5, alpha: lr * 0.4 });
      }
      // Metal shard shape for gray/silver particles (knight death)
      if (p.color === 0x888899 || p.color === 0x9999aa) {
        eg.moveTo(ppx2 - sz, ppy2).lineTo(ppx2, ppy2 - sz * 1.5).lineTo(ppx2 + sz, ppy2).lineTo(ppx2, ppy2 + sz * 0.5).closePath().fill({ color: p.color, alpha: lr * 0.6 });
      }
      // Sparkle for magic-colored particles (mage death)
      if (p.color === 0xaa88ff || p.color === 0x8866cc) {
        const sparkA = Date.now() / 100 + p.x;
        for (let si = 0; si < 4; si++) {
          const sa = sparkA + si * Math.PI / 2;
          eg.moveTo(ppx2, ppy2).lineTo(ppx2 + Math.cos(sa) * sz * 2, ppy2 + Math.sin(sa) * sz * 2).stroke({ color: 0xddbbff, width: 0.5, alpha: lr * 0.4 });
        }
      }
    }

    // Announcements
    for (const ann of state.announcements) {
      const alpha = Math.min(1, ann.timer / 1.5);
      const t = new Text({ text: ann.text, style: new TextStyle({ fontFamily: FONT, fontSize: 32, fill: ann.color, fontWeight: "bold", letterSpacing: 3 }) });
      t.alpha = alpha; t.anchor.set(0.5, 0.5);
      t.position.set(ox + gridW / 2, oy + gridH / 2);
      this._uiGfx.addChild(t);
    }

    // HUD
    this._drawHUD(state, sw, sh, ox, oy, gridW);
  }

  private _drawHUD(state: SiegeState, sw: number, _sh: number, ox: number, oy: number, gridW: number): void {
    const T = TILE_SZ;
    const u = this._uiGfx;
    // Top bar with gradient effect
    u.rect(0, 0, sw, 54).fill({ color: 0x0a0a06, alpha: 0.85 });
    u.rect(0, 48, sw, 6).fill({ color: 0x0a0a06, alpha: 0.4 }); // fade edge
    u.moveTo(0, 54).lineTo(sw, 54).stroke({ color: COL, width: 1.5, alpha: 0.4 });
    // Subtle top highlight
    u.moveTo(0, 0).lineTo(sw, 0).stroke({ color: COL, width: 0.5, alpha: 0.15 });

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
      if (center) t.anchor.set(0.5, 0);
      t.position.set(x, y); this._uiGfx.addChild(t);
    };

    addText("\u{1F3F0} SIEGE", 14, 6, { fontSize: 26, fill: COL, fontWeight: "bold", letterSpacing: 4 });
    // Wave indicator with icon
    addText(`\u2694 Wave: ${state.wave + 1}/${WAVES.length}`, 220, 8, { fontSize: 20, fill: 0xccddcc });
    // Gold with coin icon
    u.circle(396, 18, 7).fill({ color: 0xffd700, alpha: 0.6 });
    u.circle(396, 18, 7).stroke({ color: 0xaa8800, width: 1, alpha: 0.5 });
    u.circle(396, 18, 3).stroke({ color: 0xaa8800, width: 0.5, alpha: 0.3 });
    addText(`${state.gold}`, 410, 8, { fontSize: 20, fill: 0xffd700 });
    // Interest earned floating indicator during building phase
    if (state.phase === SiegePhase.BUILDING && state.interestAccumulator > 0) {
      const interestPerSec = Math.min(Math.floor(state.gold * 0.01), 10);
      if (interestPerSec > 0) {
        const floatPhase = (Date.now() / 1200) % 1;
        const fy = 28 - floatPhase * 8;
        const fa = (1 - floatPhase) * 0.7;
        addText(`+${interestPerSec}g`, 490, fy, { fontSize: 14, fill: 0xffee88 });
        // Manually set alpha on the last added text child
        const lastChild = this._uiGfx.children[this._uiGfx.children.length - 1];
        if (lastChild) lastChild.alpha = fa;
      }
    }
    // Lives with heart icon
    const heartColor = state.lives <= 5 ? 0xff4444 : 0x44cc44;
    // Heart shape
    const hx = 558, hy = 16;
    u.moveTo(hx, hy + 2).bezierCurveTo(hx - 4, hy - 3, hx - 8, hy + 1, hx, hy + 7).fill({ color: heartColor, alpha: 0.7 });
    u.moveTo(hx, hy + 2).bezierCurveTo(hx + 4, hy - 3, hx + 8, hy + 1, hx, hy + 7).fill({ color: heartColor, alpha: 0.7 });
    addText(`${state.lives}`, 572, 8, { fontSize: 20, fill: heartColor });
    addText(`\u2605 ${state.score}`, 640, 8, { fontSize: 20, fill: 0x88aaff });
    addText(`\u2620 ${state.totalKills}`, 790, 8, { fontSize: 20, fill: 0xccaaaa });

    // Phase indicator
    if (state.phase === SiegePhase.BUILDING) {
      const rem = Math.ceil(state.waveTimer);
      addText(`Next wave in ${rem}s \u2014 BUILD!`, sw / 2, 32, { fontSize: 18, fill: 0xffaa44 }, true);
    } else if (state.phase === SiegePhase.WAVE) {
      const remaining = state.enemies.filter(e => e.alive && !e.reachedEnd).length + state.spawnQueue.length;
      const totalInWave = remaining + state.totalKills; // approximate
      addText(`Enemies remaining: ${remaining}`, sw / 2, 32, { fontSize: 18, fill: 0xff6644 }, true);
      // Wave progress bar
      if (totalInWave > 0) {
        const progW = 180, progH = 5;
        const progX = sw / 2 - progW / 2, progY = 50;
        const progFrac = Math.max(0, 1 - remaining / totalInWave);
        u.roundRect(progX, progY, progW, progH, 2).fill({ color: 0x220000, alpha: 0.5 });
        u.roundRect(progX, progY, progW * progFrac, progH, 2).fill({ color: 0xff6644, alpha: 0.6 });
        u.roundRect(progX, progY, progW, progH, 2).stroke({ color: 0x443322, width: 0.5, alpha: 0.3 });
      }
    }

    // Tower selection panel (right side)
    const panelX = ox + gridW + 15;
    const panelW = sw - panelX - 10;
    const gridH = SiegeConfig.GRID_ROWS * T;
    // Panel background with layered gradient effect
    u.roundRect(panelX, oy, panelW, gridH, 6).fill({ color: 0x0a0a06, alpha: 0.75 });
    u.roundRect(panelX, oy, panelW, 30, 6).fill({ color: 0x1a1408, alpha: 0.25 }); // top highlight
    u.roundRect(panelX, oy + gridH - 20, panelW, 20, 6).fill({ color: 0x000000, alpha: 0.15 }); // bottom shadow
    u.roundRect(panelX, oy, panelW, gridH, 6).stroke({ color: COL, width: 1.2, alpha: 0.25 });
    // Inner highlight border
    u.roundRect(panelX + 1, oy + 1, panelW - 2, gridH - 2, 5).stroke({ color: COL, width: 0.3, alpha: 0.08 });

    addText("Towers", panelX + panelW / 2, oy + 6, { fontSize: 20, fill: COL, fontWeight: "bold" }, true);
    let ty = oy + 32;

    for (const tType of ALL_TOWER_TYPES) {
      const def = TOWERS[tType];
      const canAfford = state.gold >= def.cost;
      const sel = state.selectedTower === tType;

      // Card
      const cardH = 72;
      u.roundRect(panelX + 4, ty, panelW - 8, cardH, 4).fill({ color: sel ? 0x1a1a08 : 0x080806, alpha: 0.6 });
      u.roundRect(panelX + 4, ty, panelW - 8, cardH, 4).stroke({ color: sel ? def.color : canAfford ? 0x444433 : 0x222222, width: sel ? 2 : 0.5, alpha: 0.5 });

      // Tower icon — octagonal shape with glow + highlight
      const tix = panelX + 22, tiy = ty + 22, tir = 10;
      u.circle(tix, tiy, tir + 2).fill({ color: def.color, alpha: canAfford ? 0.1 : 0.03 });
      for (let oi = 0; oi < 8; oi++) {
        const oa = oi * Math.PI / 4;
        if (oi === 0) u.moveTo(tix + Math.cos(oa) * tir, tiy + Math.sin(oa) * tir);
        else u.lineTo(tix + Math.cos(oa) * tir, tiy + Math.sin(oa) * tir);
      }
      u.closePath().fill({ color: def.color, alpha: canAfford ? 0.7 : 0.25 });
      u.circle(tix, tiy, tir * 0.5).fill({ color: def.color, alpha: canAfford ? 0.9 : 0.4 });
      u.circle(tix - 1, tiy - 1, tir * 0.3).fill({ color: 0xffffff, alpha: 0.1 });
      u.circle(tix, tiy, tir).stroke({ color: 0xffffff, width: 0.5, alpha: 0.1 });

      addText(def.name, panelX + 38, ty + 4, { fontSize: 15, fill: canAfford ? 0xccbbaa : 0x555544, fontWeight: "bold" });
      addText(def.desc, panelX + 38, ty + 22, { fontSize: 12, fill: 0x888877 });
      addText(`DMG:${def.damage} RNG:${def.range} SPD:${def.fireRate}`, panelX + 38, ty + 38, { fontSize: 12, fill: 0x778877 });
      addText(`${def.cost}g`, panelX + panelW - 44, ty + 4, { fontSize: 16, fill: canAfford ? 0xffd700 : 0x555544, fontWeight: "bold" });

      if (canAfford) {
        const btn = new Graphics();
        btn.roundRect(panelX + 4, ty, panelW - 8, cardH, 4).fill({ color: 0x000000, alpha: 0.01 });
        btn.eventMode = "static"; btn.cursor = "pointer";
        const tt = tType;
        btn.on("pointerdown", () => this._towerSelectCallback?.(tt));
        this._uiGfx.addChild(btn);
      }

      ty += cardH + 6;
    }

    // Tower inspection panel (when a tower is clicked)
    if (state.inspectedTowerId) {
      const tower = state.towers.find(t => t.id === state.inspectedTowerId);
      if (tower) {
        const def = TOWERS[tower.type];
        const levelMult = 1 + (tower.level - 1) * 0.2;
        const ity = ty + 6;
        u.roundRect(panelX + 2, ity, panelW - 4, 90, 4).fill({ color: 0x1a1a08, alpha: 0.7 });
        u.roundRect(panelX + 2, ity, panelW - 4, 90, 4).stroke({ color: def.color, width: 1, alpha: 0.4 });
        addText(`${def.name} Lv${tower.level}${tower.level >= 5 ? " MAX" : ""}`, panelX + panelW / 2, ity + 4, { fontSize: 16, fill: def.color, fontWeight: "bold" }, true);
        addText(`DMG: ${Math.floor(def.damage * levelMult)} (+${Math.round((levelMult - 1) * 100)}%)`, panelX + 12, ity + 24, { fontSize: 14, fill: 0xccbbaa });
        addText(`RNG: ${def.range} | SPD: x${(1 + (tower.level - 1) * 0.1).toFixed(1)}`, panelX + 12, ity + 42, { fontSize: 14, fill: 0xaabb99 });
        if (tower.level < 5) {
          const killsNeeded = tower.level * 5;
          const prog = tower.kills / killsNeeded;
          const bx = panelX + 12, by = ity + 60, bw = panelW - 28;
          u.rect(bx, by, bw, 6).fill({ color: 0x222200 });
          u.rect(bx, by, bw * prog, 6).fill({ color: 0xffd700 });
          u.rect(bx, by, bw, 6).stroke({ color: 0x444422, width: 0.5 });
          addText(`${tower.kills}/${killsNeeded} kills to Lv${tower.level + 1}`, panelX + panelW / 2, ity + 68, { fontSize: 12, fill: 0x999977 }, true);
        }
        addText(`Target: ${tower.targetPriority} [T]`, panelX + panelW / 2, ity + 78, { fontSize: 12, fill: 0x88aacc }, true);
        addText(`Sell: ${Math.floor(def.cost * 0.6)}g [X]`, panelX + panelW / 2, ity + 90, { fontSize: 12, fill: 0xff8844 }, true);
        ty += 108;
      }
    }

    // Power-ups
    ty = Math.max(ty + 6, oy + gridH - 100);
    u.moveTo(panelX + 10, ty).lineTo(panelX + panelW - 10, ty).stroke({ color: COL, width: 0.5, alpha: 0.15 });
    ty += 8;
    addText("Power-ups", panelX + panelW / 2, ty, { fontSize: 16, fill: 0xccaa88, fontWeight: "bold" }, true);
    ty += 22;
    const freezeReady = state.freezeTimer <= 0 && state.gold >= 20;
    addText(`F: Freeze (20g)${state.freezeTimer > 0 ? ` [${Math.ceil(state.freezeTimer)}s]` : ""}`, panelX + 10, ty, { fontSize: 14, fill: freezeReady ? 0x88ccff : 0x555544 });
    ty += 18;
    const meteorReady = state.meteorCooldown <= 0 && state.gold >= 30;
    addText(`M: Meteor (30g)${state.meteorCooldown > 0 ? ` [${Math.ceil(state.meteorCooldown)}s]` : ""}`, panelX + 10, ty, { fontSize: 14, fill: meteorReady ? 0xff6644 : 0x555544 });
    ty += 18;
    const rallyReady = state.rallyTimer <= 0 && state.rallyCooldown <= 0 && state.gold >= 40;
    const rallyActive = state.rallyTimer > 0;
    const rallyOnCooldown = state.rallyCooldown > 0;
    let rallyLabel = `R: Rally (40g)`;
    if (rallyActive) rallyLabel += ` [${Math.ceil(state.rallyTimer)}s active]`;
    else if (rallyOnCooldown) rallyLabel += ` [${Math.ceil(state.rallyCooldown)}s cd]`;
    addText(rallyLabel, panelX + 10, ty, { fontSize: 14, fill: rallyActive ? 0xff8800 : rallyReady ? 0xffaa44 : 0x555544 });
    if (rallyReady) {
      const rallyBtn = new Graphics();
      rallyBtn.roundRect(panelX + 6, ty - 2, panelW - 16, 18, 3).fill({ color: 0x000000, alpha: 0.01 });
      rallyBtn.eventMode = "static"; rallyBtn.cursor = "pointer";
      rallyBtn.on("pointerdown", () => this._rallyCallback?.());
      this._uiGfx.addChild(rallyBtn);
    }
    ty += 20;

    // Speed indicator
    addText(`Speed: ${state.speedMult}x [1/2/3]`, panelX + panelW / 2, ty, { fontSize: 14, fill: state.speedMult > 1 ? 0xffaa44 : 0x667766 }, true);
    ty += 18;

    // Controls hint
    addText("Click: place/inspect | X: sell | R: rally | Space: next wave", panelX + panelW / 2, oy + gridH - 12, { fontSize: 12, fill: 0x555544 }, true);
  }

  getGridOffset(): { x: number; y: number } { return { x: 10, y: 60 }; }

  destroy(): void {
    this.container.removeChildren();
    this._mapGfx.destroy(); this._entityGfx.destroy(); this._uiGfx.destroy();
  }
}
