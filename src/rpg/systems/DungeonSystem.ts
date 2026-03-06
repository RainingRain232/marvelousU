// Dungeon exploration — movement, room entry, staircase interaction
import { DungeonTileType, RPGPhase } from "@/types";
import type { Vec2 } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import type { DungeonState, DungeonFloor } from "@rpg/state/DungeonState";
import type { RPGState } from "@rpg/state/RPGState";
import type { RPGStateMachine } from "./RPGStateMachine";

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

export function moveDungeonParty(
  rpg: RPGState,
  dungeon: DungeonState,
  dx: number,
  dy: number,
  stateMachine: RPGStateMachine,
): void {
  const floor = dungeon.floors[dungeon.currentFloor];
  if (!floor) return;

  const newX = dungeon.partyPosition.x + dx;
  const newY = dungeon.partyPosition.y + dy;

  // Bounds check
  if (newX < 0 || newX >= floor.width || newY < 0 || newY >= floor.height) return;

  const tile = floor.grid[newY][newX];
  if (!tile.walkable) return;

  const prev: Vec2 = { ...dungeon.partyPosition };
  dungeon.partyPosition = { x: newX, y: newY };
  rpg.dungeonPosition = { x: newX, y: newY };

  EventBus.emit("rpgPartyMoved", { position: { x: newX, y: newY }, previousPosition: prev });

  // Handle tile interaction
  _handleTileInteraction(rpg, dungeon, floor, tile, stateMachine);
}

// ---------------------------------------------------------------------------
// Tile interaction
// ---------------------------------------------------------------------------

function _handleTileInteraction(
  rpg: RPGState,
  dungeon: DungeonState,
  floor: DungeonFloor,
  tile: { x: number; y: number; type: DungeonTileType; roomId: string | null },
  stateMachine: RPGStateMachine,
): void {
  // Stairs
  if (tile.type === DungeonTileType.STAIRS_DOWN) {
    _goDownstairs(dungeon);
    return;
  }
  if (tile.type === DungeonTileType.STAIRS_UP) {
    if (dungeon.currentFloor === 0) {
      // Exit dungeon
      rpg.currentDungeonId = null;
      rpg.currentFloor = 0;
      rpg.dungeonPosition = null;
      EventBus.emit("rpgDungeonExited", { dungeonId: dungeon.dungeonId });
      stateMachine.transition(RPGPhase.OVERWORLD);
    } else {
      _goUpstairs(dungeon);
    }
    return;
  }

  // Chest
  if (tile.type === DungeonTileType.CHEST) {
    const room = tile.roomId ? floor.rooms.find(r => r.id === tile.roomId) : null;
    const items = room?.loot ?? [];
    EventBus.emit("rpgChestOpened", { position: { x: tile.x, y: tile.y }, items });
    // Change tile to floor after opening
    floor.grid[tile.y][tile.x].type = DungeonTileType.FLOOR;
    return;
  }

  // Room entry — check for encounters
  if (tile.roomId) {
    const room = floor.rooms.find(r => r.id === tile.roomId);
    if (room && !room.cleared && room.encounterId) {
      EventBus.emit("rpgRoomRevealed", { roomId: room.id });
      EventBus.emit("rpgEncounterTriggered", {
        encounterId: room.encounterId,
        encounterType: room.type === "boss" ? "boss" : "dungeon",
      });
      room.cleared = true;

      if (rpg.battleMode === "turn") {
        stateMachine.transition(RPGPhase.BATTLE_TURN);
      } else {
        stateMachine.transition(RPGPhase.BATTLE_AUTO);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Floor navigation
// ---------------------------------------------------------------------------

function _goDownstairs(dungeon: DungeonState): void {
  if (dungeon.currentFloor >= dungeon.totalFloors - 1) return;
  dungeon.currentFloor++;
  const nextFloor = dungeon.floors[dungeon.currentFloor];
  dungeon.partyPosition = { ...nextFloor.stairsUp };
  EventBus.emit("rpgDungeonFloorChanged", { floor: dungeon.currentFloor, direction: "down" });
}

function _goUpstairs(dungeon: DungeonState): void {
  if (dungeon.currentFloor <= 0) return;
  dungeon.currentFloor--;
  const prevFloor = dungeon.floors[dungeon.currentFloor];
  if (prevFloor.stairsDown) {
    dungeon.partyPosition = { ...prevFloor.stairsDown };
  }
  EventBus.emit("rpgDungeonFloorChanged", { floor: dungeon.currentFloor, direction: "up" });
}
