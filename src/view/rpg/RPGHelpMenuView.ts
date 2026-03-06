// RPG Help Menu — controls, game concepts, and tips overlay
import { Container, Graphics, Text } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const PANEL_COLOR = 0x1a1a2e;
const BORDER_COLOR = 0x4444aa;
const HEADER_COLOR = 0xffcc00;
const SUBHEADER_COLOR = 0x88bbff;
const TEXT_COLOR = 0xcccccc;
const DIM_COLOR = 0x888888;
const KEY_COLOR = 0x66dd88;

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

interface HelpSection {
  title: string;
  lines: { key?: string; desc: string }[];
}

const HELP_SECTIONS: HelpSection[] = [
  {
    title: "Overworld Controls",
    lines: [
      { key: "W/A/S/D or Arrows", desc: "Move party" },
      { key: "T", desc: "Toggle battle mode (Turn/Auto)" },
      { key: "? or F1", desc: "Open this help menu" },
      { key: "I", desc: "Open inventory (use items)" },
    ],
  },
  {
    title: "Dungeon Controls",
    lines: [
      { key: "W/A/S/D or Arrows", desc: "Move through dungeon" },
      { key: "I", desc: "Open inventory (use items)" },
      { desc: "Find stairs to descend or exit" },
      { desc: "Walk into chests to open them" },
      { desc: "Compass arrow shows stairs direction" },
    ],
  },
  {
    title: "Battle Controls",
    lines: [
      { key: "W/S or Up/Down", desc: "Navigate action menu" },
      { key: "Enter/Space", desc: "Confirm action" },
      { key: "A/D or Left/Right", desc: "Select target" },
      { key: "Escape", desc: "Cancel target selection" },
    ],
  },
  {
    title: "Town Menu Controls",
    lines: [
      { key: "Left/Right", desc: "Switch tabs" },
      { key: "Up/Down", desc: "Navigate items" },
      { key: "Enter", desc: "Buy / Equip / Rest" },
      { key: "Tab", desc: "Toggle Buy/Sell in shop" },
      { key: "Backspace", desc: "Unequip item" },
      { key: "Escape", desc: "Go back / Leave town" },
    ],
  },
  {
    title: "Game Concepts",
    lines: [
      { desc: "Your party has 3 members: Hero, Elara, and Finn." },
      { desc: "Each member has HP, MP, ATK, DEF, and Speed stats." },
      { desc: "Equipment slots: Weapon, Armor, Accessory." },
      { desc: "Encounters happen randomly while exploring." },
      { desc: "Towns have shops, inns, and party management." },
      { desc: "Dungeons contain stronger enemies and better loot." },
    ],
  },
  {
    title: "Battle Tips",
    lines: [
      { desc: "Defend halves incoming damage for one round." },
      { desc: "Abilities cost MP but deal 1.5x damage." },
      { desc: "Use Item to heal party members with consumables." },
      { desc: "You can't flee from boss battles." },
      { desc: "Defeated enemies may drop loot items." },
      { desc: "All living party members share XP equally." },
      { desc: "Level up to full heal and boost all stats." },
    ],
  },
  {
    title: "Quests",
    lines: [
      { desc: "Talk to NPCs to receive quests." },
      { desc: "Active quest progress is shown in the HUD." },
      { desc: "Return to the quest-giver when objectives are complete." },
      { desc: "Rewards include gold and XP for the whole party." },
    ],
  },
  {
    title: "Exploration Tips",
    lines: [
      { desc: "Visit towns to heal at the inn and buy gear." },
      { desc: "Equip items from the Party tab in town menus." },
      { desc: "Talk to NPCs for hints, lore, and quests." },
      { desc: "Yellow squares on the map are towns." },
      { desc: "Red triangles are dungeon entrances." },
    ],
  },
];

// ---------------------------------------------------------------------------
// RPGHelpMenuView
// ---------------------------------------------------------------------------

export class RPGHelpMenuView {
  private vm!: ViewManager;
  private container = new Container();
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _scrollY = 0;
  private _contentHeight = 0;
  private _panelH = 0;
  onClose: (() => void) | null = null;

