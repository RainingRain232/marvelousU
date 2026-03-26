// ---------------------------------------------------------------------------
// Pendulum — The Clockwork Knight — HTML HUD overlay
// ---------------------------------------------------------------------------

import { PENDULUM } from "../config/PendulumConfig";
import type { PendulumState } from "../state/PendulumState";
import { UPGRADES, getUpgradeCost, WAVE_MODIFIER_NAMES, WAVE_MODIFIER_COLORS } from "../state/PendulumState";
import { applyBuff } from "../systems/PendulumSystem";

export class PendulumHUD {
  private _root!: HTMLDivElement;
  private _minimapCanvas!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;
  private _dmgCanvas!: HTMLCanvasElement;
  private _dmgCtx!: CanvasRenderingContext2D;
  private _onExit: (() => void) | null = null;
  private _onResize: (() => void) | null = null;
  private _lastHtmlHash = "";

  build(onExit: () => void): void {
    this._onExit = onExit;

    this._root = document.createElement("div");
    this._root.id = "pendulum-hud";
    this._root.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      pointer-events:none; z-index:20; font-family:'Segoe UI',Arial,sans-serif;
      color:#eee; user-select:none;
    `;
    document.body.appendChild(this._root);

    // Minimap canvas
    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 140;
    this._minimapCanvas.height = 140;
    this._minimapCanvas.style.cssText = `
      position:fixed; bottom:16px; left:16px; width:140px; height:140px;
      border-radius:50%; border:2px solid #445; z-index:21;
      pointer-events:none; background:#0a0a14;
    `;
    document.body.appendChild(this._minimapCanvas);
    this._minimapCtx = this._minimapCanvas.getContext("2d")!;

    // Damage number canvas
    this._dmgCanvas = document.createElement("canvas");
    this._dmgCanvas.width = window.innerWidth;
    this._dmgCanvas.height = window.innerHeight;
    this._dmgCanvas.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      pointer-events:none; z-index:22;
    `;
    document.body.appendChild(this._dmgCanvas);
    this._dmgCtx = this._dmgCanvas.getContext("2d")!;

    this._onResize = () => {
      this._dmgCanvas.width = window.innerWidth;
      this._dmgCanvas.height = window.innerHeight;
    };
    window.addEventListener("resize", this._onResize);
  }

