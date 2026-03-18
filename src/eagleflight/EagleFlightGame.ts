// ---------------------------------------------------------------------------
// Eagle Flight mode orchestrator
// Merlin rides a majestic eagle soaring over the medieval city of Camelot.
// Pure flight simulator — explore the castle, city, and countryside.
// Uses Three.js for 3D rendering with an HTML HUD overlay.
// ---------------------------------------------------------------------------

import { audioManager } from "@audio/AudioManager";
import { createEagleFlightState, EFBalance } from "./state/EagleFlightState";
import type { EagleFlightState } from "./state/EagleFlightState";
import { EagleFlightInputSystem } from "./systems/EagleFlightInputSystem";
import { EagleFlightRenderer } from "./view/EagleFlightRenderer";
import { EagleFlightHUD } from "./view/EagleFlightHUD";

const DT = EFBalance.SIM_TICK_MS / 1000;

// Thermal locations (near castle, hills, and warm areas)
const THERMALS = [
  { x: 0, z: 30, radius: 20, strength: 6 },    // Castle courtyard
  { x: 140, z: -60, radius: 15, strength: 4 },  // Windmill hill
  { x: -120, z: 90, radius: 15, strength: 4 },  // Windmill 2
  { x: -45, z: 5, radius: 10, strength: 5 },    // Blacksmith forge
  { x: 180, z: 80, radius: 25, strength: 3 },   // Hills
  { x: -160, z: -100, radius: 20, strength: 3 }, // Hills
];

// ---------------------------------------------------------------------------
// EagleFlightGame
// ---------------------------------------------------------------------------

export class EagleFlightGame {
  private _state!: EagleFlightState;
  private _rafId: number | null = null;
  private _simAccumulator = 0;
  private _lastTime = 0;
  private _prevPosX = 0;
  private _prevPosZ = 0;

  private _renderer = new EagleFlightRenderer();
  private _hud = new EagleFlightHUD();

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    audioManager.playGameMusic();

    const sw = window.innerWidth;
    const sh = window.innerHeight;

    this._state = createEagleFlightState(sw, sh);
    this._prevPosX = this._state.player.position.x;
    this._prevPosZ = this._state.player.position.z;

    // Initialize Three.js renderer
    this._renderer.init(sw, sh);
    document.body.appendChild(this._renderer.canvas);

    // Build HUD
    this._hud.build(sw, sh);

    // Input
    EagleFlightInputSystem.init(this._state);
    EagleFlightInputSystem.setSkipIntroCallback(() => {
      if (this._state.introActive) this._endIntro();
    });
    EagleFlightInputSystem.setPauseCallback((paused) => {
      if (this._state.introActive) return; // can't pause during intro
      if (paused) {
        this._state.paused = true;
        this._hud.showPauseMenu();
      } else {
        this._state.paused = false;
        this._hud.hidePauseMenu();
      }
    });

    // Pause menu callbacks
    this._hud.setPauseCallbacks(
      () => {
        this._state.paused = false;
        this._hud.hidePauseMenu();
      },
      () => {
        this._hud.hidePauseMenu();
        window.dispatchEvent(new Event("eagleFlightExit"));
      },
    );

    // Music
    audioManager.switchTrack("battle");

    // Handle window resize
    this._onResize = this._onResize.bind(this);
    window.addEventListener("resize", this._onResize);

    // Start game loop
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  // ---------------------------------------------------------------------------
  // Game Loop
  // ---------------------------------------------------------------------------

