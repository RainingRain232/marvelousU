// ---------------------------------------------------------------------------
// Exodus mode — polished tactical combat screen
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ExodusState } from "../state/ExodusState";
import { combatCapableMembers } from "../state/ExodusState";
import type { ExodusCombatResult } from "../systems/ExodusCombatBridge";

const FONT = "Georgia, serif";
const COL_GOLD = 0xdaa520;
const COL_BG = 0x0e0808;

export interface FormationDef {
  id: string; name: string; description: string;
  atkMult: number; defMult: number; retreatBonus: number;
}

const FORMATIONS: FormationDef[] = [
  { id: "shield_wall", name: "Shield Wall", description: "Defensive. Fewer losses, safer retreat.", atkMult: 0.8, defMult: 1.4, retreatBonus: 1 },
  { id: "charge", name: "Cavalry Charge", description: "All-out assault. Win big or lose hard.", atkMult: 1.5, defMult: 0.7, retreatBonus: 0 },
  { id: "balanced", name: "Standard", description: "Balanced approach. No bonuses.", atkMult: 1.0, defMult: 1.0, retreatBonus: 0 },
  { id: "ambush", name: "Ambush", description: "Use terrain. Best in forest/mountain.", atkMult: 1.3, defMult: 1.1, retreatBonus: 1 },
];

export class ExodusCombatScreen {
  readonly container = new Container();
  private _fightCallback: ((f: FormationDef) => void) | null = null;
  private _retreatCallback: (() => void) | null = null;
  private _continueCallback: (() => void) | null = null;
  private _selectedFormation = 2;

  get formationCount(): number { return FORMATIONS.length; }
  setFormation(index: number): void { if (index >= 0 && index < FORMATIONS.length) this._selectedFormation = index; }
  setFightCallback(cb: (f: FormationDef) => void): void { this._fightCallback = cb; }
  setRetreatCallback(cb: () => void): void { this._retreatCallback = cb; }
  setContinueCallback(cb: () => void): void { this._continueCallback = cb; }
  getSelectedFormation(): FormationDef { return FORMATIONS[this._selectedFormation]; }

