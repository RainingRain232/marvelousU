// Procedural sprite generator for the Javelineer unit type.
//
// Draws a detailed medieval fantasy javelineer at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Light green leather tunic for mobility
//   • Open-face helmet for visibility
//   • Multiple javelins in quiver on back
//   • Small buckler shield on left arm
//   • Dynamic javelin throwing animation
//   • Boots + legs with walk / collapse poses
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 4;      // ground Y (feet line)

// Palette ─ light infantry tones
const COL_SKIN = 0xd4a574;
const COL_SKIN_DARK = 0xb8875a;
const COL_TUNIC = 0x4a7c4a;
const COL_TUNIC_DK = 0x2f5c2f;
const COL_LEATHER = 0x5d3a1a;
const COL_LEATHER_DK = 0x3d2610;
const COL_METAL = 0x888888;
const COL_METAL_DK = 0x555555;
const COL_JAVELIN = 0xccccaa;
const COL_JAVELIN_TIP = 0x999988;
const COL_BOOT = 0x3d2610;
const COL_SHADOW = 0x000000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sin01(frame: number, total: number): number {
    return Math.sin((frame / total) * Math.PI * 2) * 0.5 + 0.5;
}

// ---------------------------------------------------------------------------
// Drawing sub-routines
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics, cx: number, gy: number, w = 12, h = 3.5): void {
    g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.25 });
}

function drawBoots(g: Graphics, cx: number, gy: number, stanceL: number, stanceR: number, squash = 0): void {
    const bw = 4, bh = 4 - squash;
    g.roundRect(cx - 6 + stanceL, gy - bh, bw, bh, 1).fill({ color: COL_BOOT });
    g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1).fill({ color: COL_BOOT });
}

function drawLegs(g: Graphics, cx: number, legTop: number, legH: number, stanceL: number, stanceR: number): void {
    g.rect(cx - 4.5 + stanceL, legTop, 3, legH).fill({ color: COL_LEATHER_DK });
    g.rect(cx + 1.5 + stanceR, legTop, 3, legH).fill({ color: COL_LEATHER_DK });
}

function drawTorso(g: Graphics, cx: number, torsoTop: number, torsoH: number, tilt = 0): void {
    const tw = 11;
    const x = cx - tw / 2 + tilt;
    // Light green tunic
    g.roundRect(x, torsoTop, tw, torsoH, 2)
        .fill({ color: COL_TUNIC })
        .stroke({ color: COL_TUNIC_DK, width: 0.8 });

    // Leather belt
    g.rect(x, torsoTop + torsoH - 4, tw, 2).fill({ color: COL_LEATHER_DK });
}

/** Javelin quiver on back - holds multiple javelins */
function drawQuiver(g: Graphics, cx: number, cy: number): void {
    const qx = cx - 8;
    const qy = cy - 2;

    // Quiver tube
    g.roundRect(qx, qy, 4, 10, 1)
        .fill({ color: COL_LEATHER })
        .stroke({ color: COL_LEATHER_DK, width: 0.5 });

    // Javelin tips sticking out
    g.rect(qx + 1, qy - 3, 2, 4).fill({ color: COL_JAVELIN_TIP });
    g.rect(qx + 1, qy - 6, 2, 4).fill({ color: COL_JAVELIN_TIP });
    g.rect(qx + 1, qy - 9, 2, 4).fill({ color: COL_JAVELIN_TIP });
}

function drawHelmet(g: Graphics, cx: number, headTop: number, tilt = 0): void {
    const hw = 9, hh = 8;
    const x = cx - hw / 2 + tilt;
    // Open-face helmet
    g.roundRect(x, headTop, hw, hh, 3)
        .fill({ color: COL_METAL })
        .stroke({ color: COL_METAL_DK, width: 0.7 });
    
    // Face opening
    g.rect(x + 1, headTop + 4, hw - 2, 3).fill({ color: COL_SKIN });
    
    // Helmet crest
    g.rect(x + hw/2 - 1, headTop - 2, 2, 3).fill({ color: COL_TUNIC });
}

function drawBuckler(g: Graphics, cx: number, cy: number): void {
    const r = 4;
    
    // Small round shield
    g.ellipse(cx, cy, r, r * 0.8).fill({ color: COL_METAL });
    g.ellipse(cx, cy, r - 1, (r - 1) * 0.8).fill({ color: COL_METAL_DK });
    
    // Shield boss
    g.circle(cx, cy, 1.5).fill({ color: COL_TUNIC });
}

