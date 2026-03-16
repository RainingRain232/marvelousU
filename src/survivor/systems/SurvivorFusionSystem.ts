// ---------------------------------------------------------------------------
// Survivor fusion synergy system — checks weapon+passive combos for fusion effects
// ---------------------------------------------------------------------------

import { FUSION_DEFS } from "../config/SurvivorFusionSynergyDefs";
import type { SurvivorFusionDef } from "../config/SurvivorFusionSynergyDefs";
import type { SurvivorState } from "../state/SurvivorState";

type FusionActivatedCallback = ((fusion: SurvivorFusionDef) => void) | null;
let _activatedCallback: FusionActivatedCallback = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

export const SurvivorFusionSystem = {
  setActivatedCallback(cb: FusionActivatedCallback): void {
    _activatedCallback = cb;
  },

  /** Recheck all fusions after loadout change — called from LevelSystem */
  checkFusions(state: SurvivorState): void {
    const ownedWeapons = new Set(state.weapons.map((w) => w.id));
    const ownedPassives = new Set(state.passives.map((p) => p.id));

    const prevFusions = [...state.activeFusions];
    state.activeFusions = [];

    for (const fusion of FUSION_DEFS) {
      const hasWeapon = ownedWeapons.has(fusion.requireWeapon);
      const hasPassive = ownedPassives.has(fusion.requirePassive);
      if (hasWeapon && hasPassive) {
        state.activeFusions.push(fusion.id);
        // Notify if newly activated
        if (!prevFusions.includes(fusion.id)) {
          _activatedCallback?.(fusion);
        }
      }
    }
  },

  /** Check if a specific fusion is active */
  hasFusion(state: SurvivorState, fusionId: string): boolean {
    return state.activeFusions.includes(fusionId);
  },

  /** Get the fusion def by ID */
  getFusion(fusionId: string): SurvivorFusionDef | undefined {
    return FUSION_DEFS.find((f) => f.id === fusionId);
  },

  /** Get aggregate damage bonus from all active fusions */
  getDamageBonus(state: SurvivorState): number {
    let bonus = 0;
    for (const id of state.activeFusions) {
      const def = FUSION_DEFS.find((f) => f.id === id);
      if (def) bonus += def.damageBonus;
    }
    return bonus;
  },

  /** Get aggregate area bonus from all active fusions */
  getAreaBonus(state: SurvivorState): number {
    let bonus = 0;
    for (const id of state.activeFusions) {
      const def = FUSION_DEFS.find((f) => f.id === id);
      if (def) bonus += def.areaBonus;
    }
    return bonus;
  },

  /** Update fusion trail effects (fire trail behind player, etc.) */
  update(state: SurvivorState, dt: number): void {
    if (state.paused || state.levelUpPending || state.gameOver || state.victory) return;

    // Fire Trail fusion: drop fire patches as player moves
    if (this.hasFusion(state, "fire_trail")) {
      // Drop a trail every 0.3s while the player is moving
      const hasMovement = state.input.left || state.input.right || state.input.up || state.input.down;
      if (hasMovement) {
        // Check last trail — only spawn if moved enough distance
        const trails = state.fusionTrails.filter((t) => t.fusionId === "fire_trail");
        const lastTrail = trails[trails.length - 1];
        const shouldSpawn = !lastTrail || distSq(
          state.player.position.x, state.player.position.y,
          lastTrail.position.x, lastTrail.position.y,
        ) > 2.0;

        if (shouldSpawn) {
          state.fusionTrails.push({
            id: state.nextFusionTrailId++,
            position: { x: state.player.position.x, y: state.player.position.y },
            damage: state.player.atk * 0.3, // 30% of player ATK per tick
            radius: 1.5,
            lifetime: 3.0,
            color: 0xff6600,
            fusionId: "fire_trail",
          });
        }
      }
    }

    // Update trail lifetimes and apply damage
    for (const trail of state.fusionTrails) {
      trail.lifetime -= dt;

      // Damage enemies in radius
      for (const e of state.enemies) {
        if (!e.alive) continue;
        if (distSq(trail.position.x, trail.position.y, e.position.x, e.position.y) < trail.radius * trail.radius) {
          e.hp -= trail.damage * dt;
          e.hitTimer = 0.05;
          if (e.hp <= 0) {
            e.alive = false;
            e.deathTimer = 0.8;
            state.totalKills++;
          }
        }
      }
    }

    // Cleanup expired trails
    state.fusionTrails = state.fusionTrails.filter((t) => t.lifetime > 0);

    // Ice Armor fusion: freeze enemies that touch the player
    if (this.hasFusion(state, "ice_armor")) {
      const px = state.player.position.x;
      const py = state.player.position.y;
      for (const e of state.enemies) {
        if (!e.alive) continue;
        if (distSq(px, py, e.position.x, e.position.y) < 1.5 * 1.5) {
          if (e.slowTimer <= 0) {
            e.slowFactor = 0;
            e.slowTimer = 1.0;
          }
        }
      }
    }

    // Blade Chalice fusion: spinning blade heals 2% of damage dealt
    // (integrated in combat system via hasFusion check)

    // Catapult Armor fusion: stun on impact
    // (integrated in combat system via hasFusion check)
  },

  cleanup(): void {
    _activatedCallback = null;
  },
};
