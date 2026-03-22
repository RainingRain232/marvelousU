// ---------------------------------------------------------------------------
// Exodus mode — Mordred's host pursuer AI
// ---------------------------------------------------------------------------

import { hexDistance, hexNeighbors, hexKey } from "@world/hex/HexCoord";
import type { HexCoord } from "@world/hex/HexCoord";
import { ExodusConfig, getDifficultyConfig } from "../config/ExodusConfig";
import type { ExodusState } from "../state/ExodusState";
import { addLogEntry } from "../state/ExodusState";

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

type PursuerCallback = (position: HexCoord, distToCaravan: number) => void;
type PursuerCatchCallback = () => void;

let _pursuerCallback: PursuerCallback | null = null;
let _pursuerCatchCallback: PursuerCatchCallback | null = null;

// ---------------------------------------------------------------------------
// ExodusPursuerSystem
// ---------------------------------------------------------------------------

export class ExodusPursuerSystem {
  static setPursuerCallback(cb: PursuerCallback | null): void {
    _pursuerCallback = cb;
  }
  static setPursuerCatchCallback(cb: PursuerCatchCallback | null): void {
    _pursuerCatchCallback = cb;
  }

  static advancePursuer(state: ExodusState): void {
    const pursuer = state.pursuer;

    // Activation check
    if (!pursuer.active) {
      if (state.day >= ExodusConfig.PURSUER_START_DELAY) {
        pursuer.active = true;
        addLogEntry(state, "Mordred's host begins its march. The hunt has begun.", 0xff4444);
      }
      return;
    }

    // Handle delays (from player actions like sacrifices, eagle harassment)
    if (pursuer.delayed > 0) {
      pursuer.delayed--;
      addLogEntry(state, `Mordred's advance is delayed. (${pursuer.delayed} days remaining)`, 0xffaa44);
      return;
    }

    pursuer.daysActive++;

    // Escalating growth — accelerates over time (creates tension curve)
    const baseGrowth = ExodusConfig.PURSUER_GROWTH_PER_DAY;
    const escalation = Math.floor(pursuer.daysActive / 8); // +1 growth per 8 days active
    const effectiveGrowth = Math.max(0, baseGrowth + escalation - Math.floor(pursuer.weakened * 0.5));
    pursuer.strength += effectiveGrowth;

    // Pursuer speed increases slightly over time (relentless)
    if (pursuer.daysActive > 15 && pursuer.daysActive % 5 === 0) {
      pursuer.speed = Math.min(2.0, pursuer.speed + 0.1);
    }

    // Move toward caravan (terrain-aware pathfinding)
    const diff = getDifficultyConfig(state.difficulty);
    const speed = Math.max(1, Math.floor(pursuer.speed * diff.pursuerSpeedMult));
    let moveBudget = speed;

    while (moveBudget > 0) {
      const neighbors = hexNeighbors(pursuer.position);
      let bestNeighbor: HexCoord | null = null;
      let bestScore = Infinity;

      for (const n of neighbors) {
        const key = hexKey(n.q, n.r);
        const hex = state.hexes.get(key);
        if (!hex) continue;
        if (hex.terrain === "water") continue;

        // Terrain cost affects pursuer speed
        const terrainCost = ExodusConfig.TERRAIN_COST[hex.terrain] ?? 1;
        const dist = hexDistance(n, state.caravanPosition);
        const score = dist + terrainCost * 0.5; // balance distance vs terrain cost

        if (score < bestScore) {
          bestScore = score;
          bestNeighbor = n;
        }
      }

      if (!bestNeighbor) break;

      const nextKey = hexKey(bestNeighbor.q, bestNeighbor.r);
      const nextHex = state.hexes.get(nextKey);
      const terrainCost = nextHex ? (ExodusConfig.TERRAIN_COST[nextHex.terrain] ?? 1) : 1;

      // Terrain slows the pursuer
      moveBudget -= terrainCost;
      if (moveBudget < 0) break;

      // Consume the old hex
      const oldKey = hexKey(pursuer.position.q, pursuer.position.r);
      const oldHex = state.hexes.get(oldKey);
      if (oldHex) {
        oldHex.consumed = true;
        oldHex.revealed = true; // consumed hexes become visible
      }

      pursuer.position = bestNeighbor;
    }

    // Check distance to caravan
    const dist = hexDistance(pursuer.position, state.caravanPosition);
    _pursuerCallback?.(pursuer.position, dist);

    if (dist <= 2 && dist > 0) {
      addLogEntry(state, "Mordred's host is dangerously close!", 0xff2222);
    }

    if (dist <= 0) {
      addLogEntry(state, "MORDRED'S HOST HAS CAUGHT THE CARAVAN!", 0xff0000);
      state.pendingCombat = true;
      state.combatDanger = 5;
      _pursuerCatchCallback?.();
    }
  }

  static getDistanceToCaravan(state: ExodusState): number {
    return hexDistance(state.pursuer.position, state.caravanPosition);
  }

  static delayPursuer(state: ExodusState, days: number): void {
    state.pursuer.delayed += days;
    addLogEntry(state, `Mordred's advance delayed by ${days} day(s).`, 0x44ff44);
  }

  static weakenPursuer(state: ExodusState, amount: number): void {
    state.pursuer.weakened += amount;
    state.pursuer.strength = Math.max(5, state.pursuer.strength - amount * 3);
    addLogEntry(state, `Mordred's host weakened! (-${amount * 3} strength)`, 0x44ff44);
  }

  static cleanup(): void {
    _pursuerCallback = null;
    _pursuerCatchCallback = null;
  }
}
