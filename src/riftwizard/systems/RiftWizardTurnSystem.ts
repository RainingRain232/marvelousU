// ---------------------------------------------------------------------------
// Rift Wizard turn system — player + enemy turn sequencing
// ---------------------------------------------------------------------------

import {
  type RiftWizardState,
  type GridPos,
  RWPhase,
  RWTileType,
} from "../state/RiftWizardState";
import { RWBalance, getSPForLevel } from "../config/RiftWizardConfig";
import {
  triggerTurnStartAbilities,
  processDeaths,
  checkLevelClear,
  processEndOfTurn,
  canCastSpell,
} from "./RiftWizardCombatSystem";
import { updateAllEnemies } from "./RiftWizardEnemyAI";
import { generateLevel, getNextEntityId } from "./RiftWizardLevelGenerator";
import { rwEventBus, RWEvent } from "./RiftWizardEventBus";

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

function isWalkableForWizard(state: RiftWizardState, col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= state.level.width || row >= state.level.height) return false;
  const t = state.level.tiles[row][col];
  if (t === RWTileType.WALL || t === RWTileType.CHASM) return false;
  // Can't walk onto enemies
  for (const e of state.level.enemies) {
    if (e.alive && e.col === col && e.row === row) return false;
  }
  // Can't walk onto spawners
  for (const s of state.level.spawners) {
    if (s.alive && s.col === col && s.row === row) return false;
  }
  return true;
}

/** Move the wizard in a cardinal direction. Returns true if moved. */
export function tryMoveWizard(
  state: RiftWizardState,
  dx: number,
  dy: number,
): boolean {
  const newCol = state.wizard.col + dx;
  const newRow = state.wizard.row + dy;

  if (!isWalkableForWizard(state, newCol, newRow)) return false;

  state.wizard.col = newCol;
  state.wizard.row = newRow;

  return true;
}

/** Try to interact with shrine/circle/item at wizard position. */
export function tryInteract(state: RiftWizardState): boolean {
  const { col, row } = state.wizard;

  // Shrine interaction
  for (const shrine of state.level.shrines) {
    if (shrine.col === col && shrine.row === row && !shrine.used) {
      shrine.used = true;
      rwEventBus.emit(RWEvent.SHRINE_USE, { school: shrine.school, effect: shrine.effect });
      // Apply shrine buff to first qualifying spell
      for (const spell of state.spells) {
        if (spell.school === shrine.school) {
          switch (shrine.effect) {
            case "damage":
              spell.damage += shrine.magnitude * 5;
              break;
            case "range":
              spell.range += shrine.magnitude;
              break;
            case "charges":
              spell.maxCharges += shrine.magnitude * 2;
              spell.charges += shrine.magnitude * 2;
              break;
            case "aoe":
              spell.aoeRadius += shrine.magnitude;
              break;
            case "bounces":
              spell.maxBounces += shrine.magnitude;
              break;
          }
          break; // Only buff the first matching spell
        }
      }
      // Bonus SP
      state.skillPoints += RWBalance.SP_BONUS_SHRINE;
      state.totalSPEarned += RWBalance.SP_BONUS_SHRINE;
      return true;
    }
  }

  // Item pickup
  for (const item of state.level.items) {
    if (item.col === col && item.row === row && !item.picked) {
      item.picked = true;
      rwEventBus.emit(RWEvent.ITEM_PICKUP, { type: item.type });
      const existing = state.consumables.find((c) => c.type === item.type);
      if (existing) {
        existing.quantity++;
      } else {
        state.consumables.push({ type: item.type, quantity: 1 });
      }
      return true;
    }
  }

  // Rift portal interaction
  for (const portal of state.level.riftPortals) {
    if (portal.col === col && portal.row === row) {
      if (state.currentLevel >= RWBalance.TOTAL_LEVELS - 1) {
        // Victory!
        state.phase = RWPhase.VICTORY;
        rwEventBus.emit(RWEvent.VICTORY);
        return true;
      }
      // Award SP
      rwEventBus.emit(RWEvent.PORTAL_ENTER);
      const sp = getSPForLevel(state.currentLevel);
      state.skillPoints += sp;
      state.totalSPEarned += sp;
      // Open spell shop
      state.phase = RWPhase.SPELL_SHOP;
      return true;
    }
  }

  return false;
}

