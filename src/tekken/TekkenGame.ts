import { Container, Graphics, Text } from "pixi.js";
import type { Ticker } from "pixi.js";
import { TekkenPhase, TekkenFighterState } from "../types";
import { viewManager } from "../view/ViewManager";
import { TekkenStateMachine } from "./TekkenStateMachine";
import { TB } from "./config/TekkenBalanceConfig";
import { createTekkenState } from "./state/TekkenState";
import type { TekkenState, TekkenGameMode, TekkenMoveDef } from "./state/TekkenState";
import { TekkenSceneManager } from "./view/TekkenSceneManager";
import { TekkenFighterRenderer } from "./view/TekkenFighterRenderer";
import { TekkenArenaRenderer } from "./view/TekkenArenaRenderer";
import { TekkenFXManager } from "./view/TekkenFXManager";
import { TekkenHUD } from "./view/TekkenHUD";
import { TekkenInputSystem } from "./systems/TekkenInputSystem";
import { TekkenFightingSystem } from "./systems/TekkenFightingSystem";
import { TekkenComboSystem } from "./systems/TekkenComboSystem";
import { TekkenPhysicsSystem } from "./systems/TekkenPhysicsSystem";
import { TekkenAISystem } from "./systems/TekkenAISystem";
import { TekkenAudioManager } from "./audio/TekkenAudioManager";
import { TEKKEN_CHARACTERS } from "./config/TekkenCharacterDefs";

export class TekkenGame {
  private _state: TekkenState | null = null;
  private _sm!: TekkenStateMachine;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _simAccumulator = 0;

  // View
  private _sceneManager!: TekkenSceneManager;
  private _fighterRenderers: TekkenFighterRenderer[] = [];
  private _arenaRenderer!: TekkenArenaRenderer;
  private _fxManager!: TekkenFXManager;
  private _hud!: TekkenHUD;

  // Systems
  private _inputSystem!: TekkenInputSystem;
  private _fightingSystem!: TekkenFightingSystem;
  private _comboSystem!: TekkenComboSystem;
  private _physicsSystem!: TekkenPhysicsSystem;
  private _aiSystem!: TekkenAISystem;

  // Audio
  private _audio!: TekkenAudioManager;

  // Audio state tracking (for edge detection)
  private _lastHitFrame: number[] = [-999, -999];
  private _lastBlockFrame: number[] = [-999, -999];
  private _lastRageState: boolean[] = [false, false];
  private _walkFootstepTimer: number[] = [0, 0];
  private _lastMovePhase: string[] = ["none", "none"];
  private _lastAnnouncement: string | null = null;
  private _koSoundPlayed = false;

  // Keyboard handler for menu/char select
  private _menuKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _selectedChars: [string, string] = ["knight", "berserker"];
  private _charSelectContainer: Container | null = null;
  private _selectedDifficulty = 1; // 0=easy, 1=medium, 2=hard
  private _selectedGameMode: TekkenGameMode = "vs_cpu";

  // Rage Art cinematic state
  private _rageArtCinematic: {
    active: boolean;
    attackerIdx: number;
    phase: "zoom_in" | "impact" | "zoom_out";
    timer: number;
  } | null = null;

