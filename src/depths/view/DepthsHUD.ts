// ---------------------------------------------------------------------------
// Depths of Avalon — DOM-based HUD overlay
// ---------------------------------------------------------------------------

import { DEPTHS } from "../config/DepthsConfig";
import type { DepthsState } from "../state/DepthsState";
import { buyUpgrade, startDive } from "../systems/DepthsSystem";

const UPGRADE_DESCS: Record<string, string> = {
  lung_capacity: "+20 max oxygen per level",
  swim_speed: "+1.5 swim speed per level",
  armor: "+15 max HP per level",
  sword: "+8 melee damage per level",
  light_radius: "+5m light range per level",
  pressure_resist: "-1.5 pressure dmg/s per level",
  harpoon: "+10 harpoon damage per level",
};

export class DepthsHUD {
  private _root!: HTMLDivElement;
  private _hpBar!: HTMLDivElement;
  private _hpFill!: HTMLDivElement;
  private _hpText!: HTMLDivElement;
  private _o2Bar!: HTMLDivElement;
  private _o2Fill!: HTMLDivElement;
  private _depthLabel!: HTMLDivElement;
  private _zoneLabel!: HTMLDivElement;
  private _goldLabel!: HTMLDivElement;
  private _levelLabel!: HTMLDivElement;
  private _xpBar!: HTMLDivElement;
  private _xpFill!: HTMLDivElement;
  private _notifContainer!: HTMLDivElement;
  private _crosshair!: HTMLDivElement;
  private _statsPanel!: HTMLDivElement;
  private _menuOverlay!: HTMLDivElement;
  private _shopOverlay!: HTMLDivElement;
  private _gameOverOverlay!: HTMLDivElement;
  private _minimap!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;
  private _onExitCb: (() => void) | null = null;

  // New HUD elements
  private _comboLabel!: HTMLDivElement;
  private _abilityPanel!: HTMLDivElement;
  private _bossBar!: HTMLDivElement;
  private _bossFill!: HTMLDivElement;
  private _bossName!: HTMLDivElement;
  private _dmgIndicatorContainer!: HTMLDivElement;
  private _pressureWarning!: HTMLDivElement;
  private _relicPanel!: HTMLDivElement;
  private _vignetteOverlay!: HTMLDivElement;
  private _flashOverlay!: HTMLDivElement;
  private _achievementContainer!: HTMLDivElement;
  private _chargeBar!: HTMLDivElement;
  private _chargeFill!: HTMLDivElement;
  private _victoryOverlay!: HTMLDivElement;
  private _pauseOverlay!: HTMLDivElement;
  private _currentIndicator!: HTMLDivElement;
  private _achieveOverlay!: HTMLDivElement;

  // Track shop rendered state to avoid re-rendering every frame
  private _shopRenderedGold = -1;

  build(onExit: () => void): void {
    this._onExitCb = onExit;

    this._root = document.createElement("div");
    this._root.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:10;pointer-events:none;font-family:'Cinzel',serif;color:#ddeeff;";
    document.body.appendChild(this._root);

    // HP bar
    this._hpBar = this._makeBar(20, 20, 200, 18, "#224444");
    this._hpFill = this._hpBar.firstChild as HTMLDivElement;
    this._root.appendChild(this._hpBar);
    this._hpText = document.createElement("div");
    this._hpText.style.cssText = "position:absolute;top:20px;left:225px;font-size:12px;color:#88ccaa;";
    this._root.appendChild(this._hpText);

    // O2 bar
    this._o2Bar = this._makeBar(20, 44, 200, 18, "#112244");
    this._o2Fill = this._o2Bar.firstChild as HTMLDivElement;
    this._root.appendChild(this._o2Bar);
    const o2Label = document.createElement("div");
    o2Label.textContent = "O2";
    o2Label.style.cssText = "position:absolute;top:44px;left:225px;font-size:12px;color:#44aadd;";
    this._root.appendChild(o2Label);

    // XP bar
    this._xpBar = this._makeBar(20, 68, 200, 10, "#222233");
    this._xpFill = this._xpBar.firstChild as HTMLDivElement;
    this._root.appendChild(this._xpBar);

    // Depth
    this._depthLabel = document.createElement("div");
    this._depthLabel.style.cssText = "position:absolute;top:20px;right:20px;font-size:28px;text-shadow:0 0 10px #0088aa;";
    this._root.appendChild(this._depthLabel);

    // Zone
    this._zoneLabel = document.createElement("div");
    this._zoneLabel.style.cssText = "position:absolute;top:52px;right:20px;font-size:14px;color:#66aacc;text-shadow:0 0 6px #004466;";
    this._root.appendChild(this._zoneLabel);

    // Gold
    this._goldLabel = document.createElement("div");
    this._goldLabel.style.cssText = "position:absolute;top:74px;right:20px;font-size:16px;color:#ffcc00;text-shadow:0 0 6px #886600;";
    this._root.appendChild(this._goldLabel);

    // Level
    this._levelLabel = document.createElement("div");
    this._levelLabel.style.cssText = "position:absolute;top:68px;left:225px;font-size:11px;color:#aabb88;";
    this._root.appendChild(this._levelLabel);

    // Combo counter
    this._comboLabel = document.createElement("div");
    this._comboLabel.style.cssText = "position:absolute;top:50%;right:40px;transform:translateY(-50%);font-size:36px;color:#ff8844;text-shadow:0 0 15px #ff4400;opacity:0;transition:opacity 0.2s;";
    this._root.appendChild(this._comboLabel);

    // Ability cooldowns (bottom center)
    this._abilityPanel = document.createElement("div");
    this._abilityPanel.style.cssText = "position:absolute;bottom:80px;left:50%;transform:translateX(-50%);display:flex;gap:10px;";
    this._root.appendChild(this._abilityPanel);

    // Boss HP bar (top center)
    this._bossBar = document.createElement("div");
    this._bossBar.style.cssText = "position:absolute;top:15px;left:50%;transform:translateX(-50%);width:400px;height:22px;background:#1a0022;border:2px solid #882288;border-radius:4px;overflow:hidden;display:none;";
    this._bossFill = document.createElement("div");
    this._bossFill.style.cssText = "width:100%;height:100%;background:linear-gradient(90deg,#882288,#ff44ff);border-radius:3px;transition:width 0.15s;";
    this._bossBar.appendChild(this._bossFill);
    this._root.appendChild(this._bossBar);
    this._bossName = document.createElement("div");
    this._bossName.style.cssText = "position:absolute;top:40px;left:50%;transform:translateX(-50%);font-size:14px;color:#ff88ff;text-shadow:0 0 8px #aa22aa;display:none;";
    this._root.appendChild(this._bossName);

    // Damage indicators container
    this._dmgIndicatorContainer = document.createElement("div");
    this._dmgIndicatorContainer.style.cssText = "position:absolute;top:50%;left:50%;width:0;height:0;pointer-events:none;";
    this._root.appendChild(this._dmgIndicatorContainer);

    // Pressure warning
    this._pressureWarning = document.createElement("div");
    this._pressureWarning.style.cssText = "position:absolute;bottom:120px;left:50%;transform:translateX(-50%);font-size:13px;color:#ff6644;text-shadow:0 0 8px #aa2200;opacity:0;transition:opacity 0.3s;";
    this._pressureWarning.textContent = "PRESSURE DAMAGE";
    this._root.appendChild(this._pressureWarning);

    // Stats panel
    this._statsPanel = document.createElement("div");
    this._statsPanel.style.cssText = "position:absolute;bottom:20px;left:20px;font-size:11px;color:#6699aa;line-height:1.5;";
    this._root.appendChild(this._statsPanel);

    // Crosshair (dynamic)
    this._crosshair = document.createElement("div");
    this._crosshair.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;transition:width 0.1s,height 0.1s,border-color 0.15s;border:2px solid rgba(136,204,255,0.5);border-radius:50%;";
    // Hit marker (inner dot, hidden by default)
    const hitMarker = document.createElement("div");
    hitMarker.id = "depths-hit-marker";
    hitMarker.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:4px;height:4px;background:#ffcc00;border-radius:50%;opacity:0;transition:opacity 0.05s;";
    this._crosshair.appendChild(hitMarker);
    this._root.appendChild(this._crosshair);

    // Notifications
    this._notifContainer = document.createElement("div");
    this._notifContainer.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-80px);text-align:center;";
    this._root.appendChild(this._notifContainer);

