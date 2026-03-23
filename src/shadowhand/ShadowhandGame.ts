// ---------------------------------------------------------------------------
// Shadowhand mode — main orchestrator
// ---------------------------------------------------------------------------

import { Ticker, Graphics } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

import { createShadowhandState, ShadowhandPhase, addLog, seedRng } from "./state/ShadowhandState";
import type { ShadowhandState } from "./state/ShadowhandState";
import type { ShadowhandDifficulty } from "./config/ShadowhandConfig";
import { ShadowhandConfig } from "./config/ShadowhandConfig";
import { createCrewMember, type CrewRole } from "./config/CrewDefs";
import { getEquipmentById } from "./config/EquipmentDefs";
import { getUpgradeById as _getUpgradeById } from "./config/GuildUpgradeDefs";

import { initHeist, updateHeist, decayHeat, consumeEquipment, checkInquisitionThreat, payInquisitionBribe, sufferInquisitionRaid } from "./systems/HeistSystem";
import { generateContracts, generateNews, updateCrewBonds } from "./systems/ContractSystem";
import { saveGame, loadGame, hasSaveGame } from "./systems/SaveSystem";
import {
  moveThiefTo, useSmokeBomb, useSleepDart, useFlashPowder, placeCaltrops,
  unlockDoor, extinguishTorch,
  pickpocketGuard, distractCoin, takedownGuard, shadowMeld,
  applyDisguise, distractTalk, silentLockpick, findSecretDoors,
} from "./systems/ThiefSystem";

import { ShadowhandRenderer } from "./view/ShadowhandRenderer";
import { ShadowhandHUD } from "./view/ShadowhandHUD";
import { ShadowhandStartScreen } from "./view/ShadowhandStartScreen";
import { ShadowhandResultsScreen } from "./view/ShadowhandResultsScreen";
import { ShadowhandPauseMenu } from "./view/ShadowhandPauseMenu";
import { ShadowhandGuildScreen } from "./view/ShadowhandGuildScreen";

export class ShadowhandGame {
  private _state!: ShadowhandState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;

  private _renderer = new ShadowhandRenderer();
  private _hud = new ShadowhandHUD();
  private _startScreen = new ShadowhandStartScreen();
  private _resultsScreen = new ShadowhandResultsScreen();
  private _pauseMenu = new ShadowhandPauseMenu();
  private _guildScreen = new ShadowhandGuildScreen();

