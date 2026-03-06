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
import { spellFX } from "@view/fx/SpellFX";
import { iceBallFX } from "@view/fx/IceBallFX";
import { webFX } from "@view/fx/WebFX";
import { turretArrowFX } from "@view/fx/TurretArrowFX";
import { turretLightningFX } from "@view/fx/TurretLightningFX";
import { arrowFX } from "@view/fx/ArrowFX";
import { catapultBoulderFX } from "@view/fx/CatapultBoulderFX";
import { warpFX } from "@view/fx/WarpFX";
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
import { magicScreen, nationalMageSpells } from "@view/ui/MagicScreen";
import { armoryScreen } from "@view/ui/ArmoryScreen";
import { scenarioSelectScreen } from "@view/ui/ScenarioSelectScreen";
import { campaignIntroScreen } from "@view/ui/CampaignIntroScreen";
import { victoryScreen } from "@view/ui/VictoryScreen";
import { battleStatsScreen } from "@view/ui/BattleStatsScreen";
import { battleStatsTracker } from "@sim/systems/BattleStatsTracker";
import { settingsScreen } from "@view/ui/SettingsScreen";
import { hotkeyOverlay } from "@view/ui/HotkeyOverlay";
import { unitShopScreen } from "@view/ui/UnitShopScreen";
import type { UnitRoster } from "@view/ui/UnitShopScreen";
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
import { getDifficultySettings } from "@sim/config/DifficultyConfig";
import { SimLoop } from "@sim/core/SimLoop";
import { EventBus } from "@sim/core/EventBus";
import {
  Direction,
  GamePhase,
  GameMode,
  MapType,
  BuildingType,
  UnitType,
  UnitState,
  AbilityType,
} from "@/types";
import { ABILITY_DEFINITIONS } from "@sim/config/AbilityDefs";
import { UPGRADE_DEFINITIONS } from "@sim/config/UpgradeDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { ANIMATION_DEFS } from "@view/animation/AnimationDefs";
import { RACE_NATIONAL_MAGE_KEY } from "@view/animation/NationalMageSpriteGen";
import { createBuilding } from "@sim/entities/Building";
import { createUnit } from "@sim/entities/Unit";
import { setBuilding, setWalkable, getTile } from "@sim/core/Grid";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { BUILDING_MIN_GAP } from "@sim/systems/BuildingSystem";
import { LEADER_DEFINITIONS, getLeader } from "@sim/config/LeaderDefs";
import type { LeaderId, LeaderBonus } from "@sim/config/LeaderDefs";
import { getRace, filterInventoryByRace, RACE_DEFINITIONS } from "@sim/config/RaceDefs";
import type { RaceId } from "@sim/config/RaceDefs";
import { ARMORY_ITEMS } from "@sim/config/ArmoryItemDefs";
import type { ArmoryItemId } from "@sim/config/ArmoryItemDefs";

/** First 2 armory items unlocked at world game start. More drop from camps. */
const WORLD_STARTING_ITEMS: ArmoryItemId[] = ARMORY_ITEMS.slice(0, 2).map((i) => i.id);

// RPG mode imports
import { RPGGame } from "@rpg/RPGBoot";

// World mode imports
import { WorldSetupScreen } from "@view/world/ui/WorldSetupScreen";
import type { WorldGameSettings } from "@world/config/WorldConfig";
import { generateWorldMap, findStartPositions, placeCamps, findNeutralCityPositions, placeNeutralBuildings } from "@world/gen/WorldMapGen";
import { TERRAIN_DEFINITIONS, TERRAIN_TO_MAP_TYPE, TerrainType } from "@world/config/TerrainDefs";
import { createWorldState, nextId, WorldPhase } from "@world/state/WorldState";
import type { WorldState } from "@world/state/WorldState";
import { createWorldPlayer } from "@world/state/WorldPlayer";
import { createWorldCity } from "@world/state/WorldCity";
import { createWorldArmy } from "@world/state/WorldArmy";
import type { ArmyUnit, WorldArmy } from "@world/state/WorldArmy";
import { worldMapRenderer } from "@view/world/WorldMapRenderer";
import { worldHUD } from "@view/world/ui/WorldHUD";
import { beginTurn, endTurn, onBattlesResolved } from "@world/systems/TurnSystem";
import { WorldBalance } from "@world/config/WorldConfig";
import { hexSpiral, hexNeighbors, hexNeighbor, hexToPixel, hexKey, hexDistance } from "@world/hex/HexCoord";
import { cityView } from "@view/world/CityView";
import { cityPanel } from "@view/world/ui/CityPanel";
import { startConstruction, queueRecruitment, deployArmy, foundCity, canFoundCity } from "@world/systems/CitySystem";
import { WorldBuildingType } from "@world/config/WorldBuildingDefs";
import { armyView } from "@view/world/ArmyView";
import { armyPanel } from "@view/world/ui/ArmyPanel";
import { conjurePanel } from "@view/world/ui/ConjurePanel";
import { moveArmy, getArmyReachableHexes, detectCollisions, playerCanCrossWater, splitArmy, mergeArmies } from "@world/systems/ArmySystem";
import { findHexPath } from "@world/hex/HexPathfinding";
import { researchScreen } from "@view/world/ui/ResearchScreen";
import { setActiveResearch, setActiveMagicResearch } from "@world/systems/ResearchSystem";
import { executeAITurn } from "@world/systems/WorldAI";
import { updateVisibility } from "@world/systems/FogOfWarSystem";
import {
  buildFieldBattleState,
  buildSiegeBattleState,
  buildCampBattleState,
  extractBattleResults,
  applyBattleResults,
} from "@world/systems/BattleResolver";
import type { BattleResult } from "@world/systems/BattleResolver";
import { simTick } from "@sim/core/SimLoop";
import { worldEventLog } from "@view/world/ui/WorldEventLog";
import { worldVictoryScreen } from "@view/world/ui/WorldVictoryScreen";
import { worldHexTooltip } from "@view/world/ui/WorldHexTooltip";
import { worldMinimap } from "@view/world/ui/WorldMinimap";
import { worldScoreScreen } from "@view/world/ui/WorldScoreScreen";
import { worldNationalScreen } from "@view/world/ui/WorldNationalScreen";
import { worldArmyOverview } from "@view/world/ui/WorldArmyOverview";
import { cityPreviewScreen } from "@view/world/ui/CityPreviewScreen";
import { advisorDialog } from "@view/world/ui/AdvisorDialog";
import { turnTransition } from "@view/world/ui/TurnTransition";
import { saveWorldGame, loadWorldGame } from "@world/state/WorldSerialization";
import { setCityNameIndex } from "@world/state/WorldCity";
import { worldBattleViewer } from "@view/world/ui/WorldBattleViewer";
import { rollRandomEvents } from "@world/systems/WorldRandomEvents";
import { getNeutralCityGarrison, pickNeutralRace, neutralRng, getUnitsForRace } from "@world/systems/NeutralCitySystem";
import { worldNotification } from "@view/world/ui/WorldNotification";
import { worldWikiScreen } from "@view/world/ui/WorldWikiScreen";
import { merlinMagicScreen } from "@view/world/ui/MerlinMagicScreen";
import { castSpell } from "@world/systems/OverlandSpellSystem";
import type { OverlandSpellId } from "@world/config/OverlandSpellDefs";
import merlinImgUrl from "@/img/merlin.png";

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

  // Settings screen
  settingsScreen.init(viewManager);
  settingsScreen.hide();

  // Hotkey help overlay
  hotkeyOverlay.init(viewManager);

  // p2IsAI preference stored here so it is applied when the game boots
  let p2IsAI = true;
  menuScreen.onAIToggle = (isAI) => {
    p2IsAI = isAI;
  };

  // Check if returning from a played world battle
  const _worldBattleReturn = sessionStorage.getItem("worldBattleReturn") === "1";
  if (_worldBattleReturn) {
    sessionStorage.removeItem("worldBattleReturn");
    startScreen.hide();
    await _returnFromWorldBattle();
    return;
  }

  // Check if we should boot a playable world battle
  const _worldBattlePlayMode = sessionStorage.getItem("worldBattlePlayMode") === "1";
  if (_worldBattlePlayMode) {
    sessionStorage.removeItem("worldBattlePlayMode");
    startScreen.hide();
    await _bootWorldBattle();
    return;
  }

  // Check if we should auto-load a saved world game (from in-game LOAD GAME)
  const _autoLoadWorld = sessionStorage.getItem("autoLoadWorld") === "1";
  if (_autoLoadWorld) {
    sessionStorage.removeItem("autoLoadWorld");
    startScreen.hide();
    await _loadWorldGame();
    return;
  }

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

  // World setup screen
  const worldSetupScreen = new WorldSetupScreen();

  menuScreen.onContinue = () => {
    if (menuScreen.selectedGameMode === GameMode.RPG) {
      menuScreen.hide();
      _bootRPGGame();
      return;
    }
    if (menuScreen.selectedGameMode === GameMode.WORLD) {
      menuScreen.hide();
      // World mode: Leader → Race → RaceDetail → Magic → Armory → WorldSetup → boot
      leaderSelectScreen.onBack = () => {
        leaderSelectScreen.hide();
        menuScreen.show();
      };
      leaderSelectScreen.onNext = () => {
        leaderSelectScreen.hide();
        raceSelectScreen.onBack = () => {
          raceSelectScreen.hide();
          leaderSelectScreen.show();
        };
        raceSelectScreen.onNext = () => {
          raceSelectScreen.hide();
          raceDetailScreen.onBack = () => {
            raceDetailScreen.hide();
            raceSelectScreen.show();
          };
          raceDetailScreen.onNext = () => {
            raceDetailScreen.hide();
            magicScreen.onBack = () => {
              magicScreen.hide();
              raceDetailScreen.onBack = () => {
                raceDetailScreen.hide();
                raceSelectScreen.show();
              };
              raceDetailScreen.show(raceSelectScreen.selectedRaceId);
            };
            magicScreen.onNext = () => {
              magicScreen.hide();
              armoryScreen.setUnlockedItems(WORLD_STARTING_ITEMS);
              armoryScreen.onStartGame = () => {
                armoryScreen.hide();
                worldSetupScreen.init(viewManager);
                worldSetupScreen.onStart = async (settings) => {
                  worldSetupScreen.destroy();
                  await _bootWorldGame(
                    settings,
                    raceSelectScreen.selectedRaceId,
                    leaderSelectScreen.selectedLeaderId,
                    armoryScreen.selectedItems,
                  );
                };
                worldSetupScreen.onLoad = async () => {
                  worldSetupScreen.destroy();
                  await _loadWorldGame();
                };
                worldSetupScreen.onBack = () => {
                  worldSetupScreen.destroy();
                  armoryScreen.show();
                };
              };
              armoryScreen.show();
            };
            magicScreen.show(raceSelectScreen.selectedRaceId);
          };
          raceDetailScreen.show(raceSelectScreen.selectedRaceId);
        };
        raceSelectScreen.show();
      };
      leaderSelectScreen.show();
      return;
    }
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
  // Spell wiki
  // ---------------------------------------------------------------------------
  menuScreen.onSpellWiki = () => {
    menuScreen.hide();
    magicScreen.onBack = () => {
      magicScreen.hide();
      menuScreen.show();
    };
    magicScreen.showWiki();
  };

  // ---------------------------------------------------------------------------
  // Online multiplayer lobby
  // ---------------------------------------------------------------------------
  lobbyScreen.init(viewManager);

  menuScreen.onMultiplayer = () => {
    menuScreen.hide();
    _showMultiplayerPrompt();
  };

  menuScreen.onLoadWorldGame = async () => {
    menuScreen.hide();
    await _loadWorldGame();
  };

  menuScreen.onSettings = () => {
    menuScreen.hide();
    settingsScreen.onBack = () => {
      settingsScreen.hide();
      menuScreen.show();
    };
    settingsScreen.show();
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
    spellFX.init(viewManager);
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
    warpFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => warpFX.update(dt));
    damageNumberFX.init(viewManager, state);
    viewManager.onUpdate((_s, dt) => damageNumberFX.update(dt));
    flagFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => flagFX.update(dt));
    runeCircleFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => runeCircleFX.update(dt));
    auraFX.init(viewManager);
    viewManager.onUpdate((_s, dt) => auraFX.update(dt));
    eventBanner.init(viewManager);

    // Battle stats
    battleStatsTracker.init(state);
    battleStatsScreen.init(viewManager, state);

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
  // Magic overview screen (between race detail and armory)
  // ---------------------------------------------------------------------------
  magicScreen.init(viewManager);
  magicScreen.hide();

  raceDetailScreen.onNext = () => {
    raceDetailScreen.hide();
    magicScreen.onBack = () => {
      magicScreen.hide();
      raceDetailScreen.onBack = () => {
        raceDetailScreen.hide();
        raceSelectScreen.show();
      };
      raceDetailScreen.show(raceSelectScreen.selectedRaceId);
    };
    magicScreen.show(raceSelectScreen.selectedRaceId);
  };

  // ---------------------------------------------------------------------------
  // Armory screen
  // ---------------------------------------------------------------------------
  armoryScreen.init(viewManager);
  armoryScreen.hide();

  // Unit shop screen (Battlefield / Wave mode)
  unitShopScreen.init(viewManager);

  magicScreen.onNext = () => {
    magicScreen.hide();
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
    magicScreen.show(raceSelectScreen.selectedRaceId);
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
    } else if (gameMode === GameMode.BATTLEFIELD) {
      // Battlefield: player unit shop → AI unit shop → battle
      unitShopScreen.onDone = (playerRoster) => {
        unitShopScreen.hide();
        // AI shop
        unitShopScreen.onDone = async (aiRoster) => {
          unitShopScreen.hide();
          _worldBattleRosters = {
            p1Roster: playerRoster,
            p2Roster: aiRoster,
            battleMeta: {},
            playerIsAttacker: true,
          };
          await _bootGame(
            true,
            mapSize,
            GameMode.BATTLEFIELD,
            leaderId,
            raceId,
            undefined,
            mapType,
            undefined,
            2,
            [],
          );
        };
        unitShopScreen.showAIShop(raceId, 30000);
      };
      unitShopScreen.show(raceId, 30000, "YOUR ARMY");
    } else if (gameMode === GameMode.WAVE) {
      // Wave mode: player unit shop → battle vs random wave
      _waveState = {
        wave: 1,
        playerRaceId: raceId,
        playerLeaderId: leaderId,
        totalGoldSpent: 0,
        mapSize,
        mapType,
      };
      unitShopScreen.onDone = async (playerRoster) => {
        unitShopScreen.hide();
        // Track gold spent
        let spent = 0;
        for (const entry of playerRoster) {
          const uDef = UNIT_DEFINITIONS[entry.type];
          if (uDef) spent += uDef.cost * entry.count;
        }
        _waveState!.totalGoldSpent += spent;

        // Generate enemy wave
        const enemyBudget = _waveState!.wave === 1
          ? 2000
          : Math.round(_waveState!.totalGoldSpent * 1.3);
        const enemyRoster = _generateWaveEnemyRoster(raceId, enemyBudget, _waveState!.wave);

        _worldBattleRosters = {
          p1Roster: playerRoster,
          p2Roster: enemyRoster,
          battleMeta: { waveMode: true },
          playerIsAttacker: true,
        };

        await _bootGame(
          true,
          mapSize,
          GameMode.BATTLEFIELD,
          leaderId,
          raceId,
          undefined,
          mapType,
          undefined,
          2,
          [],
        );
      };
      unitShopScreen.show(raceId, 2000, `WAVE 1 — RECRUIT ARMY`);
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

  // Override starting gold/mana if the race specifies one
  if (race.startingGold != null || race.startingMana != null) {
    const player = state.players.get(playerId);
    if (player) {
      if (race.startingGold != null) {
        player.gold = race.startingGold;
        EventBus.emit("goldChanged", { playerId, amount: player.gold });
      }
      if (race.startingMana != null) {
        player.mana = race.startingMana;
        EventBus.emit("manaChanged", { playerId, amount: player.mana });
      }
    }
  }

  // Configure national mage abilities from MagicScreen selections (P1 only)
  if (playerId === "p1") {
    _configureNationalMageAbilities();
  }

  // Set national mage sprites to race-specific visuals
  const raceMageKey = RACE_NATIONAL_MAGE_KEY[raceId];
  if (raceMageKey) {
    const nationalMageAll: UnitType[] = [
      UnitType.NATIONAL_MAGE_T1, UnitType.NATIONAL_MAGE_T2,
      UnitType.NATIONAL_MAGE_T3, UnitType.NATIONAL_MAGE_T4,
      UnitType.NATIONAL_MAGE_T5, UnitType.NATIONAL_MAGE_T6,
      UnitType.NATIONAL_MAGE_T7,
    ];
    for (const mt of nationalMageAll) {
      UNIT_DEFINITIONS[mt].spriteKey = raceMageKey;
      const animDef = ANIMATION_DEFS[mt];
      for (const st of Object.values(UnitState)) {
        animDef[st].sheet = raceMageKey;
      }
    }
  }

  const magicLevel = race.tiers?.magic ?? 0;

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

      // Add national mages to the mage tower
      if (building.type === BuildingType.MAGE_TOWER && magicLevel > 0) {
        const nationalMageTypes: UnitType[] = [
          UnitType.NATIONAL_MAGE_T1, UnitType.NATIONAL_MAGE_T2,
          UnitType.NATIONAL_MAGE_T3, UnitType.NATIONAL_MAGE_T4,
          UnitType.NATIONAL_MAGE_T5, UnitType.NATIONAL_MAGE_T6,
          UnitType.NATIONAL_MAGE_T7,
        ];
        for (let t = 0; t < magicLevel; t++) {
          building.shopInventory.push(nationalMageTypes[t]);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// National mage ability configuration
// ---------------------------------------------------------------------------

/** AbilityType slots ordered: T1a, T1b, T2a, T2b, T3, T4, T5, T6, T7 */
const NATIONAL_ABILITY_SLOTS: AbilityType[] = [
  AbilityType.NATIONAL_T1_SPELL_A, AbilityType.NATIONAL_T1_SPELL_B,
  AbilityType.NATIONAL_T2_SPELL_A, AbilityType.NATIONAL_T2_SPELL_B,
  AbilityType.NATIONAL_T3_SPELL, AbilityType.NATIONAL_T4_SPELL,
  AbilityType.NATIONAL_T5_SPELL, AbilityType.NATIONAL_T6_SPELL,
  AbilityType.NATIONAL_T7_SPELL,
];

/**
 * Read `nationalMageSpells` from MagicScreen and overwrite the placeholder
 * ABILITY_DEFINITIONS for each national spell slot with values derived from
 * the selected player spell (UpgradeDef).
 */
function _configureNationalMageAbilities(): void {
  let slotIdx = 0;
  // Iterate tiers in order (nationalMageSpells keys: 1..7)
  for (let tier = 1; tier <= 7; tier++) {
    const spells = nationalMageSpells.get(tier);
    if (!spells) {
      // Skip slots for this tier (T1/T2 have 2, T3+ have 1)
      slotIdx += tier <= 2 ? 2 : 1;
      continue;
    }
    for (const spellType of spells) {
      if (slotIdx >= NATIONAL_ABILITY_SLOTS.length) break;
      const abilityType = NATIONAL_ABILITY_SLOTS[slotIdx];
      const spell = UPGRADE_DEFINITIONS[spellType];
      if (spell) {
        _mapSpellToAbilityDef(spell, abilityType);
      }
      slotIdx++;
    }
    // Fill remaining slots for this tier if fewer spells than slots
    const slotsForTier = tier <= 2 ? 2 : 1;
    const usedSlots = spells.length;
    slotIdx += Math.max(0, slotsForTier - usedSlots);
  }
}

/** Map an UpgradeDef spell to an AbilityDef, overwriting ABILITY_DEFINITIONS. */
function _mapSpellToAbilityDef(spell: { spellTier?: number; spellDamage?: number; spellHeal?: number; spellRadius?: number; spellSlowDuration?: number; spellSlowFactor?: number; spellTeleportDistance?: number }, abilityType: AbilityType): void {
  const tier = spell.spellTier ?? 1;
  const def = ABILITY_DEFINITIONS[abilityType];
  def.cooldown = 3 + tier;
  def.range = 4 + Math.floor(tier / 2);
  def.castTime = 0.3 + tier * 0.1;
  def.damage = spell.spellDamage ?? -(spell.spellHeal ?? 0);
  def.aoeRadius = spell.spellRadius ?? 2;
  def.slowDuration = spell.spellSlowDuration ?? 0;
  def.slowFactor = spell.spellSlowFactor ?? 1;
  def.teleportDistance = spell.spellTeleportDistance ?? 0;
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

// ---------------------------------------------------------------------------
// RPG mode boot
// ---------------------------------------------------------------------------

let _rpgGame: RPGGame | null = null;

async function _bootRPGGame(): Promise<void> {
  // Destroy any existing RPG game
  if (_rpgGame) {
    _rpgGame.destroy();
    _rpgGame = null;
  }

  _rpgGame = new RPGGame();
  await _rpgGame.boot();
}

// ---------------------------------------------------------------------------
// Campaign mode boot
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// World mode boot
// ---------------------------------------------------------------------------

/** Load a saved world game from localStorage and initialize views. */
async function _loadWorldGame(): Promise<void> {
  const state = loadWorldGame();
  if (!state) return;

  // Advance the city name index past existing cities
  setCityNameIndex(state.cities.size);

  // Switch to in-game music
  audioManager.playGameMusic();

  _initWorldViews(state, true);
}

// ---------------------------------------------------------------------------
// World battle play mode
// ---------------------------------------------------------------------------

/** Rosters for a world battle played in battlefield mode. */
let _worldBattleRosters: {
  p1Roster: Array<{ type: UnitType; count: number }>;
  p2Roster: Array<{ type: UnitType; count: number }>;
  battleMeta: Record<string, unknown>;
  playerIsAttacker: boolean;
} | null = null;

/** Wave mode state — persists across rounds until the player loses. */
let _waveState: {
  wave: number;
  playerRaceId: RaceId;
  playerLeaderId: LeaderId;
  totalGoldSpent: number; // running total of all gold player spent
  mapSize: MapSize;
  mapType: MapType;
} | null = null;

const MERLIN_COMPLIMENTS: Record<number, string> = {
  10: "Impressive, young one! Your tactical prowess grows!",
  20: "By the stars! Even I am amazed by your skill!",
  30: "Legends shall be written of this day!",
  40: "You rival the great kings of old!",
};
const MERLIN_COMPLIMENT_DEFAULT = "Truly, you are beyond mortal measure!";

/** Generate a random enemy roster worth a given gold budget. */
function _generateWaveEnemyRoster(playerRaceId: RaceId, goldBudget: number, wave: number): UnitRoster {
  // Pick a random enemy race (different from player's)
  const races = RACE_DEFINITIONS.filter((r) => r.implemented && r.id !== "op" && r.id !== playerRaceId);
  const enemyRace = races[Math.floor(Math.random() * races.length)];
  const enemyRaceId = enemyRace?.id ?? "man";

  // Max tier scales with wave
  const maxTier = wave <= 5 ? 3 : wave <= 10 ? 5 : 7;

  const available = getUnitsForRace(enemyRaceId, maxTier);
  if (available.length === 0) return [{ type: UnitType.SWORDSMAN, count: 10 }];

  // Also add faction units
  const race = getRace(enemyRaceId);
  if (race) {
    for (const fut of race.factionUnits) {
      if (fut && UNIT_DEFINITIONS[fut] && !available.includes(fut)) {
        const tier = UNIT_DEFINITIONS[fut].tier ?? 1;
        if (tier <= maxTier) available.push(fut);
      }
    }
  }

  const roster: UnitRoster = [];
  const counts = new Map<UnitType, number>();
  let remaining = goldBudget;
  let safety = 500;

  while (remaining > 0 && safety-- > 0) {
    const affordable = available.filter((ut) => (UNIT_DEFINITIONS[ut]?.cost ?? 100) <= remaining);
    if (affordable.length === 0) break;
    const pick = affordable[Math.floor(Math.random() * affordable.length)];
    const cost = UNIT_DEFINITIONS[pick]?.cost ?? 100;
    counts.set(pick, (counts.get(pick) ?? 0) + 1);
    remaining -= cost;
  }

  for (const [type, count] of counts) {
    roster.push({ type, count });
  }
  return roster;
}

/** Start the next wave's shop screen after a wave victory. */
function _startNextWaveShop(ws: NonNullable<typeof _waveState>, extraGold: number): void {
  unitShopScreen.onDone = async (playerRoster) => {
    unitShopScreen.hide();

    // Track gold spent
    let spent = 0;
    for (const entry of playerRoster) {
      const uDef = UNIT_DEFINITIONS[entry.type];
      if (uDef) spent += uDef.cost * entry.count;
    }
    ws.totalGoldSpent += spent;

    // Generate enemy wave: enemies worth totalGoldSpent * 1.3
    const enemyBudget = Math.round(ws.totalGoldSpent * 1.3);
    const enemyRoster = _generateWaveEnemyRoster(ws.playerRaceId, enemyBudget, ws.wave);

    _worldBattleRosters = {
      p1Roster: playerRoster,
      p2Roster: enemyRoster,
      battleMeta: { waveMode: true },
      playerIsAttacker: true,
    };

    await _bootGame(
      true,
      ws.mapSize,
      GameMode.BATTLEFIELD,
      ws.playerLeaderId,
      ws.playerRaceId,
      undefined,
      ws.mapType,
      undefined,
      2,
      [],
    );
  };
  unitShopScreen.show(ws.playerRaceId, extraGold, `WAVE ${ws.wave} — RECRUIT ARMY`);
}

/** Show a brief Merlin compliment overlay, then call the callback. */
function _showMerlinWaveCompliment(message: string, onDone: () => void): void {
  // Create a simple overlay with Merlin's message
  const overlay = new Container();
  const sw = viewManager.screenWidth;
  const sh = viewManager.screenHeight;

  const bg = new Graphics()
    .rect(0, 0, sw, sh)
    .fill({ color: 0x000000, alpha: 0.7 });
  overlay.addChild(bg);

  const CW = 440;
  const CH = 180;
  const card = new Container();
  card.position.set(Math.floor((sw - CW) / 2), Math.floor((sh - CH) / 2));

  const cardBg = new Graphics()
    .roundRect(0, 0, CW, CH, 10)
    .fill({ color: 0x0a0a18, alpha: 0.96 })
    .roundRect(0, 0, CW, CH, 10)
    .stroke({ color: 0x9966ff, alpha: 0.8, width: 2 });
  card.addChild(cardBg);

  const merlinLabel = new Text({
    text: "MERLIN SPEAKS:",
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 14,
      fill: 0xbb88ff,
      fontWeight: "bold",
      letterSpacing: 2,
    }),
  });
  merlinLabel.anchor.set(0.5, 0);
  merlinLabel.position.set(CW / 2, 20);
  card.addChild(merlinLabel);

  const msgText = new Text({
    text: `"${message}"`,
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 13,
      fill: 0xddccff,
      letterSpacing: 1,
      wordWrap: true,
      wordWrapWidth: CW - 40,
      align: "center",
    }),
  });
  msgText.anchor.set(0.5, 0);
  msgText.position.set(CW / 2, 52);
  card.addChild(msgText);

  const BW = CW - 80;
  const BH = 36;
  const btn = new Container();
  btn.eventMode = "static";
  btn.cursor = "pointer";
  btn.position.set(40, CH - 52);

  const btnBg = new Graphics()
    .roundRect(0, 0, BW, BH, 6)
    .fill({ color: 0x1a3a1a })
    .roundRect(0, 0, BW, BH, 6)
    .stroke({ color: 0x44aa66, width: 2 });
  btn.addChild(btnBg);

  const btnLabel = new Text({
    text: "CONTINUE",
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 14,
      fill: 0x88ffaa,
      fontWeight: "bold",
      letterSpacing: 2,
    }),
  });
  btnLabel.anchor.set(0.5, 0.5);
  btnLabel.position.set(BW / 2, BH / 2);
  btn.addChild(btnLabel);

  btn.on("pointerover", () => { btnBg.tint = 0xaaffcc; });
  btn.on("pointerout", () => { btnBg.tint = 0xffffff; });
  btn.on("pointerdown", () => {
    viewManager.removeFromLayer("ui", overlay);
    overlay.destroy({ children: true });
    onDone();
  });

  card.addChild(btn);
  overlay.addChild(card);
  viewManager.addToLayer("ui", overlay);
}

