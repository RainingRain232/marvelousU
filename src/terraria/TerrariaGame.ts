// ---------------------------------------------------------------------------
// Terraria – Main game orchestrator
// ---------------------------------------------------------------------------

import { viewManager } from "@view/ViewManager";
import { TB } from "./config/TerrariaBalance";
import { createTerrariaState, addMessage, getWorldBlock, setWorldBlock, isSolid } from "./state/TerrariaState";
import type { TerrariaState } from "./state/TerrariaState";
import { BlockType, BLOCK_DEFS, ToolMaterial } from "./config/TerrariaBlockDefs";
import { addToInventory, calcArmorDefense, tryEquipArmor, ItemCategory, createBlockItem } from "./state/TerrariaInventory";
import { makeExcaliburItem, makeGrailItem, makeSwordItem } from "./config/TerrariaItemDefs";

// Systems
import { initTerrain, generateChunk, placeSpecialStructures, getSurfaceHeight } from "./systems/TerrariaTerrainSystem";
import { initInput, destroyInput, pollInput } from "./systems/TerrariaInputSystem";
import { updatePlayerPhysics, updateMobPhysics, updateDroppedItemPhysics } from "./systems/TerrariaPhysicsSystem";
import { updateMining } from "./systems/TerrariaBlockSystem";
import { updateDayNight } from "./systems/TerrariaDayNightSystem";
import { recalcLighting } from "./systems/TerrariaLightingSystem";
import { updateCombat } from "./systems/TerrariaCombatSystem";
import { updateMobs } from "./systems/TerrariaMobSystem";
import { updateNPCs, interactWithNPC, buyFromNPC, updateKnightCombat } from "./systems/TerrariaNPCSystem";
import { applyStatusEffect } from "./systems/TerrariaCombatSystem";
import { updateQuests, onDragonKilled } from "./systems/TerrariaQuestSystem";
// Crafting (used by HUD callbacks, imported for future use)
// import { craftRecipe } from "./systems/TerrariaCraftingSystem";
import { saveTerrariaWorld, loadTerrariaWorld, hasSave } from "./systems/TerrariaSaveSystem";

// View
import { TerrariaRenderer } from "./view/TerrariaRenderer";
import { TerrariaPlayerView } from "./view/TerrariaPlayerView";
import { TerrariaMobView } from "./view/TerrariaMobView";
import { TerrariaFX } from "./view/TerrariaFX";
import { TerrariaCamera } from "./view/TerrariaCamera";
import { TerrariaHUD } from "./view/TerrariaHUD";

// ---------------------------------------------------------------------------

const TERRARIA_ZOOM = 1.2;

// Block type constants for ladder/rope/campfire/bed checks
const _BT_LADDER = BlockType.LADDER;
const _BT_ROPE = BlockType.ROPE;
const _BT_CAMPFIRE = BlockType.CAMPFIRE;
const _BT_BED = BlockType.BED;
const _BT_ALCHEMY = BlockType.ALCHEMY_LAB;

export class TerrariaGame {
  private _state!: TerrariaState;
  private _renderer = new TerrariaRenderer();
  private _playerView = new TerrariaPlayerView();
  private _mobView = new TerrariaMobView();
  private _fx = new TerrariaFX();
  private _camera = new TerrariaCamera();
  private _hud = new TerrariaHUD();

  private _rafId: number | null = null;
  private _lastTime = 0;
  private _saveTimer = 0;
  private _tutorialStep = 0;
  private _tutorialTimer = 0;
  // fall damage tracking
  private _fallStartY = 0;
  private _wasFalling = false;
  private _dodgeTimer = 0;
  private _dodgeCooldown = 0;
  private _hasDoubleJumped = false;
  private _wallSlideDir = 0;
  private _coyoteTimer = 0;
  private _lastInput: import("./systems/TerrariaInputSystem").InputState | null = null;

  // -----------------------------------------------------------------------
  // Boot
  // -----------------------------------------------------------------------

  async boot(): Promise<void> {
    this._showTitleScreen();
  }

