// ---------------------------------------------------------------------------
// Duel mode – main menu screen (fantasiaCup-style)
// Shows mode options: ARCADE, VS MODE, VS CPU, TRAINING, CONTROLS, HOW TO PLAY, SETTINGS
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from "pixi.js";
import { duelAudio } from "../../duel/systems/DuelAudioSystem";

// ---- Menu items ------------------------------------------------------------

const MENU_ITEMS = [
  "ARCADE",
  "WAVE",
  "VS MODE",
  "VS CPU",
  "TRAINING",
  "COMBO CHALLENGE",
  "CONTROLS",
  "HOW TO PLAY",
  "SETTINGS",
] as const;

export type DuelMenuChoice = (typeof MENU_ITEMS)[number];

// ---- Styles ----------------------------------------------------------------

const COL_ACCENT = 0xe94560;
const COL_GOLD = 0xd4af37;
const COL_GOLD_BRIGHT = 0xffd700;
const COL_GOLD_DARK = 0x8b7320;
const COL_TEXT_SELECTED = 0xffffff;
const COL_TEXT_NORMAL = 0x888888;
const COL_BG_TOP = 0x06000f;
const COL_BG_MID = 0x1a0a30;
const COL_BG_BOTTOM = 0x0d0020;
const COL_PURPLE_DEEP = 0x2a0845;
const COL_PANEL = 0x12082a;
const COL_PANEL_BORDER = 0x3a1a6a;

// ---- Particle state --------------------------------------------------------

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: number;
}

// ---- Menu view class -------------------------------------------------------

export class DuelMenuView {
  readonly container = new Container();

  private _selection = 0;
  private _onSelect: ((choice: DuelMenuChoice) => void) | null = null;
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _screenW = 0;
  private _screenH = 0;
  private _animFrame = 0;
  private _animRAF = 0;
  private _particles: Particle[] = [];

  setSelectCallback(cb: (choice: DuelMenuChoice) => void): void {
    this._onSelect = cb;
  }

  show(sw: number, sh: number): void {
    this._screenW = sw;
    this._screenH = sh;
    this._selection = 2; // default to VS CPU
    this._initParticles();
    this._draw();

    this._onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          this._selection = (this._selection - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
          duelAudio.playSelect();
          break;
        case "ArrowDown":
        case "KeyS":
          this._selection = (this._selection + 1) % MENU_ITEMS.length;
          duelAudio.playSelect();
          break;
        case "Enter":
        case "Space":
          duelAudio.playConfirm();
          this._onSelect?.(MENU_ITEMS[this._selection]);
          return;
        case "Escape":
          duelAudio.playCancel();
          window.dispatchEvent(new CustomEvent("duelExit"));
          return;
        default:
          return;
      }
      e.preventDefault();
      this._draw();
    };
    window.addEventListener("keydown", this._onKeyDown);

