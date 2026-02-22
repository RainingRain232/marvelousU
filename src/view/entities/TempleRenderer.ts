// Procedural temple renderer for BuildingView.
//
// Draws a richly ornamented Italian-style cathedral (~2×3 tiles) with:
//   • Grand central nave with large stained-glass rose window (saint in blue sky)
//   • Ornate bell towers flanking the facade
//   • Wooden gate entrance with pointed Gothic arch
//   • Marble facade with pilasters, cornices, and sculptural niches
//   • Gold cross at the apex
//   • Animated: swinging bell, flickering candle glow, waving flag, doves
//
// All drawing uses PixiJS Graphics.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const TW = 2 * TS;   // 128px wide
const TH = 3 * TS;   // 192px tall

// Palette — warm Italian marble & stone
const COL_MARBLE      = 0xf5efe0;
const COL_MARBLE_LT   = 0xfaf6ec;
const COL_MARBLE_DK   = 0xd4cbb8;
const COL_MARBLE_WARM = 0xefe3cc;
const COL_STONE       = 0xb8a88a;
const COL_STONE_DK    = 0x8a7d66;
const COL_ROOF        = 0x6b4a3a;
const COL_ROOF_DK     = 0x4a3028;
const COL_WOOD        = 0x5d3a1a;
const COL_WOOD_DK     = 0x3d2510;
const COL_GOLD        = 0xffd700;
const COL_GOLD_DK     = 0xc8a600;
const COL_IRON        = 0x555555;

// Stained glass
const COL_GLASS_SKY   = 0x6eb5ff;
const COL_GLASS_HALO  = 0xffe066;
const COL_GLASS_ROBE  = 0x3355cc;
const COL_GLASS_SKIN  = 0xf0c8a0;
const COL_GLASS_LEAD  = 0x333333;

// Bell
const COL_BELL        = 0xc8a600;
const COL_BELL_DK     = 0x8a7200;

// Candle
const COL_CANDLE      = 0xffe8a0;

// Dove
const COL_DOVE        = 0xffffff;
const COL_DOVE_WING   = 0xeeeedd;

// Animation timing
const BELL_SPEED      = 2.5;
const BELL_PAUSE      = 6.0;    // seconds between peals
const BELL_RING_TIME  = 4.0;    // seconds of ringing
const FLAG_SPEED      = 3.0;
const DOVE_CYCLE      = 12.0;
const DOVE_FLY_TIME   = 5.0;

// ---------------------------------------------------------------------------
// TempleRenderer
// ---------------------------------------------------------------------------

export class TempleRenderer {
    readonly container = new Container();

    private _base     = new Graphics();
    private _window   = new Graphics();  // stained glass (static)
    private _bellL    = new Graphics();
    private _bellR    = new Graphics();
    private _candles  = new Graphics();
    private _flag     = new Graphics();
    private _dove     = new Graphics();

    private _time       = 0;
    private _bellTimer  = 0;
    private _doveTimer  = 0;
    private _playerColor: number;

    constructor(owner: string | null) {
        this._playerColor = owner === "p1" ? 0x4488ff : 0xff4444;

        this._drawFacade();
        this._drawStainedGlass();
        this._drawBells();
        this._drawCandles();

        this.container.addChild(this._base);
        this.container.addChild(this._window);
        this.container.addChild(this._bellL);
        this.container.addChild(this._bellR);
        this.container.addChild(this._candles);
        this.container.addChild(this._flag);
        this.container.addChild(this._dove);

        this._dove.visible = false;
    }

    tick(dt: number, _phase: GamePhase): void {
        this._time += dt;

        // 1. Bell swing
        this._bellTimer += dt;
        const bellCycle = BELL_PAUSE + BELL_RING_TIME;
        const bt = this._bellTimer % bellCycle;
        if (bt > BELL_PAUSE) {
            const rt = bt - BELL_PAUSE;
            const swing = Math.sin(rt * BELL_SPEED * Math.PI * 2) * 0.35 *
                          Math.max(0, 1 - rt / BELL_RING_TIME);
            this._bellL.rotation = swing;
            this._bellR.rotation = -swing * 0.8;
        } else {
            this._bellL.rotation = 0;
            this._bellR.rotation = 0;
        }

        // 2. Candle flicker
        this._updateCandles(this._time);

        // 3. Flag
        this._updateFlag(this._time);

        // 4. Doves
        this._doveTimer += dt;
        if (this._doveTimer > DOVE_CYCLE) this._doveTimer -= DOVE_CYCLE;
        if (this._doveTimer < DOVE_FLY_TIME) {
            this._dove.visible = true;
            this._updateDove(this._doveTimer / DOVE_FLY_TIME);
        } else {
            this._dove.visible = false;
        }
    }

