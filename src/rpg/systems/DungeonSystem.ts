// Dungeon exploration — movement, room entry, staircase interaction, traps, secrets, puzzles
import { DungeonTileType, RPGPhase, UnitType } from "@/types";
import type { Vec2 } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import type { DungeonState, DungeonFloor, DungeonTile } from "@rpg/state/DungeonState";
import type { RPGState } from "@rpg/state/RPGState";
import type { RPGStateMachine } from "./RPGStateMachine";

// ---------------------------------------------------------------------------
// Rogue class detection (for trap disarming)
// ---------------------------------------------------------------------------

const ROGUE_UNIT_TYPES: Set<UnitType> = new Set([
  UnitType.ARCHER,
  UnitType.ASSASSIN,
  UnitType.LONGBOWMAN,
]);

function partyHasRogue(rpg: RPGState): boolean {
  return rpg.party.some(m => m.hp > 0 && ROGUE_UNIT_TYPES.has(m.unitType));
}

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

  // Secret wall interaction: if the player bumps into a secret wall, reveal it
  if (!tile.walkable && tile.isSecretWall) {
    _revealSecretWall(floor, tile, newX, newY);
    return; // Don't move into it this step — player must step again
  }

  if (!tile.walkable) return;

  const prev: Vec2 = { ...dungeon.partyPosition };
  dungeon.partyPosition = { x: newX, y: newY };
  rpg.dungeonPosition = { x: newX, y: newY };

  EventBus.emit("rpgPartyMoved", { position: { x: newX, y: newY }, previousPosition: prev });

  // Rogue trap detection: reveal traps in adjacent tiles
  if (partyHasRogue(rpg)) {
    _detectTrapsAround(floor, newX, newY);
  }

  // Handle tile interaction
  _handleTileInteraction(rpg, dungeon, floor, floor.grid[newY][newX], stateMachine);
}

// ---------------------------------------------------------------------------
// Secret wall reveal
// ---------------------------------------------------------------------------

function _revealSecretWall(
  floor: DungeonFloor,
  tile: DungeonTile,
  x: number,
  y: number,
): void {
  tile.type = DungeonTileType.DOOR;
  tile.walkable = true;
  tile.isSecretWall = false;

  // Mark the secret room as revealed
  if (tile.secretRoomId) {
    const room = floor.rooms.find(r => r.id === tile.secretRoomId);
    if (room) {
      room.secretRevealed = true;
    }
  }

  EventBus.emit("rpgSecretRoomFound", { position: { x, y }, roomId: tile.secretRoomId });
}

// ---------------------------------------------------------------------------
// Trap detection (Rogue ability)
// ---------------------------------------------------------------------------

