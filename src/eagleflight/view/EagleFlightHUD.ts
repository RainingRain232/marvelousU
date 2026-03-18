// ---------------------------------------------------------------------------
// Eagle Flight — HTML overlay HUD
// Displays: speed, altitude, compass heading, minimap indicator, controls hint
// ---------------------------------------------------------------------------

import type { EagleFlightState } from "../state/EagleFlightState";
import { EFBalance } from "../state/EagleFlightState";

export class EagleFlightHUD {
  private _root!: HTMLDivElement;

  // Gauges
  private _speedEl!: HTMLDivElement;
  private _altEl!: HTMLDivElement;
  private _compassEl!: HTMLDivElement;
  private _throttleBarFill!: HTMLDivElement;

  // Pause overlay
  private _pauseOverlay!: HTMLDivElement;
  private _resumeCb: (() => void) | null = null;
  private _quitCb: (() => void) | null = null;

  // Controls hint
  private _controlsEl!: HTMLDivElement;
  private _controlsTimer = 8; // show for 8 seconds

  build(sw: number, sh: number): void {
    this._root = document.createElement("div");
    this._root.style.cssText = `
      position:absolute;top:0;left:0;width:${sw}px;height:${sh}px;
      pointer-events:none;z-index:10;font-family:'Segoe UI',Arial,sans-serif;
      user-select:none;overflow:hidden;
    `;
    document.body.appendChild(this._root);

    // --- Speed indicator (bottom-left) ---
    this._speedEl = document.createElement("div");
    this._speedEl.style.cssText = `
      position:absolute;bottom:60px;left:30px;
      color:#fff;font-size:22px;font-weight:bold;
      text-shadow:0 0 6px rgba(0,0,0,0.8),0 2px 4px rgba(0,0,0,0.5);
    `;
    this._root.appendChild(this._speedEl);

    // --- Altitude indicator (bottom-left, below speed) ---
    this._altEl = document.createElement("div");
    this._altEl.style.cssText = `
      position:absolute;bottom:30px;left:30px;
      color:#aaddff;font-size:18px;font-weight:bold;
      text-shadow:0 0 6px rgba(0,0,0,0.8),0 2px 4px rgba(0,0,0,0.5);
    `;
    this._root.appendChild(this._altEl);

    // --- Throttle bar (bottom-left vertical bar) ---
    const throttleOuter = document.createElement("div");
    throttleOuter.style.cssText = `
      position:absolute;bottom:30px;left:180px;width:8px;height:80px;
      background:rgba(0,0,0,0.4);border-radius:4px;border:1px solid rgba(255,255,255,0.2);
    `;
    this._root.appendChild(throttleOuter);

    this._throttleBarFill = document.createElement("div");
    this._throttleBarFill.style.cssText = `
      position:absolute;bottom:0;left:0;width:100%;height:50%;
      background:linear-gradient(to top,#44aaff,#88ddff);border-radius:4px;
      transition:height 0.15s;
    `;
    throttleOuter.appendChild(this._throttleBarFill);

    // --- Compass (top-center) ---
    this._compassEl = document.createElement("div");
    this._compassEl.style.cssText = `
      position:absolute;top:20px;left:50%;transform:translateX(-50%);
      color:#fff;font-size:20px;font-weight:bold;letter-spacing:4px;
      text-shadow:0 0 8px rgba(0,0,0,0.9),0 2px 4px rgba(0,0,0,0.5);
      background:rgba(0,0,0,0.25);padding:6px 20px;border-radius:20px;
      border:1px solid rgba(255,255,255,0.15);
    `;
    this._root.appendChild(this._compassEl);

    // --- Title banner (top-left) ---
    const title = document.createElement("div");
    title.style.cssText = `
      position:absolute;top:20px;left:20px;
      color:#ffdd88;font-size:16px;font-weight:bold;letter-spacing:2px;
      text-shadow:0 0 8px rgba(0,0,0,0.9);opacity:0.8;
    `;
    title.textContent = "EAGLE FLIGHT";
    this._root.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.style.cssText = `
      position:absolute;top:42px;left:20px;
      color:#ccbbaa;font-size:11px;letter-spacing:1px;
      text-shadow:0 0 6px rgba(0,0,0,0.9);opacity:0.7;
    `;
    subtitle.textContent = "Merlin soars over Camelot";
    this._root.appendChild(subtitle);

    // --- Controls hint (center, fades out) ---
    this._controlsEl = document.createElement("div");
    this._controlsEl.style.cssText = `
      position:absolute;bottom:140px;left:50%;transform:translateX(-50%);
      color:#fff;font-size:14px;text-align:center;line-height:1.8;
      text-shadow:0 0 6px rgba(0,0,0,0.9);
      background:rgba(0,0,0,0.35);padding:15px 25px;border-radius:12px;
      border:1px solid rgba(255,255,255,0.1);transition:opacity 1s;
    `;
    this._controlsEl.innerHTML = `
      <span style="color:#ffdd88;font-weight:bold">FLIGHT CONTROLS</span><br>
      W/S — Pitch down/up &nbsp;&nbsp; A/D — Yaw left/right<br>
      Q/E — Roll left/right &nbsp;&nbsp; Shift/Ctrl — Throttle up/down<br>
      ESC — Pause
    `;
    this._root.appendChild(this._controlsEl);

    // --- Pause overlay (hidden) ---
    this._pauseOverlay = document.createElement("div");
    this._pauseOverlay.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.6);display:none;
      pointer-events:auto;
      display:none;
      flex-direction:column;align-items:center;justify-content:center;
    `;

    const pauseTitle = document.createElement("div");
    pauseTitle.style.cssText = `
      color:#ffdd88;font-size:36px;font-weight:bold;margin-bottom:30px;
      text-shadow:0 0 12px rgba(255,221,136,0.5);letter-spacing:4px;
    `;
    pauseTitle.textContent = "PAUSED";
    this._pauseOverlay.appendChild(pauseTitle);

    const btnStyle = `
      color:#fff;font-size:18px;padding:12px 40px;margin:8px;cursor:pointer;
      background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.3);
      border-radius:8px;text-align:center;pointer-events:auto;
    `;

    const resumeBtn = document.createElement("div");
    resumeBtn.style.cssText = btnStyle;
    resumeBtn.textContent = "Resume";
    resumeBtn.addEventListener("click", () => this._resumeCb?.());
    resumeBtn.addEventListener("mouseenter", () => (resumeBtn.style.background = "rgba(255,255,255,0.2)"));
    resumeBtn.addEventListener("mouseleave", () => (resumeBtn.style.background = "rgba(255,255,255,0.1)"));
    this._pauseOverlay.appendChild(resumeBtn);

    const quitBtn = document.createElement("div");
    quitBtn.style.cssText = btnStyle;
    quitBtn.textContent = "Quit to Menu";
    quitBtn.addEventListener("click", () => this._quitCb?.());
    quitBtn.addEventListener("mouseenter", () => (quitBtn.style.background = "rgba(255,255,255,0.2)"));
    quitBtn.addEventListener("mouseleave", () => (quitBtn.style.background = "rgba(255,255,255,0.1)"));
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

    // Speed
    const speedKnots = Math.round(p.speed * 2.5);
    this._speedEl.textContent = `${speedKnots} kts`;

    // Altitude
    const altFeet = Math.round(p.position.y * 10);
    this._altEl.textContent = `ALT ${altFeet} ft`;

    // Throttle bar
    const throttlePct =
      ((p.targetSpeed - EFBalance.MIN_SPEED) /
        (EFBalance.MAX_SPEED - EFBalance.MIN_SPEED)) *
      100;
    this._throttleBarFill.style.height = `${throttlePct}%`;

    // Compass — convert yaw to cardinal direction
    let yawDeg = (((-p.yaw * 180) / Math.PI) % 360 + 360) % 360;
    const cardinals = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const cardIdx = Math.round(yawDeg / 45) % 8;
    this._compassEl.textContent = `${cardinals[cardIdx]}  ${Math.round(yawDeg)}°`;

    // Controls hint fade
    if (this._controlsTimer > 0) {
      this._controlsTimer -= dt;
      if (this._controlsTimer <= 2) {
        this._controlsEl.style.opacity = `${Math.max(0, this._controlsTimer / 2)}`;
      }
      if (this._controlsTimer <= 0) {
        this._controlsEl.style.display = "none";
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
