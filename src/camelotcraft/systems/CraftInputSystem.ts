// ---------------------------------------------------------------------------
// Camelot Craft – FPS input handler
// ---------------------------------------------------------------------------

import { CB } from "../config/CraftBalance";
import type { CraftState } from "../state/CraftState";
import { isWorldSolid, getWorldBlock, addMessage } from "../state/CraftState";
import { BlockType } from "../config/CraftBlockDefs";
import { dropItem } from "./CraftItemDropSystem";
import * as THREE from "three";

const MAX_PITCH = 89 * (Math.PI / 180);

export class CraftInputSystem {
  keys: Record<string, boolean> = {};
  mouseDown = { left: false, right: false };
  mouseDelta = { x: 0, y: 0 };
  scrollDelta = 0;

  private _onKeyDownFn: ((e: KeyboardEvent) => void) | null = null;
  private _onKeyUpFn: ((e: KeyboardEvent) => void) | null = null;
  private _onMouseDownFn: ((e: MouseEvent) => void) | null = null;
  private _onMouseUpFn: ((e: MouseEvent) => void) | null = null;
  private _onMouseMoveFn: ((e: MouseEvent) => void) | null = null;
  private _onWheelFn: ((e: WheelEvent) => void) | null = null;
  private _onPLChangeFn: (() => void) | null = null;
  private _pointerLocked = false;
  private _invToggleCd = 0;
  private _fallStartY = 0;
  private _wasFalling = false;

  init(): void {
    this._onKeyDownFn = (e) => {
      this.keys[e.code] = true;
      if (["Space", "Tab", "KeyE"].includes(e.code)) e.preventDefault();
    };
    this._onKeyUpFn = (e) => { this.keys[e.code] = false; };
    this._onMouseDownFn = (e) => {
      if (e.button === 0) this.mouseDown.left = true;
      if (e.button === 2) this.mouseDown.right = true;
      if (!this._pointerLocked) this.requestPointerLock();
    };
    this._onMouseUpFn = (e) => {
      if (e.button === 0) this.mouseDown.left = false;
      if (e.button === 2) this.mouseDown.right = false;
    };
    this._onMouseMoveFn = (e) => {
      if (this._pointerLocked) {
        this.mouseDelta.x += e.movementX;
        this.mouseDelta.y += e.movementY;
      }
    };
    this._onWheelFn = (e) => { this.scrollDelta += Math.sign(e.deltaY); e.preventDefault(); };
    this._onPLChangeFn = () => { this._pointerLocked = document.pointerLockElement !== null; };

    document.addEventListener("keydown", this._onKeyDownFn);
    document.addEventListener("keyup", this._onKeyUpFn);
    document.addEventListener("mousedown", this._onMouseDownFn);
    document.addEventListener("mouseup", this._onMouseUpFn);
    document.addEventListener("mousemove", this._onMouseMoveFn);
    document.addEventListener("wheel", this._onWheelFn, { passive: false });
    document.addEventListener("pointerlockchange", this._onPLChangeFn);
    document.addEventListener("contextmenu", this._ctxBlock);
  }

  requestPointerLock(): void {
    (document.querySelector("canvas") || document.body).requestPointerLock();
  }

