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

  setTowerSelectCallback(cb: (type: TowerType) => void): void { this._towerSelectCallback = cb; }

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
          // Worn cart tracks
          mg.moveTo(px + 4, py + HT - 2).lineTo(px + T - 4, py + HT - 2).stroke({ color: 0x2a2018, width: 1, alpha: 0.15 });
          mg.moveTo(px + 4, py + HT + 2).lineTo(px + T - 4, py + HT + 2).stroke({ color: 0x2a2018, width: 1, alpha: 0.15 });
          // Scattered pebbles
          if (h > 0.7) mg.circle(px + h * 20 + 5, py + HT + 4, 1).fill({ color: 0x4a4030, alpha: 0.2 });
          // Tile bevel
          mg.moveTo(px, py).lineTo(px + T, py).stroke({ color: 0x4a4030, width: 0.3, alpha: 0.1 });
        } else if (cell.type === "castle") {
          mg.rect(px, py, T, T).fill({ color: 0x4a4a5a });
          // Castle stone blocks
          mg.moveTo(px, py + HT).lineTo(px + T, py + HT).stroke({ color: 0x3a3a4a, width: 0.5, alpha: 0.3 });
          mg.moveTo(px + HT, py).lineTo(px + HT, py + T).stroke({ color: 0x3a3a4a, width: 0.5, alpha: 0.2 });
          // Battlements (crenellation polygon)
          mg.rect(px + 2, py, 6, 5).fill({ color: 0x5a5a6a, alpha: 0.5 });
          mg.rect(px + T - 8, py, 6, 5).fill({ color: 0x5a5a6a, alpha: 0.5 });
          // Flag pole with pennant
          mg.moveTo(px + HT, py + 3).lineTo(px + HT, py + T - 3).stroke({ color: 0x888888, width: 1.5 });
          mg.moveTo(px + HT, py + 3).lineTo(px + HT + 10, py + 7).lineTo(px + HT + 8, py + 11).lineTo(px + HT, py + 11).closePath().fill({ color: 0xff3333, alpha: 0.7 });
          // Flag cross emblem
          mg.moveTo(px + HT + 2, py + 7).lineTo(px + HT + 7, py + 7).stroke({ color: 0xffffff, width: 0.8, alpha: 0.4 });
          mg.moveTo(px + HT + 4.5, py + 5).lineTo(px + HT + 4.5, py + 9).stroke({ color: 0xffffff, width: 0.8, alpha: 0.4 });
          // Gate arch
          mg.moveTo(px + HT - 5, py + T).lineTo(px + HT - 5, py + T - 8).bezierCurveTo(px + HT - 5, py + T - 12, px + HT + 5, py + T - 12, px + HT + 5, py + T - 8).lineTo(px + HT + 5, py + T).stroke({ color: 0x3a3a4a, width: 1, alpha: 0.4 });
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
          mg.rect(px, py, T, T).fill({ color: h < 0.4 ? 0x223322 : 0x1e2e1e });
          // Grass blades
          if (h > 0.5) {
            for (let gi = 0; gi < 3; gi++) {
              const gx = px + 4 + th(col + gi, row + gi * 3) * (T - 8);
              const gy = py + T - 3;
              const gh = 3 + th(col * 3 + gi, row) * 4;
              mg.moveTo(gx, gy).bezierCurveTo(gx + 1, gy - gh * 0.5, gx - 1, gy - gh, gx + th(gi, col) * 3 - 1, gy - gh).stroke({ color: 0x2a4a2a, width: 0.5, alpha: 0.25 });
            }
          }
          // Subtle dirt patch
          if (h > 0.85) mg.circle(px + HT, py + HT, 3).fill({ color: 0x2a2a1a, alpha: 0.08 });
        }
        mg.rect(px, py, T, T).stroke({ color: 0x1a2a1a, width: 0.3, alpha: 0.2 });
      }
    }

    // Draw towers — polygon structures
    for (const tower of state.towers) {
      const def = TOWERS[tower.type];
      const px = ox + tower.x * T + HT, py = oy + tower.y * T + HT;
      const br = T * 0.38;
      // Shadow
      mg.ellipse(px + 1, py + br + 2, br * 0.7, 3).fill({ color: 0x000000, alpha: 0.15 });
      // Base — octagonal polygon
      for (let i = 0; i < 8; i++) {
        const a1 = i * Math.PI / 4, a2 = (i + 1) * Math.PI / 4;
        if (i === 0) mg.moveTo(px + Math.cos(a1) * br, py + Math.sin(a1) * br);
        mg.lineTo(px + Math.cos(a2) * br, py + Math.sin(a2) * br);
      }
      mg.closePath().fill({ color: def.color, alpha: 0.8 });
      // Base bevel (top highlight, bottom shadow)
      mg.moveTo(px - br * 0.7, py - br * 0.7).lineTo(px, py - br).lineTo(px + br * 0.7, py - br * 0.7).stroke({ color: 0xffffff, width: 0.5, alpha: 0.15 });
      mg.moveTo(px - br * 0.7, py + br * 0.7).lineTo(px, py + br).lineTo(px + br * 0.7, py + br * 0.7).stroke({ color: 0x000000, width: 0.5, alpha: 0.15 });
      // Turret — smaller octagon
      const tr = T * 0.18;
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        if (i === 0) mg.moveTo(px + Math.cos(a) * tr, py + Math.sin(a) * tr);
        else mg.lineTo(px + Math.cos(a) * tr, py + Math.sin(a) * tr);
      }
      mg.closePath().fill({ color: def.color });
      mg.circle(px, py, tr).stroke({ color: 0xffffff, width: 0.5, alpha: 0.12 });
      // Center dot (weapon port)
      mg.circle(px, py, 2).fill({ color: 0x000000, alpha: 0.3 });
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
      // Shadow
      eg.ellipse(ex + 1, ey + r + 1, r * 0.7, 2.5).fill({ color: 0x000000, alpha: 0.18 });
      // Body — polygon shape based on type
      if (def.id === "soldier" || def.id === "mage" || def.id === "assassin") {
        // Humanoid — torso + head
        eg.ellipse(ex, ey + 1, r * 0.7, r).fill({ color: def.color });
        eg.circle(ex, ey - r * 0.7, r * 0.5).fill({ color: def.color });
        // Shield (soldier) — detailed polygon with boss rivet
        if (def.id === "soldier") {
          eg.moveTo(ex + r * 0.4, ey - r * 0.4).lineTo(ex + r * 0.7, ey - r * 0.3).lineTo(ex + r * 0.7, ey + r * 0.3).lineTo(ex + r * 0.4, ey + r * 0.5).closePath().fill({ color: 0x666644, alpha: 0.6 });
          eg.moveTo(ex + r * 0.45, ey - r * 0.35).lineTo(ex + r * 0.65, ey - r * 0.25).stroke({ color: 0x888866, width: 0.5, alpha: 0.3 }); // highlight
          eg.circle(ex + r * 0.55, ey, 1).fill({ color: 0x888866, alpha: 0.4 }); // boss rivet
        }
        if (def.id === "mage") { eg.moveTo(ex - r, ey - r).lineTo(ex - r + 1, ey + r * 0.5).stroke({ color: 0x886644, width: 1 }); eg.circle(ex - r, ey - r - 1, 2).fill({ color: 0xaa88ff, alpha: 0.4 }); }
        if (def.id === "assassin") { eg.moveTo(ex + r * 0.3, ey - r * 0.3).lineTo(ex + r, ey - r).stroke({ color: 0xaaaaaa, width: 0.8 }); }
      } else if (def.id === "knight") {
        // Armored — pentagon body
        eg.moveTo(ex, ey - r).lineTo(ex + r * 0.8, ey - r * 0.3).lineTo(ex + r * 0.6, ey + r).lineTo(ex - r * 0.6, ey + r).lineTo(ex - r * 0.8, ey - r * 0.3).closePath().fill({ color: def.color });
        eg.circle(ex, ey - r * 0.6, r * 0.4).fill({ color: 0x9999aa }); // helmet
        eg.moveTo(ex - r * 0.3, ey - r * 0.6).lineTo(ex + r * 0.3, ey - r * 0.6).stroke({ color: 0x222222, width: 0.8 }); // visor
      } else if (def.id === "cavalry") {
        // Horse shape — elongated ellipse
        eg.ellipse(ex, ey, r * 1.2, r * 0.6).fill({ color: def.color });
        eg.circle(ex + r * 0.8, ey - r * 0.3, r * 0.35).fill({ color: def.color }); // head
        eg.circle(ex - r * 0.2, ey - r * 0.6, r * 0.3).fill({ color: 0x888888 }); // rider
      } else if (def.id === "battering_ram" || def.id === "siege_tower") {
        // Rectangular siege equipment
        eg.rect(ex - r, ey - r * 0.5, r * 2, r).fill({ color: def.color });
        eg.rect(ex - r, ey - r * 0.5, r * 2, r).stroke({ color: 0x4a3a2a, width: 1 });
        // Wheels — detailed with spokes and hub
        for (const wx of [ex - r * 0.6, ex + r * 0.6]) {
          const wy = ey + r * 0.5, wr = r * 0.22;
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
        if (def.id === "battering_ram") eg.moveTo(ex + r, ey).lineTo(ex + r * 1.5, ey).stroke({ color: 0x4a3a2a, width: 2 }); // ram
      } else if (def.id === "giant") {
        // Massive polygon body
        eg.moveTo(ex - r * 0.6, ey + r).lineTo(ex - r * 0.8, ey - r * 0.3).lineTo(ex - r * 0.4, ey - r).lineTo(ex + r * 0.4, ey - r).lineTo(ex + r * 0.8, ey - r * 0.3).lineTo(ex + r * 0.6, ey + r).closePath().fill({ color: def.color });
        eg.circle(ex, ey - r * 0.6, r * 0.35).fill({ color: 0x997777 }); // head
        // Arm clubs
        eg.moveTo(ex - r * 0.8, ey).lineTo(ex - r * 1.2, ey + r * 0.3).stroke({ color: def.color, width: 2 });
        eg.moveTo(ex + r * 0.8, ey).lineTo(ex + r * 1.2, ey + r * 0.3).stroke({ color: def.color, width: 2 });
      } else {
        eg.circle(ex, ey, r).fill({ color: def.color });
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
    }

    // Draw projectiles — directional shapes with trails
    for (const proj of state.projectiles) {
      const ppx = proj.x + ox, ppy = proj.y + oy;
      const target = state.enemies.find(e => e.id === proj.targetId);
      // Trail
      eg.circle(ppx - (target ? (target.x + ox - ppx) * 0.1 : 0), ppy - (target ? (target.y + oy - ppy) * 0.1 : 0), 1.5).fill({ color: proj.color, alpha: 0.3 });
      // Glow
      eg.circle(ppx, ppy, 4).fill({ color: proj.color, alpha: 0.12 });
      // Core — diamond shape
      eg.moveTo(ppx, ppy - 3).lineTo(ppx + 2, ppy).lineTo(ppx, ppy + 3).lineTo(ppx - 2, ppy).closePath().fill({ color: proj.color, alpha: 0.9 });
      eg.circle(ppx, ppy, 1).fill({ color: 0xffffff, alpha: 0.4 }); // bright center
    }

    // Particles
    for (const p of state.particles) {
      const lr = p.life / p.maxLife;
      eg.circle(p.x + ox, p.y + oy, p.size * lr).fill({ color: p.color, alpha: lr * 0.7 });
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
    // Top bar
    u.rect(0, 0, sw, 54).fill({ color: 0x0a0a06, alpha: 0.8 });
    u.moveTo(0, 54).lineTo(sw, 54).stroke({ color: COL, width: 1, alpha: 0.3 });

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
      if (center) t.anchor.set(0.5, 0);
      t.position.set(x, y); this._uiGfx.addChild(t);
    };

    addText("\u{1F3F0} SIEGE", 14, 6, { fontSize: 26, fill: COL, fontWeight: "bold", letterSpacing: 4 });
    addText(`Wave: ${state.wave + 1}/${WAVES.length}`, 220, 8, { fontSize: 20, fill: 0xccddcc });
    addText(`Gold: ${state.gold}`, 400, 8, { fontSize: 20, fill: 0xffd700 });
    addText(`Lives: ${state.lives}`, 560, 8, { fontSize: 20, fill: state.lives <= 5 ? 0xff4444 : 0x44cc44 });
    addText(`Score: ${state.score}`, 720, 8, { fontSize: 20, fill: 0x88aaff });
    addText(`Kills: ${state.totalKills}`, 880, 8, { fontSize: 20, fill: 0xccaaaa });

    // Phase indicator
    if (state.phase === SiegePhase.BUILDING) {
      const rem = Math.ceil(state.waveTimer);
      addText(`Next wave in ${rem}s — BUILD!`, sw / 2, 32, { fontSize: 18, fill: 0xffaa44 }, true);
    } else if (state.phase === SiegePhase.WAVE) {
      const remaining = state.enemies.filter(e => e.alive && !e.reachedEnd).length + state.spawnQueue.length;
      addText(`Enemies remaining: ${remaining}`, sw / 2, 32, { fontSize: 18, fill: 0xff6644 }, true);
    }

    // Tower selection panel (right side)
    const panelX = ox + gridW + 15;
    const panelW = sw - panelX - 10;
    const gridH = SiegeConfig.GRID_ROWS * T;
    u.roundRect(panelX, oy, panelW, gridH, 6).fill({ color: 0x0a0a06, alpha: 0.7 });
    u.roundRect(panelX, oy, panelW, gridH, 6).stroke({ color: COL, width: 1, alpha: 0.2 });

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
    ty += 20;

    // Speed indicator
    addText(`Speed: ${state.speedMult}x [1/2/3]`, panelX + panelW / 2, ty, { fontSize: 14, fill: state.speedMult > 1 ? 0xffaa44 : 0x667766 }, true);
    ty += 18;

    // Controls hint
    addText("Click: place/inspect | X: sell | Space: next wave", panelX + panelW / 2, oy + gridH - 12, { fontSize: 12, fill: 0x555544 }, true);
  }

  getGridOffset(): { x: number; y: number } { return { x: 10, y: 60 }; }

  destroy(): void {
    this.container.removeChildren();
    this._mapGfx.destroy(); this._entityGfx.destroy(); this._uiGfx.destroy();
  }
}
