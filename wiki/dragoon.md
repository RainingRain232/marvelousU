# Dragoon Mode (On-Rails Shmup)

**Enum**: `GameMode.DRAGOON`
**Source**: `/dragoon` (4 subdirectories)
**Framework**: PixiJS 2D, scrolling aerial view
**Players**: 1

## Overview

Panzer Dragoon-style on-rails shoot-em-up where Arthur rides a great white eagle through the skies, wielding a magic wand against waves of enemies and colossal bosses. Features a class system with 4 base classes, 8 subclasses, 40+ class skills, 8 universal unlockable skills, a leveling/XP system, combo scoring, and 20 waves of escalating difficulty with boss encounters every 4 waves.

## Gameplay Loop

```
CLASS_SELECT (choose 1 of 4 classes)
-> WAVE (enemies spawn over duration, kill all to advance)
-> BETWEEN_WAVES (3.5s pause, partial HP/mana heal)
-> BOSS WAVE (every 4th wave: boss + reduced regular enemies)
-> repeat for 20 waves
-> VICTORY (all waves cleared) or GAME_OVER (HP reaches 0)
```

At level 20, a subclass choice is presented (2 options per class), replacing skills 4 and 5 with specialized abilities.

## Key Systems

### Class System
4 base classes with distinct stat modifiers and skill loadouts:

| Class | Basic Attack | HP | Mana | Mana Regen | Speed | Subclasses |
|-------|-------------|-----|------|------------|-------|------------|
| Arcane Mage | Arcane Bolt (8 dmg, 0.12s CD) | 1.0x | 1.2x | 1.1x | 1.0x | Chronomancer, Void Weaver |
| Storm Ranger | Wind Arrow (6 dmg, 0.09s CD) | 0.9x | 1.0x | 1.2x | 1.15x | Tempest Lord, Beastmaster |
| Blood Knight | Blood Lance (14 dmg, 0.18s CD) | 1.3x | 0.9x | 0.9x | 0.95x | Death Knight, Paladin |
| Shadow Assassin | Shuriken (5 dmg, 0.07s CD) | 0.8x | 1.0x | 1.3x | 1.2x | Ninja, Phantom |

### Subclass System
At level 20, the player chooses 1 of 2 subclasses. The subclass replaces skills 4 and 5:

| Subclass | Parent Class | Replaces Skill 4 | Replaces Skill 5 |
|----------|-------------|-------------------|-------------------|
| Chronomancer | Arcane Mage | Time Warp (slow enemies, 4s) | Temporal Loop (reverse projectiles) |
| Void Weaver | Arcane Mage | Singularity (black hole, 40 dmg) | Mirror Image (shadow clones, 5s) |
| Tempest Lord | Storm Ranger | Hurricane (screen-wide storm, 4s) | Thunder Armor (lightning aura, 6s) |
| Beastmaster | Storm Ranger | Wolf Pack (3 wolves, 8s) | Eagle Fury (eagle dive, 80 dmg) |
| Death Knight | Blood Knight | Raise Dead (resurrect enemies, 8s) | Soul Harvest (chain explosions, 6s) |
| Paladin | Blood Knight | Holy Nova (heal + 50 dmg burst) | Consecration (holy zone, 5s) |
| Ninja | Shadow Assassin | Shadow Clones (4 clones, 6s) | Blade Storm (spinning blades, 4s) |
| Phantom | Shadow Assassin | Soul Siphon (drain HP channel, 3s) | Phase Shift (immune + 2x dmg, 4s) |

### Skill System
- **Slot layout**: Basic Attack (auto-fire on mouse hold) + 5 class skills (keys 1-5) + 1 universal unlock (key 6)
- **Cooldown-based**: Each skill has its own cooldown timer (ranging from 0.07s for basic attacks to 20s for ultimates)
- **Mana cost**: Skills 1-5 cost mana (18-50); basic attacks are free
- **Duration skills**: Many skills are channeled/timed (e.g. Tornado 4s, Blood Shield 8s, Smoke Bomb 3s)
- **Tab key**: Cycles through unlocked universal skills for the key-6 slot

### Universal Unlockable Skills (8 total)
Earned through leveling, equipped one at a time to the key-6 slot:

