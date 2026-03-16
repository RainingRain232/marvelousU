# Three Dragon Mode (3D Aerial Shmup)

**Enum**: `GameMode.THREE_DRAGON`
**Source**: `/threedragon` (4 subdirectories)
**Framework**: Three.js
**Players**: 1

## Overview

3D aerial shoot-em-up where Arthur rides a great white eagle through stunning 3D skies, wielding a magic wand against waves of enemies and colossal bosses. Features 10 themed maps with unique environmental hazards, 15 skills (7 base + 8 unlockable), a wave modifier system, between-wave upgrade choices, skill synergies, an XP/leveling system, and 5 unique boss encounters with dedicated mechanics. Uses requestAnimationFrame with a 16ms fixed-timestep simulation and slow-motion effects.

## Gameplay Loop

```
MAP SELECTION (choose from 10 themed maps)
-> WAVE START (enemies spawn, modifiers announced)
-> COMBAT (fly freely, auto-fire Arcane Bolt, activate skills 1-5, boost with Shift)
-> WAVE END (upgrade selection: pick 1 of 3 stat boosts)
-> BOSS WAVE (every 4 waves, unique boss mechanics)
-> repeat for 20 waves or until death
-> VICTORY / GAME OVER (high score saved per map)
```

## Key Systems

### Player System (`ThreeDragonInputSystem.ts`)
- **Movement**: WASD/arrow keys for 8-directional flight (18 units/s base), Shift boost (2x speed, 1.5s duration, 5s cooldown)
- **Auto-attack**: Left-click fires Arcane Bolt (9 dmg, 0.12s cooldown, no mana cost)
- **Skills**: Keys 1-5 activate equipped skills (mana cost, cooldown, various effects)
- **Skill equip**: Tab opens skill equip menu, 5 slots, swap skills freely
- **World bounds**: X: -40 to 40, Y: 2 to 22 (flight altitude)
- **Hit radius**: 1.5 units
- **Invincibility**: 1.5s after being hit

### Skill System (15 skills)
**Base skills** (available from start):

| Skill | Damage | Mana | Cooldown | Effect |
|-------|--------|------|----------|--------|
| Arcane Bolt | 9 | 0 | 0.12s | Rapid-fire projectiles (LMB) |
| Celestial Lance | 45 | 18 | 3.5s | Piercing beam of holy light |
| Thunderstorm | 35 | 30 | 6s | Lightning strikes, 2s duration |
| Frost Nova | 28 | 25 | 8s | Radial freezing burst |
| Meteor Shower | 65 | 50 | 14s | Rain of fire, 3s duration |
| Divine Shield | 0 | 40 | 20s | Absorbs all damage, 3s duration |
| Boost | 0 | 0 | 5s | 2x speed surge, 1.5s duration (Shift) |

**Unlockable skills** (earned by leveling):

| Level | Skill | Damage | Mana | Cooldown | Effect |
|-------|-------|--------|------|----------|--------|
| 2 | Fire Breath | 22 | 20 | 5s | Cone of dragonfire, 1.5s |
| 3 | Lightning Bolt | 55 | 22 | 4s | Instant bolt to nearest enemy |
| 4 | Wing Gust | 12 | 18 | 6s | Wind blast pushes enemies away |
| 5 | Ice Storm | 18 | 28 | 8s | Hail of ice shards, slows, 2.5s |
| 6 | Dragon Roar | 15 | 30 | 12s | Stuns all nearby enemies, 2s |
| 7 | Healing Flame | 0 | 35 | 15s | Restores health over time, 4s |
| 8 | Shadow Dive | 40 | 25 | 10s | Phase invulnerable, damage on exit, 1.5s |
| 9 | Chain Lightning | 30 | 32 | 7s | Lightning arcs between up to 6 enemies |

### Skill Synergies
Combining specific skills triggers bonus effects:

| Synergy | Trigger | Effect |
|---------|---------|--------|
| Shatter | Physical attack on frozen enemy | +50% physical damage |
| Conductor | Lightning on wet/frozen enemy | +30% lightning damage |
| Ignite | Fire on frozen enemy | Steam explosion |
| Resonance | Dragon Roar after Wing Gust | Doubles stun duration |
| Shadow Strike | Attack during Shadow Dive | 2x damage |

### XP and Leveling
- Base XP per kill: 10 (normal), 200 (boss)
- Level thresholds: base 100 XP + 50 per level growth
- New skills unlock at levels 2-9
- Level-up triggers notification and screen flash

### Wave System (`ThreeDragonWaveSystem.ts`)
- **20 total waves**, boss every 4th wave
- **Wave duration**: 20s base + 2s per wave
- **Enemy count**: 18 base + 7 per wave
- **Spawn rate**: 0.7s base, decreasing by 0.04s/wave (min 0.15s)
- **Swarm waves**: Every 3rd non-boss wave, 2x enemies at half HP
- **Between-wave pause**: 4 seconds + upgrade selection
- **HP scaling**: +12% per wave, damage scaling +8% per wave
- **Elite enemies**: 12% chance, 2x HP, 1.5x size, 1.8x score, gold glow