/** Boot a full battlefield game from world battle data. */
async function _bootWorldBattle(): Promise<void> {
  const metaJson = sessionStorage.getItem("worldBattleMeta");
  sessionStorage.removeItem("worldBattleMeta");
  if (!metaJson) return;

  const meta = JSON.parse(metaJson);
  const worldState = loadWorldGame();
  if (!worldState) return;

  const toRoster = (units: Array<{ unitType: string; count: number }>) =>
    units
      .filter((u) => u.unitType !== "settler")
      .map((u) => ({ type: u.unitType as UnitType, count: u.count }));

  let p1Roster: Array<{ type: UnitType; count: number }>;
  let p2Roster: Array<{ type: UnitType; count: number }>;
  let playerIsAttacker = true;

  if (meta.battleType === "camp") {
    const army = worldState.armies.get(meta.armyId);
    const camp = worldState.camps.get(meta.campId);
    if (!army || !camp) return;
    p1Roster = toRoster(army.units);
    p2Roster = toRoster(camp.defenders);
  } else if (meta.battleType === "neutral_building") {
    const army = worldState.armies.get(meta.armyId);
    const nb = worldState.neutralBuildings.get(meta.neutralBuildingId);
    if (!army || !nb) return;
    p1Roster = toRoster(army.units);
    p2Roster = toRoster(nb.defenders);
  } else {
    const attacker = worldState.armies.get(meta.attackerArmyId);
    const defender = meta.defenderArmyId ? worldState.armies.get(meta.defenderArmyId) : null;
    if (!attacker) return;

    playerIsAttacker = attacker.owner === "p1";
    if (playerIsAttacker) {
      p1Roster = toRoster(attacker.units);
      p2Roster = defender ? toRoster(defender.units) : [];
    } else {
      p1Roster = defender ? toRoster(defender.units) : [];
      p2Roster = toRoster(attacker.units);
    }
  }

  _worldBattleRosters = { p1Roster, p2Roster, battleMeta: meta, playerIsAttacker };

  const player = worldState.players.get("p1");
  audioManager.playGameMusic();

  // Determine battle map type from world terrain
  const battleMapType = meta.terrain
    ? TERRAIN_TO_MAP_TYPE[meta.terrain as TerrainType] ?? MapType.MEADOW
    : MapType.MEADOW;

  await _bootGame(
    true,
    MAP_SIZES[0],
    GameMode.BATTLEFIELD,
    (player?.leaderId as LeaderId) ?? "arthur",
    (player?.raceId as RaceId) ?? "man",
    undefined,
    battleMapType,
    player?.armoryItems ?? [],
  );
}

/** Return from a played world battle and apply results. */
async function _returnFromWorldBattle(): Promise<void> {
  const resultJson = sessionStorage.getItem("worldBattleResult");
  sessionStorage.removeItem("worldBattleResult");

  const state = loadWorldGame();
  if (!state || !resultJson) return;

  const data = JSON.parse(resultJson);
  const meta = data.battleMeta;

  if (meta.battleType === "camp") {
    // Camp battle result
    const army = state.armies.get(meta.armyId);
    const camp = state.camps.get(meta.campId);

    if (army) {
      if (data.attackerSurvivors.length > 0) {
        army.units = data.attackerSurvivors;
      } else {
        const tile = state.grid.getTile(army.position.q, army.position.r);
        if (tile && tile.armyId === army.id) tile.armyId = null;
        state.armies.delete(army.id);
      }
    }

    if (camp && data.winnerId === army?.owner) {
      camp.cleared = true;
      const tile = state.grid.getTile(camp.position.q, camp.position.r);
      if (tile) tile.campId = null;

      // Clean up fake sword visual if this was a trap
      if (state.fakeSwordHexes) {
        state.fakeSwordHexes = state.fakeSwordHexes.filter(
          (h) => h.q !== camp.position.q || h.r !== camp.position.r,
        );
      }

      const player = state.players.get(army!.owner);
      if (player) {
        player.gold += camp.goldReward;
      }
    }
  } else if (meta.battleType === "neutral_building") {
    // Neutral building battle result
    const army = state.armies.get(meta.armyId);
    const nb = state.neutralBuildings.get(meta.neutralBuildingId);

    if (army) {
      if (data.attackerSurvivors.length > 0) {
        army.units = data.attackerSurvivors;
      } else {
        const tile = state.grid.getTile(army.position.q, army.position.r);
        if (tile && tile.armyId === army.id) tile.armyId = null;
        state.armies.delete(army.id);
      }
    }

    if (nb && data.winnerId === army?.owner) {
      nb.captured = true;
      nb.owner = army!.owner;
      nb.defenders = [];
      const tile = state.grid.getTile(nb.position.q, nb.position.r);
      if (tile) tile.owner = army!.owner;

      // Blacksmith one-time armory reward
      if (nb.type === "blacksmith" && !nb.armoryRewardClaimed) {
        nb.armoryRewardClaimed = true;
        const player = state.players.get(army!.owner);
        if (player) {
          const owned = new Set(player.armoryItems);
          const available = ARMORY_ITEMS.filter((i) => !owned.has(i.id));
          if (available.length > 0) {
            const drop = available[Math.floor(Math.random() * available.length)];
            player.armoryItems.push(drop.id);
          }
        }
      }
    }
  } else {
    // Field / siege battle result
    const battleIdx = meta.battleIndex as number;
    const battle = state.pendingBattles[battleIdx];

    if (battle) {
      const attacker = state.armies.get(battle.attackerArmyId);
      const defender = battle.defenderArmyId ? state.armies.get(battle.defenderArmyId) : null;

      // Map winnerId from sim player IDs back to world player IDs
      let worldWinnerId: string | null = null;
      if (data.winnerId === "p1") {
        worldWinnerId = data.playerIsAttacker ? attacker?.owner ?? null : defender?.owner ?? null;
      } else if (data.winnerId === "p2") {
        worldWinnerId = data.playerIsAttacker ? defender?.owner ?? null : attacker?.owner ?? null;
      }

      const result: BattleResult = {
        winnerId: worldWinnerId,
        attackerSurvivors: data.playerIsAttacker ? data.attackerSurvivors : data.defenderSurvivors,
        defenderSurvivors: data.playerIsAttacker ? data.defenderSurvivors : data.attackerSurvivors,
      };

      applyBattleResults(state, battle, result);
      state.pendingBattles.splice(battleIdx, 1);
    }

    // Resolve remaining pending battles headlessly
    for (const remaining of state.pendingBattles) {
      const att = state.armies.get(remaining.attackerArmyId);
      const def = remaining.defenderArmyId ? state.armies.get(remaining.defenderArmyId) : null;
      if (!att) continue;

      let battleState: GameState;
      if (remaining.type === "siege" && remaining.defenderCityId) {
        const city = state.cities.get(remaining.defenderCityId);
        battleState = buildSiegeBattleState(att, def ?? null, city!);
      } else {
        if (!def) continue;
        battleState = buildFieldBattleState(att, def);
      }

      const MAX_TICKS = 5000;
      for (let i = 0; i < MAX_TICKS; i++) {
        simTick(battleState);
        if (battleState.winnerId) break;
      }

      const res = extractBattleResults(battleState, att.owner, def?.owner ?? att.owner);
      applyBattleResults(state, remaining, res);
    }
    state.pendingBattles = [];
  }

  // Both camp and field battles return to PLAYER_TURN — the battle
  // was saved with PLAYER_TURN phase so the player can keep acting.
  // Just clear any remaining pending battles (already resolved above).
  state.pendingBattles = [];

  saveWorldGame(state);

  setCityNameIndex(state.cities.size);
  audioManager.playGameMusic();
  _initWorldViews(state, true);
}

