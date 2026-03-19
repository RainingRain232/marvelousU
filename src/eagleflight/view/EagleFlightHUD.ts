// ---------------------------------------------------------------------------
// Eagle Flight — HTML overlay HUD (polished)
// Minimap, artificial horizon, animated gauges, compass tape,
// landmark labels, vignette, pitch ladder
// ---------------------------------------------------------------------------

import type { EagleFlightState } from "../state/EagleFlightState";
import { EFBalance } from "../state/EagleFlightState";

// Landmarks for label display
const LANDMARKS = [
  { x: 0, z: 30, label: "Camelot Castle", icon: "castle" },
  { x: 35, z: -30, label: "Cathedral", icon: "church" },
  { x: -30, z: -35, label: "Market Square", icon: "market" },
  { x: 45, z: 10, label: "The Prancing Pony", icon: "tavern" },
  { x: -45, z: 5, label: "Blacksmith", icon: "anvil" },
  { x: 140, z: -60, label: "Windmill", icon: "mill" },
  { x: -120, z: 90, label: "Windmill", icon: "mill" },
  { x: 0, z: 0, label: "City Center", icon: "flag" },
  { x: 450, z: -350, label: "Wizard Tower", icon: "tower" },
  { x: -400, z: 300, label: "Distant Village", icon: "village" },
  { x: 150, z: 40, label: "Eastern Village", icon: "village" },
  { x: -130, z: -60, label: "Western Village", icon: "village" },
];

export class EagleFlightHUD {
  private _root!: HTMLDivElement;

  // Gauges
  private _speedEl!: HTMLDivElement;
  private _speedBarFill!: HTMLDivElement;
  private _altEl!: HTMLDivElement;
  private _altBarFill!: HTMLDivElement;
  private _compassStrip!: HTMLDivElement;
  private _compassFrame!: HTMLDivElement;

  // Artificial horizon
  private _horizonCanvas!: HTMLCanvasElement;
  private _horizonCtx!: CanvasRenderingContext2D;

  // Minimap
  private _minimapCanvas!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;

  // Landmark label
  private _landmarkEl!: HTMLDivElement;
  private _landmarkTimer = 0;
  private _lastLandmark = "";

  // Vignette
  private _vignetteEl!: HTMLDivElement;

  // G-force indicator
  private _gForceEl!: HTMLDivElement;
  private _prevSpeed = 0;

  // Pause overlay
  private _pauseOverlay!: HTMLDivElement;
  private _resumeCb: (() => void) | null = null;
  private _quitCb: (() => void) | null = null;

  // Controls hint
  private _controlsEl!: HTMLDivElement;
  private _controlsTimer = 8;

  // Speed line effects
  private _speedLinesEl!: HTMLDivElement;

  // Boost indicator
  private _boostEl!: HTMLDivElement;
  private _boostBarFill!: HTMLDivElement;

  // Altitude warning
  private _altWarningEl!: HTMLDivElement;

  // Crosshair
  private _crosshairEl!: HTMLDivElement;

  // New HUD elements
  private _weatherEl!: HTMLDivElement;
  private _deliveryEl!: HTMLDivElement;
  private _raceEl!: HTMLDivElement;
  private _achievementEl!: HTMLDivElement;
  private _landmarkCountEl!: HTMLDivElement;
  private _stallWarningEl!: HTMLDivElement;
  private _rainOverlay!: HTMLDivElement;

  // Flight stats
  private _statsEl!: HTMLDivElement;

  // Intro overlay
  private _introOverlay!: HTMLDivElement;
  private _introText!: HTMLDivElement;

  // Thermal indicator
  private _thermalEl!: HTMLDivElement;

  // Checkpoint counter
  private _checkpointEl!: HTMLDivElement;

  // Notification popup
  private _notifEl!: HTMLDivElement;

  // Trick score
  private _trickScoreEl!: HTMLDivElement;

  // Mount indicator
  private _mountEl!: HTMLDivElement;