  init(vm: ViewManager): void {
    this.vm = vm;
    vm.addToLayer("ui", this.container);
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

  private _draw(): void {
    this.container.removeChildren();

    const W = this.vm.screenWidth;
    const H = this.vm.screenHeight;

    // Semi-transparent overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.6 });
    this.container.addChild(overlay);

    // Panel
    const panelW = Math.min(480, W - 40);
    const panelX = (W - panelW) / 2;
    const panelY = H * 0.08;
    this._panelH = H * 0.84;

    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, this._panelH, 8);
    panel.fill({ color: PANEL_COLOR, alpha: 0.95 });
    panel.stroke({ color: BORDER_COLOR, width: 2 });
    this.container.addChild(panel);

    // Title
    const title = new Text({
      text: "Help & Controls",
      style: { fontFamily: "monospace", fontSize: 20, fill: HEADER_COLOR, fontWeight: "bold" },
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, panelY + 12);
    this.container.addChild(title);

    // Scrollable content area — use a mask
    const contentAreaY = panelY + 42;
    const contentAreaH = this._panelH - 72;

    const maskGraphic = new Graphics();
    maskGraphic.rect(panelX, contentAreaY, panelW, contentAreaH);
    maskGraphic.fill({ color: 0xffffff });
    this.container.addChild(maskGraphic);

    const contentContainer = new Container();
    contentContainer.mask = maskGraphic;
    this.container.addChild(contentContainer);

    // Render sections
    let y = contentAreaY - this._scrollY;
    const leftX = panelX + 20;
    const contentW = panelW - 40;

    for (const section of HELP_SECTIONS) {
      // Section header
      const header = new Text({
        text: section.title,
        style: { fontFamily: "monospace", fontSize: 14, fill: SUBHEADER_COLOR, fontWeight: "bold" },
      });
      header.position.set(leftX, y);
      contentContainer.addChild(header);
      y += 20;

      // Divider
      const divider = new Graphics();
      divider.rect(leftX, y, contentW, 1);
      divider.fill({ color: BORDER_COLOR, alpha: 0.5 });
      contentContainer.addChild(divider);
      y += 6;

      for (const line of section.lines) {
        if (line.key) {
          // Key + description
          const keyText = new Text({
            text: line.key,
            style: { fontFamily: "monospace", fontSize: 11, fill: KEY_COLOR },
          });
          keyText.position.set(leftX + 4, y);
          contentContainer.addChild(keyText);

          const descText = new Text({
            text: line.desc,
            style: { fontFamily: "monospace", fontSize: 11, fill: TEXT_COLOR },
          });
          descText.position.set(leftX + 180, y);
          contentContainer.addChild(descText);
        } else {
          // Just description
          const descText = new Text({
            text: `  ${line.desc}`,
            style: { fontFamily: "monospace", fontSize: 11, fill: TEXT_COLOR },
          });
          descText.position.set(leftX + 4, y);
          contentContainer.addChild(descText);
        }
        y += 18;
      }

      y += 12; // Gap between sections
    }

    this._contentHeight = y - contentAreaY + this._scrollY;

    // Footer
    const footer = new Text({
      text: "Up/Down = Scroll  |  Esc / ? / F1 = Close",
      style: { fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR },
    });
    footer.anchor.set(0.5, 0);
    footer.position.set(W / 2, panelY + this._panelH - 24);
    this.container.addChild(footer);

    // Scroll indicator
    if (this._contentHeight > contentAreaH) {
      const scrollRatio = this._scrollY / (this._contentHeight - contentAreaH);
      const trackH = contentAreaH - 20;
      const thumbH = Math.max(20, (contentAreaH / this._contentHeight) * trackH);
      const thumbY = contentAreaY + 10 + scrollRatio * (trackH - thumbH);

      const scrollTrack = new Graphics();
      scrollTrack.roundRect(panelX + panelW - 12, contentAreaY + 10, 4, trackH, 2);
      scrollTrack.fill({ color: 0x333355, alpha: 0.5 });
      scrollTrack.roundRect(panelX + panelW - 12, thumbY, 4, thumbH, 2);
      scrollTrack.fill({ color: BORDER_COLOR, alpha: 0.8 });
      this.container.addChild(scrollTrack);
    }
  }

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      const contentAreaH = this._panelH - 72;
      const maxScroll = Math.max(0, this._contentHeight - contentAreaH);

      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          this._scrollY = Math.max(0, this._scrollY - 30);
          this._draw();
          e.preventDefault();
          break;
        case "ArrowDown":
        case "KeyS":
          this._scrollY = Math.min(maxScroll, this._scrollY + 30);
          this._draw();
          e.preventDefault();
          break;
        case "Escape":
        case "F1":
          this.onClose?.();
          break;
        default:
          // ? key (Slash with shift)
          if (e.key === "?") {
            this.onClose?.();
          }
          break;
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }
}
