# Standard Mode

**Enum**: `GameMode.STANDARD`
**Source**: `/sim` core + `/view`
**Framework**: PixiJS 2D
**Players**: 2-4

## Overview

The default autobattler mode. Players build an economy, place buildings, recruit units, and battle to destroy the opponent's base. Features full building placement, unit spawning with group queuing, a shop system, and spell casting.

## Gameplay Loop

```
PREP (30 sec) → BATTLE → RESOLVE (5 sec) → repeat
```

1. **PREP phase**: Players spend gold to place buildings and recruit units
2. **BATTLE phase**: Units auto-fight, spells trigger, projectiles fly
3. **RESOLVE phase**: Victory check, brief pause, then next round

## Win Conditions

- Destroy opponent's base (base health ≤ 0)
- Total wipe: opponent has no living units AND no active buildings
- All surviving players allied → shared victory

## Key Mechanics

### Economy
- **Starting gold**: 1,500
- **Base income**: 5 gold/sec (all phases)
- **Battle bonus**: +3 gold/sec during BATTLE
- **Building income**: +1 gold/sec per active/captured building

### Buildings
Players place buildings from Castle shop blueprints. Each building type sells different units:
- **Castle**: Main base, sells basic units + building blueprints
- **Barracks**: Infantry units (swordsmen, pikemen)
- **Stables**: Cavalry units
- **Mage Tower**: Mage units with spell abilities
- **Archery Range**: Ranged units
- Neutral buildings in map center can be captured for income

### Units
- Bought from building shops → enter spawn queue → deploy as group when threshold reached
- States: IDLE → MOVE → ATTACK → CAST → DIE
- Formation-based group movement with A* pathfinding

### Spells
16+ spell types cast by mage units during battle:
- Fireball (projectile AoE), Chain Lightning (bounce), Warp (teleport), Summon, Heal, Web, Block, Distortion, etc.

### Random Events
Every 30 seconds during BATTLE: bandits, gold bounties, cyclops, neutral unit spawns.

### Alliances
Players can propose alliances with other players. Allied players share victory.

### Leaders & Races
- Leader bonuses: income multipliers, unit cost reductions
- Race selections affect available units and stats
- Armory items boost hero stats

## Source Files

| File | Purpose |
|------|---------|
| `sim/state/GameState.ts` | Central game state |
| `sim/state/PlayerState.ts` | Per-player gold, buildings, faction |
| `sim/state/BattlefieldState.ts` | Grid, tile ownership |
| `sim/systems/PhaseSystem.ts` | PREP/BATTLE/RESOLVE cycling |
| `sim/systems/CombatSystem.ts` | Damage calc, targeting |
| `sim/systems/MovementSystem.ts` | Pathfinding, formations |
| `sim/systems/SpawnSystem.ts` | Queue processing, group deploy |
| `sim/systems/AISystem.ts` | Auto-battle unit AI |
| `sim/systems/BuildingSystem.ts` | Placement validation, capture |
| `sim/config/UnitDefinitions.ts` | Unit stats and costs |
| `sim/config/BuildingDefs.ts` | Building types, shop inventory |
| `sim/config/BalanceConfig.ts` | Global tuning values |

## Improvement Ideas

1. **AI personalities**: Currently always marches to base. Add aggressive, defensive, economy-focused AI variants
2. **Map-specific mechanics**: Lava flows, forests that slow units, water crossings with bridges
3. **Unit role clarity**: Better tank/DPS/support distinction so cheap units stay relevant late-game
4. **Stalemate prevention**: Escalation timer spawning neutral threats after 5 minutes
5. **Building cooldown zones**: Prevent spam-placing defensive towers in same area
6. **Dynamic difficulty**: Adaptive scaling based on player performance
7. **Race/Leader gameplay effects**: Currently stat-only bonuses — add unique buildings, units, or global abilities per race/leader