    // Animation loop
    const animate = () => {
      this._animFrame++;
      this._updateParticles();
      if (this._animFrame % 3 === 0) this._draw();
      this._animRAF = requestAnimationFrame(animate);
    };
    this._animRAF = requestAnimationFrame(animate);
  }

  hide(): void {
    this._cleanup();
    this.container.removeChildren();
  }

  // ---- Particle system -----------------------------------------------------

  private _initParticles(): void {
    this._particles = [];
    for (let i = 0; i < 40; i++) {
      this._particles.push(this._createParticle(true));
    }
  }

  private _createParticle(randomY: boolean): Particle {
    const sw = this._screenW;
    const sh = this._screenH;
    return {
      x: Math.random() * sw,
      y: randomY ? Math.random() * sh : sh + Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -(0.3 + Math.random() * 1.2),
      size: 1 + Math.random() * 3,
      alpha: 0.2 + Math.random() * 0.6,
      life: 0,
      maxLife: 120 + Math.random() * 200,
      color: Math.random() > 0.3 ? COL_GOLD_BRIGHT : COL_GOLD,
    };
  }

  private _updateParticles(): void {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.x += p.vx + Math.sin(p.life * 0.02) * 0.3;
      p.y += p.vy;
      p.life++;
      if (p.life > p.maxLife || p.y < -20) {
        this._particles[i] = this._createParticle(false);
      }
    }
  }

  // ---- Drawing helpers -----------------------------------------------------

  private _drawVignette(g: Graphics, sw: number, sh: number): void {
    // Dark edges using multiple semi-transparent rects
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const inset = t * sw * 0.25;
      const a = (1 - t) * 0.4;
      // Top edge
      g.rect(0, 0, sw, 40 + inset * 0.5);
      g.fill({ color: 0x000000, alpha: a * 0.5 });
      // Bottom edge
      g.rect(0, sh - 40 - inset * 0.5, sw, 40 + inset * 0.5);
      g.fill({ color: 0x000000, alpha: a * 0.5 });
      // Left edge
      g.rect(0, 0, 30 + inset * 0.4, sh);
      g.fill({ color: 0x000000, alpha: a * 0.4 });
      // Right edge
      g.rect(sw - 30 - inset * 0.4, 0, 30 + inset * 0.4, sh);
      g.fill({ color: 0x000000, alpha: a * 0.4 });
    }
  }

  private _drawShieldCrest(g: Graphics, cx: number, cy: number, size: number, time: number): void {
    const pulse = Math.sin(time * 1.5) * 0.05 + 1;
    const s = size * pulse;
    const w = s * 0.7;
    const h = s;

    // Shield shape: rounded top, pointed bottom
    // Outer glow
    g.moveTo(cx - w, cy - h * 0.4);
    g.lineTo(cx - w, cy + h * 0.15);
    g.lineTo(cx, cy + h * 0.55);
    g.lineTo(cx + w, cy + h * 0.15);
    g.lineTo(cx + w, cy - h * 0.4);
    g.bezierCurveTo(cx + w, cy - h * 0.55, cx + w * 0.5, cy - h * 0.6, cx, cy - h * 0.6);
    g.bezierCurveTo(cx - w * 0.5, cy - h * 0.6, cx - w, cy - h * 0.55, cx - w, cy - h * 0.4);
    g.fill({ color: COL_GOLD_DARK, alpha: 0.08 });
    g.stroke({ color: COL_GOLD, width: 2, alpha: 0.15 });

    // Inner shield line
    const iw = w * 0.75;
    const ih = h * 0.75;
    g.moveTo(cx - iw, cy - ih * 0.4);
    g.lineTo(cx - iw, cy + ih * 0.15);
    g.lineTo(cx, cy + ih * 0.55);
    g.lineTo(cx + iw, cy + ih * 0.15);
    g.lineTo(cx + iw, cy - ih * 0.4);
    g.bezierCurveTo(cx + iw, cy - ih * 0.55, cx + iw * 0.5, cy - ih * 0.6, cx, cy - ih * 0.6);
    g.bezierCurveTo(cx - iw * 0.5, cy - ih * 0.6, cx - iw, cy - ih * 0.55, cx - iw, cy - ih * 0.4);
    g.stroke({ color: COL_GOLD, width: 1, alpha: 0.1 });

    // Cross inside shield
    g.moveTo(cx, cy - h * 0.35);
    g.lineTo(cx, cy + h * 0.35);
    g.stroke({ color: COL_GOLD, width: 1.5, alpha: 0.07 });
    g.moveTo(cx - w * 0.5, cy - h * 0.1);
    g.lineTo(cx + w * 0.5, cy - h * 0.1);
    g.stroke({ color: COL_GOLD, width: 1.5, alpha: 0.07 });
  }

  private _drawOrnamentalLine(g: Graphics, cx: number, y: number, width: number, time: number): void {
    const halfW = width / 2;
    const shimmer = Math.sin(time * 2) * 0.15 + 0.85;

    // Main line
    g.moveTo(cx - halfW, y);
    g.lineTo(cx - 12, y);
    g.stroke({ color: COL_GOLD, width: 2, alpha: 0.5 * shimmer });

    g.moveTo(cx + 12, y);
    g.lineTo(cx + halfW, y);
    g.stroke({ color: COL_GOLD, width: 2, alpha: 0.5 * shimmer });

    // Center diamond
    g.moveTo(cx, y - 6);
    g.lineTo(cx + 8, y);
    g.lineTo(cx, y + 6);
    g.lineTo(cx - 8, y);
    g.closePath();
    g.fill({ color: COL_GOLD_BRIGHT, alpha: 0.6 * shimmer });

    // End diamonds
    for (const sign of [-1, 1]) {
      const ex = cx + sign * halfW;
      g.moveTo(ex, y - 4);
      g.lineTo(ex + sign * 5, y);
      g.lineTo(ex, y + 4);
      g.lineTo(ex - sign * 5, y);
      g.closePath();
      g.fill({ color: COL_GOLD, alpha: 0.4 * shimmer });
    }

    // Small accent dots along the line
    for (let i = 1; i <= 3; i++) {
      for (const sign of [-1, 1]) {
        const dx = cx + sign * (halfW * i / 4);
        g.circle(dx, y, 1.5);
        g.fill({ color: COL_GOLD, alpha: 0.3 * shimmer });
      }
    }
  }

  private _drawCornerOrnament(g: Graphics, x: number, y: number, flipX: number, flipY: number, time: number): void {
    const len = 50;
    const thickness = 2;
    const shimmer = Math.sin(time * 1.5 + x * 0.01) * 0.2 + 0.8;

    // L-shaped bracket
    // Horizontal arm
    g.moveTo(x, y);
    g.lineTo(x + flipX * len, y);
    g.stroke({ color: COL_GOLD, width: thickness, alpha: 0.4 * shimmer });

    // Vertical arm
    g.moveTo(x, y);
    g.lineTo(x, y + flipY * len);
    g.stroke({ color: COL_GOLD, width: thickness, alpha: 0.4 * shimmer });

    // Small decorative end caps
    g.circle(x + flipX * len, y, 2);
    g.fill({ color: COL_GOLD_BRIGHT, alpha: 0.5 * shimmer });
    g.circle(x, y + flipY * len, 2);
    g.fill({ color: COL_GOLD_BRIGHT, alpha: 0.5 * shimmer });

    // Inner bracket (smaller)
    const innerLen = len * 0.5;
    const innerOff = 6;
    g.moveTo(x + flipX * innerOff, y + flipY * innerOff);
    g.lineTo(x + flipX * innerLen, y + flipY * innerOff);
    g.stroke({ color: COL_GOLD, width: 1, alpha: 0.25 * shimmer });
    g.moveTo(x + flipX * innerOff, y + flipY * innerOff);
    g.lineTo(x + flipX * innerOff, y + flipY * innerLen);
    g.stroke({ color: COL_GOLD, width: 1, alpha: 0.25 * shimmer });

    // Corner diamond
    g.moveTo(x + flipX * 3, y);
    g.lineTo(x, y + flipY * 3);
    g.lineTo(x - flipX * 0, y);
    g.stroke({ color: COL_GOLD_BRIGHT, width: 1, alpha: 0.3 * shimmer });
  }

  // ---- Main draw -----------------------------------------------------------

  private _draw(): void {
    this.container.removeChildren();
    const sw = this._screenW;
    const sh = this._screenH;
    const time = this._animFrame / 60;

    // ===== Background =====
    const bg = new Graphics();

    // Base dark background
    bg.rect(0, 0, sw, sh);
    bg.fill({ color: COL_BG_TOP });

    // Rich purple gradient bands
    bg.rect(0, sh * 0.15, sw, sh * 0.2);
    bg.fill({ color: COL_PURPLE_DEEP, alpha: 0.4 });

    bg.rect(0, sh * 0.3, sw, sh * 0.45);
    bg.fill({ color: COL_BG_MID, alpha: 0.45 });

    bg.rect(0, sh * 0.65, sw, sh * 0.35);
    bg.fill({ color: COL_BG_BOTTOM, alpha: 0.5 });

    // Horizontal animated lines (subtler)
    for (let i = 0; i < 15; i++) {
      const y = ((i * 70 + time * 20) % sh);
      const wobble = Math.sin(time * 0.7 + i * 0.8) * 40;
      bg.moveTo(0, y);
      bg.lineTo(sw, y + wobble);
      bg.stroke({ color: COL_ACCENT, width: 1, alpha: 0.06 });
    }

    // Vertical animated lines (subtler, purple)
    for (let i = 0; i < 10; i++) {
      const x = ((i * 160 + time * 15) % sw);
      const wobble = Math.sin(time * 0.5 + i) * 25;
      bg.moveTo(x, 0);
      bg.lineTo(x + wobble, sh);
      bg.stroke({ color: 0x6432c8, width: 1, alpha: 0.05 });
    }

    // Subtle gold radial lines emanating from title area
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + time * 0.1;
      const cx = sw / 2;
      const cy = 160;
      const r = 300;
      bg.moveTo(cx, cy);
      bg.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      bg.stroke({ color: COL_GOLD_DARK, width: 1, alpha: 0.03 });
    }

    this.container.addChild(bg);

    // ===== Vignette overlay =====
    const vignette = new Graphics();
    this._drawVignette(vignette, sw, sh);
    this.container.addChild(vignette);

    // ===== Shield crest behind title =====
    const crest = new Graphics();
    this._drawShieldCrest(crest, sw / 2, 155, 160, time);
    this.container.addChild(crest);

    // ===== Floating particles / embers =====
    const particleGfx = new Graphics();
    for (const p of this._particles) {
      const lifeRatio = p.life / p.maxLife;
      // Fade in at start, fade out at end
      const fadeAlpha = lifeRatio < 0.1
        ? lifeRatio / 0.1
        : lifeRatio > 0.7
          ? (1 - lifeRatio) / 0.3
          : 1;
      const a = p.alpha * fadeAlpha;
      if (a <= 0) continue;

      // Main particle dot
      particleGfx.circle(p.x, p.y, p.size);
      particleGfx.fill({ color: p.color, alpha: a });

      // Soft glow around larger particles
      if (p.size > 2) {
        particleGfx.circle(p.x, p.y, p.size * 2.5);
        particleGfx.fill({ color: p.color, alpha: a * 0.15 });
      }
    }
    this.container.addChild(particleGfx);

    // ===== Corner ornaments =====
    const corners = new Graphics();
    const margin = 20;
    this._drawCornerOrnament(corners, margin, margin, 1, 1, time);
    this._drawCornerOrnament(corners, sw - margin, margin, -1, 1, time);
    this._drawCornerOrnament(corners, margin, sh - margin, 1, -1, time);
    this._drawCornerOrnament(corners, sw - margin, sh - margin, -1, -1, time);
    this.container.addChild(corners);

    // ===== Logo / Title =====
    const bounce = Math.sin(time * 2) * 4;
    const titleY = 155;

    // Ornamental line above title
    const ornTop = new Graphics();
    this._drawOrnamentalLine(ornTop, sw / 2, titleY - 60 + bounce, 320, time);
    this.container.addChild(ornTop);

    // Title - dark gold shadow layer (largest)
    const logoShadow = new Text({
      text: "DUEL MODE",
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 104,
        fill: 0x000000,
        fontWeight: "bold",
        letterSpacing: 6,
      },
    });
    logoShadow.anchor.set(0.5);
    logoShadow.position.set(sw / 2 + 3, titleY + 3 + bounce);
    logoShadow.alpha = 0.5;
    this.container.addChild(logoShadow);

    // Title - accent glow layer
    const logoGlow = new Text({
      text: "DUEL MODE",
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 102,
        fill: COL_ACCENT,
        fontWeight: "bold",
        letterSpacing: 6,
      },
    });
    logoGlow.anchor.set(0.5);
    logoGlow.position.set(sw / 2, titleY + bounce);
    logoGlow.alpha = 0.35;
    this.container.addChild(logoGlow);

    // Title - gold mid layer
    const logoMid = new Text({
      text: "DUEL MODE",
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 100,
        fill: COL_GOLD,
        fontWeight: "bold",
        letterSpacing: 5,
      },
    });
    logoMid.anchor.set(0.5);
    logoMid.position.set(sw / 2, titleY + bounce);
    logoMid.alpha = 0.7;
    this.container.addChild(logoMid);

    // Title - bright gold top layer
    const logoMain = new Text({
      text: "DUEL MODE",
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 96,
        fill: COL_GOLD_BRIGHT,
        fontWeight: "bold",
        letterSpacing: 5,
        dropShadow: {
          color: COL_GOLD_DARK,
          blur: 8,
          distance: 0,
          alpha: 0.6,
        },
      },
    });
    logoMain.anchor.set(0.5);
    logoMain.position.set(sw / 2, titleY + bounce);
    this.container.addChild(logoMain);

    // Subtitle
    const subtitle = new Text({
      text: "- ULTIMATE SHOWDOWN -",
      style: {
        fontFamily: '"Segoe UI", sans-serif',
        fontSize: 22,
        fill: COL_GOLD,
        fontWeight: "bold",
        letterSpacing: 6,
      },
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(sw / 2, titleY + 55 + bounce);
    subtitle.alpha = 0.8;
    this.container.addChild(subtitle);

    // Ornamental line below title/subtitle
    const ornBottom = new Graphics();
    this._drawOrnamentalLine(ornBottom, sw / 2, titleY + 80 + bounce, 280, time);
    this.container.addChild(ornBottom);

    // ===== Menu area gradient band =====
    const menuBand = new Graphics();
    const menuAreaTop = 280;
    const menuAreaBottom = sh - 60;
    // Subtle gradient band behind menu items
    menuBand.rect(sw * 0.15, menuAreaTop, sw * 0.7, menuAreaBottom - menuAreaTop);
    menuBand.fill({ color: 0x0a0020, alpha: 0.4 });
    // Thin border lines on sides
    menuBand.moveTo(sw * 0.15, menuAreaTop);
    menuBand.lineTo(sw * 0.15, menuAreaBottom);
    menuBand.stroke({ color: COL_GOLD_DARK, width: 1, alpha: 0.12 });
    menuBand.moveTo(sw * 0.85, menuAreaTop);
    menuBand.lineTo(sw * 0.85, menuAreaBottom);
    menuBand.stroke({ color: COL_GOLD_DARK, width: 1, alpha: 0.12 });
    this.container.addChild(menuBand);

    // ===== Menu items =====
    const startY = 310;
    const gap = 50;
    const panelW = 340;
    const panelH = 42;

    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const y = startY + i * gap;
      const isSelected = i === this._selection;
      const item = MENU_ITEMS[i];

      const panel = new Graphics();
      const px = sw / 2 - panelW / 2;
      const py = y - panelH / 2;

      if (isSelected) {
        // ---- Selected item: glowing panel ----
        const pulse = Math.sin(time * 4) * 0.15 + 0.85;
        const slidePulse = (Math.sin(time * 3) + 1) / 2; // 0..1

        // Outer glow
        panel.roundRect(px - 6, py - 4, panelW + 12, panelH + 8, 6);
        panel.fill({ color: COL_ACCENT, alpha: 0.12 * pulse });

        // Panel background
        panel.roundRect(px, py, panelW, panelH, 4);
        panel.fill({ color: 0x1a0835, alpha: 0.85 });

        // Panel border
        panel.roundRect(px, py, panelW, panelH, 4);
        panel.stroke({ color: COL_GOLD, width: 2, alpha: 0.7 * pulse });

        // Accent bar on the left
        panel.roundRect(px + 2, py + 4, 4, panelH - 8, 2);
        panel.fill({ color: COL_ACCENT, alpha: 0.9 * pulse });

        // Accent bar on the right
        panel.roundRect(px + panelW - 6, py + 4, 4, panelH - 8, 2);
        panel.fill({ color: COL_ACCENT, alpha: 0.9 * pulse });

        // Sliding highlight sweep across panel
        const sweepX = px + slidePulse * panelW;
        panel.roundRect(sweepX - 30, py + 2, 60, panelH - 4, 3);
        panel.fill({ color: COL_GOLD_BRIGHT, alpha: 0.06 });

        // Bottom accent line
        panel.moveTo(px + 20, py + panelH - 1);
        panel.lineTo(px + panelW - 20, py + panelH - 1);
        panel.stroke({ color: COL_GOLD_BRIGHT, width: 1.5, alpha: 0.5 * pulse });

        this.container.addChild(panel);

        // Chevron indicators
        const bob = Math.sin(time * 5) * 4;

        const chevronL = new Text({
          text: "\u00BB",
          style: {
            fontFamily: 'Impact, "Arial Black", sans-serif',
            fontSize: 36,
            fill: COL_GOLD_BRIGHT,
            fontWeight: "bold",
          },
        });
        chevronL.anchor.set(0.5);
        chevronL.position.set(px - 20 + bob, y);
        chevronL.alpha = pulse;
        this.container.addChild(chevronL);

        const chevronR = new Text({
          text: "\u00AB",
          style: {
            fontFamily: 'Impact, "Arial Black", sans-serif',
            fontSize: 36,
            fill: COL_GOLD_BRIGHT,
            fontWeight: "bold",
          },
        });
        chevronR.anchor.set(0.5);
        chevronR.position.set(px + panelW + 20 - bob, y);
        chevronR.alpha = pulse;
        this.container.addChild(chevronR);

        // Selected text with glow
        const textGlow = new Text({
          text: item,
          style: {
            fontFamily: 'Impact, "Arial Black", sans-serif',
            fontSize: 38,
            fill: COL_GOLD,
            fontWeight: "bold",
            letterSpacing: 2,
          },
        });
        textGlow.anchor.set(0.5);
        textGlow.position.set(sw / 2, y);
        textGlow.alpha = 0.4 * pulse;
        this.container.addChild(textGlow);

        const text = new Text({
          text: item,
          style: {
            fontFamily: 'Impact, "Arial Black", sans-serif',
            fontSize: 36,
            fill: COL_TEXT_SELECTED,
            fontWeight: "bold",
            letterSpacing: 2,
            dropShadow: {
              color: COL_ACCENT,
              blur: 6,
              distance: 0,
              alpha: 0.5,
            },
          },
        });
        text.anchor.set(0.5);
        text.position.set(sw / 2, y);
        this.container.addChild(text);
      } else {
        // ---- Unselected item: subtle dark panel ----
        // Panel background
        panel.roundRect(px, py, panelW, panelH, 4);
        panel.fill({ color: COL_PANEL, alpha: 0.45 });

        // Panel border
        panel.roundRect(px, py, panelW, panelH, 4);
        panel.stroke({ color: COL_PANEL_BORDER, width: 1, alpha: 0.25 });

        this.container.addChild(panel);

        const text = new Text({
          text: item,
          style: {
            fontFamily: 'Impact, "Arial Black", sans-serif',
            fontSize: 30,
            fill: COL_TEXT_NORMAL,
            fontWeight: "bold",
            letterSpacing: 1,
          },
        });
        text.anchor.set(0.5);
        text.position.set(sw / 2, y);
        this.container.addChild(text);
      }
    }

    // ===== Footer hint with panel =====
    const footerPanel = new Graphics();
    const fpW = 480;
    const fpH = 30;
    const fpX = sw / 2 - fpW / 2;
    const fpY = sh - 50;
    footerPanel.roundRect(fpX, fpY, fpW, fpH, 4);
    footerPanel.fill({ color: 0x0a0018, alpha: 0.6 });
    footerPanel.roundRect(fpX, fpY, fpW, fpH, 4);
    footerPanel.stroke({ color: COL_PANEL_BORDER, width: 1, alpha: 0.2 });
    this.container.addChild(footerPanel);

    const footer = new Text({
      text: "[W/S or \u2191/\u2193] Navigate    [ENTER] Select    [ESC] Back",
      style: {
        fontFamily: '"Segoe UI", sans-serif',
        fontSize: 14,
        fill: 0x777777,
        letterSpacing: 1,
      },
    });
    footer.anchor.set(0.5);
    footer.position.set(sw / 2, fpY + fpH / 2);
    this.container.addChild(footer);
  }

  private _cleanup(): void {
    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }
    if (this._animRAF) {
      cancelAnimationFrame(this._animRAF);
      this._animRAF = 0;
    }
  }

  destroy(): void {
    this._cleanup();
    this.container.destroy({ children: true });
  }
}
