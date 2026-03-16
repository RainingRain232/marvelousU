# World Mode (4X Grand Strategy)

**Enum**: `GameMode.WORLD`
**Source**: `/world` (9 subdirectories)
**Framework**: PixiJS 2D, Hex grid
**Players**: 1 vs multiple AI

## Overview

Turn-based 4X grand strategy game on a hex grid. Players manage cities, research technology, move armies, cast overland spells, and wage wars with diplomacy. Features a Morgaine escalation system as the primary antagonist and a Grail Quest narrative.

## Gameplay Loop

```
PLAYER_TURN (move armies, manage cities, cast spells, research)
→ BATTLE (resolve any army conflicts via SimLoop autobattle)
→ AI_TURN (all AI players take actions)
→ repeat until victory/defeat
```

## Victory Conditions

- **Domination**: Last player standing (all opponents eliminated)
- **City Control**: Own all cities on the map
- **Research Victory**: Complete one technology per research branch

## Key Systems

### Turn System (`TurnSystem.ts`)
- Player/AI turn cycling with phases
- Begin turn: income, food consumption, research progress, army maintenance
- End turn: AI actions, event checks, Morgaine escalation

### Economy (`WorldEconomySystem.ts`)
- **Per-city yields**: Gold, food, production, mana, science
- **Yield sources**: Terrain, resources, improvements, buildings, leader bonuses
- **Food system**: Consumption per population, starvation penalties, growth thresholds with stockpile
- **Army maintenance**: Scaled by unit tier cost, deducted each turn

### Research (`ResearchSystem.ts`)
- **Normal research**: 5 branches — Military, Magic, Economic, Siege, Buildings
- **Magic research**: Per-school tiers (fire, ice, lightning, etc.)
- **Fractional progress**: Magic/normal ratio splits effort
- **Library building**: +1 research bonus
- **5-tier unit unlock chain**: Bronze → Iron → Steel → Mithril → Adamantine → Legendary

### Overland Spells (25+ spells)
| Category | Examples |
|----------|---------|
| Utility | Eagle Eye (vision), Awareness (full map), Mass Teleport |
| Economy | Alchemy (conversion), Prosperity (+3 gold), Fertility (+50% food) |
| Warfare | Meteor Storm (army damage), Armageddon (kill low-HP), Time Stop (skip enemy turn) |
| Curses | Famine (0 food), Pestilence (population loss), Corruption (0 yields) |
| Defense | Great Warding, Spell Blast (counter), Planar Seal |

Duration tracking: permanent (0) vs timed effects with cooldowns.

### Army & Combat (`BattleResolver.ts`)
- Bridges world armies to SimLoop (RTS autobattle system)
- Unit stacking: multiple unit types per army with HP tracking
- **Field battles**: Army vs army
- **Siege battles**: Attacker vs city garrison + field army
- **Camp encounters**: Neutral barbarian camps (3-tier difficulty)
- Survivors extracted from battle, settler units preserved

### AI System (`WorldAI.ts`)
4-tier strategy evaluation:
- **EXPLORE**: Scout unknown territory
- **DEVELOP**: Build economy, research, recruit
- **ATTACK**: Target weak enemies, assemble armies
- **DEFEND**: Reinforce threatened cities

Features threat assessment (enemy army strength within 5 hexes), research prioritization, mixed army composition, and garrison threshold management.

### Morgaine Escalation System
The primary antagonist mechanic that pressures all players:
- **15-turn army spawning**: Escalating tier (knights → crossbow → mages → dark savants → red dragon)
- **10-turn corruption**: Territory expansion converting adjacent tiles to wasteland
- **Fake sword traps**: AI avoids them; players can fall in for ambush encounters
- **8-turn curse cycle**: Post-turn-30 curses against player cities
- **3-crystal requirement**: Collect Morgaine army defeats to unlock Avalon invasion

### Diplomacy
- **Affinity system**: Ally (30% peace proposal), Family (20%), Enemy (15% war declaration)
- Bidirectional: peace affects both players when accepted
- Hardcoded no-peace with Morgaine

### Fog of War (`FogOfWarSystem.ts`)
- Vision around armies and cities using hexSpiral
- Basic implementation — no sight-blocking terrain

## Source Files

```
world/
├── state/          WorldState, WorldPlayer, WorldArmy, WorldCity
├── systems/        TurnSystem, BattleResolver, WorldAI, ResearchSystem,
│                   GrailQuest, FogOfWarSystem, LeaderEncounters, WorldEconomySystem
├── hex/            HexCoord geometry, HexPathfinding, hex spiral traversal
└── config/         TerrainDefs, WorldBuildingDefs
```

## Incomplete / Stubbed Systems

- **Neutral city-states** (`NeutralCitySystem.ts`): Creates 3 neutral cities but no raider spawning or interaction mechanics
- **GrailQuest**: Referenced but mostly empty
- **Camlann Event**: Endgame narrative framework exists but incomplete
- **Strategic resources**: Iron/horses checks exist but no actual yield bonuses or depletion
- **Fog of War**: No sight-blocking terrain, no scout units, no multi-layer vision

## Improvement Ideas

1. **Complete neutral cities**: Trade routes, raider spawning from camps, player conquest/alliance mechanics, city-state quests
2. **Leader uniqueness**: Unique buildings (Arthur's Round Table), unique units (Camelot Guard, Morgan's Acolytes), personality-driven AI
3. **Economy balance**: Diminishing returns on city size, scaled army maintenance by army count (not just units), luxury resources with trade value
4. **Terrain in battles**: Mountains = defense bonus, swamps = slower movement, forests = ambush advantage
5. **Spell counterplay**: Awareness and Time Stop need counters — add Dispel, Spell Resistance, or mana costs that scale with power
6. **AI variance**: Randomize AI strategy preferences (some always aggressive, some turtle, some expand) instead of deterministic evaluation
7. **Diplomacy depth**: Espionage, alliance mechanics (shared vision, trade), remember broken treaties, vassal states
8. **Fog of War upgrade**: Sight-blocking terrain, scout units with extended vision, visibility decay with distance
9. **Complete GrailQuest**: Full narrative progression with quest markers, narrative events, and branching outcomes
10. **Technology trading**: Allow allied players to share research for diplomatic leverage
