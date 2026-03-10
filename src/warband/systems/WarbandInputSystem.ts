// ---------------------------------------------------------------------------
// Warband mode – input system
// WASD movement, mouse look, arrow keys for directional attacks, RMB block
// ---------------------------------------------------------------------------

import {
  type WarbandState,
  type WarbandFighter,
  CombatDirection,
  FighterCombatState,
  CameraMode,
  WarbandPhase,
} from "../state/WarbandState";
import { WB } from "../config/WarbandBalanceConfig";
import { isRangedWeapon } from "../config/WeaponDefs";
import type { WarbandCameraController } from "../view/WarbandCameraController";

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  block: boolean; // RMB
  pickup: boolean; // E key
  toggleCamera: boolean; // V key
  mouseX: number;
  mouseY: number;
  mouseDX: number;
  mouseDY: number;

  // Arrow key attacks (hold = windup, release = swing)
  attackLeft: boolean;
  attackRight: boolean;
  attackUp: boolean;
  attackDown: boolean;
}

export class WarbandInputSystem {
  private _input: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    block: false,
    pickup: false,
    toggleCamera: false,
    mouseX: 0,
    mouseY: 0,
    mouseDX: 0,
    mouseDY: 0,
    attackLeft: false,
    attackRight: false,
    attackUp: false,
    attackDown: false,
  };

  private _pointerLocked = false;
  private _canvas: HTMLCanvasElement | null = null;
  private _cameraModeToggled = false;

  // Track which arrow key initiated the current windup
  private _windupKey: "left" | "right" | "up" | "down" | null = null;

  // Bound handlers for cleanup
  private _onKeyDown: (e: KeyboardEvent) => void;
  private _onKeyUp: (e: KeyboardEvent) => void;
  private _onMouseDown: (e: MouseEvent) => void;
  private _onMouseUp: (e: MouseEvent) => void;
  private _onMouseMove: (e: MouseEvent) => void;
  private _onWheel: (e: WheelEvent) => void;
  private _onPointerLockChange: () => void;
  private _onClick: () => void;

  private _cameraController: WarbandCameraController | null = null;

  constructor() {
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onKeyUp = this._handleKeyUp.bind(this);
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onWheel = this._handleWheel.bind(this);
    this._onPointerLockChange = this._handlePointerLockChange.bind(this);
    this._onClick = this._handleClick.bind(this);
  }

  init(canvas: HTMLCanvasElement, cameraCtrl: WarbandCameraController): void {
    this._canvas = canvas;
    this._cameraController = cameraCtrl;

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    canvas.addEventListener("mousedown", this._onMouseDown);
    canvas.addEventListener("mouseup", this._onMouseUp);
    window.addEventListener("mousemove", this._onMouseMove);
    canvas.addEventListener("wheel", this._onWheel);
    document.addEventListener("pointerlockchange", this._onPointerLockChange);
    canvas.addEventListener("click", this._onClick);
  }

  get input(): InputState {
    return this._input;
  }

  get isPointerLocked(): boolean {
    return this._pointerLocked;
  }

  /** Apply input to player fighter each tick */
  update(state: WarbandState): void {
    if (state.phase !== WarbandPhase.BATTLE) return;

    const player = state.fighters.find((f) => f.id === state.playerId);
    if (!player || player.combatState === FighterCombatState.DEAD) return;

    // Camera toggle
    if (this._input.toggleCamera && !this._cameraModeToggled) {
      this._cameraModeToggled = true;
      state.cameraMode =
        state.cameraMode === CameraMode.FIRST_PERSON
          ? CameraMode.THIRD_PERSON
          : CameraMode.FIRST_PERSON;
    }
    if (!this._input.toggleCamera) {
      this._cameraModeToggled = false;
    }

    // Player facing direction follows camera yaw
    if (this._cameraController) {
      player.rotation = this._cameraController.yaw;
    }

    // Movement
    this._applyMovement(player, state);

    // Arrow key attack: hold to windup, release to swing
    this._handleArrowAttacks(player);

    // Block (RMB)
    if (this._input.block) {
      if (
        player.combatState === FighterCombatState.IDLE ||
        player.combatState === FighterCombatState.RECOVERY
      ) {
        player.combatState = FighterCombatState.BLOCKING;
        player.stateTimer = 999;
      }
    } else if (player.combatState === FighterCombatState.BLOCKING) {
      player.combatState = FighterCombatState.IDLE;
      player.stateTimer = 0;
    }

    // Pickup
    if (this._input.pickup) {
      this._tryPickup(player, state);
    }

    // Reset mouse deltas
    this._input.mouseDX = 0;
    this._input.mouseDY = 0;
  }

  private _handleArrowAttacks(player: WarbandFighter): void {
    const wpn = player.equipment.mainHand;

    // Determine which arrow key is pressed (priority: most recent)
    let activeKey: "left" | "right" | "up" | "down" | null = null;
    if (this._input.attackLeft) activeKey = "left";
    if (this._input.attackRight) activeKey = "right";
    if (this._input.attackUp) activeKey = "up";
    if (this._input.attackDown) activeKey = "down";

    const dirMap: Record<string, CombatDirection> = {
      left: CombatDirection.LEFT_SWING,
      right: CombatDirection.RIGHT_SWING,
      up: CombatDirection.OVERHEAD,
      down: CombatDirection.STAB,
    };

    // Start windup when arrow key pressed and idle
    if (activeKey && player.combatState === FighterCombatState.IDLE) {
      if (wpn && isRangedWeapon(wpn)) {
        // Ranged: start drawing
        player.combatState = FighterCombatState.DRAWING;
        player.stateTimer = wpn.drawTime ?? 30;
        player.attackDirection = dirMap[activeKey];
      } else {
        // Melee: enter windup (held)
        player.combatState = FighterCombatState.WINDING;
        player.attackDirection = dirMap[activeKey];
        player.stateTimer = 999; // hold indefinitely until released
        if (player.stamina >= WB.STAMINA_ATTACK_COST) {
          player.stamina -= WB.STAMINA_ATTACK_COST;
        }
      }
      this._windupKey = activeKey;
    }

    // While winding, update direction if a different arrow is pressed
    if (
      player.combatState === FighterCombatState.WINDING &&
      activeKey &&
      activeKey !== this._windupKey
    ) {
      player.attackDirection = dirMap[activeKey];
      this._windupKey = activeKey;
    }

    // Release: when the windup key is released, trigger the swing
    if (player.combatState === FighterCombatState.WINDING && this._windupKey) {
      const keyStillHeld =
        (this._windupKey === "left" && this._input.attackLeft) ||
        (this._windupKey === "right" && this._input.attackRight) ||
        (this._windupKey === "up" && this._input.attackUp) ||
        (this._windupKey === "down" && this._input.attackDown);

      if (!keyStillHeld) {
        // Release the swing
        player.combatState = FighterCombatState.RELEASING;
        const speedMult = wpn?.speed ?? 1;
        player.stateTimer = Math.round(WB.RELEASE_TICKS_BASE / speedMult);
        this._windupKey = null;
      }
    }

    // Ranged: release on key up
    if (player.combatState === FighterCombatState.DRAWING && !activeKey) {
      if (player.stateTimer <= 0) {
        player.combatState = FighterCombatState.RELEASING;
        player.stateTimer = 3;
      } else {
        // Cancelled draw
        player.combatState = FighterCombatState.IDLE;
        player.stateTimer = 0;
      }
      this._windupKey = null;
    }
  }

  private _applyMovement(player: WarbandFighter, _state: WarbandState): void {
    const isSprinting =
      this._input.sprint &&
      this._input.forward &&
      player.stamina > WB.STAMINA_SPRINT_COST * 2;

    const speed = isSprinting ? WB.RUN_SPEED : WB.WALK_SPEED;
    const strafeSpeed = WB.STRAFE_SPEED;
    const backSpeed = WB.BACK_SPEED;

    let moveX = 0;
    let moveZ = 0;

    const sinR = Math.sin(player.rotation);
    const cosR = Math.cos(player.rotation);

    if (this._input.forward) {
      moveX += sinR * speed;
      moveZ += cosR * speed;
    }
    if (this._input.backward) {
      moveX -= sinR * backSpeed;
      moveZ -= cosR * backSpeed;
    }
    if (this._input.left) {
      moveX += cosR * strafeSpeed;
      moveZ -= sinR * strafeSpeed;
    }
    if (this._input.right) {
      moveX -= cosR * strafeSpeed;
      moveZ += sinR * strafeSpeed;
    }

    // Normalize diagonal
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > speed) {
      moveX = (moveX / len) * speed;
      moveZ = (moveZ / len) * speed;
    }

    // Apply weight penalty from armor
    let totalWeight = player.equipment.mainHand?.weight ?? 0;
    totalWeight += player.equipment.offHand?.weight ?? 0;
    for (const piece of Object.values(player.equipment.armor)) {
      if (piece) totalWeight += piece.weight;
    }
    const weightPenalty = Math.max(0.5, 1 - totalWeight * 0.012);

    player.velocity.x = moveX * weightPenalty;
    player.velocity.z = moveZ * weightPenalty;

    // Jump
    if (this._input.jump && player.onGround) {
      player.velocity.y = WB.JUMP_VELOCITY;
      player.onGround = false;
    }

    // Sprint stamina cost
    if (isSprinting) {
      player.stamina -= WB.STAMINA_SPRINT_COST;
    }

    // Walk cycle animation
    if (len > 0.5) {
      player.walkCycle = (player.walkCycle + len * 0.02) % 1;
    }
  }

  private _tryPickup(player: WarbandFighter, state: WarbandState): void {
    const pickupRange = 2.0;
    for (let i = state.pickups.length - 1; i >= 0; i--) {
      const pickup = state.pickups[i];
      const dx = player.position.x - pickup.position.x;
      const dz = player.position.z - pickup.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < pickupRange) {
        // Swap weapons
        const oldWeapon = player.equipment.mainHand;
        player.equipment.mainHand = pickup.weapon;
        if (oldWeapon) {
          pickup.weapon = oldWeapon;
        } else {
          state.pickups.splice(i, 1);
        }
        break;
      }
    }
  }

  // ---- Raw input handlers -------------------------------------------------

  private _handleKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case "KeyW":
        this._input.forward = true;
        break;
      case "KeyS":
        this._input.backward = true;
        break;
      case "KeyA":
        this._input.left = true;
        break;
      case "KeyD":
        this._input.right = true;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this._input.sprint = true;
        break;
      case "Space":
        this._input.jump = true;
        e.preventDefault();
        break;
      case "KeyE":
        this._input.pickup = true;
        break;
      case "KeyV":
        this._input.toggleCamera = true;
        break;
      case "ArrowLeft":
        this._input.attackLeft = true;
        e.preventDefault();
        break;
      case "ArrowRight":
        this._input.attackRight = true;
        e.preventDefault();
        break;
      case "ArrowUp":
        this._input.attackUp = true;
        e.preventDefault();
        break;
      case "ArrowDown":
        this._input.attackDown = true;
        e.preventDefault();
        break;
    }
  }

  private _handleKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case "KeyW":
        this._input.forward = false;
        break;
      case "KeyS":
        this._input.backward = false;
        break;
      case "KeyA":
        this._input.left = false;
        break;
      case "KeyD":
        this._input.right = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this._input.sprint = false;
        break;
      case "Space":
        this._input.jump = false;
        break;
      case "KeyE":
        this._input.pickup = false;
        break;
      case "KeyV":
        this._input.toggleCamera = false;
        break;
      case "ArrowLeft":
        this._input.attackLeft = false;
        break;
      case "ArrowRight":
        this._input.attackRight = false;
        break;
      case "ArrowUp":
        this._input.attackUp = false;
        break;
      case "ArrowDown":
        this._input.attackDown = false;
        break;
    }
  }

  private _handleMouseDown(e: MouseEvent): void {
    if (e.button === 2) this._input.block = true;
  }

  private _handleMouseUp(e: MouseEvent): void {
    if (e.button === 2) this._input.block = false;
  }

  private _handleMouseMove(e: MouseEvent): void {
    this._input.mouseX = e.clientX;
    this._input.mouseY = e.clientY;

    if (this._pointerLocked) {
      this._input.mouseDX += e.movementX;
      this._input.mouseDY += e.movementY;

      // Send deltas to camera controller
      if (this._cameraController) {
        this._cameraController.onMouseMove(e.movementX, e.movementY, 1.0);
      }
    }
  }

  private _handleWheel(e: WheelEvent): void {
    e.preventDefault();
    if (this._cameraController) {
      this._cameraController.onScroll(e.deltaY > 0 ? 1 : -1);
    }
  }

  private _handlePointerLockChange(): void {
    this._pointerLocked = document.pointerLockElement === this._canvas;
  }

  private _handleClick(): void {
    if (!this._pointerLocked && this._canvas) {
      this._canvas.requestPointerLock();
    }
  }

  destroy(): void {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener(
      "pointerlockchange",
      this._onPointerLockChange,
    );
    if (this._canvas) {
      this._canvas.removeEventListener("mousedown", this._onMouseDown);
      this._canvas.removeEventListener("mouseup", this._onMouseUp);
      this._canvas.removeEventListener("wheel", this._onWheel);
      this._canvas.removeEventListener("click", this._onClick);
    }
    if (this._pointerLocked) {
      document.exitPointerLock();
    }
  }
}
