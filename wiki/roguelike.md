# Roguelike Mode

**Enum**: `GameMode.ROGUELIKE`
**Source**: `/sim` core
**Framework**: PixiJS 2D
**Players**: 1 (vs AI)

## Overview

Endless survival mode where building availability is randomized each round. Players must adapt their strategy as 50% of building types become unavailable every PREP phase. Difficulty scales with round count.

## Gameplay Loop

```
PREP → BATTLE → RESOLVE → PREP (repeat forever until base destroyed)
```

## Win/Loss Conditions

- **Loss**: Base destroyed OR all units + buildings eliminated
- **Win**: Survive as long as possible (no explicit win condition)

## Key Mechanics

### Dynamic Building Pool
The signature mechanic — every PREP phase, `_rollRoguelikeDisabledBuildings` runs:
1. All building types except CASTLE and FIREPIT are candidates
2. Fisher-Yates shuffle of building types
3. 50% randomly disabled each round
4. Castle blueprints updated to reflect available types
5. `roguelikeDisabledBuildingsChanged` event emitted for UI

This forces players to adapt their strategy every round rather than repeating the same build order.

### Economy
- Starting gold: 1,500 (same as Standard)
- Standard income rates apply
- Random events: Enabled

### Difficulty Scaling
Difficulty increases with round count, but scaling is linear and predictable.

## Source Files

| File | Purpose |
|------|---------|
| `sim/systems/PhaseSystem.ts` | Building disable roll logic, round progression |
| All Standard `/sim` files | Shared combat, movement, spawning systems |

## Current Limitations

- Building disabling is **cosmetically impactful but strategically shallow** — losing Mage Tower for 2 rounds just means using the next-best building
- No meta-progression between runs (no persistent unlocks)
- No high-score display in UI (tracking exists but isn't surfaced)
- Enemy composition doesn't evolve with rounds
- After round 50+, nothing new happens mechanically
- The "Roguelike" name is misleading — no permadeath with meta-progression, no procedural dungeon

## Improvement Ideas

1. **Building "curse" instead of disable**: Disabled buildings cost 50% more gold instead of being removed entirely. Creates cost-tension, not just removal
2. **Evolving enemy composition by tier**:
   - Rounds 1-5: Basic infantry and archers
   - Rounds 6-15: Mages, cavalry, siege units
   - Rounds 16-25: Dragons, elite units, complex formations
   - Rounds 25+: Random chaos combinations
3. **Difficulty modifiers (player choice)**: Before round 1, choose handicaps like "Enemy gold +20%" or "Your units 10% slower" for bonus rewards
4. **Wave events every 5 rounds**:
   - Round 5: "Mercenary wave" — hire a temporary powerful unit
   - Round 10: "Supply drop" — 1,500 free gold
   - Round 15: "Ritual" — reroll disabled buildings (costs 500 gold)
   - Creates memorable milestone checkpoints
5. **Meta-progression**: Persistent unlocks across runs (new starting bonuses, cosmetics, unit variants)
6. **Leaderboard UI**: Show top 10 runs and personal best on menu screen
7. **Round-specific gimmicks**: "All mage round", "siege units only", "double speed units"
8. **Escalating base pressure**: After round 20, base takes 1 damage/sec (increasing) to prevent infinite passive play
9. **Cosmetic unlocks**: Achieving round 50+ unlocks special unit skins or flag styles
