# Tekken Mode (3D Fighter)

**Enum**: `GameMode.TEKKEN`
**Source**: `/tekken` (7 subdirectories)
**Framework**: Three.js 3D, fixed arena with walls
**Players**: 1v1 (vs CPU, vs Player, Arcade, Training)

## Overview

3D fighting game inspired by Tekken, featuring 6 characters with distinct archetypes, advanced juggle mechanics, wall splats, screw/bound combo extensions, Rage Arts, counter-hits, and full 3D movement including sidesteps. Rendered in Three.js with dynamic camera, procedural fighters, hit effects, and cinematic sequences for Rage Arts and KOs. Runs at 60fps fixed timestep.

## Gameplay Loop

```
MAIN_MENU / CHAR_SELECT (pick characters, arena, difficulty)
-> INTRO (3D camera orbit with fighters posed)
-> FIGHTING (real-time 3D combat)
-> ROUND_END (KO or timeout)
-> repeat until match winner (best of 3, first to 2 rounds)
```

Game modes: VS CPU, VS Mode (local 2P), Arcade, Training (with frame data display, hitbox toggle, AI toggle).

## Key Systems

### Input System (`TekkenInputSystem.ts`)
- **4-button layout**: U = Left Punch, I = Right Punch, J = Left Kick, K = Right Kick
- **Arrow keys**: Movement (directional notation: n, f, b, d, u, d/f, d/b, u/f, u/b)
- **Rage Art**: O key (when in Rage state)
- **30-frame input buffer**: Stores direction + buttons per frame for command matching
- **Command notation**: Tekken-style (e.g. `d/f+1` = down-forward + left punch)
- **Move resolution**: Matches direction + button combination against character's move list; prefers more specific matches

### Fighting System (`TekkenFightingSystem.ts`)
- **Attack heights**: High, Mid, Low, Overhead
- **High attacks whiff on crouching**: High-height moves go over crouching opponents entirely
- **Standing block**: Blocks High and Mid (hold back while standing)
- **Crouch block**: Blocks Mid and Low (hold back while crouching)
- **Overhead**: Unblockable
- **Chip damage**: 10% on block (`CHIP_DAMAGE_MULT: 0.1`), minimum 1 HP (cannot kill on chip)
- **Counter-hit system**: Hitting an opponent during their attack startup deals 1.2x damage and adds +6 frame hitstun bonus (`COUNTER_HIT_BONUS: 6`). Counter-hit window lasts 8 frames into attack startup
- **Power Crush**: Armored moves that absorb hits during execution (defined per move via `isPowerCrush`)
- **Frame data**: Every move defines startup, active, recovery, onHit, onBlock, and onCounterHit frame advantage values
- **Move advance distance**: Moves can carry the attacker forward during active frames

### Combo System (`TekkenComboSystem.ts`)
- **Damage scaling**: 0.85x per hit (`COMBO_DAMAGE_SCALING`), minimum 0.2 floor (`MIN_DAMAGE_SCALING`)
- **Combo drop threshold**: 3 frames of neutral state before combo counter resets
- **Rage damage boost**: 1.15x when in Rage state (`RAGE_DAMAGE_BOOST`)

### Physics System (`TekkenPhysicsSystem.ts`)
- **3D positioning**: x (lateral), y (vertical), z (depth/sidestep axis)
- **Gravity**: 0.012 per frame, scaled by juggle gravity factor
- **Juggle gravity scaling**: `1 + 0.08 * hitCount` — each hit in a juggle increases gravity, pulling the opponent down faster
- **Max juggle hits**: 12 hits before extreme gravity (5x) ends the combo
- **Wall collisions**: Stage half-width 3.5 units; airborne fighters bounce off walls with 0.3x velocity reflection
- **Wall distance tracking**: Each fighter tracks distance to nearest wall for wall splat checks
- **Z-axis boundaries**: Stage half-depth 1.0 units
- **Ground friction**: 0.85 velocity decay per frame; air friction 0.98
- **Push-apart**: Minimum 0.4 unit distance between fighters

### Juggle Mechanics
- **Launch**: Launcher moves set the defender airborne with configurable launch height and horizontal knockback
- **Screw**: Once per combo, a screw move re-launches the opponent with 0.6x launch height, extending the juggle
- **Bound**: Once per combo, a bound move bounces the opponent off the ground (velocity 0.12) when near floor, enabling follow-ups
- **Wall splat**: Moves with `wallSplat: true` pin the opponent to the wall for 30 frames, allowing free hits; wall slide speed 0.01

