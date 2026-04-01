// ---------------------------------------------------------------------------
// Gargoyle: Cathedral Guardian — HTML HUD overlay
// ---------------------------------------------------------------------------

import { GARG } from "../config/GargoyleConfig";
import type { GargoyleState, Demon } from "../state/GargoyleState";
import { UPGRADES, getUpgradeCost, WAVE_MODIFIER_NAMES, WAVE_MODIFIER_COLORS } from "../state/GargoyleState";

export class GargoyleHUD {
  private _root!: HTMLDivElement;
  private _minimapCanvas!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;
  private _onExit: (() => void) | null = null;
  private _menuBuilt = false;
  private _menuDifficulty = "";

  build(onExit: () => void): void {
    this._onExit = onExit;

    this._root = document.createElement("div");
    this._root.id = "gargoyle-hud";
    this._root.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      pointer-events:none; z-index:20; font-family:'Segoe UI',Arial,sans-serif;
      color:#eee; user-select:none;
    `;
    document.body.appendChild(this._root);

    // Minimap canvas (persistent, not recreated each frame)
    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 140;
    this._minimapCanvas.height = 140;
    this._minimapCanvas.style.cssText = `
      position:fixed; bottom:16px; left:16px; width:140px; height:140px;
      border-radius:50%; border:2px solid #334; z-index:21;
      pointer-events:none; background:#0a0a14;
    `;
    document.body.appendChild(this._minimapCanvas);
    this._minimapCtx = this._minimapCanvas.getContext("2d")!;
  }

  update(state: GargoyleState): void {
    const p = state.player;
    const cat = state.cathedral;

    // --- Persist best wave to localStorage ---
    if (state.bestWave > 0) {
      localStorage.setItem("gargoyle_best", String(state.bestWave));
    }

    let html = "";

    const phaseLabel: Record<string, string> = {
      menu: "", night: "NIGHT", dawn: "DAWN", day: "DAY", dusk: "DUSK", game_over: "FALLEN",
    };
    const phaseColor: Record<string, string> = {
      menu: "#888", night: "#6644cc", dawn: "#ffcc44", day: "#ffeeaa", dusk: "#8866dd", game_over: "#ff2222",
    };

    // --- Top bar ---
    if (state.phase !== "menu") {
      const modName = WAVE_MODIFIER_NAMES[state.waveModifier];
      const modColorHex = "#" + WAVE_MODIFIER_COLORS[state.waveModifier].toString(16).padStart(6, "0");
      html += `<div style="position:absolute;top:12px;left:50%;transform:translateX(-50%);text-align:center;">
        <div style="font-size:14px;color:#aaa;letter-spacing:2px;">WAVE ${state.wave}${modName ? ` <span style="color:${modColorHex};font-weight:bold;">${modName}</span>` : ""} <span style="font-size:11px;color:${{easy:"#44aa44",normal:"#4488cc",hard:"#cc6622",nightmare:"#cc2222"}[state.difficulty]};margin-left:6px;">${state.difficulty.toUpperCase()}</span></div>
        <div style="font-size:22px;font-weight:bold;color:${phaseColor[state.phase]};text-shadow:0 0 10px ${phaseColor[state.phase]}80;">
          ${phaseLabel[state.phase]}
        </div>
        ${(() => { const timerUrgent = state.phase === "dawn" && state.phaseTimer < 3; return `<div style="font-size:${timerUrgent ? 28 : 16}px;color:${timerUrgent ? "#ff4444" : "#ccc"};${timerUrgent ? "text-shadow:0 0 10px #ff2222;animation:none;" : ""}">${Math.ceil(Math.max(0, state.phaseTimer))}s</div>`; })()}
      </div>`;
    }

    // --- Combo display ---
    if (p.combo >= 2 && (state.phase === "night" || state.phase === "dawn")) {
      const comboAlpha = Math.min(1, p.comboTimer / 0.5);
      const comboScale = 1 + Math.min(p.combo * 0.05, 0.5);
      const comboColor = p.combo >= 8 ? "#ff00ff" : p.combo >= 5 ? "#ff4444" : p.combo >= 3 ? "#ff8844" : "#ffcc44";
      html += `<div style="position:absolute;top:80px;left:50%;transform:translateX(-50%) scale(${comboScale});
        text-align:center;opacity:${comboAlpha};transition:transform 0.1s;">
        <div style="font-size:28px;font-weight:bold;color:${comboColor};text-shadow:0 0 15px ${comboColor}80;">
          x${p.combo} COMBO
        </div>
        <div style="font-size:12px;color:#aaa;">+${Math.round((p.combo * GARG.COMBO_DAMAGE_BONUS) * 100)}% DMG &nbsp; +${Math.round((p.combo * GARG.COMBO_SOUL_BONUS) * 100)}% SOULS</div>
        <div style="width:80px;height:3px;background:#333;margin:4px auto;border-radius:2px;overflow:hidden;">
          <div style="width:${(p.comboTimer / GARG.COMBO_WINDOW) * 100}%;height:100%;background:${comboColor};border-radius:2px;"></div>
        </div>
      </div>`;
    }

    // --- Left panel: player stats ---
    if (state.phase !== "menu" && state.phase !== "game_over") {
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
          <div style="width:${stPct}%;height:100%;background:#4488cc;border-radius:4px;transition:width 0.15s;"></div>
        </div>
        <div style="font-size:13px;color:#bb88ff;">Souls: ${p.soulEssence}</div>
        <div style="font-size:12px;color:#888;margin-top:2px;">${p.action.toUpperCase()}</div>
        ${p.action === "perched" && p.perchBonus ? `<div style="font-size:11px;color:#bb88ff;margin-top:2px;">${p.perchBonus}</div>` : ""}
      </div>`;

      // Fury mode indicator
      if (p.hp < p.maxHp * 0.25 && p.hp > 0 && (state.phase === "night" || state.phase === "dawn")) {
        const furyPulse = 0.7 + Math.sin(state.gameTime * 6) * 0.3;
        html += `<div style="position:absolute;top:135px;left:16px;font-size:16px;font-weight:bold;color:#ff4444;opacity:${furyPulse};
          text-shadow:0 0 8px #ff4444, 0 0 16px #ff222288;letter-spacing:3px;">FURY</div>`;
      }

      // Ability cooldowns
      const abilities: { name: string; key: string; cd: number; max: number; color: string }[] = [
        { name: "Talon", key: "LMB", cd: p.talonCD, max: GARG.TALON_COOLDOWN, color: "#ff8844" },
        { name: "Dive", key: "Q", cd: p.diveBombCD, max: GARG.DIVE_BOMB_COOLDOWN, color: "#ff4444" },
        { name: "Breath", key: "RMB", cd: p.stoneBreathCD, max: GARG.STONE_BREATH_COOLDOWN, color: "#aaaaaa" },
        { name: "Gust", key: "F", cd: p.wingGustCD, max: GARG.WING_GUST_COOLDOWN, color: "#88ccff" },
      ];
      if (p.consecrateLevel > 0) {
        abilities.push({ name: "Consecrate", key: "R", cd: p.consecrateCD, max: GARG.CONSECRATE_COOLDOWN, color: "#ffdd44" });
      }
      abilities.push({ name: "Dash", key: "X", cd: p.dashCD, max: GARG.DASH_COOLDOWN, color: "#88aaff" });
      abilities.push({ name: "Stone", key: "Tab", cd: p.stoneSkinCD, max: GARG.STONE_SKIN_COOLDOWN, color: "#aabbcc" });

      html += `<div style="position:absolute;bottom:60px;left:50%;transform:translateX(-50%);display:flex;gap:8px;">`;
      for (const ab of abilities) {
        const ready = ab.cd <= 0;
        const pct = ready ? 100 : (1 - ab.cd / ab.max) * 100;
        html += `<div style="text-align:center;width:64px;">
          <div style="width:46px;height:46px;margin:0 auto;border-radius:6px;background:#0a0a14;border:2px solid ${ready ? ab.color : "#222"};
            position:relative;overflow:hidden;${ready ? `box-shadow:0 0 8px ${ab.color}40;` : ""}">
            <div style="position:absolute;bottom:0;width:100%;height:${pct}%;background:${ab.color}${ready ? "66" : "22"};"></div>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
              font-size:10px;font-weight:bold;color:${ready ? "#fff" : "#555"};">${ab.key}</div>
          </div>
          <div style="font-size:9px;color:${ready ? "#aaa" : "#555"};margin-top:3px;">${ab.name}</div>
        </div>`;
      }
      html += `</div>`;
    }

