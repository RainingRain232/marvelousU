// ---------------------------------------------------------------------------
// Caravan HUD — caravan HP, player HP, gold, segment progress, boss HP,
// encounter banner, notifications, dash cooldown
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { CaravanState } from "../state/CaravanState";
import { RELIC_POOL } from "../config/CaravanRelicDefs";

const STYLE_SMALL = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xcccccc });

export class CaravanHUD {
  readonly container = new Container();

  private _caravanHpBg!: Graphics;
  private _caravanHpFill!: Graphics;
  private _caravanHpText!: Text;
  private _playerHpBg!: Graphics;
  private _playerHpFill!: Graphics;
  private _playerHpText!: Text;
  private _goldText!: Text;
  private _segmentText!: Text;
  private _progressBg!: Graphics;
  private _progressFill!: Graphics;
  private _escortText!: Text;
  private _dashCooldownBg!: Graphics;
  private _dashCooldownFill!: Graphics;
  private _sprintCooldownBg!: Graphics;
  private _sprintCooldownFill!: Graphics;
  private _buffIndicator!: Graphics;

  // Boss HP bar
  private _bossHpContainer = new Container();
  private _bossHpBg!: Graphics;
  private _bossHpFill!: Graphics;
  private _bossNameText!: Text;

  // Ability display
  private _abilityGfx: Graphics | null = null;
  private _abilityTexts: { key: Text; cd: Text }[] | null = null;

  // Threat arrows
  private _threatArrows: Graphics | null = null;

  // Minimap
  private _minimapContainer = new Container();
  private _minimapBg!: Graphics;
  private _minimapDots!: Graphics;

  // Encounter counter
  private _waveText!: Text;

  // Encounter banner
  private _bannerText: Text | null = null;
  private _bannerTimer = 0;

  // Boss warning
  private _bossWarningText: Text | null = null;

  // Notifications
  private _notifications: { text: Text; lifetime: number }[] = [];

