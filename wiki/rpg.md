# RPG Mode (JRPG)

**Enum**: `GameMode.RPG`
**Source**: `/rpg` (6 subdirectories: state, systems, gen, config, colosseum, + RPGBoot.ts)
**Framework**: PixiJS 2D, Tile-based overworld + dungeon
**Players**: 1 (single-player)

## Overview

Classic JRPG with tile-based overworld exploration, procedurally generated dungeons, turn-based combat, and deep party management. Features a 6-unit party with 8 equipment slots per member, an affinity system between party members, spell learning, limit breaks, elemental damage, status effects, and a main quest narrative with 5 shard collection steps. Includes weather, time of day, fast travel, a bestiary, karma system, New Game+, and an endgame Abyss mode.

## Gameplay Loop

```
MAIN_MENU → NEW_GAME / LOAD_GAME
→ OVERWORLD (tile movement, fog of war, random/roaming encounters, entity interactions)
  → TOWN_MENU (shop, inn, magic shop, arcane library, arena, recruit, quests)
  → DUNGEON (multi-floor procedural rooms, room encounters, boss rooms, treasure, stairs)
  → BATTLE_TURN / BATTLE_AUTO (turn-based or auto-resolved combat)
→ repeat until victory / game over / NG+
```

## Key Systems

### Party & Equipment (`RPGState.ts`, `PartyFactory.ts`)
- **Party size**: Up to 6 members (`MAX_PARTY_SIZE`)
- **8 equipment slots**: weapon, armor, accessory, helmet, shield, legs, boots, ring
- **Equipment stats**: ATK, DEF, HP, MP, speed, block chance, crit chance
- **Formation**: Front line (1) and back line (2) per member
- **Recruit system**: Roster resets every 20 overworld steps; unique recruits tracked separately
- **Starting party**: Created via `PartyFactory.createStarterParty()` with 5 health potions and 100 gold

### Leveling & Mastery (`RPGBalanceConfig.ts`, `MasteryDefs.ts`)
- **Max level**: 30, XP formula: `BASE_XP_TO_LEVEL * XP_SCALE_FACTOR^level` (100 base, 1.5x scaling)
- **Stat growth**: +12% per level to HP, ATK, DEF
- **Mastery system**: After level 30, XP converts to mastery points (200 XP per point)
- **Mastery bonuses**: 5 purchasable bonuses (Critical Focus +2% crit, Life Drain +3% lifesteal, Spell Penetration +5%, Vitality +10 HP, Arcane Well +5 MP)

### Turn-Based Battle (`TurnBattleSystem.ts`)
- **Initiative**: Speed-based turn ordering with front/back line mechanics
- **Actions**: Attack, Ability, Spell, Item, Defend (50% damage reduction + counter-ready), Flee, Limit Break, Swap Row
- **Elements**: Unit-type-based element assignments with effectiveness multipliers
- **Critical hits**: 10% base chance, 1.5x multiplier, modified by equipment and mastery
- **Block chance**: Equipment-derived, capped at 50%
- **Limit break gauge**: 0-100, fills from taking/dealing damage; at 100 a unique Limit Break action becomes available
- **Threat/aggro system**: Enemy AI targets highest-threat party members
- **Taunt**: Forces enemies to target a specific unit for N turns
- **Counter-attacks**: Triggered when defending
- **Summoning**: Player-side max 2 summons, enemy-side max 10 total slots
- **Status effects**: Poison, regen, slow, haste, shield, stun, wet (with status combo system)
- **Status combos**: Specific status combinations trigger bonus effects
- **Flee mechanic**: Base 50% chance, modified by speed differential (10%-90% range), disabled for boss encounters

### Spell Learning (`SpellLearningSystem.ts`, `RPGSpellDefs.ts`)
- Casters auto-learn spells on level-up (mages: 2 per level, healers: 1 per level)
- Max known spells: mages = 3 + level, healers = 2 + floor(level/2)
- Tiered spell system with spells purchasable at town magic shops and arcane libraries
- Spells include damage, healing, summoning, and buff/debuff types

### Affinity System (`AffinityDefs.ts`)
- Bidirectional affinity scores between party members (memberId to memberId)
- 3 threshold tiers: 10 (+5% ATK), 25 (+10% ATK / +5% DEF), 50 (+15% ATK / +10% DEF)
- Grows through shared battles and party interactions

