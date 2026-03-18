// ---------------------------------------------------------------------------
// Camelot Craft – Camera controller with first/third-person toggle + effects
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { CB } from "../config/CraftBalance";
import type { CraftState } from "../state/CraftState";

export type CameraMode = "first" | "third" | "orbit";

export class CraftCameraController {
  readonly camera: THREE.PerspectiveCamera;
  private _bobPhase = 0;
  private _bobAmplitude = 0;

  // Screen shake
  private _shakeIntensity = 0;
  private _shakeDecay = 8;
  private _shakeOffset = new THREE.Vector3();

  // FOV effects
  private _targetFOV = 75;
  private _currentFOV = 75;

  // Tilt
  private _tiltAngle = 0;
  private _targetTilt = 0;

  // Third-person / orbit mode
  private _mode: CameraMode = "first";
  private _thirdPersonDist = 5;
  private _thirdPersonHeight = 2.5;
  private _orbitAngle = 0;
  private _orbitDist = 8;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  }

  get mode(): CameraMode { return this._mode; }

  /** Toggle camera mode: first → third → orbit → first */
  toggleMode(): void {
    if (this._mode === "first") this._mode = "third";
    else if (this._mode === "third") this._mode = "orbit";
    else this._mode = "first";
  }

  /** Trigger screen shake. */
  shake(intensity: number): void {
    this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
  }

  /** Sync camera each frame. */
  update(state: CraftState, dt: number): void {
    const p = state.player;
    const eyePos = new THREE.Vector3(p.position.x, p.position.y + CB.PLAYER_EYE_HEIGHT, p.position.z);

    if (this._mode === "first") {
      this._updateFirstPerson(state, dt, eyePos);
    } else if (this._mode === "third") {
      this._updateThirdPerson(state, dt, eyePos);
    } else {
      this._updateOrbit(state, dt, eyePos);
    }

    // --- FOV ---
    const speed = Math.sqrt(p.velocity.x ** 2 + p.velocity.z ** 2);
    this._targetFOV = p.sprinting && speed > 2 ? 85 : 75;
    if (p.inWater) this._targetFOV = 70;
    if (this._mode === "orbit") this._targetFOV = 60; // wider for orbit
    this._currentFOV = THREE.MathUtils.lerp(this._currentFOV, this._targetFOV, dt * 6);
    this.camera.fov = this._currentFOV;

    // --- Screen shake (all modes) ---
    if (this._shakeIntensity > 0.001) {
      this._shakeOffset.set(
        (Math.random() * 2 - 1) * this._shakeIntensity * 0.3,
        (Math.random() * 2 - 1) * this._shakeIntensity * 0.2,
        (Math.random() * 2 - 1) * this._shakeIntensity * 0.1,
      );
      this.camera.position.add(this._shakeOffset);
      this._shakeIntensity *= Math.exp(-this._shakeDecay * dt);
    }

    this.camera.aspect = state.screenW / state.screenH;
    this.camera.updateProjectionMatrix();
  }

  // --- First person ---
  private _updateFirstPerson(state: CraftState, dt: number, eyePos: THREE.Vector3): void {
    const p = state.player;
    this.camera.position.copy(eyePos);

    // Head bob
    const speed = Math.sqrt(p.velocity.x ** 2 + p.velocity.z ** 2);
    if (p.onGround && speed > 0.5) {
      this._bobAmplitude = THREE.MathUtils.lerp(this._bobAmplitude, 0.06, dt * 8);
      this._bobPhase += dt * speed * 1.8;
    } else {
      this._bobAmplitude = THREE.MathUtils.lerp(this._bobAmplitude, 0, dt * 8);
    }
    if (this._bobAmplitude > 0.001) {
      this.camera.position.y += Math.sin(this._bobPhase) * this._bobAmplitude;
      this.camera.position.x += Math.cos(this._bobPhase * 0.5) * this._bobAmplitude * 0.3;
    }

    // Damage tilt
    if (p.invulnTimer > 0.3) this._targetTilt = (Math.random() > 0.5 ? 1 : -1) * 0.03;
    else this._targetTilt = 0;
    this._tiltAngle = THREE.MathUtils.lerp(this._tiltAngle, this._targetTilt, dt * 10);

    const euler = new THREE.Euler(p.pitch, p.yaw, this._tiltAngle, "YXZ");
    this.camera.quaternion.setFromEuler(euler);
  }

  // --- Third person (over-shoulder) ---
  private _updateThirdPerson(state: CraftState, _dt: number, eyePos: THREE.Vector3): void {
    const p = state.player;
    const dist = this._thirdPersonDist;
    const height = this._thirdPersonHeight;

    // Camera positioned behind and above the player
    const behind = new THREE.Vector3(
      Math.sin(p.yaw) * dist,
      height,
      Math.cos(p.yaw) * dist,
    );
    this.camera.position.copy(eyePos).add(behind);

    // Look at player's head
    const lookTarget = eyePos.clone().add(new THREE.Vector3(0, 0.3, 0));
    this.camera.lookAt(lookTarget);
  }

  // --- Orbit mode (free camera around player) ---
  private _updateOrbit(_state: CraftState, dt: number, eyePos: THREE.Vector3): void {
    // Slowly orbit around the player for cinematic view
    this._orbitAngle += dt * 0.15;

    const dist = this._orbitDist;
    const camX = eyePos.x + Math.cos(this._orbitAngle) * dist;
    const camZ = eyePos.z + Math.sin(this._orbitAngle) * dist;
    const camY = eyePos.y + dist * 0.5;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(eyePos);
  }

  /** Get forward direction (for first-person interaction). */
  getForward(): THREE.Vector3 {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(this.camera.quaternion);
    return dir;
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
