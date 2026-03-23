// ---------------------------------------------------------------------------
// Shadowhand mode — polished start screen with medieval atmosphere
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ShadowhandDifficulty } from "../config/ShadowhandConfig";

const FONT = "Georgia, serif";
const COL = 0x44aa88;
const COL_LT = 0x66ccaa;
const COL_DK = 0x224444;
const GOLD = 0xccaa66;

function drawDagger(g: Graphics, cx: number, cy: number, scale: number, alpha: number): void {
  // Blade
  g.moveTo(cx, cy - 14 * scale).lineTo(cx + 2 * scale, cy + 4 * scale).lineTo(cx - 2 * scale, cy + 4 * scale).closePath().fill({ color: 0x889999, alpha: alpha * 0.6 });
  // Edge highlight
  g.moveTo(cx, cy - 14 * scale).lineTo(cx + 0.5 * scale, cy + 3 * scale).stroke({ color: 0xbbcccc, width: 0.5, alpha: alpha * 0.4 });
  // Guard
  g.moveTo(cx - 5 * scale, cy + 4 * scale).lineTo(cx + 5 * scale, cy + 4 * scale).stroke({ color: GOLD, width: 2, alpha });
  // Handle
  g.rect(cx - 1.2 * scale, cy + 4 * scale, 2.4 * scale, 8 * scale).fill({ color: 0x4a3a2a, alpha });
  // Pommel
  g.circle(cx, cy + 13 * scale, 2 * scale).fill({ color: GOLD, alpha: alpha * 0.7 });
}

function drawOrnament(g: Graphics, x1: number, x2: number, y: number, alpha: number): void {
  const cx = (x1 + x2) / 2;
  // Center diamond
  g.moveTo(cx, y - 4).lineTo(cx + 4, y).lineTo(cx, y + 4).lineTo(cx - 4, y).closePath().fill({ color: COL, alpha: alpha * 0.5 });
  // Lines radiating outward
  g.moveTo(cx - 6, y).lineTo(x1 + 20, y).stroke({ color: COL, width: 0.8, alpha: alpha * 0.3 });
  g.moveTo(cx + 6, y).lineTo(x2 - 20, y).stroke({ color: COL, width: 0.8, alpha: alpha * 0.3 });
  // Small dots along lines
  for (let i = 0; i < 4; i++) {
    const t = (i + 1) / 5;
    g.circle(cx - 6 - t * (cx - x1 - 26), y, 1.5).fill({ color: COL, alpha: alpha * 0.25 });
    g.circle(cx + 6 + t * (x2 - cx - 26), y, 1.5).fill({ color: COL, alpha: alpha * 0.25 });
  }
  // End flourishes
  g.circle(x1 + 18, y, 2.5).stroke({ color: COL, width: 0.5, alpha: alpha * 0.2 });
  g.circle(x2 - 18, y, 2.5).stroke({ color: COL, width: 0.5, alpha: alpha * 0.2 });
}

export class ShadowhandStartScreen {
  readonly container = new Container();
  private _startCallback: ((difficulty: ShadowhandDifficulty) => void) | null = null;
  private _continueCallback: (() => void) | null = null;
  private _backCallback: (() => void) | null = null;
  private _selectedDifficulty: ShadowhandDifficulty = "journeyman";
  hasSave = false;

  setStartCallback(cb: (d: ShadowhandDifficulty) => void): void { this._startCallback = cb; }
  setContinueCallback(cb: () => void): void { this._continueCallback = cb; }
  setBackCallback(cb: () => void): void { this._backCallback = cb; }

