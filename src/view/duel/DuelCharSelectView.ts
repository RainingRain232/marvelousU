// ---------------------------------------------------------------------------
// Duel mode – character select screen
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from "pixi.js";
import {
  DUEL_CHARACTERS,
  DUEL_CHARACTER_IDS,
} from "../../duel/config/DuelCharacterDefs";
import { DUEL_ARENA_IDS, DUEL_ARENAS } from "../../duel/config/DuelArenaDefs";
import type { DuelCharacterDef } from "../../duel/state/DuelState";
import { duelAudio } from "../../duel/systems/DuelAudioSystem";

const COL_BG = 0x0a0015;
const COL_BG_MID = 0x1a0a30;
const COL_PANEL = 0x1a1a2e;
const COL_BORDER = 0x444466;
const COL_ACCENT = 0xe94560;
const COL_SELECTED = 0xe94560;
const COL_TEXT = 0xeeeeee;
const COL_TITLE = 0xffffff;
const COL_STAT = 0x88aacc;

type StartCallback = (p1Id: string, p2Id: string, arenaId: string) => void;

export class DuelCharSelectView {
  readonly container = new Container();

  private _p1Index = 0;
  private _p2Index = 1;
  private _arenaIndex = 0;
  private _phase: "character" | "arena" = "character";
  private _startCallback: StartCallback | null = null;
  private _onEscapeCallback: (() => void) | null = null;
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;

  private _screenW = 0;
  private _screenH = 0;

  setStartCallback(cb: StartCallback): void {
    this._startCallback = cb;
  }

  setEscapeCallback(cb: () => void): void {
    this._onEscapeCallback = cb;
  }

