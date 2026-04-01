// ---------------------------------------------------------------------------
// Owls: Night Hunter — HTML HUD overlay
// ---------------------------------------------------------------------------

import { OWL, UPGRADES, getUpgradeCost } from "../config/OwlsConfig";
import type { OwlsState } from "../state/OwlsState";

export class OwlsHUD {
  private _root!: HTMLDivElement;
  private _minimapCanvas!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;
  private _onExit: (() => void) | null = null;

  build(onExit: () => void): void {
    this._onExit = onExit;

    this._root = document.createElement("div");
    this._root.id = "owls-hud";
    this._root.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      pointer-events:none; z-index:20; font-family:'Segoe UI',Arial,sans-serif;
      color:#eee; user-select:none;
    `;
    document.body.appendChild(this._root);

    // Persistent minimap canvas
    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 130;
    this._minimapCanvas.height = 130;
    this._minimapCanvas.style.cssText = `
      position:fixed; bottom:16px; right:16px; width:130px; height:130px;
      border-radius:50%; border:2px solid #22334480; z-index:21;
      pointer-events:none; background:#0a0a14;
    `;
    document.body.appendChild(this._minimapCanvas);
    this._minimapCtx = this._minimapCanvas.getContext("2d")!;
  }

  update(state: OwlsState): void {
    const p = state.player;
    let html = "";

    // Persist high score
    if (state.bestWave > 0) {
      const stored = parseInt(localStorage.getItem("owls_best_wave") || "0", 10);
      if (state.bestWave > stored) localStorage.setItem("owls_best_wave", String(state.bestWave));
      const storedScore = parseInt(localStorage.getItem("owls_best_score") || "0", 10);
      if (p.score > storedScore) localStorage.setItem("owls_best_score", String(p.score));
    }
    // Load persisted best on menu
    if (state.phase === "menu" && state.bestWave === 0) {
      const stored = parseInt(localStorage.getItem("owls_best_wave") || "0", 10);
      if (stored > 0) state.bestWave = stored;
    }

    // ==================== SCREEN VIGNETTE ====================
    if (state.phase === "hunting") {
      let vignetteColor = "transparent";
      let vignetteOpacity = 0;
      if (p.isDiving) { vignetteColor = "#ff220030"; vignetteOpacity = 0.3; }
      else if (p.isSilentGlide) { vignetteColor = "#2244ff20"; vignetteOpacity = 0.25; }
      else if (p.stamina < 20) { vignetteColor = "#00000040"; vignetteOpacity = 0.3; }
      if (vignetteOpacity > 0) {
        html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;
          background:radial-gradient(ellipse at center, transparent 50%, ${vignetteColor} 100%);
          opacity:${vignetteOpacity};"></div>`;
      }
    }

    // ==================== SCREEN FLASH ====================
    if (state.screenFlash > 0.01) {
      html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;
        background:${state.screenFlashColor};opacity:${Math.min(state.screenFlash, 0.4)};"></div>`;
    }

    // ==================== MENU ====================
    if (state.phase === "menu") {
      html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;
        align-items:center;justify-content:center;pointer-events:auto;background:radial-gradient(ellipse at center, rgba(4,3,24,0.3) 0%, rgba(4,3,24,0.85) 100%);">
        <div style="font-size:72px;font-weight:100;letter-spacing:16px;color:#ffaa44;text-shadow:0 0 40px #ffaa0060, 0 0 80px #ff880030;
          font-family:Georgia,serif;margin-bottom:8px;">OWLS</div>
        <div style="font-size:16px;letter-spacing:6px;color:#8888aa;margin-bottom:50px;">NIGHT HUNTER</div>
        ${state.bestWave > 0 ? `<div style="font-size:13px;color:#666;margin-bottom:20px;">BEST: WAVE ${state.bestWave}</div>` : ""}
        <div style="display:flex;gap:16px;margin-bottom:30px;">
          ${(["easy", "normal", "hard"] as const).map(d => {
            const colors = { easy: "#44aa66", normal: "#4488cc", hard: "#cc4422" };
            const sel = state.difficulty === d;
            return `<button id="owls-diff-${d}" style="padding:10px 24px;font-size:14px;letter-spacing:2px;
              background:${sel ? colors[d] + "40" : "transparent"};border:1px solid ${colors[d]};color:${colors[d]};
              cursor:pointer;pointer-events:auto;font-family:inherit;
              ${sel ? "box-shadow:0 0 15px " + colors[d] + "40;" : ""}">${d.toUpperCase()}</button>`;
          }).join("")}
        </div>
        <button id="owls-start" style="padding:14px 48px;font-size:18px;letter-spacing:4px;
          background:rgba(255,170,0,0.15);border:1px solid #ffaa44;color:#ffaa44;cursor:pointer;
          pointer-events:auto;font-family:inherit;text-shadow:0 0 10px #ffaa0060;
          transition:all 0.2s;">BEGIN THE HUNT</button>
        <div style="margin-top:40px;font-size:11px;color:#555;line-height:1.8;">
          WASD — Fly &nbsp;&nbsp; Mouse — Steer &nbsp;&nbsp; Space — Dive &nbsp;&nbsp; Shift — Silent Glide<br>
          E — Screech &nbsp;&nbsp; Q — Barrel Roll &nbsp;&nbsp; ESC — Pause<br>
          Swoop close to prey to catch them. Meet the quota before dawn.
        </div>
        <button id="owls-exit" style="position:absolute;top:16px;left:16px;padding:6px 16px;
          font-size:12px;background:rgba(255,255,255,0.05);border:1px solid #444;color:#888;
          cursor:pointer;pointer-events:auto;font-family:inherit;">EXIT</button>
      </div>`;
    }

    // ==================== HUNTING HUD ====================
    if (state.phase === "hunting") {
      const timeLeft = Math.ceil(Math.max(0, state.nightTimer));
      const timeUrgent = timeLeft <= 15;
      const waveMod = OWL.WAVE_MODIFIERS[state.waveModifierIndex];

      // Top bar
      html += `<div style="position:absolute;top:14px;left:50%;transform:translateX(-50%);text-align:center;">
        <div style="font-size:13px;color:#8888aa;letter-spacing:3px;">WAVE ${state.wave}
          ${waveMod.id !== "none" ? `<span style="color:${waveMod.color};font-weight:bold;margin-left:6px;">${waveMod.name}</span>` : ""}</div>
        <div style="font-size:${timeUrgent ? 28 : 18}px;color:${timeUrgent ? "#ff4444" : state.gracePeriod ? "#ff8844" : "#ccccdd"};
          ${timeUrgent ? "text-shadow:0 0 15px #ff222080;" : "text-shadow:0 0 8px #44448840;"}
          font-weight:300;margin-top:2px;">${state.gracePeriod ? `GRACE ${Math.ceil(Math.max(0, state.gracePeriodTimer))}s` : `${timeLeft}s`}</div>
      </div>`;

      // Prey counter
      const quotaMet = state.preyCaughtThisWave >= state.quota;
      html += `<div style="position:absolute;top:14px;right:20px;text-align:right;">
        <div style="font-size:12px;color:#888;letter-spacing:2px;">CAUGHT</div>
        <div style="font-size:24px;font-weight:bold;color:${quotaMet ? "#44ff88" : "#ffaa44"};
          text-shadow:0 0 10px ${quotaMet ? "#44ff8840" : "#ffaa4440"};">
          ${state.preyCaughtThisWave}<span style="font-size:14px;color:#666;font-weight:300;">/${state.quota}</span>
        </div>
        <div style="font-size:11px;color:#555;">${Math.max(0, state.preyTotalThisWave - state.preyCaughtThisWave)} remaining</div>
      </div>`;

      // Score
      html += `<div style="position:absolute;top:14px;left:20px;">
        <div style="font-size:12px;color:#888;letter-spacing:2px;">SCORE</div>
        <div style="font-size:22px;color:#ffdd88;font-weight:300;text-shadow:0 0 8px #ffaa4430;">${p.score}</div>
      </div>`;

      // HP bar (top left under score)
      const hpPct = (p.hp / OWL.HP_MAX) * 100;
      const hpColor = p.hp <= OWL.LOW_HP_THRESHOLD ? "#ff2222" : p.hp <= 60 ? "#ffaa44" : "#44ff88";
      const hpFlash = p.invulnTimer > 0 && Math.sin(state.gameTime * 20) > 0;
      html += `<div style="position:absolute;top:60px;left:20px;width:100px;">
        <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;
          ${hpFlash ? "box-shadow:0 0 8px #ff222060;" : ""}">
          <div style="width:${hpPct}%;height:100%;background:${hpColor};border-radius:3px;
            transition:width 0.15s;box-shadow:0 0 4px ${hpColor}60;"></div>
        </div>
        <div style="font-size:9px;color:#666;margin-top:2px;letter-spacing:1px;">HP ${Math.ceil(p.hp)}</div>
      </div>`;

      // Low HP vignette warning
      if (p.hp <= OWL.LOW_HP_THRESHOLD && p.hp > 0) {
        const hpWarnAlpha = 0.15 + 0.1 * Math.sin(state.gameTime * 4);
        html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;
          background:radial-gradient(ellipse at center, transparent 40%, rgba(255,0,0,${hpWarnAlpha}) 100%);"></div>`;
      }

      // Combo + timer bar
      if (p.combo >= 2) {
        const comboAlpha = Math.min(1, p.comboTimer / 1);
        const comboColor = p.combo >= 8 ? "#ff44ff" : p.combo >= 5 ? "#ff4444" : p.combo >= 3 ? "#ffaa44" : "#ffdd88";
        const comboScale = 1 + Math.min(p.combo * 0.04, 0.4);
        const comboTimerPct = (p.comboTimer / OWL.COMBO_DECAY_TIME) * 100;
        html += `<div style="position:absolute;top:80px;left:50%;transform:translateX(-50%) scale(${comboScale});
          text-align:center;opacity:${comboAlpha};">
          <div style="font-size:32px;font-weight:bold;color:${comboColor};text-shadow:0 0 20px ${comboColor}60;">
            ${p.combo}x</div>
          <div style="font-size:11px;color:${comboColor};letter-spacing:3px;">COMBO</div>
          <div style="width:60px;height:2px;background:rgba(255,255,255,0.1);border-radius:1px;margin:4px auto 0;overflow:hidden;">
            <div style="width:${comboTimerPct}%;height:100%;background:${comboColor};border-radius:1px;
              transition:width 0.1s;"></div>
          </div>
        </div>`;
      }

      // Active buff indicator
      if (state.activeBuff) {
        const buff = state.activeBuff;
        const buffPct = (buff.timer / buff.maxTimer) * 100;
        const buffHex = "#" + buff.color.toString(16).padStart(6, "0");
        html += `<div style="position:absolute;top:50px;left:50%;transform:translateX(-50%);text-align:center;">
          <div style="font-size:12px;font-weight:bold;color:${buffHex};letter-spacing:2px;text-shadow:0 0 8px ${buffHex}60;">
            ${buff.name}</div>
          <div style="width:80px;height:3px;background:rgba(255,255,255,0.1);border-radius:2px;margin:3px auto 0;overflow:hidden;">
            <div style="width:${buffPct}%;height:100%;background:${buffHex};border-radius:2px;"></div>
          </div>
        </div>`;
      }

      // Stamina bar
      const stPct = (p.stamina / OWL.STAMINA_MAX) * 100;
      const stColor = p.stamina < 20 ? "#ff4444" : p.isSilentGlide ? "#4488ff" : "#44ffaa";
      html += `<div style="position:absolute;bottom:40px;left:50%;transform:translateX(-50%);width:200px;">
        <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
          <div style="width:${stPct}%;height:100%;background:${stColor};border-radius:2px;
            transition:width 0.1s;box-shadow:0 0 8px ${stColor}60;"></div>
        </div>
        <div style="text-align:center;font-size:10px;color:#666;margin-top:4px;letter-spacing:2px;">
          ${p.isSilentGlide ? "SILENT GLIDE" : p.isDiving ? "DIVING" : p.barrelRollTimer > 0 ? "BARREL ROLL" : "STAMINA"}</div>
      </div>`;

      // Ability cooldowns
      const cds: string[] = [];
      if (p.screechCooldown > 0) cds.push(`SCREECH ${Math.ceil(p.screechCooldown)}s`);
      if (p.barrelRollCooldown > 0) cds.push(`ROLL ${Math.ceil(p.barrelRollCooldown)}s`);
      if (cds.length) {
        html += `<div style="position:absolute;bottom:70px;left:50%;transform:translateX(-50%);
          font-size:11px;color:#6688ff;letter-spacing:1px;">${cds.join(" &nbsp; ")}</div>`;
      }

      // Crosshair
      html += `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">
        <div style="width:20px;height:20px;border:1px solid rgba(255,200,100,0.4);border-radius:50%;
          box-shadow:0 0 10px rgba(255,170,0,0.15);"></div>
      </div>`;

      // Altitude indicator (left side)
      const altPct = Math.min(100, (p.y / OWL.MAX_HEIGHT) * 100);
      html += `<div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:3px;height:80px;
        background:rgba(255,255,255,0.08);border-radius:2px;">
        <div style="position:absolute;bottom:0;width:100%;height:${altPct}%;background:#4488aa40;border-radius:2px;"></div>
        <div style="position:absolute;bottom:${altPct}%;left:6px;font-size:9px;color:#4488aa;white-space:nowrap;">
          ${Math.round(p.y)}m</div>
      </div>`;

      // Speed indicator
      const speedPct = (p.speed / (OWL.FLY_SPEED_MAX * 1.5)) * 100;
      if (p.isDiving || p.speed > OWL.FLY_SPEED * 1.2) {
        html += `<div style="position:absolute;bottom:40px;right:20px;width:4px;height:80px;
          background:rgba(255,255,255,0.1);border-radius:2px;">
          <div style="position:absolute;bottom:0;width:100%;height:${Math.min(speedPct, 100)}%;
            background:${p.isDiving ? "#ff4444" : "#ffaa44"};border-radius:2px;
            box-shadow:0 0 6px ${p.isDiving ? "#ff222060" : "#ffaa4440"};"></div>
        </div>`;
      }

      // Prey compass (directional indicators at screen edges)
      html += this._renderPreyCompass(state);

      // Notifications (staggered vertically)
      let notifIdx = 0;
      for (const n of state.notifications) {
        const alpha = Math.min(1, n.timer / 0.5);
        const yOffset = 35 + n.y + notifIdx * 3;
        html += `<div style="position:absolute;top:${yOffset}%;left:50%;transform:translateX(-50%);
          font-size:16px;font-weight:bold;color:${n.color};opacity:${alpha};
          text-shadow:0 0 10px ${n.color}60;letter-spacing:2px;pointer-events:none;">${n.text}</div>`;
        notifIdx++;
      }

      // Tutorial hints (wave 1 only)
      if (state.tutorialWave && state.gameTime < 15) {
        const tutAlpha = Math.max(0, 1 - state.gameTime / 15);
        html += `<div style="position:absolute;bottom:100px;left:50%;transform:translateX(-50%);text-align:center;
          opacity:${tutAlpha};pointer-events:none;">
          <div style="font-size:12px;color:#888;line-height:1.8;background:rgba(0,0,0,0.3);padding:10px 20px;border-radius:8px;">
            Click to lock mouse &nbsp; | &nbsp; Fly with WASD &nbsp; | &nbsp; Look down + SPACE to dive<br>
            Swoop near prey to catch them &nbsp; | &nbsp; Chain catches for combo bonus<br>
            SHIFT = silent approach &nbsp; | &nbsp; E = screech stun &nbsp; | &nbsp; Q = barrel roll (dodge)
          </div>
        </div>`;
      }

      // Prey type legend (bottom-left, small)
      html += `<div style="position:absolute;bottom:20px;left:16px;font-size:9px;color:#555;line-height:1.6;">
        <span style="color:#887766;">&#9679;</span> Mouse 10pt &nbsp;
        <span style="color:#665544;">&#9679;</span> Vole 15pt &nbsp;
        <span style="color:#aa9977;">&#9679;</span> Rabbit 25pt<br>
        <span style="color:#44aa44;">&#9679;</span> Frog 20pt &nbsp;
        <span style="color:#ccccbb;">&#9679;</span> Moth 35pt
      </div>`;

      // Screech ready indicator
      if (p.screechCooldown <= 0 && p.stamina >= 35) {
        html += `<div style="position:absolute;bottom:74px;left:50%;transform:translateX(-50%);
          font-size:10px;color:#88aaff60;letter-spacing:1px;">[E] SCREECH READY</div>`;
      }

      // Draw minimap
      this._drawMinimap(state);
      this._minimapCanvas.style.display = "";
    } else {
      this._minimapCanvas.style.display = "none";
    }

    // ==================== PAUSE ====================
    if (state.paused && state.phase === "hunting") {
      html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;
        background:rgba(0,0,0,0.7);display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div style="font-size:36px;color:#ffaa44;letter-spacing:6px;font-weight:300;">PAUSED</div>
        <div style="margin-top:30px;font-size:12px;color:#888;line-height:2;">
          WASD — Fly &nbsp; | &nbsp; Mouse — Steer<br>
          SPACE — Dive (look down + press, costs stamina)<br>
          SHIFT — Silent Glide (prey lose track of you)<br>
          E — Screech (stuns nearby prey in radius)<br>
          Q — Barrel Roll (invulnerable during roll)<br>
          ESC — Pause<br><br>
          <span style="color:#666;">Catch prey by flying close at speed. Chain catches for combos.<br>
          Meet the quota before dawn. Collect glowing orbs for power-ups.</span>
        </div>
      </div>`;
    }

    // ==================== REST (Upgrades + Wave Summary) ====================
    if (state.phase === "rest") {
      const timeLeft = Math.ceil(Math.max(0, state.nightTimer));
      const ws = state.lastWaveStats;
      html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;
        display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;
        background:radial-gradient(ellipse at center, rgba(4,3,24,0.2) 0%, rgba(4,3,24,0.75) 100%);">
        <div style="font-size:14px;color:#888;letter-spacing:4px;margin-bottom:5px;">WAVE ${state.wave} COMPLETE</div>
        <div style="font-size:32px;color:#44ff88;font-weight:300;letter-spacing:2px;text-shadow:0 0 15px #44ff8840;margin-bottom:5px;">
          REST</div>`;

      // Wave summary
      if (ws) {
        html += `<div style="display:flex;gap:20px;margin-bottom:15px;font-size:12px;color:#aaa;">
          <span>Caught: <b style="color:#ffaa44">${ws.caught}/${ws.total}</b></span>
          <span>Score: <b style="color:#ffdd88">+${ws.scoreEarned}</b></span>
          <span>Best combo: <b style="color:#ff88ff">${ws.bestCombo}x</b></span>
          ${ws.perfectWave ? '<span style="color:#ffaa00;font-weight:bold;">PERFECT!</span>' : ""}
          ${ws.modifier ? `<span style="color:#888;">${ws.modifier}</span>` : ""}
        </div>`;
      }

      html += `<div style="font-size:13px;color:#ffdd88;margin-bottom:20px;">Score: ${p.score} &nbsp; | &nbsp; Next wave in ${timeLeft}s</div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;max-width:700px;justify-content:center;">
          ${UPGRADES.map(u => {
            const lvl = p.upgrades[u.id] ?? 0;
            const maxed = lvl >= u.maxLevel;
            const cost = getUpgradeCost(lvl);
            const canAfford = p.score >= cost && !maxed;
            return `<div id="owls-upgrade-${u.id}" style="width:200px;padding:12px;
              background:rgba(255,255,255,${canAfford ? "0.08" : "0.03"});
              border:1px solid ${maxed ? "#44ff8840" : canAfford ? "#ffaa4460" : "#33333360"};
              cursor:${canAfford ? "pointer" : "default"};pointer-events:${canAfford ? "auto" : "none"};
              opacity:${maxed ? 0.5 : canAfford ? 1 : 0.6};">
              <div style="font-size:13px;font-weight:bold;color:${maxed ? "#44ff88" : "#ffaa44"};">${u.name}</div>
              <div style="font-size:11px;color:#888;margin:4px 0;">${u.desc}</div>
              <div style="font-size:10px;color:#666;">${u.effect}</div>
              <div style="font-size:11px;color:#aaa;margin-top:6px;">
                Lv ${lvl}/${u.maxLevel} ${maxed ? '<span style="color:#44ff88;">MAX</span>' : `— Cost: <span style="color:${canAfford ? "#ffdd88" : "#ff4444"}">${cost}</span>`}
              </div>
            </div>`;
          }).join("")}
        </div>
        <button id="owls-skip-rest" style="margin-top:20px;padding:10px 30px;font-size:13px;letter-spacing:2px;
          background:rgba(255,170,0,0.1);border:1px solid #ffaa44;color:#ffaa44;
          cursor:pointer;pointer-events:auto;font-family:inherit;">HUNT NOW</button>
      </div>`;
    }

    // ==================== GAME OVER ====================
    if (state.phase === "game_over") {
      html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;
        display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;
        background:radial-gradient(ellipse at center, rgba(20,5,5,0.5) 0%, rgba(4,3,24,0.9) 100%);">
        <div style="font-size:14px;color:#ff666680;letter-spacing:4px;margin-bottom:8px;">DAWN BREAKS</div>
        <div style="font-size:48px;color:#ff4444;font-weight:200;letter-spacing:4px;
          text-shadow:0 0 30px #ff222040;margin-bottom:20px;">THE HUNT IS OVER</div>
        <div style="font-size:16px;color:#aaa;margin-bottom:12px;">
          Reached Wave ${state.wave} &nbsp; | &nbsp; Score: ${p.score}
        </div>
        <div style="display:flex;gap:24px;margin-bottom:12px;font-size:13px;color:#999;">
          <span>Prey caught: <b style="color:#ffaa44">${p.totalCaught}</b></span>
          <span>Best combo: <b style="color:#ff88ff">${p.bestCombo}x</b></span>
          <span>${p.hp <= 0 ? '<span style="color:#ff4444">Owl fell!</span>' : `Needed <b style="color:#ff8844">${Math.max(0, state.quota - state.preyCaughtThisWave)}</b> more`}</span>
        </div>
        ${(() => {
          const bestWave = parseInt(localStorage.getItem("owls_best_wave") || "0", 10);
          const bestScore = parseInt(localStorage.getItem("owls_best_score") || "0", 10);
          const isNewBestWave = state.wave >= bestWave && state.wave > 1;
          const isNewBestScore = p.score >= bestScore && p.score > 0;
          return `<div style="font-size:12px;color:#666;margin-bottom:20px;">
            Best wave: ${Math.max(bestWave, state.bestWave)} ${isNewBestWave ? '<span style="color:#ffaa00;"> NEW!</span>' : ""}
            &nbsp; | &nbsp; Best score: ${Math.max(bestScore, p.score)} ${isNewBestScore ? '<span style="color:#ffaa00;"> NEW!</span>' : ""}
          </div>`;
        })()}
        <div style="display:flex;gap:16px;">
          <button id="owls-restart" style="padding:12px 36px;font-size:15px;letter-spacing:3px;
            background:rgba(255,170,0,0.1);border:1px solid #ffaa44;color:#ffaa44;
            cursor:pointer;pointer-events:auto;font-family:inherit;">HUNT AGAIN</button>
          <button id="owls-menu" style="padding:12px 36px;font-size:15px;letter-spacing:3px;
            background:rgba(255,255,255,0.05);border:1px solid #555;color:#888;
            cursor:pointer;pointer-events:auto;font-family:inherit;">MENU</button>
        </div>
      </div>`;
    }

    this._root.innerHTML = html;

    // ---- Bind events ----
    this._bindButton("owls-start", () => window.dispatchEvent(new Event("owlsStartHunt")));
    this._bindButton("owls-exit", () => { if (this._onExit) this._onExit(); });
    for (const d of ["easy", "normal", "hard"] as const) {
      this._bindButton(`owls-diff-${d}`, () => { state.difficulty = d; });
    }
    this._bindButton("owls-restart", () => window.dispatchEvent(new Event("owlsRestart")));
    this._bindButton("owls-menu", () => window.dispatchEvent(new Event("owlsBackToMenu")));
    this._bindButton("owls-skip-rest", () => window.dispatchEvent(new Event("owlsStartHunt")));
    for (const u of UPGRADES) {
      this._bindButton(`owls-upgrade-${u.id}`, () => {
        const lvl = p.upgrades[u.id] ?? 0;
        if (lvl >= u.maxLevel) return;
        const cost = getUpgradeCost(lvl);
        if (p.score >= cost) { p.score -= cost; p.upgrades[u.id] = lvl + 1; }
      });
    }
  }

  // ---- Prey Compass ----
  private _renderPreyCompass(state: OwlsState): string {
    const p = state.player;
    const sw = state.screenW, sh = state.screenH;
    let html = "";
    const maxIndicators = 8;
    let count = 0;

    // Sort by distance, show nearest
    const sorted = [...state.prey.values()]
      .filter(pr => pr.state !== "caught")
      .map(pr => {
        const dx = pr.x - p.x, dz = pr.z - p.z;
        return { prey: pr, dist: Math.sqrt(dx * dx + dz * dz), angle: Math.atan2(dx, dz) };
      })
      .sort((a, b) => a.dist - b.dist);

    for (const { prey, dist, angle } of sorted) {
      if (count >= maxIndicators) break;
      if (dist < 15 || dist > 200) continue;

      // Project angle relative to player yaw to screen position
      let relAngle = angle - p.yaw;
      while (relAngle > Math.PI) relAngle -= Math.PI * 2;
      while (relAngle < -Math.PI) relAngle += Math.PI * 2;

      // Only show if outside FOV center
      if (Math.abs(relAngle) < 0.6) continue;

      const margin = 40;
      let cx: number, cy: number;
      if (relAngle > 0) {
        cx = sw - margin; cy = sh / 2 + (relAngle - 1) * sh * 0.3;
      } else {
        cx = margin; cy = sh / 2 + (-relAngle - 1) * sh * 0.3;
      }
      cy = Math.max(margin + 60, Math.min(sh - margin, cy));

      const alpha = Math.max(0.2, Math.min(0.8, 1 - dist / 150));
      const preyColor = prey.type === "moth" ? "#ccccaa" : prey.type === "rabbit" ? "#aa9977" : prey.type === "frog" ? "#44aa44" : "#887766";
      const size = prey.state === "stunned" ? 8 : 6;

      html += `<div style="position:absolute;left:${cx}px;top:${cy}px;transform:translate(-50%,-50%);
        width:${size}px;height:${size}px;border-radius:50%;background:${preyColor};
        opacity:${alpha};box-shadow:0 0 6px ${preyColor}80;pointer-events:none;"></div>`;
      count++;
    }
    return html;
  }

  // ---- Minimap ----
  private _drawMinimap(state: OwlsState): void {
    const ctx = this._minimapCtx;
    const w = 130, h = 130, cx = w / 2, cy = h / 2;
    const scale = (w * 0.45) / OWL.ARENA_RADIUS;

    ctx.clearRect(0, 0, w, h);

    // Background circle
    ctx.beginPath();
    ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = "#0a0a14";
    ctx.fill();

    // Arena border
    ctx.beginPath();
    ctx.arc(cx, cy, OWL.ARENA_RADIUS * scale, 0, Math.PI * 2);
    ctx.strokeStyle = "#22334480";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Trees (tiny dots)
    ctx.fillStyle = "#1a3a2a80";
    for (const t of state.trees) {
      const mx = cx + t.x * scale;
      const mz = cy + t.z * scale;
      ctx.fillRect(mx - 0.5, mz - 0.5, 1, 1);
    }

    // Prey dots
    for (const prey of state.prey.values()) {
      if (prey.state === "caught") continue;
      const mx = cx + prey.x * scale;
      const mz = cy + prey.z * scale;
      ctx.fillStyle = prey.state === "stunned" ? "#8888ff" : prey.state === "fleeing" ? "#ff6644" : "#ffaa44";
      ctx.beginPath();
      ctx.arc(mx, mz, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player owl (triangle showing direction)
    const px = cx + state.player.x * scale;
    const pz = cy + state.player.z * scale;
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(state.player.yaw);
    ctx.fillStyle = "#ffaa44";
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(-2.5, 3);
    ctx.lineTo(2.5, 3);
    ctx.closePath();
    ctx.fill();
    // View cone
    ctx.fillStyle = "#ffaa4420";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-12, -25);
    ctx.lineTo(12, -25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private _bindButton(id: string, cb: () => void): void {
    const el = document.getElementById(id);
    if (el) { el.style.pointerEvents = "auto"; el.onclick = cb; }
  }

  cleanup(): void {
    if (this._root?.parentNode) this._root.parentNode.removeChild(this._root);
    if (this._minimapCanvas?.parentNode) this._minimapCanvas.parentNode.removeChild(this._minimapCanvas);
  }
}
