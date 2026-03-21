// ---------------------------------------------------------------------------
// Morgan -- HTML HUD overlay
// Displays HP, mana, stamina, spells, minimap, messages, alert, keys,
// stealth rating, objectives, screen flash effects
// ---------------------------------------------------------------------------

import {
  MorganSpell, PickupType,
  FLOOR_W, FLOOR_H, CELL_SIZE, TileType, GuardState, GuardType,
  SPELL_UPGRADES, STAT_UPGRADES,
} from "./MorganConfig";
import type { MorganGameState } from "./MorganState";

const SPELL_NAMES: Record<MorganSpell, string> = {
  [MorganSpell.SHADOW_CLOAK]: "Shadow Cloak",
  [MorganSpell.DARK_BOLT]: "Dark Bolt",
  [MorganSpell.SLEEP_MIST]: "Sleep Mist",
  [MorganSpell.BLINK]: "Blink",
  [MorganSpell.DECOY]: "Decoy",
};

const SPELL_ICONS: Record<MorganSpell, string> = {
  [MorganSpell.SHADOW_CLOAK]: "\u2588",
  [MorganSpell.DARK_BOLT]: "\u26A1",
  [MorganSpell.SLEEP_MIST]: "\u2601",
  [MorganSpell.BLINK]: "\u21DD",
  [MorganSpell.DECOY]: "\u2302",
};

const SPELL_KEYS = ["1", "2", "3", "4", "5"];

export class MorganHUD {
  private _container!: HTMLDivElement;
  private _minimapCanvas!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;
  private _flashDiv!: HTMLDivElement;
  private _objectivesVisible = false;