### Rage System
- **Rage threshold**: Activates at 25% HP (`RAGE_THRESHOLD: 0.25`)
- **Rage damage boost**: All attacks deal 1.15x damage while in Rage
- **Rage Art**: Each character has a signature Rage Art (20 startup, 5 active, 40 recovery, 55 damage). Rage Arts have Power Crush armor and wall splat. Single use per match
- **Rage Art cinematic**: 3-phase camera sequence (zoom-in 15 frames, impact 10 frames, zoom-out 20 frames) with 0.2x slowdown

### KO Cinematic
- 4-phase sequence: Freeze (15 frames) -> Slow-motion (45 frames at 0.15x) -> Ragdoll (40 frames) -> Settle (20 frames)
- Camera zoom and shift for dramatic angle

### AI System (`TekkenAISystem.ts`)
- **3 difficulty levels**: Easy (0.3), Medium (0.6), Hard (0.9) — maps to reaction speed and decision quality
- **Footsie phases**: Approach, Spacing, Pressure, Retreat — AI oscillates between phases based on distance to optimal range
- **Character-specific optimal range**: Rushdown 1.2, Evasive 1.8, Power 1.5, Defensive 2.0, Mixup 1.4, Balanced 1.6
- **Range-based decisions**: Very far (>3.5), far (2.0-3.5), mid (1.0-2.0), close (<1.0) with different action distributions per range
- **Combo execution**: On launcher connect, AI selects from `comboRoutes` (easy), `advancedComboRoutes` (medium), or `expertComboRoutes` (hard) and sequences through the route
- **Reactive blocking**: Reads opponent attack state and distance; block probability scales with difficulty
- **Post-attack retreat**: After landing hits, briefly walks away (higher difficulty only)
- **Whiff punishing**: On hard difficulty, AI detects opponent in recovery phase and counter-attacks with d/f+2
- **Sidestep usage**: Medium and hard AI use sidesteps for lateral movement and evasion
- **Movement variety**: Walks, dashes forward/back, sidesteps, backdashes during footsie phases

### Characters (6 total)

| ID | Name | Title | Archetype | Walk | Dash | Backdash |
|----|------|-------|-----------|------|------|----------|
| knight | Sir Aldric | The Iron Bulwark | Balanced | 0.035 | 0.08 | 0.6 |
| berserker | Bjorn Ironfist | The Unbroken | Rushdown | 0.04 | 0.09 | 0.5 |
| monk | Brother Cedric | Fist of the Monastery | Mixup | 0.038 | 0.085 | 0.55 |
| paladin | Lady Isolde | The Radiant Shield | Defensive | 0.032 | 0.075 | 0.65 |
| assassin | Shade | The Unseen Blade | Evasive | 0.042 | 0.095 | 0.7 |
| warlord | Gorm the Red | Breaker of Shields | Power | 0.03 | 0.07 | 0.45 |

Each character has: Full move list with command inputs, 2 basic combo routes, 2 advanced combo routes, 3 expert combo routes, and a unique Rage Art.

### Stage Hazards
Three hazard types defined in state (`StageHazard` interface):
- **Fire Brazier**: Damage zone
- **Acid Patch**: Damage-over-time area
- **Breakable Pillar**: Destructible environment element

## Source Files

```
tekken/
├── audio/
│   └── TekkenAudioManager.ts    Procedural audio (hits, blocks, movement, announcer)
├── config/
│   ├── TekkenBalanceConfig.ts   All balance constants (TB)
│   ├── TekkenCharacterDefs.ts   6 character definitions with move lists, combo routes, rage arts
│   ├── TekkenMoveDefs.ts        Per-character move definition arrays (KNIGHT_MOVES, BERSERKER_MOVES, etc.)
│   └── TekkenArenaDefs.ts       Arena definitions
├── state/
│   └── TekkenState.ts           Interfaces: TekkenState, TekkenFighter, JuggleState, TekkenMoveDef, StageHazard, etc.
├── systems/
│   ├── TekkenInputSystem.ts     Keyboard input, directional notation, input buffer
│   ├── TekkenFightingSystem.ts  Hit detection, blocking, damage, counter-hits, launches
│   ├── TekkenComboSystem.ts     Combo tracking, scaling, juggle hit cap
│   ├── TekkenPhysicsSystem.ts   3D physics, gravity, wall collisions, push-apart
│   └── TekkenAISystem.ts        Difficulty-scaled AI with footsies, combo execution, whiff punish
├── view/
│   ├── TekkenSceneManager.ts    Three.js scene setup, lighting, environment
│   ├── TekkenFighterRenderer.ts Procedural 3D fighter models with animation blending
│   ├── TekkenArenaRenderer.ts   3D arena rendering with floor, walls, props
│   ├── TekkenFXManager.ts       Hit sparks, block sparks, particles, screen effects
│   └── TekkenHUD.ts             HP bars, combo counter, round display, timer
├── TekkenGame.ts                Main orchestrator, game loop, cinematics, char select, menus
└── TekkenStateMachine.ts        Simple phase state machine
```

