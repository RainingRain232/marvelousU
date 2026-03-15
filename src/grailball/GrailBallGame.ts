// ---------------------------------------------------------------------------
// Grail Ball -- Main Game Orchestrator
// 3D medieval fantasy team ball sport. Manages match lifecycle, physics,
// input, AI, rendering, and HUD.
// ---------------------------------------------------------------------------

import type { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";

import {
  GBMatchPhase, GBPlayerClass, GBPowerUpType,
  GB_FIELD, GB_PHYSICS, GB_MATCH, GB_CAMERA, GB_ABILITIES,
  GB_TEAMS, GB_POWERUP_POSITIONS,
} from "./GrailBallConfig";

import {
  type GBMatchState, type GBPlayer, type GBPowerUp, type Vec3,
  GBPlayerAction,
  createMatchState, getPlayer, getOrbCarrier, getTeamPlayers, getSelectedPlayer,
  resetPositionsForKickoff, pushEvent,
  v3, v3Dist, v3Sub, v3Normalize, v3Len, v3Dist3D,
} from "./GrailBallState";

import { GrailBallRenderer } from "./GrailBallRenderer";
import { GrailBallHUD } from "./GrailBallHUD";
import { assignAIRoles, decideAI } from "./GrailBallAI";

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
      <div style="margin-top:30px;display:flex;gap:20px;">
        <div id="gb-start-btn" style="font-size:28px;cursor:pointer;padding:14px 48px;border:3px solid #daa520;border-radius:12px;color:#ffd700;transition:all 0.2s;background:rgba(218,165,32,0.1);">
          START MATCH
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

    const team1 = GB_TEAMS[this._selectedTeam1];
    const team2 = GB_TEAMS[this._selectedTeam2];
    this._state = createMatchState(team1, team2, 0);

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

    // Apply slow-mo
    const effectiveDt = dt * this._state.slowMoFactor;

    // Phase machine
    this._tickPhase(effectiveDt);

    // Simulation (only during gameplay phases)
    if (this._state.phase === GBMatchPhase.PLAYING || this._state.phase === GBMatchPhase.OVERTIME) {
      this._tickSimulation(effectiveDt);
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
        if (s.matchClock >= GB_MATCH.HALF_DURATION) {
          if (s.half === 1) {
            s.phase = GBMatchPhase.HALFTIME;
            s.phaseTimer = GB_MATCH.HALFTIME_DURATION;
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
          s.phase = GBMatchPhase.KICKOFF;
          s.phaseTimer = GB_MATCH.KICKOFF_DELAY;
          resetPositionsForKickoff(s, -1);
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
          // End -- whoever has more goals wins, or draw
          s.phase = GBMatchPhase.POST_GAME;
          s.phaseTimer = 10;
          const winner = s.scores[0] > s.scores[1] ? 0 : s.scores[1] > s.scores[0] ? 1 : -1;
          if (winner === 0 || winner === 1) {
            pushEvent(s, "match_end", `${s.teamDefs[winner].name} wins in overtime!`);
          } else {
            pushEvent(s, "match_end", "Match ends in a draw!");
          }
        }
        break;

      case GBMatchPhase.POST_GAME:
        if (s.phaseTimer <= 0) {
          // Return to team select
          this._renderer.destroy();
          this._hud.destroy();
          if (this._tickerCb) {
            viewManager.app.ticker.remove(this._tickerCb);
            this._tickerCb = null;
          }
          this._showTeamSelect();
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

    // Tick each player
    for (const p of s.players) {
      this._tickPlayer(p, dt);
    }

    // Tick orb
    this._tickOrb(dt);

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

    // Stamina regen
    const regenMod = p.action === GBPlayerAction.IDLE ? 1.5 : 0.5;
    p.stamina = Math.min(p.maxStamina, p.stamina + p.staminaRegen * regenMod * dt);

    // AI for non-human players
    if (p.id !== s.selectedPlayerId || p.teamIndex !== s.humanTeam) {
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

    // Update action state for animation
    if (p.action === GBPlayerAction.IDLE || p.action === GBPlayerAction.RUNNING || p.action === GBPlayerAction.CARRYING || p.action === GBPlayerAction.SPRINTING) {
      const speed = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
      if (p.hasOrb) {
        p.action = speed > 1 ? GBPlayerAction.CARRYING : GBPlayerAction.CARRYING;
      } else {
        p.action = speed > 5 ? GBPlayerAction.SPRINTING : speed > 0.5 ? GBPlayerAction.RUNNING : GBPlayerAction.IDLE;
      }
    }

    // Anim phase
    const speed = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
    p.animPhase += dt * speed * 0.5;
  }

  // ---------------------------------------------------------------------------
  // AI decision application
  // ---------------------------------------------------------------------------
  private _applyAIDecision(p: GBPlayer, d: ReturnType<typeof decideAI>, dt: number): void {
    if (d.moveDir) {
      const spd = p.speed * (d.sprint ? p.sprintMultiplier : 1);
      // Apply power-up
      const speedMod = p.activePowerUp === GBPowerUpType.SPEED_BOOST ? 1.4 : 1;
      p.vel.x = d.moveDir.x * spd * speedMod;
      p.vel.z = d.moveDir.z * spd * speedMod;

      if (d.sprint && p.stamina > 0) {
        p.stamina -= 8 * dt;
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

      const spd = sel.speed;
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
    if (!p.hasOrb || p.stamina < 5) return;
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

    this._launchOrb(p, best.pos, GB_PHYSICS.PASS_SPEED, 0.2);
    p.stamina -= 5;
    p.action = GBPlayerAction.THROWING;
    p.actionTimer = 0.3;
  }

  private _doShoot(p: GBPlayer, chargeTime = 1): void {
    if (!p.hasOrb || p.stamina < 10) return;
    const s = this._state;

    const oppGate = p.teamIndex === 0
      ? v3(GB_FIELD.HALF_LENGTH + 1, GB_FIELD.GATE_HEIGHT * 0.4, (Math.random() - 0.5) * GB_FIELD.GATE_WIDTH * 0.6)
      : v3(-GB_FIELD.HALF_LENGTH - 1, GB_FIELD.GATE_HEIGHT * 0.4, (Math.random() - 0.5) * GB_FIELD.GATE_WIDTH * 0.6);

    const power = Math.min(chargeTime / GB_PHYSICS.MAX_THROW_CHARGE, 1);
    const speed = GB_PHYSICS.SHOT_SPEED * (0.6 + power * 0.4);
    const throwPowerMod = p.activePowerUp === GBPowerUpType.STRENGTH ? 1.3 : 1;

    this._launchOrb(p, oppGate, speed * throwPowerMod, 0.15);
    p.stamina -= 10;
    p.action = GBPlayerAction.THROWING;
    p.actionTimer = 0.4;

    s.shots[p.teamIndex]++;
    pushEvent(s, "goal", `${p.name} shoots!`, p.teamIndex, p.id);
  }

  private _doLobPass(p: GBPlayer): void {
    if (!p.hasOrb || p.stamina < 8) return;
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

    this._launchOrb(p, v3(best.pos.x, 0, best.pos.z), GB_PHYSICS.LOB_SPEED, GB_PHYSICS.LOB_ANGLE);
    p.stamina -= 8;
    p.action = GBPlayerAction.THROWING;
    p.actionTimer = 0.4;
  }

  private _launchOrb(p: GBPlayer, target: Vec3, speed: number, upAngle: number): void {
    const s = this._state;
    p.hasOrb = false;
    s.orb.carrier = null;
    s.orb.lastThrownBy = p.id;
    s.orb.lastTeam = p.teamIndex;
    s.orb.inFlight = true;

    const dir = v3Normalize(v3Sub(target, p.pos));
    s.orb.pos = v3(p.pos.x + dir.x * 0.8, p.pos.y + 1.5, p.pos.z + dir.z * 0.8);
    s.orb.vel = v3(dir.x * speed, speed * upAngle, dir.z * speed);
    s.orb.glowIntensity = 2; // flash on throw
  }

  private _doTackle(p: GBPlayer): void {
    if (p.tackleCooldown > 0 || p.stamina < 10) return;
    const s = this._state;

    p.action = GBPlayerAction.TACKLING;
    p.actionTimer = 0.4;
    p.tackleCooldown = GB_PHYSICS.TACKLE_COOLDOWN;
    p.stamina -= 12;

    // Lunge forward
    p.vel.x += Math.cos(p.facing) * 8;
    p.vel.z += -Math.sin(p.facing) * 8;

    // Check for hits on opponents
    const opponents = getTeamPlayers(s, p.teamIndex === 0 ? 1 : 0);
    for (const opp of opponents) {
      const dist = v3Dist(p.pos, opp.pos);
      if (dist < GB_PHYSICS.TACKLE_RANGE) {
        const tacklePower = p.tacklePower * (p.activePowerUp === GBPowerUpType.STRENGTH ? 1.5 : 1);

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
      }
    } else {
      // Physics
      orb.vel.y += GB_PHYSICS.GRAVITY * dt;
      orb.pos.x += orb.vel.x * dt;
      orb.pos.y += orb.vel.y * dt;
      orb.pos.z += orb.vel.z * dt;

      // Ground bounce
      if (orb.pos.y < GB_PHYSICS.ORB_RADIUS) {
        orb.pos.y = GB_PHYSICS.ORB_RADIUS;
        orb.vel.y = Math.abs(orb.vel.y) * GB_PHYSICS.ORB_BOUNCE;
        orb.vel.x *= GB_PHYSICS.ORB_FRICTION;
        orb.vel.z *= GB_PHYSICS.ORB_FRICTION;

        if (Math.abs(orb.vel.y) < 0.5) {
          orb.vel.y = 0;
          orb.inFlight = false;
        }
      }

      // Wall bounce (sidelines)
      if (orb.pos.z < -GB_FIELD.HALF_WIDTH || orb.pos.z > GB_FIELD.HALF_WIDTH) {
        orb.pos.z = Math.max(-GB_FIELD.HALF_WIDTH, Math.min(GB_FIELD.HALF_WIDTH, orb.pos.z));
        orb.vel.z *= -GB_PHYSICS.ORB_BOUNCE;
      }

      // Goal posts bounce
      for (const xBound of [-GB_FIELD.HALF_LENGTH - 1, GB_FIELD.HALF_LENGTH + 1]) {
        if (Math.abs(orb.pos.x - xBound) < 1) {
          // Check if within gate opening
          if (Math.abs(orb.pos.z) > GB_FIELD.GATE_WIDTH / 2) {
            // Hit wall, bounce
            orb.vel.x *= -GB_PHYSICS.ORB_BOUNCE;
            orb.pos.x = xBound + (xBound < 0 ? 1 : -1);
          }
        }
      }

      // End wall bounce (behind gates)
      if (orb.pos.x < -GB_FIELD.HALF_LENGTH - 3 || orb.pos.x > GB_FIELD.HALF_LENGTH + 3) {
        orb.vel.x *= -0.5;
        orb.pos.x = Math.max(-GB_FIELD.HALF_LENGTH - 3, Math.min(GB_FIELD.HALF_LENGTH + 3, orb.pos.x));
      }

      // Friction on ground
      if (orb.pos.y <= GB_PHYSICS.ORB_RADIUS + 0.1) {
        orb.vel.x *= 0.98;
        orb.vel.z *= 0.98;
      }

      // Speed check: if very slow, mark as not in flight
      const speed = v3Len(orb.vel);
      if (speed < 0.5 && orb.pos.y < 0.5) {
        orb.inFlight = false;
      }
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

        // Sudden death overtime: first goal wins
        if (s.overtime) {
          s.phase = GBMatchPhase.POST_GAME;
          s.phaseTimer = 8;
          pushEvent(s, "match_end", `${s.teamDefs[scoringTeam].name} wins in sudden death!`);
        }

        // Check gatekeeper save (if orb was going at gate and gatekeeper touched it)
        // (simplified: if a gatekeeper of the conceding team was near the goal)
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

    // Clear pressed keys
    for (const k of Object.keys(_keys)) _keys[k] = false;
    for (const k of Object.keys(_pressed)) _pressed[k] = false;
  }
}

// ---------------------------------------------------------------------------
const TAU = Math.PI * 2;
