import type { TekkenFighter } from "../state/TekkenState";

export class TekkenInputSystem {
  private _keys = new Set<string>();
  private _keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyupHandler: ((e: KeyboardEvent) => void) | null = null;
  private _frameCount = 0;

  init(): void {
    this._keydownHandler = (e: KeyboardEvent) => {
      this._keys.add(e.code);
      e.preventDefault();
    };
    this._keyupHandler = (e: KeyboardEvent) => {
      this._keys.delete(e.code);
    };
    window.addEventListener("keydown", this._keydownHandler);
    window.addEventListener("keyup", this._keyupHandler);
  }

  destroy(): void {
    if (this._keydownHandler) window.removeEventListener("keydown", this._keydownHandler);
    if (this._keyupHandler) window.removeEventListener("keyup", this._keyupHandler);
  }

  update(fighter: TekkenFighter): void {
    this._frameCount++;
    const input = fighter.input;

    // Read raw keys
    input.left = this._keys.has("ArrowLeft");
    input.right = this._keys.has("ArrowRight");
    input.up = this._keys.has("ArrowUp");
    input.down = this._keys.has("ArrowDown");
    input.lp = this._keys.has("KeyU");
    input.rp = this._keys.has("KeyI");
    input.lk = this._keys.has("KeyJ");
    input.rk = this._keys.has("KeyK");
    input.rage = this._keys.has("KeyO");

    // Resolve directional notation relative to facing
    const fwd = fighter.facingRight ? input.right : input.left;
    const back = fighter.facingRight ? input.left : input.right;
    const down = input.down;
    const up = input.up;

    let direction = "n";
    if (down && fwd) direction = "d/f";
    else if (down && back) direction = "d/b";
    else if (up && fwd) direction = "u/f";
    else if (up && back) direction = "u/b";
    else if (down) direction = "d";
    else if (up) direction = "u";
    else if (fwd) direction = "f";
    else if (back) direction = "b";

    // Collect pressed buttons
    const buttons: string[] = [];
    if (input.lp) buttons.push("lp");
    if (input.rp) buttons.push("rp");
    if (input.lk) buttons.push("lk");
    if (input.rk) buttons.push("rk");
    if (input.rage) buttons.push("rage");

    // Add to input buffer
    if (buttons.length > 0 || direction !== "n") {
      fighter.inputBuffer.push({ direction, buttons, frame: this._frameCount });
      // Trim old buffer entries (keep last 30 frames)
      while (fighter.inputBuffer.length > 30) {
        fighter.inputBuffer.shift();
      }
    }

    // Set crouching state
    fighter.crouching = down && !up;
  }
}