  private _showTitleScreen(): void {
    const overlay = document.createElement("div");
    overlay.id = "terraria-title";
    const css = `
      @keyframes td-shimmer { 0%,100%{text-shadow:0 0 15px rgba(255,215,0,0.4),0 2px 4px rgba(0,0,0,0.5)} 50%{text-shadow:0 0 30px rgba(255,215,0,0.7),0 0 60px rgba(255,180,0,0.3),0 2px 4px rgba(0,0,0,0.5)} }
      @keyframes td-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      @keyframes td-fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      @keyframes td-stars { 0%{opacity:0.3} 50%{opacity:1} 100%{opacity:0.3} }
      .td-btn{padding:12px 0;font-size:17px;font-family:Georgia,serif;border:1px solid #5a4010;border-radius:8px;cursor:pointer;width:260px;transition:all 0.25s;text-align:center;letter-spacing:1px;position:relative;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.3)}
      .td-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.4);border-color:#aa8030}
      .td-btn:active{transform:translateY(1px);box-shadow:0 1px 4px rgba(0,0,0,0.3)}
      .td-btn::after{content:'';position:absolute;top:0;left:0;right:0;height:50%;background:linear-gradient(180deg,rgba(255,255,255,0.06),transparent);pointer-events:none}
      .td-select{background:rgba(0,0,0,0.35);border:1px solid #5a4010;border-radius:6px;color:#daa520;padding:6px 12px;font-family:Georgia,serif;font-size:13px;cursor:pointer;min-width:130px;text-align:center;appearance:none;-webkit-appearance:none}
      .td-select:focus{outline:none;border-color:#aa8030}
      .td-label{font-size:11px;color:#8a7040;text-transform:uppercase;letter-spacing:2px;margin-bottom:5px}
    `;
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;z-index:100;background:#080c14;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;color:white;overflow:hidden;`;
    // Animated background with particles
    let bgCanvas = "";
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const s = 1 + Math.random() * 2;
      const d = 2 + Math.random() * 5;
      const dl = Math.random() * 3;
      bgCanvas += `<div style="position:absolute;left:${x}%;top:${y}%;width:${s}px;height:${s}px;background:#ffd700;border-radius:50%;animation:td-stars ${d}s ${dl}s infinite ease-in-out;opacity:0.3"></div>`;
    }

