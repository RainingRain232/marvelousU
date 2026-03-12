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
  private _manaBar!: HTMLDivElement; // bar container
  private _manaFill!: HTMLDivElement;
  private _scoreEl!: HTMLDivElement;
  private _waveEl!: HTMLDivElement;
  private _comboEl!: HTMLDivElement;
  private _skillBar!: HTMLDivElement;
  private _skillSlots: { el: HTMLDivElement; cdOverlay: HTMLDivElement; active: HTMLDivElement }[] = [];
  private _bossBar!: HTMLDivElement;
  private _bossFill!: HTMLDivElement;
  private _bossName!: HTMLDivElement;
  private _notification!: HTMLDivElement;
  private _centerText!: HTMLDivElement;
  private _notifTimer = 0;

  build(_sw: number, _sh: number): void {
    this._root = document.createElement("div");
    this._root.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 10; font-family: Georgia, serif;
      color: white; overflow: hidden;
    `;

    // HP Bar
    const hpContainer = this._createBar(20, 15, 200, 16, "#220000", "#884444");
    this._hpBar = hpContainer;
    this._hpFill = hpContainer.querySelector(".fill") as HTMLDivElement;
    this._root.appendChild(hpContainer);

    // HP label
    const hpLabel = document.createElement("div");
    hpLabel.style.cssText = "position:absolute; left:22px; top:16px; font-size:10px; color:#cc8888; text-shadow:1px 1px #000;";
    hpLabel.textContent = "HP";
    this._root.appendChild(hpLabel);

    // Mana Bar
    const manaContainer = this._createBar(20, 35, 200, 12, "#000022", "#4444aa");
    this._manaBar = manaContainer;
    this._manaFill = manaContainer.querySelector(".fill") as HTMLDivElement;
    this._root.appendChild(manaContainer);

    // Mana label
    const manaLabel = document.createElement("div");
    manaLabel.style.cssText = "position:absolute; left:22px; top:36px; font-size:9px; color:#8888cc; text-shadow:1px 1px #000;";
    manaLabel.textContent = "MP";
    this._root.appendChild(manaLabel);

    // Score
    this._scoreEl = document.createElement("div");
    this._scoreEl.style.cssText = `
      position: absolute; top: 12px; right: 20px; font-size: 26px;
      color: #ffd700; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      letter-spacing: 2px;
    `;
    this._root.appendChild(this._scoreEl);

    // Wave
    this._waveEl = document.createElement("div");
    this._waveEl.style.cssText = `
      position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
      font-size: 18px; color: #ccddff; font-weight: bold;
      text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
    `;
    this._root.appendChild(this._waveEl);

    // Combo
    this._comboEl = document.createElement("div");
    this._comboEl.style.cssText = `
      position: absolute; top: 35px; left: 50%; transform: translateX(-50%);
      font-size: 22px; color: #ff8844; font-weight: bold; font-style: italic;
      text-shadow: 1px 1px 3px rgba(0,0,0,0.8); opacity: 0;
    `;
    this._root.appendChild(this._comboEl);

    // Skill Bar
    this._skillBar = document.createElement("div");
    this._skillBar.style.cssText = `
      position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 8px;
      background: rgba(10,10,26,0.7); border: 1px solid #334466;
      border-radius: 6px; padding: 8px 12px;
    `;
    this._buildSkillBar();
    this._root.appendChild(this._skillBar);

    // Boss HP bar (hidden initially)
    this._bossBar = document.createElement("div");
    this._bossBar.style.cssText = `
      position: absolute; top: 50px; left: 25%; width: 50%; height: 14px;
      background: #220000; border: 1px solid #ff4444; border-radius: 4px;
      overflow: hidden; display: none;
    `;
    this._bossFill = document.createElement("div");
    this._bossFill.style.cssText = "width:100%; height:100%; background:#ff2222; border-radius:3px; transition:width 0.1s;";
    this._bossBar.appendChild(this._bossFill);
    this._root.appendChild(this._bossBar);

    this._bossName = document.createElement("div");
    this._bossName.style.cssText = `
      position: absolute; top: 32px; left: 50%; transform: translateX(-50%);
      font-size: 14px; color: #ffddaa; font-weight: bold;
      text-shadow: 1px 1px 3px rgba(0,0,0,0.8); display: none;
    `;
    this._root.appendChild(this._bossName);

    // Notification
    this._notification = document.createElement("div");
    this._notification.style.cssText = `
      position: absolute; top: 30%; left: 50%; transform: translateX(-50%);
      font-size: 32px; font-weight: bold; letter-spacing: 4px;
      text-shadow: 3px 3px 6px rgba(0,0,0,0.8); opacity: 0;
      text-align: center;
    `;
    this._root.appendChild(this._notification);

    // Center text
    this._centerText = document.createElement("div");
    this._centerText.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 24px; font-weight: bold; color: #88ccff;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8); text-align: center;
    `;
    this._root.appendChild(this._centerText);

    document.body.appendChild(this._root);
  }

  private _createBar(x: number, y: number, w: number, h: number, bgColor: string, borderColor: string): HTMLDivElement {
    const container = document.createElement("div");
    container.style.cssText = `
      position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px;
      background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 4px;
      overflow: hidden;
    `;
    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.cssText = "width: 100%; height: 100%; border-radius: 3px; transition: width 0.1s;";
    container.appendChild(fill);
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
      slot.style.cssText = `
        width: 56px; height: 50px; position: relative;
        border-radius: 4px; border: 1px solid #444;
        background: #1a1a2a; text-align: center;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
      `;

      // Color dot
      const dot = document.createElement("div");
      const c = cfg.color;
      dot.style.cssText = `
        width: 10px; height: 10px; border-radius: 50%;
        background: #${c.toString(16).padStart(6, "0")};
        margin-bottom: 2px;
      `;
      slot.appendChild(dot);

      // Key label
      const key = document.createElement("div");
      key.style.cssText = "font-size: 12px; font-weight: bold; color: white;";
      key.textContent = cfg.key;
      slot.appendChild(key);

      // Name
      const name = document.createElement("div");
      name.style.cssText = "font-size: 8px; color: #999; margin-top: 1px;";
      name.textContent = cfg.name;
      slot.appendChild(name);

      // Cooldown overlay
      const cdOverlay = document.createElement("div");
      cdOverlay.style.cssText = `
        position: absolute; bottom: 0; left: 0; right: 0;
        background: rgba(0,0,0,0.6); border-radius: 0 0 4px 4px;
        height: 0%;
      `;
      slot.appendChild(cdOverlay);

      // Active glow
      const activeGlow = document.createElement("div");
      activeGlow.style.cssText = `
        position: absolute; inset: -2px; border-radius: 6px;
        border: 2px solid #ffdd44; opacity: 0;
      `;
      slot.appendChild(activeGlow);

      this._skillBar.appendChild(slot);
      this._skillSlots.push({ el: slot, cdOverlay, active: activeGlow });
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
    this._hpFill.style.background = hpPct > 0.5 ? "#44cc44" : hpPct > 0.25 ? "#ccaa22" : "#cc2222";
    if (hpPct < 0.25) {
      this._hpBar.style.boxShadow = `0 0 8px rgba(255,0,0,${0.3 + Math.sin(state.gameTime * 6) * 0.15})`;
    } else {
      this._hpBar.style.boxShadow = "none";
    }

    // Mana
    this._manaFill.style.width = `${(p.mana / p.maxMana) * 100}%`;
    this._manaFill.style.background = "#4488ff";
    this._manaBar.style.boxShadow = p.mana < 20 ? "0 0 6px rgba(68,136,255,0.3)" : "none";

    // Score
    this._scoreEl.textContent = p.score.toLocaleString();

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
      const scale = 1 + Math.min(0.3, p.comboCount * 0.02);
      this._comboEl.style.transform = `translateX(-50%) scale(${scale})`;
    } else {
      this._comboEl.style.opacity = "0";
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

      const onCooldown = skillState.cooldown > 0;
      const hasEnough = p.mana >= cfg.manaCost;

      // Cooldown overlay
      if (onCooldown) {
        const cdPct = (skillState.cooldown / skillState.maxCooldown) * 100;
        slot.cdOverlay.style.height = `${cdPct}%`;
      } else {
        slot.cdOverlay.style.height = "0%";
      }

      // Border
      if (skillState.active) {
        slot.el.style.borderColor = "#ffdd44";
        slot.active.style.opacity = "1";
      } else if (hasEnough && !onCooldown) {
        slot.el.style.borderColor = `#${cfg.color.toString(16).padStart(6, "0")}`;
        slot.active.style.opacity = "0";
      } else {
        slot.el.style.borderColor = "#333";
        slot.active.style.opacity = "0";
      }

      slot.el.style.background = onCooldown ? "#111122" : (hasEnough ? "#1a2233" : "#111118");
    }

    // Boss HP
    const boss = state.enemies.find(e => e.isBoss && e.alive);
    if (boss) {
      this._bossBar.style.display = "block";
      this._bossName.style.display = "block";
      this._bossFill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
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
      } else if (isBossNext) {
        this._centerText.textContent = `Next: Wave ${nextWave} - BOSS WAVE!`;
        this._centerText.style.color = "#ff4444";
      } else {
        this._centerText.textContent = `Next: Wave ${nextWave}`;
        this._centerText.style.color = "#88ccff";
      }
      this._centerText.style.opacity = `${Math.min(1, state.betweenWaveTimer)}`;
    } else if (state.betweenWaves && state.wave === 0) {
      this._centerText.textContent = "Arthur & the White Eagle\nWASD to move, LMB to shoot, 1-5 for skills";
      this._centerText.style.color = "#ccddff";
      this._centerText.style.opacity = "1";
    } else {
      this._centerText.style.opacity = "0";
    }

    // Notifications
    if (this._notifTimer > 0) {
      this._notifTimer -= dt;
      this._notification.style.opacity = `${Math.min(1, this._notifTimer * 2)}`;
      if (this._notifTimer <= 0) {
        this._notification.style.opacity = "0";
      }
    }
  }

  showNotification(msg: string, color: string): void {
    this._notification.textContent = msg;
    this._notification.style.color = color;
    this._notification.style.opacity = "1";
    this._notifTimer = 2.5;
  }

  cleanup(): void {
    if (this._root.parentNode) {
      this._root.parentNode.removeChild(this._root);
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