    // --- Right panel: cathedral HP ---
    if (state.phase !== "menu" && state.phase !== "game_over") {
      const catPct = Math.max(0, cat.hp / cat.maxHp * 100);
      const catColor = catPct > 50 ? "#88aacc" : catPct > 25 ? "#cc8822" : "#cc2222";
      let alive = 0;
      state.demons.forEach(d => { if (d.behavior !== "dead") alive++; });
      const queued = state.spawnQueue.length;

      html += `<div style="position:absolute;top:60px;right:16px;width:180px;text-align:right;">
        <div style="font-size:12px;color:#aaa;margin-bottom:2px;">CATHEDRAL <span style="color:${catColor};">${Math.ceil(cat.hp)}/${cat.maxHp}</span></div>
        <div style="background:#222;border-radius:4px;height:14px;margin-bottom:6px;overflow:hidden;">
          <div style="width:${catPct}%;height:100%;background:${catColor};border-radius:4px;margin-left:auto;transition:width 0.15s;"></div>
        </div>
        <div style="font-size:12px;color:#cc4444;">Demons: ${alive}${queued > 0 ? ` (+${queued})` : ""}</div>
        <div style="font-size:12px;color:#888;">Killed: ${state.totalKills}</div>
        ${p.maxCombo > 1 ? `<div style="font-size:11px;color:#ff8844;margin-top:2px;">Best Combo: x${p.maxCombo}</div>` : ""}
      </div>`;
    }

