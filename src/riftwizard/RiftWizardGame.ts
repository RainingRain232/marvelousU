// ---------------------------------------------------------------------------
// Rift Wizard mode orchestrator — boot, game loop, cleanup
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import {
  createRiftWizardState,
  RWPhase,
  type RiftWizardState,
} from "./state/RiftWizardState";
import { generateLevel, getNextEntityId } from "./systems/RiftWizardLevelGenerator";
import {
  tryMoveWizard,
  tryInteract,
  useConsumable,
  executeTurn,
  advanceToNextLevel,
} from "./systems/RiftWizardTurnSystem";
import { castSpell, canCastSpell, createSpellInstance } from "./systems/RiftWizardCombatSystem";
import { RWBalance } from "./config/RiftWizardConfig";
import { RiftWizardRenderer } from "./view/RiftWizardRenderer";
import { RiftWizardHUD } from "./view/RiftWizardHUD";
import { RiftWizardSpellSelectUI } from "./view/RiftWizardSpellSelectUI";

// ---------------------------------------------------------------------------
// Input tracking
// ---------------------------------------------------------------------------

const _keys: Record<string, boolean> = {};
const _justPressed: Record<string, boolean> = {};

// Mouse tracking
let _mouseClicked = false;
let _mouseX = 0;
let _mouseY = 0;

function _onKeyDown(e: KeyboardEvent): void {
  if (!_keys[e.key]) {
    _justPressed[e.key] = true;
  }
  _keys[e.key] = true;
}

function _onKeyUp(e: KeyboardEvent): void {
  _keys[e.key] = false;
}

function consumeJustPressed(key: string): boolean {
  if (_justPressed[key]) {
    _justPressed[key] = false;
    return true;
  }
  return false;
}

function clearJustPressed(): void {
  for (const k in _justPressed) {
    _justPressed[k] = false;
  }
  _mouseClicked = false;
}

// ---------------------------------------------------------------------------
// RiftWizardGame
// ---------------------------------------------------------------------------

export class RiftWizardGame {
  private _state!: RiftWizardState;
  private _undoSnapshot: string | null = null;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;

  private _renderer = new RiftWizardRenderer();
  private _hud = new RiftWizardHUD();
  private _spellShopUI = new RiftWizardSpellSelectUI();
  private _keyDownHandler = _onKeyDown;
  private _keyUpHandler = _onKeyUp;
  private _mouseDownHandler = (e: MouseEvent) => {
    if (e.button === 0) {
      _mouseClicked = true;
      _mouseX = e.clientX;
      _mouseY = e.clientY;
    }
  };
  private _mouseMoveHandler = (e: MouseEvent) => {
    _mouseX = e.clientX;
    _mouseY = e.clientY;
  };

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------

  async boot(): Promise<void> {
    viewManager.clearWorld();

    // Initialize state
    this._state = createRiftWizardState();

    // Give the wizard 2 starting spells
    this._state.spells.push(createSpellInstance("magic_missile"));
    this._state.spells.push(createSpellInstance("fireball"));
    this._state.skillPoints = 5; // starting SP for first shop visit

    // Generate first level
    this._state.level = generateLevel(0, this._state.nextEntityId);
    this._state.nextEntityId = getNextEntityId();
    this._state.wizard.col = this._state.level.entrancePos.col;
    this._state.wizard.row = this._state.level.entrancePos.row;

    // Init renderer
    this._renderer.init();
    viewManager.addToLayer("units", this._renderer.worldLayer);

    // Disable default camera controls
    viewManager.camera.keyboardEnabled = false;
    viewManager.camera.manualControlMode = true;

    // Init HUD
    this._hud.build();
    this._hud.onPauseResume = () => {
      this._state.phase = RWPhase.PLAYING;
      this._hud.pauseSubMenu = "main";
    };
    this._hud.onPauseRestart = () => {
      this.destroy();
      this.boot();
    };
    this._hud.onPauseExit = () => {
      window.dispatchEvent(new Event("riftwizardExit"));
    };
    viewManager.addToLayer("ui", this._hud.container);

    // Init spell shop UI
    this._spellShopUI.build();
    this._spellShopUI.hide();
    this._spellShopUI.onConfirm = () => {
      this._spellShopUI.hide();
      advanceToNextLevel(this._state);
    };
    viewManager.addToLayer("ui", this._spellShopUI.container);

    // Input
    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
    const canvas = viewManager.app.canvas as HTMLCanvasElement;
    canvas.addEventListener("mousedown", this._mouseDownHandler);
    canvas.addEventListener("mousemove", this._mouseMoveHandler);

    // Start ticker
    this._tickerCb = (ticker: Ticker) => {
      this._update();
      this._render(ticker.deltaMS / 1000);
    };
    viewManager.app.ticker.add(this._tickerCb);
  }

