// ---------------------------------------------------------------------------
// Settlers – Main game orchestrator
// ---------------------------------------------------------------------------

import { SB } from "./config/SettlersBalance";
import { ResourceType } from "./config/SettlersResourceDefs";
import { SettlersBuildingType } from "./config/SettlersBuildingDefs";
import { createSettlersState, nextId } from "./state/SettlersState";
import type { SettlersState, SettlersDifficulty } from "./state/SettlersState";
import type { SettlersPlayer } from "./state/SettlersPlayer";
import { getHeightAt } from "./state/SettlersMap";
import { generateTerrain, findStartPosition } from "./systems/SettlersTerrainSystem";
import { placeBuilding, canPlaceBuilding, updateConstruction, updateProduction, demolishBuilding, updateWorkers } from "./systems/SettlersBuildingSystem";
import { recalculateTerritory, updateTerritory } from "./systems/SettlersTerritorySystem";
import { placeFlag, createRoad, routeGoods, upgradeRoad } from "./systems/SettlersRoadSystem";
import { updateCarriers } from "./systems/SettlersCarrierSystem";
import { updateBarracks, updateGarrisoning, updateCombat, checkWinCondition, addToProductionQueue, removeFromProductionQueue } from "./systems/SettlersMilitarySystem";
import { updateAI } from "./systems/SettlersAISystem";
import { SettlersRenderer } from "./view/SettlersRenderer";
import { SettlersCameraController } from "./view/SettlersCameraController";
import { SettlersInputSystem } from "./systems/SettlersInputSystem";
import { SettlersHUD } from "./view/SettlersHUD";
import { saveToLocalStorage, loadFromLocalStorage } from "./systems/SettlersSaveSystem";
import { updateAudio, destroyAudio, playBuildSound, playDemolishSound, playUIClick, playUIToolSwitch } from "./systems/SettlersAudioSystem";

export class SettlersGame {
  private _state!: SettlersState;
  private _renderer = new SettlersRenderer();
  private _camera!: SettlersCameraController;
  private _input!: SettlersInputSystem;
  private _hud = new SettlersHUD();

  private _rafId: number | null = null;
  private _lastTime = 0;
  private _simAccumulator = 0;
  private _difficulty: SettlersDifficulty = "normal";

  /** Set difficulty before calling boot(). Affects AI speed, attack thresholds, and starting resources. */
  setDifficulty(difficulty: SettlersDifficulty): void {
    this._difficulty = difficulty;
  }

  async boot(): Promise<void> {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    // --- 1. Create state ---
    this._state = createSettlersState(sw, sh);
    this._state.difficulty = this._difficulty;

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
    this._input.onSave = () => {
      saveToLocalStorage(this._state);
      this._hud.showNotification("Game saved!");
    };
    this._input.onLoad = () => {
      const loaded = loadFromLocalStorage();
      if (loaded) {
        this._state = loaded;
        this._renderer.rebuildAll(this._state);
        this._input.setState(this._state);
        this._hud.showNotification("Game loaded!");
      } else {
        this._hud.showNotification("No save found!");
      }
    };
    this._input.onToggleWiki = () => this._hud.toggleWiki();
    this._input.onToggleAudio = () => this._hud.toggleAudioPanel();
    this._input.onSpeedChange = (speed) => {
      this._hud.showNotification(`Speed: ${Math.round(speed * 100)}%`);
    };

    // --- 8. Init HUD ---
    this._hud.build();
    this._hud.onSelectBuildingType = (type) => {
      this._state.selectedBuildingType = type;
      this._state.selectedTool = "build";
      playUIClick();
    };
    this._hud.onSelectTool = (tool) => {
      this._state.selectedTool = tool;
      if (tool !== "build") this._state.selectedBuildingType = null;
      playUIToolSwitch();
    };
    this._hud.onExit = () => this.destroy();
    this._hud.onMinimapClick = (worldX, worldZ) => {
      this._camera.lookAt(worldX, worldZ);
    };
    this._hud.onSave = () => {
      saveToLocalStorage(this._state);
      this._hud.showNotification("Game saved!");
    };
    this._hud.onLoad = () => {
      const loaded = loadFromLocalStorage();
      if (loaded) {
        this._state = loaded;
        this._renderer.rebuildAll(this._state);
        this._input.setState(this._state);
        this._hud.showNotification("Game loaded!");
      } else {
        this._hud.showNotification("No save found!");
      }
    };

    this._hud.onRoadUpgrade = (roadId) => {
      if (upgradeRoad(this._state, roadId)) {
        playBuildSound();
        this._hud.showNotification("Road upgraded!");
      } else {
        this._hud.showNotification("Not enough resources!");
      }
    };

    this._hud.onQueueAdd = (buildingId, itemType) => {
      const building = this._state.buildings.get(buildingId);
      if (building) addToProductionQueue(building, itemType);
    };
    this._hud.onQueueRemove = (buildingId, index) => {
      const building = this._state.buildings.get(buildingId);
      if (building) removeFromProductionQueue(building, index);
    };

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
    destroyAudio();
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
      this._simAccumulator += frameMs * this._state.gameSpeed;
      while (this._simAccumulator >= SB.SIM_TICK_MS) {
        this._simAccumulator -= SB.SIM_TICK_MS;
        this._simTick(SB.SIM_TICK_MS / 1000);
      }
    }

