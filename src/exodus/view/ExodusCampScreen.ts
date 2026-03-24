// ---------------------------------------------------------------------------
// Exodus mode — enhanced camp phase UI
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ExodusState } from "../state/ExodusState";
import { scoutCount } from "../state/ExodusState";
import { ExodusConfig } from "../config/ExodusConfig";
import { ExodusPursuerSystem } from "../systems/ExodusPursuerSystem";
import { ExodusResourceSystem } from "../systems/ExodusResourceSystem";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const FONT = "Georgia, serif";
const STYLE_TITLE = new TextStyle({ fontFamily: FONT, fontSize: 20, fill: 0xffd700, fontWeight: "bold" });
const STYLE_SUBTITLE = new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0xcccccc, fontStyle: "italic" });
const STYLE_SECTION = new TextStyle({ fontFamily: FONT, fontSize: 13, fill: 0xddaa44, fontWeight: "bold" });
const STYLE_INFO = new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0xbbbbbb });
const STYLE_GOOD = new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x44ff44 });

// ---------------------------------------------------------------------------
// ExodusCampScreen
// ---------------------------------------------------------------------------

export class ExodusCampScreen {
  readonly container = new Container();

  private _continueCallback: (() => void) | null = null;
  private _restCallback: (() => void) | null = null;
  private _craftCallback: (() => void) | null = null;
  private _forageCallback: (() => void) | null = null;
  private _scoutCallback: (() => void) | null = null;
  private _buildCallback: ((upgradeId: string) => void) | null = null;

  setContinueCallback(cb: () => void): void { this._continueCallback = cb; }
  setRestCallback(cb: () => void): void { this._restCallback = cb; }
  setCraftCallback(cb: () => void): void { this._craftCallback = cb; }
  setForageCallback(cb: () => void): void { this._forageCallback = cb; }
  setScoutCallback(cb: () => void): void { this._scoutCallback = cb; }
  setBuildCallback(cb: (upgradeId: string) => void): void { this._buildCallback = cb; }

  show(state: ExodusState, sw: number, sh: number): void {
    this.container.removeChildren();

    // Overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.78 });
    overlay.eventMode = "static";
    this.container.addChild(overlay);

    // Panel with double border
    const panelW = 660;
    const panelH = Math.min(sh * 0.85, 620);
    const panelX = (sw - panelW) / 2;
    const panelY = (sh - panelH) / 2;

    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 8).fill({ color: 0x0e0c08, alpha: 0.97 });
    panel.roundRect(panelX, panelY, panelW, panelH, 8).stroke({ color: 0xdaa520, width: 2, alpha: 0.6 });
    panel.roundRect(panelX + 3, panelY + 3, panelW - 6, panelH - 6, 7).stroke({ color: 0xdaa520, width: 1, alpha: 0.15 });
    // Corner ornaments
    for (const [cx, cy] of [[panelX + 8, panelY + 8], [panelX + panelW - 8, panelY + 8], [panelX + 8, panelY + panelH - 8], [panelX + panelW - 8, panelY + panelH - 8]]) {
      panel.circle(cx, cy, 3).fill({ color: 0xdaa520, alpha: 0.4 });
    }
    this.container.addChild(panel);

    // Scrollable content
    let y = panelY + 15;
    const lx = panelX + 20; // left column
    const rx = panelX + panelW / 2 + 10; // right column
    const colW = panelW / 2 - 30;