    // Minimap
    this._minimap = document.createElement("canvas");
    this._minimap.width = 120;
    this._minimap.height = 120;
    this._minimap.style.cssText = "position:absolute;bottom:20px;right:20px;border:1px solid #335566;border-radius:4px;opacity:0.7;";
    this._root.appendChild(this._minimap);
    this._minimapCtx = this._minimap.getContext("2d")!;

    // Charge bar (below crosshair)
    this._chargeBar = document.createElement("div");
    this._chargeBar.style.cssText = "position:absolute;top:55%;left:50%;transform:translateX(-50%);width:80px;height:6px;background:#112233;border:1px solid #335566;border-radius:3px;overflow:hidden;display:none;";
    this._chargeFill = document.createElement("div");
    this._chargeFill.style.cssText = "width:0;height:100%;border-radius:3px;transition:background 0.1s;";
    this._chargeBar.appendChild(this._chargeFill);
    this._root.appendChild(this._chargeBar);

    // Achievement toasts (right side)
    this._achievementContainer = document.createElement("div");
    this._achievementContainer.style.cssText = "position:absolute;top:100px;right:20px;display:flex;flex-direction:column;gap:6px;";
    this._root.appendChild(this._achievementContainer);

    // Screen flash overlay
    this._flashOverlay = document.createElement("div");
    this._flashOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:8;opacity:0;transition:opacity 0.05s;";
    document.body.appendChild(this._flashOverlay);

