// Interface for multiplayer sync (lockstep or state sync) — future
export interface NetworkAdapter {
  sendInput(input: unknown): void;
  onRemoteInput(cb: (input: unknown) => void): void;
  connect(roomId: string): Promise<void>;
  disconnect(): void;
}
