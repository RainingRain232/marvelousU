import { Container, Graphics } from "pixi.js";

const TS = 64;

// Palette
const COL_FIRE_INNER = 0xffaa00;
const COL_FIRE_OUTER = 0xff4400;
const COL_WOOD = 0x5c3a1e;
const COL_STONE = 0x888888;
const COL_SKIN = 0xf0c8a0;
const COL_DRESS = 0xcc4488;
const COL_HAIR = 0xf0d060;
const COL_PEASANT = 0x8b4513;
const COL_GUITAR = 0xa0522d;
const COL_KETTLE = 0x3a3a3a;
const COL_KETTLE_HI = 0x555555;

export class FirepitRenderer {
    readonly container = new Container();
    private _fireGfx = new Graphics();
    private _kettleGfx = new Graphics();
    private _charactersGfx = new Graphics();
    private _notesGfx = new Graphics();

    private _time = 0;
    private _notes: Array<{ x: number; y: number; life: number; vx: number; vy: number; symbol: number }> = [];

    constructor() {
        this._drawGround();
        this.container.addChild(this._fireGfx);
        this.container.addChild(this._kettleGfx);
        this.container.addChild(this._charactersGfx);
        this.container.addChild(this._notesGfx);
    }

    tick(dt: number): void {
        this._time += dt;
        this._drawFire();
        this._drawKettle();
        this._drawCharacters();
        this._updateNotes(dt);
    }