    // --- Wave objective panel ---
    if (state.phase !== "menu" && state.phase !== "game_over" && state.objective && state.objective.active) {
      const obj = state.objective;
      const objPct = Math.min(100, (obj.progress / Math.max(1, obj.target)) * 100);
      const objComplete = obj.progress >= obj.target;
      const objBarColor = objComplete ? "#44ff44" : "#ffcc44";
      const objFlash = objComplete ? `opacity:${0.7 + Math.sin(state.gameTime * 10) * 0.3};` : "";
      html += `<div style="position:absolute;top:160px;right:16px;width:180px;text-align:right;${objFlash}">
        <div style="font-size:11px;color:#ffcc44;margin-bottom:3px;font-weight:bold;">${obj.description}</div>
        <div style="background:#222;border-radius:3px;height:8px;margin-bottom:4px;overflow:hidden;">
          <div style="width:${objPct}%;height:100%;background:${objBarColor};border-radius:3px;transition:width 0.15s;"></div>
        </div>
        <div style="font-size:10px;color:#ffcc44;">${obj.progress}/${obj.target}</div>
        <div style="font-size:10px;color:#ffcc44;margin-top:2px;">Bonus: +${obj.reward} souls</div>
      </div>`;
    }

    // --- Boss health bar (Hellion) ---
    {
      let hellion: Demon | null = null;
      state.demons.forEach(d => {
        if (!hellion && d.type === "hellion" && d.behavior !== "dead") {
          hellion = d;
        }
      });
      if (hellion) {
        const h = hellion as Demon;
        const bossHpPct = Math.max(0, (h.hp / h.maxHp) * 100);
        html += `<div style="position:absolute;bottom:120px;left:50%;transform:translateX(-50%);text-align:center;">
          <div style="font-size:13px;font-weight:bold;color:#ff4422;letter-spacing:2px;margin-bottom:4px;text-shadow:0 0 8px #ff220066;">HELLION</div>
          <div style="width:300px;height:16px;background:#222;border-radius:4px;overflow:hidden;border:1px solid #441100;">
            <div style="width:${bossHpPct}%;height:100%;background:linear-gradient(90deg,#cc2200,#ff4422);border-radius:4px;transition:width 0.15s;"></div>
          </div>
          <div style="font-size:10px;color:#cc8877;margin-top:2px;">${Math.ceil(h.hp)} / ${h.maxHp}</div>
        </div>`;
      }
    }

    // --- Tutorial tips ---
    if (state.tutorialTips && state.tutorialTips.length > 0 && (state.phase === "night" || state.phase === "dawn")) {
      const tip = state.tutorialTips[0];
      html += `<div style="position:absolute;bottom:130px;left:50%;transform:translateX(-50%);text-align:center;pointer-events:auto;">
        <div style="background:rgba(10,10,20,0.85);padding:8px 18px;border-radius:6px;border:1px solid #333;display:inline-block;pointer-events:auto;">
          <span style="font-size:12px;color:#aaa;">${tip}</span>
          <button id="gargoyle-tip-dismiss" style="pointer-events:auto;margin-left:12px;padding:2px 10px;font-size:11px;
            background:#222;color:#888;border:1px solid #444;border-radius:4px;cursor:pointer;">Got it</button>
        </div>
      </div>`;
    }

