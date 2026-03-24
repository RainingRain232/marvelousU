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
  placeBuilding,
  demolishBuilding,
  updateConstruction,
  updateProduction,
  recalculateRoadConnectivity,
  recalculateDesirability,
  recalculateStorageCaps,
} from "./systems/CaesarBuildingSystem";
import { updateHousing } from "./systems/CaesarHousingSystem";
import { updateWalkerSpawning, updateWalkerMovement } from "./systems/CaesarWalkerSystem";
import { updateTaxes, updateTribute, updateFoodConsumption, updateEmployment, updateGoodsAndTrade } from "./systems/CaesarEconomySystem";
import { updateImmigration } from "./systems/CaesarPopulationSystem";
import { updateRatings, checkVictory, checkDefeat } from "./systems/CaesarRatingSystem";
import { updateRaids, spawnDefenders, updateCombat } from "./systems/CaesarThreatSystem";
import { updateEvents } from "./systems/CaesarEventSystem";
import { updateAdvisor } from "./systems/CaesarAdvisorSystem";
import { updateFires } from "./systems/CaesarFireSystem";
import { updateMorale } from "./systems/CaesarMoraleSystem";
import { updateUpgrades, startUpgrade, canUpgrade } from "./systems/CaesarUpgradeSystem";
import { updateCaravans, executeBuyFromCaravan, executeSellToCaravan } from "./systems/CaesarTradeSystem";
import { saveToLocalStorage, loadFromLocalStorage, hasSave as _hasSave } from "./systems/CaesarSaveSystem";
import { CaesarRenderer } from "./view/CaesarRenderer";
import { CaesarHUD } from "./view/CaesarHUD";

export class CaesarGame {
  private _state!: CaesarState;
  private _renderer = new CaesarRenderer();
  private _hud = new CaesarHUD();

  private _rafId: number | null = null;
  private _lastTime = 0;
  private _simAccumulator = 0;

  private _ratingTimer = 0;
  private _employTimer = 0;
  private _storageDirtyTimer = 0;
  private _lastDragTileX = -1;
  private _lastDragTileY = -1;
  private _lastAutosave = performance.now();
  private _lastPlacedBuildingId: number | null = null;

  async boot(): Promise<void> {
    this._hud.build();
    this._hud.onStartGame = (difficulty, scenarioId) => this._startGame(difficulty as CaesarDifficulty, scenarioId);
    this._hud.onExit = () => this.destroy();
  }

  private async _startGame(difficulty: CaesarDifficulty, scenarioId: number = 0): Promise<void> {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const mod = DIFFICULTY_MODS[difficulty];

    this._state = createCaesarState(sw, sh, difficulty, scenarioId);
    const gold = (this._state.resources.get(CaesarResourceType.GOLD) ?? 0) * mod.startGoldMult;
    this._state.resources.set(CaesarResourceType.GOLD, Math.floor(gold));

    const seed = Math.floor(Math.random() * 100000);
    generateTerrain(this._state.map, seed);

    const start = findStartPosition(this._state.map);
    this._placeInitialTown(start.x, start.y);

    recalculateRoadConnectivity(this._state);
    recalculateDesirability(this._state);
    recalculateStorageCaps(this._state);

    await this._renderer.init(sw, sh);
    this._renderer.centerOn(start.x, start.y);
    this._renderer.markTerrainDirty();

    this._wireHUD();
    this._setupCanvasInput();

    this._lastTime = performance.now();
    this._gameLoop();
  }

