// Server-side game room — manages one multiplayer game session.
//
// Lifecycle: create → players join → all ready → game starts → sim runs →
// game over → room destroyed.
//
// Each room has its own GameState + SimRunner. Player actions are validated
// and applied to the authoritative state. State snapshots are broadcast
// to all connected clients.

import { createGameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { initBasesMulti, type PlayerBaseConfig } from "@sim/systems/BaseSetup";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { confirmPlacement } from "@input/PlacementMode";
import { addToQueue } from "@sim/systems/SpawnSystem";
import { UpgradeSystem } from "@sim/systems/UpgradeSystem";
import { EventBus } from "@sim/core/EventBus";
import { SimRunner } from "./SimRunner";
import { validateAction } from "./ActionValidator";
import type {
  PlayerAction,
  ServerMessage,
  RoomPlayer,
} from "@net/protocol";
import type { PlayerId } from "@/types";
import { Direction, GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClientConnection {
  playerId: PlayerId;
  send: (msg: ServerMessage) => void;
  ready: boolean;
  connected: boolean;
}

// ---------------------------------------------------------------------------
// Room ID generation
// ---------------------------------------------------------------------------

const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion

function generateRoomId(): string {
  let id = "";
  for (let i = 0; i < 4; i++) {
    id += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  }
  return id;
}

// ---------------------------------------------------------------------------
// GameRoom
// ---------------------------------------------------------------------------

export class GameRoom {
  readonly id: string;
  readonly maxPlayers: number;

  private _clients = new Map<PlayerId, ClientConnection>();
  private _state: GameState | null = null;
  private _sim: SimRunner | null = null;
  private _started = false;
  private _destroyed = false;

  constructor(maxPlayers: number = 2) {
    this.id = generateRoomId();
    this.maxPlayers = Math.min(Math.max(maxPlayers, 2), 4);
  }

  get started(): boolean {
    return this._started;
  }

  get playerCount(): number {
    return this._clients.size;
  }

  get isFull(): boolean {
    return this._clients.size >= this.maxPlayers;
  }

  // ---------------------------------------------------------------------------
  // Player management
  // ---------------------------------------------------------------------------

  /** Add a player to the room. Returns the assigned PlayerId or null if full. */
  addPlayer(send: (msg: ServerMessage) => void): PlayerId | null {
    if (this.isFull || this._started) return null;

    const slot = this._clients.size + 1;
    const playerId = `p${slot}` as PlayerId;

    const client: ClientConnection = {
      playerId,
      send,
      ready: false,
      connected: true,
    };
    this._clients.set(playerId, client);

    // Tell the new player their assignment
    client.send({
      type: "room_info",
      roomId: this.id,
      assignedPlayerId: playerId,
      players: this._getRoomPlayers(),
    });

    // Tell all other players someone joined
    this._broadcastExcept(playerId, {
      type: "player_joined",
      playerId,
      slot: `p${slot}`,
    });

    return playerId;
  }

  /** Handle a player disconnecting. */
  removePlayer(playerId: PlayerId): void {
    const client = this._clients.get(playerId);
    if (!client) return;

    client.connected = false;

    if (!this._started) {
      // Before game start: remove from room entirely
      this._clients.delete(playerId);
      this._broadcast({ type: "player_left", playerId });
    } else {
      // During game: mark disconnected, AI takes over
      this._broadcast({ type: "player_left", playerId });
    }
  }

  /** Reconnect a player (same PlayerId). */
  reconnectPlayer(playerId: PlayerId, send: (msg: ServerMessage) => void): boolean {
    const client = this._clients.get(playerId);
    if (!client) return false;

    client.send = send;
    client.connected = true;

    // Send current room info
    client.send({
      type: "room_info",
      roomId: this.id,
      assignedPlayerId: playerId,
      players: this._getRoomPlayers(),
    });

    // If game is running, send current state snapshot
    if (this._sim) {
      client.send({
        type: "state_snapshot",
        state: this._sim.getSnapshot(),
        tick: this._sim.state.tick,
      });
    }

    this._broadcastExcept(playerId, {
      type: "player_joined",
      playerId,
      slot: playerId,
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // Action handling
  // ---------------------------------------------------------------------------

  /** Process a player action. Returns error string or null on success. */
  handleAction(playerId: PlayerId, action: PlayerAction): string | null {
    if (!this._state || !this._started) return "Game not started";

    const client = this._clients.get(playerId);
    if (!client || !client.connected) return "Not connected";

    // Handle meta-actions
    if (action.type === "set_ready") {
      client.ready = true;
      this._checkAllReady();
      return null;
    }

    if (action.type === "skip_prep") {
      // Only host (p1) can skip prep
      if (playerId === "p1") {
        this._state.phaseTimer = 0;
      }
      return null;
    }

    // Validate game actions
    const error = validateAction(this._state, playerId, action);
    if (error) return error;

    // Apply action to authoritative state
    this._applyAction(playerId, action);

    // Broadcast updated state snapshot after PREP actions
    if (this._state.phase === GamePhase.PREP && this._sim) {
      this._broadcastSnapshot();
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Game lifecycle
  // ---------------------------------------------------------------------------

  /** Initialize the game state and wait for players to ready up. */
  initGame(): void {
    if (this._started) return;

    const mapWidth = this.maxPlayers <= 2
      ? BalanceConfig.GRID_WIDTH
      : BalanceConfig.GRID_WIDTH * 2;
    const mapHeight = this.maxPlayers <= 2
      ? BalanceConfig.GRID_HEIGHT
      : BalanceConfig.GRID_HEIGHT * 2;

    this._state = createGameState(
      mapWidth,
      mapHeight,
      Date.now(),
      0, // GameMode.STANDARD
      this.maxPlayers,
    );

    // Create player states
    const slots: Array<{ id: PlayerId; dir: Direction; slot: "nw" | "ne" | "sw" | "se" }> = [
      { id: "p1", dir: Direction.EAST, slot: "nw" },
      { id: "p2", dir: Direction.WEST, slot: "se" },
      { id: "p3", dir: Direction.WEST, slot: "ne" },
      { id: "p4", dir: Direction.EAST, slot: "sw" },
    ];

    for (let i = 0; i < this.maxPlayers; i++) {
      const s = slots[i];
      const isAI = !this._clients.has(s.id);
      this._state.players.set(
        s.id,
        createPlayerState(s.id, s.dir, BalanceConfig.START_GOLD, s.slot, isAI),
      );
    }

    // Set up base positions
    const configs = this._computeBasePositions(mapWidth, mapHeight);
    initBasesMulti(this._state, configs);

    // Create sim runner
    this._sim = new SimRunner(this._state);

    this._sim.onSnapshot((snapshot, tick) => {
      this._broadcast({ type: "state_snapshot", state: snapshot, tick });
    });

    this._sim.onPhaseChange((phase, timer) => {
      this._broadcast({ type: "phase_changed", phase, phaseTimer: timer });
    });

    this._sim.onGameOver((winnerId) => {
      this._broadcast({ type: "game_over", winnerId });
    });

    // Send initial snapshot to all players
    this._broadcastSnapshot();
  }

  /** Start the simulation (called when all human players are ready). */
  startSim(): void {
    if (!this._sim || this._started) return;
    this._started = true;
    this._sim.start();
  }

  /** Destroy the room and clean up. */
  destroy(): void {
    this._destroyed = true;
    this._sim?.stop();
    this._clients.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _applyAction(playerId: PlayerId, action: PlayerAction): void {
    if (!this._state) return;
    const player = this._state.players.get(playerId);
    if (!player) return;

    switch (action.type) {
      case "place_building":
        confirmPlacement(
          this._state,
          action.buildingType,
          action.x,
          action.y,
          playerId,
        );
        break;

      case "queue_unit": {
        const unitDef = UNIT_DEFINITIONS[action.unitType];
        if (unitDef && player.gold >= unitDef.cost) {
          player.gold -= unitDef.cost;
          addToQueue(this._state, action.buildingId, action.unitType);
          EventBus.emit("goldChanged", { playerId, amount: player.gold });
        }
        break;
      }

      case "buy_upgrade":
        UpgradeSystem.purchaseUpgrade(this._state, playerId, action.upgradeType);
        break;

      case "place_flag": {
        const FLAG_COST = 100;
        if (player.gold >= FLAG_COST) {
          player.gold -= FLAG_COST;
          this._state.rallyFlags.set(playerId, { x: action.x, y: action.y });
          EventBus.emit("goldChanged", { playerId, amount: player.gold });
          EventBus.emit("flagPlaced", {
            playerId,
            position: { x: action.x, y: action.y },
          });
        }
        break;
      }

      case "toggle_queue": {
        const building = this._state.buildings.get(action.buildingId);
        if (building && building.owner === playerId) {
          building.spawnQueue.queueEnabled = !building.spawnQueue.queueEnabled;
          if (!building.spawnQueue.queueEnabled) {
            building.spawnQueue.readyUnits = [];
          }
        }
        break;
      }
    }
  }

  private _checkAllReady(): void {
    // Check if all connected human players are ready
    for (const client of this._clients.values()) {
      if (client.connected && !client.ready) return;
    }
    // All ready — start the game
    if (this._sim && !this._started) {
      this.startSim();
    }
  }

  private _broadcastSnapshot(): void {
    if (!this._sim) return;
    const snapshot = this._sim.getSnapshot();
    const tick = this._sim.state.tick;
    this._broadcast({ type: "state_snapshot", state: snapshot, tick });
  }

  private _broadcast(msg: ServerMessage): void {
    for (const client of this._clients.values()) {
      if (client.connected) {
        client.send(msg);
      }
    }
  }

  private _broadcastExcept(excludeId: PlayerId, msg: ServerMessage): void {
    for (const client of this._clients.values()) {
      if (client.connected && client.playerId !== excludeId) {
        client.send(msg);
      }
    }
  }

  private _getRoomPlayers(): RoomPlayer[] {
    return [...this._clients.values()].map((c) => ({
      playerId: c.playerId,
      ready: c.ready,
      connected: c.connected,
    }));
  }

  private _computeBasePositions(w: number, h: number): PlayerBaseConfig[] {
    const configs: PlayerBaseConfig[] = [];

    if (this.maxPlayers <= 2) {
      const midY = Math.floor(h / 2) - 2;
      configs.push({
        playerId: "p1", slot: "nw", direction: Direction.WEST,
        position: { x: 1, y: midY },
        spawnOffset: { ...BalanceConfig.BASE_WEST_SPAWN_OFFSET },
      });
      configs.push({
        playerId: "p2", slot: "se", direction: Direction.EAST,
        position: { x: w - 5, y: midY },
        spawnOffset: { ...BalanceConfig.BASE_EAST_SPAWN_OFFSET },
      });
    } else {
      // Corner layout for 3-4 players
      configs.push({
        playerId: "p1", slot: "nw", direction: Direction.EAST,
        position: { x: 1, y: 1 },
        spawnOffset: { x: 5, y: 2 },
      });
      configs.push({
        playerId: "p2", slot: "se", direction: Direction.WEST,
        position: { x: w - 5, y: h - 5 },
        spawnOffset: { x: -1, y: -1 },
      });
      if (this.maxPlayers >= 3) {
        configs.push({
          playerId: "p3", slot: "ne", direction: Direction.WEST,
          position: { x: w - 5, y: 1 },
          spawnOffset: { x: -1, y: 2 },
        });
      }
      if (this.maxPlayers >= 4) {
        configs.push({
          playerId: "p4", slot: "sw", direction: Direction.EAST,
          position: { x: 1, y: h - 5 },
          spawnOffset: { x: 5, y: -1 },
        });
      }
    }

    return configs;
  }
}