  update(state: PendulumState): void {
    const p = state.player;

    // Persist best wave
    if (state.bestWave > 0) {
      localStorage.setItem("pendulum_best", String(state.bestWave));
    }

    let html = "";

    // --- MENU SCREEN ---
    if (state.phase === "menu") {
      html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;
        display:flex;flex-direction:column;justify-content:center;align-items:center;
        background:linear-gradient(180deg, rgba(15,10,25,0.85) 0%, rgba(10,8,20,0.95) 100%);
        pointer-events:all;">
        <div style="font-size:52px;font-weight:bold;color:#ccaa44;text-shadow:0 0 20px #886622, 0 0 40px #44331180;
          letter-spacing:6px;margin-bottom:8px;">PENDULUM</div>
        <div style="font-size:16px;color:#aa9966;margin-bottom:40px;letter-spacing:3px;">
          Guard the Clock Tower &bull; Master Time Itself
        </div>
        <div style="display:flex;gap:12px;margin-bottom:20px;">
          ${(["easy", "normal", "hard", "nightmare"] as const).map(d => {
            const sel = d === state.difficulty;
            const col: Record<string, string> = { easy: "#44aa44", normal: "#4488cc", hard: "#cc6622", nightmare: "#cc2222" };
            return `<button data-diff="${d}" style="pointer-events:all;padding:8px 18px;border:2px solid ${sel ? col[d] : "#333"};
              background:${sel ? col[d] + "33" : "#111"};color:${col[d]};cursor:pointer;border-radius:6px;
              font-size:13px;font-weight:${sel ? "bold" : "normal"};letter-spacing:1px;
              text-transform:uppercase;">${d}</button>`;
          }).join("")}
        </div>
        <button id="pendulum-play-btn" style="pointer-events:all;padding:14px 50px;font-size:20px;font-weight:bold;
          color:#ccaa44;background:#1a1510;border:2px solid #ccaa44;border-radius:8px;cursor:pointer;
          letter-spacing:3px;text-transform:uppercase;transition:all 0.2s;">
          ENGAGE
        </button>
        <div style="margin-top:16px;font-size:13px;color:#776;">
          Best Wave: ${state.bestWave || parseInt(localStorage.getItem("pendulum_best") || "0")}
        </div>
        <div style="margin-top:30px;font-size:12px;color:#665;max-width:500px;text-align:center;line-height:1.6;">
          WASD move &bull; Mouse look &bull; LMB attack &bull; RMB block (parry at Lv3) &bull;
          Q gear throw &bull; E time slow &bull; R rewind &bull; X time stop &bull;
          C dash &bull; T place turret &bull; F repair pillar &bull; ESC pause
        </div>
      </div>`;
    }

    // --- PLAYING / INTERMISSION HUD ---
    if (state.phase === "playing" || state.phase === "intermission") {
      // HP bar
      const hpPct = (p.hp / p.maxHp * 100).toFixed(0);
      const hpColor = p.hp / p.maxHp > 0.5 ? "#44ccaa" : p.hp / p.maxHp > 0.25 ? "#ccaa44" : "#cc4444";
      html += `<div style="position:fixed;bottom:60px;left:50%;transform:translateX(-50%);text-align:center;">
        <div style="width:240px;height:12px;background:#111;border:1px solid #333;border-radius:6px;overflow:hidden;">
          <div style="width:${hpPct}%;height:100%;background:${hpColor};transition:width 0.2s;"></div>
        </div>
        <div style="font-size:11px;color:#aaa;margin-top:2px;">HP ${Math.ceil(p.hp)}/${p.maxHp}</div>
      </div>`;

      // Stamina bar
      const stPct = (p.stamina / p.maxStamina * 100).toFixed(0);
      html += `<div style="position:fixed;bottom:42px;left:50%;transform:translateX(-50%);text-align:center;">
        <div style="width:180px;height:6px;background:#111;border:1px solid #222;border-radius:3px;overflow:hidden;">
          <div style="width:${stPct}%;height:100%;background:#ccaa44;transition:width 0.15s;"></div>
        </div>
      </div>`;

      // Pendulum power indicator — arc visualization
      const powerColor = state.apexStrikeActive ? "#ffdd44" : state.pendulumPower > 1.0 ? "#ccaa66" : "#887766";
      const pendAngle = state.pendulumAngle; // -1 to 1
      const dotX = 80 + pendAngle * 60; // map to 20..140px range
      html += `<div style="position:fixed;top:12px;left:50%;transform:translateX(-50%);text-align:center;width:180px;">
        <div style="font-size:10px;color:${powerColor};letter-spacing:2px;margin-bottom:4px;">
          CHRONO POWER ${state.apexStrikeActive ? "&#x26A1;" : ""}
        </div>
        <div style="position:relative;width:160px;height:24px;margin:0 auto;">
          <svg width="160" height="24" viewBox="0 0 160 24" style="display:block;">
            <path d="M 20 20 Q 80 0 140 20" stroke="#333" fill="none" stroke-width="3"/>
            <path d="M 20 20 Q 80 0 140 20" stroke="${powerColor}" fill="none" stroke-width="3" stroke-dasharray="4 4" opacity="0.4"/>
            <circle cx="${dotX}" cy="${20 - Math.abs(pendAngle) * 16}" r="${state.apexStrikeActive ? 6 : 4}" fill="${powerColor}" opacity="0.9"/>
            ${state.apexStrikeActive ? `<circle cx="${dotX}" cy="${20 - Math.abs(pendAngle) * 16}" r="9" fill="none" stroke="#ffdd44" stroke-width="1" opacity="0.5"/>` : ""}
          </svg>
        </div>
        <div style="font-size:10px;color:#776;">${state.pendulumPower.toFixed(1)}x</div>
      </div>`;

      // Wave / gears / turrets
      const turretMax = PENDULUM.TURRET_MAX + (p.turretLevel >= 1 ? p.turretLevel : 0);
      html += `<div style="position:fixed;top:16px;left:16px;">
        <div style="font-size:14px;color:#ccaa44;font-weight:bold;">WAVE ${state.wave}</div>
        <div style="font-size:12px;color:#aa8844;margin-top:4px;">
          <span style="color:#ccaa44;">&#x2699;</span> ${p.gears} gears
        </div>
        <div style="font-size:11px;color:#776;margin-top:2px;">Hour ${state.clockHour}/12</div>
        <div style="font-size:11px;color:#776;margin-top:2px;">Enemies: ${state.aliveEnemyCount}</div>
        <div style="font-size:11px;color:#44aacc;margin-top:2px;">Turrets: ${state.turrets.length}/${turretMax} [T]
          ${state.turrets.map((t) => {
            const hpPct = Math.ceil(t.hp / t.maxHp * 100);
            const tc = hpPct > 50 ? "#44aacc" : hpPct > 25 ? "#ccaa44" : "#cc4444";
            return `<span style="color:${tc};font-size:9px;margin-left:4px;">${hpPct}%</span>`;
          }).join("")}
        </div>
        ${state.entropy > 0 ? `<div style="font-size:10px;color:#cc6644;margin-top:4px;">
          Entropy: ${(state.entropy * 100).toFixed(0)}%
          <div style="width:60px;height:4px;background:#222;border-radius:2px;overflow:hidden;margin-top:2px;">
            <div style="width:${state.entropy * 100}%;height:100%;background:#cc6644;"></div>
          </div>
        </div>` : ""}
      </div>`;

      // Kill streak
      if (p.killStreak >= 3) {
        const streakColor = p.killStreak >= 20 ? "#ff4444" : p.killStreak >= 10 ? "#ffaa44" : "#ccaa44";
        html += `<div style="position:fixed;left:16px;bottom:140px;font-size:${12 + Math.min(p.killStreak, 20)}px;
          font-weight:bold;color:${streakColor};text-shadow:0 0 8px ${streakColor}60;opacity:${Math.min(1, p.killStreakTimer / 2)};">
          ${p.killStreak} STREAK
        </div>`;
      }

      // Boss HP bar
      if (state.bossId) {
        const boss = state.enemies.get(state.bossId);
        if (boss && boss.behavior !== "dead") {
          const bossHpPct = (boss.hp / boss.maxHp * 100).toFixed(0);
          const bossColor = boss.hp / boss.maxHp > 0.5 ? "#cc4444" : boss.hp / boss.maxHp > 0.2 ? "#ff6644" : "#ff2222";
          const phaseLabel = boss.bossPhase === 2 ? " ENRAGED" : boss.bossPhase === 1 ? " PHASE 2" : "";
          html += `<div style="position:fixed;bottom:160px;left:50%;transform:translateX(-50%);text-align:center;width:320px;">
            <div style="font-size:12px;color:#cc4444;font-weight:bold;letter-spacing:2px;margin-bottom:4px;">
              CHRONOVORE${phaseLabel}
            </div>
            <div style="width:320px;height:10px;background:#111;border:1px solid #442222;border-radius:5px;overflow:hidden;">
              <div style="width:${bossHpPct}%;height:100%;background:${bossColor};transition:width 0.15s;"></div>
            </div>
            <div style="font-size:9px;color:#886;margin-top:2px;">${Math.ceil(boss.hp)}/${boss.maxHp}</div>
          </div>`;
        } else {
          // Boss dead, clear ID
          state.bossId = null;
        }
      }

      // Repair progress
      if (p.repairingPillarIdx >= 0 && p.repairingPillarIdx < state.pillars.length) {
        const pil = state.pillars[p.repairingPillarIdx];
        const repairPct = (pil.repairProgress * 100).toFixed(0);
        html += `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,40px);text-align:center;">
          <div style="font-size:12px;color:#44ccff;letter-spacing:1px;">REPAIRING...</div>
          <div style="width:120px;height:6px;background:#111;border:1px solid #336;border-radius:3px;overflow:hidden;margin:4px auto;">
            <div style="width:${repairPct}%;height:100%;background:#44ccff;transition:width 0.1s;"></div>
          </div>
        </div>`;
      }

      // Parry flash
      if (state.lastParrySuccess > 0) {
        html += `<div style="position:fixed;inset:0;border:3px solid #ffffff88;pointer-events:none;
          box-shadow:inset 0 0 40px #ffffff22;opacity:${state.lastParrySuccess * 2};"></div>`;
      }

