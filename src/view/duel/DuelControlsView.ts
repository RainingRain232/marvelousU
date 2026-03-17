// ---------------------------------------------------------------------------
// Duel mode – controls screen
// Shows P1 key mappings, character special moves, and inputs
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from "pixi.js";
import {
  DUEL_CHARACTERS,
  DUEL_CHARACTER_IDS,
} from "../../duel/config/DuelCharacterDefs";
import { duelAudio } from "../../duel/systems/DuelAudioSystem";

const COL_BG = 0x0a0015;
const COL_BG_MID = 0x1a0a30;
const COL_ACCENT = 0xe94560;
const COL_PANEL = 0x1a1a2e;
const COL_BORDER = 0x444466;
const COL_TEXT = 0xeeeeee;
const COL_TITLE = 0xffffff;
const COL_KEY = 0xddddee;
const COL_LABEL = 0x88aacc;
const COL_SPECIAL = 0xffcc44;
const COL_GOLD = 0xd4af37;
const COL_GOLD_BRIGHT = 0xffd700;
const COL_GOLD_DIM = 0x9a7b2c;
const COL_KEY_TOP = 0x444466;
const COL_KEY_FACE = 0x333344;
const COL_KEY_BOTTOM = 0x1a1a28;
const COL_ROW_EVEN = 0x1e1e36;
const COL_ROW_ODD = 0x22223e;

// Move type color dots
const COL_DOT_ATTACK = 0xe94560;
const COL_DOT_UTILITY = 0x44bbee;
const COL_DOT_GRAB = 0x44ee88;

// ---- Special input definitions per character --------------------------------

interface SpecialInput {
  name: string;
  input: string;
  type: "attack" | "utility" | "grab";
}

function getCharSpecials(charId: string): SpecialInput[] {
  const charDef = DUEL_CHARACTERS[charId];
  if (!charDef) return [];

  const inputMap: Record<string, string> = {
    sword_thrust: "Q+W",
    overhead_cleave: "W+E",
    low_sweep: "A+S",
    rising_slash: "S+D",
    shield_charge: "Q+D",
    excalibur: "E+A",
    arcane_bolt: "Q+W",
    thunder_strike: "W+E",
    frost_wave: "A+S",
    teleport: "S+D",
    arcane_storm: "Q+D",
    mystic_barrier: "E+A",
    power_shot: "Q+W",
    rain_of_arrows: "W+E",
    leg_sweep: "A+S",
    backflip_shot: "S+D",
    triple_shot: "Q+D",
    hunters_trap: "E+A",
  };

  const utilityMoves = new Set([
    "shield_charge",
    "teleport",
    "mystic_barrier",
    "backflip_shot",
    "hunters_trap",
  ]);

  const specials: SpecialInput[] = [];
  for (const [moveId, move] of Object.entries(charDef.specials)) {
    specials.push({
      name: move.name,
      input: inputMap[moveId] ?? "??",
      type: utilityMoves.has(moveId) ? "utility" : "attack",
    });
  }

  specials.push({
    name: charDef.grab.name,
    input: "Q+A",
    type: "grab",
  });

  return specials;
}

// ---- Controls view class ----------------------------------------------------

export class DuelControlsView {
  readonly container = new Container();

  private _charIndex = 0;
  private _onEscapeCallback: (() => void) | null = null;
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _screenW = 0;
  private _screenH = 0;

  setEscapeCallback(cb: () => void): void {
    this._onEscapeCallback = cb;
  }

