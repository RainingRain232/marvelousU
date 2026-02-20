import { Container, Graphics } from "pixi.js";

export class GrassRenderer {
    readonly container = new Container();
    private _tufts: Array<{ g: Graphics; baseRotation: number; phase: number; speed: number }> = [];
    private _time = 0;

    constructor(count: number, width: number, height: number, seed: number) {
        // Simple LCG or similar for deterministic placement without importing SeededRandom if we want to be lightweight,
        // but better use the sim's SeededRandom.
        // However, View layer shouldn't strictly depend on sim/utils if possible,
        // but let's just use a simple internal seed for now.
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
                baseRotation: (next() - 0.5) * 0.1,
                phase: next() * Math.PI * 2,
                speed: 1.5 + next() * 2,
            });
        }
    }

    private _createTuft(next: () => number): Graphics {
        const g = new Graphics();
        const bladeCount = 3 + Math.floor(next() * 4);

        // Grass colors
        const colors = [0x4a7c44, 0x5a8c54, 0x6aac64, 0x3d6b38];

        for (let i = 0; i < bladeCount; i++) {
            const h = 5 + next() * 10;
            const w = 1.5 + next() * 1.5;
            const ox = (next() - 0.5) * 6;
            const curve = (next() - 0.5) * 4;
            const color = colors[Math.floor(next() * colors.length)];

            g.moveTo(ox, 0)
                .bezierCurveTo(ox + curve, -h * 0.4, ox + curve, -h * 0.8, ox + curve * 1.5, -h)
                .stroke({ color, width: w, cap: "round" });
        }

        return g;
    }

    update(dt: number): void {
        this._time += dt;
        for (const tuft of this._tufts) {
            // Wind effect: swaying back and forth
            const angle = Math.sin(this._time * tuft.speed + tuft.phase) * 0.15;
            tuft.g.rotation = tuft.baseRotation + angle;
            // Also a bit of scaling for "wind intensity"
            const s = 1 + Math.sin(this._time * tuft.speed * 0.5 + tuft.phase) * 0.05;
            tuft.g.scale.set(s, s);
        }
    }
}
