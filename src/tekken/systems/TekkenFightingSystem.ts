import { TekkenFighterState, TekkenAttackHeight } from "../../types";
import type { TekkenState, TekkenFighter, TekkenMoveDef, TekkenMoveEntry } from "../state/TekkenState";
import { TB } from "../config/TekkenBalanceConfig";
import { TEKKEN_CHARACTERS } from "../config/TekkenCharacterDefs";
import type { TekkenFXManager } from "../view/TekkenFXManager";

export class TekkenFightingSystem {
  update(state: TekkenState, fxManager: TekkenFXManager): void {
    for (let i = 0; i < 2; i++) {
      const fighter = state.fighters[i];
      const opponent = state.fighters[1 - i];

      // Decrement timers
      if (fighter.hitstunFrames > 0) fighter.hitstunFrames--;
      if (fighter.blockstunFrames > 0) fighter.blockstunFrames--;
      if (fighter.invincibleFrames > 0) fighter.invincibleFrames--;

      // Recovery from hitstun/blockstun
      if (fighter.hitstunFrames <= 0 && (
        fighter.state === TekkenFighterState.HIT_STUN_HIGH ||
        fighter.state === TekkenFighterState.HIT_STUN_MID ||
        fighter.state === TekkenFighterState.HIT_STUN_LOW
      )) {
        fighter.state = TekkenFighterState.IDLE;
        fighter.comboCount = 0;
        fighter.comboDamage = 0;
        fighter.comboDamageScaling = 1;
      }

      if (fighter.blockstunFrames <= 0 && (
        fighter.state === TekkenFighterState.BLOCK_STAND ||
        fighter.state === TekkenFighterState.BLOCK_CROUCH
      )) {
        fighter.state = fighter.crouching ? TekkenFighterState.CROUCH_IDLE : TekkenFighterState.IDLE;
      }

      // Knockdown recovery
      if (fighter.state === TekkenFighterState.KNOCKDOWN) {
        fighter.stateTimer++;
        if (fighter.stateTimer >= TB.KNOCKDOWN_DURATION) {
          fighter.state = TekkenFighterState.GET_UP;
          fighter.stateTimer = 0;
        }
      }
      if (fighter.state === TekkenFighterState.GET_UP) {
        fighter.stateTimer++;
        if (fighter.stateTimer >= TB.GET_UP_DURATION) {
          fighter.state = TekkenFighterState.IDLE;
          fighter.stateTimer = 0;
        }
      }

      // Wall splat recovery (allows wall-specific followups during window)
      if (fighter.state === TekkenFighterState.WALL_SPLAT) {
        fighter.stateTimer++;
        if (fighter.stateTimer >= TB.WALL_SPLAT_DURATION) {
          if (fighter.juggle.isAirborne) {
            fighter.state = TekkenFighterState.JUGGLE;
          } else {
            fighter.state = TekkenFighterState.KNOCKDOWN;
          }
          fighter.stateTimer = 0;
        }
      }

      // --- Rage activation: when health drops below 25%, activate rage ---
      if (!fighter.rageActive && !fighter.rageArtUsed && fighter.hp > 0 &&
          fighter.hp <= fighter.maxHp * TB.RAGE_THRESHOLD) {
        fighter.rageActive = true;
      }

      // Handle movement (only when idle or walking)
      if (this._canMove(fighter)) {
        this._handleMovement(fighter, opponent);
      }

      // Handle attack input
      if (this._canAttack(fighter)) {
        this._handleAttackInput(fighter, i);
      }

      // Progress attack animation
      if (fighter.state === TekkenFighterState.ATTACK) {
        this._progressAttack(fighter);
      }
    }

    // Hit detection (after both fighters have updated)
    for (let i = 0; i < 2; i++) {
      const attacker = state.fighters[i];
      const defender = state.fighters[1 - i];
      if (attacker.state === TekkenFighterState.ATTACK && attacker.movePhase === "active" && !attacker.moveHasHit) {
        this._checkHit(attacker, defender, state, fxManager);
      }
    }
  }

  private _canMove(fighter: TekkenFighter): boolean {
    return fighter.state === TekkenFighterState.IDLE ||
           fighter.state === TekkenFighterState.WALK_FORWARD ||
           fighter.state === TekkenFighterState.WALK_BACK ||
           fighter.state === TekkenFighterState.CROUCH_IDLE;
  }

