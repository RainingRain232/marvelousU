# Survivor Mode (Vampire Survivors-style Roguelike)

**Enum**: `GameMode.SURVIVOR`
**Source**: `/survivor` (5 subdirectories: state, systems, config, view, + SurvivorGame.ts)
**Framework**: PixiJS 2D, real-time continuous movement
**Players**: 1 (single-player)

## Overview

Vampire Survivors-inspired roguelike where the player controls a single character on a large map, automatically attacking with equipped weapons while dodging hordes of enemies. Features 10 weapons with per-level scaling and evolution, 8 passive items, a synergy system for weapon+passive combos, 3 arcana slots for powerful relics, 4 elite enemy types, environmental hazards, map landmarks, timed events, and a 30-minute Death Boss as the victory condition. Supports meta-progression between runs via permanent stat upgrades purchased with earned gold.

## Gameplay Loop

```
CHARACTER_SELECT (choose character, map, difficulty)
→ GAME LOOP (60fps fixed timestep)
  → Move (WASD/arrows + dash)
  → Weapons auto-fire on cooldown
  → Enemies spawn from screen edges in waves
  → Kill enemies → drop XP gems + gold
  → Collect gems → level up → pick weapon/passive upgrade
  → Bosses spawn every 5 minutes → drop treasure chests
  → Arcana chests grant powerful relics (max 3)
  → Landmarks provide aura buffs, temp landmarks spawn periodically
  → Hazards (lava, ice, thorns, fog) affect terrain
  → Timed events modify spawn rate, enemy speed, XP gain
→ DEATH (game over) or VICTORY (kill Death Boss at 30 minutes)
→ RESULTS (stats, gold earned, meta upgrade shop)
```

## Victory Condition

The **Death Boss** ("The Questing Beast") spawns at 30 minutes (`VICTORY_TIME = 1800s`). Once it spawns, regular enemy spawning stops. Killing the Death Boss triggers victory. If the player dies at any point, it is game over.

## Key Systems

### Wave System (`SurvivorWaveSystem.ts`)
- **Spawn rate**: Base 3/sec at minute 0, scales +1.8/sec per minute, capped at 60/sec
- **Max alive enemies**: 500
- **Spawn position**: Random point on a rectangle around the player, just beyond visible screen (16x10 tile view + 3 tile margin)
- **Wave table**: Enemy pools keyed by minute range with weighted selection
- **Difficulty modifiers**: 4 levels (Easy/Normal/Hard/Nightmare) multiplying spawn rate, HP, ATK, speed, XP, and gold
- **Enemy HP scaling**: `(1 + 0.08 * minute)^2` quadratic growth
- **Enemy speed scaling**: `1 + 0.02 * minute`, capped at 2.0x
- **Boss spawning**: Every 5 minutes (`BOSS_INTERVAL = 300s`), cycling through boss definitions
- **Boss stats**: 20x HP, 3x ATK, 0.6x speed compared to base unit stats
- **Elite spawning**: After minute 5, 5% base chance (+0.5% per minute, capped at 15%) to spawn as elite

### Combat System (`SurvivorCombatSystem.ts`)
- **Weapons auto-fire**: Each weapon has an independent cooldown timer; fires automatically when ready
- **Damage formula**: `weaponDamage * (playerAtk / BASE_ATK) * arcanaDamageMult * (1 + synergyDamageBonus) * landmarkBuff`
- **Critical hits**: Player crit chance (base 5%), 2.5x multiplier
- **Enemy movement**: All enemies walk directly toward the player (no pathfinding, no AI behaviors)
- **Enemy separation**: Soft-body separation force prevents enemies from stacking
- **Contact damage**: Enemies deal `atk * 0.5` on contact; player gets 0.5s invincibility after each hit
- **Player regen**: Per-second HP regeneration from character bonuses and Chalice passive
- **Dash**: 16 tiles/sec for 0.15s, 1.5s cooldown, 0.2s invincibility window
- **Resurrection arcana**: Survives one lethal hit at 30% HP (one-time use, arcana consumed)

### Weapons (10 total, `SurvivorWeaponDefs.ts`)

