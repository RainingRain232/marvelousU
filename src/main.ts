import { viewManager } from "@view/ViewManager";
import { gridRenderer } from "@view/GridRenderer";
import { buildingLayer } from "@view/BuildingLayer";
import { unitLayer } from "@view/UnitLayer";
import { hud } from "@view/ui/HUD";
import { shopPanel } from "@view/ui/ShopPanel";
import { buildingPlacer } from "@view/ui/BuildingPlacer";
import { inputManager } from "@input/InputManager";
import { unitQueueUI } from "@view/ui/UnitQueueUI";
import { p2AIBuyer } from "@view/ui/P2AIBuyer";
import { fireballFX } from "@view/fx/FireballFX";
import { lightningFX } from "@view/fx/LightningFX";
import { summonFX } from "@view/fx/SummonFX";
import { deathFX } from "@view/fx/DeathFX";
import { iceBallFX } from "@view/fx/IceBallFX";
import { webFX } from "@view/fx/WebFX";
import { turretArrowFX } from "@view/fx/TurretArrowFX";
import { animationManager } from "@view/animation/AnimationManager";
import { startScreen } from "@view/ui/StartScreen";
import { menuScreen } from "@view/ui/MenuScreen";
import type { MapSize } from "@view/ui/MenuScreen";
import { victoryScreen } from "@view/ui/VictoryScreen";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { createGameState } from "@sim/state/GameState";
import type { GameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { initBases } from "@sim/systems/BaseSetup";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { SimLoop } from "@sim/core/SimLoop";
import { EventBus } from "@sim/core/EventBus";
import { Direction, GamePhase, BuildingType } from "@/types";
import { createBuilding } from "@sim/entities/Building";
import { setBuilding, setWalkable, getTile } from "@sim/core/Grid";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { BUILDING_MIN_GAP } from "@sim/systems/BuildingSystem";

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

(async () => {
  const mountPoint = document.getElementById("pixi-container");
  if (!mountPoint) throw new Error("Missing #pixi-container in HTML");

  // 1. Boot renderer first (needed for all screens)
  await viewManager.init(mountPoint);

  // 2. Load spritesheets (falls back to generated placeholders automatically)
  await animationManager.load(viewManager.app.renderer);

  // ---------------------------------------------------------------------------
  // Start screen
  // ---------------------------------------------------------------------------
  startScreen.init(viewManager);
  startScreen.show();

  // ---------------------------------------------------------------------------
  // Menu screen
  // ---------------------------------------------------------------------------
  menuScreen.init(viewManager);
  menuScreen.hide();

  // p2IsAI preference stored here so it is applied when the game boots
  let p2IsAI = true;
  menuScreen.onAIToggle = (isAI) => { p2IsAI = isAI; };

  startScreen.onStart = () => {
    startScreen.hide();
    menuScreen.show();
  };

  // ---------------------------------------------------------------------------
  // Game boot (deferred until "START GAME" is clicked)
  // ---------------------------------------------------------------------------
  menuScreen.onStartGame = async () => {
    const mapSize = menuScreen.selectedMapSize;
    menuScreen.hide();
    await _bootGame(p2IsAI, mapSize);
  };
})();

/**
 * Spawn 3 neutral Town buildings evenly spaced along the vertical centre of the map.
 * Towns are placed at the horizontal midpoint, spread across the map height.
 */
let _nextTownId = 1;
function _spawnTowns(state: GameState, mapW: number, mapH: number): void {
  const def = BUILDING_DEFINITIONS[BuildingType.TOWN];
  const midX = Math.floor(mapW / 2) - Math.floor(def.footprint.w / 2);
  // 3 towns spaced at 25%, 50%, 75% of map height
  const yPositions = [
    Math.floor(mapH * 0.25) - Math.floor(def.footprint.h / 2),
    Math.floor(mapH * 0.50) - Math.floor(def.footprint.h / 2),
    Math.floor(mapH * 0.75) - Math.floor(def.footprint.h / 2),
  ];

  for (const y of yPositions) {
    const id = `town-${_nextTownId++}`;
    const pos = { x: midX, y };
    const building = createBuilding({ id, type: BuildingType.TOWN, owner: null, position: pos });
    state.buildings.set(id, building);

    // Mark footprint tiles as occupied and unwalkable
    for (let dy = 0; dy < def.footprint.h; dy++) {
      for (let dx = 0; dx < def.footprint.w; dx++) {
        setBuilding(state.battlefield, pos.x + dx, pos.y + dy, id);
        setWalkable(state.battlefield, pos.x + dx, pos.y + dy, false);
      }
    }

    EventBus.emit("buildingPlaced", { buildingId: id, position: { ...pos }, owner: null });
  }
}

/**
 * Spawn 2 neutral Towers and 4 neutral Farms in random positions near the towns.
 * Buildings are spread across towns (not all clustered around one) and placed
 * only on free, walkable neutral tiles.  Positions vary every game.
 *
 * Distribution: for each of the 6 extras, we pick a town to anchor to and
 * attempt random offsets within SCATTER_RADIUS tiles until a free spot is found.
 */
let _nextNeutralId = 1;
function _spawnNeutralExtras(
  state: GameState,
  mapW: number,
  mapH: number,
): void {
  // Collect town positions from what was just placed
  const townPositions: Array<{ x: number; y: number }> = [];
  for (const b of state.buildings.values()) {
    if (b.type === BuildingType.TOWN) townPositions.push({ ...b.position });
  }
  if (townPositions.length === 0) return;

  const SCATTER_RADIUS = 5; // max tile offset from town anchor
  const MAX_ATTEMPTS = 80;

  // 2 towers + 4 farms; shuffle so placement order is random
  const typesToPlace: BuildingType[] = [
    BuildingType.TOWER, BuildingType.TOWER,
    BuildingType.FARM, BuildingType.FARM, BuildingType.FARM, BuildingType.FARM,
  ];
  // Fisher-Yates shuffle
  for (let i = typesToPlace.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [typesToPlace[i], typesToPlace[j]] = [typesToPlace[j], typesToPlace[i]];
  }

  // Round-robin across towns so extras are spread evenly
  let townIdx = Math.floor(Math.random() * townPositions.length);

  for (const bType of typesToPlace) {
    const def = BUILDING_DEFINITIONS[bType];
    const anchor = townPositions[townIdx % townPositions.length];
    townIdx++;

    let placed = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS && !placed; attempt++) {
      const ox = Math.floor((Math.random() * 2 - 1) * SCATTER_RADIUS);
      const oy = Math.floor((Math.random() * 2 - 1) * SCATTER_RADIUS);
      const px = anchor.x + ox;
      const py = anchor.y + oy;

      // Check all footprint tiles are in bounds, walkable, neutral zone, and free;
      // also enforce BUILDING_MIN_GAP halo around the footprint.
      let ok = true;
      const gap = BUILDING_MIN_GAP;
      outer:
      for (let dy = -gap; dy < def.footprint.h + gap && ok; dy++) {
        for (let dx = -gap; dx < def.footprint.w + gap && ok; dx++) {
          const tx = px + dx;
          const ty = py + dy;
          const isFootprint = dx >= 0 && dx < def.footprint.w && dy >= 0 && dy < def.footprint.h;
          if (isFootprint) {
            if (tx < 0 || ty < 0 || tx >= mapW || ty >= mapH) { ok = false; break outer; }
            const tile = state.battlefield.grid[ty]?.[tx];
            if (!tile || !tile.walkable || tile.buildingId !== null || tile.zone !== "neutral") {
              ok = false;
              break outer;
            }
          } else {
            const tile = getTile(state.battlefield, tx, ty);
            if (tile && tile.buildingId !== null) { ok = false; break outer; }
          }
        }
      }
      if (!ok) continue;

      const id = `neutral-${bType}-${_nextNeutralId++}`;
      const pos = { x: px, y: py };
      const building = createBuilding({ id, type: bType, owner: null, position: pos });
      state.buildings.set(id, building);

      for (let dy = 0; dy < def.footprint.h; dy++) {
        for (let dx = 0; dx < def.footprint.w; dx++) {
          setBuilding(state.battlefield, pos.x + dx, pos.y + dy, id);
          setWalkable(state.battlefield, pos.x + dx, pos.y + dy, false);
        }
      }

      EventBus.emit("buildingPlaced", { buildingId: id, position: { ...pos }, owner: null });
      placed = true;
    }
  }
}