    // --- Floating damage numbers ---
    if (state.damageNumbers.length > 0) {
      // We'll approximate screen projection
      for (const dn of state.damageNumbers) {
        const alpha = Math.min(1, dn.timer / 0.3);
        const rise = (1.2 - dn.timer) * 40;
        const size = dn.crit ? 18 : 14;
        const colorHex = "#" + dn.color.toString(16).padStart(6, "0");
        // Simple projection: just use the notification area for now
        html += `<div style="position:absolute;top:${45 - rise}%;left:${50 + (dn.pos.x * 0.5)}%;
          transform:translateX(-50%);font-size:${size}px;font-weight:bold;color:${colorHex};
          opacity:${alpha};text-shadow:0 0 4px #000;pointer-events:none;${dn.crit ? "letter-spacing:2px;" : ""}">
          ${dn.value}${dn.crit ? "!" : ""}
        </div>`;
      }
    }

    // --- Notifications ---
    if (state.notifications.length > 0) {
      html += `<div style="position:absolute;top:${p.combo >= 2 ? 130 : 110}px;left:50%;transform:translateX(-50%);text-align:center;">`;
      for (const n of state.notifications) {
        const alpha = Math.min(1, n.timer / 0.5);
        html += `<div style="font-size:14px;color:#${n.color.toString(16).padStart(6, "0")};opacity:${alpha};margin-bottom:4px;text-shadow:0 0 6px #000;">
          ${n.text}
        </div>`;
      }
      html += `</div>`;
    }

    // --- Crosshair ---
    if (state.phase === "night" || state.phase === "dawn") {
      const attacking = p.attacking;
      const spread = attacking ? 4 : 0;
      const chColor = p.stoneSkinTimer > 0 ? "#aabbcc88" : "#fff8";
      html += `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;">
        <div style="width:2px;height:14px;background:${chColor};position:absolute;left:-1px;top:${-7 - spread}px;"></div>
        <div style="width:2px;height:14px;background:${chColor};position:absolute;left:-1px;top:${7 + spread}px;transform:rotate(180deg);"></div>
        <div style="width:14px;height:2px;background:${chColor};position:absolute;left:${-7 - spread}px;top:-1px;"></div>
        <div style="width:14px;height:2px;background:${chColor};position:absolute;left:${7 + spread}px;top:-1px;"></div>
        <div style="width:4px;height:4px;border-radius:50%;background:${chColor};position:absolute;left:-2px;top:-2px;"></div>
      </div>`;
    }

    // --- Dawn warning flash ---
    if (state.phase === "dawn") {
      const urgency = 1 - state.phaseTimer / GARG.DAWN_DURATION;
      const flash = Math.sin(state.gameTime * (4 + urgency * 8)) * (0.08 + urgency * 0.08) + (0.05 + urgency * 0.1);
      html += `<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,200,50,${Math.max(0, flash)});pointer-events:none;"></div>`;
    }

    // --- Low HP vignette ---
    if (state.phase !== "menu" && p.hp < p.maxHp * 0.35 && p.hp > 0) {
      const intensity = 0.3 * (1 - p.hp / (p.maxHp * 0.35));
      const pulse = Math.sin(state.gameTime * 2) * 0.05;
      html += `<div style="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;
        background:radial-gradient(ellipse at center, transparent 50%, rgba(180,0,0,${intensity + pulse}) 100%);"></div>`;
    }

    // --- Screen flash ---
    if (state.screenFlash && state.screenFlash.timer > 0) {
      const fAlpha = state.screenFlash.timer * state.screenFlash.intensity * 3;
      html += `<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:${state.screenFlash.color};
        opacity:${Math.min(1, fAlpha)};pointer-events:none;"></div>`;
    }

    // --- Wave title card ---
    if (state.waveTitle && state.waveTitle.timer > 0) {
      const tAlpha = Math.min(1, state.waveTitle.timer);
      const tScale = 1 + Math.max(0, 1 - state.waveTitle.timer / 0.3) * 0.2;
      html += `<div style="position:absolute;top:35%;left:50%;transform:translate(-50%,-50%) scale(${tScale});
        text-align:center;pointer-events:none;opacity:${tAlpha};">
        <div style="font-size:64px;font-weight:bold;color:${state.waveTitle.color};
          text-shadow:0 0 40px ${state.waveTitle.color}80, 0 0 80px ${state.waveTitle.color}40;
          letter-spacing:8px;">${state.waveTitle.text}</div>
      </div>`;
    }

    // --- Wave modifier overlays ---
    if (state.waveModifier === "fog_night" && state.phase !== "menu" && state.phase !== "game_over") {
      html += `<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(160,160,170,0.15);pointer-events:none;"></div>`;
    }
    if (state.waveModifier === "blood_moon" && state.phase !== "menu" && state.phase !== "game_over") {
      html += `<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,0,0,0.05);pointer-events:none;"></div>`;
    }

