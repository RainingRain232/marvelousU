// Grail Derby – Balance Configuration

export const DERBY_BALANCE = {
  // Screen
  SCREEN_W: 800,
  SCREEN_H: 600,
  LANE_COUNT: 3,
  LANE_Y_START: 320,    // Y position of top lane
  LANE_SPACING: 80,     // pixels between lane centers
  GROUND_Y: 520,        // ground line

  // Player
  BASE_SPEED: 250,       // pixels per second
  MAX_SPEED: 500,
  SPRINT_SPEED_MULT: 1.4,
  STAMINA_MAX: 100,
  STAMINA_DRAIN: 30,     // per second while sprinting
  STAMINA_REGEN: 15,     // per second while not sprinting
  LANE_SWITCH_SPEED: 8,  // lerp speed for smooth lane change
  STARTING_HP: 3,
  INVINCIBLE_DURATION: 1.5,

  // Obstacles
  OBSTACLE_SPAWN_INTERVAL: 0.8, // seconds base
  OBSTACLE_MIN_INTERVAL: 0.3,
  OBSTACLE_SPEED_SCALE: 0.001,  // speed increases per distance
  MUD_SLOW_FACTOR: 0.5,
  MUD_DURATION: 1.0,

  // Pickups
  PICKUP_SPAWN_INTERVAL: 2.0,
  COIN_VALUE: 10,
  BOOST_DURATION: 3,
  BOOST_SPEED_MULT: 1.6,
  SHIELD_DURATION: 5,
  LANCE_DURATION: 4,
  MAGNET_DURATION: 5,
  MAGNET_RANGE: 150,

  // AI Riders
  AI_COUNT: 3,
  AI_SPEED_VARIANCE: 0.15,  // ± percentage of player speed
  AI_LANE_CHANGE_INTERVAL: 3, // seconds between AI lane changes

  // Scoring
  SCORE_PER_DISTANCE: 1,    // per 10 pixels
  SCORE_PER_COIN: 10,
  SCORE_PER_JOUST: 100,     // jousting an enemy knight

  // Difficulty
  DIFFICULTY_RAMP: 0.01,    // per second
  MAX_DIFFICULTY: 3.0,

  // Visual
  HORSE_WIDTH: 60,
  HORSE_HEIGHT: 40,

  // Visual zones (terrain themes by distance)
  ZONE_DISTANCE: 3000,  // distance units per zone transition
  ZONES: [
    { // Zone 0: Green Meadows (0-2999)
      name: "Green Meadows",
      skyTop: 0x5588cc, skyBot: 0x99ccee,
      ground: 0x4a8c3f, track: 0x8b7355,
      treeColor: 0x2d8a4e, hillColor: 0x5a9a5f,
    },
    { // Zone 1: Autumn Forest (3000-5999)
      name: "Autumn Forest",
      skyTop: 0x886644, skyBot: 0xccaa77,
      ground: 0x8a7a3f, track: 0x7a6545,
      treeColor: 0xcc6622, hillColor: 0x8a7a4a,
    },
    { // Zone 2: Twilight Moors (6000-8999)
      name: "Twilight Moors",
      skyTop: 0x334466, skyBot: 0x667788,
      ground: 0x3a5a3f, track: 0x6a5a45,
      treeColor: 0x2a4a3e, hillColor: 0x4a5a5f,
    },
    { // Zone 3: Frozen Wastes (9000-11999)
      name: "Frozen Wastes",
      skyTop: 0x556688, skyBot: 0x99aabb,
      ground: 0x8899aa, track: 0x778899,
      treeColor: 0x667788, hillColor: 0x8899aa,
    },
    { // Zone 4: Dragon's Pass (12000+)
      name: "Dragon's Pass",
      skyTop: 0x442222, skyBot: 0x884433,
      ground: 0x553322, track: 0x664433,
      treeColor: 0x332211, hillColor: 0x553333,
    },
  ],
} as const;
