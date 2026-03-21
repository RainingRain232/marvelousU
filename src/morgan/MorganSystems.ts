// ---------------------------------------------------------------------------
// Morgan -- Game Systems (physics, AI, spells, detection, sound, traps)
// ---------------------------------------------------------------------------

import {
  CELL_SIZE, FLOOR_W, FLOOR_H, TileType, GuardState, GuardType, MorganSpell, PickupType,
  MORGAN_SPEED, MORGAN_SNEAK_SPEED, MORGAN_SPRINT_SPEED, MORGAN_TURN_SPEED,
  STAMINA_REGEN, SPRINT_DRAIN, MANA_REGEN, MAX_MANA,
  SHADOW_CLOAK_COST, SHADOW_CLOAK_DURATION,
  DARK_BOLT_COST, DARK_BOLT_RANGE, DARK_BOLT_DAMAGE,
  SLEEP_MIST_COST, SLEEP_MIST_RADIUS, SLEEP_MIST_DURATION,
  BLINK_COST, BLINK_RANGE,
  DECOY_COST, DECOY_DURATION,
  GUARD_SPEED, GUARD_VIEW_RANGE, GUARD_VIEW_ANGLE,
  GUARD_ALERT_DURATION, GUARD_ALERT_VIEW_RANGE,
  HEAVY_GUARD_SPEED, HEAVY_GUARD_DAMAGE,
  MAGE_GUARD_RANGE, MAGE_GUARD_COOLDOWN,
  HOUND_DETECTION_MUL, HOUND_SPEED,
  DETECTION_RATE_VISIBLE, DETECTION_DECAY, DETECTION_THRESHOLD,
  SHADOW_ZONE_STEALTH_BONUS, TORCH_RANGE,
  ARTIFACT_SCORE, LEVEL_COMPLETE_BONUS,
  SOUND_SPRINT_RADIUS, SOUND_SPELL_RADIUS, SOUND_COMBAT_RADIUS, SOUND_WALK_RADIUS,
  HEALTH_POTION_HEAL, MANA_POTION_RESTORE,
  BACKSTAB_ANGLE, BACKSTAB_RANGE, BACKSTAB_DAMAGE,
  TRAP_DAMAGE, WARD_ALERT_RADIUS,
  GUARD_CALL_RADIUS, BODY_DISCOVERY_ALERT_DURATION,
  TORCH_EXTINGUISH_RANGE, TORCH_EXTINGUISH_COST,
  DISTRACTION_RANGE, DISTRACTION_SOUND_RADIUS,
  COMBO_WINDOW, COMBO_MULTIPLIER_PER_STACK,
  GUARD_BARKS,
  TIME_BONUS_FAST, TIME_BONUS_MEDIUM, TIME_FAST_XP, TIME_MEDIUM_XP,
  PACIFIST_XP,
  SPELL_COOLDOWNS,
  BOSS_PHASE_2_HP, BOSS_PHASE_3_HP,
  BOSS_SHOCKWAVE_DAMAGE, BOSS_SHOCKWAVE_RADIUS, BOSS_SHOCKWAVE_COOLDOWN,
  BOSS_TELEPORT_COOLDOWN, BOSS_DARK_BARRAGE_COUNT, BOSS_SUMMON_COUNT,
  WATER_SPEED_MULT, WATER_NOISE_RADIUS, FIRE_DAMAGE_PER_SEC,
  DIFFICULTY_MULTS,
  DODGE_ROLL_COST, DODGE_ROLL_DURATION, DODGE_ROLL_SPEED, DODGE_ROLL_COOLDOWN,
  DETECTION_LINGER,
  ENV_KILL_WATER_STUN, GUARD_PUSH_RANGE, GUARD_PUSH_FORCE,
  ARTIFACT_BONUS_DURATION,
  BODY_HIDE_RANGE, BODY_HIDE_DURATION,
  SPELL_INTERRUPT_STUN,
} from "./MorganConfig";

import {
  type MorganGameState, type Guard, type Vec2,
  v2, v2Dist, pushMessage, emitSound, spawnLoot,
} from "./MorganState";

// --- Input state ---
const _keys: Record<string, boolean> = {};
const _pressed: Record<string, boolean> = {};

export function onKeyDown(e: KeyboardEvent): void {
  _keys[e.code] = true;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD", "Tab"].includes(e.code)) {
    e.preventDefault();
  }
}
export function onKeyUp(e: KeyboardEvent): void { _keys[e.code] = false; }
function isDown(code: string): boolean { return !!_keys[code]; }
function justPressed(code: string): boolean {
  if (_keys[code] && !_pressed[code]) { _pressed[code] = true; return true; }
  if (!_keys[code]) _pressed[code] = false;
  return false;
}
export function resetInput(): void {
  for (const k of Object.keys(_keys)) _keys[k] = false;
  for (const k of Object.keys(_pressed)) _pressed[k] = false;
}

// --- Tile queries ---
function getTile(state: MorganGameState, wx: number, wz: number): TileType {
  const tx = Math.floor(wx / CELL_SIZE);
  const tz = Math.floor(wz / CELL_SIZE);
  if (tx < 0 || tx >= FLOOR_W || tz < 0 || tz >= FLOOR_H) return TileType.WALL;
  return state.tiles[tz][tx];
}

function isWalkable(tile: TileType): boolean {
  return tile !== TileType.WALL && tile !== TileType.TORCH && tile !== TileType.LOCKED_DOOR;
  // WATER and FIRE_GRATE are walkable but have effects
}

function canWalk(state: MorganGameState, x: number, z: number): boolean {
  return isWalkable(getTile(state, x, z));
}

function canWalkOrBlink(state: MorganGameState, x: number, z: number, throughWalls: boolean): boolean {
  if (throughWalls) {
    const tile = getTile(state, x, z);
    return tile !== TileType.WALL; // can blink through doors but not walls
  }
  return canWalk(state, x, z);
}

function isInShadow(state: MorganGameState, pos: Vec2): boolean {
  const tile = getTile(state, pos.x, pos.z);
  if (tile === TileType.SHADOW) return true;
  for (let i = 0; i < state.torchPositions.length; i++) {
    if (state.extinguishedTorches.has(i)) continue; // extinguished torches don't illuminate
    if (v2Dist(pos, state.torchPositions[i]) < TORCH_RANGE) return false;
  }
  return true;
}

// --- Visibility calculation ---
function calcVisibility(state: MorganGameState): number {
  const p = state.player;
  if (p.cloaked) return 0;
  let vis = 0.3; // base visibility
  // Check proximity to active torches
  for (let i = 0; i < state.torchPositions.length; i++) {
    if (state.extinguishedTorches.has(i)) continue;
    const dist = v2Dist(p.pos, state.torchPositions[i]);
    if (dist < TORCH_RANGE) {
      vis = Math.max(vis, 1.0 - dist / TORCH_RANGE);
    }
  }
  if (isInShadow(state, p.pos)) vis *= 0.3;
  if (p.sneaking) vis *= 0.5;
  return Math.min(1, vis);
}

// --- Line of sight ---
function hasLineOfSight(state: MorganGameState, from: Vec2, to: Vec2): boolean {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const steps = Math.ceil(dist / (CELL_SIZE * 0.5));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = from.x + dx * t;
    const z = from.z + dz * t;
    const tile = getTile(state, x, z);
    if (tile === TileType.WALL || tile === TileType.LOCKED_DOOR) return false;
  }
  return true;
}

