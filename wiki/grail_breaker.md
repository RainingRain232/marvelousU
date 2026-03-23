# Grail Breaker — Medieval Brick-Breaker

**Enum**: `GameMode.GRAIL_BREAKER`
**Source**: `/breaker`
**Framework**: PixiJS 2D + GSAP animations
**Players**: 1

## Overview

A classic Arkanoid/Breakout-style brick-breaker with medieval theming. Bounce a flaming orb off your knight's shield to smash through castle wall bricks. Collect power-ups, build combos, and conquer 10 levels to claim the Grail.

## Controls

| Key | Action |
|-----|--------|
| Left/Right Arrow (or Mouse) | Move paddle |
| Space | Launch ball / Start / Restart |
| Escape | Pause / Resume |

## Gameplay

### Paddle
- Knight's shield at the bottom of the field
- Ball angle varies -60° to +60° based on where it hits the paddle
- Launch angle preview shown when ball is sitting on paddle

### Ball
- Bounces off walls, paddle, and bricks
- Speed gradually increases with each brick hit (+10 speed per hit)
- Lost when it falls below the paddle

### Brick Types (5)

| Type | HP | Color | Score | Special |
|------|----|-------|-------|---------|
| Normal | 1 | Orange/brown | 10 | — |
| Strong | 2 | Gray | 25 | Shows cracks when damaged |
| Metal | 3 | Silver | 50 | Shows cracks when damaged |
| Gold | ∞ | Gold (shimmer) | — | Indestructible obstacle |
| Explosive | 1 | Red | 30 | Destroys all 8 adjacent bricks |

### Power-Ups (6)

| Type | Icon | Duration | Effect |
|------|------|----------|--------|
| Wide Paddle | W | 10s | Paddle width increases to 120px |
| Multi-Ball | M | Instant | Spawns 2 extra balls |
| Fireball | F | Until paddle touch | Ball passes through bricks without bouncing |
| Slow Motion | S | 5s | Ball speed halved |
| Extra Life | + | Instant | +1 life |
| Laser | L | 8s | Paddle fires vertical laser beams |

### Combo System
- Each brick destroyed without the ball touching the paddle increments the combo
- Combo resets when ball bounces off paddle
- Score multiplier:
  - 1-2 hits: 1x
  - 3-5 hits: 2x
  - 6-9 hits: 3x
  - 10+ hits: 4x
- Combo counter displayed in HUD during active streaks
- Best combo shown on game over screen

### Levels (10)
Each level has a unique brick pattern with increasing difficulty:
1. Full Grid
2. Checkerboard
3. Diamond
4. Pyramid
5. Fortress
6. Stripes
7. Cross
8. Border
9. Scatter (with Gold obstacles)
10. Grand Finale

Higher levels introduce more Strong, Metal, Explosive, and Gold bricks.

## HUD
- **Score** (top-right)
- **Lives** (top-left, shield icons)
- **Level** (top-center)
- **High Score** (below score)
- **Combo counter** (bottom-center, when active)
- **Launch preview** (dotted line + spread cone when ball on paddle)

## Persistence
- High score, best level, total bricks destroyed, games played saved to localStorage

## Technical Architecture

```
breaker/
  types.ts                      — Enums, interfaces
  BreakerGame.ts                — Orchestrator (game loop, input, phases)
  config/
    BreakerBalance.ts           — Field dimensions, physics, scoring
  state/
    BreakerState.ts             — State factory, 10 level patterns, meta persistence
  systems/
    BreakerPhysicsSystem.ts     — Ball/paddle/brick collision, power-ups, combos
  view/
    BreakerRenderer.ts          — PixiJS renderer with medieval styling
```
