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

type PauseMode = "menu" | "save" | "inventory" | "formation" | "help" | "confirm_quit";

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

  /** Set to true while a child overlay (e.g. OptionsView) is open. */
  inputSuspended = false;

  private _menuOptions = ["Resume", "Inventory", "Save Game", "Formation", "Help", "Options", "Quit to Title"];
  /** Sub-index for inventory: which party member is selected */
  private _invMemberIndex = 0;

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
      window.removeEventListener("keydown", this._onKeyDown, true);
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
    } else if (this._mode === "inventory") {
      this._drawInventory(W, H);
    } else if (this._mode === "formation") {
      this._drawFormation(W, H);
    } else if (this._mode === "help") {
      this._drawHelp(W, H);
    } else if (this._mode === "confirm_quit") {
      this._drawConfirmQuit(W, H);
    }
  }

  private _drawPauseMenu(W: number, H: number): void {
    const panelW = Math.min(320, W - 40);
    const panelH = 380;
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
    const panelH = Math.min(52 + this._saveSlots.length * 70 + 60, H - 40);
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

  private _drawInventory(W: number, H: number): void {
    const party = this._rpgState.party;
    const inv = this._rpgState.inventory.items;

    const panelW = Math.min(520, W - 40);
    const panelH = Math.min(500, H - 40);
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 8);
    panel.fill({ color: PANEL_COLOR, alpha: 0.96 });
    panel.stroke({ color: BORDER_COLOR, width: 2 });
    this.container.addChild(panel);

    const headerText = new Text({
      text: "Inventory",
      style: { fontFamily: "monospace", fontSize: 20, fill: TITLE_COLOR, fontWeight: "bold" },
    });
    headerText.anchor.set(0.5, 0);
    headerText.position.set(W / 2, panelY + 16);
    this.container.addChild(headerText);

    // Gold display
    const goldText = new Text({
      text: `Gold: ${this._rpgState.gold}`,
      style: { fontFamily: "monospace", fontSize: 12, fill: 0xffdd44 },
    });
    goldText.position.set(panelX + 20, panelY + 42);
    this.container.addChild(goldText);

    // Left side: party member list with equipment summary
    const leftW = Math.floor(panelW * 0.45);
    const rightX = panelX + leftW + 10;
    const rightW = panelW - leftW - 30;
    let y = panelY + 62;

    const partyHeader = new Text({
      text: "Party Equipment",
      style: { fontFamily: "monospace", fontSize: 12, fill: DIM_COLOR },
    });
    partyHeader.position.set(panelX + 20, y);
    this.container.addChild(partyHeader);
    y += 18;

    const slotKeys: (keyof import("@rpg/state/RPGState").EquipmentSlots)[] = [
      "weapon", "armor", "helmet", "shield", "legs", "boots", "ring", "accessory",
    ];

    for (let i = 0; i < party.length; i++) {
      const member = party[i];
      const selected = i === this._invMemberIndex;
      const memberY = y + i * 46;

      if (selected) {
        const hl = new Graphics();
        hl.roundRect(panelX + 14, memberY - 2, leftW - 8, 42, 3);
        hl.fill({ color: 0x222244, alpha: 0.7 });
        this.container.addChild(hl);
      }

      const nameText = new Text({
        text: `${selected ? "> " : "  "}${member.name} Lv.${member.level}`,
        style: {
          fontFamily: "monospace", fontSize: 12,
          fill: selected ? SELECTED_COLOR : OPTION_COLOR,
          fontWeight: selected ? "bold" : "normal",
        },
      });
      nameText.position.set(panelX + 20, memberY);
      this.container.addChild(nameText);

      // Compact equipment count
      const equipped = slotKeys.filter(s => member.equipment[s] !== null).length;
      const eqText = new Text({
        text: `  ${equipped}/${slotKeys.length} slots`,
        style: { fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR },
      });
      eqText.position.set(panelX + 20, memberY + 16);
      this.container.addChild(eqText);
    }

    // Right side: selected member's equipment details
    if (party.length > 0) {
      const member = party[this._invMemberIndex];
      const detailHeader = new Text({
        text: `${member.name}'s Equipment`,
        style: { fontFamily: "monospace", fontSize: 12, fill: 0x88bbff, fontWeight: "bold" },
      });
      detailHeader.position.set(rightX, panelY + 62);
      this.container.addChild(detailHeader);

      // Divider line
      const div = new Graphics();
      div.rect(rightX, panelY + 78, rightW, 1);
      div.fill({ color: BORDER_COLOR, alpha: 0.5 });
      this.container.addChild(div);

      const slotLabels: Record<string, string> = {
        weapon: "Wpn", armor: "Arm", helmet: "Hlm", shield: "Shd",
        legs: "Leg", boots: "Bts", ring: "Rng", accessory: "Acc",
      };

      let sy = panelY + 84;
      for (const slot of slotKeys) {
        const item = member.equipment[slot];
        const label = slotLabels[slot] ?? slot;
        const itemName = item ? item.name : "(empty)";
        const fill = item ? OPTION_COLOR : SLOT_EMPTY_COLOR;

        const slotText = new Text({
          text: `${label}: ${itemName}`,
          style: { fontFamily: "monospace", fontSize: 11, fill },
        });
        slotText.position.set(rightX, sy);
        this.container.addChild(slotText);
        sy += 18;
      }

      // Stats summary
      sy += 6;
      const statsDiv = new Graphics();
      statsDiv.rect(rightX, sy, rightW, 1);
      statsDiv.fill({ color: BORDER_COLOR, alpha: 0.5 });
      this.container.addChild(statsDiv);
      sy += 6;

      const statsText = new Text({
        text: `HP:${member.hp}/${member.maxHp}  MP:${member.mp}/${member.maxMp}\nATK:${member.atk}  DEF:${member.def}  SPD:${member.speed}`,
        style: { fontFamily: "monospace", fontSize: 11, fill: OPTION_COLOR, lineHeight: 16 },
      });
      statsText.position.set(rightX, sy);
      this.container.addChild(statsText);
    }

    // Bottom: consumable items
    const itemsY = panelY + panelH - 100;
    const itemDiv = new Graphics();
    itemDiv.rect(panelX + 16, itemsY - 6, panelW - 32, 1);
    itemDiv.fill({ color: BORDER_COLOR, alpha: 0.5 });
    this.container.addChild(itemDiv);

    const itemsHeader = new Text({
      text: `Items (${inv.length}/${this._rpgState.inventory.maxSlots})`,
      style: { fontFamily: "monospace", fontSize: 12, fill: DIM_COLOR },
    });
    itemsHeader.position.set(panelX + 20, itemsY);
    this.container.addChild(itemsHeader);

    if (inv.length === 0) {
      const emptyText = new Text({
        text: "No items",
        style: { fontFamily: "monospace", fontSize: 11, fill: SLOT_EMPTY_COLOR },
      });
      emptyText.position.set(panelX + 20, itemsY + 18);
      this.container.addChild(emptyText);
    } else {
      // Show up to 4 items in a row
      const maxShow = Math.min(inv.length, 8);
      let ix = panelX + 20;
      let iy = itemsY + 18;
      for (let i = 0; i < maxShow; i++) {
        const { item, quantity } = inv[i];
        const txt = new Text({
          text: `${item.name}${quantity > 1 ? ` x${quantity}` : ""}`,
          style: { fontFamily: "monospace", fontSize: 10, fill: OPTION_COLOR },
        });
        txt.position.set(ix, iy);
        this.container.addChild(txt);
        if (i === 3) { ix = panelX + 20; iy += 16; }
        else ix += 120;
      }
      if (inv.length > maxShow) {
        const more = new Text({
          text: `... +${inv.length - maxShow} more`,
          style: { fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR },
        });
        more.position.set(panelX + 20, iy + 16);
        this.container.addChild(more);
      }
    }

    const footer = new Text({
      text: "Up/Down: Select member  |  Escape: Back",
      style: { fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR },
    });
    footer.anchor.set(0.5, 0);
    footer.position.set(W / 2, panelY + panelH - 28);
    this.container.addChild(footer);
  }

  private _drawFormation(W: number, H: number): void {
    const party = this._rpgState.party;
    const panelW = Math.min(440, W - 40);
    const panelH = Math.max(200, party.length * 36 + 100);
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 8);
    panel.fill({ color: PANEL_COLOR, alpha: 0.96 });
    panel.stroke({ color: BORDER_COLOR, width: 2 });
    this.container.addChild(panel);

    const headerText = new Text({
      text: "Formation",
      style: { fontFamily: "monospace", fontSize: 20, fill: TITLE_COLOR, fontWeight: "bold" },
    });
    headerText.anchor.set(0.5, 0);
    headerText.position.set(W / 2, panelY + 16);
    this.container.addChild(headerText);

    // Column headers
    const colLeft = panelX + 28;
    const colLine = panelX + panelW - 120;
    const startY = panelY + 52;

    const nameHeader = new Text({
      text: "Unit",
      style: { fontFamily: "monospace", fontSize: 11, fill: DIM_COLOR },
    });
    nameHeader.position.set(colLeft, startY);
    this.container.addChild(nameHeader);

    const lineHeader = new Text({
      text: "Position",
      style: { fontFamily: "monospace", fontSize: 11, fill: DIM_COLOR },
    });
    lineHeader.position.set(colLine, startY);
    this.container.addChild(lineHeader);

    for (let i = 0; i < party.length; i++) {
      const member = party[i];
      const selected = i === this._selectedIndex;
      const y = startY + 22 + i * 36;
      const line = this._rpgState.formation[member.id] ?? 1;

      const nameText = new Text({
        text: `${selected ? "> " : "  "}${member.name}`,
        style: {
          fontFamily: "monospace", fontSize: 13,
          fill: selected ? SELECTED_COLOR : OPTION_COLOR,
          fontWeight: selected ? "bold" : "normal",
        },
      });
      nameText.position.set(colLeft, y);
      this.container.addChild(nameText);

      const rangeLabel = member.range > 1 ? " (ranged)" : " (melee)";
      const rangeText = new Text({
        text: rangeLabel,
        style: { fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR },
      });
      rangeText.position.set(colLeft + 160, y + 2);
      this.container.addChild(rangeText);

      const lineText = new Text({
        text: line === 1 ? "[ FRONT ]" : "[ BACK  ]",
        style: {
          fontFamily: "monospace", fontSize: 13,
          fill: line === 1 ? 0x44cc44 : 0x6688ff,
          fontWeight: "bold",
        },
      });
      lineText.position.set(colLine, y);
      this.container.addChild(lineText);
    }

    const footer = new Text({
      text: "Enter: Toggle Line  |  Escape: Back",
      style: { fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR },
    });
    footer.anchor.set(0.5, 0);
    footer.position.set(W / 2, panelY + panelH - 28);
    this.container.addChild(footer);
  }

  private _drawHelp(W: number, H: number): void {
    const panelW = Math.min(500, W - 40);
    const panelH = 440;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 8);
    panel.fill({ color: PANEL_COLOR, alpha: 0.96 });
    panel.stroke({ color: BORDER_COLOR, width: 2 });
    this.container.addChild(panel);

    const headerText = new Text({
      text: "Controls & Help",
      style: { fontFamily: "monospace", fontSize: 20, fill: TITLE_COLOR, fontWeight: "bold" },
    });
    headerText.anchor.set(0.5, 0);
    headerText.position.set(W / 2, panelY + 16);
    this.container.addChild(headerText);

    const sections: { title: string; lines: string[] }[] = [
      {
        title: "Exploration",
        lines: [
          "Arrow Keys     Move on overworld / dungeon",
          "Escape         Open pause menu",
          "I              Open inventory",
          "T              Toggle battle mode (turn/auto)",
        ],
      },
      {
        title: "Battle",
        lines: [
          "Up/Down        Navigate action menu",
          "Enter/Space    Confirm selection",
          "Left/Right     Select target",
          "Escape         Cancel / go back",
        ],
      },
      {
        title: "Town Menu",
        lines: [
          "Left/Right     Switch tabs (Shop/Inn/Recruit/...)",
          "Up/Down        Navigate items in current tab",
          "Enter/Space    Buy / Equip / Recruit / Confirm",
          "Escape         Leave town",
        ],
      },
      {
        title: "Battle Lines",
        lines: [
          "Melee units    Can only attack the front line",
          "Ranged units   Can attack front or back line",
          "If front line is empty, back line is exposed",
          "Set formation via Escape > Formation",
        ],
      },
    ];

    let y = panelY + 48;
    const left = panelX + 24;

    for (const section of sections) {
      const sTitle = new Text({
        text: section.title,
        style: { fontFamily: "monospace", fontSize: 13, fill: 0x88bbff, fontWeight: "bold" },
      });
      sTitle.position.set(left, y);
      this.container.addChild(sTitle);
      y += 18;

      for (const line of section.lines) {
        const lineText = new Text({
          text: `  ${line}`,
          style: { fontFamily: "monospace", fontSize: 11, fill: OPTION_COLOR },
        });
        lineText.position.set(left, y);
        this.container.addChild(lineText);
        y += 16;
      }
      y += 8;
    }

    const footer = new Text({
      text: "Press Escape or Enter to close",
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
      if (this.inputSuspended) return;
      e.stopPropagation();
      if (this._mode === "menu") this._handleMenuInput(e);
      else if (this._mode === "save") this._handleSaveInput(e);
      else if (this._mode === "inventory") this._handleInventoryInput(e);
      else if (this._mode === "formation") this._handleFormationInput(e);
      else if (this._mode === "help") this._handleHelpInput(e);
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
          this._mode = "inventory";
          this._invMemberIndex = 0;
          this._selectedIndex = 0;
          this._draw();
          break;
        case 2:
          this._mode = "save";
          this._selectedIndex = 0;
          this._saveMessage = "";
          this._draw();
          break;
        case 3:
          this._mode = "formation";
          this._selectedIndex = 0;
          this._draw();
          break;
        case 4:
          this._mode = "help";
          this._draw();
          break;
        case 5: this.onOptions?.(); break;
        case 6:
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
    const slotCount = this._saveSlots.length;
    if (e.code === "ArrowUp") {
      this._selectedIndex = (this._selectedIndex - 1 + slotCount) % slotCount;
      this._draw();
    } else if (e.code === "ArrowDown") {
      this._selectedIndex = (this._selectedIndex + 1) % slotCount;
      this._draw();
    } else if (e.code === "Enter" || e.code === "Space") {
      const ok = saveGame(this._selectedIndex, this._rpgState, this._overworldState);
      this._saveMessage = ok ? `Saved to Slot ${this._selectedIndex + 1}!` : "Save failed!";
      if (this._saveMessageTimer) clearTimeout(this._saveMessageTimer);
      this._saveMessageTimer = setTimeout(() => { this._saveMessage = ""; this._draw(); }, 2000);
      this._draw();
    } else if (e.code === "Escape") {
      this._mode = "menu";
      this._selectedIndex = 2;
      this._draw();
    }
  }

  private _handleInventoryInput(e: KeyboardEvent): void {
    const party = this._rpgState.party;
    if (e.code === "ArrowUp") {
      this._invMemberIndex = (this._invMemberIndex - 1 + party.length) % party.length;
      this._draw();
    } else if (e.code === "ArrowDown") {
      this._invMemberIndex = (this._invMemberIndex + 1) % party.length;
      this._draw();
    } else if (e.code === "Escape") {
      this._mode = "menu";
      this._selectedIndex = 1;
      this._draw();
    }
  }

  private _handleFormationInput(e: KeyboardEvent): void {
    const party = this._rpgState.party;
    if (party.length === 0) {
      if (e.code === "Escape") {
        this._mode = "menu";
        this._selectedIndex = 3;
        this._draw();
      }
      return;
    }

    if (e.code === "ArrowUp") {
      this._selectedIndex = (this._selectedIndex - 1 + party.length) % party.length;
      this._draw();
    } else if (e.code === "ArrowDown") {
      this._selectedIndex = (this._selectedIndex + 1) % party.length;
      this._draw();
    } else if (e.code === "Enter" || e.code === "Space") {
      const member = party[this._selectedIndex];
      const current = this._rpgState.formation[member.id] ?? 1;
      this._rpgState.formation[member.id] = current === 1 ? 2 : 1;
      this._draw();
    } else if (e.code === "Escape") {
      this._mode = "menu";
      this._selectedIndex = 3;
      this._draw();
    }
  }

  private _handleHelpInput(e: KeyboardEvent): void {
    if (e.code === "Escape" || e.code === "Enter" || e.code === "Space") {
      this._mode = "menu";
      this._selectedIndex = 4;
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
        this._selectedIndex = 6;
        this._draw();
      }
    } else if (e.code === "Escape") {
      this._mode = "menu";
      this._selectedIndex = 6;
      this._draw();
    }
  }
}
