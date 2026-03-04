// Client-side room manager — handles lobby state, room join/create,
// snapshot application, and action dispatching for online multiplayer.
//
// This is the single entry point the client uses for all multiplayer logic.
// It owns the WebSocketAdapter and bridges between the network and the game.

import type { GameState } from "@sim/state/GameState";
import type { PlayerId } from "@/types";
import { GamePhase } from "@/types";
import { WebSocketAdapter } from "@net/WebSocketAdapter";
import { applySnapshot } from "@net/serialization";
import { diffSnapshots } from "@net/SnapshotDiffer";
import type {
  PlayerAction,
  ServerMessage,
  RoomPlayer,
  SerializedGameState,
} from "@net/protocol";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoomStatus = "disconnected" | "connecting" | "lobby" | "playing";

export interface RoomManagerCallbacks {
  /** Called when a state snapshot is received and applied. */
  onSnapshot?: (tick: number) => void;
  /** Called when room info changes (player joined/left/ready). */
  onRoomUpdate?: (players: RoomPlayer[]) => void;
  /** Called when the game phase changes. */
  onPhaseChange?: (phase: GamePhase, timer: number) => void;
  /** Called when the game ends. */
  onGameOver?: (winnerId: string | null) => void;
  /** Called on connection status change. */
  onStatusChange?: (status: RoomStatus) => void;
  /** Called on error. */
  onError?: (message: string) => void;
}

// ---------------------------------------------------------------------------
// RoomManager
// ---------------------------------------------------------------------------

export class RoomManager {
  private _adapter = new WebSocketAdapter();
  private _state: GameState | null = null;
  private _status: RoomStatus = "disconnected";
  private _roomId: string | null = null;
  private _localPlayerId: PlayerId | null = null;
  private _players: RoomPlayer[] = [];
  private _callbacks: RoomManagerCallbacks = {};
  private _seq = 0;
  private _lastSnapshot: SerializedGameState | null = null;

  get status(): RoomStatus {
    return this._status;
  }

  get roomId(): string | null {
    return this._roomId;
  }

  get localPlayerId(): PlayerId | null {
    return this._localPlayerId;
  }

  get players(): RoomPlayer[] {
    return this._players;
  }

  get connected(): boolean {
    return this._adapter.connected;
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  /** Bind to a live GameState that snapshots will be applied to. */
  bindState(state: GameState): void {
    this._state = state;
  }

  /** Register callbacks. */
  on(callbacks: RoomManagerCallbacks): void {
    this._callbacks = { ...this._callbacks, ...callbacks };
  }

  // ---------------------------------------------------------------------------
  // Connection
  // ---------------------------------------------------------------------------

  /** Connect to the server and create a new room. */
  async createRoom(serverUrl: string, playerCount: number): Promise<void> {
    this._setStatus("connecting");
    this._adapter.onMessage((msg) => this._handleMessage(msg));

    try {
      await this._adapter.connect(serverUrl, null);
    } catch {
      this._setStatus("disconnected");
      this._callbacks.onError?.("Failed to connect to server");
      return;
    }

    this._adapter.sendRoomAction({ type: "create_room", playerCount });
  }

  /** Connect to the server and join an existing room. */
  async joinRoom(serverUrl: string, roomId: string): Promise<void> {
    this._setStatus("connecting");
    this._adapter.onMessage((msg) => this._handleMessage(msg));

    try {
      await this._adapter.connect(serverUrl, null);
    } catch {
      this._setStatus("disconnected");
      this._callbacks.onError?.("Failed to connect to server");
      return;
    }

    this._adapter.sendRoomAction({ type: "join_room", roomId });
  }

  /** Disconnect from the server. */
  disconnect(): void {
    this._adapter.disconnect();
    this._setStatus("disconnected");
    this._roomId = null;
    this._localPlayerId = null;
    this._players = [];
    this._lastSnapshot = null;
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /** Send a player action to the server. */
  dispatch(action: PlayerAction): void {
    this._adapter.send({ action, seq: ++this._seq });
  }

  /** Mark this player as ready. */
  setReady(): void {
    this.dispatch({ type: "set_ready" });
  }

  /** Request to skip the remaining prep time (host only). */
  skipPrep(): void {
    this.dispatch({ type: "skip_prep" });
  }

  // ---------------------------------------------------------------------------
  // Message handling
  // ---------------------------------------------------------------------------

  private _handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case "room_info":
        this._roomId = msg.roomId;
        this._localPlayerId = msg.assignedPlayerId;
        this._players = msg.players;
        this._setStatus("lobby");
        this._callbacks.onRoomUpdate?.(this._players);
        break;

      case "state_snapshot":
        this._applySnapshot(msg.state, msg.tick);
        break;

      case "phase_changed":
        this._callbacks.onPhaseChange?.(msg.phase, msg.phaseTimer);
        if (msg.phase === GamePhase.BATTLE || msg.phase === GamePhase.PREP) {
          this._setStatus("playing");
        }
        break;

      case "game_over":
        this._callbacks.onGameOver?.(msg.winnerId);
        break;

      case "player_joined":
        this._updatePlayer(msg.playerId, true);
        this._callbacks.onRoomUpdate?.(this._players);
        break;

      case "player_left":
        this._updatePlayer(msg.playerId, false);
        this._callbacks.onRoomUpdate?.(this._players);
        break;

      case "action_ack":
        if (!msg.success && msg.error) {
          this._callbacks.onError?.(msg.error);
        }
        break;

      case "error":
        this._callbacks.onError?.(msg.message);
        break;
    }
  }

  private _applySnapshot(snapshot: SerializedGameState, tick: number): void {
    if (!this._state) return;

    // Derive EventBus events by diffing with previous snapshot
    if (this._lastSnapshot) {
      diffSnapshots(this._lastSnapshot, snapshot);
    }
    this._lastSnapshot = snapshot;

    // Apply snapshot to live state
    applySnapshot(this._state, snapshot);
    this._callbacks.onSnapshot?.(tick);
  }

  private _updatePlayer(playerId: PlayerId, connected: boolean): void {
    const existing = this._players.find((p) => p.playerId === playerId);
    if (existing) {
      existing.connected = connected;
    } else if (connected) {
      this._players.push({ playerId, ready: false, connected: true });
    }
  }

  private _setStatus(status: RoomStatus): void {
    if (this._status !== status) {
      this._status = status;
      this._callbacks.onStatusChange?.(status);
    }
  }
}
