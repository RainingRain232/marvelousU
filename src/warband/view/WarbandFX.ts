// ---------------------------------------------------------------------------
// Warband mode – visual effects (blood, sparks, hit flashes, arrow trails)
// ---------------------------------------------------------------------------

import * as THREE from "three";

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
}

interface AoeRing {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  maxRadius: number;
  age: number;
  duration: number; // total lifetime in seconds
}

export class WarbandFX {
  private _scene: THREE.Scene;
  private _particles: Particle[] = [];
  private _pool: THREE.Mesh[] = [];
  private _maxParticles = 200;
  private _aoeRings: AoeRing[] = [];

  // Shared geometries/materials
  private _sparkGeo: THREE.BufferGeometry;
  private _bloodGeo: THREE.BufferGeometry;
  private _sparkMat: THREE.MeshBasicMaterial;
  private _bloodMat: THREE.MeshBasicMaterial;
  private _blockMat: THREE.MeshBasicMaterial;
  private _dustMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this._scene = scene;
    this._sparkGeo = new THREE.SphereGeometry(0.03, 3, 2);
    this._bloodGeo = new THREE.SphereGeometry(0.04, 3, 2);
    this._sparkMat = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
    this._bloodMat = new THREE.MeshBasicMaterial({ color: 0xaa0000 });
    this._blockMat = new THREE.MeshBasicMaterial({ color: 0x4488ff });
    this._dustMat = new THREE.MeshBasicMaterial({
      color: 0xaa9966,
      transparent: true,
      opacity: 0.4,
    });
  }

  /** Spawn hit sparks at a world position */
  spawnHitSparks(x: number, y: number, z: number, blocked: boolean): void {
    const count = blocked ? 12 : 8;
    const mat = blocked ? this._blockMat : this._sparkMat;
    const geo = this._sparkGeo;

    for (let i = 0; i < count; i++) {
      const mesh = this._getMesh(geo, mat);
      mesh.position.set(x, y, z);

      const speed = 2 + Math.random() * 4;
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.8,
        (Math.random() - 0.5) * speed,
      );

      this._particles.push({
        mesh,
        velocity,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.3 + Math.random() * 0.3,
        gravity: -10,
      });
    }
  }

  /** Spawn blood particles */
  spawnBlood(x: number, y: number, z: number, amount: number): void {
    const count = Math.min(15, Math.max(3, Math.floor(amount / 5)));

    for (let i = 0; i < count; i++) {
      const mesh = this._getMesh(this._bloodGeo, this._bloodMat);
      mesh.position.set(x, y, z);

      const speed = 1 + Math.random() * 3;
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.5 + 1,
        (Math.random() - 0.5) * speed,
      );

      this._particles.push({
        mesh,
        velocity,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5,
        gravity: -12,
      });
    }
  }

  /** Spawn arrow trail dust */
  spawnDust(x: number, y: number, z: number): void {
    const mesh = this._getMesh(this._sparkGeo, this._dustMat);
    mesh.position.set(x, y, z);
    mesh.scale.set(2, 2, 2);

    this._particles.push({
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        0.5 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.5,
      ),
      life: 0.8,
      maxLife: 0.8,
      gravity: -1,
    });
  }

  /** Spawn an AoE spell explosion – filled disc that expands outward then fades */
  spawnAoeExplosion(x: number, _y: number, z: number, radius: number, color: number): void {
    // Create a flat filled circle (high-segment disc) that will scale up
    const geo = new THREE.CircleGeometry(1, 48); // unit circle, we scale it
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2; // lay flat on ground
    mesh.position.set(x, 0.08, z);
    mesh.scale.set(0.01, 0.01, 0.01); // start tiny
    this._scene.add(mesh);

    this._aoeRings.push({
      mesh,
      x, z,
      maxRadius: radius,
      age: 0,
      duration: 0.6,
    });
  }

  /** Update all particles and AoE rings */
  update(dt: number): void {
    // Update AoE expanding rings
    for (let i = this._aoeRings.length - 1; i >= 0; i--) {
      const ring = this._aoeRings[i];
      ring.age += dt;

      if (ring.age >= ring.duration) {
        this._scene.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        (ring.mesh.material as THREE.Material).dispose();
        this._aoeRings.splice(i, 1);
        continue;
      }

      const t = ring.age / ring.duration; // 0→1
      // Expand: fast ease-out (sqrt curve)
      const expandT = Math.sqrt(t);
      const r = ring.maxRadius * expandT;
      ring.mesh.scale.set(r, r, r);

      // Opacity: full at start, fade out in the second half
      const mat = ring.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = t < 0.5 ? 0.7 : 0.7 * (1 - (t - 0.5) / 0.5);
    }

    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this._scene.remove(p.mesh);
        this._pool.push(p.mesh);
        this._particles.splice(i, 1);
        continue;
      }

      // Physics
      p.velocity.y += p.gravity * dt;
      p.mesh.position.x += p.velocity.x * dt;
      p.mesh.position.y += p.velocity.y * dt;
      p.mesh.position.z += p.velocity.z * dt;

      // Fade out
      const alpha = p.life / p.maxLife;
      p.mesh.scale.setScalar(alpha);

      // Ground bounce
      if (p.mesh.position.y < 0.02) {
        p.mesh.position.y = 0.02;
        p.velocity.y *= -0.3;
        p.velocity.x *= 0.5;
        p.velocity.z *= 0.5;
      }
    }
  }

  private _getMesh(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
  ): THREE.Mesh {
    if (this._pool.length > 0) {
      const mesh = this._pool.pop()!;
      mesh.geometry = geo;
      mesh.material = mat;
      mesh.scale.set(1, 1, 1);
      mesh.visible = true;
      this._scene.add(mesh);
      return mesh;
    }

    // Cap total particles
    if (this._particles.length >= this._maxParticles) {
      const oldest = this._particles.shift()!;
      this._scene.remove(oldest.mesh);
      oldest.mesh.geometry = geo;
      oldest.mesh.material = mat;
      oldest.mesh.scale.set(1, 1, 1);
      this._scene.add(oldest.mesh);
      return oldest.mesh;
    }

    const mesh = new THREE.Mesh(geo, mat);
    this._scene.add(mesh);
    return mesh;
  }

  destroy(): void {
    for (const p of this._particles) {
      this._scene.remove(p.mesh);
    }
    for (const m of this._pool) {
      this._scene.remove(m);
    }
    for (const ring of this._aoeRings) {
      this._scene.remove(ring.mesh);
      ring.mesh.geometry.dispose();
      (ring.mesh.material as THREE.Material).dispose();
    }
    this._particles.length = 0;
    this._pool.length = 0;
    this._aoeRings.length = 0;
    this._sparkGeo.dispose();
    this._bloodGeo.dispose();
    this._sparkMat.dispose();
    this._bloodMat.dispose();
    this._blockMat.dispose();
    this._dustMat.dispose();
  }
}