| Weapon | Behavior | Base Damage | Base Cooldown | Evolution |
|--------|----------|-------------|---------------|-----------|
| Fireball Ring | AoE damage around player | 20 | 3.0s | Inferno Storm (+ Spell Tome) |
| Arrow Volley | Projectiles at nearest enemy | 15 | 1.5s | Arrow Hurricane (+ War Drum) |
| Lightning Chain | Chain damage to nearby enemies | 25 | 4.0s | Thunder God (+ Lucky Coin) |
| Ice Nova | AoE + slow enemies | 12 | 5.0s | Absolute Zero (+ Swift Boots) |
| Holy Circle | Constant damage aura | 8 | 1.0s | Divine Judgment (+ Chalice) |
| Catapult Strike | Targeted AoE on clusters | 40 | 5.0s | Meteor Barrage (+ Crown) |
| Spinning Blade | Orbiting blade (continuous) | 12 | 0s | Death Spiral (+ Plate Armor) |
| Warp Field | Teleport-damage radius | 35 | 6.0s | Void Rift (+ Magnet) |
| Rune Circle | Random ground AoE spots | 22 | 4.0s | Arcane Cataclysm (+ Swift Boots) |
| Soul Drain | Lifesteal beam (30% heal) | 10 | 0.5s | Soul Reaper (+ Chalice) |

- **Max weapon slots**: 6
- **Max weapon level**: 8
- **Per-level scaling**: +damage, -cooldown, +count, +area (weapon-specific values)
- **Evolution**: At max level (8), if the required passive is owned, weapon auto-evolves into a significantly stronger form

### Passives (8 total)

| Passive | Effect per Level |
|---------|-----------------|
| Plate Armor | +20 max HP |
| Swift Boots | +10% move speed |
| Spell Tome | +10% area |
| War Drum | +10% attack speed |
| Lucky Coin | +5% crit chance |
| Magnet | +1 pickup radius |
| Crown | +10% XP gain |
| Chalice | +1 HP/sec regen |

- **Max passive slots**: 6
- **Max passive level**: 5

### Evolution System (`SurvivorLevelSystem.ts`)
Weapons evolve when two conditions are met:
1. Weapon is at max level (8)
2. The specific required passive item is in the player's inventory

Evolution is checked automatically when a weapon levels up. Evolved weapons have fixed stats (damage, cooldown, area, count) that are significantly stronger than the base weapon at max level.

### Synergy System (`SurvivorSynergyDefs.ts`)
Weapon+weapon or weapon+passive combinations that grant bonus effects:

| Synergy | Requirements | Effect |
|---------|-------------|--------|
| Fire & Ice | Fireball Ring + Ice Nova | +25% damage |
| Storm of Blades | Spinning Blade + Arrow Volley | +2 arrow count |
| Dark Arts | Soul Drain + Warp Field | +50% lifesteal (0.3 -> 0.45) |
| Holy Arsenal | Holy Circle + Chalice | +30% area |
| Thunder Strike | Lightning Chain + Catapult Strike | +20% damage |
| Arcane Lifesteal | Rune Circle + Soul Drain | Rune hits heal 15% of damage |

Synergies are rechecked on every upgrade selection.

### Elite Enemies (`SurvivorEliteDefs.ts`)
4 types, spawning after minute 5:

| Elite Type | HP Mult | Ability | Cooldown |
|------------|---------|---------|----------|
| Charger | 2.0x | Lunge at player at 3x speed for 0.3s (from 5+ tiles away) | 4.0s |
| Ranged | 1.5x | Fire projectile at player (speed 6, 0.8x ATK, 3s lifetime) | 3.0s |
| Shielded | 3.0x | Passive 50% damage reduction | -- |
| Summoner | 1.8x | Spawn 2 tier-0 minions (20% HP, 50% ATK, 120% speed) | 8.0s |

Elites drop gems one tier higher than normal enemies. Named with Arthurian-themed prefixes (e.g., "Sir Pellinore's Charger", "Nimue's Conjurer").

### Arcana System (`SurvivorArcanaDefs.ts`)
- **Max 3 arcana** per run, obtained from boss chest drops (or arcana chests)
- **10 arcana definitions** with 3 rarity tiers (common, rare, legendary)
- Key arcana: Glass Cannon (+100% damage, -50% HP), Resurrection (survive lethal hit once), Vampiric Aura (3% lifesteal on all damage), Chain Explosion (enemies explode on death for 20% maxHP), Eternal Frost (20% freeze chance), Giant Slayer (+100% vs bosses/elites), Rapid Fire (-30% cooldown), Golden Touch (+200% gold), Wide Reach (+50% area)
- Arcana modifiers are multiplicative on damage, cooldown, and area

