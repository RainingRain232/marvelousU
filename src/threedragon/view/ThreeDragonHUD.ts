// ---------------------------------------------------------------------------
// 3Dragon mode — HUD overlay (HTML-based for clean overlay on Three.js)
// ---------------------------------------------------------------------------

import type { ThreeDragonState } from "../state/ThreeDragonState";
import { TDSkillId } from "../state/ThreeDragonState";
import { TD_SKILL_CONFIGS } from "../config/ThreeDragonConfig";

// ---------------------------------------------------------------------------
// ThreeDragonHUD
// ---------------------------------------------------------------------------

export class ThreeDragonHUD {
  private _root!: HTMLDivElement;
  private _hpBar!: HTMLDivElement;
  private _hpFill!: HTMLDivElement;
  private _hpText!: HTMLDivElement;
  private _manaBar!: HTMLDivElement; // bar container
  private _manaFill!: HTMLDivElement;
  private _manaText!: HTMLDivElement;
  private _scoreEl!: HTMLDivElement;
  private _waveEl!: HTMLDivElement;
  private _comboEl!: HTMLDivElement;
  private _skillBar!: HTMLDivElement;
  private _skillSlots: { el: HTMLDivElement; cdOverlay: HTMLDivElement; active: HTMLDivElement; cdText: HTMLDivElement }[] = [];
  private _bossBar!: HTMLDivElement;
  private _bossFill!: HTMLDivElement;
  private _bossShine!: HTMLDivElement;
  private _bossName!: HTMLDivElement;
  private _notification!: HTMLDivElement;
  private _centerText!: HTMLDivElement;
  private _notifTimer = 0;
  private _lastComboCount = 0;
  private _styleEl!: HTMLStyleElement;
  private _mapNameEl!: HTMLDivElement;
  private _highScoreEl!: HTMLDivElement;
  private _dmgNumbers: { el: HTMLDivElement; timer: number; startY: number }[] = [];
  private _pauseOverlay!: HTMLDivElement;
  private _pauseMenuVisible = false;
  private _onPauseResume: (() => void) | null = null;
  private _onPauseRestart: (() => void) | null = null;
  private _onPauseQuit: (() => void) | null = null;
  private _edgeIndicators: HTMLDivElement[] = [];

