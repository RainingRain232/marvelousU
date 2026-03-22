// ---------------------------------------------------------------------------
// Shadowhand mode — in-heist HUD (improved with crew names & ability hints)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ShadowhandState } from "../state/ShadowhandState";
import { CREW_ARCHETYPES } from "../config/CrewDefs";

const FONT = "Georgia, serif";
const COL = 0x44aa88;
const COL_BG = 0x050808;

const ROLE_ABILITY_HINTS: Record<string, [string, string]> = {
  cutpurse: ["E: Pickpocket", "Q: Throw coin"],
  sapmaster: ["E: Find secrets", "Space: Silent pick"],
  shade: ["E: Shadow meld", "Q: Extinguish torch"],
  brawler: ["E: Takedown", ""],
  charlatan: ["E: Disguise", "Q: Distract talk"],
  alchemist: ["E: Acid torch", ""],
};

export class ShadowhandHUD {
  readonly container = new Container();
  private _alertGfx = new Graphics();
  private _crewGfx = new Graphics();
  private _crewTexts: Text[] = [];
  private _timerText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 16, fill: 0xccddcc, fontWeight: "bold" }) });
  private _alertText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0x88aa88 }) });
  private _lootText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0xffd700 }) });
  private _hintText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x556655, wordWrap: true, wordWrapWidth: 400 }) });
  private _logContainer = new Container();
  private _speedText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x778877 }) });
  private _equipText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x889988 }) });

  build(sw: number, _sh: number): void {
    this.container.removeChildren();
    this._crewTexts = [];

    // Top bar
    const topBar = new Graphics();
    topBar.rect(0, 0, sw, 52).fill({ color: COL_BG, alpha: 0.7 });
    topBar.moveTo(0, 52).lineTo(sw, 52).stroke({ color: COL, width: 1, alpha: 0.25 });
    this.container.addChild(topBar);

    const title = new Text({ text: "\u2620 SHADOWHAND \u2620", style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: COL, fontWeight: "bold", letterSpacing: 3 }) });
    title.anchor.set(0.5, 0); title.position.set(sw / 2, 2);
    this.container.addChild(title);

    this._timerText.anchor.set(0.5, 0); this._timerText.position.set(sw / 2, 16);
    this.container.addChild(this._timerText);

    this._alertText.anchor.set(0.5, 0); this._alertText.position.set(sw / 2, 36);
    this.container.addChild(this._alertText);

    this.container.addChild(this._alertGfx);

    this._lootText.anchor.set(1, 0); this._lootText.position.set(sw - 10, 5);
    this.container.addChild(this._lootText);

    this._speedText.anchor.set(1, 0); this._speedText.position.set(sw - 10, 20);
    this.container.addChild(this._speedText);

    this._equipText.anchor.set(1, 0); this._equipText.position.set(sw - 10, 34);
    this.container.addChild(this._equipText);

    this.container.addChild(this._crewGfx);

    this._hintText.anchor.set(0.5, 1); this._hintText.position.set(sw / 2, _sh - 8);
    this.container.addChild(this._hintText);

    const logBg = new Graphics();
    logBg.roundRect(0, _sh - 120, 300, 120, 4).fill({ color: COL_BG, alpha: 0.5 });
    this.container.addChild(logBg);
    this._logContainer.position.set(5, _sh - 115);
    this.container.addChild(this._logContainer);
  }

  update(state: ShadowhandState, sw: number, _sh: number): void {
    const heist = state.heist;
    if (!heist) return;

    // Timer
    const mins = Math.floor(heist.elapsedTime / 60);
    const secs = Math.floor(heist.elapsedTime % 60);
    this._timerText.text = `${mins}:${secs.toString().padStart(2, "0")}`;

    // Alert
    const alertNames = ["UNDETECTED", "SUSPICIOUS", "ALARM!"];
    const alertColors = [0x44aa44, 0xddaa22, 0xff3333];
    this._alertText.text = alertNames[heist.globalAlert];
    this._alertText.style.fill = alertColors[heist.globalAlert];

    // Alert bar
    this._alertGfx.clear();
    const barW = 200, barH = 4, barX = (sw - barW) / 2, barY = 48;
    this._alertGfx.rect(barX, barY, barW, barH).fill({ color: 0x222222 });
    const maxAlert = heist.guards.reduce((m, g) => Math.max(m, g.alertTimer), 0);
    const alertFill = Math.min(1, maxAlert / 70);
    const fillColor = alertFill < 0.4 ? 0x44aa44 : alertFill < 0.7 ? 0xddaa22 : 0xff3333;
    this._alertGfx.rect(barX, barY, barW * alertFill, barH).fill({ color: fillColor });

    // Loot
    let totalVal = 0;
    for (const l of heist.lootCollected) totalVal += l.value;
    this._lootText.text = `Loot: ${totalVal}g${heist.primaryLootTaken ? " \u2605" : ""}`;

    // Speed
    this._speedText.text = heist.speedMult !== 1 ? `Speed: ${heist.speedMult}x` : "";

    // Equipment status
    const equipItems = state.guild.inventory.filter(i => i.uses > 0 || i.uses === -1);
    const equipStrs = equipItems.slice(0, 4).map(i => `${i.id.replace(/_/g, " ")}(${i.uses > 0 ? i.uses : "\u221e"})`);
    this._equipText.text = equipStrs.length > 0 ? `1-4: ${equipStrs.join(" | ")}` : "";

    // Crew panel with names
    this._crewGfx.clear();
    // Remove old crew texts
    for (const t of this._crewTexts) { if (t.parent) t.parent.removeChild(t); }
    this._crewTexts = [];

    let cy = 58;
    const selected = heist.thieves.find(t => t.selected && t.alive);

    for (const thief of heist.thieves) {
      const color = thief.selected ? 0x44ff44 : thief.alive ? 0x88aacc : thief.escaped ? 0x448844 : 0x553333;
      this._crewGfx.roundRect(5, cy, 140, 38, 3).fill({ color: COL_BG, alpha: 0.6 });
      this._crewGfx.roundRect(5, cy, 140, 38, 3).stroke({ color, width: thief.selected ? 1.5 : 0.5, alpha: 0.5 });

      const crew = state.guild.roster.find(c => c.id === thief.crewMemberId);
      const arch = CREW_ARCHETYPES[thief.role];
      this._crewGfx.circle(16, cy + 12, 5).fill({ color: arch.color });

      // Name and role
      const nameStr = crew ? `${crew.name}` : thief.role;
      const roleStr = arch.name;
      const nameText = new Text({ text: nameStr, style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: color, fontWeight: thief.selected ? "bold" : "normal" }) });
      nameText.position.set(26, cy + 3);
      this.container.addChild(nameText);
      this._crewTexts.push(nameText);

      const roleText = new Text({ text: roleStr, style: new TextStyle({ fontFamily: FONT, fontSize: 8, fill: arch.color }) });
      roleText.position.set(26, cy + 15);
      this.container.addChild(roleText);
      this._crewTexts.push(roleText);

      // Status text
      let statusStr = "";
      if (!thief.alive && thief.escaped) statusStr = "ESCAPED";
      else if (!thief.alive && thief.captured) statusStr = "CAUGHT";
      else if (!thief.alive) statusStr = "DOWN";
      else if (thief.crouching) statusStr = "crouch";
      else if (thief.disguised) statusStr = "disguise";
      else if (thief.shadowMeld) statusStr = "shadow";

      if (statusStr) {
        const statusText = new Text({ text: statusStr, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: thief.escaped ? 0x44aa44 : 0xccaaaa }) });
        statusText.position.set(100, cy + 3);
        this.container.addChild(statusText);
        this._crewTexts.push(statusText);
      }

      // HP bar (alive only)
      if (thief.alive) {
        const hpW = 80, hpH = 3;
        this._crewGfx.rect(26, cy + 28, hpW, hpH).fill({ color: 0x331111 });
        this._crewGfx.rect(26, cy + 28, hpW * (thief.hp / thief.maxHp), hpH).fill({ color: 0x44cc44 });
      }

      // Loot indicator
      if (thief.carryingLoot.length > 0) {
        this._crewGfx.circle(130, cy + 12, 4).fill({ color: 0xffd700, alpha: 0.7 });
        const lootCountText = new Text({ text: `${thief.carryingLoot.length}`, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: 0x000000 }) });
        lootCountText.anchor.set(0.5, 0.5);
        lootCountText.position.set(130, cy + 12);
        this.container.addChild(lootCountText);
        this._crewTexts.push(lootCountText);
      }

      cy += 42;
    }

    // Dynamic hint text based on selected thief's role
    let hints = "Click: move | Tab: switch | C: crouch | Space: pick lock | +/-: speed | Esc: pause";
    if (selected) {
      const roleHints = ROLE_ABILITY_HINTS[selected.role];
      if (roleHints) {
        const parts = roleHints.filter(h => h.length > 0).join(" | ");
        hints = `${parts} | ${hints}`;
      }
    }
    this._hintText.text = hints;

    // Log
    this._logContainer.removeChildren();
    const logStyle = new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x779977, wordWrap: true, wordWrapWidth: 290 });
    const last6 = state.log.slice(-6);
    let ly = 0;
    for (const msg of last6) {
      const t = new Text({ text: msg, style: logStyle });
      t.position.set(0, ly);
      this._logContainer.addChild(t);
      ly += 14;
    }
  }

  destroy(): void {
    this.container.removeChildren();
    this._crewTexts = [];
  }
}
