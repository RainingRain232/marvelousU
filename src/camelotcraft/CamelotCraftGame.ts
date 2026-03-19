// ---------------------------------------------------------------------------
// Camelot Craft – Main game orchestrator
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { CB } from "./config/CraftBalance";
import { ItemType, WEAPON_DAMAGE } from "./config/CraftRecipeDefs";
import { createCraftState, type CraftState, addMessage, getWorldBlock, setWorldBlock } from "./state/CraftState";
import { BlockType } from "./config/CraftBlockDefs";
import { CraftChunk, chunkKey, worldToChunk } from "./state/CraftChunk";
import { getHeldItem, addToInventory } from "./state/CraftInventory";
import { generateChunkTerrain } from "./systems/CraftTerrainSystem";
import { decorateChunkStructures } from "./systems/CraftStructureSystem";
import { getBiome, BIOME_DEFS } from "./config/CraftBiomeDefs";
import { raycastBlock, startMining, updateMining, placeBlock } from "./systems/CraftBlockSystem";
import { matchRecipe } from "./systems/CraftCraftingSystem";
import { spawnMobs, updateMobs, damageMob } from "./systems/CraftMobSystem";
import { updateDayNight } from "./systems/CraftDayNightSystem";
import { CraftInputSystem } from "./systems/CraftInputSystem";
import { saveCraftWorld, loadCraftWorld, hasCraftSave } from "./systems/CraftSaveSystem";
import { BLOCK_DEFS } from "./config/CraftBlockDefs";
import { initAudio, playBlockBreak, playBlockPlace, playPickup, playHurt, playFootstep, playChestOpen, playMobSound, playAmbient, stopAmbient, destroyAudio, playQuestComplete, playLevelUp } from "./systems/CraftAudioSystem";
import { updateQuests, onBlockPlaced, onBlockMined, onItemCrafted, onMobKilled, checkVictory } from "./systems/CraftQuestSystem";
import { updateFurnaces, getContainerInteraction, type ContainerInteraction } from "./systems/CraftContainerSystem";
import { interactWithNPC } from "./systems/CraftNPCSystem";
import { getMobsNear } from "./systems/CraftMobSystem";
import { MobType, MOB_DEFS } from "./config/CraftMobDefs";
import { updateDroppedItems, dropItem } from "./systems/CraftItemDropSystem";
import { initMusic, updateMusic, stopMusic, destroyMusic } from "./systems/CraftMusicSystem";
import { createMountState, tryMount, dismount, updateMount } from "./systems/CraftMountSystem";
import { checkAchievements } from "./systems/CraftAchievementSystem";
import { toggleDoor, isDoor } from "./systems/CraftDoorSystem";
import { CraftRenderer } from "./view/CraftRenderer";
import { CraftHUD } from "./view/CraftHUD";

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export class CamelotCraftGame {
  private _state!: CraftState;
  private _renderer = new CraftRenderer();
  private _hud = new CraftHUD();
  private _input = new CraftInputSystem();

  private _rafId: number | null = null;
  private _lastTime = 0;
  private _chunkGenQueue: [number, number][] = [];

  private _customSeed?: number;
  private _isCreative = false;
  private _isNewWorld = false;
  private _tutorialStep = 0;
  private _tutorialTimer = 0;
  private _mount = createMountState();
  private _mobSoundTimer = 0;
  private _achTimer = 0;
  private _discoveredBiomes = new Set<string>();

  async boot(): Promise<void> {
    // --- Title / loading screen ---
    this._showTitleScreen();
  }

  private _showTitleScreen(): void {
    const overlay = document.createElement("div");
    overlay.id = "camelot-craft-title";
    overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;z-index:100;
      background:linear-gradient(180deg,#1a0a2e 0%,#2d1b4e 40%,#4a2a5e 100%);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Segoe UI',sans-serif;color:white;
    `;

    overlay.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:64px;margin-bottom:8px;">⚔🏰⚔</div>
        <h1 style="font-size:42px;color:#FFD700;margin:0;text-shadow:0 0 20px rgba(255,215,0,0.5);
            font-family:Georgia,serif;letter-spacing:4px;">CAMELOT CRAFT</h1>
        <p style="font-size:16px;color:#C0A060;margin:8px 0 40px;font-style:italic;">
          Build thy kingdom. Seek the Grail. Forge thy legend.
        </p>
        <div style="margin-bottom:20px;">
          <label style="font-size:12px;color:#C0A060;">World Seed (optional):</label><br>
          <input id="cc-seed-input" type="text" placeholder="Leave blank for random"
            style="width:200px;padding:6px 10px;margin-top:4px;background:rgba(0,0,0,0.4);
            border:1px solid #8B6914;border-radius:4px;color:#FFD700;font-size:14px;
            text-align:center;font-family:Georgia,serif;">
        </div>
        <div id="cc-menu-buttons" style="display:flex;flex-direction:column;gap:12px;align-items:center;"></div>
        <div style="margin-top:40px;font-size:12px;opacity:0.4;">
          WASD = Move | Mouse = Look | Left Click = Mine | Right Click = Place<br>
          E = Inventory | 1-9 = Hotbar | Space = Jump | Shift = Sprint | ESC = Pause
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnContainer = overlay.querySelector("#cc-menu-buttons")!;

    // New World button
    const newBtn = this._createMenuButton("⚔ New World", "#FFD700");
    newBtn.onclick = () => {
      const seedInput = document.getElementById("cc-seed-input") as HTMLInputElement;
      const seedVal = seedInput?.value?.trim();
      this._customSeed = seedVal ? hashString(seedVal) : undefined;
      overlay.remove();
      this._startGame(false);
    };
    btnContainer.appendChild(newBtn);

    const creativeBtn = this._createMenuButton("Creative Mode", "#4CAF50");
    creativeBtn.onclick = () => {
      const seedInput = document.getElementById("cc-seed-input") as HTMLInputElement;
      const seedVal = seedInput?.value?.trim();
      this._customSeed = seedVal ? hashString(seedVal) : undefined;
      this._isCreative = true;
      overlay.remove();
      this._startGame(false);
    };
    btnContainer.appendChild(creativeBtn);

    // Continue button (if save exists)
    if (hasCraftSave()) {
      const loadBtn = this._createMenuButton("📜 Continue", "#90CAF9");
      loadBtn.onclick = () => {
        overlay.remove();
        this._startGame(true);
      };
      btnContainer.appendChild(loadBtn);
    }

    // Back to menu
    const backBtn = this._createMenuButton("← Back to Menu", "#999");
    backBtn.onclick = () => {
      overlay.remove();
      window.dispatchEvent(new Event("camelotCraftExit"));
    };
    btnContainer.appendChild(backBtn);
  }

  private _createMenuButton(text: string, color: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.cssText = `
      width:260px; padding:14px 24px; font-size:18px; font-family:Georgia,serif;
      background:rgba(0,0,0,0.4); color:${color}; border:2px solid ${color};
      border-radius:8px; cursor:pointer; letter-spacing:2px;
      transition: all 0.2s;
    `;
    btn.onmouseenter = () => {
      btn.style.background = `rgba(255,255,255,0.1)`;
      btn.style.transform = "scale(1.05)";
    };
    btn.onmouseleave = () => {
      btn.style.background = "rgba(0,0,0,0.4)";
      btn.style.transform = "scale(1)";
    };
    return btn;
  }

  private _startGame(loadSave: boolean): void {
    // Initialize state
    if (loadSave) {
      const saved = loadCraftWorld();
      if (saved) {
        this._state = saved;
      } else {
        this._state = createCraftState();
      }
    } else {
      this._state = createCraftState(this._customSeed);
      this._isNewWorld = true;
    }

    this._state.screenW = window.innerWidth;
    this._state.screenH = window.innerHeight;

    if (this._isCreative) {
      this._state.creativeMode = true;
      // Give starter items in creative
      addMessage(this._state, "Creative Mode enabled! Fly with Space, infinite blocks.", 0x4CAF50);
    }

    // Show loading screen
    const loadingEl = document.createElement("div");
    loadingEl.id = "cc-loading";
    loadingEl.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;z-index:150;
      background:linear-gradient(180deg,#1a0a2e,#2d1b4e);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:Georgia,serif;color:#FFD700;
    `;
    loadingEl.innerHTML = `
      <div style="font-size:28px;margin-bottom:16px;">Forging the Realm...</div>
      <div id="cc-load-bar" style="width:300px;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
        <div id="cc-load-fill" style="width:0%;height:100%;background:#FFD700;border-radius:3px;transition:width 0.2s;"></div>
      </div>
      <div id="cc-load-tip" style="font-size:12px;color:#C0A060;margin-top:16px;font-style:italic;">
        Tip: Build shelter before your first nightfall to survive!
      </div>
    `;
    document.body.appendChild(loadingEl);

    const tips = [
      "Tip: Build shelter before your first nightfall to survive!",
      "Tip: Mine deep for enchanted crystals — they glow purple.",
      "Tip: The Lady of the Lake knows where Excalibur rests.",
      "Tip: Right-click chests and furnaces to interact with them.",
      "Tip: Mushroom stew restores more hunger than raw food.",
      "Tip: Saxon raiders grow bolder at night. Arm thyself!",
      "Tip: Build a Round Table to recruit Knights to your cause.",
    ];
    const tipEl = loadingEl.querySelector("#cc-load-tip")!;
    tipEl.textContent = tips[Math.floor(Math.random() * tips.length)];

    // Build view
    this._renderer.build();
    this._hud.build();

    // Init input
    this._input.init();

    // Init audio & music
    initAudio();
    initMusic();

    // Generate initial chunks with progress
    this._ensureChunksAround(
      Math.floor(this._state.player.position.x),
      Math.floor(this._state.player.position.z),
    );

    // Process all queued chunks with progress bar
    const totalChunks = this._chunkGenQueue.length;
    let processed = 0;
    const fillEl = loadingEl.querySelector("#cc-load-fill") as HTMLDivElement;

    const processChunksAsync = (): Promise<void> => {
      return new Promise((resolve) => {
        const step = () => {
          const batch = 4;
          for (let i = 0; i < batch && this._chunkGenQueue.length > 0; i++) {
            const [cx, cz] = this._chunkGenQueue.shift()!;
            const key = chunkKey(cx, cz);
            const chunk = this._state.chunks.get(key);
            if (chunk && !chunk.populated) {
              generateChunkTerrain(chunk, this._state.seed);
              decorateChunkStructures(chunk, this._state.seed, getBiome(0.5, 0.5));
              chunk.populated = true;
              chunk.rebuildHeightMap();
              chunk.dirty = true;
            }
            processed++;
          }
          if (fillEl) fillEl.style.width = `${Math.min(100, (processed / totalChunks) * 100)}%`;
          if (this._chunkGenQueue.length > 0) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    };

    processChunksAsync().then(() => {
      // Find valid spawn position
      if (!loadSave) {
        this._findSpawnPosition();
      }

      // Remove loading screen
      loadingEl.remove();
      this._input.requestPointerLock();

      // Welcome message
      if (!loadSave) {
        addMessage(this._state, "Welcome to Camelot Craft! Build thy kingdom.", 0xFFD700);
        addMessage(this._state, "Seek wood to craft tools. Build shelter before nightfall!", 0xC0A060);

        // Tutorial hints (show progressively)
        this._tutorialStep = 0;
        this._tutorialTimer = 0;
      }

      // HUD callbacks
      this._hud.onCraftResultClick = () => this._onCraftResult();
      this._hud.setUnequipHandler(this._state);

      // Start game loop
      this._lastTime = performance.now();
      this._loop(this._lastTime);
    });

    // Pause on ESC
    document.addEventListener("keydown", this._onKeyDown);

    // Pause when tab loses focus
    document.addEventListener("visibilitychange", this._onVisChange);

    // Save periodically with indicator
    this._autoSaveInterval = window.setInterval(() => {
      if (!this._state.paused) {
        saveCraftWorld(this._state);
        addMessage(this._state, "World saved.", 0x888888);
      }
    }, 60000);
  }

  private _autoSaveInterval = 0;

  private _onVisChange = (): void => {
    if (document.hidden && !this._state.paused) {
      this._state.paused = true;
      this._showPauseMenu();
    }
  };

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      if (this._state.inventoryOpen || this._state.craftingOpen) {
        this._state.inventoryOpen = false;
        this._state.craftingOpen = false;
        this._input.requestPointerLock();
        return;
      }
      this._togglePause();
    }
    // F5 = toggle camera mode (first-person → third-person → orbit)
    if (e.key === "F5") {
      e.preventDefault();
      this._renderer.cameraCtrl.toggleMode();
      const mode = this._renderer.cameraCtrl.mode;
      const names = { first: "First Person", third: "Third Person", orbit: "Cinematic Orbit" };
      addMessage(this._state, `Camera: ${names[mode]}`, 0x90CAF9);
    }
  };

  private _togglePause(): void {
    this._state.paused = !this._state.paused;
    if (this._state.paused) {
      this._showPauseMenu();
    } else {
      // Request pointer lock BEFORE removing overlay so the user gesture is still valid
      this._input.requestPointerLock();
      const pauseEl = document.getElementById("cc-pause");
      pauseEl?.remove();
    }
  }

  private _showPauseMenu(): void {
    document.exitPointerLock?.();

    const overlay = document.createElement("div");
    overlay.id = "cc-pause";
    overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;z-index:200;
      background:rgba(0,0,0,0.7);display:flex;flex-direction:column;
      align-items:center;justify-content:center;font-family:Georgia,serif;
    `;

    const title = document.createElement("h2");
    title.textContent = "⚔ Paused ⚔";
    title.style.cssText = `color:#FFD700;font-size:32px;margin-bottom:24px;`;
    overlay.appendChild(title);

    const resumeBtn = this._createMenuButton("Resume", "#FFD700");
    resumeBtn.onclick = () => this._togglePause();
    overlay.appendChild(resumeBtn);

    const settingsBtn = this._createMenuButton("Settings", "#90CAF9");
    settingsBtn.style.marginTop = "12px";
    settingsBtn.onclick = () => this._showSettings(overlay);
    overlay.appendChild(settingsBtn);

    const inventoryBtn = this._createMenuButton("Inventory", "#CE93D8");
    inventoryBtn.style.marginTop = "12px";
    inventoryBtn.onclick = () => {
      this._state.paused = false;
      this._state.inventoryOpen = true;
      this._state.craftingOpen = false;
      overlay.remove();
    };
    overlay.appendChild(inventoryBtn);

    const helpBtn = this._createMenuButton("Controls", "#A0A0A0");
    helpBtn.style.marginTop = "12px";
    helpBtn.onclick = () => this._showControls(overlay);
    overlay.appendChild(helpBtn);

    const saveBtn = this._createMenuButton("Save & Quit", "#4CAF50");
    saveBtn.style.marginTop = "12px";
    saveBtn.onclick = () => {
      saveCraftWorld(this._state);
      overlay.remove();
      this.destroy();
      window.dispatchEvent(new Event("camelotCraftExit"));
    };
    overlay.appendChild(saveBtn);

    const quitBtn = this._createMenuButton("Quit Without Saving", "#e53935");
    quitBtn.style.marginTop = "12px";
    quitBtn.onclick = () => {
      overlay.remove();
      this.destroy();
      window.dispatchEvent(new Event("camelotCraftExit"));
    };
    overlay.appendChild(quitBtn);

    document.body.appendChild(overlay);
  }

  private _showSettings(_pauseOverlay: HTMLDivElement): void {
    const card = document.createElement("div");
    card.id = "cc-settings";
    card.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:210;
      background:rgba(40,30,20,0.95);border:2px solid #8B6914;border-radius:8px;
      padding:24px;color:white;font-family:'Segoe UI',sans-serif;min-width:320px;
      box-shadow:0 0 30px rgba(139,105,20,0.3);
    `;
    card.innerHTML = `
      <h3 style="color:#FFD700;margin:0 0 16px;text-align:center;">Settings</h3>
      <div style="margin-bottom:12px;">
        <label style="font-size:13px;">Render Distance: <span id="rd-val">${CB.RENDER_DISTANCE}</span></label><br>
        <input type="range" id="rd-slider" min="2" max="10" value="${CB.RENDER_DISTANCE}"
          style="width:100%;margin-top:4px;accent-color:#FFD700;">
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:13px;">SFX Volume: <span id="sfx-val">${Math.round(CB.SFX_VOLUME * 100)}%</span></label><br>
        <input type="range" id="sfx-slider" min="0" max="100" value="${Math.round(CB.SFX_VOLUME * 100)}"
          style="width:100%;margin-top:4px;accent-color:#FFD700;">
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:13px;">Music Volume: <span id="mus-val">${Math.round(CB.AMBIENT_VOLUME * 100)}%</span></label><br>
        <input type="range" id="mus-slider" min="0" max="100" value="${Math.round(CB.AMBIENT_VOLUME * 100)}"
          style="width:100%;margin-top:4px;accent-color:#FFD700;">
      </div>
      <div style="margin-bottom:16px;">
        <label style="font-size:13px;">Mouse Sensitivity</label><br>
        <input type="range" id="sens-slider" min="1" max="10" value="5"
          style="width:100%;margin-top:4px;accent-color:#FFD700;">
      </div>
    `;

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Back";
    closeBtn.style.cssText = `display:block;margin:0 auto;padding:8px 24px;background:rgba(0,0,0,0.4);color:#FFD700;border:1px solid #FFD700;border-radius:4px;cursor:pointer;`;
    closeBtn.onclick = () => card.remove();
    card.appendChild(closeBtn);

    document.body.appendChild(card);

    // Live slider updates
    card.querySelector("#rd-slider")?.addEventListener("input", (e) => {
      const v = +(e.target as HTMLInputElement).value;
      (CB as any).RENDER_DISTANCE = v;
      card.querySelector("#rd-val")!.textContent = String(v);
    });
    card.querySelector("#sfx-slider")?.addEventListener("input", (e) => {
      const v = +(e.target as HTMLInputElement).value / 100;
      (CB as any).SFX_VOLUME = v;
      card.querySelector("#sfx-val")!.textContent = `${Math.round(v * 100)}%`;
    });
    card.querySelector("#mus-slider")?.addEventListener("input", (e) => {
      const v = +(e.target as HTMLInputElement).value / 100;
      (CB as any).AMBIENT_VOLUME = v;
      card.querySelector("#mus-val")!.textContent = `${Math.round(v * 100)}%`;
    });
  }

  private _showControls(_pauseOverlay: HTMLDivElement): void {
    const card = document.createElement("div");
    card.id = "cc-controls";
    card.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:210;
      background:rgba(40,30,20,0.95);border:2px solid #8B6914;border-radius:8px;
      padding:24px;color:white;font-family:'Segoe UI',sans-serif;min-width:360px;
      box-shadow:0 0 30px rgba(139,105,20,0.3);
    `;
    card.innerHTML = `
      <h3 style="color:#FFD700;margin:0 0 16px;text-align:center;">Controls</h3>
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr><td style="padding:3px 8px;color:#C0A060;">WASD</td><td>Move</td></tr>
        <tr><td style="padding:3px 8px;color:#C0A060;">Mouse</td><td>Look around</td></tr>
        <tr><td style="padding:3px 8px;color:#C0A060;">Left Click</td><td>Mine / Attack</td></tr>
        <tr><td style="padding:3px 8px;color:#C0A060;">Right Click</td><td>Place block / Interact</td></tr>
        <tr><td style="padding:3px 8px;color:#C0A060;">Space</td><td>Jump / Swim up</td></tr>
        <tr><td style="padding:3px 8px;color:#C0A060;">Shift</td><td>Sprint</td></tr>
        <tr><td style="padding:3px 8px;color:#C0A060;">E</td><td>Inventory / Crafting</td></tr>
        <tr><td style="padding:3px 8px;color:#C0A060;">Q</td><td>Eat food (held item)</td></tr>
        <tr><td style="padding:3px 8px;color:#C0A060;">1-9</td><td>Select hotbar slot</td></tr>
        <tr><td style="padding:3px 8px;color:#C0A060;">Scroll</td><td>Cycle hotbar</td></tr>
        <tr><td style="padding:3px 8px;color:#C0A060;">ESC</td><td>Pause / Close menu</td></tr>
      </table>
      <div style="margin-top:12px;font-size:11px;color:#888;text-align:center;">
        Right-click chests and furnaces to open them.<br>
        Craft tools at a crafting table to mine faster.
      </div>
    `;

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Back";
    closeBtn.style.cssText = `display:block;margin:12px auto 0;padding:8px 24px;background:rgba(0,0,0,0.4);color:#FFD700;border:1px solid #FFD700;border-radius:4px;cursor:pointer;`;
    closeBtn.onclick = () => card.remove();
    card.appendChild(closeBtn);

    document.body.appendChild(card);
  }

  // =========================================================================
  // Game loop
  // =========================================================================

  private _loop = (now: number): void => {
    this._rafId = requestAnimationFrame(this._loop);

    const dt = Math.min((now - this._lastTime) / 1000, 0.1); // cap at 100ms
    this._lastTime = now;

    if (this._state.paused) {
      this._hud.update(this._state);
      return;
    }

    // Update screen size
    this._state.screenW = window.innerWidth;
    this._state.screenH = window.innerHeight;

    // --- Creative mode: prevent death ---
    if (this._state.creativeMode) {
      this._state.player.hp = this._state.player.maxHp;
    }

    // --- Death check ---
    if (this._state.player.hp <= 0 && !this._state.gameOver) {
      this._handleDeath();
      return;
    }

    // --- Mount system ---
    if (this._mount.mounted) {
      updateMount(this._state, this._mount, dt, this._input.keys);
      // F key to dismount
      if (this._input.keys["KeyF"] && this._mount.dismountCd <= 0) {
        dismount(this._state, this._mount);
      }
    } else {
      // F key to mount nearby horse
      if (this._input.keys["KeyF"]) {
        tryMount(this._state, this._mount);
      }
    }

    // --- Input & player physics (skip if mounted — mount handles movement) ---
    if (!this._mount.mounted) {
      this._input.update(this._state, dt);
    } else {
      // Still need mouse look while mounted
      const p = this._state.player;
      p.yaw -= this._input.mouseDelta.x * 0.002;
      p.pitch -= this._input.mouseDelta.y * 0.002;
      p.pitch = Math.max(-1.5, Math.min(1.5, p.pitch));
    }

    // --- Hunger drain ---
    if (!this._state.creativeMode) this._updateHunger(dt);

    // --- Invulnerability timer ---
    if (this._state.player.invulnTimer > 0) {
      this._state.player.invulnTimer -= dt;
    }

    // --- Chunk loading (distance-prioritized) ---
    this._ensureChunksAround(
      Math.floor(this._state.player.position.x),
      Math.floor(this._state.player.position.z),
    );
    this._processChunkGenQueue();

    // --- Block interaction ---
    this._handleBlockInteraction(dt);

    // --- Mining ---
    updateMining(this._state, dt);

    // --- Day/night ---
    updateDayNight(this._state, dt);

    // --- Mobs ---
    spawnMobs(this._state, dt);
    updateMobs(this._state, dt);

    // --- Mob ambient sounds (occasional) ---
    this._mobSoundTimer += dt;
    if (this._mobSoundTimer > 5) { // every 5 seconds
      this._mobSoundTimer = 0;
      const nearMobs = getMobsNear(this._state, this._state.player.position, 16);
      for (const mob of nearMobs) {
        if (Math.random() < 0.15) { // 15% chance per nearby mob
          playMobSound(mob.type);
          break; // only one sound at a time
        }
      }
    }

    // --- Furnaces ---
    updateFurnaces(this._state, dt);

    // --- Footsteps ---
    const p = this._state.player;
    const speed = Math.sqrt(p.velocity.x ** 2 + p.velocity.z ** 2);
    playFootstep(p.onGround, speed > 0.5, p.sprinting, p.inWater);

    // --- Level up check ---
    const xpForNext = p.level * 10;
    if (p.xp >= xpForNext) {
      p.xp -= xpForNext;
      p.level++;
      p.maxHp += 2;
      p.hp = Math.min(p.hp + 4, p.maxHp);
      addMessage(this._state, `Level up! You are now level ${p.level}!`, 0x7CFC00);
      playLevelUp();
    }

    // --- Dragon boss ---
    this._checkDragonSpawn(dt);

    // --- Quests ---
    updateQuests(this._state);

    // --- Tutorial hints ---
    if (this._isNewWorld) this._updateTutorial(dt);

    // --- Victory check ---
    if (checkVictory(this._state) && !this._state.victory) {
      this._state.victory = true;
      playQuestComplete();
      setTimeout(() => this._showVictoryScreen(), 2000);
    }

    // --- Dropped items ---
    updateDroppedItems(this._state, dt);

    // --- Achievements (check every 2 seconds) ---
    this._achTimer = (this._achTimer ?? 0) + dt;
    if (this._achTimer > 2) { this._achTimer = 0; checkAchievements(this._state); }

    // --- Biome name display ---
    this._checkBiomeChange();

    // --- Sync weather HUD indicator ---
    try {
      const currentWeather = this._renderer.weather?.getCurrentWeather?.() ?? "clear";
      this._hud.setWeather(currentWeather);
    } catch { /* weather not available */ }

    // --- Ambient atmosphere particles ---
    const pp = this._state.player.position;
    this._renderer.particles.emitAmbient(pp.x, pp.y, pp.z, this._state.timeOfDay);

    // --- Ambient audio & music ---
    playAmbient(this._state.timeOfDay);
    updateMusic(this._state.timeOfDay, dt);

    // --- Render ---
    this._renderer.render(this._state, dt);
    this._hud.update(this._state);

    // --- Reset input deltas ---
    this._input.resetDeltas();
  };

  // =========================================================================
  // Block interaction (mining / placing)
  // =========================================================================

  private _prevMiningTarget: { wx: number; wy: number; wz: number; color: number; blockType: BlockType } | null = null;

  private _handleBlockInteraction(_dt: number): void {
    if (this._state.inventoryOpen || this._state.craftingOpen) return;

    const cam = this._renderer.cameraCtrl;
    const dir = cam.getForward();
    const origin = cam.camera.position.clone();
    const particles = this._renderer.particles;

    // Detect when mining completes (target disappears after being set)
    const mt = this._state.player.miningTarget;
    if (this._prevMiningTarget && !mt) {
      const { wx, wy, wz, color, blockType: minedType } = this._prevMiningTarget;
      particles.emitBlockBreak(wx, wy, wz, color);
      // Material-aware break sound
      const blockName = BLOCK_DEFS[minedType]?.name.toLowerCase() ?? "";
      const material = blockName.includes("log") || blockName.includes("plank") || blockName.includes("door") ? "wood"
        : blockName.includes("iron") || blockName.includes("gold") || blockName.includes("anvil") ? "metal"
        : blockName.includes("glass") || blockName.includes("crystal") || blockName.includes("ice") ? "glass"
        : blockName.includes("dirt") || blockName.includes("grass") || blockName.includes("sand") || blockName.includes("clay") ? "dirt"
        : "stone";
      playBlockBreak(material);
      this._state.player.blocksMined++;
      // Track quest progress for mined block
      onBlockMined(this._state, minedType);
    }
    // Track mining target with its block color and type
    if (mt) {
      const block = getWorldBlock(this._state, mt.wx, mt.wy, mt.wz);
      const blockColor = BLOCK_DEFS[block]?.color ?? 0x808080;
      this._prevMiningTarget = { wx: mt.wx, wy: mt.wy, wz: mt.wz, color: blockColor, blockType: block };
    } else {
      this._prevMiningTarget = null;
    }

    // Emit mining dust while actively mining (with correct block color)
    if (mt && mt.progress > 0) {
      const block = getWorldBlock(this._state, mt.wx, mt.wy, mt.wz);
      const dustColor = BLOCK_DEFS[block]?.color ?? 0x808080;
      particles.emitMiningDust(mt.wx, mt.wy, mt.wz, dustColor);
    }

    const hit = raycastBlock(this._state, origin, dir, CB.PLAYER_REACH);

    // Ghost preview for block placement
    const heldItem = getHeldItem(this._state.player.inventory);
    if (hit && heldItem && heldItem.itemType === ItemType.BLOCK && heldItem.blockType !== undefined) {
      const gx = hit.wx + hit.nx, gy = hit.wy + hit.ny, gz = hit.wz + hit.nz;
      this._renderer.showGhost(gx, gy, gz, BLOCK_DEFS[heldItem.blockType]?.color ?? 0xFFFFFF);
    } else {
      this._renderer.hideGhost();
    }

    if (hit) {
      this._renderer.showSelection(hit.wx, hit.wy, hit.wz);

      // Left click = mine
      if (this._input.mouseDown.left) {
        if (
          !this._state.player.miningTarget ||
          this._state.player.miningTarget.wx !== hit.wx ||
          this._state.player.miningTarget.wy !== hit.wy ||
          this._state.player.miningTarget.wz !== hit.wz
        ) {
          startMining(this._state, hit.wx, hit.wy, hit.wz);
        }
      } else {
        this._state.player.miningTarget = null;
      }

      // Right click = interact or place
      if (this._input.mouseDown.right) {
        this._input.mouseDown.right = false;

        // Check for special block interactions
        const hitBlock = getWorldBlock(this._state, hit.wx, hit.wy, hit.wz);
        if (this._handleSpecialBlock(hitBlock, hit.wx, hit.wy, hit.wz)) return;

        // Check for container interaction (chest, furnace)
        const container = getContainerInteraction(this._state, hit.wx, hit.wy, hit.wz);
        if (container) {
          this._openContainer(container);
          return;
        }

        const held = getHeldItem(this._state.player.inventory);
        if (held && held.itemType === ItemType.BLOCK && held.blockType !== undefined) {
          const px = hit.wx + hit.nx;
          const py = hit.wy + hit.ny;
          const pz = hit.wz + hit.nz;
          const placed = placeBlock(this._state, px, py, pz, held.blockType);
          if (placed) {
            playBlockPlace();
            onBlockPlaced(this._state, held.blockType);
            particles.emitBlockPlace(px, py, pz, BLOCK_DEFS[held.blockType]?.color ?? 0xAAAAAA);
            this._state.player.blocksPlaced++;
          }
        }
      }
    } else {
      this._renderer.hideSelection();
      this._state.player.miningTarget = null;

      // Right-click on NPC (no block hit)
      if (this._input.mouseDown.right) {
        this._input.mouseDown.right = false;
        this._tryInteractNPC(origin, dir);
      }
    }

    // Attack mobs with left click
    if (this._input.mouseDown.left && !this._state.player.miningTarget) {
      this._tryAttackMob(origin, dir);
    }
  }

  private _tryAttackMob(origin: THREE.Vector3, dir: THREE.Vector3): void {
    const p = this._state.player;

    // Attack cooldown check
    if (p.attackTimer > 0) return;

    for (const mob of this._state.mobs) {
      const toMob = mob.position.clone().sub(origin);
      const dist = toMob.length();
      if (dist > CB.PLAYER_REACH) continue;

      const dot = toMob.normalize().dot(dir);
      if (dot > 0.7) {
        const held = getHeldItem(p.inventory);
        let dmg: number = CB.PLAYER_ATTACK_DAMAGE;
        let kbMult = 1.0;
        let sweepRange = 0; // hit nearby mobs too
        let lifesteal = 0;
        let extraMsg = "";

        if (held?.itemType === ItemType.WEAPON) {
          dmg = WEAPON_DAMAGE[held.specialId ?? ""] ?? dmg;

          // Weapon special abilities
          const wid = held.specialId ?? "";
          if (wid === "crystal_sword") {
            // Crystal: sweep attack hits nearby mobs
            sweepRange = 3;
            extraMsg = " [Sweep!]";
          } else if (wid === "excalibur") {
            // Excalibur: lifesteal + massive knockback + golden particles
            lifesteal = Math.ceil(dmg * 0.3);
            kbMult = 2.0;
            this._renderer.particles.emitBlockBreak(mob.position.x, mob.position.y + 1, mob.position.z, 0xFFD700);
            extraMsg = " [Holy Smite!]";
          } else if (wid.includes("stone")) {
            // Stone: extra knockback
            kbMult = 1.5;
          } else if (wid.includes("iron")) {
            // Iron: armor piercing (ignore 50% armor)
            extraMsg = " [Pierce!]";
          }
        }
        if (held?.itemType === ItemType.TOOL) dmg += 2;

        const kb = dir.clone().multiplyScalar(CB.KNOCKBACK_FORCE * kbMult);
        damageMob(this._state, mob.id, dmg, kb);

        // Sweep attack: damage nearby mobs too
        if (sweepRange > 0) {
          for (const nearMob of this._state.mobs) {
            if (nearMob.id === mob.id) continue;
            if (nearMob.position.distanceTo(mob.position) < sweepRange) {
              damageMob(this._state, nearMob.id, Math.ceil(dmg * 0.5), kb.clone().multiplyScalar(0.5));
            }
          }
        }

        // Lifesteal
        if (lifesteal > 0) {
          p.hp = Math.min(p.maxHp, p.hp + lifesteal);
        }

        if (extraMsg) addMessage(this._state, `${dmg} damage${extraMsg}`, 0xFFD700);
        playHurt();

        // Hit particles + screen shake
        this._renderer.particles.emitHit(mob.position, 0xFF4444);
        this._renderer.cameraCtrl.shake(0.15);

        // Set attack cooldown + consume weapon durability
        p.attackTimer = CB.PLAYER_ATTACK_COOLDOWN;
        if (held && held.durability !== undefined) {
          held.durability--;
          if (held.durability <= 0) {
            p.inventory.hotbar[p.inventory.selectedSlot] = null;
            addMessage(this._state, `${held.displayName} broke!`, 0xFF6600);
          }
        }

        if (mob.hp <= 0) {
          onMobKilled(this._state, mob.type);
          // XP orb particles flying from mob to player
          const xpAmount = MOB_DEFS[mob.type]?.xpDrop ?? 3;
          this._renderer.particles.emitXPOrb(
            mob.position.clone(),
            this._state.player.position.clone().add(new THREE.Vector3(0, 1, 0)),
            Math.min(xpAmount, 5),
          );
        }

        this._input.mouseDown.left = false;
        break;
      }
    }
  }

  // =========================================================================
  // NPC Interaction (right-click on friendly mobs)
  // =========================================================================

  private _tryInteractNPC(origin: THREE.Vector3, dir: THREE.Vector3): void {
    const nearby = getMobsNear(this._state, origin, CB.PLAYER_REACH + 1);
    for (const mob of nearby) {
      const def = MOB_DEFS[mob.type];
      if (def.behavior !== "friendly" && def.behavior !== "passive") continue;

      const toMob = mob.position.clone().sub(origin);
      const dot = toMob.normalize().dot(dir);
      if (dot > 0.6) {
        const result = interactWithNPC(this._state, mob);
        if (result) {
          // Show dialog overlay briefly
          this._showNPCDialog(result.message);
        }
        break;
      }
    }
  }

  private _showNPCDialog(message: string): void {
    const dialog = document.createElement("div");
    dialog.style.cssText = `
      position:fixed;bottom:200px;left:50%;transform:translateX(-50%);
      max-width:500px;background:rgba(30,20,10,0.9);border:2px solid #8B6914;
      border-radius:8px;padding:16px 24px;color:#E0D0A0;font-size:14px;
      font-family:Georgia,serif;text-align:center;z-index:30;
      box-shadow:0 0 20px rgba(139,105,20,0.3);
      animation:fadeIn 0.3s ease;
    `;
    dialog.textContent = message;
    document.body.appendChild(dialog);
    setTimeout(() => {
      dialog.style.opacity = "0";
      dialog.style.transition = "opacity 0.5s";
      setTimeout(() => dialog.remove(), 500);
    }, 4000);
  }

  // =========================================================================
  // Special Block Interactions (Excalibur, Grail, Bed, Crafting Table)
  // =========================================================================

  private _handleSpecialBlock(block: BlockType, wx: number, wy: number, wz: number): boolean {
    const p = this._state.player;

    // --- Sword in Stone (spawn sword) ---
    if (block === BlockType.ENCHANTED_STONE && this._swordStonePos &&
        wx === this._swordStonePos.x && wy === this._swordStonePos.y && wz === this._swordStonePos.z) {
      // Remove the stone
      setWorldBlock(this._state, wx, wy, wz, BlockType.AIR);
      this._swordStonePos = null;

      // Give Iron Excalibur
      const swordItem: import("./config/CraftRecipeDefs").ItemStack = {
        itemType: ItemType.WEAPON,
        specialId: "iron_sword",
        count: 1,
        displayName: "Iron Excalibur",
        color: 0xC8C8E0,
        durability: 500,
        maxDurability: 500,
      };
      addToInventory(p.inventory, swordItem);

      addMessage(this._state, "You pull the blade from the stone... Your long-lost Iron Excalibur is retrieved!", 0xFFD700);
      addMessage(this._state, "This ancient blade still hums with power. Wield it well, knight.", 0xC0A060);
      playQuestComplete();
      this._renderer.cameraCtrl.shake(0.3);
      this._renderer.particles.emitBlockBreak(wx, wy, wz, 0xC8C8E0);
      this._renderer.particles.emitBlockBreak(wx, wy, wz, 0x7B68EE);
      return true;
    }

    // --- Excalibur (Crystal Block on Gold Block = Excalibur pedestal) ---
    if (block === BlockType.CRYSTAL_BLOCK || block === BlockType.ENCHANTED_CRYSTAL_ORE) {
      const below = getWorldBlock(this._state, wx, wy - 1, wz);
      if (below === BlockType.GOLD_BLOCK && !p.hasExcalibur) {
        p.hasExcalibur = true;
        setWorldBlock(this._state, wx, wy, wz, BlockType.AIR);

        // Add Excalibur to inventory as a weapon
        const excaliburItem: import("./config/CraftRecipeDefs").ItemStack = {
          itemType: ItemType.WEAPON,
          specialId: "excalibur",
          count: 1,
          displayName: "Excalibur",
          color: 0xFFD700,
          durability: 9999,
          maxDurability: 9999,
        };
        addToInventory(p.inventory, excaliburItem);

        addMessage(this._state, "You draw EXCALIBUR from the crystal! The blade sings with ancient power!", 0xFFD700);
        this._showNPCDialog("EXCALIBUR IS YOURS! You are the true King of Camelot. Mining speed greatly increased.");
        playQuestComplete();
        this._renderer.cameraCtrl.shake(0.4);
        this._renderer.particles.emitBlockBreak(wx, wy, wz, 0xFFD700);
        this._renderer.particles.emitBlockBreak(wx, wy, wz, 0x9C27B0);
        return true;
      }
    }

    // --- Holy Grail (Grail Pedestal) ---
    if (block === BlockType.GRAIL_PEDESTAL && !p.hasGrail) {
      p.hasGrail = true;
      addMessage(this._state, "You have found THE HOLY GRAIL! The quest is complete!", 0xFFD700);
      this._showNPCDialog("THE HOLY GRAIL! A divine light fills the chamber. Camelot shall stand eternal!");
      playQuestComplete();
      this._renderer.cameraCtrl.shake(0.5);
      // Golden particle explosion
      for (let i = 0; i < 5; i++) {
        this._renderer.particles.emitBlockBreak(wx, wy, wz, 0xFFD700);
      }
      return true;
    }

    // --- Crafting Table (open crafting grid) ---
    if (block === BlockType.CRAFTING_TABLE) {
      this._state.inventoryOpen = true;
      this._state.craftingOpen = true;
      document.exitPointerLock?.();
      return true;
    }

    // --- Bed (set spawn point — using Banner Block as bed substitute) ---
    if (block === BlockType.BANNER_BLOCK) {
      p.spawnPoint.set(wx, wy + 1, wz);
      addMessage(this._state, "Spawn point set!", 0x4CAF50);

      // Skip night if it's dark
      if (this._state.timeOfDay > 0.75 || this._state.timeOfDay < 0.25) {
        this._state.timeOfDay = 0.3; // set to morning
        this._state.dayNumber++;
        addMessage(this._state, `You slept through the night. Day ${this._state.dayNumber} dawns.`, 0xC0A060);
      }
      return true;
    }

    // --- Door toggle ---
    if (isDoor(block)) {
      toggleDoor(this._state, wx, wy, wz);
      return true;
    }

    return false;
  }

  // =========================================================================
  // Dragon Boss Spawning
  // =========================================================================

  private _dragonSpawnTimer = 0;
  private _dragonSpawned = false;

  private _dragonWarningStage = 0;

  private _checkDragonSpawn(dt: number): void {
    if (this._dragonSpawned) return;

    // Dragon quest must be unlocked (Chapter 4)
    const dragonQuest = this._state.quests.find(q => q.id === "defeat_dragon");
    if (!dragonQuest || !dragonQuest.unlocked) return;

    this._dragonSpawnTimer += dt;

    // Progressive warnings before spawn
    if (this._dragonWarningStage === 0 && this._dragonSpawnTimer > 30) {
      this._dragonWarningStage = 1;
      addMessage(this._state, "The ground trembles beneath your feet...", 0xFF6600);
      this._renderer.cameraCtrl.shake(0.1);
    }
    if (this._dragonWarningStage === 1 && this._dragonSpawnTimer > 60) {
      this._dragonWarningStage = 2;
      addMessage(this._state, "A distant roar echoes across the mountains!", 0xFF4444);
      this._renderer.cameraCtrl.shake(0.2);
      playMobSound("dragon");
    }
    if (this._dragonWarningStage === 2 && this._dragonSpawnTimer > 90) {
      this._dragonWarningStage = 3;
      addMessage(this._state, "SHADOW FALLS! THE DRAGON APPROACHES!", 0xFF0000);
      this._renderer.cameraCtrl.shake(0.4);

      // Spawn dragon dramatically
      const p = this._state.player.position;
      const angle = Math.random() * Math.PI * 2;
      const dist = 50;
      const spawnPos = new THREE.Vector3(
        p.x + Math.cos(angle) * dist,
        p.y + 25, // high in the sky
        p.z + Math.sin(angle) * dist,
      );

      const dragon = {
        id: this._state.nextMobId++,
        type: MobType.DRAGON,
        position: spawnPos,
        velocity: new THREE.Vector3(),
        hp: MOB_DEFS[MobType.DRAGON].hp,
        maxHp: MOB_DEFS[MobType.DRAGON].hp,
        yaw: Math.atan2(p.x - spawnPos.x, p.z - spawnPos.z),
        target: null,
        attackTimer: 0,
        hurtTimer: 0,
        despawnTimer: 0,
        aiState: "chase" as const,
        aiTimer: 0,
      };

      this._state.mobs.push(dragon);
      this._dragonSpawned = true;
      addMessage(this._state, "A DRAGON approaches! The earth trembles!", 0xFF4444);
    }
  }

  // =========================================================================
  // Death & Respawn
  // =========================================================================

  private _handleDeath(): void {
    this._state.gameOver = true;
    document.exitPointerLock?.();

    // Drop all inventory items at death location
    this._dropAllItems();

    const overlay = document.createElement("div");
    overlay.id = "cc-death";
    overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;z-index:200;
      background:rgba(80,0,0,0.85);display:flex;flex-direction:column;
      align-items:center;justify-content:center;font-family:Georgia,serif;
      animation: fadeIn 0.5s ease-in;
    `;
    overlay.innerHTML = `
      <h1 style="font-size:48px;color:#e53935;text-shadow:0 0 20px rgba(229,57,53,0.5);margin:0;">
        Thou Hast Fallen
      </h1>
      <p style="color:#C0A0A0;font-size:16px;margin:12px 0 32px;font-style:italic;">
        The realm mourns thy defeat. But legends never truly die...
      </p>
    `;

    const respawnBtn = this._createMenuButton("Respawn", "#FFD700");
    respawnBtn.onclick = () => {
      overlay.remove();
      this._respawn();
    };
    overlay.appendChild(respawnBtn);

    const quitBtn = this._createMenuButton("Quit to Menu", "#999");
    quitBtn.style.marginTop = "12px";
    quitBtn.onclick = () => {
      overlay.remove();
      this.destroy();
      window.dispatchEvent(new Event("camelotCraftExit"));
    };
    overlay.appendChild(quitBtn);

    document.body.appendChild(overlay);
  }

  private _showVictoryScreen(): void {
    this._state.paused = true;
    document.exitPointerLock?.();

    const overlay = document.createElement("div");
    overlay.id = "cc-victory";
    overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;z-index:200;
      background:linear-gradient(180deg,rgba(0,0,0,0.3),rgba(50,30,0,0.8));
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:Georgia,serif;animation:fadeIn 1s ease;
    `;
    overlay.innerHTML = `
      <div style="font-size:72px;margin-bottom:8px;">🏆</div>
      <h1 style="font-size:48px;color:#FFD700;margin:0;text-shadow:0 0 30px rgba(255,215,0,0.6);">
        VICTORY
      </h1>
      <h2 style="font-size:24px;color:#E0D0A0;margin:8px 0;font-weight:normal;">
        The Holy Grail Has Been Found
      </h2>
      <p style="color:#C0A060;font-size:14px;max-width:400px;text-align:center;line-height:1.6;">
        Through valor and wisdom, thou hast united the Knights of the Round Table,
        forged Camelot from the wilderness, wielded the legendary Excalibur,
        and claimed the Holy Grail. Thy name shall echo through the ages.
      </p>
      <div style="margin-top:16px;color:#888;font-size:12px;">
        Day ${this._state.dayNumber} | Level ${this._state.player.level} |
        Blocks placed: ${this._state.player.blocksPlaced} |
        Blocks mined: ${this._state.player.blocksMined}
      </div>
    `;

    const continueBtn = this._createMenuButton("Continue Playing", "#FFD700");
    continueBtn.style.marginTop = "24px";
    continueBtn.onclick = () => {
      overlay.remove();
      this._state.paused = false;
      this._input.requestPointerLock();
    };
    overlay.appendChild(continueBtn);

    const quitBtn = this._createMenuButton("Return to Menu", "#999");
    quitBtn.style.marginTop = "12px";
    quitBtn.onclick = () => {
      saveCraftWorld(this._state);
      overlay.remove();
      this.destroy();
      window.dispatchEvent(new Event("camelotCraftExit"));
    };
    overlay.appendChild(quitBtn);

    document.body.appendChild(overlay);
  }

  private _dropAllItems(): void {
    const inv = this._state.player.inventory;
    const pos = this._state.player.position;

    // Find safe drop height (surface level above current position or at spawn)
    let dropY = pos.y + 1;
    // If underground or in invalid position, use spawn point
    if (dropY < 1 || dropY > CB.CHUNK_HEIGHT - 2) {
      dropY = this._state.player.spawnPoint.y + 1;
    }
    // Clamp to reasonable range
    dropY = Math.max(2, Math.min(CB.CHUNK_HEIGHT - 5, dropY));

    const dropPos = new THREE.Vector3(pos.x, dropY, pos.z);

    // Store death location for recovery message
    addMessage(this._state,
      `Items dropped at X:${Math.floor(pos.x)} Y:${Math.floor(dropY)} Z:${Math.floor(pos.z)}`,
      0xFF9800);

    const dropSlots = (slots: (import("./config/CraftRecipeDefs").ItemStack | null)[]) => {
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] && slots[i]!.count > 0) {
          const angle = Math.random() * Math.PI * 2;
          const vel = new THREE.Vector3(Math.cos(angle) * 3, 5, Math.sin(angle) * 3);
          dropItem({ ...slots[i]! }, dropPos.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2,
          )), vel);
          slots[i] = null;
        }
      }
    };

    dropSlots(inv.hotbar);
    dropSlots(inv.main);
  }

  private _respawn(): void {
    const p = this._state.player;
    p.hp = p.maxHp;
    p.hunger = Math.max(10, p.hunger);
    p.position.copy(p.spawnPoint);
    p.velocity.set(0, 0, 0);
    p.invulnTimer = 3.0; // 3 seconds of invulnerability after respawn
    p.miningTarget = null;
    this._state.gameOver = false;
    this._state.paused = false;
    this._input.requestPointerLock();
    addMessage(this._state, "You respawned. Stay vigilant!", 0xFFD700);
  }

  // =========================================================================
  // Hunger system
  // =========================================================================

  private _hungerTimer = 0;
  private _lastBiome = "";

  private _checkBiomeChange(): void {
    const px = Math.floor(this._state.player.position.x);
    const pz = Math.floor(this._state.player.position.z);
    // Simple biome check using noise (same as terrain gen)
    const biome = getBiome(
      (Math.sin(px * 0.004) + 1) * 0.5,
      (Math.cos(pz * 0.004) + 1) * 0.5,
    );
    if (biome !== this._lastBiome && this._lastBiome !== "") {
      const def = BIOME_DEFS[biome];
      if (def) {
        addMessage(this._state, `Entering: ${def.name}`, 0xC0A060);

        // Biome discovery reward: XP + exploration bonus on first visit
        if (!this._discoveredBiomes.has(biome)) {
          this._discoveredBiomes.add(biome);
          this._state.player.xp += 5;
          addMessage(this._state, `New biome discovered! +5 XP (${this._discoveredBiomes.size}/8)`, 0x4CAF50);
          // Particles celebration
          const pp = this._state.player.position;
          this._renderer.particles.emitBlockBreak(pp.x, pp.y + 1, pp.z, def.fogColor);
        }
      }
    }
    this._lastBiome = biome;
  }

  private _updateHunger(dt: number): void {
    const p = this._state.player;
    this._hungerTimer += dt;

    // Drain hunger every 30 seconds (faster if sprinting)
    const drainInterval = p.sprinting ? 15 : 30;
    if (this._hungerTimer >= drainInterval) {
      this._hungerTimer -= drainInterval;
      if (p.hunger > 0) {
        p.hunger--;
      }
    }

    // Swimming drains hunger faster
    if (p.swimming) {
      this._hungerTimer += dt * 0.5;
    }

    // Starvation damage when hunger is 0
    if (p.hunger <= 0) {
      this._hungerTimer += dt;
      if (this._hungerTimer >= 4) { // 4 seconds between starvation ticks
        this._hungerTimer -= 4;
        p.hp = Math.max(0, p.hp - 1);
        addMessage(this._state, "You are starving!", 0xFF4444);
      }
    }

    // Natural HP regen when hunger is above 16
    if (p.hunger >= 16 && p.hp < p.maxHp) {
      this._hungerTimer += dt * 0.3;
      if (this._hungerTimer >= 5) {
        this._hungerTimer -= 5;
        p.hp = Math.min(p.maxHp, p.hp + 1);
      }
    }
  }

  // =========================================================================
  // Tutorial hints
  // =========================================================================

  private _updateTutorial(dt: number): void {
    if (!this._isNewWorld || this._tutorialStep >= 6) return;
    this._tutorialTimer += dt;

    const hints = [
      { time: 5, msg: "Hint: Punch trees (left click) to get wood. Wood is essential!", color: 0x90CAF9 },
      { time: 30, msg: "Hint: Open inventory (E) and craft planks from logs.", color: 0x90CAF9 },
      { time: 60, msg: "Hint: Make a Crafting Table (4 planks) for advanced recipes.", color: 0x90CAF9 },
      { time: 120, msg: "Hint: Build a shelter before night! Mobs spawn in darkness.", color: 0xFF9800 },
      { time: 240, msg: "Hint: Mine stone for better tools. Iron is found deep underground.", color: 0x90CAF9 },
      { time: 400, msg: "Hint: Seek the Lady of the Lake for clues about Excalibur.", color: 0xCE93D8 },
    ];

    if (this._tutorialStep < hints.length && this._tutorialTimer >= hints[this._tutorialStep].time) {
      const hint = hints[this._tutorialStep];
      addMessage(this._state, hint.msg, hint.color);
      this._tutorialStep++;
    }
  }

  // =========================================================================
  // Crafting
  // =========================================================================

  private _onCraftResult(): void {
    const inv = this._state.player.inventory;
    if (!inv.craftResult) return;

    // Add result to inventory
    addToInventory(inv, { ...inv.craftResult });
    onItemCrafted(this._state, inv.craftResult);
    playPickup();

    // Consume grid ingredients (1 of each)
    for (let i = 0; i < inv.craftGrid.length; i++) {
      const slot = inv.craftGrid[i];
      if (slot) {
        slot.count--;
        if (slot.count <= 0) inv.craftGrid[i] = null;
      }
    }

    // Re-check recipe
    inv.craftResult = matchRecipe(inv.craftGrid, CB.CRAFT_GRID_SIZE);
  }

  // =========================================================================
  // Container interaction (chest/furnace)
  // =========================================================================

  private _containerOverlay: HTMLDivElement | null = null;

  private _openContainer(container: ContainerInteraction): void {
    if (!container) return;
    playChestOpen();
    document.exitPointerLock?.();
    this._state.inventoryOpen = true;

    if (this._containerOverlay) this._containerOverlay.remove();

    const overlay = document.createElement("div");
    overlay.id = "cc-container";
    overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;z-index:50;
      background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;
      font-family:'Segoe UI',sans-serif;pointer-events:auto;
    `;

    const card = document.createElement("div");
    card.style.cssText = `
      background:rgba(40,30,20,0.95);border:2px solid #8B6914;
      border-radius:8px;padding:20px;color:white;max-width:500px;
      box-shadow:0 0 30px rgba(139,105,20,0.3);
    `;

    if (container.type === "chest") {
      card.innerHTML = `<h3 style="color:#FFD700;margin:0 0 12px;text-align:center;">Chest</h3>`;
      const grid = document.createElement("div");
      grid.style.cssText = `display:grid;grid-template-columns:repeat(9,44px);gap:2px;`;
      for (let i = 0; i < container.contents.length; i++) {
        const slot = document.createElement("div");
        slot.style.cssText = `width:44px;height:44px;border:1px solid #555;background:rgba(0,0,0,0.5);border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:10px;`;
        const item = container.contents[i];
        if (item) {
          const c = item.color;
          const r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
          slot.innerHTML = `<div style="width:30px;height:30px;background:rgb(${r},${g},${b});border-radius:2px;" title="${item.displayName}"></div>`;
          if (item.count > 1) slot.innerHTML += `<span style="position:absolute;font-size:9px;bottom:0;right:2px;">${item.count}</span>`;
        }
        grid.appendChild(slot);
      }
      card.appendChild(grid);
    } else if (container.type === "furnace") {
      const f = container.furnace;
      const renderFurnace = () => {
        const burnPct = f.burnTimeTotal > 0 ? (f.burnTimeLeft / f.burnTimeTotal * 100) : 0;
        const smeltPct = f.smeltProgress * 100;
        card.innerHTML = `
        <h3 style="color:#FFD700;margin:0 0 12px;text-align:center;">Furnace</h3>
        <div style="display:flex;gap:16px;align-items:center;justify-content:center;">
          <div style="text-align:center;">
            <div style="font-size:10px;color:#aaa;">Input</div>
            <div style="width:48px;height:48px;border:1px solid #555;background:rgba(0,0,0,0.5);border-radius:3px;margin:4px auto;">
              ${f.inputSlot ? `<div style="width:32px;height:32px;margin:8px auto;background:#${f.inputSlot.color.toString(16).padStart(6,'0')};border-radius:2px;" title="${f.inputSlot.displayName}"></div>` : ''}
            </div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:10px;color:#aaa;">Fuel</div>
            <div style="width:48px;height:48px;border:1px solid #555;background:rgba(0,0,0,0.5);border-radius:3px;margin:4px auto;">
              ${f.fuelSlot ? `<div style="width:32px;height:32px;margin:8px auto;background:#${f.fuelSlot.color.toString(16).padStart(6,'0')};border-radius:2px;"></div>` : ''}
            </div>
            <div style="width:48px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin:4px auto;">
              <div style="width:${burnPct}%;height:100%;background:#FF6600;border-radius:2px;"></div>
            </div>
          </div>
          <div style="font-size:24px;color:#FFD700;">→</div>
          <div style="text-align:center;">
            <div style="font-size:10px;color:#aaa;">Output</div>
            <div style="width:48px;height:48px;border:2px solid #FFD700;background:rgba(0,0,0,0.5);border-radius:3px;margin:4px auto;">
              ${f.outputSlot ? `<div style="width:32px;height:32px;margin:8px auto;background:#${f.outputSlot.color.toString(16).padStart(6,'0')};border-radius:2px;" title="${f.outputSlot.displayName}"></div>` : ''}
            </div>
            <div style="width:48px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin:4px auto;">
              <div style="width:${smeltPct}%;height:100%;background:#4CAF50;border-radius:2px;"></div>
            </div>
          </div>
        </div>
      `;
        // Re-add close button
        const cb = document.createElement("button");
        cb.textContent = "Close";
        cb.className = "cc-btn";
        cb.style.cssText = `display:block;margin:12px auto 0;padding:8px 24px;background:rgba(0,0,0,0.4);color:#FFD700;border:1px solid #FFD700;border-radius:4px;cursor:pointer;font-size:14px;`;
        cb.onclick = () => {
          clearInterval(furnaceInterval);
          overlay.remove();
          this._containerOverlay = null;
          this._state.inventoryOpen = false;
          this._input.requestPointerLock();
        };
        card.appendChild(cb);
      };
      renderFurnace();
      // Live update every 200ms
      const furnaceInterval = setInterval(renderFurnace, 200);
    }

    if (container.type !== "furnace") {
      // Close button for non-furnace containers
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "Close";
      closeBtn.className = "cc-btn";
      closeBtn.style.cssText = `
        display:block;margin:12px auto 0;padding:8px 24px;background:rgba(0,0,0,0.4);
        color:#FFD700;border:1px solid #FFD700;border-radius:4px;cursor:pointer;font-size:14px;
      `;
      closeBtn.onclick = () => {
        overlay.remove();
        this._containerOverlay = null;
        this._state.inventoryOpen = false;
        this._input.requestPointerLock();
      };
      card.appendChild(closeBtn);
    }
    overlay.appendChild(card);

    // ESC to close
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        overlay.remove();
        this._containerOverlay = null;
        this._state.inventoryOpen = false;
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);

    document.body.appendChild(overlay);
    this._containerOverlay = overlay;
  }

  // =========================================================================
  // Chunk management
  // =========================================================================

  private _ensureChunksAround(wx: number, wz: number): void {
    const pcx = worldToChunk(wx);
    const pcz = worldToChunk(wz);
    const rd = CB.RENDER_DISTANCE + 1;

    for (let dx = -rd; dx <= rd; dx++) {
      for (let dz = -rd; dz <= rd; dz++) {
        if (dx * dx + dz * dz > (rd + 1) * (rd + 1)) continue;
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = chunkKey(cx, cz);
        if (!this._state.chunks.has(key)) {
          const chunk = new CraftChunk(cx, cz);
          this._state.chunks.set(key, chunk);
          this._chunkGenQueue.push([cx, cz]);
        }
      }
    }

    // Sort queue by distance to player (closest first)
    this._chunkGenQueue.sort((a, b) => {
      const da = (a[0] - pcx) ** 2 + (a[1] - pcz) ** 2;
      const db = (b[0] - pcx) ** 2 + (b[1] - pcz) ** 2;
      return da - db;
    });

    // Unload very distant chunks to save memory
    const maxDist = (rd + 3) * (rd + 3);
    for (const [key, chunk] of this._state.chunks) {
      const dx = chunk.cx - pcx;
      const dz = chunk.cz - pcz;
      if (dx * dx + dz * dz > maxDist) {
        this._state.chunks.delete(key);
      }
    }
  }

  private _processChunkGenQueue(): void {
    let processed = 0;
    const maxPerFrame = 3; // slightly more aggressive
    while (this._chunkGenQueue.length > 0 && processed < maxPerFrame) {
      const [cx, cz] = this._chunkGenQueue.shift()!;
      const key = chunkKey(cx, cz);
      const chunk = this._state.chunks.get(key);
      if (chunk && !chunk.populated) {
        generateChunkTerrain(chunk, this._state.seed);
        // Decorate with structures (ruins, caves, villages)
        decorateChunkStructures(chunk, this._state.seed, getBiome(0.5, 0.5));
        chunk.populated = true;
        chunk.rebuildHeightMap();
        chunk.dirty = true;
        processed++;
      }
    }
  }

  private _findSpawnPosition(): void {
    const p = this._state.player;
    // Try to find solid ground near 0,0
    const cx = worldToChunk(0);
    const cz = worldToChunk(0);
    const key = chunkKey(cx, cz);
    const chunk = this._state.chunks.get(key);

    if (chunk && chunk.populated) {
      const height = chunk.getHeight(8, 8);
      p.position.set(8, height + 2, 8);
    } else {
      // Default spawn
      p.position.set(8, CB.SEA_LEVEL + 10, 8);
    }

    // Place Sword-in-Stone 2 blocks in front of spawn (player faces +Z by default)
    const stoneX = 8;
    const stoneZ = 10;
    const sCx = worldToChunk(stoneX);
    const sCz = worldToChunk(stoneZ);
    const sChunk = this._state.chunks.get(chunkKey(sCx, sCz));
    if (sChunk && sChunk.populated) {
      const sHeight = sChunk.getHeight(stoneX & 15, stoneZ & 15);
      setWorldBlock(this._state, stoneX, sHeight + 1, stoneZ, BlockType.ENCHANTED_STONE);
      this._swordStonePos = { x: stoneX, y: sHeight + 1, z: stoneZ };
    }
  }

  /** Position of the sword-in-stone (null if claimed or not placed). */
  private _swordStonePos: { x: number; y: number; z: number } | null = null;

  // =========================================================================
  // Cleanup
  // =========================================================================

  destroy(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    clearInterval(this._autoSaveInterval);
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("visibilitychange", this._onVisChange);

    this._input.destroy();
    this._renderer.destroy();
    this._hud.destroy();
    stopAmbient();
    stopMusic();
    destroyAudio();
    destroyMusic();

    // Remove any leftover overlays
    document.getElementById("camelot-craft-title")?.remove();
    document.getElementById("cc-pause")?.remove();
  }
}
