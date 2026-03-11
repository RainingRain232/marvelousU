// ---------------------------------------------------------------------------
// Duel mode – VS splash + round announcements
// Cinematic intro with animated slide-in, VS flash, and stage name
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from "pixi.js";
import { DUEL_CHARACTERS } from "../../duel/config/DuelCharacterDefs";
import { DUEL_ARENAS } from "../../duel/config/DuelArenaDefs";

export class DuelIntroView {
  readonly container = new Container();

  private _timer = 0;
  private _maxTimer = 0;
  private _callback: (() => void) | null = null;

  // Animated elements
  private _sw = 0;
  private _sh = 0;
  private _animGfx = new Graphics();
  private _p1Name: Text | null = null;
  private _p1Title: Text | null = null;
  private _p2Name: Text | null = null;
  private _p2Title: Text | null = null;
  private _vsText: Text | null = null;
  private _stageText: Text | null = null;
  private _stageSub: Text | null = null;

  /** Show VS splash screen for two characters + arena. */
  show(
    sw: number,
    sh: number,
    p1Id: string,
    p2Id: string,
    arenaId: string,
    onComplete: () => void,
  ): void {
    this.container.removeChildren();
    this._callback = onComplete;
    this._maxTimer = 72; // ~1.2 seconds (shorter!)
    this._timer = this._maxTimer;
    this._sw = sw;
    this._sh = sh;

    const p1 = DUEL_CHARACTERS[p1Id];
    const p2 = DUEL_CHARACTERS[p2Id];
    const arena = DUEL_ARENAS[arenaId];

    // Animated graphics layer (for background effects)
    this._animGfx = new Graphics();
    this.container.addChild(this._animGfx);

    // --- P1 name (slides in from left) ---
    this._p1Name = new Text({
      text: p1.name.toUpperCase(),
      style: {
        fontFamily: "monospace",
        fontSize: 40,
        fill: 0x4499ff,
        fontWeight: "bold",
        stroke: { color: 0x112244, width: 3 },
        letterSpacing: 3,
      },
    });
    this._p1Name.anchor.set(0.5);
    this._p1Name.position.set(-200, sh * 0.38);
    this.container.addChild(this._p1Name);

    this._p1Title = new Text({
      text: `— ${p1.title} —`,
      style: { fontFamily: "monospace", fontSize: 13, fill: 0x6699bb, letterSpacing: 1 },
    });
    this._p1Title.anchor.set(0.5);
    this._p1Title.position.set(-200, sh * 0.38 + 30);
    this.container.addChild(this._p1Title);

    // --- P2 name (slides in from right) ---
    this._p2Name = new Text({
      text: p2.name.toUpperCase(),
      style: {
        fontFamily: "monospace",
        fontSize: 40,
        fill: 0xff4455,
        fontWeight: "bold",
        stroke: { color: 0x441122, width: 3 },
        letterSpacing: 3,
      },
    });
    this._p2Name.anchor.set(0.5);
    this._p2Name.position.set(sw + 200, sh * 0.38);
    this.container.addChild(this._p2Name);

    this._p2Title = new Text({
      text: `— ${p2.title} —`,
      style: { fontFamily: "monospace", fontSize: 13, fill: 0xbb6666, letterSpacing: 1 },
    });
    this._p2Title.anchor.set(0.5);
    this._p2Title.position.set(sw + 200, sh * 0.38 + 30);
    this.container.addChild(this._p2Title);

    // --- VS text (scales up from 0) ---
    this._vsText = new Text({
      text: "VS",
      style: {
        fontFamily: "monospace",
        fontSize: 72,
        fill: 0xffcc22,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 5 },
        letterSpacing: 8,
      },
    });
    this._vsText.anchor.set(0.5);
    this._vsText.position.set(sw / 2, sh * 0.38);
    this._vsText.scale.set(0);
    this._vsText.alpha = 0;
    this.container.addChild(this._vsText);