    // Victory overlay
    this._victoryOverlay = document.createElement("div");
    this._victoryOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:20;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,15,30,0.95);pointer-events:auto;";
    document.body.appendChild(this._victoryOverlay);

    // Achievement gallery overlay
    this._achieveOverlay = document.createElement("div");
    this._achieveOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:25;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(5,10,25,0.95);pointer-events:auto;overflow-y:auto;";
    document.body.appendChild(this._achieveOverlay);

    // Pause overlay
    this._pauseOverlay = document.createElement("div");
    this._pauseOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:20;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(5,15,30,0.85);pointer-events:auto;";
    this._pauseOverlay.innerHTML = `
      <div style="font-size:36px;color:#44ccff;text-shadow:0 0 20px #0066aa;margin-bottom:16px;">PAUSED</div>
      <div style="font-size:13px;color:#7799aa;margin-bottom:20px;text-align:center;max-width:420px;line-height:1.6;font-style:italic;">
        Deep-sea descent into the abyss beneath Avalon. Fight pressure-adapted horrors, manage oxygen, discover ancient ruins on the ocean floor. Recover sunken relics of Camelot.
      </div>
      <div style="font-size:14px;color:#558899;margin-bottom:20px;text-align:center;line-height:1.8;">
        <b>WASD</b> — swim &nbsp; <b>Mouse</b> — look &nbsp; <b>Click/Hold</b> — attack/charge<br>
        <b>Right-click</b> — dash &nbsp; <b>E</b> — harpoon &nbsp; <b>Shift</b> — sprint<br>
        <b>Space</b> — ascend &nbsp; <b>Ctrl</b> — descend
      </div>
      <button id="depths-resume-btn" style="padding:12px 40px;font-size:18px;background:linear-gradient(180deg,#2266aa,#113366);color:#ddeeff;border:2px solid #4488bb;border-radius:6px;cursor:pointer;font-family:inherit;letter-spacing:2px;pointer-events:auto;">RESUME</button>
      <button id="depths-pause-exit-btn" style="margin-top:12px;padding:6px 24px;font-size:13px;background:none;color:#668899;border:1px solid #335566;border-radius:4px;cursor:pointer;font-family:inherit;pointer-events:auto;">EXIT</button>
    `;
    document.body.appendChild(this._pauseOverlay);

    // Current direction indicator
    this._currentIndicator = document.createElement("div");
    this._currentIndicator.style.cssText = "position:absolute;bottom:155px;left:50%;transform:translateX(-50%);font-size:11px;color:#4488aa;text-shadow:0 0 4px #224466;opacity:0.6;text-align:center;";
    this._root.appendChild(this._currentIndicator);

    // Relic inventory (top-left, below bars)
    this._relicPanel = document.createElement("div");
    this._relicPanel.style.cssText = "position:absolute;top:88px;left:20px;display:flex;gap:4px;flex-wrap:wrap;max-width:220px;";
    this._root.appendChild(this._relicPanel);

    // Vignette overlay
    this._vignetteOverlay = document.createElement("div");
    this._vignetteOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9;background:radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0) 100%);transition:background 0.3s;";
    document.body.appendChild(this._vignetteOverlay);

    // --- Overlays ---
    this._menuOverlay = document.createElement("div");
    this._menuOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(5,20,40,0.92);pointer-events:auto;";
    this._menuOverlay.innerHTML = `
      <div style="font-size:48px;color:#44ccff;text-shadow:0 0 30px #0066aa;margin-bottom:8px;letter-spacing:4px;">DEPTHS OF AVALON</div>
      <div style="font-size:16px;color:#6699aa;margin-bottom:40px;max-width:500px;text-align:center;line-height:1.6;">
        Dive beneath the mystical Lake of Avalon. Recover sunken relics of Camelot.<br>
        Beware the creatures that lurk in the deep. Slay bosses to prove your worth.
      </div>
      <div style="font-size:14px;color:#558899;margin-bottom:30px;line-height:1.8;">
        <b>WASD</b> — swim &nbsp; <b>Mouse</b> — look &nbsp; <b>Click</b> — attack &nbsp; <b>Shift</b> — sprint<br>
        <b>Space</b> — ascend &nbsp; <b>Ctrl</b> — descend &nbsp; <b>Esc</b> — pause<br>
        <b>Right-click</b> — dash &nbsp; <b>E</b> — harpoon
      </div>
      <div id="depths-menu-progress" style="font-size:12px;color:#557788;margin-bottom:20px;text-align:center;line-height:1.8;"></div>
      <button id="depths-start-btn" style="padding:14px 50px;font-size:20px;background:linear-gradient(180deg,#2266aa,#113366);color:#ddeeff;border:2px solid #4488bb;border-radius:6px;cursor:pointer;font-family:inherit;letter-spacing:2px;pointer-events:auto;">DIVE</button>
      <div style="display:flex;gap:12px;margin-top:16px;">
        <button id="depths-achieve-menu-btn" style="padding:8px 24px;font-size:14px;background:none;color:#ffdd44;border:1px solid #886622;border-radius:4px;cursor:pointer;font-family:inherit;pointer-events:auto;">ACHIEVEMENTS</button>
        <button id="depths-exit-btn" style="padding:8px 30px;font-size:14px;background:none;color:#668899;border:1px solid #335566;border-radius:4px;cursor:pointer;font-family:inherit;pointer-events:auto;">EXIT</button>
      </div>
    `;
    document.body.appendChild(this._menuOverlay);

    this._shopOverlay = document.createElement("div");
    this._shopOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:20;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(5,20,40,0.92);pointer-events:auto;";
    document.body.appendChild(this._shopOverlay);

    this._gameOverOverlay = document.createElement("div");
    this._gameOverOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:20;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,5,20,0.92);pointer-events:auto;";
    document.body.appendChild(this._gameOverOverlay);
  }

  bindStartButton(onStart: () => void, onResume: () => void, getState: () => DepthsState): void {
    document.getElementById("depths-start-btn")?.addEventListener("click", onStart);
    document.getElementById("depths-exit-btn")?.addEventListener("click", () => { if (this._onExitCb) this._onExitCb(); });
    document.getElementById("depths-resume-btn")?.addEventListener("click", onResume);
    document.getElementById("depths-pause-exit-btn")?.addEventListener("click", () => { if (this._onExitCb) this._onExitCb(); });
    document.getElementById("depths-achieve-menu-btn")?.addEventListener("click", () => this.showAchievements(getState()));
  }

  update(state: DepthsState): void {
    if (state.phase === "menu") {
      this._menuOverlay.style.display = "flex";
      this._shopOverlay.style.display = "none";
      this._gameOverOverlay.style.display = "none";
      // Update progress display
      const prog = document.getElementById("depths-menu-progress");
      if (prog) {
        const lines: string[] = [];
        if (state.bestDepth > 0) lines.push(`Best depth: ${Math.floor(state.bestDepth)}m`);
        if (state.diveCount > 0) lines.push(`Dives: ${state.diveCount}`);
        if (state.bossesSlain > 0) lines.push(`Bosses slain: ${state.bossesSlain}`);
        if (state.unlockedAchievements.size > 0) lines.push(`Achievements: ${state.unlockedAchievements.size}/${DEPTHS.ACHIEVEMENTS.length}`);
        if (state.depthCheckpoint > 0) lines.push(`<span style="color:#44aa66;">Checkpoint: ${state.depthCheckpoint}m</span>`);
        prog.innerHTML = lines.join(" &nbsp;|&nbsp; ");
      }
      return;
    }

    this._menuOverlay.style.display = "none";

    if (state.phase === "shop") {
      this._showShop(state);
      return;
    }

    if (state.phase === "game_over") {
      this._showGameOver(state);
      return;
    }

    if (state.phase === "victory") {
      this._showVictory(state);
      return;
    }

    this._shopOverlay.style.display = "none";
    this._gameOverOverlay.style.display = "none";
    this._victoryOverlay.style.display = "none";

    // Pause overlay
    this._pauseOverlay.style.display = state.paused ? "flex" : "none";
    this._shopRenderedGold = -1;

    // Crosshair feedback
    const ch = this._crosshair;
    const isCharging = state.player.charging && state.player.chargeTimer > 0.15;
    const isAttacking = state.player.attackCooldown > DEPTHS.PLAYER_ATTACK_COOLDOWN * 0.5;
    if (isCharging) {
      const pct = Math.min(state.player.chargeTimer / DEPTHS.CHARGE_TIME, 1);
      const size = 20 + pct * 20;
      ch.style.width = `${size}px`;
      ch.style.height = `${size}px`;
      ch.style.borderColor = pct >= 1 ? "rgba(255,170,34,0.9)" : `rgba(136,204,255,${0.5 + pct * 0.4})`;
      ch.style.borderWidth = `${2 + pct * 2}px`;
    } else if (isAttacking) {
      ch.style.width = "28px";
      ch.style.height = "28px";
      ch.style.borderColor = "rgba(255,200,100,0.7)";
      ch.style.borderWidth = "2px";
    } else {
      ch.style.width = "20px";
      ch.style.height = "20px";
      ch.style.borderColor = "rgba(136,204,255,0.5)";
      ch.style.borderWidth = "2px";
    }
    // Hit marker flash
    const hitMarker = document.getElementById("depths-hit-marker");
    if (hitMarker) {
      hitMarker.style.opacity = state.audioHit || state.audioCritHit ? "1" : "0";
      hitMarker.style.background = state.audioCritHit ? "#ff8800" : "#ffcc00";
    }

    // HP
    const hpPct = state.player.hp / state.player.maxHp;
    this._hpFill.style.width = `${hpPct * 100}%`;
    this._hpFill.style.background = hpPct > 0.3 ? "linear-gradient(90deg,#22aa66,#44cc88)" : "linear-gradient(90deg,#cc2244,#ff4466)";
    this._hpText.textContent = `${Math.ceil(state.player.hp)}/${state.player.maxHp}`;

    // O2
    const o2Pct = state.player.oxygen / state.player.maxOxygen;
    this._o2Fill.style.width = `${o2Pct * 100}%`;
    this._o2Fill.style.background = o2Pct > 0.25 ? "linear-gradient(90deg,#2266cc,#44aaff)" : "linear-gradient(90deg,#cc6622,#ffaa44)";

    if (state.player.oxygen < DEPTHS.OXYGEN_LOW_THRESHOLD) {
      this._o2Bar.style.boxShadow = Math.sin(Date.now() * 0.01) > 0 ? "0 0 12px #ff4444" : "none";
    } else {
      this._o2Bar.style.boxShadow = "none";
    }

    // XP
    this._xpFill.style.width = `${(state.xp / state.xpToNext) * 100}%`;
    this._xpFill.style.background = "linear-gradient(90deg,#886622,#ffcc44)";

    this._depthLabel.textContent = `${Math.floor(state.currentDepth)}m`;
    if (state.endlessMode) {
      this._zoneLabel.textContent = `ENDLESS Wave ${state.endlessWave}`;
      this._zoneLabel.style.color = "#ff88cc";
    } else {
      this._zoneLabel.textContent = DEPTHS.DEPTH_ZONES[state.depthZoneIndex].name;
      this._zoneLabel.style.color = "#66aacc";
    }
    this._levelLabel.textContent = `Lv ${state.level}`;

    // Combo — escalating colors and scale
    if (state.combo.count >= 2) {
      this._comboLabel.style.opacity = "1";
      this._comboLabel.textContent = `${state.combo.count}x`;
      const scale = 1 + Math.min(state.combo.count * 0.08, 0.8);
      // Pulse effect based on timer proximity
      const pulse = state.combo.timer < 1 ? 1 + Math.sin(Date.now() * 0.02) * 0.1 : 1;
      this._comboLabel.style.transform = `translateY(-50%) scale(${scale * pulse})`;
      // Color escalation
      const c = state.combo.count;
      if (c >= 10) { this._comboLabel.style.color = "#ff2244"; this._comboLabel.style.textShadow = "0 0 20px #ff0022, 0 0 40px #aa0011"; }
      else if (c >= 7) { this._comboLabel.style.color = "#ff6622"; this._comboLabel.style.textShadow = "0 0 15px #ff4400"; }
      else if (c >= 5) { this._comboLabel.style.color = "#ffaa22"; this._comboLabel.style.textShadow = "0 0 12px #ff8800"; }
      else if (c >= 3) { this._comboLabel.style.color = "#ff8844"; this._comboLabel.style.textShadow = "0 0 10px #ff4400"; }
      else { this._comboLabel.style.color = "#ff8844"; this._comboLabel.style.textShadow = "0 0 8px #ff4400"; }
    } else {
      this._comboLabel.style.opacity = "0";
    }

    // Ability cooldowns
    const p = state.player;
    const dashPct = p.dashCooldown > 0 ? p.dashCooldown / DEPTHS.DASH_COOLDOWN : 0;
    const harpPct = p.harpoonCooldown > 0 ? p.harpoonCooldown / DEPTHS.HARPOON_COOLDOWN : 0;
    const atkPct = p.attackCooldown > 0 ? p.attackCooldown / DEPTHS.PLAYER_ATTACK_COOLDOWN : 0;

    this._abilityPanel.innerHTML = `
      ${this._abilityIcon("Slash", "LMB", atkPct, "#88ccff")}
      ${this._abilityIcon("Dash", "RMB", dashPct, "#66ccff")}
      ${this._abilityIcon("Harpoon", "E", harpPct, "#aaddff")}
    `;

    // Boss bar + dramatic entrance
    const boss = state.activeBossId !== null
      ? state.enemies.find(e => e.id === state.activeBossId && e.alive)
      : null;
    if (boss) {
      this._bossBar.style.display = "block";
      this._bossName.style.display = "block";
      const bDef = DEPTHS.BOSSES[boss.bossKey];
      const bossName = bDef?.name ?? boss.type;
      this._bossName.textContent = bossName;
      this._bossFill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
      // HP changes bar color at low health
      const bossHpPct = boss.hp / boss.maxHp;
      if (bossHpPct < 0.25) {
        this._bossFill.style.background = "linear-gradient(90deg,#cc2244,#ff4466)";
        this._bossBar.style.borderColor = "#ff4466";
      } else if (bossHpPct < 0.5) {
        this._bossFill.style.background = "linear-gradient(90deg,#cc6622,#ffaa44)";
        this._bossBar.style.borderColor = "#cc6622";
      } else {
        this._bossFill.style.background = "linear-gradient(90deg,#882288,#ff44ff)";
        this._bossBar.style.borderColor = "#882288";
      }
    } else {
      this._bossBar.style.display = "none";
      this._bossName.style.display = "none";
    }

    // Damage indicators
    this._dmgIndicatorContainer.innerHTML = "";
    for (const di of state.damageIndicators) {
      const div = document.createElement("div");
      const r = 80;
      const x = Math.sin(di.angle) * r;
      const y = -Math.cos(di.angle) * r;
      div.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:30px;height:6px;background:rgba(255,50,50,${di.life});transform:translate(-50%,-50%) rotate(${di.angle}rad);border-radius:3px;`;
      this._dmgIndicatorContainer.appendChild(div);
    }

    // Current direction indicator
    const zone = DEPTHS.DEPTH_ZONES[state.depthZoneIndex];
    if (zone.currentStrength > 0.3) {
      const angle = Math.atan2(zone.currentDir.x, zone.currentDir.z) * (180 / Math.PI);
      this._currentIndicator.innerHTML = `<div style="transform:rotate(${angle}deg);font-size:16px;">&#8593;</div><div>current</div>`;
      this._currentIndicator.style.opacity = String(Math.min(0.8, zone.currentStrength * 0.3));
    } else {
      this._currentIndicator.style.opacity = "0";
    }

    // Excalibur compass (shows after defeating Lady of the Lake)
    if (state.bossesDefeated.has("lady_of_the_lake") && !state.excalibur.retrieved && !state.endlessMode) {
      const ex = state.excalibur;
      const dx = ex.x - state.player.x;
      const dz = ex.z - state.player.z;
      const dy = ex.y - state.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const angle = (Math.atan2(dx, dz) - state.player.yaw) * (180 / Math.PI);
      this._currentIndicator.innerHTML = `<div style="transform:rotate(${angle}deg);font-size:18px;color:#ffdd44;">&#9733;</div><div style="color:#ffdd44;">Excalibur ${Math.floor(dist)}m</div>`;
      this._currentIndicator.style.opacity = "0.9";
    }

    // Relics
    this._relicPanel.innerHTML = "";
    for (const key of state.collectedRelics) {
      const def = DEPTHS.RELICS[key];
      if (!def) continue;
      const rarityBorder = def.rarity === "legendary" ? "#ffdd00" : def.rarity === "rare" ? "#4488ff" : "#557788";
      const div = document.createElement("div");
      div.title = `${def.name}: ${def.desc}`;
      div.style.cssText = `width:22px;height:22px;border-radius:4px;border:2px solid ${rarityBorder};background:#${def.color.toString(16).padStart(6, "0")}33;cursor:default;`;
      this._relicPanel.appendChild(div);
    }

    // Vignette
    const v = state.vignetteIntensity;
    if (v > 0.01) {
      const pct = Math.floor(50 - v * 30);
      this._vignetteOverlay.style.background = `radial-gradient(ellipse at center, transparent ${pct}%, rgba(${v > 0.3 ? "80,0,0" : "0,0,0"},${v * 0.8}) 100%)`;
    } else {
      this._vignetteOverlay.style.background = "none";
    }

    // Charge bar
    const p2 = state.player;
    if (p2.charging && p2.chargeTimer > 0.15) {
      this._chargeBar.style.display = "block";
      const pct = Math.min(p2.chargeTimer / DEPTHS.CHARGE_TIME, 1);
      this._chargeFill.style.width = `${pct * 100}%`;
      this._chargeFill.style.background = pct >= 1
        ? "linear-gradient(90deg,#ffaa22,#ffdd44)"
        : "linear-gradient(90deg,#4488cc,#88ccff)";
    } else {
      this._chargeBar.style.display = "none";
    }

    // Achievement toasts
    this._achievementContainer.innerHTML = "";
    for (const t of state.achievementToasts) {
      const div = document.createElement("div");
      div.style.cssText = `background:rgba(20,30,50,0.9);border:1px solid #ffdd44;border-radius:6px;padding:8px 14px;opacity:${Math.min(1, t.life)};`;
      div.innerHTML = `<div style="font-size:13px;color:#ffdd44;">${t.name}</div><div style="font-size:10px;color:#8899aa;">${t.desc}</div>`;
      this._achievementContainer.appendChild(div);
    }

    // Screen flash
    if (state.screenFlash.timer > 0) {
      const alpha = state.screenFlash.timer / state.screenFlash.maxTime;
      this._flashOverlay.style.background = state.screenFlash.color;
      this._flashOverlay.style.opacity = String(alpha);
    } else {
      this._flashOverlay.style.opacity = "0";
    }

    // Momentum display
    if (state.depthMomentumMult > 1.05) {
      this._goldLabel.textContent = `${state.gold}g (x${state.depthMomentumMult.toFixed(1)})`;
    } else {
      this._goldLabel.textContent = `${state.gold}g`;
    }

    // Wave indicator
    if (state.waveActive) {
      this._pressureWarning.textContent = `WAVE: ${Math.ceil(state.waveTimer)}s`;
      this._pressureWarning.style.opacity = "1";
      this._pressureWarning.style.color = "#ff6644";
    } else if (state.currentDepth >= DEPTHS.PRESSURE_START_DEPTH) {
      this._pressureWarning.textContent = "PRESSURE DAMAGE";
      this._pressureWarning.style.opacity = "1";
      this._pressureWarning.style.color = "#ff6644";
    } else {
      this._pressureWarning.style.opacity = "0";
    }

    // Stats
    this._statsPanel.innerHTML = `
      Dive #${state.diveCount} | Kills: ${state.enemiesKilled} | Bosses: ${state.bossesSlain} | Loot: ${state.treasuresFound}<br>
      Best depth: ${Math.floor(state.bestDepth)}m | Combo: ${state.combo.bestStreak}x | Relics: ${state.collectedRelics.size} | Gold: ${state.totalGold}
    `;

    // Notifications
    this._notifContainer.innerHTML = "";
    for (const n of state.notifications) {
      const div = document.createElement("div");
      div.textContent = n.text;
      div.style.cssText = `font-size:18px;color:${n.color};text-shadow:0 0 8px ${n.color};opacity:${Math.min(1, n.life)};margin-bottom:4px;`;
      this._notifContainer.appendChild(div);
    }

    this._drawMinimap(state);
  }

  private _abilityIcon(name: string, key: string, cdPct: number, color: string): string {
    const ready = cdPct <= 0;
    const bg = ready ? "rgba(30,60,80,0.7)" : "rgba(15,25,35,0.7)";
    const border = ready ? color : "#223344";
    const textColor = ready ? color : "#445566";
    const overlay = cdPct > 0 ? `<div style="position:absolute;bottom:0;left:0;width:100%;height:${cdPct * 100}%;background:rgba(0,0,0,0.5);"></div>` : "";
    return `<div style="position:relative;width:50px;height:50px;background:${bg};border:2px solid ${border};border-radius:6px;text-align:center;overflow:hidden;">
      ${overlay}
      <div style="position:relative;z-index:1;font-size:9px;color:${textColor};margin-top:8px;">${name}</div>
      <div style="position:relative;z-index:1;font-size:14px;color:${textColor};font-weight:bold;">${key}</div>
    </div>`;
  }

  private _showShop(state: DepthsState): void {
    this._shopOverlay.style.display = "flex";
    this._gameOverOverlay.style.display = "none";

    // Only re-render when gold changes
    if (this._shopRenderedGold === state.gold) return;
    this._shopRenderedGold = state.gold;

    let html = `<div style="font-size:32px;color:#44ccff;text-shadow:0 0 20px #0066aa;margin-bottom:8px;">SURFACE SHOP</div>`;
    html += `<div style="font-size:18px;color:#ffcc00;margin-bottom:6px;">Gold: ${state.gold}</div>`;

    // Run summary from last dive
    const rs = state.lastRunSummary;
    if (rs) {
      html += `<div style="font-size:12px;color:#88aacc;margin-bottom:4px;padding:8px 16px;background:rgba(20,40,60,0.5);border-radius:4px;border:1px solid #334455;">`;
      html += `Last dive: ${rs.depth}m | ${rs.kills} kills | ${rs.gold}g earned | ${Math.floor(rs.time)}s`;
      if (rs.relics.length > 0) html += ` | ${rs.relics.length} relics`;
      if (rs.bossesKilled.length > 0) html += ` | ${rs.bossesKilled.length} bosses`;
      html += `</div>`;
    }
    html += `<div style="font-size:11px;color:#557788;margin-bottom:12px;">Best: ${Math.floor(state.bestDepth)}m | Achievements: ${state.unlockedAchievements.size}/${DEPTHS.ACHIEVEMENTS.length} | Dives: ${state.diveCount}</div>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;max-width:700px;">`;

    for (const [key, def] of Object.entries(DEPTHS.UPGRADES)) {
      const lvl = state.upgrades[key as keyof typeof state.upgrades];
      const cost = Math.floor(def.baseCost * Math.pow(def.costMult, lvl));
      const maxed = lvl >= def.maxLevel;
      const canBuy = state.gold >= cost && !maxed;
      const desc = UPGRADE_DESCS[key] ?? "";
      const currentEffect = lvl > 0 ? `Current: +${(lvl * def.effect).toFixed(1)}` : "";
      html += `<div style="background:rgba(20,40,60,0.8);border:1px solid ${canBuy ? "#4488aa" : "#223344"};border-radius:6px;padding:10px 14px;width:170px;text-align:center;">
        <div style="font-size:13px;color:#88bbcc;">${def.name}</div>
        <div style="font-size:10px;color:#4d7788;margin:2px 0;">${desc}</div>
        <div style="font-size:11px;color:#668899;margin:2px 0;">Lv ${lvl}/${def.maxLevel} ${currentEffect ? `<span style="color:#66aa88;">${currentEffect}</span>` : ""}</div>
        ${maxed
          ? `<div style="font-size:12px;color:#44aa66;margin-top:4px;">MAXED</div>`
          : `<button class="depths-buy-btn" data-key="${key}" style="margin-top:4px;padding:5px 14px;font-size:13px;background:${canBuy ? "#225588" : "#1a2233"};color:${canBuy ? "#ddeeff" : "#445566"};border:1px solid ${canBuy ? "#4488bb" : "#223344"};border-radius:4px;cursor:${canBuy ? "pointer" : "default"};font-family:inherit;pointer-events:auto;">${cost}g</button>`
        }
      </div>`;
    }

    html += `</div>`;

    // Curse selection
    html += `<div style="margin-top:16px;font-size:13px;color:#aa6644;margin-bottom:6px;">CURSES (optional — more risk, more reward)</div>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:600px;margin-bottom:12px;">`;
    for (const curse of DEPTHS.CURSES) {
      const active = state.activeCurses.has(curse.id);
      html += `<button class="depths-curse-btn" data-id="${curse.id}" style="padding:5px 12px;font-size:11px;background:${active ? "#442222" : "#1a1a22"};color:${active ? curse.color : "#556666"};border:1px solid ${active ? curse.color : "#333344"};border-radius:4px;cursor:pointer;font-family:inherit;pointer-events:auto;">${active ? "✓ " : ""}${curse.name} (x${curse.rewardMult})</button>`;
    }
    html += `</div>`;

    html += `<div style="display:flex;gap:12px;margin-top:8px;align-items:center;">`;
    html += `<button id="depths-dive-btn" style="padding:12px 40px;font-size:18px;background:linear-gradient(180deg,#2266aa,#113366);color:#ddeeff;border:2px solid #4488bb;border-radius:6px;cursor:pointer;font-family:inherit;letter-spacing:2px;pointer-events:auto;">DIVE (surface)</button>`;
    if (state.depthCheckpoint > 0) {
      html += `<button id="depths-checkpoint-btn" style="padding:12px 30px;font-size:16px;background:linear-gradient(180deg,#226644,#113322);color:#88ffaa;border:2px solid #44aa66;border-radius:6px;cursor:pointer;font-family:inherit;letter-spacing:1px;pointer-events:auto;">DIVE (${state.depthCheckpoint}m)</button>`;
    }
    html += `</div>`;
    html += `<div style="display:flex;gap:10px;margin-top:10px;">`;
    html += `<button id="depths-achieve-shop-btn" style="padding:6px 20px;font-size:13px;background:none;color:#ffdd44;border:1px solid #886622;border-radius:4px;cursor:pointer;font-family:inherit;pointer-events:auto;">ACHIEVEMENTS</button>`;
    html += `<button id="depths-shop-exit-btn" style="padding:6px 24px;font-size:13px;background:none;color:#668899;border:1px solid #335566;border-radius:4px;cursor:pointer;font-family:inherit;pointer-events:auto;">EXIT</button>`;
    html += `</div>`;

    this._shopOverlay.innerHTML = html;

    this._shopOverlay.querySelectorAll(".depths-buy-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = (btn as HTMLElement).dataset.key!;
        buyUpgrade(state, key);
        this._shopRenderedGold = -1;
      });
    });

    this._shopOverlay.querySelectorAll(".depths-curse-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).dataset.id!;
        if (state.activeCurses.has(id)) state.activeCurses.delete(id);
        else state.activeCurses.add(id);
        this._shopRenderedGold = -1; // force re-render
      });
    });

    document.getElementById("depths-dive-btn")?.addEventListener("click", () => {
      startDive(state, false);
      this._shopOverlay.style.display = "none";
    });

    document.getElementById("depths-checkpoint-btn")?.addEventListener("click", () => {
      startDive(state, true);
      this._shopOverlay.style.display = "none";
    });

    document.getElementById("depths-shop-exit-btn")?.addEventListener("click", () => {
      if (this._onExitCb) this._onExitCb();
    });

    document.getElementById("depths-achieve-shop-btn")?.addEventListener("click", () => {
      this.showAchievements(state);
    });
  }

  private _showGameOver(state: DepthsState): void {
    this._gameOverOverlay.style.display = "flex";
    this._shopOverlay.style.display = "none";

    this._gameOverOverlay.innerHTML = `
      <div style="font-size:36px;color:#ff4466;text-shadow:0 0 20px #aa2244;margin-bottom:12px;">LOST TO THE DEPTHS</div>
      <div style="font-size:16px;color:#6699aa;margin-bottom:20px;text-align:center;line-height:1.8;">
        ${state.deathCause ? `<span style="color:#aa6666;">${state.deathCause}</span><br><br>` : ""}
        Reached: ${Math.floor(state.maxDepthReached)}m | Level: ${state.level}<br>
        Enemies slain: ${state.enemiesKilled} | Bosses: ${state.bossesSlain}<br>
        Treasures: ${state.treasuresFound} | Best combo: ${state.combo.bestStreak}x<br>
        Gold earned: ${state.totalGold}
        ${state.collectedRelics.size > 0 ? `<br><br><span style="color:#88aacc;">Relics found:</span> ${Array.from(state.collectedRelics).map(k => { const d = DEPTHS.RELICS[k]; return d ? `<span style="color:#${d.color.toString(16).padStart(6,"0")}">${d.name}</span>` : k; }).join(", ")}` : ""}
      </div>
      <div style="display:flex;gap:12px;">
        <button id="depths-retry-btn" style="padding:12px 40px;font-size:18px;background:linear-gradient(180deg,#2266aa,#113366);color:#ddeeff;border:2px solid #4488bb;border-radius:6px;cursor:pointer;font-family:inherit;letter-spacing:2px;pointer-events:auto;">DIVE (surface)</button>
        ${state.depthCheckpoint > 0 ? `<button id="depths-retry-cp-btn" style="padding:12px 30px;font-size:16px;background:linear-gradient(180deg,#226644,#113322);color:#88ffaa;border:2px solid #44aa66;border-radius:6px;cursor:pointer;font-family:inherit;pointer-events:auto;">DIVE (${state.depthCheckpoint}m)</button>` : ""}
      </div>
      <button id="depths-go-exit-btn" style="margin-top:12px;padding:6px 24px;font-size:13px;background:none;color:#668899;border:1px solid #335566;border-radius:4px;cursor:pointer;font-family:inherit;pointer-events:auto;">EXIT</button>
    `;

    document.getElementById("depths-retry-btn")?.addEventListener("click", () => {
      startDive(state, false);
      this._gameOverOverlay.style.display = "none";
    });

    document.getElementById("depths-retry-cp-btn")?.addEventListener("click", () => {
      startDive(state, true);
      this._gameOverOverlay.style.display = "none";
    });

    document.getElementById("depths-go-exit-btn")?.addEventListener("click", () => {
      if (this._onExitCb) this._onExitCb();
    });
  }

  private _showVictory(state: DepthsState): void {
    this._victoryOverlay.style.display = "flex";
    this._shopOverlay.style.display = "none";
    this._gameOverOverlay.style.display = "none";

    const ach = state.unlockedAchievements.size;
    const total = DEPTHS.ACHIEVEMENTS.length;

    this._victoryOverlay.innerHTML = `
      <div style="font-size:52px;color:#ffdd44;text-shadow:0 0 40px #ffaa00;margin-bottom:4px;letter-spacing:6px;">EXCALIBUR</div>
      <div style="font-size:20px;color:#aaccdd;margin-bottom:30px;">You have retrieved the legendary sword from the depths of Avalon.</div>
      <div style="font-size:16px;color:#6699aa;margin-bottom:20px;text-align:center;line-height:2;">
        Depth reached: ${Math.floor(state.maxDepthReached)}m<br>
        Enemies slain: ${state.enemiesKilled} | Bosses: ${state.bossesSlain}<br>
        Treasures: ${state.treasuresFound}<br>
        ${state.collectedRelics.size > 0 ? `Relics: ${Array.from(state.collectedRelics).map(k => { const d = DEPTHS.RELICS[k]; return d ? d.name : k; }).join(", ")}<br>` : ""}
        Best combo: ${state.combo.bestStreak}x | Gold: ${state.totalGold}<br>
        Dives: ${state.diveCount} | Level: ${state.level}<br>
        Achievements: ${ach}/${total}
      </div>
      <div style="font-size:14px;color:#557788;margin-bottom:24px;font-style:italic;">"The sword chooses the knight. You have proven worthy."</div>
      <div style="display:flex;gap:12px;">
        <button id="depths-endless-btn" style="padding:14px 40px;font-size:18px;background:linear-gradient(180deg,#662244,#331122);color:#ff88cc;border:2px solid #aa4488;border-radius:6px;cursor:pointer;font-family:inherit;letter-spacing:2px;pointer-events:auto;">ENDLESS MODE</button>
        <button id="depths-victory-exit-btn" style="padding:14px 40px;font-size:18px;background:linear-gradient(180deg,#886622,#443311);color:#ffdd88;border:2px solid #bbaa44;border-radius:6px;cursor:pointer;font-family:inherit;letter-spacing:2px;pointer-events:auto;">RETURN</button>
      </div>
    `;

    document.getElementById("depths-endless-btn")?.addEventListener("click", () => {
      state.endlessMode = true;
      state.endlessWave = 1;
      startDive(state, true);
      this._victoryOverlay.style.display = "none";
    });

    document.getElementById("depths-victory-exit-btn")?.addEventListener("click", () => {
      if (this._onExitCb) this._onExitCb();
    });
  }

  showAchievements(state: DepthsState): void {
    this._achieveOverlay.style.display = "flex";
    let html = `<div style="font-size:28px;color:#ffdd44;text-shadow:0 0 15px #ffaa00;margin:20px 0 15px;">ACHIEVEMENTS</div>`;
    html += `<div style="font-size:13px;color:#668899;margin-bottom:20px;">${state.unlockedAchievements.size} / ${DEPTHS.ACHIEVEMENTS.length} unlocked</div>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:650px;margin-bottom:20px;">`;

    for (const ach of DEPTHS.ACHIEVEMENTS) {
      const unlocked = state.unlockedAchievements.has(ach.id);
      const border = unlocked ? "#ffdd44" : "#223344";
      const bg = unlocked ? "rgba(40,35,15,0.8)" : "rgba(15,20,30,0.8)";
      const nameColor = unlocked ? "#ffdd44" : "#445566";
      const descColor = unlocked ? "#aabb88" : "#334455";
      const iconColor = unlocked ? "#ffdd44" : "#334455";
      html += `<div style="background:${bg};border:1px solid ${border};border-radius:6px;padding:10px 12px;width:180px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:20px;color:${iconColor};">${ach.icon}</span>
          <div>
            <div style="font-size:12px;color:${nameColor};font-weight:bold;">${ach.name}</div>
            <div style="font-size:10px;color:${descColor};margin-top:2px;">${ach.desc}</div>
          </div>
        </div>
      </div>`;
    }

    html += `</div>`;
    html += `<button id="depths-achieve-close" style="padding:10px 30px;font-size:16px;background:linear-gradient(180deg,#2266aa,#113366);color:#ddeeff;border:2px solid #4488bb;border-radius:6px;cursor:pointer;font-family:inherit;pointer-events:auto;margin-bottom:20px;">CLOSE</button>`;
    this._achieveOverlay.innerHTML = html;

    document.getElementById("depths-achieve-close")?.addEventListener("click", () => {
      this._achieveOverlay.style.display = "none";
    });
  }

  private _drawMinimap(state: DepthsState): void {
    const ctx = this._minimapCtx;
    const w = 120, h = 120;
    const scale = w / (DEPTHS.WORLD_RADIUS * 2);
    const cx = w / 2, cy = h / 2;

    ctx.fillStyle = "rgba(5,20,35,0.85)";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "#224455";
    ctx.beginPath();
    ctx.arc(cx, cy, DEPTHS.WORLD_RADIUS * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Enemies
    for (const e of state.enemies) {
      if (!e.alive) continue;
      ctx.fillStyle = e.isBoss ? "#ff44ff" : "#ff4466";
      const ex = cx + e.x * scale;
      const ey = cy + e.z * scale;
      const s = e.isBoss ? 4 : 2;
      ctx.fillRect(ex - s / 2, ey - s / 2, s, s);
    }

    ctx.fillStyle = "#ffcc00";
    for (const t of state.treasures) {
      if (t.collected) continue;
      ctx.fillRect(cx + t.x * scale - 1, cy + t.z * scale - 1, 3, 3);
    }

    ctx.fillStyle = "#44ddff";
    for (const b of state.airBubbles) {
      if (!b.alive) continue;
      ctx.fillRect(cx + b.x * scale - 1, cy + b.z * scale - 1, 3, 3);
    }

    // Whirlpools (blue circles)
    ctx.strokeStyle = "#4466aa";
    ctx.lineWidth = 1;
    for (const w of state.whirlpools) {
      const wx = cx + w.x * scale;
      const wy = cy + w.z * scale;
      ctx.beginPath();
      ctx.arc(wx, wy, w.radius * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Relics (diamond markers)
    for (const r of state.relics) {
      if (r.collected) continue;
      const def = DEPTHS.RELICS[r.key];
      ctx.fillStyle = def?.rarity === "legendary" ? "#ffdd00" : def?.rarity === "rare" ? "#4488ff" : "#88ccaa";
      const rx = cx + r.x * scale;
      const ry = cy + r.z * scale;
      ctx.beginPath();
      ctx.moveTo(rx, ry - 3); ctx.lineTo(rx + 2, ry); ctx.lineTo(rx, ry + 3); ctx.lineTo(rx - 2, ry);
      ctx.closePath();
      ctx.fill();
    }

    // Jellyfish (small cyan dots)
    ctx.fillStyle = "rgba(68,170,221,0.5)";
    for (const jf of state.jellyfish) {
      ctx.fillRect(cx + jf.x * scale - 1, cy + jf.z * scale - 1, 2, 2);
    }

    // Excalibur (bright star)
    if (state.bossesDefeated.has("lady_of_the_lake") && !state.excalibur.retrieved) {
      const ex = state.excalibur;
      const rx = cx + ex.x * scale;
      const ry = cy + ex.z * scale;
      ctx.fillStyle = "#ffdd44";
      ctx.beginPath();
      ctx.arc(rx, ry, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffaa00";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Player
    const px = cx + state.player.x * scale;
    const py = cy + state.player.z * scale;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#88ccff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.sin(state.player.yaw) * 8, py + Math.cos(state.player.yaw) * 8);
    ctx.stroke();
  }

  private _makeBar(x: number, y: number, w: number, h: number, bgColor: string): HTMLDivElement {
    const bar = document.createElement("div");
    bar.style.cssText = `position:absolute;top:${y}px;left:${x}px;width:${w}px;height:${h}px;background:${bgColor};border:1px solid #335566;border-radius:3px;overflow:hidden;`;
    const fill = document.createElement("div");
    fill.style.cssText = `width:100%;height:100%;border-radius:3px;transition:width 0.1s;`;
    bar.appendChild(fill);
    return bar;
  }

  cleanup(): void {
    if (this._root.parentElement) this._root.parentElement.removeChild(this._root);
    if (this._menuOverlay.parentElement) this._menuOverlay.parentElement.removeChild(this._menuOverlay);
    if (this._shopOverlay.parentElement) this._shopOverlay.parentElement.removeChild(this._shopOverlay);
    if (this._gameOverOverlay.parentElement) this._gameOverOverlay.parentElement.removeChild(this._gameOverOverlay);
    if (this._vignetteOverlay.parentElement) this._vignetteOverlay.parentElement.removeChild(this._vignetteOverlay);
    if (this._flashOverlay.parentElement) this._flashOverlay.parentElement.removeChild(this._flashOverlay);
    if (this._victoryOverlay.parentElement) this._victoryOverlay.parentElement.removeChild(this._victoryOverlay);
    if (this._pauseOverlay.parentElement) this._pauseOverlay.parentElement.removeChild(this._pauseOverlay);
    if (this._achieveOverlay.parentElement) this._achieveOverlay.parentElement.removeChild(this._achieveOverlay);
  }
}
