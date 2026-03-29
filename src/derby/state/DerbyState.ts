// Grail Derby – State Factory

import { DerbyState, DerbyPhase, DerbyPlayer, AIRider, DerbyMeta } from "../types";
import { DERBY_BALANCE as B } from "../config/DerbyBalance";

export function createDerbyState(): DerbyState {
  const meta = loadDerbyMeta();
  return {
    phase: DerbyPhase.MENU,
    player: createPlayer(),
    obstacles: [],
    pickups: [],
    aiRiders: createAIRiders(),
    archeryTarget: null,
    archerySpawnTimer: 8 + Math.random() * 5,
    scrollX: 0,
    time: 0,
    difficulty: 1,
    highScore: meta.highScore,
    bestDistance: meta.bestDistance,
    regenBonus: meta.staminaRegenBonus * 5,
    boostBonus: meta.boostDurationBonus * 0.5,
    magnetBonus: meta.magnetRangeBonus * 30,
    luckBonus: meta.luckBonus,
  };
}

function createPlayer(): DerbyPlayer {
  const meta = loadDerbyMeta();
  return {
    lane: 1,
    laneY: B.LANE_Y_START + B.LANE_SPACING,
    speed: B.BASE_SPEED,
    baseSpeed: B.BASE_SPEED,
    stamina: B.STAMINA_MAX,
    maxStamina: B.STAMINA_MAX,
    sprinting: false,
    score: 0,
    coins: 0,
    distance: 0,
    hp: B.STARTING_HP + meta.extraHp,
    maxHp: B.STARTING_HP + meta.extraHp,
    shieldTimer: 0,
    boostTimer: 0,
    lanceTimer: 0,
    magnetTimer: 0,
    invincibleTimer: 0,
    coinStreak: 0,
    coinStreakTimer: 0,
    bestStreak: 0,
    lastMilestone: 0,
  };
}

function createAIRiders(): AIRider[] {
  const names = ["Sir Gareth", "Sir Kay", "Sir Bedivere", "Sir Bors"];
  const colors = [0xcc4444, 0x44cc44, 0x4444cc, 0xccaa44];
  const riders: AIRider[] = [];
  for (let i = 0; i < B.AI_COUNT; i++) {
    riders.push({
      x: -100 - i * 80, // start behind player
      lane: i % B.LANE_COUNT,
      targetLane: i % B.LANE_COUNT,
      speed: B.BASE_SPEED * (1 + (Math.random() - 0.5) * B.AI_SPEED_VARIANCE * 2),
      color: colors[i],
      name: names[i],
      alive: true,
    });
  }
  return riders;
}

// Meta persistence
const META_KEY = "grail_derby_meta";

const DEFAULT_META: DerbyMeta = {
  highScore: 0, bestDistance: 0, totalCoins: 0, totalRaces: 0,
  extraHp: 0, staminaRegenBonus: 0, boostDurationBonus: 0, magnetRangeBonus: 0, luckBonus: 0,
};

export function loadDerbyMeta(): DerbyMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return { ...DEFAULT_META, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_META };
}

export function saveDerbyMeta(meta: DerbyMeta): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}
