// ---------------------------------------------------------------------------
// Shadowhand mode — main orchestrator
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

import { createShadowhandState, ShadowhandPhase, addLog, seedRng } from "./state/ShadowhandState";
import type { ShadowhandState } from "./state/ShadowhandState";
import type { ShadowhandDifficulty } from "./config/ShadowhandConfig";
import { ShadowhandConfig } from "./config/ShadowhandConfig";
import { createCrewMember, type CrewRole } from "./config/CrewDefs";
import { getEquipmentById } from "./config/EquipmentDefs";

import { initHeist, updateHeist, decayHeat } from "./systems/HeistSystem";
import { moveThiefTo, useSmokeBomb, useSleepDart, useFlashPowder, placeCaltrops, unlockDoor, extinguishTorch } from "./systems/ThiefSystem";

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
    this._startScreen.setStartCallback((difficulty) => {
      viewManager.removeFromLayer("ui", this._startScreen.container);
      this._startScreen.hide();
      this._startGameWithDifficulty(difficulty);
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

  // ---------------------------------------------------------------------------
  // Guild hub
  // ---------------------------------------------------------------------------

  private _showGuildScreen(): void {
    this._state.phase = ShadowhandPhase.GUILD_HUB;
    this._cleanupHeistUI();

    this._guildScreen.setHeistCallback((target, crewIds, equipIds) => {
      viewManager.removeFromLayer("ui", this._guildScreen.container);
      this._guildScreen.hide();
      this._state.currentTarget = target;
      this._state.selectedCrew = crewIds;
      this._state.selectedEquipment = equipIds;
      this._startHeist();
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

    this._guildScreen.show(this._state, this._sw, this._sh);
    viewManager.addToLayer("ui", this._guildScreen.container);
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
    if (!def || this._state.guild.gold < def.cost) return;
    this._state.guild.gold -= def.cost;
    this._state.guild.inventory.push({ id: equipId, uses: def.uses });
    addLog(this._state, `Purchased ${def.name}.`);
    this._guildScreen.show(this._state, this._sw, this._sh);
  }

  // ---------------------------------------------------------------------------
  // Heist
  // ---------------------------------------------------------------------------

  private _startHeist(): void {
    initHeist(this._state);

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
      this._renderer.updateCamera(this._state.heist, this._sw, this._sh);
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
    this._cleanupHeistUI();

    this._resultsScreen.setContinueCallback(() => {
      viewManager.removeFromLayer("ui", this._resultsScreen.container);
      this._resultsScreen.hide();
      decayHeat(this._state);
      this._showGuildScreen();
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

    this._pointerHandler = (e: { global: { x: number; y: number } }) => {
      if (this._isPaused || !this._state.heist) return;
      const heist = this._state.heist;
      // Convert screen position to tile position
      const tx = (e.global.x - this._renderer["_offsetX"]) / ShadowhandConfig.TILE_SIZE;
      const ty = (e.global.y - this._renderer["_offsetY"]) / ShadowhandConfig.TILE_SIZE;

      const selected = heist.thieves.find(t => t.selected && t.alive && !t.captured);
      if (selected) {
        moveThiefTo(heist, selected.id, tx, ty);
      }
    };
    viewManager.app.stage.eventMode = "static";
    viewManager.app.stage.on("pointerdown", this._pointerHandler);
  }

  private _removePointerHandler(): void {
    if (this._pointerHandler) {
      viewManager.app.stage.off("pointerdown", this._pointerHandler);
      this._pointerHandler = null;
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

    switch (e.key) {
      case "Tab": {
        e.preventDefault();
        // Cycle through alive thieves
        const alive = heist.thieves.filter(t => t.alive && !t.captured);
        if (alive.length <= 1) return;
        const current = alive.findIndex(t => t.selected);
        for (const t of alive) t.selected = false;
        const next = (current + 1) % alive.length;
        alive[next].selected = true;
        break;
      }
      case "c":
      case "C": {
        const sel = heist.thieves.find(t => t.selected && t.alive);
        if (sel) sel.crouching = !sel.crouching;
        break;
      }
      case " ": {
        // Try to unlock adjacent door
        e.preventDefault();
        const sel = heist.thieves.find(t => t.selected && t.alive);
        if (!sel) return;
        const tx = Math.round(sel.x), ty = Math.round(sel.y);
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        for (const [dx, dy] of dirs) {
          if (unlockDoor(heist, tx + dx, ty + dy, ShadowhandConfig.NOISE_LOCKPICK)) {
            addLog(this._state, "Door unlocked.");
            break;
          }
        }
        break;
      }
      case "1": {
        // Smoke bomb
        const sel = heist.thieves.find(t => t.selected && t.alive);
        if (!sel) return;
        const smoke = this._state.guild.inventory.find(i => i.id === "smoke_bomb" && i.uses > 0);
        if (smoke) {
          useSmokeBomb(heist, sel.x, sel.y, 3, 8);
          smoke.uses--;
          addLog(this._state, "Smoke bomb deployed!");
        }
        break;
      }
      case "2": {
        // Sleep dart
        const sel = heist.thieves.find(t => t.selected && t.alive);
        if (!sel) return;
        const dart = this._state.guild.inventory.find(i => i.id === "sleep_dart" && i.uses > 0);
        if (dart) {
          if (useSleepDart(heist, sel.x, sel.y, 6, 15)) {
            dart.uses--;
            addLog(this._state, "Guard put to sleep.");
          } else {
            addLog(this._state, "No guard in range.");
          }
        }
        break;
      }
      case "3": {
        // Flash powder
        const sel = heist.thieves.find(t => t.selected && t.alive);
        if (!sel) return;
        const flash = this._state.guild.inventory.find(i => i.id === "flash_powder" && i.uses > 0);
        if (flash) {
          useFlashPowder(heist, sel.x, sel.y, 3, 5);
          flash.uses--;
          addLog(this._state, "Flash! Guards stunned.");
        }
        break;
      }
      case "4": {
        // Caltrops
        const sel = heist.thieves.find(t => t.selected && t.alive);
        if (!sel) return;
        const calt = this._state.guild.inventory.find(i => i.id === "caltrops" && i.uses > 0);
        if (calt) {
          placeCaltrops(heist, sel.x, sel.y, 2);
          calt.uses--;
          addLog(this._state, "Caltrops scattered.");
        }
        break;
      }
      case "5": {
        // Extinguish torch (shade ability)
        const sel = heist.thieves.find(t => t.selected && t.alive);
        if (!sel) return;
        const tx = Math.round(sel.x), ty = Math.round(sel.y);
        const radius = 3;
        let extinguished = false;
        for (let dy = -radius; dy <= radius && !extinguished; dy++) {
          for (let dx = -radius; dx <= radius && !extinguished; dx++) {
            if (extinguishTorch(heist, tx + dx, ty + dy)) {
              extinguished = true;
              addLog(this._state, "Torch extinguished.");
            }
          }
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
}
