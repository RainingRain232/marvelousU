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

export class FirepitRenderer {
    readonly container = new Container();
    private _fireGfx = new Graphics();
    private _charactersGfx = new Graphics();
    private _notesGfx = new Graphics();

    private _time = 0;
    private _notes: Array<{ x: number, y: number, life: number, vx: number, vy: number }> = [];

    constructor() {
        this._drawGround();
        this.container.addChild(this._fireGfx);
        this.container.addChild(this._charactersGfx);
        this.container.addChild(this._notesGfx);
    }

    tick(dt: number): void {
        this._time += dt;
        this._drawFire();
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

        const centerX = TS;
        const centerY = TS * 0.7;

        // Logs
        g.rect(centerX - 10, centerY - 2, 20, 4).fill({ color: COL_WOOD });
        g.rect(centerX - 2, centerY - 10, 4, 20).fill({ color: COL_WOOD, alpha: 0.8 });

        // Flickering flames
        const flicker = Math.sin(this._time * 15) * 2;
        const count = 5;
        for (let i = 0; i < count; i++) {
            const offX = (i - 2) * 5;
            const h = 15 + Math.sin(this._time * 10 + i) * 5 + flicker;

            g.moveTo(centerX + offX - 4, centerY)
                .quadraticCurveTo(centerX + offX, centerY - h, centerX + offX + 4, centerY)
                .fill({ color: COL_FIRE_OUTER, alpha: 0.7 });

            g.moveTo(centerX + offX - 2, centerY)
                .quadraticCurveTo(centerX + offX, centerY - h * 0.6, centerX + offX + 2, centerY)
                .fill({ color: COL_FIRE_INNER });
        }
    }

    private _drawCharacters(): void {
        const g = this._charactersGfx;
        g.clear();

        const centerX = TS;
        const centerY = TS * 0.7;

        // --- Dancers (Left) ---
        const danceT = this._time * 4;
        const danceY = Math.abs(Math.sin(danceT)) * 4;
        const danceTilt = Math.sin(danceT) * 0.1;

        // Female dancer
        this._drawPerson(g, centerX - 35, centerY - danceY, "female", danceTilt);
        // Male dancer
        this._drawPerson(g, centerX - 55, centerY - (Math.abs(Math.sin(danceT + 1)) * 4), "male", -danceTilt);

        // --- Bard (Right) ---
        const bardX = centerX + 40;
        const bardY = centerY;
        this._drawPerson(g, bardX, bardY, "bard", 0);
    }

    private _drawPerson(g: Graphics, x: number, y: number, type: "female" | "male" | "bard", tilt: number): void {
        const drawAt = (px: number, py: number) => {
            const rx = x + px - (py * tilt);
            const ry = y + py;
            return { x: rx, y: ry };
        };

        if (type === "female") {
            const danceT = this._time * 4;
            // Legs/Feet
            const foot1Y = Math.sin(danceT) * 3;
            const foot2Y = Math.sin(danceT + Math.PI) * 3;
            g.rect(x - 4, y - 5 + foot1Y, 3, 5).fill({ color: COL_SKIN }); // Left leg
            g.rect(x + 1, y - 5 + foot2Y, 3, 5).fill({ color: COL_SKIN }); // Right leg

            // Dress
            const p1 = drawAt(-8, 0);
            const p2 = drawAt(8, 0);
            const p3 = drawAt(3, -18);
            const p4 = drawAt(-3, -18);
            g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y).lineTo(p3.x, p3.y).lineTo(p4.x, p4.y).closePath().fill({ color: COL_DRESS });
            // Dress Trim (White hem)
            g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y).stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
            // Bodice Detail
            const b1 = drawAt(-3, -12);
            const b2 = drawAt(3, -12);
            g.moveTo(b1.x, b1.y).lineTo(b2.x, b2.y).stroke({ color: 0xffd700, width: 1, alpha: 0.6 });

            // Moving Hands/Arms
            const wave = Math.sin(danceT * 2) * 5;
            const h1 = drawAt(-6, -14 + wave);
            const h2 = drawAt(6, -14 - wave);
            g.circle(h1.x, h1.y, 2.5).fill({ color: COL_SKIN }); // Left hand
            g.circle(h2.x, h2.y, 2.5).fill({ color: COL_SKIN }); // Right hand

