import type { RPGState } from "@rpg/state/RPGState";
import { EventBus } from "@sim/core/EventBus";

/** Check all achievement conditions and unlock any newly earned ones. */
export function checkAchievements(rpg: RPGState): string[] {
  const newlyUnlocked: string[] = [];

  function tryUnlock(id: string, condition: boolean): void {
    if (condition && !rpg.achievements.has(id)) {
      rpg.achievements.add(id);
      newlyUnlocked.push(id);
      EventBus.emit("rpgAchievementUnlocked", { achievementId: id });
    }
  }

  // Battle-related
  const totalDefeated = Object.values(rpg.bestiary).reduce((s, e) => s + e.timesDefeated, 0);
  tryUnlock("first_blood", totalDefeated >= 1);

  // Specific boss defeats
  tryUnlock("dragon_slayer", (rpg.bestiary["boss_dragon"]?.timesDefeated ?? 0) >= 1);
  tryUnlock("lich_bane", (rpg.bestiary["boss_lich"]?.timesDefeated ?? 0) >= 1);
  tryUnlock("demon_vanquisher", (rpg.bestiary["boss_demon_lord"]?.timesDefeated ?? 0) >= 1);
  tryUnlock("world_savior", (rpg.bestiary["boss_final"]?.timesDefeated ?? 0) >= 1);

  // Count goblin encounters
  const goblinCount = (rpg.bestiary["goblin_patrol"]?.timesDefeated ?? 0) +
    (rpg.bestiary["forest_wolves"]?.timesDefeated ?? 0);
  tryUnlock("goblin_slayer", goblinCount >= 50);

  // Progression
  tryUnlock("max_power", rpg.party.some(m => m.level >= 30));
  tryUnlock("wealthy", rpg.gold >= 5000);
  tryUnlock("full_party", rpg.party.length >= 6);
  tryUnlock("completionist", rpg.collectedLore.size >= 20);
  tryUnlock("explorer", rpg.discoveredTowns.size >= 10);
  tryUnlock("quest_master", rpg.completedQuests.size >= 10);
  tryUnlock("all_leaders", rpg.metLeaders.size >= 8);
  tryUnlock("ng_plus", rpg.ngPlusCount >= 1);

  // Abyss
  tryUnlock("abyss_10", rpg.abyssRecord >= 10);
  tryUnlock("abyss_25", rpg.abyssRecord >= 25);

  return newlyUnlocked;
}
