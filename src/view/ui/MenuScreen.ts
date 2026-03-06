// Menu screen: two-panel flow
//   Screen 1 — Game mode selection + wiki/utility buttons
//   Screen 2 — Match setup (map type, map size, AI, players, alliances)
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { GameMode, MapType } from "@/types";
import { hasWorldSave } from "@world/state/WorldSerialization";
import { Difficulty, DIFFICULTY_SETTINGS, setDifficulty } from "@sim/config/DifficultyConfig";

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
  { label: "STANDARD", width: BASE_W, height: BASE_H },
  { label: "DOUBLE", width: BASE_W * 2, height: BASE_H * 2 },
  { label: "TRIPLE", width: BASE_W * 3, height: BASE_H * 3 },
  { label: "QUADRUPLE", width: BASE_W * 4, height: BASE_H * 4 },
  { label: "QUINTUPLE", width: BASE_W * 5, height: BASE_H * 5 },
];

interface MapTypeEntry {
  type: MapType;
  label: string;
  locked?: boolean;
}

const MAP_TYPES: MapTypeEntry[] = [
  { type: MapType.MEADOW, label: "MEADOW" },
  { type: MapType.GRASS, label: "GRASS" },
  { type: MapType.PLAINS, label: "PLAINS" },
  { type: MapType.FOREST, label: "FOREST" },
  { type: MapType.FANTASIA, label: "FANTASIA" },
  { type: MapType.TUNDRA, label: "TUNDRA" },
  { type: MapType.SWAMP, label: "SWAMP" },
  { type: MapType.VOLCANIC, label: "VOLCANIC" },
  { type: MapType.OCEAN, label: "OCEAN" },
  { type: MapType.HILLS, label: "HILLS" },
  { type: MapType.MOUNTAINS, label: "MOUNTAINS" },
  { type: MapType.DESERT, label: "DESERT" },
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
  { mode: GameMode.STANDARD, label: "STANDARD", desc: "Classic mode" },
  { mode: GameMode.DEATHMATCH, label: "DEATHMATCH", desc: "10000 gold start" },
  {
    mode: GameMode.BATTLEFIELD,
    label: "BATTLEFIELD",
    desc: "No buildings, last unit wins",
    hidePlayerSetup: true,
  },
  {
    mode: GameMode.ROGUELIKE,
    label: "ROGUELIKE",
    desc: "50% buildings disabled",
  },
  {
    mode: GameMode.CAMPAIGN,
    label: "CAMPAIGN",
    desc: "Story progression",
    skipSetup: true,
  },
  {
    mode: GameMode.WORLD,
    label: "WORLD",
    desc: "Hex-based strategy",
    skipSetup: true,
  },
  {
    mode: GameMode.WAVE,
    label: "WAVE MODE",
    desc: "Endless survival waves",
    hidePlayerSetup: true,
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

  // Callbacks
  onAIToggle: ((isAI: boolean) => void) | null = null;
  onContinue: (() => void) | null = null;
  onQuickPlay: (() => void) | null = null;
  onUnitWiki: (() => void) | null = null;
  onBuildingWiki: (() => void) | null = null;
  onSpellWiki: (() => void) | null = null;
  onMultiplayer: (() => void) | null = null;
  onLoadWorldGame: (() => void) | null = null;
  onSettings: (() => void) | null = null;

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

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    this._buildScreen1();
    this._buildScreen2();

    // Start on screen 1
    this._screen2.visible = false;

    vm.addToLayer("ui", this.container);
    this._layout();
    vm.app.renderer.on("resize", () => this._layout());
  }

  show(): void {
    this.container.visible = true;
    this._showScreen1();
  }

  hide(): void {
    this.container.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Screen 1 — Mode Select
  // ---------------------------------------------------------------------------

  private _showScreen1(): void {
    this._screen1.visible = true;
    this._screen2.visible = false;
    this._layout();
  }

  private _showScreen2(): void {
    this._screen1.visible = false;
    this._screen2.visible = true;

    // Show/hide player section based on mode
    const entry = GAME_MODES[this._selectedModeIndex];
    this._screen2PlayerSection.visible = !entry.hidePlayerSetup;

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
    const title = new Text({ text: "SELECT MODE", style: STYLE_TITLE });
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
            // World / Campaign — go straight to onContinue
            this.onContinue?.();
          } else {
            this._showScreen2();
          }
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

    // Row 1: three wiki buttons side by side
    const wikiW = Math.floor((CW - 40 - utilGap * 2) / 3);
    const unitWikiBtn = makeActionBtn(wikiW, utilBtnH, "UNITS", 0x1a1a3a, 0x4488cc, 0x88bbff, () => this.onUnitWiki?.());
    unitWikiBtn.position.set(20, utilY);
    card.addChild(unitWikiBtn);

    const buildWikiBtn = makeActionBtn(wikiW, utilBtnH, "BUILDINGS", 0x1a2a1a, 0x66aa55, 0x99dd88, () => this.onBuildingWiki?.());
    buildWikiBtn.position.set(20 + wikiW + utilGap, utilY);
    card.addChild(buildWikiBtn);

    const spellWikiBtn = makeActionBtn(wikiW, utilBtnH, "SPELLS", 0x1a1a2a, 0x9966ff, 0xbb88ff, () => this.onSpellWiki?.());
    spellWikiBtn.position.set(20 + (wikiW + utilGap) * 2, utilY);
    card.addChild(spellWikiBtn);

    // Row 2: Quickplay + Multiplayer
    const halfW = Math.floor((CW - 40 - utilGap) / 2);
    const row2Y = utilY + utilBtnH + utilGap;

    const qpBtn = makeActionBtn(halfW, utilBtnH, "QUICKPLAY >>", 0x2a1a0a, 0xcc8833, 0xffcc66, () => this.onQuickPlay?.());
    qpBtn.position.set(20, row2Y);
    card.addChild(qpBtn);

    const mpBtn = makeActionBtn(halfW, utilBtnH, "MULTIPLAYER", 0x1a1a3a, 0x6666cc, 0x9999ff, () => this.onMultiplayer?.());
    mpBtn.position.set(20 + halfW + utilGap, row2Y);
    card.addChild(mpBtn);

    let bottomY = row2Y + utilBtnH + utilGap;

    // Optional: Load World Game
    if (hasWorldSave()) {
      const loadW = CW - 40;
      const loadBtn = makeActionBtn(loadW, utilBtnH, "LOAD WORLD GAME", 0x2a2a1a, 0xaaaa44, 0xdddd66, () => this.onLoadWorldGame?.());
      loadBtn.position.set(20, bottomY);
      card.addChild(loadBtn);
      bottomY += utilBtnH + utilGap;
    }

    // Settings button
    const settingsW = CW - 40;
    const settingsBtn = makeActionBtn(settingsW, utilBtnH, "SETTINGS", 0x1a1a1a, 0x666666, 0xaaaaaa, () => this.onSettings?.());
    settingsBtn.position.set(20, bottomY);
    card.addChild(settingsBtn);
    bottomY += utilBtnH + utilGap;

    this._screen1CardH = bottomY + 8;

    // Redraw card background to final height
    const bg = card.getChildAt(0) as Graphics;
    bg.clear();
    bg.roundRect(0, 0, CW, this._screen1CardH, 8)
      .fill({ color: 0x10102a, alpha: 0.95 })
      .roundRect(0, 0, CW, this._screen1CardH, 8)
      .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 });
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
    const title = new Text({ text: "MATCH SETUP", style: STYLE_TITLE });
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

    const aiLabel = new Text({ text: "P2 CONTROL", style: STYLE_LABEL });
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
    const dmgLabel = new Text({ text: "DAMAGE NUMBERS", style: STYLE_LABEL });
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
    const diffLabel = new Text({ text: "AI DIFFICULTY", style: STYLE_LABEL });
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
    const typeLabel = new Text({ text: "MAP TYPE", style: STYLE_LABEL });
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
    const mapLabel = new Text({ text: "MAP SIZE", style: STYLE_LABEL });
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

    const playersLabel = new Text({ text: "PLAYERS", style: STYLE_LABEL });
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
    const p3Lbl = new Text({ text: "P3 ALLIED", style: STYLE_SIZE_INACTIVE });
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
    const p4Lbl = new Text({ text: "P4 ALLIED", style: STYLE_SIZE_INACTIVE });
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

    // We track two possible curY values — with and without player section
    // The actual card height is computed in _layout based on visibility
    // For now, place the action buttons after player section
    const actionBaseY = curY; // Y where player section starts
    const actionYWithPlayers = actionBaseY + playerSectionH + 14;
    const actionYWithoutPlayers = actionBaseY;

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

    // Override _layout to also reposition action buttons
    const origLayout = this._layout.bind(this);
    this._layout = () => {
      // Position action buttons based on player section visibility
      let actY: number;
      if (this._screen2PlayerSection.visible) {
        actY = actionYWithPlayers;
      } else {
        actY = actionYWithoutPlayers;
      }

      actionBtns.back.position.set(20, actY);
      actionBtns.start.position.set(20, actY + BH + actionBtnGap);

      this._screen2CardH = actY + BH * 2 + actionBtnGap + 18;

      // Redraw screen2 card bg
      const s2bg = this._screen2Card.getChildAt(0) as Graphics;
      s2bg.clear();
      s2bg.roundRect(0, 0, this._screen2CardW, this._screen2CardH, 8)
        .fill({ color: 0x10102a, alpha: 0.95 })
        .roundRect(0, 0, this._screen2CardW, this._screen2CardH, 8)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 });

      origLayout();
    };
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

    if (this._screen1?.visible) {
      this._screen1Card.position.set(
        Math.floor((sw - this._screen1CardW) / 2),
        Math.floor((sh - this._screen1CardH) / 2),
      );
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
