// ---------------------------------------------------------------------------
// Settlers – Top-down camera controller
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { SB } from "../config/SettlersBalance";

export class SettlersCameraController {
  private _camera: THREE.PerspectiveCamera;

  // Target (look-at point on ground plane)
  private _targetX: number;
  private _targetZ: number;

  // Orbit
  private _yaw = Math.PI * 0.25; // rotation around Y axis
  private _pitch = Math.PI * 0.35; // angle from horizontal (radians, 0=flat, PI/2=directly above)
  private _distance = 40; // distance from target

  // Smooth interpolation
  private _smoothTargetX: number;
  private _smoothTargetZ: number;
  private _smoothYaw: number;
  private _smoothPitch: number;
  private _smoothDist: number;

  // Input state
  private _keys = { w: false, a: false, s: false, d: false, q: false, e: false };
  private _panSpeed = 30; // world units per second

  // Limits
  private _minDist = 10;
  private _maxDist = 80;
  private readonly _minPitch = 0.2;
  private readonly _maxPitch = Math.PI * 0.45;

  // Map bounds
  private _mapW: number;
  private _mapH: number;

  constructor(camera: THREE.PerspectiveCamera) {
    this._camera = camera;
    this._mapW = SB.MAP_WIDTH * SB.TILE_SIZE;
    this._mapH = SB.MAP_HEIGHT * SB.TILE_SIZE;
    this._targetX = this._mapW * 0.5;
    this._targetZ = this._mapH * 0.5;
    this._smoothTargetX = this._targetX;
    this._smoothTargetZ = this._targetZ;
    this._smoothYaw = this._yaw;
    this._smoothPitch = this._pitch;
    this._smoothDist = this._distance;
    this._applyCamera();
  }

  // --- Input handlers (call from SettlersInputSystem) ---

  onKeyDown(code: string): void {
    switch (code) {
      case "KeyW": case "ArrowUp":    this._keys.w = true; break;
      case "KeyA": case "ArrowLeft":  this._keys.a = true; break;
      case "KeyS": case "ArrowDown":  this._keys.s = true; break;
      case "KeyD": case "ArrowRight": this._keys.d = true; break;
      case "KeyQ": this._keys.q = true; break;
      case "KeyE": this._keys.e = true; break;
    }
  }

  onKeyUp(code: string): void {
    switch (code) {
      case "KeyW": case "ArrowUp":    this._keys.w = false; break;
      case "KeyA": case "ArrowLeft":  this._keys.a = false; break;
      case "KeyS": case "ArrowDown":  this._keys.s = false; break;
      case "KeyD": case "ArrowRight": this._keys.d = false; break;
      case "KeyQ": this._keys.q = false; break;
      case "KeyE": this._keys.e = false; break;
    }
  }

  onWheel(deltaY: number): void {
    this._distance += deltaY * 0.05;
    this._distance = Math.max(this._minDist, Math.min(this._maxDist, this._distance));
  }

  /** Set camera target to world position */
  lookAt(x: number, z: number): void {
    this._targetX = x;
    this._targetZ = z;
  }

  get camera(): THREE.PerspectiveCamera { return this._camera; }

  update(dt: number): void {
    // Pan based on WASD relative to camera yaw
    const forward = -Math.cos(this._yaw);
    const right = Math.sin(this._yaw);
    const forwardX = -Math.sin(this._yaw);
    const rightX = Math.cos(this._yaw) * -1;

    let dx = 0;
    let dz = 0;
    if (this._keys.w) { dx += forwardX; dz += forward; }
    if (this._keys.s) { dx -= forwardX; dz -= forward; }
    if (this._keys.a) { dx -= rightX; dz -= right; }
    if (this._keys.d) { dx += rightX; dz += right; }

    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      const speed = this._panSpeed * dt * (this._distance / 40); // faster when zoomed out
      this._targetX += (dx / len) * speed;
      this._targetZ += (dz / len) * speed;
    }

    // Rotate
    if (this._keys.q) this._yaw -= 1.5 * dt;
    if (this._keys.e) this._yaw += 1.5 * dt;

    // Clamp pitch
    this._pitch = Math.max(this._minPitch, Math.min(this._maxPitch, this._pitch));

    // Clamp target to map bounds
    this._targetX = Math.max(0, Math.min(this._mapW, this._targetX));
    this._targetZ = Math.max(0, Math.min(this._mapH, this._targetZ));

    // Smooth interpolation
    const lerp = 1 - Math.pow(0.001, dt);
    this._smoothTargetX += (this._targetX - this._smoothTargetX) * lerp;
    this._smoothTargetZ += (this._targetZ - this._smoothTargetZ) * lerp;
    this._smoothYaw += (this._yaw - this._smoothYaw) * lerp;
    this._smoothPitch += (this._pitch - this._smoothPitch) * lerp;
    this._smoothDist += (this._distance - this._smoothDist) * lerp;

    this._applyCamera();
  }

  private _applyCamera(): void {
    const camX = this._smoothTargetX + Math.sin(this._smoothYaw) * Math.cos(this._smoothPitch) * this._smoothDist;
    const camY = Math.sin(this._smoothPitch) * this._smoothDist;
    const camZ = this._smoothTargetZ + Math.cos(this._smoothYaw) * Math.cos(this._smoothPitch) * this._smoothDist;

    this._camera.position.set(camX, camY, camZ);
    this._camera.lookAt(this._smoothTargetX, 0, this._smoothTargetZ);
  }
}