  build(_sw: number, _sh: number): void {
    // Inject keyframe animations
    this._styleEl = document.createElement("style");
    this._styleEl.textContent = `
      @keyframes td-shine-sweep {
        0% { transform: translateX(-100%) skewX(-15deg); }
        100% { transform: translateX(300%) skewX(-15deg); }
      }
      @keyframes td-combo-pop {
        0% { transform: translateX(-50%) scale(1.6); opacity: 1; }
        30% { transform: translateX(-50%) scale(0.95); }
        50% { transform: translateX(-50%) scale(1.05); }
        100% { transform: translateX(-50%) scale(1.0); opacity: 1; }
      }
      @keyframes td-notif-in {
        0% { transform: translateX(-50%) scale(0.5) translateY(20px); opacity: 0; }
        60% { transform: translateX(-50%) scale(1.08) translateY(-2px); opacity: 1; }
        100% { transform: translateX(-50%) scale(1.0) translateY(0); opacity: 1; }
      }
      @keyframes td-skill-ready-pulse {
        0%, 100% { box-shadow: 0 0 4px rgba(255,255,255,0.1) inset; }
        50% { box-shadow: 0 0 10px rgba(255,255,255,0.2) inset; }
      }
      @keyframes td-boss-appear {
        0% { opacity: 0; transform: scaleX(0); }
        60% { opacity: 1; transform: scaleX(1.02); }
        100% { opacity: 1; transform: scaleX(1); }
      }
      @keyframes td-score-bump {
        0% { transform: scale(1.25); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(this._styleEl);

    this._root = document.createElement("div");
    this._root.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 10; font-family: 'Cinzel', Georgia, serif;
      color: white; overflow: hidden;
    `;

    // HP Bar
    const hpContainer = this._createFancyBar(20, 15, 220, 20, "hp");
    this._hpBar = hpContainer;
    this._hpFill = hpContainer.querySelector(".td-fill") as HTMLDivElement;
    this._hpText = hpContainer.querySelector(".td-bar-text") as HTMLDivElement;
    this._root.appendChild(hpContainer);

    // HP label
    const hpLabel = document.createElement("div");
    hpLabel.style.cssText = `
      position:absolute; left:22px; top:12px; font-size:9px; color:#ff9999;
      text-shadow: 0 0 4px rgba(255,100,100,0.5), 1px 1px 2px #000;
      letter-spacing: 2px; text-transform: uppercase; font-weight: bold;
    `;
    hpLabel.textContent = "HEALTH";
    this._root.appendChild(hpLabel);

    // Mana Bar
    const manaContainer = this._createFancyBar(20, 40, 220, 16, "mana");
    this._manaBar = manaContainer;
    this._manaFill = manaContainer.querySelector(".td-fill") as HTMLDivElement;
    this._manaText = manaContainer.querySelector(".td-bar-text") as HTMLDivElement;
    this._root.appendChild(manaContainer);

    // Mana label
    const manaLabel = document.createElement("div");
    manaLabel.style.cssText = `
      position:absolute; left:22px; top:38px; font-size:8px; color:#88aaff;
      text-shadow: 0 0 4px rgba(100,150,255,0.5), 1px 1px 2px #000;
      letter-spacing: 2px; text-transform: uppercase; font-weight: bold;
    `;
    manaLabel.textContent = "MANA";
    this._root.appendChild(manaLabel);

    // Map name (will be set on first update)
    this._mapNameEl = document.createElement("div");
    this._mapNameEl.style.cssText = `
      position: absolute; left: 22px; top: 62px; font-size: 10px;
      color: #667788; letter-spacing: 1px; text-transform: uppercase;
      text-shadow: 1px 1px 2px #000;
    `;
    this._root.appendChild(this._mapNameEl);

    // Score
    this._scoreEl = document.createElement("div");
    this._scoreEl.style.cssText = `
      position: absolute; top: 12px; right: 20px; font-size: 28px;
      color: #ffd700; font-weight: bold;
      text-shadow: 0 0 12px rgba(255,215,0,0.6), 0 0 24px rgba(255,180,0,0.3), 2px 2px 4px rgba(0,0,0,0.9);
      letter-spacing: 3px;
      transition: transform 0.15s ease-out;
    `;
    this._root.appendChild(this._scoreEl);

    // Score label
    const scoreLabel = document.createElement("div");
    scoreLabel.style.cssText = `
      position: absolute; top: 42px; right: 22px; font-size: 9px;
      color: #ccaa66; letter-spacing: 3px; text-transform: uppercase;
      text-shadow: 1px 1px 2px #000;
    `;
    scoreLabel.textContent = "SCORE";
    this._root.appendChild(scoreLabel);

    this._highScoreEl = document.createElement("div");
    this._highScoreEl.style.cssText = `
      position: absolute; top: 54px; right: 22px; font-size: 10px;
      color: #888866; letter-spacing: 1px;
      text-shadow: 1px 1px 2px #000;
    `;
    this._root.appendChild(this._highScoreEl);

    // Wave
    this._waveEl = document.createElement("div");
    this._waveEl.style.cssText = `
      position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
      font-size: 16px; color: #ccddff; font-weight: bold;
      text-shadow: 0 0 8px rgba(100,150,255,0.4), 1px 1px 3px rgba(0,0,0,0.8);
      letter-spacing: 2px; text-transform: uppercase;
      background: linear-gradient(180deg, rgba(20,30,60,0.6) 0%, rgba(10,15,30,0.3) 100%);
      padding: 4px 16px; border-radius: 12px;
      border: 1px solid rgba(100,150,255,0.15);
    `;
    this._root.appendChild(this._waveEl);

    // Combo
    this._comboEl = document.createElement("div");
    this._comboEl.style.cssText = `
      position: absolute; top: 42px; left: 50%; transform: translateX(-50%);
      font-size: 24px; color: #ff8844; font-weight: bold; font-style: italic;
      text-shadow: 0 0 12px rgba(255,136,68,0.7), 0 0 24px rgba(255,68,0,0.4), 2px 2px 4px rgba(0,0,0,0.8);
      opacity: 0;
      transition: opacity 0.2s ease-out;
    `;
    this._root.appendChild(this._comboEl);

    // Skill Bar
    this._skillBar = document.createElement("div");
    this._skillBar.style.cssText = `
      position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 6px;
      background: linear-gradient(180deg, rgba(15,15,35,0.85) 0%, rgba(8,8,20,0.9) 100%);
      border: 1px solid rgba(80,120,180,0.3);
      border-radius: 10px; padding: 8px 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 15px rgba(50,80,150,0.15) inset;
      backdrop-filter: blur(4px);
    `;
    this._buildSkillBar();
    this._root.appendChild(this._skillBar);

    // Boss HP bar (hidden initially)
    this._bossBar = document.createElement("div");
    this._bossBar.style.cssText = `
      position: absolute; top: 56px; left: 25%; width: 50%; height: 16px;
      background: linear-gradient(180deg, #1a0000 0%, #330000 100%);
      border: 1px solid #cc3333; border-radius: 6px;
      overflow: hidden; display: none;
      box-shadow: 0 0 15px rgba(255,0,0,0.3), 0 2px 8px rgba(0,0,0,0.5);
    `;
    this._bossFill = document.createElement("div");
    this._bossFill.style.cssText = `
      width:100%; height:100%;
      background: linear-gradient(180deg, #ff4444 0%, #cc1111 40%, #aa0000 100%);
      border-radius: 5px; transition: width 0.15s ease-out;
      position: relative;
    `;
    this._bossBar.appendChild(this._bossFill);

    // Boss bar shine
    this._bossShine = document.createElement("div");
    this._bossShine.style.cssText = `
      position: absolute; top: 0; left: 0; width: 30%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
      animation: td-shine-sweep 2s ease-in-out infinite;
    `;
    this._bossFill.appendChild(this._bossShine);

    this._root.appendChild(this._bossBar);

    this._bossName = document.createElement("div");
    this._bossName.style.cssText = `
      position: absolute; top: 36px; left: 50%; transform: translateX(-50%);
      font-size: 13px; color: #ffccaa; font-weight: bold;
      text-shadow: 0 0 8px rgba(255,100,50,0.5), 1px 1px 3px rgba(0,0,0,0.8);
      display: none; letter-spacing: 2px; text-transform: uppercase;
    `;
    this._root.appendChild(this._bossName);

    // Notification
    this._notification = document.createElement("div");
    this._notification.style.cssText = `
      position: absolute; top: 30%; left: 50%; transform: translateX(-50%);
      font-size: 34px; font-weight: bold; letter-spacing: 5px;
      text-shadow: 0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,200,100,0.3), 3px 3px 6px rgba(0,0,0,0.8);
      opacity: 0;
      text-align: center;
      text-transform: uppercase;
    `;
    this._root.appendChild(this._notification);

    // Center text
    this._centerText = document.createElement("div");
    this._centerText.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 24px; font-weight: bold; color: #88ccff;
      text-shadow: 0 0 15px rgba(100,180,255,0.5), 2px 2px 4px rgba(0,0,0,0.8);
      text-align: center;
      transition: opacity 0.5s ease-out, color 0.3s;
    `;
    this._root.appendChild(this._centerText);

    // Pause menu overlay
    this._pauseOverlay = document.createElement("div");
    this._pauseOverlay.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7); display: none;
      justify-content: center; align-items: center; flex-direction: column;
      z-index: 50; pointer-events: auto; backdrop-filter: blur(4px);
      font-family: 'Cinzel', Georgia, serif;
    `;

    const pauseTitle = document.createElement("div");
    pauseTitle.style.cssText = `
      font-size: 36px; color: #ccddff; font-weight: bold; letter-spacing: 4px;
      text-shadow: 0 0 15px rgba(100,150,255,0.5), 2px 2px 4px rgba(0,0,0,0.8);
      margin-bottom: 30px; text-transform: uppercase;
    `;
    pauseTitle.textContent = "Paused";
    this._pauseOverlay.appendChild(pauseTitle);

    const btnStyle = `
      width: 200px; padding: 12px 0; margin: 6px; border-radius: 8px;
      border: 1px solid rgba(100,150,255,0.3); cursor: pointer;
      background: linear-gradient(180deg, rgba(20,25,50,0.9) 0%, rgba(10,12,25,0.95) 100%);
      color: #aabbdd; font-size: 16px; font-weight: bold; letter-spacing: 2px;
      text-transform: uppercase; text-align: center;
      font-family: 'Cinzel', Georgia, serif;
      transition: all 0.2s; pointer-events: auto;
    `;
    const btnHover = (el: HTMLDivElement) => {
      el.addEventListener("mouseenter", () => {
        el.style.borderColor = "rgba(255,215,0,0.5)";
        el.style.color = "#ffd700";
        el.style.boxShadow = "0 0 15px rgba(255,215,0,0.15)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.borderColor = "rgba(100,150,255,0.3)";
        el.style.color = "#aabbdd";
        el.style.boxShadow = "none";
      });
    };

    const resumeBtn = document.createElement("div");
    resumeBtn.style.cssText = btnStyle;
    resumeBtn.textContent = "Resume";
    btnHover(resumeBtn);
    resumeBtn.addEventListener("click", () => this._onPauseResume?.());
    this._pauseOverlay.appendChild(resumeBtn);

    const restartBtn = document.createElement("div");
    restartBtn.style.cssText = btnStyle;
    restartBtn.textContent = "Restart";
    btnHover(restartBtn);
    restartBtn.addEventListener("click", () => this._onPauseRestart?.());
    this._pauseOverlay.appendChild(restartBtn);

    const quitBtn = document.createElement("div");
    quitBtn.style.cssText = btnStyle;
    quitBtn.textContent = "Quit";
    btnHover(quitBtn);
    quitBtn.addEventListener("click", () => this._onPauseQuit?.());
    this._pauseOverlay.appendChild(quitBtn);

    this._root.appendChild(this._pauseOverlay);

    document.body.appendChild(this._root);
  }