  init(): void {
    this._container = document.createElement("div");
    this._container.id = "morgan-hud";
    this._container.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      pointer-events:none;z-index:10;font-family:'Cinzel',serif;
      color:#ddd;
    `;

    this._container.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        #morgan-hud * { box-sizing:border-box; }
        .morgan-bar { height:8px;border-radius:4px;transition:width 0.15s; }
        .morgan-spell { padding:6px 10px;border:1px solid #444;border-radius:6px;font-size:11px;
          background:rgba(10,10,20,0.7);transition:all 0.2s;text-align:center;min-width:65px; }
        .morgan-spell.active { border-color:#8844ff;background:rgba(80,30,120,0.5);
          box-shadow:0 0 10px rgba(136,68,255,0.4); }
        .morgan-msg { font-size:13px;text-shadow:0 0 6px rgba(0,0,0,0.9);
          margin-bottom:3px;transition:opacity 0.3s;line-height:1.4; }
        .morgan-key-icon { display:inline-block;color:#ffd700;font-size:14px;margin-right:2px; }
      </style>

      <!-- Top-left: level info + timer -->
      <div style="position:absolute;top:12px;left:12px;">
        <div id="morgan-level" style="font-size:16px;font-weight:bold;
          text-shadow:0 0 8px rgba(100,50,200,0.6);"></div>
        <div id="morgan-timer" style="font-size:11px;color:#777;margin-top:2px;"></div>
      </div>

      <!-- Top-right: alert status -->
      <div id="morgan-alert" style="position:absolute;top:12px;right:12px;font-size:14px;font-weight:bold;
        padding:6px 16px;border-radius:6px;transition:all 0.3s;"></div>

      <!-- Bottom-left: bars + keys -->
      <div style="position:absolute;bottom:12px;left:12px;width:220px;">
        <div id="morgan-keys" style="margin-bottom:8px;font-size:12px;"></div>
        <div style="margin-bottom:5px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10px;color:#ff6666;letter-spacing:1px;">HP</span>
            <span id="morgan-hp-text" style="font-size:10px;color:#ff6666;"></span>
          </div>
          <div style="background:rgba(60,20,20,0.6);border-radius:4px;overflow:hidden;">
            <div id="morgan-hp-bar" class="morgan-bar" style="background:linear-gradient(90deg,#ff3333,#cc2222);width:100%;"></div>
          </div>
        </div>
        <div style="margin-bottom:5px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10px;color:#6666ff;letter-spacing:1px;">MANA</span>
            <span id="morgan-mana-text" style="font-size:10px;color:#6666ff;"></span>
          </div>
          <div style="background:rgba(20,20,60,0.6);border-radius:4px;overflow:hidden;">
            <div id="morgan-mana-bar" class="morgan-bar" style="background:linear-gradient(90deg,#6644ff,#4422cc);width:100%;"></div>
          </div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10px;color:#ffcc33;letter-spacing:1px;">STAMINA</span>
          </div>
          <div style="background:rgba(60,50,20,0.6);border-radius:4px;overflow:hidden;">
            <div id="morgan-stam-bar" class="morgan-bar" style="background:linear-gradient(90deg,#ffcc33,#cc9922);width:100%;"></div>
          </div>
        </div>
      </div>

      <!-- Bottom-center: spells -->
      <div id="morgan-spells" style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
        display:flex;gap:6px;"></div>

      <!-- Bottom-right: minimap -->
      <div style="position:absolute;bottom:12px;right:12px;">
        <canvas id="morgan-minimap" width="150" height="150" style="border:1px solid #333;border-radius:4px;
          background:rgba(5,5,10,0.8);"></canvas>
      </div>

      <!-- Right: messages -->
      <div id="morgan-messages" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);
        text-align:right;max-width:320px;"></div>

      <!-- Top-center: score & artifacts -->
      <div id="morgan-score" style="position:absolute;top:12px;left:50%;transform:translateX(-50%);
        font-size:14px;text-align:center;"></div>

      <!-- Left side: visibility + noise meters -->
      <div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:6px;">
        <div style="font-size:8px;color:#666;text-align:center;margin-bottom:2px;">VIS</div>
        <div style="background:rgba(30,30,30,0.6);border-radius:3px;height:60px;overflow:hidden;position:relative;">
          <div id="morgan-vis-bar" style="position:absolute;bottom:0;width:100%;border-radius:3px;
            background:linear-gradient(0deg,#ffcc33,#ff6600);transition:height 0.2s;"></div>
        </div>
        <div style="font-size:8px;color:#666;text-align:center;margin-top:6px;margin-bottom:2px;">SND</div>
        <div style="background:rgba(30,30,30,0.6);border-radius:3px;height:60px;overflow:hidden;position:relative;">
          <div id="morgan-noise-bar" style="position:absolute;bottom:0;width:100%;border-radius:3px;
            background:linear-gradient(0deg,#44cc44,#ff4444);transition:height 0.2s;"></div>
        </div>
      </div>

      <!-- Combo counter -->
      <div id="morgan-combo" style="position:absolute;left:50%;bottom:65px;transform:translateX(-50%);
        font-size:20px;font-weight:bold;text-align:center;display:none;
        text-shadow:0 0 10px rgba(200,100,255,0.6);color:#cc88ff;"></div>

      <!-- Controls hint (fades after first few seconds) -->
      <div id="morgan-controls" style="position:absolute;bottom:50px;left:24px;font-size:10px;color:#555;
        line-height:1.5;"></div>

      <!-- Objectives panel (Tab toggle) -->
      <div id="morgan-objectives" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        background:rgba(5,5,15,0.92);border:1px solid #6633cc;border-radius:10px;
        padding:25px 35px;min-width:320px;display:none;font-size:14px;
        box-shadow:0 0 30px rgba(100,50,200,0.3);"></div>

      <!-- Screen flash overlay -->
      <div id="morgan-flash" style="position:absolute;top:0;left:0;width:100%;height:100%;
        pointer-events:none;transition:opacity 0.15s;opacity:0;"></div>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._container);

    this._minimapCanvas = document.getElementById("morgan-minimap") as HTMLCanvasElement;
    this._minimapCtx = this._minimapCanvas.getContext("2d")!;
    this._flashDiv = document.getElementById("morgan-flash") as HTMLDivElement;
  }

  update(state: MorganGameState): void {
    const p = state.player;

    // Bars
    const hpBar = document.getElementById("morgan-hp-bar");
    const manaBar = document.getElementById("morgan-mana-bar");
    const stamBar = document.getElementById("morgan-stam-bar");
    if (hpBar) hpBar.style.width = `${(p.hp / p.maxHp) * 100}%`;
    if (manaBar) manaBar.style.width = `${(p.mana / p.maxMana) * 100}%`;
    if (stamBar) stamBar.style.width = `${(p.stamina / p.maxStamina) * 100}%`;

    // Numeric values
    const hpText = document.getElementById("morgan-hp-text");
    if (hpText) hpText.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
    const manaText = document.getElementById("morgan-mana-text");
    if (manaText) manaText.textContent = `${Math.ceil(p.mana)}/${p.maxMana}`;

    // Keys + Gold
    const keysEl = document.getElementById("morgan-keys");
    if (keysEl) {
      const parts: string[] = [];
      if (p.keys > 0) parts.push(`<span class="morgan-key-icon">\u{1F511}</span> x${p.keys}`);
      if (p.gold > 0) parts.push(`<span style="color:#ffd700;font-size:12px;">\u2B50 ${p.gold}</span>`);
      keysEl.innerHTML = parts.join(' &nbsp; ');
    }

    // Level info + timer
    const levelEl = document.getElementById("morgan-level");
    if (levelEl) levelEl.textContent = `${state.levelDef.name}`;
    const timerEl = document.getElementById("morgan-timer");
    if (timerEl) {
      const mins = Math.floor(state.time / 60);
      const secs = Math.floor(state.time % 60);
      timerEl.textContent = `Level ${state.level}/7 \u2014 ${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Alert
    const alertEl = document.getElementById("morgan-alert");
    if (alertEl) {
      switch (state.alertLevel) {
        case 0:
          alertEl.textContent = "HIDDEN";
          alertEl.style.cssText += ";background:rgba(20,60,20,0.6);color:#44cc44;border:1px solid #44cc44;";
          break;
        case 1:
          alertEl.textContent = "SUSPICIOUS";
          alertEl.style.cssText += ";background:rgba(60,50,20,0.6);color:#ccaa33;border:1px solid #ccaa33;";
          break;
        case 2:
          alertEl.textContent = "ALERT!";
          alertEl.style.cssText += ";background:rgba(60,20,20,0.6);color:#ff4444;border:1px solid #ff4444;";
          break;
      }
    }

    // Spells (with cooldown overlay)
    const spellsEl = document.getElementById("morgan-spells");
    if (spellsEl) {
      spellsEl.innerHTML = p.spells.map((spell, i) => {
        const upgraded = p.upgrades.has(`${spell}_1`) ? ' \u2B06' : '';
        const cd = p.spellCooldowns[spell] || 0;
        const onCooldown = cd > 0;
        const cdText = onCooldown ? `<div style="font-size:9px;color:#ff6644;margin-top:2px;">${cd.toFixed(1)}s</div>` : '';
        return `
          <div class="morgan-spell ${i === p.selectedSpell ? 'active' : ''}"
            style="${onCooldown ? 'opacity:0.5;' : ''}">
            <div style="font-size:16px;margin-bottom:2px;">${SPELL_ICONS[spell]}</div>
            <span style="color:#888;font-size:9px;">[${SPELL_KEYS[i]}]</span>
            <div style="font-size:10px;">${SPELL_NAMES[spell]}${upgraded}</div>
            ${cdText}
          </div>
        `;
      }).join("");
    }

    // Score
    const scoreEl = document.getElementById("morgan-score");
    if (scoreEl) {
      const statParts: string[] = [];
      statParts.push(`Score: ${p.score}`);
      const artStr = `Artifacts: ${p.artifacts}/${state.artifacts.length}`;
      const extras: string[] = [];
      if (state.exitOpen) extras.push('<span style="color:#00ff88;">EXIT OPEN</span>');
      if (p.cloaked) extras.push('<span style="color:#8844ff;">CLOAKED</span>');
      if (p.sneaking) extras.push('<span style="color:#aaaacc;">SNEAKING</span>');
      scoreEl.innerHTML = `
        <div>${statParts.join(' \u2014 ')}</div>
        <div style="font-size:12px;color:#aaa;">
          ${artStr}${extras.length ? ' \u2014 ' + extras.join(' \u2014 ') : ''}
        </div>
        <div style="font-size:11px;color:#887799;">XP: ${state.totalXP}</div>
      `;
    }

    // Messages
    const msgEl = document.getElementById("morgan-messages");
    if (msgEl) {
      msgEl.innerHTML = state.messages.map(m =>
        `<div class="morgan-msg" style="opacity:${Math.min(1, m.timer)};color:${m.color || '#dda'};">${m.text}</div>`
      ).join("");
    }

    // Visibility & noise meters
    const visBar = document.getElementById("morgan-vis-bar");
    if (visBar) visBar.style.height = `${p.visibility * 100}%`;
    const noiseBar = document.getElementById("morgan-noise-bar");
    if (noiseBar) noiseBar.style.height = `${p.noiseLevel * 100}%`;

    // Combo counter
    const comboEl = document.getElementById("morgan-combo");
    if (comboEl) {
      if (p.comboCount > 1) {
        comboEl.style.display = "block";
        comboEl.textContent = `x${p.comboCount} COMBO`;
        comboEl.style.opacity = `${Math.min(1, p.comboTimer)}`;
      } else {
        comboEl.style.display = "none";
      }
    }

    // Controls hint (hide after 15 seconds)
    const ctrlEl = document.getElementById("morgan-controls");
    if (ctrlEl) {
      if (state.time < 15) {
        ctrlEl.innerHTML = `
          WASD: Move | Q/E: Strafe | Shift: Sneak<br>
          Ctrl: Sprint | F: Backstab | R: Interact<br>
          1-5: Spell | Space: Cast | Tab: Objectives<br>
          G: Extinguish Torch | T: Throw Distraction
        `;
        ctrlEl.style.opacity = `${Math.max(0, 1 - (state.time - 10) / 5)}`;
      } else {
        ctrlEl.style.display = "none";
      }
    }

    // Screen flash
    if (state.screenFlash && this._flashDiv) {
      this._flashDiv.style.background = state.screenFlash.color;
      this._flashDiv.style.opacity = `${Math.min(1, state.screenFlash.timer * 3)}`;
    } else if (this._flashDiv) {
      this._flashDiv.style.opacity = "0";
    }

    // Minimap
    this._drawMinimap(state);
  }

  toggleObjectives(state: MorganGameState): void {
    this._objectivesVisible = !this._objectivesVisible;
    const el = document.getElementById("morgan-objectives");
    if (!el) return;
    if (this._objectivesVisible) {
      const guards = state.guards.filter(g => g.hp > 0);
      const sleeping = guards.filter(g => g.state === GuardState.SLEEPING).length;
      el.style.display = "block";
      el.innerHTML = `
        <h3 style="color:#8844ff;margin:0 0 15px 0;font-size:18px;text-align:center;">Objectives</h3>
        <div style="margin-bottom:10px;">
          ${state.artifacts.every(a => a.collected)
            ? '<span style="color:#00ff88;">\u2713</span> All artifacts collected \u2014 find the exit!'
            : `<span style="color:#ffd700;">\u25CB</span> Collect artifacts: ${state.player.artifacts}/${state.artifacts.length}`}
        </div>
        <div style="margin-bottom:15px;">
          <span style="color:${state.exitOpen ? '#00ff88' : '#777'};">${state.exitOpen ? '\u2713' : '\u25CB'}</span>
          Reach the exit portal
        </div>
        <hr style="border-color:#333;margin:12px 0;">
        <div style="font-size:12px;color:#999;">
          Guards: ${guards.length} alive (${sleeping} sleeping)<br>
          Detections: ${state.levelStats.timesDetected}<br>
          Kills: ${state.levelStats.guardsKilled}<br>
          Keys: ${state.player.keys}<br>
          Time: ${Math.floor(state.time / 60)}:${Math.floor(state.time % 60).toString().padStart(2, '0')}
        </div>
        <div style="font-size:11px;color:#665588;margin-top:12px;text-align:center;">
          Press Tab to close
        </div>
      `;
    } else {
      el.style.display = "none";
    }
  }

  private _drawMinimap(state: MorganGameState): void {
    const ctx = this._minimapCtx;
    const cw = 150, ch = 150;
    const scale = cw / FLOOR_W;
    ctx.clearRect(0, 0, cw, ch);

    for (let y = 0; y < FLOOR_H; y++) {
      for (let x = 0; x < FLOOR_W; x++) {
        const tile = state.tiles[y][x];
        switch (tile) {
          case TileType.WALL: ctx.fillStyle = "#1a1a1a"; break;
          case TileType.FLOOR: ctx.fillStyle = "#1a1a2a"; break;
          case TileType.SHADOW: ctx.fillStyle = "#0a0a15"; break;
          case TileType.DOOR: ctx.fillStyle = "#4a3520"; break;
          case TileType.LOCKED_DOOR: ctx.fillStyle = "#886633"; break;
          case TileType.TORCH: ctx.fillStyle = "#553300"; break;
          case TileType.EXIT: ctx.fillStyle = state.exitOpen ? "#00ff88" : "#1a1a2a"; break;
          case TileType.TRAP_WARD: ctx.fillStyle = "#331100"; break;
          case TileType.TRAP_PRESSURE: ctx.fillStyle = "#1a1a2a"; break;
          case TileType.WATER: ctx.fillStyle = "#112244"; break;
          case TileType.FIRE_GRATE: ctx.fillStyle = "#442200"; break;
        }
        ctx.fillRect(x * scale, y * scale, scale + 0.5, scale + 0.5);
      }
    }

    // Pickups
    for (const pickup of state.pickups) {
      if (pickup.collected) continue;
      ctx.fillStyle = pickup.type === PickupType.KEY ? "#ffd700" :
                       pickup.type === PickupType.HEALTH_POTION ? "#ff3333" : "#4444ff";
      const px = pickup.pos.x / CELL_SIZE * scale;
      const pz = pickup.pos.z / CELL_SIZE * scale;
      ctx.fillRect(px - 1, pz - 1, 2, 2);
    }

    // Artifacts
    for (const art of state.artifacts) {
      if (art.collected) continue;
      ctx.fillStyle = "#ffd700";
      const ax = art.pos.x / CELL_SIZE * scale;
      const az = art.pos.z / CELL_SIZE * scale;
      ctx.beginPath();
      ctx.arc(ax, az, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Decoys
    for (const decoy of state.decoys) {
      ctx.fillStyle = "#aa66ff";
      const dx = decoy.pos.x / CELL_SIZE * scale;
      const dz = decoy.pos.z / CELL_SIZE * scale;
      ctx.fillRect(dx - 1, dz - 1, 3, 3);
    }

    // Guards
    for (const guard of state.guards) {
      if (guard.hp <= 0) continue;
      ctx.fillStyle = guard.state === GuardState.ALERT ? "#ff4444" :
                       guard.state === GuardState.SLEEPING ? "#6666aa" :
                       guard.state === GuardState.INVESTIGATING ? "#ccaa33" :
                       guard.guardType === GuardType.HOUND ? "#885522" :
                       guard.guardType === GuardType.MAGE ? "#4444cc" :
                       guard.guardType === GuardType.HEAVY ? "#666688" : "#cc3333";
      const gx = guard.pos.x / CELL_SIZE * scale;
      const gz = guard.pos.z / CELL_SIZE * scale;
      ctx.fillRect(gx - 1.5, gz - 1.5, 3, 3);
      // View direction
      if (guard.state !== GuardState.SLEEPING) {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(gx, gz);
        ctx.lineTo(gx + Math.sin(guard.angle) * 4, gz + Math.cos(guard.angle) * 4);
        ctx.stroke();
      }
    }

    // Player
    ctx.fillStyle = state.player.cloaked ? "#4422aa" : "#8844ff";
    const px = state.player.pos.x / CELL_SIZE * scale;
    const pz = state.player.pos.z / CELL_SIZE * scale;
    ctx.beginPath();
    ctx.arc(px, pz, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Player direction
    ctx.strokeStyle = "#aa66ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, pz);
    ctx.lineTo(
      px + Math.sin(state.player.angle) * 7,
      pz + Math.cos(state.player.angle) * 7,
    );
    ctx.stroke();
  }

  showPauseMenu(onResume: () => void, onExit: () => void): void {
    const div = document.createElement("div");
    div.id = "morgan-pause";
    div.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      background:rgba(5,5,15,0.85);z-index:20;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Cinzel',serif;color:#ddd;
    `;
    div.innerHTML = `
      <h2 style="font-size:28px;color:#8844ff;margin-bottom:30px;text-shadow:0 0 12px rgba(136,68,255,0.5);">PAUSED</h2>
      <button id="morgan-resume" style="padding:12px 40px;margin:8px;font-size:16px;
        border:1px solid #8844ff;border-radius:8px;background:rgba(60,30,100,0.4);
        color:#ddd;cursor:pointer;font-family:inherit;pointer-events:auto;">Resume</button>
      <button id="morgan-quit" style="padding:12px 40px;margin:8px;font-size:16px;
        border:1px solid #555;border-radius:8px;background:rgba(40,20,20,0.4);
        color:#aaa;cursor:pointer;font-family:inherit;pointer-events:auto;">Quit to Menu</button>
    `;
    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(div);
    document.getElementById("morgan-resume")?.addEventListener("click", () => { div.remove(); onResume(); });
    document.getElementById("morgan-quit")?.addEventListener("click", () => { div.remove(); onExit(); });
  }

  showLevelComplete(state: MorganGameState, onNext: () => void, onUpgrade: () => void): void {
    const stats = state.levelStats;
    const time = stats.endTime - stats.startTime;
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);

    // Collect all badges earned
    const badges: { label: string; color: string }[] = [];
    if (stats.timesDetected === 0) badges.push({ label: "GHOST", color: "#ffd700" });
    else if (stats.timesDetected <= 2) badges.push({ label: "SHADOW", color: "#cc88ff" });
    if (stats.guardsKilled === 0) badges.push({ label: "PACIFIST", color: "#44ffaa" });
    if (time < 60) badges.push({ label: "SPEEDRUN", color: "#ffaa00" });
    else if (time < 120) badges.push({ label: "SWIFT", color: "#ccaa44" });
    if (stats.trapsTriggered === 0) badges.push({ label: "UNTOUCHED", color: "#44cccc" });
    if (badges.length === 0) badges.push({ label: "COMPLETED", color: "#888" });

    const div = document.createElement("div");
    div.id = "morgan-level-complete";
    div.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      background:rgba(5,5,15,0.88);z-index:20;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Cinzel',serif;color:#ddd;
    `;
    div.innerHTML = `
      <h2 style="font-size:28px;color:#00ff88;margin-bottom:8px;">Level Complete!</h2>
      <div style="font-size:16px;color:#aaa;margin-bottom:15px;">${state.levelDef.name}</div>
      <div style="display:flex;gap:10px;margin-bottom:15px;flex-wrap:wrap;justify-content:center;">
        ${badges.map(b => `<span style="font-size:14px;color:${b.color};padding:4px 14px;
          border:1px solid ${b.color};border-radius:6px;letter-spacing:2px;
          background:rgba(255,255,255,0.05);">${b.label}</span>`).join("")}
      </div>
      <div style="font-size:13px;color:#999;margin-bottom:18px;text-align:center;line-height:1.8;">
        Time: ${mins}:${secs.toString().padStart(2, '0')} \u2022
        Detections: ${stats.timesDetected} \u2022
        Kills: ${stats.guardsKilled}<br>
        Traps triggered: ${stats.trapsTriggered} \u2022
        Ghost kills: ${stats.ghostKills} \u2022
        Gold: ${state.player.gold}
      </div>
      <div style="font-size:20px;margin-bottom:8px;">Score: ${state.player.score}</div>
      <div style="font-size:14px;color:#887799;margin-bottom:25px;">XP: ${state.totalXP}</div>
      <div style="display:flex;gap:12px;">
        <button id="morgan-upgrade" style="padding:12px 30px;font-size:15px;
          border:1px solid #8844ff;border-radius:8px;background:rgba(60,30,100,0.4);
          color:#ddd;cursor:pointer;font-family:inherit;pointer-events:auto;">Upgrade Spells</button>
        <button id="morgan-next" style="padding:12px 30px;font-size:15px;
          border:1px solid #00ff88;border-radius:8px;background:rgba(20,60,30,0.4);
          color:#ddd;cursor:pointer;font-family:inherit;pointer-events:auto;">Next Level \u2192</button>
      </div>
    `;
    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(div);
    document.getElementById("morgan-next")?.addEventListener("click", () => { div.remove(); onNext(); });
    document.getElementById("morgan-upgrade")?.addEventListener("click", () => { div.remove(); onUpgrade(); });
  }

  showUpgradeScreen(state: MorganGameState, onDone: () => void): void {
    const div = document.createElement("div");
    div.id = "morgan-upgrade-screen";
    div.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      background:rgba(5,5,15,0.92);z-index:20;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Cinzel',serif;color:#ddd;
    `;

    const renderUpgrades = () => {
      const available = SPELL_UPGRADES.filter(u => {
        const key = `${u.spell}_${u.tier}`;
        if (state.player.upgrades.has(key)) return false;
        if (u.tier > 1 && !state.player.upgrades.has(`${u.spell}_${u.tier - 1}`)) return false;
        return true;
      });

      // Stat upgrades available
      const statAvail = STAT_UPGRADES.filter(s => {
        const current = state.player.statUpgrades[s.id] || 0;
        return current < s.maxTier;
      });

      div.innerHTML = `
        <h2 style="font-size:24px;color:#8844ff;margin-bottom:4px;">Upgrades</h2>
        <div style="font-size:14px;color:#887799;margin-bottom:20px;">XP Available: ${state.totalXP}</div>

        <div style="font-size:13px;color:#aa88dd;margin-bottom:8px;">SPELL UPGRADES</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:750px;margin-bottom:20px;">
          ${available.map((u, i) => `
            <div class="morgan-upg-card" data-idx="${i}" data-type="spell" style="
              width:140px;padding:12px;border:1px solid ${state.totalXP >= u.cost ? '#6633cc' : '#333'};
              border-radius:8px;background:rgba(30,15,50,0.6);cursor:${state.totalXP >= u.cost ? 'pointer' : 'not-allowed'};
              pointer-events:auto;text-align:center;transition:all 0.2s;
              opacity:${state.totalXP >= u.cost ? '1' : '0.5'};
            ">
              <div style="font-size:11px;color:#8877aa;">${SPELL_NAMES[u.spell]}</div>
              <div style="font-size:14px;margin:4px 0;color:#ddd;">${u.name}</div>
              <div style="font-size:10px;color:#999;margin-bottom:6px;">${u.desc}</div>
              <div style="font-size:11px;color:${state.totalXP >= u.cost ? '#ffd700' : '#663333'};">${u.cost} XP</div>
            </div>
          `).join("")}
          ${available.length === 0 ? '<div style="color:#555;font-size:12px;">All spell upgrades purchased</div>' : ''}
        </div>

        <div style="font-size:13px;color:#88aadd;margin-bottom:8px;">STAT UPGRADES</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:750px;">
          ${statAvail.map((s, i) => {
            const current = state.player.statUpgrades[s.id] || 0;
            const cost = s.cost * (current + 1);
            return `
            <div class="morgan-stat-card" data-idx="${i}" style="
              width:140px;padding:12px;border:1px solid ${state.totalXP >= cost ? '#3366aa' : '#333'};
              border-radius:8px;background:rgba(15,20,50,0.6);cursor:${state.totalXP >= cost ? 'pointer' : 'not-allowed'};
              pointer-events:auto;text-align:center;transition:all 0.2s;
              opacity:${state.totalXP >= cost ? '1' : '0.5'};
            ">
              <div style="font-size:14px;margin-bottom:4px;color:#ddd;">${s.name}</div>
              <div style="font-size:10px;color:#999;margin-bottom:4px;">${s.desc}</div>
              <div style="font-size:10px;color:#6688aa;margin-bottom:4px;">Tier ${current}/${s.maxTier}</div>
              <div style="font-size:11px;color:${state.totalXP >= cost ? '#ffd700' : '#663333'};">${cost} XP</div>
            </div>`;
          }).join("")}
          ${statAvail.length === 0 ? '<div style="color:#555;font-size:12px;">All stat upgrades maxed</div>' : ''}
        </div>

        <button id="morgan-upg-done" style="margin-top:20px;padding:12px 40px;font-size:15px;
          border:1px solid #00ff88;border-radius:8px;background:rgba(20,60,30,0.4);
          color:#ddd;cursor:pointer;font-family:inherit;pointer-events:auto;">Continue</button>
      `;

      // Bind spell upgrade cards
      div.querySelectorAll(".morgan-upg-card").forEach(card => {
        card.addEventListener("click", () => {
          const idx = parseInt((card as HTMLElement).dataset.idx || "0");
          const u = available[idx];
          if (u && state.totalXP >= u.cost) {
            state.totalXP -= u.cost;
            state.player.upgrades.add(`${u.spell}_${u.tier}`);
            renderUpgrades();
          }
        });
      });

      // Bind stat upgrade cards
      div.querySelectorAll(".morgan-stat-card").forEach(card => {
        card.addEventListener("click", () => {
          const idx = parseInt((card as HTMLElement).dataset.idx || "0");
          const s = statAvail[idx];
          if (!s) return;
          const current = state.player.statUpgrades[s.id] || 0;
          const cost = s.cost * (current + 1);
          if (state.totalXP >= cost) {
            state.totalXP -= cost;
            state.player.statUpgrades[s.id] = current + 1;
            // Apply stat effects
            const p = state.player;
            switch (s.id) {
              case "hp": p.maxHp += 25; p.hp = Math.min(p.hp + 25, p.maxHp); break;
              case "mana": p.maxMana += 20; p.mana = Math.min(p.mana + 20, p.maxMana); break;
              case "stamina": p.maxStamina += 15; p.stamina = Math.min(p.stamina + 15, p.maxStamina); break;
              case "regen": p.manaRegenBonus += 2; break;
              case "stealth": p.stealthBonus *= 0.85; break;
              case "speed": p.speedBonus += 0.5; break;
            }
            renderUpgrades();
          }
        });
      });

      document.getElementById("morgan-upg-done")?.addEventListener("click", () => { div.remove(); onDone(); });
    };

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(div);
    renderUpgrades();
  }

  showGameOver(state: MorganGameState, onRetry: () => void, onExit: () => void): void {
    const div = document.createElement("div");
    div.id = "morgan-gameover";
    div.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      background:rgba(15,5,5,0.9);z-index:20;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Cinzel',serif;color:#ddd;
    `;
    div.innerHTML = `
      <h2 style="font-size:28px;color:#ff4444;margin-bottom:10px;">Morgan Has Fallen</h2>
      <div style="font-size:14px;color:#999;margin-bottom:8px;">${state.levelDef.name}</div>
      <div style="font-size:16px;color:#aaa;margin-bottom:25px;">Final Score: ${state.player.score}</div>
      <div style="display:flex;gap:12px;">
        <button id="morgan-retry" style="padding:12px 40px;font-size:16px;
          border:1px solid #ff6644;border-radius:8px;background:rgba(60,20,20,0.4);
          color:#ddd;cursor:pointer;font-family:inherit;pointer-events:auto;">Retry Level</button>
        <button id="morgan-quit2" style="padding:12px 40px;font-size:16px;
          border:1px solid #555;border-radius:8px;background:rgba(30,20,20,0.4);
          color:#aaa;cursor:pointer;font-family:inherit;pointer-events:auto;">Quit to Menu</button>
      </div>
    `;
    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(div);
    document.getElementById("morgan-retry")?.addEventListener("click", () => { div.remove(); onRetry(); });
    document.getElementById("morgan-quit2")?.addEventListener("click", () => { div.remove(); onExit(); });
  }

  showVictory(state: MorganGameState, onExit: () => void): void {
    const div = document.createElement("div");
    div.id = "morgan-victory";
    div.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      background:rgba(5,5,15,0.9);z-index:20;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Cinzel',serif;color:#ddd;
    `;
    div.innerHTML = `
      <h2 style="font-size:36px;color:#ffd700;margin-bottom:15px;
        text-shadow:0 0 20px rgba(255,215,0,0.5);">Victory!</h2>
      <div style="font-size:16px;color:#ccc;margin-bottom:10px;max-width:400px;text-align:center;line-height:1.6;">
        Morgan le Fay has claimed the ancient artifacts and overthrown Mordred's dark reign.
        The castle is hers. Avalon is avenged.
      </div>
      <div style="font-size:24px;color:#ffd700;margin:20px 0;">Final Score: ${state.player.score}</div>
      <div style="font-size:14px;color:#887799;margin-bottom:25px;">
        Total XP earned: ${state.totalXP + state.player.xp}<br>
        Guards eliminated: ${state.player.guardsKilled}<br>
        Ghost kills: ${state.player.ghostKills}
      </div>
      <button id="morgan-exit-victory" style="padding:14px 50px;font-size:17px;
        border:1px solid #ffd700;border-radius:8px;background:rgba(60,50,20,0.4);
        color:#ddd;cursor:pointer;font-family:inherit;pointer-events:auto;">Return to Menu</button>
    `;
    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(div);
    document.getElementById("morgan-exit-victory")?.addEventListener("click", () => { div.remove(); onExit(); });
  }

  destroy(): void {
    this._container?.remove();
    for (const id of ["morgan-pause", "morgan-level-complete", "morgan-gameover", "morgan-victory", "morgan-upgrade-screen"]) {
      document.getElementById(id)?.remove();
    }
  }
}
