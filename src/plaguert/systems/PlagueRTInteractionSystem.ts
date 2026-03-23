// ---------------------------------------------------------------------------
// Plague Doctor RT — player interaction systems (no PixiJS)
// ---------------------------------------------------------------------------

import { PlagueRTPhase, HouseState, HerbType } from "../types";
import type { PlagueRTState, House } from "../types";
import { PLAGUE_RT_BALANCE as B } from "../config/PlagueRTBalance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function addFloatingText(
  state: PlagueRTState, x: number, y: number, text: string, color: number, size?: number,
): void {
  state.floatingTexts.push({
    x, y, text, color,
    timer: B.FLOAT_TEXT_DURATION,
    maxTimer: B.FLOAT_TEXT_DURATION,
    size,
  });
}

// ---------------------------------------------------------------------------
// Player movement
// ---------------------------------------------------------------------------

export function updatePlayerMovement(
  state: PlagueRTState, dt: number, keys: Record<string, boolean>,
): void {
  if (state.phase !== PlagueRTPhase.PLAYING) return;

  const p = state.player;
  let ax = 0;
  let ay = 0;

  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) ax -= 1;
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) ax += 1;
  if (keys["ArrowUp"] || keys["w"] || keys["W"]) ay -= 1;
  if (keys["ArrowDown"] || keys["s"] || keys["S"]) ay += 1;

  // Normalize diagonal
  if (ax !== 0 && ay !== 0) {
    const inv = 1 / Math.SQRT2;
    ax *= inv;
    ay *= inv;
  }

  if (ax !== 0 || ay !== 0) {
    p.velX += ax * B.PLAYER_ACCEL * dt * p.speed / B.TILE_SIZE;
    p.velY += ay * B.PLAYER_ACCEL * dt * p.speed / B.TILE_SIZE;
  } else {
    // Decelerate
    const decel = B.PLAYER_DECEL * dt;
    if (Math.abs(p.velX) < decel) p.velX = 0; else p.velX -= Math.sign(p.velX) * decel;
    if (Math.abs(p.velY) < decel) p.velY = 0; else p.velY -= Math.sign(p.velY) * decel;
  }

  // Cap speed
  const maxVel = p.speed * dt / B.TILE_SIZE;
  const vel = Math.sqrt(p.velX * p.velX + p.velY * p.velY);
  if (vel > maxVel) {
    p.velX = (p.velX / vel) * maxVel;
    p.velY = (p.velY / vel) * maxVel;
  }

  p.x += p.velX;
  p.y += p.velY;

  // Clamp to grid
  p.x = Math.max(0.2, Math.min(state.gridW - 1.2, p.x));
  p.y = Math.max(0.2, Math.min(state.gridH - 1.2, p.y));

  // Treatment cancellation on out-of-range
  if (p.treating) {
    const d = dist(p.x, p.y, p.treating.gx, p.treating.gy);
    if (d > B.TREAT_RANGE) {
      p.treating = null;
      p.treatTimer = 0;
    }
  }

  // Garlic timer
  if (p.garlicAuraTimer > 0) p.garlicAuraTimer -= dt;

  // Combo streak timeout
  if (p.streakTimer > 0) {
    p.streakTimer -= dt;
    if (p.streakTimer <= 0) {
      p.cureStreak = 0;
      p.comboMultiplier = 1.0;
    }
  }

  // Well activation — check proximity
  if (state.wellPos) {
    const wd = dist(p.x, p.y, state.wellPos.gx, state.wellPos.gy);
    state.wellActive = wd <= B.WELL_PROXIMITY;
  }
}

// ---------------------------------------------------------------------------
// Herb collection
// ---------------------------------------------------------------------------

export function updateHerbCollection(state: PlagueRTState): void {
  if (state.phase !== PlagueRTPhase.PLAYING) return;

  const p = state.player;

  for (const herb of state.herbs) {
    if (herb.collected) continue;
    const d = dist(herb.pullX, herb.pullY, p.x, p.y);
    if (d > B.HERB_COLLECT_RANGE) continue;

    herb.collected = true;
    p.herbs[herb.type]++;

    const typeNames: Record<HerbType, string> = {
      [HerbType.LAVENDER]: "Lavender",
      [HerbType.WORMWOOD]: "Wormwood",
      [HerbType.MANDRAKE]: "Mandrake",
      [HerbType.GARLIC]: "Garlic",
    };
    const typeColors: Record<HerbType, number> = {
      [HerbType.LAVENDER]: 0xbb88ff,
      [HerbType.WORMWOOD]: 0x88cc44,
      [HerbType.MANDRAKE]: 0xaa44dd,
      [HerbType.GARLIC]: 0xeeeecc,
    };

    addFloatingText(state,
      herb.pullX * B.TILE_SIZE + B.TILE_SIZE / 2,
      herb.pullY * B.TILE_SIZE,
      `+${typeNames[herb.type]}`,
      typeColors[herb.type],
    );
  }

  // Clean up collected herbs
  for (let i = state.herbs.length - 1; i >= 0; i--) {
    if (state.herbs[i].collected) state.herbs.splice(i, 1);
  }
}