  private _createFancyBar(x: number, y: number, w: number, h: number, type: "hp" | "mana"): HTMLDivElement {
    const container = document.createElement("div");
    const borderCol = type === "hp" ? "rgba(200,80,80,0.5)" : "rgba(80,100,200,0.5)";
    const bgGrad = type === "hp"
      ? "linear-gradient(180deg, #1a0505 0%, #220808 100%)"
      : "linear-gradient(180deg, #050510 0%, #080820 100%)";
    const shadowCol = type === "hp" ? "rgba(255,50,50,0.15)" : "rgba(50,100,255,0.15)";

    container.style.cssText = `
      position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px;
      background: ${bgGrad}; border: 1px solid ${borderCol}; border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 0 8px ${shadowCol}, 0 2px 4px rgba(0,0,0,0.3);
    `;

    const fill = document.createElement("div");
    fill.className = "td-fill";
    fill.style.cssText = `
      width: 100%; height: 100%; border-radius: 5px;
      transition: width 0.15s ease-out, background 0.3s;
      position: relative;
    `;
    container.appendChild(fill);

    // Animated shine sweep
    const shine = document.createElement("div");
    shine.className = "td-shine";
    shine.style.cssText = `
      position: absolute; top: 0; left: 0; width: 25%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      animation: td-shine-sweep 3s ease-in-out infinite;
    `;
    fill.appendChild(shine);

    // Top highlight for 3D look
    const highlight = document.createElement("div");
    highlight.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; height: 40%;
      background: linear-gradient(180deg, rgba(255,255,255,0.15), transparent);
      border-radius: 5px 5px 0 0;
      pointer-events: none;
    `;
    fill.appendChild(highlight);

    // Text overlay for value
    const text = document.createElement("div");
    text.className = "td-bar-text";
    text.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: ${h < 18 ? 8 : 10}px; font-weight: bold; color: rgba(255,255,255,0.8);
      text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
      z-index: 2;
    `;
    container.appendChild(text);

    return container;
  }