// --- Player system ---
export function tickPlayer(state: MorganGameState, dt: number): void {
  const p = state.player;
  if (p.dead) return;

  // Rotation
  let turnInput = 0;
  if (isDown("ArrowLeft") || isDown("KeyA")) turnInput += 1;
  if (isDown("ArrowRight") || isDown("KeyD")) turnInput -= 1;
  p.angle += turnInput * MORGAN_TURN_SPEED * dt;

  // Movement
  let moveInput = 0;
  if (isDown("ArrowUp") || isDown("KeyW")) moveInput += 1;
  if (isDown("ArrowDown") || isDown("KeyS")) moveInput -= 1;

  let strafe = 0;
  if (isDown("KeyQ")) strafe -= 1;
  if (isDown("KeyE")) strafe += 1;

  p.sneaking = isDown("ShiftLeft") || isDown("ShiftRight");
  p.sprinting = (isDown("ControlLeft") || isDown("ControlRight")) && p.stamina > 0 && !p.sneaking;

  let speed = MORGAN_SPEED + p.speedBonus;
  if (p.sneaking) speed = MORGAN_SNEAK_SPEED + p.speedBonus * 0.5;
  if (p.sprinting) speed = MORGAN_SPRINT_SPEED + p.speedBonus;
  // Phantom Walk upgrade: full speed while cloaked
  if (p.cloaked && p.upgrades.has(`${MorganSpell.SHADOW_CLOAK}_2`)) {
    speed = Math.max(speed, MORGAN_SPEED + p.speedBonus);
  }
  // Water slows movement
  if (getTile(state, p.pos.x, p.pos.z) === TileType.WATER) speed *= WATER_SPEED_MULT;

  const dx = Math.sin(p.angle) * moveInput + Math.sin(p.angle + Math.PI / 2) * strafe;
  const dz = Math.cos(p.angle) * moveInput + Math.cos(p.angle + Math.PI / 2) * strafe;
  const len = Math.sqrt(dx * dx + dz * dz);
  p.moving = len > 0.01;
  if (p.moving) {
    const nx = (dx / len) * speed * dt;
    const nz = (dz / len) * speed * dt;
    const newX = p.pos.x + nx;
    const newZ = p.pos.z + nz;
    if (canWalk(state, newX, p.pos.z)) p.pos.x = newX;
    if (canWalk(state, p.pos.x, newZ)) p.pos.z = newZ;
  }

  // Noise level
  if (p.moving) {
    if (p.sprinting) {
      p.noiseLevel = 1.0;
      emitSound(state, p.pos, SOUND_SPRINT_RADIUS);
    } else if (p.sneaking) {
      p.noiseLevel = 0.1;
    } else {
      p.noiseLevel = 0.4;
      emitSound(state, p.pos, SOUND_WALK_RADIUS);
    }
  } else {
    p.noiseLevel = 0;
  }

  // Stamina
  if (p.sprinting) {
    p.stamina = Math.max(0, p.stamina - SPRINT_DRAIN * dt);
  } else {
    p.stamina = Math.min(p.maxStamina, p.stamina + STAMINA_REGEN * dt);
  }

  // Mana regen (with stat bonus)
  p.mana = Math.min(p.maxMana, p.mana + (MANA_REGEN + p.manaRegenBonus) * dt);

  // Spell cooldowns
  for (const key of Object.keys(p.spellCooldowns)) {
    if (p.spellCooldowns[key] > 0) {
      p.spellCooldowns[key] -= dt;
      if (p.spellCooldowns[key] < 0) p.spellCooldowns[key] = 0;
    }
  }

  // Environmental hazards
  const currentTile = getTile(state, p.pos.x, p.pos.z);
  if (currentTile === TileType.WATER && p.moving) {
    emitSound(state, p.pos, WATER_NOISE_RADIUS);
  }
  if (currentTile === TileType.FIRE_GRATE) {
    p.hp -= FIRE_DAMAGE_PER_SEC * dt;
    if (Math.random() < dt * 3) {
      pushMessage(state, "Burning!", "#ff4400");
      state.screenFlash = { color: "rgba(255,80,0,0.2)", timer: 0.15 };
    }
    if (p.hp <= 0) {
      p.hp = 0; p.dead = true;
      state.phase = "game_over";
      pushMessage(state, "Morgan has fallen!");
    }
  }

  // Visibility
  p.visibility = calcVisibility(state);

  // Combo timer
  if (p.comboTimer > 0) {
    p.comboTimer -= dt;
    if (p.comboTimer <= 0) {
      p.comboCount = 0;
    }
  }

  // Shadow cloak timer
  if (p.cloaked) {
    p.cloakTimer -= dt;
    if (p.cloakTimer <= 0) {
      p.cloaked = false;
      pushMessage(state, "Shadow Cloak faded");
    }
  }

  // Backstab cooldown
  if (p.backstabCooldown > 0) p.backstabCooldown -= dt;

  // Dodge roll
  if (p.dodgeRollCooldown > 0) p.dodgeRollCooldown -= dt;
  if (p.dodgeRolling) {
    p.dodgeRollTimer -= dt;
    // Move in dodge direction at high speed
    const rollDx = p.dodgeRollDir.x * DODGE_ROLL_SPEED * dt;
    const rollDz = p.dodgeRollDir.z * DODGE_ROLL_SPEED * dt;
    if (canWalk(state, p.pos.x + rollDx, p.pos.z)) p.pos.x += rollDx;
    if (canWalk(state, p.pos.x, p.pos.z + rollDz)) p.pos.z += rollDz;
    if (p.dodgeRollTimer <= 0) {
      p.dodgeRolling = false;
    }
  }

  // Body hiding
  if (p.hidingBody) {
    p.hideBodyTimer -= dt;
    if (p.hideBodyTimer <= 0) {
      p.hidingBody = false;
      // Find and hide the nearest corpse
      let closestCorpse: typeof state.corpses[0] | null = null;
      let closestDist = BODY_HIDE_RANGE + 1;
      for (const c of state.corpses) {
        if (c.hidden) continue;
        const d = v2Dist(p.pos, c.pos);
        if (d < closestDist) { closestDist = d; closestCorpse = c; }
      }
      if (closestCorpse) {
        closestCorpse.hidden = true;
        pushMessage(state, "Body hidden", "#44aa66");
      }
    }
  }

  // Artifact bonus timers
  for (let i = p.artifactBonuses.length - 1; i >= 0; i--) {
    p.artifactBonuses[i].timer -= dt;
    if (p.artifactBonuses[i].timer <= 0) {
      pushMessage(state, `${p.artifactBonuses[i].type} bonus expired`);
      p.artifactBonuses.splice(i, 1);
    }
  }

  // Spell casting
  if (justPressed("Digit1")) p.selectedSpell = 0;
  if (justPressed("Digit2")) p.selectedSpell = 1;
  if (justPressed("Digit3")) p.selectedSpell = 2;
  if (justPressed("Digit4")) p.selectedSpell = 3;
  if (justPressed("Digit5")) p.selectedSpell = 4;

  if (justPressed("Space")) {
    castSpell(state);
  }

  // Backstab: F key
  if (justPressed("KeyF") && p.backstabCooldown <= 0) {
    tryBackstab(state);
  }

  // Interact: R key (open locked doors, pick up items)
  if (justPressed("KeyR")) {
    tryInteract(state);
  }

  // Extinguish torch: G key
  if (justPressed("KeyG")) {
    tryExtinguishTorch(state);
  }

  // Distraction throw: T key (free, no mana cost)
  if (justPressed("KeyT")) {
    tryDistraction(state);
  }

  // Dodge roll: C key
  if (justPressed("KeyC") && !p.dodgeRolling && p.dodgeRollCooldown <= 0 && p.stamina >= DODGE_ROLL_COST) {
    p.stamina -= DODGE_ROLL_COST;
    p.dodgeRolling = true;
    p.dodgeRollTimer = DODGE_ROLL_DURATION;
    p.dodgeRollCooldown = DODGE_ROLL_COOLDOWN;
    // Roll in movement direction, or forward if standing still
    if (p.moving) {
      let moveDir = 0;
      if (isDown("ArrowUp") || isDown("KeyW")) moveDir = 1;
      if (isDown("ArrowDown") || isDown("KeyS")) moveDir = -1;
      p.dodgeRollDir = { x: Math.sin(p.angle) * (moveDir || 1), z: Math.cos(p.angle) * (moveDir || 1) };
    } else {
      p.dodgeRollDir = { x: Math.sin(p.angle), z: Math.cos(p.angle) };
    }
    pushMessage(state, "Dodge!", "#66aaff");
  }

  // Hide body: H key
  if (justPressed("KeyH") && !p.hidingBody) {
    const nearbyCorpse = state.corpses.find(c => !c.hidden && v2Dist(p.pos, c.pos) < BODY_HIDE_RANGE);
    if (nearbyCorpse) {
      p.hidingBody = true;
      p.hideBodyTimer = BODY_HIDE_DURATION;
      pushMessage(state, "Hiding body...", "#668844");
    } else {
      pushMessage(state, "No body nearby to hide");
    }
  }

  // Push guard: V key (environmental kills)
  if (justPressed("KeyV")) {
    tryPushGuard(state);
  }

  // Tutorial hints (first level only)
  if (state.level === 1) {
    if (!state.tutorialShown.has("sneak") && state.time > 2 && state.time < 3) {
      pushMessage(state, "Tip: Hold Shift to sneak — reduces noise and detection", "#887799");
      state.tutorialShown.add("sneak");
    }
    if (!state.tutorialShown.has("shadow") && isInShadow(state, p.pos) && state.time > 5) {
      pushMessage(state, "Tip: Shadow zones reduce detection — stay in the dark", "#887799");
      state.tutorialShown.add("shadow");
    }
    if (!state.tutorialShown.has("backstab") && state.guards.some(g => g.hp > 0 && v2Dist(p.pos, g.pos) < 6)) {
      pushMessage(state, "Tip: Press F behind a guard for a backstab", "#887799");
      state.tutorialShown.add("backstab");
    }
    if (!state.tutorialShown.has("dodge") && state.time > 8 && state.time < 9) {
      pushMessage(state, "Tip: Press C to dodge roll — grants brief invulnerability", "#887799");
      state.tutorialShown.add("dodge");
    }
    if (!state.tutorialShown.has("push") && state.guards.some(g => g.hp > 0 && g.state === GuardState.STUNNED)) {
      pushMessage(state, "Tip: Press V to push stunned guards — into fire for instant kills!", "#887799");
      state.tutorialShown.add("push");
    }
    if (!state.tutorialShown.has("hide") && state.corpses.some(c => !c.hidden)) {
      pushMessage(state, "Tip: Press H near a body to hide it — prevents guard alerts", "#887799");
      state.tutorialShown.add("hide");
    }
  }

  // Collect pickups
  for (const pickup of state.pickups) {
    if (pickup.collected) continue;
    if (v2Dist(p.pos, pickup.pos) < 1.5) {
      pickup.collected = true;
      switch (pickup.type) {
        case PickupType.HEALTH_POTION:
          p.hp = Math.min(p.maxHp, p.hp + HEALTH_POTION_HEAL);
          pushMessage(state, `Health restored (+${HEALTH_POTION_HEAL})`, "#ff4444");
          state.screenFlash = { color: "rgba(255,50,50,0.15)", timer: 0.3 };
          break;
        case PickupType.MANA_POTION:
          p.mana = Math.min(MAX_MANA, p.mana + MANA_POTION_RESTORE);
          pushMessage(state, `Mana restored (+${MANA_POTION_RESTORE})`, "#6644ff");
          state.screenFlash = { color: "rgba(100,50,255,0.15)", timer: 0.3 };
          break;
        case PickupType.KEY:
          p.keys++;
          pushMessage(state, `Key found! (${p.keys})`, "#ffd700");
          state.screenFlash = { color: "rgba(255,215,0,0.15)", timer: 0.3 };
          break;
      }
    }
  }

  // Collect artifacts
  for (const art of state.artifacts) {
    if (!art.collected && v2Dist(p.pos, art.pos) < 1.5) {
      art.collected = true;
      p.artifacts++;
      p.score += ARTIFACT_SCORE;
      p.xp += 50;
      state.totalXP += 50;
      pushMessage(state, `Collected ${art.type}! (${p.artifacts}/${state.artifacts.length})`, "#ffd700");
      state.screenFlash = { color: "rgba(255,215,0,0.2)", timer: 0.4 };
      // Artifact type bonuses
      switch (art.type) {
        case "crystal":
          p.artifactBonuses.push({ type: "Mana Surge", timer: ARTIFACT_BONUS_DURATION });
          p.mana = Math.min(p.maxMana, p.mana + 30);
          pushMessage(state, "Crystal: Mana Surge! +30 mana", "#4466ff");
          break;
        case "chalice":
          p.artifactBonuses.push({ type: "Vitality", timer: ARTIFACT_BONUS_DURATION });
          p.hp = Math.min(p.maxHp, p.hp + 25);
          pushMessage(state, "Chalice: Vitality! +25 HP", "#44cc44");
          break;
        case "tome":
          p.artifactBonuses.push({ type: "Arcane Power", timer: ARTIFACT_BONUS_DURATION });
          pushMessage(state, "Tome: Arcane Power! Spells deal +25% damage", "#cc88ff");
          break;
        case "scroll":
          p.artifactBonuses.push({ type: "Shadow Walk", timer: ARTIFACT_BONUS_DURATION });
          pushMessage(state, "Scroll: Shadow Walk! Detection reduced", "#6644aa");
          break;
        case "amulet":
          p.artifactBonuses.push({ type: "Fortune", timer: ARTIFACT_BONUS_DURATION });
          p.gold += 100;
          pushMessage(state, "Amulet: Fortune! +100 gold", "#ffd700");
          break;
      }
      if (state.artifacts.every(a => a.collected)) {
        state.exitOpen = true;
        pushMessage(state, "All artifacts collected! Find the exit!", "#00ff88");
      }
    }
  }

  // Loot drops
  for (const loot of state.lootDrops) {
    if (loot.collected) continue;
    loot.timer -= dt;
    if (loot.timer <= 0) { loot.collected = true; continue; }
    if (v2Dist(p.pos, loot.pos) < 1.5) {
      loot.collected = true;
      switch (loot.type) {
        case "gold":
          p.gold += loot.value;
          p.score += loot.value;
          pushMessage(state, `+${loot.value} gold`, "#ffd700");
          break;
        case "health":
          p.hp = Math.min(p.maxHp, p.hp + loot.value);
          pushMessage(state, `+${loot.value} HP`, "#ff4444");
          break;
        case "mana":
          p.mana = Math.min(p.maxMana, p.mana + loot.value);
          pushMessage(state, `+${loot.value} mana`, "#6644ff");
          break;
      }
    }
  }

  // Traps
  for (const trap of state.traps) {
    if (trap.triggered) continue;
    if (v2Dist(p.pos, trap.pos) < 1.2) {
      // Sneaking reveals pressure plates before triggering
      if (trap.type === "pressure" && p.sneaking && !trap.visible) {
        trap.visible = true;
        pushMessage(state, "Pressure plate detected!", "#ffaa00");
        continue;
      }
      if (trap.type === "pressure" && p.sneaking && trap.visible) {
        continue; // can step over visible traps while sneaking
      }
      trap.triggered = true;
      state.levelStats.trapsTriggered++;
      if (trap.type === "pressure") {
        p.hp -= TRAP_DAMAGE;
        pushMessage(state, "Trap triggered! (-" + TRAP_DAMAGE + " HP)", "#ff4444");
        state.screenFlash = { color: "rgba(255,0,0,0.3)", timer: 0.5 };
        emitSound(state, trap.pos, SOUND_COMBAT_RADIUS);
      } else { // ward
        pushMessage(state, "Magical ward triggered! Guards alerted!", "#ff4444");
        state.screenFlash = { color: "rgba(255,100,0,0.3)", timer: 0.5 };
        emitSound(state, trap.pos, WARD_ALERT_RADIUS);
        // Alert nearby guards directly
        for (const guard of state.guards) {
          if (guard.hp <= 0) continue;
          if (v2Dist(guard.pos, trap.pos) < WARD_ALERT_RADIUS) {
            guard.state = GuardState.ALERT;
            guard.alertTimer = GUARD_ALERT_DURATION;
            guard.lastKnownPlayerPos = { ...p.pos };
            guard.detection = 1;
          }
        }
      }
      if (p.hp <= 0) {
        p.hp = 0;
        p.dead = true;
        state.phase = "game_over";
        pushMessage(state, "Morgan has fallen!");
      }
    }
  }

  // Check exit
  if (state.exitOpen && v2Dist(p.pos, state.exitPos) < 2) {
    p.score += LEVEL_COMPLETE_BONUS;
    state.levelStats.endTime = state.time;
    state.phase = "level_complete";
    const stats = state.levelStats;
    let bonusXP = 0;

    // Stealth rating
    if (stats.timesDetected === 0) {
      bonusXP += 300;
      pushMessage(state, "GHOST RATING! +300 XP", "#ffd700");
    } else if (stats.timesDetected <= 2) {
      bonusXP += 150;
      pushMessage(state, "SHADOW RATING! +150 XP", "#cc88ff");
    } else {
      bonusXP += 50;
    }

    // Pacifist bonus
    if (stats.guardsKilled === 0) {
      bonusXP += PACIFIST_XP;
      pushMessage(state, "PACIFIST! No guards killed +400 XP", "#44ffaa");
    }

    // Time bonus
    const elapsed = stats.endTime - stats.startTime;
    if (elapsed < TIME_BONUS_FAST) {
      bonusXP += TIME_FAST_XP;
      pushMessage(state, `SPEEDRUN! Under 1 min +${TIME_FAST_XP} XP`, "#ffaa00");
    } else if (elapsed < TIME_BONUS_MEDIUM) {
      bonusXP += TIME_MEDIUM_XP;
      pushMessage(state, `SWIFT! Under 2 min +${TIME_MEDIUM_XP} XP`, "#ccaa44");
    }

    // No environmental damage bonus
    if (stats.trapsTriggered === 0) {
      bonusXP += 100;
      pushMessage(state, "UNTOUCHED! No traps triggered +100 XP", "#44cccc");
    }

    p.xp += bonusXP;
    state.totalXP += bonusXP;
    pushMessage(state, "Level complete!");
  }
}

