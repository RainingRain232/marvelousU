// ---------------------------------------------------------------------------
// Forest of Camelot — HTML HUD overlay
// ---------------------------------------------------------------------------

import { FOREST } from "../config/ForestConfig";
import type { ForestState } from "../state/ForestState";
import { UPGRADES, getUpgradeCost, WAVE_MODIFIER_NAMES, WAVE_MODIFIER_COLORS, CHALLENGE_NAMES, CHALLENGE_DESCS } from "../state/ForestState";
import { applyBuff } from "../systems/ForestSystem";

export class ForestHUD {
  private _root!: HTMLDivElement;
  private _minimapCanvas!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;
  private _dmgCanvas!: HTMLCanvasElement;
  private _dmgCtx!: CanvasRenderingContext2D;
  private _onExit: (() => void) | null = null;
  private _onResize: (() => void) | null = null;

  build(onExit: () => void): void {
    this._onExit = onExit;

    this._root = document.createElement("div");
    this._root.id = "forest-hud";
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
      border-radius:50%; border:2px solid #334; z-index:21;
      pointer-events:none; background:#0a140a;
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

    // Resize damage canvas on window resize
    this._onResize = () => {
      this._dmgCanvas.width = window.innerWidth;
      this._dmgCanvas.height = window.innerHeight;
    };
    window.addEventListener("resize", this._onResize);
  }

