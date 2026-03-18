// ---------------------------------------------------------------------------
// Terraria – Main game orchestrator
// ---------------------------------------------------------------------------

import { viewManager } from "@view/ViewManager";
import { TB } from "./config/TerrariaBalance";
import { createTerrariaState, addMessage } from "./state/TerrariaState";
import type { TerrariaState } from "./state/TerrariaState";
import { initTerrain, generateChunk, placeSpecialStructures, getSurfaceHeight } from "./systems/TerrariaTerrainSystem";
import { initInput, destroyInput, pollInput } from "./systems/TerrariaInputSystem";
import { updatePlayerPhysics, updateMobPhysics, updateDroppedItemPhysics } from "./systems/TerrariaPhysicsSystem";
import { updateMining } from "./systems/TerrariaBlockSystem";
import { updateDayNight } from "./systems/TerrariaDayNightSystem";
import { addToInventory } from "./state/TerrariaInventory";
import { recalcLighting } from "./systems/TerrariaLightingSystem";

import { TerrariaRenderer } from "./view/TerrariaRenderer";
import { TerrariaPlayerView } from "./view/TerrariaPlayerView";
import { TerrariaCamera } from "./view/TerrariaCamera";
import { TerrariaHUD } from "./view/TerrariaHUD";

// ---------------------------------------------------------------------------

export class TerrariaGame {
  private _state!: TerrariaState;
  private _renderer = new TerrariaRenderer();
  private _playerView = new TerrariaPlayerView();
  private _camera = new TerrariaCamera();
  private _hud = new TerrariaHUD();

  private _rafId: number | null = null;
  private _lastTime = 0;

  // -----------------------------------------------------------------------
  // Boot
  // -----------------------------------------------------------------------

  async boot(): Promise<void> {
    this._showTitleScreen();
  }

