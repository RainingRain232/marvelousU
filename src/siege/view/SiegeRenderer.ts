// ---------------------------------------------------------------------------
// Siege mode — map and entity renderer
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { SiegeState } from "../state/SiegeState";
import { SiegePhase } from "../state/SiegeState";
import { SiegeConfig, TOWERS, ENEMIES, WAVES, ALL_TOWER_TYPES, type TowerType } from "../config/SiegeConfig";

const T = SiegeConfig.TILE_SIZE;
const HT = T / 2;
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

    const gridW = SiegeConfig.GRID_COLS * T;
    const gridH = SiegeConfig.GRID_ROWS * T;
    const ox = 10, oy = 50;
    const mg = this._mapGfx;
    const eg = this._entityGfx;

    // Draw grid
    for (let row = 0; row < SiegeConfig.GRID_ROWS; row++) {
      for (let col = 0; col < SiegeConfig.GRID_COLS; col++) {
        const cell = state.grid[row][col];
        const px = ox + col * T, py = oy + row * T;

        if (cell.type === "path" || cell.type === "spawn") {
          mg.rect(px, py, T, T).fill({ color: 0x3a3020 });
          // Path worn texture
          mg.moveTo(px + 2, py + HT).lineTo(px + T - 2, py + HT).stroke({ color: 0x2a2018, width: 0.5, alpha: 0.2 });
        } else if (cell.type === "castle") {
          mg.rect(px, py, T, T).fill({ color: 0x4a4a5a });
          // Castle flag
          mg.moveTo(px + HT, py + 2).lineTo(px + HT, py + T - 4).stroke({ color: 0x888888, width: 1 });
          mg.moveTo(px + HT, py + 2).lineTo(px + HT + 8, py + 6).lineTo(px + HT, py + 10).fill({ color: 0xff4444, alpha: 0.6 });
        } else if (cell.type === "blocked") {
          mg.rect(px, py, T, T).fill({ color: 0x1a2a1a });
          // Rock
          mg.circle(px + HT, py + HT, 6).fill({ color: 0x2a3a2a, alpha: 0.4 });
        } else {
          // Buildable
          mg.rect(px, py, T, T).fill({ color: 0x223322 });
          // Grass texture
          if ((row + col) % 3 === 0) mg.circle(px + HT, py + HT, 1).fill({ color: 0x2a4a2a, alpha: 0.2 });
        }
        mg.rect(px, py, T, T).stroke({ color: 0x1a2a1a, width: 0.3, alpha: 0.3 });
      }
    }

    // Draw towers
    for (const tower of state.towers) {
      const def = TOWERS[tower.type];
      const px = ox + tower.x * T + HT, py = oy + tower.y * T + HT;
      // Base
      mg.circle(px, py, T * 0.4).fill({ color: def.color, alpha: 0.8 });
      mg.circle(px, py, T * 0.4).stroke({ color: 0xffffff, width: 0.8, alpha: 0.2 });
      // Turret top
      mg.circle(px, py, T * 0.2).fill({ color: def.color });
      // Range indicator (only during building phase or if selected)
      if (state.phase === SiegePhase.BUILDING) {
        mg.circle(px, py, def.range * T).stroke({ color: def.color, width: 0.5, alpha: 0.08 });
      }
    }

    // Draw enemies
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const def = ENEMIES[enemy.type];
      const r = 5 * def.size;
      // Shadow
      eg.ellipse(enemy.x + ox + 1, enemy.y + oy + r + 1, r * 0.6, 2).fill({ color: 0x000000, alpha: 0.15 });
      // Body
      eg.circle(enemy.x + ox, enemy.y + oy, r).fill({ color: def.color });
      if (def.boss) {
        eg.circle(enemy.x + ox, enemy.y + oy, r + 2).stroke({ color: 0xffd700, width: 1.5, alpha: 0.5 });
      }
      // HP bar
      if (enemy.hp < enemy.maxHp) {
        const bw = r * 2.5, bh = 2;
        const bx = enemy.x + ox - bw / 2, by = enemy.y + oy - r - 5;
        eg.rect(bx, by, bw, bh).fill({ color: 0x220000 });
        eg.rect(bx, by, bw * (enemy.hp / enemy.maxHp), bh).fill({ color: 0x44cc44 });
      }
      // Slow indicator
      if (enemy.slowTimer > 0) {
        eg.circle(enemy.x + ox, enemy.y + oy, r + 1).stroke({ color: 0x88ccff, width: 1, alpha: 0.3 });
      }
    }

    // Draw projectiles
    for (const proj of state.projectiles) {
      eg.circle(proj.x + ox, proj.y + oy, 2.5).fill({ color: proj.color, alpha: 0.9 });
      eg.circle(proj.x + ox, proj.y + oy, 4).fill({ color: proj.color, alpha: 0.15 });
    }

    // Particles
    for (const p of state.particles) {
      const lr = p.life / p.maxLife;
      eg.circle(p.x + ox, p.y + oy, p.size * lr).fill({ color: p.color, alpha: lr * 0.7 });
    }

    // Announcements
    for (const ann of state.announcements) {
      const alpha = Math.min(1, ann.timer / 1.5);
      const t = new Text({ text: ann.text, style: new TextStyle({ fontFamily: FONT, fontSize: 20, fill: ann.color, fontWeight: "bold", letterSpacing: 2 }) });
      t.alpha = alpha; t.anchor.set(0.5, 0.5);
      t.position.set(ox + gridW / 2, oy + gridH / 2);
      this._uiGfx.addChild(t);
    }

    // HUD
    this._drawHUD(state, sw, sh, ox, oy, gridW);
  }

  private _drawHUD(state: SiegeState, sw: number, sh: number, ox: number, oy: number, gridW: number): void {
    const u = this._uiGfx;
    // Top bar
    u.rect(0, 0, sw, 44).fill({ color: 0x0a0a06, alpha: 0.8 });
    u.moveTo(0, 44).lineTo(sw, 44).stroke({ color: COL, width: 1, alpha: 0.3 });

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
      if (center) t.anchor.set(0.5, 0);
      t.position.set(x, y); this._uiGfx.addChild(t);
    };

    addText("\u{1F3F0} SIEGE", 10, 4, { fontSize: 16, fill: COL, fontWeight: "bold", letterSpacing: 3 });
    addText(`Wave: ${state.wave + 1}/${WAVES.length}`, 160, 4, { fontSize: 12, fill: 0xccddcc });
    addText(`Gold: ${state.gold}`, 300, 4, { fontSize: 12, fill: 0xffd700 });
    addText(`Lives: ${state.lives}`, 420, 4, { fontSize: 12, fill: state.lives <= 5 ? 0xff4444 : 0x44cc44 });
    addText(`Score: ${state.score}`, 540, 4, { fontSize: 12, fill: 0x88aaff });
    addText(`Kills: ${state.totalKills}`, 660, 4, { fontSize: 12, fill: 0xccaaaa });

    // Phase indicator
    if (state.phase === SiegePhase.BUILDING) {
      const rem = Math.ceil(state.waveTimer);
      addText(`Next wave in ${rem}s — BUILD!`, sw / 2, 24, { fontSize: 11, fill: 0xffaa44 }, true);
    } else if (state.phase === SiegePhase.WAVE) {
      const remaining = state.enemies.filter(e => e.alive && !e.reachedEnd).length + state.spawnQueue.length;
      addText(`Enemies remaining: ${remaining}`, sw / 2, 24, { fontSize: 11, fill: 0xff6644 }, true);
    }

    // Tower selection panel (right side)
    const panelX = ox + gridW + 15;
    const panelW = sw - panelX - 10;
    u.roundRect(panelX, oy, panelW, SiegeConfig.GRID_ROWS * T, 6).fill({ color: 0x0a0a06, alpha: 0.7 });
    u.roundRect(panelX, oy, panelW, SiegeConfig.GRID_ROWS * T, 6).stroke({ color: COL, width: 1, alpha: 0.2 });

    addText("Towers", panelX + panelW / 2, oy + 4, { fontSize: 12, fill: COL, fontWeight: "bold" }, true);
    let ty = oy + 22;

    for (const tType of ALL_TOWER_TYPES) {
      const def = TOWERS[tType];
      const canAfford = state.gold >= def.cost;
      const sel = state.selectedTower === tType;

      // Card
      u.roundRect(panelX + 4, ty, panelW - 8, 54, 4).fill({ color: sel ? 0x1a1a08 : 0x080806, alpha: 0.6 });
      u.roundRect(panelX + 4, ty, panelW - 8, 54, 4).stroke({ color: sel ? def.color : canAfford ? 0x444433 : 0x222222, width: sel ? 2 : 0.5, alpha: 0.5 });

      // Tower color dot
      u.circle(panelX + 16, ty + 15, 6).fill({ color: def.color, alpha: canAfford ? 0.8 : 0.3 });
      u.circle(panelX + 16, ty + 15, 3).fill({ color: def.color });

      addText(def.name, panelX + 28, ty + 3, { fontSize: 9, fill: canAfford ? 0xccbbaa : 0x555544, fontWeight: "bold" });
      addText(def.desc, panelX + 28, ty + 15, { fontSize: 7, fill: 0x888877 });
      addText(`DMG:${def.damage} RNG:${def.range} SPD:${def.fireRate}`, panelX + 28, ty + 27, { fontSize: 7, fill: 0x778877 });
      addText(`${def.cost}g`, panelX + panelW - 34, ty + 3, { fontSize: 10, fill: canAfford ? 0xffd700 : 0x555544, fontWeight: "bold" });

      if (canAfford) {
        const btn = new Graphics();
        btn.roundRect(panelX + 4, ty, panelW - 8, 54, 4).fill({ color: 0x000000, alpha: 0.01 });
        btn.eventMode = "static"; btn.cursor = "pointer";
        const tt = tType;
        btn.on("pointerdown", () => this._towerSelectCallback?.(tt));
        this._uiGfx.addChild(btn);
      }

      ty += 58;
    }

    // Controls hint
    addText("Click grid: place tower | Esc: menu", panelX + panelW / 2, oy + SiegeConfig.GRID_ROWS * T - 16, { fontSize: 8, fill: 0x555544 }, true);
  }

  getGridOffset(): { x: number; y: number } { return { x: 10, y: 50 }; }

  destroy(): void {
    this.container.removeChildren();
    this._mapGfx.destroy(); this._entityGfx.destroy(); this._uiGfx.destroy();
  }
}
