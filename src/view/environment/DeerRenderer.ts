import { Container, Graphics } from "pixi.js";

export enum AnimalState {
    IDLE = "idle",
    GRAZE = "graze",
    MOVE = "move"
}

export class DeerRenderer {
    readonly container = new Container();
    private _body = new Container();
    private _gfx = new Graphics();
    private _head = new Graphics();

    private _state = AnimalState.IDLE;
    private _stateTimer = 0;
    private _time = 0;

    private _targetPos = { x: 0, y: 0 };
    private _vel = { x: 0, y: 0 };
    private _speed = 40 + Math.random() * 20;

    private _bounds: { w: number, h: number };

    constructor(x: number, y: number, bounds: { w: number, h: number }, _seed: number) {
        this._bounds = bounds;
        this.container.position.set(x, y);
        this.container.addChild(this._body);
        this._body.addChild(this._gfx);
        this._body.addChild(this._head);

        this._drawDeer();
        this._resetState();

        // Randomize initial phase
        this._time = Math.random() * 100;
    }

    private _drawDeer(): void {
        const g = this._gfx;

        const COL_BODY = 0x8b5a2b; // sienna
        const COL_BELLY = 0xd2b48c; // tan
        const COL_SPOTS = 0xffffff;

        // Body (pear shape-ish)
        g.ellipse(0, -10, 14, 8)
            .fill({ color: COL_BODY });
        g.ellipse(0, -6, 12, 5) // belly
            .fill({ color: COL_BELLY, alpha: 0.4 });

        // White spots on back
        for (let i = 0; i < 6; i++) {
            const sx = (Math.random() - 0.5) * 16;
            const sy = -14 + Math.random() * 4;
            g.circle(sx, sy, 1).fill({ color: COL_SPOTS, alpha: 0.8 });
        }

        // Legs (thin)
        const drawLeg = (lx: number, ly: number) => {
            g.moveTo(lx, ly)
                .lineTo(lx, 0)
                .stroke({ color: COL_BODY, width: 1.5 });
        };
        drawLeg(-8, -8);
        drawLeg(-4, -6);
        drawLeg(4, -6);
        drawLeg(8, -8);

        // Tail
        g.circle(-14, -12, 2.5).fill({ color: COL_BODY });
        g.circle(-14, -12, 1.5).fill({ color: COL_SPOTS });

        // Head (on a neck)
        this._updateHead(0);
    }

    private _updateHead(yOff: number): void {
        const h = this._head;
        h.clear();
        const COL_BODY = 0x8b5a2b;
        const COL_ANTLER = 0xccbba8;

        const neckY = -12 + yOff;
        h.moveTo(10, -10).lineTo(14, neckY).stroke({ color: COL_BODY, width: 4 });

        // Face
        h.ellipse(18, neckY, 6, 4).fill({ color: COL_BODY });
        h.circle(22, neckY, 1.5).fill({ color: 0x222222 }); // nose
        h.circle(18, neckY - 2, 0.8).fill({ color: 0x000000 }); // eye

        // Ears
        h.ellipse(14, neckY - 4, 2, 4).fill({ color: COL_BODY });
        h.rotation = yOff * 0.05;

        // Antlers (simplified)
        h.moveTo(15, neckY - 3).lineTo(15, neckY - 12).stroke({ color: COL_ANTLER, width: 1.5 });
        h.moveTo(15, neckY - 8).lineTo(12, neckY - 11).stroke({ color: COL_ANTLER, width: 1.2 });
        h.moveTo(15, neckY - 10).lineTo(18, neckY - 13).stroke({ color: COL_ANTLER, width: 1.2 });
    }

    private _resetState(): void {
        const r = Math.random();
        if (r < 0.4) {
            this._state = AnimalState.IDLE;
            this._stateTimer = 2 + Math.random() * 5;
        } else if (r < 0.7) {
            this._state = AnimalState.GRAZE;
            this._stateTimer = 3 + Math.random() * 8;
        } else {
            this._state = AnimalState.MOVE;
            this._stateTimer = 4 + Math.random() * 6;
            this._targetPos = {
                x: Math.random() * this._bounds.w,
                y: Math.random() * this._bounds.h
            };
            const dx = this._targetPos.x - this.container.x;
            const dy = this._targetPos.y - this.container.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            this._vel = { x: (dx / dist) * this._speed, y: (dy / dist) * this._speed };

            // Flip body based on direction
            this._body.scale.x = this._vel.x > 0 ? 1 : -1;
        }
    }

    update(dt: number): void {
        this._time += dt;
        this._stateTimer -= dt;

        if (this._stateTimer <= 0) {
            this._resetState();
        }

        if (this._state === AnimalState.MOVE) {
            this.container.x += this._vel.x * dt;
            this.container.y += this._vel.y * dt;

            // Simple walk bob
            this._body.y = Math.abs(Math.sin(this._time * 8)) * -3;
            this._updateHead(Math.sin(this._time * 8) * 2);
        } else if (this._state === AnimalState.GRAZE) {
            // Head down
            const grazeFactor = Math.sin(this._time * 2) * 2 + 10;
            this._updateHead(grazeFactor);
            this._body.y = 0;
        } else {
            // Idle bob
            this._body.y = Math.sin(this._time * 2) * 0.5;
            this._updateHead(Math.sin(this._time * 3) * 1);
        }
    }
}
