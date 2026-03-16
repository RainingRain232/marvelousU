// ---------------------------------------------------------------------------
// Panzer Dragoon mode orchestrator
// Arthur rides a great white eagle through the skies, wielding a magic wand
// against waves of enemies and colossal bosses.
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";
import { createDragoonState, DragoonClassId, DragoonDifficulty } from "./state/DragoonState";
import type { DragoonState } from "./state/DragoonState";
import { DragoonBalance, CLASS_DEFINITIONS, SUBCLASS_DEFINITIONS, SKILL_CONFIGS, getSubclassSkillTree } from "./config/DragoonConfig";
import { DragoonInputSystem } from "./systems/DragoonInputSystem";
import { DragoonWaveSystem } from "./systems/DragoonWaveSystem";
import { DragoonCombatSystem } from "./systems/DragoonCombatSystem";
import { DragoonRenderer } from "./view/DragoonRenderer";
import { DragoonFX } from "./view/DragoonFX";
import { DragoonHUD } from "./view/DragoonHUD";

const DT = DragoonBalance.SIM_TICK_MS / 1000;

// ---------------------------------------------------------------------------
// DragoonGame
// ---------------------------------------------------------------------------

export class DragoonGame {
  private _state!: DragoonState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _simAccumulator = 0;
  private _selectedDifficulty: DragoonDifficulty = DragoonDifficulty.NORMAL;

  // View delegates
  private _renderer = new DragoonRenderer();
  private _fx = new DragoonFX();
  private _hud = new DragoonHUD();

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    this._state = createDragoonState(sw, sh, this._selectedDifficulty);

    // Renderer
    this._renderer.init(sw, sh);
    viewManager.addToLayer("units", this._renderer.worldLayer);

    // Disable ViewManager camera — Dragoon has its own camera system
    viewManager.camera.keyboardEnabled = false;
    viewManager.camera.manualControlMode = true;
    viewManager.camera.x = 0;
    viewManager.camera.y = 0;
    viewManager.camera.zoom = 1;

    // FX
    this._fx.init();
    viewManager.addToLayer("fx", this._fx.container);

    // HUD
    this._hud.build(sw, sh);
    viewManager.addToLayer("ui", this._hud.container);

    // Input
    DragoonInputSystem.init(this._state);
    DragoonInputSystem.setPauseCallback((_paused) => {
      // Pause notification is handled by the escape menu overlay now
    });

    // Class selection callback
    DragoonInputSystem.setClassSelectCallback((classId) => {
      this._selectClass(classId);
    });

    // Subclass selection callback
    DragoonInputSystem.setSubclassSelectCallback((index) => {
      this._selectSubclass(index);
    });

    // Escape menu callback
    DragoonInputSystem.setEscapeMenuCallback((show) => {
      this._state.escapeMenuOpen = show;
      if (show && !this._state.gameOver && !this._state.victory) {
        this._hud.showEscapeMenu(sw, sh, () => {
          // Resume
          this._state.paused = false;
          this._state.escapeMenuOpen = false;
          this._hud.hideEscapeMenu();
        }, () => {
          // Main menu
          this._cleanup();
          window.dispatchEvent(new Event("dragoonExit"));
        });
      } else {
        this._hud.hideEscapeMenu();
      }
    });