// --- Backstab ---
function tryBackstab(state: MorganGameState): void {
  const p = state.player;
  for (const guard of state.guards) {
    if (guard.hp <= 0) continue;
    const dist = v2Dist(p.pos, guard.pos);
    if (dist > BACKSTAB_RANGE) continue;

    // Sleeping/stunned guards: free execution (no angle check needed)
    const helpless = guard.state === GuardState.SLEEPING || guard.state === GuardState.STUNNED;

    if (!helpless) {
      // Normal backstab requires approaching from behind
      const angleToPlayer = Math.atan2(p.pos.x - guard.pos.x, p.pos.z - guard.pos.z);
      let angleDiff = angleToPlayer - guard.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(Math.abs(angleDiff) - Math.PI) >= BACKSTAB_ANGLE) continue;
    }

    {
      // Boss takes reduced backstab damage (can't be one-shot)
      const damage = guard.isBoss ? Math.min(BACKSTAB_DAMAGE, guard.maxHp * 0.15) : BACKSTAB_DAMAGE;
      guard.hp -= damage;
      p.backstabCooldown = 1.0;
      state.screenFlash = { color: "rgba(200,50,255,0.25)", timer: 0.3 };
      if (guard.hp <= 0) {
        // Combo system
        p.comboCount++;
        p.comboTimer = COMBO_WINDOW;
        const comboMul = 1 + (p.comboCount - 1) * COMBO_MULTIPLIER_PER_STACK;
        const baseScore = guard.isBoss ? 500 : 150;
        const baseXP = guard.isBoss ? 200 : 75;
        const finalScore = Math.round(baseScore * comboMul);
        const finalXP = Math.round(baseXP * comboMul);
        p.score += finalScore;
        p.xp += finalXP;
        state.totalXP += finalXP;
        p.guardsKilled++;
        state.levelStats.guardsKilled++;
        // Leave corpse + loot
        state.corpses.push({ pos: { ...guard.pos }, discovered: false, hidden: false, guardType: guard.guardType });
        spawnLoot(state, guard.pos);
        if (!state.detected) {
          p.ghostKills++;
          state.levelStats.ghostKills++;
        }
        const comboText = p.comboCount > 1 ? ` (x${p.comboCount} COMBO!)` : "";
        const killMsg = guard.isBoss ? "Boss assassinated!" : helpless ? "Execution!" : "Silent takedown!";
        pushMessage(state, killMsg + comboText, "#cc88ff");
      } else {
        pushMessage(state, guard.isBoss
          ? `Backstab! Mordred staggers (-${Math.round(damage)})`
          : `Backstab! (-${Math.round(damage)})`, "#cc88ff");
        guard.stunTimer = 2;
        guard.state = GuardState.STUNNED;
        if (guard.isBoss) {
          guardBark(guard, ["Coward! Face me!", "You dare?!", "A scratch!"]);
        }
      }
      return;
    }
  }
  pushMessage(state, "No target for backstab");
}

