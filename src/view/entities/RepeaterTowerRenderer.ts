// Repeater tower renderer - enhanced tower with rapid-fire repeater mechanism
// Based on TowerRenderer but with multiple arrow barrels for high attack speed
import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64; // tile size
const TW = 1 * TS; // tower width

// Palette - similar to TowerRenderer but with repeater mechanism colors
const COL_STONE = 0x8b8878;
const COL_STONE_LT = 0xa09d8f;
const COL_STONE_DK = 0x6b6860;
const COL_ROOF = 0x5a2d2d;
const COL_ROOF_DK = 0x3d1515;
const COL_ROOF_LT = 0x6e3838;
const COL_WINDOW = 0x1a1a2e;
const COL_WINDOW_GLOW = 0x334466;
const COL_MOSS = 0x4a6b3a;
const COL_IVY = 0x3a5a2e;
const COL_WOOD = 0x8b6339; // Repeater wood color
const COL_WOOD_DK = 0x6b4226; // Dark wood for repeater frame
const COL_METAL = 0xaaaaaa; // Metal for repeater mechanism
const COL_METAL_DK = 0x666666; // Dark metal for barrels

// Animation timing
const FLAG_SPEED = 3.2;

// ---------------------------------------------------------------------------
// RepeaterTowerRenderer
// ---------------------------------------------------------------------------

export class RepeaterTowerRenderer {
  readonly container = new Container();

  private _base = new Graphics(); // tower body, static details
  private _flag = new Graphics(); // waving flag at the top
  private _repeater = new Graphics(); // repeater weapon system
  private _door = new Graphics(); // side door
  private _torch = new Graphics(); // torch glow (animated)

  private _flagTime = 0;
  private _time = 0;

  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : owner === "p2" ? 0xff4444 : 0xeeeeee;

    this._drawStaticTower();
    this._drawFlag();
    this._drawRepeater();
    this._drawDoorGraphics();
    this._drawTorchGraphics();

    this.container.addChild(this._base);
    this.container.addChild(this._flag);
    this.container.addChild(this._repeater);
    this.container.addChild(this._door);
    this.container.addChild(this._torch);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  setOwner(owner: string | null): void {
    this._playerColor = owner === "p1" ? 0x4488ff : owner === "p2" ? 0xff4444 : 0xeeeeee;
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._flagTime += dt;
    this._updateFlag();
    this._updateTorchGlow();
  }

  // ---------------------------------------------------------------------------
  // Drawing methods
  // ---------------------------------------------------------------------------

  private _drawStaticTower(): void {
    const g = this._base;

    // Tower foundation and lower body
    g.clear();
    
    // Main tower body with stone pattern
    g.fill({ color: COL_STONE });
    g.rect(8, 32, 48, 24);
    
    // Stone brick pattern
    g.stroke({ color: COL_STONE_DK, width: 1 });
    for (let y = 36; y < 52; y += 4) {
      g.moveTo(8, y);
      g.lineTo(56, y);
    }
    
    // Upper tapered section
    g.fill({ color: COL_STONE_LT });
    g.beginPath();
    g.moveTo(12, 24);
    g.lineTo(52, 24);
    g.lineTo(48, 8);
    g.lineTo(16, 8);
    g.closePath();
    g.fill();
    
    // Stone details on upper section
    g.stroke({ color: COL_STONE_DK, width: 1 });
    for (let y = 16; y < 24; y += 3) {
      g.moveTo(16, y);
      g.lineTo(48, y);
    }

    // Crenellated top
    g.fill({ color: COL_ROOF });
    for (let x = 8; x < 56; x += 8) {
      g.rect(x, 4, 4, 4);
    }

    // Conical roof
    g.fill({ color: COL_ROOF_LT });
    g.beginPath();
    g.moveTo(20, 8);
    g.lineTo(40, 8);
    g.lineTo(32, 0);
    g.closePath();
    g.fill();

    // Roof tile lines
    g.stroke({ color: COL_ROOF_DK, width: 1 });
    for (let i = 0; i < 3; i++) {
      const y = 2 + i * 2;
      g.moveTo(22 + i * 3, y);
      g.lineTo(38 - i * 2, y);
    }

    // Windows
    g.fill({ color: COL_WINDOW });
    g.rect(20, 20, 8, 8);
    g.rect(36, 20, 8, 8);
    
    // Window glow
    g.fill({ color: COL_WINDOW_GLOW, alpha: 0.3 });
    g.rect(21, 21, 6, 6);
    g.rect(37, 21, 6, 6);

    // Ivy decoration
    g.stroke({ color: COL_IVY, width: 2 });
    g.beginPath();
    g.moveTo(56, 40);
    g.quadraticCurveTo(60, 30, 58, 20);
    g.stroke();

    // Moss patches
    g.fill({ color: COL_MOSS });
    g.circle(50, 45, 3);
    g.circle(14, 38, 2);
  }

