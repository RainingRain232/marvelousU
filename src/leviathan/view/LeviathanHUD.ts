// ---------------------------------------------------------------------------
// Leviathan — The Deep Descent — HTML HUD overlay
// ---------------------------------------------------------------------------

import { LEVIATHAN } from "../config/LeviathanConfig";
import type { LeviathanState } from "../state/LeviathanState";
import { UPGRADES, getUpgradeCost } from "../state/LeviathanState";
import { purchaseUpgrade } from "../systems/LeviathanSystem";

export class LeviathanHUD {
  private _root!: HTMLDivElement;
  private _dmgCanvas!: HTMLCanvasElement;
  private _dmgCtx!: CanvasRenderingContext2D;
  private _onExit: (() => void) | null = null;
  private _onResize: (() => void) | null = null;
  private _lastHash = "";

  private _minimapCanvas!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;

  build(onExit: () => void): void {
    this._onExit = onExit;
    this._root = document.createElement("div");
    this._root.id = "leviathan-hud";
    this._root.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:20;font-family:'Segoe UI',Arial,sans-serif;color:#cde;user-select:none;`;
    document.body.appendChild(this._root);

    // Minimap canvas
    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 130; this._minimapCanvas.height = 130;
    this._minimapCanvas.style.cssText = `position:fixed;bottom:16px;left:16px;width:130px;height:130px;border-radius:50%;border:2px solid #224;z-index:21;pointer-events:none;background:#040810;`;
    document.body.appendChild(this._minimapCanvas);
    this._minimapCtx = this._minimapCanvas.getContext("2d")!;

    this._dmgCanvas = document.createElement("canvas");
    this._dmgCanvas.width = window.innerWidth; this._dmgCanvas.height = window.innerHeight;
    this._dmgCanvas.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:22;`;
    document.body.appendChild(this._dmgCanvas);
    this._dmgCtx = this._dmgCanvas.getContext("2d")!;

    this._onResize = () => { this._dmgCanvas.width = window.innerWidth; this._dmgCanvas.height = window.innerHeight; };
    window.addEventListener("resize", this._onResize);
  }

  update(state: LeviathanState): void {
    const p = state.player;
    let html = "";

    // ---- MENU ----
    if (state.phase === "menu") {
      html += `<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;background:linear-gradient(180deg,rgba(2,4,10,0.9),rgba(4,8,16,0.95));pointer-events:all;">
        <div style="font-size:52px;font-weight:bold;color:#44aacc;text-shadow:0 0 30px #2266aa,0 0 60px #11448840;letter-spacing:8px;margin-bottom:8px;">LEVIATHAN</div>
        <div style="font-size:15px;color:#668899;margin-bottom:40px;letter-spacing:3px;">Descend into the Abyss &bull; Reforge Excalibur</div>
        <div style="display:flex;gap:12px;margin-bottom:20px;">
          ${(["easy","normal","hard","nightmare"] as const).map(d => {
            const sel = d === state.difficulty;
            const c: Record<string,string> = {easy:"#44aa88",normal:"#4488cc",hard:"#cc6622",nightmare:"#cc2222"};
            return `<button data-diff="${d}" style="pointer-events:all;padding:8px 18px;border:2px solid ${sel?c[d]:"#334"};background:${sel?c[d]+"22":"#0a0a14"};color:${c[d]};cursor:pointer;border-radius:6px;font-size:13px;font-weight:${sel?"bold":"normal"};letter-spacing:1px;text-transform:uppercase;">${d}</button>`;
          }).join("")}
        </div>
        <button id="lev-play-btn" style="pointer-events:all;padding:14px 50px;font-size:20px;font-weight:bold;color:#44aacc;background:#0a0e14;border:2px solid #44aacc;border-radius:8px;cursor:pointer;letter-spacing:3px;text-transform:uppercase;">DESCEND</button>
        <div style="margin-top:30px;font-size:12px;color:#445;max-width:500px;text-align:center;line-height:1.6;">
          WASD swim &bull; Mouse look &bull; Space ascend &bull; Ctrl descend &bull;
          LMB trident (hold for heavy strike) &bull; RMB block &bull;
          Q harpoon &bull; E sonar &bull; R pressure wave &bull; X lantern flare &bull;
          C dash &bull; TAB upgrades at altars &bull; ESC pause &bull;
          Tip: Flare then Sonar = 2x stun! Harpoon stunned foes = 1.5x damage!
        </div>
      </div>`;
    }

    // ---- PLAYING HUD ----
    if (state.phase === "playing") {
      const hpPct = (p.hp / p.maxHp * 100).toFixed(0);
      const o2Pct = (p.oxygen / p.maxOxygen * 100).toFixed(0);
      const hpCol = p.hp/p.maxHp > 0.5 ? "#44ccaa" : p.hp/p.maxHp > 0.25 ? "#ccaa44" : "#cc4444";
      const o2Col = p.oxygen/p.maxOxygen > 0.4 ? "#44aaff" : p.oxygen/p.maxOxygen > 0.15 ? "#ccaa44" : "#cc4444";

      // HP + O2
      html += `<div style="position:fixed;bottom:55px;left:50%;transform:translateX(-50%);text-align:center;">
        <div style="width:220px;height:10px;background:#0a0a14;border:1px solid #223;border-radius:5px;overflow:hidden;">
          <div style="width:${hpPct}%;height:100%;background:${hpCol};transition:width 0.2s;"></div>
        </div>
        <div style="font-size:10px;color:#889;margin-top:2px;">HP ${Math.ceil(p.hp)}/${p.maxHp}</div>
      </div>`;
      html += `<div style="position:fixed;bottom:38px;left:50%;transform:translateX(-50%);text-align:center;">
        <div style="width:180px;height:6px;background:#0a0a14;border:1px solid #223;border-radius:3px;overflow:hidden;">
          <div style="width:${o2Pct}%;height:100%;background:${o2Col};transition:width 0.15s;"></div>
        </div>
        <div style="font-size:9px;color:#667;margin-top:1px;">O2 ${Math.ceil(p.oxygen)}%</div>
      </div>`;

      // Depth meter
      const depthPct = (p.depth / LEVIATHAN.MAX_DEPTH * 100).toFixed(0);
      html += `<div style="position:fixed;right:16px;top:50%;transform:translateY(-50%);text-align:center;">
        <div style="font-size:10px;color:#668;letter-spacing:1px;">DEPTH</div>
        <div style="width:8px;height:200px;background:#0a0a14;border:1px solid #223;border-radius:4px;overflow:hidden;margin:4px auto;position:relative;">
          <div style="position:absolute;bottom:0;width:100%;height:${depthPct}%;background:linear-gradient(to top,#cc4444,#44aacc);transition:height 0.2s;"></div>
        </div>
        <div style="font-size:11px;color:#44aacc;font-weight:bold;">${Math.floor(p.depth)}m</div>
        <div style="font-size:9px;color:#556;margin-top:2px;">Zone ${p.depthLevel + 1}</div>
      </div>`;

      // Stamina bar
      const stPct = (p.stamina / p.maxStamina * 100).toFixed(0);
      html += `<div style="position:fixed;bottom:28px;left:50%;transform:translateX(-50%);text-align:center;">
        <div style="width:140px;height:4px;background:#0a0a14;border:1px solid #222;border-radius:2px;overflow:hidden;">
          <div style="width:${stPct}%;height:100%;background:#ccaa44;transition:width 0.15s;"></div>
        </div>
      </div>`;

      // Fragments + relic points
      const ZONE_NAMES = ["Shallows", "The Nave", "The Crypts", "The Abyss", "Excalibur's Rest"];
      html += `<div style="position:fixed;top:16px;left:16px;">
        <div style="font-size:13px;color:#ffcc44;font-weight:bold;">FRAGMENTS ${p.fragments}/${LEVIATHAN.FRAGMENT_COUNT}</div>
        <div style="display:flex;gap:4px;margin-top:4px;">
          ${state.fragments.map(f => `<div style="width:12px;height:12px;border:1px solid ${f.collected ? "#ffcc44" : "#334"};background:${f.collected ? "#ffcc4466" : "transparent"};border-radius:2px;"></div>`).join("")}
        </div>
        <div style="font-size:11px;color:#44ffaa;margin-top:6px;">Relics: ${p.relicPoints}</div>
        <div style="font-size:10px;color:#556;margin-top:2px;">Combo: ${p.combo > 0 ? p.combo + "x" : "-"} | Kills: ${state.totalKills}</div>
        <div style="font-size:10px;color:#4488cc;margin-top:4px;">${ZONE_NAMES[p.depthLevel] || "Unknown"}</div>
      </div>`;

      // Escape indicator with timer
      if (state.escaping) {
        const pulse = 0.6 + Math.sin(Date.now() / 300) * 0.3;
        const timeLeft = Math.max(0, Math.ceil(state.escapeTimer));
        const timerColor = timeLeft > 20 ? "#ffcc44" : timeLeft > 10 ? "#ff8844" : "#ff4444";
        html += `<div style="position:fixed;top:50px;left:50%;transform:translateX(-50%);text-align:center;">
          <div style="font-size:14px;font-weight:bold;color:#ffcc44;opacity:${pulse};letter-spacing:3px;
            text-shadow:0 0 10px #ffcc4440;">ESCAPE TO THE SURFACE &#x2191;</div>
          <div style="font-size:24px;font-weight:bold;color:${timerColor};margin-top:4px;
            text-shadow:0 0 12px ${timerColor}60;">${timeLeft}s</div>
        </div>`;
      }

      // Charged heavy attack indicator
      if (state.chargeHoldTimer > 0.1) {
        const chargeMax = LEVIATHAN.HEAVY_ATTACK_CHARGE_TIME;
        const chargePct = Math.min(100, (state.chargeHoldTimer / chargeMax) * 100).toFixed(0);
        const ready = state.chargeHoldTimer >= chargeMax;
        html += `<div style="position:fixed;top:55%;left:50%;transform:translateX(-50%);text-align:center;">
          <div style="width:80px;height:6px;background:#111;border:1px solid #334;border-radius:3px;overflow:hidden;">
            <div style="width:${chargePct}%;height:100%;background:${ready ? "#ffcc44" : "#44aacc"};transition:width 0.05s;"></div>
          </div>
          <div style="font-size:9px;color:${ready ? "#ffcc44" : "#668"};margin-top:2px;">${ready ? "RELEASE!" : "CHARGING..."}</div>
        </div>`;
      }

      // Altar upgrade prompt
      if (state.nearAltar && !state.escaping) {
        html += `<div style="position:fixed;bottom:180px;left:50%;transform:translateX(-50%);
          font-size:12px;color:#44ffaa;letter-spacing:2px;">Press TAB to upgrade at altar</div>`;
      }

