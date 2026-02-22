// Procedural castle renderer for BuildingView.
//
// Draws a detailed 4×4 tile medieval fantasy castle with:
//   • Two tall stone towers (left and right)
//   • Central keep / gatehouse with portcullis
//   • Crenellated walls connecting the towers
//   • Player-colored flags on each tower (waving in the wind)
//   • Princess animation in left tower (PREP phase) — peeks out, waves handkerchief
//   • King animation in right tower (BATTLE phase) — peeks out, waves sword
//   • Stone texture, arrow slits, moss details
//   • Court Jester (PREP phase) — peeks out from gate, throws ball at guard
//
// All drawing uses PixiJS Graphics. The castle container is 4×TILE_SIZE wide
// and 4×TILE_SIZE tall. Animations are driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64; // tile size
const CW = 4 * TS; // castle width 256px
const CH = 4 * TS; // castle height 256px

// Palette
const COL_STONE = 0x8b8878;
const COL_STONE_LT = 0xa09d8f;
const COL_STONE_DK = 0x6b6860;
const COL_MORTAR = 0x9a9688;
const COL_ROOF = 0x5a2d2d;
const COL_ROOF_DK = 0x3d1515;
const COL_WOOD_DK = 0x3d2510;
const COL_PORTCULLIS = 0x444444;
const COL_WINDOW = 0x1a1a2e;
const COL_WINDOW_FRAME = 0x555555;
const COL_MOSS = 0x4a6b3a;

// Character palettes
const COL_SKIN = 0xf0c8a0;
const COL_HAIR = 0xf0d060;
const COL_HAIR_DK = 0xd4a830;
const COL_DRESS = 0xcc4488;
const COL_HANKY = 0xffffff;
const COL_KING_SKIN = 0xd4a574;
const COL_CROWN = 0xffd700;
const COL_CROWN_GEM = 0xff2200;
const COL_KING_ARMOR = 0x8899aa;
const COL_KING_SWORD = 0xc0c8d0;
const COL_JESTER1 = 0xff3344;
const COL_JESTER2 = 0xaa00cc;
const COL_BELL = 0xffd700;

// Animation timing
const PRINCESS_CYCLE = 8.0;
const PRINCESS_APPEAR = 2.5;
const KING_CYCLE = 6.0;
const KING_APPEAR = 2.0;
const FLAG_SPEED = 3.0; // radians/sec
const JESTER_CYCLE = 25.0;
const JESTER_APPEAR = 6.0;

// ---------------------------------------------------------------------------
// CastleRenderer
// ---------------------------------------------------------------------------

export class CastleRenderer {
    readonly container = new Container();

    // Layers
    private _base = new Graphics();
    private _flagL = new Graphics();
    private _flagR = new Graphics();
    private _princessGfx = new Graphics();
    private _kingGfx = new Graphics();
    private _guardsGfx = new Graphics();
    private _zzzGfx = new Graphics();
    private _jesterGfx = new Graphics();
    private _ballGfx = new Graphics();
    private _gateDoorGfx = new Graphics();

    // Timers
    private _flagTime = 0;
    private _princessTimer = 0;
    private _kingTimer = 0;
    private _jesterTimer = 0;

    // State
    private _playerColor: number;
    private _isWest: boolean;

    constructor(owner: string | null) {
        this._isWest = owner === "p1";
        this._playerColor = this._isWest ? 0x4488ff : 0xff4444;

        this._drawStaticCastle();
        this._drawFlags();

        this.container.addChild(this._base);
        this.container.addChild(this._flagL);
        this.container.addChild(this._flagR);
        this.container.addChild(this._princessGfx);
        this.container.addChild(this._kingGfx);
        this.container.addChild(this._guardsGfx);
        this.container.addChild(this._zzzGfx);
        this.container.addChild(this._jesterGfx);
        this.container.addChild(this._ballGfx);
        this.container.addChild(this._gateDoorGfx);

        this._princessGfx.visible = false;
        this._kingGfx.visible = false;
        this._jesterGfx.visible = false;
        this._ballGfx.visible = false;
    }