  show(sw: number, sh: number): void {
    this._screenW = sw;
    this._screenH = sh;
    this._charIndex = 0;
    this._draw();

    this._onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowLeft":
          this._charIndex = (this._charIndex - 1 + DUEL_CHARACTER_IDS.length) % DUEL_CHARACTER_IDS.length;
          duelAudio.playSelect();
          break;
        case "ArrowRight":
          this._charIndex = (this._charIndex + 1) % DUEL_CHARACTER_IDS.length;
          duelAudio.playSelect();
          break;
        case "Escape":
        case "Enter":
          duelAudio.playCancel();
          this._cleanup();
          this._onEscapeCallback?.();
          return;
        default:
          return;
      }
      e.preventDefault();
      this._draw();
    };
    window.addEventListener("keydown", this._onKeyDown);
  }

  private _draw(): void {
    this.container.removeChildren();
    const sw = this._screenW;
    const sh = this._screenH;

    // Background
    this._drawBackground(sw, sh);

    // ---- Title with golden glow and ornamental lines ----
    this._drawTitle(sw);

    // Two columns layout
    const leftPanelW = 300;
    const rightPanelW = 440;
    const gap = 20;
    const totalW = leftPanelW + gap + rightPanelW;
    const startX = (sw - totalW) / 2;
    const topY = 55;
    const panelH = sh - topY - 45;

    // ---- Left column: Basic Controls ----
    this._drawPanel(startX, topY, leftPanelW, panelH, "BASIC CONTROLS");

    const controls = [
      { key: "\u2190 \u2192", label: "Walk Forward / Back" },
      { key: "\u2191", label: "Jump" },
      { key: "\u2193", label: "Crouch" },
      { key: "\u2190\u2190 / \u2192\u2192", label: "Dash (double-tap)" },
      { key: "", label: "" },
      { key: "Q", label: "Light High Attack" },
      { key: "W", label: "Medium High Attack" },
      { key: "E", label: "Heavy High Attack" },
      { key: "A", label: "Light Low Attack" },
      { key: "S", label: "Medium Low Attack" },
      { key: "D", label: "Heavy Low Attack" },
      { key: "", label: "" },
      { key: "Q+A", label: "Grab / Throw" },
      { key: "ESC", label: "Pause" },
    ];

    let cy = topY + 42;
    const leftContentX = startX + 14;
    let rowIdx = 0;
    for (const ctrl of controls) {
      if (ctrl.key === "") {
        cy += 6;
        continue;
      }

      // Alternating row background
      const rowBg = new Graphics();
      rowBg.roundRect(startX + 4, cy - 3, leftPanelW - 8, 20, 2);
      rowBg.fill({ color: rowIdx % 2 === 0 ? COL_ROW_EVEN : COL_ROW_ODD, alpha: 0.6 });
      this.container.addChild(rowBg);

      const keyText = new Text({
        text: ctrl.key,
        style: { fontFamily: "monospace", fontSize: 13, fill: COL_KEY, fontWeight: "bold" },
      });
      keyText.position.set(leftContentX, cy);
      this.container.addChild(keyText);

      const labelText = new Text({
        text: ctrl.label,
        style: { fontFamily: "monospace", fontSize: 12, fill: COL_LABEL },
      });
      labelText.position.set(leftContentX + 110, cy + 1);
      this.container.addChild(labelText);

      cy += 22;
      rowIdx++;
    }

    // ---- Right column: Character Specials ----
    const rightX = startX + leftPanelW + gap;
    const charId = DUEL_CHARACTER_IDS[this._charIndex];
    const charDef = DUEL_CHARACTERS[charId];
    const specials = getCharSpecials(charId);

    this._drawPanel(rightX, topY, rightPanelW, panelH, `${charDef.name.toUpperCase()} - MOVES`);

    // Character selector tabs
    const tabY = topY + 36;
    const tabW = 90;
    const tabWSelected = 96;
    const tabGap = 6;
    const tabTotalW = DUEL_CHARACTER_IDS.length * tabW + (DUEL_CHARACTER_IDS.length - 1) * tabGap;
    const tabStartX = rightX + (rightPanelW - tabTotalW) / 2;

    for (let i = 0; i < DUEL_CHARACTER_IDS.length; i++) {
      const cId = DUEL_CHARACTER_IDS[i];
      const cDef = DUEL_CHARACTERS[cId];
      const isSelected = i === this._charIndex;
      const tabX = tabStartX + i * (tabW + tabGap);
      const currentTabW = isSelected ? tabWSelected : tabW;
      const tabH = isSelected ? 28 : 24;
      const tabYOff = isSelected ? tabY - 2 : tabY;
      const tabXOff = isSelected ? tabX - (tabWSelected - tabW) / 2 : tabX;

      if (isSelected) {
        // Glow behind selected tab
        const tabGlow = new Graphics();
        tabGlow.roundRect(tabXOff - 2, tabYOff - 2, currentTabW + 4, tabH + 4, 6);
        tabGlow.fill({ color: COL_GOLD_BRIGHT, alpha: 0.15 });
        this.container.addChild(tabGlow);
      }

      const tabBg = new Graphics();
      tabBg.roundRect(tabXOff, tabYOff, currentTabW, tabH, 4);
      if (isSelected) {
        tabBg.fill({ color: COL_ACCENT });
        // Bright top edge for raised look
        tabBg.moveTo(tabXOff + 4, tabYOff + 1);
        tabBg.lineTo(tabXOff + currentTabW - 4, tabYOff + 1);
        tabBg.stroke({ color: 0xff7788, width: 1, alpha: 0.7 });
        // Gold border glow
        tabBg.roundRect(tabXOff, tabYOff, currentTabW, tabH, 4);
        tabBg.stroke({ color: COL_GOLD_BRIGHT, width: 1.5, alpha: 0.8 });
      } else {
        tabBg.fill({ color: 0x222233 });
        tabBg.roundRect(tabXOff, tabYOff, currentTabW, tabH, 4);
        tabBg.stroke({ color: 0x444455, width: 1, alpha: 0.5 });
      }
      this.container.addChild(tabBg);

      const tabText = new Text({
        text: cDef.name,
        style: {
          fontFamily: "monospace",
          fontSize: isSelected ? 13 : 12,
          fill: isSelected ? COL_TITLE : 0x9999aa,
          fontWeight: "bold",
        },
      });
      tabText.anchor.set(0.5, 0.5);
      tabText.position.set(tabXOff + currentTabW / 2, tabYOff + tabH / 2);
      this.container.addChild(tabText);
    }

    // Special moves section
    let sy = tabY + 40;
    const colInput = rightX + 14;
    const colName = rightX + 110;

    // Header
    const hdrInput = new Text({
      text: "INPUT",
      style: { fontFamily: "monospace", fontSize: 11, fill: COL_GOLD_DIM, fontWeight: "bold" },
    });
    hdrInput.position.set(colInput, sy);
    this.container.addChild(hdrInput);

    const hdrName = new Text({
      text: "SPECIAL MOVE",
      style: { fontFamily: "monospace", fontSize: 11, fill: COL_GOLD_DIM, fontWeight: "bold" },
    });
    hdrName.position.set(colName, sy);
    this.container.addChild(hdrName);

    sy += 16;

    // Ornamental separator
    this._drawOrnamentalSeparator(colInput, rightX + rightPanelW - 14, sy);
    sy += 8;

    let specialRowIdx = 0;
    for (const sp of specials) {
      // Alternating row bg
      const rowBg = new Graphics();
      rowBg.roundRect(rightX + 4, sy - 3, rightPanelW - 8, 22, 2);
      rowBg.fill({ color: specialRowIdx % 2 === 0 ? COL_ROW_EVEN : COL_ROW_ODD, alpha: 0.6 });
      this.container.addChild(rowBg);

      // Type color dot
      const dotColor =
        sp.type === "grab" ? COL_DOT_GRAB : sp.type === "utility" ? COL_DOT_UTILITY : COL_DOT_ATTACK;
      const dot = new Graphics();
      dot.circle(colName - 10, sy + 8, 3);
      dot.fill({ color: dotColor });
      dot.circle(colName - 10, sy + 8, 3);
      dot.stroke({ color: dotColor, width: 0.5, alpha: 0.5 });
      this.container.addChild(dot);

      this._drawKeyCombo(colInput, sy, sp.input, true);

      const moveName = new Text({
        text: sp.name,
        style: { fontFamily: "monospace", fontSize: 13, fill: COL_TEXT },
      });
      moveName.position.set(colName, sy);
      this.container.addChild(moveName);

      sy += 24;
      specialRowIdx++;
    }

    // Normals section
    sy += 6;
    this._drawOrnamentalSeparator(colInput, rightX + rightPanelW - 14, sy);
    sy += 8;

    const normTitle = new Text({
      text: "NORMALS",
      style: { fontFamily: "monospace", fontSize: 11, fill: COL_GOLD_DIM, fontWeight: "bold" },
    });
    normTitle.position.set(colInput, sy);
    this.container.addChild(normTitle);
    sy += 18;

    const normalKeys = [
      { key: "Q", name: charDef.normals.light_high?.name ?? "Light High" },
      { key: "W", name: charDef.normals.med_high?.name ?? "Med High" },
      { key: "E", name: charDef.normals.heavy_high?.name ?? "Heavy High" },
      { key: "A", name: charDef.normals.light_low?.name ?? "Light Low" },
      { key: "S", name: charDef.normals.med_low?.name ?? "Med Low" },
      { key: "D", name: charDef.normals.heavy_low?.name ?? "Heavy Low" },
    ];

    let normalRowIdx = 0;
    for (const nk of normalKeys) {
      // Alternating row bg
      const rowBg = new Graphics();
      rowBg.roundRect(rightX + 4, sy - 3, rightPanelW - 8, 20, 2);
      rowBg.fill({ color: normalRowIdx % 2 === 0 ? COL_ROW_EVEN : COL_ROW_ODD, alpha: 0.6 });
      this.container.addChild(rowBg);

      this._drawKeyCombo(colInput, sy, nk.key, true);

      const nName = new Text({
        text: nk.name,
        style: { fontFamily: "monospace", fontSize: 12, fill: 0xaaaacc },
      });
      nName.position.set(colName, sy);
      this.container.addChild(nName);

      sy += 22;
      normalRowIdx++;
    }

    // Footer with panel background
    this._drawFooter(sw, sh);
  }

  // ---- Title with golden glow and ornamental flanking lines ----
  private _drawTitle(sw: number): void {
    const titleY = 12;
    const time = performance.now() / 1000;
    const glowAlpha = 0.25 + Math.sin(time * 2) * 0.1;

    // Golden glow behind title
    const glow = new Graphics();
    glow.roundRect(sw / 2 - 120, titleY - 4, 240, 44, 8);
    glow.fill({ color: COL_GOLD_BRIGHT, alpha: glowAlpha * 0.15 });
    this.container.addChild(glow);

    const title = new Text({
      text: "CONTROLS",
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 36,
        fill: COL_TITLE,
        fontWeight: "bold",
        letterSpacing: 3,
      },
    });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, titleY);
    this.container.addChild(title);

    // Gold shadow text for glow effect
    const titleGlow = new Text({
      text: "CONTROLS",
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 36,
        fill: COL_GOLD,
        fontWeight: "bold",
        letterSpacing: 3,
      },
    });
    titleGlow.anchor.set(0.5, 0);
    titleGlow.position.set(sw / 2, titleY);
    titleGlow.alpha = glowAlpha * 0.4;
    this.container.addChild(titleGlow);

    // Ornamental lines flanking title
    const lineLen = 80;
    const lineY = titleY + 20;
    const ornLine = new Graphics();
    // Left line
    const leftLineEnd = sw / 2 - 100;
    const leftLineStart = leftLineEnd - lineLen;
    ornLine.moveTo(leftLineStart, lineY);
    ornLine.lineTo(leftLineEnd, lineY);
    ornLine.stroke({ color: COL_GOLD, width: 1.5, alpha: 0.6 });
    // Left diamond
    this._drawDiamond(ornLine, leftLineStart - 6, lineY, 4, COL_GOLD, 0.7);
    this._drawDiamond(ornLine, leftLineEnd + 4, lineY, 3, COL_GOLD_BRIGHT, 0.5);

    // Right line
    const rightLineStart = sw / 2 + 100;
    const rightLineEnd = rightLineStart + lineLen;
    ornLine.moveTo(rightLineStart, lineY);
    ornLine.lineTo(rightLineEnd, lineY);
    ornLine.stroke({ color: COL_GOLD, width: 1.5, alpha: 0.6 });
    // Right diamond
    this._drawDiamond(ornLine, rightLineEnd + 6, lineY, 4, COL_GOLD, 0.7);
    this._drawDiamond(ornLine, rightLineStart - 4, lineY, 3, COL_GOLD_BRIGHT, 0.5);

    this.container.addChild(ornLine);
  }

  /** Draw a small diamond shape at (cx, cy) */
  private _drawDiamond(g: Graphics, cx: number, cy: number, r: number, color: number, alpha: number): void {
    g.moveTo(cx, cy - r);
    g.lineTo(cx + r, cy);
    g.lineTo(cx, cy + r);
    g.lineTo(cx - r, cy);
    g.closePath();
    g.fill({ color, alpha });
  }

  /** Draw styled key combo like "Q+W" or "S+D" with 3D key cap boxes */
  private _drawKeyCombo(x: number, y: number, input: string, useGold: boolean = false): void {
    const keys = input.split("+");
    let kx = x;

    const borderColor = useGold ? COL_GOLD : COL_SPECIAL;
    const textColor = useGold ? COL_GOLD_BRIGHT : COL_SPECIAL;

    for (let k = 0; k < keys.length; k++) {
      if (k > 0) {
        const plus = new Text({
          text: "+",
          style: { fontFamily: "monospace", fontSize: 12, fill: 0x888899 },
        });
        plus.position.set(kx + 1, y + 1);
        this.container.addChild(plus);
        kx += 12;
      }

      const keyStr = keys[k];
      const keyW = Math.max(keyStr.length * 10 + 8, 24);
      const keyH = 20;

      // Drop shadow beneath key cap
      const keyShadow = new Graphics();
      keyShadow.roundRect(kx + 1, y + 2, keyW, keyH, 3);
      keyShadow.fill({ color: 0x000000, alpha: 0.35 });
      this.container.addChild(keyShadow);

      // Key face (main body)
      const keyBg = new Graphics();
      keyBg.roundRect(kx, y - 1, keyW, keyH, 3);
      keyBg.fill({ color: COL_KEY_FACE });
      // Bottom edge (shadow)
      keyBg.moveTo(kx + 3, y - 1 + keyH);
      keyBg.lineTo(kx + keyW - 3, y - 1 + keyH);
      keyBg.stroke({ color: COL_KEY_BOTTOM, width: 2 });
      // Top edge (highlight)
      keyBg.moveTo(kx + 3, y);
      keyBg.lineTo(kx + keyW - 3, y);
      keyBg.stroke({ color: COL_KEY_TOP, width: 1.5 });
      // Border
      keyBg.roundRect(kx, y - 1, keyW, keyH, 3);
      keyBg.stroke({ color: borderColor, width: 1, alpha: 0.8 });
      this.container.addChild(keyBg);

      const keyLabel = new Text({
        text: keyStr,
        style: { fontFamily: "monospace", fontSize: 12, fill: textColor, fontWeight: "bold" },
      });
      keyLabel.anchor.set(0.5, 0);
      keyLabel.position.set(kx + keyW / 2, y);
      this.container.addChild(keyLabel);
      kx += keyW + 3;
    }
  }

  private _drawPanel(x: number, y: number, w: number, h: number, label: string): void {
    // Outer border (accent)
    const outerBorder = new Graphics();
    outerBorder.roundRect(x - 1, y - 1, w + 2, h + 2, 9);
    outerBorder.stroke({ color: COL_GOLD_DIM, width: 1.5, alpha: 0.4 });
    this.container.addChild(outerBorder);

    // Main panel fill
    const panel = new Graphics();
    panel.roundRect(x, y, w, h, 8);
    panel.fill({ color: COL_PANEL, alpha: 0.92 });
    this.container.addChild(panel);

    // Inner gradient-like overlay for 3D depth (top lighter, bottom darker)
    const innerGrad = new Graphics();
    innerGrad.roundRect(x + 2, y + 2, w - 4, h / 3, 6);
    innerGrad.fill({ color: 0xffffff, alpha: 0.03 });
    this.container.addChild(innerGrad);

    const innerGradBot = new Graphics();
    innerGradBot.roundRect(x + 2, y + h * 0.7, w - 4, h * 0.28, 6);
    innerGradBot.fill({ color: 0x000000, alpha: 0.08 });
    this.container.addChild(innerGradBot);

    // Inner border (dark)
    const innerBorder = new Graphics();
    innerBorder.roundRect(x + 2, y + 2, w - 4, h - 4, 6);
    innerBorder.stroke({ color: 0x222244, width: 1, alpha: 0.6 });
    this.container.addChild(innerBorder);

    // Corner ornaments (L-brackets)
    const orn = new Graphics();
    const cornerSize = 10;
    const cornerAlpha = 0.5;
    const cornerColor = COL_GOLD;
    // Top-left
    orn.moveTo(x + 4, y + 4 + cornerSize);
    orn.lineTo(x + 4, y + 4);
    orn.lineTo(x + 4 + cornerSize, y + 4);
    orn.stroke({ color: cornerColor, width: 1.5, alpha: cornerAlpha });
    // Top-right
    orn.moveTo(x + w - 4 - cornerSize, y + 4);
    orn.lineTo(x + w - 4, y + 4);
    orn.lineTo(x + w - 4, y + 4 + cornerSize);
    orn.stroke({ color: cornerColor, width: 1.5, alpha: cornerAlpha });
    // Bottom-left
    orn.moveTo(x + 4, y + h - 4 - cornerSize);
    orn.lineTo(x + 4, y + h - 4);
    orn.lineTo(x + 4 + cornerSize, y + h - 4);
    orn.stroke({ color: cornerColor, width: 1.5, alpha: cornerAlpha });
    // Bottom-right
    orn.moveTo(x + w - 4 - cornerSize, y + h - 4);
    orn.lineTo(x + w - 4, y + h - 4);
    orn.lineTo(x + w - 4, y + h - 4 - cornerSize);
    orn.stroke({ color: cornerColor, width: 1.5, alpha: cornerAlpha });
    this.container.addChild(orn);

    // Panel title
    const panelTitle = new Text({
      text: label,
      style: { fontFamily: "monospace", fontSize: 13, fill: COL_ACCENT, fontWeight: "bold", letterSpacing: 1 },
    });
    panelTitle.anchor.set(0.5, 0);
    panelTitle.position.set(x + w / 2, y + 7);
    this.container.addChild(panelTitle);

    // Title underline accent bar
    const titleBarW = Math.min(label.length * 8 + 20, w - 40);
    const titleBarX = x + (w - titleBarW) / 2;
    const titleBarY = y + 24;
    const titleBar = new Graphics();
    titleBar.moveTo(titleBarX, titleBarY);
    titleBar.lineTo(titleBarX + titleBarW, titleBarY);
    titleBar.stroke({ color: COL_ACCENT, width: 1.5, alpha: 0.5 });
    // Small diamond at center of underline
    this._drawDiamond(titleBar, titleBarX + titleBarW / 2, titleBarY, 2.5, COL_GOLD_BRIGHT, 0.6);
    this.container.addChild(titleBar);
  }

  /** Ornamental separator with center and end diamonds */
  private _drawOrnamentalSeparator(x1: number, x2: number, y: number): void {
    const sep = new Graphics();
    const midX = (x1 + x2) / 2;
    // Left segment
    sep.moveTo(x1, y);
    sep.lineTo(midX - 8, y);
    sep.stroke({ color: COL_BORDER, width: 1 });
    // Right segment
    sep.moveTo(midX + 8, y);
    sep.lineTo(x2, y);
    sep.stroke({ color: COL_BORDER, width: 1 });
    // Center diamond
    this._drawDiamond(sep, midX, y, 4, COL_GOLD, 0.6);
    // End dots
    sep.circle(x1, y, 2);
    sep.fill({ color: COL_GOLD_DIM, alpha: 0.5 });
    sep.circle(x2, y, 2);
    sep.fill({ color: COL_GOLD_DIM, alpha: 0.5 });
    this.container.addChild(sep);
  }

  /** Footer with subtle panel background */
  private _drawFooter(sw: number, sh: number): void {
    const footerH = 30;
    const footerY = sh - footerH - 4;
    const footerW = 420;
    const footerX = (sw - footerW) / 2;

    const footerBg = new Graphics();
    footerBg.roundRect(footerX, footerY, footerW, footerH, 6);
    footerBg.fill({ color: COL_PANEL, alpha: 0.7 });
    footerBg.roundRect(footerX, footerY, footerW, footerH, 6);
    footerBg.stroke({ color: COL_GOLD_DIM, width: 1, alpha: 0.3 });
    this.container.addChild(footerBg);

    const inst = new Text({
      text: "\u2190 \u2192 Switch Character   ESC / ENTER Back",
      style: { fontFamily: "monospace", fontSize: 13, fill: 0xaaaabb },
    });
    inst.anchor.set(0.5, 0.5);
    inst.position.set(sw / 2, footerY + footerH / 2);
    this.container.addChild(inst);
  }

  private _drawBackground(sw: number, sh: number): void {
    const bg = new Graphics();
    const time = performance.now() / 1000;

    bg.rect(0, 0, sw, sh);
    bg.fill({ color: COL_BG });
    bg.rect(0, sh * 0.3, sw, sh * 0.4);
    bg.fill({ color: COL_BG_MID, alpha: 0.5 });

    // Animated horizontal lines
    for (let i = 0; i < 20; i++) {
      const y = ((i * 60 + time * 30) % sh);
      const wobble = Math.sin(time + i) * 50;
      bg.moveTo(0, y);
      bg.lineTo(sw, y + wobble);
      bg.stroke({ color: COL_ACCENT, width: 2, alpha: 0.1 });
    }

    // Animated vertical lines
    for (let i = 0; i < 15; i++) {
      const x = ((i * 140 + time * 20) % sw);
      const wobble = Math.sin(time + i) * 30;
      bg.moveTo(x, 0);
      bg.lineTo(x + wobble, sh);
      bg.stroke({ color: 0x6432c8, width: 2, alpha: 0.08 });
    }

    this.container.addChild(bg);

    // Floating golden embers
    const embers = new Graphics();
    for (let i = 0; i < 30; i++) {
      // Deterministic pseudo-random positioning based on index
      const seed1 = Math.sin(i * 127.1 + 311.7) * 43758.5453;
      const seed2 = Math.sin(i * 269.5 + 183.3) * 43758.5453;
      const baseX = (seed1 - Math.floor(seed1)) * sw;
      const baseY = (seed2 - Math.floor(seed2)) * sh;

      const speed = 0.3 + (i % 7) * 0.15;
      const ex = baseX + Math.sin(time * speed + i * 0.7) * 20;
      const ey = ((baseY - time * (15 + (i % 5) * 8)) % (sh + 40)) + 20;
      const adjustedEy = ey < 0 ? ey + sh + 40 : ey;

      const emberAlpha = 0.15 + Math.sin(time * 2 + i) * 0.1;
      const emberSize = 1 + (i % 3) * 0.5;

      embers.circle(ex, adjustedEy, emberSize);
      embers.fill({ color: i % 3 === 0 ? COL_GOLD_BRIGHT : COL_GOLD, alpha: emberAlpha });
    }
    this.container.addChild(embers);
  }

  private _cleanup(): void {
    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }
  }

  destroy(): void {
    this._cleanup();
    this.container.destroy({ children: true });
  }
}