// ---------------------------------------------------------------------------
// Treatment
// ---------------------------------------------------------------------------

export function tryTreatHouse(state: PlagueRTState): void {
  if (state.phase !== PlagueRTPhase.PLAYING) return;

  const p = state.player;

  // Already treating?
  if (p.treating) {
    addFloatingText(state,
      p.x * B.TILE_SIZE + B.TILE_SIZE / 2,
      p.y * B.TILE_SIZE - 10,
      "Already treating!", 0xffaa44,
    );
    return;
  }

  // Need remedies
  if (p.remedies <= 0) {
    addFloatingText(state,
      p.x * B.TILE_SIZE + B.TILE_SIZE / 2,
      p.y * B.TILE_SIZE - 10,
      "No remedies!", 0xff4444,
    );
    return;
  }

  // Find nearest infected house in range
  let nearest: House | null = null;
  let nearestDist = Infinity;
  for (const house of state.houses) {
    if (house.state !== HouseState.INFECTED && house.state !== HouseState.CRITICAL) continue;
    const d = dist(p.x, p.y, house.gx, house.gy);
    if (d <= B.TREAT_RANGE && d < nearestDist) {
      nearest = house;
      nearestDist = d;
    }
  }

  if (!nearest) {
    addFloatingText(state,
      p.x * B.TILE_SIZE + B.TILE_SIZE / 2,
      p.y * B.TILE_SIZE - 10,
      "No house in range", 0xffaa44,
    );
    return;
  }

  p.treating = nearest;
  p.treatTimer = 0;
  p.remedies--;

  // Create heal beam
  state.healBeams.push({
    fromX: p.x * B.TILE_SIZE + B.TILE_SIZE / 2,
    fromY: p.y * B.TILE_SIZE + B.TILE_SIZE / 2,
    toX: nearest.gx * B.TILE_SIZE + B.TILE_SIZE / 2,
    toY: nearest.gy * B.TILE_SIZE + B.TILE_SIZE / 2,
    progress: 0,
    color: 0x44ff88,
  });
}

export function updateTreatment(state: PlagueRTState, dt: number): void {
  if (state.phase !== PlagueRTPhase.PLAYING) return;

  const p = state.player;
  if (!p.treating) return;

  const house = p.treating;
  let treatTime = B.TREAT_TIME;
  if (house.state === HouseState.CRITICAL) treatTime /= B.CRITICAL_TREAT_PENALTY;

  p.treatTimer += dt;
  house.treatProgress = Math.min(1.0, p.treatTimer / treatTime);

  // Update heal beam positions
  for (const beam of state.healBeams) {
    beam.fromX = p.x * B.TILE_SIZE + B.TILE_SIZE / 2;
    beam.fromY = p.y * B.TILE_SIZE + B.TILE_SIZE / 2;
  }

  if (p.treatTimer >= treatTime) {
    // Cure!
    house.infection -= B.CURE_PERCENT * 100;
    if (house.infection <= 0) {
      house.infection = 0;
      house.state = HouseState.CURED;
      house.cureFlash = 0.5;
      p.villagersSaved += house.villagers;
      p.curesPerformed++;

      // Combo system
      p.cureStreak++;
      p.streakTimer = B.COMBO_STREAK_TIMEOUT;
      p.comboMultiplier = Math.min(
        B.COMBO_MULT_MAX,
        1.0 + p.cureStreak * B.COMBO_MULT_PER,
      );
      if (p.cureStreak > p.bestStreak) p.bestStreak = p.cureStreak;

      addFloatingText(state,
        house.gx * B.TILE_SIZE + B.TILE_SIZE / 2,
        house.gy * B.TILE_SIZE,
        `CURED! +${house.villagers} saved`, 0x44ff44, 14,
      );

      if (p.cureStreak > 1) {
        addFloatingText(state,
          house.gx * B.TILE_SIZE + B.TILE_SIZE / 2,
          house.gy * B.TILE_SIZE - 20,
          `x${p.cureStreak} streak!`, 0xffdd44, 12,
        );
      }
    } else {
      if (house.infection < B.CRITICAL_THRESHOLD) {
        house.state = HouseState.INFECTED;
      }
      addFloatingText(state,
        house.gx * B.TILE_SIZE + B.TILE_SIZE / 2,
        house.gy * B.TILE_SIZE,
        `Treated -${Math.floor(B.CURE_PERCENT * 100)}%`, 0x88ff88,
      );
    }

    house.treatProgress = 0;
    p.treating = null;
    p.treatTimer = 0;
  }
}

