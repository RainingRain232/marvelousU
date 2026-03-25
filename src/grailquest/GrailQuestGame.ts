// ---------------------------------------------------------------------------
// Grail Quest — Main Game Orchestrator
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { GrailPhase } from "./types";
import type { GrailState, GrailMeta } from "./types";
import { loadGrailMeta, saveGrailMeta, createGrailState } from "./state/GrailState";
import { generateFloor } from "./systems/DungeonGenerator";
import { computeFOV } from "./systems/FOVSystem";
import {
  tryMovePlayer, waitTurn, useItem, interactTile,
  applyLevelUpChoice, calculateShards, addMessage,
} from "./systems/GrailGameSystem";
import { GrailRenderer } from "./view/GrailRenderer";
import {
  playGrailDeath, playGrailVictory,
  startGrailDrone, stopGrailDrone,
  playGrailAutoExplore, updateGrailAudio,
} from "./systems/GrailAudio";
import { GRAIL_BALANCE as GB } from "./config/GrailBalance";
import { TileType } from "./types";

// ---------------------------------------------------------------------------
// Game class
// ---------------------------------------------------------------------------

export class GrailQuestGame {
  private _state: GrailState | null = null;
  private _meta: GrailMeta = loadGrailMeta();
  private _renderer = new GrailRenderer();
  private _tickerFn: ((ticker: Ticker) => void) | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _clickHandler: ((e: MouseEvent) => void) | null = null;

  // Animation system
  private _animating = false;
  private _animTimer: ReturnType<typeof setTimeout> | null = null;

  // UI toggles
  private _showCharStats = false;
  private _showMinimapFull = false;

  // Death replay
  private _deathReplayTimer: ReturnType<typeof setTimeout> | null = null;

  // -----------------------------------------------------------------------
  // Boot
  // -----------------------------------------------------------------------

  async boot(): Promise<void> {
    viewManager.clearWorld();
    viewManager.camera.zoom = 1;
    viewManager.camera.keyboardEnabled = false;
    viewManager.camera.manualControlMode = true;

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    this._meta = loadGrailMeta();
    this._state = createGrailState(this._meta);
    this._state.phase = GrailPhase.START;

    this._renderer.build(sw, sh);
    viewManager.addToLayer("background", this._renderer.container);

    this._initInput();

    this._tickerFn = (ticker: Ticker) => this._loop(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerFn);
  }

  // -----------------------------------------------------------------------
  // Destroy
  // -----------------------------------------------------------------------

  destroy(): void {
    if (this._tickerFn) {
      viewManager.app.ticker.remove(this._tickerFn);
      this._tickerFn = null;
    }
    if (this._keyHandler) {
      window.removeEventListener("keydown", this._keyHandler);
      this._keyHandler = null;
    }
    if (this._clickHandler) {
      viewManager.app.canvas.removeEventListener("click", this._clickHandler);
      this._clickHandler = null;
    }
    if (this._animTimer) { clearTimeout(this._animTimer); this._animTimer = null; }
    if (this._deathReplayTimer) { clearTimeout(this._deathReplayTimer); this._deathReplayTimer = null; }
    this._renderer.destroy();
    viewManager.removeFromLayer("background", this._renderer.container);
    viewManager.camera.keyboardEnabled = true;
    viewManager.camera.manualControlMode = false;
    viewManager.clearWorld();
    stopGrailDrone();
  }

  // -----------------------------------------------------------------------
  // Input
  // -----------------------------------------------------------------------