/** Show in-game info menu overlay with Leader Info / Race Info options. */
function _showWorldInfoMenu(state: WorldState): void {
  const player = state.players.get("p1");
  if (!player) return;

  const vm = viewManager;
  const overlay = new Container();

  // Dim background — clicking it dismisses the menu
  const bg = new Graphics();
  bg.rect(0, 0, vm.screenWidth, vm.screenHeight);
  bg.fill({ color: 0x000000, alpha: 0.5 });
  bg.eventMode = "static";
  bg.on("pointerdown", () => overlay.destroy({ children: true }));
  overlay.addChild(bg);

  // Card panel
  const cardW = 260;
  const cardH = 44 + 44 * 13 + 10; // title + 13 buttons + padding
  const cardX = (vm.screenWidth - cardW) / 2;
  const cardY = (vm.screenHeight - cardH) / 2;

  const card = new Graphics();
  card.roundRect(cardX, cardY, cardW, cardH, 8);
  card.fill({ color: 0x10102a, alpha: 0.97 });
  card.stroke({ color: 0x555577, width: 1.5 });
  card.eventMode = "static"; // prevent clicks from passing through
  overlay.addChild(card);

  // Title
  const title = new Text({
    text: "MENU",
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 16,
      fontWeight: "bold",
      fill: 0xffcc44,
    }),
  });
  title.anchor.set(0.5, 0);
  title.position.set(cardX + cardW / 2, cardY + 12);
  overlay.addChild(title);

  const btnStyle = new TextStyle({
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: "bold",
    fill: 0xffffff,
  });

  // Helper: add a button row
  const addBtn = (label: string, yOffset: number, onClick: () => void) => {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const btnBg = new Graphics();
    btnBg.roundRect(0, 0, cardW - 40, 34, 5);
    btnBg.fill({ color: 0x222244 });
    btnBg.stroke({ color: 0x555577, width: 1 });
    btn.addChild(btnBg);

    const txt = new Text({ text: label, style: btnStyle });
    txt.x = 12;
    txt.y = 8;
    btn.addChild(txt);

    btn.on("pointerdown", onClick);
    btn.on("pointerover", () => {
      btnBg.clear();
      btnBg.roundRect(0, 0, cardW - 40, 34, 5);
      btnBg.fill({ color: 0x333366 });
      btnBg.stroke({ color: 0x7777aa, width: 1 });
    });
    btn.on("pointerout", () => {
      btnBg.clear();
      btnBg.roundRect(0, 0, cardW - 40, 34, 5);
      btnBg.fill({ color: 0x222244 });
      btnBg.stroke({ color: 0x555577, width: 1 });
    });

    btn.position.set(cardX + 20, cardY + yOffset);
    overlay.addChild(btn);
  };

  let btnY = 44;
  const BTN_STEP = 44;

  addBtn("SCORE", btnY, () => {
    overlay.destroy({ children: true });
    worldScoreScreen.show(state);
  });
  btnY += BTN_STEP;

  addBtn("CITIES", btnY, () => {
    overlay.destroy({ children: true });
    worldNationalScreen.show(state);
  });
  btnY += BTN_STEP;

  addBtn("ARMIES", btnY, () => {
    overlay.destroy({ children: true });
    worldArmyOverview.show(state);
  });
  btnY += BTN_STEP;

  addBtn("LEADER INFO", btnY, () => {
    overlay.destroy({ children: true });
    leaderSelectScreen.onBack = () => leaderSelectScreen.hide();
    leaderSelectScreen.onNext = null;
    leaderSelectScreen.showInfo(player.leaderId ?? "arthur");
  });
  btnY += BTN_STEP;

  addBtn("RACE INFO", btnY, () => {
    overlay.destroy({ children: true });
    raceDetailScreen.onBack = () => raceDetailScreen.hide();
    raceDetailScreen.onNext = null;
    raceDetailScreen.show(player.raceId);
  });
  btnY += BTN_STEP;

  addBtn("MAGIC", btnY, () => {
    overlay.destroy({ children: true });
    magicScreen.onBack = () => magicScreen.hide();
    magicScreen.onNext = null;
    magicScreen.show(player.raceId);
  });
  btnY += BTN_STEP;

  addBtn("MERLIN'S MAGIC", btnY, () => {
    overlay.destroy({ children: true });
    merlinMagicScreen.show(state);
  });
  btnY += BTN_STEP;

  addBtn("ENCYCLOPEDIA", btnY, () => {
    overlay.destroy({ children: true });
    worldWikiScreen.show();
  });
  btnY += BTN_STEP;

  addBtn("SAVE GAME", btnY, () => {
    overlay.destroy({ children: true });
    saveWorldGame(state);
    worldEventLog.addEvent("Game saved.", 0x88ff88);
  });
  btnY += BTN_STEP;

  addBtn("LOAD GAME", btnY, () => {
    overlay.destroy({ children: true });
    sessionStorage.setItem("autoLoadWorld", "1");
    window.location.reload();
  });
  btnY += BTN_STEP;

  addBtn("RETURN TO MENU", btnY, () => {
    overlay.destroy({ children: true });
    window.location.reload();
  });
  btnY += BTN_STEP;

  addBtn("CHEATS", btnY, () => {
    overlay.destroy({ children: true });
    _showCheatMenu(state);
  });
  btnY += BTN_STEP;

  addBtn("CLOSE", btnY, () => {
    overlay.destroy({ children: true });
  });

  vm.app.stage.addChild(overlay);
}

/** Target city picker for offensive spells. */
function _showTargetCityPicker(
  state: WorldState,
  spellId: OverlandSpellId,
  cities: Array<{ id: string; name: string; owner: string }>,
): void {
  const vm = viewManager;
  const overlay = new Container();

  const bg = new Graphics();
  bg.rect(0, 0, vm.screenWidth, vm.screenHeight);
  bg.fill({ color: 0x000000, alpha: 0.5 });
  bg.eventMode = "static";
  bg.on("pointerdown", () => overlay.destroy({ children: true }));
  overlay.addChild(bg);

  const cardW = 280;
  const cardH = 44 + cities.length * 40 + 10;
  const cardX = (vm.screenWidth - cardW) / 2;
  const cardY = (vm.screenHeight - cardH) / 2;

  const card = new Graphics();
  card.roundRect(cardX, cardY, cardW, cardH, 8);
  card.fill({ color: 0x10102a, alpha: 0.97 });
  card.stroke({ color: 0xff4444, width: 1.5 });
  card.eventMode = "static";
  overlay.addChild(card);

  const title = new Text({
    text: "SELECT TARGET CITY",
    style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fontWeight: "bold", fill: 0xff6644 }),
  });
  title.anchor.set(0.5, 0);
  title.position.set(cardX + cardW / 2, cardY + 12);
  overlay.addChild(title);

  const btnStyle = new TextStyle({ fontFamily: "monospace", fontSize: 12, fontWeight: "bold", fill: 0xffffff });

  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    const y = cardY + 44 + i * 40;

    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    const btnBg = new Graphics();
    btnBg.roundRect(0, 0, cardW - 40, 32, 5);
    btnBg.fill({ color: 0x332222 });
    btnBg.stroke({ color: 0x774444, width: 1 });
    btn.addChild(btnBg);
    const txt = new Text({ text: `${city.name} (${city.owner})`, style: btnStyle });
    txt.x = 12;
    txt.y = 7;
    btn.addChild(txt);
    btn.position.set(cardX + 20, y);
    btn.on("pointerdown", () => {
      overlay.destroy({ children: true });
      const result = castSpell(state, "p1", spellId, city.id);
      if (result.success) {
        worldEventLog.addEvent(result.message, 0xcc88ff);
        worldNotification.show("Merlin's Magic", result.message, 0xcc88ff);
      } else {
        worldEventLog.addEvent(result.message, 0xff4444);
        worldNotification.show("Merlin's Magic", result.message, 0xff4444);
      }
      worldHUD.update(state);
      merlinMagicScreen.show(state);
    });
    btn.on("pointerover", () => { btnBg.clear(); btnBg.roundRect(0, 0, cardW - 40, 32, 5); btnBg.fill({ color: 0x553333 }); btnBg.stroke({ color: 0xaa6666, width: 1 }); });
    btn.on("pointerout", () => { btnBg.clear(); btnBg.roundRect(0, 0, cardW - 40, 32, 5); btnBg.fill({ color: 0x332222 }); btnBg.stroke({ color: 0x774444, width: 1 }); });
    overlay.addChild(btn);
  }

  vm.app.stage.addChild(overlay);
}

/** Cheat menu overlay — provides debug tools for testing. */
function _showCheatMenu(state: WorldState): void {
  const player = state.players.get("p1");
  if (!player) return;

  const vm = viewManager;
  const overlay = new Container();

  const bg = new Graphics();
  bg.rect(0, 0, vm.screenWidth, vm.screenHeight);
  bg.fill({ color: 0x000000, alpha: 0.5 });
  bg.eventMode = "static";
  bg.on("pointerdown", () => overlay.destroy({ children: true }));
  overlay.addChild(bg);

  const cardW = 300;
  const cardH = 44 + 44 * 6 + 10;
  const cardX = (vm.screenWidth - cardW) / 2;
  const cardY = (vm.screenHeight - cardH) / 2;

  const card = new Graphics();
  card.roundRect(cardX, cardY, cardW, cardH, 8);
  card.fill({ color: 0x1a0a0a, alpha: 0.97 });
  card.stroke({ color: 0x774444, width: 1.5 });
  card.eventMode = "static";
  overlay.addChild(card);

  const title = new Text({
    text: "CHEATS",
    style: new TextStyle({ fontFamily: "monospace", fontSize: 16, fontWeight: "bold", fill: 0xff4444 }),
  });
  title.anchor.set(0.5, 0);
  title.position.set(cardX + cardW / 2, cardY + 12);
  overlay.addChild(title);

  const btnStyle = new TextStyle({ fontFamily: "monospace", fontSize: 13, fontWeight: "bold", fill: 0xffffff });

  const addBtn = (label: string, yOffset: number, onClick: () => void) => {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    const btnBg = new Graphics();
    btnBg.roundRect(0, 0, cardW - 40, 34, 5);
    btnBg.fill({ color: 0x442222 });
    btnBg.stroke({ color: 0x774444, width: 1 });
    btn.addChild(btnBg);
    const txt = new Text({ text: label, style: btnStyle });
    txt.x = 12; txt.y = 8;
    btn.addChild(txt);
    btn.on("pointerdown", onClick);
    btn.on("pointerover", () => { btnBg.clear(); btnBg.roundRect(0, 0, cardW - 40, 34, 5); btnBg.fill({ color: 0x663333 }); btnBg.stroke({ color: 0xaa6666, width: 1 }); });
    btn.on("pointerout", () => { btnBg.clear(); btnBg.roundRect(0, 0, cardW - 40, 34, 5); btnBg.fill({ color: 0x442222 }); btnBg.stroke({ color: 0x774444, width: 1 }); });
    btn.position.set(cardX + 20, cardY + yOffset);
    overlay.addChild(btn);
  };

  const _refreshAll = () => {
    worldHUD.update(state);
    worldMapRenderer.drawMap(state.grid);
    worldMapRenderer.drawBorders(state.grid);
    worldMapRenderer.drawCamps(state.camps.values(), player);
    worldMapRenderer.drawNeutralBuildings(state.neutralBuildings.values(), player);
    worldMapRenderer.drawFog(state.grid, player);
    cityView.drawCities(state, player);
    armyView.drawArmies(state, player);
  };

  let btnY = 44;
  const BTN_STEP = 44;

  addBtn("+5000 GOLD", btnY, () => {
    player.gold += 5000;
    worldHUD.update(state);
    worldEventLog.addEvent("Cheat: +5000 gold", 0xff4444);
  });
  btnY += BTN_STEP;

  addBtn("+5000 MANA", btnY, () => {
    player.mana += 5000;
    worldHUD.update(state);
    worldEventLog.addEvent("Cheat: +5000 mana", 0xff4444);
  });
  btnY += BTN_STEP;

  addBtn("+5000 RESEARCH", btnY, () => {
    player.researchProgress += 5000;
    worldHUD.update(state);
    worldEventLog.addEvent("Cheat: +5000 research progress", 0xff4444);
  });
  btnY += BTN_STEP;

  addBtn("REMOVE FOG OF WAR", btnY, () => {
    for (const tile of state.grid.allTiles()) {
      const key = hexKey(tile.q, tile.r);
      player.exploredTiles.add(key);
      player.visibleTiles.add(key);
    }
    _refreshAll();
    worldEventLog.addEvent("Cheat: Fog of war removed", 0xff4444);
  });
  btnY += BTN_STEP;

  addBtn("SPAWN ARMY (click tile)", btnY, () => {
    overlay.destroy({ children: true });
    worldEventLog.addEvent("Click a tile to spawn 100 Elite Lancers", 0xff4444);
    _cheatSpawnMode = true;
  });
  btnY += BTN_STEP;

  addBtn("CLOSE", btnY, () => {
    overlay.destroy({ children: true });
  });

  vm.app.stage.addChild(overlay);
}

/** Flag for cheat spawn-army-on-click mode. */
let _cheatSpawnMode = false;

/** Merchant route data — merchants walk back and forth between towns and cities. */
interface MerchantRoute {
  armyId: string;
  path: import("@world/hex/HexCoord").HexCoord[];
  pathIndex: number;
  direction: 1 | -1;
}
let _merchantRoutes: MerchantRoute[] = [];

