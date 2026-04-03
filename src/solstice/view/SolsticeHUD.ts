import {
  Container, Graphics, Text, TextStyle,
} from "pixi.js";
import { viewManager } from "../../view/ViewManager";
import { SB } from "../config/SolsticeBalance";
import { SolsticeState, UnitKind } from "../state/SolsticeState";

// ---------------------------------------------------------------------------
// SolsticeHUD
// ---------------------------------------------------------------------------

export class SolsticeHUD {
  container: Container;

  onSpawn?: (kind: UnitKind) => void;
  onExit?:  () => void;

  private _sw: number;
  private _sh: number;

  // Top bar
  private _topBar:       Container;
  private _sunArc:       Graphics;
  private _playerStars:  Graphics;
  private _aiStars:      Graphics;
  private _cycleLabel:   Text;

  // Bottom bar
  private _bottomBar:    Container;
  private _essenceLabel: Text;
  private _rateLabel:    Text;
  private _spawnBtns:    Array<{ cont: Container; costLabel: Text; canAffordBg: Graphics }> = [];

  // Platform count
  private _platLabel: Text;

  // Center message (alignment event)
  private _msgContainer: Container;
  private _msgBg:        Graphics;
  private _msgText:      Text;
  private _msgSub:       Text;
  private _msgAlpha = 0;

  // Exit button
  private _exitBtn: Container;