### Level-Up System (`SurvivorLevelSystem.ts`)
- **XP formula**: `XP_BASE * XP_SCALE^level` (100 base, 1.15x per level)
- **Choices per level-up**: 4 random options from available weapons and passives
- **Options include**: New weapons (if slots available), weapon level-ups, new passives, passive level-ups
- Game pauses during level-up selection

### Landmarks (`SurvivorLandmarkSystem.ts`)
- **3 permanent landmarks** placed in equilateral triangle at 30% radius from map center:
  - Excalibur's Blessing (Sword in the Stone): +50% ATK while in radius (5 tiles)
  - Lady's Grace (Chapel): buff aura
  - Merlin's Wisdom (Archive): buff aura
- **Temporary landmarks**: Spawn periodically (first at 60s, then on cooldown); faction hall, blacksmith, stable
- Landmarks have first-visit dialogue with speech bubbles

### Hazard System (`SurvivorHazardSystem.ts`)
- **4 hazard types**: Lava (damage/sec), ice (speed modifier), thorns (damage/sec), fog (slow)
- **Timed events**: Modify spawn rate, enemy speed, and XP gain for a duration; displayed as banner notifications
- First event after 3 minutes, then on cooldown between events

### Map System
- **6 themed maps**: Emerald Meadow (120x120), Dark Forest (100x100), Frozen Wastes (130x130), Volcanic Hellscape (110x110), Haunted Swamp (100x100), Desert Ruins (140x140)
- **4 difficulty settings**: Easy (0.6x spawns, 0.7x HP), Normal (1x), Hard (1.5x spawns, 1.5x HP), Nightmare (2.2x spawns, 2.5x HP)

### Meta-Progression (`SurvivorMetaUpgradeDefs.ts`, `SurvivorPersistence.ts`)
Permanent upgrades purchased with gold earned across runs:

| Upgrade | Effect per Level | Max Level | Cost Range |
|---------|-----------------|-----------|------------|
| Vitality | +10 max HP | 10 | 50-1200 |
| Swiftness | +3% speed | 5 | 100-1000 |
| Might | +5% damage | 10 | 75-2000 |
| Wisdom | +5% XP | 5 | 100-800 |
| Magnetism | +0.5 pickup radius | 5 | 50-500 |
| Greed | +10% gold | 5 | 200-1500 |

Applied at run start via `SurvivorPersistence.getMetaUpgrades()`.

### Arthurian Naming
- Bosses get Arthurian corrupted knight names (e.g., "Corrupted Galahad", "Pendragon's Bane", "Mordred Ascendant")
- Death Boss is always "The Questing Beast"
- Elites get themed prefixes per type (charger: Pellinore/Erec/Calogrenant, ranged: Tristan/Iseult/Dindrane, etc.)

## Source Files

```
survivor/
├── SurvivorGame.ts                    Orchestrator (boot, game loop, character select, level-up, results)
├── state/
│   ├── SurvivorState.ts               Player, weapons, passives, enemies, gems, projectiles, chests,
│   │                                  landmarks, hazards, events, arcana, synergies, difficulty
│   └── SurvivorPersistence.ts         localStorage meta-upgrade persistence
├── systems/
│   ├── SurvivorWaveSystem.ts          Enemy spawning, boss spawning, Death Boss, elite rolling
│   ├── SurvivorCombatSystem.ts        Weapon firing, damage dealing, enemy movement, contact damage,
│   │                                  elite abilities, enemy projectiles, arcana/synergy effects
│   ├── SurvivorLevelSystem.ts         Upgrade choice generation, upgrade application, evolution checks,
│   │                                  passive recalculation, synergy detection
│   ├── SurvivorPickupSystem.ts        XP gem collection, chest interaction, arcana selection
│   ├── SurvivorHazardSystem.ts        Hazard damage/slow, timed event spawning and management
│   ├── SurvivorLandmarkSystem.ts      Landmark buff auras, temp landmark spawning, first-visit dialogue
│   └── SurvivorInputSystem.ts         Keyboard/gamepad input, dash, pause toggle
├── config/
│   ├── SurvivorBalanceConfig.ts       All balance constants (player, XP, enemies, bosses, maps, dash, etc.)
│   ├── SurvivorWeaponDefs.ts          10 weapons, 8 passives, 10 evolutions (all stats and scaling)
│   ├── SurvivorEnemyDefs.ts           Wave table, boss definitions, Death Boss definition
│   ├── SurvivorEliteDefs.ts           4 elite types with HP multipliers, tint colors, ability cooldowns
│   ├── SurvivorSynergyDefs.ts         6 weapon/passive synergy definitions
│   ├── SurvivorArcanaDefs.ts          10 arcana definitions (3 rarity tiers, max 3 per run)
│   ├── SurvivorCharacterDefs.ts       Character definitions (starting weapon, stat bonuses, quotes)
│   └── SurvivorMetaUpgradeDefs.ts     6 permanent meta-upgrades with scaling costs
└── view/
    ├── SurvivorRenderer.ts            Entity rendering, map details, speech bubbles, landmarks
    ├── SurvivorHUD.ts                 HP bar, timer, kill counter, weapon icons, notifications, event banner
    ├── SurvivorCamera.ts              Camera follow + screen shake
    ├── SurvivorFX.ts                  Weapon VFX, damage numbers, chain/arc effects, trail particles, screen flash
    ├── SurvivorMinimap.ts             Minimap overlay
    ├── SurvivorCharSelectUI.ts        Character + map + difficulty selection
    ├── SurvivorLevelUpUI.ts           Level-up choice screen, arcana selection, pause menu
    └── SurvivorResultsUI.ts           Game over and victory screens with stats
```

