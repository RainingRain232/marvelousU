// ---------------------------------------------------------------------------
// Necromancer mode — main orchestrator
// ---------------------------------------------------------------------------

import { Ticker, Graphics, Container, Text, TextStyle } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

import { createNecroState, findChimera } from "./state/NecroState";
import type { NecroState } from "./state/NecroState";
import { NecroConfig, DARK_POWERS, CORPSES, WAVES, CRUSADERS, generateEndlessWave } from "./config/NecroConfig";
import type { WaveEntry } from "./config/NecroConfig";
import {
  updateDig, startDig,
  updateRitual, placeCorpseInSlot, startRaise,
  updateBattle, prepareBattleWave, castDarkNova, castBoneWall,
} from "./systems/NecroSystem";
import { NecroRenderer } from "./view/NecroRenderer";

export class NecroGame {
  private _state!: NecroState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _renderer = new NecroRenderer();
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _pointerDown: ((e: { global: { x: number; y: number } }) => void) | null = null;
  private _contextMenu: ((e: MouseEvent) => void) | null = null;
  private _sw = 0;
  private _sh = 0;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._sw = viewManager.screenWidth;
    this._sh = viewManager.screenHeight;
    this._showStartScreen();
  }

  destroy(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }
    this._removePointer();
    this._renderer.destroy();
    viewManager.removeFromLayer("ui", this._renderer.container);
  }

  private _removePointer(): void {
    if (this._pointerDown) { viewManager.app.stage.off("pointerdown", this._pointerDown); this._pointerDown = null; }
    if (this._contextMenu) { window.removeEventListener("contextmenu", this._contextMenu); this._contextMenu = null; }
  }

  // ── Start screen ───────────────────────────────────────────────────────

  private _showStartScreen(): void {
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, this._sw, this._sh).fill({ color: 0x0a0812 });
    c.addChild(bg);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    addText("\u2620 NECROMANCER \u2620", this._sw / 2, 40, { fontSize: 28, fill: 0x44ff88, fontWeight: "bold", letterSpacing: 5 }, true);
    addText("Raise the Dead", this._sw / 2, 78, { fontSize: 14, fill: 0x2a6644, fontStyle: "italic" }, true);
    addText(
      "Dig up corpses from the graveyard.\nReanimate them with dark rituals.\nCombine body parts for chimera undead.\nSend your army against crusader waves.\n\nBeware: each resurrection drains your life force!",
      this._sw / 2, 110, { fontSize: 11, fill: 0x668866, align: "center", wordWrap: true, wordWrapWidth: 380, lineHeight: 18 }, true,
    );

    // Decorative skull
    const skullX = this._sw / 2, skullY = this._sh * 0.47;
    const sg = new Graphics();
    sg.circle(skullX, skullY, 16).fill({ color: 0xccccbb, alpha: 0.12 });
    sg.circle(skullX - 5, skullY - 3, 4).fill({ color: 0x0a0812, alpha: 0.2 });
    sg.circle(skullX + 5, skullY - 3, 4).fill({ color: 0x0a0812, alpha: 0.2 });
    sg.moveTo(skullX - 3, skullY + 5).lineTo(skullX + 3, skullY + 5).stroke({ color: 0x0a0812, width: 1, alpha: 0.15 });
    c.addChild(sg);

    const btn = new Graphics();
    btn.roundRect(this._sw / 2 - 80, this._sh * 0.58, 160, 40, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
    btn.roundRect(this._sw / 2 - 80, this._sh * 0.58, 160, 40, 5).stroke({ color: 0x44ff88, width: 2, alpha: 0.6 });
    btn.eventMode = "static"; btn.cursor = "pointer";
    btn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this._startGame();
    });
    c.addChild(btn);
    addText("RAISE THE DEAD", this._sw / 2, this._sh * 0.58 + 12, { fontSize: 13, fill: 0x44ff88, fontWeight: "bold", letterSpacing: 2 }, true);

    const backBtn = new Graphics();
    backBtn.roundRect(this._sw / 2 - 45, this._sh * 0.68, 90, 26, 4).fill({ color: 0x0a0a0a, alpha: 0.6 });
    backBtn.roundRect(this._sw / 2 - 45, this._sh * 0.68, 90, 26, 4).stroke({ color: 0x555555, width: 1 });
    backBtn.eventMode = "static"; backBtn.cursor = "pointer";
    backBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this.destroy(); window.dispatchEvent(new Event("necromancerExit"));
    });
    c.addChild(backBtn);
    addText("BACK", this._sw / 2, this._sh * 0.68 + 6, { fontSize: 9, fill: 0x888888 }, true);

    viewManager.addToLayer("ui", c);
  }

  // ── Game start ─────────────────────────────────────────────────────────

  private _startGame(): void {
    this._state = createNecroState();
    this._renderer.init(this._sw, this._sh);
    viewManager.addToLayer("ui", this._renderer.container);
    viewManager.app.stage.eventMode = "static";

    this._enterDigPhase();
  }

  // ── Dig phase ──────────────────────────────────────────────────────────

  private _enterDigPhase(): void {
    this._state.phase = "dig";
    // Regenerate graves if they're all dug
    const unDug = this._state.graves.filter(g => !g.dug);
    if (unDug.length === 0) {
      const extraSlots = (this._state.powerLevels["grave_expand"] ?? 0) * 2;
      const count = NecroConfig.BASE_GRAVE_COUNT + extraSlots;
      this._state.graves = [];
      const cols = Math.ceil(count / 2);
      const types: (typeof this._state.graves[0]["corpseType"])[] = ["peasant", "soldier", "knight", "mage", "noble"];
      const weights = types.map(t => CORPSES[t!].weight);
      const totalWeight = weights.reduce((a, b) => a + b, 0);

      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        let roll = Math.random() * totalWeight;
        let corpseType: typeof types[0] = "peasant";
        for (let j = 0; j < types.length; j++) {
          roll -= weights[j];
          if (roll <= 0) { corpseType = types[j]; break; }
        }
        this._state.graves.push({
          id: this._state.graveIdCounter++,
          x: 80 + col * 90 + (Math.random() - 0.5) * 20,
          y: 100 + row * 100 + (Math.random() - 0.5) * 20,
          corpseType,
          dug: false,
          digProgress: 0,
          digging: false,
        });
      }
    }

    this._setupInput("dig");
    this._startTicker();
  }

  // ── Ritual phase ───────────────────────────────────────────────────────

  private _enterRitualPhase(): void {
    this._state.phase = "ritual";
    this._state.ritualSlotA = null;
    this._state.ritualSlotB = null;
    this._state.isRaising = false;
    this._state.raisingProgress = 0;

    this._setupInput("ritual");
  }

  // ── Battle phase ───────────────────────────────────────────────────────

  private _enterBattlePhase(): void {
    if (this._state.undead.length === 0) {
      this._state.announcements.push({ text: "You need at least one undead!", color: 0xff4444, timer: 2 });
      return;
    }
    this._state.phase = "battle";
    prepareBattleWave(this._state);
    this._state.announcements.push({ text: `Wave ${this._state.wave + 1} — FIGHT!`, color: 0xff4444, timer: 2 });

    this._setupInput("battle");
  }

  // ── Upgrade phase ──────────────────────────────────────────────────────

  private _showUpgradeScreen(): void {
    this._stopTicker();
    this._removePointer();
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }

    const c = new Container();
    const ov = new Graphics();
    ov.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.88 });
    ov.eventMode = "static"; c.addChild(ov);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    addText(`Wave ${this._state.wave + 1} Complete!`, this._sw / 2, 30, { fontSize: 20, fill: 0x44ff88, fontWeight: "bold" }, true);
    addText(`Gold: ${this._state.gold}g | Army: ${this._state.undead.length} | HP: ${this._state.playerHp}/${this._state.maxPlayerHp}`, this._sw / 2, 58, { fontSize: 11, fill: 0xccddcc }, true);

    addText("DARK POWERS", this._sw / 2, 85, { fontSize: 13, fill: 0x6622aa, letterSpacing: 3 }, true);

    let y = 108;
    for (const power of DARK_POWERS) {
      const level = this._state.powerLevels[power.id] ?? 0;
      const maxed = level >= power.maxLevel;
      const canBuy = !maxed && this._state.gold >= power.cost;

      const btn = new Graphics();
      btn.roundRect(this._sw / 2 - 160, y, 320, 36, 5).fill({ color: maxed ? 0x0a1a0a : 0x0a0a0a, alpha: 0.8 });
      btn.roundRect(this._sw / 2 - 160, y, 320, 36, 5).stroke({ color: maxed ? 0x44aa44 : canBuy ? 0xffd700 : 0x333333, width: 1, alpha: 0.5 });

      if (canBuy) {
        btn.eventMode = "static"; btn.cursor = "pointer";
        const pid = power.id;
        const cost = power.cost;
        btn.on("pointerdown", () => {
          this._state.gold -= cost;
          this._state.powerLevels[pid] = (this._state.powerLevels[pid] ?? 0) + 1;
          this._applyPowerUpgrade(pid);
          viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
          this._showUpgradeScreen(); // Refresh
        });
      }
      c.addChild(btn);

      addText(`${power.name} (Lv ${level}/${power.maxLevel})`, this._sw / 2 - 150, y + 4, { fontSize: 11, fill: maxed ? 0x44aa44 : canBuy ? 0xffd700 : 0x666666, fontWeight: "bold" });
      addText(power.description, this._sw / 2 - 150, y + 18, { fontSize: 8, fill: 0x778877 });
      if (!maxed) addText(`${power.cost}g`, this._sw / 2 + 130, y + 8, { fontSize: 11, fill: canBuy ? 0xffd700 : 0x554444, fontWeight: "bold" });

      y += 42;
    }

    // Heal option
    if (this._state.playerHp < this._state.maxPlayerHp && this._state.gold >= 20) {
      y += 8;
      const healBtn = new Graphics();
      healBtn.roundRect(this._sw / 2 - 70, y, 140, 30, 4).fill({ color: 0x0a0a0a, alpha: 0.7 });
      healBtn.roundRect(this._sw / 2 - 70, y, 140, 30, 4).stroke({ color: 0xff4444, width: 1, alpha: 0.4 });
      healBtn.eventMode = "static"; healBtn.cursor = "pointer";
      healBtn.on("pointerdown", () => {
        this._state.gold -= 20;
        this._state.playerHp = this._state.maxPlayerHp;
        this._state.announcements.push({ text: "Fully healed!", color: 0x44ff44, timer: 1.5 });
        viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
        this._showUpgradeScreen();
      });
      c.addChild(healBtn);
      addText("Heal (20g)", this._sw / 2, y + 8, { fontSize: 10, fill: 0xff6644 }, true);
      y += 38;
    }

    // Wave preview — show what's coming next
    y += 8;
    const nextWave = this._state.wave + 1;
    const isEndless = nextWave >= this._state.totalWaves;
    if (!isEndless || this._state.endless) {
      const preview: WaveEntry[] = nextWave < WAVES.length ? WAVES[nextWave] : generateEndlessWave(nextWave);
      addText(`Next Wave ${nextWave + 1}:`, this._sw / 2, y, { fontSize: 10, fill: 0xcc8844, fontWeight: "bold" }, true);
      y += 16;
      const previewStr = preview.map(e => `${CRUSADERS[e.type].name} x${e.count}`).join("  |  ");
      addText(previewStr, this._sw / 2, y, { fontSize: 8, fill: 0x998866 }, true);
      y += 16;
    }

    // Continue button
    y += 8;
    const continueBtn = new Graphics();
    continueBtn.roundRect(this._sw / 2 - 80, y, 160, 36, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
    continueBtn.roundRect(this._sw / 2 - 80, y, 160, 36, 5).stroke({ color: 0x44ff88, width: 2, alpha: 0.6 });
    continueBtn.eventMode = "static"; continueBtn.cursor = "pointer";
    continueBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this._state.wave++;
      if (this._state.wave >= this._state.totalWaves && !this._state.endless) {
        this._showVictoryScreen();
      } else {
        this._enterDigPhase();
      }
    });
    c.addChild(continueBtn);
    const btnLabel = isEndless && !this._state.endless ? "NEXT WAVE \u25B6" : `WAVE ${nextWave + 1} \u25B6`;
    addText(btnLabel, this._sw / 2, y + 10, { fontSize: 12, fill: 0x44ff88, fontWeight: "bold", letterSpacing: 2 }, true);

    viewManager.addToLayer("ui", c);
  }

  private _applyPowerUpgrade(id: string): void {
    const level = this._state.powerLevels[id] ?? 0;
    switch (id) {
      case "mana_well": this._state.maxMana = NecroConfig.START_MAX_MANA + level * 20; break;
      case "soul_siphon": this._state.manaRegen = NecroConfig.BASE_MANA_REGEN + level * 1; break;
      case "swift_ritual": this._state.raiseTime = Math.max(0.5, NecroConfig.RAISE_TIME - level * 0.4); break;
    }
  }

  // ── Results & victory screens ──────────────────────────────────────────

  private _showDefeatScreen(): void {
    this._stopTicker();
    this._removePointer();
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }

    const c = new Container();
    const ov = new Graphics();
    ov.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.9 });
    ov.eventMode = "static"; c.addChild(ov);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    const pw = 340, ph = 260, px = (this._sw - pw) / 2, py = (this._sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x0a0812, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: 0xff4444, width: 2, alpha: 0.5 });
    c.addChild(panel);

    addText("\u2620 DEFEATED \u2620", this._sw / 2, py + 16, { fontSize: 22, fill: 0xff4444, fontWeight: "bold", letterSpacing: 3 }, true);
    addText("The crusaders have prevailed...", this._sw / 2, py + 46, { fontSize: 11, fill: 0x886666, fontStyle: "italic" }, true);

    try {
      const prev = parseInt(localStorage.getItem("necro_highscore") ?? "0") || 0;
      if (this._state.score > prev) {
        localStorage.setItem("necro_highscore", `${this._state.score}`);
        addText("\u2605 NEW HIGH SCORE! \u2605", this._sw / 2, py + 64, { fontSize: 11, fill: 0xffd700, fontWeight: "bold" }, true);
      }
    } catch { /* ignore */ }

    let y = py + 80;
    const stats: [string, string, number][] = [
      ["Wave Reached", `${this._state.wave + 1}/${this._state.totalWaves}`, 0xccaa88],
      ["Score", `${this._state.score}`, 0x44ccaa],
      ["Total Kills", `${this._state.totalKills}`, 0xcc6644],
      ["Gold Earned", `${this._state.gold}g`, 0xffd700],
      ["Undead Raised", `${this._state.undeadIdCounter}`, 0x44ff88],
    ];
    for (const [label, value, color] of stats) {
      addText(label, px + 30, y, { fontSize: 11, fill: 0x778866 });
      const vt = new Text({ text: value, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: color, fontWeight: "bold" } as any) });
      vt.anchor.set(1, 0); vt.position.set(px + pw - 30, y); c.addChild(vt);
      y += 20;
    }

    y += 16;
    this._addEndButtons(c, addText, y);

    viewManager.addToLayer("ui", c);
  }

  private _showVictoryScreen(): void {
    this._stopTicker();
    this._removePointer();
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }

    audioManager.playJingle("level_up");

    const c = new Container();
    const ov = new Graphics();
    ov.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.88 });
    ov.eventMode = "static"; c.addChild(ov);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    const pw = 380, ph = 300, px = (this._sw - pw) / 2, py = (this._sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x0a0812, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: 0x44ff88, width: 2, alpha: 0.5 });
    c.addChild(panel);

    addText("\u2620 VICTORY \u2620", this._sw / 2, py + 16, { fontSize: 24, fill: 0x44ff88, fontWeight: "bold", letterSpacing: 5 }, true);
    addText("The living shall serve the dead!", this._sw / 2, py + 48, { fontSize: 12, fill: 0x2a6644, fontStyle: "italic" }, true);

    try {
      const prev = parseInt(localStorage.getItem("necro_highscore") ?? "0") || 0;
      if (this._state.score > prev) {
        localStorage.setItem("necro_highscore", `${this._state.score}`);
        addText("\u2605 NEW HIGH SCORE! \u2605", this._sw / 2, py + 66, { fontSize: 11, fill: 0xffd700, fontWeight: "bold" }, true);
      }
    } catch { /* ignore */ }

    let y = py + 84;
    const stats: [string, string, number][] = [
      ["Waves Survived", `${this._state.totalWaves}/${this._state.totalWaves}`, 0x44ff88],
      ["Final Score", `${this._state.score}`, 0x44ccaa],
      ["Total Kills", `${this._state.totalKills}`, 0xcc6644],
      ["Gold Earned", `${this._state.gold}g`, 0xffd700],
      ["Undead Raised", `${this._state.undeadIdCounter}`, 0x44ff88],
      ["Remaining Army", `${this._state.undead.length}`, 0x889988],
    ];
    for (const [label, value, color] of stats) {
      addText(label, px + 35, y, { fontSize: 11, fill: 0x778866 });
      const vt = new Text({ text: value, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: color, fontWeight: "bold" } as any) });
      vt.anchor.set(1, 0); vt.position.set(px + pw - 35, y); c.addChild(vt);
      y += 20;
    }

    // Endless mode button
    y += 10;
    const endlessBtn = new Graphics();
    endlessBtn.roundRect(this._sw / 2 - 90, y, 180, 34, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
    endlessBtn.roundRect(this._sw / 2 - 90, y, 180, 34, 5).stroke({ color: 0x6622aa, width: 2, alpha: 0.5 });
    endlessBtn.eventMode = "static"; endlessBtn.cursor = "pointer";
    endlessBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this._state.endless = true;
      this._state.totalWaves = 999;
      this._enterDigPhase();
    });
    c.addChild(endlessBtn);
    addText("ENDLESS MODE \u221E", this._sw / 2, y + 9, { fontSize: 11, fill: 0xaa44ff, fontWeight: "bold", letterSpacing: 2 }, true);

    y += 44;
    this._addEndButtons(c, addText, y);

    viewManager.addToLayer("ui", c);
  }

  private _addEndButtons(c: Container, addText: Function, y: number): void {
    const retryBtn = new Graphics();
    retryBtn.roundRect(this._sw / 2 - 70, y, 140, 34, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
    retryBtn.roundRect(this._sw / 2 - 70, y, 140, 34, 5).stroke({ color: 0x44ff88, width: 2, alpha: 0.5 });
    retryBtn.eventMode = "static"; retryBtn.cursor = "pointer";
    retryBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); viewManager.removeFromLayer("ui", this._renderer.container);
      c.destroy({ children: true }); this._renderer.destroy();
      this._startGame();
    });
    c.addChild(retryBtn);
    addText("PLAY AGAIN", this._sw / 2, y + 9, { fontSize: 11, fill: 0x44ff88, fontWeight: "bold" }, true);

    y += 44;
    const menuBtn = new Graphics();
    menuBtn.roundRect(this._sw / 2 - 40, y, 80, 24, 4).fill({ color: 0x0a0a0a, alpha: 0.6 });
    menuBtn.roundRect(this._sw / 2 - 40, y, 80, 24, 4).stroke({ color: 0x555555, width: 1 });
    menuBtn.eventMode = "static"; menuBtn.cursor = "pointer";
    menuBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this.destroy(); window.dispatchEvent(new Event("necromancerExit"));
    });
    c.addChild(menuBtn);
    addText("MENU", this._sw / 2, y + 5, { fontSize: 9, fill: 0x888888 }, true);
  }

  // ── Input setup ────────────────────────────────────────────────────────

  private _setupInput(phase: string): void {
    // Clear old handlers
    this._removePointer();
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }

    const ox = (this._sw - NecroConfig.FIELD_WIDTH) / 2, oy = 50;

    if (phase === "dig") {
      this._pointerDown = (e: { global: { x: number; y: number } }) => {
        const wx = e.global.x - ox, wy = e.global.y - oy;
        // Check if clicked a grave
        for (const grave of this._state.graves) {
          if (grave.dug || grave.digging) continue;
          const dx = wx - grave.x, dy = wy - grave.y;
          if (dx * dx + dy * dy < 25 * 25) {
            startDig(this._state, grave.id);
            break;
          }
        }
      };
      viewManager.app.stage.on("pointerdown", this._pointerDown);

      this._keyHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape") { this.destroy(); window.dispatchEvent(new Event("necromancerExit")); }
        if (e.key === " ") {
          e.preventDefault();
          this._enterRitualPhase();
        }
      };
      window.addEventListener("keydown", this._keyHandler);
    } else if (phase === "ritual") {
      let nextSlot: "a" | "b" = "a";
      this._pointerDown = (e: { global: { x: number; y: number } }) => {
        const wx = e.global.x - ox, wy = e.global.y - oy;
        // Check if clicked a corpse in the inventory
        let invY = 36;
        for (const corpse of this._state.corpses) {
          if (this._state.ritualSlotA?.id === corpse.id || this._state.ritualSlotB?.id === corpse.id) continue;
          if (wx > 10 && wx < 110 && wy > invY && wy < invY + 18) {
            placeCorpseInSlot(this._state, corpse.id, nextSlot);
            nextSlot = nextSlot === "a" ? "b" : "a";
            break;
          }
          invY += 22;
        }
      };
      viewManager.app.stage.on("pointerdown", this._pointerDown);

      this._keyHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape") { this.destroy(); window.dispatchEvent(new Event("necromancerExit")); }
        if (e.key === "Enter") {
          e.preventDefault();
          startRaise(this._state);
        }
        if (e.key === " ") {
          e.preventDefault();
          this._enterBattlePhase();
        }
      };
      window.addEventListener("keydown", this._keyHandler);
    } else if (phase === "battle") {
      this._pointerDown = (e: { global: { x: number; y: number } }) => {
        const wx = e.global.x - ox, wy = e.global.y - oy;
        castDarkNova(this._state, wx, wy);
      };
      viewManager.app.stage.on("pointerdown", this._pointerDown);

      // Right-click for bone wall
      this._contextMenu = (e: MouseEvent) => {
        e.preventDefault();
        const rect = viewManager.app.canvas.getBoundingClientRect();
        const wx = e.clientX - rect.left - ox, wy = e.clientY - rect.top - oy;
        castBoneWall(this._state, wx, wy);
      };
      window.addEventListener("contextmenu", this._contextMenu);

      this._keyHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape") { this.destroy(); window.dispatchEvent(new Event("necromancerExit")); }
        // W key for bone wall at center
        if (e.key === "w" || e.key === "W") {
          castBoneWall(this._state, NecroConfig.FIELD_WIDTH / 2, NecroConfig.FIELD_HEIGHT / 2);
        }
      };
      window.addEventListener("keydown", this._keyHandler);
    }
  }

  // ── Ticker ─────────────────────────────────────────────────────────────

  private _startTicker(): void {
    if (this._tickerCb) return;
    this._tickerCb = (ticker: Ticker) => this._update(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  private _stopTicker(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
  }

  private _update(dt: number): void {
    const clampDt = Math.min(dt, 0.1); // Clamp to avoid huge jumps

    if (this._state.phase === "dig") {
      updateDig(this._state, clampDt);
    } else if (this._state.phase === "ritual") {
      updateRitual(this._state, clampDt);
    } else if (this._state.phase === "battle") {
      updateBattle(this._state, clampDt);

      if (this._state.battleWon) {
        this._state.battleWon = false;
        this._state.announcements.push({ text: "WAVE CLEARED!", color: 0x44ff88, timer: 2 });
        // Short delay then upgrade screen
        setTimeout(() => this._showUpgradeScreen(), 1500);
        this._state.phase = "start"; // Prevent re-trigger
      }
      if (this._state.battleLost) {
        this._state.battleLost = false;
        this._showDefeatScreen();
        return;
      }
    }

    this._renderer.draw(this._state, this._sw, this._sh);
  }
}
