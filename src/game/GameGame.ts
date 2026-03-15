// ---------------------------------------------------------------------------
// Quest for the Grail — Main Game Orchestrator
// Arthurian roguelike dungeon crawler. Player picks a genre/quest type,
// then a Knight of the Round Table, and descends through procedurally
// generated dungeon floors fighting mythological creatures, finding holy
// relics, and battling Arthurian villains. Permadeath with meta-progression.
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

import {
  GameBalance, QUEST_GENRE_DEFS, KNIGHT_DEFS, TileType, getFloorParams,
} from "./config/GameConfig";


import {
  GamePhase, Direction,
  createGrailGameState, createPlayerState,
  unlockKnight,
} from "./state/GameState";
import type { GrailGameState } from "./state/GameState";

import { generateFloor, revealAround } from "./systems/GameDungeonGenerator";
import { GameCombatSystem } from "./systems/GameCombatSystem";

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

      case GamePhase.PAUSED:
        this._handlePaused();
        break;

      case GamePhase.GAME_OVER:
      case GamePhase.VICTORY:
        this._handleEndScreen();
        break;

      case GamePhase.FLOOR_TRANSITION:
        // Brief pause handled by timer
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
        this._state.phase = GamePhase.KNIGHT_SELECT;
        return;
      }
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
    const params = getFloorParams(floorNum, state.totalFloors);
    const floor = generateFloor(floorNum, params, state.genre!, state.enemyIdCounter);
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

    // Movement (WASD)
    const speed = GameBalance.PLAYER_MOVE_SPEED * dt;
    let dx = 0, dy = 0;
    if (_isDown("KeyW")) { dy = -1; p.facing = Direction.UP; }
    if (_isDown("KeyS")) { dy = 1; p.facing = Direction.DOWN; }
    if (_isDown("KeyA")) { dx = -1; p.facing = Direction.LEFT; }
    if (_isDown("KeyD")) { dx = 1; p.facing = Direction.RIGHT; }

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

    // Attack (space)
    if (_isDown("Space")) {
      GameCombatSystem.playerAttack(state);
    }

    // Ability (Q)
    if (_justPressed("KeyQ")) {
      GameCombatSystem.playerAbility(state);
    }

    // Interact (E) — treasure and stairs
    if (_justPressed("KeyE")) {
      const pc = Math.floor(p.x / GameBalance.TILE_SIZE);
      const pr = Math.floor(p.y / GameBalance.TILE_SIZE);

      // Treasure
      if (GameCombatSystem.checkTreasure(state)) {
        GameCombatSystem.pickupTreasure(state, pc, pr);
      }

      // Stairs
      if (GameCombatSystem.checkStairs(state)) {
        if (state.currentFloor >= state.totalFloors - 1) {
          // Victory!
          state.phase = GamePhase.VICTORY;
          this._handleVictoryUnlocks();
        } else {
          this._startFloor(state.currentFloor + 1);
        }
      }
    }

    // Cooldowns
    if (p.attackCooldown > 0) p.attackCooldown -= dt * 1000;
    if (p.abilityCooldownMs > 0) p.abilityCooldownMs -= dt * 1000;

    // Decrease ability cooldown over time (represents turns passing)
    // Each second of real play counts as roughly 1 turn
    if (p.abilityCooldown > 0) {
      p.abilityCooldown -= dt * 0.5;
      if (p.abilityCooldown < 0) p.abilityCooldown = 0;
    }

    // Status effect ticks
    for (let i = p.statusEffects.length - 1; i >= 0; i--) {
      p.statusEffects[i].turnsRemaining -= dt;
      if (p.statusEffects[i].turnsRemaining <= 0) {
        p.statusEffects.splice(i, 1);
      }
    }

    // Enemy AI
    GameCombatSystem.updateEnemies(state, dt);

    // Traps
    GameCombatSystem.checkTraps(state);

    // Check death
    if (p.hp <= 0) {
      state.phase = GamePhase.GAME_OVER;
    }

    // ESC to exit
    if (_justPressed("Escape")) {
      window.dispatchEvent(new Event("gameExit"));
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
    for (let i = 0; i < 9; i++) {
      if (_justPressed(`Digit${i + 1}`)) {
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
  // Paused
  // -------------------------------------------------------------------------
  private _handlePaused(): void {
    if (_justPressed("KeyP")) {
      this._state.phase = this._state.prevPhase;
    }
    if (_justPressed("Escape")) {
      window.dispatchEvent(new Event("gameExit"));
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
  // Render
  // -------------------------------------------------------------------------
  private _render(sw: number, sh: number, dt: number): void {
    const state = this._state;
    this._renderer.updateShake(dt);

    if (state.phase !== GamePhase.GENRE_SELECT && state.phase !== GamePhase.KNIGHT_SELECT) {
      this._renderer.draw(state, sw, sh);
    }

    this._hud.update(state, sw, sh, dt);
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------
  private _cleanup(): void {
    window.removeEventListener("keydown", _onKeyDown);
    window.removeEventListener("keyup", _onKeyUp);
    // Clear all keys
    for (const k in _keys) _keys[k] = false;
    for (const k in _pressed) _pressed[k] = false;

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