// --- Interact ---
function tryInteract(state: MorganGameState): void {
  const p = state.player;
  // Check for locked doors nearby
  const tx = Math.floor(p.pos.x / CELL_SIZE);
  const tz = Math.floor(p.pos.z / CELL_SIZE);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = tx + dx, nz = tz + dy;
      if (nx < 0 || nx >= FLOOR_W || nz < 0 || nz >= FLOOR_H) continue;
      if (state.tiles[nz][nx] === TileType.LOCKED_DOOR) {
        if (p.keys > 0) {
          p.keys--;
          state.tiles[nz][nx] = TileType.DOOR;
          pushMessage(state, "Door unlocked!", "#ffd700");
          return;
        } else {
          pushMessage(state, "Need a key!", "#ff4444");
          return;
        }
      }
    }
  }
}

// --- Torch extinguish ---
function tryExtinguishTorch(state: MorganGameState): void {
  const p = state.player;
  for (let i = 0; i < state.torchPositions.length; i++) {
    if (state.extinguishedTorches.has(i)) continue;
    if (v2Dist(p.pos, state.torchPositions[i]) < TORCH_EXTINGUISH_RANGE) {
      if (p.mana >= TORCH_EXTINGUISH_COST) {
        p.mana -= TORCH_EXTINGUISH_COST;
        state.extinguishedTorches.add(i);
        pushMessage(state, "Torch extinguished — darkness spreads", "#4466aa");
        return;
      } else {
        pushMessage(state, "Not enough mana to extinguish", "#ff4444");
        return;
      }
    }
  }
  pushMessage(state, "No torch nearby");
}

// --- Distraction throw (free, no mana) ---
function tryDistraction(state: MorganGameState): void {
  const p = state.player;
  const target = v2(
    p.pos.x + Math.sin(p.angle) * DISTRACTION_RANGE,
    p.pos.z + Math.cos(p.angle) * DISTRACTION_RANGE,
  );
  emitSound(state, target, DISTRACTION_SOUND_RADIUS);
  pushMessage(state, "Distraction thrown!", "#aaaacc");
}

// --- Push guard (environmental kill potential) ---
function tryPushGuard(state: MorganGameState): void {
  const p = state.player;
  for (const guard of state.guards) {
    if (guard.hp <= 0) continue;
    const dist = v2Dist(p.pos, guard.pos);
    if (dist > GUARD_PUSH_RANGE) continue;
    // Can only push stunned/sleeping guards, or from behind
    const helpless = guard.state === GuardState.SLEEPING || guard.state === GuardState.STUNNED;
    if (!helpless) {
      const angleToPlayer = Math.atan2(p.pos.x - guard.pos.x, p.pos.z - guard.pos.z);
      let angleDiff = angleToPlayer - guard.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(Math.abs(angleDiff) - Math.PI) >= BACKSTAB_ANGLE) continue;
    }
    // Push in player's facing direction
    const pushDir = v2(Math.sin(p.angle), Math.cos(p.angle));
    const newX = guard.pos.x + pushDir.x * GUARD_PUSH_FORCE;
    const newZ = guard.pos.z + pushDir.z * GUARD_PUSH_FORCE;
    // Check what they land on
    const landTile = getTile(state, newX, newZ);
    if (landTile === TileType.FIRE_GRATE) {
      // Environmental kill!
      guard.hp = 0;
      state.corpses.push({ pos: v2(newX, newZ), discovered: false, guardType: guard.guardType, hidden: false });
      spawnLoot(state, guard.pos);
      p.guardsKilled++;
      p.environmentalKills++;
      state.levelStats.guardsKilled++;
      p.comboCount++;
      p.comboTimer = COMBO_WINDOW;
      const comboMul = 1 + (p.comboCount - 1) * COMBO_MULTIPLIER_PER_STACK;
      p.score += Math.round(200 * comboMul);
      p.xp += Math.round(100 * comboMul);
      state.totalXP += Math.round(100 * comboMul);
      pushMessage(state, "Environmental Kill! Pushed into fire!", "#ff6600");
      state.screenFlash = { color: "rgba(255,100,0,0.3)", timer: 0.4 };
      emitSound(state, v2(newX, newZ), SOUND_COMBAT_RADIUS);
    } else if (landTile === TileType.WATER) {
      // Stun in water
      guard.pos = v2(newX, newZ);
      guard.stunTimer = ENV_KILL_WATER_STUN;
      guard.state = GuardState.STUNNED;
      pushMessage(state, "Guard pushed into water!", "#4466aa");
    } else if (canWalk(state, newX, newZ)) {
      // Normal push
      guard.pos = v2(newX, newZ);
      guard.stunTimer = 1.5;
      guard.state = GuardState.STUNNED;
      pushMessage(state, "Guard pushed!", "#aaaacc");
    } else {
      // Pushed into wall - extra stun
      guard.stunTimer = 2.5;
      guard.state = GuardState.STUNNED;
      guard.hp -= 30;
      pushMessage(state, "Guard slammed into wall!", "#ccaa44");
      if (guard.hp <= 0) {
        state.corpses.push({ pos: { ...guard.pos }, discovered: false, guardType: guard.guardType, hidden: false });
        spawnLoot(state, guard.pos);
        p.guardsKilled++;
        p.environmentalKills++;
        state.levelStats.guardsKilled++;
        pushMessage(state, "Killed by wall impact!", "#ff4444");
      }
    }
    return;
  }
  pushMessage(state, "No guard to push");
}