  show(sw: number, sh: number): void {
    this._screenW = sw;
    this._screenH = sh;
    this._phase = "character";
    this._p1Index = 0;
    this._p2Index = 1;
    this._arenaIndex = 0;

    this._draw();

    this._onKeyDown = (e: KeyboardEvent) => {
      if (this._phase === "character") {
        this._handleCharInput(e);
      } else {
        this._handleArenaInput(e);
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }

  private _handleCharInput(e: KeyboardEvent): void {
    const ids = DUEL_CHARACTER_IDS;
    switch (e.code) {
      case "ArrowLeft":
        this._p1Index = (this._p1Index - 1 + ids.length) % ids.length;
        duelAudio.playSelect();
        break;
      case "ArrowRight":
        this._p1Index = (this._p1Index + 1) % ids.length;
        duelAudio.playSelect();
        break;
      case "Enter":
      case "Space":
        duelAudio.playConfirm();
        this._phase = "arena";
        // AI picks a different character
        this._p2Index = (this._p1Index + 1 + Math.floor(Math.random() * (ids.length - 1))) % ids.length;
        break;
      case "Escape":
        duelAudio.playCancel();
        this._onEscapeCallback?.();
        return;
      default:
        return;
    }
    e.preventDefault();
    this._draw();
  }

  private _handleArenaInput(e: KeyboardEvent): void {
    const arenas = DUEL_ARENA_IDS;
    switch (e.code) {
      case "ArrowLeft":
        this._arenaIndex = (this._arenaIndex - 1 + arenas.length) % arenas.length;
        duelAudio.playSelect();
        break;
      case "ArrowRight":
        this._arenaIndex = (this._arenaIndex + 1) % arenas.length;
        duelAudio.playSelect();
        break;
      case "Enter":
      case "Space":
        duelAudio.playConfirm();
        this._cleanup();
        this._startCallback?.(
          DUEL_CHARACTER_IDS[this._p1Index],
          DUEL_CHARACTER_IDS[this._p2Index],
          DUEL_ARENA_IDS[this._arenaIndex],
        );
        return;
      case "Escape":
        duelAudio.playCancel();
        this._phase = "character";
        break;
      default:
        return;
    }
    e.preventDefault();
    this._draw();
  }

  private _drawMenuBackground(sw: number, sh: number): void {
    const bg = new Graphics();
    const time = performance.now() / 1000;

    // Dark gradient background
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
  }

  private _draw(): void {
    this.container.removeChildren();
    const sw = this._screenW;
    const sh = this._screenH;

    // Background
    this._drawMenuBackground(sw, sh);

    if (this._phase === "character") {
      this._drawCharacterSelect(sw, sh);
    } else {
      this._drawArenaSelect(sw, sh);
    }
  }

  private _drawCharacterSelect(sw: number, sh: number): void {
    // Title
    const title = new Text({
      text: "CHOOSE YOUR CHAMPION",
      style: { fontFamily: 'Impact, "Arial Black", sans-serif', fontSize: 36, fill: COL_TITLE, fontWeight: "bold", letterSpacing: 2 },
    });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 30);
    this.container.addChild(title);

    // Character cards
    const cardW = 180;
    const cardH = 280;
    const gap = 30;
    const totalW = DUEL_CHARACTER_IDS.length * cardW + (DUEL_CHARACTER_IDS.length - 1) * gap;
    const startX = (sw - totalW) / 2;

    for (let i = 0; i < DUEL_CHARACTER_IDS.length; i++) {
      const charId = DUEL_CHARACTER_IDS[i];
      const charDef = DUEL_CHARACTERS[charId];
      const x = startX + i * (cardW + gap);
      const y = 100;
      const isSelected = i === this._p1Index;

      this._drawCharCard(x, y, cardW, cardH, charDef, isSelected);
    }

    // Instructions
    const inst = new Text({
      text: "\u2190 \u2192 Select   ENTER Confirm   ESC Back",
      style: { fontFamily: "monospace", fontSize: 14, fill: 0x888899 },
    });
    inst.anchor.set(0.5, 0);
    inst.position.set(sw / 2, sh - 40);
    this.container.addChild(inst);

    // Controls info
    const controls = new Text({
      text: "Controls: \u2190\u2191\u2192\u2193 Move/Jump/Crouch  |  Q W E High Attacks  |  A S D Low Attacks  |  Two buttons = Special",
      style: { fontFamily: "monospace", fontSize: 11, fill: 0x667788 },
    });
    controls.anchor.set(0.5, 0);
    controls.position.set(sw / 2, sh - 20);
    this.container.addChild(controls);
  }

  private _drawCharCard(
    x: number,
    y: number,
    w: number,
    h: number,
    charDef: DuelCharacterDef,
    selected: boolean,
  ): void {
    const card = new Graphics();

    // Card background
    card.roundRect(x, y, w, h, 8);
    card.fill({ color: COL_PANEL });
    card.stroke({ color: selected ? COL_SELECTED : COL_BORDER, width: selected ? 3 : 1 });

    // Selection indicator
    if (selected) {
      card.roundRect(x + 2, y + 2, w - 4, h - 4, 7);
      card.stroke({ color: COL_SELECTED, width: 1, alpha: 0.3 });
    }

    this.container.addChild(card);

    // Portrait placeholder (colored rectangle with icon)
    const portraitG = new Graphics();
    const portraitColor =
      charDef.fighterType === "sword" ? 0x3366cc :
      charDef.fighterType === "mage" ? 0x6633aa :
      0x33aa66;
    portraitG.roundRect(x + 15, y + 15, w - 30, 100, 4);
    portraitG.fill({ color: portraitColor, alpha: 0.6 });
    portraitG.stroke({ color: portraitColor, width: 1 });
    this.container.addChild(portraitG);

    // Type icon
    const icon =
      charDef.fighterType === "sword" ? "\u2694" :
      charDef.fighterType === "mage" ? "\u2728" :
      "\u{1F3F9}";
    const iconText = new Text({
      text: icon,
      style: { fontFamily: "monospace", fontSize: 36, fill: 0xffffff },
    });
    iconText.anchor.set(0.5);
    iconText.position.set(x + w / 2, y + 65);
    this.container.addChild(iconText);

    // Name
    const name = new Text({
      text: charDef.name,
      style: { fontFamily: "monospace", fontSize: 18, fill: COL_TEXT, fontWeight: "bold" },
    });
    name.anchor.set(0.5, 0);
    name.position.set(x + w / 2, y + 125);
    this.container.addChild(name);

    // Title
    const titleText = new Text({
      text: charDef.title,
      style: { fontFamily: "monospace", fontSize: 11, fill: COL_STAT },
    });
    titleText.anchor.set(0.5, 0);
    titleText.position.set(x + w / 2, y + 148);
    this.container.addChild(titleText);

    // Stat bars
    const stats = [
      { label: "HP", value: charDef.maxHp / 1000 },
      { label: "SPD", value: charDef.walkSpeed / 4.5 },
      { label: "DMG", value: charDef.fighterType === "sword" ? 0.9 : charDef.fighterType === "mage" ? 0.65 : 0.5 },
      { label: "RNG", value: charDef.fighterType === "archer" ? 0.95 : charDef.fighterType === "mage" ? 0.85 : 0.55 },
    ];

    const barY = y + 175;
    for (let s = 0; s < stats.length; s++) {
      const sy = barY + s * 22;

      const label = new Text({
        text: stats[s].label,
        style: { fontFamily: "monospace", fontSize: 10, fill: 0x888899 },
      });
      label.position.set(x + 15, sy);
      this.container.addChild(label);

      const barBg = new Graphics();
      barBg.rect(x + 50, sy + 2, w - 75, 10);
      barBg.fill({ color: 0x222233 });
      barBg.rect(x + 50, sy + 2, (w - 75) * stats[s].value, 10);
      barBg.fill({ color: selected ? COL_SELECTED : COL_STAT });
      this.container.addChild(barBg);
    }
  }

  private _drawArenaSelect(sw: number, sh: number): void {
    const title = new Text({
      text: "CHOOSE YOUR ARENA",
      style: { fontFamily: "monospace", fontSize: 32, fill: COL_TITLE, fontWeight: "bold" },
    });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 30);
    this.container.addChild(title);

    // Arena cards
    const cardW = 200;
    const cardH = 160;
    const gap = 30;
    const totalW = DUEL_ARENA_IDS.length * cardW + (DUEL_ARENA_IDS.length - 1) * gap;
    const startX = (sw - totalW) / 2;

    for (let i = 0; i < DUEL_ARENA_IDS.length; i++) {
      const arenaId = DUEL_ARENA_IDS[i];
      const arena = DUEL_ARENAS[arenaId];
      const x = startX + i * (cardW + gap);
      const y = 120;
      const isSelected = i === this._arenaIndex;

      const card = new Graphics();
      card.roundRect(x, y, cardW, cardH, 8);
      card.fill({ color: COL_PANEL });
      card.stroke({ color: isSelected ? COL_SELECTED : COL_BORDER, width: isSelected ? 3 : 1 });

      // Arena preview (mini landscape)
      card.rect(x + 10, y + 10, cardW - 20, 90);
      card.fill({ color: arena.skyTop });
      card.rect(x + 10, y + 60, cardW - 20, 40);
      card.fill({ color: arena.groundColor });
      // Accent
      card.circle(x + cardW / 2, y + 50, 8);
      card.fill({ color: arena.accentColor, alpha: 0.5 });

      this.container.addChild(card);

      const name = new Text({
        text: arena.name,
        style: { fontFamily: "monospace", fontSize: 14, fill: isSelected ? COL_SELECTED : COL_TEXT, fontWeight: isSelected ? "bold" : "normal" },
      });
      name.anchor.set(0.5, 0);
      name.position.set(x + cardW / 2, y + 110);
      this.container.addChild(name);
    }

    // Show selected characters
    const p1Def = DUEL_CHARACTERS[DUEL_CHARACTER_IDS[this._p1Index]];
    const p2Def = DUEL_CHARACTERS[DUEL_CHARACTER_IDS[this._p2Index]];

    const vs = new Text({
      text: `${p1Def.name}  vs  ${p2Def.name}`,
      style: { fontFamily: "monospace", fontSize: 24, fill: COL_TEXT, fontWeight: "bold" },
    });
    vs.anchor.set(0.5, 0);
    vs.position.set(sw / 2, 320);
    this.container.addChild(vs);

    const inst = new Text({
      text: "\u2190 \u2192 Select   ENTER Fight!   ESC Back",
      style: { fontFamily: "monospace", fontSize: 14, fill: 0x888899 },
    });
    inst.anchor.set(0.5, 0);
    inst.position.set(sw / 2, sh - 40);
    this.container.addChild(inst);
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
