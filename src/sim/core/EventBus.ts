// Typed event emitter — bridge between sim and view
import type { GamePhase, PlayerId, UnitState, Vec2 } from "@/types";

export interface SimEvents {
  unitSpawned: { unitId: string; buildingId: string; position: Vec2 };
  unitDied: { unitId: string; killerUnitId?: string };
  unitStateChanged: { unitId: string; from: UnitState; to: UnitState };
  buildingPlaced: { buildingId: string; position: Vec2; owner: PlayerId };
  buildingDestroyed: { buildingId: string };
  abilityUsed: { casterId: string; abilityId: string; targets: Vec2[] };
  projectileCreated: { projectileId: string; origin: Vec2; target: Vec2 };
  projectileHit: { projectileId: string; targetId: string };
  groupSpawned: { unitIds: string[]; buildingId: string };
  goldChanged: { playerId: PlayerId; amount: number };
  phaseChanged: { phase: GamePhase };
}

type EventKey = keyof SimEvents;
type Listener<K extends EventKey> = (payload: SimEvents[K]) => void;

class EventBusImpl {
  private listeners: { [K in EventKey]?: Listener<K>[] } = {};

  on<K extends EventKey>(event: K, listener: Listener<K>): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    (this.listeners[event] as Listener<K>[]).push(listener);
  }

  off<K extends EventKey>(event: K, listener: Listener<K>): void {
    const arr = this.listeners[event] as Listener<K>[] | undefined;
    if (!arr) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.listeners as any)[event] = arr.filter((l) => l !== listener);
  }

  emit<K extends EventKey>(event: K, payload: SimEvents[K]): void {
    const arr = this.listeners[event] as Listener<K>[] | undefined;
    if (!arr) return;
    for (const l of arr) l(payload);
  }

  clear(): void {
    this.listeners = {};
  }
}

export const EventBus = new EventBusImpl();