// ---------------------------------------------------------------------------
// Well feedback
// ---------------------------------------------------------------------------

export function updateWellFeedback(state: PlagueRTState): void {
  // wellHealingHouses is already updated in spread system
  // This provides an opportunity for additional feedback logic
  if (!state.wellActive) {
    state.wellHealingHouses = [];
  }
}

// ---------------------------------------------------------------------------
// Crafting
// ---------------------------------------------------------------------------

export function craftRemedy(state: PlagueRTState): void {
  const p = state.player;
  if (p.herbs[HerbType.LAVENDER] >= B.CRAFT_REMEDY_LAVENDER) {
    p.herbs[HerbType.LAVENDER] -= B.CRAFT_REMEDY_LAVENDER;
    p.remedies++;
    addFloatingText(state,
      p.x * B.TILE_SIZE + B.TILE_SIZE / 2,
      p.y * B.TILE_SIZE - 10,
      "+1 Remedy", 0x44ff88,
    );
  } else {
    addFloatingText(state,
      p.x * B.TILE_SIZE + B.TILE_SIZE / 2,
      p.y * B.TILE_SIZE - 10,
      "Need Lavender!", 0xff4444,
    );
  }
}

export function craftSmokeBomb(state: PlagueRTState): void {
  const p = state.player;
  if (
    p.herbs[HerbType.WORMWOOD] >= B.CRAFT_SMOKE_WORMWOOD &&
    p.herbs[HerbType.GARLIC] >= B.CRAFT_SMOKE_GARLIC
  ) {
    p.herbs[HerbType.WORMWOOD] -= B.CRAFT_SMOKE_WORMWOOD;
    p.herbs[HerbType.GARLIC] -= B.CRAFT_SMOKE_GARLIC;
    p.smokeBombs++;
    addFloatingText(state,
      p.x * B.TILE_SIZE + B.TILE_SIZE / 2,
      p.y * B.TILE_SIZE - 10,
      "+1 Smoke Bomb", 0x888888,
    );
  } else {
    addFloatingText(state,
      p.x * B.TILE_SIZE + B.TILE_SIZE / 2,
      p.y * B.TILE_SIZE - 10,
      "Need Wormwood+Garlic!", 0xff4444,
    );
  }
}

export function craftIncense(state: PlagueRTState): void {
  const p = state.player;
  if (
    p.herbs[HerbType.LAVENDER] >= B.CRAFT_INCENSE_LAVENDER &&
    p.herbs[HerbType.WORMWOOD] >= B.CRAFT_INCENSE_WORMWOOD
  ) {
    p.herbs[HerbType.LAVENDER] -= B.CRAFT_INCENSE_LAVENDER;
    p.herbs[HerbType.WORMWOOD] -= B.CRAFT_INCENSE_WORMWOOD;
    p.incense++;
    addFloatingText(state,
      p.x * B.TILE_SIZE + B.TILE_SIZE / 2,
      p.y * B.TILE_SIZE - 10,
      "+1 Incense", 0xddaa44,
    );
  } else {
    addFloatingText(state,
      p.x * B.TILE_SIZE + B.TILE_SIZE / 2,
      p.y * B.TILE_SIZE - 10,
      "Need Lavender+Wormwood!", 0xff4444,
    );
  }
}

export function craftRatTrap(state: PlagueRTState): void {
  const p = state.player;
  if (p.herbs[HerbType.GARLIC] >= B.CRAFT_TRAP_GARLIC) {
    p.herbs[HerbType.GARLIC] -= B.CRAFT_TRAP_GARLIC;
    p.ratTraps++;
    addFloatingText(state,
      p.x * B.TILE_SIZE + B.TILE_SIZE / 2,
      p.y * B.TILE_SIZE - 10,
      "+1 Rat Trap", 0xaa7744,
    );
  } else {
    addFloatingText(state,
      p.x * B.TILE_SIZE + B.TILE_SIZE / 2,
      p.y * B.TILE_SIZE - 10,
      "Need 2 Garlic!", 0xff4444,
    );
  }
}

// ---------------------------------------------------------------------------
// Item usage
// ---------------------------------------------------------------------------

export function useSmokeBomb(state: PlagueRTState): void {
  const p = state.player;
  if (p.smokeBombs <= 0) {
    addFloatingText(state, p.x * B.TILE_SIZE + B.TILE_SIZE / 2, p.y * B.TILE_SIZE - 10, "No smoke bombs!", 0xff4444);
    return;
  }
  p.smokeBombs--;
  state.smokes.push({
    id: Date.now(),
    gx: Math.round(p.x),
    gy: Math.round(p.y),
    timer: B.SMOKE_DURATION,
    radius: B.SMOKE_RADIUS,
  });
  state.screenShake = B.SHAKE_DURATION;
  addFloatingText(state, p.x * B.TILE_SIZE + B.TILE_SIZE / 2, p.y * B.TILE_SIZE - 10, "Smoke deployed!", 0x888888, 14);
}