    overlay.innerHTML = `<style>${css}</style>
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,#060a18 0%,#0c1a10 35%,#1a2a14 65%,#14200a 100%);"></div>
      <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">${bgCanvas}</div>
      <!-- Decorative border frame -->
      <div style="position:absolute;inset:20px;border:1px solid rgba(138,105,20,0.2);border-radius:16px;pointer-events:none"></div>
      <div style="position:absolute;inset:24px;border:1px solid rgba(138,105,20,0.08);border-radius:14px;pointer-events:none"></div>
      <!-- Content -->
      <div style="position:relative;text-align:center;animation:td-fadeIn 0.8s ease-out;">
        <!-- Logo area -->
        <div style="animation:td-float 4s ease-in-out infinite;margin-bottom:6px;">
          <div style="font-size:14px;letter-spacing:6px;color:#5a4a30;text-transform:uppercase;margin-bottom:8px;">— An Arthurian Saga —</div>
          <h1 style="font-size:52px;color:#FFD700;margin:0;font-family:Georgia,serif;letter-spacing:6px;animation:td-shimmer 3s ease-in-out infinite;">CAMELOT DIG</h1>
          <div style="width:200px;height:1px;background:linear-gradient(90deg,transparent,#8B6914,transparent);margin:10px auto;"></div>
          <p style="font-size:15px;color:#a08850;font-style:italic;margin:0;font-family:Georgia,serif;">
            Dig deep. Build thy kingdom. Seek the Holy Grail.
          </p>
        </div>
        <!-- World setup -->
        <div style="margin:30px 0 24px;display:flex;gap:20px;justify-content:center;align-items:flex-start;flex-wrap:wrap;">
          <div style="text-align:center;">
            <div class="td-label">World Seed</div>
            <input id="td-seed-input" type="text" placeholder="Random"
              style="width:140px;padding:7px 12px;background:rgba(0,0,0,0.35);border:1px solid #5a4010;border-radius:6px;color:#daa520;font-size:13px;text-align:center;font-family:Georgia,serif;">
          </div>
          <div style="text-align:center;">
            <div class="td-label">World Size</div>
            <select id="td-world-size" class="td-select">
              <option value="small">Small (200)</option>
              <option value="medium" selected>Medium (400)</option>
              <option value="large">Large (800)</option>
            </select>
          </div>
          <div style="text-align:center;">
            <div class="td-label">Difficulty</div>
            <select id="td-difficulty" class="td-select">
              <option value="easy">Journey</option>
              <option value="normal" selected>Classic</option>
              <option value="hard">Expert</option>
            </select>
          </div>
        </div>
        <!-- Buttons -->
        <div id="td-menu-buttons" style="display:flex;flex-direction:column;gap:10px;align-items:center;"></div>
        <!-- Controls hint -->
        <div style="margin-top:32px;padding:12px 24px;background:rgba(0,0,0,0.2);border-radius:8px;border:1px solid rgba(138,105,20,0.1);display:inline-block;">
          <div style="font-size:10px;color:#5a4a30;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Controls</div>
          <div style="font-size:11px;color:#665a40;line-height:1.6;">
            <span style="color:#8a7a50;">A/D</span> Move &nbsp;
            <span style="color:#8a7a50;">Space</span> Jump &nbsp;
            <span style="color:#8a7a50;">LMB</span> Mine &nbsp;
            <span style="color:#8a7a50;">RMB</span> Place &nbsp;
            <span style="color:#8a7a50;">E</span> Inventory &nbsp;
            <span style="color:#8a7a50;">1-9</span> Hotbar &nbsp;
            <span style="color:#8a7a50;">Shift</span> Sprint &nbsp;
            <span style="color:#8a7a50;">F1</span> Help
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const btnContainer = overlay.querySelector("#td-menu-buttons")!;
    const mkBtn = (label: string, bg: string, fg: string, onClick: () => void) => {
      const btn = document.createElement("button");
      btn.className = "td-btn";
      btn.textContent = label;
      btn.style.cssText += `background:${bg};color:${fg};`;
      btn.onclick = onClick;
      btnContainer.appendChild(btn);
      return btn;
    };

    const getSetup = () => {
      const seedVal = (overlay.querySelector("#td-seed-input") as HTMLInputElement).value.trim();
      const sizeVal = (overlay.querySelector("#td-world-size") as HTMLSelectElement).value;
      const diffVal = (overlay.querySelector("#td-difficulty") as HTMLSelectElement).value;
      return { seed: seedVal ? this._hashString(seedVal) : undefined, size: sizeVal, difficulty: diffVal };
    };

    mkBtn("New World", "linear-gradient(180deg,#3a2a12,#2a1a0a)", "#FFD700", () => {
      const s = getSetup();
      overlay.remove();
      this._startGame(s.seed, false, s.size, s.difficulty);
    });

    if (hasSave()) {
      mkBtn("Continue Saved World", "linear-gradient(180deg,#1a2040,#121830)", "#88AAFF", () => {
        overlay.remove();
        this._loadAndStartGame();
      });
    }

    mkBtn("Creative Mode", "linear-gradient(180deg,#1a3020,#102818)", "#88DD88", () => {
      const s = getSetup();
      overlay.remove();
      this._startGame(s.seed, true, s.size, s.difficulty);
    });

    mkBtn("Back to Menu", "linear-gradient(180deg,#2a1414,#1a0c0c)", "#CC7766", () => {
      overlay.remove();
      this.destroy();
    });
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

  private _startGame(seed?: number, creative = false, worldSize = "medium", difficulty = "normal"): void {
    viewManager.clearWorld();

    // Map world size selection to block width
    const sizeMap: Record<string, number> = { small: 200, medium: 400, large: 800 };
    const worldWidth = sizeMap[worldSize] ?? 400;

    // Create state with dynamic world size and difficulty
    this._state = createTerrariaState(seed, worldWidth, difficulty);
    this._state.creativeMode = creative;
    this._state.screenW = viewManager.screenWidth;
    this._state.screenH = viewManager.screenHeight;

    if (creative) {
      this._state.player.hp = 9999;
      this._state.player.maxHp = 9999;
    }

    // Apply difficulty modifiers
    if (difficulty === "easy") {
      this._state.player.maxHp = 150;
      this._state.player.hp = 150;
      this._state.player.defense = 3;
    } else if (difficulty === "hard") {
      this._state.player.maxHp = 80;
      this._state.player.hp = 80;
    }

    // Generate world
    initTerrain(this._state.seed);
    const numChunks = Math.ceil(worldWidth / TB.CHUNK_W);
    for (let cx = 0; cx < numChunks; cx++) {
      this._state.chunks.set(cx, generateChunk(cx));
    }

    // Place special structures
    placeSpecialStructures(this._state.chunks, this._state.seed, worldWidth);

    // Place player at surface
    const spawnX = Math.floor(worldWidth / 2);
    const surfaceY = getSurfaceHeight(spawnX);
    this._state.player.x = spawnX + 0.5;
    this._state.player.y = surfaceY + 3;
    this._state.camX = this._state.player.x;
    this._state.camY = this._state.player.y;

    // Initial lighting
    recalcLighting(this._state);

    // Init renderer
    this._renderer.init();
    this._renderer.worldLayer.scale.set(TERRARIA_ZOOM);
    viewManager.addToLayer("units", this._renderer.worldLayer);
    this._renderer.entityLayer.addChild(this._playerView.container);
    this._renderer.entityLayer.addChild(this._mobView.container);
    this._renderer.entityLayer.addChild(this._fx.container);

    // Disable global camera keyboard panning (Terraria has its own camera)
    viewManager.camera.keyboardEnabled = false;

    // Adjust screen dimensions for zoom (camera sees a smaller area, scaled up)
    this._state.screenW = Math.ceil(this._state.screenW / TERRARIA_ZOOM);
    this._state.screenH = Math.ceil(this._state.screenH / TERRARIA_ZOOM);

    // Init camera
    this._camera.setScreenSize(this._state.screenW, this._state.screenH);
    this._camera.worldWidth = this._state.worldWidth;
    this._camera.x = this._state.player.x;
    this._camera.y = this._state.player.y;

    // Init HUD
    this._hud.build();
    this._hud.onExit = () => this.destroy();
    this._hud.onRespawn = () => this._respawnPlayer();
    this._hud.setResumeCallback(() => {
      this._state.paused = false;
    });

    // Init input
    initInput();

    // Handle window resize
    window.addEventListener("resize", this._onResize);

    // Starter items (give player basic tools to skip the "punch trees" phase)
    if (!creative) {
      addToInventory(this._state.player.inventory, makeSwordItem(ToolMaterial.WOOD));
      addToInventory(this._state.player.inventory, createBlockItem(BlockType.TORCH, "Torch", 0xFFAA00, 10));
      addToInventory(this._state.player.inventory, createBlockItem(BlockType.OAK_LOG, "Oak Log", 0x6B4226, 8));
      addToInventory(this._state.player.inventory, createBlockItem(BlockType.PLANKS, "Planks", 0xC4A35A, 12));
    }

    // Welcome + tutorial hints
    addMessage(this._state, "Welcome to Camelot Dig!", 0xFFD700);
    if (creative) {
      addMessage(this._state, "Creative mode — infinite resources.", 0xC0A060);
    } else {
      addMessage(this._state, "Tip: Mine trees for wood. Craft a Round Table to unlock recipes!", 0x88CC66);
      addMessage(this._state, "Press F1 for controls. Press E to open inventory.", 0x666666);
    }
    this._tutorialStep = 0;
    this._tutorialTimer = 0;

    // Start game loop
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _loadAndStartGame(): void {
    const loaded = loadTerrariaWorld();
    if (!loaded) {
      this._startGame();
      return;
    }
    viewManager.clearWorld();
    this._state = loaded;
    this._state.screenW = viewManager.screenWidth;
    this._state.screenH = viewManager.screenHeight;

    initTerrain(this._state.seed);
    recalcLighting(this._state);

    this._renderer.init();
    this._renderer.worldLayer.scale.set(TERRARIA_ZOOM);
    viewManager.addToLayer("units", this._renderer.worldLayer);
    this._renderer.entityLayer.addChild(this._playerView.container);
    this._renderer.entityLayer.addChild(this._mobView.container);
    this._renderer.entityLayer.addChild(this._fx.container);

    // Disable global camera keyboard panning (Terraria has its own camera)
    viewManager.camera.keyboardEnabled = false;

    // Adjust screen dimensions for zoom
    this._state.screenW = Math.ceil(this._state.screenW / TERRARIA_ZOOM);
    this._state.screenH = Math.ceil(this._state.screenH / TERRARIA_ZOOM);

    this._camera.setScreenSize(this._state.screenW, this._state.screenH);
    this._camera.worldWidth = this._state.worldWidth;
    this._camera.x = this._state.player.x;
    this._camera.y = this._state.player.y;

    this._hud.build();
    this._hud.onExit = () => this.destroy();
    this._hud.onRespawn = () => this._respawnPlayer();
    this._hud.setResumeCallback(() => { this._state.paused = false; });

    initInput();
    window.addEventListener("resize", this._onResize);
    addMessage(this._state, "World loaded!", 0xFFD700);

    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  // -----------------------------------------------------------------------
  // Respawn
  // -----------------------------------------------------------------------

  private _respawnPlayer(): void {
    if (!this._state) return;
    const p = this._state.player;
    const spawnX = Math.floor(this._state.worldWidth / 2);
    const surfaceY = getSurfaceHeight(spawnX);
    p.x = spawnX + 0.5;
    p.y = surfaceY + 3;
    p.vx = 0;
    p.vy = 0;
    p.hp = Math.floor(p.maxHp / 2);
    p.mana = p.maxMana;
    p.invulnTimer = 2;
    p.miningTarget = null;
    p.hoverTarget = null;
    this._state.gameOver = false;
    // Reset fall/dodge tracking
    this._wasFalling = false;
    this._fallStartY = 0;
    this._dodgeTimer = 0;
    this._dodgeCooldown = 0;
    addMessage(this._state, "You respawned at the surface.", 0xFFD700);
  }

  // -----------------------------------------------------------------------
  // Special block interaction (Excalibur / Grail detection)
  // -----------------------------------------------------------------------

  private _checkSpecialBlocks(): void {
    const p = this._state.player;
    const px = Math.floor(p.x);
    const py = Math.floor(p.y);

    // Check 3x3 area around player for special blocks
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const wx = px + dx;
        const wy = py + dy;
        const bt = getWorldBlock(this._state, wx, wy);

        // Campfire: slow healing while nearby
        if (bt === _BT_CAMPFIRE) {
          if (p.hp < p.maxHp) {
            p.hp = Math.min(p.maxHp, p.hp + 0.5 * (1/60)); // ~0.5 HP/s
          }
        }

        // Bed: set respawn point on interact
        if (bt === _BT_BED && (this._lastInput?.interact)) {
          addMessage(this._state, "Respawn point set!", 0x88CCFF);
        }

        // Alchemy Lab: opens crafting with alchemy station
        if (bt === _BT_ALCHEMY && (this._lastInput?.interact)) {
          this._state.craftingOpen = true;
          this._state.craftingStation = "alchemy_lab" as any;
        }

        if (bt === BlockType.GRAIL_PEDESTAL) {
          // Excalibur shrine (in caverns layer) or Grail chamber (in underworld)
          if (!p.hasExcalibur && wy > TB.CAVERN_Y - 5 && wy < TB.UNDERGROUND_Y) {
            p.hasExcalibur = true;
            addToInventory(p.inventory, makeExcaliburItem());
            setWorldBlock(this._state, wx, wy, BlockType.AIR);
            addMessage(this._state, "You found EXCALIBUR!", 0xFFD700);
            addMessage(this._state, "The legendary blade hums with power.", 0xFFFFCC);
            this._camera.shake(4, 0.5);
          } else if (!p.hasGrail && wy < TB.CAVERN_Y) {
            p.hasGrail = true;
            addToInventory(p.inventory, makeGrailItem());
            setWorldBlock(this._state, wx, wy, BlockType.AIR);
            addMessage(this._state, "THE HOLY GRAIL IS FOUND!", 0xFFD700);
            addMessage(this._state, "Camelot's greatest quest is complete!", 0xFFFFCC);
            this._camera.shake(6, 1.0);
          }
        }
      }
    }
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
    this._lastInput = input;

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
      const p = this._state.player;

      // Dodge roll (double-tap direction or Shift+A/D)
      if (this._dodgeCooldown > 0) this._dodgeCooldown -= dt;
      if (this._dodgeTimer > 0) {
        this._dodgeTimer -= dt;
        p.invulnTimer = Math.max(p.invulnTimer, TB.DODGE_INVULN);
      } else {
        // Check if player is on ladder/rope
        const playerBlock = getWorldBlock(this._state, Math.floor(p.x), Math.floor(p.y));
        const onLadder = playerBlock === _BT_LADDER || playerBlock === _BT_ROPE;

        // Normal movement
        const inWater = this._isPlayerInWater();
        const speed = inWater ? TB.SWIM_SPEED : (input.sprint ? TB.PLAYER_SPEED * TB.PLAYER_SPRINT_MULT : TB.PLAYER_SPEED);
        if (input.left) { p.vx = -speed * (onLadder ? 0.5 : 1); p.facingRight = false; }
        else if (input.right) { p.vx = speed * (onLadder ? 0.5 : 1); p.facingRight = true; }
        else { p.vx *= TB.FRICTION; }

        // Ladder/rope climbing
        if (onLadder) {
          if (input.up) { p.vy = 5; }
          else if (input.down) { p.vy = -5; }
          else { p.vy *= 0.5; } // hover on ladder
        }

        // Coyote time (grace period after leaving ground)
        if (p.onGround) {
          this._coyoteTimer = 0.1;
          this._hasDoubleJumped = false;
        } else {
          this._coyoteTimer -= dt;
        }

        // Wall slide detection
        this._wallSlideDir = 0;
        if (!p.onGround && p.vy < 0) {
          const leftWall = isSolid(this._state, Math.floor(p.x - TB.PLAYER_WIDTH / 2 - 0.1), Math.floor(p.y));
          const rightWall = isSolid(this._state, Math.floor(p.x + TB.PLAYER_WIDTH / 2 + 0.1), Math.floor(p.y));
          if (leftWall && input.left) {
            this._wallSlideDir = -1;
            p.vy = Math.max(p.vy, -TB.MAX_FALL_SPEED * 0.3); // slow fall
          } else if (rightWall && input.right) {
            this._wallSlideDir = 1;
            p.vy = Math.max(p.vy, -TB.MAX_FALL_SPEED * 0.3);
          }
        }

        // Jump / swim / wall jump / double jump
        if (input.jump) {
          if (inWater) {
            p.vy = TB.SWIM_BOOST;
          } else if (p.onGround || this._coyoteTimer > 0) {
            p.vy = TB.JUMP_VELOCITY;
            this._coyoteTimer = 0;
          } else if (this._wallSlideDir !== 0) {
            // Wall jump: kick off the wall
            p.vy = TB.JUMP_VELOCITY * 0.85;
            p.vx = -this._wallSlideDir * TB.PLAYER_SPEED * 1.2;
            p.facingRight = this._wallSlideDir < 0;
            this._hasDoubleJumped = false;
            this._fx.spawnMiningParticles(p.x + this._wallSlideDir * 0.5, p.y, 0xCCCCCC, 4);
          } else if (!this._hasDoubleJumped) {
            // Double jump (smaller boost)
            p.vy = TB.JUMP_VELOCITY * 0.7;
            this._hasDoubleJumped = true;
            this._fx.spawnMiningParticles(p.x, p.y - 0.5, 0xAADDFF, 4);
          }
        }

        // Dodge roll trigger (Q key or Shift + direction while on ground, cooldown ready)
        const dodgeTrigger = (input.dodge || (input.sprint && (input.left || input.right))) && p.onGround && this._dodgeCooldown <= 0;
        if (dodgeTrigger && (input.left || input.right)) {
          this._dodgeTimer = TB.DODGE_DURATION;
          this._dodgeCooldown = TB.DODGE_COOLDOWN;
          p.vx = (input.left ? -1 : 1) * TB.DODGE_SPEED;
          this._fx.spawnMiningParticles(p.x, p.y - 0.5, 0xCCCCCC, 5);
        }
      }

      // Track fall start for fall damage
      if (!p.onGround && p.vy < 0) {
        if (!this._wasFalling) {
          this._fallStartY = p.y;
          this._wasFalling = true;
        }
      }

      // Physics
      updatePlayerPhysics(this._state, dt);
      updateMobPhysics(this._state, dt);
      updateDroppedItemPhysics(this._state, dt);

      // Fall damage check (after physics resolved landing)
      if (p.onGround && this._wasFalling) {
        const fallDist = this._fallStartY - p.y;
        if (fallDist > TB.FALL_DAMAGE_THRESHOLD && !this._state.creativeMode && !this._isPlayerInWater()) {
          const dmg = Math.floor((fallDist - TB.FALL_DAMAGE_THRESHOLD) * TB.FALL_DAMAGE_MULT);
          if (dmg > 0) {
            p.hp -= dmg;
            p.invulnTimer = TB.INVULN_TIME;
            this._camera.shake(2 + dmg * 0.1, 0.15);
            this._fx.spawnMiningParticles(p.x, p.y - 0.3, 0x888888, 6);
            this._renderer.addFloatingText(p.x, p.y + 1, String(dmg), 0xFF8844);
            if (p.hp <= 0) {
              p.hp = 0;
              this._state.gameOver = true;
              addMessage(this._state, "You fell to your death!", 0xFF4444);
            }
          }
        }
        this._wasFalling = false;
      }

      // Mining / placing (with progress particles + placement FX)
      if (!this._state.inventoryOpen) {
        const prevMining = p.miningTarget?.progress ?? 0;
        const prevPlaced = p.blocksPlaced;
        updateMining(this._state, input, this._camera, dt);
        // Block placement particles
        if (p.blocksPlaced > prevPlaced && p.hoverTarget) {
          const bt = getWorldBlock(this._state, p.hoverTarget.wx, p.hoverTarget.wy);
          const def = BLOCK_DEFS[bt];
          if (def) this._fx.spawnBlockPlaceParticles(p.hoverTarget.wx + 0.5, p.hoverTarget.wy + 0.5, def.color);
        }
        // Mining progress particles
        if (p.miningTarget && p.miningTarget.progress > prevMining) {
          const mt = p.miningTarget;
          if (Math.floor(p.miningTarget.progress * 4) > Math.floor(prevMining * 4)) {
            const bt = getWorldBlock(this._state, mt.wx, mt.wy);
            const def = BLOCK_DEFS[bt];
            if (def) this._fx.spawnMiningParticles(mt.wx + 0.5, mt.wy + 0.5, def.color, 3);
          }
        }
      }

      // Tutorial hints (contextual, time-based)
      this._updateTutorial(dt);

      // Day/night
      updateDayNight(this._state, dt);

      // Combat (track mob HP for damage numbers)
      const mobHpBefore = new Map<number, number>();
      for (const mob of this._state.mobs) mobHpBefore.set(mob.id, mob.hp);

      if (!this._state.inventoryOpen) {
        updateCombat(this._state, input, this._camera, dt);
      }

      // Spawn floating damage numbers + death effects for mobs
      for (const mob of this._state.mobs) {
        const prev = mobHpBefore.get(mob.id) ?? mob.hp;
        const dmg = prev - mob.hp;
        if (dmg > 0) {
          this._renderer.addFloatingText(mob.x, mob.y + mob.height * 0.5 + 0.5, String(Math.ceil(dmg)), 0xFF4444);
          this._fx.spawnHitParticles(mob.x, mob.y);
          this._camera.shake(1.5, 0.08);
        }
        // Death poof
        if (mob.hp <= 0 && prev > 0) {
          this._fx.spawnMiningParticles(mob.x, mob.y, 0xFFFFFF, 12);
          this._fx.spawnHitParticles(mob.x, mob.y, 15);
          this._camera.shake(3, 0.2);
        }
      }

      // Mobs & NPCs
      updateMobs(this._state, dt);
      updateNPCs(this._state, dt);
      updateKnightCombat(this._state, dt);

      // Special block detection (Excalibur, Grail)
      this._checkSpecialBlocks();

      // NPC interaction (F key or up key near NPC)
      if ((input.interact || input.up) && !this._state.inventoryOpen) {
        interactWithNPC(this._state);
      }

      // NPC trade (T key near NPC with shop)
      if (input.trade && !this._state.inventoryOpen) {
        // Give player a random item from the shop
        buyFromNPC(this._state, Math.floor(Math.random() * 4));
      }

      // Use consumable (R key — use held item if it's a consumable/food)
      if (input.use && !this._state.inventoryOpen) {
        const held = p.inventory.hotbar[p.inventory.selectedSlot];
        if (held && held.count > 0) {
          let consumed = false;
          // Healing mushroom
          if (held.displayName === "Mushroom" || held.displayName === "Healing Mushroom") {
            if (p.hp < p.maxHp) {
              p.hp = Math.min(p.maxHp, p.hp + 15);
              addMessage(this._state, "Healed 15 HP!", 0x44FF44);
              consumed = true;
            }
          }
          // Healing potion (stronger)
          if (held.displayName === "Healing Potion") {
            if (p.hp < p.maxHp) {
              p.hp = Math.min(p.maxHp, p.hp + 40);
              addMessage(this._state, "Healed 40 HP!", 0x44FF88);
              consumed = true;
            }
          }
          // Fire resistance potion
          if (held.displayName === "Fire Resistance Potion") {
            applyStatusEffect(p.statusEffects, { type: "regen", duration: 10, tickTimer: 0, strength: 2 });
            addMessage(this._state, "Fire resistance! Regen for 10s!", 0xFF6644);
            consumed = true;
          }
          // Speed potion
          if (held.displayName === "Speed Potion") {
            applyStatusEffect(p.statusEffects, { type: "speed", duration: 15, tickTimer: 0, strength: 0.4 });
            addMessage(this._state, "Speed boost for 15s!", 0x4488FF);
            consumed = true;
          }
          // Herbal remedy (cures negative effects)
          if (held.displayName === "Herbal Remedy") {
            const negatives = p.statusEffects.filter(e => e.type === "poison" || e.type === "fire" || e.type === "freeze" || e.type === "weakness");
            if (negatives.length > 0) {
              for (const e of negatives) e.duration = 0;
              addMessage(this._state, "Ailments cured!", 0x55DD44);
              consumed = true;
            }
          }
          // Strength elixir (crit chance + damage buff)
          if (held.displayName === "Strength Elixir") {
            p.critChance = Math.min(0.35, p.critChance + 0.1);
            applyStatusEffect(p.statusEffects, { type: "speed", duration: 20, tickTimer: 0, strength: 0.25 });
            addMessage(this._state, "Strength surges through you! +10% crit, speed boost!", 0xFF8844);
            consumed = true;
          }
          // Food items (generic: Red Flower = healing, Blue Flower = mana)
          if (!consumed && held.displayName === "Red Flower" && p.hp < p.maxHp) {
            p.hp = Math.min(p.maxHp, p.hp + 5);
            addMessage(this._state, "Healed 5 HP!", 0xFF4444);
            consumed = true;
          }
          if (!consumed && held.displayName === "Blue Flower" && p.mana < p.maxMana) {
            p.mana = Math.min(p.maxMana, p.mana + 15);
            addMessage(this._state, "Restored 15 Mana!", 0x4488FF);
            consumed = true;
          }
          if (consumed) {
            held.count--;
            if (held.count <= 0) p.inventory.hotbar[p.inventory.selectedSlot] = null;
          }
        }
      }

      // Track dragon kills
      for (const mob of this._state.mobs) {
        if (mob.hp <= 0 && mob.type === "dragon") {
          onDragonKilled(this._state);
        }
      }

      // Quests
      updateQuests(this._state);

      // Timers
      if (p.invulnTimer > 0) p.invulnTimer -= dt;
      if (p.attackTimer > 0) p.attackTimer -= dt;

      // Pickup dropped items (magnet pull + auto-equip for armor)
      for (let i = this._state.droppedItems.length - 1; i >= 0; i--) {
        const di = this._state.droppedItems[i];
        if (di.pickupDelay > 0) continue;
        const ddx = di.x - p.x;
        const ddy = di.y - p.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);

        // Magnet pull: items within magnet range drift toward player
        if (dist < TB.PICKUP_MAGNET_RANGE && dist > TB.PICKUP_RANGE) {
          const pull = TB.PICKUP_MAGNET_SPEED * dt;
          di.x -= (ddx / dist) * pull;
          di.y -= (ddy / dist) * pull;
        }

        // Actual pickup
        if (dist < TB.PICKUP_RANGE) {
          let picked = false;
          if (di.item.category === ItemCategory.ARMOR) {
            picked = tryEquipArmor(p.inventory, di.item);
            if (picked) addMessage(this._state, `Equipped ${di.item.displayName}!`, 0x44AAFF);
          }
          if (!picked) picked = addToInventory(p.inventory, di.item);
          if (picked) {
            this._fx.spawnPickupParticles(di.x, di.y, di.item.color);
            this._state.droppedItems.splice(i, 1);
          }
        }
      }

      // Recalculate armor defense
      const baseDef = this._state.difficulty === "easy" ? 3 : 0;
      p.defense = baseDef + calcArmorDefense(p.inventory);

      // FX update
      this._fx.update(dt);
      this._fx.updateAmbient(this._state, this._camera, dt);

      // Recalc lighting if needed
      let needsLightRecalc = false;
      for (const chunk of this._state.chunks.values()) {
        if (chunk.lightDirty) { needsLightRecalc = true; break; }
      }
      if (needsLightRecalc) recalcLighting(this._state);

      // Auto-save
      this._saveTimer += dt;
      if (this._saveTimer >= TB.AUTOSAVE_INTERVAL) {
        this._saveTimer = 0;
        saveTerrariaWorld(this._state);
      }
    }

    // Camera
    this._camera.follow(this._state.player.x, this._state.player.y, dt, this._state.player.vx, this._state.player.vy);
    this._camera.update(dt);
    this._state.camX = this._camera.x;
    this._state.camY = this._camera.y;

    // Render
    this._renderer.updateFloatingTexts(dt);
    this._renderer.draw(this._state, this._camera);
    this._playerView.draw(this._state, this._camera, dt);
    this._mobView.draw(this._state, this._camera, dt);
    this._fx.draw(this._camera);
    this._hud.update(this._state);

    // Continue loop
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private _isPlayerInWater(): boolean {
    const p = this._state.player;
    const bt = getWorldBlock(this._state, Math.floor(p.x), Math.floor(p.y));
    return bt === BlockType.WATER;
  }

  private _updateTutorial(dt: number): void {
    if (this._state.creativeMode) return;
    this._tutorialTimer += dt;
    const p = this._state.player;

    // Step 0: after 15s, hint about mining
    if (this._tutorialStep === 0 && this._tutorialTimer > 15 && p.blocksMined === 0) {
      addMessage(this._state, "Hint: Left-click on blocks to mine them. Start with trees!", 0x88AA66);
      this._tutorialStep = 1;
    }
    // Step 1: after first block mined, hint about crafting
    if (this._tutorialStep <= 1 && p.blocksMined >= 1 && this._tutorialTimer > 20) {
      addMessage(this._state, "Hint: Press E to open inventory. Craft a Round Table from planks!", 0x88AA66);
      this._tutorialStep = 2;
    }
    // Step 2: after placing a Round Table, hint about using it
    if (this._tutorialStep === 2 && p.blocksPlaced >= 1 && this._tutorialTimer > 40) {
      addMessage(this._state, "Hint: Right-click a Round Table to access crafting recipes.", 0x88AA66);
      this._tutorialStep = 3;
    }
    // Step 3: after crafting, hint about going underground
    if (this._tutorialStep === 3 && this._state.quests[1]?.completed) {
      addMessage(this._state, "Hint: Dig down to find iron ore. Place torches to light the way!", 0x88AA66);
      this._tutorialStep = 4;
    }
    // Step 4: after finding iron, hint about forge
    if (this._tutorialStep === 4 && this._state.quests[2]?.completed) {
      addMessage(this._state, "Hint: Build a Forge (8 cobblestone + 2 logs at Round Table) for advanced recipes.", 0x88AA66);
      this._tutorialStep = 5;
    }
    // No more hints after step 5
  }

  // -----------------------------------------------------------------------
  // Resize
  // -----------------------------------------------------------------------

  private _onResize = (): void => {
    if (!this._state) return;
    this._state.screenW = Math.ceil(window.innerWidth / TERRARIA_ZOOM);
    this._state.screenH = Math.ceil(window.innerHeight / TERRARIA_ZOOM);
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
    // Re-enable global camera keyboard panning
    viewManager.camera.keyboardEnabled = true;
    // Save before exit
    if (this._state && !this._state.gameOver) {
      saveTerrariaWorld(this._state);
    }
    this._renderer.cleanup();
    this._playerView.destroy();
    this._mobView.destroy();
    this._fx.destroy();
    this._hud.cleanup();
    viewManager.clearWorld();

    // Remove title screen if still present
    const title = document.getElementById("terraria-title");
    if (title) title.remove();

    window.dispatchEvent(new Event("terrariaExit"));
  }
}
