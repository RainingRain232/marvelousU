# Medieval Fantasy Autobattler — Project Rules

## 1. Project Overview

A WebGL-based medieval fantasy autobattler with multi-directional bases (West/East, expandable to North/South), player-placed buildings, unit spawning with group queuing, a shop/economy system, and a rich spell system featuring summoning, projectiles, chain effects, and teleportation. Units have full movement and attack animations.

The game is **simulation-first**: all gameplay logic runs independently of rendering. The renderer observes simulation state and produces visuals. This separation is the single most important architectural rule.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Rendering | PixiJS 8.x (WebGPU/WebGL) | Sprites, AnimatedSprite, particle effects |
| Language | TypeScript (strict mode) | All files `.ts` or `.tsx` |
| Build | Vite | HMR for dev, tree-shaking for prod |
| Animation Tweens | `gsap` | Spell FX, UI transitions, projectile arcs |
| Sprite Animation | PixiJS `AnimatedSprite` | Unit state animations (idle, move, attack, cast, die) |
| State | Centralized `GameState` + Event Bus | Single source of truth, event-driven updates |
| Math | Cartesian grid (tile-based) | `x, y` tile coordinates; `px, py` for screen pixels |
| Testing | Vitest | Sim logic is fully unit-testable with zero rendering deps |
| Version Control | Git | Feature branches, conventional commits |

---

## 3. Project Structure (Modular)

```
src/
├── sim/                        # === SIMULATION (Zero PixiJS imports) ===
│   ├── state/
│   │   ├── GameState.ts        # Central state: bases, buildings, units, resources, turn/phase
│   │   ├── PlayerState.ts      # Per-player: gold, owned buildings, faction, direction
│   │   └── BattlefieldState.ts # Grid, tile ownership, neutral zones
│   │
│   ├── entities/
│   │   ├── Unit.ts             # Unit data: hp, atk, speed, state machine, position, owner
│   │   ├── Building.ts         # Building data: type, owner, position, health, shop inventory
│   │   ├── Projectile.ts       # Projectile data: origin, target, speed, damage, onHit
│   │   └── Base.ts             # Base data: direction, health, owner, linked buildings
│   │
│   ├── systems/                # === ECS-style systems that operate on state ===
│   │   ├── MovementSystem.ts   # Pathfinding, group movement, formation
│   │   ├── CombatSystem.ts     # Damage calc, targeting priority, attack resolution
│   │   ├── SpawnSystem.ts      # Queue processing, group spawning thresholds
│   │   ├── ProjectileSystem.ts # Projectile movement, collision, cleanup
│   │   ├── AbilitySystem.ts    # Cooldowns, casting, ability resolution (delegates to abilities/)
│   │   ├── BuildingSystem.ts   # Placement validation, destruction, capture
│   │   └── AISystem.ts         # Auto-battle unit AI, target selection, retreat logic
│   │
│   ├── abilities/              # === Spell/Ability definitions ===
│   │   ├── Ability.ts          # Base Ability interface + AbilityType enum
│   │   ├── Fireball.ts         # Projectile-based AoE damage
│   │   ├── ChainLightning.ts   # Recursive bounce targeting within range
│   │   ├── Warp.ts             # Teleport units — updates simPosition directly
│   │   ├── Summon.ts           # Spawns temporary units at target location
│   │   └── index.ts            # Ability registry (id → factory)
│   │
│   ├── config/
│   │   ├── UnitDefinitions.ts  # Stats, costs, animations keys for all unit types
│   │   ├── BuildingDefs.ts     # Building types, costs, shop inventories, placement rules
│   │   ├── AbilityDefs.ts      # Ability stats, cooldowns, ranges, damage values
│   │   └── BalanceConfig.ts    # Global tuning: spawn rates, gold income, group thresholds
│   │
│   ├── core/
│   │   ├── SimLoop.ts          # Fixed-timestep simulation loop (60 updates/sec)
│   │   ├── EventBus.ts         # Typed event emitter: UnitSpawned, UnitDied, BuildingPlaced, SpellCast, etc.
│   │   ├── StateMachine.ts     # Generic FSM used by units (IDLE, MOVE, ATTACK, CAST, DIE)
│   │   ├── ObjectPool.ts       # Generic object pool for units, projectiles
│   │   └── Grid.ts             # Tile grid: walkability, building slots, pathfinding (A*)
│   │
│   └── utils/
│       ├── math.ts             # Distance, lerp, direction vectors, AoE calculations
│       └── random.ts           # Seeded RNG for deterministic simulation
│
├── view/                       # === RENDERING (PixiJS, depends on sim/ read-only) ===
│   ├── ViewManager.ts          # Initializes Pixi app, manages all view layers
│   ├── Camera.ts               # Pan, zoom, screen-to-world transforms
│   │
│   ├── entities/
│   │   ├── UnitView.ts         # AnimatedSprite per unit, listens to unit state changes
│   │   ├── BuildingView.ts     # Building sprite + health bar + selection highlight
│   │   ├── ProjectileView.ts   # Sprite/particle that follows sim projectile position
│   │   └── BaseView.ts         # Castle/base sprite with damage states
│   │
│   ├── fx/
│   │   ├── FireballFX.ts       # Fireball trail + explosion particles
│   │   ├── LightningFX.ts     # Chain lightning bolt rendering between targets
│   │   ├── WarpFX.ts           # Fade-out, shimmer, fade-in at new position
│   │   ├── SummonFX.ts         # Magic circle + unit materialization
│   │   └── ParticlePool.ts     # Shared particle system (use ParticleContainer)
│   │
│   ├── ui/
│   │   ├── HUD.ts              # Gold display, phase indicator, minimap
│   │   ├── ShopPanel.ts        # Opens on building click — lists purchasable units/buildings
│   │   ├── BuildingPlacer.ts   # Ghost building follows cursor, validates placement
│   │   ├── UnitQueueUI.ts      # Shows spawn queue progress per building
│   │   └── Tooltip.ts          # Hover info for units, buildings, abilities
│   │
│   └── animation/
│       ├── AnimationManager.ts # Loads spritesheets, manages animation state mapping
│       └── AnimationDefs.ts    # Maps unit types → spritesheet frames for each state
│
├── input/                      # === INPUT HANDLING ===
│   ├── InputManager.ts         # Mouse/touch events, delegates to current mode
│   ├── SelectionMode.ts        # Click buildings/units to inspect
│   └── PlacementMode.ts        # Building placement drag-and-drop
│
├── net/                        # === NETWORKING (future) ===
│   └── NetworkAdapter.ts       # Interface for multiplayer sync (lockstep or state sync)
│
├── audio/                      # === SOUND (future) ===
│   └── AudioManager.ts         # SFX triggers from EventBus, music layers
│
├── main.ts                     # Entry point: init Pixi, create GameState, wire systems + views
└── types.ts                    # Shared type aliases, enums (Direction, UnitType, BuildingType, etc.)
```

