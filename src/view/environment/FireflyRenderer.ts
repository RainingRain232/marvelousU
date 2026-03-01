import { Container, Graphics } from "pixi.js";

interface Firefly {
    x: number;
    y: number;
    phase: number;
    driftSpeed: number;
    glowSpeed: number;
    orbitRadius: number;
    orbitSpeed: number;
    orbitPhase: number;
    size: number;
    color: number;
    /** 0 = drifting, 1 = resting (dimmed on a surface) */
    state: number;
    restTimer: number;
}

/**
 * Magical fireflies that drift through the forest canopy,
 * pulsing with warm golden-green light. They lazily orbit,
 * sometimes pausing to rest, then lifting off again.
 */
export class FireflyRenderer {
    readonly container = new Container();
    private _gfx = new Graphics();
    private _flies: Firefly[] = [];
    private _time = 0;
    private _seed: number;

    constructor(count: number, worldW: number, worldH: number, seed: number) {
        this._seed = seed;
        this.container.addChild(this._gfx);

        for (let i = 0; i < count; i++) {
            const colors = [0xccdd44, 0xaacc33, 0xddee55, 0x88bb22, 0xeeff66];
            this._flies.push({
                x: this._rng() * worldW,
                y: this._rng() * worldH,
                phase: this._rng() * Math.PI * 2,
                driftSpeed: 8 + this._rng() * 15,
                glowSpeed: 1.5 + this._rng() * 3,
                orbitRadius: 5 + this._rng() * 15,
                orbitSpeed: 0.5 + this._rng() * 1.5,
                orbitPhase: this._rng() * Math.PI * 2,
                size: 1.2 + this._rng() * 1.8,
                color: colors[Math.floor(this._rng() * colors.length)],
                state: 0,
                restTimer: 0,
            });
        }
    }

    private _rng(): number {
        this._seed = (this._seed * 1103515245 + 12345) & 0x7fffffff;
        return this._seed / 0x7fffffff;
    }

    update(dt: number): void {
        this._time += dt;
        const g = this._gfx;
        g.clear();

        for (const f of this._flies) {
            if (f.state === 1) {
                // Resting — dim glow, no movement
                f.restTimer -= dt;
                if (f.restTimer <= 0) {
                    f.state = 0;
                }

                const dimGlow = 0.15 + Math.sin(this._time * f.glowSpeed * 0.3 + f.phase) * 0.05;
                g.circle(f.x, f.y, f.size * 0.7)
                    .fill({ color: f.color, alpha: dimGlow });
                continue;
            }

            // Drifting — lazy orbit with slow directional drift
            const orbitX = Math.cos(this._time * f.orbitSpeed + f.orbitPhase) * f.orbitRadius;
            const orbitY = Math.sin(this._time * f.orbitSpeed * 0.7 + f.orbitPhase) * f.orbitRadius * 0.6;

            // Slow general drift
            f.x += Math.sin(this._time * 0.1 + f.phase) * f.driftSpeed * 0.3 * dt;
            f.y += Math.cos(this._time * 0.08 + f.phase * 1.3) * f.driftSpeed * 0.2 * dt;

            const drawX = f.x + orbitX;
            const drawY = f.y + orbitY;

            // Pulsing glow — two-layer: outer halo + inner bright core
            const pulse = Math.sin(this._time * f.glowSpeed + f.phase);
            const glowAlpha = 0.3 + pulse * 0.25;
            const coreAlpha = 0.6 + pulse * 0.35;

            // Outer halo
            g.circle(drawX, drawY, f.size * 3)
                .fill({ color: f.color, alpha: glowAlpha * 0.15 });

            // Mid glow
            g.circle(drawX, drawY, f.size * 1.8)
                .fill({ color: f.color, alpha: glowAlpha * 0.3 });

            // Bright core
            g.circle(drawX, drawY, f.size)
                .fill({ color: 0xffffff, alpha: coreAlpha });

            // Trail — fading afterimage
            const trailX = drawX - Math.cos(this._time * f.orbitSpeed + f.orbitPhase) * 3;
            const trailY = drawY - Math.sin(this._time * f.orbitSpeed * 0.7 + f.orbitPhase) * 2;
            g.circle(trailX, trailY, f.size * 0.6)
                .fill({ color: f.color, alpha: glowAlpha * 0.2 });

            // Random chance to rest
            if (this._rng() < 0.001) {
                f.state = 1;
                f.restTimer = 2 + this._rng() * 5;
            }
        }
    }

    destroy(): void {
        this._gfx.destroy();
    }
}
