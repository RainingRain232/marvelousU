# Wave Mode

**Enum**: `GameMode.WAVE`
**Source**: `/sim` core
**Framework**: PixiJS 2D
**Players**: 1 (vs AI)

## Overview

Wave-defense variant of the autobattler with a corruption/greed system. Players defend against increasingly difficult waves of enemies while managing a "Grail Greed" corruption mechanic that offers risk/reward tradeoffs.

## Gameplay Loop

```
PREP → WAVE (enemies attack) → RESOLVE → PREP (repeat with harder wave)
```

## Key Mechanics

### Wave Progression
- Enemies spawn in waves with increasing difficulty
- Wave composition escalates: basic units → mixed armies → elite compositions
- Wave count determines enemy gold budget and unit tier

### Grail Greed / Corruption System
The distinguishing feature of Wave mode — a corruption mechanic that tempts players with power at the cost of increasing difficulty:
- Players can activate corruption bonuses between waves
- Higher corruption = stronger enemies but better rewards
- Creates meaningful risk/reward decisions each round

### Shared Systems
Uses all Standard mode systems (buildings, economy, units, spells) but in a defensive context.

## Source Files

Uses `/sim` core with wave-specific logic in `PhaseSystem.ts`.

## Improvement Ideas

1. **Expand corruption tiers**: More granular corruption levels with distinct visual/mechanical effects per tier
2. **Wave-specific modifiers**: Each wave rolls a random modifier (fire-resistant enemies, double speed, armored, etc.)
3. **Between-wave shop upgrades**: Spend corruption points on permanent buffs (building health, unit damage, income boost)
4. **Boss waves**: Every 5th wave features a boss unit with unique mechanics
5. **Wave preview**: Show upcoming wave composition during PREP so players can counter-build
6. **Corruption cosmetics**: Higher corruption changes the map visually (blighted terrain, dark sky, corrupted buildings)
7. **Challenge waves**: Optional bonus waves with specific restrictions for extra rewards
8. **Leaderboard**: Track highest wave reached with corruption level
