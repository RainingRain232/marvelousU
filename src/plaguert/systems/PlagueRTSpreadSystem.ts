// ---------------------------------------------------------------------------
// Plague Doctor RT — spread / infection system (no PixiJS imports)
// ---------------------------------------------------------------------------

import { HouseState, PlagueRTPhase } from "../types";
import type { PlagueRTState, House } from "../types";
import { PLAGUE_RT_BALANCE as B } from "../config/PlagueRTBalance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function isNight(state: PlagueRTState): boolean {
  return state.dayTime >= B.NIGHT_START || state.dayTime < B.NIGHT_END;
}

function houseInSmoke(house: House, state: PlagueRTState): boolean {
  for (const s of state.smokes) {
    if (dist(house.gx, house.gy, s.gx, s.gy) <= s.radius) return true;
  }
  return false;
}

function houseInChurch(house: House, state: PlagueRTState): boolean {
  if (!state.churchPos) return false;
  return dist(house.gx, house.gy, state.churchPos.gx, state.churchPos.gy) <= B.CHURCH_RADIUS;
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
// Main spread update
// ---------------------------------------------------------------------------

export function updatePlagueSpread(state: PlagueRTState, dt: number): void {
  if (state.phase !== PlagueRTPhase.PLAYING) return;

  const nightMult = isNight(state) ? B.NIGHT_MULT : 1.0;
  const diffMult = state.difficulty;

  // --- Internal infection progression ---
  for (const house of state.houses) {
    if (house.state === HouseState.DEAD || house.state === HouseState.CURED || house.state === HouseState.HEALTHY) continue;

    let rate = B.SPREAD_RATE * nightMult * diffMult * dt;
    if (houseInSmoke(house, state)) rate *= B.SMOKE_SLOW;
    if (houseInChurch(house, state)) rate *= B.CHURCH_SLOW;

    house.infection += rate;
    house.lastInfection = house.infection;

    if (house.infection >= B.CRITICAL_THRESHOLD && house.state === HouseState.INFECTED) {
      house.state = HouseState.CRITICAL;
      addFloatingText(state,
        house.gx * B.TILE_SIZE + B.TILE_SIZE / 2,
        house.gy * B.TILE_SIZE,
        "CRITICAL!", 0xff4444, 14,
      );
    }

    if (house.infection >= 100) {
      house.infection = 100;
      house.state = HouseState.DEAD;
      house.deathFlash = 0.5;
      house.shakeTimer = B.SHAKE_DURATION;
      state.player.villagersLost += house.villagers;
      state.screenShake = B.SHAKE_DURATION;

      // Death breaks combo
      state.player.cureStreak = 0;
      state.player.streakTimer = 0;
      state.player.comboMultiplier = 1.0;

      addFloatingText(state,
        house.gx * B.TILE_SIZE + B.TILE_SIZE / 2,
        house.gy * B.TILE_SIZE,
        `-${house.villagers} lost`, 0xff2222, 16,
      );
    }
  }

  // --- Neighbor spread ---
  const livingHouses = state.houses.filter(
    h => h.state === HouseState.INFECTED || h.state === HouseState.CRITICAL,
  );
  for (const src of livingHouses) {
    const spreadRate = src.state === HouseState.CRITICAL
      ? B.NEIGHBOR_SPREAD * B.CRITICAL_SPREAD_MULT
      : B.NEIGHBOR_SPREAD;
    for (const target of state.houses) {
      if (target.state !== HouseState.HEALTHY) continue;
      if (target.protectionTimer > 0) continue;
      const d = dist(src.gx, src.gy, target.gx, target.gy);
      if (d > B.SPREAD_RADIUS) continue;
      const chance = spreadRate * nightMult * diffMult * dt;
      if (Math.random() < chance) {
        target.infection = Math.max(target.infection, 5);
        target.state = HouseState.INFECTED;
        addFloatingText(state,
          target.gx * B.TILE_SIZE + B.TILE_SIZE / 2,
          target.gy * B.TILE_SIZE,
          "Infected!", 0xddaa33,
        );
      }
    }
  }

  // --- Rat infection aura ---
  for (const rat of state.rats) {
    if (!rat.alive || rat.deathTimer > 0) continue;
    for (const house of state.houses) {
      if (house.state === HouseState.DEAD || house.state === HouseState.CURED) continue;
      if (house.protectionTimer > 0) continue;
      const d = dist(rat.x, rat.y, house.gx, house.gy);
      if (d > rat.infectionAura) continue;
      if (house.state === HouseState.HEALTHY) {
        house.state = HouseState.INFECTED;
        house.infection = Math.max(house.infection, 5);
      }
      house.infection += B.RAT_INFECTION_PER_SEC * dt;
    }
  }

  // --- Well healing ---
  state.wellHealingHouses = [];
  if (state.wellActive && state.wellPos) {
    for (const house of state.houses) {
      if (house.state !== HouseState.INFECTED && house.state !== HouseState.CRITICAL) continue;
      const d = dist(house.gx, house.gy, state.wellPos.gx, state.wellPos.gy);
      if (d > B.WELL_RADIUS) continue;
      house.infection -= B.WELL_HEAL_PER_SEC * dt;
      state.wellHealingHouses.push(house.id);
      if (house.infection <= 0) {
        house.infection = 0;
        house.state = HouseState.HEALTHY;
        house.cureFlash = 0.5;
        addFloatingText(state,
          house.gx * B.TILE_SIZE + B.TILE_SIZE / 2,
          house.gy * B.TILE_SIZE,
          "Well healed!", 0x44ccff,
        );
      } else if (house.infection < B.CRITICAL_THRESHOLD && house.state === HouseState.CRITICAL) {
        house.state = HouseState.INFECTED;
      }
    }
  }

  // --- Timer decrements ---
  for (const house of state.houses) {
    if (house.protectionTimer > 0) house.protectionTimer -= dt;
    if (house.shakeTimer > 0) house.shakeTimer -= dt;
    if (house.deathFlash > 0) house.deathFlash -= dt;
    if (house.cureFlash > 0) house.cureFlash -= dt;
  }
  for (let i = state.smokes.length - 1; i >= 0; i--) {
    state.smokes[i].timer -= dt;
    if (state.smokes[i].timer <= 0) state.smokes.splice(i, 1);
  }
  if (state.screenShake > 0) state.screenShake -= dt;
  if (state.mandrakeBlastTimer > 0) state.mandrakeBlastTimer -= dt;

  // --- Floating text updates ---
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    state.floatingTexts[i].timer -= dt;
    if (state.floatingTexts[i].timer <= 0) state.floatingTexts.splice(i, 1);
  }

  // --- Heal beam updates ---
  for (let i = state.healBeams.length - 1; i >= 0; i--) {
    state.healBeams[i].progress += B.HEAL_BEAM_SPEED * dt;
    if (state.healBeams[i].progress >= 1) state.healBeams.splice(i, 1);
  }

  // --- Win/lose checks ---
  const alive = state.houses.filter(h => h.state !== HouseState.DEAD);
  const curedOrHealthy = state.houses.filter(
    h => h.state === HouseState.CURED || h.state === HouseState.HEALTHY,
  );
  const dead = state.houses.filter(h => h.state === HouseState.DEAD);

  const winTarget = Math.ceil(state.houses.length * B.WIN_PERCENT);
  const loseTarget = Math.ceil(state.houses.length * B.LOSE_PERCENT);

  if (curedOrHealthy.length >= winTarget && alive.length === curedOrHealthy.length) {
    // All alive houses are healthy/cured and we have enough
    state.phase = PlagueRTPhase.WON;
  }

  if (dead.length >= loseTarget) {
    state.phase = PlagueRTPhase.LOST;
  }
}