    // Camera update
    this._camera.update(frameMs / 1000);

    // Render
    this._renderer.render(this._state, frameMs / 1000);

    // Audio
    updateAudio(this._state, frameMs / 1000);

    // Pass camera info to HUD for minimap viewport indicator
    this._hud.updateCamera(
      this._camera.targetX,
      this._camera.targetZ,
      this._camera.distance,
      this._camera.yaw,
      this._camera.pitch,
    );

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

    // Worker movement
    updateWorkers(this._state, dt);

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
    const diff = SB.AI_DIFFICULTY[this._difficulty];
    const playerMult = diff.playerResourceMult;
    const aiMult = diff.startingResourceMult;

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

    // Set starting resources (scaled by difficulty for the human player)
    p0.storage.set(ResourceType.PLANKS, Math.round(SB.START_PLANKS * playerMult));
    p0.storage.set(ResourceType.STONE, Math.round(SB.START_STONE * playerMult));
    p0.storage.set(ResourceType.WOOD, Math.round(SB.START_WOOD * playerMult));
    p0.storage.set(ResourceType.FISH, Math.round(SB.START_FISH * playerMult));
    p0.storage.set(ResourceType.BREAD, Math.round(SB.START_BREAD * playerMult));
    p0.storage.set(ResourceType.SWORD, Math.round(SB.START_SWORDS * playerMult));
    p0.storage.set(ResourceType.SHIELD, Math.round(SB.START_SHIELDS * playerMult));
    p0.storage.set(ResourceType.BEER, Math.round(SB.START_BEER * playerMult));

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

