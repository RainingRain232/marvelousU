// ---------------------------------------------------------------------------
// LOT: Fate's Gambit — HTML HUD overlay (improved)
// ---------------------------------------------------------------------------

import { LOT, LOT_DISPLAY, type Difficulty } from "../config/LotConfig";
import type { LotState, UpgradeId } from "../state/LotState";
import { BUFF_INFO, UPGRADE_DEFS, MUTATION_INFO } from "../state/LotState";

export class LotHUD {
  private _root!: HTMLDivElement;
  private _onExit!: () => void;
  private _menuBuilt = false;
  private _menuDifficulty = "";
  private _gameOverBuilt = false;

  build(onExit: () => void): void {
    this._onExit = onExit;
    this._root = document.createElement("div");
    this._root.id = "lot-hud";
    this._root.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;
      pointer-events:none;font-family:'Segoe UI',Tahoma,sans-serif;color:#e0d5c0;
      user-select:none;overflow:hidden;
    `;
    document.body.appendChild(this._root);
  }

  update(state: LotState): void {
    if (!this._root) return;

    // During menu, only rebuild DOM when difficulty changes to keep buttons stable for clicks
    if (state.phase === "menu") {
      if (!this._menuBuilt || this._menuDifficulty !== state.difficulty) {
        this._menuDifficulty = state.difficulty;
        this._menuBuilt = true;
        this._root.innerHTML = this._renderMenu(state);
        this._bindEvents(state);
      }
      return;
    }
    this._menuBuilt = false;

    // Game over is static — only rebuild once to keep buttons stable for clicks
    if (state.phase === "game_over") {
      if (!this._gameOverBuilt) {
        this._gameOverBuilt = true;
        this._root.innerHTML = this._renderGameOver(state);
        this._bindEvents(state);
      }
      return;
    }
    this._gameOverBuilt = false;

    let html = "";
    switch (state.phase) {
      case "draw": html = this._renderDraw(state); break;
      case "active": html = this._renderActive(state); break;
      case "victory": html = this._renderVictory(state); break;
      case "buff_select": html = this._renderBuffSelect(state); break;
      case "intermission": html = this._renderIntermission(state); break;
    }

    this._root.innerHTML = html;
    this._bindEvents(state);
  }

  private _renderMenu(state: LotState): string {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  height:100%;background:rgba(10,5,32,0.85);pointer-events:auto;">
        <div style="font-size:64px;font-weight:bold;color:#ffd700;text-shadow:0 0 30px #ffa500,0 0 60px #ff6600;
                    letter-spacing:12px;margin-bottom:10px;">LOT</div>
        <div style="font-size:20px;color:#aa88cc;margin-bottom:40px;letter-spacing:4px;">FATE'S GAMBIT</div>
        <div style="font-size:14px;color:#8877aa;max-width:440px;text-align:center;margin-bottom:40px;line-height:1.6;">
          Draw lots to face random challenges in the arena of fate.<br>
          Survive monster waves, dodge traps, hunt treasures, duel champions.<br>
          Spend Fortune to re-roll bad lots. Earn buffs and upgrades between rounds.
        </div>
        <div style="display:flex;gap:12px;margin-bottom:30px;">
          ${(["easy","normal","hard","nightmare"] as Difficulty[]).map(d => `
            <button class="lot-diff-btn" data-diff="${d}" style="
              pointer-events:auto;padding:10px 20px;border:2px solid ${d === state.difficulty ? '#ffd700' : '#444'};
              background:${d === state.difficulty ? 'rgba(255,215,0,0.15)' : 'rgba(30,20,50,0.8)'};
              color:${d === state.difficulty ? '#ffd700' : '#8877aa'};font-size:14px;cursor:pointer;
              border-radius:6px;text-transform:uppercase;letter-spacing:2px;transition:all 0.2s;
            ">${d}</button>
          `).join("")}
        </div>
        <button id="lot-start-btn" style="
          pointer-events:auto;padding:16px 48px;border:2px solid #ffd700;background:rgba(255,215,0,0.1);
          color:#ffd700;font-size:22px;cursor:pointer;border-radius:8px;letter-spacing:4px;
          text-transform:uppercase;transition:all 0.3s;
        ">DRAW YOUR FATE</button>
        <div style="font-size:11px;color:#665;margin-top:20px;">
          WASD move | Q dodge | SPACE jump | E whirlwind | R dash | F reflect<br>
          LMB attack (hold heavy) | RMB block | ESC pause
        </div>
        <button id="lot-exit-btn" style="
          pointer-events:auto;padding:8px 24px;border:1px solid #554;background:transparent;
          color:#887;font-size:12px;cursor:pointer;margin-top:12px;border-radius:4px;
        ">Exit</button>
      </div>
    `;
  }

