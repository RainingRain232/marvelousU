// Multiplayer game server entry point.
//
// Runs a WebSocket server that manages game rooms.
// Each room has its own GameState + SimRunner running the authoritative sim.
//
// Usage:
//   npx tsx server/index.ts
//   # or with Bun:
//   bun server/index.ts

import { WebSocketServer, type WebSocket } from "ws";
import { GameRoom } from "./GameRoom";
import type { PlayerAction, ServerMessage } from "@net/protocol";
import type { PlayerId } from "@/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ---------------------------------------------------------------------------
// Room registry
// ---------------------------------------------------------------------------

const rooms = new Map<string, GameRoom>();

function findRoom(roomId: string): GameRoom | null {
  return rooms.get(roomId.toUpperCase()) ?? null;
}

function createRoom(playerCount: number): GameRoom {
  const room = new GameRoom(playerCount);
  rooms.set(room.id, room);
  console.log(`[Server] Room ${room.id} created (${playerCount} players)`);
  return room;
}

function destroyRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    room.destroy();
    rooms.delete(roomId);
    console.log(`[Server] Room ${roomId} destroyed`);
  }
}

// ---------------------------------------------------------------------------
// WebSocket server
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ port: PORT });

console.log(`[Server] Listening on ws://localhost:${PORT}`);

// Per-connection state
interface ClientState {
  roomId: string | null;
  playerId: PlayerId | null;
}

wss.on("connection", (ws: WebSocket) => {
  const clientState: ClientState = { roomId: null, playerId: null };

  const sendMsg = (msg: ServerMessage): void => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  ws.on("message", (raw: Buffer | string) => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(typeof raw === "string" ? raw : raw.toString("utf8"));
    } catch {
      return; // Ignore malformed JSON
    }

    const kind = data.kind as string;

    // --- Heartbeat ---
    if (kind === "ping") {
      ws.send(JSON.stringify({ kind: "pong" }));
      return;
    }

    // --- Room management ---
    if (kind === "room") {
      const roomType = data.type as string;

      if (roomType === "create_room") {
        const playerCount = (data.playerCount as number) ?? 2;
        const room = createRoom(playerCount);
        room.initGame();
        const playerId = room.addPlayer(sendMsg);
        if (playerId) {
          clientState.roomId = room.id;
          clientState.playerId = playerId;
        }
        return;
      }

      if (roomType === "join_room") {
        const roomId = (data.roomId as string)?.toUpperCase();
        if (!roomId) {
          sendMsg({ type: "error", message: "Missing room ID" });
          return;
        }

        const room = findRoom(roomId);
        if (!room) {
          sendMsg({ type: "error", message: "Room not found" });
          return;
        }

        // Try reconnect first
        if (clientState.playerId && room.reconnectPlayer(clientState.playerId, sendMsg)) {
          clientState.roomId = room.id;
          return;
        }

        const playerId = room.addPlayer(sendMsg);
        if (!playerId) {
          sendMsg({ type: "error", message: "Room is full" });
          return;
        }

        clientState.roomId = room.id;
        clientState.playerId = playerId;
        return;
      }
    }

    // --- Game actions ---
    if (kind === "action") {
      if (!clientState.roomId || !clientState.playerId) {
        sendMsg({ type: "error", message: "Not in a room" });
        return;
      }

      const room = findRoom(clientState.roomId);
      if (!room) {
        sendMsg({ type: "error", message: "Room no longer exists" });
        return;
      }

      const action = data.action as PlayerAction;
      const seq = (data.seq as number) ?? 0;

      const error = room.handleAction(clientState.playerId, action);
      sendMsg({
        type: "action_ack",
        seq,
        success: error === null,
        error: error ?? undefined,
      });
    }
  });

  ws.on("close", () => {
    if (clientState.roomId && clientState.playerId) {
      const room = findRoom(clientState.roomId);
      if (room) {
        room.removePlayer(clientState.playerId);

        // Destroy empty rooms
        if (room.playerCount === 0) {
          destroyRoom(clientState.roomId);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Cleanup stale rooms periodically
// ---------------------------------------------------------------------------

setInterval(() => {
  for (const [id, room] of rooms) {
    if (room.playerCount === 0) {
      destroyRoom(id);
    }
  }
}, 60000); // Every minute