function drawJavelin(g: Graphics, startX: number, startY: number, endX: number, endY: number, thrown = false): void {
    // Javelin shaft
    g.moveTo(startX, startY).lineTo(endX, endY).stroke({ color: COL_JAVELIN, width: 2 });
    
    // Javelin tip
    const tipLen = 4;
    const angle = Math.atan2(endY - startY, endX - startX);
    const tipX = endX + Math.cos(angle) * tipLen;
    const tipY = endY + Math.sin(angle) * tipLen;
    
    g.moveTo(endX, endY).lineTo(tipX, tipY).stroke({ color: COL_JAVELIN_TIP, width: 2.5 });
    
    // Thrown javelin gets flight trail
    if (thrown) {
        g.moveTo(startX, startY)
            .lineTo(startX - Math.cos(angle) * 8, startY - Math.sin(angle) * 8)
            .stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
    }
}

function drawArm(g: Graphics, sx: number, sy: number, ex: number, ey: number, color = COL_SKIN): void {
    g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color, width: 2.5 });
    g.circle(ex, ey, 1.8).fill({ color: COL_SKIN_DARK });
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
    const t = sin01(frame, 8);
    const bob = Math.round(t * 1.5 - 0.75);

    const torsoTop = GY - 20 + bob;
    const helmetTop = torsoTop - 9;

    drawShadow(g, CX, GY);
    drawQuiver(g, CX, torsoTop + 4);
    drawBoots(g, CX, GY, 0, 0);
    drawLegs(g, CX, GY - 10, 8, 0, 0);
    drawTorso(g, CX, torsoTop, 11);
    drawHelmet(g, CX, helmetTop);

    // Left arm holds buckler at side
    drawArm(g, CX - 4, torsoTop + 3, CX - 8, torsoTop + 8);
    drawBuckler(g, CX - 8, torsoTop + 10);

    // Right arm holds javelin
    drawArm(g, CX + 4, torsoTop + 3, CX + 8, torsoTop + 6);
    drawJavelin(g, CX + 8, torsoTop + 6, CX + 20, torsoTop + 2);
}

function generateMoveFrames(g: Graphics, frame: number): void {
    const t = frame / 8;
    const walk = Math.sin(t * Math.PI * 2);
    const bob = Math.abs(walk) * 2;

    const stanceL = Math.round(walk * 2.5);
    const stanceR = Math.round(-walk * 2.5);
    const torsoTop = GY - 20 - Math.round(bob);
    const helmetTop = torsoTop - 9;

    drawShadow(g, CX, GY, 12 + Math.abs(walk) * 2);
    drawQuiver(g, CX, torsoTop + 4);
    drawBoots(g, CX, GY, stanceL, stanceR);
    drawLegs(g, CX, GY - 10, 8, stanceL, stanceR);
    drawTorso(g, CX, torsoTop, 11, walk * 0.3);
    drawHelmet(g, CX, helmetTop, walk * 0.3);

    // Buckler swings while walking
    const bucklerX = CX - 8 + walk;
    const bucklerY = torsoTop + 8 + bob;
    drawArm(g, CX - 4, torsoTop + 3, bucklerX, bucklerY);
    drawBuckler(g, bucklerX, bucklerY + 2);

    // Javelin sways while walking
    const javelinX = CX + 8 + walk * 0.5;
    const javelinY = torsoTop + 6 + bob;
    drawArm(g, CX + 4, torsoTop + 3, javelinX, javelinY);
    drawJavelin(g, javelinX, javelinY, javelinX + 12, javelinY - 4);
}

function generateAttackFrames(g: Graphics, frame: number): void {
    // 8 frames: prepare -> throw -> recover
    let throwProgress = 0;
    let lunge = 0;
    let javelinThrown = false;

    if (frame <= 2) {
        // Prepare to throw
        throwProgress = frame / 2;
        lunge = 0;
    } else if (frame <= 4) {
        // Throwing motion
        throwProgress = 1.0;
        lunge = (frame - 2) * 2;
        javelinThrown = frame === 4;
    } else {
        // Recovery
        throwProgress = 1.0 - (frame - 4) / 3;
        lunge = Math.max(0, 4 - (frame - 4) * 1.5);
    }

    const torsoTop = GY - 20;
    const helmetTop = torsoTop - 9;

    drawShadow(g, CX + lunge * 0.5, GY, 12 + lunge);
    drawQuiver(g, CX, torsoTop + 4);
    drawBoots(g, CX, GY, -1, lunge);
    drawLegs(g, CX, GY - 10, 8, -1, lunge);
    drawTorso(g, CX, torsoTop, 11, lunge * 0.2);
    drawHelmet(g, CX, helmetTop, lunge * 0.2);

    // Left arm holds buckler forward defensively
    const bucklerX = CX - 6 + lunge * 0.3;
    const bucklerY = torsoTop + 6;
    drawArm(g, CX - 4 + lunge * 0.2, torsoTop + 3, bucklerX, bucklerY);
    drawBuckler(g, bucklerX, bucklerY);

    // Right arm throwing javelin
    const throwArmX = CX + 6 + lunge;
    const throwArmY = torsoTop + 4;
    
    if (javelinThrown) {
        // Javelin in flight
        drawArm(g, CX + 4 + lunge * 0.2, torsoTop + 4, throwArmX, throwArmY);
        drawJavelin(g, throwArmX, throwArmY, throwArmX + 25, throwArmY - 8, true);
    } else {
        // Javelin being thrown
        const javelinEndX = throwArmX + throwProgress * 18;
        const javelinEndY = throwArmY - throwProgress * 12;
        drawArm(g, CX + 4 + lunge * 0.2, torsoTop + 4, throwArmX, throwArmY);
        drawJavelin(g, throwArmX, throwArmY, javelinEndX, javelinEndY);
    }

    // Impact effect on frame 5
    if (frame === 5) {
        g.circle(CX + 30, GY - 15, 3).fill({ color: 0xffffff, alpha: 0.6 });
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const px = CX + 30 + Math.cos(angle) * 5;
            const py = GY - 15 + Math.sin(angle) * 5;
            g.circle(px, py, 1).fill({ color: 0xcccccc, alpha: 0.4 });
        }
    }
}

