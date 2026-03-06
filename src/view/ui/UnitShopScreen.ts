// Pre-battle unit shop screen for Battlefield and Wave modes.
// Tabbed interface: building tabs across top, unit list on left, building
// flavour text + image on right. Roster summary below gold display.

import { AnimatedSprite, Assets, Container, Graphics, Sprite, Text, TextStyle, Texture } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { UNIT_DEFINITIONS, computeTier } from "@sim/config/UnitDefinitions";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { filterInventoryByRace, getRace } from "@sim/config/RaceDefs";
import type { RaceId } from "@sim/config/RaceDefs";
import { BuildingType, UnitType, UnitState } from "@/types";
import type { CorruptionModifier } from "@sim/systems/GrailCorruptionSystem";
import { animationManager } from "@view/animation/AnimationManager";
import { UNIT_LABELS } from "@view/ui/HoverTooltip";

// Building images
import barracksImgUrl from "@/img/barracks.png";
import archerandswordsmanImgUrl from "@/img/archerandswordsman.png";
import hordeImgUrl from "@/img/horde.png";
import wallsImgUrl from "@/img/walls.png";
import dragonImgUrl from "@/img/dragon.png";
import magicImgUrl from "@/img/magic.png";
import angelImgUrl from "@/img/angel.png";

// Race portrait images
import elfPImgUrl from "@/img/elfP.png";
import manPImgUrl from "@/img/manP.png";
import hordePImgUrl from "@/img/hordeP.png";
import adeptPImgUrl from "@/img/adeptP.png";
import halflingPImgUrl from "@/img/halflingP.png";
import lavaPImgUrl from "@/img/lavaP.png";
import dwarfPImgUrl from "@/img/dwarfP.png";
import orcPImgUrl from "@/img/orcP.png";
import undeadPImgUrl from "@/img/undeadP.png";
import demonPImgUrl from "@/img/demonP.png";
import angelPImgUrl from "@/img/angelP.png";
import beastmenPImgUrl from "@/img/beastmenP.png";
import elementalsPImgUrl from "@/img/elementalsP.png";
import piratesPImgUrl from "@/img/piratesP.png";

export type UnitRoster = Array<{ type: UnitType; count: number }>;

const RACE_PORTRAITS: Record<string, string> = {
  elf: elfPImgUrl,
  man: manPImgUrl,
  horde: hordePImgUrl,
  adept: adeptPImgUrl,
  halfling: halflingPImgUrl,
  lava: lavaPImgUrl,
  dwarf: dwarfPImgUrl,
  orc: orcPImgUrl,
  undead: undeadPImgUrl,
  demon: demonPImgUrl,
  angel: angelPImgUrl,
  beast: beastmenPImgUrl,
  elements: elementalsPImgUrl,
  pirate: piratesPImgUrl,
  op: manPImgUrl,
};

// ---------------------------------------------------------------------------
// Tab data
// ---------------------------------------------------------------------------

interface TabDef {
  id: string;
  building: BuildingType | null;
  label: string;
  color: number;
  description: string;
  imageUrl: string | null;
}

const SHOP_TABS: Omit<TabDef, "id">[] = [
  {
    building: BuildingType.BARRACKS,
    label: "BARRACKS",
    color: 0xff6644,
    description: "Military training grounds for infantry and specialized warriors. Swordsmen, pikemen, assassins, and heavy defenders are forged here.",
    imageUrl: barracksImgUrl,
  },
  {
    building: BuildingType.ARCHERY_RANGE,
    label: "ARCHERY",
    color: 0x66cc44,
    description: "Training grounds for marksmen who strike from distance with deadly precision. Archers, crossbowmen, and longbowmen hone their aim here.",
    imageUrl: archerandswordsmanImgUrl,
  },
  {
    building: BuildingType.STABLES,
    label: "STABLES",
    color: 0xddaa44,
    description: "Houses and trains mounted cavalry units for swift battlefield mobility. Knights and lancers charge forth to break enemy lines.",
    imageUrl: hordeImgUrl,
  },
  {
    building: BuildingType.SIEGE_WORKSHOP,
    label: "SIEGE",
    color: 0x8888aa,
    description: "Forge where devastating siege weapons are crafted for destroying fortifications. Ballistae, catapults, and trebuchets rain destruction.",
    imageUrl: wallsImgUrl,
  },
  {
    building: BuildingType.CREATURE_DEN,
    label: "CREATURES",
    color: 0xcc66cc,
    description: "Mystical habitat where legendary creatures are tamed for battle. Dragons, trolls, elementals, and other beasts answer the call.",
    imageUrl: dragonImgUrl,
  },
  {
    building: BuildingType.MAGE_TOWER,
    label: "MAGES",
    color: 0x6688ff,
    description: "Arcane academy where elemental mages master fire, ice, lightning, and distortion. Their devastating spells turn the tide of war.",
    imageUrl: magicImgUrl,
  },
  {
    building: BuildingType.TEMPLE,
    label: "TEMPLE",
    color: 0xffdd88,
    description: "Sacred sanctuary where healers and holy warriors train to support allies. Monks, clerics, and angels channel divine power.",
    imageUrl: angelImgUrl,
  },
];

// ---------------------------------------------------------------------------
// Text styles
// ---------------------------------------------------------------------------

