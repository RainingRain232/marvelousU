// ---------------------------------------------------------------------------
// Caesar – Main game orchestrator
// ---------------------------------------------------------------------------

import { CB, DIFFICULTY_MODS, type CaesarDifficulty } from "./config/CaesarBalance";
import { CaesarBuildingType, CAESAR_BUILDING_DEFS } from "./config/CaesarBuildingDefs";
import { CaesarResourceType } from "./config/CaesarResourceDefs";
import { createCaesarState, nextEntityId, type CaesarState } from "./state/CaesarState";
import { createBuilding } from "./state/CaesarBuilding";
import { generateTerrain, findStartPosition } from "./systems/CaesarTerrainSystem";
import {
  canPlaceBuilding,
  placeBuilding,
  demolishBuilding,
  updateConstruction,
  updateProduction,
  recalculateRoadConnectivity,
  recalculateDesirability,
} from "./systems/CaesarBuildingSystem";
import { updateHousing } from "./systems/CaesarHousingSystem";
import { updateWalkerSpawning, updateWalkerMovement } from "./systems/CaesarWalkerSystem";
import { updateTaxes, updateTribute, updateFoodConsumption, updateEmployment } from "./systems/CaesarEconomySystem";
import { updateImmigration } from "./systems/CaesarPopulationSystem";
import { updateRatings, checkVictory, checkDefeat } from "./systems/CaesarRatingSystem";
import { updateRaids, spawnDefenders, updateCombat } from "./systems/CaesarThreatSystem";
import { CaesarRenderer } from "./view/CaesarRenderer";
import { CaesarHUD } from "./view/CaesarHUD";

export class CaesarGame {
  private _state!: CaesarState;
  private _renderer = new CaesarRenderer();
  private _hud = new CaesarHUD();

  private _rafId: number | null = null;
  private _lastTime = 0;
  private _simAccumulator = 0;

  // Rating update throttle
  private _ratingTimer = 0;
  private _employTimer = 0;

  async boot(): Promise<void> {
    this._hud.build();
    this._hud.onStartGame = (difficulty) => this._startGame(difficulty as CaesarDifficulty);
    this._hud.onExit = () => this.destroy();
  }

  private async _startGame(difficulty: CaesarDifficulty): Promise<void> {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    // Apply difficulty modifiers to starting resources
    const mod = DIFFICULTY_MODS[difficulty];

    // Create state
    this._state = createCaesarState(sw, sh, difficulty);
    const gold = (this._state.resources.get(CaesarResourceType.GOLD) ?? 0) * mod.startGoldMult;
    this._state.resources.set(CaesarResourceType.GOLD, Math.floor(gold));

    // Generate terrain
    const seed = Math.floor(Math.random() * 100000);
    generateTerrain(this._state.map, seed);

    // Place initial roads and housing in town center
    const start = findStartPosition(this._state.map);
    this._placeInitialTown(start.x, start.y);

    // Calculate initial connectivity and desirability
    recalculateRoadConnectivity(this._state);
    recalculateDesirability(this._state);

    // Init renderer
    await this._renderer.init(sw, sh);
    this._renderer.centerOn(start.x, start.y);
    this._renderer.markTerrainDirty();

    // Wire HUD
    this._hud.onSelectTool = (tool) => {
      this._state.selectedTool = tool;
      if (tool !== "build") this._state.selectedBuildingType = null;
    };
    this._hud.onSelectBuildingType = (type) => {
      this._state.selectedBuildingType = type;
      this._state.selectedTool = "build";
    };
    this._hud.onSpeedChange = (speed) => {
      if (speed === 0) {
        this._state.paused = true;
      } else {
        this._state.paused = false;
        this._state.gameSpeed = speed;
      }
    };

    // Wire click input on canvas
    this._setupCanvasInput();

    // Start game loop
    this._lastTime = performance.now();
    this._gameLoop();
  }

  private _placeInitialTown(cx: number, cy: number): void {
    // Place a cross of roads
    for (let dx = -3; dx <= 3; dx++) {
      this._forcePlace(CaesarBuildingType.ROAD, cx + dx, cy);
    }
    for (let dy = -3; dy <= 3; dy++) {
      if (dy === 0) continue;
      this._forcePlace(CaesarBuildingType.ROAD, cx, cy + dy);
    }

    // Place a few starting houses
    this._forcePlace(CaesarBuildingType.HOUSING, cx + 1, cy - 1);
    this._forcePlace(CaesarBuildingType.HOUSING, cx + 1, cy + 1);
    this._forcePlace(CaesarBuildingType.HOUSING, cx - 1, cy - 1);
    this._forcePlace(CaesarBuildingType.HOUSING, cx - 1, cy + 1);

    // Place a well
    this._forcePlace(CaesarBuildingType.WELL, cx + 2, cy - 1);
  }

