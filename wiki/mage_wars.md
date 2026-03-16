# Mage Wars Mode (3D FPS)

**Enum**: `GameMode.MAGE_WARS`
**Source**: `/magewars` (2 files)
**Framework**: Three.js 3D
**Players**: 5v5 teams (Team 0 vs Team 1), AI-filled

## Overview

3D first-person shooter set in a fantasy arena where mages battle with magic wands. Features team-based Capture the Point mode and a Mage Royale (battle royale) variant. Players choose from 8 mage classes, equip wands across three slots (primary, secondary, heavy), and fight on 16 procedurally-decorated maps with vehicles, environmental animals, and full physics.

## Gameplay Loop

```
MAIN_MENU → CHAR_SELECT (pick mage class)
→ LOADOUT (pick primary/secondary/heavy wands)
→ WARMUP (3s countdown)
→ PLAYING (5-minute match, first to 50 score wins)
  - Kill enemies (2 pts), destroy vehicles (5 pts)
  - Capture and hold points A/B/C (+1 pt per 5s tick)
→ ROUND_END (scoreboard)

MAGE ROYALE variant:
→ ROYALE_PLAYING (12 players FFA, shrinking storm)
  - Collect spell scrolls (25) and artifacts (8) scattered on map
  - Storm shrinks at 0.8 u/s, deals 8 dps
  - Last mage standing wins
```

## Key Systems

### Wand System (12 wands)
Three equipment slots with distinct weapon archetypes:

| Slot | Wands | Style |
|------|-------|-------|
| **Primary** (6) | Arcane Bolt, Flame Stream, Frost Shard Rifle, Lightning Arc, Shadow Repeater, Thornlash | Semi-auto, full-auto, burst, precision |
| **Secondary** (3) | Arcane Sidearm, Flameburst Orb, Void Dagger | Quick-draw backup, shotgun, machine pistol |
| **Heavy** (3) | Meteor Launcher, Glacial Cannon, Thunderstrike Staff | Slow AoE explosives (splash radius 4-8) |

Each wand has: damage, fire rate, projectile speed, range, mana cost, spread, magazine size, reload time, headshot multiplier, and splash radius.

### Mage Classes (8 classes)

| Class | HP | Mana | Speed | Ability | Cooldown |
|-------|-----|------|-------|---------|----------|
| Battlemage | 120 | 80 | 1.0 | Arcane Shield (absorb 50 dmg 4s) | 15s |
| Pyromancer | 90 | 100 | 1.05 | Inferno Burst (AoE fire around self) | 12s |
| Cryomancer | 95 | 90 | 1.0 | Flash Freeze (freeze nearby 2s) | 18s |
| Stormcaller | 100 | 95 | 1.1 | Chain Lightning (bounces 3 targets) | 14s |
| Shadowmancer | 85 | 110 | 1.15 | Shadow Veil (invisible 5s) | 20s |
| Druid | 130 | 100 | 0.95 | Nature's Embrace (heal 40hp AoE) | 16s |
| Warlock | 95 | 120 | 1.0 | Soul Drain (drain 30hp from enemy) | 13s |
| Archmage | 100 | 130 | 1.0 | Blink (teleport 15m forward) | 10s |

### Vehicle System (10 standard + 3 map-specific)

**Ground**: War Rhino (tank, 800hp), Iron Tortoise (siege, 1200hp), Dire Boar (APC, 500hp), War Elephant (fortress, 1000hp)
**Air Hover**: War Drake (attack heli, 400hp), Wyvern (scout, 250hp), Giant Bat (stealth, 200hp)
**Air Fly (jets)**: Elder Dragon (fast, 600hp), Phoenix (bomber, 350hp), Royal Griffin (fighter-bomber, 450hp)
**Map-specific**: Magic Carpet, Spectral Galleon, Sky Gondola

All vehicles have dual weapons (primary + secondary), multi-seat capacity (1-4 seats), and team affiliation.

