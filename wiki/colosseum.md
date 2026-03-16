# Colosseum Mode (Arena Tournament)

**Enum**: `GameMode.COLOSSEUM`
**Source**: `/rpg/colosseum` (5 subdirectories: state, systems, config, view, + ColosseumGame.ts)
**Framework**: PixiJS 2D, reuses RPG turn-based battle system
**Players**: 1 vs AI

## Overview

Arena combat tournament mode, structured as a sub-mode of the RPG system. Players build a team from their roster, enter tiered tournaments with an 8-team single-elimination bracket across 3 rounds (quarterfinal, semifinal, final), bet on matches, earn ELO-ranked ratings, and progress through seasonal reward tiers. Reuses the RPG turn-based battle system (`TurnBattleSystem.ts`) for all combat resolution.

## Gameplay Loop

```
MAIN_MENU → SELECT TIER (Bronze/Silver/Gold/Champion Cup)
→ PARTY_SETUP (build team, choose ruleset)
→ TOURNAMENT_BRACKET (view bracket, select next match)
  → PRE_MATCH (place bets, choose Fight/Watch/Auto-resolve)
    → BATTLE_TURN (player fights turn-based)
    → SPECTATE (watch AI vs AI with visual playback)
    → AUTO_RESOLVE (instant AI resolution)
  → POST_MATCH (results, XP, gold, ELO change, bet payout)
→ repeat until eliminated or tournament complete
→ TOURNAMENT_RESULTS → MAIN_MENU
```

## Key Systems

### Tournament System (`TournamentSystem.ts`)
- **8-team bracket**: 1 player team + 7 AI-generated teams
- **3 rounds**: 4 quarterfinals (round 0), 2 semifinals (round 1), 1 final (round 2)
- **Team composition**: AI teams are ~50% melee, ~25% ranged, ~25% mage/healer
- **AI team names**: 24 themed names (Iron Wolves, Shadow Blades, Storm Hawks, etc.)
- **Power level**: Calculated as `sum(maxHp + atk*3 + def*2 + speed)` per member
- **Odds**: Calculated from power level ratios: `total / teamPower`, minimum 1.1x
- **Bracket advancement**: Winners feed into next round slots; odds recalculated when both teams are set
- **AI match resolution**: Full auto-battle simulation (up to 200 turns) using `runColosseumAutoBattle`

### Colosseum Battle System (`ColosseumBattleSystem.ts`)
- Converts `PartyMember` to `TurnBattleCombatant` with full equipment stat computation (ATK, DEF, speed, block, crit)
- Block chance capped at 50%
- Handicap system: weaker team's ATK/DEF/HP multiplied by `ruleset.handicap`
- No fleeing allowed in colosseum (`canFlee = false`)
- Spectator mode: both sides AI-controlled with 500ms tick delay for visual playback
- Auto-resolve: instant simulation with no visual output

### Betting System (`BettingSystem.ts`)
- One bet per match (cannot re-bet)
- Bet on either team before the match starts
- Payout: `betAmount * teamOdds` (floored to integer)
- Predefined bet amounts: 50, 100, 200, 500, 1000 gold
- Bets resolved after match conclusion regardless of player participation

### Gladiator Progression (`GladiatorProgressionSystem.ts`)
- **Arena XP**: Base XP * 1.5x multiplier
- **Loss XP**: 30% of win XP (still gain XP on losses)
- **Level-up**: Same formula as RPG (12% stat growth per level, max level 30)
- **Mastery**: Post-level-30 XP converts to mastery points
- **Arena rank titles**: Novice (0), Fighter (10), Gladiator (25), Veteran (50), Champion (100+ battles)

### Ranked / ELO System (`RankedSystem.ts`)
- **Starting ELO**: 1000
- **K-factor**: 32
- **ELO formula**: Standard chess ELO: `K * (actual - expected)` where `expected = 1 / (1 + 10^((oppElo - playerElo) / 400))`
- **Opponent ELO estimation**: `1000 + avgTeamLevel * 20 + tierIndex * 200`
- **Rank titles**: Unranked (<1200), Bronze (1200+), Silver (1500+), Gold (2000+), Legendary (2500+)
- **Season reset**: Soft reset, ELO moves halfway toward 1000: `(currentElo + 1000) / 2`
- **Season rewards**: Bronze (1200+, 500g), Silver (1500+, 2000g), Gold (2000+, 5000g), Legendary (2500+, 10000g)

