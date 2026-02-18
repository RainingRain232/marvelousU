// Fixed-timestep simulation loop (60 updates/sec)
import { BalanceConfig } from "@sim/config/BalanceConfig";
import type { GameState } from "@sim/state/GameState";
import { SpawnSystem } from "@sim/systems/SpawnSystem";
import { AbilitySystem } from "@sim/systems/AbilitySystem";
import { MovementSystem } from "@sim/systems/MovementSystem";
import { CombatSystem } from "@sim/systems/CombatSystem";
import { ProjectileSystem } from "@sim/systems/ProjectileSystem";
import { BuildingSystem } from "@sim/systems/BuildingSystem";
import { AISystem } from "@sim/systems/AISystem";

function simTick(state: GameState, dt: number): void {
  SpawnSystem.update(state, dt);
  AbilitySystem.update(state, dt);
  MovementSystem.update(state, dt);
  CombatSystem.update(state, dt);
  ProjectileSystem.update(state, dt);
  BuildingSystem.update(state, dt);
  AISystem.update(state, dt);
  state.tick++;
}

export class SimLoop {
  private state:       GameState;
  private running:     boolean = false;
  private accumulator: number  = 0;
  private lastTime:    number  = 0;

  constructor(state: GameState) {
    this.state = state;
  }

  start(): void {
    this.running  = true;
    this.lastTime = performance.now();
    this.tick();
  }

  stop(): void {
    this.running = false;
  }

  private tick = (): void => {
    if (!this.running) return;

    const now  = performance.now();
    const diff = now - this.lastTime;
    this.lastTime    = now;
    this.accumulator += diff;

    while (this.accumulator >= BalanceConfig.SIM_TICK_MS) {
      simTick(this.state, BalanceConfig.SIM_TICK_MS / 1000);
      this.accumulator -= BalanceConfig.SIM_TICK_MS;
    }

    requestAnimationFrame(this.tick);
  };
}