    // AI starting resources scaled by difficulty
    p1.storage.set(ResourceType.PLANKS, Math.round(SB.START_PLANKS * aiMult));
    p1.storage.set(ResourceType.STONE, Math.round(SB.START_STONE * aiMult));
    p1.storage.set(ResourceType.WOOD, Math.round(SB.START_WOOD * aiMult));
    p1.storage.set(ResourceType.FISH, Math.round(SB.START_FISH * aiMult));
    p1.storage.set(ResourceType.BREAD, Math.round(SB.START_BREAD * aiMult));
    p1.storage.set(ResourceType.SWORD, Math.round(SB.START_SWORDS * aiMult));
    p1.storage.set(ResourceType.SHIELD, Math.round(SB.START_SHIELDS * aiMult));
    p1.storage.set(ResourceType.BEER, Math.round(SB.START_BEER * aiMult));

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
        this._handleDemolish(tileX, tileZ);
        break;
    }
  }

  private _handleBuild(tileX: number, tileZ: number): void {
    const state = this._state;
    if (!state.selectedBuildingType) return;

    const error = canPlaceBuilding(state, state.selectedBuildingType, tileX, tileZ, "p0");
    if (error) {
      this._hud.showToast(error);
      return;
    }

    const building = placeBuilding(state, state.selectedBuildingType, tileX, tileZ, "p0");
    // Territory recalc is handled by the dirty flag set in placeBuilding
    playBuildSound();

    // Auto-connect building flag to nearest existing flag in road network
    if (building) {
      this._autoConnectBuilding(state, building, "p0");
    }
  }

  /** Auto-connect a newly placed building's flag to the nearest reachable flag */
  private _autoConnectBuilding(
    state: SettlersState,
    building: import("./state/SettlersBuilding").SettlersBuilding,
    owner: string,
  ): void {
    const buildingFlag = state.flags.get(building.flagId);
    if (!buildingFlag) return;
    if (buildingFlag.connectedRoads.length > 0) return; // already connected

    // Find nearest flag that belongs to us (prefer flags with existing roads)
    let bestFlag: import("./state/SettlersRoad").SettlersFlag | null = null;
    let bestDist = Infinity;

    for (const [, flag] of state.flags) {
      if (flag.id === buildingFlag.id) continue;
      if (flag.owner !== owner) continue;

      const dx = flag.tileX - buildingFlag.tileX;
      const dz = flag.tileZ - buildingFlag.tileZ;
      const dist = Math.abs(dx) + Math.abs(dz);

      // Prefer flags with road connections (part of network), and shorter distance
      const penalty = flag.connectedRoads.length > 0 ? 0 : 100;
      const score = dist + penalty;

      if (score < bestDist && dist < 20) {
        bestDist = score;
        bestFlag = flag;
      }
    }

    if (!bestFlag) return;

    // Build straight-line path from building flag to target flag
    const path: { x: number; z: number }[] = [];
    let cx = buildingFlag.tileX;
    let cz = buildingFlag.tileZ;
    path.push({ x: cx, z: cz });

    while (cx !== bestFlag.tileX || cz !== bestFlag.tileZ) {
      const dx = bestFlag.tileX - cx;
      const dz = bestFlag.tileZ - cz;
      if (Math.abs(dx) > Math.abs(dz)) {
        cx += dx > 0 ? 1 : -1;
      } else {
        cz += dz > 0 ? 1 : -1;
      }
      path.push({ x: cx, z: cz });
    }

    createRoad(state, buildingFlag.id, bestFlag.id, path, owner);
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
      // Continue or finish road – reject tiles occupied by buildings
      const tileOccupied = state.map.occupied[tileZ * state.map.width + tileX];
      if (tileOccupied && !clickedFlag) {
        // Tile is part of a building footprint – skip it (flags on edges are OK)
        return;
      }
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

    if (buildingId) {
      state.selectedBuildingId = buildingId;
      state.selectedRoadId = null;
      return;
    }

    // Check if there's a road segment passing through this tile
    for (const [, road] of state.roads) {
      for (const p of road.path) {
        if (p.x === tileX && p.z === tileZ) {
          state.selectedRoadId = road.id;
          state.selectedBuildingId = null;
          return;
        }
      }
    }

    // Nothing selected
    state.selectedBuildingId = null;
    state.selectedRoadId = null;
  }

  private _handleDemolish(tileX: number, tileZ: number): void {
    const state = this._state;

    // 1. Check for a building on this tile
    const idx = tileZ * state.map.width + tileX;
    const buildingId = state.map.occupied[idx];
    if (buildingId) {
      const building = state.buildings.get(buildingId);
      if (building && building.owner === "p0") {
        if (demolishBuilding(state, buildingId)) {
          // Territory recalc is handled by the dirty flag set in demolishBuilding
          playDemolishSound();
        }
      }
      return;
    }

    // 2. Check for a flag on this tile
    for (const [, flag] of state.flags) {
      if (flag.tileX === tileX && flag.tileZ === tileZ && flag.owner === "p0") {
        // Don't demolish flags attached to buildings – demolish the building instead
        if (flag.buildingId) return;

        // Remove all roads connected to this flag
        for (const roadId of [...flag.connectedRoads]) {
          this._demolishRoadSegment(state, roadId);
        }
        // Remove the flag itself
        state.flags.delete(flag.id);
        playDemolishSound();
        return;
      }
    }

    // 3. Check for a road passing through this tile
    for (const [, road] of state.roads) {
      if (road.owner !== "p0") continue;
      for (const pt of road.path) {
        if (pt.x === tileX && pt.z === tileZ) {
          this._demolishRoadSegment(state, road.id);
          playDemolishSound();
          return;
        }
      }
    }
  }

  /** Remove a single road segment: delete carrier, disconnect from both flags */
  private _demolishRoadSegment(state: SettlersState, roadId: string): void {
    const road = state.roads.get(roadId);
    if (!road) return;

    // Remove the carrier assigned to this road
    if (road.carrierId) {
      state.carriers.delete(road.carrierId);
    }

    // Disconnect from flagA
    const flagA = state.flags.get(road.flagA);
    if (flagA) {
      flagA.connectedRoads = flagA.connectedRoads.filter((r) => r !== roadId);
    }

    // Disconnect from flagB
    const flagB = state.flags.get(road.flagB);
    if (flagB) {
      flagB.connectedRoads = flagB.connectedRoads.filter((r) => r !== roadId);
    }

    state.roads.delete(roadId);
  }

  private _handleAttack(tileX: number, tileZ: number): void {
    const state = this._state;
    const idx = tileZ * state.map.width + tileX;
    const buildingId = state.map.occupied[idx];
    if (!buildingId) return;

    const building = state.buildings.get(buildingId);
    if (!building || building.owner === "p0") return;

    // Send up to 3 soldiers from nearest buildings (rally attack)
    let sent = 0;
    const maxSend = 3;

    // Sort own buildings by distance to target for smarter dispatching
    const targetX = (building.tileX + 1) * SB.TILE_SIZE;
    const targetZ = (building.tileZ + 1) * SB.TILE_SIZE;

    const candidates: { building: typeof building; dist: number }[] = [];
    for (const [, ownBuilding] of state.buildings) {
      if (ownBuilding.owner !== "p0") continue;
      if (ownBuilding.garrison.length <= 1) continue;
      const bx = (ownBuilding.tileX + 1) * SB.TILE_SIZE;
      const bz = (ownBuilding.tileZ + 1) * SB.TILE_SIZE;
      const dx = bx - targetX;
      const dz = bz - targetZ;
      candidates.push({ building: ownBuilding, dist: Math.sqrt(dx * dx + dz * dz) });
    }
    candidates.sort((a, b) => a.dist - b.dist);

    for (const c of candidates) {
      if (sent >= maxSend) break;
      while (c.building.garrison.length > 1 && sent < maxSend) {
        const soldierId = c.building.garrison.pop()!;
        const soldier = state.soldiers.get(soldierId);
        if (soldier) {
          soldier.state = "marching";
          soldier.garrisonedIn = null;
          soldier.targetBuildingId = buildingId;
          soldier.position = {
            x: (c.building.tileX + 1) * SB.TILE_SIZE,
            y: 0,
            z: (c.building.tileZ + 1) * SB.TILE_SIZE,
          };
          sent++;
        }
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
