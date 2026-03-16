# Medieval Autobattler — Game Modes Wiki

This wiki documents all 25 game modes in the Medieval Autobattler project.

## Core Autobattler Modes

These modes share the `/sim` simulation core (buildings, units, economy, spells).

| Mode | Page | Description |
|------|------|-------------|
| Standard | [standard.md](standard.md) | Classic RTS autobattler with economy management |
| Deathmatch | [deathmatch.md](deathmatch.md) | High-resource aggressive skirmish |
| Battlefield | [battlefield.md](battlefield.md) | Pre-positioned units, pure tactical combat |
| Campaign | [campaign.md](campaign.md) | 25-scenario single-player story progression |
| Roguelike | [roguelike.md](roguelike.md) | Endless survival with randomized building pools |
| Wave | [wave.md](wave.md) | Wave-defense variant with corruption system |

## Strategy Modes

| Mode | Page | Description |
|------|------|-------------|
| World | [world.md](world.md) | 4X grand strategy on hex grid with diplomacy |
| RPG | [rpg.md](rpg.md) | JRPG with overworld, dungeons, turn-based combat |
| Colosseum | [colosseum.md](colosseum.md) | Arena tournament bracket sub-mode of RPG |

## Fighting Games

| Mode | Page | Description |
|------|------|-------------|
| Duel | [duel.md](duel.md) | 2D 1v1 fighting game with 16+ characters |
| Tekken | [tekken.md](tekken.md) | 3D fighting game with juggle/combo system |

## Roguelike / Wave Modes

| Mode | Page | Description |
|------|------|-------------|
| Survivor | [survivor.md](survivor.md) | Vampire Survivors-style roguelike wave defense |
| Dragoon | [dragoon.md](dragoon.md) | Panzer Dragoon-style on-rails shmup |
| Three Dragon | [three_dragon.md](three_dragon.md) | 3D aerial shmup (Three.js) |
| Game | [game.md](game.md) | Quest for the Grail roguelike dungeon crawler |

## Open World / Sandbox

| Mode | Page | Description |
|------|------|-------------|
| Medieval GTA | [medieval_gta.md](medieval_gta.md) | 2D open-world city sandbox |
| Medieval GTA 3D | [medieval_gta_3d.md](medieval_gta_3d.md) | 3D open-world city sandbox (Three.js) |

## Tactical / Army Combat

| Mode | Page | Description |
|------|------|-------------|
| Warband | [warband.md](warband.md) | Mount & Blade-style 3D tactical battles |
| Warband Campaign | [warband_campaign.md](warband_campaign.md) | Overworld campaign map for Warband |

## Action RPG

| Mode | Page | Description |
|------|------|-------------|
| Diablo | [diablo.md](diablo.md) | Isometric action RPG with loot system |
| Arthurian RPG | [arthurian_rpg.md](arthurian_rpg.md) | 3D first-person open-world RPG |

## Multiplayer / Competitive

| Mode | Page | Description |
|------|------|-------------|
| Mage Wars | [mage_wars.md](mage_wars.md) | 3D team FPS arena shooter with wands |
| Grail Ball | [grail_ball.md](grail_ball.md) | Fantasy team ball sport |
| Grail Manager | [grail_manager.md](grail_manager.md) | Football Manager-style team management sim |

---

## Architecture

All game modes follow the same patterns:
- **Sim/View separation**: Game logic never imports rendering code
- **Fixed timestep**: 50-60 Hz simulation loop decoupled from render framerate
- **State → Systems → View**: Data-driven architecture with ECS-style systems
- **Event Bus**: Typed events bridge simulation and rendering

See [claude.md](../claude.md) for the full architectural specification.
