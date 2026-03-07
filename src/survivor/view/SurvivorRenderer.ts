// ---------------------------------------------------------------------------
// Survivor renderer — entity sprite management
// ---------------------------------------------------------------------------

import { Container, Graphics, AnimatedSprite, Text, TextStyle } from "pixi.js";
import { UnitType, UnitState, GamePhase } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { animationManager } from "@view/animation/AnimationManager";
import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import { WEAPON_DEFS } from "../config/SurvivorWeaponDefs";
import { ELITE_DEFS } from "../config/SurvivorEliteDefs";
import type { SurvivorState } from "../state/SurvivorState";
import { TempleRenderer } from "@view/entities/TempleRenderer";
import { FirepitRenderer } from "@view/entities/FirepitRenderer";
import { ArchiveRenderer } from "@view/entities/ArchiveRenderer";
import { FactionHallRenderer } from "@view/entities/FactionHallRenderer";
import { BlacksmithRenderer } from "@view/entities/BlacksmithRenderer";
import { StableRenderer } from "@view/entities/StableRenderer";

const TS = BalanceConfig.TILE_SIZE;

export class SurvivorRenderer {
  readonly worldLayer = new Container();
  readonly enemyContainer = new Container();
  readonly gemContainer = new Container();
  readonly projectileContainer = new Container();
  readonly playerContainer = new Container();
  readonly weaponFxContainer = new Container();
  readonly dmgNumberContainer = new Container();
  readonly hazardContainer = new Container();
  readonly landmarkContainer = new Container();

  playerSprite: AnimatedSprite | null = null;

  private _enemyViews = new Map<number, { container: Container; sprite: AnimatedSprite | null; hpBar: Graphics; nameText: Text | null }>();
  private _gemViews = new Map<number, Graphics>();
  private _chestViews = new Map<number, Graphics>();
  private _landmarkViews = new Map<string, { renderer: TempleRenderer | FirepitRenderer | ArchiveRenderer; auraGfx: Graphics; container: Container }>();
  private _tempLandmarkViews = new Map<number, { renderer: FactionHallRenderer | BlacksmithRenderer | StableRenderer; auraGfx: Graphics; container: Container }>();

  init(): void {
    this.worldLayer.removeChildren();
    this.enemyContainer.removeChildren();
    this.gemContainer.removeChildren();
    this.projectileContainer.removeChildren();
    this.playerContainer.removeChildren();
    this.weaponFxContainer.removeChildren();
    this.dmgNumberContainer.removeChildren();
    this.hazardContainer.removeChildren();
    this._enemyViews.clear();
    this._gemViews.clear();
    this._chestViews.clear();

    this.landmarkContainer.removeChildren();
    this._landmarkViews.clear();
    this.worldLayer.addChild(this.landmarkContainer);
    this.worldLayer.addChild(this.hazardContainer);
    this.worldLayer.addChild(this.gemContainer);
    this.worldLayer.addChild(this.enemyContainer);
    this.worldLayer.addChild(this.projectileContainer);
    this.worldLayer.addChild(this.weaponFxContainer);
    this.worldLayer.addChild(this.playerContainer);
    this.worldLayer.addChild(this.dmgNumberContainer);
  }

  createPlayerSprite(unitType: UnitType): void {
    const frames = animationManager.getFrames(unitType, UnitState.IDLE);
    if (frames.length > 0) {
      this.playerSprite = new AnimatedSprite(frames);
      this.playerSprite.animationSpeed = 0.15;
      this.playerSprite.play();
      this.playerSprite.anchor.set(0.5, 0.75);
      this.playerSprite.scale.set(1.5);
      this.playerContainer.addChild(this.playerSprite);
    }
  }

