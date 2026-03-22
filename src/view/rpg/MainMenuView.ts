// Main Menu screen — New Game, Continue, Options
import { Container, Graphics, Text, Sprite, Assets, Texture } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { getSaveSlots, hasSaveData, deleteSave } from "@rpg/systems/SaveSystem";
import type { SaveSlotMeta } from "@rpg/systems/SaveSystem";

// Pixel art background image
import swordInStoneUrl from "@/img/sword.png";

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const BG_COLOR = 0x0a0a18;
const PANEL_COLOR = 0x12122a;
const BORDER_COLOR = 0x4444aa;
const TITLE_COLOR = 0xffd700;
const OPTION_COLOR = 0xeeeeff;
const SELECTED_COLOR = 0xffd700;
const DIM_COLOR = 0x666688;
const SLOT_BG = 0x181830;
const SLOT_BORDER = 0x3333aa;
const SLOT_EMPTY_COLOR = 0x444466;
const DANGER_COLOR = 0xcc4444;
const GOLD_DIM = 0x997700;
const EMBER_COLORS = [0xff6600, 0xff8800, 0xffaa00, 0xffcc44, 0xff4400];

// ---------------------------------------------------------------------------
// Particle
// ---------------------------------------------------------------------------

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
}

// ---------------------------------------------------------------------------
// Menu modes
// ---------------------------------------------------------------------------

type MenuMode = "main" | "load" | "delete_confirm";

// ---------------------------------------------------------------------------
// MainMenuView
// ---------------------------------------------------------------------------

export class MainMenuView {
  private vm!: ViewManager;
  private container = new Container();
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;

  private _mode: MenuMode = "main";
  private _selectedIndex = 0;
  private _mainOptions: { label: string; action: string; enabled: boolean }[] = [];
  private _saveSlots: (SaveSlotMeta | null)[] = [];
  private _deleteSlot = -1;

  // Animation state
  private _particles: Particle[] = [];
  private _particleGfx = new Graphics();
  private _titleGlow = 0;
  private _titleGlowDir = 1;
  private _animFrame = 0;
  private _optionScales: number[] = [];
  private _elapsed = 0;

  onNewGame: (() => void) | null = null;
  onLoadGame: ((slot: number) => void) | null = null;
  onOptions: (() => void) | null = null;

  init(vm: ViewManager): void {
    this.vm = vm;
    vm.addToLayer("ui", this.container);
    this._buildMainOptions();
    this._optionScales = this._mainOptions.map(() => 1);
    this._draw();
    this._setupInput();
    this._startAnimationLoop();
  }

  destroy(): void {
    this._animFrame = 0;
    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }
    this.vm.removeFromLayer("ui", this.container);
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Main options
  // ---------------------------------------------------------------------------

  private _buildMainOptions(): void {
    const hasSaves = hasSaveData();
    this._saveSlots = getSaveSlots();

    this._mainOptions = [
      { label: "New Game", action: "new_game", enabled: true },
      { label: "Continue", action: "continue", enabled: hasSaves },
      { label: "Options", action: "options", enabled: true },
    ];

    // Start selection on first enabled
    this._selectedIndex = 0;
  }

  // ---------------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------------