**Enemy tier progression**:

| Waves | Enemy Pool |
|-------|-----------|
| 1-4 | Shadow Raven, Arcane Orb |
| 5-8 | + Crystal Wyvern, Ember Phoenix, Cannon Fort |
| 9-12 | + Storm Harpy, Void Wraith, Siege Golem |
| 13-16 | + Spectral Knight, Dark Tower |
| 17-20 | Spectral Knight, Void Wraith, Ember Phoenix, Dark Tower |

### Enemy Types

**Sky enemies** (7 types):

| Type | HP | Speed | Size | Pattern | Fire Rate | Score |
|------|-----|-------|------|---------|-----------|-------|
| Shadow Raven | 18 | 12 | 1.0 | Straight | 0 | 50 |
| Arcane Orb | 25 | 14 | 0.8 | Swarm | 3.0s | 70 |
| Ember Phoenix | 30 | 15 | 1.2 | Sine Wave | 2.5s | 90 |
| Storm Harpy | 35 | 18 | 1.3 | Dive | 0 | 100 |
| Crystal Wyvern | 50 | 8 | 1.8 | Hover | 2.0s | 130 |
| Void Wraith | 65 | 6 | 1.5 | Hover | 1.3s | 160 |
| Spectral Knight | 80 | 10 | 1.6 | Sine Wave | 1.5s | 180 |

**Ground enemies** (3 types):

| Type | HP | Speed | Size | Fire Rate | Score |
|------|-----|-------|------|-----------|-------|
| Cannon Fort | 45 | 4 | 1.5 | 1.5s | 90 |
| Siege Golem | 60 | 5 | 1.8 | 2.5s | 110 |
| Dark Tower | 90 | 3 | 2.0 | 1.8s | 150 |

**Status effects**: frozen, burning, wet, stunned (with duration timers)

### Boss Encounters (5 unique bosses)
Every 4th wave spawns a boss with dedicated mechanic state:

| Boss | HP | Size | Speed | Score | Unique Mechanic |
|------|-----|------|-------|-------|----------------|
| Ancient Dragon | 700 | 4.0 | 5 | 2,500 | Fire breath cone (directional) |
| Storm Colossus | 1,000 | 5.0 | 4 | 4,000 | Lightning zones (area denial) |
| Death Knight | 1,300 | 3.5 | 6 | 5,500 | Shadow clones |
| Celestial Hydra | 1,800 | 5.5 | 3 | 7,500 | Multiple heads (each with own HP/attack) |
| Void Emperor | 2,800 | 6.0 | 5 | 12,000 | Teleport + void zones + invincibility phases |

Boss kills trigger multi-stage death effects with screen flash, delayed explosions, and camera shake.

### Wave Modifiers
Random modifiers applied to waves starting at wave 4:

| Modifier | Effect |
|----------|--------|
| Armored | Enemies take 40% less damage |
| Haste | Enemies move 50% faster |
| Multiplied | 2x enemies, half HP each |
| Aerial | All enemies become sky type |
| Vampiric | Enemies heal 10% of damage dealt |
| Explosive | Enemies explode on death |

- Waves 1-3: no modifiers
- Waves 4-8: 0-1 modifier
- Waves 9+: 0-2 modifiers
- Chance increases by 4% per wave (max 70%)

### Between-Wave Upgrades
After each wave, choose 1 of 3 randomly offered upgrades:

| Upgrade | Effect |
|---------|--------|
| +15 Max HP | Increases maximum health |
| +20 Max Mana | Increases maximum mana |
| +10% Damage | Multiplicative damage bonus |
| +1 Mana/s | Mana regeneration increase |
| +5% Crit | Critical hit chance bonus |
| +10% Speed | Multiplicative movement speed bonus |
| -15% Cooldowns | All skill cooldowns reduced |

### Map System (10 maps)
Each map defines unique sky, terrain, lighting, vegetation, and hazards:

| Map | Theme | Environmental Hazard |
|-----|-------|---------------------|
| Enchanted Valley | Green hills, golden sunset | None (base map) |
| Frozen Wastes | Ice plains, auroras | Blizzard wind (pushes player) |
| Volcanic Ashlands | Lava rivers, ember skies | Lava geysers (15 dmg, r=4) |
| Crystal Caverns | Bioluminescent underground | Crystal shards (12 dmg, r=3) |
| Celestial Peaks | Mountain tops above clouds | None |
| Sunken Archipelago | Tropical islands, coral | Water spouts (8 dmg, r=3.5) |
| Stormspire Crags | Jagged stone, storms | Lightning strikes (18 dmg, r=4.5) |
| Autumn Serpentine | Fall colors, winding river | Leaf tornadoes (5 dmg, r=5) |
| Abyssal Depths | Deep ocean, bioluminescence | Pressure waves (10 dmg, r=5) |
| Sakura Highlands | Cherry blossoms, misty peaks | Petal storms (6 dmg, r=4) |

