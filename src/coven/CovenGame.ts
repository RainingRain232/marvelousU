// ---------------------------------------------------------------------------
// Coven mode — main orchestrator
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";
import { hexKey, hexDistance } from "@world/hex/HexCoord";
import type { HexCoord } from "@world/hex/HexCoord";

import { createCovenState, CovenPhase, addCovenLog, addPotion, usePotion } from "./state/CovenState";
import type { CovenState } from "./state/CovenState";
import { CovenConfig } from "./config/CovenConfig";
import { generateCovenMap, revealAround, updateAdjacentHexes, updateLighting } from "./systems/CovenMapGenerator";
import { CovenDayNightSystem } from "./systems/CovenDayNightSystem";
import { CovenForageSystem } from "./systems/CovenForageSystem";
import { CovenBrewSystem } from "./systems/CovenBrewSystem";
import { CovenCombatSystem } from "./systems/CovenCombatSystem";
import { CovenRitualSystem } from "./systems/CovenRitualSystem";
import { getSpellDef } from "./config/CovenRecipes";

import { CovenRenderer } from "./view/CovenRenderer";
import { CovenHUD } from "./view/CovenHUD";
import { CovenCauldronScreen } from "./view/CovenCauldronScreen";
import { CovenResultsScreen } from "./view/CovenResultsScreen";
import { CovenEventScreen } from "./view/CovenEventScreen";
import { CovenStartScreen } from "./view/CovenStartScreen";
import { CovenPauseMenu } from "./view/CovenPauseMenu";
import type { CovenEvent } from "./config/CovenEvents";

export class CovenGame {
  private _state!: CovenState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;

  private _renderer = new CovenRenderer();
  private _hud = new CovenHUD();
  private _cauldronScreen = new CovenCauldronScreen();
  private _resultsScreen = new CovenResultsScreen();
  private _eventScreen = new CovenEventScreen();
  private _startScreen = new CovenStartScreen();
  private _pauseMenu = new CovenPauseMenu();

  private _pointerHandler: ((e: { global: { x: number; y: number } }) => void) | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _isMoving = false;
  private _isPaused = false;
  private _pendingEvent: CovenEvent | null = null;

