// ---------------------------------------------------------------------------
// Eagle Flight mode orchestrator
// Merlin rides a majestic eagle soaring over the medieval city of Camelot.
// Pure flight simulator — explore the castle, city, and countryside.
// Uses Three.js for 3D rendering with an HTML HUD overlay.
// ---------------------------------------------------------------------------

import { audioManager } from "@audio/AudioManager";
import { createEagleFlightState, EFBalance, LANDMARKS, getTerrainHeight } from "./state/EagleFlightState";
import type { EagleFlightState, WeatherType } from "./state/EagleFlightState";
import { EagleFlightInputSystem } from "./systems/EagleFlightInputSystem";
import { EagleFlightRenderer } from "./view/EagleFlightRenderer";
import { EagleFlightHUD } from "./view/EagleFlightHUD";

const DT = EFBalance.SIM_TICK_MS / 1000;

// Thermal locations (near castle, hills, and warm areas)
const THERMALS = [
  { x: 0, z: 30, radius: 20, strength: 6 },    // Castle courtyard
  { x: 140, z: -60, radius: 15, strength: 4 },  // Windmill hill
  { x: -120, z: 90, radius: 15, strength: 4 },  // Windmill 2
  { x: -45, z: 5, radius: 10, strength: 5 },    // Blacksmith forge
  { x: 180, z: 80, radius: 25, strength: 3 },   // Hills
  { x: -160, z: -100, radius: 20, strength: 3 }, // Hills
];

// ---------------------------------------------------------------------------
// EagleFlightGame
// ---------------------------------------------------------------------------

export class EagleFlightGame {
  private _state!: EagleFlightState;
  private _rafId: number | null = null;
  private _simAccumulator = 0;
  private _lastTime = 0;
  private _prevPosX = 0;
  private _prevPosZ = 0;

  private _renderer = new EagleFlightRenderer();
  private _hud = new EagleFlightHUD();

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    audioManager.playGameMusic();

    const sw = window.innerWidth;
    const sh = window.innerHeight;

    this._state = createEagleFlightState(sw, sh);
    this._prevPosX = this._state.player.position.x;
    this._prevPosZ = this._state.player.position.z;

    // Initialize Three.js renderer
    this._renderer.init(sw, sh);
    document.body.appendChild(this._renderer.canvas);

    // Build HUD
    this._hud.build(sw, sh);

    // Input
    EagleFlightInputSystem.init(this._state);
    EagleFlightInputSystem.setSkipIntroCallback(() => {
      if (this._state.introActive) this._endIntro();
    });
    EagleFlightInputSystem.setPauseCallback((paused) => {
      if (this._state.introActive) return; // can't pause during intro
      if (paused) {
        this._state.paused = true;
        this._hud.showPauseMenu();
      } else {
        this._state.paused = false;
        this._hud.hidePauseMenu();
      }
    });

    // Pause menu callbacks
    this._hud.setPauseCallbacks(
      () => {
        this._state.paused = false;
        this._hud.hidePauseMenu();
      },
      () => {
        this._hud.hidePauseMenu();
        window.dispatchEvent(new Event("eagleFlightExit"));
      },
    );

    // Music
    audioManager.switchTrack("battle");

    // Handle window resize
    this._onResize = this._onResize.bind(this);
    window.addEventListener("resize", this._onResize);

    // Start game loop
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  // ---------------------------------------------------------------------------
  // Game Loop
  // ---------------------------------------------------------------------------

