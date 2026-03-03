// Race detail screen — shown after race selection, before armory.
// Displays race portrait, flavor text, tier ratings, faction units, and
// all available general units organised by category.

import {
  Container, Graphics, Text, TextStyle, Sprite, Texture,
  AnimatedSprite, Assets, Rectangle,
} from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { RACE_DEFINITIONS, getRace } from "@sim/config/RaceDefs";
import type { RaceDef, RaceId, RaceTiers } from "@sim/config/RaceDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import type { UnitDef } from "@sim/config/UnitDefinitions";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { BuildingType, UnitType, UnitState } from "@/types";
import { animationManager } from "@view/animation/AnimationManager";

// Vite static image imports
import elfImgUrl from "@/img/elf.png";
import manImgUrl from "@/img/man.png";

const RACE_IMAGES: Record<string, string> = {
  elf: elfImgUrl,
  man: manImgUrl,
};

// ---------------------------------------------------------------------------
// Styles (all font sizes scaled 30%)
// ---------------------------------------------------------------------------

const STYLE_SCREEN_TITLE = new TextStyle({
  fontFamily: "monospace", fontSize: 29, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 3,
});
const STYLE_RACE_NAME = new TextStyle({
  fontFamily: "monospace", fontSize: 23, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 2,
});
const STYLE_RACE_TITLE = new TextStyle({
  fontFamily: "monospace", fontSize: 16, fill: 0x99aabb, letterSpacing: 1,
});
const STYLE_FLAVOR = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xaabbcc,
  wordWrap: true, wordWrapWidth: 560,
});
const STYLE_SECTION = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 2,
});
const STYLE_TIER_LABEL = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0x99aabb, letterSpacing: 1,
});
const STYLE_TIER_VALUE = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0xffd700,
  fontWeight: "bold",
});
const STYLE_UNIT_NAME = new TextStyle({
  fontFamily: "monospace", fontSize: 10, fill: 0xccddee,
});
const STYLE_UNIT_NAME_HOVER = new TextStyle({
  fontFamily: "monospace", fontSize: 10, fill: 0xffffff,
});
const STYLE_UNIT_TIER = new TextStyle({
  fontFamily: "monospace", fontSize: 10, fill: 0xffd700, fontWeight: "bold",
});
const STYLE_COL_HEADER = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0x88aacc,
  fontWeight: "bold", letterSpacing: 1,
});

// Tooltip styles
const STYLE_TT_NAME = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xffd700, fontWeight: "bold",
});
const STYLE_TT_STAT = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0xbbccdd,
});
const STYLE_TT_SPAWN = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0x668866,
});
const STYLE_TT_DESC = new TextStyle({
  fontFamily: "monospace", fontSize: 10, fill: 0xaaaadd,
  wordWrap: true, wordWrapWidth: 210,
});

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;
const CARD_W = 1248;
const CARD_H = 754;
const PORTRAIT_SIZE = 234;
const CORNER_R = 10;

// Scrollbar
const SCROLLBAR_W = 8;
const SCROLLBAR_PAD = 4;

// Tooltip
const TT_W = 240;
const TT_PAD = 10;

// ---------------------------------------------------------------------------
// Unit category helpers
// ---------------------------------------------------------------------------

type UnitCategory = "melee" | "ranged" | "magic" | "siege" | "creature" | "heal";

const CATEGORY_LABELS: Record<UnitCategory, string> = {
  melee: "MELEE", ranged: "RANGED", magic: "MAGIC",
  siege: "SIEGE", creature: "CREATURE", heal: "HEAL",
};