// --- Spell casting ---
function castSpell(state: MorganGameState): void {
  const p = state.player;
  const spell = p.spells[p.selectedSpell];
  const hasUpgrade = (tier: number) => p.upgrades.has(`${spell}_${tier}`);

  // Cooldown check
  if ((p.spellCooldowns[spell] || 0) > 0) {
    pushMessage(state, `On cooldown (${p.spellCooldowns[spell]!.toFixed(1)}s)`, "#888");
    return;
  }

  switch (spell) {
    case MorganSpell.SHADOW_CLOAK: {
      if (p.mana >= SHADOW_CLOAK_COST) {
        p.mana -= SHADOW_CLOAK_COST;
        p.spellCooldowns[spell] = SPELL_COOLDOWNS[spell];
        const dur = SHADOW_CLOAK_DURATION + (hasUpgrade(1) ? 3 : 0);
        p.cloaked = true;
        p.cloakTimer = dur;
        pushMessage(state, "Shadow Cloak activated", "#8844ff");
      } else {
        pushMessage(state, "Not enough mana", "#ff4444");
      }
      break;
    }

    case MorganSpell.DARK_BOLT: {
      if (p.mana >= DARK_BOLT_COST) {
        p.mana -= DARK_BOLT_COST;
        p.spellCooldowns[spell] = SPELL_COOLDOWNS[spell];
        const dmg = DARK_BOLT_DAMAGE * (hasUpgrade(1) ? 1.5 : 1) * (state.player.artifactBonuses.some(b => b.type === "Arcane Power") ? 1.25 : 1);
        const dir = v2(Math.sin(p.angle), Math.cos(p.angle));
        state.darkBolts.push({
          pos: { ...p.pos },
          dir,
          speed: 20,
          damage: dmg,
          timer: DARK_BOLT_RANGE / 20,
        });
        emitSound(state, p.pos, SOUND_SPELL_RADIUS);
        pushMessage(state, "Dark Bolt!", "#8844ff");
      } else {
        pushMessage(state, "Not enough mana", "#ff4444");
      }
      break;
    }

    case MorganSpell.SLEEP_MIST: {
      if (p.mana >= SLEEP_MIST_COST) {
        p.mana -= SLEEP_MIST_COST;
        p.spellCooldowns[spell] = SPELL_COOLDOWNS[spell];
        const dur = SLEEP_MIST_DURATION + (hasUpgrade(1) ? 5 : 0);
        const rad = SLEEP_MIST_RADIUS * (hasUpgrade(2) ? 1.5 : 1);
        const target = v2(
          p.pos.x + Math.sin(p.angle) * 5,
          p.pos.z + Math.cos(p.angle) * 5,
        );
        state.mistZones.push({ pos: target, radius: rad, timer: dur });
        emitSound(state, target, SOUND_SPELL_RADIUS * 0.5);
        pushMessage(state, "Sleep Mist deployed", "#4466aa");
      } else {
        pushMessage(state, "Not enough mana", "#ff4444");
      }
      break;
    }

    case MorganSpell.BLINK: {
      if (p.mana >= BLINK_COST) {
        const range = BLINK_RANGE + (hasUpgrade(1) ? 4 : 0);
        const phaseStrike = hasUpgrade(2);
        const throughWalls = false; // Phase Strike no longer goes through walls
        const target = v2(
          p.pos.x + Math.sin(p.angle) * range,
          p.pos.z + Math.cos(p.angle) * range,
        );
        if (canWalkOrBlink(state, target.x, target.z, throughWalls)) {
          p.mana -= BLINK_COST;
          p.spellCooldowns[spell] = SPELL_COOLDOWNS[spell];
          p.pos = target;
          // Phase Strike: stun guards you blink through
          if (phaseStrike) {
            for (const guard of state.guards) {
              if (guard.hp <= 0) continue;
              // Check if guard is between old position and new position
              const guardDist = v2Dist(guard.pos, target);
              if (guardDist < 2.5) {
                guard.stunTimer = 2.0;
                guard.state = GuardState.STUNNED;
                pushMessage(state, "Phase Strike stun!", "#aa66ff");
              }
            }
          }
          state.screenFlash = { color: "rgba(100,50,200,0.2)", timer: 0.2 };
          pushMessage(state, "Blink!", "#8844ff");
        } else {
          pushMessage(state, "Cannot blink there", "#ff4444");
        }
      } else {
        pushMessage(state, "Not enough mana", "#ff4444");
      }
      break;
    }

    case MorganSpell.DECOY: {
      if (p.mana >= DECOY_COST) {
        p.mana -= DECOY_COST;
        p.spellCooldowns[spell] = SPELL_COOLDOWNS[spell];
        const dur = DECOY_DURATION + (hasUpgrade(1) ? 5 : 0);
        const target = v2(
          p.pos.x + Math.sin(p.angle) * 6,
          p.pos.z + Math.cos(p.angle) * 6,
        );
        state.decoys.push({
          pos: target,
          timer: dur,
          explodes: hasUpgrade(2),
        });
        pushMessage(state, "Shadow Decoy placed", "#aa66ff");
      } else {
        pushMessage(state, "Not enough mana", "#ff4444");
      }
      break;
    }
  }
}

