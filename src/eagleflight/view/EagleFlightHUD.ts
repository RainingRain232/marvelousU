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
      <span style="color:#88bbff">F</span> Free Look &nbsp;&nbsp;
      <span style="color:#88bbff">ESC</span> Pause
    `;
    this._root.appendChild(this._controlsEl);

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
    const speedKnots = Math.round(p.speed * 2.5);
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
    this._drawMinimap(p.position.x, p.position.z, p.yaw);

    // --- Landmark labels ---
    this._updateLandmarkLabel(p.position.x, p.position.z, dt);

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

  private _drawMinimap(px: number, pz: number, yaw: number): void {
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