    // Title
    const title = new Text({ text: "Camp", style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, y);
    this.container.addChild(title);
    y += 25;

    const subtitle = new Text({ text: `Day ${state.day} — ${ExodusConfig.REGION_DEFS[state.currentRegion]?.name ?? "Unknown lands"}`, style: STYLE_SUBTITLE });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(sw / 2, y);
    this.container.addChild(subtitle);
    y += 25;

    // === LEFT COLUMN: Resources & Roster ===
    let ly = y;

    // Resources with forecasts
    this._addText("Resources", lx, ly, STYLE_SECTION); ly += 20;

    const foodPerDay = ExodusResourceSystem.getFoodPerDay(state);
    const daysOfFood = state.food > 0 ? Math.floor(state.food / foodPerDay) : 0;
    const foodColor = daysOfFood <= 3 ? 0xff4444 : daysOfFood <= 7 ? 0xffaa44 : 0x44ff44;
    this._addText(`  Food: ${Math.floor(state.food)} (${daysOfFood} days at current rate)`, lx, ly, new TextStyle({ fontFamily: FONT, fontSize: 11, fill: foodColor })); ly += 15;
    this._addText(`  Supplies: ${Math.floor(state.supplies)}`, lx, ly, STYLE_INFO); ly += 15;
    this._addText(`  Morale: ${Math.floor(state.morale)}/100`, lx, ly, new TextStyle({ fontFamily: FONT, fontSize: 11, fill: state.morale <= 25 ? 0xff4444 : 0xbbbbbb })); ly += 15;
    this._addText(`  Hope: ${Math.floor(state.hope)}/100`, lx, ly, new TextStyle({ fontFamily: FONT, fontSize: 11, fill: state.hope <= 20 ? 0xff4444 : 0xbbbbbb })); ly += 20;

    // Pursuer status
    if (state.pursuer.active) {
      const dist = ExodusPursuerSystem.getDistanceToCaravan(state);
      const pursuerColor = dist <= 3 ? 0xff2222 : dist <= 6 ? 0xff8844 : 0xaaaaaa;
      this._addText("Pursuer", lx, ly, STYLE_SECTION); ly += 18;
      this._addText(`  Mordred's Host: ${dist} hexes`, lx, ly, new TextStyle({ fontFamily: FONT, fontSize: 11, fill: pursuerColor, fontWeight: "bold" })); ly += 15;
      const eta = Math.ceil(dist / Math.max(1, state.pursuer.speed));
      this._addText(`  ETA: ~${eta} days`, lx, ly, new TextStyle({ fontFamily: FONT, fontSize: 10, fill: pursuerColor })); ly += 18;
    }

    // Distance to Avalon
    this._addText("Journey", lx, ly, STYLE_SECTION); ly += 18;
    this._addText(`  Distance to Avalon: ${state.distanceToGoal} hexes`, lx, ly, new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0x44ffaa })); ly += 15;
    this._addText(`  Hexes traveled: ${state.totalHexesTraveled}`, lx, ly, STYLE_INFO); ly += 20;

    // Roster
    this._addText("Caravan Roster", lx, ly, STYLE_SECTION); ly += 18;

    const roleCounts: Record<string, { total: number; wounded: number }> = {};
    for (const m of state.members) {
      if (!roleCounts[m.role]) roleCounts[m.role] = { total: 0, wounded: 0 };
      roleCounts[m.role].total++;
      if (m.wounded) roleCounts[m.role].wounded++;
    }

    const roleOrder = ["knight", "soldier", "archer", "healer", "scout", "craftsman", "peasant", "refugee"];
    const roleColors: Record<string, number> = {
      knight: 0xddaa44, soldier: 0xaaaaaa, archer: 0x88cc88, healer: 0x88aaff,
      scout: 0xaacc88, craftsman: 0xccaa88, peasant: 0x888888, refugee: 0x777777,
    };

    for (const role of roleOrder) {
      const counts = roleCounts[role];
      if (!counts) continue;
      const wStr = counts.wounded > 0 ? ` (${counts.wounded} wounded)` : "";
      this._addText(`  ${role}: ${counts.total}${wStr}`, lx, ly, new TextStyle({ fontFamily: FONT, fontSize: 10, fill: roleColors[role] ?? 0xaaaaaa }));
      ly += 14;
    }
    ly += 5;
    this._addText(`  Total: ${state.members.length} souls`, lx, ly, new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0xffffff, fontWeight: "bold" }));

    // === RIGHT COLUMN: Actions & Upgrades ===
    let ry = y;

    this._addText("Camp Actions", rx, ry, STYLE_SECTION); ry += 22;

    // Rest
    ry = this._addActionButton("Rest (+1 day)", "Heal wounded, boost morale. Mordred advances.", rx, ry, colW, true, () => this._restCallback?.());

    // Forage
    const hasPeasants = state.members.some((m) => m.role === "peasant" && !m.wounded);
    ry = this._addActionButton("Forage for Food (+1 day)", "Send peasants to search for food.", rx, ry, colW, hasPeasants, () => this._forageCallback?.());

    // Scout ahead
    const hasScouts = scoutCount(state) > 0;
    ry = this._addActionButton("Scout Ahead", "Reveal more of the map around you.", rx, ry, colW, hasScouts, () => this._scoutCallback?.());

    // Craft defenses
    const craftsmen = state.members.filter((m) => m.role === "craftsman" && !m.wounded);
    ry = this._addActionButton("Craft Defenses (-3 supplies)", "Build camp fortifications.", rx, ry, colW, craftsmen.length > 0 && state.supplies >= 3, () => this._craftCallback?.());

    ry += 10;

    // Upgrades
    const unbuilt = state.upgrades.filter((u) => !u.built);
    if (unbuilt.length > 0 && craftsmen.length > 0) {
      this._addText("Build Upgrade (-8 supplies)", rx, ry, STYLE_SECTION); ry += 20;

      for (const upgrade of unbuilt) {
        const canBuild = state.supplies >= 8;
        ry = this._addActionButton(
          upgrade.name,
          `${upgrade.description} — ${upgrade.effect}`,
          rx, ry, colW, canBuild,
          () => this._buildCallback?.(upgrade.id),
        );
      }
    }

    // Built upgrades
    const built = state.upgrades.filter((u) => u.built);
    if (built.length > 0) {
      ry += 5;
      this._addText("Active Upgrades", rx, ry, STYLE_SECTION); ry += 18;
      for (const u of built) {
        this._addText(`  \u2713 ${u.name}`, rx, ry, STYLE_GOOD);
        ry += 14;
      }
    }

    // Relics
    if (state.relics.length > 0) {
      ry += 5;
      this._addText("Relics", rx, ry, STYLE_SECTION); ry += 18;
      for (const relic of state.relics) {
        this._addText(`  ${relic.name} — ${relic.effect}`, rx, ry, new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0xffd700 }));
        ry += 14;
      }
    }

    // Last battle result
    if (state.lastBattleResult) {
      const lbl = state.lastBattleResult === "victory" ? "Last Battle: Victory!"
        : state.lastBattleResult === "retreat" ? "Last Battle: Retreat" : "Last Battle: Defeat";
      const color = state.lastBattleResult === "victory" ? 0x44ff44 : state.lastBattleResult === "retreat" ? 0xffaa44 : 0xff4444;
      ry += 5;
      this._addText(lbl, rx, ry, new TextStyle({ fontFamily: FONT, fontSize: 11, fill: color, fontWeight: "bold" }));
    }

    // === BREAK CAMP BUTTON (bottom center) ===
    const btnY = panelY + panelH - 52;
    const btnW = 200;
    const btn = this._makeButton("Break Camp  [Enter]", sw / 2 - btnW / 2, btnY, btnW, 34, 0xdaa520, () => {
      this._continueCallback?.();
    });
    this.container.addChild(btn);

    // Controls hint
    this._addText("Esc = Pause Menu", sw / 2 - 40, btnY + 38, new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0x555544, fontStyle: "italic" }));
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private _addText(text: string, x: number, y: number, style: TextStyle): void {
    const t = new Text({ text, style });
    t.position.set(x, y);
    this.container.addChild(t);
  }

  private _addActionButton(label: string, desc: string, x: number, y: number, w: number, enabled: boolean, onClick: () => void): number {
    const h = 42;
    const bg = new Graphics();
    bg.roundRect(x, y, w, h, 4);
    bg.fill({ color: enabled ? 0x1a1a2a : 0x111111, alpha: 0.9 });
    bg.stroke({ color: enabled ? 0x555577 : 0x333333, width: 1 });
    this.container.addChild(bg);

    const lt = new Text({ text: label, style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: enabled ? 0xdddddd : 0x555555, fontWeight: "bold" }) });
    lt.position.set(x + 8, y + 4);
    this.container.addChild(lt);

    const dt = new Text({ text: desc, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: enabled ? 0x888888 : 0x444444, wordWrap: true, wordWrapWidth: w - 16 }) });
    dt.position.set(x + 8, y + 20);
    this.container.addChild(dt);

    if (enabled) {
      bg.eventMode = "static";
      bg.cursor = "pointer";
      bg.on("pointerover", () => {
        bg.clear();
        bg.roundRect(x, y, w, h, 4);
        bg.fill({ color: 0x2a2a4a, alpha: 0.9 });
        bg.stroke({ color: 0xdaa520, width: 2 });
      });
      bg.on("pointerout", () => {
        bg.clear();
        bg.roundRect(x, y, w, h, 4);
        bg.fill({ color: 0x1a1a2a, alpha: 0.9 });
        bg.stroke({ color: 0x555577, width: 1 });
      });
      bg.on("pointerdown", () => onClick());
    }

    return y + h + 6;
  }

  private _makeButton(label: string, x: number, y: number, w: number, h: number, borderColor: number, onClick: () => void): Container {
    const c = new Container();
    const bg = new Graphics();
    bg.roundRect(x, y, w, h, 4);
    bg.fill({ color: 0x2a2a1a, alpha: 0.9 });
    bg.stroke({ color: borderColor, width: 2 });
    c.addChild(bg);

    const t = new Text({ text: label, style: new TextStyle({ fontFamily: FONT, fontSize: 13, fill: borderColor, fontWeight: "bold" }) });
    t.anchor.set(0.5);
    t.position.set(x + w / 2, y + h / 2);
    c.addChild(t);

    bg.eventMode = "static";
    bg.cursor = "pointer";
    bg.on("pointerover", () => {
      bg.clear(); bg.roundRect(x, y, w, h, 4); bg.fill({ color: 0x3a3a2a, alpha: 0.9 }); bg.stroke({ color: 0xffd700, width: 2 });
    });
    bg.on("pointerout", () => {
      bg.clear(); bg.roundRect(x, y, w, h, 4); bg.fill({ color: 0x2a2a1a, alpha: 0.9 }); bg.stroke({ color: borderColor, width: 2 });
    });
    bg.on("pointerdown", () => onClick());

    return c;
  }

  hide(): void {
    this.container.removeChildren();
  }

  cleanup(): void {
    this._continueCallback = null;
    this._restCallback = null;
    this._craftCallback = null;
    this._forageCallback = null;
    this._scoutCallback = null;
    this._buildCallback = null;
    this.container.removeChildren();
  }
}
