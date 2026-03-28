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

    // Boss ring (multi-layered with runes)
    const def = ENEMY_DEFS[type];
    if (def.isBoss) {
      const r = 1.2 * scale;
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.5,
      });
      const ringGlowMat = new THREE.MeshStandardMaterial({
        color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.0,
        transparent: true, opacity: 0.4, depthWrite: false,
      });
      const runeMat = new THREE.MeshStandardMaterial({
        color: 0xff8844, emissive: 0xff4400, emissiveIntensity: 2.0,
        transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide,
      });

      // Outer ring
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 12, 48), ringMat);
      outerRing.rotation.x = -Math.PI / 2;
      outerRing.position.y = 0.05;
      outerRing.name = 'boss-ring-outer';
      group.add(outerRing);

      // Inner ring (thinner, brighter)
      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, 0.03, 10, 48), ringMat);
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.y = 0.06;
      innerRing.name = 'boss-ring-inner';
      group.add(innerRing);

      // Ground glow disc
      const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(r * 1.1, 32), new THREE.MeshStandardMaterial({
        color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide,
      }));
      glowDisc.rotation.x = -Math.PI / 2;
      glowDisc.position.y = 0.02;
      group.add(glowDisc);

      // Rune symbols around the ring (8 runes)
      for (let ri = 0; ri < 8; ri++) {
        const runeAngle = (ri / 8) * Math.PI * 2;
        const runeR = r * 0.9;
        // Rune disc
        const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.18 * scale, 0.18 * scale), runeMat);
        rune.position.set(Math.cos(runeAngle) * runeR, 0.07, Math.sin(runeAngle) * runeR);
        rune.rotation.x = -Math.PI / 2;
        rune.rotation.z = -runeAngle;
        rune.name = `boss-rune-${ri}`;
        group.add(rune);
      }

      // Star/pentagram lines through center (5 lines)
      for (let si = 0; si < 5; si++) {
        const lineAngle = (si / 5) * Math.PI;
        const line = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, 0.02 * scale), ringGlowMat);
        line.rotation.x = -Math.PI / 2;
        line.rotation.z = lineAngle;
        line.position.y = 0.04;
        group.add(line);
      }

      // Corner flame markers (4 small emissive spheres)
      for (let fi = 0; fi < 4; fi++) {
        const fAngle = (fi / 4) * Math.PI * 2 + Math.PI / 4;
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.06 * scale, 16, 12), new THREE.MeshStandardMaterial({
          color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 3.0,
        }));
        flame.position.set(Math.cos(fAngle) * r, 0.15, Math.sin(fAngle) * r);
        flame.name = `boss-flame-${fi}`;
        group.add(flame);
      }
    }

    return group;
}
