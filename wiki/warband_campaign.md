# Warband Campaign Mode (Strategic Overworld)

**Enum**: `GameMode.WARBAND_CAMPAIGN`
**Source**: `/warband/WarbandCampaign.ts`
**Framework**: Canvas 2D (overworld map) + Three.js (battles via WarbandGame)
**Players**: 1 vs multiple AI factions

## Overview

Mount & Blade-style campaign on a procedurally generated overworld map (1600x1000 pixels). The player controls a hero leading a warband across the map, capturing cities, fighting roving warbands, trading goods, recruiting companions, and building up faction power. Battles are resolved by launching into the existing WarbandGame army battle system. Features multi-faction warfare, fog of war, seasonal effects, food/morale supply lines, hero leveling with perks, named AI lords with personalities, companion heroes with unique skills, town buildings, trade goods, mercenary contracts, siege equipment, and three victory conditions.

## Gameplay Loop

```
OVERWORLD MAP (move party, visit cities, engage enemies, manage supplies)
-> CITY MENU (recruit units, buy food, build buildings, trade goods, craft siege equipment)
-> BATTLE (triggered by proximity to enemy party -> WarbandGame army battle)
-> POST-BATTLE (loot gold, gain XP, unit XP gain, morale shift)
-> repeat until victory condition met
```

## Victory Conditions

- **Conquest**: Capture all cities on the map
- **Diplomatic**: Form 3 alliances with other factions
- **Economic**: Accumulate 50,000 gold total

## Key Systems

### Map Generation

Procedural map with:
- **Cities**: 2-3 per faction, each with garrison, buildings, trade goods, food stock
- **Villages**: 1-3 linked per city, providing income based on population
- **Special Locations**: 8-12 explorable sites (ruins, dungeons, lairs, shrines, treasures) with difficulty ratings and gold/unit rewards
- **Terrain Regions**: 20-32 regions of forest, mountains, hills, desert, swamp, snow, and lakes with movement speed penalties (forest 0.7x, mountains 0.5x, swamp 0.5x, snow 0.65x, lake 0.15x)
- **Rivers**: 2-4 winding waterways generated from mountains or map edges
- **Coastline**: Ocean along 1-2 map edges
- **Roads**: Automatically drawn between nearby cities (2-3 connections each)

### Faction System

Uses race definitions from the shared config (excluding "op" race). Each faction has:
- Multiple cities with garrisons
- Roving warband parties (12 total at game start)
- Faction elite units (tier 5, 160 HP, 400 gold cost)
- Bidirectional faction relations (-100 hostile to +100 allied)
- War declarations and trade agreements tracked with timestamps

### Hero Progression

- Max level: 20
- XP per level: N * 150 (level N requires that much XP)
- 9 perks to choose from on level-up:

| Perk | Effect |
|------|--------|
| Swift | +15% map movement speed |
| Commander | +5 max party size |
| Merchant | +20% city income |
| Veteran | +20 HP for hero in battle |
| Intimidate | 10% chance enemies flee |
| Looter | +30% loot from battles |
| Logistician | -15% food consumption |
| Engineer | -20% building costs |
| Tactician | +10% flanking damage bonus |

### Companion Heroes

4-6 companions scattered across the map, each with:
- Class (warrior, archer, mage, scout)
- Unique passive skill (shield wall, pathfinder, arcane barrage, eagle eye, berserker rage, healing aura, ambush master, merchant contacts)
- Loyalty (0-100), level, XP
- Personal quests (kill lord, explore location, deliver goods, defend city) with gold/loyalty/XP rewards

8 defined companions: Gareth Ironhelm, Lyra Swiftshadow, Theron Flamecaller, Mira Trueshot, Bjorn Thunderfist, Elara Moonwhisper, Kael Darkblade, Senna Goldtongue.

### Named AI Lords

~60% of AI parties are led by named lords with:
- 5 personality types: aggressive, cautious, mercantile, diplomatic, ruthless
- Level (1-5), renown (10-50), ransom cost (200-800 gold)
- Personal rival lord tracking
- Can be captured and ransomed
- 24 possible lord names (Aldric the Bold, Baron Vexmoor, Countess Miravel, etc.)

### Seasons

30-day cycle: Spring -> Summer -> Autumn -> Winter

| Season | Speed | Income | Food Cost | Color |
|--------|-------|--------|-----------|-------|
| Spring | 1.0x | 1.1x | 1.0x | Green |
| Summer | 1.1x | 1.2x | 0.9x | Gold |
| Autumn | 0.95x | 1.0x | 1.1x | Orange |
| Winter | 0.75x | 0.7x | 1.4x | Blue |

### Food & Morale Supply System

- Each unit consumes 0.5 food/day
- Food purchasable at cities (2 gold/unit, 50 stock per city)
- Morale (0-100) affected by: no food (-5), near own cities (+2), victory (+10), defeat (-15)
- Units desert below morale threshold of 20

### Town Buildings

6 building types, upgradable per city:

