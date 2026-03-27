// Menu screen: two-panel flow
//   Screen 1 — Game mode selection + wiki/utility buttons
//   Screen 2 — Match setup (map type, map size, AI, players, alliances)
import { Container, Graphics, Text, TextStyle, Assets, Sprite, Texture } from "pixi.js";
import dragonImgUrl from "@/img/dragon.png";
import type { ViewManager } from "@view/ViewManager";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { GameMode, GamePhase, MapType } from "@/types";
import { hasWorldSave } from "@world/state/WorldSerialization";
import { Difficulty, DIFFICULTY_SETTINGS, setDifficulty } from "@sim/config/DifficultyConfig";
import { AmbientParticles } from "@view/fx/AmbientParticles";
import { RuneCorners } from "@view/fx/RuneCorners";
import { t } from "@/i18n/i18n";
import { House1Renderer } from "@view/entities/House1Renderer";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 28,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 3,
});

const STYLE_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0x8899aa,
  letterSpacing: 1,
});

const STYLE_BTN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xffffff,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_SIZE_ACTIVE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_SIZE_INACTIVE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0x8899aa,
  letterSpacing: 1,
});

const STYLE_MODE_INACTIVE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x8899aa,
  letterSpacing: 1,
});

const STYLE_MODE_DISABLED = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x445566,
  letterSpacing: 1,
});

const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;

// ---------------------------------------------------------------------------
// Wave high-score helpers (reads from wave_best_v1 localStorage)
// ---------------------------------------------------------------------------

interface _WaveBestRun {
  wave: number;
  totalGoldSpent: number;
  raceId: string;
  leaderId: string;
  date: string;
}

function _readWaveBestRuns(): _WaveBestRun[] {
  try {
    const raw = localStorage.getItem("wave_best_v1");
    if (!raw) return [];
    return JSON.parse(raw) as _WaveBestRun[];
  } catch { return []; }
}

// ---------------------------------------------------------------------------
// Wave mode hints
// ---------------------------------------------------------------------------

const WAVE_HINTS = [
  "Build a mix of unit types — each wave brings different enemy compositions.",
  "Grail Greed rewards bold play: more gold each wave, but enemies scale faster.",
  "Upgrade buildings between waves to raise the level cap of units they spawn.",
  "Save gold in early waves — powerful siege units pay off in the long run.",
  "Boss waves arrive every 10 waves and hit hard. Keep your base health up.",
  "Mage towers shred armoured enemies that sword infantry struggle against.",
  "Different races excel in different roles — experiment to find your style.",
  "Your leader bonus is active from wave 1. Pick one that fits your plan.",
  "Creature Dens produce strong units — invest early for a mid-game spike.",
  "Towers near the enemy spawn point delay their advance. Build forward.",
  "Scaling difficulty makes later waves brutal — push your wave record early.",
  "Alliance matches share resources. Coordinate unit types with your ally.",
];

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export interface MapSize {
  label: string;
  width: number;
  height: number;
}

const BASE_W = BalanceConfig.GRID_WIDTH;
const BASE_H = BalanceConfig.GRID_HEIGHT;

export const MAP_SIZES: MapSize[] = [
  { label: t("map.standard"), width: BASE_W, height: BASE_H },
  { label: t("map.double"), width: BASE_W * 2, height: BASE_H * 2 },
  { label: t("map.triple"), width: BASE_W * 3, height: BASE_H * 3 },
  { label: t("map.quadruple"), width: BASE_W * 4, height: BASE_H * 4 },
  { label: t("map.quintuple"), width: BASE_W * 5, height: BASE_H * 5 },
];

interface MapTypeEntry {
  type: MapType;
  label: string;
  locked?: boolean;
}

const MAP_TYPES: MapTypeEntry[] = [
  { type: MapType.MEADOW, label: t("map.meadow") },
  { type: MapType.GRASS, label: t("map.grass") },
  { type: MapType.PLAINS, label: t("map.plains") },
  { type: MapType.FOREST, label: t("map.forest") },
  { type: MapType.FANTASIA, label: t("map.fantasia") },
  { type: MapType.TUNDRA, label: t("map.tundra") },
  { type: MapType.SWAMP, label: t("map.swamp") },
  { type: MapType.VOLCANIC, label: t("map.volcanic") },
  { type: MapType.OCEAN, label: t("map.ocean") },
  { type: MapType.HILLS, label: t("map.hills") },
  { type: MapType.MOUNTAINS, label: t("map.mountains") },
  { type: MapType.DESERT, label: t("map.desert") },
];

interface GameModeEntry {
  mode: GameMode;
  label: string;
  desc: string;
  disabled?: boolean;
  /** If true, clicking goes straight to onContinue (skips setup screen). */
  skipSetup?: boolean;
  /** If true, hide player count / alliance section on setup screen. */
  hidePlayerSetup?: boolean;
  /** Badge tag shown on tile (e.g. "3D", "FPS", "NEW") */
  tag?: string;
}

const GAME_MODES: GameModeEntry[] = [
  {
    mode: GameMode.CAMPAIGN,
    label: t("mode.campaign"),
    desc: t("mode.campaign_desc"),
    skipSetup: true,
  },
  { mode: GameMode.STANDARD, label: t("mode.standard"), desc: t("mode.standard_desc") },
  { mode: GameMode.DEATHMATCH, label: t("mode.skirmish"), desc: t("mode.skirmish_desc") },
  {
    mode: GameMode.BATTLEFIELD,
    label: t("mode.battlefield"),
    desc: t("mode.battlefield_desc"),
    hidePlayerSetup: true,
  },

  {
    mode: GameMode.WORLD,
    label: t("mode.world"),
    desc: t("mode.world_desc"),
    skipSetup: true,
  },
  {
    mode: GameMode.WAVE,
    label: t("mode.wave"),
    desc: t("mode.wave_desc"),
    hidePlayerSetup: true,
  },
  {
    mode: GameMode.RPG,
    label: t("mode.rpg"),
    desc: t("mode.rpg_desc"),
    skipSetup: true,
  },
  {
    mode: GameMode.SURVIVOR,
    label: t("mode.survivor"),
    desc: t("mode.survivor_desc"),
    skipSetup: true,
  },
  {
    mode: GameMode.COLOSSEUM,
    label: t("mode.colosseum"),
    desc: t("mode.colosseum_desc"),
    skipSetup: true,
  },
  {
    mode: GameMode.DUEL,
    label: t("mode.duel"),
    desc: t("mode.duel_desc"),
    skipSetup: true,
  },
  {
    mode: GameMode.MEDIEVAL_GTA,
    label: "MEDIEVAL GTA",
    desc: "Open-world Camelot sandbox",
    skipSetup: true,
  },
  {
    mode: GameMode.WARBAND,
    label: "WARBAND",
    desc: "Mount & Blade style 3D combat",
    skipSetup: true,
    tag: "3D",
  },
  {
    mode: GameMode.TEKKEN,
    label: "FIGHTER",
    desc: "Tekken-style 3D fighting game",
    skipSetup: true,
    tag: "3D",
  },
  {
    mode: GameMode.DRAGOON,
    label: "DRAGOON",
    desc: "Panzer Dragoon: Arthur & the White Eagle",
    skipSetup: true,
  },
  {
    mode: GameMode.THREE_DRAGON,
    label: "3DRAGON",
    desc: "3D Panzer Dragoon: soar through stunning skies",
    skipSetup: true,
    tag: "3D",
  },
  {
    mode: GameMode.MEDIEVAL_GTA_3D,
    label: "GTA 3D",
    desc: "3D Medieval GTA: steal horses in Camelot",
    skipSetup: true,
    tag: "3D",
  },
  {
    mode: GameMode.DIABLO,
    label: "DIABLO",
    desc: "3D ARPG: loot, skills & glory in dark medieval lands",
    skipSetup: true,
    tag: "3D",
  },
  {
    mode: GameMode.MAGE_WARS,
    label: "MAGE WARS",
    desc: "FPS: arcane warfare with wands, mounts & dragons",
    skipSetup: true,
    tag: "FPS",
  },
  {
    mode: GameMode.GAME,
    label: "GAME",
    desc: "Quest for the Grail: Arthurian roguelike dungeon crawler",
    skipSetup: true,
  },
  {
    mode: GameMode.GRAIL_BALL,
    label: "GRAIL BALL",
    desc: "3D medieval fantasy sports — score with the holy orb",
    skipSetup: true,
    tag: "3D",
  },
  {
    mode: GameMode.GRAIL_MANAGER,
    label: "GRAIL MANAGER",
    desc: "Medieval football manager — lead your team to glory",
    skipSetup: true,
  },
  {
    mode: GameMode.ARTHURIAN_RPG,
    label: "ARTHURIAN RPG",
    desc: "Skyrim-style 3D RPG — the Quest for the Holy Grail",
    skipSetup: true,
    tag: "3D",
  },
  {
    mode: GameMode.RIFT_WIZARD,
    label: "RIFT WIZARD",
    desc: "Turn-based tactical roguelike — 25 levels of spell mastery",
    skipSetup: true,
  },
  {
    mode: GameMode.SETTLERS,
    label: "SETTLERS",
    desc: "3D Settlers II — roads, carriers & production chains",
    skipSetup: true,
    tag: "3D",
  },
  {
    mode: GameMode.CAESAR,
    label: "MEDIEVAL CAESAR",
    desc: "Caesar-style city builder — grow a medieval town, evolve housing, please the King",
    skipSetup: true,
  },
  {
    mode: GameMode.CAMELOT_CRAFT,
    label: "CAMELOT CRAFT",
    desc: "Minecraft-style voxel sandbox — build Camelot, seek the Grail",
    skipSetup: true,
    tag: "3D",
  },
  {
    mode: GameMode.EAGLE_FLIGHT,
    label: "EAGLE FLIGHT",
    desc: "Merlin soars on an eagle over the city of Camelot — flight simulator",
    skipSetup: true,
  },
  {
    mode: GameMode.TERRARIA,
    label: "CAMELOT DIG",
    desc: "2D sandbox — dig deep, build Camelot, seek the Holy Grail underground",
    skipSetup: true,
  },
  {
    mode: GameMode.CIVILIZATION,
    label: "ARTHURIAN CIV",
    desc: "Civ 2-style 4X strategy — build an Arthurian kingdom, research lore, seek the Holy Grail",
    skipSetup: true,
  },
  {
    mode: GameMode.MORGAN,
    label: "MORGAN",
    desc: "3D stealth-sorcery — play as Morgan le Fay, infiltrate Mordred's castle with dark magic",
    skipSetup: true,
    tag: "3D",
  },
  {
    mode: GameMode.JOUSTING,
    label: "JOUSTING",
    desc: "Medieval jousting tournament — aim your lance, raise your shield, unseat 8 knights",
    skipSetup: true,
    tag: "3D",
  },
  {
    mode: GameMode.EXODUS,
    label: "EXODUS",
    desc: "Oregon Trail-style survival — lead your people to Avalon through perilous lands",
    skipSetup: true,
  },
  {
    mode: GameMode.CARAVAN,
    label: "CARAVAN",
    desc: "Escort & trade: protect your wagon, buy low sell high",
    skipSetup: true,
  },
  {
    mode: GameMode.COVEN,
    label: "COVEN",
    desc: "Dark magic: build your coven and unleash forbidden spells",
    skipSetup: true,
  },
  {
    mode: GameMode.WARBAND_CAMPAIGN,
    label: "WARBAND CAMPAIGN",
    desc: "Strategic campaign: lead your warband across the realm",
    skipSetup: true,
  },
  {
    mode: GameMode.SHADOWHAND,
    label: "SHADOWHAND",
    desc: "Stealth heist: plan the job, pick your crew, stick to the shadows",
    skipSetup: true,
  },
  {
    mode: GameMode.ALCHEMIST,
    label: "ALCHEMIST",
    desc: "Potion puzzle: match ingredients, brew potions, serve customers",
    skipSetup: true,
  },
  {
    mode: GameMode.SIEGE,
    label: "SIEGE",
    desc: "Tower defense: build towers, defend your castle from 10 waves",
    skipSetup: true,
  },
  {
    mode: GameMode.TAVERN,
    label: "TAVERN",
    desc: "Card game: play blackjack against medieval opponents for gold",
    skipSetup: true,
  },
  {
    mode: GameMode.HUNT,
    label: "HUNT",
    desc: "Archery: aim your bow, hunt prey in the medieval forest",
    skipSetup: true,
  },
  {
    mode: GameMode.RACE,
    label: "RACE",
    desc: "Horse racing: gallop, manage stamina, bet on victory",
    skipSetup: true,
  },
  {
    mode: GameMode.ROUND_TABLE,
    label: "ROUND TABLE",
    desc: "Slay the Spire-style roguelike deckbuilder — quest for the Holy Grail",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.CAMELOT_ASCENT,
    label: "CAMELOT ASCENT",
    desc: "Vertical platformer — climb the infinite tower, fight enemies, reach the Grail",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.GRAIL_BLOCKS,
    label: "GRAIL BLOCKS",
    desc: "Medieval Tetris — build the walls of Camelot, charge the Grail Power",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.GRAIL_DERBY,
    label: "GRAIL DERBY",
    desc: "Medieval horse racing — dodge obstacles, joust rivals, ride for the Grail",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.GRAIL_BREAKER,
    label: "GRAIL BREAKER",
    desc: "Medieval Arkanoid — smash castle walls with a flaming orb, collect power-ups",
    skipSetup: true,
  },
  {
    mode: GameMode.NECROMANCER,
    label: "NECROMANCER",
    desc: "Raise the dead! Dig corpses, reanimate chimera undead, fight holy crusaders",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.BARD,
    label: "BARD",
    desc: "Rhythm battle RPG — cast spells through music, defeat 5 bosses with your enchanted lute",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.LABYRINTH,
    label: "LABYRINTH",
    desc: "Shifting maze: collect relics, evade the Minotaur, escape before your torch dies",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.PLAGUE,
    label: "PLAGUE DOCTOR",
    desc: "Turn-based strategy: navigate a plague-ravaged city with perks, abilities, and mutations",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.PLAGUE_RT,
    label: "PLAGUE DOCTOR RT",
    desc: "Real-time action: treat houses, gather herbs, fight rats, survive the Black Death",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.PRINCE_CAMELOT,
    label: "PRINCE OF CAMELOT",
    desc: "Prince of Persia-style 2D platformer: fight through the castle to defeat Mordrath",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.PHANTOM,
    label: "PHANTOM",
    desc: "Stealth infiltration: sneak through procedural castle floors, avoid guards, collect relics, escape",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.CONJURER,
    label: "CONJURER",
    desc: "Bullet-hell spell arena: master 4 elements, survive 30 waves, chain combos, slay bosses",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.FLUX,
    label: "FLUX",
    desc: "Gravity arena: no weapons — place gravity wells to crash enemies together, redirect their shots",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.ECHO,
    label: "ECHO",
    desc: "Time-loop arena: record 12-second loops that replay as ghosts fighting alongside you",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.WYRM,
    label: "WYRM",
    desc: "Dragon snake roguelike: consume, evolve through blessings, fight waves of knights",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.VOID_KNIGHT,
    label: "VOID KNIGHT",
    desc: "Bullet-hell survivor: dash through spiral projectiles, collect orbs, build combos",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.LAST_FLAME,
    label: "LAST FLAME",
    desc: "Darkness survival: keep your candle lit, manage fuel, evade shadows in endless caverns",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.GRAVITON,
    label: "GRAVITON",
    desc: "Gravity manipulation: pull asteroids into orbit, fling them at approaching enemies",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.GRAIL_QUEST,
    label: "GRAIL QUEST",
    desc: "Roguelike dungeon crawler: descend 10 floors, fight monsters, find the Holy Grail",
    skipSetup: true,
  },
  {
    mode: GameMode.KOTH,
    label: "KING OF THE HILL",
    desc: "Seize the sacred hill! Hold it to score points, fight guardians, survive cataclysms",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.MERLIN_DUEL,
    label: "MERLIN'S DUEL",
    desc: "Duel rival wizards in magical combat",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.RUNEBLADE,
    label: "RUNEBLADE",
    desc: "Rune-enchanted melee combat: chain combos with Fire, Ice, Lightning & Shadow",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.CHRONOMANCER,
    label: "CHRONOMANCER",
    desc: "Time-manipulation combat: slow, rewind & warp time against waves of enemies",
    skipSetup: true,
    tag: "NEW",
  },
  {
    mode: GameMode.SHAPESHIFTER,
    label: "SHAPESHIFTER",
    desc: "Transform between Wolf, Eagle & Bear forms — each with unique combat abilities",
    skipSetup: true,
    tag: "NEW",
  },
  { mode: GameMode.VOIDWALKER, label: "VOIDWALKER", desc: "Place void portals to teleport, control space & devastate enemies with shadow magic", skipSetup: true, tag: "NEW" },
  { mode: GameMode.AGE_OF_WONDERS, label: "AGE OF WONDERS", desc: "3D hex strategy: lead heroes, recruit armies, cast spells, conquer the realm or find the Holy Grail", skipSetup: true, tag: "NEW" },
  { mode: GameMode.LANCELOT, label: "LANCELOT", desc: "3D souls-like sword combat: duel 8 deadly knights in a torch-lit arena with parries, dodges & ripostes", skipSetup: true, tag: "NEW" },
  { mode: GameMode.SEWER_SPLASH, label: "SEWER SPLASH", desc: "3D endless sewer surfer: ride the sewers beneath Camelot as a rat king — dodge, collect, fight bosses", skipSetup: true, tag: "NEW" },
  { mode: GameMode.LAKE_OF_AVALON, label: "LAKE OF AVALON", desc: "3D mystical lake combat: pilot an enchanted skiff, cast spells at rising horrors, collect runes, seek Excalibur", skipSetup: true, tag: "NEW" },
  { mode: GameMode.TREBUCHET, label: "TREBUCHET", desc: "3D siege defense: man the trebuchet atop Camelot's walls, rain boulders & fire on invading armies, upgrade between waves", skipSetup: true, tag: "NEW" },
  { mode: GameMode.GRAIL_KEEPER, label: "GRAIL KEEPER", desc: "3D orbital arena: orbit the Holy Grail as a spectral guardian, fire holy bolts at converging demons from every direction", skipSetup: true, tag: "NEW" },
  { mode: GameMode.LOT, label: "LOT", desc: "Draw lots to face random 3D arena challenges — monster waves, boss fights, obstacle gauntlets & treasure hunts", skipSetup: true, tag: "NEW" },
  { mode: GameMode.GUINEVERE, label: "GUINEVERE", desc: "Tend an astral garden in the starlit void — plant magical flora, defend from void creatures, harvest starlight essence", skipSetup: true, tag: "3D" },
  { mode: GameMode.FOREST, label: "FOREST OF CAMELOT", desc: "Defend the Great Oak as the Green Knight — wield nature magic, command the seasons, fight the Blight across sacred groves", skipSetup: true, tag: "NEW" },
  { mode: GameMode.PENDULUM, label: "PENDULUM", desc: "Guard the Clock Tower as the Clockwork Knight — wield chrono-magic, ride the pendulum's rhythm, freeze time itself against automaton hordes", skipSetup: true, tag: "NEW" },
  { mode: GameMode.LEVIATHAN, label: "LEVIATHAN", desc: "Descend into a sunken cathedral beneath the ocean — recover Excalibur fragments, fight bioluminescent horrors, manage oxygen in the crushing deep", skipSetup: true, tag: "3D" },
  { mode: GameMode.CHARIOT, label: "CHARIOT", desc: "3D chariot racing — 5 tracks, power-ups, drifting & tournament", skipSetup: true, tag: "3D" },
  { mode: GameMode.BEARING, label: "BEARING", desc: "3D compass navigation — find sacred waypoints before sunset", skipSetup: true, tag: "3D" },
  { mode: GameMode.MATRIX, label: "MATRIX", desc: "3D bullet-time arena — dodge, deflect & chain combos in slow-motion", skipSetup: true, tag: "3D" },
  { mode: GameMode.KNIGHT_BALL, label: "KNIGHT BALL", desc: "3D medieval arena sport — 2v2 armored knights battle to score goals with kicks, tackles & shield bashes in a torch-lit stadium", skipSetup: true, tag: "3D" },
  { mode: GameMode.EPSILON, label: "EPSILON", desc: "3D arcane arena survival — cast elemental spells from a floating platform to destroy waves of ethereal geometric entities", skipSetup: true, tag: "3D" },
  { mode: GameMode.GRAND, label: "GRAND", desc: "3D medieval chariot grand prix — race armored war chariots around a floating sky track, collect power-ups, and battle for the Grail Cup", skipSetup: true, tag: "3D" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function makeActionBtn(
  w: number,
  h: number,
  label: string,
  fillColor: number,
  strokeColor: number,
  textColor: number,
  onClick: () => void,
): Container {
  const btn = new Container();
  btn.eventMode = "static";
  btn.cursor = "pointer";

  const bg = new Graphics()
    .roundRect(0, 0, w, h, 6)
    .fill({ color: fillColor })
    .roundRect(0, 0, w, h, 6)
    .stroke({ color: strokeColor, width: 2 });
  btn.addChild(bg);

  const lbl = new Text({
    text: label,
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 14,
      fill: textColor,
      fontWeight: "bold",
      letterSpacing: 2,
    }),
  });
  lbl.anchor.set(0.5, 0.5);
  lbl.position.set(w / 2, h / 2);
  btn.addChild(lbl);

  const hoverTint = textColor;
  btn.on("pointerover", () => { bg.tint = hoverTint; });
  btn.on("pointerout", () => { bg.tint = 0xffffff; });
  btn.on("pointerdown", onClick);

  return btn;
}