| Level | Skill | Effect |
|-------|-------|--------|
| 3 | Speed Surge | 2x movement speed, 4s |
| 5 | Healing Light | Restore 40 HP |
| 8 | Fireball Barrage | 5 fireballs in spread, 28 dmg |
| 10 | Arcane Shield | Absorb all damage, 3s |
| 13 | Chain Nova | Lightning chains 8 enemies, 20 dmg |
| 15 | Homing Missiles | 6 homing projectiles, 15 dmg each |
| 18 | Arcane Bomb | Massive AoE, 55 dmg |
| 22 | Time Slow | Half-speed enemies, 5s |

### Enemy Types

**Sky Enemies (10 types):**
| Type | HP | Speed | Pattern | Fire Rate | Score |
|------|-----|-------|---------|-----------|-------|
| Dark Crow | 15 | 140 | Straight | 0 | 50 |
| Shadow Bat | 20 | 180 | Sine Wave | 0 | 60 |
| Dark Falcon Squad | 25 | 160 | V-Formation | 2.5s | 70 |
| Sky Viper | 30 | 200 | Zigzag | 0 | 90 |
| Fire Sprite | 25 | 200 | Circle | 2.5s | 80 |
| Storm Hawk | 35 | 250 | Dive | 0 | 100 |
| Wyvern | 45 | 100 | Hover | 1.8s | 120 |
| Shadow Wraith | 40 | 80 | Teleport | 2.0s | 130 |
| Floating Eye | 60 | 50 | Hover | 1.2s | 150 |
| Dark Angel | 80 | 120 | Sine Wave | 1.5s | 200 |

**Ground Enemies (3 types):**
| Type | HP | Speed | Fire Rate | Score |
|------|-----|-------|-----------|-------|
| Ground Ballista | 35 | 45 | 1.5s | 80 |
| Ground Catapult | 50 | 40 | 2.5s | 100 |
| Ground Mage Tower | 80 | 30 | 1.8s | 150 |

**Bosses (5, one per boss wave):**
| Boss | HP | Speed | Fire Rate | Score |
|------|-----|-------|-----------|-------|
| Drake | 600 | 60 | 0.8s | 2,000 |
| Chimera | 900 | 50 | 0.6s | 3,500 |
| Lich King | 1,200 | 40 | 0.5s | 5,000 |
| Storm Titan | 1,600 | 35 | 0.4s | 7,000 |
| Void Serpent | 2,500 | 45 | 0.3s | 10,000 |

Enemy movement patterns: Straight, Sine Wave, Circle, Dive, Hover, Ground, Boss Pattern, Zigzag, V-Formation, Teleport.

### Wave System (`DragoonWaveSystem.ts`)
- **20 total waves**, boss every 4 waves (waves 4, 8, 12, 16, 20)
- **Wave duration**: 18s base + 2s per wave
- **Enemy count**: 8 base + 3 per wave
- **Spawn rate**: 1.2s base, decreasing by 0.04s per wave (min 0.3s)
- **Enemy scaling**: HP +12% per wave, damage +8% per wave
- **5 enemy pool tiers**: Waves 1-4 (basic), 5-8 (mixed), 9-12 (mid), 13-16 (advanced), 17-20 (elite)
- **Boss waves**: Spawn boss + 50% of regular wave count as adds
- **Between-wave healing**: +15 HP, +30 mana during 3.5s intermission
- **Boss entrance**: 3-second dramatic announcement with boss name display
- **Safety timer**: Wave force-ends 10 seconds after duration if enemies remain

### Combo & Score System
- **Combo timeout**: 2.0 seconds between kills before combo resets
- **Score multiplier per combo hit**: +10% per kill in the chain
- **Pickup system**: 20% drop chance on enemy death
  - Health orb: +15 HP
  - Mana orb: +20 mana
  - Score multiplier: 2x score for 8 seconds
- **Pickup lifetime**: 10 seconds, 35px collection radius

### Leveling
- **XP per level**: `level * 150`
- **Level-up notifications**: Visual flash and HUD notification
- **Subclass unlock**: Level 20 triggers subclass choice (pauses game)
- **Universal skill unlocks**: At levels 3, 5, 8, 10, 13, 15, 18, 22

### Movement & Camera
- **Player speed**: 320 pixels/second (modified by class speed multiplier)
- **Arrow keys**: Player movement
- **WASD**: Camera panning
- **World width**: 1.5x screen width (camera can scroll beyond visible area)
- **3-layer parallax sky**: Distant (5px/s), mid (15px/s), near (30px/s)
- **Invincibility after hit**: 1.5 seconds

