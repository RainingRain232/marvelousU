// ---------------------------------------------------------------------------
// Survivor weapon and passive item definitions
// ---------------------------------------------------------------------------

export enum SurvivorWeaponId {
  FIREBALL_RING = "fireball_ring",
  ARROW_VOLLEY = "arrow_volley",
  LIGHTNING_CHAIN = "lightning_chain",
  ICE_NOVA = "ice_nova",
  HOLY_CIRCLE = "holy_circle",
  CATAPULT_STRIKE = "catapult_strike",
  SPINNING_BLADE = "spinning_blade",
  WARP_FIELD = "warp_field",
  RUNE_CIRCLE = "rune_circle",
  SOUL_DRAIN = "soul_drain",
}

export enum SurvivorPassiveId {
  PLATE_ARMOR = "plate_armor",
  SWIFT_BOOTS = "swift_boots",
  SPELL_TOME = "spell_tome",
  WAR_DRUM = "war_drum",
  LUCKY_COIN = "lucky_coin",
  MAGNET = "magnet",
  CROWN = "crown",
  CHALICE = "chalice",
}

export enum SurvivorEvolutionId {
  INFERNO_STORM = "inferno_storm",
  ARROW_HURRICANE = "arrow_hurricane",
  THUNDER_GOD = "thunder_god",
  ABSOLUTE_ZERO = "absolute_zero",
  DIVINE_JUDGMENT = "divine_judgment",
  METEOR_BARRAGE = "meteor_barrage",
  DEATH_SPIRAL = "death_spiral",
  VOID_RIFT = "void_rift",
  ARCANE_CATACLYSM = "arcane_cataclysm",
  SOUL_REAPER = "soul_reaper",
}

export interface SurvivorWeaponDef {
  id: SurvivorWeaponId;
  name: string;
  description: string;
  baseDamage: number;
  baseCooldown: number; // seconds between attacks
  baseArea: number; // radius in tiles
  baseCount: number; // number of projectiles/instances
  baseSpeed: number; // projectile speed in tiles/sec
  basePierce: number; // enemies hit before disappearing (0 = infinite)
  baseDuration: number; // lifetime in seconds (for lingering effects)
  color: number; // primary tint
  // Per-level scaling (multiplied by level-1)
  damagePerLevel: number;
  cooldownPerLevel: number; // subtracted from cooldown
  countPerLevel: number;
  areaPerLevel: number;
  // Evolution
  evolutionId?: SurvivorEvolutionId;
  evolutionPassive?: SurvivorPassiveId;
  // Evolution hint — displayed in UI to guide the player
  evolutionHint?: string;
}

export interface SurvivorPassiveDef {
  id: SurvivorPassiveId;
  name: string;
  description: string;
  // Per-level stat bonuses
  hpPerLevel: number;
  speedPerLevel: number; // percentage
  areaPerLevel: number; // percentage
  attackSpeedPerLevel: number; // percentage
  critPerLevel: number; // flat
  pickupRadiusPerLevel: number; // tiles
  xpMultPerLevel: number; // percentage
  regenPerLevel: number; // hp/sec
}

export interface SurvivorEvolutionDef {
  id: SurvivorEvolutionId;
  name: string;
  description: string;
  sourceWeapon: SurvivorWeaponId;
  requiredPassive: SurvivorPassiveId;
  damage: number;
  cooldown: number;
  area: number;
  count: number;
  color: number;
}

// ---------------------------------------------------------------------------
// Weapon definitions
// ---------------------------------------------------------------------------

