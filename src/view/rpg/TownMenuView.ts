// Full-screen town menu — shop, inn, party/equipment, leave
import { Container, Graphics, Text } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { RPGState, RPGItem } from "@rpg/state/RPGState";
import type { TownData } from "@rpg/state/OverworldState";
import { buyItem, equipItem, unequipItem, restAtInn } from "@rpg/systems/EquipmentSystem";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const BG_COLOR = 0x0e0e1a;
const PANEL_COLOR = 0x1a1a2e;
const BORDER_COLOR = 0x4444aa;
const HIGHLIGHT_COLOR = 0xffcc00;
const TEXT_COLOR = 0xcccccc;
const DIM_TEXT = 0x888888;
const GOLD_COLOR = 0xffd700;
const HP_GREEN = 0x44aa44;
const TAB_ACTIVE_COLOR = 0x2a2a4e;

const TABS = ["Shop", "Inn", "Party", "Leave"] as const;

// Sub-modes within Party tab
type PartySubMode = "member_list" | "equip_slot" | "inventory_pick";

// ---------------------------------------------------------------------------
// TownMenuView
// ---------------------------------------------------------------------------

export class TownMenuView {
  private vm!: ViewManager;
  private rpg!: RPGState;
  private townData!: TownData;
  private townName = "Town";

  private container = new Container();
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;

  // Navigation state
  private _activeTab: number = 0;
  private _itemIndex: number = 0;
  private _partyIndex: number = 0;
  private _partySubMode: PartySubMode = "member_list";
  private _equipSlotIndex: number = 0;
  private _inventoryPickIndex: number = 0;
  private _message: string = "";
  private _messageTimer: ReturnType<typeof setTimeout> | null = null;

  // Callbacks
  onLeave: (() => void) | null = null;

  init(vm: ViewManager, rpg: RPGState, townData: TownData, townName: string): void {
    this.vm = vm;
    this.rpg = rpg;
    this.townData = townData;
    this.townName = townName;

    vm.addToLayer("ui", this.container);

    this._draw();
    this._setupInput();
  }

  destroy(): void {
    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }
    if (this._messageTimer) clearTimeout(this._messageTimer);

    this.vm.removeFromLayer("ui", this.container);
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  private _draw(): void {
    this.container.removeChildren();

    const W = this.vm.screenWidth;
    const H = this.vm.screenHeight;
    const g = new Graphics();

    // Full-screen background
    g.rect(0, 0, W, H);
    g.fill({ color: BG_COLOR, alpha: 0.95 });
    this.container.addChild(g);

    // Header
    this._drawHeader(W);

    // Tab bar
    this._drawTabs(W);

    // Content area
    const tab = TABS[this._activeTab];
    switch (tab) {
      case "Shop":
        this._drawShop(W, H);
        break;
      case "Inn":
        this._drawInn(W, H);
        break;
      case "Party":
        this._drawParty(W, H);
        break;
      case "Leave":
        this._drawLeave(W, H);
        break;
    }

    // Message bar
    if (this._message) {
      this._drawMessage(W, H);
    }

    // Controls hint
    this._drawControls(W, H);
  }

  private _drawHeader(W: number): void {
    const title = new Text({
      text: this.townName,
      style: { fontFamily: "monospace", fontSize: 22, fill: 0xffffff, fontWeight: "bold" },
    });
    title.position.set(20, 12);
    this.container.addChild(title);

    const gold = new Text({
      text: `Gold: ${this.rpg.gold}`,
      style: { fontFamily: "monospace", fontSize: 16, fill: GOLD_COLOR, fontWeight: "bold" },
    });
    gold.anchor.set(1, 0);
    gold.position.set(W - 20, 16);
    this.container.addChild(gold);
  }

