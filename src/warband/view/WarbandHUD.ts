// ---------------------------------------------------------------------------
// Warband mode – HUD overlay (HTML-based, overlaid on Three.js canvas)
// Shows HP, stamina, crosshair, direction indicator, team status, ammo, gold
// ---------------------------------------------------------------------------

import {
  type WarbandState,
  type WarbandFighter,
  BattleType,
  CombatDirection,
  FighterCombatState,
  WarbandPhase,
  CameraMode,
  vec3DistXZ,
} from "../state/WarbandState";
import { WB } from "../config/WarbandBalanceConfig";

export class WarbandHUD {
  private _container!: HTMLDivElement;
  private _crosshair!: HTMLDivElement;
  private _hpBar!: HTMLDivElement;
  private _hpFill!: HTMLDivElement;
  private _hpLabel!: HTMLDivElement;
  private _staminaBar!: HTMLDivElement;
  private _staminaFill!: HTMLDivElement;
  private _staminaLabel!: HTMLDivElement;
  private _dirIndicator!: HTMLDivElement;
  private _teamStatus!: HTMLDivElement;
  private _ammoDisplay!: HTMLDivElement;
  private _goldDisplay!: HTMLDivElement;
  private _killFeed!: HTMLDivElement;
  private _centerMsg!: HTMLDivElement;
  private _controlsHint!: HTMLDivElement;
  private _lootPrompt!: HTMLDivElement;
  private _mountPrompt!: HTMLDivElement;
  private _horseHpBar!: HTMLDivElement;
  private _horseHpFill!: HTMLDivElement;
  private _horseHpLabel!: HTMLDivElement;
  private _siegeCapture!: HTMLDivElement;
  private _siegeCaptureFill!: HTMLDivElement;
  private _siegeCaptureLabel!: HTMLDivElement;
  private _siegeTimer!: HTMLDivElement;
  private _fleeContainer!: HTMLDivElement;
  private _fleeTimerBar!: HTMLDivElement;
  private _fleeTimerFill!: HTMLDivElement;
  private _fleeTimerLabel!: HTMLDivElement;
  private _fleeButton!: HTMLButtonElement;

  private _killFeedEntries: { text: string; time: number }[] = [];

  /** External callback invoked when the player clicks the FLEE button */
  onFlee: (() => void) | null = null;

