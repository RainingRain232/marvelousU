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
  isFatigued, isCriticallyFatigued,
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
  wordWrapWidth: 220,
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
// Drawing helpers
// ---------------------------------------------------------------------------

/** Draw small diamond shapes at specified positions */
function drawDiamond(g: Graphics, cx: number, cy: number, size: number, color: number, alpha = 1): void {
  g.moveTo(cx, cy - size);
  g.lineTo(cx + size, cy);
  g.lineTo(cx, cy + size);
  g.lineTo(cx - size, cy);
  g.closePath();
  g.fill({ color, alpha });
}

/** Draw corner flourish (L-shaped ornament) */
function drawCornerFlourish(g: Graphics, x: number, y: number, size: number, flipX: boolean, flipY: boolean, color: number): void {
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  // Main L stroke
  g.moveTo(x, y + sy * size);
  g.lineTo(x, y);
  g.lineTo(x + sx * size, y);
  g.stroke({ color, width: 2, alpha: 0.8 });
  // Small curl dot
  g.circle(x + sx * 2, y + sy * 2, 1.5);
  g.fill({ color, alpha: 0.7 });
  // Tiny diamond accent at corner tip
  drawDiamond(g, x + sx * (size - 2), y, 2, color, 0.5);
  drawDiamond(g, x, y + sy * (size - 2), 2, color, 0.5);
}