  // -------------------------------------------------------------------------
  // Update (called every frame)
  // -------------------------------------------------------------------------

  private _update(): void {
    const state = this._state;

    // Process animation queue
    if (state.animationQueue.length > 0) {
      this._renderer.consumeAnimationQueue(state);
    }

    // Block input while animating
    if (this._renderer.isAnimating) {
      clearJustPressed();
      return;
    }

    // Help toggle — works from any phase
    if (consumeJustPressed("?")) {
      this._hud.toggleKeyReference();
      return;
    }

    switch (state.phase) {
      case RWPhase.PLAYING:
        this._handlePlaying();
        break;
      case RWPhase.PAUSED:
        this._handlePaused();
        break;
      case RWPhase.TARGETING:
        this._handleTargeting();
        break;
      case RWPhase.SPELL_SHOP:
        this._handleSpellShop();
        break;
      case RWPhase.VICTORY:
      case RWPhase.GAME_OVER:
        this._handleGameOver();
        break;
    }

    clearJustPressed();
  }

  // -------------------------------------------------------------------------
  // Mouse-to-grid conversion
  // -------------------------------------------------------------------------

  private _mouseToGrid(): { col: number; row: number } | null {
    const canvas = viewManager.app.canvas as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const wl = this._renderer.worldLayer;
    const col = Math.floor((_mouseX - rect.left - wl.x) / RWBalance.TILE_SIZE);
    const row = Math.floor((_mouseY - rect.top - wl.y) / RWBalance.TILE_SIZE);
    const level = this._state.level;
    if (col < 0 || col >= level.width || row < 0 || row >= level.height) return null;
    return { col, row };
  }

  // -------------------------------------------------------------------------
  // Phase handlers
  // -------------------------------------------------------------------------

  private _handlePaused(): void {
    if (consumeJustPressed("Escape")) {
      // If in a sub-menu, go back to main pause menu
      if (this._hud.pauseSubMenu !== "main") {
        this._hud.pauseSubMenu = "main";
        return;
      }
      // Otherwise resume the game
      this._state.phase = RWPhase.PLAYING;
      return;
    }

    // Delegate keyboard to buy sub-menu if active
    if (this._hud.pauseSubMenu === "buy") {
      for (const key of Object.keys(_justPressed)) {
        if (_justPressed[key]) {
          this._hud.handleBuyKey(this._state, key);
        }
      }
      // Mouse click support for buy sub-menu
      if (_mouseClicked) {
        const sw = viewManager.screenWidth;
        const sh = viewManager.screenHeight;
        this._hud.handleBuyClick(this._state, _mouseX, _mouseY, sw, sh);
      }
    }

    // Delegate keyboard to abilities sub-menu if active
    if (this._hud.pauseSubMenu === "abilities") {
      for (const key of Object.keys(_justPressed)) {
        if (_justPressed[key]) {
          this._hud.handleAbilitiesKey(this._state, key);
        }
      }
      // Mouse click support for abilities sub-menu
      if (_mouseClicked) {
        const sw = viewManager.screenWidth;
        const sh = viewManager.screenHeight;
        this._hud.handleAbilitiesClick(this._state, _mouseX, _mouseY, sw, sh);
      }
    }

    // HUD buttons handle Resume / Restart / Exit / sub-menu nav via callbacks
  }