  private _canAttack(fighter: TekkenFighter): boolean {
    return this._canMove(fighter) ||
           fighter.state === TekkenFighterState.CROUCH;
  }

  private _handleMovement(fighter: TekkenFighter, opponent: TekkenFighter): void {
    const input = fighter.input;
    const fwd = fighter.facingRight ? input.right : input.left;
    const back = fighter.facingRight ? input.left : input.right;

    if (input.down) {
      fighter.state = TekkenFighterState.CROUCH_IDLE;
      fighter.crouching = true;
    } else if (fwd && back) {
      fighter.state = TekkenFighterState.IDLE;
      fighter.crouching = false;
    } else if (fwd) {
      fighter.state = TekkenFighterState.WALK_FORWARD;
      fighter.crouching = false;
      const dir = fighter.facingRight ? 1 : -1;
      fighter.velocity.x = TB.WALK_SPEED * dir;
    } else if (back) {
      // Check if blocking (opponent is attacking)
      if (opponent.state === TekkenFighterState.ATTACK && opponent.movePhase === "active") {
        fighter.state = input.down ? TekkenFighterState.BLOCK_CROUCH : TekkenFighterState.BLOCK_STAND;
      } else {
        fighter.state = TekkenFighterState.WALK_BACK;
        fighter.crouching = false;
        const dir = fighter.facingRight ? -1 : 1;
        fighter.velocity.x = TB.BACK_WALK_SPEED * dir;
      }
    } else {
      if (fighter.state !== TekkenFighterState.CROUCH_IDLE) {
        fighter.state = TekkenFighterState.IDLE;
      }
      fighter.crouching = false;
      fighter.velocity.x = 0;
    }
  }

  private _handleAttackInput(fighter: TekkenFighter, _playerIndex: number): void {
    const input = fighter.input;
    const hasButton = input.lp || input.rp || input.lk || input.rk || input.rage;
    if (!hasButton) return;

    // Resolve direction
    const fwd = fighter.facingRight ? input.right : input.left;
    const back = fighter.facingRight ? input.left : input.right;
    let dir = "n";
    if (input.down && fwd) dir = "d/f";
    else if (input.down && back) dir = "d/b";
    else if (input.up && fwd) dir = "u/f";
    else if (input.up && back) dir = "u/b";
    else if (input.down) dir = "d";
    else if (input.up) dir = "u";
    else if (fwd) dir = "f";
    else if (back) dir = "b";

    // Find matching move from character's move list
    const charDef = TEKKEN_CHARACTERS.find(c => c.id === fighter.characterId);
    if (!charDef) return;

    // Check rage art - only usable when rageActive is true
    if (input.rage && fighter.rageActive && !fighter.rageArtUsed) {
      fighter.state = TekkenFighterState.ATTACK;
      fighter.currentMove = charDef.rageArt.id;
      fighter.moveFrame = 0;
      fighter.movePhase = "startup";
      fighter.moveHasHit = false;
      fighter.counterHitWindow = true;
      fighter.rageArtUsed = true;
      fighter.rageActive = false; // Consume rage on use
      return;
    }

    // Collect pressed buttons
    const buttons: string[] = [];
    if (input.lp) buttons.push("lp");
    if (input.rp) buttons.push("rp");
    if (input.lk) buttons.push("lk");
    if (input.rk) buttons.push("rk");

    // Find best matching move
    let bestMove: TekkenMoveEntry | null = null;
    let bestScore = -1;

    for (const entry of charDef.moveList) {
      if (entry.input.length !== 1) continue; // skip multi-input commands for now
      const cmd = entry.input[0];
      if (cmd.direction !== dir) continue;

      // Check button match
      const btnMatch = cmd.buttons.every(b => buttons.includes(b)) && buttons.every(b => cmd.buttons.includes(b));
      if (!btnMatch) continue;

      // Prefer more specific matches
      const score = cmd.buttons.length + (cmd.direction !== "n" ? 2 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestMove = entry;
      }
    }

    if (bestMove) {
      fighter.state = TekkenFighterState.ATTACK;
      fighter.currentMove = bestMove.move.id;
      fighter.moveFrame = 0;
      fighter.movePhase = "startup";
      fighter.moveHasHit = false;
      fighter.counterHitWindow = true;
      fighter.velocity.x = 0;
    }
  }

