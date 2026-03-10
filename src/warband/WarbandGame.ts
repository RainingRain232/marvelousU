// ---------------------------------------------------------------------------
// Warband mode – main game orchestrator
// Manages the full lifecycle: menu → shop → battle → results
// ---------------------------------------------------------------------------

import * as THREE from "three";
import {
  type WarbandState,
  type WarbandFighter,
  WarbandPhase,
  BattleType,
  FighterCombatState,
  createWarbandState,
  createDefaultFighter,
  vec3,
} from "./state/WarbandState";
import { WB } from "./config/WarbandBalanceConfig";
import { WEAPON_DEFS } from "./config/WeaponDefs";
import { ARMOR_DEFS, ArmorSlot } from "./config/ArmorDefs";

import { WarbandSceneManager } from "./view/WarbandSceneManager";
import { WarbandCameraController } from "./view/WarbandCameraController";
import { FighterMesh } from "./view/WarbandFighterRenderer";
import { WarbandHUD } from "./view/WarbandHUD";
import { WarbandShopView } from "./view/WarbandShopView";
import { WarbandFX } from "./view/WarbandFX";

import { WarbandInputSystem } from "./systems/WarbandInputSystem";
import { WarbandCombatSystem } from "./systems/WarbandCombatSystem";
import { WarbandPhysicsSystem } from "./systems/WarbandPhysicsSystem";
import { WarbandAISystem } from "./systems/WarbandAISystem";

// ---- Random AI names ------------------------------------------------------

const AI_NAMES_PLAYER = [
  "Sir Gareth", "Sir Bors", "Lady Elaine", "Sir Percival",
  "Dame Isolde", "Sir Tristan", "Lady Morgana", "Sir Galahad",
];
const AI_NAMES_ENEMY = [
  "Black Knight", "Raider Ulric", "Bandit Thorne", "Dark Warden",
  "Marauder Kael", "Pillager Varn", "Rogue Aldric", "Brigand Hask",
];

export class WarbandGame {
  private _state: WarbandState | null = null;

  // Systems
  private _inputSystem = new WarbandInputSystem();
  private _combatSystem = new WarbandCombatSystem();
  private _physicsSystem = new WarbandPhysicsSystem();
  private _aiSystem = new WarbandAISystem();

  // View
  private _sceneManager = new WarbandSceneManager();
  private _cameraController!: WarbandCameraController;
  private _fighterMeshes: Map<string, FighterMesh> = new Map();
  private _hud = new WarbandHUD();
  private _shop = new WarbandShopView();
  private _fx!: WarbandFX;

  // Projectile visuals
  private _projectileMeshes: Map<string, THREE.Mesh> = new Map();

  // Pickup visuals
  private _pickupMeshes: Map<string, THREE.Group> = new Map();

  // Game loop
  private _rafId = 0;
  private _lastTime = 0;
  private _simAccumulator = 0;

  // Menu
  private _menuContainer: HTMLDivElement | null = null;
  private _resultsContainer: HTMLDivElement | null = null;

  // ESC handler
  private _escHandler: ((e: KeyboardEvent) => void) | null = null;

