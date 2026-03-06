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
import { generateMagicShopSpells, generateArcaneLibrarySpells } from "@rpg/config/RPGSpellDefs";
import type { ArcaneLibraryData } from "@rpg/state/OverworldState";
import type { RPGStateMachine } from "./RPGStateMachine";
import { trackRecruitSteps, resetRecruitStepsOnTownVisit } from "./RecruitSystem";
import { tickBlessings, applyBlessingHpRegen, getBlessingEncounterRateMult, grantBlessing, meetsLeaderSpawnCondition } from "./LeaderEncounterSystem";
import { getLeaderEncounterDef } from "@rpg/config/LeaderEncounterDefs";
import { getLeader } from "@sim/config/LeaderDefs";

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

  // Tick leader blessings and apply HP regen
  tickBlessings(rpg);
  applyBlessingHpRegen(rpg);

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
        townData.magicShopSpells = generateMagicShopSpells(shopSeed + 9973);
      }
      // Ensure magic shop always has stock on first visit
      if (!townData.magicShopSpells) {
        townData.magicShopSpells = generateMagicShopSpells(rpg.seed + rpg.gameTime + 9973);
      }
      resetRecruitStepsOnTownVisit(rpg);
      EventBus.emit("rpgTownEntered", { townId: entity.id });
      stateMachine.transition(RPGPhase.TOWN_MENU);
      break;
    }
    case "arcane_library": {
      const libData = entity.data as ArcaneLibraryData;
      if (rpg.stepsSinceLastTown >= 20) {
        libData.spells = generateArcaneLibrarySpells(rpg.recruitSeed + rpg.gameTime + 13331);
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
      let dialogue = npcData.dialogue;
      let leaderId: string | undefined;
      let leaderTitle: string | undefined;

      // Leader NPC handling — swap dialogue and grant blessing on first meeting
      if (npcData.leaderId) {
        const encDef = getLeaderEncounterDef(npcData.leaderId);
        const ldrDef = getLeader(npcData.leaderId);
        leaderId = npcData.leaderId;
        leaderTitle = ldrDef?.title;

        if (encDef) {
          // Check spawn conditions (level requirements, etc.)
          if (!meetsLeaderSpawnCondition(rpg, encDef)) {
            // Player doesn't meet requirements yet — show a hint
            dialogue = [`A legendary figure stands here, but they seem uninterested in you... for now.`];
            leaderId = undefined;
            leaderTitle = undefined;
          } else if (rpg.metLeaders.has(npcData.leaderId)) {
            // Return visit — shorter dialogue
            dialogue = encDef.returnDialogue;
          } else {
            // First meeting — intro dialogue, mark as met, grant blessing
            dialogue = encDef.introDialogue;
            rpg.metLeaders.add(npcData.leaderId);
            if (encDef.blessing) {
              grantBlessing(rpg, npcData.leaderId, encDef.blessing);
            }
          }
        }
      }

      EventBus.emit("rpgNPCInteraction", {
        npcId: entity.id,
        npcName: entity.name,
        dialogue,
        leaderId,
        leaderTitle,
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

  // Increasing chance with each step, modified by leader blessings
  const blessingMult = getBlessingEncounterRateMult(rpg);
  const chance = baseRate * (1 + overworld.stepsSinceLastEncounter * RPGBalance.ENCOUNTER_RATE_GROWTH) * blessingMult;
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
