import { viewManager } from "@view/ViewManager";
import { createGameState } from "@sim/state/GameState";

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

(async () => {
  const mountPoint = document.getElementById("pixi-container");
  if (!mountPoint) throw new Error("Missing #pixi-container in HTML");

  // 1. Create simulation state
  const state = createGameState();

  // 2. Boot the renderer
  await viewManager.init(mountPoint);

  // 3. Wire the render loop: drive viewManager.update every Pixi tick
  viewManager.app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    viewManager.update(state, dt);
  });
})();
