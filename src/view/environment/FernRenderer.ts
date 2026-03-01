import { Container, Graphics } from "pixi.js";

/**
 * Lush dark ferns carpeting the forest floor.
 * Each fern is a symmetrical frond with recursive leaflets.
 * They sway gently as if stirred by a breeze filtering through the canopy.
 */
export class FernRenderer {
    readonly container = new Container();
    private _ferns: Array<{
        g: Graphics;
        phase: number;
        speed: number;
        baseRotation: number;
        x: number;
    }> = [];
    private _time = 0;

    constructor(count: number, worldW: number, worldH: number, seed: number) {
        let s = seed;
        const next = () => {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s / 0x7fffffff;
        };

        for (let i = 0; i < count; i++) {
            const x = next() * worldW;
            const y = next() * worldH;
            const g = this._createFern(next);
            g.position.set(x, y);
            this.container.addChild(g);

            this._ferns.push({
                g,
                phase: next() * Math.PI * 2,
                speed: 0.6 + next() * 1.0,
                baseRotation: (next() - 0.5) * 0.15,
                x,
            });
        }
    }

    private _createFern(next: () => number): Graphics {
        const g = new Graphics();

        // Each fern has 2-4 fronds radiating from center
        const frondCount = 2 + Math.floor(next() * 3);
        const fernColors = [0x1a4a20, 0x225528, 0x183e1a, 0x1e4825, 0x2a6030];

        for (let f = 0; f < frondCount; f++) {
            const angle = ((f / frondCount) * Math.PI * 0.8) - Math.PI * 0.4 + (next() - 0.5) * 0.3;
            const frondLen = 8 + next() * 14;
            const color = fernColors[Math.floor(next() * fernColors.length)];

            // Main stem of frond
            const endX = Math.sin(angle) * frondLen;
            const endY = -frondLen;
            const midX = Math.sin(angle) * frondLen * 0.5;
            const midY = -frondLen * 0.6;

            g.moveTo(0, 0)
                .bezierCurveTo(midX * 0.5, midY * 0.4, midX, midY, endX, endY)
                .stroke({ color, width: 1.2, cap: "round" });

            // Leaflets along the stem — alternating sides
            const leafletCount = 4 + Math.floor(next() * 4);
            for (let l = 0; l < leafletCount; l++) {
                const t = (l + 1) / (leafletCount + 1);
                const lx = Math.sin(angle) * frondLen * t * 0.9;
                const ly = -frondLen * t * 0.9;
                const side = l % 2 === 0 ? 1 : -1;
                const leafLen = (3 + next() * 3) * (1 - t * 0.5); // Shorter toward tip
                const leafAngle = angle + side * (0.6 + next() * 0.4);

                const leafEndX = lx + Math.sin(leafAngle) * leafLen;
                const leafEndY = ly - Math.cos(leafAngle) * leafLen * 0.4;

                // Draw small leaflet — tapered
                g.moveTo(lx, ly)
                    .lineTo(leafEndX, leafEndY)
                    .stroke({ color, width: 0.8, cap: "round" });

                // Tiny sub-leaflets on bigger fronds
                if (leafLen > 4 && next() > 0.3) {
                    const subX = lx + (leafEndX - lx) * 0.6;
                    const subY = ly + (leafEndY - ly) * 0.6;
                    g.moveTo(subX, subY)
                        .lineTo(subX + side * 2, subY - 1.5)
                        .stroke({ color, width: 0.5, alpha: 0.7 });
                }
            }

            // Curled tip (fiddlehead on younger fronds)
            if (next() > 0.5) {
                const curlR = 1.5 + next() * 1.5;
                g.circle(endX + Math.sin(angle) * curlR, endY - curlR * 0.5, curlR)
                    .stroke({ color, width: 0.8 });
            }
        }

        return g;
    }

    update(dt: number): void {
        this._time += dt;
        for (const fern of this._ferns) {
            // Gentle sway with position-based wave offset (like wind through ferns)
            const waveOffset = fern.x * 0.002;
            const sway = Math.sin(this._time * fern.speed + fern.phase + waveOffset) * 0.1;
            const microSway = Math.sin(this._time * fern.speed * 2.5 + fern.phase) * 0.03;
            fern.g.rotation = fern.baseRotation + sway + microSway;
        }
    }
}
