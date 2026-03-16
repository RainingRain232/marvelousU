# Medieval GTA Mode (2D Open-World Sandbox)

**Enum**: `GameMode.MEDIEVAL_GTA`
**Source**: `/medievalgta` (4 subdirectories)
**Framework**: PixiJS 2D
**Players**: 1

## Overview

Top-down 2D open-world sandbox set in the walled city of Camelot. The player roams freely through the city streets, interacts with ~41 named NPCs, accepts quests, engages in melee and ranged combat, rides horses, and manages a wanted level with a 5-star escalation system. The city is enclosed by walls with four gated entrances (N/S/E/W) and surrounded by farmland, forests, and bandit territory.

## Gameplay Loop

```
FREE ROAM (explore city, interact with NPCs, collect items)
-> QUEST (accept from NPC, complete objectives: talk/kill/collect/escort/reach)
-> COMBAT (fists/sword/bow vs NPCs; wanted level rises for crimes)
-> WANTED (guards chase, archers shoot, reinforcements spawn, bounty hunter at 5 stars)
-> repeat
```

## Key Systems

### Player System (`GTAPlayerSystem.ts`)
- **Movement**: WASD walk (120px/s), shift-run (200px/s) with stamina drain (25/s, regen 15/s)
- **Combat**: Left-click attack, right-click block (70% damage reduction), space-bar dodge roll (300px/s, 0.3s)
- **Weapons**: 1=Fists (5 dmg, 0.4s cd), 2=Sword (20 dmg, 0.6s cd), 3=Bow (15 dmg, 1.0s cd, 200px range)
- **Horse mounting**: E near horse to mount/dismount, horse speed 350px/s
- **Item pickup**: Auto-collect within 30px (gold piles, health potions +30HP, treasure chests, bow, keys)
- **Player states**: idle, walking, running, on_horse_idle, on_horse_moving, attacking, blocking, rolling, dead
- **Kill streak tracking** with timer

### NPC System (`GTANPCSystem.ts`, `NPCDefs.ts`)
~41 NPCs across 14 types with individual stats, dialog lines, and behaviors:

| Type | HP | Damage | Speed | Behavior |
|------|-----|--------|-------|----------|
| Guard | 80 | 15 | 100 | Patrol, chase at wanted 2+ |
| Knight | 120 | 25 | 130 | Patrol, chase at wanted 3+ |
| Archer Guard | 60 | 15 | 110 | Stand on walls, shoot arrows at wanted 2+ |
| Army Soldier | 110 | 20 | 120 | Patrol, chase at wanted 2+ |
| Criminal | 50 | 10 | 90 | Wander, hostile, attacks at high wanted |
| Bandit | 55 | 12 | 95 | Wander outside walls, hostile on sight |
| Civilian M/F | 25-30 | 3-4 | 65-70 | Wander, flee from wanted player |
| Merchant | 35 | 5 | 60 | Stand at stalls, dialog |
| Blacksmith | 60 | 15 | 55 | Stand at forge, quest-related |
| Priest | 25 | 3 | 55 | Wander near church |
| Bard | 25 | 3 | 70 | Wander near tavern |
| Tavern Keeper | 45 | 10 | 55 | Stand in tavern |
| Stable Master | 40 | 8 | 60 | Stand at stable, quest giver |

**AI States**: patrol (follow waypoints), wander (random within radius of home), stand/idle, chase_player, attack_player, flee, dead

### Quest System (`GTAQuestSystem.ts`, `QuestDefs.ts`)
6 quests with varied objective types:

| Quest | Type | Objectives | Reward |
|-------|------|-----------|--------|
| The Missing Merchant | talk | Find Edmund near south gate, return to Margaret | 50 gold |
| Bandit Trouble | kill | Eliminate 3 criminals near prison | 80 gold |
| The Holy Relic | collect | Retrieve holy key from tavern area | 60 gold |
| Royal Escort | escort | Escort Sir Percival to castle gates | 100 gold |
| Tax Collection | talk (x3) | Collect taxes from 3 market merchants | 40 gold + sword |
| Horse Thief | reach (x2) | Find stolen horse outside south gate, ride back to stable | 70 gold |

Objective types: `kill`, `collect`, `reach`, `talk`, `escort`

### Wanted System (`GTAWantedSystem.ts`)
5-star escalation with time-based decay:

| Stars | Trigger | Response |
|-------|---------|----------|
| 1 | Punch civilian | Alert: guards aware, civilians flee |
| 2 | Attack guard | Chase: guards pursue within 600px |
| 3 | Kill guard | Lethal: knights join chase |
| 4 | Attack knight | Reinforcements: extra guards spawn from gates every 5-8s (max 4) |
| 5 | Sustained violence | Bounty Hunter: 200HP knight with 30 dmg, infinite aggro range, 180 speed |

- Decay timer: 30s per star level (higher stars = longer decay)
- Reinforcement guards are 20% faster than normal guards
- Bounty hunter spawns once per wanted-5 cycle from a random gate