export const WEAPON_DEFS: Record<SurvivorWeaponId, SurvivorWeaponDef> = {
  [SurvivorWeaponId.FIREBALL_RING]: {
    id: SurvivorWeaponId.FIREBALL_RING,
    name: "Fireball Ring",
    description: "Orbiting fireballs around the player",
    baseDamage: 20,
    baseCooldown: 3.0,
    baseArea: 2.5,
    baseCount: 1,
    baseSpeed: 3,
    basePierce: 0,
    baseDuration: 0,
    color: 0xff6600,
    damagePerLevel: 8,
    cooldownPerLevel: 0.2,
    countPerLevel: 1,
    areaPerLevel: 0.3,
    evolutionId: SurvivorEvolutionId.INFERNO_STORM,
    evolutionPassive: SurvivorPassiveId.SPELL_TOME,
    evolutionHint: "Max level + Spell Tome → Inferno Storm. Fire magic amplified by arcane knowledge.",
  },
  [SurvivorWeaponId.ARROW_VOLLEY]: {
    id: SurvivorWeaponId.ARROW_VOLLEY,
    name: "Arrow Volley",
    description: "Fires arrows at the nearest enemy",
    baseDamage: 15,
    baseCooldown: 1.5,
    baseArea: 0,
    baseCount: 1,
    baseSpeed: 12,
    basePierce: 1,
    baseDuration: 0,
    color: 0xddbb77,
    damagePerLevel: 5,
    cooldownPerLevel: 0.1,
    countPerLevel: 1,
    areaPerLevel: 0,
    evolutionId: SurvivorEvolutionId.ARROW_HURRICANE,
    evolutionPassive: SurvivorPassiveId.WAR_DRUM,
    evolutionHint: "Max level + War Drum → Arrow Hurricane. Faster attack speed unleashes a storm of arrows.",
  },
  [SurvivorWeaponId.LIGHTNING_CHAIN]: {
    id: SurvivorWeaponId.LIGHTNING_CHAIN,
    name: "Lightning Chain",
    description: "Chain lightning to nearby enemies",
    baseDamage: 25,
    baseCooldown: 4.0,
    baseArea: 4,
    baseCount: 2,
    baseSpeed: 0,
    basePierce: 0,
    baseDuration: 0,
    color: 0xaaddff,
    damagePerLevel: 10,
    cooldownPerLevel: 0.3,
    countPerLevel: 1,
    areaPerLevel: 0.5,
    evolutionId: SurvivorEvolutionId.THUNDER_GOD,
    evolutionPassive: SurvivorPassiveId.LUCKY_COIN,
    evolutionHint: "Max level + Lucky Coin → Thunder God. Luck channels lightning into a devastating storm.",
  },
  [SurvivorWeaponId.ICE_NOVA]: {
    id: SurvivorWeaponId.ICE_NOVA,
    name: "Ice Nova",
    description: "Expanding ice ring that slows enemies",
    baseDamage: 12,
    baseCooldown: 5.0,
    baseArea: 3,
    baseCount: 1,
    baseSpeed: 0,
    basePierce: 0,
    baseDuration: 3.0,
    color: 0x44aaff,
    damagePerLevel: 5,
    cooldownPerLevel: 0.3,
    countPerLevel: 0,
    areaPerLevel: 0.5,
    evolutionId: SurvivorEvolutionId.ABSOLUTE_ZERO,
    evolutionPassive: SurvivorPassiveId.SWIFT_BOOTS,
    evolutionHint: "Max level + Swift Boots → Absolute Zero. Speed creates a shockwave that shatters frozen foes.",
  },
  [SurvivorWeaponId.HOLY_CIRCLE]: {
    id: SurvivorWeaponId.HOLY_CIRCLE,
    name: "Holy Circle",
    description: "Damage aura around the player",
    baseDamage: 8,
    baseCooldown: 1.0,
    baseArea: 2,
    baseCount: 1,
    baseSpeed: 0,
    basePierce: 0,
    baseDuration: 0,
    color: 0xffd700,
    damagePerLevel: 4,
    cooldownPerLevel: 0.05,
    countPerLevel: 0,
    areaPerLevel: 0.3,
    evolutionId: SurvivorEvolutionId.DIVINE_JUDGMENT,
    evolutionPassive: SurvivorPassiveId.CHALICE,
    evolutionHint: "Max level + Chalice → Divine Judgment. Holy power sustained by regeneration becomes divine wrath.",
  },
  [SurvivorWeaponId.CATAPULT_STRIKE]: {
    id: SurvivorWeaponId.CATAPULT_STRIKE,
    name: "Catapult Strike",
    description: "Drops boulders on enemy clusters",
    baseDamage: 40,
    baseCooldown: 5.0,
    baseArea: 2.5,
    baseCount: 1,
    baseSpeed: 0,
    basePierce: 0,
    baseDuration: 0,
    color: 0x886644,
    damagePerLevel: 15,
    cooldownPerLevel: 0.3,
    countPerLevel: 1,
    areaPerLevel: 0.3,
    evolutionId: SurvivorEvolutionId.METEOR_BARRAGE,
    evolutionPassive: SurvivorPassiveId.CROWN,
    evolutionHint: "Max level + Crown → Meteor Barrage. Royal authority commands the heavens to rain fire.",
  },
  [SurvivorWeaponId.SPINNING_BLADE]: {
    id: SurvivorWeaponId.SPINNING_BLADE,
    name: "Spinning Blade",
    description: "Blade circles the player",
    baseDamage: 12,
    baseCooldown: 0, // continuous
    baseArea: 1.8,
    baseCount: 1,
    baseSpeed: 4,
    basePierce: 0,
    baseDuration: 0,
    color: 0xcccccc,
    damagePerLevel: 4,
    cooldownPerLevel: 0,
    countPerLevel: 1,
    areaPerLevel: 0.15,
    evolutionId: SurvivorEvolutionId.DEATH_SPIRAL,
    evolutionPassive: SurvivorPassiveId.PLATE_ARMOR,
    evolutionHint: "Max level + Plate Armor → Death Spiral. Heavy armor keeps the blades spinning endlessly.",
  },
  [SurvivorWeaponId.WARP_FIELD]: {
    id: SurvivorWeaponId.WARP_FIELD,
    name: "Warp Field",
    description: "Teleport-damages enemies in a radius",
    baseDamage: 35,
    baseCooldown: 6.0,
    baseArea: 3.0,
    baseCount: 1,
    baseSpeed: 0,
    basePierce: 0,
    baseDuration: 0.5,
    color: 0x9944cc,
    damagePerLevel: 12,
    cooldownPerLevel: 0.4,
    countPerLevel: 0,
    areaPerLevel: 0.4,
    evolutionId: SurvivorEvolutionId.VOID_RIFT,
    evolutionPassive: SurvivorPassiveId.MAGNET,
    evolutionHint: "Max level + Magnet → Void Rift. Magnetic pull tears open a rift that devours all.",
  },
  [SurvivorWeaponId.RUNE_CIRCLE]: {
    id: SurvivorWeaponId.RUNE_CIRCLE,
    name: "Rune Circle",
    description: "Ground AoE at random spots",
    baseDamage: 22,
    baseCooldown: 4.0,
    baseArea: 2.0,
    baseCount: 1,
    baseSpeed: 0,
    basePierce: 0,
    baseDuration: 2.0,
    color: 0xff4488,
    damagePerLevel: 8,
    cooldownPerLevel: 0.2,
    countPerLevel: 1,
    areaPerLevel: 0.2,
    evolutionId: SurvivorEvolutionId.ARCANE_CATACLYSM,
    evolutionPassive: SurvivorPassiveId.SWIFT_BOOTS,
    evolutionHint: "Max level + Swift Boots → Arcane Cataclysm. Speed channels rune energy into explosive force.",
  },
  [SurvivorWeaponId.SOUL_DRAIN]: {
    id: SurvivorWeaponId.SOUL_DRAIN,
    name: "Soul Drain",
    description: "Lifesteal beam to nearest enemy",
    baseDamage: 10,
    baseCooldown: 0.5,
    baseArea: 5.0,
    baseCount: 1,
    baseSpeed: 0,
    basePierce: 0,
    baseDuration: 0,
    color: 0x44ff88,
    damagePerLevel: 4,
    cooldownPerLevel: 0.02,
    countPerLevel: 1,
    areaPerLevel: 0.5,
    evolutionId: SurvivorEvolutionId.SOUL_REAPER,
    evolutionPassive: SurvivorPassiveId.CHALICE,
    evolutionHint: "Max level + Chalice → Soul Reaper. Regeneration fuels the soul drain into a life-devouring aura.",
  },
};

