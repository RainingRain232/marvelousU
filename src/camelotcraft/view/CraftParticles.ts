import * as THREE from "three";

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
}

interface XPOrbParticle extends Particle {
  target: THREE.Vector3;
  lerpSpeed: number;
}

const MAX_PARTICLES = 200;

const _tempVec = new THREE.Vector3();

export class CraftParticles {
  readonly group = new THREE.Group();

  private particles: Particle[] = [];
  private xpOrbs: XPOrbParticle[] = [];

  /* Shared geometries ---------------------------------------------------- */
  private boxGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  private sphereGeo = new THREE.SphereGeometry(0.06, 12, 10);
  private xpSphereGeo = new THREE.SphereGeometry(0.12, 8, 8);

  constructor() {
    // group is added to scene externally by the renderer
  }

  /* ====================================================================== */
  /*  Public emitters                                                       */
  /* ====================================================================== */

  /** Spawn 8-12 small colored cubes flying outward with gravity. */
  emitBlockBreak(wx: number, wy: number, wz: number, color: number): void {
    const count = 8 + Math.floor(Math.random() * 5); // 8..12
    for (let i = 0; i < count; i++) {
      const mesh = this.makeBoxMesh(color);
      mesh.position.set(
        wx + 0.5 + (Math.random() - 0.5) * 0.4,
        wy + 0.5 + (Math.random() - 0.5) * 0.4,
        wz + 0.5 + (Math.random() - 0.5) * 0.4,
      );

      const speed = 1.5 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5; // biased upward
      const vx = Math.cos(theta) * Math.sin(phi) * speed;
      const vy = Math.abs(Math.cos(phi)) * speed;
      const vz = Math.sin(theta) * Math.sin(phi) * speed;

      this.addParticle({
        mesh,
        velocity: new THREE.Vector3(vx, vy, vz),
        life: 0.5,
        maxLife: 0.5,
        gravity: 9.8,
      });
    }
  }

  /** Spawn a subtle ring of particles around a newly placed block. */
  emitBlockPlace(wx: number, wy: number, wz: number, color: number): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const mesh = this.makeBoxMesh(color, 0.07);
      mesh.position.set(
        wx + 0.5 + Math.cos(angle) * 0.45,
        wy + 0.5,
        wz + 0.5 + Math.sin(angle) * 0.45,
      );

