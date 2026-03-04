// Procedural farm renderer for BuildingView.
//
// Draws a detailed 2x2 medieval fantasy farm with:
//   • Golden grain field with detailed wheat stalks and seed heads
//   • Winding brown dirt road with ruts
//   • Stone farmhouse with timber frame, chimney, and detailed roof
//   • Defensive watchtower with stone bricks, arrow slit, crenellations
//   • Animated scarecrow with pumpkin head (eyes + smile), tattered clothes
//   • Detailed wooden cart with spoked wheels, planks, and hay
//   • Larger animated crow perched on cart
//   • Player-colored flag with wave animation
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
const COL_GRAIN_DK = 0xb89530;
const COL_WHEAT_HEAD = 0xccaa22;
const COL_WHEAT_STEM = 0x8a7a30;
const COL_ROAD = 0x8b5a2b;
const COL_ROAD_DK = 0x6a4420;
const COL_STONE = 0x8b8878;
const COL_STONE_DK = 0x6b6860;
const COL_STONE_LT = 0xa09d8f;
const COL_WOOD = 0x5d3a1a;
const COL_WOOD_DK = 0x3d2510;
const COL_WOOD_LT = 0x7a5a3a;
const COL_ROOF = 0x4a3728;
const COL_ROOF_LT = 0x5a4738;
const COL_FLAG_P1 = 0x4488ff;
const COL_FLAG_P2 = 0xff4444;
const COL_FLAG_NEUTRAL = 0xeeeeee;
const COL_PUMPKIN = 0xe87820;
const COL_PUMPKIN_DK = 0xc06018;
const COL_PUMPKIN_EYE = 0x221100;
const COL_RAVEN = 0x222222;
const COL_RAVEN_HL = 0x333344;
const COL_CHIMNEY = 0x6a6058;

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
        this._playerColor = owner === "p1" ? COL_FLAG_P1 : owner === "p2" ? COL_FLAG_P2 : COL_FLAG_NEUTRAL;

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

    setOwner(owner: string | null): void {
        this._playerColor = owner === "p1" ? COL_FLAG_P1 : owner === "p2" ? COL_FLAG_P2 : COL_FLAG_NEUTRAL;
    }

    tick(dt: number, _phase: GamePhase): void {
        this._time += dt;

        // 1. Scarecrow sway
        const sway = Math.sin(this._time * 2.5) * 0.15;
        this._scarecrow.rotation = sway;

        // 2. Raven wing flap
        this._ravenTimer += dt;
        const isFlapping = (Math.floor(this._time * 0.5) % 3 === 0);
        this._updateRaven(this._time, isFlapping);

        // 3. Flag wave
        this._updateFlag(this._time);
    }

    private _drawGround(): void {
        const g = this._ground;

        // Base ground (slightly green/brown)
        g.rect(0, 0, FW, FH).fill({ color: 0x5a6a3a, alpha: 0.3 });

        // Central oval field
        g.ellipse(FW / 2, FH / 2, FW * 0.55, FH * 0.45).fill({ color: COL_GRAIN });
        g.ellipse(FW * 0.45, FH * 0.5, FW * 0.5, FH * 0.48).fill({ color: COL_GRAIN });

        // Grain field depth — darker patches for volume
        g.ellipse(FW * 0.4, FH * 0.55, FW * 0.3, FH * 0.25).fill({ color: COL_GRAIN_DK, alpha: 0.3 });
        g.ellipse(FW * 0.6, FH * 0.45, FW * 0.2, FH * 0.15).fill({ color: COL_GRAIN_DK, alpha: 0.2 });

        // Wheat stalks — detailed with seed heads
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * (FW * 0.38);
            const tx = FW / 2 + Math.cos(angle) * dist * 1.15;
            const ty = FH / 2 + Math.sin(angle) * dist * 0.9;
            const lean = (Math.random() - 0.5) * 3;
            const h = 6 + Math.random() * 4;

            // Stem
            g.moveTo(tx, ty)
                .lineTo(tx + lean, ty - h)
                .stroke({ color: COL_WHEAT_STEM, width: 1 });

            // Wheat head (small oval at top)
            g.ellipse(tx + lean, ty - h - 2, 1.5, 3)
                .fill({ color: COL_WHEAT_HEAD });

            // Tiny seed details on head
            g.moveTo(tx + lean - 1.5, ty - h - 1)
                .lineTo(tx + lean - 2.5, ty - h - 2)
                .stroke({ color: COL_GRAIN_LT, width: 0.5 });
            g.moveTo(tx + lean + 1.5, ty - h - 1)
                .lineTo(tx + lean + 2.5, ty - h - 2)
                .stroke({ color: COL_GRAIN_LT, width: 0.5 });
            g.moveTo(tx + lean - 1, ty - h - 3)
                .lineTo(tx + lean - 2, ty - h - 4)
                .stroke({ color: COL_GRAIN_LT, width: 0.5 });
            g.moveTo(tx + lean + 1, ty - h - 3)
                .lineTo(tx + lean + 2, ty - h - 4)
                .stroke({ color: COL_GRAIN_LT, width: 0.5 });
        }

        // Road with ruts and texture
        g.moveTo(45, 65)
            .bezierCurveTo(45, 90, 30, 100, 30, 140)
            .stroke({ color: COL_ROAD, width: 14 });
        // Road edges (darker)
        g.moveTo(38, 65)
            .bezierCurveTo(38, 90, 23, 100, 23, 140)
            .stroke({ color: COL_ROAD_DK, width: 2 });
        g.moveTo(52, 65)
            .bezierCurveTo(52, 90, 37, 100, 37, 140)
            .stroke({ color: COL_ROAD_DK, width: 2 });
        // Rut marks
        g.moveTo(43, 70)
            .bezierCurveTo(43, 88, 29, 98, 29, 135)
            .stroke({ color: COL_ROAD_DK, width: 1, alpha: 0.3 });
        g.moveTo(47, 70)
            .bezierCurveTo(47, 88, 33, 98, 33, 135)
            .stroke({ color: COL_ROAD_DK, width: 1, alpha: 0.3 });
    }

    private _drawHouse(): void {
        const g = this._house;
        const hX = 20, hY = 20;
        const hW = 55, hH = 45;

        // Foundation stones
        g.rect(hX - 1, hY + hH - 4, hW + 2, 5)
            .fill({ color: COL_STONE_DK })
            .stroke({ color: 0x5a5850, width: 0.5 });

        // Walls with stone texture
        g.roundRect(hX, hY, hW, hH, 3)
            .fill({ color: COL_STONE })
            .stroke({ color: COL_STONE_DK, width: 2 });

        // Stone brick pattern
        for (let row = 0; row < 4; row++) {
            const offset = (row % 2) * 7;
            for (let col = 0; col < 4; col++) {
                const bx = hX + 3 + col * 13 + offset;
                const by = hY + 4 + row * 10;
                if (bx + 10 > hX + hW - 3) continue;
                g.rect(bx, by, 10, 8)
                    .fill({ color: COL_STONE_LT, alpha: 0.4 })
                    .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.3 });
            }
        }

        // Timber frame beams
        g.rect(hX, hY, 3, hH).fill({ color: COL_WOOD, alpha: 0.6 });
        g.rect(hX + hW - 3, hY, 3, hH).fill({ color: COL_WOOD, alpha: 0.6 });
        g.rect(hX + hW / 2 - 1.5, hY, 3, hH).fill({ color: COL_WOOD, alpha: 0.4 });
        // Horizontal beam
        g.rect(hX, hY + hH / 2, hW, 2.5).fill({ color: COL_WOOD, alpha: 0.5 });

        // Roof with shingle detail
        g.moveTo(hX - 6, hY + 4)
            .lineTo(hX + hW / 2, hY - 20)
            .lineTo(hX + hW + 6, hY + 4)
            .closePath()
            .fill({ color: COL_ROOF })
            .stroke({ color: COL_WOOD_DK, width: 1.5 });

        // Roof ridge beam
        g.moveTo(hX + hW / 2 - 1, hY - 19)
            .lineTo(hX + hW / 2 + 1, hY - 19)
            .lineTo(hX + hW + 5, hY + 3)
            .lineTo(hX + hW + 3, hY + 3)
            .closePath()
            .fill({ color: COL_ROOF_LT, alpha: 0.3 });

        // Shingle lines
        for (let i = 0; i < 4; i++) {
            const sy = hY - 12 + i * 5;
            const shrink = i * 4;
            g.moveTo(hX - 3 + shrink, sy + 3)
                .lineTo(hX + hW + 3 - shrink, sy + 3)
                .stroke({ color: COL_WOOD_DK, width: 0.5, alpha: 0.4 });
        }

        // Chimney
        g.rect(hX + hW - 14, hY - 16, 8, 14)
            .fill({ color: COL_CHIMNEY })
            .stroke({ color: COL_STONE_DK, width: 0.8 });
        // Chimney cap
        g.rect(hX + hW - 15, hY - 18, 10, 3).fill({ color: COL_STONE_DK });
        // Chimney brick lines
        g.rect(hX + hW - 13, hY - 12, 6, 0.5).fill({ color: COL_STONE_DK, alpha: 0.4 });
        g.rect(hX + hW - 13, hY - 8, 6, 0.5).fill({ color: COL_STONE_DK, alpha: 0.4 });

        // Door with frame and handle
        const doorX = hX + hH / 2 + 2;
        const doorY = hY + hH - 18;
        g.rect(doorX - 1, doorY - 1, 14, 20)
            .fill({ color: COL_WOOD_DK }); // door frame
        g.rect(doorX, doorY, 12, 18)
            .fill({ color: COL_WOOD });
        // Door planks
        g.rect(doorX + 4, doorY + 1, 0.5, 16).fill({ color: COL_WOOD_DK, alpha: 0.4 });
        g.rect(doorX + 8, doorY + 1, 0.5, 16).fill({ color: COL_WOOD_DK, alpha: 0.4 });
        // Door handle
        g.circle(doorX + 10, doorY + 10, 1.2).fill({ color: 0x888888 });
        // Threshold
        g.rect(doorX - 2, hY + hH - 1, 16, 2).fill({ color: COL_STONE_DK });

        // Windows with frames and crossbars
        const winCol = 0x1a1a2e;
        const winGlow = 0x334466;
        // Left window
        g.rect(hX + 6, hY + 10, 12, 10)
            .fill({ color: COL_WOOD_DK }); // frame
        g.rect(hX + 7, hY + 11, 10, 8)
            .fill({ color: winCol });
        g.rect(hX + 7, hY + 11, 10, 8)
            .fill({ color: winGlow, alpha: 0.2 });
        // Crossbars
        g.rect(hX + 11.5, hY + 11, 1, 8).fill({ color: COL_WOOD_LT });
        g.rect(hX + 7, hY + 14.5, 10, 1).fill({ color: COL_WOOD_LT });
        // Window ledge
        g.rect(hX + 5, hY + 20, 14, 2).fill({ color: COL_STONE_LT });

        // Right window
        g.rect(hX + hW - 18, hY + 10, 12, 10)
            .fill({ color: COL_WOOD_DK });
        g.rect(hX + hW - 17, hY + 11, 10, 8)
            .fill({ color: winCol });
        g.rect(hX + hW - 17, hY + 11, 10, 8)
            .fill({ color: winGlow, alpha: 0.2 });
        g.rect(hX + hW - 12.5, hY + 11, 1, 8).fill({ color: COL_WOOD_LT });
        g.rect(hX + hW - 17, hY + 14.5, 10, 1).fill({ color: COL_WOOD_LT });
        g.rect(hX + hW - 19, hY + 20, 14, 2).fill({ color: COL_STONE_LT });
    }

    private _drawTower(): void {
        const g = this._tower;
        const tX = 82, tY = 10;
        const tW = 25, tH = 65;

        // Tower base (wider foundation)
        g.moveTo(tX - 2, tY + tH)
            .lineTo(tX - 3, tY + tH + 3)
            .lineTo(tX + tW + 3, tY + tH + 3)
            .lineTo(tX + tW + 2, tY + tH)
            .closePath()
            .fill({ color: COL_STONE_DK });

        // Tower body
        g.rect(tX, tY, tW, tH)
            .fill({ color: COL_STONE })
            .stroke({ color: COL_STONE_DK, width: 2.5 });

        // Stone brick pattern
        for (let row = 0; row < 7; row++) {
            const offset = (row % 2) * 5;
            for (let col = 0; col < 3; col++) {
                const bx = tX + 2 + col * 8 + offset;
                const by = tY + 3 + row * 9;
                if (bx + 7 > tX + tW - 2) continue;
                g.rect(bx, by, 7, 7)
                    .fill({ color: COL_STONE_LT, alpha: 0.35 })
                    .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.3 });
            }
        }

        // Corner stones (quoins)
        for (let i = 0; i < 5; i++) {
            const qy = tY + 2 + i * 13;
            g.rect(tX, qy, 4, 6).fill({ color: COL_STONE_LT, alpha: 0.5 });
            g.rect(tX + tW - 4, qy + 6, 4, 6).fill({ color: COL_STONE_LT, alpha: 0.5 });
        }

        // Door (arched at base)
        const doorX = tX + tW / 2 - 5;
        const doorY = tY + tH - 14;
        g.rect(doorX, doorY + 4, 10, 10).fill({ color: COL_WOOD_DK });
        g.ellipse(doorX + 5, doorY + 4, 5, 4).fill({ color: COL_WOOD_DK });
        // Door planks
        g.rect(doorX + 1, doorY + 5, 3.5, 9).fill({ color: COL_WOOD });
        g.rect(doorX + 5.5, doorY + 5, 3.5, 9).fill({ color: COL_WOOD });
        // Iron bands
        g.rect(doorX, doorY + 7, 10, 1).fill({ color: 0x444444 });
        g.rect(doorX, doorY + 11, 10, 1).fill({ color: 0x444444 });

        // Arrow slit (narrow vertical)
        const slitX = tX + tW / 2 - 1.5;
        const slitY = tY + 20;
        g.rect(slitX, slitY, 3, 10)
            .fill({ color: 0x111122 })
            .stroke({ color: COL_STONE_DK, width: 0.5 });
        // Wider cross slot
        g.rect(slitX - 2, slitY + 4, 7, 2)
            .fill({ color: 0x111122 })
            .stroke({ color: COL_STONE_DK, width: 0.5 });

        // Crenellations with more detail
        for (let i = 0; i < 3; i++) {
            const cx = tX + 1 + i * 9;
            g.rect(cx, tY - 6, 6, 7)
                .fill({ color: COL_STONE })
                .stroke({ color: COL_STONE_DK, width: 0.8 });
            // Top highlight
            g.rect(cx, tY - 6, 6, 1).fill({ color: COL_STONE_LT, alpha: 0.4 });
        }

        // Overhang / machicolation
        g.rect(tX - 2, tY, tW + 4, 3)
            .fill({ color: COL_STONE })
            .stroke({ color: COL_STONE_DK, width: 0.5 });

        // Flag pole with finial
        g.moveTo(tX + tW / 2, tY)
            .lineTo(tX + tW / 2, tY - 22)
            .stroke({ color: 0x888888, width: 2 });
        // Pole finial
        g.circle(tX + tW / 2, tY - 22, 1.5).fill({ color: 0xccaa00 });

        this._flag.position.set(tX + tW / 2, tY - 21);
    }

    private _updateFlag(time: number): void {
        const g = this._flag;
        g.clear();
        const wave = Math.sin(time * 3) * 2;
        const wave2 = Math.sin(time * 2.3 + 1) * 1;

        // Flag cloth with two-wave natural motion
        g.moveTo(0, 0)
            .bezierCurveTo(5 + wave * 0.5, 1, 10 + wave, 3 + wave2, 14, 4 + wave)
            .lineTo(14, 4 + wave + 1)
            .bezierCurveTo(10 + wave, 7 + wave2, 5 + wave * 0.5, 8, 0, 9)
            .closePath()
            .fill({ color: this._playerColor });

        // Subtle darker stripe across flag
        g.moveTo(2, 3)
            .bezierCurveTo(6, 3.5 + wave * 0.3, 10, 4 + wave * 0.5, 13, 4.5 + wave * 0.7)
            .lineTo(13, 5.5 + wave * 0.7)
            .bezierCurveTo(10, 5 + wave * 0.5, 6, 4.5 + wave * 0.3, 2, 4)
            .closePath()
            .fill({ color: 0x000000, alpha: 0.15 });
    }

    private _drawScarecrow(): void {
        const g = this._scarecrow;
        const sX = 100, sY = 95;

        // Main pole
        g.rect(-1.5, -2, 3, 28)
            .fill({ color: COL_WOOD })
            .stroke({ color: COL_WOOD_DK, width: 0.5 });
        // Wood grain on pole
        g.rect(-0.5, 2, 0.5, 22).fill({ color: COL_WOOD_DK, alpha: 0.3 });

        // Cross beam
        g.rect(-17, 6, 34, 2.5)
            .fill({ color: COL_WOOD })
            .stroke({ color: COL_WOOD_DK, width: 0.5 });

        // Tattered shirt with ragged edges
        g.moveTo(-14, 8)
            .lineTo(14, 8)
            .lineTo(10, 22)
            .lineTo(7, 21)
            .lineTo(4, 23)
            .lineTo(0, 21)
            .lineTo(-4, 23)
            .lineTo(-7, 21)
            .lineTo(-10, 22)
            .closePath()
            .fill({ color: 0x556677 });
        // Shirt patches
        g.rect(-6, 12, 5, 4).fill({ color: 0x667788, alpha: 0.5 });
        g.rect(2, 14, 4, 3).fill({ color: 0x445566, alpha: 0.5 });
        // Shirt stitching
        g.moveTo(-3, 10).lineTo(-3, 20).stroke({ color: 0x444455, width: 0.5, alpha: 0.5 });

        // Dangling rope/straw at arm ends
        g.moveTo(-16, 8).lineTo(-18, 14).stroke({ color: COL_GRAIN, width: 1.5 });
        g.moveTo(-16, 8).lineTo(-19, 12).stroke({ color: COL_GRAIN, width: 1 });
        g.moveTo(16, 8).lineTo(18, 14).stroke({ color: COL_GRAIN, width: 1.5 });
        g.moveTo(16, 8).lineTo(19, 12).stroke({ color: COL_GRAIN, width: 1 });

        // Pumpkin head
        // Main pumpkin shape (multiple overlapping circles for roundness)
        g.ellipse(0, -2, 8, 7).fill({ color: COL_PUMPKIN });
        // Pumpkin side lobes
        g.ellipse(-4, -2, 5, 6.5).fill({ color: COL_PUMPKIN_DK, alpha: 0.3 });
        g.ellipse(4, -2, 5, 6.5).fill({ color: COL_PUMPKIN_DK, alpha: 0.3 });
        // Pumpkin highlight
        g.ellipse(0, -3, 4, 3).fill({ color: 0xf09030, alpha: 0.3 });
        // Pumpkin ridges
        g.moveTo(0, -8).lineTo(0, 5).stroke({ color: COL_PUMPKIN_DK, width: 0.5, alpha: 0.4 });
        g.moveTo(-4, -7).lineTo(-4, 4).stroke({ color: COL_PUMPKIN_DK, width: 0.5, alpha: 0.3 });
        g.moveTo(4, -7).lineTo(4, 4).stroke({ color: COL_PUMPKIN_DK, width: 0.5, alpha: 0.3 });

        // Stem on top
        g.rect(-1, -9, 2, 3).fill({ color: 0x446622 });
        g.rect(-1.5, -10, 3, 1.5).fill({ color: 0x558833 });

        // Carved eyes (triangles)
        // Left eye
        g.moveTo(-4, -4)
            .lineTo(-2.5, -6)
            .lineTo(-1, -4)
            .closePath()
            .fill({ color: COL_PUMPKIN_EYE });
        // Right eye
        g.moveTo(1, -4)
            .lineTo(2.5, -6)
            .lineTo(4, -4)
            .closePath()
            .fill({ color: COL_PUMPKIN_EYE });

        // Carved smile (jagged)
        g.moveTo(-4, 0)
            .lineTo(-2.5, 1.5)
            .lineTo(-1, 0)
            .lineTo(0, 2)
            .lineTo(1, 0)
            .lineTo(2.5, 1.5)
            .lineTo(4, 0)
            .lineTo(3, 2.5)
            .lineTo(0, 3.5)
            .lineTo(-3, 2.5)
            .closePath()
            .fill({ color: COL_PUMPKIN_EYE });

        // Inner glow in carved features
        g.moveTo(-3.5, -4.5)
            .lineTo(-2.5, -5.5)
            .lineTo(-1.5, -4.5)
            .closePath()
            .fill({ color: 0xffaa22, alpha: 0.25 });
        g.moveTo(1.5, -4.5)
            .lineTo(2.5, -5.5)
            .lineTo(3.5, -4.5)
            .closePath()
            .fill({ color: 0xffaa22, alpha: 0.25 });

        this._scarecrow.position.set(sX, sY);
    }

    private _drawCart(): void {
        const g = this._cart;
        const cX = 45, cY = 110;

        // Cart axle
        g.rect(cX - 16, cY + 5, 32, 2).fill({ color: 0x444444 });

        // Wheels with spokes — Left wheel
        this._drawWheel(g, cX - 12, cY + 6, 9);
        // Right wheel
        this._drawWheel(g, cX + 12, cY + 6, 9);

        // Cart body — planked sides
        // Bottom
        g.rect(cX - 18, cY - 2, 36, 4)
            .fill({ color: COL_WOOD })
            .stroke({ color: COL_WOOD_DK, width: 0.5 });

        // Back wall
        g.rect(cX - 18, cY - 14, 4, 14)
            .fill({ color: COL_WOOD })
            .stroke({ color: COL_WOOD_DK, width: 0.5 });
        // Front wall
        g.rect(cX + 14, cY - 14, 4, 14)
            .fill({ color: COL_WOOD })
            .stroke({ color: COL_WOOD_DK, width: 0.5 });

        // Side planks with visible wood grain
        for (let i = 0; i < 3; i++) {
            const py = cY - 13 + i * 4;
            g.rect(cX - 14, py, 28, 3.5)
                .fill({ color: i % 2 === 0 ? COL_WOOD : COL_WOOD_LT })
                .stroke({ color: COL_WOOD_DK, width: 0.3 });
            // Wood grain
            g.rect(cX - 10 + i * 5, py + 0.5, 8, 0.3).fill({ color: COL_WOOD_DK, alpha: 0.2 });
        }

        // Iron corner brackets
        g.rect(cX - 18, cY - 14, 5, 2).fill({ color: 0x555555 });
        g.rect(cX - 18, cY - 3, 5, 2).fill({ color: 0x555555 });
        g.rect(cX + 13, cY - 14, 5, 2).fill({ color: 0x555555 });
        g.rect(cX + 13, cY - 3, 5, 2).fill({ color: 0x555555 });

        // Cart handle / tongue
        g.moveTo(cX + 18, cY)
            .lineTo(cX + 28, cY + 4)
            .stroke({ color: COL_WOOD, width: 2.5 });
        g.moveTo(cX + 18, cY + 2)
            .lineTo(cX + 28, cY + 6)
            .stroke({ color: COL_WOOD, width: 2.5 });

        // Hay in cart (piled with detail)
        g.roundRect(cX - 14, cY - 20, 28, 8, 3).fill({ color: COL_GRAIN });
        g.roundRect(cX - 10, cY - 24, 20, 6, 3).fill({ color: COL_GRAIN_LT });
        // Hay strands poking out
        for (let i = 0; i < 8; i++) {
            const hx = cX - 12 + i * 3.5;
            const lean = (Math.random() - 0.5) * 4;
            g.moveTo(hx, cY - 20)
                .lineTo(hx + lean, cY - 26 - Math.random() * 3)
                .stroke({ color: COL_WHEAT_HEAD, width: 1 });
        }
    }

    private _drawWheel(g: Graphics, x: number, y: number, r: number): void {
        // Outer rim
        g.circle(x, y, r)
            .stroke({ color: 0x444444, width: 2.5 });
        // Inner rim
        g.circle(x, y, r - 1.5)
            .stroke({ color: COL_WOOD_DK, width: 1 });

        // Wooden spokes (6)
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            g.moveTo(x, y)
                .lineTo(x + Math.cos(angle) * (r - 1), y + Math.sin(angle) * (r - 1))
                .stroke({ color: COL_WOOD, width: 1.5 });
        }

        // Hub
        g.circle(x, y, 2.5).fill({ color: COL_WOOD_DK });
        g.circle(x, y, 1.2).fill({ color: 0x555555 }); // iron center
    }

    private _drawRaven(): void {
        const rX = 45, rY = 90;
        this._raven.position.set(rX, rY);
        this._updateRaven(0, false);
    }

    private _updateRaven(time: number, flapping: boolean): void {
        const g = this._raven;
        g.clear();

        // Shadow on cart
        g.ellipse(0, 4, 5, 1.5).fill({ color: 0x000000, alpha: 0.15 });

        // Tail feathers
        g.moveTo(-3, 1)
            .lineTo(-8, 2)
            .lineTo(-7, 0)
            .lineTo(-9, 1)
            .lineTo(-7, -1)
            .lineTo(-3, 0)
            .closePath()
            .fill({ color: COL_RAVEN });

        // Body (larger, more bird-shaped)
        g.ellipse(0, 0, 5, 3.5).fill({ color: COL_RAVEN });
        // Body highlight (iridescent sheen)
        g.ellipse(0, -1, 3, 2).fill({ color: COL_RAVEN_HL, alpha: 0.3 });

        // Head
        g.circle(4, -2, 3).fill({ color: COL_RAVEN });
        // Head highlight
        g.circle(4, -2.5, 1.5).fill({ color: COL_RAVEN_HL, alpha: 0.3 });

        // Beak (larger, more detailed)
        g.moveTo(6.5, -2.5)
            .lineTo(10, -2)
            .lineTo(6.5, -1)
            .closePath()
            .fill({ color: 0x333322 });
        // Beak ridge
        g.moveTo(6.5, -2.3).lineTo(9.5, -2).stroke({ color: 0x444433, width: 0.5 });

        // Eye (beady, with highlight)
        g.circle(5, -3, 1).fill({ color: 0xdddddd });
        g.circle(5.2, -3.2, 0.6).fill({ color: 0x111111 });
        g.circle(5.5, -3.5, 0.3).fill({ color: 0xffffff }); // glint

        // Legs/feet
        g.moveTo(-1, 3).lineTo(-2, 5).stroke({ color: 0x333322, width: 1 });
        g.moveTo(-2, 5).lineTo(-3.5, 5.5).stroke({ color: 0x333322, width: 0.5 });
        g.moveTo(-2, 5).lineTo(-1, 5.5).stroke({ color: 0x333322, width: 0.5 });

        g.moveTo(1, 3).lineTo(1, 5).stroke({ color: 0x333322, width: 1 });
        g.moveTo(1, 5).lineTo(-0.5, 5.5).stroke({ color: 0x333322, width: 0.5 });
        g.moveTo(1, 5).lineTo(2, 5.5).stroke({ color: 0x333322, width: 0.5 });

        // Wings
        const flap = flapping ? Math.sin(time * 15) * 7 : 0;
        // Left wing
        g.moveTo(-1, -1)
            .quadraticCurveTo(-5, -4 - flap, -7, -2 - flap * 0.7)
            .lineTo(-4, 0)
            .closePath()
            .fill({ color: COL_RAVEN });
        // Wing feather detail
        if (!flapping) {
            g.moveTo(-2, 0).lineTo(-6, -1).stroke({ color: COL_RAVEN_HL, width: 0.5, alpha: 0.3 });
            g.moveTo(-2, 1).lineTo(-5, 0).stroke({ color: COL_RAVEN_HL, width: 0.5, alpha: 0.3 });
        }

        // Right wing (folded when not flapping)
        if (flapping) {
            g.moveTo(-1, 1)
                .quadraticCurveTo(-5, 3 + flap * 0.5, -6, 1 + flap * 0.3)
                .lineTo(-3, 2)
                .closePath()
                .fill({ color: COL_RAVEN });
        } else {
            g.moveTo(0, 1)
                .lineTo(-3, 2)
                .lineTo(-2, 3)
                .lineTo(1, 2)
                .closePath()
                .fill({ color: COL_RAVEN_HL, alpha: 0.5 });
        }
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