async function _bootWorldGame(
  settings: WorldGameSettings,
  raceId: RaceId = "man",
  leaderId: LeaderId = "arthur",
  armoryItems: string[] = [],
): Promise<void> {
  // Generate map
  const grid = generateWorldMap(settings);
  const startPositions = findStartPositions(grid, settings.numPlayers);

  // Clear mountains and water near starting positions (radius 3)
  for (const pos of startPositions) {
    const nearby = hexSpiral(pos, 3);
    for (const h of nearby) {
      const tile = grid.getTile(h.q, h.r);
      if (!tile) continue;
      if (tile.terrain === TerrainType.WATER) {
        tile.terrain = TerrainType.GRASSLAND;
      } else if (tile.terrain === TerrainType.MOUNTAINS) {
        tile.terrain = TerrainType.HILLS;
      }
    }
  }

  // Player IDs
  const playerOrder: string[] = [];
  for (let i = 0; i < settings.numPlayers; i++) {
    playerOrder.push(`p${i + 1}`);
  }

  // Create world state
  const state = createWorldState(grid, playerOrder);

  // AI randomization pools
  const implementedRaces = RACE_DEFINITIONS.filter((r) => r.implemented).map((r) => r.id);
  const allLeaderIds = LEADER_DEFINITIONS.map((l) => l.id);
  // Fisher-Yates shuffle
  for (let i = allLeaderIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allLeaderIds[i], allLeaderIds[j]] = [allLeaderIds[j], allLeaderIds[i]];
  }
  const aiLeaderPool = allLeaderIds.filter((id) => id !== leaderId);
  let aiLeaderIdx = 0;

  // Create players
  const humanCount = settings.numPlayers - settings.numAIPlayers;
  for (let i = 0; i < settings.numPlayers; i++) {
    const pid = `p${i + 1}`;
    const isAI = i >= humanCount;

    const playerRaceId = isAI
      ? implementedRaces[Math.floor(Math.random() * implementedRaces.length)]
      : raceId;
    const playerLeaderId = isAI
      ? aiLeaderPool[aiLeaderIdx++ % aiLeaderPool.length]
      : leaderId;

    const player = createWorldPlayer(
      pid,
      playerRaceId,
      isAI,
      WorldBalance.STARTING_GOLD,
      WorldBalance.STARTING_FOOD,
      playerLeaderId,
      isAI ? [] : armoryItems,
    );

    // Apply boot-time leader bonuses
    const leaderDef = getLeader(playerLeaderId);
    if (leaderDef?.bonus.type === "gold_bonus") {
      player.gold += leaderDef.bonus.amount;
    }

    state.players.set(pid, player);
  }

  // Initialize diplomacy: all players at war with each other
  for (const [pidA, pA] of state.players) {
    for (const [pidB] of state.players) {
      if (pidA !== pidB) pA.diplomacy.set(pidB, "war");
    }
  }

  // Configure national mage abilities from MagicScreen selections
  _configureNationalMageAbilities();

  // Create starting cities and garrisons
  for (let i = 0; i < settings.numPlayers; i++) {
    const pid = `p${i + 1}`;
    const pos = startPositions[i] ?? { q: i * 5, r: 0 }; // fallback if not enough positions

    // City
    const cityId = nextId(state, "city");
    const city = createWorldCity(cityId, pid, pos, true);

    // Capital starts with a Castle
    city.buildings.push({ type: WorldBuildingType.CASTLE as any, completedTurn: 0 });

    // Assign territory (radius 2 around city)
    const territoryHexes = hexSpiral(pos, WorldBalance.BASE_CITY_TERRITORY_RADIUS);
    city.territory = territoryHexes.filter((h) => grid.hasTile(h.q, h.r));
    city.workedTiles = city.territory.slice(0, city.population + 1);

    // Mark tiles as owned
    for (const hex of city.territory) {
      const tile = grid.getTile(hex.q, hex.r);
      if (tile) tile.owner = pid;
    }
    const cityTile = grid.getTile(pos.q, pos.r);
    if (cityTile) cityTile.cityId = cityId;

    // Starting garrison army
    const garrisonId = nextId(state, "army");
    const garrisonUnits: ArmyUnit[] = [
      { unitType: UnitType.SWORDSMAN, count: 3, hpPerUnit: 100 },
      { unitType: UnitType.ARCHER, count: 2, hpPerUnit: 100 },
    ];
    const garrison = createWorldArmy(garrisonId, pid, pos, garrisonUnits, true);
    city.garrisonArmyId = garrisonId;

    state.cities.set(cityId, city);
    state.armies.set(garrisonId, garrison);

    // Starting field army for exploration — placed on a neighboring hex
    const neighbors = hexNeighbors(pos);
    const fieldHex = neighbors.find((h) => {
      const t = grid.getTile(h.q, h.r);
      if (!t || t.cityId || t.armyId) return false;
      return isFinite(TERRAIN_DEFINITIONS[t.terrain].movementCost);
    });
    if (fieldHex) {
      const fieldId = nextId(state, "army");
      const fieldUnits: ArmyUnit[] = [
        { unitType: UnitType.SWORDSMAN, count: 4, hpPerUnit: 100 },
        { unitType: UnitType.ARCHER, count: 2, hpPerUnit: 100 },
      ];

      // Add a national mage if the race supports magic (up to tier 2)
      const playerObj = state.players.get(pid);
      if (playerObj) {
        const raceDef = getRace(playerObj.raceId);
        if (raceDef && raceDef.tiers && raceDef.tiers.magic >= 2) {
          const mageDef = UNIT_DEFINITIONS[UnitType.NATIONAL_MAGE_T2];
          fieldUnits.push({ unitType: UnitType.NATIONAL_MAGE_T2, count: 1, hpPerUnit: mageDef.hp });
        } else if (raceDef && raceDef.tiers && raceDef.tiers.magic >= 1) {
          const mageDef = UNIT_DEFINITIONS[UnitType.NATIONAL_MAGE_T1];
          fieldUnits.push({ unitType: UnitType.NATIONAL_MAGE_T1, count: 1, hpPerUnit: mageDef.hp });
        }
      }

      const fieldArmy = createWorldArmy(fieldId, pid, fieldHex, fieldUnits, false);
      state.armies.set(fieldId, fieldArmy);
      const fieldTile = grid.getTile(fieldHex.q, fieldHex.r);
      if (fieldTile) fieldTile.armyId = fieldId;
    }
  }

  // Place neutral camps
  const campCount = Math.max(8, Math.floor(settings.mapRadius * 1.2));
  const camps = placeCamps(grid, startPositions, campCount, settings.seed || Date.now());
  for (const camp of camps) {
    state.camps.set(camp.id, camp);
    const campTile = grid.getTile(camp.position.q, camp.position.r);
    if (campTile) campTile.campId = camp.id;
  }

  // ---------------------------------------------------------------------------
  // Morgaine — NPC faction with central city and roaming armies
  // ---------------------------------------------------------------------------
  {
    // Create Morgaine player (not in playerOrder — she never takes turns)
    const morgaine = createWorldPlayer("morgaine", "man", true, 0, 0);
    state.players.set("morgaine", morgaine);

    // Diplomacy: all players at war with Morgaine and vice versa
    for (const [pid, p] of state.players) {
      if (pid !== "morgaine") {
        p.diplomacy.set("morgaine", "war");
        morgaine.diplomacy.set(pid, "war");
      }
    }

    // Clear terrain around map center {q:0, r:0}
    const center = { q: 0, r: 0 };
    const centerNearby = hexSpiral(center, 3);
    for (const h of centerNearby) {
      const tile = grid.getTile(h.q, h.r);
      if (!tile) continue;
      if (tile.terrain === TerrainType.WATER) {
        tile.terrain = TerrainType.GRASSLAND;
      } else if (tile.terrain === TerrainType.MOUNTAINS) {
        tile.terrain = TerrainType.HILLS;
      }
    }

    // Create Morgaine's capital city "Avalon" at the center
    const avalonId = nextId(state, "city");
    const avalon = createWorldCity(avalonId, "morgaine", center, true);
    avalon.name = "Avalon";
    avalon.population = 8;
    avalon.buildings.push(
      { type: WorldBuildingType.CASTLE as any, completedTurn: 0 },
      { type: WorldBuildingType.CITY_WALLS as any, completedTurn: 0 },
      { type: BuildingType.BARRACKS as any, completedTurn: 0 },
      { type: BuildingType.ARCHERY_RANGE as any, completedTurn: 0 },
      { type: WorldBuildingType.GRANARY as any, completedTurn: 0 },
      { type: WorldBuildingType.WORKSHOP as any, completedTurn: 0 },
    );

    // Territory (radius 3 around center)
    const avalonTerritory = hexSpiral(center, 3).filter((h) => grid.hasTile(h.q, h.r));
    avalon.territory = avalonTerritory;
    avalon.workedTiles = avalonTerritory.slice(0, avalon.population + 1);
    for (const hex of avalonTerritory) {
      const tile = grid.getTile(hex.q, hex.r);
      if (tile) tile.owner = "morgaine";
    }
    const centerTile = grid.getTile(center.q, center.r);
    if (centerTile) centerTile.cityId = avalonId;

    // Large garrison
    const garrisonId = nextId(state, "army");
    const garrisonUnits: ArmyUnit[] = [
      { unitType: UnitType.SWORDSMAN, count: 15, hpPerUnit: 100 },
      { unitType: UnitType.ARCHER, count: 8, hpPerUnit: 70 },
      { unitType: UnitType.KNIGHT, count: 4, hpPerUnit: 180 },
      { unitType: UnitType.CROSSBOWMAN, count: 2, hpPerUnit: 75 },
    ];
    const garrison = createWorldArmy(garrisonId, "morgaine", center, garrisonUnits, true);
    avalon.garrisonArmyId = garrisonId;
    state.cities.set(avalonId, avalon);
    state.armies.set(garrisonId, garrison);

    // Scatter 5 high-tier stationary Morgaine armies across the map
    const allTiles = grid.allTilesArray();
    const morgaineArmyPositions: { q: number; r: number }[] = [];
    // Collect candidate tiles: passable, far from player starts (≥5) and center (≥4), not occupied
    const candidates = allTiles.filter((t) => {
      const terrain = TERRAIN_DEFINITIONS[t.terrain];
      if (!isFinite(terrain.movementCost)) return false;
      if (t.cityId || t.armyId || t.campId) return false;
      const coord = { q: t.q, r: t.r };
      if (hexDistance(coord, center) < 4) return false;
      for (const sp of startPositions) {
        if (hexDistance(coord, sp) < 5) return false;
      }
      return true;
    });
    // Pick 5 spread-out positions
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    for (const tile of shuffled) {
      if (morgaineArmyPositions.length >= 5) break;
      const coord = { q: tile.q, r: tile.r };
      // Ensure min distance 4 from other Morgaine armies
      const tooClose = morgaineArmyPositions.some((p) => hexDistance(coord, p) < 4);
      if (tooClose) continue;
      morgaineArmyPositions.push(coord);
    }
    for (const pos of morgaineArmyPositions) {
      const armyId = nextId(state, "army");
      const units: ArmyUnit[] = [
        { unitType: UnitType.KNIGHT, count: 6, hpPerUnit: 180 },
        { unitType: UnitType.CROSSBOWMAN, count: 3, hpPerUnit: 75 },
        { unitType: UnitType.STORM_MAGE, count: 2, hpPerUnit: 60 },
      ];
      const mArmy = createWorldArmy(armyId, "morgaine", pos, units, false);
      mArmy.movementPoints = 0; // stationary
      state.armies.set(armyId, mArmy);
      const mTile = grid.getTile(pos.q, pos.r);
      if (mTile) mTile.armyId = armyId;
    }
  }

  // Spawn a Morgaine introductory army near each player's capital
  for (let i = 0; i < settings.numPlayers; i++) {
    const pos = startPositions[i];
    if (!pos) continue;
    // Look for a free walkable tile at distance 2 from the capital
    const ring = hexSpiral(pos, 2).filter((h) => {
      const t = grid.getTile(h.q, h.r);
      if (!t || t.cityId || t.armyId || t.campId) return false;
      const terrain = TERRAIN_DEFINITIONS[t.terrain];
      return terrain.buildable && isFinite(terrain.movementCost);
    });
    if (ring.length > 0) {
      const hex = ring[Math.floor(Math.random() * ring.length)];
      const morgaineId = nextId(state, "army");
      const morgaineUnits: ArmyUnit[] = [
        { unitType: UnitType.SWORDSMAN, count: 5, hpPerUnit: 100 },
        { unitType: UnitType.ARCHER, count: 2, hpPerUnit: 100 },
      ];
      const morgaineArmy = createWorldArmy(morgaineId, "morgaine", hex, morgaineUnits, false);
      morgaineArmy.movementPoints = 0; // stationary
      state.armies.set(morgaineId, morgaineArmy);
      const morgaineTile = grid.getTile(hex.q, hex.r);
      if (morgaineTile) morgaineTile.armyId = morgaineId;
    }
  }

  // ---------------------------------------------------------------------------
  // Sword in the Stone — grassland island 4 hexes from Avalon, guarded by angel
  // ---------------------------------------------------------------------------
  {
    const center = { q: 0, r: 0 };
    // Find a tile exactly 4 hexes from Avalon
    const ring4 = hexSpiral(center, 4).filter((h) => hexDistance(center, h) === 4);
    const shuffledRing = ring4.sort(() => Math.random() - 0.5);
    let swordHex: { q: number; r: number } | null = null;

    for (const candidate of shuffledRing) {
      const t = grid.getTile(candidate.q, candidate.r);
      if (!t) continue;
      if (t.cityId || t.armyId || t.campId) continue;
      // Check all neighbors exist (so we can turn them to water)
      const neighbors = hexNeighbors(candidate);
      const allValid = neighbors.every((n) => grid.hasTile(n.q, n.r));
      if (!allValid) continue;
      swordHex = candidate;
      break;
    }

    if (swordHex) {
      // Set the tile to grassland
      const swordTile = grid.getTile(swordHex.q, swordHex.r)!;
      swordTile.terrain = TerrainType.GRASSLAND;
      swordTile.owner = null;
      swordTile.resource = null;
      swordTile.improvement = null;

      // Surround with water
      const neighbors = hexNeighbors(swordHex);
      for (const n of neighbors) {
        const nTile = grid.getTile(n.q, n.r);
        if (nTile) {
          nTile.terrain = TerrainType.WATER;
          nTile.owner = null;
          nTile.resource = null;
          nTile.improvement = null;
          // Don't overwrite existing cities/armies
        }
      }

      // Spawn neutral angel army on the tile
      const angelArmyId = nextId(state, "army");
      const angelUnits: ArmyUnit[] = [
        { unitType: UnitType.ANGEL, count: 1, hpPerUnit: 200 },
      ];
      const angelArmy = createWorldArmy(angelArmyId, "morgaine", swordHex, angelUnits, false);
      angelArmy.movementPoints = 0; // stationary
      state.armies.set(angelArmyId, angelArmy);
      swordTile.armyId = angelArmyId;

      state.swordHex = swordHex;
      state.swordClaimed = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Fake Sword Traps — look like real swords but hide dark savant + fire elemental
  // Not surrounded by water. Count scales with map size.
  // ---------------------------------------------------------------------------
  {
    const fakeSwordCount = Math.max(1, Math.floor(settings.mapRadius / 8));
    const allTilesForFake = [...grid.allTiles()];
    // Shuffle for randomness
    for (let i = allTilesForFake.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allTilesForFake[i], allTilesForFake[j]] = [allTilesForFake[j], allTilesForFake[i]];
    }

    const placedFakeSwords: { q: number; r: number }[] = [];

    for (const tile of allTilesForFake) {
      if (placedFakeSwords.length >= fakeSwordCount) break;

      // Must be passable land, not occupied
      const terrain = TERRAIN_DEFINITIONS[tile.terrain];
      if (!isFinite(terrain.movementCost)) continue;
      if (tile.terrain === TerrainType.WATER) continue;
      if (tile.cityId || tile.armyId || tile.campId) continue;

      const coord = { q: tile.q, r: tile.r };

      // Not too close to player starts (≥6)
      let tooCloseToStart = false;
      for (const sp of startPositions) {
        if (hexDistance(coord, sp) < 6) { tooCloseToStart = true; break; }
      }
      if (tooCloseToStart) continue;

      // Not too close to real sword
      if (state.swordHex && hexDistance(coord, state.swordHex) < 5) continue;

      // Not too close to center (Avalon)
      if (hexDistance(coord, { q: 0, r: 0 }) < 5) continue;

      // Not too close to other fake swords
      let tooCloseToFake = false;
      for (const fs of placedFakeSwords) {
        if (hexDistance(coord, fs) < 6) { tooCloseToFake = true; break; }
      }
      if (tooCloseToFake) continue;

      // Place the fake sword — set tile to grassland
      tile.terrain = TerrainType.GRASSLAND;
      tile.owner = null;
      tile.resource = null;
      tile.improvement = null;

      // Create a camp with hidden dark savant + fire elemental
      const campId = `fake_sword_camp_${placedFakeSwords.length + 1}`;
      const fakeCamp: import("@world/state/WorldCamp").WorldCamp = {
        id: campId,
        position: coord,
        tier: 3,
        defenders: [
          { unitType: UnitType.DARK_SAVANT, count: 1, hpPerUnit: 200 },
          { unitType: UnitType.FIRE_ELEMENTAL, count: 1, hpPerUnit: 200 },
        ],
        goldReward: 0,
        cleared: false,
      };
      state.camps.set(campId, fakeCamp);
      tile.campId = campId;

      placedFakeSwords.push(coord);
    }

    state.fakeSwordHexes = placedFakeSwords;
  }

  // Re-clear water/mountains around player starts (Sword Island may have placed water on them)
  for (const pos of startPositions) {
    const nearby = hexSpiral(pos, 3);
    for (const h of nearby) {
      const tile = grid.getTile(h.q, h.r);
      if (!tile) continue;
      if (tile.terrain === TerrainType.WATER) {
        tile.terrain = TerrainType.GRASSLAND;
      } else if (tile.terrain === TerrainType.MOUNTAINS) {
        tile.terrain = TerrainType.HILLS;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Neutral cities — independent city-states of random races
  // ---------------------------------------------------------------------------
  {
    const neutralCityCount = Math.max(3, Math.floor(settings.mapRadius * 0.8));
    const neutralPositions = findNeutralCityPositions(grid, startPositions, neutralCityCount);
    const neutralSeed = settings.seed || Date.now();

    for (let i = 0; i < neutralPositions.length; i++) {
      const pos = neutralPositions[i];
      const neutralId = `neutral_${i + 1}`;
      const rng = neutralRng(neutralSeed + i * 7919);
      const neutralRaceId = pickNeutralRace(rng);

      // Create neutral player (takes AI turns like other AI players)
      const neutralPlayer = createWorldPlayer(neutralId, neutralRaceId, true, 0, 0);
      state.players.set(neutralId, neutralPlayer);
      state.playerOrder.push(neutralId);

      // Diplomacy: at war with all existing players
      for (const [pid, p] of state.players) {
        if (pid !== neutralId) {
          p.diplomacy.set(neutralId, "war");
          neutralPlayer.diplomacy.set(pid, "war");
        }
      }

      // Create city with Castle + City Walls
      const cityId = nextId(state, "city");
      const city = createWorldCity(cityId, neutralId, pos, true);
      city.population = 4;
      city.buildings.push(
        { type: WorldBuildingType.CASTLE as any, completedTurn: 0 },
        { type: WorldBuildingType.CITY_WALLS as any, completedTurn: 0 },
      );

      // Territory (radius 2)
      const territory = hexSpiral(pos, WorldBalance.BASE_CITY_TERRITORY_RADIUS)
        .filter((h) => grid.hasTile(h.q, h.r));
      city.territory = territory;
      city.workedTiles = territory.slice(0, city.population + 1);
      for (const hex of territory) {
        const tile = grid.getTile(hex.q, hex.r);
        if (tile && !tile.owner) tile.owner = neutralId;
      }
      const cityTile = grid.getTile(pos.q, pos.r);
      if (cityTile) cityTile.cityId = cityId;

      // Tier 3 garrison army
      const garrisonId = nextId(state, "army");
      const garrisonUnits = getNeutralCityGarrison(neutralRaceId, rng);
      const garrison = createWorldArmy(garrisonId, neutralId, pos, garrisonUnits, true);
      city.garrisonArmyId = garrisonId;

      state.cities.set(cityId, city);
      state.armies.set(garrisonId, garrison);
    }
  }

  // Place neutral buildings (farms, mills, towers) — after all cities are placed
  {
    const neutralCityPos: import("@world/hex/HexCoord").HexCoord[] = [];
    for (const city of state.cities.values()) {
      if (city.owner.startsWith("neutral_")) {
        neutralCityPos.push(city.position);
      }
    }
    const neutralBuildings = placeNeutralBuildings(grid, startPositions, neutralCityPos, settings.seed || Date.now());
    for (const nb of neutralBuildings) {
      state.neutralBuildings.set(nb.id, nb);
    }
  }

  // ---------------------------------------------------------------------------
  // Mill towns & roads — each mill gets an adjacent town with a road to the
  // nearest city. A merchant walks back and forth along the road each turn.
  // ---------------------------------------------------------------------------
  _merchantRoutes = [];

  {
    // Create "merchant" player (passive, at peace with everyone)
    if (!state.players.has("merchant")) {
      const merchantPlayer = createWorldPlayer("merchant", "human", true, 0, 0);
      state.players.set("merchant", merchantPlayer);
      for (const [pid, p] of state.players) {
        if (pid !== "merchant") {
          merchantPlayer.diplomacy.set(pid, "peace");
          p.diplomacy.set("merchant", "peace");
        }
      }
      // Don't add to playerOrder — merchants don't take turns
    }

    const mills = [...state.neutralBuildings.values()].filter((nb) => nb.type === "mill");

    for (const mill of mills) {
      // Find a passable, unoccupied neighbor for the town
      const neighbors = hexNeighbors(mill.position);
      const townHex = neighbors.find((h) => {
        const t = grid.getTile(h.q, h.r);
        if (!t) return false;
        if (t.cityId || t.campId || t.neutralBuildingId || t.armyId) return false;
        return isFinite(TERRAIN_DEFINITIONS[t.terrain].movementCost);
      });
      if (!townHex) continue;

      // Create a small neutral town (non-capital WorldCity)
      const townOwnerId = "mill_town";
      if (!state.players.has(townOwnerId)) {
        const townPlayer = createWorldPlayer(townOwnerId, "human", true, 0, 0);
        state.players.set(townOwnerId, townPlayer);
        for (const [pid, p] of state.players) {
          if (pid !== townOwnerId) {
            p.diplomacy.set(townOwnerId, "war");
            townPlayer.diplomacy.set(pid, "war");
          }
        }
      }

      const townCityId = nextId(state, "city");
      const townCity = createWorldCity(townCityId, townOwnerId, townHex, false);
      townCity.population = 2;
      const townTerritory = hexSpiral(townHex, 1).filter((h) => grid.hasTile(h.q, h.r));
      townCity.territory = townTerritory;
      townCity.workedTiles = townTerritory.slice(0, 3);
      for (const hex of townTerritory) {
        const tile = grid.getTile(hex.q, hex.r);
        if (tile && !tile.owner) tile.owner = townOwnerId;
      }
      const townTile = grid.getTile(townHex.q, townHex.r);
      if (townTile) townTile.cityId = townCityId;

      // Garrison
      const garrisonId = nextId(state, "army");
      const garrisonUnits: ArmyUnit[] = [
        { unitType: "swordsman", count: 4, hpPerUnit: 100 },
        { unitType: "archer", count: 2, hpPerUnit: 100 },
      ];
      const garrison = createWorldArmy(garrisonId, townOwnerId, townHex, garrisonUnits, true);
      townCity.garrisonArmyId = garrisonId;

      state.cities.set(townCityId, townCity);
      state.armies.set(garrisonId, garrison);

      // Find nearest city (excluding our new town)
      let nearestCity: import("@world/state/WorldCity").WorldCity | null = null;
      let nearestDist = Infinity;
      for (const city of state.cities.values()) {
        if (city.id === townCityId) continue;
        const d = hexDistance(townHex, city.position);
        if (d < nearestDist) {
          nearestDist = d;
          nearestCity = city;
        }
      }

      // Lay road from town to nearest city & create merchant
      if (nearestCity) {
        const pathResult = findHexPath(grid, townHex, nearestCity.position, Infinity, false);
        if (pathResult && pathResult.path.length > 1) {
          for (const step of pathResult.path) {
            const tile = grid.getTile(step.q, step.r);
            if (!tile) continue;
            if (tile.cityId) continue;
            if (!tile.improvement) {
              tile.improvement = "road";
            }
          }

          // Spawn a merchant army at the town, walking the road
          const merchantId = nextId(state, "army");
          const merchantArmy = createWorldArmy(
            merchantId,
            "merchant",
            townHex,
            [{ unitType: "swordsman", count: 1, hpPerUnit: 100 }],
            false,
          );
          merchantArmy.maxMovementPoints = 2;
          merchantArmy.movementPoints = 2;
          state.armies.set(merchantId, merchantArmy);
          // Don't set tile.armyId — merchants coexist on tiles without blocking

          _merchantRoutes.push({
            armyId: merchantId,
            path: pathResult.path,
            pathIndex: 0,
            direction: 1,
          });
        }
      }
    }
  }

  // DEBUG: Spawn a p2 army near p1's capital
  {
    let p1Capital: import("@world/state/WorldCity").WorldCity | null = null;
    for (const city of state.cities.values()) {
      if (city.owner === "p1" && city.isCapital) { p1Capital = city; break; }
    }
    if (p1Capital) {
      const neighbors = hexNeighbors(p1Capital.position);
      const spawnHex = neighbors.find((h) => {
        const t = state.grid.getTile(h.q, h.r);
        return t && !t.armyId && !t.cityId;
      }) ?? neighbors[0];
      const debugArmyId = nextId(state, "army");
      const debugArmy = createWorldArmy(debugArmyId, "p2", spawnHex, [
        { unitType: UnitType.SWORDSMAN, count: 5, hpPerUnit: UNIT_DEFINITIONS[UnitType.SWORDSMAN].hp },
        { unitType: UnitType.ARCHER, count: 2, hpPerUnit: UNIT_DEFINITIONS[UnitType.ARCHER].hp },
        { unitType: UnitType.LANCER, count: 3, hpPerUnit: UNIT_DEFINITIONS[UnitType.LANCER].hp },
      ], false);
      state.armies.set(debugArmyId, debugArmy);
      const debugTile = state.grid.getTile(spawnHex.q, spawnHex.r);
      if (debugTile) debugTile.armyId = debugArmyId;
    }
  }

  _initWorldViews(state);
}

// ---------------------------------------------------------------------------
// World view initialization — reused by both new game and load game
// ---------------------------------------------------------------------------

function _initWorldViews(state: WorldState, skipBeginTurn = false): void {
  const grid = state.grid;

  // Configure camera for hex world
  {
    const hexSize = WorldBalance.HEX_SIZE;
    const extent = state.grid.radius * hexSize * 2;
    const tileSize = BalanceConfig.TILE_SIZE;
    const mapTiles = Math.ceil((extent * 2) / tileSize);
    viewManager.camera.setMapSize(mapTiles, mapTiles);
    viewManager.camera.setPadding(extent * 0.6);

    // Start world mode slightly zoomed out
    viewManager.camera.zoom = 0.75;

    for (const city of state.cities.values()) {
      if (city.owner === "p1" && city.isCapital) {
        const px = hexToPixel(city.position, hexSize);
        const cam = viewManager.camera;
        const visW = cam.screenW / cam.zoom;
        const visH = cam.screenH / cam.zoom;
        cam.x = -px.x + visW / 2;
        cam.y = -px.y + visH / 2;
        break;
      }
    }
  }

  // Initialize renderer
  worldMapRenderer.init(viewManager);
  worldMapRenderer.drawMap(grid);

  // Draw sword in the stone if it exists and hasn't been claimed
  if (state.swordHex && !state.swordClaimed) {
    worldMapRenderer.setSwordHex(state.swordHex);
  }

  // Draw fake sword traps (look identical to real sword)
  if (state.fakeSwordHexes && state.fakeSwordHexes.length > 0) {
    // Only show fake swords whose camps haven't been cleared
    const activeFakeSwords = state.fakeSwordHexes.filter((h) => {
      const tile = grid.getTile(h.q, h.r);
      if (!tile?.campId) return false;
      const camp = state.camps.get(tile.campId);
      return camp && !camp.cleared;
    });
    worldMapRenderer.setFakeSwordHexes(activeFakeSwords);
  }

  // Block hex clicks when they land on a UI panel
  worldMapRenderer.shouldBlockClick = (sx, sy) => {
    if (cityPanel.isVisible) {
      const panelX = viewManager.screenWidth - 290;
      if (sx >= panelX) return true;
    }
    if (armyPanel.isVisible) {
      if (sx <= 260 && sy >= 64) return true;
    }
    if (researchScreen.isVisible) return true;
    if (worldVictoryScreen.isVisible) return true;
    if (worldScoreScreen.isVisible) return true;
    if (worldNationalScreen.isVisible) return true;
    if (worldArmyOverview.isVisible) return true;
    if (worldBattleViewer.isVisible) return true;
    if (leaderSelectScreen.container.visible) return true;
    if (raceDetailScreen.container.visible) return true;
    if (magicScreen.container.visible) return true;
    if (worldWikiScreen.isVisible) return true;
    if (merlinMagicScreen.isVisible) return true;
    return false;
  };

  // Initialize city view
  cityView.init(viewManager);
  cityView.drawCities(state);

  // Initialize city panel
  cityPanel.init(viewManager);
  cityPanel.onClose = () => cityPanel.hide();
  cityPanel.onBuild = (cityId, buildingType) => {
    const city = state.cities.get(cityId);
    if (city) {
      startConstruction(city, buildingType);
      cityPanel.show(city, state);
      cityView.updateCity(city);
    }
  };
  cityPanel.onRecruit = (cityId, unitType, count) => {
    const city = state.cities.get(cityId);
    if (city) {
      queueRecruitment(city, state, unitType, count);
      cityPanel.show(city, state); // refresh
      worldHUD.update(state); // refresh gold
    }
  };
  cityPanel.onCreateArmy = (cityId, units) => {
    const city = state.cities.get(cityId);
    if (!city) return;
    // Block if a field army already occupies this tile
    const tile = state.grid.getTile(city.position.q, city.position.r);
    if (tile?.armyId) return;

    const garrison = city.garrisonArmyId ? state.armies.get(city.garrisonArmyId) : null;
    const armyUnits = units.map((u) => {
      const gUnit = garrison?.units.find((g) => g.unitType === u.unitType);
      return { unitType: u.unitType, count: u.count, hpPerUnit: gUnit?.hpPerUnit ?? 100 };
    });

    deployArmy(city, state, armyUnits);
    cityPanel.show(city, state);
    refreshWorld();
  };
  cityPanel.onRename = (cityId, newName) => {
    const city = state.cities.get(cityId);
    if (city) {
      city.name = newName;
      cityPanel.show(city, state);
      cityView.updateCity(city);
    }
  };
  cityPanel.onViewCity = (cityId) => {
    const city = state.cities.get(cityId);
    if (city) {
      cityPreviewScreen.show(city);
    }
  };

  cityPanel.onAskAdvisor = (advisor) => {
    advisorDialog.show(advisor);
  };
  cityPanel.onMerlinMagic = () => {
    cityPanel.hide();
    merlinMagicScreen.show(state);
  };

  // Initialize city preview screen
  cityPreviewScreen.init(viewManager);

  // Initialize advisor dialog
  advisorDialog.init(viewManager);
  turnTransition.init(viewManager);

  // Initialize army view
  armyView.init(viewManager);
  armyView.drawArmies(state);

  // Initialize army panel
  armyPanel.init(viewManager);
  armyPanel.onClose = () => {
    armyPanel.hide();
    conjurePanel.hide();
    worldMapRenderer.clearHighlights();
  };
  armyPanel.onDeploy = (garrisonId) => {
    const garrison = state.armies.get(garrisonId);
    if (!garrison) return;
    for (const city of state.cities.values()) {
      if (city.garrisonArmyId === garrisonId) {
        deployArmy(city, state, [...garrison.units.map((u) => ({ ...u }))]);
        armyPanel.hide();
        refreshWorld();
        break;
      }
    }
  };
  armyPanel.onMove = (armyId) => {
    const army = state.armies.get(armyId);
    if (!army) return;
    const reachable = getArmyReachableHexes(army, state);
    worldMapRenderer.highlightHexes(reachable, 0x44ff44, 0.25);
    _moveModeArmyId = armyId;
  };
  armyPanel.onBuildImprovement = (armyId, improvementType) => {
    const army = state.armies.get(armyId);
    if (!army || army.movementPoints <= 0) return;
    const tile = state.grid.getTile(army.position.q, army.position.r);
    if (!tile || tile.improvement) return;
    tile.improvement = improvementType;
    army.movementPoints = 0; // costs all movement
    worldEventLog.addEvent(`Built ${improvementType.replace("_", " ")}`, 0x88cc44);
    armyPanel.show(army, state); // refresh panel
    refreshWorld();
  };
  armyPanel.canFoundCityCheck = canFoundCity;
  armyPanel.onFoundCity = (armyId) => {
    const army = state.armies.get(armyId);
    if (!army) return;
    const cityId = foundCity(army, state);
    if (cityId) {
      worldEventLog.addEvent(`Founded a new city!`, 0xffcc44);
      updateVisibility(state, army.owner);
      armyPanel.hide();
      refreshWorld();
    }
  };

  armyPanel.onRename = (armyId, newName) => {
    const army = state.armies.get(armyId);
    if (army) {
      army.name = newName;
      armyPanel.show(army, state);
      armyView.drawArmies(state);
    }
  };

  // Initialize conjure panel
  conjurePanel.init(viewManager);
  conjurePanel.onClose = () => conjurePanel.hide();
  conjurePanel.onCast = (spell, army) => {
    const player = state.players.get(army.owner);
    if (!player) return;
    const manaCost = spell.manaCost ?? 0;
    if (player.mana < manaCost) return;
    player.mana -= manaCost;

    // Add summoned unit to army
    if (spell.summonUnit) {
      const unitDef = UNIT_DEFINITIONS[spell.summonUnit as keyof typeof UNIT_DEFINITIONS];
      const existing = army.units.find((u) => u.unitType === spell.summonUnit);
      if (existing) {
        existing.count++;
      } else {
        army.units.push({
          unitType: spell.summonUnit,
          count: 1,
          hpPerUnit: unitDef?.hp ?? 100,
        });
      }
    }

    worldEventLog.addEvent(`Conjured ${spell.summonUnit ?? "a creature"}!`, 0xcc88ff);
    conjurePanel.show(army, state); // refresh panel
    armyPanel.show(army, state); // refresh army panel
    worldHUD.update(state);
    refreshWorld();
  };

  armyPanel.onConjure = (armyId) => {
    const army = state.armies.get(armyId);
    if (!army) return;
    if (conjurePanel.isVisible) {
      conjurePanel.hide();
    } else {
      conjurePanel.show(army, state);
    }
  };

  armyPanel.onSplit = (armyId, units) => {
    const army = state.armies.get(armyId);
    if (!army) return;
    const newArmy = splitArmy(army, units, state);
    if (newArmy) {
      refreshWorld();
      armyPanel.show(army, state);
    }
  };

  armyPanel.onMerge = (armyId, targetArmyId) => {
    const army = state.armies.get(armyId);
    const target = state.armies.get(targetArmyId);
    if (!army || !target) return;
    if (mergeArmies(army, target, state)) {
      refreshWorld();
      armyPanel.show(army, state);
    }
  };

  // Initialize research screen
  researchScreen.init(viewManager);
  researchScreen.onClose = () => researchScreen.hide();
  researchScreen.onResearchSelected = (researchId) => {
    const player = state.players.get(state.playerOrder[state.currentPlayerIndex])!;
    setActiveResearch(player, researchId);
    researchScreen.show(state); // refresh
    worldHUD.update(state);
  };
  researchScreen.onMagicResearchSelected = (school, tier) => {
    const player = state.players.get(state.playerOrder[state.currentPlayerIndex])!;
    setActiveMagicResearch(player, school, tier);
    researchScreen.show(state); // refresh
  };

  // Initialize HUD
  worldHUD.init(viewManager);
  worldHUD.update(state);

  // Research button handler
  worldHUD.onResearch = () => {
    if (researchScreen.isVisible) {
      researchScreen.hide();
    } else {
      researchScreen.show(state);
    }
  };

  // Menu button handler
  worldHUD.onMenu = () => {
    _showWorldInfoMenu(state);
  };

  // Initialize event log
  worldEventLog.init(viewManager);
  worldEventLog.setTurn(state.turn);

  // Initialize victory screen
  worldVictoryScreen.init(viewManager);
  worldVictoryScreen.onReturnToMenu = () => {
    window.location.reload();
  };

  // Initialize notification toasts
  worldNotification.init(viewManager);

  // Initialize wiki screen
  worldWikiScreen.init(viewManager);
  worldWikiScreen.onOpenUnits = () => {
    raceDetailScreen.onBack = () => {
      raceDetailScreen.hide();
      worldWikiScreen.show();
    };
    raceDetailScreen.showWiki();
  };
  worldWikiScreen.onOpenSpells = () => {
    magicScreen.onBack = () => {
      magicScreen.hide();
      worldWikiScreen.show();
    };
    magicScreen.showWiki();
  };
  worldWikiScreen.onOpenBuildings = () => {
    buildingWikiScreen.onBack = () => {
      buildingWikiScreen.hide();
      worldWikiScreen.show();
    };
    buildingWikiScreen.show();
  };

  // Initialize battle viewer
  worldBattleViewer.init(viewManager);

  // Initialize hex tooltip
  worldHexTooltip.init(viewManager);
  worldHexTooltip.setState(state);
  worldMapRenderer.onHexHover = (hex) => {
    worldHexTooltip.showForHex(hex);

    // Path preview when army is selected
    if (hex && _selectedArmyId) {
      const army = state.armies.get(_selectedArmyId);
      const hKey = hexKey(hex.q, hex.r);
      if (army && _selectedArmyReachable.has(hKey)) {
        const pathResult = findHexPath(state.grid, army.position, hex, army.movementPoints, playerCanCrossWater(army.owner, state));
        if (pathResult) {
          worldMapRenderer.drawPathPreview(pathResult.path);
        } else {
          worldMapRenderer.clearPathPreview();
        }
      } else {
        worldMapRenderer.clearPathPreview();
      }
    } else {
      worldMapRenderer.clearPathPreview();
    }
  };

  // Initialize minimap
  worldMinimap.init(viewManager);
  worldMinimap.drawMap(state.grid);

  // Initialize overview screens
  worldScoreScreen.init(viewManager);
  worldNationalScreen.init(viewManager);
  worldArmyOverview.init(viewManager);

  // Initialize Merlin's Magic screen
  merlinMagicScreen.init(viewManager);

  // Track movement mode (explicit MOVE button) and selected army movement
  let _moveModeArmyId: string | null = null;
  let _selectedArmyId: string | null = null;
  let _selectedArmyReachable = new Set<string>();
  let _armyCycleIndex = 0;
  let _lastClickHex: string | null = null;
  let _lastClickTime = 0;

  // The human player for fog of war
  const localPlayer = state.players.get("p1")!;

  // Helper to refresh all visuals
  const refreshWorld = () => {
    worldHUD.update(state);
    worldMapRenderer.drawMap(state.grid);
    worldMapRenderer.drawBorders(state.grid);
    worldMapRenderer.drawCamps(state.camps.values(), localPlayer);
    worldMapRenderer.drawNeutralBuildings(state.neutralBuildings.values(), localPlayer);
    worldMapRenderer.drawFog(state.grid, localPlayer);
    cityView.drawCities(state, localPlayer);
    armyView.drawArmies(state, localPlayer);
    worldEventLog.setTurn(state.turn);
    worldMinimap.drawMap(state.grid, localPlayer);
    worldHexTooltip.setState(state, localPlayer);

    // Check for game over
    if (state.phase === WorldPhase.GAME_OVER) {
      worldVictoryScreen.show(state);
    }
  };

  // Merlin's Magic screen callbacks (after refreshWorld is defined)
  merlinMagicScreen.onCastSpell = (spellId: OverlandSpellId) => {
    const result = castSpell(state, "p1", spellId);
    if (result.success) {
      worldEventLog.addEvent(result.message, 0xcc88ff);
      worldNotification.show("Merlin's Magic", result.message, 0xcc88ff);
    } else {
      worldEventLog.addEvent(result.message, 0xff4444);
      worldNotification.show("Merlin's Magic", result.message, 0xff4444);
    }
    refreshWorld();
    merlinMagicScreen.show(state);
  };
  merlinMagicScreen.onSelectTarget = (spellId: OverlandSpellId, targetType: string) => {
    if (targetType === "enemy_city") {
      const enemyCities: Array<{ id: string; name: string; owner: string }> = [];
      for (const city of state.cities.values()) {
        if (city.owner !== "p1") {
          enemyCities.push({ id: city.id, name: city.name, owner: city.owner });
        }
      }
      if (enemyCities.length === 0) {
        worldNotification.show("Merlin's Magic", "No enemy cities to target.", 0xff4444);
        return;
      }
      _showTargetCityPicker(state, spellId, enemyCities);
    } else if (targetType === "army") {
      merlinMagicScreen.hide();
      worldNotification.show("Mass Teleport", "Select an army to teleport, then click a destination hex.", 0xaa88ff);
      const result = castSpell(state, "p1", spellId);
      if (result.success) {
        worldEventLog.addEvent(result.message, 0xcc88ff);
      }
      refreshWorld();
    }
  };

  // Merlin warning when player gets near a Morgaine army
  const _warnedMorgaineArmies = new Set<string>();

  /** Show Merlin warning dialog if a player army is within 1 hex of a Morgaine army. */
  const _checkMorgaineProximity = (playerArmy: WorldArmy): Promise<void> => {
    for (const army of state.armies.values()) {
      if (army.owner !== "morgaine" || army.isGarrison) continue;
      if (_warnedMorgaineArmies.has(army.id)) continue;
      if (hexDistance(playerArmy.position, army.position) <= 1) {
        _warnedMorgaineArmies.add(army.id);
        return _showMerlinWarning();
      }
    }
    return Promise.resolve();
  };

  const _showMerlinWarning = (): Promise<void> => {
    return new Promise((resolve) => {
      // Backdrop
      const backdrop = document.createElement("div");
      backdrop.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;";

      // Card
      const card = document.createElement("div");
      card.style.cssText = "background:#1a1a2e;border:2px solid #8844cc;border-radius:12px;padding:24px;max-width:380px;text-align:center;box-shadow:0 0 30px rgba(136,68,204,0.4);";

      // Merlin portrait
      const img = document.createElement("img");
      img.src = merlinImgUrl;
      img.style.cssText = "width:80px;height:80px;border-radius:50%;border:2px solid #aa88dd;margin-bottom:12px;image-rendering:pixelated;";
      card.appendChild(img);

      // Title
      const title = document.createElement("div");
      title.textContent = "Merlin warns you!";
      title.style.cssText = "color:#aa88dd;font-family:monospace;font-size:16px;font-weight:bold;margin-bottom:8px;";
      card.appendChild(title);

      // Flavor text
      const text = document.createElement("div");
      text.textContent = "Beware! This is one of Morgaine\u2019s armies. She is rumoured to command a powerful city in the center of these lands. Tread carefully\u2026";
      text.style.cssText = "color:#ccccdd;font-family:monospace;font-size:12px;line-height:1.5;margin-bottom:16px;";
      card.appendChild(text);

      // Dismiss button
      const btn = document.createElement("button");
      btn.textContent = "Dismiss";
      btn.style.cssText = "background:#8844cc;color:white;border:none;border-radius:6px;padding:8px 24px;font-family:monospace;font-size:13px;cursor:pointer;";
      btn.onmouseenter = () => { btn.style.background = "#aa66ee"; };
      btn.onmouseleave = () => { btn.style.background = "#8844cc"; };
      btn.onclick = () => { backdrop.remove(); resolve(); };
      card.appendChild(btn);

      backdrop.appendChild(card);
      document.body.appendChild(backdrop);
    });
  };

  // Show Merlin dialog after defeating a Morgaine army (crystal awarded)
  const _showMerlinCrystalDialog = (crystalCount: number): Promise<void> => {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;";

      const card = document.createElement("div");
      card.style.cssText = "background:#1a1a2e;border:2px solid #8844cc;border-radius:12px;padding:24px;max-width:420px;text-align:center;box-shadow:0 0 30px rgba(136,68,204,0.4);";

      const img = document.createElement("img");
      img.src = merlinImgUrl;
      img.style.cssText = "width:80px;height:80px;border-radius:50%;border:2px solid #aa88dd;margin-bottom:12px;image-rendering:pixelated;";
      card.appendChild(img);

      const title = document.createElement("div");
      title.textContent = "Merlin speaks!";
      title.style.cssText = "color:#aa88dd;font-family:monospace;font-size:16px;font-weight:bold;margin-bottom:8px;";
      card.appendChild(title);

      const text = document.createElement("div");
      if (crystalCount < 3) {
        text.innerHTML = `<b style="color:#cc88ff">You found a Morgaine Crystal!</b><br><br>` +
          `These crystals are fragments of Morgaine\u2019s power. Each one grants you <b style="color:#8888ff">+10 mana</b> and <b style="color:#44aa44">+10 research</b> per turn.<br><br>` +
          `You now have <b style="color:#cc44ff">${crystalCount}/3</b> crystals. ` +
          `Collect <b style="color:#cc44ff">3 crystals</b> to gain the power to assault <b style="color:#ff8844">Avalon</b>, Morgaine\u2019s fortress at the center of the world. ` +
          `Conquer Avalon to win the game!<br><br>` +
          `<span style="color:#aaa">Beware: defeating another player will claim all their crystals.</span>`;
      } else {
        text.innerHTML = `<b style="color:#cc88ff">You found a Morgaine Crystal!</b><br><br>` +
          `You now have <b style="color:#cc44ff">${crystalCount}/3</b> crystals \u2014 enough to break the wards around <b style="color:#ff8844">Avalon</b>!<br><br>` +
          `March your army to Morgaine\u2019s city at the center of the world. ` +
          `Defeat her garrison and claim victory!`;
      }
      text.style.cssText = "color:#ccccdd;font-family:monospace;font-size:12px;line-height:1.6;margin-bottom:16px;text-align:left;";
      card.appendChild(text);

      const btn = document.createElement("button");
      btn.textContent = "Understood";
      btn.style.cssText = "background:#8844cc;color:white;border:none;border-radius:6px;padding:8px 24px;font-family:monospace;font-size:13px;cursor:pointer;";
      btn.onmouseenter = () => { btn.style.background = "#aa66ee"; };
      btn.onmouseleave = () => { btn.style.background = "#8844cc"; };
      btn.onclick = () => { backdrop.remove(); resolve(); };
      card.appendChild(btn);

      backdrop.appendChild(card);
      document.body.appendChild(backdrop);
    });
  };

  /** Check if a target hex contains Avalon (Morgaine's city) and block if player lacks 3 crystals. */
  const _isAvalonBlocked = (targetHex: { q: number; r: number }, playerId: string): boolean => {
    const tile = state.grid.getTile(targetHex.q, targetHex.r);
    if (!tile?.cityId) return false;
    const city = state.cities.get(tile.cityId);
    if (!city || city.owner !== "morgaine") return false;
    const player = state.players.get(playerId);
    if (!player) return false;
    return player.morgaineCrystals < 3;
  };

  const _showAvalonBlockedDialog = (): Promise<void> => {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;";

      const card = document.createElement("div");
      card.style.cssText = "background:#1a1a2e;border:2px solid #8844cc;border-radius:12px;padding:24px;max-width:380px;text-align:center;box-shadow:0 0 30px rgba(136,68,204,0.4);";

      const img = document.createElement("img");
      img.src = merlinImgUrl;
      img.style.cssText = "width:80px;height:80px;border-radius:50%;border:2px solid #aa88dd;margin-bottom:12px;image-rendering:pixelated;";
      card.appendChild(img);

      const title = document.createElement("div");
      title.textContent = "Merlin warns you!";
      title.style.cssText = "color:#aa88dd;font-family:monospace;font-size:16px;font-weight:bold;margin-bottom:8px;";
      card.appendChild(title);

      const player = state.players.get("p1");
      const crystals = player?.morgaineCrystals ?? 0;
      const text = document.createElement("div");
      text.innerHTML = `Avalon is protected by powerful wards! You need <b style="color:#cc44ff">3 Morgaine Crystals</b> to breach its defenses.<br><br>` +
        `You currently have <b style="color:#cc44ff">${crystals}/3</b> crystals. Defeat Morgaine\u2019s roaming armies to collect more.`;
      text.style.cssText = "color:#ccccdd;font-family:monospace;font-size:12px;line-height:1.5;margin-bottom:16px;";
      card.appendChild(text);

      const btn = document.createElement("button");
      btn.textContent = "Understood";
      btn.style.cssText = "background:#8844cc;color:white;border:none;border-radius:6px;padding:8px 24px;font-family:monospace;font-size:13px;cursor:pointer;";
      btn.onmouseenter = () => { btn.style.background = "#aa66ee"; };
      btn.onmouseleave = () => { btn.style.background = "#8844cc"; };
      btn.onclick = () => { backdrop.remove(); resolve(); };
      card.appendChild(btn);

      backdrop.appendChild(card);
      document.body.appendChild(backdrop);
    });
  };

  // Sword in the Stone proximity check — triggers when player army is within 2 hexes
  let _swordDialogShown = false;
  const _checkSwordProximity = async (playerArmy: WorldArmy): Promise<void> => {
    if (!state.swordHex || state.swordClaimed || _swordDialogShown) return;
    if (playerArmy.owner !== "p1") return;
    if (hexDistance(playerArmy.position, state.swordHex) > 2) return;

    _swordDialogShown = true;
    const player = state.players.get("p1");
    if (!player) return;

    const isArthur = player.leaderId === "arthur";

    await new Promise<void>((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;";

      const card = document.createElement("div");
      card.style.cssText = "background:#1a1a2e;border:2px solid #8844cc;border-radius:12px;padding:24px;max-width:400px;text-align:center;box-shadow:0 0 30px rgba(136,68,204,0.4);";

      const img = document.createElement("img");
      img.src = merlinImgUrl;
      img.style.cssText = "width:80px;height:80px;border-radius:50%;border:2px solid #aa88dd;margin-bottom:12px;image-rendering:pixelated;";
      card.appendChild(img);

      const title = document.createElement("div");
      title.textContent = "Merlin speaks!";
      title.style.cssText = "color:#aa88dd;font-family:monospace;font-size:16px;font-weight:bold;margin-bottom:8px;";
      card.appendChild(title);

      const text = document.createElement("div");
      if (isArthur) {
        text.innerHTML = `<b style="color:#ffd700">Welcome again, my liege!</b><br><br>` +
          `Your sword has awaited your return. <b style="color:#ffdd44">Excalibur</b> is yours once more \u2014 ` +
          `may it guide you to victory against the darkness of Morgaine!`;
      } else {
        text.innerHTML = `<b style="color:#cc4444">You are not my king. Begone!</b><br><br>` +
          `The sword recognises only its true master. Only <b style="color:#ffd700">Arthur</b> may claim Excalibur.`;
      }
      text.style.cssText = "color:#ccccdd;font-family:monospace;font-size:12px;line-height:1.6;margin-bottom:16px;text-align:left;";
      card.appendChild(text);

      const btn = document.createElement("button");
      btn.textContent = "Dismiss";
      btn.style.cssText = "background:#8844cc;color:white;border:none;border-radius:6px;padding:8px 24px;font-family:monospace;font-size:13px;cursor:pointer;";
      btn.onmouseenter = () => { btn.style.background = "#aa66ee"; };
      btn.onmouseleave = () => { btn.style.background = "#8844cc"; };
      btn.onclick = () => {
        backdrop.remove();

        if (isArthur) {
          // Award Excalibur armory item
          player.armoryItems.push("excalibur");
          state.swordClaimed = true;
          worldMapRenderer.clearSword();
          worldEventLog.addEvent("Arthur has claimed Excalibur!", 0xffd700);
          worldNotification.show("Excalibur", "Arthur has reclaimed his legendary sword!", 0xffd700);
        }

        resolve();
      };
      card.appendChild(btn);

      backdrop.appendChild(card);
      document.body.appendChild(backdrop);
    });
  };

  // Resolve all pending battles — headless (for AI battles)
  const resolveWorldBattlesHeadless = () => {
    for (const battle of state.pendingBattles) {
      const attacker = state.armies.get(battle.attackerArmyId);
      const defender = battle.defenderArmyId ? state.armies.get(battle.defenderArmyId) : null;
      if (!attacker) continue;

      let battleState: GameState;
      if (battle.type === "siege" && battle.defenderCityId) {
        const city = state.cities.get(battle.defenderCityId);
        battleState = buildSiegeBattleState(attacker, defender ?? null, city!);
      } else {
        if (!defender) continue;
        battleState = buildFieldBattleState(attacker, defender);
      }

      const MAX_TICKS = 5000;
      for (let i = 0; i < MAX_TICKS; i++) {
        simTick(battleState);
        if (battleState.winnerId) break;
        // Early exit when all units are dead — no winner will emerge
        if (i > 0 && i % 50 === 0) {
          let anyAlive = false;
          for (const u of battleState.units.values()) {
            if (u.state !== UnitState.DIE && u.hp > 0) { anyAlive = true; break; }
          }
          if (!anyAlive) break;
        }
      }

      const defenderOwner = defender?.owner ?? attacker.owner;
      const result = extractBattleResults(battleState, attacker.owner, defenderOwner);
      applyBattleResults(state, battle, result);

      // Award Morgaine crystal to AI winners too
      if (result.winnerId) {
        const loserId = result.winnerId === attacker.owner ? defenderOwner : attacker.owner;
        if (loserId === "morgaine" && result.winnerId !== "morgaine") {
          const winnerPlayer = state.players.get(result.winnerId);
          if (winnerPlayer) {
            winnerPlayer.morgaineCrystals++;
          }
        }
        // Avalon victory for AI
        if (battle.type === "siege" && battle.defenderCityId) {
          const capturedCity = state.cities.get(battle.defenderCityId);
          if (capturedCity && capturedCity.owner === result.winnerId && defenderOwner === "morgaine" && capturedCity.isCapital) {
            state.winnerId = result.winnerId;
            state.phase = WorldPhase.GAME_OVER;
          }
        }
      }
    }

    onBattlesResolved(state);
  };

  // Resolve pending battles with visual viewer (for player battles)
  const resolveWorldBattlesVisual = async () => {
    for (const battle of state.pendingBattles) {
      const attacker = state.armies.get(battle.attackerArmyId);
      const defender = battle.defenderArmyId ? state.armies.get(battle.defenderArmyId) : null;
      if (!attacker) continue;

      const battleLabel = battle.type === "siege"
        ? `Siege at (${battle.hex.q},${battle.hex.r})`
        : `Battle at (${battle.hex.q},${battle.hex.r})`;
      worldEventLog.addEvent(`${battleLabel}: ${attacker.owner} vs ${defender?.owner ?? "garrison"}`, 0xff6644);

      let battleState: GameState;
      if (battle.type === "siege" && battle.defenderCityId) {
        const city = state.cities.get(battle.defenderCityId);
        battleState = buildSiegeBattleState(attacker, defender ?? null, city!);
      } else {
        if (!defender) continue;
        battleState = buildFieldBattleState(attacker, defender);
      }

      // Show visual battle if human player is involved
      const humanInvolved = attacker.owner === "p1" || (defender && defender.owner === "p1");
      if (humanInvolved) {
        await worldBattleViewer.startBattle(
          battleState,
          attacker.owner,
          defender?.owner ?? "garrison",
          true,
        );

        if (worldBattleViewer.playBattleRequested) {
          // Restore phase to PLAYER_TURN before saving — battle didn't end the turn
          state.phase = WorldPhase.PLAYER_TURN;
          saveWorldGame(state);
          const battleTile = state.grid.getTile(battle.hex.q, battle.hex.r);
          sessionStorage.setItem("worldBattleMeta", JSON.stringify({
            attackerArmyId: battle.attackerArmyId,
            defenderArmyId: battle.defenderArmyId,
            defenderCityId: battle.defenderCityId ?? null,
            battleType: battle.type,
            hex: { q: battle.hex.q, r: battle.hex.r },
            battleIndex: state.pendingBattles.indexOf(battle),
            terrain: battleTile?.terrain ?? "grassland",
          }));
          sessionStorage.setItem("worldBattlePlayMode", "1");
          window.location.reload();
          return;
        }
      } else {
        const MAX_TICKS = 5000;
        for (let i = 0; i < MAX_TICKS; i++) {
          simTick(battleState);
          if (battleState.winnerId) break;
          if (i > 0 && i % 50 === 0) {
            let anyAlive = false;
            for (const u of battleState.units.values()) {
              if (u.state !== UnitState.DIE && u.hp > 0) { anyAlive = true; break; }
            }
            if (!anyAlive) break;
          }
        }
      }

      const defenderOwner = defender?.owner ?? attacker.owner;
      const result = extractBattleResults(battleState, attacker.owner, defenderOwner);
      applyBattleResults(state, battle, result);

      if (result.winnerId) {
        const survivors = result.winnerId === attacker.owner ? result.attackerSurvivors : result.defenderSurvivors;
        const totalSurvivors = survivors.reduce((sum, u) => sum + u.count, 0);
        worldEventLog.addEvent(`${result.winnerId} won! ${totalSurvivors} units survived.`, 0x44ff44);

        // Award Morgaine crystal when defeating a Morgaine army
        const loserId = result.winnerId === attacker.owner ? defenderOwner : attacker.owner;
        if (loserId === "morgaine" && result.winnerId !== "morgaine") {
          const winnerPlayer = state.players.get(result.winnerId);
          if (winnerPlayer) {
            winnerPlayer.morgaineCrystals++;
            worldEventLog.addEvent(`${result.winnerId} found a Morgaine Crystal! (${winnerPlayer.morgaineCrystals}/3)`, 0xcc44ff);
            // Show Merlin dialog for human player
            if (result.winnerId === "p1") {
              await _showMerlinCrystalDialog(winnerPlayer.morgaineCrystals);
            }
          }
        }

        // Check for Avalon victory: if a player captured Morgaine's capital
        if (battle.type === "siege" && battle.defenderCityId) {
          const capturedCity = state.cities.get(battle.defenderCityId);
          if (capturedCity && capturedCity.owner === result.winnerId && defenderOwner === "morgaine" && capturedCity.isCapital) {
            // Capturing Avalon wins the game
            state.winnerId = result.winnerId;
            state.phase = WorldPhase.GAME_OVER;
          }
        }
      } else {
        worldEventLog.addEvent("Battle ended in a draw.", 0xaaaaaa);
      }
    }

    onBattlesResolved(state);
  };

  // Resolve a camp battle (army vs neutral camp)
  const _resolveCampBattle = async (army: import("@world/state/WorldArmy").WorldArmy, camp: import("@world/state/WorldCamp").WorldCamp, ws: WorldState) => {
    worldEventLog.addEvent(`Attacking ${camp.tier === 1 ? "weak" : camp.tier === 2 ? "moderate" : "strong"} camp!`, 0xff8844);

    const battleState = buildCampBattleState(army, camp);

    // Show visual battle for player armies
    if (army.owner === "p1") {
      await worldBattleViewer.startBattle(battleState, army.owner, "camp", true);

      if (worldBattleViewer.playBattleRequested) {
        saveWorldGame(ws);
        const campTile = ws.grid.getTile(camp.position.q, camp.position.r);
        sessionStorage.setItem("worldBattleMeta", JSON.stringify({
          campId: camp.id,
          armyId: army.id,
          battleType: "camp",
          hex: { q: camp.position.q, r: camp.position.r },
          terrain: campTile?.terrain ?? "grassland",
        }));
        sessionStorage.setItem("worldBattlePlayMode", "1");
        window.location.reload();
        return;
      }
    } else {
      const MAX_TICKS = 5000;
      for (let i = 0; i < MAX_TICKS; i++) {
        simTick(battleState);
        if (battleState.winnerId) break;
      }
    }

    const result = extractBattleResults(battleState, army.owner, "neutral");

    if (result.attackerSurvivors.length > 0) {
      army.units = result.attackerSurvivors;
    } else {
      const tile = ws.grid.getTile(army.position.q, army.position.r);
      if (tile && tile.armyId === army.id) tile.armyId = null;
      ws.armies.delete(army.id);
      worldEventLog.addEvent("Your army was destroyed!", 0xff4444);
      return;
    }

    if (result.winnerId === army.owner) {
      camp.cleared = true;
      const tile = ws.grid.getTile(camp.position.q, camp.position.r);
      if (tile) tile.campId = null;

      // Check if this was a fake sword trap — remove the visual
      const isFakeSword = ws.fakeSwordHexes.some(
        (h) => h.q === camp.position.q && h.r === camp.position.r,
      );
      if (isFakeSword) {
        worldMapRenderer.removeFakeSwordHex(camp.position);
        ws.fakeSwordHexes = ws.fakeSwordHexes.filter(
          (h) => h.q !== camp.position.q || h.r !== camp.position.r,
        );
        worldEventLog.addEvent("The sword was a trap! You defeated the guardians.", 0xff4488);
      }

      const player = ws.players.get(army.owner);
      if (player) {
        player.gold += camp.goldReward;
        if (!isFakeSword) {
          worldEventLog.addEvent(`Camp cleared! +${camp.goldReward} gold`, 0xffcc44);
        }

        // 50% chance to find an armory item (not from fake sword traps)
        if (!isFakeSword && Math.random() < 0.5) {
          const owned = new Set(player.armoryItems);
          const available = ARMORY_ITEMS.filter((i) => !owned.has(i.id));
          if (available.length > 0) {
            const drop = available[Math.floor(Math.random() * available.length)];
            player.armoryItems.push(drop.id);
            worldEventLog.addEvent(`Found item: ${drop.name}!`, 0xff88ff);
          }
        }
      }
    } else {
      if (ws.fakeSwordHexes.some(
        (h) => h.q === camp.position.q && h.r === camp.position.r,
      )) {
        worldEventLog.addEvent("The sword trap's guardians held!", 0xff6644);
      } else {
        worldEventLog.addEvent("Camp defenders held!", 0xff6644);
      }
    }
  };

  // Resolve a neutral building battle (army vs neutral building defenders)
  const _resolveNeutralBuildingBattle = async (army: import("@world/state/WorldArmy").WorldArmy, nb: import("@world/state/NeutralBuilding").NeutralBuilding, ws: WorldState) => {
    if (nb.captured) return;

    const NB_LABELS: Record<string, string> = { farm: "Farm", mill: "Mill", tower: "Tower", mage_tower: "Mage Tower", blacksmith: "Blacksmith", market: "Market", temple: "Temple", embassy: "Embassy", faction_hall: "Faction Hall", stables: "Stables", barracks: "Barracks", elite_barracks: "Elite Barracks", elite_stables: "Elite Stables", elite_hall: "Elite Hall" };
    const typeLabel = NB_LABELS[nb.type] ?? nb.type;
    worldEventLog.addEvent(`Attacking neutral ${typeLabel}!`, 0xff8844);

    // Build a fake camp to reuse buildCampBattleState
    const fakeCamp: import("@world/state/WorldCamp").WorldCamp = {
      id: nb.id,
      position: nb.position,
      tier: (["elite_barracks", "elite_stables", "elite_hall"].includes(nb.type) ? 3 : ["tower", "mage_tower", "market", "temple", "embassy", "faction_hall", "stables", "barracks"].includes(nb.type) ? 3 : ["blacksmith", "mill"].includes(nb.type) ? 2 : 1) as 1 | 2 | 3,
      defenders: [...nb.defenders],
      goldReward: 0,
      cleared: false,
    };

    const battleState = buildCampBattleState(army, fakeCamp);

    if (army.owner === "p1") {
      await worldBattleViewer.startBattle(battleState, army.owner, "camp", true);

      if (worldBattleViewer.playBattleRequested) {
        saveWorldGame(ws);
        const nbTile = ws.grid.getTile(nb.position.q, nb.position.r);
        sessionStorage.setItem("worldBattleMeta", JSON.stringify({
          neutralBuildingId: nb.id,
          armyId: army.id,
          battleType: "neutral_building",
          hex: { q: nb.position.q, r: nb.position.r },
          terrain: nbTile?.terrain ?? "grassland",
        }));
        sessionStorage.setItem("worldBattlePlayMode", "1");
        window.location.reload();
        return;
      }
    } else {
      const MAX_TICKS = 5000;
      for (let i = 0; i < MAX_TICKS; i++) {
        simTick(battleState);
        if (battleState.winnerId) break;
      }
    }

    const result = extractBattleResults(battleState, army.owner, "neutral");

    if (result.attackerSurvivors.length > 0) {
      army.units = result.attackerSurvivors;
    } else {
      const tile = ws.grid.getTile(army.position.q, army.position.r);
      if (tile && tile.armyId === army.id) tile.armyId = null;
      ws.armies.delete(army.id);
      worldEventLog.addEvent("Your army was destroyed!", 0xff4444);
      return;
    }

    if (result.winnerId === army.owner) {
      nb.captured = true;
      nb.owner = army.owner;
      nb.defenders = [];

      // Transfer tile ownership
      const tile = ws.grid.getTile(nb.position.q, nb.position.r);
      if (tile) tile.owner = army.owner;

      if (nb.type === "mage_tower" || nb.type === "temple") {
        worldEventLog.addEvent(`${typeLabel} captured! +${nb.manaIncome} mana/turn`, 0x8844ff);
      } else if (nb.type === "blacksmith" && !nb.armoryRewardClaimed) {
        nb.armoryRewardClaimed = true;
        const player = ws.players.get(army.owner);
        if (player) {
          const owned = new Set(player.armoryItems);
          const available = ARMORY_ITEMS.filter((i) => !owned.has(i.id));
          if (available.length > 0) {
            const drop = available[Math.floor(Math.random() * available.length)];
            player.armoryItems.push(drop.id);
            worldEventLog.addEvent(`${typeLabel} captured! Found: ${drop.name}! +${nb.goldIncome} gold/turn`, 0xff88ff);
          } else {
            worldEventLog.addEvent(`${typeLabel} captured! +${nb.goldIncome} gold/turn`, 0xffcc44);
          }
        }
      } else {
        worldEventLog.addEvent(`${typeLabel} captured! +${nb.goldIncome} gold/turn`, 0xffcc44);
      }
    } else {
      worldEventLog.addEvent(`${typeLabel} defenders held!`, 0xff6644);
    }
  };

  // End Turn button
  let _endTurnBusy = false;
  worldHUD.onEndTurn = async () => {
    if (state.phase !== WorldPhase.PLAYER_TURN) return;
    if (_endTurnBusy) return;
    _endTurnBusy = true;

    // Snapshot state for notification checks
    const p1 = state.players.get("p1")!;
    const prevResearch = p1.activeResearch;
    const prevMagicResearch = p1.activeMagicResearch ? { ...p1.activeMagicResearch } : null;
    const prevBuildings = new Map<string, number>();
    for (const city of state.cities.values()) {
      if (city.owner === "p1" && city.constructionQueue.length > 0) {
        prevBuildings.set(city.id, city.constructionQueue.length);
      }
    }

    const battles = detectCollisions(state);
    if (battles.length > 0) {
      state.pendingBattles = battles;
    }

    endTurn(state);

    if ((state.phase as WorldPhase) === WorldPhase.BATTLE) {
      await resolveWorldBattlesVisual();
    }

    // Safety limit: prevent infinite AI loop (e.g. from draw-retreat cycles)
    let aiTurnGuard = 0;
    while ((state.phase as WorldPhase) === WorldPhase.AI_TURN && aiTurnGuard < 50) {
      aiTurnGuard++;
      const aiPid = state.playerOrder[state.currentPlayerIndex];
      executeAITurn(state, aiPid);

      const aiBattles = detectCollisions(state);
      if (aiBattles.length > 0) {
        state.pendingBattles = aiBattles;
      }

      endTurn(state);

      if ((state.phase as WorldPhase) === WorldPhase.BATTLE) {
        // Use visual resolver if p1 is involved in any battle
        const humanInBattle = state.pendingBattles.some((b) => {
          const att = state.armies.get(b.attackerArmyId);
          const def = b.defenderArmyId ? state.armies.get(b.defenderArmyId) : null;
          return att?.owner === "p1" || def?.owner === "p1";
        });
        if (humanInBattle) {
          const savedIdx = state.currentPlayerIndex;
          await resolveWorldBattlesVisual();
          if ((state.phase as WorldPhase) !== WorldPhase.GAME_OVER) {
            state.currentPlayerIndex = savedIdx;
            state.phase = WorldPhase.AI_TURN;
          }
        } else {
          resolveWorldBattlesHeadless();
        }
      }
    }

    // Advance merchants along their routes
    for (const route of _merchantRoutes) {
      const merchant = state.armies.get(route.armyId);
      if (!merchant) continue;

      // Move up to 2 steps per turn
      for (let step = 0; step < 2; step++) {
        const nextIdx = route.pathIndex + route.direction;
        if (nextIdx < 0 || nextIdx >= route.path.length) {
          route.direction = (route.direction * -1) as 1 | -1;
          break;
        }
        route.pathIndex = nextIdx;
      }

      merchant.position = { ...route.path[route.pathIndex] };
    }

    // Random events at start of player turn
    if (state.phase === WorldPhase.PLAYER_TURN) {
      const events = rollRandomEvents(state, "p1");
      for (const evt of events) {
        worldEventLog.addEvent(`${evt.title}: ${evt.description}`, evt.color);
        worldNotification.show(evt.title, evt.description, evt.color);
      }
    }

    // Check for turn notifications
    if (state.phase === WorldPhase.PLAYER_TURN) {
      // Research completed
      if (prevResearch && !p1.activeResearch) {
        worldNotification.show("Research Complete", `${prevResearch} has been researched!`, 0x44aa44);
        worldEventLog.addEvent(`Research complete: ${prevResearch}`, 0x44aa44);
      }
      // Magic research completed
      if (prevMagicResearch && !p1.activeMagicResearch) {
        worldNotification.show("Magic Research Complete", `${prevMagicResearch.school} tier ${prevMagicResearch.tier} unlocked!`, 0x8888ff);
        worldEventLog.addEvent(`Magic research complete: ${prevMagicResearch.school} T${prevMagicResearch.tier}`, 0x8888ff);
      }
      // Building completed (queue shrunk = something finished)
      for (const [cityId, prevLen] of prevBuildings) {
        const city = state.cities.get(cityId);
        if (city && city.constructionQueue.length < prevLen) {
          const finished = city.buildings[city.buildings.length - 1];
          const name = finished ? finished.type : "building";
          worldNotification.show("Construction Complete", `${city.name}: ${name} finished!`, 0xffcc44);
          worldEventLog.addEvent(`${city.name} built ${name}`, 0xffcc44);
        }
      }
    }

    // Turn transition animation
    if (state.phase === WorldPhase.PLAYER_TURN) {
      await turnTransition.show(state.turn);
    }

    refreshWorld();
    if (cityPanel.isVisible) cityPanel.hide();
    if (armyPanel.isVisible) {
      armyPanel.hide();
      worldMapRenderer.clearHighlights();
    }
    _moveModeArmyId = null;
    _selectedArmyId = null;
    _selectedArmyReachable = new Set();
    _armyCycleIndex = 0;
    _endTurnBusy = false;
  };

  // Hex click handler
  worldMapRenderer.onHexClick = async (hex) => {
    const tile = state.grid.getTile(hex.q, hex.r);
    if (!tile) return;

    // Cheat: spawn army on click
    if (_cheatSpawnMode) {
      _cheatSpawnMode = false;
      const armyId = nextId(state, "army");
      const units: import("@world/state/WorldArmy").ArmyUnit[] = [
        { unitType: UnitType.ELITE_LANCER, count: 100, hpPerUnit: 180 },
      ];
      const army = createWorldArmy(armyId, "p1", { q: hex.q, r: hex.r }, units);
      state.armies.set(armyId, army);
      tile.armyId = armyId;
      refreshWorld();
      worldEventLog.addEvent(`Cheat: Spawned 100 Elite Lancers at ${hex.q},${hex.r}`, 0xff4444);
      return;
    }

    if (state.phase !== WorldPhase.PLAYER_TURN) return;
    const currentPid = state.playerOrder[state.currentPlayerIndex];

    if (_moveModeArmyId) {
      const army = state.armies.get(_moveModeArmyId);
      if (army) {
        // Block moving to Avalon without 3 crystals
        if (_isAvalonBlocked(hex, army.owner)) {
          if (army.owner === "p1") await _showAvalonBlockedDialog();
          _moveModeArmyId = null;
          worldMapRenderer.clearHighlights();
          armyPanel.hide();
          refreshWorld();
          return;
        }
        const oldQ = army.position.q;
        const oldR = army.position.r;
        const moved = moveArmy(army, hex, state);
        if (moved) {
          armyView.animateMove(army, oldQ, oldR);
          updateVisibility(state, army.owner);

          const destTile = state.grid.getTile(hex.q, hex.r);
          if (destTile?.campId) {
            const camp = state.camps.get(destTile.campId);
            if (camp && !camp.cleared) {
              await _resolveCampBattle(army, camp, state);
            }
          }

          // Check for neutral building battle
          if (destTile?.neutralBuildingId) {
            const nb = state.neutralBuildings.get(destTile.neutralBuildingId);
            if (nb && !nb.captured) {
              await _resolveNeutralBuildingBattle(army, nb, state);
            }
          }

          const battles = detectCollisions(state);
          if (battles.length > 0) {
            state.pendingBattles = battles;
            state.phase = WorldPhase.BATTLE;
            const savedIdx = state.currentPlayerIndex;
            await resolveWorldBattlesVisual();
            // Restore player turn — mid-turn battles shouldn't end the turn
            if ((state.phase as WorldPhase) !== WorldPhase.GAME_OVER) {
              state.currentPlayerIndex = savedIdx;
              state.phase = WorldPhase.PLAYER_TURN;
            }
          }

          await _checkMorgaineProximity(army);
          await _checkSwordProximity(army);
        }
      }
      _moveModeArmyId = null;
      _selectedArmyId = null;
      _selectedArmyReachable = new Set();
      worldMapRenderer.clearHighlights();
      armyPanel.hide();
      refreshWorld();
      return;
    }

    // Double-click detection
    const clickKey = hexKey(hex.q, hex.r);
    const now = performance.now();
    const isDoubleClick = clickKey === _lastClickHex && now - _lastClickTime < 300;
    _lastClickHex = clickKey;
    _lastClickTime = now;

    if (tile.cityId) {
      const city = state.cities.get(tile.cityId);
      if (city && city.owner === currentPid) {
        // Single click on city tile with army → select the army
        if (tile.armyId && !isDoubleClick) {
          const army = state.armies.get(tile.armyId);
          if (army && !army.isGarrison) {
            cityPanel.hide();
            armyPanel.show(army, state);
            const reachable = getArmyReachableHexes(army, state);
            worldMapRenderer.highlightHexes(reachable, 0x44ff44, 0.25);
            _selectedArmyId = army.id;
            _selectedArmyReachable = new Set(reachable.map((h) => hexKey(h.q, h.r)));
            return;
          }
        }
        // Double click on city+army tile, or single click on city-only tile → open city
        armyPanel.hide();
        _selectedArmyId = null;
        _selectedArmyReachable = new Set();
        worldMapRenderer.clearHighlights();
        cityPanel.show(city, state);
        return;
      }
    }

    if (tile.armyId) {
      const army = state.armies.get(tile.armyId);
      if (army && army.owner === currentPid && !army.isGarrison) {
        cityPanel.hide();
        armyPanel.show(army, state);
        const reachable = getArmyReachableHexes(army, state);
        worldMapRenderer.highlightHexes(reachable, 0x44ff44, 0.25);
        _selectedArmyId = army.id;
        _selectedArmyReachable = new Set(reachable.map((h) => hexKey(h.q, h.r)));
        return;
      }
    }

    // If an army is selected and clicked hex is reachable, move there
    if (_selectedArmyId) {
      const clickedKey = hexKey(hex.q, hex.r);
      if (_selectedArmyReachable.has(clickedKey)) {
        const army = state.armies.get(_selectedArmyId);
        if (army) {
          // Block moving to Avalon without 3 crystals
          if (_isAvalonBlocked(hex, army.owner)) {
            if (army.owner === "p1") await _showAvalonBlockedDialog();
            return;
          }
          const oldQ = army.position.q;
          const oldR = army.position.r;
          const moved = moveArmy(army, hex, state);
          if (moved) {
            armyView.animateMove(army, oldQ, oldR);
            updateVisibility(state, army.owner);

            const destTile = state.grid.getTile(hex.q, hex.r);
            if (destTile?.campId) {
              const camp = state.camps.get(destTile.campId);
              if (camp && !camp.cleared) {
                await _resolveCampBattle(army, camp, state);
              }
            }

            // Check for neutral building battle
            if (destTile?.neutralBuildingId) {
              const nb = state.neutralBuildings.get(destTile.neutralBuildingId);
              if (nb && !nb.captured) {
                await _resolveNeutralBuildingBattle(army, nb, state);
              }
            }

            const battles = detectCollisions(state);
            if (battles.length > 0) {
              state.pendingBattles = battles;
              state.phase = WorldPhase.BATTLE;
              const savedIdx = state.currentPlayerIndex;
              await resolveWorldBattlesVisual();
              // Restore player turn — mid-turn battles shouldn't end the turn
              if ((state.phase as WorldPhase) !== WorldPhase.GAME_OVER) {
                state.currentPlayerIndex = savedIdx;
                state.phase = WorldPhase.PLAYER_TURN;
              }
            }

            await _checkMorgaineProximity(army);
            await _checkSwordProximity(army);
          }
          _selectedArmyId = null;
          _selectedArmyReachable = new Set();
          worldMapRenderer.clearHighlights();
          armyPanel.hide();
          refreshWorld();
          return;
        }
      }
    }

    // Deselect
    _selectedArmyId = null;
    _selectedArmyReachable = new Set();
    if (cityPanel.isVisible) cityPanel.hide();
    if (armyPanel.isVisible) {
      armyPanel.hide();
      worldMapRenderer.clearHighlights();
    }
  };

  // Arrow key movement for selected army (WASD reserved for camera only)
  // Pointy-top hex directions: 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE
  const _arrowDirMap: Record<string, number> = {
    ArrowRight: 0,  // E
    ArrowLeft: 3,   // W
    ArrowUp: 2,     // NW (up-left)
    ArrowDown: 5,   // SE (down-right)
    KeyQ: 1,        // NE (up-right)
    KeyZ: 4,        // SW (down-left)
  };

  window.addEventListener("keydown", async (e) => {
    // Don't handle keys if a UI element is focused
    const tag = (document.activeElement?.tagName ?? "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "button") return;

    // Escape closes any open window
    if (e.code === "Escape") {
      if (researchScreen.isVisible) { researchScreen.hide(); return; }
      if (conjurePanel.isVisible) { conjurePanel.hide(); return; }
      if (worldScoreScreen.isVisible) { worldScoreScreen.hide(); return; }
      if (worldNationalScreen.isVisible) { worldNationalScreen.hide(); return; }
      if (worldArmyOverview.isVisible) { worldArmyOverview.hide(); return; }
      // worldBattleViewer is not dismissable (auto-closes after battle)
      if (leaderSelectScreen.container.visible) { leaderSelectScreen.hide(); return; }
      if (raceDetailScreen.container.visible) { raceDetailScreen.hide(); return; }
      if (magicScreen.container.visible) { magicScreen.hide(); return; }
      if (buildingWikiScreen.container.visible) { buildingWikiScreen.hide(); return; }
      if (advisorDialog.isVisible) { advisorDialog.hide(); return; }
      if (cityPreviewScreen.isVisible) { cityPreviewScreen.hide(); return; }
      if (worldWikiScreen.isVisible) { worldWikiScreen.hide(); return; }
      if (cityPanel.isVisible) { cityPanel.hide(); return; }
      if (armyPanel.isVisible) {
        armyPanel.hide();
        worldMapRenderer.clearHighlights();
        _selectedArmyId = null;
        _selectedArmyReachable = new Set();
        return;
      }
      return;
    }

    // E key ends turn (only when no overlays are open)
    if (e.code === "KeyE" && state.phase === WorldPhase.PLAYER_TURN
      && !researchScreen.isVisible && !conjurePanel.isVisible
      && !worldScoreScreen.isVisible && !worldNationalScreen.isVisible
      && !worldArmyOverview.isVisible && !worldBattleViewer.isVisible
      && !worldWikiScreen.isVisible
      && !leaderSelectScreen.container.visible
      && !raceDetailScreen.container.visible
      && !magicScreen.container.visible
      && !buildingWikiScreen.container.visible) {
      worldHUD.onEndTurn?.();
      return;
    }

    // Don't handle if a screen overlay is open
    if (researchScreen.isVisible || conjurePanel.isVisible
      || worldScoreScreen.isVisible || worldNationalScreen.isVisible
      || worldArmyOverview.isVisible || worldBattleViewer.isVisible
      || worldWikiScreen.isVisible) return;

    if (state.phase !== WorldPhase.PLAYER_TURN) return;

    // Tab cycles through armies with remaining MP
    if (e.code === "Tab") {
      e.preventDefault();
      const movableArmies: import("@world/state/WorldArmy").WorldArmy[] = [];
      for (const army of state.armies.values()) {
        if (army.owner === "p1" && !army.isGarrison && army.movementPoints > 0) {
          movableArmies.push(army);
        }
      }
      if (movableArmies.length > 0) {
        _armyCycleIndex = _armyCycleIndex % movableArmies.length;
        const army = movableArmies[_armyCycleIndex];
        _armyCycleIndex = (_armyCycleIndex + 1) % movableArmies.length;
        _selectedArmyId = army.id;
        const reachable = getArmyReachableHexes(army, state);
        _selectedArmyReachable = new Set(reachable.map(h => `${h.q},${h.r}`));
        worldMapRenderer.highlightHexes(reachable, 0x44ff44, 0.25);
        armyPanel.show(army, state);
        if (cityPanel.isVisible) cityPanel.hide();
      }
      return;
    }

    const dir = _arrowDirMap[e.code];
    if (dir === undefined) return;

    e.preventDefault();

    const currentPid = state.playerOrder[state.currentPlayerIndex];

    // If an army is selected, move it in that direction
    if (_selectedArmyId) {
      const army = state.armies.get(_selectedArmyId);
      if (!army || army.movementPoints <= 0) return;

      const target = hexNeighbor(army.position, dir);
      const targetKey = hexKey(target.q, target.r);
      if (!_selectedArmyReachable.has(targetKey)) return;

      // Block moving to Avalon without 3 crystals
      if (_isAvalonBlocked(target, army.owner)) {
        if (army.owner === "p1") await _showAvalonBlockedDialog();
        return;
      }

      const oldQ = army.position.q;
      const oldR = army.position.r;
      const moved = moveArmy(army, target, state);
      if (moved) {
        armyView.animateMove(army, oldQ, oldR);
        updateVisibility(state, army.owner);

        const destTile = state.grid.getTile(target.q, target.r);
        if (destTile?.campId) {
          const camp = state.camps.get(destTile.campId);
          if (camp && !camp.cleared) {
            await _resolveCampBattle(army, camp, state);
          }
        }

        // Check for neutral building battle
        if (destTile?.neutralBuildingId) {
          const nb = state.neutralBuildings.get(destTile.neutralBuildingId);
          if (nb && !nb.captured) {
            await _resolveNeutralBuildingBattle(army, nb, state);
          }
        }

        const battles = detectCollisions(state);
        if (battles.length > 0) {
          state.pendingBattles = battles;
          state.phase = WorldPhase.BATTLE;
          const savedIdx = state.currentPlayerIndex;
          await resolveWorldBattlesVisual();
          // Restore player turn — mid-turn battles shouldn't end the turn
          if ((state.phase as WorldPhase) !== WorldPhase.GAME_OVER) {
            state.currentPlayerIndex = savedIdx;
            state.phase = WorldPhase.PLAYER_TURN;
          }
        }

        await _checkMorgaineProximity(army);
        await _checkSwordProximity(army);

        // Re-select army if it still has movement points
        if (army.movementPoints > 0 && state.phase === WorldPhase.PLAYER_TURN) {
          armyPanel.show(army, state);
          const reachable = getArmyReachableHexes(army, state);
          worldMapRenderer.highlightHexes(reachable, 0x44ff44, 0.25);
          _selectedArmyReachable = new Set(reachable.map((h) => hexKey(h.q, h.r)));
        } else {
          _selectedArmyId = null;
          _selectedArmyReachable = new Set();
          worldMapRenderer.clearHighlights();
          armyPanel.hide();
        }
        refreshWorld();
      }
      return;
    }

    // No army selected — find own army nearest to center of screen and select it
    // (This lets arrow keys pick an army to start moving)
    let bestArmy: WorldArmy | null = null;
    for (const army of state.armies.values()) {
      if (army.owner !== currentPid || army.isGarrison) continue;
      if (army.movementPoints <= 0) continue;
      if (!bestArmy) { bestArmy = army; continue; }
      // Just pick the first one with movement
      bestArmy = army;
      break;
    }
    if (bestArmy) {
      armyPanel.show(bestArmy, state);
      const reachable = getArmyReachableHexes(bestArmy, state);
      worldMapRenderer.highlightHexes(reachable, 0x44ff44, 0.25);
      _selectedArmyId = bestArmy.id;
      _selectedArmyReachable = new Set(reachable.map((h) => hexKey(h.q, h.r)));
    }
  });

  // Initialize fog of war for all players
  for (const pid of state.playerOrder) {
    updateVisibility(state, pid);
  }

  // Start first turn (skip on load — state is already mid-turn)
  if (!skipBeginTurn) {
    beginTurn(state);
  }
  refreshWorld();
}