---

## 4. Core Architectural Rules

### 4.1 Simulation / View Separation (CRITICAL)

```
sim/ ──────── NEVER imports from view/, ui/, PixiJS, or DOM
view/ ─────── Reads from sim/ state (read-only). Listens to EventBus.
input/ ─────── Sends commands to sim/ (e.g., "place building at x,y")
```

- The `sim/` folder must have **ZERO** imports from PixiJS, DOM APIs, or anything visual.
- All rendering code reads `GameState` and reacts. It never mutates sim state.
- Communication flow: `Input → Sim Command → Sim Updates State → EventBus → View Reacts`

### 4.2 Event Bus

The `EventBus` is the bridge between sim and view. Key events:

```typescript
// Examples — define all events in a central EventMap type
interface SimEvents {
  unitSpawned:      { unitId: string; buildingId: string; position: Vec2 }
  unitDied:         { unitId: string; killerUnitId?: string }
  unitStateChanged:  { unitId: string; from: UnitState; to: UnitState }
  buildingPlaced:   { buildingId: string; position: Vec2; owner: PlayerId }
  buildingDestroyed: { buildingId: string }
  abilityUsed:      { casterId: string; abilityId: string; targets: Vec2[] }
  projectileCreated: { projectileId: string; origin: Vec2; target: Vec2 }
  projectileHit:    { projectileId: string; targetId: string }
  groupSpawned:     { unitIds: string[]; buildingId: string }
  goldChanged:      { playerId: PlayerId; amount: number }
  phaseChanged:     { phase: GamePhase }
}
```

### 4.3 Fixed Timestep Simulation

```typescript
// SimLoop.ts — runs at 60 updates/sec regardless of render framerate
const SIM_TICK_MS = 1000 / 60;

function simTick(state: GameState, dt: number): void {
  SpawnSystem.update(state, dt);
  AbilitySystem.update(state, dt);
  MovementSystem.update(state, dt);
  CombatSystem.update(state, dt);
  ProjectileSystem.update(state, dt);
  BuildingSystem.update(state, dt);
  AISystem.update(state, dt);
}
```

### 4.4 Deterministic Simulation

Use seeded RNG (`sim/utils/random.ts`) for all random decisions in the sim. This enables replays and future multiplayer lockstep sync.

---

## 5. Game Systems Detail

### 5.1 Bases & Directions

