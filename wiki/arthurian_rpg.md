# Arthurian RPG Mode (3D First-Person RPG)

**Enum**: `GameMode.ARTHURIAN_RPG`
**Source**: `/arthurianrpg` (14 files)
**Framework**: Canvas 3D rendering (custom raycaster-style)
**Players**: 1 (single-player)

## Overview

A 3D first-person RPG set across the lands of Arthurian legend. Players choose from 6 character classes, explore 10 interconnected regions from Camelot to the Grail Castle, engage in real-time combat with stamina and spell cooldowns, recruit companions, craft equipment, complete quests, and pursue a 14-stage main quest. Features a full day/night cycle, weather system with gameplay effects, procedurally generated dungeons, and an extensive skill/perk tree system.

## Gameplay Loop

```
CLASS SELECT → choose from 6 classes (Knight, Ranger, Mage, Rogue, Paladin, Druid)
→ EXPLORING (first-person 3D navigation through regions)
  - Talk to NPCs (merchants, quest givers, trainers, companions)
  - Discover points of interest (towns, dungeons, landmarks, shrines, camps)
  - Fast travel between discovered locations
→ COMBAT (real-time: light/heavy attacks, blocking, dodging, spell casting)
  - Stamina for melee actions, mana for spells
  - Combo system, stagger buildup, critical hits
  - Companion AI fights alongside (attacker/healer/defender roles)
→ CRAFTING (smithing, alchemy, enchanting at workstations)
→ INVENTORY (equipment slots: mainHand, offHand, head, chest, legs, feet, 2 rings, amulet, cloak)
→ QUESTS (14-stage main quest + side quests with kill/collect/talk/explore/escort/craft objectives)
→ DUNGEON (procedurally generated floors with rooms, corridors, chests, doors, boss)
→ LEVEL UP (attribute points + perk points per level, max level 80)
```

## Key Systems

### Character Classes (6 classes)

| Class | STR | DEX | CON | INT | WIS | CHA | PER | HP | MP | Stamina |
|-------|-----|-----|-----|-----|-----|-----|-----|----|----|---------|
| Knight | 14 | 8 | 14 | 6 | 8 | 10 | 8 | 130 | 30 | 120 |
| Ranger | 10 | 14 | 10 | 8 | 10 | 8 | 14 | 100 | 40 | 130 |
| Mage | 6 | 8 | 8 | 16 | 14 | 8 | 10 | 80 | 120 | 80 |
| Rogue | 8 | 16 | 8 | 10 | 6 | 12 | 12 | 90 | 50 | 140 |
| Paladin | 12 | 8 | 12 | 10 | 14 | 12 | 8 | 120 | 70 | 100 |
| Druid | 8 | 10 | 10 | 12 | 16 | 10 | 12 | 95 | 100 | 90 |

Each class has starting skills and pre-equipped gear. All 7 attributes (STR, DEX, CON, INT, WIS, CHA, PER) affect derived stats and skill effectiveness.

### Attributes & Derived Stats
- **7 Attributes**: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma, Perception
- **3 attribute points per level**, max level 80
- **Derived stats**: maxHp, maxMp, maxStamina, physicalDamage, magicDamage, armor, blockEfficiency, critChance, critMultiplier, dodgeChance, moveSpeed, carryWeight

### Skill System (18 skills, 3 categories)
**Combat (6)**: One-Handed, Two-Handed, Archery, Block, Heavy Armor, Light Armor
**Magic (7)**: Destruction, Restoration, Conjuration, Enchanting, Alchemy, Illusion, Nature Magic
**Stealth (6)**: Sneak, Lockpicking, Pickpocket, Speech, Smithing, Herbalism

Each skill has XP tracking, max level 100, and a governing attribute. Skills improve through use.

### Perk System (54 perks, 3 per skill)
Perks unlock at skill levels 25, 50, and 75. Examples:
- **Blade Dancer** (One-Handed 75): Power attacks cost 30% less stamina, +15% crit
- **Backstab** (Sneak 50): Sneak attacks with daggers deal 6x damage
- **Twin Souls** (Conjuration 50): Maintain two summoned creatures at once
- **Arcane Blacksmith** (Enchanting 75): Enchanted items can be improved at a forge
- **Purity** (Alchemy 75): Remove negative effects from potions, positive from poisons

