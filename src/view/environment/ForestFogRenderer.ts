import { Container, Graphics } from "pixi.js";

interface FogBank {
    x: number;
    y: number;
    width: number;
    height: number;
    phase: number;
    driftSpeed: number;
    alpha: number;
}

/**
 * Low-lying mist that creeps along the forest floor,
 * slowly drifting and swirling with ethereal translucency.
 * Multiple layered fog banks at different depths create parallax.
 */
export class ForestFogRenderer {
    readonly container = new Container();
    private _gfx = new Graphics();
    private _banks: FogBank[] = [];
    private _time = 0;
    private _worldW: number;

    constructor(worldW: number, worldH: number, seed: number) {
        this._worldW = worldW;
        this.container.addChild(this._gfx);

        let s = seed;
        const next = () => {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s / 0x7fffffff;
        };

        // Create multiple fog banks of varying size
        const count = 15 + Math.floor(next() * 10);
        for (let i = 0; i < count; i++) {
            this._banks.push({
                x: next() * worldW,
                y: next() * worldH,
                width: 60 + next() * 150,
                height: 15 + next() * 30,
                phase: next() * Math.PI * 2,
                driftSpeed: 3 + next() * 8,
                alpha: 0.04 + next() * 0.08,
            });
        }
    }

    update(dt: number): void {
        this._time += dt;
        const g = this._gfx;
        g.clear();

        for (const b of this._banks) {
            // Slow horizontal drift
            const driftX = Math.sin(this._time * 0.15 + b.phase) * b.driftSpeed;
            // Very slow vertical undulation
            const driftY = Math.sin(this._time * 0.08 + b.phase * 1.7) * 3;

            const x = b.x + driftX;
            const y = b.y + driftY;

            // Breathing alpha — fog thickens and thins
            const breathe = Math.sin(this._time * 0.2 + b.phase) * 0.02;
            const alpha = b.alpha + breathe;

            // Main fog body — soft wide ellipse
            g.ellipse(x, y, b.width / 2, b.height / 2)
                .fill({ color: 0x88aa88, alpha });

            // Inner brighter core — smaller
            g.ellipse(x + b.width * 0.1, y, b.width * 0.3, b.height * 0.3)
                .fill({ color: 0x99bb99, alpha: alpha * 0.6 });

            // Wispy tendril extending from one side
            const tendrilSide = Math.sin(b.phase) > 0 ? 1 : -1;
            const tendrilLen = b.width * 0.3;
            const tendrilWave = Math.sin(this._time * 0.3 + b.phase) * 5;
            g.ellipse(
                x + tendrilSide * (b.width * 0.35 + tendrilWave),
                y + tendrilWave * 0.3,
                tendrilLen / 2,
                b.height * 0.2
            ).fill({ color: 0x88aa88, alpha: alpha * 0.5 });
        }
    }

    destroy(): void {
        this._gfx.destroy();
    }
}