      // Clock Tower HP
      const towerPct = (state.clockTower.hp / state.clockTower.maxHp * 100).toFixed(0);
      const towerColor = state.clockTower.hp / state.clockTower.maxHp > 0.5 ? "#44aacc" :
        state.clockTower.hp / state.clockTower.maxHp > 0.25 ? "#ccaa44" : "#cc4444";
      html += `<div style="position:fixed;top:16px;right:16px;text-align:right;">
        <div style="font-size:12px;color:#aaa;">CLOCK TOWER</div>
        <div style="width:140px;height:10px;background:#111;border:1px solid #333;border-radius:5px;overflow:hidden;margin-left:auto;">
          <div style="width:${towerPct}%;height:100%;background:${towerColor};transition:width 0.2s;"></div>
        </div>
        <div style="font-size:10px;color:#776;margin-top:2px;">${Math.ceil(state.clockTower.hp)}/${state.clockTower.maxHp}</div>
      </div>`;

      // Pillar status
      html += `<div style="position:fixed;top:75px;right:16px;text-align:right;">`;
      for (let i = 0; i < state.pillars.length; i++) {
        const pil = state.pillars[i];
        const pc = pil.status === "active" ? "#44aacc" : pil.status === "damaged" ? "#cc8844" : "#443333";
        const label = pil.status === "destroyed" ? "X" : `${Math.ceil(pil.hp)}`;
        const attacked = state.pillarUnderAttack.includes(i);
        html += `<div style="font-size:10px;color:${pc};margin-top:2px;${attacked ? "text-shadow:0 0 4px #ff4444;" : ""}">
          Pillar ${i + 1}: ${label}${attacked ? " !" : ""}
        </div>`;
      }
      html += `</div>`;

