// ---------------------------------------------------------------------------
// Duel mode – core fighting system (physics, hitboxes, blocking, damage)
// ---------------------------------------------------------------------------

import { AttackHeight, DuelFighterState } from "../../types";
import { DuelBalance } from "../config/DuelBalanceConfig";
import { DUEL_CHARACTERS } from "../config/DuelCharacterDefs";
import { DuelProjectileSystem } from "./DuelProjectileSystem";
import type {
  DuelFighter,
  DuelInputResult,
  DuelMoveDef,
  DuelState,
} from "../state/DuelState";

// ---- Public API ------------------------------------------------------------

export const DuelFightingSystem = {
  /** Advance one frame of fighting simulation. */
  update(
    state: DuelState,
    p1Input: DuelInputResult,
    p2Input: DuelInputResult,
  ): void {
    // Hit freeze: skip simulation
    if (state.slowdownFrames > 0) {
      state.slowdownFrames--;
      return;
    }

    // Update each fighter
    _updateFighter(state, 0, p1Input);
    _updateFighter(state, 1, p2Input);

    // Auto-face opponent
    _updateFacing(state);

    // Check melee hitbox collisions
    _checkHits(state, 0);
    _checkHits(state, 1);

    // Prevent overlap / push apart
    _pushApart(state);

    // Clamp to stage
    for (const f of state.fighters) {
      f.position.x = Math.max(
        state.stageLeft,
        Math.min(state.stageRight, f.position.x),
      );
    }

    // Timer
    if (state.round.timeRemaining > 0) {
      state.round.timeRemaining--;
    }
  },

  /** Reset fighters for a new round. */
  resetRound(state: DuelState): void {
    const p1Def = DUEL_CHARACTERS[state.fighters[0].characterId];
    const p2Def = DUEL_CHARACTERS[state.fighters[1].characterId];

    const p1X = Math.round(state.screenW * DuelBalance.P1_START_RATIO);
    const p2X = Math.round(state.screenW * DuelBalance.P2_START_RATIO);
    _resetFighter(state.fighters[0], p1X, true, p1Def.maxHp, state.stageFloorY);
    _resetFighter(state.fighters[1], p2X, false, p2Def.maxHp, state.stageFloorY);

    state.round.timeRemaining = DuelBalance.ROUND_TIME_FRAMES;
    state.round.winnerId = null;
    state.projectiles = [];
    state.slowdownFrames = 0;
  },

  /** Check if round should end. Returns winner index or -1. */
  checkRoundEnd(state: DuelState): number {
    const [f1, f2] = state.fighters;

    if (f1.hp <= 0 && f2.hp <= 0) {
      // Double KO — higher HP wins, or draw (P2 wins tie)
      return f1.hp >= f2.hp ? 0 : 1;
    }
    if (f1.hp <= 0) return 1;
    if (f2.hp <= 0) return 0;

    // Time out — more HP wins
    if (state.round.timeRemaining <= 0) {
      const p1Pct = f1.hp / f1.maxHp;
      const p2Pct = f2.hp / f2.maxHp;
      if (p1Pct > p2Pct) return 0;
      if (p2Pct > p1Pct) return 1;
      return 1; // tie goes to P2
    }

    return -1;
  },
};

// ---- Fighter update --------------------------------------------------------

