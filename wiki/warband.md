# Warband Mode (3D Tactical Army Battle)

**Enum**: `GameMode.WARBAND`
**Source**: `/warband` (4 subdirectories + main game file)
**Framework**: Three.js 3D
**Players**: 1 vs AI

## Overview

Mount & Blade-style 3D tactical army battle. The player assembles a squad from a shop, equips troops with weapons and armor, and fights real-time battles on an open field, in siege scenarios, or as duels. Features first-person and third-person camera modes, directional melee combat, ranged weapons with projectile physics, mounted cavalry, creature units, and formation-based troop orders.

## Gameplay Loop

```
MENU (select battle type, difficulty, weather, match options)
-> SHOP (assemble army from 50+ unit presets within gold budget)
-> BATTLE (real-time 3D combat with player-controlled hero + AI troops)
-> RESULTS (score screen with kills, damage, blocks, headshots)
-> repeat
```

## Battle Types

- **Open Field** (`OPEN_FIELD`): Standard army vs army on flat terrain
- **Siege** (`SIEGE`): Attacker vs defenders with capture zone mechanics
- **Duel** (`DUEL`): 1v1 melee combat
- **Army Battle** (`ARMY_BATTLE`): Large-scale formation warfare
- **Camera View** (`CAMERA_VIEW`): Spectator mode

## Key Systems

### Unit Roster (50+ presets)

Units are organized by building type for the shop:

| Building | Examples |
|----------|---------|
| Barracks | Swordsman, Knight, Pikeman, Halberdier, Berserker, Defender, Phalanx, Royal Guard, Assassin, Gladiator, Axeman |
| Archery | Archer, Longbowman, Crossbowman, Shortbow, Repeater, Javelineer, Arbalestier, Marksman |
| Stables | Scout Cavalry, Lancer, Horse Archer, Elite Lancer, Cataphract, Heavy Lancer, Royal Lancer, Questing Knight |
| Temple | Novice Priest, Monk, Cleric, Saint, Templar, Angel |
| Mages | Fire Mage, Storm Mage (+ additional tiers) |
| Creatures | Troll, Cyclops |
| Special | Ancient units (1.5x scale, 450-700 HP), Elder units (2.0x scale, 750-1200 HP), Giant units (2.5x scale, 1000-1300 HP) |

Each unit has a cost, tier (1-7), and full equipment loadout (weapon, shield, helmet, torso, gauntlets, legs, boots). Some units have HP overrides (50-1500), speed multipliers (0.4-1.3), and visual scale modifiers.

### Weapon Types

Swords (arming sword, sabre, falchion, zweihander, royal sword, ancient/elder swords), axes (battle axe, ancient/elder axes), maces (mace, morning star), bows (short bow, long bow, war bow, composite bow, ancient/elder bows), pikes (pike, halberd, spear, ancient pike, elder lance), lances (lance, giant lance), javelins, crossbows (arbalest, heavy crossbow, ancient/elder crossbow), staves (fire staff, storm staff, healing staff, cleric staff, saint staff).

### Armor System

Five armor slots: head, torso, gauntlets, legs, boots. Armor ranges from cloth (cloth hood, cloth wraps) through leather, mail, brigandine, splinted, to full plate (great helm, plate cuirass, plate gauntlets, plate greaves, plate sabatons). Ancient and elder armor tiers exist for oversized units. Specialized armor includes priest robes, fire mage robes, and healing gear.

### Horse Armor Tiers

| Tier | HP |
|------|----|
| Light | Configured in `WarbandBalanceConfig` |
| Medium | Higher HP than light |
| Heavy | Highest HP |

Horses are separate entities with their own HP, position, rotation, and walk cycle. Riders can be dismounted.

### Combat State Machine

```
IDLE -> WINDING (attack wind-up) -> RELEASING (attack lands) -> RECOVERY
IDLE -> BLOCKING (directional block)
any -> STAGGERED (hit while not blocking)
any -> DEAD
IDLE -> DRAWING (bow draw / crossbow reload) -> AIMING -> RELEASING
```

Four attack/block directions: left swing, right swing, overhead, stab. Stamina system limits actions.

### Formations & Orders

| Formation | Description |
|-----------|-------------|
| Line | Standard line abreast |
| Column | Single-file march |
| Wedge | V-shaped charge formation |
| Square | Defensive formation |
| Scatter | Spread out |

| Order | Description |
|-------|-------------|
| Charge | All troops attack |
| Hold | Stand ground |
| Hold and Fire | Ranged units fire, melee holds |
| Follow | Follow the player |

Troop groups for selective ordering: All, Archers, Melee, Cavalry, Mages, Siege.

### Morale & Fleeing

Fighters have a 0-100 morale value. Low morale triggers fleeing behavior. Players can flee via map edge (flee timer accumulates while at edge without being hit).

