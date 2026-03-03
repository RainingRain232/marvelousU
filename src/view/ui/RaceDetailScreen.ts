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
import hordeImgUrl from "@/img/horde.png";
import adeptImgUrl from "@/img/adept.png";

const RACE_IMAGES: Record<string, string> = {
  elf: elfImgUrl,
  man: manImgUrl,
  horde: hordeImgUrl,
  adept: adeptImgUrl,
  elements: manImgUrl,
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

/** Map from UnitCategory to the default RaceTiers key (for non-element units). */
const CATEGORY_TIER_KEY: Record<UnitCategory, keyof RaceTiers> = {
  melee: "melee", ranged: "ranged", siege: "siege",
  creature: "creature", magic: "magic", heal: "heal",
};

/** Get all general (non-faction) units organised by category, filtered by race tiers. */
function getGeneralUnits(factionUnits: UnitType[], race: RaceDef): Record<UnitCategory, UnitDef[]> {
  const result: Record<UnitCategory, UnitDef[]> = {
    melee: [], ranged: [], magic: [], siege: [], creature: [], heal: [],
  };
  const factionSet = new Set(factionUnits);
  const seen = new Set<UnitType>();
  const tiers = race.tiers;

  for (const [key, def] of Object.entries(UNIT_DEFINITIONS)) {
    const ut = key as UnitType;
    if (factionSet.has(ut)) continue;
    if (seen.has(ut)) continue;
    seen.add(ut);
    const cat = getUnitCategory(ut);
    if (!cat) continue;

    // Race-tier filtering: element units use their element tier, others use category tier
    if (tiers) {
      const tierKey: keyof RaceTiers = def.element
        ? (def.element as keyof RaceTiers)
        : CATEGORY_TIER_KEY[cat];
      const unitTier = def.tier ?? 1;
      if (unitTier > tiers[tierKey]) continue;
    }

    result[cat].push(def);
  }

  // Sort by tier, then cost
  for (const cat of Object.keys(result) as UnitCategory[]) {
    result[cat].sort((a, b) => (a.tier ?? 1) - (b.tier ?? 1) || a.cost - b.cost);
  }
  return result;
}

/** All tiers maxed — used in wiki mode. */
const WIKI_TIERS: RaceTiers = {
  melee: 5, ranged: 5, siege: 5,
  creature: 5, magic: 5,
  fire: 5, cold: 5, lightning: 5,
  distortion: 5, summon: 5, nature: 5,
  heal: 5,
};

/** Get ALL units (no tier filtering, no faction exclusion) organised by category. */
function getAllUnits(): Record<UnitCategory, UnitDef[]> {
  const result: Record<UnitCategory, UnitDef[]> = {
    melee: [], ranged: [], magic: [], siege: [], creature: [], heal: [],
  };
  const seen = new Set<UnitType>();

  for (const [key, def] of Object.entries(UNIT_DEFINITIONS)) {
    const ut = key as UnitType;
    if (seen.has(ut)) continue;
    seen.add(ut);
    const cat = getUnitCategory(ut);
    if (!cat) continue;
    result[cat].push(def);
  }

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
// Tier tooltip data — flavor text + abilities per tier for each category
// ---------------------------------------------------------------------------

interface TierAbility {
  name: string;
  desc: string;
}

interface TierEntry {
  tier: number;
  abilities: TierAbility[];
}

interface TierTooltipInfo {
  flavor: string;
  entries: TierEntry[];
}

const TIER_TOOLTIP_DATA: Record<keyof RaceTiers, TierTooltipInfo> = {
  melee: {
    flavor: "The backbone of any army. Swords, axes, and lances forge the front line, holding ground where others cannot.",
    entries: [
      { tier: 1, abilities: [
        { name: "Swordsman", desc: "Sturdy frontline warrior with reliable steel." },
        { name: "Pikeman", desc: "Extended reach keeps enemies at bay." },
        { name: "Knight", desc: "Armored cavalry with devastating charge." },
      ] },
      { tier: 2, abilities: [
        { name: "Defender", desc: "Tower shield tank, nearly immovable." },
        { name: "Axeman", desc: "Fierce warrior with devastating cleave." },
        { name: "Phalanx", desc: "Long spear + tower shield wall." },
      ] },
      { tier: 3, abilities: [
        { name: "Assassin", desc: "Deadly striker, fast and lethal but fragile." },
        { name: "Berserker", desc: "Naked fury with a two-handed axe." },
        { name: "Royal Defender", desc: "Elite royal guard, HP 450." },
      ] },
      { tier: 4, abilities: [
        { name: "Royal Lancer", desc: "Elite mounted lancer with devastating charge." },
      ] },
    ],
  },
  ranged: {
    flavor: "Death from a distance. Archers and crossbowmen thin enemy ranks long before the melee begins.",
    entries: [
      { tier: 1, abilities: [
        { name: "Archer", desc: "Deadly marksman, range 4." },
        { name: "Longbowman", desc: "Extreme range 6, picks off enemies from afar." },
        { name: "Crossbowman", desc: "Devastating bolts, ATK 30 but slow reload." },
        { name: "Horse Archer", desc: "Mounted archer, fast and mobile." },
      ] },
      { tier: 2, abilities: [
        { name: "Javelineer", desc: "High damage javelins, ATK 35." },
      ] },
      { tier: 3, abilities: [
        { name: "Repeater", desc: "Rapid-fire crossbow, attack speed 2.0." },
        { name: "Arbalestier", desc: "Plate-armored crossbowman, ATK 50." },
      ] },
    ],
  },
  siege: {
    flavor: "Massive engines of war that reduce walls to rubble and castles to ash. Slow but devastating against fortifications.",
    entries: [
      { tier: 1, abilities: [
        { name: "Trebuchet", desc: "Bombards from extreme range, ATK 70." },
      ] },
      { tier: 2, abilities: [
        { name: "Battering Ram", desc: "HP 300, smashes structures in melee." },
        { name: "Ballista", desc: "Long-range bolt launcher, ATK 50." },
        { name: "Siege Catapult", desc: "Enormous boulders at range 11." },
      ] },
      { tier: 3, abilities: [
        { name: "Bolt Thrower", desc: "Rapid siege bolt launcher, range 7." },
      ] },
      { tier: 4, abilities: [
        { name: "Catapult", desc: "Heavy catapult, devastating arc fire." },
      ] },
    ],
  },
  magic: {
    flavor: "Arcane mastery over the elements. Higher tiers unlock more powerful mages across all schools of magic.",
    entries: [
      { tier: 1, abilities: [
        { name: "Apprentice Mages", desc: "Basic elemental mages — fire, storm, cold, distortion." },
      ] },
      { tier: 2, abilities: [
        { name: "Adept Mages", desc: "Stronger casters who also summon elemental imps." },
      ] },
      { tier: 3, abilities: [
        { name: "Master Mages", desc: "Grandmasters with HP regen and double imp summons." },
      ] },
      { tier: 4, abilities: [
        { name: "Dark Savant", desc: "Master of dark pyromancy with enhanced destruction." },
      ] },
    ],
  },
  creature: {
    flavor: "Beasts and monsters tamed for war. From agile pixies to fearsome dragons, creatures bring chaos to the battlefield.",
    entries: [
      { tier: 1, abilities: [
        { name: "Pixie / Imps", desc: "Fast flying creatures with magical attacks." },
        { name: "Spider", desc: "Web — slows enemies for 4s at 35% speed." },
        { name: "Bat", desc: "Swarm of tiny bats, very fast but fragile." },
      ] },
      { tier: 2, abilities: [
        { name: "Giant Frog", desc: "Frog Tongue — pulls enemies from range 7." },
        { name: "Rhino", desc: "Armored tank, HP 350, slow but devastating." },
      ] },
      { tier: 3, abilities: [
        { name: "Troll", desc: "Massive HP 400 with natural regen." },
        { name: "Devourer", desc: "Devour Pull — drags enemies in for 40 dmg." },
        { name: "Faery Queen", desc: "Faery Distortion — teleports foes 4 tiles." },
      ] },
      { tier: 4, abilities: [
        { name: "Red Dragon", desc: "Fire Breath — 80 dmg in AoE 3.5." },
        { name: "Frost Dragon", desc: "Frost Breath — 60 dmg + 4s slow." },
      ] },
      { tier: 5, abilities: [
        { name: "Cyclops", desc: "HP 800, earth-shattering melee blows." },
        { name: "Angel", desc: "Divine warrior, HP 1500, ATK 90." },
      ] },
    ],
  },
  heal: {
    flavor: "Divine light that mends wounds and restores the fallen. Healers sustain armies through the darkest battles.",
    entries: [
      { tier: 1, abilities: [
        { name: "Templar", desc: "Holy warrior with divine blessing and regen." },
      ] },
      { tier: 2, abilities: [
        { name: "Monk", desc: "Heal — restores 50 HP to allies, range 1.5." },
      ] },
      { tier: 3, abilities: [
        { name: "Cleric", desc: "Heal — restores 50 HP, range 3." },
      ] },
      { tier: 4, abilities: [
        { name: "Saint", desc: "Heal — restores 50 HP, range 5." },
      ] },
      { tier: 5, abilities: [
        { name: "Angel", desc: "Divine celestial warrior, HP 1500, regen 5." },
      ] },
    ],
  },
  fire: {
    flavor: "Pyromancy — the ancient art of bending flame. Fire mages rain destruction upon their enemies, engulfing entire battalions in hellfire.",
    entries: [
      { tier: 1, abilities: [
        { name: "Fire Mage", desc: "Fireball — 60 dmg, AoE radius 2." },
      ] },
      { tier: 2, abilities: [
        { name: "Fire Adept Mage", desc: "Fireball + Fire Imp Summon." },
      ] },
      { tier: 3, abilities: [
        { name: "Fire Master Mage", desc: "Fireball + summons 2 Fire Imps. HP regen." },
      ] },
      { tier: 4, abilities: [
        { name: "Dark Savant", desc: "Master of dark pyromancy, enhanced fireballs." },
      ] },
    ],
  },
  cold: {
    flavor: "Cryomancy — wielders of frost command the bitter cold, freezing enemies in their tracks before shattering them to pieces.",
    entries: [
      { tier: 1, abilities: [
        { name: "Cold Mage", desc: "Ice Ball — 25 dmg, AoE 2.5, slows 3s at 40% speed." },
      ] },
      { tier: 2, abilities: [
        { name: "Cold Adept Mage", desc: "Ice Ball + Ice Imp Summon." },
      ] },
      { tier: 3, abilities: [
        { name: "Cold Master Mage", desc: "Ice Ball + summons 2 Ice Imps. HP regen." },
      ] },
    ],
  },
  lightning: {
    flavor: "Destructive energies from the heavens. Users channel this power and manipulate it to strike their foes with devastating precision.",
    entries: [
      { tier: 1, abilities: [
        { name: "Storm Mage", desc: "Chain Lightning — 40 dmg, bounces to 4 foes." },
      ] },
      { tier: 2, abilities: [
        { name: "Lightning Adept Mage", desc: "Chain Lightning + Lightning Imp Summon." },
      ] },
      { tier: 3, abilities: [
        { name: "Lightning Master Mage", desc: "Chain Lightning + summons 2 Lightning Imps. HP regen." },
      ] },
    ],
  },
  distortion: {
    flavor: "Space-warping magic that tears the fabric of reality. Distortion mages teleport enemies into disarray and shatter their formations.",
    entries: [
      { tier: 1, abilities: [
        { name: "Distortion Mage", desc: "Distortion Blast — 20 dmg, teleports foes 3 tiles." },
      ] },
      { tier: 2, abilities: [
        { name: "Distortion Adept Mage", desc: "Distortion Blast + Distortion Imp Summon." },
      ] },
      { tier: 3, abilities: [
        { name: "Distortion Master Mage", desc: "Distortion Blast + summons 2 Distortion Imps. HP regen." },
      ] },
    ],
  },
  summon: {
    flavor: "The art of calling forth creatures from beyond to fight at your command. Summoners turn empty space into an army.",
    entries: [
      { tier: 1, abilities: [
        { name: "Summoner", desc: "Summon — conjures 3 creatures to fight for you." },
      ] },
      { tier: 2, abilities: [
        { name: "Constructionist", desc: "Summon — conjures 3 creatures, more durable." },
      ] },
    ],
  },
  nature: {
    flavor: "The living world fights alongside those who listen. Nature magic channels the raw power of forests, beasts, and the earth itself.",
    entries: [
      { tier: 1, abilities: [
        { name: "Nature Affinity", desc: "Creatures and forest units gain minor bonuses." },
      ] },
      { tier: 3, abilities: [
        { name: "Deep Nature", desc: "Stronger bond with living creatures and terrain." },
      ] },
      { tier: 5, abilities: [
        { name: "Primal Force", desc: "The full fury of nature unleashed upon your enemies." },
      ] },
    ],
  },
};

// Tier tooltip dimensions
const TIER_TT_W = 340;
const TIER_TT_PAD = 10;

// ---------------------------------------------------------------------------
// RaceDetailScreen
// ---------------------------------------------------------------------------

export class RaceDetailScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _mainCard!: Container;
  private _raceId: RaceId = "man";
  private _wikiMode = false;

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

  // Tooltip (unit hover)
  private _tooltip!: Container;
  private _tooltipSprite: AnimatedSprite | null = null;

  // Tier tooltip (tier row hover)
  private _tierTooltip!: Container;

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
    this._wikiMode = false;
    this.container.visible = true;
    this._buildUI();
    this._layout();
  }

  showWiki(): void {
    this._raceId = "man"; // unused in wiki mode, just a fallback
    this._wikiMode = true;
    this.container.visible = true;
    this._buildUI();
    this._layout();
  }

  hide(): void {
    this.container.visible = false;
    this._hideTooltip();
    this._hideTierTooltip();
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
    const wiki = this._wikiMode;

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

    const title = new Text({
      text: wiki ? "UNIT WIKI" : "RACE OVERVIEW",
      style: STYLE_SCREEN_TITLE,
    });
    title.anchor.set(0.5, 0);
    title.position.set(CARD_W / 2, 18);
    card.addChild(title);

    // Divider
    card.addChild(
      new Graphics().rect(21, 65, CARD_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    const TOP_Y = 75;

    if (wiki) {
      // ---- Wiki mode: info header + tier grid, no portrait or faction row ----
      this._buildWikiInfo(card, TOP_Y);

      // Unit roster starts after wiki header (name 31 + sub 23 + div 8 + label 21 + grid 84 + gap 10)
      const ROSTER_Y = TOP_Y + 177;
      this._buildUnitRoster(card, race, ROSTER_Y, true);
    } else {
      // ---- Normal mode: portrait + info ----
      this._buildPortrait(card, race, 26, TOP_Y);
      this._buildRaceInfo(card, race, 26 + PORTRAIT_SIZE + 21, TOP_Y);

      // Faction units row
      const FACTION_Y = TOP_Y + PORTRAIT_SIZE + 16;
      this._buildFactionRow(card, race, FACTION_Y);

      // Available units roster
      const ROSTER_Y = FACTION_Y + 120;
      this._buildUnitRoster(card, race, ROSTER_Y, false);
    }

    // Divider above footer
    card.addChild(
      new Graphics().rect(21, CARD_H - 68, CARD_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    if (!wiki) {
      // Continue button (only in normal mode)
      const nextBtn = this._makeNavBtn("CONTINUE  >", 195, 44, true);
      nextBtn.position.set(CARD_W - 221, CARD_H - 57);
      nextBtn.on("pointerdown", () => this.onNext?.());
      card.addChild(nextBtn);
    }

    // Tooltips (added last so they render on top)
    this._buildTooltip(card);
    this._buildTierTooltip(card);

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

      this._buildTierGrid(cont, race.tiers, 0, cy, race.accentColor, x, y + cy);
    }
  }

  // ---------------------------------------------------------------------------
  // Wiki info header (replaces portrait + race info in wiki mode)
  // ---------------------------------------------------------------------------

  private _buildWikiInfo(parent: Container, y: number): void {
    const cont = new Container();
    cont.position.set(26, y);
    parent.addChild(cont);

    let cy = 0;

    // Name
    const nameT = new Text({ text: "Complete Overview of Units", style: STYLE_RACE_NAME });
    nameT.position.set(0, cy);
    cont.addChild(nameT);
    cy += 31;

    // Subtitle
    const subtitleT = new Text({
      text: "Hover over units and tier ratings to see extra info.",
      style: STYLE_RACE_TITLE,
    });
    subtitleT.position.set(0, cy);
    cont.addChild(subtitleT);
    cy += 23;

    // Divider
    cont.addChild(new Graphics().rect(0, cy, 572, 1).fill({ color: 0x334455 }));
    cy += 8;

    // Tier grid (all maxed)
    const tierLabel = new Text({ text: "TIER RATINGS (ALL UNLOCKED)", style: STYLE_SECTION });
    tierLabel.position.set(0, cy);
    cont.addChild(tierLabel);
    cy += 21;

    this._buildTierGrid(cont, WIKI_TIERS, 0, cy, BORDER_COLOR, 26, y + cy);
  }

  // ---------------------------------------------------------------------------
  // Tier rating grid (with hover tooltips)
  // ---------------------------------------------------------------------------

  private _buildTierGrid(
    parent: Container, tiers: RaceTiers,
    x: number, y: number, _accent: number,
    cardOffsetX: number, cardOffsetY: number,
  ): void {
    const COLS = 3;
    const COL_W = 192;
    const ROW_H = 21;

    for (let i = 0; i < TIER_ICON_INFO.length; i++) {
      const info = TIER_ICON_INFO[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const px = x + col * COL_W;
      const py = y + row * ROW_H;

      // Interactive row wrapper
      const rowCont = new Container();
      rowCont.position.set(px, py);
      rowCont.eventMode = "static";
      rowCont.cursor = "pointer";
      rowCont.hitArea = new Rectangle(0, 0, COL_W - 4, ROW_H);
      parent.addChild(rowCont);

      // Hover background (invisible by default)
      const hoverBg = new Graphics()
        .rect(0, 0, COL_W - 4, ROW_H)
        .fill({ color: 0x223344, alpha: 0 });
      rowCont.addChild(hoverBg);

      const label = new Text({ text: info.label, style: STYLE_TIER_LABEL });
      label.position.set(0, 0);
      rowCont.addChild(label);

      // Draw pips
      const val = tiers[info.key];
      const g = new Graphics();
      for (let p = 0; p < 5; p++) {
        const pipX = 81 + p * 16;
        const pipY = 5;
        if (p < val) {
          g.circle(pipX, pipY, 4.5).fill({ color: info.color, alpha: 0.9 });
        } else {
          g.circle(pipX, pipY, 4.5)
            .fill({ color: 0x1a1a2a })
            .circle(pipX, pipY, 4.5)
            .stroke({ color: info.color, alpha: 0.3, width: 0.5 });
        }
      }
      rowCont.addChild(g);

      // Numeric value
      const numT = new Text({ text: `${val}`, style: STYLE_TIER_VALUE });
      numT.position.set(81 + 5 * 16 + 5, 0);
      rowCont.addChild(numT);

      // Hover: show tier tooltip
      const tierKey = info.key;
      const tierColor = info.color;
      const cardX = cardOffsetX + px + COL_W;
      const cardY = cardOffsetY + row * ROW_H;

      rowCont.on("pointerover", () => {
        hoverBg.clear().rect(0, 0, COL_W - 4, ROW_H).fill({ color: 0x223344, alpha: 0.5 });
        this._showTierTooltip(tierKey, tierColor, val, cardX, cardY);
      });
      rowCont.on("pointerout", () => {
        hoverBg.clear().rect(0, 0, COL_W - 4, ROW_H).fill({ color: 0x223344, alpha: 0 });
        this._hideTierTooltip();
      });
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

  private _buildUnitRoster(parent: Container, race: RaceDef, y: number, wiki = false): void {
    // Section label
    const label = new Text({
      text: wiki ? "ALL UNITS" : "AVAILABLE UNITS",
      style: STYLE_SECTION,
    });
    label.position.set(26, y);
    parent.addChild(label);

    parent.addChild(
      new Graphics().rect(26, y + 21, CARD_W - 52, 1).fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    // In wiki mode with no footer button, use more vertical space
    const ROSTER_TOP = y + 26;
    const ROSTER_H = wiki
      ? CARD_H - ROSTER_TOP - 10
      : CARD_H - 68 - ROSTER_TOP - 5;
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

    const units = wiki ? getAllUnits() : getGeneralUnits(race.factionUnits, race);
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

    // Stats line 1: HP ATK SPD TIER
    const line1 = new Text({
      text: `HP:${def.hp}  ATK:${def.atk}  SPD:${def.speed}${def.tier ? `  T${def.tier}` : ""}`,
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
  // Tier tooltip
  // ---------------------------------------------------------------------------

  private _buildTierTooltip(parent: Container): void {
    this._tierTooltip = new Container();
    this._tierTooltip.visible = false;
    parent.addChild(this._tierTooltip);
  }

  private _showTierTooltip(
    tierKey: keyof RaceTiers, color: number, raceVal: number,
    cardX: number, cardY: number,
  ): void {
    const tt = this._tierTooltip;
    tt.removeChildren();

    const data = TIER_TOOLTIP_DATA[tierKey];
    if (!data) return;

    let cy = TIER_TT_PAD;

    // Category title in its colour
    const titleT = new Text({
      text: tierKey.toUpperCase(),
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 14, fill: color,
        fontWeight: "bold", letterSpacing: 2,
      }),
    });
    titleT.position.set(TIER_TT_PAD, cy);
    tt.addChild(titleT);
    cy += 18;

    // Race tier value
    const valT = new Text({
      text: `Your tier: ${raceVal} / 5`,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 10, fill: 0xffd700,
      }),
    });
    valT.position.set(TIER_TT_PAD, cy);
    tt.addChild(valT);
    cy += 14;

    // Flavor text
    const flavorT = new Text({
      text: data.flavor,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 10, fill: 0x99aabb,
        wordWrap: true, wordWrapWidth: TIER_TT_W - TIER_TT_PAD * 2,
      }),
    });
    flavorT.position.set(TIER_TT_PAD, cy);
    tt.addChild(flavorT);
    cy += flavorT.height + 8;

    // Divider
    tt.addChild(
      new Graphics()
        .rect(TIER_TT_PAD, cy, TIER_TT_W - TIER_TT_PAD * 2, 1)
        .fill({ color: 0x334455 }),
    );
    cy += 6;

    // Abilities by tier
    for (const entry of data.entries) {
      const unlocked = entry.tier <= raceVal;

      // Tier header
      const tierHdr = new Text({
        text: `TIER ${entry.tier}`,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 10,
          fill: unlocked ? color : 0x445566,
          fontWeight: "bold", letterSpacing: 1,
        }),
      });
      tierHdr.position.set(TIER_TT_PAD, cy);
      tt.addChild(tierHdr);

      // Locked indicator
      if (!unlocked) {
        const lockT = new Text({
          text: " (locked)",
          style: new TextStyle({
            fontFamily: "monospace", fontSize: 9, fill: 0x664444,
          }),
        });
        lockT.position.set(TIER_TT_PAD + 48, cy + 1);
        tt.addChild(lockT);
      }
      cy += 14;

      for (const ab of entry.abilities) {
        // Ability name in category colour (dimmed if locked)
        const nameT = new Text({
          text: ab.name,
          style: new TextStyle({
            fontFamily: "monospace", fontSize: 11,
            fill: unlocked ? color : 0x445566,
            fontWeight: "bold",
          }),
        });
        nameT.position.set(TIER_TT_PAD + 6, cy);
        tt.addChild(nameT);
        cy += 13;

        // Ability description
        const descT = new Text({
          text: ab.desc,
          style: new TextStyle({
            fontFamily: "monospace", fontSize: 9,
            fill: unlocked ? 0x99aabb : 0x3a3a4a,
            wordWrap: true, wordWrapWidth: TIER_TT_W - TIER_TT_PAD * 2 - 6,
          }),
        });
        descT.position.set(TIER_TT_PAD + 6, cy);
        tt.addChild(descT);
        cy += descT.height + 4;
      }

      cy += 2;
    }

    const TT_H = cy + TIER_TT_PAD;

    // Background
    const bg = new Graphics()
      .roundRect(0, 0, TIER_TT_W, TT_H, 6)
      .fill({ color: 0x0d0d1e, alpha: 0.95 })
      .roundRect(0, 0, TIER_TT_W, TT_H, 6)
      .stroke({ color, alpha: 0.5, width: 1 });
    tt.addChildAt(bg, 0);

    // Position: to the right of the hovered row
    let tx = cardX + 6;
    let ty = cardY - TT_H / 2;

    // Clamp within card bounds
    if (tx + TIER_TT_W > CARD_W - 10) {
      tx = cardX - TIER_TT_W - 16;
    }
    if (ty < 10) ty = 10;
    if (ty + TT_H > CARD_H - 10) ty = CARD_H - TT_H - 10;

    tt.position.set(tx, ty);
    tt.visible = true;
  }

  private _hideTierTooltip(): void {
    if (!this._tierTooltip) return;
    this._tierTooltip.visible = false;
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