## Source Files

```
dragoon/
├── config/
│   └── DragoonConfig.ts     Balance constants, enemy templates (18 types), skill configs (48 skills),
│                              class definitions (4), subclass definitions (8), wave pools, boss order,
│                              unlockable skill schedule
├── state/
│   └── DragoonState.ts      Enums (ClassId, SubclassId, SkillId, EnemyType, EnemyPattern, PickupType),
│                              interfaces (DragoonState, Player, Enemy, Projectile, Explosion, Companion,
│                              PoisonCloud, Pickup, Particle), factory function
├── systems/
│   ├── DragoonInputSystem.ts    Keyboard/mouse input, class/subclass selection, skill activation,
│   │                             escape menu, Tab key for universal skill cycling
│   ├── DragoonWaveSystem.ts     Wave progression, enemy spawning, boss spawning, wave-end detection
│   └── DragoonCombatSystem.ts   Skill activation, projectile management, collision detection,
│                                 enemy AI/movement, explosions, pickups, leveling, XP, buff tracking,
│                                 companion management, DoT/debuff application
├── view/
│   ├── DragoonRenderer.ts   Parallax sky, ground scrolling, player/enemy/projectile rendering
│   ├── DragoonFX.ts         Explosions, hit numbers, screen shake, screen flash, lightning VFX
│   └── DragoonHUD.ts        HP/mana bars, skill cooldowns, wave counter, score, combo display,
│                              class select UI, subclass choice UI, notifications, escape menu
└── DragoonGame.ts           Main orchestrator: boot, class/subclass selection, game loop, game over,
                              victory, restart, cleanup
```

## Incomplete / Stubbed Systems

- **No difficulty selector**: All runs use the same balance constants. There is no way to adjust enemy HP scaling, damage scaling, or spawn rates
- **No persistent meta-progression**: Each run starts from scratch. No unlocks, achievements, or stats carry between sessions
- **Limited boss variety**: All 5 bosses share the same `BOSS_PATTERN` movement pattern with only HP/speed/fire-rate differentiation. No unique boss mechanics or phase transitions beyond the `bossPhase` field (defined but not utilized for distinct attack patterns)
- **Ground enemies underutilized**: Only 3 ground enemy types (Catapult, Mage Tower, Ballista) compared to 10 sky types. All use the `GROUND` pattern (scroll along bottom). They only appear in mid-to-late wave pools
- **No run stats summary**: Victory/game-over screens show score but no breakdown (enemies killed, damage dealt, skills used, combo records)
- **Companion AI basic**: Hawks, wolves, and clones move toward nearest enemy and fire on a timer. No formation, no priority targeting, no avoidance

## Improvement Ideas

1. **Difficulty selector**: Add Easy/Normal/Hard with scaling multipliers on enemy HP, damage, spawn rate, and boss aggression
2. **Persistent meta-progression**: Save best scores per class, track total kills/bosses defeated, unlock cosmetic eagle skins or alternate character appearances
3. **Unique boss mechanics**: Give each boss distinct attack phases (Drake: fire breath sweeps; Chimera: multi-head alternating attacks; Lich King: summon add waves; Storm Titan: lightning arena hazards; Void Serpent: teleporting and screen-wide void zones)
4. **Leaderboards**: Local or online high-score tables filtered by class and difficulty
5. **Run stats and post-game summary**: Display enemies killed, damage dealt/taken, highest combo, skills used, time per wave, accuracy, and score breakdown
6. **Ground enemy depth**: Add more ground types (cavalry charges, siege towers, arrow volleys) and make ground enemies interact with terrain features
7. **Cosmetic rewards**: Unlockable eagle appearances, projectile trail colors, or death effect themes based on milestones
8. **Boss phase transitions**: Multi-phase bosses that change behavior at HP thresholds (e.g. Drake gains fire armor at 50% HP, Void Serpent splits into smaller copies at 25%)
9. **Challenge modes**: Time attack (speed-clear waves), survival (infinite escalation), boss rush (all 5 bosses in sequence)
10. **Companion improvements**: Let companions prioritize boss targets, avoid projectiles, and benefit from player damage buffs. Show companion HP/duration on HUD
