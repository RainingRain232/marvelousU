// ---------------------------------------------------------------------------
// Exodus mode — main orchestrator (enhanced)
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";
import { hexKey, hexDistance } from "@world/hex/HexCoord";
import type { HexCoord } from "@world/hex/HexCoord";

import { ExodusConfig, type ExodusDifficulty, getDifficultyConfig } from "./config/ExodusConfig";
import { createExodusState, ExodusPhase, addLogEntry } from "./state/ExodusState";
import type { ExodusState, CaravanPresetData } from "./state/ExodusState";
import { generateExodusMap, revealAround, updateAdjacentHexes } from "./systems/ExodusMapGenerator";
import { ExodusDaySystem } from "./systems/ExodusDaySystem";
import { ExodusResourceSystem } from "./systems/ExodusResourceSystem";
import { ExodusPursuerSystem } from "./systems/ExodusPursuerSystem";
import { ExodusEventSystem } from "./systems/ExodusEventSystem";
import { ExodusCombatBridge } from "./systems/ExodusCombatBridge";

import { ExodusRenderer } from "./view/ExodusRenderer";
import { ExodusHUD } from "./view/ExodusHUD";
import { ExodusEventScreen } from "./view/ExodusEventScreen";
import { ExodusCampScreen } from "./view/ExodusCampScreen";
import { ExodusResultsScreen } from "./view/ExodusResultsScreen";
import { ExodusStartScreen, type CaravanPreset } from "./view/ExodusStartScreen";
import { ExodusCombatScreen, type FormationDef } from "./view/ExodusCombatScreen";
import { ExodusPauseMenu } from "./view/ExodusPauseMenu";

// ---------------------------------------------------------------------------
// ExodusGame
// ---------------------------------------------------------------------------

export class ExodusGame {
  private _state!: ExodusState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;

  // View
  private _renderer = new ExodusRenderer();
  private _hud = new ExodusHUD();
  private _eventScreen = new ExodusEventScreen();
  private _campScreen = new ExodusCampScreen();
  private _resultsScreen = new ExodusResultsScreen();
  private _startScreen = new ExodusStartScreen();
  private _combatScreen = new ExodusCombatScreen();
  private _pauseMenu = new ExodusPauseMenu();

  // Input state
  private _pointerHandler: ((e: { global: { x: number; y: number } }) => void) | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;