  // Tutorial tracking — show hint only once
  private _hints = {
    forage: false,
    brew: false,
    dusk: false,
    night: false,
    combat: false,
    ritual: false,
    potion: false,
  };

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._showStartScreen();
  }

  private _showStartScreen(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._startScreen.setStartCallback((difficulty) => {
      viewManager.removeFromLayer("ui", this._startScreen.container);
      this._startScreen.hide();
      this._startGameWithDifficulty(difficulty);
    });
    this._startScreen.setBackCallback(() => {
      viewManager.removeFromLayer("ui", this._startScreen.container);
      this._startScreen.hide();
      this.destroy();
      window.dispatchEvent(new Event("covenExit"));
    });
    this._startScreen.show(sw, sh);
    viewManager.addToLayer("ui", this._startScreen.container);
  }

  private _startGameWithDifficulty(difficulty: import("./config/CovenConfig").CovenDifficulty): void {
    const seed = Date.now() % 2147483647;
    this._state = createCovenState(seed, difficulty);
    this._startGameInner();
  }

  private _startGame(): void {
    const seed = Date.now() % 2147483647;
    this._state = createCovenState(seed, "normal");
    this._startGameInner();
  }

  private _startGameInner(): void {
    generateCovenMap(this._state);

    // Apply meta-progression unlocks
    try {
      const meta = JSON.parse(localStorage.getItem("coven_best") ?? "{}");
      if ((meta.runs ?? 0) >= 3 && !this._state.learnedSpells.includes("shadow_bolt")) {
        this._state.learnedSpells.push("shadow_bolt");
      }
      if ((meta.totalKills ?? 0) >= 20) {
        this._state.potions.set("healing_draught", (this._state.potions.get("healing_draught") ?? 0) + 1);
      }
      if ((meta.victories ?? 0) >= 1 && (meta.totalKills ?? 0) >= 50) {
        this._state.potions.set("mana_elixir", (this._state.potions.get("mana_elixir") ?? 0) + 1);
      }
    } catch { /* no localStorage */ }

    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;

    this._renderer.init();
    this._renderer.drawMap(this._state, sw, sh);
    viewManager.addToLayer("background", this._renderer.container);

    this._hud.build(sw, sh);
    viewManager.addToLayer("ui", this._hud.container);

    this._wireCallbacks();
    this._setupInput();

    this._state.phase = CovenPhase.DAWN;

    this._tickerCb = (ticker: Ticker) => this._gameLoop(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);

    // --- Opening narrative sequence ---
    addCovenLog(this._state, "You wake in a forest clearing, alone.", 0xaa88ff);
    this._hud.showNotification("The Coven", 0xaa88ff);

    setTimeout(() => {
      addCovenLog(this._state, "Camelot has fallen. The inquisitors hunt anyone who wields magic.", 0x998899);
      this._hud.showNotification("Exiled. Hunted. Alone.", 0x998899);
    }, 1500);

    setTimeout(() => {
      addCovenLog(this._state, "Your cauldron, your grimoire, and a clearing in the dark woods. It will have to be enough.", 0x998899);
      this._hud.showNotification("Survive. Brew. Escape.", 0xcc88ff);
    }, 3500);

    setTimeout(() => {
      addCovenLog(this._state, "You brought supplies: mugwort, foxglove, silver dust. Enough for a healing potion and a ward.", 0x88aaff);
      addCovenLog(this._state, "Gather more ingredients from the forest. Click a highlighted hex to move and forage.", 0x88cc88);
      this._hud.showNotification("Click a hex to forage", 0x88cc88);
      if (this._state?.phase === CovenPhase.DAWN) {
        CovenDayNightSystem.advancePhase(this._state);
      }
    }, 5500);
  }

  private _wireCallbacks(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;

    CovenDayNightSystem.setPhaseCallback((phase) => {
      if (phase === CovenPhase.GAME_OVER) this._showResults();
      else if (phase === CovenPhase.VICTORY) { this._state.victory = true; this._showResults(); }
      else if (phase === CovenPhase.BREW) {
        if (!this._hints.brew) {
          this._hints.brew = true;
          this._hud.showNotification("BREW PHASE", 0x88aaff);
          addCovenLog(this._state, "Press B to open your cauldron. Combine ingredients into potions and spells.", 0x88aaff);
          addCovenLog(this._state, "Healing Draught: 2x Mugwort + 1x Foxglove. Try it!", 0x88aaff);
          setTimeout(() => this._hud.showNotification("B = Cauldron | Enter = Skip", 0x6688aa), 1200);
        } else {
          this._hud.showNotification("Brew phase — B for cauldron", 0x88aaff);
        }
      } else if (phase === CovenPhase.DUSK) {
        if (!this._hints.dusk) {
          this._hints.dusk = true;
          this._hud.showNotification("DUSK", 0x886644);
          addCovenLog(this._state, "Night approaches. If you have Ward Essence, press W to place a protective ward on your hex.", 0x886644);
          addCovenLog(this._state, "Wards block creatures and slow inquisitors. Press Enter when ready for night.", 0x886644);
        } else {
          this._hud.showNotification("Dusk — W for wards, Enter to continue", 0x886644);
        }
      } else if (phase === CovenPhase.NIGHT) {
        if (!this._hints.night) {
          this._hints.night = true;
          this._hud.showNotification("NIGHT FALLS", 0x4444aa);
          addCovenLog(this._state, "Creatures emerge in darkness. Move to a hex to end the night. If attacked: A to cast spell, F to flee.", 0x4444aa);
          addCovenLog(this._state, "Tip: Return to your hideout (center hex) to heal overnight.", 0x4444aa);
        } else {
          this._hud.showNotification("Night falls...", 0x4444aa);
        }
      }
    });

    CovenDayNightSystem.setCreatureSpawnCallback((creature) => {
      this._hud.showNotification(`${creature.type} lurks nearby!`, 0xff8844);
    });

    CovenForageSystem.setForageCallback((total) => {
      if (total > 0) this._hud.showNotification(`Found ${total} ingredient(s)`, 0x88cc88);
    });

    CovenForageSystem.setRitualFoundCallback((component) => {
      this._hud.showNotification(`Ritual component: ${component.replace(/_/g, " ")}!`, 0xffd700);
      if (!this._hints.ritual) {
        this._hints.ritual = true;
        addCovenLog(this._state, "RITUAL COMPONENT FOUND! Collect all 5 components, then stand on a ley line and press R to perform the Grand Ritual.", 0xffd700);
        addCovenLog(this._state, "The ritual is your only escape. Find: Moonstone Tear, Dragon Blood, Silver Mirror, Living Flame, Crown of Thorns.", 0xffd700);
        addCovenLog(this._state, "Warning: components are guarded by powerful creatures.", 0xff8844);
      }
    });

    // Event screen — triggered by foraging
    CovenForageSystem.setEventTriggerCallback((event) => {
      this._pendingEvent = event;
      this._eventScreen.show(event, sw, sh);
      viewManager.addToLayer("ui", this._eventScreen.container);
    });

    this._eventScreen.setChoiceCallback((index) => {
      if (this._pendingEvent) {
        CovenForageSystem.resolveEventChoice(this._state, this._pendingEvent, index);
        this._pendingEvent = null;
      }
      viewManager.removeFromLayer("ui", this._eventScreen.container);
      this._eventScreen.hide();
      this._redrawMap();
    });

    CovenBrewSystem.setBrewCallback((id, name) => {
      this._hud.showNotification(`Brewed: ${name}!`, 0x88aaff);
    });

    CovenCombatSystem.setCombatCallback((result) => {
      const color = result.outcome === "victory" ? 0x44ff44 : result.outcome === "fled" ? 0xffaa44 : result.outcome === "ongoing" ? 0xff8844 : 0xff4444;
      this._hud.showNotification(result.description, color);
      if (result.outcome === "victory") {
        // Chance to learn spell from creature kill (10%)
        const r = () => { this._state.seed = (this._state.seed * 16807) % 2147483647; return (this._state.seed - 1) / 2147483646; };
        if (r() < 0.1) {
          const unlearnedSpells = ["bewilderment", "sleep_fog", "shadow_bolt", "drain_life", "banishment"].filter(
            (s) => !this._state.learnedSpells.includes(s as any),
          );
          if (unlearnedSpells.length > 0) {
            const spell = unlearnedSpells[Math.floor(r() * unlearnedSpells.length)];
            this._state.learnedSpells.push(spell as any);
            this._hud.showNotification(`Learned: ${spell.replace(/_/g, " ")}!`, 0xcc88ff);
            addCovenLog(this._state, `The creature's death releases arcane knowledge — you learn ${spell.replace(/_/g, " ")}!`, 0xcc88ff);
          }
        }
        this._state.pendingCombat = null;
        this._redrawMap();
      } else if (result.outcome === "fled") {
        this._state.pendingCombat = null;
        this._redrawMap();
      }
      // "ongoing" leaves pendingCombat set
    });

    CovenRitualSystem.setRitualCallback((success, msg) => {
      if (success) {
        this._hud.showNotification("The Grand Ritual begins...", 0xffd700);
        addCovenLog(this._state, "Light erupts from the ley line. The gate shimmers into existence.", 0xffd700);
        setTimeout(() => this._hud.showNotification("The Otherworld opens!", 0xaa88ff), 1500);
        setTimeout(() => this._hud.showNotification(msg, 0xffd700), 2500);
        setTimeout(() => this._showResults(), 3500);
      } else {
        this._hud.showNotification(msg, 0xff8844);
      }
    });

    // Cauldron screen
    this._cauldronScreen.setBrewCallback((potionId) => {
      CovenBrewSystem.brew(this._state, potionId);
      this._cauldronScreen.show(this._state, sw, sh); // refresh
    });
    this._cauldronScreen.setCloseCallback(() => {
      viewManager.removeFromLayer("ui", this._cauldronScreen.container);
      this._cauldronScreen.hide();
    });

    // Results screen
    this._resultsScreen.setRetryCallback(() => { this._cleanup(); this._showStartScreen(); });
    this._resultsScreen.setMenuCallback(() => { this.destroy(); window.dispatchEvent(new Event("covenExit")); });

    // Pause menu
    this._pauseMenu.setResumeCallback(() => this._hidePauseMenu());
    this._pauseMenu.setQuitCallback(() => { this._hidePauseMenu(); this.destroy(); window.dispatchEvent(new Event("covenExit")); });
  }

  private _showPauseMenu(): void {
    if (this._isPaused) return;
    this._isPaused = true;
    this._state.paused = true;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
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

  private _setupInput(): void {
    this._pointerHandler = (e: { global: { x: number; y: number } }) => {
      if (this._state.paused || this._state.gameOver || this._state.victory || this._isMoving) return;
      if (this._state.phase !== CovenPhase.FORAGE && this._state.phase !== CovenPhase.NIGHT) return;

      const clicked = this._renderer.getClickedHex(e.global.x, e.global.y, this._state);
      if (clicked) this._movePlayer(clicked);
    };
    viewManager.app.stage.eventMode = "static";
    viewManager.app.stage.on("pointerdown", this._pointerHandler);

    this._keyHandler = (e: KeyboardEvent) => {
      if (this._state.gameOver || this._state.victory) return;

      // === Event choice keys (when event screen is showing) ===
      if (this._pendingEvent) {
        const numKey = parseInt(e.key);
        if (numKey >= 1 && numKey <= this._pendingEvent.choices.length) {
          CovenForageSystem.resolveEventChoice(this._state, this._pendingEvent, numKey - 1);
          this._pendingEvent = null;
          viewManager.removeFromLayer("ui", this._eventScreen.container);
          this._eventScreen.hide();
          this._redrawMap();
        }
        return; // block other input during event
      }

      // === Spell switching: 1-7 to select learned spells ===
      const numKey = parseInt(e.key);
      if (numKey >= 1 && numKey <= 7 && !this._state.pendingCombat) {
        const spellIdx = numKey - 1;
        if (spellIdx < this._state.learnedSpells.length) {
          this._state.activeSpell = this._state.learnedSpells[spellIdx];
          this._hud.showNotification(`Spell: ${this._state.activeSpell.replace(/_/g, " ")}`, 0xcc88ff);
        }
      }

      // === Attack in combat: Space or A ===
      if ((e.key === " " || e.key === "a" || e.key === "A") && this._state.pendingCombat) {
        this._handleCombat();
        return;
      }

      // === H = use healing potion outside combat ===
      if ((e.key === "h" || e.key === "H") && !this._state.pendingCombat) {
        if (usePotion(this._state, "healing_draught")) {
          this._state.health = Math.min(this._state.maxHealth, this._state.health + 30);
          this._hud.showNotification("Healing Draught: +30 HP", 0x44aa44);
          addCovenLog(this._state, "You drink a healing draught. Warmth spreads through you.", 0x44aa44);
        } else if (usePotion(this._state, "mana_elixir")) {
          this._state.mana = Math.min(this._state.maxMana, this._state.mana + 25);
          this._hud.showNotification("Mana Elixir: +25 mana", 0x4488ff);
          addCovenLog(this._state, "The mana elixir courses through you.", 0x4488ff);
        } else {
          this._hud.showNotification("No potions to use", 0x888888);
        }
      }

      // B = open cauldron (during brew phase)
      if ((e.key === "b" || e.key === "B") && this._state.phase === CovenPhase.BREW) {
        const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
        this._cauldronScreen.show(this._state, sw, sh);
        viewManager.addToLayer("ui", this._cauldronScreen.container);
      }

      // W = place ward (during dusk phase, if has ward_essence potion)
      if ((e.key === "w" || e.key === "W") && this._state.phase === CovenPhase.DUSK) {
        this._placeWard();
      }

      // Enter = advance phase
      if (e.key === "Enter") {
        if (this._state.phase === CovenPhase.BREW) {
          viewManager.removeFromLayer("ui", this._cauldronScreen.container);
          this._cauldronScreen.hide();
          CovenDayNightSystem.advancePhase(this._state); // BREW → DUSK
          this._hud.showNotification("Dusk — press W to place wards, Enter to continue", 0x886644);
          this._redrawMap();
        } else if (this._state.phase === CovenPhase.DUSK) {
          CovenDayNightSystem.advancePhase(this._state); // DUSK → NIGHT
          this._redrawMap();
          if (this._state.pendingCombat) {
            this._hud.showNotification("A creature attacks! Press A to fight, F to flee", 0xff4444);
          }
        }
      }

      // F = flee during combat
      if ((e.key === "f" || e.key === "F") && this._state.pendingCombat) {
        CovenCombatSystem.flee(this._state);
        this._hud.showNotification("You fled!", 0xffaa44);
      }

      // R = attempt ritual
      if ((e.key === "r" || e.key === "R") && CovenRitualSystem.canPerformRitual(this._state)) {
        CovenRitualSystem.performRitual(this._state);
      }

      // Escape — toggle pause menu
      if (e.key === "Escape") {
        if (this._isPaused) {
          this._hidePauseMenu();
        } else {
          this._showPauseMenu();
        }
      }
    };
    window.addEventListener("keydown", this._keyHandler);
  }

  private _movePlayer(target: HexCoord): void {
    const key = hexKey(target.q, target.r);
    const hex = this._state.hexes.get(key);
    if (!hex) return;

    this._isMoving = true;
    this._state.playerPosition = { q: target.q, r: target.r };
    hex.visited = true;

    // Reveal area
    const revealRange = 1 + (this._state.familiars.some((f) => f.type === "owl" && f.active) ? 1 : 0);
    revealAround(this._state, target, revealRange);
    updateAdjacentHexes(this._state);
    updateLighting(this._state);

    // Forage at new location
    if (this._state.phase === CovenPhase.FORAGE) {
      CovenForageSystem.forage(this._state);
    }

    this._redrawMap();

    setTimeout(() => {
      this._isMoving = false;

      // Check for creature encounter
      if (hex.creatureId) {
        const creature = this._state.creatures.find((c) => c.id === hex.creatureId);
        if (creature) {
          this._state.pendingCombat = creature;
          this._hud.showNotification(`${creature.type.replace(/_/g, " ")} blocks your path!`, 0xff4444);
          if (!this._hints.combat) {
            this._hints.combat = true;
            addCovenLog(this._state, "COMBAT! Press A or Space to attack with your active spell. Press F to flee (costs 8 mana + 5 HP).", 0xff8844);
            addCovenLog(this._state, "Switch spells with 1-7 keys. Each spell has different mana cost and damage.", 0xff8844);
          }
          this._handleCombat();
          return;
        }
      }

      // Check for adjacent inquisitor (they detect you when you move near)
      for (const inq of this._state.inquisitors) {
        const dist = hexDistance(target, inq.position);
        if (dist <= 1) {
          addCovenLog(this._state, "An inquisitor spots you!", 0xff6644);
          this._hud.showNotification("Inquisitor attacks!", 0xff6644);
          this._state.pendingCombat = {
            id: inq.id, type: "inquisitor", hp: inq.strength, maxHp: inq.strength,
            damage: Math.min(25, 12 + Math.floor(this._state.day * 0.6)), position: inq.position, nocturnalOnly: false,
            loot: ["iron_filings", "silver_dust"],
          };
          this._handleCombat();
          return;
        }
      }

      // After foraging, advance to brew phase
      if (this._state.phase === CovenPhase.FORAGE) {
        CovenDayNightSystem.advancePhase(this._state); // FORAGE → BREW
      }

      // During night, check for end of night
      if (this._state.phase === CovenPhase.NIGHT) {
        CovenDayNightSystem.advancePhase(this._state); // NIGHT → DAWN
        if (!this._state.gameOver) {
          this._hud.showNotification(`Day ${this._state.day}`, 0xaa88ff);
          setTimeout(() => {
            if (this._state && !this._state.gameOver) {
              CovenDayNightSystem.advancePhase(this._state); // DAWN → FORAGE
              this._hud.showNotification("Forage", 0x88cc88);
              this._redrawMap();
            }
          }, 800);
        }
      }
    }, 350);
  }

  private _handleCombat(): void {
    if (!this._state.pendingCombat) return;
    const creature = this._state.pendingCombat;
    const creatureName = creature.type.replace(/_/g, " ");

    this._hud.showNotification(`Fighting ${creatureName}! (A=Attack, F=Flee, 1-7=Switch spell)`, 0xff4444);

    // Trigger spell cast visual
    const spellInfo = this._state.activeSpell ? getSpellDef(this._state.activeSpell) : null;
    this._renderer.triggerSpellFlash(spellInfo?.color ?? 0xaa88ff);

    // One round of combat
    const result = CovenCombatSystem.resolveCombatRound(this._state, creature, this._state.activeSpell);

    if (result.outcome === "ongoing") {
      // Combat continues — player must press A again or F to flee
      this._hud.showNotification(`${creatureName}: ${creature.hp}/${creature.maxHp} HP — Press A to attack`, 0xff8844);
    }
    this._redrawMap();
  }

  private _placeWard(): void {
    if (!usePotion(this._state, "ward_essence")) {
      this._hud.showNotification("No Ward Essence potion! Brew one first.", 0xff8844);
      return;
    }
    const key = hexKey(this._state.playerPosition.q, this._state.playerPosition.r);
    const hex = this._state.hexes.get(key);
    if (!hex) return;

    if (hex.wardId) {
      this._hud.showNotification("This hex is already warded.", 0xff8844);
      addPotion(this._state, "ward_essence"); // refund
      return;
    }

    const wardId = `ward_${this._state.day}_${this._state.wards.length}`;
    hex.wardId = wardId;
    hex.wardDurability = CovenConfig.WARD_BASE_DURABILITY;

    this._state.wards.push({
      id: wardId,
      type: "salt_circle",
      position: { ...this._state.playerPosition },
      durability: CovenConfig.WARD_BASE_DURABILITY,
    });

    addCovenLog(this._state, "You trace a circle of salt and silver. A ward shimmers into existence.", 0x8888ff);
    this._hud.showNotification("Ward placed!", 0x8888ff);
    this._redrawMap();
  }

  private _redrawMap(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._renderer.drawMap(this._state, sw, sh);
  }

  private _showResults(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._resultsScreen.show(this._state, sw, sh);
    viewManager.addToLayer("ui", this._resultsScreen.container);
  }

  private _gameLoop(dt: number): void {
    if (!this._state) return;
    this._hud.updateNotifications(dt);
    if (this._state.paused) return;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._renderer.update(this._state, dt, sw, sh);
    this._hud.update(this._state, sw, sh);
  }

  private _cleanup(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    if (this._pointerHandler) { viewManager.app.stage.off("pointerdown", this._pointerHandler); this._pointerHandler = null; }
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }

    CovenDayNightSystem.cleanup();
    CovenForageSystem.cleanup();
    CovenBrewSystem.cleanup();
    CovenCombatSystem.cleanup();
    CovenRitualSystem.cleanup();

    this._renderer.cleanup(); this._hud.cleanup(); this._cauldronScreen.cleanup(); this._resultsScreen.cleanup(); this._eventScreen.cleanup();
    this._startScreen.cleanup(); this._pauseMenu.cleanup();
    this._pendingEvent = null; this._isPaused = false;
    viewManager.removeFromLayer("background", this._renderer.container);
    viewManager.removeFromLayer("ui", this._hud.container);
    viewManager.removeFromLayer("ui", this._cauldronScreen.container);
    viewManager.removeFromLayer("ui", this._resultsScreen.container);
    viewManager.removeFromLayer("ui", this._startScreen.container);
    viewManager.removeFromLayer("ui", this._pauseMenu.container);
    viewManager.removeFromLayer("ui", this._eventScreen.container);
    viewManager.clearWorld();
  }

  destroy(): void { this._cleanup(); }
}
