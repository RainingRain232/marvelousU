// ---------------------------------------------------------------------------
// Duel mode – AI opponent system (enhanced with adaptive behavior,
// spacing awareness, defensive depth, combo intelligence, health awareness)
// ---------------------------------------------------------------------------

import { DuelFighterState } from "../../types";
import { DuelBalance } from "../config/DuelBalanceConfig";
import { DUEL_CHARACTERS } from "../config/DuelCharacterDefs";
import type { DuelInputResult, DuelState, DuelFighter } from "../state/DuelState";

// AI internal state
let _reactionTimer = 0;
let _actionCooldown = 0;
let _currentDecision: string | null = null;
let _comboSequence: string[] = [];
let _comboStep = 0;

// Adaptive behavior tracking
let _consecutiveHits = 0;      // how many times AI hit player recently
let _consecutiveBlocked = 0;   // how many times player blocked AI
let _lastPlayerAction: string | null = null; // what the player last did (for pattern recognition)
let _footsiePhase: "approach" | "spacing" | "pressure" | "retreat" = "approach";
let _footsieTimer = 0;
let _postAttackRetreatFrames = 0;

// Pre-built combo routes per fighter type with difficulty tiers.
const COMBO_ROUTES: Record<string, { basic: string[][]; advanced: string[][]; expert: string[][] }> = {
  sword: {
    basic: [
      ["light_high", "light_high", "med_high"],
      ["light_low", "med_high", "heavy_high"],
    ],
    advanced: [
      ["light_high", "light_high", "med_high", "heavy_high"],
      ["light_low", "light_high", "med_high", "heavy_high"],
    ],
    expert: [
      ["light_high", "light_high", "med_high", "heavy_high", "heavy_high"],
      ["light_low", "light_high", "med_high", "heavy_low", "heavy_high"],
    ],
  },
  mage: {
    basic: [
      ["light_high", "light_high", "med_high"],
      ["light_low", "med_low"],
    ],
    advanced: [
      ["light_high", "light_high", "med_high", "heavy_high"],
      ["light_low", "light_high", "med_high"],
    ],
    expert: [
      ["light_high", "med_high", "heavy_high", "heavy_high"],
      ["light_low", "light_high", "med_high", "heavy_high"],
    ],
  },
  archer: {
    basic: [
      ["light_high", "light_high", "med_high"],
      ["light_low", "med_high"],
    ],
    advanced: [
      ["light_high", "light_high", "med_high", "heavy_high"],
      ["light_low", "light_high", "med_high", "heavy_high"],
    ],
    expert: [
      ["light_high", "light_high", "med_high", "heavy_high", "heavy_high"],
      ["light_low", "med_low", "heavy_low", "heavy_high"],
    ],
  },
  spear: {
    basic: [
      ["light_high", "light_high", "med_high"],
      ["light_low", "med_low", "heavy_low"],
    ],
    advanced: [
      ["light_high", "light_high", "med_high", "heavy_high"],
      ["light_low", "light_high", "med_high", "heavy_high"],
    ],
    expert: [
      ["light_high", "med_high", "heavy_high", "heavy_high"],
      ["light_low", "light_high", "med_high", "heavy_low", "heavy_high"],
    ],
  },
  axe: {
    basic: [
      ["light_high", "light_high", "med_high"],
      ["light_low", "med_low"],
    ],
    advanced: [
      ["light_high", "light_high", "med_high", "heavy_high"],
      ["light_low", "light_high", "med_high"],
    ],
    expert: [
      ["light_high", "med_high", "heavy_high", "heavy_high"],
      ["light_low", "med_low", "heavy_low", "heavy_high"],
    ],
  },
};

// Fighter type optimal ranges
const OPTIMAL_RANGES: Record<string, number> = {
  sword: 90,
  mage: 140,
  archer: 160,
  spear: 120,
  axe: 80,
};