  private _drawTabs(W: number): void {
    const y = 50;
    const tabWidth = Math.min(120, (W - 40) / TABS.length);
    const g = new Graphics();

    for (let i = 0; i < TABS.length; i++) {
      const x = 20 + i * tabWidth;
      const isActive = i === this._activeTab;

      g.roundRect(x, y, tabWidth - 4, 30, 4);
      g.fill({ color: isActive ? TAB_ACTIVE_COLOR : PANEL_COLOR });
      g.stroke({ color: isActive ? HIGHLIGHT_COLOR : BORDER_COLOR, width: isActive ? 2 : 1 });

      const text = new Text({
        text: TABS[i],
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fill: isActive ? HIGHLIGHT_COLOR : TEXT_COLOR,
          fontWeight: isActive ? "bold" : "normal",
        },
      });
      text.anchor.set(0.5, 0.5);
      text.position.set(x + (tabWidth - 4) / 2, y + 15);
      this.container.addChild(text);
    }

    this.container.addChild(g);
  }

  // ---------------------------------------------------------------------------
  // Shop tab
  // ---------------------------------------------------------------------------

  private _drawShop(W: number, H: number): void {
    const startY = 100;
    const items = this.townData.shopItems;
    const g = new Graphics();

    // Panel background
    g.roundRect(15, startY - 5, W - 30, H - startY - 60, 6);
    g.fill({ color: PANEL_COLOR, alpha: 0.8 });
    g.stroke({ color: BORDER_COLOR, width: 1 });
    this.container.addChild(g);

    if (items.length === 0) {
      const empty = new Text({
        text: "No items for sale.",
        style: { fontFamily: "monospace", fontSize: 14, fill: DIM_TEXT },
      });
      empty.position.set(30, startY + 15);
      this.container.addChild(empty);
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const y = startY + 10 + i * 32;
      const isSelected = i === this._itemIndex;

      if (isSelected) {
        const highlight = new Graphics();
        highlight.roundRect(20, y - 2, W - 44, 28, 3);
        highlight.fill({ color: 0x2a2a4e, alpha: 0.8 });
        this.container.addChild(highlight);
      }

      const canAfford = this.rpg.gold >= item.value;
      const cursor = isSelected ? ">" : " ";

      const nameText = new Text({
        text: `${cursor} ${item.name}`,
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fill: isSelected ? HIGHLIGHT_COLOR : (canAfford ? TEXT_COLOR : 0x664444),
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      nameText.position.set(30, y);
      this.container.addChild(nameText);

      const priceText = new Text({
        text: `${item.value}g`,
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fill: canAfford ? GOLD_COLOR : 0x664444,
        },
      });
      priceText.anchor.set(1, 0);
      priceText.position.set(W / 2, y);
      this.container.addChild(priceText);

      const statsText = new Text({
        text: _formatItemStats(item),
        style: { fontFamily: "monospace", fontSize: 11, fill: DIM_TEXT },
      });
      statsText.position.set(W / 2 + 20, y + 2);
      this.container.addChild(statsText);
    }

    // Selected item description
    if (this._itemIndex < items.length) {
      const desc = new Text({
        text: items[this._itemIndex].description,
        style: {
          fontFamily: "monospace",
          fontSize: 12,
          fill: TEXT_COLOR,
          wordWrap: true,
          wordWrapWidth: W - 60,
        },
      });
      desc.position.set(30, H - 90);
      this.container.addChild(desc);
    }
  }

  // ---------------------------------------------------------------------------
  // Inn tab
  // ---------------------------------------------------------------------------

  private _drawInn(W: number, H: number): void {
    const startY = 100;
    const g = new Graphics();
    const cost = this.townData.innCost;
    const canAfford = this.rpg.gold >= cost;

    g.roundRect(15, startY - 5, W - 30, H - startY - 60, 6);
    g.fill({ color: PANEL_COLOR, alpha: 0.8 });
    g.stroke({ color: BORDER_COLOR, width: 1 });
    this.container.addChild(g);

    const innTitle = new Text({
      text: "Welcome to the Inn",
      style: { fontFamily: "monospace", fontSize: 18, fill: 0xffffff, fontWeight: "bold" },
    });
    innTitle.position.set(30, startY + 20);
    this.container.addChild(innTitle);

    const innDesc = new Text({
      text: "Rest and restore all party members to full HP and MP.\nAll negative status effects will be cured.",
      style: { fontFamily: "monospace", fontSize: 13, fill: TEXT_COLOR, wordWrap: true, wordWrapWidth: W - 80 },
    });
    innDesc.position.set(30, startY + 55);
    this.container.addChild(innDesc);

    // Party status preview
    let previewY = startY + 110;
    for (const member of this.rpg.party) {
      const hpPct = Math.round((member.hp / member.maxHp) * 100);
      const mpPct = member.maxMp > 0 ? Math.round((member.mp / member.maxMp) * 100) : 100;
      const needsHeal = member.hp < member.maxHp || member.mp < member.maxMp;

      const memberText = new Text({
        text: `${member.name}  HP: ${member.hp}/${member.maxHp} (${hpPct}%)  MP: ${member.mp}/${member.maxMp} (${mpPct}%)${needsHeal ? "  *" : ""}`,
        style: { fontFamily: "monospace", fontSize: 12, fill: needsHeal ? 0xffaa44 : HP_GREEN },
      });
      memberText.position.set(40, previewY);
      this.container.addChild(memberText);
      previewY += 22;
    }

    // Rest button
    const buttonY = previewY + 30;
    const buttonG = new Graphics();
    buttonG.roundRect(W / 2 - 120, buttonY, 240, 40, 6);
    buttonG.fill({ color: canAfford ? 0x2a4a2e : 0x3a2a2a });
    buttonG.stroke({ color: canAfford ? HP_GREEN : 0x664444, width: 2 });
    this.container.addChild(buttonG);

    const buttonText = new Text({
      text: `Rest (${cost} gold)`,
      style: {
        fontFamily: "monospace",
        fontSize: 15,
        fill: canAfford ? 0xffffff : 0x664444,
        fontWeight: "bold",
      },
    });
    buttonText.anchor.set(0.5, 0.5);
    buttonText.position.set(W / 2, buttonY + 20);
    this.container.addChild(buttonText);

    if (!canAfford) {
      const noGold = new Text({
        text: "Not enough gold!",
        style: { fontFamily: "monospace", fontSize: 12, fill: 0xaa4444 },
      });
      noGold.anchor.set(0.5, 0);
      noGold.position.set(W / 2, buttonY + 48);
      this.container.addChild(noGold);
    }
  }

  // ---------------------------------------------------------------------------
  // Party tab
  // ---------------------------------------------------------------------------

  private _drawParty(W: number, H: number): void {
    const startY = 100;
    const g = new Graphics();

    g.roundRect(15, startY - 5, W - 30, H - startY - 60, 6);
    g.fill({ color: PANEL_COLOR, alpha: 0.8 });
    g.stroke({ color: BORDER_COLOR, width: 1 });
    this.container.addChild(g);

    if (this._partySubMode === "member_list") {
      this._drawMemberList(W, startY);
    } else if (this._partySubMode === "equip_slot") {
      this._drawEquipSlots(W, startY);
    } else if (this._partySubMode === "inventory_pick") {
      this._drawInventoryPick(W, H, startY);
    }
  }

  private _drawMemberList(W: number, startY: number): void {
    const party = this.rpg.party;

    for (let i = 0; i < party.length; i++) {
      const member = party[i];
      const y = startY + 10 + i * 80;
      const isSelected = i === this._partyIndex;

      if (isSelected) {
        const highlight = new Graphics();
        highlight.roundRect(20, y - 4, W - 44, 72, 4);
        highlight.fill({ color: 0x2a2a4e, alpha: 0.6 });
        this.container.addChild(highlight);
      }

      const cursor = isSelected ? ">" : " ";

      // Name and level
      const nameText = new Text({
        text: `${cursor} ${member.name}  Lv.${member.level}  (${member.unitType.replace(/_/g, " ")})`,
        style: {
          fontFamily: "monospace",
          fontSize: 14,
          fill: isSelected ? HIGHLIGHT_COLOR : 0xffffff,
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      nameText.position.set(30, y);
      this.container.addChild(nameText);

      // Stats
      const hpPct = Math.round((member.hp / member.maxHp) * 100);
      const statsLine = `HP: ${member.hp}/${member.maxHp}  MP: ${member.mp}/${member.maxMp}  ATK: ${member.atk}  DEF: ${member.def}  SPD: ${member.speed.toFixed(1)}`;
      const statsText = new Text({
        text: statsLine,
        style: { fontFamily: "monospace", fontSize: 11, fill: hpPct > 50 ? TEXT_COLOR : 0xffaa44 },
      });
      statsText.position.set(44, y + 20);
      this.container.addChild(statsText);

      // XP
      const xpText = new Text({
        text: `XP: ${member.xp}/${member.xpToNext}`,
        style: { fontFamily: "monospace", fontSize: 10, fill: DIM_TEXT },
      });
      xpText.position.set(44, y + 36);
      this.container.addChild(xpText);

      // Equipment summary
      const wep = member.equipment.weapon?.name ?? "None";
      const arm = member.equipment.armor?.name ?? "None";
      const acc = member.equipment.accessory?.name ?? "None";
      const equipText = new Text({
        text: `Weapon: ${wep}  |  Armor: ${arm}  |  Accessory: ${acc}`,
        style: { fontFamily: "monospace", fontSize: 10, fill: 0x8888aa },
      });
      equipText.position.set(44, y + 50);
      this.container.addChild(equipText);
    }
  }

  private _drawEquipSlots(W: number, startY: number): void {
    const member = this.rpg.party[this._partyIndex];
    if (!member) return;

    const title = new Text({
      text: `${member.name} - Equipment`,
      style: { fontFamily: "monospace", fontSize: 16, fill: 0xffffff, fontWeight: "bold" },
    });
    title.position.set(30, startY + 10);
    this.container.addChild(title);

    const slots: Array<{ label: string; slot: "weapon" | "armor" | "accessory"; item: RPGItem | null }> = [
      { label: "Weapon", slot: "weapon", item: member.equipment.weapon },
      { label: "Armor", slot: "armor", item: member.equipment.armor },
      { label: "Accessory", slot: "accessory", item: member.equipment.accessory },
    ];

    for (let i = 0; i < slots.length; i++) {
      const { label, item } = slots[i];
      const y = startY + 50 + i * 40;
      const isSelected = i === this._equipSlotIndex;

      if (isSelected) {
        const highlight = new Graphics();
        highlight.roundRect(20, y - 4, W - 44, 34, 3);
        highlight.fill({ color: 0x2a2a4e, alpha: 0.6 });
        this.container.addChild(highlight);
      }

      const cursor = isSelected ? ">" : " ";
      const itemName = item ? item.name : "(empty)";
      const statsStr = item ? `  ${_formatItemStats(item)}` : "";

      const slotText = new Text({
        text: `${cursor} ${label}: ${itemName}${statsStr}`,
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fill: isSelected ? HIGHLIGHT_COLOR : TEXT_COLOR,
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      slotText.position.set(30, y);
      this.container.addChild(slotText);
    }

    const hint = new Text({
      text: "Enter = Change equipment  |  Backspace = Unequip  |  Esc = Back",
      style: { fontFamily: "monospace", fontSize: 11, fill: DIM_TEXT },
    });
    hint.position.set(30, startY + 190);
    this.container.addChild(hint);
  }

  private _drawInventoryPick(W: number, _H: number, startY: number): void {
    const member = this.rpg.party[this._partyIndex];
    if (!member) return;

    const slotNames = ["weapon", "armor", "accessory"] as const;
    const targetSlot = slotNames[this._equipSlotIndex];

    const title = new Text({
      text: `Select ${targetSlot} for ${member.name}`,
      style: { fontFamily: "monospace", fontSize: 15, fill: 0xffffff, fontWeight: "bold" },
    });
    title.position.set(30, startY + 10);
    this.container.addChild(title);

    // Filter inventory to matching type
    const matchingItems = this.rpg.inventory.items.filter(
      s => s.item.type === targetSlot,
    );

    if (matchingItems.length === 0) {
      const empty = new Text({
        text: `No ${targetSlot} items in inventory.`,
        style: { fontFamily: "monospace", fontSize: 13, fill: DIM_TEXT },
      });
      empty.position.set(30, startY + 45);
      this.container.addChild(empty);
      return;
    }

    for (let i = 0; i < matchingItems.length; i++) {
      const { item, quantity } = matchingItems[i];
      const y = startY + 45 + i * 30;
      const isSelected = i === this._inventoryPickIndex;

      if (isSelected) {
        const highlight = new Graphics();
        highlight.roundRect(20, y - 2, W - 44, 26, 3);
        highlight.fill({ color: 0x2a2a4e, alpha: 0.6 });
        this.container.addChild(highlight);
      }

      const cursor = isSelected ? ">" : " ";
      const text = new Text({
        text: `${cursor} ${item.name} x${quantity}  ${_formatItemStats(item)}`,
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fill: isSelected ? HIGHLIGHT_COLOR : TEXT_COLOR,
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      text.position.set(30, y);
      this.container.addChild(text);
    }
  }

  // ---------------------------------------------------------------------------
  // Leave tab
  // ---------------------------------------------------------------------------

  private _drawLeave(W: number, H: number): void {
    const centerY = (H - 60) / 2;

    const leaveText = new Text({
      text: "Press Enter to leave town and return to the overworld.",
      style: {
        fontFamily: "monospace",
        fontSize: 16,
        fill: TEXT_COLOR,
        wordWrap: true,
        wordWrapWidth: W - 100,
        align: "center",
      },
    });
    leaveText.anchor.set(0.5, 0.5);
    leaveText.position.set(W / 2, centerY);
    this.container.addChild(leaveText);
  }

  // ---------------------------------------------------------------------------
  // Message & controls
  // ---------------------------------------------------------------------------

  private _drawMessage(W: number, H: number): void {
    const msgBg = new Graphics();
    msgBg.roundRect(W / 2 - 200, H - 110, 400, 30, 4);
    msgBg.fill({ color: 0x2a4a2e, alpha: 0.9 });
    this.container.addChild(msgBg);

    const msgText = new Text({
      text: this._message,
      style: { fontFamily: "monospace", fontSize: 13, fill: 0x88ff88, fontWeight: "bold" },
    });
    msgText.anchor.set(0.5, 0.5);
    msgText.position.set(W / 2, H - 95);
    this.container.addChild(msgText);
  }

  private _drawControls(W: number, H: number): void {
    const controlText = new Text({
      text: "Left/Right=Tab  Up/Down=Navigate  Enter=Select  Esc=Back",
      style: { fontFamily: "monospace", fontSize: 11, fill: DIM_TEXT },
    });
    controlText.anchor.set(0.5, 0);
    controlText.position.set(W / 2, H - 30);
    this.container.addChild(controlText);
  }

  private _showMessage(msg: string): void {
    this._message = msg;
    if (this._messageTimer) clearTimeout(this._messageTimer);
    this._messageTimer = setTimeout(() => {
      this._message = "";
      this._draw();
    }, 2000);
    this._draw();
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      const tab = TABS[this._activeTab];

      // Tab switching (when not in sub-menu)
      if (this._partySubMode === "member_list") {
        if (e.code === "ArrowLeft") {
          this._activeTab = Math.max(0, this._activeTab - 1);
          this._itemIndex = 0;
          this._draw();
          return;
        }
        if (e.code === "ArrowRight") {
          this._activeTab = Math.min(TABS.length - 1, this._activeTab + 1);
          this._itemIndex = 0;
          this._draw();
          return;
        }
      }

      switch (tab) {
        case "Shop":
          this._handleShopInput(e);
          break;
        case "Inn":
          this._handleInnInput(e);
          break;
        case "Party":
          this._handlePartyInput(e);
          break;
        case "Leave":
          this._handleLeaveInput(e);
          break;
      }
    };

    window.addEventListener("keydown", this._onKeyDown);
  }

  private _handleShopInput(e: KeyboardEvent): void {
    const items = this.townData.shopItems;

    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        this._itemIndex = Math.max(0, this._itemIndex - 1);
        this._draw();
        break;
      case "ArrowDown":
      case "KeyS":
        this._itemIndex = Math.min(items.length - 1, this._itemIndex + 1);
        this._draw();
        break;
      case "Enter":
      case "Space":
        if (this._itemIndex < items.length) {
          const item = items[this._itemIndex];
          if (buyItem(this.rpg, item)) {
            this._showMessage(`Bought ${item.name}!`);
          } else {
            this._showMessage("Not enough gold!");
          }
        }
        break;
      case "Escape":
        this.onLeave?.();
        break;
    }
  }

  private _handleInnInput(e: KeyboardEvent): void {
    switch (e.code) {
      case "Enter":
      case "Space":
        if (restAtInn(this.rpg, this.townData.innCost)) {
          this._showMessage("Party fully restored!");
        } else {
          this._showMessage("Not enough gold!");
        }
        break;
      case "Escape":
        this.onLeave?.();
        break;
    }
  }

  private _handlePartyInput(e: KeyboardEvent): void {
    if (this._partySubMode === "member_list") {
      this._handleMemberListInput(e);
    } else if (this._partySubMode === "equip_slot") {
      this._handleEquipSlotInput(e);
    } else if (this._partySubMode === "inventory_pick") {
      this._handleInventoryPickInput(e);
    }
  }

  private _handleMemberListInput(e: KeyboardEvent): void {
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        this._partyIndex = Math.max(0, this._partyIndex - 1);
        this._draw();
        break;
      case "ArrowDown":
      case "KeyS":
        this._partyIndex = Math.min(this.rpg.party.length - 1, this._partyIndex + 1);
        this._draw();
        break;
      case "Enter":
      case "Space":
        this._partySubMode = "equip_slot";
        this._equipSlotIndex = 0;
        this._draw();
        break;
      case "Escape":
        this.onLeave?.();
        break;
    }
  }

  private _handleEquipSlotInput(e: KeyboardEvent): void {
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        this._equipSlotIndex = Math.max(0, this._equipSlotIndex - 1);
        this._draw();
        break;
      case "ArrowDown":
      case "KeyS":
        this._equipSlotIndex = Math.min(2, this._equipSlotIndex + 1);
        this._draw();
        break;
      case "Enter":
      case "Space":
        this._partySubMode = "inventory_pick";
        this._inventoryPickIndex = 0;
        this._draw();
        break;
      case "Backspace": {
        // Unequip current slot
        const slotNames = ["weapon", "armor", "accessory"] as const;
        const slot = slotNames[this._equipSlotIndex];
        const member = this.rpg.party[this._partyIndex];
        if (member && member.equipment[slot]) {
          unequipItem(this.rpg, member.id, slot);
          this._showMessage(`Unequipped ${slot}.`);
        }
        break;
      }
      case "Escape":
        this._partySubMode = "member_list";
        this._draw();
        break;
    }
  }

  private _handleInventoryPickInput(e: KeyboardEvent): void {
    const slotNames = ["weapon", "armor", "accessory"] as const;
    const targetSlot = slotNames[this._equipSlotIndex];
    const matchingItems = this.rpg.inventory.items.filter(s => s.item.type === targetSlot);

    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        this._inventoryPickIndex = Math.max(0, this._inventoryPickIndex - 1);
        this._draw();
        break;
      case "ArrowDown":
      case "KeyS":
        this._inventoryPickIndex = Math.min(matchingItems.length - 1, this._inventoryPickIndex + 1);
        this._draw();
        break;
      case "Enter":
      case "Space":
        if (this._inventoryPickIndex < matchingItems.length) {
          const item = matchingItems[this._inventoryPickIndex].item;
          const member = this.rpg.party[this._partyIndex];
          if (member && equipItem(this.rpg, member.id, item.id)) {
            this._showMessage(`Equipped ${item.name}!`);
            this._partySubMode = "equip_slot";
          }
        }
        break;
      case "Escape":
        this._partySubMode = "equip_slot";
        this._draw();
        break;
    }
  }

  private _handleLeaveInput(e: KeyboardEvent): void {
    if (e.code === "Enter" || e.code === "Space" || e.code === "Escape") {
      this.onLeave?.();
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _formatItemStats(item: RPGItem): string {
  const parts: string[] = [];
  if (item.stats.atk) parts.push(`ATK+${item.stats.atk}`);
  if (item.stats.def) parts.push(`DEF+${item.stats.def}`);
  if (item.stats.hp) parts.push(`HP+${item.stats.hp}`);
  if (item.stats.mp) parts.push(`MP+${item.stats.mp}`);
  if (item.stats.speed) parts.push(`SPD${item.stats.speed > 0 ? "+" : ""}${item.stats.speed}`);
  return parts.join("  ");
}
