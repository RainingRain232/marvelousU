// ---------------------------------------------------------------------------
// Settlers – Main game orchestrator
// ---------------------------------------------------------------------------

import { SB } from "./config/SettlersBalance";
import { ResourceType } from "./config/SettlersResourceDefs";
import { SettlersBuildingType } from "./config/SettlersBuildingDefs";
import { createSettlersState, nextId } from "./state/SettlersState";
import type { SettlersState } from "./state/SettlersState";
import type { SettlersPlayer } from "./state/SettlersPlayer";
import { getHeightAt } from "./state/SettlersMap";
import { generateTerrain, findStartPosition } from "./systems/SettlersTerrainSystem";
import { placeBuilding, canPlaceBuilding, updateConstruction, updateProduction } from "./systems/SettlersBuildingSystem";
import { recalculateTerritory, updateTerritory } from "./systems/SettlersTerritorySystem";
import { placeFlag, createRoad, routeGoods } from "./systems/SettlersRoadSystem";
import { updateCarriers } from "./systems/SettlersCarrierSystem";
import { updateBarracks, updateGarrisoning, updateCombat, checkWinCondition } from "./systems/SettlersMilitarySystem";
import { updateAI } from "./systems/SettlersAISystem";
import { SettlersRenderer } from "./view/SettlersRenderer";
import { SettlersCameraController } from "./view/SettlersCameraController";
import { SettlersInputSystem } from "./systems/SettlersInputSystem";
import { SettlersHUD } from "./view/SettlersHUD";

export class SettlersGame {
  private _state!: SettlersState;
  private _renderer = new SettlersRenderer();
  private _camera!: SettlersCameraController;
  private _input!: SettlersInputSystem;
  private _hud = new SettlersHUD();

  private _rafId: number | null = null;
  private _lastTime = 0;
  private _simAccumulator = 0;

  async boot(): Promise<void> {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    // --- 1. Create state ---
    this._state = createSettlersState(sw, sh);

    // --- 2. Generate terrain ---
    generateTerrain(this._state.map, Math.floor(Math.random() * 100000));

    // --- 3. Place players ---
    this._setupPlayers();

    // --- 4. Calculate initial territory ---
    recalculateTerritory(this._state);

    // --- 5. Init renderer ---
    this._renderer.init(sw, sh);
    this._renderer.buildTerrain(this._state);

    // --- 6. Init camera ---
    this._camera = new SettlersCameraController(this._renderer.camera);
    // Point camera at player HQ
    const player = this._state.players.get("p0")!;
    const hq = this._state.buildings.get(player.hqId)!;
    const hqCenterX = (hq.tileX + 1.5) * SB.TILE_SIZE;
    const hqCenterZ = (hq.tileZ + 1.5) * SB.TILE_SIZE;
    this._camera.lookAt(hqCenterX, hqCenterZ);

    // --- 7. Init input ---
    this._input = new SettlersInputSystem(this._camera);
    this._input.setTerrainMesh(this._renderer.terrainMesh);
    this._input.setState(this._state);
    this._input.init(this._renderer.canvas);

    this._input.onLeftClick = (tx, tz) => this._handleLeftClick(tx, tz);
    this._input.onRightClick = () => this._handleRightClick();
    this._input.onEscape = () => this._handleEscape();

    // --- 8. Init HUD ---
    this._hud.build();
    this._hud.onSelectBuildingType = (type) => {
      this._state.selectedBuildingType = type;
      this._state.selectedTool = "build";
    };
    this._hud.onSelectTool = (tool) => {
      this._state.selectedTool = tool;
      if (tool !== "build") this._state.selectedBuildingType = null;
    };
    this._hud.onExit = () => this.destroy();

    // --- 9. Start game loop ---
    this._lastTime = performance.now();
    this._gameLoop();
  }

  destroy(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._input.destroy();
    this._renderer.destroy();
    this._hud.destroy();
    window.dispatchEvent(new Event("settlersExit"));
  }

  // -----------------------------------------------------------------------
  // Game loop
  // -----------------------------------------------------------------------

