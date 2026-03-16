# Deathmatch Mode

**Enum**: `GameMode.DEATHMATCH`
**Source**: `/sim` core (shared with Standard)
**Framework**: PixiJS 2D
**Players**: 2-4

## Overview

High-resource skirmish variant of Standard mode. Players start with 10,000 gold (6.67x more than Standard), encouraging immediate large-scale army building and aggressive early engagement.

## Gameplay Loop

Same as Standard: `PREP (30 sec) → BATTLE → RESOLVE (5 sec) → repeat`

## Key Differences from Standard

| Feature | Standard | Deathmatch |
|---------|----------|------------|
| Starting gold | 1,500 | 10,000 |
| Random events | Yes | Yes |
| Buildings | Yes | Yes |
| PREP duration | 30 sec | 30 sec |
| Win conditions | Same | Same |

The only mechanical difference is the starting gold value (set in `PhaseSystem.ts`).

## Source Files

Same as Standard — the mode is differentiated only by config values in `PhaseSystem.ts`.

## Improvement Ideas

The biggest issue with Deathmatch is that it feels like a minor variant rather than a distinct mode. To give it real identity:

1. **Shorten PREP to 15 seconds**: Force faster decision-making under pressure
2. **Disable neutral buildings**: No passive income — only what you build matters
3. **Scale unit costs down 20%**: Let the extra gold buy army diversity, not just "same army faster"
4. **Increase random event frequency**: Every 15 sec instead of 30 to keep battles chaotic
5. **Disable alliances**: Pure FFA or fixed teams only — no diplomacy
6. **Victory by base destruction only**: Remove "total wipe" win condition for faster-paced matches
7. **No building blueprints**: Start with all building types unlocked to skip the Castle-first bottleneck
8. **Escalating damage bonus**: +5% damage per minute to prevent turtling
9. **Sudden death timer**: After 10 minutes, both bases take 10 damage/sec