### Combat System (`ArthurianRPGCombat.ts`)
- Real-time with light attacks, heavy attacks, blocking, dodging
- Stamina-based melee (regen 12/s idle), mana-based spells (regen 3/s)
- **Combo system**: Chain attacks within a time window for escalating damage
- **Stagger buildup**: Heavy attacks build stagger; fully staggered enemies are vulnerable
- **Elemental types** (8): Physical, Fire, Ice, Lightning, Holy, Dark, Nature, Arcane
- **Magic schools** (4): Destruction, Restoration, Conjuration, Nature
- **Active effects**: Buffs, debuffs, DoTs with tick intervals, stacking
- **Enemy AI behaviors** (7 states): Idle, Patrol, Alert, Chase, Attack, Flee, Dead
- **Boss phases**: Multi-phase bosses with special attacks, summon abilities, area attacks

### Regions (10 interconnected regions)

| Region | Level Range | Terrain | Key Locations |
|--------|------------|---------|---------------|
| Camelot | 1-5 | Stone | Round Table Hall, Royal Forge, Training Grounds |
| Glastonbury | 3-8 | Grass | Glastonbury Abbey, Glastonbury Tor, Chalice Well |
| Cornwall | 4-10 | Grass | Stone Circle, Tin Mine, Fishing Village |
| Tintagel | 5-12 | Stone | Tintagel Castle, Merlin's Cave, Cliff Market |
| Broceliande Forest | 8-18 | Grass | Merlin's Oak, Fairy Ring, Spider Caves |
| Saxon Frontier | 10-20 | Dirt | Badon Hill, Saxon War Camp, Burned Village |
| Avalon | 15-25 | Water | Lake of the Lady, Court of the Fae, Healing Springs |
| Perilous Forest | 15-25 | Swamp | Green Chapel, Troll Bridge, Lost Knight's Camp |
| The Wasteland | 20-30 | Sand | Blighted Ruins, Dead Lake, Bone Cairn |
| Corbenic (Grail Castle) | 25-35 | Stone | The Grail Castle, Grail Chapel, Fisher King's Hall |

Regions are connected in a graph; fast travel unlocked on discovery.

### NPCs & Dialogue (`ArthurianRPGDialogue.ts`)
- Named NPCs with roles: QuestGiver, Merchant, Companion, Trainer, Ruler
- NPC daily schedules: sleeping, working, eating, wandering, patrolling
- Shop inventories per merchant NPC
- Faction reputation system affecting NPC disposition
- Essential NPCs (cannot be killed)
- Dialogue state machine with branching

### Companion System (`ArthurianRPGCompanionAI.ts`)
- Up to 2 active companions
- 3 combat roles: Attacker, Healer, Defender
- Companions have full stats: level, HP, MP, equipment, attributes, morale
- Companion AI decides actions in combat based on role assignment

### Crafting System (`ArthurianRPGCrafting.ts`)
- Disciplines: Smithing (forge), Alchemy (alchemy table), Enchanting
- Recipes requiring specific materials and skill levels
- Material items with weight and quality tiers
- Crafted items inherit quality from components and skill level

### Inventory & Equipment (`ArthurianRPGInventory.ts`)
- Weight-based inventory (carry weight derived from STR)
- 10 equipment slots: mainHand, offHand, head, chest, legs, feet, ring1, ring2, amulet, cloak
- Item quality tiers: Common, Uncommon, Rare, Epic, Legendary
- Enchantment slots on items
- Notable items: Excalibur (85 dmg, Holy), Clarent (78 dmg, Dark), Rhongomyniad (90 dmg, Holy), Merlin's Staff, Round Table Shield

### Dungeon Generation
- Procedural dungeon layouts with rooms, corridors, doors, chests
- Boss rooms and entrance rooms marked
- Dungeon entrances found in region overworld
- Difficulty scaling 1-10
- Seeded generation for consistency
- Enemy spawn points per room with level scaling

### Weather & Day/Night Cycle
- 6 weather types: clear, rain, storm, fog, snow, overcast
- Each weather type modifies: fire/ice/lightning damage, movement speed, detection range, stealth effectiveness, stamina drain, lightning strike chance
- Day/night cycle: 120 real seconds per in-game hour
- NPCs follow schedules based on time of day

