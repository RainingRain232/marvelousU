// ---------------------------------------------------------------------------
// Tekken mode – AI System
// CPU opponent with difficulty-scaled decision making
// Enhanced movement: footsies, spacing, dashes, sidesteps, retreat after hits
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
  private _enabled = true;
  private _comboDelayTimer = 0;
  private _comboDropped = false;

  // Movement behavior state
  private _movementTimer = 0;
  private _movementAction: "none" | "walk_fwd" | "walk_back" | "dash_fwd" | "dash_back" | "sidestep" = "none";
  private _postAttackRetreatFrames = 0;
  private _footsiePhase: "approach" | "spacing" | "pressure" | "retreat" = "approach";
  private _footsieTimer = 0;
  private _optimalRange = 1.6; // character-specific optimal fighting range
  private _lastAttackFrame = 0;
  private _frameCounter = 0;

  get difficulty(): number { return this._difficulty; }

  /** Set difficulty: 0 = easy (0.3), 1 = medium (0.6), 2 = hard (0.9) */
  setDifficultyLevel(level: number): void {
    const mapping = [0.3, 0.6, 0.9];
    this._difficulty = mapping[Math.min(level, 2)] ?? 0.6;
  }

  get enabled(): boolean { return this._enabled; }
  set enabled(v: boolean) { this._enabled = v; }

  update(fighter: TekkenFighter, opponent: TekkenFighter, _state: TekkenState): void {
    // Clear input each frame
    fighter.input = createDefaultInput();
    this._frameCounter++;

    // If AI is disabled (training mode toggle), do nothing
    if (!this._enabled) return;

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

    // Determine character-specific optimal range
    this._updateOptimalRange(fighter);

    const dx = opponent.position.x - fighter.position.x;
    const dist = Math.abs(dx);

    // Execute combo if in progress
    if (this._isExecutingCombo && this._comboIndex < this._comboRoute.length) {
      this._executeComboStep(fighter);
      return;
    }
    this._isExecutingCombo = false;

    // Post-attack retreat: after landing a hit, back off briefly
    if (this._postAttackRetreatFrames > 0) {
      this._postAttackRetreatFrames--;
      this._walkAway(fighter, opponent);
      return;
    }

    // Reaction-based blocking
    if (opponent.state === TekkenFighterState.ATTACK && opponent.movePhase === "active" && dist < 1.5) {
      if (Math.random() < this._difficulty) {
        this._doBlock(fighter, opponent);
        return;
      }
    }

    // Continue active movement actions (dashes, sidesteps)
    if (this._movementTimer > 0) {
      this._movementTimer--;
      this._executeMovement(fighter, opponent);
      if (this._movementTimer > 0) return;
    }

    if (this._actionCooldown > 0) {
      // Even during cooldown, keep moving (footsies)
      this._doFootsieMovement(fighter, opponent, dist);
      return;
    }

    // Update footsie phase
    this._updateFootsiePhase(fighter, opponent, dist);

    // Decision making based on distance and footsie phase
    if (dist > 3.5) {
      // Very far: dash forward to close gap
      this._decideVeryFarRange(fighter, opponent);
    } else if (dist > 2.0) {
      // Far: footsie range - mix walks and dashes with pokes
      this._decideFarRange(fighter, opponent, dist);
    } else if (dist > 1.0) {
      // Mid range: attack range - poke, approach, or create space
      this._decideMidRange(fighter, opponent, dist);
    } else {
      // Close range: mix up attacks with movement
      this._decideCloseRange(fighter, opponent, dist);
    }

    // After landing a launcher, try to execute a combo
    if (opponent.juggle.isAirborne && fighter.comboCount >= 1 && !this._isExecutingCombo) {
      const charDef = TEKKEN_CHARACTERS.find(c => c.id === fighter.characterId);
      if (charDef) {
        let routes: string[][] = charDef.comboRoutes;
        if (this._difficulty > 0.7 && charDef.expertComboRoutes && charDef.expertComboRoutes.length > 0) {
          routes = charDef.expertComboRoutes;
        } else if (this._difficulty >= 0.4 && charDef.advancedComboRoutes && charDef.advancedComboRoutes.length > 0) {
          routes = charDef.advancedComboRoutes;
        }

        if (routes.length > 0) {
          this._comboRoute = routes[Math.floor(Math.random() * routes.length)];
          this._comboIndex = 0;
          this._isExecutingCombo = true;
          this._comboDropped = false;
          this._comboDelayTimer = 0;
        }
      }
    }

    // Whiff punish on hard difficulty
    if (this._difficulty > 0.7 && dist > 0.8 && dist < 2.0 &&
        opponent.state === TekkenFighterState.ATTACK && opponent.movePhase === "recovery") {
      this._doAttack(fighter, "d/f", ["rp"]);
      this._actionCooldown = 15;
    }
  }

  // ── Optimal range calculation based on character archetype ──────────────

  private _updateOptimalRange(fighter: TekkenFighter): void {
    const charDef = TEKKEN_CHARACTERS.find(c => c.id === fighter.characterId);
    if (!charDef) return;

    switch (charDef.archetype) {
      case "rushdown":  this._optimalRange = 1.2; break;  // Berserker: fight close
      case "evasive":   this._optimalRange = 1.8; break;  // Assassin: hit-and-run
      case "power":     this._optimalRange = 1.5; break;  // Warlord: midrange power
      case "defensive": this._optimalRange = 2.0; break;  // Paladin: keep distance
      case "mixup":     this._optimalRange = 1.4; break;  // Monk: close for mixups
      default:          this._optimalRange = 1.6; break;  // Knight: balanced
    }
  }

  // ── Footsie phase tracking ─────────────────────────────────────────────

  private _updateFootsiePhase(_fighter: TekkenFighter, _opponent: TekkenFighter, dist: number): void {
    this._footsieTimer++;

    // Transition between footsie phases
    const rangeDiff = dist - this._optimalRange;

    if (rangeDiff > 1.5) {
      this._footsiePhase = "approach";
    } else if (rangeDiff > 0.3) {
      // Near optimal but slightly far - oscillate between approach and spacing
      if (this._footsieTimer > 30) {
        this._footsiePhase = Math.random() < 0.6 ? "approach" : "spacing";
        this._footsieTimer = 0;
      }
    } else if (rangeDiff > -0.5) {
      // At optimal range
      if (this._footsieTimer > 20) {
        this._footsiePhase = Math.random() < 0.5 ? "pressure" : "spacing";
        this._footsieTimer = 0;
      }
    } else {
      // Too close
      if (this._footsieTimer > 15) {
        const retreatChance = this._difficulty > 0.5 ? 0.4 : 0.2;
        this._footsiePhase = Math.random() < retreatChance ? "retreat" : "pressure";
        this._footsieTimer = 0;
      }
    }

    // Post-attack: brief retreat after recently attacking (if at high difficulty)
    if (this._frameCounter - this._lastAttackFrame < 30 && this._frameCounter - this._lastAttackFrame > 10) {
      if (this._difficulty > 0.5 && Math.random() < 0.3) {
        this._footsiePhase = "retreat";
      }
    }
  }

  // ── Footsie movement (used during cooldowns) ──────────────────────────

  private _doFootsieMovement(fighter: TekkenFighter, opponent: TekkenFighter, dist: number): void {
    const rangeDiff = dist - this._optimalRange;

    switch (this._footsiePhase) {
      case "approach":
        // Walk toward opponent to close distance
        this._walkToward(fighter, opponent);
        break;
      case "spacing":
        // Oscillate at optimal range: tiny movements forward/back
        if (rangeDiff > 0.2) {
          this._walkToward(fighter, opponent);
        } else if (rangeDiff < -0.2) {
          this._walkAway(fighter, opponent);
        }
        // Occasionally do nothing (stand and observe)
        break;
      case "pressure":
        // Walk forward aggressively
        this._walkToward(fighter, opponent);
        break;
      case "retreat":
        // Walk backward to create space
        this._walkAway(fighter, opponent);
        break;
    }
  }

  // ── Range-based decision making ────────────────────────────────────────

  private _decideVeryFarRange(fighter: TekkenFighter, opponent: TekkenFighter): void {
    const action = Math.random();

    if (action < 0.5) {
      // Dash forward to close distance quickly
      this._startDashForward(fighter, opponent);
      this._actionCooldown = 3;
    } else if (action < 0.8) {
      // Walk forward
      this._walkToward(fighter, opponent);
      this._actionCooldown = 4 + Math.floor(Math.random() * 4);
    } else {
      // Brief walk forward then sidestep (unpredictable approach)
      this._walkToward(fighter, opponent);
      this._actionCooldown = 6;
      // Queue a sidestep after walk
      this._startMovement("sidestep", 4);
    }
  }

  private _decideFarRange(fighter: TekkenFighter, opponent: TekkenFighter, _dist: number): void {
    const action = Math.random();
    const diffScale = this._difficulty;

    if (action < 0.20) {
      // Dash forward into attack range
      this._startDashForward(fighter, opponent);
      this._actionCooldown = 3;
    } else if (action < 0.35) {
      // Walk forward (footsie approach)
      this._walkToward(fighter, opponent);
      this._actionCooldown = 5 + Math.floor(Math.random() * 6);
    } else if (action < 0.50) {
      // Long range poke: advancing mid kick (f+3)
      this._doAttack(fighter, "f", ["lk"]);
      this._actionCooldown = 20 + Math.random() * 10;
      this._lastAttackFrame = this._frameCounter;
    } else if (action < 0.60) {
      // Elbow strike (f+2) to test the waters
      this._doAttack(fighter, "f", ["rp"]);
      this._actionCooldown = 18 + Math.random() * 10;
      this._lastAttackFrame = this._frameCounter;
    } else if (action < 0.72 && diffScale > 0.4) {
      // Sidestep then approach (lateral movement)
      this._startMovement("sidestep", 5);
      this._actionCooldown = 6;
    } else if (action < 0.82) {
      // Walk back briefly (bait whiff) then re-approach
      this._walkAway(fighter, opponent);
      this._actionCooldown = 8;
      this._footsiePhase = "spacing";
    } else if (action < 0.92 && diffScale > 0.6) {
      // Dash back (backdash to bait)
      this._startDashBack(fighter, opponent);
      this._actionCooldown = 5;
    } else {
      // Just walk forward
      this._walkToward(fighter, opponent);
      this._actionCooldown = 5;
    }
  }

  private _decideMidRange(fighter: TekkenFighter, opponent: TekkenFighter, _dist: number): void {
    const action = Math.random();
    const diffScale = this._difficulty;

    if (action < 0.20) {
      // Mid poke (d/f+1)
      this._doAttack(fighter, "d/f", ["lp"]);
      this._actionCooldown = 18 + Math.random() * 12;
      this._lastAttackFrame = this._frameCounter;
      // Retreat after poke on higher difficulty
      if (diffScale > 0.5 && Math.random() < 0.4) {
        this._postAttackRetreatFrames = 6 + Math.floor(Math.random() * 6);
      }
    } else if (action < 0.32) {
      // Front kick (3) - advancing mid
      this._doAttack(fighter, "n", ["lk"]);
      this._actionCooldown = 20 + Math.random() * 10;
      this._lastAttackFrame = this._frameCounter;
    } else if (action < 0.42) {
      // Launcher attempt (d/f+2) - risky but rewarding
      this._doAttack(fighter, "d/f", ["rp"]);
      this._actionCooldown = 25;
      this._lastAttackFrame = this._frameCounter;
    } else if (action < 0.50) {
      // Knee strike (f+4)
      this._doAttack(fighter, "f", ["rk"]);
      this._actionCooldown = 20 + Math.random() * 8;
      this._lastAttackFrame = this._frameCounter;
    } else if (action < 0.60) {
      // Walk forward into close range
      this._walkToward(fighter, opponent);
      this._actionCooldown = 4 + Math.floor(Math.random() * 5);
    } else if (action < 0.70 && diffScale > 0.4) {
      // Sidestep then attack (movement into offense)
      this._startMovement("sidestep", 4);
      this._actionCooldown = 5;
    } else if (action < 0.78) {
      // Walk back (spacing / whiff bait)
      this._walkAway(fighter, opponent);
      this._actionCooldown = 6 + Math.floor(Math.random() * 5);
    } else if (action < 0.86 && diffScale > 0.5) {
      // Backdash out of range
      this._startDashBack(fighter, opponent);
      this._actionCooldown = 5;
    } else if (action < 0.92) {
      // Spinning back kick (b+4) for homing
      this._doAttack(fighter, "b", ["rk"]);
      this._actionCooldown = 22 + Math.random() * 10;
      this._lastAttackFrame = this._frameCounter;
    } else {
      // Forward dash into pressure
      this._startDashForward(fighter, opponent);
      this._actionCooldown = 3;
    }
  }

  private _decideCloseRange(fighter: TekkenFighter, opponent: TekkenFighter, _dist: number): void {
    const action = Math.random();
    const diffScale = this._difficulty;

    if (action < 0.15) {
      // Jab (1) - fast poke
      this._doAttack(fighter, "n", ["lp"]);
      this._actionCooldown = 10 + Math.random() * 6;
      this._lastAttackFrame = this._frameCounter;
      // Retreat after jab series
      if (diffScale > 0.4 && Math.random() < 0.35) {
        this._postAttackRetreatFrames = 5 + Math.floor(Math.random() * 5);
      }
    } else if (action < 0.25) {
      // Low kick (d+3)
      this._doAttack(fighter, "d", ["lk"]);
      this._actionCooldown = 16 + Math.random() * 8;
      this._lastAttackFrame = this._frameCounter;
    } else if (action < 0.33) {
      // Throw attempt (1+3)
      this._doAttack(fighter, "n", ["lp", "lk"]);
      this._actionCooldown = 20;
      this._lastAttackFrame = this._frameCounter;
    } else if (action < 0.40) {
      // Forward grab slam (f+1+3)
      this._doAttack(fighter, "f", ["lp", "lk"]);
      this._actionCooldown = 22;
      this._lastAttackFrame = this._frameCounter;
    } else if (action < 0.50) {
      // Launcher (d+2)
      this._doAttack(fighter, "d", ["rp"]);
      this._actionCooldown = 25;
      this._lastAttackFrame = this._frameCounter;
    } else if (action < 0.58) {
      // Walk back (spacing) - create distance for whiff punish
      this._walkAway(fighter, opponent);
      this._actionCooldown = 8 + Math.floor(Math.random() * 5);
    } else if (action < 0.65 && diffScale > 0.4) {
      // Backdash to create space then reassess
      this._startDashBack(fighter, opponent);
      this._actionCooldown = 4;
    } else if (action < 0.72) {
      // Block preemptively
      this._doBlock(fighter, opponent);
      this._actionCooldown = 12 + Math.floor(Math.random() * 8);
    } else if (action < 0.80) {
      // Elbow strike (f+2)
      this._doAttack(fighter, "f", ["rp"]);
      this._actionCooldown = 16 + Math.random() * 8;
      this._lastAttackFrame = this._frameCounter;
      if (diffScale > 0.5 && Math.random() < 0.4) {
        this._postAttackRetreatFrames = 4 + Math.floor(Math.random() * 4);
      }
    } else if (action < 0.87 && diffScale > 0.5) {
      // Sidestep then counter (evasive movement)
      this._startMovement("sidestep", 4);
      this._actionCooldown = 5;
    } else if (action < 0.93) {
      // Hellsweep (d/b+3+4) - risky low launcher
      this._doAttack(fighter, "d/b", ["lk", "rk"]);
      this._actionCooldown = 25;
      this._lastAttackFrame = this._frameCounter;
    } else {
      // Jumping spin kick (u/f+4) - airborne launcher
      this._doAttack(fighter, "u/f", ["rk"]);
      this._actionCooldown = 24;
      this._lastAttackFrame = this._frameCounter;
    }
  }

  // ── Movement actions ───────────────────────────────────────────────────

  private _startMovement(action: "walk_fwd" | "walk_back" | "dash_fwd" | "dash_back" | "sidestep", duration: number): void {
    this._movementAction = action;
    this._movementTimer = duration;
  }

  private _startDashForward(fighter: TekkenFighter, opponent: TekkenFighter): void {
    // Simulate a quick dash by holding forward for a few frames
    this._startMovement("dash_fwd", 4 + Math.floor(Math.random() * 3));
    this._walkToward(fighter, opponent);
  }

  private _startDashBack(fighter: TekkenFighter, opponent: TekkenFighter): void {
    this._startMovement("dash_back", 4 + Math.floor(Math.random() * 3));
    this._walkAway(fighter, opponent);
  }

  private _executeMovement(fighter: TekkenFighter, opponent: TekkenFighter): void {
    switch (this._movementAction) {
      case "walk_fwd":
        this._walkToward(fighter, opponent);
        break;
      case "walk_back":
        this._walkAway(fighter, opponent);
        break;
      case "dash_fwd":
        this._walkToward(fighter, opponent);
        break;
      case "dash_back":
        this._walkAway(fighter, opponent);
        break;
      case "sidestep":
        // Sidestep: hold up or down briefly (simulates lateral movement)
        fighter.input.up = (this._movementTimer % 2 === 0);
        break;
    }
  }

  // ── Core helpers ───────────────────────────────────────────────────────

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
      case "u/b":
        fighter.input.up = true;
        if (isFacingRight) fighter.input.left = true;
        else fighter.input.right = true;
        break;
    }

    for (const btn of buttons) {
      if (btn === "lp") fighter.input.lp = true;
      if (btn === "rp") fighter.input.rp = true;
      if (btn === "lk") fighter.input.lk = true;
      if (btn === "rk") fighter.input.rk = true;
    }
  }

  private _doBlock(fighter: TekkenFighter, opponent: TekkenFighter): void {
    if (opponent.position.x > fighter.position.x) {
      fighter.input.left = true;
    } else {
      fighter.input.right = true;
    }

    if (Math.random() < this._difficulty * 0.6) {
      fighter.input.down = true;
    }
  }

  private _executeComboStep(fighter: TekkenFighter): void {
    if (this._comboDropped || this._comboIndex >= this._comboRoute.length) {
      this._isExecutingCombo = false;
      return;
    }

    if (fighter.state === TekkenFighterState.ATTACK) return;

    if (this._comboDelayTimer > 0) {
      this._comboDelayTimer--;
      return;
    }

    let dropChance = 0.05;
    let minDelay = 0;
    let maxDelay = 0;
    if (this._difficulty < 0.4) {
      dropChance = 0.40;
      minDelay = 3;
      maxDelay = 8;
    } else if (this._difficulty <= 0.7) {
      dropChance = 0.15;
      minDelay = 1;
      maxDelay = 3;
    } else {
      dropChance = 0.05;
      minDelay = 0;
      maxDelay = 0;
    }

    if (Math.random() < dropChance) {
      this._comboDropped = true;
      this._isExecutingCombo = false;
      return;
    }

    const step = this._comboRoute[this._comboIndex];
    this._comboIndex++;

    if (maxDelay > 0) {
      this._comboDelayTimer = minDelay + Math.floor(Math.random() * (maxDelay - minDelay + 1));
    }

    const numToBtn: Record<string, string> = { "1": "lp", "2": "rp", "3": "lk", "4": "rk" };

    const isDirectionPrefix = /^(n|f|b|d|u|d\/f|d\/b|u\/f|u\/b)(\+|$)/.test(step);
    const isBareNumber = /^[1-4]$/.test(step);
    const isBareNumCombo = /^[1-4]\+[1-4]$/.test(step);

    if (!isDirectionPrefix && !isBareNumber && !isBareNumCombo) {
      const charDef = TEKKEN_CHARACTERS.find(c => c.id === fighter.characterId);
      if (charDef) {
        const entry = charDef.moveList.find(e => e.move.id === step);
        if (entry && entry.input.length > 0) {
          const cmd = entry.input[0];
          this._doAttack(fighter, cmd.direction, cmd.buttons);
          return;
        }
      }
      return;
    }

    if (isBareNumber) {
      this._doAttack(fighter, "n", [numToBtn[step]]);
      return;
    }

    if (isBareNumCombo) {
      const nums = step.split("+");
      this._doAttack(fighter, "n", nums.map(n => numToBtn[n]).filter(Boolean));
      return;
    }

    const parts = step.split("+");
    const dir = parts[0] || "n";
    const btns = parts.slice(1).map(b => numToBtn[b] || b);

    this._doAttack(fighter, dir, btns);
  }
}
