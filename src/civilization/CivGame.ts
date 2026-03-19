// ============================================================================
// CivGame.ts — Main game orchestrator for Arthurian Civilization
// ============================================================================

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import {
  CIV_FACTIONS, CIV_UNIT_DEFS, CIV_DIFFICULTY, MAP_PRESETS,
  CHIVALRY_EVENTS, CIV_HEROES,
} from "./CivConfig";
import {
  type CivGameState,
  createCivGameState, getUnit, getCity,
  moveUnitTo, foundCity, removeUnit,
  resolveCombat, getReachableTiles, getAttackableTiles, findPath,
  setResearch, getAvailableTechs, processEndTurn, advanceTurn,
  updateFogOfWar, setDiplomacyRelation, isAtWar, addEvent,
  startImprovement, recruitHero, getAvailableHeroes,
  useHeroAbility,
} from "./CivState";
import { CivRenderer } from "./CivRenderer";
import { CivHUD } from "./CivHUD";
import { CivAI } from "./CivAI";

// ---------------------------------------------------------------------------
// Text styles for setup screen
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "serif",
  fontSize: 48,
  fontWeight: "bold",
  fill: 0xFFD700,
  stroke: { color: 0x442200, width: 4 },
  align: "center",
  dropShadow: {
    color: 0x000000,
    blur: 6,
    angle: Math.PI / 4,
    distance: 4,
  },
});

const SUBTITLE_STYLE = new TextStyle({
  fontFamily: "serif",
  fontSize: 18,
  fontStyle: "italic",
  fill: 0xCCAA66,
  align: "center",
});

const LABEL_STYLE = new TextStyle({
  fontFamily: "sans-serif",
  fontSize: 16,
  fontWeight: "bold",
  fill: 0xDDCCAA,
  align: "left",
});

const FACTION_NAME_STYLE = new TextStyle({
  fontFamily: "sans-serif",
  fontSize: 14,
  fontWeight: "bold",
  fill: 0xFFFFFF,
  align: "left",
});

const FACTION_LEADER_STYLE = new TextStyle({
  fontFamily: "sans-serif",
  fontSize: 11,
  fontStyle: "italic",
  fill: 0xBBBBBB,
  align: "left",
});

const FACTION_DESC_STYLE = new TextStyle({
  fontFamily: "sans-serif",
  fontSize: 12,
  fill: 0xCCCCCC,
  align: "left",
  wordWrap: true,
  wordWrapWidth: 360,
});

const OPTION_STYLE = new TextStyle({
  fontFamily: "sans-serif",
  fontSize: 14,
  fill: 0xFFFFFF,
  align: "center",
});

const OPTION_ACTIVE_STYLE = new TextStyle({
  fontFamily: "sans-serif",
  fontSize: 14,
  fontWeight: "bold",
  fill: 0xFFD700,
  align: "center",
});

const BUTTON_STYLE = new TextStyle({
  fontFamily: "serif",
  fontSize: 28,
  fontWeight: "bold",
  fill: 0xFFFFFF,
  align: "center",
});

// ---------------------------------------------------------------------------
// CivGame — main orchestrator
// ---------------------------------------------------------------------------

