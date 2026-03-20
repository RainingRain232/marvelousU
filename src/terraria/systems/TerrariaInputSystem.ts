// ---------------------------------------------------------------------------
// Terraria – Input system (keyboard + mouse)
// ---------------------------------------------------------------------------

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  sprint: boolean;
  attack: boolean;      // left mouse held
  place: boolean;       // right mouse held
  mouseX: number;       // screen pixels
  mouseY: number;
  inventory: boolean;   // toggled
  escape: boolean;
  hotbar: number;       // -1 = no change, 0-8 = slot select
  scrollDelta: number;
  dodge: boolean;       // Q key
  interact: boolean;    // F key
  trade: boolean;       // T key
  use: boolean;         // R key (use consumable)
}

const _keys = new Set<string>();
let _mouseDown = false;
let _rightMouseDown = false;
let _mouseX = 0;
let _mouseY = 0;
let _scrollDelta = 0;
let _inventoryToggle = false;
let _escapeToggle = false;
let _hotbarPress = -1;
let _dodgePress = false;
let _interactPress = false;
let _tradePress = false;
let _usePress = false;

function _onKeyDown(e: KeyboardEvent): void {
  _keys.add(e.code);
  if (e.code === "KeyE") _inventoryToggle = true;
  if (e.code === "Escape") _escapeToggle = true;
  if (e.code === "KeyQ") _dodgePress = true;
  if (e.code === "KeyF") _interactPress = true;
  if (e.code === "KeyT") _tradePress = true;
  if (e.code === "KeyR") _usePress = true;
  if (e.code >= "Digit1" && e.code <= "Digit9") _hotbarPress = parseInt(e.code[5]) - 1;
  // Prevent browser defaults for game keys
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
    e.preventDefault();
  }
}

function _onKeyUp(e: KeyboardEvent): void {
  _keys.delete(e.code);
}

function _onMouseDown(e: MouseEvent): void {
  if (e.button === 0) _mouseDown = true;
  if (e.button === 2) _rightMouseDown = true;
}

function _onMouseUp(e: MouseEvent): void {
  if (e.button === 0) _mouseDown = false;
  if (e.button === 2) _rightMouseDown = false;
}

function _onMouseMove(e: MouseEvent): void {
  _mouseX = e.clientX;
  _mouseY = e.clientY;
}

function _onWheel(e: WheelEvent): void {
  _scrollDelta += Math.sign(e.deltaY);
  e.preventDefault();
}

function _onContextMenu(e: Event): void {
  e.preventDefault();
}

export function initInput(): void {
  window.addEventListener("keydown", _onKeyDown);
  window.addEventListener("keyup", _onKeyUp);
  window.addEventListener("mousedown", _onMouseDown);
  window.addEventListener("mouseup", _onMouseUp);
  window.addEventListener("mousemove", _onMouseMove);
  window.addEventListener("wheel", _onWheel, { passive: false });
  window.addEventListener("contextmenu", _onContextMenu);
}

export function destroyInput(): void {
  window.removeEventListener("keydown", _onKeyDown);
  window.removeEventListener("keyup", _onKeyUp);
  window.removeEventListener("mousedown", _onMouseDown);
  window.removeEventListener("mouseup", _onMouseUp);
  window.removeEventListener("mousemove", _onMouseMove);
  window.removeEventListener("wheel", _onWheel);
  window.removeEventListener("contextmenu", _onContextMenu);
  _keys.clear();
  _mouseDown = false;
  _rightMouseDown = false;
}

export function pollInput(): InputState {
  const state: InputState = {
    left: _keys.has("ArrowLeft") || _keys.has("KeyA"),
    right: _keys.has("ArrowRight") || _keys.has("KeyD"),
    up: _keys.has("ArrowUp") || _keys.has("KeyW"),
    down: _keys.has("ArrowDown") || _keys.has("KeyS"),
    jump: _keys.has("Space") || _keys.has("ArrowUp") || _keys.has("KeyW"),
    sprint: _keys.has("ShiftLeft") || _keys.has("ShiftRight"),
    attack: _mouseDown,
    place: _rightMouseDown,
    mouseX: _mouseX,
    mouseY: _mouseY,
    inventory: _inventoryToggle,
    escape: _escapeToggle,
    hotbar: _hotbarPress,
    scrollDelta: _scrollDelta,
    dodge: _dodgePress,
    interact: _interactPress,
    trade: _tradePress,
    use: _usePress,
  };
  // Reset one-shot states
  _inventoryToggle = false;
  _escapeToggle = false;
  _hotbarPress = -1;
  _scrollDelta = 0;
  _dodgePress = false;
  _interactPress = false;
  _tradePress = false;
  _usePress = false;
  return state;
}