    // --- Pause overlay ---
    if (state.paused === true && (state.phase === "night" || state.phase === "dawn" || state.phase === "dusk")) {
      html += `<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);
        pointer-events:auto;display:flex;align-items:center;justify-content:center;z-index:50;">
        <div style="text-align:center;">
          <div style="font-size:48px;font-weight:bold;color:#eee;letter-spacing:6px;margin-bottom:24px;text-shadow:0 0 20px #ffffff40;">PAUSED</div>
          <div style="max-width:420px;margin:0 auto 28px auto;padding:20px 28px;background:rgba(102,51,204,0.15);border:1px solid #6633cc55;border-radius:10px;text-align:left;">
            <div style="font-size:13px;color:#ccbbee;line-height:1.7;margin-bottom:16px;font-style:italic;text-align:center;">
              Cathedral guardian. Fly as a gargoyle, defend the cathedral from demons through the night. At dawn, turn to stone — position wisely to guard key approaches.
            </div>
            <div style="font-size:12px;color:#aa99cc;letter-spacing:1px;font-weight:bold;margin-bottom:8px;text-align:center;">CONTROLS</div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:13px;">
              <span style="color:#bb99ff;font-weight:bold;font-family:monospace;">WASD</span><span style="color:#ccc;">Fly / Move</span>
              <span style="color:#bb99ff;font-weight:bold;font-family:monospace;">Mouse</span><span style="color:#ccc;">Look around</span>
              <span style="color:#bb99ff;font-weight:bold;font-family:monospace;">Left Click</span><span style="color:#ccc;">Claw attack</span>
              <span style="color:#bb99ff;font-weight:bold;font-family:monospace;">Right Click</span><span style="color:#ccc;">Stone throw</span>
              <span style="color:#bb99ff;font-weight:bold;font-family:monospace;">SPACE</span><span style="color:#ccc;">Dive bomb</span>
              <span style="color:#bb99ff;font-weight:bold;font-family:monospace;">SHIFT</span><span style="color:#ccc;">Glide</span>
              <span style="color:#bb99ff;font-weight:bold;font-family:monospace;">ESC</span><span style="color:#ccc;">Pause</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;align-items:center;">
            <button id="gargoyle-pause-resume" style="pointer-events:auto;padding:12px 48px;font-size:16px;background:#6633cc;color:#fff;
              border:none;border-radius:8px;cursor:pointer;font-weight:bold;letter-spacing:2px;transition:all 0.2s;">RESUME</button>
            <button id="gargoyle-pause-restart" style="pointer-events:auto;padding:10px 40px;font-size:14px;background:#882222;color:#fff;
              border:none;border-radius:6px;cursor:pointer;font-weight:bold;letter-spacing:1px;transition:all 0.2s;">RESTART</button>
            <button id="gargoyle-pause-quit" style="pointer-events:auto;padding:10px 40px;font-size:14px;background:transparent;color:#777;
              border:1px solid #444;border-radius:6px;cursor:pointer;letter-spacing:1px;transition:all 0.2s;">QUIT</button>
          </div>
        </div>
      </div>`;
    }

