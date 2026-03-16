# Grail Ball Mode (Fantasy Team Sport)

**Enum**: `GameMode.GRAIL_BALL`
**Source**: `/grailball` (6 files)
**Framework**: Three.js 3D
**Players**: 1 human (controls one team) vs 1 AI team

## Overview

A 3D fantasy medieval team ball sport where two teams of 7 players compete to hurl an enchanted Grail Orb through the opponent's mystical Gate. Combines rugby-style carrying and tackling with magical class abilities, power-ups, and a hovering Merlin referee. Features full match structure with halves, halftime, overtime, and post-game statistics.

## Gameplay Loop

```
TEAM SELECT → pick your team and opponent from 8 themed teams
→ PRE_GAME (3s countdown)
→ KICKOFF (2s delay, orb at center)
→ PLAYING (5-minute half)
  - Carry, pass, lob, or shoot the Grail Orb
  - Tackle opponents, use class abilities
  - Collect power-ups (speed, strength, magic surge)
→ GOAL_SCORED (4s celebration, slow-mo, camera shake)
→ HALFTIME (5s break, sides switch)
→ Second half (5 minutes)
→ FULL_MATCH or OVERTIME (2-minute sudden death if tied)
→ POST_GAME (final stats)
```

## Key Systems

### Player Classes (4 classes, 7 per team)

| Class | Count | Speed | Tackle | Throw | Stamina | Ability |
|-------|-------|-------|--------|-------|---------|---------|
| Gatekeeper | 1 | 6 | 9 | 14 | 120 | Fortress Wall (3s barrier) |
| Knight | 2 | 8 | 10 | 12 | 100 | Shield Charge (knockback + steal) |
| Rogue | 2 | 11 | 5 | 10 | 90 | Shadow Step (short teleport) |
| Mage | 2 | 7.5 | 3 | 16 | 80 | Arcane Blast (super shot + stun) |

Each class has distinct stats for stamina, stamina regen, sprint multiplier, catch radius, and collision size.

### Teams (8 themed teams)

| Team | Style | Speed | Tackle | Magic |
|------|-------|-------|--------|-------|
| Camelot Lions | Balanced | 1.0x | 1.0x | 1.0x |
| Avalon Mystics | Magic-heavy | 0.95x | 0.85x | 1.25x |
| Saxon Wolves | Aggressive | 1.05x | 1.2x | 0.8x |
| Orkney Ravens | Speed | 1.15x | 0.9x | 1.05x |
| Cornwall Griffins | Defensive | 0.95x | 1.1x | 0.95x |
| Northumbria Bears | Defensive | 0.9x | 1.25x | 0.85x |
| Wessex Eagles | Balanced | 1.05x | 1.0x | 1.0x |
| Lothian Stags | Speed | 1.1x | 0.95x | 1.0x |

Team modifiers apply to all player stats, affecting speed, tackle power, and mage throw power.

### Ball (Grail Orb) Physics
- Friction: 0.98 per frame, bounce: 0.6 off surfaces
- Pass speed: 28, shot speed: 35, lob speed: 20 (at 0.7 rad angle)
- Auto-pickup range: 1.2u, steal range: 1.8u, tackle range: 2.5u
- Carry-in goals count (running orb through gate)
- Throw charge: hold up to 1.5s for max power
- Trail effect tracking recent positions, golden glow aura

### Stamina System
- All classes have stamina that drains during sprinting, tackling, and abilities
- Each ability has a specific stamina cost (20-30)
- Regenerates per second (5-7 depending on class)
- Running out of stamina significantly slows the player

### AI System (`GrailBallAI.ts`)
6 AI roles assigned dynamically based on game state:

| Role | Behavior |
|------|----------|
| **chase_orb** | Closest non-GK player pursues free orb or carrier |
| **defend** | Knights position between orb and own gate |
| **attack** | Move toward opponent goal, get open for passes |
| **support** | Knights follow carrier with offset positioning |
| **mark** | Rogues shadow specific opponents |
| **return** | Fall back to formation position |