```typescript
enum Direction { WEST = 'west', EAST = 'east', NORTH = 'north', SOUTH = 'south' }

interface Base {
  id: string;
  direction: Direction;
  owner: PlayerId;
  health: number;
  position: Vec2;         // Tile position on grid
  spawnOffset: Vec2;      // Where units appear relative to base
}
```

- Minimum 2 bases (WEST, EAST). North/South are addable without architectural changes.
- Each base "faces" the battlefield center. Units spawned from a base move toward the opposite base(s) by default.

### 5.2 Buildings

```typescript
enum BuildingState { GHOST, ACTIVE, DESTROYED }
enum BuildingType { CASTLE, BARRACKS, STABLES, MAGE_TOWER, ARCHERY_RANGE /* ... */ }

interface Building {
  id: string;
  type: BuildingType;
  owner: PlayerId;
  position: Vec2;
  state: BuildingState;
  health: number;
  shopInventory: UnitType[];    // What this building can produce
  spawnQueue: SpawnQueue;       // Queued units waiting to deploy
}
```

- **Castle** (main base building): Sells basic units + building blueprints.
- **Barracks/Stables/etc.**: Placed by the player. Each has unique unit roster.
- **Neutral buildings**: No owner. Can be captured or used by either side. Located in the battlefield center.
- **Placement rules**: Buildings snap to valid grid tiles. Ghost preview shown during placement. Validate: no overlap, within territory, enough gold.

### 5.3 Unit Spawning & Group Queuing

```typescript
interface SpawnQueue {
  buildingId: string;
  entries: { unitType: UnitType; remainingTime: number }[];
  groupThreshold: number;      // e.g., 5 — once this many are ready, deploy as group
  readyUnits: UnitType[];      // Finished spawning, waiting for group threshold
}
```

- Player buys units from a building's shop → added to that building's `SpawnQueue`.
- Each unit has a spawn time. Once `readyUnits.length >= groupThreshold`, the group deploys together.
- The group moves in formation toward the battlefield.

### 5.4 Unit State Machine

Every unit runs a finite state machine:

```
IDLE → MOVE → ATTACK → IDLE
              ↓
            CAST → IDLE
Any state → DIE
```

- **IDLE**: No target, standing at position. Look for targets.
- **MOVE**: Pathfinding toward target (enemy unit, building, or base). Use A* on the grid.
- **ATTACK**: In range of target. Play attack animation, deal damage on frame hit.
- **CAST**: Mage unit casting an ability. Locked in place for cast time.
- **DIE**: Play death animation, then remove from sim after animation completes.

### 5.5 Mage Ability System

```typescript
interface Ability {
  id: string;
  type: AbilityType;
  cooldown: number;
  currentCooldown: number;
  range: number;
  castTime: number;
  execute(caster: Unit, target: Vec2 | Unit, state: GameState): void;
}

enum AbilityType {
  FIREBALL,           // Projectile → AoE damage on impact
  CHAIN_LIGHTNING,    // Bounces between N targets within bounce range
  WARP,               // Teleport friendly units to target location
  SUMMON,             // Spawn temporary units at target location
  // Future: HEAL, SHIELD, SLOW, POISON, etc.
}
```

**Ability implementation rules:**
- All ability **logic** lives in `src/sim/abilities/`.
- All ability **visuals** live in `src/view/fx/`.
- Abilities emit events: `abilityUsed`, `projectileCreated`, `projectileHit`.
- The view layer listens and plays corresponding FX.

**Chain Lightning specifics:**
```
1. Find primary target in range
2. Deal damage
3. Recursively find next target within bounceRange of last target (excluding already-hit)
4. Repeat up to maxBounces
5. Emit event with full chain path for view to render bolts
```

**Warp specifics:**
```
1. Select friendly units in area
2. Instantly update their simPosition to target location
3. Emit event — view does fade-out at old pos, fade-in at new pos
```

---

## 6. Rendering & Animation Rules

### 6.1 Animation States

Every unit type must define spritesheet frames for:

| State | Animation | Looping |
|-------|-----------|---------|
| IDLE | Breathing/standing | Yes |
| MOVE | Walk cycle | Yes |
| ATTACK | Weapon swing / bow draw | No (return to IDLE) |
| CAST | Hands raised / spell channel | No (return to IDLE) |
| DIE | Collapse / fade | No (remove after) |

### 6.2 Sprite Rules

- **Pivot at feet**: All unit sprites pivot at the bottom center for correct depth sorting.
- **Depth sorting**: Sort by `y` position each frame. Units further down the screen render on top.
- **Facing direction**: Flip sprite `scale.x` based on movement direction (left = -1, right = 1).

