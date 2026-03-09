// ---------------------------------------------------------------------------
// Duel mode – character select screen
// ---------------------------------------------------------------------------

import { Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import {
  DUEL_CHARACTERS,
  DUEL_CHARACTER_IDS,
} from "../../duel/config/DuelCharacterDefs";
import { DUEL_ARENA_IDS, DUEL_ARENAS } from "../../duel/config/DuelArenaDefs";
import type { DuelCharacterDef } from "../../duel/state/DuelState";
import { duelAudio } from "../../duel/systems/DuelAudioSystem";

// Leader portrait imports
import arthurImgUrl from "@/img/arthur.png";
import merlinImgUrl from "@/img/merlin.png";
import queenImgUrl from "@/img/queen.png";
import lancelotImgUrl from "@/img/lancelot.png";
import morganImgUrl from "@/img/morgan.png";
import gawainImgUrl from "@/img/gawain.png";
import galahadImgUrl from "@/img/galahad.png";
import percivalImgUrl from "@/img/percival.png";
import tristanImgUrl from "@/img/tristan.png";
import nimueImgUrl from "@/img/nimue.png";
import kayImgUrl from "@/img/kay.png";
import bedivereImgUrl from "@/img/bedivere.png";
import elaineImgUrl from "@/img/elaine.png";
import mordredImgUrl from "@/img/mordred.png";
import igraineImgUrl from "@/img/igraine.png";
import pellinoreImgUrl from "@/img/pellinore.png";
import ectorImgUrl from "@/img/ector.png";
import borsImgUrl from "@/img/bors.png";
import utherImgUrl from "@/img/uther.png";
import lotImgUrl from "@/img/lot.png";

const LEADER_IMAGES: Record<string, string> = {
  arthur: arthurImgUrl,
  merlin: merlinImgUrl,
  guinevere: queenImgUrl,
  lancelot: lancelotImgUrl,
  morgan: morganImgUrl,
  gawain: gawainImgUrl,
  galahad: galahadImgUrl,
  percival: percivalImgUrl,
  tristan: tristanImgUrl,
  nimue: nimueImgUrl,
  kay: kayImgUrl,
  bedivere: bedivereImgUrl,
  elaine: elaineImgUrl,
  mordred: mordredImgUrl,
  igraine: igraineImgUrl,
  pellinore: pellinoreImgUrl,
  ector: ectorImgUrl,
  bors: borsImgUrl,
  uther: utherImgUrl,
  lot: lotImgUrl,
};

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

  // Cached portrait textures
  private _portraitTextures: Record<string, Texture> = {};
  private _portraitsLoaded = false;

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

    // Preload leader portraits
    if (!this._portraitsLoaded) {
      const urls = Object.values(LEADER_IMAGES);
      void Assets.load(urls).then(() => {
        for (const [id, url] of Object.entries(LEADER_IMAGES)) {
          const tex = Assets.get<Texture>(url);
          if (tex) this._portraitTextures[id] = tex;
        }
        this._portraitsLoaded = true;
        this._draw(); // Redraw with portraits
      });
    }

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
    title.position.set(sw / 2, 10);
    this.container.addChild(title);

    // Grid layout: 5 columns x 4 rows for 20 characters
    const cols = 5;
    const cardW = 140;
    const cardH = 165;
    const gapX = 12;
    const gapY = 10;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (sw - totalW) / 2;
    const startY = 55;

    for (let i = 0; i < DUEL_CHARACTER_IDS.length; i++) {
      const charId = DUEL_CHARACTER_IDS[i];
      const charDef = DUEL_CHARACTERS[charId];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const isSelected = i === this._p1Index;

      this._drawCharCard(x, y, cardW, cardH, charId, charDef, isSelected);
    }

    // Instructions
    const inst = new Text({
      text: "\u2190 \u2192 Select   ENTER Confirm   ESC Back",
      style: { fontFamily: "monospace", fontSize: 14, fill: 0x888899 },
    });
    inst.anchor.set(0.5, 0);
    inst.position.set(sw / 2, sh - 35);
    this.container.addChild(inst);

    // Controls info
    const controls = new Text({
      text: "Controls: \u2190\u2191\u2192\u2193 Move/Jump/Crouch  |  Q W E High Attacks  |  A S D Low Attacks  |  Two buttons = Special",
      style: { fontFamily: "monospace", fontSize: 11, fill: 0x667788 },
    });
    controls.anchor.set(0.5, 0);
    controls.position.set(sw / 2, sh - 18);
    this.container.addChild(controls);
  }

  private _drawCharCard(
    x: number,
    y: number,
    w: number,
    h: number,
    charId: string,
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

    // Portrait area dimensions
    const portraitX = x + 8;
    const portraitY = y + 8;
    const portraitW = w - 16;
    const portraitH = 60;

    // Portrait background (colored by fighter type)
    const portraitG = new Graphics();
    const portraitColor =
      charDef.fighterType === "sword" ? 0x3366cc :
      charDef.fighterType === "mage" ? 0x6633aa :
      charDef.fighterType === "spear" ? 0xaa8833 :
      charDef.fighterType === "axe" ? 0x886633 :
      0x33aa66;
    portraitG.roundRect(portraitX, portraitY, portraitW, portraitH, 4);
    portraitG.fill({ color: portraitColor, alpha: 0.4 });
    portraitG.stroke({ color: portraitColor, width: 1, alpha: 0.5 });
    this.container.addChild(portraitG);

    // Leader portrait image
    const tex = this._portraitTextures[charId];
    if (tex) {
      // Create a container to mask the sprite within the portrait area
      const portraitContainer = new Container();
      portraitContainer.position.set(portraitX, portraitY);

      const sprite = new Sprite(tex);
      const scale = Math.min(portraitW / tex.width, portraitH / tex.height);
      sprite.scale.set(scale);
      sprite.position.set(
        (portraitW - tex.width * scale) / 2,
        (portraitH - tex.height * scale) / 2,
      );

      // Clip mask
      const mask = new Graphics();
      mask.roundRect(0, 0, portraitW, portraitH, 4);
      mask.fill({ color: 0xffffff });
      portraitContainer.addChild(mask);
      portraitContainer.mask = mask;
      portraitContainer.addChild(sprite);

      // Dim slightly for non-selected
      if (!selected) {
        sprite.alpha = 0.7;
      }

      this.container.addChild(portraitContainer);
    }

    // Type icon (below portrait)
    const icon =
      charDef.fighterType === "sword" ? "\u2694" :
      charDef.fighterType === "mage" ? "\u2728" :
      charDef.fighterType === "spear" ? "\u{1F531}" :
      charDef.fighterType === "axe" ? "\u{1FA93}" :
      "\u{1F3F9}";
    const iconText = new Text({
      text: icon,
      style: { fontFamily: "monospace", fontSize: 14, fill: 0xffffff },
    });
    iconText.anchor.set(0.5, 0);
    iconText.position.set(x + w / 2, y + portraitH + 10);
    this.container.addChild(iconText);

    // Name
    const name = new Text({
      text: charDef.name,
      style: { fontFamily: "monospace", fontSize: 13, fill: COL_TEXT, fontWeight: "bold" },
    });
    name.anchor.set(0.5, 0);
    name.position.set(x + w / 2, y + 84);
    this.container.addChild(name);

    // Title
    const titleText = new Text({
      text: charDef.title,
      style: { fontFamily: "monospace", fontSize: 8, fill: COL_STAT },
    });
    titleText.anchor.set(0.5, 0);
    titleText.position.set(x + w / 2, y + 99);
    this.container.addChild(titleText);

    // Stat bars
    const stats = [
      { label: "HP", value: charDef.maxHp / 1100 },
      { label: "SPD", value: charDef.walkSpeed / 6.0 },
      { label: "DMG", value: charDef.fighterType === "axe" ? 0.95 : charDef.fighterType === "sword" ? 0.85 : charDef.fighterType === "spear" ? 0.75 : charDef.fighterType === "mage" ? 0.6 : 0.5 },
      { label: "RNG", value: charDef.fighterType === "archer" ? 0.95 : charDef.fighterType === "mage" ? 0.85 : charDef.fighterType === "spear" ? 0.9 : charDef.fighterType === "axe" ? 0.45 : 0.55 },
    ];

    const barY = y + 112;
    for (let s = 0; s < stats.length; s++) {
      const sy = barY + s * 13;

      const label = new Text({
        text: stats[s].label,
        style: { fontFamily: "monospace", fontSize: 8, fill: 0x888899 },
      });
      label.position.set(x + 8, sy);
      this.container.addChild(label);

      const barBg = new Graphics();
      barBg.rect(x + 34, sy + 1, w - 48, 8);
      barBg.fill({ color: 0x222233 });
      barBg.rect(x + 34, sy + 1, (w - 48) * stats[s].value, 8);
      barBg.fill({ color: selected ? COL_SELECTED : COL_STAT });
      this.container.addChild(barBg);
    }
  }

  private _drawArenaSelect(sw: number, sh: number): void {
    const title = new Text({
      text: "CHOOSE YOUR ARENA",
      style: { fontFamily: "monospace", fontSize: 28, fill: COL_TITLE, fontWeight: "bold" },
    });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 10);
    this.container.addChild(title);

    // Grid layout: 5 columns x 3 rows for 15 arenas
    const cols = 5;
    const cardW = 148;
    const cardH = 115;
    const gapX = 12;
    const gapY = 10;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (sw - totalW) / 2;
    const startY = 45;

    for (let i = 0; i < DUEL_ARENA_IDS.length; i++) {
      const arenaId = DUEL_ARENA_IDS[i];
      const arena = DUEL_ARENAS[arenaId];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const isSelected = i === this._arenaIndex;

      const card = new Graphics();
      card.roundRect(x, y, cardW, cardH, 6);
      card.fill({ color: COL_PANEL });
      card.stroke({ color: isSelected ? COL_SELECTED : COL_BORDER, width: isSelected ? 3 : 1 });

      // Arena preview (mini landscape)
      card.rect(x + 6, y + 6, cardW - 12, 65);
      card.fill({ color: arena.skyTop });
      card.rect(x + 6, y + 40, cardW - 12, 31);
      card.fill({ color: arena.groundColor });
      // Accent
      card.circle(x + cardW / 2, y + 35, 5);
      card.fill({ color: arena.accentColor, alpha: 0.5 });

      this.container.addChild(card);

      const name = new Text({
        text: arena.name,
        style: { fontFamily: "monospace", fontSize: 10, fill: isSelected ? COL_SELECTED : COL_TEXT, fontWeight: isSelected ? "bold" : "normal" },
      });
      name.anchor.set(0.5, 0);
      name.position.set(x + cardW / 2, y + 78);
      this.container.addChild(name);
    }

    // Show selected characters
    const p1Def = DUEL_CHARACTERS[DUEL_CHARACTER_IDS[this._p1Index]];
    const p2Def = DUEL_CHARACTERS[DUEL_CHARACTER_IDS[this._p2Index]];

    const vs = new Text({
      text: `${p1Def.name}  vs  ${p2Def.name}`,
      style: { fontFamily: "monospace", fontSize: 22, fill: COL_TEXT, fontWeight: "bold" },
    });
    vs.anchor.set(0.5, 0);
    vs.position.set(sw / 2, sh - 65);
    this.container.addChild(vs);

    const inst = new Text({
      text: "\u2190 \u2192 Select   ENTER Fight!   ESC Back",
      style: { fontFamily: "monospace", fontSize: 14, fill: 0x888899 },
    });
    inst.anchor.set(0.5, 0);
    inst.position.set(sw / 2, sh - 35);
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
