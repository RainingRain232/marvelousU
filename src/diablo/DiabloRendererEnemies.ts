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

    // Boss ring
    const def = ENEMY_DEFS[type];
    if (def.isBoss) {
      const ringGeo = new THREE.TorusGeometry(1.2 * scale, 0.05, 35, 66);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xff4400,
        emissive: 0xff2200,
        emissiveIntensity: 1.5,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      group.add(ring);
    }

    return group;
}