  private _initInput(): void {
    this._keyHandler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const s = this._state;
      if (!s) return;

      // Block input while animating
      if (this._animating) return;

      // ---- START ----
      if (s.phase === GrailPhase.START) {
        if (e.code === "Enter" || e.code === "Space") {
          this._startNewGame();
          e.preventDefault();
        } else if (e.code === "Escape") {
          this._exit();
          e.preventDefault();
        }
        return;
      }

      // ---- PLAYING ----
      if (s.phase === GrailPhase.PLAYING) {
        let dx = 0, dy = 0;
        switch (e.code) {
          case "ArrowUp": case "KeyW": dy = -1; break;
          case "ArrowDown": case "KeyS": dy = 1; break;
          case "ArrowLeft": case "KeyA": dx = -1; break;
          case "ArrowRight": case "KeyD": dx = 1; break;
          case "Space":
            this._doAnimatedAction(() => {
              waitTurn(s);
              this._checkDeath();
            });
            e.preventDefault();
            return;
          case "KeyE":
            this._doAnimatedAction(() => {
              interactTile(s);
              this._checkVictory();
              this._checkDeath();
            });
            e.preventDefault();
            return;
          case "KeyX":
            // Toggle auto-explore
            if ("autoExploring" in s) {
              s.autoExploring = !s.autoExploring;
              if (s.autoExploring) {
                playGrailAutoExplore();
                addMessage(s, "Auto-exploring...", GB.COLOR_MESSAGE_DEFAULT);
              } else {
                addMessage(s, "Stopped exploring.", GB.COLOR_MESSAGE_DEFAULT);
              }
            }
            e.preventDefault();
            return;
          case "KeyC":
            // Toggle character stats overlay
            this._showCharStats = !this._showCharStats;
            if (this._state) {
              (this._state as any)._showCharStats = this._showCharStats;
            }
            e.preventDefault();
            return;
          case "KeyM":
            // Toggle minimap fullscreen
            this._showMinimapFull = !this._showMinimapFull;
            if (this._state) {
              (this._state as any)._showMinimapFull = this._showMinimapFull;
            }
            e.preventDefault();
            return;
          case "Tab":
            s.phase = GrailPhase.INVENTORY;
            e.preventDefault();
            return;
          case "Escape":
            s.autoExploring = false;
            s.phase = GrailPhase.PAUSED;
            e.preventDefault();
            return;
          case "Digit1": useItem(s, 0); this._checkDeath(); e.preventDefault(); return;
          case "Digit2": useItem(s, 1); this._checkDeath(); e.preventDefault(); return;
          case "Digit3": useItem(s, 2); this._checkDeath(); e.preventDefault(); return;
          case "Digit4": useItem(s, 3); this._checkDeath(); e.preventDefault(); return;
          case "Digit5": useItem(s, 4); this._checkDeath(); e.preventDefault(); return;
          case "Digit6": useItem(s, 5); this._checkDeath(); e.preventDefault(); return;
          default: return;
        }
        if (dx !== 0 || dy !== 0) {
          s.autoExploring = false; // cancel auto-explore on manual move
          this._doAnimatedAction(() => {
            tryMovePlayer(s, dx, dy);
            this._checkVictory();
            this._checkDeath();
          });
          e.preventDefault();
        }
        return;
      }

      // ---- INVENTORY ----
      if (s.phase === GrailPhase.INVENTORY) {
        if (e.code === "Tab" || e.code === "Escape") {
          s.phase = GrailPhase.PLAYING;
          e.preventDefault();
        } else if (e.code >= "Digit1" && e.code <= "Digit6") {
          const slot = parseInt(e.code.charAt(5)) - 1;
          useItem(s, slot);
          this._checkDeath();
          e.preventDefault();
        }
        return;
      }

      // ---- LEVEL_UP ----
      if (s.phase === GrailPhase.LEVEL_UP) {
        if (e.code === "Digit1") { applyLevelUpChoice(s, 0); e.preventDefault(); }
        else if (e.code === "Digit2") { applyLevelUpChoice(s, 1); e.preventDefault(); }
        else if (e.code === "Digit3") { applyLevelUpChoice(s, 2); e.preventDefault(); }
        return;
      }

      // ---- DEAD ----
      if (s.phase === GrailPhase.DEAD) {
        if (e.code >= "Digit1" && e.code <= "Digit6") {
          this._tryUpgrade(parseInt(e.code.charAt(5)) - 1);
          e.preventDefault();
          return;
        }
        if (e.code === "Enter" || e.code === "Space") {
          this._startNewGame();
          e.preventDefault();
        } else if (e.code === "Escape") {
          this._exit();
          e.preventDefault();
        }
        return;
      }

      // ---- VICTORY ----
      if (s.phase === GrailPhase.VICTORY) {
        if (e.code === "Enter" || e.code === "Space") {
          this._startNewGame();
          e.preventDefault();
        } else if (e.code === "Escape") {
          this._exit();
          e.preventDefault();
        }
        return;
      }

      // ---- PAUSED ----
      if (s.phase === GrailPhase.PAUSED) {
        if (e.code === "Escape") {
          s.phase = GrailPhase.PLAYING;
          e.preventDefault();
        } else if (e.code === "KeyQ") {
          this._exit();
          e.preventDefault();
        }
        return;
      }
    };
    window.addEventListener("keydown", this._keyHandler);

