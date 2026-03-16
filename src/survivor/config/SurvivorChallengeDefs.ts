// ---------------------------------------------------------------------------
// Challenge modifier definitions — optional mutators for score multipliers
// ---------------------------------------------------------------------------

export interface SurvivorChallengeDef {
  id: string;
  name: string;
  description: string;
  scoreMultiplier: number; // e.g., 1.5 = +50% score
  color: number;
  // Effect keys — checked by game systems
  effects: ChallengeEffect[];
}

export type ChallengeEffect =
  | { type: "enemies_explode_on_death"; radius: number; damagePct: number }
  | { type: "no_healing" }
  | { type: "double_boss_frequency" }
  | { type: "enemy_speed_multiplier"; multiplier: number }
  | { type: "enemy_hp_multiplier"; multiplier: number }
  | { type: "no_pickups_for_seconds"; duration: number }
  | { type: "player_speed_penalty"; multiplier: number }
  | { type: "enemy_spawn_rate_multiplier"; multiplier: number };

export const CHALLENGE_DEFS: SurvivorChallengeDef[] = [
  {
    id: "volatile_corpses",
    name: "Volatile Corpses",
    description: "Enemies explode on death, damaging the player and other enemies",
    scoreMultiplier: 1.3,
    color: 0xff6600,
    effects: [{ type: "enemies_explode_on_death", radius: 2.5, damagePct: 0.15 }],
  },
  {
    id: "no_healing",
    name: "No Healing",
    description: "All healing is disabled — no regen, no heal chests, no lifesteal",
    scoreMultiplier: 1.5,
    color: 0xff2222,
    effects: [{ type: "no_healing" }],
  },
  {
    id: "boss_rush",
    name: "Boss Rush",
    description: "Bosses spawn twice as often",
    scoreMultiplier: 1.4,
    color: 0xcc44cc,
    effects: [{ type: "double_boss_frequency" }],
  },
  {
    id: "swarm",
    name: "Swarm",
    description: "Enemy spawn rate is doubled, but enemies have 30% less HP",
    scoreMultiplier: 1.25,
    color: 0x44cc44,
    effects: [
      { type: "enemy_spawn_rate_multiplier", multiplier: 2.0 },
      { type: "enemy_hp_multiplier", multiplier: 0.7 },
    ],
  },
  {
    id: "iron_will",
    name: "Iron Will",
    description: "Enemies have +50% HP",
    scoreMultiplier: 1.35,
    color: 0x8888ff,
    effects: [{ type: "enemy_hp_multiplier", multiplier: 1.5 }],
  },
  {
    id: "speed_demons",
    name: "Speed Demons",
    description: "Enemies move 40% faster",
    scoreMultiplier: 1.3,
    color: 0xffaa22,
    effects: [{ type: "enemy_speed_multiplier", multiplier: 1.4 }],
  },
  {
    id: "sluggish",
    name: "Sluggish",
    description: "Player moves 25% slower",
    scoreMultiplier: 1.2,
    color: 0x888888,
    effects: [{ type: "player_speed_penalty", multiplier: 0.75 }],
  },
  {
    id: "nightmare_mode",
    name: "Nightmare Mode",
    description: "All enemies are faster, tougher, and spawn more often — the ultimate test",
    scoreMultiplier: 2.0,
    color: 0xff0000,
    effects: [
      { type: "enemy_speed_multiplier", multiplier: 1.3 },
      { type: "enemy_hp_multiplier", multiplier: 1.5 },
      { type: "enemy_spawn_rate_multiplier", multiplier: 1.5 },
      { type: "no_healing" },
    ],
  },
];