function _updateFighter(
  state: DuelState,
  idx: number,
  input: DuelInputResult,
): void {
  const fighter = state.fighters[idx];
  const charDef = DUEL_CHARACTERS[fighter.characterId];

  // Increment animation timer (skip for states that count stateTimer down)
  if (
    fighter.state !== DuelFighterState.KNOCKDOWN &&
    fighter.state !== DuelFighterState.GET_UP
  ) {
    fighter.stateTimer++;
  }

  // Decrement timers
  if (fighter.invincibleFrames > 0) fighter.invincibleFrames--;
  if (fighter.hitstunFrames > 0) fighter.hitstunFrames--;
  if (fighter.blockstunFrames > 0) fighter.blockstunFrames--;

  // State-specific logic
  switch (fighter.state) {
    case DuelFighterState.HIT_STUN:
      if (fighter.hitstunFrames <= 0) {
        fighter.state = DuelFighterState.IDLE;
        fighter.comboCount = 0;
        fighter.comboDamage = 0;
        fighter.comboDamageScaling = 1;
      }
      return;

    case DuelFighterState.BLOCK_STAND:
    case DuelFighterState.BLOCK_CROUCH:
      if (fighter.blockstunFrames <= 0) {
        fighter.state = DuelFighterState.IDLE;
      }
      return;

    case DuelFighterState.DASH_FORWARD:
    case DuelFighterState.DASH_BACK: {
      fighter.dashFrames--;
      const dashDir = fighter.state === DuelFighterState.DASH_FORWARD
        ? (fighter.facingRight ? 1 : -1)
        : (fighter.facingRight ? -1 : 1);
      const dashSpd = fighter.state === DuelFighterState.DASH_FORWARD
        ? DuelBalance.DASH_FORWARD_SPEED
        : DuelBalance.DASH_BACK_SPEED;
      fighter.position.x += dashDir * dashSpd;
      if (fighter.dashFrames <= 0) {
        fighter.state = DuelFighterState.IDLE;
        fighter.velocity.x = 0;
      }
      return;
    }

    case DuelFighterState.KNOCKDOWN:
      fighter.stateTimer--;
      if (fighter.stateTimer <= 0) {
        fighter.state = DuelFighterState.GET_UP;
        fighter.stateTimer = 20;
        fighter.invincibleFrames = 20;
      }
      return;

    case DuelFighterState.GET_UP:
      fighter.stateTimer--;
      if (fighter.stateTimer <= 0) {
        fighter.state = DuelFighterState.IDLE;
      }
      return;

    case DuelFighterState.VICTORY:
    case DuelFighterState.DEFEAT:
      return;

    case DuelFighterState.GRABBED:
      if (fighter.hitstunFrames <= 0) {
        fighter.state = DuelFighterState.IDLE;
      }
      return;

    case DuelFighterState.ATTACK:
      _updateAttack(state, fighter, idx);
      return;

    case DuelFighterState.GRAB:
      _updateGrab(state, fighter, idx);
      return;

    default:
      break;
  }

  // Gravity (airborne)
  if (!fighter.grounded) {
    fighter.velocity.y += DuelBalance.GRAVITY;
    fighter.position.x += fighter.velocity.x;
    fighter.position.y += fighter.velocity.y;

    if (fighter.position.y >= state.stageFloorY) {
      fighter.position.y = state.stageFloorY;
      fighter.velocity.y = 0;
      fighter.velocity.x = 0;
      fighter.grounded = true;
      fighter.state = DuelFighterState.IDLE;
    }

    // Allow air attacks
    if (input.action) {
      _startMove(state, fighter, idx, input.action);
    }
    return;
  }

  // Grounded: process new action
  if (input.action) {
    _startMove(state, fighter, idx, input.action);
    return;
  }

  // Dash (double-tap)
  if (input.dashForward && fighter.grounded) {
    fighter.state = DuelFighterState.DASH_FORWARD;
    fighter.dashFrames = DuelBalance.DASH_DURATION;
    fighter.stateTimer = 0;
    return;
  }
  if (input.dashBack && fighter.grounded) {
    fighter.state = DuelFighterState.DASH_BACK;
    fighter.dashFrames = DuelBalance.DASH_DURATION;
    fighter.stateTimer = 0;
    fighter.invincibleFrames = DuelBalance.DASH_BACK_INVINCIBLE;
    return;
  }

  // Movement (back = walk back, blocking is resolved on hit)
  if (input.down) {
    fighter.state = DuelFighterState.CROUCH_IDLE;
  } else if (input.up && fighter.grounded) {
    // Jump
    fighter.grounded = false;
    fighter.velocity.y = charDef.jumpVelocity;
    if (input.forward) {
      fighter.velocity.x = (fighter.facingRight ? 1 : -1) * charDef.jumpForwardSpeed;
      fighter.state = DuelFighterState.JUMP_FORWARD;
    } else if (input.back) {
      fighter.velocity.x = (fighter.facingRight ? -1 : 1) * charDef.jumpForwardSpeed * 0.8;
      fighter.state = DuelFighterState.JUMP_BACK;
    } else {
      fighter.velocity.x = 0;
      fighter.state = DuelFighterState.JUMP;
    }
  } else if (input.forward) {
    fighter.state = DuelFighterState.WALK_FORWARD;
    const dir = fighter.facingRight ? 1 : -1;
    fighter.position.x += dir * charDef.walkSpeed;
  } else if (input.back) {
    fighter.state = DuelFighterState.WALK_BACK;
    const dir = fighter.facingRight ? -1 : 1;
    fighter.position.x += dir * charDef.backWalkSpeed;
  } else {
    fighter.state = DuelFighterState.IDLE;
  }
}

