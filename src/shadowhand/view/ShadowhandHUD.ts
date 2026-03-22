// ---------------------------------------------------------------------------
// Shadowhand mode — in-heist HUD
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ShadowhandState } from "../state/ShadowhandState";
import { CREW_ARCHETYPES } from "../config/CrewDefs";

const FONT = "Georgia, serif";
const COL = 0x44aa88;
const COL_BG = 0x050808;

export class ShadowhandHUD {
  readonly container = new Container();
  private _alertGfx = new Graphics();
  private _crewGfx = new Graphics();
  private _timerText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 16, fill: 0xccddcc, fontWeight: "bold" }) });
  private _alertText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0x88aa88 }) });
  private _lootText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0xffd700 }) });
  private _hintText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x556655, wordWrap: true, wordWrapWidth: 250 }) });
  private _logContainer = new Container();
  private _speedText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x778877 }) });

  build(sw: number, sh: number): void {
    this.container.removeChildren();

    // Top bar
    const topBar = new Graphics();
    topBar.rect(0, 0, sw, 52).fill({ color: COL_BG, alpha: 0.7 });
    topBar.moveTo(0, 52).lineTo(sw, 52).stroke({ color: COL, width: 1, alpha: 0.25 });
    this.container.addChild(topBar);

    // Title
    const title = new Text({ text: "\u2620 SHADOWHAND \u2620", style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: COL, fontWeight: "bold", letterSpacing: 3 }) });
    title.anchor.set(0.5, 0); title.position.set(sw / 2, 2);
    this.container.addChild(title);

    // Timer
    this._timerText.anchor.set(0.5, 0); this._timerText.position.set(sw / 2, 16);
    this.container.addChild(this._timerText);

    // Alert status
    this._alertText.anchor.set(0.5, 0); this._alertText.position.set(sw / 2, 36);
    this.container.addChild(this._alertText);

    // Alert bar
    this.container.addChild(this._alertGfx);

    // Loot info (right side)
    this._lootText.anchor.set(1, 0); this._lootText.position.set(sw - 10, 5);
    this.container.addChild(this._lootText);

    // Speed indicator
    this._speedText.anchor.set(1, 0); this._speedText.position.set(sw - 10, 20);
    this.container.addChild(this._speedText);

    // Crew panel (left side)
    this.container.addChild(this._crewGfx);

    // Hint (bottom center)
    this._hintText.anchor.set(0.5, 1); this._hintText.position.set(sw / 2, sh - 8);
    this.container.addChild(this._hintText);

    // Log (bottom left)
    const logBg = new Graphics();
    logBg.roundRect(0, sh - 120, 300, 120, 4).fill({ color: COL_BG, alpha: 0.5 });
    this.container.addChild(logBg);
    this._logContainer.position.set(5, sh - 115);
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

    // Crew panel
    this._crewGfx.clear();
    let cy = 58;
    for (const thief of heist.thieves) {
      const color = thief.selected ? 0x44ff44 : thief.alive ? 0x88aacc : 0x553333;
      this._crewGfx.roundRect(5, cy, 110, 28, 3).fill({ color: COL_BG, alpha: 0.6 });
      this._crewGfx.roundRect(5, cy, 110, 28, 3).stroke({ color, width: thief.selected ? 1.5 : 0.5, alpha: 0.5 });

      // Role color dot
      const crew = state.guild.roster.find(c => c.id === thief.crewMemberId);
      if (crew) {
        const arch = CREW_ARCHETYPES[crew.role];
        this._crewGfx.circle(16, cy + 14, 4).fill({ color: arch.color });
      }

      // HP bar
      if (thief.alive) {
        const hpW = 60, hpH = 3;
        this._crewGfx.rect(26, cy + 20, hpW, hpH).fill({ color: 0x331111 });
        this._crewGfx.rect(26, cy + 20, hpW * (thief.hp / thief.maxHp), hpH).fill({ color: 0x44cc44 });
      }

      // Status icons
      if (thief.crouching) this._crewGfx.circle(100, cy + 8, 3).fill({ color: 0x6688aa, alpha: 0.6 });
      if (thief.carryingLoot.length > 0) this._crewGfx.circle(100, cy + 18, 3).fill({ color: 0xffd700, alpha: 0.6 });

      cy += 32;
    }

    // Hint
    this._hintText.text = "Click: move | Tab: switch thief | C: crouch | Space: pick lock | E: use ability | Esc: pause";

    // Log
    this._logContainer.removeChildren();
    const logStyle = new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x779977, wordWrap: true, wordWrapWidth: 290 });
    const last5 = state.log.slice(-5);
    let ly = 0;
    for (const msg of last5) {
      const t = new Text({ text: msg, style: logStyle });
      t.position.set(0, ly);
      this._logContainer.addChild(t);
      ly += 14;
    }
  }

  destroy(): void {
    this.container.removeChildren();
  }
}