  renderPlayer(s: SurvivorState): void {
    const px = s.player.position.x * TS;
    const py = s.player.position.y * TS;
    this.playerContainer.position.set(px, py);

    if (this.playerSprite) {
      this.playerSprite.alpha = s.player.invincibilityTimer > 0
        ? (Math.sin(s.gameTime * 20) > 0 ? 0.3 : 0.8)
        : 1.0;

      const isMoving = s.input.left || s.input.right || s.input.up || s.input.down;
      const targetFrames = animationManager.getFrames(
        s.player.characterDef.unitType,
        isMoving ? UnitState.MOVE : UnitState.IDLE,
      );
      if (targetFrames.length > 0 && this.playerSprite.textures !== targetFrames) {
        this.playerSprite.textures = targetFrames;
        this.playerSprite.play();
      }

      if (s.input.left) this.playerSprite.scale.x = -Math.abs(this.playerSprite.scale.x);
      else if (s.input.right) this.playerSprite.scale.x = Math.abs(this.playerSprite.scale.x);

      // Dash visual feedback
      this.playerSprite.alpha = s.player.dashTimer > 0 ? 0.5 : this.playerSprite.alpha;
      this.playerSprite.tint = s.player.dashTimer > 0 ? 0x44aaff : 0xffffff;
    }
  }

  renderEnemies(s: SurvivorState): void {
    const activeIds = new Set<number>();

    for (const enemy of s.enemies) {
      activeIds.add(enemy.id);
      let view = this._enemyViews.get(enemy.id);

      if (!view) {
        const container = new Container();
        let sprite: AnimatedSprite | null = null;

        const frames = animationManager.getFrames(enemy.type, UnitState.MOVE);
        if (frames.length > 0) {
          sprite = new AnimatedSprite(frames);
          sprite.animationSpeed = 0.12;
          sprite.play();
          sprite.anchor.set(0.5, 0.75);
          const unitDef = UNIT_DEFINITIONS[enemy.type];
          const scale = enemy.isBoss ? SurvivorBalance.BOSS_SIZE_MULTIPLIER : 1.0;
          const defW = unitDef?.size?.width ?? 1;
          const defH = unitDef?.size?.height ?? 1;
          sprite.scale.set(scale * Math.max(defW, defH) * 0.8);
          container.addChild(sprite);
        }

        // Boss indicator glow
        if (enemy.isBoss) {
          const glow = new Graphics()
            .circle(0, -10, 24)
            .fill({ color: 0xff4444, alpha: 0.15 });
          container.addChildAt(glow, 0);
        }

        const hpBar = new Graphics();
        container.addChild(hpBar);

        // Floating name text for bosses and elites
        let nameText: Text | null = null;
        if (enemy.displayName) {
          const nameColor = enemy.isDeathBoss ? 0xff2222 : enemy.isBoss ? 0xff6644 : 0xddbb66;
          const fontSize = enemy.isBoss ? 11 : 9;
          nameText = new Text({
            text: enemy.displayName,
            style: new TextStyle({ fontFamily: "monospace", fontSize, fill: nameColor, fontWeight: "bold", letterSpacing: 1 }),
          });
          nameText.anchor.set(0.5, 1);
          nameText.position.set(0, -(enemy.isBoss ? 48 : 26));
          container.addChild(nameText);
        }

        this.enemyContainer.addChild(container);
        view = { container, sprite, hpBar, nameText };
        this._enemyViews.set(enemy.id, view);
      }

      view.container.position.set(enemy.position.x * TS, enemy.position.y * TS);
      view.container.zIndex = enemy.position.y;
      view.container.alpha = enemy.alive ? 1 : Math.max(0, enemy.deathTimer / 0.8);

      if (view.sprite) {
        const dx = s.player.position.x - enemy.position.x;
        view.sprite.scale.x = dx < 0 ? -Math.abs(view.sprite.scale.x) : Math.abs(view.sprite.scale.x);
        // Tint priority: hit flash > elite color > default
        if (enemy.hitTimer > 0) {
          view.sprite.tint = 0xff4444;
        } else if (enemy.eliteType) {
          const eliteDef = ELITE_DEFS[enemy.eliteType];
          view.sprite.tint = eliteDef?.tintColor ?? 0xffffff;
        } else {
          view.sprite.tint = 0xffffff;
        }
      }

      // Floating name bob
      if (view.nameText && enemy.alive) {
        const baseY = -(enemy.isBoss ? 48 : 26);
        view.nameText.position.y = baseY + Math.sin(s.gameTime * 2 + enemy.id) * 1.5;
      }

      if (enemy.alive) {
        const hpRatio = enemy.hp / enemy.maxHp;
        const barW = enemy.isBoss ? 48 : 24;
        const barH = enemy.isBoss ? 5 : 3;
        const barY = -(enemy.isBoss ? 40 : 20);
        view.hpBar.clear()
          .rect(-barW / 2, barY, barW, barH).fill({ color: 0x330000 })
          .rect(-barW / 2, barY, barW * hpRatio, barH).fill({ color: hpRatio > 0.5 ? 0x22cc22 : hpRatio > 0.25 ? 0xccaa22 : 0xcc2222 });
        view.hpBar.visible = hpRatio < 1;
      } else {
        view.hpBar.visible = false;
        if (view.nameText) view.nameText.visible = false;
        if (view.sprite) {
          const deathFrames = animationManager.getFrames(enemy.type, UnitState.DIE);
          if (deathFrames.length > 0 && view.sprite.textures !== deathFrames) {
            view.sprite.textures = deathFrames;
            view.sprite.loop = false;
            view.sprite.play();
          }
        }
      }
    }

    for (const [id, view] of this._enemyViews) {
      if (!activeIds.has(id)) {
        this.enemyContainer.removeChild(view.container);
        view.container.destroy({ children: true });
        this._enemyViews.delete(id);
      }
    }

    this.enemyContainer.sortChildren();
  }

