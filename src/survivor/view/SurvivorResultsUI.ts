// ---------------------------------------------------------------------------
// Survivor results — death/victory screen with stats
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { t } from "@/i18n/i18n";
import { WEAPON_DEFS } from "../config/SurvivorWeaponDefs";
import { SURVIVOR_MAPS } from "../config/SurvivorBalanceConfig";
import { SurvivorPersistence } from "../state/SurvivorPersistence";
import type { SurvivorState } from "../state/SurvivorState";

const STYLE_RESULT_TITLE = new TextStyle({ fontFamily: "monospace", fontSize: 36, fill: 0xff4444, fontWeight: "bold", letterSpacing: 2 });
const STYLE_RESULT_STAT = new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0xffffff });
const STYLE_CHAR_DESC = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xaabbcc });
const STYLE_BTN = new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0xffffff, fontWeight: "bold" });

export class SurvivorResultsUI {
  readonly resultsOverlay = new Container();
  readonly victoryOverlay = new Container();

  showResults(s: SurvivorState, mapIndex: number, sw: number, sh: number, onPlayAgain: () => void, onMainMenu: () => void): void {
    this.resultsOverlay.removeChildren();

    const newTotalGold = SurvivorPersistence.addGold(s.gold);
    SurvivorPersistence.addHighScore({
      characterId: s.player.characterDef.id,
      characterName: s.player.characterDef.name,
      mapName: SURVIVOR_MAPS[mapIndex].name,
      timeSurvived: s.gameTime,
      kills: s.totalKills,
      level: s.level,
      damageDealt: s.totalDamageDealt,
      gold: s.gold,
      date: Date.now(),
    });

    const dim = new Graphics().rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.75 });
    this.resultsOverlay.addChild(dim);

    const weaponCount = s.weapons.length;
    const cardW = 440;
    const cardH = 380 + weaponCount * 18 + 30;
    const cx = (sw - cardW) / 2;
    const cy = Math.max(10, (sh - cardH) / 2);
    const card = new Graphics()
      .roundRect(cx, cy, cardW, cardH, 12)
      .fill({ color: 0x0a0a18, alpha: 0.95 })
      .roundRect(cx, cy, cardW, cardH, 12)
      .stroke({ color: 0xff4444, width: 2 });
    this.resultsOverlay.addChild(card);

    const title = new Text({ text: t("survivor.defeated"), style: STYLE_RESULT_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, cy + 16);
    this.resultsOverlay.addChild(title);

    const mins = Math.floor(s.gameTime / 60);
    const secs = Math.floor(s.gameTime % 60);
    const stats = [
      `Time Survived:  ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
      `Enemies Killed: ${s.totalKills}`,
      `Level Reached:  ${s.level}`,
      `Damage Dealt:   ${Math.floor(s.totalDamageDealt)}`,
      `Gold Earned:    ${s.gold}  (Total: ${newTotalGold})`,
      `Character:      ${s.player.characterDef.name}`,
      `Map:            ${SURVIVOR_MAPS[mapIndex].name}`,
    ];

    let sy = cy + 65;
    for (const stat of stats) {
      const t = new Text({ text: stat, style: STYLE_RESULT_STAT });
      t.anchor.set(0.5, 0);
      t.position.set(sw / 2, sy);
      this.resultsOverlay.addChild(t);
      sy += 24;
    }

    sy += 6;
    const weaponsLabel = new Text({ text: t("survivor.weapon_breakdown"), style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xffd700 }) });
    weaponsLabel.anchor.set(0.5, 0);
    weaponsLabel.position.set(sw / 2, sy);
    this.resultsOverlay.addChild(weaponsLabel);
    sy += 20;

    for (const ws of s.weapons) {
      const def = WEAPON_DEFS[ws.id];
      const totalDmg = s.weaponDamageDealt[ws.id] ?? 0;
      const dps = s.gameTime > 0 ? totalDmg / s.gameTime : 0;
      const pct = s.totalDamageDealt > 0 ? (totalDmg / s.totalDamageDealt * 100) : 0;
      const t = new Text({
        text: `${def.name} Lv.${ws.level}${ws.evolved ? " [EVO]" : ""}  ${Math.floor(totalDmg)} dmg (${dps.toFixed(1)} DPS, ${pct.toFixed(0)}%)`,
        style: STYLE_CHAR_DESC,
      });
      t.anchor.set(0.5, 0);
      t.position.set(sw / 2, sy);
      this.resultsOverlay.addChild(t);
      sy += 18;
    }

    // Buttons
    const btnW = 180;
    const btnH = 40;
    const btnGap = 16;
    const btnY = cy + cardH - 56;

    const playBtn = this._buildButton("PLAY AGAIN", sw / 2 - btnW - btnGap / 2, btnY, btnW, btnH, 0x1a3a1a, 0x44cc44, onPlayAgain);
    this.resultsOverlay.addChild(playBtn);

    const menuBtn = this._buildButton("MAIN MENU", sw / 2 + btnGap / 2, btnY, btnW, btnH, 0x1a2a3a, 0x4488cc, onMainMenu);
    this.resultsOverlay.addChild(menuBtn);
  }

  showVictory(s: SurvivorState, mapIndex: number, sw: number, sh: number, onMainMenu: () => void): void {
    this.victoryOverlay.removeChildren();

    const bonusGold = Math.floor(s.gold * 0.5);
    const totalGold = s.gold + bonusGold;
    SurvivorPersistence.addGold(totalGold);
    SurvivorPersistence.addHighScore({
      characterId: s.player.characterDef.id,
      characterName: s.player.characterDef.name,
      mapName: SURVIVOR_MAPS[mapIndex].name,
      timeSurvived: s.gameTime,
      kills: s.totalKills,
      level: s.level,
      damageDealt: s.totalDamageDealt,
      gold: totalGold,
      date: Date.now(),
    });

    const bg = new Graphics().rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.8 });
    bg.eventMode = "static";
    this.victoryOverlay.addChild(bg);

    const title = new Text({ text: t("survivor.survived"), style: new TextStyle({ fontFamily: "monospace", fontSize: 36, fill: 0xffd700, fontWeight: "bold", letterSpacing: 3 }) });
    title.anchor.set(0.5, 0.5);
    title.position.set(sw / 2, sh / 2 - 120);
    this.victoryOverlay.addChild(title);

    const mins = Math.floor(s.gameTime / 60);
    const secs = Math.floor(s.gameTime % 60);
    const stats = [
      `Time: ${mins}:${secs.toString().padStart(2, "0")}`,
      `Level: ${s.level}`,
      `Kills: ${s.totalKills}`,
      `Gold Earned: ${s.gold} + ${bonusGold} bonus = ${totalGold}`,
      `Damage Dealt: ${Math.floor(s.totalDamageDealt)}`,
    ];
    const statsText = new Text({ text: stats.join("\n"), style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xcccccc, lineHeight: 22 }) });
    statsText.anchor.set(0.5, 0);
    statsText.position.set(sw / 2, sh / 2 - 60);
    this.victoryOverlay.addChild(statsText);

    const menuBtn = this._buildCenteredButton("MAIN MENU", sw / 2, sh / 2 + 80, 0x224422, onMainMenu);
    this.victoryOverlay.addChild(menuBtn);
  }

  private _buildButton(label: string, x: number, y: number, w: number, h: number, bgColor: number, borderColor: number, onClick: () => void): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.position.set(x, y);
    const btnBg = new Graphics()
      .roundRect(0, 0, w, h, 6)
      .fill({ color: bgColor })
      .roundRect(0, 0, w, h, 6)
      .stroke({ color: borderColor, width: 2 });
    btn.addChild(btnBg);
    const btnLabel = new Text({ text: label, style: STYLE_BTN });
    btnLabel.anchor.set(0.5, 0.5);
    btnLabel.position.set(w / 2, h / 2);
    btn.addChild(btnLabel);
    btn.on("pointerdown", onClick);
    btn.on("pointerover", () => { btnBg.tint = 0x88ff88; });
    btn.on("pointerout", () => { btnBg.tint = 0xffffff; });
    return btn;
  }

  private _buildCenteredButton(label: string, x: number, y: number, bgColor: number, onClick: () => void): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    const btnBg = new Graphics()
      .roundRect(-90, -18, 180, 36, 6)
      .fill({ color: bgColor })
      .roundRect(-90, -18, 180, 36, 6)
      .stroke({ color: 0x888888, width: 1 });
    btn.addChild(btnBg);
    const btnText = new Text({ text: label, style: STYLE_BTN });
    btnText.anchor.set(0.5, 0.5);
    btn.addChild(btnText);
    btn.position.set(x, y);
    btn.on("pointerdown", onClick);
    btn.on("pointerover", () => { btnBg.tint = 0x66aaff; });
    btn.on("pointerout", () => { btnBg.tint = 0xffffff; });
    return btn;
  }
}