  private _handlePlaying(): void {
    const state = this._state;

    // Escape opens the pause menu
    if (consumeJustPressed("Escape")) {
      state.phase = RWPhase.PAUSED;
      this._hud.pauseSubMenu = "main";
      return;
    }

    if (!state.isPlayerTurn) return;

    // Undo last action (only before enemies move)
    if ((consumeJustPressed("z") || consumeJustPressed("u")) && this._undoSnapshot) {
      try {
        const restored = JSON.parse(this._undoSnapshot);
        Object.assign(this._state, restored);
        this._undoSnapshot = null;  // Can only undo once
      } catch {}
      return;
    }

    // Save undo snapshot before any player action
    this._undoSnapshot = JSON.stringify(this._state);

    // Movement
    let moved = false;
    if (consumeJustPressed("ArrowUp") || consumeJustPressed("w")) {
      moved = tryMoveWizard(state, 0, -1);
    } else if (consumeJustPressed("ArrowDown") || consumeJustPressed("s")) {
      moved = tryMoveWizard(state, 0, 1);
    } else if (consumeJustPressed("ArrowLeft") || consumeJustPressed("a")) {
      moved = tryMoveWizard(state, -1, 0);
    } else if (consumeJustPressed("ArrowRight") || consumeJustPressed("d")) {
      moved = tryMoveWizard(state, 1, 0);
    }

    if (moved) {
      executeTurn(state);
      this._undoSnapshot = null; // Clear undo after enemy turns complete
      return;
    }

    // Spell selection (number keys 1-9)
    for (let i = 0; i < 9; i++) {
      if (consumeJustPressed(`${i + 1}`)) {
        if (i < state.spells.length && state.spells[i].charges > 0) {
          state.selectedSpellIndex = i;
          state.phase = RWPhase.TARGETING;
          // Initialize cursor at wizard position
          state.targetCursor = { col: state.wizard.col, row: state.wizard.row };

          // Auto-target nearest enemy in range
          const spell = state.spells[state.selectedSpellIndex];
          if (spell) {
            let nearestDist = Infinity;
            let nearestEnemy: { col: number; row: number } | null = null;
            for (const enemy of state.level.enemies) {
              if (!enemy.alive) continue;
              const dist = Math.abs(enemy.col - state.wizard.col) + Math.abs(enemy.row - state.wizard.row);
              if (dist <= spell.range && dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = { col: enemy.col, row: enemy.row };
              }
            }
            if (nearestEnemy) {
              state.targetCursor = { col: nearestEnemy.col, row: nearestEnemy.row };
            }
          }
        }
        return;
      }
    }

    // Left-click to move one step toward clicked tile
    if (_mouseClicked) {
      const cell = this._mouseToGrid();
      if (cell) {
        const dx = cell.col - state.wizard.col;
        const dy = cell.row - state.wizard.row;
        // Move one step in the dominant axis direction
        let stepX = 0;
        let stepY = 0;
        if (Math.abs(dx) >= Math.abs(dy)) {
          stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
        } else {
          stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
        }
        if (stepX !== 0 || stepY !== 0) {
          const didMove = tryMoveWizard(state, stepX, stepY);
          if (didMove) {
            executeTurn(state);
            this._undoSnapshot = null;
            return;
          }
        }
      }
    }

    // Pass turn
    if (consumeJustPressed(" ") || consumeJustPressed("Enter")) {
      executeTurn(state);
      this._undoSnapshot = null; // Clear undo after enemy turns complete
      return;
    }

    // Interact (shrines, items, portals)
    if (consumeJustPressed("e") || consumeJustPressed("E")) {
      tryInteract(state);
      return;
    }

    // Use consumables
    if (consumeJustPressed("p") || consumeJustPressed("P")) {
      useConsumable(state, "health_potion");
      return;
    }
    if (consumeJustPressed("c") || consumeJustPressed("C")) {
      // Charge scroll: apply to currently selected spell or first spell
      const targetIdx = state.selectedSpellIndex >= 0 ? state.selectedSpellIndex : 0;
      useConsumable(state, "charge_scroll", targetIdx);
      return;
    }
  }

