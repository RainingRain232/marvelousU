// ---------------------------------------------------------------------------
// Alchemist mode — grid renderer with rich potion visuals
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { AlchemistState, Customer } from "../state/AlchemistState";
import { AlchemistConfig, INGREDIENTS, RECIPES, type IngredientType } from "../config/AlchemistConfig";
import { canServeCustomer } from "../systems/GridSystem";

const T = AlchemistConfig.TILE_SIZE;
const FONT = "Georgia, serif";
const COL = 0xaa8844;

export class AlchemistRenderer {
  readonly container = new Container();
  private _gridGfx = new Graphics();
  private _uiGfx = new Graphics();
  private _serveCallback: ((customerId: string) => void) | null = null;

  setServeCallback(cb: (id: string) => void): void { this._serveCallback = cb; }

  init(sw: number, sh: number): void {
    this.container.removeChildren();
    // Background
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x0a0806 });
    // Stone wall texture
    for (let row = 0; row < Math.ceil(sh / 16); row++) {
      const ry = row * 16;
      bg.moveTo(0, ry).lineTo(sw, ry).stroke({ color: 0x120e0a, width: 0.4, alpha: 0.15 });
    }
    // Warm torch glow from corners
    for (const [tx, ty] of [[30, 40], [sw - 30, 40]]) {
      for (let r = 1; r <= 4; r++) {
        bg.circle(tx, ty, r * 50).fill({ color: 0xff8833, alpha: 0.008 / r });
      }
      bg.ellipse(tx, ty - 5, 2, 4).fill({ color: 0xff6622, alpha: 0.08 });
    }
    // Vignette
    for (let v = 0; v < 5; v++) {
      const inset = v * 40;
      bg.rect(0, 0, inset, sh).fill({ color: 0x000000, alpha: 0.02 });
      bg.rect(sw - inset, 0, inset, sh).fill({ color: 0x000000, alpha: 0.02 });
    }
    this.container.addChild(bg);
    this._gridGfx = new Graphics();
    this._uiGfx = new Graphics();
    this.container.addChild(this._gridGfx);
    this.container.addChild(this._uiGfx);
  }

  draw(state: AlchemistState, sw: number, sh: number): void {
    this._gridGfx.clear();
    this._uiGfx.clear();
    // Remove old child texts
    while (this._uiGfx.children.length > 0) this._uiGfx.removeChildAt(0);

    const gridW = AlchemistConfig.GRID_COLS * T;
    const gridH = AlchemistConfig.GRID_ROWS * T;
    const gx = 30, gy = (sh - gridH) / 2;
    const g = this._gridGfx;

    // Grid background (cauldron view)
    g.roundRect(gx - 6, gy - 6, gridW + 12, gridH + 12, 8).fill({ color: 0x1a1410, alpha: 0.8 });
    g.roundRect(gx - 6, gy - 6, gridW + 12, gridH + 12, 8).stroke({ color: COL, width: 2, alpha: 0.3 });
    g.roundRect(gx - 3, gy - 3, gridW + 6, gridH + 6, 6).stroke({ color: COL, width: 0.5, alpha: 0.1 });

    // Draw grid tiles
    for (let row = 0; row < state.grid.length; row++) {
      for (let col = 0; col < state.grid[row].length; col++) {
        const tile = state.grid[row][col];
        const px = gx + tile.px;
        const py = gy + tile.py;
        const ing = INGREDIENTS[tile.type];
        const s = tile.scale;
        const half = T / 2;
        const cx = px + half, cy = py + half;

        // Tile background
        const checkerShade = (row + col) % 2 === 0 ? 0x1a1612 : 0x181410;
        g.rect(px, py, T, T).fill({ color: checkerShade, alpha: 0.5 });

        // Selection highlight
        if (tile.selected) {
          g.rect(px + 1, py + 1, T - 2, T - 2).stroke({ color: 0xffffff, width: 2, alpha: 0.6 });
          g.rect(px, py, T, T).fill({ color: 0xffffff, alpha: 0.08 });
        }

        // Match flash
        if (tile.matched) {
          g.rect(px, py, T, T).fill({ color: 0xffffff, alpha: 0.3 });
          continue;
        }

        // Ingredient orb — layered circle with glow
        const orbR = (T * 0.35) * s;
        // Outer glow
        g.circle(cx, cy, orbR + 4).fill({ color: ing.color, alpha: 0.08 });
        // Main orb
        g.circle(cx, cy, orbR).fill({ color: ing.color, alpha: 0.85 });
        // Inner highlight (top-left)
        g.circle(cx - orbR * 0.25, cy - orbR * 0.25, orbR * 0.5).fill({ color: 0xffffff, alpha: 0.15 });
        // Border
        g.circle(cx, cy, orbR).stroke({ color: 0xffffff, width: 0.5, alpha: 0.15 });
        // Bottom shadow
        g.ellipse(cx, cy + orbR + 2, orbR * 0.6, 2).fill({ color: 0x000000, alpha: 0.15 });

        // Tile border
        g.rect(px, py, T, T).stroke({ color: 0x2a2420, width: 0.5, alpha: 0.2 });
      }
    }

    // Particles
    for (const p of state.particles) {
      const lr = p.life / p.maxLife;
      g.circle(gx + p.x, gy + p.y, p.size * lr).fill({ color: p.color, alpha: lr * 0.7 });
    }

    // Announcements
    for (const ann of state.announcements) {
      const alpha = Math.min(1, ann.timer / 1);
      const t = new Text({ text: ann.text, style: new TextStyle({ fontFamily: FONT, fontSize: 20, fill: ann.color, fontWeight: "bold", letterSpacing: 2 }) });
      t.alpha = alpha;
      t.anchor.set(0.5, 0.5);
      t.position.set(gx + gridW / 2, gy + gridH / 2 - 20 + state.announcements.indexOf(ann) * 30);
      this._uiGfx.addChild(t);
    }

    // Right panel — customer orders + inventory
    const panelX = gx + gridW + 20;
    const panelW = sw - panelX - 20;
    this._drawPanel(state, panelX, gy, panelW, gridH);
  }

  private _drawPanel(state: AlchemistState, px: number, py: number, pw: number, ph: number): void {
    const u = this._uiGfx;

    // Panel background
    u.roundRect(px - 4, py - 4, pw + 8, ph + 8, 6).fill({ color: 0x0a0806, alpha: 0.7 });
    u.roundRect(px - 4, py - 4, pw + 8, ph + 8, 6).stroke({ color: COL, width: 1, alpha: 0.25 });

    // Title
    this._addText("\u2697 ALCHEMY SHOP", px + pw / 2, py + 4, { fontSize: 14, fill: COL, fontWeight: "bold", letterSpacing: 2 }, true);

    // Timer
    const rem = Math.max(0, state.timeLimit - state.elapsedTime);
    const mins = Math.floor(rem / 60), secs = Math.floor(rem % 60);
    const timerColor = rem < 30 ? 0xff4444 : rem < 60 ? 0xffaa44 : 0xccddcc;
    this._addText(`${mins}:${secs.toString().padStart(2, "0")}`, px + pw / 2, py + 22, { fontSize: 18, fill: timerColor, fontWeight: "bold" }, true);

    // Stats bar
    this._addText(`Gold: ${state.gold}`, px + 8, py + 44, { fontSize: 10, fill: 0xffd700 });
    this._addText(`Score: ${state.score}`, px + pw / 2, py + 44, { fontSize: 10, fill: 0x44ccaa });
    this._addText(`Rep: ${state.reputation}`, px + pw - 50, py + 44, { fontSize: 10, fill: 0x88aaff });

    // Divider
    u.moveTo(px + 10, py + 60).lineTo(px + pw - 10, py + 60).stroke({ color: COL, width: 0.5, alpha: 0.2 });

    // Collected ingredients
    this._addText("Ingredients", px + pw / 2, py + 65, { fontSize: 11, fill: 0xccaa88, fontWeight: "bold" }, true);
    let iy = py + 80;
    for (const [type, count] of state.collected) {
      if (count <= 0) continue;
      const ing = INGREDIENTS[type];
      u.circle(px + 14, iy + 5, 5).fill({ color: ing.color, alpha: 0.7 });
      this._addText(`${ing.name}: ${count}`, px + 24, iy, { fontSize: 9, fill: 0xbbaa88 });
      iy += 14;
    }
    iy = Math.max(iy, py + 110);

    // Divider
    u.moveTo(px + 10, iy).lineTo(px + pw - 10, iy).stroke({ color: COL, width: 0.5, alpha: 0.2 });
    iy += 8;

    // Customer orders
    this._addText("Orders", px + pw / 2, iy, { fontSize: 11, fill: 0xccaa88, fontWeight: "bold" }, true);
    iy += 16;

    for (const cust of state.customers) {
      if (cust.served || cust.left) continue;
      const canServe = canServeCustomer(state, cust.id);
      // Customer card
      u.roundRect(px + 4, iy, pw - 8, 50, 4).fill({ color: 0x121008, alpha: 0.6 });
      u.roundRect(px + 4, iy, pw - 8, 50, 4).stroke({ color: canServe ? 0x44aa44 : 0x444433, width: canServe ? 1.5 : 0.5, alpha: 0.4 });
      // Name
      this._addText(cust.name, px + 10, iy + 3, { fontSize: 9, fill: 0xccbbaa, fontWeight: "bold" });
      // Recipe
      this._addText(cust.recipe.name, px + 10, iy + 14, { fontSize: 8, fill: cust.recipe.color });
      // Ingredients needed
      const ingStr = cust.recipe.ingredients.map(([t, c]) => `${INGREDIENTS[t].symbol}${c}`).join(" ");
      this._addText(ingStr, px + 10, iy + 26, { fontSize: 9, fill: 0x999988 });
      // Patience bar
      const pbW = pw - 20, pbH = 3;
      u.rect(px + 8, iy + 40, pbW, pbH).fill({ color: 0x220000 });
      u.rect(px + 8, iy + 40, pbW * (cust.patience / cust.maxPatience), pbH).fill({ color: cust.patience > 20 ? 0x44aa44 : 0xff4444 });
      // Value
      this._addText(`${cust.recipe.value}g`, px + pw - 30, iy + 3, { fontSize: 9, fill: 0xffd700 });
      // Serve button
      if (canServe) {
        u.roundRect(px + pw - 50, iy + 18, 40, 18, 3).fill({ color: 0x224422, alpha: 0.6 });
        u.roundRect(px + pw - 50, iy + 18, 40, 18, 3).stroke({ color: 0x44aa44, width: 1, alpha: 0.5 });
        const btn = new Graphics();
        btn.roundRect(px + pw - 50, iy + 18, 40, 18, 3).fill({ color: 0x000000, alpha: 0.01 });
        btn.eventMode = "static"; btn.cursor = "pointer";
        const custId = cust.id;
        btn.on("pointerdown", () => this._serveCallback?.(custId));
        this._uiGfx.addChild(btn);
        this._addText("BREW", px + pw - 30, iy + 21, { fontSize: 8, fill: 0x44ff44, fontWeight: "bold" }, true);
      }

      iy += 56;
    }

    // Log (bottom)
    const logY = py + ph - 60;
    u.moveTo(px + 10, logY).lineTo(px + pw - 10, logY).stroke({ color: COL, width: 0.5, alpha: 0.15 });
    this._addText("Log", px + pw / 2, logY + 3, { fontSize: 8, fill: COL }, true);
    const last3 = state.log.slice(-3);
    for (let li = 0; li < last3.length; li++) {
      this._addText(last3[li], px + 8, logY + 14 + li * 12, { fontSize: 8, fill: 0x889988 });
    }
  }

  getGridOffset(sw: number, sh: number): { x: number; y: number } {
    const gridH = AlchemistConfig.GRID_ROWS * T;
    return { x: 30, y: (sh - gridH) / 2 };
  }

  private _addText(str: string, x: number, y: number, opts: Partial<TextStyle>, center = false): void {
    const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
    if (center) t.anchor.set(0.5, 0);
    t.position.set(x, y);
    this._uiGfx.addChild(t);
  }

  destroy(): void {
    this.container.removeChildren();
    this._gridGfx.destroy();
    this._uiGfx.destroy();
  }
}