const STYLE_TITLE = new TextStyle({ fontFamily: "monospace", fontSize: 26, fill: 0xffd700, fontWeight: "bold", letterSpacing: 2 });
const STYLE_GOLD = new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xffcc00, fontWeight: "bold", letterSpacing: 1 });
const STYLE_TAB = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x888899, fontWeight: "bold", letterSpacing: 1 });
const STYLE_TAB_ACTIVE = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffffff, fontWeight: "bold", letterSpacing: 1 });
const STYLE_UNIT_NAME = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xccddee, letterSpacing: 1 });
const STYLE_UNIT_COST = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xaabb88, letterSpacing: 1 });
const STYLE_COUNT = new TextStyle({ fontFamily: "monospace", fontSize: 15, fill: 0xffffff, fontWeight: "bold" });
const STYLE_BTN = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xffffff, fontWeight: "bold", letterSpacing: 1 });
const STYLE_BUILDING_TITLE = new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xffd700, fontWeight: "bold", letterSpacing: 1 });
const STYLE_BUILDING_DESC = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xaabbcc, wordWrap: true, wordWrapWidth: 340, lineHeight: 20 });
const STYLE_ROSTER_HEADER = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xccaa44, fontWeight: "bold", letterSpacing: 1 });
const STYLE_ROSTER_ENTRY = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x99aabb, letterSpacing: 1 });
const STYLE_ROSTER_SURVIVOR = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x77cc77, letterSpacing: 1 });

// Hover tooltip styles
const STYLE_TT_NAME = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xdddddd, fontWeight: "bold" });
const STYLE_TT_STAT = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xbbccdd });
const STYLE_TT_DESC = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x99aabb, wordWrap: true, wordWrapWidth: 210 });
const STYLE_TT_ABILITY = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x88cc88 });

const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;

const TT_W = 240;
const TT_PAD = 10;
const TT_PREVIEW_H = 80;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUnitsForBuilding(bt: BuildingType, raceId: RaceId): UnitType[] {
  const bDef = BUILDING_DEFINITIONS[bt];
  if (!bDef) return [];
  const filtered = filterInventoryByRace(bDef.shopInventory, bt, raceId);
  const result: UnitType[] = [];
  for (const ut of filtered) {
    const uDef = UNIT_DEFINITIONS[ut];
    if (!uDef) continue;
    if (uDef.siegeOnly || uDef.diplomatOnly) continue;
    if (ut === UnitType.SETTLER) continue;
    result.push(ut);
  }
  result.sort((a, b) => (UNIT_DEFINITIONS[a].cost ?? 0) - (UNIT_DEFINITIONS[b].cost ?? 0));
  return result;
}

function getFactionUnits(raceId: RaceId): UnitType[] {
  const race = getRace(raceId);
  if (!race) return [];
  const result: UnitType[] = [];
  for (const fut of race.factionUnits) {
    if (fut && UNIT_DEFINITIONS[fut]) result.push(fut);
  }
  return result;
}

function getAllShopUnits(raceId: RaceId): UnitType[] {
  const seen = new Set<UnitType>();
  const result: UnitType[] = [];
  for (const tab of SHOP_TABS) {
    if (!tab.building) continue;
    for (const ut of getUnitsForBuilding(tab.building, raceId)) {
      if (!seen.has(ut)) { seen.add(ut); result.push(ut); }
    }
  }
  for (const ut of getFactionUnits(raceId)) {
    if (!seen.has(ut)) { seen.add(ut); result.push(ut); }
  }
  return result;
}

