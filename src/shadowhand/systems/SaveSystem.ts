// ---------------------------------------------------------------------------
// Shadowhand mode — save/load with localStorage
// ---------------------------------------------------------------------------

import type { ShadowhandState } from "../state/ShadowhandState";
import type { GuildUpgradeId } from "../state/ShadowhandState";

const SAVE_KEY = "shadowhand_save";

interface SaveData {
  version: 2;
  difficulty: string;
  seed: number;
  score: number;
  guild: {
    gold: number;
    reputation: number;
    tier: number;
    heat: [string, number][];
    roster: {
      id: string;
      role: string;
      name: string;
      hp: number;
      maxHp: number;
      speed: number;
      noiseMultiplier: number;
      visionRange: number;
      level: number;
      xp: number;
      alive: boolean;
      captured: boolean;
      injured: boolean;
      injuryPenalty: number;
    }[];
    inventory: { id: string; uses: number }[];
    completedHeists: string[];
    totalLootValue: number;
    perfectHeists: number;
    day: number;
    upgrades: string[];
    achievements: string[];
    totalHeistsAttempted: number;
    totalHeistsSucceeded: number;
    longestStreak: number;
    currentStreak: number;
    guildName: string;
    capturedCrewIds: string[];
    bonds: [string, number][];
    tutorialDone: boolean;
  };
  log: string[];
}

export function saveGame(state: ShadowhandState): void {
  try {
    const data: SaveData = {
      version: 2,
      difficulty: state.difficulty,
      seed: state.seed,
      score: state.score,
      guild: {
        gold: state.guild.gold,
        reputation: state.guild.reputation,
        tier: state.guild.tier,
        heat: [...state.guild.heat.entries()],
        roster: state.guild.roster.map(c => ({
          id: c.id,
          role: c.role,
          name: c.name,
          hp: c.hp,
          maxHp: c.maxHp,
          speed: c.speed,
          noiseMultiplier: c.noiseMultiplier,
          visionRange: c.visionRange,
          level: c.level,
          xp: c.xp,
          alive: c.alive,
          captured: c.captured,
          injured: c.injured,
          injuryPenalty: c.injuryPenalty,
        })),
        inventory: state.guild.inventory,
        completedHeists: state.guild.completedHeists,
        totalLootValue: state.guild.totalLootValue,
        perfectHeists: state.guild.perfectHeists,
        day: state.guild.day,
        upgrades: [...state.guild.upgrades],
        achievements: [...state.guild.achievements],
        totalHeistsAttempted: state.guild.totalHeistsAttempted,
        totalHeistsSucceeded: state.guild.totalHeistsSucceeded,
        longestStreak: state.guild.longestStreak,
        currentStreak: state.guild.currentStreak,
        guildName: state.guild.guildName,
        capturedCrewIds: state.guild.capturedCrewIds,
        bonds: [...state.guild.bonds.entries()],
        tutorialDone: state.guild.tutorialDone,
      },
      log: state.log.slice(-20),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch { /* localStorage may be unavailable */ }
}

export function loadGame(state: ShadowhandState): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as SaveData;
    if (!data.version || data.version < 2) return false;

    state.difficulty = data.difficulty as any;
    state.seed = data.seed;
    state.score = data.score;
    state.guild.gold = data.guild.gold;
    state.guild.reputation = data.guild.reputation;
    state.guild.tier = data.guild.tier;
    state.guild.heat = new Map(data.guild.heat);
    state.guild.roster = data.guild.roster.map(c => ({
      ...c,
      role: c.role as any,
      injured: c.injured ?? false,
      injuryPenalty: c.injuryPenalty ?? 0,
      cooldowns: new Map(),
    }));
    state.guild.inventory = data.guild.inventory;
    state.guild.completedHeists = data.guild.completedHeists;
    state.guild.totalLootValue = data.guild.totalLootValue;
    state.guild.perfectHeists = data.guild.perfectHeists;
    state.guild.day = data.guild.day;
    state.guild.upgrades = new Set(data.guild.upgrades as GuildUpgradeId[]);
    state.guild.achievements = new Set(data.guild.achievements);
    state.guild.totalHeistsAttempted = data.guild.totalHeistsAttempted;
    state.guild.totalHeistsSucceeded = data.guild.totalHeistsSucceeded;
    state.guild.longestStreak = data.guild.longestStreak;
    state.guild.currentStreak = data.guild.currentStreak;
    state.guild.guildName = data.guild.guildName;
    state.guild.capturedCrewIds = data.guild.capturedCrewIds ?? [];
    state.guild.bonds = new Map(data.guild.bonds ?? []);
    state.guild.tutorialDone = data.guild.tutorialDone ?? false;
    state.guild.availableContracts = [];
    state.guild.news = [];
    state.log = data.log ?? [];

    return true;
  } catch {
    return false;
  }
}

export function hasSaveGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data?.version >= 2;
  } catch {
    return false;
  }
}

export function deleteSaveGame(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
