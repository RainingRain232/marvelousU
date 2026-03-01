import { Container, Graphics } from "pixi.js";

interface DustMote {
    g: Graphics;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    phase: number;
}

/**
 * Atmospheric dust particles that drift lazily across the plains,
 * fading in and out for a hazy, sun-baked feel.
 */
export class DustRenderer {
    readonly container = new Container();
    private _motes: DustMote[] = [];
    private _time = 0;
    private _worldW: number;
    private _worldH: number;
    private _seed: number;
    private _spawnTimer = 0;

    constructor(worldW: number, worldH: number, seed: number) {
        this._worldW = worldW;
        this._worldH = worldH;
        this._seed = seed;

        // Pre-populate some motes
        for (let i = 0; i < 30; i++) {
            this._spawn(true);
        }
    }

    private _rng(): number {
        this._seed = (this._seed * 1103515245 + 12345) & 0x7fffffff;
        return this._seed / 0x7fffffff;
    }

    private _spawn(onMap = false): void {
        const size = 1.5 + this._rng() * 3;
        const x = onMap ? this._rng() * this._worldW : -size;
        const y = this._rng() * this._worldH;
        const maxLife = 6 + this._rng() * 10;
        const life = onMap ? this._rng() * maxLife : 0;

        const g = new Graphics();
        const colors = [0xd4c8a0, 0xc4b890, 0xe0d4b0, 0xb8a878];
        const color = colors[Math.floor(this._rng() * colors.length)];
        g.circle(0, 0, size).fill({ color, alpha: 0.3 });
        g.position.set(x, y);
        this.container.addChild(g);

        this._motes.push({
            g, x, y,
            vx: 15 + this._rng() * 25,
            vy: (this._rng() - 0.5) * 8,
            life, maxLife, size,
            phase: this._rng() * Math.PI * 2,
        });
    }

    update(dt: number): void {
        this._time += dt;

        // Spawn periodically
        this._spawnTimer += dt;
        if (this._spawnTimer > 0.3) {
            this._spawnTimer = 0;
            if (this._motes.length < 60) {
                this._spawn();
            }
        }

        for (let i = this._motes.length - 1; i >= 0; i--) {
            const m = this._motes[i];
            m.life += dt;

            // Drift with gentle wave
            m.x += m.vx * dt;
            m.y += m.vy * dt + Math.sin(this._time * 0.8 + m.phase) * 0.3 * dt;

            // Fade in/out
            const t = m.life / m.maxLife;
            const alpha = t < 0.15 ? t / 0.15
                : t > 0.8 ? (1 - t) / 0.2
                : 1;
            m.g.alpha = alpha * 0.35;
            m.g.position.set(m.x, m.y);

            // Remove if expired or off-screen
            if (m.life >= m.maxLife || m.x > this._worldW + 20) {
                this.container.removeChild(m.g);
                m.g.destroy();
                this._motes.splice(i, 1);
            }
        }
    }

    destroy(): void {
        for (const m of this._motes) m.g.destroy();
        this._motes.length = 0;
    }
}