function makePanel(w: number, h: number): Container {
  const c = new Container();
  c.addChild(
    new Graphics()
      .roundRect(0, 0, w, h, 8)
      .fill({ color: 0x10102a, alpha: 0.95 })
      .roundRect(0, 0, w, h, 8)
      .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
  );
  return c;
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const ROW_H = 36;
const BTN_AREA_W = 100;
const LEFT_W = 520;
const ROSTER_BOX_H = 80; // fixed height for the "YOUR ARMY" box

// ---------------------------------------------------------------------------
// UnitShopScreen
// ---------------------------------------------------------------------------

export class UnitShopScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _card!: Container;
  private _cardW = 1200;
  private _cardH = 920;

  // State
  private _gold = 30000;
  private _goldSpent = 0;
  private _counts: Map<UnitType, number> = new Map();
  private _isAIShop = false;
  private _label = "UNIT SHOP";
  private _raceId: RaceId = "man" as RaceId;

  // Surviving units from previous wave (displayed in roster summary)
  private _survivingUnits: UnitRoster = [];

  // Tabs
  private _tabs: TabDef[] = [];
  private _activeTabIndex = 0;
  private _tabContainers: Container[] = [];
  private _tabBgs: Graphics[] = [];
  private _tabTexts: Text[] = [];

  // Content areas
  private _unitListContainer!: Container;
  private _unitScrollContainer!: Container;
  private _unitScrollMask!: Graphics;
  private _unitScrollY = 0;
  private _detailContainer!: Container;
  private _rosterContainer!: Container;

  // UI refs
  private _goldText!: Text;
  private _titleText!: Text;
  private _startBtn!: Container;
  private _activeModifiers: CorruptionModifier[] = [];
  private _dynamicRows: Container[] = [];
  private _countTexts: Map<UnitType, Text> = new Map();
  private _randomToggleOn = false;
  private _randomToggleBg?: Graphics;
  private _randomToggleLabel?: Text;

  // Tooltip
  private _tooltip!: Container;
  private _tooltipBg!: Graphics;
  private _tooltipPreview!: Container;
  private _tooltipStats!: Container;
  private _tooltipSprite: AnimatedSprite | null = null;
  private _activeTooltipUnit: UnitType | null = null;

  onDone: ((roster: UnitRoster) => void) | null = null;

  setCorruptionModifiers(modifiers: CorruptionModifier[]): void {
    this._activeModifiers = modifiers;
  }

  /** Set surviving units from previous waves (shown in roster summary). */
  setSurvivingUnits(units: UnitRoster): void {
    this._survivingUnits = units;
  }

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    this._card = makePanel(this._cardW, this._cardH);
    this.container.addChild(this._card);

    // Title
    this._titleText = new Text({ text: this._label, style: STYLE_TITLE });
    this._titleText.anchor.set(0.5, 0);
    this._titleText.position.set(this._cardW / 2, 10);
    this._card.addChild(this._titleText);

    // Gold display
    this._goldText = new Text({ text: "", style: STYLE_GOLD });
    this._goldText.anchor.set(0.5, 0);
    this._goldText.position.set(this._cardW / 2, 38);
    this._card.addChild(this._goldText);

    // Roster summary area (between gold and tabs)
    this._rosterContainer = new Container();
    this._rosterContainer.position.set(16, 62);
    this._card.addChild(this._rosterContainer);

    // Divider below roster / above tabs will be drawn dynamically
    // Tab bar area starts at y = TABS_Y (calculated)
    // Content starts below tabs

    // Left panel: unit list (scrollable) — positioned dynamically in _rebuild
    this._unitListContainer = new Container();
    this._card.addChild(this._unitListContainer);

    this._unitScrollContainer = new Container();
    this._unitListContainer.addChild(this._unitScrollContainer);

    this._unitScrollMask = new Graphics();
    this._unitListContainer.addChild(this._unitScrollMask);
    this._unitScrollContainer.mask = this._unitScrollMask;

    // Right panel: detail / flavour
    this._detailContainer = new Container();
    this._card.addChild(this._detailContainer);

    // Mouse wheel scrolling
    this._card.eventMode = "static";
    this._card.on("wheel", (e: WheelEvent) => {
      this._unitScrollY -= e.deltaY * 0.5;
      this._clampScroll();
      this._unitScrollContainer.y = this._unitScrollY;
    });

    // START button
    this._startBtn = this._makeStartButton();
    this._card.addChild(this._startBtn);

    // Tooltip
    this._tooltip = new Container();
    this._tooltip.visible = false;
    this._tooltipBg = new Graphics();
    this._tooltip.addChild(this._tooltipBg);
    this._tooltipPreview = new Container();
    this._tooltip.addChild(this._tooltipPreview);
    this._tooltipStats = new Container();
    this._tooltipStats.position.set(0, TT_PREVIEW_H);
    this._tooltip.addChild(this._tooltipStats);
    this.container.addChild(this._tooltip);

    vm.addToLayer("ui", this.container);
    this.container.visible = false;
    vm.app.renderer.on("resize", () => this._layout());
  }

  show(raceId: RaceId, gold: number, label?: string): void {
    this._gold = gold;
    this._goldSpent = 0;
    this._isAIShop = false;
    this._label = label ?? "UNIT SHOP";
    this._randomToggleOn = false;
    this._unitScrollY = 0;
    this._counts.clear();
    // Pre-fill survivors as already-purchased (free re-buy)
    for (const entry of this._survivingUnits) {
      this._counts.set(entry.type, (this._counts.get(entry.type) ?? 0) + entry.count);
    }
    this._raceId = raceId;
    this._activeTabIndex = 0;
    this._hideTooltip();
    this._buildTabs();
    this._rebuild();
    this.container.visible = true;
    this._layout();
  }

  showAIShop(raceId: RaceId, gold: number): void {
    this._gold = gold;
    this._goldSpent = 0;
    this._isAIShop = true;
    this._label = "AI ARMY SHOP";
    this._randomToggleOn = false;
    this._unitScrollY = 0;
    this._counts.clear();
    this._raceId = raceId;
    this._activeTabIndex = 0;
    this._hideTooltip();
    this._buildTabs();
    this._rebuild();
    this.container.visible = true;
    this._layout();
  }

  hide(): void {
    this._hideTooltip();
    this.container.visible = false;
  }

  // -------------------------------------------------------------------------
  // Roster summary (units bought + survivors)
  // -------------------------------------------------------------------------

  private _refreshRoster(): void {
    this._rosterContainer.removeChildren();

    const ROSTER_W = this._cardW - 36;
    const ROSTER_H = ROSTER_BOX_H;
    const LINE_H = 16;
    const PAD = 8;

    // Box background
    const boxBg = new Graphics()
      .roundRect(0, 0, ROSTER_W, ROSTER_H, 5)
      .fill({ color: 0x0d0d20, alpha: 0.7 })
      .roundRect(0, 0, ROSTER_W, ROSTER_H, 5)
      .stroke({ color: 0x997722, alpha: 0.4, width: 1 });
    this._rosterContainer.addChild(boxBg);

    // Header
    const headerTxt = new Text({ text: "YOUR ARMY", style: STYLE_ROSTER_HEADER });
    headerTxt.position.set(PAD, 4);
    this._rosterContainer.addChild(headerTxt);

    // Merge survivors + current purchases
    const merged = new Map<UnitType, { count: number; survivor: number }>();
    for (const entry of this._survivingUnits) {
      const e = merged.get(entry.type) ?? { count: 0, survivor: 0 };
      e.survivor += entry.count;
      e.count += entry.count;
      merged.set(entry.type, e);
    }
    for (const [ut, count] of this._counts) {
      if (count > 0) {
        const e = merged.get(ut) ?? { count: 0, survivor: 0 };
        e.count += count;
        merged.set(ut, e);
      }
    }

    if (merged.size === 0) {
      const emptyTxt = new Text({ text: "(no units yet)", style: STYLE_ROSTER_ENTRY });
      emptyTxt.position.set(PAD, 22);
      this._rosterContainer.addChild(emptyTxt);
      return;
    }

    // Total unit count
    let totalUnits = 0;
    for (const info of merged.values()) totalUnits += info.count;
    const totalTxt = new Text({
      text: `(${totalUnits} units)`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x888899, letterSpacing: 1 }),
    });
    totalTxt.position.set(PAD + headerTxt.width + 8, 6);
    this._rosterContainer.addChild(totalTxt);

    // Flow entries in rows below header
    let x = PAD;
    let y = 22;
    const maxW = ROSTER_W - PAD * 2;

    for (const [ut, info] of merged) {
      const name = UNIT_LABELS[ut] ?? ut.replace(/_/g, " ");
      let label = `${name} x${info.count}`;
      if (info.survivor > 0 && info.count > info.survivor) {
        label = `${name} x${info.count} (${info.survivor} surv.)`;
      } else if (info.survivor > 0 && info.count === info.survivor) {
        label = `${name} x${info.count} (surv.)`;
      }

      const style = info.survivor > 0 ? STYLE_ROSTER_SURVIVOR : STYLE_ROSTER_ENTRY;
      const entryTxt = new Text({ text: label, style });

      if (x + entryTxt.width > maxW && x > PAD) {
        x = PAD;
        y += LINE_H;
      }

      entryTxt.position.set(x, y);
      this._rosterContainer.addChild(entryTxt);
      x += entryTxt.width + 16; // gap between entries
    }
  }

  // -------------------------------------------------------------------------
  // Tab management
  // -------------------------------------------------------------------------

  private get _tabsY(): number {
    // title(10..36) + gold(38..56) + gap(4) + roster box(62..62+ROSTER_BOX_H) + gap(6)
    return 62 + ROSTER_BOX_H + 6;
  }

  private get _contentTop(): number {
    return this._tabsY + 36;
  }

  private _buildTabs(): void {
    for (const tc of this._tabContainers) {
      tc.parent?.removeChild(tc);
      tc.destroy({ children: true });
    }
    this._tabContainers = [];
    this._tabBgs = [];
    this._tabTexts = [];

    this._tabs = [];
    for (const t of SHOP_TABS) {
      if (t.building) {
        const units = getUnitsForBuilding(t.building, this._raceId);
        if (units.length === 0) continue;
      }
      this._tabs.push({ ...t, id: t.building ?? "faction" });
    }

    // Add faction tab
    const factionUnits = getFactionUnits(this._raceId);
    if (factionUnits.length > 0) {
      const race = getRace(this._raceId);
      this._tabs.push({
        id: "faction",
        building: null,
        label: race ? race.name.toUpperCase() : "FACTION",
        color: race?.accentColor ?? 0xffaa44,
        description: race
          ? `Elite warriors unique to the ${race.name}. ${race.flavor}`
          : "Faction-exclusive units.",
        imageUrl: RACE_PORTRAITS[this._raceId] ?? null,
      });
    }

    const PAD = 16;
    const availW = this._cardW - PAD * 2;
    const tabCount = this._tabs.length;
    const TAB_GAP = 4;
    const TAB_W = Math.floor((availW - TAB_GAP * (tabCount - 1)) / tabCount);
    const TAB_H = 30;

    for (let i = 0; i < tabCount; i++) {
      const tab = this._tabs[i];
      const tc = new Container();
      tc.position.set(PAD + i * (TAB_W + TAB_GAP), this._tabsY);
      tc.eventMode = "static";
      tc.cursor = "pointer";

      const bg = new Graphics();
      tc.addChild(bg);
      this._tabBgs.push(bg);

      const txt = new Text({ text: tab.label, style: STYLE_TAB });
      txt.anchor.set(0.5, 0.5);
      txt.position.set(TAB_W / 2, TAB_H / 2);
      tc.addChild(txt);
      this._tabTexts.push(txt);

      tc.on("pointerdown", () => {
        this._activeTabIndex = i;
        this._refreshTabs();
        this._rebuild();
      });
      tc.on("pointerover", () => {
        if (i !== this._activeTabIndex) {
          bg.clear()
            .roundRect(0, 0, TAB_W, TAB_H, 4)
            .fill({ color: tab.color, alpha: 0.12 })
            .roundRect(0, 0, TAB_W, TAB_H, 4)
            .stroke({ color: tab.color, alpha: 0.4, width: 1 });
        }
      });
      tc.on("pointerout", () => {
        if (i !== this._activeTabIndex) {
          this._drawTabInactive(bg, TAB_W, TAB_H);
        }
      });

      this._card.addChild(tc);
      this._tabContainers.push(tc);
    }

    this._refreshTabs();
  }

  private _refreshTabs(): void {
    const PAD = 16;
    const availW = this._cardW - PAD * 2;
    const tabCount = this._tabs.length;
    const TAB_GAP = 4;
    const TAB_W = Math.floor((availW - TAB_GAP * (tabCount - 1)) / tabCount);
    const TAB_H = 30;

    for (let i = 0; i < tabCount; i++) {
      const tab = this._tabs[i];
      const bg = this._tabBgs[i];
      const txt = this._tabTexts[i];
      const isActive = i === this._activeTabIndex;

      bg.clear();
      if (isActive) {
        bg.roundRect(0, 0, TAB_W, TAB_H, 4)
          .fill({ color: tab.color, alpha: 0.3 })
          .roundRect(0, 0, TAB_W, TAB_H, 4)
          .stroke({ color: tab.color, alpha: 0.9, width: 2 });
        bg.rect(4, TAB_H - 3, TAB_W - 8, 3)
          .fill({ color: tab.color, alpha: 0.9 });
        txt.style = { ...STYLE_TAB_ACTIVE, fill: tab.color } as TextStyle;
      } else {
        this._drawTabInactive(bg, TAB_W, TAB_H);
        txt.style = STYLE_TAB;
      }
    }
  }

  private _drawTabInactive(bg: Graphics, w: number, h: number): void {
    bg.clear()
      .roundRect(0, 0, w, h, 4)
      .fill({ color: 0x111122, alpha: 0.5 })
      .roundRect(0, 0, w, h, 4)
      .stroke({ color: 0x334455, alpha: 0.5, width: 1 });
  }

  // -------------------------------------------------------------------------
  // Rebuild content for active tab
  // -------------------------------------------------------------------------

  private _rebuild(): void {
    for (const r of this._dynamicRows) {
      r.parent?.removeChild(r);
      r.destroy({ children: true });
    }
    this._dynamicRows = [];
    this._countTexts.clear();
    this._detailContainer.removeChildren();

    this._titleText.text = this._label;
    this._refreshGold();
    this._refreshRoster();

    const CONTENT_TOP = this._contentTop;
    const CONTENT_H = this._cardH - CONTENT_TOP - 60;

    // Position left panel
    this._unitListContainer.position.set(16, CONTENT_TOP);
    this._unitScrollMask.clear()
      .rect(0, 0, LEFT_W, CONTENT_H)
      .fill({ color: 0xffffff });

    // Position right panel
    this._detailContainer.position.set(16 + LEFT_W + 20, CONTENT_TOP);

    const tab = this._tabs[this._activeTabIndex];
    if (!tab) return;

    const units = tab.building
      ? getUnitsForBuilding(tab.building, this._raceId)
      : getFactionUnits(this._raceId);

    let y = 0;

    // AI random toggle
    if (this._isAIShop) {
      const toggleRow = this._buildRandomToggle(LEFT_W);
      toggleRow.position.set(0, y);
      this._unitScrollContainer.addChild(toggleRow);
      this._dynamicRows.push(toggleRow);
      y += 36;
    }

    // Corruption modifiers
    if (this._activeModifiers.length > 0) {
      y = this._buildCorruptionRows(y);
    }

    for (const ut of units) {
      const uDef = UNIT_DEFINITIONS[ut];
      if (!uDef) continue;
      const cost = uDef.cost ?? 100;
      const tier = uDef.tier ?? computeTier(cost);

      const row = new Container();
      row.position.set(0, y);
      row.eventMode = "static";
      row.cursor = "pointer";

      const rowBg = new Graphics()
        .roundRect(0, 0, LEFT_W, ROW_H - 2, 3)
        .fill({ color: 0x111122, alpha: 0.5 });
      row.addChild(rowBg);

      const nameLabel = UNIT_LABELS[ut] ?? ut.replace(/_/g, " ");
      const nameTxt = new Text({ text: `T${tier}  ${nameLabel}`, style: STYLE_UNIT_NAME });
      nameTxt.position.set(8, 3);
      row.addChild(nameTxt);

      const costTxt = new Text({ text: `${cost}g`, style: STYLE_UNIT_COST });
      costTxt.position.set(8, 19);
      row.addChild(costTxt);

      const rightX = LEFT_W - BTN_AREA_W;
      const minusBtn = this._makeSmallBtn("-", rightX + 14, ROW_H / 2);
      row.addChild(minusBtn);

      const countTxt = new Text({ text: String(this._counts.get(ut) ?? 0), style: STYLE_COUNT });
      countTxt.anchor.set(0.5, 0.5);
      countTxt.position.set(rightX + BTN_AREA_W / 2, ROW_H / 2);
      row.addChild(countTxt);
      this._countTexts.set(ut, countTxt);

      const plusBtn = this._makeSmallBtn("+", rightX + BTN_AREA_W - 14, ROW_H / 2);
      row.addChild(plusBtn);

      minusBtn.on("pointerdown", () => {
        const cur = this._counts.get(ut) ?? 0;
        if (cur > 0) {
          this._counts.set(ut, cur - 1);
          this._goldSpent -= cost;
          countTxt.text = String(cur - 1);
          this._refreshGold();
          this._refreshRoster();
        }
      });

      plusBtn.on("pointerdown", () => {
        const cur = this._counts.get(ut) ?? 0;
        if (this._goldSpent + cost <= this._gold) {
          this._counts.set(ut, cur + 1);
          this._goldSpent += cost;
          countTxt.text = String(cur + 1);
          this._refreshGold();
          this._refreshRoster();
        }
      });

      // Hover tooltip
      row.on("pointerover", (e) => {
        rowBg.clear().roundRect(0, 0, LEFT_W, ROW_H - 2, 3).fill({ color: 0x1a2244, alpha: 0.8 });
        this._showTooltip(ut, e.globalX, e.globalY);
      });
      row.on("pointermove", (e) => {
        if (this._activeTooltipUnit === ut) this._positionTooltip(e.globalX, e.globalY);
      });
      row.on("pointerout", () => {
        rowBg.clear().roundRect(0, 0, LEFT_W, ROW_H - 2, 3).fill({ color: 0x111122, alpha: 0.5 });
        this._hideTooltip();
      });

      this._unitScrollContainer.addChild(row);
      this._dynamicRows.push(row);
      y += ROW_H;
    }

    this._unitScrollY = 0;
    this._unitScrollContainer.y = 0;

    this._buildDetailPanel(tab);
  }

  // -------------------------------------------------------------------------
  // Detail panel
  // -------------------------------------------------------------------------

  private _buildDetailPanel(tab: TabDef): void {
    const DETAIL_W = this._cardW - LEFT_W - 16 - 20 - 16;
    const CONTENT_H = this._cardH - this._contentTop - 60;
    let dy = 0;

    const title = new Text({
      text: tab.label,
      style: { ...STYLE_BUILDING_TITLE, fill: tab.color } as TextStyle,
    });
    title.position.set(0, dy);
    this._detailContainer.addChild(title);
    dy += 30;

    const line = new Graphics()
      .rect(0, dy, Math.min(DETAIL_W, 200), 2)
      .fill({ color: tab.color, alpha: 0.5 });
    this._detailContainer.addChild(line);
    dy += 12;

    const desc = new Text({
      text: tab.description,
      style: { ...STYLE_BUILDING_DESC, wordWrapWidth: DETAIL_W - 10 } as TextStyle,
    });
    desc.position.set(0, dy);
    this._detailContainer.addChild(desc);
    dy += desc.height + 20;

    // Image
    const imgUrl = tab.imageUrl;
    if (imgUrl) {
      const imgAreaH = CONTENT_H - dy - 10;
      if (imgAreaH > 60) {
        const framePad = 6;
        const frameW = Math.min(DETAIL_W, 380);
        const frameH = Math.min(imgAreaH, 340);

        const frame = new Graphics()
          .roundRect(0, dy, frameW, frameH, 6)
          .fill({ color: 0x0a0a1a, alpha: 0.6 })
          .roundRect(0, dy, frameW, frameH, 6)
          .stroke({ color: tab.color, alpha: 0.4, width: 1.5 });
        this._detailContainer.addChild(frame);

        void Assets.load(imgUrl).then((tex: Texture) => {
          if (!this._detailContainer.parent) return;
          const sprite = new Sprite(tex);
          const maxW = frameW - framePad * 2;
          const maxH = frameH - framePad * 2;
          const scale = Math.min(maxW / tex.width, maxH / tex.height);
          sprite.scale.set(scale);
          sprite.position.set(
            framePad + (maxW - tex.width * scale) / 2,
            dy + framePad + (maxH - tex.height * scale) / 2,
          );
          this._detailContainer.addChild(sprite);
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Tooltip
  // -------------------------------------------------------------------------

  private _showTooltip(ut: UnitType, gx: number, gy: number): void {
    this._activeTooltipUnit = ut;
    const def = UNIT_DEFINITIONS[ut];
    if (!def) return;

    this._tooltipPreview.removeChildren();
    this._tooltipStats.removeChildren();
    if (this._tooltipSprite) { this._tooltipSprite.stop(); this._tooltipSprite = null; }

    const frames = animationManager.getFrames(ut, UnitState.IDLE);
    if (frames.length > 0 && frames[0] !== Texture.WHITE) {
      const sprite = new AnimatedSprite(frames);
      sprite.anchor.set(0.5, 0.5);
      sprite.width = 56; sprite.height = 56;
      sprite.position.set(TT_W / 2, TT_PREVIEW_H / 2);
      const frameSet = animationManager.getFrameSet(ut, UnitState.IDLE);
      sprite.animationSpeed = frameSet.fps / 60;
      sprite.loop = true; sprite.play();
      this._tooltipSprite = sprite;
      this._tooltipPreview.addChild(sprite);
    } else {
      const g = new Graphics()
        .circle(TT_W / 2, TT_PREVIEW_H / 2, 22).fill({ color: 0x334466 })
        .circle(TT_W / 2, TT_PREVIEW_H / 2, 22).stroke({ color: 0x5588aa, width: 1 });
      this._tooltipPreview.addChild(g);
      const letter = new Text({
        text: (UNIT_LABELS[ut] ?? ut).charAt(0),
        style: new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xdddddd, fontWeight: "bold" }),
      });
      letter.anchor.set(0.5, 0.5);
      letter.position.set(TT_W / 2, TT_PREVIEW_H / 2);
      this._tooltipPreview.addChild(letter);
    }

    let sy = TT_PAD;
    const tier = def.tier ?? computeTier(def.cost);
    const nameLabel = UNIT_LABELS[ut] ?? ut.replace(/_/g, " ");

    const nameTxt = new Text({ text: `${nameLabel}  T${tier}`, style: STYLE_TT_NAME });
    nameTxt.position.set(TT_PAD, sy); this._tooltipStats.addChild(nameTxt); sy += 18;

    if (def.description) {
      const descTxt = new Text({ text: def.description, style: STYLE_TT_DESC });
      descTxt.position.set(TT_PAD, sy); this._tooltipStats.addChild(descTxt); sy += descTxt.height + 6;
    }

    const line1 = new Text({ text: `HP:${def.hp}  ATK:${def.atk}  SPD:${def.speed.toFixed(1)}`, style: STYLE_TT_STAT });
    line1.position.set(TT_PAD, sy); this._tooltipStats.addChild(line1); sy += 14;
    const line2 = new Text({ text: `RNG:${def.range}  AS:${def.attackSpeed}  COST:${def.cost}g`, style: STYLE_TT_STAT });
    line2.position.set(TT_PAD, sy); this._tooltipStats.addChild(line2); sy += 14;
    const line3 = new Text({ text: `Spawn: ${def.spawnTime}s`, style: STYLE_TT_STAT });
    line3.position.set(TT_PAD, sy); this._tooltipStats.addChild(line3); sy += 14;

    if (def.abilityTypes.length > 0) {
      const abilTxt = new Text({ text: def.abilityTypes.join(", "), style: STYLE_TT_ABILITY });
      abilTxt.position.set(TT_PAD, sy); this._tooltipStats.addChild(abilTxt); sy += 14;
    }

    const tags: string[] = [];
    if (def.isChargeUnit) tags.push("Charge");
    if (def.isHealer) tags.push("Healer");
    if (def.siegeOnly) tags.push("Siege Only");
    if (tags.length > 0) {
      const tagTxt = new Text({ text: tags.join(" | "), style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xccaa66 }) });
      tagTxt.position.set(TT_PAD, sy); this._tooltipStats.addChild(tagTxt); sy += 14;
    }

    const totalH = TT_PREVIEW_H + sy + TT_PAD;
    this._tooltipBg.clear()
      .roundRect(0, 0, TT_W, totalH, 6).fill({ color: 0x0d0d1e, alpha: 0.95 })
      .roundRect(0, 0, TT_W, totalH, 6).stroke({ color: BORDER_COLOR, alpha: 0.55, width: 1.5 });

    this._positionTooltip(gx, gy);
    this._tooltip.visible = true;
  }

  private _positionTooltip(gx: number, gy: number): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;
    let tx = gx + 16; let ty = gy - 20;
    if (tx + TT_W > sw - 10) tx = gx - TT_W - 16;
    if (ty < 10) ty = 10;
    const ttH = this._tooltipBg.height || 200;
    if (ty + ttH > sh - 10) ty = sh - ttH - 10;
    this._tooltip.position.set(tx, ty);
  }

  private _hideTooltip(): void {
    this._tooltip.visible = false;
    this._activeTooltipUnit = null;
    if (this._tooltipSprite) { this._tooltipSprite.stop(); this._tooltipSprite = null; }
    this._tooltipPreview.removeChildren();
    this._tooltipStats.removeChildren();
  }

  // -------------------------------------------------------------------------
  // Small +/- buttons
  // -------------------------------------------------------------------------

  private _makeSmallBtn(label: string, cx: number, cy: number): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    const bw = 26; const bh = 24;
    btn.position.set(cx - bw / 2, cy - bh / 2);
    const bg = new Graphics()
      .roundRect(0, 0, bw, bh, 4).fill({ color: 0x1a2a3a })
      .roundRect(0, 0, bw, bh, 4).stroke({ color: 0x4488cc, width: 1 });
    btn.addChild(bg);
    const txt = new Text({
      text: label,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0x88ccff, fontWeight: "bold" }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(bw / 2, bh / 2);
    btn.addChild(txt);
    btn.on("pointerover", () => { bg.tint = 0xaaddff; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });
    return btn;
  }

  // -------------------------------------------------------------------------
  // Random toggle, corruption, start button
  // -------------------------------------------------------------------------

  private _buildRandomToggle(w: number): Container {
    const toggleRow = new Container();
    const tH = 30;
    const tBg = new Graphics();
    toggleRow.addChild(tBg);
    const tLabel = new Text({ text: "", style: STYLE_BTN });
    tLabel.anchor.set(0.5, 0.5);
    tLabel.position.set(w / 2, tH / 2);
    toggleRow.addChild(tLabel);
    this._randomToggleBg = tBg;
    this._randomToggleLabel = tLabel;
    this._refreshRandomToggle(w, tH);
    toggleRow.eventMode = "static";
    toggleRow.cursor = "pointer";
    toggleRow.on("pointerdown", () => {
      this._randomToggleOn = !this._randomToggleOn;
      this._refreshRandomToggle(w, tH);
      if (this._randomToggleOn) {
        this._fillRandomArmy();
      } else {
        this._counts.clear();
        this._goldSpent = 0;
        this._refreshAllRows();
        this._refreshGold();
        this._refreshRoster();
      }
    });
    return toggleRow;
  }

  private _buildCorruptionRows(startY: number): number {
    let y = startY;
    const modHeaderRow = new Container();
    modHeaderRow.position.set(0, y);
    const modHeaderTxt = new Text({
      text: `ACTIVE CORRUPTION (${this._activeModifiers.length}):`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xcc88ff, fontWeight: "bold", letterSpacing: 1 }),
    });
    modHeaderTxt.position.set(4, 2);
    modHeaderRow.addChild(modHeaderTxt);
    this._unitScrollContainer.addChild(modHeaderRow);
    this._dynamicRows.push(modHeaderRow);
    y += 18;

    for (const mod of this._activeModifiers) {
      const modRow = new Container();
      modRow.position.set(0, y);
      const modTxt = new Text({
        text: `  ${mod.name} — ${mod.description}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0xaa77dd, letterSpacing: 1 }),
      });
      modTxt.position.set(4, 2);
      modRow.addChild(modTxt);
      this._unitScrollContainer.addChild(modRow);
      this._dynamicRows.push(modRow);
      y += 16;
    }
    y += 6;
    return y;
  }

  private _makeStartButton(): Container {
    const BW = this._cardW - 32;
    const BH = 44;
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.position.set(16, this._cardH - 56);
    const bg = new Graphics()
      .roundRect(0, 0, BW, BH, 6).fill({ color: 0x1a3a1a })
      .roundRect(0, 0, BW, BH, 6).stroke({ color: 0x44aa66, width: 2 });
    btn.addChild(bg);
    const lbl = new Text({
      text: "START BATTLE  >",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 17, fill: 0x88ffaa, fontWeight: "bold", letterSpacing: 2 }),
    });
    lbl.anchor.set(0.5, 0.5);
    lbl.position.set(BW / 2, BH / 2);
    btn.addChild(lbl);
    btn.on("pointerover", () => { bg.tint = 0xaaffcc; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });
    btn.on("pointerdown", () => { this.onDone?.(this._buildRoster()); });
    return btn;
  }

  // -------------------------------------------------------------------------
  // Roster & gold helpers
  // -------------------------------------------------------------------------

  private _buildRoster(): UnitRoster {
    const roster: UnitRoster = [];
    for (const [ut, count] of this._counts) {
      if (count > 0) roster.push({ type: ut, count });
    }
    return roster;
  }

  private _refreshGold(): void {
    const remaining = this._gold - this._goldSpent;
    this._goldText.text = `GOLD: ${remaining} / ${this._gold}`;
  }

  private _refreshAllRows(): void {
    for (const [ut, txt] of this._countTexts) {
      txt.text = String(this._counts.get(ut) ?? 0);
    }
  }

  private _refreshRandomToggle(w: number, h: number): void {
    if (!this._randomToggleBg || !this._randomToggleLabel) return;
    const on = this._randomToggleOn;
    this._randomToggleBg.clear()
      .roundRect(0, 0, w, h, 4).fill({ color: on ? 0x1a3a1a : 0x2a1a1a })
      .roundRect(0, 0, w, h, 4).stroke({ color: on ? 0x44aa66 : 0xaa4444, width: 1.5 });
    this._randomToggleLabel.text = on
      ? "RANDOM ARMY: ON  [click to disable]"
      : "RANDOM ARMY: OFF  [click to enable]";
    this._randomToggleLabel.style.fill = on ? 0x88ffaa : 0xff8888;
  }

  private _fillRandomArmy(): void {
    this._counts.clear();
    this._goldSpent = 0;
    const available = getAllShopUnits(this._raceId).filter((ut) => {
      const uDef = UNIT_DEFINITIONS[ut];
      return uDef && uDef.cost <= this._gold;
    });
    if (available.length === 0) return;
    let remaining = this._gold;
    let safety = 500;
    while (remaining > 0 && safety-- > 0) {
      const affordable = available.filter((ut) => (UNIT_DEFINITIONS[ut].cost ?? 100) <= remaining);
      if (affordable.length === 0) break;
      const pick = affordable[Math.floor(Math.random() * affordable.length)];
      const cost = UNIT_DEFINITIONS[pick].cost ?? 100;
      this._counts.set(pick, (this._counts.get(pick) ?? 0) + 1);
      this._goldSpent += cost;
      remaining -= cost;
    }
    this._refreshAllRows();
    this._refreshGold();
    this._refreshRoster();
  }

  private _clampScroll(): void {
    const tab = this._tabs[this._activeTabIndex];
    if (!tab) return;
    const units = tab.building
      ? getUnitsForBuilding(tab.building, this._raceId)
      : getFactionUnits(this._raceId);
    const topExtra = (this._isAIShop ? 36 : 0) + (this._activeModifiers.length > 0 ? 18 + this._activeModifiers.length * 16 + 6 : 0);
    const contentH = topExtra + units.length * ROW_H;
    const viewH = this._cardH - this._contentTop - 60;
    const minScroll = Math.min(0, viewH - contentH);
    this._unitScrollY = Math.max(minScroll, Math.min(0, this._unitScrollY));
  }

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;
    this._bg.clear();
    this._bg.rect(0, 0, sw, sh).fill({ color: BG_COLOR });
    this._card.position.set(
      Math.floor((sw - this._cardW) / 2),
      Math.floor((sh - this._cardH) / 2),
    );
  }
}

export const unitShopScreen = new UnitShopScreen();