export const DuelAISystem = {
  /** Generate AI input for fighter[1] based on game state and difficulty. */
  update(state: DuelState, difficulty: number): DuelInputResult {
    const ai = state.fighters[1];
    const player = state.fighters[0];

    const result: DuelInputResult = {
      left: false,
      right: false,
      up: false,
      down: false,
      forward: false,
      back: false,
      dashForward: false,
      dashBack: false,
      action: null,
    };

    // Can't act in these states
    if (
      ai.state === DuelFighterState.HIT_STUN ||
      ai.state === DuelFighterState.KNOCKDOWN ||
      ai.state === DuelFighterState.GET_UP ||
      ai.state === DuelFighterState.GRABBED ||
      ai.state === DuelFighterState.VICTORY ||
      ai.state === DuelFighterState.DEFEAT
    ) {
      _comboSequence = [];
      _comboStep = 0;
      return result;
    }

    const dist = Math.abs(ai.position.x - player.position.x);
    const reactionSpeed = [20, 8, 4, 2][difficulty] ?? 8;
    const blockChance = [0.2, 0.55, 0.8, 0.95][difficulty] ?? 0.55;

    // Health awareness
    const aiHpPct = ai.hp / ai.maxHp;
    const playerHpPct = player.hp / player.maxHp;
    const healthAdvantage = aiHpPct - playerHpPct;

    const charDef = DUEL_CHARACTERS[ai.characterId];
    const optimalRange = OPTIMAL_RANGES[charDef.fighterType] ?? 100;

    // === Post-attack retreat ===
    if (_postAttackRetreatFrames > 0) {
      _postAttackRetreatFrames--;
      result.back = true;
      if (ai.facingRight) result.left = true;
      else result.right = true;
      return result;
    }

    // === If we're in a combo sequence, keep going ===
    if (_comboSequence.length > 0 && _comboStep < _comboSequence.length) {
      if (ai.state === DuelFighterState.ATTACK || ai.state === DuelFighterState.GRAB) {
        return result;
      }

      if (_comboStep > 0 && player.state !== DuelFighterState.HIT_STUN &&
          player.state !== DuelFighterState.KNOCKDOWN &&
          player.state !== DuelFighterState.GRABBED) {
        _comboSequence = [];
        _comboStep = 0;
        _consecutiveBlocked++;
      } else {
        result.action = _comboSequence[_comboStep];
        _comboStep++;
        if (_comboStep >= _comboSequence.length) {
          _comboSequence = [];
          _comboStep = 0;
          _consecutiveHits++;
          // Smart retreat after combo on higher difficulties
          if (difficulty >= 1 && Math.random() < 0.4 + difficulty * 0.1) {
            _postAttackRetreatFrames = 4 + Math.floor(Math.random() * 6);
          }
        }
        return result;
      }
    }

    // === Currently attacking, wait for it to finish ===
    if (ai.state === DuelFighterState.ATTACK || ai.state === DuelFighterState.GRAB) {
      return result;
    }

    // === Enhanced block reaction — when player is attacking nearby ===
    if (
      (player.state === DuelFighterState.ATTACK ||
       player.state === DuelFighterState.GRAB) &&
      dist < 140
    ) {
      // Higher block chance when AI is low on health (self-preservation)
      const adaptedBlockChance = aiHpPct < 0.3 ? Math.min(0.98, blockChance + 0.15) : blockChance;

      if (Math.random() < adaptedBlockChance) {
        const playerMove = player.currentMove;
        const playerCharDef = DUEL_CHARACTERS[player.characterId];
        const move =
          playerCharDef.normals[playerMove ?? ""] ??
          playerCharDef.specials[playerMove ?? ""];

        if (move && move.height === "low") {
          result.back = true;
          result.down = true;
          if (ai.facingRight) result.left = true;
          else result.right = true;
        } else {
          result.back = true;
          if (ai.facingRight) result.left = true;
          else result.right = true;
        }

        // Track what the player does for pattern adaptation
        _lastPlayerAction = playerMove ?? null;
        return result;
      }

      // On hard+, attempt to backdash out of pressure instead of getting hit
      if (difficulty >= 2 && Math.random() < 0.3) {
        result.dashBack = true;
        return result;
      }
    }

    // === Whiff punishment — punish opponent's recovery frames ===
    if (difficulty >= 1 && dist < 130 &&
        player.state === DuelFighterState.ATTACK &&
        player.currentMove) {
      // Check if player is in recovery (their attack animation is finishing)
      const punishChance = [0, 0.2, 0.5, 0.8][difficulty] ?? 0.2;
      if (Math.random() < punishChance) {
        // Punish with a fast attack
        result.action = "light_high";
        _currentDecision = null;
        return result;
      }
    }

    // === Decision cooldown ===
    if (_actionCooldown > 0) {
      _actionCooldown--;
      if (_currentDecision) {
        _applyMovementDecision(_currentDecision, ai, result);
      }
      return result;
    }

    // === Reaction timer ===
    _reactionTimer++;
    if (_reactionTimer < reactionSpeed) {
      // Footsie movement during reaction delay
      _updateFootsiePhase(dist, optimalRange, healthAdvantage, difficulty);
      _applyFootsieMovement(ai, result, dist, optimalRange);
      return result;
    }

    _reactionTimer = 0;
    _actionCooldown = Math.max(2, Math.floor(reactionSpeed / 3));

    // === Make a new decision ===
    const rand = Math.random();

    // === Zeal ultimate: smarter usage based on situation ===
    const zealKeys = Object.keys(charDef.zeals);
    if (zealKeys.length > 0) {
      const playerVulnerable =
        player.state === DuelFighterState.HIT_STUN ||
        player.state === DuelFighterState.KNOCKDOWN ||
        player.state === DuelFighterState.GET_UP ||
        player.state === DuelFighterState.GRABBED;

      // Zeal 2: use as a finisher when it would kill, or when very low HP (desperation)
      if (ai.zealGauge >= DuelBalance.ZEAL_2_COST) {
        const useZeal2 = (playerHpPct < 0.25 && dist < 120) || // finisher
                         (aiHpPct < 0.15 && dist < 150) || // desperation
                         (playerVulnerable && dist < 100);  // guaranteed hit
        if (useZeal2) {
          result.action = "zeal_2";
          _currentDecision = null;
          return result;
        }
      }

      // Zeal 1: use in combos or when opponent is recovering nearby
      if (ai.zealGauge >= DuelBalance.ZEAL_1_COST && playerVulnerable && dist < 120) {
        result.action = "zeal_1";
        _currentDecision = null;
        return result;
      }
    }

    // === Adaptive strategy based on what's been working ===
    // If blocks are frequent, use more lows and grabs
    const shouldMixupMore = _consecutiveBlocked > 2;
    // If hits are landing, keep pressing
    const shouldKeepPressure = _consecutiveHits > 1;

    // === Close range ===
    if (dist < 70) {
      _decideCloseRange(ai, player, difficulty, charDef, rand, result,
        shouldMixupMore, shouldKeepPressure, aiHpPct, healthAdvantage);
      return result;
    }

    // === Mid range ===
    if (dist < 160) {
      _decideMidRange(ai, player, difficulty, charDef, rand, result, dist, optimalRange, healthAdvantage);
      return result;
    }

    // === Far range ===
    _decideFarRange(ai, player, difficulty, charDef, rand, result, dist, optimalRange);
    return result;
  },

  reset(): void {
    _reactionTimer = 0;
    _actionCooldown = 0;
    _currentDecision = null;
    _comboSequence = [];
    _comboStep = 0;
    _consecutiveHits = 0;
    _consecutiveBlocked = 0;
    _lastPlayerAction = null;
    _footsiePhase = "approach";
    _footsieTimer = 0;
    _postAttackRetreatFrames = 0;
  },
};

