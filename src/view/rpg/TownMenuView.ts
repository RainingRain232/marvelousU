// Full-screen town menu — shop, inn, party/equipment, leave
import { Container, Graphics, Text } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { RPGState, RPGItem, EquipmentSlots, PartyMember } from "@rpg/state/RPGState";
import type { TownData, RecruitData } from "@rpg/state/OverworldState";
import { buyItem, sellItem, equipItem, unequipItem, restAtInn } from "@rpg/systems/EquipmentSystem";
import { generateRecruits, recruitUnit } from "@rpg/systems/RecruitSystem";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";

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

const RECRUIT_COLOR = 0x44aacc;

const TABS = ["Shop", "Inn", "Recruit", "Party", "Leave"] as const;

// Tab icon glyphs (simple Unicode symbols)
const TAB_ICONS: Record<string, string> = {
  Shop: "\u2692",      // crossed hammers (⚒)
  Inn: "\u2615",       // hot beverage (☕)
  Recruit: "\u2694",   // crossed swords (⚔)
  Party: "\u2666",     // diamond (♦)
  Leave: "\u2192",     // right arrow (→)
};

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
  private _shopMode: "buy" | "sell" = "buy";
  private _itemIndex: number = 0;
  private _partyIndex: number = 0;
  private _partySubMode: PartySubMode = "member_list";
  private _equipSlotIndex: number = 0;
  private _inventoryPickIndex: number = 0;
  private _recruitIndex: number = 0;
  private _recruits: RecruitData[] = [];
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

    // Generate recruits for this visit
    this._recruits = generateRecruits(rpg);

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
      case "Recruit":
        this._drawRecruit(W, H);
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

    for (let i = 0; i < TABS.length; i++) {
      const x = 20 + i * tabWidth;
      const isActive = i === this._activeTab;
      const tabName = TABS[i];
      const icon = TAB_ICONS[tabName] ?? "";

      // Clickable tab container
      const tab = new Container();
      tab.position.set(x, y);
      tab.eventMode = "static";
      tab.cursor = "pointer";
      tab.on("pointerdown", () => {
        if (this._activeTab !== i) {
          this._activeTab = i;
          this._itemIndex = 0;
          this._partyIndex = 0;
          this._recruitIndex = 0;
          this._draw();
        }
      });

      const g = new Graphics();
      g.roundRect(0, 0, tabWidth - 4, 30, 4);
      g.fill({ color: isActive ? TAB_ACTIVE_COLOR : PANEL_COLOR });
      g.stroke({ color: isActive ? HIGHLIGHT_COLOR : BORDER_COLOR, width: isActive ? 2 : 1 });
      tab.addChild(g);

      const text = new Text({
        text: `${icon} ${tabName}`,
        style: {
          fontFamily: "monospace",
          fontSize: 12,
          fill: isActive ? HIGHLIGHT_COLOR : TEXT_COLOR,
          fontWeight: isActive ? "bold" : "normal",
        },
      });
      text.anchor.set(0.5, 0.5);
      text.position.set((tabWidth - 4) / 2, 15);
      tab.addChild(text);

      this.container.addChild(tab);
    }
  }

  // ---------------------------------------------------------------------------
  // Shop tab
  // ---------------------------------------------------------------------------

  private _drawShop(W: number, H: number): void {
    const startY = 100;
    const g = new Graphics();

    // Panel background
    g.roundRect(15, startY - 5, W - 30, H - startY - 60, 6);
    g.fill({ color: PANEL_COLOR, alpha: 0.8 });
    g.stroke({ color: BORDER_COLOR, width: 1 });
    this.container.addChild(g);

    // Buy/Sell mode toggle header
    const buyLabel = this._shopMode === "buy" ? "[BUY]" : " BUY ";
    const sellLabel = this._shopMode === "sell" ? "[SELL]" : " SELL ";
    const modeText = new Text({
      text: `Tab: ${buyLabel}  ${sellLabel}`,
      style: { fontFamily: "monospace", fontSize: 12, fill: HIGHLIGHT_COLOR },
    });
    modeText.position.set(20, startY + 2);
    this.container.addChild(modeText);

    if (this._shopMode === "buy") {
      this._drawShopBuy(W, H, startY + 22);
    } else {
      this._drawShopSell(W, H, startY + 22);
    }
  }

  private _drawShopBuy(W: number, H: number, startY: number): void {
    const items = this.townData.shopItems;

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

  private _drawShopSell(W: number, H: number, startY: number): void {
    const invItems = this.rpg.inventory.items;

    if (invItems.length === 0) {
      const empty = new Text({
        text: "No items to sell.",
        style: { fontFamily: "monospace", fontSize: 14, fill: DIM_TEXT },
      });
      empty.position.set(30, startY + 15);
      this.container.addChild(empty);
      return;
    }

    for (let i = 0; i < invItems.length; i++) {
      const { item, quantity } = invItems[i];
      const y = startY + 10 + i * 32;
      const isSelected = i === this._itemIndex;

      if (isSelected) {
        const highlight = new Graphics();
        highlight.roundRect(20, y - 2, W - 44, 28, 3);
        highlight.fill({ color: 0x2a2a4e, alpha: 0.8 });
        this.container.addChild(highlight);
      }

      const cursor = isSelected ? ">" : " ";
      const sellPrice = Math.floor(item.value / 2);

      const nameText = new Text({
        text: `${cursor} ${item.name} x${quantity}`,
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fill: isSelected ? HIGHLIGHT_COLOR : TEXT_COLOR,
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      nameText.position.set(30, y);
      this.container.addChild(nameText);

      const priceText = new Text({
        text: `${sellPrice}g`,
        style: { fontFamily: "monospace", fontSize: 13, fill: GOLD_COLOR },
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
    if (this._itemIndex < invItems.length) {
      const desc = new Text({
        text: invItems[this._itemIndex].item.description,
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
  // Recruit tab
  // ---------------------------------------------------------------------------

  private _drawRecruit(W: number, H: number): void {
    const startY = 100;
    const g = new Graphics();

    g.roundRect(15, startY - 5, W - 30, H - startY - 60, 6);
    g.fill({ color: PANEL_COLOR, alpha: 0.8 });
    g.stroke({ color: BORDER_COLOR, width: 1 });
    this.container.addChild(g);

    // Header
    const partyCount = this.rpg.party.length;
    const maxParty = RPGBalance.MAX_PARTY_SIZE;
    const headerText = new Text({
      text: `\u2694 Hire Adventurers  (Party: ${partyCount}/${maxParty})`,
      style: { fontFamily: "monospace", fontSize: 15, fill: RECRUIT_COLOR, fontWeight: "bold" },
    });
    headerText.position.set(25, startY + 6);
    this.container.addChild(headerText);

    if (this._recruits.length === 0) {
      const empty = new Text({
        text: "No adventurers available for hire.",
        style: { fontFamily: "monospace", fontSize: 13, fill: DIM_TEXT },
      });
      empty.position.set(30, startY + 40);
      this.container.addChild(empty);
      return;
    }

    const rowH = 56;
    for (let i = 0; i < this._recruits.length; i++) {
      const recruit = this._recruits[i];
      const y = startY + 32 + i * rowH;
      const isSelected = i === this._recruitIndex;
      const canAfford = this.rpg.gold >= recruit.cost;
      const partyFull = partyCount >= maxParty;

      if (isSelected) {
        const highlight = new Graphics();
        highlight.roundRect(20, y - 2, W - 44, rowH - 6, 4);
        highlight.fill({ color: 0x1a2a3e, alpha: 0.8 });
        this.container.addChild(highlight);
      }

      const cursor = isSelected ? ">" : " ";
      // Unit type icon
      const typeIcon = _unitTypeIcon(recruit.unitType);

      const nameText = new Text({
        text: `${cursor} ${typeIcon} ${recruit.name}  Lv.${recruit.level}  (${recruit.unitType.replace(/_/g, " ")})`,
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fill: isSelected ? HIGHLIGHT_COLOR : (!canAfford || partyFull ? 0x666688 : TEXT_COLOR),
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      nameText.position.set(30, y + 2);
      this.container.addChild(nameText);

      // Cost
      const costText = new Text({
        text: `${recruit.cost}g`,
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fill: canAfford ? GOLD_COLOR : 0x664444,
          fontWeight: "bold",
        },
      });
      costText.anchor.set(1, 0);
      costText.position.set(W - 30, y + 2);
      this.container.addChild(costText);

      // Abilities
      const abilities = recruit.abilityTypes?.length
        ? recruit.abilityTypes.map(a => a.replace(/_/g, " ")).join(", ")
        : "no special abilities";
      const abilityText = new Text({
        text: `Abilities: ${abilities}`,
        style: { fontFamily: "monospace", fontSize: 10, fill: DIM_TEXT },
      });
      abilityText.position.set(50, y + 22);
      this.container.addChild(abilityText);
    }

    // Selected recruit description
    if (this._recruitIndex < this._recruits.length) {
      const recruit = this._recruits[this._recruitIndex];
      const desc = new Text({
        text: recruit.description,
        style: {
          fontFamily: "monospace",
          fontSize: 12,
          fill: TEXT_COLOR,
          wordWrap: true,
          wordWrapWidth: W - 60,
        },
      });
      desc.position.set(30, H - 105);
      this.container.addChild(desc);

      // Status line
      const partyFull = partyCount >= maxParty;
      const canAfford = this.rpg.gold >= recruit.cost;
      let status = "";
      if (partyFull) status = "Party is full!";
      else if (!canAfford) status = "Not enough gold!";
      else status = "Press Enter to hire";

      const statusText = new Text({
        text: status,
        style: {
          fontFamily: "monospace",
          fontSize: 12,
          fill: partyFull || !canAfford ? 0xaa4444 : HP_GREEN,
          fontWeight: "bold",
        },
      });
      statusText.position.set(30, H - 80);
      this.container.addChild(statusText);
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

    const slotDefs = _allSlotDefs(member);

    const slotSpacing = 28;
    for (let i = 0; i < slotDefs.length; i++) {
      const { label, item } = slotDefs[i];
      const y = startY + 50 + i * slotSpacing;
      const isSelected = i === this._equipSlotIndex;

      if (isSelected) {
        const highlight = new Graphics();
        highlight.roundRect(20, y - 3, W - 44, slotSpacing - 2, 3);
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
          fontSize: 12,
          fill: isSelected ? HIGHLIGHT_COLOR : TEXT_COLOR,
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      slotText.position.set(30, y);
      this.container.addChild(slotText);
    }

    const hint = new Text({
      text: "Enter = Change  |  Backspace = Unequip  |  Esc = Back",
      style: { fontFamily: "monospace", fontSize: 11, fill: DIM_TEXT },
    });
    hint.position.set(30, startY + 50 + slotDefs.length * slotSpacing + 8);
    this.container.addChild(hint);
  }

  private _drawInventoryPick(W: number, _H: number, startY: number): void {
    const member = this.rpg.party[this._partyIndex];
    if (!member) return;

    const targetSlot = _SLOT_KEYS[this._equipSlotIndex];

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
    const tab = TABS[this._activeTab];
    const extra = tab === "Shop" ? "  Tab=Buy/Sell" : "";
    const controlText = new Text({
      text: `Left/Right=Tab  Up/Down=Navigate  Enter=Select  Esc=Back${extra}`,
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
        case "Recruit":
          this._handleRecruitInput(e);
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
    if (e.code === "Tab") {
      e.preventDefault();
      this._shopMode = this._shopMode === "buy" ? "sell" : "buy";
      this._itemIndex = 0;
      this._draw();
      return;
    }

    if (this._shopMode === "buy") {
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
    } else {
      const invItems = this.rpg.inventory.items;
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          this._itemIndex = Math.max(0, this._itemIndex - 1);
          this._draw();
          break;
        case "ArrowDown":
        case "KeyS":
          this._itemIndex = Math.min(invItems.length - 1, this._itemIndex + 1);
          this._draw();
          break;
        case "Enter":
        case "Space":
          if (this._itemIndex < invItems.length) {
            const item = invItems[this._itemIndex].item;
            const sellPrice = Math.floor(item.value / 2);
            if (sellItem(this.rpg, item.id)) {
              this._showMessage(`Sold ${item.name} for ${sellPrice}g!`);
              if (this._itemIndex >= this.rpg.inventory.items.length) {
                this._itemIndex = Math.max(0, this.rpg.inventory.items.length - 1);
              }
            }
          }
          break;
        case "Escape":
          this.onLeave?.();
          break;
      }
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

  private _handleRecruitInput(e: KeyboardEvent): void {
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        this._recruitIndex = Math.max(0, this._recruitIndex - 1);
        this._draw();
        break;
      case "ArrowDown":
      case "KeyS":
        this._recruitIndex = Math.min(this._recruits.length - 1, this._recruitIndex + 1);
        this._draw();
        break;
      case "Enter":
      case "Space":
        if (this._recruitIndex < this._recruits.length) {
          const recruit = this._recruits[this._recruitIndex];
          if (this.rpg.party.length >= RPGBalance.MAX_PARTY_SIZE) {
            this._showMessage("Party is full! (Max " + RPGBalance.MAX_PARTY_SIZE + ")");
          } else if (recruitUnit(this.rpg, recruit)) {
            this._showMessage(`${recruit.name} joined the party!`);
            // Remove recruited unit from the list
            this._recruits.splice(this._recruitIndex, 1);
            if (this._recruitIndex >= this._recruits.length) {
              this._recruitIndex = Math.max(0, this._recruits.length - 1);
            }
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
        this._equipSlotIndex = Math.min(_SLOT_KEYS.length - 1, this._equipSlotIndex + 1);
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
        const slot = _SLOT_KEYS[this._equipSlotIndex];
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
    const targetSlot = _SLOT_KEYS[this._equipSlotIndex];
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

const _SLOT_KEYS: (keyof EquipmentSlots)[] = [
  "weapon", "armor", "helmet", "shield", "legs", "boots", "ring", "accessory",
];

const _SLOT_LABELS: Record<keyof EquipmentSlots, string> = {
  weapon: "Weapon",
  armor: "Armor",
  helmet: "Helmet",
  shield: "Shield",
  legs: "Legs",
  boots: "Boots",
  ring: "Ring",
  accessory: "Accessory",
};

function _allSlotDefs(member: PartyMember): Array<{ label: string; slot: keyof EquipmentSlots; item: RPGItem | null }> {
  return _SLOT_KEYS.map(slot => ({
    label: _SLOT_LABELS[slot],
    slot,
    item: member.equipment[slot],
  }));
}

function _formatItemStats(item: RPGItem): string {
  const parts: string[] = [];
  if (item.stats.atk) parts.push(`ATK+${item.stats.atk}`);
  if (item.stats.def) parts.push(`DEF+${item.stats.def}`);
  if (item.stats.hp) parts.push(`HP+${item.stats.hp}`);
  if (item.stats.mp) parts.push(`MP+${item.stats.mp}`);
  if (item.stats.speed) parts.push(`SPD${item.stats.speed > 0 ? "+" : ""}${item.stats.speed}`);
  return parts.join("  ");
}

function _unitTypeIcon(unitType: string): string {
  switch (unitType) {
    case "knight": return "\u265E";        // chess knight (♞)
    case "swordsman": return "\u2694";     // crossed swords (⚔)
    case "templar": return "\u2720";       // maltese cross (✠)
    case "archer": return "\u2192";        // right arrow (→)
    case "longbowman": return "\u27B9";    // double arrow (➹)
    case "crossbowman": return "\u2295";   // circled plus (⊕)
    case "fire_mage": return "\u2668";     // hot springs/fire (♨)
    case "storm_mage": return "\u26A1";    // lightning (⚡)
    case "pikeman": return "\u2191";       // up arrow (↑)
    case "assassin": return "\u2620";      // skull (☠)
    case "mage_hunter": return "\u2623";   // biohazard (☣)
    case "repeater": return "\u00BB";      // double right angle (»)
    default: return "\u2022";              // bullet (•)
  }
}
