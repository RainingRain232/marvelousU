// ---------------------------------------------------------------------------
// Necromancer mode — main orchestrator
// ---------------------------------------------------------------------------

import { Ticker, Graphics, Container, Text, TextStyle } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

import { createNecroState } from "./state/NecroState";
import type { NecroState } from "./state/NecroState";
import { NecroConfig, DARK_POWERS, CORPSES, WAVES, CRUSADERS, CONSUMABLES, generateEndlessWave, NECRO_FW, NECRO_FH, setNecroFieldSize } from "./config/NecroConfig";
import type { WaveEntry } from "./config/NecroConfig";
import {
  updateDig, startDig, digAll,
  updateRitual, placeCorpseInSlot, startRaise,
  updateBattle, prepareBattleWave, castDarkNova, castBoneWall, castSoulLeech,
  healUndeadBetweenWaves, sacrificeUndead, rollWaveEvent, calculateWaveBonuses,
  setRallyPoint, pickRelic, castWarCry,
} from "./systems/NecroSystem";
import { BOSS_WAVES, BOSSES } from "./config/NecroConfig";
import { NecroRenderer } from "./view/NecroRenderer";

export class NecroGame {
  private _state!: NecroState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _renderer = new NecroRenderer();
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _pointerDown: ((e: { global: { x: number; y: number } }) => void) | null = null;
  private _pointerMove: ((e: { global: { x: number; y: number } }) => void) | null = null;
  private _contextMenu: ((e: MouseEvent) => void) | null = null;
  private _sw = 0;
  private _sh = 0;
  private _pauseMenu: Container | null = null;
  private _paused = false;
  private _waveBonuses: { bonuses: { label: string; gold: number; color: number }[]; total: number } = { bonuses: [], total: 0 };

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._sw = viewManager.screenWidth;
    this._sh = viewManager.screenHeight;
    setNecroFieldSize(this._sw, this._sh);
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
    if (this._pointerMove) { viewManager.app.stage.off("pointermove", this._pointerMove); this._pointerMove = null; }
    if (this._contextMenu) { window.removeEventListener("contextmenu", this._contextMenu); this._contextMenu = null; }
  }

  // ── Start screen ───────────────────────────────────────────────────────

  private _showStartScreen(): void {
    const c = new Container();
    const sw = this._sw, sh = this._sh;
    const bg = new Graphics();

    // Night sky gradient
    for (let y = 0; y < sh; y += 2) {
      const t = y / sh;
      const r = Math.floor(6 + t * 8);
      const g = Math.floor(4 + t * 10);
      const b = Math.floor(14 + t * 10);
      bg.rect(0, y, sw, 2).fill({ color: (r << 16) | (g << 8) | b });
    }

    // Moon
    bg.circle(sw * 0.75, 55, 22).fill({ color: 0xeeeedd, alpha: 0.8 });
    bg.circle(sw * 0.75 + 5, 53, 18).fill({ color: 0x060410 });
    for (let mr = 24; mr < 70; mr += 6) bg.circle(sw * 0.75, 55, mr).fill({ color: 0xeeeedd, alpha: 0.008 });

    // Stars
    for (let i = 0; i < 80; i++) {
      const sx = (i * 8737 + 31) % sw, sy = (i * 4219 + 17) % (sh * 0.35);
      bg.circle(sx, sy, 0.4 + (i % 4) * 0.25).fill({ color: 0xffffff, alpha: 0.15 + (i % 6) * 0.06 });
    }

    // Distant treeline
    for (let x = 0; x < sw; x += 2) {
      const h = 25 + Math.sin(x * 0.018) * 15 + Math.sin(x * 0.045) * 10 + Math.sin(x * 0.11) * 5;
      bg.rect(x, sh * 0.42 - h, 2, h + 3).fill({ color: 0x060a06, alpha: 0.7 });
    }

    // Ground
    bg.rect(0, sh * 0.42, sw, sh * 0.58).fill({ color: 0x0a0a06 });

    // Graveyard scene — tombstones across the bottom
    const tombstones = [
      { x: sw * 0.12, h: 28, style: 0 }, { x: sw * 0.22, h: 22, style: 1 },
      { x: sw * 0.35, h: 32, style: 2 }, { x: sw * 0.48, h: 26, style: 3 },
      { x: sw * 0.62, h: 30, style: 0 }, { x: sw * 0.75, h: 24, style: 1 },
      { x: sw * 0.88, h: 28, style: 2 },
    ];
    const groundY = sh * 0.82;
    for (const ts of tombstones) {
      const tx = ts.x, ty = groundY;
      // Mound
      bg.ellipse(tx, ty + 2, 18, 6).fill({ color: 0x121008, alpha: 0.6 });
      if (ts.style === 0) {
        bg.moveTo(tx - 7, ty).lineTo(tx - 7, ty - ts.h + 6).bezierCurveTo(tx - 7, ty - ts.h, tx + 7, ty - ts.h, tx + 7, ty - ts.h + 6).lineTo(tx + 7, ty).fill({ color: 0x333328, alpha: 0.6 });
      } else if (ts.style === 1) {
        bg.rect(tx - 2, ty - ts.h, 4, ts.h).fill({ color: 0x333328, alpha: 0.6 });
        bg.rect(tx - 6, ty - ts.h + 6, 12, 3).fill({ color: 0x333328, alpha: 0.6 });
      } else if (ts.style === 2) {
        bg.moveTo(tx - 5, ty).lineTo(tx - 3, ty - ts.h).lineTo(tx + 3, ty - ts.h).lineTo(tx + 5, ty).fill({ color: 0x333328, alpha: 0.6 });
      } else {
        bg.roundRect(tx - 8, ty - ts.h + 4, 16, ts.h - 4, 1).fill({ color: 0x2a2a22, alpha: 0.6 });
      }
    }

    // Fog wisps
    for (let i = 0; i < 15; i++) {
      const fx = (i * 5431 + 20) % sw, fy = sh * 0.7 + (i * 2713) % (sh * 0.15);
      bg.ellipse(fx, fy, 50 + (i % 5) * 20, 5).fill({ color: 0x334455, alpha: 0.04 });
    }

    // Green glow from ground (necromantic energy)
    bg.ellipse(sw / 2, groundY, 180, 20).fill({ color: 0x44ff88, alpha: 0.02 });
    bg.ellipse(sw / 2, groundY, 100, 10).fill({ color: 0x44ff88, alpha: 0.03 });

    // Floating spirits
    for (let i = 0; i < 5; i++) {
      const sx = sw * 0.15 + i * sw * 0.17;
      const sy = sh * 0.55 + Math.sin(i * 1.7) * 30;
      bg.circle(sx, sy, 3).fill({ color: 0x44ff88, alpha: 0.04 });
      bg.moveTo(sx, sy + 3).bezierCurveTo(sx + 2, sy + 10, sx - 2, sy + 18, sx + 1, sy + 25).stroke({ color: 0x44ff88, width: 0.5, alpha: 0.03 });
    }

    // Vignette
    for (let v = 0; v < 8; v++) {
      const inset = v * 35;
      bg.rect(0, 0, inset, sh).fill({ color: 0x000000, alpha: 0.04 });
      bg.rect(sw - inset, 0, inset, sh).fill({ color: 0x000000, alpha: 0.04 });
    }

    c.addChild(bg);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    // Title with glow
    const titleG = new Graphics();
    titleG.ellipse(sw / 2, 50, 140, 20).fill({ color: 0x44ff88, alpha: 0.03 });
    c.addChild(titleG);
    addText("\u2620 NECROMANCER \u2620", sw / 2, 36, { fontSize: 48, fill: 0x44ff88, fontWeight: "bold", letterSpacing: 6 }, true);
    addText("Raise the Dead", sw / 2, 74, { fontSize: 22, fill: 0x2a6644, fontStyle: "italic" }, true);

    // Instructions in a dark panel
    const panelG = new Graphics();
    panelG.roundRect(sw / 2 - 200, 96, 400, 110, 8).fill({ color: 0x0a0a08, alpha: 0.6 });
    panelG.roundRect(sw / 2 - 200, 96, 400, 110, 8).stroke({ color: 0x44ff88, width: 0.5, alpha: 0.1 });
    c.addChild(panelG);
    addText(
      "Dig up corpses from the graveyard.\nReanimate them with dark rituals.\nCombine body parts for chimera undead.\nSend your army against crusader waves.\n\nBeware: each resurrection drains your life force!",
      sw / 2, 104, { fontSize: 18, fill: 0x668866, align: "center", wordWrap: true, wordWrapWidth: 370, lineHeight: 17 }, true,
    );

    // Detailed skull
    const skX = sw / 2, skY = sh * 0.44;
    const skull = new Graphics();
    // Skull outline
    skull.ellipse(skX, skY, 18, 22).fill({ color: 0xccccbb, alpha: 0.12 });
    skull.ellipse(skX, skY + 2, 16, 18).fill({ color: 0xbbbbaa, alpha: 0.08 });
    // Eye sockets
    skull.ellipse(skX - 6, skY - 4, 5, 6).fill({ color: 0x0a0812, alpha: 0.2 });
    skull.ellipse(skX + 6, skY - 4, 5, 6).fill({ color: 0x0a0812, alpha: 0.2 });
    // Green eye glow
    skull.circle(skX - 6, skY - 4, 3).fill({ color: 0x44ff88, alpha: 0.06 });
    skull.circle(skX + 6, skY - 4, 3).fill({ color: 0x44ff88, alpha: 0.06 });
    // Nose
    skull.moveTo(skX - 2, skY + 3).lineTo(skX, skY + 6).lineTo(skX + 2, skY + 3).stroke({ color: 0x0a0812, width: 0.8, alpha: 0.15 });
    // Teeth
    for (let ti = -3; ti <= 3; ti++) {
      skull.rect(skX + ti * 2.5 - 1, skY + 10, 2, 4).fill({ color: 0xccccbb, alpha: 0.07 });
    }
    // Jaw line
    skull.moveTo(skX - 12, skY + 8).bezierCurveTo(skX - 8, skY + 16, skX + 8, skY + 16, skX + 12, skY + 8).stroke({ color: 0xccccbb, width: 0.8, alpha: 0.08 });
    // Crossed bones behind
    skull.moveTo(skX - 22, skY + 20).lineTo(skX + 22, skY - 16).stroke({ color: 0xccccbb, width: 2, alpha: 0.05 });
    skull.moveTo(skX + 22, skY + 20).lineTo(skX - 22, skY - 16).stroke({ color: 0xccccbb, width: 2, alpha: 0.05 });
    c.addChild(skull);

    // High score
    try {
      const hs = parseInt(localStorage.getItem("necro_highscore") ?? "0") || 0;
      if (hs > 0) addText(`High Score: ${hs}`, sw / 2, sh * 0.52, { fontSize: 18, fill: 0x667766 }, true);
    } catch { /* */ }

    const btn = new Graphics();
    btn.roundRect(sw / 2 - 85, sh * 0.58, 170, 42, 6).fill({ color: 0x0a0a0a, alpha: 0.85 });
    btn.roundRect(sw / 2 - 85, sh * 0.58, 170, 42, 6).stroke({ color: 0x44ff88, width: 2, alpha: 0.6 });
    // Inner glow
    btn.roundRect(sw / 2 - 83, sh * 0.58 + 2, 166, 38, 5).stroke({ color: 0x44ff88, width: 0.5, alpha: 0.15 });
    btn.eventMode = "static"; btn.cursor = "pointer";
    btn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this._startGame();
    });
    c.addChild(btn);
    addText("RAISE THE DEAD", sw / 2, sh * 0.58 + 13, { fontSize: 22, fill: 0x44ff88, fontWeight: "bold", letterSpacing: 3 }, true);

    const backBtn = new Graphics();
    backBtn.roundRect(sw / 2 - 45, sh * 0.69, 90, 26, 4).fill({ color: 0x0a0a0a, alpha: 0.6 });
    backBtn.roundRect(sw / 2 - 45, sh * 0.69, 90, 26, 4).stroke({ color: 0x555555, width: 1 });
    backBtn.eventMode = "static"; backBtn.cursor = "pointer";
    backBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this.destroy(); window.dispatchEvent(new Event("necromancerExit"));
    });
    c.addChild(backBtn);
    addText("BACK", sw / 2, sh * 0.69 + 6, { fontSize: 18, fill: 0x888888 }, true);

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
    rollWaveEvent(this._state);
    prepareBattleWave(this._state);
    this._state.announcements.push({ text: `Wave ${this._state.wave + 1} — FIGHT!`, color: 0xff4444, timer: 2 });

    this._setupInput("battle");
  }

  // ── Upgrade phase ──────────────────────────────────────────────────────

  private _showUpgradeScreen(): void {
    this._stopTicker();
    this._removePointer();
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }

    // Heal undead between waves (30%)
    healUndeadBetweenWaves(this._state);

    const c = new Container();
    const ov = new Graphics();
    ov.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.88 });
    ov.eventMode = "static"; c.addChild(ov);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    addText(`Wave ${this._state.wave + 1} Complete!`, this._sw / 2, 30, { fontSize: 32, fill: 0x44ff88, fontWeight: "bold" }, true);
    addText(`Gold: ${this._state.gold}g | Army: ${this._state.undead.length} | Kills: ${this._state.waveKills} | HP: ${this._state.playerHp}/${this._state.maxPlayerHp}`, this._sw / 2, 55, { fontSize: 18, fill: 0xccddcc }, true);

    // Wave bonuses
    if (this._waveBonuses.bonuses.length > 0) {
      let bx = this._sw / 2 - this._waveBonuses.bonuses.length * 55;
      for (const bonus of this._waveBonuses.bonuses) {
        addText(`${bonus.label} +${bonus.gold}g`, bx, 70, { fontSize: 17, fill: bonus.color });
        bx += 110;
      }
    }

    // Army roster on the right side
    let armyY = 90;
    addText("YOUR ARMY", this._sw - 95, armyY - 12, { fontSize: 17, fill: 0x889988, letterSpacing: 2 });
    for (const u of this._state.undead) {
      const rosterBg = new Graphics();
      rosterBg.roundRect(this._sw - 145, armyY, 140, 14, 2).fill({ color: 0x0a0a06, alpha: 0.5 });
      rosterBg.circle(this._sw - 135, armyY + 7, 3).fill({ color: u.color });
      c.addChild(rosterBg);
      addText(`${u.name}`, this._sw - 128, armyY + 1, { fontSize: 15, fill: u.chimera ? 0xcc88ff : 0x99aa99 });
      const statsStr = `HP:${u.hp}/${u.maxHp} DMG:${u.damage}${u.ranged ? " R" : ""}`;
      const st = new Text({ text: statsStr, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 14, fill: 0x667766 } as any) });
      st.anchor.set(1, 0); st.position.set(this._sw - 8, armyY + 1); c.addChild(st);
      armyY += 17;
      if (armyY > this._sh - 60) break;
    }

    addText("DARK POWERS", this._sw / 2 - 50, 85, { fontSize: 21, fill: 0x6622aa, letterSpacing: 3 }, true);

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

      addText(`${power.name} (Lv ${level}/${power.maxLevel})`, this._sw / 2 - 150, y + 4, { fontSize: 18, fill: maxed ? 0x44aa44 : canBuy ? 0xffd700 : 0x666666, fontWeight: "bold" });
      addText(power.description, this._sw / 2 - 150, y + 18, { fontSize: 17, fill: 0x778877 });
      if (!maxed) addText(`${power.cost}g`, this._sw / 2 + 130, y + 8, { fontSize: 18, fill: canBuy ? 0xffd700 : 0x554444, fontWeight: "bold" });

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
      addText("Heal (20g)", this._sw / 2, y + 8, { fontSize: 16, fill: 0xff6644 }, true);
      y += 38;
    }

    // Consumable items
    y += 4;
    addText("ITEMS", this._sw / 2 - 50, y, { fontSize: 18, fill: 0xccaa66, letterSpacing: 2 }, true);
    y += 14;
    for (const item of CONSUMABLES) {
      const canAfford = this._state.gold >= item.cost;
      // Skip resurrect if no fallen
      if (item.id === "resurrect_scroll" && this._state.fallenUndead.length === 0) continue;

      const ibtn = new Graphics();
      ibtn.roundRect(this._sw / 2 - 120, y, 240, 22, 4).fill({ color: 0x0a0a06, alpha: 0.7 });
      ibtn.roundRect(this._sw / 2 - 120, y, 240, 22, 4).stroke({ color: canAfford ? 0xccaa66 : 0x333322, width: 0.5, alpha: 0.4 });
      if (canAfford) {
        ibtn.eventMode = "static"; ibtn.cursor = "pointer";
        const iid = item.id, icost = item.cost;
        ibtn.on("pointerdown", () => {
          this._state.gold -= icost;
          this._applyConsumable(iid);
          viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
          this._showUpgradeScreen();
        });
      }
      c.addChild(ibtn);
      addText(`${item.name} — ${item.description}`, this._sw / 2 - 110, y + 4, { fontSize: 15, fill: canAfford ? 0xccccaa : 0x555544 });
      addText(`${item.cost}g`, this._sw / 2 + 100, y + 4, { fontSize: 17, fill: canAfford ? 0xffd700 : 0x554433, fontWeight: "bold" });
      y += 26;
    }

    // Wave preview — show what's coming next
    y += 8;
    const nextWave = this._state.wave + 1;
    const isEndless = nextWave >= this._state.totalWaves;
    if (!isEndless || this._state.endless) {
      const preview: WaveEntry[] = nextWave < WAVES.length ? WAVES[nextWave] : generateEndlessWave(nextWave);
      addText(`Next Wave ${nextWave + 1}:`, this._sw / 2, y, { fontSize: 16, fill: 0xcc8844, fontWeight: "bold" }, true);
      y += 16;
      const previewStr = preview.map(e => `${CRUSADERS[e.type].name} x${e.count}`).join("  |  ");
      addText(previewStr, this._sw / 2, y, { fontSize: 17, fill: 0x998866 }, true);
      y += 16;
    }

    // Boss wave preview warning
    if (BOSS_WAVES[nextWave]) {
      y += 4;
      addText(`\u2620 BOSS WAVE — ${BOSSES[BOSS_WAVES[nextWave]].name} \u2620`, this._sw / 2, y, { fontSize: 18, fill: 0xff4444, fontWeight: "bold" }, true);
      y += 14;
      addText(BOSSES[BOSS_WAVES[nextWave]].description, this._sw / 2, y, { fontSize: 15, fill: 0xcc6644 }, true);
      y += 12;
    }

    // Relic choice (after boss waves)
    if (this._state.pendingRelicChoice && this._state.pendingRelicChoice.length > 0) {
      y += 4;
      addText("Choose a Relic:", this._sw / 2, y, { fontSize: 18, fill: 0xffd700, fontWeight: "bold" }, true);
      y += 18;
      const choices = this._state.pendingRelicChoice;
      const cardW = 130, cardH = 50, gap = 10;
      const totalW = choices.length * cardW + (choices.length - 1) * gap;
      let cx2 = this._sw / 2 - totalW / 2;
      for (const relic of choices) {
        const borderCol = relic.rarity === "legendary" ? 0xffd700 : relic.rarity === "rare" ? 0x4488ff : 0x44aa44;
        const card = new Graphics();
        card.roundRect(cx2, y, cardW, cardH, 4).fill({ color: 0x0a0a0a, alpha: 0.85 });
        card.roundRect(cx2, y, cardW, cardH, 4).stroke({ color: borderCol, width: 1.5, alpha: 0.7 });
        card.eventMode = "static"; card.cursor = "pointer";
        const relicId = relic.id;
        card.on("pointerdown", () => {
          pickRelic(this._state, relicId);
          viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
          this._showUpgradeScreen(); // Re-show without relic choice
        });
        c.addChild(card);
        const rarityLabel = relic.rarity === "legendary" ? "\u2605 " : relic.rarity === "rare" ? "\u25C6 " : "";
        addText(`${rarityLabel}${relic.name}`, cx2 + cardW / 2, y + 6, { fontSize: 17, fill: relic.color, fontWeight: "bold" }, true);
        addText(relic.description, cx2 + cardW / 2, y + 22, { fontSize: 14, fill: 0xccccaa }, true);
        addText(`[${relic.rarity.toUpperCase()}]`, cx2 + cardW / 2, y + 36, { fontSize: 14, fill: borderCol }, true);
        cx2 += cardW + gap;
      }
      y += cardH + 8;
    }

    // Current relics display
    if (this._state.relics.length > 0) {
      addText(`Relics (${this._state.relics.length}/4):`, this._sw / 2, y, { fontSize: 18, fill: 0xccaa88 }, true);
      y += 14;
      const relicStr = this._state.relics.map(r => r.name).join("  |  ");
      addText(relicStr, this._sw / 2, y, { fontSize: 15, fill: 0xaa9977 }, true);
      y += 14;
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
    addText(btnLabel, this._sw / 2, y + 10, { fontSize: 19, fill: 0x44ff88, fontWeight: "bold", letterSpacing: 2 }, true);

    viewManager.addToLayer("ui", c);
  }

  private _applyConsumable(id: string): void {
    switch (id) {
      case "heal_draught":
        this._state.playerHp = Math.min(this._state.maxPlayerHp, this._state.playerHp + 5);
        this._state.announcements.push({ text: "+5 HP!", color: 0xff4488, timer: 1.5 });
        break;
      case "mana_potion":
        this._state.mana = Math.min(this._state.maxMana, this._state.mana + 30);
        this._state.announcements.push({ text: "+30 Mana!", color: 0x4466cc, timer: 1.5 });
        break;
      case "resurrect_scroll":
        if (this._state.fallenUndead.length > 0) {
          const fallen = this._state.fallenUndead.pop()!;
          fallen.alive = true;
          fallen.hp = fallen.maxHp;
          this._state.undead.push(fallen);
          this._state.announcements.push({ text: `Resurrected: ${fallen.name}!`, color: 0x44ff88, timer: 2 });
        }
        break;
      case "war_drum":
        this._state.tempDamageBonus += 3;
        this._state.announcements.push({ text: "War Drums! +3 DMG next wave", color: 0xff8844, timer: 2 });
        break;
      case "bone_shield":
        this._state.tempHpBonus += 5;
        this._state.announcements.push({ text: "Bone Shield! +5 HP next wave", color: 0xccccbb, timer: 2 });
        break;
    }
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

    addText("\u2620 DEFEATED \u2620", this._sw / 2, py + 16, { fontSize: 35, fill: 0xff4444, fontWeight: "bold", letterSpacing: 3 }, true);
    addText("The crusaders have prevailed...", this._sw / 2, py + 46, { fontSize: 18, fill: 0x886666, fontStyle: "italic" }, true);

    try {
      const prev = parseInt(localStorage.getItem("necro_highscore") ?? "0") || 0;
      if (this._state.score > prev) {
        localStorage.setItem("necro_highscore", `${this._state.score}`);
        addText("\u2605 NEW HIGH SCORE! \u2605", this._sw / 2, py + 64, { fontSize: 18, fill: 0xffd700, fontWeight: "bold" }, true);
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
      addText(label, px + 30, y, { fontSize: 18, fill: 0x778866 });
      const vt = new Text({ text: value, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 18, fill: color, fontWeight: "bold" } as any) });
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

    addText("\u2620 VICTORY \u2620", this._sw / 2, py + 16, { fontSize: 38, fill: 0x44ff88, fontWeight: "bold", letterSpacing: 5 }, true);
    addText("The living shall serve the dead!", this._sw / 2, py + 48, { fontSize: 19, fill: 0x2a6644, fontStyle: "italic" }, true);

    try {
      const prev = parseInt(localStorage.getItem("necro_highscore") ?? "0") || 0;
      if (this._state.score > prev) {
        localStorage.setItem("necro_highscore", `${this._state.score}`);
        addText("\u2605 NEW HIGH SCORE! \u2605", this._sw / 2, py + 66, { fontSize: 18, fill: 0xffd700, fontWeight: "bold" }, true);
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
      addText(label, px + 35, y, { fontSize: 18, fill: 0x778866 });
      const vt = new Text({ text: value, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 18, fill: color, fontWeight: "bold" } as any) });
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
    addText("ENDLESS MODE \u221E", this._sw / 2, y + 9, { fontSize: 18, fill: 0xaa44ff, fontWeight: "bold", letterSpacing: 2 }, true);

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
    addText("PLAY AGAIN", this._sw / 2, y + 9, { fontSize: 18, fill: 0x44ff88, fontWeight: "bold" }, true);

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
    addText("MENU", this._sw / 2, y + 5, { fontSize: 18, fill: 0x888888 }, true);
  }

  // ── Input setup ────────────────────────────────────────────────────────

  private _setupInput(phase: string): void {
    // Clear old handlers
    this._removePointer();
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }

    const ox = (this._sw - NECRO_FW) / 2, oy = 50;

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

      // Grave scouting — hover to preview
      this._pointerMove = (e: { global: { x: number; y: number } }) => {
        const wx = e.global.x - ox, wy = e.global.y - oy;
        this._state.hoveredGraveId = -1;
        for (const grave of this._state.graves) {
          if (grave.dug) continue;
          const dx = wx - grave.x, dy = wy - grave.y;
          if (dx * dx + dy * dy < 20 * 20) {
            this._state.hoveredGraveId = grave.id;
            break;
          }
        }
      };
      viewManager.app.stage.on("pointermove", this._pointerMove);

      this._keyHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape") { if (this._pauseMenu) { this._hidePauseMenu(); } else { this._showPauseMenu(); } return; }
        if (e.key === " ") {
          e.preventDefault();
          this._enterRitualPhase();
        }
        if (e.key === "d" || e.key === "D") {
          digAll(this._state);
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
        if (e.key === "Escape") { if (this._pauseMenu) { this._hidePauseMenu(); } else { this._showPauseMenu(); } return; }
        if (e.key === "Enter") {
          e.preventDefault();
          startRaise(this._state);
        }
        if (e.key === " ") {
          e.preventDefault();
          this._enterBattlePhase();
        }
        if (e.key === "c" || e.key === "C") {
          // Clear ritual slots
          this._state.ritualSlotA = null;
          this._state.ritualSlotB = null;
        }
        if (e.key === "x" || e.key === "X") {
          // Sacrifice last undead for mana
          if (this._state.undead.length > 0) {
            sacrificeUndead(this._state, this._state.undead[this._state.undead.length - 1].id);
          }
        }
      };
      window.addEventListener("keydown", this._keyHandler);
    } else if (phase === "battle") {
      // Left-click = rally point (shift+click = Dark Nova)
      this._pointerDown = (e: any) => {
        const wx = e.global.x - ox, wy = e.global.y - oy;
        const shiftHeld = (e as any).originalEvent?.shiftKey || (e as any).nativeEvent?.shiftKey;
        if (shiftHeld) {
          castDarkNova(this._state, wx, wy);
        } else {
          // Set rally point
          if (wx > 0 && wx < NECRO_FW && wy > 0 && wy < NECRO_FH) {
            setRallyPoint(this._state, wx, wy);
          }
        }
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
        if (e.key === "Escape") { if (this._pauseMenu) { this._hidePauseMenu(); } else { this._showPauseMenu(); } return; }
        if (e.key === "q" || e.key === "Q") {
          // Dark Nova at center/rally point
          const rp = this._state.rallyPoint;
          castDarkNova(this._state, rp ? rp.x : NECRO_FW / 2, rp ? rp.y : NECRO_FH / 2);
        }
        if (e.key === "w" || e.key === "W") {
          castBoneWall(this._state, NECRO_FW / 2, NECRO_FH / 2);
        }
        if (e.key === "e" || e.key === "E") {
          const rp = this._state.rallyPoint;
          castSoulLeech(this._state, rp ? rp.x : NECRO_FW / 2, rp ? rp.y : NECRO_FH / 2);
        }
        if (e.key === "r" || e.key === "R") {
          this._state.rallyPoint = null;
          this._state.announcements.push({ text: "Rally cleared", color: 0x889988, timer: 1 });
        }
        if (e.key === "f" || e.key === "F") {
          castWarCry(this._state);
        }
        if (e.key === "s" || e.key === "S") {
          this._state.battleSpeed = this._state.battleSpeed === 1 ? 2 : 1;
          this._state.announcements.push({ text: `Speed: ${this._state.battleSpeed}x`, color: 0xccccaa, timer: 1 });
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

    if (this._paused) { this._renderer.draw(this._state, this._sw, this._sh); return; }

    if (this._state.phase === "dig") {
      updateDig(this._state, clampDt);
    } else if (this._state.phase === "ritual") {
      updateRitual(this._state, clampDt);
    } else if (this._state.phase === "battle") {
      const speedDt = clampDt * this._state.battleSpeed;
      updateBattle(this._state, speedDt);

      if (this._state.battleWon) {
        this._state.battleWon = false;
        // Calculate wave bonuses
        this._waveBonuses = calculateWaveBonuses(this._state);
        this._state.announcements.push({ text: "WAVE CLEARED!", color: 0x44ff88, timer: 2 });
        if (this._waveBonuses.total > 0) {
          this._state.announcements.push({ text: `+${this._waveBonuses.total}g bonus!`, color: 0xffd700, timer: 2 });
        }
        setTimeout(() => this._showUpgradeScreen(), 1500);
        this._state.phase = "start";
      }
      if (this._state.battleLost) {
        this._state.battleLost = false;
        this._showDefeatScreen();
        return;
      }
    }

    this._renderer.draw(this._state, this._sw, this._sh);
  }

  private _showPauseMenu(): void {
    this._paused = true;
    const sw = this._sw, sh = this._sh;
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.82 });
    bg.eventMode = "static";
    c.addChild(bg);

    const pw = 440, ph = 360, px = (sw - pw) / 2, py = (sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x0a0a06, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: 0x44ff88, width: 2, alpha: 0.4 });
    panel.roundRect(px + 4, py + 4, pw - 8, ph - 8, 8).stroke({ color: 0x44ff88, width: 0.5, alpha: 0.1 });
    c.addChild(panel);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0);
      t.position.set(x, y);
      c.addChild(t);
    };

    addText("PAUSED", sw / 2, py + 16, { fontSize: 22, fill: 0x44ff88, fontWeight: "bold", letterSpacing: 4 }, true);

    const contentContainer = new Container();
    c.addChild(contentContainer);
    const clearContent = () => { while (contentContainer.children.length > 0) { const ch = contentContainer.removeChildAt(0); ch.destroy(); } };

    const showButtons = () => {
      clearContent();
      const makeBtn = (label: string, y: number, color: number, cb: () => void) => {
        const btn = new Graphics();
        btn.roundRect(sw / 2 - 100, y, 200, 36, 5).fill({ color: 0x0a0a06, alpha: 0.8 });
        btn.roundRect(sw / 2 - 100, y, 200, 36, 5).stroke({ color, width: 1.5, alpha: 0.6 });
        btn.eventMode = "static"; btn.cursor = "pointer";
        btn.on("pointerdown", cb);
        contentContainer.addChild(btn);
        const t = new Text({ text: label, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 17, fill: color, fontWeight: "bold", letterSpacing: 1 } as any) });
        t.anchor.set(0.5, 0.5); t.position.set(sw / 2, y + 18);
        contentContainer.addChild(t);
      };

      makeBtn("RESUME", py + 70, 0x44cc66, () => this._hidePauseMenu());
      makeBtn("CONTROLS", py + 120, 0xccaa44, () => {
        clearContent();
        const addCText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
          const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
          if (center) t.anchor.set(0.5, 0);
          t.position.set(x, y);
          contentContainer.addChild(t);
        };
        addCText("DIG: Click grave to dig | D: dig all\nRITUAL: Click corpse to place | Enter: raise\n  C: clear slots | X: sacrifice | Space: battle\nBATTLE: LMB: rally | Shift+LMB: Dark Nova\n  RMB/W: Bone Wall | E: Soul Leech\n  R: clear rally | F: War Cry | S: speed\nSpace: next phase | Esc: pause", sw / 2, py + 70, { fontSize: 16, fill: 0xccccaa, align: "center", lineHeight: 21 }, true);
        makeBackBtn();
      });
      makeBtn("INSTRUCTIONS", py + 170, 0xccaa44, () => {
        clearContent();
        const addCText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
          const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
          if (center) t.anchor.set(0.5, 0);
          t.position.set(x, y);
          contentContainer.addChild(t);
        };
        addCText("Dig up corpses from the graveyard.\nReanimate them with dark rituals.\nCombine two corpses for chimera undead.\nSend your army against crusader waves.\nEach resurrection drains your life force!\nSurvive 10 waves to win.", sw / 2, py + 70, { fontSize: 16, fill: 0xccccaa, align: "center", wordWrap: true, wordWrapWidth: 380, lineHeight: 20 }, true);
        makeBackBtn();
      });
      makeBtn("MAIN MENU", py + 270, 0xcc4444, () => {
        this._hidePauseMenu();
        this.destroy();
        window.dispatchEvent(new Event("necromancerExit"));
      });
    };

    const makeBackBtn = () => {
      const btn = new Graphics();
      btn.roundRect(sw / 2 - 60, py + ph - 60, 120, 32, 4).fill({ color: 0x0a0a06, alpha: 0.8 });
      btn.roundRect(sw / 2 - 60, py + ph - 60, 120, 32, 4).stroke({ color: 0x888866, width: 1, alpha: 0.5 });
      btn.eventMode = "static"; btn.cursor = "pointer";
      btn.on("pointerdown", () => showButtons());
      contentContainer.addChild(btn);
      const t = new Text({ text: "BACK", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 15, fill: 0x888888, fontWeight: "bold" } as any) });
      t.anchor.set(0.5, 0.5); t.position.set(sw / 2, py + ph - 44);
      contentContainer.addChild(t);
    };

    showButtons();
    this._pauseMenu = c;
    viewManager.addToLayer("ui", c);
  }

  private _hidePauseMenu(): void {
    this._paused = false;
    if (this._pauseMenu) {
      viewManager.removeFromLayer("ui", this._pauseMenu);
      this._pauseMenu.destroy({ children: true });
      this._pauseMenu = null;
    }
  }
}
