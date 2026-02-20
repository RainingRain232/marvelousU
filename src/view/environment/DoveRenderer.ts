import { Container, Graphics } from "pixi.js";

export class DoveRenderer {
    readonly container = new Container();
    private _gfx = new Graphics();

    private _velocity: { x: number, y: number };
    private _time = 0;
    private _flapSpeed = 15;

    constructor(x: number, y: number, dirX: number, dirY: number, speed: number) {
        this.container.position.set(x, y);
        this.container.addChild(this._gfx);

        // Normalize and scale direction
        const dist = Math.sqrt(dirX * dirX + dirY * dirY);
        this._velocity = {
            x: (dirX / dist) * speed,
            y: (dirY / dist) * speed
        };

        // Face the flight direction
        this.container.scale.x = dirX >= 0 ? 1 : -1;

        this._drawDove();
        this._time = Math.random() * 10;
    }

    private _drawDove(): void {
        const g = this._gfx;
        g.clear();

        const COL_WHITE = 0xffffff;
        const COL_BEAK = 0xffa500; // Orange

        // Body
        g.ellipse(0, 0, 5, 2.5)
            .fill({ color: COL_WHITE });

        // Head
        g.circle(4, -2, 2.5)
            .fill({ color: COL_WHITE });

        // Beak
        g.moveTo(6, -2).lineTo(8, -1.5).lineTo(6, -1).closePath().fill({ color: COL_BEAK });

        // Tail
        g.moveTo(-4, 0).lineTo(-8, -2).lineTo(-8, 2).closePath().fill({ color: COL_WHITE });
    }

    /** Flaps wings based on time */
    private _updateWings(time: number): void {
        const g = this._gfx;
        // We use a simplified wing flap visualization: drawing a dynamic wing shape
        // Re-draw dove parts that move or just add wings

        // Clear previous wings (or clear everything and redraw)
        g.clear();
        this._drawDove(); // redraw static body

        const wingH = Math.sin(time * this._flapSpeed) * 8;
        const COL_WHITE = 0xffffff;

        // Top wing
        g.moveTo(-2, -1)
            .bezierCurveTo(0, -1 - wingH, 5, -1 - wingH, 3, -1)
            .fill({ color: COL_WHITE });

        // Bottom wing (opposite phase for visual depth)
        const wingH2 = Math.sin(time * this._flapSpeed + 0.5) * 4;
        g.moveTo(-1, 1)
            .bezierCurveTo(1, 1 + wingH2, 4, 1 + wingH2, 2, 1)
            .fill({ color: 0xeeeeee }); // slightly shaded
    }

    update(dt: number): void {
        this._time += dt;
        this.container.x += this._velocity.x * dt;
        this.container.y += this._velocity.y * dt;

        this._updateWings(this._time);
    }

    isOutOfBounds(bounds: { x: number, y: number, w: number, h: number }): boolean {
        const p = this.container.position;
        // Buffer of 50px to ensure it's fully off-screen
        return (
            p.x < bounds.x - 50 ||
            p.x > bounds.x + bounds.w + 50 ||
            p.y < bounds.y - 50 ||
            p.y > bounds.y + bounds.h + 50
        );
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
