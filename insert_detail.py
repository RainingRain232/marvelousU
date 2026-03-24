#!/usr/bin/env python3
"""Insert 150+ lines of mesh detail into each of 6 creature build methods."""

import re

FILE = "/home/rain/Bureaublad/workspace6/marvelousU/src/warband/view/WarbandCreatureRenderer.ts"

# Each insertion is keyed by a unique string that appears just before the method's closing `}`
# We insert BEFORE the closing `}` of each method.

INSERTIONS = {
    # _buildWarGolem - insert after "Rune accents on body" loop, before closing }
    "_buildWarGolem": {
        "marker": """    // Rune accents on body
    for (let i = 0; i < 6; i++) {
      const rGeo = new THREE.SphereGeometry(0.04, 10, 10);
      const r = new THREE.Mesh(rGeo, runeMat);
      r.position.set((Math.random() - 0.5) * 0.7, 2.2 + i * 0.25, (Math.random() > 0.5 ? 0.42 : -0.42));
      this._body.add(r);
    }
  }""",
        "replacement_suffix": """
    // --- Enhanced detail: stone surface weathering and erosion ---
    for (let i = 0; i < 8; i++) {
      const erosionGeo = new THREE.BoxGeometry(0.012, 0.25 + Math.random() * 0.35, 0.008);
      const erosion = new THREE.Mesh(erosionGeo, crackMat);
      const wgAngle = (i / 8) * Math.PI * 2;
      erosion.position.set(Math.cos(wgAngle) * 0.44, 2.3 + Math.random() * 0.9, Math.sin(wgAngle) * 0.36);
      erosion.rotation.set(0, -wgAngle, (Math.random() - 0.5) * 0.6);
      this._body.add(erosion);
    }

    // Weathered stone pitting across body
    for (let i = 0; i < 12; i++) {
      const pitGeo = new THREE.SphereGeometry(0.02 + Math.random() * 0.015, 6, 6);
      const pit = new THREE.Mesh(pitGeo, crackMat);
      const pitA = Math.random() * Math.PI * 2;
      pit.position.set(Math.cos(pitA) * (0.35 + Math.random() * 0.1), 2.1 + Math.random() * 1.4, Math.sin(pitA) * (0.28 + Math.random() * 0.1));
      pit.scale.set(1, 1, 0.3);
      this._body.add(pit);
    }

    // --- Carved rune channels connecting rune nodes ---
    for (let i = 0; i < 5; i++) {
      const chGeo = new THREE.BoxGeometry(0.008, 0.35, 0.005);
      const ch = new THREE.Mesh(chGeo, runeMat);
      ch.position.set((Math.random() - 0.5) * 0.6, 2.3 + i * 0.22, 0.43);
      ch.rotation.z = (Math.random() - 0.5) * 0.8;
      this._body.add(ch);
    }

    // Horizontal rune channels on sides
    for (let i = 0; i < 4; i++) {
      for (const side of [-1, 1]) {
        const hChGeo = new THREE.BoxGeometry(0.005, 0.008, 0.2 + Math.random() * 0.15);
        const hCh = new THREE.Mesh(hChGeo, runeMat);
        hCh.position.set(side * 0.44, 2.4 + i * 0.3, (Math.random() - 0.5) * 0.3);
        this._body.add(hCh);
      }
    }

    // --- Stone joint mechanisms ---
    for (const side of [-1, 1]) {
      const pivotGeo = new THREE.TorusGeometry(0.16, 0.025, 8, 14);
      const pivot = new THREE.Mesh(pivotGeo, darkStoneMat);
      pivot.position.set(side * 0.6, 3.2, 0);
      pivot.rotation.y = Math.PI / 2;
      this._body.add(pivot);

      const iPivotGeo = new THREE.TorusGeometry(0.1, 0.015, 6, 12);
      const iPivot = new THREE.Mesh(iPivotGeo, runeMat);
      iPivot.position.set(side * 0.6, 3.2, 0);
      iPivot.rotation.y = Math.PI / 2;
      this._body.add(iPivot);

      const shPlateGeo = new THREE.SphereGeometry(0.18, 10, 8);
      const shPlate = new THREE.Mesh(shPlateGeo, stoneM);
      shPlate.position.set(side * 0.65, 3.35, 0);
      shPlate.scale.set(0.8, 0.5, 0.9);
      this._body.add(shPlate);
    }

    // Hip joint mechanisms
    for (const side of [-1, 1]) {
      const hipGeo = new THREE.TorusGeometry(0.12, 0.02, 8, 12);
      const hipP = new THREE.Mesh(hipGeo, darkStoneMat);
      hipP.position.set(side * 0.3, 1.8, 0);
      hipP.rotation.y = Math.PI / 2;
      this._body.add(hipP);
    }

    // --- Armored stone plating on limbs ---
    for (const side of [-1, 1]) {
      const wgArm = side === -1 ? this._leftArm : this._rightArm;
      for (let i = 0; i < 3; i++) {
        const bndGeo = new THREE.TorusGeometry(0.14, 0.012, 6, 10);
        const bnd = new THREE.Mesh(bndGeo, darkStoneMat);
        bnd.position.y = -0.2 - i * 0.2;
        bnd.rotation.x = Math.PI / 2;
        wgArm.add(bnd);
      }
      for (let i = 0; i < 4; i++) {
        const insGeo = new THREE.BoxGeometry(0.02, 0.06, 0.005);
        const ins = new THREE.Mesh(insGeo, runeMat);
        ins.position.set(0.1, -1.0 - i * 0.1, 0.06);
        ins.rotation.z = (Math.random() - 0.5) * 0.3;
        wgArm.add(ins);
      }
      for (let k = 0; k < 4; k++) {
        const knkGeo = new THREE.SphereGeometry(0.04, 8, 6);
        const knk = new THREE.Mesh(knkGeo, darkStoneMat);
        knk.position.set(-0.08 + k * 0.05, -1.62, 0.12);
        wgArm.add(knk);
      }
      for (let f = 0; f < 4; f++) {
        const fngGeo = cyl(0.025, 0.02, 0.12, 6);
        const fng = new THREE.Mesh(fngGeo, stoneM);
        fng.position.set(-0.07 + f * 0.05, -1.8, 0.1);
        fng.rotation.x = 0.4;
        wgArm.add(fng);
      }
    }

    // --- Leg armor plating ---
    for (const side of [-1, 1]) {
      const wgLeg = side === -1 ? this._leftLeg : this._rightLeg;
      for (let i = 0; i < 2; i++) {
        const tbGeo = new THREE.TorusGeometry(0.14, 0.012, 6, 10);
        const tb = new THREE.Mesh(tbGeo, darkStoneMat);
        tb.position.y = -0.25 - i * 0.25;
        tb.rotation.x = Math.PI / 2;
        wgLeg.add(tb);
      }
      const sgGeo = new THREE.BoxGeometry(0.08, 0.4, 0.03);
      const sg = new THREE.Mesh(sgGeo, stoneM);
      sg.position.set(0, -1.05, 0.12);
      wgLeg.add(sg);
      const kcGeo = new THREE.SphereGeometry(0.08, 8, 6);
      const kc = new THREE.Mesh(kcGeo, darkStoneMat);
      kc.position.set(0, -0.8, 0.1);
      kc.scale.set(0.8, 0.6, 0.5);
      wgLeg.add(kc);
      for (let t = -1; t <= 1; t++) {
        const toGeo = new THREE.SphereGeometry(0.05, 6, 5);
        const toMesh = new THREE.Mesh(toGeo, darkStoneMat);
        toMesh.position.set(t * 0.06, -1.52, 0.12);
        toMesh.scale.set(0.8, 0.4, 1.2);
        wgLeg.add(toMesh);
      }
    }

    // --- Back-mounted stone spine and dorsal plates ---
    for (let i = 0; i < 6; i++) {
      const spnGeo = new THREE.BoxGeometry(0.06, 0.12, 0.04);
      const spn = new THREE.Mesh(spnGeo, darkStoneMat);
      spn.position.set(0, 2.2 + i * 0.25, -0.42);
      spn.rotation.x = 0.2;
      this._body.add(spn);
    }
    for (let i = 0; i < 4; i++) {
      const drsGeo = new THREE.ConeGeometry(0.04, 0.1, 6);
      const drs = new THREE.Mesh(drsGeo, stoneM);
      drs.position.set(0, 2.4 + i * 0.3, -0.46);
      drs.rotation.x = -0.3;
      this._body.add(drs);
    }

    // --- Glowing rune circuit on back ---
    const bkRuneGeo = new THREE.TorusGeometry(0.3, 0.01, 8, 20);
    const bkRune = new THREE.Mesh(bkRuneGeo, runeMat);
    bkRune.position.set(0, 2.8, -0.41);
    this._body.add(bkRune);
    const ibRuneGeo = new THREE.TorusGeometry(0.18, 0.008, 6, 16);
    const ibRune = new THREE.Mesh(ibRuneGeo, runeMat);
    ibRune.position.set(0, 2.8, -0.40);
    this._body.add(ibRune);
    for (let i = 0; i < 4; i++) {
      const crGeo = new THREE.BoxGeometry(0.005, 0.35, 0.005);
      const crLine = new THREE.Mesh(crGeo, runeMat);
      crLine.position.set(0, 2.8, -0.40);
      crLine.rotation.z = (i / 4) * Math.PI;
      this._body.add(crLine);
    }

    // --- Head carved features ---
    const jwGeo = new THREE.SphereGeometry(0.18, 10, 8);
    const jwMesh = new THREE.Mesh(jwGeo, darkStoneMat);
    jwMesh.position.set(0, -0.1, 0.05);
    jwMesh.scale.set(0.9, 0.4, 0.7);
    this._head.add(jwMesh);
    const brGeo = new THREE.SphereGeometry(0.08, 8, 6);
    const brMesh = new THREE.Mesh(brGeo, darkStoneMat);
    brMesh.position.set(0, 0.1, 0.14);
    brMesh.scale.set(2.0, 0.4, 0.6);
    this._head.add(brMesh);
    for (const side of [-1, 1]) {
      const skGeo = new THREE.SphereGeometry(0.06, 8, 6);
      const sk = new THREE.Mesh(skGeo, crackMat);
      sk.position.set(side * 0.1, 0.02, 0.16);
      sk.scale.set(1, 1.2, 0.5);
      this._head.add(sk);
    }
    const mtGeo = new THREE.BoxGeometry(0.12, 0.01, 0.01);
    const mt = new THREE.Mesh(mtGeo, crackMat);
    mt.position.set(0, -0.06, 0.2);
    this._head.add(mt);
    const crGeo2 = new THREE.BoxGeometry(0.08, 0.08, 0.04);
    const crMesh = new THREE.Mesh(crGeo2, stoneM);
    crMesh.position.set(0, 0.18, 0);
    this._head.add(crMesh);

    // --- Energy glow effects ---
    const auGeo = new THREE.SphereGeometry(0.15, 12, 10);
    const au = new THREE.Mesh(auGeo, mat(0x44aaff, { emissive: 0x2266cc, emissiveIntensity: 1.5, transparent: true, opacity: 0.25 }));
    au.position.set(0, 2.8, 0.42);
    this._body.add(au);
    for (let i = 0; i < 8; i++) {
      const wsGeo = new THREE.SphereGeometry(0.015 + Math.random() * 0.01, 6, 6);
      const ws = new THREE.Mesh(wsGeo, mat(0x66ccff, { emissive: 0x44aadd, emissiveIntensity: 2.0, transparent: true, opacity: 0.6 }));
      const wsA = (i / 8) * Math.PI * 2;
      ws.position.set(Math.cos(wsA) * (0.6 + Math.random() * 0.3), 2.0 + Math.random() * 2.0, Math.sin(wsA) * (0.5 + Math.random() * 0.2));
      this._body.add(ws);
    }

    // Ground impact cracks
    for (let i = 0; i < 6; i++) {
      const gcGeo = new THREE.BoxGeometry(0.008, 0.005, 0.15 + Math.random() * 0.1);
      const gc = new THREE.Mesh(gcGeo, crackMat);
      const gcA = (i / 6) * Math.PI * 2;
      gc.position.set(Math.cos(gcA) * 0.3, 0.01, Math.sin(gcA) * 0.3);
      gc.rotation.y = gcA;
      this._body.add(gc);
    }

    // --- Stone texture variation patches ---
    for (let i = 0; i < 10; i++) {
      const ptGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 6, 5);
      const pt = new THREE.Mesh(ptGeo, i % 2 === 0 ? darkStoneMat : stoneM);
      const ptA = Math.random() * Math.PI * 2;
      pt.position.set(Math.cos(ptA) * (0.38 + Math.random() * 0.08), 2.0 + Math.random() * 1.5, Math.sin(ptA) * (0.3 + Math.random() * 0.06));
      pt.scale.set(1.2, 0.8, 0.3);
      this._body.add(pt);
    }

    // --- Golem power core visible in chest ---
    const coGeo = new THREE.SphereGeometry(0.08, 12, 10);
    const co = new THREE.Mesh(coGeo, mat(0x88ddff, { emissive: 0x44aaff, emissiveIntensity: 3.0, transparent: true, opacity: 0.8 }));
    co.position.set(0, 2.8, 0.35);
    this._body.add(co);
    const coRgGeo = new THREE.TorusGeometry(0.1, 0.008, 6, 16);
    const coRg = new THREE.Mesh(coRgGeo, runeMat);
    coRg.position.set(0, 2.8, 0.42);
    this._body.add(coRg);

    // Mossy growth patches (age/weathering)
    const mossyMat = mat(0x445533, { roughness: 0.9 });
    for (let i = 0; i < 6; i++) {
      const msGeo = new THREE.SphereGeometry(0.03 + Math.random() * 0.025, 6, 5);
      const ms = new THREE.Mesh(msGeo, mossyMat);
      ms.position.set((Math.random() - 0.5) * 0.8, 2.0 + Math.random() * 1.0, (Math.random() - 0.5) * 0.5);
      ms.scale.set(1.5, 0.5, 1.5);
      this._body.add(ms);
    }
  }"""
    },

    # _buildPitLord - insert after hooves loop, before closing }
    "_buildPitLord": {
        "marker": """      // Hooves
      const hoofGeo = new THREE.SphereGeometry(0.1, 12, 10);
      const hoof = new THREE.Mesh(hoofGeo, hornMat);
      hoof.scale.set(1, 0.5, 1.3);
      hoof.position.set(0, -1.6, 0.04);
      leg.add(hoof);
    }
  }

  // ---- Doom Guard builder""",
        "replacement_suffix": """
    // --- Enhanced detail: massive musculature definition ---
    // Lateral oblique muscles
    for (const side of [-1, 1]) {
      const obliqueGeo = new THREE.SphereGeometry(0.15, 10, 8);
      const oblique = new THREE.Mesh(obliqueGeo, muscleMat);
      oblique.position.set(side * 0.45, 3.0, 0.1);
      oblique.scale.set(0.6, 1.4, 0.5);
      this._body.add(oblique);
    }

    // Trapezius muscle mass
    for (const side of [-1, 1]) {
      const trapGeo = new THREE.SphereGeometry(0.2, 10, 8);
      const trap = new THREE.Mesh(trapGeo, muscleMat);
      trap.position.set(side * 0.35, 3.8, -0.15);
      trap.scale.set(0.7, 0.8, 0.6);
      this._body.add(trap);
    }

    // Back muscle ridges
    for (let i = 0; i < 4; i++) {
      for (const side of [-1, 1]) {
        const bkMuscGeo = new THREE.SphereGeometry(0.08, 8, 6);
        const bkMusc = new THREE.Mesh(bkMuscGeo, muscleMat);
        bkMusc.position.set(side * 0.2, 2.8 + i * 0.25, -0.4);
        bkMusc.scale.set(1.2, 0.8, 0.5);
        this._body.add(bkMusc);
      }
    }

    // --- Enhanced detail: demonic skin texture ---
    // Raised vein network on torso
    for (let i = 0; i < 10; i++) {
      const vnGeo = cyl(0.008, 0.005, 0.2 + Math.random() * 0.15, 4);
      const vn = new THREE.Mesh(vnGeo, darkMat);
      const vnA = Math.random() * Math.PI * 2;
      vn.position.set(Math.cos(vnA) * 0.42, 2.6 + Math.random() * 1.2, Math.sin(vnA) * 0.35);
      vn.rotation.set(Math.random() * 0.5, -vnA, Math.random() * 0.8);
      this._body.add(vn);
    }

    // Skin scars and battle damage
    for (let i = 0; i < 6; i++) {
      const scarGeo = new THREE.BoxGeometry(0.15 + Math.random() * 0.1, 0.008, 0.005);
      const scar = new THREE.Mesh(scarGeo, mat(0x440815, { roughness: 0.9 }));
      scar.position.set((Math.random() - 0.5) * 0.5, 2.5 + Math.random() * 1.5, 0.42);
      scar.rotation.z = (Math.random() - 0.5) * 0.6;
      this._body.add(scar);
    }

    // Demonic skin pustules
    for (let i = 0; i < 8; i++) {
      const pustGeo = new THREE.SphereGeometry(0.02 + Math.random() * 0.015, 6, 5);
      const pust = new THREE.Mesh(pustGeo, mat(0x991122, { emissive: 0x440808, emissiveIntensity: 0.8 }));
      const pustA = Math.random() * Math.PI * 2;
      pust.position.set(Math.cos(pustA) * 0.5, 2.4 + Math.random() * 1.6, Math.sin(pustA) * 0.42);
      this._body.add(pust);
    }

    // --- Enhanced detail: wing membrane detail ---
    for (const side of [-1, 1]) {
      const plArm = side === -1 ? this._leftArm : this._rightArm;
      // Secondary wing bones
      for (let b = 0; b < 3; b++) {
        const secBoneGeo = cyl(0.02, 0.01, 0.6, 6);
        const secBone = new THREE.Mesh(secBoneGeo, darkMat);
        secBone.position.set(side * (0.2 + b * 0.2), -0.3 - b * 0.15, 0.005);
        secBone.rotation.z = side * (0.4 + b * 0.1);
        plArm.add(secBone);
      }
      // Wing claw tips
      const wcGeo = new THREE.ConeGeometry(0.02, 0.08, 6);
      const wc = new THREE.Mesh(wcGeo, hornMat);
      wc.position.set(side * 0.15, 0.15, 0);
      wc.rotation.z = side * 0.5;
      plArm.add(wc);
      // Wing membrane tears
      for (let t = 0; t < 2; t++) {
        const tearGeo = new THREE.BoxGeometry(0.02, 0.04, 0.002);
        const tear = new THREE.Mesh(tearGeo, mat(0x220505, { transparent: true, opacity: 0.8 }));
        tear.position.set(side * (0.4 + t * 0.15), -0.6 - t * 0.1, 0.01);
        plArm.add(tear);
      }
    }

    // --- Enhanced detail: tail segments and spines ---
    for (let i = 0; i < 5; i++) {
      const tsGeo = new THREE.TorusGeometry(0.06 - i * 0.008, 0.01, 6, 8);
      const ts = new THREE.Mesh(tsGeo, darkMat);
      const tT = i / 5;
      ts.position.set(0, 2.5 - tT * 0.5, -0.5 - tT * 0.55);
      ts.rotation.x = 0.8;
      this._body.add(ts);
    }
    // Tail dorsal spines
    for (let i = 0; i < 4; i++) {
      const tdGeo = new THREE.ConeGeometry(0.015, 0.06, 5);
      const td = new THREE.Mesh(tdGeo, hornMat);
      const tdT = i / 4;
      td.position.set(0, 2.4 - tdT * 0.4, -0.55 - tdT * 0.45);
      td.rotation.x = -0.5;
      this._body.add(td);
    }

    // --- Enhanced detail: head facial features ---
    // Jaw musculature
    const plJawGeo = new THREE.SphereGeometry(0.15, 10, 8);
    const plJaw = new THREE.Mesh(plJawGeo, muscleMat);
    plJaw.position.set(0, -0.18, 0.1);
    plJaw.scale.set(1.2, 0.5, 0.8);
    this._head.add(plJaw);
    // Lower fangs
    for (const side of [-1, 1]) {
      const fgGeo = new THREE.ConeGeometry(0.015, 0.08, 6);
      const fg = new THREE.Mesh(fgGeo, hornMat);
      fg.position.set(side * 0.08, -0.2, 0.18);
      fg.rotation.x = Math.PI;
      this._head.add(fg);
    }
    // Brow ridge
    const plBrowGeo = new THREE.SphereGeometry(0.1, 8, 6);
    const plBrow = new THREE.Mesh(plBrowGeo, skinMat);
    plBrow.position.set(0, 0.1, 0.15);
    plBrow.scale.set(2.0, 0.4, 0.6);
    this._head.add(plBrow);
    // Ear points
    for (const side of [-1, 1]) {
      const earGeo = new THREE.ConeGeometry(0.03, 0.1, 6);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * 0.25, 0.05, -0.05);
      ear.rotation.z = side * 0.6;
      this._head.add(ear);
    }

    // --- Enhanced detail: cloven hoof detail ---
    for (const side of [-1, 1]) {
      const plLeg = side === -1 ? this._leftLeg : this._rightLeg;
      // Knee joint
      const plKnGeo = new THREE.SphereGeometry(0.12, 10, 8);
      const plKn = new THREE.Mesh(plKnGeo, darkMat);
      plKn.position.y = -0.9;
      plLeg.add(plKn);
      // Shin muscle
      const shMuscGeo = new THREE.SphereGeometry(0.08, 8, 6);
      const shMusc = new THREE.Mesh(shMuscGeo, muscleMat);
      shMusc.position.set(0, -1.0, 0.08);
      shMusc.scale.set(0.8, 1.2, 0.6);
      plLeg.add(shMusc);
      // Hoof split detail
      const splitGeo = new THREE.BoxGeometry(0.005, 0.03, 0.08);
      const split = new THREE.Mesh(splitGeo, mat(0x111111));
      split.position.set(0, -1.58, 0.04);
      plLeg.add(split);
      // Ankle bone protrusion
      for (const inner of [-1, 1]) {
        const ankGeo = new THREE.SphereGeometry(0.03, 6, 5);
        const ank = new THREE.Mesh(ankGeo, darkMat);
        ank.position.set(inner * 0.06, -1.45, 0);
        plLeg.add(ank);
      }
    }

    // --- Enhanced detail: hellfire aura effects ---
    for (let i = 0; i < 10; i++) {
      const embGeo = new THREE.SphereGeometry(0.02 + Math.random() * 0.015, 6, 6);
      const emb = new THREE.Mesh(embGeo, mat(0xff4400, { emissive: 0xcc2200, emissiveIntensity: 2.5, transparent: true, opacity: 0.5 }));
      emb.position.set((Math.random() - 0.5) * 1.2, 2.0 + Math.random() * 3.0, (Math.random() - 0.5) * 0.8);
      this._body.add(emb);
    }
    // Dark smoke wisps
    for (let i = 0; i < 6; i++) {
      const smkGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 6, 5);
      const smk = new THREE.Mesh(smkGeo, mat(0x220808, { transparent: true, opacity: 0.3 }));
      smk.position.set((Math.random() - 0.5) * 0.9, 3.5 + Math.random() * 1.5, (Math.random() - 0.5) * 0.6);
      smk.scale.set(1.5, 2.0, 1.5);
      this._body.add(smk);
    }
    // Ground scorching beneath feet
    const scorchGeo = new THREE.SphereGeometry(0.5, 8, 6);
    const scorch = new THREE.Mesh(scorchGeo, mat(0x1a0a05, { transparent: true, opacity: 0.4 }));
    scorch.position.set(0, 0.01, 0);
    scorch.scale.set(1, 0.02, 1);
    this._body.add(scorch);
  }

  // ---- Doom Guard builder"""
    },

    # _buildDoomGuard
    "_buildDoomGuard": {
        "marker": """      const hoofGeo = new THREE.SphereGeometry(0.1, 12, 10);
      const hoof = new THREE.Mesh(hoofGeo, spikeMat);
      hoof.scale.set(1, 0.5, 1.3);
      hoof.position.set(0, -1.4, 0.04);
      leg.add(hoof);
    }
  }

  // ---- Succubus builder""",
        "replacement_suffix": """
    // --- Enhanced detail: layered armor plates on torso ---
    // Chest plate layers
    for (let i = 0; i < 3; i++) {
      const cpGeo = new THREE.SphereGeometry(0.25 - i * 0.03, 10, 8);
      const cp = new THREE.Mesh(cpGeo, armorMat);
      cp.position.set(0, 2.7 + i * 0.2, 0.32 - i * 0.03);
      cp.scale.set(1.5, 0.4, 0.3);
      this._body.add(cp);
    }

    // Armor rivets along plate seams
    for (const yy of [2.5, 2.9, 3.3]) {
      for (let r = 0; r < 6; r++) {
        const rvGeo = new THREE.SphereGeometry(0.01, 6, 6);
        const rv = new THREE.Mesh(rvGeo, spikeMat);
        rv.position.set(-0.15 + r * 0.06, yy, 0.39);
        this._body.add(rv);
      }
    }

    // Back armor plating
    for (let i = 0; i < 4; i++) {
      const bpGeo = new THREE.BoxGeometry(0.35 - i * 0.04, 0.15, 0.02);
      const bp = new THREE.Mesh(bpGeo, armorMat);
      bp.position.set(0, 2.5 + i * 0.22, -0.38);
      this._body.add(bp);
    }

    // --- Enhanced detail: helm filigree and face guard ---
    // Helm crest ridge
    const helmCrestGeo = new THREE.BoxGeometry(0.02, 0.15, 0.2);
    const helmCrest = new THREE.Mesh(helmCrestGeo, spikeMat);
    helmCrest.position.set(0, 0.15, 0);
    this._head.add(helmCrest);

    // Cheek guards
    for (const side of [-1, 1]) {
      const cgGeo = new THREE.BoxGeometry(0.02, 0.12, 0.08);
      const cg = new THREE.Mesh(cgGeo, armorMat);
      cg.position.set(side * 0.2, -0.02, 0.08);
      this._head.add(cg);
    }

    // Helm engravings
    for (let i = 0; i < 4; i++) {
      const heGeo = new THREE.BoxGeometry(0.005, 0.04, 0.005);
      const he = new THREE.Mesh(heGeo, mat(0x553333, { emissive: 0x331111, emissiveIntensity: 0.5 }));
      const heA = (i / 4) * Math.PI;
      he.position.set(Math.cos(heA) * 0.2, 0.1, Math.sin(heA) * 0.2);
      he.rotation.y = -heA;
      this._head.add(he);
    }

    // Eye glow aura
    for (const side of [-1, 1]) {
      const egGeo = new THREE.SphereGeometry(0.06, 8, 6);
      const eg = new THREE.Mesh(egGeo, mat(0xff2200, { emissive: 0xcc0000, emissiveIntensity: 1.5, transparent: true, opacity: 0.3 }));
      eg.position.set(side * 0.1, 0, 0.18);
      this._head.add(eg);
    }

    // --- Enhanced detail: shoulder pauldron layering ---
    for (const side of [-1, 1]) {
      // Pauldron base plate
      const pdGeo = new THREE.SphereGeometry(0.12, 10, 8);
      const pd = new THREE.Mesh(pdGeo, armorMat);
      pd.position.set(side * 0.6, 3.2, 0);
      pd.scale.set(1, 0.6, 1.2);
      this._body.add(pd);

      // Pauldron trim ring
      const ptGeo = new THREE.TorusGeometry(0.12, 0.008, 6, 12);
      const ptRing = new THREE.Mesh(ptGeo, spikeMat);
      ptRing.position.set(side * 0.6, 3.2, 0);
      ptRing.rotation.x = Math.PI / 2;
      this._body.add(ptRing);

      // Additional spikes on back of pauldron
      const bsGeo = new THREE.ConeGeometry(0.03, 0.15, 6);
      const bs = new THREE.Mesh(bsGeo, spikeMat);
      bs.position.set(side * 0.6, 3.25, -0.1);
      bs.rotation.z = side * 0.3;
      this._body.add(bs);
    }

    // --- Enhanced detail: greatsword detail ---
    // Blade fuller (groove)
    const fullerGeo = new THREE.BoxGeometry(0.02, 0.9, 0.005);
    const fuller = new THREE.Mesh(fullerGeo, mat(0x555555, { metalness: 0.9 }));
    fuller.position.y = -2.2;
    this._rightArm.add(fuller);

    // Blade edge highlights
    for (const side of [-1, 1]) {
      const edgeGeo = new THREE.BoxGeometry(0.003, 1.15, 0.008);
      const edge = new THREE.Mesh(edgeGeo, mat(0x888888, { metalness: 0.95, roughness: 0.05 }));
      edge.position.set(side * 0.03, -2.2, 0);
      this._rightArm.add(edge);
    }

    // Sword pommel
    const pomGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const pom = new THREE.Mesh(pomGeo, spikeMat);
    pom.position.y = -1.5;
    this._rightArm.add(pom);

    // Pommel gem
    const pgGeo = new THREE.SphereGeometry(0.015, 6, 6);
    const pg = new THREE.Mesh(pgGeo, mat(0xff0000, { emissive: 0xcc0000, emissiveIntensity: 2.0 }));
    pg.position.y = -1.5;
    pg.position.z = 0.025;
    this._rightArm.add(pg);

    // Blade runes
    for (let i = 0; i < 5; i++) {
      const brGeo = new THREE.BoxGeometry(0.015, 0.015, 0.005);
      const br = new THREE.Mesh(brGeo, mat(0xff4400, { emissive: 0xcc2200, emissiveIntensity: 2.0 }));
      br.position.set(0, -1.8 - i * 0.15, 0.012);
      this._rightArm.add(br);
    }

    // --- Enhanced detail: arm gauntlets and vambraces ---
    for (const side of [-1, 1]) {
      const dgArm = side === -1 ? this._leftArm : this._rightArm;

      // Vambrace ridge
      const vrGeo = new THREE.BoxGeometry(0.04, 0.5, 0.02);
      const vr = new THREE.Mesh(vrGeo, armorMat);
      vr.position.set(0, -0.9, 0.1);
      dgArm.add(vr);

      // Gauntlet finger guards
      for (let f = 0; f < 3; f++) {
        const fgGeo = cyl(0.02, 0.015, 0.08, 6);
        const fgMesh = new THREE.Mesh(fgGeo, armorMat);
        fgMesh.position.set(-0.04 + f * 0.04, -1.65, 0.08);
        fgMesh.rotation.x = 0.3;
        dgArm.add(fgMesh);
      }

      // Claw tips
      for (let c = 0; c < 3; c++) {
        const ctGeo = new THREE.ConeGeometry(0.008, 0.04, 5);
        const ct = new THREE.Mesh(ctGeo, spikeMat);
        ct.position.set(-0.04 + c * 0.04, -1.72, 0.1);
        ct.rotation.x = 0.4;
        dgArm.add(ct);
      }
    }

    // --- Enhanced detail: leg armor greaves ---
    for (const side of [-1, 1]) {
      const dgLeg = side === -1 ? this._leftLeg : this._rightLeg;

      // Knee guard spike
      const kgGeo = new THREE.ConeGeometry(0.025, 0.08, 6);
      const kgMesh = new THREE.Mesh(kgGeo, spikeMat);
      kgMesh.position.set(0, -0.7, 0.12);
      dgLeg.add(kgMesh);

      // Greave plate
      const grGeo = new THREE.BoxGeometry(0.06, 0.4, 0.025);
      const gr = new THREE.Mesh(grGeo, armorMat);
      gr.position.set(0, -1.0, 0.1);
      dgLeg.add(gr);

      // Hoof trimming
      const htGeo = new THREE.TorusGeometry(0.08, 0.008, 6, 10);
      const ht = new THREE.Mesh(htGeo, spikeMat);
      ht.position.set(0, -1.35, 0.04);
      ht.rotation.x = Math.PI / 2;
      dgLeg.add(ht);
    }

    // --- Enhanced detail: dark aura and embers ---
    for (let i = 0; i < 12; i++) {
      const daGeo = new THREE.SphereGeometry(0.01 + Math.random() * 0.008, 5, 5);
      const da = new THREE.Mesh(daGeo, mat(0xff3300, { emissive: 0xcc1100, emissiveIntensity: 2.5, transparent: true, opacity: 0.5 }));
      da.position.set((Math.random() - 0.5) * 1.0, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 0.7);
      this._body.add(da);
    }

    // Shadow pool beneath
    const shpGeo = new THREE.SphereGeometry(0.4, 8, 6);
    const shp = new THREE.Mesh(shpGeo, mat(0x110505, { transparent: true, opacity: 0.35 }));
    shp.position.set(0, 0.02, 0);
    shp.scale.set(1.2, 0.02, 1.2);
    this._body.add(shp);

    // Dark energy tendrils rising from body
    for (let i = 0; i < 4; i++) {
      const dtGeo = cyl(0.008, 0.003, 0.3 + Math.random() * 0.2, 4);
      const dt = new THREE.Mesh(dtGeo, mat(0x330808, { transparent: true, opacity: 0.4 }));
      const dtA = (i / 4) * Math.PI * 2;
      dt.position.set(Math.cos(dtA) * 0.4, 3.5 + Math.random() * 0.5, Math.sin(dtA) * 0.3);
      this._body.add(dt);
    }
  }

  // ---- Succubus builder"""
    },

    # _buildSuccubus
    "_buildSuccubus": {
        "marker": """      // Clawed feet
      for (let t = -1; t <= 1; t++) {
        const clGeo = new THREE.ConeGeometry(0.008, 0.04, 6);
        const claw = new THREE.Mesh(clGeo, hornMat);
        claw.position.set(t * 0.02, -0.95, 0.03);
        claw.rotation.x = 0.3;
        leg.add(claw);
      }
    }
  }

  // ---- Imp Overlord builder""",
        "replacement_suffix": """
    // --- Enhanced detail: body contour and musculature ---
    // Shoulder definition
    for (const side of [-1, 1]) {
      const shGeo = new THREE.SphereGeometry(0.06, 8, 6);
      const sh = new THREE.Mesh(shGeo, skinMat);
      sh.position.set(side * 0.18, 2.3, 0.02);
      sh.scale.set(1.2, 0.6, 0.8);
      this._body.add(sh);
    }

    // Collar bone definition
    for (const side of [-1, 1]) {
      const cbGeo = cyl(0.01, 0.008, 0.15, 6);
      const cb = new THREE.Mesh(cbGeo, skinMat);
      cb.position.set(side * 0.08, 2.45, 0.12);
      cb.rotation.z = side * 0.4;
      this._body.add(cb);
    }

    // Ribcage subtle definition
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        const rbGeo = new THREE.SphereGeometry(0.04, 6, 5);
        const rb = new THREE.Mesh(rbGeo, skinMat);
        rb.position.set(side * 0.12, 1.8 + i * 0.12, 0.1);
        rb.scale.set(1.5, 0.3, 0.5);
        this._body.add(rb);
      }
    }

    // Navel detail
    const nvGeo = new THREE.SphereGeometry(0.01, 6, 6);
    const nv = new THREE.Mesh(nvGeo, mat(0x6633888));
    nv.position.set(0, 1.5, 0.15);
    this._body.add(nv);

    // --- Enhanced detail: hair flowing strands ---
    for (let i = 0; i < 8; i++) {
      const hsGeo = cyl(0.008, 0.004, 0.25 + Math.random() * 0.15, 4);
      const hs = new THREE.Mesh(hsGeo, hairMat);
      const hsA = (i / 8) * Math.PI + Math.PI * 0.5;
      hs.position.set(Math.cos(hsA) * 0.1, -0.08, Math.sin(hsA) * 0.1 - 0.05);
      hs.rotation.x = 0.3 + Math.random() * 0.2;
      hs.rotation.z = (Math.random() - 0.5) * 0.3;
      this._head.add(hs);
    }

    // Hair volume on top
    const hvGeo = new THREE.SphereGeometry(0.14, 10, 8);
    const hv = new THREE.Mesh(hvGeo, hairMat);
    hv.position.set(0, 0.06, -0.04);
    hv.scale.set(1, 0.7, 1);
    this._head.add(hv);

    // --- Enhanced detail: facial features ---
    // Cheekbones
    for (const side of [-1, 1]) {
      const ckGeo = new THREE.SphereGeometry(0.03, 6, 5);
      const ck = new THREE.Mesh(ckGeo, skinMat);
      ck.position.set(side * 0.09, -0.01, 0.1);
      ck.scale.set(0.8, 0.5, 0.6);
      this._head.add(ck);
    }

    // Lips
    const lipGeo = new THREE.SphereGeometry(0.025, 8, 6);
    const lip = new THREE.Mesh(lipGeo, mat(0xaa3388, { roughness: 0.3, clearcoat: 0.5 }));
    lip.position.set(0, -0.05, 0.13);
    lip.scale.set(1.5, 0.5, 0.6);
    this._head.add(lip);

    // Nose bridge
    const nsGeo = new THREE.SphereGeometry(0.015, 6, 5);
    const ns = new THREE.Mesh(nsGeo, skinMat);
    ns.position.set(0, 0.01, 0.14);
    ns.scale.set(0.6, 1.2, 0.8);
    this._head.add(ns);

    // Eyelash detail
    for (const side of [-1, 1]) {
      const elGeo = cyl(0.003, 0.001, 0.02, 3);
      const el = new THREE.Mesh(elGeo, mat(0x110011));
      el.position.set(side * 0.06, 0.04, 0.14);
      el.rotation.x = -0.5;
      el.rotation.z = side * 0.3;
      this._head.add(el);
    }

    // Eye glow aura
    for (const side of [-1, 1]) {
      const eaGeo = new THREE.SphereGeometry(0.04, 6, 6);
      const ea = new THREE.Mesh(eaGeo, mat(0xff44ff, { emissive: 0xcc22cc, emissiveIntensity: 1.5, transparent: true, opacity: 0.25 }));
      ea.position.set(side * 0.06, 0.02, 0.12);
      this._head.add(ea);
    }

    // --- Enhanced detail: horn ridges and detail ---
    for (const side of [-1, 1]) {
      for (let r = 0; r < 3; r++) {
        const hrGeo = new THREE.TorusGeometry(0.015 - r * 0.003, 0.003, 5, 8);
        const hr = new THREE.Mesh(hrGeo, mat(0x333333));
        hr.position.set(side * (0.1 + r * side * 0.01), 0.1 + r * 0.03, 0);
        hr.rotation.x = Math.PI / 2;
        hr.rotation.z = side * -0.3;
        this._head.add(hr);
      }
    }

    // --- Enhanced detail: wing membrane texture ---
    for (const side of [-1, 1]) {
      const scArm = side === -1 ? this._leftArm : this._rightArm;

      // Secondary wing bones
      for (let b = 0; b < 2; b++) {
        const wbGeo = cyl(0.012, 0.006, 0.35, 5);
        const wb = new THREE.Mesh(wbGeo, skinMat);
        wb.position.set(side * (0.1 + b * 0.15), -0.2 - b * 0.1, 0.005);
        wb.rotation.z = side * (0.3 + b * 0.15);
        scArm.add(wb);
      }

      // Wing claw
      const wcGeo = new THREE.ConeGeometry(0.008, 0.04, 5);
      const wc = new THREE.Mesh(wcGeo, hornMat);
      wc.position.set(side * 0.05, 0.1, 0);
      wc.rotation.z = side * 0.5;
      scArm.add(wc);

      // Membrane texture dots
      for (let d = 0; d < 4; d++) {
        const mdGeo = new THREE.SphereGeometry(0.005, 4, 4);
        const md = new THREE.Mesh(mdGeo, mat(0x442255, { transparent: true, opacity: 0.5 }));
        md.position.set(side * (0.15 + d * 0.08), -0.25 - d * 0.04, 0.01);
        scArm.add(md);
      }
    }

    // --- Enhanced detail: tail segments ---
    for (let i = 0; i < 6; i++) {
      const tsGeo = new THREE.TorusGeometry(0.025 - i * 0.003, 0.005, 5, 8);
      const ts = new THREE.Mesh(tsGeo, skinMat);
      const tT = i / 6;
      ts.position.set(0, 1.2 - tT * 0.3, -0.2 - tT * 0.35);
      ts.rotation.x = 0.6;
      this._body.add(ts);
    }

    // Tail heart-shaped tip detail
    for (const side of [-1, 1]) {
      const thGeo = new THREE.SphereGeometry(0.02, 6, 5);
      const th = new THREE.Mesh(thGeo, hornMat);
      th.position.set(side * 0.02, 0.78, -0.63);
      this._body.add(th);
    }

    // --- Enhanced detail: leg detail ---
    for (const side of [-1, 1]) {
      const scLeg = side === -1 ? this._leftLeg : this._rightLeg;

      // Knee
      const knGeo = new THREE.SphereGeometry(0.04, 8, 6);
      const kn = new THREE.Mesh(knGeo, skinMat);
      kn.position.y = -0.55;
      scLeg.add(kn);

      // Calf muscle
      const cfGeo = new THREE.SphereGeometry(0.04, 8, 6);
      const cf = new THREE.Mesh(cfGeo, skinMat);
      cf.position.set(0, -0.6, -0.03);
      cf.scale.set(0.8, 1.4, 0.7);
      scLeg.add(cf);

      // Ankle
      const akGeo = new THREE.SphereGeometry(0.025, 6, 5);
      const ak = new THREE.Mesh(akGeo, skinMat);
      ak.position.y = -0.88;
      scLeg.add(ak);
    }

    // --- Enhanced detail: charm aura and magic effects ---
    // Floating heart-shaped particles
    for (let i = 0; i < 8; i++) {
      const fpGeo = new THREE.SphereGeometry(0.008 + Math.random() * 0.005, 5, 5);
      const fp = new THREE.Mesh(fpGeo, mat(0xff66cc, { emissive: 0xcc44aa, emissiveIntensity: 2.0, transparent: true, opacity: 0.5 }));
      fp.position.set((Math.random() - 0.5) * 0.6, 1.0 + Math.random() * 2.0, (Math.random() - 0.5) * 0.4);
      this._body.add(fp);
    }

    // Magical aura wisps spiraling
    for (let i = 0; i < 6; i++) {
      const awGeo = cyl(0.004, 0.002, 0.08, 4);
      const aw = new THREE.Mesh(awGeo, mat(0xdd66ff, { emissive: 0xaa44cc, transparent: true, opacity: 0.4 }));
      const awA = (i / 6) * Math.PI * 2;
      aw.position.set(Math.cos(awA) * 0.3, 1.5 + i * 0.2, Math.sin(awA) * 0.25);
      this._body.add(aw);
    }

    // Enchantment runes orbiting
    for (let i = 0; i < 4; i++) {
      const erGeo = new THREE.BoxGeometry(0.015, 0.015, 0.003);
      const er = new THREE.Mesh(erGeo, mat(0xff88ff, { emissive: 0xcc66dd, emissiveIntensity: 2.0 }));
      const erA = (i / 4) * Math.PI * 2;
      er.position.set(Math.cos(erA) * 0.35, 2.0 + Math.sin(erA * 2) * 0.3, Math.sin(erA) * 0.3);
      this._body.add(er);
    }

    // Shadow beneath
    const shGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const shMesh = new THREE.Mesh(shGeo, mat(0x220022, { transparent: true, opacity: 0.25 }));
    shMesh.position.set(0, 0.01, 0);
    shMesh.scale.set(1, 0.02, 1);
    this._body.add(shMesh);
  }

  // ---- Imp Overlord builder"""
    },

    # _buildArchon
    "_buildArchon": {
        "marker": """      const footGeo = new THREE.SphereGeometry(0.1, 6, 5);
      const foot = new THREE.Mesh(footGeo, armorMat);
      foot.scale.set(1, 0.5, 1.3);
      foot.position.set(0, -1.3, 0.03);
      leg.add(foot);
    }
  }

  // ---- Alpha Wolf builder""",
        "replacement_suffix": """
    // --- Enhanced detail: ornate armor engravings ---
    // Chest centerpiece medallion
    const medGeo = new THREE.SphereGeometry(0.06, 12, 10);
    const med = new THREE.Mesh(medGeo, mat(0xffdd44, { emissive: 0xccaa22, emissiveIntensity: 1.5, metalness: 0.8 }));
    med.position.set(0, 2.6, 0.28);
    med.scale.set(1, 1, 0.3);
    this._body.add(med);

    // Medallion gem
    const mgGeo = new THREE.OctahedronGeometry(0.025, 0);
    const mg = new THREE.Mesh(mgGeo, mat(0x4488ff, { emissive: 0x2266dd, emissiveIntensity: 2.5 }));
    mg.position.set(0, 2.6, 0.3);
    this._body.add(mg);

    // Armor filigree scrollwork
    for (let i = 0; i < 6; i++) {
      const flGeo = cyl(0.004, 0.003, 0.08, 4);
      const fl = new THREE.Mesh(flGeo, mat(0xcccc88, { metalness: 0.7 }));
      const flA = (i / 6) * Math.PI;
      fl.position.set(Math.cos(flA) * 0.08, 2.6 + Math.sin(flA) * 0.08, 0.29);
      fl.rotation.z = flA;
      this._body.add(fl);
    }

    // Side armor plate details
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const spGeo = new THREE.BoxGeometry(0.005, 0.12, 0.02);
        const sp = new THREE.Mesh(spGeo, mat(0xcccc88, { metalness: 0.6 }));
        sp.position.set(side * 0.32, 2.3 + i * 0.2, 0.15);
        this._body.add(sp);
      }
    }

    // --- Enhanced detail: shoulder pauldron ornaments ---
    for (const side of [-1, 1]) {
      // Pauldron wing motif
      const pwGeo = new THREE.ConeGeometry(0.04, 0.12, 6);
      const pw = new THREE.Mesh(pwGeo, armorMat);
      pw.position.set(side * 0.5, 3.0, 0);
      pw.rotation.z = side * 0.5;
      this._body.add(pw);

      // Pauldron gem
      const pgGeo = new THREE.SphereGeometry(0.02, 8, 6);
      const pgMesh = new THREE.Mesh(pgGeo, mat(0xffdd44, { emissive: 0xccaa22, emissiveIntensity: 2.0 }));
      pgMesh.position.set(side * 0.45, 2.95, 0.12);
      this._body.add(pgMesh);

      // Pauldron rivets
      for (let r = 0; r < 4; r++) {
        const prGeo = new THREE.SphereGeometry(0.008, 5, 5);
        const pr = new THREE.Mesh(prGeo, mat(0xbbbb88, { metalness: 0.8 }));
        const prA = (r / 4) * Math.PI;
        pr.position.set(side * 0.45 + Math.cos(prA) * 0.1, 2.9 + Math.sin(prA) * 0.1, 0);
        this._body.add(pr);
      }
    }

    // --- Enhanced detail: helm ornament and visor ---
    // Helm visor slit
    const vsGeo = new THREE.BoxGeometry(0.18, 0.015, 0.01);
    const vs = new THREE.Mesh(vsGeo, mat(0x111111));
    vs.position.set(0, 0.02, 0.2);
    this._head.add(vs);

    // Helm crest plume
    const plGeo = new THREE.ConeGeometry(0.02, 0.15, 8);
    const pl = new THREE.Mesh(plGeo, mat(0xddddaa, { metalness: 0.5 }));
    pl.position.set(0, 0.2, -0.05);
    this._head.add(pl);

    // Helm side wings
    for (const side of [-1, 1]) {
      const hwGeo = new THREE.BoxGeometry(0.005, 0.06, 0.08);
      const hw = new THREE.Mesh(hwGeo, armorMat);
      hw.position.set(side * 0.2, 0.05, -0.05);
      hw.rotation.z = side * 0.3;
      this._head.add(hw);
    }

    // Halo rune inscriptions
    for (let i = 0; i < 8; i++) {
      const hiGeo = new THREE.BoxGeometry(0.012, 0.018, 0.003);
      const hi = new THREE.Mesh(hiGeo, mat(0xffdd44, { emissive: 0xccaa22, emissiveIntensity: 2.0 }));
      const hiA = (i / 8) * Math.PI * 2;
      hi.position.set(Math.cos(hiA) * 0.24, 0.32, Math.sin(hiA) * 0.24);
      hi.rotation.y = -hiA;
      this._head.add(hi);
    }

    // Halo light rays
    for (let i = 0; i < 6; i++) {
      const hrGeo = new THREE.BoxGeometry(0.003, 0.06, 0.003);
      const hr = new THREE.Mesh(hrGeo, mat(0xffee88, { emissive: 0xddcc44, transparent: true, opacity: 0.4 }));
      const hrA = (i / 6) * Math.PI * 2;
      hr.position.set(Math.cos(hrA) * 0.28, 0.32, Math.sin(hrA) * 0.28);
      this._head.add(hr);
    }

    // --- Enhanced detail: sword engravings and glow ---
    // Sword blade fuller
    const sfGeo = new THREE.BoxGeometry(0.015, 0.7, 0.004);
    const sf = new THREE.Mesh(sfGeo, mat(0xddddcc, { metalness: 0.95, roughness: 0.05 }));
    sf.position.set(0.3, -0.6, 0.2);
    this._rightArm.add(sf);

    // Sword rune glyphs
    for (let i = 0; i < 4; i++) {
      const srGeo = new THREE.BoxGeometry(0.01, 0.01, 0.003);
      const sr = new THREE.Mesh(srGeo, mat(0xffffaa, { emissive: 0xffff66, emissiveIntensity: 2.0 }));
      sr.position.set(0.3, -0.3 - i * 0.15, 0.21);
      this._rightArm.add(sr);
    }

    // Sword crossguard
    const scgGeo = new THREE.BoxGeometry(0.15, 0.02, 0.02);
    const scg = new THREE.Mesh(scgGeo, swordMat);
    scg.position.set(0.3, -0.15, 0.2);
    this._rightArm.add(scg);

    // Sword pommel
    const spGeo = new THREE.SphereGeometry(0.02, 8, 6);
    const spMesh = new THREE.Mesh(spGeo, swordMat);
    spMesh.position.set(0.3, -0.08, 0.2);
    this._rightArm.add(spMesh);

    // --- Enhanced detail: wing feather layering ---
    for (const side of [-1, 1]) {
      const arArm = side === -1 ? this._leftArm : this._rightArm;

      // Downy under-feathers
      for (let f = 0; f < 5; f++) {
        const dfGeo = new THREE.BoxGeometry(0.015, 0.06 + f * 0.01, 0.003);
        const df = new THREE.Mesh(dfGeo, mat(0xeeeeee, { side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
        df.position.set(side * (0.3 + f * 0.12), -0.15 - f * 0.03, -0.08);
        df.rotation.z = side * (0.15 + f * 0.05);
        arArm.add(df);
      }

      // Wing bone joint knobs
      const jkGeo = new THREE.SphereGeometry(0.025, 6, 6);
      const jk = new THREE.Mesh(jkGeo, mat(0xddccaa));
      jk.position.set(side * 0.2, -0.1, -0.05);
      arArm.add(jk);
    }

    // --- Enhanced detail: leg armor detail ---
    for (const side of [-1, 1]) {
      const arLeg = side === -1 ? this._leftLeg : this._rightLeg;

      // Knee guard
      const kgGeo = new THREE.SphereGeometry(0.06, 8, 6);
      const kgMesh = new THREE.Mesh(kgGeo, armorMat);
      kgMesh.position.set(0, -0.65, 0.08);
      kgMesh.scale.set(0.8, 0.5, 0.5);
      arLeg.add(kgMesh);

      // Greave trim
      const gtGeo = new THREE.TorusGeometry(0.08, 0.005, 6, 10);
      const gt = new THREE.Mesh(gtGeo, mat(0xcccc88, { metalness: 0.6 }));
      gt.position.y = -0.75;
      gt.rotation.x = Math.PI / 2;
      arLeg.add(gt);

      // Boot buckles
      for (let b = 0; b < 2; b++) {
        const bbGeo = new THREE.BoxGeometry(0.02, 0.01, 0.015);
        const bb = new THREE.Mesh(bbGeo, mat(0xccaa55, { metalness: 0.7 }));
        bb.position.set(0, -1.0 - b * 0.12, 0.08);
        arLeg.add(bb);
      }
    }

    // --- Enhanced detail: divine light particles ---
    for (let i = 0; i < 10; i++) {
      const lpGeo = new THREE.SphereGeometry(0.01 + Math.random() * 0.008, 5, 5);
      const lp = new THREE.Mesh(lpGeo, mat(0xffffcc, { emissive: 0xffee88, emissiveIntensity: 2.5, transparent: true, opacity: 0.5 }));
      lp.position.set((Math.random() - 0.5) * 1.0, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 0.8);
      this._body.add(lp);
    }

    // Holy sigil on back
    const hsGeo = new THREE.TorusGeometry(0.15, 0.006, 6, 12);
    const hsMesh = new THREE.Mesh(hsGeo, mat(0xffdd44, { emissive: 0xccaa22, emissiveIntensity: 1.5 }));
    hsMesh.position.set(0, 2.5, -0.28);
    this._body.add(hsMesh);
    for (let i = 0; i < 4; i++) {
      const hslGeo = new THREE.BoxGeometry(0.004, 0.2, 0.004);
      const hsl = new THREE.Mesh(hslGeo, mat(0xffdd44, { emissive: 0xccaa22, emissiveIntensity: 1.5 }));
      hsl.position.set(0, 2.5, -0.28);
      hsl.rotation.z = (i / 4) * Math.PI;
      this._body.add(hsl);
    }
  }

  // ---- Alpha Wolf builder"""
    },

    # _buildVolcanicBehemoth
    "_buildVolcanicBehemoth": {
        "marker": """      const footGeo = new THREE.SphereGeometry(0.32, 6, 5);
      const foot = new THREE.Mesh(footGeo, rockMat);
      foot.scale.set(1, 0.4, 1.2);
      foot.position.set(0, -1.9, 0.05);
      leg.add(foot);
    }
  }

  // ---- Frost Wyrm builder""",
        "replacement_suffix": """
    // --- Enhanced detail: volcanic rock surface texture ---
    // Obsidian shards protruding from body
    for (let i = 0; i < 10; i++) {
      const shardGeo = new THREE.ConeGeometry(0.06 + Math.random() * 0.04, 0.2 + Math.random() * 0.15, 5);
      const shard = new THREE.Mesh(shardGeo, darkMat);
      const shA = Math.random() * Math.PI * 2;
      const shR = 0.6 + Math.random() * 0.2;
      shard.position.set(Math.cos(shA) * shR, 3.0 + Math.random() * 1.5, Math.sin(shA) * shR * 0.8);
      shard.rotation.set((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8);
      this._body.add(shard);
    }

    // Cracked rock pattern on body
    for (let i = 0; i < 12; i++) {
      const crGeo = new THREE.BoxGeometry(0.015, 0.3 + Math.random() * 0.25, 0.008);
      const cr = new THREE.Mesh(crGeo, lavaMat);
      const crA = Math.random() * Math.PI * 2;
      cr.position.set(Math.cos(crA) * 0.7, 3.0 + Math.random() * 1.5, Math.sin(crA) * 0.58);
      cr.rotation.set(0, -crA, (Math.random() - 0.5) * 0.6);
      this._body.add(cr);
    }

    // Cooled lava striations
    for (let i = 0; i < 8; i++) {
      const stGeo = new THREE.BoxGeometry(0.25, 0.01, 0.012);
      const st = new THREE.Mesh(stGeo, mat(0x221108, { roughness: 0.95 }));
      const stA = (i / 8) * Math.PI * 2;
      st.position.set(Math.cos(stA) * 0.68, 3.2 + i * 0.15, Math.sin(stA) * 0.55);
      st.rotation.y = -stA;
      this._body.add(st);
    }

    // --- Enhanced detail: additional lava vents and magma pools ---
    // Magma seeping from cracks
    for (let i = 0; i < 6; i++) {
      const mgGeo = new THREE.SphereGeometry(0.05 + Math.random() * 0.03, 8, 6);
      const mgMesh = new THREE.Mesh(mgGeo, mat(0xff6600, { emissive: 0xdd4400, emissiveIntensity: 2.0 }));
      const mgA = Math.random() * Math.PI * 2;
      mgMesh.position.set(Math.cos(mgA) * 0.72, 3.0 + Math.random() * 1.8, Math.sin(mgA) * 0.6);
      mgMesh.scale.set(1, 0.5, 1);
      this._body.add(mgMesh);
    }

    // Lava drip trails running down body
    for (let i = 0; i < 5; i++) {
      const dripGeo = cyl(0.012, 0.008, 0.35, 6);
      const drip = new THREE.Mesh(dripGeo, mat(0xff5500, { emissive: 0xcc3300, emissiveIntensity: 1.8 }));
      const dA = (i / 5) * Math.PI * 2;
      drip.position.set(Math.cos(dA) * 0.68, 3.5 + Math.random() * 0.5, Math.sin(dA) * 0.55);
      this._body.add(drip);
    }

    // --- Enhanced detail: ember and smoke particle effects ---
    // Large ember clusters
    for (let i = 0; i < 12; i++) {
      const embGeo = new THREE.SphereGeometry(0.025 + Math.random() * 0.02, 6, 6);
      const emb = new THREE.Mesh(embGeo, mat(0xffaa22, { emissive: 0xff6600, emissiveIntensity: 2.5, transparent: true, opacity: 0.7 }));
      emb.position.set((Math.random() - 0.5) * 1.5, 4.0 + Math.random() * 2.0, (Math.random() - 0.5) * 1.2);
      this._body.add(emb);
    }

    // Smoke columns rising
    for (let i = 0; i < 6; i++) {
      const smGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 6, 5);
      const sm = new THREE.Mesh(smGeo, mat(0x221108, { transparent: true, opacity: 0.2 }));
      sm.position.set((Math.random() - 0.5) * 1.0, 5.0 + Math.random() * 1.5, (Math.random() - 0.5) * 0.8);
      sm.scale.set(1.5, 2.5, 1.5);
      this._body.add(sm);
    }

    // Ash particles
    for (let i = 0; i < 8; i++) {
      const ashGeo = new THREE.BoxGeometry(0.01, 0.01, 0.002);
      const ash = new THREE.Mesh(ashGeo, mat(0x444444, { transparent: true, opacity: 0.5 }));
      ash.position.set((Math.random() - 0.5) * 1.5, 4.5 + Math.random() * 2.5, (Math.random() - 0.5) * 1.2);
      ash.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this._body.add(ash);
    }

    // --- Enhanced detail: head crag features ---
    // Jaw rock plates
    const vbJawGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const vbJaw = new THREE.Mesh(vbJawGeo, darkMat);
    vbJaw.position.set(0, -0.15, 0.12);
    vbJaw.scale.set(1, 0.4, 0.8);
    this._head.add(vbJaw);

    // Mouth lava glow
    const mouthGlowGeo = new THREE.SphereGeometry(0.08, 8, 6);
    const mouthGlow = new THREE.Mesh(mouthGlowGeo, mat(0xff4400, { emissive: 0xdd2200, emissiveIntensity: 3.0, transparent: true, opacity: 0.7 }));
    mouthGlow.position.set(0, -0.12, 0.2);
    this._head.add(mouthGlow);

    // Additional horn crags
    for (let i = 0; i < 3; i++) {
      const chGeo = new THREE.ConeGeometry(0.04, 0.15, 4);
      const ch = new THREE.Mesh(chGeo, darkMat);
      ch.position.set((i - 1) * 0.12, 0.18, -0.15);
      ch.rotation.x = -0.4;
      this._head.add(ch);
    }

    // Brow ridge rock plates
    for (const side of [-1, 1]) {
      const brGeo = new THREE.SphereGeometry(0.08, 6, 5);
      const br = new THREE.Mesh(brGeo, darkMat);
      br.position.set(side * 0.15, 0.1, 0.12);
      br.scale.set(1.2, 0.5, 0.8);
      this._head.add(br);
    }

    // Eye glow aura
    for (const side of [-1, 1]) {
      const egGeo = new THREE.SphereGeometry(0.07, 8, 6);
      const eg = new THREE.Mesh(egGeo, mat(0xff6600, { emissive: 0xcc4400, emissiveIntensity: 1.5, transparent: true, opacity: 0.3 }));
      eg.position.set(side * 0.13, 0.02, 0.22);
      this._head.add(eg);
    }

    // --- Enhanced detail: arm rock plating and lava veins ---
    for (const side of [-1, 1]) {
      const vbArm = side === -1 ? this._leftArm : this._rightArm;

      // Rock plate armor on upper arm
      for (let i = 0; i < 3; i++) {
        const rpGeo = new THREE.SphereGeometry(0.08, 6, 5);
        const rp = new THREE.Mesh(rpGeo, darkMat);
        rp.position.set(side * 0.15, -0.3 - i * 0.3, 0);
        rp.scale.set(1, 0.5, 1.2);
        vbArm.add(rp);
      }

      // Lava veins on arms
      for (let i = 0; i < 3; i++) {
        const lvGeo = cyl(0.01, 0.006, 0.3, 4);
        const lv = new THREE.Mesh(lvGeo, mat(0xff5500, { emissive: 0xcc3300, emissiveIntensity: 2.0 }));
        lv.position.set(side * 0.08, -0.5 - i * 0.4, 0.12);
        lv.rotation.z = (Math.random() - 0.5) * 0.3;
        vbArm.add(lv);
      }

      // Fist knuckle crags
      for (let k = 0; k < 3; k++) {
        const fkGeo = new THREE.ConeGeometry(0.04, 0.08, 4);
        const fk = new THREE.Mesh(fkGeo, darkMat);
        fk.position.set(-0.08 + k * 0.08, -2.0, 0.15);
        vbArm.add(fk);
      }

      // Elbow lava joint
      const ejGeo = new THREE.SphereGeometry(0.12, 8, 6);
      const ej = new THREE.Mesh(ejGeo, mat(0xff4400, { emissive: 0xdd2200, emissiveIntensity: 1.5 }));
      ej.position.y = -1.1;
      vbArm.add(ej);
    }

    // --- Enhanced detail: leg rock and lava detail ---
    for (const side of [-1, 1]) {
      const vbLeg = side === -1 ? this._leftLeg : this._rightLeg;

      // Knee lava joint
      const klGeo = new THREE.SphereGeometry(0.15, 8, 6);
      const kl = new THREE.Mesh(klGeo, mat(0xff5500, { emissive: 0xcc3300, emissiveIntensity: 1.5 }));
      kl.position.y = -0.9;
      vbLeg.add(kl);

      // Shin rock plates
      for (let i = 0; i < 2; i++) {
        const srpGeo = new THREE.SphereGeometry(0.1, 6, 5);
        const srp = new THREE.Mesh(srpGeo, darkMat);
        srp.position.set(0, -1.1 - i * 0.3, 0.15);
        srp.scale.set(0.8, 0.5, 0.6);
        vbLeg.add(srp);
      }

      // Foot toe crags
      for (let t = -1; t <= 1; t++) {
        const tgGeo = new THREE.ConeGeometry(0.06, 0.1, 4);
        const tg = new THREE.Mesh(tgGeo, darkMat);
        tg.position.set(t * 0.1, -1.95, 0.15);
        tg.rotation.x = 0.4;
        vbLeg.add(tg);
      }

      // Ankle lava seep
      const alGeo = new THREE.SphereGeometry(0.06, 6, 5);
      const al = new THREE.Mesh(alGeo, mat(0xff4400, { emissive: 0xdd2200, emissiveIntensity: 2.0 }));
      al.position.y = -1.7;
      vbLeg.add(al);
    }

    // --- Enhanced detail: ground scorching effect ---
    const gsGeo = new THREE.SphereGeometry(0.8, 10, 8);
    const gs = new THREE.Mesh(gsGeo, mat(0x1a0a05, { transparent: true, opacity: 0.3 }));
    gs.position.set(0, 0.02, 0);
    gs.scale.set(1.2, 0.02, 1.2);
    this._body.add(gs);

    // Lava pool beneath feet
    const lpGeo = new THREE.SphereGeometry(0.5, 8, 6);
    const lp = new THREE.Mesh(lpGeo, mat(0xff3300, { emissive: 0xcc2200, emissiveIntensity: 1.5, transparent: true, opacity: 0.3 }));
    lp.position.set(0, 0.03, 0);
    lp.scale.set(1, 0.015, 1);
    this._body.add(lp);

    // Heat distortion wisps
    for (let i = 0; i < 5; i++) {
      const hdGeo = cyl(0.015, 0.008, 0.4, 4);
      const hd = new THREE.Mesh(hdGeo, mat(0xff8844, { transparent: true, opacity: 0.15 }));
      const hdA = (i / 5) * Math.PI * 2;
      hd.position.set(Math.cos(hdA) * 0.5, 5.5 + Math.random() * 0.5, Math.sin(hdA) * 0.4);
      this._body.add(hd);
    }
  }

  // ---- Frost Wyrm builder"""
    },
}

with open(FILE, "r") as f:
    content = f.read()

for method_name, data in INSERTIONS.items():
    marker = data["marker"]
    replacement = data["replacement_suffix"]
    if marker not in content:
        print(f"WARNING: Marker not found for {method_name}")
        continue
    count = content.count(marker)
    if count != 1:
        print(f"WARNING: Marker for {method_name} found {count} times (expected 1)")
        continue
    content = content.replace(marker, replacement)
    print(f"OK: Inserted detail for {method_name}")

with open(FILE, "w") as f:
    f.write(content)

print("Done!")
