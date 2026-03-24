// ---------------------------------------------------------------------------
// Phantom — PixiJS Renderer (v3)
// Wall-clipped vision, peek indicator, upgrade shop, floor modifiers
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { PhantomPhase, TileType, GuardState, GuardType, StealthRating, FloorModifier } from "../types";
import type { PhantomState, PhantomMeta, Guard } from "../types";
import { PHANTOM_BALANCE as B } from "../config/PhantomBalance";
import { DIR_DX, DIR_DY } from "../systems/PhantomGameSystem";

// ---------------------------------------------------------------------------
// Text styles
// ---------------------------------------------------------------------------

const STYLE_TITLE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 48, fill: B.COLOR_PLAYER,
  fontWeight: "bold", letterSpacing: 8,
  dropShadow: { color: 0x000000, distance: 4, angle: Math.PI / 4, blur: 6, alpha: 0.7 },
});
const STYLE_SUBTITLE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 16, fill: 0x8888aa, fontStyle: "italic",
});
const STYLE_CONTROLS = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0x667788, lineHeight: 18,
});
const STYLE_META = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 14, fill: 0x666688, lineHeight: 22,
});
const STYLE_HUD = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: B.COLOR_TEXT, fontWeight: "bold",
});
const STYLE_HUD_RIGHT = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: B.COLOR_GOLD, fontWeight: "bold",
});
const STYLE_HUD_ABILITIES = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0x8888aa,
});
const STYLE_FLOOR_CLEAR = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 40, fill: B.COLOR_SUCCESS, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 3, angle: Math.PI / 4, blur: 4, alpha: 0.7 },
});
const STYLE_CAUGHT = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 36, fill: B.COLOR_DANGER, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 3, angle: Math.PI / 4, blur: 4, alpha: 0.7 },
});
const STYLE_GAME_OVER = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 44, fill: B.COLOR_DANGER, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 3, angle: Math.PI / 4, blur: 4, alpha: 0.7 },
});
const STYLE_STATS = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 15, fill: 0xcccccc, lineHeight: 24,
});
const STYLE_PROMPT = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 20, fill: B.COLOR_GOLD, fontWeight: "bold",
});
const STYLE_PAUSE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 36, fill: B.COLOR_GOLD, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 2, angle: Math.PI / 4, blur: 3, alpha: 0.5 },
});
const STYLE_FLOAT = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xffffff, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 1, angle: Math.PI / 4, blur: 2, alpha: 0.8 },
});
const STYLE_VICTORY = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 48, fill: B.COLOR_GOLD, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 4, angle: Math.PI / 4, blur: 6, alpha: 0.7 },
});
const STYLE_RATING = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 28, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 2, angle: Math.PI / 4, blur: 3, alpha: 0.6 },
});

