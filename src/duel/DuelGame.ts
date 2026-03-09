// ---------------------------------------------------------------------------
// Duel mode – main game orchestrator
// ---------------------------------------------------------------------------

import type { Ticker } from "pixi.js";
import { DuelPhase, DuelFighterState } from "../types";
import { viewManager } from "../view/ViewManager";
import { DuelStateMachine } from "./DuelStateMachine";
import { DuelBalance } from "./config/DuelBalanceConfig";
import { DUEL_CHARACTERS, DUEL_CHARACTER_IDS } from "./config/DuelCharacterDefs";
import { DuelInputSystem } from "./systems/DuelInputSystem";
import { DuelFightingSystem } from "./systems/DuelFightingSystem";
import { DuelProjectileSystem } from "./systems/DuelProjectileSystem";
import { DuelAISystem } from "./systems/DuelAISystem";
import { duelAudio } from "./systems/DuelAudioSystem";
import { createDuelState } from "./state/DuelState";
import type { DuelInputResult, DuelState, DuelGameMode } from "./state/DuelState";

import { DuelMenuView } from "../view/duel/DuelMenuView";
import type { DuelMenuChoice } from "../view/duel/DuelMenuView";
import { DuelCharSelectView } from "../view/duel/DuelCharSelectView";
import { DuelFightView } from "../view/duel/DuelFightView";
import { DuelHUD } from "../view/duel/DuelHUD";
import { DuelArenaRenderer } from "../view/duel/DuelArenaRenderer";
import { DuelIntroView } from "../view/duel/DuelIntroView";
import { DuelControlsView } from "../view/duel/DuelControlsView";
import { DuelPauseMenu } from "../view/duel/DuelPauseMenu";
import type { PauseMenuChoice } from "../view/duel/DuelPauseMenu";

export class DuelGame {
  private _state: DuelState | null = null;
  private _stateMachine!: DuelStateMachine;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _simAccumulator = 0;

  // View delegates
  private _menuView = new DuelMenuView();
  private _charSelect = new DuelCharSelectView();
  private _fightView = new DuelFightView();
  private _hud = new DuelHUD();
  private _arenaRenderer = new DuelArenaRenderer();
  private _introView = new DuelIntroView();
  private _controlsView = new DuelControlsView();
  private _pauseMenu = new DuelPauseMenu();

  // Track previous fighter HP for spark/audio effects
  private _prevHp: [number, number] = [0, 0];
  private _prevBlockstun: [number, number] = [0, 0];

  // Game mode (set before char select)
  private _gameMode: DuelGameMode = "vs_cpu";

  // Training mode key handler
  private _trainingKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  // Pause key handler
  private _pauseKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  // Store match params for restart
  private _matchP1Id = "";
  private _matchP2Id = "";
  private _matchArenaId = "";

  // Wave mode
  private _waveEnemies: string[] = [];

  async boot(): Promise<void> {
    viewManager.clearWorld();

    // Init procedural audio
    duelAudio.init();

    this._stateMachine = new DuelStateMachine(DuelPhase.CHAR_SELECT);
    this._showMainMenu();
  }

  // ---- Main menu -----------------------------------------------------------

  private _showMainMenu(): void {
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    this._menuView.setSelectCallback((choice: DuelMenuChoice) => {
      viewManager.removeFromLayer("ui", this._menuView.container);
      this._menuView.hide();
      this._handleMenuChoice(choice);
    });

    this._menuView.show(sw, sh);
    viewManager.addToLayer("ui", this._menuView.container);
  }

  private _handleMenuChoice(choice: DuelMenuChoice): void {
    switch (choice) {
      case "ARCADE":
        this._gameMode = "arcade";
        this._showCharacterSelect();
        break;
      case "WAVE":
        this._gameMode = "wave";
        this._showCharacterSelect();
        break;
      case "VS MODE":
        this._gameMode = "vs_mode";
        this._showCharacterSelect();
        break;
      case "VS CPU":
        this._gameMode = "vs_cpu";
        this._showCharacterSelect();
        break;
      case "TRAINING":
        this._gameMode = "training";
        this._showCharacterSelect();
        break;
      case "CONTROLS":
      case "HOW TO PLAY":
        this._showControls();
        break;
      case "SETTINGS":
        // Return to menu for now
        this._showMainMenu();
        break;
    }
  }

