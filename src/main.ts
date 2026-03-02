import { viewManager } from "@view/ViewManager";
import { gridRenderer } from "@view/GridRenderer";
import { buildingLayer } from "@view/BuildingLayer";
import { unitLayer } from "@view/UnitLayer";
import { hud } from "@view/ui/HUD";
import { shopPanel } from "@view/ui/ShopPanel";
import { buildingPlacer } from "@view/ui/BuildingPlacer";
import { inputManager } from "@input/InputManager";
import { unitQueueUI } from "@view/ui/UnitQueueUI";
import { p2AIBuyer } from "@view/ui/P2AIBuyer";
import { fireballFX } from "@view/fx/FireballFX";
import { lightningFX } from "@view/fx/LightningFX";
import { summonFX } from "@view/fx/SummonFX";
import { deathFX } from "@view/fx/DeathFX";
import { iceBallFX } from "@view/fx/IceBallFX";
import { webFX } from "@view/fx/WebFX";
import { turretArrowFX } from "@view/fx/TurretArrowFX";
import { turretLightningFX } from "@view/fx/TurretLightningFX";
import { arrowFX } from "@view/fx/ArrowFX";
import { catapultBoulderFX } from "@view/fx/CatapultBoulderFX";
import { eventBanner } from "@view/ui/EventBanner";
import { distortionFX } from "@view/fx/DistortionFX";
import { healFX } from "@view/fx/HealFX";
import { damageNumberFX } from "@view/fx/DamageNumberFX";
import { flagFX } from "@view/fx/FlagFX";
import { runeCircleFX } from "@view/fx/RuneCircleFX";
import { animationManager } from "@view/animation/AnimationManager";
import { environmentLayer } from "@view/environment/EnvironmentLayer";
import { startScreen } from "@view/ui/StartScreen";
import { menuScreen } from "@view/ui/MenuScreen";
import type { MapSize } from "@view/ui/MenuScreen";
import { leaderSelectScreen } from "@view/ui/LeaderSelectScreen";
import { raceSelectScreen } from "@view/ui/RaceSelectScreen";
import { armoryScreen } from "@view/ui/ArmoryScreen";
import { scenarioSelectScreen } from "@view/ui/ScenarioSelectScreen";
import { victoryScreen } from "@view/ui/VictoryScreen";
import { campaignVictoryScreen } from "@view/ui/CampaignVictoryScreen";
import { hoverTooltip } from "@view/ui/HoverTooltip";
import { campaignState } from "@sim/config/CampaignState";
import { getScenario } from "@sim/config/CampaignDefs";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { createGameState } from "@sim/state/GameState";
import type { GameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { initBases } from "@sim/systems/BaseSetup";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { SimLoop } from "@sim/core/SimLoop";
import { EventBus } from "@sim/core/EventBus";
import {
  Direction,
  GamePhase,
  GameMode,
  MapType,
  BuildingType,
  UnitType,
} from "@/types";
import { createBuilding } from "@sim/entities/Building";
import { createUnit } from "@sim/entities/Unit";
import { setBuilding, setWalkable, getTile } from "@sim/core/Grid";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { BUILDING_MIN_GAP } from "@sim/systems/BuildingSystem";
import { LEADER_DEFINITIONS } from "@sim/config/LeaderDefs";
import type { LeaderId, LeaderBonus } from "@sim/config/LeaderDefs";
import { getRace } from "@sim/config/RaceDefs";
import type { RaceId } from "@sim/config/RaceDefs";

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

(async () => {
  const mountPoint = document.getElementById("pixi-container");
  if (!mountPoint) throw new Error("Missing #pixi-container in HTML");

  // 1. Boot renderer first (needed for all screens)
  await viewManager.init(mountPoint);

  // 2. Load spritesheets (falls back to generated placeholders automatically)
  await animationManager.load(viewManager.app.renderer);

  // ---------------------------------------------------------------------------
  // Start screen
  // ---------------------------------------------------------------------------
  startScreen.init(viewManager);

  // ---------------------------------------------------------------------------
  // Menu screen
  // ---------------------------------------------------------------------------
  menuScreen.init(viewManager);
  menuScreen.hide();

  // p2IsAI preference stored here so it is applied when the game boots
  let p2IsAI = true;
  menuScreen.onAIToggle = (isAI) => {
    p2IsAI = isAI;
  };

  // Check if we were returned from a campaign game via "Return to Campaign"
  const _returnToCampaign = sessionStorage.getItem("returnToCampaign") === "1";
  if (_returnToCampaign) {
    sessionStorage.removeItem("returnToCampaign");
    startScreen.hide();
  } else {
    startScreen.show();
  }

  startScreen.onStart = () => {
    startScreen.hide();
    menuScreen.show();
  };

  // ---------------------------------------------------------------------------
  // Leader selection screen
  // ---------------------------------------------------------------------------
  leaderSelectScreen.init(viewManager);
  leaderSelectScreen.hide();

  menuScreen.onContinue = () => {
    menuScreen.hide();
    leaderSelectScreen.show();
  };

  leaderSelectScreen.onBack = () => {
    leaderSelectScreen.hide();
    menuScreen.show();
  };

  // ---------------------------------------------------------------------------
  // Race selection screen
  // ---------------------------------------------------------------------------
  raceSelectScreen.init(viewManager);
  raceSelectScreen.hide();

  leaderSelectScreen.onNext = () => {
    leaderSelectScreen.hide();
    raceSelectScreen.show();
  };

  raceSelectScreen.onBack = () => {
    raceSelectScreen.hide();
    leaderSelectScreen.show();
  };

  // ---------------------------------------------------------------------------
  // Armory screen
  // ---------------------------------------------------------------------------
  armoryScreen.init(viewManager);
  armoryScreen.hide();

  raceSelectScreen.onNext = () => {
    raceSelectScreen.hide();
    // Set unlocked items based on game mode
    const gameMode = menuScreen.selectedGameMode;
    if (gameMode === GameMode.CAMPAIGN) {
      armoryScreen.setUnlockedItems(campaignState.unlockedItems);
    } else {
      armoryScreen.setUnlockedItems(null); // all unlocked
    }
    armoryScreen.show();
  };

  armoryScreen.onBack = () => {
    armoryScreen.hide();
    raceSelectScreen.show();
  };

  // ---------------------------------------------------------------------------
  // Game boot — triggered from the Armory's START GAME button
  // ---------------------------------------------------------------------------
  armoryScreen.onStartGame = async () => {
    const mapSize = menuScreen.selectedMapSize;
    const gameMode = menuScreen.selectedGameMode;
    const mapType = menuScreen.selectedMapType;
    const leaderId = leaderSelectScreen.selectedLeaderId;
    const raceId = raceSelectScreen.selectedRaceId;
    armoryScreen.hide();
    if (gameMode === GameMode.CAMPAIGN) {
      // Campaign: go to scenario select instead of booting directly
      scenarioSelectScreen.show();
    } else {
      await _bootGame(
        p2IsAI,
        mapSize,
        gameMode,
        leaderId,
        raceId,
        undefined,
        mapType,
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Scenario select screen (campaign mode only)
  // ---------------------------------------------------------------------------
  scenarioSelectScreen.init(viewManager);
  scenarioSelectScreen.hide();

  scenarioSelectScreen.onBack = () => {
    scenarioSelectScreen.hide();
    armoryScreen.show();
  };

  scenarioSelectScreen.onNext = async () => {
    const mapSize = menuScreen.selectedMapSize;
    const leaderId = leaderSelectScreen.selectedLeaderId;
    const raceId = raceSelectScreen.selectedRaceId;
    const scenarioNum = scenarioSelectScreen.selectedScenario;
    scenarioSelectScreen.hide();
    await _bootCampaign(p2IsAI, mapSize, scenarioNum, leaderId, raceId);
  };

  // If returning from a campaign game, jump straight to the scenario picker
  if (_returnToCampaign) {
    scenarioSelectScreen.show();
  }
})();

/**
 * Spawn 3 neutral Town buildings evenly spaced along the vertical centre of the map.
 * Towns are placed at the horizontal midpoint, spread across the map height.
 */
let _nextTownId = 1;
function _spawnTowns(state: GameState, mapW: number, mapH: number): void {
  const def = BUILDING_DEFINITIONS[BuildingType.TOWN];
  const midX = Math.floor(mapW / 2) - Math.floor(def.footprint.w / 2);
  // 3 towns spaced at 25%, 50%, 75% of map height
  const yPositions = [
    Math.floor(mapH * 0.25) - Math.floor(def.footprint.h / 2),
    Math.floor(mapH * 0.5) - Math.floor(def.footprint.h / 2),
    Math.floor(mapH * 0.75) - Math.floor(def.footprint.h / 2),
  ];

  for (const y of yPositions) {
    const id = `town-${_nextTownId++}`;
    const pos = { x: midX, y };
    const building = createBuilding({
      id,
      type: BuildingType.TOWN,
      owner: null,
      position: pos,
    });
    state.buildings.set(id, building);

    // Mark footprint tiles as occupied and unwalkable
    for (let dy = 0; dy < def.footprint.h; dy++) {
      for (let dx = 0; dx < def.footprint.w; dx++) {
        setBuilding(state.battlefield, pos.x + dx, pos.y + dy, id);
        setWalkable(state.battlefield, pos.x + dx, pos.y + dy, false);
      }
    }

    EventBus.emit("buildingPlaced", {
      buildingId: id,
      position: { ...pos },
      owner: null,
    });
  }
}

/**
 * Spawn 2 neutral Towers and 4 neutral Farms in random positions near the towns.
 * Buildings are spread across towns (not all clustered around one) and placed
 * only on free, walkable neutral tiles.  Positions vary every game.
 *
 * Distribution: for each of the 6 extras, we pick a town to anchor to and
 * attempt random offsets within SCATTER_RADIUS tiles until a free spot is found.
 */
let _nextNeutralId = 1;
function _spawnNeutralExtras(
  state: GameState,
  mapW: number,
  mapH: number,
  sizeLabel: string,
): void {
  // Collect town positions from what was just placed
  const townPositions: Array<{ x: number; y: number }> = [];
  for (const b of state.buildings.values()) {
    if (b.type === BuildingType.TOWN) townPositions.push({ ...b.position });
  }
  if (townPositions.length === 0) return;

  const SCATTER_RADIUS = 5; // max tile offset from town anchor
  const MAX_ATTEMPTS = 80;

  // Get counts from config
  const counts =
    BalanceConfig.NEUTRAL_COUNTS[sizeLabel] ||
    BalanceConfig.NEUTRAL_COUNTS["DOUBLE"];

  const typesToPlace: BuildingType[] = [];
  for (let i = 0; i < counts.towers; i++) typesToPlace.push(BuildingType.TOWER);
  for (let i = 0; i < counts.farms; i++) typesToPlace.push(BuildingType.FARM);
  // Fisher-Yates shuffle
  for (let i = typesToPlace.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [typesToPlace[i], typesToPlace[j]] = [typesToPlace[j], typesToPlace[i]];
  }

  // Round-robin across towns so extras are spread evenly
  let townIdx = Math.floor(Math.random() * townPositions.length);

  for (const bType of typesToPlace) {
    const def = BUILDING_DEFINITIONS[bType];
    const anchor = townPositions[townIdx % townPositions.length];
    townIdx++;

    let placed = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS && !placed; attempt++) {
      const ox = Math.floor((Math.random() * 2 - 1) * SCATTER_RADIUS);
      const oy = Math.floor((Math.random() * 2 - 1) * SCATTER_RADIUS);
      const px = anchor.x + ox;
      const py = anchor.y + oy;

      // Check all footprint tiles are in bounds, walkable, neutral zone, and free;
      // also enforce BUILDING_MIN_GAP halo around the footprint.
      let ok = true;
      const gap = BUILDING_MIN_GAP;
      outer: for (let dy = -gap; dy < def.footprint.h + gap && ok; dy++) {
        for (let dx = -gap; dx < def.footprint.w + gap && ok; dx++) {
          const tx = px + dx;
          const ty = py + dy;
          const isFootprint =
            dx >= 0 && dx < def.footprint.w && dy >= 0 && dy < def.footprint.h;
          if (isFootprint) {
            if (tx < 0 || ty < 0 || tx >= mapW || ty >= mapH) {
              ok = false;
              break outer;
            }
            const tile = state.battlefield.grid[ty]?.[tx];
            if (
              !tile ||
              !tile.walkable ||
              tile.buildingId !== null ||
              tile.zone !== "neutral"
            ) {
              ok = false;
              break outer;
            }
          } else {
            const tile = getTile(state.battlefield, tx, ty);
            if (tile && tile.buildingId !== null) {
              ok = false;
              break outer;
            }
          }
        }
      }
      if (!ok) continue;

      const id = `neutral-${bType}-${_nextNeutralId++}`;
      const pos = { x: px, y: py };
      const building = createBuilding({
        id,
        type: bType,
        owner: null,
        position: pos,
      });
      state.buildings.set(id, building);

      for (let dy = 0; dy < def.footprint.h; dy++) {
        for (let dx = 0; dx < def.footprint.w; dx++) {
          setBuilding(state.battlefield, pos.x + dx, pos.y + dy, id);
          setWalkable(state.battlefield, pos.x + dx, pos.y + dy, false);
        }
      }

      EventBus.emit("buildingPlaced", {
        buildingId: id,
        position: { ...pos },
        owner: null,
      });
      placed = true;
    }
  }
}

/**
 * Compute scaled base positions for a given map size.
 * Bases sit 1 tile from each side, vertically centred (accounting for 3-tile height).
 * Spawn offsets mirror the standard values.
 */
function _computeBasePositions(w: number, h: number) {
  const midY = Math.floor(h / 2) - 2; // centre the 4-tall castle
  return {
    westPosition: { x: 1, y: midY },
    eastPosition: { x: w - 5, y: midY }, // castle is 4 wide; x + 4 = w - 1
    westSpawnOffset: { ...BalanceConfig.BASE_WEST_SPAWN_OFFSET },
    eastSpawnOffset: { ...BalanceConfig.BASE_EAST_SPAWN_OFFSET },
  };
}

/**
 * BATTLEFIELD mode: remove all player-owned buildings (castles etc.)
 * so players start on a clean field.
 */
function _removeCastlesAndBuildings(state: GameState): void {
  for (const [id, building] of state.buildings) {
    if (building.owner === "p1" || building.owner === "p2") {
      // Clear footprint tiles
      const def = BUILDING_DEFINITIONS[building.type];
      for (let dy = 0; dy < def.footprint.h; dy++) {
        for (let dx = 0; dx < def.footprint.w; dx++) {
          setBuilding(
            state.battlefield,
            building.position.x + dx,
            building.position.y + dy,
            null,
          );
          setWalkable(
            state.battlefield,
            building.position.x + dx,
            building.position.y + dy,
            true,
          );
        }
      }
      state.buildings.delete(id);
    }
  }
  // Remove ownedBuildings lists and base castleId references
  for (const player of state.players.values()) {
    player.ownedBuildings = [];
  }
  for (const base of state.bases.values()) {
    base.castleId = null;
  }
}

/**
 * BATTLEFIELD mode: spawn one Swordsman per player near their base.
 */
function _spawnBattlefieldStartUnits(
  state: GameState,
  mapW: number,
  _mapH: number,
): void {
  const midY = Math.floor(_mapH / 2);
  const p1Unit = createUnit({
    type: UnitType.SWORDSMAN,
    owner: "p1",
    position: { x: Math.floor(mapW * 0.15), y: midY },
  });
  const p2Unit = createUnit({
    type: UnitType.SWORDSMAN,
    owner: "p2",
    position: { x: Math.floor(mapW * 0.85), y: midY },
  });
  state.units.set(p1Unit.id, p1Unit);
  state.units.set(p2Unit.id, p2Unit);
}

/**
 * Campaign battlefield scenario: spawn 4 Swordsmen per player.
 * P1's squad spawns just left of centre, P2's just right, so both sides
 * face each other in the middle of the map (where the castles would be).
 */
function _spawnScenarioBattlefieldUnits(
  state: GameState,
  mapW: number,
  mapH: number,
): void {
  const midX = Math.floor(mapW / 2);
  const midY = Math.floor(mapH / 2);

  // P1: 4 units in a 2×2 cluster slightly left of centre
  const p1Positions = [
    { x: midX - 4, y: midY - 1 },
    { x: midX - 4, y: midY + 1 },
    { x: midX - 3, y: midY - 1 },
    { x: midX - 3, y: midY + 1 },
  ];
  // P2: mirror on the right
  const p2Positions = [
    { x: midX + 3, y: midY - 1 },
    { x: midX + 3, y: midY + 1 },
    { x: midX + 4, y: midY - 1 },
    { x: midX + 4, y: midY + 1 },
  ];

  for (const pos of p1Positions) {
    const u = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: pos,
    });
    state.units.set(u.id, u);
  }
  for (const pos of p2Positions) {
    const u = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p2",
      position: pos,
    });
    state.units.set(u.id, u);
  }
}

