// ---------------------------------------------------------------------------
// Shadowhand mode — polished pause menu
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ShadowhandState } from "../state/ShadowhandState";
import { ShadowhandConfig } from "../config/ShadowhandConfig";

const FONT = "Georgia, serif";
const COL = 0x44aa88;
const COL_DK = 0x224444;
const GOLD = 0xccaa66;

export class ShadowhandPauseMenu {
  readonly container = new Container();
  private _resumeCallback: (() => void) | null = null;
  private _quitCallback: (() => void) | null = null;

  setResumeCallback(cb: () => void): void { this._resumeCallback = cb; }
  setQuitCallback(cb: () => void): void { this._quitCallback = cb; }

  show(state: ShadowhandState, sw: number, sh: number): void {
    this.container.removeChildren();

    const ov = new Graphics();
    ov.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.82 });
    ov.eventMode = "static";
    this.container.addChild(ov);

    const pw = 480, ph = 460, px = (sw - pw) / 2, py = (sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x06080a, alpha: 0.97 });
    // Stone texture (matching guild/results screens)
    for (let row = 0; row < Math.ceil(ph / 18); row++) {
      const ry = py + row * 18;
      const offset = (row % 2) * 24;
      panel.moveTo(px + 10, ry).lineTo(px + pw - 10, ry).stroke({ color: COL, width: 0.3, alpha: 0.025 });
      for (let col = 0; col < Math.ceil(pw / 48) + 1; col++) {
        const ccx = px + col * 48 + offset;
        if (ccx > px + 8 && ccx < px + pw - 8) {
          panel.moveTo(ccx, ry).lineTo(ccx, ry + 18).stroke({ color: COL, width: 0.2, alpha: 0.02 });
        }
      }
    }
    // Borders
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: COL, width: 2, alpha: 0.5 });
    panel.roundRect(px + 3, py + 3, pw - 6, ph - 6, 9).stroke({ color: COL_DK, width: 0.5, alpha: 0.12 });
    // Corners with L-brackets
    for (const [cx, cy] of [[px + 10, py + 10], [px + pw - 10, py + 10], [px + 10, py + ph - 10], [px + pw - 10, py + ph - 10]]) {
      panel.circle(cx, cy, 3.5).fill({ color: COL, alpha: 0.35 });
      panel.circle(cx, cy, 1.5).fill({ color: COL, alpha: 0.6 });
      const dx = cx < sw / 2 ? 1 : -1, dy = cy < sh / 2 ? 1 : -1;
      panel.moveTo(cx, cy + dy * 8).lineTo(cx, cy).lineTo(cx + dx * 8, cy).stroke({ color: COL, width: 0.7, alpha: 0.2 });
    }
    this.container.addChild(panel);

    let y = py + 18;

    // Title with shadow
    this._text("PAUSED", sw / 2, y + 1, { fontSize: 26, fill: 0x000000, fontWeight: "bold", letterSpacing: 5 }, true);
    this._text("PAUSED", sw / 2, y, { fontSize: 26, fill: COL, fontWeight: "bold", letterSpacing: 5 }, true);
    y += 38;

    // Divider
    this._divider(px + 30, px + pw - 30, y);
    y += 14;

    // Guild status
    this._text("Guild Status", sw / 2, y, { fontSize: 13, fill: GOLD, fontWeight: "bold", letterSpacing: 1 }, true);
    y += 20;

    const heat = state.guild.heat.get("default") ?? 0;
    const stats: [string, string, number][] = [
      ["Gold", `${state.guild.gold}`, 0xffd700],
      ["Reputation", `${state.guild.reputation}`, 0x88aaff],
      ["Tier", `${state.guild.tier}`, GOLD],
      ["Heat", `${heat}/${ShadowhandConfig.MAX_HEAT}`, heat > 60 ? 0xff4444 : heat > 30 ? 0xffaa44 : 0x44aa44],
      ["Day", `${state.guild.day}`, 0xccddcc],
      ["Crew", `${state.guild.roster.filter(c => c.alive && !c.captured).length}/${state.guild.roster.length}`, 0x88ccaa],
      ["Streak", `${state.guild.currentStreak}`, state.guild.currentStreak >= 3 ? 0xffd700 : 0xccddcc],
      ["Upgrades", `${state.guild.upgrades.size}`, 0x88aacc],
    ];

    for (const [label, value, color] of stats) {
      this._text(label, px + 50, y, { fontSize: 10, fill: 0x778877 });
      const vt = this._text(value, px + pw - 50, y, { fontSize: 10, fill: color, fontWeight: "bold" });
      vt.anchor.set(1, 0);
      y += 16;
    }

    y += 6;
    this._divider(px + 30, px + pw - 30, y);
    y += 14;

    // Active heist info
    if (state.heist) {
      const h = state.heist;
      this._text("Current Heist", sw / 2, y, { fontSize: 13, fill: GOLD, fontWeight: "bold", letterSpacing: 1 }, true);
      y += 18;

      let lootVal = 0;
      for (const l of h.lootCollected) lootVal += l.value;
      const mins = Math.floor(h.elapsedTime / 60);
      const secs = Math.floor(h.elapsedTime % 60);

      const heistStats: [string, string, number][] = [
        ["Target", state.currentTarget?.name ?? "?", 0xccddcc],
        ["Time", `${mins}:${secs.toString().padStart(2, "0")}`, 0xccddcc],
        ["Loot", `${lootVal}g`, 0xffd700],
        ["Guards", `${h.guards.filter(g => g.sleepTimer <= 0 && g.stunTimer <= 0).length} active`, 0xffaa44],
      ];
      for (const [label, value, color] of heistStats) {
        this._text(label, px + 50, y, { fontSize: 10, fill: 0x778877 });
        const vt = this._text(value, px + pw - 50, y, { fontSize: 10, fill: color, fontWeight: "bold" });
        vt.anchor.set(1, 0);
        y += 15;
      }

      // Active modifiers
      if (h.modifiers.length > 0) {
        y += 4;
        this._text("Modifiers:", px + 50, y, { fontSize: 9, fill: 0x888877 });
        const modStr = h.modifiers.map(m => m.replace(/_/g, " ")).join(", ");
        this._text(modStr, px + 120, y, { fontSize: 9, fill: 0xaa8844 });
        y += 14;
      }
    }

    y += 8;
    this._divider(px + 30, px + pw - 30, y);
    y += 14;

    // Controls
    this._text("Controls", sw / 2, y, { fontSize: 13, fill: GOLD, fontWeight: "bold", letterSpacing: 1 }, true);
    y += 18;

    const controls: [string, string][] = [
      ["Click", "Move / interact"], ["Tab", "Switch thief"], ["C", "Crouch"],
      ["Space", "Pick lock"], ["E / Q", "Role abilities"], ["1-4", "Equipment"],
      ["+  /  -", "Speed"], ["Esc", "Resume"],
    ];
    for (const [key, desc] of controls) {
      // Key badge
      const keyG = new Graphics();
      const kw = 50;
      keyG.roundRect(px + 50, y - 1, kw, 13, 2).fill({ color: 0x0a0f0a, alpha: 0.6 });
      keyG.roundRect(px + 50, y - 1, kw, 13, 2).stroke({ color: COL_DK, width: 0.5 });
      this.container.addChild(keyG);
      this._text(key, px + 50 + kw / 2, y, { fontSize: 9, fill: COL, fontWeight: "bold" }, true);
      this._text(desc, px + 115, y, { fontSize: 9, fill: 0x888877 });
      y += 15;
    }
    y += 10;

    // Buttons
    this._fancyButton("RESUME", sw / 2 - 85, y, 170, 36, COL, () => this._resumeCallback?.());
    y += 46;
    this._fancyButton("QUIT", sw / 2 - 60, y, 120, 30, 0x884444, () => this._quitCallback?.());
  }

  hide(): void { this.container.removeChildren(); }

  private _text(str: string, x: number, y: number, opts: Partial<TextStyle>, center = false): Text {
    const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
    if (center) t.anchor.set(0.5, 0);
    t.position.set(x, y);
    this.container.addChild(t);
    return t;
  }

  private _divider(x1: number, x2: number, y: number): void {
    const g = new Graphics();
    const cx = (x1 + x2) / 2;
    g.moveTo(x1, y).lineTo(cx - 4, y).stroke({ color: COL, width: 0.5, alpha: 0.2 });
    g.moveTo(cx + 4, y).lineTo(x2, y).stroke({ color: COL, width: 0.5, alpha: 0.2 });
    g.circle(cx, y, 2).fill({ color: COL, alpha: 0.3 });
    this.container.addChild(g);
  }

  private _fancyButton(label: string, x: number, y: number, w: number, h: number, color: number, onClick: () => void): void {
    const g = new Graphics();
    g.roundRect(x, y, w, h, 5).fill({ color: 0x080a08, alpha: 0.85 });
    g.roundRect(x, y, w, h, 5).stroke({ color, width: 2, alpha: 0.6 });
    g.roundRect(x + 1, y + 1, w - 2, h / 2, 5).fill({ color: 0xffffff, alpha: 0.02 });
    g.eventMode = "static"; g.cursor = "pointer";
    g.on("pointerdown", onClick);
    this.container.addChild(g);
    this._text(label, x + w / 2, y + h / 2 - 7, { fontSize: 13, fill: color, fontWeight: "bold", letterSpacing: 2 }, true);
  }
}
