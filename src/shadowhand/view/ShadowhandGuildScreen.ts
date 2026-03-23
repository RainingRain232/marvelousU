// ---------------------------------------------------------------------------
// Shadowhand mode — guild hub screen (between heists)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ShadowhandState } from "../state/ShadowhandState";
import { CREW_ARCHETYPES, ALL_CREW_ROLES, type CrewRole } from "../config/CrewDefs";
import { TARGET_DEFS, type TargetDef } from "../config/TargetDefs";
import { getEquipmentForTier } from "../config/EquipmentDefs";
import { ShadowhandConfig } from "../config/ShadowhandConfig";
import { getAvailableUpgrades, type GuildUpgradeDef } from "../config/GuildUpgradeDefs";
import type { GuildUpgradeId } from "../state/ShadowhandState";

const FONT = "Georgia, serif";
const COL = 0x44aa88;
const COL_BG = 0x050808;

export class ShadowhandGuildScreen {
  readonly container = new Container();
  private _heistCallback: ((target: TargetDef, crewIds: string[], equipIds: string[]) => void) | null = null;
  private _exitCallback: (() => void) | null = null;
  private _recruitCallback: ((role: CrewRole) => void) | null = null;
  private _buyCallback: ((equipId: string) => void) | null = null;
  private _upgradeCallback: ((upgradeId: GuildUpgradeId) => void) | null = null;

  private _selectedTarget: TargetDef | null = null;
  private _selectedContractId: string | null = null;
  private _selectedCrew: Set<string> = new Set();
  private _selectedEquip: Set<string> = new Set();
  private _tab: "mission" | "roster" | "shop" | "upgrades" = "mission";

  setHeistCallback(cb: (target: TargetDef, crewIds: string[], equipIds: string[]) => void): void { this._heistCallback = cb; }
  setExitCallback(cb: () => void): void { this._exitCallback = cb; }
  setRecruitCallback(cb: (role: CrewRole) => void): void { this._recruitCallback = cb; }
  setBuyCallback(cb: (equipId: string) => void): void { this._buyCallback = cb; }
  setUpgradeCallback(cb: (upgradeId: GuildUpgradeId) => void): void { this._upgradeCallback = cb; }

