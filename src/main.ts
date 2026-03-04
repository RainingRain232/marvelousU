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
import { AIBuyer } from "@view/ui/AIBuyer";
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
import { auraFX } from "@view/fx/AuraFX";
import { animationManager } from "@view/animation/AnimationManager";
import { audioManager } from "@audio/AudioManager";
import { environmentLayer } from "@view/environment/EnvironmentLayer";
import { startScreen } from "@view/ui/StartScreen";
import { introPlayer } from "@view/ui/IntroPlayer";
import { menuScreen } from "@view/ui/MenuScreen";
import { MAP_SIZES } from "@view/ui/MenuScreen";
import type { MapSize } from "@view/ui/MenuScreen";
import { leaderSelectScreen } from "@view/ui/LeaderSelectScreen";
import { raceSelectScreen } from "@view/ui/RaceSelectScreen";
import { raceDetailScreen } from "@view/ui/RaceDetailScreen";
import { armoryScreen } from "@view/ui/ArmoryScreen";
import { scenarioSelectScreen } from "@view/ui/ScenarioSelectScreen";
import { campaignIntroScreen } from "@view/ui/CampaignIntroScreen";
import { victoryScreen } from "@view/ui/VictoryScreen";
import { campaignVictoryScreen } from "@view/ui/CampaignVictoryScreen";
import { hoverTooltip } from "@view/ui/HoverTooltip";
import { buildingWikiScreen } from "@view/ui/BuildingWikiScreen";
import { minimap } from "@view/ui/Minimap";
import { lobbyScreen } from "@view/ui/LobbyScreen";
import { RoomManager } from "@net/RoomManager";
import { campaignState } from "@sim/config/CampaignState";
import { getScenario, SCENARIO_DEFINITIONS } from "@sim/config/CampaignDefs";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { createGameState } from "@sim/state/GameState";
import type { GameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { initBases, initBasesMulti } from "@sim/systems/BaseSetup";
import type { PlayerBaseConfig } from "@sim/systems/BaseSetup";
import { setAlliance } from "@sim/state/GameState";
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
import { getRace, filterInventoryByRace } from "@sim/config/RaceDefs";
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

  // Start menu music as soon as the app is interactive
  audioManager.playMenuMusic();

  startScreen.onStart = () => {
    startScreen.hide();
    introPlayer.onDone = () => {
      menuScreen.show();
    };
    introPlayer.play();
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

  menuScreen.onQuickPlay = async () => {
    menuScreen.hide();
    await _bootGame(
      true, // p2 is AI
      MAP_SIZES[0], // standard map size
      GameMode.STANDARD,
      "arthur",
      "op",
      undefined,
      MapType.FANTASIA,
      ["longsword"], // armory weapon
    );
  };

  menuScreen.onUnitWiki = () => {
    menuScreen.hide();
    raceDetailScreen.onBack = () => {
      raceDetailScreen.hide();
      menuScreen.show();
    };
    raceDetailScreen.showWiki();
  };

  // ---------------------------------------------------------------------------
  // Building wiki screen
  // ---------------------------------------------------------------------------
  buildingWikiScreen.init(viewManager);
  buildingWikiScreen.hide();

  buildingWikiScreen.onBack = () => {
    buildingWikiScreen.hide();
    menuScreen.show();
  };

  menuScreen.onBuildingWiki = () => {
    menuScreen.hide();
    buildingWikiScreen.show();
  };

  // ---------------------------------------------------------------------------
  // Online multiplayer lobby
  // ---------------------------------------------------------------------------
  lobbyScreen.init(viewManager);

  menuScreen.onMultiplayer = () => {
    menuScreen.hide();
    _showMultiplayerPrompt();
  };

  const _roomManager = new RoomManager();

  function _showMultiplayerPrompt(): void {
    // Simple HTML prompt for create vs join
    const choice = window.prompt(
      "ONLINE MULTIPLAYER\n\n" +
      "Type a 4-letter room code to join, or leave empty to create a new room.\n\n" +
      "Room code (or empty to create):",
      "",
    );

    if (choice === null) {
      // User cancelled
      menuScreen.show();
      return;
    }

    const serverUrl = window.prompt(
      "Server address:",
      `ws://${window.location.hostname}:3001`,
    );

    if (!serverUrl) {
      menuScreen.show();
      return;
    }

    // Set up room manager callbacks
    _roomManager.on({
      onRoomUpdate: (players) => {
        lobbyScreen.updatePlayers(players);
      },
      onStatusChange: (status) => {
        if (status === "lobby" && _roomManager.roomId && _roomManager.localPlayerId) {
          lobbyScreen.show(_roomManager.roomId, _roomManager.localPlayerId);
        } else if (status === "disconnected") {
          lobbyScreen.setStatus("Disconnected from server");
        }
      },
      onPhaseChange: (phase) => {
        if (phase === GamePhase.PREP || phase === GamePhase.BATTLE) {
          lobbyScreen.hide();
          _bootOnlineGame();
        }
      },
      onGameOver: (winnerId) => {
        lobbyScreen.setStatus(winnerId ? `Player ${winnerId} wins!` : "Draw!");
      },
      onError: (msg) => {
        lobbyScreen.setStatus(`Error: ${msg}`);
      },
    });

    lobbyScreen.onReady = () => {
      _roomManager.setReady();
      lobbyScreen.setStatus("Ready! Waiting for others...");
    };

    lobbyScreen.onBack = () => {
      lobbyScreen.hide();
      _roomManager.disconnect();
      menuScreen.show();
    };

    // Connect
    if (choice.trim().length > 0) {
      // Join existing room
      lobbyScreen.setStatus("Joining room...");
      _roomManager.joinRoom(serverUrl, choice.trim().toUpperCase());
    } else {
      // Create new room
      lobbyScreen.setStatus("Creating room...");
      _roomManager.createRoom(serverUrl, 2);
    }
  }

  async function _bootOnlineGame(): Promise<void> {
    if (!_roomManager.localPlayerId) return;

    // Use standard map size for online games
    const mapSize = MAP_SIZES[0];

    // Create a local game state that the server snapshots will be applied to
    const state = createGameState(mapSize.width, mapSize.height, 0, GameMode.STANDARD, 2);

    // Create player states — will be overwritten by server snapshots
    state.players.set("p1", createPlayerState("p1", Direction.WEST, BalanceConfig.START_GOLD, "nw", false));
    state.players.set("p2", createPlayerState("p2", Direction.EAST, BalanceConfig.START_GOLD, "se", false));

    const basePos = _computeBasePositions(mapSize.width, mapSize.height);
    initBases(state, { westPlayerId: "p1", eastPlayerId: "p2", ...basePos });

    _spawnTowns(state, mapSize.width, mapSize.height);

    // Bind the state so RoomManager can apply snapshots
    _roomManager.bindState(state);

    // Switch to in-game music
    audioManager.playGameMusic();

    // Camera
    viewManager.camera.setMapSize(mapSize.width, mapSize.height);
    const p1Base = [...state.bases.values()].find((b) => b.owner === "p1");
    const castleCenterX = (p1Base?.position.x ?? 1) + 2;
    const castleCenterY = (p1Base?.position.y ?? 1) + 2;
    viewManager.camera.focusOnTile(castleCenterX, castleCenterY);

    // Grid & environment
    gridRenderer.init(viewManager);
    gridRenderer.draw(state.battlefield, MapType.MEADOW);
    environmentLayer.init(viewManager, state, MapType.MEADOW);
    EventBus.on("buildingPlaced", () => gridRenderer.draw(state.battlefield, MapType.MEADOW));
    EventBus.on("buildingDestroyed", () => gridRenderer.draw(state.battlefield, MapType.MEADOW));

    // Building & unit views
    buildingLayer.init(viewManager, state);
    unitLayer.init(viewManager, state);

    // HUD
    hud.init(viewManager, state, { westPlayerId: "p1", eastPlayerId: "p2" });

    // Shop panel — uses the local player's ID
    const localPlayerId = _roomManager.localPlayerId;
    shopPanel.init(viewManager, state, localPlayerId);

    // Hover tooltip & minimap
    hoverTooltip.init(viewManager, state, viewManager.camera);
    minimap.init(viewManager, state, viewManager.camera, MapType.MEADOW);
    EventBus.on("buildingPlaced", () => minimap.redrawTerrain(state));
    EventBus.on("buildingDestroyed", () => minimap.redrawTerrain(state));

    // Spawn queue UI
    unitQueueUI.init(viewManager, state);

    // Input manager + building placer — route through network
    buildingPlacer.init(viewManager, state, localPlayerId);
    inputManager.init(viewManager, state, localPlayerId);

    // No AI buyers in online mode — server handles both sides
    p2AIBuyer.setEnabled(false);
    hud.setP2AI(false);

    // Per-frame view updates
    viewManager.onUpdate((s, dt) => buildingLayer.update(s, dt));
    viewManager.onUpdate((s) => unitLayer.update(s));
    viewManager.onUpdate((s, dt) => environmentLayer.update(s, dt));
    viewManager.onUpdate((s) => hud.update(s));
    viewManager.onUpdate((s) => shopPanel.update(s));
    viewManager.onUpdate((s) => unitQueueUI.update(s));
    viewManager.onUpdate((s) => minimap.update(s));

    // FX systems
    fireballFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => fireballFX.update(dt));
    lightningFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => lightningFX.update(dt));
    summonFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => summonFX.update(dt));
    deathFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => deathFX.update(dt));
    iceBallFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => iceBallFX.update(dt));
    webFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => webFX.update(dt));
    turretArrowFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => turretArrowFX.update(dt));
    turretLightningFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => turretLightningFX.update(dt));
    arrowFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => arrowFX.update(dt));
    catapultBoulderFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => catapultBoulderFX.update(dt));
    distortionFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => distortionFX.update(dt));
    healFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => healFX.update(dt));
    damageNumberFX.init(viewManager, state);
    viewManager.onUpdate((_s, dt) => damageNumberFX.update(dt));
    flagFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => flagFX.update(dt));
    runeCircleFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => runeCircleFX.update(dt));
    auraFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => auraFX.update(dt));
    eventBanner.init(viewManager);

    // Victory screen
    victoryScreen.init(viewManager, state);

    // Render loop
    viewManager.app.ticker.add((ticker) => {
      const dt = ticker.deltaMS / 1000;
      viewManager.update(state, dt);
    });

    // Sim loop in remote mode — no local sim ticks, just view rendering
    const simLoop = new SimLoop(state);
    simLoop.remoteMode = true;
    simLoop.start();

    // Route RoomManager snapshot callbacks to redraw the grid when needed
    _roomManager.on({
      onSnapshot: () => {
        gridRenderer.draw(state.battlefield, MapType.MEADOW);
      },
    });

    // HUD "start battle" button sends skip_prep to server
    hud.onStartBattle = () => {
      _roomManager.skipPrep();
    };

    // Space to pause (local pause only)
    window.addEventListener("keydown", (e) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "button") return;
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        simLoop.togglePause();
      }
    });
  }

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
  // Race detail screen (informational, between race select and armory)
  // ---------------------------------------------------------------------------
  raceDetailScreen.init(viewManager);
  raceDetailScreen.hide();

  raceSelectScreen.onNext = () => {
    raceSelectScreen.hide();
    raceDetailScreen.onBack = () => {
      raceDetailScreen.hide();
      raceSelectScreen.show();
    };
    raceDetailScreen.show(raceSelectScreen.selectedRaceId);
  };

  // ---------------------------------------------------------------------------
  // Armory screen
  // ---------------------------------------------------------------------------
  armoryScreen.init(viewManager);
  armoryScreen.hide();

  raceDetailScreen.onNext = () => {
    raceDetailScreen.hide();
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
    raceDetailScreen.onBack = () => {
      raceDetailScreen.hide();
      raceSelectScreen.show();
    };
    raceDetailScreen.show(raceSelectScreen.selectedRaceId);
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
        undefined,
        menuScreen.selectedPlayerCount,
        menuScreen.alliedPlayerIds,
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

  scenarioSelectScreen.onNext = () => {
    const scenarioNum = scenarioSelectScreen.selectedScenario;
    scenarioSelectScreen.hide();
    campaignIntroScreen.open(scenarioNum);
  };

  // ---------------------------------------------------------------------------
  // Campaign intro screen
  // ---------------------------------------------------------------------------
  campaignIntroScreen.init(viewManager);

  campaignIntroScreen.onStart = async () => {
    const mapSize = menuScreen.selectedMapSize;
    const leaderId = leaderSelectScreen.selectedLeaderId;
    const raceId = raceSelectScreen.selectedRaceId;
    const scenarioNum = scenarioSelectScreen.selectedScenario;
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
 * Compute base positions for 3-4 players on larger maps.
 * Bases are placed at corners: NW, SE, NE, SW.
 */
function _computeMultiBasePositions(
  w: number,
  h: number,
  playerCount: number,
): PlayerBaseConfig[] {
  const configs: PlayerBaseConfig[] = [];

  // NW — p1 (always human)
  configs.push({
    playerId: "p1",
    slot: "nw",
    direction: Direction.EAST,
    position: { x: 1, y: 1 },
    spawnOffset: { x: 5, y: 2 },
  });

  // SE — p2 (main rival)
  configs.push({
    playerId: "p2",
    slot: "se",
    direction: Direction.WEST,
    position: { x: w - 5, y: h - 5 },
    spawnOffset: { x: -1, y: -1 },
  });

  if (playerCount >= 3) {
    // NE — p3
    configs.push({
      playerId: "p3",
      slot: "ne",
      direction: Direction.WEST,
      position: { x: w - 5, y: 1 },
      spawnOffset: { x: -1, y: 2 },
    });
  }

  if (playerCount >= 4) {
    // SW — p4
    configs.push({
      playerId: "p4",
      slot: "sw",
      direction: Direction.EAST,
      position: { x: 1, y: h - 5 },
      spawnOffset: { x: 5, y: -1 },
    });
  }

  return configs;
}

/**
 * BATTLEFIELD mode: remove all player-owned buildings (castles etc.)
 * so players start on a clean field.
 */
function _removeCastlesAndBuildings(state: GameState): void {
  for (const [id, building] of state.buildings) {
    if (building.owner !== null && state.players.has(building.owner)) {
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
 * Campaign battlefield scenario: spawn units per scenario.
 * P1's squad spawns on the left, P2's on the right.
 */
function _spawnScenarioBattlefieldUnits(
  state: GameState,
  mapW: number,
  mapH: number,
  scenarioNum: number,
): void {
  const midY = Math.floor(mapH / 2);

  // Per-scenario unit rosters
  type UnitRoster = Array<{ type: UnitType; count: number }>;
  let p1Roster: UnitRoster;
  let p2Roster: UnitRoster;

  if (scenarioNum === 2) {
    // Firepit Frenzy — player gets a mixed army, AI gets 20 of each firepit unit
    p1Roster = [
      { type: UnitType.SWORDSMAN, count: 20 },
      { type: UnitType.DEFENDER, count: 20 },
      { type: UnitType.ROYAL_PHALANX, count: 20 },
      { type: UnitType.LONGBOWMAN, count: 20 },
      { type: UnitType.CLERIC, count: 5 },
      { type: UnitType.LIGHTNING_ADEPT_MAGE, count: 5 },
    ];
    p2Roster = [
      { type: UnitType.RUFUS, count: 20 },
      { type: UnitType.TROUBADOUR, count: 20 },
      { type: UnitType.GIANT_COURT_JESTER, count: 20 },
      { type: UnitType.FISHERMAN, count: 20 },
    ];
  } else {
    // Default battlefield — 4 swordsmen each
    p1Roster = [{ type: UnitType.SWORDSMAN, count: 4 }];
    p2Roster = [{ type: UnitType.SWORDSMAN, count: 4 }];
  }

  _spawnRoster(state, p1Roster, "p1", Math.floor(mapW * 0.2), midY, mapH);
  _spawnRoster(state, p2Roster, "p2", Math.floor(mapW * 0.8), midY, mapH);
}

/**
 * Spawn a roster of units for a player, spreading them vertically around
 * the given centre position.
 */
function _spawnRoster(
  state: GameState,
  roster: Array<{ type: UnitType; count: number }>,
  owner: string,
  baseX: number,
  midY: number,
  mapH: number,
): void {
  // Flatten the roster into a list of unit types
  const units: UnitType[] = [];
  for (const entry of roster) {
    for (let i = 0; i < entry.count; i++) units.push(entry.type);
  }

  // Spread units in a grid pattern around baseX, midY
  const cols = Math.ceil(Math.sqrt(units.length));
  const rows = Math.ceil(units.length / cols);
  const startY = Math.max(1, midY - Math.floor(rows / 2));

  for (let i = 0; i < units.length; i++) {
    const col = Math.floor(i / rows);
    const row = i % rows;
    const x = Math.max(0, Math.min(baseX + col - Math.floor(cols / 2), state.battlefield.width - 1));
    const y = Math.max(1, Math.min(startY + row, mapH - 2));
    const u = createUnit({
      type: units[i],
      owner,
      position: { x, y },
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
          const player = state.players.get(playerId);
          const isLeftSide = !player || player.slot === "nw" || player.slot === "sw";
          const spawnX = isLeftSide
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
        const player = state.players.get(playerId);
        const isLeftSide = !player || player.slot === "nw" || player.slot === "sw";
        const spawnX = isLeftSide
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

  // Override starting gold if the race specifies one
  if (race.startingGold != null) {
    const player = state.players.get(playerId);
    if (player) {
      player.gold = race.startingGold;
      EventBus.emit("goldChanged", { playerId, amount: player.gold });
    }
  }

  for (const building of state.buildings.values()) {
    if (building.owner !== playerId) continue;

    if (building.type === BuildingType.FACTION_HALL) {
      // Faction Hall: populate with race-specific units
      building.shopInventory = [...race.factionUnits];
    } else {
      // All other buildings: filter inventory by race tier limits
      building.shopInventory = filterInventoryByRace(
        building.shopInventory,
        building.type,
        raceId,
      );
    }
  }
}

/**
 * Restrict the castle's shopInventory and blueprints to only what the
 * player has unlocked in the campaign.  Called once after initBases().
 *
 * In addition to the player's earned unlocks, all unlocks from scenarios
 * prior to the selected one are automatically included. This guarantees
 * that skipping ahead via code still gives a coherent set of units and
 * buildings.
 */
function _applyCampaignRestrictions(state: GameState, scenarioNum: number): void {
  const unlockedUnits = new Set(campaignState.unlockedUnits);
  const unlockedBuildings = new Set(campaignState.unlockedBuildings);

  // Include cumulative unlocks from all scenarios before the current one
  for (const def of SCENARIO_DEFINITIONS) {
    if (def.number >= scenarioNum) continue;
    for (const u of def.unlocks.units ?? []) unlockedUnits.add(u);
    for (const b of def.unlocks.buildings ?? []) unlockedBuildings.add(b);
  }

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
  armoryOverride?: string[],
  playerCount: number = 2,
  alliedPlayerIds: string[] = [],
): Promise<void> {
  // Switch to in-game music
  audioManager.playGameMusic();

  // Clamp playerCount: standard maps only support 2
  const effectivePlayerCount = mapSize.label === "STANDARD" ? 2 : Math.max(2, Math.min(4, playerCount));

  // 1. Simulation state — sized to the chosen map
  const startGold =
    gameMode === GameMode.DEATHMATCH
      ? 10000
      : gameMode === GameMode.BATTLEFIELD
        ? 30000
        : BalanceConfig.START_GOLD;

  const state = createGameState(mapSize.width, mapSize.height, 0, gameMode, effectivePlayerCount);

  if (effectivePlayerCount <= 2) {
    // Classic 2-player layout
    state.players.set("p1", createPlayerState("p1", Direction.WEST, startGold, "nw", false));
    state.players.set("p2", createPlayerState("p2", Direction.EAST, startGold, "se", p2IsAI));
    const basePos = _computeBasePositions(mapSize.width, mapSize.height);
    initBases(state, { westPlayerId: "p1", eastPlayerId: "p2", ...basePos });
  } else {
    // Multi-player layout (3-4 players at corners)
    state.players.set("p1", createPlayerState("p1", Direction.EAST, startGold, "nw", false));
    state.players.set("p2", createPlayerState("p2", Direction.WEST, startGold, "se", true));
    if (effectivePlayerCount >= 3) {
      state.players.set("p3", createPlayerState("p3", Direction.WEST, startGold, "ne", true));
    }
    if (effectivePlayerCount >= 4) {
      state.players.set("p4", createPlayerState("p4", Direction.EAST, startGold, "sw", true));
    }
    const configs = _computeMultiBasePositions(mapSize.width, mapSize.height, effectivePlayerCount);
    initBasesMulti(state, configs);

    // Set up alliances
    for (const allyId of alliedPlayerIds) {
      setAlliance(state, "p1", allyId);
    }

    // Default priority targets: each AI targets p2 (main enemy) first
    state.priorityTargets.set("p2", "p1");
    if (effectivePlayerCount >= 3) state.priorityTargets.set("p3", "p2");
    if (effectivePlayerCount >= 4) state.priorityTargets.set("p4", "p2");
  }

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
      _spawnScenarioBattlefieldUnits(state, mapSize.width, mapSize.height, scenarioNum ?? 1);
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
      _applyCampaignRestrictions(state, scenarioNum);
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
  state.p1ArmoryItems = armoryOverride ?? armoryScreen.selectedItems;

  // Apply the chosen leader's passive bonus to P1
  _applyLeaderBonus(state, "p1", leaderId, mapSize);

  // Apply the chosen race to P1 (sets p1RaceId and wires faction hall inventory)
  _applyRace(state, "p1", raceId);

  // 2. Camera — zoom in on the friendly castle at standard-map zoom level
  viewManager.camera.setMapSize(mapSize.width, mapSize.height);
  // Centre on P1's castle (4×4 footprint → offset by 2 to centre)
  const p1Base = [...state.bases.values()].find((b) => b.owner === "p1");
  const castleCenterX = (p1Base?.position.x ?? 1) + 2;
  const castleCenterY = (p1Base?.position.y ?? 1) + 2;
  viewManager.camera.focusOnTile(castleCenterX, castleCenterY);

  // Start cinematic zoom for battlefield campaign scenarios
  if (gameMode === GameMode.CAMPAIGN && (scenarioNum === 1 || scenarioNum === 2)) {
    // Start the cinematic zoom after a short delay to let the game settle
    const zoomLevel = scenarioNum === 2 ? 1.25 : undefined; // half zoom for scenario 2
    setTimeout(() => {
      viewManager.camera.startCinematicZoom(zoomLevel);
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

  // 6c. Minimap
  minimap.init(viewManager, state, viewManager.camera, mapType);
  EventBus.on("buildingPlaced", () => minimap.redrawTerrain(state));
  EventBus.on("buildingDestroyed", () => minimap.redrawTerrain(state));

  // 7. Spawn queue UI
  unitQueueUI.init(viewManager, state);

  // 8. Input manager + building placer
  buildingPlacer.init(viewManager, state, "p1");
  inputManager.init(viewManager, state, "p1");

  // AI buyers — p2 uses legacy singleton, p3/p4 use new AIBuyer instances
  p2AIBuyer.setEnabled(p2IsAI);
  hud.setP2AI(p2IsAI);

  const aiBuyers: AIBuyer[] = [];
  if (effectivePlayerCount >= 3) {
    const p3Buyer = new AIBuyer("p3");
    p3Buyer.setEnabled(true);
    aiBuyers.push(p3Buyer);
  }
  if (effectivePlayerCount >= 4) {
    const p4Buyer = new AIBuyer("p4");
    p4Buyer.setEnabled(true);
    aiBuyers.push(p4Buyer);
  }

  // Wire per-frame updates now that game is live
  viewManager.onUpdate((s, dt) => buildingLayer.update(s, dt));
  viewManager.onUpdate((s) => unitLayer.update(s));
  viewManager.onUpdate((s, dt) => environmentLayer.update(s, dt));
  viewManager.onUpdate((s) => hud.update(s));
  viewManager.onUpdate((s) => shopPanel.update(s));
  viewManager.onUpdate((s) => unitQueueUI.update(s));
  viewManager.onUpdate((s, dt) => p2AIBuyer.update(s, dt));
  viewManager.onUpdate((s, dt) => {
    for (const buyer of aiBuyers) buyer.update(s, dt);
  });
  viewManager.onUpdate((s) => minimap.update(s));

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

  // Aura pulse FX (expanding rune blast for fire/ice auras)
  auraFX.init(viewManager);
  viewManager.onUpdate((_s, dt) => auraFX.update(dt));

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

  // Start cinematic speed ramp for battlefield campaign scenarios
  if (gameMode === GameMode.CAMPAIGN && (scenarioNum === 1 || scenarioNum === 2)) {
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
