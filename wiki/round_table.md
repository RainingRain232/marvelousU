# Round Table — Roguelike Deckbuilder

**Enum**: `GameMode.ROUND_TABLE`
**Source**: `/roundtable`
**Framework**: PixiJS 2D + GSAP animations
**Players**: 1

## Overview

A Slay the Spire-inspired roguelike deckbuilder set in Arthurian legend. Play as one of 5 Knights of the Round Table on a quest for the Holy Grail. Build a deck of Action Cards, collect Relics, and fight through 3 Acts of enemies, events, and bosses.

## Gameplay Loop

```
Select Knight → Navigate Map → Fight Enemies → Collect Rewards → Rest/Shop/Events → Beat Boss → Next Act → Find the Grail
```

## Knights (5 playable)

| Knight | HP | Archetype | Passive |
|--------|----|-----------|---------|
| **Lancelot** | 75 | Multi-hit + Draw | First unblocked damage each turn draws 1 card |
| **Gawain** | 85 | Strength Scaling | Every 3rd combat: +2 STR. Others: enemies +1 STR |
| **Percival** | 80 | Block Fortress | End of turn: +1 Block per unplayed card in hand |
| **Morgause** | 70 | Curse Synergy | Drawing Curses grants 1 Energy + 3 damage to random enemy |
| **Tristan** | 72 | Poison Attrition | Start of combat: 1 Poison to ALL enemies |

Each knight has 3 exclusive Uncommon + 1 exclusive Rare card in the reward pool.

## Card System

- **~140 total cards** across 8 types: Strike, Guard, Spell, Virtue, Sin, Companion, Curse, Status
- **4 rarities**: Starter, Common, Uncommon, Rare (plus Curse)
- **Upgrade system**: Rest sites let you upgrade cards (improved stats)
- **Card types**:
  - Strike (red): Damage-dealing attacks
  - Guard (blue): Block/defense
  - Spell (purple): Utility, buffs, debuffs
  - Virtue (gold): Healing, scaling, raises Purity
  - Sin (dark red): Powerful with drawbacks, lowers Purity
  - Companion (green): Summons persistent allies
  - Curse/Status: Harmful unplayable cards

## Purity System

- Ranges 0-100 (starts at 50)
- Virtue cards and noble event choices raise it
- Sin cards and selfish choices lower it
- **High Purity (75+)**: Virtue cards appear more in rewards, Sin excluded
- **Low Purity (25-)**: Sin cards appear more, Virtue excluded
- **Final boss changes** based on purity: high = Grail Guardian, low = Shadow Self
- **Purity Pendant relic**: doubles all purity changes

## Combat

- **Turn-based card combat** with energy system (3 energy/turn, draw 5 cards)
- **Status effects**: Strength, Dexterity, Vulnerable, Weak, Poison, Regen, Thorns, Frail, Holy Shield
- **Enemy intent system**: Enemies show their next action (Attack/Defend/Buff/Debuff)
- **Boss phases**: All 6 bosses have HP-threshold phase transitions

### Keyboard Shortcuts
- **1-9**: Play card from hand
- **Space/Enter**: End turn
- **Tab**: Cycle enemy target
- **D**: Open deck viewer
- **Escape**: Pause menu

## Map Structure

- **3 Acts**, each with a 15-row branching node map
- **Node types**: Enemy, Elite, Rest, Shop, Event, Treasure, Boss
- **Act 1**: Departure from Camelot (bandits, wolves, cultists)
- **Act 2**: The Wasteland (undead, fae, cursed knights)
- **Act 3**: The Perilous Lands (demons, dragons, fallen paladins)

## Relics (46 total)

Passive items collected from elites, bosses, events, and treasures:
- **Common (14)**: Iron Ring, Lady's Favour, Merlin's Hourglass, Orichalcum, Lantern...
- **Uncommon (16)**: Siege Perilous, Pen Nib, Ornamental Fan, Mercury Hourglass...
- **Rare (9)**: Holy Chalice Fragment, Dead Branch, Du-Vu Doll, Stone Calendar...
- **Boss (9)**: Cursed Key, Philosopher's Stone, Velvet Choker, Astrolabe, Sozu...

## Ascension System (20 levels)

Progressive difficulty modifiers unlocked by winning:
- A1-2: Elite/Normal HP +10%
- A3: Starting HP -7
- A5: Starting Gold -20
- A6-8: Elite/Normal/Boss damage scaling
- A9: Extra starting Curse
- A11: Rest heal reduced
- A12: Shop prices +10%
- A13: More elite encounters
- A15-16: Further HP/Gold reductions
- A17-19: Additional HP scaling

## Meta Progression

- **Knight unlocks**: Gawain (1 win), Morgause (3 wins), Tristan (5 wins)
- **Ascension tracking**: Per-knight highest ascension beaten
- **Run history**: Last 20 runs tracked with stats
- **Best score**: Global leaderboard tracking
- **Daily challenge**: Seeded run with rotating knight, same for all players each day

## Persistence

- **Run auto-save**: Saved after every node, restorable on refresh
- **Meta stats**: Total runs, wins, best score in localStorage
- **Run history**: Last 20 runs with full stat breakdown

## Technical Architecture

```
roundtable/
  types.ts              — Enums, interfaces, state types
  RoundTableGame.ts     — Main orchestrator (boot, phase flow, animation queue)
  config/
    RoundTableBalance.ts    — All tuning constants
    RoundTableKnights.ts    — 5 knight definitions
    RoundTableCards.ts      — ~140 card definitions
    RoundTableRelics.ts     — 46 relic definitions
    RoundTableEnemies.ts    — 28+ enemy definitions + encounter tables
    RoundTableEvents.ts     — 17 narrative events
    RoundTablePotions.ts    — 12 potion definitions
  state/
    RoundTableState.ts      — Run/combat state, RNG, save/load, run history
  systems/
    RoundTableCombatSystem.ts   — Card play, damage calc, enemy AI, boss phases
    RoundTableDeckSystem.ts     — Draw, discard, shuffle, exhaust
    RoundTableMapSystem.ts      — Procedural map generation
    RoundTableRelicSystem.ts    — 46 relic trigger handlers
    RoundTableRewardSystem.ts   — Combat rewards, shop, card choices
    RoundTableEventSystem.ts    — Narrative event resolution
    RoundTableMetaSystem.ts     — Meta progression, unlocks
  view/
    RoundTableCombatView.ts     — Combat scene (battlefield, enemies, hand, FX)
    RoundTableCardView.ts       — Procedural card art with type-specific icons
    RoundTableMapView.ts        — Scrollable node map with terrain
    RoundTableHUD.ts            — Top bar (HP, gold, purity, relics, pause)
    RoundTableMenus.ts          — All menu screens (select, reward, shop, etc.)
```

### Key Patterns
- **Simulation/View separation**: Systems have zero PixiJS imports
- **Animation queue**: Combat builds `animQueue[]`, orchestrator drains it to spawn visual FX
- **GSAP tweens**: All animations (card hover, damage numbers, screen transitions, idle bobbing)
- **Seeded RNG**: Deterministic runs via LCG
- **Per-frame ticker**: Enemy bobbing, ambient particles during combat
