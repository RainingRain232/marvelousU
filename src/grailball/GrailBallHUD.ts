// ---------------------------------------------------------------------------
// Grail Ball -- HUD (2D PixiJS overlay)
// Score, timer, minimap, player info, events feed, rules menu.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import {
  GBMatchPhase, GBPlayerClass, GBPowerUpType,
  GB_FIELD, GB_MATCH, GB_ABILITIES, GB_RULES_TEXT,
} from "./GrailBallConfig";
import {
  type GBMatchState,
  getSelectedPlayer,
} from "./GrailBallState";

// ---------------------------------------------------------------------------
// Shared text styles
// ---------------------------------------------------------------------------
const FONT_FAMILY = "Georgia, serif";

const SCORE_STYLE = new TextStyle({
  fontFamily: FONT_FAMILY,
  fontSize: 48,
  fill: 0xffffff,
  fontWeight: "bold",
  stroke: { color: 0x000000, width: 4 },
});

const TIMER_STYLE = new TextStyle({
  fontFamily: FONT_FAMILY,
  fontSize: 22,
  fill: 0xffd700,
  fontWeight: "bold",
  stroke: { color: 0x000000, width: 2 },
});

const INFO_STYLE = new TextStyle({
  fontFamily: FONT_FAMILY,
  fontSize: 14,
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 2 },
});

const SMALL_STYLE = new TextStyle({
  fontFamily: FONT_FAMILY,
  fontSize: 12,
  fill: 0xcccccc,
  stroke: { color: 0x000000, width: 1 },
});

const EVENT_STYLE = new TextStyle({
  fontFamily: FONT_FAMILY,
  fontSize: 13,
  fill: 0xffffff,
  wordWrap: true,
  wordWrapWidth: 240,
  stroke: { color: 0x000000, width: 1 },
});

const ANNOUNCEMENT_STYLE = new TextStyle({
  fontFamily: FONT_FAMILY,
  fontSize: 60,
  fill: 0xffd700,
  fontWeight: "bold",
  stroke: { color: 0x000000, width: 5 },
  dropShadow: { color: 0x000000, alpha: 0.8, blur: 6, distance: 3 },
});

// ---------------------------------------------------------------------------
// GrailBallHUD
// ---------------------------------------------------------------------------
export class GrailBallHUD {
  readonly root = new Container();

  // Sub-containers
  private _scoreBoard = new Container();
  private _timerDisplay = new Container();
  private _playerInfo = new Container();
  private _minimap = new Container();
  private _eventsFeed = new Container();
  private _announcement = new Container();
  private _controlsHint = new Container();
  private _pauseOverlay = new Container();
  private _rulesOverlay = new Container();

  // Cached text objects
  private _scoreText!: Text;
  private _team1Name!: Text;
  private _team2Name!: Text;
  private _timerText!: Text;
  private _halfText!: Text;
  private _playerNameText!: Text;
  private _playerClassText!: Text;
  private _staminaBar!: Graphics;
  private _cooldownBar!: Graphics;
  private _cooldownText!: Text;
  private _announcementText!: Text;
  private _merlinSpeech!: Text;
  private _possessionBars!: Graphics;

  // Minimap
  private _minimapBg!: Graphics;
  private _minimapDots!: Graphics;

  // Event texts
  private _eventTexts: Text[] = [];

  // State
  private _screenW = 0;
  private _screenH = 0;

  // Power-up indicators
  private _powerUpIndicator!: Graphics;
  private _powerUpText!: Text;

  init(): void {
    this._screenW = window.innerWidth;
    this._screenH = window.innerHeight;

    this._buildScoreboard();
    this._buildTimer();
    this._buildPlayerInfo();
    this._buildMinimap();
    this._buildEventsFeed();
    this._buildAnnouncement();
    this._buildControlsHint();
    this._buildPauseOverlay();
    this._buildRulesOverlay();
    this._buildPowerUpIndicator();

    this.root.addChild(this._scoreBoard);
    this.root.addChild(this._timerDisplay);
    this.root.addChild(this._playerInfo);
    this.root.addChild(this._minimap);
    this.root.addChild(this._eventsFeed);
    this.root.addChild(this._announcement);
    this.root.addChild(this._controlsHint);
    this.root.addChild(this._pauseOverlay);
    this.root.addChild(this._rulesOverlay);
  }

