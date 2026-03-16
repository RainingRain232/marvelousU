# Battlefield Mode

**Enum**: `GameMode.BATTLEFIELD`
**Source**: `/sim` core
**Framework**: PixiJS 2D
**Players**: 2

## Overview

Instant-action elimination mode. No buildings, no economy, no PREP phase. Both players spawn with armies already on the field at opposite ends. Last player with living units wins.

## Gameplay Loop

```
BATTLE (immediate) → victory/defeat
```

No prep phase. Combat begins instantly. One round, winner takes all.

## Win Conditions

- Last player with living units wins (`_checkBattlefieldWin`)
- No base health mechanic
- No building consideration

## Key Mechanics

### Army Spawning
- Units are pre-positioned on the field near each player's side
- Army composition determined by scenario (Campaign) or preset
- Starting gold: 30,000 (irrelevant — no economy)

### No Economy
- No gold income
- No building placement
- No shop purchases
- Pure tactical combat

### Random Events
**Disabled** (`eventTimer = Infinity`)

## Source Files

Same `/sim` core as Standard, with battlefield-specific win condition check and phase skip logic in `PhaseSystem.ts`.

## Usage in Campaign

Campaign scenarios 1-2 and 4 use Battlefield type, providing scripted army compositions for each side.

## Improvement Ideas

1. **Draft/placement phase (15 sec)**: Show player a budget + available units, let them pick and position units on a spawn zone strip. This adds player agency and skill expression
2. **Randomized enemy rosters**: Vary enemy composition within a budget so each match feels different
3. **Map obstacles**: Walls, rivers, high ground that restrict movement and line of sight
4. **Shrinking arena**: After 3 minutes, map boundary shrinks inward, forcing center engagement
5. **Bounty system**: Killing specific marked enemy units grants bonus points or temporary buffs
6. **Tiered waves**: Instead of one army each, battle plays out in 3 waves (units spawn in batches)
7. **Terrain effects**: Mountains give defense bonus, swamps slow movement, forests hide units
8. **Pre-battle scouting**: Brief 5-sec phase showing enemy composition before battle starts