// --- Guard AI ---
export function tickGuards(state: MorganGameState, dt: number): void {
  for (const guard of state.guards) {
    if (guard.hp <= 0) continue;

    // Tick timers
    if (guard.sleepTimer > 0) {
      guard.sleepTimer -= dt;
      guard.state = GuardState.SLEEPING;
      if (guard.sleepTimer <= 0) {
        guard.state = GuardState.PATROL;
        guard.detection = 0;
      }
      continue;
    }
    if (guard.stunTimer > 0) {
      guard.stunTimer -= dt;
      guard.state = GuardState.STUNNED;
      if (guard.stunTimer <= 0) {
        guard.state = GuardState.ALERT;
        guard.alertTimer = GUARD_ALERT_DURATION;
      }
      continue;
    }

    // Mage fire cooldown
    if (guard.mageFireCooldown > 0) guard.mageFireCooldown -= dt;

    // Check mist zones
    for (const mist of state.mistZones) {
      if (v2Dist(guard.pos, mist.pos) < mist.radius) {
        guard.sleepTimer = mist.timer;
        guard.state = GuardState.SLEEPING;
        break;
      }
    }
    if (guard.state === GuardState.SLEEPING) continue;

    // Sound-based detection: check sound events
    for (const sound of state.soundEvents) {
      if (v2Dist(guard.pos, sound.pos) < sound.radius) {
        if (guard.state === GuardState.PATROL) {
          guard.state = GuardState.INVESTIGATING;
          guard.investigateTarget = { ...sound.pos };
          guard.alertTimer = 6;
          guardBark(guard, GUARD_BARKS.hearNoise);
        } else if (guard.state === GuardState.INVESTIGATING) {
          guard.investigateTarget = { ...sound.pos };
        }
      }
    }

    // Decoy attraction: guards chase decoys
    let chasingDecoy = false;
    for (const decoy of state.decoys) {
      if (decoy.timer <= 0) continue;
      const distToDecoy = v2Dist(guard.pos, decoy.pos);
      if (distToDecoy < 12 && hasLineOfSight(state, guard.pos, decoy.pos)) {
        guard.lastKnownPlayerPos = { ...decoy.pos };
        if (guard.state === GuardState.PATROL || guard.state === GuardState.INVESTIGATING) {
          guard.state = GuardState.ALERT;
          guard.alertTimer = GUARD_ALERT_DURATION;
        }
        chasingDecoy = true;
        break;
      }
    }

    // Visual detection
    const distToPlayer = v2Dist(guard.pos, state.player.pos);
    const guardViewRange = guard.state === GuardState.ALERT ? GUARD_ALERT_VIEW_RANGE : GUARD_VIEW_RANGE;
    const angleToPlayer = Math.atan2(
      state.player.pos.x - guard.pos.x,
      state.player.pos.z - guard.pos.z,
    );
    let angleDiff = angleToPlayer - guard.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const inViewCone = Math.abs(angleDiff) < GUARD_VIEW_ANGLE;
    const inRange = distToPlayer < guardViewRange;
    const los = hasLineOfSight(state, guard.pos, state.player.pos);
    const playerVisible = inViewCone && inRange && los && !state.player.cloaked && !state.player.dead;

    let detectionMul = state.player.stealthBonus; // base from stat upgrades
    if (state.player.sneaking) detectionMul *= 0.4;
    if (state.player.artifactBonuses.some(b => b.type === "Shadow Walk")) detectionMul *= 0.6;
    if (isInShadow(state, state.player.pos)) detectionMul *= SHADOW_ZONE_STEALTH_BONUS;
    if (guard.guardType === GuardType.HOUND) detectionMul *= HOUND_DETECTION_MUL;
    // Hounds also detect by proximity (no LOS needed)
    const houndSmell = guard.guardType === GuardType.HOUND && distToPlayer < 5 && !state.player.cloaked;

    if (playerVisible || houndSmell) {
      guard.detection = Math.min(1, guard.detection + DETECTION_RATE_VISIBLE * detectionMul * dt);
      guard.detectionLinger = DETECTION_LINGER;
      if (!chasingDecoy) guard.lastKnownPlayerPos = { ...state.player.pos };
    } else {
      // Detection lingers briefly before decaying (can't instantly reset by breaking LOS)
      if (guard.detectionLinger > 0) {
        guard.detectionLinger -= dt;
      } else {
        guard.detection = Math.max(0, guard.detection - DETECTION_DECAY * dt);
      }
    }

    // Corpse discovery
    for (const corpse of state.corpses) {
      if (corpse.discovered || corpse.hidden) continue;
      if (v2Dist(guard.pos, corpse.pos) < 3 && hasLineOfSight(state, guard.pos, corpse.pos)) {
        corpse.discovered = true;
        guard.state = GuardState.ALERT;
        guard.alertTimer = BODY_DISCOVERY_ALERT_DURATION;
        guard.lastKnownPlayerPos = { ...corpse.pos };
        guard.detection = 1;
        guardBark(guard, GUARD_BARKS.findCorpse);
        emitSound(state, guard.pos, GUARD_CALL_RADIUS);
        // Alert nearby guards
        for (const ally of state.guards) {
          if (ally === guard || ally.hp <= 0) continue;
          if (v2Dist(ally.pos, guard.pos) < GUARD_CALL_RADIUS) {
            ally.state = GuardState.ALERT;
            ally.alertTimer = BODY_DISCOVERY_ALERT_DURATION;
            ally.lastKnownPlayerPos = { ...corpse.pos };
            ally.detection = 0.8;
          }
        }
      }
    }

    // State transitions
    if (guard.detection >= DETECTION_THRESHOLD && !chasingDecoy) {
      if (guard.state !== GuardState.ALERT) {
        state.player.timesDetected++;
        state.levelStats.timesDetected++;
        if (guard.guardType === GuardType.HOUND) {
          guardBark(guard, GUARD_BARKS.houndAlert);
        } else {
          guardBark(guard, GUARD_BARKS.spotPlayer);
        }
        // Guard communication: call nearby allies
        for (const ally of state.guards) {
          if (ally === guard || ally.hp <= 0) continue;
          if (v2Dist(ally.pos, guard.pos) < GUARD_CALL_RADIUS) {
            if (ally.state === GuardState.PATROL || ally.state === GuardState.INVESTIGATING) {
              ally.state = GuardState.ALERT;
              ally.alertTimer = GUARD_ALERT_DURATION * 0.7;
              ally.lastKnownPlayerPos = { ...state.player.pos };
              ally.detection = 0.6;
            }
          }
        }
      }
      guard.state = GuardState.ALERT;
      guard.alertTimer = GUARD_ALERT_DURATION;
      state.detected = true;
    }

    // Player stealth bonus reduces detection rate
    if (state.player.stealthBonus < 1.0) {
      guard.detection *= (1 - (1 - state.player.stealthBonus) * dt);
    }

    // Bark timers
    if (guard.barkTimer > 0) {
      guard.barkTimer -= dt;
      if (guard.barkTimer <= 0) guard.bark = null;
    }

    // Movement behavior
    const guardSpeed = getGuardSpeed(guard);
    switch (guard.state) {
      case GuardState.PATROL:
        tickGuardPatrol(state, guard, guardSpeed, dt);
        break;
      case GuardState.ALERT:
        tickGuardAlert(state, guard, guardSpeed * 1.3, dt);
        break;
      case GuardState.SEARCHING:
        tickGuardSearching(state, guard, guardSpeed * 0.8, dt);
        break;
      case GuardState.INVESTIGATING:
        tickGuardInvestigating(state, guard, guardSpeed, dt);
        break;
    }

    // Alert timer
    if (guard.state === GuardState.ALERT) {
      guard.alertTimer -= dt;
      if (guard.alertTimer <= 0 && !playerVisible) {
        guard.state = GuardState.SEARCHING;
        guard.alertTimer = GUARD_ALERT_DURATION * 0.5;
        guardBark(guard, GUARD_BARKS.lostPlayer);
      }
    }
    if (guard.state === GuardState.SEARCHING) {
      guard.alertTimer -= dt;
      if (guard.alertTimer <= 0) {
        guard.state = GuardState.PATROL;
        guard.detection = 0;
        guardBark(guard, GUARD_BARKS.returnToPatrol);
      }
    }

    // Melee attack
    const diffMult = DIFFICULTY_MULTS[state.difficulty];
    const meleeDamage = (guard.guardType === GuardType.HEAVY ? HEAVY_GUARD_DAMAGE : 15) * diffMult.guardDmg;
    if (guard.state === GuardState.ALERT && distToPlayer < 2.0 && !state.player.dead && !chasingDecoy && !state.player.dodgeRolling) {
      state.player.hp -= meleeDamage * dt;
      if (state.player.hp <= 0) {
        state.player.hp = 0;
        state.player.dead = true;
        state.phase = "game_over";
        pushMessage(state, "Morgan has fallen!");
      }
    }

    // Track mage casting state
    if (guard.guardType === GuardType.MAGE) {
      guard.isCasting = guard.mageFireCooldown > 0 && guard.mageFireCooldown < 0.5;
    }

    // Mage ranged attack
    if (guard.guardType === GuardType.MAGE && guard.state === GuardState.ALERT
        && playerVisible && distToPlayer < MAGE_GUARD_RANGE && guard.mageFireCooldown <= 0 && !chasingDecoy) {
      const dir = v2(
        (state.player.pos.x - guard.pos.x) / distToPlayer,
        (state.player.pos.z - guard.pos.z) / distToPlayer,
      );
      state.fireballs.push({
        pos: { ...guard.pos },
        dir,
        speed: 12,
        damage: 20,
        timer: 2,
      });
      guard.mageFireCooldown = MAGE_GUARD_COOLDOWN;
      emitSound(state, guard.pos, SOUND_SPELL_RADIUS);
    }
  }
}

function getGuardSpeed(guard: Guard): number {
  let speed: number;
  switch (guard.guardType) {
    case GuardType.HEAVY: speed = HEAVY_GUARD_SPEED; break;
    case GuardType.HOUND: speed = HOUND_SPEED; break;
    default: speed = GUARD_SPEED;
  }
  // Boss phase 3 rage speed boost
  if (guard.isBoss && guard.bossPhase >= 3) speed *= 1.5;
  return speed;
}

function tickGuardPatrol(state: MorganGameState, guard: Guard, speed: number, dt: number): void {
  if (guard.patrolPath.length === 0) return;
  // Wait at waypoints briefly
  if (guard.waitTimer > 0) {
    guard.waitTimer -= dt;
    return;
  }
  const target = guard.patrolPath[guard.patrolIndex];
  const dist = v2Dist(guard.pos, target);
  if (dist < 0.5) {
    guard.waitTimer = 1.0 + Math.random() * 2.0; // pause 1-3 seconds
    if (guard.patrolForward) {
      guard.patrolIndex++;
      if (guard.patrolIndex >= guard.patrolPath.length) {
        guard.patrolIndex = guard.patrolPath.length - 1;
        guard.patrolForward = false;
      }
    } else {
      guard.patrolIndex--;
      if (guard.patrolIndex < 0) {
        guard.patrolIndex = 0;
        guard.patrolForward = true;
      }
    }
  } else {
    moveToward(state, guard, target, speed, dt);
  }
}

function tickGuardAlert(state: MorganGameState, guard: Guard, speed: number, dt: number): void {
  if (guard.lastKnownPlayerPos) {
    // Try flanking if allies are also alert
    const flankTarget = applyFlankingOffset(state, guard);
    const target = flankTarget || guard.lastKnownPlayerPos;
    moveToward(state, guard, target, speed, dt);
  }
}

function tickGuardSearching(state: MorganGameState, guard: Guard, speed: number, dt: number): void {
  if (guard.lastKnownPlayerPos) {
    const wanderTarget = v2(
      guard.lastKnownPlayerPos.x + Math.sin(state.time * 2 + guard.id) * 4,
      guard.lastKnownPlayerPos.z + Math.cos(state.time * 2 + guard.id) * 4,
    );
    moveToward(state, guard, wanderTarget, speed, dt);
    // Occasional searching bark
    if (Math.random() < dt * 0.3 && !guard.bark) {
      guardBark(guard, GUARD_BARKS.searching);
    }
  }
}