    // Combat callbacks → FX
    DragoonCombatSystem.setExplosionCallback((x, y, radius, color) => {
      this._fx.pendingExplosions.push({ x, y, radius, color });
    });
    DragoonCombatSystem.setHitCallback((x, y, damage, isCrit) => {
      this._fx.pendingHits.push({ x, y, damage, isCrit });
    });
    DragoonCombatSystem.setPlayerHitCallback(() => {
      this._fx.shake(10, 0.3);
      this._fx.screenFlash(0xff0000, 0.2);
    });
    DragoonCombatSystem.setLightningCallback((x, y) => {
      this._fx.pendingLightning.push({ x, y });
    });
    DragoonCombatSystem.setSkillUnlockCallback((skillId) => {
      const sw2 = viewManager.screenWidth;
      const sh2 = viewManager.screenHeight;
      const cfg = SKILL_CONFIGS[skillId];
      this._hud.showNotification(`Skill Unlocked: ${cfg.name}!`, cfg.color, sw2, sh2);
      this._hud.showNotification(`Press [6] to use — [Tab] to switch`, 0xaaaaaa, sw2, sh2);
      this._fx.screenFlash(cfg.color, 0.2);
    });
    // Dragon evolution callback
    DragoonCombatSystem.setEvolutionCallback((_stage, name) => {
      const sw2 = viewManager.screenWidth;
      const sh2 = viewManager.screenHeight;
      this._hud.showNotification(`Dragon Evolved: ${name}!`, 0xffd700, sw2, sh2);
      this._fx.screenFlash(0xffd700, 0.4);
      this._fx.shake(8, 0.4);
    });

    // Destructible collapse callback
    DragoonCombatSystem.setDestructibleCollapseCallback((x, y, radius, color, _debrisCount) => {
      this._fx.pendingExplosions.push({ x, y, radius, color });
      this._fx.shake(6, 0.3);
    });

    // Fork selection callback
    DragoonWaveSystem.setForkCallback((_forkState) => {
      const sw2 = viewManager.screenWidth;
      const sh2 = viewManager.screenHeight;
      this._hud.showForkChoice(this._state, sw2, sh2);
    });

    // Fork path selection input callback
    DragoonInputSystem.setForkSelectCallback((index) => {
      this._selectForkPath(index);
    });

    DragoonCombatSystem.setLevelUpCallback((level) => {
      const sw2 = viewManager.screenWidth;
      const sh2 = viewManager.screenHeight;
      this._hud.showNotification(`Level ${level}!`, 0xffdd44, sw2, sh2);
      this._fx.screenFlash(0xffdd44, 0.15);

      // Check if subclass choice was triggered
      if (this._state.subclassChoiceActive) {
        this._hud.buildSubclassChoice(this._state, sw2, sh2);
      }
    });

    // Music
    audioManager.switchTrack("battle");

    // Show class selection
    this._hud.buildClassSelect(sw, sh);

