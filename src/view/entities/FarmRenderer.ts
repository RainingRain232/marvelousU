// Procedural farm renderer for BuildingView.
//
// Draws a detailed 2x2 medieval fantasy farm with:
//   • Golden grain field with wheat tufts
//   • Winding brown dirt road
//   • Stone farmhouse with wooden roof
//   • Defensive watchtower with player-colored flag
//   • Animated swaying scarecrow
//   • Wooden cart with an animated flapping raven
//
// Animations are driven by `tick(dt)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64; // tile size
const FW = 2 * TS; // farm width
const FH = 2 * TS; // farm height

// Palette
const COL_GRAIN = 0xd4af37;
const COL_GRAIN_LT = 0xe5c158;
const COL_ROAD = 0x8b5a2b;
const COL_STONE = 0x8b8878;
const COL_STONE_DK = 0x6b6860;
const COL_WOOD = 0x5d3a1a;
const COL_ROOF = 0x4a3728;
const COL_FLAG_P1 = 0x4488ff;
const COL_FLAG_P2 = 0xff4444;
const COL_SCARECROW = 0xccaa44;
const COL_RAVEN = 0x222222;

// ---------------------------------------------------------------------------
// FarmRenderer
// ---------------------------------------------------------------------------

export class FarmRenderer {
    readonly container = new Container();

    private _ground = new Graphics();
    private _house = new Graphics();
    private _tower = new Graphics();
    private _scarecrow = new Graphics();
    private _cart = new Graphics();
    private _raven = new Graphics();
    private _flag = new Graphics();

    private _time = 0;
    private _ravenTimer = 0;
    private _playerColor: number;

    constructor(owner: string | null) {
        this._playerColor = owner === "p1" ? COL_FLAG_P1 : COL_FLAG_P2;

        this._drawGround();
        this._drawHouse();
        this._drawTower();
        this._drawScarecrow();
        this._drawCart();
        this._drawRaven();

        this.container.addChild(this._ground);
        this.container.addChild(this._house);
        this.container.addChild(this._tower);
        this.container.addChild(this._cart);
        this.container.addChild(this._scarecrow);
        this.container.addChild(this._raven);

        // Add flag as child of tower
        this._tower.addChild(this._flag);
    }

    tick(dt: number, _phase: GamePhase): void {
        this._time += dt;

        // 1. Scarecrow sway
        const sway = Math.sin(this._time * 2.5) * 0.15;
        this._scarecrow.rotation = sway;

        // 2. Raven wing flap
        this._ravenTimer += dt;
        const isFlapping = (Math.floor(this._time * 0.5) % 3 === 0); // flap every 6 seconds for a bit
        this._updateRaven(this._time, isFlapping);

        // 3. Flag wave
        this._updateFlag(this._time);
    }

    private _drawGround(): void {
        const g = this._ground;
        // Central oval field (slightly oversized for organic feel)
        g.ellipse(FW / 2, FH / 2, FW * 0.55, FH * 0.45).fill({ color: COL_GRAIN });
        // Secondary overlapping ellipse for irregularity
        g.ellipse(FW * 0.45, FH * 0.5, FW * 0.5, FH * 0.48).fill({ color: COL_GRAIN });

        // Tufts of wheat (distributed across the oval area)
        for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * (FW * 0.4);
            const tx = FW / 2 + Math.cos(angle) * dist * 1.2;
            const ty = FH / 2 + Math.sin(angle) * dist;
            g.moveTo(tx, ty).lineTo(tx + (Math.random() - 0.5) * 2, ty - 4 - Math.random() * 2).stroke({ color: COL_GRAIN_LT, width: 1.5 });
        }