  private _wireHUD(): void {
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
    this._hud.onSetPriority = (buildingId: number, priority: "high" | "normal" | "low") => {
      const b = this._state.buildings.get(buildingId);
      if (b) { b.workerPriority = priority; this._hud.showNotification(`Priority set to ${priority}`); }
    };
    this._hud.onCaravanBuy = (index: number) => {
      if (executeBuyFromCaravan(this._state, index)) this._hud.showNotification("Purchased!");
      else this._hud.showNotification("Not enough gold!");
    };
    this._hud.onCaravanSell = (index: number) => {
      if (executeSellToCaravan(this._state, index)) this._hud.showNotification("Sold!");
      else this._hud.showNotification("Not enough resources!");
    };
    this._hud.onUpgrade = (buildingId: number) => {
      if (startUpgrade(this._state, buildingId)) {
        this._hud.showNotification("Upgrade started!");
      } else {
        const b = this._state.buildings.get(buildingId);
        if (b) {
          const check = canUpgrade(this._state, b);
          this._hud.showNotification(check.reason || "Cannot upgrade");
        }
      }
    };
    this._hud.onSave = () => {
      if (saveToLocalStorage(this._state)) {
        this._hud.showNotification("Game saved!");
      } else {
        this._hud.showNotification("Save failed!");
      }
    };
    this._hud.onUndo = () => {
      if (this._lastPlacedBuildingId !== null) {
        const b = this._state.buildings.get(this._lastPlacedBuildingId);
        if (b) {
          const def = CAESAR_BUILDING_DEFS[b.type];
          if (def) {
            this._state.resources.set(CaesarResourceType.GOLD,
              (this._state.resources.get(CaesarResourceType.GOLD) ?? 0) + def.cost);
          }
          this._state.buildings.delete(this._lastPlacedBuildingId);
          this._lastPlacedBuildingId = null;
          this._renderer.markTerrainDirty();
          this._hud.showNotification("Undo: building removed, cost refunded");
        }
      }
    };
    this._hud.onLoad = () => {
      if (loadFromLocalStorage(this._state)) {
        this._renderer.markTerrainDirty();
        recalculateRoadConnectivity(this._state);
        recalculateDesirability(this._state);
        recalculateStorageCaps(this._state);
        this._hud.showNotification("Game loaded!");
      } else {
        this._hud.showNotification("No save found!");
      }
    };
  }

  private _placeInitialTown(cx: number, cy: number): void {
    for (let dx = -4; dx <= 4; dx++) {
      this._forcePlace(CaesarBuildingType.ROAD, cx + dx, cy);
    }
    for (let dy = -4; dy <= 4; dy++) {
      if (dy === 0) continue;
      this._forcePlace(CaesarBuildingType.ROAD, cx, cy + dy);
    }
    for (let dx = 1; dx <= 3; dx++) {
      this._forcePlace(CaesarBuildingType.ROAD, cx + dx, cy - 2);
      this._forcePlace(CaesarBuildingType.ROAD, cx + dx, cy + 2);
      this._forcePlace(CaesarBuildingType.ROAD, cx - dx, cy - 2);
      this._forcePlace(CaesarBuildingType.ROAD, cx - dx, cy + 2);
    }

    this._forcePlace(CaesarBuildingType.HOUSING, cx + 1, cy - 1);
    this._forcePlace(CaesarBuildingType.HOUSING, cx + 2, cy - 1);
    this._forcePlace(CaesarBuildingType.HOUSING, cx + 1, cy + 1);
    this._forcePlace(CaesarBuildingType.HOUSING, cx + 2, cy + 1);
    this._forcePlace(CaesarBuildingType.HOUSING, cx - 1, cy - 1);
    this._forcePlace(CaesarBuildingType.HOUSING, cx - 2, cy - 1);
    this._forcePlace(CaesarBuildingType.HOUSING, cx - 1, cy + 1);
    this._forcePlace(CaesarBuildingType.HOUSING, cx - 2, cy + 1);

    this._forcePlace(CaesarBuildingType.WELL, cx + 3, cy - 1);
    this._forcePlace(CaesarBuildingType.WELL, cx - 3, cy + 1);

    let placed = 0;
    for (const b of this._state.buildings.values()) {
      if (b.type === CaesarBuildingType.HOUSING && placed < 16) {
        b.residents = 2;
        placed += 2;
      }
    }
    this._state.population = placed;
  }

  private _forcePlace(type: CaesarBuildingType, tx: number, ty: number): void {
    const bdef = CAESAR_BUILDING_DEFS[type];
    const id = nextEntityId(this._state);
    const b = createBuilding(id, type, tx, ty, bdef.hp || 30);
    b.built = true;
    b.constructionProgress = 1;
    this._state.buildings.set(id, b);
    if (type === CaesarBuildingType.ROAD || type === CaesarBuildingType.GATE) {
      this._state.roadDirty = true;
    }
  }

