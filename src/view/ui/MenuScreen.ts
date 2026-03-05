// Menu screen: AI toggle + map size selector + game mode selector + Start Game button
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { GameMode, MapType } from "@/types";
import { hasWorldSave } from "@world/state/WorldSerialization";

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
  /** If true, the button is greyed out and unselectable. */
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
  /** Short description shown as tooltip/sub-label. */
  desc: string;
  /** If true, the button is greyed out and unselectable. */
  disabled?: boolean;
}

const GAME_MODES: GameModeEntry[] = [
  { mode: GameMode.STANDARD, label: "STANDARD", desc: "Classic mode" },
  { mode: GameMode.DEATHMATCH, label: "DEATHMATCH", desc: "10000 gold start" },
  {
    mode: GameMode.BATTLEFIELD,
    label: "BATTLEFIELD",
    desc: "No buildings, last unit wins",
  },
  {
    mode: GameMode.ROGUELIKE,
    label: "ROGUELIKE",
    desc: "50% buildings disabled",
  },
  { mode: GameMode.CAMPAIGN, label: "CAMPAIGN", desc: "Story progression" },
  { mode: GameMode.WORLD, label: "WORLD", desc: "Hex-based strategy" },
];

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

export class MenuScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;

  // AI toggle state
  private _p2IsAI = true;
  private _aiToggleBg!: Graphics;
  private _aiToggleLabel!: Text;

  // Player count & alliance state
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
  // Damage numbers toggle state
  private _damageNumbers = true;
  private _dmgToggleBg!: Graphics;
  private _dmgToggleLabel!: Text;

  // Map type state
  private _selectedTypeIndex = 0;
  private _typeBtns: Array<{ bg: Graphics; label: Text; locked: boolean }> = [];

  // Map size state
  private _selectedSizeIndex = 0;
  private _sizeBtns: Array<{ bg: Graphics; label: Text }> = [];

  // Game mode state
  private _selectedModeIndex = 0;
  private _modeBtns: Array<{
    bg: Graphics;
    label: Text;
    desc: Text;
    disabled: boolean;
  }> = [];

  // card stored for layout
  private _card!: Container;
  private _cardW = 400;
  private _cardH = 580;

  onAIToggle: ((isAI: boolean) => void) | null = null;
  /** Called when the player clicks the "SELECT LEADER" button (proceeds to leader select). */
  onContinue: (() => void) | null = null;
  /** Called when the player clicks "QUICKPLAY" — skips all selection screens. */
  onQuickPlay: (() => void) | null = null;
  /** Called when the player clicks "UNIT WIKI" — opens the unit wiki. */
  onUnitWiki: (() => void) | null = null;
  /** Called when the player clicks "BUILDING WIKI" — opens the building wiki. */
  onBuildingWiki: (() => void) | null = null;
  /** Called when the player clicks "SPELL WIKI" — opens the spell wiki. */
  onSpellWiki: (() => void) | null = null;
  /** Called when the player clicks "ONLINE MULTIPLAYER". */
  onMultiplayer: (() => void) | null = null;
  /** Called when the player clicks "LOAD WORLD GAME". */
  onLoadWorldGame: (() => void) | null = null;

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

    // Full-screen background
    this._bg = new Graphics();
    this.container.addChild(this._bg);

    // Card panel
    const CW = this._cardW;
    const CH = this._cardH;
    const card = makePanel(CW, CH);
    this.container.addChild(card);
    this._card = card;

    // Title
    const title = new Text({ text: "MENU", style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CW / 2, 18);
    card.addChild(title);

    // Divider
    card.addChild(
      new Graphics()
        .rect(20, 58, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // --- AI toggle ---
    const aiLabel = new Text({ text: "P2 CONTROL", style: STYLE_LABEL });
    aiLabel.position.set(20, 70);
    card.addChild(aiLabel);

    const TW = CW - 40;
    const TH = 32;
    const toggleBtn = new Container();
    toggleBtn.eventMode = "static";
    toggleBtn.cursor = "pointer";
    toggleBtn.position.set(20, 90);

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

    // Divider
    card.addChild(
      new Graphics()
        .rect(20, 136, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // --- Damage numbers toggle ---
    const dmgLabel = new Text({ text: "DAMAGE NUMBERS", style: STYLE_LABEL });
    dmgLabel.position.set(20, 148);
    card.addChild(dmgLabel);

    const dmgBtn = new Container();
    dmgBtn.eventMode = "static";
    dmgBtn.cursor = "pointer";
    dmgBtn.position.set(20, 168);

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

    // Divider
    card.addChild(
      new Graphics()
        .rect(20, 214, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // --- Map type selector ---
    const typeLabel = new Text({ text: "MAP TYPE", style: STYLE_LABEL });
    typeLabel.position.set(20, 226);
    card.addChild(typeLabel);

    // 8 buttons in 2 rows of 4
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
      typeBtn.position.set(
        20 + col * (tbW + typeGap),
        246 + row * (tbH + typeGap),
      );

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

    // Divider
    const typeEndY = 246 + 2 * (tbH + typeGap) - typeGap;
    card.addChild(
      new Graphics()
        .rect(20, typeEndY + 10, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // --- Map size selector ---
    const mapSizeStartY = typeEndY + 22;
    const mapLabel = new Text({ text: "MAP SIZE", style: STYLE_LABEL });
    mapLabel.position.set(20, mapSizeStartY);
    card.addChild(mapLabel);

    // 4 buttons in a row
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
      sizeBtn.position.set(20 + i * (sbW + gap), mapSizeStartY + 20);

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
        // Reset player count to 2 if STANDARD (only supports 2 players)
        if (idx === 0 && this._playerCount > 2) {
          this._playerCount = 2;
        }
        this._refreshPlayerCountBtns(50, 26);
        this._refreshAllianceToggles();
      });

      card.addChild(sizeBtn);
      this._sizeBtns.push({ bg: sizeBg, label: topLabel });
      // store dim label too for style refresh
      (this._sizeBtns[i] as (typeof this._sizeBtns)[0] & { dim: Text }).dim =
        dimLabel;
    }
    this._refreshSizeBtns(sbW, sbH);

    // Divider
    const sizeEndY = mapSizeStartY + 20 + sbH;
    card.addChild(
      new Graphics()
        .rect(20, sizeEndY + 10, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // --- Game mode selector ---
    const modeStartY = sizeEndY + 22;
    const modeLabel = new Text({ text: "GAME MODE", style: STYLE_LABEL });
    modeLabel.position.set(20, modeStartY);
    card.addChild(modeLabel);

    // 5 buttons — 3 on the first row, 2 on the second (or all in a responsive grid)
    // Layout: 2 columns, 3 rows
    const colCount = 2;
    const modeGap = 6;
    const mbW = Math.floor((CW - 40 - modeGap * (colCount - 1)) / colCount);
    const mbH = 38;

    this._modeBtns = [];
    for (let i = 0; i < GAME_MODES.length; i++) {
      const col = i % colCount;
      const row = Math.floor(i / colCount);
      const modeBtn = new Container();
      modeBtn.eventMode = "static";
      modeBtn.cursor = GAME_MODES[i].disabled ? "default" : "pointer";
      modeBtn.position.set(
        20 + col * (mbW + modeGap),
        modeStartY + 20 + row * (mbH + modeGap),
      );

      const modeBg = new Graphics();
      modeBtn.addChild(modeBg);

      const mLabel = new Text({
        text: GAME_MODES[i].label,
        style: STYLE_MODE_INACTIVE,
      });
      mLabel.anchor.set(0.5, 0);
      mLabel.position.set(mbW / 2, 5);
      modeBtn.addChild(mLabel);

      const dLabel = new Text({
        text: GAME_MODES[i].desc,
        style: STYLE_MODE_INACTIVE,
      });
      dLabel.anchor.set(0.5, 1);
      dLabel.position.set(mbW / 2, mbH - 4);
      modeBtn.addChild(dLabel);

      const idx = i;
      if (!GAME_MODES[i].disabled) {
        modeBtn.on("pointerdown", () => {
          this._selectedModeIndex = idx;
          this._refreshModeBtns(mbW, mbH);
        });
      }

      card.addChild(modeBtn);
      this._modeBtns.push({
        bg: modeBg,
        label: mLabel,
        desc: dLabel,
        disabled: GAME_MODES[i].disabled ?? false,
      });
    }
    this._refreshModeBtns(mbW, mbH);

    // Divider — placed after 3 rows of mode buttons
    const modeRowCount = Math.ceil(GAME_MODES.length / colCount);
    const modeSectionH =
      modeStartY + 20 + modeRowCount * (mbH + modeGap) - modeGap;
    card.addChild(
      new Graphics()
        .rect(20, modeSectionH + 8, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // --- Player count + alliance section ---
    const playerStartY = modeSectionH + 22;
    const playerSection = new Container();
    playerSection.position.set(0, 0);
    card.addChild(playerSection);

    const playersLabel = new Text({ text: "PLAYERS", style: STYLE_LABEL });
    playersLabel.position.set(20, playerStartY);
    playerSection.addChild(playersLabel);

    // 3 buttons: 2, 3, 4
    const pcBtnW = 50;
    const pcBtnH = 26;
    const pcGap = 8;
    this._playerCountBtns = [];
    for (let i = 0; i < 3; i++) {
      const count = i + 2; // 2, 3, 4
      const btn = new Container();
      btn.eventMode = "static";
      btn.cursor = "pointer";
      btn.position.set(20 + i * (pcBtnW + pcGap), playerStartY + 20);

      const bg = new Graphics();
      btn.addChild(bg);

      const lbl = new Text({
        text: String(count),
        style: STYLE_SIZE_INACTIVE,
      });
      lbl.anchor.set(0.5, 0.5);
      lbl.position.set(pcBtnW / 2, pcBtnH / 2);
      btn.addChild(lbl);

      btn.on("pointerdown", () => {
        // Only allow 3/4 on DOUBLE+
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
    const allyY = playerStartY + 52;
    const allyW = (CW - 40 - 8) / 2;
    const allyH = 24;

    // P3 ALLIED
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

    // P4 ALLIED
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

    // Divider after player section
    const playerSectionH = allyY + allyH + 10;
    playerSection.addChild(
      new Graphics()
        .rect(20, playerSectionH, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    const actionStartY = playerSectionH + 14;

    // --- SELECT LEADER button (proceeds to leader selection, not yet starting the game) ---
    const BW = CW - 40;
    const BH = 42;
    const startBtn = new Container();
    startBtn.eventMode = "static";
    startBtn.cursor = "pointer";
    startBtn.position.set(20, actionStartY);

    const startBg = new Graphics()
      .roundRect(0, 0, BW, BH, 6)
      .fill({ color: 0x1a3a1a })
      .roundRect(0, 0, BW, BH, 6)
      .stroke({ color: 0x44aa66, width: 2 });
    startBtn.addChild(startBg);

    const startLabel = new Text({
      text: "SELECT LEADER  >",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 15,
        fill: 0x88ffaa,
        fontWeight: "bold",
        letterSpacing: 2,
      }),
    });
    startLabel.anchor.set(0.5, 0.5);
    startLabel.position.set(BW / 2, BH / 2);
    startBtn.addChild(startLabel);

    startBtn.on("pointerover", () => {
      startBg.tint = 0xaaffcc;
    });
    startBtn.on("pointerout", () => {
      startBg.tint = 0xffffff;
    });
    startBtn.on("pointerdown", () => {
      this.onContinue?.();
    });

    card.addChild(startBtn);

    // --- QUICKPLAY button ---
    const qpBtn = new Container();
    qpBtn.eventMode = "static";
    qpBtn.cursor = "pointer";
    qpBtn.position.set(20, actionStartY + BH + 8);

    const qpBg = new Graphics()
      .roundRect(0, 0, BW, BH, 6)
      .fill({ color: 0x2a1a0a })
      .roundRect(0, 0, BW, BH, 6)
      .stroke({ color: 0xcc8833, width: 2 });
    qpBtn.addChild(qpBg);

    const qpLabel = new Text({
      text: "QUICKPLAY  >>",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 15,
        fill: 0xffcc66,
        fontWeight: "bold",
        letterSpacing: 2,
      }),
    });
    qpLabel.anchor.set(0.5, 0.5);
    qpLabel.position.set(BW / 2, BH / 2);
    qpBtn.addChild(qpLabel);

    qpBtn.on("pointerover", () => {
      qpBg.tint = 0xffddaa;
    });
    qpBtn.on("pointerout", () => {
      qpBg.tint = 0xffffff;
    });
    qpBtn.on("pointerdown", () => {
      this.onQuickPlay?.();
    });

    card.addChild(qpBtn);

    // --- UNIT WIKI button ---
    const wikiBtn = new Container();
    wikiBtn.eventMode = "static";
    wikiBtn.cursor = "pointer";
    wikiBtn.position.set(20, actionStartY + BH + 8 + BH + 8);

    const wikiBg = new Graphics()
      .roundRect(0, 0, BW, BH, 6)
      .fill({ color: 0x1a1a3a })
      .roundRect(0, 0, BW, BH, 6)
      .stroke({ color: 0x4488cc, width: 2 });
    wikiBtn.addChild(wikiBg);

    const wikiLabel = new Text({
      text: "UNIT WIKI",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 15,
        fill: 0x88bbff,
        fontWeight: "bold",
        letterSpacing: 2,
      }),
    });
    wikiLabel.anchor.set(0.5, 0.5);
    wikiLabel.position.set(BW / 2, BH / 2);
    wikiBtn.addChild(wikiLabel);

    wikiBtn.on("pointerover", () => {
      wikiBg.tint = 0xaaddff;
    });
    wikiBtn.on("pointerout", () => {
      wikiBg.tint = 0xffffff;
    });
    wikiBtn.on("pointerdown", () => {
      this.onUnitWiki?.();
    });

    card.addChild(wikiBtn);

    // --- BUILDING WIKI button ---
    const bwBtn = new Container();
    bwBtn.eventMode = "static";
    bwBtn.cursor = "pointer";
    bwBtn.position.set(20, actionStartY + BH + 8 + BH + 8 + BH + 8);

    const bwBg = new Graphics()
      .roundRect(0, 0, BW, BH, 6)
      .fill({ color: 0x1a2a1a })
      .roundRect(0, 0, BW, BH, 6)
      .stroke({ color: 0x66aa55, width: 2 });
    bwBtn.addChild(bwBg);

    const bwLabel = new Text({
      text: "BUILDING WIKI",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 15,
        fill: 0x99dd88,
        fontWeight: "bold",
        letterSpacing: 2,
      }),
    });
    bwLabel.anchor.set(0.5, 0.5);
    bwLabel.position.set(BW / 2, BH / 2);
    bwBtn.addChild(bwLabel);

    bwBtn.on("pointerover", () => {
      bwBg.tint = 0xbbffaa;
    });
    bwBtn.on("pointerout", () => {
      bwBg.tint = 0xffffff;
    });
    bwBtn.on("pointerdown", () => {
      this.onBuildingWiki?.();
    });

    card.addChild(bwBtn);

    // --- SPELL WIKI button ---
    const swBtn = new Container();
    swBtn.eventMode = "static";
    swBtn.cursor = "pointer";
    swBtn.position.set(20, actionStartY + (BH + 8) * 4);

    const swBg = new Graphics()
      .roundRect(0, 0, BW, BH, 6)
      .fill({ color: 0x1a1a2a })
      .roundRect(0, 0, BW, BH, 6)
      .stroke({ color: 0x9966ff, width: 2 });
    swBtn.addChild(swBg);

    const swLabel = new Text({
      text: "SPELL WIKI",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 15,
        fill: 0xbb88ff,
        fontWeight: "bold",
        letterSpacing: 2,
      }),
    });
    swLabel.anchor.set(0.5, 0.5);
    swLabel.position.set(BW / 2, BH / 2);
    swBtn.addChild(swLabel);

    swBtn.on("pointerover", () => { swBg.tint = 0xddbbff; });
    swBtn.on("pointerout", () => { swBg.tint = 0xffffff; });
    swBtn.on("pointerdown", () => { this.onSpellWiki?.(); });

    card.addChild(swBtn);

    // --- ONLINE MULTIPLAYER button ---
    const mpBtn = new Container();
    mpBtn.eventMode = "static";
    mpBtn.cursor = "pointer";
    mpBtn.position.set(20, actionStartY + (BH + 8) * 5);

    const mpBg = new Graphics()
      .roundRect(0, 0, BW, BH, 6)
      .fill({ color: 0x1a1a3a })
      .roundRect(0, 0, BW, BH, 6)
      .stroke({ color: 0x6666cc, width: 2 });
    mpBtn.addChild(mpBg);

    const mpLabel = new Text({
      text: "ONLINE MULTIPLAYER",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 15,
        fill: 0x9999ff,
        fontWeight: "bold",
        letterSpacing: 2,
      }),
    });
    mpLabel.anchor.set(0.5, 0.5);
    mpLabel.position.set(BW / 2, BH / 2);
    mpBtn.addChild(mpLabel);

    mpBtn.on("pointerover", () => { mpBg.tint = 0xccccff; });
    mpBtn.on("pointerout", () => { mpBg.tint = 0xffffff; });
    mpBtn.on("pointerdown", () => { this.onMultiplayer?.(); });

    card.addChild(mpBtn);

    // --- LOAD WORLD GAME button (only visible when a save exists) ---
    if (hasWorldSave()) {
      const loadBtn = new Container();
      loadBtn.eventMode = "static";
      loadBtn.cursor = "pointer";
      loadBtn.position.set(20, actionStartY + (BH + 8) * 6);

      const loadBg = new Graphics()
        .roundRect(0, 0, BW, BH, 6)
        .fill({ color: 0x2a2a1a })
        .roundRect(0, 0, BW, BH, 6)
        .stroke({ color: 0xaaaa44, width: 2 });
      loadBtn.addChild(loadBg);

      const loadLabel = new Text({
        text: "LOAD WORLD GAME",
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 15,
          fill: 0xdddd66,
          fontWeight: "bold",
          letterSpacing: 2,
        }),
      });
      loadLabel.anchor.set(0.5, 0.5);
      loadLabel.position.set(BW / 2, BH / 2);
      loadBtn.addChild(loadLabel);

      loadBtn.on("pointerover", () => { loadBg.tint = 0xffffaa; });
      loadBtn.on("pointerout", () => { loadBg.tint = 0xffffff; });
      loadBtn.on("pointerdown", () => { this.onLoadWorldGame?.(); });

      card.addChild(loadBtn);
    }

    // Adjust card height dynamically
    const totalButtons = hasWorldSave() ? 7 : 6;
    this._cardH = actionStartY + (BH + 8) * totalButtons + 18;

    vm.addToLayer("ui", this.container);
    this._layout();

    vm.app.renderer.on("resize", () => this._layout());
  }

  show(): void {
    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Private
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

  private _refreshModeBtns(w: number, h: number): void {
    for (let i = 0; i < this._modeBtns.length; i++) {
      const entry = this._modeBtns[i];
      const selected = i === this._selectedModeIndex;
      const disabled = entry.disabled;

      entry.bg.clear();
      if (disabled) {
        entry.bg
          .roundRect(0, 0, w, h, 4)
          .fill({ color: 0x0d0d1a })
          .roundRect(0, 0, w, h, 4)
          .stroke({ color: 0x223333, width: 1 });
        entry.label.style = STYLE_MODE_DISABLED;
        entry.desc.style = STYLE_MODE_DISABLED;
      } else if (selected) {
        entry.bg
          .roundRect(0, 0, w, h, 4)
          .fill({ color: 0x1a1e2e })
          .roundRect(0, 0, w, h, 4)
          .stroke({ color: 0xffd700, width: 1.5 });
        entry.label.style = STYLE_MODE_ACTIVE;
        entry.desc.style = STYLE_MODE_ACTIVE;
      } else {
        entry.bg
          .roundRect(0, 0, w, h, 4)
          .fill({ color: 0x12121e })
          .roundRect(0, 0, w, h, 4)
          .stroke({ color: 0x334455, width: 1 });
        entry.label.style = STYLE_MODE_INACTIVE;
        entry.desc.style = STYLE_MODE_INACTIVE;
      }
    }
  }

  private _refreshPlayerCountBtns(w: number, h: number): void {
    for (let i = 0; i < this._playerCountBtns.length; i++) {
      const entry = this._playerCountBtns[i];
      const count = i + 2;
      const selected = count === this._playerCount;
      // Only allow 3/4 on DOUBLE+ maps (size index > 0)
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
    const allyW = (this._cardW - 40 - 8) / 2;
    const allyH = 24;

    // P3 toggle
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

    // P4 toggle
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

export const menuScreen = new MenuScreen();
