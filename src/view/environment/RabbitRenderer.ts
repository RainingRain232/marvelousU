import { Container, Graphics } from "pixi.js";
import { AnimalState } from "./DeerRenderer";

export class RabbitRenderer {
    readonly container = new Container();
    private _body = new Container();
    private _gfx = new Graphics();

    private _state = AnimalState.IDLE;
    private _stateTimer = 0;
    private _time = 0;

    private _targetPos = { x: 0, y: 0 };
    private _vel = { x: 0, y: 0 };
    private _speed = 100 + Math.random() * 50; // faster but in bursts

    private _bounds: { w: number, h: number };

    constructor(x: number, y: number, bounds: { w: number, h: number }, _seed: number) {
        this._bounds = bounds;
        this.container.position.set(x, y);
        this.container.addChild(this._body);
        this._body.addChild(this._gfx);

        this._drawRabbit();
        this._resetState();

        this._time = Math.random() * 100;
    }

    private _drawRabbit(): void {
        const g = this._gfx;
        const COL_BODY = 0xe0e0e0; // light grey
        const COL_NOSE = 0xffc0cb; // pink
        const COL_EYE = 0x222222;

        // Body (small blob)
        g.ellipse(0, -4, 6, 4)
            .fill({ color: COL_BODY });

        // Head
        g.circle(5, -6, 3.5)
            .fill({ color: COL_BODY });

        // Ears (long)
        const drawEar = (ex: number) => {
            g.ellipse(ex, -12, 1.5, 5)
                .fill({ color: COL_BODY })
                .stroke({ color: 0xcccccc, width: 0.5 });
        };
        drawEar(4);
        drawEar(6);

        // Eyes
        g.circle(7, -7, 0.6).fill({ color: COL_EYE });

        // Nose
        g.circle(8.5, -6, 0.4).fill({ color: COL_NOSE });

        // Tail (bushy)
        g.circle(-5, -5, 2).fill({ color: 0xffffff });
    }

    private _resetState(): void {
        const r = Math.random();
        if (r < 0.3) {
            this._state = AnimalState.IDLE;
            this._stateTimer = 1 + Math.random() * 3;
        } else if (r < 0.6) {
            this._state = AnimalState.GRAZE;
            this._stateTimer = 2 + Math.random() * 5;
        } else {
            this._state = AnimalState.MOVE;
            this._stateTimer = 0.5 + Math.random() * 1.5; // Short hop bursts
            this._targetPos = {
                x: Math.random() * this._bounds.w,
                y: Math.random() * this._bounds.h
            };
            const dx = this._targetPos.x - this.container.x;
            const dy = this._targetPos.y - this.container.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            this._vel = { x: (dx / dist) * this._speed, y: (dy / dist) * this._speed };

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

            // Hopping animation
            const hopFreq = 12;
            this._body.y = -Math.abs(Math.sin(this._time * hopFreq)) * 10;
            this._body.scale.y = 1 + Math.sin(this._time * hopFreq) * 0.2;
        } else if (this._state === AnimalState.GRAZE) {
            // Nibbling (very fast subtle movement)
            this._gfx.x = Math.sin(this._time * 20) * 0.5;
            this._body.y = 0;
            this._body.scale.y = 1;
        } else {
            // Idle: twitching
            if (Math.sin(this._time * 5) > 0.8) {
                this._gfx.scale.y = 1.05;
            } else {
                this._gfx.scale.y = 1;
            }
            this._body.y = 0;
        }
    }
}
