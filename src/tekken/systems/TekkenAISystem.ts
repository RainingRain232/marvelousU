// ---------------------------------------------------------------------------
// Tekken mode – AI System
// CPU opponent with difficulty-scaled decision making
// ---------------------------------------------------------------------------

import { TekkenFighterState } from "../../types";
import type { TekkenFighter, TekkenState } from "../state/TekkenState";
import { TEKKEN_CHARACTERS } from "../config/TekkenCharacterDefs";
import { createDefaultInput } from "../state/TekkenState";

export class TekkenAISystem {
  private _difficulty = 0.6; // 0-1
  private _actionCooldown = 0;
  private _comboRoute: string[] = [];
  private _comboIndex = 0;
  private _isExecutingCombo = false;

  update(fighter: TekkenFighter, opponent: TekkenFighter, _state: TekkenState): void {
    // Clear input each frame
    fighter.input = createDefaultInput();

    if (fighter.state === TekkenFighterState.DEFEAT ||
        fighter.state === TekkenFighterState.VICTORY ||
        fighter.state === TekkenFighterState.KNOCKDOWN ||
        fighter.state === TekkenFighterState.GET_UP) {
      return;
    }

    // Don't act during hitstun/blockstun
    if (fighter.hitstunFrames > 0 || fighter.blockstunFrames > 0) return;

    // Don't interrupt attacks
    if (fighter.state === TekkenFighterState.ATTACK) return;

    this._actionCooldown--;

    const dx = opponent.position.x - fighter.position.x;
    const dist = Math.abs(dx);
    // Execute combo if in progress
    if (this._isExecutingCombo && this._comboIndex < this._comboRoute.length) {
      this._executeComboStep(fighter);
      return;
    }
    this._isExecutingCombo = false;

    // Reaction-based blocking
    if (opponent.state === TekkenFighterState.ATTACK && opponent.movePhase === "active" && dist < 1.5) {
      if (Math.random() < this._difficulty) {
        this._doBlock(fighter, opponent);
        return;
      }
    }

    if (this._actionCooldown > 0) return;

    // Decision making based on distance
    if (dist > 2.5) {
      // Far: walk forward
      this._walkToward(fighter, opponent);
      this._actionCooldown = 5;
    } else if (dist > 1.0) {
      // Mid range: poke or approach
      const action = Math.random();
      if (action < 0.35) {
        // Mid poke (d/f+1)
        this._doAttack(fighter, "d/f", ["lp"]);
        this._actionCooldown = 20 + Math.random() * 15;
      } else if (action < 0.55) {
        // Front kick (3)
        this._doAttack(fighter, "n", ["lk"]);
        this._actionCooldown = 22 + Math.random() * 10;
      } else if (action < 0.7) {
        // Launcher attempt (d/f+2)
        this._doAttack(fighter, "d/f", ["rp"]);
        this._actionCooldown = 25;
      } else {
        this._walkToward(fighter, opponent);
        this._actionCooldown = 8;
      }
    } else {
      // Close range: mix up
      const action = Math.random();
      if (action < 0.25) {
        // Jab (1)
        this._doAttack(fighter, "n", ["lp"]);
        this._actionCooldown = 12 + Math.random() * 8;
      } else if (action < 0.40) {
        // Low kick (d+3)
        this._doAttack(fighter, "d", ["lk"]);
        this._actionCooldown = 18 + Math.random() * 10;
      } else if (action < 0.55) {
        // Throw attempt (1+3)
        this._doAttack(fighter, "n", ["lp", "lk"]);
        this._actionCooldown = 20;
      } else if (action < 0.70) {
        // Launcher (d+2)
        this._doAttack(fighter, "d", ["rp"]);
        this._actionCooldown = 25;
      } else if (action < 0.85) {
        // Walk back (spacing)
        this._walkAway(fighter, opponent);
        this._actionCooldown = 10;
      } else {
        // Block
        this._doBlock(fighter, opponent);
        this._actionCooldown = 15;
      }
    }

    // After landing a launcher, try to execute a combo
    if (opponent.juggle.isAirborne && fighter.comboCount >= 1 && !this._isExecutingCombo) {
      const charDef = TEKKEN_CHARACTERS.find(c => c.id === fighter.characterId);
      if (charDef && charDef.comboRoutes.length > 0) {
        this._comboRoute = charDef.comboRoutes[Math.floor(Math.random() * charDef.comboRoutes.length)];
        this._comboIndex = 0;
        this._isExecutingCombo = true;
      }
    }
  }

  private _walkToward(fighter: TekkenFighter, opponent: TekkenFighter): void {
    if (opponent.position.x > fighter.position.x) {
      fighter.input.right = true;
    } else {
      fighter.input.left = true;
    }
  }

  private _walkAway(fighter: TekkenFighter, opponent: TekkenFighter): void {
    if (opponent.position.x > fighter.position.x) {
      fighter.input.left = true;
    } else {
      fighter.input.right = true;
    }
  }

  private _doAttack(fighter: TekkenFighter, direction: string, buttons: string[]): void {
    // Set directional input
    const isFacingRight = fighter.facingRight;
    switch (direction) {
      case "f":
        if (isFacingRight) fighter.input.right = true;
        else fighter.input.left = true;
        break;
      case "b":
        if (isFacingRight) fighter.input.left = true;
        else fighter.input.right = true;
        break;
      case "d":
        fighter.input.down = true;
        break;
      case "u":
        fighter.input.up = true;
        break;
      case "d/f":
        fighter.input.down = true;
        if (isFacingRight) fighter.input.right = true;
        else fighter.input.left = true;
        break;
      case "d/b":
        fighter.input.down = true;
        if (isFacingRight) fighter.input.left = true;
        else fighter.input.right = true;
        break;
      case "u/f":
        fighter.input.up = true;
        if (isFacingRight) fighter.input.right = true;
        else fighter.input.left = true;
        break;
    }

    // Set button input
    for (const btn of buttons) {
      if (btn === "lp") fighter.input.lp = true;
      if (btn === "rp") fighter.input.rp = true;
      if (btn === "lk") fighter.input.lk = true;
      if (btn === "rk") fighter.input.rk = true;
    }
  }

  private _doBlock(fighter: TekkenFighter, opponent: TekkenFighter): void {
    // Hold back
    if (opponent.position.x > fighter.position.x) {
      fighter.input.left = true;
    } else {
      fighter.input.right = true;
    }

    // Crouch block against low attacks (random chance based on difficulty)
    if (Math.random() < this._difficulty * 0.6) {
      fighter.input.down = true;
    }
  }

  private _executeComboStep(fighter: TekkenFighter): void {
    if (this._comboIndex >= this._comboRoute.length) {
      this._isExecutingCombo = false;
      return;
    }

    // Wait for previous attack to finish
    if (fighter.state === TekkenFighterState.ATTACK) return;

    const step = this._comboRoute[this._comboIndex];
    this._comboIndex++;

    // Parse combo step notation (simplified)
    // Format: "d/f+rp", "n+lk", "d+lp", etc.
    const parts = step.split("+");
    const dir = parts[0] || "n";
    const btns = parts.slice(1);

    this._doAttack(fighter, dir, btns);
  }
}