## Incomplete / Stubbed Systems

- **Enemy AI is non-existent**: All enemies (non-elite) walk directly toward the player with no pathfinding, flanking, retreating, or group tactics — the entire difficulty comes from volume and stats
- **Elite abilities defined but inconsistent**: Charger lunges and ranged projectiles work, summoner spawns minions, but shielded is purely passive (50% DR) with no active shielding mechanic; no visual distinction beyond tint color
- **Cooldown goes negative at high levels**: Weapon cooldown formula `baseCooldown - cooldownPerLevel * (level-1)` can go below 0 at high levels — the `Math.max(0.1, ...)` floor in `getWeaponCooldown` catches this, but the fallback `0.1 / attackSpeedMultiplier` can produce extremely rapid fire with stacked attack speed
- **No meta-progression feedback**: Gold earned is tracked and meta upgrades exist in definitions, but the results screen integration with the upgrade shop is minimal
- **Evolution requirements opaque**: The player has no in-game way to see which passive is needed for which weapon evolution — must discover through trial and error
- **No weapon+weapon synergies beyond the 6 defined**: Only 6 synergy combinations exist out of 45 possible weapon pairs and many more weapon+passive combinations
- **Bloodlust arcana**: Defined with a `specialRule` key but the kill streak tracking logic is not implemented in `SurvivorCombatSystem`
- **Landmark buff types**: "chapel" and "archive" buff types are checked by `activeLandmarkBuffs` but their actual gameplay effects beyond "sword_stone" (+50% ATK) are not visible in the combat system

## Improvement Ideas

1. **Enemy AI variety**: Add enemy behaviors beyond walk-toward-player: flanking enemies that approach from behind, retreating ranged enemies that keep distance, pack leaders that buff nearby allies, enemies that avoid weapon AoE zones
2. **Elite ability polish**: Give shielded enemies an active shield bash (stun player briefly), add visual indicators for elite abilities (charge-up animations, warning circles), and make elite types visually distinct beyond tint
3. **Cooldown floor fix**: Add a global minimum cooldown (e.g., 0.15s) that cannot be reduced further by any combination of level, attack speed, and arcana — prevent degenerate fire rates
4. **Meta-progression shop**: Add a proper between-runs shop screen with upgrade previews, cost display, and a way to see current meta stats; track total gold earned lifetime
5. **Evolution codex**: Add an in-game codex showing all weapons, their evolution paths, required passives, and evolved form stats — entries unlock as the player discovers them
6. **More synergies**: Add weapon+weapon synergies for all 10 weapons (e.g., "Catapult + Ice Nova: frozen enemies take 2x catapult damage") and cross-category synergies (e.g., "3 AoE weapons: +15% area")
7. **Implement Bloodlust arcana**: Track kills within a rolling 3-second window; at 5+ kills, grant 50% attack speed for 5 seconds
8. **Complete landmark buffs**: Define specific gameplay effects for chapel (e.g., +30% regen) and archive (e.g., +20% XP); add visual indicators for active buff auras
9. **Challenge runs**: Add daily/weekly challenge modes with fixed seeds, character restrictions, and leaderboards
10. **Weapon+weapon evolution**: Allow combining two max-level weapons (without passive) into a hybrid evolution, encouraging different build paths
