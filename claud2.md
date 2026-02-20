# Medieval Fantasy Autobattler — Claud 2.0 (The Living World)

This document serves as an addendum and update to `claud.md`. It reflects the evolution of the project into a more detailed, procedurally animated environment and provides specific instructions for implementing new content.

## 1. Updated Project Structure

Since the initial `claud.md`, several key systems and directories have been added:

```
src/
├── sim/
│   └── systems/
│       ├── UnitBehaviorSystem.ts  # Periodic interruptions (idle pauses), natural behaviors
│       └── ...
├── view/
│   ├── entities/
│   │   ├── CastleRenderer.ts      # Specialized procedural renderer for 4x4 animated castles
│   │   └── ...
│   ├── environment/               # === LIVING WORLD (Procedural Environment) ===
│   │   ├── EnvironmentLayer.ts    # Orchestrates grass, trees, wildlife, and fx
│   │   ├── GrassRenderer.ts       # Procedural animated grass tufts
│   │   ├── TreeRenderer.ts        # Procedural animated medieval fantasy trees
│   │   ├── DeerRenderer.ts        # Wildlife with idle/graze/move behaviors
│   │   ├── RabbitRenderer.ts      # Wildlife with hopping behaviors
│   │   └── DoveRenderer.ts        # Flying FX (emerge from castles)
│   └── animation/
│       └── SwordsmanSpriteGen.ts  # Procedural sprite generator for detailed units
```

---

## 2. Core Implementation Guides

### 2.1 Adding a New Unit Type
To add a new unit (e.g., "Paladin"):
1. **Types**: Add `PALADIN` to `UnitType` in `src/types.ts`.
2. **Simulation**: Add stats to `src/sim/config/UnitDefinitions.ts`.
3. **Animation Definitions**: Add entry to `src/view/animation/AnimationDefs.ts` mapping states to frame indices.
4. **Visuals**:
   - **Option A (Spritesheet)**: Place `<unit>.json` and `<unit>.png` in `assets/sheets/`.
   - **Option B (Procedural)**: Create a generator in `src/view/animation/` (following `SwordsmanSpriteGen.ts` pattern) and hook it into `AnimationManager.ts`.

### 2.2 Adding a New Simulation System
1. Create `src/sim/systems/MyNewSystem.ts`.
2. Implement an `update(state: GameState, dt: number)` method.
3. Register the system in `src/sim/core/SimLoop.ts` within the `simTick` function.
   - **Order Matters**: Ensure it runs at the appropriate time (e.g., behaviors before movement).

### 2.3 Environmental Decorations & Wildlife
The environment is managed by `EnvironmentLayer.ts` (lives in the `ground` or `fx` display layers).
1. Create a `Renderer` class in `src/view/environment/`.
2. Use `PixiJS Graphics` or `RenderTexture` for procedural generation.
3. Integrate the renderer into `EnvironmentLayer.ts`'s `init` and `update` methods.

---

## 3. Specialized Renderers & Procedural Art

We favor **Procedural Art** over static assets for core structures and units to allow for dynamic player colors and high-fidelity animations without massive spritesheet overhead.

- **CastleRenderer**: Handles the 4x4 footprint. Features animated Princess (Idle/Prep) and King (Battle), waving flags, and multi-layered depth.
- **SwordsmanSpriteGen**: Generates 48x48 pixel frames for all 5 animation states. Use this as a template for new complex units.

---

## 4. Key Logic Locations

- **Unit Pausing/Idle Internals**: Managed by `UnitBehaviorSystem.ts`. It modifies `idleInterruptionTimer` which is then respected by `MovementSystem`, `CombatSystem`, and `AISystem`.
- **Castle Character Logic**: `BuildingView.ts` passes `GamePhase` to `CastleRenderer.ts`, which toggles between the Princess and the King.
- **Animal Spawning**: Logic resides in `EnvironmentLayer.ts.init()`, calculating density based on map dimensions.

---

## 5. Developer Reminders (Cheat Sheet)

- **Sim-View Bridge**: The `EventBus` remains the primary way to trigger one-shot visual effects (spells, deaths).
- **Z-Sorting**: Units use `container.zIndex = unit.position.y` for depth. Buildings and environment elements must be positioned accordingly.
- **Scale & Pivot**: Units pivot at their feet (`0.5, 0.75` anchor). Scaling `x` to `-1` handles horizontal flipping for Direction.WEST.
- **4x4 Footprint**: The Castle is 4x4 tiles. Ensure `BalanceConfig.ts` base positions allow for this width without overlapping walkables.
