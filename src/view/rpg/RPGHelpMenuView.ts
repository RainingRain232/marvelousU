// RPG Help Menu — tabbed overlay with Controls, Instructions, Game Concepts, Rules
import { Container, Graphics, Text } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const PANEL_COLOR = 0x10102a;
const BORDER_COLOR = 0x5555cc;
const HEADER_COLOR = 0xffcc00;
const SUBHEADER_COLOR = 0x88bbff;
const TEXT_COLOR = 0xd0d0dd;
const DIM_COLOR = 0x777799;
const KEY_COLOR = 0x66dd88;
const TAB_ACTIVE_BG = 0x222255;
const TAB_INACTIVE_BG = 0x141430;
const TAB_ACTIVE_BORDER = 0xffcc00;
const TAB_INACTIVE_BORDER = 0x444488;
const ACCENT_LINE = 0x5555cc;

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

interface HelpSection {
  title: string;
  lines: { key?: string; desc: string }[];
}

interface HelpTab {
  label: string;
  sections: HelpSection[];
}

const HELP_TABS: HelpTab[] = [
  {
    label: "Controls",
    sections: [
      {
        title: "Overworld Controls",
        lines: [
          { key: "Arrow Keys", desc: "Move party on overworld" },
          { key: "W/A/S/D", desc: "Pan camera" },
          { key: "T", desc: "Toggle battle mode (Turn/Auto)" },
          { key: "I", desc: "Open inventory" },
          { key: "Escape", desc: "Open pause menu" },
          { key: "? or F1", desc: "Open this help menu" },
        ],
      },
      {
        title: "Dungeon Controls",
        lines: [
          { key: "Arrow Keys", desc: "Move through dungeon" },
          { key: "I", desc: "Open inventory" },
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
          { key: "Mouse Click", desc: "Click actions, targets, spells" },
          { key: "Escape", desc: "Cancel target selection" },
        ],
      },
      {
        title: "Town Menu Controls",
        lines: [
          { key: "Left/Right", desc: "Switch tabs" },
          { key: "Up/Down", desc: "Navigate items" },
          { key: "Enter / Click", desc: "Buy / Equip / Rest" },
          { key: "Tab", desc: "Toggle Buy/Sell in shop" },
          { key: "Backspace", desc: "Unequip item" },
          { key: "Escape", desc: "Go back / Leave town" },
        ],
      },
    ],
  },
  {
    label: "Instructions",
    sections: [
      {
        title: "Getting Started",
        lines: [
          { desc: "Use arrow keys to explore the overworld map." },
          { desc: "Walk into towns (yellow tiles) to shop, rest, and recruit." },
          { desc: "Walk into dungeons (red tiles) for stronger enemies and loot." },
          { desc: "Random encounters may occur while exploring." },
        ],
      },
      {
        title: "Battle System",
        lines: [
          { desc: "Battles are turn-based. Each unit acts based on speed." },
          { desc: "Choose Attack, Ability, Defend, Item, or Flee." },
          { desc: "Use the Limit Break action when your gauge is full." },
          { desc: "Defeat all enemies to win XP, gold, and loot." },
        ],
      },
      {
        title: "Town Activities",
        lines: [
          { desc: "Shop: Buy and sell weapons, armor, and items." },
          { desc: "Inn: Rest to fully restore HP and MP." },
          { desc: "Recruit: Hire new party members." },
          { desc: "Arena: Fight for gold and XP rewards." },
          { desc: "Talk to NPCs for quests, lore, and tips." },
        ],
      },
      {
        title: "Saving & Loading",
        lines: [
          { desc: "Press Escape to open the pause menu." },
          { desc: "Select 'Save Game' to save into one of 3 slots." },
          { desc: "Load from the main menu's 'Continue' option." },
          { desc: "The game also auto-saves after major events." },
        ],
      },
    ],
  },
  {
    label: "Concepts",
    sections: [
      {
        title: "Party & Stats",
        lines: [
          { desc: "Your party starts with 3 members: Hero, Elara, and Finn." },
          { desc: "Each member has HP, MP, ATK, DEF, and Speed stats." },
          { desc: "Equipment slots: Weapon, Armor, Helmet, Shield," },
          { desc: "  Legs, Boots, Ring, and Accessory." },
          { desc: "Level up to improve all stats and learn abilities." },
        ],
      },
      {
        title: "Battle Lines (Formation)",
        lines: [
          { desc: "Units fight on a Front or Back line." },
          { desc: "Melee units can only attack the front line." },
          { desc: "Ranged units can attack front or back line." },
          { desc: "If the front line is empty, back line is exposed." },
          { desc: "Set formation from Escape > Formation." },
        ],
      },
      {
        title: "Elements & Affinities",
        lines: [
          { desc: "Units have elemental types (Fire, Cold, Lightning, etc)." },
          { desc: "Elemental advantages deal increased damage." },
          { desc: "Status effects: Poison, Regen, Slow, Haste, Shield, Stun." },
        ],
      },
      {
        title: "Limit Break & Spells",
        lines: [
          { desc: "The Limit Gauge fills when taking/dealing damage." },
          { desc: "At 100%, use Limit Break for a devastating attack." },
          { desc: "Casters learn spells as they level up." },
          { desc: "Spells cost MP and have various effects." },
        ],
      },
    ],
  },
  {
    label: "Rules",
    sections: [
      {
        title: "Combat Rules",
        lines: [
          { desc: "Turn order is determined by Speed stat." },
          { desc: "Defend halves incoming damage for one round." },
          { desc: "Abilities cost MP but deal 1.5x damage." },
          { desc: "You cannot flee from boss battles." },
          { desc: "All living party members share XP equally." },
          { desc: "Level up restores HP and MP to full." },
        ],
      },
      {
        title: "Defeat & Penalties",
        lines: [
          { desc: "If all party members are defeated, you lose some gold." },
          { desc: "Party is revived with 1 HP each." },
          { desc: "If gold is 0 and all at 1 HP, it's Game Over." },
        ],
      },
      {
        title: "Quest Rules",
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
          { desc: "Yellow squares on the map are towns." },
          { desc: "Red triangles are dungeon entrances." },
          { desc: "Defeated enemies may drop loot items." },
        ],
      },
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
  private _activeTab = 0;
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
    overlay.fill({ color: 0x000000, alpha: 0.65 });
    overlay.eventMode = "static";
    overlay.on("pointertap", (e) => {
      // Close if clicking outside the panel
      const panelW = Math.min(540, W - 40);
      const panelX = (W - panelW) / 2;
      const panelY = H * 0.06;
      const px = e.global.x;
      const py = e.global.y;
      if (px < panelX || px > panelX + panelW || py < panelY || py > panelY + this._panelH) {
        this.onClose?.();
      }
    });
    this.container.addChild(overlay);

    // Panel
    const panelW = Math.min(540, W - 40);
    const panelX = (W - panelW) / 2;
    const panelY = H * 0.06;
    this._panelH = H * 0.88;

    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, this._panelH, 10);
    panel.fill({ color: PANEL_COLOR, alpha: 0.97 });
    panel.stroke({ color: BORDER_COLOR, width: 2 });
    panel.eventMode = "static"; // Block clicks from going through
    this.container.addChild(panel);

    // Title
    const title = new Text({
      text: "Help & Information",
      style: { fontFamily: "monospace", fontSize: 20, fill: HEADER_COLOR, fontWeight: "bold", letterSpacing: 2 },
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, panelY + 14);
    this.container.addChild(title);

    // Close button (top-right)
    const closeBtnSize = 26;
    const closeX = panelX + panelW - closeBtnSize - 10;
    const closeY = panelY + 10;
    const closeBtn = new Graphics();
    closeBtn.roundRect(closeX, closeY, closeBtnSize, closeBtnSize, 4);
    closeBtn.fill({ color: 0x332222, alpha: 0.8 });
    closeBtn.stroke({ color: 0x885555, width: 1 });
    closeBtn.eventMode = "static";
    closeBtn.cursor = "pointer";
    closeBtn.on("pointertap", () => this.onClose?.());
    closeBtn.on("pointerover", () => { closeBtn.tint = 0xff8888; });
    closeBtn.on("pointerout", () => { closeBtn.tint = 0xffffff; });
    this.container.addChild(closeBtn);

    const closeX_ = new Text({
      text: "X",
      style: { fontFamily: "monospace", fontSize: 14, fill: 0xcc6666, fontWeight: "bold" },
    });
    closeX_.anchor.set(0.5, 0.5);
    closeX_.position.set(closeX + closeBtnSize / 2, closeY + closeBtnSize / 2);
    this.container.addChild(closeX_);

    // Tab bar
    const tabY = panelY + 42;
    const tabH = 30;
    const tabGap = 4;
    const totalTabW = panelW - 24;
    const tabW = (totalTabW - tabGap * (HELP_TABS.length - 1)) / HELP_TABS.length;

    for (let ti = 0; ti < HELP_TABS.length; ti++) {
      const isActive = ti === this._activeTab;
      const tx = panelX + 12 + ti * (tabW + tabGap);

      const tabBg = new Graphics();
      if (isActive) {
        tabBg.roundRect(tx, tabY, tabW, tabH, 5);
        tabBg.fill({ color: TAB_ACTIVE_BG, alpha: 0.95 });
        tabBg.stroke({ color: TAB_ACTIVE_BORDER, width: 2 });
      } else {
        tabBg.roundRect(tx, tabY, tabW, tabH, 5);
        tabBg.fill({ color: TAB_INACTIVE_BG, alpha: 0.7 });
        tabBg.stroke({ color: TAB_INACTIVE_BORDER, width: 1 });
      }
      this.container.addChild(tabBg);

      // Tab clickable
      tabBg.eventMode = "static";
      tabBg.cursor = "pointer";
      const tabIdx = ti;
      tabBg.on("pointertap", () => {
        this._activeTab = tabIdx;
        this._scrollY = 0;
        this._draw();
      });
      tabBg.on("pointerover", () => {
        if (!isActive) tabBg.tint = 0xccccff;
      });
      tabBg.on("pointerout", () => {
        tabBg.tint = 0xffffff;
      });

      const tabLabel = new Text({
        text: HELP_TABS[ti].label,
        style: {
          fontFamily: "monospace",
          fontSize: 12,
          fill: isActive ? HEADER_COLOR : DIM_COLOR,
          fontWeight: isActive ? "bold" : "normal",
        },
      });
      tabLabel.anchor.set(0.5, 0.5);
      tabLabel.position.set(tx + tabW / 2, tabY + tabH / 2);
      this.container.addChild(tabLabel);
    }

    // Active tab indicator line
    const activeTabX = panelX + 12 + this._activeTab * (tabW + tabGap);
    const indicator = new Graphics();
    indicator.rect(activeTabX + 4, tabY + tabH + 2, tabW - 8, 2);
    indicator.fill({ color: HEADER_COLOR, alpha: 0.6 });
    this.container.addChild(indicator);

    // Scrollable content area
    const contentAreaY = tabY + tabH + 8;
    const contentAreaH = this._panelH - (contentAreaY - panelY) - 36;

    const maskGraphic = new Graphics();
    maskGraphic.rect(panelX, contentAreaY, panelW, contentAreaH);
    maskGraphic.fill({ color: 0xffffff });
    this.container.addChild(maskGraphic);

    const contentContainer = new Container();
    contentContainer.mask = maskGraphic;
    this.container.addChild(contentContainer);

    // Render active tab sections
    const activeTab = HELP_TABS[this._activeTab];
    let y = contentAreaY - this._scrollY;
    const leftX = panelX + 24;
    const contentW = panelW - 48;

    for (const section of activeTab.sections) {
      // Section header with accent
      const headerBg = new Graphics();
      headerBg.roundRect(leftX - 4, y - 2, contentW + 8, 22, 3);
      headerBg.fill({ color: 0x1a1a44, alpha: 0.6 });
      contentContainer.addChild(headerBg);

      const header = new Text({
        text: section.title,
        style: { fontFamily: "monospace", fontSize: 13, fill: SUBHEADER_COLOR, fontWeight: "bold" },
      });
      header.position.set(leftX, y);
      contentContainer.addChild(header);
      y += 24;

      // Accent line under header
      const divider = new Graphics();
      divider.rect(leftX, y, contentW, 1);
      divider.fill({ color: ACCENT_LINE, alpha: 0.35 });
      contentContainer.addChild(divider);
      y += 8;

      for (const line of section.lines) {
        if (line.key) {
          // Key + description
          const keyBg = new Graphics();
          keyBg.roundRect(leftX, y - 1, 120, 16, 3);
          keyBg.fill({ color: 0x1a2a1a, alpha: 0.4 });
          contentContainer.addChild(keyBg);

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
          descText.position.set(leftX + 140, y);
          contentContainer.addChild(descText);
        } else {
          // Just description with bullet
          const descText = new Text({
            text: `  \u2022 ${line.desc}`,
            style: { fontFamily: "monospace", fontSize: 11, fill: TEXT_COLOR },
          });
          descText.position.set(leftX, y);
          contentContainer.addChild(descText);
        }
        y += 20;
      }

      y += 14; // Gap between sections
    }

    this._contentHeight = y - contentAreaY + this._scrollY;

    // Footer
    const footer = new Text({
      text: "Tab / Click = Switch Tab  |  Up/Down / Scroll = Navigate  |  Esc = Close",
      style: { fontFamily: "monospace", fontSize: 10, fill: DIM_COLOR },
    });
    footer.anchor.set(0.5, 0);
    footer.position.set(W / 2, panelY + this._panelH - 26);
    this.container.addChild(footer);

    // Scroll indicator
    if (this._contentHeight > contentAreaH) {
      const scrollRatio = this._scrollY / (this._contentHeight - contentAreaH);
      const trackH = contentAreaH - 20;
      const thumbH = Math.max(24, (contentAreaH / this._contentHeight) * trackH);
      const thumbY = contentAreaY + 10 + scrollRatio * (trackH - thumbH);

      const scrollTrack = new Graphics();
      scrollTrack.roundRect(panelX + panelW - 14, contentAreaY + 10, 5, trackH, 2);
      scrollTrack.fill({ color: 0x222244, alpha: 0.5 });
      scrollTrack.roundRect(panelX + panelW - 14, thumbY, 5, thumbH, 2);
      scrollTrack.fill({ color: BORDER_COLOR, alpha: 0.8 });
      this.container.addChild(scrollTrack);
    }
  }

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      const contentAreaH = this._panelH - 120;
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
        case "ArrowLeft":
        case "Tab":
          if (e.code === "Tab" && e.shiftKey) {
            this._activeTab = (this._activeTab - 1 + HELP_TABS.length) % HELP_TABS.length;
          } else if (e.code === "ArrowLeft") {
            this._activeTab = (this._activeTab - 1 + HELP_TABS.length) % HELP_TABS.length;
          } else {
            this._activeTab = (this._activeTab + 1) % HELP_TABS.length;
          }
          this._scrollY = 0;
          this._draw();
          e.preventDefault();
          break;
        case "ArrowRight":
          this._activeTab = (this._activeTab + 1) % HELP_TABS.length;
          this._scrollY = 0;
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
