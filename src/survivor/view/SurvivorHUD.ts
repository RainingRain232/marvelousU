// ---------------------------------------------------------------------------
// Survivor HUD — HP/XP bars, timer, kills, gold, weapon icons, boss HP, notifications
// Enhanced with medieval/fantasy themed styling, decorative borders, glows, gradients
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { t } from "@/i18n/i18n";
import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import { WEAPON_DEFS, EVOLUTION_DEFS, PASSIVE_DEFS } from "../config/SurvivorWeaponDefs";
import type { SurvivorEvolutionDef } from "../config/SurvivorWeaponDefs";
import type { SurvivorState } from "../state/SurvivorState";

const DT = SurvivorBalance.SIM_TICK_MS / 1000;

// Medieval gold/dark color palette
const GOLD = 0xd4a847;
const GOLD_LIGHT = 0xf0d878;
const GOLD_DARK = 0x8a6a20;
const PANEL_BG = 0x0c0c1a;
const PANEL_INNER = 0x1a1428;
const CRIMSON_DARK = 0x551111;

// Helper: draw a decorative medieval frame
function drawMedievalFrame(g: Graphics, x: number, y: number, w: number, h: number, cornerSize = 6): void {
  // Dark fill with subtle gradient effect (inner shadow)
  g.roundRect(x, y, w, h, 4).fill({ color: PANEL_BG, alpha: 0.92 });
  // Inner border glow
  g.roundRect(x + 1, y + 1, w - 2, h - 2, 3).stroke({ color: GOLD_DARK, width: 1, alpha: 0.3 });
  // Outer border
  g.roundRect(x, y, w, h, 4).stroke({ color: GOLD, width: 1.5, alpha: 0.7 });

  // Corner ornaments
  const cs = cornerSize;
  const corners = [
    [x, y], [x + w, y], [x, y + h], [x + w, y + h],
  ];
  for (const [cx, cy] of corners) {
    g.circle(cx, cy, cs / 2).fill({ color: GOLD, alpha: 0.5 });
    g.circle(cx, cy, cs / 4).fill({ color: GOLD_LIGHT, alpha: 0.8 });
  }
}

// Helper: draw decorative line separator
function drawSeparator(g: Graphics, x: number, y: number, w: number): void {
  g.moveTo(x, y).lineTo(x + w, y).stroke({ color: GOLD, width: 1, alpha: 0.3 });
  // Diamond center ornament
  const cx = x + w / 2;
  g.moveTo(cx - 4, y).lineTo(cx, y - 3).lineTo(cx + 4, y).lineTo(cx, y + 3).closePath()
    .fill({ color: GOLD, alpha: 0.5 });
}

export class SurvivorHUD {
  readonly container = new Container();

  private _hpBarBg!: Graphics;
  private _hpBarFill!: Graphics;
  private _hpText!: Text;
  private _xpBarBg!: Graphics;
  private _xpBarFill!: Graphics;
  private _timerText!: Text;
  private _killText!: Text;
  private _levelText!: Text;
  private _goldHudText!: Text;
  private _weaponHudContainer = new Container();
  private _weaponIcons: Map<string, { container: Container; level: number; evolved: boolean }> = new Map();
  private _tooltip = new Container();
  private _tooltipBg!: Graphics;
  private _tooltipContent = new Container();
  private _bossWarning: Text | null = null;
  private _bossWarningTimer = 0;

  // Boss HP bar
  private _bossHpContainer = new Container();
  private _bossHpBarBg!: Graphics;
  private _bossHpBarFill!: Graphics;
  private _bossNameText!: Text;

  // Notifications
  private _notifications: { text: Text; bg: Graphics; lifetime: number }[] = [];

  // Event banner
  private _eventBanner: Container | null = null;
  private _eventBannerTimer = 0;

  // Landmark buff indicators
  private _buffContainer = new Container();

  // Top-left stats panel
  private _statsPanel!: Graphics;
  // Top-right info panel
  private _infoPanel!: Graphics;
  // Timer panel
  private _timerPanel!: Graphics;