      // Block indicator
      if (p.blocking) {
        const parryActive = state.parryWindow > 0;
        html += `<div style="position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
          font-size:11px;font-weight:bold;color:${parryActive ? "#ffffff" : "#aabbcc"};letter-spacing:2px;
          text-shadow:0 0 6px ${parryActive ? "#ffffff60" : "#44668840"};">
          ${parryActive ? "PARRY READY" : "BLOCKING"}
        </div>`;
      }

      // Sprint indicator
      if (p.action === "sprinting") {
        html += `<div style="position:fixed;bottom:30px;right:50%;transform:translateX(200px);
          font-size:10px;color:#ccaa44;letter-spacing:1px;opacity:0.7;">SPRINT</div>`;
      }

      // Ability cooldowns (now includes LMB attack)
      const abilities = [
        { label: "LMB", name: "Strike", cd: p.chronoStrikeCD, max: PENDULUM.CHRONO_STRIKE_COOLDOWN },
        { label: "Q", name: "Gear", cd: p.gearThrowCD, max: PENDULUM.GEAR_THROW_COOLDOWN },
        { label: "E", name: "Slow", cd: p.timeSlowCD, max: PENDULUM.TIME_SLOW_COOLDOWN },
        { label: "R", name: "Rewind", cd: p.rewindCD, max: PENDULUM.REWIND_COOLDOWN },
        { label: "X", name: "Stop", cd: p.timeStopCD, max: PENDULUM.TIME_STOP_COOLDOWN },
        { label: "C", name: "Dash", cd: p.dashCD, max: PENDULUM.DASH_COOLDOWN },
      ];
      html += `<div style="position:fixed;bottom:90px;left:50%;transform:translateX(-50%);display:flex;gap:6px;">`;
      for (const ab of abilities) {
        const ready = ab.cd <= 0;
        const pct = ready ? 100 : ((1 - ab.cd / ab.max) * 100);
        html += `<div style="width:48px;text-align:center;">
          <div style="width:48px;height:48px;border:2px solid ${ready ? "#ccaa44" : "#333"};border-radius:6px;
            background:#111;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
            <div style="position:absolute;bottom:0;left:0;width:100%;height:${pct}%;background:${ready ? "#ccaa4433" : "#33333366"};"></div>
            <span style="font-size:16px;font-weight:bold;color:${ready ? "#ccaa44" : "#555"};position:relative;z-index:1;">${ab.label}</span>
          </div>
          <div style="font-size:9px;color:#776;margin-top:2px;">${ab.name}</div>
          ${!ready ? `<div style="font-size:9px;color:#555;">${ab.cd.toFixed(1)}s</div>` : ""}
        </div>`;
      }
      html += `</div>`;

      // Combo
      if (p.combo > 0) {
        html += `<div style="position:fixed;right:16px;bottom:80px;font-size:${14 + p.combo}px;font-weight:bold;
          color:#ffcc44;text-shadow:0 0 10px #cc881180;">
          ${p.combo}x COMBO
        </div>`;
      }

      // Notifications
      for (const n of state.notifications) {
        const alpha = Math.min(1, n.timer);
        const color = `#${n.color.toString(16).padStart(6, "0")}`;
        html += `<div style="position:fixed;left:50%;transform:translateX(-50%);top:${100 + (state.notifications.indexOf(n)) * 28}px;
          font-size:14px;font-weight:bold;color:${color};opacity:${alpha};
          text-shadow:0 0 8px ${color}40;letter-spacing:2px;">${n.text}</div>`;
      }

      // Wave title
      if (state.waveTitle.timer > 0) {
        const alpha = Math.min(1, state.waveTitle.timer);
        html += `<div style="position:fixed;left:50%;top:35%;transform:translate(-50%,-50%);
          font-size:42px;font-weight:bold;color:${state.waveTitle.color};opacity:${alpha};
          text-shadow:0 0 20px ${state.waveTitle.color}60;letter-spacing:4px;">
          ${state.waveTitle.text}
        </div>`;
      }

