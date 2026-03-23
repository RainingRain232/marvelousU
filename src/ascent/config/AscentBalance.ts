// Camelot Ascent – Balance Configuration

export const ASCENT_BALANCE = {
  // World
  WORLD_WIDTH: 800,
  PLATFORM_SPACING_Y: 70,      // vertical gap between platform rows
  PLATFORM_MIN_WIDTH: 60,
  PLATFORM_MAX_WIDTH: 140,
  PLATFORMS_PER_ROW: 3,         // avg platforms generated per row
  GENERATION_BUFFER: 600,       // generate platforms this far above camera
  DESPAWN_BUFFER: 400,          // remove platforms this far below camera

  // Player
  PLAYER_WIDTH: 20,
  PLAYER_HEIGHT: 28,
  MOVE_SPEED: 220,              // pixels per second
  JUMP_VELOCITY: -420,          // initial jump vy (negative = up)
  GRAVITY: 900,                 // pixels per second^2
  MAX_FALL_SPEED: 600,
  MAX_JUMPS: 2,                 // double jump
  STARTING_HP: 3,
  INVINCIBLE_DURATION: 1.5,     // seconds after taking damage

  // Enemies
  PATROL_SPEED: 60,
  ARCHER_SHOOT_INTERVAL: 2.5,   // seconds
  ARROW_SPEED: 200,
  BAT_SPEED: 80,
  BAT_AMPLITUDE: 30,
  BOMBER_DROP_INTERVAL: 3,
  BOMB_FALL_SPEED: 150,
  ENEMY_SPAWN_CHANCE: 0.15,     // per platform row
  ENEMY_SPAWN_FLOOR_SCALE: 0.003, // chance increases per floor

  // Pickups
  PICKUP_SPAWN_CHANCE: 0.12,
  COIN_VALUE: 10,
  HEART_HEAL: 1,
  SHIELD_DURATION: 5,
  SPEED_BOOST_DURATION: 4,
  SPEED_BOOST_MULT: 1.6,

  // Platforms
  MOVING_CHANCE: 0.12,
  CRUMBLING_CHANCE: 0.08,
  SPIKE_CHANCE: 0.05,
  SPRING_CHANCE: 0.06,
  SPRING_BOOST: -650,           // stronger jump
  CRUMBLE_DELAY: 0.4,           // seconds before falling
  MOVING_SPEED: 40,
  MOVING_RANGE: 60,

  // Boss
  BOSS_FLOOR_INTERVAL: 25,
  BOSS_HP_BASE: 10,
  BOSS_HP_PER_FLOOR: 2,

  // Scoring
  SCORE_PER_FLOOR: 100,
  SCORE_PER_COIN: 10,
  SCORE_PER_ENEMY_KILL: 50,
  SCORE_PER_BOSS_KILL: 500,

  // Difficulty scaling
  FLOOR_SPEED_SCALE: 0.001,     // enemies get faster per floor

  // ── Zones (visual + difficulty themes) ──
  ZONE_FLOORS: 15,              // floors per zone
  ZONES: [
    { // Zone 0: Stone Tower (floors 0-14)
      name: "Stone Tower",
      skyTop: [20, 30, 70],     // RGB
      skyBot: [40, 50, 100],
      towerColor: 0x2a2a3a,
      towerHighlight: 0x3a3a4a,
      platformTint: 0x888888,
      enemySpeedMult: 1.0,
      spikeMult: 1.0,
      crumbleMult: 1.0,
    },
    { // Zone 1: Infernal Forge (floors 15-29)
      name: "Infernal Forge",
      skyTop: [50, 15, 10],
      skyBot: [90, 30, 15],
      towerColor: 0x3a2222,
      towerHighlight: 0x4a2a2a,
      platformTint: 0x998866,
      enemySpeedMult: 1.2,
      spikeMult: 1.5,
      crumbleMult: 1.3,
    },
    { // Zone 2: Arcane Spire (floors 30-44)
      name: "Arcane Spire",
      skyTop: [30, 10, 50],
      skyBot: [50, 20, 80],
      towerColor: 0x2a2244,
      towerHighlight: 0x3a3355,
      platformTint: 0x8888aa,
      enemySpeedMult: 1.4,
      spikeMult: 1.8,
      crumbleMult: 1.5,
    },
    { // Zone 3: The Void (floors 45-59)
      name: "The Void",
      skyTop: [10, 5, 15],
      skyBot: [25, 10, 30],
      towerColor: 0x1a1a22,
      towerHighlight: 0x222233,
      platformTint: 0x666677,
      enemySpeedMult: 1.7,
      spikeMult: 2.0,
      crumbleMult: 2.0,
    },
    { // Zone 4: Frozen Pinnacle (floors 60-74)
      name: "Frozen Pinnacle",
      skyTop: [40, 55, 70],
      skyBot: [70, 85, 100],
      towerColor: 0x2a3a4a,
      towerHighlight: 0x3a4a5a,
      platformTint: 0x88aacc,
      enemySpeedMult: 2.0,
      spikeMult: 2.2,
      crumbleMult: 2.5,
    },
    { // Zone 5: Dragon's Crown (floors 75-89)
      name: "Dragon's Crown",
      skyTop: [60, 20, 10],
      skyBot: [100, 40, 15],
      towerColor: 0x4a2a1a,
      towerHighlight: 0x5a3a2a,
      platformTint: 0xaa8866,
      enemySpeedMult: 2.3,
      spikeMult: 2.5,
      crumbleMult: 2.5,
    },
    { // Zone 6: The Grail Chamber (floors 90+)
      name: "The Grail Chamber",
      skyTop: [50, 40, 15],
      skyBot: [80, 65, 25],
      towerColor: 0x3a3a1a,
      towerHighlight: 0x4a4a2a,
      platformTint: 0xaaaa66,
      enemySpeedMult: 2.6,
      spikeMult: 3.0,
      crumbleMult: 3.0,
    },
  ],
} as const;
