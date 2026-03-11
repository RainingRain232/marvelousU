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
  private _staminaBar!: HTMLDivElement;
  private _staminaFill!: HTMLDivElement;
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
  private _siegeCapture!: HTMLDivElement;
  private _siegeCaptureFill!: HTMLDivElement;
  private _siegeCaptureLabel!: HTMLDivElement;
  private _siegeTimer!: HTMLDivElement;

  private _killFeedEntries: { text: string; time: number }[] = [];

  init(): void {
    this._container = document.createElement("div");
    this._container.id = "warband-hud";
    this._container.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 20; pointer-events: none; font-family: 'Segoe UI', sans-serif;
      color: white; user-select: none;
    `;

    // Crosshair
    this._crosshair = document.createElement("div");
    this._crosshair.style.cssText = `
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 24px; height: 24px;
    `;
    this._crosshair.innerHTML = `
      <div style="position:absolute;top:50%;left:0;right:0;height:2px;background:rgba(255,255,255,0.7);transform:translateY(-50%)"></div>
      <div style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.7);transform:translateX(-50%)"></div>
      <div style="position:absolute;top:50%;left:50%;width:4px;height:4px;background:rgba(255,100,100,0.9);border-radius:50%;transform:translate(-50%,-50%)"></div>
    `;
    this._container.appendChild(this._crosshair);

    // HP Bar
    this._hpBar = this._makeBar("bottom: 60px; left: 50%; transform: translateX(-50%); width: 300px;");
    this._hpFill = this._hpBar.querySelector(".fill") as HTMLDivElement;
    this._container.appendChild(this._hpBar);

    // Stamina bar
    this._staminaBar = this._makeBar("bottom: 40px; left: 50%; transform: translateX(-50%); width: 250px;", "#4488cc");
    this._staminaFill = this._staminaBar.querySelector(".fill") as HTMLDivElement;
    this._container.appendChild(this._staminaBar);

    // Direction indicator (shows which direction you're attacking/blocking)
    this._dirIndicator = document.createElement("div");
    this._dirIndicator.style.cssText = `
      position: absolute; bottom: 100px; left: 50%;
      transform: translateX(-50%);
      width: 80px; height: 80px;
    `;
    this._container.appendChild(this._dirIndicator);

    // Team status (top left)
    this._teamStatus = document.createElement("div");
    this._teamStatus.style.cssText = `
      position: absolute; top: 20px; left: 20px;
      font-size: 16px; text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
    `;
    this._container.appendChild(this._teamStatus);

    // Ammo (bottom right)
    this._ammoDisplay = document.createElement("div");
    this._ammoDisplay.style.cssText = `
      position: absolute; bottom: 60px; right: 30px;
      font-size: 20px; text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
    `;
    this._container.appendChild(this._ammoDisplay);

    // Gold (top right)
    this._goldDisplay = document.createElement("div");
    this._goldDisplay.style.cssText = `
      position: absolute; top: 20px; right: 30px;
      font-size: 18px; text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
      color: #ffd700;
    `;
    this._container.appendChild(this._goldDisplay);

    // Kill feed (top right, below gold)
    this._killFeed = document.createElement("div");
    this._killFeed.style.cssText = `
      position: absolute; top: 60px; right: 30px;
      font-size: 14px; text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
      max-width: 300px;
    `;
    this._container.appendChild(this._killFeed);

    // Center message
    this._centerMsg = document.createElement("div");
    this._centerMsg.style.cssText = `
      position: absolute; top: 25%; left: 50%;
      transform: translate(-50%, -50%);
      font-size: 36px; font-weight: bold;
      text-shadow: 2px 2px 6px rgba(0,0,0,0.9);
      opacity: 0; transition: opacity 0.3s;
    `;
    this._container.appendChild(this._centerMsg);

    // Controls hint
    this._controlsHint = document.createElement("div");
    this._controlsHint.style.cssText = `
      position: absolute; bottom: 10px; left: 50%;
      transform: translateX(-50%);
      font-size: 12px; opacity: 0.5;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
    `;
    this._controlsHint.textContent = "WASD: Move | Arrows: Attack | RMB: Block | F: Loot | B: Mount | V: Camera | ESC: Menu";
    this._container.appendChild(this._controlsHint);

    // Loot prompt
    this._lootPrompt = document.createElement("div");
    this._lootPrompt.style.cssText = `
      position: absolute; bottom: 140px; left: 50%;
      transform: translateX(-50%);
      font-size: 16px; font-weight: bold;
      text-shadow: 1px 1px 4px rgba(0,0,0,0.9);
      color: #ffd700; display: none;
      background: rgba(0,0,0,0.5); padding: 6px 16px;
      border: 1px solid rgba(255,215,0,0.4); border-radius: 4px;
    `;
    this._container.appendChild(this._lootPrompt);

    // Mount prompt
    this._mountPrompt = document.createElement("div");
    this._mountPrompt.style.cssText = `
      position: absolute; bottom: 170px; left: 50%;
      transform: translateX(-50%);
      font-size: 16px; font-weight: bold;
      text-shadow: 1px 1px 4px rgba(0,0,0,0.9);
      color: #88ccff; display: none;
      background: rgba(0,0,0,0.5); padding: 6px 16px;
      border: 1px solid rgba(136,204,255,0.4); border-radius: 4px;
    `;
    this._container.appendChild(this._mountPrompt);

    // Horse HP bar (below player HP bar)
    this._horseHpBar = this._makeBar("bottom: 80px; left: 50%; transform: translateX(-50%); width: 200px;", "#cc8800");
    this._horseHpFill = this._horseHpBar.querySelector(".fill") as HTMLDivElement;
    this._horseHpBar.style.display = "none";
    this._container.appendChild(this._horseHpBar);

    // Siege capture progress (top centre)
    this._siegeCapture = document.createElement("div");
    this._siegeCapture.style.cssText = `
      position: absolute; top: 20px; left: 50%;
      transform: translateX(-50%);
      width: 300px; height: 24px;
      background: rgba(0,0,0,0.7);
      border: 2px solid rgba(255,170,0,0.6);
      border-radius: 4px; overflow: hidden;
      display: none;
    `;
    this._siegeCaptureFill = document.createElement("div");
    this._siegeCaptureFill.style.cssText = `
      width: 0%; height: 100%;
      background: linear-gradient(90deg, #ff6600, #ffaa00);
      transition: width 0.2s;
    `;
    this._siegeCapture.appendChild(this._siegeCaptureFill);
    this._siegeCaptureLabel = document.createElement("div");
    this._siegeCaptureLabel.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: bold;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.9);
    `;
    this._siegeCapture.appendChild(this._siegeCaptureLabel);
    this._container.appendChild(this._siegeCapture);

    // Siege timer (below capture bar)
    this._siegeTimer = document.createElement("div");
    this._siegeTimer.style.cssText = `
      position: absolute; top: 50px; left: 50%;
      transform: translateX(-50%);
      font-size: 16px; font-weight: bold;
      text-shadow: 1px 1px 3px rgba(0,0,0,0.9);
      color: #e0d5c0; display: none;
    `;
    this._container.appendChild(this._siegeTimer);

    const pixiContainer = document.getElementById("pixi-container");
    if (pixiContainer) {
      pixiContainer.appendChild(this._container);
    }
  }

  private _makeBar(posStyle: string, color = "#22aa44"): HTMLDivElement {
    const bar = document.createElement("div");
    bar.style.cssText = `
      position: absolute; ${posStyle}
      height: 14px; background: rgba(0,0,0,0.6);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 2px; overflow: hidden;
    `;
    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.cssText = `
      width: 100%; height: 100%;
      background: ${color};
      transition: width 0.1s;
    `;
    bar.appendChild(fill);
    return bar;
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
    if (hpPct < 25) this._hpFill.style.background = "#cc2222";
    else if (hpPct < 50) this._hpFill.style.background = "#ccaa22";
    else this._hpFill.style.background = "#22aa44";

    // Stamina
    const stamPct = Math.max(0, (player.stamina / player.maxStamina) * 100);
    this._staminaFill.style.width = `${stamPct}%`;

    // Direction indicator
    this._updateDirectionIndicator(player);

    // Team status
    this._teamStatus.innerHTML = `
      <div style="color:#4488ff">Allies: ${state.playerTeamAlive}/${Math.ceil(state.fighters.filter(f => f.team === "player").length)}</div>
      <div style="color:#ff4444">Enemies: ${state.enemyTeamAlive}/${Math.ceil(state.fighters.filter(f => f.team === "enemy").length)}</div>
      <div style="margin-top:8px">Kills: ${player.kills}</div>
      <div>Round: ${state.round}</div>
    `;

    // Ammo
    if (player.maxAmmo > 0) {
      this._ammoDisplay.style.display = "block";
      this._ammoDisplay.textContent = `🏹 ${player.ammo}/${player.maxAmmo}`;
    } else {
      this._ammoDisplay.style.display = "none";
    }

    // Gold
    this._goldDisplay.textContent = `⚜ ${player.gold} gold`;

    // Siege capture progress
    if (state.battleType === BattleType.SIEGE) {
      this._siegeCapture.style.display = "block";
      this._siegeTimer.style.display = "block";

      const capPct = Math.min(100, (state.siegeCaptureProgress / WB.SIEGE_CAPTURE_TICKS) * 100);
      this._siegeCaptureFill.style.width = `${capPct}%`;

      const atkIn = state.siegeAttackersInZone;
      const defIn = state.siegeDefendersInZone;
      let label = "CAPTURE THE CENTRE";
      if (atkIn > 0 && defIn === 0) label = `CAPTURING (${atkIn} in zone)`;
      else if (atkIn > 0 && defIn > 0) label = "CONTESTED";
      else if (defIn > 0 && atkIn === 0 && capPct > 0) label = "DEFENDERS RETAKING";
      this._siegeCaptureLabel.textContent = label;

      // Timer
      const secsLeft = Math.ceil(state.battleTimer / WB.TICKS_PER_SEC);
      const mins = Math.floor(secsLeft / 60);
      const secs = secsLeft % 60;
      this._siegeTimer.textContent = `Time: ${mins}:${secs.toString().padStart(2, "0")}`;
      if (secsLeft < 60) this._siegeTimer.style.color = "#ff4444";
      else this._siegeTimer.style.color = "#e0d5c0";
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
      .map((e) => `<div style="margin-bottom:2px">${e.text}</div>`)
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
      this._lootPrompt.textContent = `[F] Loot ${lootTarget.name} — ${items.join(", ")}`;
      this._lootPrompt.style.display = "block";
    } else {
      this._lootPrompt.style.display = "none";
    }

    // Mount prompt — check for nearby riderless horses
    if (player.isMounted) {
      this._mountPrompt.textContent = "[B] Dismount";
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
        this._mountPrompt.textContent = "[B] Mount Horse";
        this._mountPrompt.style.display = "block";
      } else {
        this._mountPrompt.style.display = "none";
      }
    }

    // Horse HP bar
    if (player.isMounted && player.mountId) {
      const horse = state.horses.find(h => h.id === player.mountId);
      if (horse) {
        this._horseHpBar.style.display = "block";
        const horsePct = Math.max(0, (horse.hp / horse.maxHp) * 100);
        this._horseHpFill.style.width = `${horsePct}%`;
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
      { label: "←", active: dir === CombatDirection.LEFT_SWING },
      { label: "→", active: dir === CombatDirection.RIGHT_SWING },
      { label: "↓", active: dir === CombatDirection.OVERHEAD },
      { label: "⊕", active: dir === CombatDirection.STAB },
    ];

    const color = isBlocking ? "#4488ff" : isAttacking ? "#ff6644" : "#ffffff";

    this._dirIndicator.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;width:100%;height:100%">
        ${quadrants
          .map(
            (q) =>
              `<div style="
                display:flex;align-items:center;justify-content:center;
                font-size:${q.active ? "24px" : "16px"};
                background:${q.active ? `${color}33` : "rgba(0,0,0,0.2)"};
                border:1px solid ${q.active ? color : "rgba(255,255,255,0.15)"};
                border-radius:3px;
                color:${q.active ? color : "rgba(255,255,255,0.3)"};
              ">${q.label}</div>`,
          )
          .join("")}
      </div>
      <div style="text-align:center;font-size:11px;margin-top:2px;color:${color}">
        ${isBlocking ? "BLOCKING" : isAttacking ? "ATTACKING" : "READY"}
      </div>
    `;
  }

  addKill(killerName: string, victimName: string): void {
    this._killFeedEntries.push({
      text: `<span style="color:#ffcc00">${killerName}</span> killed <span style="color:#ff6644">${victimName}</span>`,
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
