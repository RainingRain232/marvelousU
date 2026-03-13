// ---------------------------------------------------------------------------
// GTA3DHUD — HTML-based heads-up display for the 3D Medieval GTA
// Health bar, stamina bar, wanted shields, weapon display, minimap,
// notifications, game over screen, pause menu.
// ---------------------------------------------------------------------------

import type { GTA3DState } from "../state/GTA3DState";
import { GTA3D } from "../config/GTA3DConfig";

const GOLD = "#DAA520";
const PANEL_GRADIENT = "linear-gradient(180deg, rgba(30,28,55,0.92) 0%, rgba(16,14,32,0.92) 100%)";
const FONT = "'Segoe UI', monospace";
const FONT_LABEL = "'Cinzel', 'Palatino Linotype', 'Book Antiqua', serif";
const FONT_MONO = "'Consolas', 'Courier New', monospace";

const WEAPON_DAMAGE: Record<string, number> = {
  fists: 5, sword: 15, axe: 20, mace: 18, spear: 16, bow: 12, crossbow: 22
};

export class GTA3DHUD {
  private _root!: HTMLDivElement;
  private _styleEl!: HTMLStyleElement;

  // Status panel
  private _hpBar!: HTMLDivElement;
  private _hpFill!: HTMLDivElement;
  private _hpText!: HTMLSpanElement;
  private _staFill!: HTMLDivElement;
  private _staText!: HTMLSpanElement;
  private _goldText!: HTMLSpanElement;
  private _weaponText!: HTMLSpanElement;
  private _weaponIcon!: HTMLSpanElement;
  private _weaponDmgText!: HTMLSpanElement;

  // Wanted
  private _wantedPanel!: HTMLDivElement;
  private _wantedShields: HTMLDivElement[] = [];
  private _wantedLabel!: HTMLDivElement;

  // Location
  private _locationLabel!: HTMLDivElement;
  private _locationTimer = 0;
  private _lastLocation = "";

  // Notifications
  private _notifContainer!: HTMLDivElement;

  // Minimap
  private _minimapCanvas!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;

  // Compass
  private _compassBar!: HTMLDivElement;

  // Overlays
  private _gameOverOverlay!: HTMLDivElement;
  private _gameOverStats!: HTMLDivElement;
  private _pauseOverlay!: HTMLDivElement;

  // Crosshair
  private _crosshair!: HTMLDivElement;

  // Callbacks
  private _onExit: (() => void) | null = null;
  private _onResume: (() => void) | null = null;

  private _lastHp = 100;
  private _damageFlash!: HTMLDivElement;

  // Tracking stats for game over
  private _trackedKills = 0;
  private _maxGold = 0;
  private _gameOverShown = false;