  private _renderDraw(state: LotState): string {
    const lot = state.drawnLot;
    if (!lot) return "";
    const display = LOT_DISPLAY[lot];
    const progress = 1 - state.phaseTimer / LOT.DRAW_PHASE_DURATION;
    const show = progress > 0.4;
    const mutInfo = state.mutation !== "none" ? MUTATION_INFO[state.mutation] : null;

    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
        <div style="font-size:18px;color:#aa88cc;letter-spacing:6px;margin-bottom:20px;">
          ROUND ${state.round}
        </div>
        ${mutInfo ? `
          <div style="font-size:12px;color:${mutInfo.color};letter-spacing:2px;margin-bottom:8px;
                      text-shadow:0 0 8px ${mutInfo.color};">
            Arena: ${mutInfo.name}
          </div>
        ` : ""}
        ${show ? `
          <div style="font-size:48px;margin-bottom:10px;
                      text-shadow:0 0 20px ${display.color};
                      animation:lotReveal 0.5s ease-out;">
            ${display.icon}
          </div>
          <div style="font-size:32px;font-weight:bold;color:${display.color};
                      text-shadow:0 0 15px ${display.color};letter-spacing:4px;">
            ${display.name.toUpperCase()}
          </div>
          <div style="font-size:14px;color:#aa99bb;margin-top:10px;">${display.desc}</div>
          ${!state.rerolled && state.fortune >= LOT.REROLL_COST ? `
            <button id="lot-reroll-btn" style="
              pointer-events:auto;padding:10px 24px;border:2px solid #ffd700;
              background:rgba(255,215,0,0.1);color:#ffd700;font-size:14px;
              cursor:pointer;border-radius:6px;margin-top:20px;letter-spacing:2px;
            ">RE-ROLL (${LOT.REROLL_COST} Fortune)</button>
          ` : ""}
        ` : `
          <div style="font-size:24px;color:#ffd700;animation:lotSpin 0.3s linear infinite;">&#x27F3;</div>
        `}
      </div>
      ${this._renderFortuneBar(state)}
      <style>
        @keyframes lotReveal { from { transform:scale(3);opacity:0; } to { transform:scale(1);opacity:1; } }
        @keyframes lotSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      </style>
    `;
  }

  private _renderActive(state: LotState): string {
    const p = state.player;
    const lot = state.currentLot!;
    const display = LOT_DISPLAY[lot];
    const maxStamina = LOT.STAMINA_MAX + state.upgrades.endurance * 20;

    let objectiveText = "";
    switch (lot) {
      case "monster_wave":
      case "cursed_arena": {
        const alive = state.enemies.filter(e => !e.dead).length + state.spawnQueue.length;
        objectiveText = `Enemies remaining: ${alive}`;
        break;
      }
      case "treasure_hunt":
        objectiveText = `Treasures: ${state.treasuresCollected}/${state.treasures.length} | Time: ${Math.ceil(state.treasureTimeLeft)}s`;
        break;
      case "boss_fight":
      case "fate_duel": {
        const boss = state.enemies.find(e => !e.dead);
        if (boss) {
          const hpPct = (boss.hp / boss.maxHp * 100).toFixed(0);
          objectiveText = `${boss.type === "boss" ? "Champion" : "Duelist"} HP: ${hpPct}%`;
        } else {
          objectiveText = "Defeated!";
        }
        break;
      }
      case "obstacle_gauntlet":
        objectiveText = `Survive! Time: ${Math.ceil(state.obstacleTimeLeft)}s | Kills: ${state.roundKills}`;
        break;
    }

    // Active buffs display
    const buffIcons = state.buffs.map(b => {
      const info = BUFF_INFO[b.type];
      return `<span title="${info.name}" style="font-size:16px;margin:0 2px;
        filter:${b.roundsLeft > 0 && b.roundsLeft <= 1 ? 'brightness(0.6)' : 'none'};">
        ${info.icon}</span>`;
    }).join("");

    return `
      <!-- Top bar -->
      <div style="position:absolute;top:12px;left:50%;transform:translateX(-50%);text-align:center;">
        <div style="font-size:13px;color:${display.color};letter-spacing:3px;text-shadow:0 0 8px ${display.color};">
          ${display.icon} ${display.name.toUpperCase()} — ROUND ${state.round}
        </div>
        <div style="font-size:11px;color:#aa99bb;margin-top:4px;">${objectiveText}</div>
      </div>

      <!-- HP Bar -->
      <div style="position:absolute;bottom:60px;left:50%;transform:translateX(-50%);width:280px;">
        <div style="background:rgba(0,0,0,0.6);border-radius:4px;height:14px;border:1px solid #443;overflow:hidden;">
          <div style="width:${(p.hp / p.maxHp) * 100}%;height:100%;
                      background:linear-gradient(90deg,${p.hp / p.maxHp < 0.25 ? '#cc0000,#ff0000' : '#cc2222,#ff4444'});
                      transition:width 0.15s;"></div>
        </div>
        <div style="font-size:10px;text-align:center;color:#cc8888;margin-top:2px;">
          HP ${Math.ceil(p.hp)}/${p.maxHp}
        </div>
      </div>

      <!-- Stamina Bar -->
      <div style="position:absolute;bottom:40px;left:50%;transform:translateX(-50%);width:200px;">
        <div style="background:rgba(0,0,0,0.5);border-radius:3px;height:8px;border:1px solid #333;overflow:hidden;">
          <div style="width:${(p.stamina / maxStamina) * 100}%;height:100%;
                      background:linear-gradient(90deg,#2266aa,#44aaff);transition:width 0.1s;"></div>
        </div>
      </div>

      <!-- Low HP pulsing vignette -->
      ${p.hp / p.maxHp < 0.25 ? `
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;
                    background:radial-gradient(ellipse at center, transparent 50%, rgba(200,0,0,${0.2 + Math.sin(state.gameTime * 6) * 0.1}) 100%);"></div>
      ` : ""}

      <!-- Directional damage indicator -->
      ${p.lastHitTimer > 0 ? (() => {
        const angle = p.lastHitDir;
        const deg = (angle * 180 / Math.PI + 360) % 360;
        return `<div style="position:absolute;top:50%;left:50%;width:60px;height:60px;
                    transform:translate(-50%,-50%) rotate(${deg}deg);pointer-events:none;">
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;
                      border-bottom:20px solid rgba(255,0,0,${p.lastHitTimer});
                      margin:0 auto;"></div>
        </div>`;
      })() : ""}

      <!-- Combo counter -->
      ${p.comboCount > 1 ? `
        <div style="position:absolute;right:40px;top:45%;
                    font-size:${Math.min(20 + p.comboCount * 2, 36)}px;font-weight:bold;
                    color:#ffd700;text-shadow:0 0 10px #ff8800;opacity:${Math.min(1, p.comboTimer / 0.5)};">
          ${p.comboCount}x
        </div>
      ` : ""}

      <!-- Kill streak -->
      ${state.killStreakLabel ? `
        <div style="position:absolute;top:30%;left:50%;transform:translateX(-50%);
                    font-size:32px;font-weight:bold;color:${state.killStreakColor};
                    text-shadow:0 0 15px ${state.killStreakColor};letter-spacing:4px;
                    opacity:${Math.min(1, state.killStreakTimer)};
                    animation:killStreakPop 0.3s ease-out;">
          ${state.killStreakLabel}
        </div>
      ` : ""}

      <!-- Score -->
      <div style="position:absolute;top:12px;right:20px;font-size:16px;color:#ffd700;letter-spacing:2px;">
        ${state.score.toLocaleString()}
      </div>

      <!-- Active buffs -->
      ${buffIcons ? `
        <div style="position:absolute;top:36px;right:20px;display:flex;">${buffIcons}</div>
      ` : ""}

      ${this._renderFortuneBar(state)}
      ${this._renderNotifications(state)}
      ${this._renderCrosshair(state)}
      ${state.paused ? this._renderPauseOverlay() : ""}

      <!-- Curse arena radius -->
      ${lot === "cursed_arena" ? `
        <div style="position:absolute;bottom:100px;left:50%;transform:translateX(-50%);
                    font-size:12px;color:#00cccc;letter-spacing:2px;">
          Arena radius: ${Math.ceil(state.curseRadius)}m
        </div>
      ` : ""}

      <!-- Boss HP bar (prominent, centered) -->
      ${(lot === "boss_fight" || lot === "fate_duel") ? (() => {
        const boss = state.enemies.find(e => !e.dead && (e.type === "boss" || e.type === "champion"));
        if (!boss) return "";
        const hpPct = boss.hp / boss.maxHp * 100;
        const phaseColor = boss.bossPhase >= 3 ? "#ff0000" : boss.bossPhase >= 2 ? "#ff6622" : "#cc00ff";
        const label = boss.type === "boss"
          ? `CHAMPION OF FATE ${boss.bossPhase > 1 ? `— PHASE ${boss.bossPhase}` : ""}`
          : "FATE DUELIST";
        return `
          <div style="position:absolute;top:50px;left:50%;transform:translateX(-50%);width:320px;text-align:center;">
            <div style="font-size:10px;color:${phaseColor};letter-spacing:3px;margin-bottom:4px;
                        text-shadow:0 0 8px ${phaseColor};">${label}</div>
            <div style="background:rgba(0,0,0,0.7);border-radius:4px;height:12px;border:1px solid ${phaseColor}44;overflow:hidden;">
              <div style="width:${hpPct}%;height:100%;
                          background:linear-gradient(90deg,${phaseColor},${phaseColor}88);
                          transition:width 0.2s;"></div>
            </div>
            <div style="font-size:9px;color:#aa88cc;margin-top:2px;">
              ${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}
            </div>
          </div>
        `;
      })() : ""}

      <!-- Treasure compass (nearest uncollected treasure direction) -->
      ${lot === "treasure_hunt" ? (() => {
        const uncollected = state.treasures.filter(t => !t.collected);
        if (uncollected.length === 0) return "";
        // Find nearest
        let nearest = uncollected[0];
        let nearestDist = Infinity;
        for (const t of uncollected) {
          const dx = t.pos.x - state.player.pos.x;
          const dz = t.pos.z - state.player.pos.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < nearestDist) { nearestDist = d; nearest = t; }
        }
        const angle = Math.atan2(nearest.pos.x - state.player.pos.x, nearest.pos.z - state.player.pos.z) - state.player.yaw;
        const deg = (angle * 180 / Math.PI + 360) % 360;
        const tColor = nearest.type === "fortune" ? "#ffd700" : nearest.type === "heal" ? "#44ff44" : "#ffdd00";
        return `
          <div style="position:absolute;bottom:110px;left:50%;transform:translateX(-50%);text-align:center;">
            <div style="width:40px;height:40px;margin:0 auto;transform:rotate(${deg}deg);">
              <div style="width:0;height:0;margin:0 auto;
                          border-left:8px solid transparent;border-right:8px solid transparent;
                          border-bottom:16px solid ${tColor};filter:drop-shadow(0 0 4px ${tColor});"></div>
            </div>
            <div style="font-size:9px;color:${tColor};margin-top:2px;">${Math.ceil(nearestDist)}m</div>
          </div>
        `;
      })() : ""}

      <!-- Heavy charge indicator -->
      ${p.heavyCharging ? `
        <div style="position:absolute;bottom:82px;left:50%;transform:translateX(-50%);width:100px;">
          <div style="background:rgba(0,0,0,0.5);border-radius:3px;height:6px;border:1px solid #664;overflow:hidden;">
            <div style="width:${Math.min(100, p.heavyChargeTimer / 0.6 * 100)}%;height:100%;
                        background:linear-gradient(90deg,#cc8822,#ffcc44);transition:width 0.05s;"></div>
          </div>
        </div>
      ` : ""}

      <!-- Ability cooldowns -->
      <div style="position:absolute;bottom:90px;right:20px;display:flex;gap:6px;">
        ${this._renderAbilityIcon("E", "Whirlwind", p.whirlwindCd, LOT.WHIRLWIND_CD, p.whirlwindActive > 0, "#88ccff")}
        ${this._renderAbilityIcon("R", "Dash Strike", p.dashStrikeCd, LOT.DASH_STRIKE_CD, false, "#ff8844")}
        ${this._renderAbilityIcon("F", "Reflect", p.reflectCd, LOT.REFLECT_CD, p.reflectActive > 0, "#ffdd44")}
      </div>

      <!-- Combo damage bonus -->
      ${p.comboCount > 2 ? `
        <div style="position:absolute;right:40px;top:52%;font-size:11px;color:#88ff88;
                    opacity:${Math.min(1, p.comboTimer / 0.5)};">
          +${Math.min(Math.round(p.comboCount * 4), 60)}% DMG
        </div>
      ` : ""}

      <!-- Controls hint -->
      <div style="position:absolute;bottom:8px;left:12px;font-size:9px;color:#443;">
        WASD move | Q dodge | SPACE jump | E whirlwind | R dash | F reflect | LMB attack | RMB block
      </div>

      <style>
        @keyframes killStreakPop { from { transform:translateX(-50%) scale(2); } to { transform:translateX(-50%) scale(1); } }
      </style>
    `;
  }

  private _renderVictory(state: LotState): string {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
        <div style="font-size:36px;color:#ffd700;text-shadow:0 0 20px #ffaa00;letter-spacing:6px;
                    animation:lotReveal 0.5s ease-out;">
          LOT CLEARED!
        </div>
        ${state.flawless ? `
          <div style="font-size:16px;color:#44ff88;margin-top:10px;text-shadow:0 0 10px #22ff66;">
            FLAWLESS
          </div>
        ` : ""}
      </div>
      <style>
        @keyframes lotReveal { from { transform:scale(2);opacity:0; } to { transform:scale(1);opacity:1; } }
      </style>
    `;
  }