## Incomplete / Stubbed Systems

- **`onBlock` / `onCounterHit` frame data defined but never applied**: Every `TekkenMoveDef` has `onBlock` and `onCounterHit` fields with specific values, but the fighting system only uses `onHit` for hitstun calculation. The `onBlock` field is used for blockstun calculation but `onCounterHit` is ignored — counter-hit bonus is always the flat `COUNTER_HIT_BONUS` constant (+6) instead of the per-move value
- **`rageActive` never set to true**: The `RAGE_THRESHOLD` (0.25) and `RAGE_DAMAGE_BOOST` (1.15) constants are defined, and `rageActive` is checked in damage calculations, but no code path in the fighting or game systems ever sets `rageActive = true` when HP drops below 25%. Rage Arts can be triggered via button press only if `rageActive` is true, making them currently inaccessible during normal gameplay
- **Juggle physics minimal**: Gravity scaling uses a single global formula (`1 + 0.08 * hitCount`) with no per-move gravity adjustment. Launch height is per-move but there is no per-move air hitstun or juggle-specific frame data
- **AI does not use character-specific playstyles**: The AI calculates an optimal range per archetype but uses the same generic attack commands (d/f+1, d/f+2, f+3, etc.) for all characters. It does not leverage character-unique special moves during footsies or neutral
- **Expert combo routes do not validate positioning**: AI selects expert combo routes without checking wall distance or stage position. Long expert routes may drop due to wall interactions or gravity scaling that the route does not account for
- **Stage hazards interface only**: `StageHazard` is fully defined in state (fire_brazier, acid_patch, breakable_pillar) with damage, radius, cooldown, and position fields, but hazard spawning/interaction logic is minimal
- **Tech roll defined but limited**: `TECH_ROLL_SPEED` (0.04) and `TECH_ROLL_DURATION` (18) constants exist in balance config, but the player cannot input a tech roll — knockdown always plays the full 40-frame duration

## Improvement Ideas

1. **Activate Rage system**: Add HP threshold check in the fighting system to set `rageActive = true` when HP drops below 25%, enabling the designed Rage damage boost and Rage Art access
2. **Apply per-move frame advantage**: Use `onBlock` for attacker recovery advantage and `onCounterHit` for defender-specific counter-hit stun instead of the flat bonus, creating meaningful move-by-move matchup data
3. **Character-specific AI**: Make the AI use each character's unique named moves during neutral play, not just generic button combos. Berserker AI should rush; Paladin AI should turtle and punish
4. **Juggle physics depth**: Add per-move air hitstun and gravity modifiers so characters have distinct juggle properties. Some moves should float longer, others should slam down
5. **Wall combo routes**: AI should detect wall proximity and switch to wall-specific combo routes that capitalize on wall splat for maximum damage
6. **Implement tech roll**: Allow defender to input a direction on knockdown to tech roll, reducing knockdown vulnerability and adding a layer of okizeme play
7. **Stage hazards gameplay**: Spawn arena hazards that interact with knockback (e.g. wall splat into a fire brazier for bonus damage, break a pillar to change stage geometry)
8. **Throw system depth**: Currently only Rage Art has grab-like properties. Add a universal throw/throw-break system with the existing 20-frame break window constant
9. **Sidestep attacks**: Add tracking/homing moves that catch sidesteps, creating a proper movement/attack/block triangle
10. **Replay system**: The KO cinematic framework could be extended into a full replay system, recording inputs for playback of highlights
