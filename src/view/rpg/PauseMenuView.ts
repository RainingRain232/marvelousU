// In-game pause menu — Save, Load, Options, Quit to Title
import { Container, Graphics, Text } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { RPGState } from "@rpg/state/RPGState";
import type { OverworldState } from "@rpg/state/OverworldState";
import { getSaveSlots, saveGame } from "@rpg/systems/SaveSystem";
import type { SaveSlotMeta } from "@rpg/systems/SaveSystem";

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const PANEL_COLOR = 0x12122a;
const BORDER_COLOR = 0x4444aa;
const TITLE_COLOR = 0xffdd44;
const OPTION_COLOR = 0xeeeeff;
const SELECTED_COLOR = 0xffcc00;
const DIM_COLOR = 0x666688;
const SUCCESS_COLOR = 0x44cc44;
const SLOT_BG = 0x181830;
const SLOT_BORDER = 0x3333aa;
const SLOT_EMPTY_COLOR = 0x444466;

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

type PauseMode = "menu" | "save" | "confirm_quit";

// ---------------------------------------------------------------------------
// PauseMenuView
// ---------------------------------------------------------------------------

export class PauseMenuView {
  private vm!: ViewManager;
  private container = new Container();
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;

  private _mode: PauseMode = "menu";
  private _selectedIndex = 0;
  private _saveSlots: (SaveSlotMeta | null)[] = [];
  private _saveMessage = "";
  private _saveMessageTimer: ReturnType<typeof setTimeout> | null = null;

  private _rpgState!: RPGState;
  private _overworldState!: OverworldState;

  onResume: (() => void) | null = null;
  onSave: ((slot: number) => void) | null = null;
  onOptions: (() => void) | null = null;
  onQuitToTitle: (() => void) | null = null;

  private _menuOptions = ["Resume", "Save Game", "Options", "Quit to Title"];

  init(vm: ViewManager, rpgState: RPGState, overworldState: OverworldState): void {
    this.vm = vm;
    this._rpgState = rpgState;
    this._overworldState = overworldState;
    vm.addToLayer("ui", this.container);
    this._draw();
    this._setupInput();
  }

  destroy(): void {
    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }
    if (this._saveMessageTimer) {
      clearTimeout(this._saveMessageTimer);
    }
    this.vm.removeFromLayer("ui", this.container);
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Draw
  // ---------------------------------------------------------------------------

  private _draw(): void {
    this.container.removeChildren();

    const W = this.vm.screenWidth;
    const H = this.vm.screenHeight;

    // Semi-transparent overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.65 });
    this.container.addChild(overlay);

    if (this._mode === "menu") {
      this._drawPauseMenu(W, H);
    } else if (this._mode === "save") {
      this._drawSaveMenu(W, H);
    } else if (this._mode === "confirm_quit") {
      this._drawConfirmQuit(W, H);
    }
  }

  private _drawPauseMenu(W: number, H: number): void {
    const panelW = Math.min(320, W - 40);
    const panelH = 260;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 8);
    panel.fill({ color: PANEL_COLOR, alpha: 0.96 });
    panel.stroke({ color: BORDER_COLOR, width: 2 });
    this.container.addChild(panel);

    const title = new Text({
      text: "PAUSED",
      style: { fontFamily: "monospace", fontSize: 22, fill: TITLE_COLOR, fontWeight: "bold" },
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, panelY + 18);
    this.container.addChild(title);

    const startY = panelY + 62;
    const spacing = 40;

    for (let i = 0; i < this._menuOptions.length; i++) {
      const selected = i === this._selectedIndex;
      const text = new Text({
        text: `${selected ? "> " : "  "}${this._menuOptions[i]}`,
        style: {
          fontFamily: "monospace",
          fontSize: 16,
          fill: selected ? SELECTED_COLOR : OPTION_COLOR,
          fontWeight: selected ? "bold" : "normal",
        },
      });
      text.anchor.set(0.5, 0);
      text.position.set(W / 2, startY + i * spacing);
      this.container.addChild(text);
    }

    const footer = new Text({
      text: "Escape: Resume  |  Enter: Select",
      style: { fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR },
    });
    footer.anchor.set(0.5, 0);
    footer.position.set(W / 2, panelY + panelH - 28);
    this.container.addChild(footer);
  }

  private _drawSaveMenu(W: number, H: number): void {
    this._saveSlots = getSaveSlots();

    const panelW = Math.min(440, W - 40);
    const panelH = 300;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 8);
    panel.fill({ color: PANEL_COLOR, alpha: 0.96 });
    panel.stroke({ color: BORDER_COLOR, width: 2 });
    this.container.addChild(panel);

    const headerText = new Text({
      text: "Save Game",
      style: { fontFamily: "monospace", fontSize: 20, fill: TITLE_COLOR, fontWeight: "bold" },
    });
    headerText.anchor.set(0.5, 0);
    headerText.position.set(W / 2, panelY + 16);
    this.container.addChild(headerText);