### Tournament Tiers (`ColosseumDefs.ts`)
| Tier | Level Range | Entry Fee | XP Reward | Gold Reward | ELO Range |
|------|------------|-----------|-----------|-------------|-----------|
| Bronze Cup | 1-10 | 100 | 200 | 300 | 0-1200 |
| Silver Cup | 8-18 | 250 | 500 | 800 | 1000-1600 |
| Gold Cup | 15-25 | 500 | 1000 | 1500 | 1400-2000 |
| Champion Cup | 22-30 | 1000 | 2000 | 3000 | 1800+ |

Tier availability gated by ELO (must be >= tier's lower ELO bound).

### Ruleset (`ColosseumState.ts`)
- **No items**: Disables ITEM action in battle (`canUseItems = false`)
- **Single unit**: 1v1 instead of team battles
- **Random loadout**: Random equipment assignment
- **Handicap**: Stat multiplier for the weaker team (1.0 = no handicap)
- **Team size**: 1-6 (default 4)

### Persistence (`ColosseumPersistence.ts`)
- localStorage-based save under `marvelousU_colosseum`
- Saves: gold, ELO, season, wins/losses, tournaments won/played, party roster, formation, high scores (top 10 by ELO)
- Default starting state: 500 gold, 1000 ELO, season 1
- ELO submitted to leaderboard on tournament completion via `LeaderboardSystem.submitScore`

### Unit Pools for AI Teams
| Role | Unit Types |
|------|-----------|
| Melee | Knight, Swordsman, Gladiator, Pikeman, Templar |
| Ranged | Archer, Crossbowman, Longbowman |
| Mage | Fire Mage, Storm Mage, Cold Mage |
| Healer | Cleric, Monk |

## Source Files

```
rpg/colosseum/
├── ColosseumGame.ts                Orchestrator (boot, tournament flow, battle, spectator, results)
├── state/
│   ├── ColosseumState.ts           Team, tournament, match, ruleset interfaces + factory
│   └── ColosseumPersistence.ts     localStorage save/load, high scores
├── systems/
│   ├── TournamentSystem.ts         Bracket generation, AI team creation, odds, advancement
│   ├── ColosseumBattleSystem.ts    Battle creation from teams, auto-battle resolution
│   ├── BettingSystem.ts            Bet placement and payout resolution
│   ├── GladiatorProgressionSystem.ts  Arena XP, level-ups, rank titles
│   ├── RankedSystem.ts             ELO calculation, seasons, rank titles
│   └── ColosseumStateMachine.ts    Phase transitions
├── config/
│   └── ColosseumDefs.ts            Tiers, AI team names, unit pools, season rewards, bet amounts
└── view/
    ├── ColosseumMenuView.ts        Main menu (tier selection, rankings)
    ├── PartySetupView.ts           Team building + ruleset configuration
    ├── TournamentBracketView.ts    Visual bracket display
    ├── ColosseumBettingView.ts     Pre-match betting UI
    └── ColosseumRankingsView.ts    ELO rankings and season stats
```

## Incomplete / Stubbed Systems

- **Persistent career tracking**: Season stats (wins/losses) reset between sessions with no career history or match log
- **Spectating system**: Visual spectator mode works but has no commentary, highlights, or replay functionality
- **NPC rivalries**: AI teams are generated fresh each tournament with no persistent rival teams or storylines
- **Team customization**: AI teams have no unique abilities, team synergies, or signature strategies
- **Ruleset variety**: Handicap and random loadout rules exist in the interface but have limited actual gameplay impact
- **Equipment for colosseum**: Uses RPG equipment system but no colosseum-specific gear, rewards, or trophy items

## Improvement Ideas

1. **Persistent career tracking**: Track full match history, win streaks, career stats, and provide a career summary screen with graphs
2. **Ranked ELO with matchmaking**: Instead of fixed tiers, use ELO for proper matchmaking so AI team strength adapts to player skill
3. **NPC rivalries**: Create persistent rival teams that appear across tournaments, remember past outcomes, and have escalating difficulty + dialogue
4. **Spectating enhancements**: Add match commentary, action highlights, slow-motion for critical hits, and full replay with scrubbing
5. **Tournament variety**: Add round-robin format, double elimination, handicap matches, and king-of-the-hill modes
6. **Colosseum-specific rewards**: Unique equipment, titles, cosmetics, and trophy items only obtainable through arena play
7. **Team synergy system**: Give teams passive bonuses for specific unit type combinations (e.g., 3 melee = +10% ATK, mixed team = +5% all stats)
8. **Inter-mode integration**: Allow importing party from RPG mode into colosseum and vice versa; colosseum wins grant RPG gold/items
9. **Seasonal leaderboards**: Public leaderboard with season archives, rank decay for inactive players, and end-of-season rewards ceremony
10. **Challenge modifiers**: Weekly rotating challenge rules (e.g., "no healing", "double speed", "fog of war in battle") for bonus rewards
