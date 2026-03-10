// ---------------------------------------------------------------------------
// Warband mode – camera controller (first-person & third-person)
// ---------------------------------------------------------------------------

import * as THREE from "three";
import {
  type WarbandFighter,
  type WarbandState,
  CameraMode,
} from "../state/WarbandState";
import { WB } from "../config/WarbandBalanceConfig";

export class WarbandCameraController {
  private _camera: THREE.PerspectiveCamera;
  private _yaw = 0; // horizontal rotation
  private _pitch = 0; // vertical rotation
  private _smoothPos = new THREE.Vector3();
  private _initialized = false;

  // Third person orbit
  private _orbitDist = WB.THIRD_PERSON_DIST;

  // Free orbit mode (camera view) — IJKL controls
  private _freeOrbit = false;
  private _freeYaw = 0;
  private _freePitch = 0.3; // slightly above
  private _freeOrbitDist = 4;
  private _orbitKeys = { i: false, k: false, j: false, l: false, u: false, o: false };
  private _onOrbitKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _onOrbitKeyUp: ((e: KeyboardEvent) => void) | null = null;

  constructor(camera: THREE.PerspectiveCamera) {
    this._camera = camera;
  }

  /** Process mouse movement delta */
  onMouseMove(dx: number, dy: number, sensitivity: number): void {
    if (this._freeOrbit) {
      // In free orbit, mouse also controls orbit (in addition to IJKL)
      this._freeYaw -= dx * sensitivity * WB.TURN_SPEED;
      this._freePitch -= dy * sensitivity * WB.TURN_SPEED;
      this._freePitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 2.5, this._freePitch));
      return;
    }
    this._yaw -= dx * sensitivity * WB.TURN_SPEED;
    this._pitch -= dy * sensitivity * WB.TURN_SPEED;
    // Clamp pitch
    this._pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 3, this._pitch));
  }

  /** Get the facing direction yaw for the player character */
  get yaw(): number {
    return this._yaw;
  }

  /** Whether free orbit mode is active */
  get freeOrbit(): boolean {
    return this._freeOrbit;
  }

  /** Scroll wheel for third-person zoom */
  onScroll(delta: number): void {
    if (this._freeOrbit) {
      this._freeOrbitDist = Math.max(1.5, Math.min(15, this._freeOrbitDist + delta * 0.5));
      return;
    }
    this._orbitDist = Math.max(2, Math.min(12, this._orbitDist + delta * 0.5));
  }

  /** Enable/disable free orbit mode (for camera view) */
  setFreeOrbit(enabled: boolean): void {
    this._freeOrbit = enabled;
    if (enabled) {
      this._freeYaw = Math.PI; // start looking at front of player
      this._freePitch = 0.3;
      this._freeOrbitDist = 4;

      this._onOrbitKeyDown = (e: KeyboardEvent) => {
        switch (e.code) {
          case "KeyI": this._orbitKeys.i = true; break;
          case "KeyK": this._orbitKeys.k = true; break;
          case "KeyJ": this._orbitKeys.j = true; break;
          case "KeyL": this._orbitKeys.l = true; break;
          case "KeyU": this._orbitKeys.u = true; break;
          case "KeyO": this._orbitKeys.o = true; break;
        }
      };
      this._onOrbitKeyUp = (e: KeyboardEvent) => {
        switch (e.code) {
          case "KeyI": this._orbitKeys.i = false; break;
          case "KeyK": this._orbitKeys.k = false; break;
          case "KeyJ": this._orbitKeys.j = false; break;
          case "KeyL": this._orbitKeys.l = false; break;
          case "KeyU": this._orbitKeys.u = false; break;
          case "KeyO": this._orbitKeys.o = false; break;
        }
      };
      window.addEventListener("keydown", this._onOrbitKeyDown);
      window.addEventListener("keyup", this._onOrbitKeyUp);
    } else {
      if (this._onOrbitKeyDown) {
        window.removeEventListener("keydown", this._onOrbitKeyDown);
        this._onOrbitKeyDown = null;
      }
      if (this._onOrbitKeyUp) {
        window.removeEventListener("keyup", this._onOrbitKeyUp);
        this._onOrbitKeyUp = null;
      }
    }
  }

  /** Update camera position/rotation each frame */
  update(state: WarbandState, player: WarbandFighter): void {
    // Add mount height offset so camera follows the rider, not the ground
    const mountOffset = player.isMounted ? WB.HORSE_HEIGHT : 0;
    const targetPos = new THREE.Vector3(
      player.position.x,
      player.position.y + mountOffset,
      player.position.z,
    );

    if (!this._initialized) {
      this._smoothPos.copy(targetPos);
      this._yaw = player.rotation;
      this._initialized = true;
    }

    // Smooth follow
    this._smoothPos.lerp(targetPos, 0.15);

    // Free orbit mode (camera view)
    if (this._freeOrbit) {
      const orbitSpeed = 0.04;
      if (this._orbitKeys.j) this._freeYaw += orbitSpeed;
      if (this._orbitKeys.l) this._freeYaw -= orbitSpeed;
      if (this._orbitKeys.i) this._freePitch += orbitSpeed;
      if (this._orbitKeys.k) this._freePitch -= orbitSpeed;
      if (this._orbitKeys.u) this._freeOrbitDist = Math.max(1.5, this._freeOrbitDist - 0.1);
      if (this._orbitKeys.o) this._freeOrbitDist = Math.min(15, this._freeOrbitDist + 0.1);

      this._freePitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 2.5, this._freePitch));

      const camX = this._smoothPos.x -
        Math.sin(this._freeYaw) * Math.cos(this._freePitch) * this._freeOrbitDist;
      const camY = this._smoothPos.y +
        WB.FIGHTER_HEIGHT * 0.5 +
        Math.sin(this._freePitch) * this._freeOrbitDist;
      const camZ = this._smoothPos.z -
        Math.cos(this._freeYaw) * Math.cos(this._freePitch) * this._freeOrbitDist;

      this._camera.position.set(camX, Math.max(0.3, camY), camZ);
      this._camera.lookAt(
        this._smoothPos.x,
        this._smoothPos.y + WB.FIGHTER_HEIGHT * 0.5,
        this._smoothPos.z,
      );
      return;
    }

    if (state.cameraMode === CameraMode.FIRST_PERSON) {
      // First-person: camera at head height, looking forward
      this._camera.position.set(
        this._smoothPos.x,
        this._smoothPos.y + WB.FIRST_PERSON_HEIGHT,
        this._smoothPos.z,
      );

      // Look direction from yaw/pitch
      const lookX =
        this._smoothPos.x + Math.sin(this._yaw) * Math.cos(this._pitch);
      const lookY =
        this._smoothPos.y + WB.FIRST_PERSON_HEIGHT + Math.sin(this._pitch);
      const lookZ =
        this._smoothPos.z + Math.cos(this._yaw) * Math.cos(this._pitch);

      this._camera.lookAt(lookX, lookY, lookZ);
    } else {
      // Third-person: orbit behind player
      const camX =
        this._smoothPos.x -
        Math.sin(this._yaw) * Math.cos(this._pitch) * this._orbitDist;
      const camY =
        this._smoothPos.y +
        WB.THIRD_PERSON_HEIGHT +
        Math.sin(this._pitch) * this._orbitDist * 0.5;
      const camZ =
        this._smoothPos.z -
        Math.cos(this._yaw) * Math.cos(this._pitch) * this._orbitDist;

      this._camera.position.set(camX, Math.max(0.5, camY), camZ);
      this._camera.lookAt(
        this._smoothPos.x,
        this._smoothPos.y + WB.FIGHTER_HEIGHT * 0.7,
        this._smoothPos.z,
      );
    }
  }
}