// ---------------------------------------------------------------------------
// Passive definitions
// ---------------------------------------------------------------------------

export const PASSIVE_DEFS: Record<SurvivorPassiveId, SurvivorPassiveDef> = {
  [SurvivorPassiveId.PLATE_ARMOR]: {
    id: SurvivorPassiveId.PLATE_ARMOR,
    name: "Plate Armor",
    description: "+20 max HP per level",
    hpPerLevel: 20,
    speedPerLevel: 0,
    areaPerLevel: 0,
    attackSpeedPerLevel: 0,
    critPerLevel: 0,
    pickupRadiusPerLevel: 0,
    xpMultPerLevel: 0,
    regenPerLevel: 0,
  },
  [SurvivorPassiveId.SWIFT_BOOTS]: {
    id: SurvivorPassiveId.SWIFT_BOOTS,
    name: "Swift Boots",
    description: "+10% move speed per level",
    hpPerLevel: 0,
    speedPerLevel: 0.10,
    areaPerLevel: 0,
    attackSpeedPerLevel: 0,
    critPerLevel: 0,
    pickupRadiusPerLevel: 0,
    xpMultPerLevel: 0,
    regenPerLevel: 0,
  },
  [SurvivorPassiveId.SPELL_TOME]: {
    id: SurvivorPassiveId.SPELL_TOME,
    name: "Spell Tome",
    description: "+10% area per level",
    hpPerLevel: 0,
    speedPerLevel: 0,
    areaPerLevel: 0.10,
    attackSpeedPerLevel: 0,
    critPerLevel: 0,
    pickupRadiusPerLevel: 0,
    xpMultPerLevel: 0,
    regenPerLevel: 0,
  },
  [SurvivorPassiveId.WAR_DRUM]: {
    id: SurvivorPassiveId.WAR_DRUM,
    name: "War Drum",
    description: "+10% attack speed per level",
    hpPerLevel: 0,
    speedPerLevel: 0,
    areaPerLevel: 0,
    attackSpeedPerLevel: 0.10,
    critPerLevel: 0,
    pickupRadiusPerLevel: 0,
    xpMultPerLevel: 0,
    regenPerLevel: 0,
  },
  [SurvivorPassiveId.LUCKY_COIN]: {
    id: SurvivorPassiveId.LUCKY_COIN,
    name: "Lucky Coin",
    description: "+5% crit chance per level",
    hpPerLevel: 0,
    speedPerLevel: 0,
    areaPerLevel: 0,
    attackSpeedPerLevel: 0,
    critPerLevel: 0.05,
    pickupRadiusPerLevel: 0,
    xpMultPerLevel: 0,
    regenPerLevel: 0,
  },
  [SurvivorPassiveId.MAGNET]: {
    id: SurvivorPassiveId.MAGNET,
    name: "Magnet",
    description: "+1 pickup radius per level",
    hpPerLevel: 0,
    speedPerLevel: 0,
    areaPerLevel: 0,
    attackSpeedPerLevel: 0,
    critPerLevel: 0,
    pickupRadiusPerLevel: 1.0,
    xpMultPerLevel: 0,
    regenPerLevel: 0,
  },
  [SurvivorPassiveId.CROWN]: {
    id: SurvivorPassiveId.CROWN,
    name: "Crown",
    description: "+10% XP gain per level",
    hpPerLevel: 0,
    speedPerLevel: 0,
    areaPerLevel: 0,
    attackSpeedPerLevel: 0,
    critPerLevel: 0,
    pickupRadiusPerLevel: 0,
    xpMultPerLevel: 0.10,
    regenPerLevel: 0,
  },
  [SurvivorPassiveId.CHALICE]: {
    id: SurvivorPassiveId.CHALICE,
    name: "Chalice",
    description: "+1 HP/sec regen per level",
    hpPerLevel: 0,
    speedPerLevel: 0,
    areaPerLevel: 0,
    attackSpeedPerLevel: 0,
    critPerLevel: 0,
    pickupRadiusPerLevel: 0,
    xpMultPerLevel: 0,
    regenPerLevel: 1.0,
  },
};

