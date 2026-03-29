// ---------------------------------------------------------------------------
// Settlers – Enhanced AI opponent with personality system
//   1. Multi-unit coordinated attacks
//   2. Defensive perimeter placement
//   3. Adaptive resource balancing
//   4. Difficulty levels (easy / normal / hard)
//   5. AI personalities (balanced / rusher / turtle / economist / expansionist)
// ---------------------------------------------------------------------------

import { SB } from "../config/SettlersBalance";
import { BUILDING_DEFS, SettlersBuildingType } from "../config/SettlersBuildingDefs";
import { ResourceType } from "../config/SettlersResourceDefs";
import { inBounds } from "../state/SettlersMap";
import { findPath } from "./SettlersPathfinding";
import type { SettlersState } from "../state/SettlersState";
import type { SettlersPlayer } from "../state/SettlersPlayer";
import type { AIPersonality } from "../state/SettlersPlayer";
import { canPlaceBuilding, placeBuilding } from "./SettlersBuildingSystem";
import { createRoad } from "./SettlersRoadSystem";
import { addToProductionQueue } from "./SettlersMilitarySystem";

// ---------------------------------------------------------------------------
// Personality configuration – each personality tweaks AI decision-making
// ---------------------------------------------------------------------------

interface PersonalityConfig {
  /** Multiplier on attack threshold from difficulty (lower = attacks sooner) */
  attackThresholdMult: number;
  /** Multiplier on attack group size from difficulty */
  attackGroupSizeMult: number;
  /** How many ticks the economy phase lasts in the economy/military cycle */
  economyCycleTicks: number;
  /** How many ticks the military phase lasts in the economy/military cycle */
  militaryCycleTicks: number;
  /** When to transition from economy to military phase (phaseTicks threshold) */
  earlyMilitaryTransition: number;
  /** Defense priority multiplier (stacks with difficulty) */
  defensePriorityMult: number;
  /** Extra guard houses / watchtowers / fortresses caps */
  extraGuardHouses: number;
  extraWatchtowers: number;
  extraFortresses: number;
  /** Whether to prioritize barracks in economy phase */
  rushBarracks: boolean;
  /** Whether to prioritize gold mine + mint */
  rushGold: boolean;
  /** Whether to prioritize territory-expanding buildings */
  rushTerritory: boolean;
  /** Minimum garrison to keep per building before attacking (default 1) */
  garrisonReserve: number;
  /** Target selection bias: "nearest" | "hq" | "territory" */
  targetBias: "nearest" | "hq" | "territory";
  /** Extra barracks cap */
  extraBarracks: number;
  /** Extra economy building caps */
  extraWoodcutters: number;
  extraFarms: number;
}

const PERSONALITY_CONFIGS: Record<AIPersonality, PersonalityConfig> = {
  balanced: {
    attackThresholdMult: 1.0,
    attackGroupSizeMult: 1.0,
    economyCycleTicks: 12,
    militaryCycleTicks: 8,
    earlyMilitaryTransition: 10,
    defensePriorityMult: 1.0,
    extraGuardHouses: 0,
    extraWatchtowers: 0,
    extraFortresses: 0,
    rushBarracks: false,
    rushGold: false,
    rushTerritory: false,
    garrisonReserve: 1,
    targetBias: "nearest",
    extraBarracks: 0,
    extraWoodcutters: 0,
    extraFarms: 0,
  },
  rusher: {
    attackThresholdMult: 0.5,      // attacks with far fewer soldiers
    attackGroupSizeMult: 0.7,
    economyCycleTicks: 6,          // short economy phases
    militaryCycleTicks: 14,        // long military phases
    earlyMilitaryTransition: 5,    // switches to military very early
    defensePriorityMult: 0.3,      // barely defends
    extraGuardHouses: 0,
    extraWatchtowers: 0,
    extraFortresses: 0,
    rushBarracks: true,             // builds barracks ASAP
    rushGold: false,
    rushTerritory: false,
    garrisonReserve: 0,            // empties garrisons for attacks
    targetBias: "nearest",
    extraBarracks: 1,              // builds extra barracks
    extraWoodcutters: 0,
    extraFarms: 0,
  },
  turtle: {
    attackThresholdMult: 2.0,      // needs lots of soldiers before attacking
    attackGroupSizeMult: 1.5,      // sends big groups when it does attack
    economyCycleTicks: 14,         // long economy phases
    militaryCycleTicks: 6,
    earlyMilitaryTransition: 15,
    defensePriorityMult: 2.0,      // very high defense priority
    extraGuardHouses: 3,           // lots of guard houses
    extraWatchtowers: 2,           // extra watchtowers
    extraFortresses: 2,            // extra fortresses
    rushBarracks: false,
    rushGold: false,
    rushTerritory: false,
    garrisonReserve: 2,            // keeps 2 soldiers per building
    targetBias: "nearest",
    extraBarracks: 0,
    extraWoodcutters: 1,
    extraFarms: 1,
  },
  economist: {
    attackThresholdMult: 1.5,
    attackGroupSizeMult: 1.0,
    economyCycleTicks: 16,         // very long economy phases
    militaryCycleTicks: 4,         // short military phases
    earlyMilitaryTransition: 18,
    defensePriorityMult: 0.8,
    extraGuardHouses: 1,
    extraWatchtowers: 0,
    extraFortresses: 0,
    rushBarracks: false,
    rushGold: true,                // prioritizes gold production
    rushTerritory: false,
    garrisonReserve: 1,
    targetBias: "nearest",
    extraBarracks: 0,
    extraWoodcutters: 1,
    extraFarms: 1,
  },
  expansionist: {
    attackThresholdMult: 0.8,
    attackGroupSizeMult: 0.9,
    economyCycleTicks: 10,
    militaryCycleTicks: 10,
    earlyMilitaryTransition: 8,
    defensePriorityMult: 1.2,
    extraGuardHouses: 4,           // lots of territory buildings
    extraWatchtowers: 3,
    extraFortresses: 1,
    rushBarracks: false,
    rushGold: false,
    rushTerritory: true,           // prioritizes territory expansion
    garrisonReserve: 1,
    targetBias: "territory",       // attacks territory buildings first
    extraBarracks: 0,
    extraWoodcutters: 1,
    extraFarms: 0,
  },
};