/** Use a consumable. Does NOT cost a turn. */
export function useConsumable(
  state: RiftWizardState,
  type: string,
  targetSpellIndex?: number,
): boolean {
  const item = state.consumables.find((c) => c.type === type && c.quantity > 0);
  if (!item) return false;

  switch (type) {
    case "health_potion":
      state.wizard.hp = Math.min(
        state.wizard.maxHp,
        state.wizard.hp + RWBalance.HEALTH_POTION_HEAL,
      );
      item.quantity--;
      return true;

    case "charge_scroll":
      if (targetSpellIndex !== undefined && state.spells[targetSpellIndex]) {
        const spell = state.spells[targetSpellIndex];
        spell.charges = Math.min(
          spell.maxCharges,
          spell.charges + RWBalance.CHARGE_SCROLL_RESTORE,
        );
        item.quantity--;
        return true;
      }
      return false;

    case "shield_scroll":
      state.wizard.shields += 20;
      item.quantity--;
      return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Turn execution
// ---------------------------------------------------------------------------

/**
 * Execute a player turn and then process the enemy turn.
 * Call this after a valid player action (move, cast, or pass).
 */
export function executeTurn(state: RiftWizardState): void {
  rwEventBus.emit(RWEvent.TURN_START);
  state.turnNumber++;

  // Process deaths from player action
  processDeaths(state);

  // Check level clear
  if (checkLevelClear(state)) {
    rwEventBus.emit(RWEvent.LEVEL_CLEAR);
    // If final level, victory
    if (state.currentLevel >= RWBalance.TOTAL_LEVELS - 1) {
      state.phase = RWPhase.VICTORY;
      return;
    }
    // Otherwise portals have been spawned, wait for player to walk to one
    rwEventBus.emit(RWEvent.TURN_END);
    return;
  }

  // Enemy turn
  state.isPlayerTurn = false;
  updateAllEnemies(state);

  // End-of-turn processing (lava, summon decay, spawners, stun decrement)
  processEndOfTurn(state);

  // Check wizard death
  if (state.wizard.hp <= 0) {
    state.phase = RWPhase.GAME_OVER;
    rwEventBus.emit(RWEvent.GAME_OVER);
    return;
  }

  // Check level clear again (enemies may have died to lava)
  if (checkLevelClear(state)) {
    rwEventBus.emit(RWEvent.LEVEL_CLEAR);
  }

  // Back to player
  state.isPlayerTurn = true;

  // Trigger turn-start abilities (regeneration, fire trail, etc.)
  triggerTurnStartAbilities(state);

  rwEventBus.emit(RWEvent.TURN_END);
}

// ---------------------------------------------------------------------------
// Level transition
// ---------------------------------------------------------------------------

/** Advance to the next level. Called after spell shop. */
export function advanceToNextLevel(state: RiftWizardState): void {
  state.currentLevel++;

  // Increase wizard max HP
  state.wizard.maxHp += RWBalance.WIZARD_HP_PER_LEVEL;
  // Small HP restore between levels
  state.wizard.hp = Math.min(
    state.wizard.maxHp,
    state.wizard.hp + Math.floor(state.wizard.maxHp * 0.15),
  );

  // Restore spell charges
  for (const spell of state.spells) {
    spell.charges = spell.maxCharges;
  }

  // Clear status effects
  state.wizard.statusEffects = [];
  state.wizard.shields = 0;

  // Generate new level
  state.level = generateLevel(state.currentLevel, state.nextEntityId);
  state.nextEntityId = getNextEntityId();

  // Place wizard at entrance
  state.wizard.col = state.level.entrancePos.col;
  state.wizard.row = state.level.entrancePos.row;

  state.isPlayerTurn = true;
  state.phase = RWPhase.PLAYING;

  rwEventBus.emit(RWEvent.LEVEL_START, { level: state.currentLevel });
}

// ---------------------------------------------------------------------------
// Get valid target tiles for a spell (for targeting UI)
// ---------------------------------------------------------------------------

export function getValidTargets(
  state: RiftWizardState,
  spellIndex: number,
): GridPos[] {
  const spell = state.spells[spellIndex];
  if (!spell || spell.charges <= 0) return [];

  const targets: GridPos[] = [];
  for (let row = 0; row < state.level.height; row++) {
    for (let col = 0; col < state.level.width; col++) {
      if (canCastSpell(state, spellIndex, col, row)) {
        targets.push({ col, row });
      }
    }
  }
  return targets;
}
