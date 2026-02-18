import { viewManager } from "@view/ViewManager";
import { gridRenderer } from "@view/GridRenderer";
import { buildingLayer } from "@view/BuildingLayer";
import { unitLayer } from "@view/UnitLayer";
import { hud } from "@view/ui/HUD";
import { shopPanel } from "@view/ui/ShopPanel";
import { buildingPlacer } from "@view/ui/BuildingPlacer";
import { createGameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { initBases } from "@sim/systems/BaseSetup";
import { EventBus } from "@sim/core/EventBus";
import { Direction } from "@/types";

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

(async () => {
  const mountPoint = document.getElementById("pixi-container");
  if (!mountPoint) throw new Error("Missing #pixi-container in HTML");

  // 1. Simulation state
  const state = createGameState();
  state.players.set("p1", createPlayerState("p1", Direction.WEST));
  state.players.set("p2", createPlayerState("p2", Direction.EAST));
  initBases(state, { westPlayerId: "p1", eastPlayerId: "p2" });

  // 2. Boot renderer
  await viewManager.init(mountPoint);

  // 3. Grid background
  gridRenderer.init(viewManager);
  gridRenderer.draw(state.battlefield);
  EventBus.on("buildingPlaced", () => gridRenderer.draw(state.battlefield));
  EventBus.on("buildingDestroyed", () => gridRenderer.draw(state.battlefield));

  // 4. Building & base views
  buildingLayer.init(viewManager, state);
  viewManager.onUpdate((s) => buildingLayer.update(s));

  // 5. Unit views
  unitLayer.init(viewManager, state);
  viewManager.onUpdate((s) => unitLayer.update(s));

  // 6. HUD
  hud.init(viewManager, state, { westPlayerId: "p1", eastPlayerId: "p2" });
  viewManager.onUpdate((s) => hud.update(s));

  // 7. Shop panel (local player is p1 — west side)
  shopPanel.init(viewManager, state, "p1");
  viewManager.onUpdate((s) => shopPanel.update(s));

  // 8. Building placer (placement mode visual)
  buildingPlacer.init(viewManager, state, "p1");

  // 9. Render loop
  viewManager.app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    viewManager.update(state, dt);
  });
})();
