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
import { RiftWizardRenderer } from "./view/RiftWizardRenderer";
import { RiftWizardHUD } from "./view/RiftWizardHUD";
import { RiftWizardSpellSelectUI } from "./view/RiftWizardSpellSelectUI";

// ---------------------------------------------------------------------------
// Input tracking
// ---------------------------------------------------------------------------

const _keys: Record<string, boolean> = {};
const _justPressed: Record<string, boolean> = {};

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

    // Move cursor
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

    // Confirm cast
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
    this._hud.update(this._state, sw, sh);
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
