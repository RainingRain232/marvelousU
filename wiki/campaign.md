# Campaign Mode

**Enum**: `GameMode.CAMPAIGN`
**Source**: `/sim` core
**Framework**: PixiJS 2D
**Players**: 1 (vs AI)

## Overview

25-scenario single-player progression through the Arthurian legend. Each scenario has unique mechanics, restrictions, enemy setups, and unlock rewards. Progress is saved to localStorage with victory codes.

## Gameplay Loop

```
Select Scenario → Play (Standard or Battlefield rules) → Win → Unlock next scenario + rewards → Repeat
```

## Progression System

### Scenario Unlocking
- Win scenario N → receive 4-digit victory code → unlocks scenario N+1
- Progress persists via localStorage

### Unlock Rewards
Completing scenarios progressively unlocks:
- New unit types
- New building types
- New leaders with bonuses
- New races
- Armory items for hero stat bonuses

### Scenario Types
- **Standard**: Full PREP/BATTLE cycles with buildings and economy
- **Battlefield**: Pre-positioned units, instant combat (scenarios 1-2, 4)

## Scenario Examples

| # | Name | Type | Special Mechanic |
|---|------|------|-----------------|
| 1-2 | Early battles | Battlefield | Tutorial with scripted armies |
| 5 | Dark Savant | Battlefield | 1v1 hero duel |
| 7 | Pixie Alliance | Standard | Allied pixie swarm (P3) |
| 10 | Grail Corruption | Standard | Blighted unit spawns |
| 12 | Ley Lines | Standard | Power point capture |
| 19 | Diplomats | Standard | Capture wavering enemy knights |
| 22 | Walls Only | Standard | Building restriction gimmick |
| 23 | Dragons | Battlefield | Dragons as battlefield neutrals |

### Scenario Config Options
- `p1NoBuild`: Restrict player building
- AI gold bonuses
- Blueprint restrictions
- Custom event spawns
- `disableEvents`: Toggle random events per scenario
- Pre-placed enemy buildings and units

## Source Files

Campaign scenarios are defined in the sim config, with `PhaseSystem.ts` handling scenario-specific setup.

## Improvement Ideas

1. **Difficulty tiers**: Each scenario available in Normal/Hard/Nightmare with different AI gold/abilities and rewards
2. **Reuse special mechanics**: Corruption (scenario 10) and diplomats (scenario 19) are great but appear only once — sprinkle them into more scenarios
3. **Boss units**: Expand scenario 23's dragon concept — add legendary boss units in scenarios 20-25
4. **Carry-forward rewards**: Gold/resources carry between scenarios (reward optimal play, not just brute force)
5. **Failure branches**: Losing a scenario drops difficulty rather than forcing identical retry
6. **Dynamic AI**: Enemy uses racial abilities and counter-picks based on player's chosen race
7. **Mid-game variety (scenarios 6-10)**: Currently feel like stat tweaks — need more unique mechanics
8. **Unit unlock pacing**: Most units unlock by scenario 12; scenarios 13-25 need continued progression hooks
9. **Scenario-specific achievements**: "Beat scenario 5 without taking damage", "Win scenario 12 in under 3 minutes"
10. **New Game+ campaign**: Replay all scenarios with harder AI and scaled rewards
