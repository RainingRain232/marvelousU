// ---------------------------------------------------------------------------
// Survivor mode orchestrator — boots the game, runs the loop, delegates views
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { gridRenderer } from "@view/GridRenderer";
import { SurvivorBalance, SURVIVOR_MAPS } from "./config/SurvivorBalanceConfig";
import type { SurvivorCharacterDef } from "./config/SurvivorCharacterDefs";
import { createSurvivorState } from "./state/SurvivorState";
import type { SurvivorState } from "./state/SurvivorState";
import { SurvivorInputSystem } from "./systems/SurvivorInputSystem";
import { SurvivorWaveSystem } from "./systems/SurvivorWaveSystem";
import { SurvivorCombatSystem } from "./systems/SurvivorCombatSystem";
import { SurvivorPickupSystem } from "./systems/SurvivorPickupSystem";
import { generateUpgradeChoices, applyUpgrade } from "./systems/SurvivorLevelSystem";
import { SurvivorHazardSystem } from "./systems/SurvivorHazardSystem";
import { SurvivorLandmarkSystem } from "./systems/SurvivorLandmarkSystem";
import { audioManager } from "@audio/AudioManager";

// View modules
import { SurvivorRenderer } from "./view/SurvivorRenderer";
import { SurvivorHUD } from "./view/SurvivorHUD";
import { SurvivorCamera } from "./view/SurvivorCamera";
import { SurvivorFX } from "./view/SurvivorFX";
import { SurvivorMinimap } from "./view/SurvivorMinimap";
import { SurvivorCharSelectUI } from "./view/SurvivorCharSelectUI";
import { SurvivorLevelUpUI } from "./view/SurvivorLevelUpUI";
import { SurvivorResultsUI } from "./view/SurvivorResultsUI";

const DT = SurvivorBalance.SIM_TICK_MS / 1000;

// ---------------------------------------------------------------------------
// SurvivorGame
// ---------------------------------------------------------------------------

export class SurvivorGame {
  private _state!: SurvivorState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _simAccumulator = 0;