  // ---------------------------------------------------------------------------
  // Build UI elements
  // ---------------------------------------------------------------------------

  private _buildScoreboard(): void {
    const cx = this._screenW / 2;

    // Background frame
    const bg = new Graphics();
    bg.roundRect(cx - 160, 8, 320, 60, 8);
    bg.fill({ color: 0x1a1a2e, alpha: 0.85 });
    bg.stroke({ color: 0xdaa520, width: 2 });
    this._scoreBoard.addChild(bg);

    // Ornamental top
    const ornament = new Graphics();
    ornament.moveTo(cx - 30, 4);
    ornament.lineTo(cx, -8);
    ornament.lineTo(cx + 30, 4);
    ornament.fill({ color: 0xdaa520, alpha: 0.9 });
    this._scoreBoard.addChild(ornament);

    this._team1Name = new Text({ text: "HOME", style: { ...INFO_STYLE, fontSize: 14, fill: 0xdddddd } });
    this._team1Name.anchor.set(1, 0.5);
    this._team1Name.position.set(cx - 60, 28);
    this._scoreBoard.addChild(this._team1Name);

    this._scoreText = new Text({ text: "0 - 0", style: SCORE_STYLE });
    this._scoreText.anchor.set(0.5, 0.5);
    this._scoreText.position.set(cx, 36);
    this._scoreBoard.addChild(this._scoreText);

    this._team2Name = new Text({ text: "AWAY", style: { ...INFO_STYLE, fontSize: 14, fill: 0xdddddd } });
    this._team2Name.anchor.set(0, 0.5);
    this._team2Name.position.set(cx + 60, 28);
    this._scoreBoard.addChild(this._team2Name);
  }

  private _buildTimer(): void {
    const cx = this._screenW / 2;

    this._timerText = new Text({ text: "5:00", style: TIMER_STYLE });
    this._timerText.anchor.set(0.5, 0);
    this._timerText.position.set(cx, 72);
    this._timerDisplay.addChild(this._timerText);

    this._halfText = new Text({ text: "1st Half", style: { ...SMALL_STYLE, fill: 0xffd700 } });
    this._halfText.anchor.set(0.5, 0);
    this._halfText.position.set(cx, 96);
    this._timerDisplay.addChild(this._halfText);
  }

  private _buildPlayerInfo(): void {
    const x = 16;
    const y = this._screenH - 130;

    const bg = new Graphics();
    bg.roundRect(0, 0, 260, 120, 6);
    bg.fill({ color: 0x1a1a2e, alpha: 0.8 });
    bg.stroke({ color: 0xdaa520, width: 1 });
    this._playerInfo.addChild(bg);
    this._playerInfo.position.set(x, y);

    this._playerNameText = new Text({ text: "Player Name", style: { ...INFO_STYLE, fontSize: 16, fill: 0xffd700 } });
    this._playerNameText.position.set(10, 8);
    this._playerInfo.addChild(this._playerNameText);

    this._playerClassText = new Text({ text: "Class", style: SMALL_STYLE });
    this._playerClassText.position.set(10, 28);
    this._playerInfo.addChild(this._playerClassText);

    // Stamina bar
    this._staminaBar = new Graphics();
    this._staminaBar.position.set(10, 50);
    this._playerInfo.addChild(this._staminaBar);

    const staminaLabel = new Text({ text: "Stamina", style: { ...SMALL_STYLE, fontSize: 10 } });
    staminaLabel.position.set(10, 38);
    this._playerInfo.addChild(staminaLabel);

    // Cooldown bar
    this._cooldownBar = new Graphics();
    this._cooldownBar.position.set(10, 80);
    this._playerInfo.addChild(this._cooldownBar);

    this._cooldownText = new Text({ text: "Ability: Ready", style: { ...SMALL_STYLE, fontSize: 11 } });
    this._cooldownText.position.set(10, 68);
    this._playerInfo.addChild(this._cooldownText);

    // Possession bars
    this._possessionBars = new Graphics();
    this._possessionBars.position.set(10, 100);
    this._playerInfo.addChild(this._possessionBars);
  }

