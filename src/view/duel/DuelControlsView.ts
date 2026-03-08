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

// ---- Special input definitions per character --------------------------------

interface SpecialInput {
  name: string;
  input: string;
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

  const specials: SpecialInput[] = [];
  for (const [moveId, move] of Object.entries(charDef.specials)) {
    specials.push({
      name: move.name,
      input: inputMap[moveId] ?? "??",
    });
  }

  specials.push({
    name: charDef.grab.name,
    input: "Q+A",
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

    // Title
    const title = new Text({
      text: "CONTROLS",
      style: { fontFamily: 'Impact, "Arial Black", sans-serif', fontSize: 36, fill: COL_TITLE, fontWeight: "bold", letterSpacing: 3 },
    });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 12);
    this.container.addChild(title);

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

    let cy = topY + 38;
    const leftContentX = startX + 14;
    for (const ctrl of controls) {
      if (ctrl.key === "") {
        cy += 6;
        continue;
      }

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
    }

    // ---- Right column: Character Specials ----
    const rightX = startX + leftPanelW + gap;
    const charId = DUEL_CHARACTER_IDS[this._charIndex];
    const charDef = DUEL_CHARACTERS[charId];
    const specials = getCharSpecials(charId);

    this._drawPanel(rightX, topY, rightPanelW, panelH, `${charDef.name.toUpperCase()} - MOVES`);

    // Character selector tabs
    const tabY = topY + 32;
    const tabW = 90;
    const tabGap = 6;
    const tabTotalW = DUEL_CHARACTER_IDS.length * tabW + (DUEL_CHARACTER_IDS.length - 1) * tabGap;
    const tabStartX = rightX + (rightPanelW - tabTotalW) / 2;

    for (let i = 0; i < DUEL_CHARACTER_IDS.length; i++) {
      const cId = DUEL_CHARACTER_IDS[i];
      const cDef = DUEL_CHARACTERS[cId];
      const isSelected = i === this._charIndex;
      const tabX = tabStartX + i * (tabW + tabGap);

      const tabBg = new Graphics();
      tabBg.roundRect(tabX, tabY, tabW, 24, 4);
      tabBg.fill({ color: isSelected ? COL_ACCENT : 0x222233 });
      this.container.addChild(tabBg);

      const tabText = new Text({
        text: cDef.name,
        style: { fontFamily: "monospace", fontSize: 12, fill: isSelected ? COL_TITLE : 0x666688, fontWeight: "bold" },
      });
      tabText.anchor.set(0.5, 0.5);
      tabText.position.set(tabX + tabW / 2, tabY + 12);
      this.container.addChild(tabText);
    }

    // Special moves section
    let sy = tabY + 36;
    const colInput = rightX + 14;
    const colName = rightX + 110;

    // Header
    const hdrInput = new Text({
      text: "INPUT",
      style: { fontFamily: "monospace", fontSize: 11, fill: 0x666688, fontWeight: "bold" },
    });
    hdrInput.position.set(colInput, sy);
    this.container.addChild(hdrInput);

    const hdrName = new Text({
      text: "SPECIAL MOVE",
      style: { fontFamily: "monospace", fontSize: 11, fill: 0x666688, fontWeight: "bold" },
    });
    hdrName.position.set(colName, sy);
    this.container.addChild(hdrName);

    sy += 16;

    // Separator
    const sep = new Graphics();
    sep.moveTo(colInput, sy);
    sep.lineTo(rightX + rightPanelW - 14, sy);
    sep.stroke({ color: COL_BORDER, width: 1 });
    this.container.addChild(sep);
    sy += 6;

    for (const sp of specials) {
      this._drawKeyCombo(colInput, sy, sp.input);

      const moveName = new Text({
        text: sp.name,
        style: { fontFamily: "monospace", fontSize: 13, fill: COL_TEXT },
      });
      moveName.position.set(colName, sy);
      this.container.addChild(moveName);

      sy += 24;
    }

    // Normals section
    sy += 6;
    const sep2 = new Graphics();
    sep2.moveTo(colInput, sy);
    sep2.lineTo(rightX + rightPanelW - 14, sy);
    sep2.stroke({ color: COL_BORDER, width: 1 });
    this.container.addChild(sep2);
    sy += 6;

    const normTitle = new Text({
      text: "NORMALS",
      style: { fontFamily: "monospace", fontSize: 11, fill: 0x666688, fontWeight: "bold" },
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

    for (const nk of normalKeys) {
      this._drawKeyCombo(colInput, sy, nk.key);

      const nName = new Text({
        text: nk.name,
        style: { fontFamily: "monospace", fontSize: 12, fill: 0xaaaacc },
      });
      nName.position.set(colName, sy);
      this.container.addChild(nName);

      sy += 22;
    }

    // Footer
    const inst = new Text({
      text: "\u2190 \u2192 Switch Character   ESC / ENTER Back",
      style: { fontFamily: "monospace", fontSize: 13, fill: 0x888899 },
    });
    inst.anchor.set(0.5, 0);
    inst.position.set(sw / 2, sh - 28);
    this.container.addChild(inst);
  }

  /** Draw styled key combo like "Q+W" or "S+D" with key cap boxes */
  private _drawKeyCombo(x: number, y: number, input: string): void {
    const keys = input.split("+");
    let kx = x;

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
      const keyBg = new Graphics();
      keyBg.roundRect(kx, y - 1, keyW, 20, 3);
      keyBg.fill({ color: 0x333344 });
      keyBg.stroke({ color: COL_SPECIAL, width: 1 });
      this.container.addChild(keyBg);

      const keyLabel = new Text({
        text: keyStr,
        style: { fontFamily: "monospace", fontSize: 12, fill: COL_SPECIAL, fontWeight: "bold" },
      });
      keyLabel.anchor.set(0.5, 0);
      keyLabel.position.set(kx + keyW / 2, y);
      this.container.addChild(keyLabel);
      kx += keyW + 3;
    }
  }

  private _drawPanel(x: number, y: number, w: number, h: number, label: string): void {
    const panel = new Graphics();
    panel.roundRect(x, y, w, h, 8);
    panel.fill({ color: COL_PANEL, alpha: 0.9 });
    panel.stroke({ color: COL_BORDER, width: 1 });
    this.container.addChild(panel);

    const panelTitle = new Text({
      text: label,
      style: { fontFamily: "monospace", fontSize: 13, fill: COL_ACCENT, fontWeight: "bold" },
    });
    panelTitle.anchor.set(0.5, 0);
    panelTitle.position.set(x + w / 2, y + 6);
    this.container.addChild(panelTitle);
  }

  private _drawBackground(sw: number, sh: number): void {
    const bg = new Graphics();
    const time = performance.now() / 1000;

    bg.rect(0, 0, sw, sh);
    bg.fill({ color: COL_BG });
    bg.rect(0, sh * 0.3, sw, sh * 0.4);
    bg.fill({ color: COL_BG_MID, alpha: 0.5 });

    for (let i = 0; i < 20; i++) {
      const y = ((i * 60 + time * 30) % sh);
      const wobble = Math.sin(time + i) * 50;
      bg.moveTo(0, y);
      bg.lineTo(sw, y + wobble);
      bg.stroke({ color: COL_ACCENT, width: 2, alpha: 0.1 });
    }

    for (let i = 0; i < 15; i++) {
      const x = ((i * 140 + time * 20) % sw);
      const wobble = Math.sin(time + i) * 30;
      bg.moveTo(x, 0);
      bg.lineTo(x + wobble, sh);
      bg.stroke({ color: 0x6432c8, width: 2, alpha: 0.08 });
    }

    this.container.addChild(bg);
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
