# Grail Manager Mode (Management Simulation)

**Enum**: `GameMode.GRAIL_MANAGER`
**Source**: `/grailmanager` (5 files + shared renderer)
**Framework**: PixiJS 2D, DOM overlays
**Players**: 1 (single-player management sim)

## Overview

A Football Manager-style medieval management simulation where the player manages a Grail Ball club through a full season. Features squad building, formation tactics, training, facility upgrades, a transfer market, league and cup competitions, match simulation with live commentary, and financial management. All set in the Arthurian universe with 8 themed teams.

## Gameplay Loop

```
MAIN_MENU → NEW_GAME_SETUP (choose team + manager name)
→ DASHBOARD (weekly hub)
  Each week cycle:
  1. Set TRAINING type for the squad (7 options)
  2. Manage TRANSFERS (buy/sell during window, weeks 1-8)
  3. Adjust TACTICS (formation, team instruction)
  4. Upgrade FACILITIES (6 facility types, 5 levels each)
  5. Review SQUAD (injuries, morale, form, contracts)
→ MATCH (league or cup fixture)
  - Watch live with commentary or quick-sim
  - 3 match speeds: Normal (1x), Fast (3x), Instant (100x)
→ League table and cup bracket updated
→ Repeat for 30 weeks
→ SEASON_END (trophies, final standings)
```

## Key Systems

### Teams (8 clubs)

| Team | Rep | Budget | Style | Formation | Personality |
|------|-----|--------|-------|-----------|-------------|
| Camelot Lions | 85 | 15000g | Balanced | 2-2-2 | Prestigious |
| Avalon Mystics | 80 | 12000g | Possession | 1-2-3 | Magical |
| Saxon Wolves | 75 | 10000g | Attacking | 1-3-2 | Aggressive |
| Orkney Ravens | 70 | 8000g | Defensive | 3-2-1 | Defensive |
| Cornwall Griffins | 65 | 7000g | Balanced | 2-2-2 | Youth-focused |
| Northumbria Bears | 68 | 7500g | Defensive | 3-2-1 | Physical |
| Wessex Eagles | 72 | 9000g | Counter-Attack | 2-1-3 | Counter-attack |
| Lothian Stags | 74 | 9500g | Possession | 2-3-1 | Tactical |

### Player Generation & Stats
Each player has 6 stats (1-100): Attack, Defense, Speed, Magic, Stamina, Morale

4 player classes with distinct stat distributions:
- **Gatekeeper**: High defense (70 base), high stamina
- **Knight**: Balanced defense/attack, good stamina
- **Rogue**: High speed (70 base), good attack
- **Mage**: High magic (70 base), high attack

Additional attributes: potential (growth ceiling), age (16-34), form (-3 to +3), traits (12 personality types: Brave, Cunning, Loyal, Volatile, Lazy, Leader, Prodigy, Veteran, Fragile, Iron Will, Greedy, Humble).

Squads generated with 18 players per team: 2 GK + 4 Knight + 5 Rogue + 5 Mage + 2 random. Quality scaled by team reputation.

### Formation & Tactics
- 6 formations: 2-2-2, 1-3-2, 2-1-3, 3-2-1, 1-2-3, 2-3-1 (all exclude GK from notation)
- 5 team instructions: Attacking, Balanced, Defensive, Counter-Attack, Possession
- Auto-lineup picks best available players per formation slots
- Starting 7 + 3 substitutes from squad

### Training System (7 types)

| Training | Primary Boost | Secondary | Morale | Injury Risk |
|----------|--------------|-----------|--------|-------------|
| Fitness | Stamina +1.0 | Speed +0.3 | -1 | 3% |
| Attack Drills | Attack +1.0 | Magic +0.2 | 0 | 4% |
| Defensive Drills | Defense +1.0 | Stamina +0.2 | 0 | 3% |
| Speed Training | Speed +1.0 | Attack +0.2 | -1 | 5% |
| Spellwork | Magic +1.2 | Attack +0.3 | +1 | 2% |
| Teamwork | Morale +2.0 | - | +3 | 1% |
| Rest & Recovery | - | - | +2 | 0% |

Training effectiveness scales with Training Ground facility level (1 + level * 0.1 multiplier). Stats capped by player potential.

### Facility Upgrades (6 types, 5 levels each)

| Facility | Effect | Max Level Cost |
|----------|--------|---------------|
| Training Ground | Training effectiveness (+5% to +60%) | 12000g |
| Stadium | Capacity (+2000 to +16000 seats) + revenue | 20000g |
| Medical Bay | Injury duration reduction (-10% to -70%) | 10000g |
| Youth Academy | Youth player generation quality + frequency | 15000g |
| Scouting Network | Transfer market visibility + negotiation | 9000g |
| Alchemy Lab | Stat-boost potions and match-day buffs | 12000g |

Construction takes 2-10 weeks depending on level. Multiple projects can run in parallel.

