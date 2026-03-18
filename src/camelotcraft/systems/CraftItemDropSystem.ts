// ---------------------------------------------------------------------------
// Camelot Craft – Item drop system
// ---------------------------------------------------------------------------
// Manages items dropped on the ground (when inventory is full, player dies,
// or a mob drops loot). Items float, bob, and can be auto-picked up by the
// player when within range.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import type { CraftState } from "../state/CraftState";
import type { ItemStack } from "../config/CraftRecipeDefs";
import { addToInventory } from "../state/CraftInventory";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DroppedItem {
  id: number;
  item: ItemStack;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;      // seconds remaining before despawn
  bobPhase: number;  // for floating animation
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const _droppedItems: DroppedItem[] = [];
let _nextDropId = 1;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DROP_LIFE = 300;          // 5 minutes before despawn
const GRAVITY = 15;             // downward acceleration (blocks/s^2)
const DAMPING = 0.95;           // velocity multiplier per frame
const BOB_SPEED = 2;            // phase radians per second
const PICKUP_DISTANCE = 2;     // auto-pickup radius in blocks
const SCATTER_HORIZONTAL = 3;  // max horizontal scatter velocity
const SCATTER_VERTICAL_MIN = 4;
const SCATTER_VERTICAL_MAX = 7;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Spawn a dropped item at the given world position.
 * If no velocity is provided, a random upward scatter is applied.
 */
export function dropItem(
  item: ItemStack,
  position: THREE.Vector3,
  velocity?: THREE.Vector3,
): void {
  const vel = velocity
    ? velocity.clone()
    : new THREE.Vector3(
        (Math.random() - 0.5) * SCATTER_HORIZONTAL,
        SCATTER_VERTICAL_MIN + Math.random() * (SCATTER_VERTICAL_MAX - SCATTER_VERTICAL_MIN),
        (Math.random() - 0.5) * SCATTER_HORIZONTAL,
      );

  _droppedItems.push({
    id: _nextDropId++,
    item: { ...item },
    position: position.clone(),
    velocity: vel,
    life: DROP_LIFE,
    bobPhase: Math.random() * Math.PI * 2,
  });
}

/**
 * Tick all dropped items: physics, bobbing, auto-pickup, and despawn.
 */
export function updateDroppedItems(state: CraftState, dt: number): void {
  const playerPos = state.player.position;

  for (let i = _droppedItems.length - 1; i >= 0; i--) {
    const drop = _droppedItems[i];

    // --- Countdown ---
    drop.life -= dt;
    if (drop.life <= 0) {
      _droppedItems.splice(i, 1);
      continue;
    }

    // --- Gravity ---
    drop.velocity.y -= GRAVITY * dt;

    // --- Movement ---
    drop.position.x += drop.velocity.x * dt;
    drop.position.y += drop.velocity.y * dt;
    drop.position.z += drop.velocity.z * dt;

    // --- Floor collision (simple: don't fall below y = 0) ---
    if (drop.position.y < 0.25) {
      drop.position.y = 0.25;
      drop.velocity.y = 0;
    }

    // --- Damping ---
    drop.velocity.x *= DAMPING;
    drop.velocity.y *= DAMPING;
    drop.velocity.z *= DAMPING;

    // --- Bob animation ---
    drop.bobPhase += dt * BOB_SPEED;

    // --- Auto-pickup ---
    const dx = drop.position.x - playerPos.x;
    const dy = drop.position.y - playerPos.y;
    const dz = drop.position.z - playerPos.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq <= PICKUP_DISTANCE * PICKUP_DISTANCE) {
      const leftover = addToInventory(state.player.inventory, drop.item);
      if (leftover < drop.item.count) {
        // Some or all items were picked up
        if (leftover <= 0) {
          // Fully picked up — remove drop
          _droppedItems.splice(i, 1);
          playPickupSound();
        } else {
          // Partially picked up — update remaining count
          drop.item.count = leftover;
          playPickupSound();
        }
      }
      // If leftover === drop.item.count, inventory was full — leave on ground
    }
  }
}

/**
 * Return the current list of dropped items (for the renderer to display).
 */
export function getDroppedItems(): DroppedItem[] {
  return _droppedItems;
}

/**
 * Remove all dropped items (e.g. on world reset).
 */
export function clearDroppedItems(): void {
  _droppedItems.length = 0;
}

// ---------------------------------------------------------------------------
// Internal – pickup sound
// ---------------------------------------------------------------------------

let _pickupCtx: AudioContext | null = null;

function playPickupSound(): void {
  try {
    if (!_pickupCtx) {
      _pickupCtx = new AudioContext();
    }
    const ctx = _pickupCtx;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch {
    // Audio may not be available — fail silently
  }
}