  private _buildMinimap(): void {
    const mmW = 180;
    const mmH = 110;
    const x = this._screenW - mmW - 16;
    const y = this._screenH - mmH - 16;

    this._minimap.position.set(x, y);

    this._minimapBg = new Graphics();
    this._minimapBg.roundRect(0, 0, mmW, mmH, 4);
    this._minimapBg.fill({ color: 0x2d5016, alpha: 0.85 });
    this._minimapBg.stroke({ color: 0xdaa520, width: 1 });
    // Center line
    this._minimapBg.moveTo(mmW / 2, 0);
    this._minimapBg.lineTo(mmW / 2, mmH);
    this._minimapBg.stroke({ color: 0xffffff, width: 0.5, alpha: 0.4 });
    // Center circle
    this._minimapBg.circle(mmW / 2, mmH / 2, 12);
    this._minimapBg.stroke({ color: 0xffffff, width: 0.5, alpha: 0.4 });
    this._minimap.addChild(this._minimapBg);

    this._minimapDots = new Graphics();
    this._minimap.addChild(this._minimapDots);

    const label = new Text({ text: "MINIMAP", style: { ...SMALL_STYLE, fontSize: 9 } });
    label.anchor.set(0.5, 1);
    label.position.set(mmW / 2, -2);
    this._minimap.addChild(label);
  }

  private _buildEventsFeed(): void {
    const x = this._screenW - 260;
    const y = 80;
    this._eventsFeed.position.set(x, y);

    const bg = new Graphics();
    bg.roundRect(0, 0, 250, 200, 4);
    bg.fill({ color: 0x1a1a2e, alpha: 0.6 });
    this._eventsFeed.addChild(bg);

    // Pre-create event text slots
    for (let i = 0; i < 10; i++) {
      const t = new Text({ text: "", style: EVENT_STYLE });
      t.position.set(8, 6 + i * 19);
      t.alpha = 1 - i * 0.08;
      this._eventsFeed.addChild(t);
      this._eventTexts.push(t);
    }
  }

  private _buildAnnouncement(): void {
    this._announcementText = new Text({ text: "", style: ANNOUNCEMENT_STYLE });
    this._announcementText.anchor.set(0.5, 0.5);
    this._announcementText.position.set(this._screenW / 2, this._screenH / 2 - 40);
    this._announcement.addChild(this._announcementText);

    this._merlinSpeech = new Text({
      text: "",
      style: { ...INFO_STYLE, fontSize: 16, fill: 0x9999ff, fontStyle: "italic" },
    });
    this._merlinSpeech.anchor.set(0.5, 0);
    this._merlinSpeech.position.set(this._screenW / 2, this._screenH / 2 + 20);
    this._announcement.addChild(this._merlinSpeech);
  }

  private _buildControlsHint(): void {
    const y = this._screenH - 20;
    const controlsText = new Text({
      text: "Arrow/WASD: Move | Space: Pass/Shoot | Shift: Tackle/Ability | Tab: Switch | E: Lob | Q: Call | Esc: Pause",
      style: { ...SMALL_STYLE, fontSize: 11 },
    });
    controlsText.anchor.set(0.5, 1);
    controlsText.position.set(this._screenW / 2, y);
    this._controlsHint.addChild(controlsText);
  }

  private _buildPowerUpIndicator(): void {
    this._powerUpIndicator = new Graphics();
    this._powerUpIndicator.position.set(16, this._screenH - 160);
    this.root.addChild(this._powerUpIndicator);

    this._powerUpText = new Text({ text: "", style: { ...SMALL_STYLE, fontSize: 11, fill: 0x00ffcc } });
    this._powerUpText.position.set(30, this._screenH - 158);
    this.root.addChild(this._powerUpText);
  }

  private _buildPauseOverlay(): void {
    this._pauseOverlay.visible = false;
  }

