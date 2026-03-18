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

  // Mission HUD
  private _missionPanel!: HTMLDivElement;
  private _missionTitle!: HTMLDivElement;
  private _missionProgress!: HTMLDivElement;
  private _missionDetailOverlay!: HTMLDivElement;
  private _missionDetailContent!: HTMLDivElement;
  private _missionCompleteNotif!: HTMLDivElement;
  private _missionCompleteTimer = 0;

  // Weather HUD
  private _weatherIndicator!: HTMLDivElement;

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
      @keyframes gta3d-bar-shine {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
      @keyframes gta3d-compass-pulse {
        0%, 100% { border-color: rgba(218,165,32,0.4); }
        50% { border-color: rgba(218,165,32,0.7); }
      }
      @keyframes gta3d-panel-breathe {
        0%, 100% { border-color: rgba(218,165,32,0.7); }
        50% { border-color: rgba(218,165,32,1.0); }
      }
      @keyframes gta3d-gold-shimmer {
        0%, 100% { filter: brightness(1) drop-shadow(0 0 3px rgba(218,165,32,0.2)); }
        50% { filter: brightness(1.15) drop-shadow(0 0 6px rgba(218,165,32,0.5)); }
      }
      .gta3d-bar-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 40%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
        animation: gta3d-bar-shine 2.5s ease-in-out infinite;
        pointer-events: none;
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
    this._buildMissionHUD();
    this._buildWeatherIndicator();
    this._buildGameOver();
    this._buildPauseMenu();
  }

  // ===================== BUILD =====================

  private _buildStatusPanel(): void {
    const panel = document.createElement("div");
    // panel is used locally below
    const dotSvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="6" cy="6" r="0.5" fill="rgba(218,165,32,0.08)"/></svg>')}`;
    panel.style.cssText = `position:absolute;top:12px;left:12px;width:230px;padding:0;background:${PANEL_GRADIENT};border:1.5px solid ${GOLD};border-radius:6px;box-shadow:inset 0 0 20px rgba(218,165,32,0.06), 0 4px 16px rgba(0,0,0,0.5);overflow:hidden;background-image:url("${dotSvg}");background-repeat:repeat;animation:gta3d-panel-breathe 4s ease-in-out infinite;`;
    this._root.appendChild(panel);

    // Decorative gold top border
    const topBorder = document.createElement("div");
    topBorder.style.cssText = `height:3px;background:linear-gradient(90deg, transparent 0%, ${GOLD} 15%, #FFD700 50%, ${GOLD} 85%, transparent 100%);margin-bottom:2px;`;
    panel.appendChild(topBorder);

    // Ornamental pattern strip
    const ornament = document.createElement("div");
    ornament.style.cssText = `text-align:center;font-size:8px;color:${GOLD};opacity:0.5;letter-spacing:4px;line-height:10px;margin-bottom:2px;`;
    ornament.textContent = "\u25C6 \u25C7 \u25C6 \u25C7 \u25C6";
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
    this._goldText.style.cssText = `margin-left:8px;color:${GOLD};font-weight:bold;font-size:14px;font-family:${FONT_MONO};text-shadow:0 0 6px rgba(218,165,32,0.3);animation:gta3d-gold-shimmer 3s ease-in-out infinite;`;
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
    hint.textContent = "1-7 weapons | E interact | F steal | J missions";
    inner.appendChild(hint);

    // Decorative gold bottom border
    const bottomBorder = document.createElement("div");
    bottomBorder.style.cssText = `height:3px;background:linear-gradient(90deg, transparent 0%, ${GOLD} 15%, #FFD700 50%, ${GOLD} 85%, transparent 100%);margin-top:2px;`;
    panel.appendChild(bottomBorder);
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
    fill.className = "gta3d-bar-fill";
    fill.style.cssText = `height:100%;width:100%;background:${fillGradient};border-radius:3px;transition:width 0.1s;position:relative;overflow:hidden;`;
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

    // Decorative top border
    const wantedTopBorder = document.createElement("div");
    wantedTopBorder.style.cssText = `height:2px;background:linear-gradient(90deg, transparent 0%, ${GOLD} 20%, #FFD700 50%, ${GOLD} 80%, transparent 100%);margin-bottom:4px;`;
    this._wantedPanel.appendChild(wantedTopBorder);

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
      shield.innerHTML = `<svg viewBox="0 0 20 26" width="28" height="34">
        <path d="M0,0 L20,0 L20,16 L10,26 L0,16 Z" fill="#444" stroke="#555" stroke-width="1"/>
        <path d="M1.5,1.5 L18.5,1.5 L18.5,15.2 L10,24 L1.5,15.2 Z" fill="none" stroke="#666" stroke-width="0.5" opacity="0.5"/>
        <line x1="10" y1="4" x2="10" y2="20" stroke="#555" stroke-width="0.8" opacity="0.4"/>
        <line x1="4" y1="10" x2="16" y2="10" stroke="#555" stroke-width="0.8" opacity="0.4"/>
        <circle cx="10" cy="1.5" r="1.2" fill="#555" opacity="0.6"/>
      </svg>`;
      this._wantedShields.push(shield);
      shieldRow.appendChild(shield);
    }

    // Decorative bottom border
    const wantedBottomBorder = document.createElement("div");
    wantedBottomBorder.style.cssText = `height:2px;background:linear-gradient(90deg, transparent 0%, ${GOLD} 20%, #FFD700 50%, ${GOLD} 80%, transparent 100%);margin-top:6px;`;
    this._wantedPanel.appendChild(wantedBottomBorder);
  }

  private _buildLocationLabel(): void {
    this._locationLabel = document.createElement("div");
    this._locationLabel.style.cssText = `position:absolute;top:14px;left:50%;transform:translateX(-50%);font-size:14px;font-weight:bold;color:${GOLD};letter-spacing:3px;text-shadow:0 0 6px rgba(0,0,0,0.8);opacity:0;transition:opacity 0.3s;`;
    this._root.appendChild(this._locationLabel);
  }

  private _buildCompass(): void {
    // Wrapper for compass + indicator
    const compassWrapper = document.createElement("div");
    compassWrapper.style.cssText = "position:absolute;top:12px;left:50%;transform:translateX(-50%);width:240px;display:flex;flex-direction:column;align-items:center;";
    this._root.appendChild(compassWrapper);

    this._compassBar = document.createElement("div");
    this._compassBar.style.cssText = `width:240px;height:28px;background:rgba(15,12,30,0.75);border:1px solid rgba(218,165,32,0.4);border-radius:4px;overflow:hidden;font-family:${FONT_LABEL};font-size:11px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4), 0 0 6px rgba(218,165,32,0.15);animation:gta3d-compass-pulse 4s ease-in-out infinite;position:relative;`;
    compassWrapper.appendChild(this._compassBar);

    // Small triangle indicator pointing down below compass center
    const indicator = document.createElement("div");
    indicator.style.cssText = `width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${GOLD};opacity:0.7;margin-top:1px;`;
    compassWrapper.appendChild(indicator);
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

    // Decorative divider between title and map
    const mapDivider = document.createElement("div");
    mapDivider.style.cssText = `height:1px;background:linear-gradient(90deg, transparent 0%, ${GOLD} 20%, #FFD700 50%, ${GOLD} 80%, transparent 100%);margin:2px 4px 4px 4px;opacity:0.6;`;
    wrapper.appendChild(mapDivider);

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
    this._minimapCanvas.style.cssText = "display:block;border:1px solid rgba(218,165,32,0.3);border-radius:3px;outline:1px solid rgba(218,165,32,0.15);outline-offset:2px;box-shadow:inset 0 0 20px rgba(0,0,0,0.5);";
    mapContainer.appendChild(this._minimapCanvas);
    this._minimapCtx = this._minimapCanvas.getContext("2d")!;

    // Corner ornaments (L-shaped gold brackets)
    const bracketSize = 14;
    const bracketThickness = 2;
    const bracketColor = GOLD;
    const corners = [
      { top: "6px", left: "6px", borderTop: `${bracketThickness}px solid ${bracketColor}`, borderLeft: `${bracketThickness}px solid ${bracketColor}` },
      { top: "6px", right: "6px", borderTop: `${bracketThickness}px solid ${bracketColor}`, borderRight: `${bracketThickness}px solid ${bracketColor}` },
      { bottom: "6px", left: "6px", borderBottom: `${bracketThickness}px solid ${bracketColor}`, borderLeft: `${bracketThickness}px solid ${bracketColor}` },
      { bottom: "6px", right: "6px", borderBottom: `${bracketThickness}px solid ${bracketColor}`, borderRight: `${bracketThickness}px solid ${bracketColor}` },
    ];
    for (const c of corners) {
      const bracket = document.createElement("div");
      let css = `position:absolute;width:${bracketSize}px;height:${bracketSize}px;pointer-events:none;opacity:0.7;`;
      if (c.top) css += `top:${c.top};`;
      if (c.bottom) css += `bottom:${c.bottom};`;
      if (c.left) css += `left:${c.left};`;
      if (c.right) css += `right:${c.right};`;
      if (c.borderTop) css += `border-top:${c.borderTop};`;
      if (c.borderBottom) css += `border-bottom:${c.borderBottom};`;
      if (c.borderLeft) css += `border-left:${c.borderLeft};`;
      if (c.borderRight) css += `border-right:${c.borderRight};`;
      bracket.style.cssText = css;
      mapContainer.appendChild(bracket);
    }
  }

  private _buildCrosshair(): void {
    this._crosshair = document.createElement("div");
    this._crosshair.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:32px;height:32px;pointer-events:none;filter:drop-shadow(0 0 3px rgba(255,255,255,0.15));";
    this._crosshair.innerHTML = `<svg viewBox="0 0 32 32" width="32" height="32">
      <!-- Outer cross lines -->
      <line x1="16" y1="4" x2="16" y2="12" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
      <line x1="16" y1="20" x2="16" y2="28" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
      <line x1="4" y1="16" x2="12" y2="16" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
      <line x1="20" y1="16" x2="28" y2="16" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
      <!-- Outer circle -->
      <circle cx="16" cy="16" r="10" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="0.8"/>
      <!-- Inner circle -->
      <circle cx="16" cy="16" r="4" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="0.8"/>
      <!-- Tick marks at 12/3/6/9 -->
      <line x1="16" y1="2" x2="16" y2="4" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
      <line x1="16" y1="28" x2="16" y2="30" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
      <line x1="2" y1="16" x2="4" y2="16" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
      <line x1="28" y1="16" x2="30" y2="16" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
      <!-- Center dot -->
      <circle cx="16" cy="16" r="1" fill="rgba(255,255,255,0.6)"/>
    </svg>`;
    this._root.appendChild(this._crosshair);
  }

  private _buildDamageFlash(): void {
    this._damageFlash = document.createElement("div");
    this._damageFlash.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(200,0,0,0);pointer-events:none;transition:background 0.1s;";
    this._root.appendChild(this._damageFlash);
  }

  private _buildMissionHUD(): void {
    // Active mission panel (bottom-left, above minimap area)
    this._missionPanel = document.createElement("div");
    this._missionPanel.style.cssText = `position:absolute;bottom:12px;left:12px;width:260px;padding:10px 14px;background:${PANEL_GRADIENT};border:1px solid rgba(68,170,255,0.4);border-radius:5px;box-shadow:0 4px 12px rgba(0,0,0,0.4);display:none;`;
    this._root.appendChild(this._missionPanel);

    const missionHeader = document.createElement("div");
    missionHeader.style.cssText = `font-size:9px;color:rgba(68,170,255,0.7);letter-spacing:2px;font-family:${FONT_LABEL};margin-bottom:4px;`;
    missionHeader.textContent = "ACTIVE MISSION";
    this._missionPanel.appendChild(missionHeader);

    this._missionTitle = document.createElement("div");
    this._missionTitle.style.cssText = `font-size:13px;font-weight:bold;color:#44aaff;font-family:${FONT_LABEL};margin-bottom:4px;`;
    this._missionPanel.appendChild(this._missionTitle);

    this._missionProgress = document.createElement("div");
    this._missionProgress.style.cssText = `font-size:11px;color:#88bbdd;font-family:${FONT_MONO};`;
    this._missionPanel.appendChild(this._missionProgress);

    const missionHint = document.createElement("div");
    missionHint.style.cssText = `font-size:8px;color:#555;font-family:${FONT_MONO};margin-top:4px;`;
    missionHint.textContent = "J - mission details";
    this._missionPanel.appendChild(missionHint);

    // Mission detail overlay (toggled with J)
    this._missionDetailOverlay = document.createElement("div");
    this._missionDetailOverlay.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;max-height:500px;padding:20px;background:${PANEL_GRADIENT};border:2px solid rgba(68,170,255,0.5);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.6);display:none;pointer-events:auto;overflow-y:auto;`;
    this._root.appendChild(this._missionDetailOverlay);

    const detailHeader = document.createElement("div");
    detailHeader.style.cssText = `font-size:20px;font-weight:bold;color:#44aaff;font-family:${FONT_LABEL};letter-spacing:3px;text-align:center;margin-bottom:12px;`;
    detailHeader.textContent = "MISSIONS";
    this._missionDetailOverlay.appendChild(detailHeader);

    const detailDivider = document.createElement("div");
    detailDivider.style.cssText = "width:100%;height:1px;background:linear-gradient(90deg, transparent, rgba(68,170,255,0.4), transparent);margin-bottom:12px;";
    this._missionDetailOverlay.appendChild(detailDivider);

    this._missionDetailContent = document.createElement("div");
    this._missionDetailOverlay.appendChild(this._missionDetailContent);

    const closeHint = document.createElement("div");
    closeHint.style.cssText = `text-align:center;font-size:10px;color:#555;font-family:${FONT_MONO};margin-top:12px;`;
    closeHint.textContent = "Press J to close";
    this._missionDetailOverlay.appendChild(closeHint);

    // Mission completion notification (center screen, fades)
    this._missionCompleteNotif = document.createElement("div");
    this._missionCompleteNotif.style.cssText = `position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);font-size:28px;font-weight:bold;color:#44ff44;font-family:${FONT_LABEL};letter-spacing:4px;text-shadow:0 0 20px rgba(68,255,68,0.5);opacity:0;pointer-events:none;transition:opacity 0.3s;`;
    this._root.appendChild(this._missionCompleteNotif);
  }

  private _buildWeatherIndicator(): void {
    this._weatherIndicator = document.createElement("div");
    this._weatherIndicator.style.cssText = `position:absolute;top:85px;right:12px;padding:5px 10px;background:${PANEL_GRADIENT};border:1px solid rgba(136,170,204,0.3);border-radius:4px;font-size:11px;color:#88aacc;font-family:${FONT_LABEL};box-shadow:0 2px 8px rgba(0,0,0,0.3);`;
    this._weatherIndicator.textContent = "Clear";
    this._root.appendChild(this._weatherIndicator);
  }

  private _buildGameOver(): void {
    this._gameOverOverlay = document.createElement("div");
    this._gameOverOverlay.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(15,0,0,0.8);display:none;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;`;

    // Animated blood drip at top
    const bloodDrip = document.createElement("div");
    bloodDrip.style.cssText = "position:absolute;top:0;left:0;width:100%;height:60px;background:linear-gradient(180deg, rgba(120,0,0,0.6) 0%, rgba(80,0,0,0.3) 30%, transparent 100%);pointer-events:none;";
    this._gameOverOverlay.appendChild(bloodDrip);

    const content = document.createElement("div");
    content.style.cssText = "display:flex;flex-direction:column;align-items:center;animation:gta3d-gameover-fadein 1.2s ease-out;position:relative;padding:40px 60px;border:2px solid rgba(136,0,0,0.5);border-radius:8px;background:rgba(10,0,0,0.4);";

    // Corner ornaments on the frame
    const frameCorners = [
      { top: "-4px", left: "-4px" },
      { top: "-4px", right: "-4px" },
      { bottom: "-4px", left: "-4px" },
      { bottom: "-4px", right: "-4px" },
    ];
    for (const fc of frameCorners) {
      const corner = document.createElement("div");
      let css = "position:absolute;width:16px;height:16px;pointer-events:none;";
      if (fc.top) css += `top:${fc.top};`;
      if (fc.bottom) css += `bottom:${fc.bottom};`;
      if (fc.left) css += `left:${fc.left};border-top:2px solid #880000;border-left:2px solid #880000;`;
      if (fc.right) css += `right:${fc.right};border-top:2px solid #880000;border-right:2px solid #880000;`;
      if (fc.bottom && fc.left) css = css.replace("border-top:2px solid #880000;border-left:2px solid #880000;", "border-bottom:2px solid #880000;border-left:2px solid #880000;");
      if (fc.bottom && fc.right) css = css.replace("border-top:2px solid #880000;border-right:2px solid #880000;", "border-bottom:2px solid #880000;border-right:2px solid #880000;");
      corner.style.cssText = css;
      content.appendChild(corner);
    }

    // Skull / crossed swords decoration — more elaborate
    const decoration = document.createElement("div");
    decoration.style.cssText = "font-size:40px;color:#880000;opacity:0.7;margin-bottom:8px;text-shadow:0 0 10px #440000, 0 0 20px #330000;";
    decoration.innerHTML = `<span style="font-size:24px;vertical-align:middle;margin-right:4px;">\u2694</span> \u2620 <span style="font-size:24px;vertical-align:middle;margin-left:4px;">\u2694</span>`;
    content.appendChild(decoration);

    // Ornamental divider above title
    const dividerTop = document.createElement("div");
    dividerTop.style.cssText = "width:260px;height:1px;background:linear-gradient(90deg, transparent, #880000, #CC3333, #880000, transparent);margin-bottom:12px;";
    content.appendChild(dividerTop);

    const title = document.createElement("div");
    title.style.cssText = `font-size:56px;font-weight:bold;color:#880000;letter-spacing:10px;text-shadow:0 0 30px #440000, 0 0 60px #220000;font-family:${FONT_LABEL};`;
    title.textContent = "YOU DIED";
    content.appendChild(title);

    // Ornamental divider below title
    const divider = document.createElement("div");
    divider.style.cssText = "width:260px;height:1px;background:linear-gradient(90deg, transparent, #880000, #CC3333, #880000, transparent);margin:16px 0;";
    content.appendChild(divider);

    // Stats container
    this._gameOverStats = document.createElement("div");
    this._gameOverStats.style.cssText = `font-size:13px;color:#AA7777;font-family:${FONT_LABEL};text-align:center;line-height:1.8;margin-top:4px;`;
    this._gameOverStats.innerHTML = "";
    content.appendChild(this._gameOverStats);

    // Ornamental divider above restart
    const dividerBottom = document.createElement("div");
    dividerBottom.style.cssText = "width:180px;height:1px;background:linear-gradient(90deg, transparent, #660000, #880000, #660000, transparent);margin:16px 0 8px 0;";
    content.appendChild(dividerBottom);

    const restart = document.createElement("div");
    restart.style.cssText = `font-size:16px;color:#996666;margin-top:8px;font-family:${FONT_LABEL};letter-spacing:2px;animation:gta3d-pulse-text 2s ease-in-out infinite;`;
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
        <tr><td style="color:#CCBB88;font-weight:bold;">J</td><td>Mission journal</td></tr>
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

  update(state: GTA3DState, dt: number, showMissionInfo = false): void {
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

    // Mission HUD
    this._updateMissionHUD(state, dt, showMissionInfo);

    // Weather indicator
    this._updateWeatherHUD(state);

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
      // Red inner glow when wanted
      const glowIntensity = Math.min(level * 4, 20);
      this._wantedPanel.style.boxShadow = `inset 0 0 ${glowIntensity}px rgba(255,30,30,${0.1 + level * 0.06}), 0 4px 12px rgba(0,0,0,0.4)`;
    } else {
      this._wantedLabel.textContent = "";
      this._wantedPanel.style.boxShadow = "inset 0 0 15px rgba(218,165,32,0.05), 0 4px 12px rgba(0,0,0,0.4)";
    }

    const highWanted = level >= 4;

    for (let i = 0; i < 5; i++) {
      const filled = i < level;
      const fillColor = filled ? "#CC2222" : "#444";
      const strokeColor = filled ? "#FF4444" : "#555";
      const rimColor = filled ? "#FF6666" : "#666";
      const crossColor = filled ? "#FFCC00" : "#555";
      const crossOpacity = filled ? "0.8" : "0.4";
      const studColor = filled ? "#FFDD44" : "#555";
      // Golden glow behind filled shields
      const glow = filled ? `<defs><filter id="glow${i}"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` : "";
      const glowFilter = filled ? ` filter="url(#glow${i})"` : "";
      this._wantedShields[i].innerHTML = `<svg viewBox="0 0 20 26" width="28" height="34">
        ${glow}
        <path d="M0,0 L20,0 L20,16 L10,26 L0,16 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1"${glowFilter}/>
        <path d="M1.5,1.5 L18.5,1.5 L18.5,15.2 L10,24 L1.5,15.2 Z" fill="none" stroke="${rimColor}" stroke-width="0.5" opacity="0.5"/>
        <line x1="10" y1="4" x2="10" y2="20" stroke="${crossColor}" stroke-width="1.2" opacity="${crossOpacity}"/>
        <line x1="4" y1="10" x2="16" y2="10" stroke="${crossColor}" stroke-width="1.2" opacity="${crossOpacity}"/>
        <circle cx="10" cy="1.5" r="1.2" fill="${studColor}" opacity="0.7"/>
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

    // Mission markers on minimap
    for (const mission of state.missions) {
      if (mission.state === 'available' && !state.completedMissionIds.has(mission.id)) {
        // Show mission giver as yellow "!" marker
        const mx = (mission.giverLocation.x + ox) * scale;
        const mz = (mission.giverLocation.z + oz) * scale;
        ctx.fillStyle = '#ffdd44';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', mx, mz);
      } else if (mission.state === 'active') {
        // Show target location for deliver/survive missions
        if (mission.targetLocation) {
          const tx = (mission.targetLocation.x + ox) * scale;
          const tz = (mission.targetLocation.z + oz) * scale;
          ctx.strokeStyle = '#44aaff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(tx, tz, (mission.deliverRadius ?? 5) * scale, 0, Math.PI * 2);
          ctx.stroke();
          // Target marker
          ctx.fillStyle = '#44aaff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\u2716', tx, tz);
        }
      }
    }

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

  private _updateMissionHUD(state: GTA3DState, dt: number, showMissionInfo: boolean): void {
    const m = state.activeMission;

    // Active mission panel
    if (m && m.state === 'active') {
      this._missionPanel.style.display = 'block';
      this._missionTitle.textContent = m.title;

      let progressText = '';
      switch (m.type) {
        case 'eliminate':
          progressText = `Defeated: ${m.currentCount ?? 0}/${m.targetCount ?? 0}`;
          break;
        case 'collect':
          progressText = `Collected: ${m.currentCount ?? 0}/${m.targetCount ?? 0} gold`;
          break;
        case 'deliver':
          progressText = 'Deliver to target location';
          break;
        case 'survive': {
          const remaining = Math.max(0, (m.surviveTime ?? 60) - (m.surviveTimer ?? 0));
          progressText = `Survive: ${Math.ceil(remaining)}s remaining`;
          break;
        }
      }
      if (m.timeLimit !== undefined) {
        const timeLeft = Math.max(0, m.timeLimit - (m.timeLimitTimer ?? 0));
        progressText += ` | Time: ${Math.ceil(timeLeft)}s`;
      }
      this._missionProgress.textContent = progressText;
    } else {
      this._missionPanel.style.display = 'none';
    }

    // Mission detail overlay
    this._missionDetailOverlay.style.display = showMissionInfo ? 'block' : 'none';
    if (showMissionInfo) {
      let html = '';
      for (const mission of state.missions) {
        if (state.completedMissionIds.has(mission.id)) {
          html += `<div style="margin-bottom:10px;padding:8px;background:rgba(68,255,68,0.05);border:1px solid rgba(68,255,68,0.2);border-radius:4px;">`;
          html += `<div style="font-size:12px;font-weight:bold;color:#44ff44;font-family:${FONT_LABEL};">&#10003; ${mission.title}</div>`;
          html += `<div style="font-size:10px;color:#558855;margin-top:2px;">Completed</div>`;
          html += `</div>`;
        } else if (mission.state === 'active') {
          html += `<div style="margin-bottom:10px;padding:8px;background:rgba(68,170,255,0.08);border:1px solid rgba(68,170,255,0.3);border-radius:4px;">`;
          html += `<div style="font-size:12px;font-weight:bold;color:#44aaff;font-family:${FONT_LABEL};">&#9654; ${mission.title}</div>`;
          html += `<div style="font-size:10px;color:#88bbdd;margin-top:2px;">${mission.description}</div>`;
          html += `<div style="font-size:10px;color:#aa8822;margin-top:4px;">Reward: ${mission.reward.gold} gold${mission.reward.hp ? ` + ${mission.reward.hp} HP` : ''}</div>`;
          html += `</div>`;
        } else if (mission.state === 'failed') {
          html += `<div style="margin-bottom:10px;padding:8px;background:rgba(255,68,68,0.05);border:1px solid rgba(255,68,68,0.2);border-radius:4px;">`;
          html += `<div style="font-size:12px;font-weight:bold;color:#ff4444;font-family:${FONT_LABEL};">&#10007; ${mission.title}</div>`;
          html += `<div style="font-size:10px;color:#885555;margin-top:2px;">Failed</div>`;
          html += `</div>`;
        } else {
          html += `<div style="margin-bottom:10px;padding:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:4px;">`;
          html += `<div style="font-size:12px;font-weight:bold;color:#aaaaaa;font-family:${FONT_LABEL};">! ${mission.title}</div>`;
          html += `<div style="font-size:10px;color:#666;margin-top:2px;">${mission.giverName}</div>`;
          html += `<div style="font-size:10px;color:#aa8822;margin-top:4px;">Reward: ${mission.reward.gold} gold${mission.reward.hp ? ` + ${mission.reward.hp} HP` : ''}</div>`;
          html += `</div>`;
        }
      }
      this._missionDetailContent.innerHTML = html;
    }

    // Mission completion notification
    if (this._missionCompleteTimer > 0) {
      this._missionCompleteTimer -= dt;
      this._missionCompleteNotif.style.opacity = `${Math.min(1, this._missionCompleteTimer / 0.5)}`;
      if (this._missionCompleteTimer <= 0) {
        this._missionCompleteNotif.style.opacity = '0';
      }
    }

    // Check for newly completed missions to trigger big notification
    for (const mission of state.missions) {
      if (mission.state === 'completed' && state.completedMissionIds.has(mission.id)) {
        // Only show once — use a data attribute to track
        const key = `shown_${mission.id}`;
        if (!(this._missionCompleteNotif as any)[key]) {
          (this._missionCompleteNotif as any)[key] = true;
          this._missionCompleteNotif.textContent = `MISSION COMPLETE: ${mission.title}`;
          this._missionCompleteTimer = 3.0;
          this._missionCompleteNotif.style.opacity = '1';
        }
      }
    }
  }

  private _updateWeatherHUD(state: GTA3DState): void {
    const weatherIcons: Record<string, string> = {
      clear: '\u2600', rain: '\u{1F327}', fog: '\u{1F32B}', storm: '\u26A1',
    };
    const weatherNames: Record<string, string> = {
      clear: 'Clear', rain: 'Rain', fog: 'Fog', storm: 'Storm',
    };
    const weatherColors: Record<string, string> = {
      clear: '#ffdd44', rain: '#6688cc', fog: '#aaaaaa', storm: '#ff8844',
    };
    const icon = weatherIcons[state.weather] ?? '';
    const name = weatherNames[state.weather] ?? state.weather;
    const color = weatherColors[state.weather] ?? '#88aacc';

    this._weatherIndicator.innerHTML = `<span style="margin-right:4px;">${icon}</span><span style="color:${color};">${name}</span>`;

    // Fade border color to match weather
    this._weatherIndicator.style.borderColor = `rgba(${this._hexToRgb(color)},0.4)`;
  }

  private _hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
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

    // Tick marks along the compass at regular intervals
    for (let tickAngle = 0; tickAngle < Math.PI * 2; tickAngle += Math.PI / 8) {
      let tickDiff = tickAngle - rot;
      while (tickDiff > Math.PI) tickDiff -= Math.PI * 2;
      while (tickDiff < -Math.PI) tickDiff += Math.PI * 2;
      const maxAngleT = Math.PI * 0.5;
      if (Math.abs(tickDiff) > maxAngleT) continue;
      const tickXPos = (tickDiff / maxAngleT) * (barWidth / 2) + barWidth / 2;
      html += `<div style="position:absolute;left:${tickXPos}px;bottom:0;transform:translateX(-50%);width:1px;height:4px;background:rgba(218,165,32,0.25);pointer-events:none;"></div>`;
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
