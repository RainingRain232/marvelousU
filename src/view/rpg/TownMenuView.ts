// Full-screen town menu — shop, inn, party/equipment, leave
import { Container, Graphics, Text, Sprite, Assets, Texture } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { RPGState, RPGItem, EquipmentSlots, PartyMember } from "@rpg/state/RPGState";
import type { TownData, RecruitData, ArcaneLibraryData } from "@rpg/state/OverworldState";
import { buyItem, sellItem, equipItem, unequipItem, restAtInn } from "@rpg/systems/EquipmentSystem";
import { generateRecruits, recruitUnit } from "@rpg/systems/RecruitSystem";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";
import { RPG_SPELL_DEFS, spellPrice } from "@rpg/config/RPGSpellDefs";
import { isCaster, accessibleSchools, maxKnownSpells, learnSpells } from "@rpg/systems/SpellLearningSystem";
import type { UpgradeType } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import { canPromote, getAvailablePromotions, applyPromotion } from "@rpg/systems/PromotionSystem";
import { getAvailableArenaTiers } from "@rpg/config/ArenaDefs";
import { canFightInArena, getArenaEncounter } from "@rpg/systems/ArenaSystem";
import { CRAFTING_RECIPES, CRAFT_MATERIALS } from "@rpg/config/CraftingDefs";
import { canCraft, craft } from "@rpg/systems/CraftingSystem";
import { MASTERY_BONUSES } from "@rpg/config/MasteryDefs";
import { t } from "@/i18n/i18n";

// Pixel art banner images per tab
import armoryImgUrl from "@/img/armory.png";
import merlinImgUrl from "@/img/merlin.png";
import tavernImgUrl from "@/img/manP.png";
import throneImgUrl from "@/img/throne.png";
import displaycaseImgUrl from "@/img/displaycase.png";

const TAB_BANNER_URLS: Record<string, string> = {
  Shop: armoryImgUrl,
  Spells: merlinImgUrl,
  Inn: tavernImgUrl,
  Recruit: throneImgUrl,
  Party: displaycaseImgUrl,
};

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

const TABS = ["Shop", "Spells", "Inn", "Recruit", "Party", "Arena", "Forge", "Leave"] as const;

// Tab icon glyphs (simple Unicode symbols)
const TAB_ICONS: Record<string, string> = {
  Shop: "\u2692",      // crossed hammers (⚒)
  Spells: "\u2728",    // sparkles (✨)
  Inn: "\u2615",       // hot beverage (☕)
  Recruit: "\u2694",   // crossed swords (⚔)
  Party: "\u2666",     // diamond (♦)
  Arena: "\u2603",     // arena/colosseum (☃)
  Forge: "\u2692",     // hammer & pick (⚒)
  Leave: "\u2192",     // right arrow (→)
};

const SPELL_COLOR = 0xaa66ff;

