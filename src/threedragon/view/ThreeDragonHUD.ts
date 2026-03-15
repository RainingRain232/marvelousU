// ---------------------------------------------------------------------------
// 3Dragon mode — HUD overlay (HTML-based for clean overlay on Three.js)
// ---------------------------------------------------------------------------

import type { ThreeDragonState, TDUpgradeId } from "../state/ThreeDragonState";
import { TDSkillId } from "../state/ThreeDragonState";
import { TD_SKILL_CONFIGS, TD_SKILL_UNLOCK_ORDER, TD_WAVE_MODIFIER_BY_ID } from "../config/ThreeDragonConfig";

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
  private _dmgNumbers: { el: HTMLDivElement; timer: number; totalDur: number; startY: number; startX: number; driftX: number; driftCurve: number; isCrit: boolean; isElite: boolean }[] = [];
  private _pauseOverlay!: HTMLDivElement;
  private _pauseMenuVisible = false;
  private _onPauseResume: (() => void) | null = null;
  private _onPauseRestart: (() => void) | null = null;
  private _onPauseQuit: (() => void) | null = null;
  private _edgeIndicators: HTMLDivElement[] = [];
  private _boostBar!: HTMLDivElement;
  private _boostFill!: HTMLDivElement;
  private _boostLabel!: HTMLDivElement;
  private _boostFlash!: HTMLDivElement;
  private _xpBar!: HTMLDivElement;
  private _xpFill!: HTMLDivElement;
  private _xpText!: HTMLDivElement;
  private _levelEl!: HTMLDivElement;
  private _skillEquipOverlay!: HTMLDivElement;
  private _skillEquipVisible = false;
  private _lastEquippedSkills: TDSkillId[] = [];
  private _onEquipSkill: ((slot: number, skillId: TDSkillId) => void) | null = null;
  // Upgrade system
  private _upgradeOverlay!: HTMLDivElement;
  private _onUpgrade: ((upgradeId: TDUpgradeId) => void) | null = null;
  // Synergy popups
  private _synergyPopups: { el: HTMLDivElement; timer: number }[] = [];
  // Modifier display
  private _modifierBar!: HTMLDivElement;
  // Modifier announcement
  private _modifierAnnounce!: HTMLDivElement;
  private _modifierAnnounceTimer = 0;
  private _lastModifiers: string[] = [];

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
        50% { box-shadow: 0 0 12px rgba(255,255,255,0.25) inset; }
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
      @keyframes td-boost-pulse {
        0%, 100% { box-shadow: 0 0 8px rgba(80,200,255,0.3); }
        50% { box-shadow: 0 0 16px rgba(80,200,255,0.6); }
      }
      @keyframes td-bar-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes td-label-glow {
        0%, 100% { text-shadow: 0 0 4px currentColor, 1px 1px 2px #000; }
        50% { text-shadow: 0 0 8px currentColor, 0 0 12px currentColor, 1px 1px 2px #000; }
      }
      @keyframes td-wave-pulse {
        0%, 100% { border-color: rgba(100,150,255,0.2); box-shadow: 0 0 8px rgba(80,120,200,0.1); }
        50% { border-color: rgba(130,180,255,0.35); box-shadow: 0 0 15px rgba(80,120,200,0.2); }
      }
      @keyframes td-score-glow {
        0%, 100% { text-shadow: 0 0 12px rgba(255,215,0,0.5), 0 0 24px rgba(255,180,0,0.2), 2px 2px 4px rgba(0,0,0,0.9); }
        50% { text-shadow: 0 0 18px rgba(255,215,0,0.7), 0 0 36px rgba(255,180,0,0.4), 0 0 48px rgba(255,150,0,0.15), 2px 2px 4px rgba(0,0,0,0.9); }
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
    const hpContainer = this._createFancyBar(20, 15, 230, 22, "hp");
    this._hpBar = hpContainer;
    this._hpFill = hpContainer.querySelector(".td-fill") as HTMLDivElement;
    this._hpText = hpContainer.querySelector(".td-bar-text") as HTMLDivElement;
    this._root.appendChild(hpContainer);

    // HP label
    const hpLabel = document.createElement("div");
    hpLabel.style.cssText = `
      position:absolute; left:22px; top:11px; font-size:9px; color:#ff9999;
      text-shadow: 0 0 6px rgba(255,100,100,0.6), 0 0 12px rgba(255,60,60,0.2), 1px 1px 2px #000;
      letter-spacing: 3px; text-transform: uppercase; font-weight: bold;
      animation: td-label-glow 3s ease-in-out infinite;
    `;
    hpLabel.textContent = "HEALTH";
    this._root.appendChild(hpLabel);

    // Mana Bar
    const manaContainer = this._createFancyBar(20, 42, 230, 18, "mana");
    this._manaBar = manaContainer;
    this._manaFill = manaContainer.querySelector(".td-fill") as HTMLDivElement;
    this._manaText = manaContainer.querySelector(".td-bar-text") as HTMLDivElement;
    this._root.appendChild(manaContainer);

    // Mana label
    const manaLabel = document.createElement("div");
    manaLabel.style.cssText = `
      position:absolute; left:22px; top:40px; font-size:8px; color:#88aaff;
      text-shadow: 0 0 6px rgba(100,150,255,0.6), 0 0 12px rgba(60,100,255,0.2), 1px 1px 2px #000;
      letter-spacing: 3px; text-transform: uppercase; font-weight: bold;
      animation: td-label-glow 3.5s ease-in-out infinite;
    `;
    manaLabel.textContent = "MANA";
    this._root.appendChild(manaLabel);

    // Boost bar
    this._boostBar = document.createElement("div");
    this._boostBar.style.cssText = `
      position: absolute; left: 20px; top: 66px; width: 130px; height: 12px;
      background: linear-gradient(180deg, #080818 0%, #0e0e24 50%, #141430 100%);
      border: 1px solid rgba(100,200,255,0.35); border-radius: 5px;
      overflow: hidden;
      box-shadow: 0 0 8px rgba(50,150,255,0.2), 0 1px 4px rgba(0,0,0,0.4),
                  inset 0 1px 2px rgba(0,0,0,0.5);
    `;
    this._boostFill = document.createElement("div");
    this._boostFill.style.cssText = `
      width: 100%; height: 100%; border-radius: 4px;
      background: linear-gradient(180deg, #55ddff 0%, #33aaee 30%, #2288dd 60%, #1166aa 100%);
      transition: width 0.1s ease-out;
      position: relative;
    `;
    this._boostBar.appendChild(this._boostFill);
    this._root.appendChild(this._boostBar);

    this._boostLabel = document.createElement("div");
    this._boostLabel.style.cssText = `
      position: absolute; left: 22px; top: 63px; font-size: 8px; color: #66bbff;
      text-shadow: 0 0 6px rgba(100,180,255,0.6), 0 0 10px rgba(60,140,255,0.2), 1px 1px 2px #000;
      letter-spacing: 2px; text-transform: uppercase; font-weight: bold;
    `;
    this._boostLabel.textContent = "BOOST [SHIFT]";
    this._root.appendChild(this._boostLabel);

    // Screen-wide boost flash overlay (hidden initially)
    this._boostFlash = document.createElement("div");
    this._boostFlash.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 5; opacity: 0;
      background: radial-gradient(ellipse at center, rgba(80,180,255,0.08) 0%, transparent 70%);
    `;
    this._root.appendChild(this._boostFlash);

    // XP Bar
    this._xpBar = document.createElement("div");
    this._xpBar.style.cssText = `
      position: absolute; left: 20px; top: 84px; width: 130px; height: 10px;
      background: linear-gradient(180deg, #080818 0%, #0e0e20 50%, #141428 100%);
      border: 1px solid rgba(100,255,100,0.3); border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 0 6px rgba(50,200,50,0.15), 0 1px 3px rgba(0,0,0,0.4),
                  inset 0 1px 2px rgba(0,0,0,0.5);
    `;
    this._xpFill = document.createElement("div");
    this._xpFill.style.cssText = `
      width: 0%; height: 100%; border-radius: 3px;
      background: linear-gradient(180deg, #55ffaa 0%, #33cc66 30%, #22aa55 60%, #118833 100%);
      transition: width 0.2s ease-out;
      position: relative;
    `;
    this._xpBar.appendChild(this._xpFill);
    this._root.appendChild(this._xpBar);

    this._xpText = document.createElement("div");
    this._xpText.style.cssText = `
      position: absolute; left: 155px; top: 82px; font-size: 8px; color: #55aa77;
      text-shadow: 0 0 4px rgba(80,180,100,0.3), 1px 1px 2px #000; letter-spacing: 1px;
    `;
    this._root.appendChild(this._xpText);

    this._levelEl = document.createElement("div");
    this._levelEl.style.cssText = `
      position: absolute; left: 22px; top: 81px; font-size: 8px; color: #66cc88;
      text-shadow: 0 0 6px rgba(100,200,100,0.6), 0 0 10px rgba(60,180,80,0.2), 1px 1px 2px #000;
      letter-spacing: 2px; text-transform: uppercase; font-weight: bold;
    `;
    this._levelEl.textContent = "LVL 1";
    this._root.appendChild(this._levelEl);

    // Map name (will be set on first update)
    this._mapNameEl = document.createElement("div");
    this._mapNameEl.style.cssText = `
      position: absolute; left: 22px; top: 100px; font-size: 10px;
      color: #778899; letter-spacing: 1.5px; text-transform: uppercase;
      text-shadow: 0 0 4px rgba(100,130,160,0.3), 1px 1px 2px #000;
    `;
    this._root.appendChild(this._mapNameEl);

    // Score
    this._scoreEl = document.createElement("div");
    this._scoreEl.style.cssText = `
      position: absolute; top: 12px; right: 20px; font-size: 30px;
      color: #ffd700; font-weight: bold;
      text-shadow: 0 0 12px rgba(255,215,0,0.6), 0 0 24px rgba(255,180,0,0.3), 2px 2px 4px rgba(0,0,0,0.9);
      letter-spacing: 3px;
      transition: transform 0.15s ease-out;
      animation: td-score-glow 4s ease-in-out infinite;
      background: linear-gradient(180deg, #ffe066 0%, #ffd700 40%, #daa520 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      filter: drop-shadow(0 0 8px rgba(255,215,0,0.4)) drop-shadow(2px 2px 3px rgba(0,0,0,0.8));
    `;
    this._root.appendChild(this._scoreEl);

    // Score label
    const scoreLabel = document.createElement("div");
    scoreLabel.style.cssText = `
      position: absolute; top: 44px; right: 22px; font-size: 9px;
      color: #ccaa66; letter-spacing: 4px; text-transform: uppercase;
      text-shadow: 0 0 6px rgba(200,170,100,0.4), 1px 1px 2px #000;
      font-weight: bold;
    `;
    scoreLabel.textContent = "SCORE";
    this._root.appendChild(scoreLabel);

    this._highScoreEl = document.createElement("div");
    this._highScoreEl.style.cssText = `
      position: absolute; top: 56px; right: 22px; font-size: 10px;
      color: #998866; letter-spacing: 1px;
      text-shadow: 0 0 4px rgba(150,130,100,0.3), 1px 1px 2px #000;
    `;
    this._root.appendChild(this._highScoreEl);

    // Wave
    this._waveEl = document.createElement("div");
    this._waveEl.style.cssText = `
      position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
      font-size: 16px; color: #ccddff; font-weight: bold;
      text-shadow: 0 0 8px rgba(100,150,255,0.5), 0 0 16px rgba(80,120,220,0.2), 1px 1px 3px rgba(0,0,0,0.8);
      letter-spacing: 3px; text-transform: uppercase;
      background: linear-gradient(180deg, rgba(20,30,60,0.7) 0%, rgba(15,20,45,0.6) 50%, rgba(10,15,30,0.4) 100%);
      padding: 5px 20px; border-radius: 14px;
      border: 1px solid rgba(100,150,255,0.2);
      animation: td-wave-pulse 4s ease-in-out infinite;
      backdrop-filter: blur(3px);
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
      display: flex; gap: 7px;
      background: linear-gradient(180deg, rgba(18,18,42,0.88) 0%, rgba(12,12,30,0.92) 50%, rgba(8,8,22,0.95) 100%);
      border: 1px solid rgba(80,120,180,0.3);
      border-top: 1px solid rgba(120,160,220,0.2);
      border-radius: 12px; padding: 10px 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.6), 0 0 20px rgba(50,80,150,0.15) inset,
                  0 -1px 0 rgba(255,255,255,0.04) inset, 0 1px 0 rgba(0,0,0,0.3);
      backdrop-filter: blur(6px);
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

    // Pause menu overlay — full controls display + navigation
    this._pauseOverlay = document.createElement("div");
    this._pauseOverlay.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.75); display: none;
      justify-content: center; align-items: center; flex-direction: column;
      z-index: 50; pointer-events: auto; backdrop-filter: blur(6px);
      font-family: 'Cinzel', Georgia, serif; overflow-y: auto;
    `;

    // Inner container for centering
    const pauseInner = document.createElement("div");
    pauseInner.style.cssText = `
      display: flex; flex-direction: column; align-items: center;
      max-width: 500px; width: 90%; padding: 30px 0;
    `;

    const pauseTitle = document.createElement("div");
    pauseTitle.style.cssText = `
      font-size: 36px; color: #ccddff; font-weight: bold; letter-spacing: 4px;
      text-shadow: 0 0 15px rgba(100,150,255,0.5), 2px 2px 4px rgba(0,0,0,0.8);
      margin-bottom: 24px; text-transform: uppercase;
    `;
    pauseTitle.textContent = "Paused";
    pauseInner.appendChild(pauseTitle);

    // Controls section
    const controlsBox = document.createElement("div");
    controlsBox.style.cssText = `
      width: 100%; background: linear-gradient(180deg, rgba(15,18,35,0.9) 0%, rgba(8,10,22,0.95) 100%);
      border: 1px solid rgba(80,120,180,0.25); border-radius: 10px;
      padding: 18px 24px; margin-bottom: 24px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    `;
    const controlsTitle = document.createElement("div");
    controlsTitle.style.cssText = `
      font-size: 14px; color: #88aacc; font-weight: bold; letter-spacing: 2px;
      text-transform: uppercase; margin-bottom: 14px; text-align: center;
      text-shadow: 0 0 6px rgba(100,150,200,0.3);
    `;
    controlsTitle.textContent = "Controls";
    controlsBox.appendChild(controlsTitle);

    const controlsList: [string, string][] = [
      ["W / Arrow Up", "Move Up"],
      ["S / Arrow Down", "Move Down"],
      ["A / Arrow Left", "Move Left"],
      ["D / Arrow Right", "Move Right"],
      ["Left Mouse Button", "Fire Arcane Bolt"],
      ["1 - 5", "Activate Skill (slot 1-5)"],
      ["Shift / Space", "Boost (speed burst)"],
      ["Tab", "Skill Equip Menu"],
      ["Escape", "Pause / Resume"],
    ];

    for (const [key, action] of controlsList) {
      const row = document.createElement("div");
      row.style.cssText = `
        display: flex; justify-content: space-between; align-items: center;
        padding: 4px 0; border-bottom: 1px solid rgba(60,80,120,0.15);
      `;
      const keyEl = document.createElement("span");
      keyEl.style.cssText = `
        font-size: 12px; color: #ffd700; font-weight: bold;
        background: rgba(255,215,0,0.08); padding: 2px 8px; border-radius: 4px;
        border: 1px solid rgba(255,215,0,0.2); letter-spacing: 1px;
        font-family: 'Consolas', 'Monaco', monospace;
      `;
      keyEl.textContent = key;
      const actionEl = document.createElement("span");
      actionEl.style.cssText = `
        font-size: 11px; color: #99aabb; letter-spacing: 1px;
      `;
      actionEl.textContent = action;
      row.appendChild(keyEl);
      row.appendChild(actionEl);
      controlsBox.appendChild(row);
    }
    pauseInner.appendChild(controlsBox);

    // Buttons
    const btnStyle = `
      width: 220px; padding: 12px 0; margin: 6px; border-radius: 8px;
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
    pauseInner.appendChild(resumeBtn);

    const restartBtn = document.createElement("div");
    restartBtn.style.cssText = btnStyle;
    restartBtn.textContent = "Restart";
    btnHover(restartBtn);
    restartBtn.addEventListener("click", () => this._onPauseRestart?.());
    pauseInner.appendChild(restartBtn);

    const quitBtn = document.createElement("div");
    quitBtn.style.cssText = btnStyle;
    quitBtn.textContent = "Main Menu";
    btnHover(quitBtn);
    quitBtn.addEventListener("click", () => this._onPauseQuit?.());
    pauseInner.appendChild(quitBtn);

    // ESC hint
    const escHint = document.createElement("div");
    escHint.style.cssText = `
      margin-top: 16px; font-size: 10px; color: #556677;
      letter-spacing: 1px; text-transform: uppercase;
    `;
    escHint.textContent = "Press ESC to resume";
    pauseInner.appendChild(escHint);

    this._pauseOverlay.appendChild(pauseInner);
    this._root.appendChild(this._pauseOverlay);

    // Skill equip overlay (Tab menu)
    this._skillEquipOverlay = document.createElement("div");
    this._skillEquipOverlay.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.75); display: none;
      justify-content: center; align-items: center; flex-direction: column;
      z-index: 45; pointer-events: auto; backdrop-filter: blur(4px);
      font-family: 'Cinzel', Georgia, serif;
    `;
    this._root.appendChild(this._skillEquipOverlay);

    // Upgrade selection overlay
    this._upgradeOverlay = document.createElement("div");
    this._upgradeOverlay.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); display: none;
      justify-content: center; align-items: center; flex-direction: column;
      z-index: 50; pointer-events: auto; backdrop-filter: blur(6px);
      font-family: 'Cinzel', Georgia, serif;
    `;
    this._root.appendChild(this._upgradeOverlay);

    // Modifier display bar (top-right)
    this._modifierBar = document.createElement("div");
    this._modifierBar.style.cssText = `
      position: absolute; top: 10px; right: 10px;
      display: flex; gap: 6px; flex-direction: column; align-items: flex-end;
      pointer-events: none; z-index: 12;
    `;
    this._root.appendChild(this._modifierBar);

    // Modifier announcement (center screen)
    this._modifierAnnounce = document.createElement("div");
    this._modifierAnnounce.style.cssText = `
      position: absolute; top: 30%; left: 50%; transform: translateX(-50%);
      font-size: 22px; font-weight: bold; color: #ffcc44;
      text-shadow: 0 0 15px rgba(255,200,68,0.6), 2px 2px 4px rgba(0,0,0,0.8);
      pointer-events: none; z-index: 14; opacity: 0; text-align: center;
      letter-spacing: 2px; text-transform: uppercase; white-space: pre-line;
    `;
    this._root.appendChild(this._modifierAnnounce);

    document.body.appendChild(this._root);
  }

  private _createFancyBar(x: number, y: number, w: number, h: number, type: "hp" | "mana"): HTMLDivElement {
    const container = document.createElement("div");
    const borderCol = type === "hp" ? "rgba(200,80,80,0.55)" : "rgba(80,100,200,0.55)";
    const bgGrad = type === "hp"
      ? "linear-gradient(180deg, #1a0505 0%, #200808 50%, #2a0a0a 100%)"
      : "linear-gradient(180deg, #050510 0%, #080820 50%, #0a0a28 100%)";
    const shadowCol = type === "hp" ? "rgba(255,50,50,0.2)" : "rgba(50,100,255,0.2)";
    const innerShadow = type === "hp" ? "rgba(200,30,30,0.15)" : "rgba(30,60,200,0.15)";

    container.style.cssText = `
      position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px;
      background: ${bgGrad}; border: 1px solid ${borderCol}; border-radius: 7px;
      overflow: hidden;
      box-shadow: 0 0 10px ${shadowCol}, 0 2px 6px rgba(0,0,0,0.4),
                  inset 0 1px 3px rgba(0,0,0,0.5), inset 0 -1px 0 ${innerShadow};
    `;

    // Metallic border sheen (top edge)
    const borderSheen = document.createElement("div");
    borderSheen.style.cssText = `
      position: absolute; top: 0; left: 5%; width: 90%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
      pointer-events: none; z-index: 3;
    `;
    container.appendChild(borderSheen);

    const fill = document.createElement("div");
    fill.className = "td-fill";
    fill.style.cssText = `
      width: 100%; height: 100%; border-radius: 6px;
      transition: width 0.15s ease-out, background 0.3s;
      position: relative;
    `;
    container.appendChild(fill);

    // Animated shine sweep
    const shine = document.createElement("div");
    shine.className = "td-shine";
    shine.style.cssText = `
      position: absolute; top: 0; left: 0; width: 25%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
      animation: td-shine-sweep 2.5s ease-in-out infinite;
    `;
    fill.appendChild(shine);

    // Top highlight for 3D/glass look
    const highlight = document.createElement("div");
    highlight.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; height: 45%;
      background: linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05), transparent);
      border-radius: 6px 6px 0 0;
      pointer-events: none;
    `;
    fill.appendChild(highlight);

    // Bottom dark edge for depth
    const bottomEdge = document.createElement("div");
    bottomEdge.style.cssText = `
      position: absolute; bottom: 0; left: 0; right: 0; height: 30%;
      background: linear-gradient(180deg, transparent, rgba(0,0,0,0.15));
      border-radius: 0 0 6px 6px;
      pointer-events: none;
    `;
    fill.appendChild(bottomEdge);

    // Text overlay for value
    const text = document.createElement("div");
    text.className = "td-bar-text";
    text.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: ${h < 18 ? 9 : 11}px; font-weight: bold; color: rgba(255,255,255,0.9);
      text-shadow: 0 0 4px rgba(0,0,0,0.6), 1px 1px 2px rgba(0,0,0,0.9);
      z-index: 2; letter-spacing: 0.5px;
    `;
    container.appendChild(text);

    return container;
  }

  private _buildSkillBar(): void {
    // Will be rebuilt dynamically when equipped skills change
    this._rebuildSkillSlots([
      TDSkillId.CELESTIAL_LANCE,
      TDSkillId.THUNDERSTORM,
      TDSkillId.FROST_NOVA,
      TDSkillId.METEOR_SHOWER,
      TDSkillId.DIVINE_SHIELD,
    ]);
  }

  /** Draw a skill-specific icon onto a canvas context */
  private _drawSkillIcon(ctx: CanvasRenderingContext2D, skillId: TDSkillId, color: string, size: number): void {
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.38;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Helper to parse hex color to rgba
    const hexToRgba = (hex: string, alpha: number) => {
      const hr = parseInt(hex.slice(1, 3), 16);
      const hg = parseInt(hex.slice(3, 5), 16);
      const hb = parseInt(hex.slice(5, 7), 16);
      return `rgba(${hr},${hg},${hb},${alpha})`;
    };

    switch (skillId) {
      case TDSkillId.ARCANE_BOLT: {
        // Swirling arcane projectile with energy rings
        // Outer energy glow
        const arcGlow = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.0);
        arcGlow.addColorStop(0, hexToRgba(color, 0.9));
        arcGlow.addColorStop(0.4, hexToRgba(color, 0.4));
        arcGlow.addColorStop(1, hexToRgba(color, 0.0));
        ctx.fillStyle = arcGlow;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.0, 0, Math.PI * 2); ctx.fill();
        // Swirling energy arcs
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = hexToRgba(color, 0.7);
        for (let i = 0; i < 3; i++) {
          const offset = (i / 3) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.6, offset, offset + Math.PI * 0.8);
          ctx.stroke();
        }
        // Central bright core with 4-point star
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hexToRgba(color, 0.95);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a - 0.12) * r * 0.15, cy + Math.sin(a - 0.12) * r * 0.15);
          ctx.lineTo(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85);
          ctx.lineTo(cx + Math.cos(a + 0.12) * r * 0.15, cy + Math.sin(a + 0.12) * r * 0.15);
          ctx.closePath();
          ctx.fill();
        }
        // Smaller diagonal rays
        ctx.fillStyle = hexToRgba(color, 0.6);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 - Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a - 0.08) * r * 0.1, cy + Math.sin(a - 0.08) * r * 0.1);
          ctx.lineTo(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5);
          ctx.lineTo(cx + Math.cos(a + 0.08) * r * 0.1, cy + Math.sin(a + 0.08) * r * 0.1);
          ctx.closePath();
          ctx.fill();
        }
        // Tiny sparkle dots
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const dist = r * (0.55 + (i % 2) * 0.25);
          ctx.beginPath(); ctx.arc(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, 0.8, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case TDSkillId.CELESTIAL_LANCE: {
        // Radiant golden lance with holy light rays
        // Background holy glow
        const lanceGlow = ctx.createRadialGradient(cx + r * 0.2, cy - r * 0.2, 0, cx, cy, r * 1.1);
        lanceGlow.addColorStop(0, "rgba(255,240,180,0.35)");
        lanceGlow.addColorStop(0.5, "rgba(255,215,100,0.1)");
        lanceGlow.addColorStop(1, "rgba(255,200,50,0.0)");
        ctx.fillStyle = lanceGlow;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2); ctx.fill();
        // Light rays emanating from tip
        ctx.strokeStyle = "rgba(255,240,180,0.3)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 4 + (i - 2.5) * 0.25;
          ctx.beginPath();
          ctx.moveTo(cx + r * 0.45, cy - r * 0.45);
          ctx.lineTo(cx + r * 0.45 + Math.cos(a) * r * 0.6, cy - r * 0.45 + Math.sin(a) * r * 0.6);
          ctx.stroke();
        }
        // Lance shaft with gradient
        const shaftGrad = ctx.createLinearGradient(cx - r * 0.7, cy + r * 0.7, cx + r * 0.5, cy - r * 0.5);
        shaftGrad.addColorStop(0, "rgba(139,115,85,0.9)");
        shaftGrad.addColorStop(0.5, "rgba(180,160,120,0.95)");
        shaftGrad.addColorStop(1, "rgba(200,180,140,1)");
        ctx.strokeStyle = shaftGrad;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.7, cy + r * 0.7);
        ctx.lineTo(cx + r * 0.35, cy - r * 0.35);
        ctx.stroke();
        // Lance head (golden triangle)
        const headGrad = ctx.createLinearGradient(cx + r * 0.2, cy - r * 0.2, cx + r * 0.7, cy - r * 0.7);
        headGrad.addColorStop(0, "#daa520");
        headGrad.addColorStop(0.5, "#ffd700");
        headGrad.addColorStop(1, "#fff8dc");
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.8, cy - r * 0.8);
        ctx.lineTo(cx + r * 0.05, cy - r * 0.55);
        ctx.lineTo(cx + r * 0.15, cy - r * 0.35);
        ctx.lineTo(cx + r * 0.35, cy - r * 0.15);
        ctx.lineTo(cx + r * 0.55, cy - r * 0.05);
        ctx.closePath();
        ctx.fill();
        // Bright tip
        ctx.fillStyle = "#fffbe6";
        ctx.beginPath(); ctx.arc(cx + r * 0.65, cy - r * 0.65, r * 0.08, 0, Math.PI * 2); ctx.fill();
        // Cross-guard ornament
        ctx.strokeStyle = "#daa520";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.05, cy - r * 0.25);
        ctx.lineTo(cx + r * 0.25, cy - r * 0.05);
        ctx.stroke();
        // Sparkle dots
        ctx.fillStyle = "rgba(255,255,220,0.8)";
        ctx.beginPath(); ctx.arc(cx + r * 0.5, cy - r * 0.9, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.9, cy - r * 0.5, 1.0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.3, cy - r * 0.7, 0.8, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case TDSkillId.THUNDERSTORM: {
        // Dramatic storm cloud with multiple lightning bolts
        // Dark cloud body
        ctx.fillStyle = "rgba(60,65,90,0.9)";
        ctx.beginPath();
        ctx.arc(cx - r * 0.3, cy - r * 0.35, r * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + r * 0.2, cy - r * 0.3, r * 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy - r * 0.5, r * 0.3, 0, Math.PI * 2); ctx.fill();
        // Cloud highlight
        ctx.fillStyle = "rgba(100,110,150,0.5)";
        ctx.beginPath();
        ctx.arc(cx - r * 0.1, cy - r * 0.55, r * 0.2, 0, Math.PI * 2); ctx.fill();
        // Main lightning bolt (bright)
        const boltGrad = ctx.createLinearGradient(cx, cy - r * 0.15, cx, cy + r * 0.95);
        boltGrad.addColorStop(0, "#ffffff");
        boltGrad.addColorStop(0.3, color);
        boltGrad.addColorStop(1, hexToRgba(color, 0.6));
        ctx.fillStyle = boltGrad;
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.1, cy - r * 0.15);
        ctx.lineTo(cx - r * 0.2, cy + r * 0.2);
        ctx.lineTo(cx + r * 0.05, cy + r * 0.15);
        ctx.lineTo(cx - r * 0.15, cy + r * 0.85);
        ctx.lineTo(cx + r * 0.05, cy + r * 0.4);
        ctx.lineTo(cx + r * 0.25, cy + r * 0.45);
        ctx.lineTo(cx + r * 0.2, cy - r * 0.15);
        ctx.closePath();
        ctx.fill();
        // Secondary smaller bolt (left)
        ctx.fillStyle = hexToRgba(color, 0.5);
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.35, cy - r * 0.1);
        ctx.lineTo(cx - r * 0.5, cy + r * 0.25);
        ctx.lineTo(cx - r * 0.35, cy + r * 0.2);
        ctx.lineTo(cx - r * 0.45, cy + r * 0.6);
        ctx.lineTo(cx - r * 0.3, cy + r * 0.3);
        ctx.lineTo(cx - r * 0.2, cy + r * 0.35);
        ctx.lineTo(cx - r * 0.25, cy - r * 0.1);
        ctx.closePath();
        ctx.fill();
        // Small branch (right)
        ctx.strokeStyle = hexToRgba(color, 0.4);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.2, cy + r * 0.3);
        ctx.lineTo(cx + r * 0.45, cy + r * 0.5);
        ctx.stroke();
        // Electric glow at cloud base
        ctx.fillStyle = hexToRgba(color, 0.2);
        ctx.beginPath(); ctx.arc(cx, cy - r * 0.1, r * 0.3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case TDSkillId.LIGHTNING_BOLT:
      case TDSkillId.CHAIN_LIGHTNING: {
        // Electric branching lightning with glow
        // Background electric glow
        const elecGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.0);
        elecGlow.addColorStop(0, hexToRgba(color, 0.25));
        elecGlow.addColorStop(1, hexToRgba(color, 0.0));
        ctx.fillStyle = elecGlow;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.0, 0, Math.PI * 2); ctx.fill();
        // Main bolt with white-hot core
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.15, cy - r * 0.95);
        ctx.lineTo(cx - r * 0.15, cy - r * 0.3);
        ctx.lineTo(cx + r * 0.15, cy - r * 0.15);
        ctx.lineTo(cx - r * 0.1, cy + r * 0.35);
        ctx.lineTo(cx + r * 0.1, cy + r * 0.3);
        ctx.lineTo(cx - r * 0.05, cy + r * 0.95);
        ctx.stroke();
        // White core
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.15, cy - r * 0.95);
        ctx.lineTo(cx - r * 0.15, cy - r * 0.3);
        ctx.lineTo(cx + r * 0.15, cy - r * 0.15);
        ctx.lineTo(cx - r * 0.1, cy + r * 0.35);
        ctx.lineTo(cx + r * 0.1, cy + r * 0.3);
        ctx.lineTo(cx - r * 0.05, cy + r * 0.95);
        ctx.stroke();
        // Branch 1 (right)
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = hexToRgba(color, 0.7);
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.15, cy - r * 0.15);
        ctx.lineTo(cx + r * 0.45, cy - r * 0.05);
        ctx.lineTo(cx + r * 0.55, cy + r * 0.2);
        ctx.stroke();
        // Branch 2 (left)
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.1, cy + r * 0.35);
        ctx.lineTo(cx - r * 0.4, cy + r * 0.45);
        ctx.lineTo(cx - r * 0.55, cy + r * 0.65);
        ctx.stroke();
        // Branch 3 (right lower)
        ctx.strokeStyle = hexToRgba(color, 0.4);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.1, cy + r * 0.3);
        ctx.lineTo(cx + r * 0.35, cy + r * 0.55);
        ctx.stroke();
        // Spark dots
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(cx + r * 0.55, cy + r * 0.2, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - r * 0.55, cy + r * 0.65, 1.0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.15, cy - r * 0.95, 1.5, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case TDSkillId.FROST_NOVA:
      case TDSkillId.ICE_STORM: {
        // Intricate crystal ice burst pattern
        // Background frost glow
        const frostGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.1);
        frostGlow.addColorStop(0, "rgba(180,220,255,0.3)");
        frostGlow.addColorStop(0.5, "rgba(100,180,255,0.1)");
        frostGlow.addColorStop(1, "rgba(80,160,255,0.0)");
        ctx.fillStyle = frostGlow;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2); ctx.fill();
        // Main crystal arms (6-fold symmetry)
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          // Main arm with gradient thickness
          const armGrad = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95);
          armGrad.addColorStop(0, "rgba(200,230,255,0.95)");
          armGrad.addColorStop(1, hexToRgba(color, 0.6));
          ctx.strokeStyle = armGrad;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95);
          ctx.stroke();
          // Primary branches at 60%
          const bx1 = cx + Math.cos(a) * r * 0.55;
          const by1 = cy + Math.sin(a) * r * 0.55;
          ctx.strokeStyle = hexToRgba(color, 0.7);
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(bx1, by1);
          ctx.lineTo(bx1 + Math.cos(a + 1.0) * r * 0.3, by1 + Math.sin(a + 1.0) * r * 0.3);
          ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx1, by1);
          ctx.lineTo(bx1 + Math.cos(a - 1.0) * r * 0.3, by1 + Math.sin(a - 1.0) * r * 0.3);
          ctx.stroke();
          // Secondary branches at 35%
          const bx2 = cx + Math.cos(a) * r * 0.35;
          const by2 = cy + Math.sin(a) * r * 0.35;
          ctx.strokeStyle = hexToRgba(color, 0.45);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(bx2, by2);
          ctx.lineTo(bx2 + Math.cos(a + 0.9) * r * 0.18, by2 + Math.sin(a + 0.9) * r * 0.18);
          ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx2, by2);
          ctx.lineTo(bx2 + Math.cos(a - 0.9) * r * 0.18, by2 + Math.sin(a - 0.9) * r * 0.18);
          ctx.stroke();
          // Tip diamonds
          const tx = cx + Math.cos(a) * r * 0.9;
          const ty = cy + Math.sin(a) * r * 0.9;
          ctx.fillStyle = "rgba(220,240,255,0.8)";
          ctx.beginPath();
          ctx.moveTo(tx + Math.cos(a) * r * 0.1, ty + Math.sin(a) * r * 0.1);
          ctx.lineTo(tx + Math.cos(a + Math.PI / 2) * r * 0.04, ty + Math.sin(a + Math.PI / 2) * r * 0.04);
          ctx.lineTo(tx - Math.cos(a) * r * 0.04, ty - Math.sin(a) * r * 0.04);
          ctx.lineTo(tx - Math.cos(a + Math.PI / 2) * r * 0.04, ty - Math.sin(a + Math.PI / 2) * r * 0.04);
          ctx.closePath();
          ctx.fill();
        }
        // Center crystal
        ctx.fillStyle = "rgba(220,240,255,0.9)";
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const px = cx + Math.cos(a) * r * 0.12;
          const py = cy + Math.sin(a) * r * 0.12;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Bright center dot
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.05, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case TDSkillId.METEOR_SHOWER:
      case TDSkillId.FIRE_BREATH: {
        // Dramatic fireball/meteor with glowing trail
        // Fire trail (behind)
        const trailGrad = ctx.createLinearGradient(cx - r * 0.4, cy - r * 0.7, cx + r * 0.3, cy + r * 0.5);
        trailGrad.addColorStop(0, "rgba(255,100,20,0.0)");
        trailGrad.addColorStop(0.3, "rgba(255,120,30,0.3)");
        trailGrad.addColorStop(0.7, "rgba(255,80,10,0.5)");
        trailGrad.addColorStop(1, "rgba(200,40,0,0.1)");
        ctx.fillStyle = trailGrad;
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.1, cy + r * 0.1);
        ctx.bezierCurveTo(cx - r * 0.5, cy - r * 0.2, cx - r * 0.7, cy - r * 0.8, cx - r * 0.3, cy - r * 1.0);
        ctx.bezierCurveTo(cx + r * 0.1, cy - r * 0.9, cx + r * 0.4, cy - r * 0.5, cx + r * 0.1, cy + r * 0.1);
        ctx.fill();
        // Outer fire layer
        const fireGrad = ctx.createRadialGradient(cx + r * 0.05, cy + r * 0.15, r * 0.1, cx, cy + r * 0.1, r * 0.7);
        fireGrad.addColorStop(0, "#ffffcc");
        fireGrad.addColorStop(0.3, "#ffcc33");
        fireGrad.addColorStop(0.6, "#ff6600");
        fireGrad.addColorStop(1, "rgba(200,30,0,0.3)");
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 0.3);
        ctx.bezierCurveTo(cx + r * 0.7, cy - r * 0.1, cx + r * 0.65, cy + r * 0.7, cx, cy + r * 0.9);
        ctx.bezierCurveTo(cx - r * 0.65, cy + r * 0.7, cx - r * 0.7, cy - r * 0.1, cx, cy - r * 0.3);
        ctx.fill();
        // Meteor rock core
        const rockGrad = ctx.createRadialGradient(cx - r * 0.05, cy + r * 0.2, 0, cx, cy + r * 0.15, r * 0.35);
        rockGrad.addColorStop(0, "#aa6633");
        rockGrad.addColorStop(0.5, "#884422");
        rockGrad.addColorStop(1, "#663311");
        ctx.fillStyle = rockGrad;
        ctx.beginPath(); ctx.arc(cx, cy + r * 0.15, r * 0.3, 0, Math.PI * 2); ctx.fill();
        // Hot cracks on rock
        ctx.strokeStyle = "#ffaa44";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.15, cy + r * 0.05);
        ctx.lineTo(cx, cy + r * 0.2);
        ctx.lineTo(cx + r * 0.1, cy + r * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.05, cy + r * 0.25);
        ctx.lineTo(cx - r * 0.05, cy + r * 0.35);
        ctx.stroke();
        // Ember particles
        ctx.fillStyle = "#ffdd66";
        ctx.beginPath(); ctx.arc(cx - r * 0.5, cy - r * 0.5, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.35, cy - r * 0.4, 0.9, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.7, 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ff8833";
        ctx.beginPath(); ctx.arc(cx + r * 0.5, cy - r * 0.15, 1.0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - r * 0.6, cy - r * 0.3, 0.8, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case TDSkillId.DIVINE_SHIELD: {
        // Ornate golden shield with divine glow
        // Background holy light
        const shieldGlow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.1);
        shieldGlow.addColorStop(0, "rgba(255,230,150,0.3)");
        shieldGlow.addColorStop(0.5, "rgba(255,215,100,0.1)");
        shieldGlow.addColorStop(1, "rgba(255,200,50,0.0)");
        ctx.fillStyle = shieldGlow;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2); ctx.fill();
        // Shield body gradient
        const sGrad = ctx.createLinearGradient(cx - r * 0.6, cy - r * 0.5, cx + r * 0.6, cy + r * 0.5);
        sGrad.addColorStop(0, "#daa520");
        sGrad.addColorStop(0.3, "#ffd700");
        sGrad.addColorStop(0.5, "#ffec8b");
        sGrad.addColorStop(0.7, "#ffd700");
        sGrad.addColorStop(1, "#b8860b");
        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 0.9);
        ctx.lineTo(cx + r * 0.85, cy - r * 0.35);
        ctx.quadraticCurveTo(cx + r * 0.8, cy + r * 0.3, cx, cy + r * 0.95);
        ctx.quadraticCurveTo(cx - r * 0.8, cy + r * 0.3, cx - r * 0.85, cy - r * 0.35);
        ctx.closePath();
        ctx.fill();
        // Shield border
        ctx.strokeStyle = "#b8860b";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Inner shield detail border
        ctx.strokeStyle = "rgba(255,248,220,0.5)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 0.65);
        ctx.lineTo(cx + r * 0.6, cy - r * 0.2);
        ctx.quadraticCurveTo(cx + r * 0.55, cy + r * 0.2, cx, cy + r * 0.7);
        ctx.quadraticCurveTo(cx - r * 0.55, cy + r * 0.2, cx - r * 0.6, cy - r * 0.2);
        ctx.closePath();
        ctx.stroke();
        // Ornate cross in center
        ctx.fillStyle = "rgba(255,255,240,0.85)";
        // Vertical
        ctx.fillRect(cx - r * 0.06, cy - r * 0.4, r * 0.12, r * 0.7);
        // Horizontal
        ctx.fillRect(cx - r * 0.28, cy - r * 0.12, r * 0.56, r * 0.12);
        // Cross end caps (flared)
        ctx.beginPath(); ctx.arc(cx, cy - r * 0.4, r * 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy + r * 0.3, r * 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - r * 0.28, cy - r * 0.06, r * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.28, cy - r * 0.06, r * 0.06, 0, Math.PI * 2); ctx.fill();
        // Top gem
        ctx.fillStyle = "#4488ff";
        ctx.beginPath(); ctx.arc(cx, cy - r * 0.55, r * 0.07, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath(); ctx.arc(cx - r * 0.02, cy - r * 0.57, r * 0.03, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case TDSkillId.HEALING_FLAME: {
        // Phoenix-like healing flame with green/gold sparkles
        // Background healing glow
        const healGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.0);
        healGlow.addColorStop(0, "rgba(100,255,150,0.25)");
        healGlow.addColorStop(0.5, "rgba(50,200,100,0.1)");
        healGlow.addColorStop(1, "rgba(30,150,60,0.0)");
        ctx.fillStyle = healGlow;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.0, 0, Math.PI * 2); ctx.fill();
        // Outer green flame
        const healFlame = ctx.createRadialGradient(cx, cy + r * 0.1, r * 0.1, cx, cy, r * 0.8);
        healFlame.addColorStop(0, "#ffffcc");
        healFlame.addColorStop(0.3, "#88ff88");
        healFlame.addColorStop(0.6, "#44cc66");
        healFlame.addColorStop(1, "rgba(30,150,60,0.2)");
        ctx.fillStyle = healFlame;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 0.95);
        ctx.bezierCurveTo(cx + r * 0.9, cy - r * 0.4, cx + r * 0.55, cy + r * 0.5, cx, cy + r * 0.7);
        ctx.bezierCurveTo(cx - r * 0.55, cy + r * 0.5, cx - r * 0.9, cy - r * 0.4, cx, cy - r * 0.95);
        ctx.fill();
        // Inner bright core
        ctx.fillStyle = "rgba(220,255,220,0.8)";
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 0.4);
        ctx.bezierCurveTo(cx + r * 0.35, cy - r * 0.1, cx + r * 0.25, cy + r * 0.35, cx, cy + r * 0.45);
        ctx.bezierCurveTo(cx - r * 0.25, cy + r * 0.35, cx - r * 0.35, cy - r * 0.1, cx, cy - r * 0.4);
        ctx.fill();
        // Phoenix wing hints
        ctx.strokeStyle = "rgba(100,220,130,0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.15, cy - r * 0.2);
        ctx.bezierCurveTo(cx - r * 0.8, cy - r * 0.6, cx - r * 0.9, cy + r * 0.1, cx - r * 0.5, cy + r * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.15, cy - r * 0.2);
        ctx.bezierCurveTo(cx + r * 0.8, cy - r * 0.6, cx + r * 0.9, cy + r * 0.1, cx + r * 0.5, cy + r * 0.3);
        ctx.stroke();
        // Gold/green sparkle dots
        ctx.fillStyle = "#ffd700";
        ctx.beginPath(); ctx.arc(cx - r * 0.5, cy - r * 0.5, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.5, cy - r * 0.4, 1.0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.3, cy - r * 0.7, 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#88ffaa";
        ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.7, 0.9, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.6, cy - r * 0.2, 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - r * 0.6, cy - r * 0.1, 0.8, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case TDSkillId.BOOST: {
        // Dynamic speed arrows with motion blur effect
        // Motion blur streaks in background
        ctx.strokeStyle = hexToRgba(color, 0.15);
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const y = cy - r * 0.6 + i * r * 0.3;
          ctx.beginPath();
          ctx.moveTo(cx - r * 0.9, y);
          ctx.lineTo(cx + r * 0.5, y);
          ctx.stroke();
        }
        // Three chevron arrows with gradient
        for (let i = 0; i < 3; i++) {
          const ox = (i - 1) * r * 0.5;
          const alpha = 0.4 + i * 0.3;
          const lw = 1.5 + i * 0.5;
          // Arrow glow
          ctx.strokeStyle = hexToRgba(color, alpha * 0.3);
          ctx.lineWidth = lw + 3;
          ctx.beginPath();
          ctx.moveTo(cx + ox - r * 0.2, cy + r * 0.45);
          ctx.lineTo(cx + ox, cy - r * 0.45);
          ctx.lineTo(cx + ox + r * 0.2, cy + r * 0.45);
          ctx.stroke();
          // Arrow body
          ctx.strokeStyle = hexToRgba(color, alpha);
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(cx + ox - r * 0.2, cy + r * 0.45);
          ctx.lineTo(cx + ox, cy - r * 0.45);
          ctx.lineTo(cx + ox + r * 0.2, cy + r * 0.45);
          ctx.stroke();
          // Bright tip
          if (i === 2) {
            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.arc(cx + ox, cy - r * 0.45, 1.5, 0, Math.PI * 2); ctx.fill();
          }
        }
        // Speed particles
        ctx.fillStyle = hexToRgba(color, 0.5);
        ctx.beginPath(); ctx.arc(cx - r * 0.7, cy - r * 0.2, 1.0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - r * 0.6, cy + r * 0.3, 0.8, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case TDSkillId.DRAGON_ROAR: {
        // Dragon head silhouette with shockwave
        // Shockwave rings
        ctx.strokeStyle = hexToRgba(color, 0.15);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx + r * 0.3, cy, r * 0.8, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
        ctx.strokeStyle = hexToRgba(color, 0.25);
        ctx.beginPath(); ctx.arc(cx + r * 0.2, cy, r * 0.6, -Math.PI * 0.45, Math.PI * 0.45); ctx.stroke();
        ctx.strokeStyle = hexToRgba(color, 0.35);
        ctx.beginPath(); ctx.arc(cx + r * 0.1, cy, r * 0.4, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke();
        // Dragon head silhouette (facing right)
        ctx.fillStyle = color;
        ctx.beginPath();
        // Snout
        ctx.moveTo(cx + r * 0.1, cy - r * 0.05);
        ctx.lineTo(cx + r * 0.1, cy + r * 0.15);
        // Lower jaw
        ctx.lineTo(cx - r * 0.15, cy + r * 0.25);
        ctx.lineTo(cx - r * 0.3, cy + r * 0.15);
        // Neck
        ctx.lineTo(cx - r * 0.5, cy + r * 0.5);
        ctx.lineTo(cx - r * 0.6, cy + r * 0.3);
        // Back of head
        ctx.lineTo(cx - r * 0.55, cy - r * 0.15);
        // Top of head
        ctx.lineTo(cx - r * 0.4, cy - r * 0.4);
        // Horn
        ctx.lineTo(cx - r * 0.25, cy - r * 0.7);
        ctx.lineTo(cx - r * 0.15, cy - r * 0.35);
        // Crest
        ctx.lineTo(cx, cy - r * 0.25);
        ctx.lineTo(cx + r * 0.05, cy - r * 0.15);
        ctx.closePath();
        ctx.fill();
        // Eye
        ctx.fillStyle = "#ff4444";
        ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.1, r * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(cx - r * 0.24, cy - r * 0.11, r * 0.025, 0, Math.PI * 2); ctx.fill();
        // Jaw detail line
        ctx.strokeStyle = hexToRgba(color, 0.4);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.08, cy + r * 0.05);
        ctx.lineTo(cx - r * 0.2, cy + r * 0.1);
        ctx.stroke();
        break;
      }
      case TDSkillId.WING_GUST: {
        // Swooping feathered wing with air currents
        // Air current lines
        ctx.strokeStyle = hexToRgba(color, 0.2);
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const y = cy + r * 0.2 + i * r * 0.15;
          ctx.beginPath();
          ctx.moveTo(cx - r * 0.8, y);
          ctx.quadraticCurveTo(cx, y - r * 0.1, cx + r * 0.8, y + r * 0.05);
          ctx.stroke();
        }
        // Left wing
        const wingGrad1 = ctx.createLinearGradient(cx - r, cy - r * 0.5, cx, cy);
        wingGrad1.addColorStop(0, hexToRgba(color, 0.5));
        wingGrad1.addColorStop(1, hexToRgba(color, 0.9));
        ctx.fillStyle = wingGrad1;
        ctx.beginPath();
        ctx.moveTo(cx, cy + r * 0.1);
        ctx.bezierCurveTo(cx - r * 0.2, cy - r * 0.6, cx - r * 0.8, cy - r * 0.9, cx - r * 0.95, cy - r * 0.3);
        ctx.bezierCurveTo(cx - r * 0.85, cy - r * 0.1, cx - r * 0.5, cy + r * 0.2, cx, cy + r * 0.1);
        ctx.fill();
        // Right wing
        const wingGrad2 = ctx.createLinearGradient(cx, cy, cx + r, cy - r * 0.5);
        wingGrad2.addColorStop(0, hexToRgba(color, 0.9));
        wingGrad2.addColorStop(1, hexToRgba(color, 0.5));
        ctx.fillStyle = wingGrad2;
        ctx.beginPath();
        ctx.moveTo(cx, cy + r * 0.1);
        ctx.bezierCurveTo(cx + r * 0.2, cy - r * 0.6, cx + r * 0.8, cy - r * 0.9, cx + r * 0.95, cy - r * 0.3);
        ctx.bezierCurveTo(cx + r * 0.85, cy - r * 0.1, cx + r * 0.5, cy + r * 0.2, cx, cy + r * 0.1);
        ctx.fill();
        // Feather detail lines
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 0.7;
        for (let i = 0; i < 4; i++) {
          const t = 0.2 + i * 0.18;
          // Left feathers
          const lx = cx - r * t * 1.1;
          const ly = cy - r * t * 0.6;
          ctx.beginPath();
          ctx.moveTo(cx - r * 0.05, cy);
          ctx.quadraticCurveTo(lx + r * 0.1, ly + r * 0.1, lx, ly);
          ctx.stroke();
          // Right feathers
          ctx.beginPath();
          ctx.moveTo(cx + r * 0.05, cy);
          ctx.quadraticCurveTo(cx + r * t * 1.1 - r * 0.1, ly + r * 0.1, cx + r * t * 1.1, ly);
          ctx.stroke();
        }
        // Central body dot
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath(); ctx.arc(cx, cy + r * 0.05, r * 0.06, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case TDSkillId.SHADOW_DIVE: {
        // Dark shadow portal / vortex
        // Outer vortex glow
        const vortexGlow = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.0);
        vortexGlow.addColorStop(0, "rgba(80,40,120,0.6)");
        vortexGlow.addColorStop(0.5, "rgba(40,20,80,0.3)");
        vortexGlow.addColorStop(1, "rgba(20,10,40,0.0)");
        ctx.fillStyle = vortexGlow;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.0, 0, Math.PI * 2); ctx.fill();
        // Concentric elliptical rings (vortex)
        for (let i = 4; i >= 0; i--) {
          const rScale = 0.2 + i * 0.17;
          const alpha = 0.15 + (4 - i) * 0.12;
          ctx.strokeStyle = `rgba(160,100,220,${alpha})`;
          ctx.lineWidth = 1.2;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(1, 0.55);
          ctx.beginPath();
          ctx.arc(0, 0, r * rScale, 0, Math.PI * 2);
          ctx.restore();
          ctx.stroke();
        }
        // Dark center
        const darkCore = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.25);
        darkCore.addColorStop(0, "rgba(0,0,0,0.9)");
        darkCore.addColorStop(1, "rgba(30,15,50,0.5)");
        ctx.fillStyle = darkCore;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.55);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
        ctx.restore();
        ctx.fill();
        // Downward arrow/figure diving in
        ctx.fillStyle = "rgba(180,130,255,0.7)";
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 0.7);
        ctx.lineTo(cx + r * 0.12, cy - r * 0.3);
        ctx.lineTo(cx + r * 0.06, cy - r * 0.3);
        ctx.lineTo(cx + r * 0.06, cy - r * 0.1);
        ctx.lineTo(cx - r * 0.06, cy - r * 0.1);
        ctx.lineTo(cx - r * 0.06, cy - r * 0.3);
        ctx.lineTo(cx - r * 0.12, cy - r * 0.3);
        ctx.closePath();
        ctx.fill();
        // Purple sparkles
        ctx.fillStyle = "rgba(200,150,255,0.6)";
        ctx.beginPath(); ctx.arc(cx - r * 0.4, cy - r * 0.3, 1.0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.45, cy - r * 0.15, 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - r * 0.2, cy + r * 0.25, 0.9, 0, Math.PI * 2); ctx.fill();
        break;
      }
      default: {
        // Generic magic circle with runes
        ctx.strokeStyle = hexToRgba(color, 0.6);
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2); ctx.stroke();
        // Rune marks
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.45);
          ctx.lineTo(cx + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r * 0.75);
          ctx.stroke();
        }
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2); ctx.fill();
        break;
      }
    }
    ctx.restore();
  }

  private _rebuildSkillSlots(equippedSkills: TDSkillId[]): void {
    // Clear old slots
    for (const slot of this._skillSlots) {
      if (slot.el.parentNode) slot.el.parentNode.removeChild(slot.el);
    }
    this._skillSlots = [];

    for (let i = 0; i < equippedSkills.length; i++) {
      const skillId = equippedSkills[i];
      const cfg = TD_SKILL_CONFIGS[skillId];
      if (!cfg) continue;
      const slot = document.createElement("div");
      const c = cfg.color;
      const colorHex = `#${c.toString(16).padStart(6, "0")}`;
      const r = (c >> 16) & 0xff;
      const g = (c >> 8) & 0xff;
      const b = c & 0xff;

      slot.style.cssText = `
        width: 72px; height: 68px; position: relative;
        border-radius: 8px;
        border: 1px solid rgba(${r},${g},${b},0.4);
        background: linear-gradient(180deg, #25254a 0%, #1a1a36 30%, #121224 60%, #0e0e1c 100%);
        text-align: center;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        overflow: hidden;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.5),
                    0 0 10px rgba(${r},${g},${b},0.12), 0 2px 6px rgba(0,0,0,0.4);
      `;

      // Beveled border effect (inner highlight + shadow)
      const bevel = document.createElement("div");
      bevel.style.cssText = `
        position: absolute; inset: 0; border-radius: 8px; pointer-events: none;
        border-top: 1px solid rgba(255,255,255,0.1);
        border-left: 1px solid rgba(255,255,255,0.06);
        border-bottom: 1px solid rgba(0,0,0,0.6);
        border-right: 1px solid rgba(0,0,0,0.4);
      `;
      slot.appendChild(bevel);

      // Rune border pattern
      const runeCanvas = document.createElement("canvas");
      runeCanvas.width = 74;
      runeCanvas.height = 70;
      const rctx = runeCanvas.getContext("2d")!;
      rctx.strokeStyle = `rgba(${r},${g},${b},0.18)`;
      rctx.lineWidth = 0.6;
      // Draw subtle rune-like corner marks
      const cw = 74, ch = 70;
      const markLen = 10;
      // Top-left corner
      rctx.beginPath(); rctx.moveTo(2, markLen); rctx.lineTo(2, 2); rctx.lineTo(markLen, 2); rctx.stroke();
      // Top-right corner
      rctx.beginPath(); rctx.moveTo(cw - markLen, 2); rctx.lineTo(cw - 2, 2); rctx.lineTo(cw - 2, markLen); rctx.stroke();
      // Bottom-left corner
      rctx.beginPath(); rctx.moveTo(2, ch - markLen); rctx.lineTo(2, ch - 2); rctx.lineTo(markLen, ch - 2); rctx.stroke();
      // Bottom-right corner
      rctx.beginPath(); rctx.moveTo(cw - markLen, ch - 2); rctx.lineTo(cw - 2, ch - 2); rctx.lineTo(cw - 2, ch - markLen); rctx.stroke();
      // Small dot accents
      rctx.fillStyle = `rgba(${r},${g},${b},0.2)`;
      rctx.beginPath(); rctx.arc(cw / 2, 3, 1, 0, Math.PI * 2); rctx.fill();
      rctx.beginPath(); rctx.arc(cw / 2, ch - 3, 1, 0, Math.PI * 2); rctx.fill();
      const runeBorder = document.createElement("div");
      runeBorder.style.cssText = `
        position: absolute; inset: -1px; pointer-events: none;
        background-image: url(${runeCanvas.toDataURL()});
        background-size: cover;
      `;
      slot.appendChild(runeBorder);

      // Canvas-drawn skill icon
      const iconSize = 36;
      const iconCanvas = document.createElement("canvas");
      iconCanvas.width = iconSize;
      iconCanvas.height = iconSize;
      const ictx = iconCanvas.getContext("2d")!;
      // Subtle glow behind icon
      const igrd = ictx.createRadialGradient(iconSize / 2, iconSize / 2, 0, iconSize / 2, iconSize / 2, iconSize / 2);
      igrd.addColorStop(0, `rgba(${r},${g},${b},0.25)`);
      igrd.addColorStop(1, `rgba(${r},${g},${b},0.0)`);
      ictx.fillStyle = igrd;
      ictx.fillRect(0, 0, iconSize, iconSize);
      this._drawSkillIcon(ictx, skillId, colorHex, iconSize);

      const iconEl = document.createElement("img");
      iconEl.src = iconCanvas.toDataURL();
      iconEl.style.cssText = `
        width: ${iconSize}px; height: ${iconSize}px;
        filter: drop-shadow(0 0 4px ${colorHex}66);
        margin-bottom: 1px;
      `;
      slot.appendChild(iconEl);

      // Key label
      const key = document.createElement("div");
      key.style.cssText = `
        font-size: 11px; font-weight: bold; color: #ddd;
        text-shadow: 0 0 4px rgba(255,255,255,0.25);
        line-height: 1;
      `;
      key.textContent = `${i + 1}`;
      slot.appendChild(key);

      // Name
      const name = document.createElement("div");
      name.style.cssText = `
        font-size: 7px; color: #888; margin-top: 1px;
        letter-spacing: 0.5px; text-transform: uppercase;
        line-height: 1; max-width: 66px;
        overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
      `;
      name.textContent = cfg.name;
      slot.appendChild(name);

      // Cooldown overlay — radial sweep using conic-gradient
      const cdOverlay = document.createElement("div");
      cdOverlay.style.cssText = `
        position: absolute; inset: 0;
        background: conic-gradient(from 0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 0%, transparent 0%);
        border-radius: 8px;
        opacity: 0;
        pointer-events: none;
        z-index: 2;
      `;
      slot.appendChild(cdOverlay);

      // Cooldown text
      const cdText = document.createElement("div");
      cdText.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        font-size: 14px; font-weight: bold; color: rgba(255,255,255,0.85);
        text-shadow: 0 0 6px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1);
        opacity: 0;
        z-index: 3;
      `;
      slot.appendChild(cdText);

      // Active glow
      const activeGlow = document.createElement("div");
      activeGlow.style.cssText = `
        position: absolute; inset: -2px; border-radius: 10px;
        border: 2px solid ${colorHex}cc;
        box-shadow: 0 0 12px ${colorHex}66, 0 0 24px ${colorHex}33, inset 0 0 10px ${colorHex}22;
        opacity: 0;
        transition: opacity 0.15s;
      `;
      slot.appendChild(activeGlow);

      this._skillBar.appendChild(slot);
      this._skillSlots.push({ el: slot, cdOverlay, active: activeGlow, cdText });
    }

    this._lastEquippedSkills = [...equippedSkills];
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

    // Boost bar
    if (p.boostActive) {
      const pct = (p.boostTimer / 1.5) * 100;
      this._boostFill.style.width = `${pct}%`;
      this._boostFill.style.background = "linear-gradient(180deg, #88eeff 0%, #44bbff 40%, #2299ee 100%)";
      this._boostBar.style.borderColor = "rgba(100,220,255,0.7)";
      this._boostBar.style.boxShadow = "0 0 12px rgba(80,200,255,0.4), 0 1px 3px rgba(0,0,0,0.3)";
      this._boostLabel.textContent = "BOOSTING!";
      this._boostLabel.style.color = "#88eeff";
      this._boostFlash.style.opacity = `${Math.min(0.6, p.boostTimer * 0.4)}`;
    } else if (p.boostCooldown > 0) {
      const pct = (1 - p.boostCooldown / p.boostMaxCooldown) * 100;
      this._boostFill.style.width = `${pct}%`;
      this._boostFill.style.background = "linear-gradient(180deg, #445566 0%, #334455 40%, #223344 100%)";
      this._boostBar.style.borderColor = "rgba(60,80,100,0.3)";
      this._boostBar.style.boxShadow = "0 0 6px rgba(50,150,255,0.1), 0 1px 3px rgba(0,0,0,0.3)";
      this._boostLabel.textContent = `BOOST [${Math.ceil(p.boostCooldown)}s]`;
      this._boostLabel.style.color = "#557788";
      this._boostFlash.style.opacity = "0";
    } else {
      this._boostFill.style.width = "100%";
      this._boostFill.style.background = "linear-gradient(180deg, #44ccff 0%, #2288dd 40%, #1166aa 100%)";
      this._boostBar.style.borderColor = "rgba(100,200,255,0.3)";
      this._boostBar.style.boxShadow = "0 0 6px rgba(50,150,255,0.15), 0 1px 3px rgba(0,0,0,0.3)";
      this._boostLabel.textContent = "BOOST [SHIFT]";
      this._boostLabel.style.color = "#66bbff";
      this._boostFlash.style.opacity = "0";
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
        sunken_archipelago: "Sunken Archipelago",
        stormspire_crags: "Stormspire Crags",
        autumn_serpentine: "Autumn Serpentine",
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

    // XP / Level
    const xpPct = (p.xpToNextLevel > 0) ? (p.xp / p.xpToNextLevel) * 100 : 0;
    this._xpFill.style.width = `${xpPct}%`;
    this._levelEl.textContent = `LVL ${p.level}`;
    this._xpText.textContent = `${p.xp}/${p.xpToNextLevel} XP`;

    // Rebuild skill bar if equipped skills changed
    const equippedChanged = state.equippedSkills.length !== this._lastEquippedSkills.length ||
      state.equippedSkills.some((s, i) => s !== this._lastEquippedSkills[i]);
    if (equippedChanged) {
      this._rebuildSkillSlots(state.equippedSkills);
    }

    // Skills — use equipped skills
    const skillIds = state.equippedSkills;
    for (let i = 0; i < skillIds.length; i++) {
      const skillState = state.skills.find(s => s.id === skillIds[i]);
      if (!skillState) continue;
      const cfg = TD_SKILL_CONFIGS[skillIds[i]];
      if (!cfg) continue;
      const slot = this._skillSlots[i];
      if (!slot) continue;
      const colorHex = `#${cfg.color.toString(16).padStart(6, "0")}`;

      const onCooldown = skillState.cooldown > 0;
      const hasEnough = p.mana >= cfg.manaCost;

      // Cooldown overlay — radial sweep
      if (onCooldown) {
        const cdFrac = skillState.cooldown / skillState.maxCooldown;
        const deg = Math.round(cdFrac * 360);
        slot.cdOverlay.style.background = `conic-gradient(from 0deg, rgba(0,0,0,0.65) 0deg, rgba(0,0,0,0.45) ${deg}deg, transparent ${deg}deg)`;
        slot.cdOverlay.style.opacity = "1";
        slot.cdText.style.opacity = "1";
        slot.cdText.textContent = `${Math.ceil(skillState.cooldown)}`;
      } else {
        slot.cdOverlay.style.opacity = "0";
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
      this._centerText.textContent = "Arthur & the White Eagle\nWASD to move, LMB to shoot, 1-5 for skills, SHIFT to boost\nTAB to swap skills, ESC to pause";
      this._centerText.style.color = "#ccddff";
      this._centerText.style.opacity = "1";
    } else {
      this._centerText.style.opacity = "0";
    }

    // Update damage numbers — pop-in scale, drift, and fade
    this._dmgNumbers = this._dmgNumbers.filter(dn => {
      dn.timer -= dt;
      if (dn.timer <= 0) {
        if (dn.el.parentNode) dn.el.parentNode.removeChild(dn.el);
        return false;
      }
      const progress = 1 - dn.timer / dn.totalDur;

      // Ease-out rise with slight sine curve for organic drift
      const eased = 1 - Math.pow(1 - progress, 2.5);
      const riseHeight = (dn.isCrit || dn.isElite) ? 85 : 60;
      const yOffset = eased * riseHeight;
      const xDrift = dn.driftX * eased + Math.sin(progress * Math.PI * dn.driftCurve) * 12;

      dn.el.style.top = `${dn.startY - yOffset}px`;
      dn.el.style.left = `${dn.startX + xDrift}px`;

      // Scale: big pop on spawn, overshoot, then settle to 1, shrink at end
      let scalePop: number;
      if (progress < 0.08) {
        // Initial burst: scale from 0.3 to peak
        const peak = dn.isCrit ? 2.2 : dn.isElite ? 1.8 : 1.5;
        scalePop = 0.3 + (peak - 0.3) * (progress / 0.08);
      } else if (progress < 0.18) {
        // Overshoot settle
        const peak = dn.isCrit ? 2.2 : dn.isElite ? 1.8 : 1.5;
        const settleProgress = (progress - 0.08) / 0.10;
        scalePop = peak - (peak - 1.0) * settleProgress;
      } else if (progress > 0.85) {
        // Shrink out at end
        const shrinkProgress = (progress - 0.85) / 0.15;
        scalePop = 1.0 - shrinkProgress * 0.4;
      } else {
        scalePop = 1.0;
      }

      // Opacity: hold full, then smooth fade
      const fadeStart = 0.65;
      const opacity = progress > fadeStart ? 1.0 - ((progress - fadeStart) / (1 - fadeStart)) : 1.0;

      dn.el.style.opacity = `${opacity}`;
      dn.el.style.transform = `scale(${scalePop}) translateX(-50%)`;
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

    // Wave modifiers and synergy popups
    this._updateModifierDisplay(state, dt);
  }

  showDamageNumber(screenX: number, screenY: number, damage: number, isCrit: boolean, isElite: boolean): void {
    const el = document.createElement("div");

    // Color coding: crits are fiery red-orange, elites are gold, normal is white-blue
    const color = isElite ? "#ffd700" : isCrit ? "#ff3322" : "#e8eeff";
    const size = isCrit ? 30 : isElite ? 26 : 17;
    const duration = isCrit ? 1.8 : isElite ? 1.6 : 1.3;

    // Thick multi-layer outline for readability
    const outlineColor = isElite ? "rgba(100,70,0,1)" : isCrit ? "rgba(120,0,0,1)" : "rgba(0,0,0,0.95)";
    const glowColor = isElite ? "rgba(255,215,0,0.8)" : isCrit ? "rgba(255,100,30,0.8)" : "rgba(150,180,255,0.4)";
    const secondGlow = isElite ? "rgba(255,180,0,0.5)" : isCrit ? "rgba(255,50,0,0.5)" : "rgba(100,140,255,0.2)";

    // Random horizontal offset + drift direction for variety
    const offsetX = (Math.random() - 0.5) * 40;
    const driftX = (Math.random() - 0.5) * 30;
    const driftCurve = 1.5 + Math.random() * 2; // random sine frequency for wavy path

    const startX = screenX + offsetX;

    el.style.cssText = `
      position: absolute; left: ${startX}px; top: ${screenY}px;
      font-size: ${size}px; font-weight: 900; color: ${color};
      text-shadow:
        0 0 12px ${glowColor},
        0 0 4px ${secondGlow},
        -2px -2px 0 ${outlineColor},
        2px -2px 0 ${outlineColor},
        -2px 2px 0 ${outlineColor},
        2px 2px 0 ${outlineColor},
        -1px 0 0 ${outlineColor},
        1px 0 0 ${outlineColor},
        0 -1px 0 ${outlineColor},
        0 1px 0 ${outlineColor},
        0 3px 6px rgba(0,0,0,0.8);
      pointer-events: none; z-index: 15;
      font-family: 'Impact', 'Arial Black', sans-serif;
      letter-spacing: ${isCrit ? '2' : '1'}px;
      transform: scale(0.3) translateX(-50%);
      will-change: transform, opacity, top, left;
    `;

    // Build text content
    const dmgText = Math.floor(damage).toString();
    if (isCrit) {
      el.textContent = `\u2605 ${dmgText} \u2605`;
    } else if (isElite) {
      el.textContent = `\u2666 ${dmgText}`;
    } else {
      el.textContent = dmgText;
    }

    this._root.appendChild(el);
    this._dmgNumbers.push({
      el,
      timer: duration,
      totalDur: duration,
      startY: screenY,
      startX,
      driftX,
      driftCurve,
      isCrit,
      isElite,
    });
  }

  setEquipSkillCallback(cb: (slot: number, skillId: TDSkillId) => void): void {
    this._onEquipSkill = cb;
  }

  get isSkillEquipVisible(): boolean {
    return this._skillEquipVisible;
  }

  showSkillEquipMenu(state: ThreeDragonState): void {
    this._skillEquipVisible = true;
    this._skillEquipOverlay.style.display = "flex";
    // Rebuild content
    this._skillEquipOverlay.innerHTML = "";

    const container = document.createElement("div");
    container.style.cssText = `
      display: flex; flex-direction: column; align-items: center;
      max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;
    `;

    const title = document.createElement("div");
    title.style.cssText = `
      font-size: 28px; color: #ccddff; font-weight: bold; letter-spacing: 3px;
      text-shadow: 0 0 12px rgba(100,150,255,0.5), 2px 2px 4px rgba(0,0,0,0.8);
      margin-bottom: 8px; text-transform: uppercase;
    `;
    title.textContent = "Equip Skills";
    container.appendChild(title);

    const hint = document.createElement("div");
    hint.style.cssText = `
      font-size: 11px; color: #667788; letter-spacing: 1px; margin-bottom: 20px;
    `;
    hint.textContent = "Click a skill to assign it to a slot. Press TAB to close.";
    container.appendChild(hint);

    // Current slots
    const slotsLabel = document.createElement("div");
    slotsLabel.style.cssText = `
      font-size: 12px; color: #88aacc; letter-spacing: 2px; text-transform: uppercase;
      margin-bottom: 10px; font-weight: bold;
    `;
    slotsLabel.textContent = "Active Skill Slots (1-5)";
    container.appendChild(slotsLabel);

    const slotsRow = document.createElement("div");
    slotsRow.style.cssText = `display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center;`;

    for (let i = 0; i < 5; i++) {
      const equippedId = state.equippedSkills[i];
      const cfg = equippedId ? TD_SKILL_CONFIGS[equippedId] : null;
      const slotEl = document.createElement("div");
      const colorHex = cfg ? `#${cfg.color.toString(16).padStart(6, "0")}` : "#444";
      slotEl.style.cssText = `
        width: 90px; height: 60px; border-radius: 8px;
        border: 2px solid ${cfg ? colorHex + "88" : "rgba(80,80,100,0.3)"};
        background: linear-gradient(180deg, #1a1a30 0%, #101020 100%);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.2s; position: relative;
      `;
      const keyLabel = document.createElement("div");
      keyLabel.style.cssText = `font-size: 14px; font-weight: bold; color: #ffd700; margin-bottom: 2px;`;
      keyLabel.textContent = `${i + 1}`;
      slotEl.appendChild(keyLabel);
      const nameLabel = document.createElement("div");
      nameLabel.style.cssText = `font-size: 8px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;`;
      nameLabel.textContent = cfg ? cfg.name : "Empty";
      slotEl.appendChild(nameLabel);
      slotsRow.appendChild(slotEl);
    }
    container.appendChild(slotsRow);

    // Available skills
    const availLabel = document.createElement("div");
    availLabel.style.cssText = `
      font-size: 12px; color: #88aacc; letter-spacing: 2px; text-transform: uppercase;
      margin-bottom: 10px; font-weight: bold;
    `;
    availLabel.textContent = "Unlocked Skills (click to equip)";
    container.appendChild(availLabel);

    const skillGrid = document.createElement("div");
    skillGrid.style.cssText = `
      display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 20px;
    `;

    for (const skillId of state.unlockedSkills) {
      const cfg = TD_SKILL_CONFIGS[skillId];
      if (!cfg) continue;
      const colorHex = `#${cfg.color.toString(16).padStart(6, "0")}`;
      const isEquipped = state.equippedSkills.includes(skillId);

      const card = document.createElement("div");
      card.style.cssText = `
        width: 110px; padding: 10px; border-radius: 8px;
        border: 1px solid ${isEquipped ? colorHex + "aa" : "rgba(80,80,100,0.3)"};
        background: ${isEquipped
          ? `linear-gradient(180deg, ${colorHex}15 0%, ${colorHex}08 100%)`
          : "linear-gradient(180deg, #141420 0%, #0c0c18 100%)"};
        cursor: pointer; transition: all 0.2s; text-align: center;
        pointer-events: auto;
        ${isEquipped ? `box-shadow: 0 0 8px ${colorHex}33;` : ""}
      `;
      card.addEventListener("mouseenter", () => {
        card.style.borderColor = colorHex;
        card.style.boxShadow = `0 0 12px ${colorHex}44`;
        card.style.transform = "scale(1.05)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.borderColor = isEquipped ? colorHex + "aa" : "rgba(80,80,100,0.3)";
        card.style.boxShadow = isEquipped ? `0 0 8px ${colorHex}33` : "none";
        card.style.transform = "scale(1)";
      });

      const icon = document.createElement("div");
      icon.style.cssText = `
        width: 16px; height: 16px; border-radius: 50%; margin: 0 auto 6px;
        background: radial-gradient(circle at 35% 35%, ${colorHex}cc, ${colorHex}66);
        box-shadow: 0 0 8px ${colorHex}44;
      `;
      card.appendChild(icon);

      const nameEl = document.createElement("div");
      nameEl.style.cssText = `font-size: 10px; font-weight: bold; color: ${colorHex}; margin-bottom: 4px; letter-spacing: 0.5px;`;
      nameEl.textContent = cfg.name;
      card.appendChild(nameEl);

      const descEl = document.createElement("div");
      descEl.style.cssText = `font-size: 8px; color: #778899; line-height: 1.3; margin-bottom: 4px;`;
      descEl.textContent = cfg.description;
      card.appendChild(descEl);

      const statsEl = document.createElement("div");
      statsEl.style.cssText = `font-size: 7px; color: #556677; letter-spacing: 0.5px;`;
      const parts: string[] = [];
      if (cfg.damage > 0) parts.push(`DMG: ${cfg.damage}`);
      if (cfg.manaCost > 0) parts.push(`MANA: ${cfg.manaCost}`);
      parts.push(`CD: ${cfg.cooldown}s`);
      statsEl.textContent = parts.join(" | ");
      card.appendChild(statsEl);

      if (isEquipped) {
        const eqBadge = document.createElement("div");
        eqBadge.style.cssText = `
          font-size: 7px; color: #ffd700; margin-top: 4px;
          letter-spacing: 1px; text-transform: uppercase; font-weight: bold;
        `;
        eqBadge.textContent = `SLOT ${state.equippedSkills.indexOf(skillId) + 1}`;
        card.appendChild(eqBadge);
      }

      // Click to equip: find first available slot or cycle
      card.addEventListener("click", () => {
        if (isEquipped) {
          // Already equipped - unequip is not allowed for now, just notify
          return;
        }
        // Find first slot that doesn't have a unique skill or replace last slot
        // Simple: put in next open slot, or if all 5 filled, replace slot 5
        let targetSlot = state.equippedSkills.length;
        if (targetSlot >= 5) targetSlot = 4; // replace last
        this._onEquipSkill?.(targetSlot, skillId);
        // Refresh the menu
        this.showSkillEquipMenu(state);
      });

      skillGrid.appendChild(card);
    }

    // Show locked skills
    for (const unlock of TD_SKILL_UNLOCK_ORDER) {
      if (state.unlockedSkills.includes(unlock.skillId)) continue;
      const cfg = TD_SKILL_CONFIGS[unlock.skillId];
      if (!cfg) continue;

      const card = document.createElement("div");
      card.style.cssText = `
        width: 110px; padding: 10px; border-radius: 8px;
        border: 1px solid rgba(60,60,80,0.2);
        background: linear-gradient(180deg, #0c0c14 0%, #08080e 100%);
        text-align: center; opacity: 0.5;
      `;

      const lockIcon = document.createElement("div");
      lockIcon.style.cssText = `font-size: 14px; margin-bottom: 4px; color: #556;`;
      lockIcon.textContent = "\uD83D\uDD12";
      card.appendChild(lockIcon);

      const nameEl = document.createElement("div");
      nameEl.style.cssText = `font-size: 10px; color: #556; margin-bottom: 4px;`;
      nameEl.textContent = cfg.name;
      card.appendChild(nameEl);

      const lockText = document.createElement("div");
      lockText.style.cssText = `font-size: 8px; color: #445;`;
      lockText.textContent = `Unlocks at Level ${unlock.level}`;
      card.appendChild(lockText);

      skillGrid.appendChild(card);
    }

    container.appendChild(skillGrid);

    // Close button
    const closeBtn = document.createElement("div");
    closeBtn.style.cssText = `
      padding: 10px 30px; border-radius: 8px; cursor: pointer;
      border: 1px solid rgba(100,150,255,0.3);
      background: linear-gradient(180deg, rgba(20,25,50,0.9) 0%, rgba(10,12,25,0.95) 100%);
      color: #aabbdd; font-size: 14px; font-weight: bold; letter-spacing: 2px;
      text-transform: uppercase; transition: all 0.2s; pointer-events: auto;
    `;
    closeBtn.textContent = "Close (TAB)";
    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.borderColor = "rgba(255,215,0,0.5)";
      closeBtn.style.color = "#ffd700";
    });
    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.borderColor = "rgba(100,150,255,0.3)";
      closeBtn.style.color = "#aabbdd";
    });
    closeBtn.addEventListener("click", () => this.hideSkillEquipMenu());
    container.appendChild(closeBtn);

    this._skillEquipOverlay.appendChild(container);
  }

  hideSkillEquipMenu(): void {
    this._skillEquipVisible = false;
    this._skillEquipOverlay.style.display = "none";
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

  // -------------------------------------------------------------------------
  // Synergy Popups
  // -------------------------------------------------------------------------

  showSynergyPopup(screenX: number, screenY: number, text: string, color: string): void {
    const el = document.createElement("div");
    el.style.cssText = `
      position: absolute; left: ${screenX}px; top: ${screenY - 30}px;
      font-size: 20px; font-weight: 900; color: ${color};
      text-shadow: 0 0 12px ${color}, 0 0 4px rgba(0,0,0,0.8),
        -2px -2px 0 rgba(0,0,0,0.9), 2px 2px 0 rgba(0,0,0,0.9);
      pointer-events: none; z-index: 16;
      font-family: 'Impact', 'Arial Black', sans-serif;
      letter-spacing: 2px; transform: translateX(-50%) scale(1.5);
      will-change: transform, opacity, top;
    `;
    el.textContent = text;
    this._root.appendChild(el);
    this._synergyPopups.push({ el, timer: 1.5 });
  }

  // -------------------------------------------------------------------------
  // Upgrade Menu
  // -------------------------------------------------------------------------

  setUpgradeCallback(cb: (upgradeId: TDUpgradeId) => void): void {
    this._onUpgrade = cb;
  }

  showUpgradeMenu(state: ThreeDragonState): void {
    this._upgradeOverlay.style.display = "flex";
    this._upgradeOverlay.innerHTML = "";

    const container = document.createElement("div");
    container.style.cssText = `
      display: flex; flex-direction: column; align-items: center;
      max-width: 700px; width: 90%;
    `;

    const title = document.createElement("div");
    title.style.cssText = `
      font-size: 32px; color: #ffd700; font-weight: bold; letter-spacing: 4px;
      text-shadow: 0 0 20px rgba(255,215,0,0.5), 2px 2px 4px rgba(0,0,0,0.8);
      margin-bottom: 8px; text-transform: uppercase;
    `;
    title.textContent = "Choose an Upgrade";
    container.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.style.cssText = `
      font-size: 12px; color: #8899aa; letter-spacing: 2px; margin-bottom: 30px;
    `;
    subtitle.textContent = `Wave ${state.wave} Complete`;
    container.appendChild(subtitle);

    const cardsRow = document.createElement("div");
    cardsRow.style.cssText = `display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;`;

    for (const choice of state.upgradeChoices) {
      const card = document.createElement("div");
      card.style.cssText = `
        width: 180px; padding: 24px 16px; border-radius: 12px;
        border: 2px solid ${choice.color}44;
        background: linear-gradient(180deg, rgba(20,20,40,0.95) 0%, rgba(10,10,25,0.98) 100%);
        cursor: pointer; transition: all 0.25s; text-align: center;
        pointer-events: auto;
      `;
      card.addEventListener("mouseenter", () => {
        card.style.borderColor = choice.color;
        card.style.boxShadow = `0 0 20px ${choice.color}44`;
        card.style.transform = "translateY(-4px) scale(1.03)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.borderColor = `${choice.color}44`;
        card.style.boxShadow = "none";
        card.style.transform = "none";
      });

      const icon = document.createElement("div");
      icon.style.cssText = `font-size: 36px; margin-bottom: 12px;`;
      icon.textContent = choice.icon;
      card.appendChild(icon);

      const nameEl = document.createElement("div");
      nameEl.style.cssText = `
        font-size: 16px; font-weight: bold; color: ${choice.color};
        margin-bottom: 8px; letter-spacing: 1px;
      `;
      nameEl.textContent = choice.name;
      card.appendChild(nameEl);

      const descEl = document.createElement("div");
      descEl.style.cssText = `font-size: 11px; color: #8899aa; line-height: 1.4;`;
      descEl.textContent = choice.description;
      card.appendChild(descEl);

      card.addEventListener("click", () => {
        this._onUpgrade?.(choice.id);
      });

      cardsRow.appendChild(card);
    }

    container.appendChild(cardsRow);
    this._upgradeOverlay.appendChild(container);
  }

  hideUpgradeMenu(): void {
    this._upgradeOverlay.style.display = "none";
  }

  // -------------------------------------------------------------------------
  // Wave Modifier Display
  // -------------------------------------------------------------------------

  private _updateModifierDisplay(state: ThreeDragonState, dt: number): void {
    const mods = state.activeModifiers;
    const modsKey = mods.join(",");
    const lastKey = this._lastModifiers.join(",");

    if (modsKey !== lastKey) {
      this._lastModifiers = [...mods];
      this._modifierBar.innerHTML = "";

      if (mods.length > 0) {
        // Show announcement
        const lines = mods.map(id => {
          const m = TD_WAVE_MODIFIER_BY_ID[id];
          return m ? `${m.icon} ${m.name}: ${m.description}` : "";
        }).filter(Boolean);
        this._modifierAnnounce.textContent = `WAVE MODIFIERS\n${lines.join("\n")}`;
        this._modifierAnnounce.style.opacity = "1";
        this._modifierAnnounceTimer = 3;
      }

      for (const id of mods) {
        const m = TD_WAVE_MODIFIER_BY_ID[id];
        if (!m) continue;
        const badge = document.createElement("div");
        badge.style.cssText = `
          padding: 4px 10px; border-radius: 6px;
          background: rgba(0,0,0,0.6); border: 1px solid ${m.color}66;
          color: ${m.color}; font-size: 10px; font-weight: bold;
          letter-spacing: 1px; text-transform: uppercase;
          text-shadow: 0 0 6px ${m.color}44;
        `;
        badge.textContent = `${m.icon} ${m.name}`;
        this._modifierBar.appendChild(badge);
      }
    }

    // Fade modifier announcement
    if (this._modifierAnnounceTimer > 0) {
      this._modifierAnnounceTimer -= dt;
      this._modifierAnnounce.style.opacity = `${Math.min(1, this._modifierAnnounceTimer)}`;
      if (this._modifierAnnounceTimer <= 0) {
        this._modifierAnnounce.style.opacity = "0";
      }
    }

    // Update synergy popups
    this._synergyPopups = this._synergyPopups.filter(sp => {
      sp.timer -= dt;
      if (sp.timer <= 0) {
        if (sp.el.parentNode) sp.el.parentNode.removeChild(sp.el);
        return false;
      }
      const progress = 1 - sp.timer / 1.5;
      const yOffset = progress * 60;
      const currentTop = parseFloat(sp.el.style.top) || 0;
      sp.el.style.top = `${currentTop - yOffset * dt * 2}px`;
      const scale = progress < 0.1 ? 1.5 - progress * 5 : 1;
      sp.el.style.transform = `translateX(-50%) scale(${scale})`;
      sp.el.style.opacity = `${sp.timer > 0.3 ? 1 : sp.timer / 0.3}`;
      return true;
    });
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
    for (const sp of this._synergyPopups) {
      if (sp.el.parentNode) sp.el.parentNode.removeChild(sp.el);
    }
    this._synergyPopups = [];
    this._lastModifiers = [];
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