  build(sw: number, sh: number): void {
    this.container.removeChildren();
    this._weaponHudContainer.removeChildren();
    this._bossHpContainer.removeChildren();

    // ===== TOP-LEFT: Stats panel (HP bar, Level) =====
    const panelW = 290;
    const panelH = 50;
    this._statsPanel = new Graphics();
    drawMedievalFrame(this._statsPanel, 6, 6, panelW, panelH, 5);
    this.container.addChild(this._statsPanel);

    // HP bar — inside the stats panel
    const hpX = 14;
    const hpY = 16;
    const hpW = 220;
    const hpH = 20;
    this._hpBarBg = new Graphics();
    // HP bar track with carved-in look
    this._hpBarBg
      .roundRect(hpX, hpY, hpW, hpH, 4).fill({ color: 0x1a0000 })
      .roundRect(hpX, hpY, hpW, hpH, 4).stroke({ color: CRIMSON_DARK, width: 1.5 });
    // Inner shadow top edge
    this._hpBarBg.rect(hpX + 2, hpY + 1, hpW - 4, 3).fill({ color: 0x000000, alpha: 0.3 });
    this._hpBarFill = new Graphics();
    this._hpText = new Text({
      text: "",
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 11, fill: 0xffffff,
        fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 2, distance: 1, angle: Math.PI / 4 },
      }),
    });
    this._hpText.anchor.set(0.5, 0.5);
    this._hpText.position.set(hpX + hpW / 2, hpY + hpH / 2);
    this.container.addChild(this._hpBarBg, this._hpBarFill, this._hpText);

    // HP icon (heart)
    const heartIcon = new Graphics();
    // Simple heart shape
    heartIcon.circle(-3, -2, 3.5).fill({ color: 0xff3333 });
    heartIcon.circle(3, -2, 3.5).fill({ color: 0xff3333 });
    heartIcon.moveTo(-6, -1).lineTo(0, 7).lineTo(6, -1).fill({ color: 0xff3333 });
    heartIcon.circle(0, -2, 2).fill({ color: 0xff6666, alpha: 0.4 });
    heartIcon.position.set(hpX + hpW + 14, hpY + hpH / 2);
    this.container.addChild(heartIcon);

    // Level
    this._levelText = new Text({
      text: "Lv.1",
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 13, fill: GOLD_LIGHT, fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 2, distance: 1, angle: Math.PI / 4 },
      }),
    });
    this._levelText.position.set(14, 38);
    this.container.addChild(this._levelText);

    // XP bar — full width at bottom with ornamental ends
    const xpH = 10;
    this._xpBarBg = new Graphics();
    this._xpBarBg.rect(0, sh - xpH, sw, xpH).fill({ color: 0x000a18 });
    this._xpBarBg.rect(0, sh - xpH, sw, 1).fill({ color: GOLD, alpha: 0.3 });
    // Decorative end caps
    this._xpBarBg.moveTo(0, sh - xpH).lineTo(6, sh).lineTo(0, sh).fill({ color: GOLD, alpha: 0.2 });
    this._xpBarBg.moveTo(sw, sh - xpH).lineTo(sw - 6, sh).lineTo(sw, sh).fill({ color: GOLD, alpha: 0.2 });
    this._xpBarFill = new Graphics();
    this.container.addChild(this._xpBarBg, this._xpBarFill);

    // ===== TOP-CENTER: Timer panel =====
    const timerW = 110;
    const timerH = 40;
    this._timerPanel = new Graphics();
    drawMedievalFrame(this._timerPanel, sw / 2 - timerW / 2, 4, timerW, timerH, 5);
    // Extra ornamental top edge — pointed crest
    this._timerPanel.moveTo(sw / 2 - 14, 4).lineTo(sw / 2, -4).lineTo(sw / 2 + 14, 4)
      .fill({ color: PANEL_BG, alpha: 0.9 });
    this._timerPanel.moveTo(sw / 2 - 14, 4).lineTo(sw / 2, -4).lineTo(sw / 2 + 14, 4)
      .stroke({ color: GOLD, width: 1.5, alpha: 0.7 });
    this.container.addChild(this._timerPanel);

    this._timerText = new Text({
      text: "00:00",
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 20, fill: 0xffffff, fontWeight: "bold",
        letterSpacing: 2,
        dropShadow: { color: 0x000000, blur: 3, distance: 1, angle: Math.PI / 4 },
      }),
    });
    this._timerText.anchor.set(0.5, 0.5);
    this._timerText.position.set(sw / 2, 24);
    this.container.addChild(this._timerText);

    // ===== TOP-RIGHT: Info panel (kills, gold) =====
    const infoPanelW = 150;
    const infoPanelH = 50;
    this._infoPanel = new Graphics();
    drawMedievalFrame(this._infoPanel, sw - infoPanelW - 6, 6, infoPanelW, infoPanelH, 5);
    this.container.addChild(this._infoPanel);

    // Kill count with skull icon
    const skullIcon = new Graphics();
    skullIcon.circle(0, 0, 5).fill({ color: 0xccccaa });
    skullIcon.circle(-2, -1, 1.2).fill({ color: 0x222222 });
    skullIcon.circle(2, -1, 1.2).fill({ color: 0x222222 });
    skullIcon.rect(-1.5, 2, 3, 2).fill({ color: 0x222222 });
    skullIcon.position.set(sw - infoPanelW + 8, 22);
    this.container.addChild(skullIcon);

    this._killText = new Text({
      text: "0",
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 12, fill: 0xdddddd, fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 2, distance: 1, angle: Math.PI / 4 },
      }),
    });
    this._killText.anchor.set(0, 0.5);
    this._killText.position.set(sw - infoPanelW + 18, 22);
    this.container.addChild(this._killText);

    // Gold with coin icon
    const coinIcon = new Graphics();
    coinIcon.circle(0, 0, 5).fill({ color: GOLD });
    coinIcon.circle(-1, -1, 2).fill({ color: GOLD_LIGHT, alpha: 0.5 });
    coinIcon.circle(0, 0, 5).stroke({ color: GOLD_DARK, width: 1 });
    coinIcon.position.set(sw - infoPanelW + 8, 40);
    this.container.addChild(coinIcon);

    this._goldHudText = new Text({
      text: "0",
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 12, fill: GOLD_LIGHT, fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 2, distance: 1, angle: Math.PI / 4 },
      }),
    });
    this._goldHudText.anchor.set(0, 0.5);
    this._goldHudText.position.set(sw - infoPanelW + 18, 40);
    this.container.addChild(this._goldHudText);

    // ===== BOTTOM-RIGHT: Weapon icons =====
    this._weaponHudContainer.position.set(sw - 10, sh - 80);
    this.container.addChild(this._weaponHudContainer);

    // ===== Boss HP bar =====
    const bossBarW = 340;
    const bossBarH = 18;
    this._bossHpBarBg = new Graphics();
    drawMedievalFrame(this._bossHpBarBg, -6, -6, bossBarW + 12, bossBarH + 12, 4);
    this._bossHpBarBg
      .roundRect(0, 0, bossBarW, bossBarH, 4).fill({ color: 0x220000 })
      .roundRect(0, 0, bossBarW, bossBarH, 4).stroke({ color: 0xcc3333, width: 1 });
    this._bossHpBarFill = new Graphics();
    this._bossNameText = new Text({
      text: "",
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 12, fill: 0xff6644, fontWeight: "bold",
        letterSpacing: 2,
        dropShadow: { color: 0x000000, blur: 3, distance: 1, angle: Math.PI / 4 },
      }),
    });
    this._bossNameText.anchor.set(0.5, 0);
    this._bossNameText.position.set(bossBarW / 2, -24);
    this._bossHpContainer.addChild(this._bossHpBarBg, this._bossHpBarFill, this._bossNameText);
    this._bossHpContainer.position.set((sw - bossBarW) / 2, 50);
    this._bossHpContainer.visible = false;
    this.container.addChild(this._bossHpContainer);

    // Landmark buff indicators (below HP bar)
    this._buffContainer.removeChildren();
    this._buffContainer.position.set(10, 62);
    this.container.addChild(this._buffContainer);

    // Weapon tooltip (on top of everything)
    this._weaponIcons.clear();
    this._tooltip.removeChildren();
    this._tooltipBg = new Graphics();
    this._tooltipContent = new Container();
    this._tooltip.addChild(this._tooltipBg, this._tooltipContent);
    this._tooltip.visible = false;
    this.container.addChild(this._tooltip);
  }

  update(s: SurvivorState, sw: number, sh: number): void {
    const hpRatio = Math.max(0, s.player.hp / s.player.maxHp);
    const xpRatio = s.xpToNext > 0 ? Math.min(1, s.xp / s.xpToNext) : 0;
    const hpX = 14;
    const hpY = 16;
    const hpW = 220;
    const hpH = 20;
    const xpH = 10;

    // HP bar — gradient-style fill with highlight
    const hpColor = hpRatio > 0.5 ? 0xcc2222 : hpRatio > 0.25 ? 0xcc6600 : 0xff0000;
    const hpHighlight = hpRatio > 0.5 ? 0xff4444 : hpRatio > 0.25 ? 0xffaa44 : 0xff4444;
    const fillW = hpW * hpRatio;
    this._hpBarFill.clear();
    if (fillW > 2) {
      this._hpBarFill
        .roundRect(hpX, hpY, fillW, hpH, 4).fill({ color: hpColor })
        // Highlight strip on top for gradient effect
        .rect(hpX + 2, hpY + 2, Math.max(0, fillW - 4), 5).fill({ color: hpHighlight, alpha: 0.3 });
    }
    this._hpText.text = `${Math.ceil(s.player.hp)} / ${Math.ceil(s.player.maxHp)}`;

    // XP bar — glowing blue
    this._xpBarFill.clear();
    const xpFillW = sw * xpRatio;
    if (xpFillW > 0) {
      this._xpBarFill
        .rect(0, sh - xpH, xpFillW, xpH).fill({ color: 0x2266cc })
        // Top glow line
        .rect(0, sh - xpH, xpFillW, 2).fill({ color: 0x66aaff, alpha: 0.5 })
        // Bright leading edge
        .rect(Math.max(0, xpFillW - 3), sh - xpH, 3, xpH).fill({ color: 0x88ccff, alpha: 0.6 });
    }

    // Timer
    const mins = Math.floor(s.gameTime / 60);
    const secs = Math.floor(s.gameTime % 60);
    this._timerText.text = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    // Kills & gold & level
    this._killText.text = `${s.totalKills}`;
    this._goldHudText.text = `${s.gold}`;
    this._levelText.text = `Lv.${s.level}`;

    // Weapon icons
    this._updateWeaponHud(s, sw, sh);

    // Boss HP
    this._updateBossHud(s);

    // Boss warning
    if (this._bossWarningTimer > 0) {
      this._bossWarningTimer -= DT;
      if (!this._bossWarning) {
        this._bossWarning = new Text({
          text: t("survivor.boss_incoming"),
          style: new TextStyle({
            fontFamily: "monospace", fontSize: 26, fill: 0xff4444, fontWeight: "bold",
            letterSpacing: 4,
            dropShadow: { color: 0x880000, blur: 6, distance: 2, angle: Math.PI / 4 },
          }),
        });
        this._bossWarning.anchor.set(0.5, 0.5);
        this._bossWarning.position.set(sw / 2, 90);
        this.container.addChild(this._bossWarning);
      }
      this._bossWarning.alpha = Math.abs(Math.sin(this._bossWarningTimer * 6));
      if (this._bossWarningTimer <= 0 && this._bossWarning) {
        this.container.removeChild(this._bossWarning);
        this._bossWarning.destroy();
        this._bossWarning = null;
      }
    }

    // Landmark buff indicators
    this._updateBuffIndicators(s);
  }

  triggerBossWarning(): void {
    this._bossWarningTimer = 3;
  }

  showNotification(msg: string, color: number, sw: number, sh: number): void {
    // Background panel for notification
    const text = new Text({
      text: msg,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 22, fill: color, fontWeight: "bold",
        letterSpacing: 2,
        dropShadow: { color: 0x000000, blur: 4, distance: 2, angle: Math.PI / 4 },
      }),
    });
    text.anchor.set(0.5, 0.5);
    text.position.set(sw / 2, sh * 0.25);

    const bg = new Graphics();
    const tw = text.width + 30;
    const th = text.height + 16;
    bg.roundRect(sw / 2 - tw / 2, sh * 0.25 - th / 2, tw, th, 6)
      .fill({ color: PANEL_BG, alpha: 0.75 });
    bg.roundRect(sw / 2 - tw / 2, sh * 0.25 - th / 2, tw, th, 6)
      .stroke({ color, width: 1.5, alpha: 0.5 });

    this.container.addChild(bg);
    this.container.addChild(text);
    this._notifications.push({ text, bg, lifetime: 2.0 });
  }

  updateNotifications(dt: number): void {
    for (let i = this._notifications.length - 1; i >= 0; i--) {
      const n = this._notifications[i];
      n.lifetime -= dt;
      n.text.alpha = Math.min(1, n.lifetime / 0.5);
      n.bg.alpha = Math.min(0.75, n.lifetime / 0.5 * 0.75);
      n.text.position.y -= dt * 15;
      n.bg.position.y -= dt * 15;
      if (n.lifetime <= 0) {
        this.container.removeChild(n.text);
        this.container.removeChild(n.bg);
        n.text.destroy();
        n.bg.destroy();
        this._notifications.splice(i, 1);
      }
    }
  }

  showEventBanner(name: string, color: number, sw: number): void {
    if (this._eventBanner) {
      this.container.removeChild(this._eventBanner);
      this._eventBanner.destroy({ children: true });
    }
    const banner = new Container();

    const text = new Text({
      text: name,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 24, fill: color, fontWeight: "bold",
        letterSpacing: 4,
        dropShadow: { color: 0x000000, blur: 4, distance: 2, angle: Math.PI / 4 },
      }),
    });
    text.anchor.set(0.5, 0);
    text.position.set(sw / 2, 68);

    // Decorative banner background
    const bannerW = text.width + 60;
    const bannerH = 38;
    const bg = new Graphics();
    drawMedievalFrame(bg, sw / 2 - bannerW / 2, 60, bannerW, bannerH, 4);
    // Pointed banner ends
    bg.moveTo(sw / 2 - bannerW / 2 - 8, 60).lineTo(sw / 2 - bannerW / 2, 60 + bannerH / 2)
      .lineTo(sw / 2 - bannerW / 2 - 8, 60 + bannerH).fill({ color: GOLD, alpha: 0.3 });
    bg.moveTo(sw / 2 + bannerW / 2 + 8, 60).lineTo(sw / 2 + bannerW / 2, 60 + bannerH / 2)
      .lineTo(sw / 2 + bannerW / 2 + 8, 60 + bannerH).fill({ color: GOLD, alpha: 0.3 });

    banner.addChild(bg, text);
    this.container.addChild(banner);
    this._eventBanner = banner;
    this._eventBannerTimer = 3;
  }

  updateEventBanner(dt: number): void {
    if (this._eventBannerTimer > 0) {
      this._eventBannerTimer -= dt;
      if (this._eventBanner) {
        this._eventBanner.alpha = Math.min(1, this._eventBannerTimer / 0.5);
      }
      if (this._eventBannerTimer <= 0 && this._eventBanner) {
        this.container.removeChild(this._eventBanner);
        this._eventBanner.destroy({ children: true });
        this._eventBanner = null;
      }
    }
  }

  cleanup(): void {
    this._notifications = [];
    if (this._eventBanner) {
      this._eventBanner.destroy({ children: true });
      this._eventBanner = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Weapon HUD — Bottom-right, medieval themed weapon slots
  // ---------------------------------------------------------------------------

  private _updateWeaponHud(s: SurvivorState, sw: number, sh: number): void {
    const iconSize = 58;
    const gap = 8;
    const totalW = s.weapons.length * (iconSize + gap) - gap;

    // Position: bottom-right, anchored to right edge
    this._weaponHudContainer.position.set(sw - totalW - 16, sh - iconSize - 28);

    // Check if icons need rebuilding
    let needsRebuild = s.weapons.length !== this._weaponIcons.size;
    if (!needsRebuild) {
      for (const ws of s.weapons) {
        const cached = this._weaponIcons.get(ws.id);
        if (!cached || cached.level !== ws.level || cached.evolved !== ws.evolved) {
          needsRebuild = true;
          break;
        }
      }
    }

    if (needsRebuild) {
      this._weaponHudContainer.removeChildren();
      this._weaponIcons.clear();
      this._tooltip.visible = false;

      // Draw weapon panel background
      const panelPad = 8;
      const panelBg = new Graphics();
      drawMedievalFrame(panelBg, -panelPad, -panelPad, totalW + panelPad * 2, iconSize + panelPad * 2, 5);
      this._weaponHudContainer.addChild(panelBg);

      for (let i = 0; i < s.weapons.length; i++) {
        const ws = s.weapons[i];
        const def = WEAPON_DEFS[ws.id];
        const icon = new Container();
        icon.eventMode = "static";
        icon.cursor = "pointer";

        // Slot background with medieval styling
        const bg = new Graphics();
        const borderColor = ws.evolved ? GOLD_LIGHT : def.color;
        const borderAlpha = ws.evolved ? 1.0 : 0.7;

        // Outer glow for evolved weapons
        if (ws.evolved) {
          bg.roundRect(-3, -3, iconSize + 6, iconSize + 6, 8)
            .fill({ color: GOLD, alpha: 0.15 });
        }

        // Main slot background
        bg.roundRect(0, 0, iconSize, iconSize, 6)
          .fill({ color: PANEL_INNER, alpha: 0.95 });
        // Inner shadow (top)
        bg.rect(3, 3, iconSize - 6, 8).fill({ color: 0x000000, alpha: 0.2 });
        // Border
        bg.roundRect(0, 0, iconSize, iconSize, 6)
          .stroke({ color: borderColor, width: ws.evolved ? 2.5 : 1.5, alpha: borderAlpha });
        // Corner dots
        const cornerOff = 5;
        const cDots = [
          [cornerOff, cornerOff], [iconSize - cornerOff, cornerOff],
          [cornerOff, iconSize - cornerOff], [iconSize - cornerOff, iconSize - cornerOff],
        ];
        for (const [cx, cy] of cDots) {
          bg.circle(cx, cy, 1.5).fill({ color: borderColor, alpha: 0.5 });
        }
        icon.addChild(bg);

        // Draw weapon-specific icon with glow
        const weaponGlow = new Graphics();
        weaponGlow.circle(iconSize / 2, iconSize / 2 - 4, 14)
          .fill({ color: def.color, alpha: 0.12 });
        icon.addChild(weaponGlow);

        const weaponIcon = new Graphics();
        weaponIcon.position.set(iconSize / 2, iconSize / 2 - 4);
        this._drawWeaponIcon(weaponIcon, ws.id, def.color);
        icon.addChild(weaponIcon);

        // Level label with background pill
        const lvlStr = ws.evolved ? "MAX" : `Lv${ws.level}`;
        const lvlColor = ws.evolved ? GOLD_LIGHT : 0xaabbcc;
        const lvlBg = new Graphics();
        lvlBg.roundRect(iconSize / 2 - 14, iconSize - 14, 28, 12, 3)
          .fill({ color: 0x000000, alpha: 0.6 });
        icon.addChild(lvlBg);

        const lvl = new Text({
          text: lvlStr,
          style: new TextStyle({
            fontFamily: "monospace", fontSize: 9, fill: lvlColor, fontWeight: "bold",
          }),
        });
        lvl.anchor.set(0.5, 0.5);
        lvl.position.set(iconSize / 2, iconSize - 8);
        icon.addChild(lvl);

        // Cooldown overlay
        const cdOverlay = new Graphics();
        cdOverlay.name = "cdOverlay";
        icon.addChild(cdOverlay);

        icon.position.set(i * (iconSize + gap), 0);

        // Tooltip hover
        const weaponId = ws.id;
        const weaponLevel = ws.level;
        const evolved = ws.evolved;
        icon.on("pointerover", (e) => {
          this._showWeaponTooltip(weaponId, weaponLevel, evolved, e.globalX, e.globalY);
        });
        icon.on("pointermove", (e) => {
          if (this._tooltip.visible) this._positionTooltip(e.globalX, e.globalY);
        });
        icon.on("pointerout", () => { this._tooltip.visible = false; });

        this._weaponHudContainer.addChild(icon);
        this._weaponIcons.set(ws.id, { container: icon, level: ws.level, evolved: ws.evolved });
      }
    }

    // Update cooldown overlays every frame
    for (const ws of s.weapons) {
      const cached = this._weaponIcons.get(ws.id);
      if (!cached) continue;
      const def = WEAPON_DEFS[ws.id];
      const cd = def.baseCooldown > 0
        ? Math.max(0.1, def.baseCooldown - def.cooldownPerLevel * (ws.level - 1))
        : 0;
      const cdOverlay = cached.container.getChildByName("cdOverlay") as Graphics;
      if (!cdOverlay) continue;
      cdOverlay.clear();

      if (cd > 0 && ws.cooldownTimer > 0) {
        const ratio = ws.cooldownTimer / cd;
        const cx = iconSize / 2;
        const cy = iconSize / 2;
        const r = iconSize / 2;
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + Math.PI * 2 * ratio;
        cdOverlay.moveTo(cx, cy);
        cdOverlay.arc(cx, cy, r, startAngle, endAngle);
        cdOverlay.lineTo(cx, cy);
        cdOverlay.fill({ color: 0x000000, alpha: 0.55 });
      }
    }
  }

  private _drawWeaponIcon(g: Graphics, weaponId: string, color: number): void {
    switch (weaponId) {
      case "fireball_ring":
        g.circle(0, 2, 7).fill({ color: 0xff6600, alpha: 0.8 });
        g.circle(0, 0, 5).fill({ color: 0xffcc00, alpha: 0.9 });
        g.circle(0, -2, 3).fill({ color: 0xffee88 });
        g.circle(0, -4, 1.5).fill({ color: 0xffffff, alpha: 0.7 });
        break;
      case "arrow_volley":
        g.moveTo(-8, 0).lineTo(6, 0).stroke({ color, width: 2 });
        g.moveTo(6, 0).lineTo(2, -4).lineTo(2, 4).closePath().fill({ color });
        g.moveTo(-8, 0).lineTo(-6, -3).stroke({ color: 0x8b4513, width: 1.5 });
        g.moveTo(-8, 0).lineTo(-6, 3).stroke({ color: 0x8b4513, width: 1.5 });
        break;
      case "lightning_chain":
        g.moveTo(-2, -8).lineTo(2, -2).lineTo(-1, -2).lineTo(3, 8).lineTo(-1, 1).lineTo(1, 1).lineTo(-2, -8)
          .fill({ color: 0xaaddff, alpha: 0.9 });
        g.moveTo(-1, -6).lineTo(1, -1).stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
        break;
      case "ice_nova":
        g.moveTo(0, -7).lineTo(0, 7).stroke({ color, width: 2 });
        g.moveTo(-6, -3.5).lineTo(6, 3.5).stroke({ color, width: 2 });
        g.moveTo(-6, 3.5).lineTo(6, -3.5).stroke({ color, width: 2 });
        g.circle(0, 0, 3).fill({ color: 0xffffff, alpha: 0.6 });
        break;
      case "holy_circle":
        g.circle(0, 0, 8).stroke({ color: 0xffd700, width: 2 });
        g.circle(0, 0, 4).fill({ color: 0xffd700, alpha: 0.4 });
        g.circle(0, 0, 1.5).fill({ color: 0xffffff, alpha: 0.7 });
        break;
      case "catapult_strike":
        g.circle(0, 1, 7).fill({ color: 0x886644 });
        g.circle(-2, -1, 2.5).fill({ color: 0x664433, alpha: 0.5 });
        g.circle(2, 2, 2).fill({ color: 0xaa8866, alpha: 0.5 });
        break;
      case "spinning_blade":
        g.rect(-2, -10, 4, 15).fill({ color: 0xcccccc });
        g.rect(-5, 3, 10, 2).fill({ color: 0x8b4513 });
        g.rect(-1, 5, 2, 3).fill({ color: 0x8b4513 });
        g.moveTo(0, -10).lineTo(-2, -8).lineTo(2, -8).closePath().fill({ color: 0xdddddd });
        // Gleam
        g.moveTo(-1, -8).lineTo(0, -4).stroke({ color: 0xffffff, width: 0.5, alpha: 0.5 });
        break;
      case "warp_field":
        g.circle(0, 0, 8).stroke({ color: 0x9944cc, width: 1.5, alpha: 0.6 });
        g.circle(0, 0, 5).stroke({ color: 0xbb66ee, width: 1.5, alpha: 0.8 });
        g.circle(0, 0, 2).fill({ color: 0xdd88ff });
        break;
      case "rune_circle":
        g.circle(0, 0, 8).stroke({ color, width: 1.5 });
        g.moveTo(-4, -4).lineTo(4, 4).stroke({ color, width: 1.5 });
        g.moveTo(4, -4).lineTo(-4, 4).stroke({ color, width: 1.5 });
        g.circle(0, 0, 2.5).fill({ color, alpha: 0.5 });
        break;
      case "soul_drain":
        g.circle(0, -2, 6).fill({ color: 0x44ff88, alpha: 0.7 });
        g.moveTo(-5, -2).lineTo(-5, 4).lineTo(-3, 2).lineTo(-1, 5).lineTo(1, 2).lineTo(3, 5).lineTo(5, 2).lineTo(5, -2)
          .fill({ color: 0x44ff88, alpha: 0.6 });
        g.circle(-2, -3, 1).fill({ color: 0xffffff });
        g.circle(2, -3, 1).fill({ color: 0xffffff });
        break;
      default:
        g.circle(0, 0, 7).fill({ color });
    }
  }

  private _showWeaponTooltip(weaponId: string, level: number, evolved: boolean, gx: number, gy: number): void {
    this._tooltipContent.removeChildren();
    const TT_W = 240;
    const TT_PAD = 12;
    let y = TT_PAD;

    const def = WEAPON_DEFS[weaponId as keyof typeof WEAPON_DEFS];
    if (!def) return;

    let evoDef: SurvivorEvolutionDef | undefined;
    if (evolved && def.evolutionId) {
      evoDef = EVOLUTION_DEFS[def.evolutionId];
    }

    // Name
    const nameStr = evoDef ? evoDef.name : def.name;
    const nameTag = evolved ? " [EVOLVED]" : ` Lv.${level}`;
    const name = new Text({
      text: nameStr + nameTag,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 13, fill: evolved ? GOLD_LIGHT : 0xffffff, fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 2, distance: 1, angle: Math.PI / 4 },
      }),
    });
    name.position.set(TT_PAD, y);
    this._tooltipContent.addChild(name);
    y += 20;

    // Decorative divider under name
    const nameDivider = new Graphics();
    drawSeparator(nameDivider, TT_PAD, y, TT_W - TT_PAD * 2);
    this._tooltipContent.addChild(nameDivider);
    y += 10;

    // Description
    const descStr = evoDef ? evoDef.description : def.description;
    const desc = new Text({
      text: descStr,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x99aabb, wordWrap: true, wordWrapWidth: TT_W - TT_PAD * 2 }),
    });
    desc.position.set(TT_PAD, y);
    this._tooltipContent.addChild(desc);
    y += desc.height + 10;

    // Stats divider
    const statsDivider = new Graphics();
    statsDivider.rect(TT_PAD, y, TT_W - TT_PAD * 2, 1).fill({ color: GOLD, alpha: 0.2 });
    this._tooltipContent.addChild(statsDivider);
    y += 8;

    // Stats
    if (evoDef) {
      y = this._addTooltipStat("DMG", `${evoDef.damage}`, y);
      if (evoDef.cooldown > 0) y = this._addTooltipStat("CD", `${evoDef.cooldown.toFixed(1)}s`, y);
      if (evoDef.area > 0) y = this._addTooltipStat("AREA", `${evoDef.area.toFixed(1)}`, y);
      y = this._addTooltipStat("COUNT", `${evoDef.count}`, y);
    } else {
      const dmg = def.baseDamage + def.damagePerLevel * (level - 1);
      const cd = Math.max(0.1, def.baseCooldown - def.cooldownPerLevel * (level - 1));
      const area = def.baseArea + def.areaPerLevel * (level - 1);
      const count = def.baseCount + def.countPerLevel * (level - 1);

      y = this._addTooltipStat("DMG", `${dmg}`, y);
      y = this._addTooltipStat("CD", `${cd.toFixed(1)}s`, y);
      if (area > 0) y = this._addTooltipStat("AREA", `${area.toFixed(1)}`, y);
      y = this._addTooltipStat("COUNT", `${count}`, y);
      if (def.basePierce > 0) y = this._addTooltipStat("PIERCE", `${def.basePierce}`, y);
      if (def.baseDuration > 0) y = this._addTooltipStat("DUR", `${def.baseDuration.toFixed(1)}s`, y);

      if (def.evolutionId && def.evolutionPassive) {
        y += 4;
        const passiveId = def.evolutionPassive;
        const passiveDef = PASSIVE_DEFS[passiveId];
        const evoHint = new Text({
          text: `Evolves with: ${passiveDef?.name ?? passiveId}`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x888899 }),
        });
        evoHint.position.set(TT_PAD, y);
        this._tooltipContent.addChild(evoHint);
        y += 14;
      }
    }

    const totalH = y + TT_PAD;
    this._tooltipBg.clear();
    // Shadow
    this._tooltipBg.roundRect(3, 3, TT_W, totalH, 6).fill({ color: 0x000000, alpha: 0.4 });
    // Main background
    drawMedievalFrame(this._tooltipBg, 0, 0, TT_W, totalH, 5);

    this._positionTooltip(gx, gy);
    this._tooltip.visible = true;
  }

  private _addTooltipStat(label: string, value: string, y: number): number {
    const TT_PAD = 12;
    const lbl = new Text({
      text: `${label}:`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x8899aa }),
    });
    lbl.position.set(TT_PAD, y);
    this._tooltipContent.addChild(lbl);

    const val = new Text({
      text: value,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: GOLD_LIGHT, fontWeight: "bold" }),
    });
    val.position.set(TT_PAD + 70, y);
    this._tooltipContent.addChild(val);
    return y + 16;
  }

  private _positionTooltip(gx: number, gy: number): void {
    const x = Math.max(4, Math.min(gx - 120, (this.container.parent?.width ?? 800) - 244));
    const y = Math.max(4, gy - this._tooltipBg.height - 16);
    this._tooltip.position.set(x, y);
  }

  private _updateBossHud(s: SurvivorState): void {
    const boss = s.enemies.find((e) => e.isBoss && e.alive);
    if (boss) {
      this._bossHpContainer.visible = true;
      const hpRatio = boss.hp / boss.maxHp;
      const fillW = 340 * hpRatio;
      this._bossHpBarFill.clear();
      if (fillW > 0) {
        this._bossHpBarFill
          .roundRect(0, 0, fillW, 18, 4).fill({ color: 0xcc2222 })
          // Highlight for gradient
          .rect(2, 2, Math.max(0, fillW - 4), 5).fill({ color: 0xff6644, alpha: 0.3 });
      }
      this._bossNameText.text = boss.displayName ?? boss.type.toUpperCase();
    } else {
      this._bossHpContainer.visible = false;
    }
  }

  private _updateBuffIndicators(s: SurvivorState): void {
    this._buffContainer.removeChildren();
    const buffs = s.activeLandmarkBuffs;
    if (buffs.size === 0) return;

    const BUFF_DEFS: { key: string; color: number; label: string; iconDraw: (g: Graphics) => void }[] = [
      {
        key: "sword_stone", color: 0xffd700, label: "Excalibur's Blessing",
        iconDraw: (g) => {
          g.rect(-1, -6, 2, 10).fill({ color: 0xcccccc });
          g.rect(-3, -2, 6, 2).fill({ color: 0xcccccc });
          g.rect(-2, 4, 4, 2).fill({ color: 0x8b4513 });
        },
      },
      {
        key: "chapel", color: 0x44ff44, label: "Lady's Grace",
        iconDraw: (g) => {
          g.rect(-1, -5, 2, 10).fill({ color: 0x44ff44 });
          g.rect(-4, -2, 8, 2).fill({ color: 0x44ff44 });
        },
      },
      {
        key: "archive", color: 0x6688ff, label: "Merlin's Wisdom",
        iconDraw: (g) => {
          g.roundRect(-4, -4, 8, 8, 1).fill({ color: 0x334499 });
          g.rect(-2, -3, 4, 1).fill({ color: 0xffffff });
          g.rect(-2, -1, 3, 1).fill({ color: 0xffffff });
        },
      },
      {
        key: "camelot_shield", color: 0x4488ff, label: "Shield of Camelot",
        iconDraw: (g) => {
          g.moveTo(0, -5).lineTo(4, -2).lineTo(3, 4).lineTo(0, 6).lineTo(-3, 4).lineTo(-4, -2).closePath()
            .fill({ color: 0x4488ff });
        },
      },
      {
        key: "wayland_fury", color: 0xff8844, label: "Wayland's Fury",
        iconDraw: (g) => {
          g.rect(-4, 2, 8, 3).fill({ color: 0x888888 });
          g.rect(-1, -5, 2, 7).fill({ color: 0x8b4513 });
          g.rect(-3, -6, 6, 3).fill({ color: 0x666666 });
        },
      },
      {
        key: "rider_swift", color: 0x44ddaa, label: "Rider's Swiftness",
        iconDraw: (g) => {
          g.moveTo(-4, -3).lineTo(-3, 4).lineTo(-1, 5).lineTo(1, 5).lineTo(3, 4).lineTo(4, -3)
            .stroke({ color: 0x44ddaa, width: 2 });
        },
      },
    ];

    let offsetX = 0;
    for (const def of BUFF_DEFS) {
      if (!buffs.has(def.key)) continue;

      const icon = new Container();

      // Background pill with medieval frame
      const bg = new Graphics();
      bg.roundRect(0, 0, 130, 22, 5)
        .fill({ color: PANEL_BG, alpha: 0.85 });
      bg.roundRect(0, 0, 130, 22, 5)
        .stroke({ color: def.color, width: 1.5, alpha: 0.6 });
      // Inner glow
      bg.roundRect(1, 1, 128, 20, 4)
        .stroke({ color: def.color, width: 0.5, alpha: 0.2 });
      icon.addChild(bg);

      // Icon glow
      const iconGlow = new Graphics();
      iconGlow.circle(12, 11, 8).fill({ color: def.color, alpha: 0.1 });
      icon.addChild(iconGlow);

      // Icon shape
      const iconGfx = new Graphics();
      iconGfx.position.set(12, 11);
      def.iconDraw(iconGfx);
      icon.addChild(iconGfx);

      // Label
      const label = new Text({
        text: def.label,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 9, fill: def.color, fontWeight: "bold",
          dropShadow: { color: 0x000000, blur: 1, distance: 1, angle: Math.PI / 4 },
        }),
      });
      label.position.set(24, 5);
      icon.addChild(label);

      icon.position.set(offsetX, 0);
      this._buffContainer.addChild(icon);
      offsetX += 138;
    }
  }
}