  private _renderBuffSelect(state: LotState): string {
    const cards = state.buffChoices.map(type => {
      const info = BUFF_INFO[type];
      return `
        <div class="lot-buff-card" data-buff="${type}" style="
          pointer-events:auto;width:160px;padding:20px 16px;
          border:2px solid ${info.color};border-radius:10px;
          background:rgba(20,15,40,0.9);cursor:pointer;text-align:center;
          transition:all 0.2s;box-shadow:0 0 15px ${info.color}33;
        " onmouseover="this.style.transform='scale(1.08)';this.style.boxShadow='0 0 25px ${info.color}66'"
           onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 0 15px ${info.color}33'">
          <div style="font-size:32px;margin-bottom:8px;">${info.icon}</div>
          <div style="font-size:14px;font-weight:bold;color:${info.color};margin-bottom:6px;">${info.name}</div>
          <div style="font-size:11px;color:#aa99bb;line-height:1.4;">${info.desc}</div>
          ${info.duration > 0 ? `<div style="font-size:10px;color:#776;margin-top:6px;">${info.duration} rounds</div>` : ""}
        </div>
      `;
    }).join("");

    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  height:100%;background:rgba(10,5,32,0.7);">
        <div style="font-size:22px;color:#ffd700;letter-spacing:4px;margin-bottom:8px;">CHOOSE A BLESSING</div>
        <div style="font-size:12px;color:#887;margin-bottom:24px;">Select one buff for the next rounds</div>
        <div style="display:flex;gap:16px;">
          ${cards}
        </div>
        <div style="font-size:11px;color:#554;margin-top:16px;">
          Auto-skip in ${Math.ceil(state.phaseTimer)}s
        </div>
      </div>
      ${this._renderFortuneBar(state)}
    `;
  }

  private _renderIntermission(state: LotState): string {
    // Upgrade shop
    const upgradeCards = (Object.entries(UPGRADE_DEFS) as [UpgradeId, typeof UPGRADE_DEFS[UpgradeId]][]).map(([id, def]) => {
      const level = state.upgrades[id];
      const maxed = level >= def.maxLevel;
      const cost = maxed ? 0 : def.costs[level];
      const affordable = !maxed && state.score >= cost;
      return `
        <div class="lot-upgrade-card" data-upgrade="${id}" style="
          pointer-events:${affordable ? 'auto' : 'none'};
          display:flex;align-items:center;gap:10px;padding:8px 12px;
          border:1px solid ${maxed ? '#333' : affordable ? def.color : '#333'};
          border-radius:6px;background:rgba(20,15,40,${maxed ? 0.3 : 0.7});
          cursor:${affordable ? 'pointer' : 'default'};
          opacity:${maxed ? 0.4 : affordable ? 1 : 0.6};
          transition:all 0.15s;margin-bottom:4px;
        " ${affordable ? `onmouseover="this.style.background='rgba(40,30,70,0.9)'" onmouseout="this.style.background='rgba(20,15,40,0.7)'"` : ""}>
          <span style="font-size:20px;">${def.icon}</span>
          <div style="flex:1;">
            <div style="font-size:12px;color:${def.color};font-weight:bold;">${def.name}
              <span style="color:#776;font-weight:normal;"> Lv${level}/${def.maxLevel}</span>
            </div>
            <div style="font-size:10px;color:#887;">${def.desc}</div>
          </div>
          ${!maxed ? `<div style="font-size:12px;color:${affordable ? '#ffd700' : '#664'};white-space:nowrap;">${cost}</div>` : `<div style="font-size:10px;color:#554;">MAX</div>`}
        </div>
      `;
    }).join("");

    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  height:100%;background:rgba(10,5,32,0.6);">
        <div style="font-size:20px;color:#ffd700;letter-spacing:3px;margin-bottom:4px;">UPGRADE SHOP</div>
        <div style="font-size:12px;color:#887;margin-bottom:12px;">
          Score: <span style="color:#ffd700;">${state.score.toLocaleString()}</span>
          | Round ${state.round} | Next lot in ${Math.ceil(state.phaseTimer)}s
        </div>
        <div style="width:360px;max-height:320px;overflow-y:auto;pointer-events:auto;">
          ${upgradeCards}
        </div>
        <div style="font-size:10px;color:#554;margin-top:8px;">
          Kills: ${state.totalKills} | HP: ${Math.ceil(state.player.hp)}/${state.player.maxHp}
        </div>
      </div>
      ${this._renderFortuneBar(state)}
      ${this._renderNotifications(state)}
    `;
  }