// Sub-modes within Party tab
type PartySubMode = "member_list" | "equip_slot" | "inventory_pick" | "promotion_pick" | "mastery_pick";

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
  private _spellIndex: number = 0;
  private _spellBuyerIndex: number = 0;
  private _spellSubMode: "spell_list" | "buyer_pick" = "spell_list";
  private _arcaneLibData: ArcaneLibraryData | null = null;
  private _message: string = "";
  private _messageTimer: ReturnType<typeof setTimeout> | null = null;
  /** Incremented on every _draw() so stale async callbacks can be skipped. */
  private _drawGeneration = 0;

  // Arena state
  private _arenaIndex: number = 0;
  private _arenaBetIndex: number = 0; // index into current tier's betAmounts

  // Forge/Crafting state
  private _forgeIndex: number = 0;

  // Promotion state
  private _promotionIndex: number = 0;

  // Mastery state
  private _masteryIndex: number = 0;

  // Purchase confirmation dialog state
  private _confirmDialog: {
    message: string;
    onYes: () => void;
    onNo: () => void;
  } | null = null;

  // Callbacks
  onLeave: (() => void) | null = null;

  init(vm: ViewManager, rpg: RPGState, townData: TownData, townName: string, arcaneLibData?: ArcaneLibraryData): void {
    this.vm = vm;
    this.rpg = rpg;
    this.townData = townData;
    this.townName = townName;
    this._arcaneLibData = arcaneLibData ?? null;

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
    // Destroy all old children (Graphics, Text, interactive Containers + their listeners)
    this._drawGeneration++;
    while (this.container.children.length > 0) {
      this.container.children[0].destroy({ children: true });
    }

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

    // Tab banner image (right side)
    const tab = TABS[this._activeTab];
    this._drawTabBanner(tab, W);
    switch (tab) {
      case "Shop":
        this._drawShop(W, H);
        break;
      case "Spells":
        this._drawSpells(W, H);
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
      case "Arena":
        this._drawArena(W, H);
        break;
      case "Forge":
        this._drawForge(W, H);
        break;
      case "Leave":
        this._drawLeave(W, H);
        break;
    }

    // Message bar
    if (this._message) {
      this._drawMessage(W, H);
    }

    // Confirmation dialog overlay
    if (this._confirmDialog) {
      this._drawConfirmDialog(W, H);
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

    // Reputation stars
    const townRep = (this.rpg as any).townReputation?.[this.townName] ?? 0;
    const maxStars = 10;
    const filled = Math.min(townRep, maxStars);
    const starStr = "\u2605".repeat(filled) + "\u2606".repeat(maxStars - filled);
    const repText = new Text({
      text: `Rep: ${starStr}`,
      style: { fontFamily: "monospace", fontSize: 13, fill: GOLD_COLOR },
    });
    repText.position.set(20, 36);
    this.container.addChild(repText);

    if (townRep >= 3) {
      const discountText = new Text({
        text: t("rpg.discount"),
        style: { fontFamily: "monospace", fontSize: 11, fill: HP_GREEN, fontWeight: "bold" },
      });
      discountText.position.set(repText.x + repText.width + 12, 38);
      this.container.addChild(discountText);
    }

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

  private _drawTabBanner(tabName: string, W: number): void {
    const url = TAB_BANNER_URLS[tabName];
    if (!url) return;

    const bannerSize = Math.min(220, W * 0.28);
    const bx = W - bannerSize - 20;
    const by = 92;

    // Frame
    const frame = new Graphics();
    frame.roundRect(bx - 4, by - 4, bannerSize + 8, bannerSize + 8, 6);
    frame.fill({ color: PANEL_COLOR, alpha: 0.9 });
    frame.stroke({ color: BORDER_COLOR, width: 2 });
    this.container.addChild(frame);

    const gen = this._drawGeneration;
    void Assets.load(url).then((tex: Texture) => {
      if (this.container.destroyed || this._drawGeneration !== gen) return;
      const sprite = new Sprite(tex);
      const scale = Math.min(bannerSize / tex.width, bannerSize / tex.height);
      sprite.scale.set(scale);
      sprite.position.set(
        bx + (bannerSize - tex.width * scale) / 2,
        by + (bannerSize - tex.height * scale) / 2,
      );
      // Round the corners via a mask
      const mask = new Graphics();
      mask.roundRect(bx, by, bannerSize, bannerSize, 4);
      mask.fill({ color: 0xffffff });
      this.container.addChild(mask);
      sprite.mask = mask;
      this.container.addChild(sprite);
    });
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
        text: t("rpg.no_items_sale"),
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
        text: t("rpg.no_items_sell"),
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
  // Spells (Magic Shop) tab
  // ---------------------------------------------------------------------------

  private _getSpellList(): string[] {
    if (this._arcaneLibData) return this._arcaneLibData.spells ?? [];
    return this.townData.magicShopSpells ?? [];
  }

  private _drawSpells(W: number, H: number): void {
    const startY = 100;
    const g = new Graphics();
    g.roundRect(15, startY - 5, W - 30, H - startY - 60, 6);
    g.fill({ color: PANEL_COLOR, alpha: 0.8 });
    g.stroke({ color: BORDER_COLOR, width: 1 });
    this.container.addChild(g);

    const isLibrary = !!this._arcaneLibData;
    const headerLabel = isLibrary ? "\u2728 Arcane Library" : "\u2728 Magic Shop";

    const header = new Text({
      text: headerLabel,
      style: { fontFamily: "monospace", fontSize: 15, fill: SPELL_COLOR, fontWeight: "bold" },
    });
    header.position.set(25, startY + 6);
    this.container.addChild(header);

    if (this._spellSubMode === "buyer_pick") {
      this._drawSpellBuyerPick(W, H, startY + 28);
      return;
    }

    const spells = this._getSpellList();
    if (spells.length === 0) {
      const empty = new Text({
        text: t("rpg.no_spells_sale"),
        style: { fontFamily: "monospace", fontSize: 14, fill: DIM_TEXT },
      });
      empty.position.set(30, startY + 40);
      this.container.addChild(empty);
      return;
    }

    for (let i = 0; i < spells.length; i++) {
      const spellId = spells[i];
      const spellDef = RPG_SPELL_DEFS[spellId];
      if (!spellDef) continue;

      const y = startY + 32 + i * 38;
      const isSelected = i === this._spellIndex;
      const price = spellPrice(spellId);
      const canAfford = this.rpg.gold >= price;

      if (isSelected) {
        const highlight = new Graphics();
        highlight.roundRect(20, y - 2, W - 44, 34, 3);
        highlight.fill({ color: 0x2a1a4e, alpha: 0.8 });
        this.container.addChild(highlight);
      }

      const cursor = isSelected ? ">" : " ";
      const tierLabel = `T${spellDef.tier}`;
      const schoolLabel = spellDef.school.charAt(0).toUpperCase() + spellDef.school.slice(1);

      const nameText = new Text({
        text: `${cursor} ${spellDef.name}`,
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
        text: `${price}g`,
        style: { fontFamily: "monospace", fontSize: 13, fill: canAfford ? GOLD_COLOR : 0x664444 },
      });
      priceText.anchor.set(1, 0);
      priceText.position.set(W - 30, y);
      this.container.addChild(priceText);

      const detailText = new Text({
        text: `${tierLabel} ${schoolLabel}  MP:${spellDef.mpCost}  ${spellDef.isHeal ? "Heal" : spellDef.isSummon ? "Summon" : `Dmg x${spellDef.multiplier}`}`,
        style: { fontFamily: "monospace", fontSize: 10, fill: DIM_TEXT },
      });
      detailText.position.set(50, y + 16);
      this.container.addChild(detailText);
    }

    // Description of selected spell
    if (this._spellIndex < spells.length) {
      const spellDef = RPG_SPELL_DEFS[spells[this._spellIndex]];
      if (spellDef) {
        const desc = new Text({
          text: spellDef.description,
          style: { fontFamily: "monospace", fontSize: 12, fill: TEXT_COLOR, wordWrap: true, wordWrapWidth: W - 60 },
        });
        desc.position.set(30, H - 90);
        this.container.addChild(desc);
      }
    }
  }

  private _drawSpellBuyerPick(W: number, _H: number, startY: number): void {
    const spells = this._getSpellList();
    const spellId = spells[this._spellIndex];
    const spellDef = RPG_SPELL_DEFS[spellId];
    if (!spellDef) return;

    const title = new Text({
      text: `Who should learn ${spellDef.name}?`,
      style: { fontFamily: "monospace", fontSize: 14, fill: SPELL_COLOR, fontWeight: "bold" },
    });
    title.position.set(30, startY + 5);
    this.container.addChild(title);

    const casters = this.rpg.party.filter(m => isCaster(m.unitType));
    if (casters.length === 0) {
      const noOne = new Text({
        text: t("rpg.no_magic_users"),
        style: { fontFamily: "monospace", fontSize: 13, fill: 0xaa4444 },
      });
      noOne.position.set(30, startY + 35);
      this.container.addChild(noOne);
      return;
    }

    for (let i = 0; i < casters.length; i++) {
      const member = casters[i];
      const y = startY + 35 + i * 40;
      const isSelected = i === this._spellBuyerIndex;
      const schools = new Set(accessibleSchools(member.unitType));
      const canLearnSchool = schools.has(spellDef.school);
      const alreadyKnows = member.knownSpells.includes(spellId as UpgradeType);
      const atMax = member.knownSpells.length >= maxKnownSpells(member);
      const canLearn = canLearnSchool && !alreadyKnows && !atMax;

      if (isSelected) {
        const highlight = new Graphics();
        highlight.roundRect(20, y - 2, W - 44, 36, 3);
        highlight.fill({ color: 0x2a1a4e, alpha: 0.6 });
        this.container.addChild(highlight);
      }

      const cursor = isSelected ? ">" : " ";
      let statusStr = "";
      if (alreadyKnows) statusStr = " (already known)";
      else if (!canLearnSchool) statusStr = " (wrong school)";
      else if (atMax) statusStr = " (spells full)";

      const memberText = new Text({
        text: `${cursor} ${member.name} Lv.${member.level} (${member.unitType.replace(/_/g, " ")})${statusStr}`,
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fill: isSelected ? HIGHLIGHT_COLOR : (canLearn ? TEXT_COLOR : 0x666688),
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      memberText.position.set(30, y);
      this.container.addChild(memberText);

      const knownText = new Text({
        text: `Known: ${member.knownSpells.length}/${maxKnownSpells(member)} spells`,
        style: { fontFamily: "monospace", fontSize: 10, fill: DIM_TEXT },
      });
      knownText.position.set(50, y + 18);
      this.container.addChild(knownText);
    }
  }

  private _handleSpellsInput(e: KeyboardEvent): void {
    if (this._spellSubMode === "buyer_pick") {
      this._handleSpellBuyerInput(e);
      return;
    }

    const spells = this._getSpellList();

    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        this._spellIndex = Math.max(0, this._spellIndex - 1);
        this._draw();
        break;
      case "ArrowDown":
      case "KeyS":
        this._spellIndex = Math.min(spells.length - 1, this._spellIndex + 1);
        this._draw();
        break;
      case "Enter":
      case "Space":
        if (this._spellIndex < spells.length) {
          const price = spellPrice(spells[this._spellIndex]);
          if (this.rpg.gold < price) {
            this._showMessage(t("rpg.not_enough_gold"));
          } else {
            this._spellSubMode = "buyer_pick";
            this._spellBuyerIndex = 0;
            this._draw();
          }
        }
        break;
      case "Escape":
        this.onLeave?.();
        break;
    }
  }

  private _handleSpellBuyerInput(e: KeyboardEvent): void {
    const casters = this.rpg.party.filter(m => isCaster(m.unitType));
    const spells = this._getSpellList();
    const spellId = spells[this._spellIndex];
    const spellDef = RPG_SPELL_DEFS[spellId];

    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        this._spellBuyerIndex = Math.max(0, this._spellBuyerIndex - 1);
        this._draw();
        break;
      case "ArrowDown":
      case "KeyS":
        this._spellBuyerIndex = Math.min(casters.length - 1, this._spellBuyerIndex + 1);
        this._draw();
        break;
      case "Enter":
      case "Space": {
        if (this._spellBuyerIndex >= casters.length || !spellDef) break;
        const member = casters[this._spellBuyerIndex];
        const schools = new Set(accessibleSchools(member.unitType));
        const alreadyKnows = member.knownSpells.includes(spellId as UpgradeType);
        const atMax = member.knownSpells.length >= maxKnownSpells(member);

        if (alreadyKnows) {
          this._showMessage(`${member.name} already knows ${spellDef.name}!`);
        } else if (!schools.has(spellDef.school)) {
          this._showMessage(`${member.name} can't learn ${spellDef.school} spells!`);
        } else if (atMax) {
          this._showMessage(`${member.name}'s spell slots are full!`);
        } else {
          const price = spellPrice(spellId);
          if (this.rpg.gold < price) {
            this._showMessage(t("rpg.not_enough_gold"));
          } else {
            this.rpg.gold -= price;
            const learned = learnSpells(member, [spellId as UpgradeType]);
            if (learned.length > 0) {
              this._showMessage(`${member.name} learned ${spellDef.name}!`);
              EventBus.emit("rpgSpellLearned", { memberId: member.id, spellId });
              // Remove from shop
              const shopSpells = this._getSpellList();
              const idx = shopSpells.indexOf(spellId);
              if (idx >= 0) shopSpells.splice(idx, 1);
            }
            this._spellSubMode = "spell_list";
          }
        }
        break;
      }
      case "Escape":
        this._spellSubMode = "spell_list";
        this._draw();
        break;
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
      text: t("rpg.inn_welcome"),
      style: { fontFamily: "monospace", fontSize: 18, fill: 0xffffff, fontWeight: "bold" },
    });
    innTitle.position.set(30, startY + 20);
    this.container.addChild(innTitle);

    const innDesc = new Text({
      text: t("rpg.inn_desc"),
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
        text: t("rpg.not_enough_gold"),
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
        text: t("rpg.no_adventurers"),
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
      else if (!canAfford) status = t("rpg.not_enough_gold");
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
    } else if (this._partySubMode === "promotion_pick") {
      this._drawPromotionPick(W, startY);
    } else if (this._partySubMode === "mastery_pick") {
      this._drawMasteryPick(W, startY);
    }
  }

  private _drawMemberList(W: number, startY: number): void {
    const party = this.rpg.party;
    const rowHeight = 100; // Increased to fit promote/mastery info

    for (let i = 0; i < party.length; i++) {
      const member = party[i];
      const y = startY + 10 + i * rowHeight;
      const isSelected = i === this._partyIndex;

      if (isSelected) {
        const highlight = new Graphics();
        highlight.roundRect(20, y - 4, W - 44, rowHeight - 8, 4);
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

      // Promote button (if available)
      if (canPromote(member)) {
        const promoPath = getAvailablePromotions(member);
        const cost = promoPath?.goldCost ?? 200;
        const canAffordPromo = this.rpg.gold >= cost;

        const promoBtn = new Container();
        promoBtn.position.set(W - 170, y + 2);
        promoBtn.eventMode = "static";
        promoBtn.cursor = "pointer";
        const capturedIndex = i;
        promoBtn.on("pointerdown", () => {
          this._partyIndex = capturedIndex;
          this._partySubMode = "promotion_pick";
          this._promotionIndex = 0;
          this._draw();
        });

        const promoBg = new Graphics();
        promoBg.roundRect(0, 0, 130, 22, 4);
        promoBg.fill({ color: canAffordPromo ? 0x2a4a2e : 0x3a2a2a });
        promoBg.stroke({ color: canAffordPromo ? HP_GREEN : 0x664444, width: 1 });
        promoBtn.addChild(promoBg);

        const promoText = new Text({
          text: `Promote (${cost}g)`,
          style: { fontFamily: "monospace", fontSize: 10, fill: canAffordPromo ? 0xffffff : 0x664444, fontWeight: "bold" },
        });
        promoText.anchor.set(0.5, 0.5);
        promoText.position.set(65, 11);
        promoBtn.addChild(promoText);

        this.container.addChild(promoBtn);
      }

      // Mastery info (if member has mastery points)
      const masteryPoints = (member as any).masteryPoints ?? 0;
      if (masteryPoints > 0) {
        const masteryText = new Text({
          text: `\u2728 Mastery Points: ${masteryPoints}  [P=Mastery]`,
          style: { fontFamily: "monospace", fontSize: 10, fill: SPELL_COLOR },
        });
        masteryText.position.set(44, y + 66);
        this.container.addChild(masteryText);
      }
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
      text: t("rpg.equip_controls"),
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
  // Promotion pick (Party sub-mode)
  // ---------------------------------------------------------------------------

  private _drawPromotionPick(W: number, startY: number): void {
    const member = this.rpg.party[this._partyIndex];
    if (!member) return;

    const promotions = getAvailablePromotions(member);

    const title = new Text({
      text: `Promote ${member.name} (${member.unitType.replace(/_/g, " ")})`,
      style: { fontFamily: "monospace", fontSize: 16, fill: 0xffffff, fontWeight: "bold" },
    });
    title.position.set(30, startY + 10);
    this.container.addChild(title);

    if (!promotions || promotions.options.length === 0) {
      const noPromo = new Text({
        text: t("rpg.no_promotions"),
        style: { fontFamily: "monospace", fontSize: 13, fill: DIM_TEXT },
      });
      noPromo.position.set(30, startY + 45);
      this.container.addChild(noPromo);
      return;
    }

    const cost = promotions.goldCost;
    const canAfford = this.rpg.gold >= cost;

    for (let i = 0; i < promotions.options.length; i++) {
      const option = promotions.options[i];
      const y = startY + 45 + i * 36;
      const isSelected = i === this._promotionIndex;

      if (isSelected) {
        const highlight = new Graphics();
        highlight.roundRect(20, y - 2, W - 44, 32, 3);
        highlight.fill({ color: 0x2a4a2e, alpha: 0.6 });
        this.container.addChild(highlight);
      }

      const cursor = isSelected ? ">" : " ";
      const promoText = new Text({
        text: `${cursor} ${option.to.replace(/_/g, " ")}`,
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fill: isSelected ? HIGHLIGHT_COLOR : (canAfford ? TEXT_COLOR : 0x664444),
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      promoText.position.set(30, y);
      this.container.addChild(promoText);

      const costText = new Text({
        text: `${cost}g`,
        style: { fontFamily: "monospace", fontSize: 13, fill: canAfford ? GOLD_COLOR : 0x664444 },
      });
      costText.anchor.set(1, 0);
      costText.position.set(W - 30, y);
      this.container.addChild(costText);

      const descText = new Text({
        text: option.description,
        style: { fontFamily: "monospace", fontSize: 10, fill: DIM_TEXT },
      });
      descText.position.set(50, y + 16);
      this.container.addChild(descText);
    }

    const hint = new Text({
      text: t("rpg.promote_controls"),
      style: { fontFamily: "monospace", fontSize: 11, fill: DIM_TEXT },
    });
    hint.position.set(30, startY + 45 + promotions.options.length * 36 + 10);
    this.container.addChild(hint);
  }

  // ---------------------------------------------------------------------------
  // Mastery pick (Party sub-mode)
  // ---------------------------------------------------------------------------

  private _drawMasteryPick(W: number, startY: number): void {
    const member = this.rpg.party[this._partyIndex];
    if (!member) return;

    const masteryPoints = (member as any).masteryPoints ?? 0;
    const masteryBonuses: Record<string, number> = (member as any).masteryBonuses ?? {};

    const title = new Text({
      text: `${member.name} - Mastery (Points: ${masteryPoints})`,
      style: { fontFamily: "monospace", fontSize: 16, fill: SPELL_COLOR, fontWeight: "bold" },
    });
    title.position.set(30, startY + 10);
    this.container.addChild(title);

    if (MASTERY_BONUSES.length === 0) {
      const noBonuses = new Text({
        text: t("rpg.no_mastery"),
        style: { fontFamily: "monospace", fontSize: 13, fill: DIM_TEXT },
      });
      noBonuses.position.set(30, startY + 45);
      this.container.addChild(noBonuses);
      return;
    }

    for (let i = 0; i < MASTERY_BONUSES.length; i++) {
      const bonus = MASTERY_BONUSES[i];
      const current = masteryBonuses[bonus.id] ?? 0;
      const max = bonus.maxPurchases;
      const cost = bonus.cost;
      const y = startY + 45 + i * 32;
      const isSelected = i === this._masteryIndex;
      const canBuy = masteryPoints >= cost && current < max;

      if (isSelected) {
        const highlight = new Graphics();
        highlight.roundRect(20, y - 2, W - 44, 28, 3);
        highlight.fill({ color: 0x2a1a4e, alpha: 0.6 });
        this.container.addChild(highlight);
      }

      const cursor = isSelected ? ">" : " ";
      const bonusText = new Text({
        text: `${cursor} ${bonus.name}  (${current}/${max})  Cost: ${cost} pts`,
        style: {
          fontFamily: "monospace",
          fontSize: 12,
          fill: isSelected ? HIGHLIGHT_COLOR : (canBuy ? TEXT_COLOR : 0x666688),
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      bonusText.position.set(30, y);
      this.container.addChild(bonusText);

      if (isSelected && bonus.description) {
        const descText = new Text({
          text: bonus.description,
          style: { fontFamily: "monospace", fontSize: 10, fill: DIM_TEXT },
        });
        descText.position.set(50, y + 16);
        this.container.addChild(descText);
      }
    }

    const hint = new Text({
      text: "Enter = Buy  |  Esc = Back",
      style: { fontFamily: "monospace", fontSize: 11, fill: DIM_TEXT },
    });
    hint.position.set(30, startY + 45 + MASTERY_BONUSES.length * 32 + 10);
    this.container.addChild(hint);
  }

  // ---------------------------------------------------------------------------
  // Arena tab
  // ---------------------------------------------------------------------------

  private _drawArena(W: number, H: number): void {
    const startY = 100;
    const g = new Graphics();
    g.roundRect(15, startY - 5, W - 30, H - startY - 60, 6);
    g.fill({ color: PANEL_COLOR, alpha: 0.8 });
    g.stroke({ color: BORDER_COLOR, width: 1 });
    this.container.addChild(g);

    const fightsLeft = (this.rpg as any).arenaFightsLeft ?? 0;
    const header = new Text({
      text: `\u2694 Arena`,
      style: { fontFamily: "monospace", fontSize: 15, fill: RECRUIT_COLOR, fontWeight: "bold" },
    });
    header.position.set(25, startY + 6);
    this.container.addChild(header);

    const fightsText = new Text({
      text: `Fights left: ${fightsLeft}`,
      style: { fontFamily: "monospace", fontSize: 12, fill: fightsLeft > 0 ? TEXT_COLOR : 0xaa4444 },
    });
    fightsText.position.set(W - 150, startY + 8);
    this.container.addChild(fightsText);

    const avgPartyLevel = Math.round(this.rpg.party.reduce((s, m) => s + m.level, 0) / (this.rpg.party.length || 1));
    const tiers = getAvailableArenaTiers(avgPartyLevel);

    if (tiers.length === 0) {
      const t = new Text({ text: "No tiers available at your level.", style: { fontFamily: "monospace", fontSize: 13, fill: DIM_TEXT } });
      t.position.set(30, startY + 50);
      this.container.addChild(t);
      return;
    }

    // Clamp arenaIndex
    this._arenaIndex = Math.min(this._arenaIndex, tiers.length - 1);
    const tier = tiers[this._arenaIndex];

    // Clamp betIndex
    this._arenaBetIndex = Math.min(this._arenaBetIndex, tier.betAmounts.length - 1);
    const betAmount = tier.betAmounts[this._arenaBetIndex];
    const canAfford = this.rpg.gold >= betAmount;
    const canFight = canFightInArena(this.rpg) && canAfford;

    // Tier selector (if more than one tier available)
    let y = startY + 36;
    if (tiers.length > 1) {
      const prevBtn = this._makeArrowBtn("◄", 25, y, () => {
        this._arenaIndex = Math.max(0, this._arenaIndex - 1);
        this._arenaBetIndex = 0;
        this._draw();
      }, this._arenaIndex > 0);
      this.container.addChild(prevBtn);

      const tierLabel = new Text({
        text: tier.name,
        style: { fontFamily: "monospace", fontSize: 13, fill: HIGHLIGHT_COLOR, fontWeight: "bold" },
      });
      tierLabel.position.set(55, y + 2);
      this.container.addChild(tierLabel);

      const nextBtn = this._makeArrowBtn("►", 55 + tierLabel.width + 8, y, () => {
        this._arenaIndex = Math.min(tiers.length - 1, this._arenaIndex + 1);
        this._arenaBetIndex = 0;
        this._draw();
      }, this._arenaIndex < tiers.length - 1);
      this.container.addChild(nextBtn);
      y += 30;
    } else {
      const tierLabel = new Text({
        text: tier.name,
        style: { fontFamily: "monospace", fontSize: 13, fill: HIGHLIGHT_COLOR, fontWeight: "bold" },
      });
      tierLabel.position.set(25, y + 2);
      this.container.addChild(tierLabel);
      y += 28;
    }

    // Bet selector
    const betLabel = new Text({
      text: "Your bet:",
      style: { fontFamily: "monospace", fontSize: 12, fill: DIM_TEXT },
    });
    betLabel.position.set(25, y + 4);
    this.container.addChild(betLabel);

    const prevBetBtn = this._makeArrowBtn("◄", 105, y, () => {
      this._arenaBetIndex = Math.max(0, this._arenaBetIndex - 1);
      this._draw();
    }, this._arenaBetIndex > 0);
    this.container.addChild(prevBetBtn);

    const betValText = new Text({
      text: `${betAmount}g`,
      style: { fontFamily: "monospace", fontSize: 14, fill: 0xffdd88, fontWeight: "bold" },
    });
    betValText.position.set(135, y + 2);
    this.container.addChild(betValText);

    const nextBetBtn = this._makeArrowBtn("►", 175, y, () => {
      this._arenaBetIndex = Math.min(tier.betAmounts.length - 1, this._arenaBetIndex + 1);
      this._draw();
    }, this._arenaBetIndex < tier.betAmounts.length - 1);
    this.container.addChild(nextBetBtn);

    const winText = new Text({
      text: `→ win: ${betAmount * 2}g`,
      style: { fontFamily: "monospace", fontSize: 12, fill: canAfford ? 0x88dd88 : DIM_TEXT },
    });
    winText.position.set(215, y + 4);
    this.container.addChild(winText);

    if (!canAfford) {
      const warn = new Text({
        text: "Not enough gold",
        style: { fontFamily: "monospace", fontSize: 11, fill: 0xaa4444 },
      });
      warn.position.set(25, y + 26);
      this.container.addChild(warn);
    }

    y += 50;

    // Fight buttons
    if (fightsLeft <= 0) {
      const t = new Text({
        text: "No fights left. Leave and re-enter town to reset.",
        style: { fontFamily: "monospace", fontSize: 12, fill: 0xaa4444 },
      });
      t.position.set(25, y);
      this.container.addChild(t);
    } else {
      // Watch button (auto-resolve)
      const watchBtn = this._makeArenaActionBtn("Watch", 25, y, canFight, () => this._handleArenaFight(this._arenaIndex, betAmount, "auto"));
      this.container.addChild(watchBtn);

      // Fight button (manual turn-based)
      const fightBtn = this._makeArenaActionBtn("Fight!", 130, y, canFight, () => this._handleArenaFight(this._arenaIndex, betAmount, "turn"));
      this.container.addChild(fightBtn);

      y += 40;
      const hint = new Text({
        text: "Watch = auto-resolve  |  Fight = you play it",
        style: { fontFamily: "monospace", fontSize: 10, fill: DIM_TEXT },
      });
      hint.position.set(25, y);
      this.container.addChild(hint);
    }
  }

  private _makeArrowBtn(label: string, x: number, y: number, onClick: () => void, enabled: boolean): Container {
    const btn = new Container();
    btn.position.set(x, y);
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, 22, 22, 3);
    bg.fill({ color: enabled ? 0x2a3a4e : 0x1a1a2a });
    bg.stroke({ color: enabled ? 0x6688aa : 0x333344, width: 1 });
    btn.addChild(bg);

    const txt = new Text({
      text: label,
      style: { fontFamily: "monospace", fontSize: 12, fill: enabled ? 0xaaccff : 0x444466 },
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(11, 11);
    btn.addChild(txt);

    btn.on("pointerdown", () => { if (enabled) onClick(); });
    return btn;
  }

  private _makeArenaActionBtn(label: string, x: number, y: number, enabled: boolean, onClick: () => void): Container {
    const btn = new Container();
    btn.position.set(x, y);
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, 95, 30, 5);
    bg.fill({ color: enabled ? 0x1e3a1e : 0x222233 });
    bg.stroke({ color: enabled ? 0x44aa44 : 0x444466, width: 1 });
    btn.addChild(bg);

    const txt = new Text({
      text: label,
      style: { fontFamily: "monospace", fontSize: 13, fill: enabled ? 0xffffff : 0x555577, fontWeight: "bold" },
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(47, 15);
    btn.addChild(txt);

    btn.on("pointerdown", () => { if (enabled) onClick(); });
    return btn;
  }

  private _handleArenaFight(tierIndex: number, betAmount: number, mode: "auto" | "turn"): void {
    const avgPartyLevel = Math.round(this.rpg.party.reduce((s, m) => s + m.level, 0) / (this.rpg.party.length || 1));
    const tiers = getAvailableArenaTiers(avgPartyLevel);
    if (tierIndex >= tiers.length) return;

    if (!canFightInArena(this.rpg)) {
      this._showMessage("No arena fights remaining!");
      return;
    }
    if (this.rpg.gold < betAmount) {
      this._showMessage("Not enough gold for the bet!");
      return;
    }

    this.rpg.gold -= betAmount;
    const encounter = getArenaEncounter(this.rpg, tierIndex, betAmount);
    if (encounter) {
      EventBus.emit("rpgEncounterTriggered", {
        encounterId: encounter.encounterId,
        encounterType: "random",
        arenaBet: betAmount,
        arenaMode: mode,
      });
    } else {
      this.rpg.gold += betAmount;
    }
  }

  // ---------------------------------------------------------------------------
  // Forge (Crafting) tab
  // ---------------------------------------------------------------------------

  private _drawForge(W: number, H: number): void {
    const startY = 100;
    const g = new Graphics();

    g.roundRect(15, startY - 5, W - 30, H - startY - 60, 6);
    g.fill({ color: PANEL_COLOR, alpha: 0.8 });
    g.stroke({ color: BORDER_COLOR, width: 1 });
    this.container.addChild(g);

    const headerText = new Text({
      text: "\u2692 Forge - Crafting",
      style: { fontFamily: "monospace", fontSize: 15, fill: HIGHLIGHT_COLOR, fontWeight: "bold" },
    });
    headerText.position.set(25, startY + 6);
    this.container.addChild(headerText);

    if (CRAFTING_RECIPES.length === 0) {
      const noRecipes = new Text({
        text: "No crafting recipes available.",
        style: { fontFamily: "monospace", fontSize: 13, fill: DIM_TEXT },
      });
      noRecipes.position.set(30, startY + 40);
      this.container.addChild(noRecipes);
      return;
    }

    for (let i = 0; i < CRAFTING_RECIPES.length; i++) {
      const recipe = CRAFTING_RECIPES[i];
      const y = startY + 36 + i * 48;
      const isSelected = i === this._forgeIndex;
      const craftable = canCraft(this.rpg, recipe.id);

      if (isSelected) {
        const highlight = new Graphics();
        highlight.roundRect(20, y - 2, W - 44, 44, 4);
        highlight.fill({ color: 0x1a2a1e, alpha: 0.8 });
        this.container.addChild(highlight);
      }

      const cursor = isSelected ? ">" : " ";
      const recipeText = new Text({
        text: `${cursor} ${recipe.name}`,
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fill: isSelected ? HIGHLIGHT_COLOR : (craftable ? TEXT_COLOR : 0x666688),
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      recipeText.position.set(30, y + 2);
      this.container.addChild(recipeText);

      // Ingredient requirements
      const ingredients = recipe.ingredients ?? [];
      const matStrings = ingredients.map((ing) => {
        const matDef = CRAFT_MATERIALS.find(m => m.id === ing.itemId);
        const matName = matDef?.name ?? ing.itemId;
        const have = this.rpg.inventory.items.find(s => s.item.id === ing.itemId)?.quantity ?? 0;
        const need = ing.quantity;
        const color = have >= need ? HP_GREEN : 0xaa4444;
        return { text: `${matName}: ${have}/${need}`, color };
      });

      let matX = 50;
      for (const matInfo of matStrings) {
        const matText = new Text({
          text: matInfo.text,
          style: { fontFamily: "monospace", fontSize: 10, fill: matInfo.color },
        });
        matText.position.set(matX, y + 20);
        this.container.addChild(matText);
        matX += matText.width + 16;
      }

      // Craft button (for selected item)
      if (isSelected) {
        const craftBtn = new Container();
        craftBtn.position.set(W - 120, y + 2);
        craftBtn.eventMode = "static";
        craftBtn.cursor = "pointer";
        const capturedRecipeIndex = i;
        craftBtn.on("pointerdown", () => {
          const r = CRAFTING_RECIPES[capturedRecipeIndex];
          if (canCraft(this.rpg, r.id)) {
            const success = craft(this.rpg, r.id);
            if (success) {
              this._showMessage(`Crafted ${r.result.name}!`);
            } else {
              this._showMessage("Crafting failed!");
            }
          } else {
            this._showMessage("Missing materials!");
          }
        });

        const btnBg = new Graphics();
        btnBg.roundRect(0, 0, 80, 24, 4);
        btnBg.fill({ color: craftable ? 0x2a4a2e : 0x3a2a2a });
        btnBg.stroke({ color: craftable ? HP_GREEN : 0x664444, width: 1 });
        craftBtn.addChild(btnBg);

        const btnText = new Text({
          text: "Craft",
          style: { fontFamily: "monospace", fontSize: 11, fill: craftable ? 0xffffff : 0x664444, fontWeight: "bold" },
        });
        btnText.anchor.set(0.5, 0.5);
        btnText.position.set(40, 12);
        craftBtn.addChild(btnText);

        this.container.addChild(craftBtn);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Purchase confirmation dialog
  // ---------------------------------------------------------------------------

  private _drawConfirmDialog(W: number, H: number): void {
    if (!this._confirmDialog) return;

    // Semi-transparent overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, W, H);
    overlay.fill({ color: 0x000000, alpha: 0.6 });
    overlay.eventMode = "static"; // Block clicks through
    this.container.addChild(overlay);

    // Dialog panel
    const panelW = 400;
    const panelH = 120;
    const px = (W - panelW) / 2;
    const py = (H - panelH) / 2;

    const panel = new Graphics();
    panel.roundRect(px, py, panelW, panelH, 8);
    panel.fill({ color: 0xffffff });
    panel.stroke({ color: BORDER_COLOR, width: 2 });
    this.container.addChild(panel);

    // Message text
    const msgText = new Text({
      text: this._confirmDialog.message,
      style: {
        fontFamily: "monospace",
        fontSize: 14,
        fill: 0x111111,
        fontWeight: "bold",
        wordWrap: true,
        wordWrapWidth: panelW - 40,
        align: "center",
      },
    });
    msgText.anchor.set(0.5, 0);
    msgText.position.set(W / 2, py + 20);
    this.container.addChild(msgText);

    // Yes button
    const yesBtn = new Container();
    yesBtn.position.set(px + panelW / 2 - 90, py + panelH - 45);
    yesBtn.eventMode = "static";
    yesBtn.cursor = "pointer";
    yesBtn.on("pointerdown", () => {
      const cb = this._confirmDialog?.onYes;
      this._confirmDialog = null;
      cb?.();
    });

    const yesBg = new Graphics();
    yesBg.roundRect(0, 0, 70, 28, 4);
    yesBg.fill({ color: 0x2a4a2e });
    yesBg.stroke({ color: HP_GREEN, width: 1 });
    yesBtn.addChild(yesBg);

    const yesText = new Text({
      text: "Yes",
      style: { fontFamily: "monospace", fontSize: 13, fill: 0xffffff, fontWeight: "bold" },
    });
    yesText.anchor.set(0.5, 0.5);
    yesText.position.set(35, 14);
    yesBtn.addChild(yesText);
    this.container.addChild(yesBtn);

    // No button
    const noBtn = new Container();
    noBtn.position.set(px + panelW / 2 + 20, py + panelH - 45);
    noBtn.eventMode = "static";
    noBtn.cursor = "pointer";
    noBtn.on("pointerdown", () => {
      const cb = this._confirmDialog?.onNo;
      this._confirmDialog = null;
      cb?.();
      this._draw();
    });

    const noBg = new Graphics();
    noBg.roundRect(0, 0, 70, 28, 4);
    noBg.fill({ color: 0x4a2a2a });
    noBg.stroke({ color: 0xaa4444, width: 1 });
    noBtn.addChild(noBg);

    const noText = new Text({
      text: "No",
      style: { fontFamily: "monospace", fontSize: 13, fill: 0xffffff, fontWeight: "bold" },
    });
    noText.anchor.set(0.5, 0.5);
    noText.position.set(35, 14);
    noBtn.addChild(noText);
    this.container.addChild(noBtn);
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
      if (this._confirmDialog) {
        // Block tab switching during confirmation dialog
      } else if (this._partySubMode === "member_list" && this._spellSubMode === "spell_list") {
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
        case "Spells":
          this._handleSpellsInput(e);
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
        case "Arena":
          this._handleArenaInput(e);
          break;
        case "Forge":
          this._handleForgeInput(e);
          break;
        case "Leave":
          this._handleLeaveInput(e);
          break;
      }
    };

    window.addEventListener("keydown", this._onKeyDown);
  }

  private _handleShopInput(e: KeyboardEvent): void {
    // Handle confirmation dialog input first
    if (this._confirmDialog) {
      this._handleConfirmDialogInput(e);
      return;
    }

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
            if (item.value > 200) {
              // Show confirmation dialog for expensive purchases
              this._confirmDialog = {
                message: `Buy ${item.name} for ${item.value}g?`,
                onYes: () => {
                  if (buyItem(this.rpg, item)) {
                    this._showMessage(`Bought ${item.name}!`);
                  } else {
                    this._showMessage(t("rpg.not_enough_gold"));
                  }
                },
                onNo: () => {},
              };
              this._draw();
            } else {
              if (buyItem(this.rpg, item)) {
                this._showMessage(`Bought ${item.name}!`);
              } else {
                this._showMessage(t("rpg.not_enough_gold"));
              }
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
          this._showMessage(t("rpg.not_enough_gold"));
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
            this._showMessage(t("rpg.not_enough_gold"));
          }
        }
        break;
      case "Escape":
        this.onLeave?.();
        break;
    }
  }

  private _handlePartyInput(e: KeyboardEvent): void {
    // Handle confirmation dialog input first
    if (this._confirmDialog) {
      this._handleConfirmDialogInput(e);
      return;
    }

    if (this._partySubMode === "member_list") {
      this._handleMemberListInput(e);
    } else if (this._partySubMode === "equip_slot") {
      this._handleEquipSlotInput(e);
    } else if (this._partySubMode === "inventory_pick") {
      this._handleInventoryPickInput(e);
    } else if (this._partySubMode === "promotion_pick") {
      this._handlePromotionPickInput(e);
    } else if (this._partySubMode === "mastery_pick") {
      this._handleMasteryPickInput(e);
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
      case "KeyP": {
        // Open mastery screen for selected member
        const member = this.rpg.party[this._partyIndex];
        if (member && ((member as any).masteryPoints ?? 0) > 0) {
          this._partySubMode = "mastery_pick";
          this._masteryIndex = 0;
          this._draw();
        }
        break;
      }
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

  private _handlePromotionPickInput(e: KeyboardEvent): void {
    const member = this.rpg.party[this._partyIndex];
    if (!member) return;
    const promotions = getAvailablePromotions(member);
    if (!promotions) return;

    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        this._promotionIndex = Math.max(0, this._promotionIndex - 1);
        this._draw();
        break;
      case "ArrowDown":
      case "KeyS":
        this._promotionIndex = Math.min(promotions.options.length - 1, this._promotionIndex + 1);
        this._draw();
        break;
      case "Enter":
      case "Space": {
        if (this._promotionIndex >= promotions.options.length) break;
        const option = promotions.options[this._promotionIndex];
        const cost = promotions.goldCost;
        if (this.rpg.gold < cost) {
          this._showMessage("Not enough gold for promotion!");
        } else {
          this.rpg.gold -= cost;
          applyPromotion(this.rpg, member.id, option.to);
          this._showMessage(`${member.name} promoted to ${option.to.replace(/_/g, " ")}!`);
          this._partySubMode = "member_list";
        }
        break;
      }
      case "Escape":
        this._partySubMode = "member_list";
        this._draw();
        break;
    }
  }

  private _handleMasteryPickInput(e: KeyboardEvent): void {
    const member = this.rpg.party[this._partyIndex];
    if (!member) return;
    const masteryPoints = (member as any).masteryPoints ?? 0;
    const masteryBonuses: Record<string, number> = (member as any).masteryBonuses ?? {};

    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        this._masteryIndex = Math.max(0, this._masteryIndex - 1);
        this._draw();
        break;
      case "ArrowDown":
      case "KeyS":
        this._masteryIndex = Math.min(MASTERY_BONUSES.length - 1, this._masteryIndex + 1);
        this._draw();
        break;
      case "Enter":
      case "Space": {
        if (this._masteryIndex >= MASTERY_BONUSES.length) break;
        const bonus = MASTERY_BONUSES[this._masteryIndex];
        const current = masteryBonuses[bonus.id] ?? 0;
        const max = bonus.maxPurchases;
        const cost = bonus.cost;

        if (masteryPoints < cost) {
          this._showMessage("Not enough mastery points!");
        } else if (current >= max) {
          this._showMessage("Already at maximum level!");
        } else {
          (member as any).masteryPoints -= cost;
          if (!(member as any).masteryBonuses) (member as any).masteryBonuses = {};
          (member as any).masteryBonuses[bonus.id] = current + 1;
          this._showMessage(`${bonus.name} upgraded to ${current + 1}/${max}!`);
        }
        break;
      }
      case "Escape":
        this._partySubMode = "member_list";
        this._draw();
        break;
    }
  }

  private _handleArenaInput(e: KeyboardEvent): void {
    const avgPartyLevel = Math.round(this.rpg.party.reduce((s, m) => s + m.level, 0) / (this.rpg.party.length || 1));
    const tiers = getAvailableArenaTiers(avgPartyLevel);
    const tier = tiers[this._arenaIndex];

    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        this._arenaIndex = Math.max(0, this._arenaIndex - 1);
        this._arenaBetIndex = 0;
        this._draw();
        break;
      case "ArrowDown":
      case "KeyS":
        this._arenaIndex = Math.min(tiers.length - 1, this._arenaIndex + 1);
        this._arenaBetIndex = 0;
        this._draw();
        break;
      case "ArrowLeft":
      case "KeyA":
        if (tier) { this._arenaBetIndex = Math.max(0, this._arenaBetIndex - 1); this._draw(); }
        break;
      case "ArrowRight":
      case "KeyD":
        if (tier) { this._arenaBetIndex = Math.min(tier.betAmounts.length - 1, this._arenaBetIndex + 1); this._draw(); }
        break;
      case "Enter":
      case "Space": {
        if (tier) this._handleArenaFight(this._arenaIndex, tier.betAmounts[this._arenaBetIndex], "turn");
        break;
      }
      case "Escape":
        this.onLeave?.();
        break;
    }
  }

  private _handleForgeInput(e: KeyboardEvent): void {
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        this._forgeIndex = Math.max(0, this._forgeIndex - 1);
        this._draw();
        break;
      case "ArrowDown":
      case "KeyS":
        this._forgeIndex = Math.min(CRAFTING_RECIPES.length - 1, this._forgeIndex + 1);
        this._draw();
        break;
      case "Enter":
      case "Space": {
        if (this._forgeIndex >= CRAFTING_RECIPES.length) break;
        const recipe = CRAFTING_RECIPES[this._forgeIndex];
        if (canCraft(this.rpg, recipe.id)) {
          const success = craft(this.rpg, recipe.id);
          if (success) {
            this._showMessage(`Crafted ${recipe.result.name}!`);
          } else {
            this._showMessage("Crafting failed!");
          }
        } else {
          this._showMessage("Missing materials!");
        }
        break;
      }
      case "Escape":
        this.onLeave?.();
        break;
    }
  }

  private _handleConfirmDialogInput(e: KeyboardEvent): void {
    switch (e.code) {
      case "KeyY":
      case "Enter": {
        const cb = this._confirmDialog?.onYes;
        this._confirmDialog = null;
        cb?.();
        break;
      }
      case "KeyN":
      case "Escape": {
        const cb = this._confirmDialog?.onNo;
        this._confirmDialog = null;
        cb?.();
        this._draw();
        break;
      }
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
  if (item.stats.block) parts.push(`BLK ${Math.round(item.stats.block * 100)}%`);
  if (item.stats.critChance) parts.push(`CRIT+${Math.round(item.stats.critChance * 100)}%`);
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
