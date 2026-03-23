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

    // Grid frame — ornate cauldron border
    // Drop shadow
    g.roundRect(gx - 5, gy - 5, gridW + 14, gridH + 14, 9).fill({ color: 0x000000, alpha: 0.25 });
    // Outer frame
    g.roundRect(gx - 8, gy - 8, gridW + 16, gridH + 16, 10).fill({ color: 0x2a2018, alpha: 0.6 });
    g.roundRect(gx - 8, gy - 8, gridW + 16, gridH + 16, 10).stroke({ color: COL, width: 2.5, alpha: 0.4 });
    // Inner frame
    g.roundRect(gx - 3, gy - 3, gridW + 6, gridH + 6, 6).fill({ color: 0x1a1410, alpha: 0.85 });
    g.roundRect(gx - 3, gy - 3, gridW + 6, gridH + 6, 6).stroke({ color: COL, width: 0.8, alpha: 0.2 });
    // Corner rivets
    for (const [rvx, rvy] of [[gx - 4, gy - 4], [gx + gridW + 4, gy - 4], [gx - 4, gy + gridH + 4], [gx + gridW + 4, gy + gridH + 4]]) {
      g.circle(rvx, rvy, 3).fill({ color: 0x554422, alpha: 0.5 });
      g.circle(rvx, rvy, 3).stroke({ color: COL, width: 0.5, alpha: 0.3 });
      g.circle(rvx - 0.5, rvy - 0.5, 1).fill({ color: 0x887744, alpha: 0.3 });
    }

    // Draw grid tiles
    const t = Date.now();
    for (let row = 0; row < state.grid.length; row++) {
      for (let col = 0; col < state.grid[row].length; col++) {
        const tile = state.grid[row][col];
        const px = gx + tile.px;
        const py = gy + tile.py;
        const ing = INGREDIENTS[tile.type];
        const s = tile.scale;
        const half = T / 2;
        const cx = px + half, cy = py + half;

        // Tile background with stone texture
        const checkerShade = (row + col) % 2 === 0 ? 0x1a1612 : 0x161210;
        g.rect(px, py, T, T).fill({ color: checkerShade, alpha: 0.5 });
        // Tile bevel (top-left highlight, bottom-right shadow)
        g.moveTo(px + 1, py + 1).lineTo(px + T - 1, py + 1).stroke({ color: 0x2a2620, width: 0.4, alpha: 0.15 });
        g.moveTo(px + 1, py + 1).lineTo(px + 1, py + T - 1).stroke({ color: 0x2a2620, width: 0.4, alpha: 0.1 });
        g.moveTo(px + 1, py + T - 1).lineTo(px + T - 1, py + T - 1).stroke({ color: 0x0a0806, width: 0.4, alpha: 0.15 });
        g.moveTo(px + T - 1, py + 1).lineTo(px + T - 1, py + T - 1).stroke({ color: 0x0a0806, width: 0.4, alpha: 0.1 });

        // Selection highlight — animated diamond frame
        if (tile.selected) {
          const sp = 0.5 + Math.sin(t / 300) * 0.2;
          g.moveTo(cx, py + 2).lineTo(px + T - 2, cy).lineTo(cx, py + T - 2).lineTo(px + 2, cy).closePath().stroke({ color: 0xffffff, width: 2, alpha: sp });
          g.rect(px, py, T, T).fill({ color: 0xffffff, alpha: 0.06 });
        }

        // Match flash with expanding ring
        if (tile.matched) {
          g.rect(px, py, T, T).fill({ color: 0xffffff, alpha: 0.3 });
          g.circle(cx, cy, T * 0.4).fill({ color: ing.color, alpha: 0.2 });
          continue;
        }

        // Ingredient orb — faceted gem with depth
        const orbR = (T * 0.32) * s;

        // Shadow beneath orb
        g.ellipse(cx + 1, cy + orbR + 3, orbR * 0.7, 2.5).fill({ color: 0x000000, alpha: 0.2 });

        // Outer glow (3 graduated layers)
        g.circle(cx, cy, orbR + 8).fill({ color: ing.color, alpha: 0.025 });
        g.circle(cx, cy, orbR + 5).fill({ color: ing.color, alpha: 0.04 });
        g.circle(cx, cy, orbR + 2.5).fill({ color: ing.color, alpha: 0.06 });

        // Main orb body
        g.circle(cx, cy, orbR).fill({ color: ing.color, alpha: 0.85 });

        // Faceted shine — top-left quadrant (bezier polygon)
        g.moveTo(cx, cy - orbR).bezierCurveTo(cx - orbR * 0.8, cy - orbR * 0.8, cx - orbR, cy, cx - orbR * 0.3, cy + orbR * 0.2);
        g.lineTo(cx, cy).closePath().fill({ color: 0xffffff, alpha: 0.1 });
        // Secondary facet — top-right (smaller)
        g.moveTo(cx + orbR * 0.1, cy - orbR * 0.9);
        g.bezierCurveTo(cx + orbR * 0.5, cy - orbR * 0.7, cx + orbR * 0.7, cy - orbR * 0.2, cx + orbR * 0.3, cy);
        g.lineTo(cx, cy).closePath().fill({ color: 0xffffff, alpha: 0.04 });

        // Multi-segment inner highlight arcs (3 arcs at different angles)
        g.moveTo(cx - orbR * 0.5, cy - orbR * 0.3);
        g.bezierCurveTo(cx - orbR * 0.3, cy - orbR * 0.7, cx + orbR * 0.1, cy - orbR * 0.75, cx + orbR * 0.2, cy - orbR * 0.4);
        g.stroke({ color: 0xffffff, width: 1, alpha: 0.2 });
        g.moveTo(cx - orbR * 0.4, cy - orbR * 0.15);
        g.bezierCurveTo(cx - orbR * 0.2, cy - orbR * 0.5, cx + orbR * 0.05, cy - orbR * 0.5, cx + orbR * 0.1, cy - orbR * 0.2);
        g.stroke({ color: 0xffffff, width: 0.6, alpha: 0.1 });

        // Sparkle dots (2 at different positions)
        g.circle(cx - orbR * 0.3, cy - orbR * 0.35, 1.5 * s).fill({ color: 0xffffff, alpha: 0.28 });
        g.circle(cx + orbR * 0.15, cy - orbR * 0.45, 0.8 * s).fill({ color: 0xffffff, alpha: 0.15 });

        // Border ring (triple)
        g.circle(cx, cy, orbR + 0.5).stroke({ color: 0xffffff, width: 0.8, alpha: 0.1 });
        g.circle(cx, cy, orbR).stroke({ color: 0xffffff, width: 0.5, alpha: 0.08 });
        g.circle(cx, cy, orbR - 1.5).stroke({ color: ing.color, width: 0.4, alpha: 0.15 });

        // Element-specific inner detail
        if (tile.type === "fire") {
          // Tiny flame inside
          g.moveTo(cx - 2, cy + 2).bezierCurveTo(cx - 1, cy - 3, cx + 1, cy - 3, cx + 2, cy + 2).fill({ color: 0xffaa22, alpha: 0.3 });
        } else if (tile.type === "water") {
          // Droplet inside
          g.moveTo(cx, cy - 3).bezierCurveTo(cx - 3, cy + 1, cx + 3, cy + 1, cx, cy - 3).fill({ color: 0x88ccff, alpha: 0.2 });
        } else if (tile.type === "crystal") {
          // Faceted diamond inside
          g.moveTo(cx, cy - 3).lineTo(cx + 2.5, cy).lineTo(cx, cy + 2.5).lineTo(cx - 2.5, cy).closePath().stroke({ color: 0xffffff, width: 0.5, alpha: 0.25 });
        } else if (tile.type === "shadow") {
          // Swirl inside
          g.moveTo(cx - 2, cy).bezierCurveTo(cx - 1, cy - 2, cx + 1, cy - 1, cx + 2, cy).bezierCurveTo(cx + 1, cy + 2, cx - 1, cy + 1, cx - 2, cy).stroke({ color: 0x000000, width: 0.5, alpha: 0.2 });
        } else if (tile.type === "light") {
          // Star burst
          for (let si = 0; si < 4; si++) {
            const sa = si * Math.PI / 2 + Math.PI / 4;
            g.moveTo(cx, cy).lineTo(cx + Math.cos(sa) * 3, cy + Math.sin(sa) * 3).stroke({ color: 0xffffff, width: 0.3, alpha: 0.2 });
          }
        }

        // Cursed tile overlay
        if (tile.cursed) {
          g.rect(px + 2, py + 2, T - 4, T - 4).fill({ color: 0x440044, alpha: 0.25 });
          // Curse chains (X pattern)
          g.moveTo(px + 4, py + 4).lineTo(px + T - 4, py + T - 4).stroke({ color: 0xaa44ff, width: 1.5, alpha: 0.4 });
          g.moveTo(px + T - 4, py + 4).lineTo(px + 4, py + T - 4).stroke({ color: 0xaa44ff, width: 1.5, alpha: 0.4 });
          g.circle(cx, cy, orbR + 3).stroke({ color: 0xaa44ff, width: 1, alpha: 0.3 });
        }
        // Frozen tile overlay
        if (tile.frozen > 0) {
          g.rect(px + 1, py + 1, T - 2, T - 2).fill({ color: 0x4488cc, alpha: 0.2 });
          g.rect(px + 1, py + 1, T - 2, T - 2).stroke({ color: 0x88ccff, width: 1.5, alpha: 0.4 });
          // Ice crystal pattern
          g.moveTo(cx, py + 3).lineTo(cx, py + T - 3).stroke({ color: 0x88ccff, width: 0.5, alpha: 0.3 });
          g.moveTo(px + 3, cy).lineTo(px + T - 3, cy).stroke({ color: 0x88ccff, width: 0.5, alpha: 0.3 });
          // Freeze count
          const fText = new Text({ text: `${tile.frozen}`, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0x88ccff, fontWeight: "bold" }) });
          fText.anchor.set(0.5, 0.5); fText.position.set(cx, cy);
          this._uiGfx.addChild(fText);
        }
        // Special tile indicator overlay
        if (tile.special === "bomb") {
          g.circle(cx, cy, orbR + 2).stroke({ color: 0xff6622, width: 1.5, alpha: 0.5 });
          g.moveTo(cx - 3, cy - 3).lineTo(cx + 3, cy + 3).stroke({ color: 0xff6622, width: 1, alpha: 0.4 });
          g.moveTo(cx + 3, cy - 3).lineTo(cx - 3, cy + 3).stroke({ color: 0xff6622, width: 1, alpha: 0.4 });
        } else if (tile.special === "column_clear") {
          g.moveTo(cx, cy - orbR - 4).lineTo(cx, cy + orbR + 4).stroke({ color: 0x44ccff, width: 1.5, alpha: 0.5 });
          g.circle(cx, cy - orbR - 3, 2).fill({ color: 0x44ccff, alpha: 0.4 });
          g.circle(cx, cy + orbR + 3, 2).fill({ color: 0x44ccff, alpha: 0.4 });
        }
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

    // Panel background with texture
    u.roundRect(px - 5, py - 5, pw + 10, ph + 10, 7).fill({ color: 0x000000, alpha: 0.2 }); // shadow
    u.roundRect(px - 4, py - 4, pw + 8, ph + 8, 6).fill({ color: 0x0a0806, alpha: 0.75 });
    // Stone texture
    for (let row = 0; row < Math.ceil(ph / 14); row++) {
      u.moveTo(px, py + row * 14).lineTo(px + pw, py + row * 14).stroke({ color: COL, width: 0.2, alpha: 0.03 });
    }
    // Double border
    u.roundRect(px - 4, py - 4, pw + 8, ph + 8, 6).stroke({ color: COL, width: 1.5, alpha: 0.3 });
    u.roundRect(px - 2, py - 2, pw + 4, ph + 4, 5).stroke({ color: COL, width: 0.5, alpha: 0.1 });
    // Corner dots
    for (const [cx, cy] of [[px, py], [px + pw, py], [px, py + ph], [px + pw, py + ph]]) {
      u.circle(cx, cy, 2).fill({ color: COL, alpha: 0.2 });
    }

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
      const cw = pw - 8;

      // Card drop shadow
      u.roundRect(px + 6, iy + 2, cw, 54, 5).fill({ color: 0x000000, alpha: 0.2 });
      // Card body
      u.roundRect(px + 4, iy, cw, 54, 5).fill({ color: canServe ? 0x141a10 : 0x121008, alpha: 0.7 });
      u.roundRect(px + 4, iy, cw, 54, 5).stroke({ color: canServe ? 0x44aa44 : 0x444433, width: canServe ? 1.5 : 0.5, alpha: 0.5 });
      // Top accent bar
      if (canServe) u.moveTo(px + 10, iy + 1).lineTo(px + cw - 6, iy + 1).stroke({ color: 0x44aa44, width: 1, alpha: 0.25 });
      // Left color bar (recipe color)
      u.rect(px + 4, iy + 4, 3, 46).fill({ color: cust.recipe.color, alpha: 0.4 });

      // Name
      this._addText(cust.name, px + 14, iy + 3, { fontSize: 9, fill: 0xccbbaa, fontWeight: "bold" });
      // Recipe name + color dot
      u.circle(px + 14, iy + 18, 3).fill({ color: cust.recipe.color, alpha: 0.6 });
      this._addText(cust.recipe.name, px + 22, iy + 14, { fontSize: 8, fill: cust.recipe.color });
      // Ingredients needed with have/need indicators
      let ingX = px + 12;
      for (const [itype, icount] of cust.recipe.ingredients) {
        const ic = INGREDIENTS[itype];
        const have = state.collected.get(itype) ?? 0;
        const enough = have >= icount;
        // Orb with checkmark/cross indicator
        u.circle(ingX + 4, iy + 30, 4).fill({ color: ic.color, alpha: enough ? 0.7 : 0.3 });
        u.circle(ingX + 4, iy + 30, 4).stroke({ color: enough ? 0x44ff44 : 0xff4444, width: 0.8, alpha: 0.4 });
        // Have / Need text
        this._addText(`${have}/${icount}`, ingX + 10, iy + 26, { fontSize: 8, fill: enough ? 0x44cc44 : 0xcc6644, fontWeight: enough ? "bold" : "normal" });
        ingX += 28;
      }

      // Patience bar — segmented with frame
      const pbW = cw - 14, pbH = 4;
      u.rect(px + 8, iy + 42, pbW, pbH).fill({ color: 0x1a0a0a });
      u.rect(px + 8, iy + 42, pbW, pbH).stroke({ color: 0x333322, width: 0.5 });
      const pFill = cust.patience / cust.maxPatience;
      const pColor = pFill > 0.5 ? 0x44aa44 : pFill > 0.25 ? 0xccaa22 : 0xff4444;
      u.rect(px + 8, iy + 42, pbW * pFill, pbH).fill({ color: pColor });
      // Critical pulse
      if (pFill < 0.25) {
        u.rect(px + 8, iy + 41, pbW * pFill, pbH + 2).fill({ color: 0xff0000, alpha: 0.05 + Math.sin(Date.now() / 150) * 0.03 });
      }
      // Segment lines with tick marks
      for (let si = 1; si < 4; si++) {
        const sx = px + 8 + si * pbW / 4;
        u.moveTo(sx, iy + 41).lineTo(sx, iy + 42 + pbH + 1).stroke({ color: 0x000000, width: 0.5, alpha: 0.25 });
        // Tiny tick above bar
        u.moveTo(sx, iy + 40).lineTo(sx, iy + 41).stroke({ color: 0x444433, width: 0.3, alpha: 0.2 });
      }
      // End caps (rounded edges on bar frame)
      u.circle(px + 8, iy + 42 + pbH / 2, pbH / 2).fill({ color: 0x1a0a0a, alpha: 0.3 });
      u.circle(px + 8 + pbW, iy + 42 + pbH / 2, pbH / 2).fill({ color: 0x1a0a0a, alpha: 0.3 });

      // Value badge
      u.roundRect(px + cw - 30, iy + 2, 26, 12, 2).fill({ color: 0x222200, alpha: 0.5 });
      this._addText(`${cust.recipe.value}g`, px + cw - 17, iy + 3, { fontSize: 8, fill: 0xffd700, fontWeight: "bold" }, true);

      // Serve button (richer)
      if (canServe) {
        u.roundRect(px + cw - 48, iy + 20, 42, 18, 3).fill({ color: 0x1a2a1a, alpha: 0.7 });
        u.roundRect(px + cw - 48, iy + 20, 42, 18, 3).stroke({ color: 0x44aa44, width: 1.2, alpha: 0.6 });
        u.roundRect(px + cw - 47, iy + 21, 40, 8, 3).fill({ color: 0xffffff, alpha: 0.02 }); // button highlight
        const btn = new Graphics();
        btn.roundRect(px + cw - 48, iy + 20, 42, 18, 3).fill({ color: 0x000000, alpha: 0.01 });
        btn.eventMode = "static"; btn.cursor = "pointer";
        const custId = cust.id;
        btn.on("pointerdown", () => this._serveCallback?.(custId));
        this._uiGfx.addChild(btn);
        this._addText("\u2697 BREW", px + cw - 27, iy + 23, { fontSize: 7, fill: 0x44ff44, fontWeight: "bold" }, true);
      }

      iy += 60;
    }

    // Power-ups display
    const puY = py + ph - 100;
    u.moveTo(px + 10, puY).lineTo(px + pw - 10, puY).stroke({ color: COL, width: 0.5, alpha: 0.15 });
    this._addText("Power-ups", px + pw / 2, puY + 3, { fontSize: 9, fill: 0xccaa88, fontWeight: "bold" }, true);
    this._addText(`Q: Shuffle (${state.shufflesRemaining})`, px + 8, puY + 16, { fontSize: 8, fill: state.shufflesRemaining > 0 ? 0xffaa44 : 0x555544 });
    this._addText(`W: +30s (${state.timeExtensions})`, px + 8, puY + 28, { fontSize: 8, fill: state.timeExtensions > 0 ? 0x44ccff : 0x555544 });
    this._addText(`E: Magnet (${state.magnetsRemaining})`, px + 8, puY + 40, { fontSize: 8, fill: state.magnetsRemaining > 0 ? 0xaa44ff : 0x555544 });

    // Log (bottom)
    const logY = py + ph - 50;
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