// ---------------------------------------------------------------------------
// Footsie system (spacing awareness)
// ---------------------------------------------------------------------------

function _updateFootsiePhase(
  dist: number, optimalRange: number, healthAdvantage: number, difficulty: number,
): void {
  _footsieTimer++;
  if (_footsieTimer < 10 + (3 - difficulty) * 5) return;
  _footsieTimer = 0;

  const rangeDiff = dist - optimalRange;

  if (rangeDiff > 80) {
    _footsiePhase = "approach";
  } else if (rangeDiff > 20) {
    _footsiePhase = Math.random() < 0.5 + healthAdvantage * 0.2 ? "approach" : "spacing";
  } else if (rangeDiff > -30) {
    _footsiePhase = Math.random() < 0.4 ? "pressure" : "spacing";
  } else {
    // Too close — defensive AI retreats, aggressive stays
    _footsiePhase = healthAdvantage < -0.2 ? "retreat" : Math.random() < 0.4 ? "retreat" : "pressure";
  }
}

function _applyFootsieMovement(
  ai: DuelFighter, result: DuelInputResult, dist: number, optimalRange: number,
): void {
  switch (_footsiePhase) {
    case "approach":
      result.forward = true;
      if (ai.facingRight) result.right = true;
      else result.left = true;
      break;
    case "retreat":
      result.back = true;
      if (ai.facingRight) result.left = true;
      else result.right = true;
      break;
    case "spacing":
      if (dist > optimalRange + 15) {
        result.forward = true;
        if (ai.facingRight) result.right = true;
        else result.left = true;
      } else if (dist < optimalRange - 15) {
        result.back = true;
        if (ai.facingRight) result.left = true;
        else result.right = true;
      }
      break;
    case "pressure":
      result.forward = true;
      if (ai.facingRight) result.right = true;
      else result.left = true;
      break;
  }
}