// ---------------------------------------------------------------------------
// Per-AI-player state (keyed by player id)
// ---------------------------------------------------------------------------

interface AIPlayerState {
  timer: number;
  phase: "economy" | "military" | "attack";
  phaseTicks: number;
  /** Soldiers staged for a coordinated attack */
  rallyPool: string[];
  /** Target building for the current rally */
  rallyTarget: string | null;
  /** Ticks spent rallying (to avoid waiting forever) */
  rallyTimer: number;
}

const _aiStates = new Map<string, AIPlayerState>();

function _getAI(playerId: string): AIPlayerState {
  let s = _aiStates.get(playerId);
  if (!s) {
    s = {
      timer: 0,
      phase: "economy",
      phaseTicks: 0,
      rallyPool: [],
      rallyTarget: null,
      rallyTimer: 0,
    };
    _aiStates.set(playerId, s);
  }
  return s;
}

/** Get difficulty settings for the current game state */
function _diff(state: SettlersState) {
  return SB.AI_DIFFICULTY[state.difficulty];
}

/** Get personality config for a player (defaults to balanced) */
function _personality(player: SettlersPlayer): PersonalityConfig {
  return PERSONALITY_CONFIGS[player.aiPersonality || "balanced"];
}

// ---------------------------------------------------------------------------
// Personality reveal system – show AI personality after contact or 5 min
// ---------------------------------------------------------------------------

const REVEAL_TIME_SECONDS = 300; // 5 minutes
const _gameTimers = new Map<string, number>();