// ---- Attack state ----------------------------------------------------------

function _startMove(
  state: DuelState,
  fighter: DuelFighter,
  idx: number,
  moveId: string,
): void {
  const charDef = DUEL_CHARACTERS[fighter.characterId];
  const move =
    charDef.normals[moveId] ??
    charDef.specials[moveId] ??
    (moveId === "grab" ? charDef.grab : null);

  if (!move) return;

  fighter.state = moveId === "grab" ? DuelFighterState.GRAB : DuelFighterState.ATTACK;
  fighter.currentMove = moveId;
  fighter.moveFrame = 0;
  fighter.moveHasHit = false;
  fighter.stateTimer = move.startup + move.active + move.recovery;

  // Invincibility on some specials (e.g. Rising Slash)
  if (move.hasInvincibility && move.invincibleStartup) {
    fighter.invincibleFrames = move.invincibleStartup;
  }

  // Forward movement on some moves
  if (move.movesForward) {
    const dir = fighter.facingRight ? 1 : -1;
    fighter.velocity.x = dir * (move.movesForward / (move.startup + move.active));
  }

  // Backward movement (backflip shot etc.)
  if (move.movesBack) {
    const dir = fighter.facingRight ? -1 : 1;
    fighter.velocity.x = dir * (move.movesBack / (move.startup + move.active));
  }

  // Teleport special case
  if (moveId === "teleport") {
    const opponent = state.fighters[idx === 0 ? 1 : 0];
    const behindDist = 60;
    const dir = opponent.facingRight ? -1 : 1;
    fighter.position.x = opponent.position.x + dir * behindDist;
    fighter.facingRight = !opponent.facingRight;
  }
}

function _updateAttack(
  state: DuelState,
  fighter: DuelFighter,
  idx: number,
): void {
  const charDef = DUEL_CHARACTERS[fighter.characterId];
  const move =
    charDef.normals[fighter.currentMove!] ??
    charDef.specials[fighter.currentMove!];

  if (!move) {
    fighter.state = DuelFighterState.IDLE;
    return;
  }

  fighter.moveFrame++;

  // Apply forward/back velocity during startup+active
  if (fighter.moveFrame <= move.startup + move.active) {
    fighter.position.x += fighter.velocity.x;
  } else {
    fighter.velocity.x = 0;
  }

  // Spawn projectile at end of startup
  if (move.isProjectile && fighter.moveFrame === move.startup) {
    DuelProjectileSystem.spawn(state, idx, move);
  }

  // Move complete
  if (fighter.moveFrame >= move.startup + move.active + move.recovery) {
    fighter.state = DuelFighterState.IDLE;
    fighter.currentMove = null;
    fighter.moveFrame = 0;
    fighter.velocity.x = 0;
  }
}

function _updateGrab(
  state: DuelState,
  fighter: DuelFighter,
  idx: number,
): void {
  const charDef = DUEL_CHARACTERS[fighter.characterId];
  const grab = charDef.grab;

  fighter.moveFrame++;

  // Check grab connect during active frames
  if (
    fighter.moveFrame >= grab.startup &&
    fighter.moveFrame < grab.startup + grab.active &&
    !fighter.moveHasHit
  ) {
    const opponent = state.fighters[idx === 0 ? 1 : 0];
    if (_inGrabRange(fighter, opponent)) {
      // Grab connects! (unblockable)
      fighter.moveHasHit = true;
      opponent.hp -= grab.damage;
      opponent.state = DuelFighterState.GRABBED;
      opponent.stateTimer = 0;
      opponent.hitstunFrames = grab.hitstun;

      // Knockback
      const dir = fighter.facingRight ? 1 : -1;
      opponent.position.x += dir * grab.knockback;
      opponent.position.x = Math.max(
        state.stageLeft,
        Math.min(state.stageRight, opponent.position.x),
      );

      state.slowdownFrames = DuelBalance.HIT_FREEZE_FRAMES;
    }
  }

  // Grab whiff / complete
  if (fighter.moveFrame >= grab.startup + grab.active + grab.recovery) {
    fighter.state = DuelFighterState.IDLE;
    fighter.currentMove = null;
    fighter.moveFrame = 0;
  }
}