/** Draw a decorative horizontal filigree line */
function drawFiligree(g: Graphics, x: number, y: number, width: number, color: number): void {
  const half = width / 2;
  g.moveTo(x - half, y);
  g.lineTo(x + half, y);
  g.stroke({ color, width: 1, alpha: 0.6 });
  // Center diamond
  drawDiamond(g, x, y, 3, color, 0.8);
  // End dots
  g.circle(x - half, y, 1.5);
  g.fill({ color, alpha: 0.5 });
  g.circle(x + half, y, 1.5);
  g.fill({ color, alpha: 0.5 });
}

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

  // Replay overlay
  private _replayOverlay = new Container();
  private _replayText!: Text;
  private _replayProgressBar!: Graphics;

  // Penalty overlay
  private _penaltyOverlay = new Container();
  private _penaltyScoreText!: Text;
  private _penaltyAimIndicator!: Graphics;
  private _penaltyHistoryText!: Text;

  // Fatigue indicator
  private _fatigueText!: Text;

  // Injury time indicator
  private _injuryTimeText!: Text;

  // Formation display
  private _formationText!: Text;

  // Event icon graphics
  private _eventIcons: Graphics[] = [];

  // Announcement background
  private _announcementBg!: Graphics;

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

    this._buildReplayOverlay();
    this._buildPenaltyOverlay();
    this._buildFatigueIndicator();
    this._buildInjuryTimeIndicator();
    this._buildFormationDisplay();

    this.root.addChild(this._scoreBoard);
    this.root.addChild(this._timerDisplay);
    this.root.addChild(this._playerInfo);
    this.root.addChild(this._minimap);
    this.root.addChild(this._eventsFeed);
    this.root.addChild(this._announcement);
    this.root.addChild(this._controlsHint);
    this.root.addChild(this._pauseOverlay);
    this.root.addChild(this._rulesOverlay);
    this.root.addChild(this._replayOverlay);
    this.root.addChild(this._penaltyOverlay);
  }

  // ---------------------------------------------------------------------------
  // Build UI elements
  // ---------------------------------------------------------------------------

  private _buildScoreboard(): void {
    const cx = this._screenW / 2;
    const panelW = 340;
    const panelH = 66;
    const px = cx - panelW / 2;
    const py = 8;

    // Outer dark shadow border
    const shadow = new Graphics();
    shadow.roundRect(px - 4, py - 4, panelW + 8, panelH + 8, 12);
    shadow.fill({ color: 0x000000, alpha: 0.5 });
    this._scoreBoard.addChild(shadow);

    // Main background - layered dark fills for depth
    const bg = new Graphics();
    bg.roundRect(px - 2, py - 2, panelW + 4, panelH + 4, 10);
    bg.fill({ color: 0x0d0d1a, alpha: 0.95 });
    bg.roundRect(px, py, panelW, panelH, 8);
    bg.fill({ color: 0x1a1a2e, alpha: 0.9 });
    // Inner subtle gradient layer
    bg.roundRect(px + 3, py + 3, panelW - 6, panelH - 6, 6);
    bg.fill({ color: 0x22223a, alpha: 0.5 });
    this._scoreBoard.addChild(bg);

    // Gold border (middle layer)
    const border = new Graphics();
    border.roundRect(px - 2, py - 2, panelW + 4, panelH + 4, 10);
    border.stroke({ color: 0xdaa520, width: 2.5 });
    // Inner subtle border
    border.roundRect(px + 2, py + 2, panelW - 4, panelH - 4, 6);
    border.stroke({ color: 0xdaa520, width: 0.5, alpha: 0.3 });
    this._scoreBoard.addChild(border);

    // Inner glow effect
    const glow = new Graphics();
    glow.roundRect(px + 4, py + 4, panelW - 8, panelH - 8, 5);
    glow.stroke({ color: 0xffd700, width: 1, alpha: 0.1 });
    this._scoreBoard.addChild(glow);

    // Corner flourish decorations
    const flourish = new Graphics();
    drawCornerFlourish(flourish, px + 6, py + 6, 14, false, false, 0xdaa520);
    drawCornerFlourish(flourish, px + panelW - 6, py + 6, 14, true, false, 0xdaa520);
    drawCornerFlourish(flourish, px + 6, py + panelH - 6, 14, false, true, 0xdaa520);
    drawCornerFlourish(flourish, px + panelW - 6, py + panelH - 6, 14, true, true, 0xdaa520);
    this._scoreBoard.addChild(flourish);

    // Ornamental top triangle with grail/cup shape
    const ornament = new Graphics();
    // Larger triangle
    ornament.moveTo(cx - 35, py - 2);
    ornament.lineTo(cx, py - 14);
    ornament.lineTo(cx + 35, py - 2);
    ornament.fill({ color: 0xdaa520, alpha: 0.85 });
    ornament.stroke({ color: 0xffd700, width: 1, alpha: 0.6 });
    // Small grail cup shape in triangle
    ornament.moveTo(cx - 5, py - 5);
    ornament.lineTo(cx - 3, py - 10);
    ornament.lineTo(cx + 3, py - 10);
    ornament.lineTo(cx + 5, py - 5);
    ornament.closePath();
    ornament.fill({ color: 0xffd700, alpha: 0.9 });
    // Cup base
    ornament.rect(cx - 2, py - 5, 4, 2);
    ornament.fill({ color: 0xffd700, alpha: 0.9 });
    // Tiny gem on top
    drawDiamond(ornament, cx, py - 12, 2, 0xffffff, 0.8);
    this._scoreBoard.addChild(ornament);

    // Divider line between teams
    const divider = new Graphics();
    divider.moveTo(cx, py + 14);
    divider.lineTo(cx, py + panelH - 14);
    divider.stroke({ color: 0xdaa520, width: 0.5, alpha: 0.3 });
    this._scoreBoard.addChild(divider);

    this._team1Name = new Text({ text: "HOME", style: { ...INFO_STYLE, fontSize: 14, fill: 0xdddddd } });
    this._team1Name.anchor.set(1, 0.5);
    this._team1Name.position.set(cx - 60, 28);
    this._scoreBoard.addChild(this._team1Name);

    // Gold accent underline for team 1
    const underline1 = new Graphics();
    underline1.moveTo(cx - 120, 37);
    underline1.lineTo(cx - 55, 37);
    underline1.stroke({ color: 0xdaa520, width: 1, alpha: 0.4 });
    this._scoreBoard.addChild(underline1);

    this._scoreText = new Text({ text: "0 - 0", style: SCORE_STYLE });
    this._scoreText.anchor.set(0.5, 0.5);
    this._scoreText.position.set(cx, 36);
    this._scoreBoard.addChild(this._scoreText);

    this._team2Name = new Text({ text: "AWAY", style: { ...INFO_STYLE, fontSize: 14, fill: 0xdddddd } });
    this._team2Name.anchor.set(0, 0.5);
    this._team2Name.position.set(cx + 60, 28);
    this._scoreBoard.addChild(this._team2Name);

    // Gold accent underline for team 2
    const underline2 = new Graphics();
    underline2.moveTo(cx + 55, 37);
    underline2.lineTo(cx + 120, 37);
    underline2.stroke({ color: 0xdaa520, width: 1, alpha: 0.4 });
    this._scoreBoard.addChild(underline2);
  }

  private _buildTimer(): void {
    const cx = this._screenW / 2;
    const panelW = 130;
    const panelH = 50;

    // Timer panel background
    const bg = new Graphics();
    bg.roundRect(cx - panelW / 2, 70, panelW, panelH, 6);
    bg.fill({ color: 0x0d0d1a, alpha: 0.8 });
    bg.stroke({ color: 0xdaa520, width: 1.5 });
    // Inner border
    bg.roundRect(cx - panelW / 2 + 2, 72, panelW - 4, panelH - 4, 4);
    bg.stroke({ color: 0xdaa520, width: 0.5, alpha: 0.2 });
    // Diamond accents at sides
    drawDiamond(bg, cx - panelW / 2 - 2, 95, 3, 0xdaa520, 0.7);
    drawDiamond(bg, cx + panelW / 2 + 2, 95, 3, 0xdaa520, 0.7);
    // Top center diamond
    drawDiamond(bg, cx, 70, 3, 0xdaa520, 0.6);
    this._timerDisplay.addChild(bg);

    this._timerText = new Text({ text: "5:00", style: TIMER_STYLE });
    this._timerText.anchor.set(0.5, 0);
    this._timerText.position.set(cx, 74);
    this._timerDisplay.addChild(this._timerText);

    // Half text with decorative banner shape
    const halfBannerW = 90;
    const halfBannerH = 18;
    const halfBannerY = 98;
    const banner = new Graphics();
    // Banner shape - rectangle with notched ends
    banner.moveTo(cx - halfBannerW / 2 - 6, halfBannerY);
    banner.lineTo(cx - halfBannerW / 2, halfBannerY + halfBannerH / 2);
    banner.lineTo(cx - halfBannerW / 2 - 6, halfBannerY + halfBannerH);
    banner.lineTo(cx + halfBannerW / 2 + 6, halfBannerY + halfBannerH);
    banner.lineTo(cx + halfBannerW / 2, halfBannerY + halfBannerH / 2);
    banner.lineTo(cx + halfBannerW / 2 + 6, halfBannerY);
    banner.closePath();
    banner.fill({ color: 0x1a1a2e, alpha: 0.7 });
    banner.stroke({ color: 0xdaa520, width: 0.5, alpha: 0.4 });
    this._timerDisplay.addChild(banner);

    this._halfText = new Text({ text: "1st Half", style: { ...SMALL_STYLE, fill: 0xffd700, fontSize: 11 } });
    this._halfText.anchor.set(0.5, 0);
    this._halfText.position.set(cx, 100);
    this._timerDisplay.addChild(this._halfText);
  }

  private _buildPlayerInfo(): void {
    const x = 16;
    const y = this._screenH - 140;
    const panelW = 270;
    const panelH = 130;

    // Outer shadow
    const shadow = new Graphics();
    shadow.roundRect(0, 0, panelW + 4, panelH + 4, 8);
    shadow.fill({ color: 0x000000, alpha: 0.4 });
    shadow.position.set(-2, -2);
    this._playerInfo.addChild(shadow);

    const bg = new Graphics();
    // Main background
    bg.roundRect(0, 0, panelW, panelH, 6);
    bg.fill({ color: 0x0d0d1a, alpha: 0.9 });
    bg.roundRect(2, 2, panelW - 4, panelH - 4, 5);
    bg.fill({ color: 0x1a1a2e, alpha: 0.7 });
    // Gold border
    bg.roundRect(0, 0, panelW, panelH, 6);
    bg.stroke({ color: 0xdaa520, width: 1.5 });
    // Inner border
    bg.roundRect(3, 3, panelW - 6, panelH - 6, 4);
    bg.stroke({ color: 0xdaa520, width: 0.5, alpha: 0.2 });
    this._playerInfo.addChild(bg);
    this._playerInfo.position.set(x, y);

    // Corner flourishes
    const flourish = new Graphics();
    drawCornerFlourish(flourish, 6, 6, 10, false, false, 0xdaa520);
    drawCornerFlourish(flourish, panelW - 6, 6, 10, true, false, 0xdaa520);
    drawCornerFlourish(flourish, 6, panelH - 6, 10, false, true, 0xdaa520);
    drawCornerFlourish(flourish, panelW - 6, panelH - 6, 10, true, true, 0xdaa520);
    this._playerInfo.addChild(flourish);

    // Title bar accent at top
    const titleBar = new Graphics();
    titleBar.roundRect(8, 2, panelW - 16, 14, 3);
    titleBar.fill({ color: 0xdaa520, alpha: 0.15 });
    this._playerInfo.addChild(titleBar);

    const titleLabel = new Text({ text: "PLAYER", style: { ...SMALL_STYLE, fontSize: 8, fill: 0xdaa520 } });
    titleLabel.anchor.set(0.5, 0.5);
    titleLabel.position.set(panelW / 2, 9);
    this._playerInfo.addChild(titleLabel);

    // Class icon badge (small shield shape) - positioned near class text
    const classBadge = new Graphics();
    classBadge.moveTo(10, 40);
    classBadge.lineTo(18, 40);
    classBadge.lineTo(18, 46);
    classBadge.lineTo(14, 50);
    classBadge.lineTo(10, 46);
    classBadge.closePath();
    classBadge.fill({ color: 0xdaa520, alpha: 0.6 });
    classBadge.stroke({ color: 0xffd700, width: 0.5, alpha: 0.4 });
    this._playerInfo.addChild(classBadge);

    this._playerNameText = new Text({ text: "Player Name", style: { ...INFO_STYLE, fontSize: 16, fill: 0xffd700 } });
    this._playerNameText.position.set(10, 16);
    this._playerInfo.addChild(this._playerNameText);

    this._playerClassText = new Text({ text: "Class", style: SMALL_STYLE });
    this._playerClassText.position.set(22, 38);
    this._playerInfo.addChild(this._playerClassText);

    // Stamina bar
    this._staminaBar = new Graphics();
    this._staminaBar.position.set(10, 62);
    this._playerInfo.addChild(this._staminaBar);

    const staminaLabel = new Text({ text: "Stamina", style: { ...SMALL_STYLE, fontSize: 10 } });
    staminaLabel.position.set(10, 50);
    this._playerInfo.addChild(staminaLabel);

    // Cooldown bar
    this._cooldownBar = new Graphics();
    this._cooldownBar.position.set(10, 92);
    this._playerInfo.addChild(this._cooldownBar);

    this._cooldownText = new Text({ text: "Ability: Ready", style: { ...SMALL_STYLE, fontSize: 11 } });
    this._cooldownText.position.set(10, 80);
    this._playerInfo.addChild(this._cooldownText);

    // Possession bars
    this._possessionBars = new Graphics();
    this._possessionBars.position.set(10, 112);
    this._playerInfo.addChild(this._possessionBars);
  }

  private _buildMinimap(): void {
    const mmW = 190;
    const mmH = 120;
    const x = this._screenW - mmW - 16;
    const y = this._screenH - mmH - 16;

    this._minimap.position.set(x, y);

    this._minimapBg = new Graphics();
    // Outer border shadow
    this._minimapBg.roundRect(-3, -3, mmW + 6, mmH + 6, 6);
    this._minimapBg.fill({ color: 0x000000, alpha: 0.4 });
    // Main fill
    this._minimapBg.roundRect(0, 0, mmW, mmH, 4);
    this._minimapBg.fill({ color: 0x2d5016, alpha: 0.88 });
    // Inner shadow / vignette edges (subtle darker borders inside)
    this._minimapBg.roundRect(1, 1, mmW - 2, mmH - 2, 3);
    this._minimapBg.stroke({ color: 0x1a3008, width: 2, alpha: 0.5 });
    // Double-line gold border
    this._minimapBg.roundRect(-1, -1, mmW + 2, mmH + 2, 5);
    this._minimapBg.stroke({ color: 0xdaa520, width: 2 });
    this._minimapBg.roundRect(2, 2, mmW - 4, mmH - 4, 3);
    this._minimapBg.stroke({ color: 0xdaa520, width: 0.5, alpha: 0.4 });

    // Corner knots (small decorative knot-like marks)
    const knot = (kx: number, ky: number) => {
      this._minimapBg.circle(kx, ky, 3);
      this._minimapBg.fill({ color: 0xdaa520, alpha: 0.6 });
      this._minimapBg.circle(kx, ky, 3);
      this._minimapBg.stroke({ color: 0xffd700, width: 0.5, alpha: 0.4 });
    };
    knot(0, 0); knot(mmW, 0); knot(0, mmH); knot(mmW, mmH);

    // Center line
    this._minimapBg.moveTo(mmW / 2, 4);
    this._minimapBg.lineTo(mmW / 2, mmH - 4);
    this._minimapBg.stroke({ color: 0xffffff, width: 0.5, alpha: 0.4 });
    // Center circle
    this._minimapBg.circle(mmW / 2, mmH / 2, 14);
    this._minimapBg.stroke({ color: 0xffffff, width: 0.5, alpha: 0.4 });
    // Center dot
    this._minimapBg.circle(mmW / 2, mmH / 2, 1.5);
    this._minimapBg.fill({ color: 0xffffff, alpha: 0.3 });

    // Goal area markings (left)
    this._minimapBg.rect(0, mmH / 2 - 16, 12, 32);
    this._minimapBg.stroke({ color: 0xffffff, width: 0.5, alpha: 0.35 });
    // Goal area markings (right)
    this._minimapBg.rect(mmW - 12, mmH / 2 - 16, 12, 32);
    this._minimapBg.stroke({ color: 0xffffff, width: 0.5, alpha: 0.35 });
    // Goal lines
    this._minimapBg.rect(0, mmH / 2 - 8, 3, 16);
    this._minimapBg.fill({ color: 0xffffff, alpha: 0.2 });
    this._minimapBg.rect(mmW - 3, mmH / 2 - 8, 3, 16);
    this._minimapBg.fill({ color: 0xffffff, alpha: 0.2 });

    this._minimap.addChild(this._minimapBg);

    this._minimapDots = new Graphics();
    this._minimap.addChild(this._minimapDots);

    // Decorative banner for label
    const labelBanner = new Graphics();
    const bannerW = 60;
    const bannerH = 14;
    const bx = mmW / 2 - bannerW / 2;
    const by = -16;
    labelBanner.moveTo(bx - 4, by);
    labelBanner.lineTo(bx - 4 + bannerW + 8, by);
    labelBanner.lineTo(bx - 4 + bannerW + 4, by + bannerH);
    labelBanner.lineTo(bx, by + bannerH);
    labelBanner.closePath();
    labelBanner.fill({ color: 0x1a1a2e, alpha: 0.8 });
    labelBanner.stroke({ color: 0xdaa520, width: 0.5, alpha: 0.5 });
    this._minimap.addChild(labelBanner);

    const label = new Text({ text: "MINIMAP", style: { ...SMALL_STYLE, fontSize: 9, fill: 0xdaa520 } });
    label.anchor.set(0.5, 0.5);
    label.position.set(mmW / 2, -9);
    this._minimap.addChild(label);
  }

  private _buildEventsFeed(): void {
    const feedW = 260;
    const feedH = 220;
    const x = this._screenW - feedW - 6;
    const y = 80;
    this._eventsFeed.position.set(x, y);

    // Background panel
    const bg = new Graphics();
    bg.roundRect(0, 0, feedW, feedH, 6);
    bg.fill({ color: 0x0d0d1a, alpha: 0.7 });
    bg.stroke({ color: 0xdaa520, width: 1, alpha: 0.5 });
    bg.roundRect(2, 2, feedW - 4, feedH - 4, 5);
    bg.stroke({ color: 0xdaa520, width: 0.3, alpha: 0.2 });
    this._eventsFeed.addChild(bg);

    // Decorative header
    const headerBg = new Graphics();
    headerBg.roundRect(2, 2, feedW - 4, 18, 4);
    headerBg.fill({ color: 0xdaa520, alpha: 0.15 });
    this._eventsFeed.addChild(headerBg);

    const headerTitle = new Text({ text: "MATCH EVENTS", style: { ...SMALL_STYLE, fontSize: 9, fill: 0xdaa520 } });
    headerTitle.anchor.set(0.5, 0.5);
    headerTitle.position.set(feedW / 2, 11);
    this._eventsFeed.addChild(headerTitle);

    // Filigree line below header
    const filigree = new Graphics();
    drawFiligree(filigree, feedW / 2, 22, feedW - 30, 0xdaa520);
    this._eventsFeed.addChild(filigree);

    // Alternating row tinting
    const rowTint = new Graphics();
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        rowTint.rect(4, 26 + i * 19, feedW - 8, 19);
        rowTint.fill({ color: 0xffffff, alpha: 0.02 });
      }
    }
    this._eventsFeed.addChild(rowTint);

    // Pre-create event icon slots and text slots
    for (let i = 0; i < 10; i++) {
      const icon = new Graphics();
      icon.position.set(8, 30 + i * 19);
      this._eventsFeed.addChild(icon);
      this._eventIcons.push(icon);

      const t = new Text({ text: "", style: EVENT_STYLE });
      t.position.set(22, 26 + i * 19);
      t.alpha = 1 - i * 0.07;
      this._eventsFeed.addChild(t);
      this._eventTexts.push(t);
    }
  }

  private _buildAnnouncement(): void {
    // Dark banner background behind announcement
    this._announcementBg = new Graphics();
    this._announcement.addChild(this._announcementBg);

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
    const y = this._screenH - 14;
    const cx = this._screenW / 2;
    const panelW = 680;

    // Subtle background panel
    const bg = new Graphics();
    bg.roundRect(cx - panelW / 2, y - 18, panelW, 22, 4);
    bg.fill({ color: 0x0d0d1a, alpha: 0.5 });
    // Decorative top border
    bg.moveTo(cx - panelW / 2 + 10, y - 18);
    bg.lineTo(cx + panelW / 2 - 10, y - 18);
    bg.stroke({ color: 0xdaa520, width: 0.5, alpha: 0.4 });
    // Small diamonds at panel edges
    drawDiamond(bg, cx - panelW / 2, y - 7, 2, 0xdaa520, 0.3);
    drawDiamond(bg, cx + panelW / 2, y - 7, 2, 0xdaa520, 0.3);
    this._controlsHint.addChild(bg);

    const controlsText = new Text({
      text: "Arrow/WASD: Move | Space: Pass/Shoot | Shift: Tackle/Ability | Tab: Switch | E: Lob | Q: Call | Esc: Pause",
      style: { ...SMALL_STYLE, fontSize: 11 },
    });
    controlsText.anchor.set(0.5, 1);
    controlsText.position.set(cx, y);
    this._controlsHint.addChild(controlsText);
  }

  private _buildPowerUpIndicator(): void {
    this._powerUpIndicator = new Graphics();
    this._powerUpIndicator.position.set(16, this._screenH - 170);
    this.root.addChild(this._powerUpIndicator);

    this._powerUpText = new Text({ text: "", style: { ...SMALL_STYLE, fontSize: 11, fill: 0x00ffcc } });
    this._powerUpText.position.set(38, this._screenH - 168);
    this.root.addChild(this._powerUpText);
  }

  private _buildReplayOverlay(): void {
    this._replayOverlay.visible = false;

    // Ornate background panel
    const bg = new Graphics();
    bg.rect(0, -2, this._screenW, 54);
    bg.fill({ color: 0x000000, alpha: 0.8 });
    bg.rect(0, 0, this._screenW, 50);
    bg.fill({ color: 0x0d0d1a, alpha: 0.6 });
    // Top gold accent line
    bg.moveTo(0, 0);
    bg.lineTo(this._screenW, 0);
    bg.stroke({ color: 0xdaa520, width: 2 });
    // Bottom gold accent
    bg.moveTo(0, 50);
    bg.lineTo(this._screenW, 50);
    bg.stroke({ color: 0xdaa520, width: 1, alpha: 0.5 });
    // Diamond accents
    drawDiamond(bg, 10, 25, 3, 0xdaa520, 0.6);
    drawDiamond(bg, this._screenW - 10, 25, 3, 0xdaa520, 0.6);
    this._replayOverlay.addChild(bg);

    this._replayText = new Text({
      text: "REPLAY",
      style: { ...ANNOUNCEMENT_STYLE, fontSize: 28, fill: 0xff4444 },
    });
    this._replayText.position.set(20, 10);
    this._replayOverlay.addChild(this._replayText);

    this._replayProgressBar = new Graphics();
    this._replayProgressBar.position.set(200, 18);
    this._replayOverlay.addChild(this._replayProgressBar);

    const hint = new Text({
      text: "Space/R: Skip | C: Change Angle",
      style: { ...SMALL_STYLE, fontSize: 12, fill: 0xcccccc },
    });
    hint.position.set(this._screenW - 250, 18);
    this._replayOverlay.addChild(hint);

    this._replayOverlay.position.set(0, this._screenH - 50);
  }

  private _buildPenaltyOverlay(): void {
    this._penaltyOverlay.visible = false;

    // Decorative frame around penalty display
    const frame = new Graphics();
    const frameW = 320;
    const frameCx = this._screenW / 2;
    frame.roundRect(frameCx - frameW / 2, 100, frameW, 50, 8);
    frame.fill({ color: 0x0d0d1a, alpha: 0.85 });
    frame.roundRect(frameCx - frameW / 2, 100, frameW, 50, 8);
    frame.stroke({ color: 0xdaa520, width: 2 });
    frame.roundRect(frameCx - frameW / 2 + 3, 103, frameW - 6, 44, 6);
    frame.stroke({ color: 0xdaa520, width: 0.5, alpha: 0.25 });
    // Corner diamonds
    drawDiamond(frame, frameCx - frameW / 2 + 8, 108, 3, 0xdaa520, 0.5);
    drawDiamond(frame, frameCx + frameW / 2 - 8, 108, 3, 0xdaa520, 0.5);
    drawDiamond(frame, frameCx - frameW / 2 + 8, 142, 3, 0xdaa520, 0.5);
    drawDiamond(frame, frameCx + frameW / 2 - 8, 142, 3, 0xdaa520, 0.5);
    this._penaltyOverlay.addChild(frame);

    this._penaltyScoreText = new Text({
      text: "Penalties: 0 - 0",
      style: { ...TIMER_STYLE, fontSize: 24 },
    });
    this._penaltyScoreText.anchor.set(0.5, 0);
    this._penaltyScoreText.position.set(this._screenW / 2, 110);
    this._penaltyOverlay.addChild(this._penaltyScoreText);

    this._penaltyAimIndicator = new Graphics();
    this._penaltyAimIndicator.position.set(this._screenW / 2, this._screenH / 2 + 80);
    this._penaltyOverlay.addChild(this._penaltyAimIndicator);

    this._penaltyHistoryText = new Text({
      text: "",
      style: { ...SMALL_STYLE, fontSize: 12 },
    });
    this._penaltyHistoryText.position.set(this._screenW / 2 - 100, 140);
    this._penaltyOverlay.addChild(this._penaltyHistoryText);
  }

  private _buildFatigueIndicator(): void {
    this._fatigueText = new Text({
      text: "",
      style: { ...SMALL_STYLE, fontSize: 11, fill: 0xff6666 },
    });
    this._fatigueText.position.set(10, this._screenH - 140);
    this.root.addChild(this._fatigueText);
  }

  private _buildInjuryTimeIndicator(): void {
    this._injuryTimeText = new Text({
      text: "",
      style: { ...TIMER_STYLE, fontSize: 16, fill: 0xff4444 },
    });
    this._injuryTimeText.anchor.set(0.5, 0);
    this._injuryTimeText.position.set(this._screenW / 2, 112);
    this.root.addChild(this._injuryTimeText);
  }

  private _buildFormationDisplay(): void {
    this._formationText = new Text({
      text: "",
      style: { ...SMALL_STYLE, fontSize: 10, fill: 0x999999 },
    });
    this._formationText.position.set(this._screenW - 260, 285);
    this.root.addChild(this._formationText);
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
    this._updateReplayOverlay(state);
    this._updatePenaltyOverlay(state);
    this._updateFatigueIndicator(state);
    this._updateInjuryTimeIndicator(state);
    this._updateFormationDisplay(state);
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
    const totalDuration = GB_MATCH.HALF_DURATION + (state.injuryTimeAnnounced ? state.injuryTime : 0);
    const remaining = Math.max(0, totalDuration - state.matchClock);
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    this._timerText.text = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    if (state.phase === GBMatchPhase.PENALTY_SHOOTOUT) {
      this._halfText.text = "PENALTIES";
      this._halfText.style.fill = 0xff4444;
    } else if (state.overtime) {
      this._halfText.text = "OVERTIME";
      this._halfText.style.fill = 0xff4444;
    } else {
      this._halfText.text = state.half === 1 ? "1st Half" : "2nd Half";
      this._halfText.style.fill = 0xffd700;
    }

    const cx = this._screenW / 2;
    this._timerText.position.set(cx, 74);
    this._halfText.position.set(cx, 100);
  }

  private _updatePlayerInfo(state: GBMatchState): void {
    const sel = getSelectedPlayer(state);
    if (!sel) return;

    this._playerInfo.position.set(16, this._screenH - 140);

    this._playerNameText.text = sel.name;
    const classNames: Record<string, string> = {
      gatekeeper: "Gatekeeper",
      knight: "Knight",
      rogue: "Rogue",
      mage: "Mage",
    };
    this._playerClassText.text = `${classNames[sel.cls] || sel.cls} | ${sel.action}`;

    // Stamina bar with 3D beveled appearance
    this._staminaBar.clear();
    const staminaW = 240;
    const staminaH = 14;
    const staminaPct = sel.stamina / sel.maxStamina;
    // Bar background
    this._staminaBar.roundRect(0, 0, staminaW, staminaH, 3);
    this._staminaBar.fill({ color: 0x222222, alpha: 0.9 });
    // Bottom shadow bevel
    this._staminaBar.roundRect(0, staminaH - 3, staminaW, 3, 1);
    this._staminaBar.fill({ color: 0x111111, alpha: 0.5 });
    if (staminaPct > 0) {
      const color = staminaPct > 0.5 ? 0x44bb44 : staminaPct > 0.25 ? 0xbbbb44 : 0xbb4444;
      const highlightColor = staminaPct > 0.5 ? 0x66dd66 : staminaPct > 0.25 ? 0xdddd66 : 0xdd6666;
      // Main fill
      this._staminaBar.roundRect(0, 0, staminaW * staminaPct, staminaH, 3);
      this._staminaBar.fill({ color, alpha: 0.9 });
      // Top highlight bevel
      this._staminaBar.roundRect(1, 1, staminaW * staminaPct - 2, 4, 2);
      this._staminaBar.fill({ color: highlightColor, alpha: 0.35 });
      // Bottom shadow on fill
      this._staminaBar.roundRect(1, staminaH - 4, staminaW * staminaPct - 2, 3, 1);
      this._staminaBar.fill({ color: 0x000000, alpha: 0.2 });
    }
    // Segment marks
    for (let s = 1; s < 4; s++) {
      const sx = (staminaW / 4) * s;
      this._staminaBar.moveTo(sx, 0);
      this._staminaBar.lineTo(sx, staminaH);
      this._staminaBar.stroke({ color: 0x000000, width: 0.5, alpha: 0.3 });
    }
    // Border
    this._staminaBar.roundRect(0, 0, staminaW, staminaH, 3);
    this._staminaBar.stroke({ color: 0x888888, width: 1 });

    // Cooldown bar with 3D beveled appearance
    const abilityDef = GB_ABILITIES[sel.cls];
    const cdMax = abilityDef.cooldown;
    const cdRemaining = sel.abilityCooldown;
    const cdPct = cdMax > 0 ? Math.max(0, 1 - cdRemaining / cdMax) : 1;
    const cdReady = cdRemaining <= 0;

    this._cooldownText.text = `${abilityDef.name}: ${cdReady ? "READY [Shift]" : cdRemaining.toFixed(1) + "s"}`;
    this._cooldownText.style.fill = cdReady ? 0x44ff44 : 0xffaa44;

    this._cooldownBar.clear();
    // Bar background
    this._cooldownBar.roundRect(0, 0, staminaW, staminaH, 3);
    this._cooldownBar.fill({ color: 0x222222, alpha: 0.9 });
    // Bottom shadow bevel
    this._cooldownBar.roundRect(0, staminaH - 3, staminaW, 3, 1);
    this._cooldownBar.fill({ color: 0x111111, alpha: 0.5 });
    if (cdPct > 0) {
      const cdColor = cdReady ? 0x4488ff : 0x664422;
      const cdHighlight = cdReady ? 0x66aaff : 0x886644;
      // Main fill
      this._cooldownBar.roundRect(0, 0, staminaW * cdPct, staminaH, 3);
      this._cooldownBar.fill({ color: cdColor, alpha: 0.9 });
      // Top highlight bevel
      this._cooldownBar.roundRect(1, 1, staminaW * cdPct - 2, 4, 2);
      this._cooldownBar.fill({ color: cdHighlight, alpha: 0.35 });
      // Bottom shadow on fill
      this._cooldownBar.roundRect(1, staminaH - 4, staminaW * cdPct - 2, 3, 1);
      this._cooldownBar.fill({ color: 0x000000, alpha: 0.2 });
    }
    // Segment marks
    for (let s = 1; s < 4; s++) {
      const sx = (staminaW / 4) * s;
      this._cooldownBar.moveTo(sx, 0);
      this._cooldownBar.lineTo(sx, staminaH);
      this._cooldownBar.stroke({ color: 0x000000, width: 0.5, alpha: 0.3 });
    }
    // Border
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
    const mmW = 190;
    const mmH = 120;
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
    this._eventsFeed.position.set(this._screenW - 266, 80);
    const recent = state.events.slice(-10).reverse();
    for (let i = 0; i < this._eventTexts.length; i++) {
      if (i < recent.length) {
        const ev = recent[i];
        const timeStr = formatTime(ev.time);
        this._eventTexts[i].text = `[${timeStr}] ${ev.text}`;
        this._eventTexts[i].visible = true;

        // Draw event type icons
        this._eventIcons[i].clear();
        const text = ev.text.toLowerCase();
        if (text.includes("goal") || text.includes("score")) {
          // Golden circle for goal
          this._eventIcons[i].circle(5, 6, 5);
          this._eventIcons[i].fill({ color: 0xffd700, alpha: 0.9 });
          this._eventIcons[i].circle(5, 6, 5);
          this._eventIcons[i].stroke({ color: 0xdaa520, width: 0.5 });
        } else if (text.includes("foul") || text.includes("card") || text.includes("tackle")) {
          // Red diamond for foul
          drawDiamond(this._eventIcons[i], 5, 6, 5, 0xff3333, 0.9);
        } else if (text.includes("save") || text.includes("keeper")) {
          // Blue circle for save
          this._eventIcons[i].circle(5, 6, 5);
          this._eventIcons[i].fill({ color: 0x4488ff, alpha: 0.8 });
        } else if (text.includes("power") || text.includes("ability")) {
          // Purple diamond for ability/power
          drawDiamond(this._eventIcons[i], 5, 6, 4, 0xaa44ff, 0.8);
        } else {
          // Small neutral dot
          this._eventIcons[i].circle(5, 6, 2.5);
          this._eventIcons[i].fill({ color: 0x666666, alpha: 0.5 });
        }
      } else {
        this._eventTexts[i].visible = false;
        this._eventIcons[i].clear();
      }
    }
  }

  private _updateAnnouncement(state: GBMatchState): void {
    this._announcementText.position.set(this._screenW / 2, this._screenH / 2 - 40);
    this._merlinSpeech.position.set(this._screenW / 2, this._screenH / 2 + 20);

    // Phase-based announcements
    let showBg = false;
    switch (state.phase) {
      case GBMatchPhase.PRE_GAME:
        this._announcementText.text = "GRAIL BALL";
        this._merlinSpeech.text = `${state.teamDefs[0].name} vs ${state.teamDefs[1].name}`;
        this._announcementText.visible = true;
        this._merlinSpeech.visible = true;
        showBg = true;
        break;
      case GBMatchPhase.KICKOFF:
        this._announcementText.text = state.half === 1 && !state.overtime ? "KICK OFF!" : state.overtime ? "OVERTIME!" : "2ND HALF!";
        this._merlinSpeech.text = "";
        this._announcementText.visible = true;
        this._merlinSpeech.visible = false;
        showBg = true;
        break;
      case GBMatchPhase.GOAL_SCORED: {
        const scorer = state.players.find(p => p.id === state.lastGoalScorer);
        this._announcementText.text = "GOOOAL!";
        this._merlinSpeech.text = scorer ? `${scorer.name} scores for ${state.teamDefs[state.lastGoalTeam].name}!` : "";
        this._announcementText.visible = true;
        this._merlinSpeech.visible = true;
        showBg = true;
        break;
      }
      case GBMatchPhase.HALFTIME:
        this._announcementText.text = "HALFTIME";
        this._merlinSpeech.text = `${state.scores[0]} - ${state.scores[1]}`;
        this._announcementText.visible = true;
        this._merlinSpeech.visible = true;
        showBg = true;
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
        showBg = true;
        break;
      case GBMatchPhase.PENALTY_SHOOTOUT:
        this._announcementText.text = "PENALTY SHOOTOUT";
        this._merlinSpeech.text = state.penaltyState
          ? `Round ${state.penaltyState.round} - ${state.teamDefs[state.penaltyState.shooterTeam].name} to shoot`
          : "";
        this._announcementText.visible = true;
        this._merlinSpeech.visible = true;
        showBg = true;
        break;
      case GBMatchPhase.POST_GAME: {
        const winner = state.scores[0] >= state.scores[1] ? 0 : 1;
        this._announcementText.text = `${state.teamDefs[winner].name} WINS!`;
        this._merlinSpeech.text = `Final: ${state.scores[0]} - ${state.scores[1]}`;
        this._announcementText.visible = true;
        this._merlinSpeech.visible = true;
        showBg = true;
        break;
      }
      default:
        this._announcementText.visible = false;
        // Show merlin speech if active
        if (state.merlinSpeech && state.merlinSpeechTimer > 0) {
          this._merlinSpeech.text = `Merlin: "${state.merlinSpeech}"`;
          this._merlinSpeech.visible = true;
          showBg = true;
        } else {
          this._merlinSpeech.visible = false;
        }
        break;
    }

    // Draw or clear the announcement background banner
    this._announcementBg.clear();
    if (showBg) {
      const cx = this._screenW / 2;
      const cy = this._screenH / 2;
      const bgW = 500;
      const bgH = 120;

      // Dark panel
      this._announcementBg.roundRect(cx - bgW / 2, cy - bgH / 2 - 20, bgW, bgH, 10);
      this._announcementBg.fill({ color: 0x0a0a14, alpha: 0.7 });
      // Gold border
      this._announcementBg.roundRect(cx - bgW / 2, cy - bgH / 2 - 20, bgW, bgH, 10);
      this._announcementBg.stroke({ color: 0xdaa520, width: 2, alpha: 0.7 });
      // Inner border
      this._announcementBg.roundRect(cx - bgW / 2 + 4, cy - bgH / 2 - 16, bgW - 8, bgH - 8, 8);
      this._announcementBg.stroke({ color: 0xdaa520, width: 0.5, alpha: 0.2 });

      // Corner ornaments
      const l = cx - bgW / 2 + 10;
      const r = cx + bgW / 2 - 10;
      const t = cy - bgH / 2 - 14;
      const b = cy + bgH / 2 - 26;
      drawDiamond(this._announcementBg, l, t, 3, 0xdaa520, 0.5);
      drawDiamond(this._announcementBg, r, t, 3, 0xdaa520, 0.5);
      drawDiamond(this._announcementBg, l, b, 3, 0xdaa520, 0.5);
      drawDiamond(this._announcementBg, r, b, 3, 0xdaa520, 0.5);

      // Decorative horizontal lines flanking text area
      this._announcementBg.moveTo(cx - bgW / 2 + 20, cy - 8);
      this._announcementBg.lineTo(cx - 200, cy - 8);
      this._announcementBg.stroke({ color: 0xdaa520, width: 0.5, alpha: 0.3 });
      this._announcementBg.moveTo(cx + 200, cy - 8);
      this._announcementBg.lineTo(cx + bgW / 2 - 20, cy - 8);
      this._announcementBg.stroke({ color: 0xdaa520, width: 0.5, alpha: 0.3 });
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
    // Ornate panel around power-up
    this._powerUpIndicator.roundRect(-4, -4, 24, 24, 4);
    this._powerUpIndicator.fill({ color: 0x0d0d1a, alpha: 0.7 });
    this._powerUpIndicator.roundRect(-4, -4, 24, 24, 4);
    this._powerUpIndicator.stroke({ color: 0xdaa520, width: 1, alpha: 0.6 });
    // Themed circle icon
    this._powerUpIndicator.circle(8, 8, 8);
    this._powerUpIndicator.fill({ color, alpha: 0.9 });
    this._powerUpIndicator.circle(8, 8, 8);
    this._powerUpIndicator.stroke({ color: 0xffd700, width: 0.5, alpha: 0.4 });
    // Inner glow dot
    this._powerUpIndicator.circle(6, 5, 3);
    this._powerUpIndicator.fill({ color: 0xffffff, alpha: 0.15 });

    this._powerUpText.text = `${name} (${sel.powerUpTimer.toFixed(1)}s)`;
    this._powerUpText.style.fill = color;
  }

  // ---------------------------------------------------------------------------
  // Replay overlay
  // ---------------------------------------------------------------------------
  private _updateReplayOverlay(state: GBMatchState): void {
    if (state.replayActive && state.replayCurrentMoment) {
      this._replayOverlay.visible = true;
      this._replayOverlay.position.set(0, this._screenH - 50);

      const moment = state.replayCurrentMoment;
      this._replayText.text = `REPLAY: ${moment.description}`;

      // Progress bar with gold accents
      this._replayProgressBar.clear();
      const barW = this._screenW - 500;
      const progress = state.replayPlaybackIndex / Math.max(1, moment.frames.length);
      // Bar background
      this._replayProgressBar.roundRect(0, 0, barW, 14, 3);
      this._replayProgressBar.fill({ color: 0x222222, alpha: 0.8 });
      // Gold border
      this._replayProgressBar.roundRect(0, 0, barW, 14, 3);
      this._replayProgressBar.stroke({ color: 0xdaa520, width: 0.5, alpha: 0.4 });
      // Progress fill
      this._replayProgressBar.roundRect(0, 0, barW * progress, 14, 3);
      this._replayProgressBar.fill({ color: 0xff4444, alpha: 0.9 });
      // Highlight on progress bar
      this._replayProgressBar.roundRect(1, 1, barW * progress - 2, 5, 2);
      this._replayProgressBar.fill({ color: 0xff6666, alpha: 0.3 });
      // Position marker diamond
      drawDiamond(this._replayProgressBar, barW * progress, 7, 4, 0xffd700, 0.8);
    } else {
      this._replayOverlay.visible = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Penalty overlay
  // ---------------------------------------------------------------------------
  private _updatePenaltyOverlay(state: GBMatchState): void {
    if (state.phase === GBMatchPhase.PENALTY_SHOOTOUT && state.penaltyState) {
      this._penaltyOverlay.visible = true;
      const ps = state.penaltyState;

      this._penaltyScoreText.text = `Penalties: ${ps.scores[0]} - ${ps.scores[1]}`;
      this._penaltyScoreText.position.set(this._screenW / 2, 110);

      // Aim indicator (for human team aiming)
      this._penaltyAimIndicator.clear();
      if (ps.phase === "aiming" && ps.shooterTeam === state.humanTeam) {
        const indicatorW = 100;
        // Draw aim bar
        this._penaltyAimIndicator.roundRect(-indicatorW / 2, -5, indicatorW, 10, 3);
        this._penaltyAimIndicator.fill({ color: 0x333333, alpha: 0.7 });
        // Aim marker
        const aimX = ps.aimAngle * (indicatorW / 2);
        this._penaltyAimIndicator.circle(aimX, 0, 6);
        this._penaltyAimIndicator.fill({ color: 0xffd700, alpha: 0.9 });
        // Power bar
        this._penaltyAimIndicator.roundRect(-indicatorW / 2, 15, indicatorW * ps.aimPower, 6, 2);
        this._penaltyAimIndicator.fill({ color: 0x44ff44, alpha: 0.8 });
      }
      this._penaltyAimIndicator.position.set(this._screenW / 2, this._screenH / 2 + 80);

      // History
      let historyStr = ps.history.map(h =>
        `${state.teamDefs[h.team].shortName} ${h.shooter}: ${h.scored ? "SCORED" : "MISSED"}`
      ).join("\n");
      this._penaltyHistoryText.text = historyStr;
      this._penaltyHistoryText.position.set(this._screenW / 2 - 100, 140);
    } else {
      this._penaltyOverlay.visible = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Fatigue indicator
  // ---------------------------------------------------------------------------
  private _updateFatigueIndicator(state: GBMatchState): void {
    const sel = getSelectedPlayer(state);
    if (!sel) { this._fatigueText.text = ""; return; }

    this._fatigueText.position.set(10, this._screenH - 145);

    if (isCriticallyFatigued(sel)) {
      this._fatigueText.text = "EXHAUSTED - Speed & accuracy severely reduced!";
      this._fatigueText.style.fill = 0xff2222;
    } else if (isFatigued(sel)) {
      this._fatigueText.text = "Fatigued - Performance reduced";
      this._fatigueText.style.fill = 0xffaa44;
    } else {
      this._fatigueText.text = "";
    }
  }

  // ---------------------------------------------------------------------------
  // Injury time indicator
  // ---------------------------------------------------------------------------
  private _updateInjuryTimeIndicator(state: GBMatchState): void {
    this._injuryTimeText.position.set(this._screenW / 2, 112);

    if (state.injuryTimeAnnounced && (state.phase === GBMatchPhase.PLAYING || state.phase === GBMatchPhase.OVERTIME)) {
      const remaining = Math.max(0, (GB_MATCH.HALF_DURATION + state.injuryTime) - state.matchClock);
      if (state.matchClock >= GB_MATCH.HALF_DURATION) {
        const injMins = Math.ceil(remaining / 60);
        const injSecs = Math.floor(remaining % 60);
        this._injuryTimeText.text = `+${injMins}:${injSecs.toString().padStart(2, "0")}`;
        this._injuryTimeText.visible = true;
      } else {
        this._injuryTimeText.visible = false;
      }
    } else {
      this._injuryTimeText.visible = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Formation display
  // ---------------------------------------------------------------------------
  private _updateFormationDisplay(state: GBMatchState): void {
    this._formationText.position.set(this._screenW - 260, 285);

    const humanFormation = state.teamFormations[state.humanTeam];
    const pressure = state.pressureMode[state.humanTeam];
    this._formationText.text = `Formation: ${humanFormation} | Tactic: ${pressure}`;
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
      background:rgba(0,0,0,0.8);z-index:100;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:Georgia,serif;color:#ffd700;
    `;
    this._pauseDiv.innerHTML = `
      <style>
        .gb-pause-panel {
          background: linear-gradient(180deg, rgba(40,28,15,0.97) 0%, rgba(25,18,10,0.98) 50%, rgba(35,24,12,0.97) 100%);
          border: 3px solid #daa520;
          border-radius: 16px;
          padding: 40px 60px;
          text-align: center;
          position: relative;
          box-shadow:
            0 0 30px rgba(0,0,0,0.8),
            inset 0 0 60px rgba(0,0,0,0.3),
            0 0 8px rgba(218,165,32,0.3),
            inset 0 1px 0 rgba(218,165,32,0.2);
        }
        .gb-pause-panel::before {
          content: '';
          position: absolute;
          top: 6px; left: 6px; right: 6px; bottom: 6px;
          border: 1px solid rgba(218,165,32,0.2);
          border-radius: 12px;
          pointer-events: none;
        }
        .gb-pause-panel::after {
          content: '';
          position: absolute;
          top: -1px; left: 50%; transform: translateX(-50%);
          width: 60px; height: 4px;
          background: linear-gradient(90deg, transparent, #ffd700, transparent);
          border-radius: 2px;
        }
        .gb-pause-title {
          font-size: 52px;
          margin-bottom: 36px;
          color: #ffd700;
          text-shadow:
            0 0 10px rgba(255,215,0,0.4),
            2px 2px 4px rgba(0,0,0,0.8),
            0 0 30px rgba(218,165,32,0.2);
          letter-spacing: 6px;
        }
        .gb-pause-corner {
          position: absolute;
          width: 20px; height: 20px;
          border-color: #daa520;
          border-style: solid;
        }
        .gb-pause-corner.tl { top: 10px; left: 10px; border-width: 2px 0 0 2px; border-radius: 4px 0 0 0; }
        .gb-pause-corner.tr { top: 10px; right: 10px; border-width: 2px 2px 0 0; border-radius: 0 4px 0 0; }
        .gb-pause-corner.bl { bottom: 10px; left: 10px; border-width: 0 0 2px 2px; border-radius: 0 0 0 4px; }
        .gb-pause-corner.br { bottom: 10px; right: 10px; border-width: 0 2px 2px 0; border-radius: 0 0 4px 0; }
        .gb-pause-btn {
          font-family: Georgia, serif;
          font-size: 22px;
          cursor: pointer;
          margin: 10px 0;
          padding: 10px 40px;
          border: 2px solid #daa520;
          border-radius: 8px;
          color: #ffd700;
          background: linear-gradient(180deg, rgba(218,165,32,0.1) 0%, rgba(218,165,32,0.05) 100%);
          transition: all 0.25s ease;
          letter-spacing: 1px;
          position: relative;
          min-width: 200px;
        }
        .gb-pause-btn:hover {
          background: linear-gradient(180deg, rgba(218,165,32,0.3) 0%, rgba(218,165,32,0.15) 100%);
          box-shadow: 0 0 15px rgba(218,165,32,0.4), inset 0 0 10px rgba(218,165,32,0.1);
          border-color: #ffd700;
          text-shadow: 0 0 8px rgba(255,215,0,0.5);
          transform: scale(1.03);
        }
        .gb-pause-btn::before {
          content: '';
          position: absolute;
          left: 8px; top: 50%; transform: translateY(-50%);
          width: 4px; height: 4px;
          background: #daa520;
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
        }
        .gb-pause-btn::after {
          content: '';
          position: absolute;
          right: 8px; top: 50%; transform: translateY(-50%);
          width: 4px; height: 4px;
          background: #daa520;
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
        }
        .gb-pause-divider {
          width: 180px; height: 1px; margin: 8px auto;
          background: linear-gradient(90deg, transparent, rgba(218,165,32,0.4), transparent);
        }
      </style>
      <div class="gb-pause-panel">
        <div class="gb-pause-corner tl"></div>
        <div class="gb-pause-corner tr"></div>
        <div class="gb-pause-corner bl"></div>
        <div class="gb-pause-corner br"></div>
        <div class="gb-pause-title">PAUSED</div>
        <div class="gb-pause-divider"></div>
        <div id="gb-pause-resume" class="gb-pause-btn">Resume</div>
        <div id="gb-pause-controls" class="gb-pause-btn">Controls</div>
        <div id="gb-pause-rules" class="gb-pause-btn">Rules</div>
        <div id="gb-pause-exit" class="gb-pause-btn">Exit to Menu</div>
      </div>
    `;

    const resume = this._pauseDiv.querySelector("#gb-pause-resume") as HTMLElement;
    const controls = this._pauseDiv.querySelector("#gb-pause-controls") as HTMLElement;
    const rules = this._pauseDiv.querySelector("#gb-pause-rules") as HTMLElement;
    const exit = this._pauseDiv.querySelector("#gb-pause-exit") as HTMLElement;

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
      max-width:720px;padding:50px;margin:30px;position:relative;
      background: linear-gradient(180deg, rgba(55,42,25,0.97) 0%, rgba(35,25,12,0.98) 40%, rgba(45,35,20,0.97) 100%);
      border:3px solid #daa520;border-radius:16px;
      box-shadow:
        0 0 40px rgba(0,0,0,0.8),
        inset 0 0 80px rgba(0,0,0,0.2),
        0 0 10px rgba(218,165,32,0.2);
    `;
    // Format rules text with drop cap styling for first letter
    const rulesFormatted = GB_RULES_TEXT.replace(/\n/g, '<br>');
    content.innerHTML = `
      <style>
        .gb-rules-header {
          text-align: center;
          color: #ffd700;
          font-size: 28px;
          margin-bottom: 10px;
          text-shadow: 0 0 8px rgba(255,215,0,0.3), 2px 2px 4px rgba(0,0,0,0.8);
          letter-spacing: 4px;
        }
        .gb-rules-scrollwork {
          text-align: center;
          margin-bottom: 20px;
          color: #daa520;
          font-size: 14px;
          opacity: 0.6;
        }
        .gb-rules-divider {
          width: 80%;
          height: 1px;
          margin: 0 auto 20px;
          background: linear-gradient(90deg, transparent, #daa520, transparent);
        }
        .gb-rules-body {
          font-family: Georgia, serif;
          font-size: 15px;
          line-height: 1.7;
          color: #ddd;
        }
        .gb-rules-body::first-letter {
          font-size: 2.5em;
          float: left;
          color: #ffd700;
          line-height: 1;
          margin-right: 6px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }
        .gb-rules-inner-border {
          position: absolute;
          top: 8px; left: 8px; right: 8px; bottom: 8px;
          border: 1px solid rgba(218,165,32,0.2);
          border-radius: 12px;
          pointer-events: none;
        }
        .gb-rules-corner {
          position: absolute;
          width: 24px; height: 24px;
          border-color: #daa520;
          border-style: solid;
          opacity: 0.5;
        }
        .gb-rules-corner.tl { top: 12px; left: 12px; border-width: 2px 0 0 2px; }
        .gb-rules-corner.tr { top: 12px; right: 12px; border-width: 2px 2px 0 0; }
        .gb-rules-corner.bl { bottom: 12px; left: 12px; border-width: 0 0 2px 2px; }
        .gb-rules-corner.br { bottom: 12px; right: 12px; border-width: 0 2px 2px 0; }
        .gb-rules-close-btn {
          text-align:center;margin-top:24px;font-size:20px;color:#ffd700;cursor:pointer;
          border:2px solid #daa520;padding:10px 28px;border-radius:8px;
          background: linear-gradient(180deg, rgba(218,165,32,0.1) 0%, rgba(218,165,32,0.05) 100%);
          transition: all 0.25s ease;
          letter-spacing: 1px;
          display: inline-block;
        }
        .gb-rules-close-btn:hover {
          background: linear-gradient(180deg, rgba(218,165,32,0.3) 0%, rgba(218,165,32,0.15) 100%);
          box-shadow: 0 0 12px rgba(218,165,32,0.4);
          border-color: #ffd700;
        }
      </style>
      <div class="gb-rules-inner-border"></div>
      <div class="gb-rules-corner tl"></div>
      <div class="gb-rules-corner tr"></div>
      <div class="gb-rules-corner bl"></div>
      <div class="gb-rules-corner br"></div>
      <div class="gb-rules-header">RULES OF GRAIL BALL</div>
      <div class="gb-rules-scrollwork">~ ~ ~</div>
      <div class="gb-rules-divider"></div>
      <div class="gb-rules-body">${rulesFormatted}</div>
      <div style="text-align:center;">
        <div id="gb-rules-close" class="gb-rules-close-btn">Close [Esc]</div>
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
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:Georgia,serif;color:#ddd;overflow-y:auto;
    `;

    const content = document.createElement("div");
    content.style.cssText = `
      max-width:700px;padding:50px;margin:20px;position:relative;
      background: linear-gradient(180deg, rgba(55,42,25,0.97) 0%, rgba(35,25,12,0.98) 40%, rgba(45,35,20,0.97) 100%);
      border:3px solid #daa520;border-radius:16px;
      box-shadow:
        0 0 40px rgba(0,0,0,0.8),
        inset 0 0 80px rgba(0,0,0,0.2),
        0 0 10px rgba(218,165,32,0.2);
    `;

    const controlRows = [
      { keys: ["Arrow", "WASD"], action: "Move player" },
      { keys: ["Space"], action: "Pass orb (tap) / Charge shot (hold)" },
      { keys: ["Shift"], action: "Tackle (no orb) / Use Ability (with orb)" },
      { keys: ["Tab"], action: "Switch selected player" },
      { keys: ["E"], action: "Lob pass" },
      { keys: ["Q"], action: "Call for pass" },
      { keys: ["Esc"], action: "Pause game" },
    ];

    const rowsHtml = controlRows.map(r => {
      const keyCaps = r.keys.map(k =>
        `<span style="
          display:inline-block;
          background: linear-gradient(180deg, #3a3020 0%, #2a2015 100%);
          border:1px solid #daa520;
          border-radius:5px;
          padding:4px 12px;
          margin:0 3px;
          font-size:14px;
          color:#ffd700;
          text-shadow:0 1px 1px rgba(0,0,0,0.5);
          box-shadow: 0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(218,165,32,0.2);
          min-width:30px;
          text-align:center;
        ">${k}</span>`
      ).join(" ");
      return `
        <div style="display:flex;align-items:center;margin:10px 0;padding:6px 0;border-bottom:1px solid rgba(218,165,32,0.1);">
          <div style="flex:0 0 180px;text-align:right;padding-right:16px;">${keyCaps}</div>
          <div style="flex:1;color:#ccc;font-size:15px;">${r.action}</div>
        </div>
      `;
    }).join("");

    content.innerHTML = `
      <style>
        .gb-ctrl-inner-border {
          position: absolute;
          top: 8px; left: 8px; right: 8px; bottom: 8px;
          border: 1px solid rgba(218,165,32,0.2);
          border-radius: 12px;
          pointer-events: none;
        }
        .gb-ctrl-corner {
          position: absolute;
          width: 20px; height: 20px;
          border-color: #daa520;
          border-style: solid;
          opacity: 0.5;
        }
        .gb-ctrl-corner.tl { top: 12px; left: 12px; border-width: 2px 0 0 2px; }
        .gb-ctrl-corner.tr { top: 12px; right: 12px; border-width: 2px 2px 0 0; }
        .gb-ctrl-corner.bl { bottom: 12px; left: 12px; border-width: 0 0 2px 2px; }
        .gb-ctrl-corner.br { bottom: 12px; right: 12px; border-width: 0 2px 2px 0; }
        .gb-ctrl-close-btn {
          text-align:center;margin-top:24px;font-size:20px;color:#ffd700;cursor:pointer;
          border:2px solid #daa520;padding:10px 28px;border-radius:8px;
          background: linear-gradient(180deg, rgba(218,165,32,0.1) 0%, rgba(218,165,32,0.05) 100%);
          transition: all 0.25s ease;display:inline-block;letter-spacing:1px;
        }
        .gb-ctrl-close-btn:hover {
          background: linear-gradient(180deg, rgba(218,165,32,0.3) 0%, rgba(218,165,32,0.15) 100%);
          box-shadow: 0 0 12px rgba(218,165,32,0.4);
          border-color: #ffd700;
        }
      </style>
      <div class="gb-ctrl-inner-border"></div>
      <div class="gb-ctrl-corner tl"></div>
      <div class="gb-ctrl-corner tr"></div>
      <div class="gb-ctrl-corner bl"></div>
      <div class="gb-ctrl-corner br"></div>
      <div style="text-align:center;color:#ffd700;font-size:28px;margin-bottom:8px;text-shadow:0 0 8px rgba(255,215,0,0.3),2px 2px 4px rgba(0,0,0,0.8);letter-spacing:4px;">CONTROLS</div>
      <div style="text-align:center;margin-bottom:16px;color:#daa520;font-size:14px;opacity:0.6;">~ ~ ~</div>
      <div style="width:80%;height:1px;margin:0 auto 20px;background:linear-gradient(90deg,transparent,#daa520,transparent);"></div>
      ${rowsHtml}
      <div style="text-align:center;">
        <div id="gb-controls-close" class="gb-ctrl-close-btn">Close [Esc]</div>
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
