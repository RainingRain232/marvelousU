// Magic overview screen — shown after the race detail screen, before armory.
// Displays merlin portrait, magic flavour text, race magic tier ratings,
// a filterable list of available spells per school, and national mage spell selection.

import {
  Container, Graphics, Text, TextStyle, Sprite, Assets, Rectangle,
} from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { AmbientParticles } from "@view/fx/AmbientParticles";
import { getRace, SPELL_MAGIC_TO_TIER } from "@sim/config/RaceDefs";
import type { RaceDef, RaceId, RaceTiers } from "@sim/config/RaceDefs";
import { UPGRADE_DEFINITIONS } from "@sim/config/UpgradeDefs";
import type { UpgradeDef } from "@sim/config/UpgradeDefs";
import { UpgradeType } from "@/types";

import { t } from "@/i18n/i18n";
import merlinImgUrl from "@/img/merlin.png";

// ---------------------------------------------------------------------------
// National mage spell selections (read by main.ts at game boot)
// ---------------------------------------------------------------------------

/** Maps mage tier (1–7) → array of UpgradeType spell keys selected by player. */
export const nationalMageSpells: Map<number, UpgradeType[]> = new Map();

// Slots per mage tier: T1=2, T2=2, T3–T7=1
const MAGE_SPELL_SLOTS = [2, 2, 1, 1, 1, 1, 1];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace", fontSize: 38, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 3,
});
const STYLE_FLAVOR = new TextStyle({
  fontFamily: "monospace", fontSize: 16, fill: 0xaabbcc,
  wordWrap: true, wordWrapWidth: 1050,
});
const STYLE_TIER_VALUE = new TextStyle({
  fontFamily: "monospace", fontSize: 16, fill: 0xffd700, fontWeight: "bold",
});
const STYLE_SECTION = new TextStyle({
  fontFamily: "monospace", fontSize: 18, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 2,
});
const STYLE_NO_ACCESS = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0x445566, fontStyle: "italic",
});

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;
const CARD_W = 1622;
const CARD_H = 980;
const CORNER_R = 10;
const MERLIN_SIZE = 260;

// Magic type info for tier pips + spell columns
type SpellMagicType = "fire" | "ice" | "lightning" | "earth" | "arcane" | "holy" |
  "shadow" | "poison" | "void" | "death" | "nature";

interface MagicTypeInfo {
  key: SpellMagicType;
  label: string;
  color: number;
  tierKey: keyof RaceTiers;
}

const MAGIC_TYPES: MagicTypeInfo[] = [
  { key: "fire", label: "Fire", color: 0xff4422, tierKey: "fire" },
  { key: "ice", label: "Ice", color: 0x66ccff, tierKey: "cold" },
  { key: "lightning", label: "Lightning", color: 0xffff44, tierKey: "lightning" },
  { key: "earth", label: "Earth", color: 0xaa8844, tierKey: "earth" },
  { key: "arcane", label: "Arcane", color: 0x9966ff, tierKey: "arcane" },
  { key: "nature", label: "Nature", color: 0x44cc44, tierKey: "nature" },
  { key: "holy", label: "Holy", color: 0xffdd44, tierKey: "heal" },
  { key: "shadow", label: "Shadow", color: 0xaa66cc, tierKey: "shadow" },
  { key: "poison", label: "Poison", color: 0x66cc44, tierKey: "poison" },
  { key: "void", label: "Void", color: 0x8833cc, tierKey: "void" },
  { key: "death", label: "Death", color: 0x44aa88, tierKey: "death" },
];

// School descriptions
const SCHOOL_INFO: { name: string; color: number; desc: string }[] = [
  { name: "Elemental", color: 0xff6622, desc: "Fire, ice, lightning, earth, and nature — the raw forces of the world." },
  { name: "Arcane", color: 0x9966ff, desc: "Pure mana distilled from reality itself." },
  { name: "Divine", color: 0xffdd44, desc: "Holy light that heals and smites." },
  { name: "Shadow", color: 0xaa66cc, desc: "Darkness, poison, void, and death magic." },
  { name: "Conjuration", color: 0x4488ff, desc: "Summoning creatures to fight for you." },
];

