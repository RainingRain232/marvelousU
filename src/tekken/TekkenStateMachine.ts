import { TekkenPhase } from "../types";

export class TekkenStateMachine {
  private _phase: TekkenPhase;
  private _listeners: Array<(from: TekkenPhase, to: TekkenPhase) => void> = [];

  constructor(initial: TekkenPhase) {
    this._phase = initial;
  }

  get phase(): TekkenPhase { return this._phase; }

  transition(to: TekkenPhase): void {
    const from = this._phase;
    this._phase = to;
    for (const cb of this._listeners) cb(from, to);
  }

  onTransition(cb: (from: TekkenPhase, to: TekkenPhase) => void): void {
    this._listeners.push(cb);
  }

  removeListener(cb: (from: TekkenPhase, to: TekkenPhase) => void): void {
    const idx = this._listeners.indexOf(cb);
    if (idx >= 0) this._listeners.splice(idx, 1);
  }
}
