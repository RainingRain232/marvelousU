// ---------------------------------------------------------------------------
// Guinevere: The Astral Garden — HTML HUD overlay
// ---------------------------------------------------------------------------

import { GUIN } from "../config/GuinevereConfig";
import type { GuinevereState } from "../state/GuinevereState";
import { UPGRADES, getUpgradeCost, WAVE_MODIFIER_NAMES, WAVE_MODIFIER_COLORS, ARTIFACT_INFO } from "../state/GuinevereState";
import type { Difficulty, ArtifactType } from "../state/GuinevereState";

export class GuinevereHUD {
  private _root!: HTMLDivElement;
  private _onExit!: () => void;
  private _menuBuilt = false;
  private _menuDifficulty = "";

  build(onExit: () => void): void {
    this._onExit = onExit;
    this._root = document.createElement("div");
    this._root.id = "guinevere-hud";
    this._root.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;
      pointer-events:none;font-family:'Segoe UI',Tahoma,sans-serif;color:#e0d5c0;
      user-select:none;overflow:hidden;
    `;
    // Inject keyframe animation for pulsing effects
    if (!document.getElementById("guin-hud-styles")) {
      const styleEl = document.createElement("style");
      styleEl.id = "guin-hud-styles";
      styleEl.textContent = `
        @keyframes guin-pulse {
          from { opacity: 0.7; }
          to { opacity: 1; }
        }
      `;
      document.head.appendChild(styleEl);
    }
    document.body.appendChild(this._root);
  }

  update(state: GuinevereState): void {
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

    // Game over screen: only build once to keep buttons clickable
    if (state.phase === "game_over") {
      if (!(this._root as any)._gameOverBuilt) {
        (this._root as any)._gameOverBuilt = true;
        this._root.innerHTML = this._renderGameOver(state);
        this._bindEvents(state);
      }
      return;
    }
    (this._root as any)._gameOverBuilt = false;

    // When paused, only rebuild once to keep buttons clickable
    if (state.paused) {
      if (!(this._root as any)._pauseBuilt) {
        (this._root as any)._pauseBuilt = true;
        this._root.innerHTML = this._renderPlaying(state);
        this._bindEvents(state);
      }
      return;
    }
    (this._root as any)._pauseBuilt = false;

    this._root.innerHTML = this._renderPlaying(state);
    this._bindEvents(state);
  }

  private _renderMenu(state: GuinevereState): string {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  height:100%;background:rgba(5,5,16,0.88);pointer-events:auto;">
        <div style="font-size:56px;font-weight:bold;color:#88ccff;text-shadow:0 0 30px #4488ff,0 0 60px #2244cc;
                    letter-spacing:10px;margin-bottom:6px;">GUINEVERE</div>
        <div style="font-size:18px;color:#aa88cc;margin-bottom:35px;letter-spacing:6px;">THE ASTRAL GARDEN</div>
        <div style="font-size:13px;color:#7766aa;max-width:460px;text-align:center;margin-bottom:35px;line-height:1.7;">
          Tend an enchanted garden floating in the starlit void.<br>
          Plant magical seeds — crystal roses, starblooms, moonvines, aurora trees, void lilies.<br>
          Defend your garden from frost wraiths and void creatures. Harvest starlight essence.<br>
          Plants grow faster under moonlight. The garden expands as you flourish.
        </div>
        <div style="display:flex;gap:12px;margin-bottom:28px;">
          ${(["easy","normal","hard","nightmare"] as Difficulty[]).map(d => `
            <button class="guin-diff-btn" data-diff="${d}" style="
              pointer-events:auto;padding:10px 20px;border:2px solid ${d === state.difficulty ? '#88ccff' : '#333'};
              background:${d === state.difficulty ? 'rgba(136,204,255,0.12)' : 'rgba(20,15,40,0.8)'};
              color:${d === state.difficulty ? '#88ccff' : '#665588'};font-size:13px;cursor:pointer;
              border-radius:6px;text-transform:uppercase;letter-spacing:2px;transition:all 0.2s;
            ">${d}</button>
          `).join("")}
        </div>
        <button id="guin-start-btn" style="
          pointer-events:auto;padding:16px 52px;border:2px solid #88ccff;background:rgba(136,204,255,0.08);
          color:#88ccff;font-size:22px;cursor:pointer;border-radius:8px;letter-spacing:5px;
          text-transform:uppercase;transition:all 0.3s;
        ">TEND THE GARDEN</button>
        <div style="font-size:11px;color:#554466;margin-top:18px;line-height:1.6;">
          WASD move | SPACE jump | SHIFT sprint | Q dodge<br>
          LMB moonbeam (hold to charge) | RMB plant seed | C harvest | Tab cycle seeds<br>
          1 thorn wall | 2 blossom burst | 3 root bind | 4 aurora shield<br>
          5 celestial convergence | G awaken sentinel<br>
          B expand garden | ESC pause
        </div>
        <button id="guin-exit-btn" style="
          pointer-events:auto;padding:8px 24px;border:1px solid #443;background:transparent;
          color:#776;font-size:12px;cursor:pointer;margin-top:12px;border-radius:4px;
        ">Exit</button>
      </div>
    `;
  }