  show(sw: number, sh: number): void {
    this.container.removeChildren();

    // Atmospheric night sky background
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x030508 });
    // Sky gradient (darker at top, slightly lighter at horizon)
    for (let gy = 0; gy < 6; gy++) {
      bg.rect(0, gy * sh / 12, sw, sh / 12).fill({ color: 0x060810, alpha: gy * 0.015 });
    }
    // Stars
    for (let si = 0; si < 40; si++) {
      const sx = (si * 7919 % (sw - 40)) + 20;
      const sy = (si * 4813 % (sh * 0.4));
      const br = (si * 3571 % 100) / 100;
      bg.circle(sx, sy, 0.5 + br * 0.8).fill({ color: 0xddeeff, alpha: 0.05 + br * 0.08 });
    }
    // Distant castle silhouette at horizon
    const horizY = sh * 0.35;
    // Mountains
    bg.moveTo(0, horizY);
    for (let mx = 0; mx <= sw; mx += 40) {
      bg.lineTo(mx, horizY - 15 - Math.sin(mx * 0.01) * 20 - Math.sin(mx * 0.03) * 8);
    }
    bg.lineTo(sw, horizY).lineTo(0, horizY).closePath().fill({ color: 0x060810, alpha: 0.3 });
    // Castle tower (center)
    const cx = sw / 2;
    bg.rect(cx - 20, horizY - 50, 40, 50).fill({ color: 0x080a12, alpha: 0.25 });
    bg.moveTo(cx, horizY - 60).lineTo(cx - 12, horizY - 50).lineTo(cx + 12, horizY - 50).closePath().fill({ color: 0x0a0c16, alpha: 0.2 });
    // Tower windows (faint orange)
    bg.rect(cx - 3, horizY - 40, 2, 3).fill({ color: 0xff8833, alpha: 0.06 });
    bg.rect(cx + 2, horizY - 35, 2, 3).fill({ color: 0xff8833, alpha: 0.05 });
    // Wall extending from tower
    bg.rect(cx - 80, horizY - 20, 160, 20).fill({ color: 0x080a12, alpha: 0.2 });
    for (let bx = cx - 80; bx < cx + 80; bx += 8) bg.rect(bx, horizY - 24, 4, 4).fill({ color: 0x080a12, alpha: 0.18 });
    // Ground fog
    for (let fy = 0; fy < 5; fy++) {
      const fogY = horizY + fy * 15 + 5;
      bg.ellipse(sw / 2 + Math.sin(fy * 1.3) * 100, fogY, sw * 0.6, 12 + fy * 3).fill({ color: 0x080a12, alpha: 0.04 });
    }
    // Heavy vignette
    for (let i = 0; i < 8; i++) {
      const inset = i * 35;
      bg.rect(0, 0, inset, sh).fill({ color: 0x000000, alpha: 0.03 });
      bg.rect(sw - inset, 0, inset, sh).fill({ color: 0x000000, alpha: 0.03 });
      bg.rect(0, 0, sw, inset).fill({ color: 0x000000, alpha: 0.025 });
      bg.rect(0, sh - inset, sw, inset).fill({ color: 0x000000, alpha: 0.025 });
    }
    this.container.addChild(bg);

    // Ornate double border with corner pieces
    const border = new Graphics();
    border.rect(16, 16, sw - 32, sh - 32).stroke({ color: COL, width: 2, alpha: 0.3 });
    border.rect(22, 22, sw - 44, sh - 44).stroke({ color: COL_DK, width: 1, alpha: 0.15 });
    // Corner ornaments
    for (const [cx, cy] of [[24, 24], [sw - 24, 24], [24, sh - 24], [sw - 24, sh - 24]]) {
      border.circle(cx, cy, 5).fill({ color: COL, alpha: 0.35 });
      border.circle(cx, cy, 2.5).fill({ color: COL_LT, alpha: 0.5 });
      // Corner L-brackets
      const dx = cx < sw / 2 ? 1 : -1, dy = cy < sh / 2 ? 1 : -1;
      border.moveTo(cx, cy + dy * 12).lineTo(cx, cy).lineTo(cx + dx * 12, cy).stroke({ color: COL, width: 1.5, alpha: 0.25 });
    }
    this.container.addChild(border);

    // Background daggers (decorative)
    const decor = new Graphics();
    drawDagger(decor, sw / 2 - 120, 60, 1.2, 0.15);
    drawDagger(decor, sw / 2 + 120, 60, 1.2, 0.15);
    this.container.addChild(decor);

    let y = 38;

    // Title with shadow
    this._text("\u2620 SHADOWHAND \u2620", sw / 2, y + 2, { fontSize: 36, fill: 0x000000, fontWeight: "bold", letterSpacing: 8 }, true); // shadow
    this._text("\u2620 SHADOWHAND \u2620", sw / 2, y, { fontSize: 36, fill: COL, fontWeight: "bold", letterSpacing: 8 }, true);
    y += 50;

    // Subtitle
    this._text("A Medieval Stealth Heist Game", sw / 2, y, { fontSize: 14, fill: 0x667766, fontStyle: "italic", letterSpacing: 2 }, true);
    y += 32;

    // Ornamental divider
    const ornG = new Graphics();
    drawOrnament(ornG, 60, sw - 60, y, 0.6);
    this.container.addChild(ornG);
    y += 18;

    // Story
    const storyLines = [
      "You lead the Shadowhand \u2014 a guild of thieves in the heart of Camelot.",
      "Plan your heists. Pick your crew. Stick to the shadows.",
      "From merchant houses to the royal palace, every target has its secrets.",
      "Steal enough to fund your ultimate heist: the Grail Vault itself.",
      "But beware \u2014 the Inquisition watches. Too much heat and they come for you.",
    ];
    for (const line of storyLines) {
      this._text(line, sw / 2, y, { fontSize: 11, fill: 0x889988, fontStyle: "italic", lineHeight: 18 }, true);
      y += 17;
    }
    y += 12;

    // Ornamental divider
    const ornG2 = new Graphics();
    drawOrnament(ornG2, 60, sw - 60, y, 0.4);
    this.container.addChild(ornG2);
    y += 16;

    // Difficulty section
    this._text("Choose Your Path", sw / 2, y, { fontSize: 15, fill: GOLD, fontWeight: "bold", letterSpacing: 3 }, true);
    y += 28;

    const diffs: { id: ShadowhandDifficulty; name: string; desc: string; stats: string; color: number }[] = [
      { id: "apprentice", name: "Apprentice", desc: "Fewer guards, wider shadows, more loot.", stats: "Guards -30% | Loot +30% | Vision -30%", color: 0x55aa55 },
      { id: "journeyman", name: "Journeyman", desc: "The intended experience.", stats: "Standard difficulty", color: 0x44aa88 },
      { id: "master", name: "Master", desc: "Elite guards, quick alerts, less gold.", stats: "Guards +40% | Alert +40% | Loot -20%", color: 0xff5544 },
    ];

    const dw = 180, dgap = 14;
    const dsx = (sw - (dw * 3 + dgap * 2)) / 2;
    for (let i = 0; i < diffs.length; i++) {
      const df = diffs[i];
      const x = dsx + i * (dw + dgap);
      const sel = df.id === this._selectedDifficulty;
      this._diffCard(x, y, dw, 85, sel, df, sw, sh);
    }
    y += 104;

    // Ornamental divider
    const ornG3 = new Graphics();
    drawOrnament(ornG3, 60, sw - 60, y, 0.3);
    this.container.addChild(ornG3);
    y += 16;

    // Controls in two columns
    this._text("Controls", sw / 2, y, { fontSize: 13, fill: GOLD, fontWeight: "bold", letterSpacing: 2 }, true);
    y += 22;

    const controls = [
      ["Click", "Move thief / interact"],
      ["Tab", "Switch crew members"],
      ["C", "Toggle crouch"],
      ["Space", "Pick lock"],
      ["E / Q", "Role ability / secondary"],
      ["1-4", "Use equipment"],
      ["+  /  -", "Speed up / slow down"],
      ["Esc", "Pause"],
    ];
    const colW = 240;
    const col1X = sw / 2 - colW - 10, col2X = sw / 2 + 10;
    for (let i = 0; i < controls.length; i++) {
      const [key, desc] = controls[i];
      const cx = i < 4 ? col1X : col2X;
      const cy = y + (i % 4) * 16;
      // Key badge
      const keyG = new Graphics();
      const kw = 50;
      keyG.roundRect(cx, cy - 2, kw, 14, 2).fill({ color: 0x111511, alpha: 0.6 });
      keyG.roundRect(cx, cy - 2, kw, 14, 2).stroke({ color: COL_DK, width: 0.5 });
      this.container.addChild(keyG);
      this._text(key, cx + kw / 2, cy, { fontSize: 9, fill: COL_LT, fontWeight: "bold" }, true);
      this._text(desc, cx + kw + 8, cy, { fontSize: 9, fill: 0x888877 });
    }
    y += 4 * 16 + 18;

    // Buttons
    if (this.hasSave) {
      this._fancyButton("CONTINUE", sw / 2 - 100, y, 200, 42, 0xffd700, () => {
        this._continueCallback?.();
      });
      y += 50;
      this._fancyButton("NEW GAME", sw / 2 - 85, y, 170, 36, COL, () => {
        this._startCallback?.(this._selectedDifficulty);
      });
      y += 44;
    } else {
      this._fancyButton("BEGIN HEIST", sw / 2 - 100, y, 200, 42, COL, () => {
        this._startCallback?.(this._selectedDifficulty);
      });
      y += 54;
    }
    this._fancyButton("BACK", sw / 2 - 65, y, 130, 32, 0x555555, () => {
      this._backCallback?.();
    });
  }

  hide(): void {
    this.container.removeChildren();
  }

  private _diffCard(x: number, y: number, w: number, h: number, sel: boolean, df: { id: ShadowhandDifficulty; name: string; desc: string; stats: string; color: number }, sw: number, sh: number): void {
    const g = new Graphics();
    // Card background
    g.roundRect(x, y, w, h, 6).fill({ color: sel ? 0x0a1a0a : 0x060808, alpha: 0.85 });
    // Border
    g.roundRect(x, y, w, h, 6).stroke({ color: sel ? df.color : 0x333333, width: sel ? 2.5 : 1, alpha: sel ? 0.7 : 0.3 });
    // Inner glow for selected
    if (sel) {
      g.roundRect(x + 2, y + 2, w - 4, h - 4, 5).stroke({ color: df.color, width: 0.5, alpha: 0.15 });
    }
    // Top accent line
    g.moveTo(x + 10, y + 1).lineTo(x + w - 10, y + 1).stroke({ color: df.color, width: sel ? 2 : 0.5, alpha: sel ? 0.4 : 0.15 });

    g.eventMode = "static"; g.cursor = "pointer";
    g.on("pointerdown", () => { this._selectedDifficulty = df.id; this.show(sw, sh); });
    this.container.addChild(g);

    this._text(df.name, x + w / 2, y + 10, { fontSize: 14, fill: sel ? df.color : 0x666655, fontWeight: "bold", letterSpacing: 1 }, true);
    this._text(df.desc, x + 10, y + 30, { fontSize: 9, fill: 0x888877, wordWrap: true, wordWrapWidth: w - 20 });
    this._text(df.stats, x + 10, y + 56, { fontSize: 8, fill: sel ? df.color : 0x555544, letterSpacing: 0.5 });

    // Selection indicator
    if (sel) {
      g.circle(x + w / 2, y + h - 6, 3).fill({ color: df.color, alpha: 0.6 });
    }
  }

  private _text(str: string, x: number, y: number, opts: Partial<TextStyle>, center = false): Text {
    const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
    if (center) t.anchor.set(0.5, 0);
    t.position.set(x, y);
    this.container.addChild(t);
    return t;
  }

  private _fancyButton(label: string, x: number, y: number, w: number, h: number, color: number, onClick: () => void): void {
    const g = new Graphics();
    // Button background
    g.roundRect(x, y, w, h, 5).fill({ color: 0x080a08, alpha: 0.85 });
    g.roundRect(x, y, w, h, 5).stroke({ color, width: 2, alpha: 0.6 });
    // Inner highlight
    g.roundRect(x + 1, y + 1, w - 2, h / 2, 5).fill({ color: 0xffffff, alpha: 0.02 });
    // Bottom shadow
    g.moveTo(x + 5, y + h - 1).lineTo(x + w - 5, y + h - 1).stroke({ color: 0x000000, width: 1, alpha: 0.3 });
    g.eventMode = "static"; g.cursor = "pointer";
    g.on("pointerdown", onClick);
    this.container.addChild(g);
    this._text(label, x + w / 2, y + h / 2 - 7, { fontSize: 14, fill: color, fontWeight: "bold", letterSpacing: 3 }, true);
  }
}