      // Pressure bonus
      if (p.depthLevel > 0) {
        const dmgBonus = Math.floor(p.depthLevel * LEVIATHAN.PRESSURE_DAMAGE_BONUS * 100);
        const spdPenalty = Math.floor(p.depthLevel * LEVIATHAN.PRESSURE_SPEED_PENALTY * 100);
        html += `<div style="position:fixed;top:16px;right:16px;text-align:right;font-size:10px;">
          <div style="color:#44ccaa;">+${dmgBonus}% DMG</div>
          <div style="color:#cc8844;">-${spdPenalty}% SPD</div>
        </div>`;
      }

      // Abilities
      const abs = [
        { l: "Q", n: "Harpoon", cd: p.harpoonCD, mx: LEVIATHAN.HARPOON_COOLDOWN },
        { l: "E", n: "Sonar", cd: p.sonarCD, mx: LEVIATHAN.SONAR_COOLDOWN },
        { l: "R", n: "Wave", cd: p.pressureWaveCD, mx: LEVIATHAN.PRESSURE_WAVE_COOLDOWN },
        { l: "X", n: "Flare", cd: p.lanternFlareCD, mx: LEVIATHAN.LANTERN_FLARE_COOLDOWN },
        { l: "C", n: "Dash", cd: p.dashCD, mx: LEVIATHAN.DASH_COOLDOWN },
      ];
      html += `<div style="position:fixed;bottom:80px;left:50%;transform:translateX(-50%);display:flex;gap:5px;">`;
      for (const a of abs) {
        const rdy = a.cd <= 0;
        const pct = rdy ? 100 : (1 - a.cd / a.mx) * 100;
        html += `<div style="width:42px;text-align:center;">
          <div style="width:42px;height:42px;border:2px solid ${rdy ? "#44aacc" : "#223"};border-radius:5px;background:#0a0a14;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
            <div style="position:absolute;bottom:0;left:0;width:100%;height:${pct}%;background:${rdy ? "#44aacc22" : "#11111166"};"></div>
            <span style="font-size:14px;font-weight:bold;color:${rdy ? "#44aacc" : "#334"};position:relative;z-index:1;">${a.l}</span>
          </div>
          <div style="font-size:8px;color:#556;margin-top:2px;">${a.n}</div>
        </div>`;
      }
      html += `</div>`;

