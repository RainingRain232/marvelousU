// Building wiki screen — shows all buildings organised by prerequisite tier.
// Hovering over a building shows a tooltip with stats and description.

import {
  Container, Graphics, Text, TextStyle, Sprite,
  RenderTexture, Rectangle,
  type Renderer,
} from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import type { BuildingDef } from "@sim/config/BuildingDefs";
import { BuildingType } from "@/types";
import { BUILDING_LABELS, UNIT_LABELS } from "@view/ui/HoverTooltip";

// Building renderers (same set as HoverTooltip)
import { CastleRenderer } from "@view/entities/CastleRenderer";
import { TowerRenderer } from "@view/entities/TowerRenderer";
import { LightningTowerRenderer } from "@view/entities/LightningTowerRenderer";
import { IceTowerRenderer } from "@view/entities/IceTowerRenderer";
import { FireTowerRenderer } from "@view/entities/FireTowerRenderer";
import { WarpTowerRenderer } from "@view/entities/WarpTowerRenderer";
import { HealingTowerRenderer } from "@view/entities/HealingTowerRenderer";
import { BallistaTowerRenderer } from "@view/entities/BallistaTowerRenderer";
import { RepeaterTowerRenderer } from "@view/entities/RepeaterTowerRenderer";
import { ArchitectsGuildRenderer } from "@view/entities/ArchitectsGuildRenderer";
import { FarmRenderer } from "@view/entities/FarmRenderer";
import { WallRenderer } from "@view/entities/WallRenderer";
import { TempleRenderer } from "@view/entities/TempleRenderer";
import { MageTowerRenderer } from "@view/entities/MageTowerRenderer";
import { ArcheryRangeRenderer } from "@view/entities/ArcheryRangeRenderer";
import { BarracksRenderer } from "@view/entities/BarracksRenderer";
import { FrontViewStablesRenderer } from "@view/entities/FrontViewStablesRenderer";
import { SiegeWorkshopRenderer } from "@view/entities/SiegeWorkshopRenderer";
import { BlacksmithRenderer } from "@view/entities/BlacksmithRenderer";
import { EmbassyRenderer } from "@view/entities/EmbassyRenderer";
import { CreatureDenRenderer } from "@view/entities/CreatureDenRenderer";
import { MillRenderer } from "@view/entities/MillRenderer";
import { HamletRenderer } from "@view/entities/HamletRenderer";
import { EliteHallRenderer } from "@view/entities/EliteHallRenderer";
import { MarketRenderer } from "@view/entities/MarketRenderer";
import { FactionHallRenderer } from "@view/entities/FactionHallRenderer";
import { House1Renderer } from "@view/entities/House1Renderer";
import { House2Renderer } from "@view/entities/House2Renderer";
import { House3Renderer } from "@view/entities/House3Renderer";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_SCREEN_TITLE = new TextStyle({
  fontFamily: "monospace", fontSize: 29, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 3,
});

const STYLE_SUBTITLE = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0x99aabb,
  wordWrap: true, wordWrapWidth: 1100,
});

const STYLE_TIER_HEADER = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 2,
});

const STYLE_BUILDING_NAME = new TextStyle({
  fontFamily: "monospace", fontSize: 10, fill: 0xccddee,
});

const STYLE_TT_NAME = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xffd700, fontWeight: "bold",
});

const STYLE_TT_DESC = new TextStyle({
  fontFamily: "monospace", fontSize: 10, fill: 0xaaaadd,
  wordWrap: true, wordWrapWidth: 250,
});

const STYLE_TT_STAT = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0xbbccdd,
});

const STYLE_TT_UNITS = new TextStyle({
  fontFamily: "monospace", fontSize: 10, fill: 0x88ffaa,
  wordWrap: true, wordWrapWidth: 250,
});

const STYLE_TT_PREREQ = new TextStyle({
  fontFamily: "monospace", fontSize: 10, fill: 0xcc8844,
});