function tickGuardInvestigating(state: MorganGameState, guard: Guard, speed: number, dt: number): void {
  if (guard.investigateTarget) {
    const dist = v2Dist(guard.pos, guard.investigateTarget);
    if (dist < 1.5) {
      // Arrived, look around briefly then return
      guard.alertTimer -= dt;
      if (guard.alertTimer <= 0) {
        guard.state = GuardState.PATROL;
        guard.investigateTarget = null;
        guard.detection = 0;
      }
    } else {
      moveToward(state, guard, guard.investigateTarget, speed, dt);
    }
  } else {
    guard.state = GuardState.PATROL;
  }
}

function moveToward(state: MorganGameState, guard: Guard, target: Vec2, speed: number, dt: number): void {
  const dx = target.x - guard.pos.x;
  const dz = target.z - guard.pos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.1) return;
  const nx = (dx / dist) * speed * dt;
  const nz = (dz / dist) * speed * dt;
  const newX = guard.pos.x + nx;
  const newZ = guard.pos.z + nz;
  if (canWalk(state, newX, guard.pos.z)) guard.pos.x = newX;
  if (canWalk(state, guard.pos.x, newZ)) guard.pos.z = newZ;
  guard.angle = Math.atan2(dx, dz);
}

// --- Projectiles ---
export function tickProjectiles(state: MorganGameState, dt: number): void {
  // Dark bolts
  const chainLightning = state.player.upgrades.has(`${MorganSpell.DARK_BOLT}_2`);
  for (let i = state.darkBolts.length - 1; i >= 0; i--) {
    const bolt = state.darkBolts[i];
    bolt.pos.x += bolt.dir.x * bolt.speed * dt;
    bolt.pos.z += bolt.dir.z * bolt.speed * dt;
    bolt.timer -= dt;

    if (!canWalk(state, bolt.pos.x, bolt.pos.z) || bolt.timer <= 0) {
      state.darkBolts.splice(i, 1);
      continue;
    }

    let hit = false;
    for (const guard of state.guards) {
      if (guard.hp <= 0) continue;
      if (v2Dist(bolt.pos, guard.pos) < 1.2) {
        guard.hp -= bolt.damage;
        guard.stunTimer = 1.5;
        guard.state = GuardState.STUNNED;
        // Interrupt mage casting
        if (guard.guardType === GuardType.MAGE && guard.isCasting) {
          guard.stunTimer = SPELL_INTERRUPT_STUN;
          guard.isCasting = false;
          pushMessage(state, "Spell interrupted!", "#8844ff");
        }
        emitSound(state, bolt.pos, SOUND_COMBAT_RADIUS);
        if (guard.hp <= 0) {
          state.player.comboCount++;
          state.player.comboTimer = COMBO_WINDOW;
          const comboMul = 1 + (state.player.comboCount - 1) * COMBO_MULTIPLIER_PER_STACK;
          const score = Math.round((guard.isBoss ? 500 : 100) * comboMul);
          const xp = Math.round((guard.isBoss ? 150 : 50) * comboMul);
          const comboText = state.player.comboCount > 1 ? ` (x${state.player.comboCount})` : "";
          pushMessage(state, (guard.isBoss ? "Boss defeated!" : "Guard eliminated") + comboText, "#ff4444");
          state.player.score += score;
          state.player.xp += xp;
          state.totalXP += xp;
          state.player.guardsKilled++;
          state.levelStats.guardsKilled++;
          state.corpses.push({ pos: { ...guard.pos }, discovered: false, hidden: false, guardType: guard.guardType });
          spawnLoot(state, guard.pos);
        }
        // Chain lightning: hit up to 2 nearby guards
        if (chainLightning) {
          let chainCount = 0;
          for (const g2 of state.guards) {
            if (g2 === guard || g2.hp <= 0 || chainCount >= 2) continue;
            if (v2Dist(g2.pos, guard.pos) < 5) {
              g2.hp -= bolt.damage * 0.5;
              g2.stunTimer = 1.0;
              g2.state = GuardState.STUNNED;
              chainCount++;
              if (g2.hp <= 0) {
                pushMessage(state, "Chain kill!", "#8844ff");
                state.player.score += 100;
                state.player.xp += 50;
                state.totalXP += 50;
                state.player.guardsKilled++;
                state.levelStats.guardsKilled++;
                state.corpses.push({ pos: { ...g2.pos }, discovered: false, hidden: false, guardType: g2.guardType });
                spawnLoot(state, g2.pos);
              }
            }
          }
        }
        hit = true;
        break;
      }
    }
    if (hit) state.darkBolts.splice(i, 1);
  }

  // Fireballs (from mage guards)
  for (let i = state.fireballs.length - 1; i >= 0; i--) {
    const fb = state.fireballs[i];
    fb.pos.x += fb.dir.x * fb.speed * dt;
    fb.pos.z += fb.dir.z * fb.speed * dt;
    fb.timer -= dt;

    if (!canWalk(state, fb.pos.x, fb.pos.z) || fb.timer <= 0) {
      state.fireballs.splice(i, 1);
      continue;
    }

    if (v2Dist(fb.pos, state.player.pos) < 1.0 && !state.player.dead && !state.player.dodgeRolling) {
      state.player.hp -= fb.damage;
      state.screenFlash = { color: "rgba(255,100,0,0.3)", timer: 0.3 };
      pushMessage(state, `Hit by fireball! (-${fb.damage})`, "#ff6600");
      state.fireballs.splice(i, 1);
      if (state.player.hp <= 0) {
        state.player.hp = 0;
        state.player.dead = true;
        state.phase = "game_over";
        pushMessage(state, "Morgan has fallen!");
      }
    }
  }

  // Mist zones
  for (let i = state.mistZones.length - 1; i >= 0; i--) {
    state.mistZones[i].timer -= dt;
    if (state.mistZones[i].timer <= 0) {
      state.mistZones.splice(i, 1);
    }
  }

  // Decoys
  for (let i = state.decoys.length - 1; i >= 0; i--) {
    state.decoys[i].timer -= dt;
    // Decoys periodically emit sound to attract guards
    if (Math.random() < dt * 2) {
      emitSound(state, state.decoys[i].pos, 10);
    }
    if (state.decoys[i].timer <= 0) {
      const decoy = state.decoys[i];
      if (decoy.explodes) {
        // Stun nearby guards
        for (const guard of state.guards) {
          if (guard.hp <= 0) continue;
          if (v2Dist(guard.pos, decoy.pos) < 4) {
            guard.stunTimer = 3;
            guard.state = GuardState.STUNNED;
          }
        }
        pushMessage(state, "Decoy exploded!", "#aa66ff");
        emitSound(state, decoy.pos, SOUND_COMBAT_RADIUS);
      }
      state.decoys.splice(i, 1);
    }
  }

  // Sound events decay
  for (let i = state.soundEvents.length - 1; i >= 0; i--) {
    state.soundEvents[i].timer -= dt;
    if (state.soundEvents[i].timer <= 0) {
      state.soundEvents.splice(i, 1);
    }
  }
}

