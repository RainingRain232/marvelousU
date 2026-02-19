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
import { animationManager } from "@view/animation/AnimationManager";
import { startScreen } from "@view/ui/StartScreen";
import { menuScreen } from "@view/ui/MenuScreen";
import type { MapSize } from "@view/ui/MenuScreen";
import { victoryScreen } from "@view/ui/VictoryScreen";
import { createGameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { initBases } from "@sim/systems/BaseSetup";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { SimLoop } from "@sim/core/SimLoop";
import { EventBus } from "@sim/core/EventBus";
import { Direction, GamePhase } from "@/types";

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
 * Compute scaled base positions for a given map size.
 * Bases sit 1 tile from each side, vertically centred (accounting for 3-tile height).
 * Spawn offsets mirror the standard values.
 */
function _computeBasePositions(w: number, h: number) {
  const midY = Math.floor(h / 2) - 1; // centre the 3-tall castle
  return {
    westPosition:    { x: 1,     y: midY },
    eastPosition:    { x: w - 4, y: midY }, // castle is 3 wide; x + 3 = w - 1
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
    if (!isAI) {
      shopPanel.setPlayerId("p2");
      buildingPlacer.setPlayerId("p2");
      inputManager.setPlayerId("p2");
    } else {
      shopPanel.setPlayerId("p1");
      buildingPlacer.setPlayerId("p1");
      inputManager.setPlayerId("p1");
    }
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
}