  init(): void {
    this._container = document.createElement("div");
    this._container.id = "warband-hud";
    this._container.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 20; pointer-events: none;
      font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
      color: white; user-select: none;
    `;

    // Inject keyframe animations
    const style = document.createElement("style");
    style.textContent = `
      @keyframes wbHudPulse { 0%,100%{opacity:0.7} 50%{opacity:1} }
      @keyframes wbHudSlideIn { from{transform:translateX(30px);opacity:0} to{transform:translateX(0);opacity:1} }
      @keyframes wbHudFadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      @keyframes wbCrosshairPulse { 0%,100%{box-shadow:0 0 4px rgba(255,80,80,0.5)} 50%{box-shadow:0 0 8px rgba(255,80,80,0.9)} }
    `;
    this._container.appendChild(style);

    // Crosshair — refined circular design
    this._crosshair = document.createElement("div");
    this._crosshair.style.cssText = `
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 28px; height: 28px;
    `;
    this._crosshair.innerHTML = `
      <div style="position:absolute;top:50%;left:2px;right:2px;height:1px;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.6) 30%,rgba(255,255,255,0) 45%,rgba(255,255,255,0) 55%,rgba(255,255,255,0.6) 70%,rgba(255,255,255,0) 100%);transform:translateY(-50%)"></div>
      <div style="position:absolute;left:50%;top:2px;bottom:2px;width:1px;background:linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.6) 30%,rgba(255,255,255,0) 45%,rgba(255,255,255,0) 55%,rgba(255,255,255,0.6) 70%,rgba(255,255,255,0) 100%);transform:translateX(-50%)"></div>
      <div style="position:absolute;top:50%;left:50%;width:5px;height:5px;border:1px solid rgba(255,100,100,0.8);border-radius:50%;transform:translate(-50%,-50%);animation:wbCrosshairPulse 2s ease infinite"></div>
    `;
    this._container.appendChild(this._crosshair);

    // HP Bar — gradient fill with label
    const hpResult = this._makeBar(
      "bottom: 64px; left: 50%; transform: translateX(-50%); width: 320px;",
      "linear-gradient(90deg, #22aa44, #33cc55)",
      18,
    );
    this._hpBar = hpResult.bar;
    this._hpFill = hpResult.fill;
    this._hpLabel = hpResult.label;
    this._container.appendChild(this._hpBar);

    // Stamina bar
    const stamResult = this._makeBar(
      "bottom: 42px; left: 50%; transform: translateX(-50%); width: 260px;",
      "linear-gradient(90deg, #3377bb, #55aaee)",
      14,
    );
    this._staminaBar = stamResult.bar;
    this._staminaFill = stamResult.fill;
    this._staminaLabel = stamResult.label;
    this._container.appendChild(this._staminaBar);

    // Direction indicator (shows which direction you're attacking/blocking)
    this._dirIndicator = document.createElement("div");
    this._dirIndicator.style.cssText = `
      position: absolute; bottom: 105px; left: 50%;
      transform: translateX(-50%);
      width: 88px; height: 88px;
    `;
    this._container.appendChild(this._dirIndicator);

    // Team status (top left) — framed panel
    this._teamStatus = document.createElement("div");
    this._teamStatus.style.cssText = `
      position: absolute; top: 16px; left: 16px;
      font-size: 13px;
      background: linear-gradient(135deg, rgba(8,6,4,0.85) 0%, rgba(15,12,8,0.8) 100%);
      border: 1px solid rgba(218,165,32,0.25);
      border-radius: 6px;
      padding: 12px 16px;
      min-width: 150px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,220,140,0.06);
    `;
    this._container.appendChild(this._teamStatus);

    // Ammo (bottom right) — styled with icon
    this._ammoDisplay = document.createElement("div");
    this._ammoDisplay.style.cssText = `
      position: absolute; bottom: 64px; right: 24px;
      font-size: 18px; font-weight: bold;
      text-shadow: 0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5);
      background: linear-gradient(135deg, rgba(8,6,4,0.8) 0%, rgba(15,12,8,0.75) 100%);
      border: 1px solid rgba(255,200,100,0.2);
      border-radius: 6px;
      padding: 8px 14px;
      color: #f0e0c0;
    `;
    this._container.appendChild(this._ammoDisplay);

    // Gold (top right) — ornate display
    this._goldDisplay = document.createElement("div");
    this._goldDisplay.style.cssText = `
      position: absolute; top: 16px; right: 24px;
      font-size: 16px; font-weight: bold;
      text-shadow: 0 0 8px rgba(218,165,32,0.3), 0 1px 3px rgba(0,0,0,0.8);
      color: #ffd700;
      background: linear-gradient(135deg, rgba(8,6,4,0.85) 0%, rgba(15,12,8,0.8) 100%);
      border: 1px solid rgba(218,165,32,0.3);
      border-radius: 6px;
      padding: 8px 14px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,220,140,0.08);
    `;
    this._container.appendChild(this._goldDisplay);

    // Kill feed (top right, below gold) — styled entries
    this._killFeed = document.createElement("div");
    this._killFeed.style.cssText = `
      position: absolute; top: 56px; right: 24px;
      font-size: 12px;
      max-width: 300px;
    `;
    this._container.appendChild(this._killFeed);

    // Center message — dramatic styling
    this._centerMsg = document.createElement("div");
    this._centerMsg.style.cssText = `
      position: absolute; top: 25%; left: 50%;
      transform: translate(-50%, -50%);
      font-size: 40px; font-weight: bold;
      letter-spacing: 4px;
      text-shadow: 0 0 20px rgba(218,165,32,0.5), 0 2px 8px rgba(0,0,0,0.9);
      color: #ffd700;
      opacity: 0; transition: opacity 0.4s ease;
    `;
    this._container.appendChild(this._centerMsg);

    // Controls hint — subtle bottom bar
    this._controlsHint = document.createElement("div");
    this._controlsHint.style.cssText = `
      position: absolute; bottom: 6px; left: 50%;
      transform: translateX(-50%);
      font-size: 10px; opacity: 0.35;
      text-shadow: 0 1px 2px rgba(0,0,0,0.9);
      letter-spacing: 0.5px;
      color: #c0b8a0;
      background: linear-gradient(90deg, transparent, rgba(0,0,0,0.3), transparent);
      padding: 4px 20px;
      border-radius: 3px;
    `;
    this._controlsHint.textContent = "WASD: Move | Arrows: Attack | RMB: Block | F: Loot | B: Mount | V: Camera | ESC: Menu";
    this._container.appendChild(this._controlsHint);

    // Loot prompt — golden themed
    this._lootPrompt = document.createElement("div");
    this._lootPrompt.style.cssText = `
      position: absolute; bottom: 150px; left: 50%;
      transform: translateX(-50%);
      font-size: 14px; font-weight: bold;
      text-shadow: 0 1px 4px rgba(0,0,0,0.9);
      color: #ffd700; display: none;
      background: linear-gradient(135deg, rgba(20,16,8,0.88) 0%, rgba(10,8,4,0.85) 100%);
      padding: 8px 20px;
      border: 1px solid rgba(218,165,32,0.4);
      border-radius: 6px;
      box-shadow: 0 0 12px rgba(218,165,32,0.15), 0 2px 8px rgba(0,0,0,0.5);
      animation: wbHudFadeIn 0.2s ease;
    `;
    this._container.appendChild(this._lootPrompt);

    // Mount prompt — blue themed
    this._mountPrompt = document.createElement("div");
    this._mountPrompt.style.cssText = `
      position: absolute; bottom: 185px; left: 50%;
      transform: translateX(-50%);
      font-size: 14px; font-weight: bold;
      text-shadow: 0 1px 4px rgba(0,0,0,0.9);
      color: #88ccff; display: none;
      background: linear-gradient(135deg, rgba(8,12,20,0.88) 0%, rgba(4,8,15,0.85) 100%);
      padding: 8px 20px;
      border: 1px solid rgba(136,204,255,0.35);
      border-radius: 6px;
      box-shadow: 0 0 12px rgba(136,204,255,0.12), 0 2px 8px rgba(0,0,0,0.5);
      animation: wbHudFadeIn 0.2s ease;
    `;
    this._container.appendChild(this._mountPrompt);

    // Horse HP bar (above player HP bar)
    const horseResult = this._makeBar(
      "bottom: 86px; left: 50%; transform: translateX(-50%); width: 220px;",
      "linear-gradient(90deg, #aa6600, #cc8800)",
      12,
    );
    this._horseHpBar = horseResult.bar;
    this._horseHpFill = horseResult.fill;
    this._horseHpLabel = horseResult.label;
    this._horseHpBar.style.display = "none";
    this._container.appendChild(this._horseHpBar);

    // Siege capture progress (top centre) — ornate bar
    this._siegeCapture = document.createElement("div");
    this._siegeCapture.style.cssText = `
      position: absolute; top: 16px; left: 50%;
      transform: translateX(-50%);
      width: 340px; height: 28px;
      background: linear-gradient(180deg, rgba(15,12,8,0.9) 0%, rgba(8,6,4,0.85) 100%);
      border: 2px solid rgba(255,170,0,0.5);
      border-radius: 6px; overflow: hidden;
      display: none;
      box-shadow: 0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,200,100,0.08);
    `;
    this._siegeCaptureFill = document.createElement("div");
    this._siegeCaptureFill.style.cssText = `
      width: 0%; height: 100%;
      background: linear-gradient(90deg, #cc5500, #ff8800, #ffaa00);
      transition: width 0.2s;
      box-shadow: 0 0 10px rgba(255,136,0,0.3);
    `;
    this._siegeCapture.appendChild(this._siegeCaptureFill);
    this._siegeCaptureLabel = document.createElement("div");
    this._siegeCaptureLabel.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: bold;
      text-shadow: 0 1px 3px rgba(0,0,0,0.9);
      letter-spacing: 1px;
    `;
    this._siegeCapture.appendChild(this._siegeCaptureLabel);
    this._container.appendChild(this._siegeCapture);

    // Siege timer (below capture bar)
    this._siegeTimer = document.createElement("div");
    this._siegeTimer.style.cssText = `
      position: absolute; top: 50px; left: 50%;
      transform: translateX(-50%);
      font-size: 18px; font-weight: bold;
      text-shadow: 0 0 8px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.9);
      color: #e0d5c0; display: none;
      letter-spacing: 2px;
    `;
    this._container.appendChild(this._siegeTimer);

    // Flee container (timer bar + button, shown when player is at map edge)
    this._fleeContainer = document.createElement("div");
    this._fleeContainer.style.cssText = `
      position: absolute; bottom: 210px; left: 50%;
      transform: translateX(-50%);
      display: none; flex-direction: column; align-items: center; gap: 8px;
    `;

    // Flee progress bar
    this._fleeTimerBar = document.createElement("div");
    this._fleeTimerBar.style.cssText = `
      width: 220px; height: 14px;
      background: linear-gradient(180deg, rgba(15,12,8,0.85) 0%, rgba(8,6,4,0.8) 100%);
      border: 1px solid rgba(255,136,0,0.4);
      border-radius: 4px; overflow: hidden;
      box-shadow: 0 1px 6px rgba(0,0,0,0.4);
    `;
    this._fleeTimerFill = document.createElement("div");
    this._fleeTimerFill.style.cssText = `
      width: 0%; height: 100%;
      background: linear-gradient(90deg, #993300, #cc6600, #ff8800);
      transition: width 0.2s;
      box-shadow: 0 0 6px rgba(255,136,0,0.3);
    `;
    this._fleeTimerBar.appendChild(this._fleeTimerFill);
    this._fleeContainer.appendChild(this._fleeTimerBar);

    this._fleeTimerLabel = document.createElement("div");
    this._fleeTimerLabel.style.cssText = `
      font-size: 12px; color: #ff8800;
      text-shadow: 0 1px 4px rgba(0,0,0,0.9);
      letter-spacing: 1px;
    `;
    this._fleeTimerLabel.textContent = "Retreating...";
    this._fleeContainer.appendChild(this._fleeTimerLabel);

    // Flee button (only clickable when timer is full)
    this._fleeButton = document.createElement("button");
    this._fleeButton.textContent = "FLEE";
    this._fleeButton.style.cssText = `
      pointer-events: auto; cursor: pointer;
      padding: 10px 36px; font-size: 16px; font-weight: bold;
      font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
      color: #fff;
      background: linear-gradient(180deg, rgba(200,90,0,0.9) 0%, rgba(150,60,0,0.85) 100%);
      border: 2px solid #ff8800; border-radius: 6px;
      text-shadow: 0 1px 3px rgba(0,0,0,0.7);
      letter-spacing: 2px;
      display: none;
      transition: all 0.2s ease;
      box-shadow: 0 2px 10px rgba(255,136,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
    `;
    this._fleeButton.addEventListener("mouseenter", () => {
      this._fleeButton.style.background = "linear-gradient(180deg, rgba(240,110,0,0.95) 0%, rgba(180,80,0,0.9) 100%)";
      this._fleeButton.style.boxShadow = "0 2px 16px rgba(255,136,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)";
    });
    this._fleeButton.addEventListener("mouseleave", () => {
      this._fleeButton.style.background = "linear-gradient(180deg, rgba(200,90,0,0.9) 0%, rgba(150,60,0,0.85) 100%)";
      this._fleeButton.style.boxShadow = "0 2px 10px rgba(255,136,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)";
    });
    this._fleeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.onFlee) this.onFlee();
    });
    this._fleeContainer.appendChild(this._fleeButton);
    this._container.appendChild(this._fleeContainer);

    const pixiContainer = document.getElementById("pixi-container");
    if (pixiContainer) {
      pixiContainer.appendChild(this._container);
    }
  }

  private _makeBar(
    posStyle: string,
    gradient: string,
    height = 16,
  ): { bar: HTMLDivElement; fill: HTMLDivElement; label: HTMLDivElement } {
    const bar = document.createElement("div");
    bar.style.cssText = `
      position: absolute; ${posStyle}
      height: ${height}px;
      background: linear-gradient(180deg, rgba(15,12,8,0.85) 0%, rgba(8,6,4,0.8) 100%);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 4px; overflow: hidden;
      box-shadow: 0 1px 6px rgba(0,0,0,0.5), inset 0 1px 3px rgba(0,0,0,0.4);
    `;
    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.cssText = `
      width: 100%; height: 100%;
      background: ${gradient};
      transition: width 0.15s ease;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.2);
    `;
    bar.appendChild(fill);
    const label = document.createElement("div");
    label.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-size: ${Math.max(9, height - 5)}px; font-weight: bold;
      text-shadow: 0 1px 2px rgba(0,0,0,0.9);
      pointer-events: none; letter-spacing: 0.5px;
    `;
    bar.appendChild(label);
    return { bar, fill, label };
  }

  update(state: WarbandState): void {
    if (state.phase !== WarbandPhase.BATTLE) {
      this._container.style.display = "none";
      return;
    }
    this._container.style.display = "block";

    const player = state.fighters.find((f) => f.id === state.playerId);
    if (!player) return;

    // HP
    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    this._hpFill.style.width = `${hpPct}%`;
    if (hpPct < 25) {
      this._hpFill.style.background = "linear-gradient(90deg, #aa1111, #cc2222)";
      this._hpFill.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.2), 0 0 8px rgba(204,34,34,0.4)";
    } else if (hpPct < 50) {
      this._hpFill.style.background = "linear-gradient(90deg, #bb9911, #ccaa22)";
      this._hpFill.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.2)";
    } else {
      this._hpFill.style.background = "linear-gradient(90deg, #22aa44, #33cc55)";
      this._hpFill.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.2)";
    }
    this._hpLabel.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

    // Stamina
    const stamPct = Math.max(0, (player.stamina / player.maxStamina) * 100);
    this._staminaFill.style.width = `${stamPct}%`;
    this._staminaLabel.textContent = `${Math.ceil(player.stamina)}`;

    // Direction indicator
    this._updateDirectionIndicator(player);

    // Team status — framed panel
    const fleeingAllies = state.moraleEnabled
      ? state.fighters.filter(f => f.team === player.team && f.fleeing && f.combatState !== FighterCombatState.DEAD).length
      : 0;
    const moraleInfo = state.moraleEnabled
      ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(218,165,32,0.15);">
          <span style="color:#998877;font-size:10px;letter-spacing:1px;text-transform:uppercase">Morale</span>
          <div style="height:6px;background:rgba(0,0,0,0.4);border-radius:3px;margin-top:3px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
            <div style="height:100%;width:${Math.round(player.morale)}%;background:${player.morale < 20 ? 'linear-gradient(90deg,#cc2222,#aa1111)' : player.morale < 50 ? 'linear-gradient(90deg,#ccaa22,#aa8811)' : 'linear-gradient(90deg,#33aa44,#22cc55)'};border-radius:2px;transition:width 0.3s"></div>
          </div>
          <div style="font-size:10px;color:${player.morale < 20 ? '#ff4444' : player.morale < 50 ? '#ccaa22' : '#44cc44'};margin-top:2px;text-align:right">${Math.round(player.morale)}</div>
        </div>`
      : "";
    const fleeingInfo = fleeingAllies > 0
      ? `<div style="color:#ff8800;font-size:11px;margin-top:3px"><span style="display:inline-block;width:6px;height:6px;background:#ff8800;border-radius:50%;margin-right:4px;vertical-align:middle"></span>Fleeing: ${fleeingAllies}</div>`
      : "";
    this._teamStatus.innerHTML = `
      <div style="font-size:10px;color:#998877;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;border-bottom:1px solid rgba(218,165,32,0.15);padding-bottom:4px">
        <span style="color:#5a4020">\u2726</span> Battle Status
      </div>
      <div style="display:flex;gap:8px;margin-bottom:4px">
        <div style="color:#5599dd">
          <span style="display:inline-block;width:6px;height:6px;background:#5599dd;border-radius:50%;margin-right:4px;vertical-align:middle"></span>
          ${state.playerTeamAlive}<span style="color:#556677;font-size:10px">/${Math.ceil(state.fighters.filter(f => f.team === "player").length)}</span>
        </div>
        <div style="color:#888;font-size:10px;margin:0 2px">vs</div>
        <div style="color:#dd5544">
          <span style="display:inline-block;width:6px;height:6px;background:#dd5544;border-radius:50%;margin-right:4px;vertical-align:middle"></span>
          ${state.enemyTeamAlive}<span style="color:#665544;font-size:10px">/${Math.ceil(state.fighters.filter(f => f.team === "enemy").length)}</span>
        </div>
      </div>
      <div style="display:flex;gap:12px;font-size:11px;color:#c0b8a0;margin-top:4px">
        <span>\u2694 ${player.kills}</span>
        <span style="color:#776655">R${state.round}</span>
      </div>
      ${moraleInfo}${fleeingInfo}
      ${player.fleeing ? '<div style="color:#ff4444;font-weight:bold;font-size:14px;margin-top:6px;text-align:center;animation:wbHudPulse 1s ease infinite;letter-spacing:2px">FLEEING!</div>' : ""}
    `;

    // Ammo
    if (player.maxAmmo > 0) {
      this._ammoDisplay.style.display = "block";
      this._ammoDisplay.innerHTML = `<span style="font-size:14px">\uD83C\uDFF9</span> <span style="font-size:20px">${player.ammo}</span><span style="color:#776655;font-size:13px">/${player.maxAmmo}</span>`;
    } else {
      this._ammoDisplay.style.display = "none";
    }

    // Gold
    this._goldDisplay.innerHTML = `<span style="font-size:14px">\u269C</span> ${player.gold} <span style="color:#aa8833;font-size:12px">gold</span>`;

    // Siege capture progress
    if (state.battleType === BattleType.SIEGE) {
      this._siegeCapture.style.display = "block";
      this._siegeTimer.style.display = "block";

      const capPct = Math.min(100, (state.siegeCaptureProgress / WB.SIEGE_CAPTURE_TICKS) * 100);
      this._siegeCaptureFill.style.width = `${capPct}%`;

      const atkIn = state.siegeAttackersInZone;
      const defIn = state.siegeDefendersInZone;
      let label = "\u2694 CAPTURE THE CENTRE";
      if (atkIn > 0 && defIn === 0) label = `\u2694 CAPTURING (${atkIn} in zone)`;
      else if (atkIn > 0 && defIn > 0) label = "\u2694 CONTESTED";
      else if (defIn > 0 && atkIn === 0 && capPct > 0) label = "\u2694 DEFENDERS RETAKING";
      this._siegeCaptureLabel.textContent = label;

      // Timer
      const secsLeft = Math.ceil(state.battleTimer / WB.TICKS_PER_SEC);
      const mins = Math.floor(secsLeft / 60);
      const secs = secsLeft % 60;
      this._siegeTimer.textContent = `\u231A ${mins}:${secs.toString().padStart(2, "0")}`;
      if (secsLeft < 60) {
        this._siegeTimer.style.color = "#ff4444";
        this._siegeTimer.style.animation = "wbHudPulse 1s ease infinite";
      } else {
        this._siegeTimer.style.color = "#e0d5c0";
        this._siegeTimer.style.animation = "none";
      }
    } else {
      this._siegeCapture.style.display = "none";
      this._siegeTimer.style.display = "none";
    }

    // Kill feed cleanup
    const now = Date.now();
    this._killFeedEntries = this._killFeedEntries.filter(
      (e) => now - e.time < 5000,
    );
    this._killFeed.innerHTML = this._killFeedEntries
      .map((e) => {
        const age = now - e.time;
        const opacity = age > 4000 ? Math.max(0, 1 - (age - 4000) / 1000) : 1;
        return `<div style="margin-bottom:3px;opacity:${opacity};background:linear-gradient(90deg,transparent,rgba(0,0,0,0.5));padding:2px 8px;border-radius:3px;text-align:right;font-size:11px;animation:wbHudSlideIn 0.3s ease">${e.text}</div>`;
      })
      .join("");

    // Crosshair visibility
    this._crosshair.style.display = state.cameraMode === CameraMode.FIRST_PERSON ? "block" : "block";

    // Loot prompt — check for nearby dead enemies
    let lootTarget: WarbandFighter | null = null;
    for (const f of state.fighters) {
      if (f.combatState !== FighterCombatState.DEAD) continue;
      if (f.team === player.team) continue;
      const dist = vec3DistXZ(player.position, f.position);
      if (dist < 2.5) {
        // Only show if they still have something to loot
        if (f.equipment.mainHand || f.equipment.offHand || Object.values(f.equipment.armor).some(a => a)) {
          lootTarget = f;
          break;
        }
      }
    }
    if (lootTarget) {
      const items: string[] = [];
      if (lootTarget.equipment.mainHand) items.push(lootTarget.equipment.mainHand.name);
      if (lootTarget.equipment.offHand) items.push(lootTarget.equipment.offHand.name);
      const armorCount = Object.values(lootTarget.equipment.armor).filter(a => a).length;
      if (armorCount > 0) items.push(`${armorCount} armor`);
      this._lootPrompt.innerHTML = `<span style="color:#e0d5c0">[F]</span> Loot ${lootTarget.name} <span style="color:#aa9977;font-size:11px">\u2014 ${items.join(", ")}</span>`;
      this._lootPrompt.style.display = "block";
    } else {
      this._lootPrompt.style.display = "none";
    }

    // Mount prompt — check for nearby riderless horses
    if (player.isMounted) {
      this._mountPrompt.innerHTML = `<span style="color:#e0d5c0">[B]</span> Dismount`;
      this._mountPrompt.style.display = "block";
    } else {
      let nearHorse = false;
      for (const horse of state.horses) {
        if (!horse.alive || horse.riderId) continue;
        if (vec3DistXZ(player.position, horse.position) < WB.MOUNT_RANGE) {
          nearHorse = true;
          break;
        }
      }
      if (nearHorse) {
        this._mountPrompt.innerHTML = `<span style="color:#e0d5c0">[B]</span> Mount Horse`;
        this._mountPrompt.style.display = "block";
      } else {
        this._mountPrompt.style.display = "none";
      }
    }

    // Flee UI
    if (state.fleeTimer > 0 || state.fleeAvailable) {
      this._fleeContainer.style.display = "flex";
      if (state.fleeAvailable) {
        // Flee is ready — show button, hide progress bar
        this._fleeTimerBar.style.display = "none";
        this._fleeTimerLabel.textContent = "\u2713 You can flee!";
        this._fleeTimerLabel.style.color = "#44cc44";
        this._fleeButton.style.display = "block";
      } else {
        // Still counting down — show progress bar
        const fleeTicks = 30 * WB.TICKS_PER_SEC; // 30 seconds
        const pct = Math.min(100, (state.fleeTimer / fleeTicks) * 100);
        this._fleeTimerBar.style.display = "block";
        this._fleeTimerFill.style.width = `${pct}%`;
        const secsLeft = Math.ceil((fleeTicks - state.fleeTimer) / WB.TICKS_PER_SEC);
        this._fleeTimerLabel.textContent = `Retreating... ${secsLeft}s`;
        this._fleeTimerLabel.style.color = "#ff8800";
        this._fleeButton.style.display = "none";
      }
    } else {
      this._fleeContainer.style.display = "none";
      this._fleeButton.style.display = "none";
    }

    // Horse HP bar
    if (player.isMounted && player.mountId) {
      const horse = state.horses.find(h => h.id === player.mountId);
      if (horse) {
        this._horseHpBar.style.display = "block";
        const horsePct = Math.max(0, (horse.hp / horse.maxHp) * 100);
        this._horseHpFill.style.width = `${horsePct}%`;
        this._horseHpLabel.textContent = `\uD83D\uDC0E ${Math.ceil(horse.hp)}`;
      } else {
        this._horseHpBar.style.display = "none";
      }
    } else {
      this._horseHpBar.style.display = "none";
    }
  }

  private _updateDirectionIndicator(player: WarbandFighter): void {
    const isBlocking = player.combatState === FighterCombatState.BLOCKING;
    const isAttacking =
      player.combatState === FighterCombatState.WINDING ||
      player.combatState === FighterCombatState.RELEASING;
    const dir = isBlocking ? player.blockDirection : player.attackDirection;

    const quadrants = [
      { label: "\u2190", active: dir === CombatDirection.LEFT_SWING, pos: "left" },
      { label: "\u2192", active: dir === CombatDirection.RIGHT_SWING, pos: "right" },
      { label: "\u2193", active: dir === CombatDirection.OVERHEAD, pos: "down" },
      { label: "\u2295", active: dir === CombatDirection.STAB, pos: "stab" },
    ];

    const color = isBlocking ? "#5599ee" : isAttacking ? "#ff6644" : "#c0b8a0";
    const glowColor = isBlocking ? "rgba(85,153,238,0.3)" : isAttacking ? "rgba(255,102,68,0.3)" : "transparent";
    const statusText = isBlocking ? "BLOCKING" : isAttacking ? "ATTACKING" : "READY";
    const statusColor = isBlocking ? "#5599ee" : isAttacking ? "#ff6644" : "#776655";

    this._dirIndicator.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;width:100%;height:calc(100% - 18px)">
        ${quadrants
          .map(
            (q) =>
              `<div style="
                display:flex;align-items:center;justify-content:center;
                font-size:${q.active ? "22px" : "14px"};
                background:${q.active ? `linear-gradient(135deg, ${color}22, ${color}11)` : "rgba(8,6,4,0.5)"};
                border:${q.active ? `2px solid ${color}88` : "1px solid rgba(255,255,255,0.08)"};
                border-radius:4px;
                color:${q.active ? color : "rgba(255,255,255,0.2)"};
                box-shadow:${q.active ? `0 0 8px ${glowColor}, inset 0 0 8px ${glowColor}` : "none"};
                transition:all 0.1s ease;
              ">${q.label}</div>`,
          )
          .join("")}
      </div>
      <div style="text-align:center;font-size:10px;margin-top:3px;color:${statusColor};font-weight:bold;letter-spacing:1.5px;text-shadow:0 1px 2px rgba(0,0,0,0.8)">
        ${statusText}
      </div>
    `;
  }

  addKill(killerName: string, victimName: string): void {
    this._killFeedEntries.push({
      text: `<span style="color:#ffd700">${killerName}</span> <span style="color:#776655">\u2694</span> <span style="color:#ff6644">${victimName}</span>`,
      time: Date.now(),
    });
  }

  showCenterMessage(text: string, duration = 2000): void {
    this._centerMsg.textContent = text;
    this._centerMsg.style.opacity = "1";
    setTimeout(() => {
      this._centerMsg.style.opacity = "0";
    }, duration);
  }

  destroy(): void {
    if (this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
  }
}
