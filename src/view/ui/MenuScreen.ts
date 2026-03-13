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

const STYLE_MODE_ACTIVE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xffd700,
  fontWeight: "bold",
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
    mode: GameMode.ROGUELIKE,
    label: t("mode.roguelike"),
    desc: t("mode.roguelike_desc"),
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
  },
  {
    mode: GameMode.TEKKEN,
    label: "FIGHTER",
    desc: "Tekken-style 3D fighting game",
    skipSetup: true,
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
  },
  {
    mode: GameMode.MEDIEVAL_GTA_3D,
    label: "GTA 3D",
    desc: "3D Medieval GTA: steal horses in Camelot",
    skipSetup: true,
  },
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
  private _screen1CardW = 380;
  private _screen1CardH = 0; // computed

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

  // Building renderer decoration (castle on screen 1)
  private _buildingRenderer: House1Renderer | null = null;
  private _buildingContainer!: Container;
  private _buildingPreviewGfx!: Graphics;

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

    // Ambient floating particles
    this._particles = new AmbientParticles(120);
    this.container.addChild(this._particles.container);

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
    let bottomY = this._loadWaveBtnSlotY;

    if (this.hasWaveSave) {
      const loadW = CW - 40;
      const loadWaveBtn = makeActionBtn(loadW, this._s1UtilBtnH, "LOAD WAVE GAME", 0x1a2a2a, 0x44aaaa, 0x88ffff, () => this.onLoadWaveGame?.());
      loadWaveBtn.position.set(20, bottomY);
      this._loadWaveBtnSlot.addChild(loadWaveBtn);
      this._s1NavItems.push({ container: loadWaveBtn, action: () => this.onLoadWaveGame?.() });
      bottomY += this._s1UtilBtnH + this._s1UtilGap;
    }

    // Reposition settings and back-to-map buttons, then resize card
    this._s1SettingsBtn.position.set(20, bottomY);
    bottomY += this._s1UtilBtnH + this._s1UtilGap;
    this._s1BackMapBtn.position.set(20, bottomY);
    bottomY += this._s1UtilBtnH + this._s1UtilGap;

    this._screen1CardH = bottomY + 8;

    const bg = this._screen1Card.getChildAt(0) as Graphics;
    bg.clear();
    bg.roundRect(0, 0, CW, this._screen1CardH, 8)
      .fill({ color: 0x10102a, alpha: 0.95 })
      .roundRect(0, 0, CW, this._screen1CardH, 8)
      .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 });

    this._runes1.build(CW, this._screen1CardH);
  }

  // ---------------------------------------------------------------------------
  // Screen 1 — Mode Select
  // ---------------------------------------------------------------------------

  private _showScreen1(): void {
    this._screen1.visible = true;
    this._screen2.visible = false;
    this._s1FocusBorder.visible = false;
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
    const CW = this._screen1CardW;
    this._screen1 = new Container();
    this.container.addChild(this._screen1);

    const card = makePanel(CW, 600); // will resize
    this._screen1.addChild(card);
    this._screen1Card = card;

    // Title
    const title = new Text({ text: t("menu.select_mode"), style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CW / 2, 18);
    card.addChild(title);

    // Divider
    card.addChild(
      new Graphics()
        .rect(20, 58, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // Mode buttons — single column, full width
    const mbW = CW - 40;
    const mbH = 38;
    const modeGap = 5;
    const modeStartY = 70;

    this._s1NavItems = [];

    for (let i = 0; i < GAME_MODES.length; i++) {
      const entry = GAME_MODES[i];
      const modeBtn = new Container();
      modeBtn.eventMode = "static";
      modeBtn.cursor = entry.disabled ? "default" : "pointer";
      modeBtn.position.set(20, modeStartY + i * (mbH + modeGap));

      const modeBg = new Graphics();
      modeBtn.addChild(modeBg);

      const mLabel = new Text({ text: entry.label, style: STYLE_MODE_INACTIVE });
      mLabel.anchor.set(0, 0.5);
      mLabel.position.set(12, mbH / 2);
      modeBtn.addChild(mLabel);

      const dLabel = new Text({ text: entry.desc, style: STYLE_LABEL });
      dLabel.anchor.set(1, 0.5);
      dLabel.position.set(mbW - 12, mbH / 2);
      modeBtn.addChild(dLabel);

      // Draw bg
      const drawBg = (selected: boolean) => {
        modeBg.clear();
        if (entry.disabled) {
          modeBg
            .roundRect(0, 0, mbW, mbH, 4)
            .fill({ color: 0x0d0d1a })
            .roundRect(0, 0, mbW, mbH, 4)
            .stroke({ color: 0x223333, width: 1 });
          mLabel.style = STYLE_MODE_DISABLED;
          dLabel.style = STYLE_MODE_DISABLED;
        } else if (selected) {
          modeBg
            .roundRect(0, 0, mbW, mbH, 4)
            .fill({ color: 0x1a1e2e })
            .roundRect(0, 0, mbW, mbH, 4)
            .stroke({ color: 0xffd700, width: 1.5 });
          mLabel.style = STYLE_MODE_ACTIVE;
        } else {
          modeBg
            .roundRect(0, 0, mbW, mbH, 4)
            .fill({ color: 0x12121e })
            .roundRect(0, 0, mbW, mbH, 4)
            .stroke({ color: 0x334455, width: 1 });
          mLabel.style = STYLE_MODE_INACTIVE;
        }
      };

      drawBg(i === this._selectedModeIndex);

      const idx = i;
      if (!entry.disabled) {
        modeBtn.on("pointerover", () => {
          modeBg.clear();
          modeBg
            .roundRect(0, 0, mbW, mbH, 4)
            .fill({ color: 0x1a2a3a })
            .roundRect(0, 0, mbW, mbH, 4)
            .stroke({ color: 0x6688aa, width: 1.5 });
        });
        modeBtn.on("pointerout", () => {
          drawBg(idx === this._selectedModeIndex);
        });
        modeBtn.on("pointerdown", () => {
          this._selectedModeIndex = idx;
          if (entry.skipSetup) {
            this.onContinue?.();
          } else {
            this._showScreen2();
          }
        });

        // Register for keyboard navigation
        this._s1NavItems.push({
          container: modeBtn,
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

      card.addChild(modeBtn);
    }

    // Divider after modes
    const modesEndY = modeStartY + GAME_MODES.length * (mbH + modeGap);
    card.addChild(
      new Graphics()
        .rect(20, modesEndY, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // Utility buttons — compact row layout
    const utilY = modesEndY + 12;
    const utilBtnH = 34;
    const utilGap = 6;

    // Row 1: Wiki button (full width)
    const fullW = CW - 40;
    const wikiBtn = makeActionBtn(fullW, utilBtnH, "WIKI", 0x1a1a3a, 0x4488cc, 0x88bbff, () => this.onWiki?.());
    wikiBtn.position.set(20, utilY);
    card.addChild(wikiBtn);
    this._s1NavItems.push({ container: wikiBtn, action: () => this.onWiki?.() });

    // Row 2: Quickplay + Multiplayer
    const halfW = Math.floor((CW - 40 - utilGap) / 2);
    const row2Y = utilY + utilBtnH + utilGap;

    const qpBtn = makeActionBtn(halfW, utilBtnH, "QUICKPLAY >>", 0x2a1a0a, 0xcc8833, 0xffcc66, () => this.onQuickPlay?.());
    qpBtn.position.set(20, row2Y);
    card.addChild(qpBtn);
    this._s1NavItems.push({ container: qpBtn, action: () => this.onQuickPlay?.() });

    const mpBtn = makeActionBtn(halfW, utilBtnH, "MULTIPLAYER", 0x1a1a3a, 0x6666cc, 0x9999ff, () => this.onMultiplayer?.());
    mpBtn.position.set(20 + halfW + utilGap, row2Y);
    card.addChild(mpBtn);
    this._s1NavItems.push({ container: mpBtn, action: () => this.onMultiplayer?.() });

    let bottomY = row2Y + utilBtnH + utilGap;

    // Optional: Load World Game
    if (hasWorldSave()) {
      const loadW = CW - 40;
      const loadBtn = makeActionBtn(loadW, utilBtnH, "LOAD WORLD GAME", 0x2a2a1a, 0xaaaa44, 0xdddd66, () => this.onLoadWorldGame?.());
      loadBtn.position.set(20, bottomY);
      card.addChild(loadBtn);
      this._s1NavItems.push({ container: loadBtn, action: () => this.onLoadWorldGame?.() });
      bottomY += utilBtnH + utilGap;
    }

    // Dynamic slot: Load Wave Game (rebuilt on show())
    this._loadWaveBtnSlot = new Container();
    this._loadWaveBtnSlotY = bottomY;
    this._loadWaveBtnSlot.position.set(0, 0);
    card.addChild(this._loadWaveBtnSlot);

    // Settings button (repositioned dynamically by _rebuildLoadWaveButton)
    const settingsW = CW - 40;
    const settingsBtn = makeActionBtn(settingsW, utilBtnH, "SETTINGS", 0x1a1a1a, 0x666666, 0xaaaaaa, () => this.onSettings?.());
    settingsBtn.position.set(20, bottomY);
    card.addChild(settingsBtn);
    this._s1NavItems.push({ container: settingsBtn, action: () => this.onSettings?.() });
    bottomY += utilBtnH + utilGap;

    // Back to Map button
    const backMapBtn = makeActionBtn(CW - 40, utilBtnH, "\u25c0 BACK TO MAP", 0x1a2a1a, 0x55aa55, 0x88dd88, () => this.onBackToMap?.());
    backMapBtn.position.set(20, bottomY);
    card.addChild(backMapBtn);
    this._s1NavItems.push({ container: backMapBtn, action: () => this.onBackToMap?.() });
    bottomY += utilBtnH + utilGap;

    this._screen1CardH = bottomY + 8;

    // Store refs for dynamic repositioning
    this._s1SettingsBtn = settingsBtn;
    this._s1BackMapBtn = backMapBtn;
    this._s1UtilBtnH = utilBtnH;
    this._s1UtilGap = utilGap;

    // Redraw card background to final height
    const bg = card.getChildAt(0) as Graphics;
    bg.clear();
    bg.roundRect(0, 0, CW, this._screen1CardH, 8)
      .fill({ color: 0x10102a, alpha: 0.95 })
      .roundRect(0, 0, CW, this._screen1CardH, 8)
      .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 });

    // Focus border for keyboard navigation (rendered on top of everything)
    this._s1FocusBorder = new Graphics();
    this._s1FocusBorder.visible = false;
    card.addChild(this._s1FocusBorder);

    // Rune corner diamonds
    this._runes1 = new RuneCorners();
    this._runes1.build(CW, this._screen1CardH);
    card.addChild(this._runes1.container);

    // Animated castle renderer beside the card
    this._buildingContainer = new Container();
    this._screen1.addChild(this._buildingContainer);

    // Dark preview backdrop
    this._buildingPreviewGfx = new Graphics();
    this._buildingContainer.addChild(this._buildingPreviewGfx);

    // Create the castle renderer
    this._buildingRenderer = new House1Renderer(null);
    this._buildingContainer.addChild(this._buildingRenderer.container);

    // Keyboard listener
    this._onKeydown = (e: KeyboardEvent) => {
      if (!this.container.visible || !this._screen1.visible) return;
      if (this._s1NavItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        this._s1FocusIndex = (this._s1FocusIndex + 1) % this._s1NavItems.length;
        this._updateS1Focus();
      } else if (e.key === "ArrowUp") {
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

    this._particles.resize(sw, sh);

    if (this._screen1?.visible) {
      // Offset card slightly left to make room for the building renderer
      const cardX = Math.floor((sw - this._screen1CardW) / 2) - 80;
      const cardY = Math.floor((sh - this._screen1CardH) / 2);
      this._screen1Card.position.set(cardX, cardY);

      // Position building renderer to the right of the card
      if (this._buildingContainer) {
        const previewW = 180;
        const previewH = 220;
        const bx = cardX + this._screen1CardW + 30;
        const by = cardY + Math.floor((this._screen1CardH - previewH) / 2);

        // Dark backdrop with gold border
        this._buildingPreviewGfx.clear()
          .roundRect(0, 0, previewW, previewH, 8)
          .fill({ color: 0x0a0a18, alpha: 0.9 })
          .roundRect(0, 0, previewW, previewH, 8)
          .stroke({ color: BORDER_COLOR, alpha: 0.3, width: 1.5 });

        // Ground plane
        const groundY = previewH * 0.72;
        this._buildingPreviewGfx
          .rect(0, groundY, previewW, previewH - groundY)
          .fill({ color: 0x2a3a1a, alpha: 0.6 });
        this._buildingPreviewGfx
          .moveTo(0, groundY).lineTo(previewW, groundY)
          .stroke({ color: 0x4a6a2a, width: 1, alpha: 0.5 });

        // "MAIN MENU" label below the preview
        // (use a Graphics text approach — will be added as Text in init, but for simplicity redraw)
        this._buildingContainer.position.set(bx, by);

        // Scale and center the castle renderer inside the preview
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

        // Only show if there's enough room (screen wider than ~700px)
        this._buildingContainer.visible = sw > 700;
      }
    }

    if (this._screen2?.visible) {
      this._screen2Card.position.set(
        Math.floor((sw - this._screen2CardW) / 2),
        Math.floor((sh - this._screen2CardH) / 2),
      );
    }
  }
}

export const menuScreen = new MenuScreen();