            // Hair
            const h = drawAt(0, -25);
            g.ellipse(h.x, h.y, 7, 9).fill({ color: COL_HAIR });
            // Head
            const head = drawAt(0, -23);
            g.circle(head.x, head.y, 4.5).fill({ color: COL_SKIN });
        } else if (type === "male") {
            // Peasant tunic
            const p1 = drawAt(-4, 0);
            const p2 = drawAt(4, 0);
            const p3 = drawAt(4, -15);
            const p4 = drawAt(-4, -15);
            g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y).lineTo(p3.x, p3.y).lineTo(p4.x, p4.y).closePath().fill({ color: COL_PEASANT });
            // Head
            const head = drawAt(0, -20);
            g.circle(head.x, head.y, 4).fill({ color: COL_SKIN });
            // Simple hair
            const hs1 = drawAt(-4, -20);
            g.moveTo(hs1.x, hs1.y).arc(head.x, head.y, 4, Math.PI, 0).fill({ color: 0x442211 });
        } else {
            // Bard
            const danceT = this._time * 4;
            const bWave = Math.sin(danceT) * 2;
            const legTap = Math.abs(Math.sin(this._time * 6)) * 4;

            // Pants & Moving Leg
            // Right Leg (static)
            const rLegBase = drawAt(2, 0);
            g.rect(rLegBase.x - 2, rLegBase.y - 8, 4, 8).fill({ color: 0x228b22 }); // Green pants
            g.moveTo(rLegBase.x, rLegBase.y).lineTo(rLegBase.x + 6, rLegBase.y).lineTo(rLegBase.x, rLegBase.y - 2).closePath().fill({ color: 0x4b3621 }); // Pointy shoe

            // Left Leg (moving knee/foot)
            const lLegBase = drawAt(-2, 0 - legTap);
            g.rect(lLegBase.x - 2, lLegBase.y - 8, 4, 8).fill({ color: 0x228b22 }); // Green pants
            g.moveTo(lLegBase.x, lLegBase.y).lineTo(lLegBase.x - 6, lLegBase.y).lineTo(lLegBase.x, lLegBase.y - 2).closePath().fill({ color: 0x4b3621 }); // Pointy shoe

            // Shirt & Buttons
            const p1 = drawAt(-4, -8);
            const p2 = drawAt(4, -8);
            const p3 = drawAt(4, -20);
            const p4 = drawAt(-4, -20);
            g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y).lineTo(p3.x, p3.y).lineTo(p4.x, p4.y).closePath().fill({ color: 0x2e8b57 }); // Green shirt

            // White buttons
            for (let i = 0; i < 3; i++) {
                const bt = drawAt(0, -10 - i * 4);
                g.circle(bt.x, bt.y, 1).fill({ color: 0xffffff });
            }

            // White Sleeves/Arms
            const sl1 = drawAt(-5, -16 + bWave);
            const sl2 = drawAt(5, -16 - bWave);
            g.moveTo(p4.x, p4.y).lineTo(sl1.x, sl1.y).stroke({ color: 0xffffff, width: 3 });
            g.moveTo(p3.x, p3.y).lineTo(sl2.x, sl2.y).stroke({ color: 0xffffff, width: 3 });

            // Head & Long Hair
            const head = drawAt(0, -24);
            // Long brown hair underneath
            g.ellipse(head.x, head.y + 2, 6, 8).fill({ color: 0x442211 });
            g.circle(head.x, head.y, 4).fill({ color: COL_SKIN });

            // Eyes
            const eyeL = drawAt(-1.2, -24);
            const eyeR = drawAt(1.2, -24);
            g.circle(eyeL.x, eyeL.y, 0.7).fill({ color: 0x000000 });
            g.circle(eyeR.x, eyeR.y, 0.7).fill({ color: 0x000000 });

            // Hat with Feather
            const hatTop = drawAt(0, -28);
            g.rect(hatTop.x - 5, hatTop.y - 2, 10, 4).fill({ color: 0x5c4033 }); // Hat brim
            g.rect(hatTop.x - 3, hatTop.y - 6, 6, 4).fill({ color: 0x5c4033 }); // Hat top
            // Feather
            const f1 = drawAt(2, -32);
            const f2 = drawAt(6, -36);
            g.moveTo(f1.x, f1.y).lineTo(f2.x, f2.y).stroke({ color: 0xffffff, width: 1.5 });

            // Lute Refinement (Body + Neck + Peghead)
            const strum = Math.sin(this._time * 8) * 2;
            const lBody = drawAt(8, -14 + strum);
            const lNeckStart = drawAt(2, -15 + strum);
            const lNeckEnd = drawAt(14, -15 + strum);
            const lPeghead = drawAt(18, -18 + strum);

            g.ellipse(lBody.x, lBody.y, 6, 4).fill({ color: COL_GUITAR }); // Lute body
            g.moveTo(lNeckStart.x, lNeckStart.y).lineTo(lNeckEnd.x, lNeckEnd.y).stroke({ color: 0x331100, width: 2 }); // Lute neck
            g.moveTo(lNeckEnd.x, lNeckEnd.y).lineTo(lPeghead.x, lPeghead.y).stroke({ color: 0x331100, width: 2 }); // Peghead (top part)

            // Spawn notes if strumming "hard"
            if (Math.random() < 0.05) {
                this._notes.push({
                    x: x + 10,
                    y: y - 18,
                    life: 1.5,
                    vx: 10 + Math.random() * 20,
                    vy: -20 - Math.random() * 20
                });
            }
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
            n.vy += 10 * dt; // slight drift/gravity

            if (n.life <= 0) {
                this._notes.splice(i, 1);
                continue;
            }

            const alpha = Math.min(1, n.life * 2);
            // Draw a simple note shape (eighth note)
            g.circle(n.x, n.y, 2).fill({ color: 0xffffff, alpha });
            g.moveTo(n.x + 2, n.y).lineTo(n.x + 2, n.y - 6).lineTo(n.x + 5, n.y - 4)
                .stroke({ color: 0xffffff, width: 1, alpha });
        }
    }
}
