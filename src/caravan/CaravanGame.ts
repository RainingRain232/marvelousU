// ---------------------------------------------------------------------------
// Caravan mode orchestrator — hero select, biome-aware terrain, abilities,
// relic rewards, full game loop
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { gridRenderer } from "@view/GridRenderer";
import { audioManager } from "@audio/AudioManager";
import { CaravanBalance } from "./config/CaravanBalanceConfig";
import { createCaravanState } from "./state/CaravanState";
import type { CaravanState } from "./state/CaravanState";
import type { HeroClassDef } from "./config/CaravanHeroDefs";
import { getBiome } from "./config/CaravanBiomeDefs";
import { rollRelicChoices } from "./config/CaravanRelicDefs";
import { getTownForSegment } from "./config/CaravanTradeDefs";
import { CaravanInputSystem } from "./systems/CaravanInputSystem";
import { CaravanMovementSystem } from "./systems/CaravanMovementSystem";
import { CaravanCombatSystem } from "./systems/CaravanCombatSystem";
import { CaravanEncounterSystem } from "./systems/CaravanEncounterSystem";
import { CaravanAbilitySystem } from "./systems/CaravanAbilitySystem";
import { CaravanHazardSystem } from "./systems/CaravanHazardSystem";
import { CaravanRenderer } from "./view/CaravanRenderer";
import { CaravanHUD } from "./view/CaravanHUD";
import { CaravanCamera } from "./view/CaravanCamera";
import { CaravanFX } from "./view/CaravanFX";
import { CaravanTownUI } from "./view/CaravanTownUI";
import { CaravanResultsUI } from "./view/CaravanResultsUI";
import { CaravanHeroSelectUI } from "./view/CaravanHeroSelectUI";
import { CaravanRelicUI } from "./view/CaravanRelicUI";
import { CaravanPauseUI } from "./view/CaravanPauseUI";
import { CaravanSFX } from "./systems/CaravanSFX";

const DT = CaravanBalance.SIM_TICK_MS / 1000;

export class CaravanGame {
  private _state!: CaravanState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _simAccumulator = 0;

  private _renderer = new CaravanRenderer();
  private _hud = new CaravanHUD();
  private _camera = new CaravanCamera();
  private _fx = new CaravanFX();
  private _townUI = new CaravanTownUI();
  private _resultsUI = new CaravanResultsUI();
  private _heroSelectUI = new CaravanHeroSelectUI();
  private _relicUI = new CaravanRelicUI();
  private _pauseUI = new CaravanPauseUI();
  private _ngPlusLevel = 0;