      // Wave modifier indicator
      if (state.waveModifier !== "none") {
        const modColor = `#${WAVE_MODIFIER_COLORS[state.waveModifier].toString(16).padStart(6, "0")}`;
        html += `<div style="position:fixed;top:50px;left:50%;transform:translateX(-50%);
          font-size:11px;color:${modColor};letter-spacing:2px;opacity:0.8;">
          ${WAVE_MODIFIER_NAMES[state.waveModifier]}
        </div>`;
      }

      // All pillars destroyed warning
      if (state.pillars.every(p => p.status === "destroyed")) {
        const pulse = 0.5 + Math.sin(Date.now() / 300) * 0.3;
        html += `<div style="position:fixed;inset:0;border:2px solid rgba(255,34,34,${pulse});pointer-events:none;
          box-shadow:inset 0 0 40px rgba(255,34,34,${pulse * 0.3});"></div>
          <div style="position:fixed;top:55px;left:50%;transform:translateX(-50%);
          font-size:11px;color:#ff4444;letter-spacing:2px;opacity:${pulse};">
          TOWER VULNERABLE — ALL PILLARS DOWN
        </div>`;
      }

      // Time stop active
      if (state.timeStopActive) {
        html += `<div style="position:fixed;inset:0;border:3px solid #aaccff44;pointer-events:none;
          box-shadow:inset 0 0 80px #4466aa22;"></div>`;
      }

      // Active buffs with remaining duration
      if (state.activeBuffs.length > 0) {
        html += `<div style="position:fixed;bottom:16px;right:16px;text-align:right;">`;
        for (const buff of state.activeBuffs) {
          const durText = buff.duration === -1 ? "" : ` (${buff.remaining}w)`;
          html += `<div style="font-size:10px;color:#44ccaa;margin-top:2px;" title="${buff.description}">${buff.name}${durText}</div>`;
        }
        html += `</div>`;
      }

      // Hour event message
      if (state.hourEventTimer > 0 && state.hourEventMsg) {
        const alpha = Math.min(1, state.hourEventTimer / 1.5);
        html += `<div style="position:fixed;top:25%;left:50%;transform:translateX(-50%);
          font-size:18px;font-weight:bold;color:#ffcc44;opacity:${alpha};
          text-shadow:0 0 15px #cc882280;letter-spacing:3px;text-align:center;">
          ${state.hourEventMsg}
        </div>`;
      }