function getUnitCategory(ut: UnitType): UnitCategory | null {
  const barracks = BUILDING_DEFINITIONS[BuildingType.BARRACKS].shopInventory;
  const stables = BUILDING_DEFINITIONS[BuildingType.STABLES].shopInventory;
  const archery = BUILDING_DEFINITIONS[BuildingType.ARCHERY_RANGE].shopInventory;
  const mage = BUILDING_DEFINITIONS[BuildingType.MAGE_TOWER].shopInventory;
  const siege = BUILDING_DEFINITIONS[BuildingType.SIEGE_WORKSHOP].shopInventory;
  const creature = BUILDING_DEFINITIONS[BuildingType.CREATURE_DEN].shopInventory;
  const temple = BUILDING_DEFINITIONS[BuildingType.TEMPLE].shopInventory;
  if (temple.includes(ut)) return "heal";
  if (mage.includes(ut)) return "magic";
  if (siege.includes(ut)) return "siege";
  if (creature.includes(ut)) return "creature";
  if (archery.includes(ut)) return "ranged";
  // Horse archer is in stables but is ranged
  if (ut === UnitType.HORSE_ARCHER) return "ranged";
  if (stables.includes(ut)) return "melee";
  if (barracks.includes(ut)) return "melee";
  if (ut === UnitType.SWORDSMAN || ut === UnitType.ARCHER) {
    // Castle units
    return ut === UnitType.ARCHER ? "ranged" : "melee";
  }
  // Special units
  if (ut === UnitType.HERO) return "melee";
  if (ut === UnitType.DIPLOMAT) return null; // utility, skip
  if (ut === UnitType.SUMMONED) return null; // spawned, skip
  return null;
}

