# Camelot Ascent — Vertical Platformer Roguelike

**Enum**: `GameMode.CAMELOT_ASCENT`
**Source**: `/ascent`
**Framework**: PixiJS 2D + GSAP animations
**Players**: 1

## Overview

A vertical tower-climbing platformer roguelike. Play as a knight ascending an infinite tower, jumping between procedurally generated platforms, fighting enemies, collecting power-ups, and defeating bosses every 25 floors. Spend coins earned across runs to permanently unlock new abilities.

## Controls

| Key | Action |
|-----|--------|
| Arrow Keys / WASD | Move left/right |
| Space / Up / W | Jump (double jump if unlocked) |
| X / J | Fire projectile (requires unlock) |
| Shift | Dash (requires unlock) |
| Wall + Space | Wall-jump (slide down walls, kick off) |
| ESC | Pause / Resume |
| 1-4 (death screen) | Purchase upgrades |

## Gameplay

### Core Mechanics
- **Double Jump**: 2 jumps by default, 3 with Triple Jump upgrade
- **Screen Wrapping**: Go off the left edge, appear on the right
- **Wall-Slide**: Touch a wall while falling to slow descent
- **Wall-Jump**: Press jump while wall-sliding to kick off the wall
- **Stomp**: Land on top of enemies to kill them and bounce
- **Projectile Attack**: Fire horizontal energy bolts (unlockable)
- **Dash**: Burst of speed with brief invincibility (unlockable)

### Platform Types

| Type | Color | Behavior |
|------|-------|----------|
| Normal | Gray stone | Solid, always safe |
| Moving | Blue crystal | Oscillates horizontally |
| Crumbling | Brown | Breaks after landing (0.4s delay) |
| Spike | Red | Damages the player on contact |
| Spring | Green | Launches the player extra high |

### Enemy Types

| Type | Behavior |
|------|----------|
| Patrol Knight | Walks back and forth on platforms |
| Archer | Stands still, shoots aimed arrows |
| Bat | Flies in sine-wave patterns |
| Bomber | Drops bombs downward at the player |

### Power-Ups

| Pickup | Effect |
|--------|--------|
| Coin | +10 score |
| Heart | +1 HP |
| Double Jump | Extra jump for this run |
| Shield | 5 seconds of invincibility |
| Speed | 4 seconds of 1.6x movement speed |
| Magnet | Attracts nearby pickups |

## Zones (7 Biomes)

Every 15 floors, the visual theme and difficulty shift:

| Zone | Floors | Theme | Difficulty |
|------|--------|-------|-----------|
| Stone Tower | 0-14 | Blue medieval | Baseline |
| Infernal Forge | 15-29 | Volcanic red | 1.2x speed, 1.5x spikes |
| Arcane Spire | 30-44 | Magical purple | 1.4x speed, 1.8x spikes |
| The Void | 45-59 | Dark void | 1.7x speed, 2x spikes |
| Frozen Pinnacle | 60-74 | Icy blue | 2x speed, 2.2x spikes, 2.5x crumble |
| Dragon's Crown | 75-89 | Fiery peak | 2.3x speed, 2.5x spikes |
| The Grail Chamber | 90+ | Golden radiance | 2.6x speed, 3x spikes, 3x crumble |

Each zone changes: sky gradient, tower brick textures, platform tints, enemy speed, platform danger frequency.

## Combo System

- Kill enemies in quick succession (within 2 seconds) to build combos
- Combo multiplier increases score from kills (up to 10x)
- "Nx COMBO!" text pops up with escalating colors (white → yellow → orange → red → pink)
- HUD shows active combo count + timer bar
- Highest combo displayed on death screen

## Boss Fights

- Boss spawns every 25 floors (Floor 25, 50, 75...)
- Boss hovers at top of screen, fires aimed projectiles
- Player damages boss by reaching its height while jumping (stomp-style)
- Boss HP scales: 10 + 2 per floor
- Boss defeat: golden explosion + "BOSS DEFEATED!" banner + 500 score + screen shake
- Arena: Wide platform generated for the fight

## Meta-Progression

Coins collected across ALL runs accumulate and can be spent on permanent upgrades:

| Upgrade | Cost | Effect |
|---------|------|--------|
| Extra HP | 100 coins | +1 starting HP (max 2 purchases) |
| Projectile Attack | 200 coins | Enables X/J key ranged attack |
| Triple Jump | 150 coins | 3 jumps instead of 2 |
| Dash | 250 coins | Enables Shift key dash ability |

Shop available on the death screen. Press 1-4 to purchase.

## Scoring

| Action | Points |
|--------|--------|
| Per floor climbed | 100 |
| Per coin collected | 10 |
| Per enemy killed | 50 |
| Per boss defeated | 500 |

## Persistence

- **High score**: Best score across all runs
- **Best floor**: Highest floor reached
- **Total coins**: Accumulated across all runs (for shop)
- **Unlockables**: Permanently saved to localStorage

## Visual Features

- **Procedural knight**: Articulated limbs, cape, sword, helm with visor
- **4 enemy types**: Each with unique procedural art and animations
- **Rich backgrounds**: Parallax tower bricks, arched windows, animated torches, vines, flags, clouds, mountains
- **Particle effects**: Jump dust, landing impact, coin sparkles, damage flash, screen shake, death explosion, boss victory fireworks
- **Zone theming**: Sky colors, tower textures, and platform tints change per biome

## Technical Architecture

```
ascent/
  types.ts                    — Enums, interfaces (Player, Platform, Enemy, etc.)
  AscentGame.ts               — Main orchestrator (boot, game loop, phase management)
  config/
    AscentBalance.ts          — Physics constants, difficulty tuning, zone definitions
  state/
    AscentState.ts            — State factory, meta persistence (localStorage)
  systems/
    AscentPhysicsSystem.ts    — Gravity, collision, enemy AI, boss behavior
    AscentGeneratorSystem.ts  — Procedural platform/enemy/pickup generation
    AscentInputSystem.ts      — Keyboard input handling + jump/attack consumed keys
  view/
    AscentRenderer.ts         — Full PixiJS renderer (~1800 lines)
```

### Key Patterns
- **Simulation/View separation**: Systems have zero PixiJS imports
- **Per-frame ticker**: Physics at 60fps via viewManager.app.ticker
- **Procedural generation**: Platforms generated row-by-row ahead of camera
- **Camera**: Smooth upward-only tracking (never scrolls down)
- **Meta persistence**: localStorage for unlockables and stats
