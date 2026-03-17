// ---------------------------------------------------------------------------
// Duel mode – character select screen (enhanced visuals)
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
const COL_GOLD = 0xd4af37;
const COL_GOLD_BRIGHT = 0xffd700;
const COL_GOLD_DIM = 0x8b7536;

/** Fighter type label mapping */
const FIGHTER_TYPE_LABELS: Record<string, string> = {
  sword: "SWORD",
  mage: "MAGE",
  archer: "ARCHER",
  spear: "SPEAR",
  axe: "AXE",
};

/** Fighter type badge colors */
const FIGHTER_TYPE_BADGE_COLORS: Record<string, number> = {
  sword: 0x3366cc,
  mage: 0x8833cc,
  archer: 0x33aa66,
  spear: 0xaa8833,
  axe: 0xaa4422,
};

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

    // Subtle golden vignette at top and bottom edges
    bg.rect(0, 0, sw, 60);
    bg.fill({ color: COL_GOLD_DIM, alpha: 0.04 });
    bg.rect(0, sh - 60, sw, 60);
    bg.fill({ color: COL_GOLD_DIM, alpha: 0.04 });

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

    // Floating golden embers / particles
    const embers = new Graphics();
    for (let i = 0; i < 35; i++) {
      const seed = i * 137.508; // golden angle spread
      const ex = ((seed + time * (15 + (i % 5) * 6)) % sw);
      const ey = ((seed * 0.7 + time * (8 + (i % 3) * 4)) % sh);
      const pulse = 0.4 + 0.6 * Math.sin(time * 2.5 + i * 0.8);
      const radius = 1.2 + (i % 3) * 0.6;
      embers.circle(ex, ey, radius);
      embers.fill({ color: COL_GOLD_BRIGHT, alpha: 0.12 * pulse });
      // Soft glow halo around each ember
      embers.circle(ex, ey, radius * 3);
      embers.fill({ color: COL_GOLD, alpha: 0.03 * pulse });
    }
    this.container.addChild(embers);
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

  /** Draws a decorative title with golden glow, drop shadow, and ornamental flanking lines */
  private _drawDecorativeTitle(
    text: string,
    cx: number,
    y: number,
    fontSize: number,
  ): void {
    const time = performance.now() / 1000;
    const glowPulse = 0.6 + 0.4 * Math.sin(time * 1.8);

    // Drop shadow
    const shadow = new Text({
      text,
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize,
        fill: 0x000000,
        fontWeight: "bold",
        letterSpacing: 3,
      },
    });
    shadow.anchor.set(0.5, 0);
    shadow.position.set(cx + 2, y + 2);
    shadow.alpha = 0.6;
    this.container.addChild(shadow);

    // Golden glow layer (slightly larger, behind)
    const glow = new Text({
      text,
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: fontSize + 2,
        fill: COL_GOLD,
        fontWeight: "bold",
        letterSpacing: 3,
      },
    });
    glow.anchor.set(0.5, 0);
    glow.position.set(cx, y - 1);
    glow.alpha = 0.35 * glowPulse;
    this.container.addChild(glow);

    // Main title text
    const title = new Text({
      text,
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize,
        fill: COL_TITLE,
        fontWeight: "bold",
        letterSpacing: 3,
      },
    });
    title.anchor.set(0.5, 0);
    title.position.set(cx, y);
    this.container.addChild(title);

    // Ornamental flanking lines with diamond accents
    const lineW = 90;
    const lineY = y + fontSize / 2 + 2;
    const halfTextW = (text.length * fontSize * 0.38) / 2;
    const ornament = new Graphics();

    // Left line
    const lx = cx - halfTextW - 18;
    ornament.moveTo(lx, lineY);
    ornament.lineTo(lx - lineW, lineY);
    ornament.stroke({ color: COL_GOLD, width: 1.5, alpha: 0.6 });
    // Left diamond
    const ldx = lx - lineW / 2;
    ornament.moveTo(ldx, lineY - 4);
    ornament.lineTo(ldx + 4, lineY);
    ornament.lineTo(ldx, lineY + 4);
    ornament.lineTo(ldx - 4, lineY);
    ornament.lineTo(ldx, lineY - 4);
    ornament.stroke({ color: COL_GOLD_BRIGHT, width: 1, alpha: 0.8 });
    ornament.fill({ color: COL_GOLD, alpha: 0.3 });

    // Right line
    const rx = cx + halfTextW + 18;
    ornament.moveTo(rx, lineY);
    ornament.lineTo(rx + lineW, lineY);
    ornament.stroke({ color: COL_GOLD, width: 1.5, alpha: 0.6 });
    // Right diamond
    const rdx = rx + lineW / 2;
    ornament.moveTo(rdx, lineY - 4);
    ornament.lineTo(rdx + 4, lineY);
    ornament.lineTo(rdx, lineY + 4);
    ornament.lineTo(rdx - 4, lineY);
    ornament.lineTo(rdx, lineY - 4);
    ornament.stroke({ color: COL_GOLD_BRIGHT, width: 1, alpha: 0.8 });
    ornament.fill({ color: COL_GOLD, alpha: 0.3 });

    this.container.addChild(ornament);
  }

  /** Draws instruction footer with panel background */
  private _drawInstructionFooter(
    sw: number,
    sh: number,
    line1: string,
    line2?: string,
  ): void {
    const panelH = line2 ? 48 : 30;
    const panelY = sh - panelH - 4;

    // Panel background
    const panel = new Graphics();
    panel.roundRect(sw * 0.15, panelY, sw * 0.7, panelH, 6);
    panel.fill({ color: 0x0d0d1a, alpha: 0.7 });
    panel.stroke({ color: COL_GOLD_DIM, width: 1, alpha: 0.25 });
    this.container.addChild(panel);

    const inst = new Text({
      text: line1,
      style: { fontFamily: "monospace", fontSize: 14, fill: 0xbbbbcc },
    });
    inst.anchor.set(0.5, 0);
    inst.position.set(sw / 2, panelY + 6);
    this.container.addChild(inst);

    if (line2) {
      const controls = new Text({
        text: line2,
        style: { fontFamily: "monospace", fontSize: 11, fill: 0x8899aa },
      });
      controls.anchor.set(0.5, 0);
      controls.position.set(sw / 2, panelY + 26);
      this.container.addChild(controls);
    }
  }

  private _drawCharacterSelect(sw: number, sh: number): void {
    // Decorative title
    this._drawDecorativeTitle("CHOOSE YOUR CHAMPION", sw / 2, 8, 36);

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

    // Instructions footer with panel
    this._drawInstructionFooter(
      sw,
      sh,
      "\u2190 \u2192 Select   ENTER Confirm   ESC Back",
      "Controls: \u2190\u2191\u2192\u2193 Move/Jump/Crouch  |  Q W E High Attacks  |  A S D Low Attacks  |  Two buttons = Special",
    );
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
    const time = performance.now() / 1000;
    const card = new Graphics();

    // Pulsing outer glow aura for selected card
    if (selected) {
      const glowPulse = 0.4 + 0.6 * Math.sin(time * 3.0);
      card.roundRect(x - 4, y - 4, w + 8, h + 8, 11);
      card.fill({ color: COL_GOLD_BRIGHT, alpha: 0.06 * glowPulse });
      card.stroke({ color: COL_GOLD_BRIGHT, width: 2, alpha: 0.35 * glowPulse });
    }

    // Card background with subtle gradient overlay
    card.roundRect(x, y, w, h, 8);
    card.fill({ color: COL_PANEL });

    // Gradient overlay: lighter at top, darker at bottom
    card.roundRect(x, y, w, h * 0.4, 8);
    card.fill({ color: 0xffffff, alpha: 0.03 });
    card.roundRect(x, y + h * 0.65, w, h * 0.35, 8);
    card.fill({ color: 0x000000, alpha: 0.08 });

    // Outer border
    card.roundRect(x, y, w, h, 8);
    card.stroke({ color: selected ? COL_GOLD : COL_BORDER, width: selected ? 2 : 1 });

    // Inner highlight border for selected card (double-border effect)
    if (selected) {
      card.roundRect(x + 3, y + 3, w - 6, h - 6, 6);
      card.stroke({ color: COL_SELECTED, width: 1, alpha: 0.5 });
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

    // Decorative inner frame border for portrait
    portraitG.roundRect(portraitX + 2, portraitY + 2, portraitW - 4, portraitH - 4, 3);
    portraitG.stroke({ color: portraitColor, width: 1, alpha: 0.6 });

    // Outer portrait border
    portraitG.roundRect(portraitX, portraitY, portraitW, portraitH, 4);
    portraitG.stroke({ color: selected ? COL_GOLD : portraitColor, width: selected ? 1.5 : 1, alpha: selected ? 0.8 : 0.5 });

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

    // Fighter-type badge/ribbon at top-right corner
    const badgeColor = FIGHTER_TYPE_BADGE_COLORS[charDef.fighterType] ?? 0x555555;
    const badgeLabel = FIGHTER_TYPE_LABELS[charDef.fighterType] ?? "???";
    const badge = new Graphics();
    const badgeW = 34;
    const badgeH = 13;
    const bx = x + w - badgeW - 4;
    const by = y + 4;
    badge.roundRect(bx, by, badgeW, badgeH, 3);
    badge.fill({ color: badgeColor, alpha: 0.85 });
    badge.stroke({ color: 0xffffff, width: 0.5, alpha: 0.3 });
    this.container.addChild(badge);

    const badgeText = new Text({
      text: badgeLabel,
      style: { fontFamily: "monospace", fontSize: 7, fill: 0xffffff, fontWeight: "bold" },
    });
    badgeText.anchor.set(0.5, 0.5);
    badgeText.position.set(bx + badgeW / 2, by + badgeH / 2);
    this.container.addChild(badgeText);

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
      style: {
        fontFamily: "monospace",
        fontSize: 13,
        fill: selected ? COL_GOLD_BRIGHT : COL_TEXT,
        fontWeight: "bold",
      },
    });
    name.anchor.set(0.5, 0);
    name.position.set(x + w / 2, y + 84);
    this.container.addChild(name);

    // Accent underline under the character name
    const underline = new Graphics();
    const nameW = Math.min(name.width, w - 20);
    underline.moveTo(x + (w - nameW) / 2, y + 98);
    underline.lineTo(x + (w + nameW) / 2, y + 98);
    underline.stroke({ color: selected ? COL_GOLD : COL_ACCENT, width: 1, alpha: selected ? 0.7 : 0.25 });
    this.container.addChild(underline);

    // Title with decorative dashes
    const titleText = new Text({
      text: `\u2014 ${charDef.title} \u2014`,
      style: { fontFamily: "monospace", fontSize: 8, fill: selected ? COL_GOLD_DIM : COL_STAT },
    });
    titleText.anchor.set(0.5, 0);
    titleText.position.set(x + w / 2, y + 100);
    this.container.addChild(titleText);

    // Stat bars
    const stats = [
      { label: "HP", value: charDef.maxHp / 1100 },
      { label: "SPD", value: charDef.walkSpeed / 6.0 },
      { label: "DMG", value: charDef.fighterType === "axe" ? 0.95 : charDef.fighterType === "sword" ? 0.85 : charDef.fighterType === "spear" ? 0.75 : charDef.fighterType === "mage" ? 0.6 : 0.5 },
      { label: "RNG", value: charDef.fighterType === "archer" ? 0.95 : charDef.fighterType === "mage" ? 0.85 : charDef.fighterType === "spear" ? 0.9 : charDef.fighterType === "axe" ? 0.45 : 0.55 },
    ];

    const barY = y + 112;
    const barX = x + 34;
    const barW = w - 48;
    const barH = 8;

    for (let s = 0; s < stats.length; s++) {
      const sy = barY + s * 13;

      const label = new Text({
        text: stats[s].label,
        style: { fontFamily: "monospace", fontSize: 8, fill: 0x888899 },
      });
      label.position.set(x + 8, sy);
      this.container.addChild(label);

      const filledW = barW * stats[s].value;
      const barColor = selected ? COL_GOLD_BRIGHT : COL_STAT;
      const barColorDark = selected ? COL_GOLD_DIM : 0x557788;

      const barGfx = new Graphics();

      // Bar background
      barGfx.rect(barX, sy + 1, barW, barH);
      barGfx.fill({ color: 0x222233 });

      // Filled bar - bottom half (darker shade for bevel)
      barGfx.rect(barX, sy + 1 + barH / 2, filledW, barH / 2);
      barGfx.fill({ color: barColorDark });

      // Filled bar - top half (brighter highlight for bevel)
      barGfx.rect(barX, sy + 1, filledW, barH / 2);
      barGfx.fill({ color: barColor });

      // Top edge highlight
      if (filledW > 0) {
        barGfx.moveTo(barX, sy + 1);
        barGfx.lineTo(barX + filledW, sy + 1);
        barGfx.stroke({ color: 0xffffff, width: 0.5, alpha: selected ? 0.4 : 0.15 });
      }

      // Tick marks every 20%
      for (let t = 1; t < 5; t++) {
        const tx = barX + barW * (t / 5);
        barGfx.moveTo(tx, sy + 1);
        barGfx.lineTo(tx, sy + 1 + barH);
        barGfx.stroke({ color: 0x000000, width: 0.5, alpha: 0.3 });
      }

      // Gold glow around bar for selected
      if (selected && filledW > 0) {
        barGfx.rect(barX - 1, sy, filledW + 2, barH + 2);
        barGfx.stroke({ color: COL_GOLD_BRIGHT, width: 0.5, alpha: 0.25 });
      }

      this.container.addChild(barGfx);
    }
  }

  private _drawArenaSelect(sw: number, sh: number): void {
    const time = performance.now() / 1000;

    // Decorative title
    this._drawDecorativeTitle("CHOOSE YOUR ARENA", sw / 2, 8, 28);

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

      // Pulsing glow border for selected arena
      if (isSelected) {
        const glowPulse = 0.5 + 0.5 * Math.sin(time * 3.0);
        card.roundRect(x - 3, y - 3, cardW + 6, cardH + 6, 9);
        card.fill({ color: COL_GOLD_BRIGHT, alpha: 0.05 * glowPulse });
        card.stroke({ color: COL_GOLD_BRIGHT, width: 2, alpha: 0.4 * glowPulse });
      }

      card.roundRect(x, y, cardW, cardH, 6);
      card.fill({ color: COL_PANEL });
      card.stroke({
        color: isSelected ? COL_GOLD : COL_BORDER,
        width: isSelected ? 2 : 1,
      });

      // Arena preview (mini landscape) with decorative frame
      const previewX = x + 6;
      const previewY = y + 6;
      const previewW = cardW - 12;
      const previewH = 55;

      // Decorative frame around preview
      card.roundRect(previewX - 1, previewY - 1, previewW + 2, previewH + 2, 3);
      card.stroke({ color: isSelected ? COL_GOLD_DIM : 0x333344, width: 1, alpha: 0.5 });

      card.rect(previewX, previewY, previewW, previewH);
      card.fill({ color: arena.skyTop });
      card.rect(previewX, previewY + previewH * 0.55, previewW, previewH * 0.45);
      card.fill({ color: arena.groundColor });

      // Accent (larger, more visible)
      card.circle(x + cardW / 2, y + 32, 6);
      card.fill({ color: arena.accentColor, alpha: 0.5 });
      // Small accent glow
      card.circle(x + cardW / 2, y + 32, 12);
      card.fill({ color: arena.accentColor, alpha: 0.1 });

      this.container.addChild(card);

      // Arena name
      const name = new Text({
        text: arena.name,
        style: {
          fontFamily: "monospace",
          fontSize: 10,
          fill: isSelected ? COL_GOLD_BRIGHT : COL_TEXT,
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      name.anchor.set(0.5, 0);
      name.position.set(x + cardW / 2, y + 66);
      this.container.addChild(name);

      // Arena atmosphere/description line
      const atmosphereText = this._getArenaAtmosphere(arenaId);
      if (atmosphereText) {
        const atmo = new Text({
          text: atmosphereText,
          style: {
            fontFamily: "monospace",
            fontSize: 7,
            fill: isSelected ? COL_GOLD_DIM : 0x666677,
          },
        });
        atmo.anchor.set(0.5, 0);
        atmo.position.set(x + cardW / 2, y + 80);
        this.container.addChild(atmo);
      }
    }

    // Show selected characters - dramatic VS display
    const p1Def = DUEL_CHARACTERS[DUEL_CHARACTER_IDS[this._p1Index]];
    const p2Def = DUEL_CHARACTERS[DUEL_CHARACTER_IDS[this._p2Index]];

    // VS decorative flanking elements
    const vsY = sh - 68;
    const vsGfx = new Graphics();

    // Left decorative line
    vsGfx.moveTo(sw / 2 - 200, vsY + 14);
    vsGfx.lineTo(sw / 2 - 40, vsY + 14);
    vsGfx.stroke({ color: COL_GOLD, width: 1, alpha: 0.4 });

    // Right decorative line
    vsGfx.moveTo(sw / 2 + 40, vsY + 14);
    vsGfx.lineTo(sw / 2 + 200, vsY + 14);
    vsGfx.stroke({ color: COL_GOLD, width: 1, alpha: 0.4 });

    this.container.addChild(vsGfx);

    // Player 1 name
    const p1Name = new Text({
      text: p1Def.name,
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 26,
        fill: COL_GOLD_BRIGHT,
        fontWeight: "bold",
        letterSpacing: 1,
      },
    });
    p1Name.anchor.set(1, 0);
    p1Name.position.set(sw / 2 - 35, vsY);
    this.container.addChild(p1Name);

    // "VS" accent text
    const vsPulse = 0.7 + 0.3 * Math.sin(time * 2.0);
    const vsText = new Text({
      text: "VS",
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 22,
        fill: COL_ACCENT,
        fontWeight: "bold",
      },
    });
    vsText.anchor.set(0.5, 0);
    vsText.position.set(sw / 2, vsY + 2);
    vsText.alpha = vsPulse;
    this.container.addChild(vsText);

    // Player 2 name
    const p2Name = new Text({
      text: p2Def.name,
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 26,
        fill: COL_TEXT,
        fontWeight: "bold",
        letterSpacing: 1,
      },
    });
    p2Name.anchor.set(0, 0);
    p2Name.position.set(sw / 2 + 35, vsY);
    this.container.addChild(p2Name);

    // Instructions footer with panel
    this._drawInstructionFooter(sw, sh, "\u2190 \u2192 Select   ENTER Fight!   ESC Back");
  }

  /** Returns a short atmosphere description for each arena */
  private _getArenaAtmosphere(arenaId: string): string {
    const atmospheres: Record<string, string> = {
      camelot: "Sunlit stone, banners flying",
      enchanted_forest: "Mystic fog, ancient trees",
      midnight_clearing: "Moonlit glade, fireflies",
      dark_swamp: "Murky waters, twisted roots",
      castle_ruins: "Crumbling walls, golden dust",
      dragon_lair: "Molten glow, scorched earth",
      shadow_realm: "Void energy, dark whispers",
      sacred_temple: "Holy light, marble halls",
      viking_shore: "Crashing waves, salt air",
      crystal_cave: "Shimmering prisms, echoes",
      volcanic_forge: "Lava rivers, blazing heat",
      royal_arena: "Grand columns, roaring crowd",
      frozen_lake: "Cracking ice, bitter wind",
      haunted_graveyard: "Spectral mist, old bones",
      celestial_bridge: "Starlight path, heavens",
    };
    return atmospheres[arenaId] ?? "";
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