  private _setupCanvasInput(): void {
    const canvas = this._renderer.canvas;
    if (!canvas) return;

    canvas.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || e.shiftKey) return;
      const tile = this._renderer.screenToTile(e.clientX, e.clientY);
      if (this._state.selectedTool === "road" ||
          (this._state.selectedTool === "build" &&
           this._state.selectedBuildingType === CaesarBuildingType.HOUSING) ||
          this._state.selectedTool === "demolish") {
        this._state.isDragging = true;
        this._lastDragTileX = tile.x;
        this._lastDragTileY = tile.y;
        this._handleClick(tile.x, tile.y);
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      const tile = this._renderer.screenToTile(e.clientX, e.clientY);
      this._state.hoveredTileX = tile.x;
      this._state.hoveredTileY = tile.y;
      if (this._state.isDragging &&
          (tile.x !== this._lastDragTileX || tile.y !== this._lastDragTileY)) {
        this._lastDragTileX = tile.x;
        this._lastDragTileY = tile.y;
        this._handleClick(tile.x, tile.y);
      }
    });

    canvas.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        if (!this._state.isDragging) {
          const tile = this._renderer.screenToTile(e.clientX, e.clientY);
          this._handleClick(tile.x, tile.y);
        }
        this._state.isDragging = false;
      }
    });

    canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this._state.selectedTool = "select";
      this._state.selectedBuildingType = null;
      this._state.selectedBuildingId = null;
      this._hud.clearInfoPanel();
    });
  }

  private _handleClick(tx: number, ty: number): void {
    const state = this._state;
    switch (state.selectedTool) {
      case "build": {
        if (!state.selectedBuildingType) break;
        const result = placeBuilding(state, state.selectedBuildingType, tx, ty);
        if (result) {
          this._lastPlacedBuildingId = result.id;
          this._renderer.markTerrainDirty();
          this._storageDirtyTimer = 0; // recompute storage caps
        } else if (!state.isDragging) {
          this._hud.showNotification("Cannot build here!");
        }
        break;
      }
      case "road": {
        const result = placeBuilding(state, CaesarBuildingType.ROAD, tx, ty);
        if (result) { this._lastPlacedBuildingId = result.id; this._renderer.markTerrainDirty(); }
        break;
      }
      case "demolish": {
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
        // Auto-fight fire on clicked burning building
        const clickedBuilding = state.buildings.get(state.selectedBuildingId ?? -1);
        if (clickedBuilding?.onFire) {
          const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
          if (gold >= 20) {
            state.resources.set(CaesarResourceType.GOLD, gold - 20);
            clickedBuilding.onFire = false;
            clickedBuilding.fireTimer = 0;
            this._hud.showNotification("Fire extinguished! (-20 gold)");
          } else {
            this._hud.showNotification("Not enough gold to fight the fire (need 20).");
          }
        }
        break;
      }
    }
  }

  private _gameLoop = (): void => {
    this._rafId = requestAnimationFrame(this._gameLoop);
    const now = performance.now();
    const frameMs = Math.min(now - this._lastTime, 100);
    this._lastTime = now;

    const state = this._state;
    if (!state) return;

    if (!state.paused && !state.gameOver) {
      this._simAccumulator += frameMs * state.gameSpeed;
      const tickMs = CB.SIM_TICK_MS;
      while (this._simAccumulator >= tickMs) {
        this._simAccumulator -= tickMs;
        this._simTick(tickMs / 1000);
      }
    }

    // Autosave every 5 minutes of wall-clock time
    if (performance.now() - this._lastAutosave > 300000) {
      this._lastAutosave = performance.now();
      this._hud.onSave?.();
      this._hud.showNotification("Game autosaved");
    }

    this._renderer.render(state, frameMs / 1000);
    this._hud.update(state);
  };

  private _simTick(dt: number): void {
    const state = this._state;
    state.gameTick++;

    recalculateRoadConnectivity(state);
    recalculateDesirability(state);

    // Recalculate storage caps periodically (not every tick)
    this._storageDirtyTimer += dt;
    if (this._storageDirtyTimer >= 5) {
      this._storageDirtyTimer -= 5;
      recalculateStorageCaps(state);
    }

    updateConstruction(state, dt);
    updateUpgrades(state, dt);
    updateProduction(state, dt);
    updateHousing(state, dt);
    updateFires(state, dt);
    updateWalkerSpawning(state, dt);
    updateWalkerMovement(state, dt);
    updateTaxes(state, dt);
    updateTribute(state, dt);
    updateFoodConsumption(state, dt);
    updateGoodsAndTrade(state, dt);

    this._employTimer += dt;
    if (this._employTimer >= 1) {
      this._employTimer -= 1;
      updateEmployment(state);
    }

    updateImmigration(state, dt);
    updateEvents(state, dt);
    updateMorale(state, dt);
    updateCaravans(state, dt);
    updateRaids(state, dt);
    spawnDefenders(state);
    updateCombat(state, dt);
    updateAdvisor(state, dt);

    this._ratingTimer += dt;
    if (this._ratingTimer >= 2) {
      this._ratingTimer -= 2;
      updateRatings(state);

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