    tick(dt: number, phase: GamePhase): void {
        this._flagTime += dt * FLAG_SPEED;
        this._updateFlags();

        // 1. Princess (PREP)
        if (phase === GamePhase.PREP) {
            this._princessTimer += dt;
            if (this._princessTimer > PRINCESS_CYCLE) this._princessTimer -= PRINCESS_CYCLE;
            const t = this._princessTimer;
            if (t < PRINCESS_APPEAR) {
                this._princessGfx.visible = true;
                this._drawPrincess(t / PRINCESS_APPEAR);
            } else {
                this._princessGfx.visible = false;
            }
            this._kingGfx.visible = false;
        } else {
            // 2. King (BATTLE/RESOLVE)
            this._kingTimer += dt;
            if (this._kingTimer > KING_CYCLE) this._kingTimer -= KING_CYCLE;
            const t = this._kingTimer;
            if (t < KING_APPEAR) {
                this._kingGfx.visible = true;
                this._drawKing(t / KING_APPEAR);
            } else {
                this._kingGfx.visible = false;
            }
            this._princessGfx.visible = false;
        }

        // 3. Guards
        this._updateGuards(phase);

        // 4. Jester (PREP only)
        if (phase === GamePhase.PREP) {
            this._jesterTimer += dt;
            if (this._jesterTimer > JESTER_CYCLE) this._jesterTimer -= JESTER_CYCLE;
            this._updateJester(this._jesterTimer);
        } else {
            this._jesterGfx.visible = false;
            this._ballGfx.visible = false;
            this._updateGate(0);
        }
    }

    // ── Internal Helpers ────────────────────────────────────────────────────────

    private _drawStaticCastle(): void {
        const g = this._base;
        g.clear();

        const wallY = 60;
        const wallH = CH - wallY - 20;

        // Main Wall
        g.rect(40, wallY, CW - 80, wallH).fill({ color: COL_STONE }).stroke({ color: COL_STONE_DK, width: 1 });
        this._drawBrickPattern(g, 42, wallY + 2, CW - 84, wallH - 4);

        // Towers
        const towerW = 60, towerH = CH - 25, towerY = 15;
        this._drawTower(g, 8, towerY, towerW, towerH); // Left
        this._drawTower(g, CW - towerW - 8, towerY, towerW, towerH); // Right

        // Gatehouse
        const gateW = 50, gateX = CW / 2 - gateW / 2, gateH = wallH - 20;
        g.rect(gateX, wallY - 15, gateW, gateH + 35).fill({ color: COL_STONE }).stroke({ color: COL_STONE_DK, width: 1 });
        this._drawBrickPattern(g, gateX + 2, wallY - 13, gateW - 4, gateH + 30);
        this._drawCrenellations(g, gateX, wallY - 15, gateW);

        // Gate Arch (Background)
        const archCX = CW / 2, archTop = wallY + 20 + 15, archW = 28, archH = gateH - 20;
        g.rect(archCX - archW / 2, archTop + archH * 0.3, archW, archH * 0.7).fill({ color: COL_WOOD_DK });
        g.ellipse(archCX, archTop + archH * 0.3, archW / 2, archH * 0.3).fill({ color: COL_WOOD_DK });

        // Decorative windows
        const gateWinY = wallY + 14;
        this._drawWindow(g, archCX - 48, gateWinY, 16, 22);
        this._drawWindow(g, archCX + 32, gateWinY, 16, 22);

        // Walkway & Moss
        this._drawCrenellations(g, 40, wallY - 2, CW - 80);
        this._drawMoss(g, 13, towerY + towerH - 15, 12);
        this._drawMoss(g, CW - 20, towerY + towerH - 10, 10);
        this._drawMoss(g, gateX + 3, wallY + gateH + 5, 8);
        this._drawSmallWindow(g, gateX + gateW - 14, wallY - 5);
    }

    private _drawTower(g: Graphics, x: number, y: number, w: number, h: number): void {
        g.rect(x, y, w, h).fill({ color: COL_STONE_LT }).stroke({ color: COL_STONE_DK, width: 1.5 });
        this._drawBrickPattern(g, x + 2, y + 2, w - 4, h - 4);
        g.moveTo(x - 4, y).lineTo(x + w / 2, y - 28).lineTo(x + w + 4, y).closePath().fill({ color: COL_ROOF }).stroke({ color: COL_ROOF_DK, width: 1 });
        this._drawCrenellations(g, x, y, w);
        this._drawWindow(g, x + w / 2 - 10, y + 50, 20, 26);
        this._drawArrowSlit(g, x + 12, y + 100);
        this._drawArrowSlit(g, x + w - 18, y + 100);
        this._drawWindow(g, x + w / 2 - 10, y + 140, 20, 26);
    }