  /** Place a building bypassing gold check (for initial setup) */
  private _forcePlace(type: CaesarBuildingType, tx: number, ty: number): void {
    const bdef = CAESAR_BUILDING_DEFS[type];
    const id = nextEntityId(this._state);
    const b = createBuilding(id, type, tx, ty, bdef.hp || 30);
    b.built = true;
    b.constructionProgress = 1;
    this._state.buildings.set(id, b);
    if (type === CaesarBuildingType.ROAD) this._state.roadDirty = true;
  }

  private _setupCanvasInput(): void {
    const canvas = this._renderer.canvas;
    if (!canvas) return;

    canvas.addEventListener("click", (e) => {
      const tile = this._renderer.screenToTile(e.clientX, e.clientY);
      this._handleClick(tile.x, tile.y);
    });

    canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this._state.selectedTool = "select";
      this._state.selectedBuildingType = null;
      this._state.selectedBuildingId = null;
    });

    canvas.addEventListener("mousemove", (e) => {
      const tile = this._renderer.screenToTile(e.clientX, e.clientY);
      this._state.hoveredTileX = tile.x;
      this._state.hoveredTileY = tile.y;
    });
  }

  private _handleClick(tx: number, ty: number): void {
    const state = this._state;

    switch (state.selectedTool) {
      case "build": {
        if (!state.selectedBuildingType) break;
        const result = placeBuilding(state, state.selectedBuildingType, tx, ty);
        if (result) {
          this._renderer.markTerrainDirty();
        } else {
          this._hud.showNotification("Cannot build here!");
        }
        break;
      }

      case "road": {
        const result = placeBuilding(state, CaesarBuildingType.ROAD, tx, ty);
        if (result) {
          this._renderer.markTerrainDirty();
        }
        break;
      }

      case "demolish": {
        // Find building at this tile
        for (const b of state.buildings.values()) {
          const bdef = CAESAR_BUILDING_DEFS[b.type];
          if (tx >= b.tileX && tx < b.tileX + bdef.footprint.w &&
              ty >= b.tileY && ty < b.tileY + bdef.footprint.h) {
            demolishBuilding(state, b.id);
            this._renderer.markTerrainDirty();
            this._hud.showNotification(`Demolished ${bdef.label}`);
            break;
          }
        }
        break;
      }

      case "select": {
        state.selectedBuildingId = null;
        for (const b of state.buildings.values()) {
          const bdef = CAESAR_BUILDING_DEFS[b.type];
          if (tx >= b.tileX && tx < b.tileX + bdef.footprint.w &&
              ty >= b.tileY && ty < b.tileY + bdef.footprint.h) {
            state.selectedBuildingId = b.id;
            break;
          }
        }
        break;
      }
    }
  }

  private _gameLoop = (): void => {
    this._rafId = requestAnimationFrame(this._gameLoop);

    const now = performance.now();
    const frameMs = Math.min(now - this._lastTime, 100); // cap at 100ms
    this._lastTime = now;

    const state = this._state;
    if (!state) return;

    // Fixed-timestep simulation
    if (!state.paused && !state.gameOver) {
      this._simAccumulator += frameMs * state.gameSpeed;
      const tickMs = CB.SIM_TICK_MS;

      while (this._simAccumulator >= tickMs) {
        this._simAccumulator -= tickMs;
        this._simTick(tickMs / 1000); // dt in seconds
      }
    }

    // Render
    this._renderer.render(state, frameMs / 1000);
    this._hud.update(state);
  };

  private _simTick(dt: number): void {
    const state = this._state;
    state.gameTick++;

    // Recalculate connectivity and desirability if dirty
    recalculateRoadConnectivity(state);
    recalculateDesirability(state);

    // Construction
    updateConstruction(state, dt);

    // Production
    updateProduction(state, dt);

    // Housing evolution
    updateHousing(state, dt);

    // Walker spawning and movement
    updateWalkerSpawning(state, dt);
    updateWalkerMovement(state, dt);

    // Economy
    updateTaxes(state, dt);
    updateTribute(state, dt);
    updateFoodConsumption(state, dt);

    // Employment (throttled to once per second)
    this._employTimer += dt;
    if (this._employTimer >= 1) {
      this._employTimer -= 1;
      updateEmployment(state);
    }

    // Immigration
    updateImmigration(state, dt);

    // Threats
    updateRaids(state, dt);
    spawnDefenders(state);
    updateCombat(state, dt);

    // Ratings (throttled)
    this._ratingTimer += dt;
    if (this._ratingTimer >= 2) {
      this._ratingTimer -= 2;
      updateRatings(state);

      // Check win/loss
      if (checkVictory(state)) {
        state.gameOver = true;
        state.victory = true;
      } else if (checkDefeat(state)) {
        state.gameOver = true;
        state.victory = false;
      }
    }
  }

  destroy(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._renderer.destroy();
    this._hud.destroy();
    window.dispatchEvent(new Event("caesarExit"));
  }
}