      const outSpeed = 1.0;
      this.addParticle({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * outSpeed,
          0.3 + Math.random() * 0.3,
          Math.sin(angle) * outSpeed,
        ),
        life: 0.35,
        maxLife: 0.35,
        gravity: 2.0,
      });
    }
  }

  /** Spawn red (or custom-color) particles when a mob/player takes damage. */
  emitHit(pos: THREE.Vector3, color: number = 0xff0000): void {
    const count = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const hitGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const hitMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(hitGeo, hitMat);
      mesh.position.copy(pos).add(
        _tempVec.set(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
        ),
      );

      const speed = 1.0 + Math.random() * 1.5;
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.5 + 0.3,
        Math.random() - 0.5,
      ).normalize().multiplyScalar(speed);

      this.addParticle({
        mesh,
        velocity: dir,
        life: 0.4,
        maxLife: 0.4,
        gravity: 6.0,
      });
    }
  }

  /**
   * Spawn glowing green/yellow orbs that float from `from` toward `to`.
   * `amount` controls how many orbs (clamped to a sane range).
   */
  emitXPOrb(from: THREE.Vector3, to: THREE.Vector3, amount: number): void {
    const count = Math.min(Math.max(1, amount), 10);
    for (let i = 0; i < count; i++) {
      const color = Math.random() > 0.5 ? 0x7fff00 : 0xffff00;
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.xpSphereGeo, mat);
      mesh.position.copy(from).add(
        _tempVec.set(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 0.5,
          (Math.random() - 0.5) * 0.5,
        ),
      );

      const orb: XPOrbParticle = {
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          1.0 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.5,
        ),
        life: 1.2 + Math.random() * 0.3,
        maxLife: 1.5,
        gravity: 0,
        target: to.clone(),
        lerpSpeed: 2.0 + Math.random() * 1.5,
      };

      if (this.totalCount() >= MAX_PARTICLES) this.removeOldest();
      this.group.add(mesh);
      this.xpOrbs.push(orb);
    }
  }

  /** Spawn 1-2 small dust particles while mining a block (call each frame). */
  emitMiningDust(wx: number, wy: number, wz: number, color: number): void {
    const count = 1 + (Math.random() > 0.5 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const mesh = this.makeSphereMesh(color);
      mesh.position.set(
        wx + 0.5 + (Math.random() - 0.5) * 0.8,
        wy + 0.5 + (Math.random() - 0.5) * 0.8,
        wz + 0.5 + (Math.random() - 0.5) * 0.8,
      );

      const speed = 0.3 + Math.random() * 0.3;
      this.addParticle({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * speed,
          Math.random() * speed * 0.5,
          (Math.random() - 0.5) * speed,
        ),
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        gravity: 1.5,
      });
    }
  }

  /**
   * Emit ambient atmosphere particles near the player.
   * Call once per frame. Spawns dust motes during day, fireflies at night.
   */
  emitTorchFlame(x: number, y: number, z: number, color: number): void {
    if (this.particles.length > 180) return;
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.sphereGeo, mat);
    mesh.scale.setScalar(0.4 + Math.random() * 0.3);
    mesh.position.set(
      x + (Math.random() - 0.5) * 0.15,
      y + Math.random() * 0.1,
      z + (Math.random() - 0.5) * 0.15,
    );
    this.group.add(mesh);
    this.particles.push({
      mesh,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.8 + Math.random() * 0.5, (Math.random() - 0.5) * 0.2),
      life: 0.3 + Math.random() * 0.3,
      maxLife: 0.6,
      gravity: -0.5, // floats upward
    });
  }

  emitAmbient(playerX: number, playerY: number, playerZ: number, timeOfDay: number): void {
    if (this.particles.length > 150) return; // don't overwhelm

    const isNight = timeOfDay > 0.75 || timeOfDay < 0.25;

    // Spawn rate: ~1 particle per 3 frames
    if (Math.random() > 0.35) return;

    const range = 12;
    const x = playerX + (Math.random() - 0.5) * range * 2;
    const y = playerY + Math.random() * 6 - 1;
    const z = playerZ + (Math.random() - 0.5) * range * 2;

    if (isNight) {
      // Fireflies: small green/yellow glowing spheres
      const color = Math.random() > 0.5 ? 0x7FFF00 : 0xFFFF00;
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sphereGeo, mat);
      mesh.position.set(x, y, z);
      this.group.add(mesh);
      this.particles.push({
        mesh, velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          Math.sin(Math.random() * 6) * 0.2,
          (Math.random() - 0.5) * 0.3,
        ),
        life: 4 + Math.random() * 4,
        maxLife: 8,
        gravity: -0.05, // float upward gently
      });
    } else {
      // Dust motes: tiny white/tan particles floating gently
      const color = Math.random() > 0.5 ? 0xE8DCC8 : 0xFFFFFF;
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.3,
      });
      const mesh = new THREE.Mesh(this.sphereGeo, mat);
      mesh.scale.setScalar(0.5);
      mesh.position.set(x, y, z);
      this.group.add(mesh);
      this.particles.push({
        mesh, velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.1,
        ),
        life: 5 + Math.random() * 5,
        maxLife: 10,
        gravity: 0.01, // barely falls
      });
    }
  }

  /* ====================================================================== */
  /*  Update loop                                                           */
  /* ====================================================================== */

  update(dt: number): void {
    // Regular particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.removeParticle(this.particles, i);
        continue;
      }

      p.velocity.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, p.life / p.maxLife);
    }

    // XP orbs - lerp toward target over their lifetime
    for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
      const orb = this.xpOrbs[i];
      orb.life -= dt;
      if (orb.life <= 0) {
        this.removeParticle(this.xpOrbs, i);
        continue;
      }

      const t = 1 - orb.life / orb.maxLife; // 0..1 over lifetime
      const lerpFactor = Math.min(1, orb.lerpSpeed * dt * (1 + t * 3));

      // Early phase: drift outward; later: pull toward target
      if (t < 0.3) {
        orb.mesh.position.addScaledVector(orb.velocity, dt);
        orb.velocity.y -= 1.0 * dt;
      } else {
        orb.mesh.position.lerp(orb.target, lerpFactor);
      }

      const mat = orb.mesh.material as THREE.MeshBasicMaterial;
      // Fade out only in the last 20% of life
      mat.opacity = orb.life / orb.maxLife < 0.2
        ? orb.life / (orb.maxLife * 0.2)
        : 1.0;
    }
  }

  /* ====================================================================== */
  /*  Cleanup                                                               */
  /* ====================================================================== */

  destroy(): void {
    for (const p of this.particles) {
      this.group.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    for (const o of this.xpOrbs) {
      this.group.remove(o.mesh);
      (o.mesh.material as THREE.Material).dispose();
    }
    this.particles.length = 0;
    this.xpOrbs.length = 0;

    this.boxGeo.dispose();
    this.sphereGeo.dispose();
    this.xpSphereGeo.dispose();

    this.group.parent?.remove(this.group);
  }

  /* ====================================================================== */
  /*  Internal helpers                                                      */
  /* ====================================================================== */

  private totalCount(): number {
    return this.particles.length + this.xpOrbs.length;
  }

  private addParticle(p: Particle): void {
    if (this.totalCount() >= MAX_PARTICLES) {
      this.removeOldest();
    }
    this.group.add(p.mesh);
    this.particles.push(p);
  }

  /** Remove the oldest regular particle to stay under the cap. */
  private removeOldest(): void {
    if (this.particles.length > 0) {
      this.removeParticle(this.particles, 0);
    } else if (this.xpOrbs.length > 0) {
      this.removeParticle(this.xpOrbs, 0);
    }
  }

  private removeParticle<T extends Particle>(arr: T[], index: number): void {
    const p = arr[index];
    this.group.remove(p.mesh);
    (p.mesh.material as THREE.Material).dispose();
    // Swap-remove for O(1)
    const last = arr.length - 1;
    if (index !== last) arr[index] = arr[last];
    arr.pop();
  }

  private makeBoxMesh(color: number, size?: number): THREE.Mesh {
    const geo = size != null
      ? new THREE.BoxGeometry(size, size, size)
      : this.boxGeo;
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
    });
    return new THREE.Mesh(geo, mat);
  }

  private makeSphereMesh(color: number): THREE.Mesh {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
    });
    return new THREE.Mesh(this.sphereGeo, mat);
  }
}