    private _drawGround(): void {
        const g = new Graphics();
        // Ashy/dirt circle under the fire
        g.ellipse(TS, TS * 0.7, 40, 20)
            .fill({ color: 0x333333, alpha: 0.4 });
        // Stone ring
        for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            g.circle(TS + Math.cos(ang) * 15, TS * 0.7 + Math.sin(ang) * 8, 4)
                .fill({ color: COL_STONE });
        }
        this.container.addChildAt(g, 0);
    }

    private _drawFire(): void {
        const g = this._fireGfx;
        g.clear();

        const cx = TS;
        const cy = TS * 0.7;

        // Logs — crossed
        g.moveTo(cx - 12, cy + 2).lineTo(cx + 12, cy - 3)
            .stroke({ color: COL_WOOD, width: 4, cap: "round" });
        g.moveTo(cx - 10, cy - 3).lineTo(cx + 10, cy + 2)
            .stroke({ color: COL_WOOD, width: 3.5, cap: "round" });

        // Embers at base
        for (let i = 0; i < 4; i++) {
            const ex = cx + (i - 1.5) * 5;
            const ey = cy + Math.sin(this._time * 3 + i * 2) * 1;
            const ea = 0.4 + Math.sin(this._time * 5 + i) * 0.3;
            g.circle(ex, ey, 1.5).fill({ color: 0xff6600, alpha: ea });
        }

        // Flickering flames
        const flicker = Math.sin(this._time * 15) * 2;
        const count = 5;
        for (let i = 0; i < count; i++) {
            const offX = (i - 2) * 5;
            const h = 15 + Math.sin(this._time * 10 + i) * 5 + flicker;

            g.moveTo(cx + offX - 4, cy)
                .quadraticCurveTo(cx + offX, cy - h, cx + offX + 4, cy)
                .fill({ color: COL_FIRE_OUTER, alpha: 0.7 });

            g.moveTo(cx + offX - 2, cy)
                .quadraticCurveTo(cx + offX, cy - h * 0.6, cx + offX + 2, cy)
                .fill({ color: COL_FIRE_INNER });
        }

        // Sparks rising
        for (let i = 0; i < 3; i++) {
            const sparkT = (this._time * 2 + i * 1.3) % 3;
            if (sparkT < 2) {
                const sx = cx + Math.sin(sparkT * 3 + i) * 6;
                const sy = cy - 10 - sparkT * 12;
                const sa = 1 - sparkT / 2;
                g.circle(sx, sy, 0.8).fill({ color: 0xffcc44, alpha: sa });
            }
        }
    }

    // --- Kettle over fire on wooden sticks ---
    private _drawKettle(): void {
        const g = this._kettleGfx;
        g.clear();

        const cx = TS;
        const cy = TS * 0.7;

        // Two forked sticks — Y-shaped supports on either side of the fire
        // Left stick
        g.moveTo(cx - 18, cy + 5).lineTo(cx - 14, cy - 18)
            .stroke({ color: COL_WOOD, width: 2.5, cap: "round" });
        // Left fork prongs
        g.moveTo(cx - 14, cy - 18).lineTo(cx - 16, cy - 23)
            .stroke({ color: COL_WOOD, width: 1.5, cap: "round" });
        g.moveTo(cx - 14, cy - 18).lineTo(cx - 12, cy - 22)
            .stroke({ color: COL_WOOD, width: 1.5, cap: "round" });

        // Right stick
        g.moveTo(cx + 18, cy + 5).lineTo(cx + 14, cy - 18)
            .stroke({ color: COL_WOOD, width: 2.5, cap: "round" });
        // Right fork prongs
        g.moveTo(cx + 14, cy - 18).lineTo(cx + 12, cy - 23)
            .stroke({ color: COL_WOOD, width: 1.5, cap: "round" });
        g.moveTo(cx + 14, cy - 18).lineTo(cx + 16, cy - 22)
            .stroke({ color: COL_WOOD, width: 1.5, cap: "round" });

        // Horizontal spit resting in the forks
        g.moveTo(cx - 14, cy - 20).lineTo(cx + 14, cy - 20)
            .stroke({ color: COL_WOOD, width: 2, cap: "round" });

        // Kettle handle — wire arch from spit
        const kettleY = cy - 14;
        g.moveTo(cx - 3, cy - 20)
            .bezierCurveTo(cx - 3, cy - 18, cx - 3, kettleY - 2, cx - 3, kettleY)
            .stroke({ color: 0x555555, width: 1.2 });
        g.moveTo(cx + 3, cy - 20)
            .bezierCurveTo(cx + 3, cy - 18, cx + 3, kettleY - 2, cx + 3, kettleY)
            .stroke({ color: 0x555555, width: 1.2 });

        // Kettle body — rounded pot
        g.ellipse(cx, kettleY + 3, 7, 5)
            .fill({ color: COL_KETTLE });
        // Rim
        g.ellipse(cx, kettleY, 7, 2)
            .fill({ color: COL_KETTLE_HI });
        // Highlight
        g.ellipse(cx - 2, kettleY + 1, 2, 2)
            .fill({ color: 0x666666, alpha: 0.5 });

        // Steam wisps rising from kettle
        for (let i = 0; i < 3; i++) {
            const st = (this._time * 1.5 + i * 0.8) % 3;
            if (st < 2.5) {
                const sx = cx + Math.sin(st * 2 + i) * 4 + (i - 1) * 2;
                const sy = kettleY - 4 - st * 6;
                const sa = (1 - st / 2.5) * 0.3;
                g.circle(sx, sy, 1.5 + st * 0.5).fill({ color: 0xcccccc, alpha: sa });
            }
        }
    }

    private _drawCharacters(): void {
        const g = this._charactersGfx;
        g.clear();

        const cx = TS;
        const cy = TS * 0.7;

        // --- Dancing couple (Left) — holding hands, coordinated ---
        this._drawDancingCouple(g, cx, cy);

        // --- Relaxed person lying on the ground (behind fire, below) ---
        this._drawLyingPerson(g, cx + 10, cy + 18);

        // --- Bard (Right) ---
        this._drawBard(g, cx + 42, cy);
    }

    // -----------------------------------------------------------------------
    // Dancing couple — they face each other, hold hands, and spin/sway
    // -----------------------------------------------------------------------
    private _drawDancingCouple(g: Graphics, cx: number, cy: number): void {
        const t = this._time * 3;

        // Couple orbits a point to the left of fire
        const pivotX = cx - 40;
        const pivotY = cy - 2;
        const orbitR = 10;

        // Shared bounce
        const bounce = Math.abs(Math.sin(t * 1.5)) * 4;
        const sway = Math.sin(t) * 0.12;

        // Female position — orbiting
        const fAng = t * 0.6;
        const fX = pivotX + Math.cos(fAng) * orbitR;
        const fY = pivotY + Math.sin(fAng) * orbitR * 0.4 - bounce;

        // Male position — opposite side of orbit
        const mX = pivotX + Math.cos(fAng + Math.PI) * orbitR;
        const mY = pivotY + Math.sin(fAng + Math.PI) * orbitR * 0.4 - bounce;

        // Draw rear person first (whoever has higher Y = further back in iso view)
        if (fY < mY) {
            this._drawFemale(g, fX, fY, sway, t);
            this._drawMaleDancer(g, mX, mY, -sway, t);
        } else {
            this._drawMaleDancer(g, mX, mY, -sway, t);
            this._drawFemale(g, fX, fY, sway, t);
        }

        // Held hands — line connecting their inner hands
        const fHandX = fX + (mX > fX ? 6 : -6);
        const fHandY = fY - 14 + Math.sin(t * 2) * 2;
        const mHandX = mX + (fX > mX ? 5 : -5);
        const mHandY = mY - 12 + Math.sin(t * 2) * 2;

        // Arms reaching to each other
        g.moveTo(fHandX, fHandY)
            .bezierCurveTo(
                (fHandX + mHandX) / 2, Math.min(fHandY, mHandY) - 3,
                (fHandX + mHandX) / 2, Math.min(fHandY, mHandY) - 3,
                mHandX, mHandY)
            .stroke({ color: COL_SKIN, width: 2, cap: "round" });
    }

    private _drawFemale(g: Graphics, x: number, y: number, tilt: number, t: number): void {
        const drawAt = (px: number, py: number) => ({
            x: x + px - py * tilt,
            y: y + py,
        });

        // Feet stepping
        const stepL = Math.sin(t * 1.5) * 3;
        const stepR = Math.sin(t * 1.5 + Math.PI) * 3;

        // Shoes
        const shoeL = drawAt(-3, 1 + stepL);
        const shoeR = drawAt(3, 1 + stepR);
        g.ellipse(shoeL.x, shoeL.y, 3, 1.5).fill({ color: 0x8b4040 });
        g.ellipse(shoeR.x, shoeR.y, 3, 1.5).fill({ color: 0x8b4040 });

        // Legs
        g.moveTo(shoeL.x, shoeL.y - 1).lineTo(drawAt(-2, -5).x, drawAt(-2, -5).y)
            .stroke({ color: COL_SKIN, width: 2.5 });
        g.moveTo(shoeR.x, shoeR.y - 1).lineTo(drawAt(2, -5).x, drawAt(2, -5).y)
            .stroke({ color: COL_SKIN, width: 2.5 });

        // Dress — flared trapezoid with swaying hem
        const hemWave = Math.sin(t * 2) * 2;
        const dl = drawAt(-8 - hemWave, -2);
        const dr = drawAt(8 + hemWave, -2);
        const tl = drawAt(-3, -18);
        const tr = drawAt(3, -18);
        g.moveTo(dl.x, dl.y).lineTo(dr.x, dr.y)
            .lineTo(tr.x, tr.y).lineTo(tl.x, tl.y).closePath()
            .fill({ color: COL_DRESS });

        // White lace trim at hem
        g.moveTo(dl.x, dl.y)
            .bezierCurveTo(dl.x + 4, dl.y + 1.5, dr.x - 4, dr.y + 1.5, dr.x, dr.y)
            .stroke({ color: 0xffffff, width: 1.5, alpha: 0.7 });

        // Waist sash
        const sl = drawAt(-4, -13);
        const sr = drawAt(4, -13);
        g.moveTo(sl.x, sl.y).lineTo(sr.x, sr.y)
            .stroke({ color: 0xffd700, width: 2, alpha: 0.7 });

        // Free arm waving up
        const wave = Math.sin(t * 2 + 1) * 5;
        const freeHand = drawAt(-7, -20 + wave);
        g.moveTo(drawAt(-3, -16).x, drawAt(-3, -16).y)
            .lineTo(freeHand.x, freeHand.y)
            .stroke({ color: COL_SKIN, width: 2, cap: "round" });
        g.circle(freeHand.x, freeHand.y, 2).fill({ color: COL_SKIN });

        // Neck
        const neck = drawAt(0, -19);
        g.rect(neck.x - 1.5, neck.y, 3, 3).fill({ color: COL_SKIN });

        // Hair behind head
        const hairB = drawAt(0, -24);
        g.ellipse(hairB.x, hairB.y + 1, 6, 8).fill({ color: COL_HAIR });

        // Head
        const head = drawAt(0, -23);
        g.circle(head.x, head.y, 4.5).fill({ color: COL_SKIN });

        // Rosy cheeks
        g.circle(head.x - 2.5, head.y + 1, 1.2).fill({ color: 0xee9999, alpha: 0.5 });
        g.circle(head.x + 2.5, head.y + 1, 1.2).fill({ color: 0xee9999, alpha: 0.5 });

        // Eyes
        g.circle(head.x - 1.5, head.y - 0.5, 0.7).fill({ color: 0x222222 });
        g.circle(head.x + 1.5, head.y - 0.5, 0.7).fill({ color: 0x222222 });

        // Hair top
        const hairT = drawAt(0, -27);
        g.ellipse(hairT.x, hairT.y, 5, 3).fill({ color: COL_HAIR });
        // Side hair curls
        g.ellipse(drawAt(-4, -22).x, drawAt(-4, -22).y, 2, 4).fill({ color: COL_HAIR });
        g.ellipse(drawAt(4, -22).x, drawAt(4, -22).y, 2, 4).fill({ color: COL_HAIR });
    }

    private _drawMaleDancer(g: Graphics, x: number, y: number, tilt: number, t: number): void {
        const drawAt = (px: number, py: number) => ({
            x: x + px - py * tilt,
            y: y + py,
        });

        // Feet stepping (opposite phase)
        const stepL = Math.sin(t * 1.5 + 0.5) * 3;
        const stepR = Math.sin(t * 1.5 + Math.PI + 0.5) * 3;

        // Boots
        const bootL = drawAt(-3, 1 + stepL);
        const bootR = drawAt(3, 1 + stepR);
        g.roundRect(bootL.x - 3, bootL.y - 2, 5, 3, 1).fill({ color: 0x3d2b1f });
        g.roundRect(bootR.x - 2, bootR.y - 2, 5, 3, 1).fill({ color: 0x3d2b1f });

        // Legs — trousers
        g.moveTo(bootL.x, bootL.y - 2).lineTo(drawAt(-2, -6).x, drawAt(-2, -6).y)
            .stroke({ color: 0x5a4020, width: 3 });
        g.moveTo(bootR.x, bootR.y - 2).lineTo(drawAt(2, -6).x, drawAt(2, -6).y)
            .stroke({ color: 0x5a4020, width: 3 });

        // Tunic body
        const bl = drawAt(-5, -5);
        const br = drawAt(5, -5);
        const tl = drawAt(-4, -17);
        const tr = drawAt(4, -17);
        g.moveTo(bl.x, bl.y).lineTo(br.x, br.y)
            .lineTo(tr.x, tr.y).lineTo(tl.x, tl.y).closePath()
            .fill({ color: COL_PEASANT });

        // Belt
        const beltL = drawAt(-5, -8);
        const beltR = drawAt(5, -8);
        g.moveTo(beltL.x, beltL.y).lineTo(beltR.x, beltR.y)
            .stroke({ color: 0x2a1a08, width: 2 });
        // Belt buckle
        const buckle = drawAt(0, -8);
        g.circle(buckle.x, buckle.y, 1.2).fill({ color: 0xccaa44 });

        // Sleeves / arms
        const armWave = Math.sin(t * 2 + 0.5) * 3;
        // Free arm
        const freeHand = drawAt(6, -18 + armWave);
        g.moveTo(drawAt(4, -15).x, drawAt(4, -15).y)
            .lineTo(freeHand.x, freeHand.y)
            .stroke({ color: COL_PEASANT, width: 3, cap: "round" });
        g.circle(freeHand.x, freeHand.y, 2).fill({ color: COL_SKIN });

        // Neck
        const neck = drawAt(0, -17);
        g.rect(neck.x - 1.5, neck.y - 1, 3, 3).fill({ color: COL_SKIN });

        // Head
        const head = drawAt(0, -21);
        g.circle(head.x, head.y, 4).fill({ color: COL_SKIN });

        // Hair
        g.moveTo(head.x - 4, head.y)
            .arc(head.x, head.y, 4, Math.PI, 0)
            .fill({ color: 0x442211 });

        // Eyes
        g.circle(head.x - 1.3, head.y - 0.3, 0.6).fill({ color: 0x222222 });
        g.circle(head.x + 1.3, head.y - 0.3, 0.6).fill({ color: 0x222222 });

        // Smile
        g.moveTo(head.x - 1.5, head.y + 1.5)
            .bezierCurveTo(head.x - 0.5, head.y + 2.5, head.x + 0.5, head.y + 2.5, head.x + 1.5, head.y + 1.5)
            .stroke({ color: 0x663333, width: 0.8 });
    }

    // -----------------------------------------------------------------------
    // Person lying relaxed on the ground
    // -----------------------------------------------------------------------
    private _drawLyingPerson(g: Graphics, x: number, y: number): void {
        const breathe = Math.sin(this._time * 1.5) * 0.8;

        // Blanket / bedroll under them
        g.ellipse(x, y + 2, 16, 4).fill({ color: 0x556633, alpha: 0.6 });

        // Legs — stretched out to the right
        g.moveTo(x + 2, y + 1).lineTo(x + 14, y + 2)
            .stroke({ color: 0x5a4020, width: 3, cap: "round" });
        // Boots
        g.ellipse(x + 15, y + 2, 3, 1.5).fill({ color: 0x3d2b1f });

        // Body — lying on back, slight breathing
        g.ellipse(x, y - 1 + breathe, 6, 3).fill({ color: 0x6b5530 });

        // Arm behind head (pillow)
        g.moveTo(x - 2, y - 2).lineTo(x - 8, y - 5)
            .stroke({ color: COL_SKIN, width: 2, cap: "round" });

        // Other arm resting on belly
        g.moveTo(x + 2, y - 1).lineTo(x + 3, y - 3 + breathe)
            .stroke({ color: COL_SKIN, width: 2, cap: "round" });
        g.circle(x + 3, y - 3 + breathe, 1.5).fill({ color: COL_SKIN });

        // Head — turned slightly to side
        g.circle(x - 10, y - 3, 3.5).fill({ color: COL_SKIN });

        // Hair
        g.ellipse(x - 11, y - 5, 3, 2.5).fill({ color: 0x664422 });

        // Closed eyes — just lines (sleeping/relaxing)
        g.moveTo(x - 11.5, y - 3.5).lineTo(x - 10, y - 3.5)
            .stroke({ color: 0x333333, width: 0.7 });
        g.moveTo(x - 9, y - 3.5).lineTo(x - 7.5, y - 3.5)
            .stroke({ color: 0x333333, width: 0.7 });

        // Straw hat resting on chest
        g.ellipse(x + 1, y - 3 + breathe, 5, 2).fill({ color: 0xccbb66 });
        g.ellipse(x + 1, y - 4 + breathe, 3, 1.5).fill({ color: 0xbbaa55 });
    }

    // -----------------------------------------------------------------------
    // Bard with improved lute animation
    // -----------------------------------------------------------------------
    private _drawBard(g: Graphics, x: number, y: number): void {
        const t = this._time;
        const bodyBob = Math.sin(t * 3) * 1.5;
        const headBob = Math.sin(t * 3 + 0.3) * 1;
        const legTap = Math.abs(Math.sin(t * 6)) * 3;

        // --- Legs ---
        // Right leg (static, weight-bearing)
        g.moveTo(x + 2, y).lineTo(x + 2, y - 8)
            .stroke({ color: 0x228b22, width: 4, cap: "round" });
        // Right boot — pointy
        g.moveTo(x + 2, y).lineTo(x + 7, y + 1)
            .stroke({ color: 0x4b3621, width: 3, cap: "round" });

        // Left leg (tapping)
        g.moveTo(x - 2, y - legTap).lineTo(x - 2, y - 8)
            .stroke({ color: 0x228b22, width: 4, cap: "round" });
        // Left boot — pointy
        g.moveTo(x - 2, y - legTap).lineTo(x - 7, y - legTap + 1)
            .stroke({ color: 0x4b3621, width: 3, cap: "round" });

        // --- Body/Shirt ---
        const bodyY = y - 8 + bodyBob;
        // Torso
        g.roundRect(x - 5, bodyY - 14, 10, 14, 2)
            .fill({ color: 0x2e8b57 });

        // Vest/waistcoat over shirt
        g.roundRect(x - 4, bodyY - 12, 8, 10, 1)
            .fill({ color: 0x1a5e3a });

        // White collar / V-neck
        g.moveTo(x - 3, bodyY - 14).lineTo(x, bodyY - 10).lineTo(x + 3, bodyY - 14)
            .stroke({ color: 0xffffff, width: 1.2 });

        // Buttons
        for (let i = 0; i < 3; i++) {
            g.circle(x, bodyY - 9 + i * 3, 0.8).fill({ color: 0xddcc88 });
        }

        // Belt
        g.moveTo(x - 5, bodyY - 2).lineTo(x + 5, bodyY - 2)
            .stroke({ color: 0x3d2b1f, width: 2 });
        g.circle(x, bodyY - 2, 1).fill({ color: 0xccaa44 });

        // --- Lute (held at angle, strumming arm animates) ---
        const strumAngle = Math.sin(t * 8) * 0.15; // lute rocks with strumming
        const strumOff = Math.sin(t * 8) * 1.5;

        // Left arm — holds neck of lute
        const leftShoulder = { x: x - 5, y: bodyY - 12 };
        const leftElbow = { x: x - 9, y: bodyY - 8 };
        const leftHand = { x: x - 10, y: bodyY - 14 + strumOff * 0.3 };
        g.moveTo(leftShoulder.x, leftShoulder.y)
            .lineTo(leftElbow.x, leftElbow.y)
            .stroke({ color: 0x2e8b57, width: 3, cap: "round" });
        g.moveTo(leftElbow.x, leftElbow.y)
            .lineTo(leftHand.x, leftHand.y)
            .stroke({ color: COL_SKIN, width: 2.5, cap: "round" });
        g.circle(leftHand.x, leftHand.y, 1.8).fill({ color: COL_SKIN });

        // Lute body (pear-shaped, held against body at angle)
        const luteX = x - 4;
        const luteY = bodyY - 8 + strumOff * 0.3;
        // Sound hole body
        g.ellipse(luteX, luteY, 6, 4.5)
            .fill({ color: COL_GUITAR });
        // Lighter front panel
        g.ellipse(luteX, luteY, 5, 3.5)
            .fill({ color: 0xc47040, alpha: 0.6 });
        // Sound hole
        g.circle(luteX, luteY + 0.5, 1.5)
            .fill({ color: 0x331100 });
        // Rosette around sound hole
        g.circle(luteX, luteY + 0.5, 2.2)
            .stroke({ color: 0xddaa66, width: 0.5 });

        // Lute neck (going up-left toward left hand)
        g.moveTo(luteX - 2, luteY - 4)
            .lineTo(leftHand.x, leftHand.y)
            .stroke({ color: 0x5c3a1e, width: 2.5, cap: "round" });

        // Strings on neck
        g.moveTo(luteX - 1, luteY - 2)
            .lineTo(leftHand.x + 1, leftHand.y + 1)
            .stroke({ color: 0xddddaa, width: 0.4, alpha: 0.6 });
        g.moveTo(luteX, luteY - 2)
            .lineTo(leftHand.x + 1.5, leftHand.y + 1)
            .stroke({ color: 0xddddaa, width: 0.4, alpha: 0.6 });

        // Peghead with tuning pegs
        const pegX = leftHand.x - 2;
        const pegY = leftHand.y - 3;
        g.moveTo(leftHand.x, leftHand.y).lineTo(pegX, pegY)
            .stroke({ color: 0x5c3a1e, width: 2 });
        // Pegs
        g.circle(pegX - 1, pegY, 0.8).fill({ color: 0x442200 });
        g.circle(pegX + 1, pegY - 1, 0.8).fill({ color: 0x442200 });

        // Right arm — strumming hand
        const rightShoulder = { x: x + 5, y: bodyY - 12 };
        const rightElbow = { x: x + 3, y: bodyY - 6 };
        const strumHandX = luteX + 1 + strumOff;
        const strumHandY = luteY + 1 + Math.abs(strumOff) * 0.5;
        g.moveTo(rightShoulder.x, rightShoulder.y)
            .lineTo(rightElbow.x, rightElbow.y)
            .stroke({ color: 0x2e8b57, width: 3, cap: "round" });
        g.moveTo(rightElbow.x, rightElbow.y)
            .lineTo(strumHandX, strumHandY)
            .stroke({ color: COL_SKIN, width: 2.5, cap: "round" });
        // Fingers strumming
        g.circle(strumHandX, strumHandY, 1.5).fill({ color: COL_SKIN });

        // String vibration lines when strumming
        if (Math.abs(strumOff) > 0.8) {
            const vibAlpha = Math.abs(strumOff) / 1.5 * 0.4;
            g.moveTo(luteX - 1, luteY - 1)
                .bezierCurveTo(luteX, luteY - 2, luteX + 1, luteY, luteX + 2, luteY - 1)
                .stroke({ color: 0xddddaa, width: 0.6, alpha: vibAlpha });
        }

        // --- Neck ---
        g.rect(x - 1.5, bodyY - 16, 3, 3).fill({ color: COL_SKIN });

        // --- Head ---
        const headY = bodyY - 20 + headBob;

        // Long brown hair behind
        g.ellipse(x, headY + 3, 6, 7).fill({ color: 0x442211 });

        // Face
        g.circle(x, headY, 4.5).fill({ color: COL_SKIN });

        // Eyes — looking toward lute
        g.circle(x - 1.8, headY - 0.5, 0.8).fill({ color: 0x222222 });
        g.circle(x + 1, headY - 0.5, 0.7).fill({ color: 0x222222 });

        // Slight smile
        g.moveTo(x - 1.5, headY + 1.8)
            .bezierCurveTo(x - 0.5, headY + 2.8, x + 0.5, headY + 2.8, x + 1.5, headY + 1.8)
            .stroke({ color: 0x884444, width: 0.7 });

        // Hat with feather
        const hatY = headY - 4;
        // Brim
        g.ellipse(x, hatY + 1, 7, 2).fill({ color: 0x5c4033 });
        // Crown
        g.roundRect(x - 4, hatY - 4, 8, 5, 2).fill({ color: 0x5c4033 });
        // Hat band
        g.moveTo(x - 4, hatY).lineTo(x + 4, hatY)
            .stroke({ color: 0x884422, width: 1 });
        // Feather — curved quill
        g.moveTo(x + 3, hatY - 3)
            .bezierCurveTo(x + 7, hatY - 8, x + 9, hatY - 10, x + 6, hatY - 12)
            .stroke({ color: 0xffffff, width: 1.5 });
        // Feather barbs
        g.moveTo(x + 7, hatY - 8).lineTo(x + 9, hatY - 7)
            .stroke({ color: 0xeeeeee, width: 0.8 });
        g.moveTo(x + 8, hatY - 10).lineTo(x + 10, hatY - 9)
            .stroke({ color: 0xeeeeee, width: 0.8 });

        // Spawn musical notes
        if (Math.random() < 0.06) {
            const noteType = Math.floor(Math.random() * 3);
            this._notes.push({
                x: x - 6,
                y: bodyY - 10,
                life: 2.0,
                vx: -8 + Math.random() * 16,
                vy: -15 - Math.random() * 15,
                symbol: noteType,
            });
        }
    }

    private _updateNotes(dt: number): void {
        const g = this._notesGfx;
        g.clear();

        for (let i = this._notes.length - 1; i >= 0; i--) {
            const n = this._notes[i];
            n.life -= dt;
            n.x += n.vx * dt;
            n.y += n.vy * dt;
            n.vy += 5 * dt; // gentle float

            if (n.life <= 0) {
                this._notes.splice(i, 1);
                continue;
            }

            const alpha = Math.min(1, n.life * 1.5);
            const wobble = Math.sin(this._time * 4 + i) * 1.5;

            if (n.symbol === 0) {
                // Eighth note — filled head + stem + flag
                g.circle(n.x + wobble, n.y, 2).fill({ color: 0xffffff, alpha });
                g.moveTo(n.x + wobble + 2, n.y).lineTo(n.x + wobble + 2, n.y - 7)
                    .stroke({ color: 0xffffff, width: 1, alpha });
                g.moveTo(n.x + wobble + 2, n.y - 7)
                    .bezierCurveTo(n.x + wobble + 4, n.y - 6, n.x + wobble + 5, n.y - 4, n.x + wobble + 5, n.y - 3)
                    .stroke({ color: 0xffffff, width: 1, alpha });
            } else if (n.symbol === 1) {
                // Quarter note — filled head + stem
                g.ellipse(n.x + wobble, n.y, 2.5, 1.8).fill({ color: 0xffffff, alpha });
                g.moveTo(n.x + wobble + 2.5, n.y).lineTo(n.x + wobble + 2.5, n.y - 7)
                    .stroke({ color: 0xffffff, width: 1, alpha });
            } else {
                // Double eighth — two filled heads connected by beam
                g.circle(n.x + wobble - 2, n.y, 1.5).fill({ color: 0xffffff, alpha });
                g.circle(n.x + wobble + 2, n.y - 1, 1.5).fill({ color: 0xffffff, alpha });
                g.moveTo(n.x + wobble - 0.5, n.y).lineTo(n.x + wobble - 0.5, n.y - 6)
                    .stroke({ color: 0xffffff, width: 0.8, alpha });
                g.moveTo(n.x + wobble + 3.5, n.y - 1).lineTo(n.x + wobble + 3.5, n.y - 7)
                    .stroke({ color: 0xffffff, width: 0.8, alpha });
                // Beam
                g.moveTo(n.x + wobble - 0.5, n.y - 6).lineTo(n.x + wobble + 3.5, n.y - 7)
                    .stroke({ color: 0xffffff, width: 1.2, alpha });
            }
        }
    }
}
