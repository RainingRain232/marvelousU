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
import { createGameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { initBases } from "@sim/systems/BaseSetup";
import { EventBus } from "@sim/core/EventBus";
import { Direction, GamePhase } from "@/types";

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

  // 3. Load spritesheets (falls back to generated placeholders automatically)
  await animationManager.load(viewManager.app.renderer);

  // 4. Grid background
  gridRenderer.init(viewManager);
  gridRenderer.draw(state.battlefield);
  EventBus.on("buildingPlaced", () => gridRenderer.draw(state.battlefield));
  EventBus.on("buildingDestroyed", () => gridRenderer.draw(state.battlefield));

  // 5. Building & base views
  buildingLayer.init(viewManager, state);
  viewManager.onUpdate((s, dt) => buildingLayer.update(s, dt));

  // 6. Unit views
  unitLayer.init(viewManager, state);
  viewManager.onUpdate((s) => unitLayer.update(s));

  // 7. HUD
  hud.init(viewManager, state, { westPlayerId: "p1", eastPlayerId: "p2" });
  viewManager.onUpdate((s) => hud.update(s));

  // 8. Shop panel (local player starts as p1 — west side)
  shopPanel.init(viewManager, state, "p1");
  viewManager.onUpdate((s) => shopPanel.update(s));

  // 9. Spawn queue UI
  unitQueueUI.init(viewManager, state);
  viewManager.onUpdate((s) => unitQueueUI.update(s));

  // 10. Input manager + building placer
  buildingPlacer.init(viewManager, state, "p1");
  inputManager.init(viewManager, state, "p1");

  // P2 AI buyer — enabled by default
  p2AIBuyer.setEnabled(true);
  viewManager.onUpdate((s, dt) => p2AIBuyer.update(s, dt));

  // HUD callbacks
  // AI toggle: enable/disable p2 AI; when disabled, let the user click p2 buildings.
  // We flip the *active player* for the input stack between p1 and p2 depending
  // on which side the user is currently operating. With AI on, input always targets p1.
  hud.onAIToggle = (isAI) => {
    p2AIBuyer.setEnabled(isAI);
    if (!isAI) {
      // Human wants to control p2 — default to p2 view so their castle is clickable
      shopPanel.setPlayerId("p2");
      buildingPlacer.setPlayerId("p2");
      inputManager.setPlayerId("p2");
    } else {
      // AI back on — revert to p1 control
      shopPanel.setPlayerId("p1");
      buildingPlacer.setPlayerId("p1");
      inputManager.setPlayerId("p1");
    }
  };

  // START BATTLE button: skip the PREP timer by zeroing phaseTimer
  hud.onStartBattle = () => {
    if (state.phase === GamePhase.PREP) {
      state.phaseTimer = 0;
    }
  };

  // 11. Spell FX
  fireballFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => fireballFX.update(dt));
  lightningFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => lightningFX.update(dt));
  summonFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => summonFX.update(dt));

  // 12. Death FX (must init after ViewManager so renderer is available)
  deathFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => deathFX.update(dt));

  // 13. Render loop
  viewManager.app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    viewManager.update(state, dt);
  });
})();