    private _drawBrickPattern(g: Graphics, x: number, y: number, w: number, h: number): void {
        for (let row = 0; row < h; row += 10) {
            const offset = (Math.floor(row / 10) % 2) * 15;
            g.moveTo(x, y + row).lineTo(x + w, y + row).stroke({ color: COL_MORTAR, width: 0.4, alpha: 0.3 });
            for (let col = offset; col < w; col += 30) {
                g.moveTo(x + col, y + row).lineTo(x + col, y + row + 10).stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.25 });
            }
        }
    }

    private _drawCrenellations(g: Graphics, x: number, y: number, w: number): void {
        const merlonW = 8, merlonH = 7, gap = 6, step = merlonW + gap;
        for (let mx = x + 2; mx < x + w - merlonW; mx += step) {
            g.rect(mx, y - merlonH, merlonW, merlonH).fill({ color: COL_STONE_LT }).stroke({ color: COL_STONE_DK, width: 0.5 });
        }
    }

    private _drawWindow(g: Graphics, x: number, y: number, w: number, h: number): void {
        g.rect(x - 2, y - 2, w + 4, h + 4).fill({ color: COL_WINDOW_FRAME });
        g.rect(x, y, w, h).fill({ color: COL_WINDOW });
        g.ellipse(x + w / 2, y + 2, w / 2, 5).fill({ color: COL_WINDOW_FRAME });
        g.moveTo(x + w / 2, y + 3).lineTo(x + w / 2, y + h).stroke({ color: COL_WINDOW_FRAME, width: 1.5 });
        g.moveTo(x, y + h * 0.45).lineTo(x + w, y + h * 0.45).stroke({ color: COL_WINDOW_FRAME, width: 1.5 });
    }

    private _drawSmallWindow(g: Graphics, x: number, y: number): void {
        g.rect(x, y, 6, 8).fill({ color: COL_WINDOW }).stroke({ color: COL_WINDOW_FRAME, width: 0.5 });
    }

    private _drawArrowSlit(g: Graphics, x: number, y: number): void {
        g.rect(x + 2, y, 2, 14).fill({ color: COL_WINDOW });
        g.rect(x, y + 5, 6, 2).fill({ color: COL_WINDOW });
    }

    private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
        g.ellipse(x + w / 2, y, w / 2, 3).fill({ color: COL_MOSS, alpha: 0.5 });
    }

    // ── Flags ───────────────────────────────────────────────────────────────────

    private _drawFlags(): void {
        this._flagL.position.set(8 + 30 + 2, 15 - 28 - 2);
        this._flagR.position.set(CW - 60 - 8 + 30 + 2, 15 - 28 - 2);
    }

    private _updateFlags(): void {
        this._drawFlagShape(this._flagL, this._flagTime);
        this._drawFlagShape(this._flagR, this._flagTime + 1.5);
    }

    private _drawFlagShape(g: Graphics, time: number): void {
        g.clear();
        g.moveTo(0, 0).lineTo(0, -20).stroke({ color: 0x888888, width: 2 });
        const w1 = Math.sin(time) * 3, w2 = Math.sin(time * 1.3 + 1) * 4, w3 = Math.sin(time * 0.9 + 2) * 3;
        const fW = 18, fH = 12;
        g.moveTo(0, -20).bezierCurveTo(fW * 0.3, -20 + w1, fW * 0.6, -20 + w2, fW, -20 + w3)
            .lineTo(fW, -20 + fH + w3).bezierCurveTo(fW * 0.6, -20 + fH + w2, fW * 0.3, -20 + fH + w1, 0, -20 + fH)
            .closePath().fill({ color: this._playerColor }).stroke({ color: this._playerColor, width: 0.5 });
        g.moveTo(fW / 2 - 3, -14).lineTo(fW / 2 + 3, -14).stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
    }

    // ── Characters ──────────────────────────────────────────────────────────────

    private _drawPrincess(t: number): void {
        const g = this._princessGfx; g.clear();
        const wx = 38, wy = 15 + 50 + 6; // ltCenter
        let hY = (t < 0.2) ? wy + 18 * (1 - t / 0.2) : (t > 0.8) ? wy + 18 * ((t - 0.8) / 0.2) : wy;
        if (hY > wy + 18) return;
        g.rect(wx - 6, hY + 4, 12, 10).fill({ color: COL_DRESS });
        g.circle(wx, hY, 5).fill({ color: COL_SKIN });
        g.ellipse(wx, hY - 1, 6, 6).fill({ color: COL_HAIR });
        if (t > 0.2 && t < 0.8) {
            const wave = Math.sin((t - 0.2) / 0.6 * Math.PI * 6) * 6;
            g.moveTo(wx + 5, hY + 5).lineTo(wx + 8 + wave, hY + 2).stroke({ color: COL_SKIN, width: 2 });
            g.rect(wx + 8 + wave, hY - 2, 6, 4).fill({ color: COL_HANKY });
        }
    }

    private _drawKing(t: number): void {
        const g = this._kingGfx; g.clear();
        const wx = CW - 38, wy = 15 + 50 + 6;
        let hY = (t < 0.2) ? wy + 18 * (1 - t / 0.2) : (t > 0.8) ? wy + 18 * ((t - 0.8) / 0.2) : wy;
        if (hY > wy + 18) return;
        g.rect(wx - 6, hY + 4, 12, 10).fill({ color: COL_KING_ARMOR });
        g.circle(wx, hY, 5).fill({ color: COL_KING_SKIN });
        g.moveTo(wx - 4, hY - 4).lineTo(wx, hY - 8).lineTo(wx + 4, hY - 4).closePath().fill({ color: COL_CROWN });
        if (t > 0.2 && t < 0.8) {
            const ang = Math.sin((t - 0.2) / 0.6 * Math.PI * 4) * 0.8;
            g.moveTo(wx + 5, hY + 5).lineTo(wx + 8, hY + 2).stroke({ color: COL_KING_SKIN, width: 2 });
            g.moveTo(wx + 8, hY + 2).lineTo(wx + 8 + Math.sin(ang) * 15, hY + 2 - Math.cos(ang) * 15).stroke({ color: COL_KING_SWORD, width: 2 });
        }
    }

    private _updateGuards(phase: GamePhase): void {
        const g = this._guardsGfx; const z = this._zzzGfx;
        g.clear(); z.clear();
        const gX = CW / 2, gY = CH - 20, off = 35, panic = (phase !== GamePhase.PREP);
        this._drawGuard(g, z, gX - off, gY, 0, panic);
        this._drawGuard(g, z, gX + off, gY, 1, panic);
    }

    private _drawGuard(g: Graphics, z: Graphics, x: number, y: number, id: number, panic: boolean): void {
        const time = this._flagTime / FLAG_SPEED;
        const breathe = Math.sin(time * 2 + id) * 0.5;
        const snoring = !panic && (Math.floor(time * 0.15 + id * 0.5) % 2 === 0);
        let hY = y - 22 + (snoring ? 2 : breathe);
        if (panic) hY += Math.sin(time * 15) * 0.5;

        // Feet / Boots
        g.rect(x - 5, y - 4, 4, 4).fill({ color: 0x332211 }); // Left
        g.rect(x + 1, y - 4, 4, 4).fill({ color: 0x332211 }); // Right

        // Body (tunic)
        g.rect(x - 6, y - 16, 12, 12).fill({ color: 0x556677 });
        // Armor / Belt Detail
        g.rect(x - 6, y - 10, 12, 2).fill({ color: 0x333333, alpha: 0.4 }); // Belt
        g.rect(x - 2, y - 15, 4, 5).fill({ color: 0x8899aa, alpha: 0.3 }); // Chest piece

        // Head
        g.circle(x, hY, 6).fill({ color: 0x9999aa });
        // Eyes
        g.circle(x - 2, hY, 0.8).fill({ color: 0x000000, alpha: 0.6 });
        g.circle(x + 2, hY, 0.8).fill({ color: 0x000000, alpha: 0.6 });

        // Helmet Brim
        g.rect(x - 7, hY, 14, 2).fill({ color: 0x777788 });
        g.moveTo(x - 8, hY).lineTo(x + 8, hY).stroke({ color: 0x777788, width: 2 });

        if (panic) {
            g.moveTo(x - 6, y - 12).lineTo(x - 8, hY).stroke({ color: 0x556677, width: 2 });
            g.moveTo(x + 6, y - 12).lineTo(x + 8, hY).stroke({ color: 0x556677, width: 2 });
        } else {
            g.moveTo(x - 6, y - 12).lineTo(x - 12, y - 8).stroke({ color: 0x556677, width: 3 });
            g.moveTo(x + 6, y - 12).lineTo(x + 12, y - 8).stroke({ color: 0x556677, width: 3 });
        }

        const pX = x + (id === 0 ? -12 : 12);
        // Pole
        g.moveTo(pX, y).lineTo(pX, y - 45).stroke({ color: COL_WOOD_DK, width: 2 });
        // Spearhead Base
        g.moveTo(pX, y - 45).lineTo(pX, y - 52).stroke({ color: 0xccddee, width: 3 });
        // Sharp Tip
        g.moveTo(pX - 3, y - 52).lineTo(pX, y - 60).lineTo(pX + 3, y - 52).closePath().fill({ color: 0xccddee });

        if (snoring) {
            const life = (time * 0.5 + id * 0.3) % 1.0;
            const zx = x + Math.sin(time * 2) * 4, zy = hY - 5 - life * 20;
            z.position.set(zx, zy); z.scale.set(0.5 + life * 0.5); z.alpha = 1.0 - life;
            z.moveTo(0, 0).lineTo(4, 0).lineTo(0, 4).lineTo(4, 4).stroke({ color: 0xffffff, width: 1 });
        }
    }

    private _updateGate(open: number): void {
        const g = this._gateDoorGfx; g.clear();
        const aT = 60 + 20 + 15, aW = 28, aH = (CH - 60 - 20) - 20, aCX = CW / 2;
        const li = open * aH * 0.8;
        for (let py = aT + aH * 0.1; py < aT + aH; py += 8) {
            const cy = py - li;
            if (cy >= aT) g.moveTo(aCX - aW / 2 + 3, cy).lineTo(aCX + aW / 2 - 3, cy).stroke({ color: COL_PORTCULLIS, width: 1.5, alpha: 0.7 });
        }
        for (let px = aCX - aW / 2 + 6; px < aCX + aW / 2; px += 8) {
            const sy = Math.max(aT + aH * 0.1 - li, aT), ey = aT + aH - 3 - li;
            if (ey > sy) g.moveTo(px, sy).lineTo(px, ey).stroke({ color: COL_PORTCULLIS, width: 1.5, alpha: 0.7 });
        }
    }

    private _updateJester(t: number): void {
        const j = this._jesterGfx, b = this._ballGfx;
        j.clear(); b.clear();
        if (t > JESTER_APPEAR) { j.visible = false; b.visible = false; this._updateGate(0); return; }
        j.visible = true; this._updateGate(1.0);
        const st = t / JESTER_APPEAR, gX = CW / 2, gY = CH - 22;
        let jX = gX;

        if (st < 0.2) {
            jX = gX - 5 + st * 50;
            this._drawJester(j, jX, gY);
        } else if (st < 0.7) {
            jX = gX + 5;
            this._drawJester(j, jX, gY);
            if (st > 0.4 && st < 0.6) {
                b.visible = true;
                const bT = (st - 0.4) / 0.2, tx = gX + 35, ty = CH - 42;
                const bx = (jX + 5) + (tx - (jX + 5)) * bT;
                const by = (gY - 10) + (ty - (gY - 10)) * bT - Math.sin(bT * Math.PI) * 30;
                this._drawBall(b, bx, by);
            } else { b.visible = false; }
        } else {
            jX = gX + 5 - (st - 0.7) * 33;
            this._drawJester(j, jX, gY);
            if (st > 0.9) this._updateGate(1.0 - (st - 0.9) * 10);
        }
    }

    private _drawJester(g: Graphics, x: number, y: number): void {
        g.circle(x, y - 18, 4).fill({ color: COL_SKIN });
        g.rect(x - 4, y - 14, 4, 10).fill({ color: COL_JESTER1 });
        g.rect(x, y - 14, 4, 10).fill({ color: COL_JESTER2 });
        g.moveTo(x - 4, y - 20).lineTo(x - 8, y - 24).stroke({ color: COL_JESTER1, width: 2 });
        g.moveTo(x + 4, y - 20).lineTo(x + 8, y - 24).stroke({ color: COL_JESTER2, width: 2 });
    }

    private _drawBall(g: Graphics, x: number, y: number): void {
        g.circle(x, y, 3).fill({ color: 0xffaa00 }).stroke({ color: 0x000000, width: 0.5 });
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
