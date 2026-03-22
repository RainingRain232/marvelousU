// ---------------------------------------------------------------------------
// Shadowhand mode — guild hub screen (between heists)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ShadowhandState } from "../state/ShadowhandState";
import { CREW_ARCHETYPES, ALL_CREW_ROLES, type CrewRole } from "../config/CrewDefs";
import { TARGET_DEFS, type TargetDef } from "../config/TargetDefs";
import { getEquipmentForTier } from "../config/EquipmentDefs";
import { ShadowhandConfig } from "../config/ShadowhandConfig";

const FONT = "Georgia, serif";
const COL = 0x44aa88;
const COL_BG = 0x050808;

export class ShadowhandGuildScreen {
  readonly container = new Container();
  private _heistCallback: ((target: TargetDef, crewIds: string[], equipIds: string[]) => void) | null = null;
  private _exitCallback: (() => void) | null = null;
  private _recruitCallback: ((role: CrewRole) => void) | null = null;
  private _buyCallback: ((equipId: string) => void) | null = null;

  private _selectedTarget: TargetDef | null = null;
  private _selectedCrew: Set<string> = new Set();
  private _selectedEquip: Set<string> = new Set();
  private _tab: "mission" | "roster" | "shop" = "mission";

  setHeistCallback(cb: (target: TargetDef, crewIds: string[], equipIds: string[]) => void): void { this._heistCallback = cb; }
  setExitCallback(cb: () => void): void { this._exitCallback = cb; }
  setRecruitCallback(cb: (role: CrewRole) => void): void { this._recruitCallback = cb; }
  setBuyCallback(cb: (equipId: string) => void): void { this._buyCallback = cb; }

