// ---------------------------------------------------------------------------
// Camelot Craft – Main game orchestrator
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { CB } from "./config/CraftBalance";
import { ItemType, WEAPON_DAMAGE } from "./config/CraftRecipeDefs";
import { createCraftState, type CraftState, addMessage } from "./state/CraftState";
import { CraftChunk, chunkKey, worldToChunk } from "./state/CraftChunk";
import { getHeldItem, addToInventory } from "./state/CraftInventory";
import { generateChunkTerrain } from "./systems/CraftTerrainSystem";
import { raycastBlock, startMining, updateMining, placeBlock } from "./systems/CraftBlockSystem";
import { matchRecipe } from "./systems/CraftCraftingSystem";
import { spawnMobs, updateMobs, damageMob } from "./systems/CraftMobSystem";
import { updateDayNight } from "./systems/CraftDayNightSystem";
import { CraftInputSystem } from "./systems/CraftInputSystem";
import { saveCraftWorld, loadCraftWorld, hasCraftSave } from "./systems/CraftSaveSystem";
import { BLOCK_DEFS } from "./config/CraftBlockDefs";
import { initAudio, playBlockBreak, playBlockPlace, playPickup, playHurt, playFootstep, playChestOpen, playAmbient, stopAmbient, destroyAudio, playQuestComplete, playLevelUp } from "./systems/CraftAudioSystem";
import { updateQuests, onBlockPlaced, onItemCrafted, onMobKilled, checkVictory } from "./systems/CraftQuestSystem";
import { updateFurnaces, getContainerInteraction, type ContainerInteraction } from "./systems/CraftContainerSystem";
import { CraftRenderer } from "./view/CraftRenderer";
import { CraftHUD } from "./view/CraftHUD";

export class CamelotCraftGame {
  private _state!: CraftState;
  private _renderer = new CraftRenderer();
  private _hud = new CraftHUD();
  private _input = new CraftInputSystem();

  private _rafId: number | null = null;
  private _lastTime = 0;
  private _chunkGenQueue: [number, number][] = [];

  // (no additional fields)

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
      overlay.remove();
      this._startGame(false);
    };
    btnContainer.appendChild(newBtn);

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
      this._state = createCraftState();
    }

    this._state.screenW = window.innerWidth;
    this._state.screenH = window.innerHeight;

    // Build view
    this._renderer.build();
    this._hud.build();

    // Init input
    this._input.init();
    this._input.requestPointerLock();

    // Init audio
    initAudio();

    // Generate initial chunks around spawn
    this._ensureChunksAround(
      Math.floor(this._state.player.position.x),
      Math.floor(this._state.player.position.z),
    );

    // Find valid spawn position (on top of terrain)
    if (!loadSave) {
      this._findSpawnPosition();
    }

    // Welcome message
    if (!loadSave) {
      addMessage(this._state, "Welcome to Camelot Craft! Build thy kingdom.", 0xFFD700);
      addMessage(this._state, "Seek wood to craft tools. Build shelter before nightfall!", 0xC0A060);
    }

    // HUD callbacks
    this._hud.onCraftResultClick = () => this._onCraftResult();

    // Start game loop
    this._lastTime = performance.now();
    this._loop(this._lastTime);

    // Pause on ESC
    document.addEventListener("keydown", this._onKeyDown);

    // Save periodically
    this._autoSaveInterval = window.setInterval(() => {
      if (!this._state.paused) saveCraftWorld(this._state);
    }, 60000);
  }

  private _autoSaveInterval = 0;

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
  };

  private _togglePause(): void {
    this._state.paused = !this._state.paused;
    if (this._state.paused) {
      this._showPauseMenu();
    } else {
      const pauseEl = document.getElementById("cc-pause");
      pauseEl?.remove();
      this._input.requestPointerLock();
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

    // --- Death check ---
    if (this._state.player.hp <= 0 && !this._state.gameOver) {
      this._handleDeath();
      return;
    }

    // --- Input & player physics ---
    this._input.update(this._state, dt);

    // --- Hunger drain ---
    this._updateHunger(dt);

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

    // --- Quests ---
    updateQuests(this._state);

    // --- Victory check ---
    if (checkVictory(this._state) && !this._state.victory) {
      this._state.victory = true;
      addMessage(this._state, "THE HOLY GRAIL IS FOUND! Camelot stands eternal!", 0xFFD700);
      playQuestComplete();
    }

    // --- Ambient audio ---
    playAmbient(this._state.timeOfDay);

    // --- Render ---
    this._renderer.render(this._state, dt);
    this._hud.update(this._state);

    // --- Reset input deltas ---
    this._input.resetDeltas();
  };

  // =========================================================================
  // Block interaction (mining / placing)
  // =========================================================================

  private _prevMiningTarget: { wx: number; wy: number; wz: number } | null = null;

  private _handleBlockInteraction(_dt: number): void {
    if (this._state.inventoryOpen || this._state.craftingOpen) return;

    const cam = this._renderer.cameraCtrl;
    const dir = cam.getForward();
    const origin = cam.camera.position.clone();
    const particles = this._renderer.particles;

    // Detect when mining completes (target disappears after being set)
    const mt = this._state.player.miningTarget;
    if (this._prevMiningTarget && !mt) {
      // Mining just completed — emit break particles
      const { wx, wy, wz } = this._prevMiningTarget;
      particles.emitBlockBreak(wx, wy, wz, 0x808080);
      playBlockBreak();
      this._state.player.blocksMined++;
    }
    this._prevMiningTarget = mt ? { wx: mt.wx, wy: mt.wy, wz: mt.wz } : null;

    // Emit mining dust while actively mining
    if (mt && mt.progress > 0) {
      particles.emitMiningDust(mt.wx, mt.wy, mt.wz, 0x808080);
    }

    const hit = raycastBlock(this._state, origin, dir, CB.PLAYER_REACH);

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

        // Check for container interaction first (chest, furnace)
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
        if (held?.itemType === ItemType.WEAPON) {
          dmg = WEAPON_DAMAGE[held.specialId ?? ""] ?? dmg;
        }
        // Tool bonus damage
        if (held?.itemType === ItemType.TOOL) {
          dmg += 2;
        }

        const kb = dir.clone().multiplyScalar(CB.KNOCKBACK_FORCE);
        damageMob(this._state, mob.id, dmg, kb);
        playHurt();

        // Hit particles
        this._renderer.particles.emitHit(mob.position, 0xFF4444);

        // Set attack cooldown
        p.attackTimer = CB.PLAYER_ATTACK_COOLDOWN;

        if (mob.hp <= 0) {
          onMobKilled(this._state, mob.type);
        }

        this._input.mouseDown.left = false;
        break;
      }
    }
  }

  // =========================================================================
  // Death & Respawn
  // =========================================================================

  private _handleDeath(): void {
    this._state.gameOver = true;
    document.exitPointerLock?.();

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
    }

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
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
  }

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

    this._input.destroy();
    this._renderer.destroy();
    this._hud.destroy();
    stopAmbient();
    destroyAudio();

    // Remove any leftover overlays
    document.getElementById("camelot-craft-title")?.remove();
    document.getElementById("cc-pause")?.remove();
  }
}
