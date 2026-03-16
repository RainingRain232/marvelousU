# Game Mode — Quest for the Grail (Roguelike Dungeon Crawler)

**Enum**: `GameMode.GAME`
**Source**: `/game` (4 subdirectories)
**Framework**: PixiJS 2D, tile-based
**Players**: 1 (single-player)

## Overview

A roguelike dungeon crawler with permadeath, set in the Arthurian legend. The player selects a quest genre (6 options) and a Knight of the Round Table (8 characters), then descends through procedurally generated dungeon floors fighting enemies, collecting loot, and defeating bosses. Features meta-progression through knight unlocks, persistent run statistics, and genre-specific enemy/boss pools.

## Gameplay Loop

```
GENRE_SELECT → pick one of 6 quest genres (Classic, Dark, Crusade, Fae Wild, Siege, Legends)
→ KNIGHT_SELECT → pick a knight (4 unlocked by default, 4 more unlock through play)
→ PLAYING (explore floor, open chests, avoid traps, find stairs)
  → COMBAT (real-time melee/ranged with enemies, abilities on cooldown)
  → SHOP (every 2nd floor: buy heals, stat potions, gear)
  → LEVEL_UP (XP thresholds scale at 1.4x per level)
  → FLOOR_TRANSITION (descend to next floor)
→ BOSS encounters every 3rd floor and on the final floor
→ VICTORY (reach final stairs) or GAME_OVER (permadeath)
```

## Key Systems

### Quest Genres (6 genres)

| Genre | Floors | Enemy Bias | Boss Pool | Relic Bonus |
|-------|--------|-----------|-----------|-------------|
| Classic (Grail Quest) | 8 | bandit, undead, beast | Mordred, Green Knight, Questing Beast | 1.0x |
| Dark Enchantment | 10 | undead, fae, demon | Morgan le Fay, Mordred, Black Knight | 1.2x |
| Holy Crusade | 7 | bandit, knight, siege | King Rience, Mordred, Saxon Warlord | 0.8x |
| The Otherworld | 9 | fae, beast, elemental | Oberon, Morgan le Fay, Green Knight | 1.5x |
| Siege of Camlann | 6 | knight, siege, bandit | Mordred, King Rience, Saxon Warlord | 0.7x |
| Trials of Legend | 12 | beast, fae, undead, knight | All 5+ bosses | 1.3x |

### Knights of the Round Table (8 characters)

| Knight | HP | ATK | DEF | SPD | Crit | Ability |
|--------|-----|------|------|-----|------|---------|
| Arthur | 120 | 18 | 14 | 3 | 10% | Sovereign Strike (AoE+stun) |
| Lancelot | 100 | 24 | 10 | 4 | 20% | Lake's Fury (50 dmg single) |
| Gawain | 140 | 16 | 18 | 2 | 8% | Solar Might (self buff+heal) |
| Percival | 90 | 14 | 12 | 3 | 12% | Grail's Blessing (AoE heal+purify) |
| Galahad | 80 | 20 | 20 | 3 | 15% | Divine Shield (invulnerable 2 turns) |
| Tristan | 85 | 22 | 8 | 5 | 25% | Heartseeker (crit+poison, range 2) |
| Kay | 130 | 15 | 16 | 2 | 5% | Burning Hands (cone fire+burn) |
| Bedivere | 110 | 17 | 15 | 3 | 10% | Last Stand (60 dmg counter near death) |

Default unlocked: Arthur, Lancelot, Gawain, Percival. Others unlock through meta-progression.

### Dungeon Generation (`GameDungeonGenerator.ts`)
- Random room placement with overlap rejection and 2-tile padding
- Room types: Normal, Shrine, Champion Arena, Treasure Vault, Secret (30% chance per floor)
- L-shaped corridors connecting rooms in sequence + extra random loops
- Floors scale: width 40-60 tiles, height 30-45 tiles, 5-14 rooms, 6-24 enemies
- Environmental tile types per floor theme: Vine (slow), Ice (slide), Lava (damage), Illusion (hidden)
- Floor themes: Castle Dungeons, Enchanted Forest Caves, Crimson Crypts, Frozen Depths, Volcanic Tunnels, Faerie Hollows, Abyssal Halls, The Final Keep

### Combat System (`GameCombatSystem.ts`)
- Real-time melee and ranged combat on the tile grid
- Enemies have 5 AI types: melee, ranged, tank, mage, summoner
- Boss phases (2-3 phases per boss) with escalating abilities
- Status effects: stun, burn, poison, freeze, buff_atk, invulnerable, purify, confusion
- Enemy projectile system with range tracking
- Boss-specific behaviors: Black Knight armor reduction (50%), Green Knight challenge mode, summoner rally buffs
- Kill streaks: 2.5s window, +15% XP and +20% gold per streak level
- Dash mechanic: 600 px/s for 0.12s, 0.8s cooldown

