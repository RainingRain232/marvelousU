// Overworld movement, encounters, entity interaction
import type { Vec2 } from "@/types";
import { RPGPhase } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import { SeededRandom } from "@sim/utils/random";
import type { OverworldState, OverworldEntity, DungeonEntranceData, NPCData, TownData } from "@rpg/state/OverworldState";
import type { RPGState } from "@rpg/state/RPGState";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";
import { OVERWORLD_ENCOUNTERS } from "@rpg/config/EncounterDefs";
import { generateShopInventory } from "@rpg/config/RPGItemDefs";
import type { RPGStateMachine } from "./RPGStateMachine";
import { trackRecruitSteps, resetRecruitStepsOnTownVisit } from "./RecruitSystem";

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

export function moveParty(
  rpg: RPGState,
  overworld: OverworldState,
  dx: number,
  dy: number,
  stateMachine: RPGStateMachine,
): void {
  const newX = overworld.partyPosition.x + dx;
  const newY = overworld.partyPosition.y + dy;

  // Bounds check
  if (newX < 0 || newX >= overworld.width || newY < 0 || newY >= overworld.height) return;

  const tile = overworld.grid[newY][newX];
  if (!tile.walkable) return;

  const prev: Vec2 = { ...overworld.partyPosition };
  overworld.partyPosition = { x: newX, y: newY };
  rpg.overworldPosition = { x: newX, y: newY };

  // Reveal tiles
  _revealAround(overworld, newX, newY);

  // Track steps for recruit roster reset
  trackRecruitSteps(rpg);

  EventBus.emit("rpgPartyMoved", { position: { x: newX, y: newY }, previousPosition: prev });

  // Check entity interaction
  if (tile.entityId) {
    const entity = overworld.entities.get(tile.entityId);
    if (entity) {
      _handleEntityInteraction(rpg, overworld, entity, stateMachine);
      return; // Don't check encounters on entity tiles
    }
  }

  // Check random encounter
  _checkRandomEncounter(rpg, overworld, tile.encounterRate, tile.type, stateMachine);
}

// ---------------------------------------------------------------------------
// Fog of war
// ---------------------------------------------------------------------------

function _revealAround(overworld: OverworldState, cx: number, cy: number): void {
  const r = RPGBalance.VISION_RADIUS;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const tx = cx + dx;
      const ty = cy + dy;
      if (tx >= 0 && tx < overworld.width && ty >= 0 && ty < overworld.height) {
        overworld.grid[ty][tx].discovered = true;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Entity interaction
// ---------------------------------------------------------------------------

function _handleEntityInteraction(
  rpg: RPGState,
  _overworld: OverworldState,
  entity: OverworldEntity,
  stateMachine: RPGStateMachine,
): void {
  switch (entity.type) {
    case "town": {
      // Refresh shop inventory if 20+ steps since last town visit
      const townData = entity.data as TownData;
      if (rpg.stepsSinceLastTown >= 20) {
        const shopSeed = rpg.recruitSeed + rpg.gameTime + rpg.stepsSinceLastTown;
        townData.shopItems = generateShopInventory(townData.shopTier, shopSeed);
      }
      resetRecruitStepsOnTownVisit(rpg);
      EventBus.emit("rpgTownEntered", { townId: entity.id });
      stateMachine.transition(RPGPhase.TOWN_MENU);
      break;
    }
    case "dungeon_entrance": {
      const data = entity.data as DungeonEntranceData;
      rpg.currentDungeonId = data.dungeonId;
      rpg.currentFloor = 0;
      EventBus.emit("rpgDungeonEntered", { dungeonId: data.dungeonId });
      stateMachine.transition(RPGPhase.DUNGEON);
      break;
    }
    case "chest": {
      // Handled by view layer (prompt to open)
      break;
    }
    case "npc": {
      const npcData = entity.data as NPCData;
      EventBus.emit("rpgNPCInteraction", {
        npcId: entity.id,
        npcName: entity.name,
        dialogue: npcData.dialogue,
      });
      break;
    }
    case "landmark":
      break;
  }
}

// ---------------------------------------------------------------------------
// Random encounters
// ---------------------------------------------------------------------------

function _checkRandomEncounter(
  rpg: RPGState,
  overworld: OverworldState,
  baseRate: number,
  tileType: string,
  stateMachine: RPGStateMachine,
): void {
  overworld.stepsSinceLastEncounter++;

  // Increasing chance with each step
  const chance = baseRate * (1 + overworld.stepsSinceLastEncounter * RPGBalance.ENCOUNTER_RATE_GROWTH);
  const rng = new SeededRandom(rpg.seed + rpg.gameTime);
  rpg.gameTime++;

  if (rng.next() >= chance) return;

  // Trigger encounter
  overworld.stepsSinceLastEncounter = 0;

  // Pick encounter from table
  const table = OVERWORLD_ENCOUNTERS[tileType] ?? OVERWORLD_ENCOUNTERS["grass"];
  if (!table || table.length === 0) return;

  const encounterId = rng.pick(table);

  EventBus.emit("rpgEncounterTriggered", {
    encounterId,
    encounterType: "random",
  });

  if (rpg.battleMode === "turn") {
    stateMachine.transition(RPGPhase.BATTLE_TURN);
  } else {
    stateMachine.transition(RPGPhase.BATTLE_AUTO);
  }
}
