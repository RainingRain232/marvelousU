// ---------------------------------------------------------------------------
// Tekken mode – Stage Transition System
// Handles breakable walls and area transitions (Tekken 5+ mechanic)
// ---------------------------------------------------------------------------

import { TekkenFighterState } from "../../types";
import type { TekkenState, TekkenFighter } from "../state/TekkenState";
import type { TekkenFXManager } from "../view/TekkenFXManager";
import { TB } from "../config/TekkenBalanceConfig";
import {
  type BreakableWallZone,
  type StageTransitionDef,
  getStageTransition,
  createWallZones,
} from "../config/TekkenStageDefs";

export interface StageTransitionState {
  /** The transition definition for the current arena (null if no transitions) */
  transitionDef: StageTransitionDef | null;
  /** Current wall zones and their health/break state */
  walls: BreakableWallZone[];
  /** Whether a transition is currently playing */
  transitioning: boolean;
  /** Transition animation timer */
  transitionTimer: number;
  /** Which wall index just broke */
  brokenWallIndex: number;
  /** Whether the stage has already been transitioned (one transition per match) */
  hasTransitioned: boolean;
}

export class TekkenStageTransitionSystem {
  private _state: StageTransitionState = {
    transitionDef: null,
    walls: [],
    transitioning: false,
    transitionTimer: 0,
    brokenWallIndex: -1,
    hasTransitioned: false,
  };

  get state(): StageTransitionState { return this._state; }

  /** Initialize for a new match */
  init(arenaId: string): void {
    this._state = {
      transitionDef: getStageTransition(arenaId),
      walls: createWallZones(arenaId),
      transitioning: false,
      transitionTimer: 0,
      brokenWallIndex: -1,
      hasTransitioned: false,
    };
  }

  /**
   * Check if a fighter hitting the wall should damage/break it.
   * Called when a fighter is knocked back into a wall position.
   */
  checkWallImpact(
    defender: TekkenFighter,
    knockbackForce: number,
    damage: number,
    gameState: TekkenState,
    fxManager: TekkenFXManager,
  ): boolean {
    if (!this._state.transitionDef || this._state.hasTransitioned || this._state.transitioning) {
      return false;
    }

    for (let i = 0; i < this._state.walls.length; i++) {
      const wall = this._state.walls[i];
      if (wall.broken) continue;

      // Check if defender is near this wall
      const isNearWall = wall.side === "left"
        ? defender.position.x <= wall.xPosition + 0.3
        : defender.position.x >= wall.xPosition - 0.3;

      if (!isNearWall) continue;

      // Apply damage to wall based on knockback force and move damage
      const wallDamage = knockbackForce * 20 + damage * 0.5;
      wall.health -= wallDamage;
      wall.crackLevel = Math.min(1, 1 - (wall.health / wall.breakThreshold));

      // Spawn crack VFX
      if (wall.crackLevel > 0.3) {
        const wallX = wall.side === "left" ? -TB.STAGE_HALF_WIDTH : TB.STAGE_HALF_WIDTH;
        fxManager.spawnBlockSpark(wallX, 0.8, 0);
      }

      // Check if wall breaks
      if (wall.health <= 0) {
        wall.broken = true;
        this._state.brokenWallIndex = i;
        this._triggerTransition(defender, gameState, fxManager);
        return true;
      }
    }

    return false;
  }

  /** Update the transition animation */
  update(gameState: TekkenState): void {
    if (!this._state.transitioning) return;

    this._state.transitionTimer++;

    const TRANSITION_DURATION = 60; // 1 second at 60fps

    if (this._state.transitionTimer >= TRANSITION_DURATION) {
      this._state.transitioning = false;
      this._state.hasTransitioned = true;

      // Apply the new stage dimensions
      if (this._state.transitionDef) {
        const area = this._state.transitionDef.transitionArea;
        gameState.stageWidth = area.stageHalfWidth * 2;
      }
    }
  }

  /** Check if a given X position is near a breakable (unbroken) wall */
  isNearBreakableWall(x: number): boolean {
    for (const wall of this._state.walls) {
      if (wall.broken) continue;
      const wallX = wall.side === "left" ? wall.xPosition : wall.xPosition;
      if (Math.abs(x - wallX) < 0.5) return true;
    }
    return false;
  }

  /** Get the crack visual level for a wall at a given side */
  getWallCrackLevel(side: "left" | "right"): number {
    for (const wall of this._state.walls) {
      if (wall.side === side && !wall.broken) return wall.crackLevel;
    }
    return 0;
  }

  private _triggerTransition(
    defender: TekkenFighter,
    gameState: TekkenState,
    fxManager: TekkenFXManager,
  ): void {
    if (!this._state.transitionDef) return;

    this._state.transitioning = true;
    this._state.transitionTimer = 0;

    // Apply break damage to the defender
    const breakDamage = this._state.transitionDef.breakDamage;
    defender.hp = Math.max(0, defender.hp - breakDamage);

    // Apply stun to the defender
    defender.hitstunFrames = this._state.transitionDef.breakStunFrames;
    defender.state = TekkenFighterState.WALL_SPLAT;
    defender.stateTimer = 0;

    // Camera shake for dramatic effect
    gameState.cameraState.shakeIntensity = TB.CAMERA_SHAKE_HEAVY * 2;

    // Slowdown for cinematic feel
    gameState.slowdownFrames = 30;
    gameState.slowdownScale = 0.15;

    // Spawn dramatic VFX at the break point
    const wallX = this._state.walls[this._state.brokenWallIndex].side === "left"
      ? -TB.STAGE_HALF_WIDTH
      : TB.STAGE_HALF_WIDTH;
    fxManager.spawnKOImpact(wallX, 0.8, 0, 0xffaa44);

    // Push defender through the wall
    const pushDir = this._state.walls[this._state.brokenWallIndex].side === "left" ? -1 : 1;
    defender.velocity.x = pushDir * 0.15;
  }
}