  show(state: ShadowhandState, sw: number, sh: number): void {
    this.container.removeChildren();
    this._selectedCrew.clear();
    this._selectedEquip.clear();

    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x040606 });
    // Stone wall texture (horizontal brick courses)
    for (let row = 0; row < Math.ceil(sh / 18); row++) {
      const ry = row * 18;
      const offset = (row % 2) * 30;
      bg.moveTo(0, ry).lineTo(sw, ry).stroke({ color: 0x080a08, width: 0.5, alpha: 0.2 });
      for (let col = 0; col < Math.ceil(sw / 60) + 1; col++) {
        const cx = col * 60 + offset;
        bg.moveTo(cx, ry).lineTo(cx, ry + 18).stroke({ color: 0x080a08, width: 0.4, alpha: 0.15 });
      }
    }
    // Vignette
    for (let v = 0; v < 5; v++) {
      const inset = v * 50;
      bg.rect(0, 0, inset, sh).fill({ color: 0x000000, alpha: 0.025 });
      bg.rect(sw - inset, 0, inset, sh).fill({ color: 0x000000, alpha: 0.025 });
      bg.rect(0, 0, sw, inset).fill({ color: 0x000000, alpha: 0.015 });
      bg.rect(0, sh - inset, sw, inset).fill({ color: 0x000000, alpha: 0.015 });
    }
    // Heraldic shield (guild crest — centered, faded)
    const cx = sw / 2, cy = sh / 2;
    const crestA = 0.04;
    // Shield outline
    bg.moveTo(cx - 40, cy - 50).lineTo(cx + 40, cy - 50).lineTo(cx + 40, cy + 10).lineTo(cx, cy + 40).lineTo(cx - 40, cy + 10).closePath().stroke({ color: COL, width: 1.5, alpha: crestA });
    // Inner shield
    bg.moveTo(cx - 35, cy - 45).lineTo(cx + 35, cy - 45).lineTo(cx + 35, cy + 7).lineTo(cx, cy + 35).lineTo(cx - 35, cy + 7).closePath().fill({ color: COL, alpha: crestA * 0.3 });
    // Crossed daggers
    bg.moveTo(cx - 15, cy - 25).lineTo(cx + 15, cy + 15).stroke({ color: COL, width: 1, alpha: crestA * 2 });
    bg.moveTo(cx + 15, cy - 25).lineTo(cx - 15, cy + 15).stroke({ color: COL, width: 1, alpha: crestA * 2 });
    // Guild name arc
    bg.circle(cx, cy - 15, 25).stroke({ color: COL, width: 0.5, alpha: crestA * 1.5 });
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

    // Stats bar
    const statsY = 47;
    const streak = state.guild.currentStreak;
    if (streak > 0) {
      this._text(`Streak: ${streak}${streak >= 5 ? " \u{1F525}" : ""}`, sw / 2, statsY, { fontSize: 9, fill: streak >= 5 ? 0xffd700 : 0x889988 }, true);
    }
    // Achievements count
    this._text(`\u2605 ${state.guild.achievements.size}`, 20, statsY, { fontSize: 9, fill: 0xffd700 });

    // Tabs
    const tabs = ["mission", "roster", "shop", "upgrades"] as const;
    const tabW = 90, tabGap = 5, tabX = (sw - (tabW * tabs.length + tabGap * (tabs.length - 1))) / 2;
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
    } else if (this._tab === "shop") {
      this._drawShopTab(state, sw, sh, contentY);
    } else {
      this._drawUpgradesTab(state, sw, sh, contentY);
    }

    // Exit button
    this._button("EXIT TO MENU", sw - 130, sh - 40, 120, 30, 0x666655, () => this._exitCallback?.());
  }

  hide(): void { this.container.removeChildren(); }

  private _drawMissionTab(state: ShadowhandState, sw: number, sh: number, startY: number): void {
    let y = startY;

    // Guild news ticker
    if (state.guild.news.length > 0) {
      const newsG = new Graphics();
      newsG.roundRect(20, y, sw - 40, 14 * Math.min(state.guild.news.length, 3) + 8, 4).fill({ color: 0x0a0c0a, alpha: 0.5 });
      newsG.roundRect(20, y, sw - 40, 14 * Math.min(state.guild.news.length, 3) + 8, 4).stroke({ color: 0x334433, width: 0.5 });
      this.container.addChild(newsG);
      for (let ni = 0; ni < Math.min(state.guild.news.length, 3); ni++) {
        this._text(`\u25B8 ${state.guild.news[ni]}`, 30, y + 4 + ni * 14, { fontSize: 9, fill: 0x889988, fontStyle: "italic" });
      }
      y += 14 * Math.min(state.guild.news.length, 3) + 16;
    }

    // Active contracts
    if (state.guild.availableContracts.length > 0) {
      this._text("\u2620 Contracts", sw / 2, y, { fontSize: 13, fill: 0xffaa44, fontWeight: "bold", letterSpacing: 1 }, true);
      y += 20;
      for (const contract of state.guild.availableContracts.slice(0, 3)) {
        const cg = new Graphics();
        const isRescue = contract.isRescue;
        const isSel = this._selectedContractId === contract.id;
        const borderCol = isRescue ? 0xaa4444 : 0xaa8844;
        cg.roundRect(31, y + 1, sw - 60, 38, 4).fill({ color: 0x000000, alpha: 0.15 }); // shadow
        cg.roundRect(30, y, sw - 60, 38, 4).fill({ color: isSel ? 0x1a1a08 : isRescue ? 0x0a0808 : 0x0a0a06, alpha: 0.7 });
        cg.roundRect(30, y, sw - 60, 38, 4).stroke({ color: isSel ? 0xffcc44 : borderCol, width: isSel ? 2 : 1, alpha: isSel ? 0.7 : 0.4 });
        if (isSel) cg.moveTo(36, y + 2).lineTo(sw - 66, y + 2).stroke({ color: 0xffcc44, width: 1.5, alpha: 0.3 });
        cg.eventMode = "static"; cg.cursor = "pointer";
        cg.on("pointerdown", () => {
          this._selectedContractId = contract.id;
          // Auto-select the contract's target
          const target = TARGET_DEFS.find(t => t.id === contract.targetId);
          if (target) this._selectedTarget = target;
          this.show(state, sw, sh);
        });
        this.container.addChild(cg);
        if (isSel) this._text("\u2713", 34, y + 10, { fontSize: 14, fill: 0xffcc44 });
        this._text(contract.name, 50, y + 3, { fontSize: 10, fill: isSel ? 0xffcc44 : isRescue ? 0xff6644 : 0xccaa66, fontWeight: "bold" });
        this._text(contract.desc, 50, y + 16, { fontSize: 8, fill: 0x889977, wordWrap: true, wordWrapWidth: sw - 130 });
        this._text(`Day ${contract.expiresDay}`, sw - 80, y + 3, { fontSize: 8, fill: 0x888877 });
        if (contract.bonusGold > 0) this._text(`+${contract.bonusGold}g +${contract.bonusRep}rep`, sw - 80, y + 16, { fontSize: 7, fill: 0xffd700 });
        y += 44;
      }
      y += 8;
    }

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
      // Drop shadow
      g.roundRect(cx + 2, cy + 2, cardW, cardH, 5).fill({ color: 0x000000, alpha: 0.25 });
      // Card body
      g.roundRect(cx, cy, cardW, cardH, 5).fill({ color: sel ? 0x0a1a0a : 0x080808, alpha: 0.85 });
      g.roundRect(cx, cy, cardW, cardH, 5).stroke({ color: sel ? t.color : completed ? 0x334433 : 0x333333, width: sel ? 2.5 : 1, alpha: sel ? 0.7 : 0.4 });
      // Inner highlight on top
      if (sel) {
        g.moveTo(cx + 8, cy + 2).lineTo(cx + cardW - 8, cy + 2).stroke({ color: t.color, width: 1, alpha: 0.3 });
        g.roundRect(cx + 2, cy + 2, cardW - 4, cardH - 4, 4).stroke({ color: t.color, width: 0.5, alpha: 0.1 });
      }
      // Tier badge
      const tierColors = [0x555555, 0x44aa44, 0x44aacc, 0xcc8844, 0xff4444, 0xffd700];
      g.roundRect(cx + cardW - 30, cy + 3, 26, 14, 3).fill({ color: tierColors[t.tier] ?? 0x555555, alpha: 0.3 });
      g.eventMode = "static"; g.cursor = "pointer";
      g.on("pointerdown", () => { this._selectedTarget = t; this.show(state, sw, sh); });
      this.container.addChild(g);

      this._text(t.name, cx + cardW / 2, cy + 6, { fontSize: 12, fill: sel ? t.color : 0xaabbaa, fontWeight: "bold" }, true);
      this._text(`Tier ${t.tier}`, cx + cardW / 2, cy + 22, { fontSize: 9, fill: 0x888877 }, true);
      this._text(t.desc, cx + 8, cy + 36, { fontSize: 8, fill: 0x777766, wordWrap: true, wordWrapWidth: cardW - 16 });
      const hasIntel = state.guild.upgrades.has("intel_network");
      const guardStr = hasIntel ? `Guards: ~${Math.round((t.guardCount[0] + t.guardCount[1]) / 2)}` : `Guards: ???`;
      this._text(guardStr, cx + 8, cy + cardH - 22, { fontSize: 8, fill: hasIntel ? 0xaaaa44 : 0x666655 });
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
            // Store active contract for heist completion
            state.activeContractId = this._selectedContractId;
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

      // Role icon (polygon shape)
      const ix = 52, iy = y + 25, ic = alive ? arch.color : 0x333333;
      this._drawRoleIcon(g, ix, iy, 8, crew.role, ic);

      // Dead/captured: X overlay on icon
      if (!alive) {
        g.moveTo(ix - 5, iy - 5).lineTo(ix + 5, iy + 5).stroke({ color: 0xff4444, width: 2, alpha: 0.6 });
        g.moveTo(ix + 5, iy - 5).lineTo(ix - 5, iy + 5).stroke({ color: 0xff4444, width: 2, alpha: 0.6 });
      }

      this._text(crew.name, 70, y + 4, { fontSize: 12, fill: alive ? arch.color : 0x666655, fontWeight: "bold" });
      this._text(`${arch.name} — ${arch.desc}`, 70, y + 19, { fontSize: 8, fill: 0x778877, wordWrap: true, wordWrapWidth: sw - 280 });

      // Stats with visual bars
      const statX = sw - 190;
      this._text(`Lv ${crew.level}`, statX, y + 4, { fontSize: 10, fill: 0xaaccaa, fontWeight: "bold" });
      // HP bar
      const hpW = 80, hpH = 5;
      g.rect(statX, y + 18, hpW, hpH).fill({ color: 0x220000 });
      g.rect(statX, y + 18, hpW * (crew.hp / crew.maxHp), hpH).fill({ color: alive ? 0x44cc44 : 0x553333 });
      g.rect(statX, y + 18, hpW, hpH).stroke({ color: 0x333333, width: 0.5 });
      this._text(`${crew.hp}/${crew.maxHp}`, statX + hpW + 4, y + 16, { fontSize: 8, fill: 0x889988 });
      // XP bar
      const xpW = 80, xpNeeded = crew.level * 200;
      g.rect(statX, y + 28, xpW, 4).fill({ color: 0x111122 });
      g.rect(statX, y + 28, xpW * Math.min(1, crew.xp / xpNeeded), 4).fill({ color: 0x4444cc });
      g.rect(statX, y + 28, xpW, 4).stroke({ color: 0x222233, width: 0.5 });
      this._text(`XP ${crew.xp}/${xpNeeded}`, statX + xpW + 4, y + 26, { fontSize: 7, fill: 0x7777aa });

      // Abilities (small text)
      this._text(`E: ${arch.abilities[0] ?? "\u2014"}  Q: ${arch.abilities[1] ?? "\u2014"}`, 70, y + 36, { fontSize: 7, fill: 0x668866 });

      // Bonds with other crew
      const bondStrs: string[] = [];
      for (const other of state.guild.roster) {
        if (other.id === crew.id) continue;
        const key = [crew.id, other.id].sort().join("_");
        const bond = state.guild.bonds.get(key) ?? 0;
        if (bond > 0) bondStrs.push(`${other.name}(${bond})`);
      }
      if (bondStrs.length > 0) {
        this._text(`\u2764 Bonds: ${bondStrs.join(", ")}`, 70, y + 44, { fontSize: 7, fill: 0xcc8888 });
      }

      // Injury indicator
      if (crew.injured) {
        this._text("\u26A0 INJURED", sw - 75, y + 36, { fontSize: 8, fill: 0xff8844, fontWeight: "bold" });
      }

      if (!alive) {
        const statusColor = crew.captured ? 0xffaa44 : 0xff4444;
        const statusText = crew.captured ? "CAPTURED" : "DEAD";
        this._text(statusText, sw - 75, y + 4, { fontSize: 10, fill: statusColor, fontWeight: "bold" });
      }

      y += 60;
    }

    y += 15;

    // Rest button — free healing (costs 1 day)
    const injuredOrHurt = state.guild.roster.filter(c => c.alive && !c.captured && (c.hp < c.maxHp || c.injured));
    if (injuredOrHurt.length > 0) {
      this._button("REST (heal crew, +1 day)", sw / 2 - 90, y, 180, 24, 0x4488aa, () => {
        for (const cm of state.guild.roster) {
          if (cm.alive && !cm.captured) {
            cm.hp = Math.min(cm.maxHp, cm.hp + Math.floor(cm.maxHp * 0.5));
            cm.injured = false;
            cm.injuryPenalty = 0;
          }
        }
        state.guild.day++;
        this.show(state, sw, sh);
      });
      y += 30;
    }

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

    const SLOT_COLORS: Record<string, number> = { tool: 0xccaa44, consumable: 0x44aacc, armor: 0x8888cc, gadget: 0xcc8844 };
    const SLOT_ICONS: Record<string, string> = { tool: "\u{1F527}", consumable: "\u{1F4A7}", armor: "\u{1F6E1}", gadget: "\u2699" };
    const armoryDiscount = state.guild.upgrades.has("armory") ? 0.8 : 1.0;

    const available = getEquipmentForTier(state.guild.tier);
    for (const equip of available) {
      const cost = Math.floor(equip.cost * armoryDiscount);
      const canAfford = state.guild.gold >= cost;
      const slotCol = SLOT_COLORS[equip.slot] ?? 0x888888;
      const g = new Graphics();
      // Drop shadow
      g.roundRect(31, y + 1, sw - 60, 38, 4).fill({ color: 0x000000, alpha: 0.15 });
      // Card
      g.roundRect(30, y, sw - 60, 38, 4).fill({ color: 0x080808, alpha: 0.7 });
      g.roundRect(30, y, sw - 60, 38, 4).stroke({ color: canAfford ? slotCol : 0x222222, width: canAfford ? 1 : 0.5, alpha: canAfford ? 0.4 : 0.2 });
      // Slot color indicator bar (left edge)
      g.rect(30, y + 4, 3, 30).fill({ color: slotCol, alpha: canAfford ? 0.6 : 0.2 });
      this.container.addChild(g);

      // Slot icon
      this._text(SLOT_ICONS[equip.slot] ?? "\u25CF", 42, y + 5, { fontSize: 14, fill: slotCol });
      // Name + tier badge
      this._text(equip.name, 60, y + 3, { fontSize: 10, fill: canAfford ? 0xaaccaa : 0x555555, fontWeight: "bold" });
      this._text(`T${equip.tier}`, 60 + equip.name.length * 6.5, y + 4, { fontSize: 7, fill: 0x888877 });
      this._text(equip.desc, 60, y + 16, { fontSize: 8, fill: 0x778877 });
      this._text(`Uses: ${equip.uses > 0 ? equip.uses : "\u221e"}`, 60, y + 27, { fontSize: 7, fill: 0x667766 });
      // Cost (with discount if armory)
      const costStr = armoryDiscount < 1 ? `${cost}g (was ${equip.cost}g)` : `${cost}g`;
      this._text(costStr, sw - 110, y + 3, { fontSize: 10, fill: canAfford ? 0xffd700 : 0x555544, fontWeight: "bold" });

      if (canAfford) {
        this._button("BUY", sw - 70, y + 6, 40, 22, 0x44aa88, () => this._buyCallback?.(equip.id));
      }

      y += 44;
    }
  }

  // -- helpers --

  private _drawUpgradesTab(state: ShadowhandState, sw: number, _sh: number, startY: number): void {
    let y = startY;
    this._text("Guild Upgrades", sw / 2, y, { fontSize: 14, fill: 0xccaa88, fontWeight: "bold" }, true);
    y += 25;

    // Owned upgrades
    if (state.guild.upgrades.size > 0) {
      this._text("Owned", 40, y, { fontSize: 12, fill: 0x44aa88, fontWeight: "bold" });
      y += 16;
      for (const id of state.guild.upgrades) {
        this._text(`\u2713 ${id.replace(/_/g, " ")}`, 50, y, { fontSize: 10, fill: 0x66aa88 });
        y += 14;
      }
      y += 10;
    }

    // Available upgrades
    const available = getAvailableUpgrades(state.guild.tier, state.guild.upgrades);
    if (available.length === 0) {
      this._text("No upgrades available at current tier.", sw / 2, y, { fontSize: 10, fill: 0x666655 }, true);
    } else {
      this._text("Available", 40, y, { fontSize: 12, fill: 0xccaa88, fontWeight: "bold" });
      y += 18;

      for (const upg of available) {
        const canAfford = state.guild.gold >= upg.cost;
        const g = new Graphics();
        g.roundRect(30, y, sw - 60, 44, 4).fill({ color: 0x080808, alpha: 0.7 });
        g.roundRect(30, y, sw - 60, 44, 4).stroke({ color: canAfford ? upg.color : 0x333333, width: 1, alpha: 0.5 });
        this.container.addChild(g);

        // Color dot
        g.circle(48, y + 15, 6).fill({ color: upg.color, alpha: canAfford ? 0.8 : 0.3 });

        this._text(upg.name, 62, y + 4, { fontSize: 11, fill: canAfford ? upg.color : 0x555555, fontWeight: "bold" });
        this._text(upg.desc, 62, y + 18, { fontSize: 8, fill: 0x778877 });
        this._text(`${upg.cost}g`, sw - 100, y + 4, { fontSize: 11, fill: canAfford ? 0xffd700 : 0x555544, fontWeight: "bold" });

        if (canAfford) {
          this._button("BUY", sw - 70, y + 10, 40, 22, upg.color, () => this._upgradeCallback?.(upg.id));
        }

        y += 50;
      }
    }

    y += 15;

    // Achievements list (with descriptions)
    this._text("\u2605 Achievements", sw / 2, y, { fontSize: 12, fill: 0xffaa44, fontWeight: "bold" }, true);
    y += 18;

    const ACHIEVEMENT_DEFS: [string, string, number][] = [
      ["first_heist", "First Blood — Complete your first heist", 0x44aa44],
      ["ghost", "Ghost — Perfect escape with zero alerts", 0x88aaff],
      ["phantom", "Phantom of Camelot — 5 ghost heists", 0x6644cc],
      ["big_score", "Big Score — 1000+ points in one heist", 0xffd700],
      ["unstoppable", "Unstoppable — 5 heists in a row", 0xff8844],
      ["dragon_hoard", "Dragon's Hoard — 5000g total loot", 0xffaa44],
      ["speed_demon", "Speed Demon — Heist in under 60s", 0x44ccff],
      ["veteran", "Veteran — Crew reaches level 5", 0x88cc88],
      ["grail_thief", "Grail Thief — Steal from the Grail Vault", 0xffd700],
    ];

    for (const [id, desc, color] of ACHIEVEMENT_DEFS) {
      const earned = state.guild.achievements.has(id);
      this._text(earned ? "\u2605" : "\u2606", 40, y, { fontSize: 10, fill: earned ? color : 0x333333 });
      this._text(desc, 55, y, { fontSize: 8, fill: earned ? color : 0x444444 });
      y += 14;
    }
    y += 10;

    // Stats summary
    this._text("Guild Stats", sw / 2, y, { fontSize: 12, fill: 0xccaa88, fontWeight: "bold" }, true);
    y += 18;

    const stats: [string, string, number][] = [
      ["Heists Attempted", `${state.guild.totalHeistsAttempted}`, 0xccddcc],
      ["Heists Succeeded", `${state.guild.totalHeistsSucceeded}`, 0x44aa44],
      ["Success Rate", state.guild.totalHeistsAttempted > 0 ? `${Math.round(state.guild.totalHeistsSucceeded / state.guild.totalHeistsAttempted * 100)}%` : "N/A", 0x88aaff],
      ["Longest Streak", `${state.guild.longestStreak}`, 0xffd700],
      ["Total Loot", `${state.guild.totalLootValue}g`, 0xffd700],
      ["Perfect Heists", `${state.guild.perfectHeists}`, 0x44ff44],
    ];

    for (const [label, value, color] of stats) {
      this._text(label, 50, y, { fontSize: 9, fill: 0x778877 });
      const vt = this._text(value, sw - 50, y, { fontSize: 9, fill: color, fontWeight: "bold" });
      vt.anchor.set(1, 0);
      y += 14;
    }
  }

  private _drawRoleIcon(g: Graphics, cx: number, cy: number, r: number, role: string, color: number): void {
    // Background circle
    g.circle(cx, cy, r + 1).fill({ color: 0x111111, alpha: 0.5 });
    switch (role) {
      case "cutpurse": // Diamond
        g.moveTo(cx, cy - r).lineTo(cx + r * 0.7, cy).lineTo(cx, cy + r).lineTo(cx - r * 0.7, cy).closePath().fill({ color });
        g.moveTo(cx, cy - r).lineTo(cx + r * 0.3, cy - r * 0.3).lineTo(cx, cy).closePath().fill({ color: 0xffffff, alpha: 0.15 });
        break;
      case "sapmaster": // Hexagon gear
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + i * Math.PI / 3;
          if (i === 0) g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          else g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        g.closePath().fill({ color });
        g.circle(cx, cy, r * 0.4).fill({ color: 0x111111 }); // keyhole center
        break;
      case "shade": // 5-point star
        for (let i = 0; i < 5; i++) {
          const oa = -Math.PI / 2 + i * Math.PI * 2 / 5;
          const ia = oa + Math.PI / 5;
          if (i === 0) g.moveTo(cx + Math.cos(oa) * r, cy + Math.sin(oa) * r);
          else g.lineTo(cx + Math.cos(oa) * r, cy + Math.sin(oa) * r);
          g.lineTo(cx + Math.cos(ia) * r * 0.4, cy + Math.sin(ia) * r * 0.4);
        }
        g.closePath().fill({ color });
        break;
      case "brawler": // Shield
        g.moveTo(cx - r * 0.7, cy - r).lineTo(cx + r * 0.7, cy - r).lineTo(cx + r * 0.7, cy + r * 0.2);
        g.lineTo(cx, cy + r).lineTo(cx - r * 0.7, cy + r * 0.2).closePath().fill({ color });
        // Shield cross
        g.moveTo(cx, cy - r * 0.6).lineTo(cx, cy + r * 0.5).stroke({ color: 0xffffff, width: 1, alpha: 0.2 });
        g.moveTo(cx - r * 0.4, cy - r * 0.2).lineTo(cx + r * 0.4, cy - r * 0.2).stroke({ color: 0xffffff, width: 1, alpha: 0.2 });
        break;
      case "charlatan": // Theatre mask
        g.circle(cx - r * 0.25, cy - r * 0.1, r * 0.5).fill({ color });
        g.circle(cx + r * 0.25, cy - r * 0.1, r * 0.5).fill({ color });
        g.moveTo(cx - r * 0.3, cy + r * 0.15).bezierCurveTo(cx - r * 0.1, cy + r * 0.7, cx + r * 0.1, cy + r * 0.7, cx + r * 0.3, cy + r * 0.15).fill({ color });
        // Eye holes
        g.circle(cx - r * 0.25, cy - r * 0.2, r * 0.15).fill({ color: 0x111111 });
        g.circle(cx + r * 0.25, cy - r * 0.2, r * 0.15).fill({ color: 0x111111 });
        break;
      case "alchemist": // Flask
        g.moveTo(cx - r * 0.2, cy - r).lineTo(cx + r * 0.2, cy - r).lineTo(cx + r * 0.2, cy - r * 0.5);
        g.lineTo(cx + r * 0.7, cy + r * 0.3).lineTo(cx + r * 0.5, cy + r).lineTo(cx - r * 0.5, cy + r);
        g.lineTo(cx - r * 0.7, cy + r * 0.3).lineTo(cx - r * 0.2, cy - r * 0.5).closePath().fill({ color });
        // Liquid level
        g.rect(cx - r * 0.4, cy + r * 0.1, r * 0.8, r * 0.6).fill({ color: 0xffffff, alpha: 0.15 });
        break;
      default:
        g.circle(cx, cy, r).fill({ color });
    }
    // Border ring
    g.circle(cx, cy, r + 0.5).stroke({ color, width: 1, alpha: 0.3 });
  }

  private _text(str: string, x: number, y: number, opts: Partial<TextStyle>, center = false): Text {
    const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
    if (center) t.anchor.set(0.5, 0);
    t.position.set(x, y);
    this.container.addChild(t);
    return t;
  }

  private _button(label: string, x: number, y: number, w: number, h: number, color: number, onClick: () => void): void {
    const g = new Graphics();
    // Drop shadow
    g.roundRect(x + 1, y + 1, w, h, 4).fill({ color: 0x000000, alpha: 0.25 });
    // Body
    g.roundRect(x, y, w, h, 4).fill({ color: 0x0a0a0a, alpha: 0.85 });
    g.roundRect(x, y, w, h, 4).stroke({ color, width: 1.5, alpha: 0.6 });
    // Top highlight
    g.roundRect(x + 1, y + 1, w - 2, h / 2 - 1, 4).fill({ color: 0xffffff, alpha: 0.025 });
    g.eventMode = "static"; g.cursor = "pointer";
    g.on("pointerover", () => {
      g.alpha = 1.15;
      g.scale.set(1.02);
      g.position.set(-x * 0.02, -y * 0.02);
    });
    g.on("pointerout", () => {
      g.alpha = 1.0;
      g.scale.set(1.0);
      g.position.set(0, 0);
    });
    g.on("pointerdown", () => {
      g.alpha = 0.85;
      onClick();
      setTimeout(() => { g.alpha = 1.0; }, 100);
    });
    this.container.addChild(g);
    this._text(label, x + w / 2, y + h / 2 - 6, { fontSize: 10, fill: color, fontWeight: "bold", letterSpacing: 1 }, true);
  }

  private _tabButton(label: string, x: number, y: number, w: number, h: number, sel: boolean, onClick: () => void): void {
    const g = new Graphics();
    // Drop shadow
    if (sel) g.roundRect(x + 1, y + 1, w, h, 3).fill({ color: 0x000000, alpha: 0.2 });
    // Body
    g.roundRect(x, y, w, h, 3).fill({ color: sel ? 0x0a1a0a : 0x080808, alpha: 0.85 });
    g.roundRect(x, y, w, h, 3).stroke({ color: sel ? COL : 0x444444, width: sel ? 2 : 1, alpha: sel ? 0.6 : 0.3 });
    // Selected: top accent bar
    if (sel) {
      g.moveTo(x + 6, y + 1).lineTo(x + w - 6, y + 1).stroke({ color: COL, width: 2, alpha: 0.4 });
    }
    // Bottom highlight line for unselected (subtle)
    if (!sel) {
      g.moveTo(x + 4, y + h - 1).lineTo(x + w - 4, y + h - 1).stroke({ color: 0x333333, width: 0.5, alpha: 0.2 });
    }
    g.eventMode = "static"; g.cursor = "pointer";
    g.on("pointerover", () => { if (!sel) g.alpha = 1.2; });
    g.on("pointerout", () => { g.alpha = 1.0; });
    g.on("pointerdown", onClick);
    this.container.addChild(g);
    this._text(label, x + w / 2, y + h / 2 - 6, { fontSize: 10, fill: sel ? COL : 0x888877, fontWeight: sel ? "bold" : "normal", letterSpacing: 1 }, true);
  }
}