function _updatePersonalityReveal(state: SettlersState, player: SettlersPlayer, dt: number): void {
  if (player.aiPersonalityRevealed) return;

  // Track elapsed time
  const elapsed = (_gameTimers.get(player.id) || 0) + dt;
  _gameTimers.set(player.id, elapsed);

  // Reveal after 5 minutes
  if (elapsed >= REVEAL_TIME_SECONDS) {
    player.aiPersonalityRevealed = true;
    return;
  }

  // Reveal on first enemy contact: if any human soldier is fighting an AI soldier
  for (const [, soldier] of state.soldiers) {
    if (soldier.owner === player.id && soldier.state === "fighting") {
      // Check if fighting a human-owned soldier
      for (const combat of state.combats) {
        if (
          (combat.attackerId === soldier.id || combat.defenderId === soldier.id)
        ) {
          const otherId = combat.attackerId === soldier.id ? combat.defenderId : combat.attackerId;
          const other = state.soldiers.get(otherId);
          if (other && other.owner !== player.id) {
            player.aiPersonalityRevealed = true;
            return;
          }
        }
      }
    }
  }

  // Also reveal if human player captures or loses a building to this AI
  // (simplified: reveal if territories are adjacent)
  const humanPlayer = state.players.get("p0");
  if (humanPlayer) {
    const playerIdx = player.id === "p0" ? 0 : 1;
    const humanIdx = 0;
    const map = state.map;
    for (let i = 0; i < map.width * map.height; i++) {
      if (map.territory[i] !== playerIdx) continue;
      const tx = i % map.width;
      const tz = Math.floor(i / map.width);
      for (const [ddx, ddz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const nx = tx + ddx;
        const nz = tz + ddz;
        if (!inBounds(map, nx, nz)) continue;
        if (map.territory[nz * map.width + nx] === humanIdx) {
          player.aiPersonalityRevealed = true;
          return;
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function updateAI(state: SettlersState, dt: number): void {
  for (const [, player] of state.players) {
    if (!player.isAI) continue;
    if (player.defeated) continue;

    // Update personality reveal
    _updatePersonalityReveal(state, player, dt);

    const ai = _getAI(player.id);
    const diff = _diff(state);

    ai.timer += dt;
    if (ai.timer < diff.tickInterval) continue;
    ai.timer = 0;

    // Build efficiency: on easy, sometimes skip a tick
    if (diff.buildEfficiency < 1 && Math.random() > diff.buildEfficiency) continue;

    ai.phaseTicks++;
    _updatePhase(state, player, ai);
    _aiDecision(state, player, ai);

    // Always process rally / coordinated attack logic
    _updateRally(state, player, ai);

    // Keep barracks production queues filled
    _keepBarracksQueued(state, player);
  }
}

/** AI automatically queues units in its military production buildings */
function _keepBarracksQueued(state: SettlersState, player: SettlersPlayer): void {
  const unitProducers: Record<string, string> = {
    [SettlersBuildingType.BARRACKS]: "soldier",
    [SettlersBuildingType.ARCHERY_RANGE]: "archer",
    [SettlersBuildingType.STABLE]: "knight",
  };
  for (const [, building] of state.buildings) {
    if (building.owner !== player.id) continue;
    const unitType = unitProducers[building.type];
    if (!unitType) continue;
    if (!building.active) continue;

    // Keep the queue full
    while (building.productionQueue.length < SB.MAX_PRODUCTION_QUEUE) {
      addToProductionQueue(building, unitType);
    }
  }
}

// ---------------------------------------------------------------------------
// Phase management – AI shifts strategy based on game state + personality
// ---------------------------------------------------------------------------

function _updatePhase(state: SettlersState, player: SettlersPlayer, ai: AIPlayerState): void {
  const counts = _countBuildings(state, player.id);
  const pConfig = _personality(player);

  // Count enemy military presence
  let enemySoldiers = 0;
  for (const [, soldier] of state.soldiers) {
    if (soldier.owner !== player.id) enemySoldiers++;
  }

  const hasSawmill = (counts.get(SettlersBuildingType.SAWMILL) || 0) > 0;
  const hasQuarry = (counts.get(SettlersBuildingType.QUARRY) || 0) > 0;
  const hasBarracks = (counts.get(SettlersBuildingType.BARRACKS) || 0) > 0;

  // Count own garrison
  let ownGarrison = 0;
  for (const [, building] of state.buildings) {
    if (building.owner === player.id) ownGarrison += building.garrison.length;
  }

  const diff = _diff(state);
  const effectiveAttackThreshold = Math.max(1, Math.round(diff.attackThreshold * pConfig.attackThresholdMult));

  // Rusher: skip basic economy requirements if we already have barracks or it is early
  const needsBasicEconomy = !pConfig.rushBarracks || (!hasSawmill && !hasQuarry);

  // Phase transitions
  if (needsBasicEconomy && (!hasSawmill || !hasQuarry)) {
    ai.phase = "economy";
  } else if (enemySoldiers > 4 && ownGarrison < 3) {
    // React to enemy military buildup
    ai.phase = "military";
  } else if (ownGarrison >= effectiveAttackThreshold && ai.phaseTicks > 20) {
    ai.phase = "attack";
  } else if (!hasBarracks) {
    ai.phase = ai.phaseTicks > pConfig.earlyMilitaryTransition ? "military" : "economy";
  } else {
    // Cycle between economy and military based on personality
    const cycleLength = pConfig.economyCycleTicks + pConfig.militaryCycleTicks;
    const cyclePos = ai.phaseTicks % cycleLength;
    ai.phase = cyclePos < pConfig.economyCycleTicks ? "economy" : "military";
  }
}

// ---------------------------------------------------------------------------
// Main AI decision – with adaptive resource balancing + personality
// ---------------------------------------------------------------------------

function _aiDecision(state: SettlersState, player: SettlersPlayer, ai: AIPlayerState): void {
  const counts = _countBuildings(state, player.id);
  const has = (t: SettlersBuildingType) => (counts.get(t) || 0);
  const res = (t: ResourceType) => player.storage.get(t) || 0;
  const pConfig = _personality(player);

  // Check affordability
  const canAffordSmall = res(ResourceType.PLANKS) >= 2 && res(ResourceType.STONE) >= 2;
  const canAffordMedium = res(ResourceType.PLANKS) >= 4 && res(ResourceType.STONE) >= 3;
  const canAffordLarge = res(ResourceType.PLANKS) >= 6 && res(ResourceType.STONE) >= 5;

  function canAfford(type: SettlersBuildingType): boolean {
    const def = BUILDING_DEFS[type];
    switch (def.size) {
      case "small": return canAffordSmall;
      case "medium": return canAffordMedium;
      case "large": return canAffordLarge;
    }
  }

  // ------------------------------------------------------------------
  // Adaptive resource analysis – identify bottlenecks
  // ------------------------------------------------------------------
  const resourceNeeds = _analyzeResourceNeeds(state, player, counts);

  // ------------------------------------------------------------------
  // Build order depends on phase + resource needs + personality
  // ------------------------------------------------------------------
  let buildOrder: { type: SettlersBuildingType; max: number }[];

  if (ai.phase === "economy") {
    buildOrder = _adaptiveEconomyBuildOrder(resourceNeeds, counts, pConfig);
  } else if (ai.phase === "military") {
    buildOrder = _adaptiveMilitaryBuildOrder(resourceNeeds, counts, pConfig);
  } else {
    // Attack phase – initiate coordinated attack, but also build
    _initiateCoordinatedAttack(state, player, ai);
    buildOrder = [
      { type: SettlersBuildingType.WATCHTOWER, max: 3 + pConfig.extraWatchtowers },
      { type: SettlersBuildingType.FORTRESS, max: 2 + pConfig.extraFortresses },
    ];
  }

  // ------------------------------------------------------------------
  // Try defensive placement for military buildings
  // ------------------------------------------------------------------
  for (const order of buildOrder) {
    if (has(order.type) >= order.max) continue;
    if (!canAfford(order.type)) continue;

    const def = BUILDING_DEFS[order.type];
    const isMilitary = def.garrisonSlots > 0 || def.territoryRadius > 0;
    let placed: import("../state/SettlersBuilding").SettlersBuilding | null = null;

    if (isMilitary && def.type !== SettlersBuildingType.BARRACKS) {
      // Try defensive border placement first
      placed = _tryPlaceMilitaryDefensive(state, player.id, order.type);
    }

    if (!placed) {
      placed = _tryPlaceBuilding(state, player.id, order.type);
    }

    if (placed) {
      _tryConnectRoad(state, player.id, placed);
      // Territory recalc is handled by the dirty flag set in placeBuilding
      return;
    }
  }

  // If nothing to build and not in attack phase, consider starting an attack
  if (ai.phase !== "attack") {
    _initiateCoordinatedAttack(state, player, ai);
  }
}

// ---------------------------------------------------------------------------
// Resource analysis – determines what the AI is lacking
// ---------------------------------------------------------------------------

interface ResourceNeeds {
  needPlanks: boolean;
  needStone: boolean;
  needFood: boolean;
  needMilitarySupplies: boolean;
  needBeer: boolean;
  needIron: boolean;
  threatLevel: number; // 0..1 – how threatened the AI feels
}

function _analyzeResourceNeeds(
  state: SettlersState,
  player: SettlersPlayer,
  counts: Map<SettlersBuildingType, number>,
): ResourceNeeds {
  const res = (t: ResourceType) => player.storage.get(t) || 0;

  // Food supply check – mines need food to operate
  const totalFood = res(ResourceType.FISH) + res(ResourceType.BREAD) + res(ResourceType.MEAT);
  const hasFoodProduction =
    (counts.get(SettlersBuildingType.FISHER) || 0) > 0 ||
    (counts.get(SettlersBuildingType.FARM) || 0) > 0 ||
    (counts.get(SettlersBuildingType.HUNTER) || 0) > 0;

  // Iron chain check
  const hasIronChain =
    (counts.get(SettlersBuildingType.IRON_MINE) || 0) > 0 &&
    (counts.get(SettlersBuildingType.COAL_MINE) || 0) > 0 &&
    (counts.get(SettlersBuildingType.SMELTER) || 0) > 0;

  // Military supply check
  const swords = res(ResourceType.SWORD);
  const shields = res(ResourceType.SHIELD);
  const beer = res(ResourceType.BEER);

  // Threat level: how many enemy soldiers are nearby compared to own
  let enemySoldierCount = 0;
  let ownSoldierCount = 0;
  for (const [, soldier] of state.soldiers) {
    if (soldier.owner === player.id) ownSoldierCount++;
    else enemySoldierCount++;
  }
  let ownGarrison = 0;
  for (const [, building] of state.buildings) {
    if (building.owner === player.id) ownGarrison += building.garrison.length;
  }
  const totalOwn = ownSoldierCount + ownGarrison;
  const threatLevel = enemySoldierCount > 0
    ? Math.min(1, enemySoldierCount / Math.max(1, totalOwn))
    : 0;

  return {
    needPlanks: res(ResourceType.PLANKS) < 4 && res(ResourceType.WOOD) < 2,
    needStone: res(ResourceType.STONE) < 3,
    needFood: totalFood < 3 && !hasFoodProduction,
    needMilitarySupplies: (swords < 2 || shields < 2) && hasIronChain,
    needBeer: beer < 2 && (counts.get(SettlersBuildingType.BARRACKS) || 0) > 0,
    needIron: res(ResourceType.IRON) < 2 && !hasIronChain,
    threatLevel,
  };
}

// ---------------------------------------------------------------------------
// Adaptive build orders based on resource needs + personality
// ---------------------------------------------------------------------------

function _adaptiveEconomyBuildOrder(
  needs: ResourceNeeds,
  counts: Map<SettlersBuildingType, number>,
  pConfig: PersonalityConfig,
): { type: SettlersBuildingType; max: number }[] {
  const order: { type: SettlersBuildingType; max: number }[] = [];
  const has = (t: SettlersBuildingType) => counts.get(t) || 0;

  // Always need wood/planks infrastructure first
  if (needs.needPlanks || has(SettlersBuildingType.WOODCUTTER) === 0) {
    order.push({ type: SettlersBuildingType.WOODCUTTER, max: 2 });
    order.push({ type: SettlersBuildingType.SAWMILL, max: 1 });
  }

  // Stone is critical for all construction
  if (needs.needStone || has(SettlersBuildingType.QUARRY) === 0) {
    order.push({ type: SettlersBuildingType.QUARRY, max: 1 });
  }

  // Rusher: squeeze in barracks infrastructure early
  if (pConfig.rushBarracks) {
    order.push({ type: SettlersBuildingType.FISHER, max: 1 });
    order.push({ type: SettlersBuildingType.COAL_MINE, max: 1 });
    order.push({ type: SettlersBuildingType.IRON_MINE, max: 1 });
    order.push({ type: SettlersBuildingType.SMELTER, max: 1 });
    order.push({ type: SettlersBuildingType.SWORD_SMITH, max: 1 });
    order.push({ type: SettlersBuildingType.SHIELD_SMITH, max: 1 });
    order.push({ type: SettlersBuildingType.BREWERY, max: 1 });
    order.push({ type: SettlersBuildingType.BARRACKS, max: 1 });
  }

  // If food is low, prioritize food production before mines
  if (needs.needFood) {
    order.push({ type: SettlersBuildingType.FISHER, max: 1 });
    order.push({ type: SettlersBuildingType.HUNTER, max: 1 });
    order.push({ type: SettlersBuildingType.FARM, max: 1 });
  }

  // Expansionist: prioritize territory buildings early
  if (pConfig.rushTerritory) {
    order.push({ type: SettlersBuildingType.GUARD_HOUSE, max: 2 });
    order.push({ type: SettlersBuildingType.WATCHTOWER, max: 1 });
  } else {
    // Territory expansion (at least one guard house early)
    order.push({ type: SettlersBuildingType.GUARD_HOUSE, max: 1 });
  }

  // If iron supply chain is missing, build it
  if (needs.needIron) {
    // Need food producers first for mines
    if (!needs.needFood) {
      order.push({ type: SettlersBuildingType.FISHER, max: 1 });
    }
    order.push({ type: SettlersBuildingType.COAL_MINE, max: 1 });
    order.push({ type: SettlersBuildingType.IRON_MINE, max: 1 });
    order.push({ type: SettlersBuildingType.SMELTER, max: 1 });
  }

  // Beer production needed for barracks
  if (needs.needBeer) {
    order.push({ type: SettlersBuildingType.FARM, max: 1 });
    order.push({ type: SettlersBuildingType.BREWERY, max: 1 });
  }

  // Economist: rush gold production chain
  if (pConfig.rushGold) {
    order.push({ type: SettlersBuildingType.GOLD_MINE, max: 1 });
    order.push({ type: SettlersBuildingType.COAL_MINE, max: 1 });
    order.push({ type: SettlersBuildingType.MINT, max: 1 });
    // Second gold mine + mint for faster gold accumulation
    order.push({ type: SettlersBuildingType.GOLD_MINE, max: 2 });
    order.push({ type: SettlersBuildingType.MINT, max: 2 });
  }

  // Standard economy expansion
  order.push(
    { type: SettlersBuildingType.FARM, max: 1 + pConfig.extraFarms },
    { type: SettlersBuildingType.MILL, max: 1 },
    { type: SettlersBuildingType.BAKERY, max: 1 },
    { type: SettlersBuildingType.BREWERY, max: 1 },
    { type: SettlersBuildingType.WOODCUTTER, max: 4 + pConfig.extraWoodcutters },
    { type: SettlersBuildingType.GUARD_HOUSE, max: 3 + pConfig.extraGuardHouses },
    { type: SettlersBuildingType.STOREHOUSE, max: 1 },
    { type: SettlersBuildingType.GOLD_MINE, max: 1 },
    { type: SettlersBuildingType.MINT, max: 1 },
  );

  // Expansionist: more territory buildings in economy phase
  if (pConfig.rushTerritory) {
    order.push(
      { type: SettlersBuildingType.WATCHTOWER, max: 2 + pConfig.extraWatchtowers },
      { type: SettlersBuildingType.GUARD_HOUSE, max: 5 + pConfig.extraGuardHouses },
    );
  }

  // If under threat, sprinkle in more military buildings
  if (needs.threatLevel > 0.5) {
    order.unshift({ type: SettlersBuildingType.GUARD_HOUSE, max: 2 });
    order.push({ type: SettlersBuildingType.WATCHTOWER, max: 1 });
  }

  return order;
}

function _adaptiveMilitaryBuildOrder(
  needs: ResourceNeeds,
  _counts: Map<SettlersBuildingType, number>,
  pConfig: PersonalityConfig,
): { type: SettlersBuildingType; max: number }[] {
  const order: { type: SettlersBuildingType; max: number }[] = [];

  // If we need military supplies, prioritize the supply chain
  if (needs.needMilitarySupplies) {
    order.push({ type: SettlersBuildingType.SWORD_SMITH, max: 1 });
    order.push({ type: SettlersBuildingType.SHIELD_SMITH, max: 1 });
  }

  // If iron chain is missing, we need to build that first
  if (needs.needIron) {
    if (needs.needFood) {
      order.push({ type: SettlersBuildingType.FISHER, max: 1 });
    }
    order.push({ type: SettlersBuildingType.COAL_MINE, max: 1 });
    order.push({ type: SettlersBuildingType.IRON_MINE, max: 1 });
    order.push({ type: SettlersBuildingType.SMELTER, max: 1 });
  }

  // Standard military build with personality adjustments
  order.push(
    { type: SettlersBuildingType.SWORD_SMITH, max: 1 },
    { type: SettlersBuildingType.SHIELD_SMITH, max: 1 },
    { type: SettlersBuildingType.BARRACKS, max: 1 + pConfig.extraBarracks },
    { type: SettlersBuildingType.GUARD_HOUSE, max: 3 + pConfig.extraGuardHouses },
    { type: SettlersBuildingType.WATCHTOWER, max: 2 + pConfig.extraWatchtowers },
    { type: SettlersBuildingType.FORTRESS, max: 1 + pConfig.extraFortresses },
    { type: SettlersBuildingType.BARRACKS, max: 2 + pConfig.extraBarracks },
    { type: SettlersBuildingType.BREWERY, max: 2 },
    { type: SettlersBuildingType.WOODCUTTER, max: 3 + pConfig.extraWoodcutters },
  );

  // Economist: keep building gold infrastructure even in military phase
  if (pConfig.rushGold) {
    order.push(
      { type: SettlersBuildingType.GOLD_MINE, max: 2 },
      { type: SettlersBuildingType.MINT, max: 2 },
    );
  }

  // If threatened, build extra defensive structures
  if (needs.threatLevel > 0.4) {
    order.push(
      { type: SettlersBuildingType.WATCHTOWER, max: 3 + pConfig.extraWatchtowers },
      { type: SettlersBuildingType.FORTRESS, max: 2 + pConfig.extraFortresses },
    );
  }

  return order;
}

// ---------------------------------------------------------------------------
// Multi-unit coordinated attack system (personality-aware)
// ---------------------------------------------------------------------------

function _initiateCoordinatedAttack(
  state: SettlersState,
  player: SettlersPlayer,
  ai: AIPlayerState,
): void {
  const diff = _diff(state);
  const pConfig = _personality(player);

  // If we already have a rally in progress, don't start a new one
  if (ai.rallyTarget && ai.rallyPool.length > 0) return;

  // Count total available garrison (soldiers we can pull)
  let totalAvailable = 0;
  for (const [, building] of state.buildings) {
    if (building.owner !== player.id) continue;
    // Keep garrison reserve based on personality
    const reserve = pConfig.garrisonReserve;
    if (building.garrison.length > reserve) {
      totalAvailable += building.garrison.length - reserve;
    }
  }

  // Don't attack unless we have enough soldiers (personality-adjusted threshold)
  const effectiveThreshold = Math.max(1, Math.round(diff.attackThreshold * pConfig.attackThresholdMult));
  if (totalAvailable < effectiveThreshold) return;

  // Find best target based on personality bias
  const hq = state.buildings.get(player.hqId);
  if (!hq) return;

  let bestTarget: string | null = null;
  let bestScore = -Infinity;

  for (const [, building] of state.buildings) {
    if (building.owner === player.id) continue;
    const def = BUILDING_DEFS[building.type];

    const dx = building.tileX - hq.tileX;
    const dz = building.tileZ - hq.tileZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const garrisonCount = building.garrison.length;

    // Only attack if we have enough soldiers to overwhelm the garrison
    if (totalAvailable < garrisonCount + 1) continue;

    let score = 100 - dist * 2 - garrisonCount * 10;

    // Apply personality-based target selection bias
    switch (pConfig.targetBias) {
      case "nearest":
        // Default: favor nearby targets (already reflected in dist penalty)
        if (def.territoryRadius > 0) score += 30;
        if (def.type === SettlersBuildingType.HEADQUARTERS) score += 50;
        break;

      case "hq":
        // Rusher-style: go straight for the HQ
        if (def.type === SettlersBuildingType.HEADQUARTERS) score += 100;
        if (def.territoryRadius > 0) score += 10;
        break;

      case "territory":
        // Expansionist: prioritize territory-granting buildings
        if (def.territoryRadius > 0) score += 60;
        if (def.type === SettlersBuildingType.FORTRESS) score += 40;
        if (def.type === SettlersBuildingType.WATCHTOWER) score += 30;
        if (def.type === SettlersBuildingType.GUARD_HOUSE) score += 20;
        if (def.type === SettlersBuildingType.HEADQUARTERS) score += 50;
        break;
    }

    // Penalty for heavily defended targets
    if (garrisonCount > 4) score -= 20;

    if (score > bestScore) {
      bestScore = score;
      bestTarget = building.id;
    }
  }

  if (!bestTarget) return;

  const targetBuilding = state.buildings.get(bestTarget)!;
  const targetGarrison = targetBuilding.garrison.length;

  // Determine how many soldiers to send (personality-adjusted group size)
  const effectiveGroupSize = Math.max(1, Math.round(diff.attackGroupSize * pConfig.attackGroupSizeMult));
  const desiredCount = Math.min(
    Math.max(targetGarrison + 2, effectiveGroupSize),
    totalAvailable,
  );

  // Gather soldiers from garrisons nearest to the target
  const targetX = (targetBuilding.tileX + 1) * SB.TILE_SIZE;
  const targetZ = (targetBuilding.tileZ + 1) * SB.TILE_SIZE;

  const candidates: { building: import("../state/SettlersBuilding").SettlersBuilding; dist: number }[] = [];
  for (const [, building] of state.buildings) {
    if (building.owner !== player.id) continue;
    if (building.garrison.length <= pConfig.garrisonReserve) continue;
    const bx = (building.tileX + 1) * SB.TILE_SIZE;
    const bz = (building.tileZ + 1) * SB.TILE_SIZE;
    const ddx = bx - targetX;
    const ddz = bz - targetZ;
    candidates.push({ building, dist: Math.sqrt(ddx * ddx + ddz * ddz) });
  }
  candidates.sort((a, b) => a.dist - b.dist);

  let sent = 0;
  for (const c of candidates) {
    if (sent >= desiredCount) break;
    while (c.building.garrison.length > pConfig.garrisonReserve && sent < desiredCount) {
      const soldierId = c.building.garrison.pop()!;
      const soldier = state.soldiers.get(soldierId);
      if (soldier) {
        soldier.state = "marching";
        soldier.garrisonedIn = null;
        const solPlayer = state.players.get(soldier.owner);
        if (solPlayer) solPlayer.freeSoldiers++;
        soldier.targetBuildingId = bestTarget;
        soldier.position = {
          x: (c.building.tileX + 1) * SB.TILE_SIZE,
          y: 0,
          z: (c.building.tileZ + 1) * SB.TILE_SIZE,
        };
        soldier.pathWaypoints = findPath(
          state.map,
          soldier.position.x, soldier.position.z,
          targetX, targetZ,
        );
        ai.rallyPool.push(soldierId);
        sent++;
      }
    }
  }

  if (sent > 0) {
    ai.rallyTarget = bestTarget;
    ai.rallyTimer = 0;
  }
}

/** Track rally progress and clean up finished attacks */
function _updateRally(
  state: SettlersState,
  _player: SettlersPlayer,
  ai: AIPlayerState,
): void {
  if (!ai.rallyTarget || ai.rallyPool.length === 0) {
    ai.rallyPool = [];
    ai.rallyTarget = null;
    return;
  }

  ai.rallyTimer++;

  // Clean up dead or idle soldiers from the rally pool
  ai.rallyPool = ai.rallyPool.filter((id) => {
    const s = state.soldiers.get(id);
    return s && (s.state === "marching" || s.state === "fighting");
  });

  // If all soldiers are done (dead or idle), end the rally
  if (ai.rallyPool.length === 0) {
    ai.rallyTarget = null;
    ai.rallyTimer = 0;
  }

  // If rally has been going too long (60 ticks), abandon it
  if (ai.rallyTimer > 60) {
    ai.rallyPool = [];
    ai.rallyTarget = null;
    ai.rallyTimer = 0;
  }
}

// ---------------------------------------------------------------------------
// Defensive military building placement (personality-aware)
// ---------------------------------------------------------------------------

function _tryPlaceMilitaryDefensive(
  state: SettlersState,
  playerId: string,
  type: SettlersBuildingType,
): import("../state/SettlersBuilding").SettlersBuilding | null {
  const map = state.map;
  const player = state.players.get(playerId);
  if (!player) return null;
  const playerIdx = playerId === "p0" ? 0 : 1;
  const diff = _diff(state);
  const pConfig = _personality(player);

  // Only do defensive placement with some probability based on difficulty + personality
  const effectiveDefensePriority = Math.min(1, diff.defensePriority * pConfig.defensePriorityMult);
  if (Math.random() > effectiveDefensePriority) return null;

  // Find border tiles: our territory tiles adjacent to neutral or enemy territory
  const borderTiles: { x: number; z: number; enemyDist: number }[] = [];

  for (let tz = 1; tz < map.height - 1; tz++) {
    for (let tx = 1; tx < map.width - 1; tx++) {
      const idx = tz * map.width + tx;
      if (map.territory[idx] !== playerIdx) continue;

      // Check if this is a border tile (adjacent to non-owned territory)
      let isBorder = false;
      let nearEnemy = false;
      for (const [ddx, ddz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = tx + ddx;
        const nz = tz + ddz;
        if (!inBounds(map, nx, nz)) continue;
        const nIdx = nz * map.width + nx;
        if (map.territory[nIdx] !== playerIdx) {
          isBorder = true;
          if (map.territory[nIdx] >= 0 && map.territory[nIdx] !== playerIdx) {
            nearEnemy = true;
          }
        }
      }

      if (!isBorder) continue;

      // Calculate distance to nearest enemy building
      let minEnemyDist = Infinity;
      for (const [, building] of state.buildings) {
        if (building.owner === playerId) continue;
        const dx = building.tileX - tx;
        const dz = building.tileZ - tz;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < minEnemyDist) minEnemyDist = d;
      }

      // Prioritize tiles near enemy territory
      // Expansionist: prefer tiles farther from HQ (to expand outward)
      let priority: number;
      if (pConfig.rushTerritory) {
        const hq = state.buildings.get(player.hqId);
        if (hq) {
          const hqDist = Math.sqrt((tx - hq.tileX) ** 2 + (tz - hq.tileZ) ** 2);
          // Prefer expansion direction: favor farther from HQ but still near border
          priority = nearEnemy ? minEnemyDist * 0.5 - hqDist * 0.3 : minEnemyDist + 50 - hqDist * 0.2;
        } else {
          priority = nearEnemy ? minEnemyDist : minEnemyDist + 100;
        }
      } else {
        priority = nearEnemy ? minEnemyDist : minEnemyDist + 100;
      }
      borderTiles.push({ x: tx, z: tz, enemyDist: priority });
    }
  }

  // Sort by priority (lower = better: closer to enemy border)
  borderTiles.sort((a, b) => a.enemyDist - b.enemyDist);

  // Make sure we don't cluster military buildings too close together
  const existingMilitary: { x: number; z: number }[] = [];
  for (const [, building] of state.buildings) {
    if (building.owner !== playerId) continue;
    const bDef = BUILDING_DEFS[building.type];
    if (bDef.garrisonSlots > 0) {
      existingMilitary.push({ x: building.tileX, z: building.tileZ });
    }
  }

  // Expansionist allows slightly closer clustering (3 vs 5)
  const minClusterDist = pConfig.rushTerritory ? 3 : 5;

  // Try top border tile candidates
  const maxTries = Math.min(borderTiles.length, 40);
  for (let i = 0; i < maxTries; i++) {
    const tile = borderTiles[i];

    // Check minimum distance from existing military buildings (avoid clustering)
    let tooClose = false;
    for (const m of existingMilitary) {
      const dx = m.x - tile.x;
      const dz = m.z - tile.z;
      if (Math.sqrt(dx * dx + dz * dz) < minClusterDist) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    const error = canPlaceBuilding(state, type, tile.x, tile.z, playerId);
    if (!error) {
      return placeBuilding(state, type, tile.x, tile.z, playerId);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _countBuildings(state: SettlersState, playerId: string): Map<SettlersBuildingType, number> {
  const counts = new Map<SettlersBuildingType, number>();
  for (const [, b] of state.buildings) {
    if (b.owner !== playerId) continue;
    counts.set(b.type, (counts.get(b.type) || 0) + 1);
  }
  return counts;
}

function _tryPlaceBuilding(
  state: SettlersState,
  playerId: string,
  type: SettlersBuildingType,
): import("../state/SettlersBuilding").SettlersBuilding | null {
  const map = state.map;
  const player = state.players.get(playerId);
  if (!player) return null;
  const hq = state.buildings.get(player.hqId);
  if (!hq) return null;

  const cx = hq.tileX;
  const cz = hq.tileZ;

  for (let r = 2; r < 25; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const tx = cx + dx;
        const tz = cz + dz;
        if (!inBounds(map, tx, tz)) continue;

        const error = canPlaceBuilding(state, type, tx, tz, playerId);
        if (!error) {
          return placeBuilding(state, type, tx, tz, playerId);
        }
      }
    }
  }

  return null;
}

function _tryConnectRoad(
  state: SettlersState,
  playerId: string,
  building: import("../state/SettlersBuilding").SettlersBuilding,
): void {
  const buildingFlag = state.flags.get(building.flagId);
  if (!buildingFlag) return;
  if (buildingFlag.connectedRoads.length > 0) return;

  let bestDist = Infinity;
  let bestFlag: import("../state/SettlersRoad").SettlersFlag | null = null;

  for (const [, flag] of state.flags) {
    if (flag.id === buildingFlag.id) continue;
    if (flag.owner !== playerId) continue;

    const dx = flag.tileX - buildingFlag.tileX;
    const dz = flag.tileZ - buildingFlag.tileZ;
    const dist = Math.abs(dx) + Math.abs(dz);

    if (dist < bestDist && dist < 15) {
      bestDist = dist;
      bestFlag = flag;
    }
  }

  if (!bestFlag) return;

  const path: { x: number; z: number }[] = [];
  let cx = buildingFlag.tileX;
  let cz = buildingFlag.tileZ;
  path.push({ x: cx, z: cz });

  while (cx !== bestFlag.tileX || cz !== bestFlag.tileZ) {
    const dx = bestFlag.tileX - cx;
    const dz = bestFlag.tileZ - cz;
    if (Math.abs(dx) > Math.abs(dz)) {
      cx += dx > 0 ? 1 : -1;
    } else {
      cz += dz > 0 ? 1 : -1;
    }
    path.push({ x: cx, z: cz });
  }

  createRoad(state, buildingFlag.id, bestFlag.id, path, playerId);
}
