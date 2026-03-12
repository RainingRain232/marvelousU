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
import { unitShopScreen, getAllShopUnits } from "@view/ui/UnitShopScreen";
import type { UnitRoster } from "@view/ui/UnitShopScreen";
import { campaignVictoryScreen } from "@view/ui/CampaignVictoryScreen";
import { hoverTooltip } from "@view/ui/HoverTooltip";
import { buildingWikiScreen } from "@view/ui/BuildingWikiScreen";
import { mainMenuWikiScreen } from "@view/ui/MainMenuWikiScreen";
import { minimap } from "@view/ui/Minimap";
import { lobbyScreen } from "@view/ui/LobbyScreen";
import { RoomManager } from "@net/RoomManager";
import { campaignState } from "@sim/config/CampaignState";
import { getScenario, SCENARIO_DEFINITIONS } from "@sim/config/CampaignDefs";
import { Assets, Container, Graphics, Sprite, Text, Texture, TextStyle } from "pixi.js";
import { createGameState } from "@sim/state/GameState";
import type { GameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { initBases, initBasesMulti } from "@sim/systems/BaseSetup";
import type { PlayerBaseConfig } from "@sim/systems/BaseSetup";
import { setAlliance } from "@sim/state/GameState";
import { BalanceConfig, CombatOptions } from "@sim/config/BalanceConfig";
import { blockFX } from "@view/fx/BlockFX";
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
  NEUTRAL_PLAYER,
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
import { UpgradeSystem } from "@sim/systems/UpgradeSystem";
import { BUILDING_MIN_GAP } from "@sim/systems/BuildingSystem";
import { LEADER_DEFINITIONS, getLeader } from "@sim/config/LeaderDefs";
import type { LeaderId, LeaderBonus } from "@sim/config/LeaderDefs";
import { getRace, filterInventoryByRace, RACE_DEFINITIONS } from "@sim/config/RaceDefs";
import type { RaceId } from "@sim/config/RaceDefs";
import { ARMORY_ITEMS } from "@sim/config/ArmoryItemDefs";
import type { ArmoryItemId } from "@sim/config/ArmoryItemDefs";

import {
  createGrailCorruptionState,
  selectModifier,
  applyCorruptionModifiers,
  tickCorruptionModifiers,
  onCorruptionUnitDied,
  type GrailCorruptionState,
  ALL_CORRUPTION_MODIFIERS,
} from "@sim/systems/GrailCorruptionSystem";

/** First 2 armory items unlocked at world game start. More drop from camps. */
const WORLD_STARTING_ITEMS: ArmoryItemId[] = ARMORY_ITEMS.slice(0, 2).map((i) => i.id);

// RPG mode imports
import { RPGGame } from "@rpg/RPGBoot";

// Survivor mode imports
import { SurvivorGame } from "@/survivor/SurvivorGame";
import { ColosseumGame } from "@rpg/colosseum/ColosseumGame";
import { DuelGame } from "./duel/DuelGame";
import { MedievalGTA } from "./medievalgta/MedievalGTA";
import { WarbandGame } from "./warband/WarbandGame";
import { TekkenGame } from "./tekken/TekkenGame";
import { DragoonGame } from "./dragoon/DragoonGame";
import { camelotHubScreen } from "@view/ui/CamelotHubScreen";

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
import { worldIntroDialog, AVALON_PROXIMITY_PAGE, MORGAINE_PROXIMITY_PAGE } from "@view/world/ui/WorldIntroDialog";
import { turnTransition } from "@view/world/ui/TurnTransition";
import { saveWorldGame, loadWorldGame } from "@world/state/WorldSerialization";
import { setCityNameIndex } from "@world/state/WorldCity";
import { worldBattleViewer } from "@view/world/ui/WorldBattleViewer";
import { rollRandomEvents } from "@world/systems/WorldRandomEvents";
import {
  createLeaderEncounterState,
  placeLeaderEncounter,
  checkLeaderEncounter,
  completeLeaderEncounter,
  type LeaderEncounterState,
} from "@world/systems/LeaderEncounters";
import { applyInitialAffinities, processAIDiplomacy } from "@world/systems/LeaderDiplomacy";
import { lastMorgaineEvents } from "@world/systems/TurnSystem";
import {
  createGrailQuestState,
  trySpawnGrailChapel,
  checkGrailProximity,
  applyGrailReward,
  isGrailKnight,
  type GrailChoice,
} from "@world/systems/GrailQuest";
import {
  createCamlannState,
  processCamlann,
  isCamlannBattle,
} from "@world/systems/CamlannEvent";
import { getNeutralCityGarrison, pickNeutralRace, neutralRng, getUnitsForRace } from "@world/systems/NeutralCitySystem";
import { worldNotification } from "@view/world/ui/WorldNotification";
import { worldWikiScreen } from "@view/world/ui/WorldWikiScreen";
import { merlinMagicScreen } from "@view/world/ui/MerlinMagicScreen";
import { castSpell } from "@world/systems/OverlandSpellSystem";
import type { OverlandSpellId } from "@world/config/OverlandSpellDefs";
import merlinImgUrl from "@/img/merlin.png";
import { showLeaderIntroduction, LEADER_IMAGES } from "@view/world/ui/LeaderIntroDialog";

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

  // Camelot hub map screen (replaces menu as the primary mode select)
  camelotHubScreen.init(viewManager);
  camelotHubScreen.hide();

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
      camelotHubScreen.show();
    };
    introPlayer.play();
  };

  // Hub screen: clicking a building selects that game mode
  const HUB_MODE_INDEX: Record<string, number> = {
    [GameMode.CAMPAIGN]: 0, [GameMode.STANDARD]: 1, [GameMode.DEATHMATCH]: 2,
    [GameMode.BATTLEFIELD]: 3, [GameMode.ROGUELIKE]: 4, [GameMode.WORLD]: 5,
    [GameMode.WAVE]: 6, [GameMode.RPG]: 7, [GameMode.SURVIVOR]: 8,
    [GameMode.COLOSSEUM]: 9, [GameMode.DUEL]: 10, [GameMode.MEDIEVAL_GTA]: 11,
    [GameMode.TEKKEN]: 13,
    [GameMode.DRAGOON]: 14,
  };
  // Modes that need the setup screen (not skipSetup)
  const NEEDS_SETUP = new Set([GameMode.STANDARD, GameMode.DEATHMATCH, GameMode.BATTLEFIELD, GameMode.ROGUELIKE, GameMode.WAVE]);

  camelotHubScreen.onSelectMode = (mode) => {
    camelotHubScreen.hide();
    const idx = HUB_MODE_INDEX[mode];
    if (idx !== undefined) {
      (menuScreen as any)._selectedModeIndex = idx;
    }
    if (NEEDS_SETUP.has(mode)) {
      // Show menu on the setup screen (screen 2)
      menuScreen.show();
      (menuScreen as any)._showScreen2();
    } else {
      menuScreen.onContinue?.();
    }
  };

  // Hub screen: compass opens the classic menu
  camelotHubScreen.onOpenMenu = () => {
    camelotHubScreen.hide();
    menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
  };

  // Menu screen: back to map returns to the hub
  menuScreen.onBackToMap = () => {
    menuScreen.hide();
    camelotHubScreen.show();
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
    if (menuScreen.selectedGameMode === GameMode.SURVIVOR) {
      menuScreen.hide();
      _bootSurvivorGame();
      return;
    }
    if (menuScreen.selectedGameMode === GameMode.COLOSSEUM) {
      menuScreen.hide();
      _bootColosseumGame();
      return;
    }
    if (menuScreen.selectedGameMode === GameMode.MEDIEVAL_GTA) {
      menuScreen.hide();
      _bootMedievalGTA();
      return;
    }
    if (menuScreen.selectedGameMode === GameMode.DUEL) {
      menuScreen.hide();
      _bootDuelGame();
      return;
    }
    if (menuScreen.selectedGameMode === GameMode.WARBAND) {
      menuScreen.hide();
      _bootWarbandGame();
      return;
    }
    if (menuScreen.selectedGameMode === GameMode.TEKKEN) {
      menuScreen.hide();
      _bootTekkenGame();
      return;
    }
    if (menuScreen.selectedGameMode === GameMode.DRAGOON) {
      menuScreen.hide();
      _bootDragoonGame();
      return;
    }
    if (menuScreen.selectedGameMode === GameMode.WORLD) {
      menuScreen.hide();
      // World mode: Leader → Race → RaceDetail → Magic → Armory → WorldSetup → boot
      leaderSelectScreen.onBack = () => {
        leaderSelectScreen.hide();
        menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
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

  // ---------------------------------------------------------------------------
  // Wiki screen (units, spells, buildings, lore)
  // ---------------------------------------------------------------------------
  buildingWikiScreen.init(viewManager);
  buildingWikiScreen.hide();

  mainMenuWikiScreen.init(viewManager);
  mainMenuWikiScreen.hide();

  mainMenuWikiScreen.onBack = () => {
    mainMenuWikiScreen.hide();
    menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
  };

  mainMenuWikiScreen.onOpenUnits = () => {
    raceDetailScreen.onBack = () => {
      raceDetailScreen.hide();
      mainMenuWikiScreen.show();
    };
    raceDetailScreen.showWiki();
  };

  mainMenuWikiScreen.onOpenSpells = () => {
    magicScreen.onBack = () => {
      magicScreen.hide();
      mainMenuWikiScreen.show();
    };
    magicScreen.showWiki();
  };

  mainMenuWikiScreen.onOpenBuildings = () => {
    buildingWikiScreen.onBack = () => {
      buildingWikiScreen.hide();
      mainMenuWikiScreen.show();
    };
    buildingWikiScreen.show();
  };

  menuScreen.onWiki = () => {
    menuScreen.hide();
    mainMenuWikiScreen.show();
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

  menuScreen.onLoadWaveGame = () => {
    const ws = _loadWaveGame();
    if (!ws) return;
    menuScreen.hide();
    _waveState = ws;
    const extraGold = 1000 + (ws.leftoverGold ?? 0);
    _startNextWaveShop(ws, extraGold);
  };

  menuScreen.onSettings = () => {
    menuScreen.hide();
    settingsScreen.onBack = () => {
      settingsScreen.hide();
      menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
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
      menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
      return;
    }

    const serverUrl = window.prompt(
      "Server address:",
      `ws://${window.location.hostname}:3001`,
    );

    if (!serverUrl) {
      menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
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
      menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
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
    blockFX.init(viewManager, state);
    viewManager.onUpdate((_s, dt) => blockFX.update(dt));
    CombatOptions.critEnabled = settingsScreen.critEnabled;
    CombatOptions.blockEnabled = settingsScreen.blockEnabled;
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
    menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
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
      // Battlefield: P1 shop → P2 leader/race/magic → P2 shop → battle
      const bfGold = menuScreen.battlefieldGold;
      unitShopScreen.onDone = (playerRoster) => {
        unitShopScreen.hide();

        // --- P2 setup: Leader → Race → RaceDetail → Magic → Shop ---
        // Save+restore P1 callbacks so screens can be reused for P2
        const origLeaderOnNext = leaderSelectScreen.onNext;
        const origRaceOnBack = raceSelectScreen.onBack;
        const origRaceOnNext = raceSelectScreen.onNext;
        const origRaceDetailOnNext = raceDetailScreen.onNext;
        const origMagicOnNext = magicScreen.onNext;
        const origMagicOnBack = magicScreen.onBack;
        const origArmoryOnBack = armoryScreen.onBack;

        const restoreCallbacks = () => {
          leaderSelectScreen.onNext = origLeaderOnNext;
          raceSelectScreen.onBack = origRaceOnBack;
          raceSelectScreen.onNext = origRaceOnNext;
          raceDetailScreen.onNext = origRaceDetailOnNext;
          magicScreen.onNext = origMagicOnNext;
          magicScreen.onBack = origMagicOnBack;
          armoryScreen.onBack = origArmoryOnBack;
        };

        // P2 Leader select
        leaderSelectScreen.onNext = () => {
          leaderSelectScreen.hide();
          raceSelectScreen.show("P2 — SELECT RACE");
        };

        raceSelectScreen.onBack = () => {
          raceSelectScreen.hide();
          leaderSelectScreen.show("P2 — CHOOSE LEADER");
        };

        raceSelectScreen.onNext = () => {
          raceSelectScreen.hide();
          raceDetailScreen.onBack = () => {
            raceDetailScreen.hide();
            raceSelectScreen.show();
          };
          raceDetailScreen.show(raceSelectScreen.selectedRaceId);
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
          magicScreen.show(raceSelectScreen.selectedRaceId);
        };

        magicScreen.onNext = () => {
          magicScreen.hide();
          const p2LeaderId = leaderSelectScreen.selectedLeaderId;
          const p2RaceId = raceSelectScreen.selectedRaceId;

          // Restore original callbacks before proceeding
          restoreCallbacks();

          // P2 unit shop
          unitShopScreen.onDone = async (p2Roster) => {
            unitShopScreen.hide();
            _worldBattleRosters = {
              p1Roster: playerRoster,
              p2Roster: p2Roster,
              battleMeta: { menuBattlefield: true },
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
              p2LeaderId,
              p2RaceId,
            );
          };
          unitShopScreen.setSurvivingUnits([]);
          unitShopScreen.show(p2RaceId, bfGold, "PLAYER 2 ARMY");
        };

        leaderSelectScreen.show("P2 — CHOOSE LEADER");
      };
      unitShopScreen.setSurvivingUnits([]);
      unitShopScreen.show(raceId, bfGold, "PLAYER 1 ARMY");
    } else if (gameMode === GameMode.WAVE) {
      // Wave mode: player unit shop → battle vs random wave
      const corruption = createGrailCorruptionState();
      corruption.enabled = menuScreen.grailGreedEnabled;
      _waveState = {
        wave: 1,
        playerRaceId: raceId,
        playerLeaderId: leaderId,
        totalGoldSpent: 0,
        mapSize,
        mapType,
        corruption,
        survivingUnits: [],
        leftoverGold: 0,
        totalEnemyGold: 0,
        lastEnemyGold: 0,
        randomEvents: menuScreen.randomEventsEnabled,
        pendingEvent: null,
        bonusGold: 0,
        scalingDifficulty: menuScreen.scalingDifficultyEnabled,
        bossWaves: menuScreen.bossWavesEnabled,
        mercenaries: _generateMercenaries(raceId, 1),
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
        _waveState!.leftoverGold = 2000 - spent;
        _waveLastRoundGold = spent;

        // Check for new corruption modifier
        if (_waveState!.corruption.enabled) {
          const newMod = selectModifier(_waveState!.corruption, _waveState!.wave);
          if (newMod) {
            EventBus.emit("corruptionModifierActivated", {
              modifierName: newMod.name,
              description: newMod.description,
              corruptionLevel: _waveState!.corruption.corruptionLevel,
            });
          }
        }

        // Generate enemy wave
        const multiplier = _getWaveDifficultyMultiplier(_waveState!.wave, _waveState!.scalingDifficulty);
        const enemyBudget = _waveState!.wave === 1
          ? 2000
          : Math.round(_waveState!.totalGoldSpent * multiplier);
        _waveState!.lastEnemyGold = enemyBudget;
        _waveState!.totalEnemyGold += enemyBudget;
        const isBossWave = _waveState!.bossWaves && _waveState!.wave % 5 === 0;
        const enemyRoster = isBossWave
          ? _generateBossWaveRoster(raceId, Math.round(enemyBudget * 1.25), _waveState!.wave)
          : _generateWaveEnemyRoster(raceId, enemyBudget, _waveState!.wave);

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
      const corruptionLabel = corruption.enabled ? " [GRAIL GREED]" : "";
      unitShopScreen.setCorruptionModifiers(corruption.activeModifiers);
      unitShopScreen.setSurvivingUnits([]);
      unitShopScreen.setWaveHint(_generateWaveHint(raceId, 1));
      unitShopScreen.setMercenaries(_waveState!.mercenaries);
      unitShopScreen.onSave = () => { _saveWaveGame(); };
      unitShopScreen.onLoad = () => {
        const ws = _loadWaveGame();
        if (!ws) return;
        _waveState = ws;
        unitShopScreen.hide();
        const extraGold = 1000 + (ws.leftoverGold ?? 0);
        _startNextWaveShop(ws, extraGold);
      };
      unitShopScreen.onBackToMenu = () => {
        unitShopScreen.hide();
        _waveState = null;
        menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
      };
      const showWaveShop = () => {
        unitShopScreen.show(raceId, 2000, `WAVE 1${corruptionLabel} — RECRUIT ARMY`);
      };
      if (menuScreen.waveIntroEnabled) {
        _showWaveIntro(leaderId, showWaveShop);
      } else {
        showWaveShop();
      }
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
  } else if (scenarioNum === 4) {
    // The Art of War — ability tutorial battlefield
    // Custom placement: cyclops center, clerics around it, lancers far, mages mid, siege demo
    const cx = Math.floor(mapW / 2);
    const cy = midY;

    // --- P2: Cyclops in the dead center ---
    const cyclops = createUnit({ type: UnitType.CYCLOPS, owner: "p2", position: { x: cx, y: cy } });
    state.units.set(cyclops.id, cyclops);

    // --- P1: Clerics surrounding the cyclops (ring of 8) ---
    const clericOffsets = [
      { x: -2, y: -2 }, { x: 0, y: -2 }, { x: 2, y: -2 },
      { x: -2, y: 0 },                    { x: 2, y: 0 },
      { x: -2, y: 2 }, { x: 0, y: 2 }, { x: 2, y: 2 },
    ];
    for (const off of clericOffsets) {
      const u = createUnit({
        type: UnitType.CLERIC, owner: "p1",
        position: { x: cx + off.x, y: cy + off.y },
      });
      state.units.set(u.id, u);
    }

    // --- P1: Lancers charging from far left (20 lancers) ---
    const lancerBaseX = Math.floor(mapW * 0.05);
    for (let i = 0; i < 20; i++) {
      const col = Math.floor(i / 5);
      const row = i % 5;
      const u = createUnit({
        type: UnitType.LANCER, owner: "p1",
        position: { x: lancerBaseX + col, y: cy - 2 + row },
      });
      state.units.set(u.id, u);
    }

    // --- P1: Master mages at medium range (2 of each element) ---
    const mageTypes = [
      UnitType.FIRE_MASTER_MAGE, UnitType.FIRE_MASTER_MAGE,
      UnitType.LIGHTNING_MASTER_MAGE, UnitType.LIGHTNING_MASTER_MAGE,
      UnitType.COLD_MASTER_MAGE, UnitType.COLD_MASTER_MAGE,
    ];
    const mageBaseX = Math.floor(mapW * 0.25);
    for (let i = 0; i < mageTypes.length; i++) {
      const u = createUnit({
        type: mageTypes[i], owner: "p1",
        position: { x: mageBaseX, y: cy - 3 + i },
      });
      state.units.set(u.id, u);
    }

    // --- P2: Battering ram (siege-only, attacks buildings) on the right ---
    const ram = createUnit({
      type: UnitType.BATTERING_RAM, owner: "p2",
      position: { x: Math.floor(mapW * 0.8), y: cy + 5 },
    });
    state.units.set(ram.id, ram);

    // --- P1: Siege hunter to hunt the battering ram ---
    const hunter = createUnit({
      type: UnitType.SIEGE_HUNTER, owner: "p1",
      position: { x: Math.floor(mapW * 0.6), y: cy + 5 },
    });
    state.units.set(hunter.id, hunter);

    // --- P1: Trebuchet for long-range siege demonstration ---
    const treb = createUnit({
      type: UnitType.TREBUCHET, owner: "p1",
      position: { x: Math.floor(mapW * 0.15), y: cy + 6 },
    });
    state.units.set(treb.id, treb);

    return; // skip generic roster spawning
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
 * Scenario 23 — "The Dark Savant"
 * P1 gets a single Dark Savant in the top-left corner.
 * P2 gets spread-out enemy patrols and a few towers across the map.
 * Both sides have castles, but P1 cannot build (handled by p1NoBuild).
 */
function _setupScenario23(state: GameState, mapW: number, mapH: number): void {
  // --- P1: Dark Savant in the top-left corner ---
  const savant = createUnit({
    type: UnitType.DARK_SAVANT,
    owner: "p1",
    position: { x: 3, y: 3 },
  });
  state.units.set(savant.id, savant);

  // --- P2: Spread-out enemy patrols ---
  const enemyGroups: Array<{ type: UnitType; x: number; y: number; count: number }> = [
    // Mid-left patrol
    { type: UnitType.SWORDSMAN, x: Math.floor(mapW * 0.3), y: Math.floor(mapH * 0.3), count: 3 },
    { type: UnitType.ARCHER, x: Math.floor(mapW * 0.3), y: Math.floor(mapH * 0.35), count: 2 },
    // Centre patrol
    { type: UnitType.PIKEMAN, x: Math.floor(mapW * 0.5), y: Math.floor(mapH * 0.5), count: 4 },
    { type: UnitType.LONGBOWMAN, x: Math.floor(mapW * 0.5), y: Math.floor(mapH * 0.55), count: 2 },
    // Upper-right patrol
    { type: UnitType.KNIGHT, x: Math.floor(mapW * 0.7), y: Math.floor(mapH * 0.25), count: 2 },
    { type: UnitType.SWORDSMAN, x: Math.floor(mapW * 0.7), y: Math.floor(mapH * 0.3), count: 3 },
    // Lower-centre patrol
    { type: UnitType.DEFENDER, x: Math.floor(mapW * 0.4), y: Math.floor(mapH * 0.75), count: 3 },
    { type: UnitType.CROSSBOWMAN, x: Math.floor(mapW * 0.45), y: Math.floor(mapH * 0.75), count: 2 },
    // Near enemy castle guard
    { type: UnitType.HALBERDIER, x: Math.floor(mapW * 0.85), y: Math.floor(mapH * 0.5), count: 3 },
  ];

  for (const group of enemyGroups) {
    for (let i = 0; i < group.count; i++) {
      const u = createUnit({
        type: group.type,
        owner: "p2",
        position: { x: group.x + (i % 3), y: group.y + Math.floor(i / 3) },
      });
      state.units.set(u.id, u);
    }
  }

  // --- P2: Enemy towers spread across the map ---
  const towerPositions = [
    { x: Math.floor(mapW * 0.35), y: Math.floor(mapH * 0.2) },
    { x: Math.floor(mapW * 0.55), y: Math.floor(mapH * 0.4) },
    { x: Math.floor(mapW * 0.4), y: Math.floor(mapH * 0.65) },
  ];

  const towerDef = BUILDING_DEFINITIONS[BuildingType.TOWER];
  for (let i = 0; i < towerPositions.length; i++) {
    const pos = towerPositions[i];
    // Bounds check
    if (pos.x + towerDef.footprint.w >= mapW || pos.y + towerDef.footprint.h >= mapH) continue;

    const id = `s23-tower-${i}`;
    const building = createBuilding({
      id,
      type: BuildingType.TOWER,
      owner: "p2",
      position: pos,
    });
    state.buildings.set(id, building);

    // Mark tiles as occupied
    for (let dy = 0; dy < towerDef.footprint.h; dy++) {
      for (let dx = 0; dx < towerDef.footprint.w; dx++) {
        setBuilding(state.battlefield, pos.x + dx, pos.y + dy, id);
        setWalkable(state.battlefield, pos.x + dx, pos.y + dy, false);
      }
    }

    EventBus.emit("buildingPlaced", {
      buildingId: id,
      position: { ...pos },
      owner: "p2",
    });
  }
}

/**
 * Scenario 24 — "The Last Stand"
 * P2 gets 2 tier 7 mages and 2 tier 7 melee giants, spawned at the
 * top-right and bottom-right corners of the map (P2's side) so the
 * player has time to prepare.
 */
function _setupScenario24(state: GameState, mapW: number, mapH: number): void {
  const margin = 3;
  // Top-right corner: 1 giant warrior + 1 national mage T7
  const topRight = [
    { type: UnitType.GIANT_WARRIOR, x: mapW - margin - 2, y: margin },
    { type: UnitType.NATIONAL_MAGE_T7, x: mapW - margin, y: margin + 1 },
  ];
  // Bottom-right corner: 1 giant warrior + 1 national mage T7
  const bottomRight = [
    { type: UnitType.GIANT_WARRIOR, x: mapW - margin - 2, y: mapH - margin - 2 },
    { type: UnitType.NATIONAL_MAGE_T7, x: mapW - margin, y: mapH - margin - 1 },
  ];

  for (const entry of [...topRight, ...bottomRight]) {
    const u = createUnit({
      type: entry.type,
      owner: "p2",
      position: { x: entry.x, y: entry.y },
    });
    state.units.set(u.id, u);
  }
}

/**
 * Scenario 7 — "The Long Road"
 * P3 (allied with P1) starts with 20 pixies near their base in the NE corner.
 */
function _setupScenario7(state: GameState, mapW: number, _mapH: number): void {
  // P3's base is in the NE corner — spawn pixies near it
  const baseX = mapW - 8;
  const baseY = 4;
  for (let i = 0; i < 20; i++) {
    const u = createUnit({
      type: UnitType.PIXIE,
      owner: "p3",
      position: { x: baseX + (i % 5), y: baseY + Math.floor(i / 5) },
    });
    state.units.set(u.id, u);
  }
}

// ---------------------------------------------------------------------------
// Arthurian campaign scenario setup helpers (scenarios 8–23)
// ---------------------------------------------------------------------------

/** Helper: spawn a cluster of neutral hostile units at a position. */
function _spawnNeutralGroup(
  state: GameState,
  units: Array<{ type: UnitType; count: number }>,
  baseX: number,
  baseY: number,
): void {
  let idx = 0;
  for (const entry of units) {
    for (let i = 0; i < entry.count; i++) {
      const u = createUnit({
        type: entry.type,
        owner: NEUTRAL_PLAYER,
        position: { x: baseX + (idx % 4), y: baseY + Math.floor(idx / 4) },
      });
      state.units.set(u.id, u);
      EventBus.emit("unitSpawned", {
        unitId: u.id,
        buildingId: "",
        position: { ...u.position },
      });
      idx++;
    }
  }
}

/**
 * Scenario 9 — "The Green Chapel"
 * Spawn a powerful neutral Green Knight (cyclops-stats) at map centre.
 */
function _setupScenario9(state: GameState, mapW: number, mapH: number): void {
  const cx = Math.floor(mapW / 2);
  const cy = Math.floor(mapH / 2);
  const knight = createUnit({
    type: UnitType.CYCLOPS,
    owner: NEUTRAL_PLAYER,
    position: { x: cx, y: cy },
  });
  // Boost HP to make the Green Knight a proper boss
  knight.hp = Math.floor(knight.hp * 2);
  knight.maxHp = knight.hp;
  state.units.set(knight.id, knight);
  EventBus.emit("unitSpawned", {
    unitId: knight.id,
    buildingId: "",
    position: { ...knight.position },
  });
}

/**
 * Scenario 10 — "The Fisher King's Lands"
 * Spawn blight creatures (spiders, void snails) in the neutral zone.
 */
function _setupScenario10(state: GameState, mapW: number, mapH: number): void {
  // Scatter blight creatures across the centre
  const positions = [
    { x: Math.floor(mapW * 0.35), y: Math.floor(mapH * 0.3) },
    { x: Math.floor(mapW * 0.5), y: Math.floor(mapH * 0.5) },
    { x: Math.floor(mapW * 0.4), y: Math.floor(mapH * 0.7) },
    { x: Math.floor(mapW * 0.6), y: Math.floor(mapH * 0.4) },
  ];
  for (const pos of positions) {
    _spawnNeutralGroup(state, [
      { type: UnitType.SPIDER, count: 2 },
      { type: UnitType.VOID_SNAIL, count: 1 },
    ], pos.x, pos.y);
  }
}

/**
 * Scenario 11 — "Morgan's Bargain"
 * Spawn Faery Queen guards at neutral market buildings.
 */
function _setupScenario11(state: GameState, _mapW: number, _mapH: number): void {
  for (const building of state.buildings.values()) {
    if (building.owner === null) {
      // Guard each neutral building with fay creatures
      _spawnNeutralGroup(state, [
        { type: UnitType.FAERY_QUEEN, count: 1 },
        { type: UnitType.PIXIE, count: 3 },
      ], building.position.x - 1, building.position.y - 1);
    }
  }
}

/**
 * Scenario 12 — "The Siege Perilous"
 * Spawn hostile storm mages near ley-line positions and a neutral lancer at centre.
 */
function _setupScenario12(state: GameState, mapW: number, mapH: number): void {
  const cx = Math.floor(mapW / 2);
  const cy = Math.floor(mapH / 2);
  // The Siege Perilous champion at centre
  const champion = createUnit({
    type: UnitType.KNIGHT_LANCER,
    owner: NEUTRAL_PLAYER,
    position: { x: cx, y: cy },
  });
  champion.hp = Math.floor(champion.hp * 1.5);
  champion.maxHp = champion.hp;
  state.units.set(champion.id, champion);
  EventBus.emit("unitSpawned", {
    unitId: champion.id,
    buildingId: "",
    position: { ...champion.position },
  });
  // Storm mages at ley-line nodes
  const leyLines = [
    { x: Math.floor(mapW * 0.3), y: Math.floor(mapH * 0.25) },
    { x: Math.floor(mapW * 0.7), y: Math.floor(mapH * 0.75) },
  ];
  for (const pos of leyLines) {
    _spawnNeutralGroup(state, [{ type: UnitType.STORM_MAGE, count: 2 }], pos.x, pos.y);
  }
}

/**
 * Scenario 13 — "The Black Knight"
 * Spawn a massively powerful neutral knight at the bridge (map centre).
 */
function _setupScenario13(state: GameState, mapW: number, mapH: number): void {
  const cx = Math.floor(mapW / 2);
  const cy = Math.floor(mapH / 2);
  const blackKnight = createUnit({
    type: UnitType.KNIGHT_LANCER,
    owner: NEUTRAL_PLAYER,
    position: { x: cx, y: cy },
  });
  // The Black Knight is extremely tough
  blackKnight.hp = Math.floor(blackKnight.hp * 3);
  blackKnight.maxHp = blackKnight.hp;
  state.units.set(blackKnight.id, blackKnight);
  EventBus.emit("unitSpawned", {
    unitId: blackKnight.id,
    buildingId: "",
    position: { ...blackKnight.position },
  });
  // Escort cavalry
  _spawnNeutralGroup(state, [
    { type: UnitType.KNIGHT, count: 2 },
  ], cx - 2, cy + 1);
}

/**
 * Scenario 14 — "The Questing Beast"
 * Spawn a fast, powerful neutral beast (red dragon stats) at map centre.
 */
function _setupScenario14(state: GameState, mapW: number, mapH: number): void {
  const cx = Math.floor(mapW / 2);
  const cy = Math.floor(mapH / 2);
  const beast = createUnit({
    type: UnitType.RED_DRAGON,
    owner: NEUTRAL_PLAYER,
    position: { x: cx, y: cy },
  });
  // The Questing Beast is extremely resilient
  beast.hp = Math.floor(beast.hp * 1.5);
  beast.maxHp = beast.hp;
  state.units.set(beast.id, beast);
  EventBus.emit("unitSpawned", {
    unitId: beast.id,
    buildingId: "",
    position: { ...beast.position },
  });
  // Smaller creatures trailing in its wake
  _spawnNeutralGroup(state, [
    { type: UnitType.SPIDER, count: 2 },
    { type: UnitType.GIANT_FROG, count: 2 },
  ], cx - 3, cy + 2);
}

/**
 * Scenario 15 — "The Dolorous Stroke"
 * Spawn undead warriors at ruin positions across the map.
 */
function _setupScenario15(state: GameState, mapW: number, mapH: number): void {
  const ruinPositions = [
    { x: Math.floor(mapW * 0.3), y: Math.floor(mapH * 0.3) },
    { x: Math.floor(mapW * 0.5), y: Math.floor(mapH * 0.2) },
    { x: Math.floor(mapW * 0.5), y: Math.floor(mapH * 0.8) },
    { x: Math.floor(mapW * 0.7), y: Math.floor(mapH * 0.6) },
  ];
  for (const pos of ruinPositions) {
    _spawnNeutralGroup(state, [
      { type: UnitType.SWORDSMAN, count: 3 },
      { type: UnitType.PIKEMAN, count: 2 },
    ], pos.x, pos.y);
  }
}

/**
 * Scenario 16 — "The Perilous Forest"
 * Spawn creature waves from forest edges + a neutral summoner at centre.
 */
function _setupScenario16(state: GameState, mapW: number, mapH: number): void {
  const cx = Math.floor(mapW / 2);
  const cy = Math.floor(mapH / 2);
  // Neutral summoner at centre
  const summoner = createUnit({
    type: UnitType.SUMMONER,
    owner: NEUTRAL_PLAYER,
    position: { x: cx, y: cy },
  });
  summoner.hp = Math.floor(summoner.hp * 2);
  summoner.maxHp = summoner.hp;
  state.units.set(summoner.id, summoner);
  EventBus.emit("unitSpawned", {
    unitId: summoner.id,
    buildingId: "",
    position: { ...summoner.position },
  });
  // Forest edge creature clusters
  const edges = [
    { x: 2, y: Math.floor(mapH * 0.3) },
    { x: mapW - 4, y: Math.floor(mapH * 0.7) },
    { x: Math.floor(mapW * 0.5), y: 2 },
    { x: Math.floor(mapW * 0.5), y: mapH - 4 },
  ];
  for (const pos of edges) {
    _spawnNeutralGroup(state, [
      { type: UnitType.SPIDER, count: 2 },
      { type: UnitType.GIANT_FROG, count: 1 },
    ], pos.x, pos.y);
  }
}

/**
 * Scenario 17 — "The Tournament at Camelot"
 * Spawn neutral champion knight pairs at tournament positions.
 */
function _setupScenario17(state: GameState, mapW: number, mapH: number): void {
  const positions = [
    { x: Math.floor(mapW * 0.4), y: Math.floor(mapH * 0.3) },
    { x: Math.floor(mapW * 0.6), y: Math.floor(mapH * 0.7) },
    { x: Math.floor(mapW * 0.5), y: Math.floor(mapH * 0.5) },
  ];
  for (const pos of positions) {
    _spawnNeutralGroup(state, [
      { type: UnitType.KNIGHT_LANCER, count: 1 },
      { type: UnitType.LANCER, count: 1 },
    ], pos.x, pos.y);
  }
}

/**
 * Scenario 18 — "The Chapel of the Grail"
 * Spawn angelic wardens guarding the Grail Chapel at map centre.
 */
function _setupScenario18(state: GameState, mapW: number, mapH: number): void {
  const cx = Math.floor(mapW / 2);
  const cy = Math.floor(mapH / 2);
  _spawnNeutralGroup(state, [
    { type: UnitType.SAINT, count: 2 },
    { type: UnitType.CLERIC, count: 2 },
    { type: UnitType.MONK, count: 2 },
  ], cx - 1, cy - 1);
}

/**
 * Scenario 19 — "Lancelot's Betrayal"
 * Spawn neutral knight groups across the map that can be recruited.
 */
function _setupScenario19(state: GameState, mapW: number, mapH: number): void {
  const knightPositions = [
    { x: Math.floor(mapW * 0.3), y: Math.floor(mapH * 0.25) },
    { x: Math.floor(mapW * 0.5), y: Math.floor(mapH * 0.5) },
    { x: Math.floor(mapW * 0.7), y: Math.floor(mapH * 0.75) },
    { x: Math.floor(mapW * 0.4), y: Math.floor(mapH * 0.7) },
    { x: Math.floor(mapW * 0.6), y: Math.floor(mapH * 0.3) },
  ];
  for (const pos of knightPositions) {
    _spawnNeutralGroup(state, [
      { type: UnitType.QUESTING_KNIGHT, count: 2 },
      { type: UnitType.KNIGHT, count: 1 },
    ], pos.x, pos.y);
  }
}

/**
 * Scenario 20 — "The Isle of Avalon"
 * Spawn Fay guardians at neutral hamlet/building positions + frost drake patrols.
 */
function _setupScenario20(state: GameState, mapW: number, mapH: number): void {
  // Fay guardians at each neutral building
  let guardCount = 0;
  for (const building of state.buildings.values()) {
    if (building.owner === null && guardCount < 4) {
      _spawnNeutralGroup(state, [
        { type: UnitType.FAERY_QUEEN, count: 1 },
      ], building.position.x - 1, building.position.y - 1);
      guardCount++;
    }
  }
  // Frost dragon patrol
  const frost = createUnit({
    type: UnitType.FROST_DRAGON,
    owner: NEUTRAL_PLAYER,
    position: { x: Math.floor(mapW * 0.5), y: Math.floor(mapH * 0.3) },
  });
  state.units.set(frost.id, frost);
  EventBus.emit("unitSpawned", {
    unitId: frost.id,
    buildingId: "",
    position: { ...frost.position },
  });
}

/**
 * Scenario 21 — "The Grail War"
 * Spawn void snails and distortion mages in a ring around the Grail (map centre).
 */
function _setupScenario21(state: GameState, mapW: number, mapH: number): void {
  const cx = Math.floor(mapW / 2);
  const cy = Math.floor(mapH / 2);
  // Ring of distorted creatures around the Grail
  const ringOffsets = [
    { x: -3, y: 0 }, { x: 3, y: 0 },
    { x: 0, y: -3 }, { x: 0, y: 3 },
  ];
  for (const off of ringOffsets) {
    _spawnNeutralGroup(state, [
      { type: UnitType.VOID_SNAIL, count: 1 },
      { type: UnitType.DISTORTION_MAGE, count: 1 },
    ], cx + off.x, cy + off.y);
  }
  // The Grail guardian — a saint
  const saint = createUnit({
    type: UnitType.SAINT,
    owner: NEUTRAL_PLAYER,
    position: { x: cx, y: cy },
  });
  saint.hp = Math.floor(saint.hp * 2);
  saint.maxHp = saint.hp;
  state.units.set(saint.id, saint);
  EventBus.emit("unitSpawned", {
    unitId: saint.id,
    buildingId: "",
    position: { ...saint.position },
  });
}

/**
 * Scenario 22 — "The Walls of Camelot"
 * Spawn loyalist knight reinforcements near P1's flanks + neutral cyclops.
 */
function _setupScenario22(state: GameState, mapW: number, mapH: number): void {
  // Loyalist reinforcements on P1's flanks
  const flankPositions = [
    { x: Math.floor(mapW * 0.15), y: Math.floor(mapH * 0.2) },
    { x: Math.floor(mapW * 0.15), y: Math.floor(mapH * 0.8) },
  ];
  for (const pos of flankPositions) {
    for (let i = 0; i < 3; i++) {
      const knight = createUnit({
        type: UnitType.QUESTING_KNIGHT,
        owner: "p1",
        position: { x: pos.x + (i % 2), y: pos.y + Math.floor(i / 2) },
      });
      state.units.set(knight.id, knight);
    }
  }
  // Neutral cyclops siege-breaker near centre
  const cyclops = createUnit({
    type: UnitType.CYCLOPS,
    owner: NEUTRAL_PLAYER,
    position: { x: Math.floor(mapW * 0.5), y: Math.floor(mapH * 0.5) },
  });
  state.units.set(cyclops.id, cyclops);
  EventBus.emit("unitSpawned", {
    unitId: cyclops.id,
    buildingId: "",
    position: { ...cyclops.position },
  });
}

/**
 * Scenario 23 — "The Dragon of the White Tower"
 * Spawn a friendly Red Dragon near P1's base and a hostile White (Frost) Dragon near P2.
 * Also spawn neutral frost dragons from map edges.
 */
function _setupScenario23_dragons(state: GameState, mapW: number, mapH: number): void {
  // Red Dragon for P1 — near the western base
  const redDragon = createUnit({
    type: UnitType.RED_DRAGON,
    owner: "p1",
    position: { x: Math.floor(mapW * 0.15), y: Math.floor(mapH * 0.5) },
  });
  state.units.set(redDragon.id, redDragon);

  // White (Frost) Dragon for P2 — near the eastern base
  const whiteDragon = createUnit({
    type: UnitType.FROST_DRAGON,
    owner: "p2",
    position: { x: Math.floor(mapW * 0.85), y: Math.floor(mapH * 0.5) },
  });
  state.units.set(whiteDragon.id, whiteDragon);

  // Neutral frost dragons from map edges
  const wildPositions = [
    { x: Math.floor(mapW * 0.5), y: 3 },
    { x: Math.floor(mapW * 0.5), y: mapH - 4 },
  ];
  for (const pos of wildPositions) {
    const wildDragon = createUnit({
      type: UnitType.FROST_DRAGON,
      owner: NEUTRAL_PLAYER,
      position: pos,
    });
    state.units.set(wildDragon.id, wildDragon);
    EventBus.emit("unitSpawned", {
      unitId: wildDragon.id,
      buildingId: "",
      position: { ...wildDragon.position },
    });
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
// Survivor mode boot
// ---------------------------------------------------------------------------

let _survivorGame: SurvivorGame | null = null;

async function _bootSurvivorGame(): Promise<void> {
  if (_survivorGame) {
    _survivorGame.destroy();
    _survivorGame = null;
  }

  _survivorGame = new SurvivorGame();
  await _survivorGame.boot();
}

// ---------------------------------------------------------------------------
// Colosseum mode boot
// ---------------------------------------------------------------------------

let _colosseumGame: ColosseumGame | null = null;

async function _bootColosseumGame(): Promise<void> {
  if (_colosseumGame) {
    _colosseumGame.destroy();
    _colosseumGame = null;
  }

  _colosseumGame = new ColosseumGame();
  await _colosseumGame.boot();

  // Listen for exit event
  const _onColosseumExit = () => {
    window.removeEventListener("colosseumExit", _onColosseumExit);
    if (_colosseumGame) {
      _colosseumGame.destroy();
      _colosseumGame = null;
    }
    menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
  };
  window.addEventListener("colosseumExit", _onColosseumExit);
}

// ---------------------------------------------------------------------------
// Duel mode boot
// ---------------------------------------------------------------------------

let _duelGame: DuelGame | null = null;

async function _bootDuelGame(): Promise<void> {
  if (_duelGame) {
    _duelGame.destroy();
    _duelGame = null;
  }

  _duelGame = new DuelGame();
  await _duelGame.boot();

  const _onDuelExit = () => {
    window.removeEventListener("duelExit", _onDuelExit);
    if (_duelGame) {
      _duelGame.destroy();
      _duelGame = null;
    }
    menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
  };
  window.addEventListener("duelExit", _onDuelExit);
}

// ---------------------------------------------------------------------------
// Medieval GTA mode boot
// ---------------------------------------------------------------------------

let _medievalGTA: MedievalGTA | null = null;

async function _bootMedievalGTA(): Promise<void> {
  if (_medievalGTA) {
    _medievalGTA.destroy();
    _medievalGTA = null;
  }

  _medievalGTA = new MedievalGTA();
  await _medievalGTA.boot();

  const _onExit = () => {
    window.removeEventListener("medievalGTAExit", _onExit);
    if (_medievalGTA) {
      _medievalGTA.destroy();
      _medievalGTA = null;
    }
    menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
  };
  window.addEventListener("medievalGTAExit", _onExit);
}

// ---------------------------------------------------------------------------
// Warband mode boot
// ---------------------------------------------------------------------------

let _warbandGame: WarbandGame | null = null;

async function _bootWarbandGame(): Promise<void> {
  if (_warbandGame) {
    _warbandGame.destroy();
    _warbandGame = null;
  }

  _warbandGame = new WarbandGame();
  await _warbandGame.boot();

  const _onExit = () => {
    window.removeEventListener("warbandExit", _onExit);
    if (_warbandGame) {
      _warbandGame.destroy();
      _warbandGame = null;
    }
    menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
  };
  window.addEventListener("warbandExit", _onExit);
}

// ---------------------------------------------------------------------------
// Tekken fighter mode boot
// ---------------------------------------------------------------------------

let _tekkenGame: TekkenGame | null = null;

async function _bootTekkenGame(): Promise<void> {
  if (_tekkenGame) {
    _tekkenGame.destroy();
    _tekkenGame = null;
  }
  _tekkenGame = new TekkenGame();
  await _tekkenGame.boot();
  const _onExit = () => {
    window.removeEventListener("tekkenExit", _onExit);
    if (_tekkenGame) {
      _tekkenGame.destroy();
      _tekkenGame = null;
    }
    menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
  };
  window.addEventListener("tekkenExit", _onExit);
}

// ---------------------------------------------------------------------------
// Panzer Dragoon mode boot
// ---------------------------------------------------------------------------

let _dragoonGame: DragoonGame | null = null;

async function _bootDragoonGame(): Promise<void> {
  if (_dragoonGame) {
    _dragoonGame.destroy();
    _dragoonGame = null;
  }
  _dragoonGame = new DragoonGame();
  await _dragoonGame.boot();
  const _onExit = () => {
    window.removeEventListener("dragoonExit", _onExit);
    if (_dragoonGame) {
      _dragoonGame.destroy();
      _dragoonGame = null;
    }
    menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
  };
  window.addEventListener("dragoonExit", _onExit);
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
  const scenarioDef = getScenario(scenarioNum);
  // Override map size if the scenario specifies one
  let effectiveMapSize = mapSize;
  if (scenarioDef?.mapSizeLabel) {
    const override = MAP_SIZES.find((m) => m.label === scenarioDef.mapSizeLabel);
    if (override) effectiveMapSize = override;
  }
  await _bootGame(
    p2IsAI,
    effectiveMapSize,
    GameMode.CAMPAIGN,
    leaderId,
    raceId,
    scenarioNum,
    undefined,
    undefined,
    scenarioDef?.playerCount ?? 2,
    scenarioDef?.alliedPlayerIds ?? [],
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

/** Wave random event types. */
type WaveEventType = "lady_of_the_lake" | "rogue_mage" | "gold_rush";

/** Pending wave event to apply at next battle start. */
interface PendingWaveEvent {
  type: WaveEventType;
  description: string;
}

/** Wave mode state — persists across rounds until the player loses. */
let _waveState: {
  wave: number;
  playerRaceId: RaceId;
  playerLeaderId: LeaderId;
  totalGoldSpent: number; // running total of all gold player spent
  mapSize: MapSize;
  mapType: MapType;
  corruption: GrailCorruptionState;
  /** Units that survived the previous wave — carried over to the next battle. */
  survivingUnits: Array<{ type: UnitType; count: number }>;
  /** Unspent gold from the previous wave shop — carries over to the next round. */
  leftoverGold: number;
  /** Total gold the AI has been given across all waves. */
  totalEnemyGold: number;
  /** Gold given to the AI for the current wave. */
  lastEnemyGold: number;
  /** Whether random events are enabled. */
  randomEvents: boolean;
  /** Pending event to apply at next battle start. */
  pendingEvent: PendingWaveEvent | null;
  /** Extra gold bonus from Gold Rush event. */
  bonusGold: number;
  /** Whether scaling difficulty is enabled (multiplier grows each wave). */
  scalingDifficulty: boolean;
  /** Whether boss waves are enabled (every 5th wave). */
  bossWaves: boolean;
  /** Current mercenary offerings (2 random units from other races). */
  mercenaries: Array<{ type: UnitType; raceId: string }>;
} | null = null;

// ---------------------------------------------------------------------------
// Wave save/load (localStorage)
// ---------------------------------------------------------------------------

const WAVE_SAVE_KEY = "wave_save_v1";

interface SerializedWaveState {
  version: 1;
  wave: number;
  playerRaceId: string;
  playerLeaderId: string;
  totalGoldSpent: number;
  mapSize: { label: string; width: number; height: number };
  mapType: string;
  corruption: {
    enabled: boolean;
    activeModifierIds: string[];
    corruptionLevel: number;
    nextModifierWave: number;
    usedModifierIds: string[];
  };
  survivingUnits: Array<{ type: string; count: number }>;
  leftoverGold: number;
  totalEnemyGold: number;
  lastEnemyGold: number;
  randomEvents?: boolean;
  bonusGold?: number;
  scalingDifficulty?: boolean;
  bossWaves?: boolean;
  mercenaries?: Array<{ type: string; raceId: string }>;
}

function _saveWaveGame(): boolean {
  if (!_waveState) return false;
  try {
    const ws = _waveState;
    const data: SerializedWaveState = {
      version: 1,
      wave: ws.wave,
      playerRaceId: ws.playerRaceId,
      playerLeaderId: ws.playerLeaderId,
      totalGoldSpent: ws.totalGoldSpent,
      mapSize: { label: ws.mapSize.label, width: ws.mapSize.width, height: ws.mapSize.height },
      mapType: ws.mapType,
      corruption: {
        enabled: ws.corruption.enabled,
        activeModifierIds: ws.corruption.activeModifiers.map((m) => m.id),
        corruptionLevel: ws.corruption.corruptionLevel,
        nextModifierWave: ws.corruption.nextModifierWave,
        usedModifierIds: [...ws.corruption.usedModifierIds],
      },
      survivingUnits: ws.survivingUnits.map((e) => ({ type: e.type, count: e.count })),
      leftoverGold: ws.leftoverGold,
      totalEnemyGold: ws.totalEnemyGold,
      lastEnemyGold: ws.lastEnemyGold,
      randomEvents: ws.randomEvents,
      bonusGold: ws.bonusGold,
      scalingDifficulty: ws.scalingDifficulty,
      bossWaves: ws.bossWaves,
      mercenaries: ws.mercenaries.map((m) => ({ type: m.type, raceId: m.raceId })),
    };
    localStorage.setItem(WAVE_SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function _loadWaveGame(): NonNullable<typeof _waveState> | null {
  try {
    const raw = localStorage.getItem(WAVE_SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SerializedWaveState;
    if (data.version !== 1) return null;

    // Rebuild corruption state from saved modifier IDs
    const corruption = createGrailCorruptionState();
    corruption.enabled = data.corruption.enabled;
    corruption.corruptionLevel = data.corruption.corruptionLevel;
    corruption.nextModifierWave = data.corruption.nextModifierWave;
    corruption.usedModifierIds = new Set(data.corruption.usedModifierIds);
    // Restore active modifiers by looking up IDs in ALL_CORRUPTION_MODIFIERS
    for (const id of data.corruption.activeModifierIds) {
      const mod = ALL_CORRUPTION_MODIFIERS.find((m) => m.id === id);
      if (mod) corruption.activeModifiers.push(mod);
    }

    return {
      wave: data.wave,
      playerRaceId: data.playerRaceId as RaceId,
      playerLeaderId: data.playerLeaderId as LeaderId,
      totalGoldSpent: data.totalGoldSpent,
      mapSize: data.mapSize,
      mapType: data.mapType as MapType,
      corruption,
      survivingUnits: data.survivingUnits.map((e) => ({ type: e.type as UnitType, count: e.count })),
      leftoverGold: data.leftoverGold,
      totalEnemyGold: data.totalEnemyGold,
      lastEnemyGold: data.lastEnemyGold,
      randomEvents: data.randomEvents ?? false,
      pendingEvent: null,
      bonusGold: data.bonusGold ?? 0,
      scalingDifficulty: data.scalingDifficulty ?? false,
      bossWaves: data.bossWaves ?? false,
      mercenaries: (data.mercenaries ?? []).map((m) => ({ type: m.type as UnitType, raceId: m.raceId })),
    };
  } catch {
    return null;
  }
}

function _hasWaveSave(): boolean {
  return localStorage.getItem(WAVE_SAVE_KEY) !== null;
}

const MERLIN_COMPLIMENTS: Record<number, string> = {
  10: "Impressive, young one! Your tactical prowess grows!",
  20: "By the stars! Even I am amazed by your skill!",
  30: "Legends shall be written of this day!",
  40: "You rival the great kings of old!",
};
const MERLIN_COMPLIMENT_DEFAULT = "Truly, you are beyond mortal measure!";

/** Gold spent in the most recent wave shop round (set before each battle). */
let _waveLastRoundGold = 0;

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

/** Generate a wave hint (enemy race + main unit types) for the next wave. */
function _generateWaveHint(playerRaceId: RaceId, wave: number): { raceName: string; mainUnits: string[] } {
  const races = RACE_DEFINITIONS.filter((r) => r.implemented && r.id !== "op" && r.id !== playerRaceId);
  const enemyRace = races[Math.floor(Math.random() * races.length)];
  const enemyRaceId = enemyRace?.id ?? "man";
  const raceName = enemyRace?.name ?? "Human";

  const maxTier = wave <= 5 ? 3 : wave <= 10 ? 5 : 7;
  const available = getUnitsForRace(enemyRaceId, maxTier);

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

  // Pick a few representative unit names
  const unitNames: string[] = [];
  const seen = new Set<string>();
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  for (const ut of shuffled) {
    const name = ut.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    if (!seen.has(name)) {
      seen.add(name);
      unitNames.push(name);
    }
    if (unitNames.length >= 4) break;
  }

  return { raceName, mainUnits: unitNames };
}

// ---------------------------------------------------------------------------
// Wave best-run tracking (localStorage)
// ---------------------------------------------------------------------------

const WAVE_BEST_KEY = "wave_best_v1";

interface WaveBestRun {
  wave: number;
  totalGoldSpent: number;
  raceId: string;
  leaderId: string;
  date: string;
}

function _getWaveBestRuns(): WaveBestRun[] {
  try {
    const raw = localStorage.getItem(WAVE_BEST_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WaveBestRun[];
  } catch { return []; }
}

function _saveWaveBestRun(run: WaveBestRun): void {
  const runs = _getWaveBestRuns();
  runs.push(run);
  runs.sort((a, b) => b.wave - a.wave);
  // Keep top 10
  localStorage.setItem(WAVE_BEST_KEY, JSON.stringify(runs.slice(0, 10)));
}

function _getWaveBestWave(): number {
  const runs = _getWaveBestRuns();
  return runs.length > 0 ? runs[0].wave : 0;
}

// ---------------------------------------------------------------------------
// Mercenary generation (2 random units from other races)
// ---------------------------------------------------------------------------

function _generateMercenaries(playerRaceId: RaceId, wave: number): Array<{ type: UnitType; raceId: string }> {
  const maxTier = wave <= 5 ? 3 : wave <= 10 ? 5 : 7;
  const otherRaces = RACE_DEFINITIONS.filter((r) => r.implemented && r.id !== "op" && r.id !== playerRaceId);
  if (otherRaces.length === 0) return [];

  const candidates: Array<{ type: UnitType; raceId: string }> = [];
  for (const race of otherRaces) {
    const units = getUnitsForRace(race.id, maxTier);
    for (const ut of units) {
      candidates.push({ type: ut, raceId: race.id });
    }
    // Include faction units
    for (const fut of race.factionUnits) {
      if (fut && UNIT_DEFINITIONS[fut]) {
        const tier = UNIT_DEFINITIONS[fut].tier ?? 1;
        if (tier <= maxTier && !candidates.some((c) => c.type === fut)) {
          candidates.push({ type: fut, raceId: race.id });
        }
      }
    }
  }

  // Remove any units already available to the player's race
  const playerUnits = new Set(getAllShopUnits(playerRaceId));
  const filtered = candidates.filter((c) => !playerUnits.has(c.type));
  if (filtered.length === 0) return [];

  // Shuffle and pick 2
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}

// ---------------------------------------------------------------------------
// Boss wave generation
// ---------------------------------------------------------------------------

function _generateBossWaveRoster(playerRaceId: RaceId, goldBudget: number, _wave: number): UnitRoster {
  // Boss waves: pick a single race and heavily invest in high-tier units
  const races = RACE_DEFINITIONS.filter((r) => r.implemented && r.id !== "op" && r.id !== playerRaceId);
  const enemyRace = races[Math.floor(Math.random() * races.length)];
  const enemyRaceId = enemyRace?.id ?? "man";

  // Boss waves use max tier available
  const maxTier = 7;
  const available = getUnitsForRace(enemyRaceId, maxTier);

  // Add faction units
  const race = getRace(enemyRaceId);
  if (race) {
    for (const fut of race.factionUnits) {
      if (fut && UNIT_DEFINITIONS[fut] && !available.includes(fut)) {
        available.push(fut);
      }
    }
  }

  if (available.length === 0) return [{ type: UnitType.SWORDSMAN, count: 10 }];

  // Prefer expensive (high-tier) units — sort by cost descending, pick from top half
  available.sort((a, b) => (UNIT_DEFINITIONS[b]?.cost ?? 0) - (UNIT_DEFINITIONS[a]?.cost ?? 0));
  const elitePool = available.slice(0, Math.max(3, Math.ceil(available.length * 0.4)));

  const roster: UnitRoster = [];
  const counts = new Map<UnitType, number>();
  let remaining = goldBudget;
  let safety = 500;

  while (remaining > 0 && safety-- > 0) {
    const affordable = elitePool.filter((ut) => (UNIT_DEFINITIONS[ut]?.cost ?? 100) <= remaining);
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

// ---------------------------------------------------------------------------
// Scaling difficulty multiplier
// ---------------------------------------------------------------------------

function _getWaveDifficultyMultiplier(wave: number, scalingEnabled: boolean): number {
  if (!scalingEnabled) return 1.3;
  // Starts at 1.3, grows by 0.05 per wave, capping at 3.0
  return Math.min(3.0, 1.3 + (wave - 1) * 0.05);
}

/** Wave event definitions. */
const WAVE_EVENTS: Array<{
  type: WaveEventType;
  weight: number;
  getMessage: (wave: number) => string;
}> = [
  {
    type: "lady_of_the_lake",
    weight: 1,
    getMessage: (wave) =>
      `The Lady of the Lake has sent ${wave} sacred priestess${wave > 1 ? "es" : ""} to aid King Arthur in his noble quest! "Go forth, servants of Avalon, and mend the wounds of the righteous!"`,
  },
  {
    type: "rogue_mage",
    weight: 1,
    getMessage: () =>
      `A rogue mage, corrupted by Morgan le Fay's dark enchantments, has appeared on the battlefield! Beware — this sorcerer answers to no lord and attacks all who draw near.`,
  },
  {
    type: "gold_rush",
    weight: 1,
    getMessage: () =>
      `The treasuries of Camelot overflow! A caravan from the mines of Cornwall has arrived bearing 200 gold pieces. Fortune smiles upon the realm!`,
  },
];

/** Roll a random wave event. Returns null if no event triggers. */
function _rollWaveEvent(wave: number): PendingWaveEvent | null {
  if (Math.random() > 0.3) return null; // 30% chance
  const totalWeight = WAVE_EVENTS.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const event of WAVE_EVENTS) {
    roll -= event.weight;
    if (roll <= 0) {
      return { type: event.type, description: event.getMessage(wave) };
    }
  }
  return null;
}

/** Start the next wave's shop screen after a wave victory. */
function _startNextWaveShop(ws: NonNullable<typeof _waveState>, extraGold: number): void {
  unitShopScreen.onDone = async (playerRoster) => {
    unitShopScreen.hide();

    // playerRoster already includes survivors (pre-filled in shop counts).
    // Calculate gold spent: total cost of roster minus cost of survivors.
    let totalRosterCost = 0;
    for (const entry of playerRoster) {
      const uDef = UNIT_DEFINITIONS[entry.type];
      if (uDef) totalRosterCost += uDef.cost * entry.count;
    }
    let survivorCost = 0;
    for (const entry of ws.survivingUnits) {
      const uDef = UNIT_DEFINITIONS[entry.type];
      if (uDef) survivorCost += uDef.cost * entry.count;
    }
    const spent = totalRosterCost - survivorCost;
    ws.totalGoldSpent += spent;
    ws.leftoverGold = extraGold - spent;
    _waveLastRoundGold = spent;

    // Check for new corruption modifier
    if (ws.corruption.enabled) {
      const newMod = selectModifier(ws.corruption, ws.wave);
      if (newMod) {
        EventBus.emit("corruptionModifierActivated", {
          modifierName: newMod.name,
          description: newMod.description,
          corruptionLevel: ws.corruption.corruptionLevel,
        });
      }
    }

    // Generate enemy wave: enemies worth totalGoldSpent * multiplier
    const multiplier = _getWaveDifficultyMultiplier(ws.wave, ws.scalingDifficulty);
    const enemyBudget = Math.round(ws.totalGoldSpent * multiplier);
    ws.lastEnemyGold = enemyBudget;
    ws.totalEnemyGold += enemyBudget;
    const isBossWave = ws.bossWaves && ws.wave % 5 === 0;
    const enemyRoster = isBossWave
      ? _generateBossWaveRoster(ws.playerRaceId, Math.round(enemyBudget * 1.25), ws.wave)
      : _generateWaveEnemyRoster(ws.playerRaceId, enemyBudget, ws.wave);

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
  const corruptionSuffix = ws.corruption.enabled && ws.corruption.corruptionLevel > 0
    ? ` [CORRUPTION ${ws.corruption.corruptionLevel}]`
    : ws.corruption.enabled ? " [GRAIL GREED]" : "";
  unitShopScreen.setCorruptionModifiers(ws.corruption.activeModifiers);
  unitShopScreen.setSurvivingUnits(ws.survivingUnits);
  // Regenerate mercenaries each wave
  ws.mercenaries = _generateMercenaries(ws.playerRaceId, ws.wave);
  unitShopScreen.setMercenaries(ws.mercenaries);
  unitShopScreen.onSave = () => { _saveWaveGame(); };
  unitShopScreen.onLoad = () => {
    const loaded = _loadWaveGame();
    if (!loaded) return;
    _waveState = loaded;
    unitShopScreen.hide();
    const loadGold = 1000 + (loaded.leftoverGold ?? 0);
    _startNextWaveShop(loaded, loadGold);
  };
  unitShopScreen.onBackToMenu = () => {
    unitShopScreen.hide();
    _waveState = null;
    menuScreen.hasWaveSave = _hasWaveSave(); menuScreen.show();
  };
  const bossTag = ws.bossWaves && ws.wave % 5 === 0 ? " [BOSS]" : "";
  unitShopScreen.setWaveHint(_generateWaveHint(ws.playerRaceId, ws.wave));
  unitShopScreen.show(ws.playerRaceId, extraGold, `WAVE ${ws.wave}${corruptionSuffix}${bossTag} — RECRUIT ARMY`);
}

/** Show a multi-screen Merlin introduction for wave mode. */
function _showWaveIntro(leaderId: string, onDone: () => void): void {
  const leader = getLeader(leaderId as LeaderId);
  const leaderName = leader?.name ?? "Commander";

  // Merlin-only intro dialog pages
  const pages: string[] = [
    `Ah, ${leaderName}! The ancient arena awakens once more. I have arranged a challenge for you.`,
    "Endless waves of foes shall march against you. Each wave fiercer than the last. Survive — and grow stronger.",
    "You will earn gold for each victory. Spend it wisely in the shop to recruit troops and fortify your army.",
    "Your veterans carry over between waves. Guard them well — a seasoned army is worth its weight in gold.",
    "Now then — to the shop with you. Your first wave awaits...",
  ];

  let pageIndex = 0;
  const showNext = (): void => {
    if (pageIndex >= pages.length) {
      onDone();
      return;
    }
    const msg = pages[pageIndex];
    pageIndex++;
    _showMerlinWaveCompliment(msg, showNext);
  };
  showNext();
}

/** Show a brief Merlin compliment overlay, then call the callback. */
/** Speaker colour palette for the dialog. */
const SPEAKER_COLORS: Record<string, { label: number; border: number; text: number }> = {
  merlin:    { label: 0xbb88ff, border: 0x9966ff, text: 0xddccff },
  arthur:    { label: 0xffcc44, border: 0xddaa22, text: 0xffeedd },
  gawain:    { label: 0xff8844, border: 0xdd6622, text: 0xffddcc },
  guinevere: { label: 0xff66aa, border: 0xdd4488, text: 0xffddee },
  lancelot:  { label: 0x44aaff, border: 0x2288dd, text: 0xddeeff },
  pellinore: { label: 0x88cc44, border: 0x66aa22, text: 0xeeffdd },
  nimue:     { label: 0x44ddcc, border: 0x22bbaa, text: 0xddfffe },
  mordred:   { label: 0xcc4444, border: 0xaa2222, text: 0xffdddd },
  morgan:    { label: 0xaa66cc, border: 0x8844aa, text: 0xeeddff },
};

function _showMerlinWaveCompliment(
  message: string,
  onDone: () => void,
  _secondSpeaker?: { name: string; id: string },
): void {
  const overlay = new Container();
  const sw = viewManager.screenWidth;
  const sh = viewManager.screenHeight;

  const bg = new Graphics()
    .rect(0, 0, sw, sh)
    .fill({ color: 0x000000, alpha: 0.7 });
  overlay.addChild(bg);

  const merlinColors = SPEAKER_COLORS.merlin;

  // Side-by-side layout: portrait left, text right
  const PORTRAIT_W = 300;
  const PORTRAIT_H = 440;
  const TEXT_W = 480;
  const PAD = 24;
  const DW = PORTRAIT_W + TEXT_W + PAD * 3; // total dialog width
  const DH = PORTRAIT_H + PAD * 2;          // total dialog height

  const wrapper = new Container();
  wrapper.position.set(Math.floor((sw - DW) / 2), Math.floor((sh - DH) / 2));
  overlay.addChild(wrapper);

  // Dialog background
  const dialogBg = new Graphics()
    .roundRect(0, 0, DW, DH, 12)
    .fill({ color: 0x080814, alpha: 0.97 })
    .roundRect(0, 0, DW, DH, 12)
    .stroke({ color: merlinColors.border, alpha: 0.9, width: 2.5 });
  wrapper.addChild(dialogBg);

  // Portrait frame on the left
  const portraitFrame = new Graphics()
    .roundRect(PAD, PAD, PORTRAIT_W, PORTRAIT_H, 8)
    .fill({ color: 0x04040e })
    .roundRect(PAD, PAD, PORTRAIT_W, PORTRAIT_H, 8)
    .stroke({ color: merlinColors.border, alpha: 0.7, width: 1.5 });
  wrapper.addChild(portraitFrame);

  void Assets.load(merlinImgUrl).then((tex: Texture) => {
    if (!wrapper.parent) return;
    const sprite = new Sprite(tex);
    const maxW = PORTRAIT_W - 8;
    const maxH = PORTRAIT_H - 8;
    const scale = Math.min(maxW / tex.width, maxH / tex.height);
    sprite.scale.set(scale);
    sprite.position.set(
      PAD + 4 + (maxW - tex.width * scale) / 2,
      PAD + 4 + (maxH - tex.height * scale) / 2,
    );
    wrapper.addChild(sprite);
  });

  // Right side: name + text + button
  const textX = PAD + PORTRAIT_W + PAD;
  const textY = PAD;

  const merlinLabel = new Text({
    text: "MERLIN",
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 20,
      fill: merlinColors.label,
      fontWeight: "bold",
      letterSpacing: 3,
    }),
  });
  merlinLabel.position.set(textX, textY);
  wrapper.addChild(merlinLabel);

  const subtitle = new Text({
    text: "Archmage of Avalon",
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 12,
      fill: 0x8877aa,
      fontStyle: "italic",
      letterSpacing: 1,
    }),
  });
  subtitle.position.set(textX, textY + 28);
  wrapper.addChild(subtitle);

  // Divider
  const divider = new Graphics()
    .rect(textX, textY + 50, TEXT_W, 1)
    .fill({ color: merlinColors.border, alpha: 0.4 });
  wrapper.addChild(divider);

  const msgText = new Text({
    text: `"${message}"`,
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 14,
      fill: merlinColors.text,
      letterSpacing: 1,
      wordWrap: true,
      wordWrapWidth: TEXT_W - 10,
      lineHeight: 22,
    }),
  });
  msgText.position.set(textX, textY + 62);
  wrapper.addChild(msgText);

  const BW = TEXT_W;
  const BH = 40;
  const btn = new Container();
  btn.eventMode = "static";
  btn.cursor = "pointer";
  btn.position.set(textX, DH - PAD - BH);

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
      fontSize: 15,
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

  wrapper.addChild(btn);

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

  // Apply Arthurian lore affinities — lore allies start at peace
  applyInitialAffinities(state);

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
  // Mordred's Army — 8 hexes from Avalon, attacks p1 on proximity
  // ---------------------------------------------------------------------------
  {
    const center = { q: 0, r: 0 };
    const ring8 = hexSpiral(center, 8).filter((h) => hexDistance(center, h) === 8);
    const shuffledRing8 = ring8.sort(() => Math.random() - 0.5);
    let mordredHex: { q: number; r: number } | null = null;

    for (const candidate of shuffledRing8) {
      const t = grid.getTile(candidate.q, candidate.r);
      if (!t) continue;
      if (t.cityId || t.armyId || t.campId || t.owner) continue;
      const terrain = TERRAIN_DEFINITIONS[t.terrain];
      if (!isFinite(terrain.movementCost)) continue;
      // Not too close to any player start
      let tooClose = false;
      for (const sp of startPositions) {
        if (hexDistance(candidate, sp) < 4) { tooClose = true; break; }
      }
      if (tooClose) continue;
      mordredHex = candidate;
      break;
    }

    if (mordredHex) {
      const mordredArmyId = nextId(state, "army");
      const mordredUnits: ArmyUnit[] = [
        { unitType: UnitType.KNIGHT, count: 5, hpPerUnit: 180 },
        { unitType: UnitType.SWORDSMAN, count: 8, hpPerUnit: 100 },
        { unitType: UnitType.CROSSBOWMAN, count: 4, hpPerUnit: 75 },
        { unitType: UnitType.STORM_MAGE, count: 2, hpPerUnit: 60 },
      ];
      const mordredArmy = createWorldArmy(mordredArmyId, "morgaine", mordredHex, mordredUnits, false);
      mordredArmy.movementPoints = 0; // stationary until triggered
      state.armies.set(mordredArmyId, mordredArmy);
      const mordredTile = grid.getTile(mordredHex.q, mordredHex.r);
      if (mordredTile) mordredTile.armyId = mordredArmyId;
      // Store the army ID for the proximity trigger
      (state as any)._mordredArmyId = mordredArmyId;
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

  // ---------------------------------------------------------------------------
  // Leader-specific quest encounter — unique quest tile for the player's leader
  // ---------------------------------------------------------------------------
  const leaderEncounterState = createLeaderEncounterState();
  {
    const p1 = state.players.get("p1");
    if (p1?.leaderId && p1.leaderId !== "arthur") {
      placeLeaderEncounter(state, leaderEncounterState, p1.leaderId, startPositions);
    }
  }

  // Store encounter state on the world state for later access
  (state as any)._leaderEncounterState = leaderEncounterState;

  // Holy Grail quest state — chapel spawns later during gameplay
  const grailQuestState = createGrailQuestState();
  (state as any)._grailQuestState = grailQuestState;

  // Camlann state — Arthur vs Mordred final battle
  const camlannState = createCamlannState();
  (state as any)._camlannState = camlannState;

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
    if (worldIntroDialog.isVisible) return true;
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
  worldIntroDialog.init(viewManager);
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

  // Leader introduction when player first encounters an enemy player's units
  const _checkLeaderFirstEncounter = async (playerArmy: WorldArmy): Promise<void> => {
    for (const army of state.armies.values()) {
      if (army.owner === "p1" || army.owner === playerArmy.owner) continue;
      if (army.owner === "morgaine") continue; // Morgaine has her own dialog
      if (hexDistance(playerArmy.position, army.position) > 2) continue;

      const enemyPlayer = state.players.get(army.owner);
      if (!enemyPlayer?.leaderId) continue;

      // showLeaderIntroduction handles deduplication internally
      await showLeaderIntroduction(enemyPlayer.leaderId);
      return; // Only one intro per movement step
    }
  };

  // Mordred encounter — triggers when p1 comes within 2 tiles of Mordred's army
  let _mordredTriggered = false;

  const _showMordredDialog = (): Promise<void> => {
    return new Promise((resolve) => {
      // Merlin warns first
      const backdrop1 = document.createElement("div");
      backdrop1.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;";

      const card1 = document.createElement("div");
      card1.style.cssText = "background:#1a1a2e;border:2px solid #aa88dd;border-radius:12px;padding:24px;max-width:480px;text-align:center;box-shadow:0 0 30px rgba(136,68,204,0.4);";

      const img1 = document.createElement("img");
      img1.src = merlinImgUrl;
      img1.style.cssText = "width:100px;height:100px;border-radius:50%;border:2px solid #aa88dd;margin-bottom:12px;image-rendering:pixelated;object-fit:cover;";
      card1.appendChild(img1);

      const title1 = document.createElement("div");
      title1.textContent = "MERLIN";
      title1.style.cssText = "color:#aa88dd;font-family:monospace;font-size:18px;font-weight:bold;margin-bottom:4px;";
      card1.appendChild(title1);

      const sub1 = document.createElement("div");
      sub1.textContent = "Archmage of Avalon";
      sub1.style.cssText = "color:#aaaacc;font-family:monospace;font-size:12px;font-style:italic;margin-bottom:12px;";
      card1.appendChild(sub1);

      const text1 = document.createElement("div");
      text1.textContent = "\u201CDark tidings, my liege! Mordred, Arthur\u2019s treacherous son, commands a powerful army nearby. He is cunning, ruthless, and fights without honour. His warriors will attack on sight \u2014 prepare yourself, for there will be no parley with the Usurper.\u201D";
      text1.style.cssText = "color:#ccccdd;font-family:monospace;font-size:12px;line-height:1.6;margin-bottom:16px;text-align:left;padding:0 8px;";
      card1.appendChild(text1);

      const btn1 = document.createElement("button");
      btn1.textContent = "Very well.";
      btn1.style.cssText = "background:#222244;color:white;border:1px solid #aa88dd;border-radius:6px;padding:8px 24px;font-family:monospace;font-size:13px;cursor:pointer;";
      btn1.onmouseenter = () => { btn1.style.background = "#334466"; };
      btn1.onmouseleave = () => { btn1.style.background = "#222244"; };
      btn1.onclick = () => {
        backdrop1.remove();
        // Now Mordred speaks
        _showMordredSpeech().then(resolve);
      };
      card1.appendChild(btn1);
      backdrop1.appendChild(card1);
      document.body.appendChild(backdrop1);
    });
  };

  const _showMordredSpeech = (): Promise<void> => {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;";

      const card = document.createElement("div");
      card.style.cssText = "background:#1a1a2e;border:2px solid #aa4444;border-radius:12px;padding:24px;max-width:480px;text-align:center;box-shadow:0 0 30px rgba(170,68,68,0.5);";

      const img = document.createElement("img");
      img.src = LEADER_IMAGES["mordred"] ?? "";
      img.style.cssText = "width:100px;height:100px;border-radius:50%;border:2px solid #aa4444;margin-bottom:12px;image-rendering:pixelated;object-fit:cover;";
      card.appendChild(img);

      const title = document.createElement("div");
      title.textContent = "MORDRED";
      title.style.cssText = "color:#cc4444;font-family:monospace;font-size:18px;font-weight:bold;margin-bottom:4px;";
      card.appendChild(title);

      const sub = document.createElement("div");
      sub.textContent = "The Usurper";
      sub.style.cssText = "color:#aaaacc;font-family:monospace;font-size:12px;font-style:italic;margin-bottom:12px;";
      card.appendChild(sub);

      const text = document.createElement("div");
      text.textContent = "\u201CSo, another pretender dares to march near my domain. I am Mordred, and I will have what is rightfully mine \u2014 this land, this throne, everything. My father Arthur denied me my birthright, but I will not be denied again. Your armies will break against mine like waves against stone. Surrender now, or I shall carve your name into a list that grows longer by the day.\u201D";
      text.style.cssText = "color:#ccccdd;font-family:monospace;font-size:12px;line-height:1.6;margin-bottom:16px;text-align:left;padding:0 8px;";
      card.appendChild(text);

      const btn = document.createElement("button");
      btn.textContent = "We shall see about that.";
      btn.style.cssText = "background:#222244;color:white;border:1px solid #aa4444;border-radius:6px;padding:8px 24px;font-family:monospace;font-size:13px;cursor:pointer;";
      btn.onmouseenter = () => { btn.style.background = "#442222"; };
      btn.onmouseleave = () => { btn.style.background = "#222244"; };
      btn.onclick = () => { backdrop.remove(); resolve(); };
      card.appendChild(btn);

      backdrop.appendChild(card);
      document.body.appendChild(backdrop);
    });
  };

  const _checkMordredProximity = async (playerArmy: WorldArmy): Promise<void> => {
    if (_mordredTriggered) return;
    const mordredArmyId = (state as any)._mordredArmyId as string | undefined;
    if (!mordredArmyId) return;
    const mordredArmy = state.armies.get(mordredArmyId);
    if (!mordredArmy) return;

    if (hexDistance(playerArmy.position, mordredArmy.position) <= 2) {
      _mordredTriggered = true;
      await _showMordredDialog();

      // Mordred attacks — give him movement points and move toward the player
      mordredArmy.movementPoints = 6;
      moveArmy(mordredArmy, playerArmy.position, state);
    }
  };

  // Merlin warning when player gets near a Morgaine army
  const _warnedMorgaineArmies = new Set<string>();

  /** Show Merlin warning dialog if a player army is within 1 hex of a Morgaine army. */
  const _checkMorgaineProximity = (playerArmy: WorldArmy): Promise<void> => {
    const mordredId = (state as any)._mordredArmyId as string | undefined;
    for (const army of state.armies.values()) {
      if (army.owner !== "morgaine" || army.isGarrison) continue;
      if (army.id === mordredId) continue; // Mordred has his own dialog
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

  // Holy Grail quest proximity check
  const _grailQState = (state as any)._grailQuestState as ReturnType<typeof createGrailQuestState> | undefined;
  const _checkGrailProximity = async (playerArmy: WorldArmy): Promise<void> => {
    if (!_grailQState || _grailQState.claimed) return;
    if (playerArmy.owner !== "p1") return;

    const triggered = checkGrailProximity(_grailQState, playerArmy, state);
    if (!triggered) return;

    const player = state.players.get("p1");
    if (!player) return;

    const grailKnight = isGrailKnight(player.leaderId);
    const leaderName = player.leaderId ?? "your leader";

    await new Promise<void>((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;";

      const card = document.createElement("div");
      card.style.cssText = "background:#1a1a2e;border:2px solid #ffeeaa;border-radius:12px;padding:24px;max-width:450px;text-align:center;box-shadow:0 0 40px rgba(255,238,170,0.4);";

      const title = document.createElement("div");
      title.textContent = "The Holy Grail!";
      title.style.cssText = "color:#ffeeaa;font-family:monospace;font-size:18px;font-weight:bold;margin-bottom:12px;";
      card.appendChild(title);

      const text = document.createElement("div");
      let desc = "The cursed knights have fallen. Within the chapel, the Grail floats in a column of golden light.\n\n";
      if (grailKnight) {
        desc += `<b style="color:#ffd700">${leaderName}</b> is a true Grail Knight! The sacred chalice resonates with your purity of purpose.\n\n`;
      }
      desc += "Choose your blessing:";
      text.innerHTML = desc.replace(/\n/g, "<br>");
      text.style.cssText = "color:#ccccdd;font-family:monospace;font-size:12px;line-height:1.6;margin-bottom:16px;text-align:left;";
      card.appendChild(text);

      const btnContainer = document.createElement("div");
      btnContainer.style.cssText = "display:flex;gap:12px;justify-content:center;";

      const makeBtn = (label: string, sublabel: string, choice: GrailChoice, color: string) => {
        const btn = document.createElement("button");
        btn.innerHTML = `<b>${label}</b><br><span style="font-size:10px;opacity:0.8">${sublabel}</span>`;
        btn.style.cssText = `background:${color};color:white;border:none;border-radius:8px;padding:10px 16px;font-family:monospace;font-size:12px;cursor:pointer;min-width:140px;`;
        btn.onmouseenter = () => { btn.style.opacity = "0.8"; };
        btn.onmouseleave = () => { btn.style.opacity = "1"; };
        btn.onclick = () => {
          backdrop.remove();
          applyGrailReward(state, _grailQState!, player, choice);
          const rewardText = choice === "heal_wasteland"
            ? "The Grail heals the land! Desert tiles around your capital bloom into grassland. +50 mana."
            : "Eternal Blessing! The Holy Grail joins your armory. +200 gold.";
          worldEventLog.addEvent(`The Holy Grail: ${rewardText}`, 0xffeeaa);
          worldNotification.show("The Holy Grail", rewardText, 0xffeeaa);
          resolve();
        };
        return btn;
      };

      btnContainer.appendChild(makeBtn(
        "Heal the Wasteland",
        "Terraform dead tiles + 50 mana",
        "heal_wasteland",
        "#44aa44",
      ));
      btnContainer.appendChild(makeBtn(
        "Eternal Blessing",
        "Holy Grail item + 200 gold",
        "eternal_blessing",
        "#cc8844",
      ));

      card.appendChild(btnContainer);
      backdrop.appendChild(card);
      document.body.appendChild(backdrop);
    });
  };

  // Leader-specific encounter proximity check
  const _leaderEncState = (state as any)._leaderEncounterState as LeaderEncounterState | undefined;
  const _checkLeaderEncounterProximity = async (playerArmy: WorldArmy): Promise<void> => {
    if (!_leaderEncState) return;
    if (playerArmy.owner !== "p1") return;
    const player = state.players.get("p1");
    if (!player) return;

    const encounter = checkLeaderEncounter(_leaderEncState, playerArmy, player);
    if (!encounter) return;

    // Check if guardians have been defeated (if the quest hex has no army on it)
    const questHex = _leaderEncState.questHexes.get(player.leaderId!);
    if (!questHex) return;
    const questTile = state.grid.getTile(questHex.q, questHex.r);
    if (questTile?.armyId && encounter.guardians) {
      // Guardians still present — player must defeat them first
      return;
    }

    await new Promise<void>((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;";

      const card = document.createElement("div");
      const borderColor = `#${encounter.color.toString(16).padStart(6, "0")}`;
      card.style.cssText = `background:#1a1a2e;border:2px solid ${borderColor};border-radius:12px;padding:24px;max-width:420px;text-align:center;box-shadow:0 0 30px ${borderColor}66;`;

      const title = document.createElement("div");
      title.textContent = encounter.dialogTitle;
      title.style.cssText = `color:${borderColor};font-family:monospace;font-size:16px;font-weight:bold;margin-bottom:12px;`;
      card.appendChild(title);

      const text = document.createElement("div");
      text.innerHTML = encounter.dialogText.replace(/\n/g, "<br>");
      text.style.cssText = "color:#ccccdd;font-family:monospace;font-size:12px;line-height:1.6;margin-bottom:16px;text-align:left;";
      card.appendChild(text);

      // Show rewards
      const rewards: string[] = [];
      if (encounter.itemReward) rewards.push(`<b style="color:#ffdd44">${encounter.itemReward.replace(/_/g, " ")}</b> obtained!`);
      if (encounter.goldReward > 0) rewards.push(`<b style="color:#ffcc44">+${encounter.goldReward} gold</b>`);
      if (encounter.manaReward > 0) rewards.push(`<b style="color:#8888ff">+${encounter.manaReward} mana</b>`);
      if (encounter.foodReward > 0) rewards.push(`<b style="color:#44cc44">+${encounter.foodReward} food</b>`);
      if (rewards.length > 0) {
        const rewardDiv = document.createElement("div");
        rewardDiv.innerHTML = rewards.join(" &nbsp; ");
        rewardDiv.style.cssText = "color:#ccccdd;font-family:monospace;font-size:11px;margin-bottom:16px;padding:8px;background:#222233;border-radius:6px;";
        card.appendChild(rewardDiv);
      }

      const btn = document.createElement("button");
      btn.textContent = "Claim Reward";
      btn.style.cssText = `background:${borderColor};color:white;border:none;border-radius:6px;padding:8px 24px;font-family:monospace;font-size:13px;cursor:pointer;`;
      btn.onmouseenter = () => { btn.style.opacity = "0.8"; };
      btn.onmouseleave = () => { btn.style.opacity = "1"; };
      btn.onclick = () => {
        backdrop.remove();
        completeLeaderEncounter(_leaderEncState, player, encounter);
        worldEventLog.addEvent(`${encounter.title}: ${encounter.description}`, encounter.color);
        worldNotification.show(encounter.title, encounter.description, encounter.color);
        resolve();
      };
      card.appendChild(btn);

      backdrop.appendChild(card);
      document.body.appendChild(backdrop);
    });
  };

  // Avalon / Morgaine proximity dialogs — triggered when a player unit first approaches Avalon
  let _avalonDialogShown = false;
  let _morgaineDialogShown = false;

  /** Find the hex position of Morgaine's capital (Avalon). */
  const _getAvalonHex = (): { q: number; r: number } | null => {
    for (const city of state.cities.values()) {
      if (city.owner === "morgaine" && city.isCapital) return city.position;
    }
    return null;
  };

  /** Show Avalon dialog at 2 tiles range, Morgaine dialog at 1 tile range. */
  const _checkAvalonProximity = async (playerArmy: WorldArmy): Promise<void> => {
    if (playerArmy.owner !== "p1") return;
    if (_avalonDialogShown && _morgaineDialogShown) return;

    const avalonHex = _getAvalonHex();
    if (!avalonHex) return;

    const dist = hexDistance(playerArmy.position, avalonHex);

    // Avalon textbox at 2 tiles range
    if (!_avalonDialogShown && dist <= 2) {
      _avalonDialogShown = true;
      await new Promise<void>((resolve) => {
        worldIntroDialog.onDone = resolve;
        worldIntroDialog.show([AVALON_PROXIMITY_PAGE]);
      });
    }

    // Morgaine textbox at 1 tile range
    if (!_morgaineDialogShown && dist <= 1) {
      _morgaineDialogShown = true;
      await new Promise<void>((resolve) => {
        worldIntroDialog.onDone = resolve;
        worldIntroDialog.show([MORGAINE_PROXIMITY_PAGE]);
      });
    }
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

      // Check for Camlann special battle
      const _cState = (state as any)._camlannState as ReturnType<typeof createCamlannState> | undefined;
      const defOwner = defender?.owner ?? "garrison";
      if (_cState && isCamlannBattle(state, _cState, attacker.owner, defOwner)) {
        worldEventLog.addEvent("THE BATTLE OF CAMLANN! Arthur and Mordred clash in their final, fateful battle!", 0xff4444);
        worldNotification.show("The Battle of Camlann", "Father and son meet on the field of destiny. Only one shall prevail!", 0xff4444);
      }

      const battleLabel = battle.type === "siege"
        ? `Siege at (${battle.hex.q},${battle.hex.r})`
        : `Battle at (${battle.hex.q},${battle.hex.r})`;
      worldEventLog.addEvent(`${battleLabel}: ${attacker.owner} vs ${defOwner}`, 0xff6644);

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
      const aiPlayer = state.players.get(aiPid);
      if (aiPlayer) processAIDiplomacy(state, aiPlayer);
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

      // Display Morgaine escalation events from the turn cycle
      for (const evt of lastMorgaineEvents) {
        worldEventLog.addEvent(`${evt.title}: ${evt.description}`, evt.color);
        worldNotification.show(evt.title, evt.description, evt.color);
      }

      // Try to spawn the Grail Chapel (after turn 15, 20% chance per turn)
      const _grailState = (state as any)._grailQuestState as ReturnType<typeof createGrailQuestState> | undefined;
      if (_grailState && !_grailState.chapelHex) {
        const grailEvt = trySpawnGrailChapel(state, _grailState);
        if (grailEvt) {
          worldEventLog.addEvent(`${grailEvt.title}: ${grailEvt.description}`, grailEvt.color);
          worldNotification.show(grailEvt.title, grailEvt.description, grailEvt.color);
        }
      }

      // Check for Camlann — Arthur vs Mordred war declaration (after turn 40)
      const _camlannSt = (state as any)._camlannState as ReturnType<typeof createCamlannState> | undefined;
      if (_camlannSt) {
        const camlannEvt = processCamlann(state, _camlannSt);
        if (camlannEvt) {
          worldEventLog.addEvent(`${camlannEvt.title}: ${camlannEvt.description}`, camlannEvt.color);
          worldNotification.show(camlannEvt.title, camlannEvt.description, camlannEvt.color);
        }
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

          await _checkLeaderFirstEncounter(army);
          await _checkMordredProximity(army);
          await _checkMorgaineProximity(army);
          await _checkSwordProximity(army);
          await _checkLeaderEncounterProximity(army);
          await _checkGrailProximity(army);
          await _checkAvalonProximity(army);
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

            await _checkLeaderFirstEncounter(army);
            await _checkMordredProximity(army);
            await _checkMorgaineProximity(army);
            await _checkSwordProximity(army);
            await _checkLeaderEncounterProximity(army);
            await _checkGrailProximity(army);
            await _checkAvalonProximity(army);
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
      if (worldIntroDialog.isVisible) { worldIntroDialog.hide(); return; }
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

        await _checkLeaderFirstEncounter(army);
        await _checkMordredProximity(army);
        await _checkMorgaineProximity(army);
        await _checkSwordProximity(army);
        await _checkLeaderEncounterProximity(army);
        await _checkGrailProximity(army);
        await _checkAvalonProximity(army);

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
    // Show world intro story dialog for new games
    worldIntroDialog.show();
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
  p2LeaderId?: LeaderId,
  p2RaceId?: RaceId,
): Promise<void> {
  // Clear all EventBus listeners from previous game/wave to prevent accumulation
  EventBus.clear();

  // Clear old world layers (units, buildings, background, fx, groundfx) so
  // sprites from a previous wave don't linger on the new map.
  viewManager.clearWorld();

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
      // Apply Grail Greed Corruption modifiers to the battle
      if (_waveState?.corruption.enabled) {
        applyCorruptionModifiers(state, _waveState.corruption);
      }
      // Apply pending wave events (spawn units)
      if (_waveState?.pendingEvent) {
        const ev = _waveState.pendingEvent;
        const midX = Math.floor(mapSize.width / 2);
        const midY = Math.floor(mapSize.height / 2);
        if (ev.type === "lady_of_the_lake") {
          // Spawn 1 cleric per wave number for the player
          const clericCount = _waveState.wave;
          for (let i = 0; i < clericCount; i++) {
            const id = `event-cleric-${i}`;
            const px = midX + Math.floor(Math.random() * 6) - 3;
            const py = midY + Math.floor(Math.random() * 6) - 3;
            const unit = createUnit({
              id,
              type: UnitType.CLERIC,
              owner: "p1",
              position: { x: px, y: py },
            });
            state.units.set(id, unit);
            EventBus.emit("unitSpawned", { unitId: id, buildingId: "", position: { x: px, y: py } });
          }
        } else if (ev.type === "rogue_mage") {
          // Spawn a random tier 1-3 mage hostile to both (neutral)
          const mageTypes = [
            UnitType.FIRE_MAGE, UnitType.STORM_MAGE,
            UnitType.COLD_MAGE, UnitType.DISTORTION_MAGE,
          ];
          const pick = mageTypes[Math.floor(Math.random() * mageTypes.length)];
          const id = `event-rogue-mage`;
          const unit = createUnit({
            id,
            type: pick,
            owner: NEUTRAL_PLAYER,
            position: { x: midX, y: midY },
          });
          state.units.set(id, unit);
          EventBus.emit("unitSpawned", { unitId: id, buildingId: "", position: { x: midX, y: midY } });
        }
        _waveState.pendingEvent = null;
      }
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
    if (scenarioDef?.p1ExtraGold) {
      const p1 = state.players.get("p1");
      if (p1) p1.gold += scenarioDef.p1ExtraGold;
    }
    // P1 cannot build anything — empty all shops, blueprints, and upgrade inventories
    if (scenarioDef?.p1NoBuild) {
      for (const building of state.buildings.values()) {
        if (building.owner === "p1") {
          building.shopInventory = [];
          building.blueprints = [];
          building.upgradeInventory = [];
        }
      }
    }
    // Pre-purchase upgrades for P1
    if (scenarioDef?.p1StartUpgrades) {
      for (const upgradeType of scenarioDef.p1StartUpgrades) {
        const upgrades = UpgradeSystem.getPlayerUpgrades("p1");
        upgrades.push({ type: upgradeType, level: 1 });
      }
    }
    // Scenario 7: spawn 20 pixies for allied p3
    if (scenarioNum === 7) {
      _setupScenario7(state, mapSize.width, mapSize.height);
    }
    // Scenario 5: spawn Dark Savant + enemies + enemy towers
    if (scenarioNum === 5) {
      _setupScenario23(state, mapSize.width, mapSize.height);
    }
    // Scenario 25: spawn tier 7 AI units at P2's corners
    if (scenarioNum === 25) {
      _setupScenario24(state, mapSize.width, mapSize.height);
    }
    // Arthurian scenario setups (9–23)
    if (scenarioNum === 9) _setupScenario9(state, mapSize.width, mapSize.height);
    if (scenarioNum === 10) _setupScenario10(state, mapSize.width, mapSize.height);
    if (scenarioNum === 11) _setupScenario11(state, mapSize.width, mapSize.height);
    if (scenarioNum === 12) _setupScenario12(state, mapSize.width, mapSize.height);
    if (scenarioNum === 13) _setupScenario13(state, mapSize.width, mapSize.height);
    if (scenarioNum === 14) _setupScenario14(state, mapSize.width, mapSize.height);
    if (scenarioNum === 15) _setupScenario15(state, mapSize.width, mapSize.height);
    if (scenarioNum === 16) _setupScenario16(state, mapSize.width, mapSize.height);
    if (scenarioNum === 17) _setupScenario17(state, mapSize.width, mapSize.height);
    if (scenarioNum === 18) _setupScenario18(state, mapSize.width, mapSize.height);
    if (scenarioNum === 19) _setupScenario19(state, mapSize.width, mapSize.height);
    if (scenarioNum === 20) _setupScenario20(state, mapSize.width, mapSize.height);
    if (scenarioNum === 21) _setupScenario21(state, mapSize.width, mapSize.height);
    if (scenarioNum === 22) _setupScenario22(state, mapSize.width, mapSize.height);
    if (scenarioNum === 23) _setupScenario23_dragons(state, mapSize.width, mapSize.height);
  }

  // Apply P1's equipped armory items (hero stat bonuses)
  state.p1ArmoryItems = armoryOverride ?? armoryScreen.selectedItems;

  // Apply the chosen leader's passive bonus to P1
  _applyLeaderBonus(state, "p1", leaderId, mapSize);

  // Apply the chosen race to P1 (sets p1RaceId and wires faction hall inventory)
  _applyRace(state, "p1", raceId);

  // Apply P2 leader bonus and race if provided (battlefield mode)
  if (p2LeaderId) {
    _applyLeaderBonus(state, "p2", p2LeaderId, mapSize);
  }
  if (p2RaceId) {
    _applyRace(state, "p2", p2RaceId);
  }

  // Apply forced AI race if the scenario specifies one
  if (scenarioDef?.aiRace) {
    _applyRace(state, "p2", scenarioDef.aiRace);
  }

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

  // Scenario 7: zoom out to show the full double-size map, then zoom in
  if (gameMode === GameMode.CAMPAIGN && scenarioNum === 7) {
    viewManager.camera.fitMap();
    setTimeout(() => {
      viewManager.camera.startCinematicZoom(1.5);
    }, 1500);
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

  // Block FX
  blockFX.init(viewManager, state);
  viewManager.onUpdate((_s, dt) => blockFX.update(dt));
  CombatOptions.critEnabled = settingsScreen.critEnabled;
  CombatOptions.blockEnabled = settingsScreen.blockEnabled;

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
    victoryScreen.isBattlefield = false;
    victoryScreen.battlefieldGold = 0;
    victoryScreen.waveNumber = _waveState.wave;
    victoryScreen.corruptionLevel = _waveState.corruption.corruptionLevel;
    victoryScreen.totalGoldSpent = _waveState.totalGoldSpent;
    victoryScreen.lastRoundGoldSpent = _waveLastRoundGold;
    victoryScreen.enemyGoldThisRound = _waveState.lastEnemyGold;
    victoryScreen.enemyGoldTotal = _waveState.totalEnemyGold;
    victoryScreen.p1Roster = _worldBattleRosters?.p1Roster ?? [];
    victoryScreen.p2Roster = _worldBattleRosters?.p2Roster ?? [];
  } else if (isBattlefieldSetup && _worldBattleRosters) {
    victoryScreen.waveNumber = 0;
    victoryScreen.isBattlefield = true;
    victoryScreen.battlefieldGold = menuScreen.battlefieldGold;
    victoryScreen.corruptionLevel = 0;
    victoryScreen.totalGoldSpent = 0;
    victoryScreen.lastRoundGoldSpent = 0;
    victoryScreen.enemyGoldThisRound = 0;
    victoryScreen.enemyGoldTotal = 0;
    victoryScreen.p1Roster = _worldBattleRosters.p1Roster;
    victoryScreen.p2Roster = _worldBattleRosters.p2Roster;
  } else {
    victoryScreen.waveNumber = 0;
    victoryScreen.isBattlefield = false;
    victoryScreen.battlefieldGold = 0;
    victoryScreen.corruptionLevel = 0;
    victoryScreen.totalGoldSpent = 0;
    victoryScreen.lastRoundGoldSpent = 0;
    victoryScreen.enemyGoldThisRound = 0;
    victoryScreen.enemyGoldTotal = 0;
    victoryScreen.p1Roster = [];
    victoryScreen.p2Roster = [];
  }
  victoryScreen.init(viewManager, state);

  // Battle stats (skip the separate stats overlay in wave mode — the
  // victory screen already shows wave economy info)
  battleStatsTracker.reset();
  battleStatsTracker.init(state);
  if (!_waveState) {
    battleStatsScreen.init(viewManager, state);
  }

  // Wave mode: collect survivors immediately at RESOLVE (before the phase
  // timer clears them) and let "NEXT WAVE" button open the shop.
  if (_waveState) {
    const ws = _waveState;

    // Snapshot survivors the moment RESOLVE fires — the phase timer will
    // clear state.units after RESOLVE_DURATION seconds.
    EventBus.on("phaseChanged", ({ phase }) => {
      if (phase !== GamePhase.RESOLVE) return;
      const survivorCounts = new Map<UnitType, number>();
      for (const u of state.units.values()) {
        if (u.owner === "p1" && u.hp > 0) {
          if (u.id.startsWith("summoned-") || u.id.startsWith("imp-summoned-")) continue;
          survivorCounts.set(u.type, (survivorCounts.get(u.type) ?? 0) + 1);
        }
      }
      ws.survivingUnits = [];
      for (const [type, count] of survivorCounts) {
        ws.survivingUnits.push({ type, count });
      }

      // On defeat, save best run and delete wave save
      if (state.winnerId !== "p1") {
        _saveWaveBestRun({
          wave: ws.wave,
          totalGoldSpent: ws.totalGoldSpent,
          raceId: ws.playerRaceId,
          leaderId: ws.playerLeaderId,
          date: new Date().toISOString().slice(0, 10),
        });
        localStorage.removeItem(WAVE_SAVE_KEY);
        // Set best run info on victory screen for display
        victoryScreen.waveBestRun = _getWaveBestWave();
      }
    });

    victoryScreen.onNextWave = () => {
      // Hide the battle map, minimap, HUD so the shop has a clean background
      viewManager.clearWorld();
      minimap.container.visible = false;
      hud.container.visible = false;
      victoryScreen.container.visible = false;

      ws.wave++;
      let nextGold = 1000 + (ws.leftoverGold ?? 0) + (ws.bonusGold ?? 0);
      ws.bonusGold = 0;
      ws.leftoverGold = 0;

      // Roll random event if enabled
      let pendingEvent: PendingWaveEvent | null = null;
      if (ws.randomEvents) {
        pendingEvent = _rollWaveEvent(ws.wave);
        if (pendingEvent) {
          ws.pendingEvent = pendingEvent;
          if (pendingEvent.type === "gold_rush") {
            nextGold += 200;
            ws.pendingEvent = null; // no spawn needed
          }
        }
      }

      // Chain: Merlin compliment → event dialog → shop
      const openShop = () => _startNextWaveShop(ws, nextGold);

      const showEventThenShop = () => {
        if (pendingEvent) {
          _showMerlinWaveCompliment(pendingEvent.description, openShop);
        } else {
          openShop();
        }
      };

      // Merlin compliment every 10 waves
      const complimentWave = ws.wave - 1; // just won this wave
      if (complimentWave % 10 === 0 && complimentWave > 0) {
        const msg = MERLIN_COMPLIMENTS[complimentWave] ?? MERLIN_COMPLIMENT_DEFAULT;
        _showMerlinWaveCompliment(msg, showEventThenShop);
      } else {
        showEventThenShop();
      }
    };
  }

  // World battle play mode: intercept RESOLVE to return to world mode
  // (skip for menu-started battlefield and wave mode — they use the victory screen)
  if (_worldBattleRosters && !_worldBattleRosters.battleMeta?.waveMode && !_worldBattleRosters.battleMeta?.menuBattlefield) {
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
  } else if (_worldBattleRosters?.battleMeta?.menuBattlefield) {
    // Menu battlefield: clear rosters, victory screen handles "back to menu"
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

  // Grail Greed Corruption — per-tick and unitDied hooks
  if (_waveState?.corruption.enabled && _waveState.corruption.activeModifiers.length > 0) {
    const cs = _waveState.corruption;
    viewManager.onUpdate((s, dt) => {
      if (s.phase === GamePhase.BATTLE) {
        tickCorruptionModifiers(s, cs, dt);
      }
    });
    EventBus.on("unitDied", ({ unitId }) => {
      const unit = state.units.get(unitId);
      if (unit) {
        onCorruptionUnitDied(state, cs, unit);
      }
    });
  }

  // Start cinematic speed ramp for battlefield campaign scenarios
  if (gameMode === GameMode.CAMPAIGN && (scenarioNum === 1 || scenarioNum === 2)) {
    // Start the speed ramp immediately when the game starts
    simLoop.startCinematicSpeed();
  }

  // Scenario 6: Merlin introduces the first skirmish
  if (gameMode === GameMode.CAMPAIGN && scenarioNum === 6) {
    simLoop.pause();
    _showMerlinWaveCompliment(
      "Welcome to your first true skirmish, commander! You now have more gold and greater freedom than before. Build your base, expand your territory, and put your new troops and buildings to good use. Show me what you have learned!",
      () => { simLoop.resume(); },
    );
  }

  // Scenario 8: The Sword in the Stone — Arthur + Merlin
  if (gameMode === GameMode.CAMPAIGN && scenarioNum === 8) {
    simLoop.pause();
    _showMerlinWaveCompliment(
      "Arthur has drawn the sword from the stone, but the lesser kings will not kneel! Three rivals converge on this vast territory. Sir Ector's household rides with you from the southwest — coordinate your forces and prove the boy-king's right to rule!",
      () => { simLoop.resume(); },
      { name: "Arthur", id: "arthur" },
    );
  }

  // Scenario 9: The Green Chapel — Gawain + Merlin
  if (gameMode === GameMode.CAMPAIGN && scenarioNum === 9) {
    simLoop.pause();
    _showMerlinWaveCompliment(
      "The Green Knight awaits at the centre of the map — a creature of ancient magic who regenerates from every wound. Hold the towers along the road to whittle him down. Do not let him reach your castle unchallenged!",
      () => { simLoop.resume(); },
      { name: "Gawain", id: "gawain" },
    );
  }

  // Scenario 13: The Black Knight — Guinevere + Merlin
  if (gameMode === GameMode.CAMPAIGN && scenarioNum === 13) {
    simLoop.pause();
    _showMerlinWaveCompliment(
      "A fearsome Black Knight guards the bridge at the centre of the map. He is nigh invincible without proper arms — use your blacksmith to upgrade your forces before attempting the crossing!",
      () => { simLoop.resume(); },
      { name: "Guinevere", id: "guinevere" },
    );
  }

  // Scenario 14: The Questing Beast — Pellinore + Merlin
  if (gameMode === GameMode.CAMPAIGN && scenarioNum === 14) {
    simLoop.pause();
    _showMerlinWaveCompliment(
      "The Questing Beast roams the battlefield — a creature of terrible power that attacks all who cross its path. Slay it for gold, but beware: it will return! You must also contend with a rival king. This is the midpoint of the campaign, commander.",
      () => { simLoop.resume(); },
      { name: "Pellinore", id: "pellinore" },
    );
  }

  // Scenario 19: Lancelot's Betrayal — Lancelot + Merlin
  if (gameMode === GameMode.CAMPAIGN && scenarioNum === 19) {
    simLoop.pause();
    _showMerlinWaveCompliment(
      "Lancelot's treachery has split the Round Table! Neutral knights are scattered across the map — send your diplomats to win their allegiance before the enemy reaches them. The fate of Camelot depends on whose banner they rally to!",
      () => { simLoop.resume(); },
      { name: "Lancelot", id: "lancelot" },
    );
  }

  // Scenario 23: The Dragon of the White Tower — Nimue + Merlin
  if (gameMode === GameMode.CAMPAIGN && scenarioNum === 23) {
    simLoop.pause();
    _showMerlinWaveCompliment(
      "The two dragons beneath Vortigern's tower are loosed! The Red Dragon of Britain fights at your side, but the White Dragon serves the enemy. Wild frost dragons descend from the north — command the skies or be burned from them!",
      () => { simLoop.resume(); },
      { name: "Nimue", id: "nimue" },
    );
  }

  // Scenario 25: Merlin warns the player about the very hard end battle
  if (gameMode === GameMode.CAMPAIGN && scenarioNum === 25) {
    simLoop.pause();
    _showMerlinWaveCompliment(
      "Beware, commander! I sense a terrible darkness gathering. The enemy has unleashed ancient giants and archmages of unimaginable power. This is the very hard end battle — prepare yourself, for there will be no mercy!",
      () => { simLoop.resume(); },
    );
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

  // ---------------------------------------------------------------------------
  // Escape menu overlay (Resume / Back to Main Menu)
  // ---------------------------------------------------------------------------
  const escMenuOverlay = new Container();
  escMenuOverlay.eventMode = "static";
  escMenuOverlay.visible = false;

  const sw = viewManager.screenWidth;
  const sh = viewManager.screenHeight;

  const escBg = new Graphics()
    .rect(0, 0, sw, sh)
    .fill({ color: 0x000000, alpha: 0.55 });
  escMenuOverlay.addChild(escBg);

  const panelW = 280;
  const panelH = 180;
  const panelX = (sw - panelW) / 2;
  const panelY = (sh - panelH) / 2;

  const escPanel = new Graphics()
    .roundRect(panelX, panelY, panelW, panelH, 8)
    .fill({ color: 0x10102a, alpha: 0.95 })
    .roundRect(panelX, panelY, panelW, panelH, 8)
    .stroke({ color: 0xffd700, alpha: 0.5, width: 1.5 });
  escMenuOverlay.addChild(escPanel);

  const escTitle = new Text({
    text: "PAUSED",
    style: new TextStyle({
      fontFamily: "monospace", fontSize: 24, fill: 0xffd700,
      fontWeight: "bold", letterSpacing: 4,
    }),
  });
  escTitle.anchor.set(0.5, 0);
  escTitle.position.set(sw / 2, panelY + 16);
  escMenuOverlay.addChild(escTitle);

  const escBtnW = panelW - 40;
  const escBtnH = 38;

  const makeEscBtn = (label: string, y: number, bgCol: number, borderCol: number, textCol: number, onClick: () => void) => {
    const c = new Container();
    c.eventMode = "static";
    c.cursor = "pointer";
    const bg = new Graphics()
      .roundRect(0, 0, escBtnW, escBtnH, 6)
      .fill({ color: bgCol, alpha: 0.9 })
      .roundRect(0, 0, escBtnW, escBtnH, 6)
      .stroke({ color: borderCol, alpha: 0.6, width: 1 });
    const txt = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 14, fill: textCol, fontWeight: "bold",
      }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(escBtnW / 2, escBtnH / 2);
    c.addChild(bg, txt);
    c.position.set(panelX + 20, y);
    c.on("pointerover", () => { bg.alpha = 0.7; });
    c.on("pointerout", () => { bg.alpha = 1; });
    c.on("pointertap", onClick);
    return c;
  };

  let escMenuOpen = false;

  const hideEscMenu = () => {
    escMenuOverlay.visible = false;
    escMenuOpen = false;
    if (simLoop.isPaused) {
      simLoop.resume();
      pauseOverlay.visible = false;
    }
  };

  const showEscMenu = () => {
    if (!simLoop.isPaused) {
      simLoop.pause();
    }
    pauseOverlay.visible = false; // hide the simple PAUSED text
    escMenuOverlay.visible = true;
    escMenuOpen = true;
  };

  const resumeBtn = makeEscBtn("RESUME", panelY + 60, 0x1a3a1a, 0x44aa66, 0x88ffaa, hideEscMenu);
  const mainMenuBtn = makeEscBtn("BACK TO MAIN MENU", panelY + 60 + escBtnH + 10, 0x3a1a1a, 0xaa4444, 0xff8888, () => {
    window.location.reload();
  });
  escMenuOverlay.addChild(resumeBtn, mainMenuBtn);
  viewManager.addToLayer("ui", escMenuOverlay);

  window.addEventListener("keydown", (e) => {
    // Don't handle keys if a text input or button is focused
    const tag = (document.activeElement?.tagName ?? "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "button") return;

    if (e.code === "Escape" && !e.repeat) {
      e.preventDefault();
      if (escMenuOpen) {
        hideEscMenu();
      } else {
        showEscMenu();
      }
    } else if (e.code === "Space" && !e.repeat) {
      e.preventDefault();
      if (!escMenuOpen) togglePause();
    } else if (e.code === "Digit0" && !e.repeat) {
      simLoop.speedUp();
      hud.showSpeedLabel(simLoop.timeScale);
    } else if (e.code === "Digit9" && !e.repeat) {
      simLoop.speedDown();
      hud.showSpeedLabel(simLoop.timeScale);
    }
  });
}