### Enemies (20+ types across 8 categories)
- **Bandits**: Thug, Archer, Chief (summoner)
- **Undead**: Skeleton, Wraith (life drain), Revenant Knight
- **Beasts**: Dire Wolf (lunge), Wyvern (fire breath), Giant Spider (web), Bridge Troll (regenerate)
- **Fae**: Mischievous Pixie (confuse), Fae Knight (glamour)
- **Knights**: Rogue Knight, Saxon Warrior, Knight Soldier
- **Elementals**: Fire Elemental (fire aura), Ice Wraith (freeze)
- **Bosses** (8): Mordred, Morgan le Fay, Green Knight, Questing Beast, Black Knight, King Rience, Saxon Warlord, Oberon

### Items & Loot
- 4 item types: Weapon, Armor, Relic, Consumable
- 4 rarities: Common, Uncommon, Rare, Legendary
- Weighted loot tables per difficulty tier (easy/medium/hard)
- Notable legendaries: Excalibur (+20 ATK, +5 DEF, +20 HP, holy smite), Holy Grail (+50 HP, grail heal), Avalon Mail (regen), Scabbard of Excalibur (no bleed)
- Inventory cap: 16 items
- Equipment slots: weapon, armor, relic

### Shop System
- Available every 2nd floor (even-numbered)
- Sells: full heal (20g), stat potions (+2 ATK for 50g, +1 DEF for 40g), gear items, consumables
- Sell mode for offloading inventory

### Meta-Progression
- Knight unlocks persist to localStorage
- Run statistics tracked: total runs/victories/deaths, kills, gold, best floor, bosses defeated, fastest victory, genres completed
- Per-knight usage tracking

## Source Files

```
game/
├── config/
│   └── GameConfig.ts            QuestGenreDef, KnightDef, EnemyDef, ItemDef, FloorParams,
│                                LOOT_TABLES, SHOP_ITEMS, FLOOR_THEMES, GameBalance
├── state/
│   └── GameState.ts             GrailGameState, PlayerState, FloorState, EnemyInstance,
│                                meta-progression (save/load), GamePhase enum
├── systems/
│   ├── GameCombatSystem.ts      Melee/ranged combat, enemy AI, boss phases, status effects,
│   │                            leveling, loot drops, projectiles, group tactics, kill streaks
│   └── GameDungeonGenerator.ts  BSP room placement, corridor carving, environmental tiles,
│                                enemy spawning, treasure/trap placement, fog of war
└── view/
    ├── GameHUD.ts               UI overlays (health, inventory, minimap, kill feed)
    └── GameRenderer.ts          PixiJS tile rendering, animations, VFX, camera
```

## Incomplete / Stubbed Systems

- **Crafting/enchantment**: No crafting system despite having material items and forge concepts in the lore
- **Secret rooms**: Generation code exists (30% chance) but no unique mechanics -- just a connected room with better loot
- **Floor environmental hazards**: Vine/Ice/Lava/Illusion tiles are placed but gameplay effects may be minimal
- **Trap variety**: Only one trap type (15 flat damage) placed in corridors
- **Shrine rooms**: Tiles placed at room center but effect unclear
- **Reanimation queue**: Field exists on FloorState but usage in combat is limited to certain boss encounters

## Improvement Ideas

1. **Crafting and enchantment**: Add a forge system to combine materials into weapons, enchant gear with elemental effects, and break down items for resources
2. **Secret rooms and puzzles**: Hidden walls revealed by perception, puzzle rooms with lever combinations, riddle doors
3. **Trap diversity**: Pressure plates, arrow traps, pit traps, teleport traps, alarm traps that summon enemies
4. **Boss uniqueness**: Give each boss fully unique arena mechanics (Green Knight's regrowth phase, Morgan's illusion clones, Questing Beast's poison trail)
5. **Artifact collection**: Collectible legendary artifacts (Round Table fragments) that grant permanent meta-progression bonuses
6. **Companion system**: Recruit NPC companions (Merlin, Lady of the Lake) that assist in combat with unique abilities
7. **Infinite scaling**: Post-victory "Endless Descent" mode with infinite floors and escalating difficulty for leaderboard runs
8. **Floor events**: Random events between floors (merchant caravans, ambushes, NPC encounters, blessing shrines)
9. **Class-specific knight abilities**: Multiple ability choices per knight with branching upgrade paths
10. **Challenge modifiers**: Optional difficulty modifiers (no healing, double enemies, fog of war only) for bonus rewards
