// ---------------------------------------------------------------------------
// Exodus mode — polished HUD
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ExodusState } from "../state/ExodusState";
import { ExodusPhase, scoutCount, combatCapableMembers } from "../state/ExodusState";
import { ExodusPursuerSystem } from "../systems/ExodusPursuerSystem";
import { ExodusResourceSystem } from "../systems/ExodusResourceSystem";
import { ExodusConfig } from "../config/ExodusConfig";

const FONT = "Georgia, serif";

// Warm, medieval color scheme
const COL_GOLD = 0xdaa520;
const COL_GOLD_LIGHT = 0xffd700;
const COL_PANEL = 0x0a0805;
const COL_PANEL_BORDER = 0x3a2a1a;

const STYLE_TITLE = new TextStyle({ fontFamily: FONT, fontSize: 13, fill: COL_GOLD, fontWeight: "bold", letterSpacing: 3 });
const STYLE_DAY = new TextStyle({ fontFamily: FONT, fontSize: 20, fill: COL_GOLD_LIGHT, fontWeight: "bold" });
const STYLE_PHASE = new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0xccbbaa });
const STYLE_VALUE = new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0xeeddcc, fontWeight: "bold" });
const STYLE_CARAVAN = new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0xbbaa99 });
const STYLE_LOG = new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x998877, wordWrap: true, wordWrapWidth: 320 });
const STYLE_NOTIF = new TextStyle({ fontFamily: FONT, fontSize: 18, fill: COL_GOLD_LIGHT, fontWeight: "bold", align: "center" });
const STYLE_PURSUER = new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0xff6644, fontWeight: "bold" });
const STYLE_DISTANCE = new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0x66ddaa, fontWeight: "bold" });
const STYLE_FORECAST = new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0x887766, fontStyle: "italic" });

interface Notification { text: string; color: number; timer: number; maxTimer: number; }

export class ExodusHUD {
  readonly container = new Container();

  private _dayText = new Text({ text: "", style: STYLE_DAY });
  private _phaseText = new Text({ text: "", style: STYLE_PHASE });
  private _titleText = new Text({ text: "THE EXODUS", style: STYLE_TITLE });

  private _barGfx = new Graphics();
  private _foodLabel = new Text({ text: "", style: STYLE_VALUE });
  private _suppliesLabel = new Text({ text: "", style: STYLE_VALUE });
  private _moraleLabel = new Text({ text: "", style: STYLE_VALUE });
  private _hopeLabel = new Text({ text: "", style: STYLE_VALUE });
  private _foodForecast = new Text({ text: "", style: STYLE_FORECAST });

