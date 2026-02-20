// Healing FX: Green circle with a white cross that pops and fades.
import { Container, Graphics } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";

const TS = BalanceConfig.TILE_SIZE;
const EFFECT_DURATION = 0.6;

export class HealFX {
    private _container!: Container;

    init(vm: ViewManager): void {
        this._container = new Container();
        vm.layers.fx.addChild(this._container);

        EventBus.on("unitHealed", ({ position }) => {
            this._spawnHealEffect(position.x, position.y);
        });
    }

    update(_dt: number): void {
        // No continuous per-frame logic needed here as gsap handles animations
    }

    private _spawnHealEffect(tx: number, ty: number): void {
        const cx = (tx + 0.5) * TS;
        const cy = (ty + 0.5) * TS;

        const group = new Container();
        group.position.set(cx, cy);
        this._container.addChild(group);

        // Green circle
        const circle = new Graphics()
            .circle(0, 0, TS * 0.4)
            .fill({ color: 0x22cc44, alpha: 0.6 })
            .stroke({ color: 0xffffff, alpha: 0.4, width: 1.5 });
        group.addChild(circle);

        // White cross
        const crossSize = TS * 0.25;
        const crossThickness = 3;
        const cross = new Graphics()
            // Horizontal bar
            .rect(-crossSize, -crossThickness / 2, crossSize * 2, crossThickness)
            .fill({ color: 0xffffff })
            // Vertical bar
            .rect(-crossThickness / 2, -crossSize, crossThickness, crossSize * 2)
            .fill({ color: 0xffffff });
        group.addChild(cross);

        // Animation: Scale up + fade out
        group.scale.set(0.5);
        group.alpha = 0;

        gsap.to(group.scale, {
            x: 1.2,
            y: 1.2,
            duration: EFFECT_DURATION,
            ease: "back.out(2)",
        });

        gsap.to(group, {
            alpha: 1,
            duration: 0.1,
            onComplete: () => {
                gsap.to(group, {
                    alpha: 0,
                    duration: EFFECT_DURATION - 0.1,
                    ease: "power2.in",
                    onComplete: () => {
                        if (group.parent) this._container.removeChild(group);
                        group.destroy({ children: true });
                    },
                });
            },
        });
    }
}

export const healFX = new HealFX();