  // Animation state
  private _isMoving = false;
  private _lastPreset: CaravanPreset | null = null;
  private _lastDifficulty: ExodusDifficulty = "normal";
  private _isPaused = false;

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._showStartScreen();
  }

  // -------------------------------------------------------------------------
  // Start screen
  // -------------------------------------------------------------------------

  private _showStartScreen(): void {
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    this._startScreen.setStartCallback((difficulty, preset) => {
      viewManager.removeFromLayer("ui", this._startScreen.container);
      this._startScreen.hide();
      this._lastPreset = preset;
      this._lastDifficulty = difficulty;
      this._startGame(difficulty, preset);
    });
    this._startScreen.setBackCallback(() => {
      viewManager.removeFromLayer("ui", this._startScreen.container);
      this._startScreen.hide();
      this.destroy();
      window.dispatchEvent(new Event("exodusExit"));
    });
    this._startScreen.show(sw, sh);
    viewManager.addToLayer("ui", this._startScreen.container);
  }

  // -------------------------------------------------------------------------
  // Start game
  // -------------------------------------------------------------------------

  private _startGame(difficulty: ExodusDifficulty, preset?: CaravanPreset): void {
    const seed = Date.now() % 2147483647;
    const presetData: CaravanPresetData | undefined = preset ? {
      knights: preset.knights, soldiers: preset.soldiers, archers: preset.archers,
      healers: preset.healers, scouts: preset.scouts, craftsmen: preset.craftsmen,
      peasants: preset.peasants, refugees: preset.refugees,
      bonusFood: preset.bonusFood, bonusSupplies: preset.bonusSupplies,
    } : undefined;

    this._state = createExodusState(seed, difficulty, presetData);

    // Generate map
    generateExodusMap(this._state);

    // Calculate initial distance
    this._state.distanceToGoal = hexDistance(this._state.caravanPosition, this._state.goalHex);

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    // Init renderer
    this._renderer.init();
    this._renderer.drawMap(this._state, sw, sh);
    viewManager.addToLayer("background", this._renderer.container);

    // Init HUD
    this._hud.build(sw, sh);
    viewManager.addToLayer("ui", this._hud.container);

    // Wire up system callbacks
    this._wireCallbacks();

    // Input
    this._setupInput();

    // Start with Dawn phase
    this._state.phase = ExodusPhase.DAWN;
    addLogEntry(this._state, "The exodus begins. Camelot has fallen. March westward — toward Avalon.", 0xffd700);

    // Intro sequence
    this._hud.showNotification("The Exodus Begins", 0xffd700);
    const diffLabel = getDifficultyConfig(difficulty).label;
    setTimeout(() => this._hud.showNotification(`Difficulty: ${diffLabel}`, 0xaaaaaa), 800);
    setTimeout(() => {
      if (preset) this._hud.showNotification(preset.name, 0xddaa44);
    }, 1400);

    // Start game loop
    this._tickerCb = (ticker: Ticker) => {
      this._gameLoop(ticker.deltaMS / 1000);
    };
    viewManager.app.ticker.add(this._tickerCb);

    // Begin march phase after intro with first-turn tutorial
    setTimeout(() => {
      if (this._state && this._state.phase === ExodusPhase.DAWN) {
        ExodusDaySystem.advancePhase(this._state);
        this._hud.showNotification("Click a glowing hex to march", 0xdddddd);
        addLogEntry(this._state, "Click any highlighted hex on the map to move your caravan. March westward toward Avalon.", 0x88cc88);
        addLogEntry(this._state, "Each day: March \u2192 Event \u2192 Camp \u2192 Night. Mordred pursues from the east.", 0x88cc88);
        addLogEntry(this._state, "Manage food, supplies, morale, and hope. If hope reaches zero, the exodus fails.", 0xddaa44);
      }
    }, 2200);
  }

  // -------------------------------------------------------------------------
  // Callback wiring
  // -------------------------------------------------------------------------

  private _wireCallbacks(): void {
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    // Phase changes
    ExodusDaySystem.setPhaseCallback((phase) => {
      if (phase === ExodusPhase.GAME_OVER) {
        this._showResults();
      } else if (phase === ExodusPhase.VICTORY) {
        this._state.victory = true;
        this._showResults();
      }
    });

    ExodusDaySystem.setNightEventCallback((text, color) => {
      this._hud.showNotification(text, color);
    });

    // Resource changes — flash HUD
    ExodusResourceSystem.setResourceCallback((resource, oldVal, newVal) => {
      if (resource === "food" && newVal <= 15 && oldVal > 15) {
        this._hud.showNotification("Food running low!", 0xff8844);
      }
      if (resource === "hope" && newVal <= 20 && oldVal > 20) {
        this._hud.showNotification("Hope is fading...", 0xaa44ff);
      }
      if (resource === "morale" && newVal <= 25 && oldVal > 25) {
        this._hud.showNotification("Morale is critical!", 0xff4444);
      }
    });

    ExodusResourceSystem.setMemberChangeCallback((type, member) => {
      if (type === "gain") this._hud.showNotification(`${member.name} joins the caravan!`, 0x44ff44);
      else if (type === "loss") this._hud.showNotification(`${member.name} has been lost`, 0xff4444);
      else if (type === "wounded") this._hud.showNotification(`${member.name} wounded`, 0xff8844);
      else if (type === "healed") this._hud.showNotification(`${member.name} recovered`, 0x44ff44);
    });

    // Pursuer
    ExodusPursuerSystem.setPursuerCallback((pos, dist) => {
      if (dist <= 3 && dist > 1) {
        this._hud.showNotification(`Mordred's host: ${dist} hexes away!`, 0xff2222);
      } else if (dist === 1) {
        this._hud.showNotification("MORDRED IS UPON YOU!", 0xff0000);
      }
    });

    ExodusPursuerSystem.setPursuerCatchCallback(() => {
      this._hud.showNotification("MORDRED'S HOST ATTACKS!", 0xff0000);
    });

    // Events
    ExodusEventSystem.setEventTriggerCallback((event) => {
      this._eventScreen.showEvent(event, sw, sh);
      viewManager.addToLayer("ui", this._eventScreen.container);
    });

    ExodusEventSystem.setOutcomeCallback((outcome) => {
      this._eventScreen.showOutcome(outcome, sw, sh);
    });

    ExodusEventSystem.setCombatTriggerCallback(() => {
      // Will be resolved when event screen closes
    });

    // Event screen callbacks
    this._eventScreen.setChoiceCallback((index) => {
      ExodusEventSystem.resolveChoice(this._state, index);
    });

    this._eventScreen.setContinueCallback(() => {
      viewManager.removeFromLayer("ui", this._eventScreen.container);
      this._eventScreen.hide();

      if (this._state.pendingCombat) {
        this._showCombatScreen();
        return;
      }

      this._state.phase = ExodusPhase.CAMP;
      this._showCamp();
    });

    // Combat screen callbacks
    this._combatScreen.setFightCallback((formation) => {
      viewManager.removeFromLayer("ui", this._combatScreen.container);
      this._combatScreen.hide();
      this._state.formationBonus = { atkMult: formation.atkMult, defMult: formation.defMult };
      this._resolveCombat(formation);
    });

    this._combatScreen.setRetreatCallback(() => {
      viewManager.removeFromLayer("ui", this._combatScreen.container);
      this._combatScreen.hide();
      this._resolveRetreat();
    });

    this._combatScreen.setContinueCallback(() => {
      viewManager.removeFromLayer("ui", this._combatScreen.container);
      this._combatScreen.hide();
      this._state.pendingCombat = false;
      this._state.formationBonus = null; // clear formation after combat
      this._state.phase = ExodusPhase.CAMP;
      this._showCamp();
    });

    // Combat results
    ExodusCombatBridge.setCombatResultCallback((result) => {
      this._combatScreen.showResult(result, sw, sh);
      viewManager.addToLayer("ui", this._combatScreen.container);
    });

    // Camp screen callbacks
    this._campScreen.setContinueCallback(() => {
      viewManager.removeFromLayer("ui", this._campScreen.container);
      this._campScreen.hide();
      this._endDay();
    });

    this._campScreen.setRestCallback(() => {
      this._state.daysRested++;
      ExodusResourceSystem.healWoundedAtCamp(this._state);
      ExodusResourceSystem.adjustMorale(this._state, ExodusConfig.MORALE_REST_BONUS);
      addLogEntry(this._state, "The caravan rests. Wounds heal. Spirits lift.", 0x44ff44);
      this._hud.showNotification("Resting... (+1 day)", 0x44ff44);
      ExodusPursuerSystem.advancePursuer(this._state);
      this._state.day++;
      this._campScreen.show(this._state, sw, sh);
    });

    this._campScreen.setCraftCallback(() => {
      this._state.supplies -= ExodusConfig.SUPPLIES_PER_CRAFT * 3;
      ExodusResourceSystem.adjustMorale(this._state, 3);
      addLogEntry(this._state, "Your craftsmen build defenses for the caravan.", 0x44ff44);
      this._hud.showNotification("Defenses crafted!", 0x44ff44);
      this._campScreen.show(this._state, sw, sh);
    });

    this._campScreen.setForageCallback?.(() => {
      const rng = () => { this._state.seed = (this._state.seed * 16807) % 2147483647; return (this._state.seed - 1) / 2147483646; };
      const found = 5 + Math.floor(rng() * 10);
      this._state.food += found;
      addLogEntry(this._state, `Foraging party found ${found} food.`, 0x44ff44);
      this._hud.showNotification(`Found ${found} food!`, 0x44ff44);
      ExodusPursuerSystem.advancePursuer(this._state);
      this._state.day++;
      this._campScreen.show(this._state, sw, sh);
    });

    this._campScreen.setScoutCallback?.(() => {
      revealAround(this._state, this._state.caravanPosition, 4);
      updateAdjacentHexes(this._state);
      addLogEntry(this._state, "Scouts fan out and map the surrounding terrain.", 0x44ff44);
      this._hud.showNotification("Area scouted!", 0x44ff44);
      this._renderer.drawMap(this._state, sw, sh);
      this._campScreen.show(this._state, sw, sh);
    });

    this._campScreen.setBuildCallback?.((upgradeId) => {
      const upgrade = this._state.upgrades.find((u) => u.id === upgradeId);
      if (upgrade && !upgrade.built) {
        upgrade.built = true;
        this._state.supplies -= 8;
        addLogEntry(this._state, `Built: ${upgrade.name} — ${upgrade.effect}`, 0xffd700);
        this._hud.showNotification(`Built: ${upgrade.name}!`, 0xffd700);
        this._campScreen.show(this._state, sw, sh);
      }
    });

    // Results screen callbacks
    this._resultsScreen.setRetryCallback(() => {
      this._cleanup();
      if (this._lastPreset) {
        this._startGame(this._lastDifficulty, this._lastPreset);
      } else {
        this._startGame(this._lastDifficulty);
      }
    });

    this._resultsScreen.setMenuCallback(() => {
      this.destroy();
      window.dispatchEvent(new Event("exodusExit"));
    });
  }

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------

  private _setupInput(): void {
    this._pointerHandler = (e: { global: { x: number; y: number } }) => {
      if (this._state.phase !== ExodusPhase.MARCH) return;
      if (this._state.paused || this._state.gameOver || this._state.victory || this._isMoving) return;

      const clicked = this._renderer.getClickedHex(e.global.x, e.global.y, this._state);
      if (clicked) {
        this._moveCaravan(clicked);
      }
    };
    viewManager.app.stage.eventMode = "static";
    viewManager.app.stage.on("pointerdown", this._pointerHandler);

    this._keyHandler = (e: KeyboardEvent) => {
      // Don't handle keys during pause (except Escape)
      if (this._isPaused && e.key !== "Escape") return;

      // Number keys for event choices
      if (this._state.phase === ExodusPhase.EVENT && this._state.currentEvent) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= this._state.currentEvent.choices.length) {
          ExodusEventSystem.resolveChoice(this._state, num - 1);
        }
      }

      // Camp shortcuts
      if (this._state.phase === ExodusPhase.CAMP && this._campScreen.container.children.length > 0) {
        if (e.key === "Enter" || e.key === " ") {
          // Break camp
          viewManager.removeFromLayer("ui", this._campScreen.container);
          this._campScreen.hide();
          this._endDay();
        }
      }

      // Combat screen shortcuts
      if (this._state.pendingCombat && this._combatScreen.container.children.length > 0) {
        // 1-4 to select formation
        const fNum = parseInt(e.key);
        if (fNum >= 1 && fNum <= this._combatScreen.formationCount) {
          this._combatScreen.setFormation(fNum - 1);
          this._combatScreen.showPreBattle(this._state, this._state.combatDanger, viewManager.screenWidth, viewManager.screenHeight);
        }
        if (e.key === "f" || e.key === "F") {
          // Fight with selected formation
          const formation = this._combatScreen.getSelectedFormation();
          viewManager.removeFromLayer("ui", this._combatScreen.container);
          this._combatScreen.hide();
          this._state.formationBonus = { atkMult: formation.atkMult, defMult: formation.defMult };
          this._resolveCombat(formation);
        }
        if (e.key === "r" || e.key === "R") {
          // Retreat
          viewManager.removeFromLayer("ui", this._combatScreen.container);
          this._combatScreen.hide();
          this._resolveRetreat();
        }
      }

      // Escape to toggle pause menu
      if (e.key === "Escape" && !this._state.gameOver && !this._state.victory) {
        if (this._isPaused) {
          this._hidePauseMenu();
        } else {
          this._showPauseMenu();
        }
      }
    };
    window.addEventListener("keydown", this._keyHandler);
  }

  // -------------------------------------------------------------------------
  // Movement (with animation delay)
  // -------------------------------------------------------------------------

  private _moveCaravan(target: HexCoord): void {
    const key = hexKey(target.q, target.r);
    const hex = this._state.hexes.get(key);
    if (!hex) return;

    this._isMoving = true;

    // Move caravan
    this._state.caravanPosition = { q: target.q, r: target.r };
    hex.visited = true;
    this._state.totalHexesTraveled++;
    const oldRegion = this._state.currentRegion;
    this._state.currentTerrain = hex.terrain;
    this._state.currentRegion = hex.region;
    this._state.distanceToGoal = hexDistance(this._state.caravanPosition, this._state.goalHex);

    // Reveal surrounding area (scouts + upgrade increase range)
    const scouts = this._state.members.filter((m) => m.role === "scout" && !m.wounded).length;
    const scoutUpgrade = this._state.upgrades.find((u) => u.id === "scout_tower")?.built ? 1 : 0;
    const scoutRange = 1 + Math.min(2, Math.floor(scouts / 2)) + scoutUpgrade;
    revealAround(this._state, target, scoutRange);
    updateAdjacentHexes(this._state);

    // Terrain movement cost — difficult terrain costs extra food and may wound
    const terrainCost = ExodusConfig.TERRAIN_COST[hex.terrain] ?? 1;
    if (terrainCost > 1) {
      const extraFood = Math.ceil((terrainCost - 1) * 3 * (this._state.members.length / 20));
      this._state.food = Math.max(0, this._state.food - extraFood);
      addLogEntry(this._state, `Difficult terrain (${hex.terrain}) costs ${extraFood} extra food.`, 0xff8844);
      this._hud.showNotification(`${hex.terrain}: -${extraFood} food`, 0xff8844);

      // Mountain/swamp wound chance
      if (terrainCost >= 2) {
        const rng = () => { this._state.seed = (this._state.seed * 16807) % 2147483647; return (this._state.seed - 1) / 2147483646; };
        if (rng() < 0.15) {
          ExodusResourceSystem.woundMembers(this._state, 1);
          addLogEntry(this._state, "The treacherous terrain injures a caravan member.", 0xff8844);
        }
      }
    }

    const regionName = ExodusConfig.REGION_DEFS[hex.region].name;
    addLogEntry(this._state, `Marched to ${hex.terrain} in ${regionName}. (${this._state.distanceToGoal} hexes to Avalon)`);

    // Check for victory
    if (target.q === this._state.goalHex.q && target.r === this._state.goalHex.r) {
      this._isMoving = false;
      this._state.victory = true;
      this._state.phase = ExodusPhase.VICTORY;
      addLogEntry(this._state, "You have reached Avalon! The exodus is complete!", 0x44ffaa);
      this._hud.showNotification("AVALON!", 0x44ffaa);
      setTimeout(() => this._showResults(), 2500);
      return;
    }

    // Redraw map
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    this._renderer.drawMap(this._state, sw, sh);

    // Brief pause for movement feel, then check events
    setTimeout(() => {
      this._isMoving = false;

      // Region transition event?
      if (hex.region !== oldRegion) {
        const regionDef = ExodusConfig.REGION_DEFS[hex.region];
        if (regionDef) {
          // Show region lore
          const lore = (regionDef as any).lore;
          if (lore) {
            this._hud.showNotification(regionDef.name, regionDef.color);
            addLogEntry(this._state, lore, regionDef.color);
          }
          // Show transition text
          const transition = ExodusConfig.REGION_TRANSITIONS[hex.region];
          if (transition) {
            setTimeout(() => this._hud.showNotification(transition, 0xaaaaaa), 800);
          }
        }

        // Check for region transition event
        const hasTransition = ExodusEventSystem.checkRegionTransition(this._state, hex.region, oldRegion);
        if (hasTransition) return;
      }

      // Check for boss encounter (10% chance per hex in region, if boss exists)
      const rng = () => { this._state.seed = (this._state.seed * 16807) % 2147483647; return (this._state.seed - 1) / 2147483646; };
      if (rng() < 0.08) {
        const hasBoss = ExodusEventSystem.checkForBoss(this._state);
        if (hasBoss) return;
      }

      // Normal event check
      this._state.phase = ExodusPhase.EVENT;
      const hasEvent = ExodusEventSystem.checkForEvent(this._state);
      if (!hasEvent) {
        this._state.phase = ExodusPhase.CAMP;
        this._showCamp();
      }
    }, 400);
  }

  // -------------------------------------------------------------------------
  // Combat (with tactical screen)
  // -------------------------------------------------------------------------

  private _showCombatScreen(): void {
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    this._combatScreen.showPreBattle(this._state, this._state.combatDanger, sw, sh);
    viewManager.addToLayer("ui", this._combatScreen.container);
  }

  private _resolveCombat(formation?: FormationDef): void {
    this._state.phase = ExodusPhase.BATTLE;

    if (formation) {
      this._state.formationBonus = { atkMult: formation.atkMult, defMult: formation.defMult };
    }

    const result = ExodusCombatBridge.resolveCombat(this._state, this._state.combatDanger);
    // Result screen shown via callback
  }

  private _resolveRetreat(): void {
    this._state.phase = ExodusPhase.BATTLE;
    this._state.pendingCombat = false;

    // Retreat losses
    const rng = () => { this._state.seed = (this._state.seed * 16807) % 2147483647; return (this._state.seed - 1) / 2147483646; };
    const losses = ExodusConfig.RETREAT_STRAGGLER_LOSS_MIN +
      Math.floor(rng() * (ExodusConfig.RETREAT_STRAGGLER_LOSS_MAX - ExodusConfig.RETREAT_STRAGGLER_LOSS_MIN + 1));

    ExodusResourceSystem.removeRandomMembers(this._state, losses);
    this._state.supplies = Math.max(0, this._state.supplies - ExodusConfig.RETREAT_SUPPLY_LOSS);
    ExodusResourceSystem.adjustMorale(this._state, -6);
    this._state.battlesRetreated++;
    this._state.lastBattleResult = "retreat";
    this._state.formationBonus = null;

    addLogEntry(this._state, `Retreat! Lost ${losses} stragglers and supplies in the withdrawal.`, 0xff8844);
    this._hud.showNotification("Retreat!", 0xffaa44);

    setTimeout(() => {
      this._state.phase = ExodusPhase.CAMP;
      this._showCamp();
    }, 1200);
  }

  // -------------------------------------------------------------------------
  // Camp
  // -------------------------------------------------------------------------

  private _showCamp(): void {
    // Heal wounded at camp (check upgrades for bonus healing)
    const bonusHeal = this._state.upgrades.find((u) => u.id === "herbalist_cart")?.built ? 1 : 0;
    const baseHeal = ExodusConfig.WOUNDED_HEAL_PER_CAMP + bonusHeal;
    for (let i = 0; i < baseHeal; i++) {
      const wounded = this._state.members.find((m) => m.wounded);
      if (wounded) {
        wounded.wounded = false;
        wounded.hp = wounded.maxHp;
      }
    }

    // Forge bonus supplies
    if (this._state.upgrades.find((u) => u.id === "mobile_forge")?.built) {
      this._state.supplies += 2;
    }

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    this._campScreen.show(this._state, sw, sh);
    viewManager.addToLayer("ui", this._campScreen.container);
  }

  // -------------------------------------------------------------------------
  // End of day
  // -------------------------------------------------------------------------

  private _endDay(): void {
    this._state.phase = ExodusPhase.NIGHT;

    // Provisions rack food reduction is now handled in ExodusResourceSystem.consumeFood()

    ExodusDaySystem.advancePhase(this._state);

    if (this._state.gameOver || this._state.victory) return;

    // Redraw map
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    this._renderer.drawMap(this._state, sw, sh);
    updateAdjacentHexes(this._state);

    if (this._state.pendingCombat) {
      this._showCombatScreen();
      return;
    }

    this._hud.showNotification(`Day ${this._state.day}`, 0xffd700);

    // Region transition notification
    const currentHex = this._state.hexes.get(hexKey(this._state.caravanPosition.q, this._state.caravanPosition.r));
    if (currentHex) {
      const regionName = ExodusConfig.REGION_DEFS[currentHex.region].name;
      if (currentHex.region !== this._state.currentRegion) {
        setTimeout(() => this._hud.showNotification(`Entering: ${regionName}`, 0xddaa44), 500);
      }
    }

    setTimeout(() => {
      if (this._state && !this._state.gameOver && !this._state.victory) {
        ExodusDaySystem.advancePhase(this._state);
        this._hud.showNotification("Choose your path", 0xdddddd);
      }
    }, 1200);
  }

  // -------------------------------------------------------------------------
  // Results
  // -------------------------------------------------------------------------

  private _showResults(): void {
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    this._resultsScreen.show(this._state, sw, sh);
    viewManager.addToLayer("ui", this._resultsScreen.container);
  }

  // -------------------------------------------------------------------------
  // Pause menu
  // -------------------------------------------------------------------------

  private _showPauseMenu(): void {
    if (this._isPaused) return;
    this._isPaused = true;
    this._state.paused = true;

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    this._pauseMenu.setResumeCallback(() => this._hidePauseMenu());
    this._pauseMenu.setQuitCallback(() => {
      this._hidePauseMenu();
      this.destroy();
      window.dispatchEvent(new Event("exodusExit"));
    });
    this._pauseMenu.show(this._state, sw, sh);
    viewManager.addToLayer("ui", this._pauseMenu.container);
  }

  private _hidePauseMenu(): void {
    if (!this._isPaused) return;
    this._isPaused = false;
    this._state.paused = false;
    viewManager.removeFromLayer("ui", this._pauseMenu.container);
    this._pauseMenu.hide();
  }

  // -------------------------------------------------------------------------
  // Game loop
  // -------------------------------------------------------------------------

  private _gameLoop(dt: number): void {
    if (!this._state) return;

    // Always update HUD notifications (even when paused for fade-out)
    this._hud.updateNotifications(dt);

    if (this._state.paused) return;

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    this._renderer.update(this._state, dt, sw, sh);
    this._hud.update(this._state, sw, sh);
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  private _cleanup(): void {
    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }
    if (this._pointerHandler) {
      viewManager.app.stage.off("pointerdown", this._pointerHandler);
      this._pointerHandler = null;
    }
    if (this._keyHandler) {
      window.removeEventListener("keydown", this._keyHandler);
      this._keyHandler = null;
    }

    this._isPaused = false;

    ExodusDaySystem.cleanup();
    ExodusResourceSystem.cleanup();
    ExodusPursuerSystem.cleanup();
    ExodusEventSystem.cleanup();
    ExodusCombatBridge.cleanup();

    this._renderer.cleanup();
    this._hud.cleanup();
    this._eventScreen.cleanup();
    this._campScreen.cleanup();
    this._resultsScreen.cleanup();
    this._startScreen.cleanup();
    this._combatScreen.cleanup();
    this._pauseMenu.cleanup();

    viewManager.removeFromLayer("background", this._renderer.container);
    viewManager.removeFromLayer("ui", this._hud.container);
    viewManager.removeFromLayer("ui", this._eventScreen.container);
    viewManager.removeFromLayer("ui", this._campScreen.container);
    viewManager.removeFromLayer("ui", this._resultsScreen.container);
    viewManager.removeFromLayer("ui", this._startScreen.container);
    viewManager.removeFromLayer("ui", this._combatScreen.container);
    viewManager.removeFromLayer("ui", this._pauseMenu.container);
    viewManager.clearWorld();
  }

  destroy(): void {
    this._cleanup();
  }
}