  private _progressAttack(fighter: TekkenFighter): void {
    fighter.moveFrame++;

    const moveDef = this._getMoveDef(fighter);
    if (!moveDef) {
      fighter.state = TekkenFighterState.IDLE;
      fighter.movePhase = "none";
      return;
    }

    // Counter-hit window expires after startup
    if (fighter.moveFrame > TB.COUNTER_HIT_WINDOW) {
      fighter.counterHitWindow = false;
    }

    if (fighter.movePhase === "startup" && fighter.moveFrame >= moveDef.startup) {
      fighter.movePhase = "active";
      fighter.moveFrame = 0;
      // Advance forward during active frames
      const dir = fighter.facingRight ? 1 : -1;
      fighter.velocity.x = moveDef.advanceDistance * dir / Math.max(1, moveDef.active);
    } else if (fighter.movePhase === "active" && fighter.moveFrame >= moveDef.active) {
      fighter.movePhase = "recovery";
      fighter.moveFrame = 0;
      fighter.velocity.x = 0;
    } else if (fighter.movePhase === "recovery" && fighter.moveFrame >= moveDef.recovery) {
      fighter.state = TekkenFighterState.IDLE;
      fighter.movePhase = "none";
      fighter.currentMove = null;
      fighter.moveFrame = 0;
    }
  }

  private _checkHit(attacker: TekkenFighter, defender: TekkenFighter, state: TekkenState, fxManager: TekkenFXManager): void {
    const moveDef = this._getMoveDef(attacker);
    if (!moveDef) return;

    // Simple distance-based hit detection
    const dx = Math.abs(attacker.position.x - defender.position.x);
    const hitRange = moveDef.hitbox.w + 0.2; // base range + tolerance

    if (dx > hitRange) return;

    // Height check: HIGH attacks whiff on crouching
    if (moveDef.height === TekkenAttackHeight.HIGH && defender.crouching) {
      return; // Whiff! High attack goes over crouching opponent
    }

    attacker.moveHasHit = true;

    // Check blocking
    const isBlocking = defender.state === TekkenFighterState.BLOCK_STAND ||
                       defender.state === TekkenFighterState.BLOCK_CROUCH;

    if (isBlocking) {
      const blocked = this._checkBlock(moveDef, defender);
      if (blocked) {
        this._applyBlock(attacker, defender, moveDef, state, fxManager);
        return;
      }
    }

    // Check if defender is in counter-hit state
    const isCounterHit = defender.counterHitWindow &&
                         defender.state === TekkenFighterState.ATTACK;

    // Apply hit
    this._applyHit(attacker, defender, moveDef, isCounterHit, state, fxManager);
  }

  private _checkBlock(moveDef: TekkenMoveDef, defender: TekkenFighter): boolean {
    const standBlock = defender.state === TekkenFighterState.BLOCK_STAND;
    const crouchBlock = defender.state === TekkenFighterState.BLOCK_CROUCH;

    switch (moveDef.height) {
      case TekkenAttackHeight.HIGH:
        return standBlock; // Standing block blocks high
      case TekkenAttackHeight.MID:
        return standBlock || crouchBlock; // Both block mid
      case TekkenAttackHeight.LOW:
        return crouchBlock; // Only crouch blocks low
      case TekkenAttackHeight.OVERHEAD:
        return false; // Unblockable
    }
  }

