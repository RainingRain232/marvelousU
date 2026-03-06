export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  /** Check function is called after battles, quests, etc. */
  checkType: "manual"; // all checked manually via AchievementSystem
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first_blood", name: "First Blood", description: "Win your first battle", checkType: "manual" },
  { id: "goblin_slayer", name: "Goblin Slayer", description: "Defeat 50 goblin encounters", checkType: "manual" },
  { id: "dragon_slayer", name: "Dragon Slayer", description: "Defeat the Red Dragon", checkType: "manual" },
  { id: "lich_bane", name: "Lich Bane", description: "Defeat the Lich Lord", checkType: "manual" },
  { id: "demon_vanquisher", name: "Demon Vanquisher", description: "Defeat the Demon Lord", checkType: "manual" },
  { id: "world_savior", name: "World Savior", description: "Defeat The Dark One and save the realm", checkType: "manual" },
  { id: "completionist", name: "Completionist", description: "Collect all 20 lore entries", checkType: "manual" },
  { id: "untouchable", name: "Untouchable", description: "Clear a dungeon without any party member being KO'd", checkType: "manual" },
  { id: "max_power", name: "Max Power", description: "Reach level 30 with any party member", checkType: "manual" },
  { id: "wealthy", name: "Wealthy", description: "Have 5000 or more gold at once", checkType: "manual" },
  { id: "full_party", name: "Full Party", description: "Have 6 party members", checkType: "manual" },
  { id: "promoted", name: "Promoted", description: "Promote a party member for the first time", checkType: "manual" },
  { id: "master_crafter", name: "Master Crafter", description: "Craft a legendary item", checkType: "manual" },
  { id: "explorer", name: "Explorer", description: "Discover all 10 towns", checkType: "manual" },
  { id: "quest_master", name: "Quest Master", description: "Complete 10 quests", checkType: "manual" },
  { id: "abyss_10", name: "Abyss Diver", description: "Reach floor 10 in The Abyss", checkType: "manual" },
  { id: "abyss_25", name: "Abyss Veteran", description: "Reach floor 25 in The Abyss", checkType: "manual" },
  { id: "all_leaders", name: "Legend Seeker", description: "Meet all legendary leaders", checkType: "manual" },
  { id: "ng_plus", name: "New Beginnings", description: "Start a New Game+", checkType: "manual" },
  { id: "arena_champion", name: "Arena Champion", description: "Win 10 arena battles", checkType: "manual" },
];

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENT_DEFS.find(a => a.id === id);
}
