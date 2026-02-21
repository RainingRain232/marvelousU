import { Container, Graphics } from "pixi.js";

const COL_SKIN = 0xf0c8a0;
const COL_HAT = 0x5c4033;
const COL_FEATHER = 0xffffff;
const COL_STRAW = 0xd4af37;
const COL_SHIRT = 0x556677; // Dusty blue/grey
const COL_PANTS = 0x228b22; // Green pants
const COL_SHOES = 0x4b3621;

export enum FarmerState {
    WALKING = "walking",
    RESTING = "resting",
}

export class FarmerRenderer {
    readonly container = new Container();
    private _body = new Container();
    private _gfx = new Graphics();
    private _notesGfx = new Graphics();

    private _state = FarmerState.WALKING;
    private _stateTimer = 0;
    private _time = 0;
    private _whistleTimer = 0;

    private _startPos: { x: number; y: number };
    private _targetPos: { x: number; y: number };
    private _speed = 30 + Math.random() * 10;
    private _progress = 0;

    private _notes: Array<{ x: number; y: number; life: number; vx: number; vy: number }> = [];

    constructor(start: { x: number; y: number }, target: { x: number; y: number }) {
        this._startPos = start;
        this._targetPos = target;

        this.container.position.set(start.x, start.y);
        this.container.addChild(this._body);
        this._body.addChild(this._gfx);
        this.container.addChild(this._notesGfx);

        this._drawFarmer();

        // Randomly start with some offset
        this._time = Math.random() * 10;
        this._whistleTimer = 2 + Math.random() * 5;
    }

    private _drawFarmer(): void {
        const g = this._gfx;
        g.clear();

        // 1. Leg Tapping/Walk Cycle
        // We'll use this._time in update to move _body.y, but we draw the static parts here.

        // Legs (Green Pants)
        g.rect(-3, -5, 3, 5).fill({ color: COL_PANTS }); // Left leg
        g.rect(1, -5, 3, 5).fill({ color: COL_PANTS });  // Right leg

        // Shoes
        g.moveTo(-3, 0).lineTo(-7, 0).lineTo(-3, -2).closePath().fill({ color: COL_SHOES }); // Pointy left
        g.moveTo(4, 0).lineTo(8, 0).lineTo(4, -2).closePath().fill({ color: COL_SHOES });   // Pointy right

        // Tunic
        g.moveTo(-5, -5).lineTo(5, -5).lineTo(4, -18).lineTo(-4, -18).closePath().fill({ color: COL_SHIRT });

        // Bundle of Straw (over right shoulder)
        g.rect(2, -22, 10, 6).fill({ color: COL_STRAW });
        // Ties on straw
        g.rect(4, -22, 1, 6).fill({ color: 0x331100, alpha: 0.5 });
        g.rect(8, -22, 1, 6).fill({ color: 0x331100, alpha: 0.5 });

        // Head
        const headY = -22;
        g.circle(0, headY, 4.5).fill({ color: COL_SKIN });
        // Eyes
        g.circle(-1.5, headY - 1, 0.7).fill({ color: 0x000000 });
        g.circle(1.5, headY - 1, 0.7).fill({ color: 0x000000 });

        // Hat
        const hatY = -26;
        g.rect(-6, hatY - 2, 12, 3).fill({ color: COL_HAT }); // brim
        g.rect(-4, hatY - 6, 8, 4).fill({ color: COL_HAT }); // top

        // Feather
        g.moveTo(2, hatY - 6).lineTo(6, hatY - 12).stroke({ color: COL_FEATHER, width: 1.5 });
    }

    update(dt: number): void {
        this._time += dt;
        this._stateTimer -= dt;

        if (this._stateTimer <= 0) {
            if (this._state === FarmerState.WALKING) {
                // Randomly rest
                if (Math.random() < 0.2) {
                    this._state = FarmerState.RESTING;
                    this._stateTimer = 1.5 + Math.random() * 3;
                } else {
                    this._stateTimer = 2 + Math.random() * 4;
                }
            } else {
                this._state = FarmerState.WALKING;
                this._stateTimer = 3 + Math.random() * 6;
            }
        }

        if (this._state === FarmerState.WALKING) {
            const dx = this._targetPos.x - this._startPos.x;
            const dy = this._targetPos.y - this._startPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const moveStep = (this._speed * dt) / dist;
            this._progress += moveStep;

            this.container.x = this._startPos.x + dx * this._progress;
            this.container.y = this._startPos.y + dy * this._progress;

            // Walking bob
            this._body.y = Math.abs(Math.sin(this._time * 10)) * -3;
            this._body.rotation = Math.sin(this._time * 10) * 0.1;

            // Face direction
            this._body.scale.x = dx > 0 ? 1 : -1;
        } else {
            // Resting idle
            this._body.y = Math.sin(this._time * 2) * 0.5;
            this._body.rotation = 0;
        }

        // Whistling
        this._whistleTimer -= dt;
        if (this._whistleTimer <= 0) {
            this._whistleTimer = 5 + Math.random() * 10;
            this._spawnNote();
        }

        this._updateNotes(dt);
    }

    private _spawnNote(): void {
        this._notes.push({
            x: 0,
            y: -25,
            life: 1.5,
            vx: (Math.random() - 0.5) * 20,
            vy: -20 - Math.random() * 20
        });
    }

    private _updateNotes(dt: number): void {
        const g = this._notesGfx;
        g.clear();

        for (let i = this._notes.length - 1; i >= 0; i--) {
            const n = this._notes[i];
            n.life -= dt;
            n.x += n.vx * dt;
            n.y += n.vy * dt;
            n.vy += 5 * dt;

            if (n.life <= 0) {
                this._notes.splice(i, 1);
                continue;
            }

            const alpha = Math.min(1, n.life * 2);
            g.circle(n.x, n.y, 1.5).fill({ color: 0xffffff, alpha });
            g.moveTo(n.x + 1.5, n.y).lineTo(n.x + 1.5, n.y - 4).lineTo(n.x + 3, n.y - 3)
                .stroke({ color: 0xffffff, width: 0.8, alpha });
        }
    }

    isFinished(): boolean {
        return this._progress >= 1;
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