  update(state: CraftState, dt: number): void {
    if (state.inventoryOpen || state.craftingOpen) return;

    const p = state.player;
    const pos = p.position;
    const vel = p.velocity;

    // --- Mouse look ---
    const sens = 0.002;
    p.yaw -= this.mouseDelta.x * sens;
    p.pitch -= this.mouseDelta.y * sens;
    p.pitch = clamp(p.pitch, -MAX_PITCH, MAX_PITCH);
    p.yaw = ((p.yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // --- Water detection ---
    const feetBlock = getWorldBlock(state, Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
    const eyeBlock = getWorldBlock(state, Math.floor(pos.x), Math.floor(pos.y + CB.PLAYER_EYE_HEIGHT), Math.floor(pos.z));
    const isWaterBlock = (b: BlockType) => b === BlockType.WATER || b === BlockType.HOLY_WATER_SOURCE;
    p.inWater = isWaterBlock(feetBlock) || isWaterBlock(eyeBlock);

    // --- Movement direction ---
    const sinY = Math.sin(p.yaw);
    const cosY = Math.cos(p.yaw);
    let mx = 0, mz = 0;

    if (this.keys["KeyW"]) { mx -= sinY; mz -= cosY; }
    if (this.keys["KeyS"]) { mx += sinY; mz += cosY; }
    if (this.keys["KeyA"]) { mx -= cosY; mz += sinY; }
    if (this.keys["KeyD"]) { mx += cosY; mz -= sinY; }

    const mag = Math.sqrt(mx * mx + mz * mz);
    if (mag > 0) { mx /= mag; mz /= mag; }

    // --- Crouch (Ctrl) ---
    p.crouching = !!(this.keys["ControlLeft"] || this.keys["ControlRight"]);

    // Sprint (Shift) — can't sprint while crouching
    p.sprinting = !p.crouching && !!(this.keys["ShiftLeft"] || this.keys["ShiftRight"]);

    // --- Creative mode flying ---
    if (state.creativeMode) {
      p.flying = true;
      // Space = fly up, Ctrl = fly down
      if (this.keys["Space"]) vel.y = 8;
      else if (this.keys["ControlLeft"] || this.keys["ControlRight"]) vel.y = -8;
      else vel.y = 0;
      // No gravity in creative
    }

    let speed = CB.PLAYER_SPEED;
    if (p.crouching) speed *= 0.4; // slow while crouching
    else if (p.sprinting) speed *= CB.PLAYER_SPRINT_MULT;

    // Water slows movement
    if (p.inWater) speed *= 0.5;

    // Hunger penalty: slow when very hungry
    if (p.hunger <= 2) speed *= 0.6;

    const vx = mx * speed;
    const vz = mz * speed;

    // --- Jump / Swim ---
    if (!state.creativeMode) {
      if (this.keys["Space"]) {
        if (p.inWater) {
          // Swimming: float upward
          vel.y = 3.5;
          p.swimming = true;
        } else if (p.onGround) {
          vel.y = CB.PLAYER_JUMP_VELOCITY;
          p.onGround = false;
        }
      } else {
        p.swimming = false;
      }
    }

    // --- Gravity (reduced in water for buoyancy) ---
    if (!state.creativeMode) {
      if (p.inWater) {
        vel.y += CB.PLAYER_GRAVITY * 0.15 * dt; // much weaker gravity in water
        vel.y *= 0.92; // water drag
      } else {
        vel.y += CB.PLAYER_GRAVITY * dt;
      }
    }

    // --- Integrate with collision + step-up ---
    const halfW = 0.3;
    const height = CB.PLAYER_HEIGHT;

    // X axis with step-up
    const newX = pos.x + vx * dt;
    if (!this._collides(state, newX, pos.y, pos.z, halfW, height)) {
      pos.x = newX;
    } else if (p.onGround && !this._collides(state, newX, pos.y + 0.6, pos.z, halfW, height)) {
      // Step up: can climb 0.6 block ledge automatically
      pos.x = newX;
      pos.y += 0.6;
    }
    vel.x = vx;

    // Z axis with step-up
    const newZ = pos.z + vz * dt;
    if (!this._collides(state, pos.x, pos.y, newZ, halfW, height)) {
      pos.z = newZ;
    } else if (p.onGround && !this._collides(state, pos.x, pos.y + 0.6, newZ, halfW, height)) {
      pos.z = newZ;
      pos.y += 0.6;
    }
    vel.z = vz;

    // --- Track fall start for fall damage ---
    if (!p.onGround && vel.y < -0.5 && !this._wasFalling) {
      this._fallStartY = pos.y;
      this._wasFalling = true;
    }

    // Y axis
    const newY = pos.y + vel.y * dt;
    if (vel.y <= 0) {
      if (isWorldSolid(state, Math.floor(pos.x), Math.floor(newY - 0.01), Math.floor(pos.z))) {
        pos.y = Math.floor(newY) + 1;
        vel.y = 0;

        // --- Fall damage ---
        if (!state.creativeMode && this._wasFalling && !p.inWater) {
          const fallDist = this._fallStartY - pos.y;
          if (fallDist > 3) { // 3+ blocks = damage
            const dmg = Math.floor(fallDist - 3);
            if (dmg > 0) {
              p.hp = Math.max(0, p.hp - dmg);
              if (dmg >= 3) {
                addMessage(state, `Ouch! Fell ${fallDist.toFixed(0)} blocks (-${dmg} HP)`, 0xFF6600);
              }
            }
          }
        }
        this._wasFalling = false;

        p.onGround = true;
      } else {
        pos.y = newY;
        p.onGround = false;
      }
    } else {
      if (isWorldSolid(state, Math.floor(pos.x), Math.floor(newY + height), Math.floor(pos.z))) {
        vel.y = 0;
      } else {
        pos.y = newY;
      }
      this._wasFalling = false;
    }

    // --- Mob collision (push player away from mobs) ---
    for (const mob of state.mobs) {
      const dx = pos.x - mob.position.x;
      const dz = pos.z - mob.position.z;
      const dy = pos.y - mob.position.y;
      const distSq = dx * dx + dz * dz;
      const mobRadius = 0.5;
      if (distSq < mobRadius * mobRadius && Math.abs(dy) < 1.8) {
        const dist = Math.sqrt(distSq) || 0.01;
        const pushX = (dx / dist) * (mobRadius - dist) * 0.5;
        const pushZ = (dz / dist) * (mobRadius - dist) * 0.5;
        pos.x += pushX;
        pos.z += pushZ;
      }
    }

    // --- Fall into void: respawn ---
    if (pos.y < -10) {
      pos.copy(p.spawnPoint);
      vel.set(0, 0, 0);
      p.hp = Math.max(1, p.hp - 5);
    }

    // --- Attack cooldown tick ---
    p.attackTimer = Math.max(0, p.attackTimer - dt);

    // --- Hotbar: number keys ---
    for (let i = 1; i <= 9; i++) {
      if (this.keys[`Digit${i}`]) {
        p.inventory.selectedSlot = i - 1;
      }
    }

    // --- Hotbar: scroll wheel ---
    if (this.scrollDelta !== 0) {
      const s = p.inventory.selectedSlot;
      p.inventory.selectedSlot = ((s + Math.round(this.scrollDelta)) % 9 + 9) % 9;
    }

    // --- Inventory toggle (E) ---
    this._invToggleCd -= dt;
    if (this.keys["KeyE"] && this._invToggleCd <= 0) {
      state.inventoryOpen = !state.inventoryOpen;
      state.craftingOpen = state.inventoryOpen;
      this._invToggleCd = 0.3;
      if (state.inventoryOpen) {
        document.exitPointerLock?.();
      } else {
        this.requestPointerLock();
      }
    }

    // --- Eat food (Q key) ---
    if (this.keys["KeyQ"] && !this._eatCd) {
      this._eatCd = true;
      this._tryEatFood(state);
    }
    if (!this.keys["KeyQ"]) this._eatCd = false;

    // --- Drop/throw item (G key) ---
    if (this.keys["KeyG"] && !this._dropCd) {
      this._dropCd = true;
      this._tryDropItem(state);
    }
    if (!this.keys["KeyG"]) this._dropCd = false;

    // --- Shield blocking (hold right mouse while having weapon) ---
    const pInv = p.inventory;
    const heldForBlock = pInv.hotbar[pInv.selectedSlot];
    p.blocking = this._pointerLocked && this.mouseDown.right &&
      heldForBlock !== null &&
      (heldForBlock.itemType === "weapon" || heldForBlock.specialId === "iron_shield");
  }

  private _eatCd = false;
  private _dropCd = false;

  private _tryEatFood(state: CraftState): void {
    const inv = state.player.inventory;
    const held = inv.hotbar[inv.selectedSlot];
    if (held && held.itemType === "food" && state.player.hunger < state.player.maxHunger) {
      // Different foods restore different amounts
      const foodValues: Record<string, { hunger: number; hp?: number }> = {
        apple: { hunger: 4 },
        stew: { hunger: 6, hp: 2 },
        bread: { hunger: 5 },
        golden_apple: { hunger: 8, hp: 6 },
        enchanted_berry: { hunger: 3, hp: 4 },
        feast: { hunger: 12, hp: 4 },
      };
      const fv = foodValues[held.specialId ?? ""] ?? { hunger: 4 };
      state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + fv.hunger);
      if (fv.hp) state.player.hp = Math.min(state.player.maxHp, state.player.hp + fv.hp);

      addMessage(state, `Ate ${held.displayName} (+${fv.hunger} hunger${fv.hp ? `, +${fv.hp} HP` : ""})`, 0x4CAF50);
      held.count--;
      if (held.count <= 0) inv.hotbar[inv.selectedSlot] = null;
    }
  }

  private _tryDropItem(state: CraftState): void {
    const inv = state.player.inventory;
    const held = inv.hotbar[inv.selectedSlot];
    if (!held || held.count <= 0) return;

    // Drop 1 item in the direction the player is facing
    const sinY = Math.sin(state.player.yaw);
    const cosY = Math.cos(state.player.yaw);
    const dropPos = new THREE.Vector3(
      state.player.position.x - sinY * 1.5,
      state.player.position.y + CB.PLAYER_EYE_HEIGHT,
      state.player.position.z - cosY * 1.5,
    );
    const throwVel = new THREE.Vector3(-sinY * 5, 2, -cosY * 5);
    dropItem({ ...held, count: 1 }, dropPos, throwVel);

    held.count--;
    if (held.count <= 0) inv.hotbar[inv.selectedSlot] = null;
    addMessage(state, `Dropped ${held.displayName}`, 0xAAAAAA);
  }

  resetDeltas(): void {
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    this.scrollDelta = 0;
  }

  destroy(): void {
    if (this._onKeyDownFn) document.removeEventListener("keydown", this._onKeyDownFn);
    if (this._onKeyUpFn) document.removeEventListener("keyup", this._onKeyUpFn);
    if (this._onMouseDownFn) document.removeEventListener("mousedown", this._onMouseDownFn);
    if (this._onMouseUpFn) document.removeEventListener("mouseup", this._onMouseUpFn);
    if (this._onMouseMoveFn) document.removeEventListener("mousemove", this._onMouseMoveFn);
    if (this._onWheelFn) document.removeEventListener("wheel", this._onWheelFn);
    if (this._onPLChangeFn) document.removeEventListener("pointerlockchange", this._onPLChangeFn);
    document.removeEventListener("contextmenu", this._ctxBlock);
    if (document.pointerLockElement) document.exitPointerLock();
    this.keys = {};
    this.mouseDown = { left: false, right: false };
  }

  private _collides(state: CraftState, cx: number, y: number, cz: number, hw: number, h: number): boolean {
    const x0 = Math.floor(cx - hw), x1 = Math.floor(cx + hw);
    const z0 = Math.floor(cz - hw), z1 = Math.floor(cz + hw);
    const y0 = Math.floor(y), y1 = Math.floor(y + h);
    for (let bx = x0; bx <= x1; bx++)
      for (let bz = z0; bz <= z1; bz++)
        for (let by = y0; by <= y1; by++)
          if (isWorldSolid(state, bx, by, bz)) return true;
    return false;
  }

  private _ctxBlock = (e: Event) => e.preventDefault();
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
