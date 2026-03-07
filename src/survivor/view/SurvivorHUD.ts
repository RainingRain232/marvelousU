// ---------------------------------------------------------------------------
// Survivor HUD — HP/XP bars, timer, kills, gold, weapon icons, boss HP, notifications
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import { WEAPON_DEFS, EVOLUTION_DEFS, PASSIVE_DEFS } from "../config/SurvivorWeaponDefs";
import type { SurvivorEvolutionDef } from "../config/SurvivorWeaponDefs";
import type { SurvivorState } from "../state/SurvivorState";

const STYLE_HUD = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xffffff, fontWeight: "bold" });
const STYLE_HUD_SMALL = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xcccccc });
const DT = SurvivorBalance.SIM_TICK_MS / 1000;

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
  private _notifications: { text: Text; lifetime: number }[] = [];

  // Event banner
  private _eventBanner: Text | null = null;
  private _eventBannerTimer = 0;

  // Landmark buff indicators
  private _buffContainer = new Container();

  build(sw: number, sh: number): void {
    this.container.removeChildren();
    this._weaponHudContainer.removeChildren();
    this._bossHpContainer.removeChildren();

    // HP bar
    const hpY = 10;
    const hpW = 260;
    this._hpBarBg = new Graphics()
      .roundRect(10, hpY, hpW, 18, 5).fill({ color: 0x330000 })
      .roundRect(10, hpY, hpW, 18, 5).stroke({ color: 0x882222, width: 1 });
    this._hpBarFill = new Graphics();
    this._hpText = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xffffff }) });
    this._hpText.anchor.set(0.5, 0.5);
    this._hpText.position.set(10 + hpW / 2, hpY + 9);
    this.container.addChild(this._hpBarBg, this._hpBarFill, this._hpText);

    // XP bar
    const xpH = 8;
    this._xpBarBg = new Graphics().rect(0, sh - xpH, sw, xpH).fill({ color: 0x001122 });
    this._xpBarFill = new Graphics();
    this.container.addChild(this._xpBarBg, this._xpBarFill);

    // Timer
    this._timerText = new Text({ text: "00:00", style: new TextStyle({ fontFamily: "monospace", fontSize: 20, fill: 0xffffff, fontWeight: "bold" }) });
    this._timerText.anchor.set(0.5, 0);
    this._timerText.position.set(sw / 2, 8);
    this.container.addChild(this._timerText);

    // Kill count
    this._killText = new Text({ text: "Kills: 0", style: STYLE_HUD_SMALL });
    this._killText.anchor.set(1, 0);
    this._killText.position.set(sw - 10, 10);
    this.container.addChild(this._killText);

    // Gold
    this._goldHudText = new Text({ text: "Gold: 0", style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffd700 }) });
    this._goldHudText.anchor.set(1, 0);
    this._goldHudText.position.set(sw - 10, 26);
    this.container.addChild(this._goldHudText);

    // Level
    this._levelText = new Text({ text: "Lv.1", style: STYLE_HUD });
    this._levelText.position.set(10 + 260 + 8, 12);
    this.container.addChild(this._levelText);

    // Weapon icons
    this._weaponHudContainer.position.set(10, sh - 55);
    this.container.addChild(this._weaponHudContainer);

    // Boss HP bar
    const bossBarW = 300;
    this._bossHpBarBg = new Graphics()
      .roundRect(0, 0, bossBarW, 14, 4).fill({ color: 0x330000 })
      .roundRect(0, 0, bossBarW, 14, 4).stroke({ color: 0xff4444, width: 1 });
    this._bossHpBarFill = new Graphics();
    this._bossNameText = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xff6644, fontWeight: "bold" }) });
    this._bossNameText.anchor.set(0.5, 0);
    this._bossNameText.position.set(bossBarW / 2, -16);
    this._bossHpContainer.addChild(this._bossHpBarBg, this._bossHpBarFill, this._bossNameText);
    this._bossHpContainer.position.set((sw - bossBarW) / 2, 40);
    this._bossHpContainer.visible = false;
    this.container.addChild(this._bossHpContainer);

    // Landmark buff indicators (below HP bar)
    this._buffContainer.removeChildren();
    this._buffContainer.position.set(10, 34);
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
    const hpW = 260;
    const xpH = 8;

    // HP bar
    const hpColor = hpRatio > 0.5 ? 0xcc2222 : hpRatio > 0.25 ? 0xcc6600 : 0xff0000;
    this._hpBarFill.clear().roundRect(10, 10, hpW * hpRatio, 18, 5).fill({ color: hpColor });
    this._hpText.text = `${Math.ceil(s.player.hp)} / ${Math.ceil(s.player.maxHp)}`;

    // XP bar
    this._xpBarFill.clear().rect(0, sh - xpH, sw * xpRatio, xpH).fill({ color: 0x4488ff });

    // Timer
    const mins = Math.floor(s.gameTime / 60);
    const secs = Math.floor(s.gameTime % 60);
    this._timerText.text = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    // Kills & gold & level
    this._killText.text = `Kills: ${s.totalKills}`;
    this._goldHudText.text = `Gold: ${s.gold}`;
    this._levelText.text = `Lv.${s.level}`;

    // Weapon icons
    this._updateWeaponHud(s);

    // Boss HP
    this._updateBossHud(s);

    // Boss warning
    if (this._bossWarningTimer > 0) {
      this._bossWarningTimer -= DT;
      if (!this._bossWarning) {
        this._bossWarning = new Text({
          text: "BOSS INCOMING!",
          style: new TextStyle({ fontFamily: "monospace", fontSize: 24, fill: 0xff4444, fontWeight: "bold", letterSpacing: 3 }),
        });
        this._bossWarning.anchor.set(0.5, 0.5);
        this._bossWarning.position.set(sw / 2, 80);
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
    const text = new Text({
      text: msg,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 22, fill: color, fontWeight: "bold", letterSpacing: 2 }),
    });
    text.anchor.set(0.5, 0.5);
    text.position.set(sw / 2, sh * 0.25);
    this.container.addChild(text);
    this._notifications.push({ text, lifetime: 2.0 });
  }

  updateNotifications(dt: number): void {
    for (let i = this._notifications.length - 1; i >= 0; i--) {
      const n = this._notifications[i];
      n.lifetime -= dt;
      n.text.alpha = Math.min(1, n.lifetime / 0.5);
      n.text.position.y -= dt * 15;
      if (n.lifetime <= 0) {
        this.container.removeChild(n.text);
        n.text.destroy();
        this._notifications.splice(i, 1);
      }
    }
  }

  showEventBanner(name: string, color: number, sw: number): void {
    if (this._eventBanner) this._eventBanner.destroy();
    this._eventBanner = new Text({
      text: name,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 24, fill: color, fontWeight: "bold", letterSpacing: 4 }),
    });
    this._eventBanner.anchor.set(0.5, 0);
    this._eventBanner.position.set(sw / 2, 60);
    this.container.addChild(this._eventBanner);
    this._eventBannerTimer = 3;
  }

  updateEventBanner(dt: number): void {
    if (this._eventBannerTimer > 0) {
      this._eventBannerTimer -= dt;
      if (this._eventBannerTimer <= 0 && this._eventBanner) {
        this.container.removeChild(this._eventBanner);
        this._eventBanner.destroy();
        this._eventBanner = null;
      }
    }
  }

  cleanup(): void {
    this._notifications = [];
    if (this._eventBanner) { this._eventBanner.destroy(); this._eventBanner = null; }
  }

  private _updateWeaponHud(s: SurvivorState): void {
    const iconSize = 36;
    const gap = 4;

    // Check if icons need rebuilding (weapon added/removed/leveled/evolved)
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
    if (!needsRebuild) return;

    this._weaponHudContainer.removeChildren();
    this._weaponIcons.clear();
    this._tooltip.visible = false;

    for (let i = 0; i < s.weapons.length; i++) {
      const ws = s.weapons[i];
      const def = WEAPON_DEFS[ws.id];
      const icon = new Container();
      icon.eventMode = "static";
      icon.cursor = "pointer";

      const bg = new Graphics()
        .roundRect(0, 0, iconSize, iconSize, 4)
        .fill({ color: 0x1a1a2e, alpha: 0.85 })
        .roundRect(0, 0, iconSize, iconSize, 4)
        .stroke({ color: ws.evolved ? 0xffd700 : def.color, width: ws.evolved ? 2 : 1 });
      icon.addChild(bg);

      const dot = new Graphics().circle(iconSize / 2, iconSize / 2 - 4, 6).fill({ color: def.color });
      icon.addChild(dot);

      const lvl = new Text({
        text: ws.evolved ? "MAX" : `${ws.level}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: ws.evolved ? 0xffd700 : 0xaabbcc }),
      });
      lvl.anchor.set(0.5, 1);
      lvl.position.set(iconSize / 2, iconSize - 2);
      icon.addChild(lvl);

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

  private _showWeaponTooltip(weaponId: string, level: number, evolved: boolean, gx: number, gy: number): void {
    this._tooltipContent.removeChildren();
    const TT_W = 220;
    const TT_PAD = 10;
    let y = TT_PAD;

    const def = WEAPON_DEFS[weaponId as keyof typeof WEAPON_DEFS];
    if (!def) return;

    // Check if evolved and get evolution def
    let evoDef: SurvivorEvolutionDef | undefined;
    if (evolved && def.evolutionId) {
      evoDef = EVOLUTION_DEFS[def.evolutionId];
    }

    // Name
    const nameStr = evoDef ? evoDef.name : def.name;
    const nameTag = evolved ? " [EVOLVED]" : ` Lv.${level}`;
    const name = new Text({
      text: nameStr + nameTag,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: evolved ? 0xffd700 : 0xffffff, fontWeight: "bold" }),
    });
    name.position.set(TT_PAD, y);
    this._tooltipContent.addChild(name);
    y += 18;

    // Description
    const descStr = evoDef ? evoDef.description : def.description;
    const desc = new Text({
      text: descStr,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x99aabb, wordWrap: true, wordWrapWidth: TT_W - TT_PAD * 2 }),
    });
    desc.position.set(TT_PAD, y);
    this._tooltipContent.addChild(desc);
    y += desc.height + 8;

    // Divider
    const divider = new Graphics().rect(TT_PAD, y, TT_W - TT_PAD * 2, 1).fill({ color: 0xffd700, alpha: 0.3 });
    this._tooltipContent.addChild(divider);
    y += 6;

    // Stats
    if (evoDef) {
      // Evolved stats are fixed
      y = this._addTooltipStat("DMG", `${evoDef.damage}`, y);
      if (evoDef.cooldown > 0) y = this._addTooltipStat("CD", `${evoDef.cooldown.toFixed(1)}s`, y);
      if (evoDef.area > 0) y = this._addTooltipStat("AREA", `${evoDef.area.toFixed(1)}`, y);
      y = this._addTooltipStat("COUNT", `${evoDef.count}`, y);
    } else {
      // Computed stats for current level
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

      // Evolution hint
      if (def.evolutionId && def.evolutionPassive) {
        y += 4;
        const evoHint = new Text({
          text: `Evolves with: ${WEAPON_DEFS[weaponId as keyof typeof WEAPON_DEFS].evolutionPassive}`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x888899 }),
        });
        // Get the passive name from the ID
        const passiveId = def.evolutionPassive;
        const passiveDef = PASSIVE_DEFS[passiveId];
        evoHint.text = `Evolves with: ${passiveDef?.name ?? passiveId}`;
        evoHint.position.set(TT_PAD, y);
        this._tooltipContent.addChild(evoHint);
        y += 14;
      }
    }

    const totalH = y + TT_PAD;
    this._tooltipBg.clear()
      .roundRect(0, 0, TT_W, totalH, 6).fill({ color: 0x0d0d1e, alpha: 0.95 })
      .roundRect(0, 0, TT_W, totalH, 6).stroke({ color: 0xffd700, alpha: 0.55, width: 1.5 });

    this._positionTooltip(gx, gy);
    this._tooltip.visible = true;
  }

  private _addTooltipStat(label: string, value: string, y: number): number {
    const TT_PAD = 10;
    const lbl = new Text({
      text: `${label}:`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x8899aa }),
    });
    lbl.position.set(TT_PAD, y);
    this._tooltipContent.addChild(lbl);

    const val = new Text({
      text: value,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xffd700 }),
    });
    val.position.set(TT_PAD + 70, y);
    this._tooltipContent.addChild(val);
    return y + 16;
  }

  private _positionTooltip(gx: number, gy: number): void {
    // Position above cursor, clamped to screen
    const x = Math.max(4, Math.min(gx - 110, (this.container.parent?.width ?? 800) - 224));
    const y = Math.max(4, gy - this._tooltipBg.height - 16);
    this._tooltip.position.set(x, y);
  }

  private _updateBossHud(s: SurvivorState): void {
    const boss = s.enemies.find((e) => e.isBoss && e.alive);
    if (boss) {
      this._bossHpContainer.visible = true;
      const hpRatio = boss.hp / boss.maxHp;
      this._bossHpBarFill.clear().roundRect(0, 0, 300 * hpRatio, 14, 4).fill({ color: 0xff4444 });
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
          // Sword icon
          g.rect(-1, -6, 2, 10).fill({ color: 0xcccccc });
          g.rect(-3, -2, 6, 2).fill({ color: 0xcccccc });
          g.rect(-2, 4, 4, 2).fill({ color: 0x8b4513 });
        },
      },
      {
        key: "chapel", color: 0x44ff44, label: "Lady's Grace",
        iconDraw: (g) => {
          // Cross icon
          g.rect(-1, -5, 2, 10).fill({ color: 0x44ff44 });
          g.rect(-4, -2, 8, 2).fill({ color: 0x44ff44 });
        },
      },
      {
        key: "archive", color: 0x6688ff, label: "Merlin's Wisdom",
        iconDraw: (g) => {
          // Book icon
          g.roundRect(-4, -4, 8, 8, 1).fill({ color: 0x334499 });
          g.rect(-2, -3, 4, 1).fill({ color: 0xffffff });
          g.rect(-2, -1, 3, 1).fill({ color: 0xffffff });
        },
      },
      // Temporary landmark buffs
      {
        key: "camelot_shield", color: 0x4488ff, label: "Shield of Camelot",
        iconDraw: (g) => {
          // Shield icon
          g.moveTo(0, -5).lineTo(4, -2).lineTo(3, 4).lineTo(0, 6).lineTo(-3, 4).lineTo(-4, -2).closePath()
            .fill({ color: 0x4488ff });
        },
      },
      {
        key: "wayland_fury", color: 0xff8844, label: "Wayland's Fury",
        iconDraw: (g) => {
          // Anvil/hammer icon
          g.rect(-4, 2, 8, 3).fill({ color: 0x888888 });
          g.rect(-1, -5, 2, 7).fill({ color: 0x8b4513 });
          g.rect(-3, -6, 6, 3).fill({ color: 0x666666 });
        },
      },
      {
        key: "rider_swift", color: 0x44ddaa, label: "Rider's Swiftness",
        iconDraw: (g) => {
          // Horse shoe icon
          g.moveTo(-4, -3).lineTo(-3, 4).lineTo(-1, 5).lineTo(1, 5).lineTo(3, 4).lineTo(4, -3)
            .stroke({ color: 0x44ddaa, width: 2 });
        },
      },
    ];

    let offsetX = 0;
    for (const def of BUFF_DEFS) {
      if (!buffs.has(def.key)) continue;

      const icon = new Container();

      // Background pill
      const bg = new Graphics()
        .roundRect(0, 0, 120, 18, 4)
        .fill({ color: 0x0a0a18, alpha: 0.8 })
        .roundRect(0, 0, 120, 18, 4)
        .stroke({ color: def.color, width: 1, alpha: 0.6 });
      icon.addChild(bg);

      // Icon shape
      const iconGfx = new Graphics();
      iconGfx.position.set(10, 9);
      def.iconDraw(iconGfx);
      icon.addChild(iconGfx);

      // Label
      const label = new Text({
        text: def.label,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: def.color }),
      });
      label.position.set(20, 3);
      icon.addChild(label);

      icon.position.set(offsetX, 0);
      this._buffContainer.addChild(icon);
      offsetX += 126;
    }
  }
}