  private _fadeOverlay: import("pixi.js").Graphics | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _pointerHandler: ((e: { global: { x: number; y: number } }) => void) | null = null;
  private _isPaused = false;
  private _sw = 0;
  private _sh = 0;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._sw = viewManager.screenWidth;
    this._sh = viewManager.screenHeight;
    this._showStartScreen();
  }

  destroy(): void {
    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }
    if (this._keyHandler) {
      window.removeEventListener("keydown", this._keyHandler);
      this._keyHandler = null;
    }
    this._removePointerHandler();
    this._renderer.destroy();
    this._hud.destroy();
    viewManager.removeFromLayer("ui", this._startScreen.container);
    viewManager.removeFromLayer("ui", this._resultsScreen.container);
    viewManager.removeFromLayer("ui", this._pauseMenu.container);
    viewManager.removeFromLayer("ui", this._guildScreen.container);
    viewManager.removeFromLayer("ui", this._hud.container);
    viewManager.removeFromLayer("background", this._renderer.container);
  }

  // ---------------------------------------------------------------------------
  // Start screen
  // ---------------------------------------------------------------------------

  private _showStartScreen(): void {
    this._startScreen.hasSave = hasSaveGame();
    this._startScreen.setStartCallback((difficulty) => {
      viewManager.removeFromLayer("ui", this._startScreen.container);
      this._startScreen.hide();
      this._startGameWithDifficulty(difficulty);
    });
    this._startScreen.setContinueCallback(() => {
      viewManager.removeFromLayer("ui", this._startScreen.container);
      this._startScreen.hide();
      this._continueGame();
    });
    this._startScreen.setBackCallback(() => {
      viewManager.removeFromLayer("ui", this._startScreen.container);
      this._startScreen.hide();
      this.destroy();
      window.dispatchEvent(new Event("shadowhandExit"));
    });
    this._startScreen.show(this._sw, this._sh);
    viewManager.addToLayer("ui", this._startScreen.container);
  }

  // ---------------------------------------------------------------------------
  // Game init
  // ---------------------------------------------------------------------------

  private _startGameWithDifficulty(difficulty: ShadowhandDifficulty): void {
    const seed = Date.now() % 2147483647;
    this._state = createShadowhandState(seed, difficulty);
    this._showGuildScreen();
  }

  private _continueGame(): void {
    // Create a blank state and load saved data into it
    const seed = Date.now() % 2147483647;
    this._state = createShadowhandState(seed, "journeyman");
    if (loadGame(this._state)) {
      addLog(this._state, "Welcome back to the Shadowhand.");
      this._showGuildScreen();
    } else {
      addLog(this._state, "No save found. Starting fresh.");
      this._showGuildScreen();
    }
  }

  // ---------------------------------------------------------------------------
  // Guild hub
  // ---------------------------------------------------------------------------

  private _showGuildScreen(): void {
    this._state.phase = ShadowhandPhase.GUILD_HUB;
    this._cleanupHeistUI();

    // Check Inquisition threat before showing guild
    this._checkInquisition();

    // Generate fresh contracts and news
    generateContracts(this._state);
    generateNews(this._state);

    // Auto-save progress
    saveGame(this._state);

    this._guildScreen.setHeistCallback((target, crewIds, equipIds) => {
      this._fadeTransition(() => {
        viewManager.removeFromLayer("ui", this._guildScreen.container);
        this._guildScreen.hide();
        this._state.currentTarget = target;
        this._state.selectedCrew = crewIds;
        this._state.selectedEquipment = equipIds;
        this._startHeist();
      }, 400);
    });

    this._guildScreen.setExitCallback(() => {
      viewManager.removeFromLayer("ui", this._guildScreen.container);
      this._guildScreen.hide();
      this.destroy();
      window.dispatchEvent(new Event("shadowhandExit"));
    });

    this._guildScreen.setRecruitCallback((role) => {
      this._recruitCrew(role);
    });

    this._guildScreen.setBuyCallback((equipId) => {
      this._buyEquipment(equipId);
    });

    this._guildScreen.setUpgradeCallback((upgradeId) => {
      this._buyUpgrade(upgradeId);
    });

    this._guildScreen.show(this._state, this._sw, this._sh);
    viewManager.addToLayer("ui", this._guildScreen.container);
  }

  private _checkInquisition(): void {
    const threat = checkInquisitionThreat(this._state);
    if (!threat.threatened) return;

    // Auto-bribe if affordable, otherwise suffer raid
    if (this._state.guild.gold >= threat.bribeCost) {
      payInquisitionBribe(this._state, threat.bribeCost);
      addLog(this._state, `Inquisition averted! Bribed for ${threat.bribeCost}g.`);
    } else {
      sufferInquisitionRaid(this._state);
      addLog(this._state, "The Inquisition raids your guild!");
    }
  }

  private _recruitCrew(role: CrewRole): void {
    if (this._state.guild.gold < 100) return;
    this._state.guild.gold -= 100;
    const id = `crew_${this._state.guild.roster.length}`;
    const rng = seedRng(this._state.seed + this._state.guild.roster.length * 77);
    const member = createCrewMember(role, id, Math.floor(rng() * 10000));
    this._state.guild.roster.push(member);
    addLog(this._state, `Recruited ${member.name} the ${role}.`);
    // Refresh
    this._guildScreen.show(this._state, this._sw, this._sh);
  }

  private _buyEquipment(equipId: string): void {
    const def = getEquipmentById(equipId);
    if (!def) return;
    const cost = this._state.guild.upgrades.has("armory") ? Math.floor(def.cost * 0.8) : def.cost;
    if (this._state.guild.gold < cost) return;
    this._state.guild.gold -= cost;
    this._state.guild.inventory.push({ id: equipId, uses: def.uses });
    addLog(this._state, `Purchased ${def.name}${this._state.guild.upgrades.has("armory") ? " (armory discount)" : ""}.`);
    this._guildScreen.show(this._state, this._sw, this._sh);
  }

  private _buyUpgrade(upgradeId: import("./state/ShadowhandState").GuildUpgradeId): void {
    const def = _getUpgradeById(upgradeId);
    if (!def || this._state.guild.gold < def.cost) return;
    if (this._state.guild.upgrades.has(upgradeId)) return;
    this._state.guild.gold -= def.cost;
    this._state.guild.upgrades.add(upgradeId);
    addLog(this._state, `Guild upgrade: ${def.name}!`);
    this._guildScreen.show(this._state, this._sw, this._sh);
  }

  // ---------------------------------------------------------------------------
  // Heist
  // ---------------------------------------------------------------------------

  private _startHeist(): void {
    initHeist(this._state);

    // Tutorial hints on first heist
    if (!this._state.guild.tutorialDone) {
      this._state.guild.tutorialDone = true;
      addLog(this._state, "\u2139 TUTORIAL: Click to move your thief.");
      addLog(this._state, "\u2139 Tab switches crew. C crouches. Space picks locks.");
      addLog(this._state, "\u2139 E uses your role ability. Q uses secondary.");
      addLog(this._state, "\u2139 Stay in shadows. Avoid guard vision cones.");
      addLog(this._state, "\u2139 Reach an exit point (green arch) to escape!");
    }

    this._renderer.init();
    viewManager.addToLayer("background", this._renderer.container);

    this._hud.build(this._sw, this._sh);
    viewManager.addToLayer("ui", this._hud.container);

    this._setupInput();

    this._tickerCb = (ticker: Ticker) => this._updateHeist(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  private _updateHeist(dt: number): void {
    if (this._isPaused) return;
    if (!this._state.heist) return;

    if (this._state.phase === ShadowhandPhase.HEIST) {
      updateHeist(this._state, dt);

      // Render
      this._renderer.updateCamera(this._state.heist, this._sw, this._sh, dt);
      this._renderer.drawMap(this._state.heist);
      this._renderer.drawLightOverlay(this._state.heist);
      this._renderer.drawFog(this._state.heist);
      this._renderer.drawEntities(this._state.heist);
      this._hud.update(this._state, this._sw, this._sh);

      // Check phase transitions (phase may have been mutated by updateHeist)
      const phase = this._state.phase as ShadowhandPhase;
      if (phase === ShadowhandPhase.RESULTS ||
          phase === ShadowhandPhase.VICTORY ||
          phase === ShadowhandPhase.GAME_OVER) {
        this._showResults();
      }
    }
  }

  private _showResults(): void {
    // Audio cue for heist outcome
    if (this._state.phase === ShadowhandPhase.VICTORY) {
      audioManager.playJingle("victory");
    } else if (this._state.phase === ShadowhandPhase.GAME_OVER) {
      // No jingle for defeat (silence is powerful)
    } else {
      audioManager.playJingle("level_up"); // heist complete jingle
    }
    this._cleanupHeistUI();

    this._resultsScreen.setContinueCallback(() => {
      this._fadeTransition(() => {
        viewManager.removeFromLayer("ui", this._resultsScreen.container);
        this._resultsScreen.hide();
        decayHeat(this._state);
        this._showGuildScreen();
      });
    });
    this._resultsScreen.setMenuCallback(() => {
      viewManager.removeFromLayer("ui", this._resultsScreen.container);
      this._resultsScreen.hide();
      this.destroy();
      window.dispatchEvent(new Event("shadowhandExit"));
    });
    this._resultsScreen.show(this._state, this._sw, this._sh);
    viewManager.addToLayer("ui", this._resultsScreen.container);
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private _setupInput(): void {
    this._keyHandler = (e: KeyboardEvent) => this._handleKey(e);
    window.addEventListener("keydown", this._keyHandler);

    // Left-click: move selected thief
    this._pointerHandler = (e: { global: { x: number; y: number }; button?: number }) => {
      if (this._isPaused || !this._state.heist) return;
      const heist = this._state.heist;
      const tx = (e.global.x - this._renderer["_offsetX"]) / ShadowhandConfig.TILE_SIZE;
      const ty = (e.global.y - this._renderer["_offsetY"]) / ShadowhandConfig.TILE_SIZE;

      const selected = heist.thieves.find(t => t.selected && t.alive && !t.captured && !t.escaped);
      if (selected) {
        moveThiefTo(heist, selected.id, tx, ty);
      }
    };
    viewManager.app.stage.eventMode = "static";
    viewManager.app.stage.on("pointerdown", this._pointerHandler);

    // Right-click: cancel movement (stop thief in place)
    const rightClickHandler = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        if (!this._state.heist) return;
        const sel = this._state.heist.thieves.find(t => t.selected && t.alive && !t.captured && !t.escaped);
        if (sel) {
          sel.activePath = [];
          sel.moving = false;
          sel.targetX = sel.x;
          sel.targetY = sel.y;
          addLog(this._state, "Movement cancelled.");
        }
      }
    };
    window.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("mousedown", rightClickHandler);
    // Store for cleanup
    (this as any)._rightClickHandler = rightClickHandler;
  }

  private _removePointerHandler(): void {
    if (this._pointerHandler) {
      viewManager.app.stage.off("pointerdown", this._pointerHandler);
      this._pointerHandler = null;
    }
    if ((this as any)._rightClickHandler) {
      window.removeEventListener("mousedown", (this as any)._rightClickHandler);
      (this as any)._rightClickHandler = null;
    }
  }

  private _handleKey(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      if (this._isPaused) {
        this._resumeFromPause();
      } else {
        this._showPause();
      }
      return;
    }

    if (this._isPaused) return;
    const heist = this._state.heist;
    if (!heist) return;

    const sel = heist.thieves.find(t => t.selected && t.alive && !t.captured && !t.escaped);

    switch (e.key) {
      case "Tab": {
        e.preventDefault();
        const alive = heist.thieves.filter(t => t.alive && !t.captured && !t.escaped);
        if (alive.length <= 1) return;
        const current = alive.findIndex(t => t.selected);
        for (const t of alive) t.selected = false;
        const next = (current + 1) % alive.length;
        alive[next].selected = true;
        break;
      }
      case "c":
      case "C": {
        if (sel) {
          sel.crouching = !sel.crouching;
          addLog(this._state, sel.crouching ? "Crouching..." : "Standing up.");
        }
        break;
      }
      case " ": {
        // Unlock adjacent door — sapmaster does it silently
        e.preventDefault();
        if (!sel) return;
        const tx = Math.round(sel.x), ty = Math.round(sel.y);
        if (sel.role === "sapmaster") {
          if (silentLockpick(heist, sel.id)) {
            addLog(this._state, "Silently picked the lock.");
          } else {
            addLog(this._state, "No locked door nearby.");
          }
        } else {
          const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
          let opened = false;
          for (const [dx, dy] of dirs) {
            if (unlockDoor(heist, tx + dx, ty + dy, ShadowhandConfig.NOISE_LOCKPICK)) {
              addLog(this._state, "Door unlocked (noisy).");
              opened = true;
              break;
            }
          }
          if (!opened) addLog(this._state, "No locked door nearby.");
        }
        break;
      }
      // E = Role-specific ability
      case "e":
      case "E": {
        if (!sel) return;
        this._useRoleAbility(sel);
        break;
      }
      // Q = Secondary role ability
      case "q":
      case "Q": {
        if (!sel) return;
        this._useSecondaryAbility(sel);
        break;
      }
      // 1-4 = Equipment items
      case "1": {
        if (!sel) return;
        if (consumeEquipment(this._state, "smoke_bomb")) {
          useSmokeBomb(heist, sel.x, sel.y, 3, 8);
          addLog(this._state, "Smoke bomb deployed!");
        } else {
          addLog(this._state, "No smoke bombs left.");
        }
        break;
      }
      case "2": {
        if (!sel) return;
        if (consumeEquipment(this._state, "sleep_dart")) {
          if (useSleepDart(heist, sel.x, sel.y, 6, 15)) {
            addLog(this._state, "Guard put to sleep.");
          } else {
            addLog(this._state, "No guard in range.");
            // Refund
            const item = this._state.guild.inventory.find(i => i.id === "sleep_dart");
            if (item) item.uses++;
          }
        } else {
          addLog(this._state, "No sleep darts left.");
        }
        break;
      }
      case "3": {
        if (!sel) return;
        if (consumeEquipment(this._state, "flash_powder")) {
          useFlashPowder(heist, sel.x, sel.y, 3, 5);
          addLog(this._state, "Flash! Guards stunned.");
        } else {
          addLog(this._state, "No flash powder left.");
        }
        break;
      }
      case "4": {
        if (!sel) return;
        if (consumeEquipment(this._state, "caltrops")) {
          placeCaltrops(heist, sel.x, sel.y, 2);
          addLog(this._state, "Caltrops scattered.");
        } else {
          addLog(this._state, "No caltrops left.");
        }
        break;
      }
      case "+":
      case "=": {
        heist.speedMult = Math.min(4, heist.speedMult + 0.5);
        break;
      }
      case "-": {
        heist.speedMult = Math.max(0.5, heist.speedMult - 0.5);
        break;
      }
      // Crew selection hotkeys (F1-F4)
      case "F1": case "F2": case "F3": case "F4": {
        e.preventDefault();
        const crewIdx = parseInt(e.key[1]) - 1;
        const alive = heist.thieves.filter(t => t.alive && !t.captured && !t.escaped);
        if (crewIdx < alive.length) {
          for (const t of heist.thieves) t.selected = false;
          alive[crewIdx].selected = true;
        }
        break;
      }
      // Rally to exit (R key) — send ALL alive thieves to nearest exit
      case "r":
      case "R": {
        const aliveCrew = heist.thieves.filter(t => t.alive && !t.captured && !t.escaped);
        if (heist.map.exitPoints.length > 0 && aliveCrew.length > 0) {
          for (const thief of aliveCrew) {
            // Find nearest exit
            let nearestExit = heist.map.exitPoints[0];
            let nearestDist = Infinity;
            for (const ep of heist.map.exitPoints) {
              const dx = ep.x - thief.x, dy = ep.y - thief.y;
              const d = dx * dx + dy * dy;
              if (d < nearestDist) { nearestDist = d; nearestExit = ep; }
            }
            moveThiefTo(heist, thief.id, nearestExit.x, nearestExit.y);
          }
          addLog(this._state, "Rally! All crew heading for exit.");
          heist.announcements.push({ text: "RALLY TO EXIT!", color: 0x44ff44, timer: 2 });
        }
        break;
      }
      // Stop all movement (S key)
      case "s":
      case "S": {
        for (const thief of heist.thieves) {
          if (!thief.alive || thief.captured || thief.escaped) continue;
          thief.activePath = [];
          thief.moving = false;
        }
        addLog(this._state, "All crew halted.");
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Role abilities
  // ---------------------------------------------------------------------------

  private _useRoleAbility(sel: import("./state/ShadowhandState").ThiefUnit): void {
    const heist = this._state.heist!;
    switch (sel.role) {
      case "cutpurse":
        if (pickpocketGuard(heist, sel.id)) {
          addLog(this._state, "Pickpocketed keys! Nearby doors unlocked.");
        } else {
          addLog(this._state, "No stunned/sleeping guard nearby to pickpocket.");
        }
        break;
      case "brawler":
        if (takedownGuard(heist, sel.id)) {
          addLog(this._state, "Silent takedown! Guard neutralized.");
        } else {
          addLog(this._state, "No guard in range (must be behind them).");
        }
        break;
      case "shade":
        if (shadowMeld(heist, sel.id)) {
          addLog(this._state, "Shadow meld! Invisible in darkness.");
        } else {
          addLog(this._state, "Must be in shadow to meld.");
        }
        break;
      case "charlatan":
        if (applyDisguise(heist, sel.id)) {
          addLog(this._state, "Disguise applied! Blend in for 20s.");
        }
        break;
      case "sapmaster": {
        const found = findSecretDoors(heist, sel.id);
        if (found > 0) {
          addLog(this._state, `Found ${found} secret door(s)!`);
        } else {
          addLog(this._state, "No secret doors nearby.");
        }
        break;
      }
      case "alchemist": {
        // Extinguish nearest torch
        const tx = Math.round(sel.x), ty = Math.round(sel.y);
        let ext = false;
        for (let dy = -3; dy <= 3 && !ext; dy++) {
          for (let dx = -3; dx <= 3 && !ext; dx++) {
            if (extinguishTorch(heist, tx + dx, ty + dy)) {
              ext = true;
              addLog(this._state, "Torch extinguished with acid.");
            }
          }
        }
        if (!ext) addLog(this._state, "No torches in range.");
        break;
      }
    }
  }

  private _useSecondaryAbility(sel: import("./state/ShadowhandState").ThiefUnit): void {
    const heist = this._state.heist!;
    switch (sel.role) {
      case "cutpurse":
        // Throw distracting coin
        distractCoin(heist, sel.x + (Math.random() - 0.5) * 8, sel.y + (Math.random() - 0.5) * 8);
        addLog(this._state, "Coin thrown! Guards will investigate.");
        break;
      case "charlatan":
        if (distractTalk(heist, sel.id)) {
          addLog(this._state, "Distracted a guard with conversation.");
        } else {
          addLog(this._state, "No guard nearby (or not disguised).");
        }
        break;
      case "shade": {
        // Extinguish nearest torch
        const tx = Math.round(sel.x), ty = Math.round(sel.y);
        let ext = false;
        for (let dy = -4; dy <= 4 && !ext; dy++) {
          for (let dx = -4; dx <= 4 && !ext; dx++) {
            if (extinguishTorch(heist, tx + dx, ty + dy)) {
              ext = true;
              addLog(this._state, "Torch extinguished from shadows.");
            }
          }
        }
        if (!ext) addLog(this._state, "No torches in range.");
        break;
      }
      default:
        addLog(this._state, "No secondary ability for this role.");
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Pause
  // ---------------------------------------------------------------------------

  private _showPause(): void {
    this._isPaused = true;
    if (this._state.heist) this._state.heist.paused = true;

    this._pauseMenu.setResumeCallback(() => this._resumeFromPause());
    this._pauseMenu.setQuitCallback(() => {
      this._resumeFromPause();
      viewManager.removeFromLayer("ui", this._pauseMenu.container);
      this._pauseMenu.hide();
      this.destroy();
      window.dispatchEvent(new Event("shadowhandExit"));
    });
    this._pauseMenu.show(this._state, this._sw, this._sh);
    viewManager.addToLayer("ui", this._pauseMenu.container);
  }

  private _resumeFromPause(): void {
    this._isPaused = false;
    if (this._state.heist) this._state.heist.paused = false;
    viewManager.removeFromLayer("ui", this._pauseMenu.container);
    this._pauseMenu.hide();
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private _cleanupHeistUI(): void {
    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }
    if (this._keyHandler) {
      window.removeEventListener("keydown", this._keyHandler);
      this._keyHandler = null;
    }
    this._removePointerHandler();
    viewManager.removeFromLayer("background", this._renderer.container);
    viewManager.removeFromLayer("ui", this._hud.container);
  }

  // ---------------------------------------------------------------------------
  // Screen fade transition
  // ---------------------------------------------------------------------------

  private _fadeTransition(callback: () => void, duration = 300): void {
    // Graphics imported at top
    if (this._fadeOverlay) {
      viewManager.removeFromLayer("ui", this._fadeOverlay);
      this._fadeOverlay.destroy();
    }
    const overlay = new Graphics();
    overlay.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000 });
    overlay.alpha = 0;
    this._fadeOverlay = overlay;
    viewManager.addToLayer("ui", overlay);

    // Fade in
    const startTime = Date.now();
    const fadeIn = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / (duration / 2));
      overlay.alpha = progress;
      if (progress < 1) {
        requestAnimationFrame(fadeIn);
      } else {
        // At peak darkness: perform the screen swap
        callback();
        // Fade out
        const fadeOutStart = Date.now();
        const fadeOut = () => {
          const elapsed2 = Date.now() - fadeOutStart;
          const progress2 = Math.min(1, elapsed2 / (duration / 2));
          overlay.alpha = 1 - progress2;
          if (progress2 < 1) {
            requestAnimationFrame(fadeOut);
          } else {
            viewManager.removeFromLayer("ui", overlay);
            overlay.destroy();
            if (this._fadeOverlay === overlay) this._fadeOverlay = null;
          }
        };
        requestAnimationFrame(fadeOut);
      }
    };
    requestAnimationFrame(fadeIn);
  }
}