  // Training mode key handler
  private _trainingKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    this._sm = new TekkenStateMachine(TekkenPhase.MAIN_MENU);
    this._showCharSelect();
  }

  destroy(): void {
    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }
    if (this._menuKeyHandler) {
      window.removeEventListener("keydown", this._menuKeyHandler);
      this._menuKeyHandler = null;
    }
    if (this._charSelectContainer) {
      viewManager.removeFromLayer("ui", this._charSelectContainer);
      this._charSelectContainer.destroy({ children: true });
      this._charSelectContainer = null;
    }
    if (this._trainingKeyHandler) {
      window.removeEventListener("keydown", this._trainingKeyHandler);
      this._trainingKeyHandler = null;
    }
    if (this._inputSystem) this._inputSystem.destroy();
    if (this._sceneManager) this._sceneManager.destroy();
    if (this._hud) this._hud.destroy();
    if (this._audio) this._audio.destroy();
    this._fighterRenderers = [];
    this._rageArtCinematic = null;
    this._state = null;
  }

  // ---- Character Select (simplified: press left/right to pick, Enter to start) ----

  private _showCharSelect(): void {
    this._sm.transition(TekkenPhase.CHAR_SELECT);

    // Build a simple Pixi.js char select overlay
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    const charIds = TEKKEN_CHARACTERS.map(c => c.id);
    let p1Idx = 0;
    let p2Idx = 1;
    let confirmed = false;

    const container = new Container();
    viewManager.addToLayer("ui", container);
    this._charSelectContainer = container;

    // Animated particle state for background embers
    const particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * sw,
        y: Math.random() * sh,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.8 - 0.2,
        life: Math.random() * 200,
        maxLife: 200 + Math.random() * 150,
        size: Math.random() * 2.5 + 0.5,
        color: Math.random() > 0.5 ? 0xff8822 : 0xffaa44,
      });
    }
    let animFrame = 0;

    const archetypeLabels: Record<string, string> = {
      balanced: "Balanced",
      rushdown: "Rushdown",
      mixup: "Mixup Artist",
      defensive: "Defensive",
      evasive: "Evasive",
      power: "Power",
    };

    const drawSelect = () => {
      container.removeChildren();
      animFrame++;

      const g = new Graphics();

      // ── Dark gradient background ──
      const gradSteps = 20;
      for (let i = 0; i < gradSteps; i++) {
        const t = i / gradSteps;
        const r = Math.floor(0x08 + t * 0x06);
        const gv = Math.floor(0x06 + t * 0x04);
        const b = Math.floor(0x14 + t * 0x08);
        const color = (r << 16) | (gv << 8) | b;
        const yy = (sh / gradSteps) * i;
        g.rect(0, yy, sw, sh / gradSteps + 1).fill({ color, alpha: 0.97 });
      }

      // ── Animated floating embers/sparks ──
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        if (p.life > p.maxLife || p.y < -10) {
          p.x = Math.random() * sw;
          p.y = sh + 10;
          p.life = 0;
          p.maxLife = 200 + Math.random() * 150;
        }
        const alpha = Math.max(0, 1 - p.life / p.maxLife) * 0.6;
        g.circle(p.x, p.y, p.size).fill({ color: p.color, alpha });
      }

      // ── Medieval ornamental border ──
      const borderInset = 12;
      const borderW = 3;
      // Outer dark frame
      g.roundRect(borderInset, borderInset, sw - borderInset * 2, sh - borderInset * 2, 6)
        .stroke({ color: 0x3a2a10, width: borderW + 2 });
      // Inner gold frame
      g.roundRect(borderInset + 3, borderInset + 3, sw - (borderInset + 3) * 2, sh - (borderInset + 3) * 2, 4)
        .stroke({ color: 0x8a6a20, width: 1.5 });
      // Corner ornaments (small diamond shapes)
      const corners = [
        [borderInset + 3, borderInset + 3],
        [sw - borderInset - 3, borderInset + 3],
        [borderInset + 3, sh - borderInset - 3],
        [sw - borderInset - 3, sh - borderInset - 3],
      ];
      for (const [cx, cy] of corners) {
        g.moveTo(cx, cy - 8).lineTo(cx + 8, cy).lineTo(cx, cy + 8).lineTo(cx - 8, cy).closePath()
          .fill({ color: 0xdaa520, alpha: 0.7 });
      }

      // ── Title: "SELECT YOUR FIGHTER" with golden glow ──
      // Glow shadow layers
      for (let layer = 3; layer >= 0; layer--) {
        const glowAlpha = 0.12 + (3 - layer) * 0.06;
        const glowSize = 6 + layer * 4;
        const glowText = new Text({
          text: "SELECT YOUR FIGHTER",
          style: {
            fontFamily: "Georgia, serif",
            fontSize: 48,
            fill: 0xffd700,
            fontWeight: "bold",
            letterSpacing: 6,
            dropShadow: { color: 0xffa500, blur: glowSize, distance: 0, alpha: glowAlpha },
          },
        });
        glowText.anchor.set(0.5);
        glowText.x = sw / 2;
        glowText.y = 52;
        container.addChild(glowText);
      }
      const title = new Text({
        text: "SELECT YOUR FIGHTER",
        style: {
          fontFamily: "Georgia, serif",
          fontSize: 48,
          fill: 0xffd700,
          fontWeight: "bold",
          letterSpacing: 6,
          dropShadow: { color: 0x000000, blur: 4, distance: 2, alpha: 0.7 },
        },
      });
      title.anchor.set(0.5);
      title.x = sw / 2;
      title.y = 52;
      container.addChild(title);

      // ── Ornamental divider lines below title ──
      const divY = 86;
      const divHalfW = 180;
      g.moveTo(sw / 2 - divHalfW, divY).lineTo(sw / 2 + divHalfW, divY)
        .stroke({ color: 0xdaa520, width: 2, alpha: 0.8 });
      g.moveTo(sw / 2 - divHalfW + 30, divY + 5).lineTo(sw / 2 + divHalfW - 30, divY + 5)
        .stroke({ color: 0x8a6a20, width: 1, alpha: 0.5 });
      // Center diamond on divider
      g.moveTo(sw / 2, divY - 5).lineTo(sw / 2 + 5, divY).lineTo(sw / 2, divY + 5).lineTo(sw / 2 - 5, divY).closePath()
        .fill({ color: 0xffd700, alpha: 0.9 });

      // ── Character cards ──
      const boxW = 220, boxH = 280, gap = 24;
      const totalW = charIds.length * (boxW + gap) - gap;
      const startX = (sw - totalW) / 2;
      const cardsY = 110;

      for (let i = 0; i < charIds.length; i++) {
        const ch = TEKKEN_CHARACTERS[i];
        const bx = startX + i * (boxW + gap);
        const by = cardsY;

        const isP1 = i === p1Idx;
        const isP2 = i === p2Idx;
        const isSelected = isP1 || isP2;

        // Extract RGB from primary color for gradient
        const pr = (ch.colors.primary >> 16) & 0xff;
        const pg = (ch.colors.primary >> 8) & 0xff;
        const pb = ch.colors.primary & 0xff;

        // Card gradient background (dark at top, character color at bottom)
        const cardSteps = 10;
        for (let s = 0; s < cardSteps; s++) {
          const t = s / cardSteps;
          const cr = Math.floor(0x10 + t * pr * 0.4);
          const cg = Math.floor(0x10 + t * pg * 0.4);
          const cb = Math.floor(0x10 + t * pb * 0.4);
          const cardColor = (Math.min(cr, 255) << 16) | (Math.min(cg, 255) << 8) | Math.min(cb, 255);
          const sy = by + (boxH / cardSteps) * s;
          const radius = s === 0 ? 10 : s === cardSteps - 1 ? 10 : 0;
          if (s === 0) {
            g.roundRect(bx, sy, boxW, boxH / cardSteps + 1, radius).fill({ color: cardColor });
          } else if (s === cardSteps - 1) {
            g.roundRect(bx, sy, boxW, boxH / cardSteps + 1, radius).fill({ color: cardColor });
          } else {
            g.rect(bx, sy, boxW, boxH / cardSteps + 1).fill({ color: cardColor });
          }
        }

        // Inner frame / beveled edge
        g.roundRect(bx + 4, by + 4, boxW - 8, boxH - 8, 6)
          .stroke({ color: 0x555555, width: 1, alpha: 0.5 });
        g.roundRect(bx + 6, by + 6, boxW - 12, boxH - 12, 5)
          .stroke({ color: 0x333333, width: 1, alpha: 0.3 });

        // Glowing border for selected cards (animated pulse)
        if (isSelected) {
          const pulse = Math.sin(animFrame * 0.08) * 0.3 + 0.7;
          const glowColor = isP1 ? 0x4488ff : 0xff4444;
          g.roundRect(bx - 3, by - 3, boxW + 6, boxH + 6, 12)
            .stroke({ color: glowColor, width: 4, alpha: pulse * 0.5 });
          g.roundRect(bx - 1, by - 1, boxW + 2, boxH + 2, 11)
            .stroke({ color: glowColor, width: 2, alpha: pulse });
        }

        // Outer card border
        const borderCol = isP1 ? 0x6699ff : isP2 ? 0xff6666 : 0x4a4a5a;
        g.roundRect(bx, by, boxW, boxH, 10)
          .stroke({ color: borderCol, width: isSelected ? 3 : 1.5 });

        // ── Detailed character silhouette ──
        const cx = bx + boxW / 2;
        const cy = by + boxH / 2 - 20;
        const skinColor = ch.colors.skin;
        const primaryColor = ch.colors.primary;
        const secondaryColor = ch.colors.secondary;
        const accentColor = ch.colors.accent;

        // Shadow under figure
        g.ellipse(cx, cy + 75, 28, 6).fill({ color: 0x000000, alpha: 0.3 });

        // Legs (slightly angled for stance)
        g.roundRect(cx - 16, cy + 38, 13, 38, 3).fill({ color: secondaryColor });
        g.roundRect(cx + 3, cy + 38, 13, 38, 3).fill({ color: secondaryColor });
        // Boots
        g.roundRect(cx - 18, cy + 70, 16, 8, 2).fill({ color: 0x332211 });
        g.roundRect(cx + 2, cy + 70, 16, 8, 2).fill({ color: 0x332211 });

        // Torso (main body)
        g.roundRect(cx - 20, cy - 15, 40, 55, 5).fill({ color: primaryColor });
        // Belt / waist detail
        g.rect(cx - 20, cy + 30, 40, 6).fill({ color: accentColor, alpha: 0.8 });
        // Belt buckle
        g.rect(cx - 4, cy + 29, 8, 8).fill({ color: 0xdaa520 });

        // Shoulders (pauldrons)
        g.ellipse(cx - 22, cy - 8, 10, 8).fill({ color: primaryColor });
        g.ellipse(cx + 22, cy - 8, 10, 8).fill({ color: primaryColor });
        // Shoulder highlights
        g.ellipse(cx - 22, cy - 10, 6, 4).fill({ color: accentColor, alpha: 0.4 });
        g.ellipse(cx + 22, cy - 10, 6, 4).fill({ color: accentColor, alpha: 0.4 });

        // Arms
        g.roundRect(cx - 34, cy - 5, 12, 36, 4).fill({ color: skinColor });
        g.roundRect(cx + 22, cy - 5, 12, 36, 4).fill({ color: skinColor });
        // Gauntlets / gloves
        g.roundRect(cx - 36, cy + 24, 14, 10, 3).fill({ color: secondaryColor });
        g.roundRect(cx + 22, cy + 24, 14, 10, 3).fill({ color: secondaryColor });

        // Weapon hint on the right hand side
        if (ch.archetype === "balanced" || ch.archetype === "defensive") {
          // Sword
          g.rect(cx + 34, cy - 10, 3, 40).fill({ color: 0xaaaacc });
          g.rect(cx + 30, cy - 12, 11, 3).fill({ color: accentColor });
        } else if (ch.archetype === "power") {
          // Axe
          g.rect(cx + 35, cy - 10, 3, 38).fill({ color: 0x664422 });
          g.moveTo(cx + 34, cy - 10).lineTo(cx + 46, cy - 5).lineTo(cx + 34, cy + 4).closePath()
            .fill({ color: 0x888899 });
        } else if (ch.archetype === "evasive") {
          // Daggers
          g.rect(cx + 34, cy + 10, 2, 20).fill({ color: 0xaaaacc });
          g.rect(cx - 36, cy + 10, 2, 20).fill({ color: 0xaaaacc });
        } else if (ch.archetype === "rushdown") {
          // Spiked fist
          g.circle(cx + 28, cy + 26, 7).fill({ color: 0x555555 });
          g.circle(cx + 28, cy + 22, 2).fill({ color: 0xcccccc });
        } else if (ch.archetype === "mixup") {
          // Staff
          g.rect(cx + 35, cy - 20, 3, 55).fill({ color: 0x886633 });
        }

        // Neck
        g.rect(cx - 5, cy - 22, 10, 10).fill({ color: skinColor });

        // Head
        g.circle(cx, cy - 34, 18).fill({ color: skinColor });
        // Hair
        g.arc(cx, cy - 36, 18, Math.PI, 0, false);
        g.fill({ color: ch.colors.hair });
        // Eyes (simple dots)
        g.circle(cx - 6, cy - 36, 2).fill({ color: 0x222222 });
        g.circle(cx + 6, cy - 36, 2).fill({ color: 0x222222 });
        // Mouth line
        g.moveTo(cx - 4, cy - 28).lineTo(cx + 4, cy - 28)
          .stroke({ color: 0x994444, width: 1.5 });

        // ── Character name ──
        const nameText = new Text({
          text: ch.name,
          style: {
            fontFamily: "Georgia, serif",
            fontSize: 18,
            fill: 0xffffff,
            fontWeight: "bold",
            dropShadow: { color: 0x000000, blur: 3, distance: 1, alpha: 0.8 },
          },
        });
        nameText.anchor.set(0.5);
        nameText.x = cx;
        nameText.y = by + boxH - 45;
        container.addChild(nameText);

        // ── Archetype subtitle ──
        const arcLabel = archetypeLabels[ch.archetype] || ch.archetype;
        const arcText = new Text({
          text: arcLabel.toUpperCase(),
          style: {
            fontFamily: "Georgia, serif",
            fontSize: 11,
            fill: accentColor,
            letterSpacing: 3,
          },
        });
        arcText.anchor.set(0.5);
        arcText.x = cx;
        arcText.y = by + boxH - 24;
        container.addChild(arcText);

        // ── P1/P2 indicators: styled crown/shield shapes ──
        if (isP1) {
          const ig = new Graphics();
          const ix = cx, iy = by - 24;
          // Shield shape
          ig.moveTo(ix - 16, iy - 10).lineTo(ix + 16, iy - 10)
            .lineTo(ix + 16, iy + 4).lineTo(ix, iy + 14).lineTo(ix - 16, iy + 4).closePath()
            .fill({ color: 0x1a3a6a });
          ig.moveTo(ix - 16, iy - 10).lineTo(ix + 16, iy - 10)
            .lineTo(ix + 16, iy + 4).lineTo(ix, iy + 14).lineTo(ix - 16, iy + 4).closePath()
            .stroke({ color: 0x4488ff, width: 2 });
          container.addChild(ig);
          const p1Label = new Text({
            text: "P1",
            style: { fontFamily: "Georgia, serif", fontSize: 14, fill: 0x88bbff, fontWeight: "bold" },
          });
          p1Label.anchor.set(0.5);
          p1Label.x = ix;
          p1Label.y = iy - 1;
          container.addChild(p1Label);
        }
        if (isP2) {
          const ig = new Graphics();
          const ix = cx, iy = by - 24;
          // Crown shape
          ig.moveTo(ix - 14, iy + 6).lineTo(ix - 14, iy - 6)
            .lineTo(ix - 8, iy).lineTo(ix, iy - 10).lineTo(ix + 8, iy).lineTo(ix + 14, iy - 6)
            .lineTo(ix + 14, iy + 6).closePath()
            .fill({ color: 0x5a1a1a });
          ig.moveTo(ix - 14, iy + 6).lineTo(ix - 14, iy - 6)
            .lineTo(ix - 8, iy).lineTo(ix, iy - 10).lineTo(ix + 8, iy).lineTo(ix + 14, iy - 6)
            .lineTo(ix + 14, iy + 6).closePath()
            .stroke({ color: 0xff4444, width: 2 });
          // Crown jewels
          ig.circle(ix - 8, iy - 3, 2).fill({ color: 0xff6666 });
          ig.circle(ix, iy - 7, 2).fill({ color: 0xff6666 });
          ig.circle(ix + 8, iy - 3, 2).fill({ color: 0xff6666 });
          container.addChild(ig);
          const cpuLabel = new Text({
            text: "CPU",
            style: { fontFamily: "Georgia, serif", fontSize: 11, fill: 0xff8888, fontWeight: "bold" },
          });
          cpuLabel.anchor.set(0.5);
          cpuLabel.x = ix;
          cpuLabel.y = iy + 16;
          container.addChild(cpuLabel);
        }
      }

      // ── Character info panel (below cards) ──
      const infoPanelY = cardsY + boxH + 34;
      const p1Char = TEKKEN_CHARACTERS[p1Idx];
      const p2Char = TEKKEN_CHARACTERS[p2Idx];

      // P1 info (left side)
      const p1InfoText = new Text({
        text: `"${p1Char.title}"`,
        style: {
          fontFamily: "Georgia, serif",
          fontSize: 20,
          fill: 0x88bbff,
          fontStyle: "italic",
          dropShadow: { color: 0x000000, blur: 3, distance: 1, alpha: 0.7 },
        },
      });
      p1InfoText.anchor.set(0.5);
      p1InfoText.x = sw / 2 - 200;
      p1InfoText.y = infoPanelY;
      container.addChild(p1InfoText);

      // ── VS text (big, centered) ──
      const vsPulse = Math.sin(animFrame * 0.06) * 0.15 + 0.85;
      // VS glow
      const vsGlow = new Text({
        text: "VS",
        style: {
          fontFamily: "Georgia, serif",
          fontSize: 52,
          fill: 0xff6600,
          fontWeight: "bold",
          letterSpacing: 8,
          dropShadow: { color: 0xff4400, blur: 20, distance: 0, alpha: vsPulse * 0.6 },
        },
      });
      vsGlow.anchor.set(0.5);
      vsGlow.x = sw / 2;
      vsGlow.y = infoPanelY;
      vsGlow.alpha = vsPulse;
      container.addChild(vsGlow);
      const vsText = new Text({
        text: "VS",
        style: {
          fontFamily: "Georgia, serif",
          fontSize: 52,
          fill: 0xffd700,
          fontWeight: "bold",
          letterSpacing: 8,
          dropShadow: { color: 0x000000, blur: 4, distance: 2, alpha: 0.8 },
        },
      });
      vsText.anchor.set(0.5);
      vsText.x = sw / 2;
      vsText.y = infoPanelY;
      container.addChild(vsText);

      // P2 info (right side)
      const p2InfoText = new Text({
        text: `"${p2Char.title}"`,
        style: {
          fontFamily: "Georgia, serif",
          fontSize: 20,
          fill: 0xff8888,
          fontStyle: "italic",
          dropShadow: { color: 0x000000, blur: 3, distance: 1, alpha: 0.7 },
        },
      });
      p2InfoText.anchor.set(0.5);
      p2InfoText.x = sw / 2 + 200;
      p2InfoText.y = infoPanelY;
      container.addChild(p2InfoText);

      // ── Bottom bar: dark panel with medieval frame ──
      const barH = 50;
      const barY = sh - barH - 8;
      // Dark bar background
      g.roundRect(30, barY, sw - 60, barH, 6).fill({ color: 0x0c0c18, alpha: 0.9 });
      // Medieval frame on bar
      g.roundRect(30, barY, sw - 60, barH, 6).stroke({ color: 0x8a6a20, width: 1.5 });
      g.roundRect(33, barY + 3, sw - 66, barH - 6, 4).stroke({ color: 0x3a2a10, width: 1, alpha: 0.5 });
      // Small decorative diamonds on bar ends
      const barMidY = barY + barH / 2;
      g.moveTo(44, barMidY - 5).lineTo(49, barMidY).lineTo(44, barMidY + 5).lineTo(39, barMidY).closePath()
        .fill({ color: 0xdaa520, alpha: 0.6 });
      g.moveTo(sw - 44, barMidY - 5).lineTo(sw - 39, barMidY).lineTo(sw - 44, barMidY + 5).lineTo(sw - 49, barMidY).closePath()
        .fill({ color: 0xdaa520, alpha: 0.6 });

      // Controls hint text
      const hint = new Text({
        text: "\u2190\u2192 P1  \u2191\u2193 CPU  1/2/3 Difficulty  T Training  Enter Fight  Esc Exit",
        style: {
          fontFamily: "Georgia, serif",
          fontSize: 14,
          fill: 0x999999,
          letterSpacing: 1,
        },
      });
      hint.anchor.set(0.5);
      hint.x = sw / 2;
      hint.y = barY + barH / 2 - 1;

      // Difficulty label (above bottom bar)
      const diffLabels = ["EASY", "MEDIUM", "HARD"];
      const diffColors = [0x44cc44, 0xddaa00, 0xff4444];
      const diffText = new Text({
        text: `Difficulty: ${diffLabels[this._selectedDifficulty]}`,
        style: {
          fontFamily: "Georgia, serif",
          fontSize: 16,
          fill: diffColors[this._selectedDifficulty],
          fontWeight: "bold",
        },
      });
      diffText.anchor.set(0, 1);
      diffText.x = 50;
      diffText.y = barY - 8;
      container.addChild(diffText);

      // Game mode label
      const modeLabel = this._selectedGameMode === "training" ? "TRAINING" : "VS CPU";
      const modeColor = this._selectedGameMode === "training" ? 0x00ffcc : 0xaaaaaa;
      const modeText = new Text({
        text: `Mode: ${modeLabel}`,
        style: {
          fontFamily: "Georgia, serif",
          fontSize: 16,
          fill: modeColor,
          fontWeight: "bold",
        },
      });
      modeText.anchor.set(1, 1);
      modeText.x = sw - 50;
      modeText.y = barY - 8;
      container.addChild(modeText);

      // Add base graphics first, then text layers are already added
      container.addChildAt(g, 0);
      container.addChild(hint);
    };

    drawSelect();

    this._menuKeyHandler = (e: KeyboardEvent) => {
      if (confirmed) return;
      if (e.key === "ArrowLeft") {
        p1Idx = (p1Idx - 1 + charIds.length) % charIds.length;
        if (p1Idx === p2Idx) p1Idx = (p1Idx - 1 + charIds.length) % charIds.length;
        drawSelect();
      } else if (e.key === "ArrowRight") {
        p1Idx = (p1Idx + 1) % charIds.length;
        if (p1Idx === p2Idx) p1Idx = (p1Idx + 1) % charIds.length;
        drawSelect();
      } else if (e.key === "ArrowUp") {
        p2Idx = (p2Idx - 1 + charIds.length) % charIds.length;
        if (p2Idx === p1Idx) p2Idx = (p2Idx - 1 + charIds.length) % charIds.length;
        drawSelect();
      } else if (e.key === "ArrowDown") {
        p2Idx = (p2Idx + 1) % charIds.length;
        if (p2Idx === p1Idx) p2Idx = (p2Idx + 1) % charIds.length;
        drawSelect();
      } else if (e.key === "1") {
        this._selectedDifficulty = 0;
        drawSelect();
      } else if (e.key === "2") {
        this._selectedDifficulty = 1;
        drawSelect();
      } else if (e.key === "3") {
        this._selectedDifficulty = 2;
        drawSelect();
      } else if (e.key === "t" || e.key === "T") {
        this._selectedGameMode = this._selectedGameMode === "training" ? "vs_cpu" : "training";
        drawSelect();
      } else if (e.key === "Enter") {
        confirmed = true;
        this._selectedChars = [charIds[p1Idx], charIds[p2Idx]];
        window.removeEventListener("keydown", this._menuKeyHandler!);
        this._menuKeyHandler = null;
        viewManager.removeFromLayer("ui", container);
        container.destroy({ children: true });
        this._charSelectContainer = null;
        this._startMatch(this._selectedGameMode);
      } else if (e.key === "Escape") {
        window.removeEventListener("keydown", this._menuKeyHandler!);
        this._menuKeyHandler = null;
        viewManager.removeFromLayer("ui", container);
        container.destroy({ children: true });
        this._charSelectContainer = null;
        window.dispatchEvent(new Event("tekkenExit"));
      }
    };
    window.addEventListener("keydown", this._menuKeyHandler);
  }

  // ---- Match Start ----

  private _startMatch(gameMode: TekkenGameMode): void {
    // Randomly pick an arena
    const arenaIds = ["castle_courtyard", "underground_pit", "throne_room"];
    const arenaId = arenaIds[Math.floor(Math.random() * arenaIds.length)];

    this._state = createTekkenState(gameMode, arenaId, this._selectedChars[0], this._selectedChars[1]);
    this._state.difficulty = this._selectedDifficulty;

    // Init 3D scene
    this._sceneManager = new TekkenSceneManager();
    this._sceneManager.init();

    // Init arena
    this._arenaRenderer = new TekkenArenaRenderer(this._sceneManager);
    this._arenaRenderer.build(arenaId);

    // Init fighters
    this._fighterRenderers = [];
    for (let i = 0; i < 2; i++) {
      const f = this._state.fighters[i];
      const charDef = TEKKEN_CHARACTERS.find(c => c.id === f.characterId)!;
      const renderer = new TekkenFighterRenderer(this._sceneManager, charDef, i);
      this._fighterRenderers.push(renderer);
    }

    // Init FX
    this._fxManager = new TekkenFXManager(this._sceneManager);

    // Init HUD
    this._hud = new TekkenHUD();
    this._hud.init();

    // Init systems
    this._inputSystem = new TekkenInputSystem();
    this._inputSystem.init();
    this._fightingSystem = new TekkenFightingSystem();
    this._comboSystem = new TekkenComboSystem();
    this._physicsSystem = new TekkenPhysicsSystem();
    this._aiSystem = new TekkenAISystem();
    this._aiSystem.setDifficultyLevel(this._selectedDifficulty);

    // Training mode setup
    if (gameMode === "training") {
      this._state.trainingMode.aiEnabled = true;
      this._setupTrainingKeyHandler();
    }

    // Init audio
    this._audio = new TekkenAudioManager();
    this._audio.init();
    this._lastHitFrame = [-999, -999];
    this._lastBlockFrame = [-999, -999];
    this._lastRageState = [false, false];
    this._walkFootstepTimer = [0, 0];
    this._lastMovePhase = ["none", "none"];
    this._lastAnnouncement = null;
    this._koSoundPlayed = false;

    // Start intro then fight
    this._sm.transition(TekkenPhase.INTRO);
    this._state.announcement = "ROUND 1";
    this._state.announcementTimer = 90;

    // Start game loop
    this._tickerCb = (ticker: Ticker) => this._update(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  // ---- Main Update Loop ----

  private _update(dtSec: number): void {
    if (!this._state) return;

    // Handle intro countdown
    if (this._state.phase === TekkenPhase.INTRO) {
      this._state.announcementTimer--;
      if (this._state.announcementTimer <= 60 && this._state.announcement === `ROUND ${this._state.round.roundNumber}`) {
        this._state.announcement = "FIGHT!";
      }
      // Audio: detect announcement changes
      if (this._state.announcement !== this._lastAnnouncement) {
        if (this._state.announcement && this._state.announcement.startsWith("ROUND")) {
          this._audio.playRoundAnnounce();
        } else if (this._state.announcement === "FIGHT!") {
          this._audio.playFightAnnounce();
        }
        this._lastAnnouncement = this._state.announcement;
      }
      if (this._state.announcementTimer <= 0) {
        this._state.announcement = null;
        this._lastAnnouncement = null;
        this._sm.transition(TekkenPhase.FIGHTING);
        this._state.phase = TekkenPhase.FIGHTING;
      }
      this._render();
      return;
    }

    // Handle round end
    if (this._state.phase === TekkenPhase.ROUND_END) {
      this._state.announcementTimer--;
      if (this._state.announcementTimer <= 0) {
        this._nextRound();
      }
      this._render();
      return;
    }

    // Handle match end
    if (this._state.phase === TekkenPhase.MATCH_END) {
      this._state.announcementTimer--;
      if (this._state.announcementTimer <= 0) {
        this.destroy();
        this._showCharSelect();
      }
      this._render();
      return;
    }

    if (this._state.phase !== TekkenPhase.FIGHTING) {
      this._render();
      return;
    }

    // Slowdown handling
    const simScale = this._state.slowdownFrames > 0 ? this._state.slowdownScale : 1;
    this._simAccumulator += dtSec * simScale;
    const simDt = TB.SIM_DT;

    while (this._simAccumulator >= simDt) {
      this._simAccumulator -= simDt;
      this._simTick();
    }

    this._render();
  }

  // ---- Simulation Tick (60 FPS fixed) ----

  private _simTick(): void {
    const s = this._state!;
    s.frameCount++;

    if (s.slowdownFrames > 0) s.slowdownFrames--;

    // Decrement announcement timer
    if (s.announcementTimer > 0) {
      s.announcementTimer--;
      if (s.announcementTimer <= 0) s.announcement = null;
    }

    // Round timer
    if (s.round.timeRemaining > 0) {
      s.round.timeRemaining--;
    }

    // Read input for P1
    this._inputSystem.update(s.fighters[0]);

    // AI for P2
    this._aiSystem.update(s.fighters[1], s.fighters[0], s);

    // Physics & movement
    for (const f of s.fighters) {
      this._physicsSystem.update(f, s);
    }

    // Fighting (attacks, blocking, hit detection)
    const shakeBeforeHit = s.cameraState.shakeIntensity;
    this._fightingSystem.update(s, this._fxManager);

    // Trigger spectator reactions based on hit intensity
    const shakeDelta = s.cameraState.shakeIntensity - shakeBeforeHit;
    if (shakeDelta > 0) {
      const koHappened = s.fighters[0].hp <= 0 || s.fighters[1].hp <= 0;
      const intensity = koHappened ? "ko" as const
        : shakeDelta >= TB.CAMERA_SHAKE_HEAVY ? "heavy" as const
        : "light" as const;
      this._arenaRenderer.triggerSpectatorReaction(intensity);
    }

    // Combos
    this._comboSystem.update(s);

    // Check auto-face
    for (let i = 0; i < 2; i++) {
      const me = s.fighters[i];
      const opp = s.fighters[1 - i];
      if (me.state === TekkenFighterState.IDLE || me.state === TekkenFighterState.WALK_FORWARD || me.state === TekkenFighterState.WALK_BACK) {
        me.facingRight = me.position.x < opp.position.x;
      }
    }

    // Check Rage activation
    for (const f of s.fighters) {
      if (!f.rageActive && f.hp > 0 && f.hp <= f.maxHp * TB.RAGE_THRESHOLD) {
        f.rageActive = true;
      }
    }

    // Detect Rage Art activation and trigger cinematic
    for (let i = 0; i < 2; i++) {
      const f = s.fighters[i];
      if (f.state === TekkenFighterState.RAGE_ART || (f.state === TekkenFighterState.ATTACK && f.currentMove)) {
        const charDef = TEKKEN_CHARACTERS.find(c => c.id === f.characterId);
        if (charDef && f.currentMove === charDef.rageArt.id && !this._rageArtCinematic?.active) {
          this._rageArtCinematic = {
            active: true,
            attackerIdx: i,
            phase: "zoom_in",
            timer: 0,
          };
          s.slowdownFrames = TB.RAGE_ART_ZOOM_IN_FRAMES + TB.RAGE_ART_IMPACT_FRAMES;
          s.slowdownScale = TB.RAGE_ART_SLOWDOWN_SCALE;
        }
      }
    }

    // Update rage art cinematic timer
    if (this._rageArtCinematic?.active) {
      this._rageArtCinematic.timer++;
      const rc = this._rageArtCinematic;
      if (rc.phase === "zoom_in" && rc.timer >= TB.RAGE_ART_ZOOM_IN_FRAMES) {
        rc.phase = "impact";
        rc.timer = 0;
        s.cameraState.shakeIntensity = TB.CAMERA_SHAKE_HEAVY * 2;
      } else if (rc.phase === "impact" && rc.timer >= TB.RAGE_ART_IMPACT_FRAMES) {
        rc.phase = "zoom_out";
        rc.timer = 0;
      } else if (rc.phase === "zoom_out" && rc.timer >= TB.RAGE_ART_ZOOM_OUT_FRAMES) {
        this._rageArtCinematic = null;
      }
    }

    // Training mode: track frame data and infinite HP
    if (s.gameMode === "training") {
      const p1 = s.fighters[0];
      if (p1.state === TekkenFighterState.ATTACK && p1.currentMove) {
        const moveDef = this._getActiveMoveDefForFighter(p1);
        if (moveDef) {
          s.trainingMode.lastMoveName = moveDef.name;
          s.trainingMode.lastMoveStartup = moveDef.startup;
          s.trainingMode.lastMoveActive = moveDef.active;
          s.trainingMode.lastMoveRecovery = moveDef.recovery;
          s.trainingMode.frameAdvantage = moveDef.onHit;
        }
      }

      // Infinite HP: reset to full when combo drops
      for (const f of s.fighters) {
        if (f.comboCount === 0 && f.hp < f.maxHp && f.hitstunFrames <= 0 && !f.juggle.isAirborne) {
          f.hp = f.maxHp;
        }
      }

      // No round timer in training
      s.round.timeRemaining = TB.ROUND_TIME * TB.TPS;
    }

    // Check round end
    if (s.round.winnerId === null) {
      for (let i = 0; i < 2; i++) {
        if (s.fighters[i].hp <= 0) {
          s.round.winnerId = 1 - i;
          s.roundResults.push((1 - i) as 0 | 1);
          s.announcement = "K.O.!";
          s.announcementTimer = TB.ROUND_END_DELAY;
          s.slowdownFrames = TB.KO_SLOWDOWN_FRAMES;
          s.slowdownScale = TB.KO_SLOWDOWN_SCALE;
          s.fighters[i].state = TekkenFighterState.DEFEAT;
          s.fighters[1 - i].state = TekkenFighterState.VICTORY;
          this._sm.transition(TekkenPhase.ROUND_END);
          s.phase = TekkenPhase.ROUND_END;
          break;
        }
      }

      // Time out - lowest HP loses
      if (s.round.timeRemaining <= 0 && s.round.winnerId === null) {
        const w = s.fighters[0].hp >= s.fighters[1].hp ? 0 : 1;
        s.round.winnerId = w;
        s.roundResults.push(w as 0 | 1);
        s.announcement = "TIME!";
        s.announcementTimer = TB.ROUND_END_DELAY;
        s.fighters[1 - w].state = TekkenFighterState.DEFEAT;
        s.fighters[w].state = TekkenFighterState.VICTORY;
        this._sm.transition(TekkenPhase.ROUND_END);
        s.phase = TekkenPhase.ROUND_END;
      }
    }

    // Process audio triggers based on state changes
    this._processAudioTriggers(s);
  }

  // ---- Audio Triggers ----

  private _processAudioTriggers(s: TekkenState): void {
    const frame = s.frameCount;

    for (let i = 0; i < 2; i++) {
      const f = s.fighters[i];
      const opp = s.fighters[1 - i];

      // --- Hit detection: fighter just got hit (entered hitstun this frame) ---
      if (
        (f.state === TekkenFighterState.HIT_STUN_HIGH ||
         f.state === TekkenFighterState.HIT_STUN_MID ||
         f.state === TekkenFighterState.HIT_STUN_LOW ||
         f.state === TekkenFighterState.JUGGLE) &&
        frame - this._lastHitFrame[i] > 3 // debounce: at least 3 frames between hit sounds
      ) {
        // Check if opponent's move just connected (moveHasHit became true)
        if (opp.moveHasHit && opp.state === TekkenFighterState.ATTACK) {
          this._lastHitFrame[i] = frame;

          const moveDef = this._getActiveMoveDefForFighter(opp);
          const damage = moveDef ? moveDef.damage : 15;

          // Check for counter hit
          if (f.counterHitWindow) {
            this._audio.playCounterHit();
            this._audio.playCrowdReaction("heavy");
          }
          // Check for launcher
          else if (moveDef && moveDef.isLauncher) {
            this._audio.playLaunch();
            this._audio.playCrowdReaction("heavy");
          }
          // Heavy vs light hit based on damage
          else if (damage >= 25) {
            this._audio.playHeavyHit();
            this._audio.playCrowdReaction("heavy");
          } else {
            this._audio.playLightHit();
            this._audio.playCrowdReaction("light");
          }
        }
      }

      // --- Block detection: fighter just entered block state ---
      if (
        (f.state === TekkenFighterState.BLOCK_STAND ||
         f.state === TekkenFighterState.BLOCK_CROUCH) &&
        f.blockstunFrames > 0 &&
        frame - this._lastBlockFrame[i] > 3
      ) {
        if (opp.moveHasHit) {
          this._lastBlockFrame[i] = frame;
          this._audio.playBlock();
        }
      }

      // --- Whoosh: fighter enters "active" movePhase ---
      if (
        f.state === TekkenFighterState.ATTACK &&
        f.movePhase === "active" &&
        this._lastMovePhase[i] !== "active"
      ) {
        this._audio.playWhoosh();
      }
      this._lastMovePhase[i] = f.movePhase;

      // --- Footsteps: walking forward/back ---
      if (
        f.state === TekkenFighterState.WALK_FORWARD ||
        f.state === TekkenFighterState.WALK_BACK
      ) {
        this._walkFootstepTimer[i]++;
        if (this._walkFootstepTimer[i] >= 10) {
          this._audio.playFootstep();
          this._walkFootstepTimer[i] = 0;
        }
      } else {
        this._walkFootstepTimer[i] = 0;
      }

      // --- Rage activation moment ---
      if (f.rageActive && !this._lastRageState[i]) {
        this._audio.playRageActivation();
      }
      this._lastRageState[i] = f.rageActive;
    }

    // --- KO sound (once per round) ---
    if (s.phase === TekkenPhase.ROUND_END && !this._koSoundPlayed) {
      for (let i = 0; i < 2; i++) {
        if (s.fighters[i].hp <= 0) {
          this._audio.playKO();
          this._audio.playCrowdReaction("ko");
          this._koSoundPlayed = true;
          break;
        }
      }
    }
  }

  // ---- Next Round / Match End ----

  private _nextRound(): void {
    const s = this._state!;
    // Count wins
    const p1Wins = s.roundResults.filter(r => r === 0).length;
    const p2Wins = s.roundResults.filter(r => r === 1).length;

    if (p1Wins >= TB.ROUNDS_TO_WIN) {
      s.announcement = "PLAYER 1 WINS!";
      s.announcementTimer = 180;
      this._sm.transition(TekkenPhase.MATCH_END);
      s.phase = TekkenPhase.MATCH_END;
      return;
    }
    if (p2Wins >= TB.ROUNDS_TO_WIN) {
      s.announcement = "PLAYER 2 WINS!";
      s.announcementTimer = 180;
      this._sm.transition(TekkenPhase.MATCH_END);
      s.phase = TekkenPhase.MATCH_END;
      return;
    }

    // Reset for next round
    s.round.roundNumber++;
    s.round.winnerId = null;
    s.round.timeRemaining = TB.ROUND_TIME * TB.TPS;
    for (let i = 0; i < 2; i++) {
      const f = s.fighters[i];
      f.hp = f.maxHp;
      f.position.x = i === 0 ? -2 : 2;
      f.position.y = 0;
      f.position.z = 0;
      f.velocity = { x: 0, y: 0, z: 0 };
      f.state = TekkenFighterState.IDLE;
      f.stateTimer = 0;
      f.currentMove = null;
      f.moveFrame = 0;
      f.movePhase = "none";
      f.moveHasHit = false;
      f.comboCount = 0;
      f.comboDamage = 0;
      f.comboDamageScaling = 1;
      f.grounded = true;
      f.juggle = { isAirborne: false, velocity: { x: 0, y: 0, z: 0 }, hitCount: 0, screwUsed: false, boundUsed: false, gravityScale: 1, wallSplatActive: false, wallSplatTimer: 0 };
      f.hitstunFrames = 0;
      f.blockstunFrames = 0;
      f.rageActive = false;
      f.rageArtUsed = false;
      f.facingRight = i === 0;
    }

    // Reset audio tracking for new round
    this._lastHitFrame = [-999, -999];
    this._lastBlockFrame = [-999, -999];
    this._lastRageState = [false, false];
    this._walkFootstepTimer = [0, 0];
    this._lastMovePhase = ["none", "none"];
    this._koSoundPlayed = false;

    s.announcement = `ROUND ${s.round.roundNumber}`;
    s.announcementTimer = TB.ROUND_START_DELAY;
    this._sm.transition(TekkenPhase.INTRO);
    s.phase = TekkenPhase.INTRO;
  }

  // ---- Move Lookup ----

  private _getActiveMoveDefForFighter(fighter: { characterId: string; currentMove: string | null }): TekkenMoveDef | null {
    if (!fighter.currentMove) return null;
    const charDef = TEKKEN_CHARACTERS.find(c => c.id === fighter.characterId);
    if (!charDef) return null;
    if (fighter.currentMove === charDef.rageArt.id) return charDef.rageArt;
    for (const entry of charDef.moveList) {
      if (entry.move.id === fighter.currentMove) return entry.move;
    }
    return null;
  }

  // ---- Training Mode ----

  private _setupTrainingKeyHandler(): void {
    this._trainingKeyHandler = (e: KeyboardEvent) => {
      if (!this._state || this._state.gameMode !== "training") return;
      const tm = this._state.trainingMode;
      if (e.key === "F1") {
        e.preventDefault();
        tm.aiEnabled = !tm.aiEnabled;
        this._aiSystem.enabled = tm.aiEnabled;
      } else if (e.key === "F2") {
        e.preventDefault();
        // Reset positions and HP
        for (let i = 0; i < 2; i++) {
          const f = this._state.fighters[i];
          f.hp = f.maxHp;
          f.position.x = i === 0 ? -2.0 : 2.0;
          f.position.y = 0;
          f.velocity = { x: 0, y: 0, z: 0 };
          f.state = TekkenFighterState.IDLE;
          f.stateTimer = 0;
          f.currentMove = null;
          f.moveFrame = 0;
          f.movePhase = "none";
          f.rageActive = false;
          f.comboCount = 0;
          f.comboDamage = 0;
          f.comboDamageScaling = 1;
          f.hitstunFrames = 0;
          f.blockstunFrames = 0;
          f.juggle = { isAirborne: false, velocity: { x: 0, y: 0, z: 0 }, hitCount: 0, screwUsed: false, boundUsed: false, gravityScale: 1, wallSplatActive: false, wallSplatTimer: 0 };
          f.grounded = true;
          f.facingRight = i === 0;
        }
      } else if (e.key === "F3") {
        e.preventDefault();
        tm.showHitboxes = !tm.showHitboxes;
      }
    };
    window.addEventListener("keydown", this._trainingKeyHandler);
  }

  // ---- Intro Camera Sweep ----

  private _introCameraUpdate(): void {
    const s = this._state!;
    const introFrame = TB.ROUND_START_DELAY - s.announcementTimer; // 0 to 90
    const midX = (s.fighters[0].position.x + s.fighters[1].position.x) / 2;

    if (introFrame < TB.INTRO_ORBIT_FRAMES) {
      // Orbit camera from behind to side view
      const t = introFrame / TB.INTRO_ORBIT_FRAMES;
      const angle = Math.PI * (1 - t) + (Math.PI / 2) * t;
      const radius = TB.INTRO_ORBIT_RADIUS_START + t * (TB.INTRO_ORBIT_RADIUS_END - TB.INTRO_ORBIT_RADIUS_START);
      const camX = midX + Math.sin(angle * 0.5) * radius;
      const camZ = Math.cos(angle * 0.5) * radius;
      const camY = TB.INTRO_ORBIT_Y_START - t * (TB.INTRO_ORBIT_Y_START - TB.INTRO_ORBIT_Y_END);
      this._sceneManager.camera.position.set(camX, camY, camZ);
      this._sceneManager.camera.lookAt(midX, 0.9, 0);
    } else {
      // Ease to final position using smoothstep
      const t = (introFrame - TB.INTRO_ORBIT_FRAMES) / TB.INTRO_EASE_FRAMES;
      const eased = t * t * (3 - 2 * t);
      const curPos = this._sceneManager.camera.position;
      const targetZ = TB.CAMERA_BASE_Z;
      this._sceneManager.camera.position.set(
        curPos.x + (midX - curPos.x) * eased * 0.1,
        curPos.y + (TB.CAMERA_Y - curPos.y) * eased * 0.1,
        curPos.z + (targetZ - curPos.z) * eased * 0.1,
      );
      this._sceneManager.camera.lookAt(midX, TB.CAMERA_LOOK_Y, 0);
    }
  }

  // ---- Render ----

  private _render(): void {
    if (!this._state) return;
    const s = this._state;

    const midX = (s.fighters[0].position.x + s.fighters[1].position.x) / 2;

    // --- Feature 4: Intro Camera Sweep ---
    if (s.phase === TekkenPhase.INTRO) {
      this._introCameraUpdate();
    } else {
      // --- Feature 1: Rage Art Cinematic Camera ---
      let rageArtCameraHandled = false;
      if (this._rageArtCinematic?.active) {
        const rc = this._rageArtCinematic;
        const attacker = s.fighters[rc.attackerIdx];
        const cam = s.cameraState;

        if (rc.phase === "zoom_in") {
          // Camera zooms in close to the attacker with 3/4 view offset
          const t = rc.timer / TB.RAGE_ART_ZOOM_IN_FRAMES;
          const eased = t * t;
          const targetZ = TB.RAGE_ART_ZOOM_Z;
          const targetY = TB.RAGE_ART_ZOOM_Y;
          const offsetX = (rc.attackerIdx === 0 ? 0.5 : -0.5); // 3/4 view shift
          cam.z += (targetZ - cam.z) * eased * 0.3;
          cam.y += (targetY - cam.y) * eased * 0.3;
          cam.x += (attacker.position.x + offsetX - cam.x) * eased * 0.2;
          this._sceneManager.camera.position.set(cam.x, cam.y, cam.z);
          this._sceneManager.camera.lookAt(attacker.position.x, 1.0, 0);
          rageArtCameraHandled = true;
        } else if (rc.phase === "impact") {
          // Screen flash effect via bloom boost, camera holds close
          cam.z += (TB.RAGE_ART_ZOOM_Z - cam.z) * 0.1;
          this._sceneManager.camera.position.set(cam.x, cam.y, cam.z);
          this._sceneManager.camera.lookAt(attacker.position.x, 1.0, 0);
          // Flash effect through bloom
          this._sceneManager.setHitImpactIntensity(5.0 - rc.timer * 0.4);
          rageArtCameraHandled = true;
        } else if (rc.phase === "zoom_out") {
          // Camera returns to normal
          const t = rc.timer / TB.RAGE_ART_ZOOM_OUT_FRAMES;
          const eased = t * t * (3 - 2 * t);
          const dist = Math.abs(s.fighters[0].position.x - s.fighters[1].position.x);
          const normalZ = TB.CAMERA_BASE_Z + Math.max(0, dist - 3) * 0.5;
          cam.z += (normalZ - cam.z) * eased * 0.15;
          cam.y += (TB.CAMERA_Y - cam.y) * eased * 0.15;
          cam.x += (midX - cam.x) * eased * 0.15;
          this._sceneManager.camera.position.set(cam.x, cam.y, cam.z);
          this._sceneManager.camera.lookAt(cam.x, TB.CAMERA_LOOK_Y, 0);
          rageArtCameraHandled = true;
        }
      }

      if (!rageArtCameraHandled) {
        // Normal camera update
        const dist = Math.abs(s.fighters[0].position.x - s.fighters[1].position.x);
        const targetZ = TB.CAMERA_BASE_Z + Math.max(0, dist - 3) * 0.5;

        const cam = s.cameraState;
        cam.targetX = midX;
        cam.x += (cam.targetX - cam.x) * TB.CAMERA_LERP;
        cam.z += (targetZ + cam.zoomOffset - cam.z) * TB.CAMERA_LERP;

        // --- Feature 5: KO Slow-Motion Camera ---
        if (s.phase === TekkenPhase.ROUND_END && s.round.winnerId !== null) {
          const koTimer = TB.ROUND_END_DELAY - s.announcementTimer;
          if (koTimer < 60) {
            const winner = s.fighters[s.round.winnerId];
            const t = koTimer / 60;
            const zoom = 1 - t * TB.KO_ZOOM_AMOUNT;
            cam.z = TB.CAMERA_BASE_Z * zoom;
            cam.targetX = midX + (winner.position.x - midX) * TB.KO_CAMERA_SHIFT * t;
            cam.x += (cam.targetX - cam.x) * TB.CAMERA_LERP * 2;
          }
        }

        // Apply camera shake
        let shakeX = 0, shakeY = 0;
        if (cam.shakeIntensity > 0.001) {
          shakeX = (Math.random() - 0.5) * cam.shakeIntensity * 2;
          shakeY = (Math.random() - 0.5) * cam.shakeIntensity * 2;
          cam.shakeIntensity *= cam.shakeDecay;
        }

        this._sceneManager.camera.position.set(cam.x + shakeX, cam.y + shakeY, cam.z);
        this._sceneManager.camera.lookAt(cam.x, TB.CAMERA_LOOK_Y, 0);
      }
    }

    // Update fighter meshes
    for (let i = 0; i < 2; i++) {
      this._fighterRenderers[i].update(s.fighters[i]);
    }

    // Weapon trails
    for (let i = 0; i < 2; i++) {
      const f = s.fighters[i];
      const moveDef = this._getActiveMoveDefForFighter(f);
      if (f.state === TekkenFighterState.ATTACK && f.movePhase === "active" && moveDef) {
        if (!this._fxManager.isTrailActive(i)) {
          const charDef = TEKKEN_CHARACTERS.find(c => c.id === f.characterId);
          this._fxManager.startTrail(i, charDef?.colors.accent ?? 0xffaa33);
        }
        const limbPos = this._fighterRenderers[i].getAttackLimbWorldPos(moveDef.limb);
        this._fxManager.updateTrailPoint(i, limbPos);
      } else if (this._fxManager.isTrailActive(i)) {
        this._fxManager.stopTrail(i);
      }
    }

    // Update spectator animations
    this._arenaRenderer.updateSpectators();

    // Update FX
    this._fxManager.update();

    // Update HUD
    this._hud.update(s);

    // Post-processing impact effects
    const maxShake = Math.max(s.cameraState.shakeIntensity, 0);
    this._sceneManager.setHitImpactIntensity(maxShake * 10);

    // Rage glow
    const anyRage = s.fighters[0].rageActive || s.fighters[1].rageActive;
    this._sceneManager.setRageGlow(anyRage);

    // --- Feature 7: Dynamic Arena Lighting ---
    const maxCombo = Math.max(s.fighters[0].comboCount, s.fighters[1].comboCount);
    const comboIntensity = Math.min(1, maxCombo / TB.COMBO_INTENSITY_DIVISOR);
    this._sceneManager.setComboIntensity(comboIntensity);

    // Render 3D
    this._sceneManager.render();
  }
}