  private _gameLoop(timestamp: number): void {
    if (!this._state) return;

    const rawDt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    const sw = window.innerWidth;
    const sh = window.innerHeight;
    this._state.screenW = sw;
    this._state.screenH = sh;

    // --- Cinematic intro ---
    if (this._state.introActive) {
      this._state.introTimer += rawDt;
      this._state.gameTime += rawDt;

      // Scripted camera path — sweeping orbit around the castle
      const t = this._state.introTimer / this._state.introDuration;
      const introAngle = t * Math.PI * 1.5 - Math.PI / 2;
      const introRadius = 120 - t * 30; // spiral inward
      const introHeight = 80 - t * 20;  // descend
      this._state.player.position.x = Math.cos(introAngle) * introRadius;
      this._state.player.position.z = Math.sin(introAngle) * introRadius + 30;
      this._state.player.position.y = introHeight;
      this._state.player.yaw = introAngle + Math.PI;
      this._state.player.pitch = -0.1;
      this._state.player.roll = Math.sin(introAngle * 2) * 0.15;
      this._state.player.speed = 20;
      this._state.player.flapPhase += rawDt * 4;

      // End intro — skip on any key/click or after duration
      if (this._state.introTimer >= this._state.introDuration) {
        this._endIntro();
      }

      this._renderer.update(this._state, rawDt);
      this._hud.update(this._state, rawDt);
      this._rafId = requestAnimationFrame((t2) => this._gameLoop(t2));
      return;
    }

    // Fixed timestep simulation
    if (!this._state.paused) {
      this._simAccumulator += rawDt;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        this._state.gameTime += DT;
        this._state.dayPhase += DT * 0.005;

        EagleFlightInputSystem.update(this._state, DT);

        const px = this._state.player.position.x;
        const pz = this._state.player.position.z;

        // --- Wind drift with gusts (only when flying) ---
        if (this._state.player.mounted) {
          // Base wind
          const windX = Math.cos(this._state.windAngle) * this._state.windStrength * DT;
          const windZ = Math.sin(this._state.windAngle) * this._state.windStrength * DT;
          this._state.player.position.x += windX * 0.15;
          this._state.player.position.z += windZ * 0.15;

          // Wind gusts (periodic strong pushes)
          this._state.gustTimer -= DT;
          if (this._state.gustTimer <= 0) {
            this._state.gustStrength = 3 + Math.random() * 5;
            this._state.gustAngle = this._state.windAngle + (Math.random() - 0.5) * 1.5;
            this._state.gustTimer = 4 + Math.random() * 8;
            if (this._state.gustStrength > 5) {
              this._state.notification = "STRONG GUST!";
              this._state.notificationTimer = 1;
            }
          }
          if (this._state.gustStrength > 0) {
            const gx = Math.cos(this._state.gustAngle) * this._state.gustStrength * DT;
            const gz = Math.sin(this._state.gustAngle) * this._state.gustStrength * DT;
            this._state.player.position.x += gx * 0.3;
            this._state.player.position.z += gz * 0.3;
            this._state.gustStrength *= 0.97; // decay
            if (this._state.gustStrength < 0.1) this._state.gustStrength = 0;
          }

          // Updrafts near steep terrain (cliff updrafts)
          const terrH = getTerrainHeight(px, pz);
          const terrHNorth = getTerrainHeight(px, pz - 5);
          const terrHSouth = getTerrainHeight(px, pz + 5);
          const terrHEast = getTerrainHeight(px + 5, pz);
          const terrHWest = getTerrainHeight(px - 5, pz);
          const maxSlope = Math.max(
            Math.abs(terrH - terrHNorth), Math.abs(terrH - terrHSouth),
            Math.abs(terrH - terrHEast), Math.abs(terrH - terrHWest),
          );
          if (maxSlope > 3 && this._state.player.position.y < terrH + 30) {
            this._state.player.position.y += maxSlope * 0.3 * DT;
          }

          // Storm wind (stronger during storms)
          if (this._state.weather === "storm") {
            this._state.player.position.x += Math.sin(this._state.gameTime * 2) * 0.15;
            this._state.player.position.z += Math.cos(this._state.gameTime * 1.7) * 0.12;
            // Random lightning shake
            if (Math.random() < DT * 0.3) {
              this._state.shakeTimer = 0.3;
              this._state.shakeMag = 1.5;
            }
          }
        }
        // Slowly shift wind direction
        this._state.windAngle += Math.sin(this._state.gameTime * 0.1) * 0.001;
        // Increase wind in storms
        if (this._state.weather === "storm") {
          this._state.windStrength = 4 + Math.sin(this._state.gameTime) * 2;
        } else if (this._state.weather === "rain") {
          this._state.windStrength = 2.5;
        } else {
          this._state.windStrength = 1.5 + Math.sin(this._state.gameTime * 0.05) * 0.5;
        }

        // --- Weather system ---
        this._state.weatherTimer -= DT;
        if (this._state.weatherTimer <= 0) {
          const weathers: WeatherType[] = ["clear", "clear", "clear", "rain", "storm", "fog"];
          const newWeather = weathers[Math.floor(Math.random() * weathers.length)];
          this._state.weather = newWeather;
          this._state.weatherTimer = 45 + Math.random() * 90;
          if (newWeather !== "clear") {
            this._state.notification = newWeather === "rain" ? "RAIN APPROACHING" : newWeather === "storm" ? "THUNDERSTORM!" : "FOG ROLLING IN";
            this._state.notificationTimer = 2;
          }
        }
        // Weather intensity ramp
        const targetIntensity = this._state.weather === "clear" ? 0 : 1;
        this._state.weatherIntensity += (targetIntensity - this._state.weatherIntensity) * DT * 0.5;

        // --- Stall mechanics ---
        if (this._state.player.mounted) {
          const p2 = this._state.player;
          const stallAngle = -0.6; // steep climb angle threshold
          if (p2.pitch < stallAngle && p2.speed < 8) {
            p2.isStalling = true;
            this._state.stalling = true;
            this._state.stallTimer += DT;
            // Force nose down, reduce speed
            p2.pitch += DT * 1.5; // nose drops
            p2.speed = Math.max(EFBalance.MIN_SPEED, p2.speed - DT * 3);
            // Shake
            this._state.shakeTimer = 0.1;
            this._state.shakeMag = 0.8;
            if (this._state.stallTimer > 0.5 && !this._state.notification.includes("STALL")) {
              this._state.notification = "STALL WARNING!";
              this._state.notificationTimer = 1.5;
            }
          } else {
            p2.isStalling = false;
            this._state.stalling = false;
            this._state.stallTimer = 0;
          }
        }

        // --- Thermals (only when flying) ---
        this._state.thermalBoost = 0;
        if (this._state.player.mounted) {
          for (const th of THERMALS) {
            const dx = px - th.x;
            const dz = pz - th.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < th.radius) {
              const strength = (1 - dist / th.radius) * th.strength;
              this._state.player.position.y += strength * DT;
              this._state.thermalBoost = Math.max(this._state.thermalBoost, strength / th.strength);
            }
          }
        }

        // --- Checkpoint collection ---
        for (const cp of this._state.checkpoints) {
          if (cp.collected) continue;
          const cdx = px - cp.position.x;
          const cdy = this._state.player.position.y - cp.position.y;
          const cdz = pz - cp.position.z;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
          if (cdist < cp.radius) {
            cp.collected = true;
            this._state.player.checkpointsHit++;
            const total = this._state.checkpoints.length;
            const hit = this._state.player.checkpointsHit;
            if (hit >= total) {
              this._awardTrickScore(500, "ALL RINGS COLLECTED!");
            } else {
              this._awardTrickScore(200, `RING ${hit}/${total}`);
            }
            this._state.shakeTimer = 0.25;
            this._state.shakeMag = 1.0;
          }
          cp.glowPhase += DT * 2;
        }

        // --- Magic orb collection ---
        for (const orb of this._state.orbs) {
          if (orb.collected) continue;
          const odx = px - orb.position.x;
          const ody = this._state.player.position.y - orb.position.y;
          const odz = pz - orb.position.z;
          const odist = Math.sqrt(odx * odx + ody * ody + odz * odz);
          if (odist < 4) {
            orb.collected = true;
            this._state.player.orbsCollected++;
            this._awardTrickScore(25, "MAGIC ORB!");
          }
          orb.phase += DT * 3;
        }

        // --- Combo timer decay ---
        if (this._state.player.comboTimer > 0) {
          this._state.player.comboTimer -= DT;
          if (this._state.player.comboTimer <= 0) {
            // Combo ended
            if (this._state.player.comboMultiplier > 1) {
              this._state.notification = `x${this._state.player.comboMultiplier} COMBO!`;
              this._state.notificationTimer = 1.5;
            }
            this._state.player.comboMultiplier = 1;
          }
        }

        // --- Spell cooldown decay ---
        for (let si = 0; si < 3; si++) {
          if (this._state.player.spellCooldowns[si] > 0) {
            this._state.player.spellCooldowns[si] -= DT;
          }
        }

        // --- Day/night cycle ---
        this._state.sunAngle += DT * 0.015; // full cycle ~7 minutes
        if (this._state.sunAngle > Math.PI * 2) this._state.sunAngle -= Math.PI * 2;

        // --- NPC AI ---
        const py = this._state.player.position.y;
        const sunY2 = Math.sin(this._state.sunAngle);
        const isNight = sunY2 < 0.1;
        for (const npc of this._state.npcs) {
          // Scared behavior (from firework spell)
          if (npc.scared) {
            npc.scareTimer -= DT;
            // Run away from scare source
            const speedMult = npc.type === "sheep" ? 4 : 2.5;
            const ndx2 = npc.targetX - npc.position.x;
            const ndz2 = npc.targetZ - npc.position.z;
            const nd2 = Math.sqrt(ndx2 * ndx2 + ndz2 * ndz2);
            if (nd2 > 0.5) {
              npc.position.x += (ndx2 / nd2) * npc.speed * speedMult * DT;
              npc.position.z += (ndz2 / nd2) * npc.speed * speedMult * DT;
            }
            if (npc.scareTimer <= 0) { npc.scared = false; }
            continue;
          }

          // Day/night behavior: non-sheep NPCs slow down / stop at night
          if (isNight && npc.type !== "sheep" && npc.type !== "knight") {
            continue; // villagers stay put at night
          }

          // Move toward target
          const ndx = npc.targetX - npc.position.x;
          const ndz = npc.targetZ - npc.position.z;
          const ndist = Math.sqrt(ndx * ndx + ndz * ndz);
          if (ndist > 0.5) {
            npc.position.x += (ndx / ndist) * npc.speed * DT;
            npc.position.z += (ndz / ndist) * npc.speed * DT;
          } else {
            npc.targetX = npc.position.x + (Math.random() - 0.5) * 15;
            npc.targetZ = npc.position.z + (Math.random() - 0.5) * 15;
          }
          // React to eagle overhead
          const edx = px - npc.position.x;
          const edz = pz - npc.position.z;
          const eDist = Math.sqrt(edx * edx + edz * edz);
          if (eDist < 20 && py < 15) {
            npc.lookingUp = true;
            npc.lookTimer = 2;
          }
          if (npc.lookTimer > 0) {
            npc.lookTimer -= DT;
            if (npc.lookTimer <= 0) npc.lookingUp = false;
          }
        }

        // --- Firework spell scare effect ---
        if (this._state.fireworkScareActive) {
          this._state.fireworkScareTimer -= DT;
          if (this._state.fireworkScareTimer <= 0) {
            this._state.fireworkScareActive = false;
          }
        }

        // --- Lightning spell ground strike ---
        if (this._state.lightningTimer > 0) {
          this._state.lightningTimer -= DT;
          if (this._state.lightningTimer <= 0) {
            this._state.lightningStrikePos = null;
          }
        }

        // --- Dragon AI ---
        for (const dragon of this._state.dragons) {
          // Circle patrol
          dragon.circleAngle += DT * 0.3;
          dragon.position.x = dragon.circleCenter.x + Math.cos(dragon.circleAngle) * dragon.circleRadius;
          dragon.position.z = dragon.circleCenter.z + Math.sin(dragon.circleAngle) * dragon.circleRadius;
          dragon.position.y = dragon.circleCenter.y + Math.sin(dragon.circleAngle * 2) * 10;
          dragon.yaw = dragon.circleAngle + Math.PI / 2;

          // Fire at player if close
          const ddx2 = px - dragon.position.x;
          const ddz2 = pz - dragon.position.z;
          const ddy2 = py - dragon.position.y;
          const dDist = Math.sqrt(ddx2 * ddx2 + ddz2 * ddz2 + ddy2 * ddy2);
          dragon.fireCooldown = Math.max(0, dragon.fireCooldown - DT);
          if (dDist < 60 && dragon.fireCooldown <= 0) {
            dragon.fireActive = true;
            dragon.fireTimer = 1.5;
            dragon.fireCooldown = 6;
          }
          if (dragon.fireActive) {
            dragon.fireTimer -= DT;
            // Damage/push player if very close and fire active
            if (dDist < 15) {
              this._state.shakeTimer = 0.2;
              this._state.shakeMag = 2;
              this._state.player.speed = Math.max(EFBalance.MIN_SPEED, this._state.player.speed - DT * 5);
              // Push away
              if (dDist > 0.1) {
                this._state.player.position.x += (ddx2 / dDist) * 3 * DT;
                this._state.player.position.z += (ddz2 / dDist) * 3 * DT;
              }
            }
            if (dragon.fireTimer <= 0) dragon.fireActive = false;
          }
          // Achievement: survive being near a dragon
          if (dDist < 30) {
            this._unlockAchievement("dragon_dodger");
          }
        }

        // --- Bird flock AI ---
        for (const flock of this._state.birdFlocks) {
          const fdx = px - flock.center.x;
          const fdy = py - flock.center.y;
          const fdz = pz - flock.center.z;
          const fDist = Math.sqrt(fdx * fdx + fdy * fdy + fdz * fdz);

          if (!flock.scattered && fDist < 15) {
            // Scatter!
            flock.scattered = true;
            flock.scatterTimer = 5;
            this._awardTrickScore(30, "FLOCK SCATTERED!");
            this._unlockAchievement("flock_scatter");
            for (const bird of flock.birds) {
              bird.vx = (Math.random() - 0.5) * 20;
              bird.vy = 5 + Math.random() * 10;
              bird.vz = (Math.random() - 0.5) * 20;
            }
          }
          if (flock.scattered) {
            flock.scatterTimer -= DT;
            for (const bird of flock.birds) {
              bird.x += bird.vx * DT;
              bird.y += bird.vy * DT;
              bird.z += bird.vz * DT;
              bird.vy -= 3 * DT; // gentle gravity
              bird.vx *= 0.99;
              bird.vz *= 0.99;
            }
            if (flock.scatterTimer <= 0) {
              // Reform flock
              flock.scattered = false;
              for (const bird of flock.birds) {
                bird.x = flock.center.x + (Math.random() - 0.5) * 10;
                bird.y = flock.center.y + (Math.random() - 0.5) * 5;
                bird.z = flock.center.z + (Math.random() - 0.5) * 10;
                bird.vx = 0; bird.vy = 0; bird.vz = 0;
              }
            }
          } else {
            // Gentle circling when not scattered
            for (const bird of flock.birds) {
              const bAngle = this._state.gameTime * 0.5 + Math.atan2(bird.z - flock.center.z, bird.x - flock.center.x);
              bird.x += Math.cos(bAngle) * 0.5 * DT;
              bird.z += Math.sin(bAngle) * 0.5 * DT;
              bird.y = flock.center.y + Math.sin(this._state.gameTime + bird.x * 0.1) * 2;
            }
          }
        }

        // --- Delivery quest ---
        if (this._state.delivery.active) {
          const del = this._state.delivery;
          del.timeRemaining -= DT;
          if (del.timeRemaining <= 0) {
            del.active = false;
            this._state.notification = "DELIVERY FAILED!";
            this._state.notificationTimer = 2;
          } else if (!del.pickedUp) {
            const pdx = px - del.pickupPos.x;
            const pdz = pz - del.pickupPos.z;
            const pdy = py - del.pickupPos.y;
            if (Math.sqrt(pdx * pdx + pdy * pdy + pdz * pdz) < 15) {
              del.pickedUp = true;
              this._state.notification = `PACKAGE PICKED UP! Deliver to ${del.deliverLabel}`;
              this._state.notificationTimer = 2;
            }
          } else {
            const ddx3 = px - del.deliverPos.x;
            const ddz3 = pz - del.deliverPos.z;
            if (Math.sqrt(ddx3 * ddx3 + ddz3 * ddz3) < 30) {
              del.active = false;
              this._awardTrickScore(del.reward, "DELIVERY COMPLETE!");
              this._unlockAchievement("delivery_complete");
            }
          }
        }

        // --- Race system ---
        if (this._state.race.active && !this._state.race.finished) {
          const race = this._state.race;
          race.timeElapsed += DT;
          const wp = race.waypoints[race.currentWaypoint];
          const rwdx = px - wp.x;
          const rwdy = py - wp.y;
          const rwdz = pz - wp.z;
          if (Math.sqrt(rwdx * rwdx + rwdy * rwdy + rwdz * rwdz) < 12) {
            race.currentWaypoint++;
            if (race.currentWaypoint >= race.waypoints.length) {
              race.finished = true;
              if (race.timeElapsed <= race.goldTime) {
                race.medal = "gold";
                this._awardTrickScore(1000, "GOLD MEDAL!");
                this._unlockAchievement("race_gold");
              } else if (race.timeElapsed <= race.silverTime) {
                race.medal = "silver";
                this._awardTrickScore(500, "SILVER MEDAL!");
              } else if (race.timeElapsed <= race.bronzeTime) {
                race.medal = "bronze";
                this._awardTrickScore(250, "BRONZE MEDAL!");
              } else {
                this._state.notification = "RACE COMPLETE!";
                this._state.notificationTimer = 2;
              }
            } else {
              this._state.notification = `WAYPOINT ${race.currentWaypoint}/${race.waypoints.length}`;
              this._state.notificationTimer = 1;
            }
          }
        }

        // --- Landmark discovery ---
        for (const lm of LANDMARKS) {
          if (!this._state.discoveredLandmarks.has(lm.name)) {
            const ldx = px - lm.x;
            const ldz = pz - lm.z;
            if (Math.sqrt(ldx * ldx + ldz * ldz) < lm.radius) {
              this._state.discoveredLandmarks.add(lm.name);
              this._state.landmarkCount++;
              this._state.notification = `DISCOVERED: ${lm.name}`;
              this._state.notificationTimer = 2;
              if (this._state.landmarkCount >= 10) this._unlockAchievement("explorer");
              if (this._state.landmarkCount >= this._state.totalLandmarks) this._unlockAchievement("full_map");
            }
          }
        }

        // --- Achievement checks ---
        if (this._state.gameTime > 5) this._unlockAchievement("first_flight");
        if (this._state.player.speed > 30) this._unlockAchievement("speed_demon");
        if (this._state.player.position.y < 5 && this._state.player.mounted) this._unlockAchievement("low_rider");
        if (this._state.player.position.y > 300) this._unlockAchievement("high_flyer");
        if (isNight && this._state.player.mounted) this._unlockAchievement("night_owl");
        if (this._state.weather === "storm" && this._state.player.mounted) this._unlockAchievement("storm_rider");
        if (this._state.player.comboMultiplier >= 5) this._unlockAchievement("combo_5");
        if (this._state.player.checkpointsHit >= this._state.checkpoints.length) this._unlockAchievement("ring_master");
        if (this._state.player.orbsCollected >= 20) this._unlockAchievement("orb_collector");

        // --- Landing detection ---
        if (this._state.player.mounted) {
          const terrH2 = getTerrainHeight(px, pz);
          if (py < terrH2 + 5 && this._state.player.speed < 8) {
            this._state.isLanding = true;
            this._state.landingTimer = Math.min(this._state.landingTimer + DT, 1);
          } else {
            this._state.isLanding = false;
            this._state.landingTimer = Math.max(this._state.landingTimer - DT * 2, 0);
          }
        }

        // --- Distance and top speed tracking ---
        const ddx = px - this._prevPosX;
        const ddz = pz - this._prevPosZ;
        this._state.player.distanceFlown += Math.sqrt(ddx * ddx + ddz * ddz);
        this._prevPosX = px;
        this._prevPosZ = pz;
        if (this._state.player.speed > this._state.player.topSpeed) {
          this._state.player.topSpeed = this._state.player.speed;
        }
      }
    }

    // Always render
    this._renderer.update(this._state, rawDt);
    this._hud.update(this._state, rawDt);

    this._rafId = requestAnimationFrame((t2) => this._gameLoop(t2));
  }

  private _awardTrickScore(base: number, notif: string): void {
    const p = this._state.player;
    const score = base * p.comboMultiplier;
    p.trickScore += score;
    p.lastComboScore = score;
    p.comboTimer = EFBalance.COMBO_WINDOW;
    p.comboMultiplier++;
    this._state.notification = p.comboMultiplier > 2 ? `${notif} x${p.comboMultiplier - 1}` : notif;
    this._state.notificationTimer = 1.5;
    this._state.shakeTimer = 0.15;
    this._state.shakeMag = 0.5;
  }

  private _unlockAchievement(id: string): void {
    const ach = this._state.achievements.find((a) => a.id === id);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      this._state.notification = `ACHIEVEMENT: ${ach.name}`;
      this._state.notificationTimer = 3;
    }
  }

  private _endIntro(): void {
    this._state.introActive = false;
    EagleFlightInputSystem.clearSkipIntro();
    // Position eagle for player takeover
    this._state.player.position.x = 0;
    this._state.player.position.y = 60;
    this._state.player.position.z = -80;
    this._state.player.yaw = 0;
    this._state.player.pitch = 0;
    this._state.player.roll = 0;
    this._state.player.speed = EFBalance.CRUISE_SPEED;
    this._state.player.targetSpeed = EFBalance.CRUISE_SPEED;
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  private _onResize(): void {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    this._renderer.resize(sw, sh);
    this._hud.resize(sw, sh);
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    window.removeEventListener("resize", this._onResize);
    EagleFlightInputSystem.destroy();
    this._renderer.destroy();
    this._hud.destroy();
  }
}