  show(state: ShadowhandState, sw: number, sh: number): void {
    this.container.removeChildren();
    this._selectedCrew.clear();
    this._selectedEquip.clear();

    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x040606 });
    this.container.addChild(bg);

    // Header
    const header = new Graphics();
    header.rect(0, 0, sw, 60).fill({ color: COL_BG, alpha: 0.8 });
    header.moveTo(0, 60).lineTo(sw, 60).stroke({ color: COL, width: 1, alpha: 0.3 });
    this.container.addChild(header);

    this._text("\u2620 THE SHADOWHAND GUILD \u2620", sw / 2, 8, { fontSize: 20, fill: COL, fontWeight: "bold", letterSpacing: 4 }, true);
    this._text(`Day ${state.guild.day}  |  Gold: ${state.guild.gold}  |  Rep: ${state.guild.reputation}  |  Tier: ${state.guild.tier}`, sw / 2, 36, { fontSize: 11, fill: 0x889988 }, true);

    // Heat bar
    const heat = state.guild.heat.get("default") ?? 0;
    const heatX = sw - 180, heatY = 10;
    this._text("Heat", heatX, heatY, { fontSize: 9, fill: 0x888877 });
    const heatBar = new Graphics();
    heatBar.rect(heatX + 35, heatY, 100, 10).fill({ color: 0x222222 });
    const heatFill = heat / ShadowhandConfig.MAX_HEAT;
    heatBar.rect(heatX + 35, heatY, 100 * heatFill, 10).fill({ color: heatFill > 0.7 ? 0xff3333 : heatFill > 0.4 ? 0xffaa33 : 0x44aa44 });
    this.container.addChild(heatBar);
    if (heat >= ShadowhandConfig.INQUISITOR_HEAT_THRESHOLD) {
      this._text("INQUISITION ALERT!", heatX + 35, heatY + 14, { fontSize: 8, fill: 0xff3333, fontWeight: "bold" });
    }

    // Tabs
    const tabs = ["mission", "roster", "shop"] as const;
    const tabW = 100, tabGap = 5, tabX = (sw - (tabW * 3 + tabGap * 2)) / 2;
    for (let i = 0; i < tabs.length; i++) {
      const tx = tabX + i * (tabW + tabGap);
      const sel = this._tab === tabs[i];
      this._tabButton(tabs[i].toUpperCase(), tx, 68, tabW, 28, sel, () => { this._tab = tabs[i]; this.show(state, sw, sh); });
    }

    const contentY = 105;

    if (this._tab === "mission") {
      this._drawMissionTab(state, sw, sh, contentY);
    } else if (this._tab === "roster") {
      this._drawRosterTab(state, sw, sh, contentY);
    } else {
      this._drawShopTab(state, sw, sh, contentY);
    }

    // Exit button
    this._button("EXIT TO MENU", sw - 130, sh - 40, 120, 30, 0x666655, () => this._exitCallback?.());
  }

  hide(): void { this.container.removeChildren(); }

  private _drawMissionTab(state: ShadowhandState, sw: number, sh: number, startY: number): void {
    let y = startY;
    this._text("Available Targets", sw / 2, y, { fontSize: 14, fill: 0xccaa88, fontWeight: "bold" }, true);
    y += 25;

    const maxTier = Math.min(state.guild.tier + 1, 5);
    const targets = TARGET_DEFS.filter(t => t.tier <= maxTier);
    const cardW = 200, cardH = 100, gap = 10;
    const perRow = Math.min(3, Math.floor((sw - 40) / (cardW + gap)));
    const rowX = (sw - (perRow * (cardW + gap) - gap)) / 2;

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const col = Math.floor(i % perRow);
      const row = Math.floor(i / perRow);
      const cx = rowX + col * (cardW + gap);
      const cy = y + row * (cardH + gap);
      const sel = this._selectedTarget?.id === t.id;
      const completed = state.guild.completedHeists.includes(t.id);

      const g = new Graphics();
      g.roundRect(cx, cy, cardW, cardH, 5).fill({ color: sel ? 0x0a1a0a : 0x080808, alpha: 0.8 });
      g.roundRect(cx, cy, cardW, cardH, 5).stroke({ color: sel ? t.color : completed ? 0x334433 : 0x333333, width: sel ? 2 : 1, alpha: 0.6 });
      g.eventMode = "static"; g.cursor = "pointer";
      g.on("pointerdown", () => { this._selectedTarget = t; this.show(state, sw, sh); });
      this.container.addChild(g);

      this._text(t.name, cx + cardW / 2, cy + 6, { fontSize: 12, fill: sel ? t.color : 0xaabbaa, fontWeight: "bold" }, true);
      this._text(`Tier ${t.tier}`, cx + cardW / 2, cy + 22, { fontSize: 9, fill: 0x888877 }, true);
      this._text(t.desc, cx + 8, cy + 36, { fontSize: 8, fill: 0x777766, wordWrap: true, wordWrapWidth: cardW - 16 });
      this._text(`Guards: ${t.guardCount[0]}-${t.guardCount[1]}`, cx + 8, cy + cardH - 22, { fontSize: 8, fill: 0x888877 });
      this._text(`Prize: ${t.primaryLoot.name}`, cx + 8, cy + cardH - 10, { fontSize: 8, fill: 0xffd700 });
      if (completed) {
        this._text("\u2713", cx + cardW - 18, cy + 6, { fontSize: 14, fill: 0x44aa44 });
      }
    }

    const targetRows = Math.ceil(targets.length / perRow);
    y += targetRows * (cardH + gap) + 15;

    // Crew selection
    if (this._selectedTarget) {
      this._text("Select Crew (up to 4)", sw / 2, y, { fontSize: 13, fill: 0xccaa88, fontWeight: "bold" }, true);
      y += 22;

      const aliveCrew = state.guild.roster.filter(c => c.alive && !c.captured);
      for (const crew of aliveCrew) {
        const arch = CREW_ARCHETYPES[crew.role];
        const sel = this._selectedCrew.has(crew.id);
        const cg = new Graphics();
        cg.roundRect(20, y, sw - 40, 24, 3).fill({ color: sel ? 0x0a1a0a : 0x080808, alpha: 0.7 });
        cg.roundRect(20, y, sw - 40, 24, 3).stroke({ color: sel ? arch.color : 0x333333, width: sel ? 1.5 : 0.5, alpha: 0.5 });
        cg.eventMode = "static"; cg.cursor = "pointer";
        cg.on("pointerdown", () => {
          if (sel) this._selectedCrew.delete(crew.id);
          else if (this._selectedCrew.size < ShadowhandConfig.MAX_CREW_SIZE) this._selectedCrew.add(crew.id);
          this.show(state, sw, sh);
        });
        this.container.addChild(cg);

        cg.circle(35, y + 12, 5).fill({ color: arch.color });
        this._text(`${crew.name} (${arch.name})`, 48, y + 4, { fontSize: 10, fill: sel ? arch.color : 0xaabbaa, fontWeight: sel ? "bold" : "normal" });
        this._text(`Lv${crew.level}  HP:${crew.hp}/${crew.maxHp}`, sw - 120, y + 4, { fontSize: 9, fill: 0x889988 });
        y += 28;
      }
      y += 10;

      // Launch heist button
      const canLaunch = this._selectedCrew.size > 0 && this._selectedTarget;
      this._button(
        canLaunch ? "LAUNCH HEIST" : "SELECT CREW",
        sw / 2 - 90, y, 180, 38,
        canLaunch ? COL : 0x555555,
        () => {
          if (canLaunch && this._selectedTarget) {
            this._heistCallback?.(this._selectedTarget, [...this._selectedCrew], [...this._selectedEquip]);
          }
        }
      );
    }
  }

  private _drawRosterTab(state: ShadowhandState, sw: number, sh: number, startY: number): void {
    let y = startY;
    this._text("Guild Roster", sw / 2, y, { fontSize: 14, fill: 0xccaa88, fontWeight: "bold" }, true);
    y += 25;

    for (const crew of state.guild.roster) {
      const arch = CREW_ARCHETYPES[crew.role];
      const alive = crew.alive && !crew.captured;

      const g = new Graphics();
      g.roundRect(30, y, sw - 60, 50, 5).fill({ color: 0x080808, alpha: 0.7 });
      g.roundRect(30, y, sw - 60, 50, 5).stroke({ color: alive ? arch.color : 0x442222, width: 1, alpha: 0.4 });
      this.container.addChild(g);

      g.circle(52, y + 25, 8).fill({ color: alive ? arch.color : 0x333333 });

      this._text(crew.name, 68, y + 5, { fontSize: 12, fill: alive ? arch.color : 0x666655, fontWeight: "bold" });
      this._text(arch.name, 68, y + 20, { fontSize: 10, fill: 0x889988 });
      this._text(arch.desc, 68, y + 34, { fontSize: 8, fill: 0x667766 });

      // Stats
      this._text(`Lv ${crew.level}`, sw - 180, y + 5, { fontSize: 10, fill: 0xaaccaa });
      this._text(`HP: ${crew.hp}/${crew.maxHp}`, sw - 180, y + 18, { fontSize: 9, fill: alive ? 0x88cc88 : 0x884444 });
      this._text(`XP: ${crew.xp}/${crew.level * 200}`, sw - 180, y + 31, { fontSize: 9, fill: 0x8888cc });

      if (!alive) {
        this._text(crew.captured ? "CAPTURED" : "DEAD", sw - 80, y + 18, { fontSize: 10, fill: 0xff4444, fontWeight: "bold" });
      }

      y += 56;
    }

    y += 15;

    // Recruit button
    if (state.guild.gold >= 100) {
      this._text("Recruit New Member (100g)", sw / 2, y, { fontSize: 11, fill: 0xccaa88 }, true);
      y += 20;

      const recruitW = 90, recruitGap = 8;
      const recruitX = (sw - (ALL_CREW_ROLES.length * (recruitW + recruitGap) - recruitGap)) / 2;
      for (let i = 0; i < ALL_CREW_ROLES.length; i++) {
        const role = ALL_CREW_ROLES[i];
        const arch = CREW_ARCHETYPES[role];
        const rx = recruitX + i * (recruitW + recruitGap);
        this._button(arch.name, rx, y, recruitW, 26, arch.color, () => this._recruitCallback?.(role));
      }
    } else {
      this._text("Need 100g to recruit", sw / 2, y, { fontSize: 10, fill: 0x666655 }, true);
    }
  }

  private _drawShopTab(state: ShadowhandState, sw: number, sh: number, startY: number): void {
    let y = startY;
    this._text("Equipment Shop", sw / 2, y, { fontSize: 14, fill: 0xccaa88, fontWeight: "bold" }, true);
    y += 25;

    // Current inventory
    this._text("Inventory", 40, y, { fontSize: 12, fill: 0xaaccaa, fontWeight: "bold" });
    y += 18;
    if (state.guild.inventory.length === 0) {
      this._text("Empty", 50, y, { fontSize: 10, fill: 0x666655 });
      y += 16;
    } else {
      for (const item of state.guild.inventory) {
        this._text(`${item.id.replace(/_/g, " ")} (${item.uses > 0 ? `${item.uses} uses` : "\u221e"})`, 50, y, { fontSize: 10, fill: 0x99bbaa });
        y += 14;
      }
    }
    y += 15;

    // Shop
    this._text("Available Equipment", 40, y, { fontSize: 12, fill: 0xccaa88, fontWeight: "bold" });
    y += 18;

    const available = getEquipmentForTier(state.guild.tier);
    for (const equip of available) {
      const canAfford = state.guild.gold >= equip.cost;
      const g = new Graphics();
      g.roundRect(30, y, sw - 60, 32, 3).fill({ color: 0x080808, alpha: 0.6 });
      g.roundRect(30, y, sw - 60, 32, 3).stroke({ color: canAfford ? 0x444444 : 0x222222, width: 0.5 });
      this.container.addChild(g);

      this._text(equip.name, 42, y + 3, { fontSize: 10, fill: canAfford ? 0xaaccaa : 0x555555, fontWeight: "bold" });
      this._text(equip.desc, 42, y + 16, { fontSize: 8, fill: 0x667766 });
      this._text(`${equip.cost}g`, sw - 100, y + 3, { fontSize: 10, fill: canAfford ? 0xffd700 : 0x555544, fontWeight: "bold" });

      if (canAfford) {
        this._button("BUY", sw - 70, y + 2, 40, 20, 0x44aa88, () => this._buyCallback?.(equip.id));
      }

      y += 36;
    }
  }

  // -- helpers --

  private _text(str: string, x: number, y: number, opts: Partial<TextStyle>, center = false): Text {
    const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
    if (center) t.anchor.set(0.5, 0);
    t.position.set(x, y);
    this.container.addChild(t);
    return t;
  }

  private _button(label: string, x: number, y: number, w: number, h: number, color: number, onClick: () => void): void {
    const g = new Graphics();
    g.roundRect(x, y, w, h, 4).fill({ color: 0x0a0a0a, alpha: 0.8 });
    g.roundRect(x, y, w, h, 4).stroke({ color, width: 1.5, alpha: 0.6 });
    g.eventMode = "static"; g.cursor = "pointer";
    g.on("pointerdown", onClick);
    this.container.addChild(g);
    this._text(label, x + w / 2, y + h / 2 - 6, { fontSize: 10, fill: color, fontWeight: "bold" }, true);
  }

  private _tabButton(label: string, x: number, y: number, w: number, h: number, sel: boolean, onClick: () => void): void {
    const g = new Graphics();
    g.roundRect(x, y, w, h, 3).fill({ color: sel ? 0x0a1a0a : 0x080808, alpha: 0.8 });
    g.roundRect(x, y, w, h, 3).stroke({ color: sel ? COL : 0x444444, width: sel ? 2 : 1, alpha: 0.5 });
    g.eventMode = "static"; g.cursor = "pointer";
    g.on("pointerdown", onClick);
    this.container.addChild(g);
    this._text(label, x + w / 2, y + h / 2 - 6, { fontSize: 10, fill: sel ? COL : 0x888877, fontWeight: sel ? "bold" : "normal", letterSpacing: 1 }, true);
  }
}