export class CivGame {
  private state: CivGameState | null = null;
  private renderer: CivRenderer;
  private hud: CivHUD;
  private tickerFn: ((ticker: { deltaTime: number }) => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private mouseHandler: ((e: MouseEvent) => void) | null = null;
  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  private keysDown = new Set<string>();
  private idleCityQueue: number[] = [];

  // Setup screen state
  private setupContainer: Container | null = null;
  private setupSelection = {
    faction: 0,
    difficulty: 2,
    mapPreset: 1,
    opponents: 4,
  };

  constructor() {
    this.renderer = new CivRenderer();
    this.hud = new CivHUD();
  }

  // -------------------------------------------------------------------------
  // Public lifecycle
  // -------------------------------------------------------------------------

  async boot(): Promise<void> {
    viewManager.clearWorld();
    this._showSetupScreen();
  }

  destroy(): void {
    // Remove ticker
    if (this.tickerFn) {
      viewManager.app.ticker.remove(this.tickerFn);
      this.tickerFn = null;
    }

    // Remove keyboard listeners
    if (this.keyHandler) {
      window.removeEventListener("keydown", this.keyHandler);
      window.removeEventListener("keyup", this.keyHandler);
      this.keyHandler = null;
    }

    // Remove mouse/pointer listener
    if (this.mouseHandler) {
      viewManager.app.canvas.removeEventListener("pointerdown", this.mouseHandler as EventListener);
      this.mouseHandler = null;
    }

    // Remove wheel listener
    if (this.wheelHandler) {
      viewManager.app.canvas.removeEventListener("wheel", this.wheelHandler);
      this.wheelHandler = null;
    }

    // Destroy setup screen if still showing
    if (this.setupContainer) {
      this.setupContainer.destroy({ children: true });
      this.setupContainer = null;
    }

    // Destroy renderer and HUD
    if (this.state) {
      this.renderer.destroy();
      this.hud.destroy();
    }

    this.keysDown.clear();
    this.state = null;

    viewManager.clearWorld();
  }

  // -------------------------------------------------------------------------
  // Setup Screen
  // -------------------------------------------------------------------------

  private _showSetupScreen(): void {
    this.setupContainer = new Container();
    viewManager.layers.ui.addChild(this.setupContainer);

    const screen = viewManager.app.screen;
    const centerX = screen.width / 2;

    // Dark background
    const bg = new Graphics();
    bg.rect(0, 0, screen.width, screen.height);
    bg.fill({ color: 0x0A0A14, alpha: 1 });
    this.setupContainer.addChild(bg);

    // Decorative border frame
    const frame = new Graphics();
    frame.rect(20, 20, screen.width - 40, screen.height - 40);
    frame.stroke({ color: 0x665522, width: 3, alpha: 0.6 });
    frame.rect(25, 25, screen.width - 50, screen.height - 50);
    frame.stroke({ color: 0x332200, width: 1, alpha: 0.3 });
    this.setupContainer.addChild(frame);

    // Title
    const title = new Text({ text: "ARTHURIAN CIVILIZATION", style: TITLE_STYLE });
    title.anchor.set(0.5, 0);
    title.position.set(centerX, 40);
    this.setupContainer.addChild(title);

    // Subtitle
    const subtitle = new Text({
      text: "Forge thy kingdom in the age of legends",
      style: SUBTITLE_STYLE,
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(centerX, 95);
    this.setupContainer.addChild(subtitle);

    // Decorative divider line below title
    const divider = new Graphics();
    divider.moveTo(centerX - 200, 125);
    divider.lineTo(centerX + 200, 125);
    divider.stroke({ color: 0x665522, width: 2, alpha: 0.5 });
    this.setupContainer.addChild(divider);

    // Layout columns: factions on the left, options on the right
    const leftX = 60;
    const rightX = screen.width / 2 + 40;
    let yPos = 145;

    // ---- FACTION SELECTOR (left column) ----
    const factionLabel = new Text({ text: "Choose Thy Realm:", style: LABEL_STYLE });
    factionLabel.position.set(leftX, yPos);
    this.setupContainer.addChild(factionLabel);

    yPos += 30;

    const factionButtons: Container[] = [];
    const factionDescText = new Text({
      text: CIV_FACTIONS[this.setupSelection.faction].description,
      style: FACTION_DESC_STYLE,
    });

    for (let i = 0; i < CIV_FACTIONS.length; i++) {
      const faction = CIV_FACTIONS[i];
      const btn = new Container();
      btn.position.set(leftX, yPos + i * 44);
      btn.eventMode = "static";
      btn.cursor = "pointer";

      const btnW = screen.width / 2 - 80;
      const btnH = 40;

      const btnBg = new Graphics();
      btnBg.roundRect(0, 0, btnW, btnH, 4);
      const isSelected = i === this.setupSelection.faction;
      btnBg.fill({ color: isSelected ? 0x2A2A44 : 0x161625, alpha: isSelected ? 1 : 0.8 });
      btnBg.stroke({ color: isSelected ? 0xFFD700 : 0x444444, width: isSelected ? 2 : 1 });
      btn.addChild(btnBg);

      // Color indicator swatch
      const swatch = new Graphics();
      swatch.rect(8, 8, 24, 24);
      swatch.fill({ color: faction.color });
      swatch.stroke({ color: 0x000000, width: 1 });
      btn.addChild(swatch);

      // Faction name
      const nameText = new Text({ text: faction.name, style: FACTION_NAME_STYLE });
      nameText.position.set(40, 5);
      btn.addChild(nameText);

      // Leader name
      const leaderText = new Text({ text: faction.leader, style: FACTION_LEADER_STYLE });
      leaderText.position.set(40, 22);
      btn.addChild(leaderText);

      // Unique unit indicator
      const uniqueTag = new Text({
        text: `[${faction.uniqueUnit}]`,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 10,
          fill: 0x88AACC,
          align: "right",
        }),
      });
      uniqueTag.anchor.set(1, 0.5);
      uniqueTag.position.set(btnW - 10, 20);
      btn.addChild(uniqueTag);

      const factionIndex = i;
      btn.on("pointerdown", () => {
        this.setupSelection.faction = factionIndex;
        this._refreshSetupScreen();
      });

      factionButtons.push(btn);
      this.setupContainer.addChild(btn);
    }

    // Faction description text (below faction list)
    const descY = yPos + CIV_FACTIONS.length * 44 + 10;
    factionDescText.position.set(leftX, descY);
    this.setupContainer.addChild(factionDescText);

    // ---- RIGHT COLUMN: Difficulty, Map, Opponents ----
    let rightY = 145;

    // Difficulty selector
    const diffLabel = new Text({ text: "Difficulty:", style: LABEL_STYLE });
    diffLabel.position.set(rightX, rightY);
    this.setupContainer.addChild(diffLabel);
    rightY += 30;

    for (let i = 0; i < CIV_DIFFICULTY.length; i++) {
      const diff = CIV_DIFFICULTY[i];
      const btn = new Container();
      btn.position.set(rightX + i * 90, rightY);
      btn.eventMode = "static";
      btn.cursor = "pointer";

      const isActive = i === this.setupSelection.difficulty;
      const btnW = 82;
      const btnH = 34;

      const btnBg = new Graphics();
      btnBg.roundRect(0, 0, btnW, btnH, 4);
      btnBg.fill({ color: isActive ? 0x443300 : 0x1A1A2A, alpha: 1 });
      btnBg.stroke({ color: isActive ? 0xFFD700 : 0x555555, width: isActive ? 2 : 1 });
      btn.addChild(btnBg);

      const label = new Text({
        text: diff.name,
        style: isActive ? OPTION_ACTIVE_STYLE : OPTION_STYLE,
      });
      label.anchor.set(0.5, 0.5);
      label.position.set(btnW / 2, btnH / 2);
      btn.addChild(label);

      const diffIdx = i;
      btn.on("pointerdown", () => {
        this.setupSelection.difficulty = diffIdx;
        this._refreshSetupScreen();
      });

      this.setupContainer.addChild(btn);
    }
    rightY += 55;

    // Map size selector
    const mapLabel = new Text({ text: "Map Size:", style: LABEL_STYLE });
    mapLabel.position.set(rightX, rightY);
    this.setupContainer.addChild(mapLabel);
    rightY += 30;

    for (let i = 0; i < MAP_PRESETS.length; i++) {
      const preset = MAP_PRESETS[i];
      const btn = new Container();
      btn.position.set(rightX + i * 140, rightY);
      btn.eventMode = "static";
      btn.cursor = "pointer";

      const isActive = i === this.setupSelection.mapPreset;
      const btnW = 130;
      const btnH = 44;

      const btnBg = new Graphics();
      btnBg.roundRect(0, 0, btnW, btnH, 4);
      btnBg.fill({ color: isActive ? 0x2A3322 : 0x1A1A2A, alpha: 1 });
      btnBg.stroke({ color: isActive ? 0x88CC44 : 0x555555, width: isActive ? 2 : 1 });
      btn.addChild(btnBg);

      const nameText = new Text({
        text: preset.name,
        style: isActive ? OPTION_ACTIVE_STYLE : OPTION_STYLE,
      });
      nameText.anchor.set(0.5, 0.5);
      nameText.position.set(btnW / 2, btnH / 2 - 6);
      btn.addChild(nameText);

      const sizeText = new Text({
        text: `${preset.width} x ${preset.height}`,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 10,
          fill: isActive ? 0xAACC88 : 0x888888,
          align: "center",
        }),
      });
      sizeText.anchor.set(0.5, 0.5);
      sizeText.position.set(btnW / 2, btnH / 2 + 10);
      btn.addChild(sizeText);

      const mapIdx = i;
      btn.on("pointerdown", () => {
        this.setupSelection.mapPreset = mapIdx;
        // Clamp opponents to maxPlayers
        const maxOpp = MAP_PRESETS[mapIdx].maxPlayers - 1;
        if (this.setupSelection.opponents > maxOpp) {
          this.setupSelection.opponents = maxOpp;
        }
        this._refreshSetupScreen();
      });

      this.setupContainer.addChild(btn);
    }
    rightY += 65;

