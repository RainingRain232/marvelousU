// Run statistics tracker for Rift Wizard

export interface RWRunStats {
  totalDamageDealt: number;
  totalDamageTaken: number;
  enemiesKilled: number;
  bossesKilled: number;
  spellsCast: number;
  spellsBySchool: Record<string, number>;
  enemiesKilledBySchool: Record<string, number>;
  floorsCleared: number;
  turnsPlayed: number;
  itemsCollected: number;
  shrinesUsed: number;
  spellsLearned: number;
  upgradesBought: number;
  highestDamageHit: number;
  timesUndone: number;
  startTime: number;
}

export function createRunStats(): RWRunStats {
  return {
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    enemiesKilled: 0,
    bossesKilled: 0,
    spellsCast: 0,
    spellsBySchool: {},
    enemiesKilledBySchool: {},
    floorsCleared: 0,
    turnsPlayed: 0,
    itemsCollected: 0,
    shrinesUsed: 0,
    spellsLearned: 0,
    upgradesBought: 0,
    highestDamageHit: 0,
    timesUndone: 0,
    startTime: Date.now(),
  };
}

export function recordDamageDealt(stats: RWRunStats, amount: number, school?: string): void {
  stats.totalDamageDealt += amount;
  if (amount > stats.highestDamageHit) stats.highestDamageHit = amount;
  if (school) {
    stats.spellsBySchool[school] = (stats.spellsBySchool[school] ?? 0) + 1;
  }
}

export function recordDamageTaken(stats: RWRunStats, amount: number): void {
  stats.totalDamageTaken += amount;
}

export function recordEnemyKilled(stats: RWRunStats, isBoss: boolean, school?: string): void {
  stats.enemiesKilled++;
  if (isBoss) stats.bossesKilled++;
  if (school) {
    stats.enemiesKilledBySchool[school] = (stats.enemiesKilledBySchool[school] ?? 0) + 1;
  }
}

export function recordSpellCast(stats: RWRunStats, school?: string): void {
  stats.spellsCast++;
  if (school) {
    stats.spellsBySchool[school] = (stats.spellsBySchool[school] ?? 0) + 1;
  }
}

export function recordFloorCleared(stats: RWRunStats): void {
  stats.floorsCleared++;
}

export function recordTurn(stats: RWRunStats): void {
  stats.turnsPlayed++;
}

export function getRunDuration(stats: RWRunStats): string {
  const ms = Date.now() - stats.startTime;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m ${seconds % 60}s`;
}

export function formatRunSummary(stats: RWRunStats): string[] {
  return [
    `Duration: ${getRunDuration(stats)}`,
    `Floors Cleared: ${stats.floorsCleared}/25`,
    `Turns Played: ${stats.turnsPlayed}`,
    `Enemies Killed: ${stats.enemiesKilled} (${stats.bossesKilled} bosses)`,
    `Total Damage Dealt: ${stats.totalDamageDealt}`,
    `Total Damage Taken: ${stats.totalDamageTaken}`,
    `Biggest Hit: ${stats.highestDamageHit}`,
    `Spells Cast: ${stats.spellsCast}`,
    `Spells Learned: ${stats.spellsLearned}`,
    `Upgrades Bought: ${stats.upgradesBought}`,
    `Items Collected: ${stats.itemsCollected}`,
    `Shrines Used: ${stats.shrinesUsed}`,
  ];
}