// --- Boss AI ---
export function tickBoss(state: MorganGameState, dt: number): void {
  for (const guard of state.guards) {
    if (!guard.isBoss || guard.hp <= 0) continue;

    // Phase transitions
    const hpRatio = guard.hp / guard.maxHp;
    const prevPhase = guard.bossPhase;
    if (hpRatio <= BOSS_PHASE_3_HP) guard.bossPhase = 3;
    else if (hpRatio <= BOSS_PHASE_2_HP) guard.bossPhase = 2;
    else guard.bossPhase = 1;

    if (guard.bossPhase !== prevPhase) {
      switch (guard.bossPhase) {
        case 2:
          pushMessage(state, "Mordred: \"You think you can defeat ME?!\"", "#ff4444");
          state.screenFlash = { color: "rgba(255,0,0,0.3)", timer: 0.6 };
          // Summon reinforcements
          for (let i = 0; i < BOSS_SUMMON_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 4 + Math.random() * 3;
            const pos = v2(guard.pos.x + Math.cos(angle) * dist, guard.pos.z + Math.sin(angle) * dist);
            if (canWalk(state, pos.x, pos.z)) {
              const summon = {
                id: Date.now() + i,
                pos, angle: 0, hp: 60, maxHp: 60,
                state: GuardState.ALERT, guardType: GuardType.NORMAL,
                alertTimer: 30, sleepTimer: 0, stunTimer: 0,
                patrolPath: [pos], patrolIndex: 0, patrolForward: true,
                detection: 1, lastKnownPlayerPos: { ...state.player.pos },
                isBoss: false, investigateTarget: null, mageFireCooldown: 0,
                waitTimer: 0, bark: "For Mordred!", barkTimer: 2,
                bossPhase: 0, bossShockwaveCooldown: 0, bossTeleportCooldown: 0,
                detectionLinger: 0, isCasting: false,
              } satisfies Guard;
              state.guards.push(summon);
            }
          }
          // Create fire zones around the arena
          const bossRoom = { x: Math.floor(guard.pos.x / CELL_SIZE), z: Math.floor(guard.pos.z / CELL_SIZE) };
          for (let fz = 0; fz < 4; fz++) {
            const fx = bossRoom.x + Math.floor(Math.random() * 5) - 2;
            const fzz = bossRoom.z + Math.floor(Math.random() * 5) - 2;
            if (fx >= 0 && fx < FLOOR_W && fzz >= 0 && fzz < FLOOR_H && state.tiles[fzz][fx] === TileType.FLOOR) {
              state.tiles[fzz][fx] = TileType.FIRE_GRATE;
            }
          }
          pushMessage(state, "The floor erupts in flame!", "#ff4400");
          emitSound(state, guard.pos, 20);
          break;
        case 3:
          pushMessage(state, "Mordred: \"ENOUGH! Feel my wrath!\"", "#ff0000");
          state.screenFlash = { color: "rgba(255,0,0,0.5)", timer: 0.8 };
          // Rage: speed boost (handled via bossPhase check in getGuardSpeed)
          // Summon more reinforcements in phase 3
          for (let i = 0; i < BOSS_SUMMON_COUNT + 1; i++) {
            const angle2 = Math.random() * Math.PI * 2;
            const dist2 = 5 + Math.random() * 4;
            const pos2 = v2(guard.pos.x + Math.cos(angle2) * dist2, guard.pos.z + Math.sin(angle2) * dist2);
            if (canWalk(state, pos2.x, pos2.z)) {
              const mageGuard = {
                id: Date.now() + 100 + i,
                pos: pos2, angle: 0, hp: 60, maxHp: 60,
                state: GuardState.ALERT, guardType: GuardType.MAGE,
                alertTimer: 30, sleepTimer: 0, stunTimer: 0,
                patrolPath: [pos2], patrolIndex: 0, patrolForward: true,
                detection: 1, lastKnownPlayerPos: { ...state.player.pos },
                isBoss: false, investigateTarget: null, mageFireCooldown: 1,
                waitTimer: 0, bark: "The master calls!", barkTimer: 2,
                bossPhase: 0, bossShockwaveCooldown: 0, bossTeleportCooldown: 0,
                detectionLinger: 0, isCasting: false,
              } satisfies Guard;
              state.guards.push(mageGuard);
            }
          }
          pushMessage(state, "Mordred summons his dark mages!", "#ff2222");
          break;
      }
    }

    // Boss abilities (only when alert or fighting)
    if (guard.state !== GuardState.ALERT) continue;
    const distToPlayer = v2Dist(guard.pos, state.player.pos);

    // Tick cooldowns
    if (guard.bossShockwaveCooldown > 0) guard.bossShockwaveCooldown -= dt;
    if (guard.bossTeleportCooldown > 0) guard.bossTeleportCooldown -= dt;

    // Shockwave: AoE damage when player is close
    if (distToPlayer < BOSS_SHOCKWAVE_RADIUS && guard.bossShockwaveCooldown <= 0) {
      guard.bossShockwaveCooldown = BOSS_SHOCKWAVE_COOLDOWN / (guard.bossPhase >= 3 ? 2 : 1);
      state.player.hp -= BOSS_SHOCKWAVE_DAMAGE;
      emitSound(state, guard.pos, 15);
      state.screenFlash = { color: "rgba(200,0,50,0.35)", timer: 0.4 };
      pushMessage(state, "Shockwave! (-" + BOSS_SHOCKWAVE_DAMAGE + ")", "#ff2222");
      // Knockback player
      const dx = state.player.pos.x - guard.pos.x;
      const dz = state.player.pos.z - guard.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      const knockX = state.player.pos.x + (dx / dist) * 3;
      const knockZ = state.player.pos.z + (dz / dist) * 3;
      if (canWalk(state, knockX, state.player.pos.z)) state.player.pos.x = knockX;
      if (canWalk(state, state.player.pos.x, knockZ)) state.player.pos.z = knockZ;
      if (state.player.hp <= 0) {
        state.player.hp = 0; state.player.dead = true;
        state.phase = "game_over";
        pushMessage(state, "Morgan has fallen!");
      }
    }

    // Teleport: boss blinks to a random position when hurt
    if (guard.bossPhase >= 2 && guard.bossTeleportCooldown <= 0 && distToPlayer < 4) {
      guard.bossTeleportCooldown = BOSS_TELEPORT_COOLDOWN / (guard.bossPhase >= 3 ? 1.5 : 1);
      const angle = Math.random() * Math.PI * 2;
      const tDist = 6 + Math.random() * 4;
      const newPos = v2(guard.pos.x + Math.cos(angle) * tDist, guard.pos.z + Math.sin(angle) * tDist);
      if (canWalk(state, newPos.x, newPos.z)) {
        guard.pos = newPos;
        emitSound(state, guard.pos, 8);
        guardBark(guard, ["You cannot touch me!", "Too slow!", "Over here, witch!"]);
      }
    }

    // Dark barrage: spray fireballs in a fan (phase 2+)
    if (guard.bossPhase >= 2 && guard.mageFireCooldown <= 0 && distToPlayer < 14) {
      guard.mageFireCooldown = 4 / (guard.bossPhase >= 3 ? 1.5 : 1);
      const baseAngle = Math.atan2(state.player.pos.x - guard.pos.x, state.player.pos.z - guard.pos.z);
      const count = guard.bossPhase >= 3 ? BOSS_DARK_BARRAGE_COUNT + 2 : BOSS_DARK_BARRAGE_COUNT;
      const spread = 0.6;
      for (let i = 0; i < count; i++) {
        const a = baseAngle + (i - (count - 1) / 2) * (spread / count);
        state.fireballs.push({
          pos: { ...guard.pos },
          dir: v2(Math.sin(a), Math.cos(a)),
          speed: 10,
          damage: 15,
          timer: 2.5,
        });
      }
      emitSound(state, guard.pos, 12);
    }
  }
}

// --- Guard flanking behavior ---
function applyFlankingOffset(state: MorganGameState, guard: Guard): Vec2 | null {
  if (!guard.lastKnownPlayerPos) return null;
  // Count how many other alert guards are nearby
  const alertAllies = state.guards.filter(g =>
    g !== guard && g.hp > 0 && g.state === GuardState.ALERT &&
    v2Dist(g.pos, guard.pos) < 15);
  if (alertAllies.length === 0) return null;
  // Offset this guard's approach angle based on its index among allies
  const myIndex = alertAllies.filter(g => g.id < guard.id).length;
  const totalGuards = alertAllies.length + 1;
  const flankAngle = (myIndex / totalGuards) * Math.PI * 2;
  const flankDist = 3;
  return v2(
    guard.lastKnownPlayerPos.x + Math.cos(flankAngle) * flankDist,
    guard.lastKnownPlayerPos.z + Math.sin(flankAngle) * flankDist,
  );
}

// --- Guard bark helper ---
function guardBark(guard: Guard, lines: string[]): void {
  guard.bark = lines[Math.floor(Math.random() * lines.length)];
  guard.barkTimer = 2.5;
}

// --- Alert level ---
export function tickAlertLevel(state: MorganGameState, _dt: number): void {
  const anyAlert = state.guards.some(g => g.state === GuardState.ALERT && g.hp > 0);
  const anySearching = state.guards.some(g => (g.state === GuardState.SEARCHING || g.state === GuardState.INVESTIGATING) && g.hp > 0);
  if (anyAlert) {
    state.alertLevel = 2;
  } else if (anySearching) {
    state.alertLevel = 1;
  } else {
    state.alertLevel = 0;
    state.detected = false;
  }
}

// --- Screen flash ---
export function tickScreenFlash(state: MorganGameState, dt: number): void {
  if (state.screenFlash) {
    state.screenFlash.timer -= dt;
    if (state.screenFlash.timer <= 0) {
      state.screenFlash = null;
    }
  }
}

// --- Messages ---
export function tickMessages(state: MorganGameState, dt: number): void {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    state.messages[i].timer -= dt;
    if (state.messages[i].timer <= 0) {
      state.messages.splice(i, 1);
    }
  }
}