const FLOAT_POOL_SIZE = 16;

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export class PhantomRenderer {
  readonly container = new Container();

  private _gfx = new Graphics();
  private _uiGfx = new Graphics();
  private _hudText = new Text({ text: "", style: STYLE_HUD });
  private _hudRightText = new Text({ text: "", style: STYLE_HUD_RIGHT });
  private _hudAbilities = new Text({ text: "", style: STYLE_HUD_ABILITIES });
  private _titleText = new Text({ text: "PHANTOM", style: STYLE_TITLE });
  private _subtitleText = new Text({ text: "Stealth through the castle. Collect the relics. Escape.", style: STYLE_SUBTITLE });
  private _controlsText = new Text({ text: "", style: STYLE_CONTROLS });
  private _metaText = new Text({ text: "", style: STYLE_META });
  private _startPrompt = new Text({ text: "Press SPACE to infiltrate", style: STYLE_PROMPT });
  private _floorClearText = new Text({ text: "FLOOR CLEAR", style: STYLE_FLOOR_CLEAR });
  private _ratingText = new Text({ text: "", style: STYLE_RATING });
  private _caughtText = new Text({ text: "CAUGHT!", style: STYLE_CAUGHT });
  private _gameOverText = new Text({ text: "EXPOSED", style: STYLE_GAME_OVER });
  private _victoryText = new Text({ text: "PHANTOM MASTER", style: STYLE_VICTORY });
  private _statsText = new Text({ text: "", style: STYLE_STATS });
  private _promptText = new Text({ text: "", style: STYLE_PROMPT });
  private _pauseText = new Text({ text: "PAUSED", style: STYLE_PAUSE });
  private _modifierText = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: B.COLOR_MODIFIER, fontWeight: "bold" }) });
  private _shopText = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xaaaacc, lineHeight: 18 }) });

  private _floatTexts: Text[] = [];
  private _floatContainer = new Container();

  private _cellSize = 0;
  private _offsetX = 0;
  private _offsetY = 0;

  build(): void {
    this.container.addChild(this._gfx);
    this.container.addChild(this._uiGfx);
    const uiElements = [
      this._hudText, this._hudRightText, this._hudAbilities,
      this._titleText, this._subtitleText, this._controlsText, this._metaText,
      this._startPrompt, this._floorClearText, this._ratingText,
      this._caughtText, this._gameOverText, this._victoryText,
      this._statsText, this._promptText, this._pauseText,
      this._modifierText, this._shopText,
    ];
    for (const el of uiElements) this.container.addChild(el);

    for (let i = 0; i < FLOAT_POOL_SIZE; i++) {
      const t = new Text({ text: "", style: STYLE_FLOAT });
      t.anchor.set(0.5); t.visible = false;
      this._floatTexts.push(t);
      this._floatContainer.addChild(t);
    }
    this.container.addChild(this._floatContainer);

    this._controlsText.text =
      "WASD / Arrows — Move           Q — Shadow Dash (teleport to shadow)\n" +
      "T — Quick throw stone           E — Smoke Bomb (create shadow cloud)\n" +
      "[ / ] — Adjust throw distance   Shift — Peek ahead\n" +
      "SPACE — Wait   ESC — Pause     Backstab: move behind a guard";
  }

  destroy(): void {
    this.container.removeChildren();
    this._gfx.destroy(); this._uiGfx.destroy();
    this._floatTexts.forEach(t => t.destroy());
    this._floatTexts = [];
  }

  render(s: PhantomState, sw: number, sh: number, meta: PhantomMeta): void {
    this._tiles = s.tiles; this._cols = s.cols; this._rows = s.rows;
    this._cellSize = B.CELL_SIZE;
    // Smooth camera follows interpolated player position
    const camFrac = Math.min(1, s.moveFraction);
    const camEase = camFrac < 1 ? camFrac * (2 - camFrac) : 1;
    const camPlayerX = s.prevPlayerX + (s.playerX - s.prevPlayerX) * camEase;
    const camPlayerY = s.prevPlayerY + (s.playerY - s.prevPlayerY) * camEase;
    const camX = camPlayerX * this._cellSize;
    const camY = camPlayerY * this._cellSize;
    this._offsetX = Math.floor(sw / 2 - camX);
    this._offsetY = Math.floor(sh / 2 - camY);

    let shakeX = 0, shakeY = 0;
    if (s.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * B.SHAKE_INTENSITY * 2;
      shakeY = (Math.random() - 0.5) * B.SHAKE_INTENSITY * 2;
    }

    const g = this._gfx;
    g.clear();
    g.rect(0, 0, sw, sh).fill(B.COLOR_BG);

    const ox = this._offsetX + shakeX;
    const oy = this._offsetY + shakeY;
    const cs = this._cellSize;

    const minCol = Math.max(0, Math.floor(-ox / cs) - 1);
    const maxCol = Math.min(s.cols - 1, Math.floor((sw - ox) / cs) + 1);
    const minRow = Math.max(0, Math.floor(-oy / cs) - 1);
    const maxRow = Math.min(s.rows - 1, Math.floor((sh - oy) / cs) + 1);

    // ----- Torch light map (calculate which tiles are lit) -----
    const litStrength: number[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      litStrength[r] = [];
      for (let c = minCol; c <= maxCol; c++) litStrength[r][c] = 0;
    }
    for (const torch of s.torches) {
      const flicker = 0.85 + 0.15 * Math.sin(s.time * 3 + torch.flicker);
      const tr = Math.ceil(torch.radius * flicker);
      for (let dy = -tr; dy <= tr; dy++) {
        for (let dx = -tr; dx <= tr; dx++) {
          const ty = torch.y + dy, tx = torch.x + dx;
          if (ty < minRow || ty > maxRow || tx < minCol || tx > maxCol) continue;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= torch.radius * flicker) {
            const strength = (1 - d / (torch.radius * flicker)) * 0.5;
            if (!litStrength[ty]) litStrength[ty] = [];
            litStrength[ty][tx] = Math.min(1, (litStrength[ty][tx] || 0) + strength);
          }
        }
      }
    }

    // ----- Draw tiles (v2 — enhanced depth & detail) -----
    // Seeded hash for deterministic floor detail
    const tileHash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) & 0xffff;

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (!s.revealed[r][c]) continue;
        const tile = s.tiles[r][c];
        const px = ox + c * cs, py = oy + r * cs;

        const pdist = Math.sqrt((c - s.playerX) ** 2 + (r - s.playerY) ** 2);
        const fog = Math.min(1, pdist / 10);
        const torchLight = litStrength[r]?.[c] || 0;
        const hasSmoke = s.smokeTiles.some(sm => sm.x === c && sm.y === r);
        const h = tileHash(c, r);

        switch (tile) {
          case TileType.WALL: {
            // 3D wall: top face (lighter), front face (darker), brick lines
            const isFloorBelow = r < s.rows - 1 && s.tiles[r + 1]?.[c] !== TileType.WALL;
            let wallBase = lerpColor(B.COLOR_WALL, B.COLOR_BG, fog * 0.5);
            let wallTop = lerpColor(B.COLOR_WALL_TOP, B.COLOR_BG, fog * 0.4);
            if (torchLight > 0) {
              wallBase = lerpColor(wallBase, B.COLOR_TORCH_GLOW, torchLight * 0.25);
              wallTop = lerpColor(wallTop, B.COLOR_TORCH, torchLight * 0.35);
            }
            // Top face (lighter)
            g.rect(px, py, cs, cs * 0.4).fill(wallTop);
            // Front face (darker)
            g.rect(px, py + cs * 0.4, cs, cs * 0.6).fill(wallBase);
            // Brick mortar lines (horizontal)
            const darkLine = lerpColor(wallBase, 0x000000, 0.3);
            g.rect(px, py + cs * 0.4, cs, 1).fill({ color: darkLine, alpha: 0.4 });
            // Vertical mortar (offset per row for brick pattern)
            const brickOffset = (r % 2 === 0) ? cs * 0.5 : 0;
            g.rect(px + brickOffset, py, 1, cs).fill({ color: darkLine, alpha: 0.2 });
            if (brickOffset === 0) g.rect(px + cs * 0.5, py, 1, cs).fill({ color: darkLine, alpha: 0.2 });
            // Bottom edge shadow if floor below
            if (isFloorBelow) {
              g.rect(px, py + cs - 1, cs, 3).fill({ color: 0x000000, alpha: 0.4 });
            }
            // Subtle highlight on top edge
            g.rect(px, py, cs, 1).fill({ color: 0xffffff, alpha: 0.06 });
            break;
          }
          case TileType.FLOOR: {
            let floorColor: number = (c + r) % 2 === 0 ? B.COLOR_FLOOR : B.COLOR_FLOOR_ALT;
            floorColor = lerpColor(floorColor, B.COLOR_BG, fog * 0.45);
            if (torchLight > 0) floorColor = lerpColor(floorColor, B.COLOR_TORCH_GLOW, torchLight * 0.2);
            g.rect(px, py, cs, cs).fill(floorColor);
            // Stone tile grooves
            g.rect(px, py, cs, 1).fill({ color: 0x000000, alpha: 0.08 });
            g.rect(px, py, 1, cs).fill({ color: 0x000000, alpha: 0.08 });
            // Random floor details: cracks, pebbles, moss
            const detail = h % 20;
            if (detail < 3) {
              // Crack
              const cx1 = px + (h % 7) * 3 + 2, cy1 = py + (h % 5) * 4 + 2;
              g.moveTo(cx1, cy1).lineTo(cx1 + 6, cy1 + 8).lineTo(cx1 + 4, cy1 + 12)
                .stroke({ color: 0x000000, width: 1, alpha: 0.12 });
            } else if (detail < 5) {
              // Small pebble
              g.circle(px + (h % 11) + 8, py + ((h >> 4) % 11) + 8, 1.5)
                .fill({ color: lerpColor(floorColor, 0x444466, 0.3), alpha: 0.5 });
            } else if (detail < 6 && torchLight < 0.1) {
              // Moss patch (only in dark areas)
              g.circle(px + (h % 9) + 6, py + ((h >> 3) % 9) + 6, 3)
                .fill({ color: 0x1a2a1a, alpha: 0.3 });
            }
            break;
          }
          case TileType.SHADOW: {
            g.rect(px, py, cs, cs).fill(B.COLOR_SHADOW);
            // Animated shadow wisps
            const w1 = Math.sin(s.time * 1.5 + c * 0.7) * 3;
            const w2 = Math.cos(s.time * 1.2 + r * 0.9) * 3;
            g.circle(px + cs * 0.3 + w1, py + cs * 0.4 + w2, 4).fill({ color: B.COLOR_SHADOW_GLOW, alpha: 0.2 });
            g.circle(px + cs * 0.7 - w2, py + cs * 0.6 + w1, 3).fill({ color: B.COLOR_SHADOW_GLOW, alpha: 0.15 });
            // Edge glow
            g.rect(px, py, 2, cs).fill({ color: B.COLOR_SHADOW_GLOW, alpha: 0.15 });
            g.rect(px + cs - 2, py, 2, cs).fill({ color: B.COLOR_SHADOW_GLOW, alpha: 0.15 });
            break;
          }
          case TileType.EXIT: {
            const exitColor = s.exitOpen ? B.COLOR_EXIT_OPEN : B.COLOR_EXIT_CLOSED;
            g.rect(px, py, cs, cs).fill(lerpColor(exitColor, B.COLOR_BG, fog * 0.35));
            if (s.exitOpen) {
              // Swirling portal effect
              const pulse = s.time * 3;
              for (let ri = 0; ri < 3; ri++) {
                const a = pulse + ri * Math.PI * 2 / 3;
                const er = cs * 0.3 + Math.sin(pulse + ri) * 2;
                g.circle(px + cs / 2 + Math.cos(a) * er * 0.5, py + cs / 2 + Math.sin(a) * er * 0.5, 2)
                  .fill({ color: 0xffffff, alpha: 0.4 });
              }
              // Central glow
              g.circle(px + cs / 2, py + cs / 2, cs * 0.35).fill({ color: exitColor, alpha: 0.2 + 0.1 * Math.sin(s.time * 4) });
              // Staircase icon
              g.rect(px + cs * 0.25, py + cs * 0.6, cs * 0.15, cs * 0.15).fill({ color: 0xffffff, alpha: 0.3 });
              g.rect(px + cs * 0.4, py + cs * 0.45, cs * 0.15, cs * 0.3).fill({ color: 0xffffff, alpha: 0.25 });
              g.rect(px + cs * 0.55, py + cs * 0.3, cs * 0.15, cs * 0.45).fill({ color: 0xffffff, alpha: 0.2 });
            } else {
              // Sealed gate
              g.rect(px + 4, py + 4, cs - 8, cs - 8).stroke({ color: 0x555566, width: 1, alpha: 0.4 });
              g.rect(px + cs * 0.35, py + cs * 0.35, cs * 0.3, cs * 0.3).fill({ color: 0x333344, alpha: 0.5 });
            }
            break;
          }
          case TileType.RELIC: {
            // Floor underneath
            let rf = lerpColor(B.COLOR_FLOOR, B.COLOR_BG, fog * 0.45);
            if (torchLight > 0) rf = lerpColor(rf, B.COLOR_TORCH_GLOW, torchLight * 0.2);
            g.rect(px, py, cs, cs).fill(rf);
            const rcx = px + cs / 2, rcy = py + cs / 2;
            const rr = cs * 0.3;
            const pulse2 = 0.6 + 0.4 * Math.sin(s.time * 3 + c + r);
            // Glow halo
            g.circle(rcx, rcy, rr * 2).fill({ color: B.COLOR_RELIC_GLOW, alpha: 0.08 * pulse2 });
            g.circle(rcx, rcy, rr * 1.3).fill({ color: B.COLOR_RELIC_GLOW, alpha: 0.15 * pulse2 });
            // Orbiting sparkles
            for (let si = 0; si < 4; si++) {
              const sa = s.time * 2 + si * Math.PI / 2 + c;
              const sr = rr * 1.2;
              g.circle(rcx + Math.cos(sa) * sr, rcy + Math.sin(sa) * sr, 1)
                .fill({ color: 0xffffff, alpha: 0.4 + 0.3 * Math.sin(s.time * 5 + si) });
            }
            // Diamond relic
            g.star(rcx, rcy, 4, rr * pulse2, rr * 0.5 * pulse2).fill(B.COLOR_RELIC);
            // Highlight spot
            g.circle(rcx - rr * 0.2, rcy - rr * 0.2, rr * 0.15).fill({ color: 0xffffff, alpha: 0.5 });
            break;
          }
          case TileType.TRAP: {
            const tf = lerpColor(B.COLOR_FLOOR, B.COLOR_BG, fog * 0.45);
            g.rect(px, py, cs, cs).fill(tf);
            // Pressure plate with beveled edge
            g.rect(px + 4, py + 4, cs - 8, cs - 8).fill({ color: B.COLOR_TRAP, alpha: 0.25 });
            g.rect(px + 4, py + 4, cs - 8, 1).fill({ color: 0xffffff, alpha: 0.08 }); // top bevel
            g.rect(px + 4, py + cs - 5, cs - 8, 1).fill({ color: 0x000000, alpha: 0.15 }); // bottom shadow
            // Cross warning
            g.moveTo(px + 6, py + 6).lineTo(px + cs - 6, py + cs - 6).stroke({ color: B.COLOR_TRAP, width: 1, alpha: 0.3 });
            g.moveTo(px + cs - 6, py + 6).lineTo(px + 6, py + cs - 6).stroke({ color: B.COLOR_TRAP, width: 1, alpha: 0.3 });
            break;
          }
          case TileType.DISTRACTION: {
            const sf = lerpColor(B.COLOR_FLOOR, B.COLOR_BG, fog * 0.45);
            g.rect(px, py, cs, cs).fill(sf);
            // Stone with highlight and shadow
            g.circle(px + cs / 2, py + cs / 2 + 1, cs * 0.2).fill({ color: 0x000000, alpha: 0.15 }); // shadow
            g.circle(px + cs / 2, py + cs / 2, cs * 0.2).fill(B.COLOR_STONE_PICKUP);
            g.circle(px + cs / 2 - 2, py + cs / 2 - 2, cs * 0.08).fill({ color: 0xffffff, alpha: 0.25 }); // highlight
            break;
          }
          case TileType.LOCKED_DOOR: {
            // Wooden door with planks and iron banding
            g.rect(px, py, cs, cs).fill(B.COLOR_LOCKED_DOOR);
            // Vertical planks
            for (let pl = 0; pl < 3; pl++) {
              const plx = px + 3 + pl * Math.floor((cs - 6) / 3);
              g.rect(plx, py + 3, 1, cs - 6).fill({ color: 0x000000, alpha: 0.2 });
            }
            // Iron bands (horizontal)
            g.rect(px + 2, py + cs * 0.25, cs - 4, 3).fill(B.COLOR_LOCKED_DOOR_FRAME);
            g.rect(px + 2, py + cs * 0.65, cs - 4, 3).fill(B.COLOR_LOCKED_DOOR_FRAME);
            // Lock (circle + keyhole)
            g.circle(px + cs / 2, py + cs / 2, cs * 0.14).fill(B.COLOR_KEY);
            g.circle(px + cs / 2, py + cs / 2, cs * 0.08).fill({ color: 0x000000, alpha: 0.4 }); // keyhole
            g.rect(px + cs / 2 - 1, py + cs / 2, 2, cs * 0.12).fill({ color: 0x000000, alpha: 0.4 });
            // Frame
            g.rect(px, py, cs, 2).fill(B.COLOR_LOCKED_DOOR_FRAME);
            g.rect(px, py + cs - 2, cs, 2).fill(B.COLOR_LOCKED_DOOR_FRAME);
            g.rect(px, py, 2, cs).fill(B.COLOR_LOCKED_DOOR_FRAME);
            g.rect(px + cs - 2, py, 2, cs).fill(B.COLOR_LOCKED_DOOR_FRAME);
            break;
          }
          case TileType.KEY: {
            const kf = lerpColor(B.COLOR_FLOOR, B.COLOR_BG, fog * 0.45);
            g.rect(px, py, cs, cs).fill(kf);
            const kpulse = 0.7 + 0.3 * Math.sin(s.time * 2.5 + c);
            // Glow
            g.circle(px + cs / 2, py + cs / 2, cs * 0.4).fill({ color: B.COLOR_KEY, alpha: 0.08 * kpulse });
            // Key: ring + shaft + teeth
            const kcx = px + cs / 2, kcy = py + cs / 2 - 2;
            g.circle(kcx - 3, kcy, cs * 0.12 * kpulse).stroke({ color: B.COLOR_KEY, width: 2 });
            g.rect(kcx - 1, kcy, cs * 0.35, 2).fill(B.COLOR_KEY);
            g.rect(kcx + cs * 0.2, kcy, 2, 4).fill(B.COLOR_KEY);
            g.rect(kcx + cs * 0.3, kcy, 2, 3).fill(B.COLOR_KEY);
            break;
          }
          case TileType.SMOKE:
            g.rect(px, py, cs, cs).fill(B.COLOR_SHADOW);
            break;
        }

        // Smoke overlay with swirl
        if (hasSmoke) {
          const sa1 = Math.sin(s.time * 2 + c * 0.7 + r * 1.3) * 0.1;
          g.rect(px, py, cs, cs).fill({ color: B.COLOR_SMOKE, alpha: 0.35 + sa1 });
          // Wispy circles
          const wx = Math.sin(s.time * 1.3 + c) * 4;
          const wy = Math.cos(s.time * 1.7 + r) * 3;
          g.circle(px + cs * 0.3 + wx, py + cs * 0.5 + wy, 5).fill({ color: 0x778899, alpha: 0.15 });
          g.circle(px + cs * 0.7 - wy, py + cs * 0.4 - wx, 4).fill({ color: 0x778899, alpha: 0.12 });
        }
      }
    }

    // ----- Wall decorations (cobwebs, banners, shields) -----
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (!s.revealed[r][c]) continue;
        if (s.tiles[r][c] !== TileType.WALL) continue;
        const px = ox + c * cs, py = oy + r * cs;
        const h = tileHash(c, r);
        const detail = h % 30;

        // Cobweb at wall corners where wall meets two adjacent floors
        const floorS = r < s.rows - 1 && s.tiles[r + 1]?.[c] !== TileType.WALL;
        const floorE = c < s.cols - 1 && s.tiles[r]?.[c + 1] !== TileType.WALL;
        const floorW = c > 0 && s.tiles[r]?.[c - 1] !== TileType.WALL;
        if (floorS && floorE && detail < 8) {
          // Bottom-right cobweb
          g.moveTo(px + cs, py + cs).lineTo(px + cs - 8, py + cs).stroke({ color: 0x555566, width: 0.5, alpha: 0.25 });
          g.moveTo(px + cs, py + cs).lineTo(px + cs, py + cs - 8).stroke({ color: 0x555566, width: 0.5, alpha: 0.25 });
          g.moveTo(px + cs, py + cs).lineTo(px + cs - 6, py + cs - 6).stroke({ color: 0x555566, width: 0.5, alpha: 0.2 });
        }
        if (floorS && floorW && detail >= 8 && detail < 16) {
          // Bottom-left cobweb
          g.moveTo(px, py + cs).lineTo(px + 8, py + cs).stroke({ color: 0x555566, width: 0.5, alpha: 0.25 });
          g.moveTo(px, py + cs).lineTo(px, py + cs - 8).stroke({ color: 0x555566, width: 0.5, alpha: 0.25 });
          g.moveTo(px, py + cs).lineTo(px + 6, py + cs - 6).stroke({ color: 0x555566, width: 0.5, alpha: 0.2 });
        }

        // Banner/shield on wall face (only on walls with floor below)
        if (floorS && detail >= 20 && detail < 23) {
          // Small banner (vertical stripe)
          const bannerColor = (h >> 8) % 2 === 0 ? 0x882244 : 0x224488;
          g.rect(px + cs * 0.35, py + cs * 0.45, cs * 0.3, cs * 0.45).fill({ color: bannerColor, alpha: 0.4 });
          g.rect(px + cs * 0.35, py + cs * 0.45, cs * 0.3, 2).fill({ color: 0x888888, alpha: 0.3 }); // rod
          // Banner point
          g.poly([px + cs * 0.35, py + cs * 0.9, px + cs * 0.5, py + cs, px + cs * 0.65, py + cs * 0.9])
            .fill({ color: bannerColor, alpha: 0.35 });
        } else if (floorS && detail >= 23 && detail < 25) {
          // Small shield
          g.circle(px + cs / 2, py + cs * 0.65, cs * 0.18).fill({ color: 0x666677, alpha: 0.3 });
          g.circle(px + cs / 2, py + cs * 0.65, cs * 0.18).stroke({ color: 0x888899, width: 1, alpha: 0.25 });
          g.circle(px + cs / 2, py + cs * 0.65, cs * 0.08).fill({ color: 0x888899, alpha: 0.2 }); // boss
        } else if (floorS && detail >= 25 && detail < 27) {
          // Wall crack
          g.moveTo(px + cs * 0.3, py + cs * 0.5).lineTo(px + cs * 0.5, py + cs * 0.7)
            .lineTo(px + cs * 0.45, py + cs * 0.85)
            .stroke({ color: 0x000000, width: 1, alpha: 0.15 });
        }
      }
    }

    // ----- Torch flames (animated teardrop + sparks) -----
    for (const torch of s.torches) {
      if (!s.revealed[torch.y]?.[torch.x]) continue;
      const tpx = ox + torch.x * cs + cs / 2;
      const tpy = oy + torch.y * cs + cs / 2;
      if (tpx < -cs * 2 || tpx > sw + cs * 2 || tpy < -cs * 2 || tpy > sh + cs * 2) continue;
      const fl = 0.7 + 0.3 * Math.sin(s.time * 5 + torch.flicker);
      const fl2 = 0.8 + 0.2 * Math.sin(s.time * 7 + torch.flicker * 2);
      // Outer glow
      g.circle(tpx, tpy, 8 * fl).fill({ color: B.COLOR_TORCH_GLOW, alpha: 0.12 });
      // Flame body (teardrop: wide bottom, narrow top)
      g.ellipse(tpx, tpy - 1, 3 * fl, 4 * fl).fill({ color: B.COLOR_TORCH, alpha: 0.85 });
      // Inner hot core
      g.ellipse(tpx, tpy, 1.5 * fl2, 2.5 * fl2).fill({ color: 0xffdd66, alpha: 0.7 });
      // Flame tip
      g.circle(tpx, tpy - 4 * fl, 1.2).fill({ color: 0xffeeaa, alpha: 0.5 * fl2 });
      // Spark particles (2-3 per torch, rotating)
      for (let sp = 0; sp < 2; sp++) {
        const sa = s.time * 3 + torch.flicker + sp * 3;
        const sr = 5 + Math.sin(sa * 2) * 3;
        g.circle(tpx + Math.cos(sa) * sr, tpy - 3 + Math.sin(sa) * sr * 0.5 - sp * 2, 0.8)
          .fill({ color: 0xffcc44, alpha: 0.4 + 0.3 * Math.sin(sa * 4) });
      }
      // Sconce bracket (small rect on wall)
      g.rect(tpx - 2, tpy + 3, 4, 2).fill({ color: 0x555555, alpha: 0.5 });
    }

    // ----- Guard vision cones / proximity rings -----
    if (s.phase === PhantomPhase.PLAYING || s.phase === PhantomPhase.CAUGHT) {
      for (const guard of s.guards) {
        if (guard.state === GuardState.STUNNED || guard.state === GuardState.KNOCKOUT) continue;
        if (guard.type === GuardType.HOUND) {
          this._drawProximityRing(g, guard, ox, oy, cs);
        } else {
          this._drawVisionCone(g, guard, ox, oy, cs);
        }
      }
    }

    // ----- Thrown stones -----
    for (const stone of s.thrownStones) {
      if (!stone.landed) {
        const t = 1 - stone.timer / B.STONE_FLY_TIME;
        const sx = stone.x + (stone.targetX - stone.x) * t;
        const sy = stone.y + (stone.targetY - stone.y) * t;
        g.circle(ox + sx * cs + cs / 2, oy + sy * cs + cs / 2, 3).fill(B.COLOR_STONE_THROWN);
      } else if (stone.noiseTimer > 0) {
        const npx = ox + stone.targetX * cs + cs / 2;
        const npy = oy + stone.targetY * cs + cs / 2;
        const progress = 1 - stone.noiseTimer / B.STONE_NOISE_DURATION;
        // Multiple expanding rings
        for (let ring = 0; ring < 3; ring++) {
          const rp = (progress + ring * 0.3) % 1;
          const rippleR = B.STONE_NOISE_RADIUS * cs * rp * 0.3;
          const alpha = (1 - rp) * 0.3;
          g.circle(npx, npy, rippleR).stroke({ color: B.COLOR_NOISE, width: 1, alpha });
        }
      }
    }

    // ----- Guards -----
    for (const guard of s.guards) {
      const gpx = ox + guard.x * cs, gpy = oy + guard.y * cs;
      if (gpx < -cs || gpx > sw + cs || gpy < -cs || gpy > sh + cs) continue;
      // Only draw if revealed
      if (!s.revealed[guard.y]?.[guard.x]) continue;

      let color: number;
      if (guard.state === GuardState.SLEEPING) {
        color = B.COLOR_SLEEPING;
      } else if (guard.state === GuardState.KNOCKOUT) {
        color = B.COLOR_GUARD_KO;
      } else if (guard.state === GuardState.STUNNED) {
        color = B.COLOR_GUARD_STUNNED;
      } else {
        switch (guard.type) {
          case GuardType.SENTRY: color = guard.state === GuardState.CHASE ? B.COLOR_GUARD_CHASE : guard.state === GuardState.ALERT ? B.COLOR_GUARD_ALERT : B.COLOR_SENTRY; break;
          case GuardType.HOUND: color = guard.state === GuardState.CHASE ? B.COLOR_GUARD_CHASE : guard.state === GuardState.ALERT ? B.COLOR_GUARD_ALERT : B.COLOR_HOUND; break;
          default: color = guard.state === GuardState.CHASE ? B.COLOR_GUARD_CHASE : guard.state === GuardState.ALERT ? B.COLOR_GUARD_ALERT : B.COLOR_GUARD; break;
        }
      }

      const gcx = gpx + cs / 2, gcy = gpy + cs / 2;

      // Guard body (enhanced detail)
      if (guard.type === GuardType.HOUND) {
        // Hound: body + ears + tail
        g.ellipse(gcx, gcy + 1, cs * 0.38, cs * 0.26).fill(color); // body shadow
        g.ellipse(gcx, gcy, cs * 0.38, cs * 0.26).fill(lerpColor(color, 0xffffff, 0.1));
        // Pointy ears
        g.poly([gcx - 7, gcy - 4, gcx - 4, gcy - 10, gcx - 1, gcy - 4]).fill(color);
        g.poly([gcx + 7, gcy - 4, gcx + 4, gcy - 10, gcx + 1, gcy - 4]).fill(color);
        // Snout
        const sdx = DIR_DX[guard.dir] * 6, sdy = DIR_DY[guard.dir] * 5;
        g.ellipse(gcx + sdx, gcy + sdy, 3, 2).fill(lerpColor(color, 0x000000, 0.2));
        // Eyes
        g.circle(gcx + sdx * 0.3 - 2, gcy + sdy * 0.3 - 2, 1.5).fill(0xffffff);
        g.circle(gcx + sdx * 0.3 + 2, gcy + sdy * 0.3 - 2, 1.5).fill(0xffffff);
      } else if (guard.type === GuardType.SENTRY) {
        // Sentry: shield body + helmet
        g.star(gcx, gcy + 1, 4, cs * 0.4, cs * 0.25).fill(lerpColor(color, 0x000000, 0.2)); // shadow
        g.star(gcx, gcy, 4, cs * 0.4, cs * 0.25).fill(color);
        // Shield border
        g.star(gcx, gcy, 4, cs * 0.4, cs * 0.25).stroke({ color: lerpColor(color, 0xffffff, 0.3), width: 1.5 });
        // Helmet visor slit
        g.rect(gcx - 4, gcy - 1, 8, 2).fill({ color: 0x000000, alpha: 0.4 });
      } else {
        // Patrol guard: body + helmet + weapon
        g.roundRect(gpx + 3, gpy + 4, cs - 6, cs - 6, 3).fill(lerpColor(color, 0x000000, 0.15)); // shadow
        g.roundRect(gpx + 3, gpy + 3, cs - 6, cs - 6, 3).fill(color);
        // Helmet (arc on top)
        g.roundRect(gpx + 5, gpy + 1, cs - 10, cs * 0.35, 4).fill(lerpColor(color, 0xffffff, 0.15));
        // Spear (line extending in facing direction)
        const wx = DIR_DX[guard.dir] * cs * 0.5, wy = DIR_DY[guard.dir] * cs * 0.5;
        g.moveTo(gcx + wx * 0.3, gcy + wy * 0.3).lineTo(gcx + wx * 1.1, gcy + wy * 1.1)
          .stroke({ color: 0x888888, width: 1.5, alpha: 0.5 });
      }

      // Direction indicator (eye dot)
      if (guard.state !== GuardState.KNOCKOUT && guard.state !== GuardState.SLEEPING && guard.type !== GuardType.HOUND) {
        const gdx = DIR_DX[guard.dir] * cs * 0.35;
        const gdy = DIR_DY[guard.dir] * cs * 0.35;
        g.circle(gcx + gdx, gcy + gdy, 2).fill(0xffffff);
      }

      // Sleeping indicator (zzz in blue)
      if (guard.state === GuardState.SLEEPING) {
        const zOff = Math.sin(s.time * 1.5) * 2;
        g.circle(gcx + 3, gcy - 7 + zOff, 2).fill({ color: B.COLOR_SLEEPING, alpha: 0.7 });
        g.circle(gcx + 7, gcy - 10 + zOff, 1.5).fill({ color: B.COLOR_SLEEPING, alpha: 0.5 });
        g.circle(gcx + 10, gcy - 12 + zOff, 1).fill({ color: B.COLOR_SLEEPING, alpha: 0.3 });
      }

      // KO indicator (zzz)
      if (guard.state === GuardState.KNOCKOUT) {
        const zOff = Math.sin(s.time * 2) * 3;
        g.circle(gcx + 4, gcy - 8 + zOff, 2).fill({ color: 0x8888cc, alpha: 0.6 });
        g.circle(gcx + 8, gcy - 12 + zOff, 1.5).fill({ color: 0x8888cc, alpha: 0.4 });
      }

      // Stunned indicator (dizzy stars)
      if (guard.state === GuardState.STUNNED) {
        for (let si = 0; si < 3; si++) {
          const sa = s.time * 4 + si * Math.PI * 2 / 3;
          g.circle(gcx + Math.cos(sa) * 7, gcy - 8 + Math.sin(sa) * 3, 1.5)
            .fill({ color: 0xffff88, alpha: 0.6 });
        }
      }

      // Guard noise reaction flash (heard something)
      const noiseFlash = s.guardNoiseFlash.get(guard);
      if (noiseFlash && noiseFlash > 0) {
        g.circle(gcx, gcy, cs * 0.55).stroke({ color: B.COLOR_NOISE, width: 2, alpha: noiseFlash });
        g.circle(gcx, gpy - 8, 3).fill({ color: B.COLOR_NOISE, alpha: noiseFlash });
      }

      // Alert / chase indicator
      if (guard.state === GuardState.ALERT || guard.state === GuardState.CHASE) {
        const flash = guard.state === GuardState.CHASE ? 1 : 0.5 + 0.5 * Math.sin(s.time * 6);
        const indicatorColor = guard.state === GuardState.CHASE ? 0xff0000 : 0xff8800;
        g.circle(gcx, gpy - 6, 4).fill({ color: indicatorColor, alpha: flash });
        // Exclamation mark
        g.rect(gcx - 1, gpy - 10, 2, 4).fill({ color: 0xffffff, alpha: flash });
        g.circle(gcx, gpy - 4, 1).fill({ color: 0xffffff, alpha: flash });
      }
    }

    // ----- Dash trail -----
    if (s.dashTrailTimer > 0) {
      const alpha = s.dashTrailTimer / B.DASH_TRAIL_DURATION;
      for (const cell of s.dashTrail) {
        const dpx = ox + cell.x * cs + cs / 2;
        const dpy = oy + cell.y * cs + cs / 2;
        g.circle(dpx, dpy, cs * 0.3 * alpha).fill({ color: B.COLOR_PLAYER_DASH, alpha: alpha * 0.4 });
      }
    }

    // ----- Player (smooth interpolation, cape, glow) -----
    const frac = Math.min(1, s.moveFraction);
    const smoothEase = frac < 1 ? frac * (2 - frac) : 1;
    const lerpX = s.prevPlayerX + (s.playerX - s.prevPlayerX) * smoothEase;
    const lerpY = s.prevPlayerY + (s.playerY - s.prevPlayerY) * smoothEase;
    const ppx = ox + lerpX * cs, ppy = oy + lerpY * cs;
    const pcx = ppx + cs / 2, pcy = ppy + cs / 2;
    if (s.invincibleTimer > 0 && Math.floor(s.invincibleTimer * 10) % 2 === 0) {
      // Blink
    } else {
      const playerColor = s.hidden ? B.COLOR_PLAYER_HIDDEN : B.COLOR_PLAYER;
      const backDx = -DIR_DX[s.playerDir], backDy = -DIR_DY[s.playerDir];

      // Shadow underneath
      g.ellipse(pcx, pcy + cs * 0.35, cs * 0.35, cs * 0.12).fill({ color: 0x000000, alpha: 0.35 });

      // Cape (trailing behind player)
      const capeWave = Math.sin(s.time * 4) * 2;
      g.poly([
        pcx + backDx * 4, pcy + backDy * 4,
        pcx + backDx * 10 - 4 + capeWave, pcy + backDy * 10 + 2,
        pcx + backDx * 12 + capeWave, pcy + backDy * 12,
        pcx + backDx * 10 + 4 + capeWave, pcy + backDy * 10 + 2,
      ]).fill({ color: lerpColor(playerColor, 0x000000, 0.3), alpha: 0.6 });

      // Cloak shadow aura when hidden
      if (s.hidden) {
        g.circle(pcx, pcy, cs * 0.65).fill({ color: 0x000000, alpha: 0.5 });
        // Orbiting shadow wisps
        for (let i = 0; i < 4; i++) {
          const a = s.time * 2 + i * Math.PI / 2;
          const wr = cs * 0.45 + Math.sin(s.time * 3 + i) * 3;
          g.circle(pcx + Math.cos(a) * wr, pcy + Math.sin(a) * wr, 2)
            .fill({ color: B.COLOR_PLAYER_DASH, alpha: 0.25 + 0.15 * Math.sin(s.time * 5 + i) });
        }
      }

      // Body
      g.roundRect(ppx + 3, ppy + 3, cs - 6, cs - 6, 5).fill(playerColor);
      // Hood/head highlight
      g.roundRect(ppx + 5, ppy + 2, cs - 10, cs * 0.4, 4).fill(lerpColor(playerColor, 0xffffff, 0.12));

      // Eyes (glowing in shadow)
      const edx = DIR_DX[s.playerDir] * 4;
      const edy = DIR_DY[s.playerDir] * 4;
      const eyeColor = s.hidden ? 0xaaaaff : 0xffffff;
      const eyeAlpha = s.hidden ? 0.9 : 0.8;
      g.circle(pcx + edx - 3, pcy + edy - 1, 2).fill({ color: eyeColor, alpha: eyeAlpha });
      g.circle(pcx + edx + 3, pcy + edy - 1, 2).fill({ color: eyeColor, alpha: eyeAlpha });
      // Eye glow when hidden
      if (s.hidden) {
        g.circle(pcx + edx - 3, pcy + edy - 1, 4).fill({ color: 0x6644cc, alpha: 0.15 });
        g.circle(pcx + edx + 3, pcy + edy - 1, 4).fill({ color: 0x6644cc, alpha: 0.15 });
      }
    }

    // ----- Peek indicator -----
    if (s.peeking) {
      const pdx = DIR_DX[s.peekDir], pdy = DIR_DY[s.peekDir];
      for (let i = 1; i <= B.PEEK_EXTRA_RANGE + s.visibilityRange; i++) {
        const tx = s.playerX + pdx * i, ty = s.playerY + pdy * i;
        if (tx < 0 || tx >= s.cols || ty < 0 || ty >= s.rows) break;
        if (s.tiles[ty][tx] === TileType.WALL) break;
        const dpx = ox + tx * cs + cs / 2, dpy = oy + ty * cs + cs / 2;
        const alpha = Math.max(0.05, 0.25 - i * 0.02);
        g.circle(dpx, dpy, 3).fill({ color: B.COLOR_PLAYER_PEEK, alpha });
      }
    }

    // ----- Throw target -----
    if (s.throwing) {
      const tpx = ox + s.throwTargetX * cs, tpy = oy + s.throwTargetY * cs;
      const tPulse = 0.5 + 0.5 * Math.sin(s.time * 8);
      g.rect(tpx + 2, tpy + 2, cs - 4, cs - 4).stroke({ color: B.COLOR_NOISE, width: 2, alpha: 0.5 + tPulse * 0.5 });
      // Line from player to target
      g.moveTo(ppx + cs / 2, ppy + cs / 2).lineTo(tpx + cs / 2, tpy + cs / 2)
        .stroke({ color: B.COLOR_NOISE, width: 1, alpha: 0.3 });
    }

    // ----- Particles (with motion streaks) -----
    for (const p of s.particles) {
      const alpha = p.life / p.maxLife;
      const px2 = ox + p.x * cs + cs / 2, py2 = oy + p.y * cs + cs / 2;
      // Motion streak (line from current to slightly behind)
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 20) {
        const trail = Math.min(8, speed * 0.04);
        const tx = px2 - (p.vx / speed) * trail;
        const ty = py2 - (p.vy / speed) * trail;
        g.moveTo(tx, ty).lineTo(px2, py2).stroke({ color: p.color, width: p.size * alpha * 0.8, alpha: alpha * 0.5 });
      }
      g.circle(px2, py2, p.size * alpha).fill({ color: p.color, alpha });
      // Bright core
      if (p.size > 2) {
        g.circle(px2, py2, p.size * alpha * 0.4).fill({ color: 0xffffff, alpha: alpha * 0.3 });
      }
    }

    // ----- Ambient particles (dust motes with soft glow) -----
    for (const p of s.ambientParticles) {
      const alpha = Math.min(p.life / p.maxLife, 0.25);
      const apx = ox + p.x * cs + cs / 2, apy = oy + p.y * cs + cs / 2;
      g.circle(apx, apy, p.size + 1).fill({ color: p.color, alpha: alpha * 0.3 }); // soft glow
      g.circle(apx, apy, p.size).fill({ color: p.color, alpha });
    }

    // ----- Fog of war (soft edges) -----
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (!s.revealed[r][c]) {
          g.rect(ox + c * cs, oy + r * cs, cs, cs).fill(0x000000);
        } else {
          // Soft edge: if adjacent to unrevealed tile, draw partial darkness
          const adjUnrevealed =
            (r > 0 && !s.revealed[r - 1]?.[c]) ||
            (r < s.rows - 1 && !s.revealed[r + 1]?.[c]) ||
            (c > 0 && !s.revealed[r]?.[c - 1]) ||
            (c < s.cols - 1 && !s.revealed[r]?.[c + 1]);
          if (adjUnrevealed) {
            g.rect(ox + c * cs, oy + r * cs, cs, cs).fill({ color: 0x000000, alpha: 0.35 });
          }
          // Corner darkness for diagonal-adjacent unrevealed
          const diagUnrevealed =
            (r > 0 && c > 0 && !s.revealed[r - 1]?.[c - 1]) ||
            (r > 0 && c < s.cols - 1 && !s.revealed[r - 1]?.[c + 1]) ||
            (r < s.rows - 1 && c > 0 && !s.revealed[r + 1]?.[c - 1]) ||
            (r < s.rows - 1 && c < s.cols - 1 && !s.revealed[r + 1]?.[c + 1]);
          if (diagUnrevealed && !adjUnrevealed) {
            g.rect(ox + c * cs, oy + r * cs, cs, cs).fill({ color: 0x000000, alpha: 0.15 });
          }
        }
      }
    }

    // ----- Radial darkness gradient from player -----
    // Darken tiles far from player for atmospheric depth
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (!s.revealed[r][c]) continue;
        const pd = Math.sqrt((c - s.playerX) ** 2 + (r - s.playerY) ** 2);
        if (pd > s.visibilityRange * 0.6) {
          const darkAmount = Math.min(0.5, (pd - s.visibilityRange * 0.6) / (s.visibilityRange * 0.8));
          g.rect(ox + c * cs, oy + r * cs, cs, cs).fill({ color: 0x000000, alpha: darkAmount });
        }
      }
    }

    // ----- Guard patrol paths (visible when peeking) -----
    if (s.peeking) {
      for (const guard of s.guards) {
        if (!s.revealed[guard.y]?.[guard.x]) continue;
        if (guard.state === GuardState.SLEEPING || guard.state === GuardState.KNOCKOUT) continue;
        if (guard.patrol.length < 2) continue;
        for (let pi = 0; pi < guard.patrol.length; pi++) {
          const wp = guard.patrol[pi];
          if (!s.revealed[wp.y]?.[wp.x]) continue;
          const wpx = ox + wp.x * cs + cs / 2, wpy = oy + wp.y * cs + cs / 2;
          g.circle(wpx, wpy, 2).fill({ color: B.COLOR_GUARD, alpha: 0.2 });
          // Line to next waypoint
          const nwp = guard.patrol[(pi + 1) % guard.patrol.length];
          if (s.revealed[nwp.y]?.[nwp.x]) {
            const nwpx = ox + nwp.x * cs + cs / 2, nwpy = oy + nwp.y * cs + cs / 2;
            g.moveTo(wpx, wpy).lineTo(nwpx, nwpy).stroke({ color: B.COLOR_GUARD, width: 1, alpha: 0.12 });
          }
        }
      }
    }

    // ----- Throw distance indicator -----
    if (s.phase === PhantomPhase.PLAYING && s.stones > 0 && !s.throwing) {
      const tdx = DIR_DX[s.playerDir], tdy = DIR_DY[s.playerDir];
      const ttx = s.playerX + tdx * s.throwDistance;
      const tty = s.playerY + tdy * s.throwDistance;
      if (ttx >= 0 && ttx < s.cols && tty >= 0 && tty < s.rows && s.tiles[tty]?.[ttx] !== TileType.WALL) {
        const tipx = ox + ttx * cs + cs / 2, tipy = oy + tty * cs + cs / 2;
        g.circle(tipx, tipy, 3).fill({ color: B.COLOR_NOISE, alpha: 0.15 });
      }
    }

    // ----- Player ground light aura -----
    if (s.phase === PhantomPhase.PLAYING && !s.hidden) {
      const lightR = s.visibilityRange * cs * 0.3;
      g.circle(ppx + cs / 2, ppy + cs / 2, lightR).fill({ color: 0x222244, alpha: 0.06 });
      g.circle(ppx + cs / 2, ppy + cs / 2, lightR * 0.5).fill({ color: 0x333366, alpha: 0.04 });
    }

    // ----- Vignette (smooth radial rings) -----
    const cx = sw / 2, cy = sh / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const vignetteRings = 8;
    for (let vi = 0; vi < vignetteRings; vi++) {
      const innerR = maxR * (0.4 + vi * 0.08);
      const alpha = 0.02 + vi * 0.035;
      // Use 4 corner-filling rects masked by distance check (approximation: layered border rects)
      const inset = Math.max(0, (1 - innerR / maxR) * Math.min(sw, sh) * 0.5);
      if (inset > 0) {
        g.rect(0, 0, inset, sh).fill({ color: 0x000000, alpha });
        g.rect(sw - inset, 0, inset, sh).fill({ color: 0x000000, alpha });
        g.rect(inset, 0, sw - inset * 2, inset * 0.7).fill({ color: 0x000000, alpha });
        g.rect(inset, sh - inset * 0.7, sw - inset * 2, inset * 0.7).fill({ color: 0x000000, alpha });
      }
    }

    // ----- Screen flash -----
    if (s.screenFlashTimer > 0) {
      g.rect(0, 0, sw, sh).fill({ color: s.screenFlashColor, alpha: s.screenFlashTimer / B.FLASH_DURATION * 0.3 });
    }

    // ----- Floor transition fade -----
    if (s.floorTransitionTimer > 0) {
      const tAlpha = s.floorTransitionTimer / B.FLOOR_TRANSITION_DURATION;
      g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: tAlpha * 0.8 });
    }

    // =========== UI layer ===========
    const ui = this._uiGfx;
    ui.clear();

    // Detection eye meter
    if (s.detectionMeter > 0 && s.phase === PhantomPhase.PLAYING) {
      const fill = s.detectionMeter / B.DETECTION_CAUGHT;
      const meterColor = fill > 0.7 ? B.COLOR_DANGER : B.COLOR_GUARD_ALERT;
      const eyeX = sw / 2, eyeY = sh - 36;
      const eyeW = 28 + fill * 12, eyeH = 8 + fill * 10; // eye opens wider as detection rises
      // Eye shape (two arcs)
      ui.ellipse(eyeX, eyeY, eyeW, eyeH).fill({ color: 0x111122, alpha: 0.8 });
      ui.ellipse(eyeX, eyeY, eyeW, eyeH).stroke({ color: meterColor, width: 1.5, alpha: 0.7 });
      // Iris
      const irisR = 3 + fill * 5;
      ui.circle(eyeX, eyeY, irisR).fill({ color: meterColor, alpha: 0.8 });
      // Pupil
      ui.circle(eyeX, eyeY, irisR * 0.4).fill({ color: 0x000000, alpha: 0.9 });
      // Iris glow
      ui.circle(eyeX, eyeY, irisR * 1.5).fill({ color: meterColor, alpha: fill * 0.15 });
      // Bar underneath
      const barW = 80, barH = 3;
      ui.rect(eyeX - barW / 2, eyeY + eyeH + 4, barW, barH).fill({ color: 0x111122, alpha: 0.6 });
      ui.rect(eyeX - barW / 2, eyeY + eyeH + 4, barW * fill, barH).fill({ color: meterColor, alpha: 0.8 });
    }

    // Alert pulse border (gradient inward)
    if (s.alertPulse > 0 && s.phase === PhantomPhase.PLAYING) {
      const aPulse = 0.08 + 0.12 * Math.sin(s.alertPulse);
      for (let bi = 0; bi < 3; bi++) {
        const ba = aPulse * (1 - bi * 0.3);
        ui.rect(bi, bi, sw - bi * 2, 2).fill({ color: B.COLOR_DANGER, alpha: ba });
        ui.rect(bi, sh - bi - 2, sw - bi * 2, 2).fill({ color: B.COLOR_DANGER, alpha: ba });
        ui.rect(bi, bi, 2, sh - bi * 2).fill({ color: B.COLOR_DANGER, alpha: ba });
        ui.rect(sw - bi - 2, bi, 2, sh - bi * 2).fill({ color: B.COLOR_DANGER, alpha: ba });
      }
    }

    // Minimap
    this._drawMinimap(ui, s, sw, sh);

    // HUD
    const showHud = s.phase === PhantomPhase.PLAYING || s.phase === PhantomPhase.PAUSED;
    this._hudText.visible = showHud;
    this._hudRightText.visible = showHud;
    this._hudAbilities.visible = showHud;
    if (showHud) {
      // HUD panel backgrounds
      ui.roundRect(4, 3, 420, 40, 6).fill({ color: 0x000000, alpha: 0.5 });
      ui.roundRect(4, 3, 420, 40, 6).stroke({ color: 0x333355, width: 1, alpha: 0.3 });
      // Score panel
      ui.roundRect(sw - 170, 3, 166, 22, 6).fill({ color: 0x000000, alpha: 0.5 });
      ui.roundRect(sw - 170, 3, 166, 22, 6).stroke({ color: 0x333355, width: 1, alpha: 0.3 });

      const relicStr = s.exitOpen ? "EXIT OPEN" : `Relics: ${s.relicsCollected}/${s.relicsRequired}`;
      const stoneStr = `Stones: ${s.stones}`;
      const keyStr = s.keys > 0 ? `  Keys: ${s.keys}` : "";
      const livesStr = `${"♥".repeat(s.lives)}${"♡".repeat(s.maxLives - s.lives)}`;
      this._hudText.text = `F${s.floor}  ${relicStr}  ${stoneStr}${keyStr}  ${livesStr}`;
      this._hudText.x = 10; this._hudText.y = 8;

      const comboStr = s.relicComboCount > 1 ? `  Combo x${s.relicComboCount}` : "";
      this._hudRightText.text = `Score: ${Math.floor(s.score)}${comboStr}`;
      this._hudRightText.x = sw - this._hudRightText.width - 10;
      this._hudRightText.y = 8;

      // Ability cooldowns
      const dashReady = s.shadowDashCooldown <= 0;
      const smokeReady = s.smokeBombCooldown <= 0 && s.smokeBombs > 0;
      const dashStr = dashReady ? "[Q] Dash ✓" : `[Q] Dash ${Math.ceil(s.shadowDashCooldown)}s`;
      const smokeStr = s.smokeBombs > 0
        ? (smokeReady ? `[E] Smoke x${s.smokeBombs} ✓` : `[E] Smoke ${Math.ceil(s.smokeBombCooldown)}s`)
        : "[E] Smoke —";
      const peekStr = s.peeking ? " PEEK" : "";
      const throwStr = s.stones > 0 ? `[T] Throw:${s.throwDistance}` : "[T] —";
      this._hudAbilities.text = `${dashStr}  ${smokeStr}  ${throwStr}${peekStr}`;
      this._hudAbilities.x = 10; this._hudAbilities.y = 26;

      // Floor modifier banner
      if (s.floorModifier !== FloorModifier.NONE) {
        const modNames: Record<string, string> = {
          [FloorModifier.DARKNESS]: "DARKNESS — Reduced visibility",
          [FloorModifier.ALARM]: "ALARM — All guards share alerts",
          [FloorModifier.REINFORCED]: "REINFORCED — Extra guards",
          [FloorModifier.TREASURY]: "TREASURY — More relics & guards",
          [FloorModifier.CURSED]: "CURSED — Extra traps, no stones",
          [FloorModifier.SWIFT]: "SWIFT — Fast guards, more shadows",
        };
        const modText = modNames[s.floorModifier] || s.floorModifier;
        const tw = modText.length * 7;
        const bx = (sw - tw) / 2 - 8;
        ui.roundRect(bx, 38, tw + 16, 18, 4).fill({ color: 0x000000, alpha: 0.6 });
        ui.roundRect(bx, 38, tw + 16, 18, 4).stroke({ color: B.COLOR_MODIFIER, width: 1, alpha: 0.5 });
      }
    }

    // Floating texts
    let fi = 0;
    for (const ft of s.floatingTexts) {
      if (fi >= FLOAT_POOL_SIZE) break;
      const t = this._floatTexts[fi];
      t.visible = true;
      t.text = ft.text;
      (t.style as TextStyle).fill = ft.color;
      t.x = ox + ft.x * cs + cs / 2;
      t.y = oy + ft.y * cs;
      t.alpha = ft.life / ft.maxLife;
      fi++;
    }
    for (; fi < FLOAT_POOL_SIZE; fi++) this._floatTexts[fi].visible = false;

    // =========== Phase overlays ===========
    // Modifier label in HUD
    this._modifierText.visible = showHud && s.floorModifier !== FloorModifier.NONE;
    if (this._modifierText.visible) {
      const modNames: Record<string, string> = {
        [FloorModifier.DARKNESS]: "DARKNESS", [FloorModifier.ALARM]: "ALARM",
        [FloorModifier.REINFORCED]: "REINFORCED", [FloorModifier.TREASURY]: "TREASURY",
        [FloorModifier.CURSED]: "CURSED", [FloorModifier.SWIFT]: "SWIFT",
      };
      this._modifierText.text = modNames[s.floorModifier] || "";
      this._modifierText.anchor.set(0.5, 0);
      this._modifierText.x = sw / 2; this._modifierText.y = 40;
    }

    const allOverlays = [this._titleText, this._subtitleText, this._controlsText, this._metaText,
      this._startPrompt, this._floorClearText, this._ratingText, this._caughtText, this._gameOverText,
      this._victoryText, this._statsText, this._promptText, this._pauseText, this._shopText];
    for (const o of allOverlays) o.visible = false;

    if (s.phase === PhantomPhase.START) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.75 });

      this._titleText.visible = true;
      this._titleText.anchor.set(0.5);
      this._titleText.x = sw / 2; this._titleText.y = sh * 0.2;

      this._subtitleText.visible = true;
      this._subtitleText.anchor.set(0.5);
      this._subtitleText.x = sw / 2; this._subtitleText.y = sh * 0.2 + 50;

      this._controlsText.visible = true;
      this._controlsText.anchor.set(0.5);
      this._controlsText.x = sw / 2; this._controlsText.y = sh * 0.45;

      this._metaText.visible = true;
      this._metaText.anchor.set(0.5);
      this._metaText.x = sw / 2; this._metaText.y = sh * 0.68;
      if (meta.gamesPlayed > 0) {
        this._metaText.text = `Best Floor: ${meta.bestFloor}  |  High Score: ${meta.highScore}  |  Relics: ${meta.totalRelics}  |  Ghost Floors: ${meta.totalGhostFloors}`;
      } else {
        this._metaText.text = "First infiltration...";
      }

      this._startPrompt.visible = true;
      this._startPrompt.anchor.set(0.5);
      this._startPrompt.x = sw / 2; this._startPrompt.y = sh * 0.82;
      this._startPrompt.alpha = 0.6 + 0.4 * Math.sin(s.time * 3);
    }

    if (s.phase === PhantomPhase.PAUSED) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.5 });
      this._pauseText.visible = true;
      this._pauseText.anchor.set(0.5);
      this._pauseText.x = sw / 2; this._pauseText.y = sh / 2;
    }

    if (s.phase === PhantomPhase.FLOOR_CLEAR) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.5 });
      this._floorClearText.visible = true;
      this._floorClearText.anchor.set(0.5);
      this._floorClearText.x = sw / 2; this._floorClearText.y = sh * 0.22;

      // Stealth rating
      this._ratingText.visible = true;
      this._ratingText.anchor.set(0.5);
      this._ratingText.x = sw / 2; this._ratingText.y = sh * 0.34;
      let ratingLabel: string, ratingColor: number;
      switch (s.floorStealthRating) {
        case StealthRating.GHOST:
          ratingLabel = "GHOST"; ratingColor = B.COLOR_GHOST; break;
        case StealthRating.SHADOW:
          ratingLabel = "SHADOW"; ratingColor = B.COLOR_SHADOW_RATING; break;
        default:
          ratingLabel = "EXPOSED"; ratingColor = B.COLOR_DANGER; break;
      }
      this._ratingText.text = ratingLabel;
      (this._ratingText.style as TextStyle).fill = ratingColor;

      this._statsText.visible = true;
      this._statsText.anchor.set(0.5);
      this._statsText.x = sw / 2; this._statsText.y = sh * 0.48;
      const floorScore = Math.floor(s.score);
      const timeStr = `${Math.floor(s.floorTime)}s`;
      const speedBonus = s.floorTime < B.SCORE_SPEED_BONUS_THRESHOLD ? `  Speed Bonus: +${B.SCORE_SPEED_BONUS}` : "";
      const multStr = s.floorStealthRating === StealthRating.GHOST ? `  (x${B.SCORE_GHOST_MULTIPLIER})`
        : s.floorStealthRating === StealthRating.SHADOW ? `  (x${B.SCORE_SHADOW_MULTIPLIER})` : "";
      this._statsText.text =
        `Floor ${s.floor} — ${timeStr}\n` +
        `Rating: ${ratingLabel}${multStr}\n` +
        `Relics: ${s.relicsCollected}/${s.relicsRequired}${speedBonus}\n` +
        `Total Score: ${floorScore}`;

      this._promptText.visible = true;
      this._promptText.anchor.set(0.5);
      this._promptText.x = sw / 2; this._promptText.y = sh * 0.7;
      this._promptText.text = "Press SPACE for next floor";
      this._promptText.alpha = 0.6 + 0.4 * Math.sin(s.time * 3);
    }

    if (s.phase === PhantomPhase.CAUGHT) {
      ui.rect(0, 0, sw, sh).fill({ color: B.COLOR_DANGER, alpha: 0.15 });
      this._caughtText.visible = true;
      this._caughtText.anchor.set(0.5);
      this._caughtText.x = sw / 2; this._caughtText.y = sh * 0.4;

      this._promptText.visible = true;
      this._promptText.anchor.set(0.5);
      this._promptText.x = sw / 2; this._promptText.y = sh * 0.55;
      this._promptText.text = `Lives remaining: ${s.lives}  —  Press SPACE to continue`;
    }

    if (s.phase === PhantomPhase.GAME_OVER) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.65 });
      this._gameOverText.visible = true;
      this._gameOverText.anchor.set(0.5);
      this._gameOverText.x = sw / 2; this._gameOverText.y = sh * 0.15;

      this._statsText.visible = true;
      this._statsText.anchor.set(0.5);
      this._statsText.x = sw / 2; this._statsText.y = sh * 0.30;
      this._statsText.text =
        `Floor ${s.floor}  |  Relics: ${s.totalRelicsCollected}  |  Backstabs: ${s.totalBackstabs}\n` +
        `Score: ${Math.floor(s.score)}  |  Shadow Coins earned: +${Math.floor(s.totalFloorsCleared * B.COINS_PER_FLOOR + s.totalRelicsCollected * B.COINS_PER_RELIC)}`;

      // Upgrade shop
      this._shopText.visible = true;
      this._shopText.anchor.set(0.5);
      this._shopText.x = sw / 2; this._shopText.y = sh * 0.44;
      const up = meta.upgrades;
      const costs = B.UPGRADE_COSTS as Record<string, number[]>;
      const lines: string[] = [`Shadow Coins: ${meta.shadowCoins}`, ""];
      const names = ["Extra Life", "Quick Dash", "Keen Eyes", "Light Feet", "Extra Smoke"];
      const upKeys = ["extraLife", "quickDash", "keenEyes", "lightFeet", "extraSmoke"];
      for (let i = 0; i < upKeys.length; i++) {
        const k = upKeys[i];
        const lvl = (up as unknown as Record<string, number>)[k] || 0;
        const c = costs[k];
        const maxed = lvl >= c.length;
        const cost = maxed ? "MAX" : `${c[lvl]} coins`;
        const bar = "■".repeat(lvl) + "□".repeat(c.length - lvl);
        lines.push(`[${i + 1}] ${names[i]} ${bar}  ${cost}`);
      }
      this._shopText.text = lines.join("\n");

      this._promptText.visible = true;
      this._promptText.anchor.set(0.5);
      this._promptText.x = sw / 2; this._promptText.y = sh * 0.78;
      this._promptText.text = "SPACE to retry  |  ESC to exit";
    }

    if (s.phase === PhantomPhase.VICTORY) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.55 });
      this._victoryText.visible = true;
      this._victoryText.anchor.set(0.5);
      this._victoryText.x = sw / 2; this._victoryText.y = sh * 0.25;

      this._statsText.visible = true;
      this._statsText.anchor.set(0.5);
      this._statsText.x = sw / 2; this._statsText.y = sh * 0.45;
      this._statsText.text =
        `All ${s.floor} floors cleared!\n` +
        `Relics: ${s.totalRelicsCollected}  |  Backstabs: ${s.totalBackstabs}\n` +
        `Final Score: ${Math.floor(s.score)}`;

      this._promptText.visible = true;
      this._promptText.anchor.set(0.5);
      this._promptText.x = sw / 2; this._promptText.y = sh * 0.65;
      this._promptText.text = "SPACE to play again  |  ESC to exit";
    }
  }

  // ---------------------------------------------------------------------------
  // Vision cone
  // ---------------------------------------------------------------------------

  private _drawVisionCone(g: Graphics, guard: Guard, ox: number, oy: number, cs: number): void {
    const cx = ox + guard.x * cs + cs / 2;
    const cy = oy + guard.y * cs + cs / 2;
    const range = guard.visionRange;
    const facingAngle = Math.atan2(DIR_DY[guard.dir], DIR_DX[guard.dir]);
    const halfAngle = guard.visionAngle;

    const color = guard.state === GuardState.CHASE ? B.COLOR_VISION_ALERT : B.COLOR_VISION;
    const alpha = guard.state === GuardState.CHASE ? 0.12 : guard.state === GuardState.ALERT ? 0.1 : 0.06;

    // Wall-clipped: raycast each segment to find max distance before hitting a wall
    const segments = 20;
    const points: number[] = [cx, cy];
    for (let i = 0; i <= segments; i++) {
      const a = facingAngle - halfAngle + (2 * halfAngle * i) / segments;
      const dx = Math.cos(a), dy = Math.sin(a);
      // March along ray in 0.5-tile steps
      let r = 0;
      for (let step = 0.5; step <= range; step += 0.5) {
        const tx = Math.round(guard.x + dx * step);
        const ty = Math.round(guard.y + dy * step);
        if (tx < 0 || tx >= this._cols || ty < 0 || ty >= this._rows) break;
        if (this._tiles && this._tiles[ty][tx] === TileType.WALL) break;
        r = step;
      }
      points.push(cx + dx * r * cs, cy + dy * r * cs);
    }

    g.poly(points).fill({ color: color & 0xffffff, alpha });
  }

  // Cached tile reference for vision cone clipping
  private _tiles: TileType[][] | null = null;
  private _cols = 0;
  private _rows = 0;

  // ---------------------------------------------------------------------------
  // Proximity ring (for hounds)
  // ---------------------------------------------------------------------------

  private _drawProximityRing(g: Graphics, guard: Guard, ox: number, oy: number, cs: number): void {
    const cx = ox + guard.x * cs + cs / 2;
    const cy = oy + guard.y * cs + cs / 2;
    const range = guard.proximityRange * cs;
    const alpha = guard.state === GuardState.CHASE ? 0.15 : guard.state === GuardState.ALERT ? 0.1 : 0.06;
    g.circle(cx, cy, range).fill({ color: B.COLOR_HOUND & 0xffffff, alpha });
    g.circle(cx, cy, range).stroke({ color: B.COLOR_HOUND, width: 1, alpha: alpha * 2 });
  }

  // ---------------------------------------------------------------------------
  // Minimap
  // ---------------------------------------------------------------------------

  private _drawMinimap(g: Graphics, s: PhantomState, sw: number, sh: number): void {
    const mmW = 135, mmH = 100;
    const pad = 4;
    const mx = sw - mmW - 12, my = sh - mmH - 12;
    const scaleX = (mmW - pad * 2) / s.cols, scaleY = (mmH - pad * 2) / s.rows;
    const ix = mx + pad, iy = my + pad;

    // Frame with rounded corners and double border
    g.roundRect(mx - 2, my - 2, mmW + 4, mmH + 4, 8).fill({ color: 0x111122, alpha: 0.85 });
    g.roundRect(mx - 2, my - 2, mmW + 4, mmH + 4, 8).stroke({ color: 0x444466, width: 1.5 });
    g.roundRect(mx, my, mmW, mmH, 6).stroke({ color: 0x222244, width: 1 });

    // Tiles
    for (let r = 0; r < s.rows; r++) {
      for (let c = 0; c < s.cols; c++) {
        if (!s.revealed[r][c]) continue;
        const tile = s.tiles[r][c];
        let color = -1;
        if (tile === TileType.WALL) color = 0x2a2a3e;
        else if (tile === TileType.FLOOR) color = 0x1a1a2e;
        else if (tile === TileType.SHADOW) color = 0x0a0a18;
        else if (tile === TileType.EXIT) color = s.exitOpen ? 0x44dd88 : 0x333344;
        else if (tile === TileType.RELIC) color = 0xffd700;
        else if (tile === TileType.KEY) color = 0xffcc44;
        else if (tile === TileType.LOCKED_DOOR) color = 0x886633;
        else if (tile === TileType.TRAP) color = 0x553322;
        if (color >= 0) {
          g.rect(ix + c * scaleX, iy + r * scaleY, Math.max(1, scaleX), Math.max(1, scaleY)).fill(color);
        }
      }
    }

    // Smoke
    for (const smoke of s.smokeTiles) {
      if (s.revealed[smoke.y]?.[smoke.x]) {
        g.rect(ix + smoke.x * scaleX, iy + smoke.y * scaleY, Math.max(1, scaleX), Math.max(1, scaleY))
          .fill({ color: B.COLOR_SMOKE, alpha: 0.5 });
      }
    }

    // Player (glowing dot with pulse)
    const ppxm = ix + s.playerX * scaleX, ppym = iy + s.playerY * scaleY;
    const mPulse = 0.6 + 0.4 * Math.sin(s.time * 3);
    g.circle(ppxm, ppym, 4 * mPulse).fill({ color: B.COLOR_PLAYER, alpha: 0.25 }); // glow
    g.circle(ppxm, ppym, 2).fill(B.COLOR_PLAYER);
    g.circle(ppxm, ppym, 1).fill({ color: 0xffffff, alpha: 0.6 }); // bright center

    // Guards
    for (const guard of s.guards) {
      if (!s.revealed[guard.y]?.[guard.x]) continue;
      let gc: number;
      switch (guard.type) {
        case GuardType.HOUND: gc = B.COLOR_HOUND; break;
        case GuardType.SENTRY: gc = B.COLOR_SENTRY; break;
        default: gc = B.COLOR_GUARD; break;
      }
      if (guard.state === GuardState.KNOCKOUT || guard.state === GuardState.STUNNED || guard.state === GuardState.SLEEPING) {
        gc = B.COLOR_GUARD_STUNNED;
      }
      g.rect(ix + guard.x * scaleX - 1, iy + guard.y * scaleY - 1, 2, 2).fill(gc);
    }

    // "MAP" label
    g.roundRect(mx + mmW - 30, my - 8, 28, 12, 3).fill({ color: 0x111122, alpha: 0.8 });
  }
}

// ---------------------------------------------------------------------------
// Color utility
// ---------------------------------------------------------------------------

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return (rr << 16) | (rg << 8) | rb;
}