    // ── Facade ──────────────────────────────────────────────────────────────

    private _drawFacade(): void {
        const g = this._base;

        // ── Ground / steps ──
        const stepsY = TH - 12;
        g.rect(8, stepsY, TW - 16, 12).fill({ color: COL_STONE });
        g.rect(4, stepsY + 4, TW - 8, 8).fill({ color: COL_STONE_DK });
        // Step lines
        g.moveTo(8, stepsY + 4).lineTo(TW - 8, stepsY + 4)
            .stroke({ color: COL_MARBLE_DK, width: 0.5 });
        g.moveTo(4, stepsY + 8).lineTo(TW - 4, stepsY + 8)
            .stroke({ color: COL_MARBLE_DK, width: 0.5 });

        // ── Main facade body ──
        const facadeX = 18;
        const facadeW = TW - 36;
        const facadeY = 52;
        const facadeH = stepsY - facadeY;
        g.rect(facadeX, facadeY, facadeW, facadeH)
            .fill({ color: COL_MARBLE })
            .stroke({ color: COL_MARBLE_DK, width: 1 });

        // Horizontal cornices / string courses
        this._drawCornice(g, facadeX, facadeY + 18, facadeW);
        this._drawCornice(g, facadeX, facadeY + facadeH * 0.55, facadeW);

        // Vertical pilasters on facade
        const pilW = 6;
        for (const px of [facadeX, facadeX + facadeW - pilW]) {
            g.rect(px, facadeY, pilW, facadeH)
                .fill({ color: COL_MARBLE_WARM })
                .stroke({ color: COL_MARBLE_DK, width: 0.5 });
            // Capital detail at top of pilaster
            g.rect(px - 1, facadeY, pilW + 2, 4)
                .fill({ color: COL_MARBLE_LT })
                .stroke({ color: COL_MARBLE_DK, width: 0.3 });
        }
        // Centre pilasters flanking the door
        const doorCX = TW / 2;
        for (const dx of [-20, 20]) {
            const px = doorCX + dx - pilW / 2;
            g.rect(px, facadeY + facadeH * 0.55, pilW, facadeH * 0.45)
                .fill({ color: COL_MARBLE_WARM })
                .stroke({ color: COL_MARBLE_DK, width: 0.4 });
        }

        // ── Gate / entrance ──
        const gateW = 28;
        const gateH = 44;
        const gateX = doorCX - gateW / 2;
        const gateY = stepsY - gateH;
        // Arch background (dark interior)
        g.rect(gateX, gateY + 10, gateW, gateH - 10)
            .fill({ color: 0x1a1018 });
        g.ellipse(doorCX, gateY + 10, gateW / 2, 12)
            .fill({ color: 0x1a1018 });
        // Wooden doors (two halves)
        const doorHalf = gateW / 2 - 2;
        g.rect(gateX + 1, gateY + 14, doorHalf, gateH - 14)
            .fill({ color: COL_WOOD })
            .stroke({ color: COL_WOOD_DK, width: 0.8 });
        g.rect(doorCX + 1, gateY + 14, doorHalf, gateH - 14)
            .fill({ color: COL_WOOD })
            .stroke({ color: COL_WOOD_DK, width: 0.8 });
        // Iron bands on doors
        for (let by = gateY + 22; by < stepsY - 6; by += 12) {
            g.moveTo(gateX + 2, by).lineTo(gateX + gateW - 2, by)
                .stroke({ color: COL_IRON, width: 1.2, alpha: 0.6 });
        }
        // Door ring handles
        g.circle(doorCX - 4, gateY + gateH * 0.6, 2)
            .stroke({ color: COL_IRON, width: 1 });
        g.circle(doorCX + 4, gateY + gateH * 0.6, 2)
            .stroke({ color: COL_IRON, width: 1 });
        // Gothic pointed arch frame
        g.moveTo(gateX - 2, stepsY)
            .lineTo(gateX - 2, gateY + 12)
            .quadraticCurveTo(gateX - 2, gateY - 2, doorCX, gateY - 6)
            .quadraticCurveTo(gateX + gateW + 2, gateY - 2, gateX + gateW + 2, gateY + 12)
            .lineTo(gateX + gateW + 2, stepsY)
            .stroke({ color: COL_STONE_DK, width: 2 });
        // Arch moulding highlight
        g.moveTo(gateX, stepsY)
            .lineTo(gateX, gateY + 12)
            .quadraticCurveTo(gateX, gateY, doorCX, gateY - 4)
            .quadraticCurveTo(gateX + gateW, gateY, gateX + gateW, gateY + 12)
            .lineTo(gateX + gateW, stepsY)
            .stroke({ color: COL_GOLD_DK, width: 1, alpha: 0.5 });

        // ── Small niches with saint statues (flanking the gate) ──
        for (const nx of [facadeX + 10, facadeX + facadeW - 16]) {
            const ny = facadeY + facadeH * 0.58 + 8;
            // Niche alcove
            g.roundRect(nx, ny, 10, 20, 5)
                .fill({ color: COL_MARBLE_DK, alpha: 0.4 });
            // Tiny statue silhouette
            g.circle(nx + 5, ny + 5, 2.5)
                .fill({ color: COL_STONE });
            g.rect(nx + 3, ny + 7, 4, 10)
                .fill({ color: COL_STONE });
        }

        // ── Triangular pediment / gable above facade ──
        const peakY = 28;
        g.moveTo(facadeX - 2, facadeY + 2)
            .lineTo(TW / 2, peakY)
            .lineTo(facadeX + facadeW + 2, facadeY + 2)
            .closePath()
            .fill({ color: COL_MARBLE_LT })
            .stroke({ color: COL_MARBLE_DK, width: 1 });
        // Tympanum detail (inner triangle)
        g.moveTo(facadeX + 8, facadeY + 1)
            .lineTo(TW / 2, peakY + 8)
            .lineTo(facadeX + facadeW - 8, facadeY + 1)
            .closePath()
            .stroke({ color: COL_GOLD_DK, width: 0.6, alpha: 0.4 });

        // ── Gold cross at apex ──
        const crossY = peakY - 16;
        g.rect(TW / 2 - 1.5, crossY, 3, 16)
            .fill({ color: COL_GOLD });
        g.rect(TW / 2 - 6, crossY + 3, 12, 3)
            .fill({ color: COL_GOLD });
        // Cross outline
        g.rect(TW / 2 - 1.5, crossY, 3, 16)
            .stroke({ color: COL_GOLD_DK, width: 0.5 });

        // ── Bell towers (left and right) ──
        this._drawBellTower(g, 0, true);
        this._drawBellTower(g, TW, false);

        // Flag pole on left tower
        const flagPoleX = 9;
        const flagPoleY = 14;
        g.moveTo(flagPoleX, flagPoleY + 20)
            .lineTo(flagPoleX, flagPoleY)
            .stroke({ color: COL_IRON, width: 1.5 });
        this._flag.position.set(flagPoleX, flagPoleY);
    }

