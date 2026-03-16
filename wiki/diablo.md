# Diablo Mode (Isometric Action RPG)

**Enum**: `GameMode.DIABLO`
**Source**: `/diablo` (4 files)
**Framework**: Three.js 3D isometric
**Players**: 1

## Overview

Isometric action RPG inspired by Diablo 3. The player selects a class, chooses a map and difficulty, then fights through enemy waves to clear the map. Features a deep loot system with 7 rarity tiers, 72 skills across 6 classes with talent trees, 39 maps with unique enemy rosters and bosses, 6 difficulty levels, set bonuses, elemental damage and reactions, map modifiers, vendors, crafting, potions, quests, day/night cycle with night bosses, and paragon XP progression.

## Gameplay Loop

```
CLASS_SELECT (choose from 6 classes)
-> MAP_SELECT (choose map + difficulty)
-> PLAYING (isometric combat: kill enemies, collect loot, use skills, level up)
-> VICTORY / GAME_OVER (map clear based on kill target, or death)
-> INVENTORY (manage gear, visit vendors, craft, assign talents)
-> repeat with next map or higher difficulty
```

## Game Phases

`CLASS_SELECT` -> `MAP_SELECT` -> `INVENTORY` -> `PLAYING` -> `PAUSED` -> `GAME_OVER` / `VICTORY`

## Classes

| Class | Primary Stat | Base Skills | Unlockable Skills |
|-------|-------------|-------------|-------------------|
| Warrior | Strength | Cleave, Shield Bash, Whirlwind, Battle Cry, Ground Slam, Blade Fury | Heroic Leap, Iron Skin, Taunt, Crushing Blow, Intimidating Roar, Earthquake |
| Mage | Intelligence | Fireball, Ice Nova, Lightning Bolt, Meteor, Arcane Shield, Chain Lightning | Summon Elemental, Blink, Frost Barrier, Arcane Missiles, Mana Siphon, Time Warp |
| Ranger | Dexterity | Multi Shot, Rain of Arrows, Poison Arrow, Evasive Roll, Explosive Trap, Piercing Shot | Grappling Hook, Camouflage, Net Trap, Fire Volley, Wind Walk, Shadow Strike |
| Paladin | Strength | Holy Strike, Divine Shield, Consecration, Judgment, Smite, Holy Nova | Avenging Wrath, Lay on Hands, Holy Bolt, Blessed Hammer, Aegis of Light, Righteous Fury |
| Necromancer | Intelligence | Bone Spear, Raise Skeleton, Corpse Explosion, Curse of Frailty, Death Nova, Blood Golem | Army of the Dead, Bone Armor, Life Tap, Spirit Barrage, Poison Nova, Revive |
| Assassin | Dexterity | Shadow Stab, Fan of Knives, Blade Flurry, Smoke Screen, Venomous Strike, Death Mark | Assassinate, Shadow Clone, Blade Dance, Vanish, Crippling Throw, Execute |

Skills unlock every 3 levels (at levels 3, 6, 9, 12, 15, 18). Each skill has cooldown, mana cost, damage type, damage multiplier, range, optional AoE radius, optional status effect, and optional duration.

## Maps (39 total)

Maps are grouped into 3 waves of increasing difficulty:

| Wave | Maps |
|------|------|
| Wave 1 | Darkwood Forest, Aelindor (Elven Village), Necropolis Depths, Volcanic Wastes, Abyssal Rift, Dragon's Sanctum, Sunscorch Desert, Emerald Grasslands |
| Wave 2 | Whispering Marsh, Crystal Caverns, Frozen Tundra, Haunted Cathedral, Thornwood Thicket, Clockwork Foundry, Crimson Citadel, Stormspire Peak, Shadow Realm, Primordial Abyss |
| Wave 3a | Moonlit Grove, Coral Depths, Ancient Library, Jade Temple, Ashen Battlefield, Fungal Depths, Obsidian Fortress, Celestial Ruins, Infernal Throne, Astral Void |
| Wave 3b | Shattered Colosseum, Petrified Garden, Sunken Citadel, Wyrmscar Canyon, Plaguerot Sewers, Ethereal Sanctum, Iron Wastes, Blighted Throne, Chrono Labyrinth, Eldritch Nexus |
| Special | Camelot |

