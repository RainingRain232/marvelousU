// Interface for multiplayer network transport.
//
// Implementations: WebSocketAdapter (browser → server), LocalAdapter (offline).
// The ActionDispatcher uses this to send/receive messages.

import type { ClientEnvelope, ServerMessage } from "@net/protocol";

export interface NetworkAdapter {
  /** Send a player action to the server. */
  send(envelope: ClientEnvelope): void;

  /** Register a callback for incoming server messages. */
  onMessage(cb: (msg: ServerMessage) => void): void;

  /** Connect to a game server and join/create a room. */
  connect(serverUrl: string, roomId: string | null): Promise<void>;

  /** Disconnect from the server. */
  disconnect(): void;

  /** Whether the adapter is currently connected. */
  readonly connected: boolean;
}