// ---- Hit detection ---------------------------------------------------------

function _checkHits(state: DuelState, attackerIdx: number): void {
  const attacker = state.fighters[attackerIdx];
  if (attacker.state !== DuelFighterState.ATTACK) return;
  if (attacker.moveHasHit) return;

  const charDef = DUEL_CHARACTERS[attacker.characterId];
  const move =
    charDef.normals[attacker.currentMove!] ??
    charDef.specials[attacker.currentMove!];

  if (!move) return;
  if (move.isProjectile) return; // handled by projectile system

  // Check if we're in active frames
  if (
    attacker.moveFrame < move.startup ||
    attacker.moveFrame >= move.startup + move.active
  ) return;

  const defenderIdx = attackerIdx === 0 ? 1 : 0;
  const defender = state.fighters[defenderIdx];

  if (defender.invincibleFrames > 0) return;
  if (
    defender.state === DuelFighterState.KNOCKDOWN ||
    defender.state === DuelFighterState.GET_UP ||
    defender.state === DuelFighterState.VICTORY ||
    defender.state === DuelFighterState.DEFEAT
  ) return;

  // AABB collision
  if (_hitboxOverlaps(attacker, defender, move)) {
    attacker.moveHasHit = true;
    _resolveHit(state, attacker, defender, move);
  }
}

function _hitboxOverlaps(
  attacker: DuelFighter,
  defender: DuelFighter,
  move: DuelMoveDef,
): boolean {
  const dir = attacker.facingRight ? 1 : -1;
  const hbX = attacker.position.x + dir * move.hitbox.x;
  const hbY = attacker.position.y + move.hitbox.y;
  const hbW = move.hitbox.width;
  const hbH = move.hitbox.height;

  // Hitbox rect (centered on hbX for flipped side)
  const hbLeft = dir > 0 ? hbX : hbX - hbW;
  const hbTop = hbY;

  // Defender hurtbox
  const isCrouching =
    defender.state === DuelFighterState.CROUCH ||
    defender.state === DuelFighterState.CROUCH_IDLE ||
    defender.state === DuelFighterState.BLOCK_CROUCH;
  const hurtH = isCrouching ? DuelBalance.CROUCH_HURTBOX_H : DuelBalance.STAND_HURTBOX_H;
  const hurtW = DuelBalance.STAND_HURTBOX_W;
  const dLeft = defender.position.x - hurtW / 2;
  const dTop = defender.position.y - hurtH;

  return (
    hbLeft < dLeft + hurtW &&
    hbLeft + hbW > dLeft &&
    hbTop < dTop + hurtH &&
    hbTop + hbH > dTop
  );
}

function _resolveHit(
  state: DuelState,
  attacker: DuelFighter,
  defender: DuelFighter,
  move: DuelMoveDef,
): void {
  const isBlocking = _isBlocking(defender, move);

  if (isBlocking) {
    // Enter block state reactively
    const crouching =
      defender.state === DuelFighterState.CROUCH ||
      defender.state === DuelFighterState.CROUCH_IDLE ||
      defender.state === DuelFighterState.BLOCK_CROUCH;
    defender.state = crouching
      ? DuelFighterState.BLOCK_CROUCH
      : DuelFighterState.BLOCK_STAND;
    defender.blockstunFrames = move.blockstun;
    defender.stateTimer = 0;
    if (move.type === "special") {
      defender.hp -= move.chipDamage;
    }
    // Push back on block
    const dir = attacker.facingRight ? 1 : -1;
    defender.position.x += dir * DuelBalance.PUSH_BACK_SPEED * 3;
  } else {
    // Hit!
    const scaling = attacker.comboDamageScaling;
    const damage = Math.max(1, Math.round(move.damage * scaling));
    defender.hp -= damage;

    if (move.isLauncher) {
      defender.state = DuelFighterState.KNOCKDOWN;
      defender.stateTimer = 40;
    } else {
      defender.state = DuelFighterState.HIT_STUN;
      defender.stateTimer = 0;
      defender.hitstunFrames = move.hitstun;
    }
    defender.currentMove = null;
    defender.moveFrame = 0;

    // Knockback
    const dir = attacker.facingRight ? 1 : -1;
    defender.position.x += dir * move.knockback;

    // Combo tracking
    attacker.comboCount++;
    attacker.comboDamage += damage;
    attacker.comboDamageScaling = Math.max(
      DuelBalance.MIN_DAMAGE_SCALING,
      attacker.comboDamageScaling * DuelBalance.COMBO_DAMAGE_SCALING,
    );

    // Hit freeze
    state.slowdownFrames = DuelBalance.HIT_FREEZE_FRAMES;
  }

  // Clamp positions
  defender.position.x = Math.max(
    state.stageLeft,
    Math.min(state.stageRight, defender.position.x),
  );
}