      // Notifications
      for (const n of state.notifications) {
        const a = Math.min(1, n.timer);
        const c = `#${n.color.toString(16).padStart(6,"0")}`;
        html += `<div style="position:fixed;left:50%;transform:translateX(-50%);top:${90 + state.notifications.indexOf(n) * 26}px;font-size:13px;font-weight:bold;color:${c};opacity:${a};text-shadow:0 0 8px ${c}40;letter-spacing:2px;">${n.text}</div>`;
      }

      // Oxygen warning
      if (p.oxygen < 20) {
        const pulse = 0.5 + Math.sin(Date.now() / 200) * 0.3;
        html += `<div style="position:fixed;inset:0;border:3px solid rgba(204,68,68,${pulse});pointer-events:none;box-shadow:inset 0 0 60px rgba(204,68,68,${pulse * 0.2});"></div>
          <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:18px;color:#cc4444;opacity:${pulse};letter-spacing:4px;font-weight:bold;">LOW OXYGEN</div>`;
      }

      // Grabbed warning
      if (p.action === "grabbed") {
        html += `<div style="position:fixed;inset:0;border:4px solid #664488;pointer-events:none;box-shadow:inset 0 0 40px #44228822;"></div>
          <div style="position:fixed;top:45%;left:50%;transform:translate(-50%,-50%);font-size:16px;color:#aa66cc;letter-spacing:3px;">GRABBED — R to break free</div>`;
      }