function _detectTrapsAround(floor: DungeonFloor, cx: number, cy: number): void {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = cx + dx;
      const ty = cy + dy;
      if (tx < 0 || tx >= floor.width || ty < 0 || ty >= floor.height) continue;
      const tile = floor.grid[ty][tx];
      if (tile.type === DungeonTileType.TRAP && !tile.trapDetected && !tile.trapTriggered) {
        tile.trapDetected = true;
        EventBus.emit("rpgTrapDetected", { position: { x: tx, y: ty }, trapType: tile.trapType });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Trap disarming (Rogue can disarm detected traps)
// ---------------------------------------------------------------------------

export function disarmTrap(
  rpg: RPGState,
  dungeon: DungeonState,
  x: number,
  y: number,
): boolean {
  if (!partyHasRogue(rpg)) return false;

  const floor = dungeon.floors[dungeon.currentFloor];
  if (!floor) return false;

  const tile = floor.grid[y]?.[x];
  if (!tile || tile.type !== DungeonTileType.TRAP || !tile.trapDetected || tile.trapTriggered) return false;

  // Disarm: convert to floor
  tile.type = DungeonTileType.FLOOR;
  tile.trapTriggered = true;
  EventBus.emit("rpgTrapDisarmed", { position: { x, y }, trapType: tile.trapType });
  return true;
}

// ---------------------------------------------------------------------------
// Tile interaction
// ---------------------------------------------------------------------------

function _handleTileInteraction(
  rpg: RPGState,
  dungeon: DungeonState,
  floor: DungeonFloor,
  tile: DungeonTile,
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

  // Trap interaction
  if (tile.type === DungeonTileType.TRAP && !tile.trapTriggered) {
    _triggerTrap(rpg, dungeon, floor, tile, stateMachine);
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

  // Room entry — check for encounters and puzzles
  if (tile.roomId) {
    const room = floor.rooms.find(r => r.id === tile.roomId);
    if (!room) return;

    // Puzzle room interaction
    if (room.type === "puzzle" && !room.puzzleSolved) {
      EventBus.emit("rpgPuzzleRoomEntered", {
        roomId: room.id,
        puzzleType: room.puzzleType,
        solutionLength: room.puzzleSolution?.length ?? 3,
      });
      return; // Don't trigger encounters in puzzle rooms
    }

    if (!room.cleared && room.encounterId) {
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
// Trap triggering
// ---------------------------------------------------------------------------

function _triggerTrap(
  rpg: RPGState,
  _dungeon: DungeonState,
  _floor: DungeonFloor,
  tile: DungeonTile,
  stateMachine: RPGStateMachine,
): void {
  tile.trapTriggered = true;
  tile.type = DungeonTileType.FLOOR; // Trap consumed after triggering

  const trapType = tile.trapType ?? "spike";

  switch (trapType) {
    case "spike": {
      // 20 damage to all party members
      const damage = 20;
      for (const member of rpg.party) {
        if (member.hp > 0) {
          member.hp = Math.max(1, member.hp - damage);
        }
      }
      EventBus.emit("rpgTrapTriggered", { position: { x: tile.x, y: tile.y }, trapType, damage });
      break;
    }
    case "poison": {
      // Apply poison status to all party members
      for (const member of rpg.party) {
        if (member.hp > 0) {
          const hasPoison = member.statusEffects.some(e => e.type === "poison");
          if (!hasPoison) {
            member.statusEffects.push({ type: "poison", duration: 5, magnitude: 5 });
          }
        }
      }
      EventBus.emit("rpgTrapTriggered", { position: { x: tile.x, y: tile.y }, trapType, damage: 0 });
      break;
    }
    case "alarm": {
      // Spawn extra enemies — trigger a random encounter
      EventBus.emit("rpgTrapTriggered", { position: { x: tile.x, y: tile.y }, trapType, damage: 0 });
      // Trigger an encounter
      EventBus.emit("rpgEncounterTriggered", {
        encounterId: "dungeon_rats", // Default fallback encounter
        encounterType: "dungeon" as const,
      });
      if (rpg.battleMode === "turn") {
        stateMachine.transition(RPGPhase.BATTLE_TURN);
      } else {
        stateMachine.transition(RPGPhase.BATTLE_AUTO);
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Puzzle solving
// ---------------------------------------------------------------------------

/**
 * Attempt to solve a puzzle room. The player submits a sequence of indices.
 * Returns true if the puzzle is solved correctly.
 */
export function solvePuzzle(
  rpg: RPGState,
  dungeon: DungeonState,
  roomId: string,
  playerSolution: number[],
): boolean {
  const floor = dungeon.floors[dungeon.currentFloor];
  if (!floor) return false;

  const room = floor.rooms.find(r => r.id === roomId);
  if (!room || room.type !== "puzzle" || room.puzzleSolved) return false;

  const solution = room.puzzleSolution ?? [];
  if (playerSolution.length !== solution.length) return false;

  const correct = solution.every((val, idx) => playerSolution[idx] === val);
  if (!correct) {
    EventBus.emit("rpgPuzzleFailed", { roomId });
    return false;
  }

  room.puzzleSolved = true;
  room.cleared = true;

  // Grant bonus XP and loot
  const bonusXp = 50 + dungeon.currentFloor * 20;
  for (const member of rpg.party) {
    member.xp += bonusXp;
  }

  EventBus.emit("rpgPuzzleSolved", {
    roomId,
    bonusXp,
    loot: room.loot,
  });

  return true;
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