function _isHoldingBack(defender: DuelFighter): boolean {
  return defender.facingRight ? defender.input.left : defender.input.right;
}

function _isBlocking(defender: DuelFighter, move: DuelMoveDef): boolean {
  const holdingBack = _isHoldingBack(defender);
  if (!holdingBack) return false;

  const crouching =
    defender.state === DuelFighterState.CROUCH ||
    defender.state === DuelFighterState.CROUCH_IDLE;

  // Crouch block (holding down-back)
  if (crouching || defender.state === DuelFighterState.BLOCK_CROUCH) {
    return move.height !== AttackHeight.HIGH && move.height !== AttackHeight.OVERHEAD;
  }

  // Standing block (holding back while standing / walking back)
  if (
    defender.state === DuelFighterState.IDLE ||
    defender.state === DuelFighterState.WALK_BACK ||
    defender.state === DuelFighterState.BLOCK_STAND
  ) {
    return move.height !== AttackHeight.LOW;
  }

  return false;
}

// ---- Utility ---------------------------------------------------------------

function _updateFacing(state: DuelState): void {
  const [f1, f2] = state.fighters;
  // Only update facing when not in attack/hitstun
  if (_canChangeFacing(f1)) {
    f1.facingRight = f1.position.x < f2.position.x;
  }
  if (_canChangeFacing(f2)) {
    f2.facingRight = f2.position.x < f1.position.x;
  }
}

function _canChangeFacing(f: DuelFighter): boolean {
  return (
    f.state === DuelFighterState.IDLE ||
    f.state === DuelFighterState.WALK_FORWARD ||
    f.state === DuelFighterState.WALK_BACK ||
    f.state === DuelFighterState.CROUCH ||
    f.state === DuelFighterState.CROUCH_IDLE ||
    f.state === DuelFighterState.BLOCK_STAND ||
    f.state === DuelFighterState.BLOCK_CROUCH
  );
}

function _pushApart(state: DuelState): void {
  const [f1, f2] = state.fighters;
  const minDist = DuelBalance.STAND_HURTBOX_W;
  const dist = Math.abs(f1.position.x - f2.position.x);

  if (dist < minDist) {
    const overlap = (minDist - dist) / 2;
    if (f1.position.x < f2.position.x) {
      f1.position.x -= overlap;
      f2.position.x += overlap;
    } else {
      f1.position.x += overlap;
      f2.position.x -= overlap;
    }
  }
}

function _inGrabRange(attacker: DuelFighter, defender: DuelFighter): boolean {
  const dist = Math.abs(attacker.position.x - defender.position.x);
  return (
    dist <= DuelBalance.GRAB_RANGE &&
    defender.grounded &&
    defender.state !== DuelFighterState.KNOCKDOWN &&
    defender.state !== DuelFighterState.GET_UP &&
    defender.state !== DuelFighterState.GRABBED
  );
}

function _resetFighter(
  fighter: DuelFighter,
  x: number,
  facingRight: boolean,
  maxHp: number,
  floorY: number,
): void {
  fighter.position.x = x;
  fighter.position.y = floorY;
  fighter.velocity.x = 0;
  fighter.velocity.y = 0;
  fighter.facingRight = facingRight;
  fighter.hp = maxHp;
  fighter.maxHp = maxHp;
  fighter.state = DuelFighterState.IDLE;
  fighter.stateTimer = 0;
  fighter.currentMove = null;
  fighter.moveFrame = 0;
  fighter.moveHasHit = false;
  fighter.hitstunFrames = 0;
  fighter.blockstunFrames = 0;
  fighter.comboCount = 0;
  fighter.comboDamage = 0;
  fighter.comboDamageScaling = 1;
  fighter.grounded = true;
  fighter.invincibleFrames = 0;
  fighter.dashFrames = 0;
  fighter.inputBuffer = [];
}
