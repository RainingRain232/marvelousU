// ---------------------------------------------------------------------------
// Grail Ball -- Main Game Orchestrator
// 3D medieval fantasy team ball sport. Manages match lifecycle, physics,
// input, AI, rendering, and HUD.
// ---------------------------------------------------------------------------

import type { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";

import {
  GBMatchPhase, GBPlayerClass, GBPowerUpType,
  GBPosition, randomGBWeather,
  GB_FIELD, GB_PHYSICS, GB_MATCH, GB_CAMERA, GB_ABILITIES,
  GB_TEAMS, GB_POWERUP_POSITIONS, GB_STAMINA,
  GB_POSITION_ABILITIES, GB_INPUT_P2,
} from "./GrailBallConfig";

import {
  type GBMatchState, type GBPlayer, type GBPowerUp, type Vec3,
  GBPlayerAction,
  createMatchState, getPlayer, getOrbCarrier, getTeamPlayers, getSelectedPlayer,
  getSelectedPlayer2,
  resetPositionsForKickoff, pushEvent, createPenaltyState,
  v3, v3Dist, v3Sub, v3Normalize, v3Len, v3Dist3D,
  getFatigueSpeedMultiplier, getFatigueAccuracyMultiplier, getFatigueTackleMultiplier,
  getWeatherSpeedMultiplier, tickPositionAbility, canUsePositionAbility,
} from "./GrailBallState";

import { GrailBallRenderer } from "./GrailBallRenderer";
import { GrailBallHUD } from "./GrailBallHUD";
import { assignAIRoles, decideAI, adaptFormation } from "./GrailBallAI";
import {
  tickOrbPhysics, checkBallPlayerCollisions, launchOrbWithSpin,
  attemptHeader, attemptVolley,
} from "./GrailBallPhysics";
import {
  tickReplayRecording, recordKeyMoment, startReplay,
  tickReplayPlayback, stopReplay, cycleReplayCamera,
} from "./GrailBallReplay";
import {
  initCareer, getNextFixture, recordMatchResult,
  simulateRemainingFixtures, getSortedLeagueTable, endSeason,
} from "./GrailBallCareer";

// ---------------------------------------------------------------------------
// Input state
// ---------------------------------------------------------------------------
const _keys: Record<string, boolean> = {};
const _pressed: Record<string, boolean> = {};

function _onKeyDown(e: KeyboardEvent): void {
  _keys[e.code] = true;
  // Prevent scroll on space/arrows
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
}
function _onKeyUp(e: KeyboardEvent): void { _keys[e.code] = false; }
function _isDown(code: string): boolean { return !!_keys[code]; }
function _justPressed(code: string): boolean {
  if (_keys[code] && !_pressed[code]) { _pressed[code] = true; return true; }
  if (!_keys[code]) _pressed[code] = false;
  return false;
}

// ---------------------------------------------------------------------------
// GrailBallGame
// ---------------------------------------------------------------------------
export class GrailBallGame {
  private _state!: GBMatchState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _renderer = new GrailBallRenderer();
  private _hud = new GrailBallHUD();
  private _paused = false;
  private _showingRules = false;
  private _destroyed = false;

  // Team select state
  private _inTeamSelect = true;
  private _teamSelectDiv: HTMLDivElement | null = null;
  private _selectedTeam1 = 0;
  private _selectedTeam2 = 1;

  // Formation adaptation timer (don't check every frame)
  private _formationAdaptTimer = 0;

  // Career mode UI
  private _careerDiv: HTMLDivElement | null = null;
  private _inCareerMode = false;

  // Local multiplayer toggle
  private _localMultiplayerEnabled = false;

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  async boot(): Promise<void> {
    viewManager.clearWorld();
    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);

    this._showTeamSelect();
  }

  // ---------------------------------------------------------------------------
  // Team Selection Screen (DOM overlay)
  // ---------------------------------------------------------------------------
  private _showTeamSelect(): void {
    this._inTeamSelect = true;

    this._teamSelectDiv = document.createElement("div");
    this._teamSelectDiv.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:linear-gradient(135deg, #1a0a2e 0%, #0d1b2a 50%, #1a0a2e 100%);
      z-index:200; display:flex;flex-direction:column;align-items:center;
      font-family:Georgia,serif;color:#ffd700;overflow-y:auto;
    `;

    let html = `
      <h1 style="font-size:56px;margin:30px 0 10px;text-shadow:3px 3px 6px #000;letter-spacing:4px;">GRAIL BALL</h1>
      <p style="font-size:18px;color:#aaa;margin-bottom:30px;font-style:italic;">A Fantasy Medieval Ball Sport</p>
      <div style="display:flex;gap:60px;align-items:flex-start;">
    `;

    // Team columns
    for (let col = 0; col < 2; col++) {
      html += `<div style="text-align:center;">
        <h2 style="font-size:24px;margin-bottom:16px;">${col === 0 ? "YOUR TEAM" : "OPPONENT"}</h2>
        <div id="gb-team-col-${col}" style="display:flex;flex-direction:column;gap:8px;">`;

      for (let i = 0; i < GB_TEAMS.length; i++) {
        const t = GB_TEAMS[i];
        const selected = col === 0 ? this._selectedTeam1 === i : this._selectedTeam2 === i;
        const priHex = "#" + t.primaryColor.toString(16).padStart(6, "0");
        const secHex = "#" + t.secondaryColor.toString(16).padStart(6, "0");
        html += `
          <div data-col="${col}" data-idx="${i}" class="gb-team-btn"
            style="cursor:pointer;padding:10px 28px;border:2px solid ${selected ? "#ffd700" : "#555"};
            border-radius:8px;background:${selected ? "rgba(218,165,32,0.2)" : "rgba(30,30,50,0.8)"};
            display:flex;align-items:center;gap:12px;transition:all 0.2s;min-width:260px;">
            <div style="width:28px;height:28px;border-radius:4px;background:linear-gradient(135deg,${priHex},${secHex});border:1px solid #888;"></div>
            <span style="font-size:16px;color:${selected ? "#ffd700" : "#ccc"};">${t.name}</span>
          </div>`;
      }
      html += `</div></div>`;
    }

    html += `</div>
      <div style="margin-top:30px;display:flex;gap:20px;flex-wrap:wrap;justify-content:center;">
        <div id="gb-start-btn" style="font-size:28px;cursor:pointer;padding:14px 48px;border:3px solid #daa520;border-radius:12px;color:#ffd700;transition:all 0.2s;background:rgba(218,165,32,0.1);">
          START MATCH
        </div>
        <div id="gb-career-btn" style="font-size:24px;cursor:pointer;padding:14px 36px;border:3px solid #7b2ff7;border-radius:12px;color:#c0a0ff;transition:all 0.2s;background:rgba(123,47,247,0.1);">
          CAREER MODE
        </div>
        <div id="gb-controls-btn" style="font-size:20px;cursor:pointer;padding:14px 32px;border:2px solid #666;border-radius:12px;color:#aaa;transition:all 0.2s;">
          CONTROLS
        </div>
        <div id="gb-rules-btn" style="font-size:20px;cursor:pointer;padding:14px 32px;border:2px solid #666;border-radius:12px;color:#aaa;transition:all 0.2s;">
          RULES
        </div>
        <div id="gb-exit-btn" style="font-size:20px;cursor:pointer;padding:14px 32px;border:2px solid #666;border-radius:12px;color:#aaa;transition:all 0.2s;">
          EXIT
        </div>
      </div>
      <p style="font-size:13px;color:#666;margin:20px 0;">${GB_TEAMS[this._selectedTeam1].motto}</p>
    `;

    this._teamSelectDiv.innerHTML = html;
    document.body.appendChild(this._teamSelectDiv);

    // Event listeners
    const teamBtns = this._teamSelectDiv.querySelectorAll(".gb-team-btn");
    teamBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const col = parseInt(btn.getAttribute("data-col")!);
        const idx = parseInt(btn.getAttribute("data-idx")!);
        if (col === 0) this._selectedTeam1 = idx;
        else this._selectedTeam2 = idx;
        // Ensure different teams
        if (this._selectedTeam1 === this._selectedTeam2) {
          if (col === 0) this._selectedTeam2 = (idx + 1) % GB_TEAMS.length;
          else this._selectedTeam1 = (idx + 1) % GB_TEAMS.length;
        }
        // Re-render
        this._teamSelectDiv!.remove();
        this._teamSelectDiv = null;
        this._showTeamSelect();
      });
      btn.addEventListener("mouseenter", () => {
        (btn as HTMLElement).style.borderColor = "#ffd700";
      });
      btn.addEventListener("mouseleave", () => {
        const col = parseInt(btn.getAttribute("data-col")!);
        const idx = parseInt(btn.getAttribute("data-idx")!);
        const selected = col === 0 ? this._selectedTeam1 === idx : this._selectedTeam2 === idx;
        (btn as HTMLElement).style.borderColor = selected ? "#ffd700" : "#555";
      });
    });

    const startBtn = this._teamSelectDiv.querySelector("#gb-start-btn") as HTMLElement;
    startBtn.addEventListener("click", () => { this._startMatch(); });
    startBtn.addEventListener("mouseenter", () => { startBtn.style.background = "rgba(218,165,32,0.3)"; });
    startBtn.addEventListener("mouseleave", () => { startBtn.style.background = "rgba(218,165,32,0.1)"; });

    const careerBtn = this._teamSelectDiv.querySelector("#gb-career-btn") as HTMLElement;
    if (careerBtn) {
      careerBtn.addEventListener("click", () => {
        const team = GB_TEAMS[this._selectedTeam1];
        this._inCareerMode = true;
        const careerState = initCareer(team.id);
        // Store career state temporarily; will be assigned to match state on match start
        this._hideTeamSelect();
        // Create a temporary state to hold career
        this._state = createMatchState(team, GB_TEAMS[this._selectedTeam2], 0);
        this._state.careerState = careerState;
        this._showCareerMenu();
      });
      careerBtn.addEventListener("mouseenter", () => { careerBtn.style.background = "rgba(123,47,247,0.3)"; });
      careerBtn.addEventListener("mouseleave", () => { careerBtn.style.background = "rgba(123,47,247,0.1)"; });
    }

    const controlsBtn = this._teamSelectDiv.querySelector("#gb-controls-btn") as HTMLElement;
    controlsBtn.addEventListener("click", () => {
      this._hud.showControls(() => {});
    });

    const rulesBtn = this._teamSelectDiv.querySelector("#gb-rules-btn") as HTMLElement;
    rulesBtn.addEventListener("click", () => {
      this._hud.showRules(() => {});
    });

    const exitBtn = this._teamSelectDiv.querySelector("#gb-exit-btn") as HTMLElement;
    exitBtn.addEventListener("click", () => {
      this._hideTeamSelect();
      this.destroy();
      window.dispatchEvent(new Event("grailballExit"));
    });
  }

  private _hideTeamSelect(): void {
    if (this._teamSelectDiv) {
      this._teamSelectDiv.remove();
      this._teamSelectDiv = null;
    }
    this._inTeamSelect = false;
  }

  // ---------------------------------------------------------------------------
  // Start match
  // ---------------------------------------------------------------------------
  private _startMatch(): void {
    this._hideTeamSelect();
    this._hideCareerMenu();

    const team1 = GB_TEAMS[this._selectedTeam1];
    const team2 = GB_TEAMS[this._selectedTeam2];
    const careerState = this._state?.careerState ?? null;
    const weather = randomGBWeather();
    this._state = createMatchState(team1, team2, 0, weather, this._localMultiplayerEnabled);
    if (careerState) {
      this._state.careerState = careerState;
    }

    // Init renderer & HUD
    this._renderer.init();
    this._hud.init();
    viewManager.addToLayer("ui", this._hud.root);

    // Start ticker
    this._tickerCb = (ticker: Ticker) => {
      if (this._destroyed) return;
      this._tick(ticker.deltaMS / 1000);
    };
    viewManager.app.ticker.add(this._tickerCb);

    // Begin match
    this._state.phase = GBMatchPhase.PRE_GAME;
    this._state.phaseTimer = 3;
    pushEvent(this._state, "match_start", `${team1.name} vs ${team2.name}`);
  }

  // ---------------------------------------------------------------------------
  // Main tick
  // ---------------------------------------------------------------------------
  private _tick(rawDt: number): void {
    if (this._paused || this._showingRules || this._inTeamSelect) {
      this._renderer.update(this._state, 0);
      this._hud.update(this._state);
      return;
    }

    const dt = Math.min(rawDt, 0.05); // cap delta

    // Handle replay playback
    if (this._state.replayActive) {
      const still = tickReplayPlayback(this._state, dt);
      if (!still) {
        // Replay ended, resume normal play
      }
      this._renderer.update(this._state, dt);
      this._hud.update(this._state);
      // Allow input to skip/cycle replay
      this._tickReplayInput();
      return;
    }

    // Apply slow-mo
    const effectiveDt = dt * this._state.slowMoFactor;

    // Phase machine
    this._tickPhase(effectiveDt);

    // Simulation (only during gameplay phases)
    if (this._state.phase === GBMatchPhase.PLAYING || this._state.phase === GBMatchPhase.OVERTIME) {
      this._tickSimulation(effectiveDt);
      // Continuous replay recording
      tickReplayRecording(this._state, effectiveDt);
    }

    // Penalty shootout
    if (this._state.phase === GBMatchPhase.PENALTY_SHOOTOUT) {
      this._tickPenaltyShootout(effectiveDt);
    }

    // Input
    this._tickInput(effectiveDt);

    // Update camera shake decay
    this._state.cameraShake *= GB_CAMERA.SHAKE_DECAY;

    // Slow-mo decay
    if (this._state.slowMoTimer > 0) {
      this._state.slowMoTimer -= dt;
      if (this._state.slowMoTimer <= 0) {
        this._state.slowMoFactor = 1;
      }
    }

    // Render
    this._renderer.update(this._state, dt);
    this._hud.update(this._state);
  }

  // ---------------------------------------------------------------------------
  // Phase state machine
  // ---------------------------------------------------------------------------
  private _tickPhase(dt: number): void {
    const s = this._state;
    s.phaseTimer -= dt;

    switch (s.phase) {
      case GBMatchPhase.PRE_GAME:
        if (s.phaseTimer <= 0) {
          s.phase = GBMatchPhase.KICKOFF;
          s.phaseTimer = GB_MATCH.KICKOFF_DELAY;
          resetPositionsForKickoff(s, -1);
        }
        break;

      case GBMatchPhase.KICKOFF:
        if (s.phaseTimer <= 0) {
          s.phase = s.overtime ? GBMatchPhase.OVERTIME : GBMatchPhase.PLAYING;
          s.phaseTimer = 0;
        }
        break;

      case GBMatchPhase.PLAYING:
        s.matchClock += dt;

        // Calculate and announce injury time near end of half
        if (s.matchClock >= GB_MATCH.HALF_DURATION - 10 && !s.injuryTimeAnnounced) {
          s.injuryTime = Math.min(
            GB_MATCH.INJURY_TIME_MAX,
            Math.max(GB_MATCH.INJURY_TIME_MIN, s.stoppageAccumulator),
          );
          s.injuryTimeAnnounced = true;
          const injMins = Math.ceil(s.injuryTime / 60);
          pushEvent(s, "injury_time", `${injMins} minute(s) of injury time added`);
          s.merlinSpeech = `${injMins} minute(s) of added time!`;
          s.merlinSpeechTimer = 3;
        }

        if (s.matchClock >= GB_MATCH.HALF_DURATION + s.injuryTime) {
          if (s.half === 1) {
            s.phase = GBMatchPhase.HALFTIME;
            s.phaseTimer = GB_MATCH.HALFTIME_DURATION;
            s.injuryTimeAnnounced = false;
            s.stoppageAccumulator = 0;
            pushEvent(s, "halftime", `Halftime: ${s.scores[0]} - ${s.scores[1]}`);
          } else {
            s.phase = GBMatchPhase.FULL_MATCH;
            s.phaseTimer = 4;
            if (s.scores[0] !== s.scores[1]) {
              pushEvent(s, "match_end", `Full time! ${s.teamDefs[0].shortName} ${s.scores[0]} - ${s.scores[1]} ${s.teamDefs[1].shortName}`);
            }
          }
        }
        break;

      case GBMatchPhase.GOAL_SCORED:
        if (s.phaseTimer <= 0) {
          s.phase = GBMatchPhase.KICKOFF;
          s.phaseTimer = GB_MATCH.KICKOFF_DELAY;
          resetPositionsForKickoff(s, s.lastGoalTeam);
        }
        break;

      case GBMatchPhase.HALFTIME:
        if (s.phaseTimer <= 0) {
          s.half = 2;
          s.matchClock = 0;
          s.injuryTimeAnnounced = false;
          s.stoppageAccumulator = 0;
          s.phase = GBMatchPhase.KICKOFF;
          s.phaseTimer = GB_MATCH.KICKOFF_DELAY;
          resetPositionsForKickoff(s, -1);

          // AI team auto-substitution at halftime: sub out most fatigued player
          this._autoSubstitute(s.humanTeam === 0 ? 1 : 0);
        }
        break;

      case GBMatchPhase.FULL_MATCH:
        if (s.phaseTimer <= 0) {
          if (s.scores[0] === s.scores[1]) {
            // Overtime
            s.overtime = true;
            s.matchClock = 0;
            s.phase = GBMatchPhase.KICKOFF;
            s.phaseTimer = GB_MATCH.KICKOFF_DELAY;
            resetPositionsForKickoff(s, -1);
            pushEvent(s, "overtime", "Tied! Going to overtime...");
          } else {
            s.phase = GBMatchPhase.POST_GAME;
            s.phaseTimer = 10;
          }
        }
        break;

      case GBMatchPhase.OVERTIME:
        s.matchClock += dt;
        if (s.matchClock >= GB_MATCH.OVERTIME_DURATION) {
          const winner = s.scores[0] > s.scores[1] ? 0 : s.scores[1] > s.scores[0] ? 1 : -1;
          if (winner === 0 || winner === 1) {
            s.phase = GBMatchPhase.POST_GAME;
            s.phaseTimer = GB_MATCH.POST_MATCH_CEREMONY;
            pushEvent(s, "match_end", `${s.teamDefs[winner].name} wins in overtime!`);
          } else {
            // Still tied: go to penalty shootout
            s.phase = GBMatchPhase.PENALTY_SHOOTOUT;
            s.phaseTimer = 0;
            s.penaltyState = createPenaltyState();
            this._setupPenaltyShooter();
            pushEvent(s, "penalty", "Tied after overtime! Penalty shootout begins!");
            s.merlinSpeech = "To the penalties! May the best team prevail!";
            s.merlinSpeechTimer = 3;
          }
        }
        break;

      case GBMatchPhase.PENALTY_SHOOTOUT:
        // Handled in _tickPenaltyShootout
        break;

      case GBMatchPhase.POST_GAME:
        // Post-match ceremony: fireworks for the winner
        if (s.phaseTimer > GB_MATCH.POST_MATCH_CEREMONY - 2 && s.phaseTimer <= GB_MATCH.POST_MATCH_CEREMONY) {
          // Trigger celebration particles
          const winTeam = s.scores[0] > s.scores[1] ? 0 : s.scores[1] > s.scores[0] ? 1 : -1;
          if (winTeam >= 0) {
            for (const p of s.players) {
              if (p.teamIndex === winTeam) {
                p.action = GBPlayerAction.CELEBRATING;
                p.actionTimer = 5;
              }
            }
          }
        }
        if (s.phaseTimer <= 0) {
          // Record career result if in career mode
          if (s.careerState?.active) {
            const homeTeamId = s.teamDefs[0].id;
            const awayTeamId = s.teamDefs[1].id;
            recordMatchResult(s.careerState, homeTeamId, awayTeamId, s.scores[0], s.scores[1], false);
            // Simulate other fixtures
            simulateRemainingFixtures(s.careerState);
          }

          // Return to team select (or career menu)
          this._renderer.destroy();
          this._hud.destroy();
          if (this._tickerCb) {
            viewManager.app.ticker.remove(this._tickerCb);
            this._tickerCb = null;
          }
          if (this._inCareerMode && this._state.careerState?.active) {
            this._showCareerMenu();
          } else {
            this._showTeamSelect();
          }
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Simulation tick
  // ---------------------------------------------------------------------------
  private _tickSimulation(dt: number): void {
    const s = this._state;

    // AI role assignment (every ~0.5s-ish, done cheaply)
    assignAIRoles(s, 0);
    assignAIRoles(s, 1);

    // AI formation adaptation (every ~5s for AI team)
    this._formationAdaptTimer -= dt;
    if (this._formationAdaptTimer <= 0) {
      this._formationAdaptTimer = 5;
      // Adapt AI team formation (team that is not human)
      const aiTeam = s.humanTeam === 0 ? 1 : 0;
      adaptFormation(s, aiTeam);
    }

    // Tick each player
    for (const p of s.players) {
      this._tickPlayer(p, dt);
    }

    // Tick orb (enhanced physics)
    this._tickOrb(dt);

    // Ball-player collisions with momentum transfer
    checkBallPlayerCollisions(s);

    // Check goal
    this._checkGoal();

    // Tick power-ups
    this._tickPowerUps(dt);

    // Tick Merlin
    this._tickMerlin(dt);

    // Possession tracking
    const carrier = getOrbCarrier(s);
    if (carrier) {
      s.possession[carrier.teamIndex] += dt;
    }
  }

  // ---------------------------------------------------------------------------
  // Player tick
  // ---------------------------------------------------------------------------
  private _tickPlayer(p: GBPlayer, dt: number): void {
    const s = this._state;

    // Timers
    if (p.abilityCooldown > 0) p.abilityCooldown -= dt;
    if (p.tackleCooldown > 0) p.tackleCooldown -= dt;
    if (p.stunTimer > 0) {
      p.stunTimer -= dt;
      if (p.stunTimer <= 0) {
        p.action = GBPlayerAction.IDLE;
      }
      return; // stunned players can't act
    }
    if (p.foulTimer > 0) {
      p.foulTimer -= dt;
      if (p.foulTimer <= 0) {
        p.action = GBPlayerAction.IDLE;
      }
      return;
    }
    if (p.actionTimer > 0) {
      p.actionTimer -= dt;
      if (p.actionTimer <= 0 && (p.action === GBPlayerAction.THROWING || p.action === GBPlayerAction.TACKLING || p.action === GBPlayerAction.CASTING)) {
        p.action = p.hasOrb ? GBPlayerAction.CARRYING : GBPlayerAction.IDLE;
      }
    }

    // Power-up timer
    if (p.powerUpTimer > 0) {
      p.powerUpTimer -= dt;
      if (p.powerUpTimer <= 0) {
        p.activePowerUp = null;
      }
    }

    // Position ability tick
    tickPositionAbility(p, dt);

    // Enhanced stamina regen based on activity
    const speed = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
    let regenRate: number;
    if (p.action === GBPlayerAction.IDLE || speed < 0.5) {
      regenRate = GB_STAMINA.STANDING_REGEN;
    } else if (speed < p.speed * 0.6) {
      regenRate = GB_STAMINA.WALKING_REGEN;
    } else {
      regenRate = GB_STAMINA.RUNNING_REGEN;
    }
    p.stamina = Math.min(p.maxStamina, p.stamina + regenRate * dt);

    // Track distance for fatigue
    const distThisFrame = speed * dt;
    p.totalDistanceRun += distThisFrame;

    // Update fatigue factor (degrades over total distance)
    p.fatigueFactor = Math.max(0.3, 1.0 - p.totalDistanceRun * 0.0003);

    // AI for non-human players (skip human-controlled players)
    const isP1 = p.id === s.selectedPlayerId && p.teamIndex === s.humanTeam;
    const isP2 = s.localMultiplayer && p.id === s.selectedPlayer2Id && p.teamIndex === s.player2Team;
    if (!isP1 && !isP2) {
      const decision = decideAI(s, p, dt);
      this._applyAIDecision(p, decision, dt);
    }

    // Movement physics
    p.pos.x += p.vel.x * dt;
    p.pos.z += p.vel.z * dt;

    // Deceleration
    p.vel.x *= GB_PHYSICS.PLAYER_DECELERATION;
    p.vel.z *= GB_PHYSICS.PLAYER_DECELERATION;

    // Clamp to field bounds (with small margin)
    const margin = 1;
    p.pos.x = Math.max(-GB_FIELD.HALF_LENGTH - margin, Math.min(GB_FIELD.HALF_LENGTH + margin, p.pos.x));
    p.pos.z = Math.max(-GB_FIELD.HALF_WIDTH - margin, Math.min(GB_FIELD.HALF_WIDTH + margin, p.pos.z));

    // Update facing based on velocity
    if (Math.abs(p.vel.x) > 0.3 || Math.abs(p.vel.z) > 0.3) {
      p.facing = Math.atan2(-p.vel.z, p.vel.x);
    }

    // Auto-pickup orb
    if (!p.hasOrb && s.orb.carrier == null && !s.orb.inFlight) {
      const dist = v3Dist(p.pos, s.orb.pos);
      if (dist < GB_PHYSICS.AUTO_PICKUP_RANGE + p.catchRadius * 0.3) {
        this._pickUpOrb(p);
      }
    }

    // Catch in-flight orb
    if (!p.hasOrb && s.orb.inFlight && s.orb.lastTeam === p.teamIndex) {
      const dist = v3Dist3D(p.pos, s.orb.pos);
      if (dist < p.catchRadius) {
        this._pickUpOrb(p);
      }
    }

    // Intercept opponent throw
    if (!p.hasOrb && s.orb.inFlight && s.orb.lastTeam !== p.teamIndex) {
      const dist = v3Dist3D(p.pos, s.orb.pos);
      if (dist < p.catchRadius * 0.6) {
        this._pickUpOrb(p);
      }
    }

    // Update action state for animation (reuse 'speed' from stamina calc above)
    if (p.action === GBPlayerAction.IDLE || p.action === GBPlayerAction.RUNNING || p.action === GBPlayerAction.CARRYING || p.action === GBPlayerAction.SPRINTING) {
      const spd = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
      if (p.hasOrb) {
        p.action = spd > 1 ? GBPlayerAction.CARRYING : GBPlayerAction.CARRYING;
      } else {
        p.action = spd > 5 ? GBPlayerAction.SPRINTING : spd > 0.5 ? GBPlayerAction.RUNNING : GBPlayerAction.IDLE;
      }
    }

    // Anim phase
    p.animPhase += dt * speed * 0.5;
  }

  // ---------------------------------------------------------------------------
  // AI decision application
  // ---------------------------------------------------------------------------
  private _applyAIDecision(p: GBPlayer, d: ReturnType<typeof decideAI>, dt: number): void {
    if (d.moveDir) {
      const fatigueMult = getFatigueSpeedMultiplier(p);
      const weatherMult = getWeatherSpeedMultiplier(this._state);
      const posAbilityMult = p.positionAbilityActive && p.position === GBPosition.STRIKER ? 1.6 : 1;
      const spd = p.speed * (d.sprint ? p.sprintMultiplier : 1) * fatigueMult * weatherMult * posAbilityMult;
      // Apply power-up
      const speedMod = p.activePowerUp === GBPowerUpType.SPEED_BOOST ? 1.4 : 1;
      p.vel.x = d.moveDir.x * spd * speedMod;
      p.vel.z = d.moveDir.z * spd * speedMod;

      if (d.sprint && p.stamina > 0) {
        p.stamina -= GB_STAMINA.SPRINT_DRAIN * dt * this._state.weatherEffect.staminaDrainMult;
      }
    }

    if (d.tackle) this._doTackle(p);
    if (d.useAbility) this._doAbility(p);
    if (d.pass && p.hasOrb) this._doPass(p);
    if (d.shoot && p.hasOrb) this._doShoot(p);
    if (d.lobPass && p.hasOrb) this._doLobPass(p);
  }

  // ---------------------------------------------------------------------------
  // Input handling
  // ---------------------------------------------------------------------------
  private _tickInput(dt: number): void {
    const s = this._state;

    // Escape = pause
    if (_justPressed("Escape")) {
      if (this._showingRules) {
        this._hud.hideRules();
        this._showingRules = false;
        return;
      }
      this._paused = !this._paused;
      if (this._paused) {
        this._hud.showPause(
          () => { this._paused = false; },
          () => {
            this._paused = false;
            this._showingRules = true;
            this._hud.showRules(() => { this._showingRules = false; });
          },
          () => {
            this._paused = false;
            this._renderer.destroy();
            this._hud.destroy();
            if (this._tickerCb) {
              viewManager.app.ticker.remove(this._tickerCb);
              this._tickerCb = null;
            }
            this._showTeamSelect();
          },
          () => {
            this._paused = false;
            this._showingRules = true;
            this._hud.showControls(() => { this._showingRules = false; });
          },
        );
      } else {
        this._hud.hidePause();
      }
      return;
    }

    if (this._paused || this._showingRules) return;
    if (s.phase !== GBMatchPhase.PLAYING && s.phase !== GBMatchPhase.OVERTIME) return;

    const sel = getSelectedPlayer(s);
    if (!sel) return;

    // Movement
    let mx = 0, mz = 0;
    if (_isDown("ArrowUp") || _isDown("KeyW")) mz = -1;
    if (_isDown("ArrowDown") || _isDown("KeyS")) mz = 1;
    if (_isDown("ArrowLeft") || _isDown("KeyA")) mx = -1;
    if (_isDown("ArrowRight") || _isDown("KeyD")) mx = 1;

    if (mx !== 0 || mz !== 0) {
      const len = Math.sqrt(mx * mx + mz * mz);
      mx /= len; mz /= len;

      const fatigueMult = getFatigueSpeedMultiplier(sel);
      const weatherMult = getWeatherSpeedMultiplier(s);
      const posAbilityMult = sel.positionAbilityActive && sel.position === GBPosition.STRIKER ? 1.6 : 1;
      const spd = sel.speed * fatigueMult * weatherMult * posAbilityMult;
      const speedMod = sel.activePowerUp === GBPowerUpType.SPEED_BOOST ? 1.4 : 1;
      sel.vel.x = mx * spd * speedMod;
      sel.vel.z = mz * spd * speedMod;
    }

    // Space: pass (tap) / shoot (hold for power)
    if (_isDown("Space")) {
      if (sel.hasOrb) {
        if (!sel.throwCharging) {
          sel.throwCharging = true;
          sel.throwChargeTime = 0;
        }
        sel.throwChargeTime += dt;
      }
    }
    if (!_isDown("Space") && sel.throwCharging) {
      sel.throwCharging = false;
      if (sel.hasOrb) {
        if (sel.throwChargeTime > 0.4) {
          // Shoot (charged)
          this._doShoot(sel, sel.throwChargeTime);
        } else {
          // Quick pass
          this._doPass(sel);
        }
      }
      sel.throwChargeTime = 0;
    }

    // Shift: tackle or ability (context sensitive)
    const shiftPressed = _justPressed("ShiftLeft") || _justPressed("ShiftRight");
    const shiftHeld = _isDown("ShiftLeft") || _isDown("ShiftRight");
    if (sel.hasOrb) {
      // Use special ability on first press
      if (shiftPressed) {
        this._doAbility(sel);
      }
    } else {
      // Tackle while shift is held (cooldown prevents spam)
      if (shiftHeld) {
        this._doTackle(sel);
      }
    }

    // Tab: switch player
    if (_justPressed("Tab")) {
      this._switchPlayer();
    }

    // E: lob pass
    if (_justPressed("KeyE") && sel.hasOrb) {
      this._doLobPass(sel);
    }

    // Q: call for pass
    if (_justPressed("KeyQ") && !sel.hasOrb) {
      this._doCallForPass(sel);
    }

    // R: replay last key moment
    if (_justPressed("KeyR")) {
      if (s.replayMoments.length > 0) {
        startReplay(s);
      }
    }

    // Header/Volley: if orb is in the air nearby and player does not have it
    if (!sel.hasOrb && s.orb.carrier == null && s.orb.inFlight) {
      const orbDist = v3Dist3D(sel.pos, s.orb.pos);
      // Auto-attempt header when ball is at head height
      if (s.orb.pos.y > 1.5 && s.orb.pos.y < 3.5 && orbDist < GB_PHYSICS.ORB_HEADER_RANGE) {
        const oppGate = sel.teamIndex === 0
          ? v3(GB_FIELD.HALF_LENGTH + 1, GB_FIELD.GATE_HEIGHT * 0.4, 0)
          : v3(-GB_FIELD.HALF_LENGTH - 1, GB_FIELD.GATE_HEIGHT * 0.4, 0);
        if (attemptHeader(s, sel, oppGate)) {
          sel.stamina -= GB_STAMINA.HEADER_COST;
          pushEvent(s, "header", `${sel.name} heads the orb!`, sel.teamIndex, sel.id);
        }
      }
      // Auto-attempt volley when ball is at kick height
      else if (s.orb.pos.y > 0.3 && s.orb.pos.y < 2.0 && orbDist < GB_PHYSICS.ORB_VOLLEY_RANGE && _isDown("Space")) {
        const oppGate = sel.teamIndex === 0
          ? v3(GB_FIELD.HALF_LENGTH + 1, GB_FIELD.GATE_HEIGHT * 0.4, 0)
          : v3(-GB_FIELD.HALF_LENGTH - 1, GB_FIELD.GATE_HEIGHT * 0.4, 0);
        if (attemptVolley(s, sel, oppGate)) {
          sel.stamina -= GB_STAMINA.VOLLEY_COST;
          s.shots[sel.teamIndex]++;
          pushEvent(s, "volley", `${sel.name} volleys!`, sel.teamIndex, sel.id);
        }
      }
    }

    // Position ability (F key by default for P1 in single player, mapped keys in multiplayer)
    if (_justPressed("KeyF")) {
      this._doPositionAbility(sel);
    }

    // --- Player 2 input (local multiplayer) ---
    if (s.localMultiplayer) {
      this._tickInputP2(dt);
    }
  }

  // ---------------------------------------------------------------------------
  // Player 2 input handler (local multiplayer)
  // ---------------------------------------------------------------------------
  private _tickInputP2(dt: number): void {
    const s = this._state;
    if (s.phase !== GBMatchPhase.PLAYING && s.phase !== GBMatchPhase.OVERTIME) return;

    const sel2 = getSelectedPlayer2(s);
    if (!sel2) return;

    const mapping = GB_INPUT_P2;

    // Movement (WASD)
    let mx = 0, mz = 0;
    if (_isDown(mapping.up)) mz = -1;
    if (_isDown(mapping.down)) mz = 1;
    if (_isDown(mapping.left)) mx = -1;
    if (_isDown(mapping.right)) mx = 1;

    if (mx !== 0 || mz !== 0) {
      const len = Math.sqrt(mx * mx + mz * mz);
      mx /= len; mz /= len;

      const fatigueMult = getFatigueSpeedMultiplier(sel2);
      const weatherMult = getWeatherSpeedMultiplier(s);
      const posAbilityMult = sel2.positionAbilityActive && sel2.position === GBPosition.STRIKER ? 1.6 : 1;
      const spd = sel2.speed * fatigueMult * weatherMult * posAbilityMult;
      const speedMod = sel2.activePowerUp === GBPowerUpType.SPEED_BOOST ? 1.4 : 1;
      sel2.vel.x = mx * spd * speedMod;
      sel2.vel.z = mz * spd * speedMod;
    }

    // Pass / Shoot (Space for P2)
    if (_isDown(mapping.pass)) {
      if (sel2.hasOrb) {
        if (!sel2.throwCharging) {
          sel2.throwCharging = true;
          sel2.throwChargeTime = 0;
        }
        sel2.throwChargeTime += dt;
      }
    }
    if (!_isDown(mapping.pass) && sel2.throwCharging) {
      sel2.throwCharging = false;
      if (sel2.hasOrb) {
        if (sel2.throwChargeTime > 0.4) {
          this._doShoot(sel2, sel2.throwChargeTime);
        } else {
          this._doPass(sel2);
        }
      }
      sel2.throwChargeTime = 0;
    }

    // Tackle / Ability (Shift for P2)
    const shiftPressed2 = _justPressed(mapping.tackle);
    const shiftHeld2 = _isDown(mapping.tackle);
    if (sel2.hasOrb) {
      if (shiftPressed2) this._doAbility(sel2);
    } else {
      if (shiftHeld2) this._doTackle(sel2);
    }

    // Switch player (Tab for P2)
    if (_justPressed(mapping.switchPlayer)) {
      this._switchPlayer2();
    }

    // Lob pass
    if (_justPressed(mapping.lobPass) && sel2.hasOrb) {
      this._doLobPass(sel2);
    }

    // Call for pass
    if (_justPressed(mapping.callForPass) && !sel2.hasOrb) {
      this._doCallForPass(sel2);
    }

    // Position ability
    if (_justPressed(mapping.positionAbility)) {
      this._doPositionAbility(sel2);
    }
  }

  // ---------------------------------------------------------------------------
  // Switch player for P2
  // ---------------------------------------------------------------------------
  private _switchPlayer2(): void {
    const s = this._state;
    const p2Players = getTeamPlayers(s, s.player2Team).filter(
      p => p.stunTimer <= 0 && p.foulTimer <= 0,
    );
    if (p2Players.length === 0) return;

    const currentIdx = p2Players.findIndex(p => p.id === s.selectedPlayer2Id);
    const nextIdx = (currentIdx + 1) % p2Players.length;
    s.selectedPlayer2Id = p2Players[nextIdx].id;
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  private _pickUpOrb(p: GBPlayer): void {
    const s = this._state;
    s.orb.carrier = p.id;
    s.orb.inFlight = false;
    p.hasOrb = true;
    s.orb.lastTeam = p.teamIndex;
    s.orb.vel = v3();
  }

  private _doPass(p: GBPlayer): void {
    if (!p.hasOrb || p.stamina < GB_STAMINA.PASS_COST) return;
    const s = this._state;

    // Find best teammate to pass to (closest in facing direction)
    const teammates = getTeamPlayers(s, p.teamIndex).filter(t => t.id !== p.id && t.stunTimer <= 0);
    if (teammates.length === 0) return;

    // Score by angle match to facing and distance
    let best = teammates[0];
    let bestScore = -Infinity;
    for (const t of teammates) {
      const dir = v3Sub(t.pos, p.pos);
      const angle = Math.atan2(-dir.z, dir.x);
      let angleDiff = Math.abs(angle - p.facing);
      if (angleDiff > Math.PI) angleDiff = TAU - angleDiff;
      const dist = v3Dist(p.pos, t.pos);
      const score = -angleDiff * 2 - dist * 0.05;
      if (score > bestScore) { bestScore = score; best = t; }
    }

    this._launchOrb(p, best.pos, GB_PHYSICS.PASS_SPEED * p.fatigueFactor, 0.2);
    p.stamina -= GB_STAMINA.PASS_COST;
    p.action = GBPlayerAction.THROWING;
    p.actionTimer = 0.3;
  }

  private _doShoot(p: GBPlayer, chargeTime = 1): void {
    if (!p.hasOrb || p.stamina < GB_STAMINA.SHOOT_COST) return;
    const s = this._state;

    // Fatigue affects shot accuracy
    const accuracyMult = getFatigueAccuracyMultiplier(p);
    const scatter = (1 - accuracyMult) * GB_FIELD.GATE_WIDTH * 0.4;

    const oppGate = p.teamIndex === 0
      ? v3(GB_FIELD.HALF_LENGTH + 1, GB_FIELD.GATE_HEIGHT * 0.4, (Math.random() - 0.5) * GB_FIELD.GATE_WIDTH * 0.6 + (Math.random() - 0.5) * scatter)
      : v3(-GB_FIELD.HALF_LENGTH - 1, GB_FIELD.GATE_HEIGHT * 0.4, (Math.random() - 0.5) * GB_FIELD.GATE_WIDTH * 0.6 + (Math.random() - 0.5) * scatter);

    const power = Math.min(chargeTime / GB_PHYSICS.MAX_THROW_CHARGE, 1);
    const speed = GB_PHYSICS.SHOT_SPEED * (0.6 + power * 0.4) * p.fatigueFactor;
    const throwPowerMod = p.activePowerUp === GBPowerUpType.STRENGTH ? 1.3 : 1;

    this._launchOrb(p, oppGate, speed * throwPowerMod, 0.15);
    p.stamina -= GB_STAMINA.SHOOT_COST;
    p.action = GBPlayerAction.THROWING;
    p.actionTimer = 0.4;

    s.shots[p.teamIndex]++;
    pushEvent(s, "goal", `${p.name} shoots!`, p.teamIndex, p.id);
  }

  private _doLobPass(p: GBPlayer): void {
    if (!p.hasOrb || p.stamina < GB_STAMINA.LOB_COST) return;
    const s = this._state;

    // Lob toward furthest forward teammate
    const teammates = getTeamPlayers(s, p.teamIndex).filter(t => t.id !== p.id);
    const oppGate = p.teamIndex === 0
      ? v3(GB_FIELD.HALF_LENGTH, 0, 0)
      : v3(-GB_FIELD.HALF_LENGTH, 0, 0);

    let best = teammates[0];
    let bestDist = Infinity;
    for (const t of teammates) {
      const d = v3Dist(t.pos, oppGate);
      if (d < bestDist) { bestDist = d; best = t; }
    }

    this._launchOrb(p, v3(best.pos.x, 0, best.pos.z), GB_PHYSICS.LOB_SPEED * p.fatigueFactor, GB_PHYSICS.LOB_ANGLE);
    p.stamina -= GB_STAMINA.LOB_COST;
    p.action = GBPlayerAction.THROWING;
    p.actionTimer = 0.4;
  }

  private _launchOrb(p: GBPlayer, target: Vec3, speed: number, upAngle: number): void {
    // Use the enhanced physics launch with spin
    const spinY = (Math.random() - 0.5) * 0.2; // slight random curve
    const spinX = p.cls === GBPlayerClass.MAGE ? 0.1 : 0; // mages add top spin
    launchOrbWithSpin(this._state, p, target, speed, upAngle, spinY, spinX);
  }

  private _doTackle(p: GBPlayer): void {
    if (p.tackleCooldown > 0 || p.stamina < GB_STAMINA.TACKLE_COST) return;
    const s = this._state;

    p.action = GBPlayerAction.TACKLING;
    p.actionTimer = 0.4;
    p.tackleCooldown = GB_PHYSICS.TACKLE_COOLDOWN;
    p.stamina -= GB_STAMINA.TACKLE_COST;

    // Lunge forward
    p.vel.x += Math.cos(p.facing) * 8;
    p.vel.z += -Math.sin(p.facing) * 8;

    // Check for hits on opponents
    const opponents = getTeamPlayers(s, p.teamIndex === 0 ? 1 : 0);
    for (const opp of opponents) {
      const dist = v3Dist(p.pos, opp.pos);
      if (dist < GB_PHYSICS.TACKLE_RANGE) {
        const tacklePower = p.tacklePower * (p.activePowerUp === GBPowerUpType.STRENGTH ? 1.5 : 1) * getFatigueTackleMultiplier(p);

        // Stun the opponent
        opp.stunTimer = GB_PHYSICS.TACKLE_STUN_DURATION;
        opp.action = GBPlayerAction.STUNNED;

        // Knock them back
        const knockDir = v3Normalize(v3Sub(opp.pos, p.pos));
        opp.vel.x += knockDir.x * tacklePower * 2;
        opp.vel.z += knockDir.z * tacklePower * 2;

        // Steal orb
        if (opp.hasOrb) {
          opp.hasOrb = false;
          s.orb.carrier = null;
          s.orb.inFlight = false;
          s.orb.pos = v3(opp.pos.x, 0.5, opp.pos.z);
          s.orb.vel = v3(knockDir.x * 3, 2, knockDir.z * 3);
        }

        s.tackles[p.teamIndex]++;
        pushEvent(s, "tackle", `${p.name} tackles ${opp.name}!`, p.teamIndex, p.id);

        // Camera shake
        s.cameraShake = Math.min(GB_CAMERA.MAX_SHAKE, s.cameraShake + 0.4);

        // Particles
        this._renderer.spawnTackleImpact(opp.pos.x, 0.5, opp.pos.z);

        break; // only tackle one
      }
    }
  }

  private _doAbility(p: GBPlayer): void {
    if (p.abilityCooldown > 0) return;
    const abilityDef = GB_ABILITIES[p.cls];
    if (p.stamina < abilityDef.staminaCost) return;

    const s = this._state;
    p.abilityCooldown = abilityDef.cooldown * (p.activePowerUp === GBPowerUpType.MAGIC_SURGE ? 0.5 : 1);
    p.stamina -= abilityDef.staminaCost;
    p.action = GBPlayerAction.CASTING;
    p.actionTimer = abilityDef.duration > 0 ? abilityDef.duration : 0.5;

    switch (p.cls) {
      case GBPlayerClass.KNIGHT:
        // Shield Charge: lunge forward, knock back enemies
        p.vel.x += Math.cos(p.facing) * 15;
        p.vel.z += -Math.sin(p.facing) * 15;
        p.action = GBPlayerAction.TACKLING;
        // Hit opponents in path
        for (const opp of getTeamPlayers(s, p.teamIndex === 0 ? 1 : 0)) {
          if (v3Dist(p.pos, opp.pos) < 4) {
            opp.stunTimer = 1;
            opp.action = GBPlayerAction.STUNNED;
            const knockDir = v3Normalize(v3Sub(opp.pos, p.pos));
            opp.vel.x += knockDir.x * 12;
            opp.vel.z += knockDir.z * 12;
            if (opp.hasOrb) {
              opp.hasOrb = false;
              s.orb.carrier = null;
              s.orb.pos = v3(opp.pos.x, 1, opp.pos.z);
              s.orb.vel = v3(knockDir.x * 5, 3, knockDir.z * 5);
              s.orb.inFlight = false;
            }
          }
        }
        s.cameraShake = Math.min(GB_CAMERA.MAX_SHAKE, s.cameraShake + 0.5);
        pushEvent(s, "ability", `${p.name} uses Shield Charge!`, p.teamIndex, p.id);
        break;

      case GBPlayerClass.ROGUE:
        // Shadow Step: teleport forward
        const stepDist = 8;
        p.pos.x += Math.cos(p.facing) * stepDist;
        p.pos.z += -Math.sin(p.facing) * stepDist;
        // Clamp
        p.pos.x = Math.max(-GB_FIELD.HALF_LENGTH, Math.min(GB_FIELD.HALF_LENGTH, p.pos.x));
        p.pos.z = Math.max(-GB_FIELD.HALF_WIDTH, Math.min(GB_FIELD.HALF_WIDTH, p.pos.z));
        pushEvent(s, "ability", `${p.name} uses Shadow Step!`, p.teamIndex, p.id);
        break;

      case GBPlayerClass.MAGE:
        // Arcane Blast: if carrying orb, super-powered shot; otherwise stun wave
        if (p.hasOrb) {
          const oppGate = p.teamIndex === 0
            ? v3(GB_FIELD.HALF_LENGTH + 1, GB_FIELD.GATE_HEIGHT * 0.4, (Math.random() - 0.5) * 3)
            : v3(-GB_FIELD.HALF_LENGTH - 1, GB_FIELD.GATE_HEIGHT * 0.4, (Math.random() - 0.5) * 3);
          this._launchOrb(p, oppGate, GB_PHYSICS.SHOT_SPEED * 1.5, 0.1);
        }
        // Stun wave around mage
        for (const opp of getTeamPlayers(s, p.teamIndex === 0 ? 1 : 0)) {
          if (v3Dist(p.pos, opp.pos) < 6) {
            opp.stunTimer = 0.8;
            opp.action = GBPlayerAction.STUNNED;
          }
        }
        s.cameraShake = Math.min(GB_CAMERA.MAX_SHAKE, s.cameraShake + 0.3);
        pushEvent(s, "ability", `${p.name} uses Arcane Blast!`, p.teamIndex, p.id);
        break;

      case GBPlayerClass.GATEKEEPER:
        // Fortress Wall: temporary invulnerability (high stun resistance)
        // Implemented as a long stun immunity + orb repulsion
        p.stunTimer = -abilityDef.duration; // negative = immune
        pushEvent(s, "ability", `${p.name} raises Fortress Wall!`, p.teamIndex, p.id);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Position-based ability activation
  // ---------------------------------------------------------------------------
  private _doPositionAbility(p: GBPlayer): void {
    if (!canUsePositionAbility(p)) return;
    const s = this._state;
    const abilityDef = GB_POSITION_ABILITIES[p.position];

    p.positionAbilityCooldown = abilityDef.cooldown;
    p.stamina -= abilityDef.staminaCost;

    switch (p.position) {
      case GBPosition.GOALKEEPER: {
        // Miraculous Save: expand catch radius dramatically for a brief moment
        const originalCatchRadius = p.catchRadius;
        p.catchRadius *= 3.0;
        p.positionAbilityActive = true;
        p.positionAbilityTimer = 0.8;
        // Lunge toward ball
        const orbDir = v3Normalize(v3Sub(s.orb.pos, p.pos));
        p.vel.x = orbDir.x * 20;
        p.vel.z = orbDir.z * 20;
        pushEvent(s, "save", `${p.name} makes a Miraculous Save attempt!`, p.teamIndex, p.id);
        // Schedule catch radius reset
        setTimeout(() => { p.catchRadius = originalCatchRadius; }, 800);
        break;
      }
      case GBPosition.DEFENDER: {
        // Iron Wall: become immovable, block opponents
        p.positionAbilityActive = true;
        p.positionAbilityTimer = abilityDef.duration;
        p.stunTimer = -abilityDef.duration; // negative = immune to stun
        p.size *= 2.0; // double collision size
        pushEvent(s, "ability", `${p.name} activates Iron Wall!`, p.teamIndex, p.id);
        // Schedule size reset
        const originalSize = p.size / 2.0;
        setTimeout(() => { p.size = originalSize; }, abilityDef.duration * 1000);
        break;
      }
      case GBPosition.MIDFIELDER: {
        // Long Pass: perfect cross-field pass with zero scatter
        if (!p.hasOrb) {
          pushEvent(s, "ability", `${p.name} readies a Long Pass!`, p.teamIndex, p.id);
          break;
        }
        // Find the furthest forward teammate
        const teammates = getTeamPlayers(s, p.teamIndex).filter(t => t.id !== p.id);
        const oppGateX = p.teamIndex === 0 ? GB_FIELD.HALF_LENGTH : -GB_FIELD.HALF_LENGTH;
        let bestTarget = teammates[0];
        let bestDist = Infinity;
        for (const t of teammates) {
          const d = Math.abs(t.pos.x - oppGateX);
          if (d < bestDist) { bestDist = d; bestTarget = t; }
        }
        // Launch with enhanced speed and zero scatter — use launchOrbWithSpin directly
        launchOrbWithSpin(s, p, bestTarget.pos, GB_PHYSICS.PASS_SPEED * 1.5, 0.25, 0, 0);
        p.action = GBPlayerAction.THROWING;
        p.actionTimer = 0.4;
        pushEvent(s, "ability", `${p.name} delivers a perfect Long Pass!`, p.teamIndex, p.id);
        break;
      }
      case GBPosition.STRIKER: {
        // Speed Burst: massive speed boost for duration
        p.positionAbilityActive = true;
        p.positionAbilityTimer = abilityDef.duration;
        pushEvent(s, "ability", `${p.name} activates Speed Burst!`, p.teamIndex, p.id);
        break;
      }
    }
  }

  private _switchPlayer(): void {
    const s = this._state;
    const humanPlayers = getTeamPlayers(s, s.humanTeam).filter(
      p => p.stunTimer <= 0 && p.foulTimer <= 0,
    );
    if (humanPlayers.length === 0) return;

    // Find current index
    const currentIdx = humanPlayers.findIndex(p => p.id === s.selectedPlayerId);
    const nextIdx = (currentIdx + 1) % humanPlayers.length;
    s.selectedPlayerId = humanPlayers[nextIdx].id;
  }

  private _doCallForPass(sel: GBPlayer): void {
    const s = this._state;
    const carrier = getOrbCarrier(s);
    if (!carrier || carrier.teamIndex !== sel.teamIndex) return;

    // AI carrier passes to caller
    this._launchOrb(carrier, sel.pos, GB_PHYSICS.PASS_SPEED, 0.15);
    carrier.action = GBPlayerAction.THROWING;
    carrier.actionTimer = 0.3;
    carrier.stamina -= 5;
  }

  // ---------------------------------------------------------------------------
  // Orb physics
  // ---------------------------------------------------------------------------
  private _tickOrb(dt: number): void {
    const s = this._state;
    const orb = s.orb;

    if (orb.carrier != null) {
      // Orb follows carrier
      const carrier = getPlayer(s, orb.carrier);
      if (carrier) {
        orb.pos = v3(
          carrier.pos.x + Math.cos(carrier.facing) * 0.5,
          carrier.pos.y + 1.2,
          carrier.pos.z - Math.sin(carrier.facing) * 0.5,
        );
        orb.vel = v3();
        orb.spin = v3();
      }
    } else {
      // Enhanced physics with spin, curve, drag, and surface friction
      tickOrbPhysics(s, dt);
    }

    // Update trail
    orb.trail.unshift(v3(orb.pos.x, orb.pos.y, orb.pos.z));
    if (orb.trail.length > 60) orb.trail.pop();

    // Decay glow
    orb.glowIntensity += (1 - orb.glowIntensity) * 0.05;
  }

  // ---------------------------------------------------------------------------
  // Goal detection
  // ---------------------------------------------------------------------------
  private _checkGoal(): void {
    const s = this._state;
    const orb = s.orb;

    for (let side = 0; side < 2; side++) {
      const gateX = side === 0 ? -GB_FIELD.HALF_LENGTH - 0.5 : GB_FIELD.HALF_LENGTH + 0.5;
      const isInGate = side === 0
        ? orb.pos.x < gateX
        : orb.pos.x > gateX;

      if (isInGate &&
          Math.abs(orb.pos.z) < GB_FIELD.GATE_WIDTH / 2 &&
          orb.pos.y < GB_FIELD.GATE_HEIGHT &&
          orb.pos.y > 0) {

        // Goal! Team that defends this gate concedes. The scoring team is the other.
        const scoringTeam = side === 0 ? 1 : 0;
        s.scores[scoringTeam]++;

        // Find scorer
        const scorerId = orb.lastThrownBy ?? -1;
        const scorer = scorerId > 0 ? getPlayer(s, scorerId) : null;

        s.lastGoalTeam = scoringTeam;
        s.lastGoalScorer = scorerId;

        pushEvent(s, "goal",
          scorer ? `GOAL! ${scorer.name} scores for ${s.teamDefs[scoringTeam].name}! (${s.scores[0]}-${s.scores[1]})`
            : `GOAL! ${s.teamDefs[scoringTeam].name} scores! (${s.scores[0]}-${s.scores[1]})`,
          scoringTeam, scorerId > 0 ? scorerId : undefined,
        );

        // Celebration state
        s.phase = GBMatchPhase.GOAL_SCORED;
        s.phaseTimer = GB_MATCH.GOAL_CELEBRATION;

        // Players celebrate/despair
        for (const p of s.players) {
          if (p.teamIndex === scoringTeam) {
            p.action = GBPlayerAction.CELEBRATING;
            p.actionTimer = GB_MATCH.GOAL_CELEBRATION;
          }
          p.hasOrb = false;
        }
        orb.carrier = null;
        orb.vel = v3();
        orb.inFlight = false;

        // Slow-mo on goal
        s.slowMoFactor = 0.3;
        s.slowMoTimer = 1.5;
        s.cameraShake = GB_CAMERA.MAX_SHAKE;

        // Goal explosion particles
        this._renderer.spawnGoalExplosion(gateX, 2, 0);

        // Record goal replay moment
        recordKeyMoment(s, "goal",
          scorer ? `${scorer.name} scores for ${s.teamDefs[scoringTeam].name}!` : `${s.teamDefs[scoringTeam].name} scores!`,
          scorerId > 0 ? scorerId : undefined,
          scoringTeam,
        );

        // Sudden death overtime: first goal wins
        if (s.overtime) {
          s.phase = GBMatchPhase.POST_GAME;
          s.phaseTimer = GB_MATCH.POST_MATCH_CEREMONY;
          pushEvent(s, "match_end", `${s.teamDefs[scoringTeam].name} wins in sudden death!`);
        }

        // Check gatekeeper save (if orb was going at gate and gatekeeper touched it)
        const gk = getTeamPlayers(s, side).find(p => p.cls === GBPlayerClass.GATEKEEPER);
        if (gk && v3Dist(gk.pos, v3(gateX, 0, 0)) < 4) {
          // Close but no save
        }

        break;
      }
    }

    // Carried-through-gate check: if a player carries the orb into the goal zone
    if (orb.carrier != null) {
      const carrier = getPlayer(s, orb.carrier);
      if (carrier) {
        for (let side = 0; side < 2; side++) {
          const defTeam = side; // team that defends this gate
          if (carrier.teamIndex === defTeam) continue; // can't score in own goal by carrying
          const gateX = side === 0 ? -GB_FIELD.HALF_LENGTH : GB_FIELD.HALF_LENGTH;
          const pastGate = side === 0
            ? carrier.pos.x < gateX + 0.5
            : carrier.pos.x > gateX - 0.5;
          if (pastGate &&
              Math.abs(carrier.pos.z) < GB_FIELD.GATE_WIDTH / 2 + 1 &&
              carrier.pos.y < GB_FIELD.GATE_HEIGHT) {
            const scoringTeam = carrier.teamIndex;
            s.scores[scoringTeam]++;
            s.lastGoalTeam = scoringTeam;
            s.lastGoalScorer = carrier.id;
            pushEvent(s, "goal",
              `GOAL! ${carrier.name} runs it in for ${s.teamDefs[scoringTeam].name}! (${s.scores[0]}-${s.scores[1]})`,
              scoringTeam, carrier.id);
            s.phase = GBMatchPhase.GOAL_SCORED;
            s.phaseTimer = GB_MATCH.GOAL_CELEBRATION;
            for (const p of s.players) {
              if (p.teamIndex === scoringTeam) {
                p.action = GBPlayerAction.CELEBRATING;
                p.actionTimer = GB_MATCH.GOAL_CELEBRATION;
              }
              p.hasOrb = false;
            }
            orb.carrier = null;
            orb.vel = v3();
            orb.inFlight = false;
            s.slowMoFactor = 0.3;
            s.slowMoTimer = 1.5;
            s.cameraShake = GB_CAMERA.MAX_SHAKE;
            const goalGateX = side === 0 ? -GB_FIELD.HALF_LENGTH - 0.5 : GB_FIELD.HALF_LENGTH + 0.5;
            this._renderer.spawnGoalExplosion(goalGateX, 2, 0);
            if (s.overtime) {
              s.phase = GBMatchPhase.POST_GAME;
              s.phaseTimer = 8;
              pushEvent(s, "match_end", `${s.teamDefs[scoringTeam].name} wins in sudden death!`);
            }
            break;
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Power-ups
  // ---------------------------------------------------------------------------
  private _tickPowerUps(dt: number): void {
    const s = this._state;

    s.nextPowerUpSpawn -= dt;
    if (s.nextPowerUpSpawn <= 0) {
      s.nextPowerUpSpawn = GB_MATCH.POWERUP_SPAWN_INTERVAL;

      // Spawn a random power-up
      const types = [GBPowerUpType.SPEED_BOOST, GBPowerUpType.STRENGTH, GBPowerUpType.MAGIC_SURGE];
      const type = types[Math.floor(Math.random() * types.length)];
      const posIdx = Math.floor(Math.random() * GB_POWERUP_POSITIONS.length);
      const posNorm = GB_POWERUP_POSITIONS[posIdx];

      const pu: GBPowerUp = {
        id: s.nextId++,
        type,
        pos: v3(
          (posNorm.x - 0.5) * GB_FIELD.LENGTH,
          0.5,
          posNorm.z * GB_FIELD.WIDTH,
        ),
        active: true,
        spawnTimer: 0,
        bobPhase: Math.random() * TAU,
      };
      s.powerUps.push(pu);
    }

    // Check pickup
    for (const pu of s.powerUps) {
      if (!pu.active) continue;

      for (const p of s.players) {
        if (v3Dist(p.pos, pu.pos) < 2) {
          pu.active = false;
          p.activePowerUp = pu.type;
          p.powerUpTimer = GB_MATCH.POWERUP_DURATION;
          pushEvent(s, "powerup", `${p.name} picks up ${pu.type.replace("_", " ")}!`, p.teamIndex, p.id);
          break;
        }
      }
    }

    // Clean up inactive
    s.powerUps = s.powerUps.filter(pu => pu.active);
  }

  // ---------------------------------------------------------------------------
  // Merlin (referee)
  // ---------------------------------------------------------------------------
  private _tickMerlin(dt: number): void {
    const s = this._state;

    // Move toward orb (hovering above)
    s.merlinTarget = v3(s.orb.pos.x * 0.5, 12, s.orb.pos.z * 0.5);

    // Speech timer
    if (s.merlinSpeechTimer > 0) {
      s.merlinSpeechTimer -= dt;
      if (s.merlinSpeechTimer <= 0) {
        s.merlinSpeech = null;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Replay input during playback
  // ---------------------------------------------------------------------------
  private _tickReplayInput(): void {
    // Space or R: skip replay
    if (_justPressed("Space") || _justPressed("KeyR")) {
      stopReplay(this._state);
      return;
    }
    // C: cycle camera angle
    if (_justPressed("KeyC")) {
      cycleReplayCamera(this._state);
    }
  }

  // ---------------------------------------------------------------------------
  // Penalty Shootout
  // ---------------------------------------------------------------------------
  private _setupPenaltyShooter(): void {
    const s = this._state;
    const ps = s.penaltyState;
    if (!ps) return;

    const shooterTeam = ps.shooterTeam;
    const keeperTeam = shooterTeam === 0 ? 1 : 0;

    // Pick shooter (cycle through outfield players)
    const shooters = getTeamPlayers(s, shooterTeam).filter(p => p.cls !== GBPlayerClass.GATEKEEPER);
    const idx = (ps.attempts[shooterTeam]) % shooters.length;
    const shooter = shooters[idx];

    const keeper = getTeamPlayers(s, keeperTeam).find(p => p.cls === GBPlayerClass.GATEKEEPER);

    if (shooter) {
      ps.shooterId = shooter.id;
      // Position shooter at penalty spot
      const penaltyX = keeperTeam === 0
        ? -GB_FIELD.HALF_LENGTH + GB_MATCH.PENALTY_DISTANCE
        : GB_FIELD.HALF_LENGTH - GB_MATCH.PENALTY_DISTANCE;
      shooter.pos = v3(penaltyX, 0, 0);
      shooter.facing = keeperTeam === 0 ? Math.PI : 0;
    }

    if (keeper) {
      ps.keeperId = keeper.id;
      const gateX = keeperTeam === 0 ? -GB_FIELD.HALF_LENGTH : GB_FIELD.HALF_LENGTH;
      keeper.pos = v3(gateX, 0, 0);
      keeper.facing = keeperTeam === 0 ? 0 : Math.PI;
    }

    ps.phase = "aiming";
    ps.aimAngle = 0;
    ps.aimPower = 0.7;
    ps.shotTimer = GB_MATCH.PENALTY_SHOT_TIME;
  }

  private _tickPenaltyShootout(dt: number): void {
    const s = this._state;
    const ps = s.penaltyState;
    if (!ps) return;

    switch (ps.phase) {
      case "aiming": {
        ps.shotTimer -= dt;

        // Human team aiming
        if (ps.shooterTeam === s.humanTeam) {
          // Oscillate aim with arrow keys
          if (_isDown("ArrowLeft") || _isDown("KeyA")) ps.aimAngle -= 2 * dt;
          if (_isDown("ArrowRight") || _isDown("KeyD")) ps.aimAngle += 2 * dt;
          if (_isDown("ArrowUp") || _isDown("KeyW")) ps.aimPower = Math.min(1, ps.aimPower + dt);
          if (_isDown("ArrowDown") || _isDown("KeyS")) ps.aimPower = Math.max(0.3, ps.aimPower - dt);
          ps.aimAngle = Math.max(-1, Math.min(1, ps.aimAngle));

          if (_justPressed("Space") || ps.shotTimer <= 0) {
            this._executePenaltyShot();
          }
        } else {
          // AI aiming: random aim with slight delay
          if (ps.shotTimer <= GB_MATCH.PENALTY_SHOT_TIME - 1.5) {
            ps.aimAngle = (Math.random() - 0.5) * 1.5;
            ps.aimPower = 0.6 + Math.random() * 0.4;
            this._executePenaltyShot();
          }
        }
        break;
      }

      case "shooting": {
        // Tick orb physics during the shot
        this._tickOrb(dt);

        // Check if ball reached the gate area or stopped
        const keeperTeam = ps.shooterTeam === 0 ? 1 : 0;
        const gateX = keeperTeam === 0 ? -GB_FIELD.HALF_LENGTH : GB_FIELD.HALF_LENGTH;
        const orbPastGate = keeperTeam === 0
          ? s.orb.pos.x < gateX + 0.5
          : s.orb.pos.x > gateX - 0.5;

        // AI keeper diving
        if (ps.keeperId != null) {
          const keeper = getPlayer(s, ps.keeperId);
          if (keeper) {
            // Keeper dives toward predicted ball position
            const diveDir = Math.sign(s.orb.pos.z - keeper.pos.z);
            keeper.vel.z = diveDir * 12;
            keeper.pos.z += keeper.vel.z * dt;
            keeper.pos.z = Math.max(-GB_FIELD.GATE_WIDTH / 2, Math.min(GB_FIELD.GATE_WIDTH / 2, keeper.pos.z));

            // Check save
            const dist = v3Dist3D(keeper.pos, s.orb.pos);
            if (dist < keeper.catchRadius * 1.5) {
              // Save!
              ps.phase = "result";
              ps.resultTimer = 2;
              const shooter = ps.shooterId ? getPlayer(s, ps.shooterId) : null;
              ps.history.push({ team: ps.shooterTeam, scored: false, shooter: shooter?.name ?? "Unknown" });
              ps.attempts[ps.shooterTeam]++;
              s.saves[keeperTeam]++;
              pushEvent(s, "save", `Save! ${keeper.name} stops the penalty!`, keeperTeam, keeper.id);
              recordKeyMoment(s, "save", `${keeper.name} saves the penalty!`, keeper.id, keeperTeam);
              s.orb.vel = v3();
              s.orb.inFlight = false;
              return;
            }
          }
        }

        if (orbPastGate &&
            Math.abs(s.orb.pos.z) < GB_FIELD.GATE_WIDTH / 2 &&
            s.orb.pos.y < GB_FIELD.GATE_HEIGHT) {
          // Goal!
          ps.phase = "result";
          ps.resultTimer = 2;
          ps.scores[ps.shooterTeam]++;
          const shooter = ps.shooterId ? getPlayer(s, ps.shooterId) : null;
          ps.history.push({ team: ps.shooterTeam, scored: true, shooter: shooter?.name ?? "Unknown" });
          ps.attempts[ps.shooterTeam]++;
          pushEvent(s, "penalty", `Penalty scored by ${shooter?.name ?? "Unknown"}!`, ps.shooterTeam);
          s.cameraShake = 0.3;
        } else if (v3Len(s.orb.vel) < 1 || s.orb.pos.y < 0) {
          // Miss
          ps.phase = "result";
          ps.resultTimer = 2;
          const shooter = ps.shooterId ? getPlayer(s, ps.shooterId) : null;
          ps.history.push({ team: ps.shooterTeam, scored: false, shooter: shooter?.name ?? "Unknown" });
          ps.attempts[ps.shooterTeam]++;
          pushEvent(s, "penalty", `Penalty missed by ${shooter?.name ?? "Unknown"}!`, ps.shooterTeam);
        }
        break;
      }

      case "result": {
        ps.resultTimer -= dt;
        if (ps.resultTimer <= 0) {
          // Check if shootout is decided
          const decided = this._isPenaltyShootoutDecided();
          if (decided) {
            ps.phase = "done";
            const winner = ps.scores[0] > ps.scores[1] ? 0 : 1;
            s.scores[winner]++; // add deciding point
            s.phase = GBMatchPhase.POST_GAME;
            s.phaseTimer = GB_MATCH.POST_MATCH_CEREMONY;
            pushEvent(s, "match_end",
              `${s.teamDefs[winner].name} wins on penalties! (${ps.scores[0]}-${ps.scores[1]})`);
          } else {
            // Next shooter (alternate teams)
            ps.shooterTeam = ps.shooterTeam === 0 ? 1 : 0;
            this._setupPenaltyShooter();
          }
        }
        break;
      }
    }
  }

  private _executePenaltyShot(): void {
    const s = this._state;
    const ps = s.penaltyState;
    if (!ps || !ps.shooterId) return;

    const shooter = getPlayer(s, ps.shooterId);
    if (!shooter) return;

    ps.phase = "shooting";

    const keeperTeam = ps.shooterTeam === 0 ? 1 : 0;
    const gateX = keeperTeam === 0 ? -GB_FIELD.HALF_LENGTH - 0.5 : GB_FIELD.HALF_LENGTH + 0.5;

    // Target based on aim angle
    const targetZ = ps.aimAngle * (GB_FIELD.GATE_WIDTH / 2) * 0.8;
    const targetY = GB_FIELD.GATE_HEIGHT * 0.3 + ps.aimPower * GB_FIELD.GATE_HEIGHT * 0.4;
    const target = v3(gateX, targetY, targetZ);

    const speed = GB_PHYSICS.SHOT_SPEED * ps.aimPower;
    this._launchOrb(shooter, target, speed, 0.1);

    s.orb.pos = v3(shooter.pos.x, 1.2, shooter.pos.z);
    shooter.action = GBPlayerAction.THROWING;
    shooter.actionTimer = 0.5;
  }

  private _isPenaltyShootoutDecided(): boolean {
    const ps = this._state.penaltyState;
    if (!ps) return false;

    const maxRounds = GB_MATCH.PENALTY_ROUNDS;

    // Best of 5 rounds
    if (ps.attempts[0] >= maxRounds && ps.attempts[1] >= maxRounds) {
      if (ps.scores[0] !== ps.scores[1]) return true;
      // Sudden death after 5 rounds
      if (ps.attempts[0] === ps.attempts[1] && ps.attempts[0] > maxRounds) {
        if (ps.scores[0] !== ps.scores[1]) return true;
      }
    }

    // One team can't catch up even with remaining shots
    const remainingA = Math.max(0, maxRounds - ps.attempts[0]);
    const remainingB = Math.max(0, maxRounds - ps.attempts[1]);
    if (ps.scores[0] > ps.scores[1] + remainingB && ps.attempts[0] >= ps.attempts[1]) return true;
    if (ps.scores[1] > ps.scores[0] + remainingA && ps.attempts[1] >= ps.attempts[0]) return true;

    return false;
  }

  // ---------------------------------------------------------------------------
  // Auto-substitute: AI picks most fatigued player to sub out
  // ---------------------------------------------------------------------------
  private _autoSubstitute(teamIndex: number): void {
    const s = this._state;
    if (s.subsRemaining[teamIndex] <= 0) return;

    const teamPlayers = getTeamPlayers(s, teamIndex).filter(
      p => p.cls !== GBPlayerClass.GATEKEEPER,
    );
    const benchOptions = s.benchPlayers.filter(
      p => p.teamIndex === teamIndex && !p.isSubstitute,
    );
    if (teamPlayers.length === 0 || benchOptions.length === 0) return;

    // Find most fatigued outfield player
    let mostFatigued = teamPlayers[0];
    for (const p of teamPlayers) {
      if (p.stamina / p.maxStamina < mostFatigued.stamina / mostFatigued.maxStamina) {
        mostFatigued = p;
      }
    }

    // Only sub if player is actually fatigued (below 50%)
    if (mostFatigued.stamina / mostFatigued.maxStamina > 0.5) return;

    // Find best bench player of same class
    const sameCls = benchOptions.find(p => p.cls === mostFatigued.cls);
    const sub = sameCls ?? benchOptions[0];
    if (sub) {
      this._doSubstitution(teamIndex, mostFatigued.id, sub.id);
    }
  }

  // ---------------------------------------------------------------------------
  // Substitution
  // ---------------------------------------------------------------------------
  private _doSubstitution(teamIndex: number, outPlayerId: number, inPlayerId: number): boolean {
    const s = this._state;
    if (s.subsRemaining[teamIndex] <= 0) return false;

    const outPlayer = s.players.find(p => p.id === outPlayerId && p.teamIndex === teamIndex);
    const inPlayer = s.benchPlayers.find(p => p.id === inPlayerId && p.teamIndex === teamIndex);
    if (!outPlayer || !inPlayer) return false;

    // Swap positions
    inPlayer.pos = v3(outPlayer.pos.x, outPlayer.pos.y, outPlayer.pos.z);
    inPlayer.vel = v3();
    inPlayer.isSubstitute = false;
    inPlayer.stamina = inPlayer.maxStamina;
    inPlayer.fatigueFactor = 1.0;
    inPlayer.totalDistanceRun = 0;

    outPlayer.isSubstitute = true;

    // Swap in the arrays
    const idx = s.players.indexOf(outPlayer);
    s.players[idx] = inPlayer;
    s.benchPlayers = s.benchPlayers.filter(p => p.id !== inPlayerId);
    s.benchPlayers.push(outPlayer);

    s.subsRemaining[teamIndex]--;
    pushEvent(s, "substitution", `${inPlayer.name} replaces ${outPlayer.name}`, teamIndex);

    // If the outgoing player was selected, switch to incoming
    if (s.selectedPlayerId === outPlayerId) {
      s.selectedPlayerId = inPlayerId;
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Career Mode Menu
  // ---------------------------------------------------------------------------
  private _showCareerMenu(): void {
    if (this._careerDiv) return;

    const career = this._state?.careerState;
    this._careerDiv = document.createElement("div");
    this._careerDiv.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:linear-gradient(135deg, #1a0a2e 0%, #0d1b2a 50%, #1a0a2e 100%);
      z-index:200;display:flex;flex-direction:column;align-items:center;
      font-family:Georgia,serif;color:#ffd700;overflow-y:auto;padding:20px;
    `;

    let html = `<h1 style="font-size:42px;margin:20px 0;text-shadow:3px 3px 6px #000;">CAREER MODE</h1>`;

    if (career) {
      const sorted = getSortedLeagueTable(career);

      html += `<div style="margin:10px;font-size:18px;">Season ${career.season.year} | Budget: ${career.transferBudget} gold</div>`;

      // League table
      html += `<div style="background:rgba(30,30,50,0.9);border:2px solid #daa520;border-radius:8px;padding:16px;margin:10px;min-width:500px;">`;
      html += `<h3 style="margin:0 0 10px;">League Table</h3>`;
      html += `<table style="width:100%;color:#ddd;font-size:14px;border-collapse:collapse;">`;
      html += `<tr style="border-bottom:1px solid #555;"><th style="text-align:left;padding:4px;">Pos</th><th style="text-align:left;">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>Pts</th></tr>`;
      sorted.forEach((entry, i) => {
        const team = GB_TEAMS.find(t => t.id === entry.teamId);
        const isPlayer = entry.teamId === career.playerTeamId;
        const style = isPlayer ? 'style="color:#ffd700;font-weight:bold;"' : '';
        html += `<tr ${style}><td style="padding:4px;">${i + 1}</td><td>${team?.shortName ?? entry.teamId}</td>`;
        html += `<td style="text-align:center;">${entry.played}</td><td style="text-align:center;">${entry.won}</td>`;
        html += `<td style="text-align:center;">${entry.drawn}</td><td style="text-align:center;">${entry.lost}</td>`;
        html += `<td style="text-align:center;">${entry.goalsFor}</td><td style="text-align:center;">${entry.goalsAgainst}</td>`;
        html += `<td style="text-align:center;font-weight:bold;">${entry.points}</td></tr>`;
      });
      html += `</table></div>`;

      // Trophies
      if (career.trophies.length > 0) {
        html += `<div style="background:rgba(30,30,50,0.9);border:2px solid #daa520;border-radius:8px;padding:16px;margin:10px;min-width:400px;">`;
        html += `<h3 style="margin:0 0 10px;">Trophy Cabinet</h3>`;
        for (const trophy of career.trophies) {
          const icon = trophy.type === "league" ? "League Champion" : "Cup Winner";
          html += `<div style="margin:4px 0;color:#ffd700;">${icon} - Year ${trophy.year}</div>`;
        }
        html += `</div>`;
      }

      // All-time stats
      html += `<div style="background:rgba(30,30,50,0.9);border:2px solid #daa520;border-radius:8px;padding:16px;margin:10px;min-width:400px;">`;
      html += `<h3 style="margin:0 0 10px;">All-Time Record</h3>`;
      html += `<div style="color:#ddd;">W: ${career.allTimeStats.totalWins} | D: ${career.allTimeStats.totalDraws} | L: ${career.allTimeStats.totalLosses}</div>`;
      html += `<div style="color:#ddd;">Goals: ${career.allTimeStats.totalGoalsFor} scored, ${career.allTimeStats.totalGoalsAgainst} conceded</div>`;
      html += `<div style="color:#ddd;">Seasons: ${career.allTimeStats.seasonsPlayed}</div>`;
      html += `</div>`;

      // Next fixture
      const nextFix = getNextFixture(career);
      if (nextFix) {
        const homeTeam = GB_TEAMS.find(t => t.id === nextFix.homeTeamId);
        const awayTeam = GB_TEAMS.find(t => t.id === nextFix.awayTeamId);
        html += `<div style="margin:20px;font-size:18px;">Next: ${homeTeam?.name ?? "?"} vs ${awayTeam?.name ?? "?"} ${nextFix.isCup ? "(Cup)" : "(League)"}</div>`;
      }
    }

    // Buttons
    html += `<div style="margin-top:20px;display:flex;gap:16px;">`;
    html += `<div id="gb-career-play" style="font-size:24px;cursor:pointer;padding:12px 36px;border:3px solid #daa520;border-radius:10px;color:#ffd700;transition:all 0.2s;background:rgba(218,165,32,0.1);">PLAY NEXT MATCH</div>`;
    html += `<div id="gb-career-end" style="font-size:18px;cursor:pointer;padding:12px 24px;border:2px solid #666;border-radius:10px;color:#aaa;transition:all 0.2s;">END SEASON</div>`;
    html += `<div id="gb-career-exit" style="font-size:18px;cursor:pointer;padding:12px 24px;border:2px solid #666;border-radius:10px;color:#aaa;transition:all 0.2s;">EXIT CAREER</div>`;
    html += `</div>`;

    this._careerDiv.innerHTML = html;
    document.body.appendChild(this._careerDiv);

    // Event handlers
    const playBtn = this._careerDiv.querySelector("#gb-career-play") as HTMLElement;
    if (playBtn) {
      playBtn.addEventListener("click", () => {
        this._hideCareerMenu();
        if (career) {
          const fixture = getNextFixture(career);
          if (fixture) {
            const t1 = GB_TEAMS.find(t => t.id === fixture.homeTeamId);
            const t2 = GB_TEAMS.find(t => t.id === fixture.awayTeamId);
            if (t1 && t2) {
              this._selectedTeam1 = GB_TEAMS.indexOf(t1);
              this._selectedTeam2 = GB_TEAMS.indexOf(t2);
              this._startMatch();
            }
          }
        }
      });
    }

    const endBtn = this._careerDiv.querySelector("#gb-career-end") as HTMLElement;
    if (endBtn && career) {
      endBtn.addEventListener("click", () => {
        endSeason(career);
        this._hideCareerMenu();
        this._showCareerMenu(); // Refresh
      });
    }

    const exitBtn = this._careerDiv.querySelector("#gb-career-exit") as HTMLElement;
    if (exitBtn) {
      exitBtn.addEventListener("click", () => {
        this._hideCareerMenu();
        this._inCareerMode = false;
        this._showTeamSelect();
      });
    }
  }

  private _hideCareerMenu(): void {
    if (this._careerDiv) {
      this._careerDiv.remove();
      this._careerDiv = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------
  destroy(): void {
    this._destroyed = true;

    window.removeEventListener("keydown", _onKeyDown);
    window.removeEventListener("keyup", _onKeyUp);

    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }

    this._renderer.destroy();
    this._hud.destroy();
    this._hideTeamSelect();
    this._hideCareerMenu();

    // Clear pressed keys
    for (const k of Object.keys(_keys)) _keys[k] = false;
    for (const k of Object.keys(_pressed)) _pressed[k] = false;
  }
}

// ---------------------------------------------------------------------------
const TAU = Math.PI * 2;