  private _buildSkillBar(): void {
    const skills = [
      TDSkillId.CELESTIAL_LANCE,
      TDSkillId.THUNDERSTORM,
      TDSkillId.FROST_NOVA,
      TDSkillId.METEOR_SHOWER,
      TDSkillId.DIVINE_SHIELD,
    ];

    this._skillSlots = [];
    for (const skillId of skills) {
      const cfg = TD_SKILL_CONFIGS[skillId];
      const slot = document.createElement("div");
      const c = cfg.color;
      const colorHex = `#${c.toString(16).padStart(6, "0")}`;

      slot.style.cssText = `
        width: 60px; height: 54px; position: relative;
        border-radius: 6px; border: 1px solid rgba(100,100,150,0.3);
        background: linear-gradient(180deg, #1e1e32 0%, #12121e 100%);
        text-align: center;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        overflow: hidden;
      `;

      // Color icon glow (replaces plain dot)
      const icon = document.createElement("div");
      icon.style.cssText = `
        width: 14px; height: 14px; border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, ${colorHex}cc, ${colorHex}88, ${colorHex}44);
        box-shadow: 0 0 6px ${colorHex}66, 0 0 12px ${colorHex}33;
        margin-bottom: 2px;
        transition: box-shadow 0.2s;
      `;
      slot.appendChild(icon);

      // Key label
      const key = document.createElement("div");
      key.style.cssText = `
        font-size: 13px; font-weight: bold; color: #eee;
        text-shadow: 0 0 4px rgba(255,255,255,0.3);
      `;
      key.textContent = cfg.key;
      slot.appendChild(key);

      // Name
      const name = document.createElement("div");
      name.style.cssText = `
        font-size: 7px; color: #888; margin-top: 1px;
        letter-spacing: 0.5px; text-transform: uppercase;
      `;
      name.textContent = cfg.name;
      slot.appendChild(name);

      // Cooldown overlay — sweeps from bottom
      const cdOverlay = document.createElement("div");
      cdOverlay.style.cssText = `
        position: absolute; bottom: 0; left: 0; right: 0;
        background: linear-gradient(180deg, rgba(0,0,0,0.3), rgba(0,0,0,0.7));
        border-radius: 0 0 6px 6px;
        height: 0%;
        transition: height 0.1s;
      `;
      slot.appendChild(cdOverlay);

      // Cooldown text
      const cdText = document.createElement("div");
      cdText.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        font-size: 14px; font-weight: bold; color: rgba(255,255,255,0.8);
        text-shadow: 0 0 4px rgba(0,0,0,0.8);
        opacity: 0;
        z-index: 3;
      `;
      slot.appendChild(cdText);

      // Active glow — fancier with gradient border
      const activeGlow = document.createElement("div");
      activeGlow.style.cssText = `
        position: absolute; inset: -2px; border-radius: 8px;
        border: 2px solid #ffdd44;
        box-shadow: 0 0 10px rgba(255,220,68,0.5), 0 0 20px rgba(255,220,68,0.2);
        opacity: 0;
        transition: opacity 0.15s;
      `;
      slot.appendChild(activeGlow);

      this._skillBar.appendChild(slot);
      this._skillSlots.push({ el: slot, cdOverlay, active: activeGlow, cdText });
    }
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(state: ThreeDragonState, _sw: number, _sh: number, dt: number): void {
    const p = state.player;

    // HP
    const hpPct = p.hp / p.maxHp;
    this._hpFill.style.width = `${hpPct * 100}%`;
    if (hpPct > 0.5) {
      this._hpFill.style.background = "linear-gradient(180deg, #55dd55 0%, #33aa33 40%, #228822 100%)";
    } else if (hpPct > 0.25) {
      this._hpFill.style.background = "linear-gradient(180deg, #ddcc33 0%, #ccaa22 40%, #aa8811 100%)";
    } else {
      this._hpFill.style.background = "linear-gradient(180deg, #ee3333 0%, #cc2222 40%, #aa1111 100%)";
    }
    this._hpText.textContent = `${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`;

    if (hpPct < 0.25) {
      const pulse = 0.3 + Math.sin(state.gameTime * 6) * 0.15;
      this._hpBar.style.boxShadow = `0 0 12px rgba(255,0,0,${pulse}), 0 0 24px rgba(255,0,0,${pulse * 0.5})`;
    } else {
      this._hpBar.style.boxShadow = "0 0 8px rgba(255,50,50,0.15), 0 2px 4px rgba(0,0,0,0.3)";
    }

    // Mana
    const manaPct = p.mana / p.maxMana;
    this._manaFill.style.width = `${manaPct * 100}%`;
    this._manaFill.style.background = "linear-gradient(180deg, #5599ff 0%, #3366dd 40%, #2244aa 100%)";
    this._manaText.textContent = `${Math.ceil(p.mana)} / ${Math.ceil(p.maxMana)}`;

    if (p.mana < 20) {
      const pulse = 0.2 + Math.sin(state.gameTime * 4) * 0.1;
      this._manaBar.style.boxShadow = `0 0 8px rgba(68,136,255,${pulse})`;
    } else {
      this._manaBar.style.boxShadow = "0 0 8px rgba(50,100,255,0.15), 0 2px 4px rgba(0,0,0,0.3)";
    }

    // Map name
    if (this._mapNameEl && !this._mapNameEl.textContent) {
      // Convert mapId to display name
      const names: Record<string, string> = {
        enchanted_valley: "Enchanted Valley",
        frozen_wastes: "Frozen Wastes",
        volcanic_ashlands: "Volcanic Ashlands",
        crystal_caverns: "Crystal Caverns",
        celestial_peaks: "Celestial Peaks",
      };
      this._mapNameEl.textContent = names[state.mapId] || state.mapId;
    }

    // Score
    const scoreText = p.score.toLocaleString();
    if (this._scoreEl.textContent !== scoreText) {
      this._scoreEl.textContent = scoreText;
      this._scoreEl.style.animation = "none";
      // Force reflow
      void this._scoreEl.offsetWidth;
      this._scoreEl.style.animation = "td-score-bump 0.2s ease-out";
    }

    // High score
    const hsKey = `td_highscore_${state.mapId}`;
    const hs = parseInt(localStorage.getItem(hsKey) || "0");
    if (hs > 0) {
      this._highScoreEl.textContent = `Best: ${hs.toLocaleString()}`;
      this._highScoreEl.style.display = "block";
    } else {
      this._highScoreEl.style.display = "none";
    }

    // Wave
    if (state.betweenWaves) {
      this._waveEl.textContent = state.wave === 0 ? "Get Ready!" : `Wave ${state.wave} Complete`;
    } else {
      this._waveEl.textContent = `Wave ${state.wave} / ${state.totalWaves}`;
    }

    // Combo
    if (p.comboCount > 2) {
      this._comboEl.textContent = `${p.comboCount}x COMBO`;
      this._comboEl.style.opacity = `${Math.min(1, p.comboTimer)}`;

      // Pop animation when combo increments
      if (p.comboCount !== this._lastComboCount) {
        this._comboEl.style.animation = "none";
        void this._comboEl.offsetWidth;
        this._comboEl.style.animation = "td-combo-pop 0.35s ease-out";

        // Color escalation
        if (p.comboCount >= 20) {
          this._comboEl.style.color = "#ff2244";
          this._comboEl.style.textShadow = "0 0 16px rgba(255,34,68,0.8), 0 0 32px rgba(255,0,0,0.5), 2px 2px 4px rgba(0,0,0,0.8)";
        } else if (p.comboCount >= 10) {
          this._comboEl.style.color = "#ffaa22";
          this._comboEl.style.textShadow = "0 0 14px rgba(255,170,34,0.7), 0 0 28px rgba(255,100,0,0.4), 2px 2px 4px rgba(0,0,0,0.8)";
        } else if (p.comboCount >= 5) {
          this._comboEl.style.color = "#ffcc44";
          this._comboEl.style.textShadow = "0 0 12px rgba(255,204,68,0.6), 0 0 24px rgba(255,150,0,0.3), 2px 2px 4px rgba(0,0,0,0.8)";
        } else {
          this._comboEl.style.color = "#ff8844";
          this._comboEl.style.textShadow = "0 0 12px rgba(255,136,68,0.7), 0 0 24px rgba(255,68,0,0.4), 2px 2px 4px rgba(0,0,0,0.8)";
        }
      }
      this._lastComboCount = p.comboCount;

      const scale = 1 + Math.min(0.4, p.comboCount * 0.02);
      const fontSize = Math.min(36, 24 + p.comboCount * 0.5);
      this._comboEl.style.fontSize = `${fontSize}px`;
      // Only set transform when not mid-animation (the animation handles scale)
      if (!this._comboEl.style.animationName) {
        this._comboEl.style.transform = `translateX(-50%) scale(${scale})`;
      }
    } else {
      this._comboEl.style.opacity = "0";
      this._lastComboCount = 0;
    }

    // Skills
    const skillIds = [
      TDSkillId.CELESTIAL_LANCE,
      TDSkillId.THUNDERSTORM,
      TDSkillId.FROST_NOVA,
      TDSkillId.METEOR_SHOWER,
      TDSkillId.DIVINE_SHIELD,
    ];
    for (let i = 0; i < skillIds.length; i++) {
      const skillState = state.skills.find(s => s.id === skillIds[i])!;
      const cfg = TD_SKILL_CONFIGS[skillIds[i]];
      const slot = this._skillSlots[i];
      const colorHex = `#${cfg.color.toString(16).padStart(6, "0")}`;

      const onCooldown = skillState.cooldown > 0;
      const hasEnough = p.mana >= cfg.manaCost;

      // Cooldown overlay
      if (onCooldown) {
        const cdPct = (skillState.cooldown / skillState.maxCooldown) * 100;
        slot.cdOverlay.style.height = `${cdPct}%`;
        slot.cdText.style.opacity = "1";
        slot.cdText.textContent = `${Math.ceil(skillState.cooldown)}`;
      } else {
        slot.cdOverlay.style.height = "0%";
        slot.cdText.style.opacity = "0";
      }

      // Border + state styling
      if (skillState.active) {
        slot.el.style.borderColor = "#ffdd44";
        slot.el.style.background = `linear-gradient(180deg, #2a2a10 0%, #1a1a08 100%)`;
        slot.el.style.boxShadow = `0 0 12px rgba(255,220,68,0.4)`;
        slot.active.style.opacity = "1";
      } else if (hasEnough && !onCooldown) {
        slot.el.style.borderColor = `${colorHex}88`;
        slot.el.style.background = `linear-gradient(180deg, #1e2238 0%, #141828 100%)`;
        slot.el.style.boxShadow = `0 0 6px ${colorHex}22`;
        slot.el.style.animation = "td-skill-ready-pulse 2s ease-in-out infinite";
        slot.active.style.opacity = "0";
      } else {
        slot.el.style.borderColor = "rgba(60,60,80,0.3)";
        slot.el.style.background = "linear-gradient(180deg, #111118 0%, #0a0a10 100%)";
        slot.el.style.boxShadow = "none";
        slot.el.style.animation = "none";
        slot.active.style.opacity = "0";
      }
    }

    // Boss HP
    const boss = state.enemies.find(e => e.isBoss && e.alive);
    if (boss) {
      if (this._bossBar.style.display === "none") {
        this._bossBar.style.display = "block";
        this._bossBar.style.animation = "td-boss-appear 0.5s ease-out";
      }
      this._bossName.style.display = "block";
      const bossPct = (boss.hp / boss.maxHp) * 100;
      this._bossFill.style.width = `${bossPct}%`;
      // Boss bar color shift as HP drops
      if (bossPct > 50) {
        this._bossFill.style.background = "linear-gradient(180deg, #ff4444 0%, #cc1111 40%, #aa0000 100%)";
      } else if (bossPct > 25) {
        this._bossFill.style.background = "linear-gradient(180deg, #ff6622 0%, #dd4400 40%, #aa3300 100%)";
      } else {
        this._bossFill.style.background = "linear-gradient(180deg, #ff2222 0%, #cc0000 40%, #880000 100%)";
        const flicker = 0.3 + Math.sin(state.gameTime * 8) * 0.15;
        this._bossBar.style.boxShadow = `0 0 20px rgba(255,0,0,${flicker}), 0 0 40px rgba(255,0,0,${flicker * 0.4})`;
      }
      this._bossName.textContent = _getBossName(boss.type);
    } else {
      this._bossBar.style.display = "none";
      this._bossName.style.display = "none";
    }

    // Between wave text
    if (state.betweenWaves && state.wave > 0) {
      const nextWave = state.wave + 1;
      const isBossNext = nextWave % state.bossWaveInterval === 0;
      if (nextWave > state.totalWaves) {
        this._centerText.textContent = "VICTORY!";
        this._centerText.style.color = "#ffd700";
        this._centerText.style.textShadow = "0 0 20px rgba(255,215,0,0.7), 0 0 40px rgba(255,180,0,0.4), 3px 3px 6px rgba(0,0,0,0.8)";
      } else if (isBossNext) {
        this._centerText.textContent = `Next: Wave ${nextWave} - BOSS WAVE!`;
        this._centerText.style.color = "#ff4444";
        this._centerText.style.textShadow = "0 0 15px rgba(255,50,50,0.6), 0 0 30px rgba(255,0,0,0.3), 2px 2px 4px rgba(0,0,0,0.8)";
      } else if (nextWave % 3 === 0) {
        this._centerText.textContent = `Next: Wave ${nextWave} - SWARM!`;
        this._centerText.style.color = "#ffaa44";
        this._centerText.style.textShadow = "0 0 15px rgba(255,170,68,0.6), 0 0 30px rgba(255,100,0,0.3), 2px 2px 4px rgba(0,0,0,0.8)";
      } else {
        this._centerText.textContent = `Next: Wave ${nextWave}`;
        this._centerText.style.color = "#88ccff";
        this._centerText.style.textShadow = "0 0 15px rgba(100,180,255,0.5), 2px 2px 4px rgba(0,0,0,0.8)";
      }
      this._centerText.style.opacity = `${Math.min(1, state.betweenWaveTimer)}`;
    } else if (state.betweenWaves && state.wave === 0) {
      this._centerText.textContent = "Arthur & the White Eagle\nWASD to move, LMB to shoot, 1-5 for skills";
      this._centerText.style.color = "#ccddff";
      this._centerText.style.opacity = "1";
    } else {
      this._centerText.style.opacity = "0";
    }

    // Update damage numbers
    this._dmgNumbers = this._dmgNumbers.filter(dn => {
      dn.timer -= dt;
      if (dn.timer <= 0) {
        if (dn.el.parentNode) dn.el.parentNode.removeChild(dn.el);
        return false;
      }
      const progress = 1 - dn.timer / 1.2;
      dn.el.style.top = `${dn.startY - progress * 40}px`;
      dn.el.style.opacity = `${Math.min(1, dn.timer * 2)}`;
      return true;
    });

    // Notifications
    if (this._notifTimer > 0) {
      this._notifTimer -= dt;
      this._notification.style.opacity = `${Math.min(1, this._notifTimer * 2)}`;
      if (this._notifTimer <= 0) {
        this._notification.style.opacity = "0";
      }
    }
  }

  showDamageNumber(screenX: number, screenY: number, damage: number, isCrit: boolean, isElite: boolean): void {
    const el = document.createElement("div");
    const color = isElite ? "#ffd700" : isCrit ? "#ff4444" : "#ffffff";
    const size = isCrit ? 18 : isElite ? 16 : 13;
    el.style.cssText = `
      position: absolute; left: ${screenX}px; top: ${screenY}px;
      font-size: ${size}px; font-weight: bold; color: ${color};
      text-shadow: 0 0 4px rgba(0,0,0,0.8), 1px 1px 2px #000;
      pointer-events: none; z-index: 15;
      transition: opacity 0.3s;
    `;
    el.textContent = Math.floor(damage).toString();
    this._root.appendChild(el);
    this._dmgNumbers.push({ el, timer: 1.2, startY: screenY });
  }

  setPauseCallbacks(onResume: () => void, onRestart: () => void, onQuit: () => void): void {
    this._onPauseResume = onResume;
    this._onPauseRestart = onRestart;
    this._onPauseQuit = onQuit;
  }

  get isPauseMenuVisible(): boolean {
    return this._pauseMenuVisible;
  }

  showPauseMenu(): void {
    this._pauseMenuVisible = true;
    this._pauseOverlay.style.display = "flex";
  }

  hidePauseMenu(): void {
    this._pauseMenuVisible = false;
    this._pauseOverlay.style.display = "none";
  }

  updateEdgeIndicators(indicators: { screenX: number; screenY: number; angle: number; isBoss: boolean }[]): void {
    // Remove old indicators
    for (const ind of this._edgeIndicators) {
      if (ind.parentNode) ind.parentNode.removeChild(ind);
    }
    this._edgeIndicators = [];

    for (const data of indicators) {
      const el = document.createElement("div");
      const color = data.isBoss ? "#ff4444" : "#ffaa44";
      const size = data.isBoss ? 10 : 7;
      el.style.cssText = `
        position: absolute; left: ${data.screenX - size / 2}px; top: ${data.screenY - size / 2}px;
        width: ${size}px; height: ${size}px;
        background: ${color}; border-radius: 50%;
        box-shadow: 0 0 6px ${color};
        pointer-events: none; z-index: 12;
        transform: rotate(${data.angle}rad);
      `;
      this._root.appendChild(el);
      this._edgeIndicators.push(el);
    }
  }

  showNotification(msg: string, color: string): void {
    this._notification.textContent = msg;
    this._notification.style.color = color;
    this._notification.style.opacity = "1";
    this._notification.style.animation = "none";
    void this._notification.offsetWidth;
    this._notification.style.animation = "td-notif-in 0.4s ease-out";
    this._notifTimer = 2.5;
  }

  cleanup(): void {
    for (const dn of this._dmgNumbers) {
      if (dn.el.parentNode) dn.el.parentNode.removeChild(dn.el);
    }
    this._dmgNumbers = [];
    for (const ind of this._edgeIndicators) {
      if (ind.parentNode) ind.parentNode.removeChild(ind);
    }
    this._edgeIndicators = [];
    if (this._root.parentNode) {
      this._root.parentNode.removeChild(this._root);
    }
    if (this._styleEl.parentNode) {
      this._styleEl.parentNode.removeChild(this._styleEl);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _getBossName(type: string): string {
  const names: Record<string, string> = {
    boss_ancient_dragon: "Ignatius, the Ancient Dragon",
    boss_storm_colossus: "Thalassor, Storm Colossus",
    boss_death_knight: "Mordrath, the Death Knight",
    boss_celestial_hydra: "Celestara, the Hydra Queen",
    boss_void_emperor: "Nyx, the Void Emperor",
  };
  return names[type] || "Boss";
}