  private _drawFlag(): void {
    const g = this._flag;
    g.clear();
    g.fill({ color: this._playerColor });
    g.rect(TW / 2 - 1, 2, 2, 8);
  }

  private _drawRepeater(): void {
    const g = this._repeater;
    g.clear();

    // Repeater base platform
    g.fill({ color: COL_WOOD });
    g.rect(16, 18, 32, 8);

    // Repeater frame sides
    g.fill({ color: COL_WOOD_DK });
    g.rect(18, 12, 4, 14);
    g.rect(42, 12, 4, 14);

    // Multiple arrow barrels (3 barrels for rapid fire)
    g.fill({ color: COL_METAL });
    g.rect(24, 8, 3, 8); // Left barrel
    g.rect(29, 8, 3, 8); // Middle barrel
    g.rect(34, 8, 3, 8); // Right barrel

    // Barrel details
    g.fill({ color: COL_METAL_DK });
    g.rect(24, 10, 3, 2); // Left barrel detail
    g.rect(29, 10, 3, 2); // Middle barrel detail
    g.rect(34, 10, 3, 2); // Right barrel detail

    // Repeater mechanism (metal parts)
    g.fill({ color: COL_METAL });
    g.rect(22, 14, 20, 4);
    g.circle(32, 16, 3);

    // Arrows loaded in barrels
    g.fill({ color: COL_WOOD });
    g.rect(25, 4, 1, 4); // Left arrow
    g.rect(30, 4, 1, 4); // Middle arrow
    g.rect(35, 4, 1, 4); // Right arrow

    // Arrow tips
    g.fill({ color: COL_METAL_DK });
    g.rect(25, 2, 1, 2); // Left arrow tip
    g.rect(30, 2, 1, 2); // Middle arrow tip
    g.rect(35, 2, 1, 2); // Right arrow tip

    // Repeater support braces
    g.fill({ color: COL_WOOD_DK });
    g.rect(24, 16, 16, 2);
    g.rect(24, 20, 16, 2);
  }

  private _drawDoorGraphics(): void {
    const g = this._door;
    g.clear();
    g.fill({ color: COL_WOOD_DK });
    g.rect(24, 40, 16, 16);
    
    // Door frame
    g.stroke({ color: COL_WOOD, width: 1 });
    g.rect(25, 41, 14, 14);
    
    // Door handle
    g.fill({ color: COL_METAL });
    g.circle(36, 48, 1);
  }

  private _drawTorchGraphics(): void {
    const g = this._torch;
    g.clear();
    
    // Torch bracket
    g.fill({ color: COL_METAL });
    g.rect(4, 28, 3, 6);
    
    // Torch base
    g.fill({ color: COL_WOOD });
    g.rect(5, 34, 1, 4);
  }

  private _updateFlag(): void {
    const wave = Math.sin(this._flagTime * FLAG_SPEED) * 2;
    this._flag.x = Math.cos(wave) * 1.5;
    this._flag.y = Math.sin(this._flagTime * FLAG_SPEED * 2.3) * 0.8 + 2;
  }

  private _updateTorchGlow(): void {
    const flicker = 0.6 + Math.sin(this._time * 8) * 0.4;
    const glowSize = 8 + flicker * 4;
    
    // Draw torch glow
    const g = this._torch;
    g.clear();
    
    // Outer glow
    g.fill({ color: 0xffaa00, alpha: 0.2 * flicker });
    g.circle(5.5, 36, glowSize);
    
    // Middle glow
    g.fill({ color: 0xff6600, alpha: 0.4 * flicker });
    g.circle(5.5, 36, glowSize * 0.6);
    
    // Inner flame
    g.fill({ color: 0xffff00, alpha: flicker });
    g.circle(5.5, 36, glowSize * 0.3);
    
    // Torch bracket (redraw to appear on top)
    g.fill({ color: COL_METAL });
    g.rect(4, 28, 3, 6);
    
    // Torch base
    g.fill({ color: COL_WOOD });
    g.rect(5, 34, 1, 4);
  }
}