  renderGems(s: SurvivorState): void {
    const activeIds = new Set<number>();

    for (const gem of s.gems) {
      if (!gem.alive) continue;
      activeIds.add(gem.id);
      let view = this._gemViews.get(gem.id);

      if (!view) {
        const color = SurvivorBalance.GEM_COLORS[gem.tier] ?? 0x44ff44;
        view = new Graphics();
        const sz = 3 + gem.tier;
        view.moveTo(0, -sz).lineTo(sz, 0).lineTo(0, sz).lineTo(-sz, 0).closePath().fill({ color });
        view.circle(0, 0, sz + 1).fill({ color, alpha: 0.2 });
        this.gemContainer.addChild(view);
        this._gemViews.set(gem.id, view);
      }

      view.position.set(gem.position.x * TS, gem.position.y * TS);
      view.position.y += Math.sin(s.gameTime * 4 + gem.id) * 2;
    }

    for (const [id, view] of this._gemViews) {
      if (!activeIds.has(id)) {
        this.gemContainer.removeChild(view);
        view.destroy();
        this._gemViews.delete(id);
      }
    }
  }

  renderChests(s: SurvivorState): void {
    const activeIds = new Set<number>();

    for (const chest of s.chests) {
      if (!chest.alive) continue;
      activeIds.add(chest.id);
      let view = this._chestViews.get(chest.id);

      if (!view) {
        view = new Graphics();
        const color = chest.type === "gold" ? 0xffd700 : chest.type === "heal" ? 0x44ff44 : chest.type === "arcana" ? 0xaa44ff : 0xff4444;
        view.roundRect(-8, -6, 16, 12, 2).fill({ color: 0x8b4513 });
        view.roundRect(-9, -8, 18, 5, 2).fill({ color: 0xa0522d });
        view.circle(0, -2, 3).fill({ color });
        view.circle(0, 0, 24).fill({ color, alpha: 0.1 });
        view.circle(0, 0, 18).stroke({ color, width: 1.5, alpha: 0.3 });
        this.gemContainer.addChild(view);
        this._chestViews.set(chest.id, view);
      }

      view.position.set(chest.position.x * TS, chest.position.y * TS);
      const pulse = 1 + Math.sin(s.gameTime * 3 + chest.id) * 0.08;
      view.scale.set(pulse);
    }

    for (const [id, view] of this._chestViews) {
      if (!activeIds.has(id)) {
        this.gemContainer.removeChild(view);
        view.destroy();
        this._chestViews.delete(id);
      }
    }
  }