### 6.3 Performance

- **Object pooling**: Reuse Unit, Projectile, and Particle objects. Never `new` in the hot loop.
- **ParticleContainer**: Use for large-volume effects (spell particles, blood splatter).
- **Culling**: Don't render off-screen units. Use camera bounds check.
- **Batch rendering**: Group sprites by texture atlas where possible.

---

## 7. UI / Shop System

### 7.1 Shop Panel

- Opens when a player clicks on an owned building (or neutral building if unclaimed).
- Displays: building name, unit roster with costs, and (for Castle) available building blueprints.
- Buying a unit adds it to that building's `SpawnQueue`.
- Buying a building enters **Placement Mode**.

### 7.2 Building Placement Mode

1. Player buys building blueprint from Castle shop.
2. A "ghost" building follows the cursor.
3. Valid tiles highlight green, invalid highlight red.
4. Click to confirm placement → deduct gold → building enters ACTIVE state.
5. Right-click or ESC to cancel (refund gold).

---

## 8. Coordinate System

```
Tile coordinates:   (x, y) — integer grid positions
Screen coordinates: (px, py) — pixel positions on canvas

TILE_SIZE = 64  (configurable in BalanceConfig)

tileToScreen(x, y) → { px: x * TILE_SIZE, py: y * TILE_SIZE }
screenToTile(px, py) → { x: floor(px / TILE_SIZE), y: floor(py / TILE_SIZE) }
```

---

## 9. Coding Conventions

- **Interfaces over classes** for data (Unit, Building, Projectile). Use plain objects.
- **Systems are pure functions** that take `GameState` and `dt`, mutate state, and emit events.
- **No deep nesting**: Keep entity objects flat. Compose via IDs, not nested references.
- **Enums for all categorical types**: `Direction`, `UnitType`, `BuildingType`, `AbilityType`, `UnitState`, `BuildingState`, `GamePhase`.
- **ID-based lookups**: Entities stored in `Map<string, Entity>`. Systems reference by ID.
- **Strict TypeScript**: Enable `strict: true`, `noImplicitAny`, `strictNullChecks`.

---

## 10. Terminal Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server with HMR
npm run build        # Production build
npm run tsc          # Type-check only (run before every commit)
npm run test         # Run Vitest (sim/ unit tests)
npm run test:watch   # Vitest in watch mode
```

---

## 11. Git Conventions

- **Branching**: `feature/<name>`, `fix/<name>`, `refactor/<name>`
- **Commits**: Conventional commits — `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- **Pre-commit**: Run `npm run tsc` and `npm run test` before pushing.

---

## 12. AI Directives (for Claude)

1. **Always check sim/ before view/**: If a feature involves game logic, implement it in `sim/` first. Only then add the visual layer in `view/`.
2. **Never put PixiJS code in sim/**: If you find yourself importing from `pixi.js` in any file under `src/sim/`, stop and restructure.
3. **Use the EventBus**: When sim state changes need to trigger visuals, emit a typed event. Never have view code polling state in a tight loop.
4. **Ability logic vs. FX**: Spell damage/targeting goes in `sim/abilities/`. Visual effects go in `view/fx/`. These must be separate files.
5. **Object pooling**: When creating units or projectiles in bulk (group spawns, chain lightning, summons), always use the `ObjectPool`.
6. **Config-driven**: Unit stats, building costs, ability values go in `sim/config/`. Never hardcode balance numbers in system logic.
7. **Validate placement**: Before placing a building, check the grid for walkability, overlap, and territory rules.
8. **Test sim logic**: Any new system or ability must have a corresponding Vitest test in `tests/sim/`. Tests should create a minimal `GameState`, run the system, and assert outcomes.
9. **Modularity**: Each system should be independently understandable. A new developer should be able to read `CombatSystem.ts` without needing to understand `SpawnSystem.ts`.
10. **No heavy dependencies**: Do not install external libraries beyond the approved stack (PixiJS, gsap, vitest) without explicit approval.
11. **When adding a new unit type**: Add definition to `UnitDefinitions.ts`, add animation mapping to `AnimationDefs.ts`, ensure all 5 animation states are accounted for.
12. **When adding a new ability**: Create file in `sim/abilities/`, register in ability index, create matching FX file in `view/fx/`, add to `AbilityDefs.ts` config.
13. **When adding a new building**: Add to `BuildingDefs.ts`, define shop inventory, add `BuildingView` variant, update placement validation rules if needed.
14. **Performance budget**: Target 500+ units on screen at 60fps. Profile before and after significant changes.
15. **When in doubt, keep it in sim/**: If you're unsure whether something is sim or view logic, it's probably sim logic.