  // ---------------------------------------------------------------------------
  // Boot — show hero select
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._showHeroSelect();
  }

  private _showHeroSelect(): void {
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    this._heroSelectUI.setNgPlusLevel(this._ngPlusLevel);
    this._heroSelectUI.setSelectCallback((heroClass, difficulty) => {
      viewManager.removeFromLayer("ui", this._heroSelectUI.container);
      this._heroSelectUI.hide();
      this._startGame(heroClass, difficulty);
    });
    this._heroSelectUI.show(sw, sh);
    viewManager.addToLayer("ui", this._heroSelectUI.container);
  }

  // ---------------------------------------------------------------------------
  // Start Game with chosen hero and difficulty
  // ---------------------------------------------------------------------------

  private _startGame(heroClass: HeroClassDef, difficulty: "normal" | "hard" | "endless" = "normal"): void {
    this._state = createCaravanState(heroClass, difficulty, this._ngPlusLevel);
    const s = this._state;
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    s.screenW = sw;
    s.screenH = sh;

    // Init renderer with biome
    this._renderer.init();
    this._renderer.createPlayerSprite(heroClass.unitType);
    this._renderer.createCaravanSprite();
    this._drawSegmentTerrain();
    viewManager.addToLayer("units", this._renderer.worldLayer);

    // Init FX
    this._fx.init();
    this._renderer.worldLayer.addChild(this._fx.dmgNumberContainer);

    // Camera
    viewManager.camera.setMapSize(s.mapWidth, s.mapHeight);
    viewManager.camera.zoom = 1.5;
    this._camera.sync(s);

    // HUD
    this._hud.build(sw, sh);
    viewManager.addToLayer("ui", this._hud.container);

    // Combat callbacks
    CaravanCombatSystem.setDamageCallback((x, y, amount, isCrit) => {
      this._fx.pendingDmgNumbers.push({ x, y, amount, isCrit });
      if (isCrit) CaravanSFX.crit(); else CaravanSFX.hit();
    });
    CaravanCombatSystem.setPlayerHitCallback(() => {
      this._camera.shake(6, 0.2);
      CaravanSFX.playerHit();
    });
    CaravanCombatSystem.setCaravanHitCallback(() => {
      this._camera.shake(4, 0.15);
      CaravanSFX.caravanHit();
    });
    CaravanCombatSystem.setKillCallback((x, y, isBoss) => {
      this._fx.pendingKillBursts.push({ x, y, isBoss });
      if (isBoss) {
        this._hud.showNotification("Boss defeated!", 0xffaa00, sw, sh);
        this._camera.shake(10, 0.4);
        CaravanSFX.bossKill();
      } else {
        CaravanSFX.kill();
      }
    });

    CaravanCombatSystem.setClearCallback((bonus) => {
      this._hud.showNotification(`Wave clear! +${bonus}g`, 0x44ffaa, sw, sh);
      CaravanSFX.loot();
    });
    CaravanCombatSystem.setEscortDeathCallback((name) => {
      this._hud.showNotification(`${name} has fallen!`, 0xff6644, sw, sh);
    });

    // Movement callbacks
    CaravanMovementSystem.setLootCallback((x, y, value) => {
      this._fx.pendingLootTexts.push({ x, y, value });
      CaravanSFX.loot();
    });

    // Encounter callbacks
    CaravanEncounterSystem.setEncounterCallback((name) => {
      if (name.startsWith("Event:")) {
        this._hud.showNotification(name, 0x88ccff, sw, sh);
        CaravanSFX.loot(); // positive event sound
      } else if (name.includes("Lord") || name.includes("Dragon") || name.includes("Dark Knight")) {
        this._hud.showEncounterBanner(name, sw);
        this._camera.shake(3, 0.3);
        CaravanSFX.bossWarning();
      } else {
        this._hud.showEncounterBanner(name, sw);
        CaravanSFX.encounter();
      }
    });

    // Ability callbacks
    CaravanAbilitySystem.setFxCallback((id, x, y) => {
      CaravanSFX.ability();
      const abDef = this._state.player.abilities.find((a) => a.def.id === id)?.def;
      const color = abDef?.color ?? 0xffffff;
      this._hud.showNotification(abDef?.name ?? id, color, sw, sh);

      // Ability-specific FX
      if (id === "fireball") {
        this._fx.pendingAbilityBlasts.push({ x, y, radius: 2.5, color: 0xff4422 });
      } else if (id === "shield_bash") {
        this._fx.pendingAbilityBlasts.push({ x, y, radius: 2.5, color: 0x4488cc });
      } else if (id === "arrow_volley") {
        this._fx.pendingAbilityBlasts.push({ x, y, radius: this._state.player.range, color: 0x88cc44 });
      } else if (id === "heal_aura") {
        this._fx.pendingHealGlows.push({ x, y });
        this._fx.pendingHealGlows.push({ x: this._state.caravan.position.x, y: this._state.caravan.position.y });
      } else if (id === "holy_smite") {
        this._fx.pendingAbilityBlasts.push({ x, y, radius: 1.0, color: 0xffdd44 });
      } else if (id === "war_cry") {
        this._fx.pendingAbilityBlasts.push({ x, y, radius: 3.0, color: 0xff8844 });
      }
    });

    // Town UI
    this._townUI.setContinueCallback(() => { this._leaveTown(); });

    // Relic UI
    this._relicUI.setChooseCallback((relic) => {
      relic.apply(this._state);
      this._state.relicIds.push(relic.id);
      viewManager.removeFromLayer("ui", this._relicUI.container);
      this._relicUI.hide();
      this._state.phase = "town";
      this._showTown();
    });

    // Input
    CaravanInputSystem.init(this._state);
    // Pause menu
    this._pauseUI.setResumeCallback(() => {
      this._state.paused = false;
      viewManager.removeFromLayer("ui", this._pauseUI.container);
      this._pauseUI.hide();
    });
    this._pauseUI.setQuitCallback(() => {
      this._state.paused = false;
      viewManager.removeFromLayer("ui", this._pauseUI.container);
      this._pauseUI.hide();
      this._cleanup();
      this._showHeroSelect();
    });

    CaravanInputSystem.setPauseCallback((paused) => {
      if (paused) {
        this._pauseUI.show(this._state, sw, sh);
        viewManager.addToLayer("ui", this._pauseUI.container);
      } else {
        viewManager.removeFromLayer("ui", this._pauseUI.container);
        this._pauseUI.hide();
      }
    });
    CaravanInputSystem.setHoldCallback((_flag) => {
      // Could be hold toggle or time scale toggle
      if (this._state.holdPosition) {
        this._hud.showNotification("HOLD — caravan stopped", 0xff8844, sw, sh);
      } else if (this._state.timeScale > 1) {
        this._hud.showNotification(`Speed: ${this._state.timeScale}x`, 0x88ccff, sw, sh);
      } else {
        this._hud.showNotification("MARCH — moving out", 0x88ccff, sw, sh);
      }
    });
    CaravanInputSystem.setAbilityCallback((_index, _name) => {
      // Notification handled by ability FX callback
    });
    CaravanInputSystem.setDashCallback(() => {
      this._camera.shake(2, 0.08);
    });

    // Hazard system
    CaravanHazardSystem.setHazardCallback((type, x, y) => {
      const names: Record<string, string> = {
        poison_cloud: "Poison Cloud!",
        ice_patch: "Ice Patch — slippery!",
        sandstorm: "Sandstorm!",
        lava_vent: "Lava Vent!",
      };
      this._hud.showNotification(names[type] ?? type, 0xff8844, sw, sh);
      this._fx.pendingAbilityBlasts.push({
        x, y,
        radius: 2.5,
        color: type === "poison_cloud" ? 0x44ff44 : type === "ice_patch" ? 0x88ccff : type === "sandstorm" ? 0xddaa44 : 0xff4400,
      });
    });

    audioManager.switchTrack("battle");

    // Show first town
    this._showTown();

    // Start game loop
    this._tickerCb = (ticker: Ticker) => { this._gameLoop(ticker.deltaMS / 1000); };
    viewManager.app.ticker.add(this._tickerCb);
  }

  // ---------------------------------------------------------------------------
  // Draw terrain for current segment biome
  // ---------------------------------------------------------------------------

  private _drawSegmentTerrain(): void {
    const s = this._state;
    const biome = getBiome(s.segment);

    // Draw road with biome colors
    this._renderer.drawRoad(s.mapWidth, s.mapHeight, biome);

    // Draw grid terrain
    const grid = this._buildSimpleGrid(s.mapWidth, s.mapHeight);
    gridRenderer.init(viewManager);
    gridRenderer.draw({ grid, width: s.mapWidth, height: s.mapHeight }, biome.mapType);
  }

  // ---------------------------------------------------------------------------
  // Game Loop
  // ---------------------------------------------------------------------------

  private _gameLoop(rawDt: number): void {
    if (!this._state) return;
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    const s = this._state;

    // Results (once)
    if ((s.gameOver || s.victory) && !s.resultsShown) {
      s.resultsShown = true;
      if (s.gameOver) audioManager.switchTrack("game_over");
      else audioManager.playJingle("victory");

      this._resultsUI.show(s, sw, sh,
        () => {
          // New Journey (restart)
          viewManager.removeFromLayer("ui", this._resultsUI.container);
          this._resultsUI.hide();
          this._cleanup();
          this._showHeroSelect();
        },
        () => { window.location.reload(); },
        s.victory ? () => {
          // New Game+ (harder difficulty)
          viewManager.removeFromLayer("ui", this._resultsUI.container);
          this._resultsUI.hide();
          this._cleanup();
          this._ngPlusLevel++;
          this._showHeroSelect();
        } : undefined,
      );
      viewManager.addToLayer("ui", this._resultsUI.container);
    }

    // Simulation (with time scale support)
    if (!s.paused && !s.gameOver && !s.victory && s.phase === "travel") {
      const scaledDt = rawDt * s.timeScale;
      this._simAccumulator += scaledDt;
      if (this._simAccumulator > DT * 8) this._simAccumulator = DT * 8;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        s.gameTime += DT;
        CaravanInputSystem.update(s, DT);
        CaravanAbilitySystem.update(s, DT);
        CaravanEncounterSystem.update(s, DT);
        CaravanMovementSystem.update(s, DT);
        CaravanCombatSystem.update(s, DT);
        CaravanHazardSystem.update(s, DT);
      }
    }

    this._hud.updateBanner(rawDt);
    this._hud.updateNotifications(rawDt);

    // Tutorial tips (contextual, shown once)
    if (s.phase === "travel" && !s.paused) {
      this._checkTips(s, sw, sh);
    }

    if (s.phase === "travel" || s.gameOver || s.victory) {
      this._render(rawDt);
    }

    // Town triggered by movement system completing a segment
    if (s.phase === "town" && this._townUI.container.children.length === 0
      && this._relicUI.container.children.length === 0
      && !s.victory && !s.gameOver) {
      this._showTown();
    }

    // Relic choice triggered
    if (s.phase === "relic_choice" && this._relicUI.container.children.length === 0
      && !s.victory && !s.gameOver) {
      this._showRelicChoice();
    }
  }

  private _render(dt: number): void {
    const s = this._state;
    this._renderer.renderPlayer(s);
    this._renderer.renderCaravan(s);
    this._renderer.renderEscorts(s);
    this._renderer.renderEnemies(s);
    this._renderer.renderLoot(s);
    this._renderer.updateDust(dt);
    this._renderer.updateClouds(dt);
    this._renderer.renderHazards(s);
    this._renderer.spawnAmbientParticle(s.caravan.position.x * 64, s.mapHeight);
    this._fx.spawnDamageNumbers();
    this._fx.spawnHitSparks();
    this._fx.spawnSlashTrails();
    this._fx.spawnLootTexts();
    this._fx.spawnKillBursts();
    this._fx.spawnAbilityBlasts();
    this._fx.spawnHealGlows();
    this._fx.updateDamageNumbers(dt);
    this._fx.updateHitSparks(dt);
    this._fx.updateSlashTrails(dt);
    this._fx.updateLootTexts(dt);
    this._fx.updateKillBursts(dt);
    this._fx.updateAbilityBlasts(dt);
    this._fx.updateHealGlows(dt);
    this._hud.update(s, viewManager.screenWidth, viewManager.screenHeight);
    this._camera.sync(s);
  }

  // ---------------------------------------------------------------------------
  // Town phase
  // ---------------------------------------------------------------------------

  private _showTown(): void {
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    if (this._state.segment > 0) {
      this._hud.showNotification(
        `Segment ${this._state.segment} complete! +${CaravanBalance.SEGMENT_BONUS_GOLD}g`,
        0xffd700, sw, sh,
      );
    }

    this._townUI.show(this._state, sw, sh);
    viewManager.addToLayer("ui", this._townUI.container);
  }

  private _leaveTown(): void {
    viewManager.removeFromLayer("ui", this._townUI.container);
    this._townUI.hide();

    // Redraw terrain for new segment biome
    this._drawSegmentTerrain();

    this._state.phase = "travel";
    this._simAccumulator = 0;

    const biome = getBiome(this._state.segment);
    const nextTown = getTownForSegment(this._state.towns, this._state.segment + 1);
    if (nextTown) {
      this._hud.showNotification(
        `${biome.name} — heading to ${nextTown.name}`,
        0x88ccff, viewManager.screenWidth, viewManager.screenHeight,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Relic choice (after segment completion)
  // ---------------------------------------------------------------------------

  private _showRelicChoice(): void {
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    const choices = rollRelicChoices(this._state.relicIds);
    this._relicUI.show(choices, this._state.segment, sw, sh);
    viewManager.addToLayer("ui", this._relicUI.container);
  }

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Tutorial tips
  // ---------------------------------------------------------------------------

  private _showTip(s: CaravanState, key: string, msg: string, color: number): void {
    if (s.tipsShown.has(key)) return;
    s.tipsShown.add(key);
    this._hud.showNotification(msg, color, s.screenW, s.screenH);
  }

  private _checkTips(s: CaravanState, _sw: number, _sh: number): void {
    // First 2 seconds: movement tip
    if (s.gameTime < 2 && s.gameTime > 0.5) {
      this._showTip(s, "move", "TIP: Use WASD to move, SPACE to dash", 0x88aacc);
    }
    // First encounter
    if (s.encounterCount === 1 && s.enemies.length > 0) {
      this._showTip(s, "combat", "TIP: You auto-attack nearby enemies. Use Q/E for abilities!", 0x88aacc);
    }
    // First loot drop
    if (s.loot.length > 0 && s.totalKills <= 3) {
      this._showTip(s, "loot", "TIP: Walk near gold to collect it. It despawns after 8s!", 0xffd700);
    }
    // Low caravan HP
    if (s.caravan.hp < s.caravan.maxHp * 0.5) {
      this._showTip(s, "caravanLow", "TIP: Caravan taking damage! Stand between enemies and the wagon", 0xff6644);
    }
    // Boss approaching
    if (s.bossActive) {
      this._showTip(s, "boss", "TIP: Boss fight! Caravan stops during boss. Focus fire!", 0xff4444);
    }
    // Hold position hint
    if (s.encounterCount >= 3) {
      this._showTip(s, "hold", "TIP: Press H to hold position — stop the caravan to fight", 0x88ccff);
    }
    // Speed up hint
    if (s.segment >= 1 && s.encounterCount === 0) {
      this._showTip(s, "speed", "TIP: Press X to speed up travel (2x/3x)", 0x88ccff);
    }
    // Trade hint
    if (s.segment === 0 && s.phase === "travel" && s.gameTime > 5) {
      this._showTip(s, "trade", "TIP: Buy goods cheap in one town, sell high in the next!", 0xffd700);
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private _cleanup(): void {
    CaravanInputSystem.destroy();
    CaravanInputSystem.setAbilityCallback(null);
    CaravanCombatSystem.setDamageCallback(null);
    CaravanCombatSystem.setPlayerHitCallback(null);
    CaravanCombatSystem.setCaravanHitCallback(null);
    CaravanCombatSystem.setKillCallback(null);
    CaravanCombatSystem.setClearCallback(null);
    CaravanCombatSystem.setEscortDeathCallback(null);
    CaravanMovementSystem.setLootCallback(null);
    CaravanEncounterSystem.setEncounterCallback(null);
    CaravanAbilitySystem.setFxCallback(null);
    CaravanHazardSystem.setHazardCallback(null);

    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }

    this._renderer.cleanup();
    this._fx.cleanup();
    this._hud.cleanup();
    this._townUI.hide();
    this._resultsUI.hide();
    this._relicUI.hide();
    this._pauseUI.hide();

    viewManager.removeFromLayer("ui", this._hud.container);
    viewManager.removeFromLayer("ui", this._townUI.container);
    viewManager.removeFromLayer("ui", this._resultsUI.container);
    viewManager.removeFromLayer("ui", this._relicUI.container);
    viewManager.removeFromLayer("ui", this._heroSelectUI.container);
    viewManager.removeFromLayer("ui", this._pauseUI.container);
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

  destroy(): void {
    this._cleanup();
  }
}
