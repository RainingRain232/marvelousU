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
  demon_fortress: {
    id: "demon_fortress",
    name: "Demon Fortress",
    floors: 6,
    gridWidth: 50,
    gridHeight: 40,
    minRoomSize: 6,
    maxRoomSize: 12,
    encounterTable: ["dungeon_demon_guard", "dungeon_vampires", "dungeon_golems", "dungeon_lich_servants"],
    bossEncounterId: "boss_demon_lord",
    theme: "volcanic",
    recommendedLevel: 15,
  },
  abyssal_sanctum: {
    id: "abyssal_sanctum",
    name: "Abyssal Sanctum",
    floors: 7,
    gridWidth: 55,
    gridHeight: 45,
    minRoomSize: 6,
    maxRoomSize: 12,
    encounterTable: ["dungeon_demon_guard", "dungeon_golems", "dungeon_vampires", "dungeon_mages", "dungeon_lich_servants"],
    bossEncounterId: "boss_final",
    theme: "ruins",
    recommendedLevel: 20,
  },
  the_abyss: {
    id: "the_abyss",
    name: "The Abyss",
    floors: 999,
    gridWidth: 45,
    gridHeight: 35,
    minRoomSize: 5,
    maxRoomSize: 10,
    encounterTable: [
      "dungeon_rats", "dungeon_spiders", "goblin_patrol", "dungeon_sentinels",
      "dungeon_undead", "skeleton_patrol", "dungeon_mages",
      "dungeon_golems", "dungeon_vampires", "dungeon_demon_guard", "dungeon_lich_servants",
    ],
    bossEncounterId: "boss_ancient_wyrm",
    theme: "crypt",
    recommendedLevel: 25,
  },
};
