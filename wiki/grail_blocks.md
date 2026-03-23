# Grail Blocks — Medieval Falling-Block Puzzle

**Enum**: `GameMode.GRAIL_BLOCKS`
**Source**: `/grailblocks`
**Framework**: PixiJS 2D + GSAP animations
**Players**: 1

## Overview

A Tetris-style falling-block puzzle game themed around building the walls of Camelot. Stack stone blocks, clear lines, and charge the Grail Power meter. Features T-spin detection, back-to-back bonuses, combo scoring, and a 7-piece bag randomizer.

## Controls

| Key | Action |
|-----|--------|
| Left/Right Arrow | Move piece |
| Up Arrow | Rotate clockwise |
| Z | Rotate counter-clockwise |
| Down Arrow | Soft drop (1 point per cell) |
| Space | Hard drop (2 points per cell) |
| C | Hold piece (swap with held, once per drop) |
| G | Activate Grail Power (when meter full) |
| M | Toggle Marathon/Sprint mode (on start screen) |
| Escape | Pause / Resume |

## Gameplay

### Grid
- 10 columns x 20 rows
- Beveled 3D stone blocks with medieval castle aesthetic

### Pieces (7 Tetrominoes)
- **I** (cyan), **O** (yellow), **T** (purple), **S** (green), **Z** (red), **L** (orange), **J** (blue)
- 7-piece bag randomizer ensures fair piece distribution
- 3-piece next preview queue
- Hold piece system (press C)
- Ghost piece shows drop position

### Scoring

| Action | Points |
|--------|--------|
| Single (1 line) | 100 x level |
| Double (2 lines) | 300 x level |
| Triple (3 lines) | 500 x level |
| Tetris (4 lines) | 800 x level |
| T-Spin bonus | 1.5x line score |
| Back-to-Back | 1.5x multiplier for consecutive T-spins/Tetrises |
| Combo | +50 per consecutive clear |
| Soft drop | 1 per cell |
| Hard drop | 2 per cell |
| Perfect Clear | 10,000 x level (entire grid emptied) |

### T-Spin Detection
- Rotating a T-piece into a tight space where 3+ diagonal corners are occupied
- Awards 1.5x score bonus on any line clear
- Displayed as "T-SPIN SINGLE!", "T-SPIN DOUBLE!", etc.

### Back-to-Back
- Consecutive "difficult" clears (T-spins or Tetrises) earn 1.5x multiplier
- Displayed as "B2B TETRIS!", "B2B T-SPIN TRIPLE!", etc.

### Grail Power
- Meter charges 25% per line cleared
- When full (100%), press G to clear the bottom 2 rows
- Golden flash effect on activation

### Levels
- Every 10 lines cleared increases the level
- Pieces fall faster at higher levels
- Level-up celebration: golden flash + "LEVEL N!" popup

### Danger Zone
- When blocks reach the top 4 rows, a pulsing red warning overlay appears
- Red border pulses at top of grid

### Garbage Lines (Marathon Mode)
- Starting at level 5, garbage lines periodically push up from below
- Each garbage line is a full row with one random gap (gray blocks)
- Base interval: 30 seconds, decreasing by 2s per level (minimum 10s)
- Clearing garbage lines awards 50 bonus points per garbage line × level
- "GARBAGE!" warning text appears when lines push up
- Sprint mode has no garbage

### Game Modes
- **Marathon**: Endless play with increasing speed and garbage lines. Survive as long as possible.
- **Sprint**: Clear 40 lines as fast as possible. No garbage. Time displayed on death screen.
- Press M on the start screen to toggle modes.

### Rotation System
- **Up Arrow**: Clockwise rotation with wall kicks
- **Z Key**: Counter-clockwise rotation with wall kicks
- **Ctrl+A**: 180-degree rotation
- All rotations support T-spin detection

## Visual Features

- **Medieval stone grid** with wood-frame borders
- **Beveled 3D blocks** with highlight/shadow edges
- **Ghost piece** (translucent drop preview)
- **Side panels**: Hold piece (left), Next queue + HUD (right)
- **Line clear flash** animation
- **Clear text popups**: SINGLE, DOUBLE, TRIPLE, TETRIS, T-SPIN, B2B, PERFECT CLEAR
- **Lock particles**: Dust burst when pieces land
- **Level-up celebration**: Golden flash + text popup
- **Sparkle particles** on big clears
- **Grail Power golden flash** on activation

## Persistence

- High score saved to localStorage
- Best level, total lines, games played tracked

## Technical Architecture

```
grailblocks/
  types.ts                     — Enums, interfaces (GBState, ActivePiece, etc.)
  GrailBlocksGame.ts           — Orchestrator (game loop, DAS input, phase management)
  config/
    GBBalance.ts               — Grid dimensions, scoring, speed curves, piece matrices
  state/
    GBState.ts                 — State factory, 7-bag randomizer, meta persistence
  systems/
    GBPieceSystem.ts           — Collision, rotation with wall kicks, T-spin detection,
                                  line clearing, scoring, perfect clear, hold, Grail Power
  view/
    GBRenderer.ts              — Full PixiJS renderer with medieval styling
```
