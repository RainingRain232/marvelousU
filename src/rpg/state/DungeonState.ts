// Dungeon crawling state — floors, rooms, fog of war
import type { DungeonTileType, Vec2 } from "@/types";
import type { RPGItem } from "./RPGState";

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export interface DungeonRoom {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  type: "normal" | "treasure" | "boss" | "safe" | "entrance" | "exit" | "secret" | "puzzle";
  cleared: boolean;
  encounterId: string | null;
  loot: RPGItem[];
  /** For secret rooms: whether the fake wall has been discovered. */
  secretRevealed?: boolean;
  /** For puzzle rooms: whether the puzzle has been solved. */
  puzzleSolved?: boolean;
  /** For puzzle rooms: the puzzle type. */
  puzzleType?: "lever_order" | "pressure_plates" | "symbol_match";
  /** For puzzle rooms: the correct solution (sequence of indices). */
  puzzleSolution?: number[];
}

// ---------------------------------------------------------------------------
// Floor
// ---------------------------------------------------------------------------

export type TrapType = "spike" | "poison" | "alarm";

export interface DungeonTile {
  x: number;
  y: number;
  type: DungeonTileType;
  walkable: boolean;
  visible: boolean;
  revealed: boolean;
  roomId: string | null;
  /** Trap data (only when type === DungeonTileType.TRAP). */
  trapType?: TrapType;
  /** Whether this trap has already been triggered. */
  trapTriggered?: boolean;
  /** Whether a Rogue has detected this trap (visible to player). */
  trapDetected?: boolean;
  /** Whether this wall tile hides a secret room passage. */
  isSecretWall?: boolean;
  /** The room id the secret wall leads to. */
  secretRoomId?: string;
}

export interface DungeonFloor {
  level: number;
  grid: DungeonTile[][];
  width: number;
  height: number;
  rooms: DungeonRoom[];
  corridors: Vec2[][];
  stairsDown: Vec2 | null;
  stairsUp: Vec2;
}

// ---------------------------------------------------------------------------
// DungeonState
// ---------------------------------------------------------------------------

export interface DungeonState {
  dungeonId: string;
  name: string;
  theme: string;
  floors: DungeonFloor[];
  currentFloor: number;
  partyPosition: Vec2;
  totalFloors: number;
  bossDefeated: boolean;
}
