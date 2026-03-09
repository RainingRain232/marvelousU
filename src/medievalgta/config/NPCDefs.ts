// NPC type definitions and initial spawn factory for Medieval GTA

import type { GTANPCType, GTANPCBehavior, GTANPC, GTAVec2 } from '../state/MedievalGTAState';

// ─── Per-type baseline stats ────────────────────────────────────────────────

export interface NPCDef {
  hp: number;
  damage: number;
  speed: number;
  alertRadius: number;
  aggroRadius: number;
  attackCooldown: number;
  behavior: GTANPCBehavior;
  isHostile: boolean;
  isGuard: boolean;
  colorVariants: number;
  dialogLines: string[];
}

export const NPC_DEFINITIONS: Record<GTANPCType, NPCDef> = {
  civilian_m: {
    hp: 30, damage: 4, speed: 70, alertRadius: 90, aggroRadius: 0,
    attackCooldown: 1.5, behavior: 'wander', isHostile: false, isGuard: false, colorVariants: 4,
    dialogLines: [
      'Good morrow, traveller!',
      'Have you seen the blacksmith?',
      'Camelot is a fine city, is it not?',
      'I hear the bandits have been causing trouble on the roads.',
      'Mind where you walk, friend.',
      'The market is busy today.',
      'God save the King!',
      'These cobblestones will be the death of me.',
    ],
  },
  civilian_f: {
    hp: 25, damage: 3, speed: 65, alertRadius: 100, aggroRadius: 0,
    attackCooldown: 1.5, behavior: 'wander', isHostile: false, isGuard: false, colorVariants: 4,
    dialogLines: [
      'Good day to you!',
      'Have you tried the bread from the baker on Millstone Lane?',
      'My husband says there will be a tournament next moon.',
      'Stay out of trouble, stranger.',
      'The guards have been on edge lately.',
      'I must fetch water from the well before dusk.',
      'A fine day in Camelot!',
      'Do not wander near the prison after dark.',
    ],
  },
  merchant: {
    hp: 35, damage: 5, speed: 60, alertRadius: 100, aggroRadius: 0,
    attackCooldown: 1.5, behavior: 'stand', isHostile: false, isGuard: false, colorVariants: 3,
    dialogLines: [
      'Fine wares, finest in all of Camelot!',
      'Step right up, step right up!',
      'Silks from the east, spices from the south!',
      'You look like a person of discerning taste.',
      'Everything must go — the taxman cometh!',
      'Best prices this side of the castle walls.',
      'I have what you seek, and at a fair price!',
      'Do you need supplies for the road?',
    ],
  },
  blacksmith_npc: {
    hp: 60, damage: 15, speed: 55, alertRadius: 80, aggroRadius: 0,
    attackCooldown: 1.2, behavior: 'stand', isHostile: false, isGuard: false, colorVariants: 2,
    dialogLines: [
      'Aye, I can sharpen that blade for ye.',
      'Steel is my language — and I am fluent.',
      'A good weapon is worth ten men in battle.',
      'The forge does not rest, and neither do I.',
      'You want a sword? Come back when I have finished this horseshoe.',
      'Iron in, iron out — that is the way of the smith.',
    ],
  },
  priest: {
    hp: 25, damage: 3, speed: 55, alertRadius: 80, aggroRadius: 0,
    attackCooldown: 2.0, behavior: 'wander', isHostile: false, isGuard: false, colorVariants: 2,
    dialogLines: [
      'Bless you, my child.',
      'Have you given thanks to the Lord today?',
      'Violence solves nothing — except when it does.',
      'The church doors are always open to the repentant.',
      'Pray for wisdom before you act.',
      'Even a sinner may find redemption in these halls.',
    ],
  },
  bard: {
    hp: 25, damage: 3, speed: 70, alertRadius: 80, aggroRadius: 0,
    attackCooldown: 2.0, behavior: 'wander', isHostile: false, isGuard: false, colorVariants: 4,
    dialogLines: [
      'A tale of glory and coin — shall I sing it for thee?',
      'La la la... oh, pardon me!',
      'I once knew a knight who never lost a duel. He retired a rich coward.',
      'Every hero needs a bard to remember their deeds!',
      'I compose only the finest epics. For a fee.',
      'Music soothes even the most savage beast.',
    ],
  },
  stable_master: {
    hp: 40, damage: 8, speed: 60, alertRadius: 90, aggroRadius: 0,
    attackCooldown: 1.3, behavior: 'stand', isHostile: false, isGuard: false, colorVariants: 2,
    dialogLines: [
      'Keep your hands off my horses, stranger.',
      'Finest steeds in the kingdom — not for the likes of thieves.',
      'A horse needs care, not just a rider.',
      'Treat these animals well or answer to me.',
      'You want to hire a horse? Show me your coin first.',
      'These horses are worth more than your life, friend.',
    ],
  },
  tavern_keeper: {
    hp: 45, damage: 10, speed: 55, alertRadius: 80, aggroRadius: 0,
    attackCooldown: 1.2, behavior: 'stand', isHostile: false, isGuard: false, colorVariants: 2,
    dialogLines: [
      'Ale, mead, or something stronger?',
      'No brawling in my tavern — take it outside.',
      'Rooms upstairs, but they cost extra.',
      'Pay your tab before you leave, or face the consequences.',
      'The stew is fresh today. Mostly.',
      'What\'ll it be, friend? The night is young.',
    ],
  },
  guard: {
    hp: 80, damage: 15, speed: 100, alertRadius: 200, aggroRadius: 150,
    attackCooldown: 1.0, behavior: 'patrol', isHostile: false, isGuard: true, colorVariants: 2,
    dialogLines: [
      'Halt! In the name of the King!',
      'Move along, citizen.',
      'I\'ve got my eye on you, stranger.',
      'Causing trouble will earn you a cell in the prison.',
      'The city is under the King\'s protection. Remember that.',
      'Stay out of restricted areas.',
    ],
  },
  knight: {
    hp: 120, damage: 25, speed: 130, alertRadius: 250, aggroRadius: 200,
    attackCooldown: 0.9, behavior: 'patrol', isHostile: false, isGuard: true, colorVariants: 2,
    dialogLines: [
      'By the order of the Round Table — stand down!',
      'Your crimes end here.',
      'I have sworn to protect this kingdom. Yield or face justice.',
      'I have felled men twice your size.',
      'Surrender, and you shall live.',
      'The King\'s law is absolute.',
    ],
  },
  archer_guard: {
    hp: 60, damage: 15, speed: 110, alertRadius: 280, aggroRadius: 250,
    attackCooldown: 1.4, behavior: 'stand', isHostile: false, isGuard: true, colorVariants: 2,
    dialogLines: [
      'I can put an arrow through a coin at fifty paces.',
      'Do not test my aim.',
      'One step further and you will be bristling with arrows.',
      'There is nowhere to run — I can see the whole square from here.',
      'My bow arm does not tire.',
      'The wall is not the place for criminals.',
    ],
  },
  army_soldier: {
    hp: 110, damage: 20, speed: 120, alertRadius: 220, aggroRadius: 180,
    attackCooldown: 0.95, behavior: 'patrol', isHostile: false, isGuard: true, colorVariants: 2,
    dialogLines: [
      'By royal decree — halt!',
      'The army has been called. Your end is near.',
      'I have fought in three campaigns. You are nothing.',
      'Lay down your arms and submit to the King\'s justice.',
      'We march for King and country!',
      'There will be no mercy for traitors.',
    ],
  },
  criminal: {
    hp: 50, damage: 10, speed: 90, alertRadius: 100, aggroRadius: 120,
    attackCooldown: 1.1, behavior: 'wander', isHostile: true, isGuard: false, colorVariants: 3,
    dialogLines: [
      'Your coin purse looks a little heavy, friend.',
      'Mind your own business and we will mind ours.',
      'Get out of our turf.',
      'You have wandered into the wrong alley.',
      'The city watch cannot be everywhere at once.',
      'Gold or blood — your choice.',
    ],
  },
  bandit: {
    hp: 55, damage: 12, speed: 95, alertRadius: 180, aggroRadius: 220,
    attackCooldown: 1.0, behavior: 'wander', isHostile: true, isGuard: false, colorVariants: 3,
    dialogLines: [
      'Stand and deliver!',
      'Coin or your life — decide quickly.',
      'The roads belong to us now.',
      'There is no law outside these walls.',
      'Kill them and take everything!',
      'You picked the wrong day to travel alone.',
    ],
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeNPC(
  id: string,
  type: GTANPCType,
  name: string,
  pos: GTAVec2,
  overrides?: Partial<Pick<GTANPC, 'behavior' | 'patrolPath' | 'questId' | 'colorVariant' | 'dialogLines'>>,
): GTANPC {
  const def = NPC_DEFINITIONS[type];
  const lines = overrides?.dialogLines ?? def.dialogLines;
  // Pick 2-3 random dialog lines from the pool
  const shuffled = [...lines].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 2 + Math.floor(Math.random() * 2));

  return {
    id,
    type,
    name,
    pos: { x: pos.x, y: pos.y },
    vel: { x: 0, y: 0 },
    hp: def.hp,
    maxHp: def.hp,
    behavior: overrides?.behavior ?? def.behavior,
    facing: Math.random() * Math.PI * 2,
    facingDir: 's',
    patrolPath: overrides?.patrolPath ?? [],
    patrolIndex: 0,
    patrolDir: 1,
    wanderTarget: null,
    wanderTimer: 0,
    chaseTimer: 0,
    attackTimer: 0,
    attackCooldown: def.attackCooldown,
    alertRadius: def.alertRadius,
    aggroRadius: def.aggroRadius,
    dialogLines: picked,
    questId: overrides?.questId ?? null,
    onHorse: false,
    colorVariant: overrides?.colorVariant ?? Math.floor(Math.random() * def.colorVariants),
    dead: false,
    deathTimer: 0,
    homePos: { x: pos.x, y: pos.y },
    damage: def.damage,
    speed: def.speed,
  };
}

// ─── Initial NPC population (~41 NPCs) ─────────────────────────────────────

export function getInitialNPCs(): GTANPC[] {
  const npcs: GTANPC[] = [];

  // ── 12 Civilians (mix of m/f) ─────────────────────────────────────────────
  // Market area civilians
  npcs.push(makeNPC('npc_civ_1', 'civilian_m', 'Thomas the Farmer', { x: 1600, y: 1350 }));
  npcs.push(makeNPC('npc_civ_2', 'civilian_f', 'Agnes', { x: 1700, y: 1400 }));
  npcs.push(makeNPC('npc_civ_3', 'civilian_m', 'William', { x: 1850, y: 1500 }));
  npcs.push(makeNPC('npc_civ_4', 'civilian_f', 'Eleanor', { x: 1950, y: 1350 }));
  // Street civilians
  npcs.push(makeNPC('npc_civ_5', 'civilian_m', 'Robert the Tanner', { x: 1400, y: 1100 }));
  npcs.push(makeNPC('npc_civ_6', 'civilian_f', 'Matilda', { x: 2100, y: 1000 }));
  npcs.push(makeNPC('npc_civ_7', 'civilian_m', 'Geoffrey', { x: 1200, y: 1600 }));
  npcs.push(makeNPC('npc_civ_8', 'civilian_f', 'Isolde', { x: 2500, y: 1600 }));
  // Near houses
  npcs.push(makeNPC('npc_civ_9', 'civilian_m', 'Hugh the Baker', { x: 1550, y: 1900 }));
  npcs.push(makeNPC('npc_civ_10', 'civilian_f', 'Beatrice', { x: 2700, y: 1100 }));
  // Quest-related civilian: worried wife at market
  npcs.push(makeNPC('npc_worried_wife', 'civilian_f', 'Margaret', { x: 1650, y: 1300 }, {
    questId: 'q_missing_merchant',
    dialogLines: [
      'Please, have you seen my husband? He went toward the south gate and has not returned!',
      'His name is Edmund. He is a merchant — please find him!',
      'I fear something terrible has happened to him.',
    ],
  }));
  // Missing merchant near south gate
  npcs.push(makeNPC('npc_missing_merchant', 'civilian_m', 'Edmund the Merchant', { x: 1950, y: 2350 }, {
    behavior: 'stand',
    questId: 'q_missing_merchant',
    dialogLines: [
      'Thank the heavens! My cart lost a wheel and I could not move the goods alone.',
      'Please tell Margaret I am safe. I feared the bandits would find me.',
      'Return to my wife with the news — she will reward you.',
    ],
  }));

  // ── 5 Merchants at market stalls ──────────────────────────────────────────
  npcs.push(makeNPC('npc_merch_1', 'merchant', 'Aldric the Silk Trader', { x: 1550, y: 1250 }, {
    questId: 'q_tax_collection',
    dialogLines: [
      'Fine silks and linens! Best in the kingdom!',
      'Taxes? Aye, I have the coin ready. Take it to the lord.',
      'Trade has been good this season.',
    ],
  }));
  npcs.push(makeNPC('npc_merch_2', 'merchant', 'Oswald the Spice Dealer', { x: 1700, y: 1250 }, {
    questId: 'q_tax_collection',
    dialogLines: [
      'Spices from the east, rare and fragrant!',
      'The tax ledger? Yes, yes, I have my share.',
      'Business is booming since the roads were cleared.',
    ],
  }));
  npcs.push(makeNPC('npc_merch_3', 'merchant', 'Gilbert the Fruit Seller', { x: 1850, y: 1250 }, {
    questId: 'q_tax_collection',
    dialogLines: [
      'Fresh apples, pears, and plums! Come and buy!',
      'Taxes again? Very well, here is my contribution.',
      'The harvest has been plentiful this year.',
    ],
  }));
  npcs.push(makeNPC('npc_merch_4', 'merchant', 'Hilda the Herbalist', { x: 2000, y: 1250 }));
  npcs.push(makeNPC('npc_merch_5', 'merchant', 'Reginald the Cloth Merchant', { x: 2050, y: 1650 }));

  // ── 8 Guards patrolling ───────────────────────────────────────────────────
  // North wall patrol
  npcs.push(makeNPC('npc_guard_n1', 'guard', 'Guard Wulfric', { x: 1200, y: 520 }, {
    behavior: 'patrol',
    patrolPath: [
      { x: 1000, y: 520 }, { x: 1400, y: 520 }, { x: 1800, y: 520 }, { x: 2200, y: 520 },
    ],
  }));
  npcs.push(makeNPC('npc_guard_n2', 'guard', 'Guard Leofric', { x: 2400, y: 520 }, {
    behavior: 'patrol',
    patrolPath: [
      { x: 2200, y: 520 }, { x: 2600, y: 520 }, { x: 3000, y: 520 },
    ],
  }));
  // South wall patrol
  npcs.push(makeNPC('npc_guard_s1', 'guard', 'Guard Edric', { x: 1500, y: 2480 }, {
    behavior: 'patrol',
    patrolPath: [
      { x: 1000, y: 2480 }, { x: 1500, y: 2480 }, { x: 2000, y: 2480 }, { x: 2500, y: 2480 },
    ],
  }));
  npcs.push(makeNPC('npc_guard_s2', 'guard', 'Guard Godwin', { x: 2500, y: 2480 }, {
    behavior: 'patrol',
    patrolPath: [
      { x: 2500, y: 2480 }, { x: 3000, y: 2480 }, { x: 3200, y: 2480 },
    ],
  }));
  // Castle entrance guard
  npcs.push(makeNPC('npc_guard_castle', 'guard', 'Guard Roland', { x: 1075, y: 1050 }, {
    behavior: 'patrol',
    patrolPath: [
      { x: 950, y: 1050 }, { x: 1200, y: 1050 }, { x: 1300, y: 900 }, { x: 1200, y: 1050 },
    ],
  }));
  // Market patrol guards
  npcs.push(makeNPC('npc_guard_market1', 'guard', 'Guard Aldhelm', { x: 1600, y: 1450 }, {
    behavior: 'patrol',
    patrolPath: [
      { x: 1500, y: 1300 }, { x: 2000, y: 1300 }, { x: 2000, y: 1600 }, { x: 1500, y: 1600 },
    ],
  }));
  npcs.push(makeNPC('npc_guard_market2', 'guard', 'Guard Cenric', { x: 2000, y: 1600 }, {
    behavior: 'patrol',
    patrolPath: [
      { x: 2000, y: 1600 }, { x: 1500, y: 1600 }, { x: 1500, y: 1300 }, { x: 2000, y: 1300 },
    ],
  }));
  // East wall gate guard
  npcs.push(makeNPC('npc_guard_e', 'guard', 'Guard Dunstan', { x: 3180, y: 1500 }, {
    behavior: 'patrol',
    patrolPath: [
      { x: 3180, y: 1300 }, { x: 3180, y: 1500 }, { x: 3180, y: 1700 },
    ],
  }));

  // ── 4 Knights patrolling castle / barracks ────────────────────────────────
  npcs.push(makeNPC('npc_knight_1', 'knight', 'Sir Gawain', { x: 1000, y: 750 }, {
    behavior: 'patrol',
    patrolPath: [
      { x: 900, y: 600 }, { x: 1250, y: 600 }, { x: 1250, y: 1000 }, { x: 900, y: 1000 },
    ],
  }));
  npcs.push(makeNPC('npc_knight_2', 'knight', 'Sir Bors', { x: 1100, y: 900 }, {
    behavior: 'patrol',
    patrolPath: [
      { x: 900, y: 800 }, { x: 1200, y: 800 }, { x: 1200, y: 1050 }, { x: 900, y: 1050 },
    ],
  }));
  npcs.push(makeNPC('npc_knight_3', 'knight', 'Sir Percival', { x: 1500, y: 700 }, {
    behavior: 'patrol',
    questId: 'q_royal_escort',
    patrolPath: [
      { x: 1400, y: 600 }, { x: 1800, y: 600 }, { x: 1800, y: 850 }, { x: 1400, y: 850 },
    ],
    dialogLines: [
      'Well met, traveller. I carry an urgent message for the king.',
      'I fear an ambush on the road to the castle. Will you escort me?',
      'Stand with me and the crown shall reward you.',
    ],
  }));
  npcs.push(makeNPC('npc_knight_4', 'knight', 'Sir Lancelot', { x: 1700, y: 750 }, {
    behavior: 'patrol',
    patrolPath: [
      { x: 1500, y: 650 }, { x: 1850, y: 650 }, { x: 1850, y: 880 }, { x: 1500, y: 880 },
    ],
  }));

  // ── 4 Archer guards on wall towers (4 corners) ───────────────────────────
  npcs.push(makeNPC('npc_archer_nw', 'archer_guard', 'Archer Wynn', { x: 820, y: 520 }, {
    behavior: 'stand',
  }));
  npcs.push(makeNPC('npc_archer_ne', 'archer_guard', 'Archer Gareth', { x: 3180, y: 520 }, {
    behavior: 'stand',
  }));
  npcs.push(makeNPC('npc_archer_sw', 'archer_guard', 'Archer Bryce', { x: 820, y: 2480 }, {
    behavior: 'stand',
  }));
  npcs.push(makeNPC('npc_archer_se', 'archer_guard', 'Archer Cedric', { x: 3180, y: 2480 }, {
    behavior: 'stand',
  }));

  // ── 1 Blacksmith NPC at forge ─────────────────────────────────────────────
  npcs.push(makeNPC('npc_blacksmith_edgar', 'blacksmith_npc', 'Edgar the Blacksmith', { x: 1025, y: 1350 }, {
    behavior: 'stand',
    questId: 'q_holy_relic',
    dialogLines: [
      'Aye, I can sharpen that blade for ye.',
      'A good weapon is worth ten men in battle.',
      'The priest came by asking about a relic. Said it was left at the tavern by mistake.',
    ],
  }));

  // ── 1 Priest at church ────────────────────────────────────────────────────
  npcs.push(makeNPC('npc_priest_aldous', 'priest', 'Father Aldous', { x: 2225, y: 725 }, {
    behavior: 'wander',
    questId: 'q_holy_relic',
    dialogLines: [
      'Bless you, my child. I have a matter of great urgency.',
      'A holy relic was taken from the church — a blessed key, left at the tavern.',
      'Retrieve it and the church will be most grateful.',
    ],
  }));

  // ── 1 Bard at tavern ─────────────────────────────────────────────────────
  npcs.push(makeNPC('npc_bard_finn', 'bard', 'Finn the Bard', { x: 2350, y: 1350 }, {
    behavior: 'wander',
    dialogLines: [
      'A tale of glory and coin — shall I sing it for thee?',
      'La la la... oh, pardon me!',
      'Every hero needs a bard to remember their deeds!',
    ],
  }));

  // ── 1 Tavern keeper at tavern ─────────────────────────────────────────────
  npcs.push(makeNPC('npc_tavern_keeper', 'tavern_keeper', 'Giles the Tavern Keeper', { x: 2400, y: 1300 }, {
    behavior: 'stand',
    dialogLines: [
      'Ale, mead, or something stronger?',
      'No brawling in my tavern — take it outside.',
      'Pay your tab before you leave, or face the consequences.',
    ],
  }));

  // ── 1 Stable master at stable ─────────────────────────────────────────────
  npcs.push(makeNPC('npc_stable_master', 'stable_master', 'Old Harlan', { x: 2825, y: 2000 }, {
    behavior: 'stand',
    questId: 'q_horse_thief',
    dialogLines: [
      'Keep your hands off my horses, stranger.',
      'Someone stole my best mare! She was last seen heading south out the gate.',
      'Bring her back and I will make it worth your while.',
    ],
  }));

  // ── 3 Criminals lurking near prison / south areas ─────────────────────────
  npcs.push(makeNPC('npc_crim_1', 'criminal', 'Ratface', { x: 950, y: 1800 }, {
    behavior: 'wander',
    dialogLines: [
      'Your coin purse looks a little heavy, friend.',
      'Get out of our turf.',
      'Gold or blood — your choice.',
    ],
  }));
  npcs.push(makeNPC('npc_crim_2', 'criminal', 'Scarhand', { x: 1100, y: 2100 }, {
    behavior: 'wander',
    dialogLines: [
      'Mind your own business and we will mind ours.',
      'The city watch cannot be everywhere at once.',
      'You have wandered into the wrong alley.',
    ],
  }));
  npcs.push(makeNPC('npc_crim_3', 'criminal', 'Black Tom', { x: 1300, y: 2300 }, {
    behavior: 'wander',
    dialogLines: [
      'Looking for trouble? You found it.',
      'This is our territory. Leave or bleed.',
      'The guards do not come down here after dark.',
    ],
  }));

  // ── Captain at barracks (quest giver for Bandit Trouble) ──────────────────
  // Use guard type for the captain — he is a senior guard
  npcs.push(makeNPC('npc_captain_gareth', 'guard', 'Captain Gareth', { x: 1650, y: 725 }, {
    behavior: 'stand',
    questId: 'q_bandit_trouble',
    dialogLines: [
      'My men are stretched thin. I need outside help.',
      'Three criminals have been terrorizing the area near the prison. Deal with them.',
      'Bring me proof and the coin is yours.',
    ],
  }));

  // ── Lord steward at castle (quest giver for Tax Collection) ───────────────
  // Use merchant type for the steward
  npcs.push(makeNPC('npc_steward', 'merchant', 'Steward Aldric', { x: 1075, y: 800 }, {
    behavior: 'stand',
    questId: 'q_tax_collection',
    dialogLines: [
      'The quarterly taxes must be collected from the market merchants.',
      'Visit three merchants and collect their payments. Return them here.',
      'The crown rewards efficiency and discretion.',
    ],
  }));

  return npcs;
}