  renderProjectiles(s: SurvivorState): void {
    this.projectileContainer.removeChildren();
    for (const proj of s.projectiles) {
      const def = WEAPON_DEFS[proj.weaponId];
      const g = new Graphics();
      const color = def?.color ?? 0xffffff;
      g.circle(0, 0, 3).fill({ color });
      g.circle(0, 0, 5).fill({ color, alpha: 0.3 });
      g.position.set(proj.position.x * TS, proj.position.y * TS);
      this.projectileContainer.addChild(g);
    }

    // Enemy projectiles
    for (const proj of s.enemyProjectiles) {
      const g = new Graphics();
      g.circle(0, 0, 4).fill({ color: 0xff2222 });
      g.circle(0, 0, 6).fill({ color: 0xff2222, alpha: 0.25 });
      g.position.set(proj.position.x * TS, proj.position.y * TS);
      this.projectileContainer.addChild(g);
    }
  }

  renderHazards(s: SurvivorState): void {
    this.hazardContainer.removeChildren();
    for (const h of s.hazards) {
      const gfx = new Graphics();
      let color = 0x444444;
      let alpha = 0.15;
      if (h.type === "lava") { color = 0xff4422; alpha = 0.25; }
      else if (h.type === "ice") { color = 0x88ccff; alpha = 0.2; }
      else if (h.type === "fog") { color = 0x448844; alpha = 0.15; }
      else if (h.type === "thorns") { color = 0x228822; alpha = 0.2; }
      gfx.circle(h.position.x * TS, h.position.y * TS, h.radius * TS).fill({ color, alpha });
      this.hazardContainer.addChild(gfx);
    }
  }

  initLandmarks(s: SurvivorState): void {
    this.landmarkContainer.removeChildren();
    this._landmarkViews.clear();

    for (const lm of s.landmarks) {
      const wrapper = new Container();
      wrapper.position.set(lm.position.x * TS, lm.position.y * TS);

      // Aura ring (drawn behind the building)
      const auraGfx = new Graphics();
      wrapper.addChild(auraGfx);

      // Create the building renderer
      let renderer: TempleRenderer | FirepitRenderer | ArchiveRenderer;
      switch (lm.type) {
        case "chapel":
          renderer = new TempleRenderer(null);
          // Center the temple (2x3 tiles) roughly on the landmark position
          renderer.container.position.set(-TS, -TS * 1.5);
          break;
        case "sword_stone":
          renderer = new FirepitRenderer();
          // Center the firepit on the landmark
          renderer.container.position.set(-TS * 0.5, -TS * 0.3);
          break;
        case "archive":
          renderer = new ArchiveRenderer(null);
          // Center the archive (2x2 tiles) on the landmark
          renderer.container.position.set(-TS, -TS);
          break;
      }
      wrapper.addChild(renderer.container);

      this.landmarkContainer.addChild(wrapper);
      this._landmarkViews.set(lm.id, { renderer, auraGfx, container: wrapper });
    }
  }

