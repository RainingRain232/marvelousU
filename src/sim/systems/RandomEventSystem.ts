// RandomEventSystem — fires a random game event every RANDOM_EVENT_INTERVAL seconds
// during the BATTLE phase. Each event awards gold or other bonuses to all players
// and emits a "randomEvent" event so the view can display a banner.

import type { GameState } from "@sim/state/GameState";
import { GamePhase, UnitType, NEUTRAL_PLAYER } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { EventBus } from "@sim/core/EventBus";
import { createUnit } from "@sim/entities/Unit";

// ---------------------------------------------------------------------------
// Event definitions
// ---------------------------------------------------------------------------

interface RandomEventDef {
  type: string;
  title: string;
  description: string;
  apply(state: GameState): void;
}

/** Spawn offsets for a 4-unit cluster (2×2 spread around an anchor). */
const BANDIT_OFFSETS: { x: number; y: number }[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
];

/**
 * Find neutral buildings (owner === null) in the neutral zone (centre third of
 * the map) and return one at random. Returns null if none exist.
 */
function _pickNeutralBuilding(state: GameState): { x: number; y: number } | null {
  const width = state.battlefield.width;
  const westEnd = Math.floor(width / 3);
  const eastStart = Math.ceil((width * 2) / 3);

  const candidates = [...state.buildings.values()].filter(
    (b) => b.owner === null && b.position.x >= westEnd && b.position.x < eastStart,
  );

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)].position;
}

const RANDOM_EVENTS: RandomEventDef[] = [
  {
    type: "gold_bounty_small",
    title: "GOLD BOUNTY",
    description: "A merchant caravan passes through — both players receive 200 gold!",
    apply(state) {
      for (const player of state.players.values()) {
        player.gold += 200;
        EventBus.emit("goldChanged", { playerId: player.id, amount: player.gold });
      }
    },
  },
  {
    type: "gold_bounty_large",
    title: "RICH HARVEST",
    description: "Abundant resources discovered — both players receive 400 gold!",
    apply(state) {
      for (const player of state.players.values()) {
        player.gold += 400;
        EventBus.emit("goldChanged", { playerId: player.id, amount: player.gold });
      }
    },
  },
  {
    type: "bandit_raid",
    title: "BANDIT RAID",
    description: "Brigands emerge from the wilderness! Hostile swordsmen attack near a central town!",
    apply(state) {
      const anchor = _pickNeutralBuilding(state);
      // Fall back to map centre if no neutral building exists
      const base = anchor ?? {
        x: Math.floor(state.battlefield.width / 2),
        y: Math.floor(state.battlefield.height / 2),
      };

      for (const offset of BANDIT_OFFSETS) {
        const unit = createUnit({
          type: UnitType.SWORDSMAN,
          owner: NEUTRAL_PLAYER,
          position: { x: base.x + offset.x, y: base.y + offset.y },
        });
        state.units.set(unit.id, unit);
        EventBus.emit("unitSpawned", {
          unitId: unit.id,
          buildingId: "",
          position: { ...unit.position },
        });
      }
    },
  },
  {
    type: "cyclops_wanderer",
    title: "CYCLOPS WANDERER",
    description: "A massive cyclops wanders into the battlefield! A neutral giant threatens all units!",
    apply(state) {
      const anchor = _pickNeutralBuilding(state);
      // Fall back to map centre if no neutral building exists
      const base = anchor ?? {
        x: Math.floor(state.battlefield.width / 2),
        y: Math.floor(state.battlefield.height / 2),
      };

      const unit = createUnit({
        type: UnitType.CYCLOPS,
        owner: NEUTRAL_PLAYER,
        position: { x: base.x, y: base.y },
      });
      state.units.set(unit.id, unit);
      EventBus.emit("unitSpawned", {
        unitId: unit.id,
        buildingId: "",
        position: { ...unit.position },
      });
    },
  },
  {
    type: "red_dragon_wanderer",
    title: "RED DRAGON ATTACK",
    description: "A fearsome red dragon descends from the skies! A neutral beast rains fire upon all units!",
    apply(state) {
      const anchor = _pickNeutralBuilding(state);
      // Fall back to map centre if no neutral building exists
      const base = anchor ?? {
        x: Math.floor(state.battlefield.width / 2),
        y: Math.floor(state.battlefield.height / 2),
      };

      const unit = createUnit({
        type: UnitType.RED_DRAGON,
        owner: NEUTRAL_PLAYER,
        position: { x: base.x, y: base.y },
      });
      state.units.set(unit.id, unit);
      EventBus.emit("unitSpawned", {
        unitId: unit.id,
        buildingId: "",
        position: { ...unit.position },
      });
    },
  },
  {
    type: "divine_blessing",
    title: "DIVINE BLESSING",
    description: "A miracle occurs! Both players receive a cleric and two monks to aid their cause!",
    apply(state) {
      // Summon units for both players at their castles
      for (const playerId of ["p1", "p2"]) {
        const player = state.players.get(playerId);
        if (!player) continue;

        // Find player's castle
        const castle = [...state.buildings.values()].find(
          b => b.owner === playerId && b.type === "castle"
        );
        if (!castle) continue;

        // Spawn cleric near castle (outside)
        const clericOffsetX = Math.random() > 0.5 ? 3 : -3;
        const clericOffsetY = Math.random() > 0.5 ? 3 : -3;
        const cleric = createUnit({
          type: UnitType.CLERIC,
          owner: playerId,
          position: { x: castle.position.x + 1 + clericOffsetX, y: castle.position.y + 1 + clericOffsetY },
        });
        state.units.set(cleric.id, cleric);
        EventBus.emit("unitSpawned", {
          unitId: cleric.id,
          buildingId: castle.id,
          position: { ...cleric.position },
        });

        // Spawn two monks near castle (outside)
        for (let i = 0; i < 2; i++) {
          const monkOffsetX = Math.random() > 0.5 ? 2 + i : -2 - i;
          const monkOffsetY = Math.random() > 0.5 ? 2 + i : -2 - i;
          const monk = createUnit({
            type: UnitType.MONK,
            owner: playerId,
            position: { x: castle.position.x + 1 + monkOffsetX, y: castle.position.y + 2 + monkOffsetY },
          });
          state.units.set(monk.id, monk);
          EventBus.emit("unitSpawned", {
            unitId: monk.id,
            buildingId: castle.id,
            position: { ...monk.position },
          });
        }
      }
    },
  },
];