// ---------------------------------------------------------------------------
// MenuScreen
// ---------------------------------------------------------------------------

export class MenuScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _particles!: AmbientParticles;
  private _runes1!: RuneCorners;
  private _runes2!: RuneCorners;

  // --- Screen 1: mode select ---
  private _screen1!: Container;
  private _screen1Card!: Container;
  private _screen1CardW = 820;
  private _screen1CardH = 0; // computed
  private _scrollY = 0;
  private _onWheel: ((e: WheelEvent) => void) | null = null;

  // --- Screen 2: match setup ---
  private _screen2!: Container;
  private _screen2Card!: Container;
  private _screen2CardW = 400;
  private _screen2CardH = 0; // computed
  private _screen2PlayerSection!: Container;

  // State
  private _p2IsAI = true;
  private _aiToggleBg!: Graphics;
  private _aiToggleLabel!: Text;

  private _damageNumbers = true;
  private _dmgToggleBg!: Graphics;
  private _dmgToggleLabel!: Text;

  private _selectedDifficultyIndex = 1; // NORMAL
  private _difficultyBtns: Array<{ bg: Graphics; label: Text }> = [];

  private _selectedTypeIndex = 0;
  private _typeBtns: Array<{ bg: Graphics; label: Text; locked: boolean }> = [];

  private _selectedSizeIndex = 0;
  private _sizeBtns: Array<{ bg: Graphics; label: Text }> = [];

  private _selectedModeIndex = 0;

  private _playerCount = 2;
  private _p3Allied = false;
  private _p4Allied = false;
  private _playerCountBtns: Array<{ bg: Graphics; label: Text }> = [];
  private _p3AllyContainer!: Container;
  private _p3AllyBg!: Graphics;
  private _p3AllyLabel!: Text;
  private _p4AllyContainer!: Container;
  private _p4AllyBg!: Graphics;
  private _p4AllyLabel!: Text;

  // Grail Greed Corruption toggle (wave mode only)
  private _grailGreed = false;
  private _grailGreedSection!: Container;
  private _grailGreedBg!: Graphics;
  private _grailGreedLabel!: Text;

  // Random Events toggle (wave mode only)
  private _randomEvents = false;
  private _randomEventsSection!: Container;
  private _randomEventsBg!: Graphics;
  private _randomEventsLabel!: Text;

  // Scaling Difficulty toggle (wave mode only)
  private _scalingDifficulty = false;
  private _scalingDifficultySection!: Container;
  private _scalingDifficultyBg!: Graphics;
  private _scalingDifficultyLabel!: Text;

  // Boss Waves toggle (wave mode only)
  private _bossWaves = false;
  private _bossWavesSection!: Container;
  private _bossWavesBg!: Graphics;
  private _bossWavesLabel!: Text;

  private _waveIntro = true;
  private _waveIntroSection!: Container;
  private _waveIntroBg!: Graphics;
  private _waveIntroLabel!: Text;

  // Wave high-score panel (sibling to _screen2Card, shown for wave mode)
  private _waveHSPanel!: Container;
  private _waveHintIndex = 0;

  // Battlefield gold
  private _battlefieldGold = 30000;
  private _battlefieldGoldSection!: Container;
  private _battlefieldGoldLabel!: Text;

  // Dynamic load wave button area (rebuilt on show)
  private _loadWaveBtnSlot!: Container;
  private _loadWaveBtnSlotY = 0;
  private _s1SettingsBtn!: Container;
  private _s1BackMapBtn!: Container;
  private _s1UtilBtnH = 0;
  private _s1UtilGap = 0;

  // Keyboard navigation — screen 1
  private _s1NavItems: Array<{ container: Container; action: () => void }> = [];
  private _s1FocusIndex = 0;
  private _s1FocusBorder!: Graphics;
  private _onKeydown: ((e: KeyboardEvent) => void) | null = null;

  // Animated decorations (screen 1)
  private _s1GlowGfx!: Graphics;
  private _s1GlowPhase = 0;
  private _s1ArcaneGfx!: Graphics;
  private _s1ArcanePhase = 0;
  private _s1InnerFrame!: Graphics;
  private _s1DragonSprite: Sprite | null = null;

  // Building renderer decoration (castle on screen 1)
  private _buildingRenderer: House1Renderer | null = null;
  private _buildingContainer!: Container;
  private _buildingPreviewGfx!: Graphics;

  // ── Enhanced decorations ──
  private _bgHexGrid!: Graphics;
  private _hexCellCount = 0;
  private _floatingPolys!: Container;
  private _floatingPolyData: { gfx: Graphics; x: number; y: number; vx: number; vy: number; rot: number; rs: number }[] = [];
  private _polyCountText!: Text;
  private _scanContainer!: Container;
  private _scanPhase = 0;
  private _cornerMiniCircles: Graphics[] = [];
  private _cornerMiniPhases = [0, 0, 0, 0];
  private _vignetteGfx!: Graphics;
  private _titleText!: Text;
  private _titleGlowText!: Text;
  private _titleGlowPhase = 0;
  private _tickerContainer!: Container;
  private _tickerText!: Text;
  private _tickerX = 0;
  private _sidePillarLeft!: Container;
  private _sidePillarRight!: Container;

  // Callbacks
  onAIToggle: ((isAI: boolean) => void) | null = null;
  onContinue: (() => void) | null = null;
  onQuickPlay: (() => void) | null = null;
  onWiki: (() => void) | null = null;
  onMultiplayer: (() => void) | null = null;
  onLoadWorldGame: (() => void) | null = null;
  onLoadWaveGame: (() => void) | null = null;
  hasWaveSave = false;
  onSettings: (() => void) | null = null;
  onBackToMap: (() => void) | null = null;

  // Public getters (unchanged API)
  get selectedMapSize(): MapSize {
    return MAP_SIZES[this._selectedSizeIndex];
  }
  get selectedMapType(): MapType {
    return MAP_TYPES[this._selectedTypeIndex].type;
  }
  get selectedGameMode(): GameMode {
    return GAME_MODES[this._selectedModeIndex].mode;
  }
  get damageNumbersEnabled(): boolean {
    return this._damageNumbers;
  }
  get selectedPlayerCount(): number {
    return this._playerCount;
  }
  get alliedPlayerIds(): string[] {
    const allies: string[] = [];
    if (this._playerCount >= 3 && this._p3Allied) allies.push("p3");
    if (this._playerCount >= 4 && this._p4Allied) allies.push("p4");
    return allies;
  }
  get grailGreedEnabled(): boolean {
    return this._grailGreed;
  }
  get randomEventsEnabled(): boolean {
    return this._randomEvents;
  }
  get scalingDifficultyEnabled(): boolean {
    return this._scalingDifficulty;
  }
  get bossWavesEnabled(): boolean {
    return this._bossWaves;
  }
  get waveIntroEnabled(): boolean {
    return this._waveIntro;
  }
  get battlefieldGold(): number {
    return this._battlefieldGold;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    // Radial vignette overlay for depth
    this._vignetteGfx = new Graphics();
    this.container.addChild(this._vignetteGfx);

    // Hexagonal grid background
    this._bgHexGrid = new Graphics();
    this.container.addChild(this._bgHexGrid);

    // Ambient floating particles
    this._particles = new AmbientParticles(160);
    this.container.addChild(this._particles.container);

    // Floating polygon decorations
    this._floatingPolys = new Container();
    this.container.addChild(this._floatingPolys);
    this._initFloatingPolygons();

    this._buildScreen1();
    this._buildScreen2();

    // Start on screen 1
    this._screen2.visible = false;

    vm.addToLayer("ui", this.container);
    this._layout();
    vm.app.renderer.on("resize", () => this._layout());
    vm.app.ticker.add((ticker) => {
      if (this.container.visible) {
        const dt = ticker.deltaMS / 1000;
        this._particles.update(dt);
        this._runes1.update(dt);
        this._runes2.update(dt);
        if (this._buildingRenderer && this._screen1.visible) {
          this._buildingRenderer.tick(dt, GamePhase.PREP);
        }
        if (this._s1ArcaneGfx && this._screen1?.visible) {
          this._s1ArcanePhase += dt * 0.12;
          this._s1ArcaneGfx.rotation = this._s1ArcanePhase;
        }
        if (this._s1GlowGfx && this._screen1?.visible) {
          this._s1GlowPhase += dt;
          this._s1GlowGfx.alpha = 0.15 + Math.sin(this._s1GlowPhase * 1.5) * 0.1;
        }
        // Animate floating polygons
        this._updateFloatingPolygons(dt);
        // Animate scan line
        if (this._scanContainer && this._screen1?.visible) {
          this._scanPhase += dt * 0.08;
          const scanY = ((this._scanPhase * this._screen1CardH) % (this._screen1CardH + 60)) - 30;
          this._scanContainer.y = scanY;
          this._scanContainer.alpha = (scanY > 10 && scanY < this._screen1CardH - 10) ? 0.04 : 0;
        }
        // Animate corner mini circles
        for (let i = 0; i < 4; i++) {
          this._cornerMiniPhases[i] += dt * (0.18 + i * 0.06);
          if (this._cornerMiniCircles[i]) {
            this._cornerMiniCircles[i].rotation = this._cornerMiniPhases[i];
          }
        }
        // Title shimmer
        this._titleGlowPhase += dt;
        if (this._titleGlowText) {
          this._titleGlowText.alpha = 0.25 + Math.sin(this._titleGlowPhase * 2.0) * 0.2;
          this._titleGlowText.scale.set(1.0 + Math.sin(this._titleGlowPhase * 1.5) * 0.008);
        }
        // Scrolling ticker
        if (this._tickerText && this._screen1?.visible) {
          this._tickerX -= dt * 40;
          const halfW = this._tickerText.width / 2;
          if (this._tickerX < -halfW) this._tickerX += halfW;
          this._tickerText.x = this._tickerX;
        }
      }
    });
  }

  show(): void {
    this.container.visible = true;
    this._rebuildLoadWaveButton();
    this._showScreen1();
  }

  hide(): void {
    this.container.visible = false;
  }

  /** Rebuild the load-wave-game button dynamically based on current hasWaveSave. */
  private _rebuildLoadWaveButton(): void {
    // Remove old nav item for the wave load button (filter it out)
    this._s1NavItems = this._s1NavItems.filter(
      (item) => !this._loadWaveBtnSlot.children.includes(item.container),
    );
    this._loadWaveBtnSlot.removeChildren();

    const CW = this._screen1CardW;
    const padX = 24;
    const btn2W = Math.floor((CW - padX * 2 - this._s1UtilGap) / 2);
    let bottomY = this._loadWaveBtnSlotY;

    if (this.hasWaveSave) {
      const loadW = CW - padX * 2;
      const loadWaveBtn = makeActionBtn(loadW, this._s1UtilBtnH, "LOAD WAVE GAME", 0x1a2a2a, 0x44aaaa, 0x88ffff, () => this.onLoadWaveGame?.());
      loadWaveBtn.position.set(padX, bottomY);
      this._loadWaveBtnSlot.addChild(loadWaveBtn);
      this._s1NavItems.push({ container: loadWaveBtn, action: () => this.onLoadWaveGame?.() });
      bottomY += this._s1UtilBtnH + this._s1UtilGap;
    }

    // Reposition settings and back-to-map buttons (side by side)
    this._s1SettingsBtn.position.set(padX, bottomY);
    this._s1BackMapBtn.position.set(padX + btn2W + this._s1UtilGap, bottomY);
    bottomY += this._s1UtilBtnH + this._s1UtilGap;

    this._screen1CardH = bottomY + 18;

    const bg = this._screen1Card.getChildAt(0) as Graphics;
    bg.clear();
    bg.roundRect(0, 0, CW, this._screen1CardH, 10)
      .fill({ color: 0x10102a, alpha: 0.95 })
      .roundRect(0, 0, CW, this._screen1CardH, 10)
      .stroke({ color: BORDER_COLOR, alpha: 0.35, width: 2 });

    // Redraw inner frame and glow
    this._drawS1InnerFrame(CW, this._screen1CardH);
    this._s1GlowGfx.clear();
    this._s1GlowGfx.roundRect(-1, -1, CW + 2, this._screen1CardH + 2, 11)
      .stroke({ color: BORDER_COLOR, alpha: 1, width: 1.5 });

    // Reposition dragon watermark
    if (this._s1DragonSprite) {
      this._s1DragonSprite.position.set(CW / 2, this._screen1CardH * 0.45);
    }

    this._runes1.build(CW, this._screen1CardH);
  }

  // ---------------------------------------------------------------------------
  // Screen 1 — Mode Select
  // ---------------------------------------------------------------------------

  private _showScreen1(): void {
    this._screen1.visible = true;
    this._screen2.visible = false;
    this._s1FocusBorder.visible = false;
    this._scrollY = 0;
    this._layout();
  }

  private _showScreen2(): void {
    this._screen1.visible = false;
    this._screen2.visible = true;

    // Show/hide player section based on mode
    const entry = GAME_MODES[this._selectedModeIndex];
    this._screen2PlayerSection.visible = !entry.hidePlayerSetup;

    // Show/hide Grail Greed toggle (wave mode only)
    this._grailGreedSection.visible = entry.mode === GameMode.WAVE;
    this._randomEventsSection.visible = entry.mode === GameMode.WAVE;
    this._scalingDifficultySection.visible = entry.mode === GameMode.WAVE;
    this._bossWavesSection.visible = entry.mode === GameMode.WAVE;
    this._waveIntroSection.visible = entry.mode === GameMode.WAVE;

    // Show battlefield gold section
    this._battlefieldGoldSection.visible = entry.mode === GameMode.BATTLEFIELD;

    // Wave high-score panel
    const isWave = entry.mode === GameMode.WAVE;
    this._waveHSPanel.visible = isWave;
    if (isWave) this._buildWaveHSContent();

    this._layout();
  }

  private _buildScreen1(): void {
    const CW = this._screen1CardW; // 820
    const padX = 24;
    const hcx = CW / 2;
    this._screen1 = new Container();
    this.container.addChild(this._screen1);

    const card = makePanel(CW, 600); // will resize at bottom
    this._screen1.addChild(card);
    this._screen1Card = card;

    // ── DRAGON WATERMARK ─────────────────────────────────────
    const dragonSprite = Sprite.from(dragonImgUrl);
    dragonSprite.anchor.set(0.5, 0.5);
    dragonSprite.position.set(hcx, 320);
    dragonSprite.alpha = 0.035;
    dragonSprite.scale.set(0.9);
    dragonSprite.tint = BORDER_COLOR;
    card.addChild(dragonSprite);
    this._s1DragonSprite = dragonSprite;

    // ── ARCANE CIRCLE (animated rotation) ────────────────────
    const arcaneGfx = new Graphics();
    this._s1ArcaneGfx = arcaneGfx;
    const arcR = 85;
    // Outer ring
    arcaneGfx.circle(0, 0, arcR).stroke({ color: BORDER_COLOR, alpha: 0.06, width: 1 });
    // Middle ring
    arcaneGfx.circle(0, 0, arcR * 0.72).stroke({ color: BORDER_COLOR, alpha: 0.08, width: 0.8 });
    // Inner ring
    arcaneGfx.circle(0, 0, arcR * 0.42).stroke({ color: BORDER_COLOR, alpha: 0.1, width: 0.5 });
    // 24 tick marks around outer ring
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI * 2) / 24;
      const r1 = arcR - (i % 6 === 0 ? 8 : 4);
      arcaneGfx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1)
        .lineTo(Math.cos(a) * arcR, Math.sin(a) * arcR)
        .stroke({ color: BORDER_COLOR, alpha: i % 6 === 0 ? 0.12 : 0.06, width: 0.5 });
    }
    // Hexagon inscribed in middle ring
    for (let i = 0; i < 6; i++) {
      const a1 = (i * Math.PI) / 3;
      const a2 = ((i + 1) * Math.PI) / 3;
      const hr = arcR * 0.58;
      arcaneGfx.moveTo(Math.cos(a1) * hr, Math.sin(a1) * hr)
        .lineTo(Math.cos(a2) * hr, Math.sin(a2) * hr)
        .stroke({ color: BORDER_COLOR, alpha: 0.05, width: 0.5 });
    }
    // Triangle inscribed
    for (let i = 0; i < 3; i++) {
      const a1 = (i * Math.PI * 2) / 3 - Math.PI / 2;
      const a2 = ((i + 1) * Math.PI * 2) / 3 - Math.PI / 2;
      const tr = arcR * 0.68;
      arcaneGfx.moveTo(Math.cos(a1) * tr, Math.sin(a1) * tr)
        .lineTo(Math.cos(a2) * tr, Math.sin(a2) * tr)
        .stroke({ color: BORDER_COLOR, alpha: 0.04, width: 0.5 });
    }
    // Cardinal cross lines
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      arcaneGfx.moveTo(Math.cos(a) * arcR * 0.2, Math.sin(a) * arcR * 0.2)
        .lineTo(Math.cos(a) * arcR * 0.68, Math.sin(a) * arcR * 0.68)
        .stroke({ color: BORDER_COLOR, alpha: 0.06, width: 0.5 });
    }
    // Small dots at cardinal points on outer ring
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      arcaneGfx.circle(Math.cos(a) * arcR, Math.sin(a) * arcR, 2)
        .fill({ color: BORDER_COLOR, alpha: 0.15 });
    }
    arcaneGfx.position.set(hcx, 52);
    card.addChild(arcaneGfx);

    // ── SHIELD / CROWN CREST above title ─────────────────────
    const crestGfx = new Graphics();
    // Shield shape
    const sx = hcx, sy = 18;
    crestGfx.moveTo(sx, sy - 12).lineTo(sx + 14, sy - 6).lineTo(sx + 12, sy + 8)
      .lineTo(sx, sy + 16).lineTo(sx - 12, sy + 8).lineTo(sx - 14, sy - 6).closePath()
      .fill({ color: BORDER_COLOR, alpha: 0.06 })
      .stroke({ color: BORDER_COLOR, alpha: 0.2, width: 1 });
    // Inner shield
    crestGfx.moveTo(sx, sy - 7).lineTo(sx + 9, sy - 3).lineTo(sx + 8, sy + 5)
      .lineTo(sx, sy + 11).lineTo(sx - 8, sy + 5).lineTo(sx - 9, sy - 3).closePath()
      .fill({ color: BORDER_COLOR, alpha: 0.08 })
      .stroke({ color: BORDER_COLOR, alpha: 0.15, width: 0.5 });
    // Crown points on top
    for (const dx of [-8, 0, 8]) {
      crestGfx.moveTo(sx + dx - 3, sy - 12).lineTo(sx + dx, sy - 18).lineTo(sx + dx + 3, sy - 12)
        .fill({ color: BORDER_COLOR, alpha: 0.2 });
    }
    // Crown jewels (tiny dots)
    for (const dx of [-8, 0, 8]) {
      crestGfx.circle(sx + dx, sy - 16, 1.2).fill({ color: 0xfff8e0, alpha: 0.5 });
    }
    // Cross on shield center
    crestGfx.moveTo(sx - 5, sy).lineTo(sx + 5, sy).stroke({ color: BORDER_COLOR, alpha: 0.15, width: 0.5 });
    crestGfx.moveTo(sx, sy - 5).lineTo(sx, sy + 5).stroke({ color: BORDER_COLOR, alpha: 0.15, width: 0.5 });
    card.addChild(crestGfx);

    // ── ORNATE HEADER ────────────────────────────────────────
    const headerGfx = new Graphics();
    // Left ornamental double-line
    headerGfx.moveTo(30, 29).lineTo(hcx - 140, 29)
      .stroke({ color: BORDER_COLOR, alpha: 0.2, width: 1 });
    headerGfx.moveTo(40, 32).lineTo(hcx - 130, 32)
      .stroke({ color: BORDER_COLOR, alpha: 0.1, width: 0.5 });
    // Right ornamental double-line
    headerGfx.moveTo(hcx + 140, 29).lineTo(CW - 30, 29)
      .stroke({ color: BORDER_COLOR, alpha: 0.2, width: 1 });
    headerGfx.moveTo(hcx + 130, 32).lineTo(CW - 40, 32)
      .stroke({ color: BORDER_COLOR, alpha: 0.1, width: 0.5 });
    // End-cap diamonds
    for (const dx of [30, CW - 30]) {
      headerGfx.moveTo(dx, 25).lineTo(dx + 4, 30).lineTo(dx, 35).lineTo(dx - 4, 30).closePath()
        .fill({ color: BORDER_COLOR, alpha: 0.25 })
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 0.5 });
    }
    // Intermediate diamonds along the lines
    for (const dx of [80, 160, CW - 80, CW - 160]) {
      headerGfx.moveTo(dx, 28).lineTo(dx + 2, 30).lineTo(dx, 32).lineTo(dx - 2, 30).closePath()
        .fill({ color: BORDER_COLOR, alpha: 0.12 });
    }
    // Center diamond cluster
    headerGfx.moveTo(hcx, 19).lineTo(hcx + 10, 30).lineTo(hcx, 41).lineTo(hcx - 10, 30).closePath()
      .fill({ color: BORDER_COLOR, alpha: 0.3 })
      .stroke({ color: BORDER_COLOR, alpha: 0.6, width: 1 });
    headerGfx.moveTo(hcx, 24).lineTo(hcx + 5, 30).lineTo(hcx, 36).lineTo(hcx - 5, 30).closePath()
      .fill({ color: 0xfff8e0, alpha: 0.5 });
    headerGfx.circle(hcx, 30, 2).fill({ color: 0xffffff, alpha: 0.6 });
    card.addChild(headerGfx);

    // Title (with glow layer behind for shimmer)
    this._titleGlowText = new Text({ text: t("menu.select_mode"), style: new TextStyle({
      fontFamily: "monospace", fontSize: 26, fill: 0xffee88, fontWeight: "bold", letterSpacing: 6,
      dropShadow: { color: 0xffd700, blur: 16, distance: 0, alpha: 0.4 },
    }) });
    this._titleGlowText.anchor.set(0.5, 0);
    this._titleGlowText.position.set(hcx, 44);
    this._titleGlowText.alpha = 0.4;
    card.addChild(this._titleGlowText);

    this._titleText = new Text({ text: t("menu.select_mode"), style: new TextStyle({
      fontFamily: "monospace", fontSize: 26, fill: 0xffd700, fontWeight: "bold", letterSpacing: 6,
      dropShadow: { color: 0x000000, blur: 8, distance: 0, alpha: 0.8 },
    }) });
    this._titleText.anchor.set(0.5, 0);
    this._titleText.position.set(hcx, 44);
    card.addChild(this._titleText);

    // Sub-flourish below title
    const subGfx = new Graphics();
    // Left decorative line with curve hints
    subGfx.moveTo(hcx - 160, 78).lineTo(hcx - 20, 78).stroke({ color: BORDER_COLOR, alpha: 0.18, width: 1 });
    subGfx.moveTo(hcx + 20, 78).lineTo(hcx + 160, 78).stroke({ color: BORDER_COLOR, alpha: 0.18, width: 1 });
    // Central ornament
    subGfx.moveTo(hcx, 74).lineTo(hcx + 4, 78).lineTo(hcx, 82).lineTo(hcx - 4, 78).closePath()
      .fill({ color: BORDER_COLOR, alpha: 0.35 });
    // Spaced dots along the lines
    for (const dx of [-140, -120, -100, -80, -60, -40, 40, 60, 80, 100, 120, 140]) {
      subGfx.circle(hcx + dx, 78, Math.abs(dx) > 100 ? 0.8 : 1).fill({ color: BORDER_COLOR, alpha: 0.12 });
    }
    // Wing-tip ornaments at line ends
    for (const sx of [-1, 1]) {
      const wx = hcx + sx * 160;
      subGfx.moveTo(wx, 76).lineTo(wx + sx * 4, 78).lineTo(wx, 80).closePath()
        .fill({ color: BORDER_COLOR, alpha: 0.15 });
    }
    card.addChild(subGfx);

    // ── INNER BORDER FRAME (drawn after card height known) ──
    this._s1InnerFrame = new Graphics();
    card.addChild(this._s1InnerFrame);

    // ── ANIMATED GLOW BORDER ─────────────────────────────────
    this._s1GlowGfx = new Graphics();
    this._s1GlowGfx.alpha = 0.15;
    card.addChild(this._s1GlowGfx);

    // ── CATEGORY GRID ────────────────────────────────────────
    // IMPORTANT: When adding a new game mode to MODE_BUTTONS above, you MUST
    // also add its index here in the appropriate category. Otherwise it won't
    // appear on the menu. The index is the position in the MODE_BUTTONS array
    // (0-based). Modes not listed in any category below will be invisible.
    const categories: { title: string; icon: string; color: number; accent: number; indices: number[] }[] = [
      { title: "STRATEGY & TACTICS", icon: "\u2694", color: 0xffd700, accent: 0x332a00, indices: [0, 1, 2, 3, 4, 28, 5, 6, 34, 37, 49, 50, 61] },
      { title: "ADVENTURE & RPG", icon: "\u{1F4DC}", color: 0x44ddaa, accent: 0x0a2a1a, indices: [7, 21, 18, 22, 8, 9, 10, 32, 33, 31, 35, 36, 38, 41, 42, 46, 47, 48, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 62, 63, 64, 65, 66] },
      { title: "3D ACTION & COMBAT", icon: "\u{1F6E1}", color: 0xff7744, accent: 0x2a1408, indices: [11, 15, 12, 13, 14, 16, 17, 29] },
      { title: "WORLDS & SPORTS", icon: "\u{1F30D}", color: 0x6699ff, accent: 0x0a1a2a, indices: [19, 20, 23, 24, 25, 26, 27, 30, 39, 40, 43, 44, 45] },
    ];

    const COLS = 4;
    const gapX = 8;
    const gapY = 5;
    const tileW = Math.floor((CW - padX * 2 - gapX * (COLS - 1)) / COLS);
    const tileH = 38;

    let curY = 72;
    this._s1NavItems = [];

    for (const cat of categories) {
      curY += 4;
      // ── Category ornamental header (compact) ──
      const catGfx = new Graphics();
      catGfx.roundRect(padX, curY + 4, 12, 3, 1.5).fill({ color: cat.color, alpha: 0.5 });
      const dOff = padX + 18;
      catGfx.moveTo(dOff, curY + 2).lineTo(dOff + 3, curY + 5.5).lineTo(dOff, curY + 9).lineTo(dOff - 3, curY + 5.5).closePath()
        .fill({ color: cat.color, alpha: 0.55 });
      card.addChild(catGfx);

      const catLabel = new Text({ text: `${cat.icon} ${cat.title}`, style: new TextStyle({
        fontFamily: "monospace", fontSize: 9, fill: cat.color, fontWeight: "bold", letterSpacing: 2,
      }) });
      catLabel.position.set(padX + 26, curY);
      card.addChild(catLabel);

      // Right-side ornamental line
      const rightLineStart = padX + 26 + (cat.icon.length + 1 + cat.title.length) * 7 + 10;
      const catLineRight = new Graphics();
      catLineRight.moveTo(rightLineStart, curY + 5.5).lineTo(CW - padX - 8, curY + 5.5)
        .stroke({ color: cat.color, alpha: 0.1, width: 1 });
      const rex = CW - padX - 4;
      catLineRight.moveTo(rex, curY + 2).lineTo(rex + 3, curY + 5.5).lineTo(rex, curY + 9).lineTo(rex - 3, curY + 5.5).closePath()
        .fill({ color: cat.color, alpha: 0.18 });
      card.addChild(catLineRight);

      curY += 18;

      // ── Tinted category section background ──
      const catRows = Math.ceil(cat.indices.length / COLS);
      const catSectionH = catRows * (tileH + gapY) - gapY;
      const catBgGfx = new Graphics();
      catBgGfx.roundRect(padX - 6, curY - 4, CW - padX * 2 + 12, catSectionH + 8, 6)
        .fill({ color: cat.accent, alpha: 0.35 });
      // Subtle border on the section bg
      catBgGfx.roundRect(padX - 6, curY - 4, CW - padX * 2 + 12, catSectionH + 8, 6)
        .stroke({ color: cat.color, alpha: 0.06, width: 1 });
      card.addChild(catBgGfx);

      // ── Mode tiles in grid ──
      for (let j = 0; j < cat.indices.length; j++) {
        const modeIdx = cat.indices[j];
        const entry = GAME_MODES[modeIdx];
        const col = j % COLS;
        const row = Math.floor(j / COLS);
        const tx = padX + col * (tileW + gapX);
        const ty = curY + row * (tileH + gapY);

        const tile = new Container();
        tile.eventMode = "static";
        tile.cursor = entry.disabled ? "default" : "pointer";
        tile.position.set(tx, ty);

        // Tile background
        const tileBg = new Graphics();
        tile.addChild(tileBg);

        // Top accent line (colored, with rounded ends)
        const accentGfx = new Graphics();
        tile.addChild(accentGfx);

        // Bottom accent line (thin)
        const bottomAccent = new Graphics();
        tile.addChild(bottomAccent);

        // Mode name
        const nameText = new Text({ text: entry.label, style: new TextStyle({
          fontFamily: "monospace", fontSize: 10, fill: 0xddddee, fontWeight: "bold", letterSpacing: 1,
        }) });
        nameText.anchor.set(0.5, 0);
        nameText.position.set(tileW / 2, 4);
        tile.addChild(nameText);

        // Description
        const descText = new Text({ text: entry.desc, style: new TextStyle({
          fontFamily: "monospace", fontSize: 7, fill: 0x556677, letterSpacing: 0.3,
          wordWrap: true, wordWrapWidth: tileW - 12,
        }) });
        descText.anchor.set(0.5, 0);
        descText.position.set(tileW / 2, 18);
        tile.addChild(descText);

        // Corner dots (tiny ornamental dots at tile corners)
        const cornerDots = new Graphics();
        for (const [cx, cy] of [[2, 2], [tileW - 2, 2], [2, tileH - 2], [tileW - 2, tileH - 2]]) {
          cornerDots.circle(cx, cy, 0.8).fill({ color: cat.color, alpha: 0.2 });
        }
        tile.addChild(cornerDots);

        // Tag badge (e.g. "3D", "FPS")
        if (entry.tag) {
          const tagContainer = new Container();
          const tagW = entry.tag.length * 6 + 6;
          const tagBg = new Graphics();
          tagBg.roundRect(0, 0, tagW, 10, 2)
            .fill({ color: cat.color, alpha: 0.2 })
            .roundRect(0, 0, tagW, 10, 2)
            .stroke({ color: cat.color, alpha: 0.5, width: 0.5 });
          tagContainer.addChild(tagBg);
          const tagTxt = new Text({ text: entry.tag, style: new TextStyle({
            fontFamily: "monospace", fontSize: 7, fill: cat.color, fontWeight: "bold", letterSpacing: 1,
          }) });
          tagTxt.anchor.set(0.5, 0.5);
          tagTxt.position.set(tagW / 2, 5);
          tagContainer.addChild(tagTxt);
          tagContainer.position.set(tileW - tagW - 3, 3);
          tile.addChild(tagContainer);
        }

        // Draw tile background based on state
        const catColor = cat.color;
        const drawTileBg = (state: "normal" | "hover" | "disabled") => {
          tileBg.clear();
          accentGfx.clear();
          bottomAccent.clear();
          cornerDots.alpha = 1;
          if (state === "disabled") {
            tileBg.roundRect(0, 0, tileW, tileH, 5)
              .fill({ color: 0x0d0d1a })
              .roundRect(0, 0, tileW, tileH, 5)
              .stroke({ color: 0x1a1a2a, width: 1 });
            nameText.style.fill = 0x445566;
            descText.style.fill = 0x334455;
            accentGfx.roundRect(4, 0, tileW - 8, 2, 1).fill({ color: 0x334455, alpha: 0.2 });
            cornerDots.alpha = 0.3;
          } else if (state === "hover") {
            // Outer glow rect
            tileBg.roundRect(-2, -2, tileW + 4, tileH + 4, 7)
              .fill({ color: catColor, alpha: 0.06 });
            tileBg.roundRect(0, 0, tileW, tileH, 5)
              .fill({ color: 0x1a2a3a })
              .roundRect(0, 0, tileW, tileH, 5)
              .stroke({ color: catColor, alpha: 0.85, width: 1.5 });
            // Inner glow
            tileBg.roundRect(2, 2, tileW - 4, tileH - 4, 3)
              .stroke({ color: catColor, alpha: 0.12, width: 1 });
            nameText.style.fill = 0xffffff;
            descText.style.fill = 0x99aabb;
            accentGfx.roundRect(2, 0, tileW - 4, 2, 1).fill({ color: catColor, alpha: 0.9 });
            bottomAccent.roundRect(6, tileH - 1, tileW - 12, 1, 0.5).fill({ color: catColor, alpha: 0.4 });
            cornerDots.alpha = 1;
          } else {
            tileBg.roundRect(0, 0, tileW, tileH, 5)
              .fill({ color: 0x12121e })
              .roundRect(0, 0, tileW, tileH, 5)
              .stroke({ color: 0x2a2a3a, width: 1 });
            nameText.style.fill = 0xddddee;
            descText.style.fill = 0x556677;
            accentGfx.roundRect(4, 0, tileW - 8, 2, 1).fill({ color: catColor, alpha: 0.4 });
            bottomAccent.roundRect(8, tileH - 1, tileW - 16, 1, 0.5).fill({ color: catColor, alpha: 0.1 });
          }
        };

        drawTileBg(entry.disabled ? "disabled" : "normal");

        if (!entry.disabled) {
          const idx = modeIdx;
          // Set pivot for scale-from-center effect
          tile.pivot.set(tileW / 2, tileH / 2);
          tile.position.set(tx + tileW / 2, ty + tileH / 2);
          tile.on("pointerover", () => {
            drawTileBg("hover");
            tile.scale.set(1.03);
          });
          tile.on("pointerout", () => {
            drawTileBg("normal");
            tile.scale.set(1.0);
          });
          tile.on("pointerdown", () => {
            this._selectedModeIndex = idx;
            if (entry.skipSetup) {
              this.onContinue?.();
            } else {
              this._showScreen2();
            }
          });

          this._s1NavItems.push({
            container: tile,
            action: () => {
              this._selectedModeIndex = idx;
              if (entry.skipSetup) {
                this.onContinue?.();
              } else {
                this._showScreen2();
              }
            },
          });
        }

        card.addChild(tile);
      }

      curY += catRows * (tileH + gapY);
    }

    // ── BOTTOM ORNAMENTAL DIVIDER ────────────────────────────
    curY += 6;
    const botDiv = new Graphics();
    // Main line
    botDiv.moveTo(padX, curY).lineTo(CW - padX, curY)
      .stroke({ color: BORDER_COLOR, alpha: 0.15, width: 1 });
    // Secondary thin line
    botDiv.moveTo(padX + 20, curY + 3).lineTo(CW - padX - 20, curY + 3)
      .stroke({ color: BORDER_COLOR, alpha: 0.06, width: 0.5 });
    // Center ornament: triple diamond
    botDiv.moveTo(hcx, curY - 7).lineTo(hcx + 7, curY).lineTo(hcx, curY + 7).lineTo(hcx - 7, curY).closePath()
      .fill({ color: BORDER_COLOR, alpha: 0.15 })
      .stroke({ color: BORDER_COLOR, alpha: 0.25, width: 0.5 });
    botDiv.moveTo(hcx, curY - 4).lineTo(hcx + 4, curY).lineTo(hcx, curY + 4).lineTo(hcx - 4, curY).closePath()
      .fill({ color: BORDER_COLOR, alpha: 0.3 });
    botDiv.circle(hcx, curY, 1.5).fill({ color: 0xffffff, alpha: 0.4 });
    // Side ornaments
    for (const sx of [-1, 1]) {
      for (const dx of [40, 70, 100]) {
        const ox = hcx + sx * dx;
        botDiv.circle(ox, curY, dx > 80 ? 0.8 : 1).fill({ color: BORDER_COLOR, alpha: 0.12 });
      }
      // Small side diamonds
      const sdx = hcx + sx * 130;
      botDiv.moveTo(sdx, curY - 3).lineTo(sdx + 3, curY).lineTo(sdx, curY + 3).lineTo(sdx - 3, curY).closePath()
        .fill({ color: BORDER_COLOR, alpha: 0.1 });
    }
    card.addChild(botDiv);
    curY += 18;

    // ── UTILITY SECTION HEADER ───────────────────────────────
    const utilHeader = new Graphics();
    const utilLabelText = new Text({ text: "ACTIONS", style: new TextStyle({
      fontFamily: "monospace", fontSize: 9, fill: 0x556677, fontWeight: "bold", letterSpacing: 4,
    }) });
    utilLabelText.anchor.set(0.5, 0);
    utilLabelText.position.set(hcx, curY);
    card.addChild(utilLabelText);
    // Lines flanking the label
    utilHeader.moveTo(padX, curY + 5).lineTo(hcx - 40, curY + 5)
      .stroke({ color: 0x334455, alpha: 0.3, width: 0.5 });
    utilHeader.moveTo(hcx + 40, curY + 5).lineTo(CW - padX, curY + 5)
      .stroke({ color: 0x334455, alpha: 0.3, width: 0.5 });
    card.addChild(utilHeader);
    curY += 16;

    // ── UTILITY BUTTONS ──────────────────────────────────────
    const utilBtnH = 28;
    const utilGap = 4;

    // Row 1: Wiki | Quickplay | Multiplayer (3 across)
    const btn3W = Math.floor((CW - padX * 2 - utilGap * 2) / 3);

    const wikiBtn = makeActionBtn(btn3W, utilBtnH, "WIKI", 0x1a1a3a, 0x4488cc, 0x88bbff, () => this.onWiki?.());
    wikiBtn.position.set(padX, curY);
    card.addChild(wikiBtn);
    this._s1NavItems.push({ container: wikiBtn, action: () => this.onWiki?.() });

    const qpBtn = makeActionBtn(btn3W, utilBtnH, "QUICKPLAY", 0x2a1a0a, 0xcc8833, 0xffcc66, () => this.onQuickPlay?.());
    qpBtn.position.set(padX + btn3W + utilGap, curY);
    card.addChild(qpBtn);
    this._s1NavItems.push({ container: qpBtn, action: () => this.onQuickPlay?.() });

    const mpBtn = makeActionBtn(btn3W, utilBtnH, "MULTIPLAYER", 0x1a1a3a, 0x6666cc, 0x9999ff, () => this.onMultiplayer?.());
    mpBtn.position.set(padX + (btn3W + utilGap) * 2, curY);
    card.addChild(mpBtn);
    this._s1NavItems.push({ container: mpBtn, action: () => this.onMultiplayer?.() });

    curY += utilBtnH + utilGap;

    // Row 2: Settings | Back to Map (2 across)
    const btn2W = Math.floor((CW - padX * 2 - utilGap) / 2);

    // Optional: Load World Game
    if (hasWorldSave()) {
      const loadBtn = makeActionBtn(CW - padX * 2, utilBtnH, "LOAD WORLD GAME", 0x2a2a1a, 0xaaaa44, 0xdddd66, () => this.onLoadWorldGame?.());
      loadBtn.position.set(padX, curY);
      card.addChild(loadBtn);
      this._s1NavItems.push({ container: loadBtn, action: () => this.onLoadWorldGame?.() });
      curY += utilBtnH + utilGap;
    }

    // Dynamic slot: Load Wave Game (rebuilt on show())
    this._loadWaveBtnSlot = new Container();
    this._loadWaveBtnSlotY = curY;
    this._loadWaveBtnSlot.position.set(0, 0);
    card.addChild(this._loadWaveBtnSlot);

    // Settings button (repositioned dynamically by _rebuildLoadWaveButton)
    const settingsBtn = makeActionBtn(btn2W, utilBtnH, "SETTINGS", 0x1a1a1a, 0x666666, 0xaaaaaa, () => this.onSettings?.());
    settingsBtn.position.set(padX, curY);
    card.addChild(settingsBtn);
    this._s1NavItems.push({ container: settingsBtn, action: () => this.onSettings?.() });

    // Back to Map button
    const backMapBtn = makeActionBtn(btn2W, utilBtnH, "\u25c0 BACK TO MAP", 0x1a2a1a, 0x55aa55, 0x88dd88, () => this.onBackToMap?.());
    backMapBtn.position.set(padX + btn2W + utilGap, curY);
    card.addChild(backMapBtn);
    this._s1NavItems.push({ container: backMapBtn, action: () => this.onBackToMap?.() });
    curY += utilBtnH + utilGap;

    // ── BOTTOM FLOURISH ──────────────────────────────────────
    const footGfx = new Graphics();
    // Double lines converging to center
    footGfx.moveTo(30, curY + 3).lineTo(hcx - 14, curY + 3)
      .stroke({ color: BORDER_COLOR, alpha: 0.15, width: 1 });
    footGfx.moveTo(hcx + 14, curY + 3).lineTo(CW - 30, curY + 3)
      .stroke({ color: BORDER_COLOR, alpha: 0.15, width: 1 });
    footGfx.moveTo(50, curY + 6).lineTo(hcx - 24, curY + 6)
      .stroke({ color: BORDER_COLOR, alpha: 0.06, width: 0.5 });
    footGfx.moveTo(hcx + 24, curY + 6).lineTo(CW - 50, curY + 6)
      .stroke({ color: BORDER_COLOR, alpha: 0.06, width: 0.5 });
    // Center diamond
    footGfx.moveTo(hcx, curY - 1).lineTo(hcx + 5, curY + 4).lineTo(hcx, curY + 9).lineTo(hcx - 5, curY + 4).closePath()
      .fill({ color: BORDER_COLOR, alpha: 0.2 });
    footGfx.circle(hcx, curY + 4, 1.5).fill({ color: BORDER_COLOR, alpha: 0.35 });
    // End dots
    for (const dx of [30, CW - 30]) {
      footGfx.circle(dx, curY + 3, 1.5).fill({ color: BORDER_COLOR, alpha: 0.15 });
    }
    card.addChild(footGfx);

    // ── SCROLLING TIP TICKER ─────────────────────────────────
    const tickerMask = new Graphics();
    tickerMask.rect(padX, curY + 2, CW - padX * 2, 14).fill({ color: 0xffffff });
    card.addChild(tickerMask);

    this._tickerContainer = new Container();
    this._tickerContainer.mask = tickerMask;
    const allTips = GAME_MODES.map(m => m.label).join("  \u2022  ");
    const tickerStr = `\u2605 ${allTips}  \u2022  ${GAME_MODES.length} GAME MODES AVAILABLE  \u2022  `;
    this._tickerText = new Text({ text: tickerStr + tickerStr, style: new TextStyle({
      fontFamily: "monospace", fontSize: 9, fill: 0x556677, letterSpacing: 1,
    }) });
    this._tickerText.position.set(padX, curY + 3);
    this._tickerContainer.addChild(this._tickerText);
    this._tickerX = padX;
    card.addChild(this._tickerContainer);
    curY += 18;

    // ── POLYGON COUNT + ENGINE TEXT ──────────────────────────
    this._polyCountText = new Text({ text: "\u25B2 0 POLYGONS", style: new TextStyle({
      fontFamily: "monospace", fontSize: 9, fill: 0x445566, letterSpacing: 2,
    }) });
    this._polyCountText.anchor.set(1, 0);
    this._polyCountText.position.set(CW - padX, curY + 2);
    card.addChild(this._polyCountText);

    // Engine label on the left
    const engineLabel = new Text({ text: "PIXI.JS ENGINE", style: new TextStyle({
      fontFamily: "monospace", fontSize: 9, fill: 0x334455, letterSpacing: 2,
    }) });
    engineLabel.position.set(padX, curY + 2);
    card.addChild(engineLabel);

    // Game mode total count in center
    const totalLabel = new Text({ text: `${GAME_MODES.length} MODES`, style: new TextStyle({
      fontFamily: "monospace", fontSize: 9, fill: 0x445566, letterSpacing: 2,
    }) });
    totalLabel.anchor.set(0.5, 0);
    totalLabel.position.set(hcx, curY + 2);
    card.addChild(totalLabel);

    curY += 20;

    this._screen1CardH = curY;

    // Store refs for dynamic repositioning
    this._s1SettingsBtn = settingsBtn;
    this._s1BackMapBtn = backMapBtn;
    this._s1UtilBtnH = utilBtnH;
    this._s1UtilGap = utilGap;

    // Redraw card background to final height
    const bg = card.getChildAt(0) as Graphics;
    bg.clear();
    bg.roundRect(0, 0, CW, this._screen1CardH, 10)
      .fill({ color: 0x10102a, alpha: 0.95 })
      .roundRect(0, 0, CW, this._screen1CardH, 10)
      .stroke({ color: BORDER_COLOR, alpha: 0.35, width: 2 });

    // ── INNER BORDER FRAME with L-brackets and edge diamonds ──
    this._drawS1InnerFrame(CW, this._screen1CardH);

    // ── ANIMATED GLOW BORDER ──
    this._s1GlowGfx.clear();
    this._s1GlowGfx.roundRect(-1, -1, CW + 2, this._screen1CardH + 2, 11)
      .stroke({ color: BORDER_COLOR, alpha: 1, width: 1.5 });

    // Reposition dragon watermark vertically centered
    dragonSprite.position.set(hcx, this._screen1CardH * 0.45);

    // Focus border for keyboard navigation
    this._s1FocusBorder = new Graphics();
    this._s1FocusBorder.visible = false;
    card.addChild(this._s1FocusBorder);

    // Rune corner diamonds
    this._runes1 = new RuneCorners();
    this._runes1.build(CW, this._screen1CardH);
    card.addChild(this._runes1.container);

    // ── SCAN LINE (pre-built, animated via y position) ──────
    const scanC = new Container();
    const scanMainLine = new Graphics();
    scanMainLine.rect(20, 0, CW - 40, 1).fill({ color: BORDER_COLOR, alpha: 0.6 });
    scanC.addChild(scanMainLine);
    for (let i = 1; i < 6; i++) {
      const trailLine = new Graphics();
      trailLine.rect(30 + i * 5, -i * 3, CW - 60 - i * 10, 0.5)
        .fill({ color: BORDER_COLOR, alpha: 0.4 / i });
      scanC.addChild(trailLine);
    }
    scanC.alpha = 0;
    card.addChild(scanC);
    this._scanContainer = scanC;

    // ── CORNER MINI ARCANE CIRCLES ──────────────────────────
    this._cornerMiniCircles = [];
    for (let i = 0; i < 4; i++) {
      const mcg = new Graphics();
      const mr = 20;
      // Outer ring
      mcg.circle(0, 0, mr).stroke({ color: BORDER_COLOR, alpha: 0.07, width: 0.5 });
      // Inner ring
      mcg.circle(0, 0, mr * 0.55).stroke({ color: BORDER_COLOR, alpha: 0.09, width: 0.5 });
      // 8 radial spokes
      for (let t = 0; t < 8; t++) {
        const a = (t * Math.PI * 2) / 8;
        mcg.moveTo(Math.cos(a) * mr * 0.25, Math.sin(a) * mr * 0.25)
          .lineTo(Math.cos(a) * mr, Math.sin(a) * mr)
          .stroke({ color: BORDER_COLOR, alpha: 0.05, width: 0.5 });
      }
      // Dots at cardinal points
      for (let t = 0; t < 4; t++) {
        const a = (t * Math.PI) / 2;
        mcg.circle(Math.cos(a) * mr, Math.sin(a) * mr, 1.5)
          .fill({ color: BORDER_COLOR, alpha: 0.12 });
      }
      // Inscribed square
      const sq = mr * 0.7;
      mcg.moveTo(-sq * 0.5, -sq * 0.5).lineTo(sq * 0.5, -sq * 0.5)
        .lineTo(sq * 0.5, sq * 0.5).lineTo(-sq * 0.5, sq * 0.5).closePath()
        .stroke({ color: BORDER_COLOR, alpha: 0.04, width: 0.5 });

      // Position at card corners
      const cx = i % 2 === 0 ? 28 : CW - 28;
      const cy = i < 2 ? 28 : this._screen1CardH - 28;
      mcg.position.set(cx, cy);
      card.addChild(mcg);
      this._cornerMiniCircles.push(mcg);
    }

    // Animated castle renderer beside the card
    this._buildingContainer = new Container();
    this._screen1.addChild(this._buildingContainer);
    this._buildingPreviewGfx = new Graphics();
    this._buildingContainer.addChild(this._buildingPreviewGfx);
    this._buildingRenderer = new House1Renderer(null);
    this._buildingContainer.addChild(this._buildingRenderer.container);

    // ── SIDE DECORATIVE PILLARS ─────────────────────────────
    this._sidePillarLeft = this._buildSidePillar(this._screen1CardH);
    this._screen1.addChild(this._sidePillarLeft);
    this._sidePillarRight = this._buildSidePillar(this._screen1CardH);
    this._sidePillarRight.scale.x = -1; // Mirror
    this._screen1.addChild(this._sidePillarRight);

    // Keyboard listener (supports grid: left/right + up/down)
    this._onKeydown = (e: KeyboardEvent) => {
      if (!this.container.visible || !this._screen1.visible) return;
      if (this._s1NavItems.length === 0) return;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        this._s1FocusIndex = (this._s1FocusIndex + 1) % this._s1NavItems.length;
        this._updateS1Focus();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        this._s1FocusIndex = (this._s1FocusIndex - 1 + this._s1NavItems.length) % this._s1NavItems.length;
        this._updateS1Focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        this._s1NavItems[this._s1FocusIndex].action();
      } else if (e.key === "Escape") {
        this.onBackToMap?.();
      }
    };
    window.addEventListener("keydown", this._onKeydown);

    // Scroll the menu card when it's taller than the viewport
    this._onWheel = (e: WheelEvent) => {
      if (!this.container.visible || !this._screen1?.visible) return;
      const sh = this._vm.screenHeight;
      const maxScroll = Math.max(0, this._screen1CardH - sh + 16);
      if (maxScroll <= 0) return;
      this._scrollY = Math.min(maxScroll, Math.max(0, this._scrollY + e.deltaY));
      this._layout();
    };
    window.addEventListener("wheel", this._onWheel, { passive: true });
  }

  /** Draw the inner border frame with L-brackets and edge midpoint diamonds. */
  private _drawS1InnerFrame(w: number, h: number): void {
    const g = this._s1InnerFrame;
    g.clear();
    const inset = 7;
    const bracketLen = 28;

    // L-bracket corners
    const corners = [
      { x: inset, y: inset, dx: 1, dy: 1 },
      { x: w - inset, y: inset, dx: -1, dy: 1 },
      { x: inset, y: h - inset, dx: 1, dy: -1 },
      { x: w - inset, y: h - inset, dx: -1, dy: -1 },
    ];
    for (const c of corners) {
      // Outer bracket
      g.moveTo(c.x, c.y + c.dy * bracketLen)
        .lineTo(c.x, c.y)
        .lineTo(c.x + c.dx * bracketLen, c.y)
        .stroke({ color: BORDER_COLOR, alpha: 0.12, width: 1 });
      // Inner bracket (shorter, fainter)
      g.moveTo(c.x + c.dx * 3, c.y + c.dy * 3 + c.dy * (bracketLen - 8))
        .lineTo(c.x + c.dx * 3, c.y + c.dy * 3)
        .lineTo(c.x + c.dx * 3 + c.dx * (bracketLen - 8), c.y + c.dy * 3)
        .stroke({ color: BORDER_COLOR, alpha: 0.06, width: 0.5 });
      // Corner dot
      g.circle(c.x + c.dx * 2, c.y + c.dy * 2, 1.5)
        .fill({ color: BORDER_COLOR, alpha: 0.2 });
    }

    // Edge midpoint diamonds
    const hcx = w / 2;
    const hcy = h / 2;
    const edgeMids: [number, number][] = [
      [hcx, inset],
      [hcx, h - inset],
      [inset, hcy],
      [w - inset, hcy],
    ];
    for (const [mx, my] of edgeMids) {
      const ds = 5;
      g.moveTo(mx, my - ds).lineTo(mx + ds, my).lineTo(mx, my + ds).lineTo(mx - ds, my).closePath()
        .fill({ color: BORDER_COLOR, alpha: 0.1 })
        .stroke({ color: BORDER_COLOR, alpha: 0.2, width: 0.5 });
      // Tiny inner diamond
      const ids = 2;
      g.moveTo(mx, my - ids).lineTo(mx + ids, my).lineTo(mx, my + ids).lineTo(mx - ids, my).closePath()
        .fill({ color: BORDER_COLOR, alpha: 0.25 });
    }
  }

  private _updateS1Focus(): void {
    const item = this._s1NavItems[this._s1FocusIndex];
    if (!item) return;
    const c = item.container;
    const bounds = c.getBounds();
    const cardPos = this._screen1Card.getGlobalPosition();
    // Convert to card-local coordinates
    const lx = bounds.x - cardPos.x;
    const ly = bounds.y - cardPos.y;
    this._s1FocusBorder.clear();
    this._s1FocusBorder
      .roundRect(lx - 2, ly - 2, bounds.width + 4, bounds.height + 4, 6)
      .stroke({ color: 0x88ccff, alpha: 0.8, width: 2 });
    this._s1FocusBorder.visible = true;
  }

  // ---------------------------------------------------------------------------
  // Screen 2 — Match Setup
  // ---------------------------------------------------------------------------

  private _buildScreen2(): void {
    const CW = this._screen2CardW;
    this._screen2 = new Container();
    this.container.addChild(this._screen2);

    const card = makePanel(CW, 700);
    this._screen2.addChild(card);
    this._screen2Card = card;

    // Title — shows selected mode name
    const title = new Text({ text: t("menu.match_setup"), style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CW / 2, 18);
    card.addChild(title);

    // Divider
    card.addChild(
      new Graphics()
        .rect(20, 58, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    let curY = 68;

    // --- AI toggle ---
    const TW = CW - 40;
    const TH = 32;

    const aiLabel = new Text({ text: t("menu.p2_control"), style: STYLE_LABEL });
    aiLabel.position.set(20, curY);
    card.addChild(aiLabel);
    curY += 20;

    const toggleBtn = new Container();
    toggleBtn.eventMode = "static";
    toggleBtn.cursor = "pointer";
    toggleBtn.position.set(20, curY);

    const toggleBg = new Graphics();
    toggleBtn.addChild(toggleBg);

    const toggleLabel = new Text({ text: "", style: STYLE_BTN });
    toggleLabel.anchor.set(0.5, 0.5);
    toggleLabel.position.set(TW / 2, TH / 2);
    toggleBtn.addChild(toggleLabel);

    this._aiToggleBg = toggleBg;
    this._aiToggleLabel = toggleLabel;

    toggleBtn.on("pointerdown", () => {
      this._p2IsAI = !this._p2IsAI;
      this._refreshAIToggle(TW, TH);
      this.onAIToggle?.(this._p2IsAI);
    });

    card.addChild(toggleBtn);
    this._refreshAIToggle(TW, TH);
    curY += TH + 12;

    // --- Damage numbers toggle ---
    const dmgLabel = new Text({ text: t("menu.damage_numbers"), style: STYLE_LABEL });
    dmgLabel.position.set(20, curY);
    card.addChild(dmgLabel);
    curY += 20;

    const dmgBtn = new Container();
    dmgBtn.eventMode = "static";
    dmgBtn.cursor = "pointer";
    dmgBtn.position.set(20, curY);

    const dmgBg = new Graphics();
    dmgBtn.addChild(dmgBg);

    const dmgToggleLabel = new Text({ text: "", style: STYLE_BTN });
    dmgToggleLabel.anchor.set(0.5, 0.5);
    dmgToggleLabel.position.set(TW / 2, TH / 2);
    dmgBtn.addChild(dmgToggleLabel);

    this._dmgToggleBg = dmgBg;
    this._dmgToggleLabel = dmgToggleLabel;

    dmgBtn.on("pointerdown", () => {
      this._damageNumbers = !this._damageNumbers;
      this._refreshDmgToggle(TW, TH);
    });

    card.addChild(dmgBtn);
    this._refreshDmgToggle(TW, TH);
    curY += TH + 12;

    // --- Difficulty selector ---
    const diffLabel = new Text({ text: t("menu.ai_difficulty"), style: STYLE_LABEL });
    diffLabel.position.set(20, curY);
    card.addChild(diffLabel);
    curY += 20;

    const DIFFS = [Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD, Difficulty.BRUTAL];
    const diffGap = 6;
    const diffBtnW = Math.floor((CW - 40 - diffGap * (DIFFS.length - 1)) / DIFFS.length);
    const diffBtnH = 26;

    this._difficultyBtns = [];
    for (let i = 0; i < DIFFS.length; i++) {
      const diff = DIFFS[i];
      const settings = DIFFICULTY_SETTINGS[diff];
      const btn = new Container();
      btn.eventMode = "static";
      btn.cursor = "pointer";
      btn.position.set(20 + i * (diffBtnW + diffGap), curY);

      const bg = new Graphics();
      btn.addChild(bg);

      const lbl = new Text({ text: settings.label, style: STYLE_SIZE_INACTIVE });
      lbl.anchor.set(0.5, 0.5);
      lbl.position.set(diffBtnW / 2, diffBtnH / 2);
      btn.addChild(lbl);

      const idx = i;
      btn.on("pointerdown", () => {
        this._selectedDifficultyIndex = idx;
        setDifficulty(DIFFS[idx]);
        this._refreshDifficultyBtns(diffBtnW, diffBtnH);
      });

      card.addChild(btn);
      this._difficultyBtns.push({ bg, label: lbl });
    }
    this._refreshDifficultyBtns(diffBtnW, diffBtnH);
    curY += diffBtnH + 12;

    // Divider
    card.addChild(
      new Graphics()
        .rect(20, curY, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );
    curY += 12;

    // --- Map type selector ---
    const typeLabel = new Text({ text: t("menu.map_type"), style: STYLE_LABEL });
    typeLabel.position.set(20, curY);
    card.addChild(typeLabel);
    curY += 20;

    const typeColCount = 4;
    const typeGap = 6;
    const tbW = Math.floor(
      (CW - 40 - typeGap * (typeColCount - 1)) / typeColCount,
    );
    const tbH = 26;

    this._typeBtns = [];
    for (let i = 0; i < MAP_TYPES.length; i++) {
      const col = i % typeColCount;
      const row = Math.floor(i / typeColCount);
      const typeBtn = new Container();
      typeBtn.eventMode = "static";
      typeBtn.cursor = MAP_TYPES[i].locked ? "default" : "pointer";
      typeBtn.position.set(20 + col * (tbW + typeGap), curY + row * (tbH + typeGap));

      const typeBg = new Graphics();
      typeBtn.addChild(typeBg);

      const tLabel = new Text({
        text: MAP_TYPES[i].label,
        style: STYLE_MODE_INACTIVE,
      });
      tLabel.anchor.set(0.5, 0.5);
      tLabel.position.set(tbW / 2, tbH / 2);
      typeBtn.addChild(tLabel);

      const idx = i;
      if (!MAP_TYPES[i].locked) {
        typeBtn.on("pointerdown", () => {
          this._selectedTypeIndex = idx;
          this._refreshTypeBtns(tbW, tbH);
        });
      }

      card.addChild(typeBtn);
      this._typeBtns.push({
        bg: typeBg,
        label: tLabel,
        locked: MAP_TYPES[i].locked ?? false,
      });
    }
    this._refreshTypeBtns(tbW, tbH);

    const typeRows = Math.ceil(MAP_TYPES.length / typeColCount);
    curY += typeRows * (tbH + typeGap) + 6;

    // Divider
    card.addChild(
      new Graphics()
        .rect(20, curY, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );
    curY += 12;

    // --- Map size selector ---
    const mapLabel = new Text({ text: t("menu.map_size"), style: STYLE_LABEL });
    mapLabel.position.set(20, curY);
    card.addChild(mapLabel);
    curY += 20;

    const btnCount = MAP_SIZES.length;
    const gap = 6;
    const totalGap = gap * (btnCount - 1);
    const sbW = Math.floor((CW - 40 - totalGap) / btnCount);
    const sbH = 30;

    this._sizeBtns = [];
    for (let i = 0; i < btnCount; i++) {
      const sizeBtn = new Container();
      sizeBtn.eventMode = "static";
      sizeBtn.cursor = "pointer";
      sizeBtn.position.set(20 + i * (sbW + gap), curY);

      const sizeBg = new Graphics();
      sizeBtn.addChild(sizeBg);

      const dims = `${MAP_SIZES[i].width}×${MAP_SIZES[i].height}`;
      const topLabel = new Text({
        text: MAP_SIZES[i].label,
        style: STYLE_SIZE_INACTIVE,
      });
      topLabel.anchor.set(0.5, 0);
      topLabel.position.set(sbW / 2, 4);
      sizeBtn.addChild(topLabel);

      const dimLabel = new Text({ text: dims, style: STYLE_SIZE_INACTIVE });
      dimLabel.anchor.set(0.5, 1);
      dimLabel.position.set(sbW / 2, sbH - 3);
      sizeBtn.addChild(dimLabel);

      const idx = i;
      sizeBtn.on("pointerdown", () => {
        this._selectedSizeIndex = idx;
        this._refreshSizeBtns(sbW, sbH);
        if (idx === 0 && this._playerCount > 2) {
          this._playerCount = 2;
        }
        this._refreshPlayerCountBtns(50, 26);
        this._refreshAllianceToggles();
      });

      card.addChild(sizeBtn);
      this._sizeBtns.push({ bg: sizeBg, label: topLabel });
      (this._sizeBtns[i] as (typeof this._sizeBtns)[0] & { dim: Text }).dim =
        dimLabel;
    }
    this._refreshSizeBtns(sbW, sbH);
    curY += sbH + 12;

    // Divider
    card.addChild(
      new Graphics()
        .rect(20, curY, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );
    curY += 12;

    // --- Player count + alliance section (hidden for Battlefield/Wave) ---
    const playerSection = new Container();
    playerSection.position.set(0, curY);
    card.addChild(playerSection);
    this._screen2PlayerSection = playerSection;

    const playersLabel = new Text({ text: t("menu.players"), style: STYLE_LABEL });
    playersLabel.position.set(20, 0);
    playerSection.addChild(playersLabel);

    const pcBtnW = 50;
    const pcBtnH = 26;
    const pcGap = 8;
    this._playerCountBtns = [];
    for (let i = 0; i < 3; i++) {
      const count = i + 2;
      const btn = new Container();
      btn.eventMode = "static";
      btn.cursor = "pointer";
      btn.position.set(20 + i * (pcBtnW + pcGap), 20);

      const bg = new Graphics();
      btn.addChild(bg);

      const lbl = new Text({ text: String(count), style: STYLE_SIZE_INACTIVE });
      lbl.anchor.set(0.5, 0.5);
      lbl.position.set(pcBtnW / 2, pcBtnH / 2);
      btn.addChild(lbl);

      btn.on("pointerdown", () => {
        if (count > 2 && this._selectedSizeIndex === 0) return;
        this._playerCount = count;
        this._refreshPlayerCountBtns(pcBtnW, pcBtnH);
        this._refreshAllianceToggles();
      });

      playerSection.addChild(btn);
      this._playerCountBtns.push({ bg, label: lbl });
    }
    this._refreshPlayerCountBtns(pcBtnW, pcBtnH);

    // Alliance toggles
    const allyY = 52;
    const allyW = (CW - 40 - 8) / 2;
    const allyH = 24;

    const p3Ally = new Container();
    p3Ally.eventMode = "static";
    p3Ally.cursor = "pointer";
    p3Ally.position.set(20, allyY);
    const p3Bg = new Graphics();
    p3Ally.addChild(p3Bg);
    const p3Lbl = new Text({ text: t("menu.p3_allied"), style: STYLE_SIZE_INACTIVE });
    p3Lbl.anchor.set(0.5, 0.5);
    p3Lbl.position.set(allyW / 2, allyH / 2);
    p3Ally.addChild(p3Lbl);
    p3Ally.on("pointerdown", () => {
      if (this._playerCount < 3) return;
      this._p3Allied = !this._p3Allied;
      this._refreshAllianceToggles();
    });
    playerSection.addChild(p3Ally);
    this._p3AllyContainer = p3Ally;
    this._p3AllyBg = p3Bg;
    this._p3AllyLabel = p3Lbl;

    const p4Ally = new Container();
    p4Ally.eventMode = "static";
    p4Ally.cursor = "pointer";
    p4Ally.position.set(20 + allyW + 8, allyY);
    const p4Bg = new Graphics();
    p4Ally.addChild(p4Bg);
    const p4Lbl = new Text({ text: t("menu.p4_allied"), style: STYLE_SIZE_INACTIVE });
    p4Lbl.anchor.set(0.5, 0.5);
    p4Lbl.position.set(allyW / 2, allyH / 2);
    p4Ally.addChild(p4Lbl);
    p4Ally.on("pointerdown", () => {
      if (this._playerCount < 4) return;
      this._p4Allied = !this._p4Allied;
      this._refreshAllianceToggles();
    });
    playerSection.addChild(p4Ally);
    this._p4AllyContainer = p4Ally;
    this._p4AllyBg = p4Bg;
    this._p4AllyLabel = p4Lbl;

    this._refreshAllianceToggles();

    const playerSectionH = allyY + allyH + 12;

    // Divider inside player section
    playerSection.addChild(
      new Graphics()
        .rect(20, playerSectionH, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // --- Grail Greed Corruption toggle (wave mode only) ---
    const grailSection = new Container();
    grailSection.position.set(0, curY);
    grailSection.visible = false; // shown only for wave mode
    card.addChild(grailSection);
    this._grailGreedSection = grailSection;

    const grailLabel = new Text({ text: t("menu.grail_greed"), style: STYLE_LABEL });
    grailLabel.position.set(20, 0);
    grailSection.addChild(grailLabel);

    const grailBtn = new Container();
    grailBtn.eventMode = "static";
    grailBtn.cursor = "pointer";
    grailBtn.position.set(20, 20);

    const grailBg = new Graphics();
    grailBtn.addChild(grailBg);

    const grailToggleLabel = new Text({ text: "", style: STYLE_BTN });
    grailToggleLabel.anchor.set(0.5, 0.5);
    grailToggleLabel.position.set(TW / 2, TH / 2);
    grailBtn.addChild(grailToggleLabel);

    this._grailGreedBg = grailBg;
    this._grailGreedLabel = grailToggleLabel;

    grailBtn.on("pointerdown", () => {
      this._grailGreed = !this._grailGreed;
      this._refreshGrailGreedToggle(TW, TH);
    });

    grailSection.addChild(grailBtn);
    this._refreshGrailGreedToggle(TW, TH);

    const grailSectionH = 20 + TH + 12;

    // Divider inside grail section
    grailSection.addChild(
      new Graphics()
        .rect(20, grailSectionH, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // --- Random Events toggle (wave mode only) ---
    const randomEventsSection = new Container();
    randomEventsSection.position.set(0, curY);
    randomEventsSection.visible = false; // shown only for wave mode
    card.addChild(randomEventsSection);
    this._randomEventsSection = randomEventsSection;

    const reLabel = new Text({ text: t("menu.random_events"), style: STYLE_LABEL });
    reLabel.position.set(20, 0);
    randomEventsSection.addChild(reLabel);

    const reBtn = new Container();
    reBtn.eventMode = "static";
    reBtn.cursor = "pointer";
    reBtn.position.set(20, 20);

    const reBg = new Graphics();
    reBtn.addChild(reBg);

    const reToggleLabel = new Text({ text: "", style: STYLE_BTN });
    reToggleLabel.anchor.set(0.5, 0.5);
    reToggleLabel.position.set(TW / 2, TH / 2);
    reBtn.addChild(reToggleLabel);

    this._randomEventsBg = reBg;
    this._randomEventsLabel = reToggleLabel;

    reBtn.on("pointerdown", () => {
      this._randomEvents = !this._randomEvents;
      this._refreshRandomEventsToggle(TW, TH);
    });

    randomEventsSection.addChild(reBtn);
    this._refreshRandomEventsToggle(TW, TH);

    const randomEventsSectionH = 20 + TH + 12;

    // Divider inside random events section
    randomEventsSection.addChild(
      new Graphics()
        .rect(20, randomEventsSectionH, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    const randomEventsSectionFullH = randomEventsSectionH + 14;

    // --- Scaling Difficulty toggle (wave mode only) ---
    const scalingSection = new Container();
    scalingSection.position.set(0, curY);
    scalingSection.visible = false;
    card.addChild(scalingSection);
    this._scalingDifficultySection = scalingSection;

    const sdLabel = new Text({ text: t("menu.scaling_difficulty"), style: STYLE_LABEL });
    sdLabel.position.set(20, 0);
    scalingSection.addChild(sdLabel);

    const sdBtn = new Container();
    sdBtn.eventMode = "static";
    sdBtn.cursor = "pointer";
    sdBtn.position.set(20, 20);

    const sdBg = new Graphics();
    sdBtn.addChild(sdBg);

    const sdToggleLabel = new Text({ text: "", style: STYLE_BTN });
    sdToggleLabel.anchor.set(0.5, 0.5);
    sdToggleLabel.position.set(TW / 2, TH / 2);
    sdBtn.addChild(sdToggleLabel);

    this._scalingDifficultyBg = sdBg;
    this._scalingDifficultyLabel = sdToggleLabel;

    sdBtn.on("pointerdown", () => {
      this._scalingDifficulty = !this._scalingDifficulty;
      this._refreshScalingDifficultyToggle(TW, TH);
    });

    scalingSection.addChild(sdBtn);
    this._refreshScalingDifficultyToggle(TW, TH);

    const scalingSectionH = 20 + TH + 12;
    scalingSection.addChild(
      new Graphics()
        .rect(20, scalingSectionH, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );
    const scalingSectionFullH = scalingSectionH + 14;

    // --- Boss Waves toggle (wave mode only) ---
    const bossSection = new Container();
    bossSection.position.set(0, curY);
    bossSection.visible = false;
    card.addChild(bossSection);
    this._bossWavesSection = bossSection;

    const bwLabel = new Text({ text: t("menu.boss_waves"), style: STYLE_LABEL });
    bwLabel.position.set(20, 0);
    bossSection.addChild(bwLabel);

    const bwBtn = new Container();
    bwBtn.eventMode = "static";
    bwBtn.cursor = "pointer";
    bwBtn.position.set(20, 20);

    const bwBg = new Graphics();
    bwBtn.addChild(bwBg);

    const bwToggleLabel = new Text({ text: "", style: STYLE_BTN });
    bwToggleLabel.anchor.set(0.5, 0.5);
    bwToggleLabel.position.set(TW / 2, TH / 2);
    bwBtn.addChild(bwToggleLabel);

    this._bossWavesBg = bwBg;
    this._bossWavesLabel = bwToggleLabel;

    bwBtn.on("pointerdown", () => {
      this._bossWaves = !this._bossWaves;
      this._refreshBossWavesToggle(TW, TH);
    });

    bossSection.addChild(bwBtn);
    this._refreshBossWavesToggle(TW, TH);

    const bossSectionH = 20 + TH + 12;
    bossSection.addChild(
      new Graphics()
        .rect(20, bossSectionH, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );
    const bossSectionFullH = bossSectionH + 14;

    // --- Wave Intro toggle (wave mode only) ---
    const introSection = new Container();
    introSection.position.set(0, curY);
    introSection.visible = false;
    card.addChild(introSection);
    this._waveIntroSection = introSection;

    const wiLabel = new Text({ text: t("menu.wave_intro"), style: STYLE_LABEL });
    wiLabel.position.set(20, 0);
    introSection.addChild(wiLabel);

    const wiBtn = new Container();
    wiBtn.eventMode = "static";
    wiBtn.cursor = "pointer";
    wiBtn.position.set(20, 20);

    const wiBg = new Graphics();
    wiBtn.addChild(wiBg);

    const wiToggleLabel = new Text({ text: "", style: STYLE_BTN });
    wiToggleLabel.anchor.set(0.5, 0.5);
    wiToggleLabel.position.set(TW / 2, TH / 2);
    wiBtn.addChild(wiToggleLabel);

    this._waveIntroBg = wiBg;
    this._waveIntroLabel = wiToggleLabel;

    wiBtn.on("pointerdown", () => {
      this._waveIntro = !this._waveIntro;
      this._refreshWaveIntroToggle(TW, TH);
    });

    introSection.addChild(wiBtn);
    this._refreshWaveIntroToggle(TW, TH);

    const introSectionH = 20 + TH + 12;
    introSection.addChild(
      new Graphics()
        .rect(20, introSectionH, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );
    const introSectionFullH = introSectionH + 14;

    // --- Battlefield gold adjustment section ---
    const goldSection = new Container();
    goldSection.visible = false;
    card.addChild(goldSection);
    this._battlefieldGoldSection = goldSection;

    const goldLabel = new Text({ text: t("menu.starting_gold"), style: STYLE_LABEL });
    goldLabel.position.set(20, 0);
    goldSection.addChild(goldLabel);

    this._battlefieldGoldLabel = new Text({
      text: this._formatGold(),
      style: new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xffd700, fontWeight: "bold" }),
    });
    this._battlefieldGoldLabel.anchor.set(0.5, 0.5);
    this._battlefieldGoldLabel.position.set(CW / 2, 38);
    goldSection.addChild(this._battlefieldGoldLabel);

    const goldBtnW = 36;
    const goldBtnH = 28;
    const makeGoldBtn = (label: string, x: number, y: number, delta: number) => {
      const btn = new Container();
      btn.eventMode = "static";
      btn.cursor = "pointer";
      const bg = new Graphics()
        .roundRect(0, 0, goldBtnW, goldBtnH, 4)
        .fill({ color: delta > 0 ? 0x1a3a1a : 0x3a1a1a })
        .roundRect(0, 0, goldBtnW, goldBtnH, 4)
        .stroke({ color: delta > 0 ? 0x44aa66 : 0xaa4444, width: 1 });
      const txt = new Text({
        text: label,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: delta > 0 ? 0x88ffaa : 0xff8888, fontWeight: "bold" }),
      });
      txt.anchor.set(0.5, 0.5);
      txt.position.set(goldBtnW / 2, goldBtnH / 2);
      btn.addChild(bg, txt);
      btn.position.set(x, y);
      btn.on("pointerdown", (e: PointerEvent) => {
        let step = 1000;
        if (e.ctrlKey) step = 10000;
        else if (e.shiftKey) step = 5000;
        this._battlefieldGold = Math.max(1000, Math.min(999999, this._battlefieldGold + delta * step));
        this._battlefieldGoldLabel.text = this._formatGold();
      });
      return btn;
    };

    const goldBtnY = 26;
    goldSection.addChild(makeGoldBtn("-", 20, goldBtnY, -1));
    goldSection.addChild(makeGoldBtn("+", CW - 20 - goldBtnW, goldBtnY, 1));

    const goldHintLabel = new Text({
      text: t("menu.gold_hint"),
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x667788 }),
    });
    goldHintLabel.anchor.set(0.5, 0);
    goldHintLabel.position.set(CW / 2, 54);
    goldSection.addChild(goldHintLabel);

    const goldSectionH = 68;
    goldSection.addChild(
      new Graphics()
        .rect(20, goldSectionH, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );
    const goldSectionFullH = goldSectionH + 14;

    // We track two possible curY values — with and without player section
    // The actual card height is computed in _layout based on visibility
    // For now, place the action buttons after player section
    const actionBaseY = curY; // Y where player section starts
    const actionYWithPlayers = actionBaseY + playerSectionH + 14;
    const actionYWithoutPlayers = actionBaseY;
    const grailSectionFullH = grailSectionH + 14;

    // --- Action buttons (placed at a fixed offset, repositioned in layout) ---
    const BW = CW - 40;
    const BH = 42;
    const actionBtnGap = 8;

    // BACK button
    const backBtn = makeActionBtn(BW, BH, "<  BACK", 0x1a1a2a, 0x4466aa, 0x88aadd, () => {
      this._showScreen1();
    });
    card.addChild(backBtn);

    // SELECT LEADER button
    const startBtn = makeActionBtn(BW, BH, "SELECT LEADER  >", 0x1a3a1a, 0x44aa66, 0x88ffaa, () => {
      this.onContinue?.();
    });
    card.addChild(startBtn);

    // Store refs for repositioning
    const actionBtns = { back: backBtn, start: startBtn };

    // Rune corners for screen2
    this._runes2 = new RuneCorners();
    card.addChild(this._runes2.container);

    // Wave high-score panel (sibling to _screen2Card, outside the card)
    this._waveHSPanel = new Container();
    this._waveHSPanel.visible = false;
    this._screen2.addChild(this._waveHSPanel);

    // Override _layout to also reposition action buttons
    const origLayout = this._layout.bind(this);
    this._layout = () => {
      // Position action buttons based on player section and grail section visibility
      let actY: number;
      if (this._screen2PlayerSection.visible) {
        actY = actionYWithPlayers;
      } else {
        actY = actionYWithoutPlayers;
      }

      // Position grail section right after the current section
      this._grailGreedSection.position.set(0, actY);
      if (this._grailGreedSection.visible) {
        actY += grailSectionFullH;
      }

      // Position random events section after grail section
      this._randomEventsSection.position.set(0, actY);
      if (this._randomEventsSection.visible) {
        actY += randomEventsSectionFullH;
      }

      // Position scaling difficulty section
      this._scalingDifficultySection.position.set(0, actY);
      if (this._scalingDifficultySection.visible) {
        actY += scalingSectionFullH;
      }

      // Position boss waves section
      this._bossWavesSection.position.set(0, actY);
      if (this._bossWavesSection.visible) {
        actY += bossSectionFullH;
      }

      // Position wave intro section
      this._waveIntroSection.position.set(0, actY);
      if (this._waveIntroSection.visible) {
        actY += introSectionFullH;
      }

      // Position battlefield gold section
      this._battlefieldGoldSection.position.set(0, actY);
      if (this._battlefieldGoldSection.visible) {
        actY += goldSectionFullH;
      }

      actionBtns.start.position.set(20, actY);
      actionBtns.back.position.set(20, actY + BH + actionBtnGap);

      this._screen2CardH = actY + BH * 2 + actionBtnGap + 18;

      // Redraw screen2 card bg
      const s2bg = this._screen2Card.getChildAt(0) as Graphics;
      s2bg.clear();
      s2bg.roundRect(0, 0, this._screen2CardW, this._screen2CardH, 8)
        .fill({ color: 0x10102a, alpha: 0.95 })
        .roundRect(0, 0, this._screen2CardW, this._screen2CardH, 8)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 });

      this._runes2.build(this._screen2CardW, this._screen2CardH);

      origLayout();

      // Position wave HS panel to the right of the settings card
      if (this._waveHSPanel.visible) {
        this._waveHSPanel.position.set(
          this._screen2Card.x + this._screen2CardW + 16,
          this._screen2Card.y,
        );
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Wave high-score panel
  // ---------------------------------------------------------------------------

  private _buildWaveHSContent(): void {
    const p = this._waveHSPanel;
    // Clear previous content
    while (p.children.length > 0) p.removeChildAt(0);

    const W = 300;
    const runs = _readWaveBestRuns();

    // Background card
    const bg = new Graphics();
    p.addChild(bg);

    let curY = 10;

    // Reserve space for dragon image header (loaded async)
    const imgH = 90;
    const imgPlaceholder = new Container();
    imgPlaceholder.position.set(0, curY);
    p.addChild(imgPlaceholder);
    void Assets.load(dragonImgUrl).then((tex: Texture) => {
      if (!p.parent) return;
      const img = new Sprite(tex);
      const scale = Math.min(imgH / img.texture.height, (W - 20) / img.texture.width);
      img.scale.set(scale);
      img.anchor.set(0.5, 0);
      img.position.set(W / 2, 0);
      imgPlaceholder.addChild(img);
    });
    curY += imgH + 6;

    // Title
    const titleStyle = new TextStyle({ fontFamily: "monospace", fontSize: 15, fill: 0xffd700, fontWeight: "bold", letterSpacing: 2 });
    const title = new Text({ text: "WAVE MODE  RECORDS", style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, curY);
    p.addChild(title);
    curY += 24;

    // Divider
    p.addChild(new Graphics().rect(10, curY, W - 20, 1).fill({ color: 0xffd700, alpha: 0.25 }));
    curY += 10;

    if (runs.length === 0) {
      const noStyle = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x556677, letterSpacing: 1 });
      const noRuns = new Text({ text: "No runs recorded yet.\nPlay Wave mode to set a record!", style: noStyle });
      noRuns.style.wordWrap = true;
      noRuns.style.wordWrapWidth = W - 20;
      noRuns.anchor.set(0.5, 0);
      noRuns.position.set(W / 2, curY);
      p.addChild(noRuns);
      curY += 42;
    } else {
      // --- Personal best banner ---
      const best = runs[0];
      const bannerBg = new Graphics()
        .roundRect(10, 0, W - 20, 44, 6)
        .fill({ color: 0x1a1400, alpha: 0.9 })
        .roundRect(10, 0, W - 20, 44, 6)
        .stroke({ color: 0xffd700, alpha: 0.7, width: 1.5 });
      bannerBg.position.set(0, curY);
      p.addChild(bannerBg);

      const pbLabel = new Text({ text: "PERSONAL BEST", style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x997700, letterSpacing: 2 }) });
      pbLabel.anchor.set(0.5, 0);
      pbLabel.position.set(W / 2, curY + 4);
      p.addChild(pbLabel);

      const pbWave = new Text({ text: `Wave  ${best.wave}`, style: new TextStyle({ fontFamily: "monospace", fontSize: 22, fill: 0xffd700, fontWeight: "bold" }) });
      pbWave.anchor.set(0.5, 0);
      pbWave.position.set(W / 2, curY + 16);
      p.addChild(pbWave);

      const pbSub = new Text({ text: `${best.raceId} · ${best.leaderId}`, style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xaabb88 }) });
      pbSub.anchor.set(1, 0);
      pbSub.position.set(W - 14, curY + 4);
      p.addChild(pbSub);

      curY += 52;

      // --- Aggregate stats ---
      const avgWave = Math.round(runs.reduce((s, r) => s + r.wave, 0) / runs.length);
      const statStyle = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x778899 });
      const statVStyle = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xaaccdd, fontWeight: "bold" });

      const statsRow = new Container();
      const sRuns = new Text({ text: "RUNS", style: statStyle });
      const sRunsV = new Text({ text: String(runs.length), style: statVStyle });
      const sAvg = new Text({ text: "AVG WAVE", style: statStyle });
      const sAvgV = new Text({ text: String(avgWave), style: statVStyle });
      sRuns.position.set(10, 0);
      sRunsV.position.set(48, 0);
      sAvg.position.set(130, 0);
      sAvgV.position.set(208, 0);
      statsRow.addChild(sRuns, sRunsV, sAvg, sAvgV);
      statsRow.position.set(0, curY);
      p.addChild(statsRow);
      curY += 18;

      // Divider
      p.addChild(new Graphics().rect(10, curY, W - 20, 1).fill({ color: 0x334455, alpha: 0.8 }));
      curY += 8;

      // --- Table header ---
      const hdrStyle = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x8899aa, letterSpacing: 1 });
      const hdr = new Container();
      const hWave = new Text({ text: "WAVE", style: hdrStyle });
      const hRace = new Text({ text: "RACE", style: hdrStyle });
      const hLeader = new Text({ text: "LEADER", style: hdrStyle });
      const hDate = new Text({ text: "DATE", style: hdrStyle });
      hWave.position.set(10, 0);
      hRace.position.set(62, 0);
      hLeader.position.set(135, 0);
      hDate.position.set(218, 0);
      hdr.addChild(hWave, hRace, hLeader, hDate);
      hdr.position.set(0, curY);
      p.addChild(hdr);
      curY += 14;

      const MEDAL_COLORS = [0xffd700, 0xc0c0c0, 0xcd7f32];
      const rowStyle = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xddeeff });
      const dateStyle = new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x556677 });

      const top = runs.slice(0, 8);
      for (let i = 0; i < top.length; i++) {
        const run = top[i];
        const rowH = 20;
        const rowBg = new Graphics()
          .rect(8, 0, W - 16, rowH)
          .fill({ color: i % 2 === 0 ? 0x111128 : 0x0d0d20, alpha: 0.7 });
        rowBg.position.set(0, curY);
        p.addChild(rowBg);

        const waveColor = i < 3 ? MEDAL_COLORS[i] : 0xddeeff;
        const wNum = new Text({ text: `${run.wave}`, style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: waveColor, fontWeight: i === 0 ? "bold" : "normal" }) });
        const wRace = new Text({ text: run.raceId.slice(0, 8), style: rowStyle });
        const wLeader = new Text({ text: run.leaderId.slice(0, 7), style: rowStyle });
        // Parse date — stored as ISO string or locale string
        let dateStr = "—";
        try {
          const d = new Date(run.date);
          if (!isNaN(d.getTime())) dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
        } catch { /* */ }
        const wDate = new Text({ text: dateStr, style: dateStyle });
        wNum.position.set(10, curY + 3);
        wRace.position.set(62, curY + 4);
        wLeader.position.set(135, curY + 4);
        wDate.position.set(218, curY + 4);
        p.addChild(wNum, wRace, wLeader, wDate);
        curY += rowH;
      }
    }

    // --- Hints section ---
    curY += 6;
    p.addChild(new Graphics().rect(10, curY, W - 20, 1).fill({ color: 0x334455, alpha: 0.8 }));
    curY += 8;

    const tipLabel = new Text({ text: "TIP", style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x556677, letterSpacing: 2 }) });
    tipLabel.position.set(12, curY);
    p.addChild(tipLabel);
    curY += 14;

    const hintStyle = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x99bbcc, wordWrap: true, wordWrapWidth: W - 24 });
    const hintText = new Text({ text: WAVE_HINTS[this._waveHintIndex % WAVE_HINTS.length], style: hintStyle });
    hintText.position.set(12, curY);
    p.addChild(hintText);
    curY += 40;

    // Next hint button
    const nextBtnW = W - 20;
    const nextBtnH = 22;
    const nextBtnBg = new Graphics()
      .roundRect(0, 0, nextBtnW, nextBtnH, 4)
      .fill({ color: 0x1a2030, alpha: 0.9 })
      .roundRect(0, 0, nextBtnW, nextBtnH, 4)
      .stroke({ color: 0x445566, width: 1 });
    const nextBtnLabel = new Text({ text: "NEXT TIP  →", style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x6688aa, letterSpacing: 1 }) });
    nextBtnLabel.anchor.set(0.5, 0.5);
    nextBtnLabel.position.set(nextBtnW / 2, nextBtnH / 2);
    const nextBtn = new Container();
    nextBtn.addChild(nextBtnBg, nextBtnLabel);
    nextBtn.position.set(10, curY);
    nextBtn.eventMode = "static";
    nextBtn.cursor = "pointer";
    nextBtn.on("pointerdown", () => {
      this._waveHintIndex = (this._waveHintIndex + 1) % WAVE_HINTS.length;
      hintText.text = WAVE_HINTS[this._waveHintIndex];
    });
    nextBtn.on("pointerover", () => { nextBtnBg.tint = 0x3366aa; });
    nextBtn.on("pointerout", () => { nextBtnBg.tint = 0xffffff; });
    p.addChild(nextBtn);
    curY += nextBtnH;

    // Draw background
    curY += 12;
    bg.roundRect(0, 0, W, curY, 8)
      .fill({ color: 0x10102a, alpha: 0.95 })
      .roundRect(0, 0, W, curY, 8)
      .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 });
  }

  // ---------------------------------------------------------------------------
  // Refresh helpers
  // ---------------------------------------------------------------------------

  private _refreshAIToggle(w: number, h: number): void {
    const active = this._p2IsAI;
    this._aiToggleBg.clear();
    this._aiToggleBg
      .roundRect(0, 0, w, h, 4)
      .fill({ color: active ? 0x1a3a1a : 0x2a1a1a })
      .roundRect(0, 0, w, h, 4)
      .stroke({ color: active ? 0x44aa66 : 0xaa4444, width: 1.5 });
    this._aiToggleLabel.text = active
      ? "P2: AI  [click to disable]"
      : "P2: HUMAN  [click to enable AI]";
    this._aiToggleLabel.style.fill = active ? 0x88ffaa : 0xff8888;
  }

  private _refreshDifficultyBtns(w: number, h: number): void {
    for (let i = 0; i < this._difficultyBtns.length; i++) {
      const entry = this._difficultyBtns[i];
      const selected = i === this._selectedDifficultyIndex;

      entry.bg.clear();
      entry.bg
        .roundRect(0, 0, w, h, 4)
        .fill({ color: selected ? 0x1a2e1a : 0x12121e })
        .roundRect(0, 0, w, h, 4)
        .stroke({
          color: selected ? 0xffd700 : 0x334455,
          width: selected ? 1.5 : 1,
        });
      entry.label.style = selected ? STYLE_SIZE_ACTIVE : STYLE_SIZE_INACTIVE;
    }
  }

  private _refreshDmgToggle(w: number, h: number): void {
    const active = this._damageNumbers;
    this._dmgToggleBg.clear();
    this._dmgToggleBg
      .roundRect(0, 0, w, h, 4)
      .fill({ color: active ? 0x1a3a1a : 0x2a1a1a })
      .roundRect(0, 0, w, h, 4)
      .stroke({ color: active ? 0x44aa66 : 0xaa4444, width: 1.5 });
    this._dmgToggleLabel.text = active
      ? "ON  [click to disable]"
      : "OFF  [click to enable]";
    this._dmgToggleLabel.style.fill = active ? 0x88ffaa : 0xff8888;
  }

  private _refreshTypeBtns(w: number, h: number): void {
    for (let i = 0; i < this._typeBtns.length; i++) {
      const entry = this._typeBtns[i];
      const selected = i === this._selectedTypeIndex;
      const locked = entry.locked;

      entry.bg.clear();
      if (locked) {
        entry.bg
          .roundRect(0, 0, w, h, 4)
          .fill({ color: 0x0d0d1a })
          .roundRect(0, 0, w, h, 4)
          .stroke({ color: 0x223333, width: 1 });
        entry.label.style = STYLE_MODE_DISABLED;
      } else if (selected) {
        entry.bg
          .roundRect(0, 0, w, h, 4)
          .fill({ color: 0x1a2e1a })
          .roundRect(0, 0, w, h, 4)
          .stroke({ color: 0xffd700, width: 1.5 });
        entry.label.style = STYLE_SIZE_ACTIVE;
      } else {
        entry.bg
          .roundRect(0, 0, w, h, 4)
          .fill({ color: 0x12121e })
          .roundRect(0, 0, w, h, 4)
          .stroke({ color: 0x334455, width: 1 });
        entry.label.style = STYLE_SIZE_INACTIVE;
      }
    }
  }

  private _refreshSizeBtns(w: number, h: number): void {
    for (let i = 0; i < this._sizeBtns.length; i++) {
      const entry = this._sizeBtns[i] as {
        bg: Graphics;
        label: Text;
        dim: Text;
      };
      const selected = i === this._selectedSizeIndex;

      entry.bg.clear();
      entry.bg
        .roundRect(0, 0, w, h, 4)
        .fill({ color: selected ? 0x1a2e1a : 0x12121e })
        .roundRect(0, 0, w, h, 4)
        .stroke({
          color: selected ? 0xffd700 : 0x334455,
          width: selected ? 1.5 : 1,
        });

      const style = selected ? STYLE_SIZE_ACTIVE : STYLE_SIZE_INACTIVE;
      entry.label.style = style;
      entry.dim.style = style;
    }
  }

  private _refreshPlayerCountBtns(w: number, h: number): void {
    for (let i = 0; i < this._playerCountBtns.length; i++) {
      const entry = this._playerCountBtns[i];
      const count = i + 2;
      const selected = count === this._playerCount;
      const disabled = count > 2 && this._selectedSizeIndex === 0;

      entry.bg.clear();
      if (disabled) {
        entry.bg
          .roundRect(0, 0, w, h, 4)
          .fill({ color: 0x0d0d1a })
          .roundRect(0, 0, w, h, 4)
          .stroke({ color: 0x223333, width: 1 });
        entry.label.style = STYLE_MODE_DISABLED;
      } else if (selected) {
        entry.bg
          .roundRect(0, 0, w, h, 4)
          .fill({ color: 0x1a2e1a })
          .roundRect(0, 0, w, h, 4)
          .stroke({ color: 0xffd700, width: 1.5 });
        entry.label.style = STYLE_SIZE_ACTIVE;
      } else {
        entry.bg
          .roundRect(0, 0, w, h, 4)
          .fill({ color: 0x12121e })
          .roundRect(0, 0, w, h, 4)
          .stroke({ color: 0x334455, width: 1 });
        entry.label.style = STYLE_SIZE_INACTIVE;
      }
    }
  }

  private _refreshGrailGreedToggle(w: number, h: number): void {
    const active = this._grailGreed;
    this._grailGreedBg.clear();
    this._grailGreedBg
      .roundRect(0, 0, w, h, 4)
      .fill({ color: active ? 0x2a1a2a : 0x1a1a1a })
      .roundRect(0, 0, w, h, 4)
      .stroke({ color: active ? 0x9944cc : 0x555555, width: 1.5 });
    this._grailGreedLabel.text = active
      ? "CORRUPTION: ON  [click to disable]"
      : "CORRUPTION: OFF  [click to enable]";
    this._grailGreedLabel.style.fill = active ? 0xcc88ff : 0x888888;
  }

  private _refreshRandomEventsToggle(w: number, h: number): void {
    const active = this._randomEvents;
    this._randomEventsBg.clear();
    this._randomEventsBg
      .roundRect(0, 0, w, h, 4)
      .fill({ color: active ? 0x1a2a2a : 0x1a1a1a })
      .roundRect(0, 0, w, h, 4)
      .stroke({ color: active ? 0x44aaaa : 0x555555, width: 1.5 });
    this._randomEventsLabel.text = active
      ? "EVENTS: ON  [click to disable]"
      : "EVENTS: OFF  [click to enable]";
    this._randomEventsLabel.style.fill = active ? 0x88ffdd : 0x888888;
  }

  private _refreshScalingDifficultyToggle(w: number, h: number): void {
    const active = this._scalingDifficulty;
    this._scalingDifficultyBg.clear();
    this._scalingDifficultyBg
      .roundRect(0, 0, w, h, 4)
      .fill({ color: active ? 0x2a2a1a : 0x1a1a1a })
      .roundRect(0, 0, w, h, 4)
      .stroke({ color: active ? 0xccaa44 : 0x555555, width: 1.5 });
    this._scalingDifficultyLabel.text = active
      ? "SCALING: ON  [click to disable]"
      : "SCALING: OFF  [click to enable]";
    this._scalingDifficultyLabel.style.fill = active ? 0xffdd66 : 0x888888;
  }

  private _refreshBossWavesToggle(w: number, h: number): void {
    const active = this._bossWaves;
    this._bossWavesBg.clear();
    this._bossWavesBg
      .roundRect(0, 0, w, h, 4)
      .fill({ color: active ? 0x2a1a1a : 0x1a1a1a })
      .roundRect(0, 0, w, h, 4)
      .stroke({ color: active ? 0xcc4444 : 0x555555, width: 1.5 });
    this._bossWavesLabel.text = active
      ? "BOSS: ON  [click to disable]"
      : "BOSS: OFF  [click to enable]";
    this._bossWavesLabel.style.fill = active ? 0xff6666 : 0x888888;
  }

  private _refreshWaveIntroToggle(w: number, h: number): void {
    const active = this._waveIntro;
    this._waveIntroBg.clear();
    this._waveIntroBg
      .roundRect(0, 0, w, h, 4)
      .fill({ color: active ? 0x1a2a2a : 0x1a1a1a })
      .roundRect(0, 0, w, h, 4)
      .stroke({ color: active ? 0x44aaaa : 0x555555, width: 1.5 });
    this._waveIntroLabel.text = active
      ? "INTRO: ON  [click to disable]"
      : "INTRO: OFF  [click to enable]";
    this._waveIntroLabel.style.fill = active ? 0x66dddd : 0x888888;
  }

  private _formatGold(): string {
    return this._battlefieldGold.toLocaleString() + " GOLD";
  }

  private _refreshAllianceToggles(): void {
    const allyW = (this._screen2CardW - 40 - 8) / 2;
    const allyH = 24;

    const p3Active = this._playerCount >= 3;
    const p3Allied = this._p3Allied && p3Active;
    this._p3AllyBg.clear();
    this._p3AllyBg
      .roundRect(0, 0, allyW, allyH, 4)
      .fill({ color: !p3Active ? 0x0d0d1a : p3Allied ? 0x1a3a1a : 0x2a1a1a })
      .roundRect(0, 0, allyW, allyH, 4)
      .stroke({ color: !p3Active ? 0x223333 : p3Allied ? 0x44aa66 : 0xaa4444, width: 1 });
    this._p3AllyLabel.text = p3Active ? (p3Allied ? "P3 ALLIED" : "P3 ENEMY") : "P3 ---";
    this._p3AllyLabel.style = !p3Active ? STYLE_MODE_DISABLED : p3Allied ? STYLE_SIZE_ACTIVE : STYLE_SIZE_INACTIVE;
    this._p3AllyContainer.cursor = p3Active ? "pointer" : "default";

    const p4Active = this._playerCount >= 4;
    const p4Allied = this._p4Allied && p4Active;
    this._p4AllyBg.clear();
    this._p4AllyBg
      .roundRect(0, 0, allyW, allyH, 4)
      .fill({ color: !p4Active ? 0x0d0d1a : p4Allied ? 0x1a3a1a : 0x2a1a1a })
      .roundRect(0, 0, allyW, allyH, 4)
      .stroke({ color: !p4Active ? 0x223333 : p4Allied ? 0x44aa66 : 0xaa4444, width: 1 });
    this._p4AllyLabel.text = p4Active ? (p4Allied ? "P4 ALLIED" : "P4 ENEMY") : "P4 ---";
    this._p4AllyLabel.style = !p4Active ? STYLE_MODE_DISABLED : p4Allied ? STYLE_SIZE_ACTIVE : STYLE_SIZE_INACTIVE;
    this._p4AllyContainer.cursor = p4Active ? "pointer" : "default";
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    this._bg.clear();
    this._bg.rect(0, 0, sw, sh).fill({ color: BG_COLOR });

    // Draw vignette
    this._drawVignette(sw, sh);

    // Draw hex grid background
    this._drawHexGrid(sw, sh);

    this._particles.resize(sw, sh);

    if (this._screen1?.visible) {
      // Center the wide card, or offset if there's room for the building renderer
      const hasRoom = sw > this._screen1CardW + 260;
      const cardX = hasRoom
        ? Math.floor((sw - this._screen1CardW) / 2) - 100
        : Math.floor((sw - this._screen1CardW) / 2);
      const naturalY = Math.max(8, Math.floor((sh - this._screen1CardH) / 2));
      const cardY = naturalY - this._scrollY;
      this._screen1Card.position.set(cardX, cardY);

      // Position building renderer to the right of the card
      if (this._buildingContainer) {
        const previewW = 180;
        const previewH = 220;
        const bx = cardX + this._screen1CardW + 30;
        const by = cardY + Math.floor((this._screen1CardH - previewH) / 2);

        this._buildingPreviewGfx.clear()
          .roundRect(0, 0, previewW, previewH, 8)
          .fill({ color: 0x0a0a18, alpha: 0.9 })
          .roundRect(0, 0, previewW, previewH, 8)
          .stroke({ color: BORDER_COLOR, alpha: 0.3, width: 1.5 });

        const groundY = previewH * 0.72;
        this._buildingPreviewGfx
          .rect(0, groundY, previewW, previewH - groundY)
          .fill({ color: 0x2a3a1a, alpha: 0.6 });
        this._buildingPreviewGfx
          .moveTo(0, groundY).lineTo(previewW, groundY)
          .stroke({ color: 0x4a6a2a, width: 1, alpha: 0.5 });

        this._buildingContainer.position.set(bx, by);

        if (this._buildingRenderer) {
          const rc = this._buildingRenderer.container;
          const bounds = rc.getLocalBounds();
          const bw = bounds.width || 128;
          const bh = bounds.height || 128;
          const fitW = previewW - 20;
          const fitH = previewH - 20;
          const scale = Math.min(fitW / bw, fitH / bh, 1.3);
          rc.scale.set(scale);
          rc.x = (previewW - bw * scale) / 2 - bounds.x * scale;
          rc.y = (previewH - bh * scale) / 2 - bounds.y * scale;
        }

        this._buildingContainer.visible = hasRoom;
      }

      // Position side pillars
      if (this._sidePillarLeft && this._sidePillarRight) {
        const pillarH = Math.min(this._screen1CardH * 0.6, 400);
        const py = cardY + Math.floor((this._screen1CardH - pillarH) / 2);
        this._sidePillarLeft.position.set(cardX - 26, py);
        this._sidePillarRight.position.set(cardX + this._screen1CardW + 26, py);
        this._sidePillarLeft.visible = sw > this._screen1CardW + 80;
        this._sidePillarRight.visible = sw > this._screen1CardW + 80;
      }
    }

    if (this._screen2?.visible) {
      this._screen2Card.position.set(
        Math.floor((sw - this._screen2CardW) / 2),
        Math.floor((sh - this._screen2CardH) / 2),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Enhanced decoration helpers
  // ---------------------------------------------------------------------------

  private _drawHexGrid(sw: number, sh: number): void {
    this._bgHexGrid.clear();
    const hexSize = 36;
    const hexH = hexSize * Math.sqrt(3);
    let count = 0;

    // Batch all hex edges into one path, then stroke once
    for (let row = -1; row * hexH * 0.5 < sh + hexH; row++) {
      for (let col = -1; col * hexSize * 1.5 < sw + hexSize * 2; col++) {
        const cx = col * hexSize * 1.5;
        const cy = row * hexH + (col % 2 === 0 ? 0 : hexH * 0.5);
        for (let i = 0; i < 6; i++) {
          const a1 = (i * Math.PI) / 3;
          const a2 = ((i + 1) * Math.PI) / 3;
          const r = hexSize * 0.48;
          this._bgHexGrid
            .moveTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r)
            .lineTo(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
        }
        count++;
      }
    }
    this._bgHexGrid.stroke({ color: 0x14142a, alpha: 0.6, width: 0.5 });
    this._hexCellCount = count;

    // Update polygon count text
    this._updatePolyCount();
  }

  private _initFloatingPolygons(): void {
    const count = 35;
    const colors = [0xffd700, 0x44ddaa, 0xff7744, 0x6699ff, 0x9966ff];
    for (let i = 0; i < count; i++) {
      const gfx = new Graphics();
      const sides = 3 + Math.floor(Math.random() * 4); // 3–6 sides
      const size = 5 + Math.random() * 14;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const alpha = 0.03 + Math.random() * 0.06;

      // Draw polygon outline
      for (let s = 0; s < sides; s++) {
        const a = (s * Math.PI * 2) / sides - Math.PI / 2;
        const px = Math.cos(a) * size;
        const py = Math.sin(a) * size;
        if (s === 0) gfx.moveTo(px, py);
        else gfx.lineTo(px, py);
      }
      gfx.closePath().stroke({ color, alpha: alpha * 3, width: 0.8 });

      // Inner polygon fill (on larger shapes)
      if (size > 10) {
        const innerSize = size * 0.45;
        for (let s = 0; s < sides; s++) {
          const a = (s * Math.PI * 2) / sides;
          const px = Math.cos(a) * innerSize;
          const py = Math.sin(a) * innerSize;
          if (s === 0) gfx.moveTo(px, py);
          else gfx.lineTo(px, py);
        }
        gfx.closePath().fill({ color, alpha: alpha * 1.5 });
      }

      // Center dot
      gfx.circle(0, 0, 1).fill({ color, alpha: alpha * 2 });

      this._floatingPolys.addChild(gfx);
      this._floatingPolyData.push({
        gfx,
        x: Math.random() * 2000,
        y: Math.random() * 1200,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        rot: Math.random() * Math.PI * 2,
        rs: (Math.random() - 0.5) * 0.25,
      });
    }
  }

  private _updateFloatingPolygons(dt: number): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;
    for (const p of this._floatingPolyData) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rs * dt;
      if (p.x < -40) p.x = sw + 40;
      if (p.x > sw + 40) p.x = -40;
      if (p.y < -40) p.y = sh + 40;
      if (p.y > sh + 40) p.y = -40;
      p.gfx.position.set(p.x, p.y);
      p.gfx.rotation = p.rot;
    }
  }

  private _updatePolyCount(): void {
    if (!this._polyCountText) return;
    // Base decorations: arcane circle (~41), header (~8), sub-flourish (~15),
    // inner frame (~20), categories (~60), tile corners (~120), dividers (~20),
    // footer (~10), shield crest (~18), corner circles (4×12=48), runes (~16),
    // badges (~40), pillars (~60), vignette (~8), ticker text (~2)
    const basePolys = 486;
    const floatingPolys = this._floatingPolyData.length * 5;
    const particlePolys = 160;
    const hexPolys = this._hexCellCount * 6;
    const scanPolys = 6;
    const total = basePolys + floatingPolys + particlePolys + hexPolys + scanPolys;
    this._polyCountText.text = `\u25B2 ${total.toLocaleString()} POLYGONS`;
  }

  private _drawVignette(sw: number, sh: number): void {
    this._vignetteGfx.clear();
    // Dark edges vignette using concentric rectangles with increasing alpha
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const inset = (steps - i) * Math.min(sw, sh) * 0.06;
      const alpha = i * 0.012;
      this._vignetteGfx.rect(0, 0, sw, inset).fill({ color: 0x000000, alpha }); // top
      this._vignetteGfx.rect(0, sh - inset, sw, inset).fill({ color: 0x000000, alpha }); // bottom
      this._vignetteGfx.rect(0, 0, inset, sh).fill({ color: 0x000000, alpha }); // left
      this._vignetteGfx.rect(sw - inset, 0, inset, sh).fill({ color: 0x000000, alpha }); // right
    }
    // Subtle color accent at center (faint blue glow)
    const cx = sw / 2, cy = sh / 2;
    const gr = Math.max(sw, sh) * 0.25;
    this._vignetteGfx.circle(cx, cy, gr).fill({ color: 0x1a2a4a, alpha: 0.08 });
    this._vignetteGfx.circle(cx, cy, gr * 0.5).fill({ color: 0x2a3a5a, alpha: 0.04 });
  }

  private _buildSidePillar(cardH: number): Container {
    const pillar = new Container();
    const pw = 18;
    const ph = Math.min(cardH * 0.6, 400);
    const g = new Graphics();

    // Main pillar bar
    g.roundRect(0, 0, pw, ph, 4)
      .fill({ color: 0x0c0c1e, alpha: 0.8 })
      .roundRect(0, 0, pw, ph, 4)
      .stroke({ color: BORDER_COLOR, alpha: 0.12, width: 1 });

    // Inner line
    g.roundRect(3, 8, pw - 6, ph - 16, 2)
      .stroke({ color: BORDER_COLOR, alpha: 0.06, width: 0.5 });

    // Diamond ornaments along the pillar
    const diamondCount = Math.floor(ph / 50);
    for (let i = 0; i < diamondCount; i++) {
      const dy = 20 + (i * (ph - 40)) / Math.max(diamondCount - 1, 1);
      const ds = 4;
      g.moveTo(pw / 2, dy - ds).lineTo(pw / 2 + ds, dy).lineTo(pw / 2, dy + ds).lineTo(pw / 2 - ds, dy).closePath()
        .fill({ color: BORDER_COLOR, alpha: 0.1 })
        .stroke({ color: BORDER_COLOR, alpha: 0.15, width: 0.5 });
      // Inner dot
      g.circle(pw / 2, dy, 1).fill({ color: BORDER_COLOR, alpha: 0.2 });
    }

    // Horizontal tick marks
    for (let i = 0; i < diamondCount * 2; i++) {
      const ty = 12 + (i * (ph - 24)) / (diamondCount * 2 - 1);
      g.moveTo(2, ty).lineTo(pw - 2, ty)
        .stroke({ color: BORDER_COLOR, alpha: 0.03, width: 0.5 });
    }

    // Top cap ornament
    g.moveTo(pw / 2, -6).lineTo(pw / 2 + 5, 2).lineTo(pw / 2 - 5, 2).closePath()
      .fill({ color: BORDER_COLOR, alpha: 0.12 });
    // Bottom cap ornament
    g.moveTo(pw / 2, ph + 6).lineTo(pw / 2 + 5, ph - 2).lineTo(pw / 2 - 5, ph - 2).closePath()
      .fill({ color: BORDER_COLOR, alpha: 0.12 });

    pillar.addChild(g);
    return pillar;
  }
}

export const menuScreen = new MenuScreen();
