// Central state: bases, buildings, units, resources, turn/phase
import { GamePhase } from "@/types";
import type { PlayerId } from "@/types";
import type { Base } from "@sim/entities/Base";
import type { Building } from "@sim/entities/Building";
import type { Unit } from "@sim/entities/Unit";
import type { Projectile } from "@sim/entities/Projectile";
import type { PlayerState } from "@sim/state/PlayerState";
import type { BattlefieldState } from "@sim/state/BattlefieldState";

export interface GameState {
  phase: GamePhase;
  tick: number;
  bases: Map<string, Base>;
  buildings: Map<string, Building>;
  units: Map<string, Unit>;
  projectiles: Map<string, Projectile>;
  players: Map<PlayerId, PlayerState>;
  battlefield: BattlefieldState;
}

export function createGameState(): GameState {
  return {
    phase: GamePhase.PREP,
    tick: 0,
    bases: new Map(),
    buildings: new Map(),
    units: new Map(),
    projectiles: new Map(),
    players: new Map(),
    battlefield: { grid: [], width: 0, height: 0 },
  };
}