  async boot(): Promise<void> {
    // Hide PixiJS
    const pixiCanvas = document.querySelector("#pixi-container canvas:not(#warband-canvas)") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "none";

    // Init Three.js scene
    this._sceneManager.init();
    this._cameraController = new WarbandCameraController(this._sceneManager.camera);
    this._fx = new WarbandFX(this._sceneManager.scene);

    // Init HUD
    this._hud.init();

    // Init shop
    this._shop.init();

    // ESC to exit
    this._escHandler = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        if (this._state?.phase === WarbandPhase.BATTLE) {
          // Exit pointer lock
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
        } else if (this._state?.phase === WarbandPhase.MENU) {
          this._exit();
        }
      }
    };
    window.addEventListener("keydown", this._escHandler);

    // Show mode selection menu
    this._showMenu();
  }

  // ---- Menu ---------------------------------------------------------------

  private _showMenu(): void {
    this._menuContainer = document.createElement("div");
    this._menuContainer.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 30; background: rgba(10, 8, 5, 0.97);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: 'Segoe UI', sans-serif; color: #e0d5c0;
    `;

    this._menuContainer.innerHTML = `
      <h1 style="font-size:48px;color:#daa520;text-shadow:0 0 20px rgba(218,165,32,0.4);margin-bottom:10px">
        ⚔ WARBAND ⚔
      </h1>
      <p style="color:#aa9977;margin-bottom:40px;font-size:16px">Mount & Blade style combat</p>

      <button id="wb-open-field" style="${this._menuBtnStyle()}">
        🏕 Open Field Battle
        <span style="display:block;font-size:12px;color:#999;margin-top:4px">5v5 on open terrain</span>
      </button>

      <button id="wb-siege" style="${this._menuBtnStyle()}">
        🏰 Siege Battle
        <span style="display:block;font-size:12px;color:#999;margin-top:4px">Storm the castle walls</span>
      </button>

      <button id="wb-back" style="${this._menuBtnStyle("#555", "#888")}">
        ← Back to Hub
      </button>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._menuContainer);

    document.getElementById("wb-open-field")?.addEventListener("click", () => {
      this._removeMenu();
      this._startGame(BattleType.OPEN_FIELD);
    });

    document.getElementById("wb-siege")?.addEventListener("click", () => {
      this._removeMenu();
      this._startGame(BattleType.SIEGE);
    });

    document.getElementById("wb-back")?.addEventListener("click", () => {
      this._exit();
    });
  }

  private _menuBtnStyle(bg = "#8b0000", border = "#daa520"): string {
    return `
      display: block; width: 300px; padding: 15px 20px;
      margin: 8px 0; font-size: 18px; font-weight: bold;
      background: ${bg}; color: #e0d5c0;
      border: 2px solid ${border}; border-radius: 6px;
      cursor: pointer; text-align: center;
      font-family: inherit;
    `;
  }

  private _removeMenu(): void {
    if (this._menuContainer?.parentNode) {
      this._menuContainer.parentNode.removeChild(this._menuContainer);
      this._menuContainer = null;
    }
  }

  // ---- Game start ---------------------------------------------------------

  private _startGame(battleType: BattleType): void {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    this._state = createWarbandState(battleType, sw, sh);

    // Build siege geometry if needed
    if (battleType === BattleType.SIEGE) {
      this._sceneManager.buildSiegeArena();
    }

    // Create player
    const player = createDefaultFighter(
      "player_0",
      "You",
      "player",
      true,
      vec3(0, 0, 10),
    );
    this._state.fighters.push(player);

    // Create player allies
    for (let i = 1; i < WB.TEAM_SIZE; i++) {
      const ally = createDefaultFighter(
        `ally_${i}`,
        AI_NAMES_PLAYER[i % AI_NAMES_PLAYER.length],
        "player",
        false,
        vec3(-6 + i * 3, 0, 12),
      );
      // Give allies random equipment
      this._equipRandomLoadout(ally, "medium");
      this._state.fighters.push(ally);
    }

    // Create enemies
    for (let i = 0; i < WB.TEAM_SIZE; i++) {
      const spawnZ = battleType === BattleType.SIEGE ? -20 : -10;
      const enemy = createDefaultFighter(
        `enemy_${i}`,
        AI_NAMES_ENEMY[i % AI_NAMES_ENEMY.length],
        "enemy",
        false,
        vec3(-6 + i * 3, 0, spawnZ),
      );
      this._equipRandomLoadout(enemy, "medium");
      this._state.fighters.push(enemy);
    }

    // Show shop
    this._state.phase = WarbandPhase.SHOP;
    this._shop.show(player, () => {
      this._startBattle();
    });
  }

  private _equipRandomLoadout(fighter: WarbandFighter, tier: "light" | "medium" | "heavy"): void {
    // Random weapon
    const meleeWeapons = Object.values(WEAPON_DEFS).filter(
      (w) => w.category === "one_handed" || w.category === "two_handed" || w.category === "polearm",
    );
    const rangedWeapons = Object.values(WEAPON_DEFS).filter(
      (w) => w.category === "bow" || w.category === "crossbow" || w.category === "thrown",
    );

    // 70% melee, 30% ranged
    if (Math.random() < 0.7) {
      fighter.equipment.mainHand = meleeWeapons[Math.floor(Math.random() * meleeWeapons.length)];

      // Maybe a shield
      if (fighter.equipment.mainHand.category === "one_handed" && Math.random() < 0.6) {
        const shields = Object.values(WEAPON_DEFS).filter((w) => w.category === "shield");
        fighter.equipment.offHand = shields[Math.floor(Math.random() * shields.length)];
      }
    } else {
      fighter.equipment.mainHand = rangedWeapons[Math.floor(Math.random() * rangedWeapons.length)];
      if (fighter.equipment.mainHand.ammo) {
        fighter.ammo = fighter.equipment.mainHand.ammo;
        fighter.maxAmmo = fighter.equipment.mainHand.ammo;
      }
    }

    // Random armor based on tier
    const armorsBySlot = {
      [ArmorSlot.HEAD]: Object.values(ARMOR_DEFS).filter((a) => a.slot === ArmorSlot.HEAD),
      [ArmorSlot.TORSO]: Object.values(ARMOR_DEFS).filter((a) => a.slot === ArmorSlot.TORSO),
      [ArmorSlot.GAUNTLETS]: Object.values(ARMOR_DEFS).filter((a) => a.slot === ArmorSlot.GAUNTLETS),
      [ArmorSlot.LEGS]: Object.values(ARMOR_DEFS).filter((a) => a.slot === ArmorSlot.LEGS),
      [ArmorSlot.BOOTS]: Object.values(ARMOR_DEFS).filter((a) => a.slot === ArmorSlot.BOOTS),
    };

    const tierIdx = tier === "light" ? 0 : tier === "medium" ? 1 : 2;

    for (const slot of Object.values(ArmorSlot)) {
      const available = armorsBySlot[slot];
      if (available.length === 0) continue;

      // Pick armor roughly matching tier
      const maxIdx = Math.min(available.length - 1, tierIdx + 1);
      const idx = Math.floor(Math.random() * (maxIdx + 1));
      fighter.equipment.armor[slot] = available[idx];
    }
  }

  // ---- Battle -------------------------------------------------------------

  private _startBattle(): void {
    if (!this._state) return;

    this._state.phase = WarbandPhase.BATTLE;

    // Create fighter meshes
    let playerIdx = 0;
    let enemyIdx = 0;
    for (const fighter of this._state.fighters) {
      const idx = fighter.team === "player" ? playerIdx++ : enemyIdx++;
      const mesh = new FighterMesh(fighter, idx);
      mesh.updateArmorVisuals(fighter);
      this._sceneManager.scene.add(mesh.group);
      this._fighterMeshes.set(fighter.id, mesh);
    }

    // Init input
    this._inputSystem.init(
      this._sceneManager.canvas,
      this._cameraController,
    );

    // Start game loop
    this._lastTime = performance.now();
    this._simAccumulator = 0;
    this._gameLoop(this._lastTime);

    this._hud.showCenterMessage("FIGHT!", 2000);
  }

  private _gameLoop = (time: number): void => {
    this._rafId = requestAnimationFrame(this._gameLoop);

    const rawDt = time - this._lastTime;
    this._lastTime = time;

    // Cap dt to avoid spiral of death
    const dt = Math.min(rawDt, 100);
    const dtSec = dt / 1000;

    if (!this._state || this._state.phase !== WarbandPhase.BATTLE) {
      this._sceneManager.render();
      return;
    }

    // Fixed timestep simulation
    this._simAccumulator += dt;
    while (this._simAccumulator >= WB.SIM_TICK_MS) {
      this._simAccumulator -= WB.SIM_TICK_MS;
      this._simTick();
    }

    // Render
    this._updateVisuals(dtSec);
    this._fx.update(dtSec);
    this._sceneManager.render();
  };

  private _simTick(): void {
    if (!this._state) return;

    this._state.tick++;

    // Input → player
    this._inputSystem.update(this._state);

    // AI
    this._aiSystem.update(this._state);

    // Combat (attacks, blocks, damage)
    this._combatSystem.update(this._state);

    // Process combat events
    for (const hit of this._combatSystem.hits) {
      if (hit.blocked) {
        this._fx.spawnHitSparks(hit.position.x, hit.position.y, hit.position.z, true);
      } else {
        this._fx.spawnBlood(hit.position.x, hit.position.y, hit.position.z, hit.damage);
        this._fx.spawnHitSparks(hit.position.x, hit.position.y, hit.position.z, false);
      }
    }

    for (const kill of this._combatSystem.kills) {
      const killer = this._state.fighters.find((f) => f.id === kill.killerId);
      const victim = this._state.fighters.find((f) => f.id === kill.victimId);
      if (killer && victim) {
        this._hud.addKill(killer.name, victim.name);
      }
    }

    // Physics (movement, gravity, collisions)
    this._physicsSystem.update(this._state);

    // Check win/loss
    if (this._state.playerTeamAlive <= 0) {
      this._endBattle(false);
    } else if (this._state.enemyTeamAlive <= 0) {
      this._endBattle(true);
    }

    // Battle timer
    this._state.battleTimer--;
    if (this._state.battleTimer <= 0) {
      // Time's up - team with more alive wins
      this._endBattle(this._state.playerTeamAlive > this._state.enemyTeamAlive);
    }
  }

  private _updateVisuals(dt: number): void {
    if (!this._state) return;

    const player = this._state.fighters.find((f) => f.id === this._state!.playerId);
    if (player) {
      this._cameraController.update(this._state, player);
    }

    // Update fighter meshes
    for (const fighter of this._state.fighters) {
      const mesh = this._fighterMeshes.get(fighter.id);
      if (mesh) {
        mesh.update(fighter, dt, this._sceneManager.camera);
      }
    }

    // Update projectile visuals
    for (const proj of this._state.projectiles) {
      let mesh = this._projectileMeshes.get(proj.id);
      if (!mesh) {
        const geo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0x8b6914 });
        mesh = new THREE.Mesh(geo, mat);
        this._sceneManager.scene.add(mesh);
        this._projectileMeshes.set(proj.id, mesh);
      }
      mesh.position.set(proj.position.x, proj.position.y, proj.position.z);
      // Orient arrow along velocity
      const vel = new THREE.Vector3(proj.velocity.x, proj.velocity.y, proj.velocity.z);
      if (vel.lengthSq() > 0.01) {
        mesh.lookAt(
          proj.position.x + proj.velocity.x,
          proj.position.y + proj.velocity.y,
          proj.position.z + proj.velocity.z,
        );
        mesh.rotateX(Math.PI / 2);
      }
    }

    // Remove dead projectile meshes
    for (const [id, mesh] of this._projectileMeshes) {
      if (!this._state.projectiles.find((p) => p.id === id)) {
        this._sceneManager.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this._projectileMeshes.delete(id);
      }
    }

    // Update pickup visuals
    for (const pickup of this._state.pickups) {
      let group = this._pickupMeshes.get(pickup.id);
      if (!group) {
        group = new THREE.Group();
        // Floating weapon indicator
        const geo = new THREE.BoxGeometry(0.3, 0.1, 0.1);
        const mat = new THREE.MeshStandardMaterial({
          color: pickup.weapon.color,
          emissive: 0x444400,
          emissiveIntensity: 0.3,
        });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);

        // Glow ring
        const ringGeo = new THREE.RingGeometry(0.3, 0.4, 16);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xffdd44,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        group.add(ring);

        this._sceneManager.scene.add(group);
        this._pickupMeshes.set(pickup.id, group);
      }

      group.position.set(
        pickup.position.x,
        pickup.position.y + 0.5 + Math.sin(Date.now() * 0.003) * 0.15,
        pickup.position.z,
      );
      group.rotation.y += 0.02;
    }

    // Remove dead pickup meshes
    for (const [id, group] of this._pickupMeshes) {
      if (!this._state.pickups.find((p) => p.id === id)) {
        this._sceneManager.scene.remove(group);
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            (obj.material as THREE.Material).dispose();
          }
        });
        this._pickupMeshes.delete(id);
      }
    }

    // HUD
    this._hud.update(this._state);
  }

  // ---- End battle ---------------------------------------------------------

  private _endBattle(playerWon: boolean): void {
    if (!this._state) return;

    this._state.phase = WarbandPhase.RESULTS;

    if (playerWon) {
      this._state.playerWins++;
      this._hud.showCenterMessage("VICTORY!", 3000);
    } else {
      this._state.enemyWins++;
      this._hud.showCenterMessage("DEFEAT!", 3000);
    }

    // Exit pointer lock
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    // Show results after delay
    setTimeout(() => {
      this._showResults(playerWon);
    }, 2000);
  }

  private _showResults(won: boolean): void {
    if (!this._state) return;

    const player = this._state.fighters.find((f) => f.id === this._state!.playerId);
    if (!player) return;

    this._resultsContainer = document.createElement("div");
    this._resultsContainer.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 30; background: rgba(10, 8, 5, 0.9);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: 'Segoe UI', sans-serif; color: #e0d5c0;
    `;

    const allFighters = this._state.fighters;
    const statsHTML = allFighters
      .sort((a, b) => b.kills - a.kills)
      .map(
        (f) => `
        <tr style="color:${f.team === "player" ? "#4488ff" : "#ff4444"}${f.isPlayer ? ";font-weight:bold" : ""}">
          <td style="padding:4px 12px">${f.name}${f.isPlayer ? " (You)" : ""}</td>
          <td style="padding:4px 12px;text-align:center">${f.kills}</td>
          <td style="padding:4px 12px;text-align:center">${f.damage_dealt}</td>
          <td style="padding:4px 12px;text-align:center">${f.hp <= 0 ? "Dead" : `${f.hp} HP`}</td>
        </tr>
      `,
      )
      .join("");

    this._resultsContainer.innerHTML = `
      <h1 style="font-size:42px;color:${won ? "#ffd700" : "#cc4444"};text-shadow:0 0 15px rgba(${won ? "218,165,32" : "204,68,68"},0.4)">
        ${won ? "⚔ VICTORY ⚔" : "☠ DEFEAT ☠"}
      </h1>
      <p style="margin-bottom:20px;color:#aa9977">Round ${this._state!.round}</p>

      <table style="border-collapse:collapse;margin-bottom:30px">
        <tr style="color:#daa520;border-bottom:1px solid #444">
          <th style="padding:8px 12px;text-align:left">Fighter</th>
          <th style="padding:8px 12px">Kills</th>
          <th style="padding:8px 12px">Damage</th>
          <th style="padding:8px 12px">Status</th>
        </tr>
        ${statsHTML}
      </table>

      <p style="color:#ffd700;font-size:18px;margin-bottom:20px">
        Gold: ${player.gold} (+${player.kills * WB.GOLD_PER_KILL} from kills)
      </p>

      <div>
        <button id="wb-next-round" style="${this._menuBtnStyle()}">
          ⚔ Next Round
        </button>
        <button id="wb-back-menu" style="${this._menuBtnStyle("#555", "#888")}">
          ← Back to Menu
        </button>
      </div>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._resultsContainer);

    document.getElementById("wb-next-round")?.addEventListener("click", () => {
      this._removeResults();
      this._nextRound();
    });

    document.getElementById("wb-back-menu")?.addEventListener("click", () => {
      this._removeResults();
      this._cleanup();
      this._showMenu();
    });
  }

  private _removeResults(): void {
    if (this._resultsContainer?.parentNode) {
      this._resultsContainer.parentNode.removeChild(this._resultsContainer);
      this._resultsContainer = null;
    }
  }

  // ---- Next round ---------------------------------------------------------

  private _nextRound(): void {
    if (!this._state) return;

    // Clean up visuals
    this._cleanupBattleVisuals();

    this._state.round++;

    // Reset player HP/stamina, keep gold and equipment
    const player = this._state.fighters.find((f) => f.id === this._state!.playerId);
    if (!player) return;

    player.hp = player.maxHp;
    player.stamina = player.maxStamina;
    player.combatState = FighterCombatState.IDLE;
    player.position = vec3(0, 0, 10);
    player.velocity = vec3();

    // Refill ammo
    if (player.equipment.mainHand?.ammo) {
      player.ammo = player.equipment.mainHand.ammo;
    }

    // Remove old AI fighters
    this._state.fighters = this._state.fighters.filter((f) => f.isPlayer);

    // Create new allies
    for (let i = 1; i < WB.TEAM_SIZE; i++) {
      const ally = createDefaultFighter(
        `ally_r${this._state.round}_${i}`,
        AI_NAMES_PLAYER[i % AI_NAMES_PLAYER.length],
        "player",
        false,
        vec3(-6 + i * 3, 0, 12),
      );
      this._equipRandomLoadout(ally, this._state.round > 3 ? "heavy" : "medium");
      this._state.fighters.push(ally);
    }

    // Create new enemies (scale difficulty)
    const enemyTier = this._state.round <= 2 ? "medium" : "heavy";
    for (let i = 0; i < WB.TEAM_SIZE; i++) {
      const spawnZ = this._state.battleType === BattleType.SIEGE ? -20 : -10;
      const enemy = createDefaultFighter(
        `enemy_r${this._state.round}_${i}`,
        AI_NAMES_ENEMY[i % AI_NAMES_ENEMY.length],
        "enemy",
        false,
        vec3(-6 + i * 3, 0, spawnZ),
      );
      this._equipRandomLoadout(enemy, enemyTier);
      // Scale AI difficulty with rounds
      if (enemy.ai) {
        enemy.ai.blockChance = Math.min(0.85, WB.AI_BLOCK_CHANCE_NORMAL + this._state.round * 0.05);
        enemy.ai.reactionDelay = Math.max(6, WB.AI_REACTION_TICKS_NORMAL - this._state.round * 2);
        enemy.ai.aggressiveness = Math.min(0.9, 0.5 + this._state.round * 0.05);
      }
      this._state.fighters.push(enemy);
    }

    // Reset counts
    this._state.playerTeamAlive = WB.TEAM_SIZE;
    this._state.enemyTeamAlive = WB.TEAM_SIZE;
    this._state.projectiles = [];
    this._state.pickups = [];
    this._state.battleTimer = 60 * WB.TICKS_PER_SEC;
    this._state.tick = 0;

    // Show shop
    this._state.phase = WarbandPhase.SHOP;
    this._shop.show(player, () => {
      this._startBattle();
    });
  }

  // ---- Cleanup ------------------------------------------------------------

  private _cleanupBattleVisuals(): void {
    // Remove fighter meshes
    for (const [, mesh] of this._fighterMeshes) {
      this._sceneManager.scene.remove(mesh.group);
      mesh.dispose();
    }
    this._fighterMeshes.clear();

    // Remove projectile meshes
    for (const [, mesh] of this._projectileMeshes) {
      this._sceneManager.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this._projectileMeshes.clear();

    // Remove pickup meshes
    for (const [, group] of this._pickupMeshes) {
      this._sceneManager.scene.remove(group);
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
    }
    this._pickupMeshes.clear();
  }

  private _cleanup(): void {
    cancelAnimationFrame(this._rafId);
    this._cleanupBattleVisuals();
    this._inputSystem.destroy();
    this._state = null;
  }

  private _exit(): void {
    this._cleanup();
    this._removeMenu();
    this._removeResults();
    this._hud.destroy();
    this._shop.destroy();
    this._fx.destroy();
    this._sceneManager.destroy();

    if (this._escHandler) {
      window.removeEventListener("keydown", this._escHandler);
      this._escHandler = null;
    }

    // Show PixiJS canvas again
    const pixiCanvas = document.querySelector("#pixi-container canvas:not(#warband-canvas)") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "";

    // Fire exit event
    window.dispatchEvent(new Event("warbandExit"));
  }

  destroy(): void {
    this._exit();
  }
}