    // ---- Mouse/click support ----
    this._clickHandler = (e: MouseEvent) => {
      const s = this._state;
      if (!s || s.phase !== GrailPhase.PLAYING || this._animating) return;

      // Convert screen coordinates to tile coordinates
      const canvas = viewManager.app.canvas;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const screenX = (e.clientX - rect.left) * scaleX;
      const screenY = (e.clientY - rect.top) * scaleY;

      // Use renderer camera to convert to world space
      const camX = this._renderer.camX;
      const camY = this._renderer.camY;
      const cs = GB.CELL_SIZE;
      const tileX = Math.floor((screenX + camX) / cs);
      const tileY = Math.floor((screenY + camY) / cs);

      // Must be adjacent (including diagonals) to the player
      const dx = tileX - s.playerX;
      const dy = tileY - s.playerY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return;
      if (dx === 0 && dy === 0) return; // clicking on self does nothing

      s.autoExploring = false;
      this._doAnimatedAction(() => {
        tryMovePlayer(s, dx, dy);
        this._checkVictory();
        this._checkDeath();
      });
    };
    viewManager.app.canvas.addEventListener("click", this._clickHandler);
  }

  // -----------------------------------------------------------------------
  // Animated action — brief delay so player sees their move before enemies
  // -----------------------------------------------------------------------

  private _doAnimatedAction(action: () => void): void {
    if (this._animating) return;
    this._animating = true;
    if (this._state) this._state.turnAnimating = true;

    // Execute the player action immediately (so it renders)
    action();

    // Brief pause before unlocking input (lets player see their move)
    this._animTimer = setTimeout(() => {
      this._animating = false;
      if (this._state) this._state.turnAnimating = false;
      this._animTimer = null;
    }, 150);
  }

  // -----------------------------------------------------------------------
  // Auto-explore step — find nearest unexplored tile and move toward it
  // -----------------------------------------------------------------------

  private _autoExploreStep(): void {
    const s = this._state;
    if (!s || s.phase !== GrailPhase.PLAYING || !s.autoExploring || this._animating) return;

    // Stop auto-explore if any enemy is visible
    for (const e of s.entities) {
      if (e.alive && s.visible[e.y]?.[e.x]) {
        s.autoExploring = false;
        addMessage(s, "Enemy spotted! Stopped exploring.", GB.COLOR_MESSAGE_DEFAULT);
        return;
      }
    }

    // BFS to find nearest unexplored but reachable tile
    const cols = s.dungeon.cols;
    const rows = s.dungeon.rows;
    const visited: boolean[][] = [];
    for (let y = 0; y < rows; y++) {
      visited[y] = [];
      for (let x = 0; x < cols; x++) visited[y][x] = false;
    }

    interface BfsNode { x: number; y: number; firstDx: number; firstDy: number; }
    const queue: BfsNode[] = [];
    visited[s.playerY][s.playerX] = true;

    // Seed BFS with adjacent walkable tiles
    const dirs = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    ];
    for (const d of dirs) {
      const nx = s.playerX + d.dx;
      const ny = s.playerY + d.dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const tile = s.dungeon.tiles[ny][nx];
      if (tile === TileType.WALL) continue;
      visited[ny][nx] = true;
      queue.push({ x: nx, y: ny, firstDx: d.dx, firstDy: d.dy });
    }

    while (queue.length > 0) {
      const node = queue.shift()!;
      // Is this tile unexplored? If so, move toward it
      if (!s.explored[node.y][node.x]) {
        this._doAnimatedAction(() => {
          tryMovePlayer(s, node.firstDx, node.firstDy);
          this._checkVictory();
          this._checkDeath();
        });
        return;
      }

      for (const d of dirs) {
        const nx = node.x + d.dx;
        const ny = node.y + d.dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (visited[ny][nx]) continue;
        const tile = s.dungeon.tiles[ny][nx];
        if (tile === TileType.WALL) continue;
        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny, firstDx: node.firstDx, firstDy: node.firstDy });
      }
    }

    // Nothing left to explore
    s.autoExploring = false;
    addMessage(s, "Nothing more to explore on this floor.", GB.COLOR_MESSAGE_DEFAULT);
  }

  // -----------------------------------------------------------------------
  // Start a new game
  // -----------------------------------------------------------------------

  private _startNewGame(): void {
    this._meta = loadGrailMeta();
    this._state = createGrailState(this._meta);

    // Generate floor 1
    const { dungeon, entities } = generateFloor(1, GB.COLS, GB.ROWS);
    this._state.dungeon = dungeon;
    this._state.entities = entities;
    this._state.playerX = dungeon.spawnX;
    this._state.playerY = dungeon.spawnY;

    // Reset visibility grids to match new dungeon
    const cols = dungeon.cols;
    const rows = dungeon.rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this._state.visible[y][x] = false;
        this._state.explored[y][x] = false;
      }
    }

    // Compute initial FOV
    computeFOV(this._state);

    this._state.phase = GrailPhase.PLAYING;
    startGrailDrone();

    addMessage(this._state, "You descend into the dungeon. Find the Holy Grail!", GB.COLOR_MESSAGE_DEFAULT);
  }

  // -----------------------------------------------------------------------
  // Main loop
  // -----------------------------------------------------------------------

  private _autoExploreAccum = 0;

  private _loop(rawDt: number): void {
    if (!this._state) return;
    const dt = Math.min(rawDt, 0.1);
    const s = this._state;

    // Update visual timers
    // Particles
    for (const p of s.particles) {
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    s.particles = s.particles.filter((p) => p.life > 0);

    // Float texts
    for (const ft of s.floatTexts) {
      ft.timer -= dt;
    }
    s.floatTexts = s.floatTexts.filter((ft) => ft.timer > 0);

    // Screen shake decay
    if (s.screenShake > 0) {
      s.screenShake = Math.max(0, s.screenShake - dt);
    }

    // Screen flash decay
    if (s.screenFlash > 0) {
      s.screenFlash = Math.max(0, s.screenFlash - dt * 10);
    }

    // Animation timer
    s.animTimer += dt;

    // Auto-explore tick — step every 200ms while active
    if (s.autoExploring && s.phase === GrailPhase.PLAYING && !this._animating) {
      this._autoExploreAccum += dt;
      if (this._autoExploreAccum >= 0.2) {
        this._autoExploreAccum = 0;
        this._autoExploreStep();
      }
    } else {
      this._autoExploreAccum = 0;
    }

    // Dynamic audio — update drone based on game state
    if (s.phase === GrailPhase.PLAYING) {
      updateGrailAudio(s);
    }

    // Propagate UI toggles to state for renderer access
    (s as any)._showCharStats = this._showCharStats;
    (s as any)._showMinimapFull = this._showMinimapFull;

    // Render
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    this._renderer.render(s, sw, sh, this._meta);
  }

  // -----------------------------------------------------------------------
  // Death check
  // -----------------------------------------------------------------------

  private _checkDeath(): void {
    const s = this._state;
    if (!s) return;
    if (s.playerHp <= 0 && s.phase !== GrailPhase.DEAD) {
      this._die();
    }
  }

  private _die(): void {
    const s = this._state;
    if (!s || s.phase === GrailPhase.DEAD) return;

    // Death replay — highlight the killing blow with screen flash + shake
    s.screenFlash = 1.0;
    s.screenShake = 0.4;

    // Find the nearest alive enemy as the "killer" and mark it for highlight
    let killerEntity: { x: number; y: number } | null = null;
    let minDist = Infinity;
    for (const e of s.entities) {
      if (!e.alive) continue;
      const dist = Math.abs(e.x - s.playerX) + Math.abs(e.y - s.playerY);
      if (dist < minDist) {
        minDist = dist;
        killerEntity = { x: e.x, y: e.y };
      }
    }

    // Store killer position for renderer to highlight
    if (killerEntity) {
      (s as any)._deathKillerX = killerEntity.x;
      (s as any)._deathKillerY = killerEntity.y;
    }

    // Brief delay before showing death screen — let player see the killing blow
    this._animating = true;
    s.turnAnimating = true;

    this._deathReplayTimer = setTimeout(() => {
      this._animating = false;
      if (s) s.turnAnimating = false;

      const shards = calculateShards(s);
      const meta = loadGrailMeta();
      meta.totalRuns++;
      meta.totalKills += s.enemiesKilled;
      meta.totalFloors += s.floorsCleared;
      if (s.floor > meta.highScore) meta.highScore = s.floor;
      meta.shards += shards;
      saveGrailMeta(meta);
      this._meta = meta;

      s.phase = GrailPhase.DEAD;
      // Clear killer highlight
      delete (s as any)._deathKillerX;
      delete (s as any)._deathKillerY;

      stopGrailDrone();
      playGrailDeath();
      this._deathReplayTimer = null;
    }, 500);
  }

  // -----------------------------------------------------------------------
  // Victory check
  // -----------------------------------------------------------------------

  private _checkVictory(): void {
    const s = this._state;
    if (!s) return;
    if (s.floor > GB.MAX_FLOORS && s.phase === GrailPhase.PLAYING) {
      this._victory();
    }
    // Also check if interactTile set phase to VICTORY
    if (s.phase === GrailPhase.VICTORY) {
      this._onVictoryPhase();
    }
  }

  private _victory(): void {
    const s = this._state;
    if (!s) return;
    s.phase = GrailPhase.VICTORY;
    this._onVictoryPhase();
  }

  private _onVictoryPhase(): void {
    const s = this._state;
    if (!s) return;

    const shards = calculateShards(s) + GB.SHARDS_GRAIL_BONUS;
    const meta = loadGrailMeta();
    meta.totalRuns++;
    meta.totalKills += s.enemiesKilled;
    meta.totalFloors += s.floorsCleared;
    meta.grailsFound++;
    if (s.floor > meta.highScore) meta.highScore = s.floor;
    meta.shards += shards;
    saveGrailMeta(meta);
    this._meta = meta;

    stopGrailDrone();
    playGrailVictory();
  }

  // -----------------------------------------------------------------------
  // Upgrades
  // -----------------------------------------------------------------------

  private _tryUpgrade(index: number): void {
    const meta = this._meta;
    if (!meta.upgrades) return;
    const keys = ["sturdierStart", "sharperBlade", "trapSense", "luckyFind", "deepPockets", "squireBlessing"] as const;
    type UpKey = typeof keys[number];
    const key: UpKey | undefined = keys[index];
    if (!key) return;
    const costTable = GB.UPGRADE_COSTS as Record<string, number[]>;
    const costs = costTable[key];
    if (!costs) return;
    const currentLevel = meta.upgrades[key];
    if (currentLevel >= costs.length) return;
    const cost = costs[currentLevel];
    if (meta.shards < cost) return;
    meta.shards -= cost;
    meta.upgrades[key] = currentLevel + 1;
    saveGrailMeta(meta);
  }

  // -----------------------------------------------------------------------
  // Exit
  // -----------------------------------------------------------------------

  private _exit(): void {
    stopGrailDrone();
    window.dispatchEvent(new Event("grailquestExit"));
  }
}