function generateCastFrames(g: Graphics, frame: number): void {
    // Simple "preparing" pose - similar to idle but with javelin ready
    const t = sin01(frame, 6);
    const lift = t * 3;

    const torsoTop = GY - 20 - lift * 0.5;
    const helmetTop = torsoTop - 9;

    drawShadow(g, CX, GY);
    drawQuiver(g, CX, torsoTop + 4);
    drawBoots(g, CX, GY, -1, 1);
    drawLegs(g, CX, GY - 10, 8, -1, 1);
    drawTorso(g, CX, torsoTop, 11);
    drawHelmet(g, CX, helmetTop);

    // Buckler held ready
    drawArm(g, CX - 4, torsoTop + 3, CX - 7, torsoTop + 6);
    drawBuckler(g, CX - 7, torsoTop + 8);

    // Javelin held ready to throw
    drawArm(g, CX + 4, torsoTop + 3, CX + 10, torsoTop - 2);
    drawJavelin(g, CX + 10, torsoTop - 2, CX + 22, torsoTop - 8);

    // Ready sparkle
    if (frame % 2 === 0) {
        g.circle(CX + 24, torsoTop - 10, 1.5).fill({ color: 0xaaaaff, alpha: 0.7 });
    }
}

function generateDieFrames(g: Graphics, frame: number): void {
    const t = frame / 7;
    const fallX = t * 5;
    const dropY = t * t * 10;

    const torsoTop = GY - 20 + dropY;
    const helmetTop = torsoTop - 9;

    drawShadow(g, CX + fallX * 0.5, GY, 12 + t * 6);
    drawBoots(g, CX + fallX * 0.3, GY, t * 3, -t * 2, t * 2);

    if (t < 0.7) {
        drawLegs(g, CX + fallX * 0.3, GY - 10 + dropY * 0.5, 8 - t * 3, t * 3, -t * 2);
        drawTorso(g, CX + fallX * 0.5, torsoTop, 11 * (1 - t * 0.4), t * 1.0);
        drawHelmet(g, CX + fallX * 0.6, helmetTop + dropY * 0.5, t * 1.2);
    }

    // Buckler falling away
    const bucklerX = CX - 8 + fallX * 0.8;
    const bucklerY = GY - 8 + t * 3;
    if (t < 0.9) {
        drawBuckler(g, bucklerX, bucklerY);
    }

    // Javelin falling away
    const javelinX = CX + 15 + fallX * 1.2;
    const javelinY = GY - 12 + t * 4;
    if (t < 0.9) {
        drawJavelin(g, javelinX, javelinY, javelinX + 18, javelinY + 8);
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
    [UnitState.IDLE]: { gen: generateIdleFrames, count: 8 },
    [UnitState.MOVE]: { gen: generateMoveFrames, count: 8 },
    [UnitState.ATTACK]: { gen: generateAttackFrames, count: 8 },
    [UnitState.CAST]: { gen: generateCastFrames, count: 6 },
    [UnitState.DIE]: { gen: generateDieFrames, count: 8 },
};

export function generateJavelineerFrames(
    renderer: Renderer,
): Map<UnitState, Texture[]> {
    const result = new Map<UnitState, Texture[]>();

    for (const state of Object.values(UnitState)) {
        const { gen, count } = STATE_GENERATORS[state];
        const textures: Texture[] = [];

        for (let i = 0; i < count; i++) {
            const g = new Graphics();
            gen(g, i);

            const rt = RenderTexture.create({ width: F, height: F });
            renderer.render({ container: g, target: rt });
            textures.push(rt);

            g.destroy();
        }

        result.set(state, textures);
    }

    return result;
}
