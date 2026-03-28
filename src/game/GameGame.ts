// ---------------------------------------------------------------------------
// Quest for the Grail — Main Game Orchestrator
// Arthurian roguelike dungeon crawler. Player picks a genre/quest type,
// then a Knight of the Round Table, and descends through procedurally
// generated dungeon floors fighting mythological creatures, finding holy
// relics, and battling Arthurian villains. Permadeath with meta-progression.
// ---------------------------------------------------------------------------

import { Ticker, Container, Graphics, Text, TextStyle } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

import {
  GameBalance, QUEST_GENRE_DEFS, KNIGHT_DEFS, TileType, getFloorParams,
  SHOP_ITEMS, ITEM_DEFS,
} from "./config/GameConfig";

// GameCraftingDefs imported dynamically via require below

import {
  ARTIFACT_DEFS,
} from "./config/GameArtifactDefs";

import {
  GamePhase, Direction,
  createGrailGameState, createPlayerState,
  unlockKnight, updateRunStatsOnEnd,
} from "./state/GameState";
import type { GrailGameState } from "./state/GameState";

import { generateFloor, revealAround } from "./systems/GameDungeonGenerator";
import { GameCombatSystem, recalcStats, gainXP } from "./systems/GameCombatSystem";
import {
  craft, getAvailableRecipes,
  canEnchant, enchantItem, getApplicableEnchantments,
} from "./systems/GameCraftingSystem";
import { companionFloorBonus } from "./systems/GameCompanionSystem";
import {
  getInfiniteFloorParams, getScaledEnemyDef, calculateFloorScore,
  saveLeaderboardEntry,
} from "./systems/GameInfiniteMode";

import { GameRenderer } from "./view/GameRenderer";
import { GameHUD } from "./view/GameHUD";

const DT = GameBalance.SIM_TICK_MS / 1000;

// ---------------------------------------------------------------------------
// Input state (polled each frame)
// ---------------------------------------------------------------------------
const _keys: Record<string, boolean> = {};
function _onKeyDown(e: KeyboardEvent) { _keys[e.code] = true; }
function _onKeyUp(e: KeyboardEvent) { _keys[e.code] = false; }
function _isDown(code: string): boolean { return !!_keys[code]; }

// Consume a key press (returns true once, then false until re-pressed)
const _pressed: Record<string, boolean> = {};
function _justPressed(code: string): boolean {
  if (_keys[code] && !_pressed[code]) {
    _pressed[code] = true;
    return true;
  }
  if (!_keys[code]) _pressed[code] = false;
  return false;
}

// ---------------------------------------------------------------------------
// GameGame
// ---------------------------------------------------------------------------

export class GameGame {
  private _state!: GrailGameState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _simAccumulator = 0;

  private _renderer = new GameRenderer();
  private _hud = new GameHUD();
  private _camOffsetX = 0;
  private _camOffsetY = 0;
  private _floorTransitionTimer = 0;
  private _showingHelp = false;       // controls help overlay visible
  private _pauseMenu: Container | null = null;
  private _paused = false;

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------
  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();

    this._state = createGrailGameState();

    // Renderer
    this._renderer.init();
    viewManager.addToLayer("units", this._renderer.worldLayer);

    // Disable ViewManager camera — this game has its own camera system
    viewManager.camera.keyboardEnabled = false;
    viewManager.camera.manualControlMode = true;
    viewManager.camera.x = 0;
    viewManager.camera.y = 0;
    viewManager.camera.zoom = 1;

    // HUD
    this._hud.build();
    viewManager.addToLayer("ui", this._hud.container);

