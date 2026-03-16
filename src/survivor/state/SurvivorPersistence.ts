// ---------------------------------------------------------------------------
// Survivor mode persistent data — localStorage save/load
// ---------------------------------------------------------------------------

import { META_UPGRADES } from "../config/SurvivorMetaUpgradeDefs";
import type { SurvivorPrestigeState } from "./SurvivorState";

const STORAGE_KEY = "marvelousU_survivor";

// Prestige constants
const PRESTIGE_WAVE_THRESHOLD = 1500; // 25 minutes — must survive this long to prestige
const PRESTIGE_HP_PER_LEVEL = 10;
const PRESTIGE_ATK_PER_LEVEL = 0.03;  // +3% per prestige
const PRESTIGE_XP_PER_LEVEL = 0.02;   // +2% per prestige
const PRESTIGE_SPEED_PER_LEVEL = 0.01; // +1% per prestige

export interface SurvivorSaveData {
  totalGold: number;
  unlockedCharacters: string[]; // character IDs
  highScores: HighScoreEntry[];
  metaUpgrades: Record<string, number>; // upgrade ID -> level
  prestigeLevel: number; // prestige level (0 = not prestiged)
}

export interface HighScoreEntry {
  characterId: string;
  characterName: string;
  mapName: string;
  timeSurvived: number; // seconds
  kills: number;
  level: number;
  damageDealt: number;
  gold: number;
  date: number; // timestamp
}

const DEFAULT_SAVE: SurvivorSaveData = {
  totalGold: 0,
  unlockedCharacters: ["swordsman", "archer", "fire_mage"],
  highScores: [],
  metaUpgrades: {},
  prestigeLevel: 0,
};

const MAX_HIGH_SCORES = 10;

export const SurvivorPersistence = {
  load(): SurvivorSaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SAVE, unlockedCharacters: [...DEFAULT_SAVE.unlockedCharacters], metaUpgrades: {} };
      const data = JSON.parse(raw) as Partial<SurvivorSaveData>;
      return {
        totalGold: data.totalGold ?? DEFAULT_SAVE.totalGold,
        unlockedCharacters: data.unlockedCharacters ?? [...DEFAULT_SAVE.unlockedCharacters],
        highScores: data.highScores ?? [],
        metaUpgrades: data.metaUpgrades ?? {},
        prestigeLevel: data.prestigeLevel ?? 0,
      };
    } catch {
      return { ...DEFAULT_SAVE, unlockedCharacters: [...DEFAULT_SAVE.unlockedCharacters], metaUpgrades: {}, prestigeLevel: 0 };
    }
  },

  save(data: SurvivorSaveData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore quota errors
    }
  },

  addGold(amount: number): number {
    const data = this.load();
    data.totalGold += amount;
    this.save(data);
    return data.totalGold;
  },

  unlockCharacter(charId: string, cost: number): boolean {
    const data = this.load();
    if (data.totalGold < cost) return false;
    if (data.unlockedCharacters.includes(charId)) return true;
    data.totalGold -= cost;
    data.unlockedCharacters.push(charId);
    this.save(data);
    return true;
  },

  isCharacterUnlocked(charId: string): boolean {
    const data = this.load();
    return data.unlockedCharacters.includes(charId);
  },

  addHighScore(entry: HighScoreEntry): void {
    const data = this.load();
    data.highScores.push(entry);
    data.highScores.sort((a, b) => b.timeSurvived - a.timeSurvived);
    data.highScores = data.highScores.slice(0, MAX_HIGH_SCORES);
    this.save(data);
  },

  // Meta upgrade methods
  getMetaLevel(upgradeId: string): number {
    const data = this.load();
    return data.metaUpgrades[upgradeId] ?? 0;
  },

  purchaseMetaUpgrade(upgradeId: string): boolean {
    const data = this.load();
    const upgrade = META_UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) return false;
    const currentLevel = data.metaUpgrades[upgradeId] ?? 0;
    if (currentLevel >= upgrade.maxLevel) return false;
    const cost = upgrade.costPerLevel[currentLevel];
    if (data.totalGold < cost) return false;
    data.totalGold -= cost;
    data.metaUpgrades[upgradeId] = currentLevel + 1;
    this.save(data);
    return true;
  },

  getMetaUpgrades(): Record<string, number> {
    return this.load().metaUpgrades;
  },

  // Prestige methods
  getPrestigeLevel(): number {
    return this.load().prestigeLevel;
  },

  getPrestige(): SurvivorPrestigeState {
    const level = this.getPrestigeLevel();
    return {
      level,
      hpBonus: level * PRESTIGE_HP_PER_LEVEL,
      atkBonus: level * PRESTIGE_ATK_PER_LEVEL,
      xpBonus: level * PRESTIGE_XP_PER_LEVEL,
      speedBonus: level * PRESTIGE_SPEED_PER_LEVEL,
    };
  },

  canPrestige(gameTime: number): boolean {
    return gameTime >= PRESTIGE_WAVE_THRESHOLD;
  },

  applyPrestige(): number {
    const data = this.load();
    data.prestigeLevel += 1;
    this.save(data);
    return data.prestigeLevel;
  },

  getPrestigeThreshold(): number {
    return PRESTIGE_WAVE_THRESHOLD;
  },
};