  // ---- Controls screen ------------------------------------------------------

  private _showControls(): void {
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    this._controlsView.setEscapeCallback(() => {
      viewManager.removeFromLayer("ui", this._controlsView.container);
      this._showMainMenu();
    });

    this._controlsView.show(sw, sh);
    viewManager.addToLayer("ui", this._controlsView.container);
  }

  // ---- Character select ----------------------------------------------------

  private _showCharacterSelect(): void {
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    this._charSelect.setStartCallback((p1Id, p2Id, arenaId) => {
      viewManager.removeFromLayer("ui", this._charSelect.container);
      this._startMatch(p1Id, p2Id, arenaId);
    });

    this._charSelect.setEscapeCallback(() => {
      viewManager.removeFromLayer("ui", this._charSelect.container);
      this._showMainMenu();
    });

    this._charSelect.show(sw, sh);
    viewManager.addToLayer("ui", this._charSelect.container);
  }

  // ---- Match start ---------------------------------------------------------

  private _startMatch(p1Id: string, p2Id: string, arenaId: string): void {
    this._matchP1Id = p1Id;
    this._matchP2Id = p2Id;
    this._matchArenaId = arenaId;

    const p1Def = DUEL_CHARACTERS[p1Id];
    const p2Def = DUEL_CHARACTERS[p2Id];

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    const isAI = this._gameMode !== "vs_mode";

    // Wave mode: generate wave and override P2 to first enemy with 20% HP
    let actualP2Id = p2Id;
    let p2Hp = p2Def.maxHp;
    if (this._gameMode === "wave") {
      const waveEnemies = this._generateWave(1, p1Id);
      actualP2Id = waveEnemies[0];
      const enemyDef = DUEL_CHARACTERS[actualP2Id];
      p2Hp = Math.round(enemyDef.maxHp * 0.2); // 20% HP for regular enemies
      this._waveEnemies = waveEnemies;
    }

    const actualP2Def = DUEL_CHARACTERS[actualP2Id];

    this._state = createDuelState(
      p1Id, actualP2Id,
      p1Def.maxHp, p2Hp,
      arenaId, isAI,
      sw, sh,
      this._gameMode,
    );

    // Wave mode: set up wave state
    if (this._gameMode === "wave") {
      this._state.waveNumber = 1;
      this._state.waveEnemies = this._waveEnemies;
      this._state.waveEnemyIndex = 0;
      this._state.waveDefeated = 0;
      this._state.bestOf = 1; // single round per enemy
    }

    this._prevHp = [p1Def.maxHp, p2Hp];
    this._prevBlockstun = [0, 0];

    // Build views
    this._arenaRenderer.build(arenaId, sw, sh);
    this._fightView.init(sw, sh);
    this._fightView.arenaLayer.addChild(this._arenaRenderer.container);
    this._hud.build(sw, sh, p1Def.name, actualP2Def.name);

    viewManager.addToLayer("background", this._fightView.container);
    viewManager.addToLayer("ui", this._hud.container);

    // Reset camera — duel uses a static full-screen view, no pan/zoom
    viewManager.camera.x = 0;
    viewManager.camera.y = 0;
    viewManager.camera.zoom = 1;
    viewManager.camera.stopCinematicZoom();
    viewManager.camera.keyboardEnabled = false;

    // Show intro
    this._stateMachine.transition(DuelPhase.ARENA_SELECT);
    this._stateMachine.transition(DuelPhase.INTRO);

    this._introView.show(sw, sh, p1Id, actualP2Id, () => {
      this._beginFighting();
    });
    viewManager.addToLayer("ui", this._introView.container);

    // Start game loop
    this._simAccumulator = 0;
    this._tickerCb = (ticker: Ticker) => {
      this._gameLoop(ticker.deltaMS / 1000);
    };
    viewManager.app.ticker.add(this._tickerCb);
  }