  private _applyBlock(attacker: TekkenFighter, defender: TekkenFighter, moveDef: TekkenMoveDef, state: TekkenState, fxManager: TekkenFXManager): void {
    // Apply blockstun using the move's onBlock frame advantage
    // onBlock is negative = attacker is at disadvantage (defender recovers first)
    // onBlock is positive = attacker is at advantage (attacker recovers first)
    defender.blockstunFrames = TB.BASE_BLOCKSTUN + Math.abs(moveDef.onBlock);

    // If the move is plus on block, the attacker recovers faster (reduce attacker recovery)
    if (moveDef.onBlock > 0) {
      // Positive on block: attacker has frame advantage, shorten remaining recovery
      const currentMoveDef = this._getMoveDef(attacker);
      if (currentMoveDef) {
        // Give attacker frame advantage by reducing effective recovery
        attacker.moveFrame = Math.max(attacker.moveFrame, (currentMoveDef.recovery || 0) - moveDef.onBlock);
      }
    }

    // Chip damage
    defender.hp = Math.max(1, defender.hp - moveDef.chipDamage);

    // Check rage activation after chip damage
    if (!defender.rageActive && !defender.rageArtUsed && defender.hp > 0 &&
        defender.hp <= defender.maxHp * TB.RAGE_THRESHOLD) {
      defender.rageActive = true;
    }

    // Pushback
    const pushDir = defender.facingRight ? -1 : 1;
    defender.velocity.x = TB.BLOCK_PUSHBACK * pushDir;
    attacker.velocity.x = TB.BLOCK_PUSHBACK * 0.3 * -pushDir;

    // VFX: small block spark
    const hitX = (attacker.position.x + defender.position.x) / 2;
    const hitY = moveDef.hitbox.y;
    fxManager.spawnBlockSpark(hitX, hitY, 0);

    // Camera shake (light)
    state.cameraState.shakeIntensity = TB.CAMERA_SHAKE_LIGHT;
  }

