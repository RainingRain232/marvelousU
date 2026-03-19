// ---------------------------------------------------------------------------
// Caesar – Walker entity
// ---------------------------------------------------------------------------

import type { CaesarServiceType } from "../config/CaesarBuildingDefs";

export type WalkerType = "service" | "immigrant" | "bandit" | "militia";

export interface CaesarWalker {
  id: number;
  walkerType: WalkerType;

  // Position (tile coords, fractional for smooth movement)
  x: number;
  y: number;

  // Movement
  speed: number;              // tiles per second
  path: { x: number; y: number }[];  // waypoints
  pathIndex: number;
  distanceTraveled: number;   // total tiles walked
  maxDistance: number;         // return home after this many tiles

  // Service delivery
  service: CaesarServiceType | null;
  sourceBuilding: number;     // building ID that spawned this walker
  serviceRadius: number;      // tiles around walker that receive service

  // Combat (for bandits/militia)
  hp: number;
  maxHp: number;
  atk: number;
  attackTimer: number;
  targetId: number | null;    // walker ID or building ID being attacked

  // Lifecycle
  alive: boolean;
  returning: boolean;         // walking back to source
}

export function createServiceWalker(
  id: number,
  x: number,
  y: number,
  service: CaesarServiceType,
  sourceBuilding: number,
  speed: number,
  maxDistance: number,
  serviceRadius: number,
): CaesarWalker {
  return {
    id, walkerType: "service",
    x, y, speed,
    path: [], pathIndex: 0,
    distanceTraveled: 0, maxDistance,
    service, sourceBuilding, serviceRadius,
    hp: 1, maxHp: 1, atk: 0, attackTimer: 0, targetId: null,
    alive: true, returning: false,
  };
}

export function createImmigrant(
  id: number,
  x: number,
  y: number,
  speed: number,
): CaesarWalker {
  return {
    id, walkerType: "immigrant",
    x, y, speed,
    path: [], pathIndex: 0,
    distanceTraveled: 0, maxDistance: 999,
    service: null, sourceBuilding: -1, serviceRadius: 0,
    hp: 1, maxHp: 1, atk: 0, attackTimer: 0, targetId: null,
    alive: true, returning: false,
  };
}

export function createBandit(
  id: number,
  x: number,
  y: number,
  hp: number,
  atk: number,
): CaesarWalker {
  return {
    id, walkerType: "bandit",
    x, y, speed: 1.5,
    path: [], pathIndex: 0,
    distanceTraveled: 0, maxDistance: 999,
    service: null, sourceBuilding: -1, serviceRadius: 0,
    hp, maxHp: hp, atk, attackTimer: 0, targetId: null,
    alive: true, returning: false,
  };
}

export function createMilitia(
  id: number,
  x: number,
  y: number,
  hp: number,
  atk: number,
): CaesarWalker {
  return {
    id, walkerType: "militia",
    x, y, speed: 2.0,
    path: [], pathIndex: 0,
    distanceTraveled: 0, maxDistance: 999,
    service: null, sourceBuilding: -1, serviceRadius: 0,
    hp, maxHp: hp, atk, attackTimer: 0, targetId: null,
    alive: true, returning: false,
  };
}
