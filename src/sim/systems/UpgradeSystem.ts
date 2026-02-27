// Upgrade system for tracking and applying unit upgrades
import type { GameState } from "@sim/state/GameState";
import { UpgradeType } from "@/types";
import { UPGRADE_DEFINITIONS } from "@sim/config/UpgradeDefs";
import { EventBus } from "@sim/core/EventBus";

export interface PlayerUpgrade {
  type: UpgradeType;
  level: number; // Current upgrade level (0-3)
}

export interface PlayerUpgrades {
  [playerId: string]: PlayerUpgrade[];
}

// Global upgrade state
let playerUpgrades: PlayerUpgrades = {};

// ---------------------------------------------------------------------------
// Upgrade Management
// ---------------------------------------------------------------------------

export const UpgradeSystem = {
  /** Get all upgrades for a player */
  getPlayerUpgrades(playerId: string): PlayerUpgrade[] {
    if (!playerUpgrades[playerId]) {
      playerUpgrades[playerId] = [];
    }
    return playerUpgrades[playerId];
  },

  /** Get upgrade level for a specific upgrade type */
  getUpgradeLevel(playerId: string, upgradeType: UpgradeType): number {
    const upgrades = this.getPlayerUpgrades(playerId);
    const upgrade = upgrades.find(u => u.type === upgradeType);
    return upgrade ? upgrade.level : 0;
  },

  /** Purchase an upgrade */
  purchaseUpgrade(state: GameState, playerId: string, upgradeType: UpgradeType): boolean {
    const def = UPGRADE_DEFINITIONS[upgradeType];
    const currentLevel = this.getUpgradeLevel(playerId, upgradeType);
    
    // Check if can upgrade
    if (currentLevel >= def.maxLevel) {
      return false; // Already at max level
    }

    // Check if player has enough gold
    const player = state.players.get(playerId);
    if (!player || player.gold < def.cost) {
      return false; // Not enough gold
    }

    // Purchase upgrade
    player.gold -= def.cost;
    
    // Update upgrade level
    const upgrades = this.getPlayerUpgrades(playerId);
    const existingUpgrade = upgrades.find(u => u.type === upgradeType);
    
    if (existingUpgrade) {
      existingUpgrade.level++;
    } else {
      upgrades.push({ type: upgradeType, level: 1 });
    }

    // Apply upgrade effects to existing units
    this.applyUpgradesToExistingUnits(state, playerId, upgradeType);

    // Emit event for UI
    EventBus.emit("upgradePurchased", {
      playerId,
      upgradeType,
      newLevel: currentLevel + 1,
    });

    return true;
  },

  /** Apply upgrade effects to all existing units for a player */
  applyUpgradesToExistingUnits(state: GameState, playerId: string, upgradeType: UpgradeType): void {
    const def = UPGRADE_DEFINITIONS[upgradeType];
    const level = this.getUpgradeLevel(playerId, upgradeType);
    
    for (const unit of state.units.values()) {
      if (unit.owner === playerId && def.appliesTo.includes(unit.type)) {
        this.applyUpgradeToUnit(unit, upgradeType, level);
      }
    }
  },

  /** Apply upgrade effect to a single unit */
  applyUpgradeToUnit(unit: any, upgradeType: UpgradeType, level: number): void {
    const def = UPGRADE_DEFINITIONS[upgradeType];
    const totalBonus = 1 + (def.effect * level);

    switch (upgradeType) {
      case UpgradeType.MELEE_DAMAGE:
      case UpgradeType.RANGED_DAMAGE:
      case UpgradeType.SIEGE_DAMAGE:
      case UpgradeType.CREATURE_DAMAGE:
        unit.atk = Math.floor(unit.atk * totalBonus);
        break;

      case UpgradeType.MELEE_HEALTH:
      case UpgradeType.RANGED_HEALTH:
      case UpgradeType.SIEGE_HEALTH:
      case UpgradeType.CREATURE_HEALTH:
        unit.maxHp = Math.floor(unit.maxHp * totalBonus);
        unit.hp = Math.floor(unit.hp * totalBonus); // Also heal current HP proportionally
        break;

      case UpgradeType.MAGE_RANGE:
        unit.range = unit.range * totalBonus;
        break;
    }
  },

  /** Apply all upgrades to a newly spawned unit */
  applyAllUpgradesToUnit(unit: any): void {
    if (!unit.owner) return;

    const upgrades = this.getPlayerUpgrades(unit.owner);
    
    for (const upgrade of upgrades) {
      if (upgrade.level > 0) {
        const def = UPGRADE_DEFINITIONS[upgrade.type];
        if (def.appliesTo.includes(unit.type)) {
          this.applyUpgradeToUnit(unit, upgrade.type, upgrade.level);
        }
      }
    }
  },

  /** Get upgrade cost for next level */
  getUpgradeCost(upgradeType: UpgradeType, currentLevel: number): number {
    const def = UPGRADE_DEFINITIONS[upgradeType];
    return currentLevel < def.maxLevel ? def.cost : 0;
  },

  /** Check if upgrade can be purchased */
  canPurchaseUpgrade(state: GameState, playerId: string, upgradeType: UpgradeType): boolean {
    const def = UPGRADE_DEFINITIONS[upgradeType];
    const currentLevel = this.getUpgradeLevel(playerId, upgradeType);
    const player = state.players.get(playerId);
    
    return currentLevel < def.maxLevel && 
           player !== undefined && 
           player.gold >= def.cost;
  },

  /** Reset all upgrades (for new game) */
  resetUpgrades(): void {
    playerUpgrades = {};
  },
};