  constructor() {
    this._sw = viewManager.screenWidth;
    this._sh = viewManager.screenHeight;
    this.container = new Container();
    this.container.eventMode = "auto";

    this._topBar       = new Container();
    this._sunArc       = new Graphics();
    this._playerStars  = new Graphics();
    this._aiStars      = new Graphics();

    this._cycleLabel = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xaabbdd, letterSpacing: 1 }) });
    this._bottomBar  = new Container();
    this._essenceLabel = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 17, fill: 0xffdd88, fontWeight: "bold" }) });
    this._rateLabel    = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xffcc66 }) });
    this._platLabel    = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0x88aacc, letterSpacing: 1 }) });

    this._msgContainer = new Container();
    this._msgBg    = new Graphics();
    this._msgText  = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 22, fill: 0xffffff, fontWeight: "bold", letterSpacing: 3, dropShadow: { color: 0x000000, blur: 8, distance: 0, alpha: 0.9 } }) });
    this._msgSub   = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xaaccff, letterSpacing: 2 }) });
    this._exitBtn  = new Container();

    this._build();
  }

  private _build(): void {
    const sw = this._sw;
    const sh = this._sh;

    // ---- Top bar ----
    const topBg = new Graphics().rect(0, 0, sw, 54).fill({ color: 0x000000, alpha: 0.55 });
    this._topBar.addChild(topBg);

    // Player stars (left)
    this._playerStars.position.set(20, 27);
    this._topBar.addChild(this._playerStars);

    // AI stars (right)
    this._aiStars.position.set(sw - 20, 27);
    this._topBar.addChild(this._aiStars);

    // Cycle arc (center)
    this._sunArc.position.set(sw / 2, 27);
    this._topBar.addChild(this._sunArc);

    this._cycleLabel.anchor.set(0.5, 0);
    this._cycleLabel.position.set(sw / 2, 40);
    this._topBar.addChild(this._cycleLabel);

    this.container.addChild(this._topBar);

    // ---- Bottom bar ----
    const barH = 70;
    const bbBg = new Graphics().rect(0, sh - barH, sw, barH).fill({ color: 0x000000, alpha: 0.6 });
    this._bottomBar.addChild(bbBg);

    // Essence
    this._essenceLabel.anchor.set(0, 0.5);
    this._essenceLabel.position.set(18, sh - barH / 2 - 8);
    this._rateLabel.anchor.set(0, 0.5);
    this._rateLabel.position.set(18, sh - barH / 2 + 11);
    this._bottomBar.addChild(this._essenceLabel, this._rateLabel);

    // Spawn buttons
    const kinds: UnitKind[] = ["guardian", "warden", "invoker"];
    const btnW  = 130;
    const btnH  = 48;
    const gap   = 10;
    const totalW = kinds.length * btnW + (kinds.length - 1) * gap;
    const startX = sw / 2 - totalW / 2;

    kinds.forEach((kind, i) => {
      const cont = new Container();
      cont.eventMode = "static";
      cont.cursor    = "pointer";
      cont.position.set(startX + i * (btnW + gap), sh - barH + 11);

      const canAffordBg = new Graphics();
      this._drawBtnBg(canAffordBg, btnW, btnH, 0x1a2a1a, 0x44aa66);
      cont.addChild(canAffordBg);

      const label = _makeText(SB.UNITS[kind].label, 11, 0xffffff, true);
      label.anchor.set(0.5, 0);
      label.position.set(btnW / 2, 5);
      cont.addChild(label);

      const cost  = SB.UNITS[kind].cost;
      const costL = _makeText(`${cost} ✨`, 13, 0xffcc44, true);
      costL.anchor.set(0.5, 0);
      costL.position.set(btnW / 2, 21);
      cont.addChild(costL);

      const keyL = _makeText(`[${i + 1}]`, 10, 0x889966, false);
      keyL.anchor.set(0.5, 0);
      keyL.position.set(btnW / 2, 35);
      cont.addChild(keyL);

      cont.on("pointerover",  () => { (canAffordBg as any)._hovered = true; this._redrawBtn(canAffordBg, btnW, btnH, true, (canAffordBg as any)._canAfford); });
      cont.on("pointerout",   () => { (canAffordBg as any)._hovered = false; this._redrawBtn(canAffordBg, btnW, btnH, false, (canAffordBg as any)._canAfford); });
      cont.on("pointertap",   () => { this.onSpawn?.(kind); });

      this._bottomBar.addChild(cont);
      this._spawnBtns.push({ cont, costLabel: costL, canAffordBg });
    });

    // Platform count
    this._platLabel.anchor.set(1, 0.5);
    this._platLabel.position.set(sw - 18, sh - barH / 2);
    this._bottomBar.addChild(this._platLabel);

    this.container.addChild(this._bottomBar);

    // ---- Center message ----
    const msgW = 460, msgH = 80;
    this._msgBg.roundRect(0, 0, msgW, msgH, 8).fill({ color: 0x000022, alpha: 0.85 });
    this._msgContainer.addChild(this._msgBg);

    this._msgText.anchor.set(0.5, 0.3);
    this._msgText.position.set(msgW / 2, msgH * 0.35);
    this._msgContainer.addChild(this._msgText);

    this._msgSub.anchor.set(0.5, 0);
    this._msgSub.position.set(msgW / 2, msgH * 0.62);
    this._msgContainer.addChild(this._msgSub);

    this._msgContainer.position.set(sw / 2 - msgW / 2, sh / 2 - msgH / 2 - 40);
    this._msgContainer.alpha = 0;
    this._msgContainer.eventMode = "none";
    this.container.addChild(this._msgContainer);

    // ---- Exit button ----
    this._buildExitBtn();
  }

  private _buildExitBtn(): void {
    const btn = this._exitBtn;
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics().roundRect(0, 0, 52, 26, 5).fill({ color: 0x1a0a0a, alpha: 0.85 }).stroke({ color: 0x662222, alpha: 0.8, width: 1 });
    btn.addChild(bg);

    const lbl = _makeText("EXIT", 11, 0xff6666, true);
    lbl.anchor.set(0.5, 0.5);
    lbl.position.set(26, 13);
    btn.addChild(lbl);

    btn.position.set(this._sw - 62, 62);
    btn.on("pointertap", () => { this.onExit?.(); });
    this.container.addChild(btn);
  }

  private _drawBtnBg(g: Graphics, w: number, h: number, fill: number, border: number): void {
    g.clear().roundRect(0, 0, w, h, 6).fill({ color: fill, alpha: 0.9 }).stroke({ color: border, alpha: 0.7, width: 1.5 });
  }

  private _redrawBtn(g: Graphics, w: number, h: number, hovered: boolean, canAfford: boolean): void {
    const fill   = canAfford ? (hovered ? 0x223a22 : 0x1a2a1a) : 0x2a1a1a;
    const border = canAfford ? 0x44aa66 : 0x663333;
    this._drawBtnBg(g, w, h, fill, border);
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(state: SolsticeState, dt: number): void {
    const sw  = this._sw;

    // --- Cycle arc ---
    this._sunArc.clear();
    const arcR = 22;
    // Background track
    this._sunArc.arc(0, 0, arcR, 0, Math.PI * 2).stroke({ color: 0x112244, width: 3.5 });
    // Day portion (gold)
    const dayEnd = SB.DAY_FRACTION * Math.PI * 2 - Math.PI / 2;
    this._sunArc.arc(0, 0, arcR, -Math.PI / 2, dayEnd).stroke({ color: 0xffcc44, width: 3.5 });
    // Current position dot
    const angle = state.cycleT * Math.PI * 2 - Math.PI / 2;
    const dotX  = Math.cos(angle) * arcR;
    const dotY  = Math.sin(angle) * arcR;
    const isDay = state.cycleT < SB.DAY_FRACTION;
    this._sunArc.circle(dotX, dotY, 5).fill({ color: isDay ? 0xffdd44 : 0xaaccff });

    const alignT1 = SB.DAY_FRACTION * 0.5; // dawn  alignment
    const alignT2 = SB.DAY_FRACTION + (1 - SB.DAY_FRACTION) * 0.5; // dusk alignment
    const a1 = alignT1 * Math.PI * 2 - Math.PI / 2;
    const a2 = alignT2 * Math.PI * 2 - Math.PI / 2;
    this._sunArc.circle(Math.cos(a1) * arcR, Math.sin(a1) * arcR, 3).fill({ color: 0xffffff });
    this._sunArc.circle(Math.cos(a2) * arcR, Math.sin(a2) * arcR, 3).fill({ color: 0x88aaff });

    const timeLeft = (1 - state.cycleT) * SB.CYCLE_DURATION;
    this._cycleLabel.text = isDay ? `DAWN  ${Math.ceil(timeLeft * SB.DAY_FRACTION / (1 - state.cycleT))}s` : `NIGHT ${Math.ceil(timeLeft)}s`;

    // --- Player stars ---
    this._playerStars.clear();
    this._drawScore(this._playerStars, state.playerScore, false);

    // --- AI stars ---
    this._aiStars.clear();
    this._drawScore(this._aiStars, state.aiScore, true);

    // --- Essence ---
    this._essenceLabel.text = `✨ ${Math.floor(state.playerEssence)}`;
    this._rateLabel.text    = `+${state.essenceRate.toFixed(1)}/s`;

    // --- Spawn buttons ---
    const kinds: UnitKind[] = ["guardian", "warden", "invoker"];
    kinds.forEach((kind, i) => {
      const cost      = SB.UNITS[kind].cost;
      const canAfford = state.playerEssence >= cost;
      const btn       = this._spawnBtns[i];
      (btn.canAffordBg as any)._canAfford = canAfford;
      this._redrawBtn(btn.canAffordBg, 130, 48, (btn.canAffordBg as any)._hovered ?? false, canAfford);
      btn.cont.alpha = canAfford ? 1.0 : 0.5;
    });

    // --- Platform count ---
    const owned = state.platforms.filter(p => p.owner === "player").length;
    this._platLabel.text = `${owned}/${state.platforms.length} PLATFORMS`;

    // --- Alignment message ---
    if (state.alignmentFlash > 0) {
      const rel = state.alignmentFlash / SB.ALIGNMENT_FLASH_DURATION;
      this._msgAlpha = Math.sin(rel * Math.PI);
      this._msgText.text = state.alignmentMsg.split("\n")[0] ?? "";
      this._msgSub.text  = state.alignmentMsg.split("\n")[1] ?? "";
    } else {
      this._msgAlpha = Math.max(0, this._msgAlpha - dt * 1.5);
    }
    this._msgContainer.alpha = this._msgAlpha;

    // --- Victory message overlay ---
    if (state.phase !== "playing" && state.victoryMessage) {
      this._msgText.text = state.victoryMessage;
      this._msgSub.text  = "Press ESC to return to menu";
      this._msgContainer.alpha = 1.0;
    }
  }

  private _drawScore(g: Graphics, score: number, rightAlign: boolean): void {
    const r    = 7;
    const gap  = 20;
    const sign = rightAlign ? -1 : 1;
    for (let i = 0; i < SB.POINTS_TO_WIN; i++) {
      const x = sign * i * gap;
      if (i < score) {
        g.star(x, 0, 5, r, r * 0.4).fill({ color: rightAlign ? 0x44aaff : 0xffcc44 });
      } else {
        g.star(x, 0, 5, r, r * 0.4).fill({ color: 0x222244 }).stroke({ color: 0x445566, width: 1 });
      }
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

function _makeText(text: string, size: number, fill: number, bold: boolean): Text {
  return new Text({ text, style: new TextStyle({ fontFamily: "monospace", fontSize: size, fill, fontWeight: bold ? "bold" : "normal" }) });
}