        // Road from house entrance down
        g.moveTo(45, 65)
            .bezierCurveTo(45, 90, 30, 100, 30, 140)
            .stroke({ color: COL_ROAD, width: 14 });
    }

    private _drawHouse(): void {
        const g = this._house;
        const hX = 20, hY = 20;
        const hW = 55, hH = 45;

        // Walls
        g.roundRect(hX, hY, hW, hH, 3).fill({ color: COL_STONE }).stroke({ color: COL_STONE_DK, width: 2 });

        // Roof
        g.moveTo(hX - 6, hY + 4)
            .lineTo(hX + hW / 2, hY - 20)
            .lineTo(hX + hW + 6, hY + 4)
            .closePath()
            .fill({ color: COL_ROOF })
            .stroke({ color: COL_WOOD, width: 1.5 });

        // Door
        g.rect(hX + hH / 2 + 2, hY + hH - 18, 12, 18).fill({ color: COL_WOOD });

        // Windows
        const winCol = 0x1a1a2e;
        g.rect(hX + 8, hY + 12, 8, 8).fill({ color: winCol });
        g.rect(hX + hW - 16, hY + 12, 8, 8).fill({ color: winCol });
    }

    private _drawTower(): void {
        const g = this._tower;
        const tX = 82, tY = 10;
        const tW = 25, tH = 65;

        // Tower body
        g.rect(tX, tY, tW, tH).fill({ color: COL_STONE }).stroke({ color: COL_STONE_DK, width: 2.5 });

        // Door (at base)
        g.rect(tX + tW / 2 - 4, tY + tH - 12, 8, 12).fill({ color: COL_WOOD });

        // Window (arched, similar to main tower)
        const wX = tX + tW / 2 - 4;
        const wY = tY + 18;
        const wW = 8;
        const wH = 12;
        const winCol = 0x1a1a2e;
        g.rect(wX, wY, wW, wH).fill({ color: winCol });
        g.ellipse(wX + wW / 2, wY, wW / 2, 3).fill({ color: winCol }); // Arched top
        g.rect(wX - 1, wY + wH, wW + 2, 2).fill({ color: COL_STONE_DK }); // Ledge

        // Crenellations
        for (let i = 0; i < 3; i++) {
            g.rect(tX + i * 9, tY - 6, 6, 6).fill({ color: COL_STONE });
        }

        // Flag pole
        g.moveTo(tX + tW / 2, tY).lineTo(tX + tW / 2, tY - 20).stroke({ color: 0x999999, width: 2 });

        this._flag.position.set(tX + tW / 2, tY - 20);
    }

    private _updateFlag(time: number): void {
        const g = this._flag;
        g.clear();
        const wave = Math.sin(time * 3) * 2;
        g.moveTo(0, 0)
            .lineTo(12, 4 + wave)
            .lineTo(0, 8)
            .fill({ color: this._playerColor });
    }

    private _drawScarecrow(): void {
        const g = this._scarecrow;
        const sX = 100, sY = 95;

        // Pole
        g.moveTo(0, 0).lineTo(0, 25).stroke({ color: COL_WOOD, width: 2.5 });
        // Cross
        g.moveTo(-15, 8).lineTo(15, 8).stroke({ color: COL_WOOD, width: 2 });
        // Rag head
        g.circle(0, 0, 6).fill({ color: COL_SCARECROW });
        // Tattered shirt
        g.moveTo(-12, 8).lineTo(12, 8).lineTo(8, 22).lineTo(-8, 22).closePath().fill({ color: 0x556677 });

        this._scarecrow.position.set(sX, sY);
    }

    private _drawCart(): void {
        const g = this._cart;
        const cX = 45, cY = 110;
        const COL_CART_BODY = 0x7a4d2e; // Warmer wood
        const COL_WHEEL = 0x3d2b1f;    // Darker wood/iron

        // Wheels
        g.circle(cX - 12, cY + 6, 8).stroke({ color: COL_WHEEL, width: 3 });
        g.circle(cX + 12, cY + 6, 8).stroke({ color: COL_WHEEL, width: 3 });
        // Cart body
        g.rect(cX - 18, cY - 12, 36, 16).fill({ color: COL_CART_BODY }).stroke({ color: COL_WOOD, width: 1.5 });
        // Hay in cart
        g.roundRect(cX - 16, cY - 18, 32, 10, 4).fill({ color: COL_GRAIN });
    }

    private _drawRaven(): void {
        const rX = 45, rY = 94;
        this._raven.position.set(rX, rY);
        this._updateRaven(0, false);
    }

    private _updateRaven(time: number, flapping: boolean): void {
        const g = this._raven;
        g.clear();

        // Body
        g.ellipse(0, 0, 3, 2).fill({ color: COL_RAVEN });
        // Head
        g.circle(2, -1, 1.5).fill({ color: COL_RAVEN });

        // Wings
        const flap = flapping ? Math.sin(time * 15) * 5 : 0;
        // Left wing
        g.moveTo(0, 0).lineTo(-4, -2 - flap).lineTo(-2, 0).fill({ color: COL_RAVEN });
        // Right wing
        g.moveTo(0, 0).lineTo(-4, 0 + flap).lineTo(-2, 1).fill({ color: COL_RAVEN });
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
