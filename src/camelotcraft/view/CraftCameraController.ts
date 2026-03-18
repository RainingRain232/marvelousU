// ---------------------------------------------------------------------------
// Camelot Craft – First-person camera controller with screen shake & FOV effects
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { CB } from "../config/CraftBalance";
import type { CraftState } from "../state/CraftState";

export class CraftCameraController {
  readonly camera: THREE.PerspectiveCamera;
  private _bobPhase = 0;
  private _bobAmplitude = 0;

  // Screen shake
  private _shakeIntensity = 0;
  private _shakeDecay = 8;
  private _shakeOffset = new THREE.Vector3();

  // FOV effects
  // base FOV reference
  private _targetFOV = 75;
  private _currentFOV = 75;

  // Tilt (damage lean)
  private _tiltAngle = 0;
  private _targetTilt = 0;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  }

  /** Trigger screen shake with given intensity (0-1). */
  shake(intensity: number): void {
    this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
  }

  /** Sync camera with player state each frame. */
  update(state: CraftState, dt: number): void {
    const p = state.player;

    // Position camera at eye height
    this.camera.position.set(
      p.position.x,
      p.position.y + CB.PLAYER_EYE_HEIGHT,
      p.position.z,
    );

    // --- Head bob while moving on ground ---
    const speed = Math.sqrt(p.velocity.x ** 2 + p.velocity.z ** 2);
    if (p.onGround && speed > 0.5) {
      this._bobAmplitude = THREE.MathUtils.lerp(this._bobAmplitude, 0.06, dt * 8);
      this._bobPhase += dt * speed * 1.8;
    } else {
      this._bobAmplitude = THREE.MathUtils.lerp(this._bobAmplitude, 0, dt * 8);
    }

    if (this._bobAmplitude > 0.001) {
      this.camera.position.y += Math.sin(this._bobPhase) * this._bobAmplitude;
      // Subtle lateral sway
      this.camera.position.x += Math.cos(this._bobPhase * 0.5) * this._bobAmplitude * 0.3;
    }

    // --- Screen shake ---
    if (this._shakeIntensity > 0.001) {
      this._shakeOffset.set(
        (Math.random() * 2 - 1) * this._shakeIntensity * 0.3,
        (Math.random() * 2 - 1) * this._shakeIntensity * 0.2,
        (Math.random() * 2 - 1) * this._shakeIntensity * 0.1,
      );
      this.camera.position.add(this._shakeOffset);
      this._shakeIntensity *= Math.exp(-this._shakeDecay * dt);
    }

    // --- FOV effects ---
    // Sprint widens FOV
    this._targetFOV = p.sprinting && speed > 2 ? 85 : 75;
    // Water narrows FOV slightly
    if (p.inWater) this._targetFOV = 70;
    this._currentFOV = THREE.MathUtils.lerp(this._currentFOV, this._targetFOV, dt * 6);
    this.camera.fov = this._currentFOV;

    // --- Damage tilt ---
    if (p.invulnTimer > 0.3) {
      this._targetTilt = (Math.random() > 0.5 ? 1 : -1) * 0.03;
    } else {
      this._targetTilt = 0;
    }
    this._tiltAngle = THREE.MathUtils.lerp(this._tiltAngle, this._targetTilt, dt * 10);

    // Build rotation quaternion from yaw/pitch/tilt
    const euler = new THREE.Euler(p.pitch, p.yaw, this._tiltAngle, "YXZ");
    this.camera.quaternion.setFromEuler(euler);

    // Update aspect ratio & projection
    this.camera.aspect = state.screenW / state.screenH;
    this.camera.updateProjectionMatrix();
  }

  /** Get the direction the player is looking. */
  getForward(): THREE.Vector3 {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(this.camera.quaternion);
    return dir;
  }

  /** Handle window resize. */
  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