    // Input
    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);

    // Combat callbacks
    GameCombatSystem.setHitCallback((x, y, dmg, isCrit) => {
      this._renderer.pendingHits.push({ x, y, dmg, isCrit, t: 0.8, drift: (Math.random() - 0.5) * 2 });
    });
    GameCombatSystem.setDeathCallback((enemy) => {
      this._renderer.pendingDeaths.push({ x: enemy.x, y: enemy.y, t: 0.6, category: enemy.def.category });
    });
    GameCombatSystem.setPlayerHitCallback((_dmg) => {
      this._renderer.shake(8, 0.2);
    });
    GameCombatSystem.setLevelUpCallback((level) => {
      this._hud.showNotification(`Level ${level}!`, 0xffdd44);
    });
    GameCombatSystem.setLootCallback((item, x, y) => {
      this._renderer.pendingLoots.push({ x, y, text: item.name, color: item.color, t: 1.0 });
      this._hud.showNotification(`Found: ${item.name}`, item.color);
    });
    GameCombatSystem.setBossPhaseFlashCallback((_bossId, phase, color) => {
      this._renderer.shake(12, 0.4);
      this._renderer.pendingBossFlash = { color, t: 0.6 };
      this._hud.showNotification(`Boss Phase ${phase}!`, color, 2);
    });
    GameCombatSystem.setSpawnCallback((_enemy) => {
      // Visual spawn effect handled by renderer detecting new enemies
    });
    GameCombatSystem.setMaterialCallback((name, qty, _x, _y) => {
      this._hud.showNotification(`+${qty} ${name}`, 0xaaaaaa);
    });
    GameCombatSystem.setArtifactCallback((name, _x, _y) => {
      this._hud.showNotification(`Artifact Found: ${name}!`, 0xffd700, 3);
    });
    GameCombatSystem.setTrapCallback((name, _x, _y) => {
      this._hud.showNotification(`Trap Detected: ${name}`, 0xff8844, 2);
    });
    GameCombatSystem.setCompanionCallback((name) => {
      this._hud.showNotification(`Companion Recruited: ${name}!`, 0x88ffaa, 3);
    });

    // Start game loop
    this._tickerCb = (ticker: Ticker) => {
      const dt = ticker.deltaMS / 1000;
      this._simAccumulator += dt;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        this._update(DT);
      }
      const sw = viewManager.screenWidth;
      const sh = viewManager.screenHeight;
      this._render(sw, sh, dt);
    };
    viewManager.app.ticker.add(this._tickerCb);
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------
  private _update(dt: number): void {
    if (this._paused) return;
    const state = this._state;

    switch (state.phase) {
      case GamePhase.GENRE_SELECT:
        this._handleGenreSelect();
        break;

      case GamePhase.KNIGHT_SELECT:
        this._handleKnightSelect();
        break;

      case GamePhase.PLAYING:
        this._handlePlaying(dt);
        break;

      case GamePhase.INVENTORY:
        this._handleInventory();
        break;

      case GamePhase.SHOP:
        this._handleShop();
        break;

      case GamePhase.PAUSED:
        this._handlePaused();
        break;

      case GamePhase.GAME_OVER:
      case GamePhase.VICTORY:
        this._handleEndScreen();
        break;

      case GamePhase.FLOOR_TRANSITION:
        this._handleFloorTransition(dt);
        break;

      case GamePhase.CRAFTING:
        this._handleCrafting();
        break;

      case GamePhase.ENCHANTING:
        this._handleEnchanting();
        break;

      case GamePhase.PUZZLE:
        this._handlePuzzle(dt);
        break;

      case GamePhase.ARTIFACT_LORE:
        this._handleArtifactLore();
        break;

      case GamePhase.ESCAPE_MENU:
        this._handleEscapeMenu();
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Genre Select
  // -------------------------------------------------------------------------
  private _handleGenreSelect(): void {
    for (let i = 0; i < QUEST_GENRE_DEFS.length; i++) {
      if (_justPressed(`Digit${i + 1}`)) {
        this._state.genre = QUEST_GENRE_DEFS[i];
        this._state.totalFloors = QUEST_GENRE_DEFS[i].floorCount;
        this._state.isInfiniteMode = false;
        this._state.phase = GamePhase.KNIGHT_SELECT;
        return;
      }
    }
    // Infinite mode: press 0 or Digit7+
    const infiniteKey = QUEST_GENRE_DEFS.length + 1;
    if (_justPressed(`Digit${infiniteKey}`) || _justPressed("Digit0")) {
      // Use Classic genre as base for infinite mode
      this._state.genre = QUEST_GENRE_DEFS[0];
      this._state.totalFloors = 999;
      this._state.isInfiniteMode = true;
      this._state.infiniteScore = 0;
      this._state.phase = GamePhase.KNIGHT_SELECT;
      return;
    }
    if (_justPressed("Escape")) {
      window.dispatchEvent(new Event("gameExit"));
    }
  }

  // -------------------------------------------------------------------------
  // Knight Select
  // -------------------------------------------------------------------------
  private _handleKnightSelect(): void {
    for (let i = 0; i < KNIGHT_DEFS.length; i++) {
      if (_justPressed(`Digit${i + 1}`)) {
        const k = KNIGHT_DEFS[i];
        if (this._state.unlockedKnights.includes(k.id)) {
          this._state.player = createPlayerState(k);
          this._startFloor(0);
          return;
        }
      }
    }
    if (_justPressed("Escape")) {
      this._state.phase = GamePhase.GENRE_SELECT;
    }
  }

  // -------------------------------------------------------------------------
  // Start a new floor
  // -------------------------------------------------------------------------
  private _startFloor(floorNum: number): void {
    const state = this._state;
    state.currentFloor = floorNum;
    state.floorStartTime = Date.now();

    const params = state.isInfiniteMode
      ? getInfiniteFloorParams(floorNum)
      : getFloorParams(floorNum, state.totalFloors);
    const floor = generateFloor(floorNum, params, state.genre!, state.enemyIdCounter);

    // Scale enemies for infinite mode
    if (state.isInfiniteMode && floorNum > 0) {
      for (const enemy of floor.enemies) {
        const scaled = getScaledEnemyDef(enemy.def, floorNum);
        enemy.def = scaled;
        enemy.hp = scaled.hp;
        enemy.maxHp = scaled.hp;
      }
    }

    state.floor = floor;
    state.enemyIdCounter += floor.enemies.length + 1;

    // Place player at entrance
    const p = state.player;
    p.x = floor.entrancePos.col * GameBalance.TILE_SIZE + GameBalance.TILE_SIZE / 2;
    p.y = floor.entrancePos.row * GameBalance.TILE_SIZE + GameBalance.TILE_SIZE / 2;

    // Reveal around player
    revealAround(floor, floor.entrancePos.col, floor.entrancePos.row, 5);

    // Grail shard healing between floors
    if (floorNum > 0) {
      if (p.equippedRelic?.specialEffect === "grail_heal") {
        p.hp = Math.min(p.maxHp, p.hp + 20);
        this._hud.showNotification("Grail Shard restores 20 HP", 0xffd700);
      }
      if (p.equippedRelic?.specialEffect === "grail_full") {
        p.hp = p.maxHp;
        this._hud.showNotification("The Holy Grail fully restores you!", 0xffd700);
      }
      // Regen armor
      if (p.equippedArmor?.specialEffect === "regen") {
        p.hp = Math.min(p.maxHp, p.hp + 15);
      }

      // Companion between-floor healing and loyalty
      if (state.companion && state.companion.alive) {
        companionFloorBonus(state.companion);
      }

      // Artifact set bonuses: Grail set heals between floors
      const grailPieces = state.artifacts.filter(a =>
        a.found && ARTIFACT_DEFS[a.id]?.setId === "grail_set",
      ).length;
      if (grailPieces >= 2) {
        p.hp = Math.min(p.maxHp, p.hp + 10);
        this._hud.showNotification("Grail Set (2pc): +10 HP", 0xffd700);
      }
      if (grailPieces >= 3) {
        p.hp = p.maxHp;
        this._hud.showNotification("Grail Set (3pc): Full heal!", 0xffd700);
      }

      // Perception increases each floor
      state.perception = Math.min(80, state.perception + 2);
    }

    // Snap camera
    this._renderer.camX = p.x - viewManager.screenWidth / 2;
    this._renderer.camY = p.y - viewManager.screenHeight / 2;

    state.phase = GamePhase.PLAYING;
    this._hud.showNotification(
      `Floor ${floorNum + 1}: ${QUEST_GENRE_DEFS.length > 0 ? "" : ""}${
        floorNum < 8 ? ["Castle Dungeons", "Enchanted Forest Caves", "Crimson Crypts", "Frozen Depths", "Volcanic Tunnels", "Faerie Hollows", "Abyssal Halls", "The Final Keep"][Math.min(floorNum, 7)] : "The Depths"
      }`,
      0xffd700, 3,
    );
  }

  // -------------------------------------------------------------------------
  // Playing (main gameplay)
  // -------------------------------------------------------------------------
  private _handlePlaying(dt: number): void {
    const state = this._state;
    const p = state.player;
    const floor = state.floor;

    // Pause
    if (_justPressed("KeyP")) {
      state.prevPhase = state.phase;
      state.phase = GamePhase.PAUSED;
      return;
    }

    // Inventory
    if (_justPressed("KeyI")) {
      state.prevPhase = state.phase;
      state.phase = GamePhase.INVENTORY;
      return;
    }

    // Camera pan (Arrow keys)
    const camSpeed = 300 * dt;
    if (_isDown("ArrowUp"))    this._camOffsetY -= camSpeed;
    if (_isDown("ArrowDown"))  this._camOffsetY += camSpeed;
    if (_isDown("ArrowLeft"))  this._camOffsetX -= camSpeed;
    if (_isDown("ArrowRight")) this._camOffsetX += camSpeed;
    // Clamp camera offset to reasonable range
    const maxCamOff = 200;
    this._camOffsetX = Math.max(-maxCamOff, Math.min(maxCamOff, this._camOffsetX));
    this._camOffsetY = Math.max(-maxCamOff, Math.min(maxCamOff, this._camOffsetY));
    // Ease camera offset back toward center when arrow keys released
    if (!_isDown("ArrowLeft") && !_isDown("ArrowRight")) this._camOffsetX *= 0.9;
    if (!_isDown("ArrowUp") && !_isDown("ArrowDown")) this._camOffsetY *= 0.9;
    this._renderer.camOffsetX = this._camOffsetX;
    this._renderer.camOffsetY = this._camOffsetY;

    // Dash cooldown tick
    if (state.dashCooldown > 0) state.dashCooldown -= dt;

    // Kill streak timer tick
    if (state.killStreakTimer > 0) {
      state.killStreakTimer -= dt;
      if (state.killStreakTimer <= 0) { state.killStreakCount = 0; state.killStreakTimer = 0; }
    }

    // Movement (WASD) with environmental effects
    const themeFloor = Math.min(state.currentFloor, 7);
    const playerCol = Math.floor(p.x / GameBalance.TILE_SIZE);
    const playerRow = Math.floor(p.y / GameBalance.TILE_SIZE);
    const currentTile = (playerCol >= 0 && playerCol < floor.width && playerRow >= 0 && playerRow < floor.height)
      ? floor.tiles[playerRow][playerCol] : TileType.WALL;
    const onIce = currentTile === TileType.ICE;
    const onVine = currentTile === TileType.VINE;

    // Active dash movement (overrides normal movement, grants i-frames)
    if (state.dashTimer > 0) {
      state.dashTimer -= dt;
      const dashSpeed = GameBalance.DASH_SPEED * dt;
      const newX = p.x + state.dashDx * dashSpeed;
      const newY = p.y + state.dashDy * dashSpeed;
      const col = Math.floor(newX / GameBalance.TILE_SIZE);
      const row = Math.floor(newY / GameBalance.TILE_SIZE);
      if (col >= 0 && col < floor.width && row >= 0 && row < floor.height &&
          floor.tiles[row][col] !== TileType.WALL) {
        p.x = newX;
        p.y = newY;
      } else {
        state.dashTimer = 0; // Hit a wall, end dash
      }
      const pc = Math.floor(p.x / GameBalance.TILE_SIZE);
      const pr = Math.floor(p.y / GameBalance.TILE_SIZE);
      revealAround(floor, pc, pr, 5);
      p.isMoving = true;
    } else {
      // Environmental speed modifiers
      let speedMult = 1.0;
      if (onIce) speedMult = 0.5;      // Ice slows movement
      if (onVine) speedMult = 0.6;     // Vines entangle and slow
      // Abyssal Halls: slight speed reduction as darkness grows
      if (themeFloor === 6 && floor.darknessTimer > 20) speedMult *= 0.85;
      const speed = GameBalance.PLAYER_MOVE_SPEED * dt * speedMult;
      let dx = 0, dy = 0;

      // Ice slide: continue in previous direction
      if (state.iceSlideDir && onIce) {
        dx = state.iceSlideDir.dx;
        dy = state.iceSlideDir.dy;
      }

      // Confusion: reverse controls; Stun: no movement
      const confused = p.confusionTimer > 0;
      const stunned = p.stunTimer > 0;

      if (!stunned) {
        if (_isDown("KeyW")) { dy = confused ? 1 : -1; p.facing = confused ? Direction.DOWN : Direction.UP; state.iceSlideDir = null; }
        if (_isDown("KeyS")) { dy = confused ? -1 : 1; p.facing = confused ? Direction.UP : Direction.DOWN; state.iceSlideDir = null; }
        if (_isDown("KeyA")) { dx = confused ? 1 : -1; p.facing = confused ? Direction.RIGHT : Direction.LEFT; state.iceSlideDir = null; }
        if (_isDown("KeyD")) { dx = confused ? -1 : 1; p.facing = confused ? Direction.LEFT : Direction.RIGHT; state.iceSlideDir = null; }
      }

      // Dash (Shift) — dash in facing direction, grants brief invulnerability
      if (_justPressed("ShiftLeft") || _justPressed("ShiftRight")) {
        if (state.dashCooldown <= 0 && !stunned) {
          let ddx = 0, ddy = 0;
          // Use input direction if moving, otherwise use facing
          if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            ddx = dx / len; ddy = dy / len;
          } else {
            switch (p.facing) {
              case Direction.UP: ddy = -1; break;
              case Direction.DOWN: ddy = 1; break;
              case Direction.LEFT: ddx = -1; break;
              case Direction.RIGHT: ddx = 1; break;
            }
          }
          state.dashTimer = GameBalance.DASH_DURATION;
          state.dashCooldown = GameBalance.DASH_COOLDOWN;
          state.dashDx = ddx;
          state.dashDy = ddy;
        }
      }

      if (dx !== 0 || dy !== 0) {
        // Normalize diagonal
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;

        const newX = p.x + dx * speed;
        const newY = p.y + dy * speed;

        // Wall collision
        const col = Math.floor(newX / GameBalance.TILE_SIZE);
        const row = Math.floor(newY / GameBalance.TILE_SIZE);
        if (col >= 0 && col < floor.width && row >= 0 && row < floor.height) {
          const tile = floor.tiles[row][col];
          if (tile !== TileType.WALL) {
            p.x = newX;
            p.y = newY;
          } else {
            // Try sliding along walls
            const colX = Math.floor(newX / GameBalance.TILE_SIZE);
            const rowCurr = Math.floor(p.y / GameBalance.TILE_SIZE);
            if (colX >= 0 && colX < floor.width && rowCurr >= 0 && rowCurr < floor.height &&
                floor.tiles[rowCurr][colX] !== TileType.WALL) {
              p.x = newX;
            }
            const colCurr = Math.floor(p.x / GameBalance.TILE_SIZE);
            const rowY = Math.floor(newY / GameBalance.TILE_SIZE);
            if (colCurr >= 0 && colCurr < floor.width && rowY >= 0 && rowY < floor.height &&
                floor.tiles[rowY][colCurr] !== TileType.WALL) {
              p.y = newY;
            }
          }
        }

        // Reveal fog
        const pc = Math.floor(p.x / GameBalance.TILE_SIZE);
        const pr = Math.floor(p.y / GameBalance.TILE_SIZE);
        revealAround(floor, pc, pr, 5);
        p.isMoving = true;
      } else {
        p.isMoving = false;
      }
    }

    // Attack (space)
    if (_isDown("Space")) {
      GameCombatSystem.playerAttack(state);
    }

    // Ability (Q)
    if (_justPressed("KeyQ")) {
      if (p.abilityCooldown <= 0) {
        state.activeAbilityVfx = {
          knightId: p.knightDef.id,
          timer: 0.8,
          x: p.x,
          y: p.y,
        };
      }
      GameCombatSystem.playerAbility(state);
    }

    // Interact (E) — treasure, stairs, shop, shrine, lever, crafting, enchant, companion, puzzle
    if (_justPressed("KeyE")) {
      const pc = Math.floor(p.x / GameBalance.TILE_SIZE);
      const pr = Math.floor(p.y / GameBalance.TILE_SIZE);

      // Treasure
      if (GameCombatSystem.checkTreasure(state)) {
        GameCombatSystem.pickupTreasure(state, pc, pr);
      }

      // Shop
      if (GameCombatSystem.checkShop(state)) {
        state.prevPhase = state.phase;
        state.shopScrollIndex = 0;
        state.shopSellMode = false;
        state.phase = GamePhase.SHOP;
        return;
      }

      // Shrine
      if (GameCombatSystem.checkShrine(state)) {
        const buffDesc = GameCombatSystem.activateShrine(state);
        this._hud.showNotification(`Shrine Blessing: ${buffDesc}`, 0x88ffaa, 3);
      }

      // Lever (secret rooms)
      if (GameCombatSystem.checkLever(state)) {
        const activated = GameCombatSystem.activateLever(state);
        if (activated) {
          this._hud.showNotification("A hidden passage opens!", 0xffcc44, 3);
          this._renderer.shake(6, 0.3);
        }
      }

      // Crafting bench
      if (GameCombatSystem.checkCraftingBench(state)) {
        state.prevPhase = state.phase;
        state.craftingScrollIndex = 0;
        state.phase = GamePhase.CRAFTING;
        return;
      }

      // Enchant table
      if (GameCombatSystem.checkEnchantTable(state)) {
        state.prevPhase = state.phase;
        state.enchantingScrollIndex = 0;
        state.phase = GamePhase.ENCHANTING;
        return;
      }

      // Companion NPC
      if (GameCombatSystem.checkCompanionNPC(state)) {
        const recruited = GameCombatSystem.recruitCompanion(state);
        if (recruited && state.companion) {
          this._hud.showNotification(`${state.companion.def.name} joins your quest!`, 0x88ffaa, 3);
        } else if (state.companion) {
          this._hud.showNotification("You already have a companion.", 0xffaa44);
        }
      }

      // Puzzle plate
      if (GameCombatSystem.checkPuzzlePlate(state)) {
        const solved = GameCombatSystem.activatePuzzlePlate(state);
        if (solved) {
          this._hud.showNotification("Puzzle Solved! Rewards unlocked.", 0xffd700, 3);
          // Grant puzzle reward
          this._grantPuzzleReward(state);
        }
      }

      // Destructible wall (attack to break)
      if (GameCombatSystem.checkDestructibleWall(state)) {
        GameCombatSystem.breakDestructibleWall(state);
        this._hud.showNotification("Wall destroyed!", 0xcccccc);
        this._renderer.shake(4, 0.15);
      }

      // Disarm detected trap
      const trapDisarmed = GameCombatSystem.disarmTrap(state);
      if (trapDisarmed) {
        this._hud.showNotification("Trap disarmed! +XP", 0x44ff44);
      }

      // Stairs
      if (GameCombatSystem.checkStairs(state)) {
        if (!state.isInfiniteMode && state.currentFloor >= state.totalFloors - 1) {
          state.phase = GamePhase.VICTORY;
          this._handleVictoryUnlocks();
        } else {
          // Calculate floor score for infinite mode
          if (state.isInfiniteMode) {
            const clearTime = Date.now() - state.floorStartTime;
            state.infiniteScore += calculateFloorScore(state, clearTime);
          }
          state.phase = GamePhase.FLOOR_TRANSITION;
          this._floorTransitionTimer = 2.0;
        }
      }
    }

    // Toggle companion behavior (B key)
    if (_justPressed("KeyB") && state.companion && state.companion.alive) {
      const behaviors: Array<"aggressive" | "defensive" | "support"> = ["aggressive", "defensive", "support"];
      const idx = behaviors.indexOf(state.companion.behavior);
      state.companion.behavior = behaviors[(idx + 1) % behaviors.length];
      this._hud.showNotification(`Companion: ${state.companion.behavior} mode`, 0x88ffaa);
    }

    // View artifact lore (L key)
    if (_justPressed("KeyL") && state.artifacts.length > 0) {
      state.prevPhase = state.phase;
      state.artifactLoreViewing = state.artifacts[0]?.id ?? null;
      state.phase = GamePhase.ARTIFACT_LORE;
      return;
    }

    // Cooldowns
    if (p.attackCooldown > 0) p.attackCooldown -= dt * 1000;
    if (p.abilityCooldownMs > 0) p.abilityCooldownMs -= dt * 1000;

    // Stun & confusion timers
    if (p.stunTimer > 0) {
      p.stunTimer -= dt;
      if (p.stunTimer < 0) p.stunTimer = 0;
    }
    if (p.confusionTimer > 0) {
      p.confusionTimer -= dt;
      if (p.confusionTimer < 0) p.confusionTimer = 0;
    }

    // Decrease ability cooldown over time (represents turns passing)
    // Each second of real play counts as roughly 1 turn
    if (p.abilityCooldown > 0) {
      p.abilityCooldown -= dt * 0.5;
      if (p.abilityCooldown < 0) p.abilityCooldown = 0;
    }

    // Status effect ticks
    for (let i = p.statusEffects.length - 1; i >= 0; i--) {
      const eff = p.statusEffects[i];
      if (eff.id === "poison" || eff.id === "burn") {
        p.hp -= eff.value * dt;
      }
      eff.turnsRemaining -= dt;
      if (eff.turnsRemaining <= 0) {
        p.statusEffects.splice(i, 1);
      }
    }

    // Enemy AI
    GameCombatSystem.updateEnemies(state, dt);

    // Traps
    GameCombatSystem.checkTraps(state);

    // Environmental hazards
    GameCombatSystem.checkEnvironmentalHazards(state, dt);

    // Reanimation processing (Crimson Crypts)
    GameCombatSystem.processReanimations(state, dt);

    // Companion AI
    GameCombatSystem.updateCompanionAI(state, dt);

    // Boss arena hazards
    GameCombatSystem.updateArenaHazards(state, dt);

    // Ability VFX timer
    if (state.activeAbilityVfx) {
      state.activeAbilityVfx.timer -= dt;
      if (state.activeAbilityVfx.timer <= 0) {
        state.activeAbilityVfx = null;
      }
    }

    // Abyssal Halls: reduce visibility radius over time
    // (handled by renderer based on floor.darknessTimer)

    // Artifact: Green Girdle — survive lethal once
    if (p.hp <= 0) {
      const greenGirdle = state.artifacts.find(a => a.id === "green_girdle" && a.found && !a.upgraded);
      if (greenGirdle) {
        p.hp = Math.floor(p.maxHp * 0.3);
        greenGirdle.upgraded = true; // consumed — can only save once
        this._hud.showNotification("Green Girdle saves you from death!", 0x00aa44, 3);
      } else if (state.companion?.alive && state.companion.loyalty >= 80) {
        // High-loyalty companion sacrifice
        p.hp = Math.floor(p.maxHp * 0.1);
        state.companion.alive = false;
        state.companion.hp = 0;
        this._hud.showNotification(`${state.companion.def.name} sacrifices themselves!`, 0xff4444, 3);
      }
    }

    // Check death
    if (p.hp <= 0) {
      state.phase = GamePhase.GAME_OVER;
      updateRunStatsOnEnd(state, false);

      // Save infinite mode score on death too
      if (state.isInfiniteMode) {
        saveLeaderboardEntry({
          knightId: state.player.knightDef.id,
          knightName: state.player.knightDef.name,
          deepestFloor: state.currentFloor + 1,
          score: state.infiniteScore,
          totalKills: state.totalKills,
          date: new Date().toISOString().slice(0, 10),
        });
      }
    }

    // ESC opens the pause menu
    if (_justPressed("Escape")) {
      if (this._pauseMenu) { this._hidePauseMenu(); } else { this._showPauseMenu(); }
    }

    // Toggle help overlay (H key)
    if (_justPressed("KeyH")) {
      this._showingHelp = !this._showingHelp;
    }
  }

  // -------------------------------------------------------------------------
  // Inventory screen
  // -------------------------------------------------------------------------
  private _handleInventory(): void {
    if (_justPressed("Escape") || _justPressed("KeyI")) {
      this._state.phase = this._state.prevPhase;
      return;
    }
    // Number keys to equip/use
    for (let i = 0; i < 10; i++) {
      if (_justPressed(i < 9 ? `Digit${i + 1}` : "Digit0")) {
        const inv = this._state.player.inventory[i];
        if (inv) {
          if (inv.def.type === "consumable") {
            GameCombatSystem.useItem(this._state, i);
          } else {
            GameCombatSystem.equipItem(this._state, i);
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Shop
  // -------------------------------------------------------------------------
  private _handleShop(): void {
    if (_justPressed("Escape") || _justPressed("KeyE")) {
      this._state.phase = this._state.prevPhase;
      return;
    }

    // Tab to toggle buy/sell mode
    if (_justPressed("Tab")) {
      this._state.shopSellMode = !this._state.shopSellMode;
    }

    const state = this._state;
    const p = state.player;

    if (state.shopSellMode) {
      // Sell mode: number keys to sell inventory items
      for (let i = 0; i < 10; i++) {
        if (_justPressed(i < 9 ? `Digit${i + 1}` : "Digit0")) {
          if (i < p.inventory.length) {
            const inv = p.inventory[i];
            // Calculate sell price (70% of a base value determined by rarity)
            const baseValues: Record<string, number> = {
              common: 10, uncommon: 30, rare: 70, legendary: 150,
            };
            const baseVal = baseValues[inv.def.rarity] || 10;
            const sellPrice = Math.floor(baseVal * 0.7);
            p.gold += sellPrice;
            state.totalGold += sellPrice;
            inv.quantity--;
            if (inv.quantity <= 0) {
              p.inventory.splice(i, 1);
            }
            this._hud.showNotification(`Sold for ${sellPrice}g`, 0xffd700);
          }
        }
      }
    } else {
      // Buy mode: number keys to buy shop items
      for (let i = 0; i < 10; i++) {
        if (_justPressed(i < 9 ? `Digit${i + 1}` : "Digit0")) {
          if (i < SHOP_ITEMS.length) {
            const shopItem = SHOP_ITEMS[i];
            if (p.gold >= shopItem.cost) {
              p.gold -= shopItem.cost;
              if (shopItem.type === "heal") {
                p.hp = p.maxHp;
                this._hud.showNotification("Fully healed!", 0x44ff44);
              } else if (shopItem.type === "stat_atk") {
                p.attack += shopItem.statBonus ?? 2;
                this._hud.showNotification(`+${shopItem.statBonus} ATK!`, 0xff8844);
              } else if (shopItem.type === "stat_def") {
                p.defense += shopItem.statBonus ?? 1;
                this._hud.showNotification(`+${shopItem.statBonus} DEF!`, 0x4488ff);
              } else if (shopItem.type === "gear" && shopItem.itemId) {
                const itemDef = ITEM_DEFS[shopItem.itemId];
                if (itemDef) {
                  if (p.inventory.length < GameBalance.MAX_INVENTORY_SIZE) {
                    const existing = p.inventory.find(inv => inv.def.id === itemDef.id);
                    if (existing && itemDef.type === "consumable") {
                      existing.quantity++;
                    } else {
                      p.inventory.push({ def: itemDef, quantity: 1 });
                    }
                    this._hud.showNotification(`Bought: ${itemDef.name}`, itemDef.color);
                  } else {
                    this._hud.showNotification("Inventory full!", 0xff4444);
                    p.gold += shopItem.cost; // refund
                  }
                }
              }
            } else {
              this._hud.showNotification("Not enough gold!", 0xff4444);
            }
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Paused
  // -------------------------------------------------------------------------
  private _handlePaused(): void {
    if (_justPressed("KeyP") || _justPressed("Escape")) {
      this._state.phase = this._state.prevPhase;
    }
  }

  // -------------------------------------------------------------------------
  // Escape Menu — full menu with controls, goals, inventory, etc.
  // -------------------------------------------------------------------------
  private _handleEscapeMenu(): void {
    // ESC closes the menu
    if (_justPressed("Escape")) {
      this._state.phase = this._state.prevPhase;
      return;
    }
    // Number keys for menu options
    if (_justPressed("Digit1")) {
      // Resume game
      this._state.phase = this._state.prevPhase;
    } else if (_justPressed("Digit2")) {
      // Controls
      this._showingHelp = true;
      this._state.phase = this._state.prevPhase;
    } else if (_justPressed("Digit3")) {
      // Inventory
      this._state.phase = GamePhase.INVENTORY;
    } else if (_justPressed("Digit4")) {
      // Artifacts
      this._state.phase = GamePhase.ARTIFACT_LORE;
    } else if (_justPressed("Digit5")) {
      // Goal / Quest info — show as help with notification
      this._state.phase = this._state.prevPhase;
      const genre = this._state.genre;
      const floor = this._state.currentFloor + 1;
      const goalMsg = genre
        ? `Quest: ${genre.label} — Floor ${floor}/${genre.floorCount}. ${genre.desc}`
        : `Descend through 10 dungeon floors and find the Holy Grail!`;
      this._hud.showNotification(goalMsg, 0xFFDD44, 5);
    } else if (_justPressed("Digit6")) {
      // Back to main menu
      window.dispatchEvent(new Event("gameExit"));
    }
  }

  // -------------------------------------------------------------------------
  // Floor transition (brief pause between floors with stats)
  // -------------------------------------------------------------------------
  private _handleFloorTransition(dt: number): void {
    this._floorTransitionTimer -= dt;
    // Allow skipping with Enter/Space
    if (_justPressed("Enter") || _justPressed("Space")) {
      this._floorTransitionTimer = 0;
    }
    if (this._floorTransitionTimer <= 0) {
      this._startFloor(this._state.currentFloor + 1);
    }
  }

  // -------------------------------------------------------------------------
  // End screens (game over / victory)
  // -------------------------------------------------------------------------
  private _handleEndScreen(): void {
    if (_justPressed("Enter")) {
      // Restart
      this._cleanup();
      this.boot();
    }
    if (_justPressed("Escape")) {
      window.dispatchEvent(new Event("gameExit"));
    }
  }

  // -------------------------------------------------------------------------
  // Victory unlocks
  // -------------------------------------------------------------------------
  private _handleVictoryUnlocks(): void {
    const state = this._state;
    updateRunStatsOnEnd(state, true);

    // Save infinite mode leaderboard entry
    if (state.isInfiniteMode) {
      saveLeaderboardEntry({
        knightId: state.player.knightDef.id,
        knightName: state.player.knightDef.name,
        deepestFloor: state.currentFloor + 1,
        score: state.infiniteScore,
        totalKills: state.totalKills,
        date: new Date().toISOString().slice(0, 10),
      });
    }

    // Unlock next knight based on which quest was completed
    const allKnights = KNIGHT_DEFS.map((k) => k.id);
    const locked = allKnights.filter((id) => !state.unlockedKnights.includes(id));
    if (locked.length > 0) {
      const toUnlock = locked[0];
      if (unlockKnight(state, toUnlock)) {
        const name = KNIGHT_DEFS.find((k) => k.id === toUnlock)?.name ?? toUnlock;
        this._hud.showNotification(`Unlocked: ${name}!`, 0xffd700, 4);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Crafting screen
  // -------------------------------------------------------------------------
  private _handleCrafting(): void {
    if (_justPressed("Escape") || _justPressed("KeyE")) {
      this._state.phase = this._state.prevPhase;
      return;
    }

    const state = this._state;
    const recipes = getAvailableRecipes(state);

    // Scroll through recipes
    if (_justPressed("ArrowUp") || _justPressed("KeyW")) {
      state.craftingScrollIndex = Math.max(0, state.craftingScrollIndex - 1);
    }
    if (_justPressed("ArrowDown") || _justPressed("KeyS")) {
      state.craftingScrollIndex = Math.min(recipes.length - 1, state.craftingScrollIndex + 1);
    }

    // Craft selected recipe
    if (_justPressed("Enter") || _justPressed("Space")) {
      const selected = recipes[state.craftingScrollIndex];
      if (selected && selected.canCraft) {
        const item = craft(state, selected.recipe.id);
        if (item) {
          this._hud.showNotification(`Crafted: ${item.name}!`, item.color);
        }
      } else {
        this._hud.showNotification("Missing materials!", 0xff4444);
      }
    }

    // Disenchant mode (Tab to switch, number keys to disenchant)
    if (_justPressed("Tab")) {
      // Toggle to disenchant mode — handled by HUD display state
    }
  }

  // -------------------------------------------------------------------------
  // Enchanting screen
  // -------------------------------------------------------------------------
  private _handleEnchanting(): void {
    if (_justPressed("Escape") || _justPressed("KeyE")) {
      this._state.phase = this._state.prevPhase;
      return;
    }

    const state = this._state;
    const p = state.player;

    // Number keys to select inventory item, then enchantment
    for (let i = 0; i < 10; i++) {
      if (_justPressed(i < 9 ? `Digit${i + 1}` : "Digit0")) {
        if (i < p.inventory.length) {
          const item = p.inventory[i];
          const enchantments = getApplicableEnchantments(item.def);
          if (enchantments.length > 0) {
            // Apply first available enchantment
            const enchIdx = state.enchantingScrollIndex % enchantments.length;
            const ench = enchantments[enchIdx];
            if (canEnchant(state, i, ench.id)) {
              const result = enchantItem(state, i, ench.id);
              if (result.success) {
                this._hud.showNotification(`${ench.name} +${result.level}!`, ench.color);
                recalcStats(state);
              } else if (result.destroyed) {
                this._hud.showNotification("Item destroyed!", 0xff0000, 3);
                this._renderer.shake(10, 0.3);
              } else {
                this._hud.showNotification("Enchantment failed!", 0xff4444);
              }
            } else {
              this._hud.showNotification("Missing materials!", 0xff4444);
            }
          }
        }
      }
    }

    // Scroll enchantment selection
    if (_justPressed("ArrowLeft") || _justPressed("KeyA")) {
      state.enchantingScrollIndex = Math.max(0, state.enchantingScrollIndex - 1);
    }
    if (_justPressed("ArrowRight") || _justPressed("KeyD")) {
      state.enchantingScrollIndex = (state.enchantingScrollIndex + 1);
    }
  }

  // -------------------------------------------------------------------------
  // Puzzle room
  // -------------------------------------------------------------------------
  private _handlePuzzle(dt: number): void {
    if (_justPressed("Escape")) {
      this._state.phase = this._state.prevPhase;
      return;
    }

    const puzzle = this._state.activePuzzle;
    if (!puzzle || puzzle.solved) {
      this._state.phase = this._state.prevPhase;
      return;
    }

    // Timer countdown
    if (puzzle.timeRemaining !== undefined) {
      puzzle.timeRemaining -= dt;
      if (puzzle.timeRemaining <= 0) {
        this._hud.showNotification("Time's up! Puzzle failed.", 0xff4444, 2);
        this._state.phase = this._state.prevPhase;
        return;
      }
    }

    // Riddle puzzles: number keys for answer choices
    if (puzzle.puzzleType === "riddle") {
      for (let i = 0; i < 4; i++) {
        if (_justPressed(`Digit${i + 1}`)) {
          // Correct answer is always option (difficulty % 4 + 1)
          const correctAnswer = (puzzle.difficulty % 4);
          if (i === correctAnswer) {
            puzzle.solved = true;
            this._hud.showNotification("Riddle solved!", 0xffd700, 2);
            this._grantPuzzleReward(this._state);
          } else {
            this._hud.showNotification("Wrong answer!", 0xff4444);
            // Damage for wrong answer
            this._state.player.hp -= 10 * puzzle.difficulty;
          }
          this._state.phase = this._state.prevPhase;
          return;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Artifact Lore viewing
  // -------------------------------------------------------------------------
  private _handleArtifactLore(): void {
    if (_justPressed("Escape") || _justPressed("KeyL")) {
      this._state.phase = this._state.prevPhase;
      return;
    }

    // Navigate through artifacts
    const arts = this._state.artifacts.filter(a => a.found);
    if (arts.length === 0) {
      this._state.phase = this._state.prevPhase;
      return;
    }

    if (_justPressed("ArrowRight") || _justPressed("KeyD")) {
      const idx = arts.findIndex(a => a.id === this._state.artifactLoreViewing);
      this._state.artifactLoreViewing = arts[(idx + 1) % arts.length].id;
    }
    if (_justPressed("ArrowLeft") || _justPressed("KeyA")) {
      const idx = arts.findIndex(a => a.id === this._state.artifactLoreViewing);
      this._state.artifactLoreViewing = arts[(idx - 1 + arts.length) % arts.length].id;
    }
  }

  // -------------------------------------------------------------------------
  // Grant puzzle rewards
  // -------------------------------------------------------------------------
  private _grantPuzzleReward(state: GrailGameState): void {
    const puzzle = state.activePuzzle ?? state.floor.puzzleRooms.find(p => p.solved);
    if (!puzzle) return;

    // Reward materials based on difficulty
    const matCount = puzzle.difficulty + 1;
    // @ts-ignore - dynamic require for lazy loading
    const { addMaterial: addMat, rollMaterialDrop } = require("./systems/GameCraftingSystem");
    for (let i = 0; i < matCount; i++) {
      const drop = rollMaterialDrop(state.currentFloor, "", 1.0);
      if (drop) addMat(state, drop.matId, drop.quantity);
    }

    // Bonus gold
    state.player.gold += 20 * puzzle.difficulty;
    state.totalGold += 20 * puzzle.difficulty;

    // XP bonus
    const xpBonus = 15 * puzzle.difficulty;
    gainXP(state, xpBonus);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  private _render(sw: number, sh: number, dt: number): void {
    const state = this._state;
    this._renderer.updateShake(dt);

    if (state.phase !== GamePhase.GENRE_SELECT && state.phase !== GamePhase.KNIGHT_SELECT) {
      this._renderer.draw(state, sw, sh);
    }

    this._hud.update(state, sw, sh, dt, this._showingHelp, this._floorTransitionTimer);
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------
  private _showPauseMenu(): void {
    this._paused = true;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.82 });
    bg.eventMode = "static";
    c.addChild(bg);

    const pw = 420, ph = 340, px = (sw - pw) / 2, py = (sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x12100a, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: 0xddbb44, width: 2, alpha: 0.5 });
    panel.roundRect(px + 4, py + 4, pw - 8, ph - 8, 8).stroke({ color: 0xddbb44, width: 0.5, alpha: 0.15 });
    c.addChild(panel);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0);
      t.position.set(x, y);
      c.addChild(t);
    };
    addText("PAUSED", sw / 2, py + 16, { fontSize: 22, fill: 0xddbb44, fontWeight: "bold", letterSpacing: 4 }, true);

    const contentContainer = new Container();
    c.addChild(contentContainer);
    const clearContent = () => { while (contentContainer.children.length > 0) { const ch = contentContainer.removeChildAt(0); ch.destroy(); } };

    const showButtons = () => {
      clearContent();
      const makeBtn = (label: string, y: number, color: number, cb: () => void) => {
        const btn = new Graphics();
        btn.roundRect(sw / 2 - 100, y, 200, 36, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
        btn.roundRect(sw / 2 - 100, y, 200, 36, 5).stroke({ color, width: 1.5, alpha: 0.6 });
        btn.eventMode = "static"; btn.cursor = "pointer";
        btn.on("pointerdown", cb);
        contentContainer.addChild(btn);
        const t = new Text({ text: label, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 13, fill: color, fontWeight: "bold", letterSpacing: 1 } as any) });
        t.anchor.set(0.5, 0.5); t.position.set(sw / 2, y + 18);
        contentContainer.addChild(t);
      };
      makeBtn("RESUME", py + 70, 0x44cc66, () => this._hidePauseMenu());
      makeBtn("CONTROLS", py + 120, 0xccaa44, () => {
        clearContent();
        const t = new Text({ text: "WASD: Move\nSpace: Attack\nE: Interact / Shop\nI: Inventory\nQ: Use ability\nEsc: Pause", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 13, fill: 0xccccaa, align: "center", lineHeight: 22 } as any) });
        t.anchor.set(0.5, 0); t.position.set(sw / 2, py + 70);
        contentContainer.addChild(t);
        makeBackBtn();
      });
      makeBtn("INSTRUCTIONS", py + 170, 0xccaa44, () => {
        clearContent();
        const t = new Text({ text: "Quest for the Grail \u2014 Arthurian roguelike.\nDescend through dungeon floors fighting creatures.\nFind holy relics and defeat Arthurian villains.\nChoose your Knight and quest wisely.\nPermadeath with meta-progression.", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 12, fill: 0xccccaa, align: "center", wordWrap: true, wordWrapWidth: 380, lineHeight: 20 } as any) });
        t.anchor.set(0.5, 0); t.position.set(sw / 2, py + 70);
        contentContainer.addChild(t);
        makeBackBtn();
      });
      makeBtn("MAIN MENU", py + 250, 0xcc4444, () => {
        this._hidePauseMenu();
        this.destroy();
        window.dispatchEvent(new Event("gameExit"));
      });
    };

    const makeBackBtn = () => {
      const btn = new Graphics();
      btn.roundRect(sw / 2 - 60, py + ph - 60, 120, 32, 4).fill({ color: 0x0a0a0a, alpha: 0.8 });
      btn.roundRect(sw / 2 - 60, py + ph - 60, 120, 32, 4).stroke({ color: 0x888866, width: 1, alpha: 0.5 });
      btn.eventMode = "static"; btn.cursor = "pointer";
      btn.on("pointerdown", () => showButtons());
      contentContainer.addChild(btn);
      const t = new Text({ text: "BACK", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: 0x888888, fontWeight: "bold" } as any) });
      t.anchor.set(0.5, 0.5); t.position.set(sw / 2, py + ph - 44);
      contentContainer.addChild(t);
    };

    showButtons();
    this._pauseMenu = c;
    viewManager.addToLayer("ui", c);
  }

  private _hidePauseMenu(): void {
    this._paused = false;
    if (this._pauseMenu) {
      viewManager.removeFromLayer("ui", this._pauseMenu);
      this._pauseMenu.destroy({ children: true });
      this._pauseMenu = null;
    }
  }

  private _cleanup(): void {
    window.removeEventListener("keydown", _onKeyDown);
    window.removeEventListener("keyup", _onKeyUp);
    // Clear all keys
    for (const k in _keys) _keys[k] = false;
    for (const k in _pressed) _pressed[k] = false;

    // Re-enable ViewManager camera for other modes
    viewManager.camera.keyboardEnabled = true;
    viewManager.camera.manualControlMode = false;

    GameCombatSystem.reset();

    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }

    this._renderer.cleanup();
    this._hud.cleanup();
    viewManager.removeFromLayer("ui", this._hud.container);
    viewManager.clearWorld();
  }

  // -------------------------------------------------------------------------
  // Destroy (called from main.ts)
  // -------------------------------------------------------------------------
  destroy(): void {
    this._cleanup();
  }
}