  update(state: ForestState): void {
    const p = state.player;

    // Persist best wave
    if (state.bestWave > 0) {
      localStorage.setItem("forest_best", String(state.bestWave));
    }

    let html = "";

    const seasonLabels: Record<string, string> = {
      spring: "SPRING", summer: "SUMMER", autumn: "AUTUMN", winter: "WINTER",
    };
    const seasonColors: Record<string, string> = {
      spring: "#88ff88", summer: "#ffaa44", autumn: "#cc8833", winter: "#88ccff",
    };

    // --- MENU SCREEN ---
    if (state.phase === "menu") {
      html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;
        display:flex;flex-direction:column;justify-content:center;align-items:center;
        background:linear-gradient(180deg, rgba(10,30,10,0.8) 0%, rgba(0,15,0,0.9) 100%);
        pointer-events:all;">
        <div style="font-size:52px;font-weight:bold;color:#44cc44;text-shadow:0 0 20px #228822, 0 0 40px #11661180;
          letter-spacing:6px;margin-bottom:8px;">FOREST OF CAMELOT</div>
        <div style="font-size:16px;color:#88aa88;margin-bottom:40px;letter-spacing:3px;">
          Defend the Great Oak &bull; Command the Seasons
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
        <button id="forest-play-btn" style="pointer-events:all;padding:14px 50px;font-size:20px;font-weight:bold;
          background:linear-gradient(180deg,#228822,#116611);color:#eeffee;border:2px solid #44cc44;
          border-radius:8px;cursor:pointer;letter-spacing:3px;
          text-shadow:0 0 8px #44cc4480;">
          ENTER THE FOREST
        </button>
        <div style="margin-top:30px;font-size:13px;color:#556;">
          Best Wave: ${Math.max(state.bestWave, parseInt(localStorage.getItem("forest_best") || "0"))}
        </div>
        <div style="font-size:12px;color:#445;margin-top:15px;">
          WASD: Move &nbsp; Mouse: Look &nbsp; LMB: Staff (3-hit combo) &nbsp; RMB: Thorns<br>
          Q: Vine Snare &nbsp; E: Root Crush &nbsp; F: Leaf Storm &nbsp; R: Root Travel<br>
          T: Recruit Wisp &nbsp; G: Purify Grove &nbsp; X: Block/Parry<br>
          Space: Jump &nbsp; Ctrl: Dodge &nbsp; Shift: Sprint
        </div>
        <button id="forest-exit-btn" style="pointer-events:all;position:absolute;top:16px;right:16px;
          padding:6px 16px;font-size:13px;background:#222;color:#888;border:1px solid #444;
          border-radius:4px;cursor:pointer;">EXIT</button>
      </div>`;
      this._root.innerHTML = html;
      this._attachMenuListeners(state);
      return;
    }

    // --- GAME OVER SCREEN ---
    if (state.phase === "game_over") {
      const reason = state.greatOak.hp <= 0 ? "The Great Oak has fallen..." : "You have been slain...";
      html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;
        display:flex;flex-direction:column;justify-content:center;align-items:center;
        background:rgba(10,5,10,0.85);pointer-events:all;">
        <div style="font-size:40px;font-weight:bold;color:#cc2222;text-shadow:0 0 15px #ff222280;
          letter-spacing:4px;margin-bottom:10px;">FOREST FALLEN</div>
        <div style="font-size:16px;color:#aa6666;margin-bottom:30px;">${reason}</div>
        <div style="font-size:18px;color:#aaa;margin-bottom:8px;">Wave Reached: <span style="color:#44cc44;font-weight:bold;">${state.wave}</span></div>
        <div style="font-size:14px;color:#777;margin-bottom:4px;">Enemies Slain: ${state.totalKills}</div>
        <div style="font-size:14px;color:#777;margin-bottom:4px;">Groves Lost: ${state.stats.grovesLost}</div>
        <div style="font-size:14px;color:#777;margin-bottom:4px;">Essence Earned: ${state.stats.essenceEarned}</div>
        <div style="font-size:14px;color:#777;margin-bottom:20px;">Best Combo: x${p.maxCombo}</div>
        <div style="display:flex;gap:12px;">
          <button id="forest-restart-btn" style="pointer-events:all;padding:12px 40px;font-size:16px;
            background:#228822;color:#eee;border:1px solid #44cc44;border-radius:6px;cursor:pointer;">
            TRY AGAIN
          </button>
          <button id="forest-menu-btn" style="pointer-events:all;padding:12px 40px;font-size:16px;
            background:#333;color:#aaa;border:1px solid #555;border-radius:6px;cursor:pointer;">
            EXIT
          </button>
        </div>
      </div>`;
      this._root.innerHTML = html;
      this._attachGameOverListeners();
      return;
    }

    // --- TOP BAR ---
    const modName = WAVE_MODIFIER_NAMES[state.waveModifier];
    const modColorHex = "#" + WAVE_MODIFIER_COLORS[state.waveModifier].toString(16).padStart(6, "0");
    const diffCol: Record<string, string> = { easy: "#44aa44", normal: "#4488cc", hard: "#cc6622", nightmare: "#cc2222" };

    html += `<div style="position:absolute;top:12px;left:50%;transform:translateX(-50%);text-align:center;">
      <div style="font-size:14px;color:#aaa;letter-spacing:2px;">WAVE ${state.wave}${modName ? ` <span style="color:${modColorHex};font-weight:bold;">${modName}</span>` : ""} <span style="font-size:11px;color:${diffCol[state.difficulty]};margin-left:6px;">${state.difficulty.toUpperCase()}</span></div>
      <div style="font-size:18px;font-weight:bold;color:${seasonColors[state.season]};text-shadow:0 0 8px ${seasonColors[state.season]}60;">
        ${seasonLabels[state.season]}
      </div>
      <div style="font-size:13px;color:#aaa;">${Math.ceil(state.seasonTimer)}s</div>
    </div>`;

    // --- Wave Title Card ---
    if (state.waveTitle.timer > 0) {
      const alpha = Math.min(1, state.waveTitle.timer / 0.5);
      const scale = 1 + (3 - state.waveTitle.timer) * 0.03;
      html += `<div style="position:absolute;top:40%;left:50%;transform:translate(-50%,-50%) scale(${scale});
        text-align:center;opacity:${alpha};">
        <div style="font-size:36px;font-weight:bold;color:${state.waveTitle.color};
          text-shadow:0 0 20px ${state.waveTitle.color}80;letter-spacing:4px;">${state.waveTitle.text}</div>
      </div>`;
    }

    // --- Combo ---
    if (p.combo >= 2) {
      const comboAlpha = Math.min(1, p.comboTimer / 0.5);
      const comboScale = 1 + Math.min(p.combo * 0.05, 0.5);
      const comboColor = p.combo >= 10 ? "#ff00ff" : p.combo >= 7 ? "#ff4444" : p.combo >= 4 ? "#ff8844" : "#ffcc44";
      html += `<div style="position:absolute;top:80px;left:50%;transform:translateX(-50%) scale(${comboScale});
        text-align:center;opacity:${comboAlpha};">
        <div style="font-size:26px;font-weight:bold;color:${comboColor};text-shadow:0 0 12px ${comboColor}80;">
          x${p.combo} COMBO
        </div>
        <div style="font-size:11px;color:#aaa;">+${Math.round((p.combo * FOREST.COMBO_DAMAGE_BONUS) * 100)}% DMG &nbsp; +${Math.round((p.combo * FOREST.COMBO_ESSENCE_BONUS) * 100)}% ESS</div>
        <div style="width:80px;height:3px;background:#333;margin:3px auto;border-radius:2px;overflow:hidden;">
          <div style="width:${(p.comboTimer / FOREST.COMBO_WINDOW) * 100}%;height:100%;background:${comboColor};"></div>
        </div>
      </div>`;
    }

    // --- Kill Streak ---
    if (p.killStreak >= 5) {
      const streakAlpha = Math.min(1, p.killStreakTimer / 1);
      html += `<div style="position:absolute;top:115px;left:50%;transform:translateX(-50%);
        text-align:center;opacity:${streakAlpha};">
        <div style="font-size:16px;font-weight:bold;color:#ffaa44;text-shadow:0 0 8px #ffaa4480;">
          STREAK x${p.killStreak}
        </div>
      </div>`;
    }

    // --- Boss HP Bar ---
    for (const [, enemy] of state.enemies) {
      if (enemy.type === "blight_mother" && enemy.behavior !== "dead") {
        const bHpPct = Math.max(0, enemy.hp / enemy.maxHp * 100);
        const phaseLabel = enemy.bossPhase >= 2 ? "ENRAGED" : enemy.bossPhase >= 1 ? "PHASE 2" : "";
        const bossColor = enemy.bossPhase >= 2 ? "#ff2222" : enemy.bossPhase >= 1 ? "#cc4444" : "#884488";
        html += `<div style="position:absolute;bottom:120px;left:50%;transform:translateX(-50%);width:300px;text-align:center;">
          <div style="font-size:14px;font-weight:bold;color:${bossColor};margin-bottom:4px;text-shadow:0 0 6px ${bossColor}60;">
            BLIGHT MOTHER ${phaseLabel}
          </div>
          <div style="background:#222;border-radius:4px;height:10px;overflow:hidden;border:1px solid #443344;">
            <div style="width:${bHpPct}%;height:100%;background:${bossColor};border-radius:4px;transition:width 0.1s;"></div>
          </div>
        </div>`;
        break;
      }
    }

    // --- Enemy Counter ---
    if (state.phase === "playing") {
      html += `<div style="position:absolute;top:50px;left:50%;transform:translateX(-50%);
        font-size:12px;color:#888;">${state.aliveEnemyCount} enemies &nbsp;|&nbsp; ${state.spawnQueue.length} spawning</div>`;
    }

    // --- Purification Progress ---
    if (p.purifyingGroveIdx >= 0 && p.purifyingGroveIdx < state.groves.length) {
      const grove = state.groves[p.purifyingGroveIdx];
      const purPct = Math.max(0, grove.purifyProgress * 100);
      html += `<div style="position:absolute;top:45%;left:50%;transform:translateX(-50%);text-align:center;">
        <div style="font-size:16px;color:#44ff88;text-shadow:0 0 8px #44ff8880;">PURIFYING...</div>
        <div style="width:200px;background:#222;border-radius:4px;height:8px;overflow:hidden;margin-top:4px;">
          <div style="width:${purPct}%;height:100%;background:#44ff88;border-radius:4px;transition:width 0.1s;"></div>
        </div>
      </div>`;
    }

    // --- Left Panel: Player Stats ---
    {
      const hpPct = Math.max(0, p.hp / p.maxHp * 100);
      const stPct = Math.max(0, p.stamina / p.maxStamina * 100);
      const hpColor = hpPct > 50 ? "#44cc44" : hpPct > 25 ? "#ccaa22" : "#cc2222";

      html += `<div style="position:absolute;top:60px;left:16px;width:200px;">
        <div style="font-size:12px;color:#aaa;margin-bottom:2px;">HP <span style="float:right;color:${hpColor};">${Math.ceil(p.hp)}/${p.maxHp}</span></div>
        <div style="background:#222;border-radius:4px;height:14px;margin-bottom:6px;overflow:hidden;">
          <div style="width:${hpPct}%;height:100%;background:${hpColor};border-radius:4px;transition:width 0.15s;"></div>
        </div>
        <div style="font-size:12px;color:#aaa;margin-bottom:2px;">STAMINA</div>
        <div style="background:#222;border-radius:4px;height:10px;margin-bottom:6px;overflow:hidden;">
          <div style="width:${stPct}%;height:100%;background:#4488cc;border-radius:4px;"></div>
        </div>
        <div style="font-size:13px;color:#44ff88;">Essence: ${p.essence}</div>
        <div style="font-size:12px;color:#888;margin-top:2px;">${p.action.toUpperCase().replace("_", " ")}</div>
        ${p.staffComboStep > 0 ? `<div style="font-size:11px;color:#ccdd44;margin-top:2px;">Staff: Hit ${p.staffComboStep + 1}/${3}</div>` : ""}
        ${p.blocking ? `<div style="font-size:12px;font-weight:bold;color:${p.blockTimer > 0 ? "#ffee44" : "#aaaacc"};margin-top:2px;
          text-shadow:0 0 6px ${p.blockTimer > 0 ? "#ffee44" : "#aaaacc"}60;">${p.blockTimer > 0 ? "PARRY WINDOW" : "BLOCKING"}</div>` : ""}
      </div>`;

      // Ability cooldowns
      const abilities: { name: string; key: string; cd: number; max: number; color: string }[] = [
        { name: "Staff", key: "LMB", cd: p.staffCD, max: FOREST.STAFF_COOLDOWN, color: "#88cc44" },
        { name: "Thorns", key: "RMB", cd: p.thornBarrageCD, max: FOREST.THORN_BARRAGE_COOLDOWN, color: "#44aa44" },
        { name: "Snare", key: "Q", cd: p.vineSnareCD, max: FOREST.VINE_SNARE_COOLDOWN, color: "#228822" },
        { name: "Crush", key: "E", cd: p.rootCrushCD, max: FOREST.ROOT_CRUSH_COOLDOWN, color: "#664422" },
        { name: "Storm", key: "F", cd: p.leafStormCD, max: FOREST.LEAF_STORM_COOLDOWN, color: "#88cc88" },
        { name: "Root", key: "R", cd: p.rootTravelCD, max: FOREST.ROOT_TRAVEL_COOLDOWN, color: "#44cc88" },
        { name: "Dodge", key: "Ctrl", cd: p.dodgeCD, max: FOREST.DODGE_COOLDOWN, color: "#aaaaaa" },
      ];

      html += `<div style="position:absolute;bottom:60px;left:50%;transform:translateX(-50%);display:flex;gap:6px;">`;
      for (const ab of abilities) {
        const ready = ab.cd <= 0;
        const pct = ready ? 100 : Math.max(0, (1 - ab.cd / ab.max) * 100);
        html += `<div style="width:50px;text-align:center;opacity:${ready ? 1 : 0.5};">
          <div style="width:50px;height:50px;border-radius:6px;border:2px solid ${ready ? ab.color : "#333"};
            background:#111;position:relative;overflow:hidden;">
            <div style="position:absolute;bottom:0;left:0;width:100%;height:${pct}%;background:${ab.color}33;"></div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
              font-size:10px;font-weight:bold;color:${ready ? ab.color : "#555"};">${ab.key}</div>
          </div>
          <div style="font-size:9px;color:#888;margin-top:2px;">${ab.name}</div>
        </div>`;
      }
      html += `</div>`;

      // Active effect timers
      const effects: { name: string; timer: number; max: number; color: string }[] = [];
      if (p.leafStormTimer > 0) effects.push({ name: "Leaf Storm", timer: p.leafStormTimer, max: FOREST.LEAF_STORM_DURATION, color: "#88cc44" });
      if (p.invincibleTimer > 0.5) effects.push({ name: "Invulnerable", timer: p.invincibleTimer, max: 1, color: "#ffee44" });
      if (effects.length > 0) {
        html += `<div style="position:absolute;bottom:115px;left:50%;transform:translateX(-50%);display:flex;gap:8px;">`;
        for (const ef of effects) {
          const efPct = Math.max(0, (ef.timer / ef.max) * 100);
          html += `<div style="text-align:center;">
            <div style="font-size:9px;color:${ef.color};margin-bottom:2px;">${ef.name}</div>
            <div style="width:60px;height:4px;background:#222;border-radius:2px;overflow:hidden;">
              <div style="width:${efPct}%;height:100%;background:${ef.color};border-radius:2px;"></div>
            </div>
          </div>`;
        }
        html += `</div>`;
      }
    }

    // --- Right Panel: Great Oak & Groves ---
    {
      const oakPct = Math.max(0, state.greatOak.hp / state.greatOak.maxHp * 100);
      const oakColor = oakPct > 50 ? "#44cc44" : oakPct > 25 ? "#ccaa22" : "#cc2222";

      html += `<div style="position:absolute;top:60px;right:16px;width:180px;">
        <div style="font-size:12px;color:#aaa;margin-bottom:2px;">GREAT OAK <span style="float:right;color:${oakColor};">${Math.ceil(state.greatOak.hp)}/${state.greatOak.maxHp}</span></div>
        <div style="background:#222;border-radius:4px;height:12px;margin-bottom:8px;overflow:hidden;">
          <div style="width:${oakPct}%;height:100%;background:${oakColor};border-radius:4px;"></div>
        </div>`;

      // Grove status
      for (let i = 0; i < state.groves.length; i++) {
        const g = state.groves[i];
        const gPct = Math.max(0, g.hp / g.maxHp * 100);
        const gColor = g.status === "corrupted" ? "#662244" : g.status === "contested" ? "#ffaa44" : "#44ff88";
        const dirs = ["East", "West", "North", "South"];
        html += `<div style="font-size:11px;color:#888;margin-bottom:2px;">${dirs[i]} Grove <span style="float:right;color:${gColor};">${g.status === "corrupted" ? "LOST" : Math.ceil(g.hp)}</span></div>
          <div style="background:#222;border-radius:3px;height:6px;margin-bottom:4px;overflow:hidden;">
            <div style="width:${gPct}%;height:100%;background:${gColor};border-radius:3px;"></div>
          </div>`;
      }

      // Corruption
      const corrPct = Math.round(state.corruption * 100);
      html += `<div style="font-size:11px;color:#884488;margin-top:6px;">Corruption: ${corrPct}%</div>
        <div style="background:#222;border-radius:3px;height:5px;overflow:hidden;">
          <div style="width:${corrPct}%;height:100%;background:#884488;border-radius:3px;"></div>
        </div>`;

      // Wisp allies count
      if (state.wispAllies.length > 0) {
        html += `<div style="font-size:11px;color:#88ffcc;margin-top:6px;">Wisps: ${state.wispAllies.length}/${FOREST.WISP_ALLY_MAX + p.wispLevel}</div>`;
      }

      // Grove attack warnings
      if (state.groveUnderAttack.length > 0) {
        const dirs = ["East", "West", "North", "South"];
        const names = state.groveUnderAttack.map(i => dirs[i] || "?").join(", ");
        html += `<div style="font-size:11px;font-weight:bold;color:#ff8844;margin-top:6px;
          text-shadow:0 0 4px #ff884480;animation:none;">
          UNDER ATTACK: ${names}
        </div>`;
      }

      // Time survived
      const mins = Math.floor(state.timeSurvived / 60);
      const secs = Math.floor(state.timeSurvived % 60);
      html += `<div style="font-size:10px;color:#556;margin-top:8px;">Time: ${mins}:${String(secs).padStart(2, "0")}</div>`;

      html += `</div>`;
    }

    // --- Season buff + active buffs indicator ---
    {
      const buffText: Record<string, string> = {
        spring: "+HP Regen", summer: "+30% Damage", autumn: "+50% Essence", winter: "Enemies -30% Speed",
      };
      html += `<div style="position:absolute;top:12px;left:16px;">
        <div style="font-size:11px;color:${seasonColors[state.season]};background:${seasonColors[state.season]}15;
          padding:3px 10px;border-radius:4px;border:1px solid ${seasonColors[state.season]}40;margin-bottom:4px;">
          ${seasonLabels[state.season]}: ${buffText[state.season]}
        </div>`;
      // Active buffs
      for (const buff of state.activeBuffs) {
        const remaining = buff.remaining > 0 ? ` (${Math.ceil(buff.remaining / 100)}w)` : "";
        html += `<div style="font-size:10px;color:#88cc88;padding:2px 8px;">
          ${buff.name}${remaining}
        </div>`;
      }
      html += `</div>`;
    }

    // --- Objective display ---
    if (state.objective.active && state.phase === "playing") {
      const obj = state.objective;
      const objPct = Math.min(100, (obj.progress / Math.max(1, obj.target)) * 100);
      const timeStr = obj.timer > 0 ? ` (${Math.ceil(obj.timer)}s)` : "";
      html += `<div style="position:absolute;top:80px;right:16px;width:180px;">
        <div style="font-size:11px;color:#ffee44;margin-bottom:3px;">OBJECTIVE${timeStr}</div>
        <div style="font-size:10px;color:#ccc;margin-bottom:3px;">${obj.description}</div>
        <div style="background:#222;border-radius:3px;height:5px;overflow:hidden;">
          <div style="width:${objPct}%;height:100%;background:#ffee44;border-radius:3px;"></div>
        </div>
        <div style="font-size:9px;color:#888;margin-top:2px;">${obj.progress}/${obj.target} &nbsp; Reward: ${obj.reward} ess</div>
      </div>`;
    }

    // --- Challenge type display ---
    if (state.challengeType !== "normal" && state.phase === "playing") {
      const cName = CHALLENGE_NAMES[state.challengeType];
      const cDesc = CHALLENGE_DESCS[state.challengeType];
      if (cName) {
        html += `<div style="position:absolute;top:55px;left:50%;transform:translateX(-50%);
          font-size:11px;color:#ff8844;letter-spacing:1px;">${cName}: ${cDesc}</div>`;
      }
    }

    // --- Buff Selection (shown before upgrade shop) ---
    if (state.buffSelectActive && state.buffChoices.length > 0) {
      html += `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        background:rgba(10,25,10,0.97);border:2px solid #44aa44;border-radius:12px;
        padding:24px 32px;pointer-events:all;min-width:420px;z-index:30;">
        <div style="font-size:20px;font-weight:bold;color:#88ff88;text-align:center;margin-bottom:6px;">CHOOSE A BLESSING</div>
        <div style="font-size:12px;color:#888;text-align:center;margin-bottom:16px;">Select one buff to aid your defense</div>
        <div style="display:flex;gap:12px;justify-content:center;">`;
      for (let i = 0; i < state.buffChoices.length; i++) {
        const bc = state.buffChoices[i];
        const durText = bc.duration === -1 ? "Permanent" : `${bc.duration} waves`;
        html += `<button data-buff="${bc.id}" style="pointer-events:all;width:130px;padding:14px 10px;
          background:#112211;border:2px solid #336633;border-radius:8px;cursor:pointer;text-align:center;">
          <div style="font-size:14px;font-weight:bold;color:#88ff88;margin-bottom:6px;">${bc.name}</div>
          <div style="font-size:11px;color:#aaa;margin-bottom:6px;">${bc.description}</div>
          <div style="font-size:10px;color:#668866;">${durText}</div>
        </button>`;
      }
      html += `</div></div>`;
    }

    // --- Intermission: Upgrade Shop ---
    if (state.phase === "intermission" && !state.buffSelectActive) {
      html += `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        background:rgba(10,20,10,0.95);border:2px solid #336633;border-radius:12px;
        padding:24px 32px;pointer-events:all;min-width:380px;">
        <div style="font-size:18px;font-weight:bold;color:#44cc44;text-align:center;margin-bottom:6px;">GROVE REST</div>
        <div style="font-size:13px;color:#888;text-align:center;margin-bottom:16px;">
          Next wave in ${Math.ceil(state.phaseTimer)}s &nbsp;|&nbsp; Essence: <span style="color:#44ff88;">${p.essence}</span>
        </div>`;

      for (const upg of UPGRADES) {
        const lvl = p[upg.field];
        const maxed = lvl >= upg.maxLevel;
        const cost = getUpgradeCost(upg, lvl);
        const canBuy = p.essence >= cost && !maxed;
        html += `<div style="display:flex;align-items:center;justify-content:space-between;
          padding:6px 0;border-bottom:1px solid #223322;">
          <div>
            <div style="font-size:13px;color:#ccc;">${upg.name} <span style="color:#666;font-size:11px;">Lv${lvl}/${upg.maxLevel}</span></div>
            <div style="font-size:11px;color:#777;">${upg.description}</div>
          </div>
          <button data-upgrade="${upg.id}" style="pointer-events:all;padding:4px 14px;font-size:12px;
            background:${canBuy ? "#228822" : "#222"};color:${canBuy ? "#eee" : "#555"};
            border:1px solid ${canBuy ? "#44cc44" : "#333"};border-radius:4px;
            cursor:${canBuy ? "pointer" : "default"};min-width:70px;text-align:center;">
            ${maxed ? "MAX" : `${cost} ess`}
          </button>
        </div>`;
      }

      // Recruit wisp button — cost scales with current count
      const maxWisps = FOREST.WISP_ALLY_MAX + p.wispLevel;
      const wispCost = FOREST.WISP_ALLY_COST + state.wispAllies.length * 3;
      const canRecruit = state.wispAllies.length < maxWisps && p.essence >= wispCost;
      html += `<div style="margin-top:12px;text-align:center;">
        <button id="forest-recruit-wisp" data-cost="${wispCost}" style="pointer-events:all;padding:6px 20px;font-size:12px;
          background:${canRecruit ? "#226655" : "#222"};color:${canRecruit ? "#88ffcc" : "#555"};
          border:1px solid ${canRecruit ? "#44ccaa" : "#333"};border-radius:4px;cursor:${canRecruit ? "pointer" : "default"};">
          Recruit Wisp (${wispCost} ess) [${state.wispAllies.length}/${maxWisps}]
        </button>
      </div>`;

      html += `</div>`;
    }

    // --- Notifications ---
    if (state.notifications.length > 0) {
      html += `<div style="position:absolute;top:120px;right:16px;text-align:right;">`;
      for (const n of state.notifications) {
        const alpha = Math.min(1, n.timer / 0.5);
        const color = "#" + n.color.toString(16).padStart(6, "0");
        html += `<div style="font-size:13px;color:${color};opacity:${alpha};margin-bottom:3px;
          text-shadow:0 0 6px ${color}60;">${n.text}</div>`;
      }
      html += `</div>`;
    }

    // --- Screen flash ---
    if (state.screenFlash.timer > 0) {
      const alpha = state.screenFlash.intensity * (state.screenFlash.timer / 0.3);
      html += `<div style="position:fixed;top:0;left:0;width:100%;height:100%;
        background:${state.screenFlash.color};opacity:${alpha};pointer-events:none;"></div>`;
    }

    // --- Pause overlay ---
    if (state.paused) {
      html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;
        display:flex;flex-direction:column;justify-content:center;align-items:center;
        background:rgba(0,10,0,0.7);pointer-events:all;">
        <div style="font-size:36px;font-weight:bold;color:#44cc44;letter-spacing:4px;">PAUSED</div>
        <div style="font-size:14px;color:#888;margin-top:10px;">Press ESC to resume</div>
        <button id="forest-pause-exit" style="pointer-events:all;margin-top:20px;padding:8px 30px;
          font-size:14px;background:#333;color:#aaa;border:1px solid #555;border-radius:4px;cursor:pointer;">
          EXIT TO MENU
        </button>
      </div>`;
    }

    this._root.innerHTML = html;
    this._updateMinimap(state);
    this._renderDamageNumbers(state);
    this._attachUpgradeListeners(state);
    this._attachBuffListeners(state);
    this._attachPauseExitListener();
  }

  private _attachMenuListeners(state: ForestState): void {
    const playBtn = document.getElementById("forest-play-btn");
    if (playBtn) {
      playBtn.onclick = () => {
        state.phase = "intermission";
        state.phaseTimer = 3;
      };
    }
    const exitBtn = document.getElementById("forest-exit-btn");
    if (exitBtn) {
      exitBtn.onclick = () => { if (this._onExit) this._onExit(); };
    }
    // Difficulty buttons
    const diffBtns = this._root.querySelectorAll("[data-diff]");
    diffBtns.forEach(btn => {
      (btn as HTMLButtonElement).onclick = () => {
        state.difficulty = (btn as HTMLElement).dataset.diff as any;
      };
    });
  }

  private _attachGameOverListeners(): void {
    const restartBtn = document.getElementById("forest-restart-btn");
    if (restartBtn) {
      restartBtn.onclick = () => window.dispatchEvent(new Event("forestRestart"));
    }
    const menuBtn = document.getElementById("forest-menu-btn");
    if (menuBtn) {
      menuBtn.onclick = () => { if (this._onExit) this._onExit(); };
    }
  }

  private _attachUpgradeListeners(state: ForestState): void {
    const btns = this._root.querySelectorAll("[data-upgrade]");
    btns.forEach(btn => {
      (btn as HTMLButtonElement).onclick = () => {
        const id = (btn as HTMLElement).dataset.upgrade;
        const upg = UPGRADES.find(u => u.id === id);
        if (!upg) return;
        const lvl = state.player[upg.field];
        if (lvl >= upg.maxLevel) return;
        const cost = getUpgradeCost(upg, lvl);
        if (state.player.essence < cost) return;
        state.player.essence -= cost;
        (state.player as any)[upg.field] = lvl + 1;
        // Apply immediate stat boosts
        if (upg.id === "armor") {
          state.player.maxHp += 12;
          state.player.hp = Math.min(state.player.hp + 12, state.player.maxHp);
        }
        if (upg.id === "speed") {
          state.player.maxStamina += 10;
          state.player.stamina = Math.min(state.player.stamina + 10, state.player.maxStamina);
        }
        if (upg.id === "grove") {
          for (const grove of state.groves) {
            if (grove.status !== "corrupted") {
              grove.maxHp += 30;
              grove.hp = Math.min(grove.hp + 30, grove.maxHp);
            }
          }
        }
        window.dispatchEvent(new Event("forestPurchaseUpgrade"));
      };
    });

    const recruitBtn = document.getElementById("forest-recruit-wisp");
    if (recruitBtn) {
      (recruitBtn as HTMLButtonElement).onclick = () => {
        const p = state.player;
        const maxWisps = FOREST.WISP_ALLY_MAX + p.wispLevel;
        const cost = parseInt((recruitBtn as HTMLElement).dataset.cost || "5") || FOREST.WISP_ALLY_COST;
        if (state.wispAllies.length >= maxWisps || p.essence < cost) return;
        p.essence -= cost;
        state.wispAllies.push({
          id: `wisp_${state.nextId++}`,
          pos: { x: p.pos.x + (Math.random() - 0.5) * 4, y: 2, z: p.pos.z + (Math.random() - 0.5) * 4 },
          vel: { x: 0, y: 0, z: 0 },
          hp: FOREST.WISP_ALLY_HP,
          maxHp: FOREST.WISP_ALLY_HP,
          attackTimer: 0,
          targetId: null,
          bobPhase: Math.random() * Math.PI * 2,
        });
      };
    }
  }

  private _attachBuffListeners(state: ForestState): void {
    const btns = this._root.querySelectorAll("[data-buff]");
    btns.forEach(btn => {
      (btn as HTMLButtonElement).onclick = () => {
        const id = (btn as HTMLElement).dataset.buff as any;
        applyBuff(state, id);
        state.buffSelectActive = false;
        state.buffChoices = [];
      };
    });
  }

  private _attachPauseExitListener(): void {
    const btn = document.getElementById("forest-pause-exit");
    if (btn) {
      btn.onclick = () => { if (this._onExit) this._onExit(); };
    }
  }

  private _renderDamageNumbers(state: ForestState): void {
    const ctx = this._dmgCtx;
    const cw = this._dmgCanvas.width;
    const ch = this._dmgCanvas.height;
    ctx.clearRect(0, 0, cw, ch);

    if (state.phase === "menu" || state.phase === "game_over") return;

    const p = state.player;
    // Simple 3D→2D projection using player camera angles
    for (const dn of state.damageNumbers) {
      // Relative position to player
      const dx = dn.pos.x - p.pos.x;
      const dy = dn.pos.y - p.pos.y - 1.5;
      const dz = dn.pos.z - p.pos.z;

      // Rotate by yaw (simplified projection)
      const cosY = Math.cos(-p.yaw), sinY = Math.sin(-p.yaw);
      const rx = dx * cosY - dz * sinY;
      const rz = dx * sinY + dz * cosY;

      // Skip if behind camera
      if (rz > -0.5) continue;

      // Perspective projection
      const fov = 65;
      const scale = (cw * 0.5) / Math.tan((fov * Math.PI / 180) * 0.5);
      const sx = cw / 2 + (rx / -rz) * scale;
      const sy = ch / 2 - ((dy - p.pitch * 2) / -rz) * scale;

      // Off screen check
      if (sx < -50 || sx > cw + 50 || sy < -50 || sy > ch + 50) continue;

      const alpha = Math.min(1, dn.timer / 0.3);
      const size = dn.crit ? 22 : 16;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const distFade = Math.max(0.3, 1 - dist / 30);

      ctx.save();
      ctx.globalAlpha = alpha * distFade;
      ctx.font = `bold ${size}px 'Segoe UI', Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const color = "#" + dn.color.toString(16).padStart(6, "0");
      // Outline
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.strokeText(String(dn.value), sx, sy);
      // Fill
      ctx.fillStyle = color;
      ctx.fillText(String(dn.value), sx, sy);

      if (dn.crit) {
        ctx.font = `bold 10px 'Segoe UI', Arial, sans-serif`;
        ctx.fillStyle = "#ffaa44";
        ctx.fillText("CRIT", sx, sy - 14);
      }

      ctx.restore();
    }
  }