  // View delegates
  private _renderer = new SurvivorRenderer();
  private _hud = new SurvivorHUD();
  private _camera = new SurvivorCamera();
  private _fx = new SurvivorFX();
  private _minimap = new SurvivorMinimap();
  private _charSelect = new SurvivorCharSelectUI();
  private _levelUpUI = new SurvivorLevelUpUI();
  private _resultsUI = new SurvivorResultsUI();

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._showCharacterSelect();
  }

  // ---------------------------------------------------------------------------
  // Character Select
  // ---------------------------------------------------------------------------

  private _showCharacterSelect(): void {
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    this._charSelect.setStartCallback((charDef, mapIndex) => {
      viewManager.removeFromLayer("ui", this._charSelect.container);
      this._startGame(charDef, mapIndex);
    });
    this._charSelect.show(sw, sh);
    viewManager.addToLayer("ui", this._charSelect.container);
  }

  // ---------------------------------------------------------------------------
  // Start Game
  // ---------------------------------------------------------------------------

  private _startGame(charDef: SurvivorCharacterDef, mapIndex: number): void {
    const mapDef = SURVIVOR_MAPS[mapIndex];
    this._state = createSurvivorState(charDef, mapDef.mapType, mapDef.width, mapDef.height);

    // Init renderer
    this._renderer.init();
    this._renderer.createPlayerSprite(charDef.unitType);
    viewManager.addToLayer("units", this._renderer.worldLayer);

    // Init FX
    this._fx.init();
    this._renderer.worldLayer.addChild(this._fx.weaponFxContainer);
    this._renderer.worldLayer.addChild(this._fx.dmgNumberContainer);

    // Draw terrain
    const grid = this._buildSimpleGrid(mapDef.width, mapDef.height);
    gridRenderer.init(viewManager);
    gridRenderer.draw({ grid, width: mapDef.width, height: mapDef.height }, mapDef.mapType);

    // Camera
    viewManager.camera.setMapSize(mapDef.width, mapDef.height);
    viewManager.camera.zoom = 1.5;
    this._camera.sync(this._state);

    // HUD
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    this._hud.build(sw, sh);
    viewManager.addToLayer("ui", this._hud.container);

    // Combat callbacks
    SurvivorCombatSystem.setWeaponFxCallback((x, y, color, radius) => {
      this._fx.pendingWeaponFx.push({ x, y, color, radius });
    });
    SurvivorCombatSystem.setChainFxCallback((points, color) => {
      this._fx.pendingChainFx.push({ points, color });
    });
    SurvivorCombatSystem.setPlayerHitCallback(() => {
      this._camera.shake(6, 0.2);
    });
    SurvivorCombatSystem.setDamageCallback((x, y, amount, isCrit) => {
      this._fx.pendingDmgNumbers.push({ x, y, amount, isCrit, isHeal: false });
      if (isCrit) this._camera.shake(3, 0.1);
    });

    // Pickup callbacks
    SurvivorPickupSystem.setChestCallback((type, value) => {
      let msg = "";
      if (type === "gold") msg = `+${value} GOLD!`;
      else if (type === "heal") msg = "FULL HEAL!";
      else if (type === "bomb") msg = "SCREEN CLEAR!";
      else if (type === "arcana") msg = "ARCANA!";
      const color = type === "gold" ? 0xffd700 : type === "heal" ? 0x44ff44 : type === "arcana" ? 0xaa44ff : 0xff4444;
      this._hud.showNotification(msg, color, sw, sh);
    });
    SurvivorPickupSystem.setArcanaCallback(() => {
      this._state.paused = true;
      this._levelUpUI.showArcanaSelection(this._state, sw, sh);
      viewManager.addToLayer("ui", this._levelUpUI.arcanaOverlay);
    });

    // Level-up & arcana callbacks
    this._levelUpUI.setUpgradeCallback((choice) => {
      const prevSynergies = [...this._state.activeSynergies];
      applyUpgrade(this._state, choice);
      for (const syn of this._state.activeSynergies) {
        if (!prevSynergies.includes(syn)) {
          this._hud.showNotification(`Synergy: ${syn}!`, 0xff8844, sw, sh);
        }
      }
      viewManager.removeFromLayer("ui", this._levelUpUI.levelUpOverlay);
      this._levelUpUI.hideLevelUp();
      if (this._state.levelUpPending) this._showLevelUp();
    });
    this._levelUpUI.setArcanaCallback((arcana) => {
      this._state.arcana.push(arcana);
      if (arcana.specialRule === "glass_cannon") {
        this._state.player.maxHp = Math.floor(this._state.player.maxHp * 0.5);
        this._state.player.hp = Math.min(this._state.player.hp, this._state.player.maxHp);
      }
      this._state.paused = false;
      viewManager.removeFromLayer("ui", this._levelUpUI.arcanaOverlay);
      this._levelUpUI.hideArcana();
      this._hud.showNotification(`Arcana: ${arcana.name}`, 0xaa44ff, sw, sh);
    });

    // Hazard system
    SurvivorHazardSystem.init(this._state);
    SurvivorHazardSystem.setEventCallback((event) => {
      if (event) this._hud.showEventBanner(event.name, event.color, sw);
    });
    this._renderer.renderHazards(this._state);

    // Landmarks
    this._renderer.initLandmarks(this._state);
    SurvivorLandmarkSystem.setNotifyCallback((name, color) => {
      this._hud.showNotification(name, color, sw, sh);
    });

    // Minimap
    this._minimap.init(mapDef.width, mapDef.height, sw, sh);
    viewManager.addToLayer("ui", this._minimap.container);

    // Input system
    SurvivorInputSystem.init(this._state);
    SurvivorInputSystem.setPauseCallback((paused) => {
      if (paused) {
        this._levelUpUI.showPauseMenu(this._state, sw, sh,
          () => { this._state.paused = false; viewManager.removeFromLayer("ui", this._levelUpUI.pauseOverlay); this._levelUpUI.hidePause(); },
          () => { this._state.paused = false; viewManager.removeFromLayer("ui", this._levelUpUI.pauseOverlay); this._levelUpUI.hidePause(); this._cleanup(); this._showCharacterSelect(); },
        );
        viewManager.addToLayer("ui", this._levelUpUI.pauseOverlay);
      } else {
        viewManager.removeFromLayer("ui", this._levelUpUI.pauseOverlay);
        this._levelUpUI.hidePause();
      }
    });

    // Sound
    audioManager.switchTrack("battle");

    // Start game loop
    this._tickerCb = (ticker: Ticker) => {
      this._gameLoop(ticker.deltaMS / 1000);
    };
    viewManager.app.ticker.add(this._tickerCb);
  }

  // ---------------------------------------------------------------------------
  // Game Loop
  // ---------------------------------------------------------------------------

  private _gameLoop(rawDt: number): void {
    if (!this._state) return;
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    // Show level-up if pending
    if (this._state.levelUpPending && this._levelUpUI.levelUpOverlay.children.length === 0) {
      this._showLevelUp();
    }

    // Show results if game over
    if (this._state.gameOver && this._resultsUI.resultsOverlay.children.length === 0) {
      audioManager.switchTrack("game_over");
      this._resultsUI.showResults(this._state, this._charSelect.selectedMapIndex, sw, sh,
        () => { viewManager.removeFromLayer("ui", this._resultsUI.resultsOverlay); this._resultsUI.resultsOverlay.removeChildren(); this._cleanup(); this._showCharacterSelect(); },
        () => window.location.reload(),
      );
      viewManager.addToLayer("ui", this._resultsUI.resultsOverlay);
    }

    // Show victory
    if (this._state.victory && this._resultsUI.victoryOverlay.children.length === 0) {
      audioManager.playJingle("victory");
      this._resultsUI.showVictory(this._state, this._charSelect.selectedMapIndex, sw, sh,
        () => { viewManager.removeFromLayer("ui", this._resultsUI.victoryOverlay); this._resultsUI.victoryOverlay.removeChildren(); this._cleanup(); this._showCharacterSelect(); },
      );
      viewManager.addToLayer("ui", this._resultsUI.victoryOverlay);
    }

    // Boss spawn warning
    if (this._state.bossTimer <= 3 && this._state.bossTimer + DT > 3) {
      this._hud.triggerBossWarning();
      audioManager.switchTrack("boss_battle");
    }

    // Fixed timestep simulation
    if (!this._state.paused && !this._state.levelUpPending && !this._state.gameOver && !this._state.victory) {
      this._simAccumulator += rawDt;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        this._state.gameTime += DT;
        SurvivorInputSystem.update(this._state, DT);
        SurvivorLandmarkSystem.update(this._state, DT);
        SurvivorWaveSystem.update(this._state, DT);
        SurvivorCombatSystem.update(this._state, DT);
        SurvivorPickupSystem.update(this._state, DT);
        SurvivorHazardSystem.update(this._state, DT);
      }
    }

    // Minimap
    this._minimap.update(this._state);

    // Event banner
    this._hud.updateEventBanner(rawDt);

    // Render
    this._render(rawDt);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private _render(dt: number): void {
    const s = this._state;

    this._renderer.renderLandmarks(s, dt);
    this._renderer.renderPlayer(s);
    this._renderer.renderEnemies(s);
    this._renderer.renderGems(s);
    this._renderer.renderChests(s);
    this._renderer.renderProjectiles(s);

    // FX
    this._fx.renderOrbitingWeapons(s);
    this._fx.spawnDamageNumbers();
    this._fx.updateDamageNumbers(dt);
    this._fx.spawnWeaponFx();
    this._fx.updateWeaponFx(dt);
    this._fx.spawnChainFx();
    this._fx.updateChainFx(dt);

    // HUD
    this._hud.update(s, viewManager.screenWidth, viewManager.screenHeight);
    this._hud.updateNotifications(dt);

    // Camera
    this._camera.sync(s);
  }

  // ---------------------------------------------------------------------------
  // Level Up
  // ---------------------------------------------------------------------------

  private _showLevelUp(): void {
    audioManager.playJingle("level_up");
    const choices = generateUpgradeChoices(this._state);
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    this._levelUpUI.showLevelUp(choices, this._state.level, sw, sh);
    viewManager.addToLayer("ui", this._levelUpUI.levelUpOverlay);
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private _cleanup(): void {
    SurvivorInputSystem.destroy();
    SurvivorCombatSystem.setDamageCallback(null);
    SurvivorCombatSystem.setWeaponFxCallback(null);
    SurvivorCombatSystem.setChainFxCallback(null);
    SurvivorCombatSystem.setPlayerHitCallback(null);
    SurvivorPickupSystem.setChestCallback(null);
    SurvivorPickupSystem.setArcanaCallback(null);
    SurvivorHazardSystem.setEventCallback(null);
    SurvivorLandmarkSystem.cleanup();
    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }
    this._renderer.cleanup();
    this._fx.cleanup();
    this._hud.cleanup();
    viewManager.removeFromLayer("ui", this._hud.container);
    viewManager.removeFromLayer("ui", this._minimap.container);
    viewManager.clearWorld();
  }

  private _buildSimpleGrid(w: number, h: number): { x: number; y: number; walkable: boolean; owner: null; buildingId: null; zone: "neutral" }[][] {
    const grid: { x: number; y: number; walkable: boolean; owner: null; buildingId: null; zone: "neutral" }[][] = [];
    for (let y = 0; y < h; y++) {
      const row: { x: number; y: number; walkable: boolean; owner: null; buildingId: null; zone: "neutral" }[] = [];
      for (let x = 0; x < w; x++) {
        row.push({ x, y, walkable: true, owner: null, buildingId: null, zone: "neutral" });
      }
      grid.push(row);
    }
    return grid;
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    this._cleanup();
    viewManager.removeFromLayer("ui", this._levelUpUI.levelUpOverlay);
    viewManager.removeFromLayer("ui", this._resultsUI.resultsOverlay);
    viewManager.removeFromLayer("ui", this._charSelect.container);
  }
}