// ---------------------------------------------------------------------------
// Range-based decision making
// ---------------------------------------------------------------------------

function _decideCloseRange(
  ai: DuelFighter, _player: DuelFighter, difficulty: number,
  charDef: (typeof DUEL_CHARACTERS)[string],
  rand: number, result: DuelInputResult,
  shouldMixupMore: boolean, shouldKeepPressure: boolean,
  aiHpPct: number, healthAdvantage: number,
): void {
  // Desperation mode: when low HP, play more risky
  if (aiHpPct < 0.2 && Math.random() < 0.3) {
    // All-in: grab or heavy attack
    if (Math.random() < 0.5) {
      result.action = "grab";
    } else {
      result.action = "heavy_high";
    }
    _currentDecision = null;
    return;
  }

  // Adapt to player's last action: if they threw a high, go low; if low, go high
  const playerUsedLow = _lastPlayerAction?.includes("low") ?? false;

  // Grab (more likely if opponent keeps blocking)
  const grabChance = shouldMixupMore ? 0.22 : playerUsedLow ? 0.15 : 0.10;
  if (rand < grabChance) {
    result.action = "grab";
    _currentDecision = null;
    _consecutiveBlocked = 0;
    return;
  }

  // Start a combo
  const comboChance = shouldKeepPressure ? 0.60 : 0.45;
  if (rand < grabChance + comboChance) {
    const routeSet = COMBO_ROUTES[charDef.fighterType] ?? COMBO_ROUTES.sword;
    let routes: string[][];
    if (difficulty >= 3 && routeSet.expert.length > 0) {
      routes = routeSet.expert;
    } else if (difficulty >= 2 && routeSet.advanced.length > 0) {
      routes = routeSet.advanced;
    } else {
      routes = routeSet.basic;
    }

    // Choose a mixup route if opponent has been blocking (use lows)
    let route: string[];
    if (shouldMixupMore) {
      const lowRoutes = routes.filter(r => r[0].includes("low"));
      route = lowRoutes.length > 0
        ? lowRoutes[Math.floor(Math.random() * lowRoutes.length)]
        : routes[Math.floor(Math.random() * routes.length)];
    } else {
      route = routes[Math.floor(Math.random() * routes.length)];
    }

    _comboSequence = [...route];
    _comboStep = 0;
    result.action = _comboSequence[_comboStep];
    _comboStep++;
    _currentDecision = null;
    return;
  }

  // Single attack (poke)
  if (rand < grabChance + comboChance + 0.15) {
    // Smart poke selection: low to open up blockers, high for speed
    if (shouldMixupMore && Math.random() < 0.6) {
      result.action = "light_low";
    } else {
      const normalIds = Object.keys(charDef.normals);
      result.action = normalIds[Math.floor(Math.random() * normalIds.length)];
    }
    _currentDecision = null;
    // Retreat after poke on higher difficulties
    if (difficulty >= 1 && Math.random() < 0.3) {
      _postAttackRetreatFrames = 3 + Math.floor(Math.random() * 4);
    }
    return;
  }

  // Retreat (more likely when losing)
  if (healthAdvantage < -0.15 || Math.random() < 0.15) {
    _currentDecision = "retreat";
    _applyMovementDecision(_currentDecision, ai, result);
    return;
  }

  // Backdash on higher difficulties
  if (difficulty >= 2 && Math.random() < 0.2) {
    result.dashBack = true;
    _currentDecision = null;
    return;
  }

  // Default: approach or poke
  result.action = "light_high";
  _currentDecision = null;
}