Hazards have warning/active/fading phases with configurable intervals.

### Power-Up System
- **Drop chance**: 25% on enemy kill
- **Types**: Health (40% chance, +10 HP), Mana (60% chance, +15 MP)
- **Magnet**: Power-ups are attracted to player within 12 units
- **Lifetime**: 8 seconds before despawning
- **Collect radius**: 2.5 units

### Combo System
- Combo counter increments on kills
- 2-second timeout resets combo
- Score multiplier: +10% per combo hit

### Visual Effects
- Camera shake on explosions, boss kills, player hits
- Screen flash effects (damage, boss kill, level up, power-up)
- Explosion particles with radius and color
- Hit sparks and energy dispersal
- Lightning bolt visual effects
- Enemy death effects (scaled by size, boss/non-boss)
- Edge indicators for off-screen enemies
- Damage number popups (HUD)
- Synergy popup text
- Slow-motion effect on boss kills (factor 0.2 ramping back to 1.0)

### Scoring
- Per-enemy score value (50-12,000)
- Combo multiplier
- Elite bonus (1.8x)
- High score saved per map in localStorage

## Source Files

```
threedragon/
+-- config/         ThreeDragonConfig (TDBalance, TD_MAPS x10, TD_ENEMY_TEMPLATES x15,
|                   TD_SKILL_CONFIGS x15, TD_SYNERGIES x5, TD_WAVE_MODIFIERS x6,
|                   TD_UPGRADE_POOL x7, TD_BOSS_ORDER, TD_WAVE_ENEMY_POOL,
|                   TD_SKILL_UNLOCK_ORDER)
+-- state/          ThreeDragonState (TDPlayer, TDEnemy, TDProjectile, TDExplosion,
|                   TDParticle, TDPowerUp, TDHazard, TDSkillState, TDUpgradeState,
|                   TDBossMechanicState, TDSynergyPopup, enums)
+-- systems/        ThreeDragonInputSystem, ThreeDragonWaveSystem,
|                   ThreeDragonCombatSystem
+-- view/           ThreeDragonRenderer (Three.js), ThreeDragonHUD (HTML overlay)
```

## Incomplete / Stubbed Systems

- **Audio**: AudioManager calls exist (`playGameMusic`, `switchTrack`, `playSfx`) but all SFX calls are commented out -- no sound effects play during gameplay
- **Boss mechanics**: Boss mechanic state (`TDBossMechanicState`) defines fire breath, lightning zones, shadow clones, hydra heads, and void teleport, but the combat system implementation for these mechanics may be incomplete or simplified
- **High score leaderboard**: Scores save to localStorage per map but there is no visible leaderboard or score comparison UI
- **Day/night gameplay effects**: `dayPhase` advances but does not visibly affect gameplay difficulty or enemy behavior
- **Enemy pattern variety**: Most enemies use simple movement patterns (straight, hover, sine wave); ground enemies all use the same GROUND pattern
- **Power-up variety**: Only 2 types (health/mana) -- no offensive power-ups, shields, or temporary buffs

## Improvement Ideas

1. **Audio implementation**: Uncomment and connect the SFX calls, add layered music that intensifies during boss waves, and per-map ambient themes
2. **Boss mechanic completion**: Fully implement each boss's unique mechanics -- Ancient Dragon fire breath cone, Storm Colossus lightning zone denial, Death Knight shadow clone spawning, Celestial Hydra multi-head targeting, Void Emperor teleport/invincibility phases
3. **Enemy pattern diversity**: Add more complex movement patterns -- figure-8, spiral approach, coordinated formations, flanking maneuvers
4. **Additional power-up types**: Temporary damage boost, fire rate increase, shield orb, magnet range extension, score multiplier
5. **Difficulty modes**: Easy/Normal/Hard/Nightmare affecting enemy HP scaling, spawn rates, modifier frequency, and boss damage
6. **Persistent progression**: Cross-run unlocks like permanent stat bonuses, cosmetic eagle skins, and new starting skill loadouts
7. **Multiplayer co-op**: Two eagles on screen with shared wave progression and combined score
8. **More synergy combinations**: Expand the 5 existing synergies to cover all skill pairings with unique combo effects
9. **Ground targeting**: Let the player aim attacks downward at ground enemies with a targeting reticle
10. **Challenge modes**: Time attack, endless waves, boss rush, and no-upgrade challenges with separate leaderboards