  build(_sw: number, _sh: number, onExit?: () => void): void {
    this._onExit = onExit ?? null;

    // Inject CSS animations
    this._styleEl = document.createElement("style");
    this._styleEl.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
      @keyframes gta3d-hp-pulse {
        0%, 100% { box-shadow: 0 0 4px rgba(255,0,0,0.3), inset 0 0 4px rgba(255,0,0,0.1); }
        50% { box-shadow: 0 0 12px rgba(255,0,0,0.7), inset 0 0 8px rgba(255,0,0,0.3); }
      }
      @keyframes gta3d-wanted-fire {
        0%, 100% { filter: brightness(1) drop-shadow(0 0 4px rgba(255,80,0,0.6)); }
        50% { filter: brightness(1.3) drop-shadow(0 0 10px rgba(255,160,0,0.9)); }
      }
      @keyframes gta3d-notif-slide {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes gta3d-gameover-fadein {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes gta3d-pulse-text {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
      @keyframes gta3d-shield-glow {
        0%, 100% { filter: drop-shadow(0 0 3px rgba(218,165,32,0.4)); }
        50% { filter: drop-shadow(0 0 8px rgba(218,165,32,0.8)); }
      }
    `;
    document.head.appendChild(this._styleEl);

    this._root = document.createElement("div");
    this._root.id = "gta3d-hud";
    this._root.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;font-family:${FONT};`;
    document.body.appendChild(this._root);

    this._buildStatusPanel();
    this._buildWantedPanel();
    this._buildLocationLabel();
    this._buildCompass();
    this._buildNotifications();
    this._buildMinimap();
    this._buildCrosshair();
    this._buildDamageFlash();
    this._buildGameOver();
    this._buildPauseMenu();
  }

  // ===================== BUILD =====================

  private _buildStatusPanel(): void {
    const panel = document.createElement("div");
    // panel is used locally below
    panel.style.cssText = `position:absolute;top:12px;left:12px;width:230px;padding:0;background:${PANEL_GRADIENT};border:1.5px solid ${GOLD};border-radius:6px;box-shadow:inset 0 0 20px rgba(218,165,32,0.06), 0 4px 16px rgba(0,0,0,0.5);overflow:hidden;`;
    this._root.appendChild(panel);

    // Decorative gold top border
    const topBorder = document.createElement("div");
    topBorder.style.cssText = `height:3px;background:linear-gradient(90deg, transparent 0%, ${GOLD} 15%, #FFD700 50%, ${GOLD} 85%, transparent 100%);margin-bottom:2px;`;
    panel.appendChild(topBorder);

    // Ornamental pattern strip
    const ornament = document.createElement("div");
    ornament.style.cssText = `text-align:center;font-size:8px;color:${GOLD};opacity:0.5;letter-spacing:4px;line-height:10px;margin-bottom:2px;`;
    ornament.textContent = "\u2666 \u2666 \u2666 \u2666 \u2666";
    panel.appendChild(ornament);

    const inner = document.createElement("div");
    inner.style.cssText = "padding:4px 14px 10px 14px;";
    panel.appendChild(inner);

    // HP
    const hpRow = this._makeBarRow(inner, "HP", "linear-gradient(90deg, #8B0000, #CC3333, #EE4444)", "#331111");
    this._hpBar = hpRow.bg;
    this._hpFill = hpRow.fill;
    this._hpText = hpRow.text;

    // Stamina
    const staRow = this._makeBarRow(inner, "STA", "linear-gradient(90deg, #1B5E20, #44AA44, #66DD66)", "#113311");
    this._staFill = staRow.fill;
    this._staText = staRow.text;

    // Gold
    const goldRow = document.createElement("div");
    goldRow.style.cssText = "display:flex;align-items:center;margin-top:8px;";
    goldRow.innerHTML = `<span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 40% 35%, #FFD700, #DAA520, #B8860B);border:1px solid #AA8800;text-align:center;line-height:16px;font-size:9px;color:#6B4914;font-weight:bold;box-shadow:0 0 6px rgba(218,165,32,0.4);">G</span>`;
    this._goldText = document.createElement("span");
    this._goldText.style.cssText = `margin-left:8px;color:${GOLD};font-weight:bold;font-size:14px;font-family:${FONT_MONO};text-shadow:0 0 6px rgba(218,165,32,0.3);`;
    this._goldText.textContent = "50";
    goldRow.appendChild(this._goldText);
    inner.appendChild(goldRow);

    // Weapon
    const weapWrapper = document.createElement("div");
    weapWrapper.style.cssText = `margin-top:8px;padding:6px 8px;background:rgba(255,255,255,0.04);border-radius:4px;border:1px solid rgba(218,165,32,0.15);`;
    const weapRow = document.createElement("div");
    weapRow.style.cssText = "display:flex;align-items:center;";
    this._weaponIcon = document.createElement("span");
    this._weaponIcon.style.cssText = "font-size:24px;margin-right:8px;filter:drop-shadow(0 0 3px rgba(218,165,32,0.3));";
    this._weaponIcon.textContent = "\u2694";
    weapRow.appendChild(this._weaponIcon);
    const weapInfo = document.createElement("div");
    weapInfo.style.cssText = "display:flex;flex-direction:column;";
    this._weaponText = document.createElement("span");
    this._weaponText.style.cssText = `color:#DDDDDD;font-size:12px;font-family:${FONT_LABEL};font-weight:bold;`;
    this._weaponText.textContent = "Sword";
    weapInfo.appendChild(this._weaponText);
    this._weaponDmgText = document.createElement("span");
    this._weaponDmgText.style.cssText = "color:#888;font-size:9px;margin-top:1px;";
    this._weaponDmgText.textContent = "DMG: 15";
    weapInfo.appendChild(this._weaponDmgText);
    weapRow.appendChild(weapInfo);
    weapWrapper.appendChild(weapRow);
    inner.appendChild(weapWrapper);

    // Controls hint
    const hint = document.createElement("div");
    hint.style.cssText = `margin-top:6px;font-size:9px;color:#555;font-family:${FONT_MONO};`;
    hint.textContent = "1-7 weapons | E interact | F steal";
    inner.appendChild(hint);
  }

  private _makeBarRow(parent: HTMLElement, label: string, fillGradient: string, bgColor: string) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;margin-bottom:4px;";

    const lbl = document.createElement("span");
    const lblColor = label === "HP" ? "#CC3333" : "#44AA44";
    lbl.style.cssText = `width:30px;font-size:10px;font-weight:bold;color:${lblColor};font-family:${FONT_LABEL};letter-spacing:1px;`;
    lbl.textContent = label;
    row.appendChild(lbl);

    const bg = document.createElement("div");
    bg.style.cssText = `flex:1;height:14px;background:${bgColor};border-radius:3px;overflow:hidden;position:relative;border:1px solid rgba(255,255,255,0.08);`;

    // Fill bar
    const fill = document.createElement("div");
    fill.style.cssText = `height:100%;width:100%;background:${fillGradient};border-radius:3px;transition:width 0.1s;position:relative;`;
    bg.appendChild(fill);

    // Shine overlay
    const shine = document.createElement("div");
    shine.style.cssText = "position:absolute;top:0;left:0;width:100%;height:50%;background:linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%);border-radius:3px 3px 0 0;pointer-events:none;";
    bg.appendChild(shine);

    // Tick marks at 25%, 50%, 75%
    for (const pct of [25, 50, 75]) {
      const tick = document.createElement("div");
      tick.style.cssText = `position:absolute;top:0;left:${pct}%;width:1px;height:100%;background:rgba(0,0,0,0.3);pointer-events:none;`;
      bg.appendChild(tick);
    }

    row.appendChild(bg);

    const text = document.createElement("span");
    text.style.cssText = `width:54px;text-align:right;font-size:9px;color:#ccc;margin-left:4px;font-family:${FONT_MONO};`;
    text.textContent = "100/100";
    row.appendChild(text);

    parent.appendChild(row);
    return { bg, fill, shine, text };
  }

  private _buildWantedPanel(): void {
    this._wantedPanel = document.createElement("div");
    this._wantedPanel.style.cssText = `position:absolute;top:12px;right:12px;padding:8px 14px;background:${PANEL_GRADIENT};border:1px solid ${GOLD};border-radius:5px;text-align:center;box-shadow:inset 0 0 15px rgba(218,165,32,0.05), 0 4px 12px rgba(0,0,0,0.4);`;
    this._root.appendChild(this._wantedPanel);

    this._wantedLabel = document.createElement("div");
    this._wantedLabel.style.cssText = `font-size:11px;font-weight:bold;color:#FF3333;letter-spacing:3px;margin-bottom:5px;height:14px;font-family:${FONT_LABEL};text-shadow:0 0 6px rgba(255,50,50,0.4);`;
    this._wantedPanel.appendChild(this._wantedLabel);

    const shieldRow = document.createElement("div");
    shieldRow.style.cssText = "display:flex;gap:8px;justify-content:center;";
    this._wantedPanel.appendChild(shieldRow);

    this._wantedShields = [];
    for (let i = 0; i < 5; i++) {
      const shield = document.createElement("div");
      shield.style.cssText = "width:28px;height:34px;position:relative;";
      shield.innerHTML = `<svg viewBox="0 0 20 26" width="28" height="34"><path d="M0,0 L20,0 L20,16 L10,26 L0,16 Z" fill="#444" stroke="#555" stroke-width="1"/></svg>`;
      this._wantedShields.push(shield);
      shieldRow.appendChild(shield);
    }
  }

  private _buildLocationLabel(): void {
    this._locationLabel = document.createElement("div");
    this._locationLabel.style.cssText = `position:absolute;top:14px;left:50%;transform:translateX(-50%);font-size:14px;font-weight:bold;color:${GOLD};letter-spacing:3px;text-shadow:0 0 6px rgba(0,0,0,0.8);opacity:0;transition:opacity 0.3s;`;
    this._root.appendChild(this._locationLabel);
  }

  private _buildCompass(): void {
    this._compassBar = document.createElement("div");
    this._compassBar.style.cssText = `position:absolute;top:12px;left:50%;transform:translateX(-50%);width:240px;height:28px;background:rgba(15,12,30,0.75);border:1px solid rgba(218,165,32,0.4);border-radius:4px;overflow:hidden;font-family:${FONT_LABEL};font-size:11px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);`;
    this._root.appendChild(this._compassBar);
  }

  private _buildNotifications(): void {
    this._notifContainer = document.createElement("div");
    this._notifContainer.style.cssText = "position:absolute;bottom:120px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column-reverse;align-items:center;gap:6px;";
    this._root.appendChild(this._notifContainer);
  }

  private _buildMinimap(): void {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `position:absolute;bottom:12px;right:12px;background:${PANEL_GRADIENT};border:1.5px solid ${GOLD};border-radius:5px;padding:4px;box-shadow:0 0 12px rgba(218,165,32,0.15), 0 4px 16px rgba(0,0,0,0.5);`;
    this._root.appendChild(wrapper);

    const title = document.createElement("div");
    title.style.cssText = `text-align:center;font-size:9px;font-weight:bold;color:${GOLD};letter-spacing:3px;margin-bottom:2px;font-family:${FONT_LABEL};`;
    title.textContent = "CAMELOT";
    wrapper.appendChild(title);

    // Container for canvas + compass labels
    const mapContainer = document.createElement("div");
    mapContainer.style.cssText = "position:relative;width:196px;height:196px;display:flex;align-items:center;justify-content:center;";
    wrapper.appendChild(mapContainer);

    // Compass rose labels
    const directions = [
      { text: "N", top: "0px", left: "50%", transform: "translateX(-50%)" },
      { text: "S", bottom: "0px", left: "50%", transform: "translateX(-50%)" },
      { text: "E", right: "0px", top: "50%", transform: "translateY(-50%)" },
      { text: "W", left: "0px", top: "50%", transform: "translateY(-50%)" },
    ];
    for (const d of directions) {
      const lbl = document.createElement("div");
      let css = `position:absolute;font-size:9px;font-weight:bold;color:${GOLD};font-family:${FONT_LABEL};opacity:0.7;`;
      if (d.top) css += `top:${d.top};`;
      if (d.bottom) css += `bottom:${d.bottom};`;
      if (d.left) css += `left:${d.left};`;
      if (d.right) css += `right:${d.right};`;
      if (d.transform) css += `transform:${d.transform};`;
      lbl.style.cssText = css;
      lbl.textContent = d.text;
      mapContainer.appendChild(lbl);
    }

    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 180;
    this._minimapCanvas.height = 180;
    this._minimapCanvas.style.cssText = "display:block;border:1px solid rgba(218,165,32,0.3);border-radius:3px;";
    mapContainer.appendChild(this._minimapCanvas);
    this._minimapCtx = this._minimapCanvas.getContext("2d")!;
  }

  private _buildCrosshair(): void {
    this._crosshair = document.createElement("div");
    this._crosshair.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:24px;height:24px;pointer-events:none;";
    this._crosshair.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24">
      <line x1="12" y1="4" x2="12" y2="10" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
      <line x1="12" y1="14" x2="12" y2="20" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
      <line x1="4" y1="12" x2="10" y2="12" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
      <line x1="14" y1="12" x2="20" y2="12" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="2" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    </svg>`;
    this._root.appendChild(this._crosshair);
  }

  private _buildDamageFlash(): void {
    this._damageFlash = document.createElement("div");
    this._damageFlash.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(200,0,0,0);pointer-events:none;transition:background 0.1s;";
    this._root.appendChild(this._damageFlash);
  }

  private _buildGameOver(): void {
    this._gameOverOverlay = document.createElement("div");
    this._gameOverOverlay.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(15,0,0,0.8);display:none;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;`;

    const content = document.createElement("div");
    content.style.cssText = "display:flex;flex-direction:column;align-items:center;animation:gta3d-gameover-fadein 1.2s ease-out;";

    // Skull / crossed swords decoration
    const decoration = document.createElement("div");
    decoration.style.cssText = "font-size:40px;color:#880000;opacity:0.7;margin-bottom:8px;text-shadow:0 0 10px #440000;";
    decoration.textContent = "\u2620 \u2694\uFE0F \u2620";
    content.appendChild(decoration);

    const title = document.createElement("div");
    title.style.cssText = `font-size:56px;font-weight:bold;color:#880000;letter-spacing:10px;text-shadow:0 0 30px #440000, 0 0 60px #220000;font-family:${FONT_LABEL};`;
    title.textContent = "YOU DIED";
    content.appendChild(title);

    // Decorative divider
    const divider = document.createElement("div");
    divider.style.cssText = `width:200px;height:1px;background:linear-gradient(90deg, transparent, #880000, transparent);margin:16px 0;`;
    content.appendChild(divider);

    // Stats container
    this._gameOverStats = document.createElement("div");
    this._gameOverStats.style.cssText = `font-size:13px;color:#AA7777;font-family:${FONT_LABEL};text-align:center;line-height:1.8;margin-top:4px;`;
    this._gameOverStats.innerHTML = "";
    content.appendChild(this._gameOverStats);

    const restart = document.createElement("div");
    restart.style.cssText = `font-size:16px;color:#996666;margin-top:24px;font-family:${FONT_LABEL};letter-spacing:2px;animation:gta3d-pulse-text 2s ease-in-out infinite;`;
    restart.textContent = "Press R to restart";
    content.appendChild(restart);

    this._gameOverOverlay.appendChild(content);
    this._root.appendChild(this._gameOverOverlay);
  }

  private _buildPauseMenu(): void {
    this._pauseOverlay = document.createElement("div");
    this._pauseOverlay.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,15,0.7);display:none;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;`;

    const panel = document.createElement("div");
    panel.style.cssText = `background:rgba(18,18,42,0.95);border:2px solid ${GOLD};border-radius:8px;padding:24px 40px;max-width:420px;width:90%;`;

    panel.innerHTML = `
      <div style="text-align:center;font-size:28px;font-weight:bold;color:${GOLD};letter-spacing:6px;margin-bottom:16px;">PAUSED</div>
      <div style="border-top:1px solid rgba(218,165,32,0.3);margin-bottom:12px;"></div>
      <div style="font-size:13px;font-weight:bold;color:${GOLD};margin-bottom:8px;">CONTROLS</div>
      <table style="width:100%;font-size:11px;color:#99AABB;border-spacing:0 3px;">
        <tr><td style="color:#CCBB88;font-weight:bold;width:100px;">WASD</td><td>Move</td></tr>
        <tr><td style="color:#CCBB88;font-weight:bold;">Shift</td><td>Run (uses stamina)</td></tr>
        <tr><td style="color:#CCBB88;font-weight:bold;">Space</td><td>Dodge roll</td></tr>
        <tr><td style="color:#CCBB88;font-weight:bold;">Left Click</td><td>Attack</td></tr>
        <tr><td style="color:#CCBB88;font-weight:bold;">Right Click</td><td>Block</td></tr>
        <tr><td style="color:#CCBB88;font-weight:bold;">E</td><td>Interact / Mount horse</td></tr>
        <tr><td style="color:#CCBB88;font-weight:bold;">F</td><td>Steal horse</td></tr>
        <tr><td style="color:#CCBB88;font-weight:bold;">1-7</td><td>Switch weapon</td></tr>
        <tr><td style="color:#CCBB88;font-weight:bold;">Esc / P</td><td>Pause menu</td></tr>
      </table>
      <div style="border-top:1px solid rgba(218,165,32,0.3);margin:12px 0;"></div>
      <div style="font-size:13px;font-weight:bold;color:${GOLD};margin-bottom:8px;">WEAPONS</div>
      <div style="font-size:10px;color:#8899AA;line-height:1.6;">
        <b style="color:#CCBB88;">1</b> Fists &bull;
        <b style="color:#CCBB88;">2</b> Sword &bull;
        <b style="color:#CCBB88;">3</b> Axe &bull;
        <b style="color:#CCBB88;">4</b> Mace &bull;
        <b style="color:#CCBB88;">5</b> Spear &bull;
        <b style="color:#CCBB88;">6</b> Bow &bull;
        <b style="color:#CCBB88;">7</b> Crossbow
      </div>
    `;

    // Buttons
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-top:16px;";

    const resumeBtn = this._makeButton("RESUME", "#224422", "#44AA44", "#88FF88");
    resumeBtn.addEventListener("click", () => { this._onResume?.(); });
    btnRow.appendChild(resumeBtn);

    const exitBtn = this._makeButton("BACK TO MAIN MENU", "#442222", "#AA4444", "#FF8888");
    exitBtn.addEventListener("click", () => { this._onExit?.(); });
    btnRow.appendChild(exitBtn);

    panel.appendChild(btnRow);
    this._pauseOverlay.appendChild(panel);
    this._root.appendChild(this._pauseOverlay);
  }

  private _makeButton(text: string, bg: string, border: string, color: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.cssText = `background:${bg};border:1.5px solid ${border};color:${color};font-family:${FONT};font-size:13px;font-weight:bold;padding:8px 16px;border-radius:5px;cursor:pointer;pointer-events:auto;letter-spacing:1px;`;
    btn.addEventListener("mouseenter", () => { btn.style.filter = "brightness(1.3)"; });
    btn.addEventListener("mouseleave", () => { btn.style.filter = ""; });
    return btn;
  }

  // ===================== UPDATE =====================

  update(state: GTA3DState, dt: number): void {
    const p = state.player;

    // Track stats
    if (p.gold > this._maxGold) this._maxGold = p.gold;
    let deadCount = 0;
    state.npcs.forEach(npc => { if (npc.dead) deadCount++; });
    this._trackedKills = deadCount;

    // HP bar
    const hpPct = Math.max(0, p.hp / p.maxHp);
    this._hpFill.style.width = `${hpPct * 100}%`;
    if (hpPct > 0.5) {
      this._hpFill.style.background = "linear-gradient(90deg, #8B0000, #CC3333, #EE4444)";
    } else if (hpPct > 0.25) {
      this._hpFill.style.background = "linear-gradient(90deg, #8B4500, #CC6633, #EE8844)";
    } else {
      this._hpFill.style.background = "linear-gradient(90deg, #AA0000, #FF2222, #FF4444)";
    }
    this._hpText.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;

    // HP low pulse
    if (hpPct < 0.25 && hpPct > 0) {
      this._hpBar.style.animation = "gta3d-hp-pulse 1s ease-in-out infinite";
    } else {
      this._hpBar.style.animation = "none";
    }

    // Stamina bar
    const staPct = Math.max(0, p.stamina / GTA3D.STAMINA_MAX);
    this._staFill.style.width = `${staPct * 100}%`;
    this._staText.textContent = `${Math.ceil(p.stamina)}`;

    // Gold
    this._goldText.textContent = `${p.gold}`;

    // Weapon
    const weaponNames: Record<string, string> = {
      fists: "Fists", sword: "Sword", axe: "Battle Axe",
      mace: "Mace", spear: "Spear", bow: "Bow", crossbow: "Crossbow"
    };
    const weaponIcons: Record<string, string> = {
      fists: "\u270A", sword: "\u2694", axe: "\u{1FA93}",
      mace: "\u{1F528}", spear: "\u{1F531}", bow: "\u{1F3F9}", crossbow: "\u{1F3AF}"
    };
    this._weaponText.textContent = weaponNames[p.weapon] ?? p.weapon;
    this._weaponIcon.textContent = weaponIcons[p.weapon] ?? "\u2694";
    this._weaponDmgText.textContent = `DMG: ${WEAPON_DAMAGE[p.weapon] ?? "?"}`;

    // Wanted
    this._updateWanted(p.wantedLevel, state.tick);

    // Location
    this._updateLocation(state, dt);

    // Compass
    this._updateCompass(state.player.rotation);

    // Notifications
    this._updateNotifications(state);

    // Minimap
    this._updateMinimap(state);

    // Damage flash
    if (p.hp < this._lastHp) {
      this._damageFlash.style.background = "rgba(200,0,0,0.35)";
    }
    const curAlpha = parseFloat(this._damageFlash.style.background.match(/[\d.]+\)$/)?.[0] ?? "0");
    if (curAlpha > 0.01) {
      this._damageFlash.style.background = `rgba(200,0,0,${Math.max(0, curAlpha * 0.92).toFixed(3)})`;
    }
    this._lastHp = p.hp;

    // Game over
    if (state.gameOver && !this._gameOverShown) {
      this._gameOverShown = true;
      const mins = Math.floor(state.gameTime / 60);
      const secs = Math.floor(state.gameTime % 60);
      this._gameOverStats.innerHTML = `
        <div>\u2694 NPCs Defeated: <span style="color:#DDAA88;">${this._trackedKills}</span></div>
        <div>\u{1F4B0} Max Gold: <span style="color:${GOLD};">${this._maxGold}</span></div>
        <div>\u231B Time Survived: <span style="color:#DDAA88;">${mins}m ${secs.toString().padStart(2, "0")}s</span></div>
      `;
    }
    if (!state.gameOver) {
      this._gameOverShown = false;
    }
    this._gameOverOverlay.style.display = state.gameOver ? "flex" : "none";

    // Pause
    this._pauseOverlay.style.display = state.paused ? "flex" : "none";
    this._onResume = () => {
      state.paused = false;
    };
  }

  private _updateWanted(level: number, tick: number): void {
    if (level > 0) {
      this._wantedLabel.textContent = "WANTED";
      this._wantedLabel.style.opacity = level >= 4 ? `${0.7 + Math.sin(tick * 0.15) * 0.3}` : "1";
    } else {
      this._wantedLabel.textContent = "";
    }

    const highWanted = level >= 4;

    for (let i = 0; i < 5; i++) {
      const filled = i < level;
      const fillColor = filled ? "#CC2222" : "#444";
      const strokeColor = filled ? "#FF4444" : "#555";
      const emblem = filled ? `<path d="M7,3 L7,15 M4,7 L10,7" stroke="#FFCC00" stroke-width="1.5" opacity="0.8"/>` : "";
      // Golden glow behind filled shields
      const glow = filled ? `<defs><filter id="glow${i}"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` : "";
      const glowFilter = filled ? ` filter="url(#glow${i})"` : "";
      this._wantedShields[i].innerHTML = `<svg viewBox="0 0 20 26" width="28" height="34">
        ${glow}
        <path d="M0,0 L20,0 L20,16 L10,26 L0,16 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1"${glowFilter}/>
        ${emblem}
      </svg>`;
      // Animated fire/glow for wanted level 4-5
      if (highWanted && filled) {
        this._wantedShields[i].style.animation = "gta3d-wanted-fire 0.8s ease-in-out infinite";
      } else if (filled) {
        this._wantedShields[i].style.animation = "gta3d-shield-glow 2s ease-in-out infinite";
      } else {
        this._wantedShields[i].style.animation = "none";
      }
    }
  }

  private _updateLocation(state: GTA3DState, dt: number): void {
    const loc = this._getLocation(state);
    if (loc !== this._lastLocation) {
      this._lastLocation = loc;
      this._locationLabel.textContent = loc;
      this._locationTimer = 3.0;
    }

    if (this._locationTimer > 0) {
      this._locationTimer -= dt;
      if (this._locationTimer > 2.5) {
        this._locationLabel.style.opacity = `${1 - (this._locationTimer - 2.5) / 0.5}`;
      } else if (this._locationTimer < 0.5) {
        this._locationLabel.style.opacity = `${Math.max(0, this._locationTimer / 0.5)}`;
      } else {
        this._locationLabel.style.opacity = "1";
      }
    } else {
      this._locationLabel.style.opacity = "0";
    }
  }

  private _getLocation(state: GTA3DState): string {
    const px = state.player.pos.x;
    const pz = state.player.pos.z;
    const d = Math.sqrt(px * px + pz * pz);

    if (d > state.cityRadius) {
      if (pz < -state.cityRadius) return "Outside Camelot — Northern Forest";
      if (pz > state.cityRadius) return "Outside Camelot — Southern Farms";
      if (px < -state.cityRadius) return "Outside Camelot — Western Fields";
      if (px > state.cityRadius) return "Outside Camelot — Eastern Plains";
      return "Outside Camelot";
    }

    // Inside city — check zones
    if (px < -20 && pz < -20) return "CAMELOT — Castle Keep";
    if (px > -10 && px < 20 && pz < -15) return "CAMELOT — Barracks";
    if (px > 20 && pz < -10) return "CAMELOT — Church District";
    if (Math.abs(px) < 20 && Math.abs(pz) < 15) return "CAMELOT — Market Square";
    if (px > 20 && pz > -10 && pz < 15) return "CAMELOT — Tavern Quarter";
    if (px < -20 && pz > -10 && pz < 15) return "CAMELOT — Blacksmith Lane";
    if (px < -15 && pz > 15) return "CAMELOT — Prison District";
    if (px > 25 && pz > 15) return "CAMELOT — Stables";

    return "CAMELOT";
  }

  private _updateNotifications(state: GTA3DState): void {
    // Clear old DOM elements
    while (this._notifContainer.children.length > state.notifications.length) {
      this._notifContainer.removeChild(this._notifContainer.lastChild!);
    }

    // Ensure enough elements
    while (this._notifContainer.children.length < state.notifications.length) {
      const el = document.createElement("div");
      el.style.cssText = `padding:6px 18px;background:${PANEL_GRADIENT};border-radius:4px;font-size:12px;font-weight:bold;text-shadow:0 0 4px rgba(0,0,0,0.8);text-align:center;animation:gta3d-notif-slide 0.3s ease-out;border-left:3px solid ${GOLD};box-shadow:0 2px 8px rgba(0,0,0,0.4);font-family:${FONT_LABEL};`;
      this._notifContainer.appendChild(el);
    }

    for (let i = 0; i < state.notifications.length; i++) {
      const n = state.notifications[i];
      const el = this._notifContainer.children[i] as HTMLDivElement;
      const hexColor = `#${n.color.toString(16).padStart(6, "0")}`;

      // Determine icon and border color based on notification content/color
      let icon = "\u2739 "; // default star
      let borderColor = GOLD;
      const textLower = n.text.toLowerCase();
      if (textLower.includes("gold") || textLower.includes("loot") || textLower.includes("coin")) {
        icon = "\u{1F4B0} ";
        borderColor = "#DAA520";
      } else if (textLower.includes("damage") || textLower.includes("hit") || textLower.includes("attack")) {
        icon = "\u2694 ";
        borderColor = "#CC3333";
      } else if (textLower.includes("heal") || textLower.includes("health")) {
        icon = "\u2764 ";
        borderColor = "#44AA44";
      } else if (textLower.includes("wanted") || textLower.includes("guard")) {
        icon = "\u{1F6E1} ";
        borderColor = "#FF4444";
      } else if (textLower.includes("weapon") || textLower.includes("equip")) {
        icon = "\u2694 ";
        borderColor = "#8888FF";
      }

      el.textContent = icon + n.text;
      el.style.color = hexColor;
      el.style.borderLeftColor = borderColor;
      el.style.opacity = `${Math.min(1, n.timer)}`;
    }
  }