AI features:
- Line-of-sight pass evaluation (checks for blocking opponents)
- Shot decision based on distance to goal and gatekeeper positioning
- Gatekeeper stays between orb and gate center, clamped to gate width
- Formation shifts based on orb position (press/drop-back)
- Role-specific ability usage (Rogues shadow step to close gaps, Knights charge through defenders, Mages use arcane blast near goal)

### Match Structure
- 2 halves of 5 minutes each
- Halftime break (5s) with team side switch
- Goal celebration: 4s with camera shake and slow-motion
- Overtime: 2-minute sudden death if tied at full time
- Kickoff delay: 2s before play resumes

### Power-Ups
- 3 types: Speed Boost (blue), Strength (red), Magic Surge (purple)
- Spawn every 25s at 6 fixed field positions
- Last 8s when picked up
- Bobbing animation with glow effect

### Fouls & Referee
- Merlin hovers above the field as referee
- Foul types: excessive force, illegal magic, holding, delay of game
- Fouled player gets a free throw from foul spot
- Penalty time: 3s sit-out after foul
- Merlin has speech bubble for announcements

### Match Statistics
Tracked per team: possession time, shots, saves, tackles, fouls

### Controls
- Arrow Keys/WASD: Move
- Space: Pass (tap) / Shoot (hold toward gate)
- Shift: Tackle / Special ability
- Tab: Switch selected player
- E: Lob pass
- Q: Call for pass

## Source Files

```
grailball/
├── GrailBallConfig.ts    GBPlayerClass, GBMatchPhase, GBPowerUpType, GBFoulType,
│                         GB_ABILITIES, GB_CLASS_STATS, GB_TEAMS, GB_FORMATION,
│                         GB_FIELD, GB_PHYSICS, GB_MATCH, GB_RULES_TEXT
├── GrailBallState.ts     GBMatchState, GBPlayer, GBOrb, GBPowerUp, GBMatchEvent,
│                         createMatchState, resetPositionsForKickoff, Vec3 helpers
├── GrailBallAI.ts        AIDecision, assignAIRoles, decideAI (6 role-specific behaviors)
├── GrailBallGame.ts      Main orchestrator: boot, team select, match lifecycle,
│                         physics, input handling, rendering, HUD
├── GrailBallRenderer.ts  Three.js 3D rendering (field, players, orb, effects)
└── GrailBallHUD.ts       UI overlays (scoreboard, minimap, events, controls/rules)
```

## Incomplete / Stubbed Systems

- **Foul system**: Foul types are defined but enforcement logic and free-throw mechanics may be minimal
- **Formation tactics**: Static 1-2-2-2 formation for all teams; no in-match tactical adjustment by the player
- **Player switching**: Tab switches player but the AI handoff/takeover is likely basic
- **Match replays**: No replay or highlight system
- **Lob pass**: Defined mechanically but AI rarely uses it except at long distances
- **Merlin referee**: Has position and speech fields but likely just cosmetic floating presence

## Improvement Ideas

1. **Ball physics depth**: Add spin on throws affecting curve, weather effects on orb trajectory, bouncing off player bodies
2. **Tactical formations**: Let player choose from multiple formations (2-3-1, 1-2-3, 3-2-1) and adjust mid-match
3. **Match phases**: Add injury time, penalty shootouts for cup matches, yellow/red card system with suspensions
4. **Replay system**: Goal replays from multiple angles, post-match highlight reel
5. **Career mode**: Season of matches with league tables, cup tournaments, player progression
6. **Stamina management**: Deeper stamina model with fatigue over the match, substitution system
7. **Weather effects**: Rain makes the orb slippery (lower catch radius), fog reduces vision, snow slows movement
8. **Crowd and atmosphere**: Dynamic crowd noise reacting to goals, near-misses, and fouls
9. **Multiplayer**: Local split-screen or online multiplayer support
10. **Player development**: Individual player stats that grow over a career mode, training between matches
