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

const BG_COLOR = 0x080816;
const PANEL_COLOR = 0x10102a;
const BORDER_COLOR = 0x5555cc;
const BORDER_GLOW = 0x6666dd;
const TITLE_COLOR = 0xffdd44;
const OPTION_COLOR = 0xddddf8;
const SELECTED_COLOR = 0xffcc00;
const SELECTED_BG = 0x222255;
const DIM_COLOR = 0x666688;
const SLOT_BG = 0x161630;
const SLOT_BORDER = 0x3333aa;
const SLOT_EMPTY_COLOR = 0x444466;
const DANGER_COLOR = 0xcc4444;
const ACCENT_GOLD = 0xdaa520;

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

  onNewGame: (() => void) | null = null;
  onLoadGame: ((slot: number) => void) | null = null;
  onOptions: (() => void) | null = null;

  init(vm: ViewManager): void {
    this.vm = vm;
    vm.addToLayer("ui", this.container);
    this._buildMainOptions();
    this._draw();
    this._setupInput();
  }

  destroy(): void {
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
        sprite.alpha = 0.25;
        // Insert behind everything else except the bg rect
        this.container.addChildAt(sprite, 1);
      }
    });

    // Decorative line above title
    const topLine = new Graphics();
    topLine.rect(W / 2 - 140, H * 0.13, 280, 1);
    topLine.fill({ color: ACCENT_GOLD, alpha: 0.4 });
    this.container.addChild(topLine);

    // Title
    const title = new Text({
      text: "MARVELOUS QUEST",
      style: {
        fontFamily: "monospace",
        fontSize: 38,
        fill: TITLE_COLOR,
        fontWeight: "bold",
        letterSpacing: 6,
        dropShadow: { color: 0x000000, blur: 8, distance: 4, angle: Math.PI / 4 },
      },
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, H * 0.15);
    this.container.addChild(title);

    const subtitle = new Text({
      text: "A Turn-Based RPG Adventure",
      style: { fontFamily: "monospace", fontSize: 13, fill: DIM_COLOR, letterSpacing: 2 },
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(W / 2, H * 0.15 + 50);
    this.container.addChild(subtitle);

    // Decorative line below subtitle
    const bottomLine = new Graphics();
    bottomLine.rect(W / 2 - 100, H * 0.15 + 70, 200, 1);
    bottomLine.fill({ color: ACCENT_GOLD, alpha: 0.3 });
    this.container.addChild(bottomLine);

    if (this._mode === "main") {
      this._drawMainMenu(W, H);
    } else if (this._mode === "load") {
      this._drawLoadMenu(W, H);
    } else if (this._mode === "delete_confirm") {
      this._drawDeleteConfirm(W, H);
    }

    // Footer
    const footerText = this._mode === "main"
      ? "Arrow Keys / Mouse: Navigate  |  Enter / Click: Select"
      : "Arrow Keys / Mouse: Navigate  |  Enter / Click: Select  |  Escape: Back  |  D: Delete Save";
    const footer = new Text({
      text: footerText,
      style: { fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR },
    });
    footer.anchor.set(0.5, 0);
    footer.position.set(W / 2, H - 30);
    this.container.addChild(footer);
  }

  private _drawMainMenu(W: number, H: number): void {
    const startY = H * 0.42;
    const spacing = 50;
    const btnW = 220;
    const btnH = 38;

    for (let i = 0; i < this._mainOptions.length; i++) {
      const opt = this._mainOptions[i];
      const selected = i === this._selectedIndex;
      const by = startY + i * spacing;

      // Button background
      const btnBg = new Graphics();
      btnBg.roundRect(W / 2 - btnW / 2, by - 4, btnW, btnH, 6);
      if (selected) {
        btnBg.fill({ color: SELECTED_BG, alpha: 0.9 });
        btnBg.stroke({ color: SELECTED_COLOR, width: 2 });
      } else if (opt.enabled) {
        btnBg.fill({ color: PANEL_COLOR, alpha: 0.7 });
        btnBg.stroke({ color: BORDER_COLOR, width: 1, alpha: 0.5 });
      } else {
        btnBg.fill({ color: 0x0a0a14, alpha: 0.5 });
      }
      this.container.addChild(btnBg);

      // Make clickable
      if (opt.enabled) {
        btnBg.eventMode = "static";
        btnBg.cursor = "pointer";
        const idx = i;
        btnBg.on("pointerover", () => {
          if (this._mode === "main") {
            this._selectedIndex = idx;
            this._draw();
          }
        });
        btnBg.on("pointertap", () => {
          if (this._mode === "main") {
            this._selectedIndex = idx;
            this._activateMainOption();
          }
        });
      }

      const text = new Text({
        text: opt.label,
        style: {
          fontFamily: "monospace",
          fontSize: 18,
          fill: !opt.enabled ? DIM_COLOR : selected ? SELECTED_COLOR : OPTION_COLOR,
          fontWeight: selected ? "bold" : "normal",
          letterSpacing: selected ? 2 : 0,
        },
      });
      text.anchor.set(0.5, 0.5);
      text.position.set(W / 2, by + btnH / 2 - 4);
      this.container.addChild(text);
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
    panel.stroke({ color: BORDER_GLOW, width: 2 });
    this.container.addChild(panel);

    const headerText = new Text({
      text: "Load Game",
      style: { fontFamily: "monospace", fontSize: 20, fill: TITLE_COLOR, fontWeight: "bold", letterSpacing: 2 },
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
      slotGfx.roundRect(panelX + 16, sy, panelW - 32, slotH, 6);
      slotGfx.fill({ color: selected ? 0x222244 : SLOT_BG });
      slotGfx.stroke({ color: selected ? SELECTED_COLOR : SLOT_BORDER, width: selected ? 2 : 1 });
      this.container.addChild(slotGfx);

      // Make slot clickable
      slotGfx.eventMode = "static";
      slotGfx.cursor = slot ? "pointer" : "default";
      const idx = i;
      slotGfx.on("pointerover", () => {
        if (this._mode === "load") {
          this._selectedIndex = idx;
          this._draw();
        }
      });
      slotGfx.on("pointertap", () => {
        if (this._mode === "load" && this._saveSlots[idx]) {
          this.onLoadGame?.(idx);
        }
      });

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

  private _activateMainOption(): void {
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
      this._activateMainOption();
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
