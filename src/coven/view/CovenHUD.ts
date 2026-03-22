// ---------------------------------------------------------------------------
// Coven mode — polished HUD with arcane theme
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { CovenState } from "../state/CovenState";
import { CovenPhase } from "../state/CovenState";
import { CovenConfig } from "../config/CovenConfig";
import { CovenRitualSystem } from "../systems/CovenRitualSystem";


const FONT = "Georgia, serif";
const COL = 0x8855cc;
const COL_LT = 0xaa88ee;
const COL_DK = 0x442266;
const COL_BG = 0x050508;

const STYLE_NOTIF = new TextStyle({ fontFamily: FONT, fontSize: 16, fill: COL_LT, fontWeight: "bold", align: "center" });
const STYLE_LOG = new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x887799, wordWrap: true, wordWrapWidth: 300 });

interface Notification { text: string; color: number; timer: number; maxTimer: number; }

export class CovenHUD {
  readonly container = new Container();
  private _barGfx = new Graphics();
  private _dayText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 18, fill: COL_LT, fontWeight: "bold" }) });
  private _phaseText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0x887799 }) });
  private _healthLabel = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0xff6666, fontWeight: "bold" }) });
  private _manaLabel = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0x6688ff, fontWeight: "bold" }) });
  private _ingredientCount = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x88cc88 }) });
  private _potionCount = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x88aaff }) });
  private _ritualText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0xffd700 }) });
  private _spellText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0xcc88ff }) });
  private _controlsHint = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x555544 }) });
  private _familiarText = new Text({ text: "", style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x88aa88 }) });
  private _logContainer = new Container();
  private _notifications: Notification[] = [];
  private _notifContainer = new Container();

  build(sw: number, sh: number): void {
    this.container.removeChildren();

    // Top bar with arcane border
    const topBar = new Graphics();
    topBar.rect(0, 0, sw, 62).fill({ color: COL_BG, alpha: 0.65 });
    // Double bottom border with rune dots
    topBar.moveTo(0, 62).lineTo(sw, 62).stroke({ color: COL, width: 1.5, alpha: 0.25 });
    topBar.moveTo(0, 64).lineTo(sw, 64).stroke({ color: COL_DK, width: 0.5, alpha: 0.12 });
    // Rune dots along border
    for (let x = 30; x < sw; x += 60) {
      topBar.circle(x, 62, 2).fill({ color: COL, alpha: 0.2 });
    }
    this.container.addChild(topBar);

    // Title with decorative flanking lines
    const title = new Text({ text: "\u2726 COVEN \u2726", style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: COL, fontWeight: "bold", letterSpacing: 4 }) });
    title.anchor.set(0.5, 0); title.position.set(sw / 2, 2);
    this.container.addChild(title);

    this._dayText.anchor.set(0.5, 0); this._dayText.position.set(sw / 2, 16);
    this._phaseText.anchor.set(0.5, 0); this._phaseText.position.set(sw / 2, 38);
    this.container.addChild(this._dayText, this._phaseText);

    // Bars with icons
    this.container.addChild(this._barGfx);
    this._healthLabel.position.set(128, 7); this._manaLabel.position.set(128, 24);
    this.container.addChild(this._healthLabel, this._manaLabel);

    // Right info
    this._ingredientCount.anchor.set(1, 0); this._ingredientCount.position.set(sw - 10, 5);
    this._potionCount.anchor.set(1, 0); this._potionCount.position.set(sw - 10, 17);
    this._ritualText.anchor.set(1, 0); this._ritualText.position.set(sw - 10, 29);
    this._spellText.anchor.set(1, 0); this._spellText.position.set(sw - 10, 41);
    this._familiarText.anchor.set(1, 0); this._familiarText.position.set(sw - 10, 52);
    this.container.addChild(this._ingredientCount, this._potionCount, this._ritualText, this._spellText, this._familiarText);

    // Log with arcane frame
    const logBg = new Graphics();
    logBg.roundRect(0, sh - 135, 330, 135, 4).fill({ color: COL_BG, alpha: 0.45 });
    logBg.moveTo(330, sh - 135).lineTo(330, sh).stroke({ color: COL_DK, width: 0.5, alpha: 0.15 });
    this.container.addChild(logBg);
    this._logContainer.position.set(8, sh - 127);
    this.container.addChild(this._logContainer);

    // Notifications
    this._notifContainer.position.set(sw / 2, sh * 0.3);
    this.container.addChild(this._notifContainer);

    // Controls hint
    this._controlsHint.anchor.set(1, 1); this._controlsHint.position.set(sw - 10, sh - 115);
    this.container.addChild(this._controlsHint);
  }

  update(state: CovenState, sw: number, sh: number): void {
    this._dayText.text = `Night ${state.day}`;
    const phaseLabels: Record<string, string> = {
      [CovenPhase.DAWN]: "Dawn \u2014 a new day", [CovenPhase.FORAGE]: "Forage \u2014 gather ingredients",
      [CovenPhase.BREW]: "Brew \u2014 use your cauldron", [CovenPhase.DUSK]: "Dusk \u2014 set your wards",
      [CovenPhase.NIGHT]: "Night \u2014 survive", [CovenPhase.COMBAT]: "\u2694 COMBAT! \u2694",
      [CovenPhase.GAME_OVER]: "The witch has fallen", [CovenPhase.VICTORY]: "\u2726 The Otherworld awaits \u2726",
    };
    this._phaseText.text = phaseLabels[state.phase] ?? "";

    // Bars with icons
    this._barGfx.clear();
    // Heart icon
    this._barGfx.moveTo(8, 13).bezierCurveTo(8, 10, 5, 8, 3, 10).bezierCurveTo(1, 8, -2, 10, -2, 13).bezierCurveTo(-2, 16, 3, 19, 3, 19).bezierCurveTo(3, 19, 8, 16, 8, 13).fill({ color: 0xcc4444, alpha: 0.5 });
    this._drawBar(this._barGfx, 12, 8, 112, 11, 0xcc4444, 0xee6666, state.health / state.maxHealth);
    // Mana drop icon
    this._barGfx.moveTo(3, 22).bezierCurveTo(3, 22, 6, 28, 3, 31).bezierCurveTo(0, 28, 3, 22, 3, 22).fill({ color: 0x4466cc, alpha: 0.5 });
    this._drawBar(this._barGfx, 12, 24, 112, 11, 0x4466cc, 0x6688ee, state.mana / state.maxMana);
    this._healthLabel.text = `${state.health}/${state.maxHealth}`;
    this._manaLabel.text = `${state.mana}/${state.maxMana}`;

    // Inventory
    let totalIng = 0; for (const [, v] of state.ingredients) totalIng += v;
    this._ingredientCount.text = `\u2618 Ingredients: ${totalIng}`;

    const potionParts: string[] = [];
    for (const [id, count] of state.potions) {
      if (count > 0) potionParts.push(`${count}x ${id.replace(/_/g, " ")}`);
    }
    this._potionCount.text = potionParts.length > 0 ? `\u2697 [H] ${potionParts.join(", ")}` : "\u2697 No potions";

    // Ritual
    const ritual = CovenRitualSystem.getProgress(state);
    if (ritual.found === 0 && state.day < 5) {
      this._ritualText.text = "";
    } else if (ritual.found >= ritual.needed) {
      let nearestLey = Infinity;
      for (const [, hex] of state.hexes) {
        if (hex.terrain === "ley_line" && hex.revealed) {
          const d = Math.abs(hex.coord.q - state.playerPosition.q) + Math.abs(hex.coord.r - state.playerPosition.r);
          if (d < nearestLey) nearestLey = d;
        }
      }
      this._ritualText.text = nearestLey < Infinity ? `\u2726 RITUAL READY! Ley line: ~${nearestLey} hex | R` : `\u2726 RITUAL READY! Find a ley line!`;
      this._ritualText.style.fill = 0xffdd44;
    } else {
      const allC = ["moonstone tear", "dragon blood", "silver mirror", "living flame", "crown of thorns"];
      const found = new Set(ritual.components);
      const status = allC.map((c) => found.has(c) ? `\u2713` : `\u2717`).join("");
      this._ritualText.text = `\u2726 Ritual ${ritual.found}/${ritual.needed} ${status}`;
      this._ritualText.style.fill = 0xffd700;
    }

    // Spells
    const spellList = state.learnedSpells.map((s, i) => {
      const name = s.replace(/_/g, " ");
      return s === state.activeSpell ? `[${i + 1}:${name}]` : `${i + 1}:${name}`;
    }).join("  ");
    this._spellText.text = spellList || "No spells";

    if (state.pendingCombat) {
      const cn = state.pendingCombat.type.replace(/_/g, " ");
      this._spellText.text = `\u2694 ${cn} ${state.pendingCombat.hp}/${state.pendingCombat.maxHp} HP | ${(state.activeSpell ?? "none").replace(/_/g, " ")}`;
      this._spellText.style.fill = 0xff8844;
    } else {
      this._spellText.style.fill = 0xcc88ff;
    }

    // Familiars
    const activeFam = state.familiars.filter((f) => f.active);
    this._familiarText.text = activeFam.length > 0 ? activeFam.map((f) => `${f.name} (${f.type})`).join(" \u2022 ") : "";

    // Controls
    switch (state.phase) {
      case CovenPhase.FORAGE: this._controlsHint.text = "Click = Move | H = Potion | 1-7 = Spell | Esc = Menu"; break;
      case CovenPhase.BREW: this._controlsHint.text = "B = Cauldron | H = Potion | Enter = Skip"; break;
      case CovenPhase.DUSK: this._controlsHint.text = "W = Ward | Enter = Night"; break;
      case CovenPhase.NIGHT: this._controlsHint.text = "Click = Move | H = Potion"; break;
      case CovenPhase.COMBAT: this._controlsHint.text = "A = Attack | F = Flee | 1-7 = Spell"; break;
      default: this._controlsHint.text = "Esc = Menu"; break;
    }

    // Log
    this._logContainer.removeChildren();
    const recent = state.log.slice(-9);
    for (let i = 0; i < recent.length; i++) {
      const e = recent[i];
      const t = new Text({ text: `[${e.day}] ${e.text}`, style: { ...STYLE_LOG, fill: e.color ?? 0x887799 } });
      t.position.set(0, i * 14); t.alpha = 0.25 + 0.75 * (i / recent.length);
      this._logContainer.addChild(t);
    }
  }

  showNotification(text: string, color: number): void { this._notifications.push({ text, color, timer: 3.5, maxTimer: 3.5 }); }

  updateNotifications(dt: number): void {
    this._notifContainer.removeChildren();
    let yOff = 0;
    for (let i = this._notifications.length - 1; i >= 0; i--) {
      const n = this._notifications[i]; n.timer -= dt;
      if (n.timer <= 0) { this._notifications.splice(i, 1); continue; }
      const fadeIn = Math.min(1, (n.maxTimer - n.timer) / 0.2);
      const fadeOut = n.timer < 0.5 ? n.timer / 0.5 : 1;
      const alpha = fadeIn * fadeOut;
      const scale = n.timer > n.maxTimer - 0.15 ? 1 + (n.maxTimer - n.timer) * 2.5 : 1;

      // Glowing notification box
      const bg = new Graphics();
      const bgW = Math.max(200, n.text.length * 8.5);
      bg.roundRect(-bgW / 2, yOff - 15, bgW, 30, 5).fill({ color: 0x000000, alpha: alpha * 0.5 });
      bg.roundRect(-bgW / 2, yOff - 15, bgW, 30, 5).stroke({ color: n.color, width: 1, alpha: alpha * 0.35 });
      // Corner sparkles
      bg.circle(-bgW / 2 + 4, yOff - 11, 1.5).fill({ color: n.color, alpha: alpha * 0.3 });
      bg.circle(bgW / 2 - 4, yOff - 11, 1.5).fill({ color: n.color, alpha: alpha * 0.3 });
      this._notifContainer.addChild(bg);

      const t = new Text({ text: n.text, style: { ...STYLE_NOTIF, fill: n.color } });
      t.anchor.set(0.5); t.alpha = alpha; t.scale.set(Math.min(1.12, scale));
      t.position.set(0, yOff); this._notifContainer.addChild(t);
      yOff -= 42;
    }
  }

  private _drawBar(g: Graphics, x: number, y: number, w: number, h: number, base: number, hi: number, fill: number): void {
    // Dark background with inner shadow
    g.roundRect(x, y, w, h, 4).fill({ color: 0x080808, alpha: 0.9 });
    g.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 3.5).stroke({ color: 0x1a1a1a, width: 0.5, alpha: 0.4 });
    const fw = w * Math.min(1, Math.max(0, fill));
    if (fw > 1) {
      g.roundRect(x + 1, y + 1, fw - 1, h - 2, 3).fill({ color: base, alpha: 0.85 });
      g.roundRect(x + 1, y + 1, fw - 1, Math.ceil(h / 2) - 1, 3).fill({ color: hi, alpha: 0.3 }); // highlight top half
    }
    // Colored outer border
    g.roundRect(x, y, w, h, 4).stroke({ color: base, width: 1, alpha: 0.35 });
    // Quarter ticks
    for (let t = 0.25; t < 1; t += 0.25) {
      g.moveTo(x + w * t, y).lineTo(x + w * t, y + h).stroke({ color: 0x333333, width: 0.5, alpha: 0.4 });
    }
  }

  cleanup(): void { this.container.removeChildren(); this._notifications = []; }
}
