// ---------------------------------------------------------------------------
// Terraria – Entity interfaces
// ---------------------------------------------------------------------------

import type { ItemStack } from "./TerrariaInventory";

// ---------------------------------------------------------------------------
// Mobs
// ---------------------------------------------------------------------------

export type MobAIState = "idle" | "patrol" | "chase" | "attack" | "flee";

export interface MobInstance {
  id: number;
  type: string;
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  facingRight: boolean;
  onGround: boolean;
  aiState: MobAIState;
  aiTimer: number;
  attackTimer: number;
  hurtTimer: number;
  despawnTimer: number;
  width: number;
  height: number;
  isBoss: boolean;
}

// ---------------------------------------------------------------------------
// NPCs
// ---------------------------------------------------------------------------

export interface NPCInstance {
  id: number;
  type: string;
  name: string;
  x: number; y: number;
  vx: number; vy: number;
  facingRight: boolean;
  onGround: boolean;
  hp: number; maxHp: number;
  dialogue: string[];
  shopItems?: ItemStack[];
}

// ---------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------

export interface Projectile {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  damage: number;
  color: number;
  lifetime: number;
  fromPlayer: boolean;
  width: number;
  height: number;
  gravity: boolean;
}

// ---------------------------------------------------------------------------
// Dropped items
// ---------------------------------------------------------------------------

export interface DroppedItem {
  id: number;
  x: number; y: number;
  vy: number;
  item: ItemStack;
  lifetime: number;
  pickupDelay: number;
}