    // --- Menu ---
    if (state.phase === "menu") {
      // Only rebuild menu DOM when difficulty changes to keep buttons stable for clicks
      if (this._menuBuilt && this._menuDifficulty === state.difficulty) {
        this._drawMinimap(state);
        return;
      }
      this._menuBuilt = true;
      this._menuDifficulty = state.difficulty;
      html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;
        background:radial-gradient(ellipse at center, #1a1030 0%, #0a0618 100%);pointer-events:auto;">
        <div style="text-align:center;max-width:600px;">
          <div style="font-size:52px;font-weight:bold;color:#9966ff;text-shadow:0 0 30px #6633cc;margin-bottom:4px;letter-spacing:4px;">
            GARGOYLE
          </div>
          <div style="font-size:18px;color:#8877aa;margin-bottom:30px;letter-spacing:6px;">CATHEDRAL GUARDIAN</div>
          <div style="font-size:15px;color:#aaa;margin-bottom:16px;line-height:1.6;">
            Defend the cathedral from demons through the night.<br>
            At dawn, you turn to stone. Position wisely.
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;font-size:13px;color:#777;margin-bottom:28px;text-align:left;max-width:400px;margin-left:auto;margin-right:auto;">
            <div>WASD</div><div>Fly</div>
            <div>Space / Ctrl</div><div>Ascend / Descend</div>
            <div>Shift</div><div>Sprint</div>
            <div>LMB</div><div>Talon Strike</div>
            <div>RMB</div><div>Stone Breath (petrify)</div>
            <div>Q</div><div>Dive Bomb (AoE)</div>
            <div>F</div><div>Wing Gust (knockback)</div>
            <div>E</div><div>Perch on Cathedral</div>
            <div>X</div><div>Dash (iframes)</div>
            <div>Tab</div><div>Stone Skin (invulnerable)</div>
            <div>R</div><div>Consecrate (holy AoE)</div>
          </div>
          <button id="gargoyle-start-btn" style="pointer-events:auto;padding:14px 48px;font-size:18px;background:#6633cc;color:#fff;
            border:none;border-radius:8px;cursor:pointer;letter-spacing:3px;transition:all 0.2s;font-weight:bold;">
            AWAKEN
          </button>
          <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;">
            ${(["easy","normal","hard","nightmare"] as const).map(d => {
              const dColors: Record<string, string> = { easy: "#44aa44", normal: "#4488cc", hard: "#cc6622", nightmare: "#cc2222" };
              const selected = state.difficulty === d;
              return `<button class="gargoyle-diff-btn" data-diff="${d}" style="pointer-events:auto;padding:5px 14px;font-size:12px;
                background:${dColors[d]}33;color:${dColors[d]};border:2px solid ${selected ? "#fff" : dColors[d]}44;
                border-radius:4px;cursor:pointer;font-weight:bold;letter-spacing:1px;transition:all 0.2s;
                ${selected ? `box-shadow:0 0 8px ${dColors[d]};` : ""}">
                ${d.toUpperCase()}</button>`;
            }).join("")}
          </div>
          <br>
          <button id="gargoyle-back-btn" style="pointer-events:auto;padding:8px 24px;font-size:13px;background:transparent;color:#555;
            border:1px solid #333;border-radius:6px;cursor:pointer;margin-top:16px;">
            Back to Menu
          </button>
          ${(() => {
            const savedBest = parseInt(localStorage.getItem("gargoyle_best") || "0", 10);
            const displayBest = Math.max(state.bestWave, isNaN(savedBest) ? 0 : savedBest);
            if (displayBest > 0) {
              return `<div style="font-size:12px;color:#666;margin-top:12px;">Best: Wave ${displayBest}</div>
                <div style="font-size:13px;color:#8877aa;margin-top:8px;letter-spacing:1px;opacity:0.8;">Press to continue...</div>`;
            }
            return "";
          })()}
        </div>
      </div>`;
    } else {
      this._menuBuilt = false;
    }

    // --- Upgrade screen ---
    if (state.phase === "day") {
      html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;
        background:rgba(255,240,200,0.1);pointer-events:auto;">
        <div style="text-align:center;background:#12121e;padding:28px 36px;border-radius:12px;border:1px solid #332266;">
          <div style="font-size:22px;color:#ffcc44;margin-bottom:4px;font-weight:bold;">Daybreak</div>
          <div style="font-size:12px;color:#aaa;margin-bottom:4px;">Killed: ${state.demonsKilled} &nbsp;|&nbsp; Combo: x${p.maxCombo} &nbsp;|&nbsp; Cathedral: ${Math.ceil(cat.hp)}/${cat.maxHp}</div>
          <div style="font-size:13px;color:#888;margin-bottom:16px;">Night ${state.wave} survived — choose upgrades</div>
          <div style="font-size:15px;color:#bb88ff;margin-bottom:16px;">Souls: <span style="font-size:20px;font-weight:bold;">${p.soulEssence}</span></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">`;

      for (const upg of UPGRADES) {
        const currentLevel = p[upg.field];
        const maxed = currentLevel >= upg.maxLevel;
        const cost = getUpgradeCost(upg, currentLevel);
        const canAfford = p.soulEssence >= cost;
        const borderColor = maxed ? "#333" : canAfford ? "#6633cc" : "#222";

        // Level pips
        let pips = "";
        for (let i = 0; i < upg.maxLevel; i++) {
          const filled = i < currentLevel;
          pips += `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 2px;
            background:${filled ? "#bb88ff" : "#222"};border:1px solid ${filled ? "#cc99ff" : "#444"};"></span>`;
        }

        html += `<div style="width:130px;padding:10px;background:#0a0a16;border-radius:8px;border:1px solid ${borderColor};
          transition:border-color 0.2s;">
          <div style="font-size:12px;color:#cc99ff;font-weight:bold;margin-bottom:2px;">${upg.name}</div>
          <div style="font-size:10px;color:#777;margin-bottom:6px;">${upg.description}</div>
          <div style="margin-bottom:6px;">${pips}</div>
          <button class="gargoyle-upgrade-btn" data-upgrade="${upg.id}"
            style="pointer-events:${maxed ? "none" : "auto"};padding:5px 14px;font-size:11px;
            background:${maxed ? "#333" : canAfford ? "#6633cc" : "#1a1a2a"};
            color:${maxed ? "#555" : canAfford ? "#fff" : "#666"};
            border:${maxed ? "none" : canAfford ? "none" : "1px solid #333"};
            border-radius:4px;cursor:${maxed ? "default" : "pointer"};transition:all 0.2s;">
            ${maxed ? "MAX" : `${cost} Souls`}
          </button>
        </div>`;
      }

      html += `</div>
          <div style="font-size:12px;color:#666;margin-top:14px;">Next night in ${Math.ceil(Math.max(0, state.phaseTimer))}s</div>
        </div>
      </div>`;
    }

    // --- Game Over ---
    if (state.phase === "game_over") {
      html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;
        background:rgba(15,0,0,0.75);pointer-events:auto;">
        <div style="text-align:center;">
          <div style="font-size:42px;font-weight:bold;color:#ff2222;text-shadow:0 0 20px #ff000080;margin-bottom:8px;">
            ${state.cathedral.hp <= 0 ? "CATHEDRAL FALLEN" : "YOU HAVE SHATTERED"}
          </div>
          <div style="font-size:18px;color:#cc8888;margin-bottom:4px;">Survived ${state.wave} nights</div>
          <div style="font-size:14px;color:#888;margin-bottom:4px;">Total kills: ${state.totalKills}</div>
          <div style="font-size:14px;color:#ff8844;margin-bottom:16px;">Best combo: x${p.maxCombo}</div>
          <div style="display:grid;grid-template-columns:auto auto;gap:2px 16px;font-size:13px;color:#888;margin-bottom:24px;text-align:left;max-width:320px;margin-left:auto;margin-right:auto;">
            <div>Damage Dealt</div><div style="text-align:right;">${state.stats.damageDealt.toLocaleString()}</div>
            <div>Damage Taken</div><div style="text-align:right;">${state.stats.damageTaken.toLocaleString()}</div>
            <div>Cathedral Damage</div><div style="text-align:right;">${state.stats.cathedralDamage.toLocaleString()}</div>
            <div>Close Range Kills</div><div style="text-align:right;">${state.stats.closeKills.toLocaleString()}</div>
            <div>Total Souls Earned</div><div style="text-align:right;">${state.stats.soulsEarned.toLocaleString()}</div>
            <div>Abilities Used</div><div style="text-align:right;">${state.stats.abilitiesUsed.toLocaleString()}</div>
          </div>
          <button id="gargoyle-restart-btn" style="pointer-events:auto;padding:12px 36px;font-size:16px;background:#882222;color:#fff;
            border:none;border-radius:8px;cursor:pointer;margin-right:12px;font-weight:bold;">REAWAKEN</button>
          <button id="gargoyle-quit-btn" style="pointer-events:auto;padding:12px 36px;font-size:16px;background:transparent;color:#777;
            border:1px solid #444;border-radius:8px;cursor:pointer;">QUIT</button>
        </div>
      </div>`;
    }

    // --- Controls hint ---
    if (state.phase === "night" || state.phase === "dawn") {
      html += `<div style="position:absolute;bottom:16px;right:16px;font-size:10px;color:#444;text-align:right;line-height:1.6;">
        E — Perch &nbsp; X — Dash &nbsp; Tab — Stone Skin &nbsp; ESC — Pause
      </div>`;
    }

    this._root.innerHTML = html;

    // --- Minimap ---
    this._drawMinimap(state);

    // Bind buttons
    const startBtn = document.getElementById("gargoyle-start-btn");
    if (startBtn) startBtn.onclick = () => {
      state.phase = "dusk";
      state.phaseTimer = GARG.DUSK_DURATION;
    };
    const backBtn = document.getElementById("gargoyle-back-btn");
    if (backBtn) backBtn.onclick = () => this._onExit?.();
    document.querySelectorAll(".gargoyle-diff-btn").forEach(btn => {
      (btn as HTMLButtonElement).onclick = () => {
        state.difficulty = (btn as HTMLElement).dataset.diff as GargoyleState["difficulty"];
      };
    });
    const restartBtn = document.getElementById("gargoyle-restart-btn");
    if (restartBtn) restartBtn.onclick = () => window.dispatchEvent(new Event("gargoyleRestart"));
    const quitBtn = document.getElementById("gargoyle-quit-btn");
    if (quitBtn) quitBtn.onclick = () => this._onExit?.();

    // Pause buttons
    const pauseResumeBtn = document.getElementById("gargoyle-pause-resume");
    if (pauseResumeBtn) pauseResumeBtn.onclick = () => { state.paused = false; };
    const pauseRestartBtn = document.getElementById("gargoyle-pause-restart");
    if (pauseRestartBtn) pauseRestartBtn.onclick = () => window.dispatchEvent(new Event("gargoyleRestart"));
    const pauseQuitBtn = document.getElementById("gargoyle-pause-quit");
    if (pauseQuitBtn) pauseQuitBtn.onclick = () => this._onExit?.();

    // Tutorial tip dismiss
    const tipDismissBtn = document.getElementById("gargoyle-tip-dismiss");
    if (tipDismissBtn) tipDismissBtn.onclick = () => { state.tutorialTips.splice(0, 1); };

    // Upgrade buttons
    document.querySelectorAll(".gargoyle-upgrade-btn").forEach(btn => {
      (btn as HTMLButtonElement).onclick = () => {
        const upgId = (btn as HTMLElement).dataset.upgrade;
        const upg = UPGRADES.find(u => u.id === upgId);
        if (!upg) return;
        const currentLevel = p[upg.field];
        const upgCost = getUpgradeCost(upg, currentLevel);
        if (currentLevel >= upg.maxLevel || p.soulEssence < upgCost) return;
        p.soulEssence -= upgCost;
        (p as unknown as Record<string, number>)[upg.field] = currentLevel + 1;
        if (upg.field === "wingLevel") p.maxStamina = GARG.STAMINA_MAX + p.wingLevel * 10;
        if (upg.field === "armorLevel") p.maxHp = GARG.MAX_HP + p.armorLevel * 15;
      };
    });
  }

  private _drawMinimap(state: GargoyleState): void {
    if (state.phase === "menu" || state.phase === "game_over") {
      this._minimapCanvas.style.display = "none";
      return;
    }
    this._minimapCanvas.style.display = "block";

    const ctx = this._minimapCtx;
    const w = 140, h = 140;
    const cx = w / 2, cy = h / 2;
    const scale = w / (GARG.GROUND_SIZE * 0.8);

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "#0a0a14";
    ctx.beginPath();
    ctx.arc(cx, cy, cx, 0, Math.PI * 2);
    ctx.fill();

    // Cathedral (center)
    ctx.fillStyle = "#445566";
    const catW = GARG.CATHEDRAL_WIDTH * scale;
    const catH = GARG.CATHEDRAL_LENGTH * scale;
    ctx.fillRect(cx - catW / 2, cy - catH / 2, catW, catH);

    // Demons
    state.demons.forEach(d => {
      if (d.behavior === "dead") return;
      const dx = cx + d.pos.x * scale;
      const dz = cy + d.pos.z * scale;
      if (dx < 0 || dx > w || dz < 0 || dz > h) return;
      ctx.fillStyle = d.type === "hellion" ? "#ff4400" : d.type === "wraith" ? "#6644aa" : d.type === "necromancer" ? "#44ff88" : d.type === "brute" ? "#996633" : "#cc2222";
      const size = d.type === "hellion" ? 3 : d.type === "brute" ? 2.5 : 1.5;
      ctx.fillRect(dx - size / 2, dz - size / 2, size, size);
    });

    // Soul orbs
    ctx.fillStyle = "#8844ff88";
    for (const orb of state.soulOrbs) {
      const ox = cx + orb.pos.x * scale;
      const oz = cy + orb.pos.z * scale;
      ctx.fillRect(ox - 1, oz - 1, 2, 2);
    }

    // Health orbs
    ctx.fillStyle = "#44cc44";
    for (const orb of state.healthOrbs) {
      const ox = cx + orb.pos.x * scale;
      const oz = cy + orb.pos.z * scale;
      ctx.fillRect(ox - 1, oz - 1, 2, 2);
    }

    // Projectiles
    ctx.fillStyle = "#ff8844";
    for (const proj of state.projectiles) {
      const projX = cx + proj.pos.x * scale;
      const projZ = cy + proj.pos.z * scale;
      ctx.fillRect(projX - 1, projZ - 1, 2, 2);
    }

    // Player
    ctx.fillStyle = "#44aaff";
    const px = cx + state.player.pos.x * scale;
    const pz = cy + state.player.pos.z * scale;
    ctx.beginPath();
    ctx.arc(px, pz, 3, 0, Math.PI * 2);
    ctx.fill();

    // Player direction indicator
    ctx.strokeStyle = "#44aaff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, pz);
    ctx.lineTo(px + Math.sin(state.player.yaw) * 8, pz + Math.cos(state.player.yaw) * 8);
    ctx.stroke();

    // Circular border mask
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  cleanup(): void {
    this._root?.remove();
    this._minimapCanvas?.remove();
  }
}