  build(sw: number, sh: number): void {
    this._root = document.createElement("div");
    this._root.style.cssText = `
      position:absolute;top:0;left:0;width:${sw}px;height:${sh}px;
      pointer-events:none;z-index:10;font-family:'Segoe UI',Arial,sans-serif;
      user-select:none;overflow:hidden;
    `;
    document.body.appendChild(this._root);

    // --- Vignette overlay ---
    this._vignetteEl = document.createElement("div");
    this._vignetteEl.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      background:radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.35) 100%);
      pointer-events:none;
    `;
    this._root.appendChild(this._vignetteEl);

    // --- Speed lines (for boost) ---
    this._speedLinesEl = document.createElement("div");
    this._speedLinesEl.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      pointer-events:none;opacity:0;transition:opacity 0.3s;
      background:repeating-linear-gradient(
        90deg,
        transparent 0px, transparent 48%, rgba(255,255,255,0.03) 49%, transparent 50%
      );
    `;
    this._root.appendChild(this._speedLinesEl);

    // --- Speed gauge panel (bottom-left) ---
    const speedPanel = document.createElement("div");
    speedPanel.style.cssText = `
      position:absolute;bottom:20px;left:20px;width:160px;
      background:rgba(0,0,0,0.35);border-radius:10px;padding:12px 14px;
      border:1px solid rgba(255,255,255,0.1);
      backdrop-filter:blur(4px);
    `;
    this._root.appendChild(speedPanel);

    const speedLabel = document.createElement("div");
    speedLabel.style.cssText = `color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:2px;margin-bottom:4px;`;
    speedLabel.textContent = "SPEED";
    speedPanel.appendChild(speedLabel);

    this._speedEl = document.createElement("div");
    this._speedEl.style.cssText = `color:#fff;font-size:28px;font-weight:bold;line-height:1;margin-bottom:6px;`;
    speedPanel.appendChild(this._speedEl);

    const speedBarOuter = document.createElement("div");
    speedBarOuter.style.cssText = `width:100%;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;overflow:hidden;`;
    speedPanel.appendChild(speedBarOuter);

    this._speedBarFill = document.createElement("div");
    this._speedBarFill.style.cssText = `height:100%;width:50%;background:linear-gradient(90deg,#44aaff,#88ddff);border-radius:2px;transition:width 0.15s;`;
    speedBarOuter.appendChild(this._speedBarFill);

    // --- Altitude gauge panel (bottom-left, above speed) ---
    const altPanel = document.createElement("div");
    altPanel.style.cssText = `
      position:absolute;bottom:110px;left:20px;width:160px;
      background:rgba(0,0,0,0.35);border-radius:10px;padding:12px 14px;
      border:1px solid rgba(255,255,255,0.1);
      backdrop-filter:blur(4px);
    `;
    this._root.appendChild(altPanel);

    const altLabel = document.createElement("div");
    altLabel.style.cssText = `color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:2px;margin-bottom:4px;`;
    altLabel.textContent = "ALTITUDE";
    altPanel.appendChild(altLabel);

    this._altEl = document.createElement("div");
    this._altEl.style.cssText = `color:#aaddff;font-size:28px;font-weight:bold;line-height:1;margin-bottom:6px;`;
    altPanel.appendChild(this._altEl);

    const altBarOuter = document.createElement("div");
    altBarOuter.style.cssText = `width:100%;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;overflow:hidden;`;
    altPanel.appendChild(altBarOuter);

    this._altBarFill = document.createElement("div");
    this._altBarFill.style.cssText = `height:100%;width:30%;background:linear-gradient(90deg,#44ff88,#88ffcc);border-radius:2px;transition:width 0.15s;`;
    altBarOuter.appendChild(this._altBarFill);

    // --- G-force indicator (bottom-left, small) ---
    this._gForceEl = document.createElement("div");
    this._gForceEl.style.cssText = `
      position:absolute;bottom:200px;left:20px;
      color:rgba(255,255,255,0.4);font-size:12px;letter-spacing:1px;
    `;
    this._root.appendChild(this._gForceEl);

    // --- Compass tape (top-center) ---
    this._compassFrame = document.createElement("div");
    this._compassFrame.style.cssText = `
      position:absolute;top:16px;left:50%;transform:translateX(-50%);
      width:280px;height:40px;overflow:hidden;
      background:rgba(0,0,0,0.3);border-radius:8px;
      border:1px solid rgba(255,255,255,0.12);
      backdrop-filter:blur(4px);
    `;
    this._root.appendChild(this._compassFrame);

    this._compassStrip = document.createElement("div");
    this._compassStrip.style.cssText = `
      position:absolute;top:0;left:0;height:100%;white-space:nowrap;
      color:#fff;font-size:14px;font-weight:bold;line-height:40px;
      transition:transform 0.08s linear;
    `;
    // Build compass tape content: N ... NE ... E ... SE ... S ... SW ... W ... NW ... N
    const dirs = ["N", "", "", "NE", "", "", "E", "", "", "SE", "", "", "S", "", "", "SW", "", "", "W", "", "", "NW", "", "", "N"];
    let tapeHTML = "";
    for (let i = 0; i < dirs.length; i++) {
      const deg = Math.round((i / 24) * 360);
      const label = dirs[i] || `${deg}`;
      const isCardinal = ["N", "E", "S", "W"].includes(dirs[i]);
      const isInter = ["NE", "SE", "SW", "NW"].includes(dirs[i]);
      const color = isCardinal ? "#ffdd88" : isInter ? "#aabbcc" : "rgba(255,255,255,0.3)";
      const size = isCardinal ? "15px" : isInter ? "13px" : "10px";
      tapeHTML += `<span style="display:inline-block;width:35px;text-align:center;color:${color};font-size:${size}">${label}</span>`;
    }
    this._compassStrip.innerHTML = tapeHTML;
    this._compassFrame.appendChild(this._compassStrip);

    // Center marker
    const centerMarker = document.createElement("div");
    centerMarker.style.cssText = `
      position:absolute;top:-2px;left:50%;transform:translateX(-50%);
      width:2px;height:8px;background:#ffdd88;border-radius:1px;
    `;
    this._compassFrame.appendChild(centerMarker);
    const centerMarkerBot = document.createElement("div");
    centerMarkerBot.style.cssText = `
      position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);
      width:2px;height:8px;background:#ffdd88;border-radius:1px;
    `;
    this._compassFrame.appendChild(centerMarkerBot);

    // --- Artificial horizon (bottom-right) ---
    this._horizonCanvas = document.createElement("canvas");
    this._horizonCanvas.width = 120;
    this._horizonCanvas.height = 120;
    this._horizonCanvas.style.cssText = `
      position:absolute;bottom:20px;right:20px;width:120px;height:120px;
      border-radius:60px;border:2px solid rgba(255,255,255,0.2);
      background:rgba(0,0,0,0.3);backdrop-filter:blur(4px);
    `;
    this._horizonCtx = this._horizonCanvas.getContext("2d")!;
    this._root.appendChild(this._horizonCanvas);

    // --- Minimap (top-right) ---
    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 140;
    this._minimapCanvas.height = 140;
    this._minimapCanvas.style.cssText = `
      position:absolute;top:16px;right:20px;width:140px;height:140px;
      border-radius:70px;border:2px solid rgba(255,255,255,0.15);
      background:rgba(0,0,0,0.35);backdrop-filter:blur(4px);
    `;
    this._minimapCtx = this._minimapCanvas.getContext("2d")!;
    this._root.appendChild(this._minimapCanvas);

    // --- Landmark label (center-bottom area) ---
    this._landmarkEl = document.createElement("div");
    this._landmarkEl.style.cssText = `
      position:absolute;bottom:90px;left:50%;transform:translateX(-50%);
      color:#ffdd88;font-size:16px;font-weight:bold;letter-spacing:3px;
      text-shadow:0 0 12px rgba(0,0,0,0.9),0 2px 4px rgba(0,0,0,0.5);
      opacity:0;transition:opacity 0.5s;text-align:center;
    `;
    this._root.appendChild(this._landmarkEl);

    // --- Crosshair (center) ---
    this._crosshairEl = document.createElement("div");
    this._crosshairEl.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:24px;height:24px;pointer-events:none;opacity:0.35;
    `;
    this._crosshairEl.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" fill="none" stroke="white" stroke-width="1"/>
        <line x1="0" y1="12" x2="8" y2="12" stroke="white" stroke-width="1"/>
        <line x1="16" y1="12" x2="24" y2="12" stroke="white" stroke-width="1"/>
        <line x1="12" y1="0" x2="12" y2="8" stroke="white" stroke-width="1"/>
        <line x1="12" y1="16" x2="12" y2="24" stroke="white" stroke-width="1"/>
      </svg>
    `;
    this._root.appendChild(this._crosshairEl);

    // --- Boost indicator (bottom-center) ---
    this._boostEl = document.createElement("div");
    this._boostEl.style.cssText = `
      position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
      width:120px;text-align:center;
      background:rgba(0,0,0,0.3);border-radius:8px;padding:6px 10px;
      border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(4px);
    `;
    const boostLabel = document.createElement("div");
    boostLabel.style.cssText = `color:rgba(255,255,255,0.5);font-size:9px;letter-spacing:2px;margin-bottom:4px;`;
    boostLabel.textContent = "BOOST";
    this._boostEl.appendChild(boostLabel);
    const boostBarOuter = document.createElement("div");
    boostBarOuter.style.cssText = `width:100%;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;overflow:hidden;`;
    this._boostEl.appendChild(boostBarOuter);
    this._boostBarFill = document.createElement("div");
    this._boostBarFill.style.cssText = `height:100%;width:100%;background:linear-gradient(90deg,#44ddff,#88eeff);border-radius:2px;transition:width 0.1s;`;
    boostBarOuter.appendChild(this._boostBarFill);
    this._root.appendChild(this._boostEl);

    // --- Altitude warning (center, hidden by default) ---
    this._altWarningEl = document.createElement("div");
    this._altWarningEl.style.cssText = `
      position:absolute;bottom:50%;left:50%;transform:translateX(-50%);
      color:#ff4444;font-size:18px;font-weight:bold;letter-spacing:3px;
      text-shadow:0 0 12px rgba(255,0,0,0.6);
      opacity:0;transition:opacity 0.2s;
    `;
    this._altWarningEl.textContent = "PULL UP";
    this._root.appendChild(this._altWarningEl);

    // --- Title banner (top-left) ---
    const title = document.createElement("div");
    title.style.cssText = `
      position:absolute;top:16px;left:20px;
      color:#ffdd88;font-size:14px;font-weight:bold;letter-spacing:3px;
      text-shadow:0 0 8px rgba(0,0,0,0.9);opacity:0.7;
    `;
    title.textContent = "EAGLE FLIGHT";
    this._root.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.style.cssText = `
      position:absolute;top:34px;left:20px;
      color:#ccbbaa;font-size:10px;letter-spacing:1px;
      text-shadow:0 0 6px rgba(0,0,0,0.9);opacity:0.5;
    `;
    subtitle.textContent = "Merlin soars over Camelot";
    this._root.appendChild(subtitle);

    // --- Controls hint (center, fades out) ---
    this._controlsEl = document.createElement("div");
    this._controlsEl.style.cssText = `
      position:absolute;bottom:160px;left:50%;transform:translateX(-50%);
      color:#fff;font-size:13px;text-align:center;line-height:2;
      text-shadow:0 0 6px rgba(0,0,0,0.9);
      background:rgba(0,0,0,0.4);padding:18px 30px;border-radius:14px;
      border:1px solid rgba(255,255,255,0.08);transition:opacity 1s;
      backdrop-filter:blur(6px);
    `;
    this._controlsEl.innerHTML = `
      <span style="color:#ffdd88;font-weight:bold;font-size:15px;letter-spacing:2px">FLIGHT CONTROLS</span><br>
      <span style="color:#88bbff">W/S</span> Pitch &nbsp;&nbsp;
      <span style="color:#88bbff">A/D</span> Yaw &nbsp;&nbsp;
      <span style="color:#88bbff">Q/E</span> Roll<br>
      <span style="color:#88bbff">Shift</span> Throttle Up &nbsp;&nbsp;
      <span style="color:#88bbff">Ctrl</span> Throttle Down<br>
      <span style="color:#88bbff">Space</span> Boost &nbsp;&nbsp;
      <span style="color:#88bbff">R</span> Barrel Roll &nbsp;&nbsp;
      <span style="color:#88bbff">F</span> Free Look<br>
      <span style="color:#88bbff">1</span> Firework &nbsp;&nbsp;
      <span style="color:#88bbff">2</span> Lightning &nbsp;&nbsp;
      <span style="color:#88bbff">3</span> Magic Trail<br>
      <span style="color:#88bbff">M</span> Mount/Dismount &nbsp;&nbsp;
      <span style="color:#88bbff">P</span> Photo &nbsp;&nbsp;
      <span style="color:#88bbff">ESC</span> Pause<br>
      <span style="color:#88bbff">T</span> Delivery Quest &nbsp;&nbsp;
      <span style="color:#88bbff">G</span> Race
    `;
    this._root.appendChild(this._controlsEl);

    // --- Flight stats (top-left, below title) ---
    this._statsEl = document.createElement("div");
    this._statsEl.style.cssText = `
      position:absolute;top:55px;left:20px;
      color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:1px;
      text-shadow:0 0 4px rgba(0,0,0,0.8);line-height:1.6;
    `;
    this._root.appendChild(this._statsEl);

    // --- Checkpoint counter (top-left, below stats) ---
    this._checkpointEl = document.createElement("div");
    this._checkpointEl.style.cssText = `
      position:absolute;top:100px;left:20px;
      color:#44ffaa;font-size:12px;font-weight:bold;letter-spacing:1px;
      text-shadow:0 0 6px rgba(68,255,170,0.4);
    `;
    this._root.appendChild(this._checkpointEl);

    // --- Landmark discovery counter ---
    this._landmarkCountEl = document.createElement("div");
    this._landmarkCountEl.style.cssText = `
      position:absolute;top:118px;left:20px;
      color:#ffcc44;font-size:11px;letter-spacing:1px;
      text-shadow:0 0 6px rgba(255,204,68,0.4);
    `;
    this._root.appendChild(this._landmarkCountEl);

    // --- Weather indicator ---
    this._weatherEl = document.createElement("div");
    this._weatherEl.style.cssText = `
      position:absolute;top:138px;left:20px;
      color:rgba(200,220,255,0.6);font-size:10px;letter-spacing:1px;
      text-shadow:0 0 4px rgba(0,0,0,0.8);
    `;
    this._root.appendChild(this._weatherEl);

    // --- Delivery quest HUD ---
    this._deliveryEl = document.createElement("div");
    this._deliveryEl.style.cssText = `
      position:absolute;top:160px;left:20px;
      color:#ffaa44;font-size:12px;font-weight:bold;letter-spacing:1px;
      text-shadow:0 0 6px rgba(255,170,68,0.4);
      display:none;
    `;
    this._root.appendChild(this._deliveryEl);

    // --- Race HUD ---
    this._raceEl = document.createElement("div");
    this._raceEl.style.cssText = `
      position:absolute;top:160px;left:20px;
      color:#44aaff;font-size:12px;font-weight:bold;letter-spacing:1px;
      text-shadow:0 0 6px rgba(68,170,255,0.4);
      display:none;
    `;
    this._root.appendChild(this._raceEl);

    // --- Stall warning ---
    this._stallWarningEl = document.createElement("div");
    this._stallWarningEl.style.cssText = `
      position:absolute;top:45%;left:50%;transform:translate(-50%,-50%);
      color:#ff4444;font-size:36px;font-weight:bold;letter-spacing:8px;
      text-shadow:0 0 20px rgba(255,68,68,0.8);
      opacity:0;pointer-events:none;
    `;
    this._stallWarningEl.textContent = "STALL";
    this._root.appendChild(this._stallWarningEl);

    // --- Rain overlay ---
    this._rainOverlay = document.createElement("div");
    this._rainOverlay.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      pointer-events:none;opacity:0;
      background:repeating-linear-gradient(
        transparent,transparent 4px,
        rgba(180,200,220,0.03) 4px,rgba(180,200,220,0.03) 5px
      );
      animation:rainMove 0.15s linear infinite;
    `;
    this._root.appendChild(this._rainOverlay);
    // Rain animation CSS
    const rainStyle = document.createElement("style");
    rainStyle.textContent = `@keyframes rainMove { from { background-position: 0 0; } to { background-position: -3px 10px; } }`;
    document.head.appendChild(rainStyle);

    // --- Achievement popup ---
    this._achievementEl = document.createElement("div");
    this._achievementEl.style.cssText = `
      position:absolute;top:20px;right:20px;
      background:rgba(0,0,0,0.7);border:1px solid #ffcc44;border-radius:6px;
      padding:8px 16px;color:#ffcc44;font-size:13px;font-weight:bold;
      letter-spacing:1px;text-shadow:0 0 6px rgba(255,204,68,0.4);
      opacity:0;transition:opacity 0.3s;pointer-events:none;
      backdrop-filter:blur(4px);
    `;
    this._root.appendChild(this._achievementEl);

    // --- Thermal indicator (center-bottom) ---
    this._thermalEl = document.createElement("div");
    this._thermalEl.style.cssText = `
      position:absolute;bottom:55px;left:50%;transform:translateX(-50%);
      color:#ffcc44;font-size:13px;font-weight:bold;letter-spacing:2px;
      text-shadow:0 0 8px rgba(255,204,68,0.5);
      opacity:0;transition:opacity 0.3s;
    `;
    this._thermalEl.textContent = "THERMAL UPDRAFT";
    this._root.appendChild(this._thermalEl);

    // --- Mount/Dismount indicator ---
    this._mountEl = document.createElement("div");
    this._mountEl.style.cssText = `
      position:absolute;bottom:90px;left:50%;transform:translateX(-50%);
      color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;
      text-shadow:0 0 6px rgba(0,0,0,0.8);
      transition:opacity 0.3s,color 0.3s;
    `;
    this._mountEl.textContent = "[M] DISMOUNT";
    this._root.appendChild(this._mountEl);

    // --- Notification popup (center screen) ---
    this._notifEl = document.createElement("div");
    this._notifEl.style.cssText = `
      position:absolute;top:35%;left:50%;transform:translate(-50%,-50%);
      color:#44ffaa;font-size:28px;font-weight:bold;letter-spacing:6px;
      text-shadow:0 0 20px rgba(68,255,170,0.6),0 0 40px rgba(68,255,170,0.3);
      opacity:0;transition:opacity 0.15s;pointer-events:none;
      text-align:center;
    `;
    this._root.appendChild(this._notifEl);

    // --- Trick score (right side) ---
    this._trickScoreEl = document.createElement("div");
    this._trickScoreEl.style.cssText = `
      position:absolute;bottom:160px;right:20px;
      color:rgba(255,255,255,0.3);font-size:11px;letter-spacing:1px;
      text-shadow:0 0 4px rgba(0,0,0,0.8);text-align:right;
    `;
    this._root.appendChild(this._trickScoreEl);

    // --- Intro cinematic overlay ---
    this._introOverlay = document.createElement("div");
    this._introOverlay.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      pointer-events:none;display:flex;flex-direction:column;
      align-items:center;justify-content:flex-end;padding-bottom:80px;
    `;
    // Cinematic black bars
    const topBar = document.createElement("div");
    topBar.style.cssText = `position:absolute;top:0;left:0;width:100%;height:60px;background:#000;`;
    this._introOverlay.appendChild(topBar);
    const botBar = document.createElement("div");
    botBar.style.cssText = `position:absolute;bottom:0;left:0;width:100%;height:60px;background:#000;`;
    this._introOverlay.appendChild(botBar);
    // Title text
    const introTitle = document.createElement("div");
    introTitle.style.cssText = `
      color:#ffdd88;font-size:32px;font-weight:bold;letter-spacing:8px;
      text-shadow:0 0 20px rgba(255,221,136,0.4);margin-bottom:10px;
    `;
    introTitle.textContent = "CAMELOT";
    this._introOverlay.appendChild(introTitle);
    const introSub = document.createElement("div");
    introSub.style.cssText = `
      color:rgba(255,255,255,0.5);font-size:14px;letter-spacing:3px;margin-bottom:20px;
    `;
    introSub.textContent = "The Legendary City of King Arthur";
    this._introOverlay.appendChild(introSub);
    this._introText = document.createElement("div");
    this._introText.style.cssText = `
      color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:2px;
    `;
    this._introText.textContent = "Press any key to begin flight";
    this._introOverlay.appendChild(this._introText);
    this._root.appendChild(this._introOverlay);

    // --- Pause overlay (hidden) ---
    this._pauseOverlay = document.createElement("div");
    this._pauseOverlay.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.65);display:none;
      pointer-events:auto;
      flex-direction:column;align-items:center;justify-content:center;
      backdrop-filter:blur(8px);
    `;

    const pauseTitle = document.createElement("div");
    pauseTitle.style.cssText = `
      color:#ffdd88;font-size:42px;font-weight:bold;margin-bottom:10px;
      text-shadow:0 0 20px rgba(255,221,136,0.4);letter-spacing:8px;
    `;
    pauseTitle.textContent = "PAUSED";
    this._pauseOverlay.appendChild(pauseTitle);

    const pauseSub = document.createElement("div");
    pauseSub.style.cssText = `
      color:rgba(255,255,255,0.4);font-size:13px;letter-spacing:2px;margin-bottom:40px;
    `;
    pauseSub.textContent = "Eagle Flight over Camelot";
    this._pauseOverlay.appendChild(pauseSub);

    const btnStyle = `
      color:#fff;font-size:16px;padding:14px 50px;margin:6px;cursor:pointer;
      background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);
      border-radius:10px;text-align:center;pointer-events:auto;letter-spacing:2px;
      transition:background 0.2s,border-color 0.2s;
    `;

    const resumeBtn = document.createElement("div");
    resumeBtn.style.cssText = btnStyle;
    resumeBtn.textContent = "Resume Flight";
    resumeBtn.addEventListener("click", () => this._resumeCb?.());
    resumeBtn.addEventListener("mouseenter", () => { resumeBtn.style.background = "rgba(255,255,255,0.15)"; resumeBtn.style.borderColor = "rgba(255,221,136,0.4)"; });
    resumeBtn.addEventListener("mouseleave", () => { resumeBtn.style.background = "rgba(255,255,255,0.08)"; resumeBtn.style.borderColor = "rgba(255,255,255,0.2)"; });
    this._pauseOverlay.appendChild(resumeBtn);

    // Controls button + panel
    const controlsBtn = document.createElement("div");
    controlsBtn.style.cssText = btnStyle;
    controlsBtn.textContent = "Controls";
    controlsBtn.addEventListener("mouseenter", () => { controlsBtn.style.background = "rgba(255,255,255,0.15)"; controlsBtn.style.borderColor = "rgba(255,221,136,0.4)"; });
    controlsBtn.addEventListener("mouseleave", () => { controlsBtn.style.background = "rgba(255,255,255,0.08)"; controlsBtn.style.borderColor = "rgba(255,255,255,0.2)"; });
    this._pauseOverlay.appendChild(controlsBtn);

    const controlsPanel = document.createElement("div");
    controlsPanel.style.cssText = `
      display:none;margin-top:16px;padding:20px 30px;
      background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.15);
      border-radius:10px;max-width:420px;width:90%;
    `;
    const controlsGrid = [
      ["W / S", "Pitch up / down"],
      ["A / D", "Yaw left / right"],
      ["Q / E", "Roll left / right"],
      ["Shift", "Throttle up"],
      ["Ctrl", "Throttle down"],
      ["Space", "Boost"],
      ["F", "Toggle free-look"],
      ["Mouse", "Free-look camera"],
      ["G", "Mount / dismount"],
      ["1 / 2 / 3", "Cast spells"],
      ["R", "Start race"],
      ["T", "Accept delivery"],
      ["Esc", "Pause"],
    ];
    const heading = document.createElement("div");
    heading.style.cssText = "color:#ffdd88;font-size:16px;font-weight:bold;margin-bottom:12px;letter-spacing:3px;text-align:center;";
    heading.textContent = "CONTROLS";
    controlsPanel.appendChild(heading);
    for (const [key, action] of controlsGrid) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.06);";
      const keyEl = document.createElement("span");
      keyEl.style.cssText = "color:#ffdd88;font-size:13px;font-family:monospace;min-width:100px;";
      keyEl.textContent = key;
      const actionEl = document.createElement("span");
      actionEl.style.cssText = "color:rgba(255,255,255,0.7);font-size:13px;text-align:right;";
      actionEl.textContent = action;
      row.appendChild(keyEl);
      row.appendChild(actionEl);
      controlsPanel.appendChild(row);
    }
    this._pauseOverlay.appendChild(controlsPanel);

    controlsBtn.addEventListener("click", () => {
      controlsPanel.style.display = controlsPanel.style.display === "none" ? "block" : "none";
    });

    const quitBtn = document.createElement("div");
    quitBtn.style.cssText = btnStyle;
    quitBtn.textContent = "Return to Menu";
    quitBtn.addEventListener("click", () => this._quitCb?.());
    quitBtn.addEventListener("mouseenter", () => { quitBtn.style.background = "rgba(255,255,255,0.15)"; quitBtn.style.borderColor = "rgba(255,221,136,0.4)"; });
    quitBtn.addEventListener("mouseleave", () => { quitBtn.style.background = "rgba(255,255,255,0.08)"; quitBtn.style.borderColor = "rgba(255,255,255,0.2)"; });
    this._pauseOverlay.appendChild(quitBtn);

    this._root.appendChild(this._pauseOverlay);
  }

  setPauseCallbacks(resume: () => void, quit: () => void): void {
    this._resumeCb = resume;
    this._quitCb = quit;
  }

  showPauseMenu(): void {
    this._pauseOverlay.style.display = "flex";
  }

  hidePauseMenu(): void {
    this._pauseOverlay.style.display = "none";
  }

  update(state: EagleFlightState, dt: number): void {
    const p = state.player;

    // --- Speed gauge ---
    const speedKnots = p.mounted ? Math.round(p.speed * 2.5) : Math.round(p.speed);
    this._speedEl.textContent = `${speedKnots}`;
    const speedPct = ((p.speed - EFBalance.MIN_SPEED) / (EFBalance.MAX_SPEED - EFBalance.MIN_SPEED)) * 100;
    this._speedBarFill.style.width = `${speedPct}%`;
    // Color the speed bar based on speed
    if (speedPct > 80) {
      this._speedBarFill.style.background = "linear-gradient(90deg,#ff8844,#ffaa66)";
    } else {
      this._speedBarFill.style.background = "linear-gradient(90deg,#44aaff,#88ddff)";
    }

    // --- Altitude gauge ---
    const altFeet = Math.round(p.position.y * 10);
    this._altEl.textContent = `${altFeet}`;
    const altPct = (p.position.y / EFBalance.MAX_ALT) * 100;
    this._altBarFill.style.width = `${altPct}%`;

    // --- G-force (approximate from speed change) ---
    const speedDelta = Math.abs(p.speed - this._prevSpeed) / Math.max(dt, 0.001);
    const gForce = 1 + speedDelta * 0.05 + Math.abs(p.pitch) * 0.5;
    this._gForceEl.textContent = `${gForce.toFixed(1)}G`;
    this._prevSpeed = p.speed;

    // --- Speed lines effect at high speed ---
    const boostRatio = Math.max(0, (p.speed - 35) / 10);
    this._speedLinesEl.style.opacity = `${boostRatio * 0.6}`;

    // --- Compass tape ---
    const yawDeg = (((-p.yaw * 180) / Math.PI) % 360 + 360) % 360;
    // Each segment is 35px wide, 24 segments = 360 degrees
    const pxPerDeg = (35 * 24) / 360;
    const offset = yawDeg * pxPerDeg;
    this._compassStrip.style.transform = `translateX(${140 - offset}px)`;

    // --- Artificial horizon ---
    this._drawHorizon(p.pitch, p.roll);

    // --- Minimap ---
    this._drawMinimap(p.position.x, p.position.z, p.yaw, state);

    // --- Landmark labels ---
    this._updateLandmarkLabel(p.position.x, p.position.z, dt);

    // --- Boost indicator ---
    if (p.boostActive) {
      const pct = (p.boostTimer / 2.0) * 100;
      this._boostBarFill.style.width = `${pct}%`;
      this._boostBarFill.style.background = "linear-gradient(90deg,#ff8844,#ffcc44)";
      this._boostEl.style.borderColor = "rgba(255,200,100,0.4)";
    } else if (p.boostCooldown > 0) {
      const pct = (1 - p.boostCooldown / 5.0) * 100;
      this._boostBarFill.style.width = `${pct}%`;
      this._boostBarFill.style.background = "linear-gradient(90deg,#444466,#6666aa)";
      this._boostEl.style.borderColor = "rgba(255,255,255,0.1)";
    } else {
      this._boostBarFill.style.width = "100%";
      this._boostBarFill.style.background = "linear-gradient(90deg,#44ddff,#88eeff)";
      this._boostEl.style.borderColor = "rgba(68,221,255,0.3)";
    }

    // --- Altitude warning ---
    if (p.position.y < 10 && p.pitch > 0.05) {
      this._altWarningEl.style.opacity = `${Math.min(1, (10 - p.position.y) / 7)}`;
    } else {
      this._altWarningEl.style.opacity = "0";
    }

    // --- Crosshair pulse during boost ---
    if (p.boostActive) {
      this._crosshairEl.style.opacity = `${0.5 + Math.sin(state.gameTime * 10) * 0.15}`;
    } else {
      this._crosshairEl.style.opacity = "0.3";
    }

    // --- Flight stats ---
    const minutes = Math.floor(state.gameTime / 60);
    const seconds = Math.floor(state.gameTime % 60);
    const distKm = (p.distanceFlown * 0.01).toFixed(1);
    const topSpeedKts = Math.round(p.topSpeed * 2.5);
    this._statsEl.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}  |  ${distKm} km  |  TOP ${topSpeedKts} kts`;

    // --- Checkpoint counter + orb counter ---
    const totalCp = state.checkpoints.length;
    const hitCp = p.checkpointsHit;
    const totalOrbs = state.orbs.length;
    const hitOrbs = p.orbsCollected;
    let collectText = "";
    if (hitCp > 0) collectText += `RINGS ${hitCp}/${totalCp}`;
    if (hitOrbs > 0) collectText += `${collectText ? "  |  " : ""}ORBS ${hitOrbs}/${totalOrbs}`;
    this._checkpointEl.textContent = collectText;

    // --- Combo display ---
    if (p.comboTimer > 0 && p.comboMultiplier > 1) {
      this._notifEl.style.color = p.comboMultiplier > 4 ? "#ff4444" : p.comboMultiplier > 2 ? "#ffcc44" : "#44ffaa";
    } else {
      this._notifEl.style.color = "#44ffaa";
    }

    // --- Spell cooldown display in trick score ---
    const s1 = p.spellCooldowns[0] > 0 ? `${p.spellCooldowns[0].toFixed(0)}s` : "RDY";
    const s2 = p.spellCooldowns[1] > 0 ? `${p.spellCooldowns[1].toFixed(0)}s` : "RDY";
    const s3 = p.magicTrailActive ? "ON" : "3";
    this._trickScoreEl.textContent = `SCORE ${p.trickScore}`;
    if (p.nearMisses > 0) this._trickScoreEl.textContent += ` | THREADS ${p.nearMisses}`;
    this._trickScoreEl.textContent += `\n1:${s1} 2:${s2} ${s3}:Trail`;

    // --- Thermal indicator ---
    this._thermalEl.style.opacity = `${state.thermalBoost > 0.1 ? Math.min(1, state.thermalBoost) : 0}`;

    // --- Mount/Dismount indicator ---
    if (p.mounted) {
      this._mountEl.textContent = "[M] DISMOUNT";
      this._mountEl.style.color = "rgba(255,255,255,0.4)";
    } else {
      this._mountEl.textContent = "[M] SUMMON EAGLE";
      this._mountEl.style.color = "rgba(68,170,255,0.7)";
    }
    // Hide during intro
    this._mountEl.style.opacity = state.introActive ? "0" : "1";

    // --- Notification popup ---
    if (state.notificationTimer > 0) {
      this._notifEl.textContent = state.notification;
      this._notifEl.style.opacity = `${Math.min(1, state.notificationTimer * 2)}`;
      // Scale pulse on appear
      const scale = 1 + Math.max(0, (state.notificationTimer - 1)) * 0.3;
      this._notifEl.style.transform = `translate(-50%,-50%) scale(${scale})`;
    } else {
      this._notifEl.style.opacity = "0";
    }

    // --- Trick score ---
    if (p.trickScore > 0) {
      this._trickScoreEl.textContent = `TRICKS ${p.trickScore}`;
      if (p.nearMisses > 0) {
        this._trickScoreEl.textContent += ` | THREADS ${p.nearMisses}`;
      }
    }

    // --- Photo mode: hide most HUD elements ---
    if (state.photoMode) {
      this._root.style.opacity = "0.05";
    } else {
      this._root.style.opacity = "1";
    }

    // --- Intro overlay ---
    if (state.introActive) {
      this._introOverlay.style.display = "flex";
      // Pulse the "press any key" text
      const pulse = 0.3 + Math.sin(state.gameTime * 3) * 0.15;
      this._introText.style.opacity = `${pulse}`;
    } else {
      this._introOverlay.style.display = "none";
    }

    // --- Controls hint fade ---
    if (this._controlsTimer > 0) {
      this._controlsTimer -= dt;
      if (this._controlsTimer <= 2) {
        this._controlsEl.style.opacity = `${Math.max(0, this._controlsTimer / 2)}`;
      }
      if (this._controlsTimer <= 0) {
        this._controlsEl.style.display = "none";
      }
    }

    // --- Weather HUD ---
    const weatherNames = { clear: "CLEAR", rain: "RAIN", storm: "STORM", fog: "FOG" };
    this._weatherEl.textContent = `WEATHER: ${weatherNames[state.weather] || "CLEAR"}`;
    if (state.weather === "storm") this._weatherEl.style.color = "rgba(255,100,100,0.8)";
    else if (state.weather === "rain") this._weatherEl.style.color = "rgba(150,180,220,0.8)";
    else if (state.weather === "fog") this._weatherEl.style.color = "rgba(200,200,180,0.8)";
    else this._weatherEl.style.color = "rgba(200,220,255,0.6)";

    // --- Rain overlay ---
    this._rainOverlay.style.opacity = state.weather === "rain" ? `${state.weatherIntensity * 0.4}` : state.weather === "storm" ? `${state.weatherIntensity * 0.6}` : "0";

    // --- Landmark discovery ---
    this._landmarkCountEl.textContent = `LANDMARKS ${state.landmarkCount}/${state.totalLandmarks}`;

    // --- Delivery quest ---
    if (state.delivery.active) {
      this._deliveryEl.style.display = "block";
      if (!state.delivery.pickedUp) {
        this._deliveryEl.textContent = `DELIVERY: Pick up at ${state.delivery.pickupLabel} [${Math.ceil(state.delivery.timeRemaining)}s]`;
      } else {
        this._deliveryEl.textContent = `DELIVERY: Deliver to ${state.delivery.deliverLabel} [${Math.ceil(state.delivery.timeRemaining)}s]`;
      }
      if (state.delivery.timeRemaining < 15) this._deliveryEl.style.color = "#ff4444";
      else this._deliveryEl.style.color = "#ffaa44";
    } else {
      this._deliveryEl.style.display = "none";
    }

    // --- Race ---
    if (state.race.active) {
      this._raceEl.style.display = "block";
      if (state.race.finished) {
        this._raceEl.textContent = `RACE FINISHED: ${state.race.timeElapsed.toFixed(1)}s — ${state.race.medal.toUpperCase() || "NO MEDAL"}`;
      } else {
        this._raceEl.textContent = `RACE WP ${state.race.currentWaypoint + 1}/${state.race.waypoints.length} | ${state.race.timeElapsed.toFixed(1)}s`;
      }
    } else {
      this._raceEl.style.display = "none";
    }

    // --- Stall warning ---
    this._stallWarningEl.style.opacity = state.stalling ? `${0.5 + Math.sin(state.gameTime * 8) * 0.3}` : "0";

    // --- Achievement popup ---
    const lastAch = state.achievements.find((a) => a.unlocked && state.notification.includes(a.name));
    if (lastAch && state.notificationTimer > 0) {
      this._achievementEl.textContent = `🏆 ${lastAch.name}`;
      this._achievementEl.style.opacity = `${Math.min(1, state.notificationTimer)}`;
    } else {
      this._achievementEl.style.opacity = `${Math.max(0, parseFloat(this._achievementEl.style.opacity || "0") - dt * 2)}`;
    }

    // --- Vignette intensifies at low altitude or high speed ---
    const lowAlt = Math.max(0, 1 - p.position.y / 20);
    const vignetteIntensity = 0.35 + lowAlt * 0.2 + boostRatio * 0.1;
    this._vignetteEl.style.background = `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${vignetteIntensity}) 100%)`;
  }

  private _drawHorizon(pitch: number, roll: number): void {
    const ctx = this._horizonCtx;
    const w = 120;
    const h = 120;
    const cx = w / 2;
    const cy = h / 2;
    const r = 55;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    // Clip to circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Rotate canvas by roll
    ctx.translate(cx, cy);
    ctx.rotate(-roll);

    // Sky/ground split based on pitch
    const pitchOffset = pitch * 80;

    // Sky
    ctx.fillStyle = "#3366aa";
    ctx.fillRect(-r - 5, -r - 5 + pitchOffset, r * 2 + 10, r + 5);

    // Ground
    ctx.fillStyle = "#4a6633";
    ctx.fillRect(-r - 5, pitchOffset, r * 2 + 10, r + 5);

    // Horizon line
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r, pitchOffset);
    ctx.lineTo(r, pitchOffset);
    ctx.stroke();

    // Pitch ladder lines
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.font = "8px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (const deg of [-20, -10, 10, 20]) {
      const py = pitchOffset - deg * 4;
      const lw = deg % 20 === 0 ? 20 : 14;
      ctx.beginPath();
      ctx.moveTo(-lw, py);
      ctx.lineTo(lw, py);
      ctx.stroke();
      ctx.fillText(`${deg}`, lw + 3, py + 3);
    }

    ctx.restore();

    // Center aircraft symbol (fixed)
    ctx.strokeStyle = "#ffdd88";
    ctx.lineWidth = 2;
    // Wings
    ctx.beginPath();
    ctx.moveTo(cx - 25, cy);
    ctx.lineTo(cx - 8, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy);
    ctx.lineTo(cx + 25, cy);
    ctx.stroke();
    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.stroke();
    // Tail
    ctx.beginPath();
    ctx.moveTo(cx, cy + 3);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  private _drawMinimap(px: number, pz: number, yaw: number, state: EagleFlightState): void {
    const ctx = this._minimapCtx;
    const w = 140;
    const h = 140;
    const cx = w / 2;
    const cy = h / 2;
    const r = 65;
    const scale = 0.3; // world units to pixels

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Background
    ctx.fillStyle = "rgba(40, 60, 30, 0.8)";
    ctx.fillRect(0, 0, w, h);

    // Translate so player is at center
    ctx.translate(cx, cy);
    ctx.rotate(yaw); // rotate map to heading-up

    // City walls circle
    ctx.strokeStyle = "rgba(170, 153, 119, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-px * scale, -pz * scale, 85 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Castle (center-north)
    ctx.fillStyle = "rgba(200, 180, 150, 0.8)";
    const castleX = (0 - px) * scale;
    const castleZ = (30 - pz) * scale;
    ctx.fillRect(castleX - 6, castleZ - 5, 12, 10);

    // River (simplified line)
    ctx.strokeStyle = "rgba(34, 85, 170, 0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo((-200 - px) * scale, (-40 - pz) * scale);
    ctx.quadraticCurveTo((-40 - px) * scale, (20 - pz) * scale, (0 - px) * scale, (15 - pz) * scale);
    ctx.quadraticCurveTo((80 - px) * scale, (0 - pz) * scale, (200 - px) * scale, (-20 - pz) * scale);
    ctx.stroke();

    // Landmarks as dots
    for (const lm of LANDMARKS) {
      const lx = (lm.x - px) * scale;
      const lz = (lm.z - pz) * scale;
      if (Math.abs(lx) > r + 5 || Math.abs(lz) > r + 5) continue;
      ctx.fillStyle = lm.icon === "castle" ? "#ffdd88" : "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(lx, lz, lm.icon === "castle" ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Checkpoint rings on minimap
    for (const cp of state.checkpoints) {
      if (cp.collected) continue;
      const cpx = (cp.position.x - px) * scale;
      const cpz = (cp.position.z - pz) * scale;
      if (Math.abs(cpx) > r + 5 || Math.abs(cpz) > r + 5) continue;
      ctx.strokeStyle = "#44ffaa";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cpx, cpz, 3.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Thermal zones (subtle orange circles)
    const thermals = [
      { x: 0, z: 30, r: 20 }, { x: 140, z: -60, r: 15 }, { x: -120, z: 90, r: 15 },
      { x: -45, z: 5, r: 10 }, { x: 180, z: 80, r: 25 }, { x: -160, z: -100, r: 20 },
    ];
    ctx.strokeStyle = "rgba(255,180,80,0.25)";
    ctx.lineWidth = 1;
    for (const th of thermals) {
      const tx = (th.x - px) * scale;
      const tz = (th.z - pz) * scale;
      if (Math.abs(tx) > r + 10 || Math.abs(tz) > r + 10) continue;
      ctx.beginPath();
      ctx.arc(tx, tz, th.r * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Dragon markers (red triangles)
    for (const dragon of state.dragons) {
      const dx = (dragon.position.x - px) * scale;
      const dz = (dragon.position.z - pz) * scale;
      if (Math.abs(dx) > r + 5 || Math.abs(dz) > r + 5) continue;
      ctx.fillStyle = "#ff4444";
      ctx.beginPath();
      ctx.moveTo(dx, dz - 4);
      ctx.lineTo(dx - 3, dz + 3);
      ctx.lineTo(dx + 3, dz + 3);
      ctx.closePath();
      ctx.fill();
    }

    // Race waypoints (blue diamonds)
    if (state.race.active && !state.race.finished) {
      for (let wi = state.race.currentWaypoint; wi < state.race.waypoints.length; wi++) {
        const wp = state.race.waypoints[wi];
        const wx = (wp.x - px) * scale;
        const wz = (wp.z - pz) * scale;
        if (Math.abs(wx) > r + 5 || Math.abs(wz) > r + 5) continue;
        ctx.fillStyle = wi === state.race.currentWaypoint ? "#44aaff" : "rgba(68,170,255,0.4)";
        ctx.beginPath();
        ctx.moveTo(wx, wz - 4);
        ctx.lineTo(wx + 3, wz);
        ctx.lineTo(wx, wz + 4);
        ctx.lineTo(wx - 3, wz);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Delivery markers
    if (state.delivery.active) {
      const dp = state.delivery.pickedUp ? state.delivery.deliverPos : state.delivery.pickupPos;
      const dpx = (dp.x - px) * scale;
      const dpz = (dp.z - pz) * scale;
      if (Math.abs(dpx) < r + 5 && Math.abs(dpz) < r + 5) {
        ctx.fillStyle = "#ffaa44";
        ctx.fillRect(dpx - 3, dpz - 3, 6, 6);
        ctx.strokeStyle = "#ffaa44";
        ctx.lineWidth = 1;
        ctx.strokeRect(dpx - 5, dpz - 5, 10, 10);
      }
    }

    ctx.restore();

    // Fog-of-war overlay (darken undiscovered areas)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, w, h);
    // Cut out discovered areas as bright circles
    ctx.globalCompositeOperation = "destination-out";
    // Player's current visible area
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();
    // Discovered landmarks
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(yaw);
    for (const lmName of Array.from(state.discoveredLandmarks)) {
      const lm = LANDMARKS.find((l) => l.label === lmName);
      if (!lm) continue;
      const lx = (lm.x - px) * scale;
      const lz = (lm.z - pz) * scale;
      ctx.beginPath();
      ctx.arc(lx, lz, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // Player triangle (always center, pointing up)
    ctx.fillStyle = "#44ff88";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.closePath();
    ctx.fill();

    // "N" indicator
    const nAngle = yaw;
    const nx = cx + Math.sin(nAngle) * (r - 8);
    const ny = cy - Math.cos(nAngle) * (r - 8);
    ctx.fillStyle = "#ff6644";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("N", nx, ny + 4);

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  private _updateLandmarkLabel(px: number, pz: number, dt: number): void {
    let closest = "";
    let closestDist = Infinity;

    for (const lm of LANDMARKS) {
      const dx = lm.x - px;
      const dz = lm.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 40 && dist < closestDist) {
        closestDist = dist;
        closest = lm.label;
      }
    }

    if (closest && closest !== this._lastLandmark) {
      this._lastLandmark = closest;
      this._landmarkEl.textContent = closest.toUpperCase();
      this._landmarkEl.style.opacity = "1";
      this._landmarkTimer = 3;
    }

    if (this._landmarkTimer > 0) {
      this._landmarkTimer -= dt;
      if (this._landmarkTimer <= 1) {
        this._landmarkEl.style.opacity = `${Math.max(0, this._landmarkTimer)}`;
      }
      if (this._landmarkTimer <= 0) {
        this._lastLandmark = "";
      }
    }
  }

  resize(sw: number, sh: number): void {
    this._root.style.width = `${sw}px`;
    this._root.style.height = `${sh}px`;
  }

  destroy(): void {
    if (this._root.parentElement) {
      this._root.parentElement.removeChild(this._root);
    }
  }
}
