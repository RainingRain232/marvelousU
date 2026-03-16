# Medieval GTA 3D Mode (3D Open-World Sandbox)

**Enum**: `GameMode.MEDIEVAL_GTA_3D`
**Source**: `/medievalgta3d` (4 subdirectories)
**Framework**: Three.js
**Players**: 1

## Overview

Full 3D version of the Medieval GTA sandbox using Three.js with an HTML HUD overlay. The same Camelot city setting is rendered in 3D with a third-person isometric camera. Features an expanded weapon arsenal (7 weapon types), a mission system with 6 missions (replacing the 2D quest system), a dynamic weather system, and an assassin NPC type not present in the 2D version. Uses requestAnimationFrame with a fixed-timestep simulation (16ms ticks).

## Gameplay Loop

```
FREE ROAM (explore 3D Camelot, collect items, interact with NPCs)
-> MISSION (approach giver + press E, complete: eliminate/collect/deliver/survive)
-> COMBAT (7 weapon types, melee + ranged, wanted level escalation)
-> WEATHER (clear/rain/fog/storm cycles affect atmosphere)
-> repeat
```

## Key Systems

### Player System (`GTA3DPlayerSystem.ts`)
- **Movement**: WASD walk (4.0 units/s), shift-run (7.5 units/s) with stamina (100 max, drain 25/s, regen 15/s)
- **Combat**: Left-click attack, right-click block (75% damage reduction), space dodge roll (10 units/s, 0.35s)
- **Weapons** (7 types, switchable with 1-7 keys):

| Weapon | Damage | Cooldown | Range |
|--------|--------|----------|-------|
| Fists | 8 | 0.35s | 2.5 |
| Sword | 25 | 0.55s | 2.5 |
| Axe | 35 | 0.8s | 2.5 |
| Mace | 30 | 0.7s | 2.5 |
| Spear | 22 | 0.6s | 3.5 |
| Bow | 18 | 0.9s | 40 |
| Crossbow | 30 | 1.4s | 40 |

- Weapons collected from the ground (start with fists + sword, find the rest)
- Horse mounting, dodge roll, kill streak tracking same as 2D

### NPC System (`GTA3DNPCSystem.ts`)
~50 NPCs across 15 types (adds assassin type not in 2D version):

| Type | HP | Damage | Speed | Notes |
|------|-----|--------|-------|-------|
| Guard | 80 | 15 | 5.5 | Patrol city, chase at wanted 2+ |
| Knight | 150 | 25 | 6.0 | Stronger patrol, chase at wanted 3+ |
| Archer | 60 | 15 | 4.0 | Ranged attacks, alert radius 25 |
| Soldier | 70 | 18 | 5.0 | Barracks patrol |
| Criminal | 50 | 12 | 4.5 | Lurk in south areas |
| Bandit | 60 | 15 | 5.0 | Outside city walls |
| Assassin | 70 | 20 | 6.0 | Rare, high alert radius 20 |
| Civilian M/F | 30 | 5 | 2.0 | Wander, flee |
| Merchant | 40 | 5 | 1.5 | Stand at market |
| Others | 30-50 | 3-10 | 1.0-2.5 | Blacksmith, priest, bard, tavern keeper, stable master |

### Mission System (replaces 2D quest system)
6 missions with 4 mission types:

| Mission | Type | Objective | Reward |
|---------|------|-----------|--------|
| Clear the Bandits | eliminate | Kill 3 bandits | 100 gold |
| Tax Collection | collect | Collect 80 gold from marketplace | 50 gold |
| Urgent Message | deliver | Deliver message from castle to church | 40 gold |
| The Shadow Assassin | eliminate | Kill the assassin on the outskirts | 150 gold + 20 HP |
| Stand Your Ground | survive | Survive 60s in criminal district | 120 gold |
| Knight's Trial | eliminate | Defeat 2 criminals | 75 gold |

- Mission activation: approach giver within interact range (3 units) and press E
- Progress tracking: kill counts, gold tracking, distance-to-target, survival timer
- Optional time limits with failure on expiry
- Mission info toggle with J key

### Wanted System
Same 5-star escalation as 2D, adapted to 3D distances:
- Alert radius per star: 5 units (vs 80px in 2D)
- Guard chase speed: 5.5 units/s
- Same escalation tiers: alert -> chase -> lethal -> reinforcements -> bounty hunter

### Horse System (`GTA3DHorseSystem.ts`)
- 9 horses: 4 tied at stable, 2 tied near tavern, 2 free outside south, 1 free outside north
- 5 colors: brown, black, white, grey, chestnut (adds chestnut over 2D)
- Mount range: 3 units, speed: 14 units/s

### Weather System
Dynamic weather cycling with transition effects:

| Weather | Duration | Effect |
|---------|----------|--------|
| Clear | 60-120s | Normal visibility |
| Rain | 30-60s | Atmospheric particles |
| Fog | 20-40s | Reduced visibility |
| Storm | 15-30s | Heavy effects |

- Automatic cycling with notification on change
- Fade-in transitions (2s)

### Combat System (`GTA3DCombatSystem.ts`)
- 3D distance-based hit detection
- Per-weapon damage and cooldown values
- Block, dodge roll, invincibility frames (0.4s)
- Kill streak tracking with timer
- NPC melee and ranged attacks

### City Layout (200x200 world, 120-diameter walled city)
Same logical layout as 2D, translated to 3D coordinates:
- **Castle** (NW): 20x12x18
- **Barracks** (N): 16x6x12
- **Church** (NE): 12x15x14
- **Tavern** (E): 14x7x10
- **Blacksmith** (W): 12x5x10
- **Prison** (SW): 14x6x10
- **Stable** (SE): 16x5x12
- **Market** (center): 5 stalls + fountain
- **Houses**: 12 scattered
- **Walls**: 1.5 units thick, 6 units tall, gates at N/S/E/W (8 unit openings)
- **Outside**: farms, farmhouses, windmill, 8 tree clusters, decorations

### View Layer
- `GTA3DRenderer`: Three.js scene with procedural 3D buildings, terrain, NPCs as colored geometry, camera system, day/night lighting, weather particle effects
- `GTA3DHUD`: HTML overlay with health/stamina bars, weapon indicator, gold counter, wanted stars, mission info, notifications, minimap

### Camera
- Isometric-style third-person view
- Height: 18 units, distance: 22 units
- Tilt angle: PI/5 radians
- Lerp follow: 0.06 factor

## Source Files

```
medievalgta3d/
+-- config/         GTA3DConfig (balance constants)
+-- state/          GTA3DState (types + factory: Player3D, NPC3D, Horse3D,
|                   Building3D, Item3D, Mission3D, Weather3D)
+-- systems/        GTA3DPlayerSystem, GTA3DNPCSystem, GTA3DCombatSystem,
|                   GTA3DHorseSystem
+-- view/           GTA3DRenderer (Three.js), GTA3DHUD (HTML overlay)
```

## Differences from 2D Version

| Feature | 2D | 3D |
|---------|-----|-----|
| Framework | PixiJS | Three.js |
| Weapons | 3 (fists, sword, bow) | 7 (+ axe, mace, spear, crossbow) |
| NPC types | 14 | 15 (adds assassin) |
| Quest system | 6 quests (talk/kill/collect/escort/reach) | 6 missions (eliminate/collect/deliver/survive) |
| Weather | None | 4-state weather cycling |
| Building interiors | Enterable with interior renderer | Not implemented |
| Minimap | Dedicated PixiJS renderer | HTML overlay element |
| Horse colors | 4 | 5 (adds chestnut) |
| Camera | 2D top-down with zoom | 3D isometric with height/distance |

## Incomplete / Stubbed Systems

- **Building interiors**: No interior rendering or entry mechanic (regression from 2D version which has basic interiors)
- **NPC dialog**: No dialog system -- NPCs have no dialog lines in the 3D version
- **Quest log UI**: Mission info available via J key, but no full quest log panel
- **Bounty hunters**: Not explicitly implemented (wanted system exists but no bounty hunter spawning at level 5)
- **NPC respawning**: Dead NPCs removed with no respawn
- **Archer projectiles**: No visible projectile system for ranged NPCs

## Improvement Ideas

1. **Camera system polish**: Add camera collision avoidance with buildings, zoom control (scroll wheel), and optional first-person view toggle
2. **3D model quality**: Replace colored box geometry with proper low-poly medieval character and building models
3. **Lighting and shadows**: Add dynamic shadow mapping tied to the day/night cycle and weather state
4. **Building interiors**: Port the 2D interior system to 3D with walkable interior spaces
5. **NPC dialog system**: Port the 2D dialog system with speech bubbles rendered in 3D world space
6. **Reputation/faction system**: Same as 2D improvement -- track standing with guards, merchants, criminals independently
7. **Equipment progression**: Leverage the expanded 7-weapon arsenal with upgrade tiers, durability, and a crafting system at the blacksmith
8. **Skill tree**: Combat skill unlocks tied to weapon proficiency from usage
9. **Weather gameplay effects**: Rain reduces bow accuracy, fog shrinks NPC alert radius, storms deal periodic lightning damage
10. **Dynamic events**: 3D-specific events like siege attacks on gates, merchant caravan arrivals, and tournament arena combat
11. **Sound and music**: Ambient city sounds, combat SFX, weather audio, and medieval background music
12. **Performance optimization**: LOD system for distant buildings, instanced rendering for NPCs, frustum culling