    // Number of opponents selector
    const oppLabel = new Text({ text: "Opponents:", style: LABEL_STYLE });
    oppLabel.position.set(rightX, rightY);
    this.setupContainer.addChild(oppLabel);
    rightY += 30;

    const maxOpp = MAP_PRESETS[this.setupSelection.mapPreset].maxPlayers - 1;
    const minOpp = 2;

    for (let i = minOpp; i <= Math.min(7, maxOpp); i++) {
      const idx = i - minOpp;
      const btn = new Container();
      btn.position.set(rightX + idx * 56, rightY);
      btn.eventMode = "static";
      btn.cursor = "pointer";

      const isActive = i === this.setupSelection.opponents;
      const btnW = 48;
      const btnH = 36;

      const btnBg = new Graphics();
      btnBg.roundRect(0, 0, btnW, btnH, 4);
      btnBg.fill({ color: isActive ? 0x332244 : 0x1A1A2A, alpha: 1 });
      btnBg.stroke({ color: isActive ? 0xAA88FF : 0x555555, width: isActive ? 2 : 1 });
      btn.addChild(btnBg);

      const numText = new Text({
        text: String(i),
        style: isActive ? OPTION_ACTIVE_STYLE : OPTION_STYLE,
      });
      numText.anchor.set(0.5, 0.5);
      numText.position.set(btnW / 2, btnH / 2);
      btn.addChild(numText);

      const oppCount = i;
      btn.on("pointerdown", () => {
        this.setupSelection.opponents = oppCount;
        this._refreshSetupScreen();
      });

      this.setupContainer.addChild(btn);
    }
    rightY += 55;

    // Summary panel
    const summaryBg = new Graphics();
    summaryBg.roundRect(rightX, rightY, 380, 80, 6);
    summaryBg.fill({ color: 0x111122, alpha: 0.9 });
    summaryBg.stroke({ color: 0x444466, width: 1 });
    this.setupContainer.addChild(summaryBg);