export function useIncense(state: PlagueRTState): void {
  const p = state.player;
  if (p.incense <= 0) {
    addFloatingText(state, p.x * B.TILE_SIZE + B.TILE_SIZE / 2, p.y * B.TILE_SIZE - 10, "No incense!", 0xff4444);
    return;
  }
  p.incense--;
  // Protect nearby houses
  for (const house of state.houses) {
    const d = dist(p.x, p.y, house.gx, house.gy);
    if (d <= B.SMOKE_RADIUS) {
      house.protectionTimer = B.INCENSE_DURATION;
    }
  }
  addFloatingText(state, p.x * B.TILE_SIZE + B.TILE_SIZE / 2, p.y * B.TILE_SIZE - 10,
    "Incense shield active!", 0xddaa44, 14);
}

export function useRatTrap(state: PlagueRTState): void {
  const p = state.player;
  if (p.ratTraps <= 0) {
    addFloatingText(state, p.x * B.TILE_SIZE + B.TILE_SIZE / 2, p.y * B.TILE_SIZE - 10, "No traps!", 0xff4444);
    return;
  }
  p.ratTraps--;
  let killed = 0;
  for (const rat of state.rats) {
    if (!rat.alive) continue;
    const d = dist(rat.x, rat.y, p.x, p.y);
    if (d <= B.TRAP_RADIUS) {
      rat.alive = false;
      rat.deathTimer = B.RAT_DEATH_ANIM;
      state.ratsKilled++;
      killed++;
    }
  }
  addFloatingText(state, p.x * B.TILE_SIZE + B.TILE_SIZE / 2, p.y * B.TILE_SIZE - 10,
    `Trap! ${killed} rats caught`, 0xaa7744, 14);
}

export function useGarlic(state: PlagueRTState): void {
  const p = state.player;
  if (p.herbs[HerbType.GARLIC] <= 0) {
    addFloatingText(state, p.x * B.TILE_SIZE + B.TILE_SIZE / 2, p.y * B.TILE_SIZE - 10, "No garlic!", 0xff4444);
    return;
  }
  p.herbs[HerbType.GARLIC]--;
  p.garlicAuraTimer = B.GARLIC_DURATION;
  addFloatingText(state, p.x * B.TILE_SIZE + B.TILE_SIZE / 2, p.y * B.TILE_SIZE - 10,
    `Garlic aura ${B.GARLIC_DURATION}s`, 0xeeeecc, 14);
}

export function useMandrake(state: PlagueRTState): void {
  const p = state.player;
  if (p.herbs[HerbType.MANDRAKE] <= 0) {
    addFloatingText(state, p.x * B.TILE_SIZE + B.TILE_SIZE / 2, p.y * B.TILE_SIZE - 10, "No mandrake!", 0xff4444);
    return;
  }
  p.herbs[HerbType.MANDRAKE]--;

  // Mandrake blast VFX
  state.mandrakeBlastTimer = 1.0;
  state.mandrakeBlastX = p.x * B.TILE_SIZE + B.TILE_SIZE / 2;
  state.mandrakeBlastY = p.y * B.TILE_SIZE + B.TILE_SIZE / 2;

  // Area cure
  let curedCount = 0;
  for (const house of state.houses) {
    if (house.state !== HouseState.INFECTED && house.state !== HouseState.CRITICAL) continue;
    const d = dist(p.x, p.y, house.gx, house.gy);
    if (d <= B.SPREAD_RADIUS + 1) {
      house.infection = 0;
      house.state = HouseState.CURED;
      house.cureFlash = 0.5;
      p.villagersSaved += house.villagers;
      p.curesPerformed++;
      curedCount++;
    }
  }

  // Combo integration
  if (curedCount > 0) {
    p.cureStreak += curedCount;
    p.streakTimer = B.COMBO_STREAK_TIMEOUT;
    p.comboMultiplier = Math.min(B.COMBO_MULT_MAX, 1.0 + p.cureStreak * B.COMBO_MULT_PER);
    if (p.cureStreak > p.bestStreak) p.bestStreak = p.cureStreak;
  }

  state.screenShake = B.SHAKE_DURATION;
  addFloatingText(state, p.x * B.TILE_SIZE + B.TILE_SIZE / 2, p.y * B.TILE_SIZE - 10,
    `Mandrake blast! ${curedCount} cured`, 0xaa44dd, 16);
}