  build(sw: number, sh: number): void {
    this.container.removeChildren();
    this._bossHpContainer.removeChildren();

    // --- Caravan HP bar (top center, beveled) ---
    const chpW = 280;
    const chpY = 6;
    this._caravanHpBg = new Graphics();
    // Outer shadow
    this._caravanHpBg.roundRect(sw / 2 - chpW / 2 - 1, chpY - 1, chpW + 2, 22, 6).fill({ color: 0x000000, alpha: 0.3 });
    // Background
    this._caravanHpBg.roundRect(sw / 2 - chpW / 2, chpY, chpW, 20, 5).fill({ color: 0x221100 });
    // Inner bevel (darker bottom edge)
    this._caravanHpBg.roundRect(sw / 2 - chpW / 2 + 1, chpY + 12, chpW - 2, 7, 4).fill({ color: 0x110800, alpha: 0.4 });
    // Top highlight
    this._caravanHpBg.roundRect(sw / 2 - chpW / 2 + 2, chpY + 1, chpW - 4, 6, 4).fill({ color: 0x553311, alpha: 0.2 });
    // Border
    this._caravanHpBg.roundRect(sw / 2 - chpW / 2, chpY, chpW, 20, 5).stroke({ color: 0x885522, width: 1.5, alpha: 0.6 });
    // Corner ornaments
    this._caravanHpBg.moveTo(sw / 2 - chpW / 2 + 3, chpY + 3).lineTo(sw / 2 - chpW / 2 + 10, chpY + 3).stroke({ color: 0xaa7733, width: 1, alpha: 0.3 });
    this._caravanHpBg.moveTo(sw / 2 + chpW / 2 - 3, chpY + 3).lineTo(sw / 2 + chpW / 2 - 10, chpY + 3).stroke({ color: 0xaa7733, width: 1, alpha: 0.3 });

    this._caravanHpFill = new Graphics();
    this._caravanHpText = new Text({
      text: "Caravan",
      style: new TextStyle({ fontFamily: "serif", fontSize: 10, fill: 0xffeedd }),
    });
    this._caravanHpText.anchor.set(0.5, 0.5);
    this._caravanHpText.position.set(sw / 2, chpY + 10);
    this.container.addChild(this._caravanHpBg, this._caravanHpFill, this._caravanHpText);

    // --- Player HP bar (top left, beveled) ---
    const phpW = 180;
    this._playerHpBg = new Graphics();
    this._playerHpBg.roundRect(9, 7, phpW + 2, 16, 5).fill({ color: 0x000000, alpha: 0.3 });
    this._playerHpBg.roundRect(10, 8, phpW, 14, 4).fill({ color: 0x001a00 });
    this._playerHpBg.roundRect(11, 9, phpW - 2, 5, 3).fill({ color: 0x003300, alpha: 0.2 });
    this._playerHpBg.roundRect(10, 8, phpW, 14, 4).stroke({ color: 0x228822, width: 1, alpha: 0.5 });
    this._playerHpFill = new Graphics();
    this._playerHpText = new Text({
      text: "Hero",
      style: new TextStyle({ fontFamily: "serif", fontSize: 10, fill: 0xeeffee }),
    });
    this._playerHpText.anchor.set(0.5, 0.5);
    this._playerHpText.position.set(10 + phpW / 2, 15);
    this.container.addChild(this._playerHpBg, this._playerHpFill, this._playerHpText);

    // --- Cooldown bars (styled) ---
    // Dash
    this._dashCooldownBg = new Graphics();
    this._dashCooldownBg.roundRect(10, 26, 55, 6, 3).fill({ color: 0x111122, alpha: 0.7 });
    this._dashCooldownBg.roundRect(10, 26, 55, 6, 3).stroke({ color: 0x334455, width: 0.5 });
    const dashLabel = new Text({ text: "DASH", style: new TextStyle({ fontFamily: "serif", fontSize: 7, fill: 0x556677 }) });
    dashLabel.position.set(12, 27);
    this._dashCooldownFill = new Graphics();
    this.container.addChild(this._dashCooldownBg, this._dashCooldownFill, dashLabel);

    // Sprint
    this._sprintCooldownBg = new Graphics();
    this._sprintCooldownBg.roundRect(70, 26, 55, 6, 3).fill({ color: 0x111122, alpha: 0.7 });
    this._sprintCooldownBg.roundRect(70, 26, 55, 6, 3).stroke({ color: 0x334455, width: 0.5 });
    const sprintLabel = new Text({ text: "SPRINT", style: new TextStyle({ fontFamily: "serif", fontSize: 7, fill: 0x556677 }) });
    sprintLabel.position.set(72, 27);
    this._sprintCooldownFill = new Graphics();
    this.container.addChild(this._sprintCooldownBg, this._sprintCooldownFill, sprintLabel);

    // Buff indicator
    this._buffIndicator = new Graphics();
    this.container.addChild(this._buffIndicator);

    // Gold (top right)
    this._goldText = new Text({
      text: "Gold: 0",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xffd700, fontWeight: "bold" }),
    });
    this._goldText.anchor.set(1, 0);
    this._goldText.position.set(sw - 10, 8);
    this.container.addChild(this._goldText);

    // Escort count
    this._escortText = new Text({ text: "Escorts: 0", style: STYLE_SMALL });
    this._escortText.anchor.set(1, 0);
    this._escortText.position.set(sw - 10, 26);
    this.container.addChild(this._escortText);

    // Segment text
    this._segmentText = new Text({ text: "Segment 1/5", style: STYLE_SMALL });
    this._segmentText.anchor.set(1, 0);
    this._segmentText.position.set(sw - 10, 42);
    this.container.addChild(this._segmentText);

    // Boss HP bar (below caravan HP, hidden by default)
    this._bossHpBg = new Graphics();
    this._bossHpFill = new Graphics();
    this._bossNameText = new Text({
      text: "",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xffffff }),
    });
    this._bossNameText.anchor.set(0.5, 0.5);
    this._bossHpContainer.addChild(this._bossHpBg, this._bossHpFill, this._bossNameText);
    this._bossHpContainer.visible = false;
    this.container.addChild(this._bossHpContainer);

    // Cumulative progress bar (bottom, styled)
    const progH = 10;
    this._progressBg = new Graphics();
    // Shadow above progress bar
    this._progressBg.rect(0, sh - progH - 2, sw, 2).fill({ color: 0x000000, alpha: 0.2 });
    // Background
    this._progressBg.rect(0, sh - progH, sw, progH).fill({ color: 0x0a0a18 });
    // Inner texture lines
    for (let px = 0; px < sw; px += 6) {
      this._progressBg.rect(px, sh - progH, 1, progH).fill({ color: 0x111122, alpha: 0.3 });
    }
    // Top edge highlight
    this._progressBg.rect(0, sh - progH, sw, 1).fill({ color: 0x222244, alpha: 0.5 });
    this._progressFill = new Graphics();
    this.container.addChild(this._progressBg, this._progressFill);

    // Controls hint (bottom-left, above abilities)
    const controlsText = new Text({
      text: "WASD: move  SPACE: dash  SHIFT: sprint  F: parry  H: hold  R: rally  Q/E: abilities  X: speed",
      style: new TextStyle({ fontFamily: "serif", fontSize: 9, fill: 0x556666 }),
    });
    controlsText.position.set(10, sh - 22);
    this.container.addChild(controlsText);

    // Threat direction arrows
    this._threatArrows = new Graphics();
    this.container.addChild(this._threatArrows);

    // Minimap (top-right, ornamental frame)
    const mmW = 100;
    const mmH = 50;
    this._minimapContainer.removeChildren();
    this._minimapBg = new Graphics();
    // Outer shadow
    this._minimapBg.roundRect(-1, -1, mmW + 2, mmH + 2, 5).fill({ color: 0x000000, alpha: 0.3 });
    // Background
    this._minimapBg.roundRect(0, 0, mmW, mmH, 4).fill({ color: 0x0a0a18, alpha: 0.85 });
    // Inner vignette (darker edges)
    this._minimapBg.roundRect(1, 1, mmW - 2, 8, 3).fill({ color: 0x000000, alpha: 0.15 });
    this._minimapBg.roundRect(1, mmH - 9, mmW - 2, 8, 3).fill({ color: 0x000000, alpha: 0.15 });
    // Double border
    this._minimapBg.roundRect(0, 0, mmW, mmH, 4).stroke({ color: 0x445566, width: 1.5, alpha: 0.5 });
    this._minimapBg.roundRect(2, 2, mmW - 4, mmH - 4, 3).stroke({ color: 0x334455, width: 0.5, alpha: 0.3 });
    // Corner ornaments
    for (const [cx, cy, fx, fy] of [[3, 3, 1, 1], [mmW - 3, 3, -1, 1], [3, mmH - 3, 1, -1], [mmW - 3, mmH - 3, -1, -1]] as [number, number, number, number][]) {
      this._minimapBg.moveTo(cx, cy).lineTo(cx + 6 * fx, cy).stroke({ color: 0x667788, width: 1, alpha: 0.4 });
      this._minimapBg.moveTo(cx, cy).lineTo(cx, cy + 6 * fy).stroke({ color: 0x667788, width: 1, alpha: 0.4 });
    }
    // Title
    const mmTitle = new Text({ text: "MAP", style: new TextStyle({ fontFamily: "serif", fontSize: 7, fill: 0x556677, letterSpacing: 2 }) });
    mmTitle.anchor.set(0.5, 0);
    mmTitle.position.set(mmW / 2, 1);

    this._minimapDots = new Graphics();
    this._minimapContainer.addChild(this._minimapBg, this._minimapDots, mmTitle);
    this._minimapContainer.position.set(sw - mmW - 10, 60);
    this.container.addChild(this._minimapContainer);

    // Wave counter
    this._waveText = new Text({
      text: "",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x888899 }),
    });
    this._waveText.anchor.set(1, 0);
    this._waveText.position.set(sw - mmW - 14, 62);
    this.container.addChild(this._waveText);

    // Segment markers on progress bar
    const totalSegs = 5;
    for (let i = 1; i < totalSegs; i++) {
      const markerX = (i / totalSegs) * sw;
      const marker = new Graphics().rect(markerX - 1, sh - progH, 2, progH).fill({ color: 0x334455 });
      this.container.addChild(marker);
    }
  }

  update(s: CaravanState, sw: number, sh: number): void {
    // Clear ability graphics (redrawn each frame)
    if (this._abilityGfx) this._abilityGfx.clear();

    // Caravan HP (layered gradient fill)
    const chpW2 = 280;
    const chpY2 = 6;
    const chpRatio = Math.max(0, s.caravan.hp / s.caravan.maxHp);
    this._caravanHpFill.clear();
    if (chpRatio > 0) {
      const fw = chpW2 * chpRatio;
      const baseCol = chpRatio > 0.5 ? 0xcc8833 : chpRatio > 0.25 ? 0xcc5500 : 0xcc2200;
      const brightCol = chpRatio > 0.5 ? 0xeeaa55 : chpRatio > 0.25 ? 0xee7722 : 0xee4422;
      // Main fill
      this._caravanHpFill.roundRect(sw / 2 - chpW2 / 2 + 1, chpY2 + 2, fw - 2, 16, 4).fill({ color: baseCol });
      // Top highlight band
      this._caravanHpFill.roundRect(sw / 2 - chpW2 / 2 + 2, chpY2 + 3, fw - 4, 5, 3).fill({ color: brightCol, alpha: 0.4 });
      // Bottom shadow
      this._caravanHpFill.roundRect(sw / 2 - chpW2 / 2 + 2, chpY2 + 12, fw - 4, 4, 3).fill({ color: 0x000000, alpha: 0.15 });
    }
    const holdTag = s.holdPosition ? " [HOLD]" : "";
    this._caravanHpText.text = `Caravan ${Math.ceil(s.caravan.hp)}/${s.caravan.maxHp}${holdTag}`;

    // Player HP (layered gradient fill)
    const phpW2 = 180;
    const phpRatio = Math.max(0, s.player.hp / s.player.maxHp);
    this._playerHpFill.clear();
    if (phpRatio > 0) {
      const fw2 = phpW2 * phpRatio;
      const baseCol2 = phpRatio > 0.5 ? 0x44cc44 : phpRatio > 0.25 ? 0xbbaa00 : 0xcc4444;
      const brightCol2 = phpRatio > 0.5 ? 0x66ee66 : phpRatio > 0.25 ? 0xddcc22 : 0xee6666;
      this._playerHpFill.roundRect(11, 9, fw2 - 2, 12, 3).fill({ color: baseCol2 });
      this._playerHpFill.roundRect(12, 10, fw2 - 4, 4, 2).fill({ color: brightCol2, alpha: 0.35 });
      this._playerHpFill.roundRect(12, 16, fw2 - 4, 3, 2).fill({ color: 0x000000, alpha: 0.12 });
    }
    this._playerHpText.text = `Hero ${Math.ceil(s.player.hp)}/${s.player.maxHp}`;

    // Dash cooldown indicator
    this._dashCooldownFill.clear();
    if (s.player.dashCooldownTimer > 0) {
      const ratio = 1 - s.player.dashCooldownTimer / CaravanBalance.DASH_COOLDOWN;
      this._dashCooldownFill.roundRect(10, 26, 55 * ratio, 5, 2).fill({ color: 0x4488cc });
    } else {
      this._dashCooldownFill.roundRect(10, 26, 55, 5, 2).fill({ color: 0x44cc88 });
    }

    // Sprint cooldown indicator
    this._sprintCooldownFill.clear();
    if (s.sprintTimer > 0) {
      // Active sprint — green filling bar
      const ratio = s.sprintTimer / 2.0;
      this._sprintCooldownFill.roundRect(70, 26, 55 * ratio, 5, 2).fill({ color: 0x88ff44 });
    } else if (s.sprintCooldown > 0) {
      const ratio = 1 - s.sprintCooldown / 8.0;
      this._sprintCooldownFill.roundRect(70, 26, 55 * ratio, 5, 2).fill({ color: 0x886644 });
    } else {
      this._sprintCooldownFill.roundRect(70, 26, 55, 5, 2).fill({ color: 0x44cc88 });
    }

    // Buff indicator (war cry etc.)
    this._buffIndicator.clear();
    if (s.player.atkBuffTimer > 0) {
      this._buffIndicator.roundRect(10, 34, 8, 8, 2).fill({ color: 0xff8844, alpha: 0.6 });
      this._buffIndicator.roundRect(10, 34, 8, 8, 2).stroke({ color: 0xff8844, width: 1 });
    }

    // Ability cooldowns (bottom-left, above controls)
    if (s.player.abilities.length > 0) {
      // Draw ability boxes dynamically
      const abY = sh - 55;
      for (let i = 0; i < s.player.abilities.length; i++) {
        const ab = s.player.abilities[i];
        const abX = 10 + i * 70;
        const ready = ab.cooldownTimer <= 0;

        // Reuse a temporary graphics (clear each frame)
        if (!this._abilityGfx) {
          this._abilityGfx = new Graphics();
          this.container.addChild(this._abilityGfx);
        }

        // Outer glow when ready
        if (ready) {
          const pulse = 0.2 + Math.sin(s.gameTime * 3 + i) * 0.1;
          this._abilityGfx.roundRect(abX - 2, abY - 2, 64, 32, 6).fill({ color: ab.def.color, alpha: pulse * 0.15 });
        }
        // Background with bevel
        this._abilityGfx.roundRect(abX, abY, 60, 28, 4).fill({ color: ready ? 0x1a1a3a : 0x0e0e1e, alpha: 0.9 });
        // Top highlight
        this._abilityGfx.roundRect(abX + 1, abY + 1, 58, 8, 3).fill({ color: ready ? ab.def.color : 0x222233, alpha: ready ? 0.12 : 0.05 });
        // Border
        this._abilityGfx.roundRect(abX, abY, 60, 28, 4).stroke({ color: ready ? ab.def.color : 0x333344, width: ready ? 1.5 : 0.5, alpha: ready ? 0.7 : 0.3 });

        // Cooldown sweep
        if (!ready) {
          const ratio = ab.cooldownTimer / ab.def.cooldown;
          const fillW = 60 * (1 - ratio);
          this._abilityGfx.roundRect(abX + 1, abY + 1, fillW - 2, 26, 3).fill({ color: ab.def.color, alpha: 0.1 });
          // Sweep edge
          if (fillW > 3) {
            this._abilityGfx.rect(abX + fillW - 2, abY + 2, 2, 24).fill({ color: ab.def.color, alpha: 0.25 });
          }
        }
      }
    }

    // Ability text labels (only create once, update position)
    if (s.player.abilities.length > 0 && !this._abilityTexts) {
      this._abilityTexts = [];
      const abY = sh - 55;
      for (let i = 0; i < s.player.abilities.length; i++) {
        const ab = s.player.abilities[i];
        const abX = 10 + i * 70;
        const keyText = new Text({
          text: `[${ab.def.key}] ${ab.def.name}`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: ab.def.color }),
        });
        keyText.position.set(abX + 4, abY + 4);
        this.container.addChild(keyText);

        const cdText = new Text({
          text: "",
          style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0xaaaaaa }),
        });
        cdText.position.set(abX + 4, abY + 16);
        this.container.addChild(cdText);

        this._abilityTexts.push({ key: keyText, cd: cdText });
      }
    }

    // Update ability cooldown text
    if (this._abilityTexts) {
      for (let i = 0; i < s.player.abilities.length; i++) {
        const ab = s.player.abilities[i];
        const texts = this._abilityTexts[i];
        if (!texts) continue;
        if (ab.cooldownTimer <= 0) {
          texts.cd.text = "READY";
          texts.cd.style.fill = 0x44ff88;
        } else {
          texts.cd.text = `${ab.cooldownTimer.toFixed(1)}s`;
          texts.cd.style.fill = 0xaaaaaa;
        }
      }
    }

    // Gold
    this._goldText.text = `Gold: ${s.gold}`;

    // Escorts
    const aliveEscorts = s.escorts.filter((e) => e.alive).length;
    this._escortText.text = `Escorts: ${aliveEscorts}`;

    // Segment + streak + speed + time
    const streakStr = s.killStreak >= 3 ? ` x${s.killStreak}!` : "";
    const speedStr = s.timeScale > 1 ? ` [${s.timeScale}x]` : "";
    const mins = Math.floor(s.gameTime / 60);
    const secs = Math.floor(s.gameTime % 60);
    const segStr = s.difficulty === "endless" ? `Leg ${s.segment + 1}` : `Leg ${s.segment + 1}/${s.totalSegments}`;
    this._segmentText.text = `${segStr} | ${mins}:${secs.toString().padStart(2, "0")} | K:${s.totalKills}${streakStr}${speedStr}`;
    this._segmentText.style.fill = s.timeScale > 1 ? 0x88ccff : s.killStreak >= 5 ? 0xffaa44 : 0xcccccc;

    // Boss HP bar
    const boss = s.enemies.find((e) => e.alive && e.isBoss);
    if (boss) {
      this._bossHpContainer.visible = true;
      const bossW = 200;
      const bossY = 32;
      const bossRatio = Math.max(0, boss.hp / boss.maxHp);
      this._bossHpBg.clear();
      this._bossHpBg
        .roundRect(sw / 2 - bossW / 2, bossY, bossW, 14, 4).fill({ color: 0x330000 })
        .roundRect(sw / 2 - bossW / 2, bossY, bossW, 14, 4).stroke({ color: 0xaa4444, width: 1 });
      this._bossHpFill.clear();
      this._bossHpFill.roundRect(sw / 2 - bossW / 2, bossY, bossW * bossRatio, 14, 4).fill({ color: 0xff4444 });
      this._bossNameText.text = `${boss.displayName} ${Math.ceil(boss.hp)}/${boss.maxHp}`;
      this._bossNameText.position.set(sw / 2, bossY + 7);
    } else {
      this._bossHpContainer.visible = false;
    }

    // Cumulative progress bar (layered gradient fill)
    const progH = 10;
    const totalProgress = (s.segment + s.segmentProgress / s.segmentLength) / s.totalSegments;
    this._progressFill.clear();
    if (totalProgress > 0) {
      const fw = sw * totalProgress;
      // Main fill
      this._progressFill.rect(0, sh - progH + 1, fw, progH - 1).fill({ color: 0x3366aa });
      // Top bright band
      this._progressFill.rect(0, sh - progH + 1, fw, 3).fill({ color: 0x5599dd, alpha: 0.5 });
      // Bottom dark band
      this._progressFill.rect(0, sh - 3, fw, 2).fill({ color: 0x1a3366, alpha: 0.4 });
      // Leading edge glow
      this._progressFill.rect(fw - 3, sh - progH + 1, 3, progH - 1).fill({ color: 0x88ccff, alpha: 0.3 });
    }

    // Minimap dots
    if (this._minimapDots) {
      this._minimapDots.clear();
      const mmW = 100;
      const mmH = 50;
      const scaleX = mmW / s.mapWidth;
      const scaleY = mmH / s.mapHeight;

      // Caravan (gold square)
      const cwx = s.caravan.position.x * scaleX;
      const cwy = s.caravan.position.y * scaleY;
      this._minimapDots.rect(cwx - 3, cwy - 2, 6, 4).fill({ color: 0xffd700 });

      // Player (white dot)
      const ppx = s.player.position.x * scaleX;
      const ppy = s.player.position.y * scaleY;
      this._minimapDots.circle(ppx, ppy, 2).fill({ color: 0xffffff });

      // Escorts (green dots)
      for (const esc of s.escorts) {
        if (!esc.alive) continue;
        this._minimapDots.circle(esc.position.x * scaleX, esc.position.y * scaleY, 1.5)
          .fill({ color: 0x44ff44 });
      }

      // Enemies (red dots, bosses larger)
      for (const e of s.enemies) {
        if (!e.alive) continue;
        const r = e.isBoss ? 2.5 : 1.2;
        const color = e.isBoss ? 0xff4400 : 0xff4444;
        this._minimapDots.circle(e.position.x * scaleX, e.position.y * scaleY, r)
          .fill({ color });
      }
    }

    // Threat direction arrows (point toward enemies far from caravan)
    if (this._threatArrows) {
      this._threatArrows.clear();
      const cx = s.caravan.position.x;
      const cy = s.caravan.position.y;
      // Find enemy clusters that are far away
      const farEnemies: { dx: number; dy: number; count: number }[] = [];
      for (const e of s.enemies) {
        if (!e.alive) continue;
        const edx = e.position.x - cx;
        const edy = e.position.y - cy;
        const ed = Math.sqrt(edx * edx + edy * edy);
        if (ed > 5) { // only show arrows for distant enemies
          farEnemies.push({ dx: edx, dy: edy, count: 1 });
        }
      }
      if (farEnemies.length > 0) {
        // Average direction
        let avgDx = 0, avgDy = 0;
        for (const fe of farEnemies) { avgDx += fe.dx; avgDy += fe.dy; }
        const len = Math.sqrt(avgDx * avgDx + avgDy * avgDy);
        if (len > 0.1) {
          avgDx /= len;
          avgDy /= len;
          // Draw arrow at screen edge
          const arrowX = sw / 2 + avgDx * (sw * 0.35);
          const arrowY = sh / 2 + avgDy * (sh * 0.35);
          // Clamp to screen
          const ax = Math.max(20, Math.min(sw - 20, arrowX));
          const ay = Math.max(30, Math.min(sh - 30, arrowY));
          // Arrow triangle pointing in direction
          const angle = Math.atan2(avgDy, avgDx);
          const size = 8;
          const alpha = Math.min(0.6, farEnemies.length * 0.1);
          this._threatArrows.moveTo(
            ax + Math.cos(angle) * size,
            ay + Math.sin(angle) * size,
          ).lineTo(
            ax + Math.cos(angle + 2.3) * size * 0.7,
            ay + Math.sin(angle + 2.3) * size * 0.7,
          ).lineTo(
            ax + Math.cos(angle - 2.3) * size * 0.7,
            ay + Math.sin(angle - 2.3) * size * 0.7,
          ).closePath().fill({ color: 0xff4444, alpha });
        }
      }
    }

    // Wave counter
    if (this._waveText) {
      const aliveEnemies = s.enemies.filter((e) => e.alive).length;
      this._waveText.text = aliveEnemies > 0
        ? `Wave ${s.encounterCount} | ${aliveEnemies} foes`
        : `Wave ${s.encounterCount}`;
    }

    // Relic icons (left side, below dash cooldown)
    if (s.relicIds.length > 0 && this._abilityGfx) {
      let relicY = 36;
      for (const rid of s.relicIds) {
        const relic = RELIC_POOL.find((r) => r.id === rid);
        if (!relic) continue;
        this._abilityGfx.circle(18, relicY, 6).fill({ color: relic.color, alpha: 0.4 });
        this._abilityGfx.circle(18, relicY, 6).stroke({ color: relic.color, width: 1 });
        relicY += 16;
      }
    }

    // Boss approach warning
    if (s.phase === "travel") {
      const progress = s.segmentProgress / s.segmentLength;
      const isBossSegment = (s.segment + 1) % 2 === 0;
      if (isBossSegment && progress > 0.65 && progress < 0.75 && !s.bossSpawnedThisSegment) {
        if (!this._bossWarningText) {
          this._bossWarningText = new Text({
            text: "BOSS APPROACHING...",
            style: new TextStyle({
              fontFamily: "monospace", fontSize: 16, fill: 0xff4444,
              fontWeight: "bold", stroke: { color: 0x000000, width: 3 },
            }),
          });
          this._bossWarningText.anchor.set(0.5, 0);
          this._bossWarningText.position.set(sw / 2, 52);
          this.container.addChild(this._bossWarningText);
        }
        this._bossWarningText.alpha = 0.5 + Math.sin(s.gameTime * 4) * 0.5;
      } else if (this._bossWarningText) {
        this.container.removeChild(this._bossWarningText);
        this._bossWarningText.destroy();
        this._bossWarningText = null;
      }
    }
  }

  showEncounterBanner(name: string, sw: number): void {
    if (this._bannerText) {
      this.container.removeChild(this._bannerText);
      this._bannerText.destroy();
    }
    this._bannerText = new Text({
      text: name,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 22, fill: 0xff4444,
        fontWeight: "bold", stroke: { color: 0x000000, width: 3 },
      }),
    });
    this._bannerText.anchor.set(0.5, 0);
    this._bannerText.position.set(sw / 2, 54);
    this.container.addChild(this._bannerText);
    this._bannerTimer = 2.5;
  }

  updateBanner(dt: number): void {
    if (this._bannerText && this._bannerTimer > 0) {
      this._bannerTimer -= dt;
      if (this._bannerTimer <= 0.5) {
        this._bannerText.alpha = Math.max(0, this._bannerTimer / 0.5);
      }
      if (this._bannerTimer <= 0) {
        this.container.removeChild(this._bannerText);
        this._bannerText.destroy();
        this._bannerText = null;
      }
    }
  }

  showNotification(msg: string, color: number, sw: number, sh: number): void {
    const text = new Text({
      text: msg,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 16, fill: color,
        fontWeight: "bold", stroke: { color: 0x000000, width: 2 },
      }),
    });
    text.anchor.set(0.5, 0.5);
    // Stack notifications with limit
    const yOffset = Math.min(this._notifications.length, 4) * 26;
    text.position.set(sw / 2, sh / 2 - 50 - yOffset);
    this.container.addChild(text);
    this._notifications.push({ text, lifetime: 2.0 });
  }

  updateNotifications(dt: number): void {
    for (let i = this._notifications.length - 1; i >= 0; i--) {
      const n = this._notifications[i];
      n.lifetime -= dt;
      n.text.position.y -= 15 * dt;
      if (n.lifetime <= 0.5) n.text.alpha = Math.max(0, n.lifetime / 0.5);
      if (n.lifetime <= 0) {
        this.container.removeChild(n.text);
        n.text.destroy();
        this._notifications.splice(i, 1);
      }
    }
  }

  cleanup(): void {
    if (this._bannerText) {
      this._bannerText.destroy();
      this._bannerText = null;
    }
    for (const n of this._notifications) n.text.destroy();
    this._notifications = [];
    this._abilityGfx = null;
    this._abilityTexts = null;
    if (this._bossWarningText) { this._bossWarningText.destroy(); this._bossWarningText = null; }
    this._minimapContainer.removeChildren();
    this.container.removeChildren();
  }
}

// Import needed for dash cooldown display
import { CaravanBalance } from "../config/CaravanBalanceConfig";