function _decideMidRange(
  ai: DuelFighter, _player: DuelFighter, difficulty: number,
  charDef: (typeof DUEL_CHARACTERS)[string],
  rand: number, result: DuelInputResult,
  dist: number, optimalRange: number, healthAdvantage: number,
): void {
  const isInsideRange = dist < optimalRange;

  if (rand < 0.25 + (isInsideRange ? -0.1 : 0.15)) {
    // Approach
    _currentDecision = "approach";
    _applyMovementDecision(_currentDecision, ai, result);
    return;
  }

  if (rand < 0.45) {
    // Dash in aggressively
    result.dashForward = true;
    _currentDecision = null;
    return;
  }

  if (rand < 0.65) {
    // Use a special at mid range (smarter selection)
    const specialIds = Object.keys(charDef.specials);
    if (specialIds.length > 0) {
      // On higher difficulties, pick the best special for the range
      if (difficulty >= 2 && specialIds.length > 1) {
        result.action = specialIds[Math.floor(Math.random() * specialIds.length)];
      } else {
        result.action = specialIds[0];
      }
      _currentDecision = null;
      if (difficulty >= 1) {
        _postAttackRetreatFrames = 2 + Math.floor(Math.random() * 4);
      }
      return;
    }
  }

  if (rand < 0.75 && difficulty >= 1) {
    // Spacing: walk to optimal range
    _currentDecision = "spacing";
    if (dist > optimalRange) {
      result.forward = true;
      if (ai.facingRight) result.right = true;
      else result.left = true;
    } else {
      result.back = true;
      if (ai.facingRight) result.left = true;
      else result.right = true;
    }
    return;
  }

  if (rand < 0.82) {
    // Jump approach (less predictable on higher difficulty)
    if (difficulty >= 2 && Math.random() < 0.5) {
      // Dash instead of jump (less telegraphed)
      result.dashForward = true;
    } else {
      result.up = true;
      result.forward = true;
      if (ai.facingRight) result.right = true;
      else result.left = true;
    }
    _currentDecision = null;
    return;
  }

  // Retreat (more likely when losing or at close-mid range)
  if (healthAdvantage < -0.2 || isInsideRange) {
    _currentDecision = "retreat";
    _applyMovementDecision(_currentDecision, ai, result);
  } else {
    _currentDecision = "approach";
    _applyMovementDecision(_currentDecision, ai, result);
  }
}

function _decideFarRange(
  ai: DuelFighter, _player: DuelFighter, difficulty: number,
  charDef: (typeof DUEL_CHARACTERS)[string],
  rand: number, result: DuelInputResult,
  _dist: number, _optimalRange: number,
): void {
  const isZoner = charDef.fighterType === "mage" || charDef.fighterType === "archer" || charDef.fighterType === "spear";

  if (isZoner && rand < 0.35) {
    // Zoners prefer to attack at range
    const specialIds = Object.keys(charDef.specials);
    if (specialIds.length > 0) {
      // Alternate between specials on higher difficulties
      if (difficulty >= 2 && specialIds.length > 1) {
        result.action = specialIds[Math.floor(Math.random() * specialIds.length)];
      } else {
        result.action = specialIds[0];
      }
      _currentDecision = null;
      return;
    }
  }

  if (rand < (isZoner ? 0.55 : 0.50)) {
    _currentDecision = "approach";
    _applyMovementDecision(_currentDecision, ai, result);
    return;
  }

  if (rand < (isZoner ? 0.70 : 0.75)) {
    result.dashForward = true;
    _currentDecision = null;
    return;
  }

  if (rand < 0.88) {
    // Non-zoners approach; zoners fire more
    if (isZoner) {
      const specialIds = Object.keys(charDef.specials);
      if (specialIds.length > 0) {
        result.action = specialIds[Math.floor(Math.random() * specialIds.length)];
        _currentDecision = null;
        return;
      }
    }
    _currentDecision = "approach";
    _applyMovementDecision(_currentDecision, ai, result);
    return;
  }

  // Jump approach
  result.up = true;
  result.forward = true;
  if (ai.facingRight) result.right = true;
  else result.left = true;
  _currentDecision = null;
}

function _applyMovementDecision(
  decision: string,
  ai: { facingRight: boolean },
  result: DuelInputResult,
): void {
  switch (decision) {
    case "approach":
      result.forward = true;
      if (ai.facingRight) result.right = true;
      else result.left = true;
      break;
    case "retreat":
      result.back = true;
      if (ai.facingRight) result.left = true;
      else result.right = true;
      break;
    case "spacing":
      // Stay still (let footsie system handle)
      break;
  }
}