  private _startAnimationLoop(): void {
    const loop = () => {
      if (!this._animFrame) return;
      this._elapsed += 0.016;

      // Update title glow
      this._titleGlow += 0.012 * this._titleGlowDir;
      if (this._titleGlow >= 1) { this._titleGlow = 1; this._titleGlowDir = -1; }
      if (this._titleGlow <= 0) { this._titleGlow = 0; this._titleGlowDir = 1; }

      // Smooth option scale animation
      for (let i = 0; i < this._mainOptions.length; i++) {
        const target = i === this._selectedIndex ? 1.12 : 1;
        this._optionScales[i] += (target - this._optionScales[i]) * 0.12;
      }

      // Spawn particles
      const W = this.vm.screenWidth;
      const H = this.vm.screenHeight;
      if (this._particles.length < 60 && Math.random() < 0.3) {
        this._particles.push({
          x: Math.random() * W,
          y: H + 5,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -(0.4 + Math.random() * 1.2),
          life: 0,
          maxLife: 120 + Math.random() * 180,
          size: 1 + Math.random() * 2.5,
          color: EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
        });
      }

      // Update particles
      for (let i = this._particles.length - 1; i >= 0; i--) {
        const p = this._particles[i];
        p.x += p.vx + Math.sin(p.life * 0.03) * 0.3;
        p.y += p.vy;
        p.life++;
        if (p.life > p.maxLife || p.y < -10) {
          this._particles.splice(i, 1);
        }
      }

      // Redraw particles
      this._particleGfx.clear();
      for (const p of this._particles) {
        const alpha = Math.min(1, (1 - p.life / p.maxLife) * 1.5);
        this._particleGfx.circle(p.x, p.y, p.size);
        this._particleGfx.fill({ color: p.color, alpha: alpha * 0.7 });
      }

      // Update title text glow alpha
      const titleGlowObj = this.container.getChildByLabel?.("titleGlow");
      if (titleGlowObj) {
        (titleGlowObj as Graphics).alpha = 0.15 + this._titleGlow * 0.25;
      }

      // Update option scales
      for (let i = 0; i < this._mainOptions.length; i++) {
        const optObj = this.container.getChildByLabel?.(`opt_${i}`);
        if (optObj) {
          optObj.scale.set(this._optionScales[i]);
        }
      }

      this._animFrame = requestAnimationFrame(loop);
    };
    this._animFrame = requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------------------
  // Draw
  // ---------------------------------------------------------------------------

  private _draw(): void {
    this.container.removeChildren();

    const W = this.vm.screenWidth;
    const H = this.vm.screenHeight;

    // Full-screen background
    const bg = new Graphics();
    bg.rect(0, 0, W, H);
    bg.fill({ color: BG_COLOR });
    this.container.addChild(bg);

    // Background art — sword in the stone
    void Assets.load(swordInStoneUrl).then((tex: Texture) => {
      if (!this.container.destroyed) {
        const sprite = new Sprite(tex);
        sprite.eventMode = "none";
        const scale = Math.max(W / tex.width, H / tex.height);
        sprite.scale.set(scale);
        sprite.position.set((W - tex.width * scale) / 2, (H - tex.height * scale) / 2);
        sprite.alpha = 0.18;
        // Insert behind everything else except the bg rect
        this.container.addChildAt(sprite, 1);
      }
    });

    // Vignette overlay for depth
    const vignette = new Graphics();
    // Dark edges using concentric rects with increasing alpha
    for (let i = 0; i < 12; i++) {
      const inset = i * -2;
      const alpha = i * 0.025;
      vignette.rect(inset, inset, W - inset * 2, H - inset * 2);
      vignette.stroke({ color: 0x000000, width: Math.max(W, H) * 0.04, alpha });
    }
    // Radial-style vignette via corner darkening
    const cornerSize = Math.max(W, H) * 0.55;
    for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]] as [number, number][]) {
      vignette.circle(cx, cy, cornerSize);
      vignette.fill({ color: 0x000000, alpha: 0 });
    }
    // Top and bottom gradient bands
    vignette.rect(0, 0, W, H * 0.12);
    vignette.fill({ color: 0x000000, alpha: 0.35 });
    vignette.rect(0, H * 0.88, W, H * 0.12);
    vignette.fill({ color: 0x000000, alpha: 0.35 });
    this.container.addChild(vignette);

    // Particle layer
    this._particleGfx = new Graphics();
    this.container.addChild(this._particleGfx);

    // Ornamental corner decorations
    this._drawCornerOrnaments(W, H);

    // Title glow background
    const titleGlow = new Graphics();
    titleGlow.label = "titleGlow";
    const glowCx = W / 2;
    const glowCy = H * 0.15 + 16;
    titleGlow.ellipse(glowCx, glowCy, 200, 40);
    titleGlow.fill({ color: TITLE_COLOR, alpha: 0.2 });
    titleGlow.ellipse(glowCx, glowCy, 300, 60);
    titleGlow.fill({ color: TITLE_COLOR, alpha: 0.08 });
    this.container.addChild(titleGlow);

    // Title
    const title = new Text({
      text: "MARVELOUS QUEST",
      style: {
        fontFamily: "monospace",
        fontSize: 38,
        fill: TITLE_COLOR,
        fontWeight: "bold",
        letterSpacing: 6,
        dropShadow: { color: 0x000000, blur: 10, distance: 4, angle: Math.PI / 4 },
      },
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, H * 0.13);
    this.container.addChild(title);

    const subtitle = new Text({
      text: "A Turn-Based RPG Adventure",
      style: {
        fontFamily: "monospace",
        fontSize: 13,
        fill: DIM_COLOR,
        letterSpacing: 2,
      },
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(W / 2, H * 0.13 + 52);
    this.container.addChild(subtitle);

    // Gold divider line between title and menu
    this._drawDivider(W, H * 0.13 + 80);

    if (this._mode === "main") {
      this._drawMainMenu(W, H);
    } else if (this._mode === "load") {
      this._drawLoadMenu(W, H);
    } else if (this._mode === "delete_confirm") {
      this._drawDeleteConfirm(W, H);
    }

    // Footer
    const footerText = this._mode === "main"
      ? "Arrow Keys: Navigate  |  Enter: Select"
      : "Arrow Keys: Navigate  |  Enter: Select  |  Escape: Back  |  D: Delete Save";
    const footer = new Text({
      text: footerText,
      style: { fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR, letterSpacing: 1 },
    });
    footer.anchor.set(0.5, 0);
    footer.position.set(W / 2, H - 32);
    this.container.addChild(footer);

    // Version text
    const version = new Text({
      text: "v0.1",
      style: { fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR },
    });
    version.anchor.set(1, 1);
    version.position.set(W - 12, H - 8);
    this.container.addChild(version);
  }

  // ---------------------------------------------------------------------------
  // Decorative elements
  // ---------------------------------------------------------------------------

  private _drawDivider(W: number, y: number): void {
    const divider = new Graphics();
    const cx = W / 2;
    const halfLen = 140;

    // Center diamond
    divider.moveTo(cx - 6, y);
    divider.lineTo(cx, y - 5);
    divider.lineTo(cx + 6, y);
    divider.lineTo(cx, y + 5);
    divider.closePath();
    divider.fill({ color: TITLE_COLOR, alpha: 0.8 });

    // Lines extending from center
    divider.moveTo(cx - 14, y);
    divider.lineTo(cx - halfLen, y);
    divider.stroke({ color: TITLE_COLOR, width: 1.5, alpha: 0.5 });

    divider.moveTo(cx + 14, y);
    divider.lineTo(cx + halfLen, y);
    divider.stroke({ color: TITLE_COLOR, width: 1.5, alpha: 0.5 });

    // End dots
    divider.circle(cx - halfLen, y, 2);
    divider.fill({ color: TITLE_COLOR, alpha: 0.4 });
    divider.circle(cx + halfLen, y, 2);
    divider.fill({ color: TITLE_COLOR, alpha: 0.4 });

    this.container.addChild(divider);
  }

  private _drawCornerOrnaments(W: number, H: number): void {
    const orn = new Graphics();
    const len = 40;
    const offset = 14;
    const alpha = 0.3;

    // Top-left
    orn.moveTo(offset, offset + len);
    orn.lineTo(offset, offset);
    orn.lineTo(offset + len, offset);
    orn.stroke({ color: GOLD_DIM, width: 1.5, alpha });

    // Top-right
    orn.moveTo(W - offset - len, offset);
    orn.lineTo(W - offset, offset);
    orn.lineTo(W - offset, offset + len);
    orn.stroke({ color: GOLD_DIM, width: 1.5, alpha });

    // Bottom-left
    orn.moveTo(offset, H - offset - len);
    orn.lineTo(offset, H - offset);
    orn.lineTo(offset + len, H - offset);
    orn.stroke({ color: GOLD_DIM, width: 1.5, alpha });

    // Bottom-right
    orn.moveTo(W - offset - len, H - offset);
    orn.lineTo(W - offset, H - offset);
    orn.lineTo(W - offset, H - offset - len);
    orn.stroke({ color: GOLD_DIM, width: 1.5, alpha });

    // Small dots at corners
    for (const [cx, cy] of [[offset, offset], [W - offset, offset], [offset, H - offset], [W - offset, H - offset]]) {
      orn.circle(cx, cy, 2);
      orn.fill({ color: GOLD_DIM, alpha: alpha * 0.8 });
    }

    this.container.addChild(orn);
  }

  // ---------------------------------------------------------------------------
  // Main menu drawing
  // ---------------------------------------------------------------------------

  private _drawMainMenu(W: number, H: number): void {
    const startY = H * 0.40;
    const spacing = 52;

    for (let i = 0; i < this._mainOptions.length; i++) {
      const opt = this._mainOptions[i];
      const selected = i === this._selectedIndex;

      // Selection background glow
      if (selected) {
        const selBg = new Graphics();
        selBg.roundRect(W / 2 - 120, startY + i * spacing - 6, 240, 34, 4);
        selBg.fill({ color: TITLE_COLOR, alpha: 0.08 });
        selBg.stroke({ color: TITLE_COLOR, width: 1, alpha: 0.2 });
        this.container.addChild(selBg);
      }

      const optContainer = new Container();
      optContainer.label = `opt_${i}`;
      optContainer.pivot.set(W / 2, startY + i * spacing + 10);
      optContainer.position.set(W / 2, startY + i * spacing + 10);

      // Arrow indicator
      if (selected) {
        const arrow = new Text({
          text: "\u25B6",
          style: {
            fontFamily: "monospace",
            fontSize: 12,
            fill: SELECTED_COLOR,
          },
        });
        arrow.anchor.set(1, 0.5);
        arrow.position.set(W / 2 - 60, startY + i * spacing + 10);
        optContainer.addChild(arrow);
      }

      const text = new Text({
        text: opt.label,
        style: {
          fontFamily: "monospace",
          fontSize: 19,
          fill: !opt.enabled ? DIM_COLOR : selected ? SELECTED_COLOR : OPTION_COLOR,
          fontWeight: selected ? "bold" : "normal",
          letterSpacing: selected ? 3 : 1,
          dropShadow: selected
            ? { color: TITLE_COLOR, blur: 8, distance: 0, angle: 0, alpha: 0.4 }
            : undefined,
        },
      });
      text.anchor.set(0.5, 0.5);
      text.position.set(W / 2, startY + i * spacing + 10);
      optContainer.addChild(text);

      this.container.addChild(optContainer);
    }
  }

  private _drawLoadMenu(W: number, H: number): void {
    const panelW = Math.min(440, W - 40);
    const panelH = 300;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2 + 20;

    // Panel
    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 8);
    panel.fill({ color: PANEL_COLOR, alpha: 0.95 });
    panel.stroke({ color: BORDER_COLOR, width: 2 });
    this.container.addChild(panel);

    const headerText = new Text({
      text: "Load Game",
      style: { fontFamily: "monospace", fontSize: 20, fill: TITLE_COLOR, fontWeight: "bold" },
    });
    headerText.anchor.set(0.5, 0);
    headerText.position.set(W / 2, panelY + 16);
    this.container.addChild(headerText);

    const slotH = 68;
    const slotGap = 10;
    const startY = panelY + 52;

    for (let i = 0; i < this._saveSlots.length; i++) {
      const slot = this._saveSlots[i];
      const selected = i === this._selectedIndex;
      const sy = startY + i * (slotH + slotGap);

      const slotGfx = new Graphics();
      slotGfx.roundRect(panelX + 16, sy, panelW - 32, slotH, 4);
      slotGfx.fill({ color: selected ? 0x222244 : SLOT_BG });
      slotGfx.stroke({ color: selected ? SELECTED_COLOR : SLOT_BORDER, width: selected ? 2 : 1 });
      this.container.addChild(slotGfx);

      if (slot) {
        const date = new Date(slot.timestamp);
        const dateStr = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const nameText = new Text({
          text: `Slot ${i + 1}  —  Lv.${slot.partyLevel}  |  ${slot.gold}g  |  ${slot.location}`,
          style: {
            fontFamily: "monospace",
            fontSize: 13,
            fill: selected ? SELECTED_COLOR : OPTION_COLOR,
            fontWeight: selected ? "bold" : "normal",
          },
        });
        nameText.position.set(panelX + 28, sy + 14);
        this.container.addChild(nameText);

        const dateText = new Text({
          text: dateStr,
          style: { fontFamily: "monospace", fontSize: 11, fill: DIM_COLOR },
        });
        dateText.position.set(panelX + 28, sy + 38);
        this.container.addChild(dateText);
      } else {
        const emptyText = new Text({
          text: `Slot ${i + 1}  —  Empty`,
          style: { fontFamily: "monospace", fontSize: 13, fill: SLOT_EMPTY_COLOR },
        });
        emptyText.position.set(panelX + 28, sy + 24);
        this.container.addChild(emptyText);
      }
    }
  }

  private _drawDeleteConfirm(W: number, H: number): void {
    // Draw load menu behind
    this._drawLoadMenu(W, H);

    // Overlay confirmation
    const confirmW = 320;
    const confirmH = 120;
    const cx = (W - confirmW) / 2;
    const cy = (H - confirmH) / 2;

    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.5 });
    this.container.addChild(overlay);

    const confirmPanel = new Graphics();
    confirmPanel.roundRect(cx, cy, confirmW, confirmH, 8);
    confirmPanel.fill({ color: PANEL_COLOR, alpha: 0.98 });
    confirmPanel.stroke({ color: DANGER_COLOR, width: 2 });
    this.container.addChild(confirmPanel);

    const confirmText = new Text({
      text: `Delete Slot ${this._deleteSlot + 1}?`,
      style: { fontFamily: "monospace", fontSize: 16, fill: DANGER_COLOR, fontWeight: "bold" },
    });
    confirmText.anchor.set(0.5, 0);
    confirmText.position.set(W / 2, cy + 20);
    this.container.addChild(confirmText);

    const yesNo = new Text({
      text: `${this._selectedIndex === 0 ? "> " : "  "}Yes, delete    ${this._selectedIndex === 1 ? "> " : "  "}No, cancel`,
      style: { fontFamily: "monospace", fontSize: 14, fill: OPTION_COLOR },
    });
    yesNo.anchor.set(0.5, 0);
    yesNo.position.set(W / 2, cy + 70);
    this.container.addChild(yesNo);
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      if (this._mode === "main") {
        this._handleMainInput(e);
      } else if (this._mode === "load") {
        this._handleLoadInput(e);
      } else if (this._mode === "delete_confirm") {
        this._handleDeleteConfirmInput(e);
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }

  private _handleMainInput(e: KeyboardEvent): void {
    if (e.code === "ArrowUp") {
      do {
        this._selectedIndex = (this._selectedIndex - 1 + this._mainOptions.length) % this._mainOptions.length;
      } while (!this._mainOptions[this._selectedIndex].enabled);
      this._draw();
    } else if (e.code === "ArrowDown") {
      do {
        this._selectedIndex = (this._selectedIndex + 1) % this._mainOptions.length;
      } while (!this._mainOptions[this._selectedIndex].enabled);
      this._draw();
    } else if (e.code === "Enter" || e.code === "Space") {
      const opt = this._mainOptions[this._selectedIndex];
      if (!opt.enabled) return;

      switch (opt.action) {
        case "new_game":
          this.onNewGame?.();
          break;
        case "continue":
          this._mode = "load";
          this._selectedIndex = 0;
          this._saveSlots = getSaveSlots();
          this._draw();
          break;
        case "options":
          this.onOptions?.();
          break;
      }
    }
  }

  private _handleLoadInput(e: KeyboardEvent): void {
    if (e.code === "ArrowUp") {
      this._selectedIndex = (this._selectedIndex - 1 + this._saveSlots.length) % this._saveSlots.length;
      this._draw();
    } else if (e.code === "ArrowDown") {
      this._selectedIndex = (this._selectedIndex + 1) % this._saveSlots.length;
      this._draw();
    } else if (e.code === "Enter" || e.code === "Space") {
      const slot = this._saveSlots[this._selectedIndex];
      if (slot) {
        this.onLoadGame?.(this._selectedIndex);
      }
    } else if (e.code === "Escape") {
      this._mode = "main";
      this._selectedIndex = 1; // Back to "Continue"
      this._buildMainOptions();
      this._draw();
    } else if (e.code === "KeyD") {
      const slot = this._saveSlots[this._selectedIndex];
      if (slot) {
        this._deleteSlot = this._selectedIndex;
        this._mode = "delete_confirm";
        this._selectedIndex = 1; // Default to "No"
        this._draw();
      }
    }
  }

  private _handleDeleteConfirmInput(e: KeyboardEvent): void {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      this._selectedIndex = this._selectedIndex === 0 ? 1 : 0;
      this._draw();
    } else if (e.code === "Enter" || e.code === "Space") {
      if (this._selectedIndex === 0) {
        // Yes, delete
        deleteSave(this._deleteSlot);
        this._saveSlots = getSaveSlots();
      }
      // Return to load menu
      this._mode = "load";
      this._selectedIndex = 0;
      this._draw();
    } else if (e.code === "Escape") {
      this._mode = "load";
      this._selectedIndex = this._deleteSlot;
      this._draw();
    }
  }
}