    const selectedFaction = CIV_FACTIONS[this.setupSelection.faction];
    const selectedDiff = CIV_DIFFICULTY[this.setupSelection.difficulty];
    const selectedMap = MAP_PRESETS[this.setupSelection.mapPreset];

    const summaryText = new Text({
      text: [
        `Faction: ${selectedFaction.name} (${selectedFaction.leader})`,
        `Difficulty: ${selectedDiff.name}  |  Map: ${selectedMap.name}`,
        `Opponents: ${this.setupSelection.opponents}`,
      ].join("\n"),
      style: new TextStyle({
        fontFamily: "sans-serif",
        fontSize: 13,
        fill: 0xBBBBDD,
        lineHeight: 22,
        align: "left",
      }),
    });
    summaryText.position.set(rightX + 14, rightY + 10);
    this.setupContainer.addChild(summaryText);
    rightY += 100;

    // START GAME button
    const startBtn = new Container();
    const startBtnW = 280;
    const startBtnH = 56;
    const startBtnX = rightX + 50;
    const startBtnY = rightY + 10;
    startBtn.position.set(startBtnX, startBtnY);
    startBtn.eventMode = "static";
    startBtn.cursor = "pointer";

    const startBg = new Graphics();
    startBg.roundRect(0, 0, startBtnW, startBtnH, 8);
    startBg.fill({ color: 0x224400 });
    startBg.stroke({ color: 0x66AA22, width: 3 });
    startBtn.addChild(startBg);

    // Inner glow effect
    const startGlow = new Graphics();
    startGlow.roundRect(3, 3, startBtnW - 6, startBtnH - 6, 6);
    startGlow.fill({ color: 0x336600, alpha: 0.5 });
    startBtn.addChild(startGlow);

    const startLabel = new Text({ text: "START GAME", style: BUTTON_STYLE });
    startLabel.anchor.set(0.5, 0.5);
    startLabel.position.set(startBtnW / 2, startBtnH / 2);
    startBtn.addChild(startLabel);

    // Hover effects
    startBtn.on("pointerover", () => {
      startBg.clear();
      startBg.roundRect(0, 0, startBtnW, startBtnH, 8);
      startBg.fill({ color: 0x336611 });
      startBg.stroke({ color: 0x88CC33, width: 3 });
      startGlow.clear();
      startGlow.roundRect(3, 3, startBtnW - 6, startBtnH - 6, 6);
      startGlow.fill({ color: 0x448800, alpha: 0.5 });
    });
    startBtn.on("pointerout", () => {
      startBg.clear();
      startBg.roundRect(0, 0, startBtnW, startBtnH, 8);
      startBg.fill({ color: 0x224400 });
      startBg.stroke({ color: 0x66AA22, width: 3 });
      startGlow.clear();
      startGlow.roundRect(3, 3, startBtnW - 6, startBtnH - 6, 6);
      startGlow.fill({ color: 0x336600, alpha: 0.5 });
    });

    startBtn.on("pointerdown", () => {
      const mapPresetId = MAP_PRESETS[this.setupSelection.mapPreset].id;
      // Total players = opponents + 1 (human)
      const numPlayers = this.setupSelection.opponents + 1;
      this._clearSetupScreen();
      this._startGame(
        this.setupSelection.faction,
        this.setupSelection.difficulty,
        mapPresetId,
        numPlayers,
      );
    });

    this.setupContainer.addChild(startBtn);

    // Decorative bottom divider
    const bottomDiv = new Graphics();
    bottomDiv.moveTo(centerX - 250, screen.height - 40);
    bottomDiv.lineTo(centerX + 250, screen.height - 40);
    bottomDiv.stroke({ color: 0x665522, width: 1, alpha: 0.4 });
    this.setupContainer.addChild(bottomDiv);