    private _drawBellTower(g: Graphics, anchorX: number, isLeft: boolean): void {
        const tw = 20;
        const x = isLeft ? anchorX : anchorX - tw;
        const towerTop = 18;
        const towerBot = TH - 12;
        const towerH = towerBot - towerTop;

        // Tower body
        g.rect(x, towerTop, tw, towerH)
            .fill({ color: COL_MARBLE_WARM })
            .stroke({ color: COL_MARBLE_DK, width: 1 });

        // Brick-like horizontal lines
        for (let row = 0; row < towerH; row += 14) {
            g.moveTo(x + 1, towerTop + row)
                .lineTo(x + tw - 1, towerTop + row)
                .stroke({ color: COL_MARBLE_DK, width: 0.3, alpha: 0.3 });
        }

        // Cornices on tower
        this._drawCornice(g, x - 1, towerTop + towerH * 0.3, tw + 2);
        this._drawCornice(g, x - 1, towerTop + towerH * 0.6, tw + 2);

        // Belfry opening (arched)
        const belfryY = towerTop + 12;
        const belfryW = 12;
        const belfryH = 18;
        const belfryX = x + tw / 2 - belfryW / 2;
        g.rect(belfryX, belfryY + 5, belfryW, belfryH - 5)
            .fill({ color: 0x1a1a2e });
        g.ellipse(x + tw / 2, belfryY + 5, belfryW / 2, 6)
            .fill({ color: 0x1a1a2e });
        // Arch frame
        g.moveTo(belfryX, belfryY + belfryH)
            .lineTo(belfryX, belfryY + 6)
            .quadraticCurveTo(x + tw / 2, belfryY - 2, belfryX + belfryW, belfryY + 6)
            .lineTo(belfryX + belfryW, belfryY + belfryH)
            .stroke({ color: COL_MARBLE_DK, width: 1 });

        // Small windows lower on tower
        const winY1 = towerTop + towerH * 0.45;
        const winY2 = towerTop + towerH * 0.72;
        g.rect(x + tw / 2 - 3, winY1, 6, 10)
            .fill({ color: 0x1a1a2e })
            .stroke({ color: COL_MARBLE_DK, width: 0.5 });
        g.rect(x + tw / 2 - 2, winY2, 4, 8)
            .fill({ color: 0x1a1a2e })
            .stroke({ color: COL_MARBLE_DK, width: 0.5 });

        // Pointed roof / spire
        const spireH = 22;
        g.moveTo(x - 2, towerTop + 2)
            .lineTo(x + tw / 2, towerTop - spireH)
            .lineTo(x + tw + 2, towerTop + 2)
            .closePath()
            .fill({ color: COL_ROOF })
            .stroke({ color: COL_ROOF_DK, width: 1 });

        // Tiny cross on spire
        const cx = x + tw / 2;
        const cy = towerTop - spireH - 2;
        g.rect(cx - 1, cy, 2, 6).fill({ color: COL_GOLD });
        g.rect(cx - 3, cy + 2, 6, 2).fill({ color: COL_GOLD });
    }

