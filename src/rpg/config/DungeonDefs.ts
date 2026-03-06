// Dungeon definitions for RPG mode

export interface DungeonDef {
  id: string;
  name: string;
  floors: number;
  gridWidth: number;
  gridHeight: number;
  minRoomSize: number;
  maxRoomSize: number;
  encounterTable: string[];
  bossEncounterId: string;
  theme: "cave" | "crypt" | "tower" | "ruins" | "volcanic";
  recommendedLevel: number;
}

export const DUNGEON_DEFS: Record<string, DungeonDef> = {
  goblin_caves: {
    id: "goblin_caves",
    name: "Goblin Caves",
    floors: 3,
    gridWidth: 40,
    gridHeight: 30,
    minRoomSize: 5,
    maxRoomSize: 9,
    encounterTable: ["dungeon_rats", "dungeon_spiders", "goblin_patrol"],
    bossEncounterId: "boss_troll_king",
    theme: "cave",
    recommendedLevel: 3,
  },
  dark_crypt: {
    id: "dark_crypt",
    name: "Dark Crypt",
    floors: 4,
    gridWidth: 45,
    gridHeight: 35,
    minRoomSize: 5,
    maxRoomSize: 10,
    encounterTable: ["dungeon_undead", "skeleton_patrol", "dungeon_mages"],
    bossEncounterId: "boss_lich",
    theme: "crypt",
    recommendedLevel: 6,
  },
  dragon_lair: {
    id: "dragon_lair",
    name: "Dragon's Lair",
    floors: 5,
    gridWidth: 50,
    gridHeight: 40,
    minRoomSize: 6,
    maxRoomSize: 12,
    encounterTable: ["dungeon_mages", "dungeon_undead", "dungeon_spiders"],
    bossEncounterId: "boss_dragon",
    theme: "volcanic",
    recommendedLevel: 10,
  },
};
