# Duel Mode (2D Fighter)

**Enum**: `GameMode.DUEL`
**Source**: `/duel` (5 subdirectories)
**Framework**: PixiJS 2D, side-scrolling stage
**Players**: 1v1 (vs CPU, vs Player, Wave, Arcade, Training)

## Overview

Classic 2D fighting game with 20 playable characters from Arthurian legend. Features a 6-button input layout (3 punches, 3 kicks), special moves triggered by simultaneous button presses, a Zeal ultimate meter, projectile system, and a combo chain system. Runs at 60fps with a fixed timestep simulation.

## Gameplay Loop

```
CHAR_SELECT (pick fighters, arena)
-> ARENA_SELECT
-> INTRO (character entrance)
-> FIGHTING (real-time combat, frame-by-frame simulation)
-> ROUND_END (KO or timeout)
-> repeat until match winner (best of 3)
```

Game modes: VS CPU, VS Mode (local 2P), Arcade, Wave (survival tournament), Training (dummy modes, infinite HP, position reset).

## Key Systems

### Input System (`DuelInputSystem.ts`)
- **6-button layout**: Q/W/E = Light/Medium/Heavy Punch, A/S/D = Light/Medium/Heavy Kick
- **Arrow keys**: Movement (left/right/up=jump/down=crouch)
- **8-frame input buffer**: Stores recent inputs for buffered actions
- **Simultaneous press detection**: 4-frame window for special move activation
- **Double-tap dash**: 12-frame window between taps for forward/back dash
- **Special combos**: 8 per character, mapped to adjacent button pairs (Q+W, W+E, A+S, S+D, Q+D, E+A, E+D, W+S)
- **Zeal activation**: Q+W+E (50 meter, Zeal 1) or A+S+D (100 meter, Zeal 2)
- **Grab**: Q+A (Light Punch + Light Kick), universal command
- **Pending normal delay**: 5-frame wait on single button press to allow for second button (special detection)

### Fighting System (`DuelFightingSystem.ts`)
- **Frame data model**: Every move has startup, active, and recovery frames
- **Attack heights**: High, Mid, Low, Overhead
- **Blocking**: Hold back to stand block (blocks High/Mid), crouch block with down-back (blocks Mid/Low). Standing block fails vs Low; crouch block fails vs High/Overhead
- **Chip damage**: Special moves deal 20% chip on block (`CHIP_DAMAGE_MULT: 0.2`); normals do not chip
- **Hit freeze**: 6 frames of hit stop on connect; 30-frame KO slowdown
- **Combo chain**: Cancel recovery into a new move on hit, up to 5-hit chain limit (`comboChain >= 5` blocks further cancels)
- **Damage scaling**: 0.9x multiplier per combo hit, minimum 0.30 floor
- **Knockback and pushback**: Per-move knockback values; 3px pushback speed on block
- **Launcher moves**: Heavy low (D button) on most characters, triggers knockdown state (40-frame recovery + 20-frame get-up with i-frames)
- **Multi-hit moves**: Some specials (e.g. Hundred Slashes, Thousand Thrusts) deliver up to 8 rapid hits during active frames

### Projectile System (`DuelProjectileSystem.ts`)
- Max 3 simultaneous projectiles on screen
- Spawned at end of startup frames for projectile-flagged specials
- Per-projectile: position, velocity, hitbox, damage, chip damage, height, hitstun, blockstun, knockback
- 180-frame lifetime (3 seconds), despawn 100px past stage edges
- Independent blocking logic (stand block vs crouch block based on projectile height)
- Supports combo damage scaling from the owning attacker

### Zeal Meter
- **Max gauge**: 100
- **Gain on hit**: +8 (attacker), +5 (defender, on getting hit)
- **Zeal 1 cost**: 50 meter (Q+W+E)
- **Zeal 2 cost**: 100 meter (A+S+D)
- Each character has 2 Zeal moves (e.g. Arthur: Royal Judgment at 50, Excalibur Unleashed at 100)

### Grab System
- **Range**: 75 pixels
- **Whiff recovery**: 30 frames on miss
- **Unblockable**: Grabs cannot be blocked
- **On connect**: Deals grab damage, launches defender into the air (velocity -14 Y, 5 X), triggers hit freeze
- **Cannot grab**: Knockdown, get-up, or already-grabbed opponents

### AI System (`DuelAISystem.ts`)
- **4 difficulty levels**: Reaction speed [20, 8, 4, 2] frames; block chance [20%, 55%, 80%, 95%]
- **Distance-based decisions**: Close (<70px), mid (70-160px), far (>160px)
- **Close range**: 12% grab, 53% combo starter, 15% single normal, 12% retreat
- **Mid range**: 40% approach, 20% dash-in, 20% special, 8% jump, 12% retreat
- **Far range**: 45% approach, 20% dash forward, 20% zoner projectile (mage/archer/spear types), 15% jump approach
- **Pre-built combo routes**: Per fighter type (sword, mage, archer, spear, axe), 3-4 hit chains using normals
- **Reactive blocking**: Reads opponent attack state and height for crouch/stand block selection

