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

  constructor(camera: THREE.PerspectiveCamera) {
    this._camera = camera;
  }

  /** Process mouse movement delta */
  onMouseMove(dx: number, dy: number, sensitivity: number): void {
    this._yaw -= dx * sensitivity * WB.TURN_SPEED;
    this._pitch -= dy * sensitivity * WB.TURN_SPEED;
    // Clamp pitch
    this._pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 3, this._pitch));
  }

  /** Get the facing direction yaw for the player character */
  get yaw(): number {
    return this._yaw;
  }

  /** Scroll wheel for third-person zoom */
  onScroll(delta: number): void {
    this._orbitDist = Math.max(2, Math.min(12, this._orbitDist + delta * 0.5));
  }

  /** Update camera position/rotation each frame */
  update(state: WarbandState, player: WarbandFighter): void {
    const targetPos = new THREE.Vector3(
      player.position.x,
      player.position.y,
      player.position.z,
    );

    if (!this._initialized) {
      this._smoothPos.copy(targetPos);
      this._yaw = player.rotation;
      this._initialized = true;
    }

    // Smooth follow
    this._smoothPos.lerp(targetPos, 0.15);

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
