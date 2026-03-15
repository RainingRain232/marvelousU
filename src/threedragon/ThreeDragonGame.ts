// ---------------------------------------------------------------------------
// 3Dragon mode orchestrator
// Arthur rides a great white eagle through beautiful 3D skies,
// wielding a magic wand against waves of enemies and colossal bosses.
// Uses Three.js for 3D rendering with an HTML HUD overlay.
// ---------------------------------------------------------------------------

import { audioManager } from "@audio/AudioManager";
import { createThreeDragonState } from "./state/ThreeDragonState";
import type { ThreeDragonState } from "./state/ThreeDragonState";
import { TDBalance, TD_MAPS, TD_MAP_BY_ID, TD_SKILL_CONFIGS } from "./config/ThreeDragonConfig";
import { ThreeDragonInputSystem } from "./systems/ThreeDragonInputSystem";
import { ThreeDragonWaveSystem } from "./systems/ThreeDragonWaveSystem";
import { ThreeDragonCombatSystem } from "./systems/ThreeDragonCombatSystem";
import { ThreeDragonRenderer } from "./view/ThreeDragonRenderer";
import { ThreeDragonHUD } from "./view/ThreeDragonHUD";

const DT = TDBalance.SIM_TICK_MS / 1000;

// ---------------------------------------------------------------------------
// ThreeDragonGame
// ---------------------------------------------------------------------------

export class ThreeDragonGame {
  private _state!: ThreeDragonState;
  private _rafId: number | null = null;
  private _simAccumulator = 0;
  private _lastTime = 0;
  private _selectedMapId = "enchanted_valley";

  // View delegates
  private _renderer = new ThreeDragonRenderer();
  private _hud = new ThreeDragonHUD();

  // Camera shake state
  private _shakeTimer = 0;
  private _shakeMag = 0;

  // Wave transition tracking for level-up rewards
  private _wasBetweenWaves = true;

  // Menu elements
  private _menuRoot: HTMLDivElement | null = null;
  private _menuStyle: HTMLStyleElement | null = null;