// ---------------------------------------------------------------------------
// Standard mode boot
// ---------------------------------------------------------------------------

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

  const aiStartGold = Math.floor(startGold * getDifficultySettings().aiStartGoldMultiplier);

  if (effectivePlayerCount <= 2) {
    // Classic 2-player layout
    state.players.set("p1", createPlayerState("p1", Direction.WEST, startGold, "nw", false));
    state.players.set("p2", createPlayerState("p2", Direction.EAST, p2IsAI ? aiStartGold : startGold, "se", p2IsAI));
    const basePos = _computeBasePositions(mapSize.width, mapSize.height);
    initBases(state, { westPlayerId: "p1", eastPlayerId: "p2", ...basePos });
  } else {
    // Multi-player layout (3-4 players at corners)
    state.players.set("p1", createPlayerState("p1", Direction.EAST, startGold, "nw", false));
    state.players.set("p2", createPlayerState("p2", Direction.WEST, aiStartGold, "se", true));
    if (effectivePlayerCount >= 3) {
      state.players.set("p3", createPlayerState("p3", Direction.WEST, aiStartGold, "ne", true));
    }
    if (effectivePlayerCount >= 4) {
      state.players.set("p4", createPlayerState("p4", Direction.EAST, aiStartGold, "sw", true));
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
    if (_worldBattleRosters) {
      const midY = Math.floor(mapSize.height / 2);
      _spawnRoster(state, _worldBattleRosters.p1Roster, "p1", Math.floor(mapSize.width * 0.2), midY, mapSize.height);
      _spawnRoster(state, _worldBattleRosters.p2Roster, "p2", Math.floor(mapSize.width * 0.8), midY, mapSize.height);
    } else if (gameMode === GameMode.CAMPAIGN) {
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
  spellFX.init(viewManager);

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
  // Set wave number so the victory screen shows wave info and next-wave button
  if (_waveState) {
    victoryScreen.waveNumber = _waveState.wave;
  } else {
    victoryScreen.waveNumber = 0;
  }
  victoryScreen.init(viewManager, state);

  // Battle stats
  battleStatsTracker.reset();
  battleStatsTracker.init(state);
  battleStatsScreen.init(viewManager, state);

  // Wave mode: "NEXT WAVE" button handler
  if (_waveState) {
    const ws = _waveState;
    victoryScreen.onNextWave = () => {
      ws.wave++;
      const nextGold = 1000;

      // Merlin compliment every 10 waves
      const complimentWave = ws.wave - 1; // just won this wave
      if (complimentWave % 10 === 0 && complimentWave > 0) {
        const msg = MERLIN_COMPLIMENTS[complimentWave] ?? MERLIN_COMPLIMENT_DEFAULT;
        // Show a brief Merlin overlay then proceed to shop
        _showMerlinWaveCompliment(msg, () => {
          _startNextWaveShop(ws, nextGold);
        });
      } else {
        _startNextWaveShop(ws, nextGold);
      }
    };
  }

  // World battle play mode: intercept RESOLVE to return to world mode
  if (_worldBattleRosters && !_worldBattleRosters.battleMeta?.waveMode) {
    const rosters = _worldBattleRosters;
    _worldBattleRosters = null;

    EventBus.on("phaseChanged", ({ phase }) => {
      if (phase !== GamePhase.RESOLVE) return;

      // Hide the default victory screen
      victoryScreen.container.visible = false;

      // Count survivors
      const p1Survivors: Array<{ unitType: string; count: number; hpPerUnit: number }> = [];
      const p2Survivors: Array<{ unitType: string; count: number; hpPerUnit: number }> = [];
      for (const pid of ["p1", "p2"]) {
        const counts = new Map<string, { count: number; totalHp: number }>();
        for (const unit of state.units.values()) {
          if (unit.owner !== pid) continue;
          if (unit.state === UnitState.DIE || unit.hp <= 0) continue;
          const entry = counts.get(unit.type) ?? { count: 0, totalHp: 0 };
          entry.count++;
          entry.totalHp += unit.hp;
          counts.set(unit.type, entry);
        }
        const list = pid === "p1" ? p1Survivors : p2Survivors;
        for (const [unitType, data] of counts) {
          list.push({ unitType, count: data.count, hpPerUnit: Math.ceil(data.totalHp / data.count) });
        }
      }

      // Map back to attacker/defender
      const resultData = {
        winnerId: state.winnerId,
        attackerSurvivors: rosters.playerIsAttacker ? p1Survivors : p2Survivors,
        defenderSurvivors: rosters.playerIsAttacker ? p2Survivors : p1Survivors,
        battleMeta: rosters.battleMeta,
        playerIsAttacker: rosters.playerIsAttacker,
      };

      sessionStorage.setItem("worldBattleResult", JSON.stringify(resultData));
      sessionStorage.setItem("worldBattleReturn", "1");

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    });
  } else if (_worldBattleRosters?.battleMeta?.waveMode) {
    // Wave mode: clear the rosters flag (handled by victoryScreen.onNextWave)
    _worldBattleRosters = null;
  }

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
