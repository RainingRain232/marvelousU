// ---------------------------------------------------------------------------
// The Shifting Labyrinth – Balance Configuration
// ---------------------------------------------------------------------------

export const LABYRINTH_BALANCE = {
  // ── Maze ──
  CELL_SIZE: 60,
  MAZE_BASE_W: 15,
  MAZE_BASE_H: 15,
  MAZE_GROW_PER_FLOOR: 2,
  MAZE_MAX_SIZE: 35,
  EXTRA_PASSAGES: 3,            // extra loops carved per floor (reduces dead-ends)
  EXTRA_PASSAGES_PER_FLOOR: 1,

  // ── Wall shifting ──
  SHIFT_INTERVAL: 18,
  SHIFT_WARNING_TIME: 3,
  SHIFT_FRACTION: 0.12,
  SHIFT_ANIM_DURATION: 0.6,    // visual rumble duration
  SHIFT_INTERVAL_DECAY: 0.5,
  SHIFT_MIN_INTERVAL: 8,

  // ── Player ──
  PLAYER_RADIUS: 8,
  PLAYER_SPEED: 120,
  SPRINT_SPEED_MULT: 1.5,       // sprint = 1.5x speed
  SNEAK_SPEED_MULT: 0.45,       // sneak = 0.45x speed
  SPRINT_HEARING_MULT: 2.2,     // minotaurs hear sprinting from 2.2x further
  SNEAK_HEARING_MULT: 0.25,     // sneaking nearly silent
  SPRINT_FUEL_MULT: 1.5,        // torch burns 1.5x faster when sprinting
  SPEED_BOOST_MULT: 1.6,
  SPEED_BOOST_DURATION: 4,
  INVIS_DURATION: 5,
  STARTING_HP: 3,
  INVINCIBLE_DURATION: 1.5,
  FOOTSTEP_INTERVAL: 0.35,

  // ── Stone throw ──
  STONE_THROW_SPEED: 300,       // pixels/sec
  STONE_STUN_DURATION: 3.5,     // seconds minotaur is stunned
  STONE_LIFETIME: 1.0,          // seconds in flight
  STONE_PICKUPS_PER_FLOOR: 1,
  SHOP_STONE_THROW_COST: 350,

  // ── Torch ──
  TORCH_MAX_FUEL: 0.85,          // start below max — fuel matters from floor 1
  TORCH_BURN_RATE: 0.014,        // slightly faster burn
  TORCH_MIN_RADIUS: 30,
  TORCH_MAX_RADIUS: 180,
  TORCH_FLICKER_AMP: 4,
  TORCH_FUEL_RESTORE: 0.25,
  TORCH_BURN_RATE_INCREASE: 0.001,
  TORCH_SPARK_INTERVAL: 0.15,  // seconds between spark particles

  // ── Minotaur ──
  MINOTAUR_RADIUS: 12,
  MINOTAUR_BASE_SPEED: 55,
  MINOTAUR_DARK_SPEED_MULT: 1.8,
  MINOTAUR_SPEED_PER_FLOOR: 3,
  MINOTAUR_REPATH_INTERVAL: 0.8,
  MINOTAUR_STUN_ON_SHIFT: 2.0,
  MINOTAUR_DETECTION_RADIUS: 200,
  MINOTAUR_HEARING_RADIUS: 300,  // can hear running player from further
  MINOTAUR_PATROL_SPEED: 35,
  MINOTAUR_ROAR_COOLDOWN: 8,
  MINOTAUR_BREATH_INTERVAL: 1.2, // snort particle interval
  SECOND_MINOTAUR_FLOOR: 5,      // floor when second minotaur spawns
  THIRD_MINOTAUR_FLOOR: 10,

  // ── Traps ──
  TRAP_START_FLOOR: 1,           // traps from floor 1 (1 spike to teach avoidance)
  SPIKE_CYCLE_TIME: 3.0,        // seconds for full up/down cycle
  SPIKE_ACTIVE_TIME: 1.0,       // seconds spikes are up
  SPIKE_DAMAGE: 1,
  ARROW_FIRE_INTERVAL: 4.0,
  ARROW_SPEED: 250,
  ARROW_DAMAGE: 1,
  GAS_CYCLE_TIME: 5.0,
  GAS_ACTIVE_TIME: 2.5,
  GAS_SPEED_MULT: 0.5,
  GAS_BURN_MULT: 3.0,           // torch burns 3x faster in gas
  TRAPS_BASE: 2,
  TRAPS_PER_FLOOR: 1,
  TRAPS_MAX: 12,

  // ── Pickups ──
  RUNES_BASE: 3,
  RUNES_PER_FLOOR: 1,
  RUNES_MAX: 8,
  FUEL_PICKUPS_BASE: 4,
  FUEL_PICKUPS_PER_FLOOR: 1,
  SPECIAL_PICKUP_CHANCE: 0.25,
  DECOY_PICKUP_CHANCE: 0.15,  // chance a special pickup is a decoy
  TREASURE_PER_FLOOR: 1,      // treasure chests per floor
  TREASURE_COINS: 30,         // coins per treasure chest

  // ── Decoy ──
  DECOY_LIFETIME: 6,          // seconds a thrown decoy lasts
  DECOY_LURE_RADIUS: 250,     // pixels — minotaur attraction range
  DECOY_THROW_DIST: 80,       // pixels — how far decoy is thrown

  // ── Alcoves ──
  ALCOVE_COUNT_BASE: 1,
  ALCOVE_COUNT_PER_FLOOR: 0.5, // +1 every 2 floors
  ALCOVE_MAX: 4,

  // ── Scoring ──
  SCORE_PER_RUNE: 200,
  SCORE_PER_FLOOR: 500,
  SCORE_TIME_BONUS_MAX: 1000,
  SCORE_TIME_BONUS_WINDOW: 60,

  // ── Particles ──
  PARTICLE_MAX: 120,
  FOOTPRINT_MAX: 60,
  FOOTPRINT_LIFETIME: 20,       // seconds before fading

  // ── Screen shake ──
  SHAKE_WALL_SHIFT: 6,          // intensity
  SHAKE_ROAR: 4,
  SHAKE_DAMAGE: 3,
  SHAKE_DEATH: 10,

  // ── Minimap ──
  MINIMAP_SIZE: 210,             // pixels
  MINIMAP_MARGIN: 10,
  MINIMAP_ALPHA: 0.7,

  // ── Explored area ──
  EXPLORED_DIM_ALPHA: 0.6,      // fog alpha over explored but not lit cells

  // ── Shop (meta-progression) ──
  SHOP_EXTRA_FUEL_COST: 150,
  SHOP_FASTER_SPEED_COST: 200,
  SHOP_MINO_SLOW_COST: 300,
  SHOP_EXTRA_HP_COST: 250,
  SHOP_COMPASS_COST: 400,

  // ── Heat Pacts (challenge modifiers for bonus rewards) ──
  HEAT_UNLOCK_FLOORS: 3,        // must clear 3 floors total to unlock heat
  HEAT_PACTS: [
    { id: "hard_shift",  name: "Restless Walls",   desc: "Shifts 40% faster",        maxTier: 3, coinBonus: 8 },
    { id: "fast_mino",   name: "Swift Beast",      desc: "Minotaurs +15% speed",      maxTier: 3, coinBonus: 10 },
    { id: "dim_torch",   name: "Fading Light",     desc: "Torch burns 25% faster",    maxTier: 3, coinBonus: 8 },
    { id: "extra_mino",  name: "The Horde",        desc: "+1 minotaur",               maxTier: 2, coinBonus: 15 },
    { id: "no_alcove",   name: "No Sanctuary",     desc: "Alcoves don't spawn",       maxTier: 1, coinBonus: 12 },
    { id: "fragile",     name: "Glass Armor",      desc: "-1 max HP",                 maxTier: 2, coinBonus: 10 },
  ],

  // ── Visual zones ──
  ZONES: [
    { name: "Catacombs",
      wallColor: 0x3a3a4a, wallHighlight: 0x4a4a5a, wallShadow: 0x2a2a3a,
      floorColor: 0x1a1a22, floorAccent: 0x222230,
      fogColor: 0x0a0a12, torchTint: 0xffaa44,
      brickW: 20, brickH: 10 },
    { name: "Fungal Depths",
      wallColor: 0x2a3a2a, wallHighlight: 0x3a4a3a, wallShadow: 0x1a2a1a,
      floorColor: 0x141a14, floorAccent: 0x1a221a,
      fogColor: 0x080e08, torchTint: 0x88ff88,
      brickW: 18, brickH: 12 },
    { name: "Frozen Tombs",
      wallColor: 0x3a4a5a, wallHighlight: 0x4a5a6a, wallShadow: 0x2a3a4a,
      floorColor: 0x1a2a3a, floorAccent: 0x223344,
      fogColor: 0x0a1420, torchTint: 0x88ccff,
      brickW: 22, brickH: 11 },
    { name: "Infernal Pit",
      wallColor: 0x4a2a1a, wallHighlight: 0x5a3a2a, wallShadow: 0x3a1a0a,
      floorColor: 0x2a1410, floorAccent: 0x331a14,
      fogColor: 0x140a05, torchTint: 0xff6622,
      brickW: 20, brickH: 10 },
    { name: "The Abyss",
      wallColor: 0x1a1a1a, wallHighlight: 0x2a2a2a, wallShadow: 0x0a0a0a,
      floorColor: 0x0a0a0a, floorAccent: 0x111114,
      fogColor: 0x000000, torchTint: 0xcc88ff,
      brickW: 16, brickH: 8 },
  ],
  ZONE_FLOORS: 3,
} as const;
