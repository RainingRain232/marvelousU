# Grail Derby — Medieval Horse Racing

**Enum**: `GameMode.GRAIL_DERBY`
**Source**: `/derby`
**Framework**: PixiJS 2D + GSAP animations
**Players**: 1 (with 3 AI opponents)

## Overview

A side-scrolling endless horse racing game. Ride your knight's horse through a medieval landscape, dodging obstacles, collecting coins with combo multipliers, jousting rival knights, and racing against 3 AI opponents.

## Controls

| Key | Action |
|-----|--------|
| Up Arrow | Switch to upper lane |
| Down Arrow | Switch to lower lane |
| Shift | Sprint (drains stamina) |
| Space | Start / Restart |
| Escape | Pause / Resume |

## Gameplay

### Lanes
- 3 horizontal lanes (top, middle, bottom)
- Smooth animated lane switching
- Start in the middle lane

### Stamina
- 100 stamina maximum
- Sprinting drains 30/sec, gives 1.4x speed
- Resting regenerates 15/sec
- Empty stamina = forced normal speed

### Obstacles (6 types)

| Type | Effect |
|------|--------|
| Fence | -1 HP on collision |
| Rock | -1 HP on collision |
| Barrel | -1 HP on collision |
| Cart | Wide obstacle, -1 HP |
| Mud Puddle | Slows speed for 1 second |
| Enemy Knight | -1 HP, or destroy with Lance for 100 bonus points |

### Power-Ups (5 types)

| Pickup | Effect |
|--------|--------|
| Coin | +10 score (multiplied by combo) |
| Speed Boost | 3 seconds of 1.6x speed |
| Shield | 5 seconds of invincibility |
| Lance | 4 seconds of jousting ability |
| Magnet | 5 seconds of coin attraction |

### Combo System
- Collecting coins within 2 seconds of each other builds a streak
- Multiplier: 1x + 0.25x per consecutive coin (max 5x at 16+)
- Streak resets after 2 seconds without a coin or on obstacle hit
- Visual: "2.5x" popup on coin collect, multiplier shown in HUD

### AI Opponents
- 3 rival knights: Sir Gareth (red), Sir Kay (green), Sir Bedivere (blue)
- AI varies speed slightly, changes lanes to avoid obstacles
- Rubber-banding keeps them competitive
- AI can crash into obstacles and respawn
- Position radar in HUD shows relative positions

### Distance Milestones
- Every 1,000 meters: golden flash + text celebration + screen shake
- Creates progression milestones during long runs

### Scoring
- Distance: 1 point per 10 meters
- Coins: 10 points × combo multiplier
- Joust kills: 100 points per enemy knight destroyed

### Difficulty Ramp
- Speed and obstacle density increase over time
- Enemy knights appear more frequently at higher difficulty
- Caps at 3x difficulty

### Terrain Zones (5 Biomes)

Every 3,000 meters, the landscape transforms:

| Zone | Distance | Theme | Sky | Ground |
|------|----------|-------|-----|--------|
| Green Meadows | 0-2,999m | Bright pastoral | Blue | Bright green |
| Autumn Forest | 3,000-5,999m | Warm fall | Brown/amber | Golden brown |
| Twilight Moors | 6,000-8,999m | Dusk atmosphere | Dark blue/gray | Dark green |
| Frozen Wastes | 9,000-11,999m | Icy cold | Steel blue | Ice gray |
| Dragon's Pass | 12,000m+ | Volcanic | Dark red/brown | Scorched brown |

Each zone changes: sky gradient, hill colors, tree canopy colors, ground color, track color. Zone name shown in HUD distance counter.

## HUD Elements
- **HP Hearts** (top-left)
- **Position Radar** (below HP) — player and AI dots on a horizontal bar
- **Coin Combo** (below radar) — current multiplier when active
- **Distance** (top-center) — turns gold with "★ NEW BEST" when beating record
- **Score** (top-right)
- **Power-up Timers** (below score)
- **Stamina Bar** (bottom-center)

## Meta-Progression Shop

Coins earned across all races accumulate and can be spent on permanent upgrades. Shop is available on the crash screen — press 1-5 to purchase.

| # | Upgrade | Cost | Effect per Level | Max Levels |
|---|---------|------|-----------------|------------|
| 1 | Extra HP | 30 coins | +1 starting HP | 2 |
| 2 | Stamina Regen+ | 25 coins | +5 stamina regen/sec | 2 |
| 3 | Boost Duration+ | 20 coins | +0.5s speed boost duration | 2 |
| 4 | Magnet Range+ | 20 coins | +30px magnet pull range | 2 |
| 5 | Lucky Horseshoe | 35 coins | 15% more pickup spawns | 2 |

Upgrades persist permanently to localStorage and apply automatically at the start of each race.

## Persistence
- High score, best distance, total coins, total races saved to localStorage
- All upgrade levels persist permanently

## Visual Features
- **Parallax landscape**: sky, clouds, hills, trees, castle silhouettes, green ground
- **3-lane track** with scrolling dashed center lines
- **Procedural horse + knight**: animated gallop legs, tail, mane, helm with plume
- **Lance/Shield/Boost** visual indicators on player
- **Particle effects**: coin sparkle, crash explosion, boost flash, joust sparks, milestone celebration
- **Position radar**: compact race position indicator
- **Combo text popups**: floating multiplier display

## Technical Architecture

```
derby/
  types.ts                     — Enums, interfaces
  DerbyGame.ts                 — Orchestrator (game loop, input, phases)
  config/
    DerbyBalance.ts            — Tuning constants
  state/
    DerbyState.ts              — State factory, meta persistence
  systems/
    DerbyPhysicsSystem.ts      — Scrolling, collision, power-ups, scoring
    DerbyGeneratorSystem.ts    — Procedural obstacle/pickup spawning
    DerbyAISystem.ts           — AI opponent behavior
  view/
    DerbyRenderer.ts           — PixiJS renderer (~1200 lines)
```
