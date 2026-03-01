import { Container, Graphics } from "pixi.js";

/**
 * Tall, dry, golden grass for the plains biome.
 * Swaying heavily in the wind with wave-like motion across the field.
 */
export class PlainsGrassRenderer {
    readonly container = new Container();
    private _tufts: Array<{
        g: Graphics;
        baseRotation: number;
        phase: number;
        speed: number;
        x: number;
        y: number;
    }> = [];
    private _time = 0;

    constructor(count: number, width: number, height: number, seed: number) {
        let s = seed;
        const next = () => {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s / 0x7fffffff;
        };

        for (let i = 0; i < count; i++) {
            const x = next() * width;
            const y = next() * height;

            const tuft = this._createTuft(next);
            tuft.position.set(x, y);
            this.container.addChild(tuft);

            this._tufts.push({
                g: tuft,
                baseRotation: (next() - 0.5) * 0.08,
                phase: next() * Math.PI * 2,
                speed: 1.2 + next() * 1.5,
                x, y,
            });
        }
    }

    private _createTuft(next: () => number): Graphics {
        const g = new Graphics();
        const bladeCount = 4 + Math.floor(next() * 5);

        // Dry golden/straw colors
        const colors = [0xb8a050, 0xc4aa58, 0xa89040, 0xd0b860, 0x9c8038, 0xccb455];

        for (let i = 0; i < bladeCount; i++) {
            // Taller than regular grass
            const h = 10 + next() * 18;
            const w = 1.2 + next() * 1.3;
            const ox = (next() - 0.5) * 8;
            const curve = (next() - 0.5) * 6;
            const color = colors[Math.floor(next() * colors.length)];

            // Tall curved blades
            g.moveTo(ox, 0)
                .bezierCurveTo(
                    ox + curve * 0.3, -h * 0.3,
                    ox + curve * 0.7, -h * 0.6,
                    ox + curve * 1.2, -h
                )
                .stroke({ color, width: w, cap: "round" });
        }

        // Seed heads on some tufts — small dots at the tips
        if (next() > 0.5) {
            const tipX = (next() - 0.5) * 4;
            const tipH = 12 + next() * 16;
            const seedColor = 0xd4c070;

            for (let j = 0; j < 3; j++) {
                const sx = tipX + (next() - 0.5) * 3;
                const sy = -tipH + (next() - 0.5) * 3;
                g.circle(sx, sy, 0.8 + next() * 0.6)
                    .fill({ color: seedColor, alpha: 0.8 });
            }
        }

        return g;
    }

    update(dt: number): void {
        this._time += dt;
        for (const tuft of this._tufts) {
            // Wind wave: sweeps across the field using position-based phase offset
            // Creates the classic "wind across wheat" ripple effect
            const waveOffset = tuft.x * 0.003 + tuft.y * 0.001;
            const windWave = Math.sin(this._time * 1.8 - waveOffset) * 0.22;
            const gustWave = Math.sin(this._time * 0.6 - waveOffset * 0.5) * 0.08;

            // Individual sway on top of the wind wave
            const personalSway = Math.sin(this._time * tuft.speed + tuft.phase) * 0.06;

            tuft.g.rotation = tuft.baseRotation + windWave + gustWave + personalSway;

            // Compression/stretch with wind
            const stretch = 1 + Math.sin(this._time * 1.8 - waveOffset) * 0.04;
            tuft.g.scale.set(1, stretch);
        }
    }
}