  private _handleTargeting(): void {
    const state = this._state;

    // Cancel
    if (consumeJustPressed("Escape")) {
      state.phase = RWPhase.PLAYING;
      state.selectedSpellIndex = -1;
      state.targetCursor = null;
      return;
    }

    // Move cursor with keyboard
    if (state.targetCursor) {
      if (consumeJustPressed("ArrowUp") || consumeJustPressed("w")) {
        state.targetCursor = { col: state.targetCursor.col, row: state.targetCursor.row - 1 };
      } else if (consumeJustPressed("ArrowDown") || consumeJustPressed("s")) {
        state.targetCursor = { col: state.targetCursor.col, row: state.targetCursor.row + 1 };
      } else if (consumeJustPressed("ArrowLeft") || consumeJustPressed("a")) {
        state.targetCursor = { col: state.targetCursor.col - 1, row: state.targetCursor.row };
      } else if (consumeJustPressed("ArrowRight") || consumeJustPressed("d")) {
        state.targetCursor = { col: state.targetCursor.col + 1, row: state.targetCursor.row };
      }

      // Clamp cursor to map bounds
      state.targetCursor.col = Math.max(0, Math.min(state.level.width - 1, state.targetCursor.col));
      state.targetCursor.row = Math.max(0, Math.min(state.level.height - 1, state.targetCursor.row));
    }

    // Track mouse hover — move cursor to hovered cell
    const hovered = this._mouseToGrid();
    if (hovered) {
      state.targetCursor = { col: hovered.col, row: hovered.row };
    }

    // Left-click to target and cast
    if (_mouseClicked) {
      const cell = this._mouseToGrid();
      if (cell && state.selectedSpellIndex >= 0) {
        if (canCastSpell(state, state.selectedSpellIndex, cell.col, cell.row)) {
          castSpell(state, state.selectedSpellIndex, cell.col, cell.row);
          state.phase = RWPhase.PLAYING;
          state.selectedSpellIndex = -1;
          state.targetCursor = null;
          executeTurn(state);
          this._undoSnapshot = null;
        } else {
          // Move cursor to clicked cell even if can't cast there
          state.targetCursor = { col: cell.col, row: cell.row };
        }
      }
    }

    // Confirm cast (keyboard)
    if (consumeJustPressed("Enter") || consumeJustPressed(" ")) {
      if (
        state.targetCursor &&
        state.selectedSpellIndex >= 0 &&
        canCastSpell(state, state.selectedSpellIndex, state.targetCursor.col, state.targetCursor.row)
      ) {
        castSpell(state, state.selectedSpellIndex, state.targetCursor.col, state.targetCursor.row);
        state.phase = RWPhase.PLAYING;
        state.selectedSpellIndex = -1;
        state.targetCursor = null;
        executeTurn(state);
        this._undoSnapshot = null; // Clear undo after enemy turns complete
      }
    }
  }

  private _handleSpellShop(): void {
    const state = this._state;
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    if (!this._spellShopUI.container.visible) {
      this._spellShopUI.show(state, sw, sh);
    }

    // Delegate keyboard to spell shop UI
    for (const key of Object.keys(_justPressed)) {
      if (_justPressed[key]) {
        this._spellShopUI.handleKey(state, key, sw, sh);
      }
    }

    // Mouse hover + click support for spell shop
    this._spellShopUI.handleHover(state, _mouseX, _mouseY, sw, sh);
    if (_mouseClicked) {
      this._spellShopUI.handleClick(state, _mouseX, _mouseY, sw, sh);
    }
  }

  private _handleGameOver(): void {
    // Restart on R
    if (consumeJustPressed("r") || consumeJustPressed("R")) {
      this.destroy();
      this.boot();
      return;
    }

    // Exit on Escape
    if (consumeJustPressed("Escape")) {
      window.dispatchEvent(new Event("riftwizardExit"));
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  private _render(dt: number): void {
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    this._renderer.draw(this._state, sw, sh, dt);
    const hoverGrid = this._mouseToGrid();
    this._hud.update(this._state, sw, sh, hoverGrid);
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  destroy(): void {
    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }

    window.removeEventListener("keydown", this._keyDownHandler);
    window.removeEventListener("keyup", this._keyUpHandler);
    const canvas = viewManager.app.canvas as HTMLCanvasElement;
    canvas.removeEventListener("mousedown", this._mouseDownHandler);
    canvas.removeEventListener("mousemove", this._mouseMoveHandler);

    viewManager.removeFromLayer("units", this._renderer.worldLayer);
    viewManager.removeFromLayer("ui", this._hud.container);
    viewManager.removeFromLayer("ui", this._spellShopUI.container);

    this._renderer.destroy();
    this._hud.destroy();
    this._spellShopUI.destroy();

    // Re-enable camera
    viewManager.camera.keyboardEnabled = true;
    viewManager.camera.manualControlMode = false;
  }
}