// Colors & layout
const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;
const CARD_W = 1248;
const CARD_H = 754;
const CORNER_R = 10;

// Building card
const BCARD_W = 78;
const BCARD_H = 78;
const BCARD_GAP = 8;
const ICON_SIZE = 48;

// Tooltip
const TT_W = 280;
const TT_PAD = 10;

// ---------------------------------------------------------------------------
// Building tiers (prerequisite depth)
// ---------------------------------------------------------------------------

interface BuildingTier {
  label: string;
  buildings: BuildingType[];
}

const BUILDING_TIERS: BuildingTier[] = [
  {
    label: "FOUNDATION",
    buildings: [BuildingType.CASTLE],
  },
  {
    label: "TIER 1 — NO PREREQUISITES",
    buildings: [
      BuildingType.BARRACKS, BuildingType.ARCHERY_RANGE, BuildingType.FARM,
      BuildingType.EMBASSY, BuildingType.TEMPLE, BuildingType.WALL,
    ],
  },
  {
    label: "TIER 2 — REQUIRE A TIER 1 BUILDING",
    buildings: [
      BuildingType.STABLES, BuildingType.BLACKSMITH,
      BuildingType.SIEGE_WORKSHOP, BuildingType.MAGE_TOWER,
      BuildingType.MARKET, BuildingType.FACTION_HALL,
      BuildingType.HAMLET, BuildingType.MILL,
    ],
  },
  {
    label: "TIER 3 — REQUIRE A TIER 2 BUILDING",
    buildings: [
      BuildingType.TOWER, BuildingType.ARCHITECTS_GUILD,
      BuildingType.ELITE_HALL, BuildingType.CREATURE_DEN,
      BuildingType.BALLISTA_TOWER, BuildingType.REPEATER_TOWER,
    ],
  },
  {
    label: "TIER 4 — TOWER VARIANTS (REQUIRE TOWER)",
    buildings: [
      BuildingType.LIGHTNING_TOWER, BuildingType.ICE_TOWER,
      BuildingType.FIRE_TOWER, BuildingType.WARP_TOWER,
      BuildingType.HEALING_TOWER,
    ],
  },
  {
    label: "CAPTURABLE — NEUTRAL BUILDINGS",
    buildings: [
      BuildingType.TOWN, BuildingType.HOUSE1,
      BuildingType.HOUSE2, BuildingType.HOUSE3,
    ],
  },
];

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class BuildingWikiScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _mainCard!: Container;

  // Scroll
  private _contentContainer!: Container;
  private _contentMask!: Graphics;
  private _scrollY = 0;
  private _maxScroll = 0;
  private _contentH = 0;
  private _viewH = 0;

  // Tooltip
  private _tooltip!: Container;

  // Building texture cache
  private _textureCache = new Map<BuildingType, RenderTexture | null>();

  // Callbacks
  onBack: (() => void) | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    this._mainCard = new Container();
    this.container.addChild(this._mainCard);

    this._buildUI();

    vm.addToLayer("ui", this.container);
    this._layout();
    vm.app.renderer.on("resize", () => this._layout());
  }

  show(): void {
    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
    this._hideTooltip();
  }

  destroy(): void {
    for (const rt of this._textureCache.values()) {
      if (rt) rt.destroy(true);
    }
    this._textureCache.clear();
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Build UI
  // ---------------------------------------------------------------------------

  private _buildUI(): void {
    const card = this._mainCard;

    // Card background
    card.addChild(
      new Graphics()
        .roundRect(0, 0, CARD_W, CARD_H, CORNER_R)
        .fill({ color: 0x10102a, alpha: 0.97 })
        .roundRect(0, 0, CARD_W, CARD_H, CORNER_R)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
    );

    // Back button
    const backBtn = this._makeNavBtn("< BACK", 104, 36, false);
    backBtn.position.set(21, 18);
    backBtn.on("pointerdown", () => this.onBack?.());
    card.addChild(backBtn);

    // Title
    const title = new Text({ text: "BUILDING WIKI", style: STYLE_SCREEN_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CARD_W / 2, 18);
    card.addChild(title);

    // Divider
    card.addChild(
      new Graphics().rect(21, 65, CARD_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // Description
    const desc = new Text({
      text: "All buildings available in Rain. Buildings are organised by prerequisite tier — higher tiers require earlier buildings to be constructed first. Hover over a building for details.",
      style: STYLE_SUBTITLE,
    });
    desc.position.set(26, 75);
    card.addChild(desc);

    // Divider
    const contentTop = 110;
    card.addChild(
      new Graphics().rect(21, contentTop - 4, CARD_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    // Scrollable content area
    this._viewH = CARD_H - contentTop - 10;

    this._contentMask = new Graphics()
      .rect(21, contentTop, CARD_W - 42, this._viewH)
      .fill({ color: 0xffffff });
    card.addChild(this._contentMask);

    this._contentContainer = new Container();
    this._contentContainer.position.set(26, contentTop);
    this._contentContainer.mask = this._contentMask;
    card.addChild(this._contentContainer);

    // Build tier sections
    let cy = 4;
    for (const tier of BUILDING_TIERS) {
      cy = this._buildTierSection(tier, cy);
    }

    this._contentH = cy;
    this._maxScroll = Math.max(0, this._contentH - this._viewH);

    // Wheel scroll
    card.eventMode = "static";
    card.on("wheel", (e) => this._onWheel(e));

    // Tooltip (on top)
    this._tooltip = new Container();
    this._tooltip.visible = false;
    card.addChild(this._tooltip);
  }

  // ---------------------------------------------------------------------------
  // Tier section
  // ---------------------------------------------------------------------------

  private _buildTierSection(tier: BuildingTier, startY: number): number {
    let cy = startY;

    // Tier header
    const hdr = new Text({ text: tier.label, style: STYLE_TIER_HEADER });
    hdr.position.set(0, cy);
    this._contentContainer.addChild(hdr);
    cy += 18;

    // Divider
    this._contentContainer.addChild(
      new Graphics().rect(0, cy, CARD_W - 72, 1).fill({ color: 0x334455, alpha: 0.5 }),
    );
    cy += 6;

    // Building cards in a row (wrap if needed)
    const maxPerRow = Math.floor((CARD_W - 72) / (BCARD_W + BCARD_GAP));
    let col = 0;
    const rowStartY = cy;

    for (const bt of tier.buildings) {
      const def = BUILDING_DEFINITIONS[bt];
      if (!def) continue;

      const x = col * (BCARD_W + BCARD_GAP);
      const y = cy;

      this._buildBuildingCard(bt, def, x, y);

      col++;
      if (col >= maxPerRow) {
        col = 0;
        cy += BCARD_H + BCARD_GAP;
      }
    }

    // If we placed any items, advance past the last row
    if (col > 0) cy += BCARD_H + BCARD_GAP;
    // Ensure at least one row height was used
    if (cy === rowStartY) cy += BCARD_H + BCARD_GAP;

    cy += 6; // gap between tiers
    return cy;
  }

  // ---------------------------------------------------------------------------
  // Building card
  // ---------------------------------------------------------------------------

  private _buildBuildingCard(bt: BuildingType, def: BuildingDef, x: number, y: number): void {
    const card = new Container();
    card.position.set(x, y);
    card.eventMode = "static";
    card.cursor = "pointer";
    card.hitArea = new Rectangle(0, 0, BCARD_W, BCARD_H);
    this._contentContainer.addChild(card);

    // Background
    const bg = new Graphics()
      .roundRect(0, 0, BCARD_W, BCARD_H, 5)
      .fill({ color: 0x10101e })
      .roundRect(0, 0, BCARD_W, BCARD_H, 5)
      .stroke({ color: 0x334455, width: 1 });
    card.addChild(bg);

    // Render building sprite preview
    const tex = this._getBuildingTexture(bt);
    if (tex) {
      const sprite = new Sprite(tex);
      const maxW = ICON_SIZE;
      const maxH = ICON_SIZE - 4;
      const scale = Math.min(maxW / tex.width, maxH / tex.height);
      sprite.scale.set(scale);
      sprite.position.set(
        (BCARD_W - tex.width * scale) / 2,
        2 + (maxH - tex.height * scale) / 2,
      );
      card.addChild(sprite);
    } else {
      // Letter fallback
      const ltr = new Text({
        text: (BUILDING_LABELS[bt] ?? bt).charAt(0),
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 20, fill: 0x445566, fontWeight: "bold",
        }),
      });
      ltr.anchor.set(0.5, 0.5);
      ltr.position.set(BCARD_W / 2, BCARD_H / 2 - 8);
      card.addChild(ltr);
    }

    // Name
    const name = BUILDING_LABELS[bt] ?? bt;
    const nameT = new Text({
      text: name.length > 12 ? name.substring(0, 11) + "." : name,
      style: STYLE_BUILDING_NAME,
    });
    nameT.anchor.set(0.5, 0);
    nameT.position.set(BCARD_W / 2, BCARD_H - 16);
    card.addChild(nameT);

    // Hover
    card.on("pointerover", () => {
      bg.clear()
        .roundRect(0, 0, BCARD_W, BCARD_H, 5)
        .fill({ color: 0x1a2a3a })
        .roundRect(0, 0, BCARD_W, BCARD_H, 5)
        .stroke({ color: BORDER_COLOR, width: 1.5 });
      const cardX = 26 + x + BCARD_W + 4;
      const cardY = this._contentContainer.position.y + y - this._scrollY;
      this._showTooltip(bt, def, cardX, cardY);
    });
    card.on("pointerout", () => {
      bg.clear()
        .roundRect(0, 0, BCARD_W, BCARD_H, 5)
        .fill({ color: 0x10101e })
        .roundRect(0, 0, BCARD_W, BCARD_H, 5)
        .stroke({ color: 0x334455, width: 1 });
      this._hideTooltip();
    });
  }

  // ---------------------------------------------------------------------------
  // Tooltip
  // ---------------------------------------------------------------------------

  private _showTooltip(bt: BuildingType, def: BuildingDef, cardX: number, cardY: number): void {
    const tt = this._tooltip;
    tt.removeChildren();

    let cy = TT_PAD;

    // Preview sprite
    const tex = this._getBuildingTexture(bt);
    if (tex) {
      const PREVIEW_H = 64;
      const sprite = new Sprite(tex);
      const scale = Math.min((TT_W - TT_PAD * 2) / tex.width, PREVIEW_H / tex.height);
      sprite.scale.set(scale);
      sprite.position.set(
        TT_PAD + ((TT_W - TT_PAD * 2) - tex.width * scale) / 2,
        cy + (PREVIEW_H - tex.height * scale) / 2,
      );
      tt.addChild(sprite);
      cy += PREVIEW_H + 4;
    }

    // Name
    const name = BUILDING_LABELS[bt] ?? bt;
    const nameT = new Text({ text: name, style: STYLE_TT_NAME });
    nameT.position.set(TT_PAD, cy);
    tt.addChild(nameT);
    cy += 18;

    // Description
    if (def.description) {
      const descT = new Text({ text: def.description, style: STYLE_TT_DESC });
      descT.position.set(TT_PAD, cy);
      tt.addChild(descT);
      cy += descT.height + 6;
    }

    // Divider
    tt.addChild(new Graphics().rect(TT_PAD, cy, TT_W - TT_PAD * 2, 1).fill({ color: 0x334455 }));
    cy += 5;

    // Stats
    const stats = [
      `Cost: ${def.cost}g`,
      `HP: ${def.hp}`,
      `Income: ${def.goldIncome}g/s`,
      `Size: ${def.footprint.w}x${def.footprint.h}`,
    ];
    if (def.capturable) stats.push("Capturable");
    if (def.maxCount) stats.push(`Max: ${def.maxCount}`);

    const statT = new Text({ text: stats.join("  "), style: STYLE_TT_STAT });
    statT.position.set(TT_PAD, cy);
    tt.addChild(statT);
    cy += 14;

    // Prerequisites
    if (def.prerequisite) {
      const prereqNames = def.prerequisite.types
        .map((t) => BUILDING_LABELS[t] ?? t)
        .join(", ");
      const countStr = def.prerequisite.minCount > 1
        ? ` (x${def.prerequisite.minCount})`
        : "";
      const prereqT = new Text({
        text: `Requires: ${prereqNames}${countStr}`,
        style: STYLE_TT_PREREQ,
      });
      prereqT.position.set(TT_PAD, cy);
      tt.addChild(prereqT);
      cy += 14;
    }

    // Units trained
    if (def.shopInventory.length > 0) {
      const unitNames = def.shopInventory
        .map((u) => UNIT_LABELS[u] ?? u)
        .join(", ");
      const unitsT = new Text({
        text: `Trains: ${unitNames}`,
        style: STYLE_TT_UNITS,
      });
      unitsT.position.set(TT_PAD, cy);
      tt.addChild(unitsT);
      cy += unitsT.height + 4;
    }

    // Blueprints available
    if (def.blueprints.length > 0) {
      const bpNames = def.blueprints
        .map((b) => BUILDING_LABELS[b] ?? b)
        .join(", ");
      const bpT = new Text({
        text: `Blueprints: ${bpNames}`,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 10, fill: 0x88bbff,
          wordWrap: true, wordWrapWidth: TT_W - TT_PAD * 2,
        }),
      });
      bpT.position.set(TT_PAD, cy);
      tt.addChild(bpT);
      cy += bpT.height + 4;
    }

    const TT_H = cy + TT_PAD;

    // Background
    const bg = new Graphics()
      .roundRect(0, 0, TT_W, TT_H, 6)
      .fill({ color: 0x0d0d1e, alpha: 0.95 })
      .roundRect(0, 0, TT_W, TT_H, 6)
      .stroke({ color: BORDER_COLOR, alpha: 0.5, width: 1 });
    tt.addChildAt(bg, 0);

    // Position
    let tx = cardX + 6;
    let ty = cardY - TT_H / 2;

    if (tx + TT_W > CARD_W - 10) {
      tx = cardX - BCARD_W - TT_W - 10;
    }
    if (ty < 10) ty = 10;
    if (ty + TT_H > CARD_H - 10) ty = CARD_H - TT_H - 10;

    tt.position.set(tx, ty);
    tt.visible = true;
  }

  private _hideTooltip(): void {
    if (!this._tooltip) return;
    this._tooltip.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Scroll
  // ---------------------------------------------------------------------------

  private _onWheel(e: WheelEvent): void {
    if (this._maxScroll <= 0) return;
    this._scrollY = Math.max(0, Math.min(this._maxScroll, this._scrollY + e.deltaY));
    this._contentContainer.position.y = 110 - this._scrollY;
  }

  // ---------------------------------------------------------------------------
  // Building texture cache (same approach as HoverTooltip)
  // ---------------------------------------------------------------------------

  private _getBuildingTexture(bt: BuildingType): RenderTexture | null {
    if (this._textureCache.has(bt)) return this._textureCache.get(bt)!;

    const renderer = this._vm.app.renderer as Renderer;
    let buildingContainer: Container | null = null;
    let texW = 64;
    let texH = 64;

    if (bt === BuildingType.CASTLE) {
      buildingContainer = new CastleRenderer(null).container; texW = 256; texH = 256;
    } else if (bt === BuildingType.TOWER) {
      buildingContainer = new TowerRenderer(null).container;
    } else if (bt === BuildingType.FARM) {
      buildingContainer = new FarmRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.HAMLET) {
      buildingContainer = new HamletRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.WALL) {
      buildingContainer = new WallRenderer().container; texW = 64; texH = 192;
    } else if (bt === BuildingType.TEMPLE) {
      buildingContainer = new TempleRenderer(null).container; texW = 128; texH = 192;
    } else if (bt === BuildingType.EMBASSY) {
      buildingContainer = new EmbassyRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.BLACKSMITH) {
      buildingContainer = new BlacksmithRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.CREATURE_DEN) {
      buildingContainer = new CreatureDenRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.MILL) {
      buildingContainer = new MillRenderer(null).container; texW = 64; texH = 128;
    } else if (bt === BuildingType.ELITE_HALL) {
      buildingContainer = new EliteHallRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.MAGE_TOWER) {
      buildingContainer = new MageTowerRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.SIEGE_WORKSHOP) {
      buildingContainer = new SiegeWorkshopRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.ARCHERY_RANGE) {
      buildingContainer = new ArcheryRangeRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.STABLES) {
      buildingContainer = new FrontViewStablesRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.BARRACKS) {
      buildingContainer = new BarracksRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.MARKET) {
      buildingContainer = new MarketRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.FACTION_HALL) {
      buildingContainer = new FactionHallRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.LIGHTNING_TOWER) {
      buildingContainer = new LightningTowerRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.ICE_TOWER) {
      buildingContainer = new IceTowerRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.FIRE_TOWER) {
      buildingContainer = new FireTowerRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.WARP_TOWER) {
      buildingContainer = new WarpTowerRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.HEALING_TOWER) {
      buildingContainer = new HealingTowerRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.BALLISTA_TOWER) {
      buildingContainer = new BallistaTowerRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.REPEATER_TOWER) {
      buildingContainer = new RepeaterTowerRenderer(null).container; texW = 128; texH = 128;
    } else if (bt === BuildingType.ARCHITECTS_GUILD) {
      buildingContainer = new ArchitectsGuildRenderer(null).container; texW = 192; texH = 128;
    } else if (bt === BuildingType.HOUSE1) {
      buildingContainer = new House1Renderer(null).container; texW = 64; texH = 128;
    } else if (bt === BuildingType.HOUSE2) {
      buildingContainer = new House2Renderer(null).container; texW = 64; texH = 128;
    } else if (bt === BuildingType.HOUSE3) {
      buildingContainer = new House3Renderer(null).container; texW = 64; texH = 128;
    }

    if (!buildingContainer) {
      this._textureCache.set(bt, null);
      return null;
    }

    const rt = RenderTexture.create({ width: texW, height: texH });
    renderer.render({ container: buildingContainer, target: rt });
    buildingContainer.destroy({ children: true });

    this._textureCache.set(bt, rt);
    return rt;
  }

  // ---------------------------------------------------------------------------
  // Nav button
  // ---------------------------------------------------------------------------

  private _makeNavBtn(label: string, w: number, h: number, primary = false): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    const bg = new Graphics()
      .roundRect(0, 0, w, h, 8)
      .fill({ color: primary ? 0x1a3a1a : 0x1a2a3a })
      .roundRect(0, 0, w, h, 8)
      .stroke({ color: primary ? 0x44aa66 : 0x4488cc, width: 1.5 });
    btn.addChild(bg);
    const txt = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: primary ? 17 : 14,
        fill: primary ? 0x88ffaa : 0x88bbff,
        fontWeight: "bold", letterSpacing: 1,
      }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(txt);
    btn.on("pointerover", () => { bg.tint = primary ? 0xaaffcc : 0xaaddff; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });
    return btn;
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;
    this._bg.clear().rect(0, 0, sw, sh).fill({ color: BG_COLOR });
    this._mainCard.position.set(
      Math.floor((sw - CARD_W) / 2),
      Math.floor((sh - CARD_H) / 2),
    );
  }
}

export const buildingWikiScreen = new BuildingWikiScreen();