// Spell label lookup (reuse from ShopPanel pattern)
function getSpellLabel(type: UpgradeType): string {
  return (type as string)
    .replace(/^spell_/, "")
    .replace(/^summon_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class MagicScreen {
  container = (() => { const c = new Container(); c.visible = false; return c; })();
  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _particles!: AmbientParticles;
  private _mainCard!: Container;
  private _raceId: RaceId = "man";
  private _wikiMode = false;
  private _scrollY = 0;
  private _maxScroll = 0;
  private _spellContainer!: Container;
  private _spellBaseY = 0;
  private _spellViewH = 0;
  private _scrollTrack!: Graphics;
  private _scrollThumb!: Graphics;
  private _tooltip!: Container;

  // National mage spell selection state
  private _magicLevel = 0;
  private _selectedSpells: UpgradeType[] = []; // flat ordered array of selected spell keys
  private _allAvailableSpells: UpgradeDef[] = []; // all spells available for current race

  onNext: (() => void) | null = null;
  onBack: (() => void) | null = null;

  init(vm: ViewManager): void {
    this._vm = vm;
    this._bg = new Graphics();
    this.container.addChild(this._bg);
    this._particles = new AmbientParticles(120);
    this.container.addChild(this._particles.container);
    this._mainCard = new Container();
    this.container.addChild(this._mainCard);
    this._tooltip = new Container();
    this._tooltip.visible = false;
    this.container.addChild(this._tooltip);
    vm.addToLayer("ui", this.container);
    this._layout();
    vm.app.renderer.on("resize", () => this._layout());
    vm.app.ticker.add((ticker) => {
      if (this.container.visible) this._particles.update(ticker.deltaMS / 1000);
    });
  }

  show(raceId: RaceId): void {
    this._raceId = raceId;
    this._wikiMode = false;
    this.container.visible = true;

    // Determine magic level and init spell selections
    const race = getRace(raceId);
    this._magicLevel = race?.tiers?.magic ?? 0;
    this._gatherAvailableSpells(race ?? null);
    this._initMageSpells();

    this._buildUI();
    this._layout();
  }

  showWiki(): void {
    this._raceId = "op"; // all tiers maxed
    this._wikiMode = true;
    this._magicLevel = 0; // no spell selection in wiki mode
    this._selectedSpells = [];
    this.container.visible = true;
    this._buildUI();
    this._layout();
  }

  hide(): void {
    this.container.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;
    this._bg.clear().rect(0, 0, sw, sh).fill({ color: BG_COLOR });
    this._particles.resize(sw, sh);
    this._mainCard.position.set(
      Math.floor((sw - CARD_W) / 2),
      Math.floor((sh - CARD_H) / 2),
    );
  }

  // ---------------------------------------------------------------------------
  // UI build
  // ---------------------------------------------------------------------------

  private _buildUI(): void {
    const card = this._mainCard;
    card.removeChildren();
    this._scrollY = 0;

    const wiki = this._wikiMode;
    const race = getRace(this._raceId);
    if (!race) return;

    // Card background
    card.addChild(
      new Graphics()
        .roundRect(0, 0, CARD_W, CARD_H, CORNER_R)
        .fill({ color: 0x10102a, alpha: 0.97 })
        .roundRect(0, 0, CARD_W, CARD_H, CORNER_R)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
    );

    // Header
    const backBtn = this._makeNavBtn(t("back"), 104, 36, false);
    backBtn.position.set(21, 18);
    backBtn.on("pointerdown", () => this.onBack?.());
    card.addChild(backBtn);

    const titleText = wiki ? "SPELL WIKI" : "MAGIC OVERVIEW";
    const title = new Text({ text: titleText, style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CARD_W / 2, 18);
    card.addChild(title);

    // Header divider
    card.addChild(
      new Graphics().rect(21, 65, CARD_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    const TOP_Y = 75;
    let spellSectionY: number;

    if (wiki) {
      // Wiki mode: subtitle + school badges, then straight to spells
      this._buildWikiHeader(card, TOP_Y);
      spellSectionY = TOP_Y + 100;
    } else {
      // Normal mode: merlin portrait, flavor, tier pips
      this._buildMerlinPortrait(card, 26, TOP_Y);
      this._buildFlavorSection(card, 26 + MERLIN_SIZE + 21, TOP_Y, race);

      const TIERS_Y = TOP_Y + MERLIN_SIZE + 12;
      card.addChild(
        new Graphics().rect(21, TIERS_Y - 4, CARD_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.15 }),
      );

      const TIER_SECTION_LABEL = new Text({ text: t("magic.your_tiers"), style: STYLE_SECTION });
      TIER_SECTION_LABEL.position.set(26, TIERS_Y);
      card.addChild(TIER_SECTION_LABEL);

      this._buildMagicTierPips(card, race, 26, TIERS_Y + 20);

      spellSectionY = TIERS_Y + 26 + 108;
    }

    // Divider before spells
    card.addChild(
      new Graphics().rect(21, spellSectionY - 4, CARD_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    const spellLabelText = wiki ? "ALL SPELLS" : "AVAILABLE SPELLS";
    const spellSubtext = (!wiki && this._magicLevel > 0)
      ? "  (click to select for national mage)"
      : "";
    const SPELL_LABEL = new Text({ text: spellLabelText + spellSubtext, style: STYLE_SECTION });
    SPELL_LABEL.position.set(26, spellSectionY);
    card.addChild(SPELL_LABEL);

    // Footer height: scale with national mage rows
    const hasNationalMage = !wiki && this._magicLevel > 0;
    const mageFooterRows = hasNationalMage ? this._getMageFooterRowCount() : 0;
    const footerH = hasNationalMage ? 68 + mageFooterRows * 22 : 72;

    if (!wiki) {
      // Footer divider + continue button (normal mode only)
      card.addChild(
        new Graphics().rect(21, CARD_H - footerH + 2, CARD_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.15 }),
      );
      const nextBtn = this._makeNavBtn(t("race.continue"), 195, 44, true);
      nextBtn.position.set(CARD_W - 221, CARD_H - 57);
      nextBtn.on("pointerdown", () => {
        if (this.onNext) this.onNext();
        else this.onBack?.();
      });
      card.addChild(nextBtn);

      // National mage spell footer
      if (hasNationalMage) {
        this._buildMageFooter(card, 26, CARD_H - footerH + 6);
      }
    }

    // Scrollable spell list
    const spellTop = spellSectionY + 20;
    const bottomPad = wiki ? 10 : footerH;
    const spellViewH = CARD_H - bottomPad - spellTop;
    this._spellBaseY = spellTop;
    this._spellViewH = spellViewH;
    this._buildSpellList(card, race, 26, spellTop, CARD_W - 52 - 14, spellViewH);

    // Wheel scroll
    card.eventMode = "static";
    card.on("wheel", (e: WheelEvent) => this._onWheel(e));
  }

  // ---------------------------------------------------------------------------
  // Merlin portrait
  // ---------------------------------------------------------------------------

  private _buildMerlinPortrait(parent: Container, x: number, y: number): void {
    // Border
    const border = new Graphics()
      .roundRect(x - 3, y - 3, MERLIN_SIZE + 6, MERLIN_SIZE + 6, 6)
      .fill({ color: 0x10102a })
      .roundRect(x - 3, y - 3, MERLIN_SIZE + 6, MERLIN_SIZE + 6, 6)
      .stroke({ color: 0x9966ff, alpha: 0.6, width: 1.5 });
    parent.addChild(border);

    // Load image
    Assets.load(merlinImgUrl).then((tex) => {
      const sprite = new Sprite(tex);
      const scale = Math.min(
        (MERLIN_SIZE - 10) / tex.width,
        (MERLIN_SIZE - 10) / tex.height,
      );
      sprite.scale.set(scale);
      sprite.position.set(
        x + (MERLIN_SIZE - tex.width * scale) / 2,
        y + (MERLIN_SIZE - tex.height * scale) / 2,
      );
      parent.addChild(sprite);
    });
  }

  // ---------------------------------------------------------------------------
  // Wiki header (replaces portrait + flavor + tiers in wiki mode)
  // ---------------------------------------------------------------------------

  private _buildWikiHeader(parent: Container, y: number): void {
    const cont = new Container();
    cont.position.set(26, y);
    parent.addChild(cont);

    let cy = 0;

    // Subtitle
    const subtitle = new Text({
      text: t("magic.spell_overview"),
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 17, fill: 0x99aabb, letterSpacing: 1,
      }),
    });
    subtitle.position.set(0, cy);
    cont.addChild(subtitle);
    cy += 28;

    // School badges (same as normal mode but inline)
    const BADGE_W = 290;
    const BADGE_GAP = 10;
    for (let i = 0; i < SCHOOL_INFO.length; i++) {
      const s = SCHOOL_INFO[i];
      const bx = i * (BADGE_W + BADGE_GAP);
      const by = cy;

      const bg = new Graphics()
        .roundRect(bx, by, BADGE_W, 52, 4)
        .fill({ color: 0x12122a, alpha: 0.8 })
        .roundRect(bx, by, BADGE_W, 52, 4)
        .stroke({ color: s.color, alpha: 0.4, width: 1 });
      cont.addChild(bg);

      const nameT = new Text({
        text: s.name,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 14, fill: s.color,
          fontWeight: "bold", letterSpacing: 1,
        }),
      });
      nameT.position.set(bx + 6, by + 4);
      cont.addChild(nameT);

      const descT = new Text({
        text: s.desc,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 10, fill: 0x778899,
          wordWrap: true, wordWrapWidth: BADGE_W - 12,
        }),
      });
      descT.position.set(bx + 6, by + 22);
      cont.addChild(descT);
    }
  }

  // ---------------------------------------------------------------------------
  // Flavor text + school descriptions
  // ---------------------------------------------------------------------------

  private _buildFlavorSection(parent: Container, x: number, y: number, race: RaceDef): void {
    let cy = y;

    // Race name + magic header
    const raceName = new Text({
      text: `${race.name.toUpperCase()} — ARCANE KNOWLEDGE`,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 22, fill: race.accentColor,
        fontWeight: "bold", letterSpacing: 2,
      }),
    });
    raceName.position.set(x, cy);
    parent.addChild(raceName);
    cy += 31;

    // Flavor text — mention national mages if magic >= 1
    let flavorStr = "In the hands of the wise, magic is a force that transcends steel and sinew. " +
      "From the primal fury of the elements to the whispered secrets of the void, " +
      "the arcane arts offer power beyond mortal reckoning — for those who dare to study them.";
    if (this._magicLevel > 0) {
      flavorStr += ` The Mage of ${race.name} channels the nation's chosen spells in battle. ` +
        `Select spells below to equip your national mages (T1-T2: 2 spells, T3+: 1 spell).`;
    }
    const flavorText = new Text({
      text: flavorStr,
      style: STYLE_FLAVOR,
    });
    flavorText.position.set(x, cy);
    parent.addChild(flavorText);
    cy += flavorText.height + 16;

    // School badges
    const BADGE_W = 240;
    const BADGE_GAP = 10;
    for (let i = 0; i < SCHOOL_INFO.length; i++) {
      const s = SCHOOL_INFO[i];
      const bx = x + i * (BADGE_W + BADGE_GAP);
      const by = cy;

      // Badge background
      const bg = new Graphics()
        .roundRect(bx, by, BADGE_W, 52, 4)
        .fill({ color: 0x12122a, alpha: 0.8 })
        .roundRect(bx, by, BADGE_W, 52, 4)
        .stroke({ color: s.color, alpha: 0.4, width: 1 });
      parent.addChild(bg);

      // School name
      const nameT = new Text({
        text: s.name,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 14, fill: s.color,
          fontWeight: "bold", letterSpacing: 1,
        }),
      });
      nameT.position.set(bx + 6, by + 4);
      parent.addChild(nameT);

      // Short desc
      const descT = new Text({
        text: s.desc,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 10, fill: 0x778899,
          wordWrap: true, wordWrapWidth: BADGE_W - 12,
        }),
      });
      descT.position.set(bx + 6, by + 22);
      parent.addChild(descT);
    }
  }

  // ---------------------------------------------------------------------------
  // Magic tier pips (11 types, 3 rows of 4)
  // ---------------------------------------------------------------------------

  private _buildMagicTierPips(
    parent: Container, race: RaceDef,
    x: number, y: number,
  ): void {
    const tiers = race.tiers;
    if (!tiers) return;

    const COLS = 4;
    const COL_W = 380;
    const ROW_H = 27;

    for (let i = 0; i < MAGIC_TYPES.length; i++) {
      const mt = MAGIC_TYPES[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const px = x + col * COL_W;
      const py = y + row * ROW_H;

      // Label
      const label = new Text({
        text: mt.label,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: mt.color }),
      });
      label.position.set(px, py);
      parent.addChild(label);

      // Pips
      const val = tiers[mt.tierKey] ?? 0;
      const g = new Graphics();
      for (let p = 0; p < 7; p++) {
        const pipX = 105 + p * 16;
        const pipY = 7;
        if (p < val) {
          g.circle(pipX, pipY, 5).fill({ color: mt.color, alpha: 0.9 });
        } else {
          g.circle(pipX, pipY, 5)
            .fill({ color: 0x1a1a2a })
            .circle(pipX, pipY, 5)
            .stroke({ color: mt.color, alpha: 0.3, width: 0.5 });
        }
      }
      g.position.set(px, py);
      parent.addChild(g);

      // Numeric value
      const numT = new Text({ text: `${val}`, style: STYLE_TIER_VALUE });
      numT.position.set(px + 105 + 7 * 16 + 8, py);
      parent.addChild(numT);
    }
  }

  // ---------------------------------------------------------------------------
  // Spell list (scrollable, 2 rows × 6 cols)
  // ---------------------------------------------------------------------------

  private _buildSpellList(
    parent: Container, race: RaceDef,
    x: number, y: number, w: number, viewH: number,
  ): void {
    const tiers = race.tiers;
    if (!tiers) return;

    // Gather spells by magic type + conjuration
    const spellsByType: Record<string, UpgradeDef[]> = {};
    for (const mt of MAGIC_TYPES) spellsByType[mt.key] = [];
    spellsByType["conjuration"] = [];

    for (const [, def] of Object.entries(UPGRADE_DEFINITIONS)) {
      if (!def.isSpell || !def.spellTier) continue;

      if (def.spellSchool === "conjuration") {
        // Conjuration: gated by the "summon" tier
        const summonLimit = tiers.summon ?? 0;
        if (def.spellTier <= summonLimit) {
          spellsByType["conjuration"].push(def);
        }
        continue;
      }

      if (!def.spellMagicType) continue;
      const tierKey = SPELL_MAGIC_TO_TIER[def.spellMagicType];
      if (!tierKey) continue;
      const limit = tiers[tierKey] ?? 0;
      if (def.spellTier <= limit) {
        if (spellsByType[def.spellMagicType]) {
          spellsByType[def.spellMagicType].push(def);
        }
      }
    }

    // Sort each group by tier then mana cost
    for (const key of Object.keys(spellsByType)) {
      spellsByType[key].sort(
        (a, b) => (a.spellTier! - b.spellTier!) || ((a.manaCost ?? 0) - (b.manaCost ?? 0)),
      );
    }

    // Column layout: 2 rows of 6
    const allColumns: { key: string; label: string; color: number }[] = [
      ...MAGIC_TYPES.slice(0, 6).map(mt => ({ key: mt.key, label: mt.label, color: mt.color })),
      ...MAGIC_TYPES.slice(6).map(mt => ({ key: mt.key, label: mt.label, color: mt.color })),
      { key: "conjuration", label: "Conjuration", color: 0x4488ff },
    ];

    const COLS = 6;
    const COL_W = Math.floor(w / COLS);
    const ROW_GAP = 8;

    // Mask for scrollable area
    const mask = new Graphics().rect(x, y, w + 14, viewH).fill({ color: 0xffffff });
    parent.addChild(mask);

    const scrollContainer = new Container();
    scrollContainer.position.set(0, y);
    scrollContainer.mask = mask;
    parent.addChild(scrollContainer);
    this._spellContainer = scrollContainer;

    let maxContentH = 0;

    // Row 1: first 6 columns (fire, ice, lightning, earth, arcane, nature)
    const row1Cols = allColumns.slice(0, 6);
    let row1MaxH = 0;
    for (let c = 0; c < row1Cols.length; c++) {
      const col = row1Cols[c];
      const cx = x + c * COL_W;
      const h = this._buildSpellColumn(scrollContainer, col, spellsByType[col.key], cx, 0, COL_W - 4, tiers);
      row1MaxH = Math.max(row1MaxH, h);
    }

    // Row 2: remaining columns (holy, shadow, poison, void, death, conjuration)
    const row2Cols = allColumns.slice(6);
    const row2Y = row1MaxH + ROW_GAP;
    let row2MaxH = 0;
    for (let c = 0; c < row2Cols.length; c++) {
      const col = row2Cols[c];
      const cx = x + c * COL_W;
      const h = this._buildSpellColumn(scrollContainer, col, spellsByType[col.key], cx, row2Y, COL_W - 4, tiers);
      row2MaxH = Math.max(row2MaxH, h);
    }

    maxContentH = row2Y + row2MaxH;
    this._maxScroll = Math.max(0, maxContentH - viewH);

    // Scrollbar
    this._buildScrollbar(parent, y, viewH);
  }

  private _buildSpellColumn(
    parent: Container,
    info: { key: string; label: string; color: number },
    spells: UpgradeDef[],
    x: number, y: number, w: number,
    _tiers: RaceTiers,
  ): number {
    let cy = y;

    // Column header bg
    const headerBg = new Graphics()
      .roundRect(x, cy, w, 23, 3)
      .fill({ color: 0x12122a, alpha: 0.8 })
      .roundRect(x, cy, w, 23, 3)
      .stroke({ color: info.color, alpha: 0.4, width: 1 });
    parent.addChild(headerBg);

    const headerT = new Text({
      text: info.label.toUpperCase(),
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 13, fill: info.color,
        fontWeight: "bold", letterSpacing: 1,
      }),
    });
    headerT.position.set(x + 5, cy + 3);
    parent.addChild(headerT);
    cy += 26;

    if (spells.length === 0) {
      const noAccess = new Text({ text: t("magic.no_access"), style: STYLE_NO_ACCESS });
      noAccess.position.set(x + 5, cy);
      parent.addChild(noAccess);
      cy += 20;
      return cy - y;
    }

    // List spells
    const tierNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII"];
    const tierColors: Record<number, number> = {
      1: 0xaaaaaa, 2: 0x44cc44, 3: 0x4488ff,
      4: 0xffaa22, 5: 0xff4444, 6: 0xff44ff, 7: 0x44ffff,
    };

    const canSelect = !this._wikiMode && this._magicLevel > 0;

    for (const spell of spells) {
      const tier = spell.spellTier ?? 1;
      const tierStr = tierNumerals[tier] ?? `${tier}`;
      const tierColor = tierColors[tier] ?? 0xaaaaaa;
      const isSelected = this._selectedSpells.includes(spell.type);

      // Interactive row
      const row = new Container();
      row.position.set(x, cy);
      row.eventMode = "static";
      row.cursor = "pointer";
      row.hitArea = new Rectangle(0, -1, w, 18);
      parent.addChild(row);

      const hoverBg = new Graphics()
        .rect(0, -1, w, 18)
        .fill({ color: isSelected ? 0x224433 : 0x223344, alpha: isSelected ? 0.6 : 0 });
      row.addChild(hoverBg);

      // Selection indicator (green dot)
      if (isSelected) {
        const dot = new Graphics()
          .circle(-4, 8, 3)
          .fill({ color: 0x44ff66, alpha: 0.9 });
        row.addChild(dot);
      }

      // Tier badge
      const tierT = new Text({
        text: tierStr,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 12, fill: tierColor,
          fontWeight: "bold",
        }),
      });
      tierT.position.set(5, 0);
      row.addChild(tierT);

      // Spell name
      const label = getSpellLabel(spell.type);
      const nameT = new Text({
        text: label.length > 18 ? label.substring(0, 17) + "." : label,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 13,
          fill: isSelected ? 0x88ffaa : 0xccddee,
          fontWeight: isSelected ? "bold" : "normal",
        }),
      });
      nameT.position.set(30, 0);
      row.addChild(nameT);

      // Hover events
      const spellDef = spell;
      const colColor = info.color;
      row.on("pointerover", () => {
        hoverBg.clear().rect(0, -1, w, 18).fill({ color: 0x223344, alpha: 0.5 });
        this._showSpellTooltip(spellDef, colColor, row);
      });
      row.on("pointerout", () => {
        const sel = this._selectedSpells.includes(spellDef.type);
        hoverBg.clear().rect(0, -1, w, 18)
          .fill({ color: sel ? 0x224433 : 0x223344, alpha: sel ? 0.6 : 0 });
        this._hideSpellTooltip();
      });

      // Click to select/deselect for national mage
      if (canSelect) {
        row.on("pointerdown", () => {
          this._toggleSpellSelection(spellDef.type);
        });
      }

      cy += 18;
    }

    return cy - y;
  }

  // ---------------------------------------------------------------------------
  // Scrollbar
  // ---------------------------------------------------------------------------

  private _buildScrollbar(parent: Container, top: number, height: number): void {
    const trackX = CARD_W - 30;

    this._scrollTrack = new Graphics()
      .roundRect(trackX, top, 8, height, 4)
      .fill({ color: 0x1a1a2a, alpha: 0.6 })
      .roundRect(trackX, top, 8, height, 4)
      .stroke({ color: 0x334455, alpha: 0.4, width: 0.5 });
    parent.addChild(this._scrollTrack);

    this._scrollThumb = new Graphics();
    parent.addChild(this._scrollThumb);

    const visible = this._maxScroll > 0;
    this._scrollTrack.visible = visible;
    this._scrollThumb.visible = visible;
    if (visible) this._updateScrollThumb();
  }

  private _updateScrollThumb(): void {
    if (this._maxScroll <= 0) return;
    const trackX = CARD_W - 30;
    const thumbFrac = this._spellViewH / (this._spellViewH + this._maxScroll);
    const thumbH = Math.max(20, this._spellViewH * thumbFrac);
    const scrollFrac = this._scrollY / this._maxScroll;
    const thumbY = this._spellBaseY + scrollFrac * (this._spellViewH - thumbH);

    this._scrollThumb.clear()
      .roundRect(trackX + 1, thumbY, 6, thumbH, 3)
      .fill({ color: 0x667788, alpha: 0.7 });
  }

  private _onWheel(e: WheelEvent): void {
    if (this._maxScroll <= 0) return;
    this._scrollY = Math.max(0, Math.min(this._maxScroll, this._scrollY + e.deltaY));
    this._spellContainer.position.y = this._spellBaseY - this._scrollY;
    this._updateScrollThumb();
  }

  // ---------------------------------------------------------------------------
  // Spell hover tooltip
  // ---------------------------------------------------------------------------

  private _showSpellTooltip(spell: UpgradeDef, colColor: number, row: Container): void {
    this._tooltip.removeChildren();
    this._tooltip.visible = true;

    const TT_W = 338;
    const PAD = 13;

    const tierNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII"];
    const schoolColors: Record<string, number> = {
      elemental: 0xff6622, arcane: 0x9966ff, divine: 0xffdd44,
      shadow: 0xaa66cc, conjuration: 0x4488ff,
    };
    const magicTypeColors: Record<string, number> = {
      fire: 0xff4422, ice: 0x66ccff, lightning: 0xffff44,
      earth: 0xaa8844, arcane: 0x9966ff, holy: 0xffdd44,
      shadow: 0xaa66cc, poison: 0x66cc44, void: 0x8833cc,
      death: 0x44aa88, nature: 0x44cc44,
    };

    let yPos = PAD;

    // Spell name (full)
    const nameT = new Text({
      text: getSpellLabel(spell.type),
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 17, fill: 0xffffff,
        fontWeight: "bold",
      }),
    });
    nameT.position.set(PAD, yPos);
    this._tooltip.addChild(nameT);
    yPos += 23;

    // School line
    if (spell.spellSchool) {
      const schoolName = spell.spellSchool.charAt(0).toUpperCase() + spell.spellSchool.slice(1);
      const schoolT = new Text({
        text: `${schoolName} School`,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 13, fontWeight: "bold",
          fill: schoolColors[spell.spellSchool] ?? 0xffffff,
        }),
      });
      schoolT.position.set(PAD, yPos);
      this._tooltip.addChild(schoolT);
      yPos += 18;
    }

    // Magic type + tier
    if (spell.spellMagicType && spell.spellTier) {
      const typeName = spell.spellMagicType.charAt(0).toUpperCase() + spell.spellMagicType.slice(1);
      const tierLabel = tierNumerals[spell.spellTier] ?? `${spell.spellTier}`;
      const mtT = new Text({
        text: `${typeName} — Tier ${tierLabel}`,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 13,
          fill: magicTypeColors[spell.spellMagicType] ?? colColor,
        }),
      });
      mtT.position.set(PAD, yPos);
      this._tooltip.addChild(mtT);
      yPos += 18;
    }

    yPos += 5;

    // Description
    const descT = new Text({
      text: spell.description,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 13, fill: 0xaaaadd,
        wordWrap: true, wordWrapWidth: TT_W - 2 * PAD,
      }),
    });
    descT.position.set(PAD, yPos);
    this._tooltip.addChild(descT);
    yPos += descT.height + 10;

    // Stats line: mana cost, damage/heal, radius
    const stats: string[] = [];
    if (spell.manaCost) stats.push(`Mana: ${spell.manaCost}`);
    if (spell.spellDamage) stats.push(`Damage: ${spell.spellDamage}`);
    if (spell.spellHeal) stats.push(`Heal: ${spell.spellHeal}`);
    if (spell.spellRadius) stats.push(`Radius: ${spell.spellRadius}`);

    if (stats.length > 0) {
      const statsT = new Text({
        text: stats.join("   "),
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 13, fill: 0x88bbff,
          fontWeight: "bold",
        }),
      });
      statsT.position.set(PAD, yPos);
      this._tooltip.addChild(statsT);
      yPos += 20;
    }

    // Debuff / effect line
    const effects: string[] = [];
    if (spell.spellSlowDuration && spell.spellSlowFactor) {
      const pct = Math.round((1 - spell.spellSlowFactor) * 100);
      effects.push(`Slows ${pct}% for ${spell.spellSlowDuration}s`);
    }
    if (spell.spellTeleportDistance) {
      effects.push(`Displaces ${spell.spellTeleportDistance} tiles`);
    }
    if (effects.length > 0) {
      const fxT = new Text({
        text: effects.join("   "),
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 12, fill: 0xddaa44,
          fontStyle: "italic",
        }),
      });
      fxT.position.set(PAD, yPos);
      this._tooltip.addChild(fxT);
      yPos += 18;
    }

    const TT_H = yPos + PAD;

    // Background (drawn behind everything)
    const bg = new Graphics()
      .roundRect(0, 0, TT_W, TT_H, 6)
      .fill({ color: 0x0d0d22, alpha: 0.96 })
      .roundRect(0, 0, TT_W, TT_H, 6)
      .stroke({ color: colColor, alpha: 0.6, width: 1.5 });
    this._tooltip.addChildAt(bg, 0);

    // Position tooltip near the hovered row (in card-local space)
    const globalPos = row.getGlobalPosition();
    const cardPos = this._mainCard.getGlobalPosition();

    let tx = globalPos.x - cardPos.x + 120;
    let ty = globalPos.y - cardPos.y - TT_H / 2;

    // Keep within card bounds
    if (tx + TT_W > CARD_W - 10) tx = globalPos.x - cardPos.x - TT_W - 10;
    if (ty < 10) ty = 10;
    if (ty + TT_H > CARD_H - 10) ty = CARD_H - TT_H - 10;

    this._tooltip.position.set(
      cardPos.x + tx,
      cardPos.y + ty,
    );
  }

  private _hideSpellTooltip(): void {
    this._tooltip.visible = false;
    this._tooltip.removeChildren();
  }

  // ---------------------------------------------------------------------------
  // National mage spell gathering & initialization
  // ---------------------------------------------------------------------------

  /** Gather all available (race-gated) spells into a flat array. */
  private _gatherAvailableSpells(race: RaceDef | null): void {
    this._allAvailableSpells = [];
    if (!race?.tiers) return;
    const tiers = race.tiers;

    for (const [, def] of Object.entries(UPGRADE_DEFINITIONS)) {
      if (!def.isSpell || !def.spellTier) continue;

      if (def.spellSchool === "conjuration") {
        const summonLimit = tiers.summon ?? 0;
        if (def.spellTier <= summonLimit) {
          this._allAvailableSpells.push(def);
        }
        continue;
      }

      if (!def.spellMagicType) continue;
      const tierKey = SPELL_MAGIC_TO_TIER[def.spellMagicType];
      if (!tierKey) continue;
      const limit = tiers[tierKey] ?? 0;
      if (def.spellTier <= limit) {
        this._allAvailableSpells.push(def);
      }
    }
  }

  /** Randomly assign spells to national mage slots. */
  private _initMageSpells(): void {
    this._selectedSpells = [];
    nationalMageSpells.clear();

    if (this._magicLevel <= 0 || this._allAvailableSpells.length === 0) return;

    // Total slots needed
    const totalSlots = this._getTotalSlots();
    const pool = [...this._allAvailableSpells];

    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Pick unique spells up to totalSlots
    const picked: UpgradeType[] = [];
    for (const spell of pool) {
      if (picked.length >= totalSlots) break;
      if (!picked.includes(spell.type)) {
        picked.push(spell.type);
      }
    }
    this._selectedSpells = picked;
    this._syncNationalMageSpells();
  }

  /** Get total number of spell slots for the current magic level. */
  private _getTotalSlots(): number {
    let total = 0;
    for (let t = 0; t < this._magicLevel; t++) {
      total += MAGE_SPELL_SLOTS[t] ?? 1;
    }
    return total;
  }

  /** Sync the flat _selectedSpells array to the nationalMageSpells map. */
  private _syncNationalMageSpells(): void {
    nationalMageSpells.clear();
    let idx = 0;
    for (let tier = 1; tier <= this._magicLevel; tier++) {
      const slots = MAGE_SPELL_SLOTS[tier - 1] ?? 1;
      const spells: UpgradeType[] = [];
      for (let s = 0; s < slots; s++) {
        if (idx < this._selectedSpells.length) {
          spells.push(this._selectedSpells[idx]);
        }
        idx++;
      }
      if (spells.length > 0) {
        nationalMageSpells.set(tier, spells);
      }
    }
  }

  /** Toggle a spell's selection state. */
  private _toggleSpellSelection(spellType: UpgradeType): void {
    const idx = this._selectedSpells.indexOf(spellType);
    if (idx >= 0) {
      // Deselect
      this._selectedSpells.splice(idx, 1);
    } else {
      // Select — only if we have room
      const totalSlots = this._getTotalSlots();
      if (this._selectedSpells.length < totalSlots) {
        this._selectedSpells.push(spellType);
      }
    }
    this._syncNationalMageSpells();
    // Rebuild UI to reflect selection changes
    this._buildUI();
  }

  // ---------------------------------------------------------------------------
  // National mage footer (shows selected spells in continue row)
  // ---------------------------------------------------------------------------

  /** Calculate how wide a tier's badges will be. */
  private _tierWidth(tier: number): number {
    const slots = MAGE_SPELL_SLOTS[tier - 1] ?? 1;
    return 30 + slots * 114; // tierLabel(30) + slots * (badgeW(110) + gap(4))
  }

  /** Pre-compute the number of rows the mage footer needs. */
  private _getMageFooterRowCount(): number {
    const MAX_W = CARD_W - 350; // leave room for continue button
    const START_X = 210; // after "NATIONAL MAGE SPELLS:" label
    let cx = START_X;
    let rows = 1;
    for (let tier = 1; tier <= this._magicLevel; tier++) {
      const tw = this._tierWidth(tier) + 8; // +8 gap between tiers
      if (cx + tw > MAX_W && cx > START_X) {
        rows++;
        cx = START_X;
      }
      cx += tw;
    }
    return rows;
  }

  private _buildMageFooter(parent: Container, x: number, y: number): void {
    const cont = new Container();
    cont.position.set(x, y);
    parent.addChild(cont);

    const ROW_H = 22;
    const MAX_W = CARD_W - 350;
    const START_X = 210;

    // Label
    const labelT = new Text({
      text: t("magic.national_spells"),
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 12, fill: 0x88bbff,
        fontWeight: "bold", letterSpacing: 1,
      }),
    });
    labelT.position.set(0, 0);
    cont.addChild(labelT);

    // Tier slots with spell names, wrapping to new rows
    let cx = START_X;
    let cy = 0;
    let idx = 0;
    const tierNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII"];

    for (let tier = 1; tier <= this._magicLevel; tier++) {
      const slots = MAGE_SPELL_SLOTS[tier - 1] ?? 1;
      const tw = this._tierWidth(tier) + 8;

      // Wrap to next row if this tier won't fit
      if (cx + tw > MAX_W && cx > START_X) {
        cx = START_X;
        cy += ROW_H;
      }

      // Tier label
      const tierT = new Text({
        text: `T${tierNumerals[tier]}:`,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 11, fill: 0xffd700,
          fontWeight: "bold",
        }),
      });
      tierT.position.set(cx, cy);
      cont.addChild(tierT);
      cx += 30;

      // Spell badges for this tier
      for (let s = 0; s < slots; s++) {
        const spellType = this._selectedSpells[idx];
        idx++;

        const badgeW = 110;
        const badgeH = 18;
        const bg = new Graphics()
          .roundRect(cx, cy - 2, badgeW, badgeH, 3)
          .fill({ color: spellType ? 0x1a2a3a : 0x111122, alpha: 0.8 })
          .roundRect(cx, cy - 2, badgeW, badgeH, 3)
          .stroke({ color: spellType ? 0x44aa66 : 0x334455, alpha: 0.6, width: 0.5 });
        cont.addChild(bg);

        const text = spellType ? getSpellLabel(spellType) : "(empty)";
        const nameT = new Text({
          text: text.length > 14 ? text.substring(0, 13) + "." : text,
          style: new TextStyle({
            fontFamily: "monospace", fontSize: 10,
            fill: spellType ? 0x88ffaa : 0x445566,
          }),
        });
        nameT.position.set(cx + 4, cy + 1);
        cont.addChild(nameT);
        cx += badgeW + 4;
      }
      cx += 8;
    }

    // Show remaining slots info
    const totalSlots = this._getTotalSlots();
    const filled = this._selectedSpells.length;
    if (filled < totalSlots) {
      const remainT = new Text({
        text: `  ${totalSlots - filled} slot${totalSlots - filled > 1 ? "s" : ""} remaining`,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 11, fill: 0xff8844,
          fontStyle: "italic",
        }),
      });
      remainT.position.set(cx, cy);
      cont.addChild(remainT);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
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
}

export const magicScreen = new MagicScreen();
