// Procedural sprite generator for Hero units
// Creates a distinctive, heroic appearance with cape and enhanced armor
import { Container, Graphics, RenderTexture, type Renderer } from "pixi.js";

export class HeroSpriteGen {
  public static readonly FRAME_SIZE = 48;
  private static readonly ROW_SIZE = 8;

  /**
   * Generate all animation frames for the Hero unit.
   * Returns a RenderTexture containing an 8×5 grid of animation frames.
   */
  static generateSprites(renderer: Renderer): RenderTexture {
    const container = new Container();

    // Generate all 5 animation rows (IDLE, MOVE, ATTACK, CAST, DIE)
    this._generateIdleFrames(container);
    this._generateMoveFrames(container);
    this._generateAttackFrames(container);
    this._generateCastFrames(container);
    this._generateDieFrames(container);

    // Render to texture
    const rt = RenderTexture.create({
      width: HeroSpriteGen.FRAME_SIZE * HeroSpriteGen.ROW_SIZE,
      height: HeroSpriteGen.FRAME_SIZE * 5,
    });
    renderer.render({ container, target: rt });
    container.destroy({ children: true });
    return rt;
  }

  private static _generateIdleFrames(container: Container): void {
    for (let i = 0; i < 8; i++) {
      const frame = new Graphics();
      const x = i * HeroSpriteGen.FRAME_SIZE;
      const y = 0;

      // Breathing animation - slight movement
      const breathe = Math.sin((i * Math.PI) / 4) * 2;

      this._drawHero(frame, 0, breathe, false, false);
      frame.position.set(x, y);
      container.addChild(frame);
    }
  }

  private static _generateMoveFrames(container: Container): void {
    for (let i = 0; i < 8; i++) {
      const frame = new Graphics();
      const x = i * HeroSpriteGen.FRAME_SIZE;
      const y = HeroSpriteGen.FRAME_SIZE;

      // Walking animation with leg movement
      const walkCycle = (i / 8) * Math.PI * 2;
      const legMove = Math.sin(walkCycle) * 3;
      const bodyBob = Math.abs(Math.sin(walkCycle * 2)) * 1;

      this._drawHero(frame, legMove, bodyBob, true, false);
      frame.position.set(x, y);
      container.addChild(frame);
    }
  }

  private static _generateAttackFrames(container: Container): void {
    for (let i = 0; i < 8; i++) {
      const frame = new Graphics();
      const x = i * HeroSpriteGen.FRAME_SIZE;
      const y = HeroSpriteGen.FRAME_SIZE * 2;

      // Attack animation - sword swing
      const attackProgress = i / 7;
      const swingAngle = (attackProgress * Math.PI) / 2;

      this._drawHero(frame, 0, 0, false, true, swingAngle);
      frame.position.set(x, y);
      container.addChild(frame);
    }
  }

  private static _generateCastFrames(container: Container): void {
    for (let i = 0; i < 8; i++) {
      const frame = new Graphics();
      const x = i * HeroSpriteGen.FRAME_SIZE;
      const y = HeroSpriteGen.FRAME_SIZE * 3;

      // Cast animation - power up effect
      const castProgress = i / 7;
      const powerGlow = castProgress * 3;

      this._drawHero(frame, 0, 0, false, false, 0, powerGlow);
      frame.position.set(x, y);
      container.addChild(frame);
    }
  }

  private static _generateDieFrames(container: Container): void {
    for (let i = 0; i < 8; i++) {
      const frame = new Graphics();
      const x = i * HeroSpriteGen.FRAME_SIZE;
      const y = HeroSpriteGen.FRAME_SIZE * 4;

      // Death animation - falling
      const deathProgress = i / 7;
      const fallAngle = (deathProgress * Math.PI) / 3;
      const fade = 1 - deathProgress * 0.3;

      this._drawHero(frame, 0, 0, false, false, 0, 0, fallAngle, fade);
      frame.position.set(x, y);
      container.addChild(frame);
    }
  }

