// ---------------------------------------------------------------------------
// Rift Wizard mode orchestrator — boot, game loop, cleanup
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import {
  createRiftWizardState,
  RWPhase,
  type RiftWizardState,
  type ItemOnGround,
} from "./state/RiftWizardState";
import { generateLevel, setSeed, getNextEntityId } from "./systems/RiftWizardLevelGenerator";
import {
  tryMoveWizard,
  tryInteract,
  useConsumable,
  executeTurn,
  advanceToNextLevel,
} from "./systems/RiftWizardTurnSystem";
import { castSpell, canCastSpell, createSpellInstance, computeSpellStats } from "./systems/RiftWizardCombatSystem";
import { RWBalance, DIFFICULTY_MULTIPLIERS } from "./config/RiftWizardConfig";
import { RiftWizardRenderer } from "./view/RiftWizardRenderer";
import { RiftWizardHUD } from "./view/RiftWizardHUD";
import { RiftWizardSpellSelectUI } from "./view/RiftWizardSpellSelectUI";

// --- New system imports ---
import { rwEventBus, RWEvent } from "./systems/RiftWizardEventBus";
import type { RWEventData } from "./systems/RiftWizardEventBus";
import {
  recordDamageDealt,
  recordDamageTaken,
  recordEnemyKilled,
  recordSpellCast,
  recordFloorCleared,
  recordTurn,
} from "./systems/RiftWizardRunStats";
import { saveGame, loadGame } from "./systems/RiftWizardSaveSystem";
import { rwAudio } from "./systems/RiftWizardAudioSystem";
import { RiftWizardTutorial } from "./view/RiftWizardTutorial";
import { RiftWizardCodex } from "./view/RiftWizardCodex";
import { saveScore, computeScore } from "./systems/RiftWizardLeaderboard";
import { getActiveSynergies, type SpellSynergy } from "./config/RiftWizardSynergyDefs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENEMY_DROP_CHANCE = 0.12; // default if not specified on enemy def
const ITEM_DROP_TYPES: ItemOnGround["type"][] = [
  "health_potion",
  "charge_scroll",
  "shield_scroll",
];

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

  // Optional UI components (loaded dynamically)
  private _tutorial: any = null;
  private _codex: any = null;

  // Tutorial state
  private _tutorialFirstTurnShown = false;
  private _tutorialFirstSpellShown = false;
  private _tutorialFirstInteractShown = false;

  // Spell synergies (computed, not stored in state)
  private _activeSynergies: SpellSynergy[] = [];

  // EventBus unsubscribe handles
  private _eventUnsubscribers: (() => void)[] = [];

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

    // --- Run seed ---
    this._state.runSeed = Date.now();

    // --- Difficulty default ---
    this._state.difficulty = "normal";

    // --- Encountered enemies tracking ---
    this._state.encounteredEnemies = [];

    // Give the wizard 2 starting spells
    this._state.spells.push(createSpellInstance("magic_missile"));
    this._state.spells.push(createSpellInstance("fireball"));
    this._state.skillPoints = 5; // starting SP for first shop visit

    // Apply difficulty to wizard HP
    const diffMult = DIFFICULTY_MULTIPLIERS[this._state.difficulty];
    this._state.wizard.maxHp = Math.floor(this._state.wizard.maxHp * diffMult.wizardHpMult);
    this._state.wizard.hp = this._state.wizard.maxHp;

    // Generate first level (using run seed)
    setSeed(this._state.runSeed);
    this._state.level = generateLevel(0, this._state.nextEntityId, this._state.difficulty);
    this._state.nextEntityId = getNextEntityId();
    this._state.wizard.col = this._state.level.entrancePos.col;
    this._state.wizard.row = this._state.level.entrancePos.row;

    // Track encountered enemies for first level
    this._trackEncounteredEnemies();

    // --- Compute initial spell synergies ---
    this._computeSpellSynergies();

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

    // --- Save/Load callbacks ---
    (this._hud as any).onPauseSave = () => {
      saveGame(this._state);
    };
    (this._hud as any).onPauseLoad = () => {
      const saved = loadGame();
      if (saved) {
        Object.assign(this._state, saved);
        this._computeSpellSynergies();
      }
    };

    viewManager.addToLayer("ui", this._hud.container);

    // Init spell shop UI
    this._spellShopUI.build();
    this._spellShopUI.hide();
    this._spellShopUI.onConfirm = () => {
      this._spellShopUI.hide();
      advanceToNextLevel(this._state);
      // Recompute synergies after potential new spells
      this._computeSpellSynergies();
    };
    viewManager.addToLayer("ui", this._spellShopUI.container);

    // --- Tutorial ---
    if (RiftWizardTutorial) {
      this._tutorial = new RiftWizardTutorial();
      if (typeof this._tutorial.build === "function") this._tutorial.build();
      if (this._tutorial.container) {
        viewManager.addToLayer("ui", this._tutorial.container);
      }
    }

    // --- Codex / Bestiary ---
    if (RiftWizardCodex) {
      this._codex = new RiftWizardCodex();
      if (typeof this._codex.build === "function") this._codex.build();
      if (this._codex.container) {
        viewManager.addToLayer("ui", this._codex.container);
      }
    }

    // --- Audio ---
    if (rwAudio && typeof rwAudio.init === "function") {
      rwAudio.init();
    }

    // --- EventBus wiring ---
    this._wireEventBus();

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
  // EventBus wiring
  // -------------------------------------------------------------------------

  private _wireEventBus(): void {
    // Global listener to route events to RunStats
    const unsubGlobal = rwEventBus.onAny((data: RWEventData) => {
      this._routeEventToStats(data);
    });
    this._eventUnsubscribers.push(unsubGlobal);

    // Portal enter -> Level Summary phase
    const unsubPortal = rwEventBus.on(RWEvent.PORTAL_ENTER, () => {
      this._state.phase = RWPhase.LEVEL_SUMMARY;
    });
    this._eventUnsubscribers.push(unsubPortal);

    // Enemy death -> enemy drops
    const unsubEnemyDeath = rwEventBus.on(RWEvent.ENEMY_DEATH, (data) => {
      this._handleEnemyDrop(data);
    });
    this._eventUnsubscribers.push(unsubEnemyDeath);

    // Level start -> track encountered enemies
    const unsubLevelStart = rwEventBus.on(RWEvent.LEVEL_START, () => {
      this._trackEncounteredEnemies();
      this._computeSpellSynergies();
    });
    this._eventUnsubscribers.push(unsubLevelStart);

    // Victory / Game Over -> leaderboard
    const unsubVictory = rwEventBus.on(RWEvent.VICTORY, () => {
      this._saveToLeaderboard(true);
    });
    this._eventUnsubscribers.push(unsubVictory);

    const unsubGameOver = rwEventBus.on(RWEvent.GAME_OVER, () => {
      this._saveToLeaderboard(false);
    });
    this._eventUnsubscribers.push(unsubGameOver);
  }

  private _routeEventToStats(data: RWEventData): void {
    const stats = this._state.runStats;
    switch (data.type) {
      case RWEvent.SPELL_HIT:
        recordDamageDealt(stats, (data.amount as number) ?? 0, data.school as string | undefined);
        break;
      case RWEvent.WIZARD_HIT:
        recordDamageTaken(stats, (data.amount as number) ?? 0);
        break;
      case RWEvent.ENEMY_DEATH:
        recordEnemyKilled(stats, !!(data.isBoss), data.school as string | undefined);
        break;
      case RWEvent.SPELL_CAST:
        recordSpellCast(stats, data.school as string | undefined);
        break;
      case RWEvent.LEVEL_CLEAR:
        recordFloorCleared(stats);
        break;
      case RWEvent.TURN_END:
        recordTurn(stats);
        break;
      case RWEvent.ITEM_PICKUP:
        stats.itemsCollected++;
        break;
      case RWEvent.SHRINE_USE:
        stats.shrinesUsed++;
        break;
      case RWEvent.SPELL_LEARNED:
        stats.spellsLearned++;
        break;
      case RWEvent.UPGRADE_BOUGHT:
        stats.upgradesBought++;
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Enemy drops
  // -------------------------------------------------------------------------

  private _handleEnemyDrop(data: RWEventData): void {
    const col = data.col as number | undefined;
    const row = data.row as number | undefined;
    if (col == null || row == null) return;

    const dropChance = (data.dropChance as number) ?? ENEMY_DROP_CHANCE;
    if (Math.random() >= dropChance) return;

    // Pick random item type
    const itemType = ITEM_DROP_TYPES[Math.floor(Math.random() * ITEM_DROP_TYPES.length)];
    const item: ItemOnGround = {
      id: this._state.nextEntityId++,
      col,
      row,
      type: itemType,
      picked: false,
    };
    this._state.level.items.push(item);
  }

  // -------------------------------------------------------------------------
  // Encountered enemies tracking
  // -------------------------------------------------------------------------

  private _trackEncounteredEnemies(): void {
    const encountered = this._state.encounteredEnemies;
    for (const enemy of this._state.level.enemies) {
      if (!encountered.includes(enemy.defId)) {
        encountered.push(enemy.defId);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Spell synergies
  // -------------------------------------------------------------------------

  private _computeSpellSynergies(): void {
    // Reset spells to base stats first (prevents stacking on repeated calls)
    for (const spell of this._state.spells) {
      computeSpellStats(spell);
    }

    const schools = new Set(this._state.spells.map(s => s.school));
    const synergies = getActiveSynergies(schools);
    this._activeSynergies = synergies;

    for (const syn of synergies) {
      const eff = syn.effect;
      if (eff.type === "max_hp") {
        // Only apply if not already applied (track applied synergies)
        continue; // HP bonuses should be one-time, not on recalc
      }
      for (const spell of this._state.spells) {
        if (eff.type === "damage_bonus") spell.damage += Math.floor(spell.damage * eff.amount / 100);
        if (eff.type === "range_bonus") spell.range += eff.amount;
        if (eff.type === "aoe_bonus") spell.aoeRadius += eff.amount;
        if (eff.type === "charge_bonus") { spell.maxCharges += eff.amount; spell.charges = Math.min(spell.charges, spell.maxCharges); }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Leaderboard
  // -------------------------------------------------------------------------

  private _saveToLeaderboard(victory: boolean): void {
    const stats = this._state.runStats;
    const score = computeScore(stats, stats.floorsCleared, victory);
    saveScore({
      score,
      floorsCleared: stats.floorsCleared,
      enemiesKilled: stats.enemiesKilled,
      difficulty: this._state.difficulty,
      seed: this._state.runSeed,
      date: Date.now(),
      duration: `${Math.floor((Date.now() - stats.startTime) / 60000)}m`,
      spellsLearned: stats.spellsLearned,
      won: victory,
    });
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

    // --- Tutorial dismissal: consume SPACE/click before normal input ---
    if (this._tutorial && typeof this._tutorial.isShowing === "function" && this._tutorial.isShowing()) {
      if (consumeJustPressed(" ") || _mouseClicked) {
        if (typeof this._tutorial.dismiss === "function") this._tutorial.dismiss();
        clearJustPressed();
        return;
      }
    }

    // Help toggle — works from any phase
    if (consumeJustPressed("?")) {
      this._hud.toggleKeyReference();
      return;
    }

    // --- Codex / Bestiary toggle ---
    if (consumeJustPressed("b") || consumeJustPressed("B")) {
      if (this._codex && typeof this._codex.toggle === "function") {
        this._codex.toggle(
          [...this._state.encounteredEnemies],
          this._state.spells.map(s => s.defId)
        );
        clearJustPressed();
        return;
      }
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
      default:
        // --- Level Summary phase ---
        if (state.phase === RWPhase.LEVEL_SUMMARY) {
          this._handleLevelSummary();
        }
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

    // --- Tutorial tips ---
    this._checkTutorialTriggers(state);

    // Undo last action (only before enemies move)
    if ((consumeJustPressed("z") || consumeJustPressed("u")) && this._undoSnapshot) {
      try {
        const restored = JSON.parse(this._undoSnapshot);
        Object.assign(this._state, restored);
        this._undoSnapshot = null;  // Can only undo once
        this._state.runStats.timesUndone++;
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
      this._executeTurnWithTelegraphs(state);
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

          // --- Tutorial: first spell select ---
          if (!this._tutorialFirstSpellShown && this._tutorial) {
            if (typeof this._tutorial.tryShow === "function") {
              this._tutorial.tryShow("first_spell_select");
            }
            this._tutorialFirstSpellShown = true;
          }

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
            this._executeTurnWithTelegraphs(state);
            this._undoSnapshot = null;
            return;
          }
        }
      }
    }

    // Pass turn
    if (consumeJustPressed(" ") || consumeJustPressed("Enter")) {
      this._executeTurnWithTelegraphs(state);
      this._undoSnapshot = null; // Clear undo after enemy turns complete
      return;
    }

    // Interact (shrines, items, portals)
    if (consumeJustPressed("e") || consumeJustPressed("E")) {
      // --- Tutorial: first interact ---
      if (!this._tutorialFirstInteractShown && this._tutorial) {
        // Check if interact is available by looking for adjacent interactable
        const hasInteractable = this._checkInteractAvailable(state);
        if (hasInteractable) {
          if (typeof this._tutorial.tryShow === "function") {
            this._tutorial.tryShow("first_interact_available");
          }
          this._tutorialFirstInteractShown = true;
        }
      }
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
          this._executeTurnWithTelegraphs(state);
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
        this._executeTurnWithTelegraphs(state);
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

  // -------------------------------------------------------------------------
  // Level Summary phase
  // -------------------------------------------------------------------------

  private _handleLevelSummary(): void {
    // Show the summary overlay (renderer/HUD can read state.phase === "level_summary")
    // Advance to spell shop on SPACE or Enter
    if (consumeJustPressed(" ") || consumeJustPressed("Enter")) {
      this._state.phase = RWPhase.SPELL_SHOP;
    }
  }

  // -------------------------------------------------------------------------
  // Game Over / Victory
  // -------------------------------------------------------------------------

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
  // Turn execution with telegraphed tiles (Boss mechanics)
  // -------------------------------------------------------------------------

  private _executeTurnWithTelegraphs(state: RiftWizardState): void {
    executeTurn(state);

    // --- Process telegraphed tiles ---
    const telegraphed = state.telegraphedTiles;
    const remaining: typeof state.telegraphedTiles = [];
    for (const tile of telegraphed) {
      tile.turnDelay--;
      if (tile.turnDelay <= 0) {
        // Tile triggers: deal damage if wizard is standing on it
        if (state.wizard.col === tile.col && state.wizard.row === tile.row) {
          const dmg = tile.damage ?? 20;
          state.wizard.hp -= dmg;
          rwEventBus.emit(RWEvent.WIZARD_HIT, {
            amount: dmg,
            source: "telegraphed_tile",
            col: tile.col,
            row: tile.row,
          });
          if (state.wizard.hp <= 0) {
            state.wizard.hp = 0;
            state.phase = RWPhase.GAME_OVER;
            rwEventBus.emit(RWEvent.WIZARD_DEATH);
            rwEventBus.emit(RWEvent.GAME_OVER);
          }
        }
        // Tile is consumed — do not keep
      } else {
        remaining.push(tile);
      }
    }
    state.telegraphedTiles = remaining;
  }

  // -------------------------------------------------------------------------
  // Tutorial helpers
  // -------------------------------------------------------------------------

  private _checkTutorialTriggers(state: RiftWizardState): void {
    if (!this._tutorial) return;

    // First turn tip
    if (!this._tutorialFirstTurnShown && state.turnNumber === 0) {
      if (typeof this._tutorial.tryShow === "function") {
        this._tutorial.tryShow("first_turn");
      }
      this._tutorialFirstTurnShown = true;
    }

    // First interact available
    if (!this._tutorialFirstInteractShown) {
      const hasInteractable = this._checkInteractAvailable(state);
      if (hasInteractable && typeof this._tutorial.tryShow === "function") {
        this._tutorial.tryShow("first_interact_available");
        this._tutorialFirstInteractShown = true;
      }
    }
  }

  private _checkInteractAvailable(state: RiftWizardState): boolean {
    const { col, row } = state.wizard;
    // Check adjacent tiles (including current) for shrines, items, portals
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const c = col + dx;
        const r = row + dy;
        if (c < 0 || c >= state.level.width || r < 0 || r >= state.level.height) continue;
        // Shrine
        for (const shrine of state.level.shrines) {
          if (shrine.col === c && shrine.row === r && !shrine.used) return true;
        }
        // Item
        for (const item of state.level.items) {
          if (item.col === c && item.row === r && !item.picked) return true;
        }
        // Portal
        for (const portal of state.level.riftPortals) {
          if (portal.col === c && portal.row === r) return true;
        }
      }
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  private _render(dt: number): void {
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    this._renderer.draw(this._state, sw, sh, dt);
    const hoverGrid = this._mouseToGrid();
    (this._state as any).activeSynergies = this._activeSynergies;
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

    // --- Remove tutorial UI ---
    if (this._tutorial?.container) {
      viewManager.removeFromLayer("ui", this._tutorial.container);
    }

    // --- Remove codex UI ---
    if (this._codex?.container) {
      viewManager.removeFromLayer("ui", this._codex.container);
    }

    this._renderer.destroy();
    this._hud.destroy();
    this._spellShopUI.destroy();

    // --- Destroy tutorial ---
    if (this._tutorial && typeof this._tutorial.destroy === "function") {
      this._tutorial.destroy();
    }
    this._tutorial = null;

    // --- Destroy codex ---
    if (this._codex && typeof this._codex.destroy === "function") {
      this._codex.destroy();
    }
    this._codex = null;

    // --- Audio cleanup ---
    if (rwAudio && typeof rwAudio.destroy === "function") {
      rwAudio.destroy();
    }

    // --- EventBus cleanup ---
    for (const unsub of this._eventUnsubscribers) {
      unsub();
    }
    this._eventUnsubscribers.length = 0;
    rwEventBus.clear();

    // Reset tutorial tracking
    this._tutorialFirstTurnShown = false;
    this._tutorialFirstSpellShown = false;
    this._tutorialFirstInteractShown = false;

    // Re-enable camera
    viewManager.camera.keyboardEnabled = true;
    viewManager.camera.manualControlMode = false;
  }
}