### Maps (16 maps)
Ranging from tight infantry-focused arenas (Whispering Woods 95u, Deepstone Caverns 100u) to wide vehicle-warfare maps (Volcanic Wastes 150u, Mirage Oasis 150u). Maps feature environmental animals (birds, deer, wolves, bats, crabs, fireflies), decorative props, and map-specific vehicles. Each map defines terrain colors, fog, sky gradient, tree/rock/bush counts, hill amplitude, and water level.

### Movement & Stamina
- Base speed 8 u/s, sprint 1.5x, crouch 0.5x
- Stamina: 100 max, drains at 25/s while sprinting, regens at 15/s after 2s delay
- Jump velocity 8, gravity -20, air control 0.3
- Fall damage above 5u threshold (8x multiplier)
- Spawn protection for 3 seconds

### AI System
- Reaction time 0.3s, aim error 0.06 rad
- States: wander, engage target, seek vehicle, reposition (4s timer)
- AI seeks vehicles within 5u, enters and uses vehicle weapons
- Strafes during combat with random direction changes

### Scoring & Kill Feed
- Kill score: 2 pts, vehicle kill: 5 pts, capture point: +1 pt per 5s
- Kill feed with killer/victim/weapon tracking
- Multikill window: 4s, assist window: 10s
- Kill streaks tracked per player

### Capture Points
- 3 points (A, B, C) per map
- Capture radius: 4u, capture time: 2s
- Score tick every 5 seconds while held
- Visual indicators: ring mesh, beam, flag per point

### Mage Royale (Battle Royale)
- 12 players, no respawns
- Storm: initial 30s delay, then shrinks at 0.8 u/s, 8 dps in storm, minimum radius 10u
- Storm drifts toward random target position
- 25 spell scrolls (random wands) and 8 artifacts (hp/mana/speed/damage boost, shield) scattered on map

## Source Files

```
magewars/
├── MageWarsConfig.ts    WandDef, MageClassDef, VehicleDef, MapDef, MW constants
└── MageWarsGame.ts      Complete game: state, physics, AI, rendering, HUD, Royale
```

## Incomplete / Stubbed Systems

- **Mage Royale**: Storm and artifact systems are defined but the mode's UI flow and endgame are thin (ROYALE_PLAYING phase exists but likely minimal polish)
- **Spell variety**: All weapons are projectile-based; no utility spells (walls, portals, summons, traps)
- **Class abilities**: Each class has exactly one ability with a cooldown; no ability trees or progression
- **Progression**: No persistent unlock system, no cosmetics, no player profiles
- **Map vehicles**: Magic Carpet, Ghost Ship, and Sky Gondola defined but only spawn on specific maps via `mapVehicles` field
- **Environmental animals**: Defined in map configs (birds, deer, wolves) but likely cosmetic only with no interaction

## Improvement Ideas

1. **Spell diversity**: Add non-projectile spells -- ice walls, teleport portals, summon turrets, ground traps, damage shields, area denial zones
2. **Ability trees**: Give each class 3-4 abilities to choose from, with upgrade paths unlocked through play
3. **Mage Royale completion**: Full lobby system, shrinking circle UI, placement rewards, looting system for fallen mages, spectator mode
4. **Ranked ladder**: ELO-based matchmaking, seasonal rewards, competitive leaderboards
5. **Custom games**: Map selection, player count configuration, custom rules (no vehicles, headshot-only, etc.)
6. **Progression system**: Persistent XP, wand skins, class mastery rewards, stat tracking per wand and class
7. **Map hazards**: Lava damage zones, water that slows, destructible cover, dynamic weather affecting visibility
8. **Team composition bonuses**: Reward balanced team compositions (e.g., having a Druid healer + Battlemage tank)
9. **Vehicle balance**: Ground vehicles feel underused compared to air; add anti-air wands or surface-to-air abilities
10. **Game modes**: Add CTF (Capture the Flag), King of the Hill, Payload, and FFA Deathmatch variants