  private _renderGameOver(state: LotState): string {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  height:100%;background:rgba(10,0,0,0.8);pointer-events:auto;">
        <div style="font-size:48px;color:#ff4444;text-shadow:0 0 20px #cc0000;letter-spacing:8px;
                    margin-bottom:20px;">FATE SEALED</div>
        <div style="font-size:14px;color:#aa8888;margin-bottom:30px;">
          You survived ${state.round} round${state.round !== 1 ? 's' : ''}
        </div>
        <div style="display:flex;gap:30px;margin-bottom:30px;">
          <div style="text-align:center;">
            <div style="font-size:28px;color:#ffd700;">${state.score.toLocaleString()}</div>
            <div style="font-size:11px;color:#887;">SCORE</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:28px;color:#ff6644;">${state.totalKills}</div>
            <div style="font-size:11px;color:#887;">KILLS</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:28px;color:#aa88cc;">${state.round}</div>
            <div style="font-size:11px;color:#887;">ROUNDS</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:28px;color:#ffd700;">${state.bestRound}</div>
            <div style="font-size:11px;color:#887;">BEST</div>
          </div>
        </div>
        <!-- Upgrades summary -->
        ${Object.entries(state.upgrades).some(([, v]) => v > 0) ? `
          <div style="font-size:11px;color:#665;margin-bottom:15px;">
            Upgrades: ${(Object.entries(state.upgrades) as [UpgradeId, number][])
              .filter(([, v]) => v > 0)
              .map(([id, v]) => `${UPGRADE_DEFS[id].icon} ${UPGRADE_DEFS[id].name} Lv${v}`)
              .join(" | ")}
          </div>
        ` : ""}
        <div style="display:flex;gap:12px;">
          <button id="lot-restart-btn" style="
            pointer-events:auto;padding:12px 32px;border:2px solid #ffd700;
            background:rgba(255,215,0,0.1);color:#ffd700;font-size:16px;
            cursor:pointer;border-radius:6px;letter-spacing:2px;
          ">DRAW AGAIN</button>
          <button id="lot-exit-btn" style="
            pointer-events:auto;padding:12px 32px;border:1px solid #554;
            background:rgba(30,20,50,0.8);color:#887;font-size:14px;
            cursor:pointer;border-radius:6px;
          ">Exit</button>
        </div>
      </div>
    `;
  }

  private _renderFortuneBar(state: LotState): string {
    const pips = [];
    for (let i = 0; i < LOT.MAX_FORTUNE; i++) {
      const filled = i < state.fortune;
      pips.push(`<div style="width:18px;height:18px;border-radius:50%;
        border:2px solid ${filled ? '#ffd700' : '#443'};
        background:${filled ? 'radial-gradient(#ffd700,#cc8800)' : 'rgba(20,15,30,0.5)'};
        box-shadow:${filled ? '0 0 8px #ffaa00' : 'none'};
        transition:all 0.3s;"></div>`);
    }
    return `
      <div style="position:absolute;top:12px;left:20px;display:flex;gap:6px;align-items:center;">
        <span style="font-size:11px;color:#aa8844;margin-right:4px;letter-spacing:1px;">FORTUNE</span>
        ${pips.join("")}
      </div>
    `;
  }

  private _renderNotifications(state: LotState): string {
    if (state.notifications.length === 0) return "";
    const items = state.notifications.map((n) => `
      <div style="font-size:13px;color:${n.color};text-shadow:0 0 8px ${n.color};
                  opacity:${Math.min(1, n.timer)};margin-bottom:4px;
                  transform:translateX(${n.timer < 0.5 ? (0.5 - n.timer) * 40 : 0}px);">
        ${n.text}
      </div>
    `).join("");
    return `<div style="position:absolute;left:20px;bottom:120px;">${items}</div>`;
  }

  private _renderCrosshair(state: LotState): string {
    if (!state.pointerLocked) return "";
    return `
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                  width:20px;height:20px;pointer-events:none;">
        <div style="position:absolute;top:9px;left:0;width:8px;height:2px;background:rgba(255,255,255,0.5);"></div>
        <div style="position:absolute;top:9px;right:0;width:8px;height:2px;background:rgba(255,255,255,0.5);"></div>
        <div style="position:absolute;left:9px;top:0;width:2px;height:8px;background:rgba(255,255,255,0.5);"></div>
        <div style="position:absolute;left:9px;bottom:0;width:2px;height:8px;background:rgba(255,255,255,0.5);"></div>
        <div style="position:absolute;top:9px;left:9px;width:2px;height:2px;background:rgba(255,215,0,0.8);"></div>
      </div>
    `;
  }

  private _renderAbilityIcon(key: string, name: string, cd: number, maxCd: number, active: boolean, color: string): string {
    const ready = cd <= 0;
    const pct = ready ? 100 : ((maxCd - cd) / maxCd) * 100;
    // SVG radial cooldown ring
    const r = 16, cx = 20, cy = 20, circumference = 2 * Math.PI * r;
    const dashOffset = circumference * (1 - pct / 100);
    return `
      <div style="width:44px;height:44px;border-radius:8px;position:relative;
                  border:2px solid ${active ? color : ready ? color + '99' : '#44334488'};
                  background:${ready ? `linear-gradient(135deg, ${color}15, ${color}30)` : 'rgba(15,10,30,0.6)'};
                  ${active ? `box-shadow:0 0 12px ${color}, inset 0 0 8px ${color}33;` : ready ? `box-shadow:0 0 6px ${color}44;` : ''}
                  overflow:hidden;transition:all 0.2s;" title="${name} [${key}]">
        ${!ready ? `
          <svg width="44" height="44" style="position:absolute;top:-2px;left:-2px;transform:rotate(-90deg);">
            <circle cx="${cx + 2}" cy="${cy + 2}" r="${r}" fill="none" stroke="${color}44" stroke-width="3"/>
            <circle cx="${cx + 2}" cy="${cy + 2}" r="${r}" fill="none" stroke="${color}" stroke-width="3"
              stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
              stroke-linecap="round" style="transition:stroke-dashoffset 0.1s;"/>
          </svg>
        ` : ""}
        <div style="position:absolute;top:${ready ? '40' : '35'}%;left:50%;transform:translate(-50%,-50%);
                    font-size:${ready ? 16 : 13}px;font-weight:bold;
                    color:${active ? '#ffffff' : ready ? color : '#555'};
                    text-shadow:${ready ? `0 0 6px ${color}` : 'none'};">${key}</div>
        ${!ready ? `<div style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);
                    font-size:8px;color:#776;letter-spacing:0.5px;">${cd.toFixed(1)}s</div>` : ""}
        ${ready ? `<div style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);
                    font-size:7px;color:${color}88;text-transform:uppercase;letter-spacing:0.5px;">ready</div>` : ""}
      </div>
    `;
  }

  private _renderPauseOverlay(): string {
    return `
      <div style="position:absolute;top:0;left:0;width:100%;height:100%;
                  background:rgba(10,5,20,0.7);display:flex;flex-direction:column;
                  align-items:center;justify-content:center;pointer-events:auto;">
        <div style="font-size:36px;color:#ffd700;letter-spacing:8px;">PAUSED</div>
        <div style="font-size:12px;color:#887;margin-top:10px;">Press ESC to resume</div>
        <button id="lot-exit-btn" style="
          pointer-events:auto;padding:8px 24px;border:1px solid #554;background:transparent;
          color:#887;font-size:12px;cursor:pointer;margin-top:20px;border-radius:4px;
        ">Exit to Menu</button>
      </div>
    `;
  }

  private _bindEvents(state: LotState): void {
    const startBtn = document.getElementById("lot-start-btn");
    if (startBtn) {
      startBtn.onclick = () => window.dispatchEvent(new Event("lotStartGame"));
    }

    const diffBtns = document.querySelectorAll(".lot-diff-btn");
    for (const btn of diffBtns) {
      (btn as HTMLElement).onclick = () => {
        state.difficulty = (btn as HTMLElement).dataset.diff as Difficulty;
      };
    }

    const rerollBtn = document.getElementById("lot-reroll-btn");
    if (rerollBtn) {
      rerollBtn.onclick = () => window.dispatchEvent(new Event("lotReroll"));
    }

    const restartBtn = document.getElementById("lot-restart-btn");
    if (restartBtn) {
      restartBtn.onclick = () => window.dispatchEvent(new Event("lotRestart"));
    }

    const exitBtn = document.getElementById("lot-exit-btn");
    if (exitBtn) {
      exitBtn.onclick = () => this._onExit();
    }

    // Buff selection cards
    const buffCards = document.querySelectorAll(".lot-buff-card");
    for (const card of buffCards) {
      (card as HTMLElement).onclick = () => {
        const type = (card as HTMLElement).dataset.buff;
        if (type) {
          window.dispatchEvent(new CustomEvent("lotSelectBuff", { detail: type }));
        }
      };
    }

    // Upgrade cards
    const upgradeCards = document.querySelectorAll(".lot-upgrade-card");
    for (const card of upgradeCards) {
      (card as HTMLElement).onclick = () => {
        const id = (card as HTMLElement).dataset.upgrade;
        if (id) {
          window.dispatchEvent(new CustomEvent("lotPurchaseUpgrade", { detail: id }));
        }
      };
    }
  }

  cleanup(): void {
    if (this._root && this._root.parentNode) {
      this._root.parentNode.removeChild(this._root);
    }
  }
}
