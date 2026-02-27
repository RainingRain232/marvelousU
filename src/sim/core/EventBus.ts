// Typed event emitter — bridge between sim and view
// sim/ emits events; view/ listens. sim/ never imports from view/.
import type { GamePhase, PlayerId, UnitState, Vec2 } from "@/types";

// ---------------------------------------------------------------------------
// Event map — every event the simulation can emit
// ---------------------------------------------------------------------------

export interface SimEvents {
  // Unit lifecycle
  unitSpawned: { unitId: string; buildingId: string; position: Vec2 };
  unitDied: { unitId: string; killerUnitId?: string };
  unitDamaged: { unitId: string; amount: number; attackerId: string };
  unitAttacked: { attackerId: string; targetId: string; attackerPos: Vec2; targetPos: Vec2 };
  unitHealed: { unitId: string; amount: number; position: Vec2 };
  unitLevelUp: { unitId: string; newLevel: number };
  unitStateChanged: { unitId: string; from: UnitState; to: UnitState };
  groupSpawned: { unitIds: string[]; buildingId: string };

  // Building lifecycle
  buildingPlaced: { buildingId: string; position: Vec2; owner: PlayerId | null };
  buildingDestroyed: { buildingId: string };
  buildingCaptured: { buildingId: string; newOwner: PlayerId | null };

  // Abilities & projectiles
  castStarted: { casterId: string; abilityId: string; abilityType: string; position: Vec2; castTime: number };
  abilityUsed: { casterId: string; abilityId: string; targets: Vec2[] };
  projectileCreated: { projectileId: string; origin: Vec2; target: Vec2 };
  projectileHit: { projectileId: string; targetId: string; teleportedIds?: string[] };
  unitTeleported: { unitId: string; from: Vec2; to: Vec2 };

  // Random events
  randomEvent: { eventType: string; title: string; description: string };

  // Economy
  goldChanged: { playerId: PlayerId; amount: number };
  upgradePurchased: { playerId: PlayerId; upgradeType: string; newLevel: number };

  // Rally flag
  flagPlaced: { playerId: PlayerId; position: Vec2 };

  // Game flow
  phaseChanged: { phase: GamePhase };
  roguelikeDisabledBuildingsChanged: { disabled: string[] };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EventKey = keyof SimEvents;
export type Listener<K extends EventKey> = (payload: SimEvents[K]) => void;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class EventBusImpl {
  private listeners: { [K in EventKey]?: Listener<K>[] } = {};

  /** Subscribe to an event. Returns an unsubscribe function for convenience. */
  on<K extends EventKey>(event: K, listener: Listener<K>): () => void {
    if (!this.listeners[event]) this.listeners[event] = [];
    (this.listeners[event] as Listener<K>[]).push(listener);
    return () => this.off(event, listener);
  }

  /** Subscribe to an event for exactly one emission, then auto-unsubscribe. */
  once<K extends EventKey>(event: K, listener: Listener<K>): void {
    const wrapper = (payload: SimEvents[K]) => {
      listener(payload);
      this.off(event, wrapper as Listener<K>);
    };
    this.on(event, wrapper as Listener<K>);
  }

  /** Unsubscribe a specific listener from an event. */
  off<K extends EventKey>(event: K, listener: Listener<K>): void {
    const arr = this.listeners[event] as Listener<K>[] | undefined;
    if (!arr) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.listeners as any)[event] = arr.filter((l) => l !== listener);
  }

  /** Emit an event, calling all registered listeners synchronously. */
  emit<K extends EventKey>(event: K, payload: SimEvents[K]): void {
    // Snapshot listeners before iterating — a listener may call off() mid-loop
    const arr = (this.listeners[event] as Listener<K>[] | undefined)?.slice();
    if (!arr) return;
    for (const l of arr) l(payload);
  }

  /** Remove all listeners for all events. */
  clear(): void {
    this.listeners = {};
  }

  /** Remove all listeners for a specific event. */
  clearEvent<K extends EventKey>(event: K): void {
    delete this.listeners[event];
  }
}

// ---------------------------------------------------------------------------
// Global singleton — use this throughout the app
// ---------------------------------------------------------------------------

export const EventBus = new EventBusImpl();
