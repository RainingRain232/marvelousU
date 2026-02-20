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
//
// All drawing uses PixiJS Graphics. The castle container is 4×TILE_SIZE wide
// and 4×TILE_SIZE tall. Animations are driven by `tickCastle(dt, phase)`.

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

// Princess palette
const COL_SKIN = 0xf0c8a0;
const COL_HAIR = 0xf0d060;
const COL_HAIR_DK = 0xd4a830;
const COL_DRESS = 0xcc4488;
const COL_HANKY = 0xffffff;

// King palette
const COL_KING_SKIN = 0xd4a574;
const COL_CROWN = 0xffd700;
const COL_CROWN_GEM = 0xff2200;
const COL_KING_ARMOR = 0x8899aa;
const COL_KING_SWORD = 0xc0c8d0;

// Animation timing
const PRINCESS_CYCLE = 8.0; // seconds per full princess cycle
const PRINCESS_APPEAR = 2.5; // seconds she's visible
const KING_CYCLE = 6.0;
const KING_APPEAR = 2.0;
const FLAG_SPEED = 3.0; // radians/sec

// ---------------------------------------------------------------------------
// CastleRenderer
// ---------------------------------------------------------------------------

export class CastleRenderer {
    readonly container = new Container();

    // Sub-containers for layering
    private _base = new Graphics();    // walls, keep, static details
    private _flagL = new Graphics();   // left tower flag
    private _flagR = new Graphics();   // right tower flag
    private _princessGfx = new Graphics();
    private _kingGfx = new Graphics();

    // Timers
    private _flagTime = 0;
    private _princessTimer = 0;
    private _kingTimer = 0;

    // Player color
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