### Combat System (`GTACombatSystem.ts`)
- Melee hit detection within attack range (40px melee, 200px bow)
- Blocking reduces damage by 70%
- Invincibility frames (0.3-0.5s after hit)
- Arrow projectiles from archer guards (320px/s, 2.5s cooldown, 15 dmg within 250px)
- NPC-on-player melee attacks with per-type cooldowns
- Death state triggers game over

### Horse System (`GTAHorseSystem.ts`)
- 8 horses: 4 tied at stable, 2 tied near tavern, 2 free outside south gate
- 4 colors: brown, black, white, grey
- States: tied (stationary), free (wander near base), ridden_by_player, ridden_by_npc
- Mount/dismount range: 50px (steal) / 30px (dismount)
- Horse HP: 80, speed: 350px/s

### City Layout (4000x3000 world)
Walled city (2400x2000) centered at (800,500) with:
- **Castle** (NW): 450x500, 4 corner towers
- **Barracks** (N): 500x350
- **Church** (NE): 350x350
- **Tavern** (E): 400x300 "The Prancing Pony"
- **Blacksmith** (W): 350x300 "Edgar's Forge"
- **Prison** (SW): 400x300
- **Stable** (SE): 450x400
- **Market** (center): 5 stalls + fountain
- **Houses**: 15 scattered (large/medium/small)
- **Walls**: 40px thick with gate openings (120px) at N/S/E/W, flanking towers at each gate + corner towers
- **Outside**: 4 farm fields, 2 farmhouses, 1 windmill, 6 tree clusters, decorative carts and hay bales

### View Layer
- `CamelotCityRenderer`: Terrain, buildings, walls, environmental details
- `GTACharacterRenderer`: Player, NPCs, horses, projectiles, particles
- `GTAHUDView`: Health/stamina bars, wanted stars, weapon indicator, gold counter, quest log, dialog boxes, pause menu, notifications
- `GTAMinimapView`: Overhead minimap with building outlines and NPC dots
- `GTAInteriorRenderer`: Interior scenes when entering buildings (tavern, church, blacksmith, castle, barracks, stable)

### Day/Night Cycle
- Continuous cycle: 0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight
- Speed: 0.003 per second
- Affects lighting/atmosphere

### Camera
- Lerp-based follow (0.08 factor) centered on player
- Zoom: 2.2x
- Clamped to world bounds

## Source Files

```
medievalgta/
+-- config/         MedievalGTAConfig (balance), NPCDefs (~41 NPCs), QuestDefs (6 quests)
+-- state/          MedievalGTAState (types + factory)
+-- systems/        GTAPlayerSystem, GTANPCSystem, GTACombatSystem,
|                   GTAHorseSystem, GTAWantedSystem, GTAQuestSystem
+-- view/           CamelotCityRenderer, GTACharacterRenderer, GTAHUDView,
                    GTAMinimapView, GTAInteriorRenderer
```

## Incomplete / Stubbed Systems

- **Building interiors**: Enterable buildings (6 types) have an interior renderer, but interiors are basic placeholder scenes with no interactive content
- **Bounty hunters**: Spawn at wanted 5 but behave identically to knights with inflated stats -- no unique AI, tracking, or pursuit mechanics
- **NPC dialog**: Each NPC has 2-3 randomly selected dialog lines, but no branching conversation trees or player-choice dialog
- **Item economy**: Gold piles and treasure chests exist but there is no shop, trading, or spending mechanic beyond quest rewards
- **Escort quest**: Sir Percival escort quest exists but the escort NPC pathfinding and failure conditions are minimal
- **Archer combat**: Archers use a simplified immediate hit check rather than actual projectile collision
- **NPC respawning**: Dead NPCs are removed after their death timer expires with no respawn mechanic

## Improvement Ideas

1. **Reputation/faction system**: Track player standing with guards, merchants, criminals, and church separately -- hostile actions against one faction should not automatically affect all others
2. **Equipment progression**: Add armor (damage reduction), weapon upgrades (damage tiers), and a shop/vendor system at the blacksmith and market stalls
3. **Skill tree**: Introduce combat skills (power attack, parry, stealth kill) and non-combat skills (lockpicking, persuasion, pickpocketing) that level up with use
4. **Crime rings and gang territory**: Expand the criminal faction with hideouts, turf wars, and a criminal quest line parallel to the legitimate quests
5. **Property ownership**: Let the player buy/rent houses and businesses for passive gold income and storage
6. **Dynamic events**: Random events like merchant robberies, prisoner escapes, bandit raids on the gate, and tournament announcements
7. **Interior expansion**: Full interactive building interiors with NPCs, loot containers, and building-specific activities (tavern gambling, church healing, blacksmith crafting)
8. **Bounty hunter overhaul**: Unique bounty hunter NPC type with tracking AI, ambush spawning, and escalating difficulty per encounter
9. **Horse combat**: Allow attacking while mounted with reduced accuracy but increased damage from cavalry charge
10. **Save/load system**: Persist player progress, quest state, and world state across sessions