  private _caravanText = new Text({ text: "", style: STYLE_CARAVAN });
  private _pursuerText = new Text({ text: "", style: STYLE_PURSUER });
  private _distanceText = new Text({ text: "", style: STYLE_DISTANCE });
  private _relicText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0xdaa520 }) });
  private _upgradeText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x88cc88 }) });
  private _regionBanner = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0xccaa66, fontStyle: "italic" }) });

  private _logContainer = new Container();
  private _notifications: Notification[] = [];
  private _notifContainer = new Container();
  private _controlsHint = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x555544 }) });

  build(sw: number, sh: number): void {
    this.container.removeChildren();

    // --- Top bar backing ---
    const topBar = new Graphics();
    topBar.rect(0, 0, sw, 68).fill({ color: COL_PANEL, alpha: 0.55 });
    // Gold top border line
    topBar.moveTo(0, 68).lineTo(sw, 68).stroke({ color: COL_GOLD, width: 1, alpha: 0.2 });
    this.container.addChild(topBar);

    // Title
    this._titleText.anchor.set(0.5, 0);
    this._titleText.position.set(sw / 2, 3);
    this.container.addChild(this._titleText);

    this._dayText.anchor.set(0.5, 0);
    this._dayText.position.set(sw / 2, 18);
    this.container.addChild(this._dayText);

    this._phaseText.anchor.set(0.5, 0);
    this._phaseText.position.set(sw / 2, 42);
    this.container.addChild(this._phaseText);

    this._regionBanner.anchor.set(0.5, 0);
    this._regionBanner.position.set(sw / 2, 56);
    this.container.addChild(this._regionBanner);

    // Resource bars (top-left)
    this.container.addChild(this._barGfx);
    const bx = 12, by = 8;
    this._foodLabel.position.set(bx + 128, by - 1);
    this._suppliesLabel.position.set(bx + 128, by + 16);
    this._moraleLabel.position.set(bx + 128, by + 32);
    this._hopeLabel.position.set(bx + 128, by + 48);
    this._foodForecast.position.set(bx, by + 62);
    this.container.addChild(this._foodLabel, this._suppliesLabel, this._moraleLabel, this._hopeLabel, this._foodForecast);

    // Right side info
    this._caravanText.anchor.set(1, 0);
    this._caravanText.position.set(sw - 10, 8);
    this.container.addChild(this._caravanText);

    this._pursuerText.anchor.set(1, 0);
    this._pursuerText.position.set(sw - 10, 48);
    this.container.addChild(this._pursuerText);

    this._distanceText.anchor.set(1, 0);
    this._distanceText.position.set(sw - 10, 63);
    this.container.addChild(this._distanceText);

    this._relicText.anchor.set(1, 0);
    this._relicText.position.set(sw - 10, 78);
    this.container.addChild(this._relicText);

    this._upgradeText.anchor.set(1, 0);
    this._upgradeText.position.set(sw - 10, 90);
    this.container.addChild(this._upgradeText);

    // Log (bottom-left)
    const logBacking = new Graphics();
    logBacking.rect(0, sh - 140, 340, 140).fill({ color: COL_PANEL, alpha: 0.35 });
    this.container.addChild(logBacking);
    this._logContainer.position.set(8, sh - 132);
    this.container.addChild(this._logContainer);

    // Notifications
    this._notifContainer.position.set(sw / 2, sh * 0.28);
    this.container.addChild(this._notifContainer);

    // Controls hint (bottom-right, above minimap)
    this._controlsHint.anchor.set(1, 1);
    this._controlsHint.position.set(sw - 10, sh - 120);
    this.container.addChild(this._controlsHint);
  }

  update(state: ExodusState, sw: number, sh: number): void {
    this._dayText.text = `Day ${state.day}`;
    this._phaseText.text = this._phaseLabel(state.phase);

    // Resource bars
    const bx = 12, by = 8, bw = 115, bh = 11;
    this._barGfx.clear();
    this._drawBar(this._barGfx, bx, by, bw, bh, 0x66aa44, 0x88cc66, state.food / 120);
    this._drawBar(this._barGfx, bx, by + 16, bw, bh, 0x5577bb, 0x7799dd, state.supplies / 60);
    this._drawBar(this._barGfx, bx, by + 32, bw, bh, 0xbb7733, 0xdd9955, state.morale / 100);
    this._drawBar(this._barGfx, bx, by + 48, bw, bh, 0x8844cc, 0xaa66ee, state.hope / 100);

    this._foodLabel.text = `Food ${Math.floor(state.food)}`;
    this._suppliesLabel.text = `Supply ${Math.floor(state.supplies)}`;
    this._moraleLabel.text = `Morale ${Math.floor(state.morale)}`;
    this._hopeLabel.text = `Hope ${Math.floor(state.hope)}`;

    const fpd = ExodusResourceSystem.getFoodPerDay(state);
    const daysOfFood = fpd > 0 ? Math.floor(state.food / fpd) : 99;
    this._foodForecast.text = `~${daysOfFood}d of food | -${fpd}/day`;
    this._foodForecast.style.fill = daysOfFood <= 3 ? 0xff4444 : daysOfFood <= 6 ? 0xddaa44 : 0x887766;

    this._foodLabel.style.fill = state.food <= 15 ? 0xff4444 : 0xeeddcc;
    this._moraleLabel.style.fill = state.morale <= 25 ? 0xff4444 : 0xeeddcc;
    this._hopeLabel.style.fill = state.hope <= 20 ? 0xff4444 : 0xeeddcc;

    // Caravan
    const fighters = combatCapableMembers(state);
    const wounded = state.members.filter((m) => m.wounded).length;
    const refugees = state.members.filter((m) => m.role === "refugee").length;
    this._caravanText.text = `${state.members.length} souls | ${fighters.length} fighters${wounded > 0 ? ` | ${wounded} hurt` : ""}${refugees > 0 ? ` | ${refugees} ref` : ""}`;

    // Pursuer
    if (state.pursuer.active) {
      const dist = ExodusPursuerSystem.getDistanceToCaravan(state);
      const eta = Math.ceil(dist / Math.max(0.5, state.pursuer.speed));
      this._pursuerText.text = `Mordred: ${dist} hex (ETA ~${eta}d)`;
      this._pursuerText.style.fill = dist <= 3 ? 0xff0000 : dist <= 6 ? 0xff6644 : 0xcc6644;
    } else if (state.day >= ExodusConfig.PURSUER_START_DELAY - 1) {
      this._pursuerText.text = "Mordred stirs...";
      this._pursuerText.style.fill = 0x884444;
    } else {
      this._pursuerText.text = "";
    }

    this._distanceText.text = `Avalon: ${state.distanceToGoal} hex`;

    const region = ExodusConfig.REGION_DEFS[state.currentRegion];
    if (region) {
      this._regionBanner.text = region.name;
      this._regionBanner.style.fill = region.color;
    }

    this._relicText.text = state.relics.length > 0 ? state.relics.map((r) => r.name).join(" \u2022 ") : "";
    const built = state.upgrades.filter((u) => u.built);
    this._upgradeText.text = built.length > 0 ? built.map((u) => u.name).join(" \u2022 ") : "";

    // Phase-specific controls hint
    switch (state.phase) {
      case ExodusPhase.MARCH: this._controlsHint.text = "Click a highlighted hex to march  |  Esc = Menu"; break;
      case ExodusPhase.EVENT: this._controlsHint.text = "1-3 = Choose option  |  Esc = Menu"; break;
      case ExodusPhase.CAMP: this._controlsHint.text = "Enter = Break Camp  |  Esc = Menu"; break;
      case ExodusPhase.BATTLE: this._controlsHint.text = "F = Fight  |  R = Retreat  |  1-4 = Formation"; break;
      default: this._controlsHint.text = "Esc = Menu"; break;
    }

    this._updateLog(state);
  }

  showNotification(text: string, color: number): void {
    this._notifications.push({ text, color, timer: 3.5, maxTimer: 3.5 });
  }

  updateNotifications(dt: number): void {
    this._notifContainer.removeChildren();
    let yOff = 0;
    for (let i = this._notifications.length - 1; i >= 0; i--) {
      const n = this._notifications[i];
      n.timer -= dt;
      if (n.timer <= 0) { this._notifications.splice(i, 1); continue; }

      const fadeIn = Math.min(1, (n.maxTimer - n.timer) / 0.2);
      const fadeOut = n.timer < 0.5 ? n.timer / 0.5 : 1;
      const alpha = fadeIn * fadeOut;
      const scale = n.timer > n.maxTimer - 0.15 ? 1 + (n.maxTimer - n.timer) * 2.5 : 1;

      // Backing glow box
      const bg = new Graphics();
      const bgW = Math.max(180, n.text.length * 9);
      bg.roundRect(-bgW / 2, yOff - 16, bgW, 32, 5).fill({ color: 0x000000, alpha: alpha * 0.45 });
      bg.roundRect(-bgW / 2, yOff - 16, bgW, 32, 5).stroke({ color: n.color, width: 1, alpha: alpha * 0.35 });
      this._notifContainer.addChild(bg);

      const t = new Text({ text: n.text, style: { ...STYLE_NOTIF, fill: n.color } });
      t.anchor.set(0.5);
      t.alpha = alpha;
      t.scale.set(Math.min(1.12, scale));
      t.position.set(0, yOff);
      this._notifContainer.addChild(t);
      yOff -= 44;
    }
  }

  // -------------------------------------------------------------------------

  private _phaseLabel(phase: ExodusPhase): string {
    switch (phase) {
      case ExodusPhase.DAWN: return "Dawn";
      case ExodusPhase.MARCH: return "Choose your path";
      case ExodusPhase.EVENT: return "Encounter";
      case ExodusPhase.CAMP: return "Camp";
      case ExodusPhase.NIGHT: return "Night falls...";
      case ExodusPhase.BATTLE: return "BATTLE!";
      case ExodusPhase.GAME_OVER: return "The Exodus has ended";
      case ExodusPhase.VICTORY: return "AVALON!";
      default: return "";
    }
  }

  private _drawBar(gfx: Graphics, x: number, y: number, w: number, h: number, baseColor: number, highColor: number, fill: number): void {
    // Dark background
    gfx.roundRect(x, y, w, h, 3).fill({ color: 0x080808, alpha: 0.9 });
    // Inner shadow
    gfx.roundRect(x + 1, y + 1, w - 2, h - 2, 2).stroke({ color: 0x1a1a1a, width: 0.5, alpha: 0.5 });

    const fw = w * Math.min(1, Math.max(0, fill));
    if (fw > 1) {
      // Main fill
      gfx.roundRect(x + 1, y + 1, fw - 1, h - 2, 2).fill({ color: baseColor, alpha: 0.85 });
      // Top highlight (lighter half)
      gfx.roundRect(x + 1, y + 1, fw - 1, Math.ceil(h / 2) - 1, 2).fill({ color: highColor, alpha: 0.3 });
    }

    // Outer border (tinted)
    gfx.roundRect(x, y, w, h, 3).stroke({ color: baseColor, width: 1, alpha: 0.4 });

    // Quarter ticks
    for (let t = 0.25; t < 1; t += 0.25) {
      gfx.moveTo(x + w * t, y).lineTo(x + w * t, y + h).stroke({ color: 0x333333, width: 0.5, alpha: 0.5 });
    }
  }

  private _updateLog(state: ExodusState): void {
    this._logContainer.removeChildren();
    const recent = state.log.slice(-8);
    for (let i = 0; i < recent.length; i++) {
      const entry = recent[i];
      const t = new Text({
        text: `[${entry.day}] ${entry.text}`,
        style: { ...STYLE_LOG, fill: entry.color ?? 0x998877 },
      });
      t.position.set(0, i * 15);
      t.alpha = 0.25 + 0.75 * (i / recent.length);
      this._logContainer.addChild(t);
    }
  }

  cleanup(): void { this.container.removeChildren(); this._notifications = []; }
}
