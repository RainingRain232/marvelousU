import type { RPGState } from "@rpg/state/RPGState";
import { EventBus } from "@sim/core/EventBus";

export interface TutorialTip {
  id: string;
  message: string;
}

const TUTORIALS: TutorialTip[] = [
  { id: "movement", message: "Use arrow keys or WASD to move around the world." },
  { id: "town", message: "Enter a town to rest at the inn, buy equipment, and recruit allies." },
  { id: "inventory", message: "Press I to open your inventory and use items." },
  { id: "shop", message: "Buy gear to make your party stronger before venturing into dungeons." },
  { id: "dungeon", message: "Dungeons contain powerful enemies and valuable loot. Prepare well!" },
  { id: "formation", message: "Set your formation in the Party menu. Front row takes more hits but deals more damage." },
  { id: "save", message: "Remember to save your progress at the pause menu!" },
];

export function shouldShowTutorial(rpg: RPGState, tutorialId: string): boolean {
  return !rpg.tutorialFlags[tutorialId];
}

export function markTutorialShown(rpg: RPGState, tutorialId: string): void {
  rpg.tutorialFlags[tutorialId] = true;
}

export function getTutorialTip(id: string): TutorialTip | undefined {
  return TUTORIALS.find(t => t.id === id);
}

/** Check and emit tutorial events based on game state. */
export function checkTutorials(rpg: RPGState, context: string): void {
  const mapping: Record<string, string> = {
    "first_move": "movement",
    "near_town": "town",
    "first_loot": "inventory",
    "town_enter": "shop",
    "near_dungeon": "dungeon",
    "first_battle": "formation",
  };

  const tutorialId = mapping[context];
  if (tutorialId && shouldShowTutorial(rpg, tutorialId)) {
    const tip = getTutorialTip(tutorialId);
    if (tip) {
      markTutorialShown(rpg, tutorialId);
      EventBus.emit("rpgTutorialTip", { tipId: tip.id, message: tip.message });
    }
  }
}