  private _gameLoop = (): void => {
    this._rafId = requestAnimationFrame(this._gameLoop);

    const now = performance.now();
    const frameMs = Math.min(now - this._lastTime, 100);
    this._lastTime = now;

    // Input update (hover tile)
    this._input.update(this._state);

    // Fixed timestep simulation
    if (!this._state.paused && !this._state.gameOver) {
      this._simAccumulator += frameMs;
      while (this._simAccumulator >= SB.SIM_TICK_MS) {
        this._simAccumulator -= SB.SIM_TICK_MS;
        this._simTick(SB.SIM_TICK_MS / 1000);
      }
    }

    // Camera update
    this._camera.update(frameMs / 1000);

    // Render
    this._renderer.render(this._state, frameMs / 1000);

    // HUD update
    this._hud.update(this._state);
  };

  private _simTick(dt: number): void {
    // Building construction & production
    updateConstruction(this._state, dt);
    updateProduction(this._state, dt);

    // Goods routing
    routeGoods(this._state);

    // Carrier movement
    updateCarriers(this._state, dt);

    // Territory
    updateTerritory(this._state);

    // Military
    updateBarracks(this._state, dt);
    updateGarrisoning(this._state, dt);
    updateCombat(this._state, dt);
    checkWinCondition(this._state);

    // AI
    updateAI(this._state, dt);

    this._state.tick++;
  }

  // -----------------------------------------------------------------------
  // Player setup
  // -----------------------------------------------------------------------

  private _setupPlayers(): void {
    // Player 0 (human) – northwest
    const p0Pos = findStartPosition(this._state.map, "nw");
    const p0: SettlersPlayer = {
      id: "p0",
      name: "Player",
      color: 0x3388ff,
      isAI: false,
      storage: new Map(),
      availableWorkers: SB.START_WORKERS,
      freeSoldiers: SB.START_SOLDIERS,
      hqId: "",
      defeated: false,
    };

    // Set starting resources
    p0.storage.set(ResourceType.PLANKS, SB.START_PLANKS);
    p0.storage.set(ResourceType.STONE, SB.START_STONE);
    p0.storage.set(ResourceType.WOOD, SB.START_WOOD);
    p0.storage.set(ResourceType.FISH, SB.START_FISH);
    p0.storage.set(ResourceType.BREAD, SB.START_BREAD);
    p0.storage.set(ResourceType.SWORD, SB.START_SWORDS);
    p0.storage.set(ResourceType.SHIELD, SB.START_SHIELDS);
    p0.storage.set(ResourceType.BEER, SB.START_BEER);

    this._state.players.set("p0", p0);

    // Place HQ
    const hq0 = placeBuilding(this._state, SettlersBuildingType.HEADQUARTERS, p0Pos.x, p0Pos.z, "p0", true);
    if (hq0) p0.hqId = hq0.id;

    // Player 1 (AI) – southeast
    const p1Pos = findStartPosition(this._state.map, "se");
    const p1: SettlersPlayer = {
      id: "p1",
      name: "AI Opponent",
      color: 0xff3333,
      isAI: true,
      storage: new Map(),
      availableWorkers: SB.START_WORKERS,
      freeSoldiers: SB.START_SOLDIERS,
      hqId: "",
      defeated: false,
    };

    p1.storage.set(ResourceType.PLANKS, SB.START_PLANKS);
    p1.storage.set(ResourceType.STONE, SB.START_STONE);
    p1.storage.set(ResourceType.WOOD, SB.START_WOOD);
    p1.storage.set(ResourceType.FISH, SB.START_FISH);
    p1.storage.set(ResourceType.BREAD, SB.START_BREAD);
    p1.storage.set(ResourceType.SWORD, SB.START_SWORDS);
    p1.storage.set(ResourceType.SHIELD, SB.START_SHIELDS);
    p1.storage.set(ResourceType.BEER, SB.START_BEER);

    this._state.players.set("p1", p1);

    const hq1 = placeBuilding(this._state, SettlersBuildingType.HEADQUARTERS, p1Pos.x, p1Pos.z, "p1", true);
    if (hq1) p1.hqId = hq1.id;

    // Create starting soldiers
    this._spawnStartingSoldiers("p0", p0Pos);
    this._spawnStartingSoldiers("p1", p1Pos);
  }

