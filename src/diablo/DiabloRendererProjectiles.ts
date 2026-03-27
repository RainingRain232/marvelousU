import * as THREE from 'three';
import { DiabloState, DamageType, SkillId } from './DiabloTypes';

export interface ProjectileSyncContext {
  projectileMeshes: Map<string, THREE.Object3D>;
  scene: THREE.Scene;
  time: number;
  disposeObject3D: (obj: THREE.Object3D) => void;
}

export function syncProjectiles(ctx: ProjectileSyncContext, state: DiabloState): void {
    const currentIds = new Set(state.projectiles.map((p) => p.id));

    // Remove old
    for (const [id, mesh] of ctx.projectileMeshes) {
      if (!currentIds.has(id)) {
        ctx.disposeObject3D(mesh);
        ctx.scene.remove(mesh);
        ctx.projectileMeshes.delete(id);
      }
    }

    // Add/update
    for (const proj of state.projectiles) {
      let mesh = ctx.projectileMeshes.get(proj.id);
      if (!mesh) {
        const r = proj.radius || 0.15;
        const group = new THREE.Group();

        if (!proj.isPlayerOwned) {
          // Enemy projectile: visuals based on damage type
          const dt = proj.damageType;

          if (dt === DamageType.FIRE) {
            // Fire variant: blazing orb with flame wisps
            const fireCore = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.5, 30, 27),
              new THREE.MeshStandardMaterial({ color: 0xff6622, emissive: 0xff4400, emissiveIntensity: 2.5 })
            );
            group.add(fireCore);
            const fireOuter = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.9, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xcc1100, emissiveIntensity: 0.8, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
            );
            group.add(fireOuter);
            for (let i = 0; i < 5; i++) {
              const wisp = new THREE.Mesh(
                new THREE.ConeGeometry(r * 0.12, r * 0.5, 17),
                new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xffaa22 : 0xff4400, emissive: i % 2 === 0 ? 0xff8800 : 0xcc2200, emissiveIntensity: 2.0, transparent: true, opacity: 0.7 })
              );
              const a = (i / 5) * Math.PI * 2;
              wisp.position.set(Math.cos(a) * r * 0.4, 0, Math.sin(a) * r * 0.4);
              wisp.lookAt(wisp.position.x * 3, wisp.position.y * 3 + 1, wisp.position.z * 3);
              wisp.name = 'enemy_flame';
              group.add(wisp);
            }
            group.userData.skillType = 'ENEMY_FIRE';
          } else if (dt === DamageType.ICE) {
            // Ice variant: frozen shard cluster
            const iceCrystal = new THREE.Mesh(
              new THREE.OctahedronGeometry(r * 0.5, 2),
              new THREE.MeshStandardMaterial({ color: 0xaaddff, emissive: 0x6699ff, emissiveIntensity: 2.0, metalness: 0.3, roughness: 0.1 })
            );
            iceCrystal.scale.set(1, 1.4, 1);
            group.add(iceCrystal);
            const iceAura = new THREE.Mesh(
              new THREE.SphereGeometry(r * 1.0, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x4488cc, emissiveIntensity: 0.4, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
            );
            group.add(iceAura);
            for (let i = 0; i < 4; i++) {
              const shard = new THREE.Mesh(
                new THREE.OctahedronGeometry(r * 0.15, 2),
                new THREE.MeshStandardMaterial({ color: 0xddeeff, emissive: 0x88aaff, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 })
              );
              const sa = (i / 4) * Math.PI * 2;
              shard.position.set(Math.cos(sa) * r * 0.6, (Math.random() - 0.5) * r * 0.4, Math.sin(sa) * r * 0.6);
              shard.rotation.set(Math.random() * Math.PI, 0, Math.random() * Math.PI);
              shard.name = 'enemy_ice_shard';
              group.add(shard);
            }
            group.userData.skillType = 'ENEMY_ICE';
          } else if (dt === DamageType.LIGHTNING) {
            // Lightning variant: crackling electric orb
            const lCore = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.35, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeeeeff, emissiveIntensity: 4.0 })
            );
            group.add(lCore);
            const lShell = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.8, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0x8888ff, emissive: 0x6666ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            group.add(lShell);
            for (let i = 0; i < 4; i++) {
              const spark = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.06, 17, 16),
                new THREE.MeshStandardMaterial({ color: 0xaaaaff, emissive: 0x8888ff, emissiveIntensity: 5.0 })
              );
              const sa = (i / 4) * Math.PI * 2;
              spark.position.set(Math.cos(sa) * r * 0.7, (Math.random() - 0.5) * r * 0.5, Math.sin(sa) * r * 0.7);
              spark.name = 'enemy_spark';
              group.add(spark);
            }
            group.userData.skillType = 'ENEMY_LIGHTNING';
          } else if (dt === DamageType.POISON) {
            // Poison variant: toxic glob with dripping trails
            const pCore = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.55, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0x44cc22, emissive: 0x22aa00, emissiveIntensity: 2.0 })
            );
            group.add(pCore);
            const pOuter = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.85, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0x33aa11, emissive: 0x118800, emissiveIntensity: 0.5, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            group.add(pOuter);
            for (let i = 0; i < 3; i++) {
              const blob = new THREE.Mesh(
                new THREE.SphereGeometry(r * (0.12 + Math.random() * 0.08), 20, 17),
                new THREE.MeshStandardMaterial({ color: 0x88ff44, emissive: 0x66cc22, emissiveIntensity: 1.5, transparent: true, opacity: 0.6 })
              );
              blob.position.set((Math.random() - 0.5) * r * 0.6, -r * 0.3 - Math.random() * r * 0.3, (Math.random() - 0.5) * r * 0.6);
              blob.name = 'enemy_poison_drip';
              group.add(blob);
            }
            group.userData.skillType = 'ENEMY_POISON';
          } else if (dt === DamageType.SHADOW || dt === DamageType.ARCANE) {
            // Shadow/arcane variant: dark swirling vortex
            const sCore = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.4, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0x6622cc, emissive: 0x4411aa, emissiveIntensity: 2.5 })
            );
            group.add(sCore);
            const sVortex = new THREE.Mesh(
              new THREE.TorusGeometry(r * 0.6, r * 0.08, 23, 36),
              new THREE.MeshStandardMaterial({ color: 0x8844dd, emissive: 0x6622bb, emissiveIntensity: 1.8, transparent: true, opacity: 0.6 })
            );
            sVortex.name = 'enemy_vortex_ring';
            group.add(sVortex);
            const sOuter = new THREE.Mesh(
              new THREE.SphereGeometry(r * 1.0, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0x220044, emissive: 0x110022, emissiveIntensity: 0.3, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
            );
            group.add(sOuter);
            for (let i = 0; i < 4; i++) {
              const mote = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.05, 17, 16),
                new THREE.MeshStandardMaterial({ color: 0xbb66ff, emissive: 0x9944dd, emissiveIntensity: 3.0 })
              );
              const ma = (i / 4) * Math.PI * 2;
              mote.position.set(Math.cos(ma) * r * 0.7, 0, Math.sin(ma) * r * 0.7);
              mote.name = 'enemy_shadow_mote';
              group.add(mote);
            }
            group.userData.skillType = 'ENEMY_SHADOW';
          } else {
            // Default red variant: classic red core with spikes and pulsing aura
            const core = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.5, 30, 27),
              new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xcc0000, emissiveIntensity: 2.0 })
            );
            group.add(core);
            const redAura = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.9, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000, emissiveIntensity: 0.5, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            redAura.name = 'enemy_red_aura';
            group.add(redAura);
            for (let i = 0; i < 4; i++) {
              const spike = new THREE.Mesh(
                new THREE.ConeGeometry(r * 0.12, r * 0.4, 17),
                new THREE.MeshStandardMaterial({ color: 0xaa0000, emissive: 0x880000, emissiveIntensity: 1.5 })
              );
              const angle = (i / 4) * Math.PI * 2;
              spike.position.set(Math.cos(angle) * r * 0.45, 0, Math.sin(angle) * r * 0.45);
              spike.rotation.z = -Math.cos(angle) * Math.PI * 0.4;
              spike.rotation.x = Math.sin(angle) * Math.PI * 0.4;
              spike.name = 'enemy_spike';
              group.add(spike);
            }
            group.userData.skillType = 'ENEMY_RED';
          }
        } else if (proj.skillId) {
          switch (proj.skillId) {
            case SkillId.FIREBALL: {
              // ── FIREBALL — Blazing inferno sphere with layered flames, embers, smoke ──
              // Inner white-hot core
              const hotCore = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.35, 36, 30),
                new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 4.0 })
              );
              group.add(hotCore);
              // Main fire core (orange)
              const fireCore = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.7, 31, 36),
                new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 3.0 })
              );
              group.add(fireCore);
              // Outer heat distortion shell
              const heatShell = new THREE.Mesh(
                new THREE.SphereGeometry(r * 1.5, 36, 30),
                new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff1100, emissiveIntensity: 0.6, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
              );
              group.add(heatShell);
              // Flame tendrils — elongated cones radiating outward
              for (let i = 0; i < 8; i++) {
                const flameLen = r * (0.6 + Math.random() * 0.5);
                const flame = new THREE.Mesh(
                  new THREE.ConeGeometry(r * 0.18, flameLen, 20),
                  new THREE.MeshStandardMaterial({
                    color: i % 3 === 0 ? 0xffcc00 : (i % 3 === 1 ? 0xff6600 : 0xff2200),
                    emissive: i % 3 === 0 ? 0xffaa00 : (i % 3 === 1 ? 0xff4400 : 0xcc0000),
                    emissiveIntensity: 2.5,
                    transparent: true,
                    opacity: 0.8,
                  })
                );
                const a = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
                const elev = (Math.random() - 0.5) * Math.PI * 0.6;
                flame.position.set(
                  Math.cos(a) * Math.cos(elev) * r * 0.5,
                  Math.sin(elev) * r * 0.5,
                  Math.sin(a) * Math.cos(elev) * r * 0.5
                );
                flame.lookAt(flame.position.x * 3, flame.position.y * 3, flame.position.z * 3);
                flame.name = 'flame_tendril';
                group.add(flame);
              }
              // Smoke wisps — dark translucent trailing spheres
              for (let i = 0; i < 4; i++) {
                const smoke = new THREE.Mesh(
                  new THREE.SphereGeometry(r * (0.2 + Math.random() * 0.2), 23, 20),
                  new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x111111, emissiveIntensity: 0.2, transparent: true, opacity: 0.25 })
                );
                smoke.position.set(
                  (Math.random() - 0.5) * r * 0.8,
                  r * 0.4 + Math.random() * r * 0.3,
                  (Math.random() - 0.5) * r * 0.8
                );
                smoke.name = 'smoke_wisp';
                group.add(smoke);
              }
              // Ember particles — tiny bright dots orbiting
              for (let i = 0; i < 6; i++) {
                const ember = new THREE.Mesh(
                  new THREE.SphereGeometry(r * 0.06, 17, 16),
                  new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xffcc00, emissiveIntensity: 4.0 })
                );
                const ea = (i / 6) * Math.PI * 2;
                const ed = r * (1.0 + Math.random() * 0.5);
                ember.position.set(Math.cos(ea) * ed, (Math.random() - 0.5) * r, Math.sin(ea) * ed);
                ember.name = 'ember';
                group.add(ember);
              }
              group.userData.skillType = 'FIREBALL';
              break;
            }
            case SkillId.ICE_NOVA: {
              // ── ICE NOVA — Crystalline shard cluster with frost aura ──
              // Central crystal — elongated octahedron
              const crystal = new THREE.Mesh(
                new THREE.OctahedronGeometry(r * 0.6, 2),
                new THREE.MeshStandardMaterial({
                  color: 0xccefff, emissive: 0x66ccff, emissiveIntensity: 2.0,
                  metalness: 0.3, roughness: 0.1,
                })
              );
              crystal.scale.set(1, 1.6, 1);
              group.add(crystal);
              // Inner glow core
              const iceGlow = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.3, 27, 23),
                new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaeeff, emissiveIntensity: 3.0 })
              );
              group.add(iceGlow);
              // Orbiting ice shards — 6 sharp crystals at various angles
              for (let i = 0; i < 6; i++) {
                const shard = new THREE.Mesh(
                  new THREE.OctahedronGeometry(r * (0.15 + Math.random() * 0.15), 2),
                  new THREE.MeshStandardMaterial({
                    color: 0xddeeff, emissive: 0x88bbff, emissiveIntensity: 1.5,
                    transparent: true, opacity: 0.8, metalness: 0.4, roughness: 0.05,
                  })
                );
                shard.scale.set(0.6, 1.4, 0.6);
                const sa = (i / 6) * Math.PI * 2;
                const sd = r * (0.8 + Math.random() * 0.3);
                shard.position.set(Math.cos(sa) * sd, (Math.random() - 0.5) * r * 0.6, Math.sin(sa) * sd);
                shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                shard.name = 'ice_shard';
                group.add(shard);
              }
              // Frost particle ring — tiny translucent specs
              for (let i = 0; i < 10; i++) {
                const frost = new THREE.Mesh(
                  new THREE.SphereGeometry(r * 0.04, 17, 16),
                  new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xccddff, emissiveIntensity: 2.0, transparent: true, opacity: 0.6 })
                );
                const fa = Math.random() * Math.PI * 2;
                const fd = r * (1.0 + Math.random() * 0.8);
                frost.position.set(Math.cos(fa) * fd, (Math.random() - 0.5) * r * 0.5, Math.sin(fa) * fd);
                frost.name = 'frost_particle';
                group.add(frost);
              }
              // Outer frost aura
              const frostAura = new THREE.Mesh(
                new THREE.SphereGeometry(r * 1.4, 30, 27),
                new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x4488cc, emissiveIntensity: 0.5, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
              );
              group.add(frostAura);
              group.userData.skillType = 'ICE_NOVA';
              break;
            }
            case SkillId.LIGHTNING_BOLT: {
              // ── LIGHTNING BOLT — Actual jagged bolt geometry with bright core and forks ──
              // Bright electric core
              const boltCore = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.35, 27, 23),
                new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeeeeff, emissiveIntensity: 5.0 })
              );
              group.add(boltCore);
              // Build jagged bolt segments extending forward (along X axis)
              const boltLen = r * 4;
              const segments = 10;
              const boltPoints: THREE.Vector3[] = [];
              for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const jx = t * boltLen - boltLen * 0.3;
                const jy = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * r * 1.2;
                const jz = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * r * 1.2;
                boltPoints.push(new THREE.Vector3(jx, jy, jz));
              }
              // Main bolt — bright white/blue tube
              const boltCurve = new THREE.CatmullRomCurve3(boltPoints);
              const boltTubeGeo = new THREE.TubeGeometry(boltCurve, 20, r * 0.12, 6, false);
              const boltTubeMat = new THREE.MeshStandardMaterial({
                color: 0xccddff, emissive: 0xaaccff, emissiveIntensity: 4.0,
              });
              const boltTube = new THREE.Mesh(boltTubeGeo, boltTubeMat);
              boltTube.name = 'bolt_main';
              group.add(boltTube);
              // Outer glow tube (thicker, transparent)
              const glowTubeGeo = new THREE.TubeGeometry(boltCurve, 16, r * 0.35, 6, false);
              const glowTubeMat = new THREE.MeshStandardMaterial({
                color: 0x8888ff, emissive: 0x6666ff, emissiveIntensity: 1.5,
                transparent: true, opacity: 0.25,
              });
              group.add(new THREE.Mesh(glowTubeGeo, glowTubeMat));
              // Fork branches — 2-3 smaller jagged branches splitting off
              for (let b = 0; b < 3; b++) {
                const branchStart = Math.floor(segments * (0.3 + Math.random() * 0.4));
                const startPt = boltPoints[branchStart];
                const forkPts: THREE.Vector3[] = [startPt.clone()];
                const forkLen = r * (1.0 + Math.random() * 1.5);
                const forkSegs = 4;
                const forkDir = new THREE.Vector3(
                  (Math.random() - 0.5) * 2,
                  (Math.random() - 0.5) * 2,
                  (Math.random() - 0.5) * 2
                ).normalize();
                for (let f = 1; f <= forkSegs; f++) {
                  const ft = f / forkSegs;
                  forkPts.push(new THREE.Vector3(
                    startPt.x + forkDir.x * forkLen * ft + (Math.random() - 0.5) * r * 0.5,
                    startPt.y + forkDir.y * forkLen * ft + (Math.random() - 0.5) * r * 0.5,
                    startPt.z + forkDir.z * forkLen * ft + (Math.random() - 0.5) * r * 0.5,
                  ));
                }
                const forkCurve = new THREE.CatmullRomCurve3(forkPts);
                const forkGeo = new THREE.TubeGeometry(forkCurve, 8, r * 0.06, 4, false);
                const forkMat = new THREE.MeshStandardMaterial({
                  color: 0xaabbff, emissive: 0x8899ff, emissiveIntensity: 3.0,
                  transparent: true, opacity: 0.7,
                });
                group.add(new THREE.Mesh(forkGeo, forkMat));
              }
              // Electric sparks at tip and along bolt
              for (let i = 0; i < 8; i++) {
                const spark = new THREE.Mesh(
                  new THREE.SphereGeometry(r * 0.05, 17, 16),
                  new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xddddff, emissiveIntensity: 5.0 })
                );
                const si = Math.floor(Math.random() * boltPoints.length);
                const sp = boltPoints[si];
                spark.position.set(sp.x + (Math.random() - 0.5) * r * 0.5, sp.y + (Math.random() - 0.5) * r * 0.5, sp.z + (Math.random() - 0.5) * r * 0.5);
                spark.name = 'lightning_spark';
                group.add(spark);
              }
              group.userData.skillType = 'LIGHTNING_BOLT';
              break;
            }
            case SkillId.CHAIN_LIGHTNING: {
              // ── CHAIN LIGHTNING — Multiple arcing bolts emanating from a crackling orb ──
              // Central crackling energy orb
              const chainCore = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.4, 30, 27),
                new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xccddff, emissiveIntensity: 5.0 })
              );
              group.add(chainCore);
              // Electric shell
              const chainShell = new THREE.Mesh(
                new THREE.IcosahedronGeometry(r * 0.6, 3),
                new THREE.MeshStandardMaterial({
                  color: 0x88aaff, emissive: 0x6688ff, emissiveIntensity: 2.0,
                  wireframe: true,
                })
              );
              chainShell.name = 'chain_shell';
              group.add(chainShell);
              // Multiple arcing bolt tendrils extending outward (3-5 bolts)
              for (let b = 0; b < 5; b++) {
                const arcLen = r * (2.0 + Math.random() * 2.0);
                const arcSegs = 6;
                const arcDir = new THREE.Vector3(
                  (Math.random() - 0.5) * 2,
                  (Math.random() - 0.5) * 1.5,
                  (Math.random() - 0.5) * 2
                ).normalize();
                const arcPts: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)];
                for (let s = 1; s <= arcSegs; s++) {
                  const t = s / arcSegs;
                  arcPts.push(new THREE.Vector3(
                    arcDir.x * arcLen * t + (Math.random() - 0.5) * r * 0.8,
                    arcDir.y * arcLen * t + (Math.random() - 0.5) * r * 0.8,
                    arcDir.z * arcLen * t + (Math.random() - 0.5) * r * 0.8,
                  ));
                }
                const arcCurve = new THREE.CatmullRomCurve3(arcPts);
                const arcGeo = new THREE.TubeGeometry(arcCurve, 12, r * 0.07, 5, false);
                const arcMat = new THREE.MeshStandardMaterial({
                  color: b < 2 ? 0xeeeeff : 0xaabbff,
                  emissive: b < 2 ? 0xccddff : 0x8899ee,
                  emissiveIntensity: 3.5,
                  transparent: true, opacity: 0.8,
                });
                const arcMesh = new THREE.Mesh(arcGeo, arcMat);
                arcMesh.name = 'chain_arc';
                group.add(arcMesh);
                // Spark at end of each arc
                const endSpark = new THREE.Mesh(
                  new THREE.SphereGeometry(r * 0.12, 23, 17),
                  new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbbccff, emissiveIntensity: 4.0 })
                );
                endSpark.position.copy(arcPts[arcPts.length - 1]);
                endSpark.name = 'chain_end_spark';
                group.add(endSpark);
              }
              // Outer crackling field
              const crackleField = new THREE.Mesh(
                new THREE.SphereGeometry(r * 1.8, 27, 23),
                new THREE.MeshStandardMaterial({ color: 0x6688ff, emissive: 0x4466cc, emissiveIntensity: 0.4, transparent: true, opacity: 0.1, side: THREE.DoubleSide })
              );
              group.add(crackleField);
              group.userData.skillType = 'CHAIN_LIGHTNING';
              // Initial chain lightning beam (visible for first 0.3s)
              const beamSegs = 8;
              const beamPts: THREE.Vector3[] = [];
              for (let s = 0; s <= beamSegs; s++) {
                const t = s / beamSegs;
                beamPts.push(new THREE.Vector3(
                  -t * r * 6 + (s > 0 && s < beamSegs ? (Math.random() - 0.5) * r * 1.5 : 0),
                  (Math.random() - 0.5) * r * 0.8,
                  (Math.random() - 0.5) * r * 0.8,
                ));
              }
              const beamCurve = new THREE.CatmullRomCurve3(beamPts);
              const beamGeo = new THREE.TubeGeometry(beamCurve, 16, r * 0.12, 4, false);
              const beamMat = new THREE.MeshStandardMaterial({
                color: 0xeeffff, emissive: 0xaaddff, emissiveIntensity: 6.0,
                transparent: true, opacity: 0.9,
              });
              const beamMesh = new THREE.Mesh(beamGeo, beamMat);
              beamMesh.name = 'chain_beam';
              group.add(beamMesh);
              // Secondary thinner beam
              const beam2Pts: THREE.Vector3[] = [];
              for (let s = 0; s <= beamSegs; s++) {
                const t = s / beamSegs;
                beam2Pts.push(new THREE.Vector3(
                  -t * r * 6 + (s > 0 && s < beamSegs ? (Math.random() - 0.5) * r * 2.0 : 0),
                  (Math.random() - 0.5) * r * 1.0,
                  (Math.random() - 0.5) * r * 1.0,
                ));
              }
              const beam2Curve = new THREE.CatmullRomCurve3(beam2Pts);
              const beam2Geo = new THREE.TubeGeometry(beam2Curve, 16, r * 0.06, 4, false);
              const beam2Mat = new THREE.MeshStandardMaterial({
                color: 0xccddff, emissive: 0x8899ff, emissiveIntensity: 4.0,
                transparent: true, opacity: 0.7,
              });
              const beam2Mesh = new THREE.Mesh(beam2Geo, beam2Mat);
              beam2Mesh.name = 'chain_beam';
              group.add(beam2Mesh);
              break;
            }
            case SkillId.POISON_ARROW: {
              // ── POISON ARROW — Venomous arrow with toxic dripping trail ──
              // Arrow shaft
              const pShaft = new THREE.Mesh(
                new THREE.CylinderGeometry(0.025, 0.025, r * 3.5, 23),
                new THREE.MeshStandardMaterial({ color: 0x5a4a1a, emissive: 0x221100, emissiveIntensity: 0.2 })
              );
              pShaft.rotation.z = Math.PI / 2;
              group.add(pShaft);
              // Poison-coated head — green glowing cone
              const pHead = new THREE.Mesh(
                new THREE.ConeGeometry(r * 0.3, r * 0.5, 17),
                new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22cc22, emissiveIntensity: 2.5, metalness: 0.6, roughness: 0.2 })
              );
              pHead.rotation.z = -Math.PI / 2;
              pHead.position.x = r * 2.0;
              group.add(pHead);
              // Feathered tail
              for (let i = 0; i < 2; i++) {
                const pFeather = new THREE.Mesh(
                  new THREE.BoxGeometry(r * 0.45, r * 0.25, 0.015),
                  new THREE.MeshStandardMaterial({ color: 0xccbb88, emissive: 0x443322, emissiveIntensity: 0.15 })
                );
                pFeather.position.set(-r * 1.5, (i === 0 ? 1 : -1) * r * 0.12, 0);
                pFeather.rotation.z = (i === 0 ? 0.15 : -0.15);
                group.add(pFeather);
              }
              // Dripping poison blobs — trailing below and behind
              for (let i = 0; i < 5; i++) {
                const blob = new THREE.Mesh(
                  new THREE.SphereGeometry(r * (0.06 + Math.random() * 0.08), 20, 17),
                  new THREE.MeshStandardMaterial({
                    color: 0x33dd33, emissive: 0x22aa22, emissiveIntensity: 1.5,
                    transparent: true, opacity: 0.5 + Math.random() * 0.3,
                  })
                );
                blob.position.set(
                  -r * 0.5 - i * r * 0.4,
                  -r * 0.2 - i * r * 0.15,
                  (Math.random() - 0.5) * r * 0.3
                );
                blob.name = 'poison_blob';
                group.add(blob);
              }
              // Toxic mist aura around head
              const toxicMist = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.8, 27, 23),
                new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 0.6, transparent: true, opacity: 0.15 })
              );
              toxicMist.position.x = r * 1.0;
              group.add(toxicMist);
              group.userData.skillType = 'POISON_ARROW';
              break;
            }
            case SkillId.MULTI_SHOT:
            case SkillId.PIERCING_SHOT: {
              // ── MULTI-SHOT / PIERCING SHOT — Sleek arrow with speed lines and impact glow ──
              const isPiercing = proj.skillId === SkillId.PIERCING_SHOT;
              // Arrow shaft — longer, sleeker
              const aShaft = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.025, r * 4, 23),
                new THREE.MeshStandardMaterial({ color: 0x8b6914, emissive: 0x442200, emissiveIntensity: 0.3 })
              );
              aShaft.rotation.z = Math.PI / 2;
              group.add(aShaft);
              // Arrowhead — metallic, sharp
              const aHead = new THREE.Mesh(
                new THREE.ConeGeometry(r * 0.25, r * 0.5, 17),
                new THREE.MeshStandardMaterial({
                  color: isPiercing ? 0xddddff : 0xbbbbbb,
                  emissive: isPiercing ? 0x8888ff : 0x444444,
                  emissiveIntensity: isPiercing ? 1.5 : 0.5,
                  metalness: 0.9, roughness: 0.15,
                })
              );
              aHead.rotation.z = -Math.PI / 2;
              aHead.position.x = r * 2.3;
              group.add(aHead);
              // Feathered tail
              for (let i = 0; i < 3; i++) {
                const aFeather = new THREE.Mesh(
                  new THREE.BoxGeometry(r * 0.35, r * 0.2, 0.01),
                  new THREE.MeshStandardMaterial({ color: i < 2 ? 0xddccaa : 0xcc4444, emissive: 0x332211, emissiveIntensity: 0.1 })
                );
                const featherAngle = ((i - 1) / 2) * Math.PI * 0.25;
                aFeather.position.set(-r * 1.6, Math.sin(featherAngle) * r * 0.15, Math.cos(featherAngle) * r * 0.15);
                group.add(aFeather);
              }
              // Speed lines — thin stretched translucent trails behind
              for (let i = 0; i < 3; i++) {
                const speedLine = new THREE.Mesh(
                  new THREE.BoxGeometry(r * 2.5, 0.008, 0.008),
                  new THREE.MeshStandardMaterial({
                    color: isPiercing ? 0x8888ff : 0xffffff,
                    emissive: isPiercing ? 0x6666cc : 0xaaaaaa,
                    emissiveIntensity: isPiercing ? 2.0 : 0.8,
                    transparent: true, opacity: 0.3,
                  })
                );
                speedLine.position.set(-r * 2.0, (Math.random() - 0.5) * r * 0.4, (Math.random() - 0.5) * r * 0.4);
                speedLine.name = 'speed_line';
                group.add(speedLine);
              }
              if (isPiercing) {
                // Piercing glow at tip
                const pierceGlow = new THREE.Mesh(
                  new THREE.SphereGeometry(r * 0.3, 23, 17),
                  new THREE.MeshStandardMaterial({ color: 0xaaaaff, emissive: 0x8888ff, emissiveIntensity: 2.5, transparent: true, opacity: 0.4 })
                );
                pierceGlow.position.x = r * 2.5;
                group.add(pierceGlow);
              }
              group.userData.skillType = 'ARROW';
              break;
            }
            case SkillId.ARCANE_MISSILES: {
              // ── ARCANE MISSILES — Swirling purple energy with runic ring and star sparkles ──
              // Core arcane orb
              const arcCore = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.5, 30, 27),
                new THREE.MeshStandardMaterial({ color: 0xcc66ff, emissive: 0xaa44ee, emissiveIntensity: 3.0 })
              );
              group.add(arcCore);
              // Inner white flash
              const arcFlash = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.2, 23, 20),
                new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeeddff, emissiveIntensity: 4.0 })
              );
              group.add(arcFlash);
              // Arcane rings — 2 perpendicular tori
              for (let i = 0; i < 2; i++) {
                const arcRing = new THREE.Mesh(
                  new THREE.TorusGeometry(r * 0.75, r * 0.04, 27, 46),
                  new THREE.MeshStandardMaterial({ color: 0xdd88ff, emissive: 0xbb66ee, emissiveIntensity: 2.5 })
                );
                if (i === 0) arcRing.rotation.x = Math.PI / 2;
                else arcRing.rotation.z = Math.PI / 2;
                arcRing.name = 'arcane_ring';
                group.add(arcRing);
              }
              // Orbiting sparkle motes
              for (let i = 0; i < 6; i++) {
                const mote = new THREE.Mesh(
                  new THREE.OctahedronGeometry(r * 0.07, 2),
                  new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeeddff, emissiveIntensity: 3.5 })
                );
                const ma = (i / 6) * Math.PI * 2;
                const md = r * (0.9 + Math.random() * 0.3);
                mote.position.set(Math.cos(ma) * md, Math.sin(ma) * r * 0.4, Math.sin(ma) * md);
                mote.name = 'arcane_mote';
                group.add(mote);
              }
              // Purple trail wisps
              for (let i = 0; i < 3; i++) {
                const trail = new THREE.Mesh(
                  new THREE.SphereGeometry(r * (0.1 + i * 0.05), 20, 17),
                  new THREE.MeshStandardMaterial({ color: 0x8833cc, emissive: 0x6622aa, emissiveIntensity: 1.5, transparent: true, opacity: 0.3 - i * 0.08 })
                );
                trail.position.x = -r * (0.5 + i * 0.6);
                trail.name = 'arcane_trail';
                group.add(trail);
              }
              group.userData.skillType = 'ARCANE_MISSILES';
              break;
            }
            case SkillId.FIRE_VOLLEY: {
              // ── FIRE VOLLEY — Flaming arrow with blazing trail ──
              // Arrow shaft
              const fvShaft = new THREE.Mesh(
                new THREE.CylinderGeometry(0.025, 0.025, r * 3.5, 23),
                new THREE.MeshStandardMaterial({ color: 0x5a3a0a, emissive: 0x331100, emissiveIntensity: 0.3 })
              );
              fvShaft.rotation.z = Math.PI / 2;
              group.add(fvShaft);
              // Fiery arrowhead
              const fvHead = new THREE.Mesh(
                new THREE.ConeGeometry(r * 0.3, r * 0.5, 17),
                new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 3.0 })
              );
              fvHead.rotation.z = -Math.PI / 2;
              fvHead.position.x = r * 2.0;
              group.add(fvHead);
              // Flame wrapping the tip
              for (let i = 0; i < 4; i++) {
                const tipFlame = new THREE.Mesh(
                  new THREE.ConeGeometry(r * 0.15, r * 0.4, 17),
                  new THREE.MeshStandardMaterial({
                    color: i % 2 === 0 ? 0xffaa00 : 0xff4400,
                    emissive: i % 2 === 0 ? 0xff8800 : 0xcc2200,
                    emissiveIntensity: 2.5, transparent: true, opacity: 0.7,
                  })
                );
                const flameA = (i / 4) * Math.PI * 2;
                tipFlame.position.set(r * 1.5, Math.sin(flameA) * r * 0.3, Math.cos(flameA) * r * 0.3);
                tipFlame.lookAt(r * 3, Math.sin(flameA) * r * 0.5, Math.cos(flameA) * r * 0.5);
                tipFlame.name = 'volley_flame';
                group.add(tipFlame);
              }
              // Fire trail — elongated cones behind
              for (let i = 0; i < 4; i++) {
                const fireTrail = new THREE.Mesh(
                  new THREE.ConeGeometry(r * (0.08 + i * 0.03), r * (0.5 + i * 0.15), 20),
                  new THREE.MeshStandardMaterial({
                    color: 0xff4400, emissive: 0xcc2200, emissiveIntensity: 1.5 - i * 0.3,
                    transparent: true, opacity: 0.4 - i * 0.08,
                  })
                );
                fireTrail.rotation.z = Math.PI / 2;
                fireTrail.position.x = -r * (0.8 + i * 0.6);
                fireTrail.name = 'fire_trail';
                group.add(fireTrail);
              }
              group.userData.skillType = 'FIRE_VOLLEY';
              break;
            }
            default: {
              // ── DEFAULT PLAYER PROJECTILE — Glowing energy ball with ring ──
              const defCore = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.6, 30, 27),
                new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 2.5 })
              );
              group.add(defCore);
              const defGlow = new THREE.Mesh(
                new THREE.SphereGeometry(r * 1.0, 27, 23),
                new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.6, transparent: true, opacity: 0.2 })
              );
              group.add(defGlow);
              const defRing = new THREE.Mesh(
                new THREE.TorusGeometry(r * 0.7, r * 0.04, 23, 44),
                new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa00, emissiveIntensity: 1.5 })
              );
              defRing.name = 'default_ring';
              group.add(defRing);
              group.userData.skillType = 'DEFAULT';
              break;
            }
          }
        } else {
          // No skillId, default
          const core = new THREE.Mesh(
            new THREE.SphereGeometry(r * 0.7, 27, 23),
            new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 1.5 })
          );
          group.add(core);
        }

        group.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).castShadow = true;
        });
        mesh = group;
        ctx.scene.add(mesh);
        ctx.projectileMeshes.set(proj.id, mesh);
      }

      mesh.position.set(proj.x, proj.y, proj.z);

      // ── Per-frame projectile animation based on skill type ──
      const st = (mesh as THREE.Group).userData?.skillType;
      const t = ctx.time;

      if (st === 'FIREBALL') {
        // Flickering rotation, pulsing flames
        mesh.rotation.y += 0.08;
        mesh.rotation.x += 0.04;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'flame_tendril') {
            child.rotation.x += (Math.random() - 0.5) * 0.15;
            child.rotation.z += (Math.random() - 0.5) * 0.15;
            const s = 0.8 + Math.sin(t * 12 + child.position.x * 5) * 0.3;
            child.scale.setScalar(s);
          } else if (child.name === 'smoke_wisp') {
            child.position.y += 0.02;
            child.position.x += (Math.random() - 0.5) * 0.01;
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity - 0.005);
            }
          } else if (child.name === 'ember') {
            const ea = t * 6 + child.position.z * 10;
            const ed = 0.15 + Math.sin(ea) * 0.05;
            child.position.x = Math.cos(ea) * ed * 5;
            child.position.z = Math.sin(ea) * ed * 5;
            child.position.y += Math.sin(t * 8 + child.position.x) * 0.01;
          }
        });
      } else if (st === 'ICE_NOVA') {
        // Slow majestic rotation with orbiting shards
        mesh.rotation.y += 0.03;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'ice_shard') {
            child.rotation.y += 0.02;
            child.rotation.x += 0.01;
          } else if (child.name === 'frost_particle') {
            const fa = t * 3 + child.position.z * 5;
            const fd = child.position.length() || 0.1;
            child.position.x = Math.cos(fa) * fd;
            child.position.z = Math.sin(fa) * fd;
          }
        });
      } else if (st === 'LIGHTNING_BOLT') {
        // Flickering intensity, jittering sparks — the bolt should feel alive
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'lightning_spark') {
            child.position.x += (Math.random() - 0.5) * 0.06;
            child.position.y += (Math.random() - 0.5) * 0.06;
            child.position.z += (Math.random() - 0.5) * 0.06;
            const vis = Math.random() > 0.3;
            child.visible = vis;
          }
        });
        // Subtle bolt flicker
        const flicker = 0.7 + Math.random() * 0.3;
        mesh.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (mat.emissiveIntensity > 2) {
              mat.emissiveIntensity *= flicker;
            }
          }
        });
        // Orient bolt along velocity
        if (proj.vx !== 0 || proj.vz !== 0) {
          mesh.rotation.y = Math.atan2(proj.vx, proj.vz);
        }
      } else if (st === 'CHAIN_LIGHTNING') {
        // Chaotic crackling — shell spins, arcs flicker randomly
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'chain_shell') {
            child.rotation.x += 0.1;
            child.rotation.y += 0.15;
          } else if (child.name === 'chain_arc') {
            child.visible = Math.random() > 0.15; // flicker
          } else if (child.name === 'chain_end_spark') {
            child.visible = Math.random() > 0.2;
            const s = 0.5 + Math.random() * 1.0;
            child.scale.setScalar(s);
          }
        });
        mesh.rotation.y += 0.02;
        // Fade out initial beam
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'chain_beam') {
            if (proj.lifetime < 0.3) {
              child.visible = true;
              if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
                ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.9 * (1 - proj.lifetime / 0.3);
              }
            } else {
              child.visible = false;
            }
          }
        });
      } else if (st === 'POISON_ARROW') {
        // Dripping animation — blobs drift down, orient along velocity
        if (proj.vx !== 0 || proj.vz !== 0) {
          mesh.rotation.y = Math.atan2(proj.vx, proj.vz);
        }
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'poison_blob') {
            child.position.y -= 0.008;
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0.1, ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity - 0.003);
            }
          }
        });
      } else if (st === 'ARROW') {
        // Orient along velocity, speed line shimmer
        if (proj.vx !== 0 || proj.vz !== 0) {
          mesh.rotation.y = Math.atan2(proj.vx, proj.vz);
        }
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'speed_line') {
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.15 + Math.random() * 0.25;
            }
          }
        });
      } else if (st === 'ARCANE_MISSILES') {
        // Rings spin, motes orbit
        mesh.rotation.y += 0.06;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'arcane_ring') {
            child.rotation.z += 0.08;
            child.rotation.x += 0.05;
          } else if (child.name === 'arcane_mote') {
            const ma = t * 5 + child.position.z * 8;
            const md = 0.12;
            child.position.x = Math.cos(ma) * md * 6;
            child.position.z = Math.sin(ma) * md * 6;
            child.position.y = Math.sin(ma * 1.3) * md * 3;
          } else if (child.name === 'arcane_trail') {
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              const op = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
              op.opacity = 0.15 + Math.sin(t * 6) * 0.1;
            }
          }
        });
      } else if (st === 'FIRE_VOLLEY') {
        // Orient along velocity, animate flames
        if (proj.vx !== 0 || proj.vz !== 0) {
          mesh.rotation.y = Math.atan2(proj.vx, proj.vz);
        }
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'volley_flame') {
            const s = 0.7 + Math.sin(t * 15 + child.position.y * 10) * 0.4;
            child.scale.setScalar(s);
          } else if (child.name === 'fire_trail') {
            const s = 0.6 + Math.sin(t * 10 + child.position.x * 5) * 0.3;
            child.scale.y = s;
          }
        });
      } else if (st === 'DEFAULT') {
        mesh.rotation.y += 0.06;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'default_ring') {
            child.rotation.x += 0.04;
            child.rotation.z += 0.06;
          }
        });
      } else if (st === 'ENEMY_FIRE') {
        mesh.rotation.y += 0.06;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'enemy_flame') {
            // Multi-frequency flickering for more realistic fire
            const s = 0.5 + Math.sin(t * 14 + child.position.x * 8) * 0.35
              + Math.sin(t * 22 + child.position.z * 6) * 0.15;
            child.scale.setScalar(s);
            child.scale.y = s * (1.0 + Math.sin(t * 18 + child.position.x * 4) * 0.3);
            child.rotation.x += (Math.random() - 0.5) * 0.15;
            child.rotation.z = Math.sin(t * 8 + child.position.x * 3) * 0.2;
            // Vertical dancing movement
            child.position.y += Math.sin(t * 10 + child.position.x * 5) * 0.003;
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0 + Math.sin(t * 12) * 1.0;
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.5 + Math.sin(t * 15 + child.position.z * 4) * 0.2;
            }
          }
        });
      } else if (st === 'ENEMY_ICE') {
        mesh.rotation.y += 0.025;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'enemy_ice_shard') {
            child.rotation.y += 0.02;
            child.rotation.x += 0.012;
            // Shimmering glow effect
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + Math.sin(t * 5 + child.position.x * 4) * 0.6;
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.6 + Math.sin(t * 3 + child.position.z * 3) * 0.15;
            }
            // Subtle scale breathing
            const crystalPulse = 1.0 + Math.sin(t * 4 + child.position.y * 3) * 0.08;
            child.scale.y = 1.0 * crystalPulse;
          }
        });
      } else if (st === 'ENEMY_LIGHTNING') {
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'enemy_spark') {
            child.position.x += (Math.random() - 0.5) * 0.05;
            child.position.y += (Math.random() - 0.5) * 0.05;
            child.position.z += (Math.random() - 0.5) * 0.05;
            child.visible = Math.random() > 0.25;
          }
        });
        const ef = 0.6 + Math.random() * 0.4;
        mesh.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (m.emissiveIntensity > 3) m.emissiveIntensity *= ef;
          }
        });
      } else if (st === 'ENEMY_POISON') {
        mesh.rotation.y += 0.03;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'enemy_poison_drip') {
            child.position.y -= 0.007;
            // Drips sway as they fall
            child.position.x += Math.sin(t * 6 + child.position.y * 4) * 0.001;
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0.08, ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity - 0.002);
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + Math.sin(t * 8) * 0.5;
            }
            // Growing drip size as it falls
            const dripScale = 1.0 + Math.max(0, -child.position.y) * 0.3;
            child.scale.setScalar(Math.min(1.5, dripScale));
          } else if (child.name === 'poison_blob') {
            // Blobs pulse and breathe
            const blobPulse = 1.0 + Math.sin(t * 5 + child.position.x * 4) * 0.15;
            child.scale.setScalar(blobPulse);
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + Math.sin(t * 6 + child.position.z * 3) * 0.5;
            }
          }
        });
      } else if (st === 'ENEMY_SHADOW') {
        mesh.rotation.y += 0.04;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'enemy_vortex_ring') {
            child.rotation.x += 0.07;
            child.rotation.z += 0.05;
            // Pulsing scale for vortex rings
            const vortexPulse = 1.0 + Math.sin(t * 6) * 0.12;
            child.scale.setScalar(vortexPulse);
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + Math.sin(t * 4) * 0.3;
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.3 + Math.sin(t * 8) * 0.1;
            }
          } else if (child.name === 'enemy_shadow_mote') {
            // More complex orbital path with varying speed
            const ma = t * 4.5 + child.position.z * 6;
            const md = 0.1;
            const orbitExpand = 1.0 + Math.sin(t * 2) * 0.3;
            child.position.x = Math.cos(ma) * md * 7 * orbitExpand;
            child.position.z = Math.sin(ma) * md * 7 * orbitExpand;
            child.position.y = Math.sin(ma * 1.5) * md * 4;
            // Flickering visibility and glow
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.3 + Math.sin(t * 10 + ma) * 0.2;
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(t * 7 + ma * 2) * 0.4;
            }
          }
        });
      } else if (st === 'ENEMY_RED') {
        mesh.rotation.y += 0.05;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'enemy_red_aura') {
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              // Multi-layered pulsing: slow breathing + fast flicker
              const slowPulse = Math.sin(t * 3) * 0.06;
              const fastPulse = Math.sin(t * 10) * 0.04;
              const microFlicker = Math.sin(t * 25) * 0.02;
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.18 + slowPulse + fastPulse + microFlicker;
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(t * 5) * 0.4;
              // Scale-pulsing glow
              const scaleBreath = 1.0 + Math.sin(t * 2.5) * 0.08;
              child.scale.setScalar(scaleBreath);
            }
          } else if (child.name === 'enemy_spike') {
            child.rotation.y += 0.04;
            // Spikes pulse outward
            const spikeScale = 1.0 + Math.sin(t * 6 + child.position.x * 5) * 0.15;
            child.scale.y = spikeScale;
          }
        });
      } else {
        // Fallback generic rotation
        mesh.rotation.y += 0.05;
        mesh.rotation.x += 0.03;
      }
    }
}