### Overworld (`OverworldSystem.ts`, `OverworldGenerator.ts`)
- **Map**: 192x192 tile grid with fog of war (7-tile vision radius)
- **Tile types**: Various terrain with per-tile encounter rates and movement costs
- **Entities**: Towns (shop + inn + quests + recruits + magic shop), dungeon entrances, NPCs (including legendary leaders), chests, landmarks, arcane libraries, roaming enemies, shrines, herb nodes, fishing spots
- **Random encounters**: Base 8% chance, grows +2% per step since last encounter, modified by night (+50%), fog (-30%), and leader blessings
- **Roaming enemies**: Move 1 tile per 3 player steps, respawn after 100 steps when defeated
- **Weather**: Clear, rain, snow, fog; changes every 30-60 steps
- **Time of day**: 240-step cycle (morning 0-59, day 60-119, evening 120-179, night 180-239)
- **Fast travel**: Between discovered towns for 50 gold
- **World events**: 10% chance every 10 steps to trigger a random world event
- **Resource nodes**: Herbs (gather, respawn after 60 steps), shrines (buff, respawn after 80 steps), fishing spots (HP heal + gold, respawn after 50 steps)

### Dungeons (`DungeonSystem.ts`, `DungeonGenerator.ts`)
- Procedurally generated multi-floor layouts with rooms and corridors
- **Room types**: Normal, treasure, boss, safe, entrance, exit
- **Room sizes**: 5-11 tiles (configurable via `MIN_ROOM_SIZE` / `MAX_ROOM_SIZE`)
- **Tile-based fog of war**: 6-tile sight radius, revealed tiles stay visible
- **Floor navigation**: Stairs up/down, exit via first floor stairs up
- **Encounters**: Room-based (not random); each room has an encounter that triggers once on first entry
- **Boss rooms**: Non-fleeable boss encounters

### Quest System (`QuestSystem.ts`, `QuestDefs.ts`)
- **Objective types**: Kill, collect, explore, talk, heal_total
- **Branching choices**: Optional quest choices with different rewards (gold, XP, items, recruit unit)
- **Personal quests**: Tied to specific party members (bonus crit chance, healing multiplier)
- **Main quest**: 5-shard collection narrative (steps 0-5)
- **Karma**: Positive = good, negative = evil; affects NPC interactions

### Leader Encounters (`LeaderEncounterSystem.ts`, `LeaderEncounterDefs.ts`)
- Legendary leader NPCs spawn on the overworld (condition-gated by level, quest progress, etc.)
- First meeting grants a timed or permanent blessing (ATK/DEF multipliers, XP/gold multipliers, encounter rate modification, HP regen)
- Return visits provide shorter dialogue

### Save System (`SaveSystem.ts`)
- **4 save slots** (slot 3 is auto-save) using localStorage
- Serializes full RPG state including Sets (converted to arrays)
- Save metadata: timestamp, average party level, gold, playtime, location
- Overworld is re-generated from seed on load (deterministic)

### New Game+ (`NewGamePlusSystem.ts`)
- Keeps: party members (reset to level 1, keep promotions/unitType), non-key items, 50% gold, formation, affinity, bestiary, achievements, lore, karma, difficulty settings
- Resets: quests, dungeon progress, map discovery, leader meetings, town reputation
- Enemy scaling: +5 levels per NG+ cycle (bosses +10)
- New seed = old seed + 1

### Economy
- **Starting gold**: 100
- **Inn cost**: 30 gold
- **Shop tiers**: Early, mid, late (town-based); inventory refreshes every 20 steps
- **Arena**: 3 fights per town visit
- **Town reputation**: Tracked per town via purchase count

## Source Files