### Quest System (`ArthurianRPGQuests.ts`)
- **14-stage main quest** progressing through the Arthurian narrative (The Summoning through Mordred's Betrayal)
- Objective types: kill, collect, talk, explore, escort, craft
- Optional objectives for bonus rewards
- Quest tracking with active/completed states

### Audio System (`ArthurianRPGAudio.ts`)
- Region-specific ambient music tracks
- Combat music transitions
- Sound effects for actions

## Source Files

```
arthurianrpg/
├── ArthurianRPGConfig.ts       CharacterClassDef (6), SkillDef (18), PerkDef (54),
│                               ItemDef (40+), NPCDef (10+), EnemyDef, RegionDef (10),
│                               QuestStage (14), ElementalType, TerrainType, RPG_CONFIG
├── ArthurianRPGState.ts        PlayerState, WorldState, EnemyInstance, NPCInstance,
│                               CompanionState, DungeonState, CombatState, EquippedGear,
│                               Inventory, QuestState, WeatherModifiers, ActiveEffect
├── ArthurianRPGCombat.ts       Combat engine: damage calculation, spells, combos,
│                               stagger, elemental interactions, boss phases
├── ArthurianRPGCrafting.ts     Crafting recipes, discipline system, material requirements
├── ArthurianRPGDialogue.ts     Dialogue tree system, NPC conversation state machine
├── ArthurianRPGInventory.ts    Inventory management, equipment, weight, item operations
├── ArthurianRPGMovement.ts     First-person movement, collision, physics
├── ArthurianRPGRenderer.ts     Canvas 3D rendering (raycasting, sprites, environment)
├── ArthurianRPGHUD.ts          UI: health/mana/stamina bars, minimap, quest tracker, menus
├── ArthurianRPGAI.ts           Enemy AI state machine, companion AI, CompanionDef
├── ArthurianRPGCompanionAI.ts  Companion combat behavior (attacker/healer/defender)
├── ArthurianRPGQuests.ts       Quest system, objective tracking, reward distribution
├── ArthurianRPGAudio.ts        Music and SFX management, region-based ambient tracks
└── ArthurianRPGGame.ts         Main orchestrator: boot, game loop, state management
```

## Incomplete / Stubbed Systems

- **3D rendering**: Uses a custom Canvas raycaster-style renderer rather than full 3D; models are likely flat sprites or simple geometric shapes. Animation is minimal.
- **Stealth mechanics**: Sneak skill exists with perks (Shadow Step, Backstab, Shadow Warrior) but actual stealth detection/AI awareness may be rudimentary
- **Companion banter**: Companions have morale and combat roles but no dialogue or relationship progression system
- **NPC schedules**: Schedule entries are defined (sleep/work/eat/patrol) but pathfinding and activity transitions may be basic
- **Weather effects**: Modifiers are well-defined in data but visual weather rendering is likely minimal
- **Illusion magic**: Skill and perks defined but actual illusion spell implementations (invisibility, calm, fear) may be stubs
- **Lockpicking/pickpocket**: Skills and perks exist but the interactive minigame mechanics are likely absent

## Improvement Ideas

1. **Full 3D graphics pass**: Migrate to Three.js or WebGL for proper 3D models, skeletal animation, particle effects, and dynamic lighting
2. **Stealth system**: Implement proper line-of-sight, light/shadow detection, noise levels, and stealth kill animations
3. **Companion relationships**: Add companion-specific dialogue trees, approval/disapproval system, personal quests, and banter during exploration
4. **Mount system**: Horses and magical mounts for faster overworld travel, mounted combat
5. **Housing system**: Player-owned property in Camelot with storage, display cases for trophies, customizable interior
6. **Multiple endings**: Branching narrative based on choices (side with Mordred, seek the Grail, unite the kingdoms, etc.)
7. **Faction consequences**: Deep faction reputation affecting available quests, merchant prices, NPC aggression, and region access
8. **Dungeon variety**: Themed dungeons matching regions (ice caves in the north, spider-infested forests, underwater ruins near Avalon)
9. **Enchanting depth**: Visual enchantment effects on weapons, soul gem system, disenchanting to learn new enchantments
10. **World events**: Dynamic world events (Saxon invasions, plague outbreaks, dragon sightings) that affect regions and quests over time