### Transfer Market
- Transfer window: weeks 1-8
- 12-20 free agents generated + AI team surplus players listed
- AI teams actively buy players during window (30% chance per week)
- Asking price with negotiation variance (25%)
- Player contracts: 1-5 years, wage negotiation
- Sell-on fee: 10%

### Match Simulation (`GrailManagerSim.ts`)
- Simulates minute-by-minute with events: goals, saves, tackles, fouls, injuries, substitutions, spells
- Commentary templates with player name interpolation (7+ categories, 40+ templates)
- Weather system: 6 types (Clear, Rain, Fog, Storm, Snow, Wind) with gameplay modifiers
- Home advantage: 1.08x multiplier
- 3 match speeds for live viewing
- Player ratings generated per match
- Injury system: 8 injury types from Minor Bruise (1 week) to Torn Ligament (many weeks)

### Weather Effects

| Weather | Speed | Magic | Injury | Description |
|---------|-------|-------|--------|-------------|
| Clear | 1.0x | 1.0x | 1.0x | Perfect conditions |
| Rain | 0.9x | 0.85x | 1.3x | Treacherous footing |
| Fog | 0.95x | 1.1x | 1.0x | Advantage to the cunning |
| Storm | 0.85x | 0.7x | 1.5x | Magic unstable |
| Snow | 0.8x | 1.0x | 1.2x | Slow but magical |
| Wind | 1.05x | 0.9x | 1.1x | Disrupts passes |

### League & Cup
- **League**: Full round-robin (14 match weeks, home and away), 3 points for win, 1 for draw, sorted by points/GD/GF
- **Cup**: 4-round knockout (Quarter-Final, Semi-Final x2, Grand Final), random draw
- Cup bracket auto-advances winners to next round

### Financial System
- Income: ticket revenue (capacity * 60% * 5g base price) + sponsorship (500g base + reputation scaling)
- Expenses: weekly player wages (sum of squad wages)
- Income earned on match weeks only
- Budget management across transfers, wages, and facility upgrades

### Age Progression & Development
- Players grow stats naturally if under age 24 (peak at 24)
- Youth players grow at 1.5x rate
- Decline starts at age 30 (random stat drops)
- Youth academy spawns new players based on facility level (15% base chance per week per level)
- Morale drifts toward 60 over time; boosted by wins (+5), dropped by losses (-4)

### Save/Load System
- LocalStorage-based save with multiple slots
- Full state serialization (strips non-serializable fields)
- Save/load/delete per slot

## Source Files

```
grailmanager/
├── GrailManagerConfig.ts    TeamDef, PlayerDef, Formation, FacilityUpgrade, TrainingEffect,
│                           SeasonConfig, Fixture generation, Cup bracket, Weather system,
│                           Player generation, Squad generation, MATCH_COMMENTARY_TEMPLATES
├── GrailManagerState.ts     GrailManagerState, GMScreen, TeamState, LeagueEntry, LiveMatchState,
│                           TransferOffer, createState, initNewGame, pickBestLineup,
│                           advanceWeek, updateLeagueTable, save/load
├── GrailManagerSim.ts       Match simulation engine, minute-by-minute events, commentary
├── GrailManagerAI.ts        AI team decisions (transfers, lineup, training, tactics)
├── GrailManagerRenderer.ts  PixiJS rendering (pitch visualization, player positions)
└── GrailManagerGame.ts      Main orchestrator, screen management, input, DOM overlays
```

## Incomplete / Stubbed Systems

- **Youth academy/scouting**: Facility types exist and youth spawning works, but scouting network has no actual revealed-stat mechanic
- **Player contracts**: Simplified -- contract years tracked but no negotiation UI, no contract expiry events, no free agency drama
- **Media/press**: News headlines are random flavor text; no press conferences, no fan reactions to results, no media pressure
- **Alchemy Lab**: Facility upgrades defined but match-day buff application is likely stubbed
- **AI team tactics**: AI teams get random training and basic transfer behavior but do not dynamically adjust formations or instructions based on results
- **Match substitutions**: Sub fields exist in LiveMatchState but in-match substitution logic for the human player may be minimal

## Improvement Ideas

1. **Youth academy depth**: Full youth team with matches, graduation events, loan system for developing players at other clubs
2. **Scouting reports**: Detailed player reports with hidden stats revealed by scout level, wonderkid identification
3. **Press conferences**: Pre/post-match press events affecting morale and reputation, media narrative arcs
4. **Fan engagement**: Fan satisfaction meter, stadium atmosphere rating, merchandise revenue, fan protests if results are poor
5. **Stadium expansion**: Visual stadium upgrades, VIP boxes, naming rights sponsorship deals
6. **International competitions**: Inter-realm tournament between the 8 clubs + generated foreign teams
7. **Player development paths**: Specialized training programs, mentorship system (veteran teaches youth), position retraining
8. **Dynamic AI**: AI managers with distinct personalities that adapt tactics based on league position and opponent strength
9. **Financial depth**: Loan system, sponsorship tiers, prize money, financial fair play rules, bankruptcy risk
10. **Multi-season progression**: Season-to-season continuity with retirement, aging, reputation building, dynasty tracking