```
rpg/
├── RPGBoot.ts                     RPGGame orchestrator (boot, input, battle flow, town, dungeon)
├── state/
│   ├── RPGState.ts                Party, equipment, inventory, quests, bestiary, blessings, NG+
│   ├── OverworldState.ts          Tile grid, entities (towns, dungeons, NPCs, chests, roaming enemies, etc.)
│   ├── DungeonState.ts            Floors, rooms, corridors, tile fog of war
│   └── TurnBattleState.ts         Combatants, turn order, actions, limits, summons
├── systems/
│   ├── RPGStateMachine.ts         Phase transitions (OVERWORLD, DUNGEON, BATTLE, TOWN, etc.)
│   ├── OverworldSystem.ts         Movement, encounters, entity interaction, weather, fast travel
│   ├── DungeonSystem.ts           Dungeon movement, room entry, staircase navigation
│   ├── TurnBattleSystem.ts        Initiative, actions, damage, elements, limit breaks, AI, victory/defeat
│   ├── QuestSystem.ts             Accept, track, complete, reward quests
│   ├── SaveSystem.ts              4-slot localStorage save/load with auto-save
│   ├── PartyFactory.ts            Starter party and party member creation
│   ├── RecruitSystem.ts           Recruit roster management (20-step refresh)
│   ├── EquipmentSystem.ts         Equipment management
│   ├── SpellLearningSystem.ts     Spell learning on level-up
│   ├── LeaderEncounterSystem.ts   Leader NPC spawning, blessings
│   ├── ArenaSystem.ts             Town arena fights
│   ├── CraftingSystem.ts          Crafting (stubbed — recipe check + consume)
│   ├── AchievementSystem.ts       Achievement tracking
│   ├── NewGamePlusSystem.ts       NG+ state creation, enemy scaling
│   ├── PromotionSystem.ts         Unit promotion/class change
│   ├── PvPArenaSystem.ts          PvP arena mode
│   ├── LeaderboardSystem.ts       Score submission
│   ├── RPGBattleBridge.ts         Bridge between RPG and RTS battle systems
│   └── TutorialSystem.ts          Tutorial flag management
├── gen/
│   ├── OverworldGenerator.ts      192x192 procedural overworld generation
│   └── DungeonGenerator.ts        Multi-floor dungeon generation (rooms, corridors, stairs)
├── config/
│   ├── RPGBalanceConfig.ts        All balance constants (party, battle, dungeon, economy, spells)
│   ├── RPGItemDefs.ts             Item definitions, shop inventory generation
│   ├── RPGSpellDefs.ts            Spell definitions, magic shop generation
│   ├── EncounterDefs.ts           Encounter tables (overworld + dungeon)
│   ├── DungeonDefs.ts             Dungeon definitions (floors, theme, level requirements)
│   ├── QuestDefs.ts               Quest definitions per NPC
│   ├── AffinityDefs.ts            Affinity thresholds and bonuses
│   ├── MasteryDefs.ts             Post-max-level mastery bonuses
│   ├── ElementDefs.ts             Element type assignments and effectiveness
│   ├── LimitBreakDefs.ts          Limit break definitions per unit type
│   ├── StatusComboDefs.ts         Status effect combination triggers
│   ├── CraftingDefs.ts            Crafting recipes
│   ├── PromotionDefs.ts           Class promotion definitions
│   ├── AchievementDefs.ts         Achievement definitions
│   ├── BanterDefs.ts              Party banter/dialogue
│   ├── ArenaDefs.ts               Arena encounter definitions
│   ├── LeaderEncounterDefs.ts     Leader NPC encounter definitions and blessings
│   ├── LoreDefs.ts                Collectible lore entries
│   ├── TradeGoodDefs.ts           Trade good item definitions
│   ├── UniqueRecruitDefs.ts       Unique recruitable character definitions
│   └── WorldEventDefs.ts          Random world event definitions
└── colosseum/                     (See colosseum.md)
```

## Incomplete / Stubbed Systems

- **Crafting system** (`CraftingSystem.ts`): Logic for `canCraft` and `craft` exists, but no UI integration and `CraftingDefs.ts` has minimal recipes — no crafting menu in towns
- **Affinity combo attacks**: Affinity provides stat bonuses at thresholds (10/25/50) but no combo attacks, dual techs, or relationship events
- **Spell slots unlimited**: All known spells are available every turn with no per-rest or per-battle slot limits — no strategic spell preparation
- **Shop scaling**: Shop tiers are fixed per town (`ShopTier` = early/mid/late) and don't scale with player level or NG+ cycle
- **Dungeon content**: No puzzle rooms, trap tiles, secret rooms, or environmental hazards — rooms are purely encounter-or-empty
- **Weather gameplay effects**: Weather changes visually and affects encounter rate (fog -30%), but has no effect on combat, movement speed, or spell effectiveness
- **PvP Arena** (`PvPArenaSystem.ts`): System file exists but not connected to the main game flow
- **Equipment durability**: `battlesFought` is tracked per member but never decrements equipment durability
- **Promotion system** (`PromotionSystem.ts`): Exists in config but integration with the main game is minimal

## Improvement Ideas

1. **Complete crafting system**: Add a crafting UI in towns, expand recipes to use herbs/fish/trade goods, allow equipment enhancement and consumable creation
2. **Affinity combo attacks**: At high affinity thresholds, unlock dual-tech abilities (two party members act together for a powerful combined attack)
3. **Spell slot/preparation system**: Limit equipped spells per battle to force strategic choices — e.g., 4 prepared spells from the full known list
4. **Shop scaling**: Scale shop inventory quality with player level, NG+ count, and town reputation; add rare item rotation
5. **Dungeon puzzles and traps**: Add puzzle rooms (switch/lever mechanics), trap tiles (damage/status on step), secret rooms behind destructible walls, and environmental hazards (flooding, collapsing floors)
6. **Weather combat effects**: Rain boosts lightning/water damage, snow slows units, fog reduces accuracy, clear weather gives no bonus — creating terrain/weather interaction
7. **Karma consequences**: Expand karma beyond NPC dialogue to affect shop prices, quest availability, town access, and unlock karma-specific endings
8. **Equipment durability**: Use the existing `battlesFought` counter to degrade equipment, requiring repair at blacksmiths or replacement
9. **Personal quest depth**: Expand personal quests beyond stat bonuses to include backstory dungeons, unique equipment, and affinity-driven narrative branches
10. **Abyss mode content**: The `abyssRecord` tracks deepest floor but Abyss mode itself needs unique floor modifiers, leaderboards, and exclusive rewards