  private _buildRulesOverlay(): void {
    this._rulesOverlay.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Update each frame
  // ---------------------------------------------------------------------------
  update(state: GBMatchState): void {
    this._screenW = window.innerWidth;
    this._screenH = window.innerHeight;

    this._updateScoreboard(state);
    this._updateTimer(state);
    this._updatePlayerInfo(state);
    this._updateMinimap(state);
    this._updateEvents(state);
    this._updateAnnouncement(state);
    this._updatePowerUpIndicator(state);
  }

  private _updateScoreboard(state: GBMatchState): void {
    this._scoreText.text = `${state.scores[0]}  -  ${state.scores[1]}`;
    this._team1Name.text = state.teamDefs[0].shortName;
    this._team2Name.text = state.teamDefs[1].shortName;

    // Reposition
    const cx = this._screenW / 2;
    this._scoreText.position.set(cx, 36);
    this._team1Name.position.set(cx - 60, 28);
    this._team2Name.position.set(cx + 60, 28);
  }

  private _updateTimer(state: GBMatchState): void {
    const remaining = Math.max(0, GB_MATCH.HALF_DURATION - state.matchClock);
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    this._timerText.text = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    if (state.overtime) {
      this._halfText.text = "OVERTIME";
      this._halfText.style.fill = 0xff4444;
    } else {
      this._halfText.text = state.half === 1 ? "1st Half" : "2nd Half";
      this._halfText.style.fill = 0xffd700;
    }

    const cx = this._screenW / 2;
    this._timerText.position.set(cx, 72);
    this._halfText.position.set(cx, 96);
  }

  private _updatePlayerInfo(state: GBMatchState): void {
    const sel = getSelectedPlayer(state);
    if (!sel) return;

    this._playerInfo.position.set(16, this._screenH - 130);

    this._playerNameText.text = sel.name;
    const classNames: Record<string, string> = {
      gatekeeper: "Gatekeeper",
      knight: "Knight",
      rogue: "Rogue",
      mage: "Mage",
    };
    this._playerClassText.text = `${classNames[sel.cls] || sel.cls} | ${sel.action}`;

    // Stamina bar
    this._staminaBar.clear();
    const staminaW = 230;
    const staminaH = 12;
    const staminaPct = sel.stamina / sel.maxStamina;
    this._staminaBar.roundRect(0, 0, staminaW, staminaH, 3);
    this._staminaBar.fill({ color: 0x333333, alpha: 0.8 });
    if (staminaPct > 0) {
      const color = staminaPct > 0.5 ? 0x44bb44 : staminaPct > 0.25 ? 0xbbbb44 : 0xbb4444;
      this._staminaBar.roundRect(0, 0, staminaW * staminaPct, staminaH, 3);
      this._staminaBar.fill({ color, alpha: 0.9 });
    }
    this._staminaBar.roundRect(0, 0, staminaW, staminaH, 3);
    this._staminaBar.stroke({ color: 0x888888, width: 1 });

    // Cooldown bar
    const abilityDef = GB_ABILITIES[sel.cls];
    const cdMax = abilityDef.cooldown;
    const cdRemaining = sel.abilityCooldown;
    const cdPct = cdMax > 0 ? Math.max(0, 1 - cdRemaining / cdMax) : 1;
    const cdReady = cdRemaining <= 0;

    this._cooldownText.text = `${abilityDef.name}: ${cdReady ? "READY [Shift]" : cdRemaining.toFixed(1) + "s"}`;
    this._cooldownText.style.fill = cdReady ? 0x44ff44 : 0xffaa44;

    this._cooldownBar.clear();
    this._cooldownBar.roundRect(0, 0, staminaW, staminaH, 3);
    this._cooldownBar.fill({ color: 0x333333, alpha: 0.8 });
    if (cdPct > 0) {
      this._cooldownBar.roundRect(0, 0, staminaW * cdPct, staminaH, 3);
      this._cooldownBar.fill({ color: cdReady ? 0x4488ff : 0x664422, alpha: 0.9 });
    }
    this._cooldownBar.roundRect(0, 0, staminaW, staminaH, 3);
    this._cooldownBar.stroke({ color: 0x888888, width: 1 });

    // Possession
    this._possessionBars.clear();
    const totalPoss = state.possession[0] + state.possession[1];
    if (totalPoss > 0) {
      const pct0 = state.possession[0] / totalPoss;
      this._possessionBars.roundRect(0, 0, staminaW * pct0, 6, 2);
      this._possessionBars.fill({ color: state.teamDefs[0].primaryColor, alpha: 0.8 });
      this._possessionBars.roundRect(staminaW * pct0, 0, staminaW * (1 - pct0), 6, 2);
      this._possessionBars.fill({ color: state.teamDefs[1].primaryColor, alpha: 0.8 });
    }
  }

  private _updateMinimap(state: GBMatchState): void {
    const mmW = 180;
    const mmH = 110;
    this._minimap.position.set(this._screenW - mmW - 16, this._screenH - mmH - 16);

    this._minimapDots.clear();

    // Map field coords to minimap coords
    const mapX = (wx: number) => (wx / GB_FIELD.LENGTH + 0.5) * mmW;
    const mapZ = (wz: number) => (wz / GB_FIELD.WIDTH + 0.5) * mmH;

    // Draw players
    for (const p of state.players) {
      const color = state.teamDefs[p.teamIndex].primaryColor;
      const px = mapX(p.pos.x);
      const pz = mapZ(p.pos.z);
      const isSelected = p.id === state.selectedPlayerId;

      if (isSelected) {
        this._minimapDots.circle(px, pz, 5);
        this._minimapDots.stroke({ color: 0xffffff, width: 1.5 });
      }

      this._minimapDots.circle(px, pz, isSelected ? 4 : 3);
      this._minimapDots.fill({ color, alpha: p.hasOrb ? 1 : 0.8 });

      // Gatekeeper marker
      if (p.cls === GBPlayerClass.GATEKEEPER) {
        this._minimapDots.rect(px - 2, pz - 2, 4, 4);
        this._minimapDots.stroke({ color: 0xffffff, width: 0.5 });
      }
    }

    // Draw orb
    const ox = mapX(state.orb.pos.x);
    const oz = mapZ(state.orb.pos.z);
    this._minimapDots.circle(ox, oz, 3);
    this._minimapDots.fill({ color: 0xffd700, alpha: 1 });
    // Orb glow
    this._minimapDots.circle(ox, oz, 5);
    this._minimapDots.stroke({ color: 0xffd700, width: 0.5, alpha: 0.5 });

    // Draw power-ups
    for (const pu of state.powerUps) {
      if (!pu.active) continue;
      const puColor = pu.type === GBPowerUpType.SPEED_BOOST ? 0x4488ff
        : pu.type === GBPowerUpType.STRENGTH ? 0xff4444 : 0xaa44ff;
      const puX = mapX(pu.pos.x);
      const puZ = mapZ(pu.pos.z);
      this._minimapDots.star(puX, puZ, 4, 4, 2);
      this._minimapDots.fill({ color: puColor, alpha: 0.9 });
    }
  }

  private _updateEvents(state: GBMatchState): void {
    this._eventsFeed.position.set(this._screenW - 260, 80);
    const recent = state.events.slice(-10).reverse();
    for (let i = 0; i < this._eventTexts.length; i++) {
      if (i < recent.length) {
        const ev = recent[i];
        const timeStr = formatTime(ev.time);
        this._eventTexts[i].text = `[${timeStr}] ${ev.text}`;
        this._eventTexts[i].visible = true;
      } else {
        this._eventTexts[i].visible = false;
      }
    }
  }

  private _updateAnnouncement(state: GBMatchState): void {
    this._announcementText.position.set(this._screenW / 2, this._screenH / 2 - 40);
    this._merlinSpeech.position.set(this._screenW / 2, this._screenH / 2 + 20);

    // Phase-based announcements
    switch (state.phase) {
      case GBMatchPhase.PRE_GAME:
        this._announcementText.text = "GRAIL BALL";
        this._merlinSpeech.text = `${state.teamDefs[0].name} vs ${state.teamDefs[1].name}`;
        this._announcementText.visible = true;
        this._merlinSpeech.visible = true;
        break;
      case GBMatchPhase.KICKOFF:
        this._announcementText.text = state.half === 1 && !state.overtime ? "KICK OFF!" : state.overtime ? "OVERTIME!" : "2ND HALF!";
        this._merlinSpeech.text = "";
        this._announcementText.visible = true;
        this._merlinSpeech.visible = false;
        break;
      case GBMatchPhase.GOAL_SCORED: {
        const scorer = state.players.find(p => p.id === state.lastGoalScorer);
        this._announcementText.text = "GOOOAL!";
        this._merlinSpeech.text = scorer ? `${scorer.name} scores for ${state.teamDefs[state.lastGoalTeam].name}!` : "";
        this._announcementText.visible = true;
        this._merlinSpeech.visible = true;
        break;
      }
      case GBMatchPhase.HALFTIME:
        this._announcementText.text = "HALFTIME";
        this._merlinSpeech.text = `${state.scores[0]} - ${state.scores[1]}`;
        this._announcementText.visible = true;
        this._merlinSpeech.visible = true;
        break;
      case GBMatchPhase.FULL_MATCH:
        this._announcementText.text = "FULL TIME";
        if (state.scores[0] === state.scores[1]) {
          this._merlinSpeech.text = "Tied! Overtime begins...";
        } else {
          const winner = state.scores[0] > state.scores[1] ? 0 : 1;
          this._merlinSpeech.text = `${state.teamDefs[winner].name} wins! ${state.scores[0]} - ${state.scores[1]}`;
        }
        this._announcementText.visible = true;
        this._merlinSpeech.visible = true;
        break;
      case GBMatchPhase.POST_GAME: {
        const winner = state.scores[0] >= state.scores[1] ? 0 : 1;
        this._announcementText.text = `${state.teamDefs[winner].name} WINS!`;
        this._merlinSpeech.text = `Final: ${state.scores[0]} - ${state.scores[1]}`;
        this._announcementText.visible = true;
        this._merlinSpeech.visible = true;
        break;
      }
      default:
        this._announcementText.visible = false;
        // Show merlin speech if active
        if (state.merlinSpeech && state.merlinSpeechTimer > 0) {
          this._merlinSpeech.text = `Merlin: "${state.merlinSpeech}"`;
          this._merlinSpeech.visible = true;
        } else {
          this._merlinSpeech.visible = false;
        }
        break;
    }
  }

  private _updatePowerUpIndicator(state: GBMatchState): void {
    const sel = getSelectedPlayer(state);
    if (!sel || !sel.activePowerUp) {
      this._powerUpIndicator.clear();
      this._powerUpText.text = "";
      return;
    }

    const color = sel.activePowerUp === GBPowerUpType.SPEED_BOOST ? 0x4488ff
      : sel.activePowerUp === GBPowerUpType.STRENGTH ? 0xff4444 : 0xaa44ff;
    const name = sel.activePowerUp === GBPowerUpType.SPEED_BOOST ? "Speed Boost"
      : sel.activePowerUp === GBPowerUpType.STRENGTH ? "Strength" : "Magic Surge";

    this._powerUpIndicator.clear();
    this._powerUpIndicator.circle(8, 8, 8);
    this._powerUpIndicator.fill({ color, alpha: 0.9 });
    this._powerUpText.text = `${name} (${sel.powerUpTimer.toFixed(1)}s)`;
    this._powerUpText.style.fill = color;
  }

  // ---------------------------------------------------------------------------
  // Pause menu (DOM-based to overlay Three.js canvas)
  // ---------------------------------------------------------------------------

  private _pauseDiv: HTMLDivElement | null = null;

  showPause(onResume: () => void, onRules: () => void, onExit: () => void, onControls?: () => void): void {
    if (this._pauseDiv) return;

    this._pauseDiv = document.createElement("div");
    this._pauseDiv.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.75);z-index:100;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:Georgia,serif;color:#ffd700;
    `;
    this._pauseDiv.innerHTML = `
      <h1 style="font-size:48px;margin-bottom:40px;text-shadow:2px 2px 4px #000;">PAUSED</h1>
      <div id="gb-pause-resume" style="font-size:24px;cursor:pointer;margin:12px 0;padding:8px 32px;border:2px solid #daa520;border-radius:8px;transition:all 0.2s;">Resume</div>
      <div id="gb-pause-controls" style="font-size:24px;cursor:pointer;margin:12px 0;padding:8px 32px;border:2px solid #daa520;border-radius:8px;transition:all 0.2s;">Controls</div>
      <div id="gb-pause-rules" style="font-size:24px;cursor:pointer;margin:12px 0;padding:8px 32px;border:2px solid #daa520;border-radius:8px;transition:all 0.2s;">Rules</div>
      <div id="gb-pause-exit" style="font-size:24px;cursor:pointer;margin:12px 0;padding:8px 32px;border:2px solid #daa520;border-radius:8px;transition:all 0.2s;">Exit to Menu</div>
    `;

    const addHover = (el: HTMLElement) => {
      el.addEventListener("mouseenter", () => { el.style.background = "rgba(218,165,32,0.3)"; });
      el.addEventListener("mouseleave", () => { el.style.background = "transparent"; });
    };

    const resume = this._pauseDiv.querySelector("#gb-pause-resume") as HTMLElement;
    const controls = this._pauseDiv.querySelector("#gb-pause-controls") as HTMLElement;
    const rules = this._pauseDiv.querySelector("#gb-pause-rules") as HTMLElement;
    const exit = this._pauseDiv.querySelector("#gb-pause-exit") as HTMLElement;

    addHover(resume); addHover(controls); addHover(rules); addHover(exit);

    resume.onclick = () => { this.hidePause(); onResume(); };
    controls.onclick = () => { this.hidePause(); if (onControls) onControls(); };
    rules.onclick = () => { this.hidePause(); onRules(); };
    exit.onclick = () => { this.hidePause(); onExit(); };

    document.body.appendChild(this._pauseDiv);
  }

  hidePause(): void {
    if (this._pauseDiv) {
      this._pauseDiv.remove();
      this._pauseDiv = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Rules overlay (DOM-based)
  // ---------------------------------------------------------------------------

  private _rulesDiv: HTMLDivElement | null = null;

  showRules(onClose: () => void): void {
    if (this._rulesDiv) return;

    this._rulesDiv = document.createElement("div");
    this._rulesDiv.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.9);z-index:110;
      display:flex;flex-direction:column;align-items:center;
      font-family:Georgia,serif;color:#ddd;overflow-y:auto;
    `;

    const content = document.createElement("div");
    content.style.cssText = `
      max-width:700px;padding:40px;margin:20px;
      background:rgba(30,20,10,0.95);border:2px solid #daa520;border-radius:12px;
    `;
    content.innerHTML = `
      <pre style="white-space:pre-wrap;font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#ddd;">${GB_RULES_TEXT}</pre>
      <div id="gb-rules-close" style="text-align:center;margin-top:20px;font-size:20px;color:#ffd700;cursor:pointer;border:2px solid #daa520;padding:8px 24px;border-radius:8px;">
        Close [Esc]
      </div>
    `;

    this._rulesDiv.appendChild(content);

    const closeBtn = content.querySelector("#gb-rules-close") as HTMLElement;
    closeBtn.onclick = () => { this.hideRules(); onClose(); };

    document.body.appendChild(this._rulesDiv);
  }

