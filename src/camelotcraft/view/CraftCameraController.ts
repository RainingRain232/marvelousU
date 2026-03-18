// ---------------------------------------------------------------------------
// Camelot Craft – First-person camera controller
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { CB } from "../config/CraftBalance";
import type { CraftState } from "../state/CraftState";

export class CraftCameraController {
  readonly camera: THREE.PerspectiveCamera;
  private _bobPhase = 0;
  private _bobAmplitude = 0;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
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

    // Head bob while moving on ground
    const speed = Math.sqrt(p.velocity.x ** 2 + p.velocity.z ** 2);
    if (p.onGround && speed > 0.5) {
      this._bobAmplitude = THREE.MathUtils.lerp(this._bobAmplitude, 0.06, dt * 8);
      this._bobPhase += dt * speed * 1.8;
    } else {
      this._bobAmplitude = THREE.MathUtils.lerp(this._bobAmplitude, 0, dt * 8);
    }

    if (this._bobAmplitude > 0.001) {
      this.camera.position.y += Math.sin(this._bobPhase) * this._bobAmplitude;
    }

    // Build rotation quaternion from yaw/pitch
    const euler = new THREE.Euler(p.pitch, p.yaw, 0, "YXZ");
    this.camera.quaternion.setFromEuler(euler);

    // Update aspect ratio
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