  private _spawnStartingSoldiers(playerId: string, pos: { x: number; z: number }): void {
    for (let i = 0; i < SB.START_SOLDIERS; i++) {
      const id = nextId(this._state);
      const wx = (pos.x + 1 + i * 0.5) * SB.TILE_SIZE;
      const wz = (pos.z + 3.5) * SB.TILE_SIZE;
      this._state.soldiers.set(id, {
        id,
        owner: playerId,
        rank: 0,
        position: { x: wx, y: getHeightAt(this._state.map, wx, wz), z: wz },
        state: "idle",
        garrisonedIn: null,
        targetBuildingId: null,
        hp: SB.SOLDIER_BASE_HP,
        maxHp: SB.SOLDIER_BASE_HP,
        attackPower: SB.SOLDIER_BASE_ATK,
        swingTimer: 0,
      });
    }
  }

  // -----------------------------------------------------------------------
  // Input handling
  // -----------------------------------------------------------------------

  private _handleLeftClick(tileX: number, tileZ: number): void {
    const state = this._state;

    switch (state.selectedTool) {
      case "build":
        this._handleBuild(tileX, tileZ);
        break;
      case "flag":
        placeFlag(state, tileX, tileZ, "p0");
        break;
      case "road":
        this._handleRoadClick(tileX, tileZ);
        break;
      case "select":
        this._handleSelect(tileX, tileZ);
        break;
      case "attack":
        this._handleAttack(tileX, tileZ);
        break;
      case "demolish":
        // TODO: demolish building/road at tile
        break;
    }
  }

  private _handleBuild(tileX: number, tileZ: number): void {
    const state = this._state;
    if (!state.selectedBuildingType) return;

    const error = canPlaceBuilding(state, state.selectedBuildingType, tileX, tileZ, "p0");
    if (error) return; // silently fail – HUD could show error

    placeBuilding(state, state.selectedBuildingType, tileX, tileZ, "p0");
    recalculateTerritory(state);
  }

  private _handleRoadClick(tileX: number, tileZ: number): void {
    const state = this._state;
    const drawing = state.roadDrawing;

    // Find flag at this tile
    let clickedFlag: string | null = null;
    for (const [, flag] of state.flags) {
      if (flag.tileX === tileX && flag.tileZ === tileZ && flag.owner === "p0") {
        clickedFlag = flag.id;
        break;
      }
    }

    if (!drawing.active) {
      // Start road drawing
      if (clickedFlag) {
        drawing.active = true;
        drawing.startFlagId = clickedFlag;
        drawing.path = [{ x: tileX, z: tileZ }];
      }
    } else {
      // Continue or finish road
      drawing.path.push({ x: tileX, z: tileZ });

      if (clickedFlag && clickedFlag !== drawing.startFlagId) {
        // Finish road
        createRoad(state, drawing.startFlagId!, clickedFlag, drawing.path, "p0");
        drawing.active = false;
        drawing.startFlagId = null;
        drawing.path = [];
      }
    }
  }

  private _handleSelect(tileX: number, tileZ: number): void {
    const state = this._state;
    // Check if there's a building at this tile
    const idx = tileZ * state.map.width + tileX;
    const buildingId = state.map.occupied[idx];
    state.selectedBuildingId = buildingId || null;
  }

  private _handleAttack(tileX: number, tileZ: number): void {
    const state = this._state;
    const idx = tileZ * state.map.width + tileX;
    const buildingId = state.map.occupied[idx];
    if (!buildingId) return;

    const building = state.buildings.get(buildingId);
    if (!building || building.owner === "p0") return;

    // Find a garrisoned soldier to send
    for (const [, ownBuilding] of state.buildings) {
      if (ownBuilding.owner !== "p0") continue;
      if (ownBuilding.garrison.length <= 1) continue;

      const soldierId = ownBuilding.garrison.pop()!;
      const soldier = state.soldiers.get(soldierId);
      if (soldier) {
        soldier.state = "marching";
        soldier.garrisonedIn = null;
        soldier.targetBuildingId = buildingId;
        soldier.position = {
          x: (ownBuilding.tileX + 1) * SB.TILE_SIZE,
          y: 0,
          z: (ownBuilding.tileZ + 1) * SB.TILE_SIZE,
        };
        break;
      }
    }
  }

  private _handleRightClick(): void {
    const state = this._state;
    // Cancel current action
    state.selectedTool = "select";
    state.selectedBuildingType = null;
    state.selectedBuildingId = null;
    state.roadDrawing.active = false;
    state.roadDrawing.startFlagId = null;
    state.roadDrawing.path = [];
  }

  private _handleEscape(): void {
    if (this._state.roadDrawing.active) {
      this._handleRightClick();
    } else {
      this._state.paused = !this._state.paused;
    }
  }
}