// ---------------------------------------------------------------------------
// Scenario-specific events (Arthurian campaign scenarios 9–23)
// ---------------------------------------------------------------------------

/** Spawn a cluster of neutral units at a position. */
function _spawnNeutralCluster(
  state: GameState,
  entries: Array<{ type: UnitType; count: number }>,
  baseX: number,
  baseY: number,
): void {
  let idx = 0;
  for (const entry of entries) {
    for (let i = 0; i < entry.count; i++) {
      const unit = createUnit({
        type: entry.type,
        owner: NEUTRAL_PLAYER,
        position: { x: baseX + (idx % 3), y: baseY + Math.floor(idx / 3) },
      });
      state.units.set(unit.id, unit);
      EventBus.emit("unitSpawned", {
        unitId: unit.id,
        buildingId: "",
        position: { ...unit.position },
      });
      idx++;
    }
  }
}

/** Scenario-specific event sets, keyed by campaignScenario number. */
const SCENARIO_EVENTS: Record<number, RandomEventDef[]> = {
  // Scenario 9 — The Green Chapel: Green Knight respawns + forest creatures
  9: [
    {
      type: "green_knight_returns",
      title: "THE GREEN KNIGHT RETURNS",
      description: "The Green Knight regenerates from his wounds and stalks the battlefield once more!",
      apply(state) {
        const cx = Math.floor(state.battlefield.width / 2);
        const cy = Math.floor(state.battlefield.height / 2);
        const knight = createUnit({
          type: UnitType.CYCLOPS,
          owner: NEUTRAL_PLAYER,
          position: { x: cx, y: cy },
        });
        knight.hp = Math.floor(knight.hp * 2);
        knight.maxHp = knight.hp;
        state.units.set(knight.id, knight);
        EventBus.emit("unitSpawned", { unitId: knight.id, buildingId: "", position: { ...knight.position } });
      },
    },
    {
      type: "forest_creatures_stir",
      title: "FOREST CREATURES STIR",
      description: "The ancient forest awakens — creatures emerge from the undergrowth!",
      apply(state) {
        const w = state.battlefield.width;
        const h = state.battlefield.height;
        _spawnNeutralCluster(state, [
          { type: UnitType.SPIDER, count: 2 },
          { type: UnitType.GIANT_FROG, count: 1 },
        ], Math.floor(w * 0.4), Math.floor(h * 0.6));
      },
    },
  ],
  // Scenario 10 — The Fisher King's Lands: blight creatures from wasteland
  10: [
    {
      type: "blight_crawlers",
      title: "THE BLIGHT SPREADS",
      description: "Corrupted creatures crawl from the Fisher King's blighted land!",
      apply(state) {
        const w = state.battlefield.width;
        const h = state.battlefield.height;
        const x = Math.floor(w * (0.3 + Math.random() * 0.4));
        const y = Math.floor(h * (0.3 + Math.random() * 0.4));
        _spawnNeutralCluster(state, [
          { type: UnitType.SPIDER, count: 2 },
          { type: UnitType.VOID_SNAIL, count: 1 },
        ], x, y);
      },
    },
    {
      type: "gold_bounty_small",
      title: "FERTILE GROUND RESTORED",
      description: "Your farms have purified a patch of wasteland — 200 gold gained!",
      apply(state) {
        for (const player of state.players.values()) {
          player.gold += 200;
          EventBus.emit("goldChanged", { playerId: player.id, amount: player.gold });
        }
      },
    },
  ],
  // Scenario 11 — Morgan's Bargain: Fay creatures contest markets
  11: [
    {
      type: "morgans_fay_guard",
      title: "MORGAN'S FAY GUARD",
      description: "Morgan le Fay sends faery creatures to reclaim her enchanted markets!",
      apply(state) {
        const anchor = _pickNeutralBuilding(state);
        const base = anchor ?? {
          x: Math.floor(state.battlefield.width / 2),
          y: Math.floor(state.battlefield.height / 2),
        };
        _spawnNeutralCluster(state, [
          { type: UnitType.FAERY_QUEEN, count: 1 },
          { type: UnitType.PIXIE, count: 3 },
        ], base.x - 1, base.y - 1);
      },
    },
    {
      type: "enchanted_gold",
      title: "ENCHANTED GOLD",
      description: "Morgan's markets overflow with enchanted coin — 300 gold to all!",
      apply(state) {
        for (const player of state.players.values()) {
          player.gold += 300;
          EventBus.emit("goldChanged", { playerId: player.id, amount: player.gold });
        }
      },
    },
  ],
  // Scenario 12 — The Siege Perilous: ley-line storm mages
  12: [
    {
      type: "leyline_surge",
      title: "LEY-LINE SURGE",
      description: "Arcane energy surges through the ley lines — hostile storm mages materialise!",
      apply(state) {
        const w = state.battlefield.width;
        const h = state.battlefield.height;
        const x = Math.floor(w * (0.3 + Math.random() * 0.4));
        const y = Math.floor(h * (0.2 + Math.random() * 0.6));
        _spawnNeutralCluster(state, [{ type: UnitType.STORM_MAGE, count: 2 }], x, y);
      },
    },
    {
      type: "siege_perilous_champion",
      title: "A CHAMPION RISES",
      description: "The Siege Perilous pulses with power — a knight champion emerges from its light!",
      apply(state) {
        const cx = Math.floor(state.battlefield.width / 2);
        const cy = Math.floor(state.battlefield.height / 2);
        _spawnNeutralCluster(state, [{ type: UnitType.KNIGHT_LANCER, count: 1 }], cx, cy);
      },
    },
  ],
  // Scenario 14 — The Questing Beast: beast respawns with escort
  14: [
    {
      type: "questing_beast_returns",
      title: "THE QUESTING BEAST RETURNS",
      description: "Drawn by the scent of battle, the Questing Beast emerges once more!",
      apply(state) {
        const cx = Math.floor(state.battlefield.width / 2);
        const cy = Math.floor(state.battlefield.height / 2);
        const beast = createUnit({
          type: UnitType.RED_DRAGON,
          owner: NEUTRAL_PLAYER,
          position: { x: cx + Math.floor(Math.random() * 6 - 3), y: cy + Math.floor(Math.random() * 6 - 3) },
        });
        beast.hp = Math.floor(beast.hp * 1.5);
        beast.maxHp = beast.hp;
        state.units.set(beast.id, beast);
        EventBus.emit("unitSpawned", { unitId: beast.id, buildingId: "", position: { ...beast.position } });
      },
    },
    {
      type: "beast_bounty",
      title: "BEAST BOUNTY",
      description: "The Questing Beast has been slain — a bounty of 500 gold is awarded!",
      apply(state) {
        for (const player of state.players.values()) {
          player.gold += 500;
          EventBus.emit("goldChanged", { playerId: player.id, amount: player.gold });
        }
      },
    },
  ],
  // Scenario 15 — The Dolorous Stroke: undead rise from ruins
  15: [
    {
      type: "restless_dead_rise",
      title: "THE RESTLESS DEAD",
      description: "The Dolorous Stroke echoes — undead warriors claw their way from shattered ruins!",
      apply(state) {
        const w = state.battlefield.width;
        const h = state.battlefield.height;
        const x = Math.floor(w * (0.25 + Math.random() * 0.5));
        const y = Math.floor(h * (0.25 + Math.random() * 0.5));
        _spawnNeutralCluster(state, [
          { type: UnitType.SWORDSMAN, count: 3 },
          { type: UnitType.PIKEMAN, count: 2 },
        ], x, y);
      },
    },
  ],
  // Scenario 16 — The Perilous Forest: creature waves from edges
  16: [
    {
      type: "forest_wave",
      title: "THE FOREST STRIKES",
      description: "The Perilous Forest sends forth another wave of creatures!",
      apply(state) {
        const w = state.battlefield.width;
        const h = state.battlefield.height;
        // Spawn from a random edge
        const edges = [
          { x: 2, y: Math.floor(h * Math.random()) },
          { x: w - 4, y: Math.floor(h * Math.random()) },
          { x: Math.floor(w * Math.random()), y: 2 },
          { x: Math.floor(w * Math.random()), y: h - 4 },
        ];
        const pos = edges[Math.floor(Math.random() * edges.length)];
        _spawnNeutralCluster(state, [
          { type: UnitType.SPIDER, count: 2 },
          { type: UnitType.GIANT_FROG, count: 1 },
          { type: UnitType.VOID_SNAIL, count: 1 },
        ], pos.x, pos.y);
      },
    },
  ],
  // Scenario 17 — The Tournament at Camelot: champion challengers
  17: [
    {
      type: "tournament_challenger",
      title: "NEW CHALLENGER",
      description: "A herald announces a new challenger — powerful knights enter the tournament grounds!",
      apply(state) {
        const w = state.battlefield.width;
        const h = state.battlefield.height;
        const cx = Math.floor(w / 2);
        const cy = Math.floor(h / 2);
        _spawnNeutralCluster(state, [
          { type: UnitType.KNIGHT_LANCER, count: 1 },
          { type: UnitType.LANCER, count: 1 },
        ], cx + Math.floor(Math.random() * 6 - 3), cy + Math.floor(Math.random() * 6 - 3));
      },
    },
  ],
  // Scenario 18 — The Chapel of the Grail: angelic reinforcements
  18: [
    {
      type: "grail_blessing",
      title: "THE GRAIL'S BLESSING",
      description: "The Grail Chapel radiates divine power — holy warriors appear to test the worthy!",
      apply(state) {
        const cx = Math.floor(state.battlefield.width / 2);
        const cy = Math.floor(state.battlefield.height / 2);
        _spawnNeutralCluster(state, [
          { type: UnitType.SAINT, count: 1 },
          { type: UnitType.MONK, count: 2 },
        ], cx - 1, cy - 1);
      },
    },
    {
      type: "divine_blessing",
      title: "DIVINE BLESSING",
      description: "A miracle occurs! Both players receive a cleric and two monks!",
      apply(state) {
        for (const playerId of ["p1", "p2"]) {
          const castle = [...state.buildings.values()].find(
            b => b.owner === playerId && b.type === "castle"
          );
          if (!castle) continue;
          const cleric = createUnit({
            type: UnitType.CLERIC,
            owner: playerId,
            position: { x: castle.position.x + 3, y: castle.position.y + 1 },
          });
          state.units.set(cleric.id, cleric);
          EventBus.emit("unitSpawned", { unitId: cleric.id, buildingId: castle.id, position: { ...cleric.position } });
          for (let i = 0; i < 2; i++) {
            const monk = createUnit({
              type: UnitType.MONK,
              owner: playerId,
              position: { x: castle.position.x - 2 - i, y: castle.position.y + 2 },
            });
            state.units.set(monk.id, monk);
            EventBus.emit("unitSpawned", { unitId: monk.id, buildingId: castle.id, position: { ...monk.position } });
          }
        }
      },
    },
  ],
  // Scenario 21 — The Grail War: distortion fields + saint spawns
  21: [
    {
      type: "grail_distortion",
      title: "REALITY WARPS",
      description: "The Grail's power distorts reality — void creatures materialise around it!",
      apply(state) {
        const cx = Math.floor(state.battlefield.width / 2);
        const cy = Math.floor(state.battlefield.height / 2);
        _spawnNeutralCluster(state, [
          { type: UnitType.VOID_SNAIL, count: 2 },
          { type: UnitType.DISTORTION_MAGE, count: 1 },
        ], cx + Math.floor(Math.random() * 6 - 3), cy + Math.floor(Math.random() * 6 - 3));
      },
    },
  ],
  // Scenario 22 — The Walls of Camelot: loyalist reinforcements
  22: [
    {
      type: "loyalist_reinforcements",
      title: "LOYALIST KNIGHTS",
      description: "Loyalist knights from an outlying castle ride to Camelot's defence!",
      apply(state) {
        // Spawn near P1's castle
        const castle = [...state.buildings.values()].find(
          b => b.owner === "p1" && b.type === "castle"
        );
        if (!castle) return;
        for (let i = 0; i < 3; i++) {
          const knight = createUnit({
            type: UnitType.QUESTING_KNIGHT,
            owner: "p1",
            position: { x: castle.position.x - 3 + i, y: castle.position.y - 3 },
          });
          state.units.set(knight.id, knight);
          EventBus.emit("unitSpawned", { unitId: knight.id, buildingId: castle.id, position: { ...knight.position } });
        }
      },
    },
    {
      type: "mordred_siege",
      title: "MORDRED'S SIEGE ENGINE",
      description: "Mordred sends a cyclops to batter your walls!",
      apply(state) {
        const w = state.battlefield.width;
        const h = state.battlefield.height;
        const cyclops = createUnit({
          type: UnitType.CYCLOPS,
          owner: NEUTRAL_PLAYER,
          position: { x: Math.floor(w * 0.6), y: Math.floor(h * 0.5) },
        });
        state.units.set(cyclops.id, cyclops);
        EventBus.emit("unitSpawned", { unitId: cyclops.id, buildingId: "", position: { ...cyclops.position } });
      },
    },
  ],
  // Scenario 23 — The Dragon of the White Tower: wild frost dragons
  23: [
    {
      type: "wild_frost_dragon",
      title: "FROST DRAGON DESCENDS",
      description: "A wild frost dragon descends from the northern wastes, attacking all in its path!",
      apply(state) {
        const w = state.battlefield.width;
        const x = Math.floor(w * (0.3 + Math.random() * 0.4));
        const dragon = createUnit({
          type: UnitType.FROST_DRAGON,
          owner: NEUTRAL_PLAYER,
          position: { x, y: 3 },
        });
        state.units.set(dragon.id, dragon);
        EventBus.emit("unitSpawned", { unitId: dragon.id, buildingId: "", position: { ...dragon.position } });
      },
    },
    {
      type: "gold_bounty_small",
      title: "DRAGON HOARD",
      description: "A slain dragon's hoard is discovered — 300 gold to all!",
      apply(state) {
        for (const player of state.players.values()) {
          player.gold += 300;
          EventBus.emit("goldChanged", { playerId: player.id, amount: player.gold });
        }
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

export const RandomEventSystem = {
  update(state: GameState, dt: number): void {
    // Only runs during battle
    if (state.phase !== GamePhase.BATTLE) return;

    state.eventTimer -= dt;
    if (state.eventTimer > 0) return;

    // Reset timer for the next event
    state.eventTimer = BalanceConfig.RANDOM_EVENT_INTERVAL;

    // Use scenario-specific events if available, otherwise default pool
    const pool = (state.campaignScenario !== null && SCENARIO_EVENTS[state.campaignScenario])
      ? SCENARIO_EVENTS[state.campaignScenario]
      : RANDOM_EVENTS;

    // Pick a random event with equal probability
    const def = pool[Math.floor(Math.random() * pool.length)];

    // Apply the event's effect
    def.apply(state);

    // Notify the view
    EventBus.emit("randomEvent", {
      eventType: def.type,
      title: def.title,
      description: def.description,
    });
  },
};