  showPreBattle(state: ExodusState, dangerLevel: number, sw: number, sh: number): void {
    this.container.removeChildren();

    const ov = new Graphics();
    ov.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.85 });
    ov.eventMode = "static";
    this.container.addChild(ov);

    const pw = 560, ph = sh * 0.82, px = (sw - pw) / 2, py = (sh - ph) / 2;

    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 8).fill({ color: COL_BG, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 8).stroke({ color: 0xff4444, width: 2, alpha: 0.5 });
    panel.roundRect(px + 3, py + 3, pw - 6, ph - 6, 7).stroke({ color: 0xff4444, width: 1, alpha: 0.12 });
    this.container.addChild(panel);

    let y = py + 18;

    // Title
    const title = new Text({ text: "BATTLE", style: new TextStyle({ fontFamily: FONT, fontSize: 24, fill: 0xff4444, fontWeight: "bold", letterSpacing: 3 }) });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, y);
    this.container.addChild(title);
    y += 32;

    // Danger stars
    const stars = "\u2605".repeat(dangerLevel) + "\u2606".repeat(5 - dangerLevel);
    const starColor = dangerLevel >= 4 ? 0xff4444 : dangerLevel >= 3 ? 0xffaa44 : 0xdddd66;
    const dt = new Text({ text: `Threat: ${stars}`, style: new TextStyle({ fontFamily: FONT, fontSize: 14, fill: starColor }) });
    dt.anchor.set(0.5, 0);
    dt.position.set(sw / 2, y);
    this.container.addChild(dt);
    y += 25;

    // Force comparison
    const fighters = combatCapableMembers(state);
    const caravanStr = Math.floor(fighters.reduce((s, m) => s + m.atk + m.hp * 0.15, 0));
    const enemyCount = Math.floor(10 + dangerLevel * 8 + state.day * 0.5);
    const enemyStr = Math.floor(dangerLevel * 50 + state.day * 5);

    // Your forces (left)
    this._text("Your Forces", px + 30, y, new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0x66cc66, fontWeight: "bold" }));
    const yourLines = [
      `Fighters: ${fighters.length}`,
      `Strength: ${caravanStr}`,
      `Knights: ${fighters.filter(m => m.role === "knight").length}`,
      `Archers: ${fighters.filter(m => m.role === "archer").length}`,
    ];
    for (let i = 0; i < yourLines.length; i++) {
      this._text(yourLines[i], px + 40, y + 18 + i * 14, new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x88cc88 }));
    }

    // Enemy (right)
    const rt = this._text("Enemy Forces", px + pw - 30, y, new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0xcc6666, fontWeight: "bold" }));
    rt.anchor.set(1, 0);
    const enemyLines = [`~${enemyCount} warriors`, `Strength: ~${enemyStr}`, dangerLevel >= 4 ? "Elite commanders" : "", dangerLevel >= 3 ? "Siege equipment" : ""].filter(Boolean);
    for (let i = 0; i < enemyLines.length; i++) {
      const et = this._text(enemyLines[i], px + pw - 40, y + 18 + i * 14, new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0xcc8888 }));
      et.anchor.set(1, 0);
    }
    y += 85;

    // Battle visualization
    const baH = 90;
    const ba = new Graphics();
    ba.roundRect(px + 15, y, pw - 30, baH, 4).fill({ color: 0x0a0a0a, alpha: 0.7 });
    ba.roundRect(px + 15, y, pw - 30, baH, 4).stroke({ color: 0x333333, width: 1 });
    // Dividing line
    ba.moveTo(sw / 2, y + 5).lineTo(sw / 2, y + baH - 5).stroke({ color: 0x444444, width: 1, alpha: 0.4 });
    this.container.addChild(ba);

    // Unit dots with halos
    const allyN = Math.min(fighters.length, 24);
    const enemyN = Math.min(enemyCount, 24);
    for (let i = 0; i < allyN; i++) {
      const ux = px + 40 + (i % 6) * 14;
      const uy = y + 15 + Math.floor(i / 6) * 16;
      ba.circle(ux, uy, 5).fill({ color: 0x44aa44, alpha: 0.85 });
      ba.circle(ux, uy, 7).stroke({ color: 0x44aa44, width: 1, alpha: 0.2 });
    }
    for (let i = 0; i < enemyN; i++) {
      const ux = px + pw - 40 - (i % 6) * 14;
      const uy = y + 15 + Math.floor(i / 6) * 16;
      ba.circle(ux, uy, 5).fill({ color: 0xcc4444, alpha: 0.85 });
      ba.circle(ux, uy, 7).stroke({ color: 0xcc4444, width: 1, alpha: 0.2 });
    }

    // VS
    const vs = new Text({ text: "\u2694", style: new TextStyle({ fontSize: 28, fill: 0xddaa44 }) });
    vs.anchor.set(0.5);
    vs.position.set(sw / 2, y + baH / 2);
    this.container.addChild(vs);
    y += baH + 15;

    // Formations
    this._text("Formation", sw / 2, y, new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0xccaa66, fontWeight: "bold", letterSpacing: 1 }), true);
    y += 22;

    const fw = 125, fgap = 8;
    const fsx = (sw - (fw * FORMATIONS.length + fgap * (FORMATIONS.length - 1))) / 2;
    for (let i = 0; i < FORMATIONS.length; i++) {
      const f = FORMATIONS[i];
      const fx = fsx + i * (fw + fgap);
      const sel = i === this._selectedFormation;

      const card = new Graphics();
      card.roundRect(fx, y, fw, 65, 4).fill({ color: sel ? 0x1a1810 : 0x0c0c0a, alpha: 0.95 });
      card.roundRect(fx, y, fw, 65, 4).stroke({ color: sel ? COL_GOLD : 0x333322, width: sel ? 2 : 1 });
      card.eventMode = "static";
      card.cursor = "pointer";
      card.on("pointerdown", () => { this._selectedFormation = i; this.showPreBattle(state, dangerLevel, sw, sh); });
      this.container.addChild(card);

      this._text(f.name, fx + 6, y + 5, new TextStyle({ fontFamily: FONT, fontSize: 10, fill: sel ? 0xffd700 : 0x777766, fontWeight: "bold" }));
      this._text(f.description, fx + 6, y + 20, new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0x888877, wordWrap: true, wordWrapWidth: fw - 12 }));

      if (sel) {
        const stats = `ATK ×${f.atkMult} | DEF ×${f.defMult}`;
        this._text(stats, fx + 6, y + 50, new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0xddaa44 }));
      }
    }
    y += 80;

    // Fight / Retreat buttons
    this._actionButton("Fight!  [F]", sw / 2 - 160, y, 145, 36, 0x44aa44, () => this._fightCallback?.(FORMATIONS[this._selectedFormation]));
    this._actionButton("Retreat  [R]", sw / 2 + 15, y, 145, 36, 0xffaa44, () => this._retreatCallback?.());

    this._text("Retreat: lose stragglers, supplies, morale", sw / 2, y + 42, new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0x666655, fontStyle: "italic" }), true);
    this._text("F = Fight  |  R = Retreat  |  1-4 = Select formation", sw / 2, y + 54, new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0x555544 }), true);
  }

  showResult(result: ExodusCombatResult, sw: number, sh: number): void {
    this.container.removeChildren();

    const ov = new Graphics();
    ov.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.85 });
    ov.eventMode = "static";
    this.container.addChild(ov);

    const pw = 460, ph = 320, px = (sw - pw) / 2, py = (sh - ph) / 2;
    const isWin = result.outcome === "victory";
    const isRetreat = result.outcome === "retreat";
    const accentColor = isWin ? 0x44ff44 : isRetreat ? 0xffaa44 : 0xff4444;

    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 8).fill({ color: isWin ? 0x08120a : isRetreat ? 0x12100a : 0x120808, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 8).stroke({ color: accentColor, width: 2 });
    panel.roundRect(px + 3, py + 3, pw - 6, ph - 6, 7).stroke({ color: accentColor, width: 1, alpha: 0.15 });
    this.container.addChild(panel);

    let y = py + 22;

    const titleText = isWin ? "VICTORY" : isRetreat ? "RETREAT" : "DEFEAT";
    const title = new Text({ text: titleText, style: new TextStyle({ fontFamily: FONT, fontSize: 22, fill: accentColor, fontWeight: "bold", letterSpacing: 3 }) });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, y);
    this.container.addChild(title);
    y += 35;

    const desc = new Text({ text: result.description, style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0xccbbaa, wordWrap: true, wordWrapWidth: pw - 40, lineHeight: 18 }) });
    desc.position.set(px + 20, y);
    this.container.addChild(desc);
    y += desc.height + 18;

    // Stats
    const stats = [
      result.casualties > 0 ? [`Fallen: ${result.casualties}`, 0xff4444] : null,
      result.wounded > 0 ? [`Wounded: ${result.wounded}`, 0xffaa44] : null,
      result.enemiesDefeated > 0 ? [`Enemies Defeated: ${result.enemiesDefeated}`, 0x44ff44] : null,
    ].filter(Boolean) as [string, number][];

    for (const [text, color] of stats) {
      this._text(text, px + 30, y, new TextStyle({ fontFamily: FONT, fontSize: 12, fill: color }));
      y += 18;
    }

    // Continue
    this._actionButton("Continue", sw / 2 - 70, py + ph - 52, 140, 34, COL_GOLD, () => this._continueCallback?.());
  }

  // -------------------------------------------------------------------------

  private _text(str: string, x: number, y: number, style: TextStyle, centered = false): Text {
    const t = new Text({ text: str, style });
    if (centered) t.anchor.set(0.5, 0);
    t.position.set(x, y);
    this.container.addChild(t);
    return t;
  }

  private _actionButton(label: string, x: number, y: number, w: number, h: number, color: number, onClick: () => void): void {
    const bg = new Graphics();
    bg.roundRect(x, y, w, h, 4).fill({ color: 0x15130e, alpha: 0.95 });
    bg.roundRect(x, y, w, h, 4).stroke({ color, width: 2 });
    this.container.addChild(bg);

    const t = new Text({ text: label, style: new TextStyle({ fontFamily: FONT, fontSize: 13, fill: color, fontWeight: "bold" }) });
    t.anchor.set(0.5);
    t.position.set(x + w / 2, y + h / 2);
    this.container.addChild(t);

    bg.eventMode = "static";
    bg.cursor = "pointer";
    bg.on("pointerover", () => { bg.clear(); bg.roundRect(x, y, w, h, 4).fill({ color: 0x22201a, alpha: 0.95 }); bg.roundRect(x, y, w, h, 4).stroke({ color, width: 2 }); });
    bg.on("pointerout", () => { bg.clear(); bg.roundRect(x, y, w, h, 4).fill({ color: 0x15130e, alpha: 0.95 }); bg.roundRect(x, y, w, h, 4).stroke({ color, width: 2 }); });
    bg.on("pointerdown", () => onClick());
  }

  hide(): void { this.container.removeChildren(); }
  cleanup(): void { this._fightCallback = null; this._retreatCallback = null; this._continueCallback = null; this.container.removeChildren(); }
}