  // ---- Begin fighting ------------------------------------------------------

  private _beginFighting(): void {
    if (!this._state) return;

    this._stateMachine.transition(DuelPhase.FIGHTING);
    this._state.phase = DuelPhase.FIGHTING;

    // Init input
    DuelInputSystem.init(this._state);
    DuelAISystem.reset();

    // Setup pause key (ESC)
    this._setupPauseKey();

    // Training mode setup
    if (this._state.gameMode === "training") {
      this._setupTrainingControls();
      duelAudio.playRoundStart();
      this._announce("TRAINING", 60);
      setTimeout(() => {
        this._announce("FIGHT!", 40);
      }, 1000);
      return;
    }

    // Round announcement
    duelAudio.playRoundStart();
    if (this._state.gameMode === "wave") {
      this._announce(`WAVE ${this._state.waveNumber}`, 60);
    } else {
      this._announce(`ROUND ${this._state.round.roundNumber}`, 60);
    }
    setTimeout(() => {
      this._announce("FIGHT!", 40);
    }, 1000);
  }

  private _setupPauseKey(): void {
    this._pauseKeyHandler = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      if (!this._state) return;
      if (this._state.phase !== DuelPhase.FIGHTING) return;
      e.preventDefault();
      this._showPauseMenu();
    };
    window.addEventListener("keydown", this._pauseKeyHandler);
  }

  private _showPauseMenu(): void {
    if (!this._state) return;
    this._state.isPaused = true;

    // Temporarily remove the pause key listener so it doesn't interfere
    if (this._pauseKeyHandler) {
      window.removeEventListener("keydown", this._pauseKeyHandler);
    }

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    this._pauseMenu.setSelectCallback((choice: PauseMenuChoice) => {
      this._pauseMenu.hide();
      viewManager.removeFromLayer("ui", this._pauseMenu.container);
      this._handlePauseChoice(choice);
    });

    this._pauseMenu.show(sw, sh);
    viewManager.addToLayer("ui", this._pauseMenu.container);
  }

  private _handlePauseChoice(choice: PauseMenuChoice): void {
    switch (choice) {
      case "RESUME":
        if (this._state) this._state.isPaused = false;
        // Re-attach pause key listener
        if (this._pauseKeyHandler) {
          window.addEventListener("keydown", this._pauseKeyHandler);
        }
        break;
      case "RESTART MATCH":
        this._cleanup();
        this._startMatch(this._matchP1Id, this._matchP2Id, this._matchArenaId);
        break;
      case "CHARACTER SELECT":
        this._cleanup();
        this._showCharacterSelect();
        break;
      case "MAIN MENU":
        this._endMatch();
        break;
    }
  }

  private _setupTrainingControls(): void {
    // F1-F4 to switch dummy mode, F5 to reset positions
    this._trainingKeyHandler = (e: KeyboardEvent) => {
      if (!this._state || this._state.gameMode !== "training") return;
      switch (e.code) {
        case "F1":
          this._state.trainingDummyMode = "stand";
          this._announce("DUMMY: STAND", 60);
          break;
        case "F2":
          this._state.trainingDummyMode = "crouch";
          this._announce("DUMMY: CROUCH", 60);
          break;
        case "F3":
          this._state.trainingDummyMode = "jump";
          this._announce("DUMMY: JUMP", 60);
          break;
        case "F4":
          this._state.trainingDummyMode = "cpu";
          this._announce("DUMMY: CPU", 60);
          break;
        case "F5": {
          // Reset positions
          const p1X = Math.round(this._state.screenW * DuelBalance.P1_START_RATIO);
          const p2X = Math.round(this._state.screenW * DuelBalance.P2_START_RATIO);
          const p1 = this._state.fighters[0];
          const p2 = this._state.fighters[1];
          p1.position.x = p1X;
          p1.position.y = this._state.stageFloorY;
          p1.velocity.x = 0;
          p1.velocity.y = 0;
          p1.grounded = true;
          p1.state = DuelFighterState.IDLE;
          p1.hp = p1.maxHp;
          p2.position.x = p2X;
          p2.position.y = this._state.stageFloorY;
          p2.velocity.x = 0;
          p2.velocity.y = 0;
          p2.grounded = true;
          p2.state = DuelFighterState.IDLE;
          p2.hp = p2.maxHp;
          this._state.projectiles = [];
          this._announce("RESET", 40);
          break;
        }
      }
    };
    window.addEventListener("keydown", this._trainingKeyHandler);
  }

  // ---- Game loop -----------------------------------------------------------

  private _gameLoop(rawDt: number): void {
    if (!this._state) return;

    // Update intro if showing
    if (this._state.phase === DuelPhase.INTRO) {
      this._introView.update();
      return;
    }

    // Paused
    if (this._state.isPaused) return;

    // Announcement timer
    if (this._state.announcementTimer > 0) {
      this._state.announcementTimer--;
      if (this._state.announcementTimer <= 0) {
        this._state.announcement = null;
      }
    }

    // Only simulate during fighting phase
    if (this._state.phase === DuelPhase.FIGHTING) {
      // Fixed timestep simulation
      this._simAccumulator += rawDt;
      const frameDt = DuelBalance.FRAME_MS / 1000;

      while (this._simAccumulator >= frameDt) {
        this._simAccumulator -= frameDt;
        this._simulateFrame();
      }
    }

    // Render every display frame
    this._render();
  }

  private _simulateFrame(): void {
    if (!this._state) return;
    const isTraining = this._state.gameMode === "training";

    // Process P1 input
    const p1Input = DuelInputSystem.update(this._state);

    // Process P2 input
    let p2Input: DuelInputResult;
    if (isTraining) {
      p2Input = _trainingDummyInput(this._state);
    } else if (this._state.isAIOpponent) {
      p2Input = DuelAISystem.update(this._state, this._state.aiDifficulty);
    } else {
      p2Input = _emptyInput();
    }

    // Apply AI/dummy input to fighter[1]'s input state
    if (this._state.isAIOpponent || isTraining) {
      _applyInputToFighter(this._state, 1, p2Input);
    }

    // Simulate one fighting frame
    DuelFightingSystem.update(this._state, p1Input, p2Input);
    DuelProjectileSystem.update(this._state);

    this._state.frameCount++;

    // Hit spark effects + audio
    for (let i = 0; i < 2; i++) {
      const f = this._state.fighters[i];
      if (f.hp < this._prevHp[i]) {
        this._fightView.addSpark(f.position.x, f.position.y - 45);

        // Determine hit severity for audio
        const damage = this._prevHp[i] - f.hp;
        if (damage > f.maxHp * 0.15) {
          duelAudio.playHit("heavy");
        } else {
          duelAudio.playHit("light");
        }
      }

      // Block audio
      if (f.blockstunFrames > 0 && this._prevBlockstun[i] === 0) {
        duelAudio.playBlock();
      }

      this._prevHp[i] = f.hp;
      this._prevBlockstun[i] = f.blockstunFrames;
    }

    // Training mode: auto-regen dummy HP after combo drops, and never end round
    if (isTraining) {
      const dummy = this._state.fighters[1];
      const player = this._state.fighters[0];
      // Regen dummy HP when not being combo'd
      if (dummy.state !== DuelFighterState.HIT_STUN &&
          dummy.state !== DuelFighterState.KNOCKDOWN &&
          dummy.state !== DuelFighterState.GET_UP &&
          dummy.state !== DuelFighterState.GRABBED) {
        if (dummy.hp < dummy.maxHp) {
          dummy.hp = Math.min(dummy.maxHp, dummy.hp + 5);
        }
      }
      // Keep player HP full
      player.hp = player.maxHp;
      // Don't let timer run out
      this._state.round.timeRemaining = DuelBalance.ROUND_TIME_FRAMES;
      // Reset dummy if KO'd
      if (dummy.hp <= 0) {
        const p2Def = DUEL_CHARACTERS[dummy.characterId];
        const p2X = Math.round(this._state.screenW * DuelBalance.P2_START_RATIO);
        dummy.hp = p2Def.maxHp;
        dummy.position.x = p2X;
        dummy.position.y = this._state.stageFloorY;
        dummy.state = DuelFighterState.IDLE;
        dummy.velocity.x = 0;
        dummy.velocity.y = 0;
        dummy.grounded = true;
        dummy.hitstunFrames = 0;
        dummy.blockstunFrames = 0;
        dummy.comboCount = 0;
        dummy.comboDamage = 0;
        dummy.comboDamageScaling = 1;
      }
      this._prevHp = [player.hp, dummy.hp];
      return; // skip round end check
    }

    // Check round end
    const winner = DuelFightingSystem.checkRoundEnd(this._state);
    if (winner >= 0) {
      this._endRound(winner as 0 | 1);
    }
  }

  // ---- Render --------------------------------------------------------------

  private _render(): void {
    if (!this._state) return;
    this._arenaRenderer.update(performance.now() / 1000);
    this._fightView.update(this._state);
    this._hud.update(this._state);
  }

  // ---- Round management ----------------------------------------------------

  private _endRound(winner: 0 | 1): void {
    if (!this._state) return;

    this._state.round.winnerId = winner;
    this._state.roundResults.push(winner);
    this._state.phase = DuelPhase.ROUND_END;
    this._stateMachine.transition(DuelPhase.ROUND_END);

    // Set victory/defeat states
    this._state.fighters[winner].state = DuelFighterState.VICTORY;
    this._state.fighters[winner === 0 ? 1 : 0].state = DuelFighterState.DEFEAT;

    // Wave mode: special handling
    if (this._state.gameMode === "wave") {
      this._handleWaveRoundEnd(winner);
      return;
    }

    // Check match end
    const winsNeeded = Math.ceil(this._state.bestOf / 2);
    const p1Wins = this._state.roundResults.filter((w) => w === 0).length;
    const p2Wins = this._state.roundResults.filter((w) => w === 1).length;

    if (p1Wins >= winsNeeded || p2Wins >= winsNeeded) {
      // Match over
      const matchWinner = p1Wins >= winsNeeded ? 0 : 1;
      const winnerName = DUEL_CHARACTERS[this._state.fighters[matchWinner].characterId].name;
      duelAudio.playKO();
      this._announce(`${winnerName.toUpperCase()} WINS!`, 180);

      setTimeout(() => {
        this._endMatch();
      }, 3000);
    } else {
      // Next round
      const ko = this._state.fighters[winner === 0 ? 1 : 0].hp <= 0;
      duelAudio.playKO();
      this._announce(ko ? "K.O.!" : "TIME!", 90);

      setTimeout(() => {
        this._nextRound();
      }, 2000);
    }
  }

  private _nextRound(): void {
    if (!this._state) return;

    DuelFightingSystem.resetRound(this._state);
    this._state.round.roundNumber++;
    this._state.phase = DuelPhase.FIGHTING;
    this._stateMachine.transition(DuelPhase.FIGHTING);
    DuelAISystem.reset();

    this._prevHp = [this._state.fighters[0].hp, this._state.fighters[1].hp];
    this._prevBlockstun = [0, 0];

    duelAudio.playRoundStart();
    this._announce(`ROUND ${this._state.round.roundNumber}`, 60);
    setTimeout(() => {
      this._announce("FIGHT!", 40);
    }, 1000);
  }

  // ---- Wave mode -------------------------------------------------------------

  private _generateWave(waveNumber: number, p1Id: string): string[] {
    const available = DUEL_CHARACTER_IDS.filter((id) => id !== p1Id);
    const enemyCount = Math.min(3 + waveNumber, 8);
    const enemies: string[] = [];

    // Pick random regular enemies
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    for (let i = 0; i < enemyCount && i < shuffled.length; i++) {
      enemies.push(shuffled[i]);
    }

    // Boss: pick a random character not already in the wave and not the player
    const bossPool = available.filter((id) => !enemies.includes(id));
    const bossId = bossPool.length > 0
      ? bossPool[Math.floor(Math.random() * bossPool.length)]
      : shuffled[0]; // fallback
    enemies.push(bossId);

    return enemies;
  }

  private _handleWaveRoundEnd(winner: 0 | 1): void {
    if (!this._state) return;

    if (winner === 1) {
      // Player lost — game over
      duelAudio.playKO();
      const defeated = this._state.waveDefeated;
      const wave = this._state.waveNumber;
      this._announce(`DEFEATED! WAVE ${wave} - ${defeated} KILLS`, 180);
      setTimeout(() => {
        this._endMatch();
      }, 3000);
      return;
    }

    // Player won — advance
    duelAudio.playKO();
    this._state.waveDefeated++;
    this._state.waveEnemyIndex++;

    const isBoss = this._state.waveEnemyIndex >= this._state.waveEnemies.length;

    if (isBoss) {
      // Wave complete!
      this._announce(`WAVE ${this._state.waveNumber} CLEAR!`, 120);
      setTimeout(() => {
        this._startNextWave();
      }, 2000);
    } else {
      // Next enemy in this wave
      this._announce("K.O.!", 50);
      setTimeout(() => {
        this._spawnNextWaveEnemy();
      }, 1000);
    }
  }

  private _startNextWave(): void {
    if (!this._state) return;

    this._state.waveNumber++;
    const p1Id = this._state.fighters[0].characterId;
    this._state.waveEnemies = this._generateWave(this._state.waveNumber, p1Id);
    this._state.waveEnemyIndex = 0;

    this._spawnNextWaveEnemy();
  }

  private _spawnNextWaveEnemy(): void {
    if (!this._state) return;

    const enemyId = this._state.waveEnemies[this._state.waveEnemyIndex];
    const enemyDef = DUEL_CHARACTERS[enemyId];
    const isBoss = this._state.waveEnemyIndex === this._state.waveEnemies.length - 1;
    const enemyHp = isBoss ? enemyDef.maxHp : Math.round(enemyDef.maxHp * 0.2);

    // Reset P2 fighter
    const p2X = Math.round(this._state.screenW * DuelBalance.P2_START_RATIO);
    const p2 = this._state.fighters[1];
    p2.characterId = enemyId;
    p2.hp = enemyHp;
    p2.maxHp = enemyHp;
    p2.position.x = p2X;
    p2.position.y = this._state.stageFloorY;
    p2.velocity.x = 0;
    p2.velocity.y = 0;
    p2.state = DuelFighterState.IDLE;
    p2.stateTimer = 0;
    p2.currentMove = null;
    p2.moveFrame = 0;
    p2.moveHasHit = false;
    p2.canCancelMove = false;
    p2.comboChain = 0;
    p2.hitstunFrames = 0;
    p2.blockstunFrames = 0;
    p2.comboCount = 0;
    p2.comboDamage = 0;
    p2.comboDamageScaling = 1;
    p2.grounded = true;
    p2.invincibleFrames = 0;
    p2.dashFrames = 0;
    p2.facingRight = false;
    p2.zealGauge = 0;
    p2.inputBuffer = [];

    // Reset P1 state (keep HP and zeal) but reset combat state
    const p1 = this._state.fighters[0];
    p1.state = DuelFighterState.IDLE;
    p1.stateTimer = 0;
    p1.currentMove = null;
    p1.moveFrame = 0;
    p1.moveHasHit = false;
    p1.canCancelMove = false;
    p1.comboChain = 0;
    p1.hitstunFrames = 0;
    p1.blockstunFrames = 0;
    p1.comboCount = 0;
    p1.comboDamage = 0;
    p1.comboDamageScaling = 1;
    p1.velocity.x = 0;
    p1.velocity.y = 0;
    p1.invincibleFrames = 0;
    p1.dashFrames = 0;

    // Clear projectiles and reset round state
    this._state.projectiles = [];
    this._state.slowdownFrames = 0;
    this._state.round.timeRemaining = DuelBalance.ROUND_TIME_FRAMES;
    this._state.round.winnerId = null;
    this._state.roundResults = [];

    // Update HUD P2 name
    this._hud.setP2Name(isBoss ? `${enemyDef.name} [BOSS]` : enemyDef.name);

    // Resume fighting
    this._state.phase = DuelPhase.FIGHTING;
    this._stateMachine.transition(DuelPhase.FIGHTING);
    DuelAISystem.reset();

    this._prevHp = [p1.hp, p2.hp];
    this._prevBlockstun = [0, 0];

    // Announce
    const label = isBoss ? `BOSS: ${enemyDef.name.toUpperCase()}!` : "NEXT!";
    duelAudio.playRoundStart();
    this._announce(label, 50);
    setTimeout(() => {
      this._announce("FIGHT!", 40);
    }, 800);
  }

  private _endMatch(): void {
    this._cleanup();
    this._stateMachine.transition(DuelPhase.CHAR_SELECT);
    this._showMainMenu();
  }

  // ---- Utility -------------------------------------------------------------

  private _announce(text: string, frames: number): void {
    if (!this._state) return;
    this._state.announcement = text;
    this._state.announcementTimer = frames;
  }

  private _cleanup(): void {
    viewManager.camera.keyboardEnabled = true;
    DuelInputSystem.destroy();

    if (this._trainingKeyHandler) {
      window.removeEventListener("keydown", this._trainingKeyHandler);
      this._trainingKeyHandler = null;
    }

    if (this._pauseKeyHandler) {
      window.removeEventListener("keydown", this._pauseKeyHandler);
      this._pauseKeyHandler = null;
    }

    this._pauseMenu.hide();
    viewManager.removeFromLayer("ui", this._pauseMenu.container);

    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }

    viewManager.removeFromLayer("background", this._fightView.container);
    viewManager.removeFromLayer("ui", this._hud.container);
    viewManager.removeFromLayer("ui", this._introView.container);
    viewManager.clearWorld();

    this._state = null;
  }

  destroy(): void {
    this._cleanup();
    viewManager.removeFromLayer("ui", this._menuView.container);
    viewManager.removeFromLayer("ui", this._charSelect.container);
    viewManager.removeFromLayer("ui", this._controlsView.container);
    viewManager.removeFromLayer("ui", this._pauseMenu.container);
    this._menuView.destroy();
    this._charSelect.destroy();
    this._fightView.destroy();
    this._hud.destroy();
    this._arenaRenderer.destroy();
    this._introView.destroy();
    this._controlsView.destroy();
    this._pauseMenu.destroy();
  }
}