  hideRules(): void {
    if (this._rulesDiv) {
      this._rulesDiv.remove();
      this._rulesDiv = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Controls overlay (DOM-based)
  // ---------------------------------------------------------------------------

  private _controlsDiv: HTMLDivElement | null = null;

  showControls(onClose: () => void): void {
    if (this._controlsDiv) return;

    this._controlsDiv = document.createElement("div");
    this._controlsDiv.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.9);z-index:110;
      display:flex;flex-direction:column;align-items:center;
      font-family:Georgia,serif;color:#ddd;overflow-y:auto;
    `;

    const content = document.createElement("div");
    content.style.cssText = `
      max-width:700px;padding:40px;margin:20px;
      background:rgba(30,20,10,0.95);border:2px solid #daa520;border-radius:12px;
    `;
    const controlsText = `CONTROLS

Arrow Keys / WASD  —  Move player
Space (tap)        —  Pass orb to teammate
Space (hold)       —  Charge shot, release to shoot
Shift              —  Tackle (no orb) / Use Ability (with orb)
Tab                —  Switch selected player
E                  —  Lob pass
Q                  —  Call for pass
Escape             —  Pause`;

    content.innerHTML = `
      <pre style="white-space:pre-wrap;font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#ddd;">${controlsText}</pre>
      <div id="gb-controls-close" style="text-align:center;margin-top:20px;font-size:20px;color:#ffd700;cursor:pointer;border:2px solid #daa520;padding:8px 24px;border-radius:8px;">
        Close [Esc]
      </div>
    `;

    this._controlsDiv.appendChild(content);

    const closeBtn = content.querySelector("#gb-controls-close") as HTMLElement;
    closeBtn.onclick = () => { this.hideControls(); onClose(); };

    document.body.appendChild(this._controlsDiv);
  }

  hideControls(): void {
    if (this._controlsDiv) {
      this._controlsDiv.remove();
      this._controlsDiv = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------
  destroy(): void {
    this.root.removeChildren();
    this.hidePause();
    this.hideRules();
    this.hideControls();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