        this._princessGfx.visible = false;
        this._kingGfx.visible = false;
    }

    /**
     * Tick animations each frame.
     *  - Waving flags (always)
     *  - Princess in left tower (PREP phase)
     *  - King in right tower (BATTLE / RESOLVE phase)
     */
    tick(dt: number, phase: GamePhase): void {
        this._flagTime += dt * FLAG_SPEED;
        this._updateFlags();

        // Princess (PREP / idle)
        if (phase === GamePhase.PREP) {
            this._princessTimer += dt;
            if (this._princessTimer > PRINCESS_CYCLE) {
                this._princessTimer -= PRINCESS_CYCLE;
            }
            const t = this._princessTimer;
            if (t < PRINCESS_APPEAR) {
                this._princessGfx.visible = true;
                this._drawPrincess(t / PRINCESS_APPEAR);
            } else {
                this._princessGfx.visible = false;
            }
            this._kingGfx.visible = false;
        } else {
            // King (BATTLE / RESOLVE)
            this._kingTimer += dt;
            if (this._kingTimer > KING_CYCLE) {
                this._kingTimer -= KING_CYCLE;
            }
            const t = this._kingTimer;
            if (t < KING_APPEAR) {
                this._kingGfx.visible = true;
                this._drawKing(t / KING_APPEAR);
            } else {
                this._kingGfx.visible = false;
            }
            this._princessGfx.visible = false;
        }
    }

    // ---------------------------------------------------------------------------
    // Static castle structure
    // ---------------------------------------------------------------------------

    private _drawStaticCastle(): void {
        const g = this._base;

        // ── Main curtain wall ──
        const wallY = 60;
        const wallH = CH - wallY - 20;

        // Back wall fill
        g.rect(40, wallY, CW - 80, wallH)
            .fill({ color: COL_STONE })
            .stroke({ color: COL_STONE_DK, width: 1 });

        // Stone brick pattern on main wall
        this._drawBrickPattern(g, 42, wallY + 2, CW - 84, wallH - 4);

        // ── Left tower ──
        const towerW = 60;
        const towerH = CH - 25;
        const ltX = 8;
        const towerY = 15;

        // Tower body
        g.rect(ltX, towerY, towerW, towerH)
            .fill({ color: COL_STONE_LT })
            .stroke({ color: COL_STONE_DK, width: 1.5 });
        this._drawBrickPattern(g, ltX + 2, towerY + 2, towerW - 4, towerH - 4);

        // Tower roof (pointed)
        g.moveTo(ltX - 4, towerY)
            .lineTo(ltX + towerW / 2, towerY - 28)
            .lineTo(ltX + towerW + 4, towerY)
            .closePath()
            .fill({ color: COL_ROOF })
            .stroke({ color: COL_ROOF_DK, width: 1 });
        // Roof highlight
        g.moveTo(ltX + towerW / 2, towerY - 28)
            .lineTo(ltX + towerW / 2 + 8, towerY - 4)
            .lineTo(ltX + towerW / 2, towerY - 4)
            .closePath()
            .fill({ color: COL_ROOF, alpha: 0.7 });

        // Crenellations on left tower
        this._drawCrenellations(g, ltX, towerY, towerW);

        // Tower window (where princess appears)
        const winLX = ltX + towerW / 2 - 10;
        const winLY = towerY + 50;
        this._drawWindow(g, winLX, winLY, 20, 26);

        // Arrow slits on left tower
        this._drawArrowSlit(g, ltX + 12, towerY + 100);
        this._drawArrowSlit(g, ltX + towerW - 18, towerY + 100);

        // ── Right tower ──
        const rtX = CW - towerW - 8;

        g.rect(rtX, towerY, towerW, towerH)
            .fill({ color: COL_STONE_LT })
            .stroke({ color: COL_STONE_DK, width: 1.5 });
        this._drawBrickPattern(g, rtX + 2, towerY + 2, towerW - 4, towerH - 4);

        // Right tower roof
        g.moveTo(rtX - 4, towerY)
            .lineTo(rtX + towerW / 2, towerY - 28)
            .lineTo(rtX + towerW + 4, towerY)
            .closePath()
            .fill({ color: COL_ROOF })
            .stroke({ color: COL_ROOF_DK, width: 1 });
        g.moveTo(rtX + towerW / 2, towerY - 28)
            .lineTo(rtX + towerW / 2 + 8, towerY - 4)
            .lineTo(rtX + towerW / 2, towerY - 4)
            .closePath()
            .fill({ color: COL_ROOF, alpha: 0.7 });

        this._drawCrenellations(g, rtX, towerY, towerW);

        // Tower window (where king appears)
        const winRX = rtX + towerW / 2 - 10;
        const winRY = towerY + 50;
        this._drawWindow(g, winRX, winRY, 20, 26);

        // Arrow slits on right tower
        this._drawArrowSlit(g, rtX + 12, towerY + 100);
        this._drawArrowSlit(g, rtX + towerW - 18, towerY + 100);

        // ── Central gatehouse ──
        const gateW = 50;
        const gateX = CW / 2 - gateW / 2;
        const gateY = wallY + 20;
        const gateH = wallH - 20;

        // Gatehouse walls (rises above curtain wall)
        g.rect(gateX, wallY - 15, gateW, gateH + 35)
            .fill({ color: COL_STONE })
            .stroke({ color: COL_STONE_DK, width: 1 });
        this._drawBrickPattern(g, gateX + 2, wallY - 13, gateW - 4, gateH + 30);

        // Gatehouse crenellations
        this._drawCrenellations(g, gateX, wallY - 15, gateW);

        // Gate arch
        const archCX = CW / 2;
        const archTop = gateY + 15;
        const archW = 28;
        const archH = gateH - 20;
        g.rect(archCX - archW / 2, archTop + archH * 0.3, archW, archH * 0.7)
            .fill({ color: COL_WOOD_DK });
        // Arch top (semicircle)
        g.ellipse(archCX, archTop + archH * 0.3, archW / 2, archH * 0.3)
            .fill({ color: COL_WOOD_DK });

        // Portcullis grid lines
        for (let py = archTop + archH * 0.1; py < archTop + archH; py += 8) {
            g.moveTo(archCX - archW / 2 + 3, py)
                .lineTo(archCX + archW / 2 - 3, py)
                .stroke({ color: COL_PORTCULLIS, width: 1.5, alpha: 0.7 });
        }
        for (let px = archCX - archW / 2 + 6; px < archCX + archW / 2; px += 8) {
            g.moveTo(px, archTop + archH * 0.1)
                .lineTo(px, archTop + archH - 3)
                .stroke({ color: COL_PORTCULLIS, width: 1.5, alpha: 0.7 });
        }

        // ── Wall-top walkway between towers ──
        const walkwayY = wallY - 2;
        this._drawCrenellations(g, 40, walkwayY, CW - 80);

        // ── Moss patches ──
        this._drawMoss(g, ltX + 5, towerY + towerH - 15, 12);
        this._drawMoss(g, rtX + towerW - 14, towerY + towerH - 10, 10);
        this._drawMoss(g, gateX + 3, gateY + gateH + 5, 8);
        this._drawMoss(g, CW / 2 + 20, wallY + wallH - 8, 7);

        // ── Small windows on keep ──
        this._drawSmallWindow(g, gateX + gateW - 14, wallY - 5);
    }

    // ---------------------------------------------------------------------------
    // Detail helpers
    // ---------------------------------------------------------------------------

    private _drawBrickPattern(g: Graphics, x: number, y: number, w: number, h: number): void {
        for (let row = 0; row < h; row += 10) {
            const offset = (Math.floor(row / 10) % 2) * 15;
            // Horizontal mortar line
            g.moveTo(x, y + row)
                .lineTo(x + w, y + row)
                .stroke({ color: COL_MORTAR, width: 0.4, alpha: 0.3 });
            // Vertical mortar lines (staggered)
            for (let col = offset; col < w; col += 30) {
                g.moveTo(x + col, y + row)
                    .lineTo(x + col, y + row + 10)
                    .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.25 });
            }
        }
    }

    private _drawCrenellations(g: Graphics, x: number, y: number, w: number): void {
        const merlonW = 8;
        const merlonH = 7;
        const gap = 6;
        const step = merlonW + gap;
        for (let mx = x + 2; mx < x + w - merlonW; mx += step) {
            g.rect(mx, y - merlonH, merlonW, merlonH)
                .fill({ color: COL_STONE_LT })
                .stroke({ color: COL_STONE_DK, width: 0.5 });
        }
    }

    private _drawWindow(g: Graphics, x: number, y: number, w: number, h: number): void {
        // Stone frame
        g.rect(x - 2, y - 2, w + 4, h + 4)
            .fill({ color: COL_WINDOW_FRAME });
        // Window opening
        g.rect(x, y, w, h)
            .fill({ color: COL_WINDOW });
        // Arch top
        g.ellipse(x + w / 2, y + 2, w / 2, 5)
            .fill({ color: COL_WINDOW_FRAME });
        // Cross bars
        g.moveTo(x + w / 2, y + 3).lineTo(x + w / 2, y + h)
            .stroke({ color: COL_WINDOW_FRAME, width: 1.5 });
        g.moveTo(x, y + h * 0.45).lineTo(x + w, y + h * 0.45)
            .stroke({ color: COL_WINDOW_FRAME, width: 1.5 });
    }

    private _drawSmallWindow(g: Graphics, x: number, y: number): void {
        g.rect(x, y, 6, 8)
            .fill({ color: COL_WINDOW })
            .stroke({ color: COL_WINDOW_FRAME, width: 0.5 });
    }

    private _drawArrowSlit(g: Graphics, x: number, y: number): void {
        g.rect(x + 2, y, 2, 14)
            .fill({ color: COL_WINDOW });
        g.rect(x, y + 5, 6, 2)
            .fill({ color: COL_WINDOW });
    }

    private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
        g.ellipse(x + w / 2, y, w / 2, 3)
            .fill({ color: COL_MOSS, alpha: 0.5 });
        g.ellipse(x + w / 2 + 2, y - 1, w / 3, 2)
            .fill({ color: COL_MOSS, alpha: 0.3 });
    }

    // ---------------------------------------------------------------------------
    // Flags
    // ---------------------------------------------------------------------------

    private _drawFlags(): void {
        // Left flag — positioned at left tower top
        this._flagL.position.set(8 + 30 + 2, 15 - 28 - 2); // tower center top, above roof peak
        // Right flag — positioned at right tower top
        this._flagR.position.set(CW - 60 - 8 + 30 + 2, 15 - 28 - 2);
    }

    private _updateFlags(): void {
        this._drawFlagShape(this._flagL, this._flagTime);
        this._drawFlagShape(this._flagR, this._flagTime + 1.5); // phase offset
    }

    private _drawFlagShape(g: Graphics, time: number): void {
        g.clear();

        // Pole
        g.moveTo(0, 0).lineTo(0, -20)
            .stroke({ color: 0x888888, width: 2 });

        // Waving flag — 3 control points for a wave effect
        const w1 = Math.sin(time) * 3;
        const w2 = Math.sin(time * 1.3 + 1) * 4;
        const w3 = Math.sin(time * 0.9 + 2) * 3;
        const flagW = 18;
        const flagH = 12;

        g.moveTo(0, -20)
            .bezierCurveTo(flagW * 0.3, -20 + w1, flagW * 0.6, -20 + w2, flagW, -20 + w3)
            .lineTo(flagW, -20 + flagH + w3)
            .bezierCurveTo(flagW * 0.6, -20 + flagH + w2, flagW * 0.3, -20 + flagH + w1, 0, -20 + flagH)
            .closePath()
            .fill({ color: this._playerColor })
            .stroke({ color: this._playerColor, width: 0.5 });

        // Cross / emblem on flag
        const cx = flagW * 0.5;
        const cy = -20 + flagH / 2 + (w1 + w2) / 3;
        g.moveTo(cx - 3, cy).lineTo(cx + 3, cy).stroke({ color: 0xffffff, width: 1.5, alpha: 0.7 });
        g.moveTo(cx, cy - 3).lineTo(cx, cy + 3).stroke({ color: 0xffffff, width: 1.5, alpha: 0.7 });
    }

    // ---------------------------------------------------------------------------
    // Princess animation (left tower window)
    // ---------------------------------------------------------------------------

    private _drawPrincess(t: number): void {
        const g = this._princessGfx;
        g.clear();

        // Window position (left tower)
        const wx = 8 + 30 / 2 + 1; // left tower center
        const wy = 15 + 50 + 6;    // window Y + offset into window

        // Appearance: t goes 0→1 over PRINCESS_APPEAR seconds
        // 0.0–0.2: peek up   0.2–0.8: wave   0.8–1.0: duck down
        let headY: number;
        if (t < 0.2) {
            headY = wy + 18 * (1 - t / 0.2); // rising from bottom of window
        } else if (t > 0.8) {
            headY = wy + 18 * ((t - 0.8) / 0.2); // sinking back down
        } else {
            headY = wy; // fully visible
        }

        // Clip: only draw within window area
        if (headY > wy + 18) return;

        // Body/dress peeking above window sill
        g.rect(wx - 6, headY + 4, 12, 10)
            .fill({ color: COL_DRESS });

        // Head
        g.circle(wx, headY, 5)
            .fill({ color: COL_SKIN });

        // Hair — long blonde flowing down sides
        g.ellipse(wx, headY - 1, 6, 6)
            .fill({ color: COL_HAIR });
        // Hair strands flowing down
        g.moveTo(wx - 5, headY + 2)
            .bezierCurveTo(wx - 7, headY + 10, wx - 6, headY + 16, wx - 4, headY + 20)
            .stroke({ color: COL_HAIR, width: 3 });
        g.moveTo(wx + 5, headY + 2)
            .bezierCurveTo(wx + 7, headY + 10, wx + 6, headY + 16, wx + 4, headY + 20)
            .stroke({ color: COL_HAIR, width: 3 });
        // Hair highlight
        g.moveTo(wx - 4, headY + 3)
            .bezierCurveTo(wx - 5, headY + 8, wx - 4, headY + 14, wx - 3, headY + 18)
            .stroke({ color: COL_HAIR_DK, width: 1, alpha: 0.5 });

        // Face details
        g.circle(wx - 2, headY - 1, 0.7).fill({ color: 0x333333 }); // left eye
        g.circle(wx + 2, headY - 1, 0.7).fill({ color: 0x333333 }); // right eye
        g.ellipse(wx, headY + 1.5, 1.5, 0.7).fill({ color: 0xdd6688 }); // mouth

        // Handkerchief wave (only when fully visible)
        if (t > 0.2 && t < 0.8) {
            const waveT = (t - 0.2) / 0.6;
            const waveAngle = Math.sin(waveT * Math.PI * 6) * 12;
            const handX = wx + 8;
            const handY = headY + 2;

            // Arm
            g.moveTo(wx + 5, headY + 5)
                .lineTo(handX, handY)
                .stroke({ color: COL_SKIN, width: 2 });

            // Handkerchief (small waving rectangle)
            const hx = handX + waveAngle * 0.3;
            const hy = handY - 4 + Math.abs(waveAngle) * 0.2;
            g.moveTo(handX, handY)
                .lineTo(hx + 5, hy - 2)
                .lineTo(hx + 7, hy + 4)
                .lineTo(handX + 2, handY + 3)
                .closePath()
                .fill({ color: COL_HANKY, alpha: 0.9 });
        }
    }

    // ---------------------------------------------------------------------------
    // King animation (right tower window)
    // ---------------------------------------------------------------------------

    private _drawKing(t: number): void {
        const g = this._kingGfx;
        g.clear();

        // Window position (right tower)
        const wx = CW - 60 - 8 + 30; // right tower center
        const wy = 15 + 50 + 6;

        // Appearance timing
        let headY: number;
        if (t < 0.2) {
            headY = wy + 18 * (1 - t / 0.2);
        } else if (t > 0.8) {
            headY = wy + 18 * ((t - 0.8) / 0.2);
        } else {
            headY = wy;
        }

        if (headY > wy + 18) return;

        // Armored body
        g.rect(wx - 6, headY + 4, 12, 10)
            .fill({ color: COL_KING_ARMOR });

        // Head
        g.circle(wx, headY, 5)
            .fill({ color: COL_KING_SKIN });

        // Crown
        g.moveTo(wx - 5, headY - 4)
            .lineTo(wx - 5, headY - 7)
            .lineTo(wx - 3, headY - 5)
            .lineTo(wx, headY - 9)
            .lineTo(wx + 3, headY - 5)
            .lineTo(wx + 5, headY - 7)
            .lineTo(wx + 5, headY - 4)
            .closePath()
            .fill({ color: COL_CROWN });
        // Crown gem
        g.circle(wx, headY - 7, 1.2)
            .fill({ color: COL_CROWN_GEM });

        // Beard
        g.moveTo(wx - 3, headY + 2)
            .bezierCurveTo(wx - 4, headY + 6, wx, headY + 8, wx + 4, headY + 6)
            .bezierCurveTo(wx + 3, headY + 4, wx + 3, headY + 2, wx + 3, headY + 2)
            .fill({ color: 0x553322 });

        // Face details
        g.circle(wx - 2, headY - 1, 0.7).fill({ color: 0x333333 });
        g.circle(wx + 2, headY - 1, 0.7).fill({ color: 0x333333 });

        // Sword wave (only when fully visible)
        if (t > 0.2 && t < 0.8) {
            const waveT = (t - 0.2) / 0.6;
            const swordAngle = Math.sin(waveT * Math.PI * 4) * 0.8 - 0.3;

            const shoulderX = wx + 6;
            const shoulderY = headY + 3;

            // Arm
            g.moveTo(wx + 5, headY + 5)
                .lineTo(shoulderX + 4, shoulderY)
                .stroke({ color: COL_KING_SKIN, width: 2 });

            // Sword
            const bladeLen = 16;
            const cos = Math.cos(swordAngle);
            const sin = Math.sin(swordAngle);
            const tipX = shoulderX + 4 + sin * bladeLen;
            const tipY = shoulderY - cos * bladeLen;
            const baseX = shoulderX + 4;
            const baseY = shoulderY;

            g.moveTo(baseX, baseY)
                .lineTo(tipX, tipY)
                .stroke({ color: COL_KING_SWORD, width: 2.5 });
            // Crossguard
            const cg1x = baseX + cos * 3;
            const cg1y = baseY + sin * 3;
            const cg2x = baseX - cos * 3;
            const cg2y = baseY - sin * 3;
            g.moveTo(cg1x, cg1y).lineTo(cg2x, cg2y)
                .stroke({ color: 0x886633, width: 2 });
        }
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