    const slotH = 60;
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
            fontFamily: "monospace", fontSize: 13,
            fill: selected ? SELECTED_COLOR : OPTION_COLOR,
            fontWeight: selected ? "bold" : "normal",
          },
        });
        nameText.position.set(panelX + 28, sy + 12);
        this.container.addChild(nameText);

        const dateText = new Text({
          text: dateStr,
          style: { fontFamily: "monospace", fontSize: 11, fill: DIM_COLOR },
        });
        dateText.position.set(panelX + 28, sy + 34);
        this.container.addChild(dateText);
      } else {
        const emptyText = new Text({
          text: `Slot ${i + 1}  —  Empty`,
          style: { fontFamily: "monospace", fontSize: 13, fill: SLOT_EMPTY_COLOR },
        });
        emptyText.position.set(panelX + 28, sy + 20);
        this.container.addChild(emptyText);
      }
    }

    // Save message
    if (this._saveMessage) {
      const msgText = new Text({
        text: this._saveMessage,
        style: { fontFamily: "monospace", fontSize: 13, fill: SUCCESS_COLOR, fontWeight: "bold" },
      });
      msgText.anchor.set(0.5, 0);
      msgText.position.set(W / 2, panelY + panelH - 50);
      this.container.addChild(msgText);
    }

    const footer = new Text({
      text: "Enter: Save  |  Escape: Back",
      style: { fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR },
    });
    footer.anchor.set(0.5, 0);
    footer.position.set(W / 2, panelY + panelH - 28);
    this.container.addChild(footer);
  }

  private _drawConfirmQuit(W: number, H: number): void {
    const panelW = 320;
    const panelH = 130;
    const cx = (W - panelW) / 2;
    const cy = (H - panelH) / 2;

    const panel = new Graphics();
    panel.roundRect(cx, cy, panelW, panelH, 8);
    panel.fill({ color: PANEL_COLOR, alpha: 0.98 });
    panel.stroke({ color: 0xcc6644, width: 2 });
    this.container.addChild(panel);

    const msg = new Text({
      text: "Quit to title?\nUnsaved progress will be lost.",
      style: { fontFamily: "monospace", fontSize: 13, fill: OPTION_COLOR, align: "center", lineHeight: 20 },
    });
    msg.anchor.set(0.5, 0);
    msg.position.set(W / 2, cy + 18);
    this.container.addChild(msg);

    const yesNo = new Text({
      text: `${this._selectedIndex === 0 ? "> " : "  "}Yes    ${this._selectedIndex === 1 ? "> " : "  "}No`,
      style: { fontFamily: "monospace", fontSize: 15, fill: OPTION_COLOR, fontWeight: "bold" },
    });
    yesNo.anchor.set(0.5, 0);
    yesNo.position.set(W / 2, cy + 82);
    this.container.addChild(yesNo);
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (this._mode === "menu") this._handleMenuInput(e);
      else if (this._mode === "save") this._handleSaveInput(e);
      else if (this._mode === "confirm_quit") this._handleConfirmQuitInput(e);
    };
    window.addEventListener("keydown", this._onKeyDown, true);
  }

  private _handleMenuInput(e: KeyboardEvent): void {
    if (e.code === "ArrowUp") {
      this._selectedIndex = (this._selectedIndex - 1 + this._menuOptions.length) % this._menuOptions.length;
      this._draw();
    } else if (e.code === "ArrowDown") {
      this._selectedIndex = (this._selectedIndex + 1) % this._menuOptions.length;
      this._draw();
    } else if (e.code === "Enter" || e.code === "Space") {
      switch (this._selectedIndex) {
        case 0: this.onResume?.(); break;
        case 1:
          this._mode = "save";
          this._selectedIndex = 0;
          this._saveMessage = "";
          this._draw();
          break;
        case 2: this.onOptions?.(); break;
        case 3:
          this._mode = "confirm_quit";
          this._selectedIndex = 1; // Default to No
          this._draw();
          break;
      }
    } else if (e.code === "Escape") {
      this.onResume?.();
    }
  }

  private _handleSaveInput(e: KeyboardEvent): void {
    if (e.code === "ArrowUp") {
      this._selectedIndex = (this._selectedIndex - 1 + 3) % 3;
      this._draw();
    } else if (e.code === "ArrowDown") {
      this._selectedIndex = (this._selectedIndex + 1) % 3;
      this._draw();
    } else if (e.code === "Enter" || e.code === "Space") {
      const ok = saveGame(this._selectedIndex, this._rpgState, this._overworldState);
      this._saveMessage = ok ? `Saved to Slot ${this._selectedIndex + 1}!` : "Save failed!";
      if (this._saveMessageTimer) clearTimeout(this._saveMessageTimer);
      this._saveMessageTimer = setTimeout(() => { this._saveMessage = ""; this._draw(); }, 2000);
      this._draw();
    } else if (e.code === "Escape") {
      this._mode = "menu";
      this._selectedIndex = 1;
      this._draw();
    }
  }

  private _handleConfirmQuitInput(e: KeyboardEvent): void {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      this._selectedIndex = this._selectedIndex === 0 ? 1 : 0;
      this._draw();
    } else if (e.code === "Enter" || e.code === "Space") {
      if (this._selectedIndex === 0) {
        this.onQuitToTitle?.();
      } else {
        this._mode = "menu";
        this._selectedIndex = 3;
        this._draw();
      }
    } else if (e.code === "Escape") {
      this._mode = "menu";
      this._selectedIndex = 3;
      this._draw();
    }
  }
}