  private _applyHit(
    attacker: TekkenFighter,
    defender: TekkenFighter,
    moveDef: TekkenMoveDef,
    isCounterHit: boolean,
    state: TekkenState,
    fxManager: TekkenFXManager,
  ): void {
    // Calculate damage with scaling
    let damage = moveDef.damage;
    if (isCounterHit) damage *= 1.2;
    // Apply rage damage bonus (1.3x when rage is active)
    if (attacker.rageActive) damage *= 1.3;
    damage = Math.round(damage * attacker.comboDamageScaling);
    damage = Math.max(1, damage);

    defender.hp = Math.max(0, defender.hp - damage);

    // Check rage activation after taking damage
    if (!defender.rageActive && !defender.rageArtUsed && defender.hp > 0 &&
        defender.hp <= defender.maxHp * TB.RAGE_THRESHOLD) {
      defender.rageActive = true;
    }

    // Track combo
    attacker.comboCount++;
    attacker.comboDamage += damage;
    attacker.comboDamageScaling = Math.max(
      TB.MIN_DAMAGE_SCALING,
      attacker.comboDamageScaling * TB.COMBO_DAMAGE_SCALING,
    );

    // Hitstun - apply onCounterHit bonus effects
    let hitstun = TB.BASE_HITSTUN + moveDef.onHit;
    if (isCounterHit) {
      hitstun += TB.COUNTER_HIT_BONUS + moveDef.onCounterHit;
    }
    defender.hitstunFrames = hitstun;

    // Knockback
    const pushDir = defender.facingRight ? -1 : 1;
    defender.velocity.x = moveDef.knockback * pushDir;

    // Determine hit reaction
    // Counter-hit on a launcher move: always launch even if the move isn't normally a launcher
    const shouldLaunch = moveDef.isLauncher || (isCounterHit && moveDef.onCounterHit >= 8);

    if (shouldLaunch && defender.grounded) {
      // Launch!
      defender.state = TekkenFighterState.JUGGLE;
      defender.grounded = false;
      defender.juggle.isAirborne = true;
      // Counter-hit launchers get extra launch height
      const launchBoost = isCounterHit ? 1.15 : 1.0;
      defender.juggle.velocity.y = moveDef.launchHeight * launchBoost;
      defender.juggle.velocity.x = moveDef.knockback * 0.5 * pushDir;
      defender.juggle.hitCount = 1;
      defender.juggle.gravityScale = 1;
      defender.juggle.screwUsed = false;
      defender.juggle.boundUsed = false;
      defender.juggle.isWallSplatted = false;
      defender.juggle.wallSplatFrames = 0;
      // Store per-move launch gravity for physics system
      defender.juggle.currentLaunchGravity = moveDef.launchGravity;

      // Hit freeze (launcher)
      state.slowdownFrames = TB.HIT_FREEZE_LAUNCHER;
      state.slowdownScale = 0.15;
      state.cameraState.shakeIntensity = TB.CAMERA_SHAKE_HEAVY;
    } else if (!defender.grounded || defender.juggle.isAirborne) {
      // Juggle hit
      defender.juggle.hitCount++;
      defender.juggle.gravityScale += TB.JUGGLE_GRAVITY_SCALE_PER_HIT;

      if (moveDef.isScrew && !defender.juggle.screwUsed) {
        defender.juggle.screwUsed = true;
        defender.juggle.velocity.y = moveDef.launchHeight * 0.6;
      } else if (moveDef.isBound && !defender.juggle.boundUsed && defender.position.y <= 0.1) {
        defender.juggle.boundUsed = true;
        defender.juggle.velocity.y = TB.BOUND_BOUNCE_VEL;
      } else {
        defender.juggle.velocity.y += 0.05;
      }
      defender.juggle.velocity.x = moveDef.knockback * 0.3 * pushDir;

      // Wall splat followup: hitting a wall-splatted opponent gives bonus damage
      if (defender.juggle.isWallSplatted) {
        // Wall combo bonus - extra hitstun for wall followups
        defender.hitstunFrames += 4;
      }

      state.slowdownFrames = TB.HIT_FREEZE_MEDIUM;
      state.slowdownScale = 0.3;
      state.cameraState.shakeIntensity = TB.CAMERA_SHAKE_MEDIUM;
    } else {
      // Grounded hit
      switch (moveDef.height) {
        case TekkenAttackHeight.HIGH:
          defender.state = TekkenFighterState.HIT_STUN_HIGH;
          break;
        case TekkenAttackHeight.MID:
          defender.state = TekkenFighterState.HIT_STUN_MID;
          break;
        case TekkenAttackHeight.LOW:
          defender.state = TekkenFighterState.HIT_STUN_LOW;
          break;
        default:
          defender.state = TekkenFighterState.HIT_STUN_MID;
      }

      // Hit freeze
      const freeze = damage > 20 ? TB.HIT_FREEZE_HEAVY :
                     damage > 12 ? TB.HIT_FREEZE_MEDIUM :
                     TB.HIT_FREEZE_LIGHT;
      state.slowdownFrames = isCounterHit ? TB.HIT_FREEZE_COUNTER : freeze;
      state.slowdownScale = isCounterHit ? 0.1 : 0.3;
      state.cameraState.shakeIntensity = damage > 20 ? TB.CAMERA_SHAKE_HEAVY :
                                         damage > 12 ? TB.CAMERA_SHAKE_MEDIUM :
                                         TB.CAMERA_SHAKE_LIGHT;
    }

    // Cancel attacker's current attack state if interrupted
    if (defender.state === TekkenFighterState.ATTACK) {
      defender.currentMove = null;
      defender.movePhase = "none";
    }

    // Wall splat check
    if (moveDef.wallSplat && Math.abs(defender.position.x) >= TB.STAGE_HALF_WIDTH - 0.3) {
      defender.juggle.wallSplatActive = true;
      defender.juggle.wallSplatTimer = TB.WALL_SPLAT_DURATION;
      defender.juggle.isWallSplatted = true;
      defender.juggle.wallSplatFrames = TB.WALL_SPLAT_DURATION;
      defender.velocity.x = 0;
      defender.state = TekkenFighterState.WALL_SPLAT;
      defender.stateTimer = 0;
      state.cameraState.shakeIntensity = TB.CAMERA_SHAKE_HEAVY;
    }

    // Spawn VFX
    const hitX = (attacker.position.x + defender.position.x) / 2;
    const hitY = moveDef.hitbox.y;
    const sparkCount = damage > 20 ? TB.SPARK_COUNT_HEAVY : TB.SPARK_COUNT_LIGHT;
    fxManager.spawnHitSpark(hitX, hitY, 0, sparkCount, isCounterHit);

    if (isCounterHit) {
      fxManager.spawnCounterFlash();
    }
  }

  private _getMoveDef(fighter: TekkenFighter): TekkenMoveDef | null {
    if (!fighter.currentMove) return null;
    const charDef = TEKKEN_CHARACTERS.find(c => c.id === fighter.characterId);
    if (!charDef) return null;

    // Check rage art
    if (fighter.currentMove === charDef.rageArt.id) return charDef.rageArt;

    // Search move list
    for (const entry of charDef.moveList) {
      if (entry.move.id === fighter.currentMove) return entry.move;
    }
    return null;
  }
}