      // Damage direction indicators
      for (const ind of state.damageIndicators) {
        const alpha = Math.min(1, ind.timer / 0.3);
        const a = ind.angle;
        // Position indicator on screen edge based on angle
        const cx = 50 + Math.sin(a) * 42; // percentage
        const cy = 50 - Math.cos(a) * 42;
        html += `<div style="position:fixed;left:${cx}%;top:${cy}%;transform:translate(-50%,-50%) rotate(${a}rad);
          width:4px;height:30px;background:linear-gradient(transparent, #ff444488);
          opacity:${alpha};pointer-events:none;"></div>`;
      }
    }

    // --- INTERMISSION: Wave clear stats + next wave countdown ---
    if (state.phase === "intermission") {
      // Next wave countdown
      if (!state.buffSelectActive && state.phaseTimer > 0) {
        html += `<div style="position:fixed;top:20%;left:50%;transform:translateX(-50%);text-align:center;">
          <div style="font-size:13px;color:#aa9966;letter-spacing:2px;">NEXT WAVE IN</div>
          <div style="font-size:28px;color:#ccaa44;font-weight:bold;margin-top:4px;">${Math.ceil(state.phaseTimer)}</div>
        </div>`;
      }
      // Intermission tower/pillar status
      const tPct = Math.ceil(state.clockTower.hp / state.clockTower.maxHp * 100);
      const activePillars = state.pillars.filter(pp => pp.status !== "destroyed").length;
      html += `<div style="position:fixed;top:40%;left:50%;transform:translateX(-50%);text-align:center;
        font-size:11px;color:#887;line-height:2;">
        Tower: <span style="color:${tPct > 50 ? "#44aacc" : "#cc4444"}">${tPct}%</span> &bull;
        Pillars: <span style="color:${activePillars > 2 ? "#44aacc" : activePillars > 0 ? "#ccaa44" : "#cc4444"}">${activePillars}/4</span>
        ${state.turrets.length > 0 ? `&bull; Turrets: <span style="color:#44aacc">${state.turrets.length}</span>` : ""}
      </div>`;

      // Wave clear stats
      if (state.waveClearStats) {
        const wcs = state.waveClearStats;
        html += `<div style="position:fixed;top:30%;left:50%;transform:translateX(-50%);text-align:center;
          font-size:11px;color:#887;line-height:1.8;">
          Kills: ${wcs.kills} &bull; Damage: ${Math.floor(wcs.damage)} &bull;
          Gears: ${wcs.gears} &bull; Time: ${Math.floor(wcs.time)}s
        </div>`;
      }
    }

    // --- INTERMISSION: Buff select & upgrades ---
    if (state.phase === "intermission" && state.buffSelectActive) {
      html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;
        display:flex;flex-direction:column;justify-content:center;align-items:center;
        background:rgba(5,5,15,0.7);pointer-events:all;">
        <div style="font-size:22px;color:#ccaa44;margin-bottom:20px;letter-spacing:3px;">CHOOSE A BLESSING</div>
        <div style="display:flex;gap:16px;">
          ${state.buffChoices.map(b => `
            <button data-buff="${b.id}" style="pointer-events:all;padding:16px 24px;background:#111;
              border:2px solid #ccaa44;border-radius:8px;cursor:pointer;min-width:160px;text-align:center;">
              <div style="font-size:14px;color:#ccaa44;font-weight:bold;">${b.name}</div>
              <div style="font-size:11px;color:#aa8866;margin-top:6px;">${b.description}</div>
              <div style="font-size:10px;color:#665;margin-top:4px;">
                ${b.duration === -1 ? "Permanent" : `${b.duration} waves`}
              </div>
            </button>
          `).join("")}
        </div>
      </div>`;
    }

    // --- INTERMISSION: Upgrades ---
    if (state.phase === "intermission" && !state.buffSelectActive) {
      html += `<div style="position:fixed;bottom:120px;left:50%;transform:translateX(-50%);
        display:flex;gap:8px;pointer-events:all;">`;
      for (const upg of UPGRADES) {
        const level = p[upg.field];
        const cost = getUpgradeCost(upg, level);
        const maxed = level >= upg.maxLevel;
        const canBuy = p.gears >= cost && !maxed;
        html += `<button data-upgrade="${upg.id}" style="pointer-events:all;padding:8px 12px;
          background:${canBuy ? "#1a1510" : "#0a0a0a"};border:1px solid ${canBuy ? "#ccaa44" : "#333"};
          border-radius:6px;cursor:${canBuy ? "pointer" : "default"};min-width:100px;text-align:center;
          opacity:${canBuy ? 1 : 0.5};" title="${upg.description}">
          <div style="font-size:11px;color:#ccaa44;font-weight:bold;">${upg.name}</div>
          <div style="font-size:8px;color:#776;margin-top:2px;max-width:100px;line-height:1.3;">${upg.description}</div>
          <div style="font-size:9px;color:#887;margin-top:3px;">Lv ${level}/${upg.maxLevel}</div>
          ${!maxed ? `<div style="font-size:9px;color:#aa8844;margin-top:2px;">&#x2699; ${cost}</div>` :
            `<div style="font-size:9px;color:#44aa44;margin-top:2px;">MAX</div>`}
        </button>`;
      }
      html += `</div>`;
    }

    // --- GAME OVER ---
    if (state.phase === "game_over") {
      const isVictory = state.victory;
      const bgColor = isVictory ? "rgba(5,10,15,0.85)" : "rgba(10,5,5,0.85)";
      const titleColor = isVictory ? "#ffcc44" : "#cc4444";
      const titleShadow = isVictory ? "#886622" : "#882222";
      const title = isVictory ? "VICTORY" : "TIME'S UP";
      const subtitle = isVictory ? "The Clock Tower stands! You survived 12 hours." :
        state.clockTower.hp <= 0 ? "The Clock Tower has fallen..." : "The Clockwork Knight falls...";
      html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;
        display:flex;flex-direction:column;justify-content:center;align-items:center;
        background:${bgColor};pointer-events:all;">
        <div style="font-size:42px;font-weight:bold;color:${titleColor};text-shadow:0 0 20px ${titleShadow};
          letter-spacing:4px;margin-bottom:8px;">${title}</div>
        <div style="font-size:16px;color:#aa8866;margin-bottom:30px;">
          ${subtitle}
        </div>
        <div style="font-size:14px;color:#aa9966;margin-bottom:8px;">Wave ${state.wave} | Kills ${state.totalKills} | Hour ${state.clockHour}/12 | Time ${Math.floor(state.timeSurvived)}s</div>
        <div style="font-size:12px;color:#776;margin-bottom:8px;">
          Max Combo ${p.maxCombo} | Gears Earned ${state.stats.gearsEarned} | Damage Dealt ${Math.floor(state.stats.damageDealt)}
        </div>
        <div style="font-size:11px;color:#665;margin-bottom:20px;">
          Pillars Lost ${state.stats.pillarsLost} | Tower Damage ${Math.floor(state.stats.towerDamage)} | Abilities Used ${state.stats.abilitiesUsed}
        </div>
        <div style="display:flex;gap:12px;">
          <button id="pendulum-restart-btn" style="pointer-events:all;padding:12px 36px;font-size:16px;font-weight:bold;
            color:#ccaa44;background:#1a1510;border:2px solid #ccaa44;border-radius:6px;cursor:pointer;
            letter-spacing:2px;">RETRY</button>
          <button id="pendulum-exit-btn" style="pointer-events:all;padding:12px 36px;font-size:16px;
            color:#888;background:#111;border:2px solid #444;border-radius:6px;cursor:pointer;
            letter-spacing:2px;">EXIT</button>
        </div>
      </div>`;
    }

    // --- PAUSE ---
    if (state.paused && state.phase === "playing") {
      html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;
        display:flex;flex-direction:column;justify-content:center;align-items:center;
        background:rgba(5,5,15,0.6);pointer-events:all;">
        <div style="font-size:32px;color:#ccaa44;letter-spacing:4px;">PAUSED</div>
        <div style="font-size:12px;color:#776;margin-top:16px;">Press ESC to resume</div>
        <button id="pendulum-pause-exit-btn" style="pointer-events:all;padding:10px 30px;font-size:14px;
          color:#888;background:#111;border:2px solid #444;border-radius:6px;cursor:pointer;
          margin-top:20px;">EXIT TO MENU</button>
      </div>`;
    }

    // Screen flash overlay
    if (state.screenFlash.timer > 0) {
      const alpha = state.screenFlash.intensity * (state.screenFlash.timer / 0.3);
      html += `<div style="position:fixed;inset:0;background:${state.screenFlash.color};opacity:${alpha};pointer-events:none;"></div>`;
    }

    // Crosshair
    if (state.phase === "playing" && state.pointerLocked) {
      html += `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        width:2px;height:16px;background:#ccaa4488;"></div>
        <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        width:16px;height:2px;background:#ccaa4488;"></div>`;
    }

    // Dirty-check: only rebuild DOM when HTML actually changes
    // Use a fast hash of key state values to avoid string comparison of full HTML
    const hash = `${state.phase}|${state.wave}|${Math.floor(p.hp)}|${Math.floor(state.clockTower.hp)}|${state.paused}|${p.combo}|${state.aliveEnemyCount}|${Math.floor(p.gears)}|${state.buffSelectActive}|${p.blocking}|${state.timeStopActive}|${state.victory}|${Math.floor(state.phaseTimer)}|${state.waveModifier}|${p.action}|${state.notifications.length}|${state.damageIndicators.length}|${Math.floor(state.pendulumPower * 10)}|${state.turrets.length}|${p.killStreak}`;

    if (hash !== this._lastHtmlHash) {
      this._lastHtmlHash = hash;
      this._root.innerHTML = html;
      // Attach event listeners only when DOM rebuilt
      this._attachEvents(state);
    }

    // Update minimap
    this._drawMinimap(state);

    // Draw damage numbers on canvas
    this._drawDamageNumbers(state);
  }

  private _attachEvents(state: PendulumState): void {
    // Difficulty select
    this._root.querySelectorAll("[data-diff]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.difficulty = btn.getAttribute("data-diff") as typeof state.difficulty;
      });
    });

    // Play button
    const playBtn = this._root.querySelector("#pendulum-play-btn");
    if (playBtn) {
      playBtn.addEventListener("click", () => {
        state.phase = "intermission";
        state.phaseTimer = 2;
      });
    }

    // Restart
    const restartBtn = this._root.querySelector("#pendulum-restart-btn");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        window.dispatchEvent(new Event("pendulumRestart"));
      });
    }

    // Exit buttons
    const exitBtn = this._root.querySelector("#pendulum-exit-btn");
    if (exitBtn) exitBtn.addEventListener("click", () => this._onExit?.());
    const pauseExitBtn = this._root.querySelector("#pendulum-pause-exit-btn");
    if (pauseExitBtn) pauseExitBtn.addEventListener("click", () => this._onExit?.());

    // Buff selection
    this._root.querySelectorAll("[data-buff]").forEach(btn => {
      btn.addEventListener("click", () => {
        const buffId = btn.getAttribute("data-buff") as string;
        applyBuff(state, buffId as any);
      });
    });

    // Upgrades
    this._root.querySelectorAll("[data-upgrade]").forEach(btn => {
      btn.addEventListener("click", () => {
        const upgId = btn.getAttribute("data-upgrade") as string;
        const upg = UPGRADES.find(u => u.id === upgId);
        if (!upg) return;
        const level = state.player[upg.field];
        const cost = getUpgradeCost(upg, level);
        if (state.player.gears >= cost && level < upg.maxLevel) {
          state.player.gears -= cost;
          (state.player as any)[upg.field] = level + 1;

          // Armor upgrade HP bonus
          if (upg.id === "armor") {
            state.player.maxHp += 12;
            state.player.hp += 12;
          }
          if (upg.id === "speed") {
            state.player.maxStamina += 10;
            state.player.stamina += 10;
          }
          if (upg.id === "pillar") {
            // Pillar Ward: +30 HP per level to all pillars
            for (const pil of state.pillars) {
              pil.maxHp += 30;
              if (pil.status !== "destroyed") pil.hp += 30;
            }
          }
        }
      });
    });
  }

  private _drawMinimap(state: PendulumState): void {
    const ctx = this._minimapCtx;
    const w = 140, h = 140;
    ctx.clearRect(0, 0, w, h);

    const scale = w / PENDULUM.GROUND_SIZE;
    const cx = w / 2, cy = h / 2;

    // Tower (center)
    ctx.fillStyle = "#ccaa44";
    ctx.fillRect(cx - 3, cy - 3, 6, 6);

    // Pillars
    for (const pil of state.pillars) {
      const px = cx + pil.pos.x * scale;
      const py = cy + pil.pos.z * scale;
      ctx.fillStyle = pil.status === "active" ? "#44aacc" : pil.status === "damaged" ? "#cc8844" : "#333";
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }

    // Enemies
    ctx.fillStyle = "#cc4444";
    for (const enemy of state.enemies.values()) {
      if (enemy.behavior === "dead") continue;
      const px = cx + enemy.pos.x * scale;
      const py = cy + enemy.pos.z * scale;
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }

    // Turrets
    ctx.fillStyle = "#44aacc";
    for (const turret of state.turrets) {
      const tx = cx + turret.pos.x * scale;
      const ty = cy + turret.pos.z * scale;
      ctx.fillRect(tx - 2, ty - 2, 4, 4);
    }

    // Dash trails
    ctx.fillStyle = "#6688cc33";
    for (const trail of state.dashTrails) {
      const tx = cx + trail.pos.x * scale;
      const ty = cy + trail.pos.z * scale;
      const r = trail.radius * scale;
      ctx.beginPath();
      ctx.arc(tx, ty, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player
    const pp = state.player.pos;
    const px = cx + pp.x * scale;
    const py = cy + pp.z * scale;
    ctx.fillStyle = "#44ffaa";
    ctx.fillRect(px - 2, py - 2, 4, 4);

    // Time slow zones
    ctx.strokeStyle = "#4488ff44";
    ctx.lineWidth = 1;
    for (const zone of state.timeSlowZones) {
      const zx = cx + zone.pos.x * scale;
      const zy = cy + zone.pos.z * scale;
      const r = zone.radius * scale;
      ctx.beginPath();
      ctx.arc(zx, zy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private _drawDamageNumbers(state: PendulumState): void {
    const ctx = this._dmgCtx;
    ctx.clearRect(0, 0, this._dmgCanvas.width, this._dmgCanvas.height);

    // Simple screen-space projection for damage numbers
    const sw = this._dmgCanvas.width, sh = this._dmgCanvas.height;
    const p = state.player;

    for (const dn of state.damageNumbers) {
      // Rough world-to-screen (simplified for HUD)
      const dx = dn.pos.x - p.pos.x;
      const dz = dn.pos.z - p.pos.z;
      const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
      const fwd = -(dx * sinY + dz * cosY);
      const right = dx * cosY - dz * sinY;

      if (fwd < 1) continue; // behind camera

      const screenX = sw / 2 + (right / fwd) * sw * 0.5;
      const screenY = sh / 2 - ((dn.pos.y - p.pos.y - 1) / fwd) * sh * 0.5;

      const alpha = Math.min(1, dn.timer);
      const size = dn.crit ? 20 : 14;
      const color = `#${dn.color.toString(16).padStart(6, "0")}`;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${size}px 'Segoe UI', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = dn.crit ? 8 : 4;
      ctx.fillText(String(dn.value), screenX, screenY);
      ctx.restore();
    }
  }

  cleanup(): void {
    if (this._root.parentNode) this._root.parentNode.removeChild(this._root);
    if (this._minimapCanvas.parentNode) this._minimapCanvas.parentNode.removeChild(this._minimapCanvas);
    if (this._dmgCanvas.parentNode) this._dmgCanvas.parentNode.removeChild(this._dmgCanvas);
    if (this._onResize) window.removeEventListener("resize", this._onResize);
  }
}