// ---------------------------------------------------------------------------
// Evolution definitions
// ---------------------------------------------------------------------------

export const EVOLUTION_DEFS: Record<SurvivorEvolutionId, SurvivorEvolutionDef> = {
  [SurvivorEvolutionId.INFERNO_STORM]: {
    id: SurvivorEvolutionId.INFERNO_STORM,
    name: "Inferno Storm",
    description: "Massive orbiting fire AoE",
    sourceWeapon: SurvivorWeaponId.FIREBALL_RING,
    requiredPassive: SurvivorPassiveId.SPELL_TOME,
    damage: 80,
    cooldown: 2.0,
    area: 5.0,
    count: 4,
    color: 0xff2200,
  },
  [SurvivorEvolutionId.ARROW_HURRICANE]: {
    id: SurvivorEvolutionId.ARROW_HURRICANE,
    name: "Arrow Hurricane",
    description: "360° arrow spray",
    sourceWeapon: SurvivorWeaponId.ARROW_VOLLEY,
    requiredPassive: SurvivorPassiveId.WAR_DRUM,
    damage: 35,
    cooldown: 0.8,
    area: 0,
    count: 12,
    color: 0xffcc44,
  },
  [SurvivorEvolutionId.THUNDER_GOD]: {
    id: SurvivorEvolutionId.THUNDER_GOD,
    name: "Thunder God",
    description: "Full-screen lightning storm",
    sourceWeapon: SurvivorWeaponId.LIGHTNING_CHAIN,
    requiredPassive: SurvivorPassiveId.LUCKY_COIN,
    damage: 60,
    cooldown: 3.0,
    area: 12,
    count: 8,
    color: 0xffffff,
  },
  [SurvivorEvolutionId.ABSOLUTE_ZERO]: {
    id: SurvivorEvolutionId.ABSOLUTE_ZERO,
    name: "Absolute Zero",
    description: "Freeze and shatter all nearby enemies",
    sourceWeapon: SurvivorWeaponId.ICE_NOVA,
    requiredPassive: SurvivorPassiveId.SWIFT_BOOTS,
    damage: 45,
    cooldown: 4.0,
    area: 6,
    count: 1,
    color: 0x88eeff,
  },
  [SurvivorEvolutionId.DIVINE_JUDGMENT]: {
    id: SurvivorEvolutionId.DIVINE_JUDGMENT,
    name: "Divine Judgment",
    description: "Screen-wide holy burst",
    sourceWeapon: SurvivorWeaponId.HOLY_CIRCLE,
    requiredPassive: SurvivorPassiveId.CHALICE,
    damage: 100,
    cooldown: 8.0,
    area: 15,
    count: 1,
    color: 0xffffcc,
  },
  [SurvivorEvolutionId.METEOR_BARRAGE]: {
    id: SurvivorEvolutionId.METEOR_BARRAGE,
    name: "Meteor Barrage",
    description: "Rains meteors across the screen",
    sourceWeapon: SurvivorWeaponId.CATAPULT_STRIKE,
    requiredPassive: SurvivorPassiveId.CROWN,
    damage: 90,
    cooldown: 3.0,
    area: 4.0,
    count: 6,
    color: 0xff4400,
  },
  [SurvivorEvolutionId.DEATH_SPIRAL]: {
    id: SurvivorEvolutionId.DEATH_SPIRAL,
    name: "Death Spiral",
    description: "Massive spinning blades of death",
    sourceWeapon: SurvivorWeaponId.SPINNING_BLADE,
    requiredPassive: SurvivorPassiveId.PLATE_ARMOR,
    damage: 35,
    cooldown: 0,
    area: 3.5,
    count: 5,
    color: 0xeeeeff,
  },
  [SurvivorEvolutionId.VOID_RIFT]: {
    id: SurvivorEvolutionId.VOID_RIFT,
    name: "Void Rift",
    description: "Tears open a black hole that pulls and damages",
    sourceWeapon: SurvivorWeaponId.WARP_FIELD,
    requiredPassive: SurvivorPassiveId.MAGNET,
    damage: 70,
    cooldown: 5.0,
    area: 6.0,
    count: 1,
    color: 0x6600cc,
  },
  [SurvivorEvolutionId.ARCANE_CATACLYSM]: {
    id: SurvivorEvolutionId.ARCANE_CATACLYSM,
    name: "Arcane Cataclysm",
    description: "Massive rune explosions everywhere",
    sourceWeapon: SurvivorWeaponId.RUNE_CIRCLE,
    requiredPassive: SurvivorPassiveId.SWIFT_BOOTS,
    damage: 55,
    cooldown: 3.0,
    area: 4.0,
    count: 5,
    color: 0xff22aa,
  },
  [SurvivorEvolutionId.SOUL_REAPER]: {
    id: SurvivorEvolutionId.SOUL_REAPER,
    name: "Soul Reaper",
    description: "Drains life from all nearby enemies",
    sourceWeapon: SurvivorWeaponId.SOUL_DRAIN,
    requiredPassive: SurvivorPassiveId.CHALICE,
    damage: 25,
    cooldown: 0.3,
    area: 8.0,
    count: 4,
    color: 0x00ff66,
  },
};