/** Get all general (non-faction) units organised by category, sorted by tier then cost. */
function getGeneralUnits(factionUnits: UnitType[]): Record<UnitCategory, UnitDef[]> {
  const result: Record<UnitCategory, UnitDef[]> = {
    melee: [], ranged: [], magic: [], siege: [], creature: [], heal: [],
  };
  const factionSet = new Set(factionUnits);
  const seen = new Set<UnitType>();

  for (const [key, def] of Object.entries(UNIT_DEFINITIONS)) {
    const ut = key as UnitType;
    if (factionSet.has(ut)) continue;
    if (seen.has(ut)) continue;
    seen.add(ut);
    const cat = getUnitCategory(ut);
    if (!cat) continue;
    result[cat].push(def);
  }

  // Sort by tier, then cost
  for (const cat of Object.keys(result) as UnitCategory[]) {
    result[cat].sort((a, b) => (a.tier ?? 1) - (b.tier ?? 1) || a.cost - b.cost);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Tier pip icons
// ---------------------------------------------------------------------------

const TIER_ICON_INFO: { key: keyof RaceTiers; label: string; color: number }[] = [
  { key: "melee", label: "Melee", color: 0xcc8844 },
  { key: "ranged", label: "Ranged", color: 0x44aa66 },
  { key: "siege", label: "Siege", color: 0x888888 },
  { key: "magic", label: "Magic", color: 0x8866cc },
  { key: "creature", label: "Creature", color: 0xaa4444 },
  { key: "heal", label: "Heal", color: 0x44ccaa },
  { key: "fire", label: "Fire", color: 0xff6622 },
  { key: "cold", label: "Cold", color: 0x4488ff },
  { key: "lightning", label: "Lightning", color: 0xffdd22 },
  { key: "distortion", label: "Distortion", color: 0xaa44cc },
  { key: "summon", label: "Summon", color: 0x66aa44 },
  { key: "nature", label: "Nature", color: 0x22cc44 },
];

// ---------------------------------------------------------------------------
// RaceDetailScreen
// ---------------------------------------------------------------------------

export class RaceDetailScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _mainCard!: Container;
  private _raceId: RaceId = "man";

  // Scroll state for unit roster
  private _rosterContainer!: Container;
  private _rosterMask!: Graphics;
  private _rosterBaseY = 0;
  private _scrollY = 0;
  private _maxScroll = 0;
  private _rosterH = 0;
  private _rosterContentH = 0;

  // Scrollbar visuals
  private _scrollTrack!: Graphics;
  private _scrollThumb!: Graphics;

  // Tooltip
  private _tooltip!: Container;
  private _tooltipSprite: AnimatedSprite | null = null;

  onNext: (() => void) | null = null;
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

    vm.addToLayer("ui", this.container);
    this._layout();
    vm.app.renderer.on("resize", () => this._layout());
  }

  show(raceId: RaceId): void {
    this._raceId = raceId;
    this.container.visible = true;
    this._buildUI();
    this._layout();
  }

  hide(): void {
    this.container.visible = false;
    this._hideTooltip();
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

  // ---------------------------------------------------------------------------
  // Full UI rebuild (called on show)
  // ---------------------------------------------------------------------------

  private _buildUI(): void {
    const card = this._mainCard;
    card.removeChildren();
    this._scrollY = 0;

    const race = getRace(this._raceId) ?? RACE_DEFINITIONS[0];

    // Card background
    card.addChild(
      new Graphics()
        .roundRect(0, 0, CARD_W, CARD_H, CORNER_R)
        .fill({ color: 0x10102a, alpha: 0.97 })
        .roundRect(0, 0, CARD_W, CARD_H, CORNER_R)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
    );

    // Header
    const backBtn = this._makeNavBtn("< BACK", 104, 36, false);
    backBtn.position.set(21, 18);
    backBtn.on("pointerdown", () => this.onBack?.());
    card.addChild(backBtn);

    const title = new Text({ text: "RACE OVERVIEW", style: STYLE_SCREEN_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CARD_W / 2, 18);
    card.addChild(title);

    // Divider
    card.addChild(
      new Graphics().rect(21, 65, CARD_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // ---- Top section: portrait + info ----
    const TOP_Y = 75;
    this._buildPortrait(card, race, 26, TOP_Y);
    this._buildRaceInfo(card, race, 26 + PORTRAIT_SIZE + 21, TOP_Y);

    // ---- Faction units row ----
    const FACTION_Y = TOP_Y + PORTRAIT_SIZE + 16;
    this._buildFactionRow(card, race, FACTION_Y);

    // ---- Available units roster (extra space for faction unit names) ----
    const ROSTER_Y = FACTION_Y + 120;
    this._buildUnitRoster(card, race, ROSTER_Y);

    // Divider above footer
    card.addChild(
      new Graphics().rect(21, CARD_H - 68, CARD_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    // Continue button
    const nextBtn = this._makeNavBtn("CONTINUE  >", 195, 44, true);
    nextBtn.position.set(CARD_W - 221, CARD_H - 57);
    nextBtn.on("pointerdown", () => this.onNext?.());
    card.addChild(nextBtn);

    // Tooltip (added last so it renders on top)
    this._buildTooltip(card);

    // Wheel scroll for roster
    card.eventMode = "static";
    card.on("wheel", (e: WheelEvent) => this._onRosterWheel(e));
  }

  // ---------------------------------------------------------------------------
  // Portrait (left column)
  // ---------------------------------------------------------------------------

  private _buildPortrait(parent: Container, race: RaceDef, x: number, y: number): void {
    const cont = new Container();
    cont.position.set(x, y);
    parent.addChild(cont);

    // Border frame
    cont.addChild(
      new Graphics()
        .roundRect(0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE, 8)
        .fill({ color: 0x080818 })
        .roundRect(0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE, 8)
        .stroke({ color: race.accentColor, alpha: 0.6, width: 1.5 }),
    );

    // Load image
    const imgUrl = RACE_IMAGES[race.id];
    if (imgUrl) {
      void Assets.load(imgUrl).then((tex: Texture) => {
        if (!this.container.visible) return;
        const sprite = new Sprite(tex);
        const scale = Math.min(
          (PORTRAIT_SIZE - 10) / tex.width,
          (PORTRAIT_SIZE - 10) / tex.height,
        );
        sprite.scale.set(scale);
        sprite.position.set(5, 5);
        cont.addChild(sprite);
      });
    } else {
      // Fallback
      const ltr = new Text({ text: race.name.charAt(0), style: new TextStyle({
        fontFamily: "monospace", fontSize: 78, fill: race.accentColor, fontWeight: "bold",
      }) });
      ltr.anchor.set(0.5, 0.5);
      ltr.position.set(PORTRAIT_SIZE / 2, PORTRAIT_SIZE / 2);
      cont.addChild(ltr);
    }
  }

  // ---------------------------------------------------------------------------
  // Race info (right of portrait)
  // ---------------------------------------------------------------------------

  private _buildRaceInfo(parent: Container, race: RaceDef, x: number, y: number): void {
    const cont = new Container();
    cont.position.set(x, y);
    parent.addChild(cont);

    let cy = 0;

    // Name
    const nameT = new Text({ text: race.name, style: STYLE_RACE_NAME });
    nameT.position.set(0, cy);
    cont.addChild(nameT);
    cy += 31;

    // Title
    const titleT = new Text({ text: race.title, style: STYLE_RACE_TITLE });
    titleT.position.set(0, cy);
    cont.addChild(titleT);
    cy += 23;

    // Divider
    cont.addChild(new Graphics().rect(0, cy, 572, 1).fill({ color: 0x334455 }));
    cy += 8;

    // Flavor
    const flavorT = new Text({ text: race.flavor, style: STYLE_FLAVOR });
    flavorT.position.set(0, cy);
    cont.addChild(flavorT);
    cy += flavorT.height + 10;

    // Tier ratings
    if (race.tiers) {
      cont.addChild(new Graphics().rect(0, cy, 572, 1).fill({ color: 0x334455 }));
      cy += 8;

      const tierLabel = new Text({ text: "TIER RATINGS", style: STYLE_SECTION });
      tierLabel.position.set(0, cy);
      cont.addChild(tierLabel);
      cy += 21;

      this._buildTierGrid(cont, race.tiers, 0, cy, race.accentColor);
    }
  }

  // ---------------------------------------------------------------------------
  // Tier rating grid
  // ---------------------------------------------------------------------------

  private _buildTierGrid(parent: Container, tiers: RaceTiers, x: number, y: number, _accent: number): void {
    const COLS = 3;
    const COL_W = 192;
    const ROW_H = 21;

    for (let i = 0; i < TIER_ICON_INFO.length; i++) {
      const info = TIER_ICON_INFO[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const px = x + col * COL_W;
      const py = y + row * ROW_H;

      const label = new Text({ text: info.label, style: STYLE_TIER_LABEL });
      label.position.set(px, py);
      parent.addChild(label);

      // Draw pips
      const val = tiers[info.key];
      const g = new Graphics();
      for (let p = 0; p < 5; p++) {
        const pipX = px + 81 + p * 16;
        const pipY = py + 5;
        if (p < val) {
          g.circle(pipX, pipY, 4.5).fill({ color: info.color, alpha: 0.9 });
        } else {
          g.circle(pipX, pipY, 4.5)
            .fill({ color: 0x1a1a2a })
            .circle(pipX, pipY, 4.5)
            .stroke({ color: info.color, alpha: 0.3, width: 0.5 });
        }
      }

      // Numeric value
      const numT = new Text({ text: `${val}`, style: STYLE_TIER_VALUE });
      numT.position.set(px + 81 + 5 * 16 + 5, py);
      parent.addChild(numT);

      parent.addChild(g);
    }
  }

  // ---------------------------------------------------------------------------
  // Faction units row
  // ---------------------------------------------------------------------------

  private _buildFactionRow(parent: Container, race: RaceDef, y: number): void {
    // Section label
    const label = new Text({ text: "FACTION UNITS", style: STYLE_SECTION });
    label.position.set(26, y);
    parent.addChild(label);

    // Divider
    parent.addChild(
      new Graphics().rect(26, y + 21, CARD_W - 52, 1).fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    const row = new Container();
    row.position.set(26, y + 26);
    parent.addChild(row);

    const ICON_SIZE = 62;
    const GAP = 10;

    for (let i = 0; i < race.factionUnits.length; i++) {
      const ut = race.factionUnits[i];
      const def = UNIT_DEFINITIONS[ut];
      const ix = i * (ICON_SIZE + GAP);

      // Interactive wrapper
      const btn = new Container();
      btn.position.set(ix, 0);
      btn.eventMode = "static";
      btn.cursor = "pointer";
      btn.hitArea = new Rectangle(0, 0, ICON_SIZE, ICON_SIZE + 16);
      row.addChild(btn);

      // Icon background
      const bg = new Graphics()
        .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 5)
        .fill({ color: 0x1a2a3a })
        .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 5)
        .stroke({ color: race.accentColor, alpha: 0.6, width: 1 });
      btn.addChild(bg);

      // Try animated sprite
      const frames = animationManager.getFrames(ut, UnitState.IDLE);
      if (frames.length > 0 && frames[0] !== Texture.WHITE) {
        const sprite = new AnimatedSprite(frames);
        sprite.anchor.set(0.5, 0.5);
        sprite.width = ICON_SIZE - 10;
        sprite.height = ICON_SIZE - 10;
        sprite.position.set(ICON_SIZE / 2, ICON_SIZE / 2);
        const fs = animationManager.getFrameSet(ut, UnitState.IDLE);
        sprite.animationSpeed = fs.fps / 60;
        sprite.loop = true;
        sprite.play();
        btn.addChild(sprite);
      } else {
        // Fallback letter
        const ltr = new Text({ text: def.spriteKey.charAt(0).toUpperCase(), style: new TextStyle({
          fontFamily: "monospace", fontSize: 21, fill: 0xccddee, fontWeight: "bold",
        }) });
        ltr.anchor.set(0.5, 0.5);
        ltr.position.set(ICON_SIZE / 2, ICON_SIZE / 2);
        btn.addChild(ltr);
      }

      // Name below icon
      const nameT = new Text({
        text: this._formatUnitName(def.type),
        style: STYLE_UNIT_NAME,
      });
      nameT.anchor.set(0.5, 0);
      nameT.position.set(ICON_SIZE / 2, ICON_SIZE + 3);
      btn.addChild(nameT);

      // Hover: show tooltip
      btn.on("pointerover", () => {
        bg.tint = 0x334466;
        const cardX = 26 + ix + ICON_SIZE + 4;
        const cardY = y + 26;
        this._showTooltip(def, cardX, cardY);
      });
      btn.on("pointerout", () => {
        bg.tint = 0xffffff;
        this._hideTooltip();
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Unit roster (available units by category)
  // ---------------------------------------------------------------------------

  private _buildUnitRoster(parent: Container, race: RaceDef, y: number): void {
    // Section label
    const label = new Text({ text: "AVAILABLE UNITS", style: STYLE_SECTION });
    label.position.set(26, y);
    parent.addChild(label);

    parent.addChild(
      new Graphics().rect(26, y + 21, CARD_W - 52, 1).fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    const ROSTER_TOP = y + 26;
    const ROSTER_H = CARD_H - 68 - ROSTER_TOP - 5;
    this._rosterH = ROSTER_H;

    // Mask
    this._rosterMask = new Graphics()
      .rect(21, ROSTER_TOP, CARD_W - 42, ROSTER_H)
      .fill({ color: 0xffffff });
    parent.addChild(this._rosterMask);

    // Scrollable container
    this._rosterContainer = new Container();
    this._rosterBaseY = ROSTER_TOP;
    this._rosterContainer.position.set(26, ROSTER_TOP);
    this._rosterContainer.mask = this._rosterMask;
    parent.addChild(this._rosterContainer);

    const units = getGeneralUnits(race.factionUnits);
    const categories: UnitCategory[] = ["melee", "ranged", "magic", "siege", "creature", "heal"];

    const COL_W = Math.floor((CARD_W - 78 - SCROLLBAR_W - SCROLLBAR_PAD) / categories.length);
    const ROW_H = 18;

    let maxContentH = 0;

    for (let c = 0; c < categories.length; c++) {
      const cat = categories[c];
      const colX = c * COL_W;
      let ry = 0;

      // Column header
      const hdr = new Text({ text: CATEGORY_LABELS[cat], style: STYLE_COL_HEADER });
      hdr.position.set(colX, ry);
      this._rosterContainer.addChild(hdr);
      ry += 21;

      // Divider under header
      this._rosterContainer.addChild(
        new Graphics().rect(colX, ry, COL_W - 10, 1).fill({ color: 0x334455, alpha: 0.5 }),
      );
      ry += 5;

      for (const def of units[cat]) {
        // Interactive row container
        const rowCont = new Container();
        rowCont.position.set(colX, ry);
        rowCont.eventMode = "static";
        rowCont.cursor = "pointer";
        rowCont.hitArea = new Rectangle(0, 0, COL_W - 10, ROW_H);
        this._rosterContainer.addChild(rowCont);

        // Hover background
        const hoverBg = new Graphics()
          .rect(0, 0, COL_W - 10, ROW_H)
          .fill({ color: 0x223344, alpha: 0 });
        rowCont.addChild(hoverBg);

        // Unit name
        const nameT = new Text({
          text: this._formatUnitName(def.type),
          style: STYLE_UNIT_NAME,
        });
        nameT.position.set(0, 2);
        rowCont.addChild(nameT);

        // Tier badge
        const tierT = new Text({
          text: `T${def.tier ?? 1}`,
          style: STYLE_UNIT_TIER,
        });
        tierT.position.set(COL_W - 36, 2);
        rowCont.addChild(tierT);

        // Element tag for magic units
        if (def.element && cat === "magic") {
          const elemT = new Text({
            text: def.element.substring(0, 3),
            style: new TextStyle({
              fontFamily: "monospace", fontSize: 9,
              fill: this._getElementColor(def.element), letterSpacing: 0,
            }),
          });
          elemT.position.set(COL_W - 62, 3);
          rowCont.addChild(elemT);
        }

        // Hover handlers
        rowCont.on("pointerover", () => {
          hoverBg.clear().rect(0, 0, COL_W - 10, ROW_H).fill({ color: 0x223344, alpha: 0.6 });
          nameT.style = STYLE_UNIT_NAME_HOVER;
          // Compute card-local position for tooltip
          const cardX = 26 + colX + COL_W - 10;
          const cardY = this._rosterContainer.position.y + ry;
          this._showTooltip(def, cardX, cardY);
        });
        rowCont.on("pointerout", () => {
          hoverBg.clear().rect(0, 0, COL_W - 10, ROW_H).fill({ color: 0x223344, alpha: 0 });
          nameT.style = STYLE_UNIT_NAME;
          this._hideTooltip();
        });

        ry += ROW_H;
      }

      if (ry > maxContentH) maxContentH = ry;
    }

    this._rosterContentH = maxContentH;
    this._maxScroll = Math.max(0, maxContentH - ROSTER_H);

    // Scrollbar
    this._buildScrollbar(parent, ROSTER_TOP, ROSTER_H);
  }

  // ---------------------------------------------------------------------------
  // Scrollbar
  // ---------------------------------------------------------------------------

  private _buildScrollbar(parent: Container, top: number, height: number): void {
    const trackX = CARD_W - 26 - SCROLLBAR_W;

    // Track
    this._scrollTrack = new Graphics()
      .roundRect(trackX, top, SCROLLBAR_W, height, 4)
      .fill({ color: 0x1a1a2a, alpha: 0.6 })
      .roundRect(trackX, top, SCROLLBAR_W, height, 4)
      .stroke({ color: 0x334455, alpha: 0.4, width: 0.5 });
    parent.addChild(this._scrollTrack);

    // Thumb
    this._scrollThumb = new Graphics();
    parent.addChild(this._scrollThumb);

    // Hide scrollbar if content fits
    const visible = this._maxScroll > 0;
    this._scrollTrack.visible = visible;
    this._scrollThumb.visible = visible;

    if (visible) {
      this._updateScrollThumb();
    }
  }

  private _updateScrollThumb(): void {
    if (this._maxScroll <= 0) return;
    const trackX = CARD_W - 26 - SCROLLBAR_W;
    const thumbFrac = this._rosterH / this._rosterContentH;
    const thumbH = Math.max(20, this._rosterH * thumbFrac);
    const scrollFrac = this._scrollY / this._maxScroll;
    const thumbY = this._rosterBaseY + scrollFrac * (this._rosterH - thumbH);

    this._scrollThumb.clear()
      .roundRect(trackX + 1, thumbY, SCROLLBAR_W - 2, thumbH, 3)
      .fill({ color: 0x667788, alpha: 0.7 });
  }

  // ---------------------------------------------------------------------------
  // Tooltip
  // ---------------------------------------------------------------------------

  private _buildTooltip(parent: Container): void {
    this._tooltip = new Container();
    this._tooltip.visible = false;
    parent.addChild(this._tooltip);
  }

  private _showTooltip(def: UnitDef, cardX: number, cardY: number): void {
    const tt = this._tooltip;
    tt.removeChildren();
    this._tooltipSprite = null;

    let cy = TT_PAD;

    // Animated sprite preview
    const SPRITE_SIZE = 48;
    const frames = animationManager.getFrames(def.type, UnitState.IDLE);
    if (frames.length > 0 && frames[0] !== Texture.WHITE) {
      const sprite = new AnimatedSprite(frames);
      sprite.anchor.set(0.5, 0.5);
      sprite.width = SPRITE_SIZE - 8;
      sprite.height = SPRITE_SIZE - 8;
      sprite.position.set(TT_W / 2, cy + SPRITE_SIZE / 2);
      const fs = animationManager.getFrameSet(def.type, UnitState.IDLE);
      sprite.animationSpeed = fs.fps / 60;
      sprite.loop = true;
      sprite.play();
      tt.addChild(sprite);
      this._tooltipSprite = sprite;
      cy += SPRITE_SIZE + 4;
    }

    // Name
    const nameT = new Text({ text: this._formatUnitLabel(def.type), style: STYLE_TT_NAME });
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

    // Stats line 1: HP ATK SPD
    const line1 = new Text({
      text: `HP:${def.hp}  ATK:${def.atk}  SPD:${def.speed}`,
      style: STYLE_TT_STAT,
    });
    line1.position.set(TT_PAD, cy);
    tt.addChild(line1);
    cy += 14;

    // Stats line 2: RNG AS COST
    const line2 = new Text({
      text: `RNG:${def.range}  AS:${def.attackSpeed}  COST:${def.cost}g`,
      style: STYLE_TT_STAT,
    });
    line2.position.set(TT_PAD, cy);
    tt.addChild(line2);
    cy += 14;

    // Stats line 3: Spawn + abilities
    let extraLine = `Spawn: ${def.spawnTime}s`;
    if (def.abilityTypes.length > 0) {
      extraLine += `  ${def.abilityTypes.join(", ")}`;
    }
    const line3 = new Text({ text: extraLine, style: STYLE_TT_SPAWN });
    line3.position.set(TT_PAD, cy);
    tt.addChild(line3);
    cy += 14;

    // Element badge for magic units
    if (def.element) {
      const elemT = new Text({
        text: def.element.charAt(0).toUpperCase() + def.element.slice(1),
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 10,
          fill: this._getElementColor(def.element), fontWeight: "bold",
        }),
      });
      elemT.position.set(TT_PAD, cy);
      tt.addChild(elemT);
      cy += 14;
    }

    const TT_H = cy + TT_PAD;

    // Background (drawn behind content via addChildAt)
    const bg = new Graphics()
      .roundRect(0, 0, TT_W, TT_H, 6)
      .fill({ color: 0x0d0d1e, alpha: 0.95 })
      .roundRect(0, 0, TT_W, TT_H, 6)
      .stroke({ color: 0xffd700, alpha: 0.5, width: 1 });
    tt.addChildAt(bg, 0);

    // Position: try to place to the right of the hovered item
    let tx = cardX + 6;
    let ty = cardY - TT_H / 2;

    // Clamp to stay within card bounds
    if (tx + TT_W > CARD_W - 10) {
      tx = cardX - TT_W - 16;
    }
    if (ty < 10) ty = 10;
    if (ty + TT_H > CARD_H - 10) ty = CARD_H - TT_H - 10;

    tt.position.set(tx, ty);
    tt.visible = true;
  }

  private _hideTooltip(): void {
    if (!this._tooltip) return;
    this._tooltip.visible = false;
    if (this._tooltipSprite) {
      this._tooltipSprite.stop();
      this._tooltipSprite = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Scroll handler
  // ---------------------------------------------------------------------------

  private _onRosterWheel(e: WheelEvent): void {
    if (this._maxScroll <= 0) return;
    this._scrollY = Math.max(0, Math.min(this._maxScroll, this._scrollY + e.deltaY));
    this._rosterContainer.position.y = this._rosterBaseY - this._scrollY;
    this._updateScrollThumb();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private _formatUnitName(ut: UnitType): string {
    return (ut as string)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .substring(0, 16);
  }

  /** Full unit label for tooltip (no character limit). */
  private _formatUnitLabel(ut: UnitType): string {
    return (ut as string)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private _getElementColor(element: string): number {
    switch (element) {
      case "fire": return 0xff6622;
      case "cold": return 0x4488ff;
      case "lightning": return 0xffdd22;
      case "distortion": return 0xaa44cc;
      case "summon": return 0x66aa44;
      case "nature": return 0x22cc44;
      case "heal": return 0x44ccaa;
      default: return 0x888888;
    }
  }

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
    const txt = new Text({ text: label, style: new TextStyle({
      fontFamily: "monospace",
      fontSize: primary ? 17 : 14,
      fill: primary ? 0x88ffaa : 0x88bbff,
      fontWeight: "bold", letterSpacing: 1,
    }) });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(txt);
    btn.on("pointerover", () => { bg.tint = primary ? 0xaaffcc : 0xaaddff; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });
    return btn;
  }
}

export const raceDetailScreen = new RaceDetailScreen();