| Building | Max Level | Base Cost | Effect |
|----------|-----------|-----------|--------|
| Training Grounds | 3 | 800 | +50% unit XP gain per level |
| Fortifications | 3 | 1,000 | +10 garrison cap, +20% defense per level |
| Market | 3 | 600 | +30 gold/day income per level |
| Stables | 2 | 700 | Unlocks cavalry, -10% cavalry cost per level |
| Siege Workshop | 2 | 1,200 | Unlocks siege equipment crafting |
| Mage Tower | 2 | 900 | Unlocks mage recruitment, +1 mage tier per level |

### Trade System

10 trade goods across 4 categories:
- **Food**: Grain (20g), Salted Meat (35g)
- **Luxury**: Wine (50g), Spices (80g), Silk (100g)
- **Military**: Iron (45g), Weapons (70g), Horses (120g)
- **Raw**: Lumber (25g), Stone (30g)

Cities have variable supply/demand pricing. Player can carry trade goods and sell at different cities.

### Siege Equipment

| Equipment | Cost | Build Time | Effect |
|-----------|------|------------|--------|
| Siege Ladders | 200 | 1 day | Basic wall scaling, -10% attack penalty |
| Battering Ram | 500 | 2 days | Break gates, bypass wall defense |
| Siege Tower | 800 | 3 days | Scale walls with no penalty |
| Siege Catapult | 1,000 | 3 days | Bombardment: -20% garrison before battle |

### Mercenary Contracts

Hireable mercenary companies (The Iron Company, Crimson Wolves, Blackwater Sellswords, etc.) with:
- Specific unit compositions and counts
- Duration in days
- Gold cost

### Unit Upgrade Paths

Units gain XP (25 per win, 10 per loss) and promote at 100 XP threshold:
- Swordsman -> Knight -> Defender
- Archer -> Longbowman
- Pikeman -> Halberdier
- Scout Cavalry -> Lancer

15 campaign unit types available at cities (tier 1-5, cost 100-400 gold).

### Campaign Events

Checked every 7 days after day 5. Event types:
- **Bandit Raid**: Targets a city
- **Merchant Festival**: Economic bonus
- **Plague**: Negative health effect
- **Deserters**: Troops abandon
- **Alliance Offer**: Diplomatic opportunity

### Fog of War

Grid-based (10px cells). Player has 80px scouting radius, allied cities reveal 60px radius. Previously explored cells remain visible.

### Wandering NPCs & Caravans

- 4 merchant caravans travel between cities carrying 2-4 goods
- 3 wandering NPCs (hermit, messenger, refugee) roam the map with interaction events

### Overworld Rendering

Pre-baked ground texture with:
- Multi-octave value noise for natural grass coloring
- Radial gradient terrain regions (forest canopy, mountain rock, desert sand, etc.)
- Scatter features (trees with conifer/deciduous variants, mountain peaks with snow caps, swamp reeds, snow drifts, dunes)
- Lake surface highlights
- Winding roads between cities
- Coastline with foam lines and sandy beach strips

## Source Files

```
warband/
├── WarbandCampaign.ts    Complete campaign mode (map gen, state, AI, rendering, UI)
├── WarbandGame.ts        Battle system (launched from campaign for combat resolution)
├── config/               Shared weapon/armor/creature/balance configs
├── state/                Shared state types
├── systems/              Shared combat/physics/AI/input systems
└── view/                 Shared rendering systems
```

## Incomplete / Stubbed Systems

- **Battle resolution**: Campaign launches WarbandGame for battles, but the integration for extracting survivors, casualties, and loot back into campaign state may not be fully wired
- **Companion quests**: Quest types defined (kill lord, explore, deliver, defend) but quest generation and completion logic is minimal
- **Mercenary contracts**: Data structures exist but hiring UI and contract expiration handling are basic
- **Faction AI**: Roving bands have target positions but no strategic AI for city capture, army coordination, or diplomatic decision-making
- **Trade route economy**: Price variation by supply/demand is defined but dynamic market simulation is not implemented
- **Siege equipment usage**: Equipment can be built but integration with battle modifiers is not fully connected
- **Lord capture/ransom**: Data structures exist (capturedBy, ransomCost) but the capture flow and ransom negotiation UI are stubbed
- **Wandering NPC interactions**: NPCs exist on the map but interaction events are minimal
- **Village raiding**: Villages have population and income but no raid/pillage mechanics

## Improvement Ideas

1. **Strategic faction AI**: AI lords should evaluate threats, coordinate armies, besiege cities, and make diplomatic decisions based on personality
2. **Dynamic economy**: Implement supply/demand curves so trade goods change price based on production, consumption, and war disruptions
3. **Companion depth**: Full quest chains with narrative dialogue, loyalty consequences for decisions, companion conflict events
4. **Siege warfare**: Multi-phase siege (bombardment -> breach -> assault) using built siege equipment, with wall HP and garrison defender advantages
5. **Diplomacy UI**: Player-initiated peace offers, alliance proposals, trade agreements, vassal demands, and marriage diplomacy
6. **Lord prisoner system**: Capture lords in battle, negotiate ransom or recruit them, prisoner escape attempts
7. **Village economy**: Raids reduce income and population, rebuilding takes time, villagers flee to linked city during war
8. **Campaign events expansion**: Larger event pool with multi-choice outcomes, chain events, and faction-wide consequences
9. **Overworld combat preview**: Show army composition comparison before committing to battle, with retreat option based on hero perks
10. **Save/load system**: Persistent campaign state serialization for long-running campaigns