  private _gameLoop(timestamp: number): void {
    if (!this._state) return;

    const rawDt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    const sw = window.innerWidth;
    const sh = window.innerHeight;
    this._state.screenW = sw;
    this._state.screenH = sh;

    // --- Cinematic intro ---
    if (this._state.introActive) {
      this._state.introTimer += rawDt;
      this._state.gameTime += rawDt;

      // Scripted camera path — sweeping orbit around the castle
      const t = this._state.introTimer / this._state.introDuration;
      const introAngle = t * Math.PI * 1.5 - Math.PI / 2;
      const introRadius = 120 - t * 30; // spiral inward
      const introHeight = 80 - t * 20;  // descend
      this._state.player.position.x = Math.cos(introAngle) * introRadius;
      this._state.player.position.z = Math.sin(introAngle) * introRadius + 30;
      this._state.player.position.y = introHeight;
      this._state.player.yaw = introAngle + Math.PI;
      this._state.player.pitch = -0.1;
      this._state.player.roll = Math.sin(introAngle * 2) * 0.15;
      this._state.player.speed = 20;
      this._state.player.flapPhase += rawDt * 4;

      // End intro — skip on any key/click or after duration
      if (this._state.introTimer >= this._state.introDuration) {
        this._endIntro();
      }

      this._renderer.update(this._state, rawDt);
      this._hud.update(this._state, rawDt);
      this._rafId = requestAnimationFrame((t2) => this._gameLoop(t2));
      return;
    }

    // Fixed timestep simulation
    if (!this._state.paused) {
      this._simAccumulator += rawDt;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        this._state.gameTime += DT;
        this._state.dayPhase += DT * 0.005;

        EagleFlightInputSystem.update(this._state, DT);

        // --- Wind drift (only when flying) ---
        if (this._state.player.mounted) {
          const windX = Math.cos(this._state.windAngle) * this._state.windStrength * DT;
          const windZ = Math.sin(this._state.windAngle) * this._state.windStrength * DT;
          this._state.player.position.x += windX * 0.15;
          this._state.player.position.z += windZ * 0.15;
        }
        // Slowly shift wind direction
        this._state.windAngle += Math.sin(this._state.gameTime * 0.1) * 0.001;

        // --- Thermals (only when flying) ---
        this._state.thermalBoost = 0;
        const px = this._state.player.position.x;
        const pz = this._state.player.position.z;
        if (this._state.player.mounted) {
          for (const th of THERMALS) {
            const dx = px - th.x;
            const dz = pz - th.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < th.radius) {
              const strength = (1 - dist / th.radius) * th.strength;
              this._state.player.position.y += strength * DT;
              this._state.thermalBoost = Math.max(this._state.thermalBoost, strength / th.strength);
            }
          }
        }

        // --- Checkpoint collection ---
        for (const cp of this._state.checkpoints) {
          if (cp.collected) continue;
          const cdx = px - cp.position.x;
          const cdy = this._state.player.position.y - cp.position.y;
          const cdz = pz - cp.position.z;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
          if (cdist < cp.radius) {
            cp.collected = true;
            this._state.player.checkpointsHit++;
            const total = this._state.checkpoints.length;
            const hit = this._state.player.checkpointsHit;
            if (hit >= total) {
              this._awardTrickScore(500, "ALL RINGS COLLECTED!");
            } else {
              this._awardTrickScore(200, `RING ${hit}/${total}`);
            }
            this._state.shakeTimer = 0.25;
            this._state.shakeMag = 1.0;
          }
          cp.glowPhase += DT * 2;
        }

        // --- Magic orb collection ---
        for (const orb of this._state.orbs) {
          if (orb.collected) continue;
          const odx = px - orb.position.x;
          const ody = this._state.player.position.y - orb.position.y;
          const odz = pz - orb.position.z;
          const odist = Math.sqrt(odx * odx + ody * ody + odz * odz);
          if (odist < 4) {
            orb.collected = true;
            this._state.player.orbsCollected++;
            this._awardTrickScore(25, "MAGIC ORB!");
          }
          orb.phase += DT * 3;
        }

        // --- Combo timer decay ---
        if (this._state.player.comboTimer > 0) {
          this._state.player.comboTimer -= DT;
          if (this._state.player.comboTimer <= 0) {
            // Combo ended
            if (this._state.player.comboMultiplier > 1) {
              this._state.notification = `x${this._state.player.comboMultiplier} COMBO!`;
              this._state.notificationTimer = 1.5;
            }
            this._state.player.comboMultiplier = 1;
          }
        }

        // --- Spell cooldown decay ---
        for (let si = 0; si < 3; si++) {
          if (this._state.player.spellCooldowns[si] > 0) {
            this._state.player.spellCooldowns[si] -= DT;
          }
        }

        // --- Day/night cycle ---
        this._state.sunAngle += DT * 0.015; // full cycle ~7 minutes
        if (this._state.sunAngle > Math.PI * 2) this._state.sunAngle -= Math.PI * 2;

        // --- NPC AI ---
        const py = this._state.player.position.y;
        for (const npc of this._state.npcs) {
          // Move toward target
          const ndx = npc.targetX - npc.position.x;
          const ndz = npc.targetZ - npc.position.z;
          const ndist = Math.sqrt(ndx * ndx + ndz * ndz);
          if (ndist > 0.5) {
            npc.position.x += (ndx / ndist) * npc.speed * DT;
            npc.position.z += (ndz / ndist) * npc.speed * DT;
          } else {
            // Pick new target within patrol radius
            npc.targetX = npc.position.x + (Math.random() - 0.5) * 15;
            npc.targetZ = npc.position.z + (Math.random() - 0.5) * 15;
          }
          // React to eagle overhead
          const edx = px - npc.position.x;
          const edz = pz - npc.position.z;
          const eDist = Math.sqrt(edx * edx + edz * edz);
          if (eDist < 20 && py < 15) {
            npc.lookingUp = true;
            npc.lookTimer = 2;
          }
          if (npc.lookTimer > 0) {
            npc.lookTimer -= DT;
            if (npc.lookTimer <= 0) npc.lookingUp = false;
          }
        }

        // --- Distance and top speed tracking ---
        const ddx = px - this._prevPosX;
        const ddz = pz - this._prevPosZ;
        this._state.player.distanceFlown += Math.sqrt(ddx * ddx + ddz * ddz);
        this._prevPosX = px;
        this._prevPosZ = pz;
        if (this._state.player.speed > this._state.player.topSpeed) {
          this._state.player.topSpeed = this._state.player.speed;
        }
      }
    }

    // Always render
    this._renderer.update(this._state, rawDt);
    this._hud.update(this._state, rawDt);

    this._rafId = requestAnimationFrame((t2) => this._gameLoop(t2));
  }

  private _awardTrickScore(base: number, notif: string): void {
    const p = this._state.player;
    const score = base * p.comboMultiplier;
    p.trickScore += score;
    p.lastComboScore = score;
    p.comboTimer = EFBalance.COMBO_WINDOW;
    p.comboMultiplier++;
    this._state.notification = p.comboMultiplier > 2 ? `${notif} x${p.comboMultiplier - 1}` : notif;
    this._state.notificationTimer = 1.5;
    this._state.shakeTimer = 0.15;
    this._state.shakeMag = 0.5;
  }

  private _endIntro(): void {
    this._state.introActive = false;
    EagleFlightInputSystem.clearSkipIntro();
    // Position eagle for player takeover
    this._state.player.position.x = 0;
    this._state.player.position.y = 60;
    this._state.player.position.z = -80;
    this._state.player.yaw = 0;
    this._state.player.pitch = 0;
    this._state.player.roll = 0;
    this._state.player.speed = EFBalance.CRUISE_SPEED;
    this._state.player.targetSpeed = EFBalance.CRUISE_SPEED;
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  private _onResize(): void {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    this._renderer.resize(sw, sh);
    this._hud.resize(sw, sh);
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    window.removeEventListener("resize", this._onResize);
    EagleFlightInputSystem.destroy();
    this._renderer.destroy();
    this._hud.destroy();
  }
}
