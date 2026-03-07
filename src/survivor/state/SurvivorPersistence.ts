// ---------------------------------------------------------------------------
// Survivor mode persistent data — localStorage save/load
// ---------------------------------------------------------------------------

import { META_UPGRADES } from "../config/SurvivorMetaUpgradeDefs";

const STORAGE_KEY = "marvelousU_survivor";

export interface SurvivorSaveData {
  totalGold: number;
  unlockedCharacters: string[]; // character IDs
  highScores: HighScoreEntry[];
  metaUpgrades: Record<string, number>; // upgrade ID -> level
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
      };
    } catch {
      return { ...DEFAULT_SAVE, unlockedCharacters: [...DEFAULT_SAVE.unlockedCharacters], metaUpgrades: {} };
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
};
