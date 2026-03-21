// ---------------------------------------------------------------------------
// Morgan -- Main Game Orchestrator
// 3D stealth-sorcery: play as Morgan le Fay infiltrating enchanted castles.
// Sneak past guards, cast dark spells, collect artifacts, escape.
// ---------------------------------------------------------------------------

import type { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";

import { LEVEL_DEFS, NUM_LEVELS, Difficulty, DIFFICULTY_MULTS, LEVEL_INTROS } from "./MorganConfig";
import {
  type MorganGameState, createInitialState, pushMessage,
} from "./MorganState";
import { generateLevel } from "./MorganLevelGen";
import {
  tickPlayer, tickGuards, tickProjectiles, tickAlertLevel, tickMessages,
  tickScreenFlash, tickBoss,
  onKeyDown, onKeyUp, resetInput,
} from "./MorganSystems";
import { MorganRenderer } from "./MorganRenderer";
import { MorganHUD } from "./MorganHUD";
import { MorganAudio } from "./MorganAudio";

export class MorganGame {
  private _state!: MorganGameState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _renderer = new MorganRenderer();
  private _hud = new MorganHUD();
  private _audio = new MorganAudio();
  private _destroyed = false;
  private _prevArtifacts = 0;
  private _prevGuardCount = 0;
  private _prevHP = 100;
  private _prevExitOpen = false;
  private _paused = false;
  private _inMainMenu = true;
  private _menuDiv: HTMLDivElement | null = null;
  private _tabHandler: ((e: KeyboardEvent) => void) | null = null;
  private _wheelHandler: ((e: WheelEvent) => void) | null = null;
  private _selectedDifficulty: Difficulty = Difficulty.NORMAL;

  async boot(): Promise<void> {
    this._state = createInitialState();
    this._showMainMenu();
  }

  // --- Main menu ---
  private _showMainMenu(): void {
    this._inMainMenu = true;
    const div = document.createElement("div");
    div.id = "morgan-main-menu";
    div.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      background:linear-gradient(180deg,#050510 0%,#0a0520 40%,#150a30 100%);
      z-index:15;display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Cinzel',serif;color:#ddd;
    `;
    div.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
        .morgan-menu-btn {
          padding:14px 50px;margin:8px;font-size:17px;
          border:1px solid #6633cc;border-radius:8px;
          background:rgba(40,20,80,0.4);color:#ccc;cursor:pointer;
          font-family:'Cinzel',serif;transition:all 0.3s;pointer-events:auto;
          min-width:240px;text-align:center;
        }
        .morgan-menu-btn:hover {
          background:rgba(80,40,160,0.5);color:#fff;
          box-shadow:0 0 20px rgba(136,68,255,0.3);
          border-color:#8844ff;
        }
        @keyframes morganPulse {
          0%, 100% { text-shadow: 0 0 30px rgba(136,68,255,0.5), 0 0 60px rgba(136,68,255,0.2); }
          50% { text-shadow: 0 0 40px rgba(136,68,255,0.7), 0 0 80px rgba(136,68,255,0.3); }
        }
      </style>
      <div style="margin-bottom:40px;text-align:center;">
        <h1 style="font-size:56px;font-weight:900;color:#8844ff;margin:0;
          animation:morganPulse 3s ease-in-out infinite;
          letter-spacing:8px;">MORGAN</h1>
        <div style="font-size:16px;color:#9966cc;margin-top:8px;letter-spacing:4px;">
          LE FAY'S SHADOW
        </div>
        <div style="font-size:12px;color:#665588;margin-top:20px;max-width:420px;line-height:1.7;">
          Infiltrate Mordred's enchanted castle. Sneak past guards, wield dark sorcery,
          collect ancient artifacts, and reclaim what was stolen from Avalon.<br><br>
          <span style="color:#887799;">7 levels \u2022 5 spells \u2022 4 guard types \u2022 upgradeable abilities</span>
        </div>
      </div>
      <div style="margin-bottom:15px;">
        <div style="font-size:12px;color:#665588;margin-bottom:8px;">DIFFICULTY</div>
        <div style="display:flex;gap:8px;justify-content:center;">
          <button class="morgan-menu-btn morgan-diff-btn" data-diff="easy" style="min-width:120px;padding:10px 20px;font-size:14px;
            border-color:#44aa44;">${DIFFICULTY_MULTS[Difficulty.EASY].label}</button>
          <button class="morgan-menu-btn morgan-diff-btn" data-diff="normal" style="min-width:120px;padding:10px 20px;font-size:14px;
            border-color:#8844ff;background:rgba(80,40,160,0.4);">${DIFFICULTY_MULTS[Difficulty.NORMAL].label}</button>
          <button class="morgan-menu-btn morgan-diff-btn" data-diff="hard" style="min-width:120px;padding:10px 20px;font-size:14px;
            border-color:#ff4444;">${DIFFICULTY_MULTS[Difficulty.HARD].label}</button>
        </div>
      </div>
      <button class="morgan-menu-btn" id="morgan-start">Begin Infiltration</button>
      <button class="morgan-menu-btn" id="morgan-how-to-play" style="border-color:#6688aa;color:#aac;
        background:rgba(30,40,60,0.3);">Controls & Instructions</button>
      <button class="morgan-menu-btn" id="morgan-back" style="border-color:#444;color:#888;
        background:rgba(30,20,30,0.3);">Back to Menu</button>

      <div style="margin-top:35px;font-size:11px;color:#443366;text-align:center;line-height:1.9;">
        <div>WASD \u2014 Move &nbsp;\u2022&nbsp; Shift \u2014 Sneak &nbsp;\u2022&nbsp; Ctrl \u2014 Sprint</div>
        <div>1-5 \u2014 Select Spell &nbsp;\u2022&nbsp; Space \u2014 Cast</div>
        <div>F \u2014 Backstab &nbsp;\u2022&nbsp; R \u2014 Interact &nbsp;\u2022&nbsp; Tab \u2014 Objectives</div>
        <div>G \u2014 Extinguish Torch &nbsp;\u2022&nbsp; T \u2014 Throw Distraction</div>
      </div>
    `;

    this._menuDiv = div;
    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(div);

    // Difficulty buttons
    div.querySelectorAll(".morgan-diff-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this._selectedDifficulty = (btn as HTMLElement).dataset.diff as Difficulty;
        div.querySelectorAll(".morgan-diff-btn").forEach(b => {
          (b as HTMLElement).style.background = "rgba(40,20,80,0.4)";
          (b as HTMLElement).style.boxShadow = "none";
        });
        (btn as HTMLElement).style.background = "rgba(80,40,160,0.5)";
        (btn as HTMLElement).style.boxShadow = "0 0 15px rgba(136,68,255,0.4)";
      });
    });

    document.getElementById("morgan-start")?.addEventListener("click", () => {
      this._removeMainMenu();
      this._startGame();
    });
    document.getElementById("morgan-how-to-play")?.addEventListener("click", () => {
      this._removeMainMenu();
      // Create a temporary HUD just for the controls screen
      const tempHud = new MorganHUD();
      tempHud.showControlsScreen(() => {
        this._showMainMenu();
      });
    });
    document.getElementById("morgan-back")?.addEventListener("click", () => {
      this._removeMainMenu();
      this._exit();
    });
  }

  private _removeMainMenu(): void {
    if (this._menuDiv) {
      this._menuDiv.remove();
      this._menuDiv = null;
    }
    this._inMainMenu = false;
  }

  // --- Game start ---
  private _startGame(): void {
    this._state = createInitialState();
    this._state.difficulty = this._selectedDifficulty;
    this._state.phase = "playing";
    this._state.level = 1;
    this._state.levelDef = LEVEL_DEFS[0];

    this._renderer.init();
    this._hud.init();
    this._audio.init();
    this._loadLevel();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("keydown", this._onEscKey);

    // Tab for objectives, P for first-person toggle
    this._tabHandler = (e: KeyboardEvent) => {
      if (e.code === "Tab") {
        e.preventDefault();
        if (!this._paused) this._hud.toggleObjectives(this._state);
      }
      if (e.code === "KeyP" && !this._paused && this._state.phase === "playing") {
        const fp = this._renderer.toggleFirstPerson();
        this._hud.setFirstPerson(fp);
        pushMessage(this._state, fp ? "First-person view" : "Third-person view", "#66aaff");
      }
    };
    window.addEventListener("keydown", this._tabHandler);

    // Mouse wheel for spell scrolling
    this._wheelHandler = (e: WheelEvent) => {
      if (this._paused) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const spells = this._state.player.spells;
      this._state.player.selectedSpell = (this._state.player.selectedSpell + dir + spells.length) % spells.length;
    };
    window.addEventListener("wheel", this._wheelHandler);

    // Game loop
    this._tickerCb = (ticker: Ticker) => {
      if (this._destroyed || this._paused || this._inMainMenu) return;
      const dt = Math.min(ticker.deltaMS / 1000, 0.05);
      this._tick(dt);
    };
    viewManager.app.ticker.add(this._tickerCb);

    this._showLevelIntro();
  }

  private _showLevelIntro(): void {
    this._paused = true;
    const level = this._state.level;
    const intro = LEVEL_INTROS[level - 1] || "";
    const div = document.createElement("div");
    div.id = "morgan-level-intro";
    div.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      background:rgba(5,5,15,0.92);z-index:20;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Cinzel',serif;color:#ddd;pointer-events:auto;cursor:pointer;
    `;
    div.innerHTML = `
      <div style="font-size:13px;color:#665588;letter-spacing:3px;margin-bottom:12px;">LEVEL ${level}</div>
      <h2 style="font-size:26px;color:#8844ff;margin:0 0 20px 0;
        text-shadow:0 0 15px rgba(136,68,255,0.5);">${this._state.levelDef.name}</h2>
      <div style="font-size:14px;color:#aaa;max-width:450px;text-align:center;line-height:1.8;margin-bottom:30px;">
        ${intro}
      </div>
      <div style="font-size:14px;color:#887799;">
        ${DIFFICULTY_MULTS[this._state.difficulty].label} difficulty
      </div>
      <div style="font-size:12px;color:#555;margin-top:25px;">Click to begin</div>
    `;
    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(div);
    div.addEventListener("click", () => {
      div.remove();
      this._paused = false;
      pushMessage(this._state, `Level ${level}: ${this._state.levelDef.name}`, "#8844ff");
      pushMessage(this._state, "Find all artifacts and reach the exit");
    });
  }

  private _loadLevel(): void {
    const def = this._state.levelDef;
    const generated = generateLevel(def);

    this._state.tiles = generated.tiles;
    this._state.guards = generated.guards;
    this._state.artifacts = generated.artifacts;
    this._state.pickups = generated.pickups;
    this._state.traps = generated.traps;
    this._state.torchPositions = generated.torchPositions;
    this._state.exitPos = generated.exitPos;
    this._state.exitOpen = false;
    this._state.darkBolts = [];
    this._state.fireballs = [];
    this._state.mistZones = [];
    this._state.decoys = [];
    this._state.soundEvents = [];
    this._state.corpses = [];
    this._state.lootDrops = [];
    this._state.extinguishedTorches = new Set();
    this._state.messages = [];
    this._state.detected = false;
    this._state.alertLevel = 0;
    this._state.time = 0;
    this._state.screenFlash = null;
    this._state.levelStats = {
      timesDetected: 0, guardsKilled: 0, ghostKills: 0,
      trapsTriggered: 0, startTime: 0, endTime: 0,
    };

    // Reset player position but keep score/spells/upgrades/xp
    const p = this._state.player;
    p.pos = generated.playerStart;
    p.angle = 0;
    p.hp = p.maxHp;
    p.stamina = 100;
    p.mana = 100;
    p.dead = false;
    p.cloaked = false;
    p.cloakTimer = 0;
    p.artifacts = 0;
    p.sneaking = false;
    p.sprinting = false;
    p.backstabCooldown = 0;
    p.noiseLevel = 0;
    p.moving = false;

    this._renderer.buildLevel(this._state);
    resetInput();
    this._prevArtifacts = 0;
    this._prevGuardCount = this._state.guards.length;
    this._prevHP = p.hp;
    this._prevExitOpen = false;
  }

  // --- Game loop ---
  private _tick(dt: number): void {
    if (this._state.phase !== "playing") return;

    this._state.time += dt;
    tickPlayer(this._state, dt);
    tickGuards(this._state, dt);
    tickBoss(this._state, dt);
    tickProjectiles(this._state, dt);
    tickAlertLevel(this._state, dt);
    tickScreenFlash(this._state, dt);
    tickMessages(this._state, dt);

    this._renderer.update(this._state, dt);
    this._hud.update(this._state);

    // Audio events
    const p = this._state.player;
    this._audio.tickFootsteps(dt, p.moving, p.sneaking, p.sprinting);
    this._audio.updateHeartbeat(p.hp / p.maxHp);
    // Artifact collected
    if (p.artifacts > this._prevArtifacts) {
      this._audio.playArtifactCollect();
      this._prevArtifacts = p.artifacts;
    }
    // Guard killed
    const aliveGuards = this._state.guards.filter(g => g.hp > 0).length;
    if (aliveGuards < this._prevGuardCount) {
      this._audio.playGuardDeath();
      this._prevGuardCount = aliveGuards;
    }
    // Damage taken
    if (p.hp < this._prevHP) {
      this._audio.playDamage();
    }
    this._prevHP = p.hp;
    // Exit opened
    if (this._state.exitOpen && !this._prevExitOpen) {
      this._audio.playExitOpen();
    }
    this._prevExitOpen = this._state.exitOpen;

    // Check phase changes (phase may have been mutated by tick functions)
    const phase = this._state.phase as string;
    if (phase === "level_complete") {
      this._onLevelComplete();
    } else if (phase === "game_over") {
      this._onGameOver();
    }
  }

  private _onLevelComplete(): void {
    this._paused = true;
    this._audio.playLevelComplete();
    if (this._state.level >= NUM_LEVELS) {
      this._state.phase = "victory";
      this._hud.showVictory(this._state, () => {
        this._exit();
      });
    } else {
      this._hud.showLevelComplete(this._state,
        // Next level
        () => {
          this._advanceLevel();
        },
        // Upgrade screen
        () => {
          this._hud.showUpgradeScreen(this._state, () => {
            this._advanceLevel();
          });
        },
      );
    }
  }

  private _advanceLevel(): void {
    this._state.level++;
    this._state.levelDef = LEVEL_DEFS[this._state.level - 1];
    this._state.phase = "playing";
    this._loadLevel();
    this._showLevelIntro();
  }

  private _onGameOver(): void {
    this._paused = true;
    this._hud.showGameOver(
      this._state,
      () => {
        this._state.phase = "playing";
        this._paused = false;
        this._loadLevel();
      },
      () => {
        this._exit();
      },
    );
  }

  private _onEscKey = (e: KeyboardEvent): void => {
    if (e.code !== "Escape") return;
    if (this._state.phase !== "playing" && !this._paused) return;
    if (this._paused) return;

    this._paused = true;
    this._hud.showPauseMenu(
      () => { this._paused = false; },
      () => { this._exit(); },
    );
  };

  private _exit(): void {
    this.destroy();
    window.dispatchEvent(new Event("morganExit"));
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }

    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("keydown", this._onEscKey);
    if (this._tabHandler) {
      window.removeEventListener("keydown", this._tabHandler);
      this._tabHandler = null;
    }
    if (this._wheelHandler) {
      window.removeEventListener("wheel", this._wheelHandler);
      this._wheelHandler = null;
    }

    this._removeMainMenu();
    this._renderer.destroy();
    this._hud.destroy();
    this._audio.destroy();
    resetInput();
  }
}