/**
 * ROGUELIKE mode: randomly disable 50% of non-castle building types.
 * Mirrors PhaseSystem logic but runs at boot for the first round.
 */
function _rollRoguelikeDisabledBuildings(state: GameState): void {
  const allTypes = Object.values(BuildingType).filter(
    (t) => t !== BuildingType.CASTLE && t !== BuildingType.FIREPIT,
  );
  const shuffled = [...allTypes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const half = Math.floor(shuffled.length / 2);
  state.roguelikeDisabledBuildings = shuffled.slice(0, half);

  // Apply the filter to castle buildings immediately
  const disabledSet = new Set(state.roguelikeDisabledBuildings);
  for (const building of state.buildings.values()) {
    if (building.type === BuildingType.CASTLE) {
      const fullBlueprints = [
        ...BUILDING_DEFINITIONS[BuildingType.CASTLE].blueprints,
      ];
      building.blueprints = fullBlueprints.filter((t) => !disabledSet.has(t));
    }
  }
}

/**
 * Apply the P1 leader's passive bonus to the game state at boot.
 * Boot-time bonuses (gold, base health, Merlin's Storm Mage) are applied here.
 * Per-spawn bonuses (starting levels) are handled in SpawnSystem via state.p1LeaderId.
 */
function _applyLeaderBonus(
  state: GameState,
  playerId: string,
  leaderId: LeaderId,
  mapSize: MapSize,
): void {
  const leader = LEADER_DEFINITIONS.find((l) => l.id === leaderId);
  if (!leader) return;

  // Store the leader ID on state so sim systems can reference it
  state.p1LeaderId = leaderId;

  const bonus: LeaderBonus = leader.bonus;

  switch (bonus.type) {
    case "gold_bonus": {
      const player = state.players.get(playerId);
      if (player) {
        player.gold += bonus.amount;
        EventBus.emit("goldChanged", { playerId, amount: player.gold });
      }
      break;
    }

    case "base_health_bonus": {
      for (const base of state.bases.values()) {
        if (base.owner === playerId) {
          base.maxHealth += bonus.amount;
          base.health += bonus.amount;
        }
      }
      break;
    }

    case "spawn_unit_near_castle": {
      // Find the P1 castle and spawn the unit nearby
      for (const building of state.buildings.values()) {
        if (
          building.owner === playerId &&
          building.type === BuildingType.CASTLE
        ) {
          const isWest = playerId === "p1";
          const spawnX = isWest
            ? building.position.x + 5
            : building.position.x - 2;
          const spawnY = building.position.y + 2;
          const unit = createUnit({
            type: bonus.unitType,
            owner: playerId,
            position: {
              x: Math.max(0, Math.min(mapSize.width - 1, spawnX)),
              y: spawnY,
            },
          });
          if (bonus.bonusLevel !== undefined) {
            unit.level = bonus.bonusLevel;
          }
          state.units.set(unit.id, unit);
          EventBus.emit("unitSpawned", {
            unitId: unit.id,
            buildingId: building.id,
            position: { ...unit.position },
          });
          break;
        }
      }
      break;
    }

    // Runtime bonuses (income_multiplier, unit_atk/hp multipliers, etc.) are
    // handled by the respective systems checking state.p1LeaderId at tick time.
    default:
      break;
  }

  // Merlin gets an extra spawn_unit_near_castle on top of the mage level bonus
  if (leaderId === "merlin") {
    for (const building of state.buildings.values()) {
      if (
        building.owner === playerId &&
        building.type === BuildingType.CASTLE
      ) {
        const isWest = playerId === "p1";
        const spawnX = isWest
          ? building.position.x + 5
          : building.position.x - 2;
        const spawnY = building.position.y + 2;
        const unit = createUnit({
          type: UnitType.STORM_MAGE,
          owner: playerId,
          position: {
            x: Math.max(0, Math.min(mapSize.width - 1, spawnX)),
            y: spawnY,
          },
        });
        unit.level = 1;
        state.units.set(unit.id, unit);
        EventBus.emit("unitSpawned", {
          unitId: unit.id,
          buildingId: building.id,
          position: { ...unit.position },
        });
        break;
      }
    }
  }
}

/**
 * Apply the P1 race selection:
 *   - Stores raceId on state
 *   - Sets the Faction Hall's shopInventory to include the race's faction unit
 *     for any Faction Hall buildings already placed (e.g., via debug).
 *   - The actual Faction Hall building is built by the player; when placed,
 *     SpawnSystem reads state.p1RaceId to populate its inventory at runtime.
 */
function _applyRace(state: GameState, playerId: string, raceId: RaceId): void {
  const race = getRace(raceId);
  if (!race || !race.implemented) return;

  if (playerId === "p1") {
    state.p1RaceId = raceId;
  }

  // If any Faction Halls already exist for this player (unusual at boot,
  // but handle gracefully), wire their shopInventory now.
  for (const building of state.buildings.values()) {
    if (
      building.type === BuildingType.FACTION_HALL &&
      building.owner === playerId
    ) {
      // Humans get both their faction unit and the Royal Arbelestier
      if (playerId === "p1" && state.p1RaceId === "man") {
        building.shopInventory = [race.factionUnit, UnitType.ROYAL_ARBALESTIER];
      } else {
        building.shopInventory = [race.factionUnit];
      }
    }
  }
}

/**
 * Restrict the castle's shopInventory and blueprints to only what the
 * player has unlocked in the campaign.  Called once after initBases().
 */
function _applyCampaignRestrictions(state: GameState): void {
  const unlockedUnits = new Set(campaignState.unlockedUnits);
  const unlockedBuildings = new Set(campaignState.unlockedBuildings);

  for (const building of state.buildings.values()) {
    if (building.owner !== "p1") continue;

    // Filter shop units
    building.shopInventory = building.shopInventory.filter((u) =>
      unlockedUnits.has(u),
    );

    // Filter blueprints
    building.blueprints = building.blueprints.filter((b) =>
      unlockedBuildings.has(b),
    );
  }
}

/**
 * Boot a campaign scenario game.
 * Applies campaign unlocks: filters castle shop and blueprints to only
 * what the player has unlocked so far, then calls _bootGame in campaign mode.
 */
async function _bootCampaign(
  p2IsAI: boolean,
  mapSize: MapSize,
  scenarioNum: number,
  leaderId: LeaderId,
  raceId: RaceId,
): Promise<void> {
  await _bootGame(
    p2IsAI,
    mapSize,
    GameMode.CAMPAIGN,
    leaderId,
    raceId,
    scenarioNum,
  );
}

async function _bootGame(
  p2IsAI: boolean,
  mapSize: MapSize,
  gameMode: GameMode = GameMode.STANDARD,
  leaderId: LeaderId = "arthur",
  raceId: RaceId = "man",
  scenarioNum?: number,
  mapType: MapType = MapType.MEADOW,
): Promise<void> {
  // 1. Simulation state — sized to the chosen map
  const startGold =
    gameMode === GameMode.DEATHMATCH
      ? 10000
      : gameMode === GameMode.BATTLEFIELD
        ? 30000
        : BalanceConfig.START_GOLD;

  const state = createGameState(mapSize.width, mapSize.height, 0, gameMode);
  state.players.set("p1", createPlayerState("p1", Direction.WEST, startGold));
  state.players.set("p2", createPlayerState("p2", Direction.EAST, startGold));
  const basePos = _computeBasePositions(mapSize.width, mapSize.height);
  initBases(state, { westPlayerId: "p1", eastPlayerId: "p2", ...basePos });

  // Resolve the scenario type for campaign games
  const scenarioDef =
    gameMode === GameMode.CAMPAIGN && scenarioNum !== undefined
      ? getScenario(scenarioNum)
      : undefined;
  const scenarioType = scenarioDef?.type ?? "standard";

  const isBattlefieldSetup =
    gameMode === GameMode.BATTLEFIELD ||
    (gameMode === GameMode.CAMPAIGN && scenarioType === "battlefield");

  if (!isBattlefieldSetup) {
    // Standard, deathmatch, roguelike, standard-campaign all have towns/neutral buildings
    _spawnTowns(state, mapSize.width, mapSize.height);
    _spawnNeutralExtras(state, mapSize.width, mapSize.height, mapSize.label);
  }

  if (isBattlefieldSetup) {
    // Remove castles and all other player buildings — no structures on the field
    _removeCastlesAndBuildings(state);
    // Spawn starting units
    if (gameMode === GameMode.CAMPAIGN) {
      _spawnScenarioBattlefieldUnits(state, mapSize.width, mapSize.height);
    } else {
      _spawnBattlefieldStartUnits(state, mapSize.width, mapSize.height);
    }
    // Skip PREP — start directly in BATTLE
    state.phase = GamePhase.BATTLE;
    state.phaseTimer = -1;
    // Disable random events for battlefield-type scenarios
    state.eventTimer = Infinity;
  }

  if (gameMode === GameMode.ROGUELIKE) {
    // Roll initial disabled buildings
    _rollRoguelikeDisabledBuildings(state);
  }

  if (gameMode === GameMode.CAMPAIGN && scenarioNum !== undefined) {
    // Store the scenario number on state so CampaignVictoryScreen can read it
    state.campaignScenario = scenarioNum;
    // Restrict castle shop and blueprints to unlocked content (for standard-type scenarios)
    if (scenarioType === "standard") {
      _applyCampaignRestrictions(state);
    }
    // Apply per-scenario overrides
    if (scenarioDef?.disableEvents) {
      state.eventTimer = Infinity;
    }
    if (scenarioDef?.aiBlueprints) {
      const allowed = new Set(scenarioDef.aiBlueprints);
      for (const building of state.buildings.values()) {
        if (building.owner === "p2" && building.type === BuildingType.CASTLE) {
          building.blueprints = building.blueprints.filter((b) =>
            allowed.has(b),
          );
        }
      }
    }
    if (scenarioDef?.aiExtraGold) {
      const p2 = state.players.get("p2");
      if (p2) p2.gold += scenarioDef.aiExtraGold;
    }
  }

  // Apply P1's equipped armory items (hero stat bonuses)
  state.p1ArmoryItems = armoryScreen.selectedItems;

  // Apply the chosen leader's passive bonus to P1
  _applyLeaderBonus(state, "p1", leaderId, mapSize);

  // Apply the chosen race to P1 (sets p1RaceId and wires faction hall inventory)
  _applyRace(state, "p1", raceId);

  // 2. Camera — fit the full map into the viewport
  viewManager.camera.setMapSize(mapSize.width, mapSize.height);
  viewManager.camera.fitMap();

  // Start cinematic zoom for scenario 1 (First Blood)
  if (gameMode === GameMode.CAMPAIGN && scenarioNum === 1) {
    // Start the cinematic zoom after a short delay to let the game settle
    setTimeout(() => {
      viewManager.camera.startCinematicZoom();
    }, 1000);
  }

  // 3. Grid background & environment
  gridRenderer.init(viewManager);
  gridRenderer.draw(state.battlefield, mapType);
  environmentLayer.init(viewManager, state, mapType);
  EventBus.on("buildingPlaced", () =>
    gridRenderer.draw(state.battlefield, mapType),
  );
  EventBus.on("buildingDestroyed", () =>
    gridRenderer.draw(state.battlefield, mapType),
  );

  // 3. Building & base views
  buildingLayer.init(viewManager, state);

  // 4. Unit views
  unitLayer.init(viewManager, state);

  // 5. HUD
  hud.init(viewManager, state, { westPlayerId: "p1", eastPlayerId: "p2" });

  // 6. Shop panel (local player starts as p1 — west side)
  shopPanel.init(viewManager, state, "p1");
  shopPanel.onOpen = () => hoverTooltip.hide();

  // 6b. Hover tooltip
  hoverTooltip.init(viewManager, state, viewManager.camera);

  // 7. Spawn queue UI
  unitQueueUI.init(viewManager, state);

  // 8. Input manager + building placer
  buildingPlacer.init(viewManager, state, "p1");
  inputManager.init(viewManager, state, "p1");

  // P2 AI buyer — state driven by menu choice
  p2AIBuyer.setEnabled(p2IsAI);
  hud.setP2AI(p2IsAI);

  // Wire per-frame updates now that game is live
  viewManager.onUpdate((s, dt) => buildingLayer.update(s, dt));
  viewManager.onUpdate((s) => unitLayer.update(s));
  viewManager.onUpdate((s, dt) => environmentLayer.update(s, dt));
  viewManager.onUpdate((s) => hud.update(s));
  viewManager.onUpdate((s) => shopPanel.update(s));
  viewManager.onUpdate((s) => unitQueueUI.update(s));
  viewManager.onUpdate((s, dt) => p2AIBuyer.update(s, dt));

  // HUD callbacks
  hud.onAIToggle = (isAI) => {
    p2AIBuyer.setEnabled(isAI);
    // When switching to human mode, reset active control to P1
    // (hud.setP2AI already resets _activePlayer; just sync the sub-systems)
    shopPanel.setPlayerId("p1");
    buildingPlacer.setPlayerId("p1");
    inputManager.setPlayerId("p1");
  };

  hud.onSwitchPlayer = (playerId) => {
    shopPanel.setPlayerId(playerId);
    buildingPlacer.setPlayerId(playerId);
    inputManager.setPlayerId(playerId);
  };

  hud.onStartBattle = () => {
    if (state.phase === GamePhase.PREP) {
      state.phaseTimer = 0;
    }
  };

  // Spell FX
  fireballFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => fireballFX.update(dt));
  lightningFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => lightningFX.update(dt));
  summonFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => summonFX.update(dt));

  // Death FX
  deathFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => deathFX.update(dt));

  // IceBall FX
  iceBallFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => iceBallFX.update(dt));

  // Web / Net FX
  webFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => webFX.update(dt));

  // Building turret FX
  turretArrowFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => turretArrowFX.update(dt));

  // Building lightning tower FX
  turretLightningFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => turretLightningFX.update(dt));

  // Ranged unit arrow FX
  arrowFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => arrowFX.update(dt));

  // Catapult boulder FX
  catapultBoulderFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => catapultBoulderFX.update(dt));

  // Distortion FX
  distortionFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => distortionFX.update(dt));

  // Heal FX
  healFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => healFX.update(dt));

  // Floating damage / healing numbers
  damageNumberFX.init(viewManager, state);
  damageNumberFX.enabled = menuScreen.damageNumbersEnabled;
  viewManager.onUpdate((_s, dt) => damageNumberFX.update(dt));

  // Rally flag FX (persistent flag marker with wind sway)
  flagFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => flagFX.update(dt));

  // Rune circle FX (generic cast circle for all abilities)
  runeCircleFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => runeCircleFX.update(dt));

  // Random event banner (center screen notification)
  eventBanner.init(viewManager);

  // Victory screen (overlays game during RESOLVE)
  victoryScreen.init(viewManager, state);

  // Campaign victory screen (overlays game during RESOLVE in campaign mode)
  campaignVictoryScreen.init(viewManager, state);
  campaignVictoryScreen.onReturnToCampaign = () => {
    // Reload the page but return to campaign — simplest approach to reset sim state
    // We store a flag so the page knows to go straight to scenario select
    sessionStorage.setItem("returnToCampaign", "1");
    window.location.reload();
  };

  // Render loop drives game state updates
  viewManager.app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    viewManager.update(state, dt);
  });

  // Simulation loop (fixed timestep, drives all sim systems)
  const simLoop = new SimLoop(state);
  simLoop.start();

  // Start cinematic speed ramp for scenario 1 (First Blood)
  if (gameMode === GameMode.CAMPAIGN && scenarioNum === 1) {
    console.log("Scenario 1 detected - starting cinematic speed ramp");
    // Start the speed ramp immediately when the game starts
    simLoop.startCinematicSpeed();
  }

  // ---------------------------------------------------------------------------
  // Pause overlay + Space-to-pause
  // ---------------------------------------------------------------------------

  // Build a simple "PAUSED" overlay in the UI layer
  const pauseOverlay = new Container();
  const pauseBg = new Graphics()
    .rect(0, 0, viewManager.screenWidth, viewManager.screenHeight)
    .fill({ color: 0x000000, alpha: 0.45 });
  const pauseLabel = new Text({
    text: "PAUSED",
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 48,
      fill: 0xffffff,
      fontWeight: "bold",
      letterSpacing: 6,
    }),
  });
  pauseLabel.anchor.set(0.5, 0.5);
  pauseLabel.position.set(
    viewManager.screenWidth / 2,
    viewManager.screenHeight / 2,
  );
  // Overlay must not block pointer events — UI buttons (shop, HUD) stay clickable while paused
  pauseOverlay.eventMode = "none";
  pauseOverlay.addChild(pauseBg, pauseLabel);
  pauseOverlay.visible = false;
  viewManager.addToLayer("ui", pauseOverlay);

  const togglePause = () => {
    simLoop.togglePause();
    pauseOverlay.visible = simLoop.isPaused;
    // Ticker keeps running so UI stays responsive; only the sim loop is frozen
  };

  // "PAUSED IN SHOP" label — no dark overlay, just a text indicator
  const shopPauseLabel = new Text({
    text: "PAUSED IN SHOP",
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 20,
      fill: 0xffffff,
      fontWeight: "bold",
      letterSpacing: 3,
      dropShadow: { color: 0x000000, blur: 4, distance: 2, alpha: 0.8 },
    }),
  });
  shopPauseLabel.anchor.set(0.5, 0);
  shopPauseLabel.position.set(viewManager.screenWidth / 2, 8);
  shopPauseLabel.eventMode = "none";
  shopPauseLabel.visible = false;
  viewManager.addToLayer("ui", shopPauseLabel);

  shopPanel.onOpen = () => {
    if (!simLoop.isPaused) {
      simLoop.pause();
      shopPauseLabel.visible = true;
    }
  };
  shopPanel.onClose = () => {
    if (simLoop.isPaused) {
      simLoop.resume();
      shopPauseLabel.visible = false;
    }
  };

  window.addEventListener("keydown", (e) => {
    // Don't handle keys if a text input or button is focused
    const tag = (document.activeElement?.tagName ?? "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "button") return;

    if (e.code === "Space" && !e.repeat) {
      e.preventDefault();
      togglePause();
    } else if (e.code === "Digit0" && !e.repeat) {
      simLoop.speedUp();
      hud.showSpeedLabel(simLoop.timeScale);
    } else if (e.code === "Digit9" && !e.repeat) {
      simLoop.speedDown();
      hud.showSpeedLabel(simLoop.timeScale);
    }
  });
}
