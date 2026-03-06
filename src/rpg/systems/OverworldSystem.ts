// Overworld movement, encounters, entity interaction
import type { Vec2 } from "@/types";
import { RPGPhase } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import { SeededRandom } from "@sim/utils/random";
import type { OverworldState, OverworldEntity, DungeonEntranceData, NPCData, TownData, RoamingEnemyData, ShrineData, HerbNodeData, FishingSpotData } from "@rpg/state/OverworldState";
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
import { WORLD_EVENTS } from "@rpg/config/WorldEventDefs";

// ---------------------------------------------------------------------------
// Weather options
// ---------------------------------------------------------------------------

const WEATHER_OPTIONS: Array<RPGState["weather"]> = ["clear", "rain", "snow", "fog"];

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

  // --- Day/night cycle ---
  rpg.timeOfDay = (rpg.timeOfDay + 1) % 240;

  // --- Weather system ---
  rpg.weatherTimer--;
  if (rpg.weatherTimer <= 0) {
    const weatherRng = new SeededRandom(rpg.seed + rpg.gameTime + 77777);
    rpg.weather = weatherRng.pick(WEATHER_OPTIONS);
    rpg.weatherTimer = weatherRng.int(30, 61); // 30-60 steps
  }

  // --- World events (every 10 steps, 10% chance) ---
  if (rpg.gameTime > 0 && rpg.gameTime % 10 === 0) {
    const eventRng = new SeededRandom(rpg.seed + rpg.gameTime + 55555);
    if (eventRng.next() < 0.1) {
      const worldEvent = eventRng.pick(WORLD_EVENTS);
      EventBus.emit("rpgWorldEvent", worldEvent);
    }
  }

  // --- Tick roaming enemies ---
  tickRoamingEnemies(overworld, rpg.gameTime);

  EventBus.emit("rpgPartyMoved", { position: { x: newX, y: newY }, previousPosition: prev });

  // Check entity interaction — only trigger when stepping onto a NEW entity
  // (not when already standing on tiles belonging to the same entity)
  if (tile.entityId) {
    const prevTile = overworld.grid[prev.y]?.[prev.x];
    if (!prevTile || prevTile.entityId !== tile.entityId) {
      const entity = overworld.entities.get(tile.entityId);
      if (entity) {
        _handleEntityInteraction(rpg, overworld, entity, stateMachine);
        return; // Don't check encounters on entity tiles
      }
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
      // Discover this town for fast travel
      rpg.discoveredTowns.add(entity.id);
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
    case "roaming_enemy": {
      const enemyData = entity.data as RoamingEnemyData;
      if (enemyData.defeated || enemyData.respawnCounter > 0) break;
      enemyData.defeated = true;
      enemyData.respawnCounter = 100; // respawn after 100 steps
      EventBus.emit("rpgEncounterTriggered", {
        encounterId: enemyData.encounterId,
        encounterType: "random",
      });
      if (rpg.battleMode === "turn") {
        stateMachine.transition(RPGPhase.BATTLE_TURN);
      } else {
        stateMachine.transition(RPGPhase.BATTLE_AUTO);
      }
      break;
    }
    case "shrine": {
      const shrineData = entity.data as ShrineData;
      if (shrineData.used) break;
      shrineData.used = true;
      shrineData.respawnCounter = 80;
      // Apply buff to all party members
      for (const member of rpg.party) {
        member.statusEffects.push({
          type: shrineData.buff.type as "regen",
          duration: shrineData.buff.duration,
          magnitude: shrineData.buff.magnitude,
        });
      }
      EventBus.emit("rpgShrineUsed", {
        entityId: entity.id,
        buff: shrineData.buff,
      });
      break;
    }
    case "herb_node": {
      const herbData = entity.data as HerbNodeData;
      if (herbData.herbCount <= 0) break;
      herbData.herbCount--;
      if (herbData.herbCount <= 0) {
        herbData.respawnCounter = 60;
      }
      // Add herb to inventory
      const herbSlot = rpg.inventory.items.find(s => s.item.id === "herb");
      if (herbSlot) {
        herbSlot.quantity++;
      } else if (rpg.inventory.items.length < rpg.inventory.maxSlots) {
        rpg.inventory.items.push({
          item: { id: "herb", name: "Herb", type: "consumable", stats: {}, description: "A healing herb.", value: 5 },
          quantity: 1,
        });
      }
      EventBus.emit("rpgHerbGathered", { entityId: entity.id, remaining: herbData.herbCount });
      break;
    }
    case "fishing_spot": {
      const fishData = entity.data as FishingSpotData;
      if (fishData.used) break;
      fishData.used = true;
      fishData.respawnCounter = 50;
      // Grant a small HP heal + some gold
      for (const member of rpg.party) {
        member.hp = Math.min(member.maxHp, member.hp + Math.floor(member.maxHp * 0.2));
      }
      rpg.gold += 10;
      EventBus.emit("rpgFishCaught", { entityId: entity.id });
      break;
    }
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

  // Increasing chance with each step, modified by leader blessings + time of day + weather
  const blessingMult = getBlessingEncounterRateMult(rpg);
  // Night (180-239) increases encounter rate by 50%
  const nightMult = rpg.timeOfDay >= 180 ? 1.5 : 1.0;
  // Fog decreases encounter rate by 30% (enemies can't see you either)
  const fogMult = rpg.weather === "fog" ? 0.7 : 1.0;
  const chance = baseRate * (1 + overworld.stepsSinceLastEncounter * RPGBalance.ENCOUNTER_RATE_GROWTH) * blessingMult * nightMult * fogMult;
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

// ---------------------------------------------------------------------------
// Fast travel
// ---------------------------------------------------------------------------

export function fastTravel(
  rpg: RPGState,
  overworld: OverworldState,
  targetEntityId: string,
  _stateMachine: RPGStateMachine,
): boolean {
  if (!rpg.discoveredTowns.has(targetEntityId)) return false;
  if (rpg.gold < 50) return false;

  const entity = overworld.entities.get(targetEntityId);
  if (!entity || entity.type !== "town") return false;

  rpg.gold -= 50;
  overworld.partyPosition = { x: entity.position.x + 1, y: entity.position.y + 4 };
  rpg.overworldPosition = { ...overworld.partyPosition };

  _revealAround(overworld, overworld.partyPosition.x, overworld.partyPosition.y);

  // Discover the town (should already be discovered, but ensure)
  rpg.discoveredTowns.add(targetEntityId);

  EventBus.emit("rpgFastTravel", { targetEntityId, position: overworld.partyPosition });
  return true;
}

// ---------------------------------------------------------------------------
// Roaming enemy movement
// ---------------------------------------------------------------------------

export function tickRoamingEnemies(overworld: OverworldState, gameTime: number): void {
  // Move roaming enemies 1 tile per 3 player steps
  if (gameTime % 3 !== 0) return;

  const rng = new SeededRandom(gameTime + 31337);

  for (const [, entity] of overworld.entities) {
    if (entity.type !== "roaming_enemy") continue;
    const data = entity.data as RoamingEnemyData;

    // Tick respawn
    if (data.defeated && data.respawnCounter > 0) {
      data.respawnCounter--;
      if (data.respawnCounter <= 0) {
        data.defeated = false;
      }
      continue;
    }
    if (data.defeated) continue;

    // Pick a random adjacent direction
    const dirs: Vec2[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    const dir = rng.pick(dirs);
    const newX = entity.position.x + dir.x;
    const newY = entity.position.y + dir.y;

    // Bounds + walkability check
    if (newX < 0 || newX >= overworld.width || newY < 0 || newY >= overworld.height) continue;
    const tile = overworld.grid[newY][newX];
    if (!tile.walkable) continue;
    if (tile.entityId && tile.entityId !== entity.id) continue;

    // Clear old tile's entityId
    const oldTile = overworld.grid[entity.position.y][entity.position.x];
    if (oldTile.entityId === entity.id) {
      oldTile.entityId = null;
    }

    // Move
    entity.position = { x: newX, y: newY };
    tile.entityId = entity.id;
  }

  // Also tick respawn for shrines, herbs, fishing spots
  for (const [, entity] of overworld.entities) {
    if (entity.type === "shrine") {
      const sData = entity.data as ShrineData;
      if (sData.used && sData.respawnCounter > 0) {
        sData.respawnCounter--;
        if (sData.respawnCounter <= 0) sData.used = false;
      }
    } else if (entity.type === "herb_node") {
      const hData = entity.data as HerbNodeData;
      if (hData.herbCount <= 0 && hData.respawnCounter > 0) {
        hData.respawnCounter--;
        if (hData.respawnCounter <= 0) hData.herbCount = 3;
      }
    } else if (entity.type === "fishing_spot") {
      const fData = entity.data as FishingSpotData;
      if (fData.used && fData.respawnCounter > 0) {
        fData.respawnCounter--;
        if (fData.respawnCounter <= 0) fData.used = false;
      }
    }
  }
}