  private _updateMinimap(state: GTA3DState): void {
    const ctx = this._minimapCtx;
    const W = 180, H = 180;
    const ws = state.worldSize;
    const scale = W / ws;
    const ox = ws / 2; // offset to center
    const oz = ws / 2;

    ctx.clearRect(0, 0, W, H);

    // Background (grass)
    ctx.fillStyle = "#3a6b2f";
    ctx.fillRect(0, 0, W, H);

    // City circle
    const cx = (0 + ox) * scale;
    const cz = (0 + oz) * scale;
    const cr = state.cityRadius * scale;
    ctx.fillStyle = "#6a6a62";
    ctx.beginPath();
    ctx.arc(cx, cz, cr, 0, Math.PI * 2);
    ctx.fill();

    // City wall
    ctx.strokeStyle = "#554433";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cz, cr, 0, Math.PI * 2);
    ctx.stroke();

    // Roads
    ctx.strokeStyle = "#7a7060";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.moveTo(0, cz);
    ctx.lineTo(W, cz);
    ctx.stroke();

    // Buildings
    for (const b of state.buildings) {
      const bx = (b.pos.x + ox) * scale;
      const bz = (b.pos.z + oz) * scale;
      const bw = Math.max(2, b.size.x * scale);
      const bh = Math.max(2, b.size.z * scale);
      let color = "#555550";
      if (b.type === "castle") color = "#666660";
      else if (b.type === "church") color = "#777770";
      else if (b.type === "tavern") color = "#6a5a4a";
      else if (b.type === "stable") color = "#6a5a3a";
      else if (b.type.startsWith("house")) color = "#606058";
      ctx.fillStyle = color;
      ctx.fillRect(bx - bw / 2, bz - bh / 2, bw, bh);
    }