  renderLandmarks(s: SurvivorState, dt: number): void {
    const px = s.player.position.x;
    const py = s.player.position.y;

    // --- Permanent landmarks ---
    for (const lm of s.landmarks) {
      const view = this._landmarkViews.get(lm.id);
      if (!view) continue;

      // Tick the building animation
      const r = view.renderer;
      if (r instanceof TempleRenderer || r instanceof ArchiveRenderer) {
        r.tick(dt, GamePhase.BATTLE);
      } else {
        r.tick(dt);
      }

      // Aura ring — pulsing, brighter when player is inside
      const dx = px - lm.position.x;
      const dy = py - lm.position.y;
      const isInside = dx * dx + dy * dy < lm.radius * lm.radius;
      const pulse = 0.08 + Math.sin(s.gameTime * 2) * 0.03;
      const auraAlpha = isInside ? pulse + 0.06 : pulse;

      const auraColor = lm.type === "sword_stone" ? 0xffd700
        : lm.type === "chapel" ? 0x44ff44
        : 0x6688ff;

      view.auraGfx.clear()
        .circle(0, 0, lm.radius * TS)
        .fill({ color: auraColor, alpha: auraAlpha })
        .circle(0, 0, lm.radius * TS)
        .stroke({ color: auraColor, width: isInside ? 2 : 1, alpha: isInside ? 0.5 : 0.2 });
    }

    // --- Temporary landmarks ---
    const activeIds = new Set<number>();
    for (const tl of s.tempLandmarks) {
      activeIds.add(tl.id);
      let view = this._tempLandmarkViews.get(tl.id);

      if (!view) {
        const wrapper = new Container();
        wrapper.position.set(tl.position.x * TS, tl.position.y * TS);

        const auraGfx = new Graphics();
        wrapper.addChild(auraGfx);

        let renderer: FactionHallRenderer | BlacksmithRenderer | StableRenderer;
        switch (tl.type) {
          case "faction_hall":
            renderer = new FactionHallRenderer(null);
            renderer.container.position.set(-TS, -TS);
            break;
          case "blacksmith":
            renderer = new BlacksmithRenderer(null);
            renderer.container.position.set(-TS * 0.5, -TS * 0.5);
            break;
          case "stable":
            renderer = new StableRenderer(null);
            renderer.container.position.set(-TS * 0.5, -TS * 0.5);
            break;
        }
        wrapper.addChild(renderer.container);
        this.landmarkContainer.addChild(wrapper);
        view = { renderer, auraGfx, container: wrapper };
        this._tempLandmarkViews.set(tl.id, view);
      }

      // Tick animation
      const r = view.renderer;
      if (r instanceof BlacksmithRenderer || r instanceof StableRenderer) {
        r.tick(dt, GamePhase.BATTLE);
      } else {
        r.tick(dt);
      }

      // Fade out as remaining time decreases (last 10 seconds)
      const fadeAlpha = tl.remaining < 10 ? tl.remaining / 10 : 1;
      view.container.alpha = fadeAlpha;

      // Aura ring
      const dx = px - tl.position.x;
      const dy = py - tl.position.y;
      const isInside = dx * dx + dy * dy < tl.radius * tl.radius;
      const pulse = 0.08 + Math.sin(s.gameTime * 3) * 0.03;
      const auraAlpha = (isInside ? pulse + 0.06 : pulse) * fadeAlpha;

      const auraColor: number = tl.type === "faction_hall" ? 0x4488ff
        : tl.type === "blacksmith" ? 0xff8844
        : 0x44ddaa;

      view.auraGfx.clear()
        .circle(0, 0, tl.radius * TS)
        .fill({ color: auraColor, alpha: auraAlpha })
        .circle(0, 0, tl.radius * TS)
        .stroke({ color: auraColor, width: isInside ? 2 : 1, alpha: (isInside ? 0.5 : 0.2) * fadeAlpha });
    }

    // Remove expired temp landmark views
    for (const [id, view] of this._tempLandmarkViews) {
      if (!activeIds.has(id)) {
        this.landmarkContainer.removeChild(view.container);
        view.container.destroy({ children: true });
        this._tempLandmarkViews.delete(id);
      }
    }
  }

  cleanup(): void {
    this._enemyViews.clear();
    this._gemViews.clear();
    this._chestViews.clear();
    this._landmarkViews.clear();
    this._tempLandmarkViews.clear();
    this.playerSprite = null;
  }
}