  private _renderPlaying(state: GuinevereState): string {
    const p = state.player;
    const hpPct = Math.max(0, p.hp / p.maxHp * 100);
    const staminaPct = p.stamina / GUIN.STAMINA_MAX * 100;
    const shieldPct = p.auroraShieldTimer > 0 ? (p.auroraShieldHp / (GUIN.AURORA_SHIELD_HP + p.shieldLevel * 30)) * 100 : 0;
    const dayPct = (1 - state.dayNightBlend) * 100;
    const plantCount = state.plants.size;
    const maxPlants = GUIN.MAX_PLANTS + p.gardenLevel * 4;

    // Ability cooldowns
    const cds = [
      { key: "Q", name: "Dodge", cd: p.dodgeCooldown, max: GUIN.DODGE_COOLDOWN },
      { key: "1", name: "Thorn", cd: p.thornWallCd, max: GUIN.THORN_WALL_COOLDOWN },
      { key: "2", name: "Bloom", cd: p.blossomBurstCd, max: GUIN.BLOSSOM_BURST_COOLDOWN },
      { key: "3", name: "Root", cd: p.rootBindCd, max: GUIN.ROOT_BIND_COOLDOWN },
      { key: "4", name: "Shield", cd: p.auroraShieldCd, max: GUIN.AURORA_SHIELD_COOLDOWN },
    ];
    const moonbeamReady = p.moonbeamCd <= 0;
    const moonbeamPct = moonbeamReady ? 100 : (1 - p.moonbeamCd / GUIN.MOONBEAM_COOLDOWN) * 100;

    const awakenedCount = [...state.plants.values()].filter((pl: any) => pl.awakened).length;
    const eliteCount = state.enemies.filter((e: any) => e.elite && e.behavior !== "dead").length;

    // Celestial convergence orb check
    const celestialOrbTypes = [
      { type: "crystal_rose", color: "#ff88cc" },
      { type: "starbloom", color: "#ffd700" },
      { type: "moonvine", color: "#88ccff" },
      { type: "aurora_tree", color: "#44ffaa" },
      { type: "void_lily", color: "#aa44ff" },
    ];
    const bloomingTypes = new Set<string>();
    for (const [, pl] of state.plants) {
      const plant = pl as any;
      if (plant.stage === "blooming" || plant.stage === "radiant") {
        bloomingTypes.add(plant.type);
      }
    }

    // Check for nearby radiant non-awakened plant for sentinel hint
    const hasNearbyRadiantPlant = [...state.plants.values()].some(pl =>
      pl.growthStage >= 3 && !pl.awakened &&
      Math.abs(pl.pos.x - p.pos.x) < 5 && Math.abs(pl.pos.z - p.pos.z) < 5
    );

    const modName = WAVE_MODIFIER_NAMES[state.waveModifier];
    const modColor = WAVE_MODIFIER_COLORS[state.waveModifier];

    let upgradeHtml = "";
    if (state.paused) {
      upgradeHtml = `
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                    background:rgba(10,5,25,0.92);border:2px solid #88ccff;border-radius:12px;
                    padding:30px;text-align:center;pointer-events:auto;min-width:400px;">
          <div style="font-size:24px;color:#88ccff;margin-bottom:20px;letter-spacing:4px;">PAUSED</div>
          <div style="font-size:14px;color:#aa88cc;margin-bottom:16px;">Upgrades (spend essence)</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${UPGRADES.map(u => {
              const lvl = p[u.field];
              const maxed = lvl >= u.maxLevel;
              const cost = maxed ? 0 : getUpgradeCost(u, lvl);
              const canBuy = !maxed && p.essence >= cost;
              return `
                <div style="display:flex;align-items:center;gap:10px;padding:8px;
                            border:1px solid ${canBuy ? '#88ccff' : '#333'};border-radius:6px;
                            background:rgba(30,20,60,0.6);">
                  <div style="flex:1;text-align:left;">
                    <div style="color:${maxed ? '#666' : '#ccc'};font-size:13px;">${u.name} ${maxed ? '(MAX)' : `Lv${lvl}`}</div>
                    <div style="color:#887;font-size:11px;">${u.description}</div>
                  </div>
                  ${maxed ? '' : `
                    <button class="guin-upgrade-btn" data-id="${u.id}" style="
                      pointer-events:auto;padding:6px 14px;border:1px solid ${canBuy ? '#ffd700' : '#444'};
                      background:${canBuy ? 'rgba(255,215,0,0.1)' : 'transparent'};
                      color:${canBuy ? '#ffd700' : '#555'};font-size:12px;cursor:${canBuy ? 'pointer' : 'default'};
                      border-radius:4px;
                    ">${cost} ✦</button>
                  `}
                </div>
              `;
            }).join("")}
          </div>
          <div style="margin-top:16px;font-size:12px;color:#665;">Press ESC to resume</div>
          <button id="guin-exit-btn" style="
            pointer-events:auto;padding:6px 20px;border:1px solid #554;background:transparent;
            color:#887;font-size:11px;cursor:pointer;margin-top:10px;border-radius:4px;
          ">Exit to Menu</button>
        </div>
      `;
    }

    return `
      <!-- HP & Stamina -->
      <div style="position:absolute;top:16px;left:16px;">
        <div style="font-size:13px;color:#88ccff;margin-bottom:4px;">HP ${Math.ceil(p.hp)}/${p.maxHp}</div>
        <div style="width:180px;height:10px;background:#222;border-radius:5px;overflow:hidden;">
          <div style="width:${hpPct}%;height:100%;background:linear-gradient(90deg,#44aa66,#88ffaa);transition:width 0.2s;"></div>
        </div>
        ${shieldPct > 0 ? `
          <div style="width:180px;height:4px;background:#222;border-radius:2px;margin-top:2px;overflow:hidden;">
            <div style="width:${shieldPct}%;height:100%;background:#88ccff;"></div>
          </div>
        ` : ""}
        <div style="font-size:11px;color:#aaa;margin-top:4px;">Stamina</div>
        <div style="width:180px;height:6px;background:#222;border-radius:3px;overflow:hidden;">
          <div style="width:${staminaPct}%;height:100%;background:#ffd700;transition:width 0.1s;"></div>
        </div>
        ${p.dodgeCooldown > 0 ? `
          <div style="display:flex;align-items:center;gap:4px;margin-top:4px;">
            <div style="width:14px;height:14px;border:1px solid #88ccff;border-radius:50%;position:relative;overflow:hidden;">
              <div style="position:absolute;bottom:0;left:0;width:100%;height:${(1 - p.dodgeCooldown / GUIN.DODGE_COOLDOWN) * 100}%;background:rgba(136,204,255,0.4);"></div>
            </div>
            <div style="font-size:10px;color:#88ccff;">Dodge ${p.dodgeCooldown.toFixed(1)}s</div>
          </div>
        ` : ""}
      </div>

      <!-- Essence & Wave -->
      <div style="position:absolute;top:16px;right:16px;text-align:right;">
        <div style="font-size:18px;color:#ffd700;">✦ ${Math.floor(p.essence)}</div>
        <div style="font-size:13px;color:#aa88cc;margin-top:4px;">Wave ${state.wave}</div>
        ${modName ? `<div style="font-size:11px;color:${modColor};margin-top:2px;">${modName}</div>` : ""}
        <div style="font-size:11px;color:#776;margin-top:4px;">
          ${state.isNight ? '🌙 Night' : '☀ Day'} | Plants: ${plantCount}/${maxPlants}
        </div>
        <div style="font-size:11px;color:#665;margin-top:2px;">
          Seed: ${p.selectedSeed.replace("_", " ")}
        </div>
        ${awakenedCount > 0 ? `<div style="font-size:11px;color:#44ffaa;margin-top:2px;">Sentinels: ${awakenedCount}</div>` : ""}
        ${state.bestWave > 0 ? `<div style="font-size:10px;color:#665;margin-top:2px;">Best: Wave ${state.bestWave}</div>` : ""}
        ${state.activeSynergies.length > 0 ? `
          <div style="margin-top:4px;">
            ${state.activeSynergies.map(s => {
              const synergyInfo: Record<string, { color: string; label: string }> = {
                crystal_rose: { color: "#ff88aa", label: "Rose Vuln" },
                starbloom: { color: "#ffdd44", label: "Star Regen" },
                moonvine: { color: "#aabbff", label: "Moon Slow" },
                aurora_tree: { color: "#44ffaa", label: "Aurora Res" },
                void_lily: { color: "#cc66ff", label: "Void Drain" },
              };
              const info = synergyInfo[s.type] || { color: "#888", label: s.type };
              return `<div style="display:inline-flex;align-items:center;gap:3px;margin-right:6px;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${info.color};"></span>
                <span style="font-size:9px;color:${info.color};">${info.label}</span>
              </div>`;
            }).join("")}
          </div>
        ` : ""}
      </div>

      <!-- Crosshair + charge indicator -->
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;">
        <div style="position:absolute;top:-10px;left:-1px;width:2px;height:20px;background:rgba(255,255,255,0.5);"></div>
        <div style="position:absolute;top:-1px;left:-10px;width:20px;height:2px;background:rgba(255,255,255,0.5);"></div>
        ${p.moonbeamCharging ? (() => {
          const chargeRatio = p.moonbeamChargeTime / GUIN.MOONBEAM_CHARGE_TIME;
          const isFull = chargeRatio >= 0.95;
          return `
            <div style="position:absolute;top:-18px;left:-18px;width:36px;height:36px;
              border:2px solid ${isFull ? '#44eeff' : 'rgba(136,204,255,' + (0.3 + chargeRatio * 0.7) + ')'};
              border-radius:50%;
              box-shadow:${isFull ? '0 0 12px #44eeff, 0 0 24px #2288cc' : 'none'};
              clip-path:polygon(0 ${(1-chargeRatio)*100}%, 100% ${(1-chargeRatio)*100}%, 100% 100%, 0 100%);
              transition:clip-path 0.05s;"></div>
            ${isFull ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);
              font-size:10px;color:#44eeff;text-shadow:0 0 6px #44eeff;white-space:nowrap;">CHARGED</div>` : ""}
          `;
        })() : ""}
      </div>

      <!-- Day/Night indicator -->
      <div style="position:absolute;top:70px;left:50%;transform:translateX(-50%);width:120px;">
        <div style="width:100%;height:4px;background:#222;border-radius:2px;overflow:hidden;">
          <div style="width:${dayPct}%;height:100%;background:linear-gradient(90deg,#ffd700,#88ccff);transition:width 0.5s;"></div>
        </div>
      </div>

      <!-- Wave Countdown -->
      ${state.waveCountdown > 0.5 ? `
        <div style="position:absolute;top:50px;left:50%;transform:translateX(-50%);
                    font-size:22px;color:#ffd700;text-shadow:0 0 12px #ffaa00;letter-spacing:3px;">
          NEXT WAVE IN ${Math.ceil(state.waveCountdown)}
        </div>
      ` : ""}

      <!-- Combo -->
      ${p.combo > 1 ? `
        <div style="position:absolute;top:85px;left:50%;transform:translateX(-50%);
                    font-size:16px;color:#ffd700;text-shadow:0 0 10px #ffaa00;">
          ${p.combo}x COMBO
        </div>
      ` : ""}

      <!-- Celestial Convergence meter -->
      <div style="position:absolute;bottom:90px;left:50%;transform:translateX(-50%);text-align:center;">
        <div style="display:flex;gap:6px;justify-content:center;align-items:center;">
          ${celestialOrbTypes.map(o => {
            const lit = bloomingTypes.has(o.type);
            return `<div style="width:12px;height:12px;border-radius:50%;
              background:${lit ? o.color : '#333'};
              box-shadow:${lit ? `0 0 6px ${o.color}, 0 0 12px ${o.color}` : 'none'};
              border:1px solid ${lit ? o.color : '#444'};
              transition:all 0.3s;"></div>`;
          }).join("")}
        </div>
        ${(p as any).celestialCd > 0 ? `
          <div style="font-size:10px;color:#aa88cc;margin-top:4px;">
            Celestial: ${((p as any).celestialCd).toFixed(1)}s
          </div>
        ` : (p as any).celestialActive > 0 ? `
          <div style="font-size:14px;color:#ffd700;margin-top:4px;
            text-shadow:0 0 10px #ffd700,0 0 20px #ffaa00;
            animation:guin-pulse 0.5s ease-in-out infinite alternate;">
            CELESTIAL CONVERGENCE
          </div>
        ` : (p as any).celestialReady ? `
          <div style="font-size:12px;color:#ffd700;margin-top:4px;
            text-shadow:0 0 8px #ffd700,0 0 16px #ffaa00;
            animation:guin-pulse 0.8s ease-in-out infinite alternate;">
            CELESTIAL READY &mdash; Press 5
          </div>
        ` : ""}
      </div>

      <!-- Celestial active full-screen border glow -->
      ${(p as any).celestialActive > 0 ? `
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;
          box-shadow:inset 0 0 80px rgba(255,215,0,0.3), inset 0 0 160px rgba(255,170,0,0.15);"></div>
      ` : ""}

      <!-- Ability cooldowns -->
      <div style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:8px;align-items:flex-end;">
        <div style="width:32px;text-align:center;margin-right:4px;">
          <div style="width:32px;height:32px;border:1px solid ${moonbeamReady ? '#ffd700' : '#333'};
                      border-radius:6px;background:rgba(20,15,40,0.7);display:flex;
                      align-items:center;justify-content:center;position:relative;overflow:hidden;">
            <div style="position:absolute;bottom:0;left:0;width:100%;height:${moonbeamPct}%;
                        background:${moonbeamReady ? 'rgba(255,215,0,0.2)' : 'rgba(50,40,80,0.3)'};"></div>
            <div style="position:relative;font-size:9px;color:${moonbeamReady ? '#ffd700' : '#555'};">LMB</div>
          </div>
          <div style="font-size:8px;color:#665;margin-top:2px;">Beam</div>
        </div>
        ${cds.map(cd => {
          const ready = cd.cd <= 0;
          const pct = ready ? 100 : (1 - cd.cd / cd.max) * 100;
          return `
            <div style="width:50px;text-align:center;">
              <div style="width:50px;height:50px;border:2px solid ${ready ? '#88ccff' : '#333'};
                          border-radius:8px;background:rgba(20,15,40,0.7);display:flex;
                          align-items:center;justify-content:center;position:relative;overflow:hidden;">
                <div style="position:absolute;bottom:0;left:0;width:100%;height:${pct}%;
                            background:${ready ? 'rgba(136,204,255,0.2)' : 'rgba(50,40,80,0.3)'};"></div>
                <div style="position:relative;font-size:16px;color:${ready ? '#88ccff' : '#555'};">${cd.key}</div>
              </div>
              <div style="font-size:9px;color:#665;margin-top:2px;">${cd.name}</div>
            </div>
          `;
        }).join("")}
        ${(p as any).celestialReady ? `
          <div style="width:56px;text-align:center;margin-left:4px;">
            <div style="width:56px;height:56px;border:2px solid #ffd700;
                        border-radius:8px;background:rgba(40,30,10,0.7);display:flex;
                        align-items:center;justify-content:center;position:relative;overflow:hidden;
                        box-shadow:0 0 10px rgba(255,215,0,0.3),inset 0 0 10px rgba(255,215,0,0.1);">
              <div style="position:relative;font-size:18px;color:#ffd700;text-shadow:0 0 6px #ffaa00;">5</div>
            </div>
            <div style="font-size:9px;color:#ffd700;margin-top:2px;">Celestial</div>
          </div>
        ` : ""}
      </div>

      <!-- Planting/Harvesting progress -->
      ${p.planting ? `
        <div style="position:absolute;bottom:100px;left:50%;transform:translateX(-50%);text-align:center;">
          <div style="font-size:12px;color:#88ff88;margin-bottom:3px;">Planting...</div>
          <div style="width:120px;height:6px;background:#222;border-radius:3px;overflow:hidden;">
            <div style="width:${(1 - p.plantTimer / 0.8) * 100}%;height:100%;background:#88ff88;transition:width 0.1s;"></div>
          </div>
        </div>
      ` : ""}
      ${p.harvesting ? `
        <div style="position:absolute;bottom:100px;left:50%;transform:translateX(-50%);text-align:center;">
          <div style="font-size:12px;color:#ffd700;margin-bottom:3px;">Harvesting...</div>
          <div style="width:120px;height:6px;background:#222;border-radius:3px;overflow:hidden;">
            <div style="width:${(1 - p.harvestTimer / GUIN.HARVEST_TIME) * 100}%;height:100%;background:#ffd700;transition:width 0.1s;"></div>
          </div>
        </div>
      ` : ""}

      <!-- Wave title -->
      ${state.waveTitle.timer > 0 ? `
        <div style="position:absolute;top:35%;left:50%;transform:translateX(-50%);
                    font-size:32px;color:${state.waveTitle.color};text-shadow:0 0 20px ${state.waveTitle.color};
                    letter-spacing:6px;opacity:${Math.min(1, state.waveTitle.timer)};">
          ${state.waveTitle.text}
        </div>
      ` : ""}

      <!-- Notifications -->
      <div style="position:absolute;top:40%;left:50%;transform:translateX(-50%);text-align:center;">
        ${state.notifications.slice(-3).map(n => `
          <div style="font-size:14px;color:${n.color};opacity:${Math.min(1, n.timer)};
                      text-shadow:0 0 8px ${n.color};margin-bottom:4px;">${n.text}</div>
        `).join("")}
      </div>

      <!-- Screen flash -->
      ${state.screenFlash.intensity > 0 ? `
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;
                    background:${state.screenFlash.color};opacity:${state.screenFlash.intensity * 0.3};
                    pointer-events:none;"></div>
      ` : ""}

      <!-- Perfect dodge flash -->
      ${(p as any).perfectDodgeTimer > 0 ? `
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;
          box-shadow:inset 0 0 60px rgba(255,215,0,0.25), inset 0 0 120px rgba(255,215,0,0.1);"></div>
        <div style="position:absolute;top:42%;left:50%;transform:translate(-50%,-50%);text-align:center;">
          <div style="font-size:28px;color:#ffd700;text-shadow:0 0 16px #ffd700,0 0 32px #ffaa00;
            letter-spacing:4px;font-weight:bold;">PERFECT DODGE!</div>
          <div style="font-size:16px;color:#ffaa00;margin-top:6px;text-shadow:0 0 10px #ffd700;">
            ${(p as any).perfectDodgeDamageMult || 3}x DAMAGE
          </div>
        </div>
      ` : ""}

      <!-- Death sequence overlay -->
      ${(state as any).deathSequenceTimer > 0 ? `
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;
          background:radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,${Math.min(0.85, (state as any).deathSequenceTimer * 0.4)}) 100%);"></div>
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;
          box-shadow:inset 0 0 200px rgba(80,0,20,${Math.min(0.6, (state as any).deathSequenceTimer * 0.3)}),
                     inset 0 0 400px rgba(20,0,40,${Math.min(0.4, (state as any).deathSequenceTimer * 0.2)});"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          font-size:48px;color:#ff4466;letter-spacing:12px;font-weight:bold;
          text-shadow:0 0 30px #cc2244, 0 0 60px #880022;
          opacity:${Math.min(1, (state as any).deathSequenceTimer * 0.8)};">
          FALLEN...
        </div>
      ` : ""}

      <!-- Low HP heartbeat vignette -->
      ${p.hp < p.maxHp * 0.3 && p.hp > 0 ? `
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;
          box-shadow:inset 0 0 ${60 + Math.sin(state.gameTime * 6) * 30}px rgba(200,0,0,${0.2 + (1 - p.hp / (p.maxHp * 0.3)) * 0.3});
          animation:guin-pulse 0.5s ease-in-out infinite alternate;"></div>
      ` : ""}

      <!-- Artifact display (collected) -->
      ${state.artifacts.length > 0 ? `
        <div style="position:absolute;top:16px;left:50%;transform:translateX(-50%);display:flex;gap:4px;">
          ${state.artifacts.map((a: ArtifactType) => {
            const info = ARTIFACT_INFO[a];
            return `<div title="${info.name}: ${info.desc}" style="
              width:22px;height:22px;border-radius:4px;background:rgba(20,15,40,0.7);
              border:1px solid ${info.color};display:flex;align-items:center;justify-content:center;
              font-size:12px;box-shadow:0 0 4px ${info.color}40;">${info.icon}</div>`;
          }).join("")}
        </div>
      ` : ""}

      <!-- Enemy count -->
      <div style="position:absolute;bottom:16px;left:16px;font-size:11px;color:#776;">
        Enemies: ${state.enemies.filter(e => e.behavior !== "dead").length} | Kills: ${state.totalKills}
        ${eliteCount > 0 ? `<br><span style="color:#ff6644;">Elites: ${eliteCount}</span>` : ""}
      </div>

      <!-- Sentinel awaken hint -->
      ${hasNearbyRadiantPlant && !state.paused ? `
        <div style="position:absolute;bottom:40px;right:16px;font-size:11px;color:#44ffaa;
                    background:rgba(10,5,25,0.7);padding:6px 10px;border:1px solid #2a5540;border-radius:4px;">
          Press G to awaken sentinel (${GUIN.SENTINEL_COST} essence)
        </div>
      ` : ""}

      <!-- Island expansion hint -->
      ${(() => {
        const nextIsland = state.islands.find(i => !i.unlocked);
        const cost = GUIN.ISLAND_EXPAND_COST;
        return nextIsland && p.essence >= cost ? `
          <div style="position:absolute;bottom:16px;right:16px;font-size:11px;color:#88ccff;
                      background:rgba(10,5,25,0.7);padding:6px 10px;border:1px solid #334;border-radius:4px;">
            Press B to expand garden (cost: ${cost} essence)
          </div>
        ` : "";
      })()}

      ${upgradeHtml}
    `;
  }

  private _renderGameOver(state: GuinevereState): string {
    const s = state.stats;
    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  height:100%;background:rgba(5,5,16,0.88);pointer-events:auto;">
        <div style="font-size:42px;color:#ff4466;text-shadow:0 0 20px #cc2244;
                    letter-spacing:6px;margin-bottom:8px;">THE GARDEN WITHERS</div>
        <div style="font-size:16px;color:#aa88cc;margin-bottom:30px;">Wave ${state.wave} | Best: ${state.bestWave}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:13px;margin-bottom:30px;">
          <div style="color:#776;">Enemies Killed</div><div style="color:#ccc;">${s.enemiesKilled}</div>
          <div style="color:#776;">Damage Dealt</div><div style="color:#ccc;">${Math.round(s.damageDealt)}</div>
          <div style="color:#776;">Plants Grown</div><div style="color:#88ff88;">${s.plantsGrown}</div>
          <div style="color:#776;">Plants Lost</div><div style="color:#ff6644;">${s.plantsLost}</div>
          <div style="color:#776;">Essence Harvested</div><div style="color:#ffd700;">${s.essenceHarvested}</div>
          <div style="color:#776;">Total Essence</div><div style="color:#ffd700;">${Math.floor(state.player.totalEssence)}</div>
          <div style="color:#776;">Artifacts Found</div><div style="color:#ffd700;">${state.artifacts.length}</div>
        </div>
        <div style="display:flex;gap:12px;">
          <button id="guin-restart-btn" style="
            pointer-events:auto;padding:14px 40px;border:2px solid #88ccff;background:rgba(136,204,255,0.08);
            color:#88ccff;font-size:18px;cursor:pointer;border-radius:8px;letter-spacing:3px;
          ">REPLANT</button>
          <button id="guin-exit-btn" style="
            pointer-events:auto;padding:14px 30px;border:1px solid #554;background:transparent;
            color:#887;font-size:16px;cursor:pointer;border-radius:8px;
          ">Exit</button>
        </div>
      </div>
    `;
  }

  private _bindEvents(state: GuinevereState): void {
    // Start
    const startBtn = document.getElementById("guin-start-btn");
    if (startBtn) startBtn.addEventListener("click", () => window.dispatchEvent(new Event("guinevereStartGame")));

    // Exit
    const exitBtns = document.querySelectorAll("#guin-exit-btn");
    exitBtns.forEach(btn => btn.addEventListener("click", () => this._onExit()));

    // Restart
    const restartBtn = document.getElementById("guin-restart-btn");
    if (restartBtn) restartBtn.addEventListener("click", () => window.dispatchEvent(new Event("guinevereRestart")));

    // Difficulty
    document.querySelectorAll(".guin-diff-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        state.difficulty = btn.getAttribute("data-diff") as Difficulty;
      });
    });

    // Upgrades
    document.querySelectorAll(".guin-upgrade-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id")!;
        window.dispatchEvent(new CustomEvent("guineverePurchaseUpgrade", { detail: id }));
      });
    });
  }

  cleanup(): void {
    if (this._root && this._root.parentElement) {
      this._root.parentElement.removeChild(this._root);
    }
  }
}