  private _showTitleScreen(): void {
    const overlay = document.createElement("div");
    overlay.id = "terraria-title";
    overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;z-index:100;
      background:linear-gradient(180deg,#0a1628 0%,#1a2a18 40%,#2a3a1a 100%);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Segoe UI',sans-serif;color:white;
    `;

    overlay.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:56px;margin-bottom:8px;">⚒️🏰⚔️</div>
        <h1 style="font-size:42px;color:#FFD700;margin:0;text-shadow:0 0 20px rgba(255,215,0,0.5);
            font-family:Georgia,serif;letter-spacing:4px;">CAMELOT DIG</h1>
        <p style="font-size:16px;color:#C0A060;margin:8px 0 40px;font-style:italic;">
          Dig deep. Build thy kingdom. Seek the Holy Grail.
        </p>
        <div style="margin-bottom:20px;">
          <label style="font-size:12px;color:#C0A060;">World Seed (optional):</label><br>
          <input id="td-seed-input" type="text" placeholder="Leave blank for random"
            style="width:200px;padding:6px 10px;margin-top:4px;background:rgba(0,0,0,0.4);
            border:1px solid #8B6914;border-radius:4px;color:#FFD700;font-size:14px;
            text-align:center;font-family:Georgia,serif;">
        </div>
        <div id="td-menu-buttons" style="display:flex;flex-direction:column;gap:12px;align-items:center;"></div>
        <div style="margin-top:40px;font-size:12px;opacity:0.4;">
          A/D or ←/→ = Move | Space/W = Jump | Left Click = Mine | Right Click = Place<br>
          E = Inventory | 1-9 = Hotbar | Shift = Sprint | ESC = Pause
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnContainer = overlay.querySelector("#td-menu-buttons")!;

    const btnStyle = `padding:10px 40px;font-size:18px;font-family:Georgia,serif;
      border:1px solid #8B6914;border-radius:6px;cursor:pointer;min-width:220px;
      transition:all 0.2s;`;

    // New World button
    const newBtn = document.createElement("button");
    newBtn.textContent = "New World";
    newBtn.style.cssText = btnStyle + "background:#2a1a0a;color:#FFD700;";
    newBtn.onmouseenter = () => { newBtn.style.background = "#3a2a1a"; };
    newBtn.onmouseleave = () => { newBtn.style.background = "#2a1a0a"; };
    newBtn.onclick = () => {
      const seedInput = (overlay.querySelector("#td-seed-input") as HTMLInputElement).value.trim();
      const seed = seedInput ? this._hashString(seedInput) : undefined;
      overlay.remove();
      this._startGame(seed, false);
    };
    btnContainer.appendChild(newBtn);

    // Creative button
    const creativeBtn = document.createElement("button");
    creativeBtn.textContent = "Creative Mode";
    creativeBtn.style.cssText = btnStyle + "background:#1a2a1a;color:#88DD88;";
    creativeBtn.onmouseenter = () => { creativeBtn.style.background = "#2a3a2a"; };
    creativeBtn.onmouseleave = () => { creativeBtn.style.background = "#1a2a1a"; };
    creativeBtn.onclick = () => {
      const seedInput = (overlay.querySelector("#td-seed-input") as HTMLInputElement).value.trim();
      const seed = seedInput ? this._hashString(seedInput) : undefined;
      overlay.remove();
      this._startGame(seed, true);
    };
    btnContainer.appendChild(creativeBtn);

    // Back button
    const backBtn = document.createElement("button");
    backBtn.textContent = "Back to Menu";
    backBtn.style.cssText = btnStyle + "background:#1a0a0a;color:#FF8866;margin-top:12px;";
    backBtn.onmouseenter = () => { backBtn.style.background = "#2a1a1a"; };
    backBtn.onmouseleave = () => { backBtn.style.background = "#1a0a0a"; };
    backBtn.onclick = () => {
      overlay.remove();
      this.destroy();
    };
    btnContainer.appendChild(backBtn);
  }

  private _hashString(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  // -----------------------------------------------------------------------
  // Start Game
  // -----------------------------------------------------------------------

  private _startGame(seed?: number, creative = false): void {
    viewManager.clearWorld();

    // Create state
    this._state = createTerrariaState(seed);
    this._state.creativeMode = creative;
    this._state.screenW = viewManager.screenWidth;
    this._state.screenH = viewManager.screenHeight;

    if (creative) {
      this._state.player.hp = 9999;
      this._state.player.maxHp = 9999;
    }

    // Generate world
    initTerrain(this._state.seed);
    const numChunks = Math.ceil(TB.WORLD_WIDTH / TB.CHUNK_W);
    for (let cx = 0; cx < numChunks; cx++) {
      this._state.chunks.set(cx, generateChunk(cx));
    }

    // Place special structures
    placeSpecialStructures(this._state.chunks, this._state.seed);

    // Place player at surface
    const spawnX = Math.floor(TB.WORLD_WIDTH / 2);
    const surfaceY = getSurfaceHeight(spawnX);
    this._state.player.x = spawnX + 0.5;
    this._state.player.y = surfaceY + 3;
    this._state.camX = this._state.player.x;
    this._state.camY = this._state.player.y;

    // Initial lighting
    recalcLighting(this._state);

    // Init renderer
    this._renderer.init();
    viewManager.addToLayer("units", this._renderer.worldLayer);
    this._renderer.entityLayer.addChild(this._playerView.container);

    // Init camera
    this._camera.setScreenSize(this._state.screenW, this._state.screenH);
    this._camera.x = this._state.player.x;
    this._camera.y = this._state.player.y;

    // Init HUD
    this._hud.build();
    this._hud.onExit = () => this.destroy();
    this._hud.setResumeCallback(() => {
      this._state.paused = false;
    });

    // Init input
    initInput();

    // Handle window resize
    window.addEventListener("resize", this._onResize);

    // Welcome message
    addMessage(this._state, "Welcome to Camelot Dig!", 0xFFD700);
    addMessage(this._state, creative ? "Creative mode — infinite resources" : "Mine, build, and seek the Holy Grail!", 0xC0A060);

    // Start game loop
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  // -----------------------------------------------------------------------
  // Game Loop
  // -----------------------------------------------------------------------

  private _gameLoop(timestamp: number): void {
    if (!this._state) return;

    const rawDt = (timestamp - this._lastTime) / 1000;
    this._lastTime = timestamp;
    const dt = Math.min(rawDt, 0.1);

    // Poll input
    const input = pollInput();

    // Handle hotbar selection
    if (input.hotbar >= 0) {
      this._state.player.inventory.selectedSlot = input.hotbar;
    }
    if (input.scrollDelta !== 0) {
      let slot = this._state.player.inventory.selectedSlot + Math.sign(input.scrollDelta);
      if (slot < 0) slot = 8;
      if (slot > 8) slot = 0;
      this._state.player.inventory.selectedSlot = slot;
    }

    // Toggle inventory
    if (input.inventory) {
      this._state.inventoryOpen = !this._state.inventoryOpen;
      if (this._state.inventoryOpen) {
        this._hud.showInventory(this._state);
      } else {
        this._hud.hideInventory();
        this._state.craftingOpen = false;
        this._state.craftingStation = null;
      }
    }

    // Toggle pause
    if (input.escape) {
      if (this._state.inventoryOpen) {
        this._state.inventoryOpen = false;
        this._state.craftingOpen = false;
        this._state.craftingStation = null;
        this._hud.hideInventory();
      } else {
        this._state.paused = !this._state.paused;
      }
    }

    if (!this._state.paused && !this._state.gameOver) {
      // Player movement
      const p = this._state.player;
      const speed = input.sprint ? TB.PLAYER_SPEED * TB.PLAYER_SPRINT_MULT : TB.PLAYER_SPEED;
      if (input.left) { p.vx = -speed; p.facingRight = false; }
      else if (input.right) { p.vx = speed; p.facingRight = true; }
      else { p.vx *= TB.FRICTION; }
      if (input.jump && p.onGround) { p.vy = TB.JUMP_VELOCITY; }

      // Physics
      updatePlayerPhysics(this._state, dt);
      updateMobPhysics(this._state, dt);
      updateDroppedItemPhysics(this._state, dt);

      // Mining / placing
      if (!this._state.inventoryOpen) {
        updateMining(this._state, input, this._camera, dt);
      }

      // Day/night
      updateDayNight(this._state, dt);

      // Timers
      if (p.invulnTimer > 0) p.invulnTimer -= dt;
      if (p.attackTimer > 0) p.attackTimer -= dt;

      // Pickup dropped items
      for (let i = this._state.droppedItems.length - 1; i >= 0; i--) {
        const di = this._state.droppedItems[i];
        if (di.pickupDelay > 0) continue;
        const ddx = di.x - p.x;
        const ddy = di.y - p.y;
        if (Math.sqrt(ddx * ddx + ddy * ddy) < 1.5) {
          if (addToInventory(p.inventory, di.item)) {
            this._state.droppedItems.splice(i, 1);
          }
        }
      }

      // Recalc lighting if needed
      let needsLightRecalc = false;
      for (const chunk of this._state.chunks.values()) {
        if (chunk.lightDirty) { needsLightRecalc = true; break; }
      }
      if (needsLightRecalc) recalcLighting(this._state);
    }

    // Camera
    this._camera.follow(this._state.player.x, this._state.player.y, dt);
    this._camera.update(dt);
    this._state.camX = this._camera.x;
    this._state.camY = this._camera.y;

    // Render
    this._renderer.draw(this._state, this._camera);
    this._playerView.draw(this._state, this._camera, dt);
    this._hud.update(this._state);

    // Continue loop
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  // -----------------------------------------------------------------------
  // Resize
  // -----------------------------------------------------------------------

  private _onResize = (): void => {
    if (!this._state) return;
    this._state.screenW = window.innerWidth;
    this._state.screenH = window.innerHeight;
    this._camera.setScreenSize(this._state.screenW, this._state.screenH);
    this._renderer.markAllDirty(this._state);
  };

  // -----------------------------------------------------------------------
  // Destroy
  // -----------------------------------------------------------------------

  destroy(): void {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    window.removeEventListener("resize", this._onResize);
    destroyInput();
    this._renderer.cleanup();
    this._playerView.destroy();
    this._hud.cleanup();
    viewManager.clearWorld();

    // Remove title screen if still present
    const title = document.getElementById("terraria-title");
    if (title) title.remove();

    window.dispatchEvent(new Event("terrariaExit"));
  }
}