      // Boss HP
      if (state.bossId) {
        const boss = state.enemies.get(state.bossId);
        if (boss && boss.behavior !== "dead") {
          const bHp = (boss.hp / boss.maxHp * 100).toFixed(0);
          html += `<div style="position:fixed;bottom:140px;left:50%;transform:translateX(-50%);text-align:center;width:280px;">
            <div style="font-size:11px;color:#cc4444;font-weight:bold;letter-spacing:2px;">ABYSSAL KNIGHT${boss.bossPhase >= 2 ? " — ENRAGED" : boss.bossPhase >= 1 ? " — PHASE 2" : ""}</div>
            <div style="width:280px;height:8px;background:#0a0a14;border:1px solid #332;border-radius:4px;overflow:hidden;margin-top:4px;">
              <div style="width:${bHp}%;height:100%;background:#cc4444;transition:width 0.15s;"></div>
            </div>
          </div>`;
        }
      }

      // Upgrade panel
      if (state.upgradeMenuOpen) {
        html += `<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;background:rgba(2,6,12,0.8);pointer-events:all;">
          <div style="font-size:18px;color:#44ffaa;margin-bottom:16px;letter-spacing:3px;">ALTAR OF THE DEEP</div>
          <div style="font-size:11px;color:#667;margin-bottom:16px;">Relic Points: ${p.relicPoints}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;max-width:600px;">
            ${UPGRADES.map(upg => {
              const level = p[upg.field];
              const cost = getUpgradeCost(upg, level);
              const maxed = level >= upg.maxLevel;
              const canBuy = p.relicPoints >= cost && !maxed;
              return `<button data-upgrade="${upg.id}" style="pointer-events:all;padding:10px 14px;
                background:${canBuy ? "#0a1814" : "#060a0e"};border:1px solid ${canBuy ? "#44ffaa" : "#223"};
                border-radius:6px;cursor:${canBuy ? "pointer" : "default"};min-width:100px;text-align:center;
                opacity:${canBuy ? 1 : 0.5};">
                <div style="font-size:11px;color:#44ffaa;font-weight:bold;">${upg.name}</div>
                <div style="font-size:8px;color:#668;margin-top:3px;">${upg.description}</div>
                <div style="font-size:9px;color:#556;margin-top:3px;">Lv ${level}/${upg.maxLevel}</div>
                ${!maxed ? `<div style="font-size:9px;color:#44ccaa;margin-top:2px;">Cost: ${cost}</div>` :
                  `<div style="font-size:9px;color:#44aa44;margin-top:2px;">MAX</div>`}
              </button>`;
            }).join("")}
          </div>
          <div style="font-size:10px;color:#445;margin-top:16px;">Press TAB to close</div>
        </div>`;
      }