  // ---------------------------------------------------------------------------
  // Boot — shows map menu first, then starts the game
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    audioManager.playGameMusic();
    const mapId = await this._showMapMenu();
    this._selectedMapId = mapId;
    this._bootGame(mapId);
  }

  private _bootGame(mapId: string): void {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const mapCfg = TD_MAP_BY_ID[mapId] ?? TD_MAPS[0];

    this._state = createThreeDragonState(sw, sh, mapId);

    // Initialize Three.js renderer
    this._renderer.init(sw, sh, mapCfg);
    document.body.appendChild(this._renderer.canvas);

    // Build HUD
    this._hud.build(sw, sh);

    // Input
    ThreeDragonInputSystem.init(this._state);
    ThreeDragonInputSystem.setPauseCallback((paused) => {
      // If skill equip menu is open, close it instead of toggling pause
      if (this._hud.isSkillEquipVisible) {
        this._hud.hideSkillEquipMenu();
        this._state.paused = false;
        return;
      }
      if (paused && !this._state.gameOver && !this._state.victory) {
        this._hud.showPauseMenu();
      } else {
        this._hud.hidePauseMenu();
      }
    });

    // Tab: skill equip menu
    ThreeDragonInputSystem.setTabCallback(() => {
      if (this._state.gameOver || this._state.victory) return;
      if (this._hud.isSkillEquipVisible) {
        this._hud.hideSkillEquipMenu();
        this._state.paused = false;
      } else {
        this._state.paused = true;
        this._hud.hidePauseMenu();
        this._hud.showSkillEquipMenu(this._state);
      }
    });

    // Skill equip callback
    this._hud.setEquipSkillCallback((slot, skillId) => {
      if (slot >= 0 && slot < 5) {
        // If skill already equipped in another slot, swap
        const existingSlot = this._state.equippedSkills.indexOf(skillId);
        if (existingSlot !== -1) {
          const temp = this._state.equippedSkills[slot];
          this._state.equippedSkills[slot] = skillId;
          this._state.equippedSkills[existingSlot] = temp;
        } else {
          this._state.equippedSkills[slot] = skillId;
        }
        // Ensure skill state exists
        if (!this._state.skills.find(s => s.id === skillId)) {
          const cfg = TD_SKILL_CONFIGS[skillId];
          if (cfg) {
            this._state.skills.push({
              id: skillId,
              cooldown: 0,
              maxCooldown: cfg.cooldown,
              active: false,
              activeTimer: 0,
            });
          }
        }
      }
    });

    // Pause menu callbacks
    this._hud.setPauseCallbacks(
      () => {
        // Resume
        this._state.paused = false;
        this._hud.hidePauseMenu();
      },
      () => {
        // Restart
        this._hud.hidePauseMenu();
        this._restart();
      },
      () => {
        // Quit
        this._hud.hidePauseMenu();
        window.dispatchEvent(new Event("threeDragonExit"));
      },
    );

    // Combat callbacks → 3D FX
    ThreeDragonCombatSystem.setExplosionCallback((x, y, z, radius, color) => {
      this._renderer.addExplosion(x, y, z, radius, color);
      this._shake(radius > 5 ? 1.0 : 0.4, 0.25);
      // audioManager.playSfx("explosion");
    });
    ThreeDragonCombatSystem.setHitCallback((x, y, z, damage, isCrit) => {
      // Visible impact sparks and energy dispersal at hit point
      this._renderer.addHitEffect(x, y, z, damage, isCrit);
      if (isCrit) this._shake(0.3, 0.08);
    });
    ThreeDragonCombatSystem.setPlayerHitCallback(() => {
      this._shake(2.0, 0.35);
      this._renderer.addScreenFlash(0xff0000, 0.35);
      this._renderer.addPlayerHitEffect(
        this._state.player.position.x,
        this._state.player.position.y,
        this._state.player.position.z,
      );
      // audioManager.playSfx("player_hit");
    });
    ThreeDragonCombatSystem.setLightningCallback((x, y, z) => {
      this._renderer.addLightning(x, y, z);
      this._shake(0.6, 0.18);
    });
    ThreeDragonCombatSystem.setEnemyDeathCallback((x, y, z, size, color, glowColor, isBoss) => {
      this._renderer.addEnemyDeathEffect(x, y, z, size, color, glowColor, isBoss);
      if (isBoss) this._shake(1.5, 0.4);
    });
    ThreeDragonCombatSystem.setBossKillCallback((x, y, z, size, color, glowColor) => {
      // Epic multi-stage boss kill effect
      this._renderer.addEnemyDeathEffect(x, y, z, size * 2.5, color, glowColor, true);
      this._renderer.addScreenFlash(0xffffff, 0.4);
      this._renderer.addScreenFlash(glowColor, 1.0);
      this._renderer.addExplosion(x, y, z, size * 4, glowColor);
      // Delayed secondary explosions
      setTimeout(() => {
        this._renderer.addExplosion(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 5, z + (Math.random() - 0.5) * 8, size * 2.5, color);
        this._shake(2.0, 0.3);
      }, 150);
      setTimeout(() => {
        this._renderer.addExplosion(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 6, z + (Math.random() - 0.5) * 10, size * 3, 0xffffff);
        this._renderer.addLightning(x, y, z);
        this._shake(2.5, 0.3);
      }, 350);
      this._shake(4.0, 0.8);
      this._hud.showNotification("BOSS DEFEATED!", "#ffd700");
      // audioManager.playSfx("boss_kill");
    });
    ThreeDragonCombatSystem.setPowerUpCollectCallback((x, y, z, type) => {
      const flashColor = type === "health" ? 0x44ff66 : 0x4488ff;
      this._renderer.addScreenFlash(flashColor, 0.25);
      this._renderer.addPowerUpCollectEffect(x, y, z, type);
      this._shake(0.3, 0.1);
      // audioManager.playSfx("powerup");
    });

    // Damage number callback
    ThreeDragonCombatSystem.setDamageNumberCallback((x, y, z, damage, isCrit, isElite) => {
      const screen = this._renderer.projectToScreen({ x, y, z }, this._state.screenW, this._state.screenH);
      if (screen.visible) {
        this._hud.showDamageNumber(screen.x, screen.y, damage, isCrit, isElite);
      }
    });

    // Skill unlock callback
    ThreeDragonCombatSystem.setSkillUnlockCallback((_skillId, skillName) => {
      this._hud.showNotification(`New Skill Unlocked: ${skillName}!`, "#ff44ff");
      this._renderer.addScreenFlash(0xff44ff, 0.3);
      this._shake(0.5, 0.2);
    });

    // Level up callback
    ThreeDragonCombatSystem.setLevelUpCallback((level) => {
      this._hud.showNotification(`Level ${level}!`, "#44ff88");
      this._renderer.addScreenFlash(0x44ff88, 0.2);
    });

    // Music
    audioManager.switchTrack("battle");

    // Handle window resize
    this._onResize = this._onResize.bind(this);
    window.addEventListener("resize", this._onResize);

    // Start game loop
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  // ---------------------------------------------------------------------------
  // Game Loop (uses requestAnimationFrame directly for Three.js)
  // ---------------------------------------------------------------------------

  private _gameLoop(timestamp: number): void {
    if (!this._state) return;

    const rawDt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    const sw = window.innerWidth;
    const sh = window.innerHeight;
    this._state.screenW = sw;
    this._state.screenH = sh;

    // Game over / victory
    if (this._state.gameOver) {
      this._handleGameOver();
    }
    if (this._state.victory) {
      this._handleVictory();
    }

    // Fixed timestep simulation
    if (!this._state.paused && !this._state.gameOver && !this._state.victory) {
      this._simAccumulator += rawDt;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;

        // Slow-mo: use real DT for timer, simDt for simulation
        let simDt = DT;
        if (this._state.slowMoTimer > 0) {
          simDt = DT * this._state.slowMoFactor;
          this._state.slowMoTimer -= DT;
          if (this._state.slowMoTimer <= 0) {
            this._state.slowMoTimer = 0;
            this._state.slowMoFactor = 1;
          } else {
            // Lerp slowMoFactor back toward 1.0 as timer approaches 0
            const remaining = this._state.slowMoTimer / 1.5;
            this._state.slowMoFactor = 0.2 + (1 - 0.2) * (1 - remaining);
          }
        }

        this._state.gameTime += simDt;
        this._state.dayPhase += simDt * 0.01;

        ThreeDragonInputSystem.update(this._state, simDt);
        ThreeDragonWaveSystem.update(this._state, simDt);
        ThreeDragonCombatSystem.update(this._state, simDt);

        // Detect wave completion for level-up rewards
        if (this._state.betweenWaves && !this._wasBetweenWaves && this._state.wave > 0) {
          // Grant scaling bonuses per wave completed
          const p = this._state.player;
          p.maxHp += 5;
          p.hp = Math.min(p.maxHp, p.hp + 10);
          p.maxMana += 3;
          p.mana = Math.min(p.maxMana, p.mana + 15);
          p.manaRegen += 0.3;

          // Show notification
          this._hud.showNotification(`Level Up! +5 HP, +3 Mana`, "#44ff88");
        }
        this._wasBetweenWaves = this._state.betweenWaves;
      }
    }

    // Render (always)
    this._render(rawDt);

    // Continue loop
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private _render(dt: number): void {
    const state = this._state;

    // Apply camera shake
    if (this._shakeTimer > 0) {
      this._shakeTimer -= dt;
      const intensity = this._shakeTimer > 0 ? this._shakeMag * (this._shakeTimer / 0.2) : 0;
      this._renderer.shake(intensity, this._shakeTimer);
      if (this._shakeTimer <= 0) {
        this._shakeMag = 0;
      }
    }

    // Render 3D world
    this._renderer.render(state, dt);

    // Edge indicators for off-screen enemies
    const indicators: { screenX: number; screenY: number; angle: number; isBoss: boolean }[] = [];
    const margin = 30;
    for (const e of this._state.enemies) {
      if (!e.alive) continue;
      const screen = this._renderer.projectToScreen(e.position, this._state.screenW, this._state.screenH);
      if (!screen.visible) {
        // Clamp to screen edges
        const cx = this._state.screenW / 2;
        const cy = this._state.screenH / 2;
        const angle = Math.atan2(screen.y - cy, screen.x - cx);
        const edgeX = Math.max(margin, Math.min(this._state.screenW - margin, cx + Math.cos(angle) * (cx - margin)));
        const edgeY = Math.max(margin, Math.min(this._state.screenH - margin, cy + Math.sin(angle) * (cy - margin)));
        indicators.push({ screenX: edgeX, screenY: edgeY, angle, isBoss: e.isBoss });
      }
    }
    this._hud.updateEdgeIndicators(indicators);

    // Update HUD
    this._hud.update(state, state.screenW, state.screenH, dt);
  }

  private _shake(magnitude: number, duration: number): void {
    this._shakeMag = Math.max(this._shakeMag, magnitude);
    this._shakeTimer = Math.max(this._shakeTimer, duration);
  }

  // ---------------------------------------------------------------------------
  // Game Over / Victory
  // ---------------------------------------------------------------------------

  private _gameOverShown = false;
  private _victoryShown = false;

  private _saveHighScore(): void {
    const key = `td_highscore_${this._selectedMapId}`;
    const current = parseInt(localStorage.getItem(key) || "0");
    const score = this._state.player.score;
    if (score > current) {
      localStorage.setItem(key, score.toString());
      this._hud.showNotification("NEW HIGH SCORE!", "#ffd700");
    }
  }

  private _handleGameOver(): void {
    if (this._gameOverShown) return;
    this._gameOverShown = true;
    this._saveHighScore();
    audioManager.switchTrack("game_over");

    this._hud.showNotification("GAME OVER", "#ff4444");

    setTimeout(() => {
      this._showRestartPrompt();
    }, 2000);
  }

  private _handleVictory(): void {
    if (this._victoryShown) return;
    this._victoryShown = true;
    this._saveHighScore();

    this._hud.showNotification("VICTORY!", "#ffd700");

    setTimeout(() => {
      this._hud.showNotification(
        `Final Score: ${this._state.player.score.toLocaleString()}`,
        "#ffffff",
      );
    }, 1500);

    setTimeout(() => {
      this._showRestartPrompt();
    }, 3000);
  }

  private _showRestartPrompt(): void {
    this._hud.showNotification("Press any key to retry / ESC to exit", "#aaaaaa");
    const handler = (e: KeyboardEvent) => {
      window.removeEventListener("keydown", handler);
      if (e.code === "Escape") {
        window.dispatchEvent(new Event("threeDragonExit"));
      } else {
        this._restart();
      }
    };
    window.addEventListener("keydown", handler);
  }

  private _restart(): void {
    this._cleanup();
    this._gameOverShown = false;
    this._victoryShown = false;
    this._wasBetweenWaves = true;
    this._bootGame(this._selectedMapId);
  }

  // ---------------------------------------------------------------------------
  // Map Selection Menu
  // ---------------------------------------------------------------------------

  private _showMapMenu(): Promise<string> {
    return new Promise((resolve) => {
      // Inject animations
      this._menuStyle = document.createElement("style");
      this._menuStyle.textContent = `
        @keyframes tdm-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes tdm-slide-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes tdm-card-glow {
          0%, 100% { box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 0 rgba(255,255,255,0); }
          50% { box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(255,255,255,0.08); }
        }
        @keyframes tdm-title-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes tdm-stars {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        .tdm-card {
          cursor: pointer;
          transition: transform 0.25s ease-out, box-shadow 0.25s ease-out, border-color 0.25s;
        }
        .tdm-card:hover {
          transform: translateY(-6px) scale(1.03);
          border-color: rgba(255,215,0,0.6) !important;
          box-shadow: 0 8px 30px rgba(0,0,0,0.6), 0 0 20px rgba(255,215,0,0.15) !important;
        }
        .tdm-card:active {
          transform: translateY(-2px) scale(0.98);
        }
      `;
      document.head.appendChild(this._menuStyle);

      this._menuRoot = document.createElement("div");
      this._menuRoot.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: radial-gradient(ellipse at 30% 20%, #0e1428 0%, #060a14 60%, #020408 100%);
        z-index: 1000; display: flex; flex-direction: column; align-items: center;
        justify-content: center; font-family: 'Cinzel', Georgia, serif;
        animation: tdm-fade-in 0.5s ease-out; overflow: auto;
      `;

      // Decorative star dots
      for (let i = 0; i < 60; i++) {
        const star = document.createElement("div");
        const size = 1 + Math.random() * 2;
        star.style.cssText = `
          position: absolute; width: ${size}px; height: ${size}px;
          background: white; border-radius: 50%;
          left: ${Math.random() * 100}%; top: ${Math.random() * 100}%;
          opacity: ${0.1 + Math.random() * 0.4};
          animation: tdm-stars ${2 + Math.random() * 4}s ease-in-out infinite;
          animation-delay: ${Math.random() * 3}s;
          pointer-events: none;
        `;
        this._menuRoot.appendChild(star);
      }

      // Title
      const title = document.createElement("div");
      title.style.cssText = `
        font-size: 42px; font-weight: bold; letter-spacing: 6px;
        text-transform: uppercase; margin-bottom: 8px;
        background: linear-gradient(90deg, #aa8844, #ffd700, #ffeeaa, #ffd700, #aa8844);
        background-size: 200% auto;
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: tdm-title-shimmer 4s linear infinite;
        text-shadow: none;
        filter: drop-shadow(0 2px 8px rgba(255,215,0,0.3));
      `;
      title.textContent = "3Dragon";
      this._menuRoot.appendChild(title);

      // Subtitle
      const subtitle = document.createElement("div");
      subtitle.style.cssText = `
        font-size: 14px; color: #8899bb; letter-spacing: 3px;
        text-transform: uppercase; margin-bottom: 36px;
        animation: tdm-slide-up 0.6s ease-out;
      `;
      subtitle.textContent = "Choose Your Battlefield";
      this._menuRoot.appendChild(subtitle);

      // Cards container
      const cardsWrap = document.createElement("div");
      cardsWrap.style.cssText = `
        display: flex; flex-wrap: wrap; gap: 16px;
        justify-content: center; max-width: 900px; padding: 0 20px;
      `;

      // Map-specific accent colors for the card borders/glows
      const accents: Record<string, string> = {
        enchanted_valley: "rgba(255,200,68,0.3)",
        frozen_wastes: "rgba(100,180,255,0.3)",
        volcanic_ashlands: "rgba(255,68,0,0.3)",
        crystal_caverns: "rgba(170,68,255,0.3)",
        celestial_peaks: "rgba(200,200,255,0.3)",
        sunken_archipelago: "rgba(50,200,170,0.3)",
        stormspire_crags: "rgba(100,120,160,0.3)",
        autumn_serpentine: "rgba(255,170,68,0.3)",
      };
      const accentSolid: Record<string, string> = {
        enchanted_valley: "#ffd700",
        frozen_wastes: "#66bbff",
        volcanic_ashlands: "#ff4400",
        crystal_caverns: "#aa44ff",
        celestial_peaks: "#ccccff",
        sunken_archipelago: "#33ccaa",
        stormspire_crags: "#8899bb",
        autumn_serpentine: "#ffaa44",
      };

      // Gradient preview backgrounds per map
      const gradients: Record<string, string> = {
        enchanted_valley: "linear-gradient(135deg, #1e4a1e 0%, #2a5530 30%, #dd6633 70%, #0b0e2a 100%)",
        frozen_wastes: "linear-gradient(135deg, #667788 0%, #8899bb 30%, #1a3355 70%, #0a1528 100%)",
        volcanic_ashlands: "linear-gradient(135deg, #1a1a1a 0%, #441100 30%, #cc4411 70%, #0a0505 100%)",
        crystal_caverns: "linear-gradient(135deg, #1a1033 0%, #442266 30%, #6633aa 70%, #0a0520 100%)",
        celestial_peaks: "linear-gradient(135deg, #334433 0%, #334488 30%, #081530 70%, #020510 100%)",
        sunken_archipelago: "linear-gradient(135deg, #44886a 0%, #33ccaa 30%, #0a3355 70%, #041833 100%)",
        stormspire_crags: "linear-gradient(135deg, #222830 0%, #334455 30%, #101828 70%, #050810 100%)",
        autumn_serpentine: "linear-gradient(135deg, #3a4422 0%, #cc7744 30%, #1e1830 70%, #0a0814 100%)",
      };

      for (let i = 0; i < TD_MAPS.length; i++) {
        const map = TD_MAPS[i];
        const accent = accents[map.id] || "rgba(255,255,255,0.2)";
        const solid = accentSolid[map.id] || "#ffffff";
        const grad = gradients[map.id] || "linear-gradient(135deg, #111 0%, #333 100%)";

        const card = document.createElement("div");
        card.className = "tdm-card";
        card.style.cssText = `
          width: 160px; padding: 0; border-radius: 10px;
          border: 1px solid ${accent};
          background: linear-gradient(180deg, rgba(15,15,35,0.95) 0%, rgba(8,8,20,0.98) 100%);
          overflow: hidden;
          animation: tdm-slide-up ${0.4 + i * 0.1}s ease-out, tdm-card-glow 4s ease-in-out infinite;
          animation-delay: ${i * 0.08}s;
        `;

        // Preview gradient strip
        const preview = document.createElement("div");
        preview.style.cssText = `
          width: 100%; height: 70px;
          background: ${grad};
          border-bottom: 1px solid ${accent};
          position: relative; overflow: hidden;
        `;
        // Subtle overlay pattern
        const overlay = document.createElement("div");
        overlay.style.cssText = `
          position: absolute; inset: 0;
          background: radial-gradient(circle at 70% 30%, rgba(255,255,255,0.08), transparent 60%);
        `;
        preview.appendChild(overlay);
        card.appendChild(preview);

        // Text content area
        const content = document.createElement("div");
        content.style.cssText = `padding: 12px;`;

        const nameEl = document.createElement("div");
        nameEl.style.cssText = `
          font-size: 13px; font-weight: bold; color: ${solid};
          letter-spacing: 1px; margin-bottom: 6px;
          text-shadow: 0 0 8px ${accent};
        `;
        nameEl.textContent = map.name;
        content.appendChild(nameEl);

        const desc = document.createElement("div");
        desc.style.cssText = `
          font-size: 9px; color: #8899aa; line-height: 1.4;
          letter-spacing: 0.5px;
        `;
        desc.textContent = map.preview;
        content.appendChild(desc);

        card.appendChild(content);

        card.addEventListener("click", () => {
          this._destroyMenu();
          resolve(map.id);
        });

        cardsWrap.appendChild(card);
      }

      this._menuRoot.appendChild(cardsWrap);

      // Controls hint
      const hint = document.createElement("div");
      hint.style.cssText = `
        margin-top: 28px; font-size: 11px; color: #556677;
        letter-spacing: 2px; text-transform: uppercase;
        animation: tdm-slide-up 1s ease-out;
      `;
      hint.textContent = "Click a map to begin";
      this._menuRoot.appendChild(hint);

      // ESC to exit
      const escHint = document.createElement("div");
      escHint.style.cssText = `
        margin-top: 10px; font-size: 10px; color: #334455;
        letter-spacing: 1px;
      `;
      escHint.textContent = "ESC to return";
      this._menuRoot.appendChild(escHint);

      const escHandler = (e: KeyboardEvent) => {
        if (e.code === "Escape") {
          window.removeEventListener("keydown", escHandler);
          this._destroyMenu();
          window.dispatchEvent(new Event("threeDragonExit"));
        }
      };
      window.addEventListener("keydown", escHandler);

      // Also support keyboard navigation: 1-5 selects map
      const numHandler = (e: KeyboardEvent) => {
        const num = parseInt(e.key);
        if (num >= 1 && num <= TD_MAPS.length) {
          window.removeEventListener("keydown", numHandler);
          window.removeEventListener("keydown", escHandler);
          this._destroyMenu();
          resolve(TD_MAPS[num - 1].id);
        }
      };
      window.addEventListener("keydown", numHandler);

      document.body.appendChild(this._menuRoot);
    });
  }

  private _destroyMenu(): void {
    if (this._menuRoot?.parentNode) {
      this._menuRoot.parentNode.removeChild(this._menuRoot);
      this._menuRoot = null;
    }
    if (this._menuStyle?.parentNode) {
      this._menuStyle.parentNode.removeChild(this._menuStyle);
      this._menuStyle = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  private _onResize(): void {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    this._renderer.resize(sw, sh);
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private _cleanup(): void {
    this._destroyMenu();
    ThreeDragonInputSystem.destroy();
    ThreeDragonCombatSystem.setExplosionCallback(null);
    ThreeDragonCombatSystem.setHitCallback(null);
    ThreeDragonCombatSystem.setPlayerHitCallback(null);
    ThreeDragonCombatSystem.setLightningCallback(null);
    ThreeDragonCombatSystem.setEnemyDeathCallback(null);
    ThreeDragonCombatSystem.setBossKillCallback(null);
    ThreeDragonCombatSystem.setPowerUpCollectCallback(null);
    ThreeDragonCombatSystem.setDamageNumberCallback(null);
    ThreeDragonCombatSystem.setSkillUnlockCallback(null);
    ThreeDragonCombatSystem.setLevelUpCallback(null);
    ThreeDragonWaveSystem.reset();

    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    window.removeEventListener("resize", this._onResize);

    this._renderer.cleanup();
    this._hud.cleanup();
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    this._cleanup();
  }
}