    private _drawCornice(g: Graphics, x: number, y: number, w: number): void {
        g.rect(x - 2, y, w + 4, 3)
            .fill({ color: COL_MARBLE_LT })
            .stroke({ color: COL_MARBLE_DK, width: 0.4 });
        g.moveTo(x - 2, y + 3).lineTo(x + w + 2, y + 3)
            .stroke({ color: COL_MARBLE_DK, width: 0.3, alpha: 0.5 });
    }

    // ── Stained Glass Rose Window ───────────────────────────────────────────

    private _drawStainedGlass(): void {
        const g = this._window;
        const cx = TW / 2;
        const cy = 78;
        const r = 20;

        // Window frame (lead border)
        g.circle(cx, cy, r + 3)
            .fill({ color: COL_GLASS_LEAD });
        // Outer decorative ring
        g.circle(cx, cy, r + 2)
            .stroke({ color: COL_STONE_DK, width: 1 });

        // Sky background
        g.circle(cx, cy, r)
            .fill({ color: COL_GLASS_SKY });

        // Radial lead lines (like a rose window)
        const segments = 12;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            g.moveTo(cx, cy)
                .lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
                .stroke({ color: COL_GLASS_LEAD, width: 0.8, alpha: 0.6 });
        }

        // Concentric lead ring
        g.circle(cx, cy, r * 0.6)
            .stroke({ color: COL_GLASS_LEAD, width: 0.8, alpha: 0.5 });

        // Saint figure (simplified)
        // Halo
        g.circle(cx, cy - 7, 5)
            .fill({ color: COL_GLASS_HALO, alpha: 0.7 });
        // Head
        g.circle(cx, cy - 7, 3)
            .fill({ color: COL_GLASS_SKIN });
        // Robe / body
        g.moveTo(cx - 6, cy - 2)
            .lineTo(cx + 6, cy - 2)
            .lineTo(cx + 8, cy + 14)
            .lineTo(cx - 8, cy + 14)
            .closePath()
            .fill({ color: COL_GLASS_ROBE });
        // Arms outstretched
        g.moveTo(cx - 6, cy + 2)
            .lineTo(cx - 12, cy - 1)
            .stroke({ color: COL_GLASS_SKIN, width: 1.5 });
        g.moveTo(cx + 6, cy + 2)
            .lineTo(cx + 12, cy - 1)
            .stroke({ color: COL_GLASS_SKIN, width: 1.5 });
        // Robe detail
        g.moveTo(cx, cy - 2)
            .lineTo(cx, cy + 14)
            .stroke({ color: COL_GLASS_LEAD, width: 0.5, alpha: 0.4 });