/**
 * Compute scaled base positions for a given map size.
 * Bases sit 1 tile from each side, vertically centred (accounting for 3-tile height).
 * Spawn offsets mirror the standard values.
 */
function _computeBasePositions(w: number, h: number) {
  const midY = Math.floor(h / 2) - 2; // centre the 4-tall castle
  return {
    westPosition: { x: 1, y: midY },
    eastPosition: { x: w - 5, y: midY }, // castle is 4 wide; x + 4 = w - 1
    westSpawnOffset: { ...BalanceConfig.BASE_WEST_SPAWN_OFFSET },
    eastSpawnOffset: { ...BalanceConfig.BASE_EAST_SPAWN_OFFSET },
  };
}

async function _bootGame(p2IsAI: boolean, mapSize: MapSize): Promise<void> {
  // 1. Simulation state — sized to the chosen map
  const state = createGameState(mapSize.width, mapSize.height);
  state.players.set("p1", createPlayerState("p1", Direction.WEST));
  state.players.set("p2", createPlayerState("p2", Direction.EAST));
  const basePos = _computeBasePositions(mapSize.width, mapSize.height);
  initBases(state, { westPlayerId: "p1", eastPlayerId: "p2", ...basePos });
  _spawnTowns(state, mapSize.width, mapSize.height);
  _spawnNeutralExtras(state, mapSize.width, mapSize.height);

  // 2. Camera — fit the full map into the viewport
  viewManager.camera.setMapSize(mapSize.width, mapSize.height);
  viewManager.camera.fitMap();

  // 3. Grid background
  gridRenderer.init(viewManager);
  gridRenderer.draw(state.battlefield);
  EventBus.on("buildingPlaced", () => gridRenderer.draw(state.battlefield));
  EventBus.on("buildingDestroyed", () => gridRenderer.draw(state.battlefield));

  // 3. Building & base views
  buildingLayer.init(viewManager, state);

  // 4. Unit views
  unitLayer.init(viewManager, state);

  // 5. HUD
  hud.init(viewManager, state, { westPlayerId: "p1", eastPlayerId: "p2" });

  // 6. Shop panel (local player starts as p1 — west side)
  shopPanel.init(viewManager, state, "p1");

  // 7. Spawn queue UI
  unitQueueUI.init(viewManager, state);

  // 8. Input manager + building placer
  buildingPlacer.init(viewManager, state, "p1");
  inputManager.init(viewManager, state, "p1");

  // P2 AI buyer — state driven by menu choice
  p2AIBuyer.setEnabled(p2IsAI);
  hud.setP2AI(p2IsAI);

  // Wire per-frame updates now that game is live
  viewManager.onUpdate((s, dt) => buildingLayer.update(s, dt));
  viewManager.onUpdate((s) => unitLayer.update(s));
  viewManager.onUpdate((s) => hud.update(s));
  viewManager.onUpdate((s) => shopPanel.update(s));
  viewManager.onUpdate((s) => unitQueueUI.update(s));
  viewManager.onUpdate((s, dt) => p2AIBuyer.update(s, dt));

  // HUD callbacks
  hud.onAIToggle = (isAI) => {
    p2AIBuyer.setEnabled(isAI);
    // When switching to human mode, reset active control to P1
    // (hud.setP2AI already resets _activePlayer; just sync the sub-systems)
    shopPanel.setPlayerId("p1");
    buildingPlacer.setPlayerId("p1");
    inputManager.setPlayerId("p1");
  };

  hud.onSwitchPlayer = (playerId) => {
    shopPanel.setPlayerId(playerId);
    buildingPlacer.setPlayerId(playerId);
    inputManager.setPlayerId(playerId);
  };

  hud.onStartBattle = () => {
    if (state.phase === GamePhase.PREP) {
      state.phaseTimer = 0;
    }
  };

  // Spell FX
  fireballFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => fireballFX.update(dt));
  lightningFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => lightningFX.update(dt));
  summonFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => summonFX.update(dt));

  // Death FX
  deathFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => deathFX.update(dt));

  // IceBall FX
  iceBallFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => iceBallFX.update(dt));

  // Web / Net FX
  webFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => webFX.update(dt));

  // Building turret FX
  turretArrowFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => turretArrowFX.update(dt));

  // Victory screen (overlays game during RESOLVE)
  victoryScreen.init(viewManager, state);

  // Render loop drives game state updates
  viewManager.app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    viewManager.update(state, dt);
  });

  // Simulation loop (fixed timestep, drives all sim systems)
  const simLoop = new SimLoop(state);
  simLoop.start();

  // ---------------------------------------------------------------------------
  // Pause overlay + Space-to-pause
  // ---------------------------------------------------------------------------

  // Build a simple "PAUSED" overlay in the UI layer
  const pauseOverlay = new Container();
  const pauseBg = new Graphics()
    .rect(0, 0, viewManager.screenWidth, viewManager.screenHeight)
    .fill({ color: 0x000000, alpha: 0.45 });
  const pauseLabel = new Text({
    text: "PAUSED",
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 48,
      fill: 0xffffff,
      fontWeight: "bold",
      letterSpacing: 6,
    }),
  });
  pauseLabel.anchor.set(0.5, 0.5);
  pauseLabel.position.set(viewManager.screenWidth / 2, viewManager.screenHeight / 2);
  // Overlay must not block pointer events — UI buttons (shop, HUD) stay clickable while paused
  pauseOverlay.eventMode = "none";
  pauseOverlay.addChild(pauseBg, pauseLabel);
  pauseOverlay.visible = false;
  viewManager.addToLayer("ui", pauseOverlay);

  const togglePause = () => {
    simLoop.togglePause();
    pauseOverlay.visible = simLoop.isPaused;
    // Ticker keeps running so UI stays responsive; only the sim loop is frozen
  };

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !e.repeat) {
      // Don't pause if a text input or button is focused
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "button") return;
      e.preventDefault();
      togglePause();
    }
  });
}