  private _updateMinimap(state: ForestState): void {
    const ctx = this._minimapCtx;
    const cw = 140, ch = 140;
    const scale = cw / FOREST.GROUND_SIZE;

    ctx.clearRect(0, 0, cw, ch);

    // Background
    ctx.fillStyle = "#0a140a";
    ctx.beginPath();
    ctx.arc(cw / 2, ch / 2, cw / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cw / 2, ch / 2, cw / 2 - 1, 0, Math.PI * 2);
    ctx.clip();

    const cx = cw / 2, cy = ch / 2;

    // Great Oak
    ctx.fillStyle = "#44cc44";
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Groves
    for (const g of state.groves) {
      ctx.fillStyle = g.status === "corrupted" ? "#662244" : g.status === "contested" ? "#ffaa44" : "#44ff88";
      ctx.beginPath();
      ctx.arc(cx + g.pos.x * scale, cy + g.pos.z * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Enemies (dots)
    ctx.fillStyle = "#cc4444";
    for (const [, e] of state.enemies) {
      if (e.behavior === "dead") continue;
      ctx.fillRect(cx + e.pos.x * scale - 1, cy + e.pos.z * scale - 1, 2, 2);
    }

    // Player (larger green dot)
    ctx.fillStyle = "#88ff88";
    ctx.beginPath();
    ctx.arc(cx + state.player.pos.x * scale, cy + state.player.pos.z * scale, 3, 0, Math.PI * 2);
    ctx.fill();

    // Player direction
    ctx.strokeStyle = "#88ff88";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + state.player.pos.x * scale, cy + state.player.pos.z * scale);
    ctx.lineTo(
      cx + (state.player.pos.x - Math.sin(state.player.yaw) * 8) * scale,
      cy + (state.player.pos.z - Math.cos(state.player.yaw) * 8) * scale,
    );
    ctx.stroke();

    ctx.restore();
  }

  cleanup(): void {
    if (this._root.parentElement) this._root.parentElement.removeChild(this._root);
    if (this._minimapCanvas.parentElement) this._minimapCanvas.parentElement.removeChild(this._minimapCanvas);
    if (this._dmgCanvas.parentElement) this._dmgCanvas.parentElement.removeChild(this._dmgCanvas);
    if (this._onResize) window.removeEventListener("resize", this._onResize);
  }
}