      // Block indicator
      if (p.blocking) {
        html += `<div style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
          font-size:11px;font-weight:bold;color:#aabbcc;letter-spacing:2px;
          text-shadow:0 0 6px #44668840;">BLOCKING</div>`;
      }

      // Crosshair
      if (state.pointerLocked) {
        html += `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:2px;height:14px;background:#44aacc66;"></div>
          <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:2px;background:#44aacc66;"></div>`;
      }

      // Screen flash
      if (state.screenFlash.timer > 0) {
        const a = state.screenFlash.intensity * (state.screenFlash.timer / 0.3);
        html += `<div style="position:fixed;inset:0;background:${state.screenFlash.color};opacity:${a};pointer-events:none;"></div>`;
      }
    }

    // ---- PAUSE ----
    if (state.paused && state.phase === "playing") {
      html += `<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;background:rgba(2,4,10,0.6);pointer-events:all;">
        <div style="font-size:32px;color:#44aacc;letter-spacing:4px;">PAUSED</div>
        <div style="font-size:12px;color:#556;margin-top:16px;">Press ESC to resume</div>
        <button id="lev-pause-exit" style="pointer-events:all;padding:10px 30px;font-size:14px;color:#667;background:#0a0a14;border:2px solid #334;border-radius:6px;cursor:pointer;margin-top:20px;">EXIT</button>
      </div>`;
    }

    // ---- GAME OVER ----
    if (state.phase === "game_over") {
      const v = state.victory;
      html += `<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;background:rgba(${v?"2,8,12":"10,2,2"},0.88);pointer-events:all;">
        <div style="font-size:42px;font-weight:bold;color:${v?"#ffcc44":"#cc4444"};text-shadow:0 0 20px ${v?"#886622":"#882222"};letter-spacing:4px;margin-bottom:8px;">${v ? "EXCALIBUR REFORGED" : "LOST TO THE DEEP"}</div>
        <div style="font-size:15px;color:#889;margin-bottom:30px;">${v ? "You gathered all fragments and escaped the abyss." : state.escapeTimer <= 0 && state.escaping ? "The cathedral collapsed around you..." : p.oxygen <= 0 ? "Your oxygen ran out..." : "The abyss claimed you..."}</div>
        <div style="font-size:13px;color:#99a;margin-bottom:6px;">Fragments: ${p.fragments}/${LEVIATHAN.FRAGMENT_COUNT} | Deepest: ${Math.floor(state.stats.deepestDepth)}m | Combo: ${p.maxCombo}x</div>
        <div style="font-size:11px;color:#667;margin-bottom:20px;">Damage: ${Math.floor(state.stats.damageDealt)} | Abilities: ${state.stats.abilitiesUsed}</div>
        <div style="display:flex;gap:12px;">
          <button id="lev-restart" style="pointer-events:all;padding:12px 36px;font-size:16px;font-weight:bold;color:#44aacc;background:#0a0e14;border:2px solid #44aacc;border-radius:6px;cursor:pointer;letter-spacing:2px;">RETRY</button>
          <button id="lev-exit" style="pointer-events:all;padding:12px 36px;font-size:16px;color:#667;background:#0a0a14;border:2px solid #334;border-radius:6px;cursor:pointer;">EXIT</button>
        </div>
      </div>`;
    }

    // Dirty check
    const hash = `${state.phase}|${Math.floor(p.hp)}|${Math.floor(p.oxygen)}|${p.fragments}|${state.paused}|${p.combo}|${Math.floor(p.depth)}|${p.action}|${state.notifications.length}|${state.victory}|${p.depthLevel}|${p.relicPoints}|${state.upgradeMenuOpen}|${state.escaping}|${state.nearAltar}|${Math.floor(p.stamina)}|${state.totalKills}|${p.blocking}|${Math.floor(state.escapeTimer)}|${Math.floor(state.chargeHoldTimer * 10)}`;
    if (hash !== this._lastHash) {
      this._lastHash = hash;
      this._root.innerHTML = html;
      this._attachEvents(state);
    }

    if (state.phase === "playing") this._drawMinimap(state);
    this._drawDamageNumbers(state);
  }

  private _attachEvents(state: LeviathanState): void {
    this._root.querySelectorAll("[data-diff]").forEach(btn => {
      btn.addEventListener("click", () => { state.difficulty = btn.getAttribute("data-diff") as typeof state.difficulty; });
    });
    const play = this._root.querySelector("#lev-play-btn");
    if (play) play.addEventListener("click", () => { state.phase = "playing"; });
    const restart = this._root.querySelector("#lev-restart");
    if (restart) restart.addEventListener("click", () => { window.dispatchEvent(new Event("leviathanRestart")); });
    const exit = this._root.querySelector("#lev-exit");
    if (exit) exit.addEventListener("click", () => this._onExit?.());
    const pauseExit = this._root.querySelector("#lev-pause-exit");
    if (pauseExit) pauseExit.addEventListener("click", () => this._onExit?.());

    // Upgrade purchase buttons
    this._root.querySelectorAll("[data-upgrade]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-upgrade") as string;
        purchaseUpgrade(state, id);
      });
    });
  }

  private _drawMinimap(state: LeviathanState): void {
    const ctx = this._minimapCtx;
    const w = 130, h = 130;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    const scaleX = w / LEVIATHAN.CATHEDRAL_WIDTH;
    const scaleY = h / LEVIATHAN.MAX_DEPTH;
    const pX = cx + state.player.pos.x * scaleX;
    const pY = cy + (-state.player.pos.y) * scaleY - cy;

    // Offset so player is centered
    const offX = cx - pX;
    const offY = cy - pY;

    // Air pockets
    ctx.fillStyle = "#44aaff44";
    for (const pocket of state.airPockets) {
      const px = cx + pocket.pos.x * scaleX + offX;
      const py = cy + (-pocket.pos.y) * scaleY - cy + offY;
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    }

    // Fragments
    for (const frag of state.fragments) {
      if (frag.collected) continue;
      const fx = cx + frag.pos.x * scaleX + offX;
      const fy = cy + (-frag.pos.y) * scaleY - cy + offY;
      ctx.fillStyle = "#ffcc44";
      ctx.fillRect(fx - 2, fy - 2, 4, 4);
    }

    // Enemies
    ctx.fillStyle = "#cc444488";
    for (const enemy of state.enemies.values()) {
      if (enemy.behavior === "dead") continue;
      const ex = cx + enemy.pos.x * scaleX + offX;
      const ey = cy + (-enemy.pos.y) * scaleY - cy + offY;
      ctx.fillRect(ex - 1, ey - 1, 2, 2);
    }

    // Player (always center)
    ctx.fillStyle = "#44ffaa";
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
    // Player direction
    const dirLen = 6;
    const sinY = Math.sin(state.player.yaw);
    const cosY = Math.cos(state.player.yaw);
    ctx.strokeStyle = "#44ffaa";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - sinY * dirLen, cy - cosY * dirLen);
    ctx.stroke();
  }

  private _drawDamageNumbers(state: LeviathanState): void {
    const ctx = this._dmgCtx;
    ctx.clearRect(0, 0, this._dmgCanvas.width, this._dmgCanvas.height);
    const sw = this._dmgCanvas.width, sh = this._dmgCanvas.height;
    const p = state.player;
    for (const dn of state.damageNumbers) {
      const dx = dn.pos.x - p.pos.x, dz = dn.pos.z - p.pos.z;
      const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
      const fwd = -(dx * sinY + dz * cosY);
      const right = dx * cosY - dz * sinY;
      if (fwd < 1) continue;
      const sx = sw / 2 + (right / fwd) * sw * 0.5;
      const sy = sh / 2 - ((dn.pos.y - p.pos.y) / fwd) * sh * 0.5;
      const alpha = Math.min(1, dn.timer);
      const size = dn.crit ? 18 : 13;
      const color = `#${dn.color.toString(16).padStart(6, "0")}`;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${size}px 'Segoe UI',sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = color;
      ctx.shadowColor = color; ctx.shadowBlur = dn.crit ? 6 : 3;
      ctx.fillText(String(dn.value), sx, sy);
      ctx.restore();
    }
  }

  cleanup(): void {
    if (this._root.parentNode) this._root.parentNode.removeChild(this._root);
    if (this._dmgCanvas.parentNode) this._dmgCanvas.parentNode.removeChild(this._dmgCanvas);
    if (this._minimapCanvas.parentNode) this._minimapCanvas.parentNode.removeChild(this._minimapCanvas);
    if (this._onResize) window.removeEventListener("resize", this._onResize);
  }
}
