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
  SHOP_ITEMS, ITEM_DEFS,
} from "./config/GameConfig";


import {
  GamePhase, Direction,
  createGrailGameState, createPlayerState,
  unlockKnight, updateRunStatsOnEnd,
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
  private _floorTransitionTimer = 0;

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

    // Interact (E) — treasure, stairs, shop, shrine
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

      // Stairs
      if (GameCombatSystem.checkStairs(state)) {
        if (state.currentFloor >= state.totalFloors - 1) {
          state.phase = GamePhase.VICTORY;
          this._handleVictoryUnlocks();
        } else {
          state.phase = GamePhase.FLOOR_TRANSITION;
          this._floorTransitionTimer = 2.0; // 2 second pause between floors
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

    // Environmental hazards
    GameCombatSystem.checkEnvironmentalHazards(state, dt);

    // Reanimation processing (Crimson Crypts)
    GameCombatSystem.processReanimations(state, dt);

    // Ability VFX timer
    if (state.activeAbilityVfx) {
      state.activeAbilityVfx.timer -= dt;
      if (state.activeAbilityVfx.timer <= 0) {
        state.activeAbilityVfx = null;
      }
    }

    // Abyssal Halls: reduce visibility radius over time
    // (handled by renderer based on floor.darknessTimer)

    // Check death
    if (p.hp <= 0) {
      state.phase = GamePhase.GAME_OVER;
      updateRunStatsOnEnd(state, false);
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
    if (_justPressed("KeyP")) {
      this._state.phase = this._state.prevPhase;
    }
    if (_justPressed("Escape")) {
      window.dispatchEvent(new Event("gameExit"));
    }
  }

  // -------------------------------------------------------------------------
  // Floor transition (brief pause between floors with stats)
  // -------------------------------------------------------------------------
  private _handleFloorTransition(dt: number): void {
    this._floorTransitionTimer -= dt;
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