    // Horses
    ctx.fillStyle = "#8B4513";
    state.horses.forEach(horse => {
      const hx = (horse.pos.x + ox) * scale;
      const hz = (horse.pos.z + oz) * scale;
      ctx.beginPath();
      ctx.arc(hx, hz, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // NPCs
    state.npcs.forEach(npc => {
      if (npc.dead) return;
      const nx = (npc.pos.x + ox) * scale;
      const nz = (npc.pos.z + oz) * scale;
      let color = "#888";
      if (npc.type === "guard" || npc.type === "knight" || npc.type === "archer" || npc.type === "soldier") color = "#CC3333";
      else if (npc.type === "merchant" || npc.type === "tavern_keeper") color = "#DDA822";
      else if (npc.type === "criminal" || npc.type === "bandit" || npc.type === "assassin") color = "#884422";
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(nx, nz, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player — directional triangle/arrow instead of circle
    const px = (state.player.pos.x + ox) * scale;
    const pz = (state.player.pos.z + oz) * scale;
    const rot = state.player.rotation;
    const arrowSize = 5;

    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(rot);

    // Arrow pointing "forward" (up in local space = negative Z = toward screen north)
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "#FFFFFF";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(0, -arrowSize);       // tip
    ctx.lineTo(-arrowSize * 0.6, arrowSize * 0.5);  // bottom-left
    ctx.lineTo(0, arrowSize * 0.2);   // notch
    ctx.lineTo(arrowSize * 0.6, arrowSize * 0.5);   // bottom-right
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private _updateCompass(rotation: number): void {
    // rotation is Y-axis rotation in radians
    // We show a horizontal bar with cardinal directions based on where the player is facing
    const directions = [
      { label: "N", angle: 0 },
      { label: "NE", angle: Math.PI * 0.25 },
      { label: "E", angle: Math.PI * 0.5 },
      { label: "SE", angle: Math.PI * 0.75 },
      { label: "S", angle: Math.PI },
      { label: "SW", angle: Math.PI * 1.25 },
      { label: "W", angle: Math.PI * 1.5 },
      { label: "NW", angle: Math.PI * 1.75 },
    ];

    // Normalize rotation to [0, 2PI)
    let rot = rotation % (Math.PI * 2);
    if (rot < 0) rot += Math.PI * 2;

    let html = "";
    const barWidth = 240;

    for (const d of directions) {
      // Calculate angular difference
      let diff = d.angle - rot;
      // Wrap to [-PI, PI]
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      // Only show if within ~90 degrees of view
      const maxAngle = Math.PI * 0.5;
      if (Math.abs(diff) > maxAngle) continue;

      const xPos = (diff / maxAngle) * (barWidth / 2) + barWidth / 2;
      const isCardinal = d.label.length === 1;
      const color = isCardinal ? GOLD : "rgba(218,165,32,0.5)";
      const fontSize = isCardinal ? "12px" : "9px";
      const fontWeight = isCardinal ? "bold" : "normal";

      html += `<span style="position:absolute;left:${xPos}px;top:50%;transform:translate(-50%,-50%);color:${color};font-size:${fontSize};font-weight:${fontWeight};font-family:${FONT_LABEL};">${d.label}</span>`;
    }

    // Center tick mark
    html += `<div style="position:absolute;left:50%;top:0;transform:translateX(-50%);width:2px;height:6px;background:${GOLD};"></div>`;

    this._compassBar.innerHTML = html;
  }

  // ===================== CLEANUP =====================

  cleanup(): void {
    if (this._root && this._root.parentNode) {
      this._root.parentNode.removeChild(this._root);
    }
    if (this._styleEl && this._styleEl.parentNode) {
      this._styleEl.parentNode.removeChild(this._styleEl);
    }
    this._trackedKills = 0;
    this._maxGold = 0;
    this._gameOverShown = false;
  }
}