    // --- Stage name (fades in at bottom) ---
    const stageName = arena?.name ?? arenaId;
    this._stageText = new Text({
      text: stageName.toUpperCase(),
      style: {
        fontFamily: "monospace",
        fontSize: 18,
        fill: 0xccccaa,
        fontWeight: "bold",
        letterSpacing: 4,
        stroke: { color: 0x000000, width: 2 },
      },
    });
    this._stageText.anchor.set(0.5);
    this._stageText.position.set(sw / 2, sh * 0.62);
    this._stageText.alpha = 0;
    this.container.addChild(this._stageText);

    // Decorative line under stage name
    this._stageSub = new Text({
      text: "━━━━━━━━━━━━━━━━",
      style: { fontFamily: "monospace", fontSize: 10, fill: 0x666655, letterSpacing: 2 },
    });
    this._stageSub.anchor.set(0.5);
    this._stageSub.position.set(sw / 2, sh * 0.62 + 20);
    this._stageSub.alpha = 0;
    this.container.addChild(this._stageSub);

    this.container.visible = true;
  }

  /** Call each frame. Returns true when done. */
  update(): boolean {
    if (this._timer <= 0) return false;

    this._timer--;
    const max = this._maxTimer;
    const t = this._timer;
    const progress = 1 - t / max; // 0→1

    const sw = this._sw;
    const sh = this._sh;
    const g = this._animGfx;
    g.clear();

    // --- Background: dark overlay that fades in fast, then out at end ---
    const bgAlpha = t < 10
      ? t / 10 * 0.88  // fade out in last 10 frames
      : Math.min(progress * 5, 0.88); // fade in fast
    g.rect(0, 0, sw, sh);
    g.fill({ color: 0x000000, alpha: bgAlpha });

    // --- Diagonal slash lines (cinematic wipe accents) ---
    const slashProgress = Math.min(progress * 3, 1);
    if (slashProgress > 0) {
      // Blue slash from top-left
      const sx1 = -50 + slashProgress * (sw * 0.55);
      g.moveTo(sx1, 0);
      g.lineTo(sx1 + 60, 0);
      g.lineTo(sx1 - sh * 0.3 + 60, sh);
      g.lineTo(sx1 - sh * 0.3, sh);
      g.closePath();
      g.fill({ color: 0x2255aa, alpha: 0.15 });

      // Red slash from top-right
      const sx2 = sw + 50 - slashProgress * (sw * 0.55);
      g.moveTo(sx2, 0);
      g.lineTo(sx2 - 60, 0);
      g.lineTo(sx2 + sh * 0.3 - 60, sh);
      g.lineTo(sx2 + sh * 0.3, sh);
      g.closePath();
      g.fill({ color: 0xaa2233, alpha: 0.15 });
    }

    // --- Divider: angled line with glow ---
    if (progress > 0.15) {
      const divAlpha = Math.min((progress - 0.15) * 4, 1) * (t < 10 ? t / 10 : 1);
      // Glow
      g.moveTo(sw / 2 + 20, -10);
      g.lineTo(sw / 2 - 20, sh + 10);
      g.stroke({ color: 0xffcc22, width: 8, alpha: divAlpha * 0.15 });
      // Core line
      g.moveTo(sw / 2 + 20, -10);
      g.lineTo(sw / 2 - 20, sh + 10);
      g.stroke({ color: 0xffcc22, width: 2, alpha: divAlpha * 0.6 });
      // Thin bright center
      g.moveTo(sw / 2 + 20, -10);
      g.lineTo(sw / 2 - 20, sh + 10);
      g.stroke({ color: 0xffffee, width: 0.8, alpha: divAlpha * 0.8 });
    }

    // --- Horizontal accent bars ---
    if (progress > 0.1) {
      const barAlpha = Math.min((progress - 0.1) * 3, 0.4) * (t < 10 ? t / 10 : 1);
      // Top bar
      g.rect(0, sh * 0.25, sw, 2);
      g.fill({ color: 0x888866, alpha: barAlpha });
      // Bottom bar
      g.rect(0, sh * 0.55, sw, 2);
      g.fill({ color: 0x888866, alpha: barAlpha });
    }

    // --- Sparkle particles along divider ---
    if (progress > 0.25 && t > 8) {
      for (let i = 0; i < 6; i++) {
        const py = sh * (0.1 + i * 0.15);
        const sparkPhase = progress * 12 + i * 2.5;
        const sx = sw / 2 + 20 - 40 * (py / sh) + Math.sin(sparkPhase) * 8;
        const sy = py + Math.cos(sparkPhase * 1.3) * 4;
        const sparkAlpha = (0.3 + Math.sin(sparkPhase * 2) * 0.3) * (t < 10 ? t / 10 : 1);
        g.circle(sx, sy, 2);
        g.fill({ color: 0xffffcc, alpha: sparkAlpha });
        g.circle(sx, sy, 5);
        g.fill({ color: 0xffcc22, alpha: sparkAlpha * 0.2 });
      }
    }

    // --- Animate P1 name (slide from left) ---
    if (this._p1Name && this._p1Title) {
      const slideIn = easeOutBack(Math.min(progress * 2.5, 1));
      const fadeOut = t < 10 ? t / 10 : 1;
      const targetX = sw * 0.25;
      this._p1Name.position.x = -200 + (targetX + 200) * slideIn;
      this._p1Name.alpha = Math.min(progress * 4, 1) * fadeOut;
      this._p1Title.position.x = -200 + (targetX + 200) * easeOutBack(Math.min(progress * 2.2, 1));
      this._p1Title.alpha = Math.min((progress - 0.1) * 3, 1) * fadeOut;
    }

    // --- Animate P2 name (slide from right) ---
    if (this._p2Name && this._p2Title) {
      const slideIn = easeOutBack(Math.min(progress * 2.5, 1));
      const fadeOut = t < 10 ? t / 10 : 1;
      const targetX = sw * 0.75;
      this._p2Name.position.x = sw + 200 - (sw + 200 - targetX) * slideIn;
      this._p2Name.alpha = Math.min(progress * 4, 1) * fadeOut;
      this._p2Title.position.x = sw + 200 - (sw + 200 - targetX) * easeOutBack(Math.min(progress * 2.2, 1));
      this._p2Title.alpha = Math.min((progress - 0.1) * 3, 1) * fadeOut;
    }

    // --- Animate VS text (pop in with scale) ---
    if (this._vsText) {
      const vsDelay = 0.2;
      const fadeOut = t < 10 ? t / 10 : 1;
      if (progress > vsDelay) {
        const vsP = Math.min((progress - vsDelay) * 4, 1);
        const scale = easeOutBack(vsP);
        this._vsText.scale.set(scale);
        this._vsText.alpha = Math.min(vsP * 2, 1) * fadeOut;
        // Subtle pulse
        const pulse = 1 + Math.sin(progress * 20) * 0.03;
        if (vsP >= 1) this._vsText.scale.set(pulse);
      }
    }

    // --- Animate stage name (fade in from below) ---
    if (this._stageText && this._stageSub) {
      const stageDelay = 0.35;
      const fadeOut = t < 10 ? t / 10 : 1;
      if (progress > stageDelay) {
        const sp = Math.min((progress - stageDelay) * 3, 1);
        const ease = easeOutCubic(sp);
        this._stageText.alpha = sp * fadeOut;
        this._stageText.position.y = sh * 0.62 + 10 * (1 - ease);
        this._stageSub.alpha = Math.max(0, sp - 0.2) * fadeOut;
        this._stageSub.position.y = sh * 0.62 + 20 + 8 * (1 - ease);
      }
    }

    // --- Flash on VS appear ---
    if (progress > 0.2 && progress < 0.32) {
      const flashP = (progress - 0.2) / 0.12;
      const flashAlpha = flashP < 0.3 ? flashP / 0.3 * 0.25 : (1 - flashP) * 0.25;
      g.rect(0, 0, sw, sh);
      g.fill({ color: 0xffffee, alpha: flashAlpha });
    }

    // Done
    if (t <= 0) {
      this.container.visible = false;
      this._callback?.();
      return true;
    }

    return false;
  }

  hide(): void {
    this.container.visible = false;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

// --- Easing helpers ---

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
