// DiabloNetwork.ts — WebSocket multiplayer client for Diablo mode

import type {
  NetworkPlayerData, NetworkMessage, MultiplayerLobby,
} from './DiabloTypes';
import {
  MultiplayerState,
  DiabloMapId, DiabloDifficulty,
} from './DiabloTypes';

export class DiabloNetwork {
  private _ws: WebSocket | null = null;
  private _playerId: string = '';
  private _playerName: string = 'Player';
  private _state: MultiplayerState = MultiplayerState.DISCONNECTED;
  private _lobby: MultiplayerLobby | null = null;
  private _remotePlayers: Map<string, NetworkPlayerData> = new Map();
  private _pingTimer: number = 0;
  private _lastPingTime: number = 0;
  private _ping: number = 0;
  private _messageQueue: NetworkMessage[] = []; // reserved for future batching

  // Reconnection state
  private _shouldReconnect: boolean = true;
  private _reconnectAttempts: number = 0;
  private _maxReconnectAttempts: number = 5;
  private _reconnectTimer: number = 0;
  private _lastServerUrl: string = '';

  // Callbacks
  onPlayerJoin: ((player: NetworkPlayerData) => void) | null = null;
  onPlayerLeave: ((playerId: string) => void) | null = null;
  onPlayerUpdate: ((player: NetworkPlayerData) => void) | null = null;
  onEnemyDamage: ((enemyId: string, damage: number, sourceId: string) => void) | null = null;
  onEnemyKill: ((enemyId: string, killerId: string) => void) | null = null;
  onLootPickup: ((lootId: string, playerId: string) => void) | null = null;
  onChatMessage: ((playerId: string, message: string) => void) | null = null;
  onLobbyUpdate: ((lobby: MultiplayerLobby) => void) | null = null;
  onGameStart: ((mapId: DiabloMapId, difficulty: DiabloDifficulty) => void) | null = null;

  get state(): MultiplayerState { return this._state; }
  get playerId(): string { return this._playerId; }
  get playerName(): string { return this._playerName; }
  get lobby(): MultiplayerLobby | null { return this._lobby; }
  get remotePlayers(): NetworkPlayerData[] { return Array.from(this._remotePlayers.values()); }
  get ping(): number { return this._ping; }
  get isConnected(): boolean { return this._ws !== null && this._ws.readyState === WebSocket.OPEN; }

  connect(serverUrl: string, playerName: string): void {
    if (this._ws) this.disconnect();

    this._playerName = playerName;
    this._playerId = `player-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    this._state = MultiplayerState.CONNECTING;
    this._lastServerUrl = serverUrl;
    this._reconnectAttempts = 0;
    this._shouldReconnect = true;

    try {
      this._ws = new WebSocket(serverUrl);

      this._ws.onopen = () => {
        this._state = MultiplayerState.IN_LOBBY;
        this._reconnectAttempts = 0;
        console.log('[DiabloNet] Connected to server');
      };

      this._ws.onmessage = (event) => {
        try {
          const msg: NetworkMessage = JSON.parse(event.data);
          this._handleMessage(msg);
        } catch (e) {
          console.warn('[DiabloNet] Failed to parse message:', e);
        }
      };

      this._ws.onclose = () => {
        this._state = MultiplayerState.DISCONNECTED;
        console.log('[DiabloNet] Disconnected');

        // Auto-reconnect if we were in a game
        if (this._shouldReconnect && this._reconnectAttempts < this._maxReconnectAttempts) {
          this._reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this._reconnectAttempts - 1), 30000);
          console.log(`[DiabloNet] Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts})`);
          this._state = MultiplayerState.CONNECTING;
          this._reconnectTimer = window.setTimeout(() => {
            if (this._lastServerUrl) {
              this.connect(this._lastServerUrl, this._playerName);
            }
          }, delay);
        } else {
          this._remotePlayers.clear();
          this._lobby = null;
        }
      };

      this._ws.onerror = (e) => {
        console.error('[DiabloNet] WebSocket error:', e);
        this._state = MultiplayerState.DISCONNECTED;
      };
    } catch (e) {
      console.error('[DiabloNet] Connection failed:', e);
      this._state = MultiplayerState.DISCONNECTED;
    }
  }

  disconnect(): void {
    this._shouldReconnect = false;
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._state = MultiplayerState.DISCONNECTED;
    this._remotePlayers.clear();
    this._lobby = null;
  }

  // Send player position/state update (throttled to ~20Hz)
  sendPlayerUpdate(data: NetworkPlayerData): void {
    this._send({ type: 'player_update', data });
  }

  sendEnemyDamage(enemyId: string, damage: number): void {
    this._send({ type: 'enemy_damage', data: { enemyId, damage, sourceId: this._playerId } });
  }

  sendEnemyKill(enemyId: string): void {
    this._send({ type: 'enemy_kill', data: { enemyId, killerId: this._playerId } });
  }

  sendLootPickup(lootId: string): void {
    this._send({ type: 'loot_pickup', data: { lootId, playerId: this._playerId } });
  }

  sendChatMessage(message: string): void {
    this._send({ type: 'chat_message', data: { playerId: this._playerId, message } });
  }

  // Called each frame to handle ping
  update(dt: number): void {
    this._pingTimer += dt;
    if (this._pingTimer > 2) { // Ping every 2 seconds
      this._pingTimer = 0;
      this._lastPingTime = performance.now();
      this._send({ type: 'ping', data: { timestamp: this._lastPingTime } });
    }
  }

  private _send(msg: NetworkMessage): void {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(msg));
    }
  }

  private _handleMessage(msg: NetworkMessage): void {
    switch (msg.type) {
      case 'player_update':
        if (msg.data.id !== this._playerId) {
          this._remotePlayers.set(msg.data.id, msg.data);
          this.onPlayerUpdate?.(msg.data);
        }
        break;

      case 'player_join':
        this._remotePlayers.set(msg.data.player.id, msg.data.player);
        this.onPlayerJoin?.(msg.data.player);
        break;

      case 'player_leave':
        this._remotePlayers.delete(msg.data.playerId);
        this.onPlayerLeave?.(msg.data.playerId);
        break;

      case 'enemy_damage':
        this.onEnemyDamage?.(msg.data.enemyId, msg.data.damage, msg.data.sourceId);
        break;

      case 'enemy_kill':
        this.onEnemyKill?.(msg.data.enemyId, msg.data.killerId);
        break;

      case 'loot_pickup':
        this.onLootPickup?.(msg.data.lootId, msg.data.playerId);
        break;

      case 'chat_message':
        this.onChatMessage?.(msg.data.playerId, msg.data.message);
        break;

      case 'lobby_update':
        this._lobby = msg.data;
        this.onLobbyUpdate?.(msg.data);
        break;

      case 'game_start':
        this._state = MultiplayerState.IN_GAME;
        this.onGameStart?.(msg.data.mapId, msg.data.difficulty);
        break;

      case 'pong':
        this._ping = Math.round(performance.now() - msg.data.timestamp);
        break;
    }
  }
}