    // Start game loop
    this._tickerCb = (ticker: Ticker) => {
      this._gameLoop(ticker.deltaMS / 1000);
    };
    viewManager.app.ticker.add(this._tickerCb);
  }

  // ---------------------------------------------------------------------------
  // Class Selection
  // ---------------------------------------------------------------------------

  private _selectClass(classId: DragoonClassId): void {
    const state = this._state;
    if (!state.classSelectActive) return;

    const classDef = CLASS_DEFINITIONS[classId];
    if (!classDef) return;

    state.classId = classId;
    state.classSelectActive = false;

    // Apply class stats
    state.player.maxHp = Math.floor(100 * classDef.hpMod);
    state.player.hp = state.player.maxHp;
    state.player.maxMana = Math.floor(100 * classDef.manaMod);
    state.player.mana = state.player.maxMana;
    state.player.manaRegen = Math.floor(8 * classDef.manaRegenMod);

    // Set up skills: [basicAttack, skill1, skill2, skill3, skill4, skill5]
    const basicCfg = SKILL_CONFIGS[classDef.basicAttack];
    state.skills = [
      { id: classDef.basicAttack, cooldown: 0, maxCooldown: basicCfg.cooldown, active: false, activeTimer: 0 },
      ...classDef.skills.map(skillId => {
        const cfg = SKILL_CONFIGS[skillId];
        return { id: skillId, cooldown: 0, maxCooldown: cfg.cooldown, active: false, activeTimer: 0 };
      }),
    ];

    this._hud.hideClassSelect();

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    this._hud.showNotification(`${classDef.name} selected!`, classDef.color, sw, sh);
  }

  // ---------------------------------------------------------------------------
  // Subclass Selection
  // ---------------------------------------------------------------------------

  private _selectSubclass(index: number): void {
    const state = this._state;
    if (!state.subclassChoiceActive || !state.subclassOptions) return;
    if (index < 0 || index > 1) return;

    const subclassId = state.subclassOptions[index];
    const subDef = SUBCLASS_DEFINITIONS[subclassId];
    if (!subDef) return;

    state.subclassId = subclassId;
    state.subclassChoiceActive = false;
    state.subclassSelected = true;
    state.paused = false;

    // Build the skill tree for the chosen subclass
    state.subclassSkillTree = getSubclassSkillTree(subclassId);

    // Apply the first subclass point (level 5 node) immediately
    this._applySubclassPoint(state);

    this._hud.hideSubclassChoice();

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    this._hud.showNotification(`${subDef.name} path chosen!`, subDef.color, sw, sh);
    this._fx.screenFlash(subDef.color, 0.3);
  }

  // ---------------------------------------------------------------------------
  // Subclass Skill Tree — apply next available node
  // ---------------------------------------------------------------------------

  private _applySubclassPoint(state: DragoonState): void {
    const tree = state.subclassSkillTree;
    if (!tree.length) return;

    // Find the next locked node whose level requirement is met
    for (const node of tree) {
      if (!node.unlocked && state.player.level >= node.level) {
        node.unlocked = true;
        state.subclassPoints++;

        // Apply stat bonuses
        if (node.statBonus) {
          if (node.statBonus.hp) {
            state.player.maxHp += node.statBonus.hp;
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + node.statBonus.hp);
          }
          if (node.statBonus.mana) {
            state.player.maxMana += node.statBonus.mana;
            state.player.mana = Math.min(state.player.maxMana, state.player.mana + node.statBonus.mana);
          }
          if (node.statBonus.damage) {
            state.player.damageMultiplier += node.statBonus.damage / 100;
          }
          if (node.statBonus.speed) {
            state.player.speedMultiplier += node.statBonus.speed / 100;
          }
        }

        // Grant skill if this node provides one
        if (node.skillId) {
          const subDef = state.subclassId ? SUBCLASS_DEFINITIONS[state.subclassId] : null;
          if (subDef) {
            const skillCfg = SKILL_CONFIGS[node.skillId];
            // Replace skill slot 4 or 5 depending on which subclass skill this is
            if (node.skillId === subDef.replaceSkill4) {
              state.skills[4] = { id: node.skillId, cooldown: 0, maxCooldown: skillCfg.cooldown, active: false, activeTimer: 0 };
            } else if (node.skillId === subDef.replaceSkill5) {
              state.skills[5] = { id: node.skillId, cooldown: 0, maxCooldown: skillCfg.cooldown, active: false, activeTimer: 0 };
            }
          }
        }

        // Mark fully unlocked once all 4 nodes are done
        if (tree.every(n => n.unlocked)) {
          state.subclassUnlocked = true;
        }

        const sw = viewManager.screenWidth;
        const sh = viewManager.screenHeight;
        this._hud.showNotification(`${node.name}: ${node.description}`, 0xffcc44, sw, sh);
        break; // Only apply one node per call
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Fork Path Selection
  // ---------------------------------------------------------------------------

  private _selectForkPath(index: number): void {
    const state = this._state;
    if (!state.branchState.forkActive) return;

    DragoonWaveSystem.selectForkPath(state, index);
    this._hud.hideForkChoice();

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    const path = state.branchState.chosenPath;
    if (path) {
      this._hud.showNotification(`Path chosen: ${path.replace(/_/g, " ")}`, 0xffcc44, sw, sh);
    }
  }

  // ---------------------------------------------------------------------------
  // Game Loop
  // ---------------------------------------------------------------------------

  private _gameLoop(rawDt: number): void {
    if (!this._state) return;
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    const state = this._state;

    // Update screen dims
    state.screenW = sw;
    state.screenH = sh;
    state.worldWidth = sw * DragoonBalance.WORLD_WIDTH_MULT;

    // Game over / victory
    if (state.gameOver) {
      this._handleGameOver(sw, sh);
    }
    if (state.victory) {
      this._handleVictory(sw, sh);
    }

    // Fixed timestep simulation
    if (!state.paused && !state.gameOver && !state.victory && !state.classSelectActive && !state.subclassChoiceActive && !state.branchState.forkActive) {
      this._simAccumulator += rawDt;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        state.gameTime += DT;

        // Systems
        DragoonInputSystem.update(state, DT);
        DragoonWaveSystem.update(state, DT);
        DragoonCombatSystem.update(state, DT);

        // Sky scroll
        for (const layer of state.skyLayers) {
          layer.offset += layer.speed * DT;
        }
      }
    }

    // Render (always, even when paused)
    this._render(rawDt);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private _render(dt: number): void {
    const state = this._state;
    const sw = state.screenW;
    const sh = state.screenH;

    this._renderer.render(state, dt);
    this._fx.update(state, dt);
    this._renderer.worldLayer.position.set(-state.cameraX + this._fx.shakeX, this._fx.shakeY);
    this._hud.update(state, sw, sh, dt);
  }

  // ---------------------------------------------------------------------------
  // Game Over / Victory
  // ---------------------------------------------------------------------------

  private _gameOverShown = false;
  private _victoryShown = false;

  private _handleGameOver(sw: number, sh: number): void {
    if (this._gameOverShown) return;
    this._gameOverShown = true;
    audioManager.switchTrack("game_over");

    this._hud.showNotification("GAME OVER", 0xff4444, sw, sh);

    setTimeout(() => {
      this._showRestartPrompt(sw, sh);
    }, 2000);
  }

  private _handleVictory(sw: number, sh: number): void {
    if (this._victoryShown) return;
    this._victoryShown = true;

    this._hud.showNotification("VICTORY!", 0xffd700, sw, sh);
    this._fx.screenFlash(0xffd700, 0.5);

    setTimeout(() => {
      this._hud.showNotification(`Final Score: ${this._state.player.score.toLocaleString()}`, 0xffffff, sw, sh);
    }, 1500);

    setTimeout(() => {
      this._showRestartPrompt(sw, sh);
    }, 3000);
  }

  private _showRestartPrompt(sw: number, sh: number): void {
    const handler = (e: KeyboardEvent) => {
      window.removeEventListener("keydown", handler);
      if (e.code === "Escape") {
        window.dispatchEvent(new Event("dragoonExit"));
      } else {
        this._restart();
      }
    };
    window.addEventListener("keydown", handler);
    this._hud.showNotification("Press any key to retry / ESC to exit", 0xaaaaaa, sw, sh);
  }

  private _restart(): void {
    this._cleanup();
    this._gameOverShown = false;
    this._victoryShown = false;
    this.boot();
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private _cleanup(): void {
    // Re-enable ViewManager camera for other modes
    viewManager.camera.keyboardEnabled = true;
    viewManager.camera.manualControlMode = false;

    DragoonInputSystem.destroy();
    DragoonCombatSystem.setExplosionCallback(null);
    DragoonCombatSystem.setHitCallback(null);
    DragoonCombatSystem.setPlayerHitCallback(null);
    DragoonCombatSystem.setLightningCallback(null);
    DragoonCombatSystem.setLevelUpCallback(null);
    DragoonCombatSystem.setSkillUnlockCallback(null);
    DragoonCombatSystem.setEvolutionCallback(null);
    DragoonCombatSystem.setDestructibleCollapseCallback(null);
    DragoonWaveSystem.setForkCallback(null);
    DragoonWaveSystem.reset();

    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }

    this._renderer.cleanup();
    this._fx.cleanup();
    this._hud.cleanup();
    viewManager.removeFromLayer("ui", this._hud.container);
    viewManager.removeFromLayer("fx", this._fx.container);
    viewManager.clearWorld();
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    this._cleanup();
  }
}
