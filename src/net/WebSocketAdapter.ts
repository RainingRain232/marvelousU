// Browser-side WebSocket adapter implementing NetworkAdapter.
//
// Connects to the game server, sends ClientEnvelopes, receives ServerMessages.
// Handles reconnection with exponential backoff.

import type { NetworkAdapter } from "@net/NetworkAdapter";
import type { ClientEnvelope, ServerMessage, RoomAction } from "@net/protocol";

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 10000;
const HEARTBEAT_INTERVAL_MS = 15000;

export class WebSocketAdapter implements NetworkAdapter {
  private _ws: WebSocket | null = null;
  private _serverUrl = "";
  private _roomId: string | null = null;
  private _onMessageCb: ((msg: ServerMessage) => void) | null = null;
  private _connected = false;
  private _reconnectAttempts = 0;
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _intentionalClose = false;

  get connected(): boolean {
    return this._connected;
  }

  send(envelope: ClientEnvelope): void {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
    this._ws.send(JSON.stringify({ kind: "action", ...envelope }));
  }

  onMessage(cb: (msg: ServerMessage) => void): void {
    this._onMessageCb = cb;
  }

  async connect(serverUrl: string, roomId: string | null): Promise<void> {
    this._serverUrl = serverUrl;
    this._roomId = roomId;
    this._intentionalClose = false;
    this._reconnectAttempts = 0;
    return this._doConnect();
  }

  disconnect(): void {
    this._intentionalClose = true;
    this._stopHeartbeat();
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._connected = false;
  }

  /** Send a room management action (create/join). */
  sendRoomAction(action: RoomAction): void {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
    this._ws.send(JSON.stringify({ kind: "room", ...action }));
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this._ws = new WebSocket(this._serverUrl);
      } catch (err) {
        reject(err);
        return;
      }

      this._ws.onopen = () => {
        this._connected = true;
        this._reconnectAttempts = 0;
        this._startHeartbeat();

        // Auto join/create room on connect
        if (this._roomId) {
          this.sendRoomAction({ type: "join_room", roomId: this._roomId });
        }
        resolve();
      };

      this._ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as ServerMessage;
          this._onMessageCb?.(msg);
        } catch {
          // Ignore malformed messages
        }
      };

      this._ws.onclose = () => {
        this._connected = false;
        this._stopHeartbeat();
        if (!this._intentionalClose) {
          this._scheduleReconnect();
        }
      };

      this._ws.onerror = () => {
        // onclose will fire after onerror, so reconnect is handled there.
        // Only reject the initial connect promise if we haven't connected yet.
        if (!this._connected) {
          reject(new Error("WebSocket connection failed"));
        }
      };
    });
  }

  private _scheduleReconnect(): void {
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this._reconnectAttempts),
      RECONNECT_MAX_MS,
    );
    this._reconnectAttempts++;
    setTimeout(() => {
      if (this._intentionalClose) return;
      this._doConnect().catch(() => {
        // Reconnect will be rescheduled by onclose
      });
    }, delay);
  }

  private _startHeartbeat(): void {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      if (this._ws?.readyState === WebSocket.OPEN) {
        this._ws.send(JSON.stringify({ kind: "ping" }));
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private _stopHeartbeat(): void {
    if (this._heartbeatTimer !== null) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }
}