        // Outer ornamental pointed arch frame around the rose
        g.moveTo(cx - r - 5, cy + r + 2)
            .lineTo(cx - r - 5, cy - 4)
            .quadraticCurveTo(cx, cy - r - 12, cx + r + 5, cy - 4)
            .lineTo(cx + r + 5, cy + r + 2)
            .stroke({ color: COL_GOLD_DK, width: 1.2, alpha: 0.6 });
    }

    // ── Bells ───────────────────────────────────────────────────────────────

    private _drawBells(): void {
        // Left bell in left tower belfry
        this._drawBellShape(this._bellL);
        this._bellL.pivot.set(0, -2); // pivot at top of bell (rope)
        this._bellL.position.set(10, 30);

        // Right bell in right tower belfry
        this._drawBellShape(this._bellR);
        this._bellR.pivot.set(0, -2);
        this._bellR.position.set(TW - 10, 30);
    }

    private _drawBellShape(g: Graphics): void {
        // Bell body
        g.moveTo(-4, 0)
            .quadraticCurveTo(-5, 6, -6, 10)
            .lineTo(6, 10)
            .quadraticCurveTo(5, 6, 4, 0)
            .closePath()
            .fill({ color: COL_BELL })
            .stroke({ color: COL_BELL_DK, width: 0.8 });
        // Bell mouth
        g.rect(-6, 9, 12, 2)
            .fill({ color: COL_BELL_DK });
        // Clapper
        g.circle(0, 9, 1.2)
            .fill({ color: COL_IRON });
        // Rope
        g.moveTo(0, -2).lineTo(0, 0)
            .stroke({ color: COL_STONE_DK, width: 1 });
    }

    // ── Candles ─────────────────────────────────────────────────────────────

    private _drawCandles(): void {
        // Initial draw — will be overwritten by flicker
        this._updateCandles(0);
    }

    private _updateCandles(time: number): void {
        const g = this._candles;
        g.clear();

        // Two candles flanking the gate
        const gateY = TH - 56;
        for (const cx of [TW / 2 - 22, TW / 2 + 22]) {
            // Candle stick
            g.rect(cx - 1, gateY, 2, 12)
                .fill({ color: 0xddcc88 });
            // Flame flicker
            const flicker = Math.sin(time * 8 + cx) * 1.5 + Math.sin(time * 13 + cx * 2) * 0.8;
            const flameH = 4 + Math.sin(time * 6 + cx) * 1;
            g.ellipse(cx, gateY - flameH / 2 + flicker * 0.3, 2, flameH / 2)
                .fill({ color: COL_CANDLE, alpha: 0.85 });
            // Inner bright core
            g.ellipse(cx, gateY - flameH / 2 + flicker * 0.2, 1, flameH / 3)
                .fill({ color: 0xffffff, alpha: 0.6 });
        }
    }

    // ── Flag ────────────────────────────────────────────────────────────────

    private _updateFlag(time: number): void {
        const g = this._flag;
        g.clear();

        const w1 = Math.sin(time * FLAG_SPEED) * 2;
        const w2 = Math.sin(time * FLAG_SPEED * 1.3 + 1) * 3;
        const w3 = Math.sin(time * FLAG_SPEED * 0.9 + 2) * 2;
        const fW = 14;
        const fH = 10;

        g.moveTo(0, 0)
            .bezierCurveTo(fW * 0.3, w1, fW * 0.7, w2, fW, w3)
            .lineTo(fW, fH + w3)
            .bezierCurveTo(fW * 0.7, fH + w2, fW * 0.3, fH + w1, 0, fH)
            .closePath()
            .fill({ color: this._playerColor });
        // Cross on flag
        g.rect(fW / 2 - 0.5, 2 + (w1 + w3) / 4, 1, fH - 4)
            .fill({ color: COL_GOLD, alpha: 0.5 });
        g.rect(fW / 2 - 3, fH / 2 - 0.5 + (w1 + w3) / 4, 6, 1)
            .fill({ color: COL_GOLD, alpha: 0.5 });
    }

    // ── Doves ───────────────────────────────────────────────────────────────

    private _updateDove(t: number): void {
        const g = this._dove;
        g.clear();

        // Two doves flying across the cathedral top
        for (let i = 0; i < 2; i++) {
            const dt = t + i * 0.15;
            if (dt < 0 || dt > 1) continue;

            // Arc path across the cathedral
            const x = 10 + dt * (TW - 20);
            const y = 8 + Math.sin(dt * Math.PI) * -18 + i * 8;
            const wingFlap = Math.sin(dt * Math.PI * 12 + i * 2) * 5;

            // Body
            g.ellipse(x, y, 3, 1.5).fill({ color: COL_DOVE });
            // Head
            g.circle(x + 2.5, y - 1, 1.2).fill({ color: COL_DOVE });
            // Wings
            g.moveTo(x, y)
                .lineTo(x - 3, y - 3 - wingFlap)
                .lineTo(x + 1, y - 1)
                .fill({ color: COL_DOVE_WING });
            g.moveTo(x, y)
                .lineTo(x - 3, y + 1 + wingFlap * 0.3)
                .lineTo(x + 1, y + 1)
                .fill({ color: COL_DOVE_WING });
        }
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