    // Version / credits at bottom
    const credits = new Text({
      text: "A game of chivalry, conquest, and legend",
      style: new TextStyle({
        fontFamily: "serif",
        fontSize: 12,
        fontStyle: "italic",
        fill: 0x555544,
        align: "center",
      }),
    });
    credits.anchor.set(0.5, 0);
    credits.position.set(centerX, screen.height - 35);
    this.setupContainer.addChild(credits);
  }

  private _refreshSetupScreen(): void {
    // Tear down the old setup container and rebuild from scratch
    this._clearSetupScreen();
    this._showSetupScreen();
  }

  private _clearSetupScreen(): void {
    if (this.setupContainer) {
      this.setupContainer.destroy({ children: true });
      this.setupContainer = null;
    }
  }

  // -------------------------------------------------------------------------
  // Game Start
  // -------------------------------------------------------------------------

  private _startGame(
    factionIndex: number,
    difficulty: number,
    mapPresetId: string,
    numPlayers: number,
  ): void {
    const mapPreset = MAP_PRESETS.find(m => m.id === mapPresetId) ?? MAP_PRESETS[1];
    this.state = createCivGameState({
      mapPreset,
      numPlayers,
      humanFaction: factionIndex,
      difficulty,
    });

    this.renderer.init(this.state);
    this.hud.init();

    // Center camera on starting position
    const humanPlayer = this.state.players[0];
    if (humanPlayer.unitIds.length > 0) {
      const firstUnit = getUnit(this.state, humanPlayer.unitIds[0]);
      if (firstUnit) this.renderer.centerOn(firstUnit.x, firstUnit.y);
    }

    // Wire up HUD callbacks
    this.hud.onEndTurn = () => this._endTurn();

    this.hud.onTechSelect = (techId: string) => {
      if (!this.state) return;
      setResearch(this.state, 0, techId);
      this.hud.hideTechPanel();
      this._refresh();
    };

    this.hud.onBuildSelect = (cityId: number, itemId: string) => {
      if (!this.state) return;
      const city = getCity(this.state, cityId);
      if (city) {
        city.buildQueue = [itemId];
        city.productionAccum = 0;
      }
      this.hud.hideBuildMenu();
      this._refresh();
      // Show next idle city if any
      this._showNextIdleCity();
    };

    this.hud.onUnitAction = (action: string, unitId: number) => {
      this._handleUnitAction(action, unitId);
    };

    this.hud.onDiplomacyAction = (action: string, target: number) => {
      this._handleDiplomacy(action, target);
    };

    this.hud.onEventChoice = (eventId: string, choiceIndex: number) => {
      if (!this.state) return;
      const event = CHIVALRY_EVENTS.find(e => e.id === eventId);
      if (!event) return;
      const choice = event.choices[choiceIndex];
      if (!choice) return;
      const human = this.state.players[0];
      human.chivalry = Math.max(-100, Math.min(100, human.chivalry + choice.chivalryChange));
      if (choice.goldChange) human.gold += choice.goldChange;
      addEvent(this.state, 0, `${event.name}: ${choice.label}`);
      this.hud.showNotification(`${event.name}: ${choice.label}`);
      this._refresh();
    };

    this.hud.onHeroRecruit = (heroId: string) => {
      if (!this.state) return;
      const unit = recruitHero(this.state, 0, heroId);
      if (unit) {
        this.hud.showNotification(`${CIV_HEROES[heroId]?.name ?? "Hero"} has joined your cause!`);
        this.renderer.centerOn(unit.x, unit.y);
      } else {
        this.hud.showNotification("Cannot recruit hero (need 100 gold and a capital).");
      }
      this._refresh();
    };

    this.hud.onHeroAbility = (ability: string, unitId: number) => {
      if (!this.state) return;
      const result = useHeroAbility(this.state, unitId, ability);
      this.hud.showNotification(result.message);
      if (result.success) this._selectUnit(unitId);
      this._refresh();
    };

    this.hud.onMinimapClick = (hx: number, hy: number) => {
      if (!this.state) return;
      if (hx >= 0 && hx < this.state.mapWidth && hy >= 0 && hy < this.state.mapHeight) {
        this.renderer.centerOn(hx, hy);
        this._refresh();
      }
    };

    this.hud.onExitGame = () => this._exit();

    // Setup input handlers
    this._setupInput();

    // Setup game loop ticker
    this.tickerFn = (ticker) => this._tick(ticker.deltaTime);
    viewManager.app.ticker.add(this.tickerFn);

    // Update fog of war for initial visibility
    updateFogOfWar(this.state, this.state.humanPlayerIndex);

    // Auto-show tech selection if no research
    if (!humanPlayer.currentTech) {
      const available = getAvailableTechs(humanPlayer);
      if (available.length > 0) this.hud.showTechPanel(this.state);
    }

    this._refresh();
  }

  // -------------------------------------------------------------------------
  // Game Loop
  // -------------------------------------------------------------------------

  private _tick(dt: number): void {
    if (!this.state) return;

    // Handle camera movement from held keys
    const speed = 5 * dt;
    let cameraMoved = false;

    if (this.keysDown.has("ArrowLeft") || this.keysDown.has("a")) {
      this.renderer.panCamera(-speed, 0);
      cameraMoved = true;
    }
    if (this.keysDown.has("ArrowRight") || this.keysDown.has("d")) {
      this.renderer.panCamera(speed, 0);
      cameraMoved = true;
    }
    if (this.keysDown.has("ArrowUp") || this.keysDown.has("w")) {
      this.renderer.panCamera(0, -speed);
      cameraMoved = true;
    }
    if (this.keysDown.has("ArrowDown") || this.keysDown.has("s")) {
      this.renderer.panCamera(0, speed);
      cameraMoved = true;
    }

    if (cameraMoved) this.renderer.markDirty();

    this.renderer.render(this.state, this.state.humanPlayerIndex);
    this.hud.update(this.state);
  }

  // -------------------------------------------------------------------------
  // Input Handling
  // -------------------------------------------------------------------------

  private _setupInput(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.state) return;

      if (e.type === "keydown") {
        this.keysDown.add(e.key);

        switch (e.key) {
          case "Enter":
            this._endTurn();
            break;

          case "f":
            if (this.state.selectedUnitId >= 0) {
              this._handleUnitAction("fortify", this.state.selectedUnitId);
            }
            break;

          case " ":
            if (this.state.selectedUnitId >= 0) {
              this._handleUnitAction("skip", this.state.selectedUnitId);
            }
            e.preventDefault();
            break;

          case "b": {
            // Show build menu if city selected, otherwise found city with selected unit
            if (this.state.selectedCityId >= 0) {
              this.hud.showBuildMenu(this.state, this.state.selectedCityId);
            } else if (this.state.selectedUnitId >= 0) {
              this._handleUnitAction("found_city", this.state.selectedUnitId);
            }
            break;
          }

          case "r":
            this.hud.showTechPanel(this.state);
            break;

          case "d":
            this.hud.showDiplomacyPanel(this.state);
            break;

          case "h": {
            // Recruit hero if in a city
            if (this.state.selectedCityId >= 0) {
              const heroes = getAvailableHeroes(this.state, 0);
              if (heroes.length > 0) {
                this.hud.showNotification("Hero recruitment available! Select a hero.");
              } else {
                this.hud.showNotification("No heroes available for recruitment.");
              }
            }
            break;
          }

          case "n":
            this._selectNextUnit();
            break;

          case "Delete":
            if (this.state.selectedUnitId >= 0) {
              this._handleUnitAction("disband", this.state.selectedUnitId);
            }
            break;

          case "t":
            this.hud.showTechPanel(this.state);
            break;

          case "p":
            this.hud.showDiplomacyPanel(this.state);
            break;

          case "c": {
            // Center on selected city
            if (this.state.selectedCityId >= 0) {
              const city = getCity(this.state, this.state.selectedCityId);
              if (city) this.renderer.centerOn(city.x, city.y);
            }
            break;
          }

          case "Tab": {
            // Cycle through units with remaining movement
            e.preventDefault();
            this._selectNextUnit();
            break;
          }

          case "?":
          case "/":
            this.hud.showHelpPanel();
            break;

          case "Escape":
            this.hud.hideTechPanel();
            this.hud.hideBuildMenu();
            this.hud.hideDiplomacyPanel();
            this._selectUnit(-1);
            this.state.selectedCityId = -1;
            this._refresh();
            break;
        }
      }

      if (e.type === "keyup") {
        this.keysDown.delete(e.key);
      }
    };

    window.addEventListener("keydown", this.keyHandler);
    window.addEventListener("keyup", this.keyHandler);

    this.mouseHandler = (e: MouseEvent) => {
      if (e.type === "pointerdown" && this.state) {
        const tile = this.renderer.getTileAtScreen(e.clientX, e.clientY);
        if (!tile) return;
        this._handleTileClick(tile.x, tile.y);
      }
    };
    viewManager.app.canvas.addEventListener("pointerdown", this.mouseHandler as EventListener);

    this.wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      this.renderer.zoomCamera(e.deltaY > 0 ? -0.1 : 0.1);
      this.renderer.markDirty();
    };
    viewManager.app.canvas.addEventListener("wheel", this.wheelHandler, { passive: false });
  }

  // -------------------------------------------------------------------------
  // Tile Click Logic
  // -------------------------------------------------------------------------

  private _handleTileClick(x: number, y: number): void {
    if (!this.state) return;
    const state = this.state;

    // Bounds check
    if (x < 0 || x >= state.mapWidth || y < 0 || y >= state.mapHeight) return;

    const tile = state.tiles[y]?.[x];
    if (!tile) return;

    // If we have a selected unit and click on a reachable or attackable tile, act
    if (state.selectedUnitId >= 0) {
      const unit = getUnit(state, state.selectedUnitId);
      if (unit && unit.owner === state.humanPlayerIndex) {

        // Check if clicking attackable tile
        if (state.attackableTiles.some(t => t.x === x && t.y === y)) {
          const enemyUnitId = tile.unitIds.find(uid => {
            const u = getUnit(state, uid);
            return u && u.owner !== state.humanPlayerIndex;
          });
          if (enemyUnitId !== undefined) {
            const result = resolveCombat(state, state.selectedUnitId, enemyUnitId);
            this.renderer.addCombatFlash(x, y, 0xFF4444);
            // Show floating damage numbers
            if (result.defenderDamage > 0) {
              this.renderer.addFloatingText(x, y, `-${result.defenderDamage}`, 0xFF4444);
            }
            if (result.attackerDamage > 0) {
              const aUnit = getUnit(state, state.selectedUnitId);
              if (aUnit) this.renderer.addFloatingText(aUnit.x, aUnit.y, `-${result.attackerDamage}`, 0xFF8844);
            }
            // Show result text
            if (!result.defenderSurvived) {
              this.renderer.addFloatingText(x, y, "Destroyed!", 0xFFDD44);
            } else if (!result.attackerSurvived) {
              this.renderer.addFloatingText(x, y, "Repelled!", 0x44AAFF);
            }
            this._selectUnit(-1);
            updateFogOfWar(state, state.humanPlayerIndex);
            this._refresh();
            return;
          }
        }

        // Check if clicking reachable tile
        if (state.reachableTiles.some(t => t.x === x && t.y === y)) {
          const path = findPath(state, unit, x, y);
          if (path) {
            for (const step of path) {
              if (unit.movement <= 0) break;
              const oldX = unit.x, oldY = unit.y;
              moveUnitTo(state, unit.id, step.x, step.y);
              this.renderer.animateUnitMove(unit.id, oldX, oldY, step.x, step.y);
            }
          }
          updateFogOfWar(state, state.humanPlayerIndex);
          this._selectUnit(unit.id); // Refresh movement/attack overlays
          this._refresh();
          return;
        }
      }
    }

    // Click on own unit — select it
    const ownUnit = tile.unitIds.find(uid => {
      const u = getUnit(state, uid);
      return u && u.owner === state.humanPlayerIndex;
    });
    if (ownUnit !== undefined) {
      this._selectUnit(ownUnit);
      state.selectedCityId = -1;
      this._refresh();
      return;
    }

    // Click on own city — select it and show build menu if no queue
    if (tile.cityId >= 0) {
      const city = getCity(state, tile.cityId);
      if (city && city.owner === state.humanPlayerIndex) {
        state.selectedCityId = city.id;
        state.selectedUnitId = -1;
        state.reachableTiles = [];
        state.attackableTiles = [];
        // Show build menu if city has no build queue
        if (city.buildQueue.length === 0) {
          this.hud.showBuildMenu(state, city.id);
        }
        this._refresh();
        return;
      }
    }

    // Click on empty tile — deselect everything
    this._selectUnit(-1);
    state.selectedCityId = -1;
    this._refresh();
  }

  // -------------------------------------------------------------------------
  // Unit Selection
  // -------------------------------------------------------------------------

  private _selectUnit(unitId: number): void {
    if (!this.state) return;

    this.state.selectedUnitId = unitId;

    if (unitId >= 0) {
      const unit = getUnit(this.state, unitId);
      if (unit && unit.owner === this.state.humanPlayerIndex) {
        this.state.reachableTiles = getReachableTiles(this.state, unit);
        this.state.attackableTiles = getAttackableTiles(this.state, unit);
      } else {
        this.state.reachableTiles = [];
        this.state.attackableTiles = [];
      }
    } else {
      this.state.reachableTiles = [];
      this.state.attackableTiles = [];
    }

    this.renderer.markDirty();
  }

  private _selectNextUnit(): void {
    if (!this.state) return;
    const human = this.state.players[0];

    // Find first unit with remaining movement that isn't fortified or sleeping
    const currentIdx = human.unitIds.indexOf(this.state.selectedUnitId);
    const startIdx = currentIdx >= 0 ? currentIdx + 1 : 0;

    // Search from after the current unit, wrapping around
    for (let offset = 0; offset < human.unitIds.length; offset++) {
      const idx = (startIdx + offset) % human.unitIds.length;
      const uid = human.unitIds[idx];
      const u = getUnit(this.state, uid);
      if (u && u.movement > 0 && !u.fortified && !u.sleeping) {
        this._selectUnit(uid);
        this.renderer.centerOn(u.x, u.y);
        this._refresh();
        return;
      }
    }

    // No moveable units found
    this._selectUnit(-1);
    this._refresh();
  }

  // -------------------------------------------------------------------------
  // Unit Actions
  // -------------------------------------------------------------------------

  private _handleUnitAction(action: string, unitId: number): void {
    if (!this.state) return;
    const unit = getUnit(this.state, unitId);
    if (!unit || unit.owner !== this.state.humanPlayerIndex) return;

    switch (action) {
      case "fortify":
        unit.fortified = true;
        unit.sleeping = false;
        unit.movement = 0;
        break;

      case "sleep":
        unit.sleeping = true;
        unit.fortified = false;
        unit.movement = 0;
        break;

      case "skip":
        unit.movement = 0;
        break;

      case "disband":
        removeUnit(this.state, unitId);
        break;

      case "found_city": {
        const unitDef = CIV_UNIT_DEFS[unit.type];
        if (unitDef?.canFoundCity) {
          foundCity(this.state, unit.owner, unit.x, unit.y);
          removeUnit(this.state, unitId);
          updateFogOfWar(this.state, this.state.humanPlayerIndex);

          // Check if new city needs a build order
          const tile = this.state.tiles[unit.y]?.[unit.x];
          if (tile && tile.cityId >= 0) {
            const newCity = getCity(this.state, tile.cityId);
            if (newCity && newCity.buildQueue.length === 0) {
              this.hud.showBuildMenu(this.state, newCity.id);
            }
          }
        } else {
          this.hud.showNotification("This unit cannot found a city.");
        }
        break;
      }

      case "wake":
        unit.sleeping = false;
        unit.fortified = false;
        break;

      case "improve_farm":
      case "improve_mine":
      case "improve_road":
      case "improve_lumber_camp":
      case "improve_pasture":
      case "improve_holy_shrine": {
        const impType = action.replace("improve_", "");
        if (startImprovement(this.state, unit.id, impType)) {
          this.hud.showNotification(`Building ${impType.replace("_", " ")}...`);
        }
        break;
      }

      default:
        break;
    }

    this._selectUnit(-1);
    this._refresh();
    this._selectNextUnit();
  }

  // -------------------------------------------------------------------------
  // Diplomacy
  // -------------------------------------------------------------------------

  private _handleDiplomacy(action: string, targetPlayer: number): void {
    if (!this.state) return;

    const name = this.state.players[targetPlayer]?.factionDef.name ?? "unknown";
    switch (action) {
      case "war":
      case "declare_war":
        setDiplomacyRelation(this.state, 0, targetPlayer, "war");
        addEvent(this.state, 0, `You have declared war on ${name}!`);
        break;
      case "peace":
      case "offer_peace":
        if (isAtWar(this.state, 0, targetPlayer)) {
          setDiplomacyRelation(this.state, 0, targetPlayer, "peace");
          addEvent(this.state, 0, `Peace treaty signed with ${name}.`);
        }
        break;
      case "alliance":
      case "form_alliance":
        setDiplomacyRelation(this.state, 0, targetPlayer, "alliance");
        addEvent(this.state, 0, `Alliance formed with ${name}!`);
        break;
      case "break_alliance":
        setDiplomacyRelation(this.state, 0, targetPlayer, "peace");
        addEvent(this.state, 0, `Alliance with ${name} dissolved.`);
        break;
    }

    this.hud.hideDiplomacyPanel();
    this._refresh();
  }

  // -------------------------------------------------------------------------
  // End Turn
  // -------------------------------------------------------------------------

  private _endTurn(): void {
    if (!this.state || this.state.phase !== "playing") return;

    // Process human player end-of-turn (production, research, growth, etc.)
    processEndTurn(this.state, 0);

    // Run AI for all other players
    for (let i = 1; i < this.state.players.length; i++) {
      if (this.state.players[i].alive) {
        CivAI.runTurn(this.state, i);
      }
    }

    // Check for cities captured from human this turn (scan events)
    const captureEvents = this.state.events.filter(e =>
      e.turn === this.state!.turn && e.message.includes("captures") && e.player !== 0
    );
    for (const ev of captureEvents) {
      this.hud.showNotification(ev.message);
    }

    // Advance the global turn counter, reset movement, heal units, etc.
    advanceTurn(this.state);

    // Milestone notifications
    if (this.state.turn % 25 === 0) {
      this.hud.showNotification(`Turn ${this.state.turn} — The chronicles record your deeds.`);
    }
    if (this.state.turn === 150) {
      this.hud.showNotification("The age draws to a close. 50 turns remain!");
    }
    if (this.state.turn === 190) {
      this.hud.showNotification("Only 10 turns remain! The final reckoning approaches.");
    }

    // Update fog of war for new unit/city positions
    updateFogOfWar(this.state, this.state.humanPlayerIndex);

    // Count AI actions this turn for notification
    const aiEventCount = this.state.events.filter(e => e.turn === this.state!.turn && e.player !== 0).length;
    if (aiEventCount > 0) {
      this.hud.showNotification(`AI factions took ${aiEventCount} actions.`);
    }

    // Random chivalry event (10% chance per turn)
    if (Math.random() < 0.1) {
      this._triggerRandomEvent();
    }

    // Check victory/defeat conditions
    const phase = this.state.phase as string;
    if (phase === "victory") {
      this.hud.showVictoryScreen(
        this.state.victoryType ?? "conquest",
        this.state.players[0].score,
      );
      return;
    } else if (phase === "defeat") {
      this.hud.showVictoryScreen("defeat", this.state.players[0].score);
      return;
    }

    // Show notifications for events that occurred this turn
    const turnEvents = this.state.events.filter(
      e => e.turn === this.state!.turn && (e.player === 0 || e.player === -1),
    );
    for (const ev of turnEvents) {
      this.hud.showNotification(ev.message);
    }

    // Queue all idle cities
    this.idleCityQueue = [];
    for (const cityId of this.state.players[0].cityIds) {
      const city = getCity(this.state, cityId);
      if (city && city.buildQueue.length === 0) {
        this.idleCityQueue.push(city.id);
      }
    }
    this._showNextIdleCity();

    // Auto-prompt research selection if needed
    const human = this.state.players[0];
    if (!human.currentTech && human.alive) {
      const available = getAvailableTechs(human);
      if (available.length > 0) this.hud.showTechPanel(this.state);
    }

    // Deselect and auto-select next moveable unit
    this._selectUnit(-1);
    this._selectNextUnit();
    this._refresh();
  }

  // -------------------------------------------------------------------------
  // Random Events
  // -------------------------------------------------------------------------

  private _triggerRandomEvent(): void {
    if (!this.state) return;
    if (CHIVALRY_EVENTS.length === 0) return;

    const event = CHIVALRY_EVENTS[Math.floor(Math.random() * CHIVALRY_EVENTS.length)];
    if (!event.choices || event.choices.length === 0) return;

    // Show dialog to player
    this.hud.showEventDialog(event);
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------

  private _showNextIdleCity(): void {
    if (!this.state || this.idleCityQueue.length === 0) return;
    const cityId = this.idleCityQueue.shift()!;
    const city = getCity(this.state, cityId);
    if (city) {
      this.renderer.centerOn(city.x, city.y);
      this.state.selectedCityId = city.id;
      this.hud.showBuildMenu(this.state, city.id);
    }
  }

  private _refresh(): void {
    this.renderer.markDirty();
  }

  private _exit(): void {
    this.destroy();
    window.dispatchEvent(new Event("civExit"));
  }
}
