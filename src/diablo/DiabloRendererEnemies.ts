import * as THREE from 'three';
import { EnemyType } from './DiabloTypes';
import { ENEMY_DEFS } from './DiabloConfig';
import { createBasicEnemyMesh } from './DiabloRendererEnemiesBasic';
import { createHellEnemyMesh } from './DiabloRendererEnemiesHell';
import { createWildEnemyMesh } from './DiabloRendererEnemiesWild';
import { createBossEnemyMesh } from './DiabloRendererEnemiesBoss';

export function createEnemyMesh(type: EnemyType, scale: number): THREE.Group {
    const group = new THREE.Group();

    if (createBasicEnemyMesh(type, scale, group)) { /* matched */ }
    else if (createHellEnemyMesh(type, scale, group)) { /* matched */ }
    else if (createWildEnemyMesh(type, scale, group)) { /* matched */ }
    else { createBossEnemyMesh(type, scale, group); }

    group.scale.setScalar(scale);

    // Boss ground effect — subtle dark magic circle with radial fade
    const def = ENEMY_DEFS[type];
    if (def.isBoss) {
      const r = 1.2 * scale;

      // Radial gradient ground glow — built with concentric rings that fade out
      // This replaces the hard torus edge rings with a smooth vignette
      const ringCount = 6;
      for (let ri = 0; ri < ringCount; ri++) {
        const frac = ri / ringCount;
        const ringR = r * (0.3 + frac * 0.8);
        const opacity = 0.15 * (1 - frac * 0.7); // brighter center, fading edge
        const disc = new THREE.Mesh(
          new THREE.RingGeometry(ringR - r * 0.12, ringR + r * 0.04, 48),
          new THREE.MeshStandardMaterial({
            color: 0x440000, emissive: 0x880000, emissiveIntensity: 0.6 * (1 - frac * 0.5),
            transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
          })
        );
        disc.rotation.x = -Math.PI / 2;
        disc.position.y = 0.02;
        group.add(disc);
      }

      // Central glow pool (very subtle)
      const centerGlow = new THREE.Mesh(
        new THREE.CircleGeometry(r * 0.4, 32),
        new THREE.MeshStandardMaterial({
          color: 0x330000, emissive: 0xaa2200, emissiveIntensity: 0.8,
          transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide,
        })
      );
      centerGlow.rotation.x = -Math.PI / 2;
      centerGlow.position.y = 0.025;
      group.add(centerGlow);

      // Thin outer boundary — barely visible wispy ring (no solid torus)
      const outerRing = new THREE.Mesh(
        new THREE.RingGeometry(r * 0.98, r * 1.02, 64),
        new THREE.MeshStandardMaterial({
          color: 0x220000, emissive: 0x660000, emissiveIntensity: 0.4,
          transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide,
        })
      );
      outerRing.rotation.x = -Math.PI / 2;
      outerRing.position.y = 0.03;
      outerRing.name = 'boss-ring-outer';
      group.add(outerRing);

      // Inner ring — slightly brighter thin band
      const innerRing = new THREE.Mesh(
        new THREE.RingGeometry(r * 0.58, r * 0.62, 64),
        new THREE.MeshStandardMaterial({
          color: 0x330000, emissive: 0x770000, emissiveIntensity: 0.5,
          transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide,
        })
      );
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.y = 0.03;
      innerRing.name = 'boss-ring-inner';
      group.add(innerRing);

      // Subtle rune symbols — small, dim, floating close to ground
      const runeMat = new THREE.MeshStandardMaterial({
        color: 0x882200, emissive: 0x661100, emissiveIntensity: 1.2,
        transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide,
      });
      for (let ri = 0; ri < 8; ri++) {
        const runeAngle = (ri / 8) * Math.PI * 2;
        const runeR = r * 0.78;
        const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.12 * scale, 0.12 * scale), runeMat);
        rune.position.set(Math.cos(runeAngle) * runeR, 0.04, Math.sin(runeAngle) * runeR);
        rune.rotation.x = -Math.PI / 2;
        rune.rotation.z = -runeAngle;
        rune.name = `boss-rune-${ri}`;
        group.add(rune);
      }

      // Faint pentagram lines — very thin and ghostly
      const lineMat = new THREE.MeshStandardMaterial({
        color: 0x440000, emissive: 0x550000, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide,
      });
      for (let si = 0; si < 5; si++) {
        const lineAngle = (si / 5) * Math.PI;
        const line = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.8, 0.015 * scale), lineMat);
        line.rotation.x = -Math.PI / 2;
        line.rotation.z = lineAngle;
        line.position.y = 0.035;
        group.add(line);
      }

      // Dim ember particles instead of bright flame spheres
      for (let fi = 0; fi < 4; fi++) {
        const fAngle = (fi / 4) * Math.PI * 2 + Math.PI / 4;
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.035 * scale, 10, 8), new THREE.MeshStandardMaterial({
          color: 0x882200, emissive: 0x661100, emissiveIntensity: 1.5,
          transparent: true, opacity: 0.5, depthWrite: false,
        }));
        flame.position.set(Math.cos(fAngle) * r * 0.85, 0.06, Math.sin(fAngle) * r * 0.85);
        flame.name = `boss-flame-${fi}`;
        group.add(flame);
      }
    }

    return group;
}