### Characters (20 total)
| ID | Name | Title | Type | HP |
|----|------|-------|------|-----|
| arthur | Arthur | The Once and Future King | Sword | 1000 |
| merlin | Merlin | Archmage of Avalon | Mage | 900 |
| elaine | Elaine | The Lily Maid | Archer | 850 |
| lancelot | Lancelot | The Peerless Knight | Spear | 950 |
| guinevere | Guinevere | — | Sword | — |
| morgan | Morgan | — | Mage | — |
| gawain | Gawain | — | Archer | — |
| mordred | Mordred | — | Sword | — |
| galahad | Galahad | — | Sword | — |
| percival | Percival | — | Sword | — |
| tristan | Tristan | — | Spear | — |
| nimue | Nimue | — | Mage | — |
| kay | Kay | — | Spear | — |
| bedivere | Bedivere | — | Sword | — |
| pellinore | Pellinore | — | Axe | — |
| igraine | Igraine | — | Mage | — |
| ector | Ector | — | Archer | — |
| bors | Bors | — | Axe | — |
| uther | Uther | — | Archer | — |
| lot | Lot | — | Sword | — |

Each character has: 6 normals, 8 specials, 2 Zeals, 1 grab. Fighter types: sword, mage, archer, spear, axe.

### Wave Mode
- Generates 3+waveNumber enemies per wave (max 8), plus one boss
- Regular enemies have 20% HP; boss has full HP
- Player HP/Zeal carry between fights; combat state resets each enemy
- Infinite escalation: new wave generated on wave clear

### Training Mode
- Dummy modes: Stand (F1), Crouch (F2), Jump (F3), CPU (F4)
- F5 resets positions and HP
- Dummy HP auto-regenerates when not in hitstun
- Player HP stays full; timer never expires
- Dummy respawns on KO

## Source Files

```
duel/
├── config/
│   ├── characters/      16 individual character definition files
│   ├── DuelBalanceConfig.ts
│   ├── DuelCharacterDefs.ts  (registry + Arthur, Merlin, Elaine, Lancelot inline)
│   └── DuelArenaDefs.ts
├── state/
│   └── DuelState.ts          Interfaces: DuelState, DuelFighter, DuelMoveDef, Hitbox, DuelProjectile
├── systems/
│   ├── DuelInputSystem.ts    Keyboard input, special detection, buffer
│   ├── DuelFightingSystem.ts Physics, hitbox collision, blocking, damage, combos
│   ├── DuelProjectileSystem.ts Projectile spawning, movement, collision
│   ├── DuelAISystem.ts       AI opponent with difficulty tiers and combo routes
│   └── DuelAudioSystem.ts    Procedural audio for hits, blocks, KOs
├── DuelGame.ts               Main orchestrator, game loop, round/wave management
└── DuelStateMachine.ts       Phase transitions (CHAR_SELECT -> FIGHTING -> ROUND_END etc.)
```

## Incomplete / Stubbed Systems

- **No counter-hit system**: Unlike Tekken mode, there is no bonus for hitting an opponent during their attack startup. All hits deal the same damage regardless of defender state
- **No height-based defensive options**: No high crush (moves that duck highs) or low crush (moves that hop lows). Blocking is the only defensive mechanic against attacks of different heights
- **Weight parameter unused**: Every character definition has a `weight` field, but all are set to approximately 1.0 and the value is never used in knockback or juggle calculations
- **Characters template-generated**: 16 of 20 characters (all except Arthur, Merlin, Elaine, Lancelot) are generated via `_buildSpecials()` helper with the same button combos. Their specials share identical frame data patterns with only names changed
- **AI never uses Zeal moves**: The AI decision tree has no path that triggers `zeal_1` or `zeal_2` inputs. AI fighters will accumulate meter but never spend it
- **No tech roll**: After knockdown, fighters go through a fixed 40-frame knockdown + 20-frame get-up. There is no input to quick-recover or roll
- **Settings menu stub**: The "SETTINGS" option in the main menu returns directly to the main menu with no settings screen

## Improvement Ideas

1. **Counter-hit system**: Add bonus damage and hitstun when hitting an opponent during their attack startup, rewarding reads and punishes
2. **Height-based defense**: Add high-crush and low-crush properties to specific moves (e.g. crouching attacks crush highs, jumping attacks crush lows)
3. **Character differentiation**: Give the 16 template characters unique frame data, move properties, and playstyle identity instead of sharing the same specials with different names
4. **Use weight parameter**: Apply weight to knockback distance and juggle gravity so heavier characters are harder to push/launch
5. **AI Zeal usage**: Add decision logic for AI to spend Zeal meter at close range when the player is vulnerable, or as a combo finisher
6. **Tech roll / wake-up options**: Add tech roll (quick recovery on knockdown) and wake-up attacks to create depth in the knockdown game
7. **Combo scaling rebalance**: 0.9x with 0.30 floor is aggressive (5th hit deals only 59% base damage). Consider 0.92x or a higher floor for longer combos to remain rewarding
8. **Motion inputs**: Currently specials are purely simultaneous presses. Adding directional motion inputs (quarter-circle, dragon-punch) would allow more specials per character without button exhaustion
9. **Proper round transition**: Currently uses `setTimeout` for round transitions; would benefit from a state-machine-driven transition with animation support
10. **Complete settings screen**: Add volume controls, difficulty selector, round count options, and button remapping