// ---- Helpers ---------------------------------------------------------------

function _emptyInput(): DuelInputResult {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    forward: false,
    back: false,
    dashForward: false,
    dashBack: false,
    action: null,
  };
}

function _trainingDummyInput(state: DuelState): DuelInputResult {
  const mode = state.trainingDummyMode;

  // CPU mode: use normal AI
  if (mode === "cpu") {
    return DuelAISystem.update(state, state.aiDifficulty);
  }

  const result = _emptyInput();
  const dummy = state.fighters[1];

  // Only apply dummy behavior when idle (not in hitstun/knockdown etc)
  if (
    dummy.state === DuelFighterState.IDLE ||
    dummy.state === DuelFighterState.CROUCH_IDLE ||
    dummy.state === DuelFighterState.WALK_BACK ||
    dummy.state === DuelFighterState.WALK_FORWARD
  ) {
    switch (mode) {
      case "crouch":
        result.down = true;
        break;
      case "jump":
        if (dummy.grounded) {
          result.up = true;
        }
        break;
      case "stand":
      default:
        // Just stand there
        break;
    }
  }

  return result;
}

function _applyInputToFighter(state: DuelState, idx: number, input: DuelInputResult): void {
  const fighter = state.fighters[idx];
  fighter.input.left = input.left;
  fighter.input.right = input.right;
  fighter.input.up = input.up;
  fighter.input.down = input.down;

  // Map forward/back to actual directions based on facing
  if (input.action) {
    // Add to input buffer for special detection
    fighter.inputBuffer.push({
      code: input.action,
      frame: state.frameCount,
      pressed: true,
    });
  }
}