  private static _drawHero(
    g: Graphics,
    legOffset: number = 0,
    bodyBob: number = 0,
    walking: boolean = false,
    attacking: boolean = false,
    swingAngle: number = 0,
    powerGlow: number = 0,
    fallAngle: number = 0,
    alpha: number = 1,
  ): void {
    g.alpha = alpha;

    const centerX = HeroSpriteGen.FRAME_SIZE / 2;
    const centerY = HeroSpriteGen.FRAME_SIZE / 2;

    // Apply rotation for death animation
    if (fallAngle > 0) {
      g.position.set(centerX, centerY);
      g.rotation = fallAngle;
      g.position.set(-centerX, -centerY);
    }

    // Shadow
    g.circle(centerX, centerY + 20, 8).fill({ color: 0x000000, alpha: 0.3 });

    // Cape (flowing behind)
    const capeColor = 0x8b0000; // Dark red cape
    g.beginPath();
    g.moveTo(centerX - 8, centerY - 5 + bodyBob);
    g.lineTo(centerX - 12, centerY + 10 + bodyBob);
    g.lineTo(centerX - 10, centerY + 15 + bodyBob);
    g.lineTo(centerX + 10, centerY + 15 + bodyBob);
    g.lineTo(centerX + 12, centerY + 10 + bodyBob);
    g.lineTo(centerX + 8, centerY - 5 + bodyBob);
    g.closePath();
    g.fill({ color: capeColor });
    g.stroke({ color: 0x4b0000, width: 1 });

    // Legs
    const legColor = 0x4169e1; // Royal blue armor
    if (walking) {
      // Walking pose
      g.rect(centerX - 6, centerY + 8, 4, 12 + legOffset).fill({
        color: legColor,
      });
      g.rect(centerX + 2, centerY + 8, 4, 12 - legOffset).fill({
        color: legColor,
      });
    } else {
      // Standing pose
      g.rect(centerX - 6, centerY + 8, 4, 12).fill({ color: legColor });
      g.rect(centerX + 2, centerY + 8, 4, 12).fill({ color: legColor });
    }

    // Body (enhanced armor)
    const bodyColor = 0xc0c0c0; // Silver armor
    g.rect(centerX - 8, centerY - 8 + bodyBob, 16, 16).fill({
      color: bodyColor,
    });
    g.rect(centerX - 8, centerY - 8 + bodyBob, 16, 16).stroke({
      color: 0x808080,
      width: 1,
    });

    // Armor details
    g.circle(centerX, centerY - 4 + bodyBob, 3).fill({ color: 0xffd700 }); // Gold emblem
    g.rect(centerX - 6, centerY - 2 + bodyBob, 12, 1).fill({ color: 0xffd700 }); // Gold belt

    // Arms
    const armColor = 0xc0c0c0; // Silver armor
    if (attacking) {
      // Attacking pose with sword swing
      const swordX = Math.cos(swingAngle) * 15;
      const swordY = Math.sin(swingAngle) * 15;

      // Sword arm
      g.beginPath();
      g.moveTo(centerX + 8, centerY - 4 + bodyBob);
      g.lineTo(centerX + 8 + swordX / 2, centerY - 4 + bodyBob + swordY / 2);
      g.stroke({ color: armColor, width: 3 });

      // Sword
      g.beginPath();
      g.moveTo(centerX + 8 + swordX / 2, centerY - 4 + bodyBob + swordY / 2);
      g.lineTo(centerX + 8 + swordX, centerY - 4 + bodyBob + swordY);
      g.stroke({ color: 0xe5e5e5, width: 2 }); // Silver blade
      g.stroke({ color: 0x808080, width: 1 }); // Dark edge

      // Shield arm
      g.rect(centerX - 12, centerY - 4 + bodyBob, 4, 8).fill({
        color: armColor,
      });

      // Shield
      g.circle(centerX - 10, centerY, 6).fill({ color: 0x8b4513 }); // Brown shield
      g.circle(centerX - 10, centerY, 6).stroke({ color: 0x654321, width: 1 });
      g.circle(centerX - 10, centerY, 3).fill({ color: 0xffd700 }); // Gold center
    } else {
      // Normal pose
      g.rect(centerX - 12, centerY - 4 + bodyBob, 4, 8).fill({
        color: armColor,
      });
      g.rect(centerX + 8, centerY - 4 + bodyBob, 4, 8).fill({
        color: armColor,
      });

      // Shield
      g.circle(centerX - 10, centerY, 6).fill({ color: 0x8b4513 });
      g.circle(centerX - 10, centerY, 6).stroke({ color: 0x654321, width: 1 });
      g.circle(centerX - 10, centerY, 3).fill({ color: 0xffd700 });

      // Sword
      g.rect(centerX + 10, centerY - 8 + bodyBob, 2, 16).fill({
        color: 0xe5e5e5,
      });
      g.rect(centerX + 10, centerY - 8 + bodyBob, 2, 16).stroke({
        color: 0x808080,
        width: 1,
      });
    }

    // Head with helmet
    const helmetColor = 0xc0c0c0; // Silver helmet
    g.circle(centerX, centerY - 12 + bodyBob, 6).fill({ color: helmetColor });
    g.circle(centerX, centerY - 12 + bodyBob, 6).stroke({
      color: 0x808080,
      width: 1,
    });

    // Helmet plume
    const plumeColor = 0xff4500; // Orange-red plume
    g.beginPath();
    g.moveTo(centerX, centerY - 18 + bodyBob);
    g.quadraticCurveTo(
      centerX + 3,
      centerY - 22 + bodyBob,
      centerX + 2,
      centerY - 26 + bodyBob,
    );
    g.quadraticCurveTo(
      centerX,
      centerY - 24 + bodyBob,
      centerX - 2,
      centerY - 26 + bodyBob,
    );
    g.quadraticCurveTo(
      centerX - 3,
      centerY - 22 + bodyBob,
      centerX,
      centerY - 18 + bodyBob,
    );
    g.fill({ color: plumeColor });

    // Power glow effect for cast animation
    if (powerGlow > 0) {
      const glowSize = 5 + powerGlow * 3;
      const glowAlpha = 0.3 + powerGlow * 0.2;
      g.circle(centerX, centerY, glowSize).fill({
        color: 0xffd700,
        alpha: glowAlpha,
      });
      g.circle(centerX, centerY, glowSize).stroke({
        color: 0xffa500,
        alpha: glowAlpha,
        width: 2,
      });
    }
  }
}