### Stats Tracking

Per-fighter: kills, damage dealt, damage taken, blocks, headshots, spells cast, longest streak, current streak.

### Match Options

Difficulty (easy/normal/hard/brutal), weather (clear/rain/fog/night), toggles for morale, friendly fire, double damage, no ranged, all cavalry, creature abilities.

### AI System (`WarbandAISystem.ts`)

Per-fighter AI state with target selection, decision timer, reaction delay, block chance, aggressiveness (0-1), preferred range, and strafing behavior.

### Physics System (`WarbandPhysicsSystem.ts`)

Projectile physics with gravity, collision detection between fighters/horses/projectiles, ground detection.

### Visual Systems

- `WarbandSceneManager.ts`: Three.js scene setup and management
- `WarbandCameraController.ts`: First-person and third-person camera
- `WarbandFighterRenderer.ts`: Skeletal fighter meshes with bone-based animation (17 bones: hips, spine, chest, neck, head, upper/forearm/hand x2, thigh/shin/foot x2)
- `WarbandHorseRenderer.ts`: Horse mesh rendering
- `WarbandCreatureRenderer.ts`: Creature rendering (trolls, cyclops)
- `WarbandFX.ts`: Particle and visual effects
- `WarbandHUD.ts`: Heads-up display
- `WarbandShopView.ts`: Army assembly shop UI

## Source Files

```
warband/
├── WarbandGame.ts          Main game orchestrator (menu -> shop -> battle -> results)
├── WarbandCampaign.ts      Campaign overworld (separate game mode)
├── config/
│   ├── WarbandBalanceConfig.ts   Balance constants (HP, stamina, damage, etc.)
│   ├── WeaponDefs.ts             Weapon stat definitions
│   ├── ArmorDefs.ts              Armor stat definitions & slot enum
│   └── CreatureDefs.ts           Creature type definitions (troll, cyclops)
├── state/
│   └── WarbandState.ts           Central state types, enums, factory functions
├── systems/
│   ├── WarbandCombatSystem.ts    Damage resolution, hit detection, directional combat
│   ├── WarbandPhysicsSystem.ts   Movement, collision, projectile flight
│   ├── WarbandAISystem.ts        Per-fighter AI decision making
│   └── WarbandInputSystem.ts     Player input handling
└── view/
    ├── WarbandSceneManager.ts    Three.js scene setup
    ├── WarbandCameraController.ts  First/third person camera
    ├── WarbandFighterRenderer.ts   Skeletal fighter meshes
    ├── WarbandHorseRenderer.ts     Horse rendering
    ├── WarbandCreatureRenderer.ts  Creature rendering
    ├── WarbandFX.ts                Particle effects
    ├── WarbandHUD.ts               HUD overlay
    └── WarbandShopView.ts          Army shop UI
```

## Incomplete / Stubbed Systems

- **No campaign integration**: Warband battles are standalone; no persistent progression between battles (campaign is a separate mode)
- **No unit experience**: Units do not gain XP or level up between battles
- **Formation integrity**: Formations are set but do not dynamically maintain spacing or reform after engagement
- **Siege mechanics**: Basic capture-zone system exists but no destructible walls, siege engines, or multi-stage assault
- **No morale rout cascade**: Morale exists per-fighter but there is no army-wide rout mechanic where fleeing units cause others to flee
- **Creature abilities**: Toggle exists but creature-specific special attacks are not fully implemented
- **Weather effects**: Weather setting exists (rain/fog/night) but gameplay impact (visibility, movement) is minimal

## Improvement Ideas

1. **Flanking and rear charge bonuses**: Detect attack angle relative to target facing and apply damage multipliers for flanking/rear attacks
2. **Terrain effects**: Add hills, forests, and mud that affect movement speed, charge damage, and ranged accuracy
3. **Formation maintenance**: Troops should actively reform after skirmishes, fill gaps when allies fall, and maintain spacing
4. **Siege overhaul**: Destructible gates and walls, siege ladders/towers/rams as deployable units, multi-phase assault (breach -> courtyard -> keep)
5. **Morale cascade**: Army-wide morale tracking where heavy losses trigger mass rout, with rallying mechanics for leaders
6. **Unit veterancy**: Surviving units gain XP across battles, unlocking stat bonuses or equipment upgrades
7. **Creature special attacks**: Troll ground pound, cyclops boulder throw, mounted creature charges
8. **AI group tactics**: AI should coordinate flanking maneuvers, focus fire, and protect ranged units rather than individual decision-making only
9. **Weather gameplay**: Rain reduces bow range/accuracy, fog limits vision range, night gives stealth bonuses
10. **Persistent warband**: Save/load army compositions between sessions with a roster management screen