Each map has: unique dimensions, 8 enemy types, max enemy count (20-40), spawn interval, treasure count, ambient/ground/fog colors, and a kill target for completion (25-140 kills). Maps also have 3 named bosses each and a unique night boss.

## Difficulty Levels

6 tiers named after blade types: Dagger, Cleaver, Longsword, Bastard Sword, Claymore, Flamberge. Each scales enemy HP, damage, and loot quality.

## Key Systems

### Loot System

7 rarity tiers with ascending power:

| Rarity | Color | Display |
|--------|-------|---------|
| Common | White (#ccc) | No border effect |
| Uncommon | Green (#4f4) | Subtle glow |
| Rare | Blue (#48f) | 2px border glow |
| Epic | Purple (#a4f) | Inset glow |
| Legendary | Orange (#f80) | Pulse animation, 3px border |
| Mythic | Red (#f22) | Pulse animation |
| Divine | Gold (#fd0) | Pulse animation, strongest glow |

Items have stats: strength, dexterity, intelligence, vitality, armor, crit chance, crit damage, attack speed, move speed, elemental resistances (fire/ice/lightning/poison), life steal, mana regen, bonus damage/health/mana. Legendary items have unique abilities. Items can belong to named sets.

### Equipment Slots

9 slots: Helmet, Body, Gauntlets, Legs, Feet, Accessory 1, Accessory 2, Weapon, Lantern.

Item types: Sword, Axe, Mace, Bow, Staff, Wand, Dagger, Shield, Helmet, Chest Armor, Gauntlets, Leg Armor, Boots, Ring, Amulet, Necklace, Lantern.

### Set Bonuses

Named item sets grant bonus stats when multiple pieces are equipped. Each set bonus specifies the set name, required piece count, bonus description, and stat bonuses.

### Talent Trees

Per-class talent trees with branching nodes. Each talent node has:
- Max rank (multi-point investment)
- Prerequisite requirement
- Branch and tier positioning
- Effects: bonus damage %, bonus HP %, bonus mana %, bonus armor, crit chance, crit damage, attack speed, move speed, skill cooldown reduction, life steal %, mana regen, bonus AoE radius, resistance all

### Damage Types & Elemental Reactions

8 damage types: Physical, Fire, Ice, Lightning, Poison, Arcane, Shadow, Holy.

6 elemental reactions:
- **Steam Cloud**: Fire + Ice
- **Chain Burst**: Lightning + Wet/Ice
- **Toxic Explosion**: Poison + Fire
- **Shatter**: Physical + Frozen
- **Overload**: Lightning + Fire
- **Frostbite**: Ice + Poison

### Status Effects

Burning, Frozen, Shocked, Poisoned, Slowed, Stunned, Bleeding, Weakened.

### Map Modifiers

10 modifiers that alter map difficulty: Enemy Speed (+40%), Enemy Fire/Ice/Lightning Resist (+50%), Enemy Thorns (15% reflect), Enemy Regen (2% HP/s), Extra Elites (+50% boss spawns), Explosive Death, Double HP, Vampiric (5% heal on hit).

### Boss Phase System

Bosses have multi-phase configurations with:
- HP threshold triggers
- Phase-specific damage and speed multipliers
- Phase-specific abilities: Ground Slam, Charge, Summon Adds, Enrage, Shield, Meteor Rain

### Enemy AI Behaviors

5 behavior types: Melee Basic, Ranged, Shielded, Healer, Flanker.

Enemy states: Idle, Patrol, Chase, Attack, Hurt, Dying, Dead.

### Vendors

5 vendor types: Blacksmith, Arcanist, Alchemist, Jeweler, General Merchant. Each generates inventory for the player to purchase.

### Potions

5 types: Health, Mana, Rejuvenation, Strength, Speed. 4 potion slots with cooldown system. Active potion buffs tracked with duration.

### Crafting System

4 craft types:
- **Upgrade Rarity**: Increase item rarity tier
- **Reroll Stats**: Randomize item stat rolls
- **Socket Gem**: Add gem to item
- **Salvage**: Break down items for salvage materials

Recipes have gold cost, input rarity, success chance, and material cost.

### Quest System

7 quest types: Kill Count, Kill Specific, Clear Map, Boss Kill, Night Boss, Collect Gold, Treasure Hunt. Quests have progress tracking, target specifications, and rewards (gold, XP, guaranteed item rarity).

### Day/Night Cycle

4 time periods: Day, Dawn, Dusk, Night. Night spawns unique per-map night bosses (39 night bosses total, one per map).

### Weather System

4 weather types: Normal, Foggy, Clear, Stormy. Affects fog density and ambient lighting.

### Loot Filter

4 filter levels: Show All, Hide Common, Rare+, Epic+.

### Paragon XP

Post-max-level progression system with its own XP table for continued character growth.

### Player State

Full character sheet: position, HP/mana, class, level, XP, gold, equipment (9 slots), inventory, active skills, skill cooldowns, status effects, base stats (str/dex/int/vit), derived stats (armor, move speed, attack speed, crit chance/damage), talent points and allocations, potion loadout, salvage materials, paragon progress.

## Source Files

```
diablo/
├── DiabloTypes.ts      All enums (50+), interfaces, state types, factory functions
├── DiabloConfig.ts     Skill definitions (72), map configs (39), enemy definitions,
│                       item database, set bonuses, loot tables, XP tables, vendor defs,
│                       difficulty configs, boss phase configs, talent trees, potions,
│                       quests, crafting recipes, salvage yields, lantern configs,
│                       map modifiers, elemental reactions, paragon XP table
├── DiabloGame.ts       Main game loop, combat resolution, enemy spawning, loot drops,
│                       skill execution, level-up, vendor/crafting/quest UI, input handling
└── DiabloRenderer.ts   Three.js isometric rendering, terrain, enemies, projectiles,
                        particles, lighting, UI overlays
```

## Incomplete / Stubbed Systems

- **Dungeon generation**: No visible procedural dungeon layout algorithm; maps use flat terrain with enemy spawns rather than room/corridor generation
- **Click-to-move combat**: Core combat loop may rely on keyboard movement rather than the click-to-move paradigm typical of the genre
- **Crafting integration**: Crafting recipes and salvage materials are fully defined in config but the crafting UI flow and actual item transformation may not be wired
- **Pet system**: Player state references are absent; no pet summoning, leveling, or companion creature system despite being a common ARPG feature
- **Town hub**: Vendors and townfolk are defined but a persistent town area between maps is not evident
- **Multiplayer**: Single-player only; no co-op or PvP systems
- **Map-specific items**: `MAP_SPECIFIC_ITEMS` config exists but integration with loot drops per map is unclear
- **Lantern system**: Lantern configs are defined and an equipment slot exists, but lantern light radius and night-vision mechanics may not be fully implemented

## Improvement Ideas

1. **Procedural dungeon generation**: Implement room/corridor algorithms (BSP, cellular automata, or wave function collapse) so each map run has unique layout with chokepoints, secret rooms, and environmental hazards
2. **Click-to-move combat**: Add pathfinding (A*) and click-to-move with attack-move, so gameplay matches the isometric ARPG feel
3. **Crafting UI**: Build a full crafting station interface with recipe discovery, material inventory display, success/failure feedback, and batch crafting
4. **Pet/companion system**: Summonable pets that gain XP, have their own skill tree, and provide passive bonuses or active combat support
5. **Persistent town hub**: A safe zone between maps with vendor stalls, a stash, crafting stations, quest boards, and NPC dialogue
6. **Greater Rift / Endless mode**: Timed challenge maps with scaling difficulty and leaderboard ranking
7. **Loot filter customization**: Player-configurable loot filter rules (by stat, by slot, by set name) beyond the 4 preset levels
8. **Visual skill effects**: Each of the 72 skills should have distinct particle effects, screen impact, and sound cues
9. **Boss encounter design**: Expand boss phases with arena hazards (lava pools, falling rocks, rotating beams) and phase transition cinematics
10. **Seasonal content**: Rotating map modifiers, limited-time events, and seasonal cosmetic rewards tied to the paragon system
